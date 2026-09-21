# Neon Vendetta — After Hours

Original side-scrolling arcade brawler with three playable fighters, local co-op, six encounters and a boss. The September 2026 visual upgrade retains the existing combat scaffolding while replacing its presentation.

## Play

```sh
npm install
npm run dev
```

Open the URL Vite prints. For a production build, run `npm run build`, then `npm run preview`.

| Action | Player 1 | Player 2 |
| --- | --- | --- |
| Move | Arrow keys | WASD |
| Attack / pick up | Z | J |
| Jump | X | K |
| Special (costs health on hit) | C | L |
| Join during play | — | J |
| Pause | Enter | Enter |
| Toggle CRT | F | F |
| Toggle music | M | M |

On the title, arrows choose and Enter/Z confirms. On character select, P1 uses left/right and Z; P2 uses A/D and J. X cancels readiness or returns. Options control difficulty, CRT, music and sound effects. Keyboard is required; gamepad support from the scaffold remains but has not been device-tested in this upgrade.

## Visual implementation

- Original generated title illustration and three district panoramas live in `public/art`. They are bundled locally; play makes no image-generation or external asset requests.
- `src/art/city.ts` composes the market, arcade, and depot into a panorama at boot, aligning painted curbs with the game's ground plane. Procedural art is retained as a fallback if those image textures are unavailable.
- `src/art/fighters.ts` draws seven distinct original fighters and their existing animation poses with jointed limbs, shaded clothing, character-specific hair and equipment, and grounded feet.
- `src/art/effects.ts` bakes impact stars and layered shadows. Combat sparks use fixed simulation timing, freeze with pause, and are capped in number.
- Title/select artwork, co-op HUD, progress bar, pickup glints, rain, mist, and restrained CRT filtering share a jade/coral/navy palette.

The original generated PNG artwork is retained at full resolution. Selection portraits are texture frames into the title art; all gameplay sprites remain editable code-based pixel art. No Paprium art or code is used.

## Verification

```sh
npm run build
# Start npm run preview in a separate terminal.
node scripts/e2e.mjs http://localhost:4173
node scripts/visual-qa.mjs http://localhost:4173
```

Tests use Puppeteer. Install its matching Chromium if unavailable (`npx puppeteer browsers install chrome`) or set `PUPPETEER_CACHE_DIR` to an existing cache. The visual checks save screenshots in `.e2e`. They cover menu options, two-player selection, jumps, pause, restart and join-in; the existing E2E drives a real first-wave combat encounter and checks render cadence and errors. District showcase screenshots deliberately position the camera and actors for visual review; they are not evidence of a full campaign playthrough.

The campaign remains a single stage. Boss difficulty and full-campaign balance were not audited in this visual upgrade.


## The Borrowed Night — story edition

Neo-Kowloon workers rent out their sleeping bodies to HELIX. Three awaken inside an order to kill one another. Before dawn, they must free a depot of sleeping neighbors, confront their own complicity, and decide which lives and identities they can protect.

Story is on by default. `E` or Space advances a transmission; Escape skips the scene. Left/right considers a decision and `E`/Space commits. Combat pauses during reading. Choose **STORY: OFF** in Options for uninterrupted arcade replay.

- Title: `E` opens unlocked case files.
- Character select: `E` opens the selected fighter's dossier.
- Gameplay: Tab opens the casebook. Escape closes it.
- Casebook: left/right changes record; `E`/Space advances pages.

Two decisions alter medical supplies, enemy reinforcements, and four distinct ending combinations. Seven case files unlock through progress. Unlocked files and ending IDs persist locally in this browser; blocked or malformed browser storage never prevents play. This is a casebook, not a mid-stage save.

The playable story completes the existing single-stage depot episode. The [story bible](docs/STORY_BIBLE.md) also plots a seven-chapter campaign; chapters two through seven are designs, not additional playable levels.

`node scripts/story-e2e.mjs <preview-url>` checks all choice consequences, four endings, dossier and casebook access, story input isolation, arcade replay, persistence, and malformed-save recovery. It uses controlled encounter/boss-defeat fixtures to exercise narrative paths; ordinary combat is tested separately by `scripts/e2e.mjs`.
