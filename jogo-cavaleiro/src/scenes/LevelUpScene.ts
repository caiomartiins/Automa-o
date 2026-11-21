import Phaser from 'phaser';
import type { GameScene, LevelUpData } from './GameScene';
import { hex, isPortrait, isTouch, onResize, text } from '../ui';

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
    const portrait = isPortrait(this);
    const touch = isTouch(this);
    const big = touch ? 1.3 : 1;
    this.add.rectangle(0, 0, width, height, 0x05060a, 0.88).setOrigin(0);

    // ---- tamanho das cartas: lado a lado (deitado) ou empilhadas (em pé)
    const gap = portrait ? 22 : 30;
    const headerH = promotion ? 330 : 110;
    let cardW: number;
    let cardH: number;
    let cardsH: number;
    if (portrait) {
      cardW = Math.min(620, width - 60);
      cardH = Math.min(150 * big, (height - headerH - 80 - gap * 2) / options.length);
      cardsH = options.length * cardH + (options.length - 1) * gap;
    } else {
      cardW = Math.min(360, (width - 60 - gap * 2) / options.length);
      cardH = Math.min(170 * (promotion ? 1 : big), height - headerH - 60);
      cardsH = cardH;
    }

    // ---- cabeçalho + cartas centralizados na vertical
    const top = Math.max(30, (height - headerH - cardsH) / 2);
    if (promotion) {
      const title = text(this, width / 2, top + 30, 'PROMOÇÃO DE CLASSE!', 44, '#ffd04a').setOrigin(0.5);
      this.tweens.add({ targets: title, scale: { from: 0.6, to: 1 }, duration: 400, ease: 'Back.Out' });
      const hero = this.add.sprite(width / 2, top + 140, promotion.texture, 'idle0').setScale(0.95).play(`${promotion.texture}-idle`);
      this.tweens.add({ targets: hero, y: top + 132, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.InOut' });
      text(this, width / 2, top + 235, `Você agora é um ${promotion.name}!`, 30).setOrigin(0.5);
      text(this, width / 2, top + 272, promotion.description, 18, '#e8e8e8')
        .setOrigin(0.5, 0.5).setAlign('center').setWordWrapWidth(width - 60);
      text(this, width / 2, top + 312, `Nível ${level} — escolha uma melhoria`, 20, '#9fc3ff').setOrigin(0.5);
    } else {
      text(this, width / 2, top + 30, 'SUBIU DE NÍVEL!', 46, '#9fc3ff').setOrigin(0.5);
      text(this, width / 2, top + 80, `Nível ${level} — escolha uma melhoria`, 20).setOrigin(0.5);
    }
    const cardsTop = top + headerH;

    options.forEach((opt, i) => {
      const x = portrait ? width / 2 : width / 2 + (i - (options.length - 1) / 2) * (cardW + gap);
      const y = portrait ? cardsTop + cardH / 2 + i * (cardH + gap) : cardsTop + cardH / 2;
      const card = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, cardW, cardH, 0x1c1f2b, 0.95).setStrokeStyle(3, opt.color);
      const stripe = this.add.rectangle(0, -cardH / 2 + 5, cardW, 10, opt.color);
      const title = text(this, 0, -cardH * 0.24, opt.title, 22 * big, hex(opt.color)).setOrigin(0.5);
      const desc = text(this, 0, cardH * 0.06, opt.desc, 17 * big, '#e8e8e8')
        .setOrigin(0.5)
        .setAlign('center')
        .setWordWrapWidth(cardW - 40);
      const key = text(this, 0, cardH / 2 - 20, touch ? 'Tocar para escolher' : `[${i + 1}]`, 15, '#8a8fa3').setOrigin(0.5);
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

    // celular girado: redesenha a tela no novo formato, com as mesmas opções
    onResize(this, () => this.scene.restart(this.data_));
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
