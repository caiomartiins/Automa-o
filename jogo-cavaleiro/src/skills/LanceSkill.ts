import { Skill } from './Skill';

/** Estocada longa e perfurante (habilidade do Cavaleiro). */
export class LanceSkill extends Skill {
  readonly id = 'lanca' as const;
  private timer = 400;

  get damage() { return (30 + 15 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (2400 - 150 * (this.level - 1)) / this.g.stats.haste; }
  get length() { return (240 + 20 * (this.level - 1)) * this.g.stats.area; }
  get width() { return 34 * this.g.stats.area; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = this.cooldown;
    const base = this.g.facing.angle();
    const dirs = this.level >= 5 ? 4 : this.level >= 3 ? 2 : 1;
    for (let i = 0; i < dirs; i++) this.thrust(base + (i * Math.PI * 2) / dirs);
  }

  private thrust(angle: number) {
    const p = this.g.player;
    const len = this.length;
    const w = this.width;
    this.g.fx.lance(p.x, p.y, angle, len, w);

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // busca só na região em volta da lança
    const midX = p.x + (cos * len) / 2;
    const midY = p.y + (sin * len) / 2;
    for (const e of this.g.queryEnemies(midX, midY, len / 2 + w, this.near)) {
      if (!e.active) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const along = dx * cos + dy * sin;
      const perp = Math.abs(-dx * sin + dy * cos);
      if (along >= -e.def.radius && along <= len + e.def.radius && perp <= w / 2 + e.def.radius) {
        this.g.damageEnemy(e, this.damage, 320, p.x, p.y, this.id);
      }
    }
  }
}
