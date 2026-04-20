import { Book, bookMap } from '../data/books';
import { motion, AnimatePresence } from 'motion/react';
import { X, Image as ImageIcon, Star, ExternalLink } from 'lucide-react';

interface UIOverlayProps {
  books: Book[];
  hoveredBook: Book | null;
  activeBook: Book | null;
  onClosePanel: () => void;
  onSelectBook: (book: Book) => void;
}

function getGoodreadsUrl(book: Book): string {
  // Extract Goodreads book ID from the image URL
  // Image URLs look like: .../books/1234567l/36317._SX318_.jpg
  // The number before the first dot after the last slash is the book ID
  if (book.imageUrl) {
    const match = book.imageUrl.match(/\/(\d+)\._S[XY]\d+_/);
    if (match) {
      return `https://www.goodreads.com/book/show/${match[1]}`;
    }
  }
  // Fallback to search
  return `https://www.goodreads.com/search?q=${encodeURIComponent(book.title + ' ' + book.author)}`;
}

export function UIOverlay({ books, hoveredBook, activeBook, onClosePanel, onSelectBook }: UIOverlayProps) {
  // O(m) lookup via bookMap instead of O(n) filter over all books
  const relatedBooks = activeBook
    ? activeBook.connections
        .map(id => bookMap.get(id))
        .filter((b): b is Book => b !== undefined)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, 8) // Cap at 8 for large author groups
    : [];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Tooltip */}
      <AnimatePresence>
        {hoveredBook && !activeBook && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-center backdrop-blur-md shadow-[0_4px_24px_0_rgba(0,0,0,0.2)]"
          >
            <h3 className="font-sans text-lg font-medium tracking-tight text-white">
              {hoveredBook.title}
            </h3>
            <p className="font-mono text-xs text-white/60">{hoveredBook.author}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side Panel - Liquid Glass Inspired */}
      <AnimatePresence>
        {activeBook && (
          <motion.div
            initial={{ x: '120%', opacity: 0, scale: 0.95 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: '120%', opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="pointer-events-auto absolute right-4 top-4 bottom-4 w-[22rem] max-w-[90vw] rounded-[1.5rem] border border-white/10 bg-white/[0.03] bg-gradient-to-b from-white/[0.08] to-transparent p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden"
          >
            <button
              onClick={onClosePanel}
              className="absolute right-6 top-6 rounded-full p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white z-10"
            >
              <X size={20} />
            </button>

            <div className="mt-2 flex flex-col items-center">
              {/* Image Placeholder or Actual Image */}
              <div className="mb-6 flex h-56 w-40 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-inner backdrop-blur-md overflow-hidden">
                {activeBook.imageUrl ? (
                  <img src={activeBook.imageUrl} alt={activeBook.title} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <ImageIcon size={36} className="text-white/20" />
                )}
              </div>

              {/* Title & Author */}
              <h2 className="text-center font-sans text-3xl font-bold tracking-tight text-white">
                {activeBook.title}
              </h2>
              <p className="mt-1.5 text-center font-sans text-base text-white/60">
                {activeBook.author}
              </p>
            </div>

            {/* Stats - Plain text with dividers instead of boxes */}
            <div className="mt-8 flex justify-center divide-x divide-white/10">
              <div className="flex flex-col items-center px-5">
                <div className="flex items-center gap-1.5">
                  <span className="font-sans text-xl font-medium text-white">{activeBook.rating || '4.5'}</span>
                  <Star size={16} className="text-yellow-400 fill-yellow-400" />
                </div>
                <span className="font-sans text-[11px] text-white/40 mt-1 uppercase tracking-widest">Rating</span>
              </div>
              <div className="flex flex-col items-center px-5">
                <span className="font-sans text-xl font-medium text-white">{activeBook.genre || 'Sci-Fi'}</span>
                <span className="font-sans text-[11px] text-white/40 mt-1 uppercase tracking-widest">Genre</span>
              </div>
              <div className="flex flex-col items-center px-5">
                <span className="font-sans text-xl font-medium text-white">{activeBook.year || '2020'}</span>
                <span className="font-sans text-[11px] text-white/40 mt-1 uppercase tracking-widest">Year</span>
              </div>
            </div>

            {/* Description - Clean typography without a box */}
            <div className="mt-10 px-2">
              <p className="font-sans text-base leading-relaxed text-white/70 text-center">
                {activeBook.description}
              </p>
            </div>

            {/* Goodreads Link */}
            <div className="mt-8 flex justify-center">
              <a
                href={getGoodreadsUrl(activeBook)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full border border-[#F4F1EA]/20 bg-[#F4F1EA]/5 px-6 py-2.5 font-sans text-sm text-[#F4F1EA]/80 transition-all hover:bg-[#F4F1EA]/15 hover:text-[#F4F1EA] hover:scale-105"
              >
                <ExternalLink size={14} />
                Go to Goodreads
              </a>
            </div>

            {/* Related Books */}
            {relatedBooks.length > 0 && (
              <div className="mt-10 pb-4">
                <h4 className="mb-4 text-center font-sans text-[11px] font-semibold uppercase tracking-widest text-white/40">
                  More by {activeBook.author}
                </h4>
                <div className="flex flex-wrap justify-center gap-2">
                  {relatedBooks.map(book => (
                    <button
                      key={book.id}
                      onClick={() => onSelectBook(book)}
                      className="rounded-full bg-white/5 px-5 py-2 transition-all hover:bg-white/15 hover:scale-105 cursor-pointer"
                    >
                      <span className="font-sans text-sm text-white/70">{book.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Header/Title overlay */}
      <div className="absolute left-8 top-8 w-fit">
        <h1 style={{ fontFamily: "'Anton', sans-serif" }} className="text-[2.2rem] tracking-[0.08em] leading-none text-white">
          THE MONOLITH
        </h1>
        <p className="font-mono text-[10px] text-white/50 mt-1.5 w-full tracking-[0.22em] uppercase">Explore the universe of Sci-Fi</p>
      </div>
    </div>
  );
}
