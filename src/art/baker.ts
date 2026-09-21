// NEON VENDETTA — texture baker.
// Renders the pixel maps (parts.ts) into Phaser canvas textures at boot:
// character frames, portraits, items, FX, and the parallax city background.

import Phaser from 'phaser';
import { bakePremiumEffects } from './effects';
import { bakePremiumCharacters } from './fighters';
import { bakePremiumBackgrounds } from './city';
import { CHAR_PALETTES, FX_PALETTE, Palette } from './palette';
import { BODIES, CHAR_ART, FX_MAPS, ITEM_MAPS, WPN_MAPS, PixMap } from './parts';
import { GAME_H, GAME_W } from '../config';

function drawMap(
  ctx: CanvasRenderingContext2D,
  map: PixMap,
  pal: Palette,
  ox: number,
  oy: number,
  flipX = false
): { w: number; h: number } {
  let w = 0;
  const h = map.length;
  for (const row of map) w = Math.max(w, row.length);
  for (let y = 0; y < h; y++) {
    const row = map[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const color = pal[ch];
      if (!color || ch === '.') continue;
      ctx.fillStyle = color;
      const dx = flipX ? w - 1 - x : x;
      ctx.fillRect(ox + dx, oy + y, 1, 1);
    }
  }
  return { w, h };
}

function mapSize(map: PixMap): { w: number; h: number } {
  let w = 0;
  for (const row of map) w = Math.max(w, row.length);
  return { w, h: map.length };
}

// Bake every frame of every character. Texture key: `${charId}_${frameName}`
export function bakeCharacters(scene: Phaser.Scene): void {
  const PAD_X = 26;
  const PAD_TOP = 46;
  const W = 60;
  const H = 56;

  for (const [charId, art] of Object.entries(CHAR_ART)) {
    const body = BODIES[art.body];
    const pal = CHAR_PALETTES[art.palette];
    for (const [frameName, frame] of Object.entries(body.frames)) {
      const key = `${charId}_${frameName}`;
      if (scene.textures.exists(key)) continue;
      const tex = scene.textures.createCanvas(key, W, H);
      if (!tex) continue;
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, W, H);
      for (const part of frame) {
        const map = body.parts[part.p];
        if (!map) continue;
        drawMap(ctx, map, pal, PAD_X + part.x, PAD_TOP + part.y, part.fx);
      }
      tex.refresh();
    }

    // Portrait: head + shoulders at 2x inside 28x28
    const pKey = `${charId}_portrait`;
    if (!scene.textures.exists(pKey)) {
      const ptex = scene.textures.createCanvas(pKey, 28, 28);
      if (ptex) {
        const pctx = ptex.getContext();
        const headMap = art.body === 'big' ? BODIES.big.parts.headBig : BODIES.std.parts.head;
        const torsoMap = art.body === 'big' ? BODIES.big.parts.torsoBig : BODIES.std.parts.torso;
        const hs = mapSize(headMap);
        // background plate
        pctx.fillStyle = '#1a1a28';
        pctx.fillRect(0, 0, 28, 28);
        // draw torso bottom rows then head, scaled 2x
        const drawScaled = (map: PixMap, ox: number, oy: number, rowsFrom = 0, rowsTo = map.length) => {
          for (let y = rowsFrom; y < rowsTo; y++) {
            const row = map[y];
            for (let x = 0; x < row.length; x++) {
              const color = pal[row[x]];
              if (!color || row[x] === '.') continue;
              pctx.fillStyle = color;
              pctx.fillRect(ox + x * 2, oy + (y - rowsFrom) * 2, 2, 2);
            }
          }
        };
        const ts = mapSize(torsoMap);
        drawScaled(torsoMap, 14 - ts.w, 28 - 10, 6, 11);
        drawScaled(headMap, 14 - hs.w, 28 - 10 - hs.h * 2 + 2);
        ptex.refresh();
      }
    }
  }
}

export function bakeItemsAndFx(scene: Phaser.Scene): void {
  for (const [key, map] of Object.entries(ITEM_MAPS)) {
    if (scene.textures.exists(`item_${key}`)) continue;
    const { w, h } = mapSize(map);
    const tex = scene.textures.createCanvas(`item_${key}`, w, h);
    if (!tex) continue;
    drawMap(tex.getContext(), map, FX_PALETTE, 0, 0);
    tex.refresh();
  }
  for (const [key, map] of Object.entries(WPN_MAPS)) {
    if (scene.textures.exists(`wpn_${key}`)) continue;
    const { w, h } = mapSize(map);
    const tex = scene.textures.createCanvas(`wpn_${key}`, w, h);
    if (!tex) continue;
    drawMap(tex.getContext(), map, FX_PALETTE, 0, 0);
    tex.refresh();
  }
  for (const [key, map] of Object.entries(FX_MAPS)) {
    if (scene.textures.exists(`fx_${key}`)) continue;
    const { w, h } = mapSize(map);
    const tex = scene.textures.createCanvas(`fx_${key}`, w, h);
    if (!tex) continue;
    drawMap(tex.getContext(), map, FX_PALETTE, 0, 0);
    tex.refresh();
  }
}

// ---------------------------------------------------------------------------
// CITY BACKGROUND — procedurally drawn, tileable horizontal strips.
// Layer keys: bg_sky, bg_far, bg_mid, bg_ground  (+ bg_neon_a / bg_neon_b flicker)
// ---------------------------------------------------------------------------

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function bakeBackgrounds(scene: Phaser.Scene): void {
  const SEG = 480;

  // --- Sky: vertical gradient + stars -------------------------------------
  if (!scene.textures.exists('bg_sky')) {
    const H = 120;
    const tex = scene.textures.createCanvas('bg_sky', SEG, H);
    if (tex) {
      const ctx = tex.getContext();
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#060714');
      grad.addColorStop(0.55, '#141234');
      grad.addColorStop(1, '#2c1440');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, SEG, H);
      const r = rng(1337);
      for (let i = 0; i < 90; i++) {
        const y = r() * H * 0.8;
        ctx.fillStyle = r() > 0.8 ? '#cfd4ff' : '#7a7fb8';
        ctx.fillRect(Math.floor(r() * SEG), Math.floor(y), 1, 1);
      }
      tex.refresh();
    }
  }

  // --- Far skyline silhouette ---------------------------------------------
  if (!scene.textures.exists('bg_far')) {
    const H = 150;
    const tex = scene.textures.createCanvas('bg_far', SEG, H);
    if (tex) {
      const ctx = tex.getContext();
      const r = rng(4242);
      let x = 0;
      while (x < SEG) {
        const bw = 18 + Math.floor(r() * 34);
        const bh = 40 + Math.floor(r() * 85);
        const y0 = H - bh;
        ctx.fillStyle = '#171230';
        ctx.fillRect(x, y0, bw, bh);
        // antenna
        if (r() > 0.6) {
          ctx.fillRect(x + Math.floor(bw / 2), y0 - 6, 1, 6);
          ctx.fillStyle = '#c03050';
          ctx.fillRect(x + Math.floor(bw / 2), y0 - 7, 1, 1);
          ctx.fillStyle = '#171230';
        }
        // sparse windows
        for (let wy = y0 + 4; wy < H - 3; wy += 5) {
          for (let wx = x + 2; wx < x + bw - 2; wx += 4) {
            if (r() > 0.86) {
              ctx.fillStyle = r() > 0.5 ? '#3a3468' : '#57422a';
              ctx.fillRect(wx, wy, 1, 2);
            }
          }
        }
        x += bw + 1;
      }
      tex.refresh();
    }
  }

  // --- Mid buildings with neon signs (two flicker variants) ----------------
  for (const variant of ['a', 'b'] as const) {
    const key = `bg_mid_${variant}`;
    if (scene.textures.exists(key)) continue;
    const H = 190;
    const tex = scene.textures.createCanvas(key, SEG, H);
    if (!tex) continue;
    const ctx = tex.getContext();
    const r = rng(9001);
    let x = 0;
    while (x < SEG) {
      const bw = 40 + Math.floor(r() * 46);
      const bh = 92 + Math.floor(r() * 70);
      const y0 = H - bh;
      const shade = 0x24 + Math.floor(r() * 0x10);
      ctx.fillStyle = `rgb(${shade},${shade - 6},${shade + 14})`;
      ctx.fillRect(x, y0, bw, bh);
      // roof edge highlight
      ctx.fillStyle = 'rgba(120,110,180,0.5)';
      ctx.fillRect(x, y0, bw, 1);
      // window grid
      for (let wy = y0 + 6; wy < H - 8; wy += 9) {
        for (let wx = x + 4; wx < x + bw - 5; wx += 7) {
          const lit = r();
          if (lit > 0.72) {
            ctx.fillStyle = lit > 0.92 ? '#e8c860' : '#4a8a9a';
          } else {
            ctx.fillStyle = '#141020';
          }
          ctx.fillRect(wx, wy, 4, 5);
        }
      }
      x += bw;
    }
    // Neon signs — variant b shifts which signs are lit
    const neon = (nx: number, ny: number, nw: number, nh: number, c1: string, c2: string, on: boolean) => {
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(nx - 2, ny - 2, nw + 4, nh + 4);
      if (on) {
        ctx.fillStyle = c1;
        ctx.fillRect(nx, ny, nw, nh);
        ctx.fillStyle = c2;
        for (let ly = ny + 2; ly < ny + nh - 1; ly += 4) ctx.fillRect(nx + 2, ly, nw - 4, 1);
      } else {
        ctx.fillStyle = '#1c1c28';
        ctx.fillRect(nx, ny, nw, nh);
      }
    };
    neon(30, 60, 34, 16, '#ff2a68', '#ffd0e0', variant === 'a');
    neon(96, 92, 12, 44, '#28e0c8', '#d0fff8', true);
    neon(150, 48, 44, 14, '#ffb020', '#fff0c8', variant === 'b');
    neon(230, 80, 14, 52, '#b040ff', '#f0d0ff', true);
    neon(300, 56, 38, 15, '#30c8ff', '#d8f4ff', variant === 'a');
    neon(372, 88, 12, 40, '#ff2a68', '#ffd0e0', variant === 'b');
    neon(420, 50, 40, 14, '#58ff70', '#e0ffe8', true);
    tex.refresh();
  }

  // --- Ground: sidewalk strip (lane area) + asphalt with lane markings ----
  if (!scene.textures.exists('bg_ground')) {
    const H = GAME_H - 150; // 120px tall strip starting at y=150
    const tex = scene.textures.createCanvas('bg_ground', SEG, H);
    if (tex) {
      const ctx = tex.getContext();
      const r = rng(777);
      // sidewalk (top 34px = walkable lane background)
      ctx.fillStyle = '#3c3a4a';
      ctx.fillRect(0, 0, SEG, 34);
      ctx.fillStyle = '#4a4858';
      ctx.fillRect(0, 0, SEG, 3);
      // sidewalk seams
      ctx.fillStyle = '#2e2c3a';
      for (let x = 0; x < SEG; x += 32) ctx.fillRect(x, 0, 1, 34);
      ctx.fillRect(0, 33, SEG, 1);
      // asphalt
      ctx.fillStyle = '#232230';
      ctx.fillRect(0, 34, SEG, H - 34);
      // asphalt noise
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = r() > 0.5 ? '#282636' : '#1e1c2a';
        ctx.fillRect(Math.floor(r() * SEG), 34 + Math.floor(r() * (H - 36)), 2, 1);
      }
      // road markings
      ctx.fillStyle = '#8a7a30';
      for (let x = 8; x < SEG; x += 48) ctx.fillRect(x, H - 40, 24, 2);
      // curb edge
      ctx.fillStyle = '#565468';
      ctx.fillRect(0, 32, SEG, 2);
      tex.refresh();
    }
  }

  // --- Foreground fence/rail strip (scrolls faster than ground) ------------
  if (!scene.textures.exists('bg_fore')) {
    const H = 26;
    const tex = scene.textures.createCanvas('bg_fore', 96, H);
    if (tex) {
      const ctx = tex.getContext();
      ctx.fillStyle = 'rgba(10,10,18,0.85)';
      for (let x = 0; x < 96; x += 16) {
        ctx.fillRect(x, 4, 3, H - 4);
      }
      ctx.fillRect(0, 4, 96, 3);
      ctx.fillRect(0, 12, 96, 2);
      tex.refresh();
    }
  }
}

export function bakeAll(scene: Phaser.Scene): void {
  bakePremiumCharacters(scene);
  bakeItemsAndFx(scene);
  bakePremiumBackgrounds(scene);
  bakePremiumEffects(scene);
}

export { GAME_W, GAME_H };
