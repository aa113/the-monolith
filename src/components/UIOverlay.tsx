import { useEffect, useState } from 'react';
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
  if (book.imageUrl) {
    const match = book.imageUrl.match(/\/(\d+)\._S[XY]\d+_/);
    if (match) return `https://www.goodreads.com/book/show/${match[1]}`;
  }
  return `https://www.goodreads.com/search?q=${encodeURIComponent(book.title + ' ' + book.author)}`;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export function UIOverlay({ books, hoveredBook, activeBook, onClosePanel, onSelectBook }: UIOverlayProps) {
  const isMobile = useIsMobile();

  const relatedBooks = activeBook
    ? activeBook.connections
        .map(id => bookMap.get(id))
        .filter((b): b is Book => b !== undefined)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, 8)
    : [];

  // Shared panel content
  const panelContent = activeBook && (
    <>
      {/* Close button */}
      <button
        onClick={onClosePanel}
        className="absolute right-4 top-4 rounded-full p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white z-10"
      >
        <X size={18} />
      </button>

      {isMobile ? (
        /* ── Mobile layout: full-height image left, details right ── */
        <div className="flex flex-col h-full">
          <div className="flex justify-center pt-2 pb-1 shrink-0">
            <div className="w-8 h-1 rounded-full bg-white/20" />
          </div>
        <div className="flex flex-1 min-h-0 px-3 pb-3 gap-3">
          {/* Left: cover image — 2:3 aspect ratio, slightly less than panel height */}
          <div className="shrink-0 rounded-xl overflow-hidden border border-white/10 bg-white/5"
               style={{ height: 'calc(38vh - 2rem)', aspectRatio: '2/3' }}>
            {activeBook.imageUrl
              ? <img src={activeBook.imageUrl} alt={activeBook.title} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              : <div className="h-full w-full flex items-center justify-center"><ImageIcon size={24} className="text-white/20" /></div>}
          </div>

          {/* Right: details */}
          <div className="flex flex-col flex-1 min-w-0 overflow-y-auto [&::-webkit-scrollbar]:hidden py-1">
            <h2 className="font-sans text-[13px] font-bold tracking-tight text-white leading-snug line-clamp-2">
              {activeBook.title}
            </h2>
            <p className="mt-1 font-sans text-[11px] text-white/50">{activeBook.author}</p>

            {/* Stats */}
            <div className="mt-3 flex divide-x divide-white/10">
              <div className="flex flex-col pr-3">
                <div className="flex items-center gap-1">
                  <span className="font-sans text-[12px] font-medium text-white">{activeBook.rating || '4.5'}</span>
                  <Star size={9} className="text-yellow-400 fill-yellow-400" />
                </div>
                <span className="font-sans text-[8px] text-white/40 uppercase tracking-widest">Rating</span>
              </div>
              <div className="flex flex-col px-3">
                <span className="font-sans text-[12px] font-medium text-white">{activeBook.genre || 'Sci-Fi'}</span>
                <span className="font-sans text-[8px] text-white/40 uppercase tracking-widest">Genre</span>
              </div>
              <div className="flex flex-col pl-3">
                <span className="font-sans text-[12px] font-medium text-white">{activeBook.year || '2020'}</span>
                <span className="font-sans text-[8px] text-white/40 uppercase tracking-widest">Year</span>
              </div>
            </div>

            {/* Goodreads */}
            <a
              href={getGoodreadsUrl(activeBook)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 font-sans text-[11px] text-white/80 w-fit"
            >
              <ExternalLink size={10} />
              Go to Goodreads
            </a>

            {/* Related books */}
            {relatedBooks.length > 0 && (
              <div className="mt-3">
                <p className="font-sans text-[8px] text-white/30 uppercase tracking-widest mb-1.5">More by {activeBook.author}</p>
                <div className="flex flex-wrap gap-1">
                  {relatedBooks.map(book => (
                    <button
                      key={book.id}
                      onClick={() => onSelectBook(book)}
                      className="rounded-full bg-white/5 px-2.5 py-1 cursor-pointer"
                    >
                      <span className="font-sans text-[10px] text-white/60">{book.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      ) : (
        /* ── Desktop layout: vertical panel ── */
        <div className="flex flex-col mt-2 overflow-y-auto [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col items-center">
            <div className="mb-4 flex h-44 w-32 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-inner backdrop-blur-md overflow-hidden">
              {activeBook.imageUrl
                ? <img src={activeBook.imageUrl} alt={activeBook.title} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                : <ImageIcon size={36} className="text-white/20" />}
            </div>
            <h2 className="text-center font-sans text-xl font-bold tracking-tight text-white">{activeBook.title}</h2>
            <p className="mt-1 text-center font-sans text-sm text-white/60">{activeBook.author}</p>
          </div>

          <div className="mt-5 flex justify-center divide-x divide-white/10">
            <div className="flex flex-col items-center px-4">
              <div className="flex items-center gap-1">
                <span className="font-sans text-base font-medium text-white">{activeBook.rating || '4.5'}</span>
                <Star size={13} className="text-yellow-400 fill-yellow-400" />
              </div>
              <span className="font-sans text-[10px] text-white/40 mt-0.5 uppercase tracking-widest">Rating</span>
            </div>
            <div className="flex flex-col items-center px-4">
              <span className="font-sans text-base font-medium text-white">{activeBook.genre || 'Sci-Fi'}</span>
              <span className="font-sans text-[10px] text-white/40 mt-0.5 uppercase tracking-widest">Genre</span>
            </div>
            <div className="flex flex-col items-center px-4">
              <span className="font-sans text-base font-medium text-white">{activeBook.year || '2020'}</span>
              <span className="font-sans text-[10px] text-white/40 mt-0.5 uppercase tracking-widest">Year</span>
            </div>
          </div>

          <div className="mt-10 px-2">
            <p className="font-sans text-base leading-relaxed text-white/70 text-center">{activeBook.description}</p>
          </div>

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
                    <span className="font-sans text-xs text-white/70">{book.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Tooltip — desktop only */}
      <AnimatePresence>
        {hoveredBook && !activeBook && !isMobile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-center backdrop-blur-md shadow-[0_4px_24px_0_rgba(0,0,0,0.2)]"
          >
            <h3 className="font-sans text-lg font-medium tracking-tight text-white">{hoveredBook.title}</h3>
            <p className="font-mono text-xs text-white/60">{hoveredBook.author}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeBook && (
          isMobile ? (
            /* ── Mobile: bottom sheet ── */
            <motion.div
              key="mobile-panel"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="pointer-events-auto absolute bottom-0 left-0 right-0 h-[38vh] rounded-t-[1.5rem] border-t border-white/10 bg-[#030303]/95 backdrop-blur-xl shadow-[0_-8px_32px_0_rgba(0,0,0,0.7)] overflow-hidden"
            >
              {panelContent}
            </motion.div>
          ) : (
            /* ── Desktop: right panel ── */
            <motion.div
              key="desktop-panel"
              initial={{ x: '120%', opacity: 0, scale: 0.95 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: '120%', opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="pointer-events-auto absolute right-4 top-4 bottom-4 w-[22rem] rounded-[1.5rem] border border-white/10 bg-white/[0.03] bg-gradient-to-b from-white/[0.08] to-transparent p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl flex flex-col"
            >
              {panelContent}
            </motion.div>
          )
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="absolute top-5 left-0 right-0 flex flex-col items-center sm:items-start sm:left-8 sm:right-auto sm:top-8 w-full sm:w-fit">
        <h1 style={{ fontFamily: "'Anton', sans-serif" }} className="text-[1.4rem] tracking-[0.08em] leading-none text-white sm:text-[2.2rem]">
          THE MONOLITH
        </h1>
        <p className="font-mono text-[8px] text-white/50 mt-1 tracking-[0.32em] uppercase whitespace-nowrap sm:text-[11.5px] sm:mt-1.5">A Sci-Fi book library</p>
      </div>
    </div>
  );
}
