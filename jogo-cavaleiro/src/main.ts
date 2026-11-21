import Phaser from 'phaser';
import { BootScene, GameOverScene, MenuScene } from './scenes/MenuScenes';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { LevelUpScene } from './scenes/LevelUpScene';
import { ShopScene } from './scenes/ShopScene';
import { StatusScene } from './scenes/StatusScene';
import { gameSizeFor } from './ui';

const parent = document.getElementById('game')!;
const screenSize = () => gameSizeFor(parent.clientWidth || window.innerWidth, parent.clientHeight || window.innerHeight);
const initial = screenSize();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  backgroundColor: '#1d2b1f',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: initial.width,
    height: initial.height,
  },
  render: {
    powerPreference: 'high-performance',
    antialias: true,
  },
  // o jogo não usa o motor de física: movimento e colisões são feitos à mão (mais leve)
  input: { activePointers: 2 },
  scene: [BootScene, MenuScene, GameScene, UIScene, LevelUpScene, StatusScene, GameOverScene, ShopScene],
});

// Ao girar o celular (ou redimensionar a janela), ajusta o tamanho do jogo ao novo formato
let resizeTimer = 0;
const refit = () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    const { width, height } = screenSize();
    if (width !== game.scale.width || height !== game.scale.height) game.scale.setGameSize(width, height);
  }, 150);
};
window.addEventListener('resize', refit);
window.addEventListener('orientationchange', refit);

// acesso pelo console do navegador para depuração
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
