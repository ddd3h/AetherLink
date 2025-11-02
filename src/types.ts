// Type definitions for telemetry and app config
export type FieldType = 'number' | 'string' | 'boolean';
export type VisualType = 'map' | 'chart' | 'label' | 'hidden';

export type CsvMapping = {
  index: number; // CSV column index (0-based)
  key: keyof Telemetry; // mapped key
  type: FieldType;
  units?: string;
  visual: VisualType;
};

export type Telemetry = {
  t: number; // epoch ms
  lat?: number;
  lon?: number;
  pressure?: number; // hPa
  temperature?: number; // °C
  altitude?: number; // m
  mode?: string;
  battery?: number; // %
  gnssFix?: 'none' | '2D' | '3D' | 'RTK';
  rssi?: number; // dBm
};

export type AppConfig = {
  theme: 'light' | 'dark' | 'system';
  language: 'ja' | 'en';
  autodetect: boolean;
  serial: {
    preferredVendorIds: number[];
    baudCandidates: number[];
    selectedPortId?: string | null; // manual selection
    selectedBaud?: number | null;
  };
  csv: {
    delimiter: ',' | ';' | '\t';
    header: boolean;
    mapping: CsvMapping[];
    presets: Record<string, CsvMapping[]>;
  };
  logging: {
    enabled: boolean;
    directory: string;
    rotationMB: number;
  };
  ui: {
    autoFollow: boolean;
  };
  map?: {
    providerUrl: string; // XYZ template
    useOffline: boolean;
    offlineDir: string;
    activePack?: string | null; // path to pack dir
  };
};
