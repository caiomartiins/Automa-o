export type SkillId =
  | 'espada' | 'escudo' | 'lanca' | 'impacto' | 'aura'
  | 'fogo' | 'raio' | 'meteoro' | 'livro'
  | 'gelo' | 'relampago' | 'alma' | 'parede' | 'congelar' | 'tempestade'
  | 'nevasca' | 'trovao' | 'pantano' | 'espinhos'
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
  /** Chance extra do estado por nível da habilidade */
  statusPerLv?: number;
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
    id: 'aura', name: 'Aura Sagrada', maxLevel: 5, color: 0xfff0a0, element: 'sagrado', kind: 'melee',
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

  // ---- Mago: árvore de habilidades (pontos de classe)
  gelo: {
    id: 'gelo', name: 'Lança de Gelo', maxLevel: 5, color: 0x8fd8ff, element: 'agua', kind: 'magic', status: { id: 'congelado', chance: 0.08 }, statusPerLv: 0.02,
    levelDesc: [
      'Dispara lanças de gelo em leque no inimigo mais próximo. Podem congelar.',
      '+1 lança, +3 dano.',
      '+1 lança, +3 dano.',
      '+1 lança, +3 dano.',
      '+1 lança, +3 dano, recarga menor.',
    ],
  },
  relampago: {
    id: 'relampago', name: 'Relâmpago', maxLevel: 5, color: 0xd8f0ff, element: 'vento', kind: 'magic', status: { id: 'atordoado', chance: 0.12 },
    levelDesc: [
      'Raios caem do céu nos inimigos mais próximos. Podem atordoar.',
      '+1 raio, +7 dano.',
      '+7 dano, recarga menor.',
      '+1 raio, +7 dano.',
      '+1 raio, +7 dano.',
    ],
  },
  alma: {
    id: 'alma', name: 'Ataque Espiritual', maxLevel: 5, color: 0xc8c8ff, element: 'fantasma', kind: 'magic',
    levelDesc: [
      'Esferas espirituais atravessam os inimigos. Muito fortes contra mortos-vivos.',
      '+1 esfera, +4 dano.',
      'Atravessam +1 inimigo. +4 dano.',
      '+1 esfera, +4 dano.',
      '+1 esfera, +4 dano, recarga menor.',
    ],
  },
  parede: {
    id: 'parede', name: 'Parede de Fogo', maxLevel: 5, color: 0xff7a2a, element: 'fogo', kind: 'magic', status: { id: 'queimando', chance: 0.3 },
    levelDesc: [
      'Ergue uma parede de fogo à sua frente que queima e empurra quem encosta.',
      'Parede mais larga, +3 dano, dura mais.',
      'Parede mais larga, +3 dano, dura mais.',
      'Parede mais larga, +3 dano, recarga menor.',
      'Duas paredes (frente e costas)! +3 dano.',
    ],
  },
  congelar: {
    id: 'congelar', name: 'Rajada Congelante', maxLevel: 5, color: 0x6ad0ff, element: 'agua', kind: 'magic', status: { id: 'congelado', chance: 0.35 }, statusPerLv: 0.08,
    levelDesc: [
      'Uma grande lança de gelo atravessa a fila de inimigos e congela.',
      '+8 dano, atravessa +1, congela mais.',
      '+8 dano, atravessa +1, congela mais.',
      '+8 dano, atravessa +1, recarga menor.',
      'Duas rajadas! +8 dano.',
    ],
  },
  tempestade: {
    id: 'tempestade', name: 'Tempestade de Raios', maxLevel: 5, color: 0xa8e0ff, element: 'vento', kind: 'magic', status: { id: 'atordoado', chance: 0.1 },
    levelDesc: [
      'Uma chuva de raios cai sobre o grupo de inimigos mais próximo.',
      '+1 raio, +5 dano, área maior.',
      '+1 raio, +5 dano, área maior.',
      '+1 raio, +5 dano, recarga menor.',
      '+2 raios, +5 dano.',
    ],
  },

  // ---- Bruxo
  nevasca: {
    id: 'nevasca', name: 'Nevasca', maxLevel: 5, color: 0xbff0ff, element: 'agua', kind: 'magic', status: { id: 'congelado', chance: 0.2 }, statusPerLv: 0.04,
    levelDesc: [
      'Uma nevasca gira sobre os inimigos, ferindo várias vezes e congelando.',
      '+5 dano, área maior.',
      '+1 golpe da nevasca, +5 dano.',
      '+5 dano, área maior, recarga menor.',
      '+1 golpe da nevasca, +5 dano.',
    ],
  },
  trovao: {
    id: 'trovao', name: 'Fúria dos Céus', maxLevel: 5, color: 0xfff27a, element: 'vento', kind: 'magic', status: { id: 'atordoado', chance: 0.2 },
    levelDesc: [
      'Raios gigantes caem em toda a área ao seu redor, várias vezes.',
      '+7 dano, área maior.',
      '+1 onda de raios, +7 dano.',
      '+7 dano, área maior, recarga menor.',
      '+1 onda de raios, +7 dano.',
    ],
  },
  pantano: {
    id: 'pantano', name: 'Pântano', maxLevel: 5, color: 0x8a7a4a, element: 'terra', kind: 'magic', status: { id: 'lento', chance: 1 },
    levelDesc: [
      'Transforma o chão em pântano: os inimigos ficam lentos e se ferem aos poucos.',
      'Área maior, +2 dano, dura mais.',
      'Área maior, +2 dano, dura mais.',
      'Área maior, +2 dano, recarga menor.',
      'Dois pântanos por vez! +2 dano.',
    ],
  },

  // ---- Professor
  espinhos: {
    id: 'espinhos', name: 'Espinhos da Terra', maxLevel: 5, color: 0xc8a050, element: 'terra', kind: 'magic', status: { id: 'atordoado', chance: 0.15 }, sizeMod: { grande: 1.15 },
    levelDesc: [
      'Espinhos de pedra brotam do chão embaixo dos inimigos.',
      '+1 espinho, +8 dano.',
      '+8 dano, área maior.',
      '+1 espinho, +8 dano.',
      '+1 espinho, +8 dano, recarga menor.',
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
