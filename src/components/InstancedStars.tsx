import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Book } from '../data/books';

// Shared glow texture (same as old StarNode)
const glowTexture = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.1, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.2)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
})();

interface InstancedStarsProps {
  books: Book[];
  onHover: (book: Book | null) => void;
  onClick: (book: Book) => void;
  activeBookId: string | null;
}

export function InstancedStars({ books, onHover, onClick, activeBookId }: InstancedStarsProps) {
  const count = books.length;

  const coreRef = useRef<THREE.InstancedMesh>(null);
  const hitboxRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.Points>(null);

  // Refs for interaction state (avoid React re-renders)
  const hoveredIdx = useRef<number | null>(null);
  const activeIdx = useRef<number | null>(null);
  const prevActiveIdx = useRef<number | null>(null);

  // Shared geometries
  const SIZE_SCALE = 0.8; // 20% smaller stars
  const coreGeo = useMemo(() => new THREE.SphereGeometry(0.036 * SIZE_SCALE, 8, 8), []);
  const hitboxGeo = useMemo(() => new THREE.SphereGeometry(0.5, 8, 8), []); // hitbox stays same for easy clicking

  // Pre-compute base positions, colors, sizes as typed arrays
  const { basePositions, baseSizes, bookIds } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const ids = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const b = books[i];
      pos[i * 3] = b.position[0];
      pos[i * 3 + 1] = b.position[1];
      pos[i * 3 + 2] = b.position[2];
      sizes[i] = b.size;
      ids[i] = i;
    }
    return { basePositions: pos, baseSizes: sizes, bookIds: ids };
  }, [books, count]);

  // Glow points geometry
  const { glowPositions, glowColors, glowSizes } = useMemo(() => {
    const gPos = new Float32Array(count * 3);
    const gCol = new Float32Array(count * 3);
    const gSz = new Float32Array(count);
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const b = books[i];
      gPos[i * 3] = b.position[0];
      gPos[i * 3 + 1] = b.position[1];
      gPos[i * 3 + 2] = b.position[2];
      color.set(b.color);
      gCol[i * 3] = color.r;
      gCol[i * 3 + 1] = color.g;
      gCol[i * 3 + 2] = color.b;
      gSz[i] = b.size * 1.3 * SIZE_SCALE;
    }
    return { glowPositions: gPos, glowColors: gCol, glowSizes: gSz };
  }, [books, count]);

  // Initialize instance matrices and colors on mount
  useEffect(() => {
    if (!coreRef.current || !hitboxRef.current) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const b = books[i];
      // Core instances
      dummy.position.set(b.position[0], b.position[1], b.position[2]);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      coreRef.current.setMatrixAt(i, dummy.matrix);
      color.set('#ffffff');
      coreRef.current.setColorAt(i, color);

      // Hitbox instances (larger, for click detection)
      dummy.scale.setScalar(b.size);
      dummy.updateMatrix();
      hitboxRef.current.setMatrixAt(i, dummy.matrix);
    }
    coreRef.current.instanceMatrix.needsUpdate = true;
    if (coreRef.current.instanceColor) coreRef.current.instanceColor.needsUpdate = true;
    hitboxRef.current.instanceMatrix.needsUpdate = true;
  }, [books, count]);

  // Sync activeIdx ref when prop changes
  useEffect(() => {
    if (activeBookId === null) {
      activeIdx.current = null;
    } else {
      const idx = books.findIndex(b => b.id === activeBookId);
      activeIdx.current = idx >= 0 ? idx : null;
    }
  }, [activeBookId, books]);

  // Single useFrame for ALL animation
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (!coreRef.current || !glowRef.current) return;

    const glowPosAttr = glowRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const glowSizeAttr = glowRef.current.geometry.getAttribute('size') as THREE.BufferAttribute;

    // Update glow positions (floating Y) and sizes (twinkle) in bulk
    for (let i = 0; i < count; i++) {
      const yOffset = Math.sin(time * 0.5 + i) * 0.05;
      glowPosAttr.setY(i, basePositions[i * 3 + 1] + yOffset);

      const twinkle = Math.sin(time * 2 + i) * 0.5 + 0.5;
      let sz = (baseSizes[i] * 1.3 + twinkle * 0.2) * SIZE_SCALE;

      // Scale up hovered/active star
      if (i === hoveredIdx.current || i === activeIdx.current) {
        sz = (baseSizes[i] * 2.2 + Math.sin(time * 4) * 0.15) * SIZE_SCALE;
      }
      glowSizeAttr.setX(i, sz);
    }
    glowPosAttr.needsUpdate = true;
    glowSizeAttr.needsUpdate = true;

    // Update core matrices only for hovered/active changes
    const currentActive = activeIdx.current;
    const currentHovered = hoveredIdx.current;
    const prevActive = prevActiveIdx.current;

    // Reset previous active/hovered if changed
    if (prevActive !== null && prevActive !== currentActive && prevActive !== currentHovered) {
      const b = books[prevActive];
      dummy.position.set(b.position[0], b.position[1] + Math.sin(time * 0.5 + prevActive) * 0.05, b.position[2]);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      coreRef.current.setMatrixAt(prevActive, dummy.matrix);
    }

    // Update active star core
    if (currentActive !== null) {
      const b = books[currentActive];
      dummy.position.set(b.position[0], b.position[1] + Math.sin(time * 0.5 + currentActive) * 0.05, b.position[2]);
      dummy.scale.setScalar(1.5);
      dummy.updateMatrix();
      coreRef.current.setMatrixAt(currentActive, dummy.matrix);
    }

    // Update hovered star core
    if (currentHovered !== null && currentHovered !== currentActive) {
      const b = books[currentHovered];
      dummy.position.set(b.position[0], b.position[1] + Math.sin(time * 0.5 + currentHovered) * 0.05, b.position[2]);
      dummy.scale.setScalar(1.5);
      dummy.updateMatrix();
      coreRef.current.setMatrixAt(currentHovered, dummy.matrix);
    }

    coreRef.current.instanceMatrix.needsUpdate = true;
    prevActiveIdx.current = currentActive;
  });

  return (
    <group>
      {/* Star cores — InstancedMesh, 1 draw call */}
      <instancedMesh ref={coreRef} args={[coreGeo, undefined, count]}>
        <meshBasicMaterial color="#ffffff" />
      </instancedMesh>

      {/* Glow — Points with shared texture, 1 draw call */}
      <points ref={glowRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={glowPositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={count}
            array={glowColors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={count}
            array={glowSizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          map={glowTexture}
          vertexColors
          transparent
          opacity={0.6}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Hitbox — invisible InstancedMesh for raycasting */}
      <instancedMesh
        ref={hitboxRef}
        args={[hitboxGeo, undefined, count]}
        visible={false}
        onPointerOver={(e) => {
          e.stopPropagation();
          const idx = e.instanceId;
          if (idx !== undefined) {
            hoveredIdx.current = idx;
            onHover(books[idx]);
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          hoveredIdx.current = null;
          onHover(null);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          const idx = e.instanceId;
          if (idx !== undefined) {
            onClick(books[idx]);
          }
        }}
      >
        <meshBasicMaterial />
      </instancedMesh>
    </group>
  );
}
