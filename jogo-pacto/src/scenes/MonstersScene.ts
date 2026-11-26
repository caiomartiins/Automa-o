import Phaser from 'phaser';
import { ELEMENT_COLOR, ELEMENT_NAME } from '../data/types';
import { UNIT_BY_ID, maxLevel, statsAt, xpToNext } from '../data/units';
import { save } from '../save';
import { C, H, W, button, hex, panel, txt } from '../ui';
import { menuBackdrop, unitSprite } from './MenuScenes';
import { portraitCard } from './TeamScene';

export class MonstersScene extends Phaser.Scene {
  private selected?: string;

  constructor() { super('Monsters'); }

  init(data: { key?: string }) {
    this.selected = data.key ?? this.selected ?? save().team[0];
  }

  create() {
    menuBackdrop(this);
    const s = save();
    button(this, 74, 52, 120, 60, '◀ Voltar', () => this.scene.start('Hub'), 0x5a4570, 22);
    txt(this, W / 2 + 40, 52, 'Monstros', 38, hex(C.gold)).setOrigin(0.5);

    const u = s.units.find((x) => x.key === this.selected) ?? s.units[0];
    const def = UNIT_BY_ID[u.id];
    const st = statsAt(def, u.lv);
    const col = ELEMENT_COLOR[def.element];

    // ficha
    panel(this, 20, 100, W - 40, 700, C.panel, col, 18);
    const floor = this.add.graphics();
    floor.fillStyle(col, 0.12);
    floor.fillEllipse(150, 330, 220, 46);
    unitSprite(this, def.art, 150, 330, 1.3);
    this.add.image(300, 140, `el-${def.element}`).setDisplaySize(34, 34);
    txt(this, 324, 140, def.name, 30).setOrigin(0, 0.5);
    txt(this, 284, 180, `${'★'.repeat(def.stars)}  ${ELEMENT_NAME[def.element]} · ${def.role}`, 20, hex(C.gold)).setOrigin(0, 0.5);
    const cap = maxLevel(def.stars);
    txt(this, 284, 216, `Nível ${u.lv}/${cap}`, 22).setOrigin(0, 0.5);
    const bar = this.add.graphics();
    bar.fillStyle(0x000000, 0.6);
    bar.fillRoundedRect(284, 236, 380, 14, 6);
    bar.fillStyle(0x7fdcff, 1);
    bar.fillRoundedRect(284, 236, u.lv >= cap ? 380 : 380 * (u.xp / xpToNext(u.lv)), 14, 6);
    txt(this, 664, 262, u.lv >= cap ? 'Nível máximo' : `${u.xp}/${xpToNext(u.lv)} XP`, 15, C.dim).setOrigin(1, 0);

    const rows: [string, string][] = [
      ['Vida', `${st.hp}`], ['Ataque', `${st.atk}`], ['Defesa', `${st.def}`], ['Velocidade', `${st.spd}`],
      ['Crítico', `${Math.round(st.crate * 100)}%`], ['Dano crítico', `+${Math.round(st.cdmg * 100)}%`],
      ['Precisão', `${Math.round(st.acc * 100)}%`], ['Resistência', `${Math.round(st.res * 100)}%`],
    ];
    rows.forEach(([k, v], i) => {
      const x = 284 + (i % 2) * 196;
      const y = 296 + Math.floor(i / 2) * 30;
      txt(this, x, y, k, 17, C.dim);
      txt(this, x + 180, y, v, 17).setOrigin(1, 0);
    });

    def.skills.forEach((sk, i) => {
      const y = 430 + i * 122;
      const g = this.add.graphics();
      g.fillStyle(0x1b1628, 1);
      g.fillRoundedRect(36, y, W - 72, 112, 12);
      txt(this, 52, y + 10, `${i === 0 ? 'Básica' : `Habilidade ${i + 1}`} · ${sk.name}`, 21, hex(C.gold));
      txt(this, W - 52, y + 12, sk.cooldown ? `recarga ${sk.cooldown}` : '', 16, C.dim).setOrigin(1, 0);
      txt(this, 52, y + 42, sk.desc, 17, C.text, { wordWrap: { width: W - 110 }, strokeThickness: 2 });
    });

    // coleção
    const owned = [...s.units].sort((a, b) => UNIT_BY_ID[b.id].stars - UNIT_BY_ID[a.id].stars || b.lv - a.lv);
    const size = 92;
    owned.forEach((o, i) => {
      const x = 64 + (i % 6) * 118;
      const y = 870 + Math.floor(i / 6) * 112;
      if (y > H - 40) return;
      const card = portraitCard(this, x, y, size, o, { check: o.key === u.key });
      card.setInteractive({ useHandCursor: true });
      card.on('pointerup', () => this.scene.restart({ key: o.key }));
    });
  }
}
