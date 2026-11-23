import { CLASSES, type ClassId } from '../data/classes';
import { item, type Bonus } from '../data/items';
import { skill } from '../data/skills';

export type StatKey = 'str' | 'agi' | 'vit' | 'int' | 'dex' | 'luk';
export const STAT_KEYS: StatKey[] = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];
export type EquipSlot = 'arma' | 'armadura' | 'acessorio';

export interface InvEntry { id: string; n: number }

export interface CharData {
  v: 1;
  name: string;
  cls: ClassId;
  baseLv: number;
  baseExp: number;
  jobLv: number;
  jobExp: number;
  statPoints: number;
  skillPoints: number;
  stats: Record<StatKey, number>;
  skills: Record<string, number>;
  inv: InvEntry[];
  equip: Partial<Record<EquipSlot, string>>;
  zeny: number;
  hp: number;
  sp: number;
  map: string;
  x: number;
  y: number;
  mvpKills: number;
}

export const MAX_BASE = 99;

/** Exp para passar do nível lv para lv+1 */
export function baseNeed(lv: number) {
  return Math.floor(18 * Math.pow(lv, 1.85));
}
export function jobNeed(cls: ClassId, lv: number) {
  return cls === 'aprendiz' ? Math.floor(6 * Math.pow(lv, 1.4)) : Math.floor(12 * Math.pow(lv, 1.6));
}
/** Pontos de atributo ao subir para o nível lv */
export function pointsForLevel(lv: number) {
  return Math.floor((lv - 1) / 5) + 3;
}
/** Custo para subir um atributo que está em v */
export function statCost(v: number) {
  return Math.floor((v - 1) / 10) + 2;
}

export function newChar(name: string): CharData {
  return {
    v: 1, name, cls: 'aprendiz', baseLv: 1, baseExp: 0, jobLv: 1, jobExp: 0,
    statPoints: 48, skillPoints: 0,
    stats: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 },
    skills: { 'primeiros-socorros': 1 },
    inv: [{ id: 'pocao-vermelha', n: 8 }, { id: 'asa-mosca', n: 3 }, { id: 'faca', n: 1 }, { id: 'roupa-aprendiz', n: 1 }],
    equip: { arma: 'faca', armadura: 'roupa-aprendiz' },
    zeny: 500, hp: 9999, sp: 9999, map: 'campos', x: -1, y: -1, mvpKills: 0,
  };
}

export interface Buffs {
  /** +AGI e +DES da Concentração */
  conc?: { amount: number; until: number };
}

export interface Derived {
  stats: Record<StatKey, number>;
  bonusStats: Record<StatKey, number>;
  maxHp: number;
  maxSp: number;
  atk: number;
  weaponAtk: number;
  matkMin: number;
  matkMax: number;
  hit: number;
  flee: number;
  crit: number;
  def: number;
  softDef: number;
  mdef: number;
  delay: number;
  aspd: number;
  range: number;
  ranged: boolean;
  speed: number;
  castFactor: number;
  hpRegen: number;
  spRegen: number;
}

function addBonus(acc: Bonus, b?: Bonus) {
  if (!b) return;
  for (const [k, v] of Object.entries(b) as [keyof Bonus, number][]) acc[k] = (acc[k] ?? 0) + v;
}

export function derive(c: CharData, buffs: Buffs = {}, now = 0): Derived {
  const cls = CLASSES[c.cls];
  const bonus: Bonus = {};
  let weaponAtk = 0, weaponMatk = 0, def = 0;
  const weapon = c.equip.arma ? item(c.equip.arma) : undefined;
  for (const id of Object.values(c.equip)) {
    if (!id) continue;
    const it = item(id);
    weaponAtk += it.atk ?? 0;
    weaponMatk += it.matk ?? 0;
    def += it.def ?? 0;
    addBonus(bonus, it.bonus);
  }
  const lv = (id: string) => c.skills[id] ?? 0;
  bonus.dex = (bonus.dex ?? 0) + lv('olhos-coruja');
  if (buffs.conc && buffs.conc.until > now) {
    bonus.agi = (bonus.agi ?? 0) + buffs.conc.amount;
    bonus.dex = (bonus.dex ?? 0) + buffs.conc.amount;
  }
  const bonusStats = { str: bonus.str ?? 0, agi: bonus.agi ?? 0, vit: bonus.vit ?? 0, int: bonus.int ?? 0, dex: bonus.dex ?? 0, luk: bonus.luk ?? 0 };
  const s = { ...c.stats };
  for (const k of STAT_KEYS) s[k] += bonusStats[k];

  const L = c.baseLv;
  const ranged = weapon?.weapon === 'arco';
  // Atq de status: o atributo principal é FOR (ou DES com arco)
  const main = ranged ? s.dex : s.str;
  const second = ranged ? s.str : s.dex;
  const mastery = weapon && (weapon.weapon === 'espada' || weapon.weapon === 'faca') ? lv('pericia-espada') * 4 : 0;
  const statusAtk = main + Math.floor(main / 10) ** 2 + Math.floor(second / 5) + Math.floor(s.luk / 5);
  const atk = statusAtk + weaponAtk + mastery + (bonus.atk ?? 0);

  const maxHp = Math.floor((40 + cls.hpLv * L + 0.04 * cls.hpLv * L * L) * (1 + s.vit / 100)) + (bonus.maxHp ?? 0);
  const maxSp = Math.floor((10 + cls.spLv * L) * (1 + s.int / 100)) + (bonus.maxSp ?? 0);
  const matkMin = s.int + Math.floor(s.int / 7) ** 2 + weaponMatk;
  const matkMax = s.int + Math.floor(s.int / 5) ** 2 + weaponMatk;

  const aspdFactor = 1 + s.agi * 0.03 + s.dex * 0.006;
  const delay = Math.max(0.25, cls.baseDelay / aspdFactor);
  const range = ranged ? 300 + lv('olhos-aguia') * 14 : 58;
  const hpRegen = Math.max(1, Math.floor(maxHp / 120 + s.vit / 4)) + lv('recuperar-hp') * 5 + Math.floor(maxHp * lv('recuperar-hp') * 0.002);
  const spRegen = 1 + Math.floor(maxSp / 80 + s.int / 5) + lv('recuperar-sp') * 3;

  return {
    stats: s, bonusStats, maxHp, maxSp, atk, weaponAtk, matkMin, matkMax,
    hit: L + s.dex + Math.floor(s.luk / 3) + lv('olhos-aguia') + (bonus.hit ?? 0),
    flee: L + s.agi + Math.floor(s.luk / 5) + (bonus.flee ?? 0),
    crit: 1 + s.luk * 0.3 + (bonus.crit ?? 0),
    def: def + (bonus.def ?? 0),
    softDef: Math.floor(s.vit / 2),
    mdef: Math.floor(s.int / 2),
    delay, aspd: Math.round(200 - delay * 50),
    range, ranged,
    speed: 175,
    castFactor: Math.max(0, 1 - s.dex / 150),
    hpRegen, spRegen,
  };
}

/** Pode usar o item? Devolve o motivo quando não pode */
export function canEquip(c: CharData, id: string): string | null {
  const it = item(id);
  if (it.classes && !it.classes.includes(c.cls)) return `${CLASSES[c.cls].name} não pode usar este item.`;
  if (it.weapon && !CLASSES[c.cls].weapons.includes(it.weapon)) return `${CLASSES[c.cls].name} não usa este tipo de arma.`;
  if (it.reqLv && c.baseLv < it.reqLv) return `Precisa do nível ${it.reqLv}.`;
  return null;
}

export function invCount(c: CharData, id: string) {
  return c.inv.find((e) => e.id === id)?.n ?? 0;
}
export function invAdd(c: CharData, id: string, n = 1) {
  const e = c.inv.find((x) => x.id === id);
  if (e) e.n += n;
  else c.inv.push({ id, n });
}
export function invRemove(c: CharData, id: string, n = 1) {
  const e = c.inv.find((x) => x.id === id);
  if (!e || e.n < n) return false;
  e.n -= n;
  if (e.n <= 0) {
    c.inv.splice(c.inv.indexOf(e), 1);
    for (const slot of Object.keys(c.equip) as EquipSlot[]) if (c.equip[slot] === id && invCount(c, id) === 0) delete c.equip[slot];
  }
  return true;
}

/** Motivo pelo qual não dá para aprender o próximo nível da habilidade (ou null) */
export function cannotLearn(c: CharData, id: string): string | null {
  const sk = skill(id);
  const cur = c.skills[id] ?? 0;
  if (sk.cls !== c.cls && !(sk.cls === 'aprendiz')) return 'Habilidade de outra classe.';
  if (cur >= sk.max) return 'Nível máximo.';
  if (c.skillPoints <= 0) return 'Sem pontos de habilidade.';
  if (sk.req && (c.skills[sk.req[0]] ?? 0) < sk.req[1]) return `Precisa de ${skill(sk.req[0]).name} nível ${sk.req[1]}.`;
  return null;
}
