export interface EnemyDef {
  id: string;
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
  /** Peso no sorteio de spawn */
  weight: number;
  /** 0 = ignora empurrão, 1 = empurrão total */
  knockback: number;
  elite?: boolean;
}

export const ENEMIES: EnemyDef[] = [
  { id: 'gosma', texture: 'en-gosma', hp: 10, speed: 55, damage: 6, xp: 1, radius: 11, from: 0, weight: 10, knockback: 1 },
  { id: 'morcego', texture: 'en-morcego', hp: 8, speed: 105, damage: 5, xp: 1, radius: 10, from: 40, weight: 6, knockback: 1 },
  { id: 'esqueleto', texture: 'en-esqueleto', hp: 30, speed: 72, damage: 10, xp: 2, radius: 12, from: 110, weight: 6, knockback: 0.8 },
  { id: 'orc', texture: 'en-orc', hp: 55, speed: 48, damage: 14, xp: 4, radius: 15, from: 170, weight: 4, knockback: 0.5 },
  {
    id: 'cavaleiro-negro', texture: 'en-cavaleiro-negro', hp: 320, speed: 52, damage: 22, xp: 25, radius: 17,
    from: 240, weight: 0.4, knockback: 0.15, elite: true,
  },
];

/** Multiplicador de vida dos inimigos conforme o tempo passa */
export const hpScale = (seconds: number) => 1 + seconds / 150;
