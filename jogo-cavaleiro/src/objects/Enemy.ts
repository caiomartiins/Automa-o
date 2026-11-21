import Phaser from 'phaser';
import type { EnemyDef } from '../data/enemies';

/** Inimigo reutilizável (object pooling): nunca é destruído, só desativado. */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  def!: EnemyDef;
  hp = 0;
  maxHp = 0;
  knockUntil = 0;
  flashUntil = 0;
  shieldHitAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'en-gosma');
  }

  spawn(def: EnemyDef, x: number, y: number, hpMult: number) {
    this.def = def;
    this.setTexture(def.texture);
    this.enableBody(true, x, y, true, true);
    this.hp = this.maxHp = Math.ceil(def.hp * hpMult);
    this.knockUntil = 0;
    this.flashUntil = 0;
    this.shieldHitAt = 0;
    this.clearTint();
    this.setAlpha(1);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(def.radius, this.width / 2 - def.radius, this.height / 2 - def.radius);
    body.setMass(def.elite ? 6 : 1);
  }

  kill() {
    this.disableBody(true, true);
  }
}
