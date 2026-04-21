import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { InstancedStars } from './InstancedStars';
import { Connections } from './Connections';
import { Nebula } from './Nebula';
import { Book } from '../data/books';

interface GalaxyProps {
  books: Book[];
  onHoverBook: (book: Book | null) => void;
  onClickBook: (book: Book) => void;
  activeBook: Book | null;
}

// Reusable vector to avoid per-frame allocations
const _targetPos = new THREE.Vector3();
const _cameraTarget = new THREE.Vector3();
const _offsetTarget = new THREE.Vector3();

// Desktop: shift right so star sits left of the side panel
const DESKTOP_OFFSET_X = 3.0;
// Mobile: shift target down so star centres in the visible area above the bottom panel (44vh)
const MOBILE_OFFSET_Y = -2.0;

export function Galaxy({ books, onHoverBook, onClickBook, activeBook }: GalaxyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);
  const { pointer, camera } = useThree();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Camera fly-to state
  const flyTo = useRef<{ target: THREE.Vector3; active: boolean }>({
    target: new THREE.Vector3(),
    active: false,
  });

  // When activeBook changes, compute world position and start fly-to
  useEffect(() => {
    if (activeBook && groupRef.current) {
      // Get the book's local position
      _targetPos.set(activeBook.position[0], activeBook.position[1], activeBook.position[2]);
      // Transform to world space (accounting for group rotation)
      groupRef.current.localToWorld(_targetPos);
      flyTo.current.target.copy(_targetPos);
      flyTo.current.active = true;
    } else {
      flyTo.current.active = false;
    }
  }, [activeBook]);

  useFrame((state) => {
    // Subtle parallax drift
    if (groupRef.current) {
      const targetX = (pointer.y * Math.PI) / 40;
      const targetY = (pointer.x * Math.PI) / 40;

      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, 0.02);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY + state.clock.getElapsedTime() * 0.02, 0.02);
    }

    // Smooth camera fly-to animation
    if (flyTo.current.active && controlsRef.current) {
      const controls = controlsRef.current;
      const target = flyTo.current.target;

      // Lerp OrbitControls target toward the star with panel-aware offset
      _offsetTarget.copy(target);
      if (isMobile) {
        _offsetTarget.y += MOBILE_OFFSET_Y; // centre in visible area above bottom panel
      } else {
        _offsetTarget.x += DESKTOP_OFFSET_X; // left of right-side panel
      }
      controls.target.lerp(_offsetTarget, 0.025);

      // Move camera toward a position offset from the star (so we see it, not sit on it)
      _cameraTarget.copy(target);
      // Offset camera with a slight arc — not straight-on, adds a gentle rotation feel
      const t = state.clock.getElapsedTime();
      _cameraTarget.x += Math.sin(t * 0.3) * 1.5;
      _cameraTarget.y += Math.cos(t * 0.3) * 0.8;
      _cameraTarget.z += 8;
      camera.position.lerp(_cameraTarget, 0.025);

      controls.update();

      // Stop animating once close enough
      if (controls.target.distanceTo(_offsetTarget) < 0.05) {
        flyTo.current.active = false;
      }
    }
  });

  return (
    <>
      <color attach="background" args={['#020205']} />
      <ambientLight intensity={0.1} />

      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={false}
        maxDistance={80}
        minDistance={2}
        zoomSpeed={0.5}
        rotateSpeed={0.5}
      />

      <group ref={groupRef}>
        <Nebula />
        <Connections books={books} activeBook={activeBook} />
        <InstancedStars
          books={books}
          onHover={onHoverBook}
          onClick={onClickBook}
          activeBookId={activeBook?.id ?? null}
        />
      </group>
    </>
  );
}
