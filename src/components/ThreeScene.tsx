/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, useEffect, useRef, useState, type DragEventHandler, type MouseEventHandler } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { Vector3 } from 'three';
import { Deck } from './Deck';
import { Robot } from './Robot';
import { DeckLabware } from './Labware';
import { useSimulation } from '../SimulationContext';
import { DECK_SLOTS, LabwareType } from '../types';

function CameraController({ viewpoint, controlsLocked }: { viewpoint: 'iso' | 'top'; controlsLocked: boolean }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const deckCenter: [number, number, number] = [0, -50, 0];

  useEffect(() => {
    if (viewpoint === 'top') {
      camera.position.set(0, 1800, 0.1);
    } else {
      // Default to a wider, zoomed-out framing so full deck is visible.
      camera.position.set(1400, 900, 1600);
    }
    camera.lookAt(...deckCenter);
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.set(...deckCenter);
      controlsRef.current.update();
    }
  }, [viewpoint, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={!controlsLocked}
      target={deckCenter}
      minDistance={350}
      maxDistance={5000}
      maxPolarAngle={Math.PI / 2.02}
    />
  );
}

export function ThreeScene() {
  const {
    state,
    calculateSlotPosition,
    selectedLabwareId,
    setSelectedLabwareId,
    pendingLabwareType,
    setPendingLabwareType,
    draggedLabwareType,
    setDraggedLabwareType,
    draggedLabwareId,
    setDraggedLabwareId,
    placeLabware,
    moveLabware,
  } = useSimulation();
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<any>(null);
  const [hoverSlotId, setHoverSlotId] = useState<number | null>(null);
  const [controlsLocked, setControlsLocked] = useState(false);

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

  const findNearestDeckSlot = (clientX: number, clientY: number) => {
    const camera = cameraRef.current;
    const container = containerRef.current;
    if (!camera || !container) return null;

    const rect = container.getBoundingClientRect();
    let bestSlot: number | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let slotId = 0; slotId < DECK_SLOTS; slotId++) {
      const [x, y, z] = calculateSlotPosition(slotId);
      const projected = new Vector3(x, y - 50, z).project(camera);
      const sx = ((projected.x + 1) / 2) * rect.width + rect.left;
      const sy = ((1 - projected.y) / 2) * rect.height + rect.top;
      const distance = Math.hypot(clientX - sx, clientY - sy);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestSlot = slotId;
      }
    }

    return bestDistance <= 130 ? bestSlot : null;
  };

  const handleSceneDragOver: DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    if (!draggedLabwareType && !draggedLabwareId && !pendingLabwareType) return;
    setHoverSlotId(findNearestDeckSlot(e.clientX, e.clientY));
  };

  const handleSceneDrop: DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const payload = e.dataTransfer.getData('text/plain');
      const resolved = resolveDragPayload(payload);
      const activeDraggedType = draggedLabwareType ?? pendingLabwareType ?? resolved.labwareType;
      const activeDraggedId = draggedLabwareId ?? resolved.labwareId;
      if (!activeDraggedType && !activeDraggedId) return;

      const slotId = hoverSlotId ?? findNearestDeckSlot(e.clientX, e.clientY);
      if (slotId === null) return;

      if (activeDraggedId) {
        moveLabware(activeDraggedId, slotId);
      } else if (activeDraggedType) {
        placeLabware(activeDraggedType, slotId);
      }
    } catch (error) {
      console.error('3D scene drop failed:', error);
    }

    setHoverSlotId(null);
    setPendingLabwareType(null);
    setDraggedLabwareType(null);
    setDraggedLabwareId(null);
  };

  const handleSceneDragLeave: DragEventHandler<HTMLDivElement> = () => {
    setHoverSlotId(null);
  };

  const handleSceneClick: MouseEventHandler<HTMLDivElement> = (e) => {
    if (!selectedLabwareId) return;
    const slotId = findNearestDeckSlot(e.clientX, e.clientY);
    if (slotId === null) return;
    const selectedItem = state.labware.find(item => item.id === selectedLabwareId);
    if (!selectedItem || selectedItem.slotId === slotId) return;
    moveLabware(selectedLabwareId, slotId);
  };

  const getTransferHighlightIndices = (itemType: LabwareType) => {
    const activeCol = state.transferVisual.activeColumn;
    if (activeCol === null) return undefined;
    if (itemType === 'plate96' && activeCol >= 0 && activeCol < 12) {
      return Array.from({ length: 8 }, (_, row) => row * 12 + activeCol);
    }
    if (itemType === 'plate24' && activeCol >= 0 && activeCol < 6) {
      return Array.from({ length: 4 }, (_, row) => row * 6 + activeCol);
    }
    return undefined;
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 bg-black"
      onDragOver={handleSceneDragOver}
      onDrop={handleSceneDrop}
      onDragLeave={handleSceneDragLeave}
      onClick={handleSceneClick}
      onPointerUp={() => setControlsLocked(false)}
      onPointerLeave={() => setControlsLocked(false)}
    >
      <Canvas
        shadows
        camera={{ position: [1400, 900, 1600], fov: 55, near: 1, far: 10000 }}
        onCreated={({ camera }) => {
          cameraRef.current = camera;
        }}
        onPointerMissed={() => setSelectedLabwareId(null)}
      >
        <color attach="background" args={["#000000"]} />
        <CameraController viewpoint={state.viewpoint} controlsLocked={controlsLocked} />
        
        <ambientLight intensity={0.8} />
        <directionalLight 
          position={[100, 200, 100]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-100, 200, -100]} intensity={0.8} />
        
        <group
          position={[0, -50, 0]}
          onPointerDown={(event) => {
            // Prevent OrbitControls rotation when interacting on deck objects.
            event.stopPropagation();
            setControlsLocked(true);
          }}
        >
          <Deck />
          <Robot />
          {state.labware.map((item) => (
            <group
              key={item.id}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedLabwareId(item.id);
              }}
              scale={selectedLabwareId === item.id ? 1.03 : 1}
            >
              {(() => {
                const platePhaseMatch =
                  state.transferVisual.phase !== 'idle' &&
                  ((state.transferVisual.phase === 'aspirate' && state.transferVisual.sourceLabwareId === item.id) ||
                    (state.transferVisual.phase === 'dispense' &&
                      (state.transferVisual.targetLabwareId === item.id ||
                        state.transferVisual.secondaryTargetLabwareId === item.id)));
                const tipPhaseMatch = state.tipBoxVisual.phase !== 'idle' && state.tipBoxVisual.labwareId === item.id;
                const tipHighlightIndices =
                  state.activeHead === '8'
                    ? Array.from({ length: 8 }, (_, row) => row * 12)
                    : [0];
                const highlightedWellIndices = platePhaseMatch
                  ? getTransferHighlightIndices(item.type)
                  : tipPhaseMatch
                    ? tipHighlightIndices
                    : undefined;
                const wellColor = undefined;

                if (item.slotId === 23 || item.slotId === 24) {
                  const [x, y, z] = calculateSlotPosition(item.slotId);
                  const pivotX = x - 65;
                  const pivotY = y - 4;
                  const pivotZ = z;
                  return (
                    <group
                      position={[pivotX, pivotY, pivotZ]}
                      rotation={[0, 0, state.tiltModules[item.slotId] ? 0.28 : 0]}
                    >
                      <DeckLabware
                        type={item.type}
                        position={[65, 4, 0]}
                        wellColor={wellColor}
                        highlightedWellIndices={highlightedWellIndices}
                      />
                    </group>
                  );
                }

                return (
                  <DeckLabware
                    type={item.type}
                    position={calculateSlotPosition(item.slotId)}
                    wellColor={wellColor}
                    highlightedWellIndices={highlightedWellIndices}
                  />
                );
              })()}
            </group>
          ))}
        </group>
        <ContactShadows position={[0, -50, 0]} opacity={0.3} scale={2000} blur={2.5} far={100} />

        {/* Keep environment optional so scene still appears if HDR load is blocked */}
        <Suspense fallback={null}>
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}
