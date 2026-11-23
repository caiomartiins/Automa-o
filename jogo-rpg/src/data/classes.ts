import type { WeaponType } from './items';

export type ClassId = 'aprendiz' | 'espadachim' | 'mago' | 'arqueiro';

export interface ClassDef {
  id: ClassId;
  name: string;
  texture: string;
  /** HP e SP ganhos por nível de base */
  hpLv: number;
  spLv: number;
  /** Segundos entre ataques básicos sem AGI/DES */
  baseDelay: number;
  maxJob: number;
  weapons: WeaponType[];
  tagline: string;
  main: string;
}

export const CLASSES: Record<ClassId, ClassDef> = {
  aprendiz: {
    id: 'aprendiz', name: 'Aprendiz', texture: 'hero-aprendiz', hpLv: 5, spLv: 1.2, baseDelay: 0.95, maxJob: 10,
    weapons: ['faca', 'espada'], tagline: 'Todo herói começa aqui.', main: 'Livre',
  },
  espadachim: {
    id: 'espadachim', name: 'Espadachim', texture: 'hero-espadachim', hpLv: 11, spLv: 2, baseDelay: 0.85, maxJob: 50,
    weapons: ['faca', 'espada'], tagline: 'Corpo a corpo, muita vida e defesa.', main: 'FOR · VIT · AGI',
  },
  mago: {
    id: 'mago', name: 'Mago', texture: 'hero-mago', hpLv: 5.5, spLv: 5, baseDelay: 1.0, maxJob: 50,
    weapons: ['faca', 'cajado'], tagline: 'Magias elementais de longe, pouca vida.', main: 'INT · DES',
  },
  arqueiro: {
    id: 'arqueiro', name: 'Arqueiro', texture: 'hero-arqueiro', hpLv: 7.5, spLv: 3, baseDelay: 0.9, maxJob: 50,
    weapons: ['faca', 'arco'], tagline: 'Ataca de longe com o arco.', main: 'DES · AGI',
  },
};

export const FIRST_CLASSES: ClassId[] = ['espadachim', 'mago', 'arqueiro'];
/** Nível de classe do Aprendiz para mudar de classe */
export const JOB_CHANGE_LEVEL = 10;
