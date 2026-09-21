// Headless smoke test for NEON VENDETTA's non-DOM modules.
// Bundled with esbuild and run in Node (no Phaser/DOM imports in these files).

import { buildSfx, buildMusic } from '../src/audio/synth';
import { BODIES, CHAR_ART, ITEM_MAPS, FX_MAPS } from '../src/art/parts';
import { CHAR_PALETTES, FX_PALETTE } from '../src/art/palette';

let failures = 0;
function check(cond: boolean, msg: string): void {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${msg}`);
  }
}

// ---- audio ----
const sfx = buildSfx();
const sfxKeys = Object.keys(sfx);
check(sfxKeys.length >= 12, `expected >=12 sfx, got ${sfxKeys.length}`);
for (const [k, uri] of Object.entries(sfx)) {
  check(uri.startsWith('data:audio/wav;base64,'), `sfx ${k} not a wav data uri`);
  const raw = Buffer.from(uri.split(',')[1], 'base64');
  check(raw.length > 100, `sfx ${k} suspiciously small (${raw.length}b)`);
  check(raw.toString('ascii', 0, 4) === 'RIFF', `sfx ${k} missing RIFF header`);
  check(raw.toString('ascii', 8, 12) === 'WAVE', `sfx ${k} missing WAVE header`);
}

const music = buildMusic();
check(Object.keys(music).sort().join(',') === 'boss,stage,title', 'music keys mismatch');
for (const [k, uri] of Object.entries(music)) {
  const raw = Buffer.from(uri.split(',')[1], 'base64');
  check(raw.toString('ascii', 0, 4) === 'RIFF', `music ${k} missing RIFF header`);
  check(raw.length > 100000, `music ${k} too short (${raw.length}b)`);
  // peak check — ensure not silent: sample a few PCM values
  let peak = 0;
  for (let i = 44; i < Math.min(raw.length, 44000); i += 2) {
    peak = Math.max(peak, Math.abs(raw.readInt16LE(i)));
  }
  check(peak > 3000, `music ${k} appears silent (peak ${peak})`);
}

// ---- pixel maps: frame references ----
for (const [bodyId, body] of Object.entries(BODIES)) {
  for (const [frameName, frame] of Object.entries(body.frames)) {
    check(frame.length > 0, `${bodyId}.${frameName} is empty`);
    for (const part of frame) {
      check(!!body.parts[part.p], `${bodyId}.${frameName} references missing part "${part.p}"`);
    }
  }
}

// ---- palette coverage: every char used in maps must resolve ----
function collectChars(maps: Record<string, string[]>): Set<string> {
  const out = new Set<string>();
  for (const map of Object.values(maps)) {
    for (const row of map) {
      for (const ch of row) out.add(ch);
    }
  }
  return out;
}

for (const [charId, art] of Object.entries(CHAR_ART)) {
  const body = BODIES[art.body];
  check(!!body, `${charId} references missing body "${art.body}"`);
  const pal = CHAR_PALETTES[art.palette];
  check(!!pal, `${charId} references missing palette "${art.palette}"`);
  if (!body || !pal) continue;
  const used = collectChars(body.parts);
  for (const ch of used) {
    check(ch in pal, `${charId}: pixel char "${ch}" has no palette entry`);
    if (ch !== '.') check(!!pal[ch], `${charId}: palette entry "${ch}" is empty`);
  }
}

const fxUsed = collectChars({ ...ITEM_MAPS, ...FX_MAPS });
for (const ch of fxUsed) {
  check(ch in FX_PALETTE, `FX palette missing "${ch}"`);
}

// ---- required frames per body ----
for (const bodyId of ['std', 'big']) {
  const frames = BODIES[bodyId].frames;
  for (const req of ['idle', 'walkA', 'jab', 'hurt', 'down']) {
    check(!!frames[req], `${bodyId} missing required frame "${req}"`);
  }
}
check(!!BODIES.std.frames.swing, 'std missing "swing" (blade slash)');
check(!!BODIES.std.frames.kick, 'std missing "kick" (jump attack)');
check(!!BODIES.big.frames.charge, 'big missing "charge"');

if (failures === 0) {
  console.log('SMOKE OK — audio + pixel data integrity verified');
  console.log(`  sfx: ${sfxKeys.length} clips | music: ${Object.keys(music).length} loops`);
  console.log(`  bodies: ${Object.keys(BODIES).length} | chars: ${Object.keys(CHAR_ART).length}`);
  process.exit(0);
} else {
  console.error(`${failures} smoke check(s) failed`);
  process.exit(1);
}
