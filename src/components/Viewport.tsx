'use client';

import type * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { MathUtils } from 'three';
import type { Group } from 'three';
import type { Part } from '../lib/geometry/box';
import type { FilamentId, ZoneId } from '../lib/config';
import { FILAMENTS, type Filament } from '../lib/filaments';
import { meshToGeometry } from '../lib/meshToGeometry';

const BOX_WIDTH = 78;
const BOX_HEIGHT = 104;
const CAP_LIFT_MM = 45;
const CAP_DAMP_LAMBDA = 10;

export interface ViewportProps {
  parts: Part[];
  filaments: Record<ZoneId, FilamentId>;
  depthMm: number;
  selectedZone?: ZoneId | null;
}

interface PartMeshProps {
  part: Part;
  filament: Filament;
  highlighted: boolean;
}

function PartMesh({ part, filament, highlighted }: PartMeshProps): React.JSX.Element {
  const geometry = useMemo(() => meshToGeometry(part.manifold), [part.manifold]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  const { hex, pbr } = filament;

  return (
    <mesh geometry={geometry}>
      <meshPhysicalMaterial
        color={hex}
        roughness={pbr.roughness}
        metalness={pbr.metalness}
        clearcoat={pbr.clearcoat ?? 0}
        sheen={pbr.sheen ?? 0}
        sheenColor="#ffffff"
        sheenRoughness={0.65}
        emissive={highlighted ? hex : '#000000'}
        emissiveIntensity={highlighted ? 0.15 : 0}
      />
    </mesh>
  );
}

interface DeckBoxSceneProps extends ViewportProps {
  capOpen: boolean;
}

function DeckBoxScene({
  parts,
  filaments,
  depthMm,
  selectedZone,
  capOpen,
}: DeckBoxSceneProps): React.JSX.Element {
  const capLiftRef = useRef<Group>(null);
  const liftMmRef = useRef(0);

  useFrame((_, delta) => {
    const group = capLiftRef.current;
    if (!group) return;

    const target = capOpen ? CAP_LIFT_MM : 0;
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion || Math.abs(target - liftMmRef.current) < 0.01) {
      liftMmRef.current = target;
    } else {
      liftMmRef.current = MathUtils.damp(
        liftMmRef.current,
        target,
        CAP_DAMP_LAMBDA,
        Math.min(delta, 0.1),
      );
    }

    group.position.z = liftMmRef.current;
  });

  const bodyParts = parts.filter((part) => part.object === 'body');
  const capParts = parts.filter((part) => part.object === 'cap');

  return (
    <>
      <Environment resolution={256}>
        <Lightformer
          form="rect"
          intensity={2.4}
          color="#fffdf8"
          position={[4, 5, 4]}
          scale={[6, 6, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.1}
          color="#eef2f6"
          position={[-5, 2, 3]}
          scale={[6, 4, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={2.8}
          color="#ffffff"
          position={[-3, 4, -5]}
          scale={[5, 3, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.2}
          color="#ffffff"
          position={[0, 6, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[6, 6, 1]}
        />
        <Lightformer
          form="rect"
          intensity={0.35}
          color="#d9d8d3"
          position={[0, -4, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[8, 8, 1]}
        />
      </Environment>

      <directionalLight position={[160, 220, 180]} intensity={0.75} color="#fffcf5" />

      <group rotation={[-Math.PI / 2, 0, 0]}>
        <group position={[-BOX_WIDTH / 2, -depthMm / 2, -BOX_HEIGHT / 2]}>
          {bodyParts.map((part) => (
            <PartMesh
              key={part.id}
              part={part}
              filament={FILAMENTS[filaments[part.zone]]}
              highlighted={selectedZone === part.zone}
            />
          ))}
          <group position={[0, depthMm, BOX_HEIGHT]}>
            <group ref={capLiftRef}>
              <group rotation={[Math.PI, 0, 0]}>
                {capParts.map((part) => (
                  <PartMesh
                    key={part.id}
                    part={part}
                    filament={FILAMENTS[filaments[part.zone]]}
                    highlighted={selectedZone === part.zone}
                  />
                ))}
              </group>
            </group>
          </group>
        </group>
      </group>

      <ContactShadows
        position={[0, -BOX_HEIGHT / 2 - 0.2, 0]}
        opacity={0.36}
        scale={240}
        blur={2.2}
        far={120}
        resolution={256}
        color="#1b1c1e"
      />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={180}
        maxDistance={600}
        target={[0, 0, 0]}
      />
    </>
  );
}

export default function Viewport({
  parts,
  filaments,
  depthMm,
  selectedZone,
}: ViewportProps): React.JSX.Element {
  const [capOpen, setCapOpen] = useState(false);
  const [focusVisible, setFocusVisible] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        role="img"
        aria-label="Modello 3D della deck box"
        style={{ width: '100%', height: '100%' }}
      >
        <Canvas
          camera={{ fov: 30, position: [180, 125, 240], near: 1, far: 2000 }}
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 2]}
          style={{ width: '100%', height: '100%' }}
        >
          <DeckBoxScene
            parts={parts}
            filaments={filaments}
            depthMm={depthMm}
            selectedZone={selectedZone}
            capOpen={capOpen}
          />
        </Canvas>
      </div>

      <button
        type="button"
        aria-pressed={capOpen}
        onClick={() => setCapOpen((open) => !open)}
        onFocus={(event) => {
          try {
            setFocusVisible(event.currentTarget.matches(':focus-visible'));
          } catch {
            setFocusVisible(true);
          }
        }}
        onBlur={() => setFocusVisible(false)}
        style={{
          position: 'absolute',
          left: 'var(--space-4, 1rem)',
          bottom: 'var(--space-4, 1rem)',
          padding: 'var(--space-2, 0.5rem) var(--space-3, 0.75rem)',
          backgroundColor: 'var(--stock)',
          color: 'var(--ink)',
          border: '1px solid var(--control-edge)',
          borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          lineHeight: 1.2,
          cursor: 'pointer',
          boxShadow: 'var(--shadow-label)',
          outline: focusVisible ? '2px solid var(--focus)' : 'none',
          outlineOffset: '2px',
        }}
      >
        {capOpen ? 'Chiudi coperchio' : 'Apri coperchio'}
      </button>
    </div>
  );
}
