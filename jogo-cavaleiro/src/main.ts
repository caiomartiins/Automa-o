import Phaser from 'phaser';
import { BootScene, GameOverScene, MenuScene } from './scenes/MenuScenes';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { LevelUpScene } from './scenes/LevelUpScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1d2b1f',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  render: {
    powerPreference: 'high-performance',
    antialias: true,
  },
  // o jogo não usa o motor de física: movimento e colisões são feitos à mão (mais leve)
  input: { activePointers: 2 },
  scene: [BootScene, MenuScene, GameScene, UIScene, LevelUpScene, GameOverScene],
});

// acesso pelo console do navegador para depuração
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
