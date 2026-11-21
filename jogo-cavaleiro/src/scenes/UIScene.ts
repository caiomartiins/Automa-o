import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import { CLASSES, PROFESSION_LEVEL, SECOND_CLASS_LEVEL } from '../data/classes';
import { SKILLS } from '../data/skills';
import { ATTRS, ATTR_IDS, CARDS, ELEMENTS, KIND_NAME, REFINE_DMG } from '../data/rpg';
import { loadSave } from '../save';
import { jobForLevel } from './GameScene';
import { hex, isPortrait, isTouch, onResize, text } from '../ui';

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
  private bossBar!: Phaser.GameObjects.Graphics;
  private bossName!: Phaser.GameObjects.Text;
  private lastBoss = '';
  private statusText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private wingBtn!: Phaser.GameObjects.Text;
  private wingBg!: Phaser.GameObjects.Arc;
  private penaText!: Phaser.GameObjects.Text;
  private lastItems = '';
  private panel: Phaser.GameObjects.Container | null = null;

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
    this.lastBoss = '';
    this.lastItems = '';
    this.panel = null;

    this.bars = this.add.graphics();
    this.bossBar = this.add.graphics();
    this.bossName = text(this, width / 2, 0, '', 16 * k, '#ffd75a').setOrigin(0.5, 1).setVisible(false);
    this.levelText = text(this, width / 2, 9 * k, '', 14 * k).setOrigin(0.5);
    this.hpText = text(this, 26, 24 * k + 9 * k, '', 13 * k).setOrigin(0, 0.5);
    this.classText = text(this, 16, 50 * k, '', 18 * k);
    this.statusText = text(this, 16, 50 * k + 26 * k, '', 15 * k, '#c8a0ff');
    this.toastText = text(this, width / 2, height - 70 * k, '', 18 * k, '#ffffff').setOrigin(0.5).setAlpha(0)
      .setAlign('center').setWordWrapWidth(width - 40);
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

    // ---- itens: Asa (toque para usar) e Penas
    const ir = 30 * k;
    this.wingBg = this.add.circle(width - 16 - ir, height - 16 - ir, ir, 0x1a2a3a, 0.75).setStrokeStyle(2, 0x9fe6ff, 0.8);
    this.wingBtn = text(this, width - 16 - ir, height - 16 - ir, '', 13 * k, '#9fe6ff').setOrigin(0.5).setAlign('center');
    this.wingBg.setInteractive({ useHandCursor: true }).on('pointerup', () => this.game_.useWing());
    this.penaText = text(this, width - 16 - ir * 2 - 12, height - 16 - ir, '', 14 * k, '#fff0a0').setOrigin(1, 0.5);

    // ---- botões na tela (pausa e tela cheia) ----
    const btnY = 24 * k + 40 * k;
    const btnR = 26 * k;
    this.pauseIcon = this.button(width - 16 - btnR, btnY + btnR, btnR, 'II', () => this.togglePause());
    if (this.sys.game.device.fullscreen.available) {
      this.button(width - 16 - btnR * 3 - 12, btnY + btnR, btnR, '⛶', () => this.toggleFullscreen());
    }

    // se o jogo já estava pausado (ex.: HUD recriado ao girar o celular), mantém o aviso
    if (this.scene.isPaused('Game') && !this.scene.isActive('LevelUp')) {
      this.showStatusPanel();
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
      this.panel?.destroy();
      this.panel = null;
      this.pauseIcon.setText('II');
    } else {
      this.scene.pause('Game');
      this.showStatusPanel();
      this.pauseIcon.setText('▶');
    }
  }

  /** Janela de status (na pausa): atributos, cartas, equipamento e mascote */
  private showStatusPanel() {
    this.panel?.destroy();
    const g = this.game_;
    const { width, height } = this.scale;
    const portrait = height > width;
    const pw = Math.min(980, width - 30);
    const ph = Math.min(portrait ? 1100 : 560, height - 150);
    const c = this.add.container(width / 2, height / 2 + 20);
    c.add(this.add.rectangle(0, 0, pw, ph, 0x0b0e16, 0.94).setStrokeStyle(2, 0xffd04a, 0.7));
    c.add(text(this, 0, -ph / 2 + 24, 'PAUSADO  •  JANELA DE STATUS', 22, '#ffd04a').setOrigin(0.5));

    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const attrs = ATTR_IDS.map((a) => `${ATTRS[a].short}  ${String(g.attrs[a]).padStart(3)}   ${ATTRS[a].desc}`).join('\n');
    const derived = [
      `Crítico ${pct(g.critChance())}   Esquiva ${pct(g.evadeChance())}`,
      `Nível de classe ${g.jobLevel} (+${(g.jobLevel - 1) * 2}% de dano)`,
    ].join('\n');
    const cardCount = new Map<string, number>();
    for (const m of g.cards) cardCount.set(m, (cardCount.get(m) ?? 0) + 1);
    const cards = cardCount.size
      ? [...cardCount].map(([m, n]) => { const cd = CARDS.find((x) => x.monster === m)!; return `${cd.name}${n > 1 ? ` x${n}` : ''}: ${cd.desc}`; }).join('\n')
      : 'Nenhuma ainda. Monstros soltam cartas raras;\nos chefes sempre soltam a deles.';
    const save = loadSave();
    const skills = [...g.skills.values()].map((sk) => {
      const d = SKILLS[sk.id];
      return `${d.name} Nv${sk.level}: ${ELEMENTS[d.element].name}, ${KIND_NAME[d.kind].toLowerCase()}`;
    }).join('\n');
    const equip = [
      `Arma refinada +${save.refine} (+${Math.round(save.refine * REFINE_DMG * 100)}% de dano)`,
      `Mascote: ${g.pet ? `${g.pet.name}, ${g.pet.desc.toLowerCase()}` : 'nenhum (ovos caem dos monstros)'}`,
      `Asas: ${g.items.asa}   Penas: ${g.items.pena}   Zeny nesta partida: ${g.zenyRun}`,
      `Mapa: ${g.map.name}`,
    ].join('\n');

    const fs = portrait ? 17 : 14;
    const cols: [string, string, number][] = [
      ['ATRIBUTOS', `${attrs}\n\n${derived}`, 0xff9a6a],
      [`CARTAS (${g.cards.length})`, cards, 0x9ad0ff],
      ['HABILIDADES E EQUIPAMENTO', `${skills}\n\n${equip}`, 0x9ae8a0],
    ];
    if (portrait) {
      let y = -ph / 2 + 60;
      for (const [title, body, col] of cols) {
        c.add(text(this, -pw / 2 + 20, y, title, 18, hex(col)));
        const t = text(this, -pw / 2 + 20, y + 28, body, fs, '#e0e0e0').setWordWrapWidth(pw - 40).setLineSpacing(4);
        c.add(t);
        y += 40 + t.height + 16;
      }
    } else {
      const cw = (pw - 40) / 3;
      cols.forEach(([title, body, col], i) => {
        const x = -pw / 2 + 20 + i * cw;
        c.add(text(this, x, -ph / 2 + 60, title, 17, hex(col)));
        c.add(text(this, x, -ph / 2 + 88, body, fs, '#e0e0e0').setWordWrapWidth(cw - 16).setLineSpacing(4));
      });
    }
    c.add(text(this, 0, ph / 2 - 24, isTouch(this) ? 'Toque em ▶ para continuar' : 'P, ESC ou ▶ para continuar', 18, '#9fc3ff').setOrigin(0.5));
    this.panel = c;
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
    const jobPx = Math.round(width * Math.min(1, g.jobXp / jobForLevel(g.jobLevel)));
    const sig = `${xpPx}|${jobPx}|${g.jobLevel}|${hpPx}|${g.level}|${Math.ceil(g.hp)}|${g.stats.maxHp}|${g.classId}`;
    if (sig !== this.lastBars) {
      this.lastBars = sig;
      this.drawBars(xpPx, hpPx, hpPct, jobPx);
    }

    this.updateBossBar();

    const s = Math.floor(g.elapsed / 1000);
    if (s !== this.lastSecond) {
      this.lastSecond = s;
      this.timeText.setText(`${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`);
    }
    if (g.kills + g.zenyRun * 100000 !== this.lastKills) {
      this.lastKills = g.kills + g.zenyRun * 100000;
      this.killText.setText(`Abates: ${g.kills}   ${g.zenyRun} z`);
    }
    const items = `${g.items.asa}|${g.items.pena}`;
    if (items !== this.lastItems) {
      this.lastItems = items;
      this.wingBtn.setText(`Asa\nx${g.items.asa}`);
      this.wingBg.setAlpha(g.items.asa > 0 ? 1 : 0.4);
      this.wingBtn.setAlpha(g.items.asa > 0 ? 1 : 0.5);
      this.penaText.setText(g.items.pena > 0 ? `Pena x${g.items.pena}` : '');
    }
    const st = [g.elapsed < g.curseUntil ? 'Amaldiçoado' : '', g.elapsed < g.poisonUntil ? 'Envenenado' : ''].filter(Boolean).join('  •  ');
    if (st !== this.statusText.text) this.statusText.setText(st);
    let skills = '';
    for (const sk of g.skills.values()) skills += sk.id + sk.level;
    if (skills !== this.lastSkills) {
      this.lastSkills = skills;
      this.skillText.setText([...g.skills.values()].map((sk) => `${SKILLS[sk.id].name} Nv${sk.level}`).join('   •   '));
    }
  }

  private updateBossBar() {
    const boss = this.game_.boss;
    const alive = !!boss && boss.active;
    const pct = alive ? Phaser.Math.Clamp(boss!.hp / boss!.maxHp, 0, 1) : 0;
    const sig = alive ? `${boss!.def.id}|${Math.round(pct * 300)}` : '';
    if (sig === this.lastBoss) return;
    this.lastBoss = sig;
    const b = this.bossBar;
    b.clear();
    this.bossName.setVisible(alive);
    if (!alive) return;
    const { width } = this.scale;
    const k = this.k;
    const w = Math.min(520, width - 60);
    const y = this.timeText.y + this.timeText.height + 26 * k;
    this.bossName.setText(boss!.def.name).setPosition(width / 2, y - 2);
    b.fillStyle(0x000000, 0.65).fillRect(width / 2 - w / 2 - 3, y - 1, w + 6, 16 * k);
    b.fillStyle(0x8a1f2a).fillRect(width / 2 - w / 2, y + 2, w, 16 * k - 6);
    b.fillStyle(0xff4a5a).fillRect(width / 2 - w / 2, y + 2, w * pct, 16 * k - 6);
  }

  private drawBars(xpPx: number, hpPx: number, hpPct: number, jobPx: number) {
    const g = this.game_;
    const { width } = this.scale;
    const k = this.k;
    const b = this.bars;
    b.clear();

    // barra de XP (topo)
    b.fillStyle(0x000000, 0.6).fillRect(0, 0, width, 18 * k);
    b.fillStyle(0x3d8bff).fillRect(0, 0, xpPx, 14 * k);
    // nível de classe: faixa fina logo abaixo
    b.fillStyle(0x7ae0a0).fillRect(0, 14 * k, jobPx, 4 * k);
    this.levelText.setText(`Nível ${g.level}   •   Classe ${g.jobLevel}`);

    // barra de vida
    const barW = 260 * k;
    const barH = 18 * k;
    b.fillStyle(0x000000, 0.6).fillRect(16, 24 * k, barW, barH);
    b.fillStyle(hpPct > 0.3 ? 0xd63a3a : 0xff7a1a).fillRect(18, 24 * k + 2, hpPx, barH - 4);
    this.hpText.setText(`Vida ${Math.ceil(Math.max(0, g.hp))}/${g.stats.maxHp}`);

    // classe atual e próxima promoção
    const cls = CLASSES[g.classId];
    this.classText.setText(
      cls.id === 'aprendiz' ? `${cls.name}  →  profissão no Nv ${PROFESSION_LEVEL}`
        : cls.choices ? `${cls.name}  →  2ª classe no Nv ${SECOND_CLASS_LEVEL}` : `${cls.name}  (classe máxima)`,
    );
  }
}
