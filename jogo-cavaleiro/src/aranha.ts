import Phaser from 'phaser';
import type { GameScene } from './scenes/GameScene';
import type { Enemy } from './objects/Enemy';
import { FX_DEPTH } from './fx';
import { FILHOTE } from './data/enemies';
import { Hazards } from './hazards';

interface Shot {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
}

/** Poça de magma no chão: queima o jogador que pisar */
interface Pool {
  x: number;
  y: number;
  r: number;
  until: number;
  nextTick: number;
  img: Phaser.GameObjects.Image;
}

const FIRE = 0xff6a20;
const ACID = 0x8ad04a;

/**
 * Inteligência da Rainha Magmática (2ª mini-chefe, alterna com o Carniçal).
 * Ataques com aviso:
 *  - Cuspe de Fogo: bolas de fogo (3 em leque na fúria)
 *  - Pisada de Magma: de perto, empina e pisa; deixa uma poça de magma que queima
 *  - Teia: dispara teia em linha; quem é pego fica preso e lento
 *  - Jato Ácido: jato em linha que envenena
 *  - Salto: marca o chão onde o jogador está e cai em cima
 *  - Chuva de Magma: bolas de magma caem em volta do jogador e deixam chamas no chão
 * Com metade da vida entra em FÚRIA: olhos acesos, mais rápida, mais ataques e
 * chama a Ninhada (filhotes rápidos).
 */
export class SpiderAI {
  private nextSpit = 1200;
  private nextStomp = 0;
  private nextWeb = 3500;
  private nextAcid = 5500;
  private nextJump = 4500;
  private nextRain = 7000;
  private nextBrood = 0;
  private busyUntil = 0;
  private hazards: Hazards;
  private rage = false;
  private shots: Shot[] = [];
  private pools: Pool[] = [];
  private jump: { x0: number; y0: number; x1: number; y1: number; t0: number; dur: number } | null = null;
  private shadow: Phaser.GameObjects.Image;

  constructor(private g: GameScene, private e: Enemy, private cd = 1) {
    this.shadow = g.add.image(e.x, e.y, 'fx-sombra').setScale(3, 1.7).setAlpha(0.45);
    const now = g.elapsed;
    this.nextSpit += now;
    this.nextWeb += now;
    this.nextAcid += now;
    this.nextJump += now;
    this.nextRain += now;
    this.hazards = new Hazards(g);
  }

  private get alive() {
    return this.e.active && this.e.def.id === 'aranha';
  }

  private get k() {
    return (this.rage ? 0.7 : 1) * this.cd;
  }

  update(dt: number): boolean {
    this.updateShots(dt);
    this.updatePools();
    this.hazards.update();
    const { g, e } = this;
    if (!e.active || e.def.id !== 'aranha') {
      this.hazards.clear();
      if (!this.shots.length && !this.pools.length) {
        this.shadow.destroy();
        return false;
      }
      this.shadow.setVisible(false);
      return true;
    }
    this.shadow.setPosition(e.x, e.y + 58).setDepth(e.y - 1);
    const now = g.elapsed;
    if (!this.rage && e.hp <= e.maxHp * 0.5) this.enrage();
    e.speed = e.def.speed * (this.rage ? 1.35 : 1);

    // salto em andamento: arco no ar até o alvo
    if (this.jump) {
      const j = this.jump;
      const k = Math.min(1, (now - j.t0) / j.dur);
      e.setPosition(j.x0 + (j.x1 - j.x0) * k, j.y0 + (j.y1 - j.y0) * k - Math.sin(k * Math.PI) * 140);
      e.vx = e.vy = 0;
      e.knockUntil = now + 50;
      if (k >= 1) {
        this.jump = null;
        g.cameras.main.shake(160, 0.008);
        g.dust(e.x, e.y + 30);
        if (Phaser.Math.Distance.Between(e.x, e.y, g.player.x, g.player.y) < 95) g.hurtPlayer(e.damage * 1.4, true);
        this.busy(450, 'en-aranha-crouch');
      }
      return true;
    }

    if (now < this.busyUntil) {
      e.vx = e.vy = 0;
      e.knockUntil = this.busyUntil;
      return true;
    }
    const moveKey = this.rage ? 'en-aranha-rage' : 'en-aranha-move';
    if (e.anims.currentAnim?.key !== moveKey) e.play(moveKey);

    const p = g.player;
    const d = Phaser.Math.Distance.Between(e.x, e.y, p.x, p.y);
    if (d < 150 && now >= this.nextStomp) this.stomp();
    else if (d > 200 && d < 520 && now >= this.nextJump) this.leap();
    else if (this.rage && now >= this.nextBrood) this.brood();
    else if (d < 600 && now >= this.nextRain) this.magmaRain();
    else if (d < 460 && now >= this.nextWeb) this.web();
    else if (d < 420 && now >= this.nextAcid) this.acid();
    else if (d < 600 && now >= this.nextSpit) this.spit();
    return true;
  }

  private busy(ms: number, anim: string) {
    this.busyUntil = this.g.elapsed + ms;
    this.e.play(anim);
  }

  private face() {
    this.e.setFlipX(this.g.player.x < this.e.x);
  }

  private enrage() {
    const { g, e } = this;
    this.rage = true;
    this.nextBrood = g.elapsed + 1200;
    e.def = { ...e.def, tint: 0xffb0a0 };
    e.restoreTint(g.elapsed);
    g.cameras.main.shake(400, 0.008);
    g.fx.ring(e.x, e.y, 30, 6, 500, FIRE, 0.5);
    g.events.emit('announce', 'A RAINHA MAGMÁTICA ENFURECEU!');
  }

  /** Cuspe de Fogo */
  private spit() {
    const { g, e } = this;
    this.nextSpit = g.elapsed + 2400 * this.k;
    this.busy(600, 'en-aranha-spit');
    this.face();
    g.time.delayedCall(300, () => {
      if (!e.active) return;
      const base = Math.atan2(g.player.y - e.y, g.player.x - e.x);
      const n = this.rage ? 3 : 1;
      for (let i = 0; i < n; i++) {
        const a = base + (n === 1 ? 0 : (i - 1) * 0.3);
        const img = g.add.image(e.x + Math.cos(a) * 50, e.y + Math.sin(a) * 30 - 8, 'proj-fogo').setDepth(FX_DEPTH - 2).setScale(1.3).setRotation(a);
        this.shots.push({ img, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 2600 });
      }
    });
  }

  /** Pisada de Magma: empina, pisa e deixa uma poça que queima */
  private stomp() {
    const { g, e } = this;
    this.nextStomp = g.elapsed + 2800 * this.k;
    this.busy(950, 'en-aranha-stomp');
    this.face();
    const x = e.x + (e.flipX ? -40 : 40);
    const y = e.y + 30;
    const r = this.rage ? 120 : 100;
    g.fx.warnCircle(x, y, r, 500, FIRE);
    g.time.delayedCall(500, () => {
      if (!this.alive) return;
      g.cameras.main.shake(140, 0.007);
      g.fx.ring(x, y, r * 0.4, 2.4, 300, 0xffb040, 0.6);
      if (Phaser.Math.Distance.Between(x, y, g.player.x, g.player.y) < r + 10) g.hurtPlayer(e.damage * 1.3, true);
      const img = g.add.image(x, y, 'fx-ring').setTint(0xc8380a).setAlpha(0.45).setScale(r / 16, (r * 0.6) / 16).setDepth(-1e6 + 2);
      this.pools.push({ x, y, r, until: g.elapsed + (this.rage ? 5000 : 3500), nextTick: g.elapsed + 400, img });
    });
  }

  /** Teia em linha: prende (deixa lento) */
  private web() {
    const { g, e } = this;
    this.nextWeb = g.elapsed + 5200 * this.k;
    this.busy(900, 'en-aranha-web');
    this.face();
    const a = Math.atan2(g.player.y - e.y, g.player.x - e.x);
    const len = 460;
    g.fx.warnLine(e.x, e.y, a, len, 80, 550, 0xe8d8c8);
    g.time.delayedCall(550, () => {
      if (!this.alive) return;
      g.fx.lance(e.x, e.y, a, len, 80, 0xffffff);
      if (this.onLine(a, len, 40)) {
        if (g.hurtPlayer(e.damage * 0.6, true)) g.afflictPlayer('teia', this.rage ? 3000 : 2200);
      }
    });
  }

  /** Jato Ácido em linha: envenena */
  private acid() {
    const { g, e } = this;
    this.nextAcid = g.elapsed + 6000 * this.k;
    this.busy(900, 'en-aranha-acid');
    this.face();
    const a = Math.atan2(g.player.y - e.y, g.player.x - e.x);
    const len = 380;
    g.fx.warnLine(e.x, e.y, a, len, 90, 500, ACID);
    g.time.delayedCall(500, () => {
      if (!this.alive) return;
      g.fx.lance(e.x, e.y, a, len, 90, ACID);
      if (this.onLine(a, len, 45) && g.hurtPlayer(e.damage * 0.9, true)) g.afflictPlayer('veneno', 3500);
    });
  }

  /** Salto: marca onde o jogador está e cai em cima */
  private leap() {
    const { g, e } = this;
    this.nextJump = g.elapsed + 6500 * this.k;
    this.busy(500, 'en-aranha-crouch');
    const tx = g.player.x;
    const ty = g.player.y;
    g.fx.warnCircle(tx, ty, 90, 950, FIRE);
    g.time.delayedCall(450, () => {
      if (!e.active) return;
      this.face();
      e.play('en-aranha-step');
      this.jump = { x0: e.x, y0: e.y, x1: tx, y1: ty, t0: g.elapsed, dur: 500 };
    });
  }

  /** Ninhada: filhotes rápidos saem de baixo dela (só na fúria) */
  private brood() {
    const { g, e } = this;
    this.nextBrood = g.elapsed + 13000 * this.cd;
    this.busy(700, 'en-aranha-crouch');
    g.fx.ring(e.x, e.y + 20, 30, 4, 500, FIRE, 0.45);
    g.events.emit('toast', 'A Rainha chamou a ninhada!', '#ffb070');
    g.time.delayedCall(350, () => {
      if (!this.alive) return;
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.random() * 0.5;
        g.spawnMinion(FILHOTE, e.x + Math.cos(a) * 70, e.y + 20 + Math.sin(a) * 50);
      }
    });
  }

  /** Chuva de Magma: bolas de magma caem nas marcas e deixam chamas por um instante */
  private magmaRain() {
    const { g, e } = this;
    this.nextRain = g.elapsed + 8500 * this.k;
    this.busy(800, 'en-aranha-spit');
    this.face();
    const p = g.player;
    const n = this.rage ? 8 : 5;
    const spots = [{ x: p.x, y: p.y }];
    for (let k = 1; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const rr = 70 + Math.random() * 170;
      spots.push({ x: p.x + Math.cos(a) * rr, y: p.y + Math.sin(a) * rr });
    }
    const r = 58;
    const warn = 950;
    spots.forEach((s, i) => {
      const delay = i * 70;
      g.time.delayedCall(delay, () => g.fx.warnCircle(s.x, s.y, r, warn, FIRE));
      g.time.delayedCall(delay + warn - 280, () => g.fx.fall(s.x, s.y, 'proj-fogo', 280, 2.2));
      g.time.delayedCall(delay + warn, () => {
        if (!this.alive) return;
        g.fx.ring(s.x, s.y, r * 0.4, 2.6, 320, 0xffb040, 0.6);
        if (Phaser.Math.Distance.Between(s.x, s.y, g.player.x, g.player.y) < r + 8) g.hurtPlayer(e.damage * 1.1, true);
        const img = g.add.image(s.x, s.y, 'fx-ring').setTint(0xff5a1a).setAlpha(0.45).setScale((r * 0.8) / 16, (r * 0.48) / 16).setDepth(-1e6 + 2);
        this.hazards.add({ x: s.x, y: s.y, r: r * 0.8, flat: 0.6, until: g.elapsed + 1800, dmg: e.damage * 0.3, every: 500, img, delay: 250 });
      });
    });
    g.time.delayedCall(warn, () => this.alive && g.cameras.main.shake(160, 0.006));
  }

  /** O jogador está na faixa (linha a partir da aranha)? */
  private onLine(a: number, len: number, half: number) {
    const { g, e } = this;
    const px = g.player.x - e.x;
    const py = g.player.y - e.y;
    const along = px * Math.cos(a) + py * Math.sin(a);
    const across = Math.abs(-px * Math.sin(a) + py * Math.cos(a));
    return along > 0 && along < len && across < half;
  }

  private updateShots(dt: number) {
    const s = dt / 1000;
    const p = this.g.player;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const o = this.shots[i];
      o.life -= dt;
      o.img.x += o.vx * s;
      o.img.y += o.vy * s;
      const hit = Phaser.Math.Distance.Between(o.img.x, o.img.y, p.x, p.y) < 28;
      if (hit) this.g.hurtPlayer(this.e.damage * 0.9);
      if (hit || o.life <= 0) {
        this.g.fx.ring(o.img.x, o.img.y, 12, 3, 260, FIRE, 0.6);
        o.img.destroy();
        this.shots.splice(i, 1);
      }
    }
  }

  private updatePools() {
    const g = this.g;
    const now = g.elapsed;
    for (let i = this.pools.length - 1; i >= 0; i--) {
      const pool = this.pools[i];
      if (now >= pool.until) {
        pool.img.destroy();
        this.pools.splice(i, 1);
        continue;
      }
      pool.img.setAlpha(0.35 + 0.12 * Math.sin(now / 150));
      if (now < pool.nextTick) continue;
      pool.nextTick = now + 500;
      const dx = g.player.x - pool.x;
      const dy = (g.player.y + 10 - pool.y) / 0.6;
      if (Math.hypot(dx, dy) < pool.r) g.hurtPlayer(this.e.damage * 0.35, true);
    }
  }
}
