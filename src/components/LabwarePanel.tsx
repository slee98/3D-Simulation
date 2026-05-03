/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSimulation } from '../SimulationContext';
import { getSlotLabel } from '../slotLabel';
import { LabwareType } from '../types';

export function LabwarePanel() {
  const {
    state,
    setLabware,
    pendingLabwareType,
    setPendingLabwareType,
    setDraggedLabwareType,
    setDraggedLabwareId,
    selectedLabwareId,
    setSelectedLabwareId,
  } = useSimulation();
  const palette: Array<{ type: LabwareType; label: string }> = [
    { type: 'reservoir', label: '300 mL Reservoir' },
    { type: 'tipBox300uL', label: '300 uL Tip Box' },
    { type: 'tipBox1mL', label: '1 mL Tip Box' },
    { type: 'plate96', label: '96-Well Plate' },
    { type: 'plate24', label: '24-Well Plate' },
  ];

  const renameLabware = (labwareId: string, name: string) => {
    setLabware(
      state.labware.map(item => (item.id === labwareId ? { ...item, name } : item))
    );
  };

  return (
    <div className="h-full bg-[#111111] text-[#e0e0e0] flex flex-col font-mono text-xs border-r border-[#333] w-80 shadow-2xl z-10">
      <div className="p-4 border-b border-[#333] bg-[#1a1a1a]">
        <h2 className="font-bold uppercase tracking-widest text-[#888]">Labware Panel</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <section>
          <div className="text-[10px] text-[#555] uppercase mb-2">Labware</div>
          <div className="space-y-2">
            {palette.map(item => (
              <div
                key={item.type}
                draggable
                onClick={() => {
                  setDraggedLabwareId(null);
                  setDraggedLabwareType(item.type);
                  setPendingLabwareType(item.type);
                }}
                onDragStart={(e) => {
                  setDraggedLabwareId(null);
                  setDraggedLabwareType(item.type);
                  setPendingLabwareType(item.type);
                  e.dataTransfer.setData('text/plain', item.type);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => {
                  setDraggedLabwareType(null);
                  setDraggedLabwareId(null);
                }}
                className={`cursor-grab active:cursor-grabbing py-2 px-3 border uppercase tracking-tight ${
                  pendingLabwareType === item.type
                    ? 'border-[#4b5563] bg-[#222222] text-[#e5e7eb]'
                    : 'border-[#333] bg-[#191919] text-[#cfcfcf] hover:bg-[#252525]'
                }`}
              >
                {item.label}
              </div>
            ))}
          </div>
          <div className="text-[9px] text-[#666] mt-2">
            Click labware name, drag and drop to a deck slot to place at exact position.
          </div>
        </section>

        <section>
          <div className="text-[10px] text-[#555] uppercase mb-2">Labware On Deck</div>
          <div className="space-y-2 border border-[#333] bg-[#141414] p-2 rounded-sm max-h-96 overflow-y-auto">
            {state.labware.length === 0 ? (
              <div className="text-[9px] text-[#666]">No labware placed.</div>
            ) : (
              state.labware.map(item => (
                <div
                  key={item.id}
                  draggable
                  onClick={() => {
                    setPendingLabwareType(null);
                    setDraggedLabwareType(null);
                    setDraggedLabwareId(null);
                    setSelectedLabwareId(item.id);
                  }}
                  onDragStart={(e) => {
                    setPendingLabwareType(null);
                    setDraggedLabwareType(null);
                    setDraggedLabwareId(item.id);
                    e.dataTransfer.setData('text/plain', item.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => {
                    setDraggedLabwareId(null);
                  }}
                  className={`grid grid-cols-[1fr_auto] gap-2 items-center border p-1 cursor-pointer ${
                    selectedLabwareId === item.id
                      ? 'border-emerald-400 bg-emerald-500/10'
                      : 'border-transparent hover:border-[#333]'
                  }`}
                >
                  <input
                    value={item.name}
                    onChange={(e) => renameLabware(item.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[#0f0f0f] border border-[#333] p-1 text-[#ddd] text-[10px]"
                  />
                  <span className="text-[9px] text-[#666]">{getSlotLabel(item.slotId)}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
      <div className="px-4 pb-3 text-[9px] text-[#666]">
        Drag a placed labware item to move it to another deck position.
      </div>
    </div>
  );
}
