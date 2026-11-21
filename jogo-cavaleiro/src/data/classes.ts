import type { Stats } from './stats';
import type { SkillId } from './skills';

export type ClassId = 'aprendiz' | 'guarda' | 'cavaleiro';

export interface ClassDef {
  id: ClassId;
  name: string;
  /** Chave da textura do personagem */
  texture: string;
  /** Nível em que o personagem é promovido para esta classe */
  minLevel: number;
  description: string;
  /** Bônus somados aos atributos ao ser promovido */
  statBonus: Partial<Stats>;
  /** Habilidade recebida ao virar esta classe */
  grantsSkill?: SkillId;
  /** Próxima classe da linhagem */
  next?: ClassId;
}

/**
 * Linhagem do Cavaleiro: Aprendiz -> Guarda -> Cavaleiro.
 * Para criar outra linhagem (ex.: Mago), basta adicionar novas entradas aqui.
 */
export const CLASSES: Record<ClassId, ClassDef> = {
  aprendiz: {
    id: 'aprendiz',
    name: 'Aprendiz',
    texture: 'hero-aprendiz',
    minLevel: 1,
    description: 'Um jovem recruta com uma espada de treino.',
    statBonus: {},
    grantsSkill: 'espada',
    next: 'guarda',
  },
  guarda: {
    id: 'guarda',
    name: 'Guarda',
    texture: 'hero-guarda',
    minLevel: 10,
    description: 'Ganha o Escudo Giratório. +30 Vida, +2 Armadura.',
    statBonus: { maxHp: 30, armor: 2 },
    grantsSkill: 'escudo',
    next: 'cavaleiro',
  },
  cavaleiro: {
    id: 'cavaleiro',
    name: 'Cavaleiro',
    texture: 'hero-cavaleiro',
    minLevel: 20,
    description: 'Ganha a Investida de Lança. +50 Vida, +3 Armadura, +25% Dano, +20 Velocidade.',
    statBonus: { maxHp: 50, armor: 3, might: 0.25, speed: 20 },
    grantsSkill: 'lanca',
  },
};
