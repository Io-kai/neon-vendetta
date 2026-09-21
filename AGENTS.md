# NEON VENDETTA — agent guide

Original 16-bit-style side-scrolling beat 'em up (Phaser 3 + TypeScript +
Vite), inspired by Paprium / Streets of Rage. Not affiliated with Paprium.

## State (as of 2026-09-21)

- Git was initialized 2026-09-21 (baseline `a860803`); **no remote yet**.
- Latest commit `52db7da`: weapons pass — data-driven `WEAPON_DEFS`
  (src/actors/Item.ts), new **bat** and **katana** pickups with pixel-art
  maps (src/art/parts.ts), weapon drops from enemies and stage placements
  (src/world/Stage.ts), per-weapon swing stats in `Player.swingWeapon()`,
  low-durability blink on the weapon sprite.
- Build: `npm run build` (tsc --noEmit && vite build → dist/). Green.
- Headless regression: `node scripts/combat-checks.mjs` (11 checks). Green.
- Other QA scripts in scripts/: visual-qa.mjs, e2e.mjs, smoke.ts (Puppeteer;
  use `PUPPETEER_SKIP_DOWNLOAD=true` when installing).

## Deploy & launch (current objective)

- **Vercel-linked**: `.vercel/project.json` → project `neon-vendetta`,
  team `team_BGsbwWsffQg5x0lNc7ermkuK`. `vercel.json` is configured
  (framework vite, output dist, immutable asset caching).
- Deploy path: Vercel CLI from repo root — `vercel` (preview) /
  `vercel --prod` (production). Needs `vercel login` or `VERCEL_TOKEN`.
  **Production deploys are external writes: always get Brian's explicit
  confirmation immediately before `vercel --prod`.** Preview deploys are
  fine to run and share.
- Alternative: connect the repo to Git (`vercel git connect`) once a remote
  exists — currently there is none.
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
