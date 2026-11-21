import Phaser from 'phaser';
import { MAX_REFINE, PETS, PET_EGG_COST, REFINE_DMG, SHOP, refineChance, refineCost } from '../data/rpg';
import { loadSave, writeSave } from '../save';
import { dim, isTouch, onResize, uiButton, uiPanel, uiScale, uiWindow, WIN, wtext } from '../ui';

/**
 * Loja e Ferreiro (entre partidas): melhorias permanentes, refino da arma
 * (com chance de falhar a partir do +5) e ovo de mascote.
 */
export class ShopScene extends Phaser.Scene {
  private message = '';
  /** Efeito a mostrar depois de um refino */
  private effect: '' | 'sucesso' | 'falha' = '';

  constructor() {
    super('Shop');
  }

  create() {
    const { width, height } = this.scale;
    const save = loadSave();
    const touch = isTouch(this);
    const k = uiScale(this);
    this.add.tileSprite(0, 0, width, height, 'grama').setOrigin(0);
    dim(this, 0.45);

    const portrait = height > width;
    const w = Math.min(820, width - 20);
    const rowH = (portrait ? 64 : 48) * k * (portrait ? 0.85 : 1);
    const rowsN = SHOP.length + 2;
    const msgH = 24 * k;
    const h = Math.min(height - 20, 24 * k + 2 + 34 * k + rowsN * rowH + msgH + 54 * k);
    const win = uiWindow(this, (width - w) / 2, (height - h) / 2, w, h, `Loja e Ferreiro   •   Zeny: ${save.zeny} z`, k);
    const c = win.c;
    const pad = 12;

    c.add(wtext(this, pad + 2, win.top + 8, 'Melhorias permanentes: valem para todas as próximas partidas.', 12 * k, WIN.label));
    const listTop = win.top + 34 * k;
    c.add(uiPanel(this, pad, listTop, w - pad * 2, rowsN * rowH + 4));
    let i = 0;
    const btnW = 130 * k;

    const row = (title: string, desc: string, price: string, enabled: boolean, onBuy: () => void) => {
      const y = listTop + 2 + i * rowH;
      if (i % 2) c.add(this.add.rectangle(pad + 1, y, w - pad * 2 - 2, rowH, WIN.rowAlt).setOrigin(0));
      c.add(wtext(this, pad + 12, y + rowH * 0.32, title, 14 * k, WIN.text, true).setOrigin(0, 0.5));
      c.add(wtext(this, pad + 12, y + rowH * 0.7, desc, 11 * k, WIN.label).setOrigin(0, 0.5).setWordWrapWidth(w - pad * 2 - btnW - 40));
      c.add(uiButton(this, w - pad - 10 - btnW / 2, y + rowH / 2, btnW, rowH - 14, price, onBuy, { size: 13 * k, enabled }).c);
      i++;
    };

    // ---- melhorias permanentes
    for (const it of SHOP) {
      const lv = save.up[it.id] ?? 0;
      const maxed = lv >= it.max;
      const cost = it.cost(lv);
      row(
        `${it.name}  ${it.max > 1 ? `(${lv}/${it.max})` : lv ? '(comprado)' : ''}`,
        it.desc,
        maxed ? 'Máximo' : `${cost} z`,
        !maxed && save.zeny >= cost,
        () => {
          save.zeny -= cost;
          save.up[it.id] = lv + 1;
          writeSave(save);
          this.message = `${it.name} melhorado!`;
          this.scene.restart();
        },
      );
    }

    // ---- ovo de mascote
    const petNames = Object.values(PETS);
    row(
      'Ovo de Mascote',
      `Choca um mascote aleatório${save.pet ? ` (atual: ${PETS[save.pet]?.name})` : ''}.`,
      `${PET_EGG_COST} z`,
      save.zeny >= PET_EGG_COST,
      () => {
        save.zeny -= PET_EGG_COST;
        const pet = petNames[Math.floor(Math.random() * petNames.length)];
        save.pet = pet.id;
        writeSave(save);
        this.message = `Nasceu: ${pet.name}! ${pet.desc}`;
        this.scene.restart();
      },
    );

    // ---- ferreiro: refino da arma
    const next = save.refine + 1;
    const canRefine = save.refine < MAX_REFINE;
    const chance = refineChance(next);
    row(
      `Ferreiro: refinar arma +${save.refine} → +${next}`,
      canRefine
        ? `+${Math.round(REFINE_DMG * 100)}% de dano por nível. Chance: ${Math.round(chance * 100)}%${next >= 5 ? '. Se falhar, volta a +0!' : ''}`
        : 'Arma no refino máximo.',
      canRefine ? `${refineCost(next)} z` : 'Máximo',
      canRefine && save.zeny >= refineCost(next),
      () => {
        save.zeny -= refineCost(next);
        if (Math.random() < chance) {
          save.refine = next;
          this.message = `Sucesso! Arma +${next}.`;
          this.effect = 'sucesso';
        } else {
          save.refine = 0;
          this.message = 'Falhou... a arma quebrou e o refino voltou a +0.';
          this.effect = 'falha';
        }
        writeSave(save);
        this.scene.restart();
      },
    );

    if (this.effect === 'sucesso') this.cameras.main.flash(350, 255, 230, 120);
    if (this.effect === 'falha') this.cameras.main.shake(350, 0.012);
    this.effect = '';
    const msgY = listTop + rowsN * rowH + 8 + msgH / 2;
    if (this.message) {
      const m = wtext(this, w / 2, msgY, this.message, 13 * k, this.message.startsWith('Falhou') ? WIN.bad : WIN.good, true).setOrigin(0.5);
      c.add(m);
      this.tweens.add({ targets: m, alpha: 0, delay: 2600, duration: 600 });
      this.message = '';
    }

    c.add(uiButton(this, w / 2, h - 12 - 18 * k, 180 * k, 34 * k, touch ? 'Voltar' : 'Voltar  [Esc]', () => this.scene.start('Menu'), { size: 14 * k, primary: true }).c);
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('Menu'));
    onResize(this, () => this.scene.restart());
  }
}
