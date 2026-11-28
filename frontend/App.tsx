import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { BookDetailModal } from './components/BookDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutPage } from './components/CheckoutPage';
import { MyOrdersPage } from './components/MyOrdersPage';
import { AppView, Navbar } from './components/Navbar';
import { PaymentLogo } from './components/PaymentLogo';
import { StorefrontPage } from './components/StorefrontPage';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { translatePaymentLabel } from './i18n/translations';
import { apiRequest, getStoredToken, setStoredToken } from './lib/api';
import { Book, CartItem, Order, User } from './types';

const CART_KEY = 'bookhaven_cart';
const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard').then(({ AdminDashboard }) => ({
    default: AdminDashboard,
  }))
);

function AppContent() {
  const { lang, t } = useLanguage();
  const [activeView, setActiveView] = useState<AppView>('catalog');
  const [user, setUser] = useState<User | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loadingBooks, setLoadingBooks] = useState(true);

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => {
      setToast((prev) => (prev === message ? null : prev));
    }, 3600);
  }, []);

  // Restore authenticated session if JWT exists
  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    apiRequest<{ user: User }>('/api/auth/profile')
      .then((res) => setUser(res.user))
      .catch(() => setStoredToken(null));
  }, []);

  const fetchBooks = useCallback(async () => {
    setLoadingBooks(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedCategory !== 'All') params.set('category', selectedCategory);
      if (sortBy) params.set('sort', sortBy);
      params.set('page', String(page));
      params.set('limit', '12');

      const res = await apiRequest<{
        books: Book[];
        categories: string[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/api/books?${params.toString()}`);
      setBooks(res.books);
      setCategories(res.categories);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to fetch books:', err);
    } finally {
      setLoadingBooks(false);
    }
  }, [searchQuery, selectedCategory, sortBy, page]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory, sortBy]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      fetchBooks();
    }, 150);
    return () => window.clearTimeout(handle);
  }, [fetchBooks]);

  const handleAddToCart = (book: Book, qty: number) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.book._id === book._id);
      if (existing) {
        const nextQty = Math.min(book.stockCount, existing.qty + qty);
        return prev.map((i) => (i.book._id === book._id ? { book, qty: nextQty } : i));
      }
      return [...prev, { book, qty: Math.min(book.stockCount, qty) }];
    });
    showToast(t.toasts.addedToBag(book.title));
  };

  const handleUpdateCartQty = (bookId: string, qty: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.book._id === bookId
          ? { ...item, qty: Math.max(1, Math.min(item.book.stockCount, qty)) }
          : item
      )
    );
  };

  const handleRemoveCartItem = (bookId: string) => {
    setCart((prev) => prev.filter((item) => item.book._id !== bookId));
  };

  const handleToggleWishlist = async (bookId: string) => {
    try {
      const res = await apiRequest<{ wishlist: string[] }>(`/api/auth/wishlist/${bookId}`, {
        method: 'POST',
      });
      setUser((prev) => (prev ? { ...prev, wishlist: res.wishlist } : prev));
    } catch (err) {
      showToast((err as Error).message);
    }
  };

  const handleLogout = () => {
    setStoredToken(null);
    setUser(null);
    if (activeView === 'admin') {
      setActiveView('catalog');
    }
    showToast(t.toasts.signedOut);
  };

  const handleOrderSuccess = (order: Order) => {
    setCart([]);
    setHighlightedOrderId(order._id);
    setActiveView('orders');
    fetchBooks();
    showToast(
      order.paymentMethod === 'CashOnDelivery'
        ? t.toasts.orderConfirmedCod(order.orderNumber)
        : t.toasts.orderSubmittedWallet(
            order.orderNumber,
            translatePaymentLabel(order.paymentMethod, lang)
          )
    );
  };

  const totalCartItems = cart.reduce((sum, i) => sum + i.qty, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#18181B]">
      <Navbar
        activeView={activeView}
        onNavigate={(view) => {
          if (view === 'admin' && user?.role !== 'admin') {
            setIsAuthOpen(true);
            return;
          }
          setActiveView(view);
        }}
        cartCount={totalCartItems}
        onOpenCart={() => setIsCartOpen(true)}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        {(activeView === 'catalog' || activeView === 'wishlist') && (
          <StorefrontPage
            books={books}
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            pagination={pagination}
            onPageChange={setPage}
            loading={loadingBooks}
            wishlistOnly={activeView === 'wishlist'}
            user={user}
            onSelectBook={(book) => setSelectedBook(book)}
            onAddToCart={handleAddToCart}
            onToggleWishlist={handleToggleWishlist}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {activeView === 'checkout' && (
          <CheckoutPage
            items={cart}
            user={user}
            onBackToCatalog={() => setActiveView('catalog')}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOrderSuccess={handleOrderSuccess}
          />
        )}

        {activeView === 'orders' && (
          <MyOrdersPage
            user={user}
            onOpenAuth={() => setIsAuthOpen(true)}
            highlightedOrderId={highlightedOrderId}
            onOrdersChanged={fetchBooks}
          />
        )}

        {activeView === 'admin' && user?.role === 'admin' && (
          <Suspense
            fallback={
              <div
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10"
                role="status"
                aria-live="polite"
              >
                <span className="sr-only">{t.admin.loading}</span>
                <div className="h-8 w-64 max-w-full rounded bg-[#EFECE5] animate-pulse" />
                <div className="mt-4 h-4 w-96 max-w-full rounded bg-[#EFECE5] animate-pulse" />
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {[0, 1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-28 rounded-xl border border-[#E5E0D8] bg-white animate-pulse"
                    />
                  ))}
                </div>
                <div className="mt-8 h-64 rounded-xl border border-[#E5E0D8] bg-white animate-pulse" />
              </div>
            }
          >
            <AdminDashboard onCatalogUpdated={fetchBooks} />
          </Suspense>
        )}
      </main>

      <footer className="border-t border-[#E5E0D8] bg-[#F3F1EC] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#52525B]">
          <div>
            <span className="font-display text-base font-bold text-[#18181B]">BookHaven</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>{t.footer.address}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <PaymentLogo method="KBZPay" size="xs" showLabel />
              <PaymentLogo method="WaveMoney" size="xs" showLabel />
              <PaymentLogo method="AYAPay" size="xs" showLabel />
              <PaymentLogo method="CashOnDelivery" size="xs" showLabel />
            </div>
            <span aria-hidden="true">·</span>
            <span>{t.footer.copyright(new Date().getFullYear())}</span>
          </div>
        </div>
      </footer>

      {/* Modals & Slide-Over Drawers */}
      <BookDetailModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onAddToCart={handleAddToCart}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onToggleWishlist={handleToggleWishlist}
        onBookUpdated={(updated) => {
          setSelectedBook(updated);
          setBooks((prev) => prev.map((b) => (b._id === updated._id ? updated : b)));
          fetchBooks();
        }}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onProceedToCheckout={() => setActiveView('checkout')}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthenticated={(loggedInUser) => {
          setUser(loggedInUser);
          showToast(t.toasts.welcomeBack(loggedInUser.name));
          if (loggedInUser.role === 'admin' && activeView === 'catalog') {
            // Keep admin on current page unless they click Admin Console, or notify
          }
        }}
      />

      {/* Non-intrusive bottom-right confirmation toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-[#18181B] text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0" />
          <span className="flex-1">{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label={t.toasts.dismiss}
            className="text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
