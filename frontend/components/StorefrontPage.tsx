import { Search, Heart, Star, ShoppingBag, ArrowRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { translateCategory } from '../i18n/translations';
import { formatMMK } from '../lib/api';
import { Book, User } from '../types';
import { BookCover } from './BookCover';

interface StorefrontPageProps {
  books: Book[];
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  onPageChange: (page: number) => void;
  loading: boolean;
  wishlistOnly?: boolean;
  user: User | null;
  onSelectBook: (book: Book) => void;
  onAddToCart: (book: Book, qty: number) => void;
  onToggleWishlist: (bookId: string) => void;
  onOpenAuth: () => void;
}

export function StorefrontPage({
  books,
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  pagination = { page: 1, limit: 12, total: 0, totalPages: 1 },
  onPageChange,
  loading,
  wishlistOnly = false,
  user,
  onSelectBook,
  onAddToCart,
  onToggleWishlist,
  onOpenAuth,
}: StorefrontPageProps) {
  const { lang, t } = useLanguage();
  const displayedBooks = wishlistOnly
    ? books.filter((b) => user?.wishlist?.includes(b._id))
    : books;

  return (
    <div className="space-y-14 pb-16">
      {/* Split Editorial Hero (only on main Catalog view) */}
      {!wishlistOnly && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch bg-[#F3F1EC] border border-[#E5E0D8] rounded-xl overflow-hidden">
            <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-center">
              <p className="text-xs font-medium tracking-wide text-[#0F5132] uppercase">
                {t.storefront.eyebrow}
              </p>
              <h1 className="mt-3 font-display text-3xl sm:text-5xl font-bold text-[#18181B] leading-[1.18] [text-wrap:balance]">
                {t.storefront.heroTitle}
              </h1>
              <p className="mt-4 text-base text-[#52525B] leading-relaxed max-w-xl">
                {t.storefront.heroSubtitle}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <a
                  href="#catalog-grid"
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#0F5132] hover:bg-[#0B3D26] rounded-lg transition-colors whitespace-nowrap"
                >
                  <span>{t.storefront.browseCollection}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <span className="text-xs text-[#52525B]">
                  {t.storefront.freeYangonLead}{' '}
                  <strong className="font-mono text-[#18181B] tabular-nums">
                    {formatMMK(35000, lang)}
                  </strong>
                  {t.storefront.freeYangonTail ? ` ${t.storefront.freeYangonTail}` : ''}
                </span>
              </div>
            </div>

            <div className="lg:col-span-6 min-h-[260px] lg:min-h-[420px]">
              <img
                src="/src/assets/images/hero_yangon_bookstore_1794943513051.jpg"
                alt={t.storefront.heroImgAlt}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>
      )}

      {/* Catalog Controls & Grid */}
      <section id="catalog-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#E5E0D8]">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#18181B]">
              {wishlistOnly ? t.storefront.savedHeading : t.storefront.catalogHeading}
            </h2>
            <p className="mt-1 text-sm text-[#52525B]">
              {wishlistOnly ? t.storefront.savedSub : t.storefront.catalogSub}
            </p>
          </div>

          {/* Search & Sort Controls */}
          {!wishlistOnly && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={t.storefront.searchPlaceholder}
                  aria-label={t.storefront.searchAria}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#D4D0C7] rounded-lg focus:outline-none focus:border-[#0F5132]"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                aria-label={t.storefront.sortAria}
                className="px-3 py-2 text-sm bg-white border border-[#D4D0C7] rounded-lg focus:outline-none focus:border-[#0F5132]"
              >
                <option value="newest">{t.storefront.sortNewest}</option>
                <option value="price-asc">{t.storefront.sortPriceAsc}</option>
                <option value="price-desc">{t.storefront.sortPriceDesc}</option>
                <option value="rating">{t.storefront.sortRating}</option>
              </select>
            </div>
          )}
        </div>

        {/* Category Filter Tabs */}
        {!wishlistOnly && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {['All', ...categories].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#18181B] text-white'
                    : 'bg-[#F3F1EC] text-[#52525B] hover:text-[#18181B] hover:bg-[#E7E3D8]'
                }`}
              >
                {translateCategory(cat, lang)}
              </button>
            ))}
          </div>
        )}

        {/* Saved Empty / Unauthenticated State */}
        {wishlistOnly && !user ? (
          <div className="bg-white border border-[#E5E0D8] rounded-xl p-12 text-center">
            <p className="font-display text-xl text-[#18181B]">{t.storefront.signInSavedTitle}</p>
            <p className="mt-1 text-sm text-[#71717A]">{t.storefront.signInSavedSub}</p>
            <button
              type="button"
              onClick={onOpenAuth}
              className="mt-5 px-5 py-2.5 text-sm font-semibold text-white bg-[#0F5132] hover:bg-[#0B3D26] rounded-lg cursor-pointer"
            >
              {t.storefront.signInBtn}
            </button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[440px] bg-[#EFECE5] animate-pulse rounded-xl" />
            ))}
          </div>
        ) : displayedBooks.length === 0 ? (
          <div className="bg-white border border-[#E5E0D8] rounded-xl p-12 text-center">
            <p className="font-display text-xl text-[#18181B]">{t.storefront.noBooksTitle}</p>
            <p className="mt-1 text-sm text-[#71717A]">
              {wishlistOnly ? t.storefront.noBooksSaved : t.storefront.noBooksSearch}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayedBooks.map((book) => {
              const isWishlisted = user?.wishlist?.includes(book._id) ?? false;
              const outOfStock = book.stockCount <= 0;
              const lowStock = book.stockCount > 0 && book.stockCount < 5;

              return (
                <article
                  key={book._id}
                  className="group bg-white border border-[#E5E0D8] rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  {/* 3:4 Cover Image Area */}
                  <div className="relative aspect-[3/4] bg-[#EFECE5] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => onSelectBook(book)}
                      className="w-full h-full block text-left cursor-pointer"
                    >
                      <BookCover
                        src={book.coverImageUrl}
                        title={book.title}
                        author={book.author}
                        className="w-full h-full transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => (user ? onToggleWishlist(book._id) : onOpenAuth())}
                      aria-label={isWishlisted ? t.storefront.removeSavedAria : t.storefront.saveBookAria}
                      className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-xs border border-[#E5E0D8] rounded-full text-[#18181B] hover:text-[#0F5132] transition-colors cursor-pointer"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isWishlisted ? 'fill-[#0F5132] text-[#0F5132]' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Clean Metadata & Purchase Footer */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-[#71717A]">
                        <span className="uppercase tracking-wide truncate">
                          {translateCategory(book.category, lang)}
                        </span>
                        {outOfStock ? (
                          <span className="font-medium text-[#B91C1C] shrink-0">
                            {t.storefront.outOfStock}
                          </span>
                        ) : lowStock ? (
                          <span className="font-medium text-[#B45309] shrink-0 tabular-nums">
                            {t.storefront.leftCount(book.stockCount)}
                          </span>
                        ) : (
                          <span className="text-[#0F5132] shrink-0">{t.storefront.inStock}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectBook(book)}
                        className="mt-1.5 text-left block w-full cursor-pointer"
                      >
                        <h3 className="font-display text-lg font-semibold text-[#18181B] leading-snug line-clamp-2 group-hover:text-[#0F5132] transition-colors">
                          {book.title}
                        </h3>
                      </button>

                      <div className="mt-1 flex items-center gap-2 text-xs text-[#52525B]">
                        <span className="truncate">{book.author}</span>
                        {book.numReviews > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 shrink-0 tabular-nums">
                              <Star className="w-3 h-3 fill-[#D97706] text-[#D97706]" />
                              {book.rating.toFixed(1)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-[#EFECE5] flex items-center justify-between gap-3">
                      <span className="font-mono text-base font-semibold text-[#18181B] tabular-nums">
                        {formatMMK(book.price, lang)}
                      </span>

                      <button
                        type="button"
                        disabled={outOfStock}
                        onClick={() => onAddToCart(book, 1)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F5132] hover:bg-[#0B3D26] disabled:bg-[#A1A1AA] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{outOfStock ? t.storefront.soldOut : t.storefront.addToBag}</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {!wishlistOnly && pagination.totalPages > 1 && (
          <nav className="flex items-center justify-center gap-3 pt-2" aria-label="Catalog pagination">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="px-4 py-2 text-sm font-medium border border-[#D4D0C7] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-[#52525B] tabular-nums">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="px-4 py-2 text-sm font-medium border border-[#D4D0C7] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}
