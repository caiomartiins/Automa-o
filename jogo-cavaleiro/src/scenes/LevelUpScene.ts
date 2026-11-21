import Phaser from 'phaser';
import type { GameScene, LevelUpData } from './GameScene';
import { hex, text } from '../ui';

/** Tela de escolha de melhoria (e de promoção de classe) */
export class LevelUpScene extends Phaser.Scene {
  private data_!: LevelUpData;
  private done = false;

  constructor() {
    super('LevelUp');
  }

  init(data: LevelUpData) {
    this.data_ = data;
    this.done = false;
  }

  create() {
    const { width, height } = this.scale;
    const { promotion, options, level } = this.data_;
    this.add.rectangle(0, 0, width, height, 0x05060a, 0.88).setOrigin(0);

    let cardsY = height / 2 + 10;

    if (promotion) {
      cardsY = height / 2 + 120;
      const title = text(this, width / 2, 70, 'PROMOÇÃO DE CLASSE!', 44, '#ffd04a').setOrigin(0.5);
      this.tweens.add({ targets: title, scale: { from: 0.6, to: 1 }, duration: 400, ease: 'Back.Out' });
      const hero = this.add.image(width / 2, 185, promotion.texture).setScale(3.2);
      this.tweens.add({ targets: hero, y: 175, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.InOut' });
      text(this, width / 2, 275, `Você agora é um ${promotion.name}!`, 30).setOrigin(0.5);
      text(this, width / 2, 312, promotion.description, 18, '#e8e8e8').setOrigin(0.5);
      text(this, width / 2, 360, `Nível ${level} — escolha uma melhoria`, 20, '#9fc3ff').setOrigin(0.5);
    } else {
      text(this, width / 2, height / 2 - 170, 'SUBIU DE NÍVEL!', 46, '#9fc3ff').setOrigin(0.5);
      text(this, width / 2, height / 2 - 120, `Nível ${level} — escolha uma melhoria`, 20).setOrigin(0.5);
    }

    const cardW = 340;
    const cardH = 170;
    const gap = 30;
    const startX = width / 2 - ((cardW + gap) * (options.length - 1)) / 2;

    options.forEach((opt, i) => {
      const x = startX + i * (cardW + gap);
      const card = this.add.container(x, cardsY);
      const bg = this.add.rectangle(0, 0, cardW, cardH, 0x1c1f2b, 0.95).setStrokeStyle(3, opt.color);
      const stripe = this.add.rectangle(0, -cardH / 2 + 5, cardW, 10, opt.color);
      const title = text(this, 0, -40, opt.title, 22, hex(opt.color)).setOrigin(0.5);
      const desc = text(this, 0, 10, opt.desc, 17, '#e8e8e8')
        .setOrigin(0.5)
        .setAlign('center')
        .setWordWrapWidth(cardW - 40);
      const key = text(this, 0, cardH / 2 - 22, `[${i + 1}]`, 15, '#8a8fa3').setOrigin(0.5);
      card.add([bg, stripe, title, desc, key]);
      card.setScale(0.8).setAlpha(0);
      this.tweens.add({ targets: card, scale: 1, alpha: 1, delay: 80 * i, duration: 220, ease: 'Back.Out' });

      bg.setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(0x2b3044, 1))
        .on('pointerout', () => bg.setFillStyle(0x1c1f2b, 0.95))
        .on('pointerup', () => this.choose(i));
    });

    const kb = this.input.keyboard!;
    ['ONE', 'TWO', 'THREE'].forEach((k, i) => kb.once(`keydown-${k}`, () => this.choose(i)));
  }

  private choose(i: number) {
    const opt = this.data_.options[i];
    if (this.done || !opt) return;
    this.done = true;
    const game = this.scene.get('Game') as GameScene;
    opt.apply(game);

    const next = game.nextLevelUp();
    if (next) {
      this.scene.restart(next);
    } else {
      this.scene.stop();
      this.scene.resume('Game');
    }
  }
}
