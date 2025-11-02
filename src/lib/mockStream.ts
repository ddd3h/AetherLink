// Simple mock telemetry stream without external deps
import { Telemetry } from '../types';

type Subscriber = (t: Telemetry) => void;

class MockStream {
  private timer: number | null = null;
  private subs = new Set<Subscriber>();
  private base = { lat: 35.68, lon: 139.76 };
  private i = 0;
  private speed = 1; // playback speed multiplier
  private mode: 'live' | 'replay' = 'live';

  subscribe(fn: Subscriber) {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }

  private emit(t: Telemetry) {
    this.subs.forEach((fn) => fn(t));
  }

  start() {
    this.stop();
    this.mode = 'live';
    this.i = 0;
    this.timer = window.setInterval(() => {
      const now = Date.now();
      const t = this.generate(now, this.i++);
      this.emit(t);
    }, 1000);
  }

  stop() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
  }

  play(fileId: string, speed: 0.5 | 1 | 2 = 1) {
    // replay synthetic dataset keyed by fileId
    this.stop();
    this.mode = 'replay';
    this.speed = speed;
    const start = Date.now();
    let idx = 0;
    const length = 600; // 10min @1Hz
    this.timer = window.setInterval(() => {
      const ts = start + idx * 1000;
      const t = this.generate(ts, idx, fileId);
      this.emit(t);
      idx++;
      if (idx >= length) idx = 0; // loop
    }, 1000 / this.speed);
  }

  private generate(ts: number, i: number, seed: string = 'live'): Telemetry {
    // small drift in lat/lon
    const drift = i * 0.0003;
    const lat = this.base.lat + Math.sin(i / 60 + seed.length) * 0.01 + drift * 0.01;
    const lon = this.base.lon + Math.cos(i / 60 + seed.length) * 0.01 + drift * 0.01;
    // metrics with sine + noise
    const pressure = 1013 + Math.sin(i / 50) * 5 + (Math.random() - 0.5) * 0.5;
    const temperature = 20 + Math.sin(i / 40) * 3 + (Math.random() - 0.5) * 0.3;
    const altitude = 50 + Math.sin(i / 30) * 20 + (Math.random() - 0.5) * 2;
    const battery = Math.max(0, 100 - i * 0.01);
    const rssi = -60 - Math.abs(Math.sin(i / 70)) * 20 + (Math.random() - 0.5) * 2;
    const modes = ['IDLE', 'ASCENT', 'CRUISE', 'DESCENT'];
    const gnss: Telemetry['gnssFix'][] = ['none', '2D', '3D', 'RTK'];
    return {
      t: ts,
      lat,
      lon,
      pressure: Number(pressure.toFixed(2)),
      temperature: Number(temperature.toFixed(2)),
      altitude: Number(altitude.toFixed(1)),
      mode: modes[Math.floor(i / 120) % modes.length],
      battery: Number(battery.toFixed(1)),
      gnssFix: gnss[Math.floor(i / 90) % gnss.length],
      rssi: Math.round(rssi),
    };
  }
}

export const mockStream = new MockStream();

