// Replay: dummy log list + timeline + playback
import React from 'react';
import { Button } from '../components/ui/button';
import { Slider } from '../components/ui/slider';
import { mockStream } from '../lib/mockStream';
import { listLogs as coreListLogs, playLog as corePlayLog, stopPlay as coreStopPlay } from '../lib/api';
import { useStore } from '../store';
import MapView from '../components/MapView';
import ChartsPanel from '../components/ChartsPanel';

const dummyLogs = Array.from({ length: 8 }, (_, i) => ({ id: `log-${i + 1}`, name: `2024-11-0${(i % 9) + 1}_flight_${i + 1}` }));

export default function Replay() {
  const [logs, setLogs] = React.useState<{ id: string; name: string }[]>(dummyLogs);
  const [selected, setSelected] = React.useState<string | null>(dummyLogs[0].id);
  const [speed, setSpeed] = React.useState<0.5 | 1 | 2>(1);
  const [pos, setPos] = React.useState(0);
  const append = useStore((s) => s.append);
  const clear = useStore((s) => s.clear);
  const setMode = useStore((s) => s.setMode);

  async function refreshLogs() {
    const isTauri = typeof (window as any).__TAURI__ !== 'undefined';
    if (!isTauri) return;
    // assume logs directory configured elsewhere; here we use default home logs
    const dir = useStore.getState().config.logging.directory || '';
    const list = await coreListLogs(dir);
    setLogs(list.map((l) => ({ id: l.file, name: l.file.split('/').pop() || l.file })));
    if (list.length) setSelected(list[0].file);
  }

  React.useEffect(() => { refreshLogs(); }, []);

  function play() {
    if (!selected) return;
    clear();
    setMode('replay');
    const isTauri = typeof (window as any).__TAURI__ !== 'undefined';
    if (isTauri) {
      corePlayLog(selected, speed);
      let i = 0;
      const id = window.setInterval(() => { i = (i + speed) % 600; setPos(i); }, 1000);
      return () => { window.clearInterval(id); coreStopPlay(); };
    } else {
      mockStream.play(selected, speed as any);
      let i = 0;
      const id = window.setInterval(() => { i = (i + speed) % 600; setPos(i); }, 1000);
      const unsub = mockStream.subscribe(append);
      return () => { window.clearInterval(id); unsub(); mockStream.stop(); };
    }
  }

  const stopRef = React.useRef<(() => void) | null>(null);
  const onPlayClick = () => { stopRef.current?.(); stopRef.current = play() || null; };
  const onPauseClick = () => { stopRef.current?.(); stopRef.current = null; };

  return (
    <div className="grid-12">
      <div className="col-span-12 md:col-span-4">
        <div className="card h-[600px] overflow-auto">
          <div className="mb-2 text-sm font-medium">Logs</div>
          <ul className="space-y-1">
            {logs.map((l) => (
              <li key={l.id}>
                <label className="flex items-center gap-2 p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer">
                  <input type="radio" name="log" checked={selected === l.id} onChange={() => setSelected(l.id)} />
                  <span className="text-sm font-mono">{l.name}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="col-span-12 md:col-span-8 flex flex-col gap-4">
        <div className="card">
          <div className="flex items-center gap-2">
            <Button onClick={onPlayClick}>Play</Button>
            <Button variant="outline" onClick={onPauseClick}>Pause</Button>
            <div className="ml-4 text-sm">Speed</div>
            <div className="flex gap-2">
              {[0.5, 1, 2].map((s) => (
                <Button key={s} variant={speed === s ? 'default' : 'outline'} onClick={() => setSpeed(s as any)}>{s}x</Button>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <Slider value={pos} onChange={setPos} min={0} max={600} step={1} ariaLabel="timeline" />
          </div>
        </div>
        <div className="card h-[300px]"><MapView /></div>
        <ChartsPanel />
      </div>
    </div>
  );
}
