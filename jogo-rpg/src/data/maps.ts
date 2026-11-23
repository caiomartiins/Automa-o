/** Mapas montados por código: cada caractere é um tile de 64 px. */
export class Grid {
  c: string[][];
  constructor(public w: number, public h: number, fill = '.') {
    this.c = Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
  }
  get(x: number, y: number) {
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? '#' : this.c[y][x];
  }
  set(x: number, y: number, ch: string) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.c[y][x] = ch;
  }
  rect(x0: number, y0: number, x1: number, y1: number, ch: string) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, ch);
  }
  points(list: [number, number][], ch: string) {
    for (const [x, y] of list) this.set(x, y, ch);
  }
  border() {
    this.rect(0, 0, this.w - 1, 0, '#');
    this.rect(0, this.h - 1, this.w - 1, this.h - 1, '#');
    this.rect(0, 0, 0, this.h - 1, '#');
    this.rect(this.w - 1, 0, this.w - 1, this.h - 1, '#');
  }
}

/**
 * Legenda: . grama · = caminho de terra · ~ rio · H ponte · # paredão (borda) · P pilar de pedra
 * R monte de pedras · T tronco · F cerca · O lago · o laguinho com vitórias-régias · M pedra com musgo (2 tiles)
 * " canteiro de flores
 */
export const BLOCKED = new Set(['#', '~', 'P', 'R', 'T', 'F', 'O', 'o', 'M']);

export interface PortalDef { tiles: [number, number][]; to: string; arrive: [number, number]; label: string }
export interface NpcDef { id: 'instrutor' | 'mercador'; name: string; texture: string; x: number; y: number; flip?: boolean }
export interface SpawnDef { monster: string; rect: [number, number, number, number]; count: number; respawn: number }

export interface MapDef {
  id: string;
  name: string;
  subtitle: string;
  w: number;
  h: number;
  ground: 'grama' | 'terra';
  /** Cor e opacidade sobre o mapa (deixa o bosque e o covil mais escuros) */
  tint?: [string, number];
  decor: number;
  build: (g: Grid) => void;
  portals: PortalDef[];
  npcs: NpcDef[];
  spawns: SpawnDef[];
  /** Onde o jogador aparece quando não veio por um portal */
  start: [number, number];
}

export const MAPS: Record<string, MapDef> = {
  campos: {
    id: 'campos', name: 'Campos Verdes', subtitle: 'Acampamento Aurora', w: 44, h: 30, ground: 'grama', decor: 0.14,
    start: [6, 5],
    build(g) {
      g.border();
      // acampamento
      g.points([[12, 2], [12, 3], [12, 5], [12, 6]], 'P');
      g.rect(2, 8, 5, 8, 'F');
      g.rect(8, 8, 11, 8, 'F');
      g.points([[3, 2], [10, 2], [2, 6], [11, 6], [20, 10], [21, 10], [14, 24], [15, 24], [37, 21], [27, 10]], '"');
      // caminhos
      g.rect(6, 5, 7, 23, '=');
      g.rect(8, 12, 30, 13, '=');
      g.rect(29, 4, 30, 11, '=');
      g.rect(8, 22, 42, 23, '=');
      // rio com duas pontes
      g.rect(1, 17, 42, 17, '~');
      g.points([[6, 17], [7, 17], [34, 17], [35, 17]], 'H');
      g.rect(34, 18, 35, 21, '=');
      g.rect(34, 14, 35, 16, '=');
      g.rect(31, 13, 35, 13, '=');
      // obstáculos
      g.points([[2, 13], [3, 13], [15, 20], [16, 20], [16, 21], [24, 20], [38, 3], [39, 3], [40, 4], [41, 14], [26, 27], [27, 27], [22, 2]], 'P');
      g.points([[14, 10], [25, 9], [33, 6], [39, 11], [18, 25], [28, 25], [9, 27], [40, 19], [19, 6]], 'R');
      g.points([[22, 15], [11, 20], [36, 9]], 'T');
      g.points([[15, 4], [38, 26]], 'O');
      g.points([[24, 7], [12, 25]], 'o');
      g.points([[19, 3], [20, 3], [31, 20], [32, 20]], 'M');
    },
    portals: [{ tiles: [[42, 22], [42, 23]], to: 'bosque', arrive: [2, 15], label: 'Bosque Antigo' }],
    npcs: [
      { id: 'instrutor', name: 'Instrutor Dário', texture: 'npc-paladino', x: 4, y: 4 },
      { id: 'mercador', name: 'Mercadora Lina', texture: 'npc-professor', x: 9, y: 4, flip: true },
    ],
    spawns: [
      { monster: 'gosma', rect: [13, 2, 28, 15], count: 10, respawn: 8 },
      { monster: 'gosma', rect: [2, 18, 30, 28], count: 9, respawn: 8 },
      { monster: 'lobo', rect: [31, 2, 41, 15], count: 5, respawn: 15 },
      { monster: 'lobo', rect: [36, 24, 41, 28], count: 2, respawn: 20 },
    ],
  },

  bosque: {
    id: 'bosque', name: 'Bosque Antigo', subtitle: 'Recomendado: nível 8+', w: 44, h: 32, ground: 'grama', decor: 0.18,
    tint: ['#0b2a1c', 0.3],
    start: [2, 15],
    build(g) {
      g.border();
      g.rect(1, 15, 31, 16, '=');
      g.rect(30, 1, 31, 16, '=');
      g.points([
        [5, 4], [6, 4], [5, 5], [10, 8], [11, 8], [11, 9], [16, 3], [17, 3], [17, 4], [18, 4], [22, 9], [23, 9], [23, 10],
        [36, 5], [37, 5], [37, 6], [40, 10], [40, 11], [6, 20], [7, 20], [7, 21], [14, 24], [15, 24], [15, 25], [16, 25],
        [24, 20], [25, 20], [33, 22], [34, 22], [34, 23], [39, 27], [40, 27], [20, 28], [21, 28], [9, 27], [27, 26], [28, 26],
      ], 'P');
      g.points([[13, 12], [26, 6], [35, 13], [4, 26], [18, 19], [38, 19], [29, 29], [12, 18]], 'R');
      g.points([[8, 12], [20, 13], [34, 9], [25, 29], [41, 22]], 'T');
      g.points([[19, 22], [36, 26]], 'O');
      g.points([[11, 22], [30, 19]], 'o');
      g.points([[2, 9], [3, 9], [22, 26], [23, 26]], 'M');
      g.points([[3, 3], [26, 13], [9, 18], [17, 29], [38, 29]], '"');
    },
    portals: [
      { tiles: [[1, 15], [1, 16]], to: 'campos', arrive: [40, 22], label: 'Campos Verdes' },
      { tiles: [[30, 1], [31, 1]], to: 'covil', arrive: [13, 18], label: 'Covil do Bafome' },
    ],
    npcs: [],
    spawns: [
      { monster: 'lobo', rect: [2, 2, 20, 13], count: 6, respawn: 15 },
      { monster: 'esqueleto', rect: [22, 2, 42, 13], count: 7, respawn: 18 },
      { monster: 'arvore', rect: [2, 18, 42, 30], count: 4, respawn: 30 },
      { monster: 'lobo', rect: [20, 18, 42, 30], count: 3, respawn: 15 },
      { monster: 'gosma', rect: [2, 18, 20, 30], count: 3, respawn: 10 },
    ],
  },

  covil: {
    id: 'covil', name: 'Covil do Bafome', subtitle: 'Cuidado: um MVP vive aqui', w: 28, h: 22, ground: 'terra', decor: 0.1,
    tint: ['#2a0b2e', 0.34],
    start: [13, 18],
    build(g) {
      g.border();
      g.points([[6, 4], [6, 5], [21, 4], [21, 5], [4, 10], [4, 11], [23, 10], [23, 11], [7, 16], [20, 16], [10, 2], [17, 2]], 'P');
      g.points([[9, 7], [18, 7], [10, 14], [17, 14], [2, 3], [25, 3], [2, 18], [25, 18]], 'R');
    },
    portals: [{ tiles: [[13, 20], [14, 20]], to: 'bosque', arrive: [30, 3], label: 'Bosque Antigo' }],
    npcs: [],
    spawns: [
      { monster: 'esqueleto', rect: [3, 3, 24, 17], count: 4, respawn: 25 },
      { monster: 'bafome', rect: [13, 8, 14, 9], count: 1, respawn: 300 },
    ],
  },
};
