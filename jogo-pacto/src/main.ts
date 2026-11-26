import Phaser from 'phaser';
import { BootScene, HubScene } from './scenes/MenuScenes';
import { MapScene } from './scenes/MapScene';
import { TeamScene } from './scenes/TeamScene';
import { BattleScene } from './scenes/BattleScene';
import { MonstersScene } from './scenes/MonstersScene';
import { H, W } from './ui';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#14121c',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: W,
    height: H,
  },
  render: { antialias: true, powerPreference: 'high-performance' },
  scene: [BootScene, HubScene, MapScene, TeamScene, BattleScene, MonstersScene],
});

// acesso pelo console do navegador para depuração
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
