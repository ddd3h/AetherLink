// CSV IO helpers for telemetry logging/reading (UI-side)
import type { Telemetry, CsvMapping } from '../types';

export function toCsvHeader(): string {
  return 't,lat,lon,pressure,temperature,altitude,mode,battery,gnssFix,rssi';
}

export function telemetryToCsv(t: Telemetry): string {
  const f = (v: number | undefined) => (v === undefined ? '' : String(v));
  const s = (v: string | undefined) => v ?? '';
  return [
    t.t,
    f(t.lat),
    f(t.lon),
    f(t.pressure),
    f(t.temperature),
    f(t.altitude),
    s(t.mode),
    f(t.battery),
    s(t.gnssFix),
    t.rssi ?? ''
  ].join(',');
}

export function parseCsvLine(line: string, mapping: CsvMapping[], sepGuess?: string): Telemetry {
  const sep = sepGuess ?? (line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',');
  const parts = line.trim().split(sep);
  const t: Telemetry = { t: Date.now() };
  for (const m of mapping) {
    const val = parts[m.index];
    if (val == null) continue;
    switch (m.key) {
      case 't': t.t = Number(val) || t.t; break;
      case 'lat': (t as any).lat = Number(val); break;
      case 'lon': (t as any).lon = Number(val); break;
      case 'pressure': (t as any).pressure = Number(val); break;
      case 'temperature': (t as any).temperature = Number(val); break;
      case 'altitude': (t as any).altitude = Number(val); break;
      case 'mode': (t as any).mode = String(val); break;
      case 'battery': (t as any).battery = Number(val); break;
      case 'gnssFix': (t as any).gnssFix = String(val) as any; break;
      case 'rssi': (t as any).rssi = Number(val); break;
    }
  }
  return t;
}

