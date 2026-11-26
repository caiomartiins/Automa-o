export interface EnemySpec {
  id: string;
  lv: number;
  /** Chefe: vida multiplicada, maior na tela e imune a atordoamento */
  boss?: boolean;
}

export interface StageDef {
  id: string;
  region: number;
  /** Posição dentro da região (1..7) */
  n: number;
  name: string;
  waves: EnemySpec[][];
  /** XP para cada monstro do time */
  xp: number;
  /** Cristais na primeira vitória (repetir dá 1/5) */
  crystals: number;
  /** Monstro ganho na primeira vitória */
  reward?: string;
}

export interface RegionDef {
  name: string;
  subtitle: string;
  /** Cores do cenário: céu em cima, céu embaixo, chão */
  sky: [number, number];
  ground: number;
  deco: 'bosque' | 'caverna' | 'cripta';
}

export const REGIONS: RegionDef[] = [
  { name: 'Bosque Sussurrante', subtitle: 'Onde os ecos dormem entre as árvores', sky: [0x24453a, 0x5d8a5a], ground: 0x2f4a2a, deco: 'bosque' },
  { name: 'Cavernas de Magma', subtitle: 'O calor que forja os pactos', sky: [0x2a0f10, 0x7a2a16], ground: 0x3a1c14, deco: 'caverna' },
  { name: 'Cripta do Abismo', subtitle: 'O trono dos que não descansam', sky: [0x120d22, 0x3b2a5c], ground: 0x231b33, deco: 'cripta' },
];

const e = (id: string, lv: number, boss = false): EnemySpec => (boss ? { id, lv, boss } : { id, lv });

function stage(region: number, n: number, name: string, waves: EnemySpec[][], reward?: string): StageDef {
  const g = region * 7 + n; // 1..21
  return { id: `${region + 1}-${n}`, region, n, name, waves, xp: 40 + g * 12, crystals: 20 + g * 2, reward };
}

export const STAGES: StageDef[] = [
  // ───────── Bosque Sussurrante ─────────
  stage(0, 1, 'Clareira das Gosmas', [[e('gosma', 1), e('gosma', 1)], [e('gosma', 1), e('gosma', 2), e('gosma', 1)]]),
  stage(0, 2, 'Trilha dos Uivos', [[e('lobo', 1), e('gosma', 2)], [e('lobo', 2), e('lobo', 2), e('gosma', 1)]], 'lobo'),
  stage(0, 3, 'Riacho Rosado', [[e('gosma', 3), e('lobo', 2), e('gosma', 3)], [e('lobo', 3), e('gosma', 3), e('lobo', 3)]]),
  stage(0, 4, 'Ossos no Musgo', [[e('esqueleto', 4), e('gosma', 4)], [e('esqueleto', 4), e('lobo', 4), e('esqueleto', 5)]], 'esqueleto'),
  stage(0, 5, 'Raízes Antigas', [[e('lobo', 5), e('esqueleto', 4), e('gosma', 5)], [e('ent', 5), e('lobo', 5), e('gosma', 5)]]),
  stage(0, 6, 'Toca da Matilha', [[e('lobo', 5), e('lobo', 5), e('gosma', 5)], [e('esqueleto', 5), e('ent', 6), e('lobo', 5)]]),
  stage(0, 7, 'Coração do Bosque', [
    [e('gosma', 6), e('lobo', 6), e('esqueleto', 6)],
    [e('ent', 8, true), e('lobo', 6), e('gosma', 6)],
  ], 'ent'),
  // ───────── Cavernas de Magma ─────────
  stage(1, 1, 'Entrada Fumegante', [[e('esqueleto', 8), e('espadachim', 7)], [e('esqueleto', 8), e('lobo', 8), e('espadachim', 8)]]),
  stage(1, 2, 'Forja Esquecida', [[e('espadachim', 9), e('mago', 8)], [e('mago', 9), e('esqueleto', 9), e('espadachim', 9)]], 'mago'),
  stage(1, 3, 'Ninho Ardente', [[e('rainha', 9), e('esqueleto', 10)], [e('rainha', 10), e('mago', 10), e('esqueleto', 10)]]),
  stage(1, 4, 'Galeria dos Famintos', [[e('carnical', 10), e('esqueleto', 11), e('mago', 10)], [e('carnical', 11), e('carnical', 11), e('espadachim', 11)]], 'carnical'),
  stage(1, 5, 'Rio de Lava', [[e('mago', 10), e('rainha', 10), e('esqueleto', 10)], [e('minotauro', 11), e('mago', 10), e('esqueleto', 10)]]),
  stage(1, 6, 'Arena do Touro', [[e('esqueleto', 12), e('carnical', 12), e('mago', 12)], [e('minotauro', 13, true), e('espadachim', 12)]], 'minotauro'),
  stage(1, 7, 'Trono de Magma', [
    [e('mago', 13), e('espadachim', 13), e('carnical', 13)],
    [e('minotauro', 13), e('mago', 13), e('esqueleto', 13)],
    [e('rainha', 15, true), e('espadachim', 13)],
  ], 'rainha'),
  // ───────── Cripta do Abismo ─────────
  stage(2, 1, 'Portões da Cripta', [[e('esqueleto', 15), e('carnical', 15), e('esqueleto', 15)], [e('carnical', 15), e('esqueleto', 16), e('cacador', 15)]]),
  stage(2, 2, 'Salão dos Raios', [[e('bruxo', 16), e('esqueleto', 16), e('carnical', 16)], [e('bruxo', 16), e('cacador', 16), e('carnical', 17)]], 'bruxo'),
  stage(2, 3, 'Capela Profanada', [[e('cavaleiro', 17), e('bruxo', 17)], [e('cavaleiro', 17), e('carnical', 17), e('cacador', 18)]]),
  stage(2, 4, 'Ossuário', [[e('esqueleto', 18), e('esqueleto', 18), e('carnical', 18), e('esqueleto', 18)], [e('cacador', 18), e('bruxo', 19), e('carnical', 18)]], 'cavaleiro'),
  stage(2, 5, 'Altar do Pacto', [[e('cacador', 17), e('cavaleiro', 17), e('esqueleto', 17)], [e('bafome', 17), e('carnical', 17), e('esqueleto', 17)]]),
  stage(2, 6, 'Abismo Uivante', [[e('bruxo', 20), e('cacador', 20), e('carnical', 20)], [e('bafome', 20, true), e('esqueleto', 19)]], 'bafome'),
  stage(2, 7, 'Trono dos Ossos', [
    [e('cavaleiro', 19), e('cacador', 19), e('esqueleto', 19)],
    [e('bafome', 19), e('carnical', 19), e('esqueleto', 19)],
    [e('ossario', 20, true), e('esqueleto', 19), e('carnical', 19)],
  ], 'ossario'),
];

export const STAGE_BY_ID: Record<string, StageDef> = Object.fromEntries(STAGES.map((s) => [s.id, s]));

/** Monstros do primeiro time */
export const STARTERS = ['espadachim', 'arqueiro', 'professor', 'gosma'];

/** Multiplicador de vida dos chefes */
export const BOSS_HP = 3.2;
