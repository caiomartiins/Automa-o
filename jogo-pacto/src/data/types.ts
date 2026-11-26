/** Elementos: Fogo > Vento > Água > Fogo; Luz e Sombra são fortes uma contra a outra */
export type Element = 'fogo' | 'agua' | 'vento' | 'luz' | 'sombra';

export const ELEMENTS: Element[] = ['fogo', 'agua', 'vento', 'luz', 'sombra'];

export const ELEMENT_NAME: Record<Element, string> = {
  fogo: 'Fogo', agua: 'Água', vento: 'Vento', luz: 'Luz', sombra: 'Sombra',
};

export const ELEMENT_COLOR: Record<Element, number> = {
  fogo: 0xff6a3d, agua: 0x3fa9ff, vento: 0x6fdc5a, luz: 0xffe073, sombra: 0xb37bff,
};

/** 1 = vantagem, -1 = desvantagem, 0 = neutro */
export function elementEdge(att: Element, def: Element): -1 | 0 | 1 {
  if ((att === 'luz' && def === 'sombra') || (att === 'sombra' && def === 'luz')) return 1;
  const beats: Partial<Record<Element, Element>> = { fogo: 'vento', vento: 'agua', agua: 'fogo' };
  if (beats[att] === def) return 1;
  if (beats[def] === att) return -1;
  return 0;
}

export type Role = 'Ataque' | 'Defesa' | 'Vida' | 'Suporte';

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  /** Chance de crítico (0..1) */
  crate: number;
  /** Dano crítico extra (0.5 = +50%) */
  cdmg: number;
  /** Precisão para aplicar efeitos negativos (0..1) */
  acc: number;
  /** Resistência a efeitos negativos (0..1) */
  res: number;
}

/** Efeitos de status */
export type EffectKind =
  | 'atkUp' | 'defUp' | 'spdUp' | 'critUp' | 'shield' | 'regen' | 'imune'
  | 'atkDown' | 'defDown' | 'slow' | 'stun' | 'burn' | 'taunt' | 'silence';

export const BUFFS: EffectKind[] = ['atkUp', 'defUp', 'spdUp', 'critUp', 'shield', 'regen', 'imune'];

export const EFFECT_INFO: Record<EffectKind, { label: string; name: string; buff: boolean; color: number }> = {
  atkUp: { label: 'ATQ', name: 'Ataque +50%', buff: true, color: 0xff8a4a },
  defUp: { label: 'DEF', name: 'Defesa +70%', buff: true, color: 0x6aa8ff },
  spdUp: { label: 'VEL', name: 'Velocidade +30%', buff: true, color: 0x7ee07a },
  critUp: { label: 'CRI', name: 'Crítico +30%', buff: true, color: 0xffd24a },
  shield: { label: 'ESC', name: 'Escudo', buff: true, color: 0xb8e6ff },
  regen: { label: 'REG', name: 'Regeneração (12% da vida por turno)', buff: true, color: 0x5ee0a0 },
  imune: { label: 'IMU', name: 'Imunidade a efeitos negativos', buff: true, color: 0xffffff },
  atkDown: { label: 'ATQ', name: 'Ataque -40%', buff: false, color: 0xff8a4a },
  defDown: { label: 'DEF', name: 'Defesa -60%', buff: false, color: 0x6aa8ff },
  slow: { label: 'VEL', name: 'Velocidade -30%', buff: false, color: 0x7ee07a },
  stun: { label: 'ATD', name: 'Atordoado (perde o turno)', buff: false, color: 0xffe066 },
  burn: { label: 'QMD', name: 'Queimadura (5% da vida por turno)', buff: false, color: 0xff5530 },
  taunt: { label: 'PRV', name: 'Provocado (só ataca quem provocou)', buff: false, color: 0xff6a6a },
  silence: { label: 'SIL', name: 'Silêncio (só o ataque básico)', buff: false, color: 0xc28cff },
};

export type TargetKind = 'enemy' | 'allEnemies' | 'ally' | 'allAllies' | 'self' | 'randomEnemies';

export interface SkillEffect {
  kind: EffectKind;
  turns: number;
  /** Chance de aplicar (0..1). Efeitos positivos sempre entram. */
  chance: number;
  /** Quem recebe: o(s) alvo(s) do golpe, o próprio usuário ou todos os aliados */
  to: 'target' | 'self' | 'allies';
  /** Escudo: % da vida máxima de quem usa */
  value?: number;
}

export interface SkillDef {
  name: string;
  desc: string;
  /** Turnos de recarga (0 = ataque básico) */
  cooldown: number;
  target: TargetKind;
  /** Multiplicador de dano (0 = não causa dano) */
  mult?: number;
  /** Atributo usado no dano (padrão: ataque) */
  scale?: 'atk' | 'def' | 'hp';
  hits?: number;
  /** Ignora parte da defesa (0..1) */
  pierce?: number;
  /** Cura: % da vida máxima do alvo */
  heal?: number;
  /** Cura quem usa: % do dano causado */
  drain?: number;
  effects?: SkillEffect[];
  /** Muda a barra de turno do alvo (inimigos: valor negativo) */
  gauge?: number;
  /** Muda a barra de turno dos aliados */
  allyGauge?: number;
  /** Muda a própria barra de turno */
  selfGauge?: number;
  /** Remove efeitos negativos dos alvos aliados */
  cleanse?: boolean;
  /** Remove 1 efeito positivo dos alvos inimigos */
  strip?: boolean;
  /** Se derrotar o alvo, ganha um turno extra */
  extraOnKill?: boolean;
  /** Como a animação acontece */
  anim: 'melee' | 'ranged' | 'cast';
  fx?: 'corte' | 'fogo' | 'gelo' | 'raio' | 'sombra' | 'luz' | 'vento' | 'cura' | 'veneno' | 'flecha';
}
