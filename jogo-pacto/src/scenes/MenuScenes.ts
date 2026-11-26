import Phaser from 'phaser';
import { ARTS, ART_BOX, artScale, preloadSprites, setupSprites } from '../sprites';
import { C, H, W, button, hex, makeTextures, panel, txt } from '../ui';
import { persist, resetSave, save, unitByKey } from '../save';
import { STAGES } from '../data/stages';
import { UNIT_BY_ID } from '../data/units';
import { ELEMENT_COLOR } from '../data/types';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const bar = this.add.rectangle(W / 2 - 200, H / 2, 0, 16, C.gold).setOrigin(0, 0.5);
    this.add.rectangle(W / 2, H / 2, 404, 20).setStrokeStyle(2, C.line);
    this.load.on('progress', (p: number) => bar.setSize(400 * p, 16));
    preloadSprites(this);
  }

  create() {
    setupSprites(this);
    makeTextures(this);
    this.scene.start('Hub');
  }
}

/** Fundo com partículas que todas as telas de menu usam */
export function menuBackdrop(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.fillGradientStyle(0x1c1530, 0x1c1530, 0x0c0a14, 0x0c0a14, 1);
  g.fillRect(0, 0, W, H);
  scene.add.particles(0, 0, 'glow', {
    x: { min: 0, max: W }, y: { min: 0, max: H }, lifespan: 5000, speedY: { min: -18, max: -6 },
    scale: { start: 0.18, end: 0 }, alpha: { start: 0.5, end: 0 }, tint: [0x9b7bff, 0x6fd0ff, 0xffd27a],
    frequency: 160, blendMode: 'ADD',
  });
}

/** Sprite animado de um monstro, com os pés em (x, y) */
export function unitSprite(scene: Phaser.Scene, art: string, x: number, y: number, scaleMul = 1, faceLeft = false) {
  const a = ARTS[art];
  const box = ART_BOX[art];
  const spr = scene.add.sprite(x, y, `art-${art}`, a.idle[0]).setScale(artScale(art) * scaleMul);
  const ox = (box.x + box.w / 2) / a.cellW;
  const flip = faceLeft !== !!a.facesLeft;
  spr.setFlipX(flip).setOrigin(flip ? 1 - ox : ox, (box.y + box.h) / a.cellH);
  spr.play(`${art}-idle`);
  return spr;
}

export class HubScene extends Phaser.Scene {
  constructor() { super('Hub'); }

  create() {
    menuBackdrop(this);
    const s = save();
    // título
    const glow = this.add.image(W / 2, 200, 'glow').setScale(9, 3.4).setTint(0x7a4fd6).setAlpha(0.35);
    this.tweens.add({ targets: glow, alpha: 0.2, duration: 1800, yoyo: true, repeat: -1 });
    txt(this, W / 2, 168, 'PACTO', 92, hex(C.gold), { strokeThickness: 10 }).setOrigin(0.5);
    txt(this, W / 2, 252, 'DOS ECOS', 56, '#d9c8ff', { strokeThickness: 8 }).setOrigin(0.5);
    txt(this, W / 2, 312, 'Invoque, monte seu time e domine os elementos', 22, C.dim).setOrigin(0.5);

    // cristais
    panel(this, W - 210, 24, 190, 54, C.panel2, C.line, 14);
    this.add.image(W - 182, 51, 'glow').setTint(0x7fdcff).setScale(0.5);
    this.add.image(W - 182, 51, 'spark').setTint(0xdff6ff).setScale(0.7);
    txt(this, W - 154, 51, `${s.crystals}`, 26, '#bfeaff').setOrigin(0, 0.5);

    // time no palco
    const ground = this.add.graphics();
    ground.fillStyle(0x7a4fd6, 0.15);
    ground.fillEllipse(W / 2, 640, 640, 120);
    ground.lineStyle(2, 0x9b7bff, 0.35);
    ground.strokeEllipse(W / 2, 640, 640, 120);
    const team = s.team.map((k) => unitByKey(k)).filter((u) => !!u);
    const spots = [{ x: 290, y: 684 }, { x: 120, y: 640 }, { x: 460, y: 640 }, { x: 618, y: 640 }];
    const order = [1, 2, 3, 0];
    for (const i of order) {
      const u = team[i];
      if (!u) continue;
      const def = UNIT_BY_ID[u.id];
      const spr = unitSprite(this, def.art, spots[i].x, spots[i].y, i === 0 ? 1.25 : 1.05, false);
      spr.setDepth(spots[i].y);
    }
    if (team[0]) {
      const def = UNIT_BY_ID[team[0].id];
      txt(this, W / 2, 700, `Líder: ${def.name}  ·  Nv ${team[0].lv}`, 22, hex(ELEMENT_COLOR[def.element])).setOrigin(0.5);
    }

    // progresso
    const done = STAGES.filter((st) => s.cleared[st.id] !== undefined).length;
    txt(this, W / 2, 750, `Campanha: ${done}/${STAGES.length} fases  ·  ${s.units.length} monstros`, 20, C.dim).setOrigin(0.5);

    button(this, W / 2, 850, 460, 92, '⚔  Campanha', () => this.scene.start('Map', {}), 0x7a4fd6, 36);
    button(this, W / 2, 965, 460, 80, 'Monstros', () => this.scene.start('Monsters'), 0x3d5a7a, 30);
    const inv = button(this, W / 2, 1065, 460, 80, 'Invocar (em breve)', () => undefined, 0x3d5a7a, 28);
    inv.setEnabled(false);

    // apagar progresso (dois toques)
    let armed = false;
    const reset = txt(this, W / 2, H - 50, 'Apagar progresso', 18, '#6d6288').setOrigin(0.5).setInteractive({ useHandCursor: true });
    reset.on('pointerup', () => {
      if (!armed) {
        armed = true;
        reset.setText('Toque de novo para apagar TUDO').setColor('#ff8a8a');
        this.time.delayedCall(3000, () => { armed = false; reset.setText('Apagar progresso').setColor('#6d6288'); });
        return;
      }
      resetSave();
      this.scene.restart();
    });
    persist();
  }
}
