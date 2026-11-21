import Phaser from 'phaser';
import { MAX_REFINE, PETS, PET_EGG_COST, REFINE_DMG, SHOP, refineChance, refineCost } from '../data/rpg';
import { loadSave, writeSave } from '../save';
import { isTouch, onResize, text } from '../ui';

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
    this.add.tileSprite(0, 0, width, height, 'grama').setOrigin(0).setAlpha(0.35);
    this.add.rectangle(0, 0, width, height, 0x0b0f14, 0.6).setOrigin(0);

    const portrait = height > width;
    const top = portrait ? 60 : 30;
    text(this, width / 2, top, 'LOJA E FERREIRO', 40, '#ffd04a').setOrigin(0.5);
    text(this, width / 2, top + 40, `Zeny: ${save.zeny} z`, 22, '#ffe36a').setOrigin(0.5);

    const rowW = Math.min(760, width - 30);
    const rowH = portrait ? 66 : 50;
    const fs = portrait ? 18 : 16;
    let y = top + 82;

    const row = (title: string, desc: string, price: string, enabled: boolean, onBuy: () => void, color = 0x9fc3ff) => {
      const cy = y + rowH / 2;
      const bg = this.add.rectangle(width / 2, cy, rowW, rowH - 6, 0x151a24, 0.92).setStrokeStyle(1, color, 0.6);
      text(this, width / 2 - rowW / 2 + 14, cy - (portrait ? 13 : 9), title, fs + 1, '#ffffff').setOrigin(0, 0.5);
      text(this, width / 2 - rowW / 2 + 14, cy + (portrait ? 13 : 11), desc, fs - 3, '#b8c0d0').setOrigin(0, 0.5)
        .setWordWrapWidth(rowW - 200);
      const bw = 160;
      const btn = this.add.rectangle(width / 2 + rowW / 2 - bw / 2 - 8, cy, bw, rowH - 16, enabled ? 0x2a5a2a : 0x2a2a2a, 1)
        .setStrokeStyle(2, enabled ? 0x9aff8a : 0x555555);
      text(this, btn.x, cy, price, fs, enabled ? '#ffffff' : '#777777').setOrigin(0.5);
      if (enabled) btn.setInteractive({ useHandCursor: true }).on('pointerup', onBuy);
      bg.setDepth(-1);
      y += rowH;
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
      `Choca um mascote aleatório${save.pet ? ` (atual: ${PETS[save.pet]?.name})` : ''}. Ele segue você nas partidas.`,
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
      0xf08ab0,
    );

    // ---- ferreiro: refino da arma
    const next = save.refine + 1;
    const canRefine = save.refine < MAX_REFINE;
    const chance = refineChance(next);
    row(
      `Refinar arma: +${save.refine} → +${next}`,
      canRefine
        ? `+${Math.round(REFINE_DMG * 100)}% de dano por nível. Chance: ${Math.round(chance * 100)}%${next >= 5 ? '. Se falhar, a arma volta a +0!' : ''}`
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
      0xffd04a,
    );

    if (this.effect === 'sucesso') this.cameras.main.flash(350, 255, 230, 120);
    if (this.effect === 'falha') this.cameras.main.shake(350, 0.012);
    this.effect = '';
    if (this.message) {
      const m = text(this, width / 2, y + 22, this.message, 18, this.message.startsWith('Falhou') ? '#ff8a7a' : '#9aff8a').setOrigin(0.5).setAlign('center').setWordWrapWidth(width - 40);
      this.tweens.add({ targets: m, alpha: 0, delay: 2600, duration: 600 });
      this.message = '';
    }

    const backY = height - (portrait ? 50 : 34);
    const back = this.add.rectangle(width / 2, backY, 240, 46, 0x151a24, 0.95).setStrokeStyle(2, 0x9fc3ff);
    text(this, width / 2, backY, touch ? 'Voltar' : 'Voltar  [ESC]', 22, '#9fc3ff').setOrigin(0.5);
    back.setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start('Menu'));
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('Menu'));
    onResize(this, () => this.scene.restart());
  }
}
