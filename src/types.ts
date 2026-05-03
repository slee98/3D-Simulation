/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LabwareType = 'plate96' | 'plate24' | 'tipBox300uL' | 'tipBox1mL' | 'liquidWaste' | 'reservoir';

export interface LabwareInstance {
  id: string;
  type: LabwareType;
  slotId: number;
  name: string;
}

export interface SimulationState {
  head96Position: [number, number, number];
  head8Position: [number, number, number];
  head8ExpandedOffsetX: number | null;
  head8ExpandedOffsetZ: number | null;
  head8ExpandedRowSpacing: number;
  activeHead: '96' | '8';
  head96TipType: 'tipBox300uL' | 'tipBox1mL' | null;
  head8TipType: 'tipBox300uL' | 'tipBox1mL' | null;
  tiltModules: {
    23: boolean;
    24: boolean;
  };
  transferVisual: {
    sourceLabwareId: string | null;
    targetLabwareId: string | null;
    secondaryTargetLabwareId: string | null;
    phase: 'idle' | 'aspirate' | 'dispense';
    activeColumn: number | null;
  };
  tipBoxVisual: {
    labwareId: string | null;
    phase: 'idle' | 'load' | 'unload';
  };
  viewpoint: 'iso' | 'top';
  labware: LabwareInstance[];
}

export const DECK_SLOTS = 35; // (A-C: 3*4) + (D-F: 3*5) + (G-H: 2*4)
export const SLOT_WIDTH = 130;
export const SLOT_HEIGHT = 90;
export const SLOT_SPACING = 10;
