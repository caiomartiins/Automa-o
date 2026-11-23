import type { Element } from '../game/combat';

export interface MonsterDef {
  id: string;
  name: string;
  texture: string;
  lv: number;
  hp: number;
  atk: [number, number];
  def: number;
  mdef: number;
  agi: number;
  dex: number;
  /** pixels por segundo */
  speed: number;
  atkDelay: number;
  /** alcance do ataque (além dos corpos) */
  reach: number;
  /** raio do corpo (para cliques e colisão) */
  radius: number;
  scale?: number;
  aggressive: boolean;
  /** chama os vizinhos da mesma espécie quando é atacado */
  pack?: boolean;
  element: Element;
  race: string;
  baseExp: number;
  jobExp: number;
  drops: [string, number][];
  boss?: boolean;
}

export const MONSTERS: Record<string, MonsterDef> = {
  gosma: {
    id: 'gosma', name: 'Gosma', texture: 'en-gosma', lv: 1, hp: 55, atk: [7, 10], def: 2, mdef: 0, agi: 1, dex: 6,
    speed: 55, atkDelay: 1.6, reach: 6, radius: 18, aggressive: false, element: 'agua', race: 'Amorfo',
    baseExp: 14, jobExp: 9,
    drops: [['gosma-pegajosa', 0.7], ['pocao-vermelha', 0.1], ['anel-gosma', 0.008]],
  },
  lobo: {
    id: 'lobo', name: 'Lobo Cinzento', texture: 'en-lobo', lv: 8, hp: 260, atk: [26, 34], def: 4, mdef: 0, agi: 20, dex: 22,
    speed: 150, atkDelay: 1.2, reach: 8, radius: 22, aggressive: true, pack: true, element: 'neutro', race: 'Bruto',
    baseExp: 90, jobExp: 60,
    drops: [['pelo-lobo', 0.55], ['presa-lobo', 0.18], ['pocao-laranja', 0.06], ['colar-presas', 0.008], ['manto-lobo', 0.006]],
  },
  esqueleto: {
    id: 'esqueleto', name: 'Esqueleto', texture: 'en-esqueleto', lv: 12, hp: 420, atk: [42, 52], def: 10, mdef: 5, agi: 14, dex: 26,
    speed: 85, atkDelay: 1.4, reach: 10, radius: 22, aggressive: true, element: 'mortovivo', race: 'Morto-vivo',
    baseExp: 150, jobExp: 100,
    drops: [['osso-velho', 0.5], ['pocao-laranja', 0.08], ['lamina-ossuda', 0.012], ['bracelete-ossos', 0.008]],
  },
  arvore: {
    id: 'arvore', name: 'Ent Ancião', texture: 'en-arvore', lv: 16, hp: 1100, atk: [66, 84], def: 18, mdef: 10, agi: 4, dex: 30,
    speed: 48, atkDelay: 2.0, reach: 14, radius: 28, scale: 1.15, aggressive: false, element: 'terra', race: 'Planta',
    baseExp: 380, jobExp: 260,
    drops: [['galho-ancestral', 0.45], ['folha-vital', 0.1], ['cajado-carvalho', 0.015], ['coroa-folhas', 0.01]],
  },
  bafome: {
    id: 'bafome', name: 'Bafome', texture: 'en-bafome', lv: 30, hp: 16000, atk: [110, 160], def: 25, mdef: 20, agi: 40, dex: 70,
    speed: 95, atkDelay: 1.4, reach: 30, radius: 44, scale: 2.0, aggressive: true, element: 'sombrio', race: 'Demônio',
    baseExp: 9000, jobExp: 6000, boss: true,
    drops: [['chifre-bafome', 1], ['anel-bafome', 0.3], ['pocao-branca', 0.8], ['espada-larga', 0.25], ['arco-composto', 0.25], ['cajado-carvalho', 0.25]],
  },
};
