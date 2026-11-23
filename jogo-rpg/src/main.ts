import Phaser from 'phaser';
import { TITLE_IMAGE } from './assets';
import { CLASSES } from './data/classes';
import { newChar, type CharData } from './game/char';
import { deleteSave, loadChar } from './game/save';
import { BootScene, GameScene } from './scene';
import { UI } from './ui';

const title = document.getElementById('title')!;
const panel = document.getElementById('title-panel')!;
title.style.backgroundImage = `url(${TITLE_IMAGE})`;

const ui = new UI();
let ready = false;
let startWith: CharData | null = null;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b1020',
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  render: { antialias: true, pixelArt: false },
  input: { activePointers: 2 },
  scene: [BootScene, GameScene],
});

(window as unknown as { aurora: Phaser.Game }).aurora = game;

game.events.once('ready', () => {
  ready = true;
  if (startWith) begin(startWith);
});

function begin(c: CharData) {
  startWith = c;
  if (!ready) {
    panel.innerHTML = '<p style="margin:0;text-align:center;font-weight:800">Carregando…</p>';
    return;
  }
  title.remove();
  game.scene.stop('boot');
  game.scene.start('game', { char: c, ui });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

function renderTitle(confirmNew = false) {
  const saved = loadChar();
  if (saved && !confirmNew) {
    panel.innerHTML = `
      <button class="btn primary" id="btn-continue">Continuar: ${esc(saved.name)} · ${CLASSES[saved.cls]?.name ?? ''} Nv ${saved.baseLv}</button>
      <button class="btn" id="btn-new">Novo personagem</button>`;
    document.getElementById('btn-continue')!.onclick = () => begin(saved);
    document.getElementById('btn-new')!.onclick = () => renderTitle(true);
    return;
  }
  panel.innerHTML = `
    <label for="hero-name" style="font-weight:800;text-align:left">Nome do personagem</label>
    <input id="hero-name" maxlength="16" value="Aventureiro" autocomplete="off" />
    ${saved ? '<p style="margin:0;color:#c0392b;font-weight:700;font-size:12px;text-align:left">Isso substitui o personagem salvo neste navegador.</p>' : ''}
    <button class="btn primary" id="btn-start">Começar como Aprendiz</button>
    ${saved ? '<button class="btn" id="btn-back">Voltar</button>' : ''}`;
  const input = document.getElementById('hero-name') as HTMLInputElement;
  const go = () => {
    const name = input.value.trim().slice(0, 16) || 'Aventureiro';
    deleteSave();
    input.blur();
    begin(newChar(name));
  };
  document.getElementById('btn-start')!.onclick = go;
  input.onkeydown = (e) => { if (e.key === 'Enter') go(); };
  const back = document.getElementById('btn-back');
  if (back) back.onclick = () => renderTitle(false);
}

renderTitle();
