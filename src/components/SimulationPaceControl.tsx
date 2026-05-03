/**
 * Deck overlay: simulation run pacing (multiplies protocol pause durations).
 * Prominent when Top viewpoint — always visible on the 3D deck panel.
 */

import { useSimulation } from '../SimulationContext';

const PACE_OPTIONS: Array<{ label: string; value: number }> = [
  { label: 'Fast · 0.55× pause', value: 0.55 },
  { label: 'Brisk · 0.8× pause', value: 0.8 },
  { label: 'Normal · 1× pause', value: 1 },
  { label: 'Slower · 1.75× pause (default)', value: 1.75 },
  { label: 'Slow · 2.5× pause', value: 2.5 },
  { label: 'Very slow · 3.25× pause', value: 3.25 },
];

export function SimulationPaceControl() {
  const { simulationDelayMultiplier, setSimulationDelayMultiplier, state } = useSimulation();

  const nearestOption =
    PACE_OPTIONS.reduce((best, opt) =>
      Math.abs(opt.value - simulationDelayMultiplier) < Math.abs(best.value - simulationDelayMultiplier)
        ? opt
        : best
    ).value;

  return (
    <div
      className={`pointer-events-auto rounded-lg border backdrop-blur-md px-3 py-2 shadow-lg ${
        state.viewpoint === 'top'
          ? 'border-sky-500/40 bg-black/55'
          : 'border-white/15 bg-black/35'
      }`}
    >
      <div className="text-[9px] uppercase tracking-wider text-white/55 mb-1.5">
        Simulation pace {state.viewpoint === 'top' ? '(top deck)' : ''}
      </div>
      <select
        value={nearestOption}
        onChange={e => setSimulationDelayMultiplier(Number(e.target.value))}
        className="w-full max-w-[220px] bg-[#141414] border border-[#3f3f3f] text-[11px] text-[#e5e5e5] rounded px-2 py-1.5 font-mono"
      >
        {PACE_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="text-[8px] text-white/35 mt-1 font-mono">
        Higher = longer waits between moves · applies to Run Simulation
      </div>
    </div>
  );
}
