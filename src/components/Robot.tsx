/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulation } from '../SimulationContext';

export function Robot() {
  const { state } = useSimulation();
  const head96Ref = useRef<THREE.Group>(null);
  const head8Ref = useRef<THREE.Group>(null);
  const gantryRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const lerpSpeed = delta * 6;
    if (head96Ref.current) {
      head96Ref.current.position.lerp(new THREE.Vector3(...state.head96Position), lerpSpeed);
    }
    if (head8Ref.current) {
      head8Ref.current.position.lerp(new THREE.Vector3(...state.head8Position), lerpSpeed);
    }
    if (gantryRef.current) {
      const activeX = state.activeHead === '96' ? state.head96Position[0] : state.head8Position[0];
      gantryRef.current.position.x = THREE.MathUtils.lerp(gantryRef.current.position.x, activeX, lerpSpeed);
    }
  });

  return (
    <group>
      {/* 96 Head Unit — light gray housing, black accent, black mandrels */}
      <group ref={head96Ref}>
        <Box args={[140, 100, 120]} position={[0, 50, 0]}>
          <meshStandardMaterial color="#c4c8cf" roughness={0.72} metalness={0.1} />
        </Box>
        {/* Vertical black recessed accent — front (+Z) face, full-width panel (not on the side) */}
        <Box args={[92, 88, 7]} position={[0, 50, 63]}>
          <meshStandardMaterial color="#0a0a0a" roughness={0.88} metalness={0.04} />
        </Box>
        <Box args={[78, 76, 9]} position={[0, 50, 65]}>
          <meshStandardMaterial color="#141416" roughness={0.82} metalness={0.06} />
        </Box>
        {/* Stepped collar — dark gray → black */}
        <Box args={[146, 9, 126]} position={[0, 6.5, 0]}>
          <meshStandardMaterial color="#52525b" roughness={0.68} metalness={0.12} />
        </Box>
        <Box args={[143, 6, 123]} position={[0, 3, 0]}>
          <meshStandardMaterial color="#2d2d32" roughness={0.75} metalness={0.08} />
        </Box>
        <Box args={[140, 4, 120]} position={[0, 0.5, 0]}>
          <meshStandardMaterial color="#18181b" roughness={0.82} metalness={0.05} />
        </Box>
        {/* Mandrel mounting deck */}
        <Box args={[112, 10, 92]} position={[0, -5, 0]}>
          <meshStandardMaterial color="#3f3f46" roughness={0.65} metalness={0.15} />
        </Box>
        {/* Black mandrel shafts (always); tips extend below when loaded */}
        <group position={[0, -10, 0]}>
          {Array.from({ length: 8 }).map((_, r) =>
            Array.from({ length: 12 }).map((__, c) => (
              <Cylinder
                key={`96-mandrel-${r}-${c}`}
                args={[1.85, 1.85, 14, 8]}
                position={[(c - 5.5) * 8.5, -7, (r - 3.5) * 8.5]}
              >
                <meshStandardMaterial color="#0a0a0a" roughness={0.55} metalness={0.12} />
              </Cylinder>
            ))
          )}
          {state.head96TipType &&
            (() => {
              const is1mL = state.head96TipType === 'tipBox1mL';
              const tipLength = is1mL ? 52 : 42;
              const tipCenterY = -14 - tipLength / 2;
              return Array.from({ length: 8 }).map((_, r) =>
                Array.from({ length: 12 }).map((__, c) => (
                  <Cylinder
                    key={`96-tip-${r}-${c}`}
                    args={[2.35, 0.55, tipLength, 10]}
                    position={[(c - 5.5) * 8.5, tipCenterY, (r - 3.5) * 8.5]}
                  >
                    <meshStandardMaterial color="#e8eaee" roughness={0.35} metalness={0.08} />
                  </Cylinder>
                ))
              );
            })()}
        </group>
      </group>

      {/* 8-Channel Head — dark towers, neon green accents, light gantry (independent-channel look) */}
      <group ref={head8Ref}>
        {(() => {
          const is1mL = state.head8TipType === 'tipBox1mL';
          const tipLength = is1mL ? 54 : 44;
          const tipY = is1mL ? -28 : -22;
          /** Slight per-channel height variation (visual only; suggests independent Z drives). */
          const staggerY = [0, 2.2, -1.4, 3.1, -2.0, 1.3, -1.1, 2.5] as const;

          type Ch = { x: number; z: number };
          let channels: Ch[];
          if (state.head8ExpandedOffsetX !== null) {
            const rowSpacing = state.head8ExpandedRowSpacing;
            const offsetZ = state.head8ExpandedOffsetZ ?? 0;
            const ox = state.head8ExpandedOffsetX;
            channels = [
              ...Array.from({ length: 4 }, (_, i) => ({
                x: -ox,
                z: (i - 1.5) * rowSpacing - offsetZ,
              })),
              ...Array.from({ length: 4 }, (_, i) => ({
                x: ox,
                z: (i - 1.5) * rowSpacing + offsetZ,
              })),
            ];
          } else {
            channels = Array.from({ length: 8 }, (_, i) => ({ x: 0, z: (i - 3.5) * 8.5 }));
          }

          return (
            <>
              {/* Gantry bridge & rails — cool gray support */}
              <Box args={[118, 11, 148]} position={[0, 112, 0]}>
                <meshStandardMaterial color="#95abc0" roughness={0.52} metalness={0.28} />
              </Box>
              <Box args={[122, 5, 10]} position={[0, 118, -76]}>
                <meshStandardMaterial color="#7d93a8" roughness={0.58} metalness={0.22} />
              </Box>
              <Box args={[122, 5, 10]} position={[0, 118, 76]}>
                <meshStandardMaterial color="#7d93a8" roughness={0.58} metalness={0.22} />
              </Box>

              {channels.map((ch, i) => (
                <group key={`8ch-${i}`} position={[ch.x, 0, ch.z]}>
                  <group position={[0, staggerY[i] ?? 0, 0]}>
                    <Box args={[15, 78, 19]} position={[0, 56, 0]}>
                      <meshStandardMaterial color="#1f2329" roughness={0.82} metalness={0.14} />
                    </Box>
                    {/* Neon green vertical accent (front +Z) */}
                    <Box args={[7, 44, 2.2]} position={[0, 58, 9.6]}>
                      <meshStandardMaterial
                        color="#2fe06d"
                        emissive="#0f6b32"
                        emissiveIntensity={0.42}
                        roughness={0.38}
                        metalness={0.08}
                      />
                    </Box>
                    <Box args={[5, 28, 1.4]} position={[0, 52, 10.4]}>
                      <meshStandardMaterial
                        color="#5efca8"
                        emissive="#1a8f4a"
                        emissiveIntensity={0.55}
                        roughness={0.28}
                        metalness={0.06}
                      />
                    </Box>
                    {/* Black mandrel shaft */}
                    <Cylinder args={[2.05, 2.05, 14, 8]} position={[0, 13, 0]}>
                      <meshStandardMaterial color="#070707" roughness={0.48} metalness={0.22} />
                    </Cylinder>
                  </group>
                  {/* Tips: same placement as previous model */}
                  <group position={[0, -6, 0]}>
                    {state.head8TipType && (
                      <Cylinder args={[2.6, 0.55, tipLength, 10]} position={[0, tipY, 0]}>
                        <meshStandardMaterial color="#9aa3ad" roughness={0.34} metalness={0.48} />
                      </Cylinder>
                    )}
                  </group>
                </group>
              ))}
            </>
          );
        })()}
      </group>
    </group>
  );
}
