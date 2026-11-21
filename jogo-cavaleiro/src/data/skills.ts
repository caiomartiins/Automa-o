export type SkillId = 'espada' | 'escudo' | 'lanca';

export interface SkillDef {
  id: SkillId;
  name: string;
  maxLevel: number;
  /** levelDesc[n] descreve o que o nível n+1 faz (índice 0 = ao ganhar a habilidade) */
  levelDesc: string[];
  color: number;
}

export const SKILLS: Record<SkillId, SkillDef> = {
  espada: {
    id: 'espada',
    name: 'Golpe de Espada',
    maxLevel: 5,
    color: 0xd8d8e8,
    levelDesc: [
      'Golpe em arco na direção em que você anda.',
      '+5 dano, ataques mais rápidos, +alcance.',
      '+5 dano, ataques mais rápidos, +alcance.',
      '+5 dano, ataques mais rápidos, +alcance.',
      'Golpeia também para trás! +5 dano.',
    ],
  },
  escudo: {
    id: 'escudo',
    name: 'Escudo Giratório',
    maxLevel: 5,
    color: 0x5a8cff,
    levelDesc: [
      'Um escudo gira ao seu redor ferindo inimigos.',
      '+1 escudo, +4 dano.',
      '+4 dano, gira mais rápido, +raio.',
      '+1 escudo, +4 dano.',
      '+1 escudo, +4 dano, gira mais rápido.',
    ],
  },
  lanca: {
    id: 'lanca',
    name: 'Investida de Lança',
    maxLevel: 5,
    color: 0xffd04a,
    levelDesc: [
      'Estocada longa que atravessa todos os inimigos.',
      '+15 dano, recarga menor.',
      'Estoca para frente e para trás! +15 dano.',
      '+15 dano, recarga menor, +alcance.',
      'Estoca em 4 direções! +15 dano.',
    ],
  },
};
