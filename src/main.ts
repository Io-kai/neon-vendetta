// NEON VENDETTA — entry point.
// An original 16-bit style beat 'em up. Phaser 3 + TypeScript + Vite.

import Phaser from 'phaser';
import { GAME_W, GAME_H } from './config';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { CRTPipeline } from './fx/CRTPipeline';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W * 3,
  height: GAME_H * 3,
  backgroundColor: '#05060a',
  pixelArt: false,
  roundPixels: false,
  banner: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    gamepad: true,
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  scene: [BootScene, TitleScene, GameScene],
  callbacks: {
    postBoot: (game) => {
      if (game.renderer.type === Phaser.WEBGL) {
        (game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines.addPostPipeline(
          'CRTPipeline',
          CRTPipeline
        );
      }
    },
  },
};

// eslint-disable-next-line no-new
const game = new Phaser.Game(config);

// Exposed for headless E2E assertions (scripts/e2e.mjs).
(window as unknown as { __NV_GAME__: Phaser.Game }).__NV_GAME__ = game;
