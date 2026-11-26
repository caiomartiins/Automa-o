import Phaser from 'phaser';
import { ECO_INFO } from '../battle/engine';
import { STAGE_BY_ID, type StageDef } from '../data/stages';
import { ELEMENT_COLOR, ELEMENT_NAME, elementEdge } from '../data/types';
import { UNIT_BY_ID, maxLevel } from '../data/units';
import { persist, save, unitByKey, type OwnedUnit } from '../save';
import { C, H, W, button, hex, panel, txt } from '../ui';
import { menuBackdrop } from './MenuScenes';

/** Retrato com moldura do elemento */
export function portraitCard(scene: Phaser.Scene, x: number, y: number, size: number, u: OwnedUnit, opts: { dim?: boolean; check?: boolean } = {}) {
  const def = UNIT_BY_ID[u.id];
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.5);
  g.fillRoundedRect(-size / 2, -size / 2 + 3, size, size, 12);
  g.fillStyle(0x2a2340, 1);
  g.fillRoundedRect(-size / 2, -size / 2, size, size, 12);
  const img = scene.add.image(0, 0, `port-${def.art}`).setDisplaySize(size - 8, size - 8);
  const b = scene.add.graphics();
  b.lineStyle(3, ELEMENT_COLOR[def.element], 1);
  b.strokeRoundedRect(-size / 2, -size / 2, size, size, 12);
  const el = scene.add.image(-size / 2 + 13, -size / 2 + 13, `el-${def.element}`).setDisplaySize(24, 24);
  const st = txt(scene, 0, size / 2 - 30, '★'.repeat(def.stars), 13, hex(C.gold), { strokeThickness: 3 }).setOrigin(0.5);
  const lv = txt(scene, size / 2 - 5, size / 2 - 4, `${u.lv}`, 18).setOrigin(1, 1);
  c.add([g, img, b, el, st, lv]);
  if (opts.dim) c.setAlpha(0.45);
  if (opts.check) {
    const ck = txt(scene, size / 2 - 6, -size / 2 + 4, '✔', 22, '#8dffb0').setOrigin(1, 0);
    c.add(ck);
  }
  c.setSize(size, size);
  return c;
}

export class TeamScene extends Phaser.Scene {
  private stage!: StageDef;

  constructor() { super('Team'); }

  init(data: { stage: string }) {
    this.stage = STAGE_BY_ID[data.stage];
  }

  create() {
    menuBackdrop(this);
    const s = save();
    const st = this.stage;
    button(this, 74, 52, 120, 60, '◀ Mapa', () => this.scene.start('Map', { region: st.region }), 0x5a4570, 22);
    txt(this, W / 2 + 60, 36, `${st.id}  ${st.name}`, 30, hex(C.gold)).setOrigin(0.5, 0);

    // inimigos
    panel(this, 20, 100, W - 40, 60 + st.waves.length * 84, C.panel, C.line, 16);
    txt(this, 40, 112, 'Inimigos', 22, C.dim);
    st.waves.forEach((wave, wi) => {
      const y = 180 + wi * 84;
      txt(this, 40, y, `Onda ${wi + 1}`, 18, C.dim).setOrigin(0, 0.5);
      wave.forEach((e, k) => {
        const def = UNIT_BY_ID[e.id];
        const x = 175 + k * 92;
        const size = e.boss ? 78 : 68;
        const g = this.add.graphics();
        g.fillStyle(0x2a2340, 1);
        g.fillRoundedRect(x - size / 2, y - size / 2, size, size, 10);
        g.lineStyle(e.boss ? 4 : 2, e.boss ? 0xff5a6a : ELEMENT_COLOR[def.element], 1);
        g.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 10);
        this.add.image(x, y, `port-${def.art}`).setDisplaySize(size - 6, size - 6).setFlipX(true);
        this.add.image(x - size / 2 + 10, y - size / 2 + 10, `el-${def.element}`).setDisplaySize(22, 22);
        txt(this, x + size / 2 - 4, y + size / 2 - 2, `${e.lv}`, 16).setOrigin(1, 1);
        if (e.boss) txt(this, x, y - size / 2 - 2, 'CHEFE', 13, '#ff8a9a').setOrigin(0.5, 1);
      });
    });

    // dica de elemento
    const foeEls = [...new Set(st.waves.flat().map((e) => UNIT_BY_ID[e.id].element))];
    const good = (['fogo', 'agua', 'vento', 'luz', 'sombra'] as const).filter((el) => foeEls.some((f) => elementEdge(el, f) === 1));
    const tipY = 116 + 60 + st.waves.length * 84;
    txt(this, W / 2, tipY, good.length ? `Dica: ${good.map((g) => ELEMENT_NAME[g]).join(', ')} leva${good.length > 1 ? 'm' : ''} vantagem aqui` : '', 18, '#ffd88a').setOrigin(0.5);

    // time
    const teamTop = tipY + 34;
    txt(this, 30, teamTop, 'Seu time (toque para tirar)', 22, C.dim);
    const slotsY = teamTop + 100;
    for (let i = 0; i < 4; i++) {
      const x = 105 + i * 170;
      const key = s.team[i];
      const u = key ? unitByKey(key) : undefined;
      if (u) {
        const card = portraitCard(this, x, slotsY, 120, u);
        card.setInteractive({ useHandCursor: true });
        card.on('pointerup', () => {
          s.team.splice(i, 1);
          persist();
          this.scene.restart({ stage: st.id });
        });
        txt(this, x, slotsY + 72, UNIT_BY_ID[u.id].title, 18).setOrigin(0.5);
      } else {
        const g = this.add.graphics();
        g.lineStyle(2, C.line, 0.8);
        g.strokeRoundedRect(x - 60, slotsY - 60, 120, 120, 12);
        txt(this, x, slotsY, '+', 50, '#4a4260').setOrigin(0.5);
      }
      if (i === 0) txt(this, x, slotsY - 74, '👑 LÍDER', 16, hex(C.gold)).setOrigin(0.5);
    }
    const leader = s.team[0] ? unitByKey(s.team[0]) : undefined;
    if (leader) {
      const el = UNIT_BY_ID[leader.id].element;
      const eco = ECO_INFO[el];
      txt(this, W / 2, slotsY + 112, `Eco do líder · ${eco.name}: ${eco.desc}`, 17, hex(ELEMENT_COLOR[el]), { align: 'center', wordWrap: { width: W - 60 } }).setOrigin(0.5, 0);
    }

    // coleção
    const gridTop = slotsY + 176;
    txt(this, 30, gridTop, 'Seus monstros (toque para colocar)', 22, C.dim);
    const owned = [...s.units].sort((a, b) => UNIT_BY_ID[b.id].stars - UNIT_BY_ID[a.id].stars || b.lv - a.lv);
    const cols = 6;
    const size = 96;
    const gap = 112;
    owned.forEach((u, i) => {
      const x = 62 + (i % cols) * gap;
      const y = gridTop + 80 + Math.floor(i / cols) * gap;
      if (y > H - 150) return;
      const inTeam = s.team.includes(u.key);
      const card = portraitCard(this, x, y, size, u, { dim: inTeam, check: inTeam });
      card.setInteractive({ useHandCursor: true });
      card.on('pointerup', () => {
        if (inTeam) s.team = s.team.filter((k) => k !== u.key);
        else if (s.team.length < 4) s.team.push(u.key);
        else s.team[s.team.length - 1] = u.key;
        persist();
        this.scene.restart({ stage: st.id });
      });
      const def = UNIT_BY_ID[u.id];
      if (u.lv >= maxLevel(def.stars)) txt(this, x, y - size / 2 - 2, 'MÁX', 12, '#ffe08a').setOrigin(0.5, 1);
    });

    const fight = button(this, W / 2, H - 70, 420, 88, 'LUTAR!', () => this.scene.start('Battle', { stage: st.id }), 0xb0414f, 38);
    if (!s.team.length) fight.setEnabled(false);
  }
}
