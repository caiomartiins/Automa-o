import Phaser from 'phaser';
import { createFxTextures } from '../textures';
import { createArt } from '../art';
import { CLASSES, LINES, type LineId } from '../data/classes';
import { SKILLS } from '../data/skills';
import type { RunResult } from './GameScene';
import { hex, isTouch, onResize, text } from '../ui';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    createArt(this);
    createFxTextures(this);
    this.scene.start('Menu');
  }
}


export class MenuScene extends Phaser.Scene {
  private started = false;

  constructor() {
    super('Menu');
  }

  create() {
    this.started = false;
    const { width, height } = this.scale;
    const portrait = height > width;
    const touch = isTouch(this);
    this.add.tileSprite(0, 0, width, height, 'grama').setOrigin(0).setAlpha(0.55);
    this.add.rectangle(0, 0, width, height, 0x0b0f14, 0.35).setOrigin(0);

    const titleY = portrait ? 90 : 62;
    text(this, width / 2, titleY, 'ASCENSÃO DO CAVALEIRO', Math.min(52, (width - 40) / 13.5), '#ffd04a').setOrigin(0.5);
    text(this, width / 2, titleY + 46, 'Escolha sua classe', 22).setOrigin(0.5);

    // cartas das linhagens: lado a lado (deitado) ou empilhadas (em pé)
    const lines = [LINES.cavaleiro, LINES.mago, LINES.arqueiro];
    const top = titleY + 80;
    const gap = 20;
    const bottomSpace = 70;
    let cardW: number;
    let cardH: number;
    if (portrait) {
      cardW = Math.min(640, width - 40);
      cardH = Math.min(360, (height - top - bottomSpace - gap * 2) / 3);
    } else {
      cardW = Math.min(390, (width - 40 - gap * 2) / 3);
      cardH = Math.min(460, height - top - bottomSpace);
    }

    lines.forEach((line, i) => {
      const cx = portrait ? width / 2 : width / 2 + (i - 1) * (cardW + gap);
      const cy = portrait ? top + cardH / 2 + i * (cardH + gap) : top + cardH / 2;
      const card = this.add.container(cx, cy);
      const bg = this.add.rectangle(0, 0, cardW, cardH, 0x151a24, 0.92).setStrokeStyle(3, line.color);
      const title = text(this, 0, -cardH / 2 + 30, line.name.toUpperCase(), 30, hex(line.color)).setOrigin(0.5);
      const tag = text(this, 0, -cardH / 2 + 62, line.tagline, 16, '#d8d8d8').setOrigin(0.5);
      card.add([bg, title, tag]);

      // as três classes da linhagem, com a evolução
      const heroScale = Math.min(1.05, (cardH - 230) / 160, cardW / 3 / 90);
      const spacing = Math.min(cardW / 3, 120);
      const heroY = -cardH / 2 + 90 + (160 * heroScale) / 2;
      line.classes.forEach((id, k) => {
        const c = CLASSES[id];
        const x = (k - 1) * spacing;
        const hero = this.add.sprite(x, heroY, c.texture, 'idle0').setScale(heroScale).play(`${c.texture}-idle`);
        const name = text(this, x, heroY + (160 * heroScale) / 2 + 6, c.name, 14, '#ffffff').setOrigin(0.5, 0)
          .setAlign('center').setWordWrapWidth(spacing - 6);
        const lvl = text(this, x, heroY + (160 * heroScale) / 2 + 24 + (name.height > 24 ? 16 : 0), k === 0 ? 'Início' : `Nv ${c.minLevel}`, 12, '#9fc3ff').setOrigin(0.5, 0);
        card.add([hero, name, lvl]);
        if (k < 2) card.add(text(this, x + spacing / 2, heroY, '→', 22, hex(line.color)).setOrigin(0.5));
      });
      // habilidades que a linhagem ganha ao evoluir
      const skills = line.classes.map((id) => SKILLS[CLASSES[id].grantsSkill!].name).join('  →  ');
      card.add(text(this, 0, cardH / 2 - 62, skills, 14, '#bfc6d6').setOrigin(0.5).setAlign('center').setWordWrapWidth(cardW - 30));
      const hint = text(this, 0, cardH / 2 - 22, touch ? 'Tocar para jogar' : `[${i + 1}] Jogar`, 16, '#8a8fa3').setOrigin(0.5);
      card.add(hint);

      bg.setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(0x222a3a, 0.95))
        .on('pointerout', () => bg.setFillStyle(0x151a24, 0.92))
        .on('pointerup', () => this.start(line.id));
    });

    text(this, width / 2, height - 30, touch
      ? 'Toque e arraste para andar  •  Ataques são automáticos'
      : 'WASD / Setas para andar  •  Ataques são automáticos  •  P pausa', touch ? 18 : 16, '#c8c8c8')
      .setOrigin(0.5).setAlign('center').setWordWrapWidth(width - 40);

    const kb = this.input.keyboard!;
    kb.once('keydown-ONE', () => this.start('cavaleiro'));
    kb.once('keydown-TWO', () => this.start('mago'));
    kb.once('keydown-THREE', () => this.start('arqueiro'));
    onResize(this, () => this.scene.restart());
  }

  private start(line: LineId) {
    if (this.started) return;
    this.started = true;
    this.scene.start('Game', { line });
  }
}

export class GameOverScene extends Phaser.Scene {
  private result!: RunResult;

  constructor() {
    super('GameOver');
  }

  init(data: RunResult) {
    this.result = data;
  }

  create() {
    const { width, height } = this.scale;
    const oy = Math.max(0, (height - 720) / 2);
    const r = this.result;
    this.add.rectangle(0, 0, width, height, 0x120a0a).setOrigin(0);
    const s = Math.floor(r.time / 1000);
    text(this, width / 2, oy + 180, 'VOCÊ CAIU EM BATALHA', Math.min(52, (width - 40) / 12), '#ff5c5c').setOrigin(0.5);
    text(
      this, width / 2, oy + 330,
      `Tempo sobrevivido: ${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s\n` +
      `Nível alcançado: ${r.level}\nClasse: ${r.className}\nInimigos derrotados: ${r.kills}`,
      24,
    ).setOrigin(0.5).setAlign('center').setLineSpacing(10);
    const touch = isTouch(this);
    const again = text(this, width / 2, oy + 510, touch ? 'Jogar de novo' : 'Jogar de novo [ESPAÇO]', touch ? 32 : 26).setOrigin(0.5);
    this.tweens.add({ targets: again, alpha: 0.45, yoyo: true, repeat: -1, duration: 700 });
    const menu = text(this, width / 2, oy + 590, touch ? 'Escolher outra classe' : 'Escolher outra classe [M]', touch ? 24 : 20, '#9fc3ff').setOrigin(0.5);

    // pequena espera para o jogador não reiniciar sem querer
    this.time.delayedCall(600, () => {
      let gone = false;
      const go = (target: string, data?: object) => {
        if (gone) return;
        gone = true;
        this.scene.start(target, data);
      };
      again.setInteractive({ useHandCursor: true }).on('pointerup', () => go('Game', { line: r.line }));
      menu.setInteractive({ useHandCursor: true }).on('pointerup', () => go('Menu'));
      this.input.keyboard!.once('keydown-SPACE', () => go('Game', { line: r.line }));
      this.input.keyboard!.once('keydown-ENTER', () => go('Game', { line: r.line }));
      this.input.keyboard!.once('keydown-M', () => go('Menu'));
    });
    onResize(this, () => this.scene.restart(this.result));
  }
}
