import type { Element, Race, Size } from './rpg';

export interface EnemyDef {
  id: string;
  name: string;
  texture: string;
  hp: number;
  speed: number;
  /** Dano por contato */
  damage: number;
  xp: number;
  /** Raio do corpo de colisão */
  radius: number;
  /** Segundos de partida a partir dos quais pode aparecer */
  from: number;
  /** Peso no sorteio de spawn (0 = nunca aparece sozinho, ex.: chefes) */
  weight: number;
  /** 0 = ignora empurrão, 1 = empurrão total */
  knockback: number;
  /** Tamanho em relação à arte normal */
  scale?: number;
  /** Cor aplicada por cima da arte (ex.: chefe dourado) */
  tint?: number;
  elite?: boolean;
  boss?: boolean;
  /** Mini-chefe: barra de vida e prêmio menor que um chefe */
  miniboss?: boolean;
  element: Element;
  race: Race;
  size: Size;
  /** Nível base do monstro (define acerto e esquiva) */
  lv?: number;
  /** Monstro ágil: esquiva extra */
  agile?: boolean;
}

export const ENEMIES: EnemyDef[] = [
  { id: 'gosma', name: 'Gosma', texture: 'en-gosma', hp: 10, speed: 55, damage: 6, xp: 1, radius: 11, from: 0, weight: 10, knockback: 1, element: 'agua', race: 'amorfo', size: 'pequeno', lv: 1 },
  { id: 'morcego', name: 'Morcego', texture: 'en-morcego', hp: 8, speed: 105, damage: 5, xp: 1, radius: 10, from: 40, weight: 6, knockback: 1, element: 'vento', race: 'bruto', size: 'pequeno', lv: 5, agile: true },
  { id: 'cogumelo', name: 'Cogumelo Andante', texture: 'en-cogumelo', hp: 18, speed: 62, damage: 8, xp: 2, radius: 12, from: 75, weight: 6, knockback: 0.9, element: 'terra', race: 'planta', size: 'pequeno', lv: 6 },
  { id: 'esqueleto', name: 'Esqueleto', texture: 'en-esqueleto', hp: 30, speed: 72, damage: 10, xp: 2, radius: 12, from: 110, weight: 6, knockback: 0.8, element: 'mortovivo', race: 'mortovivo', size: 'medio', lv: 10 },
  { id: 'fantasma', name: 'Fantasma', texture: 'en-fantasma', hp: 24, speed: 88, damage: 9, xp: 2, radius: 12, from: 140, weight: 5, knockback: 1, element: 'fantasma', race: 'mortovivo', size: 'medio', lv: 12, agile: true },
  { id: 'lobo', name: 'Lobo Cinzento', texture: 'en-lobo', hp: 26, speed: 118, damage: 11, xp: 2, radius: 13, from: 90, weight: 5, knockback: 0.9, element: 'neutro', race: 'bruto', size: 'medio', lv: 8, agile: true },
  { id: 'arvore', name: 'Ent Ancião', texture: 'en-arvore', hp: 95, speed: 36, damage: 17, xp: 5, radius: 18, from: 200, weight: 3, knockback: 0.25, scale: 1.05, element: 'terra', race: 'planta', size: 'grande', lv: 16 },
  { id: 'orc', name: 'Orc', texture: 'en-orc', hp: 55, speed: 48, damage: 14, xp: 4, radius: 15, from: 170, weight: 4, knockback: 0.5, element: 'terra', race: 'humanoide', size: 'grande', lv: 14 },
  {
    id: 'cavaleiro-negro', name: 'Cavaleiro Negro', texture: 'en-cavaleiro-negro', hp: 320, speed: 52, damage: 22, xp: 25, radius: 17,
    from: 240, weight: 0.4, knockback: 0.15, elite: true, scale: 1.15, element: 'sombrio', race: 'humanoide', size: 'grande', lv: 20
  },
];

/** Bafome: primeiro chefe (4:00 e depois a cada 8 minutos, alternando com o Minotauro) */
export const BAFOME: EnemyDef = {
  id: 'bafome', name: 'Bafome', texture: 'en-bafome', hp: 3200, speed: 72, damage: 34, xp: 220, radius: 34,
  from: 0, weight: 0, knockback: 0, scale: 2.9, boss: true, element: 'sombrio', race: 'demonio', size: 'grande', lv: 25
};

/** Carniçal: mini-chefe zumbi. Aparece aos 2 minutos e depois a cada 3min30s */
export const ZUMBI: EnemyDef = {
  id: 'zumbi', name: 'Carniçal', texture: 'en-zumbi', hp: 900, speed: 58, damage: 22, xp: 45, radius: 24,
  from: 0, weight: 0, knockback: 0.1, scale: 2.1, miniboss: true,
  element: 'mortovivo', race: 'mortovivo', size: 'grande', lv: 15
};
/** Rainha Magmática: 2ª mini-chefe (alterna com o Carniçal: níveis 20, 40, 60...) */
export const ARANHA: EnemyDef = {
  id: 'aranha', name: 'Rainha Magmática', texture: 'en-aranha', hp: 1300, speed: 66, damage: 26, xp: 60, radius: 30,
  from: 0, weight: 0, knockback: 0.05, scale: 1.5, miniboss: true,
  element: 'fogo', race: 'inseto', size: 'grande', lv: 22
};
/** Minotauro: segundo chefe */
export const MINOTAURO: EnemyDef = {
  id: 'minotauro', name: 'Minotauro Brutal', texture: 'en-minotauro', hp: 4800, speed: 86, damage: 40, xp: 240, radius: 32,
  from: 0, weight: 0, knockback: 0, scale: 2.7, boss: true,
  element: 'terra', race: 'bruto', size: 'grande', lv: 30
};

/** Lorde Ossário: o chefe mais forte. Só aparece a partir do nível 45 (3º do rodízio: 45, 90, 135...) */
export const LICH: EnemyDef = {
  id: 'lich', name: 'Lorde Ossário', texture: 'en-lich', hp: 15000, speed: 78, damage: 60, xp: 420, radius: 38,
  from: 0, weight: 0, knockback: 0, scale: 1.9, boss: true,
  element: 'mortovivo', race: 'mortovivo', size: 'grande', lv: 40
};

/**
 * Calendário dos chefes: a cada 2 minutos, alternando mini-chefe e chefe.
 * 2:00 Carniçal, 4:00 Bafome, 6:00 Carniçal, 8:00 Minotauro, 10:00 Carniçal, 12:00 Bafome...
 * Cada volta deixa o mesmo chefe mais forte.
 */
export const BOSS_EVERY = 120;
/** Mini-chefe a cada 10 níveis, alternando: 10 Carniçal, 20 Rainha Magmática, 30 Carniçal... */
export const MINI_LEVEL_EVERY = 10;
export const MINI_ROTATION = ['zumbi', 'aranha'] as const;
/** Chefe a cada 15 níveis: 15 Bafome, 30 Minotauro, 45 Lorde Ossário, e o rodízio recomeça mais forte */
export const BOSS_LEVEL_EVERY = 15;
/** Loja no meio da partida a cada 10 níveis */
export const SHOP_LEVEL_EVERY = 10;

/**
 * A partir do nível 8 do jogador, os monstros comuns ficam bem mais fortes a cada nível:
 * +30% de vida, +12% de dano e +2% de velocidade por nível acima do 7.
 */
export function levelScale(playerLevel: number) {
  const n = Math.max(0, playerLevel - 7);
  return { hp: 1 + n * 0.3, dmg: 1 + n * 0.12, speed: Math.min(0.4, n * 0.02) };
}
export const BOSS_ROTATION = ['bafome', 'minotauro', 'lich'] as const;


/**
 * Progressão de força dos monstros conforme o tempo passa.
 * A cada minuto: +45% de vida, +20% de dano e +5% de velocidade (velocidade até +50%).
 */
export const HARD_FROM = 240;
export const hpScale = (seconds: number) => 1 + (seconds / 60) * 0.45;
export const dmgScale = (seconds: number) => 1 + (seconds / 60) * 0.2;
export const speedScale = (seconds: number) => 1 + Math.min(0.5, (seconds / 60) * 0.05);
/** "Ameaça" mostrada no HUD: sobe 1 a cada minuto */
export const threatLevel = (seconds: number) => 1 + Math.floor(seconds / 60);

/** Maior raio de colisão entre todos os inimigos (usado nas buscas espaciais) */
export const MAX_ENEMY_RADIUS = Math.max(...[...ENEMIES, BAFOME, ZUMBI, ARANHA, MINOTAURO, LICH].map((d) => d.radius));
