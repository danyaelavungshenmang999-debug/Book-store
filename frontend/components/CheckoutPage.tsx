import { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  UploadCloud,
  AlertCircle,
  ShieldCheck,
  Truck,
  Tag,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { translatePaymentLabel } from '../i18n/translations';
import { apiRequest, formatMMK } from '../lib/api';
import { CartItem, Order, PaymentMethod, ShippingAddress, User } from '../types';
import { BookCover } from './BookCover';
import { PaymentLogo } from './PaymentLogo';

interface CheckoutPageProps {
  items: CartItem[];
  user: User | null;
  onBackToCatalog: () => void;
  onOpenAuth: () => void;
  onOrderSuccess: (order: Order) => void;
}

const MYANMAR_CITIES = ['Yangon', 'Mandalay', 'Naypyidaw', 'Taunggyi', 'Mawlamyine', 'Bago', 'Pyay'];

const PAYMENT_SUBMIT_CLASSES: Record<PaymentMethod, string> = {
  KBZPay: 'bg-[#004B9B] hover:bg-[#003B7A] text-white',
  WaveMoney: 'bg-[#FFE200] hover:bg-[#F0D400] text-[#003865] border border-[#E5C800]',
  AYAPay: 'bg-[#D9232A] hover:bg-[#B81C22] text-white',
  CashOnDelivery: 'bg-[#0F5132] hover:bg-[#0B3D26] text-white',
};

function MerchantQrGraphic({ provider }: { provider: 'KBZPay' | 'WaveMoney' | 'AYAPay' }) {
  const accent =
    provider === 'KBZPay' ? '#004B9B' : provider === 'WaveMoney' ? '#003B71' : '#D9232A';
  return (
    <div className="relative w-30 h-30 bg-white p-2 rounded-xl border border-[#DED8CC] shrink-0 flex items-center justify-center">
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full"
        aria-label={`${provider} Merchant QR Code`}
      >
        <rect x="8" y="8" width="28" height="28" rx="3" fill="none" stroke={accent} strokeWidth="5" />
        <rect x="16" y="16" width="12" height="12" fill="#18181B" />
        <rect x="84" y="8" width="28" height="28" rx="3" fill="none" stroke={accent} strokeWidth="5" />
        <rect x="92" y="16" width="12" height="12" fill="#18181B" />
        <rect x="8" y="84" width="28" height="28" rx="3" fill="none" stroke={accent} strokeWidth="5" />
        <rect x="16" y="92" width="12" height="12" fill="#18181B" />
        <rect x="46" y="12" width="8" height="8" fill="#18181B" />
        <rect x="62" y="12" width="12" height="8" fill="#18181B" />
        <rect x="46" y="28" width="14" height="8" fill="#18181B" />
        <rect x="68" y="28" width="8" height="16" fill="#18181B" />
        <rect x="12" y="46" width="14" height="8" fill="#18181B" />
        <rect x="34" y="46" width="8" height="16" fill="#18181B" />
        <rect x="78" y="48" width="10" height="12" fill="#18181B" />
        <rect x="96" y="48" width="14" height="8" fill="#18181B" />
        <rect x="12" y="66" width="16" height="8" fill="#18181B" />
        <rect x="46" y="76" width="12" height="8" fill="#18181B" />
        <rect x="68" y="76" width="16" height="8" fill="#18181B" />
        <rect x="92" y="70" width="18" height="14" fill="#18181B" />
        <rect x="48" y="92" width="14" height="16" fill="#18181B" />
        <rect x="72" y="96" width="12" height="12" fill="#18181B" />
        <rect x="92" y="92" width="18" height="16" fill={accent} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="p-1 bg-white rounded-md shadow-xs">
          <PaymentLogo method={provider} size="xs" />
        </div>
      </div>
    </div>
  );
}

export function CheckoutPage({
  items,
  user,
  onBackToCatalog,
  onOpenAuth,
  onOrderSuccess,
}: CheckoutPageProps) {
  const { lang, t } = useLanguage();
  const [address, setAddress] = useState<ShippingAddress>({
    fullName: user?.shippingAddress?.fullName || user?.name || '',
    phone: user?.shippingAddress?.phone || '',
    streetAddress: user?.shippingAddress?.streetAddress || '',
    township: user?.shippingAddress?.township || '',
    city: user?.shippingAddress?.city || 'Yangon',
    postalCode: user?.shippingAddress?.postalCode || '11181',
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('KBZPay');
  const [transactionId, setTransactionId] = useState('');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);

  const [promoInput, setPromoInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercentage: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [copiedPhone, setCopiedPhone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold text-[#18181B]">{t.checkout.emptyTitle}</h1>
        <p className="mt-2 text-sm text-[#52525B]">{t.checkout.emptySub}</p>
        <button
          type="button"
          onClick={onBackToCatalog}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0F5132] hover:bg-[#0B3D26] rounded-lg cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.checkout.browseCatalog}</span>
        </button>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + item.book.price * item.qty, 0);
  const discountAmount = appliedCoupon
    ? Math.round((subtotal * appliedCoupon.discountPercentage) / 100)
    : 0;
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const deliveryFee =
    afterDiscount >= 35000 ? 0 : address.city.trim().toLowerCase() === 'yangon' ? 2500 : 4500;
  const totalPrice = afterDiscount + deliveryFee;

  const merchantPhone =
    paymentMethod === 'KBZPay'
      ? '09 795 441 200'
      : paymentMethod === 'WaveMoney'
      ? '09 972 810 450'
      : '09 421 088 700';
  const merchantName =
    paymentMethod === 'KBZPay'
      ? 'BookHaven Myanmar'
      : paymentMethod === 'WaveMoney'
      ? 'BookHaven Co.'
      : 'BookHaven Myanmar · AYA Pay';

  const handleApplyCoupon = async () => {
    setCouponError(null);
    if (!promoInput.trim()) return;
    setValidatingCoupon(true);
    try {
      const res = await apiRequest<{ code: string; discountPercentage: number }>(
        '/api/orders/validate-coupon',
        {
          method: 'POST',
          body: JSON.stringify({ code: promoInput.trim() }),
        }
      );
      setAppliedCoupon(res);
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError((err as Error).message);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError(t.checkout.errSlipSize);
      return;
    }
    setError(null);
    setSlipFile(file);
    const reader = new FileReader();
    reader.onload = () => setSlipPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(merchantPhone.replace(/\s+/g, ''));
    setCopiedPhone(true);
    window.setTimeout(() => setCopiedPhone(false), 1800);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    setError(null);

    if (paymentMethod !== 'CashOnDelivery') {
      const label = translatePaymentLabel(paymentMethod, lang);
      if (transactionId.trim().length < 6) {
        setError(t.checkout.errTxnId(label));
        return;
      }
      if (!slipFile) {
        setError(t.checkout.errSlipMissing(label));
        return;
      }
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append(
        'orderItems',
        JSON.stringify(items.map((item) => ({ bookId: item.book._id, qty: item.qty })))
      );
      formData.append('shippingAddress', JSON.stringify(address));
      formData.append('paymentMethod', paymentMethod);
      if (appliedCoupon) {
        formData.append('couponCode', appliedCoupon.code);
      }
      if (paymentMethod !== 'CashOnDelivery') {
        formData.append('transactionId', transactionId.trim());
        if (slipFile) {
          formData.append('paymentSlip', slipFile);
        }
      }

      const res = await apiRequest<{ order: Order }>('/api/orders', {
        method: 'POST',
        body: formData,
      });
      onOrderSuccess(res.order);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button
        type="button"
        onClick={onBackToCatalog}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#52525B] hover:text-[#18181B] mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t.checkout.backToCatalog}</span>
      </button>

      <div className="mb-8 pb-5 border-b border-[#E5E0D8] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#18181B]">
            {t.checkout.pageTitle}
          </h1>
          <p className="mt-1 text-sm text-[#52525B]">{t.checkout.pageSub}</p>
        </div>
        {!user && (
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#0F5132] hover:bg-[#0B3D26] rounded-lg whitespace-nowrap cursor-pointer"
          >
            {t.checkout.signInToComplete}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2.5 p-4 text-sm text-[#991B1B] bg-[#FEE2E2]/75 border border-[#FECACA] rounded-lg">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Shipping + Payment Method */}
        <div className="lg:col-span-7 space-y-8">
          {/* Step 1: Myanmar Shipping Address */}
          <section className="bg-white border border-[#E5E0D8] rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFECE5] pb-3">
              <h2 className="font-display text-xl font-semibold text-[#18181B]">
                {t.checkout.step1Title}
              </h2>
              <span className="text-xs text-[#71717A]">{t.checkout.doorstepCourier}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#3F3F46] mb-1.5">
                  {t.checkout.recipientName}
                </label>
                <input
                  type="text"
                  required
                  value={address.fullName}
                  onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                  placeholder="Aye Chan Moe"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-[#D4D0C7] rounded-lg focus:outline-none focus:border-[#0F5132]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#3F3F46] mb-1.5">
                  {t.checkout.mobilePhone}
                </label>
                <input
                  type="tel"
                  required
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  placeholder="09 782 410 923"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#FAF9F6] border border-[#D4D0C7] rounded-lg focus:outline-none focus:border-[#0F5132]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3F3F46] mb-1.5">
                {t.checkout.streetAddress}
              </label>
              <input
                type="text"
                required
                value={address.streetAddress}
                onChange={(e) => setAddress({ ...address, streetAddress: e.target.value })}
                placeholder={t.checkout.streetPlaceholder}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-[#D4D0C7] rounded-lg focus:outline-none focus:border-[#0F5132]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#3F3F46] mb-1.5">
                  {t.checkout.township}
                </label>
                <input
                  type="text"
                  required
                  value={address.township}
                  onChange={(e) => setAddress({ ...address, township: e.target.value })}
                  placeholder={t.checkout.townshipPlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-[#D4D0C7] rounded-lg focus:outline-none focus:border-[#0F5132]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#3F3F46] mb-1.5">
                  {t.checkout.cityRegion}
                </label>
                <select
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-[#D4D0C7] rounded-lg focus:outline-none focus:border-[#0F5132]"
                >
                  {MYANMAR_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#3F3F46] mb-1.5">
                  {t.checkout.postalCode}
                </label>
                <input
                  type="text"
                  value={address.postalCode}
                  onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                  placeholder="11201"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#FAF9F6] border border-[#D4D0C7] rounded-lg focus:outline-none focus:border-[#0F5132]"
                />
              </div>
            </div>
          </section>

          {/* Step 2: Localized Myanmar Payment Method */}
          <section className="bg-white border border-[#E5E0D8] rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFECE5] pb-3">
              <h2 className="font-display text-xl font-semibold text-[#18181B]">
                {t.checkout.step2Title}
              </h2>
              <span className="text-xs text-[#71717A]">{t.checkout.walletsLabel}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  { id: 'KBZPay', sub: t.checkout.slipVerificationSub },
                  { id: 'WaveMoney', sub: t.checkout.slipVerificationSub },
                  { id: 'AYAPay', sub: t.checkout.slipVerificationSub },
                  { id: 'CashOnDelivery', sub: t.checkout.payCourierSub },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPaymentMethod(opt.id)}
                  className={`p-3.5 text-left rounded-lg border transition-colors cursor-pointer flex items-center gap-3 ${
                    paymentMethod === opt.id
                      ? 'border-[#0F5132] bg-[#0F5132]/5 text-[#18181B]'
                      : 'border-[#DED8CC] bg-[#FAF9F6] text-[#52525B] hover:border-[#A1A1AA]'
                  }`}
                >
                  <PaymentLogo method={opt.id} size="md" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#18181B]">
                      {translatePaymentLabel(opt.id, lang)}
                    </div>
                    <div className="text-xs text-[#71717A] mt-0.5">{opt.sub}</div>
                  </div>
                </button>
              ))}
            </div>

            {paymentMethod !== 'CashOnDelivery' ? (
              <div className="pt-4 border-t border-[#EFECE5] space-y-5">
                <div className="flex flex-col sm:flex-row gap-5 items-start p-4 bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg">
                  <MerchantQrGraphic provider={paymentMethod} />
                  <div className="flex-1 space-y-2 text-sm">
                    <div className="flex items-center gap-2 font-semibold text-[#18181B]">
                      <PaymentLogo method={paymentMethod} size="sm" />
                      <span>
                        {t.checkout.scanOrTransfer(translatePaymentLabel(paymentMethod, lang))}
                      </span>
                    </div>
                    <p className="text-xs text-[#52525B]">
                      {t.checkout.transferLead}{' '}
                      <strong className="font-mono text-[#18181B] tabular-nums">
                        {formatMMK(totalPrice, lang)}
                      </strong>{' '}
                      {t.checkout.transferTail}
                    </p>
                    <div className="pt-1 space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[#71717A]">{t.checkout.accountName}</span>
                        <span className="font-semibold text-[#18181B]">{merchantName}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[#71717A]">{t.checkout.phoneNumber}</span>
                        <span className="font-mono font-semibold text-[#18181B]">{merchantPhone}</span>
                        <button
                          type="button"
                          onClick={handleCopyPhone}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-[#0F5132] bg-white border border-[#DED8CC] rounded hover:bg-[#F3F1EC] cursor-pointer"
                        >
                          {copiedPhone ? (
                            <>
                              <Check className="w-3 h-3" /> {t.checkout.copied}
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> {t.checkout.copy}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#3F3F46] mb-1.5">
                      {t.checkout.txnIdLabel(translatePaymentLabel(paymentMethod, lang))}
                    </label>
                    <input
                      type="text"
                      required
                      minLength={6}
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder={
                        paymentMethod === 'KBZPay'
                          ? 'e.g. 010039481725'
                          : paymentMethod === 'WaveMoney'
                          ? 'e.g. WAVE88420192'
                          : 'e.g. AYA992847102'
                      }
                      className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#FAF9F6] border border-[#D4D0C7] rounded-lg focus:outline-none focus:border-[#0F5132]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#3F3F46] mb-1.5">
                      {t.checkout.slipLabel}
                    </label>
                    <label className="flex items-center justify-center gap-2 px-3.5 py-2.5 text-sm font-medium text-[#18181B] bg-[#FAF9F6] border border-dashed border-[#A1A1AA] hover:border-[#0F5132] rounded-lg cursor-pointer transition-colors">
                      <UploadCloud className="w-4 h-4 text-[#0F5132]" />
                      <span className="truncate">
                        {slipFile ? slipFile.name : t.checkout.chooseSlip}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>

                {slipPreview && (
                  <div className="flex items-center gap-4 p-3 bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg">
                    <img
                      src={slipPreview}
                      alt="Uploaded payment slip preview"
                      className="w-16 h-20 object-cover rounded border border-[#DED8CC]"
                    />
                    <div className="text-xs text-[#52525B]">
                      <div className="font-semibold text-[#18181B]">{t.checkout.slipAttached}</div>
                      <div className="mt-0.5">
                        {t.checkout.slipPendingPrefix}{' '}
                        <strong className="text-[#B45309]">{t.checkout.pendingStatusName}</strong>{' '}
                        {t.checkout.slipPendingSuffix}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="pt-4 border-t border-[#EFECE5] flex items-start gap-3 text-sm text-[#3F3F46]">
                <Truck className="w-5 h-5 text-[#0F5132] shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-[#18181B]">{t.checkout.codTermsTitle}</div>
                  <p className="mt-1 text-xs text-[#52525B] leading-relaxed">
                    {t.checkout.codTermsLead}{' '}
                    <strong className="font-mono text-[#18181B] tabular-nums">
                      {formatMMK(totalPrice, lang)}
                    </strong>{' '}
                    {t.checkout.codTermsTail}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Order Summary & Promo Code */}
        <aside className="lg:col-span-5 bg-white border border-[#E5E0D8] rounded-xl p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-semibold text-[#18181B] border-b border-[#EFECE5] pb-3">
            {t.checkout.orderSummary}
          </h2>

          <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
            {items.map(({ book, qty }) => (
              <div key={book._id} className="flex items-center gap-3">
                <div className="w-12 h-16 rounded overflow-hidden border border-[#E5E0D8] shrink-0">
                  <BookCover src={book.coverImageUrl} title={book.title} className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#18181B] truncate">{book.title}</div>
                  <div className="text-xs text-[#71717A] tabular-nums">
                    {t.checkout.qty} {qty} × {formatMMK(book.price, lang)}
                  </div>
                </div>
                <div className="font-mono text-sm font-semibold text-[#18181B] tabular-nums">
                  {formatMMK(book.price * qty, lang)}
                </div>
              </div>
            ))}
          </div>

          {/* Promo Code */}
          <div className="pt-4 border-t border-[#EFECE5]">
            <label className="block text-xs font-semibold text-[#3F3F46] mb-1.5">
              {t.checkout.promoLabel}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="BOOKHAVEN10"
                  className="w-full pl-9 pr-3 py-2 text-sm font-mono uppercase bg-[#FAF9F6] border border-[#D4D0C7] rounded-lg focus:outline-none focus:border-[#0F5132]"
                />
              </div>
              <button
                type="button"
                disabled={validatingCoupon}
                onClick={handleApplyCoupon}
                className="px-4 py-2 text-sm font-medium text-[#18181B] bg-[#EFECE5] hover:bg-[#E4DFD4] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                {validatingCoupon ? t.checkout.checking : t.checkout.apply}
              </button>
            </div>
            {couponError && <p className="mt-1.5 text-xs text-[#B91C1C]">{couponError}</p>}
            {appliedCoupon && (
              <p className="mt-1.5 text-xs font-medium text-[#0F5132]">
                {t.checkout.promoApplied(appliedCoupon.code, appliedCoupon.discountPercentage)}
              </p>
            )}
          </div>

          {/* Totals */}
          <div className="pt-4 border-t border-[#EFECE5] space-y-2 text-sm">
            <div className="flex justify-between text-[#52525B]">
              <span>{t.checkout.subtotal}</span>
              <span className="font-mono tabular-nums">{formatMMK(subtotal, lang)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-[#0F5132]">
                <span>{t.checkout.promoDiscount(appliedCoupon?.code)}</span>
                <span className="font-mono tabular-nums">- {formatMMK(discountAmount, lang)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#52525B]">
              <span>{t.checkout.courierDelivery(address.city)}</span>
              <span className="font-mono tabular-nums">
                {deliveryFee === 0 ? t.checkout.free : formatMMK(deliveryFee, lang)}
              </span>
            </div>
            <div className="pt-3 border-t border-[#E5E0D8] flex justify-between items-baseline">
              <span className="text-base font-semibold text-[#18181B]">{t.checkout.total}</span>
              <span className="font-mono text-xl font-bold text-[#18181B] tabular-nums">
                {formatMMK(totalPrice, lang)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-3 px-5 text-sm font-semibold disabled:opacity-60 rounded-lg transition-colors cursor-pointer ${PAYMENT_SUBMIT_CLASSES[paymentMethod]}`}
          >
            {submitting
              ? t.checkout.processingOrder
              : user
              ? paymentMethod === 'CashOnDelivery'
                ? t.checkout.confirmCod
                : t.checkout.submitWalletOrder(translatePaymentLabel(paymentMethod, lang))
              : t.checkout.signInCompleteBtn}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-[#71717A]">
            <ShieldCheck className="w-4 h-4 text-[#0F5132]" />
            <span>{t.checkout.stockLockNote}</span>
          </div>
        </aside>
      </form>
    </div>
  );
}
