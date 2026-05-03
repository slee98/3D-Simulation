/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { Box, Cylinder } from '@react-three/drei';
import {
  CARRIER_CHARCOAL,
  TILT_DECK_CORNER_GREY,
  TILT_DECK_LIGHT_GREY,
  TILT_DECK_RIM_GREY,
} from '../deckPalette';
import { LabwareType } from '../types';

function WellGrid({
  rows,
  cols,
  spacingX,
  spacingZ,
  y,
  radius,
  color,
  raised = false,
  highlightedWellIndices,
  highlightColor = '#7dd3fc',
}: {
  rows: number;
  cols: number;
  spacingX: number;
  spacingZ: number;
  y: number;
  radius: number;
  color: string;
  raised?: boolean;
  highlightedWellIndices?: number[];
  highlightColor?: string;
}) {
  const wells = useMemo(() => {
    const items: Array<{ x: number; z: number }> = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        items.push({
          x: (c - (cols - 1) / 2) * spacingX,
          z: (r - (rows - 1) / 2) * spacingZ,
        });
      }
    }
    return items;
  }, [rows, cols, spacingX, spacingZ]);

  return raised ? (
    <>
      {wells.map((well, i) => (
        <Cylinder key={i} args={[radius, radius, 0.9, 20]} position={[well.x, y, well.z]}>
          <meshStandardMaterial color={highlightedWellIndices?.includes(i) ? highlightColor : color} />
        </Cylinder>
      ))}
    </>
  ) : (
    <>
      {wells.map((well, i) => (
        <mesh key={i} position={[well.x, y, well.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[radius, 12]} />
          <meshStandardMaterial color={highlightedWellIndices?.includes(i) ? highlightColor : color} />
        </mesh>
      ))}
    </>
  );
}

export function Plate96({
  position,
  wellColor = '#1f2937',
  highlightedWellIndices,
}: {
  position: [number, number, number];
  wellColor?: string;
  highlightedWellIndices?: number[];
}) {
  return (
    <group position={position}>
      {/* Plate Base Frame */}
      <Box args={[120, 10, 85]} position={[0, 5, 0]}>
        <meshStandardMaterial color="#ffffff" />
      </Box>
      {/* Top Deck of Plate */}
      <Box args={[116, 2, 81]} position={[0, 10.5, 0]}>
        <meshStandardMaterial color="#d1d5db" />
      </Box>
      <WellGrid
        rows={8}
        cols={12}
        spacingX={8.5}
        spacingZ={8.5}
        y={12.1}
        radius={3.2}
        color={wellColor}
        raised
        highlightedWellIndices={highlightedWellIndices}
      />
    </group>
  );
}

function Plate24({
  position,
  wellColor = '#111827',
  highlightedWellIndices,
}: {
  position: [number, number, number];
  wellColor?: string;
  highlightedWellIndices?: number[];
}) {
  return (
    <group position={position}>
      <Box args={[120, 12, 85]} position={[0, 6, 0]}>
        <meshStandardMaterial color="#ffffff" />
      </Box>
      <Box args={[116, 3, 81]} position={[0, 13, 0]}>
        <meshStandardMaterial color="#e5e7eb" />
      </Box>
      <WellGrid
        rows={4}
        cols={6}
        spacingX={18}
        spacingZ={18}
        y={14.7}
        radius={5.6}
        color={wellColor}
        highlightedWellIndices={highlightedWellIndices}
      />
    </group>
  );
}

function TipBox300uL({
  position,
  wellColor = '#111827',
  highlightedWellIndices,
}: {
  position: [number, number, number];
  wellColor?: string;
  highlightedWellIndices?: number[];
}) {
  return (
    <group position={position}>
      <Box args={[120, 22, 85]} position={[0, 11, 0]}>
        <meshStandardMaterial color="#facc15" />
      </Box>
      <Box args={[112, 4, 77]} position={[0, 24, 0]}>
        <meshStandardMaterial color="#fde68a" />
      </Box>
      <WellGrid
        rows={8}
        cols={12}
        spacingX={8.5}
        spacingZ={8.5}
        y={26.8}
        radius={2.9}
        color={wellColor}
        raised
        highlightedWellIndices={highlightedWellIndices}
      />
    </group>
  );
}

function TipBox1mL({
  position,
  wellColor = '#111827',
  highlightedWellIndices,
}: {
  position: [number, number, number];
  wellColor?: string;
  highlightedWellIndices?: number[];
}) {
  return (
    <group position={position}>
      <Box args={[120, 30, 85]} position={[0, 15, 0]}>
        <meshStandardMaterial color="#ffffff" />
      </Box>
      <Box args={[112, 4, 77]} position={[0, 32, 0]}>
        <meshStandardMaterial color="#f1f5f9" />
      </Box>
      <WellGrid
        rows={8}
        cols={12}
        spacingX={8.5}
        spacingZ={8.5}
        y={34.8}
        radius={2.9}
        color={wellColor}
        raised
        highlightedWellIndices={highlightedWellIndices}
      />
    </group>
  );
}

function Reservoir300mL({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Open reservoir walls and base only (no liquid fill). */}
      <Box args={[120, 3, 86]} position={[0, 1.5, 0]}>
        <meshStandardMaterial color="#cbd5e1" />
      </Box>
      <Box args={[120, 24, 3]} position={[0, 12, 41.5]}>
        <meshStandardMaterial color="#cbd5e1" />
      </Box>
      <Box args={[120, 24, 3]} position={[0, 12, -41.5]}>
        <meshStandardMaterial color="#cbd5e1" />
      </Box>
      <Box args={[3, 24, 80]} position={[58.5, 12, 0]}>
        <meshStandardMaterial color="#cbd5e1" />
      </Box>
      <Box args={[3, 24, 80]} position={[-58.5, 12, 0]}>
        <meshStandardMaterial color="#cbd5e1" />
      </Box>
      <Box args={[112, 2, 74]} position={[0, 2.5, 0]}>
        <meshStandardMaterial color="#0f172a" />
      </Box>
    </group>
  );
}

function LiquidWaste({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Liquid waste uses the same open reservoir style */}
      <Box args={[120, 3, 86]} position={[0, 1.5, 0]}>
        <meshStandardMaterial color="#94a3b8" />
      </Box>
      <Box args={[120, 24, 3]} position={[0, 12, 41.5]}>
        <meshStandardMaterial color="#94a3b8" />
      </Box>
      <Box args={[120, 24, 3]} position={[0, 12, -41.5]}>
        <meshStandardMaterial color="#94a3b8" />
      </Box>
      <Box args={[3, 24, 80]} position={[58.5, 12, 0]}>
        <meshStandardMaterial color="#94a3b8" />
      </Box>
      <Box args={[3, 24, 80]} position={[-58.5, 12, 0]}>
        <meshStandardMaterial color="#94a3b8" />
      </Box>
      <Box args={[112, 2, 74]} position={[0, 2.5, 0]}>
        <meshStandardMaterial color="#111827" />
      </Box>
    </group>
  );
}

export function DeckLabware({
  type,
  position,
  wellColor,
  highlightedWellIndices,
}: {
  type: LabwareType;
  position: [number, number, number];
  wellColor?: string;
  highlightedWellIndices?: number[];
}) {
  if (type === 'liquidWaste') return <LiquidWaste position={position} />;
  if (type === 'plate24') return <Plate24 position={position} wellColor={wellColor} highlightedWellIndices={highlightedWellIndices} />;
  if (type === 'tipBox300uL') return <TipBox300uL position={position} wellColor={wellColor} highlightedWellIndices={highlightedWellIndices} />;
  if (type === 'tipBox1mL') return <TipBox1mL position={position} wellColor={wellColor} highlightedWellIndices={highlightedWellIndices} />;
  if (type === 'reservoir') return <Reservoir300mL position={position} />;
  return <Plate96 position={position} wellColor={wellColor} highlightedWellIndices={highlightedWellIndices} />;
}

/** Heater–shaker deck (C7P1 / C7P2): dark chassis, ridged plate surface, side lock rails. */
const HEATER_SHAKER_BASE = '#2c2c2c';
const HEATER_SHAKER_DECK = '#383838';
const HEATER_SHAKER_RIDGE = '#4f4f4f';
const HEATER_SHAKER_LOCK = '#0a0a0a';

export function HeaterShakerSlot({
  position,
  label: _label,
}: {
  position: [number, number, number];
  label: string;
}) {
  const ridgeCount = 11;
  const ridgePitch = 5.2;
  const ridgeZ0 = -((ridgeCount - 1) * ridgePitch) / 2;

  return (
    <group position={position}>
      {/* Main chassis (matches slot footprint ~130×95) */}
      <Box args={[126, 5, 92]} position={[0, 2.5, 0]}>
        <meshStandardMaterial color={HEATER_SHAKER_BASE} roughness={0.68} metalness={0.14} />
      </Box>
      {/* Central shaker plate */}
      <Box args={[74, 3.5, 62]} position={[0, 6.75, -2]}>
        <meshStandardMaterial color={HEATER_SHAKER_DECK} roughness={0.55} metalness={0.22} />
      </Box>
      {/* Horizontal ridges (run along X, stacked along Z) */}
      {Array.from({ length: ridgeCount }).map((_, i) => (
        <Box key={i} args={[70, 1.4, 2.6]} position={[0, 9.05, ridgeZ0 + i * ridgePitch]}>
          <meshStandardMaterial color={HEATER_SHAKER_RIDGE} roughness={0.48} metalness={0.28} />
        </Box>
      ))}
      {/* Side lock rails */}
      <Box args={[6, 13, 76]} position={[-56, 11.5, 0]}>
        <meshStandardMaterial color={HEATER_SHAKER_LOCK} roughness={0.42} metalness={0.38} />
      </Box>
      <Box args={[6, 13, 76]} position={[56, 11.5, 0]}>
        <meshStandardMaterial color={HEATER_SHAKER_LOCK} roughness={0.42} metalness={0.38} />
      </Box>
      {/* Front-center grab lip (approx. shown on reference) */}
      <Box args={[26, 4, 5]} position={[0, 4.5, 48]}>
        <meshStandardMaterial color={HEATER_SHAKER_BASE} roughness={0.65} metalness={0.12} />
      </Box>
    </group>
  );
}

type SlotRole = 'default' | 'liquidWaste' | 'tilt' | 'plate';

export function Slot({
  position,
  label,
  role = 'default',
}: {
  position: [number, number, number];
  label: string;
  role?: SlotRole;
}) {
  const slotRecess = CARRIER_CHARCOAL;
  const deckPlaneColor = role === 'tilt' ? TILT_DECK_LIGHT_GREY : slotRecess;
  const slotRim = role === 'tilt' ? TILT_DECK_RIM_GREY : '#333333';
  const cornerGuide = role === 'tilt' ? TILT_DECK_CORNER_GREY : '#555555';
  return (
    <group position={position}>
      {/* Slot Base Holder */}
      <Box args={[130, 4, 95]} position={[0, 2, 0]}>
        <meshStandardMaterial color={slotRim} roughness={role === 'tilt' ? 0.48 : 0.65} metalness={role === 'tilt' ? 0.11 : 0.12} />
      </Box>
      {/* Visual Slot Area — grey deck pad on tilt modules only */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 4.1, 0]}>
        <planeGeometry args={[125, 90]} />
        <meshStandardMaterial color={deckPlaneColor} roughness={role === 'tilt' ? 0.42 : 0.7} metalness={role === 'tilt' ? 0.1 : 0.08} />
      </mesh>
      {/* Corner Guides (The "Ears") */}
      <Box args={[8, 12, 8]} position={[-62, 6, -44]}>
        <meshStandardMaterial color={cornerGuide} roughness={role === 'tilt' ? 0.48 : 0.65} metalness={0.12} />
      </Box>
      <Box args={[8, 12, 8]} position={[62, 6, -44]}>
        <meshStandardMaterial color={cornerGuide} roughness={role === 'tilt' ? 0.48 : 0.65} metalness={0.12} />
      </Box>
      <Box args={[8, 12, 8]} position={[-62, 6, 44]}>
        <meshStandardMaterial color={cornerGuide} roughness={role === 'tilt' ? 0.48 : 0.65} metalness={0.12} />
      </Box>
      <Box args={[8, 12, 8]} position={[62, 6, 44]}>
        <meshStandardMaterial color={cornerGuide} roughness={role === 'tilt' ? 0.48 : 0.65} metalness={0.12} />
      </Box>
    </group>
  );
}
