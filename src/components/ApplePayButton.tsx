import React, { useState, useEffect } from 'react';
import {
  ApplePay,
  PaymentResult,
  isIOSDevice,
  subscribeWithApplePay,
  StripePaymentResponse
} from '../lib/applePay';

// ============================================
// TIPOS
// ============================================

type ApplePayButtonStyle = 'black' | 'white' | 'white-outline';
type ApplePayButtonType = 'plain' | 'buy' | 'subscribe' | 'checkout' | 'donate';

interface ApplePayButtonProps {
  /** Valor do pagamento */
  amount: number;
  /** Nome do plano ou produto */
  label: string;
  /** ID do plano (para assinaturas) */
  planId?: string;
  /** Email do cliente (obrigatorio para processar com Stripe) */
  customerEmail?: string;
  /** ID do usuario no Supabase */
  customerId?: string;
  /** ID do cupom aplicado */
  couponId?: string;
  /** Percentual de desconto */
  discountPercentage?: number;
  /** ID do comerciante Apple (opcional, usa padrao se nao fornecido) */
  merchantId?: string;
  /** Estilo do botao: 'black', 'white', 'white-outline' */
  style?: ApplePayButtonStyle;
  /** Tipo do botao: 'plain', 'buy', 'subscribe', etc */
  type?: ApplePayButtonType;
  /** Processar pagamento automaticamente com Stripe (requer customerEmail) */
  processWithStripe?: boolean;
  /** Callback quando pagamento for bem sucedido (modo sem Stripe) */
  onSuccess?: (result: PaymentResult) => void;
  /** Callback quando pagamento processado pelo Stripe for bem sucedido */
  onStripeSuccess?: (result: StripePaymentResponse) => void;
  /** Callback quando pagamento falhar ou for cancelado */
  onError?: (error: string) => void;
  /** Callback quando usuario cancelar */
  onCancel?: () => void;
  /** Desabilitar o botao */
  disabled?: boolean;
  /** Classe CSS adicional */
  className?: string;
}

// ============================================
// ESTILOS DO BOTAO
// ============================================

const buttonStyles: Record<ApplePayButtonStyle, React.CSSProperties> = {
  black: {
    backgroundColor: '#000000',
    color: '#ffffff',
  },
  white: {
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  'white-outline': {
    backgroundColor: '#ffffff',
    color: '#000000',
    border: '1px solid #000000',
  },
};

const baseButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  width: '100%',
  height: '48px',
  borderRadius: '8px',
  fontSize: '16px',
  fontWeight: 500,
  cursor: 'pointer',
  border: 'none',
  transition: 'opacity 0.2s ease',
};

const disabledStyle: React.CSSProperties = {
  opacity: 0.5,
  cursor: 'not-allowed',
};

// ============================================
// ICONE DA APPLE
// ============================================

const AppleIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg
    width="20"
    height="24"
    viewBox="0 0 17 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M14.2639 10.5734C14.2519 8.54903 15.0371 7.01473 16.6196 5.88543C15.7168 4.59993 14.3398 3.89263 12.5141 3.75563C10.7844 3.62263 8.88812 4.77673 8.16282 4.77673C7.39752 4.77673 5.71942 3.80423 4.32742 3.80423C1.45742 3.85283 -1.58008 5.93403 -1.58008 10.8122C-1.58008 12.2602 -1.31848 13.7534 -0.79528 15.2914C-0.09588 17.3238 2.37292 22.3438 4.94682 22.2669C6.24212 22.2379 7.17162 21.3882 8.85572 21.3882C10.4899 21.3882 11.3543 22.2669 12.7981 22.2669C15.3958 22.2299 17.6426 17.6696 18.3058 15.6332C14.0711 13.6128 14.2639 10.6934 14.2639 10.5734ZM11.3663 1.98183C12.6496 0.46113 12.5381 -0.92917 12.5021 -1.37627C11.3663 -0.30787 10.7004 0.38083 10.0225 1.15803C8.69122 2.66133 8.88012 4.13893 8.93272 4.47293C10.1883 4.55093 11.0167 3.78163 11.3663 1.98183Z"
      transform="translate(1.58008 1.37627)"
      fill={color}
    />
  </svg>
);

// ============================================
// TEXTOS DO BOTAO
// ============================================

const buttonTexts: Record<ApplePayButtonType, string> = {
  plain: 'Apple Pay',
  buy: 'Comprar com Apple Pay',
  subscribe: 'Assinar com Apple Pay',
  checkout: 'Finalizar com Apple Pay',
  donate: 'Doar com Apple Pay',
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

/**
 * Botao de Apple Pay para integrar pagamentos nativos no iOS
 *
 * @example
 * ```tsx
 * <ApplePayButton
 *   amount={79.90}
 *   label="Plano Pro"
 *   type="subscribe"
 *   onSuccess={(result) => {
 *     // Enviar result.paymentData para o backend
 *     processPayment(result.paymentData);
 *   }}
 *   onError={(error) => {
 *     alert('Erro: ' + error);
 *   }}
 * />
 * ```
 */
export const ApplePayButton: React.FC<ApplePayButtonProps> = ({
  amount,
  label,
  planId,
  customerEmail,
  customerId,
  couponId,
  discountPercentage,
  merchantId,
  style = 'black',
  type = 'plain',
  processWithStripe = false,
  onSuccess,
  onStripeSuccess,
  onError,
  onCancel,
  disabled = false,
  className = '',
}) => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Verificar disponibilidade do Apple Pay
  useEffect(() => {
    const checkAvailability = async () => {
      setIsChecking(true);

      if (!isIOSDevice()) {
        setIsAvailable(false);
        setIsChecking(false);
        return;
      }

      const available = await ApplePay.isAvailable();
      setIsAvailable(available);

      if (!available) {
        const setup = await ApplePay.needsSetup();
        setNeedsSetup(setup);
      }

      setIsChecking(false);
    };

    checkAvailability();
  }, []);

  // Handler do pagamento COM processamento Stripe
  const handlePaymentWithStripe = async () => {
    if (!customerEmail) {
      onError?.('Email do cliente e obrigatorio para processar com Stripe');
      return;
    }

    setIsLoading(true);

    try {
      const result = await subscribeWithApplePay(
        label,
        planId || '',
        amount,
        customerEmail,
        customerId,
        couponId,
        discountPercentage
      );

      if (result.success) {
        onStripeSuccess?.(result);
      } else if (result.status === 'cancelled') {
        onCancel?.();
      } else {
        onError?.(result.error || 'Pagamento falhou');
      }
    } catch (error: any) {
      onError?.(error.message || 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler do pagamento SEM processamento Stripe (apenas obtem token)
  const handlePaymentWithoutStripe = async () => {
    setIsLoading(true);

    try {
      const result = await ApplePay.pay({
        merchantId: merchantId || ApplePay.DEFAULT_MERCHANT_ID,
        amount,
        currencyCode: 'BRL',
        countryCode: 'BR',
        label: 'AgendaHOF',
        items: [{ label, amount }],
      });

      if (result.success) {
        onSuccess?.(result);
      } else if (result.cancelled) {
        onCancel?.();
      } else {
        onError?.(result.error || 'Pagamento falhou');
      }
    } catch (error: any) {
      onError?.(error.message || 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler principal
  const handlePayment = async () => {
    if (disabled || isLoading || !isAvailable) return;

    if (processWithStripe) {
      await handlePaymentWithStripe();
    } else {
      await handlePaymentWithoutStripe();
    }
  };

  // Handler para configurar Wallet
  const handleSetup = async () => {
    await ApplePay.setupWallet();
  };

  // Se estiver verificando, mostrar skeleton
  if (isChecking) {
    return (
      <div
        className={className}
        style={{
          ...baseButtonStyle,
          backgroundColor: '#e5e5e5',
          animation: 'pulse 2s infinite',
        }}
      />
    );
  }

  // Se nao for iOS, nao renderizar nada
  if (!isIOSDevice()) {
    return null;
  }

  // Se precisar configurar, mostrar botao de setup
  if (needsSetup && !isAvailable) {
    return (
      <button
        onClick={handleSetup}
        className={className}
        style={{
          ...baseButtonStyle,
          ...buttonStyles['white-outline'],
        }}
      >
        <AppleIcon color="#000000" />
        <span>Configurar Apple Pay</span>
      </button>
    );
  }

  // Se nao estiver disponivel, nao renderizar
  if (!isAvailable) {
    return null;
  }

  // Renderizar botao de pagamento
  const currentStyle = buttonStyles[style];
  const iconColor = style === 'black' ? '#ffffff' : '#000000';

  return (
    <button
      onClick={handlePayment}
      disabled={disabled || isLoading}
      className={className}
      style={{
        ...baseButtonStyle,
        ...currentStyle,
        ...(disabled || isLoading ? disabledStyle : {}),
      }}
    >
      {isLoading ? (
        <span>Processando...</span>
      ) : (
        <>
          <AppleIcon color={iconColor} />
          <span>{buttonTexts[type]}</span>
        </>
      )}
    </button>
  );
};

// ============================================
// HOOK PARA USO CUSTOMIZADO
// ============================================

/**
 * Hook para usar Apple Pay de forma customizada
 *
 * @example
 * ```tsx
 * const { isAvailable, pay, isLoading } = useApplePay();
 *
 * const handleCustomPayment = async () => {
 *   const result = await pay({
 *     merchantId: 'merchant.com.example',
 *     amount: 100,
 *     currencyCode: 'BRL',
 *     countryCode: 'BR',
 *     label: 'My Product'
 *   });
 * };
 * ```
 */
export const useApplePay = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      setIsChecking(true);

      if (!isIOSDevice()) {
        setIsAvailable(false);
        setIsChecking(false);
        return;
      }

      const available = await ApplePay.isAvailable();
      setIsAvailable(available);

      if (!available) {
        const setup = await ApplePay.needsSetup();
        setNeedsSetup(setup);
      }

      setIsChecking(false);
    };

    check();
  }, []);

  const pay = async (options: Parameters<typeof ApplePay.pay>[0]) => {
    setIsLoading(true);
    try {
      return await ApplePay.pay(options);
    } finally {
      setIsLoading(false);
    }
  };

  const setupWallet = () => ApplePay.setupWallet();

  return {
    isAvailable,
    needsSetup,
    isLoading,
    isChecking,
    isIOS: isIOSDevice(),
    pay,
    setupWallet,
  };
};

export default ApplePayButton;
