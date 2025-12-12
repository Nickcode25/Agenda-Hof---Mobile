# Como Atualizar o Endpoint de Cartao Digitado no Backend

**IMPORTANTE**: O Stripe NAO permite criar PaymentMethod com dados de cartao raw no servidor (viola PCI compliance).
O frontend agora cria um TOKEN e envia para o backend.

---

## SUBSTITUIR a funcao `handleCreateSubscription` no arquivo `routes/stripe-apple-pay.js`

```javascript
// ============================================
// ENDPOINT: ASSINATURA COM CARTAO DIGITADO (via Token)
// ============================================

/**
 * POST /api/stripe/create-subscription
 *
 * Cria uma assinatura recorrente usando um token de cartao do frontend
 * O frontend usa Stripe.js para criar o token (PCI compliant)
 */
async function handleCreateSubscription(req, res) {
  try {
    const {
      customerEmail,
      customerName,
      customerId,
      cardToken,  // Token criado pelo Stripe.js no frontend
      amount,
      planName,
      planId,
      couponId,
      discountPercentage
    } = req.body;

    console.log('💳 Criando assinatura com token de cartao...');

    // Validacoes
    if (!customerEmail) {
      return res.status(400).json({
        success: false,
        error: 'customerEmail is required'
      });
    }

    if (!cardToken) {
      return res.status(400).json({
        success: false,
        error: 'cardToken is required'
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
      console.log('👤 Cliente existente encontrado:', customer.id);
    } else {
      customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
        metadata: {
          supabase_user_id: customerId || '',
          source: 'card_form'
        }
      });
      console.log('👤 Novo cliente criado:', customer.id);
    }

    // 2. Criar PaymentMethod a partir do token
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        token: cardToken
      },
      billing_details: {
        name: customerName,
        email: customerEmail
      }
    });
    console.log('💳 PaymentMethod criado:', paymentMethod.id);

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
      console.log('📦 Novo produto criado:', product.id);
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
      console.log('💰 Novo preco criado:', price.id);
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
      if (paymentIntent?.status === 'requires_action') {
        console.log('⚠️ Pagamento requer autenticacao adicional');
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

    console.log('✅ Assinatura criada com sucesso:', subscription.id);

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
    console.error('❌ Stripe Subscription Error:', error);

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
```

---

## Passo 2: Atualizar o module.exports

No final do arquivo `routes/stripe-apple-pay.js`, adicione `handleCreateSubscription` ao exports:

```javascript
module.exports = {
  handleApplePayPayment,
  handleApplePaySubscription,
  handleCreateSubscription,    // <-- ADICIONAR ESTA LINHA
  cancelSubscription,
  getSubscription,
  createPaymentIntent,
  handleWebhook
};
```

---

## Passo 3: Adicionar a rota no server.js

No arquivo `server.js`, adicione a importacao e a rota:

**Na importacao (ja existente, so adicionar a nova funcao):**
```javascript
const {
  handleApplePayPayment,
  handleApplePaySubscription,
  handleCreateSubscription,    // <-- ADICIONAR ESTA LINHA
  cancelSubscription: cancelStripeSubscription,
  getSubscription: getStripeSubscription,
  createPaymentIntent,
  handleWebhook: handleStripeWebhook
} = require('./routes/stripe-apple-pay');
```

**Adicionar a nova rota (junto com as outras rotas Stripe):**
```javascript
app.post('/api/stripe/create-subscription', handleCreateSubscription);
```

---

## Passo 4: Deploy

Faca commit e push para o Railway fazer o deploy automaticamente:

```bash
git add .
git commit -m "Add Stripe card subscription endpoint"
git push
```

---

## Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `routes/stripe-apple-pay.js` | Adicionar funcao `handleCreateSubscription` e `getCardErrorMessage` |
| `routes/stripe-apple-pay.js` | Adicionar ao `module.exports` |
| `server.js` | Importar `handleCreateSubscription` |
| `server.js` | Adicionar rota `POST /api/stripe/create-subscription` |

---

## Testar

Apos o deploy, teste com o cartao de teste do Stripe:
- Numero: `4242 4242 4242 4242`
- Validade: Qualquer data futura (ex: `12/26`)
- CVV: Qualquer 3 digitos (ex: `123`)
