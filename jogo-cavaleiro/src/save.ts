/**
 * Progresso guardado entre partidas (zeny, compras da loja, refino, mascote, mapa).
 * Fica no armazenamento do navegador deste aparelho; se não estiver disponível
 * (aba anônima, por exemplo), o jogo funciona normalmente, só não guarda.
 */
import type { Slot } from './data/equipment';

export interface SaveData {
  zeny: number;
  /** Melhorias da loja antiga (descontinuadas; o zeny é devolvido) */
  up: Record<string, number>;
  /** Refino da arma equipada */
  refine: number;
  /** Refino guardado de cada arma que não está equipada */
  refines: Record<string, number>;
  /** Equipamentos comprados e o que está equipado em cada slot */
  owned: string[];
  equip: Partial<Record<Slot, string>>;
  /** Versão do save (para conversões) */
  v: number;
  pet: string | null;
  map: string;
  best: { time: number; level: number };
}

const KEY = 'ascensao-do-cavaleiro:save';

const fresh = (): SaveData => ({ zeny: 0, up: {}, refine: 0, refines: {}, owned: [], equip: {}, v: 2, pet: null, map: 'campo', best: { time: 0, level: 0 } });

/** Custo das melhorias da loja antiga, para devolver o zeny gasto nelas */
const OLD_SHOP_COST: Record<string, (l: number) => number> = {
  vida: (l) => 80 + l * 70, dano: (l) => 100 + l * 90, pontos: (l) => 150 + l * 120, ima: (l) => 80 + l * 60,
  zeny: (l) => 120 + l * 100, asa: () => 300, pena: () => 700,
};

function migrate(data: SaveData) {
  if ((data.v ?? 1) >= 2) return;
  let refund = 0;
  for (const [id, lv] of Object.entries(data.up ?? {})) {
    const cost = OLD_SHOP_COST[id];
    if (cost) for (let l = 0; l < lv; l++) refund += cost(l);
  }
  data.zeny += refund;
  data.up = {};
  data.owned = data.owned ?? [];
  data.equip = data.equip ?? {};
  data.refines = data.refines ?? {};
  data.v = 2;
}

let cache: SaveData | null = null;

export function loadSave(): SaveData {
  if (cache) return cache;
  let data = fresh();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      data = { ...data, v: 1, ...JSON.parse(raw) };
      migrate(data);
    }
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
