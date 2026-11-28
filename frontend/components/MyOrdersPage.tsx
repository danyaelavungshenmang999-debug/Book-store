import { useEffect, useMemo, useState } from 'react';
import {
  Clock,
  CheckCircle2,
  Truck,
  PackageCheck,
  XCircle,
  Eye,
  X,
  AlertTriangle,
  Download,
  LoaderCircle,
  Search,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { translateOrderStatus } from '../i18n/translations';
import { apiRequest, formatDate, formatDateTime, formatMMK } from '../lib/api';
import { Order, OrderStatus, User } from '../types';
import { BookCover } from './BookCover';
import { PaymentLogo } from './PaymentLogo';

interface MyOrdersPageProps {
  user: User | null;
  onOpenAuth: () => void;
  highlightedOrderId?: string | null;
  onOrdersChanged: () => void;
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const { lang } = useLanguage();
  const styles: Record<OrderStatus, { color: string; icon: React.ReactNode }> = {
    'Pending Verification': {
      color: 'text-[#B45309] bg-[#FEF3C7]/70 border-[#FDE68A]',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    Processing: {
      color: 'text-[#0F5132] bg-[#DCFCE7]/70 border-[#BBF7D0]',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    Shipped: {
      color: 'text-[#1D4ED8] bg-[#DBEAFE]/70 border-[#BFDBFE]',
      icon: <Truck className="w-3.5 h-3.5" />,
    },
    Delivered: {
      color: 'text-[#15803D] bg-[#DCFCE7]/80 border-[#86EFAC]',
      icon: <PackageCheck className="w-3.5 h-3.5" />,
    },
    Cancelled: {
      color: 'text-[#B91C1C] bg-[#FEE2E2]/70 border-[#FECACA]',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
  };

  const cfg = styles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-md whitespace-nowrap ${cfg.color}`}
    >
      {cfg.icon}
      <span>{translateOrderStatus(status, lang)}</span>
    </span>
  );
}

export function MyOrdersPage({
  user,
  onOpenAuth,
  highlightedOrderId,
  onOrdersChanged,
}: MyOrdersPageProps) {
  const { lang, t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);
  const [slipModalUrl, setSlipModalUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOrders = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ orders: Order[] }>('/api/orders/my');
      setOrders(res.orders);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const handleCancelOrder = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      const res = await apiRequest<{ order: Order }>(`/api/orders/${orderId}/cancel`, {
        method: 'PUT',
      });
      setOrders((prev) => prev.map((o) => (o._id === orderId ? res.order : o)));
      onOrdersChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCancellingId(null);
    }
  };

  const handleDownloadReceipt = async (order: Order) => {
    setDownloadingReceiptId(order._id);
    try {
      const { downloadOrderReceiptPdf } = await import('../lib/receiptPdf');
      downloadOrderReceiptPdf(order);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orders;

    return orders.filter((order) => {
      const created = new Date(order.createdAt);
      const localYmd = !Number.isNaN(created.getTime())
        ? `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(
            created.getDate()
          ).padStart(2, '0')}`
        : '';
      const isoYmd = !Number.isNaN(created.getTime()) ? created.toISOString().slice(0, 10) : '';
      const usNumeric = !Number.isNaN(created.getTime())
        ? created.toLocaleDateString('en-US')
        : '';

      const searchable = [
        order.orderNumber,
        order.orderStatus,
        translateOrderStatus(order.orderStatus, 'my'),
        formatDate(order.createdAt),
        formatDateTime(order.createdAt),
        localYmd,
        isoYmd,
        usNumeric,
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(q);
    });
  }, [orders, searchQuery]);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold text-[#18181B]">{t.orders.guestTitle}</h1>
        <p className="mt-2 text-sm text-[#52525B]">{t.orders.guestSub}</p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="mt-6 px-5 py-2.5 text-sm font-semibold text-white bg-[#0F5132] hover:bg-[#0B3D26] rounded-lg cursor-pointer"
        >
          {t.orders.guestBtn}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 pb-5 border-b border-[#E5E0D8] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#18181B]">
            {t.orders.title}
          </h1>
          <p className="mt-1 text-sm text-[#52525B]">{t.orders.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={fetchOrders}
          className="px-4 py-2 text-xs font-medium text-[#18181B] bg-[#EFECE5] hover:bg-[#E4DFD4] rounded-lg whitespace-nowrap cursor-pointer"
        >
          {t.orders.refresh}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 text-sm text-[#991B1B] bg-[#FEE2E2]/70 border border-[#FECACA] rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 bg-[#EFECE5] animate-pulse rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-[#E5E0D8] rounded-xl p-12 text-center">
          <p className="font-display text-xl text-[#18181B]">{t.orders.emptyTitle}</p>
          <p className="mt-1 text-sm text-[#71717A]">{t.orders.emptySub}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.orders.searchPlaceholder}
                aria-label={t.orders.searchAria}
                className="w-full pl-10 pr-9 py-2.5 text-sm bg-white border border-[#D4D0C7] rounded-lg focus:outline-none focus:border-[#0F5132] text-[#18181B] placeholder:text-[#71717A]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={t.orders.clearSearchAria}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#71717A] hover:text-[#18181B] rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {searchQuery.trim() && (
              <p className="text-xs text-[#52525B] tabular-nums whitespace-nowrap">
                {t.orders.searchCount(filteredOrders.length, orders.length)}
              </p>
            )}
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-white border border-[#E5E0D8] rounded-xl p-10 text-center">
              <p className="font-display text-xl text-[#18181B]">{t.orders.noMatchTitle}</p>
              <p className="mt-1 text-sm text-[#71717A]">
                {t.orders.noMatchSub(searchQuery.trim())}
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-5 px-4 py-2 text-xs font-semibold text-[#18181B] bg-[#EFECE5] hover:bg-[#E4DFD4] rounded-lg cursor-pointer"
              >
                {t.orders.clearSearchBtn}
              </button>
            </div>
          ) : (
            filteredOrders.map((order) => {
            const canCancel = ['Pending Verification', 'Processing'].includes(order.orderStatus);
            const isHighlighted = highlightedOrderId === order._id;

            return (
              <article
                key={order._id}
                className={`bg-white border rounded-xl overflow-hidden ${
                  isHighlighted ? 'border-[#0F5132] ring-1 ring-[#0F5132]' : 'border-[#E5E0D8]'
                }`}
              >
                {/* Order Header */}
                <div className="px-6 py-4 bg-[#FAF9F6] border-b border-[#E5E0D8] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                    <span className="font-mono font-semibold text-[#18181B]">
                      {order.orderNumber}
                    </span>
                    <span className="text-xs text-[#71717A]">
                      {t.orders.placedOn(formatDateTime(order.createdAt))}
                    </span>
                    <span className="inline-flex items-center gap-2 text-xs font-medium text-[#3F3F46]">
                      <PaymentLogo method={order.paymentMethod} size="xs" showLabel />
                      {order.paymentDetails.transactionId && (
                        <span className="font-mono text-[#71717A]">
                          · {t.orders.txnPrefix} {order.paymentDetails.transactionId}
                        </span>
                      )}
                    </span>
                  </div>

                  <StatusBadge status={order.orderStatus} />
                </div>

                {/* Payment Verification Feedback Banner */}
                {order.paymentDetails.verificationStatus === 'Pending' &&
                  order.orderStatus !== 'Cancelled' && (
                    <div className="px-6 py-3 bg-[#FEF3C7]/45 border-b border-[#FDE68A] flex flex-wrap items-center justify-between gap-2 sm:gap-4 text-xs text-[#92400E]">
                      <span>
                        {t.orders.pendingSlipMsg}{' '}
                        <strong className="font-mono">{order.paymentDetails.transactionId}</strong>.
                      </span>
                      {order.paymentDetails.paymentSlipUrl && (
                        <button
                          type="button"
                          onClick={() => setSlipModalUrl(order.paymentDetails.paymentSlipUrl!)}
                          className="inline-flex items-center gap-1 font-semibold underline whitespace-nowrap cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t.orders.viewSlip}</span>
                        </button>
                      )}
                    </div>
                  )}

                {order.paymentDetails.verificationStatus === 'Rejected' && (
                  <div className="px-6 py-3 bg-[#FEE2E2]/55 border-b border-[#FECACA] flex items-start gap-2.5 text-xs text-[#991B1B]">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">{t.orders.rejectedLabel} </span>
                      <span>
                        {order.paymentDetails.rejectionReason || t.orders.rejectedFallback}
                      </span>
                    </div>
                  </div>
                )}

                {order.paymentDetails.verificationStatus === 'Approved' && (
                  <div className="px-6 py-2.5 bg-[#DCFCE7]/45 border-b border-[#BBF7D0] flex flex-wrap items-center justify-between gap-2 sm:gap-4 text-xs text-[#0F5132]">
                    <span>
                      {t.orders.approvedMsg(
                        order.paymentDetails.verifiedAt
                          ? formatDateTime(order.paymentDetails.verifiedAt)
                          : undefined
                      )}
                    </span>
                    {order.paymentDetails.paymentSlipUrl && (
                      <button
                        type="button"
                        onClick={() => setSlipModalUrl(order.paymentDetails.paymentSlipUrl!)}
                        className="inline-flex items-center gap-1 font-semibold underline whitespace-nowrap cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t.orders.viewReceipt}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Order Items & Footer */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  <div className="md:col-span-8 space-y-3">
                    {order.orderItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3.5">
                        <div className="w-12 h-16 rounded overflow-hidden border border-[#E5E0D8] shrink-0">
                          <BookCover
                            src={item.coverImageUrl}
                            title={item.title}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#18181B] truncate">
                            {item.title}
                          </p>
                          <p className="text-xs text-[#71717A] tabular-nums">
                            {item.author} · {t.orders.qty} {item.qty} × {formatMMK(item.price, lang)}
                          </p>
                        </div>
                        <div className="font-mono text-sm font-semibold text-[#18181B] tabular-nums">
                          {formatMMK(item.price * item.qty, lang)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="md:col-span-4 md:border-l md:border-[#EFECE5] md:pl-6 space-y-3 text-sm">
                    <div className="text-xs text-[#52525B] space-y-0.5">
                      <div className="font-semibold text-[#18181B]">
                        {order.shippingAddress.fullName}
                      </div>
                      <div>{order.shippingAddress.phone}</div>
                      <div>
                        {order.shippingAddress.streetAddress}, {order.shippingAddress.township}
                      </div>
                      <div>
                        {order.shippingAddress.city} {order.shippingAddress.postalCode}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#EFECE5] space-y-1 text-xs">
                      {order.discountAmount > 0 && (
                        <div className="flex justify-between text-[#0F5132]">
                          <span>{t.orders.discount(order.couponCode)}</span>
                          <span className="font-mono tabular-nums">
                            - {formatMMK(order.discountAmount, lang)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-[#52525B]">
                        <span>{t.orders.delivery}</span>
                        <span className="font-mono tabular-nums">
                          {order.deliveryFee === 0 ? t.orders.free : formatMMK(order.deliveryFee, lang)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold text-[#18181B] pt-1">
                        <span>{t.orders.totalPaid(order.isPaid)}</span>
                        <span className="font-mono tabular-nums">
                          {formatMMK(order.totalPrice, lang)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 space-y-2">
                      <button
                        type="button"
                        disabled={downloadingReceiptId !== null}
                        aria-busy={downloadingReceiptId === order._id}
                        onClick={() => handleDownloadReceipt(order)}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-[#18181B] bg-[#F3F1EC] hover:bg-[#E7E3D8] border border-[#DED8CC] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        {downloadingReceiptId === order._id ? (
                          <LoaderCircle className="w-3.5 h-3.5 text-[#0F5132] animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5 text-[#0F5132]" />
                        )}
                        <span>{t.orders.downloadPdf}</span>
                      </button>

                      {canCancel && (
                        <button
                          type="button"
                          disabled={cancellingId === order._id}
                          onClick={() => handleCancelOrder(order._id)}
                          className="w-full py-2 px-3 text-xs font-medium text-[#B91C1C] bg-[#FEE2E2]/40 hover:bg-[#FEE2E2]/80 border border-[#FECACA] rounded-lg transition-colors cursor-pointer"
                        >
                          {cancellingId === order._id ? t.orders.cancelling : t.orders.cancelOrder}
                        </button>
                      )}
                    </div>

                    {order.trackingNumber && (
                      <div className="pt-3 border-t border-[#EFECE5] text-xs">
                        <div className="font-semibold text-[#18181B]">Shipment Tracking</div>
                        <div className="mt-1 text-[#52525B]">
                          {order.carrier && <span>{order.carrier}: </span>}
                          <span className="font-mono">{order.trackingNumber}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
          )}
        </div>
      )}

      {/* Payment Slip Lightbox */}
      {slipModalUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={() => setSlipModalUrl(null)}
        >
          <div
            className="max-w-md w-full bg-white rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E0D8]">
              <span className="text-sm font-semibold text-[#18181B]">{t.orders.lightboxTitle}</span>
              <button
                type="button"
                onClick={() => setSlipModalUrl(null)}
                className="p-1 text-[#52525B] hover:text-[#18181B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-[#FAF9F6] flex justify-center">
              <img
                src={slipModalUrl}
                alt="Customer payment slip"
                className="max-h-[70vh] object-contain rounded border border-[#E5E0D8]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
