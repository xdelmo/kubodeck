'use client';

import type * as React from 'react';
import { useEffect, useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { DIMENSIONS } from '../lib/config';

const PLATE_X = DIMENSIONS.plate.x;
const PLATE_Y = DIMENSIONS.plate.y;
const SLAB_THICKNESS = 1.5;
const GRID_STEP = 10;
const MAJOR_STEP = 50;
const LINE_Z = 0.05;

function createLinesGeometry(coords: number[]): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(coords, 3));
  return geometry;
}

export function PlatePlane(): React.JSX.Element {
  const { minorGeometry, majorGeometry, borderGeometry } = useMemo(() => {
    const minor: number[] = [];
    const major: number[] = [];

    for (let x = GRID_STEP; x < PLATE_X; x += GRID_STEP) {
      const target = x % MAJOR_STEP === 0 ? major : minor;
      target.push(x, 0, LINE_Z, x, PLATE_Y, LINE_Z);
    }
    for (let y = GRID_STEP; y < PLATE_Y; y += GRID_STEP) {
      const target = y % MAJOR_STEP === 0 ? major : minor;
      target.push(0, y, LINE_Z, PLATE_X, y, LINE_Z);
    }

    const border = [
      0,
      0,
      LINE_Z,
      PLATE_X,
      0,
      LINE_Z,
      PLATE_X,
      0,
      LINE_Z,
      PLATE_X,
      PLATE_Y,
      LINE_Z,
      PLATE_X,
      PLATE_Y,
      LINE_Z,
      0,
      PLATE_Y,
      LINE_Z,
      0,
      PLATE_Y,
      LINE_Z,
      0,
      0,
      LINE_Z,
    ];

    return {
      minorGeometry: createLinesGeometry(minor),
      majorGeometry: createLinesGeometry(major),
      borderGeometry: createLinesGeometry(border),
    };
  }, []);

  useEffect(() => {
    return () => {
      minorGeometry.dispose();
      majorGeometry.dispose();
      borderGeometry.dispose();
    };
  }, [minorGeometry, majorGeometry, borderGeometry]);

  return (
    <group>
      <mesh position={[PLATE_X / 2, PLATE_Y / 2, -SLAB_THICKNESS / 2]}>
        <boxGeometry args={[PLATE_X, PLATE_Y, SLAB_THICKNESS]} />
        <meshStandardMaterial color="#3a3b3e" roughness={0.85} metalness={0.05} />
      </mesh>
      <lineSegments geometry={minorGeometry}>
        <lineBasicMaterial color="#d9d8d3" transparent opacity={0.14} depthWrite={false} />
      </lineSegments>
      <lineSegments geometry={majorGeometry}>
        <lineBasicMaterial color="#d9d8d3" transparent opacity={0.32} depthWrite={false} />
      </lineSegments>
      <lineSegments geometry={borderGeometry}>
        <lineBasicMaterial color="#d9d8d3" transparent opacity={0.55} depthWrite={false} />
      </lineSegments>
    </group>
  );
}
