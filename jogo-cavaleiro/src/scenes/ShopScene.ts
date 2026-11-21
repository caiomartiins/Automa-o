import Phaser from 'phaser';
import { MAX_REFINE, REFINE_DMG, refineChance, refineCost } from '../data/rpg';
import { EQUIPMENT, ITEM_SLOT_NAME, describe, equipById, slotsFor, type ItemSlot, type Slot } from '../data/equipment';
import { loadSave, writeSave } from '../save';
import { dim, isPortrait, isTouch, onResize, uiButton, uiPanel, uiScale, uiWindow, WIN, wtext } from '../ui';

const CATEGORIES: ItemSlot[] = ['arma', 'cabeca', 'corpo', 'escudo', 'capa', 'calcado', 'acessorio'];

/**
 * Loja de equipamentos (entre partidas): o zeny serve para comprar equipamento.
 * O que estiver equipado vale em todas as próximas partidas. O Ferreiro refina a arma.
 */
export class ShopScene extends Phaser.Scene {
  private message = '';
  private effect: '' | 'sucesso' | 'falha' = '';
  private cat: ItemSlot = 'arma';

  constructor() {
    super('Shop');
  }

  create() {
    const { width, height } = this.scale;
    const save = loadSave();
    const touch = isTouch(this);
    const portrait = isPortrait(this);
    const k = uiScale(this);
    this.add.tileSprite(0, 0, width, height, 'grama').setOrigin(0);
    dim(this, 0.45);

    const w = Math.min(860 * (portrait ? 1 : k), width - 16);
    const h = height - 16;
    const win = uiWindow(this, (width - w) / 2, 8, w, h, `Loja de Equipamentos   •   Zeny: ${save.zeny} z`, k);
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
        c.add(uiButton(this, bx, by, tw, tabH, ITEM_SLOT_NAME[cat], () => this.pick(cat), { size: 12 * k, primary: cat === this.cat }).c);
      });
      listY += 2 * (tabH + 6) + 4;
    } else {
      const tw = 130 * k;
      CATEGORIES.forEach((cat, i) => {
        c.add(uiButton(this, pad + tw / 2, listY + i * (tabH + 6) + tabH / 2, tw, tabH, ITEM_SLOT_NAME[cat], () => this.pick(cat), { size: 13 * k, primary: cat === this.cat }).c);
      });
      listX = pad + tw + 10;
    }

    // ---- itens da categoria
    const refineH = 58 * k;
    const bottomH = 44 * k;
    const listW = w - listX - pad;
    const listH = h - (listY - 0) - refineH - bottomH - 22;
    c.add(uiPanel(this, listX, listY, listW, listH));
    const items = EQUIPMENT.filter((e) => e.slot === this.cat);
    const rowH = Math.min(58 * k, (listH - 8) / Math.max(items.length, 1));
    const icon = 30 * k;
    const btnW = 120 * k;
    items.forEach((item, i) => {
      const ry = listY + 4 + i * rowH;
      const cy = ry + rowH / 2;
      if (i % 2) c.add(this.add.rectangle(listX + 1, ry, listW - 2, rowH, WIN.rowAlt).setOrigin(0));
      c.add(this.add.rectangle(listX + 10 + icon / 2, cy, icon + 4, icon + 4, 0xdde6f3).setStrokeStyle(1, WIN.panelBorder));
      c.add(this.add.image(listX + 10 + icon / 2, cy, item.icon).setDisplaySize(icon, icon).setTint(item.tint));
      const tx = listX + 20 + icon;
      c.add(wtext(this, tx, cy - 9 * k, item.name, 14 * k, WIN.text, true).setOrigin(0, 0.5));
      c.add(wtext(this, tx, cy + 10 * k, describe(item.stats), 11 * k, WIN.label).setOrigin(0, 0.5).setWordWrapWidth(listW - icon - btnW - 50));

      const owned = save.owned.includes(item.id);
      const slots = slotsFor(item.slot);
      const equippedIn = slots.find((s) => save.equip[s] === item.id);
      let label: string;
      let enabled = true;
      let primary = false;
      let action: () => void;
      if (!owned) {
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
    c.add(uiPanel(this, pad, ry, w - pad * 2, refineH));
    const weapon = equipById(save.equip.arma);
    const next = save.refine + 1;
    const canRefine = !!weapon && save.refine < MAX_REFINE;
    const chance = refineChance(next);
    c.add(wtext(this, pad + 12, ry + refineH * 0.32, weapon ? `Ferreiro: refinar ${weapon.name} +${save.refine} → +${next}` : 'Ferreiro: equipe uma arma para refinar', 14 * k, WIN.text, true).setOrigin(0, 0.5));
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
    c.add(uiButton(this, w - pad - 90 * k, by, 170 * k, 34 * k, touch ? 'Voltar' : 'Voltar  [Esc]', () => this.scene.start('Menu'), { size: 14 * k, primary: true }).c);
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('Menu'));
    onResize(this, () => this.scene.restart());
  }

  private pick(cat: ItemSlot) {
    this.cat = cat;
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
