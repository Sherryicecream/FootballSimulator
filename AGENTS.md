# Football Simulator Development Guide

- `spec.md` is the long-term product baseline, `docs/ROADMAP.md` is the only progress entry, and the single active plan under `docs/superpowers/plans/` is the execution source.
- The browser uses the v2 monthly career flow. Do not reintroduce player-facing weekly advance or fast-forward actions.
- `packages/simulation` must remain deterministic and free of external runtime dependencies. Pass content and seeded randomness in explicitly.
- `packages/application` owns orchestration and pause/resume behavior; UI components must not reproduce simulation rules.
- Major events require career facts, injuries, people, or story state. Event effects may only change explicitly participating people.
- Visible development settles monthly; fractional progress, fatigue, fixtures, cooldowns, event cursors, and random position must survive save/reload.
- Add a failing regression test before changing behavior. Before completion run `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm test:e2e`, and the 1,000-season balance command documented in the roadmap.
