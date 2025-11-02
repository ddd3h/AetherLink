// Replay: dummy log list + timeline + playback
import React from 'react';
import { Button } from '../components/ui/button';
import { Slider } from '../components/ui/slider';
import { listLogs as coreListLogs, playLog as corePlayLog, stopPlay as coreStopPlay, renameLog as coreRenameLog, deleteLog as coreDeleteLog } from '../lib/api';
import { toCsvHeader, telemetryToCsv, parseCsvLine } from '../lib/logFormats';
import { listLogs as dbList, getCsv as dbGetCsv, renameLog as dbRename, deleteLog as dbDelete } from '../lib/logDb';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { useStore } from '../store';
import MapView from '../components/MapView';
import ChartsPanel from '../components/ChartsPanel';

// No mock logs; only Tauri-provided list or user-imported CSV into memory

export default function Replay() {
  const [logs, setLogs] = React.useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [speed, setSpeed] = React.useState<0.5 | 1 | 2>(1);
  const [pos, setPos] = React.useState(0);
  const append = useStore((s) => s.append);
  const clear = useStore((s) => s.clear);
  const setMode = useStore((s) => s.setMode);
  const series = useStore((s) => s.series);
  const config = useStore((s) => s.config);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState('');

  async function refreshLogs() {
    const isTauri = typeof (window as any).__TAURI__ !== 'undefined';
    const dbLogs = dbList().map((l)=> ({ id: l.id, name: l.name }));
    let tauriLogs: { id: string; name: string }[] = [];
    if (isTauri) {
      const dir = useStore.getState().config.logging.directory || '';
      const list = await coreListLogs(dir);
      tauriLogs = list.map((l) => ({ id: l.file, name: l.file.split('/').pop() || l.file }));
    }
    const merged = [...dbLogs, ...tauriLogs];
    setLogs(merged);
    if (merged.length) setSelected(merged[0].id);
  }

  React.useEffect(() => { refreshLogs(); }, []);

  function play() {
    if (!selected) return;
    clear();
    setMode('replay');
    const isTauri = typeof (window as any).__TAURI__ !== 'undefined';
    if (isTauri && (selected.includes('/') || selected.includes('\\'))) {
      corePlayLog(selected, speed);
      let i = 0;
      const id = window.setInterval(() => { i = (i + speed) % 600; setPos(i); }, 1000);
      return () => { window.clearInterval(id); coreStopPlay(); };
    }
    // DB log playback
    const csv = dbGetCsv(selected);
    if (!csv) return () => {};
    const lines = csv.split(/\r?\n/).filter((l)=>l.trim().length>0);
    const first = lines[0];
    const delim = [',',';','\t'].sort((a,b)=> (first.split(b).length - first.split(a).length))[0];
    let i = 1; // skip header
    const id = window.setInterval(() => {
      if (i >= lines.length) { i = 1; }
      const t = parseCsvLine(lines[i], useStore.getState().config.csv.mapping, delim);
      append(t);
      i++;
      setPos((p)=> (p+speed)%600);
    }, 1000);
    return () => { window.clearInterval(id); };
  }

  const stopRef = React.useRef<(() => void) | null>(null);
  const onPlayClick = () => { stopRef.current?.(); stopRef.current = play() || null; };
  const onPauseClick = () => { stopRef.current?.(); stopRef.current = null; };

  function exportCsvFromSeries() {
    const rows = [toCsvHeader(), ...series.map(telemetryToCsv)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export_${new Date().toISOString().replace(/[:.]/g,'-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importCsvFile(file: File) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;
    const first = lines[0];
    const delimiters = [',',';','\t'];
    const delim = delimiters.sort((a,b)=> (first.split(b).length - first.split(a).length))[0];
    const hasHeader = first.toLowerCase().includes('lat') || first.toLowerCase().includes('lon') || first.toLowerCase().includes('time') || config.csv.header;
    clear();
    const start = hasHeader ? 1 : 0;
    for (let i=start;i<lines.length;i++) {
      const t = parseCsvLine(lines[i], config.csv.mapping, delim);
      append(t);
    }
    setMode('replay');
    setPos(0);
  }

  async function renameSelected(newName: string) {
    if (!selected) return;
    if (selected.includes('/') || selected.includes('\\')) {
      const res = await coreRenameLog(selected, newName).catch(()=>null);
      if (res) {
        await refreshLogs();
        setSelected(res);
      }
    } else {
      dbRename(selected, newName);
      await refreshLogs();
    }
  }

  async function deleteSelected(id: string) {
    const isPath = id.includes('/') || id.includes('\\');
    if (isPath) {
      await coreDeleteLog(id).catch(()=>{});
      await refreshLogs();
      if (selected === id) setSelected(null);
    } else {
      setLogs((ls)=> ls.filter(l=> l.id!==id));
      if (selected === id) setSelected(null);
    }
  }

  async function deleteSelected(id: string) {
    if (id.includes('/') || id.includes('\\')) {
      await coreDeleteLog(id).catch(()=>{});
      await refreshLogs();
      if (selected === id) setSelected(null);
    } else {
      dbDelete(id);
      await refreshLogs();
      if (selected === id) setSelected(null);
    }
  }

  function exportCsvFromSeries() {
    const rows = [toCsvHeader(), ...series.map(telemetryToCsv)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export_${new Date().toISOString().replace(/[:.]/g,'-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importCsvFile(file: File) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;
    const first = lines[0];
    const delimiters = [',',';','\t'];
    const delim = delimiters.sort((a,b)=> (first.split(b).length - first.split(a).length))[0];
    const hasHeader = first.toLowerCase().includes('lat') || first.toLowerCase().includes('lon') || first.toLowerCase().includes('time') || config.csv.header;
    clear();
    const start = hasHeader ? 1 : 0;
    for (let i=start;i<lines.length;i++) {
      const t = parseCsvLine(lines[i], config.csv.mapping, delim);
      append(t);
    }
    setMode('replay');
    setPos(0);
  }

  async function renameSelected(newName: string) {
    if (!selected) return;
    if (selected.includes('/') || selected.includes('\\')) {
      const res = await coreRenameLog(selected, newName).catch(()=>null);
      if (res) {
        await refreshLogs();
        setSelected(res);
      }
    } else {
      setLogs((ls)=> ls.map(l=> l.id===selected? ({...l, name: newName}):l));
    }
  }

  return (
    <div className="grid-12">
      <div className="col-span-12 md:col-span-4">
        <div className="card h-[600px] overflow-auto">
          <div className="mb-2 text-sm font-medium">Logs</div>
          <div className="flex gap-2 mb-2">
            <Button variant="outline" onClick={exportCsvFromSeries}>Export CSV</Button>
            <label className="text-sm inline-flex items-center gap-2">
              <span className="border rounded px-2 py-1 cursor-pointer">Import CSV</span>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e)=>{ const f = e.target.files?.[0]; if (f) importCsvFile(f); e.currentTarget.value=''; }} />
            </label>
          </div>
          <ul className="space-y-1">
            {logs.map((l) => (
              <li key={l.id} className="group">
                <div className="flex items-center gap-2 p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900">
                  <input type="radio" name="log" checked={selected === l.id} onChange={() => setSelected(l.id)} />
                  {editingId === l.id ? (
                    <>
                      <input className="border rounded px-2 py-1 text-sm flex-1 bg-transparent" value={editingName}
                        onChange={(e)=>setEditingName(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter'){ const v=editingName.trim(); if (v){ renameSelected(v); setEditingId(null);} } if(e.key==='Escape'){ setEditingId(null);} }} />
                      <button className="p-1 rounded border" aria-label="save name" onClick={()=>{ const v=editingName.trim(); if(v){ renameSelected(v); setEditingId(null);} }}><Check size={14} /></button>
                      <button className="p-1 rounded border" aria-label="cancel" onClick={()=>setEditingId(null)}><X size={14} /></button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-mono flex-1">{l.name}</span>
                      <button className="opacity-0 group-hover:opacity-100 p-1 rounded border" aria-label="rename" onClick={()=>{ setEditingId(l.id); setEditingName(l.name.replace(/\.csv$/i,'')); }}><Pencil size={14} /></button>
                      <button className="opacity-0 group-hover:opacity-100 p-1 rounded border text-red-600" aria-label="delete" onClick={()=>{ if (confirm('Delete this log?')) deleteSelected(l.id); }}><Trash2 size={14} /></button>
                    </>
                  )}
                </div>
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
