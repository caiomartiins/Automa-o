export type SkillId = 'espada' | 'escudo' | 'lanca' | 'fogo' | 'raio' | 'meteoro' | 'flecha' | 'chuva' | 'tiro';

export interface SkillDef {
  id: SkillId;
  name: string;
  maxLevel: number;
  /** levelDesc[n] descreve o que o nível n+1 faz (índice 0 = ao ganhar a habilidade) */
  levelDesc: string[];
  color: number;
}

export const SKILLS: Record<SkillId, SkillDef> = {
  // ---- Cavaleiro
  espada: {
    id: 'espada', name: 'Golpe de Espada', maxLevel: 5, color: 0xd8d8e8,
    levelDesc: [
      'Golpe em arco na direção em que você anda.',
      '+5 dano, ataques mais rápidos, +alcance.',
      '+5 dano, ataques mais rápidos, +alcance.',
      '+5 dano, ataques mais rápidos, +alcance.',
      'Golpeia também para trás! +5 dano.',
    ],
  },
  escudo: {
    id: 'escudo', name: 'Escudo Giratório', maxLevel: 5, color: 0x5a8cff,
    levelDesc: [
      'Um escudo gira ao seu redor ferindo inimigos.',
      '+1 escudo, +4 dano.',
      '+4 dano, gira mais rápido, +raio.',
      '+1 escudo, +4 dano.',
      '+1 escudo, +4 dano, gira mais rápido.',
    ],
  },
  lanca: {
    id: 'lanca', name: 'Investida de Lança', maxLevel: 5, color: 0xffd04a,
    levelDesc: [
      'Estocada longa que atravessa todos os inimigos.',
      '+15 dano, recarga menor.',
      'Estoca para frente e para trás! +15 dano.',
      '+15 dano, recarga menor, +alcance.',
      'Estoca em 4 direções! +15 dano.',
    ],
  },

  // ---- Mago
  fogo: {
    id: 'fogo', name: 'Bola de Fogo', maxLevel: 5, color: 0xff8a3a,
    levelDesc: [
      'Lança bolas de fogo no inimigo mais próximo. Explodem em área.',
      '+1 bola de fogo, +6 dano.',
      '+6 dano, explosão maior.',
      '+1 bola de fogo, +6 dano.',
      '+1 bola de fogo, +6 dano, recarga menor.',
    ],
  },
  raio: {
    id: 'raio', name: 'Corrente de Raios', maxLevel: 5, color: 0x7ad8ff,
    levelDesc: [
      'Um raio atinge um inimigo e salta para outros próximos.',
      '+1 salto, +8 dano.',
      '+1 salto, +8 dano, recarga menor.',
      '+1 salto, +8 dano.',
      'Dois raios por vez! +8 dano.',
    ],
  },
  meteoro: {
    id: 'meteoro', name: 'Chuva de Meteoros', maxLevel: 5, color: 0xff5a3a,
    levelDesc: [
      'Meteoros caem sobre os inimigos causando grande dano em área.',
      '+1 meteoro, +25 dano.',
      '+25 dano, área maior.',
      '+1 meteoro, +25 dano.',
      '+2 meteoros, +25 dano, recarga menor.',
    ],
  },

  // ---- Arqueiro
  flecha: {
    id: 'flecha', name: 'Flecha', maxLevel: 5, color: 0xc9a46a,
    levelDesc: [
      'Atira flechas no inimigo mais próximo.',
      '+1 flecha, +4 dano.',
      'As flechas atravessam +1 inimigo. +4 dano.',
      '+1 flecha, +4 dano.',
      '+1 flecha, atravessam +1 inimigo, +4 dano.',
    ],
  },
  chuva: {
    id: 'chuva', name: 'Chuva de Flechas', maxLevel: 5, color: 0x9ad06a,
    levelDesc: [
      'Uma chuva de flechas cai sobre um grupo de inimigos.',
      '+3 dano por flecha, área maior.',
      'Duas chuvas por vez! +3 dano.',
      '+3 dano, dura mais.',
      'Três chuvas por vez! +3 dano.',
    ],
  },
  tiro: {
    id: 'tiro', name: 'Tiro Certeiro', maxLevel: 5, color: 0xffe36a,
    levelDesc: [
      'Flecha gigante que atravessa tudo em linha reta.',
      '+20 dano, recarga menor.',
      'Dispara dois tiros! +20 dano.',
      '+20 dano, recarga menor, mais largo.',
      'Dispara três tiros! +20 dano.',
    ],
  },
};
