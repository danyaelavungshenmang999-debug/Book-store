import { X, Minus, Plus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { formatMMK } from '../lib/api';
import { CartItem } from '../types';
import { BookCover } from './BookCover';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQty: (bookId: string, qty: number) => void;
  onRemoveItem: (bookId: string) => void;
  onProceedToCheckout: () => void;
}

export function CartDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQty,
  onRemoveItem,
  onProceedToCheckout,
}: CartDrawerProps) {
  const { lang, t } = useLanguage();
  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.book.price * item.qty, 0);
  const freeThreshold = 35000;
  const remainingForFree = Math.max(0, freeThreshold - subtotal);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[1px]">
      <div
        className="w-full max-w-md h-full bg-[#FAF9F6] border-l border-[#DED8CC] shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={t.cart.dialogLabel}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E0D8]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#0F5132]" />
            <h2 className="font-display text-xl font-semibold text-[#18181B]">
              {t.cart.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.cart.closeAria}
            className="p-1.5 text-[#52525B] hover:text-[#18181B] rounded-lg hover:bg-[#EFECE5] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free delivery threshold notice */}
        {items.length > 0 && (
          <div className="px-6 py-3 bg-[#F3F1EC] border-b border-[#E5E0D8] text-xs text-[#3F3F46]">
            {remainingForFree === 0 ? (
              <span className="font-medium text-[#0F5132]">{t.cart.freeUnlocked}</span>
            ) : (
              <span>
                {t.cart.addMoreLead}{' '}
                <strong className="font-mono tabular-nums">{formatMMK(remainingForFree, lang)}</strong>{' '}
                {t.cart.addMoreTail}
              </span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-[#E5E0D8]">
          {items.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-display text-lg text-[#18181B]">{t.cart.emptyTitle}</p>
              <p className="mt-1 text-sm text-[#71717A]">{t.cart.emptySub}</p>
            </div>
          ) : (
            items.map(({ book, qty }) => (
              <div key={book._id} className="py-4 flex gap-4">
                <div className="w-16 h-22 shrink-0 rounded overflow-hidden border border-[#E5E0D8]">
                  <BookCover
                    src={book.coverImageUrl}
                    title={book.title}
                    author={book.author}
                    className="w-full h-full"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[#18181B] leading-snug line-clamp-2">
                        {book.title}
                      </h3>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(book._id)}
                        aria-label={t.cart.removeAria(book.title)}
                        className="p-1 text-[#71717A] hover:text-[#B91C1C] cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-[#71717A] mt-0.5">{book.author}</p>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="inline-flex items-center border border-[#D4D0C7] rounded-md bg-white">
                      <button
                        type="button"
                        onClick={() =>
                          qty > 1 ? onUpdateQty(book._id, qty - 1) : onRemoveItem(book._id)
                        }
                        aria-label={t.cart.decreaseAria}
                        className="p-1.5 text-[#52525B] hover:text-[#18181B] cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center font-mono text-xs font-semibold tabular-nums">
                        {qty}
                      </span>
                      <button
                        type="button"
                        disabled={qty >= book.stockCount}
                        onClick={() => onUpdateQty(book._id, qty + 1)}
                        aria-label={t.cart.increaseAria}
                        className="p-1.5 text-[#52525B] hover:text-[#18181B] disabled:opacity-40 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="font-mono text-sm font-semibold text-[#18181B] tabular-nums">
                      {formatMMK(book.price * qty, lang)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-[#E5E0D8] bg-white space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#52525B]">{t.cart.subtotal}</span>
              <span className="font-mono text-base font-semibold text-[#18181B] tabular-nums">
                {formatMMK(subtotal, lang)}
              </span>
            </div>
            <p className="text-xs text-[#71717A]">{t.cart.checkoutNote}</p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onProceedToCheckout();
              }}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 text-sm font-semibold text-white bg-[#0F5132] hover:bg-[#0B3D26] rounded-lg transition-colors cursor-pointer"
            >
              <span>{t.cart.proceedToCheckout}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
