import Phaser from 'phaser';
import { BootScene, GameOverScene, MenuScene } from './scenes/MenuScenes';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { LevelUpScene } from './scenes/LevelUpScene';
import { ShopScene } from './scenes/ShopScene';
import { StatusScene } from './scenes/StatusScene';
import { SkillTreeScene } from './scenes/SkillTreeScene';
import { gameSizeFor } from './ui';

const parent = document.getElementById('game')!;
const screenSize = () => gameSizeFor(parent.clientWidth || window.innerWidth, parent.clientHeight || window.innerHeight);

/**
 * Mede a taxa de atualização da tela. Em telas de 120 Hz o jogo é limitado a 60 quadros
 * por segundo (metade do trabalho, menos calor e bateria, sem diferença visível).
 * Em 60 e 90 Hz não há limite: o limitador do Phaser zera o tempo acumulado e,
 * nessas telas, acabaria pulando quadros.
 */
function measureRefresh(): Promise<number> {
  return new Promise((resolve) => {
    const times: number[] = [];
    const tick = (t: number) => {
      times.push(t);
      if (times.length < 16) {
        requestAnimationFrame(tick);
        return;
      }
      const d = times.slice(1).map((v, i) => v - times[i]).sort((a, b) => a - b);
      resolve(1000 / d[Math.floor(d.length / 2)]);
    };
    requestAnimationFrame(tick);
    // aba em segundo plano (sem quadros): segue sem limite
    window.setTimeout(() => resolve(60), 700);
  });
}

function startGame(hz: number) {
  const initial = screenSize();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    fps: hz > 105 ? { limit: 62 } : {},
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
    scene: [BootScene, MenuScene, GameScene, UIScene, LevelUpScene, StatusScene, SkillTreeScene, GameOverScene, ShopScene],
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
}

measureRefresh().then(startGame);
