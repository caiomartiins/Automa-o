export interface Stats {
  /** Vida máxima */
  maxHp: number;
  /** Vida regenerada por segundo */
  regen: number;
  /** Reduz o dano de cada golpe recebido */
  armor: number;
  /** Velocidade de movimento (px/s) */
  speed: number;
  /** Multiplicador de dano */
  might: number;
  /** Multiplicador de velocidade de ataque (divide as recargas) */
  haste: number;
  /** Multiplicador de área/alcance das habilidades */
  area: number;
  /** Raio de coleta de XP (px) */
  magnet: number;
}

export const BASE_STATS: Stats = {
  maxHp: 100,
  regen: 0,
  armor: 0,
  speed: 170,
  might: 1,
  haste: 1,
  area: 1,
  magnet: 80,
};
