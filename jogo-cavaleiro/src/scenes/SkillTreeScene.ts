import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import type { StatusData } from './StatusScene';
import { CLASSES, type ClassId } from '../data/classes';
import { SKILLS, type SkillId } from '../data/skills';
import { ELEMENTS } from '../data/rpg';
import { TREE, TREE_CLASSES, nodeColor, nodeMax, nodeName, treeNode, type TreeId, type TreeNode } from '../data/skilltree';
import { darken, dim, isTouch, onResize, uiButton, uiPanel, uiScale, uiWindow, WIN, wtext } from '../ui';

export interface SkillTreeData {
  /** Motivo da janela de Status que abriu a árvore (para voltar a ela) */
  reason: StatusData['reason'];
  tab?: ClassId;
  sel?: TreeId;
  /** Pontos colocados e ainda não confirmados */
  pending?: Partial<Record<TreeId, number>>;
}

/**
 * Árvore de habilidades no estilo clássico: 1 ponto por nível de classe.
 * Os pontos ficam pendentes até o jogador tocar em "Confirmar" (dá para desfazer antes).
 */
export class SkillTreeScene extends Phaser.Scene {
  private data_!: Required<SkillTreeData>;

  constructor() {
    super('SkillTree');
  }

  init(data: SkillTreeData) {
    const g = this.scene.get('Game') as GameScene;
    const tab = data.tab ?? (TREE_CLASSES.includes(g.classId) ? g.classId : 'mago');
    this.data_ = { reason: data.reason, tab, sel: data.sel ?? TREE.find((n) => n.cls === tab)!.id, pending: data.pending ?? {} };
  }

  private get g() {
    return this.scene.get('Game') as GameScene;
  }

  /** Nível contando o que ainda não foi confirmado */
  private level = (id: TreeId) => this.g.nodeLevel(id) + (this.data_.pending[id] ?? 0);

  private pendingTotal() {
    return Object.values(this.data_.pending).reduce((a, b) => a + (b ?? 0), 0);
  }

  private pointsLeft() {
    return this.g.skillPoints - this.pendingTotal();
  }

  private redraw(patch: Partial<SkillTreeData> = {}) {
    this.scene.restart({ ...this.data_, ...patch });
  }

  /** +1 ponto (pendente) na habilidade */
  addPoint(id: TreeId) {
    if (this.g.learnBlock(id, this.level, this.pointsLeft())) return false;
    this.data_.pending[id] = (this.data_.pending[id] ?? 0) + 1;
    this.redraw({ sel: id });
    return true;
  }

  /** Tira 1 ponto pendente (se nenhuma outra habilidade pendente depender dele) */
  removePoint(id: TreeId) {
    if (!this.canRemove(id)) return false;
    this.data_.pending[id]!--;
    if (!this.data_.pending[id]) delete this.data_.pending[id];
    this.redraw({ sel: id });
    return true;
  }

  private canRemove(id: TreeId) {
    if (!(this.data_.pending[id] ?? 0)) return false;
    const after = this.level(id) - 1;
    return !TREE.some((m) => (this.data_.pending[m.id] ?? 0) > 0 && m.req.some((r) => r.id === id && r.lv > after));
  }

  confirm() {
    const spent = this.g.learnTree(this.data_.pending);
    if (spent) this.g.events.emit('toast', `${spent} ponto${spent > 1 ? 's' : ''} de habilidade confirmado${spent > 1 ? 's' : ''}!`, '#9aff8a');
    this.redraw({ pending: {} });
  }

  undo() {
    this.redraw({ pending: {} });
  }

  create() {
    const g = this.g;
    const { width, height } = this.scale;
    const k = uiScale(this);
    const touch = isTouch(this);
    const portrait = height > width;
    dim(this, 0.45);

    const w = Math.min(860 * k, width - 20);
    const pad = 10;
    const tabH = 28 * k;
    const headH = 26 * k;
    const btnH = 36 * k;
    const gap = 8;
    let cardH = 92 * k;
    let detailH = (portrait ? 150 : 104) * k;
    const fixed = 24 * k + 2 + 8 + tabH + 6 + headH + 6 + 8 + 10 + btnH + 12 + 12;
    const total = () => fixed + cardH * 3 + gap * 2 + 12 + detailH;
    if (total() > height) {
      const f = Math.max(0.62, (height - fixed) / (cardH * 3 + gap * 2 + 12 + detailH));
      cardH *= f;
      detailH *= f;
    }
    const gridH = cardH * 3 + gap * 2 + 12;
    const h = 24 * k + 2 + 8 + tabH + 6 + headH + 6 + gridH + 8 + detailH + 10 + btnH + 12;
    const x0 = (width - w) / 2;
    const y0 = Math.max(6, (height - h) / 2);
    const win = uiWindow(this, x0, y0, w, h, 'Habilidades', k);
    const c = win.c;
    let y = win.top + 8;

    // ---- abas: Mago, Bruxo, Professor (as que não são suas aparecem como prévia)
    const tabW = (w - pad * 2 - 12) / 3;
    TREE_CLASSES.forEach((cls, i) => {
      const own = g.canUseTab(cls);
      const label = own ? CLASSES[cls].name : `${CLASSES[cls].name} (prévia)`;
      c.add(uiButton(this, pad + tabW / 2 + i * (tabW + 6), y + tabH / 2, tabW, tabH, label, () => {
        if (this.data_.tab !== cls) this.redraw({ tab: cls, sel: TREE.find((n) => n.cls === cls)!.id });
      }, { size: (own ? 14 : 12) * k, primary: this.data_.tab === cls }).c);
    });
    y += tabH + 6;

    // ---- cabeçalho com os pontos
    const bar = this.add.graphics();
    bar.fillStyle(WIN.border).fillRect(pad, y, w - pad * 2, headH);
    bar.fillStyle(0xd6e3f5).fillRect(pad + 1, y + 1, w - pad * 2 - 2, headH - 2);
    c.add(bar);
    c.add(wtext(this, pad + 8, y + headH / 2, `Nv de classe ${g.jobLevel}  (${CLASSES[g.classId].name})`, 13 * k, '#1c2a46', true).setOrigin(0, 0.5));
    const left = this.pointsLeft();
    c.add(wtext(this, w - pad - 8, y + headH / 2, `Pontos de habilidade: ${left}${this.pendingTotal() ? `  (${this.pendingTotal()} a confirmar)` : ''}`, 13 * k, left > 0 ? WIN.accent : WIN.label, true).setOrigin(1, 0.5));
    y += headH + 6;

    // ---- grade de habilidades
    c.add(uiPanel(this, pad, y, w - pad * 2, gridH));
    const nodes = TREE.filter((n) => n.cls === this.data_.tab);
    const cardW = (w - pad * 2 - 12 - gap * 2) / 3;
    const pos = (n: TreeNode) => ({ x: pad + 6 + n.col * (cardW + gap), y: y + 6 + n.row * (cardH + gap) });
    // linhas dos requisitos (por baixo dos cartões)
    const lines = this.add.graphics().lineStyle(3, 0x9fb6d8, 1);
    for (const n of nodes) {
      for (const r of n.req) {
        const from = nodes.find((m) => m.id === r.id);
        if (!from) continue;
        const a = pos(from);
        const b = pos(n);
        lines.lineBetween(a.x + cardW / 2, a.y + cardH / 2, b.x + cardW / 2, b.y + cardH / 2);
      }
    }
    c.add(lines);
    for (const n of nodes) this.card(c, n, pos(n).x, pos(n).y, cardW, cardH, k);
    y += gridH + 8;

    // ---- detalhes da habilidade escolhida
    this.details(c, treeNode(this.data_.sel), pad, y, w - pad * 2, detailH, k);
    y += detailH + 10;

    // ---- botões: Desfazer | Confirmar | Voltar
    const pending = this.pendingTotal() > 0;
    const bw = Math.min(200 * k, (w - pad * 2 - 16) / 3);
    const by = y + btnH / 2;
    c.add(uiButton(this, w / 2 - bw - 8, by, bw, btnH, 'Desfazer', () => this.undo(), { size: 14 * k, enabled: pending }).c);
    c.add(uiButton(this, w / 2, by, bw, btnH, pending ? `Confirmar (${this.pendingTotal()})` : 'Confirmar', () => this.confirm(), { size: 14 * k, primary: pending, enabled: pending }).c);
    c.add(uiButton(this, w / 2 + bw + 8, by, bw, btnH, pending ? 'Confirme antes' : touch ? 'Voltar' : 'Voltar  [Esc]', () => this.close(), { size: 13 * k, enabled: !pending, primary: !pending }).c);

    const kb = this.input.keyboard!;
    kb.once('keydown-ESC', () => this.close());
    kb.once('keydown-ENTER', () => (this.pendingTotal() ? this.confirm() : this.close()));
    onResize(this, () => this.redraw());
  }

  /** Cartão de uma habilidade: nome, nível, requisito e botões − / + */
  private card(c: Phaser.GameObjects.Container, n: TreeNode, x: number, y: number, w: number, h: number, k: number) {
    const g = this.g;
    const lv = this.level(n.id);
    const pend = this.data_.pending[n.id] ?? 0;
    const max = nodeMax(n);
    const block = g.learnBlock(n.id, this.level, this.pointsLeft());
    const reqOk = n.req.every((r) => this.level(r.id) >= r.lv);
    const sel = this.data_.sel === n.id;
    const color = nodeColor(n);

    const card = this.add.container(x, y);
    card.add(uiPanel(this, 0, 0, w, h, sel ? 0xe6f0ff : lv > 0 ? 0xffffff : 0xf4f6fa));
    if (sel) card.add(this.add.rectangle(w / 2, h / 2, w - 2, h - 2).setStrokeStyle(2, 0x2559b0));
    card.add(this.add.rectangle(1, 1, 6, h - 2, reqOk ? color : 0xc0c8d4).setOrigin(0));
    const zone = this.add.zone(0, 0, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => this.data_.sel !== n.id && this.redraw({ sel: n.id }));
    card.add(zone);

    const tx = 14;
    const nameCol = reqOk ? darken(color, 0.45) : WIN.muted;
    const name = wtext(this, tx, 5, nodeName(n), 14 * k, nameCol, true).setWordWrapWidth(w - tx - 6);
    // nome comprido demais para a largura: letra um pouco menor
    if (name.height > 24 * k) name.setFontSize(12 * k);
    card.add(name);
    const tag = n.passive ? 'passiva' : ELEMENTS[SKILLS[n.id as SkillId].element].name;
    const ly = 5 + name.height + 2;
    const lvTxt = wtext(this, tx, ly, `Nv ${lv}/${max}`, 13 * k, lv > 0 ? WIN.text : WIN.muted, true);
    card.add(lvTxt);
    if (pend) card.add(wtext(this, tx + lvTxt.width + 6, ly, `+${pend}`, 13 * k, WIN.good, true));
    card.add(wtext(this, w - 8, ly + 1, tag, 10 * k, WIN.muted).setOrigin(1, 0));

    const bs = Math.min(34 * k, h * 0.4);
    const by = h - bs / 2 - 6;
    if (!reqOk) {
      const miss = n.req.filter((r) => this.level(r.id) < r.lv).map((r) => `${nodeName(treeNode(r.id))} ${r.lv}`).join(', ');
      const ry = ly + lvTxt.height + 2;
      // cabe embaixo do nível sem encostar nos botões? senão fica à esquerda dos botões
      const free = h - bs - 8 - ry > 14 * k;
      const req = wtext(this, tx, free ? ry : by, `Requer: ${miss}`, 10 * k, WIN.bad).setOrigin(0, free ? 0 : 0.5)
        .setWordWrapWidth(free ? w - tx - 6 : w - tx - bs * 2 - 18);
      // não cabe sem encostar nos botões: mostra só o aviso (a lista aparece nos detalhes)
      if (free ? ry + req.height > h - bs - 8 : req.height > bs) req.setText('Faltam requisitos');
      card.add(req);
    }
    card.add(uiButton(this, w - 6 - bs * 1.5 - 6, by, bs, bs, '−', () => this.removePoint(n.id), { size: 18 * k, enabled: this.canRemove(n.id) }).c);
    card.add(uiButton(this, w - 6 - bs / 2, by, bs, bs, '+', () => this.addPoint(n.id), { size: 18 * k, enabled: !block, primary: !block }).c);
    c.add(card);
  }

  /** Painel de detalhes: o que a habilidade faz, o nível atual e o próximo */
  private details(c: Phaser.GameObjects.Container, n: TreeNode, x: number, y: number, w: number, h: number, k: number) {
    c.add(uiPanel(this, x, y, w, h));
    const lv = this.level(n.id);
    const max = nodeMax(n);
    const lines: string[] = [];
    let desc: string;
    if (n.passive) {
      desc = n.passive.desc;
      if (lv > 0) lines.push(`Agora (Nv ${lv}): ${n.passive.per(lv)}`);
      if (lv < max) lines.push(`Próximo (Nv ${lv + 1}): ${n.passive.per(lv + 1)}`);
    } else {
      const sk = SKILLS[n.id as SkillId];
      desc = `${sk.levelDesc[0]}  [${ELEMENTS[sk.element].name}, magia: dano pela INT]`;
      if (lv > 0 && lv < max) lines.push(`Próximo (Nv ${lv + 1}): ${sk.levelDesc[lv]}`);
      if (lv === 0) lines.push('Aprender: Nv 1');
    }
    if (lv >= max) lines.push('Nível máximo!');
    if (n.req.length) {
      lines.push(`Requisitos: ${n.req.map((r) => `${this.level(r.id) >= r.lv ? '✓' : '✗'} ${nodeName(treeNode(r.id))} ${r.lv}`).join('   ')}`);
    }
    const block = this.g.learnBlock(n.id, this.level, this.pointsLeft());
    if (block === `Só para ${CLASSES[n.cls].name}`) lines.push(`Prévia: disponível ao virar ${CLASSES[n.cls].name}.`);
    c.add(wtext(this, x + 10, y + 8, `${nodeName(n)}  (Nv ${lv}/${max})`, 15 * k, WIN.accent, true));
    c.add(wtext(this, x + 10, y + 8 + 24 * k, [desc, ...lines].join('\n'), 12 * k, WIN.text)
      .setLineSpacing(3).setWordWrapWidth(w - 20));
  }

  /** Volta para a janela de Status (que é quem devolve o controle ao jogo) */
  close() {
    if (this.pendingTotal()) return;
    this.scene.stop();
    this.scene.launch('Status', { reason: this.data_.reason });
  }
}
