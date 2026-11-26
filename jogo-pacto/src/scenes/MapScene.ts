import Phaser from 'phaser';
import { REGIONS, STAGES } from '../data/stages';
import { UNIT_BY_ID } from '../data/units';
import { save } from '../save';
import { C, W, button, hex, panel, txt } from '../ui';
import { menuBackdrop } from './MenuScenes';

export class MapScene extends Phaser.Scene {
  private region = 0;

  constructor() { super('Map'); }

  init(data: { region?: number }) {
    const s = save();
    if (data.region !== undefined) this.region = data.region;
    else {
      // abre na região da próxima fase a vencer
      const next = STAGES.find((st) => s.cleared[st.id] === undefined);
      this.region = next ? next.region : REGIONS.length - 1;
    }
  }

  create() {
    menuBackdrop(this);
    const s = save();
    button(this, 74, 52, 120, 60, '◀ Voltar', () => this.scene.start('Hub'), 0x5a4570, 22);
    txt(this, W / 2 + 40, 52, 'Campanha', 38, hex(C.gold)).setOrigin(0.5);

    // abas das regiões
    REGIONS.forEach((r, i) => {
      const first = STAGES.find((st) => st.region === i)!;
      const idx = STAGES.indexOf(first);
      const open = idx === 0 || s.cleared[STAGES[idx - 1].id] !== undefined;
      const b = button(this, 128 + i * 232, 140, 220, 66, open ? `${i + 1}. ${r.name.split(' ')[0]}` : '🔒', () => {
        if (open) this.scene.restart({ region: i });
      }, i === this.region ? 0x7a4fd6 : 0x332a4c, 22);
      if (!open) b.setEnabled(false);
    });
    const reg = REGIONS[this.region];
    txt(this, W / 2, 210, reg.name, 32).setOrigin(0.5);
    txt(this, W / 2, 246, reg.subtitle, 19, C.dim).setOrigin(0.5);

    const list = STAGES.filter((st) => st.region === this.region);
    list.forEach((st, i) => {
      const gi = STAGES.indexOf(st);
      const open = gi === 0 || s.cleared[STAGES[gi - 1].id] !== undefined;
      const stars = s.cleared[st.id];
      const boss = st.waves.some((w) => w.some((e) => e.boss));
      const y = 290 + i * 132;
      const card = panel(this, 30, y, W - 60, 116, open ? (boss ? 0x3a2236 : C.panel) : 0x1a1724, boss ? 0xc0566a : open ? C.line : 0x2c2640, 16);
      void card;
      txt(this, 56, y + 22, st.id, 22, open ? hex(C.gold) : '#5c5470');
      txt(this, 56, y + 52, open ? st.name : '???', 28, open ? C.text : '#5c5470');
      if (boss && open) txt(this, 56 + 6 + (st.id.length * 13), y + 24, '  CHEFE', 18, '#ff8a9a');
      const maxLv = Math.max(...st.waves.flat().map((e) => e.lv));
      if (open) {
        txt(this, 56, y + 86, `Nível ${maxLv} · ${st.waves.length} ondas`, 17, C.dim);
        // elementos dos inimigos
        const els = [...new Set(st.waves.flat().map((e) => UNIT_BY_ID[e.id].element))];
        els.forEach((el, k) => this.add.image(270 + k * 30, y + 95, `el-${el}`).setDisplaySize(24, 24));
        txt(this, W - 220, y + 30, stars !== undefined ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '☆☆☆', 30, stars !== undefined ? hex(C.gold) : '#4a4260').setOrigin(0.5);
        if (st.reward && stars === undefined) {
          const def = UNIT_BY_ID[st.reward];
          this.add.image(W - 220, y + 82, `port-${def.art}`).setDisplaySize(44, 44);
          txt(this, W - 192, y + 82, 'prêmio', 15, '#ffe08a').setOrigin(0, 0.5);
        }
        button(this, W - 100, y + 58, 110, 70, '▶', () => this.scene.start('Team', { stage: st.id }), boss ? 0xb0414f : 0x7a4fd6, 34);
      } else {
        txt(this, W - 100, y + 58, '🔒', 34, '#5c5470').setOrigin(0.5);
      }
    });
  }
}
