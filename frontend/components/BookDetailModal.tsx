import { useState } from 'react';
import { X, Star, Heart, CheckCircle2, AlertTriangle, XCircle, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { translateCategory } from '../i18n/translations';
import { apiRequest, formatDate, formatMMK } from '../lib/api';
import { Book, User } from '../types';
import { BookCover } from './BookCover';

interface BookDetailModalProps {
  book: Book | null;
  onClose: () => void;
  onAddToCart: (book: Book, qty: number) => void;
  user: User | null;
  onOpenAuth: () => void;
  onToggleWishlist: (bookId: string) => void;
  onBookUpdated: (updated: Book) => void;
}

export function BookDetailModal({
  book,
  onClose,
  onAddToCart,
  user,
  onOpenAuth,
  onToggleWishlist,
  onBookUpdated,
}: BookDetailModalProps) {
  const { lang, t } = useLanguage();
  const [qty, setQty] = useState(1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  if (!book) return null;

  const isWishlisted = user?.wishlist?.includes(book._id) ?? false;
  const outOfStock = book.stockCount <= 0;
  const lowStock = book.stockCount > 0 && book.stockCount < 5;

  const handleDeleteReview = async () => {
    if (!user) return;
    setReviewError(null);
    try {
      const res = await apiRequest<{ book: Book }>(`/api/books/${book._id}/reviews`, {
        method: 'DELETE',
      });
      onBookUpdated(res.book);
      setComment('');
      setRating(5);
    } catch (err) {
      setReviewError((err as Error).message);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    setReviewError(null);
    setSubmittingReview(true);
    try {
      const res = await apiRequest<{ book: Book }>(`/api/books/${book._id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment }),
      });
      onBookUpdated(res.book);
      setComment('');
    } catch (err) {
      setReviewError((err as Error).message);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-detail-title"
    >
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#FAF9F6] border border-[#DED8CC] rounded-xl shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-[#E5E0D8]">
          <div className="text-xs font-medium text-[#52525B] flex items-center gap-2 truncate">
            <span>{translateCategory(book.category, lang)}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">ISBN {book.isbn}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.bookModal.closeAria}
            className="p-1.5 text-[#52525B] hover:text-[#18181B] rounded-lg hover:bg-[#EFECE5] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Sticky Cover Column */}
          <div className="md:col-span-5">
            <div className="aspect-[3/4] rounded-lg overflow-hidden border border-[#E5E0D8] bg-[#EFECE5]">
              <BookCover
                src={book.coverImageUrl}
                title={book.title}
                author={book.author}
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Contiguous Purchase Module & Details */}
          <div className="md:col-span-7 flex flex-col">
            <h2 id="book-detail-title" className="font-display text-3xl font-bold text-[#18181B] leading-tight">
              {book.title}
            </h2>
            <p className="mt-1.5 text-base text-[#52525B]">{t.bookModal.byAuthor(book.author)}</p>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#52525B] pb-4 border-b border-[#E5E0D8]">
              <span className="inline-flex items-center gap-1 text-[#18181B] font-medium">
                <Star className="w-4 h-4 fill-[#D97706] text-[#D97706]" />
                <span className="tabular-nums">
                  {book.rating > 0 ? book.rating.toFixed(1) : t.bookModal.newLabel}
                </span>
                <span className="text-[#71717A]">{t.bookModal.reviewsCount(book.numReviews)}</span>
              </span>
              <span aria-hidden="true">·</span>
              <span>{book.publisher}</span>
              <span aria-hidden="true">·</span>
              <span>{book.language}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{t.bookModal.pagesCount(book.pages)}</span>
            </div>

            <div className="mt-5 flex items-baseline justify-between gap-4">
              <div className="font-mono text-2xl font-semibold text-[#18181B] tabular-nums">
                {formatMMK(book.price, lang)}
              </div>

              {outOfStock ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#B91C1C]">
                  <XCircle className="w-4 h-4" />
                  {t.bookModal.outOfStock}
                </span>
              ) : lowStock ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#B45309]">
                  <AlertTriangle className="w-4 h-4" />
                  {t.bookModal.lowStock(book.stockCount)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0F5132]">
                  <CheckCircle2 className="w-4 h-4" />
                  {t.bookModal.inStockAvailable(book.stockCount)}
                </span>
              )}
            </div>

            <p className="mt-4 text-[15px] leading-relaxed text-[#3F3F46]">
              {book.description}
            </p>

            {/* Contiguous Purchase Controls */}
            <div className="mt-6 pt-5 border-t border-[#E5E0D8] flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center border border-[#D4D0C7] rounded-lg bg-white">
                <button
                  type="button"
                  disabled={outOfStock || qty <= 1}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label={t.bookModal.decreaseQtyAria}
                  className="p-2.5 text-[#52525B] hover:text-[#18181B] disabled:opacity-40 cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-mono text-sm font-semibold tabular-nums">
                  {outOfStock ? 0 : qty}
                </span>
                <button
                  type="button"
                  disabled={outOfStock || qty >= book.stockCount}
                  onClick={() => setQty((q) => Math.min(book.stockCount, q + 1))}
                  aria-label={t.bookModal.increaseQtyAria}
                  className="p-2.5 text-[#52525B] hover:text-[#18181B] disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                disabled={outOfStock}
                onClick={() => {
                  onAddToCart(book, qty);
                  onClose();
                }}
                className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 py-2.5 px-5 text-sm font-semibold text-white bg-[#0F5132] hover:bg-[#0B3D26] disabled:bg-[#A1A1AA] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{outOfStock ? t.bookModal.unavailable : t.bookModal.addToBag}</span>
              </button>

              <button
                type="button"
                onClick={() => (user ? onToggleWishlist(book._id) : onOpenAuth())}
                aria-label={isWishlisted ? t.storefront.removeSavedAria : t.storefront.saveBookAria}
                className={`inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium border rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  isWishlisted
                    ? 'border-[#0F5132] text-[#0F5132] bg-[#0F5132]/5'
                    : 'border-[#D4D0C7] text-[#18181B] bg-white hover:bg-[#F3F1EC]'
                }`}
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#0F5132]' : ''}`} />
                <span>{isWishlisted ? t.bookModal.saved : t.bookModal.save}</span>
              </button>
            </div>

            {/* Reader Reviews */}
            <div className="mt-8 pt-6 border-t border-[#E5E0D8]">
              <h3 className="text-base font-semibold text-[#18181B]">{t.bookModal.readerReviews}</h3>

              {book.reviews.length === 0 ? (
                <p className="mt-2 text-sm text-[#71717A]">{t.bookModal.noReviews}</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {book.reviews.map((rev, index) => (
                    <div key={rev._id || index} className="pb-4 border-b border-[#EFECE5] last:border-b-0">
                      <div className="flex items-center justify-between text-xs text-[#71717A]">
                        <span className="font-semibold text-[#18181B]">{rev.name}</span>
                        <span>{formatDate(rev.createdAt)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating ? 'fill-[#D97706] text-[#D97706]' : 'text-[#D4D4D8]'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="mt-1.5 text-sm text-[#3F3F46]">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              )}

              {user && book.reviews.some((review) => review.user === user.id) && (
                <button
                  type="button"
                  onClick={handleDeleteReview}
                  className="mt-4 text-xs font-semibold text-[#B91C1C] hover:underline cursor-pointer"
                >
                  Delete My Review
                </button>
              )}

              <form onSubmit={handleSubmitReview} className="mt-5 pt-4 border-t border-[#EFECE5] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#18181B]">
                    {t.bookModal.writeReview}
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        aria-label={t.bookModal.rateStarsAria(star)}
                        className="p-0.5 cursor-pointer"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            star <= rating ? 'fill-[#D97706] text-[#D97706]' : 'text-[#D4D4D8]'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                {reviewError && <p className="text-xs text-[#B91C1C]">{reviewError}</p>}
                <textarea
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    user ? t.bookModal.reviewPlaceholderAuthed : t.bookModal.reviewPlaceholderGuest
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-[#D4D0C7] rounded-lg focus:outline-none focus:border-[#0F5132]"
                />
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-4 py-2 text-xs font-semibold text-[#18181B] bg-[#EFECE5] hover:bg-[#E4DFD4] rounded-lg transition-colors cursor-pointer"
                >
                  {submittingReview
                    ? t.bookModal.submitting
                    : user
                    ? t.bookModal.submitReview
                    : t.bookModal.signInToReview}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
