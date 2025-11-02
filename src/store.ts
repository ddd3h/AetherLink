import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppConfig, Telemetry } from './types';

type UIState = {
  connected: boolean;
  playing: boolean;
  mode: 'live' | 'replay';
  toast?: { type: 'info' | 'error' | 'success'; message: string } | null;
};

type State = UIState & {
  series: Telemetry[];
  last?: Telemetry;
  seriesMaxLength: number;
  append: (t: Telemetry) => void;
  clear: () => void;
  config: AppConfig;
  setConfig: (patch: Partial<AppConfig>) => void;
  setConnected: (v: boolean) => void;
  setPlaying: (v: boolean) => void;
  setMode: (m: 'live' | 'replay') => void;
  setToast: (t: UIState['toast']) => void;
};

const defaultConfig: AppConfig = {
  theme: 'system',
  language: 'ja',
  autodetect: false,
  serial: {
    preferredVendorIds: [],
    baudCandidates: [9600, 19200, 38400, 57600, 115200],
    selectedPortId: null,
    selectedBaud: 115200,
  },
  csv: {
    delimiter: ',',
    header: true,
    mapping: [],
    presets: {},
    keyOptions: ['t','lat','lon','pressure','temperature','altitude','mode','battery','gnssFix','rssi'],
  },
  logging: {
    enabled: false,
    directory: '',
    rotationMB: 50,
  },
  ui: {
    autoFollow: true,
    followTarget: 'telemetry',
  },
  map: {
    providerUrl: 'http://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}&s=Ga',
    useOffline: false,
    offlineDir: ''
  },
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      series: [],
      last: undefined,
      seriesMaxLength: 5000,
      connected: false,
      playing: false,
      mode: 'live',
      toast: null,
      append: (t) =>
        set(() => {
          const arr = [...get().series, t];
          const max = get().seriesMaxLength;
          const len = arr.length;
          const trimmed = len > max ? arr.slice(len - max) : arr;
          return { series: trimmed, last: t };
        }),
      clear: () => set({ series: [], last: undefined }),
      config: defaultConfig,
      setConfig: (patch) => set({ config: { ...get().config, ...patch } }),
      setConnected: (v) => set({ connected: v }),
      setPlaying: (v) => set({ playing: v }),
      setMode: (m) => set({ mode: m }),
      setToast: (t) => set({ toast: t }),
    }),
    { name: 'ground-station-config' }
  )
);
