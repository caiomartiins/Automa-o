/**
 * Progresso guardado entre partidas (zeny, compras da loja, refino, mascote, mapa).
 * Fica no armazenamento do navegador deste aparelho; se não estiver disponível
 * (aba anônima, por exemplo), o jogo funciona normalmente, só não guarda.
 */
export interface SaveData {
  zeny: number;
  up: Record<string, number>;
  refine: number;
  pet: string | null;
  map: string;
  best: { time: number; level: number };
}

const KEY = 'ascensao-do-cavaleiro:save';

const fresh = (): SaveData => ({ zeny: 0, up: {}, refine: 0, pet: null, map: 'campo', best: { time: 0, level: 0 } });

let cache: SaveData | null = null;

export function loadSave(): SaveData {
  if (cache) return cache;
  let data = fresh();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = { ...data, ...JSON.parse(raw) };
  } catch {
    /* sem armazenamento: segue com o padrão */
  }
  cache = data;
  return data;
}

export function writeSave(data: SaveData) {
  cache = data;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* sem armazenamento: o progresso vale só nesta sessão */
  }
}
