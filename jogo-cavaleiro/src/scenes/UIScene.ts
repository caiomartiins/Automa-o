import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import { jobForLevel } from './GameScene';
import { CLASSES, PROFESSION_LEVEL, SECOND_CLASS_LEVEL } from '../data/classes';
import { SKILLS } from '../data/skills';
import { threatLevel } from '../data/enemies';
import { ATTRS, ATTR_IDS, CARDS, ELEMENTS, KIND_NAME, REFINE_DMG } from '../data/rpg';
import { loadSave } from '../save';
import { heroScale } from '../sprites';
import {
  dim, headline, isPortrait, isTouch, onResize, resizeWindow, uiArrow, uiBar, uiButton, uiPanel, uiScale, uiWindow, WIN, wtext,
  type UIWindow,
} from '../ui';

/** HUD (janelas por cima do jogo) e janela de status na pausa */
export class UIScene extends Phaser.Scene {
  private game_!: GameScene;
  private k = 1;
  private portrait = false;

  // janela de informações básicas
  private info!: UIWindow;
  private infoBars!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private baseText!: Phaser.GameObjects.Text;
  private jobText!: Phaser.GameObjects.Text;
  private zenyText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private barX = 0;
  private barW = 0;
  private rowY: number[] = [];

  // tempo, chefe, habilidades, itens
  private timeBar!: UIWindow;
  private bossWin!: UIWindow;
  private bossBar!: Phaser.GameObjects.Graphics;
  private skillsWin!: UIWindow;
  private skillsText!: Phaser.GameObjects.Text;
  private wingBtn!: ReturnType<typeof uiButton>;
  private penaText!: Phaser.GameObjects.Text;
  private pauseBtn!: ReturnType<typeof uiButton>;

  private announceText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private panel: Phaser.GameObjects.Container | null = null;
  private panelTab: 'geral' | 'cartas' = 'geral';

  private last = { info: '', time: '', skills: '', items: '', boss: '' };

  constructor() {
    super('UI');
  }

  create() {
    this.game_ = this.scene.get('Game') as GameScene;
    const { width, height } = this.scale;
    const k = (this.k = uiScale(this));
    const portrait = (this.portrait = isPortrait(this));
    this.last = { info: '', time: '', skills: '', items: '', boss: '' };
    this.panel = null;

    // ---- informações básicas (canto superior esquerdo)
    const iw = Math.min(250 * k, width * (portrait ? 0.6 : 0.3));
    const rowH = 18 * k;
    const ih = 24 * k + 2 + 8 + rowH * 4 + 6;
    this.info = uiWindow(this, 8, 8, iw, ih, '', k);
    const c = this.info.c;
    this.infoBars = this.add.graphics();
    c.add(this.infoBars);
    const labelW = 46 * k;
    this.barX = 10 + labelW;
    this.barW = iw - this.barX - 10;
    this.rowY = [0, 1, 2, 3].map((i) => this.info.top + 6 + i * rowH);
    const label = (i: number, t: string) => c.add(wtext(this, 10, this.rowY[i] + rowH / 2, t, 12 * k, WIN.label, true).setOrigin(0, 0.5));
    label(0, 'HP');
    label(1, 'Base');
    label(2, 'Classe');
    label(3, 'Zeny');
    this.hpText = wtext(this, this.barX + this.barW / 2, this.rowY[0] + rowH / 2, '', 11 * k, '#ffffff', true).setOrigin(0.5);
    this.baseText = wtext(this, this.barX + this.barW / 2, this.rowY[1] + rowH / 2, '', 11 * k, '#ffffff', true).setOrigin(0.5);
    this.jobText = wtext(this, this.barX + this.barW / 2, this.rowY[2] + rowH / 2, '', 11 * k, '#ffffff', true).setOrigin(0.5);
    this.zenyText = wtext(this, this.barX, this.rowY[3] + rowH / 2, '', 12 * k, WIN.gold, true).setOrigin(0, 0.5);
    c.add([this.hpText, this.baseText, this.jobText, this.zenyText]);
    this.statusText = wtext(this, 12, 8 + ih + 6, '', 13 * k, '#e2c8ff', true).setStroke('#22143a', 3);

    // ---- barra de tempo (centro no alto; em pé, abaixo das informações)
    const tw = Math.min(330 * k, width - 30);
    const ty = portrait ? 8 + ih + 30 * k : 8;
    this.timeBar = uiWindow(this, (width - tw) / 2, ty, tw, 26 * k, '', k);
    this.timeBar.title.setX(tw / 2).setOrigin(0.5, 0.5);

    // ---- chefe
    const bw = Math.min(520 * k, width - 30);
    this.bossWin = uiWindow(this, (width - bw) / 2, ty + 34 * k, bw, 26 * k + 22 * k, '', k);
    this.bossBar = this.add.graphics();
    this.bossWin.c.add(this.bossBar).setVisible(false);

    // ---- botões (canto superior direito)
    const bs = 34 * k;
    this.pauseBtn = uiButton(this, width - 8 - bs / 2, 8 + bs / 2, bs, bs, 'II', () => this.togglePause(), { size: 14 * k });
    if (this.sys.game.device.fullscreen.available) {
      uiButton(this, width - 16 - bs * 1.5, 8 + bs / 2, bs, bs, '⛶', () => this.toggleFullscreen(), { size: 15 * k });
    }

    // ---- habilidades (canto inferior esquerdo)
    const sw = Math.min(300 * k, width * (portrait ? 0.58 : 0.3));
    this.skillsWin = uiWindow(this, 8, height - 8 - 100 * k, sw, 100 * k, 'Habilidades', k);
    this.skillsText = wtext(this, 10, this.skillsWin.top + 6, '', 12 * k, WIN.text).setLineSpacing(2).setWordWrapWidth(sw - 20);
    this.skillsWin.c.add(this.skillsText);

    // ---- itens (canto inferior direito)
    const itw = 150 * k;
    const ith = 24 * k + 2 + 62 * k;
    const items = uiWindow(this, width - 8 - itw, height - 8 - ith, itw, ith, 'Itens', k);
    this.wingBtn = uiButton(this, itw / 2, items.top + 6 + 18 * k, itw - 20, 32 * k, 'Asa x0', () => this.game_.useWing(), { size: 13 * k });
    this.penaText = wtext(this, itw / 2, items.top + 6 + 42 * k, '', 11 * k, WIN.gold, true).setOrigin(0.5);
    items.c.add([this.wingBtn.c, this.penaText]);

    // ---- avisos
    this.announceText = headline(this, width / 2, portrait ? height * 0.3 : 170, '', 26 * k, '#ffe9a0')
      .setOrigin(0.5).setAlign('center').setWordWrapWidth(width - 40).setAlpha(0);
    this.toastText = headline(this, width / 2, height - 130 * k, '', 16 * k, '#ffffff')
      .setOrigin(0.5).setAlign('center').setWordWrapWidth(width - 40).setAlpha(0);
    const onAnnounce = (msg: string) => {
      this.announceText.setText(msg).setAlpha(1);
      this.tweens.killTweensOf(this.announceText);
      this.tweens.add({ targets: this.announceText, alpha: 0, delay: 2200, duration: 600 });
    };
    const onToast = (msg: string, color = '#ffffff') => {
      this.toastText.setText(msg).setColor(color).setAlpha(1);
      this.tweens.killTweensOf(this.toastText);
      this.tweens.add({ targets: this.toastText, alpha: 0, delay: 1800, duration: 500 });
    };
    this.game_.events.on('announce', onAnnounce);
    this.game_.events.on('toast', onToast);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game_.events.off('announce', onAnnounce);
      this.game_.events.off('toast', onToast);
    });

    if (this.scene.isPaused('Game') && !this.scene.isActive('LevelUp')) {
      this.showStatusPanel();
      this.pauseBtn.setText('▶');
    }
    onResize(this, () => this.scene.restart());
    this.input.keyboard?.on('keydown-P', () => this.togglePause());
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
  }

  togglePause() {
    if (this.scene.isActive('LevelUp')) return;
    if (this.scene.isPaused('Game')) {
      this.scene.resume('Game');
      this.panel?.destroy();
      this.panel = null;
      this.pauseBtn.setText('II');
    } else {
      this.scene.pause('Game');
      this.panelTab = 'geral';
      this.showStatusPanel();
      this.pauseBtn.setText('▶');
    }
  }

  private toggleFullscreen() {
    try {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
        return;
      }
      this.scale.startFullscreen();
      // trava na horizontal quando o navegador permite (Android); no iPhone é ignorado
      const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      orientation.lock?.('landscape').catch(() => {});
    } catch {
      /* tela cheia não disponível */
    }
  }

  // ---------------------------------------------------------------- atualização do HUD

  update() {
    const g = this.game_;
    if (!g.stats) return;
    const k = this.k;

    const jobNeed = jobForLevel(g.jobLevel);
    const sig = [Math.ceil(g.hp), g.stats.maxHp, g.level, Math.round((g.xp / g.xpNext) * 200), g.jobLevel,
      Math.round((g.jobXp / jobNeed) * 200), g.classId, g.zenyRun].join('|');
    if (sig !== this.last.info) {
      this.last.info = sig;
      const cls = CLASSES[g.classId];
      const next = cls.id === 'aprendiz' ? PROFESSION_LEVEL : cls.choices ? SECOND_CLASS_LEVEL : 0;
      this.info.title.setText(`${cls.name}  •  Nv ${g.level}${next ? `   (→ Nv ${next})` : ''}`);
      const b = this.infoBars;
      b.clear();
      const h = 14 * k;
      const hpPct = g.hp / g.stats.maxHp;
      uiBar(b, this.barX, this.rowY[0] + 2 * k, this.barW, h, hpPct, hpPct > 0.3 ? 0x3cc04a : 0xe0442e);
      uiBar(b, this.barX, this.rowY[1] + 2 * k, this.barW, h, g.xp / g.xpNext, 0x3d8bff);
      uiBar(b, this.barX, this.rowY[2] + 2 * k, this.barW, h, g.jobXp / jobNeed, 0xd9a520);
      this.hpText.setText(`${Math.ceil(Math.max(0, g.hp))} / ${g.stats.maxHp}`);
      this.baseText.setText(`Nv ${g.level}   ${Math.floor((g.xp / g.xpNext) * 100)}%`);
      this.jobText.setText(`Nv ${g.jobLevel}   ${Math.floor((g.jobXp / jobNeed) * 100)}%`);
      this.zenyText.setText(`${g.zenyRun} z`);
    }

    const s = Math.floor(g.elapsed / 1000);
    const time = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}   •   Ameaça ${threatLevel(s)}   •   Abates ${g.kills}`;
    if (time !== this.last.time) {
      this.last.time = time;
      this.timeBar.title.setText(time);
    }

    let skills = '';
    for (const sk of g.skills.values()) skills += sk.id + sk.level;
    if (skills !== this.last.skills) {
      this.last.skills = skills;
      this.skillsText.setText([...g.skills.values()].map((sk) => `${SKILLS[sk.id].name}  Nv ${sk.level}`).join('\n'));
      const h = this.skillsWin.top + 12 + this.skillsText.height;
      this.skillsWin.c.y = this.scale.height - 8 - h;
      this.redrawWindowHeight(this.skillsWin, h);
    }

    const items = `${g.items.asa}|${g.items.pena}`;
    if (items !== this.last.items) {
      this.last.items = items;
      this.wingBtn.setText(isTouch(this) ? `Asa  x${g.items.asa}` : `Asa  x${g.items.asa}   [Q]`);
      this.wingBtn.setEnabled(g.items.asa > 0);
      this.penaText.setText(g.items.pena > 0 ? `Pena da Ressurreição x${g.items.pena}` : 'Sem penas');
    }

    const st = [g.elapsed < g.curseUntil ? 'Amaldiçoado' : '', g.elapsed < g.poisonUntil ? 'Envenenado' : ''].filter(Boolean).join('  •  ');
    if (st !== this.statusText.text) this.statusText.setText(st);

    this.updateBoss();
  }

  private redrawWindowHeight(win: UIWindow, h: number) {
    if (Math.abs(win.h - h) >= 1) resizeWindow(this, win, h);
  }

  private updateBoss() {
    const boss = this.game_.boss;
    const alive = !!boss && boss.active;
    const pct = alive ? Phaser.Math.Clamp(boss!.hp / boss!.maxHp, 0, 1) : 0;
    const sig = alive ? `${boss!.def.id}|${Math.round(pct * 400)}` : '';
    if (sig === this.last.boss) return;
    this.last.boss = sig;
    this.bossWin.c.setVisible(alive);
    if (!alive) return;
    const k = this.k;
    this.bossWin.title.setText(`${boss!.def.name}   ${Math.ceil(pct * 100)}%`);
    this.bossBar.clear();
    uiBar(this.bossBar, 10, this.bossWin.top + 4 * k, this.bossWin.w - 20, 14 * k, pct, 0xe0442e, 0x4a1c22);
  }

  // ---------------------------------------------------------------- janela de status (pausa)

  private showStatusPanel() {
    this.panel?.destroy();
    const g = this.game_;
    const { width, height } = this.scale;
    const portrait = this.portrait;
    const k = this.k;
    const root = this.add.container(0, 0);
    root.add(dim(this, 0.45));

    const pw = Math.min(portrait ? width - 20 : 900, width - 20);
    const ph = Math.min(portrait ? height - 60 : 600, height - 30);
    const win = uiWindow(this, (width - pw) / 2, (height - ph) / 2, pw, ph, 'Status   •   jogo pausado', k);
    root.add(win.c);
    const c = win.c;
    const pad = 12;

    // abas
    const tabW = 140 * k;
    const tabH = 28 * k;
    const tabY = win.top + 6 + tabH / 2;
    const tab = (x: number, label: string, id: 'geral' | 'cartas') => {
      const b = uiButton(this, x, tabY, tabW, tabH, label, () => {
        this.panelTab = id;
        this.showStatusPanel();
      }, { size: 13 * k, primary: this.panelTab === id });
      c.add(b.c);
    };
    tab(pad + tabW / 2, 'Geral', 'geral');
    tab(pad + tabW * 1.5 + 6, `Cartas (${g.cards.length})`, 'cartas');

    const top = win.top + 12 + tabH;
    const bottomBtnH = 36 * k;
    const areaH = ph - top - bottomBtnH - 20;

    if (this.panelTab === 'cartas') {
      c.add(uiPanel(this, pad, top, pw - pad * 2, areaH));
      const count = new Map<string, number>();
      for (const m of g.cards) count.set(m, (count.get(m) ?? 0) + 1);
      const lines = count.size
        ? [...count].map(([m, n]) => {
          const cd = CARDS.find((x) => x.monster === m)!;
          return `${cd.name}${n > 1 ? ` x${n}` : ''}   —   ${cd.desc}`;
        }).join('\n')
        : 'Nenhuma carta ainda.\nMonstros soltam cartas raras; os chefes sempre soltam a deles.';
      c.add(wtext(this, pad + 12, top + 10, lines, 14 * k, WIN.text).setLineSpacing(6).setWordWrapWidth(pw - pad * 2 - 24));
    } else {
      this.buildGeneralTab(c, pad, top, pw - pad * 2, areaH, portrait, k);
    }

    c.add(uiButton(this, pw / 2, ph - 12 - bottomBtnH / 2, 200 * k, bottomBtnH,
      isTouch(this) ? 'Continuar' : 'Continuar  [P]', () => this.togglePause(), { size: 14 * k, primary: true }).c);
    this.panel = root;
  }

  private buildGeneralTab(c: Phaser.GameObjects.Container, x: number, y: number, w: number, h: number, portrait: boolean, k: number) {
    const g = this.game_;
    const save = loadSave();
    const cls = CLASSES[g.classId];
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const statusH = (portrait ? 6 * 26 : 6 * 24) * k + 34 * k;
    const topH = h - statusH - 8;

    // ---- parte de cima: equipamento | herói | habilidades
    const heroW = portrait ? 0 : Math.min(180, w * 0.22);
    const colW = portrait ? w : (w - heroW - 16) / 2;
    const equip = [
      ['Arma', `refino +${save.refine}  (+${Math.round(save.refine * REFINE_DMG * 100)}% dano)`],
      ['Mascote', g.pet ? `${g.pet.name}` : 'nenhum'],
      ['Asas', `${g.items.asa}`],
      ['Penas', `${g.items.pena}`],
      ['Mapa', g.map.name],
      ['Zeny', `${g.zenyRun} z nesta partida`],
    ];
    const skills = [...g.skills.values()].map((sk) => {
      const d = SKILLS[sk.id];
      return [`${d.name} Nv ${sk.level}`, `${ELEMENTS[d.element].name}, ${KIND_NAME[d.kind].toLowerCase()}`];
    });
    const list = (px: number, py: number, pw: number, ph: number, title: string, rows: string[][]) => {
      c.add(uiPanel(this, px, py, pw, ph));
      c.add(wtext(this, px + 10, py + 6, title, 13 * k, WIN.accent, true));
      const rh = Math.min(22 * k, (ph - 30 * k) / Math.max(rows.length, 1));
      rows.forEach(([a, b], i) => {
        const ry = py + 26 * k + i * rh;
        if (i % 2) c.add(this.add.rectangle(px + 1, ry, pw - 2, rh, WIN.rowAlt).setOrigin(0));
        c.add(wtext(this, px + 10, ry + rh / 2, a, 12 * k, WIN.label, true).setOrigin(0, 0.5));
        c.add(wtext(this, px + pw - 10, ry + rh / 2, b, 12 * k, WIN.text).setOrigin(1, 0.5));
      });
    };
    if (portrait) {
      const half = (topH - 8) / 2;
      list(x, y, w, half, 'Equipamento', equip);
      list(x, y + half + 8, w, half, 'Habilidades', skills);
    } else {
      list(x, y, colW, topH, 'Equipamento', equip);
      const hx = x + colW + 8;
      c.add(uiPanel(this, hx, y, heroW, topH, 0xeef3fa));
      const hs = (heroScale(cls.texture) / 0.5) * Math.min(1, (topH - 50) / 170);
      c.add(this.add.sprite(hx + heroW / 2, y + topH / 2 - 10, cls.texture, 'idle0').setScale(hs).play(`${cls.texture}-idle`));
      c.add(wtext(this, hx + heroW / 2, y + topH - 16, cls.name, 13 * k, WIN.text, true).setOrigin(0.5));
      list(hx + heroW + 8, y, colW, topH, 'Habilidades', skills);
    }

    // ---- parte de baixo: Status (atributos com ▶ e valores calculados)
    const sy = y + topH + 8;
    c.add(uiPanel(this, x, sy, w, statusH));
    c.add(wtext(this, x + 10, sy + 6, g.attrPoints > 0 ? `Status   •   Pontos: ${g.attrPoints}` : 'Status', 13 * k, WIN.accent, true));
    const rh = (statusH - 30 * k) / 6;
    const leftW = w * 0.42;
    ATTR_IDS.forEach((a, i) => {
      const ry = sy + 26 * k + i * rh;
      if (i % 2) c.add(this.add.rectangle(x + 1, ry, w - 2, rh, WIN.rowAlt).setOrigin(0));
      c.add(wtext(this, x + 12, ry + rh / 2, ATTRS[a].short, 13 * k, WIN.label, true).setOrigin(0, 0.5));
      c.add(wtext(this, x + leftW - 50 * k, ry + rh / 2, String(g.attrs[a]), 13 * k, WIN.text, true).setOrigin(1, 0.5));
      c.add(uiArrow(this, x + leftW - 28 * k, ry + rh / 2, Math.min(22 * k, rh - 2), () => {
        if (g.spendAttr(a)) this.showStatusPanel();
      }, g.attrPoints > 0).c);
    });
    const melee = g.attrs.for * 0.02 + g.mods.kindDmg.melee;
    const ranged = g.attrs.des * 0.025 + g.mods.kindDmg.ranged;
    const magic = g.attrs.int * 0.025 + g.mods.kindDmg.magic;
    const derived: [string, string][] = [
      ['Atq corpo a corpo', `+${pct(melee)}`],
      ['Atq à distância', `+${pct(ranged)}`],
      ['Atq mágico', `+${pct(magic)}`],
      ['Crítico  /  Esquiva', `${pct(g.critChance())}  /  ${pct(g.evadeChance())}`],
      ['Defesa  /  Vel. ataque', `${g.stats.armor}  /  ${pct(g.stats.haste)}`],
      ['Dano geral  /  Nv classe', `+${pct(g.mods.dmgAll + (g.jobLevel - 1) * 0.02)}  /  ${g.jobLevel}`],
    ];
    derived.forEach(([a, b], i) => {
      const ry = sy + 26 * k + i * rh;
      c.add(wtext(this, x + leftW + 14, ry + rh / 2, a, 12 * k, WIN.label, true).setOrigin(0, 0.5));
      c.add(wtext(this, x + w - 12, ry + rh / 2, b, 12 * k, WIN.text, true).setOrigin(1, 0.5));
    });
    c.add(this.add.rectangle(x + leftW, sy + 26 * k, 1, statusH - 32 * k, WIN.panelBorder).setOrigin(0));
  }
}
