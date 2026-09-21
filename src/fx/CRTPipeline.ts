// NEON VENDETTA — CRT post-processing: scanlines, aperture-grille tint,
// vignette and a whisper of barrel curvature. Toggle with the F key.

import Phaser from 'phaser';

const FRAG = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform float uTime;

varying vec2 outTexCoord;

void main() {
  vec2 uv = outTexCoord;

  // subtle barrel distortion
  vec2 cc = uv - 0.5;
  float dist = dot(cc, cc);
  uv = uv + cc * dist * 0.025;

  vec3 col = texture2D(uMainSampler, uv).rgb;

  // scanlines (270 virtual lines)
  float scan = sin(uv.y * uResolution.y * 3.14159265 * 2.0);
  col *= 0.97 + 0.03 * scan;

  // aperture grille vertical tint
  float px = uv.x * uResolution.x * 3.14159265 * 2.0;
  col.r *= 0.97 + 0.03 * sin(px);
  col.b *= 0.97 + 0.03 * sin(px + 2.094);

  // vignette
  float vig = 1.0 - dist * 0.22;
  col *= vig;

  // rounded-corner cutoff
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) col = vec3(0.0);

  gl_FragColor = vec4(col, 1.0);
}
`;

export class CRTPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game: Phaser.Game) {
    super({
      game,
      name: 'CRTPipeline',
      fragShader: FRAG,
    });
  }

  onPreRender(): void {
    this.set2f('uResolution', this.renderer.width, this.renderer.height);
    this.set1f('uTime', (this.game.loop.time % 100000) / 1000);
  }
}

export function applyCRT(scene: Phaser.Scene, on: boolean): void {
  const cam = scene.cameras.main;
  if (on) {
    if (scene.game.renderer.type === Phaser.WEBGL) {
      cam.setPostPipeline(CRTPipeline);
    }
  } else {
    cam.removePostPipeline('CRTPipeline');
  }
}
