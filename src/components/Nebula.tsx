import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const createParticleTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
};

const createCloudTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  // Very soft gradient for smooth, continuous clouds
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.15, 'rgba(255,255,255,0.5)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.15)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.02)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
};

export function Nebula() {
  const starsRef = useRef<THREE.Points>(null);
  const nebulaRef = useRef<THREE.Points>(null);
  const auroraRef = useRef<THREE.Points>(null);

  const particleTexture = useMemo(() => createParticleTexture(), []);
  const cloudTexture = useMemo(() => createCloudTexture(), []);

  const { starPositions, starColors, nebulaPositions, nebulaColors, auroraPositions, auroraColors } = useMemo(() => {
    const color = new THREE.Color();

    // 1. Dense Starfield (Milky Way + Background)
    const sPos = [];
    const sCol = [];
    for (let i = 0; i < 5000; i++) {
      // 50% of stars form a dense diagonal band (Milky Way)
      const isBand = Math.random() > 0.5;
      let x, y, z;
      
      if (isBand) {
        const t = (Math.random() - 0.5) * 80; // length of band
        const spread = Math.random() * 12;
        const angle = Math.random() * Math.PI * 2;
        x = t + Math.cos(angle) * spread;
        y = t * 0.4 + Math.sin(angle) * spread; // tilted band
        z = (Math.random() - 0.5) * 30;
      } else {
        // spherical distribution
        const r = 15 + Math.random() * 40;
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
      }

      sPos.push(x, y, z);

      const mix = Math.random();
      if (mix > 0.8) color.set('#ffffff');
      else if (mix > 0.6) color.set('#aabfff');
      else if (mix > 0.4) color.set('#fff4ea');
      else color.set('#ffcc6f');
      
      color.multiplyScalar(isBand ? (Math.random() * 0.8 + 0.2) : (Math.random() * 0.4 + 0.1));
      sCol.push(color.r, color.g, color.b);
    }

    // 2. Pink/Purple Nebula Clouds
    const nPos = [];
    const nCol = [];
    for (let i = 0; i < 600; i++) {
      const t = Math.random() * Math.PI * 2;
      const r = 10 + Math.random() * 25;
      const x = Math.cos(t) * r + (Math.random() - 0.5) * 20;
      const y = Math.sin(t) * r * 0.4 + (Math.random() - 0.5) * 15;
      const z = Math.sin(t) * r + (Math.random() - 0.5) * 20;

      nPos.push(x, y, z);

      const mix = Math.random();
      if (mix > 0.7) color.set('#ff1493'); // DeepPink
      else if (mix > 0.4) color.set('#8a2be2'); // BlueViolet
      else if (mix > 0.2) color.set('#ff69b4'); // HotPink
      else color.set('#4b0082'); // Indigo

      nCol.push(color.r, color.g, color.b);
    }

    // 3. Green Aurora Lights
    const aPos = [];
    const aCol = [];
    for (let i = 0; i < 400; i++) {
      // Wavy curtain effect
      const x = (Math.random() - 0.5) * 70;
      const y = -8 + Math.sin(x * 0.15) * 6 + (Math.random() - 0.5) * 10;
      const z = -20 + Math.cos(x * 0.1) * 8 + (Math.random() - 0.5) * 15;

      aPos.push(x, y, z);

      const mix = Math.random();
      if (mix > 0.6) color.set('#00ff7f'); // SpringGreen
      else if (mix > 0.3) color.set('#00ced1'); // DarkTurquoise
      else color.set('#32cd32'); // LimeGreen

      aCol.push(color.r, color.g, color.b);
    }

    return { 
      starPositions: new Float32Array(sPos), 
      starColors: new Float32Array(sCol),
      nebulaPositions: new Float32Array(nPos),
      nebulaColors: new Float32Array(nCol),
      auroraPositions: new Float32Array(aPos),
      auroraColors: new Float32Array(aCol)
    };
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (starsRef.current) {
      starsRef.current.rotation.y = time * 0.003;
    }
    if (nebulaRef.current) {
      nebulaRef.current.rotation.y = time * 0.005;
      nebulaRef.current.rotation.z = Math.sin(time * 0.02) * 0.05;
    }
    if (auroraRef.current) {
      auroraRef.current.rotation.y = time * 0.007;
      // Undulating aurora effect
      auroraRef.current.position.y = Math.sin(time * 0.1) * 1.5;
      auroraRef.current.scale.y = 1 + Math.sin(time * 0.2) * 0.3;
    }
  });

  return (
    <group>
      {/* Distant Stars & Milky Way */}
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={starPositions.length / 3} array={starPositions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={starColors.length / 3} array={starColors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.3} map={particleTexture} vertexColors transparent opacity={0.9} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>

      {/* Pink/Purple Nebula Clouds */}
      <points ref={nebulaRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={nebulaPositions.length / 3} array={nebulaPositions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={nebulaColors.length / 3} array={nebulaColors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={22} map={cloudTexture} vertexColors transparent opacity={0.06} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>

      {/* Green Aurora */}
      <points ref={auroraRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={auroraPositions.length / 3} array={auroraPositions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={auroraColors.length / 3} array={auroraColors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={18} map={cloudTexture} vertexColors transparent opacity={0.08} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}
