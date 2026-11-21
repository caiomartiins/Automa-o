import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import { CLASSES } from '../data/classes';
import { SKILLS } from '../data/skills';
import { isPortrait, isTouch, onResize, text } from '../ui';

/** HUD desenhado por cima do jogo */
export class UIScene extends Phaser.Scene {
  private game_!: GameScene;
  private bars!: Phaser.GameObjects.Graphics;
  private levelText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private classText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private skillText!: Phaser.GameObjects.Text;
  private announceText!: Phaser.GameObjects.Text;
  private pauseText!: Phaser.GameObjects.Text;
  private pauseIcon!: Phaser.GameObjects.Text;
  /** Escala do HUD: maior em telas de toque, onde o jogo aparece reduzido */
  private k = 1;
  /** Assinatura do último desenho das barras, para só redesenhar quando algo mudar */
  private lastBars = '';
  private lastSecond = -1;
  private lastKills = -1;
  private lastSkills = '';

  constructor() {
    super('UI');
  }

  create() {
    this.game_ = this.scene.get('Game') as GameScene;
    const { width, height } = this.scale;
    const k = (this.k = isTouch(this) ? 1.4 : 1);
    const portrait = isPortrait(this);
    this.lastBars = '';
    this.lastSecond = -1;
    this.lastKills = -1;
    this.lastSkills = '';

    this.bars = this.add.graphics();
    this.levelText = text(this, width / 2, 9 * k, '', 14 * k).setOrigin(0.5);
    this.hpText = text(this, 26, 24 * k + 9 * k, '', 13 * k).setOrigin(0, 0.5);
    this.classText = text(this, 16, 50 * k, '', 18 * k);
    // em pé, o relógio desce para não encostar na barra de vida
    this.timeText = text(this, width / 2, (portrait ? 80 : 30) * k, '', 28 * k).setOrigin(0.5, 0);
    this.killText = text(this, width - 16, 24 * k, '', 18 * k).setOrigin(1, 0);
    this.skillText = text(this, 16, height - 16, '', 15 * k).setOrigin(0, 1).setWordWrapWidth(width - 32);
    this.announceText = text(this, width / 2, portrait ? 240 : 150, '', 30 * k, '#ffd04a')
      .setOrigin(0.5).setAlign('center').setWordWrapWidth(width - 40).setAlpha(0);
    this.pauseText = text(
      this, width / 2, height / 2,
      isTouch(this) ? 'PAUSADO\n\nToque em ▶ para continuar' : 'PAUSADO\n\nP, ESC ou ▶ para continuar',
      36,
    ).setOrigin(0.5).setAlign('center').setVisible(false);

    const onAnnounce = (msg: string) => {
      this.announceText.setText(msg).setAlpha(1);
      this.tweens.killTweensOf(this.announceText);
      this.tweens.add({ targets: this.announceText, alpha: 0, delay: 2200, duration: 600 });
    };
    this.game_.events.on('announce', onAnnounce);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game_.events.off('announce', onAnnounce));

    // ---- botões na tela (pausa e tela cheia) ----
    const btnY = 24 * k + 40 * k;
    const btnR = 26 * k;
    this.pauseIcon = this.button(width - 16 - btnR, btnY + btnR, btnR, 'II', () => this.togglePause());
    if (this.sys.game.device.fullscreen.available) {
      this.button(width - 16 - btnR * 3 - 12, btnY + btnR, btnR, '⛶', () => this.toggleFullscreen());
    }

    // se o jogo já estava pausado (ex.: HUD recriado ao girar o celular), mantém o aviso
    if (this.scene.isPaused('Game') && !this.scene.isActive('LevelUp')) {
      this.pauseText.setVisible(true);
      this.pauseIcon.setText('▶');
    }
    onResize(this, () => this.scene.restart());

    this.input.keyboard?.on('keydown-P', () => this.togglePause());
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
  }

  private button(x: number, y: number, r: number, label: string, onTap: () => void) {
    const bg = this.add.circle(x, y, r, 0x000000, 0.45).setStrokeStyle(2, 0xffffff, 0.5);
    const t = text(this, x, y, label, r * 0.9).setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true }).on('pointerup', onTap);
    return t;
  }

  private togglePause() {
    if (this.scene.isActive('LevelUp')) return;
    if (this.scene.isPaused('Game')) {
      this.scene.resume('Game');
      this.pauseText.setVisible(false);
      this.pauseIcon.setText('II');
    } else {
      this.scene.pause('Game');
      this.pauseText.setVisible(true);
      this.pauseIcon.setText('▶');
    }
  }

  private toggleFullscreen() {
    try {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
        return;
      }
      this.scale.startFullscreen();
      // Trava na horizontal quando o navegador permite (Android). No iPhone isso é ignorado.
      const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      orientation.lock?.('landscape').catch(() => {});
    } catch {
      /* tela cheia não disponível: segue normal */
    }
  }

  update() {
    const g = this.game_;
    if (!g.stats) return;
    const { width } = this.scale;
    const k = this.k;
    const xpPx = Math.round(width * Math.min(1, g.xp / g.xpNext));
    const hpPct = Phaser.Math.Clamp(g.hp / g.stats.maxHp, 0, 1);
    const barW = 260 * k;
    const hpPx = Math.round((barW - 4) * hpPct);
    const sig = `${xpPx}|${hpPx}|${g.level}|${Math.ceil(g.hp)}|${g.stats.maxHp}|${g.classId}`;
    if (sig !== this.lastBars) {
      this.lastBars = sig;
      this.drawBars(xpPx, hpPx, hpPct);
    }

    const s = Math.floor(g.elapsed / 1000);
    if (s !== this.lastSecond) {
      this.lastSecond = s;
      this.timeText.setText(`${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`);
    }
    if (g.kills !== this.lastKills) {
      this.lastKills = g.kills;
      this.killText.setText(`Abates: ${g.kills}`);
    }
    let skills = '';
    for (const sk of g.skills.values()) skills += sk.id + sk.level;
    if (skills !== this.lastSkills) {
      this.lastSkills = skills;
      this.skillText.setText([...g.skills.values()].map((sk) => `${SKILLS[sk.id].name} Nv${sk.level}`).join('   •   '));
    }
  }

  private drawBars(xpPx: number, hpPx: number, hpPct: number) {
    const g = this.game_;
    const { width } = this.scale;
    const k = this.k;
    const b = this.bars;
    b.clear();

    // barra de XP (topo)
    b.fillStyle(0x000000, 0.6).fillRect(0, 0, width, 18 * k);
    b.fillStyle(0x3d8bff).fillRect(0, 0, xpPx, 18 * k);
    this.levelText.setText(`Nível ${g.level}`);

    // barra de vida
    const barW = 260 * k;
    const barH = 18 * k;
    b.fillStyle(0x000000, 0.6).fillRect(16, 24 * k, barW, barH);
    b.fillStyle(hpPct > 0.3 ? 0xd63a3a : 0xff7a1a).fillRect(18, 24 * k + 2, hpPx, barH - 4);
    this.hpText.setText(`Vida ${Math.ceil(Math.max(0, g.hp))}/${g.stats.maxHp}`);

    // classe atual e próxima promoção
    const cls = CLASSES[g.classId];
    const next = cls.next ? CLASSES[cls.next] : null;
    this.classText.setText(next ? `${cls.name}  →  ${next.name} no Nv ${next.minLevel}` : `${cls.name}  (classe máxima)`);
  }
}
