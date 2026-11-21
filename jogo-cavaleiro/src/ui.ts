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

export const WIN = {
  titleTop: 0xf1f6fd,
  titleBottom: 0xa9c4ea,
  body: 0xf8fafd,
  bodyBottom: 0xe4ebf5,
  border: 0x7f99c2,
  borderDark: 0x4f6690,
  panel: 0xffffff,
  panelBorder: 0xb9c8de,
  rowAlt: 0xeef3fa,
  hover: 0xdce9fb,
  text: '#22304a',
  label: '#4b6290',
  muted: '#7d8aa3',
  accent: '#2559b0',
  good: '#2f8a3a',
  bad: '#b8322e',
  gold: '#a8740a',
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
    g.fillStyle(0x000000, 0.28).fillRoundedRect(3, 4, w, h, 7);
    g.fillStyle(WIN.borderDark).fillRoundedRect(0, 0, w, h, 7);
    g.fillStyle(WIN.border).fillRoundedRect(1, 1, w - 2, h - 2, 6);
    gradRect(g, 2, th + 1, w - 4, h - th - 3, WIN.body, WIN.bodyBottom);
    gradRect(g, 2, 2, w - 4, th - 1, WIN.titleTop, WIN.titleBottom);
    g.fillStyle(0xffffff, 0.55).fillRect(2, 2, w - 4, 2);
    g.fillStyle(WIN.border).fillRect(2, th + 1, w - 4, 1);
    g.fillStyle(0x5b84c4).fillCircle(12 * s, 2 + th / 2, 4 * s);
    g.fillStyle(0xffffff, 0.7).fillCircle(11 * s, 1 + th / 2, 1.6 * s);
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
  const t = wtext(scene, 22 * s, 2 + th / 2, title, 14 * s, '#1c2a46', true).setOrigin(0, 0.5);
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
    g.fillStyle(WIN.panelBorder).fillRoundedRect(0, 0, W, H, 4);
    g.fillStyle(fill).fillRoundedRect(1, 1, W - 2, H - 2, 3);
    g.fillStyle(0x000000, 0.06).fillRect(2, 1, W - 4, 2);
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
  return bake(scene, `ui-btn-${W}x${H}-${primary ? 'p' : 'n'}-${state}`, W, H, (g) => {
    const top = primary ? 0xe3eefc : 0xffffff;
    const bottom = primary ? 0x8fb1e2 : 0xd3dcea;
    g.fillStyle(state === 'off' ? 0x9aa6b8 : WIN.borderDark).fillRoundedRect(0, 0, W, H, 4);
    const [a, b] = state === 'off' ? [0xeef1f5, 0xd9dee6] : state === 'down' ? [bottom, top]
      : state === 'hover' ? [0xffffff, primary ? 0xa8c4ec : 0xe3ebf6] : [top, bottom];
    gradRect(g, 1, 1, W - 2, H - 2, a, b);
    g.fillStyle(0xffffff, state === 'down' ? 0.1 : 0.6).fillRect(2, 1, W - 4, 1);
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
  const t = wtext(scene, 0, 0, label, opts.size ?? 14, enabled ? '#1c2a46' : '#98a2b3', true).setOrigin(0.5);
  const zone = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
  zone.on('pointerover', () => draw('hover'));
  zone.on('pointerout', () => draw('normal'));
  zone.on('pointerdown', () => draw('down'));
  zone.on('pointerup', () => {
    draw('normal');
    if (enabled) onClick();
  });
  c.add([img, t, zone]);
  return {
    c, label: t,
    setEnabled(on: boolean) {
      if (on === enabled) return;
      enabled = on;
      t.setColor(on ? '#1c2a46' : '#98a2b3');
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
export function uiBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, pct: number, color: number, back = 0x2a3346) {
  g.fillStyle(0x1b2233).fillRect(x, y, w, h);
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

/** Escurece uma cor (para ler bem sobre fundo claro) e devolve como "#rrggbb" */
export function darken(n: number, f = 0.55) {
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
