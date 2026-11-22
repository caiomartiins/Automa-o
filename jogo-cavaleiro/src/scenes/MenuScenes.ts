import Phaser from 'phaser';
import { createFxTextures } from '../textures';
import { createArt } from '../art';
import { heroScale, preloadSprites, setupSprites } from '../sprites';
import { CLASSES, LINES, PROFESSION_LEVEL } from '../data/classes';
import { SKILLS } from '../data/skills';
import { MAPS } from '../data/rpg';
import { loadSave, writeSave } from '../save';
import type { RunResult } from './GameScene';
import { darken, dim, headline, isTouch, onResize, uiButton, uiPanel, uiScale, uiWindow, WIN, wtext } from '../ui';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    preloadSprites(this);
  }

  create() {
    setupSprites(this);
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
    const s = uiScale(this);
    this.add.tileSprite(0, 0, width, height, 'grama').setOrigin(0);
    dim(this, 0.35);

    const titleY = portrait ? 56 : 34;
    headline(this, width / 2, titleY, 'ASCENSÃO DO CAVALEIRO', Math.min(44, (width - 40) / 14), '#ffe9a0').setOrigin(0.5);

    // ---- janela principal: classes
    const bottomH = portrait ? 104 + 90 * s : 96;
    const winW = Math.min(1240, width - 30);
    const winX = (width - winW) / 2;
    const winY = titleY + (portrait ? 40 : 28);
    const winH = height - winY - bottomH - 16;
    const win = uiWindow(this, winX, winY, winW, winH, 'Classes', s);
    const c = win.c;

    // o Aprendiz, onde todos começam
    const ap = CLASSES.aprendiz;
    const apY = win.top + (portrait ? 56 : 44);
    const apScale = (heroScale(ap.texture) / 0.5) * (portrait ? 0.62 : 0.5);
    c.add(this.add.sprite(winW / 2 - 170, apY, ap.texture, 'idle0').setScale(apScale).play(`${ap.texture}-idle`));
    c.add(wtext(this, winW / 2 - 120, apY - 12, 'Todos começam como Aprendiz', 17 * s, WIN.text, true).setOrigin(0, 0.5));
    c.add(wtext(this, winW / 2 - 120, apY + 12, `Nível ${PROFESSION_LEVEL}: profissão  •  Nível 15: 2ª classe`, 13 * s, WIN.label).setOrigin(0, 0.5));

    // as três profissões (só informação)
    const lines = [LINES.espadachim, LINES.mago, LINES.arqueiro];
    const top = apY + (portrait ? 56 : 42);
    const gap = 12;
    const pad = 14;
    let cardW: number;
    let cardH: number;
    if (portrait) {
      cardW = winW - pad * 2;
      cardH = (winH - top - pad - gap * 2) / 3;
    } else {
      cardW = (winW - pad * 2 - gap * 2) / 3;
      cardH = winH - top - pad;
    }

    lines.forEach((line, i) => {
      const x0 = portrait ? pad : pad + i * (cardW + gap);
      const y0 = portrait ? top + i * (cardH + gap) : top;
      c.add(uiPanel(this, x0, y0, cardW, cardH));
      const cx = x0 + cardW / 2;
      // faixa colorida da linhagem
      c.add(this.add.rectangle(x0 + 1, y0 + 1, cardW - 2, 4, line.color).setOrigin(0));
      c.add(wtext(this, cx, y0 + 6 + 12 * s, line.name, 18 * s, darken(line.color), true).setOrigin(0.5));
      if (!portrait) c.add(wtext(this, cx, y0 + 6 + 32 * s, line.tagline, 12 * s, WIN.muted).setOrigin(0.5));

      // personagens centralizados entre o cabeçalho e o rodapé do cartão
      const headH = portrait ? 26 * s : 48 * s;
      const footH = portrait ? 8 : 24 * s;
      const labelsH = 34 * s;
      const spacing = Math.min(cardW / 3, portrait ? 200 : 130);
      const heroK = Math.min(portrait ? 1.1 : 1.15, (cardH - headH - footH - labelsH - 10) / 160, spacing / 100);
      const blockH = 160 * heroK + labelsH;
      const heroY = y0 + headH + (cardH - headH - footH - blockH) / 2 + (160 * heroK) / 2;
      line.classes.forEach((id, k) => {
        const cd = CLASSES[id];
        const x = cx + (k - 1) * spacing;
        c.add(this.add.sprite(x, heroY, cd.texture, 'idle0').setScale(heroK * (heroScale(cd.texture) / 0.5)).play(`${cd.texture}-idle`));
        const name = wtext(this, x, heroY + (160 * heroK) / 2 + 2, `${cd.name}\nNv ${cd.minLevel}`, 11 * s, WIN.text, true).setOrigin(0.5, 0)
          .setAlign('center').setWordWrapWidth(spacing - 6);
        c.add(name);
        if (k < 2) c.add(wtext(this, x + spacing / 2, heroY, k === 0 ? '→' : 'ou', 14 * s, darken(line.color), true).setOrigin(0.5));
      });
      if (!portrait) {
        const [s0, s1, s2] = line.classes.map((id) => SKILLS[CLASSES[id].grantsSkill!].name);
        c.add(wtext(this, cx, y0 + cardH - 14 * s, `${s0}  →  ${s1} ou ${s2}`, 11 * s, WIN.muted).setOrigin(0.5)
          .setAlign('center').setWordWrapWidth(cardW - 16));
      }
    });

    // ---- janela de baixo: mapa, loja e jogar
    const save = loadSave();
    let mapIdx = Math.max(0, MAPS.findIndex((m) => m.id === save.map));
    const bw = Math.min(winW, portrait ? winW : 900);
    const bot = uiWindow(this, (width - bw) / 2, height - bottomH - 6, bw, bottomH, `Partida   •   Zeny: ${save.zeny} z`, s);
    const bh = 36 * s;
    const rowY = bot.top + (portrait ? 28 : (bottomH - bot.top) / 2);
    const mapW = portrait ? bw - 120 : 270;
    const mapCx = portrait ? bw / 2 : 20 + 34 + mapW / 2;
    bot.c.add(uiPanel(this, mapCx - mapW / 2, rowY - bh / 2, mapW, bh));
    const mapText = wtext(this, mapCx, rowY, '', 15 * s, WIN.text, true).setOrigin(0.5);
    bot.c.add(mapText);
    const showMap = () => mapText.setText(MAPS[mapIdx].name);
    showMap();
    const shift = (d: number) => {
      mapIdx = (mapIdx + d + MAPS.length) % MAPS.length;
      save.map = MAPS[mapIdx].id;
      writeSave(save);
      showMap();
    };
    bot.c.add(uiButton(this, mapCx - mapW / 2 - 22 * s, rowY, 34 * s, bh, '◀', () => shift(-1)).c);
    bot.c.add(uiButton(this, mapCx + mapW / 2 + 22 * s, rowY, 34 * s, bh, '▶', () => shift(1)).c);

    const go = (target: string) => {
      if (this.started) return;
      this.started = true;
      this.scene.start(target, target === 'Shop' ? { inRun: false } : undefined);
    };
    const row2 = portrait ? rowY + bh + 18 : rowY;
    const shopCx = portrait ? bw / 2 - 110 * s : bw - 20 - 150 * s - 12 - 85 * s;
    const playCx = portrait ? bw / 2 + 110 * s : bw - 20 - 75 * s;
    bot.c.add(uiButton(this, shopCx, row2, 170 * s, bh, 'Equipamentos', () => go('Shop'), { size: 14 * s }).c);
    bot.c.add(uiButton(this, playCx, row2, 150 * s, bh + 6, touch ? 'JOGAR' : 'JOGAR  [Espaço]', () => go('Game'), { size: 16 * s, primary: true }).c);
    if (portrait) {
      bot.c.add(wtext(this, bw / 2, row2 + bh + 8, 'Toque e arraste para andar  •  Ataques automáticos', 12 * s, WIN.muted).setOrigin(0.5, 0));
    } else {
      wtext(this, width / 2, height - 4, touch ? 'Toque e arraste para andar  •  Ataques automáticos'
        : 'WASD / Setas para andar  •  Ataques automáticos  •  P pausa  •  Q usa a Asa', 12, '#dfe7f5').setOrigin(0.5, 1);
    }

    const kb = this.input.keyboard!;
    kb.once('keydown-SPACE', () => go('Game'));
    kb.once('keydown-ENTER', () => go('Game'));
    onResize(this, () => this.scene.restart());
  }

  /** Começa a partida (também usado pelos testes) */
  start() {
    if (this.started) return;
    this.started = true;
    this.scene.start('Game');
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
    const r = this.result;
    const s = uiScale(this);
    const touch = isTouch(this);
    this.add.tileSprite(0, 0, width, height, 'grama').setOrigin(0);
    dim(this, 0.7);

    const w = Math.min(520 * s, width - 30);
    const rows: [string, string][] = [
      ['Tempo sobrevivido', `${Math.floor(r.time / 60000)}m ${String(Math.floor(r.time / 1000) % 60).padStart(2, '0')}s`],
      ['Nível alcançado', `${r.level}`],
      ['Classe', r.className],
      ['Inimigos derrotados', `${r.kills}`],
      ['Cartas coletadas', `${r.cards}`],
      ['Zeny ganhos', `${r.zeny} z`],
      ['Zeny guardado', `${r.zenyTotal} z`],
    ];
    const rowH = 26 * s;
    const h = 24 * s + 16 + rows.length * rowH + 20 + 50 * s;
    const win = uiWindow(this, (width - w) / 2, (height - h) / 2, w, h, 'Você caiu em batalha', s);
    const pad = 14;
    const py = win.top + 10;
    win.c.add(uiPanel(this, pad, py, w - pad * 2, rows.length * rowH + 8));
    rows.forEach(([k, v], i) => {
      const y = py + 4 + i * rowH;
      if (i % 2) win.c.add(this.add.rectangle(pad + 1, y, w - pad * 2 - 2, rowH, WIN.rowAlt).setOrigin(0));
      win.c.add(wtext(this, pad + 12, y + rowH / 2, k, 14 * s, WIN.label).setOrigin(0, 0.5));
      win.c.add(wtext(this, w - pad - 12, y + rowH / 2, v, 14 * s, WIN.text, true).setOrigin(1, 0.5));
    });

    let gone = false;
    const go = (target: string) => {
      if (gone) return;
      gone = true;
      this.scene.start(target);
    };
    const by = h - 28 * s;
    const again = uiButton(this, w / 2 + 90 * s, by, 160 * s, 34 * s, touch ? 'Jogar de novo' : 'Jogar de novo [Espaço]', () => go('Game'), { size: 13 * s, primary: true, enabled: false });
    const menu = uiButton(this, w / 2 - 90 * s, by, 160 * s, 34 * s, touch ? 'Menu' : 'Menu [M]', () => go('Menu'), { size: 13 * s, enabled: false });
    win.c.add([menu.c, again.c]);

    // pequena espera para o jogador não reiniciar sem querer
    this.time.delayedCall(600, () => {
      again.setEnabled(true);
      menu.setEnabled(true);
      this.input.keyboard!.once('keydown-SPACE', () => go('Game'));
      this.input.keyboard!.once('keydown-ENTER', () => go('Game'));
      this.input.keyboard!.once('keydown-M', () => go('Menu'));
    });
    onResize(this, () => this.scene.restart(this.result));
  }
}
