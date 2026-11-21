import type { Attr } from './rpg';

/**
 * Equipamentos comprados com zeny na loja. Ficam guardados entre partidas
 * e o que estiver equipado vale em todas as próximas partidas.
 */

export type Slot = 'cabeca' | 'corpo' | 'arma' | 'escudo' | 'capa' | 'calcado' | 'acessorio1' | 'acessorio2';
/** Tipo de item (os dois slots de acessório aceitam o mesmo tipo) */
export type ItemSlot = Exclude<Slot, 'acessorio1' | 'acessorio2'> | 'acessorio';

export const SLOT_NAME: Record<Slot, string> = {
  cabeca: 'Cabeça', corpo: 'Corpo', arma: 'Mão direita', escudo: 'Mão esquerda',
  capa: 'Capa', calcado: 'Calçado', acessorio1: 'Acessório', acessorio2: 'Acessório',
};

/** Ordem dos slots na janela: coluna da esquerda e da direita, como na referência */
export const SLOTS_LEFT: Slot[] = ['cabeca', 'arma', 'capa', 'acessorio1'];
export const SLOTS_RIGHT: Slot[] = ['corpo', 'escudo', 'calcado', 'acessorio2'];

export const ITEM_SLOT_NAME: Record<ItemSlot, string> = {
  cabeca: 'Cabeça', corpo: 'Corpo', arma: 'Arma', escudo: 'Escudo', capa: 'Capa', calcado: 'Calçado', acessorio: 'Acessório',
};

export interface EquipStats {
  /** Dano físico (corpo a corpo e à distância), em fração: 0.1 = +10% */
  atk?: number;
  /** Dano mágico */
  matk?: number;
  def?: number;
  hp?: number;
  /** Velocidade de movimento (px/s) */
  speed?: number;
  crit?: number;
  flee?: number;
  /** Velocidade de ataque */
  aspd?: number;
  regen?: number;
  /** Raio de coleta (fração) */
  magnet?: number;
  attrs?: Partial<Record<Attr, number>>;
}

export interface EquipDef {
  id: string;
  name: string;
  slot: ItemSlot;
  price: number;
  /** Textura do ícone e cor aplicada */
  icon: string;
  tint: number;
  stats: EquipStats;
}

export const EQUIPMENT: EquipDef[] = [
  // ---- cabeça
  { id: 'gorro', name: 'Gorro de Pano', slot: 'cabeca', price: 60, icon: 'eq-chapeu', tint: 0xc8a070, stats: { def: 1, hp: 5 } },
  { id: 'elmo', name: 'Elmo de Ferro', slot: 'cabeca', price: 320, icon: 'eq-elmo', tint: 0xb8c4d4, stats: { def: 3, hp: 15 } },
  { id: 'tiara', name: 'Tiara Arcana', slot: 'cabeca', price: 380, icon: 'eq-tiara', tint: 0xb07aff, stats: { def: 1, matk: 0.1 } },
  { id: 'chifres', name: 'Chifres do Demônio', slot: 'cabeca', price: 1100, icon: 'eq-chifres', tint: 0x7a3a3a, stats: { def: 2, atk: 0.08, matk: 0.08, crit: 0.02 } },
  // ---- corpo
  { id: 'tunica', name: 'Túnica Acolchoada', slot: 'corpo', price: 90, icon: 'eq-armadura', tint: 0xa07a50, stats: { def: 2, hp: 10 } },
  { id: 'malha', name: 'Cota de Malha', slot: 'corpo', price: 450, icon: 'eq-armadura', tint: 0xb8c4d4, stats: { def: 5, hp: 25, speed: -6 } },
  { id: 'manto-sabio', name: 'Manto do Sábio', slot: 'corpo', price: 420, icon: 'eq-manto', tint: 0x4a5ab8, stats: { def: 2, matk: 0.12, regen: 0.2 } },
  { id: 'couro-caca', name: 'Gibão de Caçador', slot: 'corpo', price: 420, icon: 'eq-armadura', tint: 0x5a7a3a, stats: { def: 3, atk: 0.06, flee: 0.03 } },
  // ---- arma
  { id: 'espada-longa', name: 'Espada Longa', slot: 'arma', price: 120, icon: 'eq-espada', tint: 0xdfe5ec, stats: { atk: 0.12 } },
  { id: 'cajado', name: 'Cajado de Carvalho', slot: 'arma', price: 120, icon: 'eq-cajado', tint: 0x9fd0ff, stats: { matk: 0.15 } },
  { id: 'arco', name: 'Arco Composto', slot: 'arma', price: 140, icon: 'eq-arco', tint: 0xc89a5a, stats: { atk: 0.1, crit: 0.03 } },
  { id: 'montante', name: 'Montante Rúnico', slot: 'arma', price: 900, icon: 'eq-espada', tint: 0xffd04a, stats: { atk: 0.3, aspd: -0.05 } },
  { id: 'cetro', name: 'Cetro das Estrelas', slot: 'arma', price: 900, icon: 'eq-cajado', tint: 0xd070ff, stats: { matk: 0.32 } },
  // ---- mão esquerda
  { id: 'broquel', name: 'Broquel', slot: 'escudo', price: 80, icon: 'eq-escudo', tint: 0xa07a50, stats: { def: 2 } },
  { id: 'escudo-torre', name: 'Escudo Torre', slot: 'escudo', price: 500, icon: 'eq-escudo', tint: 0xb8c4d4, stats: { def: 6, hp: 20, speed: -10 } },
  { id: 'grimorio', name: 'Grimório', slot: 'escudo', price: 380, icon: 'eq-livro', tint: 0x9a4a2e, stats: { matk: 0.08, aspd: 0.05 } },
  { id: 'aljava', name: 'Aljava Encantada', slot: 'escudo', price: 380, icon: 'eq-aljava', tint: 0x6a8a4a, stats: { atk: 0.06, aspd: 0.06 } },
  // ---- capa
  { id: 'capa-viagem', name: 'Capa de Viagem', slot: 'capa', price: 70, icon: 'eq-capa', tint: 0x8a6a4a, stats: { flee: 0.02 } },
  { id: 'capuz-sombrio', name: 'Capuz Sombrio', slot: 'capa', price: 420, icon: 'eq-capa', tint: 0x3a2a4a, stats: { flee: 0.05, crit: 0.02 } },
  { id: 'manto-rubi', name: 'Manto Rubi', slot: 'capa', price: 480, icon: 'eq-capa', tint: 0xb3262e, stats: { def: 2, hp: 20 } },
  // ---- calçado
  { id: 'sandalias', name: 'Sandálias', slot: 'calcado', price: 60, icon: 'eq-bota', tint: 0xc8a070, stats: { speed: 10 } },
  { id: 'botas-couro', name: 'Botas de Couro', slot: 'calcado', price: 300, icon: 'eq-bota', tint: 0x6a4a2a, stats: { speed: 15, def: 1 } },
  { id: 'botas-aladas', name: 'Botas Aladas', slot: 'calcado', price: 850, icon: 'eq-bota', tint: 0xe8f0ff, stats: { speed: 30, flee: 0.02 } },
  // ---- acessórios (dois slots)
  { id: 'anel-forca', name: 'Anel da Força', slot: 'acessorio', price: 250, icon: 'eq-anel', tint: 0xff7a6a, stats: { attrs: { for: 3 } } },
  { id: 'brinco-agil', name: 'Brinco Ágil', slot: 'acessorio', price: 250, icon: 'eq-anel', tint: 0x7ae0a0, stats: { attrs: { agi: 3 } } },
  { id: 'amuleto-vital', name: 'Amuleto Vital', slot: 'acessorio', price: 250, icon: 'eq-colar', tint: 0xffc06a, stats: { attrs: { vit: 3 } } },
  { id: 'anel-mente', name: 'Anel da Mente', slot: 'acessorio', price: 250, icon: 'eq-anel', tint: 0x9a8aff, stats: { attrs: { int: 3 } } },
  { id: 'luva-precisa', name: 'Luva Precisa', slot: 'acessorio', price: 250, icon: 'eq-anel', tint: 0x6ad0ff, stats: { attrs: { des: 3 } } },
  { id: 'trevo', name: 'Trevo da Sorte', slot: 'acessorio', price: 250, icon: 'eq-colar', tint: 0x7aff8a, stats: { attrs: { sor: 3 } } },
  { id: 'ima', name: 'Ímã de Bolso', slot: 'acessorio', price: 180, icon: 'eq-colar', tint: 0xb8c4d4, stats: { magnet: 0.4 } },
];

export const equipById = (id: string | null | undefined) => (id ? EQUIPMENT.find((e) => e.id === id) : undefined);

/** Slot do item → slots da janela onde ele pode ir */
export function slotsFor(slot: ItemSlot): Slot[] {
  return slot === 'acessorio' ? ['acessorio1', 'acessorio2'] : [slot];
}

const pct = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;
const ATTR_SHORT: Record<Attr, string> = { for: 'FOR', agi: 'AGI', vit: 'VIT', int: 'INT', des: 'DES', sor: 'SOR' };

/** Texto curto com os efeitos do item */
export function describe(stats: EquipStats) {
  const out: string[] = [];
  if (stats.atk) out.push(`Atq ${pct(stats.atk)}`);
  if (stats.matk) out.push(`Matq ${pct(stats.matk)}`);
  if (stats.def) out.push(`Def +${stats.def}`);
  if (stats.hp) out.push(`Vida +${stats.hp}`);
  if (stats.speed) out.push(`Mov ${stats.speed > 0 ? '+' : ''}${stats.speed}`);
  if (stats.crit) out.push(`Crít ${pct(stats.crit)}`);
  if (stats.flee) out.push(`Esquiva ${pct(stats.flee)}`);
  if (stats.aspd) out.push(`Vel. ataque ${pct(stats.aspd)}`);
  if (stats.regen) out.push(`Regen +${stats.regen}/s`);
  if (stats.magnet) out.push(`Coleta ${pct(stats.magnet)}`);
  for (const [a, v] of Object.entries(stats.attrs ?? {})) out.push(`${ATTR_SHORT[a as Attr]} +${v}`);
  return out.join(', ');
}
