import type { ClassId } from './classes';
import type { StatKey } from '../game/char';

export type ItemType = 'consumo' | 'etc' | 'arma' | 'armadura' | 'acessorio';
export type WeaponType = 'faca' | 'espada' | 'cajado' | 'arco';
export type IconShape =
  | 'pocao' | 'asa' | 'gosma' | 'pelo' | 'presa' | 'osso' | 'galho' | 'chifre' | 'folha'
  | 'faca' | 'espada' | 'cajado' | 'arco' | 'roupa' | 'cota' | 'manto' | 'colete'
  | 'anel' | 'colar' | 'bracelete' | 'coroa';

export interface Bonus {
  str?: number; agi?: number; vit?: number; int?: number; dex?: number; luk?: number;
  maxHp?: number; maxSp?: number; atk?: number; matk?: number; def?: number; hit?: number; flee?: number; crit?: number;
}

export interface ItemDef {
  id: string;
  name: string;
  type: ItemType;
  /** Preço de compra na loja (0 = não vende) */
  price: number;
  /** Quanto o mercador paga */
  sell: number;
  icon: IconShape;
  color: string;
  desc: string;
  heal?: { hp?: number; sp?: number };
  /** 'mosca' = teletransporte no mapa, 'borboleta' = volta ao ponto de retorno */
  teleport?: 'mosca' | 'borboleta';
  weapon?: WeaponType;
  atk?: number;
  matk?: number;
  def?: number;
  bonus?: Bonus;
  classes?: ClassId[];
  reqLv?: number;
}

const ALL: ClassId[] = ['aprendiz', 'espadachim', 'mago', 'arqueiro'];

export const ITEMS: ItemDef[] = [
  // ---- consumíveis ----
  { id: 'pocao-vermelha', name: 'Poção Vermelha', type: 'consumo', price: 50, sell: 25, icon: 'pocao', color: '#e0453a', desc: 'Recupera 45 de HP.', heal: { hp: 45 } },
  { id: 'pocao-laranja', name: 'Poção Laranja', type: 'consumo', price: 200, sell: 100, icon: 'pocao', color: '#f08a24', desc: 'Recupera 105 de HP.', heal: { hp: 105 } },
  { id: 'pocao-branca', name: 'Poção Branca', type: 'consumo', price: 1200, sell: 600, icon: 'pocao', color: '#f2f2f2', desc: 'Recupera 325 de HP.', heal: { hp: 325 } },
  { id: 'pocao-azul', name: 'Poção Azul', type: 'consumo', price: 600, sell: 300, icon: 'pocao', color: '#3c7ee0', desc: 'Recupera 60 de SP.', heal: { sp: 60 } },
  { id: 'asa-mosca', name: 'Asa de Mosca', type: 'consumo', price: 60, sell: 30, icon: 'asa', color: '#8fa0b8', desc: 'Teletransporta para um lugar aleatório do mapa.', teleport: 'mosca' },
  { id: 'asa-borboleta', name: 'Asa de Borboleta', type: 'consumo', price: 300, sell: 150, icon: 'asa', color: '#e3b84a', desc: 'Leva de volta ao Acampamento Aurora.', teleport: 'borboleta' },

  // ---- espólios ----
  { id: 'gosma-pegajosa', name: 'Gosma Pegajosa', type: 'etc', price: 0, sell: 4, icon: 'gosma', color: '#5fc3e8', desc: 'Restos grudentos de uma Gosma.' },
  { id: 'pelo-lobo', name: 'Pelo de Lobo', type: 'etc', price: 0, sell: 22, icon: 'pelo', color: '#9aa0a8', desc: 'Pelo cinzento e macio.' },
  { id: 'presa-lobo', name: 'Presa de Lobo', type: 'etc', price: 0, sell: 45, icon: 'presa', color: '#efe6cf', desc: 'Presa afiada. Os mercadores pagam bem.' },
  { id: 'osso-velho', name: 'Osso Velho', type: 'etc', price: 0, sell: 32, icon: 'osso', color: '#e8e2cf', desc: 'Osso de um Esqueleto derrotado.' },
  { id: 'galho-ancestral', name: 'Galho Ancestral', type: 'etc', price: 0, sell: 80, icon: 'galho', color: '#8a5a2b', desc: 'Madeira de um Ent Ancião. Ainda pulsa.' },
  { id: 'folha-vital', name: 'Folha Vital', type: 'consumo', price: 0, sell: 120, icon: 'folha', color: '#58c25a', desc: 'Recupera 200 de HP e 20 de SP.', heal: { hp: 200, sp: 20 } },
  { id: 'chifre-bafome', name: 'Chifre do Bafome', type: 'etc', price: 0, sell: 9000, icon: 'chifre', color: '#5a3a6e', desc: 'Prova de que você derrotou o Bafome.' },

  // ---- armas ----
  { id: 'faca', name: 'Faca', type: 'arma', price: 50, sell: 25, icon: 'faca', color: '#cfd6e0', desc: 'Lâmina simples. Qualquer classe usa.', weapon: 'faca', atk: 17, classes: ALL },
  { id: 'espada-curta', name: 'Espada Curta', type: 'arma', price: 600, sell: 300, icon: 'espada', color: '#d9e1ec', desc: 'Espada leve e equilibrada.', weapon: 'espada', atk: 40, classes: ['aprendiz', 'espadachim'] },
  { id: 'espada-larga', name: 'Espada Larga', type: 'arma', price: 2400, sell: 1200, icon: 'espada', color: '#a8c4ff', desc: 'Espada pesada de lâmina larga.', weapon: 'espada', atk: 85, classes: ['espadachim'], reqLv: 15 },
  { id: 'lamina-ossuda', name: 'Lâmina Ossuda', type: 'arma', price: 0, sell: 900, icon: 'espada', color: '#efe6cf', desc: 'Espada feita de osso. Ataque e +1 FOR.', weapon: 'espada', atk: 70, bonus: { str: 1 }, classes: ['espadachim'], reqLv: 10 },
  { id: 'cajado', name: 'Cajado', type: 'arma', price: 500, sell: 250, icon: 'cajado', color: '#b07a3e', desc: 'Cajado de aprendiz de magia.', weapon: 'cajado', atk: 15, matk: 30, classes: ['mago'] },
  { id: 'cajado-carvalho', name: 'Cajado de Carvalho', type: 'arma', price: 2600, sell: 1300, icon: 'cajado', color: '#5db35a', desc: 'Madeira antiga que amplia a magia.', weapon: 'cajado', atk: 25, matk: 70, bonus: { int: 2 }, classes: ['mago'], reqLv: 12 },
  { id: 'arco', name: 'Arco', type: 'arma', price: 700, sell: 350, icon: 'arco', color: '#b07a3e', desc: 'Arco simples de madeira.', weapon: 'arco', atk: 30, classes: ['arqueiro'] },
  { id: 'arco-composto', name: 'Arco Composto', type: 'arma', price: 2800, sell: 1400, icon: 'arco', color: '#7aa0d8', desc: 'Arco reforçado. Ataque e +1 DES.', weapon: 'arco', atk: 75, bonus: { dex: 1 }, classes: ['arqueiro'], reqLv: 15 },

  // ---- armaduras ----
  { id: 'roupa-aprendiz', name: 'Roupa de Aprendiz', type: 'armadura', price: 0, sell: 5, icon: 'roupa', color: '#c9b48a', desc: 'Roupa de quem está começando.', def: 1, classes: ALL },
  { id: 'jaqueta-couro', name: 'Jaqueta de Couro', type: 'armadura', price: 300, sell: 150, icon: 'roupa', color: '#8a5a2b', desc: 'Couro grosso e resistente.', def: 3, classes: ALL },
  { id: 'cota-malha', name: 'Cota de Malha', type: 'armadura', price: 1800, sell: 900, icon: 'cota', color: '#b8c4d4', desc: 'Anéis de ferro entrelaçados.', def: 7, classes: ['espadachim'] },
  { id: 'manto-sabio', name: 'Manto do Sábio', type: 'armadura', price: 1400, sell: 700, icon: 'manto', color: '#4565ad', desc: 'Defesa, +1 INT e +30 SP máximo.', def: 3, bonus: { int: 1, maxSp: 30 }, classes: ['mago'] },
  { id: 'colete-cacador', name: 'Colete de Caçador', type: 'armadura', price: 1500, sell: 750, icon: 'colete', color: '#5c7a3a', desc: 'Defesa e +1 AGI.', def: 5, bonus: { agi: 1 }, classes: ['arqueiro'] },
  { id: 'manto-lobo', name: 'Manto de Pele de Lobo', type: 'armadura', price: 0, sell: 800, icon: 'manto', color: '#9aa0a8', desc: 'Defesa e +2 AGI.', def: 4, bonus: { agi: 2 }, classes: ALL },

  // ---- acessórios ----
  { id: 'anel-gosma', name: 'Anel da Gosma', type: 'acessorio', price: 0, sell: 300, icon: 'anel', color: '#5fc3e8', desc: '+40 HP máximo.', bonus: { maxHp: 40 }, classes: ALL },
  { id: 'colar-presas', name: 'Colar de Presas', type: 'acessorio', price: 0, sell: 600, icon: 'colar', color: '#efe6cf', desc: '+2 FOR.', bonus: { str: 2 }, classes: ALL },
  { id: 'bracelete-ossos', name: 'Bracelete de Ossos', type: 'acessorio', price: 0, sell: 700, icon: 'bracelete', color: '#e8e2cf', desc: '+2 VIT e +3 DEF.', bonus: { vit: 2, def: 3 }, classes: ALL },
  { id: 'coroa-folhas', name: 'Coroa de Folhas', type: 'acessorio', price: 0, sell: 900, icon: 'coroa', color: '#58c25a', desc: '+2 INT e +25 SP máximo.', bonus: { int: 2, maxSp: 25 }, classes: ALL },
  { id: 'anel-bafome', name: 'Anel do Bafome', type: 'acessorio', price: 0, sell: 5000, icon: 'anel', color: '#8e4fc4', desc: '+3 FOR, +3 INT, +3 DES e +5% crítico.', bonus: { str: 3, int: 3, dex: 3, crit: 5 }, classes: ALL },
];

const BY_ID = new Map(ITEMS.map((i) => [i.id, i]));
export function item(id: string): ItemDef {
  const it = BY_ID.get(id);
  if (!it) throw new Error(`item desconhecido: ${id}`);
  return it;
}

export const SHOP_STOCK = [
  'pocao-vermelha', 'pocao-laranja', 'pocao-branca', 'pocao-azul', 'asa-mosca', 'asa-borboleta',
  'faca', 'espada-curta', 'espada-larga', 'cajado', 'cajado-carvalho', 'arco', 'arco-composto',
  'jaqueta-couro', 'cota-malha', 'manto-sabio', 'colete-cacador',
];

export const STAT_LABEL: Record<StatKey, string> = { str: 'FOR', agi: 'AGI', vit: 'VIT', int: 'INT', dex: 'DES', luk: 'SOR' };

export function bonusText(b?: Bonus) {
  if (!b) return '';
  const parts: string[] = [];
  for (const k of ['str', 'agi', 'vit', 'int', 'dex', 'luk'] as const) if (b[k]) parts.push(`+${b[k]} ${STAT_LABEL[k]}`);
  if (b.maxHp) parts.push(`+${b.maxHp} HP`);
  if (b.maxSp) parts.push(`+${b.maxSp} SP`);
  if (b.crit) parts.push(`+${b.crit}% crítico`);
  if (b.def) parts.push(`+${b.def} DEF`);
  return parts.join(', ');
}
