# Vercel deployment

The game is a static Vite application. Vercel builds with `npm run build` and serves `dist`. `vercel.json` pins those settings and skips downloading Puppeteer browsers during dependency installation. No backend or application secrets are required.

From this directory, authenticate with `vercel login`, link or create the intended Vercel project with `vercel link`, then publish with `vercel --prod`. Local test outputs and documentation are excluded by `.vercelignore`. Project linking lives in the ignored `.vercel` directory.

Play with a desktop keyboard. Select a starting stage with 1–4 on character selection; Z readies the fighter. Gamepad support is also present. Touch controls have not been implemented.

Production URL: https://neon-vendetta.vercel.app

Project: io-kais-projects/neon-vendetta. Deployment: dpl_4RHtcZSQ92hBJb66HgV9S6ZHdjPE. Vercel production build is READY.

To redeploy from this linked folder: `vercel --prod --scope io-kais-projects`.

Public browser verification passed: anonymous access, asset loading, stage selection, movement, and attack input, with no browser exceptions. Evidence: scripts/vercel-play-qa.mjs.
