import { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Book } from '../data/books';

interface ConnectionsProps {
  books: Book[];
  activeBook: Book | null;
}

// Pre-allocated colors to avoid per-frame allocation
const DIM_COLOR = new THREE.Color('#1e2d4a');
const WHITE_COLOR = new THREE.Color('#ffffff');
const _tempColor = new THREE.Color();

export function Connections({ books, activeBook }: ConnectionsProps) {
  const linesRef = useRef<THREE.LineSegments>(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Pre-build a lookup map for O(1) access
  const bookMap = useMemo(() => {
    const map = new Map<string, Book>();
    books.forEach(b => map.set(b.id, b));
    return map;
  }, [books]);

  // Deduplicate connections, build geometry + segment metadata
  const { positions, colors, segments } = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const segs: { sourceId: string; targetId: string; sourceColor: string }[] = [];
    const seen = new Set<string>();

    books.forEach(book => {
      book.connections.forEach(targetId => {
        const key = book.id < targetId ? `${book.id}-${targetId}` : `${targetId}-${book.id}`;
        if (seen.has(key)) return;
        seen.add(key);

        const target = bookMap.get(targetId);
        if (target) {
          pos.push(...book.position, ...target.position);
          col.push(DIM_COLOR.r, DIM_COLOR.g, DIM_COLOR.b);
          col.push(DIM_COLOR.r, DIM_COLOR.g, DIM_COLOR.b);
          segs.push({ sourceId: book.id, targetId, sourceColor: book.color });
        }
      });
    });

    return {
      positions: new Float32Array(pos),
      colors: new Float32Array(col),
      segments: segs,
    };
  }, [books, bookMap]);

  // Track which segment indices are currently highlighted
  const prevActiveIndices = useRef<number[]>([]);
  const prevActiveId = useRef<string | null>(null);

  useFrame((state) => {
    if (!linesRef.current) return;
    const colorAttr = linesRef.current.geometry.getAttribute('color') as THREE.BufferAttribute;

    const currentId = activeBook?.id ?? null;

    // When active book changes, compute new active indices and reset old ones
    if (currentId !== prevActiveId.current) {
      // Reset previous active edges to dim
      for (const idx of prevActiveIndices.current) {
        const vi = idx * 2;
        colorAttr.setXYZ(vi, DIM_COLOR.r, DIM_COLOR.g, DIM_COLOR.b);
        colorAttr.setXYZ(vi + 1, DIM_COLOR.r, DIM_COLOR.g, DIM_COLOR.b);
      }

      // Compute new active indices
      if (currentId !== null) {
        const newIndices: number[] = [];
        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          if (seg.sourceId === currentId || seg.targetId === currentId) {
            newIndices.push(i);
          }
        }
        prevActiveIndices.current = newIndices;
      } else {
        prevActiveIndices.current = [];
      }
      prevActiveId.current = currentId;
      colorAttr.needsUpdate = true;
    }

    // Animate only the active subset (pulse effect)
    if (prevActiveIndices.current.length > 0) {
      const time = state.clock.getElapsedTime();
      const pulse = (Math.sin(time * 3) + 1) / 2;

      for (const idx of prevActiveIndices.current) {
        const seg = segments[idx];
        _tempColor.set(seg.sourceColor).lerp(WHITE_COLOR, pulse * 0.3);
        const vi = idx * 2;
        colorAttr.setXYZ(vi, _tempColor.r, _tempColor.g, _tempColor.b);
        colorAttr.setXYZ(vi + 1, _tempColor.r, _tempColor.g, _tempColor.b);
      }
      colorAttr.needsUpdate = true;
    }
  });

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={isMobile ? 0.08 : 0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}
