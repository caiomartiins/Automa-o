/**
 * Sistemas de RPG: elementos, raças, tamanhos, atributos, estados alterados,
 * cartas de monstro, itens, mascotes, mapas e a loja entre partidas.
 * (Mecânicas inspiradas em MMORPGs clássicos, com nomes e conteúdo próprios.)
 */

// ------------------------------------------------------------------ elementos

export type Element = 'neutro' | 'fogo' | 'agua' | 'terra' | 'vento' | 'sagrado' | 'sombrio' | 'fantasma' | 'mortovivo';

export const ELEMENTS: Record<Element, { name: string; color: number }> = {
  neutro: { name: 'Neutro', color: 0xd8d8d8 },
  fogo: { name: 'Fogo', color: 0xff7a3a },
  agua: { name: 'Água', color: 0x5ab0ff },
  terra: { name: 'Terra', color: 0xc8a050 },
  vento: { name: 'Vento', color: 0x9ae8a0 },
  sagrado: { name: 'Sagrado', color: 0xfff0a0 },
  sombrio: { name: 'Sombrio', color: 0xa070e0 },
  fantasma: { name: 'Fantasma', color: 0xc8c8ff },
  mortovivo: { name: 'Morto-vivo', color: 0x8a9a7a },
};

/** Multiplicador de dano: elemento do ataque × elemento do alvo (1 quando não listado) */
const ELEMENT_TABLE: Partial<Record<Element, Partial<Record<Element, number>>>> = {
  neutro: { fantasma: 0.5 },
  fogo: { terra: 1.5, mortovivo: 1.5, agua: 0.5, fogo: 0.5 },
  agua: { fogo: 1.5, vento: 0.5, agua: 0.5 },
  terra: { vento: 1.5, fogo: 0.5, terra: 0.5 },
  vento: { agua: 1.5, terra: 0.5, vento: 0.5 },
  sagrado: { sombrio: 2, mortovivo: 2, fantasma: 1.5, sagrado: 0.25 },
  sombrio: { sagrado: 2, sombrio: 0.25, mortovivo: 0.5 },
  fantasma: { fantasma: 1.75, neutro: 0.75 },
};

export function elementMult(attack: Element, target: Element) {
  return ELEMENT_TABLE[attack]?.[target] ?? 1;
}

// ------------------------------------------------------------------ raças e tamanhos

export type Race = 'amorfo' | 'bruto' | 'planta' | 'inseto' | 'mortovivo' | 'demonio' | 'humanoide';
export const RACES: Record<Race, string> = {
  amorfo: 'Amorfo', bruto: 'Bruto', planta: 'Planta', inseto: 'Inseto',
  mortovivo: 'Morto-vivo', demonio: 'Demônio', humanoide: 'Humanoide',
};

export type Size = 'pequeno' | 'medio' | 'grande';
export const SIZES: Record<Size, string> = { pequeno: 'Pequeno', medio: 'Médio', grande: 'Grande' };

/** Tipo de dano de cada habilidade: decide qual atributo aumenta o dano */
export type DamageKind = 'melee' | 'ranged' | 'magic';
export const KIND_NAME: Record<DamageKind, string> = { melee: 'Corpo a corpo', ranged: 'À distância', magic: 'Mágico' };

// ------------------------------------------------------------------ atributos

export type Attr = 'for' | 'agi' | 'vit' | 'int' | 'des' | 'sor';
export type Attrs = Record<Attr, number>;
export const ATTR_IDS: Attr[] = ['for', 'agi', 'vit', 'int', 'des', 'sor'];

export const ATTRS: Record<Attr, { short: string; name: string; desc: string; color: number }> = {
  for: { short: 'FOR', name: 'Força', desc: '+2% de dano corpo a corpo', color: 0xff7a6a },
  agi: { short: 'AGI', name: 'Agilidade', desc: '+1,2% de velocidade de ataque e +0,3% de esquiva', color: 0x7ae0a0 },
  vit: { short: 'VIT', name: 'Vitalidade', desc: '+5 de vida, +regeneração e resistência a estados', color: 0xffc06a },
  int: { short: 'INT', name: 'Inteligência', desc: '+2,5% de dano mágico', color: 0x9a8aff },
  des: { short: 'DES', name: 'Destreza', desc: '+2,5% de dano à distância', color: 0x6ad0ff },
  sor: { short: 'SOR', name: 'Sorte', desc: '+0,5% de crítico e mais itens raros', color: 0xffe36a },
};

/** Pontos de atributo ganhos a cada nível */
export const ATTR_POINTS_PER_LEVEL = 3;

/** Peso de cada atributo na distribuição automática, por linhagem */
export const ATTR_FOCUS: Record<string, Partial<Attrs>> = {
  aprendiz: { for: 1, agi: 1, vit: 1, des: 1 },
  espadachim: { for: 3, vit: 2, agi: 1 },
  mago: { int: 3, des: 1, vit: 1 },
  arqueiro: { des: 3, agi: 2, sor: 1 },
};

// ------------------------------------------------------------------ estados alterados

export type StatusId = 'queimando' | 'envenenado' | 'sangrando' | 'atordoado' | 'congelado';

export const STATUS: Record<StatusId, { name: string; tint: number; duration: number; dot: number; stops?: boolean; slow?: number }> = {
  queimando: { name: 'Queimando', tint: 0xff9a5a, duration: 2000, dot: 0.25 },
  envenenado: { name: 'Envenenado', tint: 0x9aff7a, duration: 3000, dot: 0.15, slow: 0.6 },
  sangrando: { name: 'Sangrando', tint: 0xff6a7a, duration: 2500, dot: 0.2 },
  atordoado: { name: 'Atordoado', tint: 0xffff9a, duration: 700, dot: 0, stops: true },
  congelado: { name: 'Congelado', tint: 0x9fe6ff, duration: 1500, dot: 0, stops: true },
};

// ------------------------------------------------------------------ modificadores da partida

/** Bônus acumulados de cartas, loja, mascote etc. */
export interface Mods {
  dmgAll: number;
  xp: number;
  zeny: number;
  drop: number;
  crit: number;
  evade: number;
  ignoreHit: number;
  killHeal: number;
  freezeChance: number;
  swordSpin: boolean;
  kindDmg: Record<DamageKind, number>;
  raceDmg: Partial<Record<Race, number>>;
  elemDmg: Partial<Record<Element, number>>;
}

export function emptyMods(): Mods {
  return {
    dmgAll: 0, xp: 0, zeny: 0, drop: 0, crit: 0, evade: 0, ignoreHit: 0, killHeal: 0, freezeChance: 0,
    swordSpin: false, kindDmg: { melee: 0, ranged: 0, magic: 0 }, raceDmg: {}, elemDmg: {},
  };
}

// ------------------------------------------------------------------ cartas

/** Acesso mínimo ao jogo que as cartas e mascotes precisam (evita importar a cena aqui) */
export interface RpgHost {
  mods: Mods;
  stats: { maxHp: number; regen: number; armor: number; speed: number; magnet: number };
  hp: number;
  addAttr(a: Attr, n: number): void;
}

export interface CardDef {
  /** id do monstro que solta a carta */
  monster: string;
  name: string;
  desc: string;
  apply: (g: RpgHost) => void;
}

export const CARDS: CardDef[] = [
  { monster: 'gosma', name: 'Carta Gosma', desc: '+10% de XP', apply: (g) => (g.mods.xp += 0.1) },
  { monster: 'morcego', name: 'Carta Morcego', desc: '35% de chance de curar 1 de vida ao derrotar um inimigo', apply: (g) => (g.mods.killHeal += 1) },
  { monster: 'cogumelo', name: 'Carta Cogumelo', desc: '+3 VIT', apply: (g) => g.addAttr('vit', 3) },
  { monster: 'esqueleto', name: 'Carta Esqueleto', desc: '+20% de dano contra Morto-vivo', apply: (g) => add(g.mods.raceDmg, 'mortovivo', 0.2) },
  { monster: 'fantasma', name: 'Carta Fantasma', desc: '5% de chance de anular um golpe recebido', apply: (g) => (g.mods.ignoreHit += 0.05) },
  { monster: 'orc', name: 'Carta Orc', desc: '+15% de dano corpo a corpo', apply: (g) => (g.mods.kindDmg.melee += 0.15) },
  {
    monster: 'cavaleiro-negro', name: 'Carta Cavaleiro Negro', desc: '+2 de armadura e +10% de dano contra Humanoides',
    apply: (g) => { g.stats.armor += 2; add(g.mods.raceDmg, 'humanoide', 0.1); },
  },
  { monster: 'rei-gosma', name: 'Carta Rei Gosma', desc: '5% de chance de congelar com qualquer ataque', apply: (g) => (g.mods.freezeChance += 0.05) },
  { monster: 'lorde-esqueleto', name: 'Carta Lorde Esqueleto', desc: '+25% de dano Sagrado e Sombrio', apply: (g) => { add(g.mods.elemDmg, 'sagrado', 0.25); add(g.mods.elemDmg, 'sombrio', 0.25); } },
  {
    monster: 'bafome', name: 'Carta Bafome', desc: '+5 FOR e o Golpe de Espada acerta em 360°',
    apply: (g) => { g.addAttr('for', 5); g.mods.swordSpin = true; },
  },
];

function add<K extends string>(obj: Partial<Record<K, number>>, k: K, v: number) {
  obj[k] = (obj[k] ?? 0) + v;
}

export const cardOf = (monster: string) => CARDS.find((c) => c.monster === monster);

// ------------------------------------------------------------------ itens

export type ItemKind = 'xp' | 'comida' | 'pocao1' | 'pocao2' | 'pocao3' | 'asa' | 'pena' | 'zeny' | 'carta' | 'ovo';

export const ITEMS: Partial<Record<ItemKind, { name: string; texture: string }>> = {
  pocao1: { name: 'Poção Vermelha', texture: 'item-pocao1' },
  pocao2: { name: 'Poção Laranja', texture: 'item-pocao2' },
  pocao3: { name: 'Poção Branca', texture: 'item-pocao3' },
  asa: { name: 'Asa de Teletransporte', texture: 'item-asa' },
  pena: { name: 'Pena da Ressurreição', texture: 'item-pena' },
  zeny: { name: 'Zeny', texture: 'item-zeny' },
  carta: { name: 'Carta', texture: 'item-carta' },
  ovo: { name: 'Ovo de Mascote', texture: 'item-ovo' },
};

/** Chances de queda por inimigo comum (multiplicadas pela Sorte) */
export const DROPS = { zeny: 0.35, pocao1: 0.004, pocao2: 0.0013, pocao3: 0.0004, asa: 0.0025, pena: 0.0005, carta: 0.004, ovo: 0.0015 };

// ------------------------------------------------------------------ mascotes

export interface PetDef {
  id: string;
  name: string;
  texture: string;
  desc: string;
  bonus: Partial<{ magnet: number; regen: number; evade: number }>;
  /** Mascotes que atacam: dano base e intervalo */
  attack?: { damage: number; every: number };
}

export const PETS: Record<string, PetDef> = {
  gosma: { id: 'gosma', name: 'Gosminha', texture: 'en-gosma', desc: '+40% de raio de coleta', bonus: { magnet: 0.4 } },
  morcego: { id: 'morcego', name: 'Morceguinho', texture: 'en-morcego', desc: 'Ataca o inimigo mais próximo', bonus: {}, attack: { damage: 10, every: 1300 } },
  fantasma: { id: 'fantasma', name: 'Fantasminha', texture: 'en-fantasma', desc: '+5% de esquiva', bonus: { evade: 0.05 } },
  cogumelo: { id: 'cogumelo', name: 'Cogumelinho', texture: 'en-cogumelo', desc: '+0,6 de vida por segundo', bonus: { regen: 0.6 } },
};

// ------------------------------------------------------------------ mapas

export interface MapDef {
  id: string;
  name: string;
  ground: string;
  /** Decorações e seus pesos */
  decor: [string, number][];
  /** Multiplica o peso de aparecimento de cada monstro */
  weights: Record<string, number>;
  /** Escurecimento da tela (caverna) */
  darkness: number;
}

export const MAPS: MapDef[] = [
  {
    id: 'campo', name: 'Campos Verdes', ground: 'grama', darkness: 0,
    decor: [['deco-tuft', 38], ['deco-flores', 24], ['deco-pedra', 16], ['deco-arbusto', 14], ['deco-cogumelo', 8]],
    weights: {},
  },
  {
    id: 'deserto', name: 'Deserto Escaldante', ground: 'chao-areia', darkness: 0,
    decor: [['deco-pedra', 30], ['deco-cacto', 30], ['deco-ossos', 25], ['deco-tuft', 15]],
    weights: { gosma: 0.4, cogumelo: 0.2, esqueleto: 2.2, orc: 2, morcego: 0.8 },
  },
  {
    id: 'caverna', name: 'Caverna Sombria', ground: 'chao-caverna', darkness: 0.28,
    decor: [['deco-pedra', 35], ['deco-cristal', 30], ['deco-cogumelo', 25], ['deco-ossos', 10]],
    weights: { morcego: 2.5, cogumelo: 1.8, fantasma: 1.6, gosma: 0.6 },
  },
  {
    id: 'ruinas', name: 'Ruínas Esquecidas', ground: 'chao-ruinas', darkness: 0.1,
    decor: [['deco-coluna', 25], ['deco-pedra', 30], ['deco-ossos', 20], ['deco-tuft', 25]],
    weights: { esqueleto: 2, fantasma: 2, 'cavaleiro-negro': 2, gosma: 0.6 },
  },
];

// ------------------------------------------------------------------ loja e refino (entre partidas)

export interface ShopItem {
  id: string;
  name: string;
  desc: string;
  max: number;
  cost: (level: number) => number;
}

export const SHOP: ShopItem[] = [
  { id: 'vida', name: 'Vigor', desc: '+10 de vida inicial', max: 5, cost: (l) => 80 + l * 70 },
  { id: 'dano', name: 'Treino de Combate', desc: '+5% de dano', max: 5, cost: (l) => 100 + l * 90 },
  { id: 'pontos', name: 'Talento Nato', desc: '+2 pontos de atributo no início', max: 3, cost: (l) => 150 + l * 120 },
  { id: 'ima', name: 'Bolsa Grande', desc: '+15% de raio de coleta', max: 3, cost: (l) => 80 + l * 60 },
  { id: 'zeny', name: 'Olho de Mercador', desc: '+10% de zeny', max: 3, cost: (l) => 120 + l * 100 },
  { id: 'asa', name: 'Asas na Mochila', desc: 'Começa com 2 Asas de Teletransporte', max: 1, cost: () => 300 },
  { id: 'pena', name: 'Pena Guardada', desc: 'Começa com 1 Pena da Ressurreição', max: 1, cost: () => 700 },
];

export const MAX_REFINE = 10;
/** Chance de sucesso ao tentar refinar para +n */
export const refineChance = (target: number) => [1, 1, 1, 1, 1, 0.9, 0.75, 0.6, 0.45, 0.3, 0.2][target] ?? 0;
export const refineCost = (target: number) => 120 * target;
/** Dano extra por nível de refino */
export const REFINE_DMG = 0.04;
export const PET_EGG_COST = 450;
