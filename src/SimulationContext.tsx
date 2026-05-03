/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { carrierLiftForIndex } from './deckPalette';
import { SimulationState, LabwareInstance } from './types';

const DECK_LAYOUT_STORAGE_KEY = 'lh3d.deckLayout.v1';
const SIMULATION_PACE_STORAGE_KEY = 'lh3d.simulationPace.v1';

interface SimulationContextType {
  state: SimulationState;
  pendingLabwareType: LabwareInstance['type'] | null;
  setPendingLabwareType: (type: LabwareInstance['type'] | null) => void;
  draggedLabwareType: LabwareInstance['type'] | null;
  setDraggedLabwareType: (type: LabwareInstance['type'] | null) => void;
  draggedLabwareId: string | null;
  setDraggedLabwareId: (id: string | null) => void;
  selectedLabwareId: string | null;
  setSelectedLabwareId: (id: string | null) => void;
  moveToSlot: (head: '96' | '8', slotId: number) => void;
  moveToSlotColumn: (
    head: '96' | '8',
    slotId: number,
    columnIndex: number,
    totalColumns: number,
    columnSpacing: number
  ) => void;
  moveToDualSlotColumn: (
    slotAId: number,
    slotBId: number,
    columnIndex: number,
    totalColumns: number,
    columnSpacing: number
  ) => void;
  setHeight: (head: '96' | '8', height: number) => void;
  setLabware: (labware: LabwareInstance[]) => void;
  placeLabware: (type: LabwareInstance['type'], slotId: number) => void;
  moveLabware: (labwareId: string, targetSlotId: number) => void;
  setViewpoint: (view: 'iso' | 'top') => void;
  setActiveHead: (head: '96' | '8') => void;
  setHeadTipType: (head: '96' | '8', tipType: 'tipBox300uL' | 'tipBox1mL' | null) => void;
  setHead8Expansion: (offsetX: number | null, rowSpacing?: number, offsetZ?: number | null) => void;
  setTiltModule: (slotId: 23 | 24, tilted: boolean) => void;
  setTransferVisual: (
    sourceLabwareId: string | null,
    targetLabwareId: string | null,
    phase: 'idle' | 'aspirate' | 'dispense',
    activeColumn: number | null,
    secondaryTargetLabwareId?: string | null
  ) => void;
  setTipBoxVisual: (labwareId: string | null, phase: 'idle' | 'load' | 'unload') => void;
  calculateSlotPosition: (slotId: number) => [number, number, number];
  /** Multiplies protocol simulation pause durations (>1 = slower run). */
  simulationDelayMultiplier: number;
  setSimulationDelayMultiplier: (value: number) => void;
}

const initialState: SimulationState = {
  head96Position: [0, 150, 0],
  head8Position: [200, 150, 0],
  head8ExpandedOffsetX: null,
  head8ExpandedOffsetZ: null,
  head8ExpandedRowSpacing: 18,
  activeHead: '96',
  head96TipType: null,
  head8TipType: null,
  tiltModules: {
    23: false,
    24: false,
  },
  transferVisual: {
    sourceLabwareId: null,
    targetLabwareId: null,
    secondaryTargetLabwareId: null,
    phase: 'idle',
    activeColumn: null,
  },
  tipBoxVisual: {
    labwareId: null,
    phase: 'idle',
  },
  labware: [],
  viewpoint: 'iso',
};

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SimulationState>(initialState);
  const [pendingLabwareType, setPendingLabwareType] = useState<LabwareInstance['type'] | null>(null);
  const [draggedLabwareType, setDraggedLabwareType] = useState<LabwareInstance['type'] | null>(null);
  const [draggedLabwareId, setDraggedLabwareId] = useState<string | null>(null);
  const [selectedLabwareId, setSelectedLabwareId] = useState<string | null>(null);
  const [simulationDelayMultiplier, setSimulationDelayMultiplierState] = useState(1.75);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIMULATION_PACE_STORAGE_KEY);
      if (!raw) return;
      const n = Number(JSON.parse(raw));
      if (Number.isFinite(n) && n >= 0.35 && n <= 4) {
        setSimulationDelayMultiplierState(n);
      }
    } catch {
      // ignore
    }
  }, []);

  const setSimulationDelayMultiplier = (value: number) => {
    const clamped = Math.min(4, Math.max(0.35, value));
    setSimulationDelayMultiplierState(clamped);
    try {
      localStorage.setItem(SIMULATION_PACE_STORAGE_KEY, JSON.stringify(clamped));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DECK_LAYOUT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { labware?: LabwareInstance[] };
      if (!Array.isArray(parsed.labware)) return;
      setState(prev => ({ ...prev, labware: parsed.labware }));
    } catch {
      // Ignore invalid saved deck data and continue with default state.
    }
  }, []);

  const calculateSlotPosition = (slotId: number): [number, number, number] => {
    // A-C are 4 positions, D-F are 5 positions, G-H are 4 positions.
    let carrierIndex = 0;
    let slotInCarrier = 0;
    let slotGap = 110;
    let slotCenter = 2;

    if (slotId < 12) {
      carrierIndex = Math.floor(slotId / 4);
      slotInCarrier = slotId % 4;
      slotGap = 146.67;
      slotCenter = 1.5;
    } else if (slotId < 27) {
      const remainingId = slotId - 12;
      carrierIndex = 3 + Math.floor(remainingId / 5);
      slotInCarrier = remainingId % 5;
      slotGap = 110;
      slotCenter = 2;
    } else {
      const remainingId = slotId - 27;
      carrierIndex = 6 + Math.floor(remainingId / 4);
      slotInCarrier = remainingId % 4;
      slotGap = 146.67;
      slotCenter = 1.5;
    }
    const carrierLift = carrierLiftForIndex(carrierIndex);

    return [
      (carrierIndex - 3.5) * 150,
      12 + carrierLift, // Matches Deck slot height (group lift + slot offset + labware origin)
      (slotInCarrier - slotCenter) * slotGap
    ];
  };

  const moveToSlot = (head: '96' | '8', slotId: number) => {
    const targetPos = calculateSlotPosition(slotId);
    setState(prev => {
      const key = head === '96' ? 'head96Position' : 'head8Position';
      const currentPos = prev[key];
      return {
        ...prev,
        [key]: [targetPos[0], currentPos[1], targetPos[2]],
        activeHead: head,
      };
    });
  };

  const moveToSlotColumn = (
    head: '96' | '8',
    slotId: number,
    columnIndex: number,
    totalColumns: number,
    columnSpacing: number
  ) => {
    const targetPos = calculateSlotPosition(slotId);
    const columnOffsetX = (columnIndex - (totalColumns + 1) / 2) * columnSpacing;
    setState(prev => {
      const key = head === '96' ? 'head96Position' : 'head8Position';
      const currentPos = prev[key];
      return {
        ...prev,
        [key]: [targetPos[0] + columnOffsetX, currentPos[1], targetPos[2]],
        activeHead: head,
      };
    });
  };

  const moveToDualSlotColumn = (
    slotAId: number,
    slotBId: number,
    columnIndex: number,
    totalColumns: number,
    columnSpacing: number
  ) => {
    const slotAPos = calculateSlotPosition(slotAId);
    const slotBPos = calculateSlotPosition(slotBId);
    const columnOffsetX = (columnIndex - (totalColumns + 1) / 2) * columnSpacing;
    const targetAX = slotAPos[0] + columnOffsetX;
    const targetBX = slotBPos[0] + columnOffsetX;
    const targetX = (targetAX + targetBX) / 2;
    const targetZ = (slotAPos[2] + slotBPos[2]) / 2;
    const expansionOffsetX = (targetBX - targetAX) / 2;
    const expansionOffsetZ = (slotBPos[2] - slotAPos[2]) / 2;

    setState(prev => {
      const currentPos = prev.head8Position;
      return {
        ...prev,
        head8Position: [targetX, currentPos[1], targetZ],
        head8ExpandedOffsetX: expansionOffsetX,
        head8ExpandedOffsetZ: expansionOffsetZ,
        head8ExpandedRowSpacing: 18,
        activeHead: '8',
      };
    });
  };

  const setHeight = (head: '96' | '8', height: number) => {
    setState(prev => {
      const key = head === '96' ? 'head96Position' : 'head8Position';
      const currentPos = prev[key];
      return {
        ...prev,
        [key]: [currentPos[0], height, currentPos[2]],
      };
    });
  };

  const setViewpoint = (viewpoint: 'iso' | 'top') => {
    setState(prev => ({ ...prev, viewpoint }));
  };

  const setActiveHead = (activeHead: '96' | '8') => {
    setState(prev => ({ ...prev, activeHead }));
  };

  const setHeadTipType = (head: '96' | '8', tipType: 'tipBox300uL' | 'tipBox1mL' | null) => {
    setState(prev => ({
      ...prev,
      [head === '96' ? 'head96TipType' : 'head8TipType']: tipType,
    }));
  };

  const setHead8Expansion = (offsetX: number | null, rowSpacing = 18, offsetZ: number | null = null) => {
    setState(prev => ({
      ...prev,
      head8ExpandedOffsetX: offsetX,
      head8ExpandedOffsetZ: offsetZ,
      head8ExpandedRowSpacing: rowSpacing,
    }));
  };

  const setTiltModule = (slotId: 23 | 24, tilted: boolean) => {
    setState(prev => ({
      ...prev,
      tiltModules: {
        ...prev.tiltModules,
        [slotId]: tilted,
      },
    }));
  };

  const setTransferVisual = (
    sourceLabwareId: string | null,
    targetLabwareId: string | null,
    phase: 'idle' | 'aspirate' | 'dispense',
    activeColumn: number | null,
    secondaryTargetLabwareId: string | null = null
  ) => {
    setState(prev => ({
      ...prev,
      transferVisual: { sourceLabwareId, targetLabwareId, secondaryTargetLabwareId, phase, activeColumn },
    }));
  };

  const setTipBoxVisual = (labwareId: string | null, phase: 'idle' | 'load' | 'unload') => {
    setState(prev => ({
      ...prev,
      tipBoxVisual: { labwareId, phase },
    }));
  };

  const canPlaceTypeAtSlot = (type: LabwareInstance['type'], slotId: number) => {
    // Carrier F / C6 (slots 22–26): 1=liquid waste or 300 mL reservoir; 2–3 tilt/plate/reservoir; 4–5 plates/reservoir.
    if (slotId >= 22 && slotId <= 26) {
      const positionFromBack = slotId - 22 + 1;
      if (positionFromBack === 1) return type === 'liquidWaste' || type === 'reservoir';
      if (positionFromBack === 2 || positionFromBack === 3) {
        return type === 'plate96' || type === 'reservoir';
      }
      if (positionFromBack === 4 || positionFromBack === 5) {
        return type === 'plate96' || type === 'plate24' || type === 'reservoir';
      }
    }
    return true;
  };

  const placeLabware = (type: LabwareInstance['type'], slotId: number) => {
    setState(prev => {
      if (!canPlaceTypeAtSlot(type, slotId)) return prev;

      const remaining = prev.labware.filter(item => item.slotId !== slotId);
      const nextCount = remaining.filter(item => item.type === type).length + 1;
      const labelByType: Record<LabwareInstance['type'], string> = {
        plate96: '96-Well Plate',
        plate24: '24-Well Plate',
        tipBox300uL: '300 uL Tip Box',
        tipBox1mL: '1 mL Tip Box',
        liquidWaste: 'Liquid Waste',
        reservoir: '300 mL Reservoir',
      };

      const placedItem: LabwareInstance = {
        id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        slotId,
        name: `${labelByType[type]} ${nextCount}`,
      };

      setSelectedLabwareId(placedItem.id);
      return {
        ...prev,
        labware: [
          ...remaining,
          placedItem,
        ],
      };
    });
  };

  const moveLabware = (labwareId: string, targetSlotId: number) => {
    setState(prev => {
      const movingItem = prev.labware.find(item => item.id === labwareId);
      if (!movingItem) return prev;
      if (!canPlaceTypeAtSlot(movingItem.type, targetSlotId)) return prev;

      return {
        ...prev,
        labware: prev.labware
          .filter(item => item.id !== labwareId && item.slotId !== targetSlotId)
          .concat({ ...movingItem, slotId: targetSlotId }),
      };
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      if (!selectedLabwareId) return;

      setState(prev => ({
        ...prev,
        labware: prev.labware.filter(item => item.id !== selectedLabwareId),
      }));
      setSelectedLabwareId(null);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedLabwareId]);

  return (
    <SimulationContext.Provider value={{ 
      state, 
      pendingLabwareType,
      setPendingLabwareType,
      draggedLabwareType,
      setDraggedLabwareType,
      draggedLabwareId,
      setDraggedLabwareId,
      selectedLabwareId,
      setSelectedLabwareId,
      moveToSlot, 
      moveToSlotColumn,
      moveToDualSlotColumn,
      setHeight, 
      setLabware: (labware) => setState(s => ({ ...s, labware })),
      placeLabware,
      moveLabware,
      setViewpoint,
      setActiveHead,
      setHeadTipType,
      setHead8Expansion,
      setTiltModule,
      setTransferVisual,
      setTipBoxVisual,
      calculateSlotPosition,
      simulationDelayMultiplier,
      setSimulationDelayMultiplier,
    }}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) throw new Error('useSimulation must be used within SimulationProvider');
  return context;
}
