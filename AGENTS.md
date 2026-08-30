# Football Simulator Development Guide

- `spec.md` is the long-term product baseline, `docs/ROADMAP.md` is the only progress entry, and the single active plan under `docs/superpowers/plans/` is the execution source.
- The browser uses the v3 monthly career flow. Do not reintroduce player-facing weekly advance or fast-forward actions.
- `packages/simulation` must remain deterministic and free of external runtime dependencies. Pass content and seeded randomness in explicitly.
- `packages/application` owns orchestration and pause/resume behavior; UI components must not reproduce simulation rules.
- Major events require career facts, injuries, people, or story state. Event effects may only change explicitly participating people.
- Visible development settles monthly; fractional progress, fatigue, fixtures, cooldowns, event cursors, and random position must survive save/reload.
- Add a failing regression test before changing behavior. Before completion run `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm test:e2e`, and the 1,000-season balance command documented in the roadmap.
- The career uses the v3 phase machine (`youth-season → offseason → agent-preferences → offer-review → professional-contract`). Phase transitions happen only through application use cases; never mutate `careerPhase` in the web layer. Signing a contract is terminal for the current milestone and requires a one-step confirmation.
- Offer eligibility combines an interest score with an ability-based tier ceiling; keep the ladder monotone when tuning balance constants, and update the design doc alongside any change.

- Professional phase uses the v4 save (`proSeason`, `proSeasonStats`, `promiseReviews`). Pro season state is fixed at creation (fixtures, standings, squad); `proSeason.fixtures` holds the whole league schedule, so per-club stats must filter by `clubId`. Promise reviews attribute causes (`injury`/`club`/`player`) and must stay explainable from the ledger.
