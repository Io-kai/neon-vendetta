# NEON VENDETTA — agent guide

Original 16-bit-style side-scrolling beat 'em up (Phaser 3 + TypeScript +
Vite), inspired by Paprium / Streets of Rage. Not affiliated with Paprium.

## State (as of 2026-09-21)

- Git initialized 2026-09-21 (baseline `a860803`). **Remote**:
  `github.com/Io-kai/neon-vendetta` (public, default branch `main`;
  local `master` tracks `origin/main`). **Vercel git integration is
  connected — pushing to `main` auto-deploys production.**
- **Live production URL: https://neon-vendetta-v334.vercel.app**
  (project `neon-vendetta-v334`, team `io-kais-projects`, created via the
  dashboard git-import 2026-09-21). WARNING: `neon-vendetta.vercel.app`
  is a STALE older project (baseline build, team
  `team_BGsbwWsffQg5x0lNc7ermkuK`, the one in `.vercel/project.json`) —
  it does not receive git deployments. If the clean domain is wanted,
  reassign it in the Vercel dashboard (needs project access).
- History was rewritten once (2026-09-21) to purge a 277MB committed
  puppeteer Chrome (`.cache/`) from the baseline; do not commit `.cache/`.
- Latest work: **power-up weapons + natural carry pose** — heroes fight
  bare-handed (jab/cross/uppercut fist combo); ALL weapons are pickups.
  The pickup arsenal (WEAPON_DEFS in src/actors/Item.ts) now includes
  three rare power-ups with from-scratch art (ITEM_MAPS in
  src/art/parts.ts) and unique hit effects (HitSpec fields):
  - "STREETLIGHT" stun baton: hits **stun** survivors upright 35 ticks
    (`stun`), electric crackle motes. Stage 1 + 4.
  - "YELLOWLINE" mono-edge: dash-through **launching** slashes with a
    crescent arc FX (`slash`, move 2.6). Stage 2 + 4.
  - "FOUNDATION" hydraulic sledge: impact detonates a radial ground
    **shockwave** (`shockwave`, GameScene.shockwave()). Stage 3.
  - WEAPON_DEFS also carries per-weapon grip/angles and an `arc` style
    (swing/smash/stab). `Player.syncWeaponSprite()` pins the grip to the
    hero's LIVE FIST every frame via `fighterArmGeometry(id, frame)`
    (exported from src/art/fighters.ts — the SAME pure math the frame
    renderer uses; renderFighter consumes it, so art and logic cannot
    drift) and sweeps the angle through the arc choreography (carry →
    cocked raise → snap sweep → settle). Weapon hidden on down/launched/
    thrown/grabbed (canvas-rotated frames). Smear trails in stepFx.
    Earlier iterations anchored at fixed hip offsets and read terribly —
    the fist is ~30px higher than the hip, which was the whole problem.
    Palette gains c/e/s; WEAPON_GLOW tints pickup glows.
- Build: `npm run build` (tsc --noEmit && vite build → dist/). Green.
- Headless regression: `node scripts/combat-checks.mjs` (16 checks). Green.
- Other QA scripts in scripts/: visual-qa.mjs (25 checks incl. all weapon
  pickups, carry poses and stun/shockwave FX shots), e2e.mjs, smoke.ts
  (Puppeteer; use `PUPPETEER_SKIP_DOWNLOAD=true` when installing;
  puppeteer's pinned Chrome is NOT downloaded — run with
  `PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome`).

## Deploy & launch

- **Vercel-linked**: `.vercel/project.json` → project `neon-vendetta`,
  team `team_BGsbwWsffQg5x0lNc7ermkuK`. `vercel.json` is configured
  (framework vite, output dist, immutable asset caching).
- **Primary deploy path: push to `main` on GitHub — Vercel auto-builds
  production.** Production deploys are external writes: always get
  Brian's explicit confirmation immediately before pushing.
- CLI path (`vercel` / `vercel --prod`) needs `vercel login` or
  `VERCEL_TOKEN`; the stored OAuth token expired 2026-09 and the CLI's
  failed refresh wiped `~/.local/share/com.vercel.cli/auth.json` — if
  the CLI is needed, Brian must re-login. The CLI also writes its cache
  under `$HOME`, which the DSH sandbox blocks (EROFS) without escalation.
- Verify deployments from GitHub:
  `gh api repos/Io-kai/neon-vendetta/deployments` (+ `/statuses`).
- Local launch: `npm run dev` (vite dev server) or
  `npm run build && npm run preview`.

## Tooling notes

- Node 24 via `dsh-wolfpacs-exec npm ...` if the ambient npm/node is too old.
- Verify before every commit: `npm run build` + `node scripts/combat-checks.mjs`.

## Jev orchestration (from the originating session)

This project was worked on from a DeepSeek Harness session using the Jev
(TypeSafe AI System One) routing/planning tools in
`/home/brian/Development/Repositories/WolfPACS/jev-eval/`:
- `jev_clearance.py` — data-governance gate before delegation. This repo is
  open-source: verdict is normally `open` (all model vendors allowed).
- `jev_plan.py` — cost-aware orchestration planner
  (`--posture conserve --vendor-policy open`).
- `jev_route.py` — per-task worker routing and `--gate` command risk checks.
- Skills `jev-router` and `wolfpacs-ip-clearance` are installed in
  `~/.claude/skills/` and auto-load in new sessions.

### Context from forked session (2026-09-21)

- Hard-won rule (now in the jev-router skill): **subagents cannot escalate
  sandbox writes outside their session workspace** — two workers died
  silently that way. If this session's cwd is this repo, writes are
  in-workspace and normal delegation works; still verify every settled
  worker with `git status`/`git diff` before accepting, and never relaunch
  an identical failed delegation.
- Keep commits small and reversible; the repo had no VCS until 2026-09-21,
  so the baseline discipline matters.
