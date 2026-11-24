import Phaser from 'phaser';
import type { GameScene } from './scenes/GameScene';

/** Área perigosa que fica no chão por um tempo (poça, chamas, ossos): fere quem estiver dentro */
export interface Hazard {
  x: number;
  y: number;
  r: number;
  until: number;
  /** Dano por toque e intervalo entre toques (ms) */
  dmg: number;
  every: number;
  nextTick: number;
  /** Achatamento vertical da área (perspectiva do chão; 1 = círculo) */
  flat: number;
  img?: Phaser.GameObjects.Image;
  /** Alfa base da imagem (pulsa em volta dele) */
  alpha: number;
  status?: { kind: 'maldicao' | 'veneno' | 'teia'; ms: number };
}

/**
 * Lista de áreas perigosas de um chefe. Cada IA tem a sua e chama update() a cada quadro.
 * As imagens somem com um esmaecimento curto no fim.
 */
export class Hazards {
  private list: Hazard[] = [];

  constructor(private g: GameScene) {}

  get count() {
    return this.list.length;
  }

  add(h: Omit<Hazard, 'nextTick' | 'flat' | 'alpha'> & { delay?: number; flat?: number }) {
    const alpha = h.img?.alpha ?? 1;
    this.list.push({ ...h, flat: h.flat ?? 1, alpha, nextTick: this.g.elapsed + (h.delay ?? 0) });
  }

  update() {
    const g = this.g;
    const now = g.elapsed;
    const p = g.player;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const h = this.list[i];
      if (now >= h.until) {
        if (h.img) {
          const img = h.img;
          g.tweens.add({ targets: img, alpha: 0, duration: 250, onComplete: () => img.destroy() });
        }
        this.list[i] = this.list[this.list.length - 1];
        this.list.pop();
        continue;
      }
      if (h.img) h.img.setAlpha(h.alpha * (0.8 + 0.2 * Math.sin(now / 140 + i)));
      if (now < h.nextTick) continue;
      const dx = p.x - h.x;
      const dy = (p.y + 10 - h.y) / h.flat;
      if (dx * dx + dy * dy > h.r * h.r) continue;
      h.nextTick = now + h.every;
      if (g.hurtPlayer(h.dmg, true) && h.status) g.afflictPlayer(h.status.kind, h.status.ms);
    }
  }

  /** O chefe morreu: apaga tudo */
  clear() {
    for (const h of this.list) h.img?.destroy();
    this.list.length = 0;
  }
}
