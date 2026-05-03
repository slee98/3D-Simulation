/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState, type DragEventHandler } from 'react';
import { useSimulation } from '../SimulationContext';
import { getSlotLabel } from '../slotLabel';
import { DECK_SLOTS, LabwareInstance, LabwareType } from '../types';
import { Droplets, Target } from 'lucide-react';

type ProtocolStepType = 'plateTransfer' | 'tipLoad' | 'tipUnload' | 'tilt' | 'movePosition';
type TiltAction = 'tilt' | 'untilt';
type ProtocolGroupKey = 'tip' | 'transfer' | 'tilt' | 'move';
type ProtocolStepGroup = {
  id: string;
  name: string;
  stepIds: string[];
  collapsed: boolean;
};
const DECK_LAYOUT_STORAGE_KEY = 'lh3d.deckLayout.v1';
const PROTOCOL_STORAGE_KEY = 'lh3d.protocol.v1';
type ProtocolStep = {
  id: string;
  type: ProtocolStepType;
  sourceLabwareId: string;
  targetLabwareId: string;
  /** Snapshot names when the step was added — keeps labels if labware is removed from the deck */
  sourceLabwareLabel?: string;
  targetLabwareLabel?: string;
  secondaryTargetLabwareId?: string;
  secondaryTargetLabwareLabel?: string;
  replaceTipsEveryColumn?: boolean;
  replaceTipBoxLabwareId?: string;
  replaceTipBoxLabel?: string;
  head: '96' | '8';
  tiltSlotId?: number;
  tiltAction?: TiltAction;
  moveFromSlotId?: number;
  moveToSlotId?: number;
};

function labwareLabelForStep(
  step: ProtocolStep,
  role: 'source' | 'target' | 'secondary' | 'replaceTip',
  labware: LabwareInstance[]
): string {
  const id =
    role === 'source'
      ? step.sourceLabwareId
      : role === 'target'
        ? step.targetLabwareId
        : role === 'secondary'
          ? step.secondaryTargetLabwareId
          : step.replaceTipBoxLabwareId;
  const frozen =
    role === 'source'
      ? step.sourceLabwareLabel
      : role === 'target'
        ? step.targetLabwareLabel
        : role === 'secondary'
          ? step.secondaryTargetLabwareLabel
          : step.replaceTipBoxLabel;
  if (!id) return frozen ?? 'Unknown';
  const live = labware.find(l => l.id === id);
  return live?.name ?? frozen ?? 'Unknown';
}

export function UI() {
  const {
    state,
    moveToSlot,
    moveToSlotColumn,
    moveToDualSlotColumn,
    setHeight,
    setViewpoint,
    setActiveHead,
    setHeadTipType,
    setHead8Expansion,
    setTiltModule,
    setTransferVisual,
    setTipBoxVisual,
    placeLabware,
    moveLabware,
    selectedLabwareId,
    setSelectedLabwareId,
    pendingLabwareType,
    setPendingLabwareType,
    draggedLabwareType,
    setDraggedLabwareType,
    draggedLabwareId,
    setDraggedLabwareId,
    simulationDelayMultiplier,
  } = useSimulation();
  const [nearestSlot, setNearestSlot] = useState<number | null>(null);
  const [protocolSourceLabwareId, setProtocolSourceLabwareId] = useState<string>('');
  const [protocolTargetLabwareId, setProtocolTargetLabwareId] = useState<string>('');
  const [protocolSecondaryTargetLabwareId, setProtocolSecondaryTargetLabwareId] = useState<string>('');
  const [protocolReplaceTipsEveryColumn, setProtocolReplaceTipsEveryColumn] = useState(false);
  const [protocolReplaceTipBoxLabwareId, setProtocolReplaceTipBoxLabwareId] = useState<string>('');
  const [tipSourceLabwareId, setTipSourceLabwareId] = useState<string>('');
  const [tipHead, setTipHead] = useState<'96' | '8'>('96');
  const [tiltModuleSlotId, setTiltModuleSlotId] = useState<number>(23);
  const [tiltAction, setTiltAction] = useState<TiltAction>('tilt');
  const [moveStepFromSlotId, setMoveStepFromSlotId] = useState<number | null>(null);
  const [moveStepToSlotId, setMoveStepToSlotId] = useState<number | null>(null);
  const [protocolHead, setProtocolHead] = useState<'96' | '8'>('96');
  const [protocolSteps, setProtocolSteps] = useState<ProtocolStep[]>([]);
  const [selectedProtocolStepIds, setSelectedProtocolStepIds] = useState<string[]>([]);
  const [stepGroups, setStepGroups] = useState<ProtocolStepGroup[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<ProtocolGroupKey, boolean>>({
    tip: false,
    transfer: false,
    tilt: true,
    move: true,
  });
  const [draggedProtocolStepIndex, setDraggedProtocolStepIndex] = useState<number | null>(null);
  const [isRunningProtocol, setIsRunningProtocol] = useState(false);
  const [protocolStatus, setProtocolStatus] = useState<string>('');
  const [dragOverSlotId, setDragOverSlotId] = useState<number | null>(null);
  const slotRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const toggleGroup = (key: ProtocolGroupKey) => {
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const aToCSlotIds = useMemo(
    () => [0, 1, 2].map(c => Array.from({ length: 4 }, (_, r) => c * 4 + r)),
    []
  );
  const dToFSlotIds = useMemo(
    () => [3, 4, 5].map(c => Array.from({ length: 5 }, (_, r) => 12 + (c - 3) * 5 + r)),
    []
  );
  const gToHSlotIds = useMemo(
    () => [6, 7].map(c => Array.from({ length: 4 }, (_, r) => 27 + (c - 6) * 4 + r)),
    []
  );
  const allSlotIds = useMemo(() => Array.from({ length: DECK_SLOTS }, (_, i) => i), []);
  const plateLabware = useMemo(
    () => state.labware.filter(item => item.type === 'plate96' || item.type === 'plate24'),
    [state.labware]
  );
  const transferLabware = useMemo(
    () =>
      state.labware.filter(
        item =>
          item.type === 'plate96' ||
          item.type === 'plate24' ||
          item.type === 'reservoir' ||
          item.type === 'liquidWaste'
      ),
    [state.labware]
  );
  const tipLabware = useMemo(
    () => state.labware.filter(item => item.type === 'tipBox300uL' || item.type === 'tipBox1mL'),
    [state.labware]
  );

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const simSleep = (ms: number) => sleep(ms * simulationDelayMultiplier);

  const parkInactiveHead = (activeHead: '96' | '8') => {
    const inactiveHead: '96' | '8' = activeHead === '96' ? '8' : '96';
    const parkSlot = 34; // Right-back corner park position
    if (inactiveHead === '8') {
      setHead8Expansion(null);
    }
    moveToSlot(inactiveHead, parkSlot);
    setHeight(inactiveHead, 190);
  };

  const moveFromOptions = useMemo(
    () =>
      state.labware
        .filter(item => item.type === 'plate96' || item.type === 'plate24')
        .map(item => ({ slotId: item.slotId, label: `${getSlotLabel(item.slotId)} (${item.name})`, id: item.id }))
        .sort((a, b) => a.slotId - b.slotId),
    [state.labware]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROTOCOL_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { steps?: ProtocolStep[] };
      if (!Array.isArray(parsed.steps)) return;
      setProtocolSteps(parsed.steps);
    } catch {
      // Ignore invalid saved protocol data.
    }
  }, []);

  useEffect(() => {
    const existingIds = new Set(protocolSteps.map(step => step.id));
    setSelectedProtocolStepIds(prev => prev.filter(id => existingIds.has(id)));
    setStepGroups(prev =>
      prev
        .map(group => ({ ...group, stepIds: group.stepIds.filter(id => existingIds.has(id)) }))
        .filter(group => group.stepIds.length > 0)
    );
  }, [protocolSteps]);

  useEffect(() => {
    if (protocolHead !== '8' && tipHead !== '8') {
      setProtocolReplaceTipsEveryColumn(false);
      setProtocolReplaceTipBoxLabwareId('');
    }
  }, [protocolHead, tipHead]);

  useEffect(() => {
    const ids = new Set(state.labware.map(l => l.id));
    if (protocolSourceLabwareId && !ids.has(protocolSourceLabwareId)) {
      setProtocolSourceLabwareId('');
    }
    if (protocolTargetLabwareId && !ids.has(protocolTargetLabwareId)) {
      setProtocolTargetLabwareId('');
    }
    if (protocolSecondaryTargetLabwareId && !ids.has(protocolSecondaryTargetLabwareId)) {
      setProtocolSecondaryTargetLabwareId('');
    }
    if (protocolReplaceTipBoxLabwareId && !ids.has(protocolReplaceTipBoxLabwareId)) {
      setProtocolReplaceTipBoxLabwareId('');
    }
    if (tipSourceLabwareId && !ids.has(tipSourceLabwareId)) {
      setTipSourceLabwareId('');
    }
  }, [
    state.labware,
    protocolSourceLabwareId,
    protocolTargetLabwareId,
    protocolSecondaryTargetLabwareId,
    protocolReplaceTipBoxLabwareId,
    tipSourceLabwareId,
  ]);

  const runTransferStep = async (
    sourceItem: any,
    targetItem: any,
    head: '96' | '8',
    secondaryTargetItem?: any,
    replaceTipsEveryColumn = false,
    replaceTipBoxItem?: any,
    /** Current deck snapshot during protocol run — avoids stale React state after moves. */
    deckLabwareSnapshot?: LabwareInstance[]
  ) => {
    const isTransferable = (type: LabwareType) =>
      type === 'plate96' || type === 'plate24' || type === 'reservoir' || type === 'liquidWaste';
    if (!sourceItem || !targetItem || !isTransferable(sourceItem.type) || !isTransferable(targetItem.type)) {
      return false;
    }

    const snap = deckLabwareSnapshot;
    const src = snap?.find(l => l.id === sourceItem.id) ?? sourceItem;
    const tgt = snap?.find(l => l.id === targetItem.id) ?? targetItem;
    const sec =
      secondaryTargetItem && snap
        ? snap.find(l => l.id === secondaryTargetItem.id) ?? secondaryTargetItem
        : secondaryTargetItem;
    const tipRef = replaceTipBoxItem && snap
      ? snap.find(l => l.id === replaceTipBoxItem.id) ?? replaceTipBoxItem
      : replaceTipBoxItem;

    parkInactiveHead(head);
    setActiveHead(head);
    if (head === '8') {
      setHead8Expansion(null);
    }
    moveToSlot(head, src.slotId);
    await simSleep(700);
    setHeight(head, 50);
    await simSleep(350);

    if (head === '96') {
      // 96-head transfer: full plate-to-plate cycle.
      setTransferVisual(src.id, tgt.id, 'aspirate', null);
      setHeight(head, 150);
      await simSleep(250);
      moveToSlot(head, tgt.slotId);
      await simSleep(700);
      setTransferVisual(src.id, tgt.id, 'dispense', null);
      setHeight(head, 50);
      await simSleep(300);
      setHeight(head, 150);
      setTransferVisual(null, null, 'idle', null);
    } else {
      const replaceTipsPerColumn = replaceTipsEveryColumn && !!tipRef;
      /** Fresh tips before filling each column (unload → load), then aspirate/dispense that column. */
      const snapTips = deckLabwareSnapshot ?? state.labware;
      const replaceTipsBeforeColumn = async () => {
        if (!replaceTipsPerColumn) return;
        await runTipUnloadStep(tipRef, '8', snapTips);
        await runTipLoadStep(tipRef, '8', snapTips);
      };
      const deckList = deckLabwareSnapshot ?? state.labware;
      const is96To24Split = src.type === 'plate96' && tgt.type === 'plate24';
      if (is96To24Split) {
        const secondary24Target =
          sec?.type === 'plate24' && sec.id !== tgt.id
            ? sec
            : deckList.find(item => item.id !== tgt.id && item.type === 'plate24');

        if (secondary24Target) {
          const s24 = deckList.find(i => i.id === secondary24Target.id) ?? secondary24Target;
          // Expanded 8-channel flow for 96 -> two 24-well targets:
          // for each target column, aspirate once from source, then dispense to both 24-well plates at once.
          setHead8Expansion(null);
          for (let targetCol = 1; targetCol <= 6; targetCol++) {
            const sourceCol = targetCol;
            await replaceTipsBeforeColumn();
            // Keep 8-channel compact while aspirating from the 96-well source column.
            setHead8Expansion(null);
            setHeight(head, 150);
            await simSleep(220);
            moveToSlotColumn(head, src.slotId, sourceCol, 12, 8.5);
            await simSleep(260);
            setTransferVisual(src.id, tgt.id, 'aspirate', sourceCol - 1);
            setHeight(head, 50);
            await simSleep(220);
            setHeight(head, 150);
            await simSleep(220);
            moveToDualSlotColumn(tgt.slotId, s24.slotId, targetCol, 6, 18);
            await simSleep(260);
            setTransferVisual(src.id, tgt.id, 'dispense', targetCol - 1, s24.id);
            setHeight(head, 50);
            await simSleep(300);
          }
          setHeight(head, 150);
          setHead8Expansion(null);
          setTransferVisual(null, null, 'idle', null);
          return true;
        }
      }

      // 8-channel transfer: automatic column-by-column cycle (1 -> 12 for 96-well plates).
      setHead8Expansion(null);
      const columnCount = src.type === 'plate24' || tgt.type === 'plate24' ? 6 : 12;
      const columnSpacing = columnCount === 12 ? 8.5 : 18;
      for (let col = 1; col <= columnCount; col++) {
        await replaceTipsBeforeColumn();
        setHeight(head, 150);
        await simSleep(220);
        moveToSlotColumn(head, src.slotId, col, columnCount, columnSpacing);
        await simSleep(260);
        setTransferVisual(src.id, tgt.id, 'aspirate', col - 1);
        setHeight(head, 50);
        await simSleep(220);
        setHeight(head, 150);
        await simSleep(220);
        moveToSlotColumn(head, tgt.slotId, col, columnCount, columnSpacing);
        await simSleep(260);
        setTransferVisual(src.id, tgt.id, 'dispense', col - 1);
        setHeight(head, 50);
        await simSleep(220);
      }
      setHeight(head, 150);
      setTransferVisual(null, null, 'idle', null);
    }
    return true;
  };

  const runTipLoadStep = async (
    sourceItem: any,
    head: '96' | '8',
    deckLabwareSnapshot?: LabwareInstance[]
  ) => {
    const isTipBox = (type: LabwareType) => type === 'tipBox300uL' || type === 'tipBox1mL';
    if (!sourceItem || !isTipBox(sourceItem.type)) {
      return false;
    }
    const snap = deckLabwareSnapshot;
    const src = snap?.find(l => l.id === sourceItem.id) ?? sourceItem;
    parkInactiveHead(head);
    setActiveHead(head);
    if (head === '8') {
      setHead8Expansion(null);
      // 8-channel tip pickup always starts from first column.
      moveToSlotColumn(head, src.slotId, 1, 12, 8.5);
    } else {
      moveToSlot(head, src.slotId);
    }
    await simSleep(700);
    if (head === '8') {
      // Re-assert column 1 alignment right before pickup in case previous movement/lerp drifted.
      moveToSlotColumn(head, src.slotId, 1, 12, 8.5);
      await simSleep(200);
    }
    setTipBoxVisual(src.id, 'load');
    setHeight(head, 45);
    await simSleep(350);
    setHeadTipType(head, src.type);
    setHeight(head, 150);
    await simSleep(250);
    setTipBoxVisual(null, 'idle');
    return true;
  };

  const runTipUnloadStep = async (
    targetItem: any,
    head: '96' | '8',
    deckLabwareSnapshot?: LabwareInstance[]
  ) => {
    const isTipBox = (type: LabwareType) => type === 'tipBox300uL' || type === 'tipBox1mL';
    if (!targetItem || !isTipBox(targetItem.type)) return false;

    const snap = deckLabwareSnapshot;
    const tgt = snap?.find(l => l.id === targetItem.id) ?? targetItem;
    parkInactiveHead(head);
    setActiveHead(head);
    if (head === '8') {
      setHead8Expansion(null);
    }
    moveToSlot(head, tgt.slotId);
    await simSleep(700);
    setTipBoxVisual(tgt.id, 'unload');
    setHeight(head, 55);
    await simSleep(300);
    setHeadTipType(head, null);
    setHeight(head, 150);
    await simSleep(250);
    setTipBoxVisual(null, 'idle');
    return true;
  };

  const runTiltStep = async (slotId: number, action: TiltAction, head: '96' | '8') => {
    if (slotId !== 23 && slotId !== 24) return false;
    parkInactiveHead(head);
    // Tilt action is module-only; no robot head movement.
    setTiltModule(slotId, action === 'tilt');
    await simSleep(350);
    return true;
  };

  const addProtocolStep = () => {
    if (!protocolSourceLabwareId || !protocolTargetLabwareId || protocolSourceLabwareId === protocolTargetLabwareId) {
      setProtocolStatus('Choose different source and target labware names.');
      return;
    }
    const sourceSelection = state.labware.find(item => item.id === protocolSourceLabwareId);
    const targetSelection = state.labware.find(item => item.id === protocolTargetLabwareId);
    const needsSecondary24 =
      protocolHead === '8' &&
      sourceSelection?.type === 'plate96' &&
      targetSelection?.type === 'plate24';
    if (protocolHead === '8' && protocolReplaceTipsEveryColumn) {
      const selectedTipBox = state.labware.find(item => item.id === protocolReplaceTipBoxLabwareId);
      const isTipBox = selectedTipBox?.type === 'tipBox300uL' || selectedTipBox?.type === 'tipBox1mL';
      if (!isTipBox) {
        setProtocolStatus('Choose a tip box for "Replace Tips Every Column".');
        return;
      }
    }
    if (needsSecondary24) {
      if (!protocolSecondaryTargetLabwareId) {
        setProtocolStatus('For 96->24 using 8-channel, choose second 24-well target plate.');
        return;
      }
      if (
        protocolSecondaryTargetLabwareId === protocolTargetLabwareId ||
        protocolSecondaryTargetLabwareId === protocolSourceLabwareId
      ) {
        setProtocolStatus('Second 24-well target must be different from source and first target.');
        return;
      }
      const secondarySelection = state.labware.find(item => item.id === protocolSecondaryTargetLabwareId);
      if (!secondarySelection || secondarySelection.type !== 'plate24') {
        setProtocolStatus('Second target must be a 24-well plate.');
        return;
      }
    }

    const srcPick = state.labware.find(item => item.id === protocolSourceLabwareId);
    const tgtPick = state.labware.find(item => item.id === protocolTargetLabwareId);
    const secPick = needsSecondary24
      ? state.labware.find(item => item.id === protocolSecondaryTargetLabwareId)
      : undefined;
    const repPick =
      protocolHead === '8' && protocolReplaceTipsEveryColumn && protocolReplaceTipBoxLabwareId
        ? state.labware.find(item => item.id === protocolReplaceTipBoxLabwareId)
        : undefined;

    setProtocolSteps(prev => [
      ...prev,
      {
        id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'plateTransfer',
        sourceLabwareId: protocolSourceLabwareId,
        targetLabwareId: protocolTargetLabwareId,
        sourceLabwareLabel: srcPick?.name,
        targetLabwareLabel: tgtPick?.name,
        secondaryTargetLabwareId: needsSecondary24 ? protocolSecondaryTargetLabwareId : undefined,
        secondaryTargetLabwareLabel: secPick?.name,
        replaceTipsEveryColumn: protocolHead === '8' ? protocolReplaceTipsEveryColumn : false,
        replaceTipBoxLabwareId:
          protocolHead === '8' && protocolReplaceTipsEveryColumn ? protocolReplaceTipBoxLabwareId : undefined,
        replaceTipBoxLabel: repPick?.name,
        head: protocolHead,
      },
    ]);
    setProtocolStatus('Step added to protocol.');
  };

  const addTipLoadStep = () => {
    if (!tipSourceLabwareId) {
      setProtocolStatus('Choose a tip box first.');
      return;
    }
    const tipPick = state.labware.find(item => item.id === tipSourceLabwareId);
    setProtocolSteps(prev => [
      ...prev,
      {
        id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'tipLoad',
        sourceLabwareId: tipSourceLabwareId,
        targetLabwareId: '',
        sourceLabwareLabel: tipPick?.name,
        head: tipHead,
      },
    ]);
    setProtocolStatus('Tip load step added.');
  };

  const addTipUnloadStep = () => {
    if (!tipSourceLabwareId) {
      setProtocolStatus('Choose a tip box first.');
      return;
    }
    const tipPick = state.labware.find(item => item.id === tipSourceLabwareId);
    setProtocolSteps(prev => [
      ...prev,
      {
        id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'tipUnload',
        sourceLabwareId: tipSourceLabwareId,
        targetLabwareId: tipSourceLabwareId,
        sourceLabwareLabel: tipPick?.name,
        targetLabwareLabel: tipPick?.name,
        head: tipHead,
      },
    ]);
    setProtocolStatus('Tip unload step added.');
  };

  const addTiltStep = () => {
    if (tiltModuleSlotId !== 23 && tiltModuleSlotId !== 24) {
      setProtocolStatus('Tilt module must be F2 or F3.');
      return;
    }
    setProtocolSteps(prev => [
      ...prev,
      {
        id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'tilt',
        sourceLabwareId: '',
        targetLabwareId: '',
        head: protocolHead,
        tiltSlotId: tiltModuleSlotId,
        tiltAction,
      },
    ]);
    setProtocolStatus(`Tilt step added: ${tiltAction.toUpperCase()} at ${getSlotLabel(tiltModuleSlotId)}.`);
  };

  const addUntiltStep = () => {
    setTiltAction('untilt');
    setProtocolSteps(prev => [
      ...prev,
      {
        id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'tilt',
        sourceLabwareId: '',
        targetLabwareId: '',
        head: protocolHead,
        tiltSlotId: tiltModuleSlotId,
        tiltAction: 'untilt',
      },
    ]);
    setProtocolStatus(`Tilt step added: UNTILT at ${getSlotLabel(tiltModuleSlotId)}.`);
  };

  const handleInitializeDeck = () => {
    setTiltModule(23, false);
    setTiltModule(24, false);
    setProtocolStatus('Deck initialized: tilt modules set to untilt.');
  };

  const addMovePositionStep = () => {
    if (moveStepFromSlotId === null || moveStepToSlotId === null || moveStepFromSlotId === moveStepToSlotId) {
      setProtocolStatus('Choose different From and To positions for move step.');
      return;
    }
    setProtocolSteps(prev => [
      ...prev,
      {
        id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'movePosition',
        sourceLabwareId: '',
        targetLabwareId: '',
        head: protocolHead,
        moveFromSlotId: moveStepFromSlotId,
        moveToSlotId: moveStepToSlotId,
      },
    ]);
    setProtocolStatus(
      `Move step added: ${getSlotLabel(moveStepFromSlotId)} -> ${getSlotLabel(moveStepToSlotId)}.`
    );
  };

  const moveProtocolStep = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= protocolSteps.length) return;
    setProtocolSteps(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const removeProtocolStep = (stepId: string) => {
    setProtocolSteps(prev => prev.filter(p => p.id !== stepId));
    setSelectedProtocolStepIds(prev => prev.filter(id => id !== stepId));
    setStepGroups(prev =>
      prev
        .map(group => ({ ...group, stepIds: group.stepIds.filter(id => id !== stepId) }))
        .filter(group => group.stepIds.length > 0)
    );
  };

  const toggleStepSelection = (stepId: string) => {
    setSelectedProtocolStepIds(prev =>
      prev.includes(stepId) ? prev.filter(id => id !== stepId) : [...prev, stepId]
    );
  };

  const toggleStepGroupCollapse = (groupId: string) => {
    setStepGroups(prev => prev.map(group => (group.id === groupId ? { ...group, collapsed: !group.collapsed } : group)));
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        if (selectedProtocolStepIds.length < 2) {
          setProtocolStatus('Select at least two steps, then press Ctrl+G to group.');
          return;
        }
        const selectedSet = new Set(selectedProtocolStepIds);
        const orderedSelected = protocolSteps.filter(step => selectedSet.has(step.id)).map(step => step.id);
        if (orderedSelected.length < 2) {
          setProtocolStatus('Select at least two steps, then press Ctrl+G to group.');
          return;
        }
        const alreadyGrouped = stepGroups.some(group => group.stepIds.some(id => selectedSet.has(id)));
        if (alreadyGrouped) {
          setProtocolStatus('Ungroup selected steps first before creating a new group.');
          return;
        }
        const groupNumber = stepGroups.length + 1;
        setStepGroups(prev => [
          ...prev,
          {
            id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: `Group ${groupNumber}`,
            stepIds: orderedSelected,
            collapsed: false,
          },
        ]);
        setProtocolStatus(`Created Group ${groupNumber} (${orderedSelected.length} steps).`);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedProtocolStepIds, protocolSteps, stepGroups]);

  const handleProtocolStepDragStart = (index: number): DragEventHandler<HTMLDivElement> => (e) => {
    setDraggedProtocolStepIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleProtocolStepDrop = (index: number): DragEventHandler<HTMLDivElement> => (e) => {
    e.preventDefault();
    if (draggedProtocolStepIndex === null || draggedProtocolStepIndex === index) return;
    moveProtocolStep(draggedProtocolStepIndex, index);
    setDraggedProtocolStepIndex(null);
  };

  const handleProtocolStepDragOver: DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
  };

  const runProtocolSimulation = async () => {
    if (isRunningProtocol) return;
    if (protocolSteps.length === 0) {
      setProtocolStatus('Add at least one step before running simulation.');
      return;
    }

    setProtocolStatus('');
    setIsRunningProtocol(true);
    let simulatedLabware = [...state.labware];
    try {
      for (let i = 0; i < protocolSteps.length; i++) {
        const step = protocolSteps[i];
        const sourceItem = simulatedLabware.find(item => item.id === step.sourceLabwareId);
        const targetItem = simulatedLabware.find(item => item.id === step.targetLabwareId);
        const secondaryTargetItem = step.secondaryTargetLabwareId
          ? simulatedLabware.find(item => item.id === step.secondaryTargetLabwareId)
          : undefined;
        const replaceTipBoxItem = step.replaceTipBoxLabwareId
          ? simulatedLabware.find(item => item.id === step.replaceTipBoxLabwareId)
          : undefined;
        if (step.type === 'plateTransfer') {
          if (!sourceItem || !targetItem) {
            const s = labwareLabelForStep(step, 'source', simulatedLabware);
            const t = labwareLabelForStep(step, 'target', simulatedLabware);
            setProtocolStatus(
              `Step ${i + 1} failed: source or target not on the deck (expected ${s} -> ${t}; re-place labware or re-add the step).`
            );
            return;
          }
          const ok = await runTransferStep(
            sourceItem,
            targetItem,
            step.head,
            secondaryTargetItem,
            step.replaceTipsEveryColumn ?? false,
            replaceTipBoxItem,
            simulatedLabware
          );
          if (!ok) {
            setProtocolStatus(`Step ${i + 1} failed: source/target must be transfer labware.`);
            return;
          }
          setProtocolStatus(
            `Step ${i + 1}/${protocolSteps.length} complete: ${labwareLabelForStep(step, 'source', simulatedLabware)} -> ${labwareLabelForStep(step, 'target', simulatedLabware)} using ${step.head} head.`
          );
        } else if (step.type === 'tipLoad') {
          if (!sourceItem) {
            setProtocolStatus(
              `Step ${i + 1} failed: tip box not on deck (${labwareLabelForStep(step, 'source', simulatedLabware)}).`
            );
            return;
          }
          const ok = await runTipLoadStep(sourceItem, step.head, simulatedLabware);
          if (!ok) {
            setProtocolStatus(`Step ${i + 1} failed: source must be a tip box.`);
            return;
          }
          setProtocolStatus(
            `Step ${i + 1}/${protocolSteps.length} complete: Tip load from ${labwareLabelForStep(step, 'source', simulatedLabware)} using ${step.head} head.`
          );
        } else if (step.type === 'tipUnload') {
          if (!targetItem) {
            setProtocolStatus(
              `Step ${i + 1} failed: tip box not on deck (${labwareLabelForStep(step, 'target', simulatedLabware)}).`
            );
            return;
          }
          const ok = await runTipUnloadStep(targetItem, step.head, simulatedLabware);
          if (!ok) {
            setProtocolStatus(`Step ${i + 1} failed: target must be a tip box.`);
            return;
          }
          setProtocolStatus(
            `Step ${i + 1}/${protocolSteps.length} complete: Tip unload to ${labwareLabelForStep(step, 'target', simulatedLabware)} using ${step.head} head.`
          );
        } else if (step.type === 'tilt') {
          const slotId = step.tiltSlotId ?? 23;
          const action = step.tiltAction ?? 'tilt';
          const ok = await runTiltStep(slotId, action, step.head);
          if (!ok) {
            setProtocolStatus(`Step ${i + 1} failed: tilt module must be F2 or F3.`);
            return;
          }
          setProtocolStatus(
            `Step ${i + 1}/${protocolSteps.length} complete: ${action.toUpperCase()} at ${getSlotLabel(slotId)} using ${step.head} head.`
          );
        } else if (step.type === 'movePosition') {
          const fromSlotId = step.moveFromSlotId;
          const toSlotId = step.moveToSlotId;
          if (fromSlotId === undefined || toSlotId === undefined || fromSlotId === toSlotId) {
            setProtocolStatus(`Step ${i + 1} failed: invalid move step positions.`);
            return;
          }
          const movingItem = simulatedLabware.find(item => item.slotId === fromSlotId);
          if (!movingItem) {
            setProtocolStatus(`Step ${i + 1} failed: no labware at ${getSlotLabel(fromSlotId)}.`);
            return;
          }
          simulatedLabware = simulatedLabware
            .filter(item => item.id !== movingItem.id && item.slotId !== toSlotId)
            .concat({ ...movingItem, slotId: toSlotId });
          moveLabware(movingItem.id, toSlotId);
          await simSleep(250);
          setProtocolStatus(
            `Step ${i + 1}/${protocolSteps.length} complete: moved ${movingItem.name} ${getSlotLabel(fromSlotId)} -> ${getSlotLabel(toSlotId)}.`
          );
        }
      }
    } finally {
      setIsRunningProtocol(false);
    }
  };

  const findNearestSlot = (clientX: number, clientY: number) => {
    let bestSlot: number | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const [slotIdStr, el] of Object.entries(slotRefs.current)) {
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const distance = Math.hypot(clientX - cx, clientY - cy);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestSlot = Number(slotIdStr);
      }
    }

    return bestDistance <= 90 ? bestSlot : null;
  };

  const handleDeckDragOver: DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    if (!draggedLabwareType && !draggedLabwareId) return;
  };

  const resolveDragPayload = (raw: string): { labwareType: LabwareType | null; labwareId: string | null } => {
    const paletteTypes: LabwareType[] = ['liquidWaste', 'tipBox300uL', 'tipBox1mL', 'plate96', 'plate24', 'reservoir'];
    if (paletteTypes.includes(raw as LabwareType)) {
      return { labwareType: raw as LabwareType, labwareId: null };
    }
    const matched = state.labware.find(item => item.id === raw);
    if (matched) {
      return { labwareType: null, labwareId: matched.id };
    }
    return { labwareType: null, labwareId: null };
  };

  const handleDeckDrop: DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const payload = e.dataTransfer.getData('text/plain');
      const resolved = resolveDragPayload(payload);
      const activeDraggedType = draggedLabwareType ?? pendingLabwareType ?? resolved.labwareType;
      const activeDraggedId = draggedLabwareId ?? resolved.labwareId;
      if (!activeDraggedType && !activeDraggedId) return;

      const slotId = dragOverSlotId ?? findNearestSlot(e.clientX, e.clientY);
      if (slotId === null) return;

      if (activeDraggedId) {
        moveLabware(activeDraggedId, slotId);
      } else if (activeDraggedType) {
        placeLabware(activeDraggedType, slotId);
      }
    } catch (error) {
      console.error('Deck container drop failed:', error);
    }

    setNearestSlot(null);
    setDragOverSlotId(null);
    setPendingLabwareType(null);
    setDraggedLabwareType(null);
    setDraggedLabwareId(null);
  };

  const handleSlotDragOver = (slotId: number): DragEventHandler<HTMLButtonElement> => (e) => {
    e.preventDefault();
    if (!draggedLabwareType && !draggedLabwareId) return;
    setNearestSlot(slotId);
    setDragOverSlotId(slotId);
  };

  const handleSlotDragLeave = (slotId: number): DragEventHandler<HTMLButtonElement> => () => {
    if (dragOverSlotId === slotId) {
      setDragOverSlotId(null);
    }
  };

  const handleSlotDrop = (slotId: number): DragEventHandler<HTMLButtonElement> => (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const payload = e.dataTransfer.getData('text/plain');
      const resolved = resolveDragPayload(payload);
      const activeDraggedType = draggedLabwareType ?? pendingLabwareType ?? resolved.labwareType;
      const activeDraggedId = draggedLabwareId ?? resolved.labwareId;
      if (!activeDraggedType && !activeDraggedId) return;

      if (activeDraggedId) {
        moveLabware(activeDraggedId, slotId);
      } else if (activeDraggedType) {
        placeLabware(activeDraggedType, slotId);
      }
    } catch (error) {
      console.error('Slot drop failed:', error);
    }
    setNearestSlot(null);
    setDragOverSlotId(null);
    setPendingLabwareType(null);
    setDraggedLabwareType(null);
    setDraggedLabwareId(null);
  };

  const handleSlotClick = (slotId: number, labwareAtSlot?: { id: string }) => {
    if (pendingLabwareType) {
      placeLabware(pendingLabwareType, slotId);
      setPendingLabwareType(null);
      setDraggedLabwareType(null);
      setDraggedLabwareId(null);
      return;
    }

    if (selectedLabwareId) {
      // Clicking the same selected slot unselects it.
      if (labwareAtSlot?.id === selectedLabwareId) {
        setSelectedLabwareId(null);
        return;
      }
      moveLabware(selectedLabwareId, slotId);
      setSelectedLabwareId(null);
      return;
    }

    // If a slot has labware, select it for move. Otherwise, do normal head move.
    if (labwareAtSlot) {
      setSelectedLabwareId(labwareAtSlot.id);
    } else {
      moveToSlot(state.activeHead, slotId);
    }
  };

  const handleSaveDeck = () => {
    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      labware: state.labware.map(item => ({
        id: item.id,
        type: item.type,
        name: item.name,
        slotId: item.slotId,
        slotLabel: getSlotLabel(item.slotId),
      })),
    };

    localStorage.setItem(DECK_LAYOUT_STORAGE_KEY, JSON.stringify(payload));
    setProtocolStatus('Deck layout saved to browser storage. Refresh keeps labware on deck.');
  };

  const handleSaveProtocol = () => {
    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      steps: protocolSteps,
    };
    localStorage.setItem(PROTOCOL_STORAGE_KEY, JSON.stringify(payload));
    setProtocolStatus('Protocol saved to browser storage.');
  };

  return (
    <div className="h-full bg-[#111111] text-[#e0e0e0] flex flex-col font-mono text-xs border-l border-[#333] w-80 shadow-2xl z-10">
      <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#1a1a1a]">
        <h2 className="font-bold uppercase tracking-widest text-[#888]">Protocol Controller</h2>
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Active Head Status */}
        {/* Camera Controls */}
        <section>
          <div className="text-[10px] text-[#555] uppercase mb-2 flex items-center gap-2">
            <Target size={10} /> Viewpoint
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {(['top', 'iso'] as const).map(v => (
              <button 
                key={v}
                onClick={() => setViewpoint(v)}
                className={`py-1 text-[9px] border uppercase transition-all ${
                  state.viewpoint === v
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-[#333] bg-[#222] text-[#888] hover:bg-[#2a2a2a]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </section>

        {/* Protocol Builder */}
        <section>
          <div className="text-[10px] text-[#555] uppercase mb-2">Protocol Builder</div>
          <div className="space-y-2 border border-[#333] bg-[#141414] p-2 rounded-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-[#d1d5db] uppercase tracking-wide">Step Composer</div>
                <div className="text-[9px] text-[#6b7280]">Add steps in order, then drag to reorder queue.</div>
              </div>
              <div className="text-[9px] px-2 py-1 border border-[#2f2f2f] rounded bg-[#0f0f0f] text-[#9ca3af]">
                {protocolSteps.length} step{protocolSteps.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className="border border-[#2d2d2d] p-2 bg-[#101010] rounded-md space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-amber-300 uppercase">1) Tip Loading</div>
                <button
                  onClick={() => toggleGroup('tip')}
                  className="text-[8px] px-1.5 py-0.5 border border-[#333] text-[#9ca3af] uppercase rounded"
                >
                  {collapsedGroups.tip ? 'Expand' : 'Collapse'}
                </button>
              </div>
              {!collapsedGroups.tip && (
                <>
              <label className="text-[9px] text-[#777] uppercase flex flex-col gap-1">
                Tip Box List
                <select
                  value={tipSourceLabwareId}
                  onChange={(e) => setTipSourceLabwareId(e.target.value)}
                  className="bg-[#0f0f0f] border border-[#333] p-1 text-[#ddd]"
                >
                  <option value="">Select tip box</option>
                  {tipLabware.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({getSlotLabel(item.slotId)})
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[9px] text-[#777] uppercase flex flex-col gap-1">
                Head Type
                <select
                  value={tipHead}
                  onChange={(e) => setTipHead(e.target.value as '96' | '8')}
                  className="bg-[#0f0f0f] border border-[#333] p-1 text-[#ddd]"
                >
                  <option value="96">96 Head</option>
                  <option value="8">8-Channel</option>
                </select>
              </label>
              <div className="space-y-2 border border-[#2d2d2d] rounded p-2 bg-[#0d0d0d]">
                <label className="text-[9px] text-[#777] uppercase flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 shrink-0"
                    checked={protocolReplaceTipsEveryColumn}
                    disabled={
                      isRunningProtocol || (protocolHead !== '8' && tipHead !== '8')
                    }
                    onChange={(e) => setProtocolReplaceTipsEveryColumn(e.target.checked)}
                  />
                  <span>
                    Replace tips every column
                    <span className="block text-[8px] normal-case text-[#666] font-normal mt-0.5">
                      After each column on 8-channel transfers. Choose tip box below; Transfer Head must be
                      8-Channel when you add the transfer step.
                    </span>
                  </span>
                </label>
                {protocolHead !== '8' && tipHead !== '8' && (
                  <div className="text-[9px] text-[#666]">
                    Set Tip Head or Transfer Head to 8-Channel to enable.
                  </div>
                )}
                {(protocolHead === '8' || tipHead === '8') && protocolReplaceTipsEveryColumn && (
                  <label className="text-[9px] text-[#777] uppercase flex flex-col gap-1">
                    Tip box for replace
                    <select
                      value={protocolReplaceTipBoxLabwareId}
                      onChange={(e) => setProtocolReplaceTipBoxLabwareId(e.target.value)}
                      className="bg-[#0f0f0f] border border-[#333] p-1 text-[#ddd]"
                      disabled={isRunningProtocol}
                    >
                      <option value="">Select tip box</option>
                      {tipLabware.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({getSlotLabel(item.slotId)})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={isRunningProtocol || !tipSourceLabwareId}
                  onClick={addTipLoadStep}
                  className="py-1.5 text-[10px] border border-amber-500/80 bg-amber-500/10 text-amber-300 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add Tip Loading
                </button>
                <button
                  disabled={isRunningProtocol || !tipSourceLabwareId}
                  onClick={addTipUnloadStep}
                  className="py-1.5 text-[10px] border border-purple-500/80 bg-purple-500/10 text-purple-300 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add Tip Unload
                </button>
              </div>
                </>
              )}
            </div>

            <div className="border border-[#2d2d2d] p-2 bg-[#101010] rounded-md space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-emerald-300 uppercase">2) Transfer Step</div>
                <button
                  onClick={() => toggleGroup('transfer')}
                  className="text-[8px] px-1.5 py-0.5 border border-[#333] text-[#9ca3af] uppercase rounded"
                >
                  {collapsedGroups.transfer ? 'Expand' : 'Collapse'}
                </button>
              </div>
              {!collapsedGroups.transfer && (
                <>
              <p className="text-[8px] text-[#6b7280] leading-relaxed border border-[#2a2a2a] rounded p-2 bg-[#0a0a0a]">
                <span className="text-[#9ca3af] font-medium">Move plates:</span> select a plate (click), then click a destination slot, or drag a plate to a slot. Transfers are tied to each labware’s ID — the slot in the list updates when you move. After rearranging, run the protocol; the head uses <span className="text-[#d4d4d4]">current</span> positions. If the labware is gone, clear and re-pick source/target. For scripted moves during a run, add a Move Position step.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[9px] text-[#777] uppercase flex flex-col gap-1">
                  Source
                  <select
                    value={protocolSourceLabwareId}
                    onChange={(e) => setProtocolSourceLabwareId(e.target.value)}
                    className="bg-[#0f0f0f] border border-[#333] p-1 text-[#ddd]"
                  >
                    <option value="">Select labware</option>
                    {transferLabware.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({getSlotLabel(item.slotId)})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[9px] text-[#777] uppercase flex flex-col gap-1">
                  Target
                  <select
                    value={protocolTargetLabwareId}
                    onChange={(e) => setProtocolTargetLabwareId(e.target.value)}
                    className="bg-[#0f0f0f] border border-[#333] p-1 text-[#ddd]"
                  >
                    <option value="">Select labware</option>
                    {transferLabware.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({getSlotLabel(item.slotId)})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="text-[9px] text-[#777] uppercase flex flex-col gap-1">
                Head
                <select
                  value={protocolHead}
                  onChange={(e) => setProtocolHead(e.target.value as '96' | '8')}
                  className="bg-[#0f0f0f] border border-[#333] p-1 text-[#ddd]"
                >
                  <option value="96">96 Head</option>
                  <option value="8">8-Channel</option>
                </select>
              </label>
              {(() => {
                const src = state.labware.find(item => item.id === protocolSourceLabwareId);
                const tgt = state.labware.find(item => item.id === protocolTargetLabwareId);
                const needsSecondary =
                  protocolHead === '8' && src?.type === 'plate96' && tgt?.type === 'plate24';
                if (!needsSecondary) return null;
                return (
                  <label className="text-[9px] text-[#777] uppercase flex flex-col gap-1">
                    Second 24W Target
                    <select
                      value={protocolSecondaryTargetLabwareId}
                      onChange={(e) => setProtocolSecondaryTargetLabwareId(e.target.value)}
                      className="bg-[#0f0f0f] border border-[#333] p-1 text-[#ddd]"
                    >
                      <option value="">Select second 24-well plate</option>
                      {plateLabware
                        .filter(item => item.type === 'plate24' && item.id !== protocolTargetLabwareId)
                        .map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({getSlotLabel(item.slotId)})
                          </option>
                        ))}
                    </select>
                  </label>
                );
              })()}
              <button
                disabled={isRunningProtocol}
                onClick={addProtocolStep}
                className="w-full py-1.5 text-[10px] border border-emerald-500/80 bg-emerald-500/10 text-emerald-300 rounded disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add Transfer Step
              </button>
                </>
              )}
            </div>

            <div className="border border-[#2d2d2d] p-2 bg-[#101010] rounded-md space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-cyan-300 uppercase">3) Tilt Deck</div>
                <button
                  onClick={() => toggleGroup('tilt')}
                  className="text-[8px] px-1.5 py-0.5 border border-[#333] text-[#9ca3af] uppercase rounded"
                >
                  {collapsedGroups.tilt ? 'Expand' : 'Collapse'}
                </button>
              </div>
              {!collapsedGroups.tilt && (
                <>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[9px] text-[#777] uppercase flex flex-col gap-1">
                  Module
                  <select
                    value={String(tiltModuleSlotId)}
                    onChange={(e) => setTiltModuleSlotId(Number(e.target.value))}
                    className="bg-[#0f0f0f] border border-[#333] p-1 text-[#ddd]"
                  >
                    <option value="23">F2</option>
                    <option value="24">F3</option>
                  </select>
                </label>
                <label className="text-[9px] text-[#777] uppercase flex flex-col gap-1">
                  Action
                  <select
                    value={tiltAction}
                    onChange={(e) => setTiltAction(e.target.value as TiltAction)}
                    className="bg-[#0f0f0f] border border-[#333] p-1 text-[#ddd]"
                  >
                    <option value="tilt">Tilt</option>
                    <option value="untilt">Untilt</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={isRunningProtocol}
                  onClick={addTiltStep}
                  className="py-1.5 text-[10px] border border-cyan-500/80 bg-cyan-500/10 text-cyan-300 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add Tilt Step
                </button>
                <button
                  disabled={isRunningProtocol}
                  onClick={addUntiltStep}
                  className="py-1.5 text-[10px] border border-sky-500/80 bg-sky-500/10 text-sky-300 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add Untilt Step
                </button>
              </div>
              <button
                disabled={isRunningProtocol}
                onClick={handleInitializeDeck}
                className="w-full py-1.5 text-[10px] border border-slate-500/80 bg-slate-500/10 text-slate-300 rounded disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Initialize Deck (Untilt)
              </button>
                </>
              )}
            </div>

            <div className="border border-[#2d2d2d] p-2 bg-[#101010] rounded-md space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-orange-300 uppercase">4) Move Position</div>
                <button
                  onClick={() => toggleGroup('move')}
                  className="text-[8px] px-1.5 py-0.5 border border-[#333] text-[#9ca3af] uppercase rounded"
                >
                  {collapsedGroups.move ? 'Expand' : 'Collapse'}
                </button>
              </div>
              {!collapsedGroups.move && (
                <>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[9px] text-[#777] uppercase flex flex-col gap-1">
                  From
                  <select
                    value={moveStepFromSlotId ?? ''}
                    onChange={(e) => setMoveStepFromSlotId(e.target.value === '' ? null : Number(e.target.value))}
                    className="bg-[#0f0f0f] border border-[#333] p-1 text-[#ddd]"
                  >
                    <option value="">Occupied slot</option>
                    {moveFromOptions.map(opt => (
                      <option key={`move-step-from-${opt.id}-${opt.slotId}`} value={opt.slotId}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[9px] text-[#777] uppercase flex flex-col gap-1">
                  To
                  <select
                    value={moveStepToSlotId ?? ''}
                    onChange={(e) => setMoveStepToSlotId(e.target.value === '' ? null : Number(e.target.value))}
                    className="bg-[#0f0f0f] border border-[#333] p-1 text-[#ddd]"
                  >
                    <option value="">Target slot</option>
                    {allSlotIds.map(slotId => (
                      <option key={`move-step-to-${slotId}`} value={slotId}>
                        {getSlotLabel(slotId)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                disabled={isRunningProtocol}
                onClick={addMovePositionStep}
                className="w-full py-1.5 text-[10px] border border-orange-500/80 bg-orange-500/10 text-orange-300 rounded disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add Move Position Step
              </button>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSaveDeck}
                className="w-full py-1.5 text-[10px] border border-emerald-500/80 bg-emerald-500/10 text-emerald-300 rounded hover:bg-emerald-500/15"
              >
                Save Deck
              </button>
              <button
                disabled={protocolSteps.length === 0}
                onClick={handleSaveProtocol}
                className="w-full py-1.5 text-[10px] border border-violet-500/80 bg-violet-500/10 text-violet-300 rounded disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save Protocol
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1 border border-[#2d2d2d] p-2 bg-[#101010] rounded-md">
              <div className="text-[9px] text-[#666] uppercase tracking-wide">
                Queued Steps (drag to reorder, select + Ctrl+G to group)
              </div>
              {protocolSteps.length === 0 ? (
                <div className="text-[9px] text-[#666]">No steps added.</div>
              ) : (
                (() => {
                  const stepToGroupId = new Map<string, string>();
                  for (const group of stepGroups) {
                    for (const stepId of group.stepIds) stepToGroupId.set(stepId, group.id);
                  }
                  const renderedGroups = new Set<string>();
                  return protocolSteps.map((step, idx) => {
                    const groupId = stepToGroupId.get(step.id);
                    if (groupId) {
                      if (renderedGroups.has(groupId)) return null;
                      renderedGroups.add(groupId);
                      const group = stepGroups.find(g => g.id === groupId);
                      if (!group) return null;
                      const groupedSteps = protocolSteps.filter(s => group.stepIds.includes(s.id));
                      return (
                        <div key={group.id} className="border border-[#344054] bg-[#0b1220] rounded p-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="text-[9px] text-[#93c5fd] uppercase">
                              {group.name} ({groupedSteps.length})
                            </div>
                            <button
                              onClick={() => toggleStepGroupCollapse(group.id)}
                              className="text-[8px] px-1.5 py-0.5 border border-[#3b4f68] text-[#9fb8d8] rounded uppercase"
                            >
                              {group.collapsed ? 'Expand' : 'Collapse'}
                            </button>
                          </div>
                          {!group.collapsed &&
                            groupedSteps.map(groupStep => {
                              const realIndex = protocolSteps.findIndex(p => p.id === groupStep.id);
                              const srcName = labwareLabelForStep(groupStep, 'source', state.labware);
                              const tgtName = labwareLabelForStep(groupStep, 'target', state.labware);
                              const stepTag =
                                groupStep.type === 'plateTransfer'
                                  ? 'Transfer'
                                  : groupStep.type === 'tipLoad'
                                  ? 'Tip Load'
                                  : groupStep.type === 'tipUnload'
                                  ? 'Tip Unload'
                                  : groupStep.type === 'tilt'
                                  ? 'Tilt'
                                  : 'Move';
                              const stepTagClass =
                                groupStep.type === 'plateTransfer'
                                  ? 'text-emerald-300'
                                  : groupStep.type === 'tipLoad'
                                  ? 'text-amber-300'
                                  : groupStep.type === 'tipUnload'
                                  ? 'text-purple-300'
                                  : groupStep.type === 'tilt'
                                  ? 'text-cyan-300'
                                  : 'text-orange-300';
                              const stepText =
                                groupStep.type === 'plateTransfer'
                                  ? `${srcName} -> ${tgtName}${
                                      groupStep.replaceTipsEveryColumn ? ' (Replace tips each col)' : ''
                                    }`
                                  : groupStep.type === 'tipLoad'
                                  ? `Tip Load from ${srcName}`
                                  : groupStep.type === 'tipUnload'
                                  ? `Tip Unload to ${tgtName}`
                                  : groupStep.type === 'tilt'
                                  ? `${(groupStep.tiltAction ?? 'tilt').toUpperCase()} @ ${getSlotLabel(groupStep.tiltSlotId ?? 23)}`
                                  : `Move ${getSlotLabel(groupStep.moveFromSlotId ?? 0)} -> ${getSlotLabel(groupStep.moveToSlotId ?? 0)}`;
                              return (
                                <div
                                  key={groupStep.id}
                                  draggable
                                  onDragStart={handleProtocolStepDragStart(realIndex)}
                                  onDragOver={handleProtocolStepDragOver}
                                  onDrop={handleProtocolStepDrop(realIndex)}
                                  onDragEnd={() => setDraggedProtocolStepIndex(null)}
                                  className={`text-[9px] text-[#aaa] flex items-center justify-between gap-2 cursor-move border rounded px-2 py-1 ${
                                    selectedProtocolStepIds.includes(groupStep.id)
                                      ? 'border-blue-400 bg-blue-500/10'
                                      : 'border-[#2a2a2a] bg-[#0d0d0d]'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={selectedProtocolStepIds.includes(groupStep.id)}
                                      onChange={() => toggleStepSelection(groupStep.id)}
                                    />
                                    <span className="text-[#6b7280]">{realIndex + 1}.</span>
                                    <span className={`text-[8px] uppercase ${stepTagClass}`}>{stepTag}</span>
                                    <span className="truncate">{stepText} ({groupStep.head})</span>
                                  </div>
                                  <button
                                    onClick={() => removeProtocolStep(groupStep.id)}
                                    className="text-[9px] text-red-300 hover:text-red-200"
                                  >
                                    Remove
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      );
                    }
                    const srcName = labwareLabelForStep(step, 'source', state.labware);
                    const tgtName = labwareLabelForStep(step, 'target', state.labware);
                    const stepTag =
                      step.type === 'plateTransfer'
                        ? 'Transfer'
                        : step.type === 'tipLoad'
                        ? 'Tip Load'
                        : step.type === 'tipUnload'
                        ? 'Tip Unload'
                        : step.type === 'tilt'
                        ? 'Tilt'
                        : 'Move';
                    const stepTagClass =
                      step.type === 'plateTransfer'
                        ? 'text-emerald-300'
                        : step.type === 'tipLoad'
                        ? 'text-amber-300'
                        : step.type === 'tipUnload'
                        ? 'text-purple-300'
                        : step.type === 'tilt'
                        ? 'text-cyan-300'
                        : 'text-orange-300';
                    const stepText =
                      step.type === 'plateTransfer'
                        ? `${srcName} -> ${tgtName}${
                            step.replaceTipsEveryColumn ? ' (Replace tips each col)' : ''
                          }`
                        : step.type === 'tipLoad'
                        ? `Tip Load from ${srcName}`
                        : step.type === 'tipUnload'
                        ? `Tip Unload to ${tgtName}`
                        : step.type === 'tilt'
                        ? `${(step.tiltAction ?? 'tilt').toUpperCase()} @ ${getSlotLabel(step.tiltSlotId ?? 23)}`
                        : `Move ${getSlotLabel(step.moveFromSlotId ?? 0)} -> ${getSlotLabel(step.moveToSlotId ?? 0)}`;
                    return (
                      <div
                        key={step.id}
                        draggable
                        onDragStart={handleProtocolStepDragStart(idx)}
                        onDragOver={handleProtocolStepDragOver}
                        onDrop={handleProtocolStepDrop(idx)}
                        onDragEnd={() => setDraggedProtocolStepIndex(null)}
                        className={`text-[9px] text-[#aaa] flex items-center justify-between gap-2 cursor-move border rounded px-2 py-1 ${
                          selectedProtocolStepIds.includes(step.id)
                            ? 'border-blue-400 bg-blue-500/10'
                            : 'border-[#2a2a2a] bg-[#0d0d0d]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedProtocolStepIds.includes(step.id)}
                            onChange={() => toggleStepSelection(step.id)}
                          />
                          <span className="text-[#6b7280]">{idx + 1}.</span>
                          <span className={`text-[8px] uppercase ${stepTagClass}`}>{stepTag}</span>
                          <span className="truncate">{stepText} ({step.head})</span>
                        </div>
                        <button
                          onClick={() => removeProtocolStep(step.id)}
                          className="text-[9px] text-red-300 hover:text-red-200"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  });
                })()
              )}
            </div>
            {protocolStatus && (
              <div className="text-[9px] text-[#7fb7ff]">{protocolStatus}</div>
            )}
          </div>
        </section>

      </div>

      <div className="p-4 bg-[#1a1a1a] border-t border-[#333] space-y-2">
        <button
          disabled={
            isRunningProtocol ||
            protocolSteps.length === 0
          }
          onClick={runProtocolSimulation}
          className="w-full py-2 border border-blue-500 bg-blue-500/10 text-blue-300 font-bold uppercase tracking-wider hover:bg-blue-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isRunningProtocol ? 'Running Simulation...' : 'Run Simulation'}
        </button>
      </div>
    </div>
  );
}
