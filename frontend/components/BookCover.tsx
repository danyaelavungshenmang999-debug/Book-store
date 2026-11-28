import { useState } from 'react';
import { BookOpen } from 'lucide-react';

const MISSING_COVER_URLS = new Set([
  '/uploads/covers/cover-1795668925895-608318.jpg',
]);

interface BookCoverProps {
  src: string;
  title: string;
  author?: string;
  className?: string;
}

export function BookCover({ src, title, author, className = '' }: BookCoverProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src || MISSING_COVER_URLS.has(src)) {
    return (
      <div
        className={`relative flex flex-col justify-between bg-[#ECE8DF] border border-[#DED8CC] p-5 text-[#18181B] select-none ${className}`}
      >
        <div className="flex items-center justify-between text-[11px] tracking-wide text-[#71717A] uppercase">
          <span>BookHaven</span>
          <BookOpen className="w-4 h-4 text-[#0F5132]" />
        </div>
        <div className="my-auto py-4 border-y border-[#DED8CC]">
          <p className="font-display text-lg font-semibold leading-snug text-[#18181B] line-clamp-3">
            {title}
          </p>
          {author && (
            <p className="mt-2 text-xs text-[#52525B] truncate">{author}</p>
          )}
        </div>
        <div className="text-[11px] font-mono text-[#71717A]">Archival Edition</div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Cover of ${title}${author ? ` by ${author}` : ''}`}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover bg-[#EFECE5] ${className}`}
    />
  );
}
