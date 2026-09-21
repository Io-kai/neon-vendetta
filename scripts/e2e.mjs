// NEON VENDETTA — headless browser E2E test.
// Boots the real game in Chromium, drives the title -> select -> gameplay
// flow with synthetic keyboard input, captures console errors + screenshots.
//
// Usage:  node scripts/e2e.mjs [baseUrl]
// Requires the preview server (or dev server) to be running.

import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:4173/';
const SHOT = new URL('../.e2e', import.meta.url).pathname;
mkdirSync(SHOT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${msg}`);
  if (!cond) failures++;
};
const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--mute-audio',
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader',
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 540 });

  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.stack || e.message}`));
  page.on('response', (r) => {
    if (r.status() >= 400) consoleErrors.push(`HTTP ${r.status()} ${r.url()}`);
  });

  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 15000 });
  check(true, 'canvas mounted');

  // BootScene: audio decode + texture baking, then TitleScene
  await sleep(5000);
  await page.screenshot({ path: `${SHOT}/nv_1_title.png` });

  // Title -> character select
  await page.keyboard.press('Enter');
  await sleep(600);
  await page.screenshot({ path: `${SHOT}/nv_2_select.png` });

  // Move cursor right (KANE -> JINX), then back left
  await page.keyboard.press('ArrowRight');
  await sleep(400);
  await page.screenshot({ path: `${SHOT}/nv_3_select_right.png` });
  await page.keyboard.press('ArrowLeft');
  await sleep(400);

  // Confirm with Z -> must start the game (regression: ready-flag was reset
  // by buildSelect, so the game could never start)
  await page.keyboard.press('KeyZ');
  const inGame = await page
    .waitForFunction(
      () => window.__NV_GAME__ && window.__NV_GAME__.scene.isActive('GameScene'),
      { timeout: 8000 }
    )
    .catch(() => null);
  check(!!inGame, 'Z on select starts GameScene (reported bug)');
  await sleep(350);
  if (await page.evaluate(() => window.__NV_GAME__.scene.getScene('GameScene').storyUi?.active)) {
    await page.keyboard.down('Escape'); await sleep(90); await page.keyboard.up('Escape');
  }
  await sleep(800);
  await page.screenshot({ path: `${SHOT}/nv_4_gamestart.png` });

  // Walk right until the first wave gate triggers
  await page.keyboard.down('ArrowRight');
  const gate = await page
    .waitForFunction(
      () => {
        const s = window.__NV_GAME__?.scene.getScene('GameScene');
        return s && (s.gateActive || s.enemies.length > 0);
      },
      { timeout: 25000 }
    )
    .catch(() => null);
  check(!!gate, 'wave 1 gate triggered, enemies spawning');
  await sleep(1500); // let enemies walk in
  await page.keyboard.up('ArrowRight');
  await page.screenshot({ path: `${SHOT}/nv_5_wave.png` });

  // Brawl: seek the nearest enemy and strike when in range, like a player
  // would. NOTE: gameplay input is polled per frame, so synthetic presses
  // must be held >= 1 frame (instant press() falls between frames).
  const tap = async (key, hold = 80) => {
    await page.keyboard.down(key);
    await sleep(hold);
    await page.keyboard.up(key);
  };

  let fought = null;
  for (let i = 0; i < 45; i++) {
    const st = await page.evaluate(() => {
      const sc = window.__NV_GAME__.scene.getScene('GameScene');
      const p = sc.players[0];
      const alive = sc.enemies.filter((e) => !e.dead);
      let best = null;
      let bd = 1e9;
      for (const e of alive) {
        const d = Math.abs(e.fx - p.fx);
        if (d < bd) { bd = d; best = e; }
      }
      return {
        score: p.score, combo: p.comboHits, hp: p.hp, n: alive.length,
        dx: best ? best.fx - p.fx : 0,
        dy: best ? best.fy - p.fy : 0,
        dist: bd === 1e9 ? 0 : bd,
      };
    });
    fought = st;
    if (st.score > 0 && st.combo >= 2) break;
    if (st.n === 0) break;
    if (st.dist > 26) {
      const horiz = st.dx > 0 ? 'ArrowRight' : 'ArrowLeft';
      const vert = st.dy > 6 ? 'ArrowDown' : st.dy < -6 ? 'ArrowUp' : null;
      await page.keyboard.down(horiz);
      if (vert) await page.keyboard.down(vert);
      await sleep(170);
      await page.keyboard.up(horiz);
      if (vert) await page.keyboard.up(vert);
    } else {
      await tap('KeyZ');
      await sleep(170);
    }
  }
  check(
    fought && fought.score > 0,
    `combat registers hits (score=${fought?.score}, combo=${fought?.combo}, enemies left=${fought?.n}, hp=${fought?.hp})`
  );
  await page.screenshot({ path: `${SHOT}/nv_6_fight.png` });

  // jump + air kick
  await tap('KeyX');
  await sleep(250);
  await tap('KeyZ');
  await sleep(600);

  // pause overlay
  await tap('Enter');
  await sleep(300);
  await page.screenshot({ path: `${SHOT}/nv_7_pause.png` });
  await tap('Enter');

  // FPS probe
  const fps = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let frames = 0;
        const start = performance.now();
        const tick = () => {
          frames++;
          if (performance.now() - start < 2000) requestAnimationFrame(tick);
          else resolve(Math.round(frames / 2));
        };
        requestAnimationFrame(tick);
      })
  );
  check(fps >= 55, `render loop at ~${fps}fps (expect >=55)`);

  const fatal = consoleErrors.filter((e) => !/favicon|Autoplay|AudioContext/i.test(e));
  check(fatal.length === 0, `no console errors (${fatal.length})${fatal.length ? '\n  ' + fatal.slice(0, 6).join('\n  ') : ''}`);

  console.log(`\nScreenshots written to ${SHOT}/nv_*.png`);
} finally {
  await browser.close();
}

process.exit(failures ? 1 : 0);
