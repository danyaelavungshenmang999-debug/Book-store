import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Plus,
  Pencil,
  Trash2,
  X,
  Clock,
  Truck,
  PackageCheck,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  translateCategory,
  translateOrderStatus,
  translatePaymentLabel,
  translateVerificationStatus,
} from '../i18n/translations';
import { apiRequest, formatDate, formatDateTime, formatMMK } from '../lib/api';
import { AdminAnalytics, Book, Coupon, Order, OrderStatus } from '../types';
import { BookCover } from './BookCover';
import { PaymentLogo } from './PaymentLogo';

type AdminTab = 'overview' | 'payments' | 'inventory' | 'coupons';

interface AdminDashboardProps {
  onCatalogUpdated: () => void;
}

const COVER_PRESETS = [
  {
    label: 'History & Heritage (Ivory Linen)',
    url: '/frontend/assets/images/cover_irrawaddy_chronicles_1794943512999.jpg',
  },
  {
    label: 'Literary Fiction (Forest Emerald)',
    url: '/frontend/assets/images/cover_monsoon_letters_1794943512864.jpg',
  },
  {
    label: 'Architecture & Design (Slate Colonnade)',
    url: '/frontend/assets/images/cover_yangon_architecture_1794943514779.jpg',
  },
  {
    label: 'Technology & Systems (Charcoal Grid)',
    url: '/frontend/assets/images/cover_systems_craft_1794943514381.jpg',
  },
  {
    label: 'Culinary & Culture (Terracotta Tea)',
    url: '/frontend/assets/images/cover_shan_tea_table_1794943514901.jpg',
  },
];

export function AdminDashboard({ onCatalogUpdated }: AdminDashboardProps) {
  const { lang, t } = useLanguage();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [orderFilter, setOrderFilter] = useState<string>('Pending Verification');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment inspection modal
  const [inspectingOrder, setInspectingOrder] = useState<Order | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Book editor modal
  const [editingBook, setEditingBook] = useState<Partial<Book> | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [savingBook, setSavingBook] = useState(false);

  // Coupon form
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponPct, setNewCouponPct] = useState(10);
  const [newCouponExpiry, setNewCouponExpiry] = useState('2027-06-30');

  const loadAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, ordersRes, booksRes, couponsRes] = await Promise.all([
        apiRequest<AdminAnalytics>('/api/admin/analytics'),
        apiRequest<{ orders: Order[] }>('/api/orders'),
        apiRequest<{ books: Book[] }>('/api/books'),
        apiRequest<{ coupons: Coupon[] }>('/api/admin/coupons'),
      ]);
      setAnalytics(analyticsRes);
      setOrders(ordersRes.orders);
      setBooks(booksRes.books);
      setCoupons(couponsRes.coupons);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleVerifyPayment = async (action: 'approve' | 'reject') => {
    if (!inspectingOrder) return;
    if (action === 'reject' && rejectionReason.trim().length < 4) {
      setError(t.admin.errRejectReason);
      return;
    }

    setVerifying(true);
    setError(null);
    try {
      await apiRequest<{ order: Order }>(`/api/orders/${inspectingOrder._id}/verify-payment`, {
        method: 'PUT',
        body: JSON.stringify({
          action,
          rejectionReason: action === 'reject' ? rejectionReason.trim() : undefined,
        }),
      });
      setInspectingOrder(null);
      setRejectionReason('');
      await loadAdminData();
      onCatalogUpdated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setVerifying(false);
    }
  };

  const handleAdvanceStatus = async (orderId: string, orderStatus: OrderStatus) => {
    setError(null);
    let trackingNumber: string | undefined;
    let carrier: string | undefined;
    if (orderStatus === 'Shipped') {
      trackingNumber = window.prompt('Enter shipment tracking number:')?.trim();
      if (!trackingNumber) {
        setError('Tracking number is required when marking an order as shipped.');
        return;
      }
      carrier = window.prompt('Carrier name (optional):')?.trim() || undefined;
    }
    try {
      await apiRequest(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ orderStatus, trackingNumber, carrier }),
      });
      await loadAdminData();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleQuickRestock = async (book: Book, delta: number) => {
    setError(null);
    try {
      await apiRequest(`/api/books/${book._id}`, {
        method: 'PUT',
        body: JSON.stringify({ stockCount: book.stockCount + delta }),
      });
      await loadAdminData();
      onCatalogUpdated();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;
    setSavingBook(true);
    setError(null);
    try {
      if (coverFile) {
        const form = new FormData();
        Object.entries(editingBook).forEach(([key, value]) => {
          if (key !== '_id' && key !== 'coverImageUrl' && value !== undefined && value !== null) {
            form.set(key, String(value));
          }
        });
        form.set('cover', coverFile);

        if (editingBook._id) {
          await apiRequest(`/api/books/${editingBook._id}`, { method: 'PUT', body: form });
        } else {
          await apiRequest('/api/books', { method: 'POST', body: form });
        }
      } else if (editingBook._id) {
        await apiRequest(`/api/books/${editingBook._id}`, {
          method: 'PUT',
          body: JSON.stringify(editingBook),
        });
      } else {
        await apiRequest('/api/books', {
          method: 'POST',
          body: JSON.stringify(editingBook),
        });
      }
      setEditingBook(null);
      setCoverFile(null);
      setCoverPreview(null);
      await loadAdminData();
      onCatalogUpdated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingBook(false);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    setError(null);
    try {
      await apiRequest(`/api/books/${bookId}`, { method: 'DELETE' });
      await loadAdminData();
      onCatalogUpdated();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiRequest('/api/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: newCouponCode,
          discountPercentage: newCouponPct,
          expiryDate: newCouponExpiry,
        }),
      });
      setNewCouponCode('');
      await loadAdminData();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleToggleCoupon = async (couponId: string) => {
    try {
      await apiRequest(`/api/admin/coupons/${couponId}/toggle`, { method: 'PUT' });
      await loadAdminData();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const filteredOrders =
    orderFilter === 'All'
      ? orders
      : orders.filter((o) => o.orderStatus === orderFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header & Tab Strip */}
      <div className="mb-8 pb-5 border-b border-[#E5E0D8] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#18181B]">
            {t.admin.title}
          </h1>
          <p className="mt-1 text-sm text-[#52525B]">{t.admin.subtitle}</p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#EFECE5] rounded-lg overflow-x-auto">
          {(
            [
              { id: 'overview', label: t.admin.tabAnalytics },
              {
                id: 'payments',
                label: t.admin.tabPayments(analytics?.pendingVerificationCount ?? 0),
              },
              { id: 'inventory', label: t.admin.tabInventory },
              { id: 'coupons', label: t.admin.tabCoupons },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === item.id
                  ? 'bg-white text-[#18181B] shadow-xs'
                  : 'text-[#52525B] hover:text-[#18181B]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 text-sm text-[#991B1B] bg-[#FEE2E2]/70 border border-[#FECACA] rounded-lg flex items-center justify-between gap-4">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading && !analytics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-[#EFECE5] animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW & ANALYTICS */}
          {tab === 'overview' && analytics && (
            <div className="space-y-8">
              {/* 4-column KPI strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white border border-[#E5E0D8] rounded-xl p-5">
                  <div className="text-xs font-medium text-[#71717A]">{t.admin.kpiRevenue}</div>
                  <div className="mt-2 font-mono text-2xl font-bold text-[#18181B] tabular-nums">
                    {formatMMK(analytics.totalRevenue, lang)}
                  </div>
                  <div className="mt-1 text-xs text-[#0F5132]">{t.admin.kpiRevenueSub}</div>
                </div>

                <div className="bg-white border border-[#E5E0D8] rounded-xl p-5">
                  <div className="text-xs font-medium text-[#71717A]">{t.admin.kpiTotalOrders}</div>
                  <div className="mt-2 font-mono text-2xl font-bold text-[#18181B] tabular-nums">
                    {analytics.totalOrders}
                  </div>
                  <div className="mt-1 text-xs text-[#52525B]">{t.admin.kpiTotalOrdersSub}</div>
                </div>

                <div className="bg-white border border-[#E5E0D8] rounded-xl p-5">
                  <div className="text-xs font-medium text-[#71717A]">{t.admin.kpiPending}</div>
                  <div className="mt-2 font-mono text-2xl font-bold text-[#B45309] tabular-nums">
                    {analytics.pendingVerificationCount}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderFilter('Pending Verification');
                      setTab('payments');
                    }}
                    className="mt-1 text-xs font-medium text-[#0F5132] hover:underline cursor-pointer"
                  >
                    {t.admin.kpiReviewSlips}
                  </button>
                </div>

                <div className="bg-white border border-[#E5E0D8] rounded-xl p-5">
                  <div className="text-xs font-medium text-[#71717A]">{t.admin.kpiLowStock}</div>
                  <div className="mt-2 font-mono text-2xl font-bold text-[#B91C1C] tabular-nums">
                    {analytics.lowStockBooks.length}
                  </div>
                  <div className="mt-1 text-xs text-[#52525B]">{t.admin.kpiLowStockSub}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Low Stock Alerts Table */}
                <section className="lg:col-span-7 bg-white border border-[#E5E0D8] rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#E5E0D8] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#B45309]" />
                      <h2 className="text-base font-semibold text-[#18181B]">
                        {t.admin.lowStockHeading}
                      </h2>
                    </div>
                    <span className="font-mono text-xs text-[#71717A] tabular-nums">
                      {t.admin.titlesCount(analytics.lowStockBooks.length)}
                    </span>
                  </div>

                  {analytics.lowStockBooks.length === 0 ? (
                    <div className="p-8 text-center text-sm text-[#52525B]">{t.admin.allStocked}</div>
                  ) : (
                    <div className="divide-y divide-[#EFECE5]">
                      {analytics.lowStockBooks.map((book) => (
                        <div
                          key={book._id}
                          className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-[#FAF9F6]"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#18181B] truncate">
                              {book.title}
                            </div>
                            <div className="text-xs text-[#71717A] font-mono">
                              ISBN {book.isbn} · {translateCategory(book.category, lang)}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span
                              className={`font-mono text-xs font-semibold tabular-nums ${
                                book.stockCount === 0 ? 'text-[#B91C1C]' : 'text-[#B45309]'
                              }`}
                            >
                              {t.admin.leftCount(book.stockCount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuickRestock(book, 10)}
                              className="px-3 py-1.5 text-xs font-medium text-[#0F5132] bg-[#0F5132]/10 hover:bg-[#0F5132]/20 rounded-md whitespace-nowrap cursor-pointer"
                            >
                              {t.admin.plus10Stock}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Payment Channel Volume Breakdown */}
                <section className="lg:col-span-5 bg-white border border-[#E5E0D8] rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#E5E0D8]">
                    <h2 className="text-base font-semibold text-[#18181B]">
                      {t.admin.volumeByPayment}
                    </h2>
                  </div>
                  <div className="p-6 space-y-4">
                    {analytics.paymentBreakdown.map((item) => (
                      <div
                        key={item._id}
                        className="flex items-center justify-between pb-3 border-b border-[#EFECE5] last:border-b-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          <PaymentLogo method={item._id} size="md" />
                          <div>
                            <div className="text-sm font-semibold text-[#18181B]">
                              {translatePaymentLabel(item._id, lang)}
                            </div>
                            <div className="text-xs text-[#71717A] tabular-nums">
                              {t.admin.activeOrdersCount(item.count)}
                            </div>
                          </div>
                        </div>
                        <div className="font-mono text-sm font-semibold text-[#18181B] tabular-nums">
                          {formatMMK(item.volume, lang)}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* TAB 2: PAYMENT VERIFICATION MANAGER */}
          {tab === 'payments' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    'Pending Verification',
                    'All',
                    'Processing',
                    'Shipped',
                    'Delivered',
                    'Cancelled',
                  ] as const
                ).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setOrderFilter(status)}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                      orderFilter === status
                        ? 'bg-[#0F5132] text-white border-[#0F5132]'
                        : 'bg-white text-[#52525B] border-[#DED8CC] hover:text-[#18181B]'
                    }`}
                  >
                    {status === 'All' ? t.admin.filterAll : translateOrderStatus(status, lang)}
                  </button>
                ))}
              </div>

              <div className="bg-white border border-[#E5E0D8] rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E0D8] bg-[#FAF9F6] text-xs font-semibold text-[#52525B]">
                      <th className="py-3 px-4">{t.admin.colOrder}</th>
                      <th className="py-3 px-4">{t.admin.colCustomer}</th>
                      <th className="py-3 px-4">{t.admin.colPayment}</th>
                      <th className="py-3 px-4">{t.admin.colTxnId}</th>
                      <th className="py-3 px-4 text-right">{t.admin.colAmount}</th>
                      <th className="py-3 px-4">{t.admin.colStatus}</th>
                      <th className="py-3 px-4 text-right">{t.admin.colAction}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE5] text-sm">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-sm text-[#71717A]">
                          {t.admin.noOrdersMatch(
                            orderFilter === 'All'
                              ? t.admin.filterAll
                              : translateOrderStatus(orderFilter as OrderStatus, lang)
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr key={order._id} className="hover:bg-[#FAF9F6]">
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-semibold text-[#18181B]">
                              {order.orderNumber}
                            </div>
                            <div className="text-xs text-[#71717A]">
                              {formatDate(order.createdAt)}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-[#18181B]">
                              {order.shippingAddress.fullName}
                            </div>
                            <div className="text-xs text-[#71717A]">
                              {order.shippingAddress.township}, {order.shippingAddress.city}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-xs font-medium text-[#3F3F46]">
                            <PaymentLogo method={order.paymentMethod} size="xs" showLabel />
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-[#18181B]">
                            {order.paymentDetails.transactionId || t.admin.codTag}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold tabular-nums">
                            {formatMMK(order.totalPrice, lang)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap ${
                                order.orderStatus === 'Pending Verification'
                                  ? 'text-[#B45309]'
                                  : order.orderStatus === 'Cancelled'
                                  ? 'text-[#B91C1C]'
                                  : 'text-[#0F5132]'
                              }`}
                            >
                              {order.orderStatus === 'Pending Verification' && (
                                <Clock className="w-3.5 h-3.5" />
                              )}
                              {order.orderStatus === 'Processing' && (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              {order.orderStatus === 'Shipped' && <Truck className="w-3.5 h-3.5" />}
                              {order.orderStatus === 'Delivered' && (
                                <PackageCheck className="w-3.5 h-3.5" />
                              )}
                              {order.orderStatus === 'Cancelled' && (
                                <XCircle className="w-3.5 h-3.5" />
                              )}
                              <span>{translateOrderStatus(order.orderStatus, lang)}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              {order.paymentDetails.paymentSlipUrl && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInspectingOrder(order);
                                    setRejectionReason('');
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap cursor-pointer ${
                                    order.paymentDetails.verificationStatus === 'Pending'
                                      ? 'text-white bg-[#0F5132] hover:bg-[#0B3D26]'
                                      : 'text-[#18181B] bg-[#EFECE5] hover:bg-[#E4DFD4]'
                                  }`}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>
                                    {order.paymentDetails.verificationStatus === 'Pending'
                                      ? t.admin.verifySlip
                                      : t.admin.inspect}
                                  </span>
                                </button>
                              )}

                              {order.orderStatus === 'Processing' && (
                                <button
                                  type="button"
                                  onClick={() => handleAdvanceStatus(order._id, 'Shipped')}
                                  className="px-2.5 py-1.5 text-xs font-medium text-[#1D4ED8] bg-[#DBEAFE]/60 hover:bg-[#DBEAFE] rounded-md whitespace-nowrap cursor-pointer"
                                >
                                  {t.admin.markShipped}
                                </button>
                              )}
                              {order.orderStatus === 'Shipped' && (
                                <button
                                  type="button"
                                  onClick={() => handleAdvanceStatus(order._id, 'Delivered')}
                                  className="px-2.5 py-1.5 text-xs font-medium text-[#0F5132] bg-[#DCFCE7]/70 hover:bg-[#DCFCE7] rounded-md whitespace-nowrap cursor-pointer"
                                >
                                  {t.admin.markDelivered}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: INVENTORY MANAGER */}
          {tab === 'inventory' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#18181B]">
                  {t.admin.catalogInventory(books.length)}
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setEditingBook({
                      title: '',
                      author: '',
                      isbn: '',
                      category: 'Literary Fiction',
                      price: 25000,
                      stockCount: 10,
                      publisher: 'BookHaven Editions',
                      language: 'English / Myanmar',
                      pages: 250,
                      coverImageUrl: COVER_PRESETS[0].url,
                      description: '',
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F5132] hover:bg-[#0B3D26] rounded-lg whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.admin.addNewBook}</span>
                </button>
              </div>

              <div className="bg-white border border-[#E5E0D8] rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E0D8] bg-[#FAF9F6] text-xs font-semibold text-[#52525B]">
                      <th className="py-3 px-4">{t.admin.colBook}</th>
                      <th className="py-3 px-4">{t.admin.colCategory}</th>
                      <th className="py-3 px-4 text-right">{t.admin.colPrice}</th>
                      <th className="py-3 px-4 text-right">{t.admin.colStock}</th>
                      <th className="py-3 px-4 text-right">{t.admin.colActions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE5] text-sm">
                    {books.map((book) => (
                      <tr key={book._id} className="hover:bg-[#FAF9F6]">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-12 rounded overflow-hidden border border-[#E5E0D8] shrink-0">
                              <BookCover
                                src={book.coverImageUrl}
                                title={book.title}
                                className="w-full h-full"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-[#18181B] truncate max-w-[280px]">
                                {book.title}
                              </div>
                              <div className="text-xs text-[#71717A]">
                                {book.author} · <span className="font-mono">{book.isbn}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-[#52525B]">
                          {translateCategory(book.category, lang)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                          {formatMMK(book.price, lang)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`font-mono text-xs font-semibold tabular-nums ${
                              book.stockCount === 0
                                ? 'text-[#B91C1C]'
                                : book.stockCount < 5
                                ? 'text-[#B45309]'
                                : 'text-[#0F5132]'
                            }`}
                          >
                            {book.stockCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleQuickRestock(book, 5)}
                              className="px-2 py-1 text-xs font-medium text-[#0F5132] bg-[#0F5132]/10 hover:bg-[#0F5132]/20 rounded cursor-pointer"
                            >
                              +5
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCoverFile(null);
                                setCoverPreview(null);
                                setEditingBook(book);
                              }}
                              aria-label={t.admin.editAria(book.title)}
                              className="p-1.5 text-[#52525B] hover:text-[#18181B] hover:bg-[#EFECE5] rounded cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBook(book._id)}
                              aria-label={t.admin.deleteAria(book.title)}
                              className="p-1.5 text-[#52525B] hover:text-[#B91C1C] hover:bg-[#FEE2E2]/50 rounded cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PROMO CODES */}
          {tab === 'coupons' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <form
                onSubmit={handleCreateCoupon}
                className="lg:col-span-4 bg-white border border-[#E5E0D8] rounded-xl p-6 space-y-4"
              >
                <h2 className="text-base font-semibold text-[#18181B]">{t.admin.createPromoHeading}</h2>
                <div>
                  <label className="block text-xs font-semibold text-[#3F3F46] mb-1">
                    {t.admin.couponCodeLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                    placeholder="THINGYAN20"
                    className="w-full px-3 py-2 text-sm font-mono uppercase bg-[#FAF9F6] border border-[#D4D0C7] rounded-lg focus:outline-none focus:border-[#0F5132]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3F3F46] mb-1">
                    {t.admin.discountPctLabel}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={90}
                    value={newCouponPct}
                    onChange={(e) => setNewCouponPct(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono bg-[#FAF9F6] border border-[#D4D0C7] rounded-lg focus:outline-none focus:border-[#0F5132]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3F3F46] mb-1">
                    {t.admin.expiryDateLabel}
                  </label>
                  <input
                    type="date"
                    required
                    value={newCouponExpiry}
                    onChange={(e) => setNewCouponExpiry(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-[#FAF9F6] border border-[#D4D0C7] rounded-lg focus:outline-none focus:border-[#0F5132]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 text-sm font-semibold text-white bg-[#0F5132] hover:bg-[#0B3D26] rounded-lg cursor-pointer"
                >
                  {t.admin.createPromoBtn}
                </button>
              </form>

              <div className="lg:col-span-8 bg-white border border-[#E5E0D8] rounded-xl overflow-x-auto">
                <table className="w-full min-w-[520px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E0D8] bg-[#FAF9F6] text-xs font-semibold text-[#52525B]">
                      <th className="py-3 px-4">{t.admin.colCode}</th>
                      <th className="py-3 px-4">{t.admin.colDiscount}</th>
                      <th className="py-3 px-4">{t.admin.colExpires}</th>
                      <th className="py-3 px-4">{t.admin.colStatus}</th>
                      <th className="py-3 px-4 text-right">{t.admin.colToggle}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE5] text-sm">
                    {coupons.map((c) => (
                      <tr key={c._id}>
                        <td className="py-3 px-4 font-mono font-semibold text-[#18181B]">
                          {c.code}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums">
                          {c.discountPercentage}%
                        </td>
                        <td className="py-3 px-4 text-xs text-[#52525B]">
                          {formatDate(c.expiryDate)}
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold">
                          <span className={c.isActive ? 'text-[#0F5132]' : 'text-[#71717A]'}>
                            {c.isActive ? t.admin.statusActive : t.admin.statusDisabled}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleCoupon(c._id)}
                            className="px-3 py-1 text-xs font-medium bg-[#EFECE5] hover:bg-[#E4DFD4] rounded cursor-pointer"
                          >
                            {c.isActive ? t.admin.disableBtn : t.admin.activateBtn}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* INTERACTIVE PAYMENT SLIP INSPECTION MODAL */}
      {inspectingOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t.admin.inspectDialogLabel}
        >
          <div className="w-full max-w-3xl max-h-[90vh] bg-[#FAF9F6] border border-[#DED8CC] rounded-xl shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E0D8] bg-white">
              <div>
                <h3 className="font-display text-xl font-bold text-[#18181B]">
                  {t.admin.inspectTitle(inspectingOrder.orderNumber)}
                </h3>
                <p className="text-xs text-[#71717A]">
                  {t.admin.inspectSubmitted(
                    formatDateTime(inspectingOrder.createdAt),
                    translatePaymentLabel(inspectingOrder.paymentMethod, lang)
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingOrder(null)}
                className="p-1.5 text-[#52525B] hover:text-[#18181B] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Slip Image Preview */}
              <div className="md:col-span-6 bg-white border border-[#E5E0D8] rounded-lg p-3 flex items-center justify-center">
                {inspectingOrder.paymentDetails.paymentSlipUrl ? (
                  <img
                    src={inspectingOrder.paymentDetails.paymentSlipUrl}
                    alt={`Payment slip for ${inspectingOrder.orderNumber}`}
                    className="max-h-[420px] w-auto object-contain rounded"
                  />
                ) : (
                  <div className="py-16 text-xs text-[#71717A]">{t.admin.noSlipUploaded}</div>
                )}
              </div>

              {/* Order & Verification Controls */}
              <div className="md:col-span-6 space-y-5">
                <div className="bg-white border border-[#E5E0D8] rounded-lg p-4 space-y-2.5 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#71717A] shrink-0">{t.admin.fieldCustomer}</span>
                    <span className="font-semibold text-[#18181B] text-right">
                      {inspectingOrder.shippingAddress.fullName}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#71717A] shrink-0">{t.admin.fieldPhone}</span>
                    <span className="font-mono text-[#18181B]">
                      {inspectingOrder.shippingAddress.phone}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-[#71717A] shrink-0">{t.admin.fieldWallet}</span>
                    <PaymentLogo method={inspectingOrder.paymentMethod} size="xs" showLabel />
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#71717A] shrink-0">{t.admin.fieldTxnId}</span>
                    <span className="font-mono font-bold text-[#0F5132] break-all text-right">
                      {inspectingOrder.paymentDetails.transactionId}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[#EFECE5] flex justify-between items-baseline gap-4">
                    <span className="font-semibold text-[#18181B]">{t.admin.fieldExpected}</span>
                    <span className="font-mono text-lg font-bold text-[#18181B] tabular-nums shrink-0">
                      {formatMMK(inspectingOrder.totalPrice, lang)}
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-[#E5E0D8] rounded-lg p-4 space-y-2">
                  <div className="text-xs font-semibold text-[#52525B]">{t.admin.reservedBooks}</div>
                  {inspectingOrder.orderItems.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs text-[#18181B]">
                      <span className="truncate pr-2">
                        {item.qty}× {item.title}
                      </span>
                      <span className="font-mono tabular-nums shrink-0">
                        {formatMMK(item.price * item.qty, lang)}
                      </span>
                    </div>
                  ))}
                </div>

                {inspectingOrder.paymentDetails.verificationStatus === 'Pending' ? (
                  <div className="space-y-4">
                    <button
                      type="button"
                      disabled={verifying}
                      onClick={() => handleVerifyPayment('approve')}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-[#0F5132] hover:bg-[#0B3D26] disabled:opacity-60 rounded-lg cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{t.admin.approveBtn}</span>
                    </button>

                    <div className="pt-3 border-t border-[#E5E0D8] space-y-2.5">
                      <label className="block text-xs font-semibold text-[#991B1B]">
                        {t.admin.rejectLabel}
                      </label>
                      <textarea
                        rows={2}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder={t.admin.rejectPlaceholder}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#FECACA] rounded-lg focus:outline-none focus:border-[#B91C1C]"
                      />
                      <button
                        type="button"
                        disabled={verifying}
                        onClick={() => handleVerifyPayment('reject')}
                        className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold text-[#B91C1C] bg-[#FEE2E2]/60 hover:bg-[#FEE2E2] border border-[#FECACA] rounded-lg cursor-pointer"
                      >
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>{t.admin.rejectBtn}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-[#EFECE5] rounded-lg text-xs text-[#3F3F46]">
                    {t.admin.verificationStatusLabel}{' '}
                    <strong>
                      {translateVerificationStatus(
                        inspectingOrder.paymentDetails.verificationStatus,
                        lang
                      )}
                    </strong>
                    {inspectingOrder.paymentDetails.rejectionReason && (
                      <div className="mt-1 text-[#991B1B]">
                        {t.admin.reasonLabel} {inspectingOrder.paymentDetails.rejectionReason}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT BOOK MODAL */}
      {editingBook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveBook}
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#FAF9F6] border border-[#DED8CC] rounded-xl shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D8]">
              <h3 className="font-display text-xl font-bold text-[#18181B]">
                {editingBook._id ? t.admin.editBookTitle : t.admin.addBookTitle}
              </h3>
              <button
                type="button"
                onClick={() => setEditingBook(null)}
                className="p-1 text-[#52525B] hover:text-[#18181B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#3F3F46] mb-1">
                  {t.admin.labelTitle}
                </label>
                <input
                  type="text"
                  required
                  value={editingBook.title || ''}
                  onChange={(e) => setEditingBook({ ...editingBook, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#D4D0C7] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#3F3F46] mb-1">
                  {t.admin.labelAuthor}
                </label>
                <input
                  type="text"
                  required
                  value={editingBook.author || ''}
                  onChange={(e) => setEditingBook({ ...editingBook, author: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#D4D0C7] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#3F3F46] mb-1">
                  {t.admin.labelIsbn}
                </label>
                <input
                  type="text"
                  required
                  value={editingBook.isbn || ''}
                  onChange={(e) => setEditingBook({ ...editingBook, isbn: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#D4D0C7] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#3F3F46] mb-1">
                  {t.admin.labelCategory}
                </label>
                <input
                  type="text"
                  required
                  value={editingBook.category || ''}
                  onChange={(e) => setEditingBook({ ...editingBook, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#D4D0C7] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#3F3F46] mb-1">
                  {t.admin.labelPrice}
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={editingBook.price ?? 0}
                  onChange={(e) =>
                    setEditingBook({ ...editingBook, price: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#D4D0C7] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#3F3F46] mb-1">
                  {t.admin.labelStock}
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={editingBook.stockCount ?? 0}
                  onChange={(e) =>
                    setEditingBook({ ...editingBook, stockCount: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#D4D0C7] rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3F3F46] mb-2">
                Book Cover Image
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-28 rounded-lg overflow-hidden border border-[#DED8CC] bg-[#F3F1EC] shrink-0">
                  <img
                    src={coverPreview || editingBook.coverImageUrl || '/frontend/assets/images/cover_irrawaddy_chronicles_1794943512999.jpg'}
                    alt="Book cover preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setCoverFile(file);
                      setCoverPreview(file ? URL.createObjectURL(file) : null);
                    }}
                    className="block w-full text-xs text-[#52525B] file:mr-3 file:px-3 file:py-2 file:border-0 file:rounded-lg file:text-xs file:font-semibold file:bg-[#0F5132] file:text-white hover:file:bg-[#0B3D26]"
                  />
                  <p className="mt-2 text-[11px] text-[#71717A]">JPG, PNG, or WebP. Maximum 5 MB.</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3F3F46] mb-1">
                {t.admin.labelDescription}
              </label>
              <textarea
                rows={3}
                required
                value={editingBook.description || ''}
                onChange={(e) =>
                  setEditingBook({ ...editingBook, description: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-[#D4D0C7] rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingBook(null)}
                className="px-4 py-2 text-sm font-medium text-[#52525B] hover:text-[#18181B] cursor-pointer"
              >
                {t.admin.cancelBtn}
              </button>
              <button
                type="submit"
                disabled={savingBook}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#0F5132] hover:bg-[#0B3D26] rounded-lg cursor-pointer"
              >
                {savingBook ? t.admin.savingBtn : t.admin.saveBookBtn}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
