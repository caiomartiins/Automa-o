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

/** Bafome: primeiro chefe de verdade, aparece quando o jogador chega ao nível 10 */
export const BAFOME: EnemyDef = {
  id: 'bafome', name: 'Bafome', texture: 'en-bafome', hp: 4200, speed: 72, damage: 34, xp: 220, radius: 34,
  from: 0, weight: 0, knockback: 0, scale: 2.9, boss: true, element: 'sombrio', race: 'demonio', size: 'grande'
};
export const BAFOME_LEVEL = 10;

/** Chefes: um a cada 5 minutos, alternando (com mais vida a cada volta) */
export const BOSSES: EnemyDef[] = [
  {
    id: 'rei-gosma', name: 'Rei Gosma', texture: 'en-gosma', hp: 2000, speed: 46, damage: 28, xp: 80, radius: 36,
    from: 0, weight: 0, knockback: 0, scale: 3, tint: 0xffd75a, boss: true, element: 'agua', race: 'amorfo', size: 'grande'
  },
  {
    id: 'lorde-esqueleto', name: 'Lorde Esqueleto', texture: 'en-esqueleto', hp: 3000, speed: 56, damage: 34, xp: 120, radius: 30,
    from: 0, weight: 0, knockback: 0, scale: 2.5, tint: 0xd2b8ff, boss: true, element: 'mortovivo', race: 'mortovivo', size: 'grande'
  },
];

export const BOSS_INTERVAL = 300;

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
export const MAX_ENEMY_RADIUS = Math.max(...[...ENEMIES, ...BOSSES, BAFOME].map((d) => d.radius));
