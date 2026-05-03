/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SimulationProvider } from './SimulationContext';
import { ThreeScene } from './components/ThreeScene';
import { UI } from './components/UI';
import { LabwarePanel } from './components/LabwarePanel';
import { SimulationPaceControl } from './components/SimulationPaceControl';
import { useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  useEffect(() => {
    const blockBrowserDrop = (event: DragEvent) => {
      event.preventDefault();
    };
    const opts: AddEventListenerOptions = { capture: true };
    const targets: Array<Window | Document> = [window, document];
    for (const target of targets) {
      target.addEventListener('dragenter', blockBrowserDrop, opts);
      target.addEventListener('dragover', blockBrowserDrop, opts);
      target.addEventListener('drop', blockBrowserDrop, opts);
    }
    return () => {
      for (const target of targets) {
        target.removeEventListener('dragenter', blockBrowserDrop, true);
        target.removeEventListener('dragover', blockBrowserDrop, true);
        target.removeEventListener('drop', blockBrowserDrop, true);
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <SimulationProvider>
        <div
          className="flex h-screen w-screen overflow-hidden bg-[#1e1e1e]"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
        >
          <div className="w-80 h-full border-r border-white/10">
            <LabwarePanel />
          </div>
          <div className="flex-1 relative">
            <ThreeScene />
            
            <div className="absolute top-8 left-8 pointer-events-none z-10">
              <h1 className="text-3xl font-black text-blue-500 tracking-tighter uppercase mb-2">
                Hamilton 3D <span className="font-light text-white">Simulator</span>
              </h1>
              <div className="text-[10px] text-white/40 font-mono flex items-center gap-2 tracking-widest bg-black/20 p-2 rounded backdrop-blur-sm w-fit">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                SYSTEM ACTIVE: STAR
              </div>
            </div>
            <div className="absolute top-8 right-8 z-20 max-w-[min(90vw,260px)]">
              <SimulationPaceControl />
            </div>
          </div>
          
          <div className="w-80 h-full border-l border-white/10">
            <UI />
          </div>
        </div>
      </SimulationProvider>
    </ErrorBoundary>
  );
}
