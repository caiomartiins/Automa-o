import type { CharData } from './char';

const KEY = 'terras-de-aurora:save:v1';

export function loadChar(): CharData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as CharData;
    return c && c.v === 1 ? c : null;
  } catch {
    return null;
  }
}

export function saveChar(c: CharData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
    return true;
  } catch {
    return false;
  }
}

export function deleteSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* sem armazenamento */
  }
}
