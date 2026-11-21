import Phaser from 'phaser';
import type { EnemyDef } from '../data/enemies';

/**
 * Inimigo reutilizável (object pooling): nunca é destruído, só desativado.
 * Não usa o motor de física: o movimento e as colisões são calculados no GameScene,
 * o que é bem mais leve com centenas de inimigos na tela.
 */
export class Enemy extends Phaser.GameObjects.Image {
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
    this.hp = this.maxHp = Math.ceil(def.hp * hpMult);
    this.vx = this.vy = this.sepX = this.sepY = 0;
    this.knockUntil = this.flashUntil = this.shieldHitAt = 0;
  }

  kill() {
    this.setActive(false).setVisible(false);
  }
}
