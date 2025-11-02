// Dashboard: Map + Status + Charts; subscribes to mock stream
import React from 'react';
import MapView from '../components/MapView';
import StatusCards from '../components/StatusCards';
import ChartsPanel from '../components/ChartsPanel';
import { useStore } from '../store';
import { mockStream } from '../lib/mockStream';

export default function Dashboard() {
  const append = useStore((s) => s.append);
  const clear = useStore((s) => s.clear);
  const mode = useStore((s) => s.mode);
  const debug = useStore((s) => s.config.debug);
  React.useEffect(() => {
    const isTauri = typeof (window as any).__TAURI__ !== 'undefined';
    clear();
    if (debug) {
      const unsub = mockStream.subscribe(append);
      mockStream.start();
      return () => { unsub(); mockStream.stop(); };
    }
    if (isTauri) {
      // Tauri events append directly via api.ts listener (no mock when debug is OFF)
      return () => {};
    }
    // Non-Tauri and debug OFF: do not simulate; wait for real environment
    return () => {};
  }, [mode, debug]);

  return (
    <div className="grid-12">
      <div className="col-span-12 md:col-span-8">
        <div className="card h-[420px] md:h-[600px]">
          <MapView />
        </div>
      </div>
      <div className="col-span-12 md:col-span-4 flex flex-col gap-4">
        <StatusCards />
        <ChartsPanel />
      </div>
    </div>
  );
}
