import Phaser from 'phaser';
import type { GameScene, LevelUpData } from './GameScene';
import { hex, isPortrait, isTouch, onResize, text } from '../ui';
import { heroScale } from '../sprites';
import { ATTRS, ATTR_IDS, type Attr } from '../data/rpg';

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
    const { width, height: fullH } = this.scale;
    const { promotion, options, level, choiceTitle, choiceSubtitle } = this.data_;
    const portrait = isPortrait(this);
    const touch = isTouch(this);
    const big = touch ? 1.3 : 1;
    this.add.rectangle(0, 0, width, fullH, 0x05060a, 0.88).setOrigin(0);
    // a parte de baixo fica para a barra de atributos
    const height = fullH - (portrait ? 170 : 84);
    this.buildAttrBar(width, fullH, portrait);

    // ---- tamanho das cartas: lado a lado (deitado) ou empilhadas (em pé)
    const gap = portrait ? 22 : 30;
    const headerH = promotion ? 330 : 110;
    const withIcons = options.some((o) => o.icon);
    let cardW: number;
    let cardH: number;
    let cardsH: number;
    if (portrait) {
      cardW = Math.min(620, width - 60);
      cardH = Math.min((withIcons ? 190 : 150) * big, (height - headerH - 80 - gap * 2) / options.length);
      cardsH = options.length * cardH + (options.length - 1) * gap;
    } else {
      cardW = Math.min(360, (width - 60 - gap * 2) / options.length);
      cardH = Math.min(withIcons ? 330 : 170 * (promotion ? 1 : big), height - headerH - 60);
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
    } else if (choiceTitle) {
      const title = text(this, width / 2, top + 30, choiceTitle, Math.min(44, (width - 40) / 13), '#ffd04a').setOrigin(0.5);
      this.tweens.add({ targets: title, scale: { from: 0.6, to: 1 }, duration: 400, ease: 'Back.Out' });
      text(this, width / 2, top + 80, choiceSubtitle ?? `Nível ${level}`, 20).setOrigin(0.5)
        .setAlign('center').setWordWrapWidth(width - 40);
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
      const key = text(this, 0, cardH / 2 - 20, touch ? 'Tocar para escolher' : `[${i + 1}]`, 15, '#8a8fa3').setOrigin(0.5);
      card.add([bg, stripe]);
      if (opt.icon) {
        // carta de profissão: personagem animado + nome + descrição
        const s = heroScale(opt.icon) / 0.5;
        if (portrait) {
          const hero = this.add.sprite(-cardW / 2 + 85, 6, opt.icon, 'idle0').setScale(Math.min(1.05, cardH / 175) * s).play(`${opt.icon}-idle`);
          const title = text(this, 70, -cardH / 2 + 38, opt.title, 32, hex(opt.color)).setOrigin(0.5);
          const desc = text(this, 70, -cardH / 2 + 70, opt.desc, 21, '#e8e8e8').setOrigin(0.5, 0)
            .setAlign('center').setWordWrapWidth(cardW - 200);
          card.add([hero, title, desc]);
        } else {
          const hero = this.add.sprite(0, -cardH / 2 + 98, opt.icon, 'idle0').setScale(1.0 * s).play(`${opt.icon}-idle`);
          const title = text(this, 0, -cardH / 2 + 200, opt.title, 28, hex(opt.color)).setOrigin(0.5);
          const desc = text(this, 0, -cardH / 2 + 226, opt.desc, 17, '#e8e8e8').setOrigin(0.5, 0)
            .setAlign('center').setWordWrapWidth(cardW - 40);
          card.add([hero, title, desc]);
        }
      } else {
        const title = text(this, 0, -cardH * 0.24, opt.title, 22 * big, hex(opt.color)).setOrigin(0.5);
        const desc = text(this, 0, cardH * 0.06, opt.desc, 17 * big, '#e8e8e8')
          .setOrigin(0.5)
          .setAlign('center')
          .setWordWrapWidth(cardW - 40);
        card.add([title, desc]);
      }
      card.add(key);
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

  /** Pontos de atributo do nível: o jogador distribui tocando nos botões */
  private buildAttrBar(width: number, fullH: number, portrait: boolean) {
    const game = this.scene.get('Game') as GameScene;
    const rows = portrait ? 2 : 1;
    const perRow = 6 / rows;
    const bw = Math.min(portrait ? 210 : 150, (width - 40 - (perRow - 1) * 10) / perRow);
    const bh = portrait ? 54 : 46;
    const top = fullH - rows * (bh + 10) - 34;
    const label = text(this, width / 2, top, '', 16, '#ffe36a').setOrigin(0.5);
    const btns: { id: Attr; t: Phaser.GameObjects.Text; bg: Phaser.GameObjects.Rectangle }[] = [];
    const refresh = () => {
      label.setText(game.attrPoints > 0
        ? `Pontos de atributo: ${game.attrPoints}  (os que sobrarem vão para o foco da classe)`
        : 'Atributos distribuídos');
      for (const b of btns) {
        b.t.setText(`${ATTRS[b.id].short} ${game.attrs[b.id]}${game.attrPoints > 0 ? '  +' : ''}`);
        b.bg.setAlpha(game.attrPoints > 0 ? 1 : 0.55);
      }
    };
    ATTR_IDS.forEach((id, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = width / 2 + (col - (perRow - 1) / 2) * (bw + 10);
      const y = top + 24 + row * (bh + 10) + bh / 2;
      const bg = this.add.rectangle(x, y, bw, bh, 0x1c1f2b, 0.95).setStrokeStyle(2, ATTRS[id].color);
      const t = text(this, x, y, '', portrait ? 22 : 18, hex(ATTRS[id].color)).setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          if (game.spendAttr(id)) {
            this.tweens.add({ targets: t, scale: { from: 1.25, to: 1 }, duration: 160 });
            refresh();
          }
        });
      btns.push({ id, t, bg });
    });
    refresh();
  }

  private choose(i: number) {
    const opt = this.data_.options[i];
    if (this.done || !opt) return;
    this.done = true;
    const game = this.scene.get('Game') as GameScene;
    opt.apply(game);

    const next = game.nextLevelUp();
    if (!next) game.autoSpendAttrs();
    if (next) {
      this.scene.restart(next);
    } else {
      this.scene.stop();
      this.scene.resume('Game');
    }
  }
}
