/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box } from '@react-three/drei';
import { HeaterShakerSlot, Slot } from './Labware';
import { useSimulation } from '../SimulationContext';
import { getSlotLabel } from '../slotLabel';
import {
  CARRIER_CHARCOAL,
  carrierLiftForIndex,
  DECK_BETWEEN_CARRIERS,
  DECK_GUIDE_LINE,
  LEG_COLOR,
  UNDER_PANEL_COLOR_CARRIERS_D_TO_F,
  UNDER_PANEL_COLOR_CARRIERS_G_TO_H,
} from '../deckPalette';

export function Deck() {
  const { state } = useSimulation();
  const carriers = Array.from({ length: 8 });

  return (
    <group>
      {/* Base deck — shows in the strips between carriers */}
      <Box args={[1300, 4, 700]} position={[0, -2, 0]}>
        <meshStandardMaterial
          color={DECK_BETWEEN_CARRIERS}
          roughness={0.75}
          metalness={0.15}
        />
      </Box>

      <Box args={[1250, 1, 2]} position={[0, 0, 300]}>
        <meshStandardMaterial color={DECK_GUIDE_LINE} />
      </Box>

      {/* Carriers */}
      {carriers.map((_, c) => {
        const slotsPerCarrier = c < 3 || c >= 6 ? 4 : 5;
        const slotGap = slotsPerCarrier === 4 ? 146.67 : 110;
        const elevated = c >= 3;
        const carrierLift = elevated ? carrierLiftForIndex(c) : 0;
        const L = carrierLift;
        const underPanelHeight = L + 4;
        const underPanelCenterY = 2 - L / 2;
        const legCenterY = -L - 14;
        const underPanelColor =
          c >= 3 && c <= 5 ? UNDER_PANEL_COLOR_CARRIERS_D_TO_F : UNDER_PANEL_COLOR_CARRIERS_G_TO_H;
        return (
          <group key={c} position={[(c - 3.5) * 150, carrierLift, 0]}>
            {elevated && (
              <>
                <Box args={[140, underPanelHeight, 580]} position={[0, underPanelCenterY, 0]}>
                  <meshStandardMaterial color={underPanelColor} roughness={0.7} metalness={0.12} />
                </Box>
                <Box args={[10, 28, 10]} position={[-58, legCenterY, -250]}>
                  <meshStandardMaterial color={LEG_COLOR} />
                </Box>
                <Box args={[10, 28, 10]} position={[58, legCenterY, -250]}>
                  <meshStandardMaterial color={LEG_COLOR} />
                </Box>
                <Box args={[10, 28, 10]} position={[-58, legCenterY, 250]}>
                  <meshStandardMaterial color={LEG_COLOR} />
                </Box>
                <Box args={[10, 28, 10]} position={[58, legCenterY, 250]}>
                  <meshStandardMaterial color={LEG_COLOR} />
                </Box>
              </>
            )}
            {/* Carrier body (charcoal) + thin deck skin so between-slot gaps use deck grey */}
            <Box args={[140, 7, 580]} position={[0, 3.5, 0]}>
              <meshStandardMaterial
                color={CARRIER_CHARCOAL}
                roughness={0.6}
                metalness={0.12}
              />
            </Box>
            <Box args={[140, 1, 580]} position={[0, 7.5, 0]}>
              <meshStandardMaterial
                color={DECK_BETWEEN_CARRIERS}
                roughness={0.72}
                metalness={0.14}
              />
            </Box>
            
            {Array.from({ length: slotsPerCarrier }).map((__, r) => (
              (() => {
                const slotId =
                  c < 3
                    ? c * 4 + r
                    : c < 6
                      ? 12 + (c - 3) * 5 + r
                      : 27 + (c - 6) * 4 + r;
                let role: 'default' | 'liquidWaste' | 'tilt' | 'plate' = 'default';
                if (c === 5) {
                  const positionFromBack = r + 1;
                  if (positionFromBack === 1) role = 'liquidWaste';
                  else if (positionFromBack === 2 || positionFromBack === 3) role = 'tilt';
                  else role = 'plate';
                }

                return (
                  <group
                    key={slotId}
                    position={[0, 8, (r - (slotsPerCarrier - 1) / 2) * slotGap]}
                  >
                    {slotId === 23 || slotId === 24 ? (
                      <group
                        position={[-65, 0, 0]}
                        rotation={[0, 0, state.tiltModules[slotId] ? 0.28 : 0]}
                      >
                        <Slot
                          position={[65, 0, 0]}
                          label={getSlotLabel(slotId)}
                          role={role}
                        />
                      </group>
                    ) : slotId === 27 || slotId === 28 ? (
                      <HeaterShakerSlot position={[0, 0, 0]} label={getSlotLabel(slotId)} />
                    ) : (
                      <Slot
                        position={[0, 0, 0]}
                        label={getSlotLabel(slotId)}
                        role={role}
                      />
                    )}
                  </group>
                );
              })()
            ))}
          </group>
        );
      })}
    </group>
  );
}
