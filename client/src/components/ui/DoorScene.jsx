import { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const DW  = 3.0;
const DH  = 5.6;
const DD  = 0.14;
const CLR = '#0c1522';
const TRM = '#17253a';

function LeftDoor({ opening, onThreshold }) {
  const pivot = useRef();
  const fired = useRef(false);
  const TARGET = Math.PI * 0.82;

  useFrame((_, dt) => {
    if (!pivot.current || !opening) return;
    pivot.current.rotation.y = THREE.MathUtils.lerp(
      pivot.current.rotation.y, TARGET, dt * 1.7
    );
    if (!fired.current && pivot.current.rotation.y > TARGET * 0.76) {
      fired.current = true;
      onThreshold();
    }
  });

  return (
    <group ref={pivot} position={[-DW, 0, 0]}>
      <mesh position={[DW / 2, 0, 0]}>
        <boxGeometry args={[DW, DH, DD]} />
        <meshStandardMaterial color={CLR} roughness={0.55} metalness={0.2} />
      </mesh>
      <mesh position={[DW / 2, 0, DD / 2 + 0.005]}>
        <boxGeometry args={[DW - 0.45, DH - 0.55, 0.012]} />
        <meshStandardMaterial color="#08101c" roughness={0.9} />
      </mesh>
      {[DH / 2 - 0.05, -(DH / 2 - 0.05)].map((y, i) => (
        <mesh key={i} position={[DW / 2, y, DD / 2 + 0.012]}>
          <boxGeometry args={[DW - 0.06, 0.045, 0.01]} />
          <meshStandardMaterial color="#38a1ff" emissive="#38a1ff" emissiveIntensity={0.8} />
        </mesh>
      ))}
      <mesh position={[DW - 0.24, 0.05, DD / 2 + 0.06]}>
        <sphereGeometry args={[0.072, 24, 24]} />
        <meshStandardMaterial color="#38a1ff" metalness={0.9} roughness={0.08} emissive="#38a1ff" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

function RightDoor({ opening }) {
  const pivot = useRef();
  const TARGET = -Math.PI * 0.82;

  useFrame((_, dt) => {
    if (!pivot.current || !opening) return;
    pivot.current.rotation.y = THREE.MathUtils.lerp(
      pivot.current.rotation.y, TARGET, dt * 1.7
    );
  });

  return (
    <group ref={pivot} position={[DW, 0, 0]}>
      <mesh position={[-DW / 2, 0, 0]}>
        <boxGeometry args={[DW, DH, DD]} />
        <meshStandardMaterial color={CLR} roughness={0.55} metalness={0.2} />
      </mesh>
      <mesh position={[-DW / 2, 0, DD / 2 + 0.005]}>
        <boxGeometry args={[DW - 0.45, DH - 0.55, 0.012]} />
        <meshStandardMaterial color="#08101c" roughness={0.9} />
      </mesh>
      {[DH / 2 - 0.05, -(DH / 2 - 0.05)].map((y, i) => (
        <mesh key={i} position={[-DW / 2, y, DD / 2 + 0.012]}>
          <boxGeometry args={[DW - 0.06, 0.045, 0.01]} />
          <meshStandardMaterial color="#38a1ff" emissive="#38a1ff" emissiveIntensity={0.8} />
        </mesh>
      ))}
      <mesh position={[-(DW - 0.24), 0.05, DD / 2 + 0.06]}>
        <sphereGeometry args={[0.072, 24, 24]} />
        <meshStandardMaterial color="#38a1ff" metalness={0.9} roughness={0.08} emissive="#38a1ff" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

function Frame() {
  return (
    <group>
      {[[-DW - 0.1, 0], [DW + 0.1, 0]].map(([x], i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <boxGeometry args={[0.2, DH + 0.28, 0.35]} />
          <meshStandardMaterial color={TRM} roughness={0.75} />
        </mesh>
      ))}
      <mesh position={[0, DH / 2 + 0.1, 0]}>
        <boxGeometry args={[DW * 2 + 0.44, 0.22, 0.35]} />
        <meshStandardMaterial color={TRM} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0, DD / 2 + 0.002]}>
        <boxGeometry args={[0.028, DH, 0.008]} />
        <meshStandardMaterial color="#38a1ff" emissive="#38a1ff" emissiveIntensity={2.2} />
      </mesh>
    </group>
  );
}

function Room() {
  return (
    <>
      <mesh position={[0, 0, -2.5]}>
        <planeGeometry args={[24, 14]} />
        <meshStandardMaterial color="#09111d" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -(DH / 2 + 0.12), 0]}>
        <planeGeometry args={[24, 14]} />
        <meshStandardMaterial color="#0b141f" roughness={1} />
      </mesh>
    </>
  );
}

function BloomLight({ opening }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (!ref.current || !opening) return;
    ref.current.intensity = THREE.MathUtils.lerp(ref.current.intensity, 14, dt * 1.4);
  });
  return <pointLight ref={ref} position={[0, 0, -0.8]} color="#38a1ff" intensity={0} decay={1.8} />;
}

export default function DoorScene({ onNavigate }) {
  const [opening, setOpening] = useState(false);
  const handleThreshold = useCallback(() => {
    setTimeout(onNavigate, 180);
  }, [onNavigate]);

  useEffect(() => {
    const t = setTimeout(() => setOpening(true), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, 7.2], fov: 54 }}
      style={{ position: 'fixed', inset: 0, zIndex: 50 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#1c2132']} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[2, 5, 6]} intensity={0.85} />
      <BloomLight opening={opening} />
      <Room />
      <Frame />
      <LeftDoor opening={opening} onThreshold={handleThreshold} />
      <RightDoor opening={opening} />
    </Canvas>
  );
}
