import { ShoppingBag, User as UserIcon, LogOut, Languages } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { User } from '../types';

export type AppView = 'catalog' | 'wishlist' | 'orders' | 'checkout' | 'admin';

interface NavbarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  cartCount: number;
  onOpenCart: () => void;
  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export function Navbar({
  activeView,
  onNavigate,
  cartCount,
  onOpenCart,
  user,
  onOpenAuth,
  onLogout,
}: NavbarProps) {
  const { lang, setLang, t } = useLanguage();

  const linkClass = (view: AppView) =>
    `text-sm font-medium transition-colors whitespace-nowrap shrink-0 py-1 border-b ${
      activeView === view
        ? 'text-[#0F5132] border-[#0F5132]'
        : 'text-[#52525B] border-transparent hover:text-[#18181B] hover:border-[#D4D4D8]'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-[#E5E0D8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 sm:h-16 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3 lg:gap-6 py-2 sm:py-0">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('catalog')}
          className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#18181B] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F5132]"
        >
          BookHaven
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden lg:flex items-center lg:gap-6" aria-label={t.nav.primaryNavLabel}>
          <button
            type="button"
            onClick={() => onNavigate('catalog')}
            className={linkClass('catalog')}
          >
            {t.nav.catalog}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('wishlist')}
            className={linkClass('wishlist')}
          >
            {t.nav.saved}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('orders')}
            className={linkClass('orders')}
          >
            {t.nav.orders}
          </button>
          {user?.role === 'admin' && (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className={linkClass('admin')}
            >
              {t.nav.adminConsole}
            </button>
          )}
        </nav>

        {/* Zone 3: Language Switcher + Primary Actions */}
        <div className="ml-auto flex items-center gap-1 sm:gap-3 shrink-0">
          <div
            className="inline-flex items-center p-0.5 bg-[#F3F1EC] border border-[#E5E0D8] rounded-lg shrink-0"
            role="group"
            aria-label={t.nav.langSwitchAria}
          >
            <Languages className="w-3.5 h-3.5 text-[#52525B] ml-1.5 mr-1 hidden sm:block shrink-0" />
            <button
              type="button"
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
              className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                lang === 'en'
                  ? 'bg-white text-[#18181B] shadow-xs'
                  : 'text-[#52525B] hover:text-[#18181B]'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('my')}
              aria-pressed={lang === 'my'}
              className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                lang === 'my'
                  ? 'bg-white text-[#18181B] shadow-xs'
                  : 'text-[#52525B] hover:text-[#18181B]'
              }`}
            >
              မြန်မာ
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-sm font-medium text-[#18181B] bg-[#F3F1EC] hover:bg-[#E9E5DC] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-[#0F5132]" />
            <span className="hidden xs:inline sm:inline">{t.nav.bag}</span>
            <span className="font-mono text-xs tabular-nums text-[#0F5132] font-semibold">
              ({cartCount})
            </span>
          </button>

          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate(user.role === 'admin' ? 'admin' : 'orders')}
                className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#18181B] hover:bg-[#F3F1EC] rounded-lg transition-colors whitespace-nowrap shrink-0 max-w-[160px] cursor-pointer"
                title={user.email}
              >
                <UserIcon className="w-4 h-4 text-[#52525B] shrink-0" />
                <span className="truncate">{user.name.split(' ')[0]}</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                aria-label={t.nav.signOut}
                title={t.nav.signOut}
                className="inline-flex items-center justify-center p-2 text-[#52525B] hover:text-[#18181B] hover:bg-[#F3F1EC] rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex items-center justify-center px-3.5 sm:px-4 py-2 text-sm font-medium text-white bg-[#0F5132] hover:bg-[#0B3D26] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.nav.signIn}
            </button>
          )}
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <div className="lg:hidden border-t border-[#E5E0D8] px-4 py-2 flex items-center gap-5 overflow-x-auto">
        <button type="button" onClick={() => onNavigate('catalog')} className={linkClass('catalog')}>
          {t.nav.catalog}
        </button>
        <button type="button" onClick={() => onNavigate('wishlist')} className={linkClass('wishlist')}>
          {t.nav.saved}
        </button>
        <button type="button" onClick={() => onNavigate('orders')} className={linkClass('orders')}>
          {t.nav.orders}
        </button>
        {user?.role === 'admin' && (
          <button type="button" onClick={() => onNavigate('admin')} className={linkClass('admin')}>
            {t.nav.adminShort}
          </button>
        )}
      </div>
    </header>
  );
}
