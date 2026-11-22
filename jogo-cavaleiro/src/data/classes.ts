import type { Stats } from './stats';
import type { SkillId } from './skills';

export type LineId = 'espadachim' | 'mago' | 'arqueiro';

export type ClassId =
  | 'aprendiz'
  | 'espadachim' | 'cavaleiro' | 'paladino'
  | 'mago' | 'bruxo' | 'professor'
  | 'arqueiro' | 'cacador' | 'patrulheiro';

export interface ClassDef {
  id: ClassId;
  name: string;
  /** Chave da textura do personagem */
  texture: string;
  /** Nível em que o personagem pode virar esta classe */
  minLevel: number;
  description: string;
  /** Bônus somados aos atributos ao virar esta classe */
  statBonus: Partial<Stats>;
  /** Habilidade recebida ao virar esta classe */
  grantsSkill?: SkillId;
  /** Classes que o jogador pode escolher a seguir */
  choices?: ClassId[];
}

/** Nível da 1ª classe (profissão) e da 2ª classe */
export const PROFESSION_LEVEL = 5;
export const SECOND_CLASS_LEVEL = 15;

export const CLASSES: Record<ClassId, ClassDef> = {
  // ---- Todos começam como Aprendiz
  aprendiz: {
    id: 'aprendiz', name: 'Aprendiz', texture: 'hero-aprendiz', minLevel: 1,
    description: 'Um jovem aventureiro começando a jornada.',
    statBonus: {}, grantsSkill: 'espada', choices: ['espadachim', 'mago', 'arqueiro'],
  },

  // ---- Espadachim → Cavaleiro ou Paladino
  espadachim: {
    id: 'espadachim', name: 'Espadachim', texture: 'hero-espadachim', minLevel: PROFESSION_LEVEL,
    description: 'Espada e escudo. Ganha o Escudo Giratório. +30 Vida, +2 Armadura.',
    statBonus: { maxHp: 30, armor: 2 }, grantsSkill: 'escudo', choices: ['cavaleiro', 'paladino'],
  },
  cavaleiro: {
    id: 'cavaleiro', name: 'Cavaleiro', texture: 'hero-cavaleiro', minLevel: SECOND_CLASS_LEVEL,
    description: 'Espadão de duas mãos. Ganha o Golpe Devastador. +40 Vida, +25% Dano, +2 Armadura.',
    statBonus: { maxHp: 40, armor: 2, might: 0.25, speed: 10 }, grantsSkill: 'impacto',
  },
  paladino: {
    id: 'paladino', name: 'Paladino', texture: 'hero-paladino', minLevel: SECOND_CLASS_LEVEL,
    description: 'Guerreiro sagrado. Ganha a Aura Sagrada, que fere e cura. +60 Vida, +4 Armadura.',
    statBonus: { maxHp: 60, armor: 4, regen: 0.5 }, grantsSkill: 'aura',
  },

  // ---- Mago → Bruxo ou Professor
  mago: {
    id: 'mago', name: 'Mago', texture: 'hero-mago', minLevel: PROFESSION_LEVEL,
    description: 'Estuda magia: ganha a Bola de Fogo e a árvore de habilidades (1 ponto por nível de classe). +10% Dano, -10 Vida.',
    statBonus: { maxHp: -10, might: 0.1 }, grantsSkill: 'fogo', choices: ['bruxo', 'professor'],
  },
  bruxo: {
    id: 'bruxo', name: 'Bruxo', texture: 'hero-bruxo', minLevel: SECOND_CLASS_LEVEL,
    description: 'Mestre dos elementos: Corrente de Raios, Nevasca, Meteoros, Fúria dos Céus e Pântano. +30% Dano, +15% Área, +20 Vida.',
    statBonus: { maxHp: 20, might: 0.3, area: 0.15 }, grantsSkill: 'raio',
  },
  professor: {
    id: 'professor', name: 'Professor', texture: 'hero-professor', minLevel: SECOND_CLASS_LEVEL,
    description: 'Sábio da academia: Livros Voadores, Espinhos da Terra e passivas de suporte (INT, vida, esquiva). Ataques 15% mais rápidos, +25 Vida.',
    statBonus: { maxHp: 25, haste: 0.15, area: 0.1, magnet: 60 }, grantsSkill: 'livro',
  },

  // ---- Arqueiro → Caçador ou Patrulheiro
  arqueiro: {
    id: 'arqueiro', name: 'Arqueiro', texture: 'hero-arqueiro', minLevel: PROFESSION_LEVEL,
    description: 'Ágil e certeiro: atira flechas no inimigo mais próximo. +15 Velocidade.',
    statBonus: { speed: 15 }, grantsSkill: 'flecha', choices: ['cacador', 'patrulheiro'],
  },
  cacador: {
    id: 'cacador', name: 'Caçador de Sombras', texture: 'hero-cacador-sombras', minLevel: SECOND_CLASS_LEVEL,
    description: 'Some nas sombras. Ganha a Saraivada das Sombras. +25 Vida, ataques 10% mais rápidos, +15 Velocidade.',
    statBonus: { maxHp: 25, haste: 0.1, speed: 15 }, grantsSkill: 'chuva',
  },
  patrulheiro: {
    id: 'patrulheiro', name: 'Atirador de Elite', texture: 'hero-atirador', minLevel: SECOND_CLASS_LEVEL,
    description: 'Mira perfeita. Ganha o Tiro Perfurante. +30 Vida, +25% Dano, +1 Armadura.',
    statBonus: { maxHp: 30, might: 0.25, armor: 1 }, grantsSkill: 'tiro',
  },
};

export interface LineDef {
  id: LineId;
  name: string;
  tagline: string;
  /** [1ª classe, 2ª classe opção A, 2ª classe opção B] */
  classes: [ClassId, ClassId, ClassId];
  color: number;
}

export const LINES: Record<LineId, LineDef> = {
  espadachim: {
    id: 'espadachim', name: 'Espadachim', tagline: 'Corpo a corpo e muita resistência',
    classes: ['espadachim', 'cavaleiro', 'paladino'], color: 0xffd04a,
  },
  mago: {
    id: 'mago', name: 'Mago', tagline: 'Magias em área, mas pouca vida',
    classes: ['mago', 'bruxo', 'professor'], color: 0xb07aff,
  },
  arqueiro: {
    id: 'arqueiro', name: 'Arqueiro', tagline: 'Veloz, ataca de longe',
    classes: ['arqueiro', 'patrulheiro', 'cacador'], color: 0x7ee07e,
  },
};

/** Linhagem a que uma classe pertence */
export function lineOf(id: ClassId): LineId | null {
  return (Object.values(LINES).find((l) => l.classes.includes(id))?.id) ?? null;
}
