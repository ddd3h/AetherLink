// Tauri API boundary. モックはフォールバックとして残す

import type { Telemetry, CsvMapping, AppConfig } from "../types";
import { useStore } from "../store";

export type SerialPortInfo = {
  id: string;
  path?: string;
  manufacturer?: string;
  name?: string;
  vid?: number;
  pid?: number;
};

// ---- 環境判定 ----
export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  return (
    Boolean(w.__TAURI__) ||
    "__TAURI_INTERNALS__" in w ||
    "__TAURI_IPC__" in w
  );
}

// Vite の事前解析を避けるため import パスは文字列リテラルにしない
const TAURI_EVENT_MOD = "@tauri-apps/api/event";
const TAURI_TAURI_MOD = "@tauri-apps/api/tauri";

// ---- イベント購読（Tauri時のみ）----
let listenersInit = false;
export async function initBackendListeners() {
  if (!isTauri() || listenersInit) return;
  listenersInit = true;

  // @vite-ignore を付け、変数経由で import する
  // @ts-ignore
  const { listen } = await import(/* @vite-ignore */ TAURI_EVENT_MOD);

  listen<Telemetry>("telemetry", (e) => {
    if (useStore.getState().config.debug) return; // ignore real UART while debug mode is ON
    useStore.getState().append(e.payload);
  });

  listen<{ level: string; message: string }>("status", (e) => {
    console.debug("[status]", e.payload);
  });
}

// ---- Tauri invoke の薄いラッパ ----
async function tauriInvoke<T = any>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  if (!isTauri()) throw new Error("not-tauri");
  // @ts-ignore
  const { invoke } = await import(/* @vite-ignore */ TAURI_TAURI_MOD);
  return invoke<T>(cmd, args);
}

// ---- Public API（ブラウザはモックへ）----

export async function listPorts(): Promise<SerialPortInfo[]> {
  if (isTauri()) {
    const res = (await tauriInvoke<any[]>("list_ports")) ?? [];
    return res.map((p) => ({
      id: p.id || p.name,
      path: p.name,
      manufacturer: p.manufacturer,
      name: p.name,
      vid: p.vid,
      pid: p.pid,
    }));
  }
  // mock
  await new Promise((r) => setTimeout(r, 150));
  return [
    { id: "ttyUSB0", path: "/dev/ttyUSB0", manufacturer: "Acme Devices" },
    { id: "COM3", path: "COM3", manufacturer: "Generic" },
  ];
}

export async function startAutodetect(): Promise<void> {
  if (isTauri()) {
    await tauriInvoke("start_autodetect");
    return;
  }
  // mock
  await new Promise((r) => setTimeout(r, 150));
}

export async function connect(portId: string, baud: number): Promise<void> {
  if (isTauri()) {
    await initBackendListeners();
    await tauriInvoke("connect", { port_id: portId, baud, mapping_id: null });
    return;
  }
  console.log("mock connect", { portId, baud });
}

export async function disconnect(): Promise<void> {
  if (isTauri()) {
    await tauriInvoke("disconnect");
    return;
  }
  console.log("mock disconnect");
}

export async function setMapping(mapping: CsvMapping[]): Promise<void> {
  if (!isTauri()) return;
  await tauriInvoke("set_mapping", { mapping });
}

export async function startLogging(
  dir: string,
  rotationMB: number
): Promise<void> {
  if (!isTauri()) return;
  await tauriInvoke("start_logging", {
    dir,
    rotationMb: rotationMB,
    rotation_mb: rotationMB, // 互換キー
  });
}

export async function stopLogging(): Promise<void> {
  if (!isTauri()) return;
  await tauriInvoke("stop_logging");
}

export type LogMeta = { file: string; size: number; modified: string };
export async function listLogs(dir: string): Promise<LogMeta[]> {
  if (!isTauri()) return [];
  return tauriInvoke<LogMeta[]>("list_logs", { dir });
}

export async function playLog(file: string, speed: number): Promise<void> {
  if (!isTauri()) return;
  await tauriInvoke("play_log", { file, speed });
}

export async function stopPlay(): Promise<void> {
  if (!isTauri()) return;
  await tauriInvoke("stop_play");
}

export async function getConfig(): Promise<any> {
  if (!isTauri()) return {};
  return tauriInvoke("get_config");
}

export async function setConfigCore(cfg: AppConfig): Promise<void> {
  if (!isTauri()) return;
  await tauriInvoke("set_config", { cfg });
}

// ---- Offline tiles ----
export type TilePackMeta = { name: string; path: string; zmin: number; zmax: number };
export async function listTilePacks(dir: string): Promise<TilePackMeta[]> {
  if (!isTauri()) return [];
  return tauriInvoke<TilePackMeta[]>("list_tile_packs", { dir });
}
export async function deleteTilePack(path: string): Promise<void> {
  if (!isTauri()) return;
  await tauriInvoke("delete_tile_pack", { path });
}
export async function startTileDownload(params: {
  name: string;
  template: string;
  north: number;
  south: number;
  east: number;
  west: number;
  zmin: number;
  zmax: number;
  dir: string;
}): Promise<void> {
  if (!isTauri()) return;
  await tauriInvoke("start_tile_download", params as any);
}

// Logs: rename
export async function renameLog(oldPath: string, newBaseName: string): Promise<string | null> {
  if (!isTauri()) return null;
  return tauriInvoke<string>("rename_log", { oldPath, newBaseName });
}

export async function deleteLog(path: string): Promise<void> {
  if (!isTauri()) return;
  await tauriInvoke("delete_log", { path });
}
