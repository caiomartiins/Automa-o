export type SkillId =
  | 'espada' | 'escudo' | 'lanca' | 'impacto' | 'aura'
  | 'fogo' | 'raio' | 'meteoro' | 'livro'
  | 'flecha' | 'chuva' | 'tiro';

import type { DamageKind, Element, Size, StatusId } from './rpg';

export interface SkillDef {
  id: SkillId;
  name: string;
  maxLevel: number;
  /** levelDesc[n] descreve o que o nível n+1 faz (índice 0 = ao ganhar a habilidade) */
  levelDesc: string[];
  color: number;
  element: Element;
  kind: DamageKind;
  /** Estado que a habilidade pode aplicar e a chance */
  status?: { id: StatusId; chance: number };
  /** Multiplicador de dano por tamanho do alvo */
  sizeMod?: Partial<Record<Size, number>>;
}

export const SKILLS: Record<SkillId, SkillDef> = {
  // ---- Cavaleiro
  espada: {
    id: 'espada', name: 'Golpe de Espada', maxLevel: 5, color: 0xd8d8e8, element: 'neutro', kind: 'melee', status: { id: 'sangrando', chance: 0.1 }, sizeMod: { grande: 0.85 },
    levelDesc: [
      'Golpe em arco na direção em que você anda.',
      '+5 dano, ataques mais rápidos, +alcance.',
      '+5 dano, ataques mais rápidos, +alcance.',
      '+5 dano, ataques mais rápidos, +alcance.',
      'Golpeia também para trás! +5 dano.',
    ],
  },
  escudo: {
    id: 'escudo', name: 'Escudo Giratório', maxLevel: 5, color: 0x5a8cff, element: 'neutro', kind: 'melee', status: { id: 'atordoado', chance: 0.08 },
    levelDesc: [
      'Um escudo gira ao seu redor ferindo inimigos.',
      '+1 escudo, +4 dano.',
      '+4 dano, gira mais rápido, +raio.',
      '+1 escudo, +4 dano.',
      '+1 escudo, +4 dano, gira mais rápido.',
    ],
  },
  lanca: {
    id: 'lanca', name: 'Investida de Lança', maxLevel: 5, color: 0xffd04a, element: 'neutro', kind: 'melee', status: { id: 'sangrando', chance: 0.2 }, sizeMod: { grande: 1.25 },
    levelDesc: [
      'Estocada longa que atravessa todos os inimigos.',
      '+15 dano, recarga menor.',
      'Estoca para frente e para trás! +15 dano.',
      '+15 dano, recarga menor, +alcance.',
      'Estoca em 4 direções! +15 dano.',
    ],
  },

  impacto: {
    id: 'impacto', name: 'Golpe Devastador', maxLevel: 5, color: 0xffc04a, element: 'terra', kind: 'melee', status: { id: 'atordoado', chance: 0.3 }, sizeMod: { pequeno: 0.8, grande: 1.3 },
    levelDesc: [
      'Golpe com o espadão que explode no chão à sua frente.',
      '+20 dano, área maior.',
      'Segunda onda de choque logo depois! +20 dano.',
      '+20 dano, área maior.',
      '+20 dano, recarga menor.',
    ],
  },
  aura: {
    id: 'aura', name: 'Aura Sagrada', maxLevel: 5, color: 0xfff0a0, element: 'sagrado', kind: 'magic',
    levelDesc: [
      'Uma aura ao seu redor fere os inimigos e cura você aos poucos.',
      '+3 dano, área maior, cura mais.',
      '+3 dano, área maior, cura mais.',
      '+3 dano, área maior, cura mais.',
      '+3 dano, área bem maior, cura mais.',
    ],
  },

  // ---- Mago
  fogo: {
    id: 'fogo', name: 'Bola de Fogo', maxLevel: 5, color: 0xff8a3a, element: 'fogo', kind: 'magic', status: { id: 'queimando', chance: 0.35 },
    levelDesc: [
      'Lança bolas de fogo no inimigo mais próximo. Explodem em área.',
      '+1 bola de fogo, +6 dano.',
      '+6 dano, explosão maior.',
      '+1 bola de fogo, +6 dano.',
      '+1 bola de fogo, +6 dano, recarga menor.',
    ],
  },
  raio: {
    id: 'raio', name: 'Corrente de Raios', maxLevel: 5, color: 0x7ad8ff, element: 'vento', kind: 'magic', status: { id: 'atordoado', chance: 0.2 },
    levelDesc: [
      'Um raio atinge um inimigo e salta para outros próximos.',
      '+1 salto, +8 dano.',
      '+1 salto, +8 dano, recarga menor.',
      '+1 salto, +8 dano.',
      'Dois raios por vez! +8 dano.',
    ],
  },
  meteoro: {
    id: 'meteoro', name: 'Chuva de Meteoros', maxLevel: 5, color: 0xff5a3a, element: 'fogo', kind: 'magic', status: { id: 'queimando', chance: 0.5 },
    levelDesc: [
      'Meteoros caem sobre os inimigos causando grande dano em área.',
      '+1 meteoro, +25 dano.',
      '+25 dano, área maior.',
      '+1 meteoro, +25 dano.',
      '+2 meteoros, +25 dano, recarga menor.',
    ],
  },

  livro: {
    id: 'livro', name: 'Livros Voadores', maxLevel: 5, color: 0xc98a4a, element: 'fantasma', kind: 'magic', status: { id: 'atordoado', chance: 0.1 },
    levelDesc: [
      'Arremessa livros pesados que atravessam os inimigos.',
      '+1 livro, +7 dano.',
      'Os livros atravessam +1 inimigo. +7 dano.',
      '+1 livro, +7 dano.',
      '+1 livro, +7 dano, recarga menor.',
    ],
  },

  // ---- Arqueiro
  flecha: {
    id: 'flecha', name: 'Flecha', maxLevel: 5, color: 0xc9a46a, element: 'neutro', kind: 'ranged', status: { id: 'sangrando', chance: 0.08 }, sizeMod: { grande: 0.9 },
    levelDesc: [
      'Atira flechas no inimigo mais próximo.',
      '+1 flecha, +4 dano.',
      'As flechas atravessam +1 inimigo. +4 dano.',
      '+1 flecha, +4 dano.',
      '+1 flecha, atravessam +1 inimigo, +4 dano.',
    ],
  },
  chuva: {
    id: 'chuva', name: 'Saraivada das Sombras', maxLevel: 5, color: 0x9a7ad0, element: 'sombrio', kind: 'ranged', status: { id: 'envenenado', chance: 0.25 },
    levelDesc: [
      'Flechas sombrias caem sobre um grupo de inimigos.',
      '+3 dano por flecha, área maior.',
      'Duas chuvas por vez! +3 dano.',
      '+3 dano, dura mais.',
      'Três chuvas por vez! +3 dano.',
    ],
  },
  tiro: {
    id: 'tiro', name: 'Tiro Perfurante', maxLevel: 5, color: 0xffe36a, element: 'vento', kind: 'ranged', status: { id: 'sangrando', chance: 0.3 }, sizeMod: { grande: 1.2 },
    levelDesc: [
      'Flecha gigante que atravessa tudo em linha reta.',
      '+20 dano, recarga menor.',
      'Dispara dois tiros! +20 dano.',
      '+20 dano, recarga menor, mais largo.',
      'Dispara três tiros! +20 dano.',
    ],
  },
};
