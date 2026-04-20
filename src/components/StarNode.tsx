import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Book } from '../data/books';

interface StarNodeProps {
  book: Book;
  onHover: (book: Book | null) => void;
  onClick: (book: Book) => void;
  isActive: boolean;
}

// Shared texture for all stars to avoid creating multiple canvases
const glowTexture = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.1, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.2)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
})();

export function StarNode({ book, onHover, onClick, isActive }: StarNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (groupRef.current) {
      // Slower, gentler floating animation
      const time = state.clock.getElapsedTime();
      const offset = Math.sin(time * 0.5 + parseInt(book.id)) * 0.05;
      groupRef.current.position.y = book.position[1] + offset;
    }
    
    if (glowRef.current && coreRef.current) {
      const time = state.clock.getElapsedTime();
      // Twinkle effect
      const twinkle = Math.sin(time * 2 + parseInt(book.id)) * 0.5 + 0.5;
      
      if (hovered || isActive) {
        const scale = book.size * 2.2 + Math.sin(time * 4) * 0.15;
        glowRef.current.scale.set(scale, scale, 1);
        glowRef.current.material.opacity = 0.6;
        coreRef.current.scale.setScalar(1.5);
      } else {
        const baseScale = book.size * 1.3;
        const scale = baseScale + twinkle * 0.2;
        glowRef.current.scale.set(scale, scale, 1);
        glowRef.current.material.opacity = 0.35 + twinkle * 0.25;
        coreRef.current.scale.setScalar(1);
      }
    }
  });

  return (
    <group ref={groupRef} position={book.position}>
      {/* Invisible Hitbox for easier interaction */}
      <mesh
        visible={false}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover(book);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          onHover(null);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(book);
        }}
      >
        <sphereGeometry args={[book.size * 0.5, 16, 16]} />
        <meshBasicMaterial />
      </mesh>

      {/* Bright Core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[book.size * 0.036, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      {/* Soft Glow */}
      <sprite ref={glowRef}>
        <spriteMaterial
          map={glowTexture}
          color={book.color}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
    </group>
  );
}
