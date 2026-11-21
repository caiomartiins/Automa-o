import Phaser from 'phaser';
import type { EnemyDef } from '../data/enemies';

/**
 * Inimigo reutilizável (object pooling): nunca é destruído, só desativado.
 * Não usa o motor de física: o movimento e as colisões são calculados no GameScene,
 * o que é bem mais leve com centenas de inimigos na tela.
 */
export class Enemy extends Phaser.GameObjects.Sprite {
  def!: EnemyDef;
  hp = 0;
  maxHp = 0;
  vx = 0;
  vy = 0;
  /** Força de afastamento dos vizinhos (calculada em frames alternados) */
  sepX = 0;
  sepY = 0;
  knockUntil = 0;
  flashUntil = 0;
  shieldHitAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'en-gosma');
  }

  spawn(def: EnemyDef, x: number, y: number, hpMult: number) {
    this.def = def;
    this.setTexture(def.texture).setPosition(x, y).setActive(true).setVisible(true).setAlpha(1).clearTint();
    // a arte é desenhada em 2x; elites e chefes aparecem maiores
    this.setScale(0.5 * (def.scale ?? 1));
    this.restoreTint();
    this.play({ key: `${def.texture}-move`, startFrame: Phaser.Math.Between(0, 3) });
    this.hp = this.maxHp = Math.ceil(def.hp * hpMult);
    this.vx = this.vy = this.sepX = this.sepY = 0;
    this.knockUntil = this.flashUntil = this.shieldHitAt = 0;
  }

  /** Volta à cor normal (depois de piscar branco ao levar dano) */
  restoreTint() {
    this.clearTint();
    if (this.def?.tint !== undefined) this.setTint(this.def.tint);
  }

  kill() {
    this.stop();
    this.setActive(false).setVisible(false);
  }
}
