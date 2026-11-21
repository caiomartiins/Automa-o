import type { Stats } from './stats';
import type { SkillId } from './skills';

export type LineId = 'cavaleiro' | 'mago' | 'arqueiro';

export type ClassId =
  | 'aprendiz'
  | 'espadachim' | 'guarda' | 'cavaleiro'
  | 'aprendiz-magia' | 'mago' | 'arquimago'
  | 'recruta' | 'cacador' | 'patrulheiro';

export interface ClassDef {
  id: ClassId;
  name: string;
  /** Chave da textura do personagem */
  texture: string;
  /** Nível em que o personagem é promovido para esta classe */
  minLevel: number;
  description: string;
  /** Bônus somados aos atributos ao virar esta classe (inclusive a primeira) */
  statBonus: Partial<Stats>;
  /** Habilidade recebida ao virar esta classe */
  grantsSkill?: SkillId;
  /** Próxima classe da linhagem */
  next?: ClassId;
  /** Profissões que o jogador pode escolher (só o Aprendiz) */
  choices?: ClassId[];
}

/** Nível em que o Aprendiz escolhe a profissão */
export const PROFESSION_LEVEL = 5;

export const CLASSES: Record<ClassId, ClassDef> = {
  // ---- Todos começam como Aprendiz e escolhem a profissão no nível 5
  aprendiz: {
    id: 'aprendiz', name: 'Aprendiz', texture: 'hero-aprendiz', minLevel: 1,
    description: 'Um jovem aventureiro começando a jornada.',
    statBonus: {}, grantsSkill: 'espada', choices: ['espadachim', 'aprendiz-magia', 'recruta'],
  },

  // ---- Linhagem do Cavaleiro: corpo a corpo, resistente
  espadachim: {
    id: 'espadachim', name: 'Espadachim', texture: 'hero-espadachim', minLevel: PROFESSION_LEVEL,
    description: 'Mestre da espada. Golpe de Espada +1 nível, +20 Vida, +1 Armadura.',
    statBonus: { maxHp: 20, armor: 1 }, grantsSkill: 'espada', next: 'guarda',
  },
  guarda: {
    id: 'guarda', name: 'Guarda', texture: 'hero-guarda', minLevel: 10,
    description: 'Ganha o Escudo Giratório. +30 Vida, +2 Armadura.',
    statBonus: { maxHp: 30, armor: 2 }, grantsSkill: 'escudo', next: 'cavaleiro',
  },
  cavaleiro: {
    id: 'cavaleiro', name: 'Cavaleiro', texture: 'hero-cavaleiro', minLevel: 20,
    description: 'Ganha a Investida de Lança. +50 Vida, +3 Armadura, +25% Dano, +20 Velocidade.',
    statBonus: { maxHp: 50, armor: 3, might: 0.25, speed: 20 }, grantsSkill: 'lanca',
  },

  // ---- Linhagem do Mago: dano em área à distância, pouca vida
  'aprendiz-magia': {
    id: 'aprendiz-magia', name: 'Iniciado Arcano', texture: 'hero-aprendiz-magia', minLevel: PROFESSION_LEVEL,
    description: 'Estuda magia e lança bolas de fogo que explodem em área. +10% Dano, -10 Vida.',
    statBonus: { maxHp: -10, might: 0.1 }, grantsSkill: 'fogo', next: 'mago',
  },
  mago: {
    id: 'mago', name: 'Mago', texture: 'hero-mago', minLevel: 10,
    description: 'Ganha a Corrente de Raios. +20 Vida, +15% Dano, +10% Área.',
    statBonus: { maxHp: 20, might: 0.15, area: 0.1 }, grantsSkill: 'raio', next: 'arquimago',
  },
  arquimago: {
    id: 'arquimago', name: 'Arquimago', texture: 'hero-arquimago', minLevel: 20,
    description: 'Ganha a Chuva de Meteoros. +30 Vida, +30% Dano, +20% Área, ataques 10% mais rápidos.',
    statBonus: { maxHp: 30, might: 0.3, area: 0.2, haste: 0.1 }, grantsSkill: 'meteoro',
  },

  // ---- Linhagem do Arqueiro: rápido, ataques à distância
  recruta: {
    id: 'recruta', name: 'Arqueiro', texture: 'hero-recruta', minLevel: PROFESSION_LEVEL,
    description: 'Ágil e certeiro: atira flechas no inimigo mais próximo. +15 Velocidade.',
    statBonus: { speed: 15 }, grantsSkill: 'flecha', next: 'cacador',
  },
  cacador: {
    id: 'cacador', name: 'Caçador', texture: 'hero-cacador', minLevel: 10,
    description: 'Ganha a Chuva de Flechas. +20 Vida, ataques 10% mais rápidos, +15 Velocidade.',
    statBonus: { maxHp: 20, haste: 0.1, speed: 15 }, grantsSkill: 'chuva', next: 'patrulheiro',
  },
  patrulheiro: {
    id: 'patrulheiro', name: 'Patrulheiro', texture: 'hero-patrulheiro', minLevel: 20,
    description: 'Ganha o Tiro Certeiro. +35 Vida, +25% Dano, ataques 10% mais rápidos, +2 Armadura.',
    statBonus: { maxHp: 35, might: 0.25, haste: 0.1, armor: 2 }, grantsSkill: 'tiro',
  },
};

export interface LineDef {
  id: LineId;
  name: string;
  tagline: string;
  classes: [ClassId, ClassId, ClassId];
  color: number;
}

export const LINES: Record<LineId, LineDef> = {
  cavaleiro: {
    id: 'cavaleiro', name: 'Cavaleiro', tagline: 'Corpo a corpo e muita resistência',
    classes: ['espadachim', 'guarda', 'cavaleiro'], color: 0xffd04a,
  },
  mago: {
    id: 'mago', name: 'Mago', tagline: 'Magias em área, mas pouca vida',
    classes: ['aprendiz-magia', 'mago', 'arquimago'], color: 0xb07aff,
  },
  arqueiro: {
    id: 'arqueiro', name: 'Arqueiro', tagline: 'Veloz, ataca de longe',
    classes: ['recruta', 'cacador', 'patrulheiro'], color: 0x7ee07e,
  },
};
