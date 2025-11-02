// CSV mapping drag & drop UI (mock)
import React from 'react';
import { useStore } from '../store';
import type { CsvMapping, VisualType, FieldType } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { setMapping as coreSetMapping } from '../lib/api';
import { isTauri } from '../lib/api';

const telemetryKeys: string[] = ['t','lat','lon','pressure','temperature','altitude','mode','battery','gnssFix','rssi'];

function useDummyCSV(header: boolean, delimiter: string) {
  const rows = React.useMemo(() => {
    const h = header ? ['time','lat','lon','pressure','temperature','altitude','mode','battery','gnss','rssi'] : null;
    const mk = (i: number) => [
      String(Date.now() - i * 1000),
      (35.68 + Math.random()*0.01).toFixed(6),
      (139.76 + Math.random()*0.01).toFixed(6),
      (1013 + Math.random()*5).toFixed(2),
      (20 + Math.random()*3).toFixed(2),
      (50 + Math.random()*10).toFixed(1),
      ['IDLE','ASCENT','DESCENT'][i%3],
      (100 - i*0.1).toFixed(1),
      ['none','2D','3D','RTK'][i%4],
      (-60 - Math.random()*10).toFixed(0)
    ];
    const body = Array.from({ length: 10 }, (_, i) => mk(i));
    return h ? [h, ...body] : body;
  }, [header]);
  return rows.map((r) => r.join(delimiter));
}

export default function CsvMapper() {
  const config = useStore((s) => s.config);
  const setConfig = useStore((s) => s.setConfig);
  const debug = useStore((s) => s.config.debug);
  const mapping = config.csv.mapping;
  const [presetName, setPresetName] = React.useState('default');
  const preview = useDummyCSV(config.csv.header, config.csv.delimiter);
  const [liveEnabled, setLiveEnabled] = React.useState(true);
  const [rawLines, setRawLines] = React.useState<string[]>([]);

  // Live UART raw lines preview
  React.useEffect(() => {
    if (!liveEnabled) return;
    let stopped = false;
    let unlisten: null | (() => void) = null;
    let timer: any = null;
    (async () => {
      if (isTauri() && !debug) {
        try {
          const mod = await import(/* @vite-ignore */ '@tauri-apps/api/event');
          unlisten = await mod.listen<string>('raw_line', (e) => {
            if (stopped) return;
            const line = String(e.payload || '').trim();
            setRawLines((prev) => {
              const next = [...prev, line].slice(-10);
              return next;
            });
          });
        } catch (e) {
          console.warn('listen raw_line failed, fallback to mock', e);
        }
      }
      if (!unlisten && debug) {
        // fallback mock generator
        timer = setInterval(() => {
          const mk = () => [
            String(Date.now()),
            (35.68 + Math.random()*0.01).toFixed(6),
            (139.76 + Math.random()*0.01).toFixed(6),
            (1013 + Math.random()*5).toFixed(2),
            (20 + Math.random()*3).toFixed(2),
            (50 + Math.random()*10).toFixed(1),
            ['IDLE','ASCENT','DESCENT'][Math.floor(Math.random()*3)],
          ].join(config.csv.delimiter);
          setRawLines((prev) => [...prev, mk()].slice(-10));
        }, 1000);
      }
    })();
    return () => {
      stopped = true;
      try { unlisten && unlisten(); } catch {}
      if (timer) clearInterval(timer);
    };
  }, [liveEnabled, config.csv.delimiter, debug]);

  function onDropColToKey(colIndex: number, key: string) {
    const exist = mapping.find((m) => m.key === key);
    const entry: CsvMapping = { index: colIndex, key, type: guessType(key), visual: guessVisual(key), units: guessUnits(key) };
    const next = exist ? mapping.map((m) => (m.key === key ? entry : m)) : [...mapping, entry];
    setConfig({ csv: { ...config.csv, mapping: next } });
    coreSetMapping(next).catch(() => {});
  }

  function guessType(key: string) {
    return (['mode','gnssFix'].includes(key)) ? 'string' : (key === 't' ? 'number' : 'number');
  }
  function guessVisual(key: string): VisualType {
    if (key === 'lat' || key === 'lon') return 'map';
    if (['pressure','temperature','altitude'].includes(key as string)) return 'chart';
    if (['mode','battery','gnssFix','rssi'].includes(key as string)) return 'label';
    return 'hidden';
  }
  function guessUnits(key: string) {
    const u: Record<string,string> = { pressure: 'hPa', temperature: '°C', altitude: 'm', battery: '%', rssi: 'dBm' };
    return u[key as string];
  }

  // Column-centric assignment: select what each column represents
  function setColumnKey(colIndex: number, key: string | 'none') {
    let next = config.csv.mapping.slice();
    // remove existing mapping that uses this column
    next = next.filter((m) => m.index !== colIndex);
    if (key !== 'none') {
      // remove any existing mapping for the same key
      next = next.filter((m) => m.key !== key);
      const entry: CsvMapping = {
        index: colIndex,
        key,
        type: guessType(key),
        visual: guessVisual(key),
        units: guessUnits(key),
      };
      next.push(entry);
    }
    setConfig({ csv: { ...config.csv, mapping: next } });
    coreSetMapping(next).catch(() => {});
  }

  function savePreset() {
    const presets = { ...config.csv.presets, [presetName]: mapping };
    setConfig({ csv: { ...config.csv, presets } });
  }
  function loadPreset() {
    const p = config.csv.presets[presetName];
    if (p) setConfig({ csv: { ...config.csv, mapping: p } });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card">
        <div className="mb-2 text-sm font-medium">Columns</div>
        <div className="flex flex-wrap gap-3 mb-2 items-center text-sm">
          <label className="text-sm">Delimiter</label>
          <select
            className="text-sm rounded border px-2 py-1 bg-transparent"
            value={config.csv.delimiter}
            onChange={(e)=> setConfig({ csv: { ...config.csv, delimiter: e.target.value as any } })}
          >
            <option value=",">,</option>
            <option value=";">;</option>
            <option value="	">Tab</option>
          </select>
          <label className="ml-4 text-sm">Header</label>
          <input type="checkbox" checked={config.csv.header} onChange={(e)=> setConfig({ csv: { ...config.csv, header: e.target.checked } })} />
          <label className="ml-4 text-sm">UART live</label>
          <input type="checkbox" checked={liveEnabled} onChange={(e)=> setLiveEnabled(e.target.checked)} />
          <Button variant="outline" onClick={() => setRawLines([])}>Clear</Button>
        </div>
        <div className="space-y-2">
          {(liveEnabled && rawLines.length>0 ? rawLines[rawLines.length - 1].split(config.csv.delimiter) : preview[0].split(config.csv.delimiter)).map((col, idx) => {
            const mcol = mapping.find((m) => m.index === idx);
            const mapped = mcol?.key as string | undefined;
            return (
              <div key={idx}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', String(idx))}
                className="p-2 rounded border bg-white dark:bg-neutral-900 text-sm flex flex-col gap-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    <span className="text-xs text-neutral-500 mr-1">{idx}:</span> {col}
                  </span>
                  <select
                    className="text-xs rounded border px-1 py-0.5 bg-transparent"
                    value={mapped ?? ''}
                    onChange={(e) => setColumnKey(idx, (e.target.value || 'none') as any)}
                    aria-label={`column ${idx} key`}
                  >
                    <option value="">— none —</option>
                    {(config.csv.keyOptions || telemetryKeys.map(String)).map((k) => (
                      <option key={String(k)} value={String(k)}>{String(k)}</option>
                    ))}
                  </select>
                </div>
                {mapped && (
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs">type</label>
                    <select
                      className="text-xs rounded border px-1 py-0.5 bg-transparent"
                      value={mcol?.type || guessType(mapped)}
                      onChange={(e) => patchColumn(idx, { type: e.target.value as FieldType })}
                    >
                      {(['number','string','boolean'] as FieldType[]).map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <label className="text-xs">visual</label>
                    <select
                      className="text-xs rounded border px-1 py-0.5 bg-transparent"
                      value={mcol?.visual || guessVisual(mapped)}
                      onChange={(e) => patchColumn(idx, { visual: e.target.value as VisualType })}
                    >
                      {(['map','chart','label','hidden'] as VisualType[]).map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <label className="text-xs">units</label>
                    <input
                      className="text-xs rounded border px-1 py-0.5 bg-transparent w-20"
                      value={mcol?.units || ''}
                      onChange={(e) => patchColumn(idx, { units: e.target.value })}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3">
          <div className="text-sm font-medium mb-1">{liveEnabled ? 'UART Live (last 10 lines)' : (config.csv.header ? 'Preview (header+10 lines)' : 'Preview (10 lines)')}</div>
          <div className="h-40 overflow-auto text-xs font-mono whitespace-pre rounded border p-2 bg-neutral-50 dark:bg-neutral-900">{(liveEnabled ? rawLines : preview).join('\n')}</div>
        </div>
      </div>
      <div className="card">
        <div className="mb-2 text-sm font-medium">Map Keys</div>
        <div className="grid grid-cols-2 gap-2">
          {(config.csv.keyOptions || telemetryKeys.map(String)).map((k) => (
            <DropZone key={String(k)} label={String(k)} onDropCol={(i) => onDropColToKey(i, String(k))} mapping={mapping.find((m) => m.key === String(k))} />
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Input placeholder="preset name" value={presetName} onChange={(e) => setPresetName(e.target.value)} />
          <Button onClick={savePreset}>Save Preset</Button>
          <Button variant="outline" onClick={loadPreset}>Load Preset</Button>
        </div>
        <div className="mt-4">
          <div className="text-sm font-medium mb-2">キーの管理</div>
          <KeyManager />
        </div>
      </div>
    </div>
  );
}

function DropZone({ label, onDropCol, mapping }: { label: string; onDropCol: (idx: number) => void; mapping?: CsvMapping }) {
  const [over, setOver] = React.useState(false);
  const config = useStore((s) => s.config);
  const setConfig = useStore((s) => s.setConfig);
  function patchMapping(p: Partial<CsvMapping>) {
    if (!mapping) return;
    const next = config.csv.mapping.map((m) => (m.key === mapping.key ? { ...m, ...p } : m));
    setConfig({ csv: { ...config.csv, mapping: next } });
  }
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); const idx = Number(e.dataTransfer.getData('text/plain')); onDropCol(idx); setOver(false); }}
      className={`rounded-lg border p-2 text-sm ${over ? 'border-blue-500' : 'border-neutral-300 dark:border-neutral-700'}`}
      aria-label={`drop to map ${label}`}
    >
      <div className="text-neutral-500">{label}</div>
      {!mapping ? (
        <div className="mt-1 font-mono text-xs">—</div>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="text-xs">col {mapping.index}</div>
          <div className="flex items-center gap-2">
            <label className="text-xs">type</label>
            <select value={mapping.type} onChange={(e) => patchMapping({ type: e.target.value as FieldType })} className="text-xs rounded border px-1 py-0.5 bg-transparent">
              {(['number','string','boolean'] as FieldType[]).map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <label className="text-xs">visual</label>
            <select value={mapping.visual} onChange={(e) => patchMapping({ visual: e.target.value as any })} className="text-xs rounded border px-1 py-0.5 bg-transparent">
              {(['map','chart','label','hidden'] as VisualType[]).map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <label className="text-xs">units</label>
            <input value={mapping.units ?? ''} onChange={(e) => patchMapping({ units: e.target.value })} className="text-xs rounded border px-1 py-0.5 bg-transparent" />
          </div>
        </div>
      )}
    </div>
  );
}

function KeyManager() {
  const config = useStore((s) => s.config);
  const setConfig = useStore((s) => s.setConfig);
  const [newKey, setNewKey] = React.useState('');
  const keys = (config.csv.keyOptions || telemetryKeys.map(String));
  const reserved = new Set(['t','lat','lon']);
  const add = () => {
    const k = newKey.trim();
    if (!k || keys.includes(k)) return;
    setConfig({ csv: { ...config.csv, keyOptions: [...keys, k] } as any });
    setNewKey('');
  };
  const remove = (k: string) => {
    if (reserved.has(k)) return;
    const nextKeys = keys.filter((x) => x !== k);
    const nextMapping = (config.csv.mapping || []).filter((m) => m.key !== k);
    setConfig({ csv: { ...config.csv, keyOptions: nextKeys, mapping: nextMapping } as any });
    coreSetMapping(nextMapping).catch(()=>{});
  };
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <Input placeholder="new key" value={newKey} onChange={(e)=>setNewKey(e.target.value)} />
        <Button onClick={add}>追加</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {keys.map((k) => (
          <span key={k} className="inline-flex items-center gap-1 text-xs border rounded px-2 py-0.5">
            {k}
            {!reserved.has(k) && (
              <button className="text-red-500" aria-label={`remove ${k}`} onClick={()=>remove(k)}>×</button>
            )}
          </span>
        ))}
      </div>
      <div className="text-xs text-neutral-500 mt-1">※ t/lat/lon は必須のため削除不可</div>
    </div>
  );
}

// Patch helpers to modify a mapping entry by column index while preserving other fields
function patchColumn(colIndex: number, p: Partial<CsvMapping>) {
  const cfg = useStore.getState().config;
  let next = cfg.csv.mapping.slice();
  const i = next.findIndex((m) => m.index === colIndex);
  if (i >= 0) {
    next[i] = { ...next[i], ...p } as CsvMapping;
  } else {
    // if user edits visual/type/units before setting key, ignore
    return;
  }
  useStore.getState().setConfig({ csv: { ...cfg.csv, mapping: next } as any });
  coreSetMapping(next).catch(()=>{});
}
