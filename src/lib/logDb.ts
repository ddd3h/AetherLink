// Simple logs database using localStorage (CSV stored inline)
// Note: For production, migrate to IndexedDB or Tauri-side store.

export type DbLog = { id: string; name: string; createdAt: string; csv: string };

const KEY = 'logs_db_v1';

function readAll(): DbLog[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DbLog[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: DbLog[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function listLogs(): DbLog[] {
  return readAll();
}

export function addLog(name: string, csv: string): DbLog {
  const list = readAll();
  const id = `db:${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const item: DbLog = { id, name, createdAt: new Date().toISOString(), csv };
  list.push(item);
  writeAll(list);
  return item;
}

export function renameLog(id: string, newName: string) {
  const list = readAll();
  const i = list.findIndex((l) => l.id === id);
  if (i >= 0) {
    list[i].name = newName;
    writeAll(list);
  }
}

export function deleteLog(id: string) {
  const list = readAll().filter((l) => l.id !== id);
  writeAll(list);
}

export function getCsv(id: string): string | null {
  const list = readAll();
  return list.find((l) => l.id === id)?.csv ?? null;
}

