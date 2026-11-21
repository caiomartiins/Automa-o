import Phaser from 'phaser';
import type { GameScene } from './scenes/GameScene';
import type { Enemy } from './objects/Enemy';
import { FX_DEPTH } from './fx';
import type { SkillId } from './data/skills';

export interface ShotOptions {
  speed: number;
  damage: number;
  /** Quantos inimigos atravessa antes de sumir */
  pierce: number;
  /** Raio de colisão do projétil */
  radius: number;
  /** Tempo de vida em ms */
  life: number;
  knockback: number;
  /** Se > 0, explode nesse raio ao acertar (bola de fogo) */
  explode?: number;
  scale?: number;
  /** Habilidade que disparou (para elemento, atributos e estados) */
  src?: SkillId;
}

interface Shot extends ShotOptions {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  hit: Set<Enemy>;
}

/** Projéteis das habilidades (flechas, bolas de fogo), com objetos reaproveitados */
export class Projectiles {
  private shots: Shot[] = [];
  private pool: Phaser.GameObjects.Image[] = [];
  private near: Enemy[] = [];

  constructor(private g: GameScene) {}

  fire(texture: string, x: number, y: number, angle: number, opts: ShotOptions) {
    const img = this.pool.pop() ?? this.g.add.image(0, 0, texture);
    img.setTexture(texture).setPosition(x, y).setRotation(angle).setScale(0.5 * (opts.scale ?? 1))
      .setActive(true).setVisible(true).setDepth(FX_DEPTH - 1).setOrigin(0.7, 0.5);
    this.shots.push({
      ...opts, img,
      vx: Math.cos(angle) * opts.speed,
      vy: Math.sin(angle) * opts.speed,
      hit: new Set(),
    });
  }

  update(dt: number) {
    const s = dt / 1000;
    const shots = this.shots;
    for (let i = shots.length - 1; i >= 0; i--) {
      const p = shots[i];
      p.life -= dt;
      p.img.x += p.vx * s;
      p.img.y += p.vy * s;
      let done = p.life <= 0;

      if (!done) {
        for (const e of this.g.queryEnemies(p.img.x, p.img.y, p.radius, this.near)) {
          if (!e.active || p.hit.has(e)) continue;
          const dx = e.x - p.img.x;
          const dy = e.y - p.img.y;
          const r = p.radius + e.def.radius;
          if (dx * dx + dy * dy > r * r) continue;
          if (p.explode) {
            this.g.explode(p.img.x, p.img.y, p.explode, p.damage, p.knockback, 0xff8a3a, p.src);
            done = true;
            break;
          }
          p.hit.add(e);
          this.g.damageEnemy(e, p.damage, p.knockback, p.img.x - p.vx, p.img.y - p.vy, p.src);
          if (--p.pierce <= 0) {
            done = true;
            break;
          }
        }
      }

      if (done) {
        p.img.setActive(false).setVisible(false);
        this.pool.push(p.img);
        shots[i] = shots[shots.length - 1];
        shots.pop();
      }
    }
  }
}
