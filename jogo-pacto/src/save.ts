import { STARTERS } from './data/stages';
import { UNIT_BY_ID, maxLevel, xpToNext } from './data/units';

export interface OwnedUnit {
  /** Identificador único deste monstro */
  key: string;
  id: string;
  lv: number;
  xp: number;
}

export interface SaveData {
  units: OwnedUnit[];
  /** Time atual (chaves dos monstros, o primeiro é o líder) */
  team: string[];
  /** Estrelas de cada fase vencida */
  cleared: Record<string, number>;
  crystals: number;
  auto: boolean;
  speed: 1 | 2;
  seenTutorial: boolean;
}

const KEY = 'pacto-dos-ecos-v1';
let data: SaveData | null = null;

function fresh(): SaveData {
  const units = STARTERS.map((id, i) => ({ key: `u${i + 1}`, id, lv: 1, xp: 0 }));
  return { units, team: units.map((u) => u.key), cleared: {}, crystals: 0, auto: false, speed: 1, seenTutorial: false };
}

export function save(): SaveData {
  if (data) return data;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SaveData;
      // descarta monstros que não existem mais
      parsed.units = parsed.units.filter((u) => UNIT_BY_ID[u.id]);
      parsed.team = parsed.team.filter((k) => parsed.units.some((u) => u.key === k));
      data = { ...fresh(), ...parsed };
      return data;
    }
  } catch {
    // sem armazenamento (aba anônima): joga sem salvar
  }
  data = fresh();
  return data;
}

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(save()));
  } catch {
    // ignora
  }
}

export function resetSave() {
  data = fresh();
  persist();
}

export function unitByKey(key: string) {
  return save().units.find((u) => u.key === key);
}

/** Adiciona um monstro novo e devolve a chave */
export function addUnit(id: string, lv = 1): OwnedUnit {
  const s = save();
  const n = s.units.reduce((m, u) => Math.max(m, Number(u.key.slice(1)) || 0), 0) + 1;
  const u = { key: `u${n}`, id, lv: Math.min(lv, maxLevel(UNIT_BY_ID[id].stars)), xp: 0 };
  s.units.push(u);
  if (s.team.length < 4) s.team.push(u.key);
  return u;
}

/** Dá XP e devolve quantos níveis subiu */
export function giveXp(u: OwnedUnit, amount: number) {
  const cap = maxLevel(UNIT_BY_ID[u.id].stars);
  let ups = 0;
  if (u.lv >= cap) return 0;
  u.xp += amount;
  while (u.lv < cap && u.xp >= xpToNext(u.lv)) {
    u.xp -= xpToNext(u.lv);
    u.lv++;
    ups++;
  }
  if (u.lv >= cap) u.xp = 0;
  return ups;
}

export function isUnlocked(stageIndex: number, stageIds: string[]) {
  if (stageIndex === 0) return true;
  return save().cleared[stageIds[stageIndex - 1]] !== undefined;
}
