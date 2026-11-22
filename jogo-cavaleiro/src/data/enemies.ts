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
}

export const ENEMIES: EnemyDef[] = [
  { id: 'gosma', name: 'Gosma', texture: 'en-gosma', hp: 10, speed: 55, damage: 6, xp: 1, radius: 11, from: 0, weight: 10, knockback: 1, element: 'agua', race: 'amorfo', size: 'pequeno' },
  { id: 'morcego', name: 'Morcego', texture: 'en-morcego', hp: 8, speed: 105, damage: 5, xp: 1, radius: 10, from: 40, weight: 6, knockback: 1, element: 'vento', race: 'bruto', size: 'pequeno' },
  { id: 'cogumelo', name: 'Cogumelo Andante', texture: 'en-cogumelo', hp: 18, speed: 62, damage: 8, xp: 2, radius: 12, from: 75, weight: 6, knockback: 0.9, element: 'terra', race: 'planta', size: 'pequeno' },
  { id: 'esqueleto', name: 'Esqueleto', texture: 'en-esqueleto', hp: 30, speed: 72, damage: 10, xp: 2, radius: 12, from: 110, weight: 6, knockback: 0.8, element: 'mortovivo', race: 'mortovivo', size: 'medio' },
  { id: 'fantasma', name: 'Fantasma', texture: 'en-fantasma', hp: 24, speed: 88, damage: 9, xp: 2, radius: 12, from: 140, weight: 5, knockback: 1, element: 'fantasma', race: 'mortovivo', size: 'medio' },
  { id: 'orc', name: 'Orc', texture: 'en-orc', hp: 55, speed: 48, damage: 14, xp: 4, radius: 15, from: 170, weight: 4, knockback: 0.5, element: 'terra', race: 'humanoide', size: 'grande' },
  {
    id: 'cavaleiro-negro', name: 'Cavaleiro Negro', texture: 'en-cavaleiro-negro', hp: 320, speed: 52, damage: 22, xp: 25, radius: 17,
    from: 240, weight: 0.4, knockback: 0.15, elite: true, scale: 1.15, element: 'sombrio', race: 'humanoide', size: 'grande'
  },
];

/** Bafome: primeiro chefe (4:00 e depois a cada 8 minutos, alternando com o Minotauro) */
export const BAFOME: EnemyDef = {
  id: 'bafome', name: 'Bafome', texture: 'en-bafome', hp: 3200, speed: 72, damage: 34, xp: 220, radius: 34,
  from: 0, weight: 0, knockback: 0, scale: 2.9, boss: true, element: 'sombrio', race: 'demonio', size: 'grande'
};

/** Carniçal: mini-chefe zumbi. Aparece aos 2 minutos e depois a cada 3min30s */
export const ZUMBI: EnemyDef = {
  id: 'zumbi', name: 'Carniçal', texture: 'en-zumbi', hp: 900, speed: 58, damage: 22, xp: 45, radius: 24,
  from: 0, weight: 0, knockback: 0.1, scale: 2.1, miniboss: true,
  element: 'mortovivo', race: 'mortovivo', size: 'grande',
};
/** Minotauro: segundo chefe */
export const MINOTAURO: EnemyDef = {
  id: 'minotauro', name: 'Minotauro Brutal', texture: 'en-minotauro', hp: 3800, speed: 66, damage: 30, xp: 240, radius: 32,
  from: 0, weight: 0, knockback: 0, scale: 2.7, boss: true,
  element: 'terra', race: 'bruto', size: 'grande',
};

/**
 * Calendário dos chefes: a cada 2 minutos, alternando mini-chefe e chefe.
 * 2:00 Carniçal, 4:00 Bafome, 6:00 Carniçal, 8:00 Minotauro, 10:00 Carniçal, 12:00 Bafome...
 * Cada volta deixa o mesmo chefe mais forte.
 */
export const BOSS_EVERY = 120;
export const BOSS_ROTATION = ['bafome', 'minotauro'] as const;


/**
 * Progressão de força dos monstros conforme o tempo passa.
 * A cada minuto: +45% de vida, +20% de dano e +5% de velocidade (velocidade até +50%).
 */
export const hpScale = (seconds: number) => 1 + (seconds / 60) * 0.45;
export const dmgScale = (seconds: number) => 1 + (seconds / 60) * 0.2;
export const speedScale = (seconds: number) => 1 + Math.min(0.5, (seconds / 60) * 0.05);
/** "Ameaça" mostrada no HUD: sobe 1 a cada minuto */
export const threatLevel = (seconds: number) => 1 + Math.floor(seconds / 60);

/** Maior raio de colisão entre todos os inimigos (usado nas buscas espaciais) */
export const MAX_ENEMY_RADIUS = Math.max(...[...ENEMIES, BAFOME, ZUMBI, MINOTAURO].map((d) => d.radius));
