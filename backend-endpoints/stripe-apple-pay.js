/**
 * Endpoints Stripe para AgendaHOF
 *
 * ADICIONE ESTE CODIGO AO SEU BACKEND NO RAILWAY
 *
 * Instalacao:
 *   npm install stripe
 *
 * Variaveis de ambiente necessarias:
 *   STRIPE_SECRET_KEY=sk_live_... (ou sk_test_... para sandbox)
 *
 * Rotas disponiveis:
 *   POST /api/stripe/apple-pay                    - Pagamento unico Apple Pay
 *   POST /api/stripe/create-subscription-apple-pay - Assinatura Apple Pay
 *   POST /api/stripe/create-subscription          - Assinatura com cartao digitado
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ============================================
// FUNCOES AUXILIARES
// ============================================

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

/**
 * Busca ou cria um cliente no Stripe
 */
async function getOrCreateCustomer(email, name, metadata = {}) {
  const existingCustomers = await stripe.customers.list({
    email: email,
    limit: 1
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  return await stripe.customers.create({
    email: email,
    name: name,
    metadata: metadata
  });
}

/**
 * Busca ou cria um produto e preco no Stripe
 */
async function getOrCreateProductAndPrice(planName, planId, amountInCents) {
  // Buscar produto existente
  const products = await stripe.products.list({
    active: true,
    limit: 100
  });

  let product = products.data.find(p => p.name === planName);

  if (!product) {
    product = await stripe.products.create({
      name: planName,
      metadata: {
        plan_id: planId || ''
      }
    });
  }

  // Buscar preco existente
  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 100
  });

  let price = prices.data.find(p =>
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

  return { product, price };
}

// ============================================
// ENDPOINT: PAGAMENTO UNICO APPLE PAY
// ============================================

/**
 * POST /api/stripe/apple-pay
 *
 * Processa o token do Apple Pay e cria uma cobranca no Stripe
 */
async function handleApplePayPayment(req, res) {
  try {
    const {
      paymentToken,
      amount,
      planName,
      customerEmail,
      customerId,
      couponId,
      discountPercentage
    } = req.body;

    // Validacoes
    if (!paymentToken) {
      return res.status(400).json({
        success: false,
        error: 'paymentToken is required'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'amount must be greater than 0'
      });
    }

    if (!customerEmail) {
      return res.status(400).json({
        success: false,
        error: 'customerEmail is required'
      });
    }

    const amountInCents = Math.round(amount * 100);

    // Buscar ou criar cliente
    const customer = await getOrCreateCustomer(customerEmail, null, {
      supabase_user_id: customerId || '',
      source: 'apple_pay'
    });

    // Criar PaymentIntent com o token do Apple Pay
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'brl',
      customer: customer.id,
      payment_method_data: {
        type: 'card',
        card: {
          token: paymentToken
        }
      },
      confirmation_method: 'automatic',
      confirm: true,
      description: `AgendaHOF - ${planName}`,
      metadata: {
        plan_name: planName,
        supabase_user_id: customerId || '',
        coupon_id: couponId || '',
        discount_percentage: discountPercentage?.toString() || '0',
        payment_method: 'apple_pay'
      },
      receipt_email: customerEmail,
      return_url: 'agendahof://payment-complete'
    });

    // Verificar status do pagamento
    if (paymentIntent.status === 'succeeded') {
      return res.json({
        success: true,
        paymentIntentId: paymentIntent.id,
        status: 'approved',
        amount: amount,
        receiptUrl: paymentIntent.receipt_url || null,
        customerId: customer.id
      });
    } else if (paymentIntent.status === 'requires_action') {
      return res.json({
        success: false,
        status: 'requires_action',
        clientSecret: paymentIntent.client_secret,
        error: 'Additional authentication required'
      });
    } else {
      return res.json({
        success: false,
        status: paymentIntent.status,
        error: 'Payment was not completed'
      });
    }

  } catch (error) {
    console.error('Stripe Apple Pay Error:', error);

    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: error.code
      });
    }

    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment data',
        code: error.code
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error processing payment'
    });
  }
}

// ============================================
// ENDPOINT: ASSINATURA APPLE PAY
// ============================================

/**
 * POST /api/stripe/create-subscription-apple-pay
 *
 * Cria uma assinatura recorrente usando Apple Pay
 */
async function handleApplePaySubscription(req, res) {
  try {
    const {
      paymentToken,
      amount,
      planName,
      planId,
      customerEmail,
      customerId,
      couponId,
      discountPercentage
    } = req.body;

    // Validacoes
    if (!paymentToken || !amount || !customerEmail) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const amountInCents = Math.round(amount * 100);

    // Buscar ou criar cliente
    const customer = await getOrCreateCustomer(customerEmail, null, {
      supabase_user_id: customerId || '',
      source: 'apple_pay'
    });

    // Criar PaymentMethod a partir do token Apple Pay
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        token: paymentToken
      }
    });

    // Anexar ao cliente
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customer.id
    });

    // Definir como metodo de pagamento padrao
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethod.id
      }
    });

    // Buscar ou criar produto e preco
    const { price } = await getOrCreateProductAndPrice(planName, planId, amountInCents);

    // Criar a assinatura
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      default_payment_method: paymentMethod.id,
      metadata: {
        supabase_user_id: customerId || '',
        coupon_id: couponId || '',
        discount_percentage: discountPercentage?.toString() || '0',
        payment_method: 'apple_pay'
      }
    });

    const nextBillingDate = new Date(subscription.current_period_end * 1000);

    return res.json({
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status === 'active' ? 'approved' : subscription.status,
      customerId: customer.id,
      nextBillingDate: nextBillingDate.toISOString(),
      cardLastDigits: paymentMethod.card?.last4 || '',
      cardBrand: paymentMethod.card?.brand || ''
    });

  } catch (error) {
    console.error('Stripe Subscription Error:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Error creating subscription'
    });
  }
}

// ============================================
// ENDPOINT: ASSINATURA COM CARTAO DIGITADO
// ============================================

/**
 * POST /api/stripe/create-subscription
 *
 * Cria uma assinatura recorrente com dados do cartao digitados
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

    const amountInCents = Math.round(amount * 100);

    // 1. Buscar ou criar cliente no Stripe
    const customer = await getOrCreateCustomer(customerEmail, customerName, {
      supabase_user_id: customerId || '',
      source: 'card_form'
    });

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

    // 5. Buscar ou criar produto e preco
    const { price } = await getOrCreateProductAndPrice(planName, planId, amountInCents);

    // 6. Criar a assinatura
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

    // 7. Verificar status do pagamento
    const invoice = subscription.latest_invoice;
    const paymentIntent = invoice?.payment_intent;

    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
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

    // 8. Retornar sucesso
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

// ============================================
// EXPORTAR PARA USO NO EXPRESS
// ============================================

module.exports = {
  handleApplePayPayment,
  handleApplePaySubscription,
  handleCreateSubscription
};

/**
 * EXEMPLO DE USO NO EXPRESS (server.js):
 *
 * const express = require('express');
 * const {
 *   handleApplePayPayment,
 *   handleApplePaySubscription,
 *   handleCreateSubscription
 * } = require('./routes/stripe-apple-pay');
 *
 * const app = express();
 * app.use(express.json());
 *
 * // Rotas Stripe
 * app.post('/api/stripe/apple-pay', handleApplePayPayment);
 * app.post('/api/stripe/create-subscription-apple-pay', handleApplePaySubscription);
 * app.post('/api/stripe/create-subscription', handleCreateSubscription);
 */
