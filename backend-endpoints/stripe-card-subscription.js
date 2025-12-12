/**
 * Endpoint para criar assinatura Stripe com cartao digitado
 *
 * ADICIONE ESTE ENDPOINT AO SEU BACKEND NO RAILWAY
 *
 * Rota: POST /api/stripe/create-subscription
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * POST /api/stripe/create-subscription
 *
 * Cria uma assinatura recorrente com dados do cartao
 *
 * Body:
 * {
 *   customerEmail: string,
 *   customerName: string,
 *   customerId: string,        // ID do usuario no Supabase
 *   cardNumber: string,        // Numero do cartao (apenas digitos)
 *   cardExpMonth: number,      // Mes de expiracao (1-12)
 *   cardExpYear: number,       // Ano de expiracao (4 digitos)
 *   cardCvc: string,           // CVV
 *   amount: number,            // Valor em reais (ex: 79.90)
 *   planName: string,          // Nome do plano
 *   planId: string,            // ID do plano
 *   couponId?: string,         // ID do cupom aplicado
 *   discountPercentage?: number // Percentual de desconto
 * }
 */
async function handleCreateSubscription(req, res) {
  try {
    const {
      customerEmail,
      customerName,
      customerId,
      cardNumber,
      cardExpMonth,
      cardExpYear,
      cardCvc,
      amount,
      planName,
      planId,
      couponId,
      discountPercentage
    } = req.body;

    // Validacoes
    if (!customerEmail) {
      return res.status(400).json({
        success: false,
        error: 'customerEmail is required'
      });
    }

    if (!cardNumber || !cardExpMonth || !cardExpYear || !cardCvc) {
      return res.status(400).json({
        success: false,
        error: 'Card details are required'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'amount must be greater than 0'
      });
    }

    // Converter valor para centavos (Stripe usa centavos)
    const amountInCents = Math.round(amount * 100);

    // 1. Buscar ou criar cliente no Stripe
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
        metadata: {
          supabase_user_id: customerId || '',
          source: 'card_form'
        }
      });
    }

    // 2. Criar PaymentMethod com os dados do cartao
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: cardNumber,
        exp_month: cardExpMonth,
        exp_year: cardExpYear,
        cvc: cardCvc
      },
      billing_details: {
        name: customerName,
        email: customerEmail
      }
    });

    // 3. Anexar PaymentMethod ao cliente
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customer.id
    });

    // 4. Definir como metodo de pagamento padrao
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethod.id
      }
    });

    // 5. Buscar ou criar o produto
    let product;
    const products = await stripe.products.list({
      active: true,
      limit: 100
    });

    product = products.data.find(p => p.name === planName);

    if (!product) {
      product = await stripe.products.create({
        name: planName,
        metadata: {
          plan_id: planId || ''
        }
      });
    }

    // 6. Buscar ou criar o preco
    let price;
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 100
    });

    price = prices.data.find(p =>
      p.unit_amount === amountInCents &&
      p.recurring?.interval === 'month'
    );

    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: amountInCents,
        currency: 'brl',
        recurring: {
          interval: 'month'
        }
      });
    }

    // 7. Criar a assinatura
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      default_payment_method: paymentMethod.id,
      payment_behavior: 'error_if_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        supabase_user_id: customerId || '',
        coupon_id: couponId || '',
        discount_percentage: discountPercentage?.toString() || '0',
        payment_method: 'card_form'
      }
    });

    // 8. Verificar status do pagamento
    const invoice = subscription.latest_invoice;
    const paymentIntent = invoice?.payment_intent;

    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      // Se precisar de acao adicional (3D Secure, etc)
      if (paymentIntent?.status === 'requires_action') {
        return res.json({
          success: false,
          error: 'Pagamento requer autenticacao adicional',
          requiresAction: true,
          clientSecret: paymentIntent.client_secret
        });
      }

      return res.json({
        success: false,
        error: 'Pagamento nao foi aprovado. Verifique os dados do cartao.'
      });
    }

    // 9. Calcular proxima data de cobranca
    const nextBillingDate = new Date(subscription.current_period_end * 1000);

    return res.json({
      success: true,
      subscriptionId: subscription.id,
      customerId: customer.id,
      status: subscription.status,
      nextBillingDate: nextBillingDate.toISOString(),
      cardLastDigits: paymentMethod.card?.last4 || '',
      cardBrand: paymentMethod.card?.brand || ''
    });

  } catch (error) {
    console.error('Stripe Subscription Error:', error);

    // Tratar erros especificos do Stripe
    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        success: false,
        error: getCardErrorMessage(error.code),
        code: error.code
      });
    }

    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        success: false,
        error: 'Dados do cartao invalidos',
        code: error.code
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Erro interno ao processar pagamento'
    });
  }
}

/**
 * Traduz codigos de erro do Stripe para mensagens em portugues
 */
function getCardErrorMessage(code) {
  const messages = {
    'card_declined': 'Cartao recusado. Tente outro cartao.',
    'expired_card': 'Cartao expirado. Verifique a data de validade.',
    'incorrect_cvc': 'CVV incorreto. Verifique o codigo de seguranca.',
    'incorrect_number': 'Numero do cartao incorreto.',
    'invalid_cvc': 'CVV invalido.',
    'invalid_expiry_month': 'Mes de validade invalido.',
    'invalid_expiry_year': 'Ano de validade invalido.',
    'invalid_number': 'Numero do cartao invalido.',
    'processing_error': 'Erro ao processar. Tente novamente.',
    'insufficient_funds': 'Saldo insuficiente.',
    'lost_card': 'Cartao reportado como perdido.',
    'stolen_card': 'Cartao reportado como roubado.',
    'generic_decline': 'Cartao recusado. Entre em contato com seu banco.'
  };

  return messages[code] || 'Erro ao processar cartao. Tente novamente.';
}

module.exports = {
  handleCreateSubscription
};

/**
 * EXEMPLO DE USO NO EXPRESS:
 *
 * const { handleCreateSubscription } = require('./stripe-card-subscription');
 *
 * app.post('/api/stripe/create-subscription', handleCreateSubscription);
 */
