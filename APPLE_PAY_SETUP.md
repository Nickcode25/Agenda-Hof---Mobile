# Configuracao do Apple Pay - AgendaHOF

Este guia explica como configurar o Apple Pay no seu app Capacitor, processando pagamentos via **Stripe**.

## Pre-requisitos

1. **Conta Apple Developer** ($99/ano)
2. **macOS com Xcode** instalado
3. **Dispositivo iOS fisico** (Apple Pay nao funciona no simulador)
4. **Conta Stripe** - [Criar conta](https://dashboard.stripe.com/register)

---

## Passo 1: Configurar Merchant ID na Apple Developer

1. Acesse [Apple Developer Portal](https://developer.apple.com/account)
2. Va em **Certificates, Identifiers & Profiles**
3. No menu lateral, clique em **Identifiers**
4. Clique no botao **+** e selecione **Merchant IDs**
5. Preencha:
   - **Description**: AgendaHOF Payments
   - **Identifier**: `merchant.com.agendahof.mobile`
6. Clique em **Continue** e depois **Register**

---

## Passo 2: Configurar Apple Pay no Stripe

1. Acesse [Stripe Dashboard](https://dashboard.stripe.com)
2. Va em **Settings** > **Payment Methods** > **Apple Pay**
3. Clique em **Configure** ou **Add new domain**
4. Siga as instrucoes para:
   - Registrar seu Merchant ID
   - Fazer upload do certificado Apple Pay
5. O Stripe vai gerar um certificado de processamento automaticamente

> **Importante**: O Stripe simplifica muito a configuracao do Apple Pay. Voce nao precisa gerar certificados manualmente no Keychain.

---

## Passo 3: Habilitar Apple Pay no App ID

1. Em **Identifiers**, encontre seu App ID (`com.agendahof.mobile`)
2. Clique no App ID para editar
3. Habilite **Apple Pay Payment Processing**
4. Selecione o Merchant ID criado anteriormente
5. Clique em **Save**

---

## Passo 4: Gerar o Projeto iOS

```bash
# No diretorio do projeto
npm run build
npx cap sync ios
npx cap open ios
```

---

## Passo 5: Configurar o Xcode

### 5.1 Adicionar o Plugin ao Projeto

1. No Xcode, com o projeto aberto, va em **File** > **Add Files to "App"**
2. Navegue ate `ios-plugin/ApplePayPlugin/`
3. Selecione os arquivos:
   - `ApplePayPlugin.swift`
   - `ApplePayPlugin.m`
4. Certifique-se de que **Copy items if needed** esta marcado
5. Em **Add to targets**, selecione **App**
6. Clique em **Add**

### 5.2 Habilitar Apple Pay Capability

1. Selecione o projeto no navegador (icone azul)
2. Selecione o target **App**
3. Va na aba **Signing & Capabilities**
4. Clique em **+ Capability**
5. Procure e adicione **Apple Pay**
6. No painel que aparece, marque o Merchant ID: `merchant.com.agendahof.mobile`

### 5.3 Registrar o Plugin no Capacitor

O plugin sera registrado automaticamente pelo Capacitor.

Se nao for detectado, edite `ios/App/App/capacitor.config.json`:

```json
{
  "plugins": {
    "ApplePay": {}
  }
}
```

---

## Passo 6: Configurar o Backend (Railway)

### 6.1 Adicionar Variavel de Ambiente no Railway

No dashboard do Railway, adicione:

```
STRIPE_SECRET_KEY=sk_live_sua_chave_secreta_aqui
```

Para testes, use a chave de teste:
```
STRIPE_SECRET_KEY=sk_test_sua_chave_teste_aqui
```

### 6.2 Instalar Stripe no Backend

```bash
npm install stripe
```

### 6.3 Adicionar os Endpoints

Copie o conteudo de `backend-endpoints/stripe-apple-pay.js` para seu backend e configure as rotas:

```javascript
const express = require('express');
const { handleApplePayPayment, handleApplePaySubscription } = require('./stripe-apple-pay');

const app = express();
app.use(express.json());

// Pagamento unico com Apple Pay
app.post('/api/stripe/apple-pay', handleApplePayPayment);

// Assinatura recorrente com Apple Pay
app.post('/api/stripe/create-subscription-apple-pay', handleApplePaySubscription);
```

---

## Passo 7: Usar no React

### Modo 1: Com processamento automatico pelo Stripe (RECOMENDADO)

```tsx
import { ApplePayButton } from './components/ApplePayButton';
import { useAuth } from '@/contexts/AuthContext';

function CheckoutPage() {
  const { user } = useAuth();

  return (
    <ApplePayButton
      amount={79.90}
      label="Plano Pro"
      planId="plan_pro"
      customerEmail={user?.email}
      customerId={user?.id}
      type="subscribe"
      processWithStripe={true}  // Processa automaticamente com Stripe
      onStripeSuccess={(result) => {
        // Pagamento processado com sucesso!
        console.log('Subscription ID:', result.subscriptionId);
        console.log('Proxima cobranca:', result.nextBillingDate);

        // Salvar no Supabase e redirecionar
        saveSubscription(result);
        navigate('/my-subscription');
      }}
      onError={(error) => alert('Erro: ' + error)}
      onCancel={() => console.log('Cancelado pelo usuario')}
    />
  );
}
```

### Modo 2: Processamento manual (voce controla o backend)

```tsx
import { ApplePayButton } from './components/ApplePayButton';

function CheckoutPage() {
  const handleSuccess = async (result) => {
    // Voce recebe o token e envia manualmente para seu backend
    const response = await fetch('/api/custom-endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentData: result.paymentData,
        amount: 79.90,
      }),
    });
    // ...
  };

  return (
    <ApplePayButton
      amount={79.90}
      label="Plano Pro"
      type="subscribe"
      processWithStripe={false}  // Nao processa automaticamente
      onSuccess={handleSuccess}  // Voce controla
      onError={(error) => alert('Erro: ' + error)}
    />
  );
}
```

### Modo 3: Usando o Hook

```tsx
import { useApplePay } from './components/ApplePayButton';
import { subscribeWithApplePay } from './lib/applePay';

function CustomPaymentFlow() {
  const { isAvailable, needsSetup, setupWallet } = useApplePay();

  const handlePay = async () => {
    const result = await subscribeWithApplePay(
      'Plano Pro',           // planName
      'plan_pro',            // planId
      79.90,                 // amount
      'user@email.com',      // customerEmail
      'user_123',            // customerId (opcional)
      null,                  // couponId (opcional)
      null                   // discountPercentage (opcional)
    );

    if (result.success) {
      console.log('Assinatura criada:', result.subscriptionId);
    }
  };

  if (!isAvailable && needsSetup) {
    return <button onClick={setupWallet}>Configurar Apple Pay</button>;
  }

  if (!isAvailable) {
    return null; // Nao mostrar nada se Apple Pay nao disponivel
  }

  return (
    <button onClick={handlePay}>
      Assinar com Apple Pay - R$ 79,90/mes
    </button>
  );
}
```

---

## Integracao com Cupom de Desconto

```tsx
<ApplePayButton
  amount={finalPrice}  // Valor ja com desconto
  label={`${plan.name} - ${appliedCoupon ? `${appliedCoupon.discount_percentage}% OFF` : ''}`}
  planId={plan.id}
  customerEmail={user?.email}
  customerId={user?.id}
  couponId={appliedCoupon?.id}
  discountPercentage={appliedCoupon?.discount_percentage}
  type="subscribe"
  processWithStripe={true}
  onStripeSuccess={handleSuccess}
  onError={handleError}
/>
```

---

## Testando

### No Simulador
Apple Pay NAO funciona no simulador. Use um dispositivo fisico.

### Sandbox Testing

1. No Stripe Dashboard, use as **Test Mode Keys** (sk_test_...)
2. Configure uma conta Sandbox no Apple Developer Portal
3. No dispositivo de teste, faca login com a conta Sandbox
4. Adicione cartoes de teste no Wallet

### Cartoes de Teste Stripe

| Numero | Resultado |
|--------|-----------|
| 4242 4242 4242 4242 | Sucesso |
| 4000 0000 0000 0002 | Recusado |
| 4000 0000 0000 9995 | Fundos insuficientes |

---

## Estrutura de Arquivos

```
Agenda-Hof---Mobile/
├── ios-plugin/
│   └── ApplePayPlugin/
│       ├── ApplePayPlugin.swift      # Codigo nativo iOS (PassKit)
│       └── ApplePayPlugin.m          # Bridge Objective-C
├── backend-endpoints/
│   └── stripe-apple-pay.js           # Endpoints para o backend
├── src/
│   ├── lib/
│   │   └── applePay.ts               # Bridge JS + integracao Stripe
│   └── components/
│       └── ApplePayButton.tsx        # Componente React
└── APPLE_PAY_SETUP.md                # Este arquivo
```

---

## Fluxo Completo

```
1. Usuario toca em "Assinar com Apple Pay"
          |
          v
2. Modal nativo do Apple Pay abre
   (PKPaymentAuthorizationViewController)
          |
          v
3. Usuario confirma com duplo clique no botao lateral
   (Face ID / Touch ID)
          |
          v
4. Apple gera token de pagamento criptografado
          |
          v
5. Token enviado para seu backend
   (POST /api/stripe/create-subscription-apple-pay)
          |
          v
6. Backend processa com Stripe
   - Cria/busca cliente
   - Cria PaymentMethod
   - Cria Subscription
          |
          v
7. Resultado retorna para o app
   - subscriptionId
   - nextBillingDate
   - cardLastDigits
          |
          v
8. App salva no Supabase e atualiza UI
```

---

## Troubleshooting

### "Apple Pay is not available on this device"
- Verifique se o dispositivo suporta Apple Pay
- Verifique se ha cartoes configurados no Wallet
- Certifique-se de que nao esta no simulador

### "Unable to create payment authorization controller"
- Verifique se o Merchant ID esta correto
- Verifique se o Apple Pay capability esta habilitado no Xcode
- Verifique se o certificado esta configurado no Stripe

### Erro no processamento Stripe
- Verifique se STRIPE_SECRET_KEY esta configurada no Railway
- Verifique os logs do backend para detalhes do erro
- Certifique-se de estar usando ambiente correto (test vs live)

### Plugin nao encontrado
- Faca Clean Build (Cmd+Shift+K) e rebuild
- Verifique se os arquivos Swift estao no target correto

---

## Links Uteis

- [Apple Pay Programming Guide](https://developer.apple.com/documentation/passkit/apple_pay)
- [Stripe Apple Pay Docs](https://stripe.com/docs/apple-pay)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Capacitor iOS Docs](https://capacitorjs.com/docs/ios)
