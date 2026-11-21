import Phaser from 'phaser';
import { createFxTextures } from '../textures';
import { createArt } from '../art';
import { CLASSES } from '../data/classes';
import type { RunResult } from './GameScene';
import { isTouch, onResize, text } from '../ui';

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

function startOnInput(scene: Phaser.Scene, target: string) {
  let started = false;
  const go = () => {
    if (started) return;
    started = true;
    scene.scene.start(target);
  };
  scene.input.keyboard!.once('keydown-SPACE', go);
  scene.input.keyboard!.once('keydown-ENTER', go);
  scene.input.once('pointerup', go);
}

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const { width, height } = this.scale;
    // o layout foi pensado para 720 de altura; em pé, centraliza na vertical
    const oy = Math.max(0, (height - 720) / 2);
    this.add.tileSprite(0, 0, width, height, 'grama').setOrigin(0).setAlpha(0.5);

    text(this, width / 2, oy + 110, 'ASCENSÃO DO CAVALEIRO', Math.min(56, (width - 40) / 13), '#ffd04a').setOrigin(0.5);
    text(this, width / 2, oy + 170, 'Sobreviva às hordas e evolua de classe', 22).setOrigin(0.5);

    const line = [CLASSES.aprendiz, CLASSES.guarda, CLASSES.cavaleiro];
    const spacing = Math.min(240, (width - 120) / 2.5);
    line.forEach((c, i) => {
      const x = width / 2 + (i - 1) * spacing;
      const hero = this.add.sprite(x, oy + 320, c.texture, 'idle0').setScale(0.95).play(`${c.texture}-idle`);
      this.tweens.add({ targets: hero, y: oy + 310, yoyo: true, repeat: -1, duration: 600 + i * 120, ease: 'Sine.InOut' });
      text(this, x, oy + 410, c.name, 24).setOrigin(0.5);
      text(this, x, oy + 440, c.minLevel === 1 ? 'Início' : `Nível ${c.minLevel}`, 16, '#9fc3ff').setOrigin(0.5);
      if (i < line.length - 1) text(this, x + spacing / 2, oy + 320, '→', 40, '#ffd04a').setOrigin(0.5);
    });

    const touch = isTouch(this);
    text(this, width / 2, oy + 540, touch
      ? 'Toque e arraste para andar  •  Ataques são automáticos'
      : 'WASD / Setas para andar  •  Ataques são automáticos  •  P pausa', touch ? 26 : 18, '#dddddd')
      .setOrigin(0.5).setAlign('center').setWordWrapWidth(width - 40);
    const start = text(this, width / 2, oy + 630, touch ? 'Toque para começar' : 'Clique ou aperte ESPAÇO para começar', touch ? 34 : 26).setOrigin(0.5);
    this.tweens.add({ targets: start, alpha: 0.3, yoyo: true, repeat: -1, duration: 700 });

    startOnInput(this, 'Game');
    onResize(this, () => this.scene.restart());
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
    const again = text(this, width / 2, oy + 520, isTouch(this) ? 'Toque para jogar de novo' : 'Clique ou aperte ESPAÇO para jogar de novo', isTouch(this) ? 32 : 24).setOrigin(0.5);
    this.tweens.add({ targets: again, alpha: 0.3, yoyo: true, repeat: -1, duration: 700 });

    // pequena espera para o jogador não reiniciar sem querer
    this.time.delayedCall(600, () => startOnInput(this, 'Game'));
    onResize(this, () => this.scene.restart(this.result));
  }
}
