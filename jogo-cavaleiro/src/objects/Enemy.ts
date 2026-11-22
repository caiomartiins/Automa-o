import Phaser from 'phaser';
import type { EnemyDef } from '../data/enemies';
import { STATUS, type StatusId } from '../data/rpg';

const STATUS_PRIORITY: StatusId[] = ['congelado', 'atordoado', 'queimando', 'envenenado', 'sangrando', 'lento'];

/**
 * Inimigo reutilizável (object pooling): nunca é destruído, só desativado.
 * Não usa o motor de física: o movimento e as colisões são calculados no GameScene,
 * o que é bem mais leve com centenas de inimigos na tela.
 */
export class Enemy extends Phaser.GameObjects.Sprite {
  def!: EnemyDef;
  hp = 0;
  maxHp = 0;
  /** Dano e velocidade já com a progressão do tempo */
  damage = 0;
  speed = 0;
  vx = 0;
  vy = 0;
  /** Força de afastamento dos vizinhos (calculada em frames alternados) */
  sepX = 0;
  sepY = 0;
  knockUntil = 0;
  flashUntil = 0;
  shieldHitAt = 0;
  /** Chefe bloqueando com escudo (recebe bem menos dano) */
  blocking = false;
  /** Nível do monstro, acerto (HIT) e esquiva (Flee) */
  mlv = 1;
  hit = 20;
  flee = 1;
  /** Até quando cada estado dura (tempo da partida, em ms) e o dano por tique */
  statusUntil: Record<StatusId, number> = { queimando: 0, envenenado: 0, sangrando: 0, atordoado: 0, congelado: 0, lento: 0 };
  statusDot: Record<StatusId, number> = { queimando: 0, envenenado: 0, sangrando: 0, atordoado: 0, congelado: 0, lento: 0 };
  nextDot = 0;
  /** Tem algum estado ativo (para atualizar a cor só quando preciso) */
  hasStatus = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'en-gosma');
  }

  spawn(def: EnemyDef, x: number, y: number, hpMult: number, dmgMult = 1, speedMult = 1) {
    this.def = def;
    this.setTexture(def.texture).setPosition(x, y).setActive(true).setVisible(true).setAlpha(1);
    // a arte é desenhada em 2x; elites e chefes aparecem maiores
    this.setScale(0.5 * (def.scale ?? 1));
    const anim = this.scene.anims.get(`${def.texture}-move`);
    this.play({ key: anim.key, startFrame: Phaser.Math.Between(0, anim.frames.length - 1) });
    this.hp = this.maxHp = Math.ceil(def.hp * hpMult);
    this.damage = Math.round(def.damage * dmgMult);
    this.speed = def.speed * speedMult;
    this.vx = this.vy = this.sepX = this.sepY = 0;
    this.knockUntil = this.flashUntil = this.shieldHitAt = 0;
    for (const k of STATUS_PRIORITY) this.statusUntil[k] = this.statusDot[k] = 0;
    this.nextDot = 0;
    this.hasStatus = false;
    this.blocking = false;
    this.restoreTint(-1);
  }

  /** Está parado por atordoamento ou congelamento? */
  isStopped(now: number) {
    return this.statusUntil.atordoado > now || this.statusUntil.congelado > now;
  }

  /** Volta à cor normal ou à cor do estado ativo mais importante */
  restoreTint(now: number) {
    this.clearTint();
    if (now >= 0) {
      for (const k of STATUS_PRIORITY) {
        if (this.statusUntil[k] > now) {
          this.setTint(STATUS[k].tint);
          return;
        }
      }
    }
    if (this.def?.tint !== undefined) this.setTint(this.def.tint);
  }

  kill() {
    this.stop();
    this.setActive(false).setVisible(false);
  }
}
