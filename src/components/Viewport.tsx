'use client';

import type * as React from 'react';
import { type ComponentRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Html, Lightformer, OrbitControls } from '@react-three/drei';
import { MathUtils } from 'three';
import type { Group } from 'three';
import type { Part } from '../lib/geometry/box';
import { plateOffsets, type Vec3 } from '../lib/geometry/plate';
import { DIMENSIONS, ZONE_IDS, type FilamentId, type ZoneId } from '../lib/config';
import { FILAMENTS, type Filament } from '../lib/filaments';
import { meshToGeometry } from '../lib/meshToGeometry';
import { PlatePlane } from './PlateView';
import styles from './Configurator.module.css';

const BOX_WIDTH = DIMENSIONS.width;
const BOX_HEIGHT = DIMENSIONS.height;
const PLATE_HALF_X = DIMENSIONS.plate.x / 2;
const PLATE_HALF_Y = DIMENSIONS.plate.y / 2;
const CAP_LIFT_MM = 45;
const CAP_DAMP_LAMBDA = 10;
const VIEW_DAMP_LAMBDA = 10;
const ASSEMBLED_CAMERA_POS: Vec3 = [180, 125, 240];
const PLATE_CAMERA_POS: Vec3 = [114, 385, 244];

export interface ViewportProps {
  parts: Part[];
  filaments: Record<ZoneId, FilamentId>;
  depthMm: number;
  selectedZone?: ZoneId | null;
  view?: 'assembled' | 'plate';
  labels?: { model: string; openCap: string; closeCap: string };
}

interface PartMeshProps {
  part: Part;
  filament: Filament;
  highlighted: boolean;
  showCallout: boolean;
}

function PartMesh({ part, filament, highlighted, showCallout }: PartMeshProps): React.JSX.Element {
  const geometry = useMemo(() => meshToGeometry(part.manifold), [part.manifold]);
  const calloutPosition = useMemo<Vec3>(() => {
    const { min, max } = part.manifold.boundingBox();
    return [(min[0] + max[0]) / 2, min[1] - 1, (min[2] + max[2]) / 2];
  }, [part.manifold]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  const { hex, pbr } = filament;

  return (
    <>
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
          emissiveIntensity={highlighted ? 0.3 : 0}
        />
      </mesh>
      {showCallout && (
        <Html position={calloutPosition} center zIndexRange={[10, 0]}>
          <span className={styles.modelCallout} aria-hidden="true">
            {ZONE_IDS.indexOf(part.zone) + 1}
          </span>
        </Html>
      )}
    </>
  );
}

interface DeckBoxSceneProps extends ViewportProps {
  view: 'assembled' | 'plate';
  capOpen: boolean;
}

function applyObjectTransforms(
  bodyGroup: Group | null,
  capGroup: Group | null,
  t: number,
  liftMm: number,
  depthMm: number,
  bodyOffset: Vec3,
  capOffset: Vec3,
  centerShiftX: number,
  centerShiftY: number,
): void {
  if (bodyGroup) {
    const plateX = bodyOffset[0] + centerShiftX - PLATE_HALF_X;
    const plateY = bodyOffset[1] + centerShiftY - PLATE_HALF_Y;
    const plateZ = bodyOffset[2];
    bodyGroup.position.set(
      MathUtils.lerp(-BOX_WIDTH / 2, plateX, t),
      MathUtils.lerp(-depthMm / 2, plateY, t),
      MathUtils.lerp(-BOX_HEIGHT / 2, plateZ, t),
    );
  }

  if (capGroup) {
    const plateX = capOffset[0] + centerShiftX - PLATE_HALF_X;
    const plateY = capOffset[1] + centerShiftY - PLATE_HALF_Y;
    const plateZ = capOffset[2];
    capGroup.position.set(
      MathUtils.lerp(-BOX_WIDTH / 2, plateX, t),
      MathUtils.lerp(depthMm / 2, plateY, t),
      MathUtils.lerp(BOX_HEIGHT / 2 + liftMm, plateZ, t),
    );
    capGroup.rotation.set(MathUtils.lerp(Math.PI, 0, t), 0, 0);
  }
}

function DeckBoxScene({
  parts,
  filaments,
  depthMm,
  selectedZone,
  view,
  capOpen,
}: DeckBoxSceneProps): React.JSX.Element {
  const bodyGroupRef = useRef<Group>(null);
  const capGroupRef = useRef<Group>(null);
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const liftMmRef = useRef(0);
  const viewTRef = useRef(view === 'plate' ? 1 : 0);
  const prevViewRef = useRef(view);
  const cameraTransitionRef = useRef(false);

  const { bodyOffset, capOffset, centerShiftX, centerShiftY } = useMemo(() => {
    const { offsets, footprint } = plateOffsets(parts);
    const zero: Vec3 = [0, 0, 0];
    return {
      bodyOffset: offsets.body ?? zero,
      capOffset: offsets.cap ?? zero,
      centerShiftX: (DIMENSIONS.plate.x - footprint.x) / 2,
      centerShiftY: (DIMENSIONS.plate.y - footprint.y) / 2,
    };
  }, [parts]);

  useEffect(() => {
    if (prevViewRef.current !== view) {
      prevViewRef.current = view;
      cameraTransitionRef.current = true;
    }
  }, [view]);

  useLayoutEffect(() => {
    applyObjectTransforms(
      bodyGroupRef.current,
      capGroupRef.current,
      viewTRef.current,
      liftMmRef.current,
      depthMm,
      bodyOffset,
      capOffset,
      centerShiftX,
      centerShiftY,
    );
  }, [depthMm, bodyOffset, capOffset, centerShiftX, centerShiftY]);

  useFrame(({ camera }, delta) => {
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dt = Math.min(delta, 0.1);

    const targetLift = capOpen ? CAP_LIFT_MM : 0;
    if (reducedMotion || Math.abs(targetLift - liftMmRef.current) < 0.01) {
      liftMmRef.current = targetLift;
    } else {
      liftMmRef.current = MathUtils.damp(liftMmRef.current, targetLift, CAP_DAMP_LAMBDA, dt);
    }

    const targetViewT = view === 'plate' ? 1 : 0;
    if (reducedMotion || Math.abs(targetViewT - viewTRef.current) < 0.001) {
      viewTRef.current = targetViewT;
    } else {
      viewTRef.current = MathUtils.damp(viewTRef.current, targetViewT, VIEW_DAMP_LAMBDA, dt);
    }

    applyObjectTransforms(
      bodyGroupRef.current,
      capGroupRef.current,
      viewTRef.current,
      liftMmRef.current,
      depthMm,
      bodyOffset,
      capOffset,
      centerShiftX,
      centerShiftY,
    );

    if (cameraTransitionRef.current) {
      const desired = view === 'plate' ? PLATE_CAMERA_POS : ASSEMBLED_CAMERA_POS;
      const controls = controlsRef.current;

      if (reducedMotion) {
        camera.position.set(desired[0], desired[1], desired[2]);
        controls?.target.set(0, 0, 0);
        controls?.update();
        cameraTransitionRef.current = false;
      } else {
        camera.position.set(
          MathUtils.damp(camera.position.x, desired[0], VIEW_DAMP_LAMBDA, dt),
          MathUtils.damp(camera.position.y, desired[1], VIEW_DAMP_LAMBDA, dt),
          MathUtils.damp(camera.position.z, desired[2], VIEW_DAMP_LAMBDA, dt),
        );
        if (controls) {
          controls.target.set(
            MathUtils.damp(controls.target.x, 0, VIEW_DAMP_LAMBDA, dt),
            MathUtils.damp(controls.target.y, 0, VIEW_DAMP_LAMBDA, dt),
            MathUtils.damp(controls.target.z, 0, VIEW_DAMP_LAMBDA, dt),
          );
          controls.update();
        }
        const dist = Math.hypot(
          camera.position.x - desired[0],
          camera.position.y - desired[1],
          camera.position.z - desired[2],
        );
        if (dist < 0.5) {
          camera.position.set(desired[0], desired[1], desired[2]);
          controls?.target.set(0, 0, 0);
          controls?.update();
          cameraTransitionRef.current = false;
        }
      }
    }
  });

  const bodyParts = parts.filter((part) => part.object === 'body');
  const capParts = parts.filter((part) => part.object === 'cap');
  const firstBodyCalloutIndex = selectedZone
    ? bodyParts.findIndex((part) => part.zone === selectedZone)
    : -1;
  const firstCapCalloutIndex =
    selectedZone && firstBodyCalloutIndex === -1
      ? capParts.findIndex((part) => part.zone === selectedZone)
      : -1;

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
        {view === 'plate' && (
          <group position={[-PLATE_HALF_X, -PLATE_HALF_Y, 0]}>
            <PlatePlane />
          </group>
        )}
        <group ref={bodyGroupRef}>
          {bodyParts.map((part, index) => (
            <PartMesh
              key={part.id}
              part={part}
              filament={FILAMENTS[filaments[part.zone]]}
              highlighted={selectedZone === part.zone}
              showCallout={index === firstBodyCalloutIndex}
            />
          ))}
        </group>
        <group ref={capGroupRef}>
          {capParts.map((part, index) => (
            <PartMesh
              key={part.id}
              part={part}
              filament={FILAMENTS[filaments[part.zone]]}
              highlighted={selectedZone === part.zone}
              showCallout={index === firstCapCalloutIndex}
            />
          ))}
        </group>
      </group>

      {view === 'assembled' && (
        <ContactShadows
          position={[0, -BOX_HEIGHT / 2 - 0.2, 0]}
          opacity={0.36}
          scale={240}
          blur={2.2}
          far={120}
          resolution={256}
          color="#1b1c1e"
        />
      )}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={180}
        maxDistance={600}
        target={[0, 0, 0]}
        onStart={() => {
          cameraTransitionRef.current = false;
        }}
      />
    </>
  );
}

export default function Viewport({
  parts,
  filaments,
  depthMm,
  selectedZone,
  view = 'assembled',
  labels = {
    model: 'Modello 3D della deck box',
    openCap: 'Apri coperchio',
    closeCap: 'Chiudi coperchio',
  },
}: ViewportProps): React.JSX.Element {
  const [capOpen, setCapOpen] = useState(false);
  const [focusVisible, setFocusVisible] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div role="img" aria-label={labels.model} style={{ width: '100%', height: '100%' }}>
        <Canvas
          camera={{
            fov: 30,
            position: view === 'plate' ? PLATE_CAMERA_POS : ASSEMBLED_CAMERA_POS,
            near: 1,
            far: 2000,
          }}
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 2]}
          style={{ width: '100%', height: '100%' }}
        >
          <DeckBoxScene
            parts={parts}
            filaments={filaments}
            depthMm={depthMm}
            selectedZone={selectedZone}
            view={view}
            capOpen={capOpen}
          />
        </Canvas>
      </div>

      {view === 'assembled' && (
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
          {capOpen ? labels.closeCap : labels.openCap}
        </button>
      )}
    </div>
  );
}
