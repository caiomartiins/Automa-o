import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import { jobForLevel } from './GameScene';
import { CLASSES, PROFESSION_LEVEL, SECOND_CLASS_LEVEL } from '../data/classes';
import { SKILLS } from '../data/skills';
import { threatLevel } from '../data/enemies';
import { ATTRS, ATTR_IDS, CARDS, ELEMENTS, KIND_NAME, REFINE_DMG } from '../data/rpg';
import { loadSave } from '../save';
import type { StatusScene } from './StatusScene';
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
  /** Botão que avisa que há pontos de status/habilidade para distribuir */
  private pointsBtn!: ReturnType<typeof uiButton>;

  private announceText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;

  private last = { info: '', time: '', skills: '', items: '', boss: '', points: '' };

  constructor() {
    super('UI');
  }

  create() {
    this.game_ = this.scene.get('Game') as GameScene;
    const { width, height } = this.scale;
    const portrait = (this.portrait = isPortrait(this));
    // em pé, o HUD fica um pouco mais compacto para sobrar tela para o jogo
    const k = (this.k = uiScale(this) * (portrait ? 0.85 : 1));
    this.last = { info: '', time: '', skills: '', items: '', boss: '', points: '' };

    // ---- informações básicas (canto superior esquerdo)
    const iw = Math.min(250 * k, width * (portrait ? 0.56 : 0.3));
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
    // ---- barra de tempo (centro no alto; em pé, colada embaixo das informações, na largura toda)
    const tw = portrait ? width - 16 : Math.min(330 * k, width - 30);
    const ty = portrait ? 8 + ih + 6 : 8;
    this.timeBar = uiWindow(this, (width - tw) / 2, ty, tw, 26 * k, '', k);
    // estados do jogador (amaldiçoado, envenenado): embaixo das informações / do tempo
    this.statusText = wtext(this, 12, portrait ? ty + 26 * k + 6 : 8 + ih + 6, '', 13 * k, '#e2c8ff', true).setStroke('#22143a', 3);
    this.timeBar.title.setX(tw / 2).setOrigin(0.5, 0.5);

    // ---- chefe
    const bw = Math.min(520 * k, width - 30);
    this.bossWin = uiWindow(this, (width - bw) / 2, ty + 34 * k, bw, 26 * k + 22 * k, '', k);
    this.bossBar = this.add.graphics();
    this.bossWin.c.add(this.bossBar).setVisible(false);

    // ---- botões (canto superior direito)
    const bs = 34 * k;
    this.pauseBtn = uiButton(this, width - 8 - bs / 2, 8 + bs / 2, bs, bs, 'II', () => this.togglePause(), { size: 14 * k });
    const fs = this.sys.game.device.fullscreen.available;
    if (fs) {
      uiButton(this, width - 16 - bs * 1.5, 8 + bs / 2, bs, bs, '⛶', () => this.toggleFullscreen(), { size: 15 * k });
    }
    // pontos para distribuir: botão piscando ao lado da pausa
    const pw = 118 * k;
    // deitado: ao lado da pausa; em pé (pouco espaço): logo abaixo dos botões
    // em pé: ocupa a coluna da direita (ao lado das informações), logo abaixo da pausa
    const colW = width - 8 - iw - 16;
    const pW = portrait ? Math.min(colW, 200 * k) : pw;
    const px = portrait ? width - 8 - pW / 2 : width - 8 - bs - 8 - (fs ? bs + 8 : 0) - pw / 2;
    const py = portrait ? 8 + bs + 8 + bs / 2 : 8 + bs / 2;
    this.pointsBtn = uiButton(this, px, py, pW, bs, '', () => this.openPoints(), { size: 13 * k, primary: true });
    this.pointsBtn.c.setVisible(false);
    this.tweens.add({ targets: this.pointsBtn.c, scale: 1.08, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

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
    // em pé: avisos logo abaixo da barra do chefe (sem ficar atrás dela)
    const bossBottom = ty + 34 * k + 26 * k + 22 * k;
    this.announceText = headline(this, width / 2, portrait ? bossBottom + 40 * k : 170, '', 24 * k, '#ffe9a0')
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
      this.game_.events.off('status-closed', onClosed);
    });

    if (this.scene.isActive('Status')) this.pauseBtn.setText('▶');
    const onClosed = () => this.pauseBtn.setText('II');
    this.game_.events.on('status-closed', onClosed);
    onResize(this, () => this.scene.restart());
    this.input.keyboard?.on('keydown-P', () => this.togglePause());
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
  }

  /** Abre a janela de Status para distribuir os pontos (o jogo pausa) */
  openPoints() {
    if (this.scene.isActive('LevelUp') || this.scene.isActive('Status') || this.scene.isActive('SkillTree')) return;
    if (this.scene.isPaused('Game')) return;
    this.scene.pause('Game');
    this.game_.choosing = true;
    this.scene.launch('Status', { reason: 'levelup' });
    this.scene.bringToTop('Status');
    this.pauseBtn.setText('▶');
  }

  togglePause() {
    if (this.scene.isActive('LevelUp')) return;
    if (this.scene.isActive('Status')) {
      (this.scene.get('Status') as StatusScene).close();
      return;
    }
    if (this.scene.isPaused('Game')) return;
    this.scene.pause('Game');
    this.game_.choosing = true;
    this.scene.launch('Status', { reason: 'pause' });
    this.scene.bringToTop('Status');
    this.pauseBtn.setText('▶');
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

    // botão de pontos: aparece enquanto houver pontos de status ou de habilidade
    const pp = g.pendingPoints();
    // "+12 pts" = pontos de status; "✦3" = pontos de habilidade
    const ptsLabel = pp.attr || pp.skill ? [pp.attr ? `+${pp.attr} pts` : '', pp.skill ? `✦${pp.skill}` : ''].filter(Boolean).join('  ') : '';
    if (ptsLabel !== this.last.points) {
      this.last.points = ptsLabel;
      this.pointsBtn.c.setVisible(!!ptsLabel);
      this.pointsBtn.setText(ptsLabel);
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

}
