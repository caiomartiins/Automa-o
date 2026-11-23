export type Element = 'neutro' | 'fogo' | 'agua' | 'terra' | 'vento' | 'sagrado' | 'sombrio' | 'mortovivo';

/** Multiplicador do elemento do ataque contra o elemento do alvo */
const TABLE: Partial<Record<Element, Partial<Record<Element, number>>>> = {
  fogo: { terra: 1.5, agua: 0.5, fogo: 0.25, mortovivo: 1.25 },
  agua: { fogo: 1.5, agua: 0.25, vento: 0.5 },
  vento: { agua: 1.5, terra: 0.5, vento: 0.25 },
  terra: { vento: 1.5, fogo: 0.5, terra: 0.25 },
  sagrado: { mortovivo: 1.5, sombrio: 1.25, sagrado: 0 },
  sombrio: { sagrado: 1.25, sombrio: 0, mortovivo: 0 },
};

export function elementMod(atk: Element, def: Element) {
  return TABLE[atk]?.[def] ?? 1;
}

export const ELEMENT_NAME: Record<Element, string> = {
  neutro: 'Neutro', fogo: 'Fogo', agua: 'Água', terra: 'Terra', vento: 'Vento', sagrado: 'Sagrado', sombrio: 'Sombrio', mortovivo: 'Morto-vivo',
};

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Chance de acerto físico: 80% + HIT − Flee (entre 5% e 95%) */
export function hitChance(hit: number, flee: number) {
  return clamp(80 + hit - flee, 5, 95) / 100;
}

/** Defesa dura reduz em %, defesa macia subtrai */
export function applyDef(raw: number, hardDef: number, softDef: number) {
  return Math.max(1, Math.round(raw * (1 - Math.min(hardDef, 90) / 100) - softDef));
}
