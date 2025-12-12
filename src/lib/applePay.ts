import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface PaymentItem {
  /** Nome do item (ex: "Plano Pro") */
  label: string;
  /** Valor do item em reais (ex: 79.90) */
  amount: number;
}

export interface PaymentRequest {
  /** ID do comerciante registrado na Apple (ex: "merchant.com.agendahof.mobile") */
  merchantId: string;
  /** Valor total do pagamento */
  amount: number;
  /** Codigo da moeda (ex: "BRL" para Real) */
  currencyCode: string;
  /** Codigo do pais (ex: "BR" para Brasil) */
  countryCode: string;
  /** Nome que aparece no total (ex: "AgendaHOF") */
  label?: string;
  /** Lista de itens individuais (opcional) */
  items?: PaymentItem[];
  /** Solicitar endereco de cobranca */
  requireBillingAddress?: boolean;
  /** Solicitar endereco de entrega */
  requireShippingAddress?: boolean;
}

export interface PaymentMethod {
  /** Nome exibido do cartao (ex: "Visa ****1234") */
  displayName: string;
  /** Rede do cartao (ex: "Visa", "Mastercard") */
  network: string;
  /** Tipo do cartao: "debit", "credit", "prepaid", etc */
  type: string;
}

export interface ContactAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isoCountryCode: string;
}

export interface ContactInfo {
  givenName?: string;
  familyName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  address?: ContactAddress;
}

export interface PaymentResult {
  /** Indica se o pagamento foi autorizado com sucesso */
  success: boolean;
  /** Indica se o usuario cancelou o pagamento */
  cancelled?: boolean;
  /** Token de pagamento em base64 (enviar para seu backend) */
  paymentData?: string;
  /** ID unico da transacao gerado pela Apple */
  transactionIdentifier?: string;
  /** Informacoes do metodo de pagamento usado */
  paymentMethod?: PaymentMethod;
  /** Informacoes de contato de cobranca (se solicitado) */
  billingContact?: ContactInfo;
  /** Informacoes de contato de entrega (se solicitado) */
  shippingContact?: ContactInfo;
  /** Mensagem de erro (se houver) */
  error?: string;
}

export interface CanMakePaymentsResult {
  /** Dispositivo suporta Apple Pay */
  canMakePayments: boolean;
  /** Dispositivo suporta as redes de pagamento configuradas */
  canMakePaymentsWithNetworks: boolean;
  /** Usuario tem cartoes configurados no Wallet */
  hasSetupCards: boolean;
}

export interface OpenWalletResult {
  /** App do Wallet foi aberto com sucesso */
  opened: boolean;
  /** Abriu as configuracoes ao inves do Wallet */
  openedSettings?: boolean;
}

// ============================================
// INTERFACE DO PLUGIN
// ============================================

interface ApplePayPluginInterface {
  /** Verifica se o dispositivo suporta Apple Pay */
  canMakePayments(): Promise<CanMakePaymentsResult>;

  /** Inicia o fluxo de pagamento com Apple Pay */
  requestPayment(options: PaymentRequest): Promise<PaymentResult>;

  /** Abre o app Wallet para configurar cartoes */
  openWalletSetup(): Promise<OpenWalletResult>;
}

// Registrar o plugin nativo
const ApplePayNative = registerPlugin<ApplePayPluginInterface>('ApplePay');

// ============================================
// CLASSE DE INTEGRACAO
// ============================================

/**
 * Classe para integrar Apple Pay no seu app Capacitor
 *
 * @example
 * ```typescript
 * import { ApplePay } from './lib/applePay';
 *
 * // Verificar disponibilidade
 * const available = await ApplePay.isAvailable();
 *
 * // Fazer pagamento
 * if (available) {
 *   const result = await ApplePay.pay({
 *     merchantId: 'merchant.com.agendahof.mobile',
 *     amount: 79.90,
 *     currencyCode: 'BRL',
 *     countryCode: 'BR',
 *     label: 'AgendaHOF - Plano Pro'
 *   });
 * }
 * ```
 */
export class ApplePay {
  /** ID do comerciante padrao (configurar conforme sua conta Apple Developer) */
  static readonly DEFAULT_MERCHANT_ID = 'merchant.com.agendahof.mobile';

  /**
   * Verifica se o Apple Pay esta disponivel neste dispositivo
   * @returns true se disponivel e com cartoes configurados
   */
  static async isAvailable(): Promise<boolean> {
    // Apple Pay so funciona em dispositivos iOS nativos
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      return false;
    }

    try {
      const result = await ApplePayNative.canMakePayments();
      return result.canMakePayments && result.hasSetupCards;
    } catch (error) {
      console.error('Erro ao verificar Apple Pay:', error);
      return false;
    }
  }

  /**
   * Retorna informacoes detalhadas sobre o suporte ao Apple Pay
   */
  static async getPaymentCapabilities(): Promise<CanMakePaymentsResult | null> {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      return null;
    }

    try {
      return await ApplePayNative.canMakePayments();
    } catch (error) {
      console.error('Erro ao verificar capacidades:', error);
      return null;
    }
  }

  /**
   * Verifica se o dispositivo suporta Apple Pay mas nao tem cartoes
   * Util para mostrar botao "Configurar Apple Pay"
   */
  static async needsSetup(): Promise<boolean> {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      return false;
    }

    try {
      const result = await ApplePayNative.canMakePayments();
      return result.canMakePayments && !result.hasSetupCards;
    } catch (error) {
      return false;
    }
  }

  /**
   * Abre o app Wallet para o usuario adicionar cartoes
   */
  static async setupWallet(): Promise<boolean> {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      return false;
    }

    try {
      const result = await ApplePayNative.openWalletSetup();
      return result.opened;
    } catch (error) {
      console.error('Erro ao abrir Wallet:', error);
      return false;
    }
  }

  /**
   * Inicia o pagamento com Apple Pay
   *
   * @param options Configuracoes do pagamento
   * @returns Resultado do pagamento com token para processar no backend
   *
   * @example
   * ```typescript
   * const result = await ApplePay.pay({
   *   merchantId: 'merchant.com.agendahof.mobile',
   *   amount: 79.90,
   *   currencyCode: 'BRL',
   *   countryCode: 'BR',
   *   label: 'AgendaHOF',
   *   items: [
   *     { label: 'Plano Pro - Mensal', amount: 79.90 }
   *   ]
   * });
   *
   * if (result.success && result.paymentData) {
   *   // Enviar paymentData para seu backend processar
   *   await processPaymentOnBackend(result.paymentData);
   * }
   * ```
   */
  static async pay(options: PaymentRequest): Promise<PaymentResult> {
    // Verificar plataforma
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      return {
        success: false,
        error: 'Apple Pay is only available on iOS devices'
      };
    }

    // Validar parametros
    if (!options.merchantId) {
      return {
        success: false,
        error: 'merchantId is required'
      };
    }

    if (!options.amount || options.amount <= 0) {
      return {
        success: false,
        error: 'amount must be greater than 0'
      };
    }

    try {
      const result = await ApplePayNative.requestPayment({
        merchantId: options.merchantId,
        amount: options.amount,
        currencyCode: options.currencyCode || 'BRL',
        countryCode: options.countryCode || 'BR',
        label: options.label || 'Total',
        items: options.items,
        requireBillingAddress: options.requireBillingAddress,
        requireShippingAddress: options.requireShippingAddress
      });

      return result;
    } catch (error: any) {
      console.error('Erro no Apple Pay:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Metodo de conveniencia para pagamento de assinatura
   * Usa configuracoes padrao para o AgendaHOF
   *
   * @param planName Nome do plano (ex: "Plano Pro")
   * @param amount Valor mensal do plano
   */
  static async paySubscription(planName: string, amount: number): Promise<PaymentResult> {
    return this.pay({
      merchantId: this.DEFAULT_MERCHANT_ID,
      amount: amount,
      currencyCode: 'BRL',
      countryCode: 'BR',
      label: 'AgendaHOF',
      items: [
        { label: `${planName} - Assinatura Mensal`, amount: amount }
      ],
      requireBillingAddress: false,
      requireShippingAddress: false
    });
  }
}

// ============================================
// FUNCOES DE UTILIDADE
// ============================================

/**
 * Verifica se estamos rodando em um dispositivo iOS real
 */
export function isIOSDevice(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

/**
 * Formata valor em reais para exibicao
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
}

// ============================================
// INTEGRACAO COM STRIPE (BACKEND)
// ============================================

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export interface StripePaymentRequest {
  /** Token do Apple Pay (base64) */
  paymentToken: string;
  /** Valor em reais */
  amount: number;
  /** Nome do plano */
  planName: string;
  /** ID do plano */
  planId?: string;
  /** Email do cliente */
  customerEmail: string;
  /** ID do usuario no Supabase */
  customerId?: string;
  /** ID do cupom aplicado */
  couponId?: string;
  /** Percentual de desconto */
  discountPercentage?: number;
}

export interface StripePaymentResponse {
  success: boolean;
  paymentIntentId?: string;
  subscriptionId?: string;
  status: string;
  amount?: number;
  receiptUrl?: string;
  customerId?: string;
  nextBillingDate?: string;
  cardLastDigits?: string;
  cardBrand?: string;
  error?: string;
}

/**
 * Processa pagamento unico via Apple Pay + Stripe
 */
export async function processApplePayPayment(
  request: StripePaymentRequest
): Promise<StripePaymentResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/stripe/apple-pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        status: 'error',
        error: data.error || 'Erro ao processar pagamento'
      };
    }

    return data;
  } catch (error: any) {
    console.error('Erro ao processar Apple Pay:', error);
    return {
      success: false,
      status: 'error',
      error: error.message || 'Erro de conexao com o servidor'
    };
  }
}

/**
 * Cria assinatura recorrente via Apple Pay + Stripe
 */
export async function createApplePaySubscription(
  request: StripePaymentRequest
): Promise<StripePaymentResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/stripe/create-subscription-apple-pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        status: 'error',
        error: data.error || 'Erro ao criar assinatura'
      };
    }

    return data;
  } catch (error: any) {
    console.error('Erro ao criar assinatura Apple Pay:', error);
    return {
      success: false,
      status: 'error',
      error: error.message || 'Erro de conexao com o servidor'
    };
  }
}

/**
 * Fluxo completo de assinatura com Apple Pay
 * 1. Abre modal Apple Pay
 * 2. Usuario autoriza com Face ID/Touch ID
 * 3. Envia token para backend processar com Stripe
 * 4. Retorna resultado final
 */
export async function subscribeWithApplePay(
  planName: string,
  planId: string,
  amount: number,
  customerEmail: string,
  customerId?: string,
  couponId?: string,
  discountPercentage?: number
): Promise<StripePaymentResponse> {
  // 1. Verificar disponibilidade
  const available = await ApplePay.isAvailable();
  if (!available) {
    return {
      success: false,
      status: 'unavailable',
      error: 'Apple Pay nao esta disponivel neste dispositivo'
    };
  }

  // 2. Abrir modal do Apple Pay e obter token
  const applePayResult = await ApplePay.paySubscription(planName, amount);

  if (!applePayResult.success) {
    return {
      success: false,
      status: applePayResult.cancelled ? 'cancelled' : 'error',
      error: applePayResult.cancelled ? 'Pagamento cancelado' : applePayResult.error
    };
  }

  if (!applePayResult.paymentData) {
    return {
      success: false,
      status: 'error',
      error: 'Token de pagamento nao recebido'
    };
  }

  // 3. Enviar para backend processar com Stripe
  const stripeResult = await createApplePaySubscription({
    paymentToken: applePayResult.paymentData,
    amount,
    planName,
    planId,
    customerEmail,
    customerId,
    couponId,
    discountPercentage
  });

  return stripeResult;
}

// Export padrao
export default ApplePay;
