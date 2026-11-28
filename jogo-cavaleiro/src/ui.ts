import Phaser from 'phaser';

export const FONT = 'Arial Black, Arial, sans-serif';

/** Texto com contorno, padrão do jogo */
export function text(scene: Phaser.Scene, x: number, y: number, value: string, size = 20, color = '#ffffff') {
  return scene.add.text(x, y, value, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    stroke: '#000000',
    strokeThickness: Math.max(3, Math.round(size / 6)),
  });
}

export const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

/** true em celulares/tablets (tela de toque) */
export const isTouch = (scene: Phaser.Scene) => scene.sys.game.device.input.touch && !scene.sys.game.device.os.desktop;

/** true quando a tela está em pé (retrato) */
export const isPortrait = (scene: Phaser.Scene) => scene.scale.height > scene.scale.width;

/**
 * Tamanho lógico do jogo para uma tela de w x h pixels.
 * O lado menor fica sempre em 720 e o maior acompanha o formato da tela,
 * assim o jogo preenche a tela inteira (sem faixas pretas), deitado ou em pé.
 */
export function gameSizeFor(w: number, h: number) {
  if (!w || !h) return { width: 1280, height: 720 };
  const ratio = w / h;
  if (ratio >= 1) return { width: Math.round(Phaser.Math.Clamp(720 * ratio, 960, 1680)), height: 720 };
  return { width: 720, height: Math.round(Phaser.Math.Clamp(720 / ratio, 960, 1680)) };
}

/**
 * Chama `fn` quando o tamanho do jogo mudar (ex.: o celular foi girado).
 * Ignora mudanças só de tamanho na tela (como a barra do navegador aparecendo),
 * e remove o ouvinte quando a cena é encerrada.
 */
export function onResize(scene: Phaser.Scene, fn: () => void) {
  let last = `${scene.scale.width}x${scene.scale.height}`;
  const handler = (size: Phaser.Structs.Size) => {
    const now = `${size.width}x${size.height}`;
    if (now === last) return;
    last = now;
    fn();
  };
  scene.scale.on(Phaser.Scale.Events.RESIZE, handler);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, handler));
}

// =====================================================================
// Kit de interface no estilo "janela clássica de RPG online":
// barra de título azul-clara em degradê, corpo claro, bordas finas,
// texto escuro pequeno e botões em relevo.
// =====================================================================

export const UIFONT = 'Tahoma, Verdana, "Segoe UI", Arial, sans-serif';

/**
 * Paleta ÚNICA da interface (tema "Arcano Noturno": azul-noite com detalhes em ouro).
 * Todas as telas usam estes tokens; para mudar o visual do jogo inteiro, mude só aqui.
 */
export const WIN = {
  // janelas
  titleTop: 0x343049,
  titleBottom: 0x1f1c2c,
  body: 0x1e2232,
  bodyBottom: 0x131620,
  border: 0xb8913f,
  borderDark: 0x07080d,
  borderShine: 0xf3d98b,
  // painéis e linhas
  panel: 0x232839,
  panelBorder: 0x3b4360,
  rowAlt: 0x2a3043,
  hover: 0x39425e,
  iconBg: 0x171b27,
  header: 0x2c3350,
  track: 0x121520,
  select: 0xf0c25a,
  // botões
  btnTop: 0x3d4663,
  btnBottom: 0x252b3d,
  primaryTop: 0xf8dc8e,
  primaryBottom: 0xbd8a2c,
  offTop: 0x262a38,
  offBottom: 0x1c1f29,
  // textos
  text: '#ece8dc',
  label: '#aab1c6',
  muted: '#6f768c',
  accent: '#f2c45c',
  good: '#7fe08a',
  bad: '#ff7b6b',
  gold: '#f2c14e',
  title: '#f3d78e',
  btnText: '#ece8dc',
  primaryText: '#2b1b05',
  offText: '#5b6176',
  headerText: '#f3d78e',
  slotText: '#5f6884',
  // raridades (texto e fundo do ícone)
  mythic: '#ff6fb4',
  rare: '#c69bff',
  epic: '#71baff',
  rarityBg: { mythic: 0x3c1531, rare: 0x2b1d46, epic: 0x15294b, legend: 0x3a2d10, normal: 0x1a1e2b, locked: 0x12141c },
};

/** Escala da interface: maior em telas de toque */
export const uiScale = (scene: Phaser.Scene) => (!isTouch(scene) ? 1 : isPortrait(scene) ? 1.65 : 1.3);

/** Texto da interface: escuro, sem contorno e nítido */
export function wtext(scene: Phaser.Scene, x: number, y: number, value: string, size = 14, color = WIN.text, bold = false) {
  return scene.add.text(x, y, value, {
    fontFamily: UIFONT,
    fontSize: `${Math.round(size)}px`,
    fontStyle: bold ? 'bold' : 'normal',
    color,
    resolution: 2,
  });
}

/** Texto grande de destaque (títulos e avisos por cima do jogo) */
export function headline(scene: Phaser.Scene, x: number, y: number, value: string, size = 30, color = '#ffffff') {
  return scene.add.text(x, y, value, {
    fontFamily: UIFONT,
    fontSize: `${Math.round(size)}px`,
    fontStyle: 'bold',
    color,
    stroke: '#1d2c4a',
    strokeThickness: Math.max(3, Math.round(size / 7)),
    resolution: 2,
  });
}

export interface UIWindow {
  c: Phaser.GameObjects.Container;
  w: number;
  h: number;
  /** Altura da barra de título (o conteúdo começa abaixo dela) */
  top: number;
  title: Phaser.GameObjects.Text;
  s: number;
}

/**
 * As janelas, painéis e botões são desenhados UMA vez como imagem (textura)
 * e reaproveitados. Desenhar formas arredondadas a cada quadro pesa no celular.
 */
function bake(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) {
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(key, Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));
    g.destroy();
  }
  return key;
}

/** Degradê vertical feito com faixas (funciona ao gerar texturas) */
function gradRect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, top: number, bottom: number) {
  const a = Phaser.Display.Color.IntegerToColor(top);
  const b = Phaser.Display.Color.IntegerToColor(bottom);
  const step = h > 80 ? 3 : 1;
  for (let i = 0; i < h; i += step) {
    const t = h <= 1 ? 0 : i / (h - 1);
    const col = Phaser.Display.Color.GetColor(
      Math.round(a.red + (b.red - a.red) * t),
      Math.round(a.green + (b.green - a.green) * t),
      Math.round(a.blue + (b.blue - a.blue) * t),
    );
    g.fillStyle(col).fillRect(x, y + i, w, Math.min(step, h - i));
  }
}

function windowTexture(scene: Phaser.Scene, w: number, h: number, s: number) {
  w = Math.round(w);
  h = Math.round(h);
  const th = Math.round(24 * s);
  return bake(scene, `ui-win-${w}x${h}-${th}`, w + 4, h + 5, (g) => {
    g.fillStyle(0x000000, 0.4).fillRoundedRect(3, 4, w, h, 8);
    g.fillStyle(WIN.borderDark).fillRoundedRect(0, 0, w, h, 8);
    g.fillStyle(WIN.border).fillRoundedRect(1, 1, w - 2, h - 2, 7);
    g.fillStyle(WIN.borderDark).fillRoundedRect(2, 2, w - 4, h - 4, 6);
    gradRect(g, 3, th + 1, w - 6, h - th - 4, WIN.body, WIN.bodyBottom);
    gradRect(g, 3, 3, w - 6, th - 2, WIN.titleTop, WIN.titleBottom);
    g.fillStyle(WIN.borderShine, 0.35).fillRect(3, 3, w - 6, 1);
    // linha dourada sob o título, com brilho no meio
    g.fillStyle(WIN.border).fillRect(3, th + 1, w - 6, 1);
    g.fillStyle(WIN.borderShine, 0.6).fillRect(w * 0.3, th + 1, w * 0.4, 1);
    // losango dourado no título e rebites nos cantos
    const cx = 12 * s;
    const cy = 2 + th / 2;
    const r = 4.5 * s;
    g.fillStyle(WIN.border).fillTriangle(cx - r, cy, cx, cy - r, cx + r, cy).fillTriangle(cx - r, cy, cx, cy + r, cx + r, cy);
    g.fillStyle(WIN.borderShine).fillCircle(cx, cy, 1.4 * s);
    for (const [x0, y0] of [[6, h - 6], [w - 6, h - 6], [w - 6, cy]]) g.fillStyle(WIN.border).fillCircle(x0, y0, 1.8);
  });
}

/**
 * Janela com barra de título. O container fica no canto superior esquerdo (x, y)
 * e o conteúdo usa coordenadas relativas a ele.
 */
export function uiWindow(scene: Phaser.Scene, x: number, y: number, w: number, h: number, title: string, s = 1): UIWindow {
  const c = scene.add.container(x, y);
  const th = Math.round(24 * s);
  const bg = scene.add.image(0, 0, windowTexture(scene, w, h, s)).setOrigin(0);
  const t = wtext(scene, 22 * s, 2 + th / 2, title, 14 * s, WIN.title, true).setOrigin(0, 0.5);
  c.add([bg, t]);
  return { c, w, h, top: th + 2, title: t, s };
}

/** Muda a altura de uma janela já criada (troca só a imagem de fundo) */
export function resizeWindow(scene: Phaser.Scene, win: UIWindow, h: number) {
  (win.c.list[0] as Phaser.GameObjects.Image).setTexture(windowTexture(scene, win.w, h, win.s));
  win.h = h;
}

/** Painel "afundado" dentro de uma janela (área branca com borda) */
export function uiPanel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fill = WIN.panel) {
  const W = Math.round(w);
  const H = Math.round(h);
  const key = bake(scene, `ui-panel-${W}x${H}-${fill}`, W, H, (g) => {
    g.fillStyle(WIN.panelBorder).fillRoundedRect(0, 0, W, H, 5);
    g.fillStyle(fill).fillRoundedRect(1, 1, W - 2, H - 2, 4);
    g.fillStyle(0x000000, 0.25).fillRect(2, 1, W - 4, 2);
  });
  return scene.add.image(x, y, key).setOrigin(0);
}

export interface UIButton {
  c: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  setEnabled(on: boolean): void;
  setText(v: string): void;
}

type BtnState = 'normal' | 'hover' | 'down' | 'off';

function buttonTexture(scene: Phaser.Scene, w: number, h: number, primary: boolean, state: BtnState) {
  const W = Math.round(w);
  const H = Math.round(h);
  return bake(scene, `ui-btn2-${W}x${H}-${primary ? 'p' : 'n'}-${state}`, W, H, (g) => {
    const top = primary ? WIN.primaryTop : WIN.btnTop;
    const bottom = primary ? WIN.primaryBottom : WIN.btnBottom;
    const lift = (c: number, f: number) => Phaser.Display.Color.ValueToColor(c).lighten(f).color;
    // borda: dourada nos botões normais, escura nos principais (que já são dourados)
    g.fillStyle(state === 'off' ? 0x2e3242 : primary ? 0x5a3c0c : WIN.border).fillRoundedRect(0, 0, W, H, 6);
    const [a, b] = state === 'off' ? [WIN.offTop, WIN.offBottom] : state === 'down' ? [bottom, top]
      : state === 'hover' ? [lift(top, 12), lift(bottom, 12)] : [top, bottom];
    gradRect(g, 1, 1, W - 2, H - 2, a, b);
    if (state !== 'off') g.fillStyle(0xffffff, state === 'down' ? 0.05 : primary ? 0.45 : 0.18).fillRect(3, 2, W - 6, 1);
    if (state === 'hover') g.lineStyle(1, WIN.borderShine, 0.9).strokeRoundedRect(1.5, 1.5, W - 3, H - 3, 5);
  });
}

/** Botão em relevo. `primary` usa o azul de destaque. O container fica centrado em (x, y). */
export function uiButton(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, onClick: () => void,
  opts: { size?: number; primary?: boolean; enabled?: boolean } = {},
): UIButton {
  const c = scene.add.container(x, y);
  let enabled = opts.enabled ?? true;
  const primary = !!opts.primary;
  const img = scene.add.image(0, 0, buttonTexture(scene, w, h, primary, enabled ? 'normal' : 'off'));
  const draw = (state: BtnState) => img.setTexture(buttonTexture(scene, w, h, primary, enabled ? state : 'off'));
  const color = (on: boolean) => (!on ? WIN.offText : primary ? WIN.primaryText : WIN.btnText);
  const t = wtext(scene, 0, 0, label, opts.size ?? 14, color(enabled), true).setOrigin(0.5);
  const zone = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
  zone.on('pointerover', () => draw('hover'));
  zone.on('pointerout', () => {
    draw('normal');
    c.setScale(1);
  });
  // toque: afunda um pouco (resposta imediata ao dedo)
  zone.on('pointerdown', () => {
    draw('down');
    if (enabled) c.setScale(0.96);
  });
  zone.on('pointerup', () => {
    draw('normal');
    c.setScale(1);
    if (enabled) onClick();
  });
  c.add([img, t, zone]);
  return {
    c, label: t,
    setEnabled(on: boolean) {
      if (on === enabled) return;
      enabled = on;
      t.setColor(color(on));
      draw('normal');
    },
    setText(v: string) {
      if (t.text !== v) t.setText(v);
    },
  };
}

/** Botãozinho de seta (como o ▶ ao lado dos atributos) */
export function uiArrow(scene: Phaser.Scene, x: number, y: number, size: number, onClick: () => void, enabled = true) {
  return uiButton(scene, x, y, size, size, '▶', onClick, { size: size * 0.55, enabled });
}

/** Barra de HP / EXP com borda escura e brilho na metade de cima */
export function uiBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, pct: number, color: number, back = WIN.track) {
  g.fillStyle(0x05060a).fillRect(x, y, w, h);
  g.fillStyle(back).fillRect(x + 1, y + 1, w - 2, h - 2);
  const fw = Math.max(0, Math.round((w - 2) * Phaser.Math.Clamp(pct, 0, 1)));
  if (fw > 0) {
    g.fillStyle(color).fillRect(x + 1, y + 1, fw, h - 2);
    g.fillStyle(0xffffff, 0.35).fillRect(x + 1, y + 1, fw, Math.max(1, Math.floor((h - 2) / 2)));
  }
}

/** Fundo escurecido para telas por cima do jogo */
export function dim(scene: Phaser.Scene, alpha = 0.55) {
  const { width, height } = scene.scale;
  return scene.add.rectangle(0, 0, width, height, 0x0a0f1c, alpha).setOrigin(0);
}

/**
 * Versão da cor legível sobre os painéis do tema (escuros): clareia misturando com branco.
 * `f` < 1 clareia mais (mantém a assinatura antiga, usada nos títulos coloridos das cartas).
 */
export function darken(n: number, f = 0.55) {
  const mix = Phaser.Math.Clamp(1 - f, 0.25, 0.6);
  const ch = (v: number) => Math.round(v + (255 - v) * mix);
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Fundo de cena com atmosfera (menu, fim de jogo): piso andando devagar, vinheta escura
 * nas bordas e brasas douradas subindo. Tudo com poucas imagens reaproveitadas.
 */
export function atmosphere(scene: Phaser.Scene, ground = 'grama') {
  const { width, height } = scene.scale;
  const bg = scene.add.tileSprite(0, 0, width, height, ground).setOrigin(0);
  scene.tweens.add({ targets: bg, tilePositionX: 256, tilePositionY: 128, duration: 60000, repeat: -1 });
  // vinheta: centro levemente escuro, bordas bem escuras
  const key = bake(scene, `ui-vignette-${width}x${height}`, width, height, (g) => {
    gradRect(g, 0, 0, width, height, 0x0b0d16, 0x05060b);
  });
  scene.add.image(0, 0, key).setOrigin(0).setAlpha(0.55);
  const edge = bake(scene, `ui-edge-${width}x${height}`, width, height, (g) => {
    const steps = 18;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      g.lineStyle(Math.max(width, height) / 28, 0x000000, 0.09 * (1 - t));
      g.strokeRect(-(width / 60) + i * (width / 60), -(height / 60) + i * (height / 60), width - i * (width / 30) + width / 30, height - i * (height / 30) + height / 30);
    }
  });
  scene.add.image(0, 0, edge).setOrigin(0);
  // brasas douradas
  for (let i = 0; i < 22; i++) {
    const ember = scene.add.image(0, 0, 'fx-spark').setTint(i % 3 ? 0xffc35a : 0xff7a3a).setBlendMode(Phaser.BlendModes.ADD);
    const fly = () => {
      ember.setPosition(Math.random() * width, height + 10 + Math.random() * 60).setAlpha(0).setScale(0.5 + Math.random() * 0.9);
      scene.tweens.add({
        targets: ember, y: -20 - Math.random() * height * 0.3, x: ember.x + (Math.random() - 0.5) * 160,
        alpha: { from: 0.9, to: 0 }, duration: 6000 + Math.random() * 7000, ease: 'Sine.Out', onComplete: fly,
      });
    };
    scene.time.delayedCall(Math.random() * 6000, fly);
  }
}

/** Moldura vermelha nas bordas da tela (perigo: horda chegando, vida baixa, golpe forte) */
export function dangerEdge(scene: Phaser.Scene) {
  const { width, height } = scene.scale;
  const key = bake(scene, `ui-danger-${width}x${height}`, width, height, (g) => {
    const steps = 14;
    const band = Math.min(width, height) * 0.16;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const inset = band * t;
      g.lineStyle(band / steps + 1, 0xd8141a, 0.55 * (1 - t) ** 1.6);
      g.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
    }
  });
  return scene.add.image(0, 0, key).setOrigin(0).setAlpha(0).setDepth(-1);
}

/** Título com brilho pulsando e balanço suave */
export function glowTitle(scene: Phaser.Scene, x: number, y: number, value: string, size: number) {
  const glow = headline(scene, x, y, value, size, '#ffcf6a').setOrigin(0.5).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD).setScale(1.04);
  const t = headline(scene, x, y, value, size, '#ffe9a0').setOrigin(0.5).setStroke('#2a1706', Math.max(4, size / 6));
  scene.tweens.add({ targets: glow, alpha: 0.7, scale: 1.07, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  scene.tweens.add({ targets: [t, glow], y: y - 4, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  return t;
}
