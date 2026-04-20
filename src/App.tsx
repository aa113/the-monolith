/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Galaxy } from './components/Galaxy';
import { UIOverlay } from './components/UIOverlay';
import { books, Book } from './data/books';

export default function App() {
  const [hoveredBook, setHoveredBook] = useState<Book | null>(null);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const handleClosePanel = useCallback(() => setActiveBook(null), []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <Canvas camera={{ position: [0, 0, 45], fov: 60 }}>
        <Suspense fallback={null}>
          <Galaxy
            books={books}
            onHoverBook={setHoveredBook}
            onClickBook={setActiveBook}
            activeBook={activeBook}
          />
        </Suspense>
      </Canvas>

      <UIOverlay
        books={books}
        hoveredBook={hoveredBook}
        activeBook={activeBook}
        onClosePanel={handleClosePanel}
        onSelectBook={setActiveBook}
      />
    </div>
  );
}
