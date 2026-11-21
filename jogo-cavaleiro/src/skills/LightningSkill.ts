import type { Enemy } from '../objects/Enemy';
import { Skill } from './Skill';

/** Mago: raio que atinge o inimigo mais próximo e salta para os vizinhos. */
export class LightningSkill extends Skill {
  readonly id = 'raio' as const;
  private timer = 500;

  get damage() { return (22 + 8 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 3 ? 1350 : 1650) / this.g.stats.haste; }
  get jumps() { return 2 + Math.min(this.level, 4); }
  get bolts() { return this.level >= 5 ? 2 : 1; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const starts = this.g.nearestEnemies(p.x, p.y, this.bolts, 480);
    if (!starts.length) {
      this.timer = 200;
      return;
    }
    this.timer = this.cooldown;
    for (const first of starts) this.chain(first);
  }

  private chain(first: Enemy) {
    const p = this.g.player;
    const hit = new Set<Enemy>();
    const points = [{ x: p.x, y: p.y - 10 }];
    let cur: Enemy | null = first;
    const range = 150 * this.g.stats.area;
    for (let j = 0; cur && j <= this.jumps; j++) {
      hit.add(cur);
      points.push({ x: cur.x, y: cur.y });
      const cx: number = cur.x;
      const cy: number = cur.y;
      this.g.damageEnemy(cur, this.damage, 60, p.x, p.y);
      // próximo alvo: o mais perto ainda não atingido
      let best: Enemy | null = null;
      let bestD = range * range;
      for (const e of this.g.queryEnemies(cx, cy, range, this.near) as Enemy[]) {
        if (!e.active || hit.has(e)) continue;
        const d = (e.x - cx) ** 2 + (e.y - cy) ** 2;
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      cur = best;
    }
    this.g.fx.bolt(points);
  }
}
