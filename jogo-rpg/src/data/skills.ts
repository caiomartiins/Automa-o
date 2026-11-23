import type { ClassId } from './classes';
import type { Element } from '../game/combat';

export type SkillGlyph = 'cura' | 'golpe' | 'explosao' | 'espada' | 'coracao' | 'fogo' | 'gelo' | 'raio' | 'bola' | 'gota' | 'flechas' | 'chuva' | 'olho' | 'alvo' | 'foco';

/** Como o modo automático trata a habilidade */
export type AutoKind = 'cura' | 'buff' | 'area-proprio' | 'alvo' | 'area-alvo';
/** Quando o modo automático usa a habilidade */
export type AutoCond = 'sempre' | 'grupo2' | 'grupo3' | 'hp50' | 'hp30' | 'buff';

export const COND_LABEL: Record<AutoCond, string> = {
  sempre: 'Sempre que puder', grupo2: 'Com 2+ inimigos juntos', grupo3: 'Com 3+ inimigos juntos',
  hp50: 'HP abaixo de 50%', hp30: 'HP abaixo de 30%', buff: 'Quando o efeito acabar',
};
export const CONDS_FOR: Record<AutoKind, AutoCond[]> = {
  cura: ['hp50', 'hp30'],
  buff: ['buff'],
  'area-proprio': ['sempre', 'grupo2', 'grupo3'],
  alvo: ['sempre'],
  'area-alvo': ['sempre', 'grupo2', 'grupo3'],
};

export interface SkillDef {
  id: string;
  auto?: AutoKind;
  name: string;
  cls: ClassId;
  max: number;
  kind: 'ativa' | 'passiva';
  /** inimigo = precisa de alvo; area = acerta em volta do alvo; proprio = em si mesmo */
  target?: 'inimigo' | 'area' | 'proprio';
  /** Alcance em pixels (sem valor = alcance da arma) */
  range?: number;
  sp?: (lv: number) => number;
  cast?: (lv: number) => number;
  cd?: (lv: number) => number;
  req?: [string, number];
  element?: Element;
  glyph: SkillGlyph;
  color: string;
  desc: (lv: number) => string;
}

export const SKILLS: SkillDef[] = [
  {
    id: 'primeiros-socorros', name: 'Primeiros Socorros', cls: 'aprendiz', max: 1, kind: 'ativa', target: 'proprio', auto: 'cura',
    sp: () => 3, cd: () => 1, glyph: 'cura', color: '#3fbf5a',
    desc: () => 'Recupera um pouco de HP (8 + nível de base).',
  },

  // ---- Espadachim ----
  {
    id: 'golpe-poderoso', name: 'Golpe Poderoso', cls: 'espadachim', max: 10, kind: 'ativa', target: 'inimigo', auto: 'alvo',
    sp: (lv) => (lv <= 5 ? 8 : 15), cd: () => 0.7, glyph: 'golpe', color: '#d9534f',
    desc: (lv) => `Golpe forte em um inimigo: ${100 + 30 * lv}% de dano.${lv >= 6 ? ` ${(lv - 5) * 5}% de chance de atordoar.` : ''}`,
  },
  {
    id: 'impacto-explosivo', name: 'Impacto Explosivo', cls: 'espadachim', max: 10, kind: 'ativa', target: 'proprio', auto: 'area-proprio',
    sp: () => 15, cd: () => 2, req: ['golpe-poderoso', 3], element: 'fogo', glyph: 'explosao', color: '#f08a24',
    desc: (lv) => `Explosão de fogo em volta de você: ${100 + 20 * lv}% de dano e empurra os inimigos.`,
  },
  {
    id: 'pericia-espada', name: 'Perícia com Espada', cls: 'espadachim', max: 10, kind: 'passiva', glyph: 'espada', color: '#7a8db0',
    desc: (lv) => `+${4 * lv} de Atq com espadas e facas.`,
  },
  {
    id: 'recuperar-hp', name: 'Recuperar HP', cls: 'espadachim', max: 10, kind: 'passiva', glyph: 'coracao', color: '#e0453a',
    desc: (lv) => `Recupera mais HP com o tempo: +${5 * lv} e +${(0.2 * lv).toFixed(1)}% do HP máximo.`,
  },

  // ---- Mago ----
  {
    id: 'seta-fogo', name: 'Seta de Fogo', cls: 'mago', max: 10, kind: 'ativa', target: 'inimigo', range: 420, auto: 'alvo',
    sp: (lv) => 10 + 2 * lv, cast: (lv) => 0.4 + 0.15 * lv, cd: () => 0.5, element: 'fogo', glyph: 'fogo', color: '#f05a24',
    desc: (lv) => `${lv} seta(s) de fogo, cada uma com 100% de dano mágico.`,
  },
  {
    id: 'seta-gelo', name: 'Seta de Gelo', cls: 'mago', max: 10, kind: 'ativa', target: 'inimigo', range: 420, auto: 'alvo',
    sp: (lv) => 10 + 2 * lv, cast: (lv) => 0.4 + 0.15 * lv, cd: () => 0.5, element: 'agua', glyph: 'gelo', color: '#4fb6e8',
    desc: (lv) => `${lv} seta(s) de gelo de 100% cada. ${3 * lv}% de chance de congelar.`,
  },
  {
    id: 'seta-raio', name: 'Relâmpago', cls: 'mago', max: 10, kind: 'ativa', target: 'inimigo', range: 420, auto: 'alvo',
    sp: (lv) => 10 + 2 * lv, cast: (lv) => 0.4 + 0.15 * lv, cd: () => 0.5, element: 'vento', glyph: 'raio', color: '#e8c63a',
    desc: (lv) => `${lv} raio(s) do céu de 100% cada.`,
  },
  {
    id: 'bola-fogo', name: 'Bola de Fogo', cls: 'mago', max: 10, kind: 'ativa', target: 'area', range: 400, auto: 'area-alvo',
    sp: () => 25, cast: () => 1.2, cd: () => 1.2, req: ['seta-fogo', 4], element: 'fogo', glyph: 'bola', color: '#c2391b',
    desc: (lv) => `Explode no alvo e em volta dele: ${150 + 20 * lv}% de dano mágico.`,
  },
  {
    id: 'recuperar-sp', name: 'Recuperar SP', cls: 'mago', max: 10, kind: 'passiva', glyph: 'gota', color: '#3c7ee0',
    desc: (lv) => `Recupera mais SP com o tempo: +${3 * lv}.`,
  },

  // ---- Arqueiro ----
  {
    id: 'disparo-duplo', name: 'Disparo Duplo', cls: 'arqueiro', max: 10, kind: 'ativa', target: 'inimigo', auto: 'alvo',
    sp: () => 12, cd: () => 0.5, glyph: 'flechas', color: '#5c9a3a',
    desc: (lv) => `Duas flechas de uma vez: ${90 + 10 * lv}% de dano cada.`,
  },
  {
    id: 'chuva-flechas', name: 'Chuva de Flechas', cls: 'arqueiro', max: 10, kind: 'ativa', target: 'area', auto: 'area-alvo',
    sp: () => 15, cd: () => 1, req: ['disparo-duplo', 3], glyph: 'chuva', color: '#3a7a5c',
    desc: (lv) => `Flechas caem no alvo e em volta: ${80 + 5 * lv}% de dano.`,
  },
  {
    id: 'concentracao', name: 'Concentração', cls: 'arqueiro', max: 10, kind: 'ativa', target: 'proprio', auto: 'buff',
    sp: (lv) => 20 + 5 * lv, cd: () => 1, req: ['olhos-coruja', 3], glyph: 'foco', color: '#c77dd6',
    desc: (lv) => `+${lv + 2} AGI e DES por ${40 + 20 * lv} s.`,
  },
  {
    id: 'olhos-coruja', name: 'Olhos de Coruja', cls: 'arqueiro', max: 10, kind: 'passiva', glyph: 'olho', color: '#8a6d3b',
    desc: (lv) => `+${lv} DES.`,
  },
  {
    id: 'olhos-aguia', name: 'Olhos de Águia', cls: 'arqueiro', max: 10, kind: 'passiva', req: ['olhos-coruja', 3], glyph: 'alvo', color: '#b05a3b',
    desc: (lv) => `+${lv * 14} de alcance com arco e +${lv} de precisão.`,
  },
];

const BY_ID = new Map(SKILLS.map((s) => [s.id, s]));
export function skill(id: string) {
  return BY_ID.get(id)!;
}
export function skillsOf(cls: ClassId) {
  return SKILLS.filter((s) => s.cls === cls);
}

/** Habilidades ativas de cada classe (o Aprendiz leva os Primeiros Socorros para todas) */
export const ACTIVE_BY_CLASS: Record<ClassId, string[]> = {
  aprendiz: ['primeiros-socorros'],
  espadachim: ['golpe-poderoso', 'impacto-explosivo', 'primeiros-socorros'],
  mago: ['seta-fogo', 'seta-gelo', 'seta-raio', 'bola-fogo', 'primeiros-socorros'],
  arqueiro: ['disparo-duplo', 'chuva-flechas', 'concentracao', 'primeiros-socorros'],
};

/** Condição inicial de cada tipo no modo automático */
export const DEFAULT_COND: Record<AutoKind, AutoCond> = {
  cura: 'hp50', buff: 'buff', 'area-proprio': 'grupo2', alvo: 'sempre', 'area-alvo': 'grupo2',
};
