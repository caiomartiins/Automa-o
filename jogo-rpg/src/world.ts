import Phaser from 'phaser';
import { BLOCKED, Grid, type MapDef } from './data/maps';

export const TILE = 64;

export interface WorldObject { key: string; x: number; y: number; w: number; flip: boolean }

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Cache de imagens com borda suave (carimbos de grama, rio etc.) */
const stampCache = new Map<string, HTMLCanvasElement>();

/** Vetores reaproveitados pelo A* (evita criar memória nova a cada busca) */
let searchBuf: { n: number; g: Float32Array; came: Int32Array; closed: Uint8Array; heapI: Int32Array; heapF: Float32Array } | null = null;
function search(n: number) {
  if (!searchBuf || searchBuf.n < n) {
    searchBuf = { n, g: new Float32Array(n), came: new Int32Array(n), closed: new Uint8Array(n), heapI: new Int32Array(n * 8), heapF: new Float32Array(n * 8) };
  }
  return searchBuf;
}

/** Mapas já desenhados ficam guardados: voltar a um mapa é instantâneo */
const worlds = new Map<string, World>();

/** Mapa pronto para usar (termina o desenho na hora se ainda faltar) */
export function worldFor(scene: Phaser.Scene, def: MapDef) {
  let w = worlds.get(def.id);
  if (!w) { w = new World(scene, def); worlds.set(def.id, w); }
  return w.finish();
}

/** Adianta o desenho de outros mapas aos poucos. Devolve true se ainda há trabalho. */
export function prebake(scene: Phaser.Scene, defs: MapDef[], budgetMs: number) {
  for (const def of defs) {
    let w = worlds.get(def.id);
    if (!w) { w = new World(scene, def); worlds.set(def.id, w); }
    if (!w.done) { w.advance(budgetMs); return true; }
  }
  return false;
}

export class World {
  grid: Grid;
  w: number;
  h: number;
  pxW: number;
  pxH: number;
  canvas!: HTMLCanvasElement;
  objects: WorldObject[] = [];
  /** 1 = dá para andar (consulta rápida, sem strings) */
  private walk: Uint8Array;
  /** O desenho do mapa é feito em etapas (pode ser adiantado aos poucos, sem travar o jogo) */
  private steps: Generator<void, void, void>;
  done = false;

  constructor(private scene: Phaser.Scene, public def: MapDef) {
    this.grid = new Grid(def.w, def.h);
    def.build(this.grid);
    this.w = def.w;
    this.h = def.h;
    this.pxW = def.w * TILE;
    this.pxH = def.h * TILE;
    this.walk = new Uint8Array(def.w * def.h);
    for (let y = 0; y < def.h; y++) for (let x = 0; x < def.w; x++) this.walk[y * def.w + x] = BLOCKED.has(this.grid.c[y][x]) ? 0 : 1;
    this.steps = this.bakeSteps();
  }

  /** Avança o desenho por até `budgetMs`. Devolve true quando terminou. */
  advance(budgetMs: number) {
    if (this.done) return true;
    const end = performance.now() + budgetMs;
    while (performance.now() < end) {
      if (this.steps.next().done) { this.done = true; break; }
    }
    return this.done;
  }

  finish() {
    while (!this.done) this.advance(1000);
    return this;
  }

  // ---------------------------------------------------------------- colisão

  walkableTile(tx: number, ty: number) {
    return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h && this.walk[ty * this.w + tx] === 1;
  }

  private ok(x: number, y: number) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h && this.walk[ty * this.w + tx] === 1;
  }

  /** O ponto (pés) cabe nesse lugar? */
  canStand(x: number, y: number, r = 10) {
    const v = r * 0.6;
    return this.ok(x, y) && this.ok(x - r, y) && this.ok(x + r, y) && this.ok(x, y - v) && this.ok(x, y + v);
  }

  /** Linha livre entre dois pontos */
  los(x0: number, y0: number, x1: number, y1: number, r = 10) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.ceil(d / 12);
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      if (!this.canStand(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r)) return false;
    }
    return true;
  }

  tileCenter(tx: number, ty: number): [number, number] {
    return [tx * TILE + TILE / 2, ty * TILE + TILE / 2];
  }

  nearestWalkable(tx: number, ty: number): [number, number] {
    if (this.walkableTile(tx, ty)) return [tx, ty];
    for (let r = 1; r < 8; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (this.walkableTile(tx + dx, ty + dy)) return [tx + dx, ty + dy];
      }
    }
    return [tx, ty];
  }

  randomWalkable(rect?: [number, number, number, number]): [number, number] {
    const [x0, y0, x1, y1] = rect ?? [1, 1, this.w - 2, this.h - 2];
    for (let i = 0; i < 80; i++) {
      const tx = Phaser.Math.Between(x0, x1), ty = Phaser.Math.Between(y0, y1);
      if (this.walkableTile(tx, ty)) {
        const [cx, cy] = this.tileCenter(tx, ty);
        return [cx + Phaser.Math.Between(-14, 14), cy + Phaser.Math.Between(-14, 14)];
      }
    }
    return this.tileCenter(...this.nearestWalkable(x0, y0));
  }

  /** A* em 8 direções com fila de prioridade (heap) e vetores fixos; depois suaviza o caminho */
  findPath(sx: number, sy: number, gx: number, gy: number, maxNodes = 4000): { x: number; y: number }[] | null {
    const W = this.w, N = this.w * this.h;
    const stx = Math.floor(sx / TILE), sty = Math.floor(sy / TILE);
    let gtx = Math.floor(gx / TILE), gty = Math.floor(gy / TILE);
    if (!this.walkableTile(gtx, gty)) {
      [gtx, gty] = this.nearestWalkable(gtx, gty);
      [gx, gy] = this.tileCenter(gtx, gty);
    }
    const start = sty * W + stx, goal = gty * W + gtx;
    if (start === goal) return [{ x: gx, y: gy }];
    const s = search(N);
    const { g, came, closed, heapI, heapF } = s;
    g.fill(Infinity); came.fill(-1); closed.fill(0);
    let size = 0;
    const push = (i: number, f: number) => {
      let k = size++;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (heapF[p] <= f) break;
        heapI[k] = heapI[p]; heapF[k] = heapF[p]; k = p;
      }
      heapI[k] = i; heapF[k] = f;
    };
    const pop = () => {
      const top = heapI[0];
      const li = heapI[--size], lf = heapF[size];
      let k = 0;
      for (;;) {
        let c = 2 * k + 1;
        if (c >= size) break;
        if (c + 1 < size && heapF[c + 1] < heapF[c]) c++;
        if (heapF[c] >= lf) break;
        heapI[k] = heapI[c]; heapF[k] = heapF[c]; k = c;
      }
      heapI[k] = li; heapF[k] = lf;
      return top;
    };
    const hfn = (i: number) => {
      const dx = Math.abs((i % W) - gtx), dy = Math.abs(((i / W) | 0) - gty);
      return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
    };
    g[start] = 0;
    push(start, hfn(start));
    let found = false, count = 0;
    while (size > 0 && count++ < maxNodes) {
      const cur = pop();
      if (cur === goal) { found = true; break; }
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cx = cur % W, cy = (cur / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (!this.walkableTile(nx, ny)) continue;
        if (dx && dy && (!this.walkableTile(cx + dx, cy) || !this.walkableTile(cx, cy + dy))) continue;
        const ni = ny * W + nx;
        if (closed[ni]) continue;
        const ng = g[cur] + (dx && dy ? 1.414 : 1);
        if (ng < g[ni]) {
          g[ni] = ng;
          came[ni] = cur;
          if (size < heapI.length) push(ni, ng + hfn(ni));
        }
      }
    }
    if (!found) return null;
    const tiles: number[] = [];
    for (let c = goal; c !== -1 && c !== start; c = came[c]) tiles.push(c);
    tiles.reverse();
    const pts = tiles.map((i) => {
      const [x, y] = this.tileCenter(i % W, (i / W) | 0);
      return { x, y };
    });
    pts[pts.length - 1] = { x: gx, y: gy };
    // suavização linear: avança enquanto houver linha livre a partir do último ponto mantido
    const out: { x: number; y: number }[] = [];
    let ax = sx, ay = sy, i = 0;
    while (i < pts.length) {
      let j = i;
      while (j + 1 < pts.length && this.los(ax, ay, pts[j + 1].x, pts[j + 1].y, 9)) j++;
      out.push(pts[j]);
      ax = pts[j].x; ay = pts[j].y;
      i = j + 1;
    }
    return out;
  }

  // ---------------------------------------------------------------- desenho

  private img(name: string) {
    const key = `tile-${name}`;
    if (!this.scene.textures.exists(key)) throw new Error(`textura ainda não carregada: ${key}`);
    return this.scene.textures.get(key).getSourceImage() as HTMLImageElement;
  }

  /** Versão com borda suave (radial ou só em cima/embaixo) */
  private stamp(name: string, mode: 'radial' | 'vertical' = 'radial') {
    const key = `${name}:${mode}`;
    let cv = stampCache.get(key);
    if (cv) return cv;
    const im = this.img(name);
    cv = document.createElement('canvas');
    cv.width = im.width; cv.height = im.height;
    const ctx = cv.getContext('2d')!;
    ctx.drawImage(im, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    let grad: CanvasGradient;
    if (mode === 'radial') {
      const r = Math.min(im.width, im.height) / 2;
      grad = ctx.createRadialGradient(im.width / 2, im.height / 2, r * 0.45, im.width / 2, im.height / 2, r);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      grad = ctx.createLinearGradient(0, 0, 0, im.height);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.16, 'rgba(0,0,0,1)');
      grad.addColorStop(0.84, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, im.width, im.height);
    stampCache.set(key, cv);
    return cv;
  }

  /** Terra sem padrão repetido: cor base + carimbos suaves da textura + pontinhos */
  private *fillDirt(c: CanvasRenderingContext2D, W: number, H: number, rng: () => number): Generator<void, void, void> {
    const R = (a: number, b: number) => a + rng() * (b - a);
    let ops = 0;
    c.fillStyle = '#bd8c55';
    c.fillRect(0, 0, W, H);
    const st = this.stamp('terra');
    for (let i = 0; i < (W * H) / 1100; i++) {
      const w = R(60, 120), h = w * R(0.6, 0.9);
      c.save();
      c.translate(R(-40, W + 40), R(-40, H + 40));
      c.scale(rng() < 0.5 ? -1 : 1, rng() < 0.5 ? -1 : 1);
      c.globalAlpha = R(0.5, 0.9);
      c.drawImage(st, -w / 2, -h / 2, w, h);
      c.restore();
      if (++ops % 150 === 0) yield;
    }
    c.globalAlpha = 1;
    for (let i = 0; i < (W * H) / 260; i++) {
      c.fillStyle = rng() < 0.6 ? 'rgba(110, 70, 35, 0.35)' : 'rgba(240, 205, 150, 0.35)';
      const s = R(1.5, 3.5);
      c.fillRect(R(0, W), R(0, H), s, s);
      if (++ops % 1500 === 0) yield;
    }
    for (let i = 0; i < (W * H) / 16000; i++) {
      const x = R(0, W), y = R(0, H), r = R(2, 3.6);
      c.fillStyle = '#a8957a'; c.strokeStyle = 'rgba(90, 60, 35, 0.6)'; c.lineWidth = 1;
      c.beginPath(); c.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    }
  }

  private *bakeSteps(): Generator<void, void, void> {
    const { grid, pxW: W, pxH: H, def } = this;
    let ops = 0;
    const rng = mulberry32(hash(def.id));
    const R = (a: number, b: number) => a + rng() * (b - a);
    const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d')!;
    this.canvas = cv;

    const drawFlip = (src: CanvasImageSource, x: number, y: number, w: number, h: number, flip: boolean) => {
      if (!flip) { ctx.drawImage(src, x, y, w, h); return; }
      ctx.save(); ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(src, 0, 0, w, h); ctx.restore();
    };

    // ---- chão ----
    if (def.ground === 'grama') {
      ctx.fillStyle = '#688c3e';
      ctx.fillRect(0, 0, W, H);
      const stamps = [0, 1, 2, 3, 0, 1, 2, 3, 4, 5].map((i) => this.stamp(`grama${i}`));
      const n = Math.ceil((W * H) / (40 * 40));
      for (let i = 0; i < n; i++) {
        const s = pick(stamps), size = R(66, 86);
        drawFlip(s, R(-40, W), R(-40, H), size, size, rng() < 0.5);
        if (++ops % 150 === 0) yield;
      }
    } else {
      yield* this.fillDirt(ctx, W, H, rng);
      // manchas para quebrar a repetição
      for (let i = 0; i < (W * H) / 9000; i++) {
        ctx.fillStyle = rng() < 0.5 ? 'rgba(60,35,15,0.10)' : 'rgba(255,230,180,0.07)';
        ctx.beginPath(); ctx.ellipse(R(0, W), R(0, H), R(20, 70), R(14, 40), R(0, 3), 0, Math.PI * 2); ctx.fill();
      }
    }

    // ---- caminhos de terra ----
    const isPath = (x: number, y: number) => grid.get(x, y) === '=' || grid.get(x, y) === 'H';
    const pathTiles: [number, number][] = [];
    for (let y = 0; y < grid.h; y++) for (let x = 0; x < grid.w; x++) if (grid.get(x, y) === '=') pathTiles.push([x, y]);
    if (pathTiles.length) {
      const drawShape = (c: CanvasRenderingContext2D, rad: number, jitter: number) => {
        c.lineCap = 'round';
        c.lineWidth = rad * 2;
        for (const [x, y] of pathTiles) {
          const [cx, cy] = this.tileCenter(x, y);
          c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.fill();
          for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
            if (!isPath(x + dx, y + dy)) continue;
            if (dx && dy && !(isPath(x + dx, y) && isPath(x, y + dy))) continue;
            c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + dx * TILE, cy + dy * TILE); c.stroke();
          }
          for (let k = 0; k < 5; k++) {
            const a = R(0, Math.PI * 2), d = R(rad * 0.7, rad + jitter);
            c.beginPath(); c.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, R(5, 11), 0, Math.PI * 2); c.fill();
          }
        }
      };
      yield;
      // borda escura de grama pisada
      ctx.save();
      ctx.fillStyle = ctx.strokeStyle = 'rgba(66, 74, 28, 0.45)';
      drawShape(ctx, 37, 6);
      ctx.restore();
      yield;
      // terra: só na área que tem caminho (bem menos pixels que o mapa inteiro)
      let bx0 = Infinity, by0 = Infinity, bx1 = 0, by1 = 0;
      for (const [x, y] of pathTiles) { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); }
      const ox = Math.max(0, bx0 * TILE - TILE), oy = Math.max(0, by0 * TILE - TILE);
      const bw = Math.min(W, (bx1 + 2) * TILE) - ox, bh = Math.min(H, (by1 + 2) * TILE) - oy;
      const mask = document.createElement('canvas');
      mask.width = bw; mask.height = bh;
      const m = mask.getContext('2d')!;
      m.translate(-ox, -oy);
      m.fillStyle = m.strokeStyle = '#fff';
      drawShape(m, 31, 4);
      yield;
      const dirt = document.createElement('canvas');
      dirt.width = bw; dirt.height = bh;
      const dc = dirt.getContext('2d')!;
      yield* this.fillDirt(dc, bw, bh, rng);
      dc.globalCompositeOperation = 'destination-in';
      dc.drawImage(mask, 0, 0);
      ctx.drawImage(dirt, ox, oy);
      mask.width = mask.height = dirt.width = dirt.height = 1;
      yield;
    }

    // ---- decoração solta ----
    const grassDecals = ['flores-amarelas0', 'flores-amarelas1', 'flores-amarelas2', 'tufos', 'tufos', 'pedrinhas0', 'pedrinhas1'];
    const keyedDecals = ['flores0', 'flores1', 'flores2', 'pedras-soltas0', 'pedras-soltas1'];
    const nearBlocked = (x: number, y: number) => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (grid.get(x + dx, y + dy) !== '.') return true;
      return false;
    };
    for (let y = 1; y < grid.h - 1; y++) for (let x = 1; x < grid.w - 1; x++) {
      const ch = grid.get(x, y);
      const [cx, cy] = this.tileCenter(x, y);
      if (ch === '"') {
        const s = this.img(pick(['flores0', 'flores1', 'flores2']));
        drawFlip(s, cx - 38, cy - 36, 76, 70, rng() < 0.5);
        continue;
      }
      if (x === 1 && y % 4 === 0) yield;
      if (ch !== '.' || nearBlocked(x, y) || rng() > def.decor) continue;
      if (def.ground === 'grama') {
        if (rng() < 0.72) {
          const s = this.stamp(pick(grassDecals));
          const k = R(0.8, 1.05);
          drawFlip(s, cx - (s.width * k) / 2 + R(-10, 10), cy - (s.height * k) / 2 + R(-10, 10), s.width * k, s.height * k, rng() < 0.5);
        } else {
          const s = this.img(pick(keyedDecals));
          const k = R(0.55, 0.8);
          drawFlip(s, cx - (s.width * k) / 2, cy - (s.height * k) / 2, s.width * k, s.height * k, rng() < 0.5);
        }
      } else {
        const s = this.img(pick(['pedras-soltas0', 'pedras-soltas1']));
        const k = R(0.4, 0.62);
        drawFlip(s, cx - (s.width * k) / 2, cy - (s.height * k) / 2, s.width * k, s.height * k, rng() < 0.5);
      }
    }

    yield;
    // ---- rio, ponte, lagos e pedras grandes ----
    const rio = this.stamp('rio', 'vertical');
    const ponte = this.stamp('ponte', 'vertical');
    for (let y = 0; y < grid.h; y++) for (let x = 0; x < grid.w; x++) {
      const ch = grid.get(x, y);
      const px = x * TILE, py = y * TILE;
      if (ch === '~') ctx.drawImage(rio, (x % 2) * 74, 0, 74, rio.height, px - 1, py - 10, TILE + 2, TILE + 20);
      else if (ch === 'H') ctx.drawImage(ponte, px - 2, py - 10, TILE + 4, TILE + 20);
      else if (ch === 'O') ctx.drawImage(this.img('lago-redondo'), px - 5, py - 4, TILE + 10, TILE + 6);
      else if (ch === 'o') ctx.drawImage(this.stamp('lago-pequeno'), px - 8, py - 8, TILE + 16, TILE + 14);
      else if (ch === 'M' && grid.get(x - 1, y) !== 'M') ctx.drawImage(this.stamp('pedra-musgo'), px - 4, py - 6, TILE * 2 + 8, TILE + 10);
    }

    yield;
    // ---- paredão da borda (pilares lado a lado, de cima para baixo) ----
    const pillars = ['pilar0', 'pilar1', 'pilar2'].map((n) => this.img(n));
    for (let y = 0; y < grid.h; y++) for (let x = 0; x < grid.w; x++) {
      if (grid.get(x, y) !== '#') continue;
      const s = pick(pillars);
      drawFlip(s, x * TILE - 6, y * TILE - 14, TILE + 12, TILE + 18, rng() < 0.5);
    }

    yield;
    if (def.tint) {
      ctx.fillStyle = def.tint[0];
      ctx.globalAlpha = def.tint[1];
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // ---- objetos que ficam na frente/atrás dos personagens ----
    for (let y = 0; y < grid.h; y++) for (let x = 0; x < grid.w; x++) {
      const ch = grid.get(x, y);
      const [cx] = this.tileCenter(x, y);
      const by = (y + 1) * TILE;
      if (ch === 'P') this.objects.push({ key: `tile-${pick(['pilar0', 'pilar1', 'pilar2'])}`, x: cx, y: by + 4, w: TILE + 10, flip: rng() < 0.5 });
      else if (ch === 'R') this.objects.push({ key: `tile-${pick(['monte-pedras0', 'monte-pedras1'])}`, x: cx, y: by - 6, w: TILE + 8, flip: rng() < 0.5 });
      else if (ch === 'T') this.objects.push({ key: 'tile-tronco', x: cx, y: by - 10, w: TILE + 10, flip: rng() < 0.5 });
      else if (ch === 'F') this.objects.push({ key: `tile-${pick(['cerca0', 'cerca1'])}`, x: cx, y: by - 18, w: TILE + 8, flip: false });
    }
  }
}
