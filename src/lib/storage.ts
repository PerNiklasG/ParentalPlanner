import type { Config, DayEntry } from "../domain/types";

const STORAGE_KEY = "plp_v1_entries";
const STORAGE_CFG = "plp_v1_config";

export function loadEntries(): Record<string, DayEntry> {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw? JSON.parse(raw): {}; } catch { return {}; }
}
export function saveEntries(dict: Record<string, DayEntry>) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dict)); } catch {}
}
export function loadConfig(): Config | null {
  try { const raw = localStorage.getItem(STORAGE_CFG); return raw? JSON.parse(raw): null; } catch { return null; }
}
export function saveConfig(cfg: Config) { try { localStorage.setItem(STORAGE_CFG, JSON.stringify(cfg)); } catch {}
}