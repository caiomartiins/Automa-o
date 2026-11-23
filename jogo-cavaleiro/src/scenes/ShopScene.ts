import Phaser from 'phaser';
import { MAX_REFINE, REFINE_DMG, refineChance, refineCost } from '../data/rpg';
import { COLLECTION, EQUIPMENT, ITEM_SLOT_NAME, SETS, activeSets, describe, equipById, slotsFor, type ItemSlot, type Slot } from '../data/equipment';
import { ENEMIES, BAFOME, MINOTAURO, ZUMBI, LICH, ARANHA } from '../data/enemies';
import { loadSave, writeSave } from '../save';
import type { GameScene } from './GameScene';
import { dim, isPortrait, isTouch, onResize, uiButton, uiPanel, uiScale, uiWindow, WIN, wtext } from '../ui';

type Cat = ItemSlot | 'colecao';
const CATEGORIES: Cat[] = ['arma', 'cabeca', 'corpo', 'escudo', 'capa', 'calcado', 'acessorio', 'colecao'];
const CAT_NAME = (c: Cat) => (c === 'colecao' ? 'Coleção' : ITEM_SLOT_NAME[c]);
/** Nome do monstro que solta um item raro */
const MONSTER_NAME = (id: string) => [...ENEMIES, BAFOME, MINOTAURO, ZUMBI, LICH, ARANHA].find((m) => m.id === id)?.name ?? id;

/**
 * Loja de equipamentos (entre partidas): o zeny serve para comprar equipamento.
 * O que estiver equipado vale em todas as próximas partidas. O Ferreiro refina a arma.
 */
export class ShopScene extends Phaser.Scene {
  private message = '';
  private effect: '' | 'sucesso' | 'falha' = '';
  private cat: Cat = 'arma';
  /** Página da lista de itens */
  private page = 0;
  /** Aberta no meio da partida (a cada 10 níveis): volta ao jogo em vez do menu */
  private inRun = false;

  constructor() {
    super('Shop');
  }

  init(data?: { inRun?: boolean }) {
    if (data && 'inRun' in data) this.inRun = !!data.inRun;
  }

  create() {
    const { width, height } = this.scale;
    const save = loadSave();
    const touch = isTouch(this);
    const portrait = isPortrait(this);
    const k = uiScale(this);
    if (!this.inRun) this.add.tileSprite(0, 0, width, height, 'grama').setOrigin(0);
    dim(this, this.inRun ? 0.6 : 0.45);

    const w = Math.min(860 * (portrait ? 1 : k), width - 16);
    const h = height - 16;
    const win = uiWindow(this, (width - w) / 2, 8, w, h, `${this.inRun ? 'Loja (nível ' + (this.scene.get('Game') as GameScene).level + ')' : 'Loja de Equipamentos'}   •   Zeny: ${save.zeny} z`, k);
    const c = win.c;
    const pad = 10;

    // ---- categorias: coluna à esquerda (deitado) ou duas linhas em cima (em pé)
    const tabH = 30 * k;
    let listX = pad;
    let listY = win.top + 8;
    if (portrait) {
      const perRow = 4;
      const tw = (w - pad * 2 - (perRow - 1) * 6) / perRow;
      CATEGORIES.forEach((cat, i) => {
        const bx = pad + (i % perRow) * (tw + 6) + tw / 2;
        const by = listY + Math.floor(i / perRow) * (tabH + 6) + tabH / 2;
        c.add(uiButton(this, bx, by, tw, tabH, CAT_NAME(cat), () => this.pick(cat), { size: 12 * k, primary: cat === this.cat }).c);
      });
      listY += 2 * (tabH + 6) + 4;
    } else {
      const tw = 130 * k;
      CATEGORIES.forEach((cat, i) => {
        c.add(uiButton(this, pad + tw / 2, listY + i * (tabH + 6) + tabH / 2, tw, tabH, CAT_NAME(cat), () => this.pick(cat), { size: 13 * k, primary: cat === this.cat }).c);
      });
      listX = pad + tw + 10;
    }

    // ---- itens da categoria
    // na aba Coleção o Ferreiro some (sobra espaço para a lista)
    const showRefine = this.cat !== 'colecao';
    const refineH = showRefine ? 58 * k : -8;
    const bottomH = 44 * k;
    const listW = w - listX - pad;
    const listH = h - (listY - 0) - refineH - bottomH - 22;
    c.add(uiPanel(this, listX, listY, listW, listH));
    if (this.cat === 'colecao') this.buildCollection(c, listX, listY, listW, listH, k);
    const cat = this.cat;
    const all = cat === 'colecao' ? [] : EQUIPMENT.filter((e) => e.slot === cat);
    // páginas: linhas de no mínimo 50 (x escala) de altura
    const pagerH = 30 * k;
    const perPage = Math.max(1, Math.floor((listH - 8 - pagerH) / (50 * k)));
    const pages = Math.max(1, Math.ceil(all.length / perPage));
    this.page = Math.min(this.page, pages - 1);
    const items = all.slice(this.page * perPage, (this.page + 1) * perPage);
    const rowH = Math.min(58 * k, (listH - 8 - (pages > 1 ? pagerH : 0)) / Math.max(items.length, 1));
    if (pages > 1) {
      const py = listY + listH - pagerH / 2 - 4;
      c.add(uiButton(this, listX + listW / 2 - 90 * k, py, 70 * k, pagerH - 4, '◀', () => { this.page--; this.scene.restart(); }, { size: 13 * k, enabled: this.page > 0 }).c);
      c.add(wtext(this, listX + listW / 2, py, `${this.page + 1} / ${pages}`, 13 * k, WIN.label, true).setOrigin(0.5));
      c.add(uiButton(this, listX + listW / 2 + 90 * k, py, 70 * k, pagerH - 4, '▶', () => { this.page++; this.scene.restart(); }, { size: 13 * k, enabled: this.page < pages - 1 }).c);
    }
    const icon = 30 * k;
    const btnW = 120 * k;
    items.forEach((item, i) => {
      const ry = listY + 4 + i * rowH;
      const cy = ry + rowH / 2;
      if (i % 2) c.add(this.add.rectangle(listX + 1, ry, listW - 2, rowH, WIN.rowAlt).setOrigin(0));
      c.add(this.add.rectangle(listX + 10 + icon / 2, cy, icon + 4, icon + 4, 0xdde6f3).setStrokeStyle(1, WIN.panelBorder));
      c.add(this.add.image(listX + 10 + icon / 2, cy, item.icon).setDisplaySize(icon, icon).setTint(item.tint));
      const tx = listX + 20 + icon;
      const owned0 = save.owned.includes(item.id);
      const nameCol = item.glow ? '#c0186a' : item.drop ? '#7a2ab0' : item.epic ? '#1a6ad0' : item.legend ? WIN.gold : WIN.text;
      const tag = item.glow ? '  ✦ mítica (brilha)' : item.drop ? '  ★ raro' : item.epic ? '  ◆ épico' : item.legend ? '  ★ lendário' : '';
      c.add(wtext(this, tx, cy - 9 * k, item.name + tag, 14 * k, nameCol, true).setOrigin(0, 0.5));
      // ícone das míticas pulsando
      if (item.glow && owned0) {
        const halo = this.add.rectangle(listX + 10 + icon / 2, cy, icon + 6, icon + 6).setStrokeStyle(2, item.glow);
        c.add(halo);
        this.tweens.add({ targets: halo, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
      }
      c.add(wtext(this, tx, cy + 10 * k, describe(item.stats), 11 * k, WIN.label).setOrigin(0, 0.5).setWordWrapWidth(listW - icon - btnW - 50));

      const owned = save.owned.includes(item.id);
      const slots = slotsFor(item.slot);
      const equippedIn = slots.find((s) => save.equip[s] === item.id);
      let label: string;
      let enabled = true;
      let primary = false;
      let action: () => void;
      if (!owned && item.drop) {
        // raro: não vende; mostra de onde cai
        label = `Cai: ${MONSTER_NAME(item.drop.monster)}`;
        enabled = false;
        action = () => {};
      } else if (!owned) {
        label = `Comprar ${item.price} z`;
        enabled = save.zeny >= item.price;
        action = () => {
          save.zeny -= item.price;
          save.owned.push(item.id);
          this.equipItem(save, item.id, slots);
          writeSave(save);
          this.message = `Comprou e equipou: ${item.name}!`;
          this.scene.restart();
        };
      } else if (equippedIn) {
        label = 'Equipado ✓';
        primary = true;
        action = () => {
          if (equippedIn === 'arma') {
            save.refines[item.id] = save.refine;
            save.refine = 0;
          }
          delete save.equip[equippedIn];
          writeSave(save);
          this.message = `${item.name} desequipado.`;
          this.scene.restart();
        };
      } else {
        label = 'Equipar';
        action = () => {
          this.equipItem(save, item.id, slots);
          writeSave(save);
          this.message = `${item.name} equipado!`;
          this.scene.restart();
        };
      }
      c.add(uiButton(this, listX + listW - 10 - btnW / 2, cy, btnW, Math.min(32 * k, rowH - 8), label, action, { size: 12 * k, enabled, primary }).c);
    });

    // ---- ferreiro
    const ry = listY + listH + 8;
    if (showRefine) c.add(uiPanel(this, pad, ry, w - pad * 2, refineH));
    const weapon = equipById(save.equip.arma);
    const next = save.refine + 1;
    const canRefine = !!weapon && save.refine < MAX_REFINE;
    const chance = refineChance(next);
    if (showRefine) {
      const refineTitle = wtext(this, pad + 12, ry + refineH * 0.32, weapon ? `Ferreiro: refinar ${weapon.name} +${save.refine} → +${next}` : 'Ferreiro: equipe uma arma para refinar', 14 * k, WIN.text, true).setOrigin(0, 0.5);
      // não encosta no botão: diminui a letra se o nome da arma for comprido
      const maxTitleW = w - pad * 2 - btnW - 40;
      if (refineTitle.width > maxTitleW) refineTitle.setFontSize(14 * k * Math.max(0.7, maxTitleW / refineTitle.width));
      c.add(refineTitle);
      c.add(wtext(this, pad + 12, ry + refineH * 0.7, canRefine
        ? `+${Math.round(REFINE_DMG * 100)}% de dano por nível. Chance: ${Math.round(chance * 100)}%${next >= 5 ? '. Se falhar, volta a +0!' : ''}`
        : weapon ? 'Arma no refino máximo.' : 'O refino vale para a arma equipada.', 11 * k, WIN.label).setOrigin(0, 0.5));
      c.add(uiButton(this, w - pad - 10 - btnW / 2, ry + refineH / 2, btnW, 32 * k, canRefine ? `${refineCost(next)} z` : '—', () => {
        save.zeny -= refineCost(next);
        if (Math.random() < chance) {
          save.refine = next;
          this.message = `Sucesso! ${weapon!.name} +${next}.`;
          this.effect = 'sucesso';
        } else {
          save.refine = 0;
          this.message = 'Falhou... o refino voltou a +0.';
          this.effect = 'falha';
        }
        writeSave(save);
        this.scene.restart();
      }, { size: 12 * k, enabled: canRefine && save.zeny >= refineCost(next) }).c);
    }

    // ---- mensagem e voltar
    if (this.effect === 'sucesso') this.cameras.main.flash(350, 255, 230, 120);
    if (this.effect === 'falha') this.cameras.main.shake(350, 0.012);
    this.effect = '';
    const by = h - 10 - bottomH / 2;
    if (this.message) {
      const m = wtext(this, pad + 12, by, this.message, 13 * k, this.message.startsWith('Falhou') ? WIN.bad : WIN.good, true).setOrigin(0, 0.5);
      c.add(m);
      this.tweens.add({ targets: m, alpha: 0, delay: 2600, duration: 600 });
      this.message = '';
    }
    const back = () => (this.inRun ? this.backToGame() : this.scene.start('Menu'));
    const label = this.inRun ? (touch ? 'Voltar à partida' : 'Voltar à partida [Esc]') : (touch ? 'Voltar' : 'Voltar  [Esc]');
    c.add(uiButton(this, w - pad - 100 * k, by, 190 * k, 34 * k, label, back, { size: 14 * k, primary: true }).c);
    this.input.keyboard?.once('keydown-ESC', back);
    onResize(this, () => this.scene.restart());
  }

  /** Volta à partida aplicando o equipamento novo */
  private backToGame() {
    const g = this.scene.get('Game') as GameScene;
    g.reapplyEquipment();
    this.scene.stop();
    this.scene.resume('Game');
    g.closeLevelScreens();
    g.events.emit('status-closed');
  }

  /** Aba Coleção: itens que você já tem, metas com bônus e conjuntos */
  private buildCollection(c: Phaser.GameObjects.Container, x: number, y: number, w: number, h: number, k: number) {
    const save = loadSave();
    const have = new Set(save.owned);
    const n = EQUIPMENT.filter((e) => have.has(e.id)).length;
    let cy = y + 10;
    c.add(wtext(this, x + 12, cy, `Coleção: ${n} / ${EQUIPMENT.length} itens`, 15 * k, WIN.accent, true));
    cy += 24 * k;
    // grade de ícones: os que faltam aparecem apagados
    const icon = 26 * k;
    const gap = 6;
    const perRow = Math.max(1, Math.floor((w - 24) / (icon + gap)));
    EQUIPMENT.forEach((e, i) => {
      const ix = x + 12 + (i % perRow) * (icon + gap) + icon / 2;
      const iy = cy + Math.floor(i / perRow) * (icon + gap) + icon / 2;
      const got = have.has(e.id);
      c.add(this.add.rectangle(ix, iy, icon + 2, icon + 2, got ? (e.glow ? 0xffe0f0 : e.drop ? 0xeedcff : e.epic ? 0xd8e8ff : e.legend ? 0xfff0c0 : 0xdde6f3) : 0xeef1f5).setStrokeStyle(e.glow ? 2 : 1, e.glow ?? WIN.panelBorder));
      const img = this.add.image(ix, iy, e.icon).setDisplaySize(icon - 2, icon - 2);
      if (got) img.setTint(e.tint);
      else img.setTint(0xb0b8c4).setAlpha(0.35);
      c.add(img);
    });
    cy += Math.ceil(EQUIPMENT.length / perRow) * (icon + gap) + 8;
    // metas da coleção
    c.add(wtext(this, x + 12, cy, 'Metas (bônus permanentes, mesmo sem equipar):', 13 * k, WIN.text, true));
    cy += 20 * k;
    const lines = COLLECTION.map((m) => `${n >= m.count ? '✓' : '○'} ${m.count} itens: ${m.desc}`).join('\n');
    const t1 = wtext(this, x + 16, cy, lines, 12 * k, WIN.text).setLineSpacing(3).setWordWrapWidth(w - 30);
    c.add(t1);
    cy += t1.height + 10;
    // conjuntos
    const on = new Set(activeSets(save.equip).map((st) => st.id));
    c.add(wtext(this, x + 12, cy, 'Conjuntos (equipe todas as peças):', 13 * k, WIN.text, true));
    cy += 20 * k;
    const setLines = SETS.map((st) => {
      const got = st.items.filter((id) => have.has(id)).length;
      const names = st.items.map((id) => equipById(id)!.name).join(' + ');
      return `${on.has(st.id) ? '✓ ATIVO' : `${got}/${st.items.length}`}  ${st.name}: ${names} → ${describe(st.bonus)}`;
    }).join('\n');
    const t2 = wtext(this, x + 16, cy, setLines, 11 * k, WIN.label).setLineSpacing(3).setWordWrapWidth(w - 30);
    c.add(t2);
    // se não couber, reduz a letra aos poucos (só o necessário)
    for (let f = 0.92; cy + t2.height > y + h - 6 && f >= 0.6; f -= 0.06) t2.setFontSize(11 * k * f);
  }

  private pick(cat: Cat) {
    this.cat = cat;
    this.page = 0;
    this.scene.restart();
  }

  /** Equipa no primeiro slot livre (acessórios têm dois); se não houver, troca o primeiro */
  private equipItem(save: ReturnType<typeof loadSave>, id: string, slots: Slot[]) {
    const free = slots.find((s) => !save.equip[s]) ?? slots[0];
    // cada arma guarda o próprio refino
    if (free === 'arma' && save.equip.arma !== id) {
      if (save.equip.arma) {
        save.refines[save.equip.arma] = save.refine;
        save.refine = save.refines[id] ?? 0;
      } else {
        // primeira arma: herda o refino que já existia (do save antigo, por exemplo)
        save.refine = save.refines[id] ?? save.refine;
      }
    }
    save.equip[free] = id;
  }
}
