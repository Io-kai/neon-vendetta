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
- Latest work: **hero signature weapons** — each hero fights with an
  innate, unbreakable weapon (src/actors/heroWeapons.ts):
  - Kane "STREETLIGHT" stun baton: 3-hit combo, arc finisher **stuns**
    survivors upright 50 ticks (`HitSpec.stun`), electric crackle motes.
  - Jinx "YELLOWLINE" mono-edge: fastest chain with forward drift,
    dash-slash finisher launches (`HitSpec.slash` crescent arc FX).
  - Bull "FOUNDATION" hydraulic sledge: 2-hit combo, crusher detonates a
    radial **shockwave** (`HitSpec.shockwave`, GameScene.shockwave()).
  - Art: `WPN_MAPS` in src/art/parts.ts baked as `wpn_<id>` textures;
    palette gains c/e/s. `Player.syncWeaponSprite()` renders pickups OR
    the signature (per-weapon grip/carry/swing geometry). Pickups still
    override the signature until they break.
- Build: `npm run build` (tsc --noEmit && vite build → dist/). Green.
- Headless regression: `node scripts/combat-checks.mjs` (16 checks). Green.
- Other QA scripts in scripts/: visual-qa.mjs (29 checks incl. weapon
  pickups + hero signature finishers), e2e.mjs, smoke.ts (Puppeteer;
  use `PUPPETEER_SKIP_DOWNLOAD=true` when installing; puppeteer's pinned
  Chrome is NOT downloaded — run with
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
