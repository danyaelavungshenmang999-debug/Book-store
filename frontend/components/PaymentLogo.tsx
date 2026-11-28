import ayapayLogo from '../assets/images/payments/ayapay.png';
import kbzpayLogo from '../assets/images/payments/kbzpay.png';
import wavepayLogo from '../assets/images/payments/wavepay.png';
import { useLanguage } from '../i18n/LanguageContext';
import { translatePaymentLabel } from '../i18n/translations';
import { PaymentMethod } from '../types';

interface PaymentLogoProps {
  method: PaymentMethod;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-5 h-5 rounded',
  sm: 'w-6 h-6 rounded-md',
  md: 'w-9 h-9 rounded-lg',
  lg: 'w-11 h-11 rounded-xl',
} as const;

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  KBZPay: 'KBZPay',
  WaveMoney: 'Wave Money',
  AYAPay: 'AYA Pay',
  CashOnDelivery: 'Cash on Delivery',
};

export function PaymentLogo({
  method,
  size = 'md',
  showLabel = false,
  className = '',
}: PaymentLogoProps) {
  const { lang } = useLanguage();
  const iconBox = SIZE_MAP[size];

  const renderMark = () => {
    if (method === 'KBZPay') {
      return (
        <img
          src={kbzpayLogo}
          alt="KBZPay"
          referrerPolicy="no-referrer"
          className={`${iconBox} shrink-0 object-cover shadow-xs`}
        />
      );
    }

    if (method === 'WaveMoney') {
      return (
        <img
          src={wavepayLogo}
          alt="Wave Money"
          referrerPolicy="no-referrer"
          className={`${iconBox} shrink-0 object-cover shadow-xs`}
        />
      );
    }

    if (method === 'AYAPay') {
      return (
        <img
          src={ayapayLogo}
          alt="AYA Pay"
          referrerPolicy="no-referrer"
          className={`${iconBox} shrink-0 object-contain bg-white border border-[#E5E0D8] p-0.5 shadow-xs`}
        />
      );
    }

    return (
      <svg
        viewBox="0 0 64 64"
        className={`${iconBox} shrink-0 shadow-xs`}
        role="img"
        aria-label="Cash on Delivery"
      >
        <rect width="64" height="64" rx="14" fill="#0F5132" />
        <rect
          x="11"
          y="19"
          width="42"
          height="26"
          rx="4"
          fill="#FAF9F6"
          stroke="#BBF7D0"
          strokeWidth="2"
        />
        <circle cx="32" cy="32" r="7" fill="#0F5132" />
        <text
          x="32"
          y="35.5"
          textAnchor="middle"
          fontFamily="sans-serif"
          fontSize="10"
          fontWeight="700"
          fill="#FFFFFF"
        >
          K
        </text>
        <circle cx="17.5" cy="32" r="2" fill="#0F5132" />
        <circle cx="46.5" cy="32" r="2" fill="#0F5132" />
      </svg>
    );
  };

  if (!showLabel) {
    return <span className={`inline-flex items-center ${className}`}>{renderMark()}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {renderMark()}
      <span className="font-semibold text-[#18181B] whitespace-nowrap">
        {translatePaymentLabel(method, lang)}
      </span>
    </span>
  );
}
