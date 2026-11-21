import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import { CLASSES } from '../data/classes';
import { SKILLS } from '../data/skills';
import { text } from '../ui';

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

  constructor() {
    super('UI');
  }

  create() {
    this.game_ = this.scene.get('Game') as GameScene;
    const { width, height } = this.scale;

    this.bars = this.add.graphics();
    this.levelText = text(this, width / 2, 9, '', 14).setOrigin(0.5);
    this.hpText = text(this, 26, 33, '', 13).setOrigin(0, 0.5);
    this.classText = text(this, 16, 50, '', 18);
    this.timeText = text(this, width / 2, 40, '', 28).setOrigin(0.5, 0);
    this.killText = text(this, width - 16, 26, '', 18).setOrigin(1, 0);
    this.skillText = text(this, 16, height - 16, '', 15).setOrigin(0, 1);
    this.announceText = text(this, width / 2, 140, '', 30, '#ffd04a').setOrigin(0.5).setAlpha(0);
    this.pauseText = text(this, width / 2, height / 2, 'PAUSADO\n\nP ou ESC para continuar', 36).setOrigin(0.5).setAlign('center').setVisible(false);

    const onAnnounce = (msg: string) => {
      this.announceText.setText(msg).setAlpha(1);
      this.tweens.killTweensOf(this.announceText);
      this.tweens.add({ targets: this.announceText, alpha: 0, delay: 2200, duration: 600 });
    };
    this.game_.events.on('announce', onAnnounce);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game_.events.off('announce', onAnnounce));

    const togglePause = () => {
      if (this.scene.isActive('LevelUp')) return;
      if (this.scene.isPaused('Game')) {
        this.scene.resume('Game');
        this.pauseText.setVisible(false);
      } else {
        this.scene.pause('Game');
        this.pauseText.setVisible(true);
      }
    };
    this.input.keyboard!.on('keydown-P', togglePause);
    this.input.keyboard!.on('keydown-ESC', togglePause);
  }

  update() {
    const g = this.game_;
    if (!g.stats) return;
    const { width } = this.scale;
    const b = this.bars;
    b.clear();

    // barra de XP (topo)
    b.fillStyle(0x000000, 0.6).fillRect(0, 0, width, 18);
    b.fillStyle(0x3d8bff).fillRect(0, 0, width * Math.min(1, g.xp / g.xpNext), 18);
    this.levelText.setText(`Nível ${g.level}`);

    // barra de vida
    const hpPct = Phaser.Math.Clamp(g.hp / g.stats.maxHp, 0, 1);
    b.fillStyle(0x000000, 0.6).fillRoundedRect(16, 24, 260, 18, 4);
    b.fillStyle(hpPct > 0.3 ? 0xd63a3a : 0xff7a1a).fillRoundedRect(18, 26, 256 * hpPct, 14, 3);
    this.hpText.setText(`Vida ${Math.ceil(Math.max(0, g.hp))}/${g.stats.maxHp}`);

    // classe atual e próxima promoção
    const cls = CLASSES[g.classId];
    const next = cls.next ? CLASSES[cls.next] : null;
    this.classText.setText(next ? `${cls.name}  →  ${next.name} no Nv ${next.minLevel}` : `${cls.name}  (classe máxima)`);

    const s = Math.floor(g.elapsed / 1000);
    this.timeText.setText(`${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`);
    this.killText.setText(`Abates: ${g.kills}`);

    this.skillText.setText([...g.skills.values()].map((sk) => `${SKILLS[sk.id].name} Nv${sk.level}`).join('   •   '));
  }
}
