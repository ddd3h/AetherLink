// CSV mapping drag & drop UI (mock)
import React from 'react';
import { useStore } from '../store';
import type { CsvMapping, Telemetry, VisualType } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { setMapping as coreSetMapping } from '../lib/api';

const telemetryKeys: (keyof Telemetry)[] = ['t','lat','lon','pressure','temperature','altitude','mode','battery','gnssFix','rssi'];

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
  const mapping = config.csv.mapping;
  const [presetName, setPresetName] = React.useState('default');
  const preview = useDummyCSV(config.csv.header, config.csv.delimiter);

  function onDropColToKey(colIndex: number, key: keyof Telemetry) {
    const exist = mapping.find((m) => m.key === key);
    const entry: CsvMapping = { index: colIndex, key, type: guessType(key), visual: guessVisual(key), units: guessUnits(key) };
    const next = exist ? mapping.map((m) => (m.key === key ? entry : m)) : [...mapping, entry];
    setConfig({ csv: { ...config.csv, mapping: next } });
    coreSetMapping(next).catch(() => {});
  }

  function guessType(key: keyof Telemetry) {
    return (['mode','gnssFix'] as (keyof Telemetry)[]).includes(key) ? 'string' : (key === 't' ? 'number' : 'number');
  }
  function guessVisual(key: keyof Telemetry): VisualType {
    if (key === 'lat' || key === 'lon') return 'map';
    if (['pressure','temperature','altitude'].includes(key as string)) return 'chart';
    if (['mode','battery','gnssFix','rssi'].includes(key as string)) return 'label';
    return 'hidden';
  }
  function guessUnits(key: keyof Telemetry) {
    const u: Record<string,string> = { pressure: 'hPa', temperature: '°C', altitude: 'm', battery: '%', rssi: 'dBm' };
    return u[key as string];
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
        <div className="space-y-1">
          {preview[0].split(config.csv.delimiter).map((col, idx) => (
            <div key={idx}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', String(idx))}
              className="px-2 py-1 rounded border bg-white dark:bg-neutral-900 text-sm"
            >
              {idx}: {col}
            </div>
          ))}
        </div>
        <div className="mt-3">
          <div className="text-sm font-medium mb-1">{config.csv.header ? 'Preview (header+10 lines)' : 'Preview (10 lines)'}</div>
          <div className="h-40 overflow-auto text-xs font-mono whitespace-pre rounded border p-2 bg-neutral-50 dark:bg-neutral-900">{preview.join('\n')}</div>
        </div>
      </div>
      <div className="card">
        <div className="mb-2 text-sm font-medium">Map Keys</div>
        <div className="grid grid-cols-2 gap-2">
          {telemetryKeys.map((k) => (
            <DropZone key={k as string} label={String(k)} onDropCol={(i) => onDropColToKey(i, k)} mapping={mapping.find((m) => m.key === k)} />
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Input placeholder="preset name" value={presetName} onChange={(e) => setPresetName(e.target.value)} />
          <Button onClick={savePreset}>Save Preset</Button>
          <Button variant="outline" onClick={loadPreset}>Load Preset</Button>
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
          <div className="text-xs">col {mapping.index} · {mapping.type}</div>
          <div className="flex items-center gap-2">
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
