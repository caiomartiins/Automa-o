import Phaser from 'phaser';
import type { GameScene, LevelUpData } from './GameScene';
import { darken, dim, isPortrait, isTouch, onResize, uiArrow, uiPanel, uiScale, uiWindow, WIN, wtext } from '../ui';
import { heroScale } from '../sprites';
import { ATTRS, ATTR_IDS } from '../data/rpg';

/** Tela de escolha de melhoria (e de escolha de classe), no estilo de janelas */
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
    const { options, level, choiceTitle, choiceSubtitle, promotion } = this.data_;
    const portrait = isPortrait(this);
    const touch = isTouch(this);
    const s = uiScale(this);
    dim(this, 0.55);

    // ---- medidas: janela de escolha em cima, janela de status embaixo
    const winW = Math.min(portrait ? width - 24 : 1120, width - 24);
    const statusH = portrait ? 34 * s + 2 * (40 * s) + 26 : 34 * s + 44 * s + 22;
    const withIcons = options.some((o) => o.icon);
    const pad = 14;
    const gap = 12;
    const subH = 30 * s;
    let cardW: number;
    let cardH: number;
    if (portrait) {
      cardW = winW - pad * 2;
      cardH = (withIcons ? 150 : 96) * s;
    } else {
      cardW = (winW - pad * 2 - gap * (options.length - 1)) / options.length;
      cardH = withIcons ? 300 : 150 * s;
    }
    const cardsH = portrait ? options.length * cardH + (options.length - 1) * gap : cardH;
    const titleH = 26 * s;
    let winH = titleH + 10 + subH + cardsH + pad;
    const maxH = height - statusH - 40;
    if (winH > maxH && portrait) {
      cardH = (maxH - titleH - 10 - subH - pad - gap * (options.length - 1)) / options.length;
      winH = maxH;
    }
    const totalH = winH + 12 + statusH;
    const y0 = Math.max(10, (height - totalH) / 2);

    const title = choiceTitle ?? (promotion ? `Promoção: ${promotion.name}` : `Subiu de nível!  Nível ${level}`);
    const win = uiWindow(this, (width - winW) / 2, y0, winW, winH, title, s);
    const c = win.c;
    c.add(wtext(this, winW / 2, win.top + 6 + subH / 2, choiceSubtitle ?? 'Escolha uma melhoria', 14 * s, WIN.label)
      .setOrigin(0.5).setAlign('center').setWordWrapWidth(winW - 30));

    const cardsTop = win.top + 6 + subH;
    options.forEach((opt, i) => {
      const x = portrait ? pad : pad + i * (cardW + gap);
      const y = portrait ? cardsTop + i * (cardH + gap) : cardsTop;
      const card = this.add.container(x, y);
      const hover = this.add.rectangle(1, 1, cardW - 2, cardH - 2, WIN.hover).setOrigin(0).setVisible(false);
      card.add([uiPanel(this, 0, 0, cardW, cardH), hover]);
      card.add(this.add.rectangle(1, 1, 5, cardH - 2, opt.color).setOrigin(0));
      const col = darken(opt.color, 0.5);
      if (opt.icon) {
        const k = heroScale(opt.icon) / 0.5;
        if (portrait) {
          card.add(this.add.sprite(70 * s, cardH / 2, opt.icon, 'idle0').setScale(Math.min(0.95, cardH / 190) * k).play(`${opt.icon}-idle`));
          card.add(wtext(this, 140 * s, 14, opt.title, 19 * s, col, true));
          card.add(wtext(this, 140 * s, 14 + 28 * s, opt.desc, 13 * s, WIN.text).setWordWrapWidth(cardW - 150 * s));
        } else {
          card.add(this.add.sprite(cardW / 2, 95, opt.icon, 'idle0').setScale(0.95 * k).play(`${opt.icon}-idle`));
          card.add(wtext(this, cardW / 2, 190, opt.title, 20 * s, col, true).setOrigin(0.5));
          card.add(wtext(this, cardW / 2, 210, opt.desc, 13 * s, WIN.text).setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(cardW - 30));
        }
      } else if (portrait) {
        card.add(wtext(this, 16, 12, opt.title, 16 * s, col, true));
        card.add(wtext(this, 16, 12 + 24 * s, opt.desc, 13 * s, WIN.text).setWordWrapWidth(cardW - 30));
      } else {
        card.add(wtext(this, cardW / 2, cardH * 0.28, opt.title, 17 * s, col, true).setOrigin(0.5));
        card.add(wtext(this, cardW / 2, cardH * 0.5, opt.desc, 13 * s, WIN.text).setOrigin(0.5).setAlign('center').setWordWrapWidth(cardW - 30));
      }
      card.add(wtext(this, cardW - 8, cardH - 6, touch ? 'tocar' : `[${i + 1}]`, 11 * s, WIN.muted).setOrigin(1, 1));
      const zone = this.add.zone(0, 0, cardW, cardH).setOrigin(0).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => hover.setVisible(true));
      zone.on('pointerout', () => hover.setVisible(false));
      zone.on('pointerup', () => this.choose(i));
      card.add(zone);
      c.add(card);
      card.setAlpha(0);
      this.tweens.add({ targets: card, alpha: 1, delay: 60 * i, duration: 180 });
    });

    this.buildStatus((width - winW) / 2, y0 + winH + 12, winW, statusH, portrait, s);

    const kb = this.input.keyboard!;
    ['ONE', 'TWO', 'THREE'].forEach((k, i) => kb.once(`keydown-${k}`, () => this.choose(i)));
    onResize(this, () => this.scene.restart(this.data_));
  }

  /** Janela "Status": atributos com o botão ▶ para gastar os pontos do nível */
  private buildStatus(x: number, y: number, w: number, h: number, portrait: boolean, s: number) {
    const game = this.scene.get('Game') as GameScene;
    const win = uiWindow(this, x, y, w, h, '', s);
    const perRow = portrait ? 3 : 6;
    const cellW = (w - 24) / perRow;
    const cellH = (portrait ? 40 : 44) * s;
    const rows: { value: Phaser.GameObjects.Text; arrow: ReturnType<typeof uiArrow> }[] = [];
    const refresh = () => {
      win.title.setText(game.attrPoints > 0 ? `Status   •   Pontos: ${game.attrPoints}` : 'Status   •   Pontos distribuídos');
      ATTR_IDS.forEach((a, i) => {
        rows[i].value.setText(String(game.attrs[a]));
        rows[i].arrow.setEnabled(game.attrPoints > 0);
      });
    };
    win.c.add(uiPanel(this, 10, win.top + 6, w - 20, h - win.top - 14));
    win.c.add(wtext(this, w - 14, 2 + 12 * s, 'os pontos que sobrarem vão para o foco da classe', 10 * s, WIN.muted).setOrigin(1, 0.5));
    ATTR_IDS.forEach((a, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const cx = 12 + col * cellW;
      const cy = win.top + 10 + row * cellH + cellH / 2;
      win.c.add(wtext(this, cx + 10, cy, ATTRS[a].short, 15 * s, WIN.label, true).setOrigin(0, 0.5));
      const value = wtext(this, cx + cellW - 46 * s, cy, '', 16 * s, WIN.text, true).setOrigin(1, 0.5);
      const arrow = uiArrow(this, cx + cellW - 24 * s, cy, 26 * s, () => {
        if (game.spendAttr(a)) {
          this.tweens.add({ targets: value, scale: { from: 1.35, to: 1 }, duration: 160 });
          refresh();
        }
      });
      win.c.add([value, arrow.c]);
      rows.push({ value, arrow });
    });
    refresh();
  }

  choose(i: number) {
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
