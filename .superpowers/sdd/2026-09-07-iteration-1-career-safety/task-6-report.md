# Task 6 report: awaited career commits and archive startup

## Delivered

- App now starts in career creation only when no local slots exist; otherwise it opens the archive without auto-loading a slot.
- Added explicit archive continue, create-only-in-memory, damaged-slot visibility, scoped deletion, and record refresh after successful writes and deletes.
- Replaced the v4 App storage adapter with the v6 local career port and routed every persistent career mutation through one awaited commit boundary.
- Failed writes retain the previously committed save and route, expose a player-safe retry action, and retry the exact normalized v6 candidate with its original transition.
- Youth and professional dashboards now open the archive instead of destructively starting a new career, and mutation controls are disabled while a save is pending.

## TDD evidence

- The initial archive regressions were observed RED against the pre-Task-6 behavior: the existing-store and multiple-store explicit-continue cases failed because App used the old v4 port and had no archive route.
- The failed event-choice write regression verifies that a quota error leaves the mandatory event visible and does not expose event feedback.
- The exact-retry regression records the storage-boundary candidates for the failed attempt and retry. Mutation verification changed the retried candidate name from `林岳` to `林岳 mutation`; the test failed on the expected deep-equality difference. Restoring the original `PendingCommit` made the test pass.

## Verification

- `pnpm exec vitest run --project web apps/web/tests/app/App.test.tsx apps/web/tests/persistence/local-storage-save.test.ts apps/web/tests/career-dashboard/CareerDashboard.test.tsx apps/web/tests/career-dashboard/pro-dashboard.test.tsx` — 4 files / 48 tests passed.
- `pnpm exec vitest run --project web apps/web/tests/career-dashboard/CareerDashboardVisuals.test.tsx apps/web/tests/career-dashboard/ProDashboard.test.tsx` — 2 files / 4 tests passed.
- `pnpm --filter @football/web typecheck` — passed.
- `pnpm format:check` — passed.
- `git diff --check` — passed.
- Forbidden-pattern checks found no `void savePort.save`, destructive `newCareer`, App reference to `createLocalStorageCareerV4Port`, or temporary mutation marker.

## Review

- Scope is limited to App, the two dashboard components, their corresponding tests, and this directed evidence report.
- No persistence, contracts, application, simulation, gameplay, balance, weekly-flow, or later-task behavior was changed.
- Self-review found no critical correctness, security, architecture, or performance issue within the Task 6 slice.
