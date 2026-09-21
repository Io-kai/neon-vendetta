# Four-stage campaign

Play from Neon Ward through Vesper Row, Ash Canal, and Glass Spire. At each clear tally press X to continue; Z returns to title. Score, remaining lives, participating players, and continues carry forward. Health restores at each new stage. An eliminated partner returns with their last life. After Glass Spire, X starts a new campaign with fresh score and continues.

On character selection, press 1–4 to choose the starting stage before readying. All stages are available for practice. The three original playable fighters remain available; the expansion adds six enemy characters.

| Stage | New enemies | Boss | Fight |
|---|---|---|---|
| Vesper Row | Razor, a fast neon knife fighter | Sable | Two blade hits, long recovery; second hit launches in phase two |
| Ash Canal | Husk, a mutated heavy with bone growths | Cinder | Ground shockwave, charge, phase-two jumping slam |
| Glass Spire | Sentinel, a sealed corporate guard | Orison | Wide, telegraphed pulse, charge, faster pursuit in phase two |

New environments are procedural high-resolution canvas architecture with animated lighting. All six new enemies have the full articulated animation set and distinct gear, with large silhouettes for mutated heavies. The gameplay retains the original camera, combat, weapons, food, difficulty, and co-op controls.

Each new stage has only a five-second entrance and five-second exit scene, automatically advanced and skippable. New dialogue was authored by Claude Sonnet 5; exact output is in CAMPAIGN_SCRIPT.json. The original first-stage script is unchanged.

Validation: `npm run build`; `node scripts/campaign-qa.mjs http://127.0.0.1:4175`. Browser QA accelerates combat through the existing damage and wave systems to exercise every gate, boss defeat, and tally transition; it also checks each new boss's attack pattern, phase change, and automatic intro timing. This is functional validation, not a complete human difficulty playtest.
