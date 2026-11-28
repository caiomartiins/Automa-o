import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import { CLASSES } from '../data/classes';
import { ATTRS, ATTR_IDS, CARDS } from '../data/rpg';
import { EQUIPMENT, SLOTS_LEFT, SLOTS_RIGHT, SLOT_NAME, activeSets, describe, equipById, type Slot } from '../data/equipment';
import { loadSave } from '../save';
import { heroScale } from '../sprites';
import { dim, headline, isTouch, onResize, uiButton, uiPanel, uiScale, uiWindow, WIN, wtext } from '../ui';

export interface StatusData {
  /** Aberta ao subir de nível ou pela pausa */
  reason: 'levelup' | 'pause' | 'start';
  tab?: 'geral' | 'especial';
}

/**
 * Janela "Equipamento" com a seção "Status" embaixo, no estilo das janelas
 * clássicas de RPG: slots dos dois lados, o personagem no meio, atributos com
 * o botão ▶ e o custo em pontos, e os valores calculados ao lado.
 */
export class StatusScene extends Phaser.Scene {
  private data_!: StatusData;

  constructor() {
    super('Status');
  }

  init(data: StatusData) {
    this.data_ = { tab: 'geral', ...data };
  }

  create() {
    const g = this.scene.get('Game') as GameScene;
    const { width, height } = this.scale;
    const k = uiScale(this);
    const touch = isTouch(this);
    const levelUp = this.data_.reason !== 'pause';
    const start = this.data_.reason === 'start';
    const portrait = height > width;
    // em pé, escurece mais o fundo para o título não embolar com o HUD
    dim(this, portrait ? 0.62 : 0.4);

    const w = Math.min(760 * k, width - 20);
    const pad = 10;
    const tabH = 26 * k;
    // linhas grandes para os botões de atributo; encolhe só se não couber na tela
    let slotH = 36 * k;
    let rowH = 42 * k;
    const derivedH = (r: number) => (portrait ? 6 * r * 0.72 + 8 : 0);
    const statHOf = (r: number) => 26 * k + r * 6 + 12 + derivedH(r);
    const fixed = 24 * k + 2 + 8 + 26 * k + 6 + 12 + 8 + 10 + 34 * k + 12 + (levelUp ? 44 * k : 0) + 12;
    const total = () => fixed + slotH * 4 + statHOf(rowH);
    // se não couber: primeiro encolhe os slots de equipamento, depois as linhas de atributo
    if (total() > height) slotH = Math.max(22 * k, (height - fixed - statHOf(rowH)) / 4);
    if (total() > height) {
      const f = Math.max(0.6, (height - fixed - slotH * 4) / statHOf(rowH));
      rowH *= f;
    }
    const eqH = slotH * 4 + 12;
    const statH = statHOf(rowH);
    const btnH = 34 * k;
    const bannerH = levelUp ? 44 * k : 0;
    const h = 24 * k + 2 + 8 + tabH + 6 + eqH + 8 + statH + 10 + btnH + 12;
    const x0 = (width - w) / 2;
    const y0 = Math.max(6 + bannerH, (height - h + bannerH) / 2);

    if (levelUp) {
      const msg = start ? `Distribua seus ${g.attrPoints} pontos iniciais!` : `NÍVEL ${g.level}!   Pontos de status: ${g.attrPoints}`;
      const t = headline(this, width / 2, y0 - bannerH / 2 - 2, msg, 24 * k, '#ffe9a0').setOrigin(0.5);
      this.tweens.add({ targets: t, scale: { from: 0.7, to: 1 }, duration: 300, ease: 'Back.Out' });
    }

    const win = uiWindow(this, x0, y0, w, h, 'Equipamento', k);
    const c = win.c;

    // ---- abas
    const tabW = Math.min(170 * k, (w - pad * 2 - 6) / 2);
    let y = win.top + 8;
    const tab = (i: number, label: string, id: 'geral' | 'especial') => {
      c.add(uiButton(this, pad + tabW / 2 + i * (tabW + 6), y + tabH / 2, tabW, tabH, label, () => {
        if (this.data_.tab !== id) this.scene.restart({ ...this.data_, tab: id });
      }, { size: 13 * k, primary: this.data_.tab === id }).c);
    };
    tab(0, 'Geral', 'geral');
    tab(1, 'Equip. Especial', 'especial');
    y += tabH + 6;

    // ---- área de equipamento
    c.add(uiPanel(this, pad, y, w - pad * 2, eqH));
    if (this.data_.tab === 'especial') this.buildSpecial(c, g, pad, y, w - pad * 2, eqH, k);
    else this.buildEquip(c, g, pad, y, w - pad * 2, eqH, slotH, k);
    y += eqH + 8;

    // ---- seção Status
    this.buildStatus(c, g, pad, y, w - pad * 2, statH, rowH, k, portrait);
    y += statH + 10;

    // ---- botões: com pontos a confirmar aparecem Desfazer / Confirmar; a árvore de habilidades fica ao lado
    const pending = g.hasPendingAttrs();
    const label = pending ? 'Confirme os pontos' : start ? (touch ? 'Começar' : 'Começar  [Espaço]') : levelUp ? (touch ? 'Continuar' : 'Continuar  [Espaço]') : (touch ? 'Voltar ao jogo' : 'Voltar ao jogo  [P]');
    const buttons: { label: string; fn: () => void; primary?: boolean; enabled?: boolean }[] = [];
    if (pending) {
      buttons.push({ label: 'Desfazer', fn: () => this.undo() });
      buttons.push({ label: 'Confirmar', fn: () => this.confirm(), primary: true });
    }
    buttons.push({ label, fn: () => this.close(), primary: !pending, enabled: !pending });
    const bw = Math.min(220 * k, (w - pad * 2 - 8 * (buttons.length - 1)) / buttons.length);
    buttons.forEach((b, i) => {
      const bx = w / 2 + (i - (buttons.length - 1) / 2) * (bw + 8);
      c.add(uiButton(this, bx, y + btnH / 2, bw, btnH, b.label, b.fn, { size: 14 * k, primary: b.primary, enabled: b.enabled ?? true }).c);
    });

    const kb = this.input.keyboard!;
    kb.once('keydown-SPACE', () => this.close());
    kb.once('keydown-ENTER', () => (g.hasPendingAttrs() ? this.confirm() : this.close()));
    onResize(this, () => this.scene.restart(this.data_));
  }

  /** Slots de equipamento dos dois lados e o personagem no meio */
  private buildEquip(c: Phaser.GameObjects.Container, g: GameScene, x: number, y: number, w: number, h: number, slotH: number, k: number) {
    const save = loadSave();
    const cls = CLASSES[g.classId];
    const midW = Math.min(150 * k, w * 0.26);
    const colW = (w - midW) / 2;
    const icon = 28 * k;

    // personagem no meio, sobre um fundo levemente azulado
    const mx = x + colW;
    c.add(this.add.rectangle(mx, y + 4, midW, h - 8, 0xeef3fa).setOrigin(0));
    const hs = (heroScale(cls.texture) / 0.5) * Math.min(1.1, (h - 20) / 175);
    c.add(this.add.sprite(mx + midW / 2, y + h / 2, cls.texture, 'idle0').setScale(hs).play(`${cls.texture}-idle`));

    const slot = (s: Slot, i: number, side: 'l' | 'r') => {
      const sy = y + 6 + i * slotH + slotH / 2;
      const item = equipById(save.equip[s]);
      const ix = side === 'l' ? x + 8 + icon / 2 : x + w - 8 - icon / 2;
      // moldura do ícone
      c.add(this.add.rectangle(ix, sy, icon + 4, icon + 4, 0xdde6f3).setStrokeStyle(1, WIN.panelBorder));
      const tx = side === 'l' ? ix + icon / 2 + 8 : ix - icon / 2 - 8;
      const origin = side === 'l' ? 0 : 1;
      if (item) {
        c.add(this.add.image(ix, sy, item.icon).setDisplaySize(icon, icon).setTint(item.tint));
        const refine = s === 'arma' && save.refine > 0 ? `+${save.refine} ` : '';
        c.add(wtext(this, tx, sy - 7 * k, `${refine}${item.name}`, 12 * k, WIN.text, true).setOrigin(origin, 0.5)
          .setWordWrapWidth(colW - icon - 24).setAlign(side === 'l' ? 'left' : 'right'));
        c.add(wtext(this, tx, sy + 8 * k, describe(item.stats), 10 * k, WIN.label).setOrigin(origin, 0.5)
          .setWordWrapWidth(colW - icon - 24).setAlign(side === 'l' ? 'left' : 'right'));
      } else {
        // slot vazio: nome do slot apagado, como na referência
        c.add(wtext(this, tx, sy, SLOT_NAME[s].toLowerCase(), 12 * k, '#a9bad6').setOrigin(origin, 0.5));
      }
    };
    SLOTS_LEFT.forEach((s, i) => slot(s, i, 'l'));
    SLOTS_RIGHT.forEach((s, i) => slot(s, i, 'r'));
  }

  /** Aba "Equip. Especial": mascote e cartas */
  private buildSpecial(c: Phaser.GameObjects.Container, g: GameScene, x: number, y: number, w: number, h: number, k: number) {
    c.add(wtext(this, x + 12, y + 8, 'Mascote', 13 * k, WIN.accent, true));
    if (g.pet) {
      c.add(this.add.sprite(x + 34 * k, y + 46 * k, g.pet.texture).setScale(0.45 * k).play(`${g.pet.texture}-move`));
      c.add(wtext(this, x + 64 * k, y + 36 * k, g.pet.name, 13 * k, WIN.text, true));
      c.add(wtext(this, x + 64 * k, y + 54 * k, g.pet.desc, 11 * k, WIN.label));
    } else {
      c.add(wtext(this, x + 12, y + 32 * k, 'nenhum (ovos caem dos monstros)', 12 * k, '#a9bad6'));
    }
    const cy = y + 78 * k;
    c.add(wtext(this, x + 12, cy, `Cartas (${g.cards.length})`, 13 * k, WIN.accent, true));
    const count = new Map<string, number>();
    for (const m of g.cards) count.set(m, (count.get(m) ?? 0) + 1);
    const lines = count.size
      ? [...count].map(([m, n]) => {
        const cd = CARDS.find((cc) => cc.monster === m)!;
        return `${cd.name}${n > 1 ? ` x${n}` : ''}: ${cd.desc}`;
      }).join('\n')
      : 'nenhuma ainda (raras nos monstros; os chefes sempre soltam a deles)';
    const cardTxt = wtext(this, x + 12, cy + 22 * k, lines, 11 * k, count.size ? WIN.text : '#a9bad6').setLineSpacing(3)
      .setWordWrapWidth(w - 24);
    c.add(cardTxt);
    // conjuntos ativos e coleção
    const save = loadSave();
    const sets = activeSets(save.equip);
    const owned = EQUIPMENT.filter((e) => save.owned.includes(e.id)).length;
    const sy = Math.min(y + h - 34 * k, cardTxt.y + cardTxt.height + 8);
    c.add(wtext(this, x + 12, sy, `Conjuntos: ${sets.length ? sets.map((st) => `${st.name} (${describe(st.bonus)})`).join('; ') : 'nenhum completo'}`, 11 * k, sets.length ? WIN.good : WIN.label, true)
      .setWordWrapWidth(w - 24));
    c.add(wtext(this, x + 12, sy + 17 * k, `Coleção: ${owned}/${EQUIPMENT.length} itens (veja na Loja)`, 11 * k, WIN.label, true));
  }

  /** Seção "Status": atributos (valor, custo, botões +1 e +5) e os valores calculados */
  private buildStatus(c: Phaser.GameObjects.Container, g: GameScene, x: number, y: number, w: number, h: number, rowH: number, k: number, portrait: boolean) {
    const headH = 26 * k;
    const bar = this.add.graphics();
    bar.fillStyle(WIN.border).fillRect(x, y, w, headH);
    bar.fillStyle(0xd6e3f5).fillRect(x + 1, y + 1, w - 2, headH - 2);
    c.add(bar);
    c.add(wtext(this, x + 8, y + headH / 2, '▲  Status', 14 * k, '#1c2a46', true).setOrigin(0, 0.5));
    c.add(wtext(this, x + w - 8, y + headH / 2, 'Atributos sobem nas cartas ao upar', 12 * k, WIN.label, true).setOrigin(1, 0.5));
    const top = y + headH;
    c.add(uiPanel(this, x, top, w, h - headH));

    // ---- atributos: nome | valor (+bônus) | custo | +1 | +5
    const attrW = portrait ? w : Math.min(430 * k, w * 0.6);
    const btnH = Math.min(36 * k, rowH - 6);
    const btnW = Math.max(btnH * 1.25, 44 * k);
    ATTR_IDS.forEach((a, i) => {
      const ry = top + 6 + i * rowH + rowH / 2;
      if (i % 2) c.add(this.add.rectangle(x + 1, ry - rowH / 2, attrW - 2, rowH, WIN.rowAlt).setOrigin(0));
      c.add(this.add.rectangle(x + 6, ry, 5, rowH * 0.6, ATTRS[a].color).setOrigin(0, 0.5));
      c.add(wtext(this, x + 18, ry, ATTRS[a].short, 17 * k, WIN.text, true).setOrigin(0, 0.5));
      const vx = x + attrW * 0.3;
      const pend = g.pendingAttr(a);
      // valor em azul enquanto houver pontos ainda não confirmados
      c.add(wtext(this, vx, ry, String(g.attrs[a]), 19 * k, pend ? WIN.accent : WIN.text, true).setOrigin(1, 0.5));
      const bonus = g.bonusAttrs[a];
      if (bonus) c.add(wtext(this, vx + 4, ry, `+${bonus}`, 13 * k, WIN.good, true).setOrigin(0, 0.5));
      // barra do atributo (0 a 99): os pontos agora vêm das cartas ao upar
      const bx = x + attrW * 0.42;
      const bw = attrW - (bx - x) - 14;
      const bar = this.add.graphics();
      bar.fillStyle(0xdfe6f0).fillRect(bx, ry - 6 * k, bw, 12 * k);
      bar.fillStyle(ATTRS[a].color).fillRect(bx, ry - 6 * k, (bw * Math.min(99, g.attr(a))) / 99, 12 * k);
      c.add(bar);
    });

    // ---- valores calculados
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const archer = g.line === 'arqueiro';
    const eq = g.equipTotals;
    const [m0, m1] = g.matk();
    const left: [string, string][] = [
      // Paladino: mostra também o Atq pela VIT (escudo e sagradas)
      g.classId === 'paladino'
        ? ['Atq FOR / VIT', `${g.physAtk('melee')} / ${g.vitAtk()}${eq.atk ? ` + ${pct(eq.atk)}` : ''}`]
        : [archer ? 'Atq (DES)' : 'Atq (FOR)', `${g.physAtk(archer ? 'ranged' : 'melee')}${eq.atk ? ` + ${pct(eq.atk)}` : ''}`],
      ['Matq', `${m0}~${m1}${eq.matk ? ` + ${pct(eq.matk)}` : ''}`],
      ['HIT', `${g.hit()}`],
      ['Crítico', pct(g.critChance())],
      ['HP', `${Math.ceil(Math.max(0, g.hp))} / ${g.stats.maxHp}`],
      ['Nv classe', `${g.jobLevel}`],
    ];
    const right: [string, string][] = [
      ['Def', `${pct(g.hardDef())} + ${g.softDef()}`],
      ['Flee', `${g.flee()}`],
      ['Esq. perfeita', `${(g.perfectDodge() * 100).toFixed(1)}%`],
      ['Aspd', pct(g.stats.haste)],
      ['Mov', `${Math.round(g.stats.speed)}`],
      ['Zeny', `${g.zenyRun} z`],
    ];
    const dRow = portrait ? rowH * 0.72 : rowH;
    const dTop = portrait ? top + 6 + rowH * 6 + 6 : top + 6;
    const dx = portrait ? x : x + attrW;
    const colW = (w - (portrait ? 0 : attrW)) / 2;
    if (portrait) c.add(this.add.rectangle(x + 4, dTop - 3, w - 8, 1, WIN.panelBorder).setOrigin(0));
    const col = (rows: [string, string][], cx: number) => rows.forEach(([a, b], i) => {
      const ry = dTop + i * dRow + dRow / 2;
      c.add(wtext(this, cx + 10, ry, a, 13 * k, WIN.label, true).setOrigin(0, 0.5));
      c.add(wtext(this, cx + colW - 10, ry, b, 13 * k, WIN.text, true).setOrigin(1, 0.5));
    });
    col(left, dx);
    col(right, dx + colW);
    if (!portrait) c.add(this.add.rectangle(x + attrW, top + 4, 1, h - headH - 8, WIN.panelBorder).setOrigin(0));
    c.add(this.add.rectangle(dx + colW, dTop, 1, dRow * 6, WIN.panelBorder).setOrigin(0));
  }

  /** Confirma os pontos distribuídos */
  confirm() {
    const g = this.scene.get('Game') as GameScene;
    g.commitAttrs();
    this.scene.restart(this.data_);
  }

  /** Desfaz os pontos ainda não confirmados */
  undo() {
    const g = this.scene.get('Game') as GameScene;
    g.revertAttrs();
    this.scene.restart(this.data_);
  }

  /** Abre a árvore de habilidades (linha do Mago) */
  openTree() {
    this.scene.stop();
    this.scene.launch('SkillTree', { reason: this.data_.reason });
  }

  /** Fecha a janela e volta ao jogo (só depois de confirmar ou desfazer os pontos) */
  close() {
    const g = this.scene.get('Game') as GameScene;
    if (g.hasPendingAttrs()) return;
    this.scene.stop();
    // a cada 10 níveis, a loja abre antes de voltar ao jogo
    g.afterScreens();
  }
}
