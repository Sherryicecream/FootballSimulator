# Balanced Youth Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose each generated player profile, add a balanced condition-driven youth event pool with short story chains and rare trajectories, cap interactive interruptions, and produce distinctive Chinese career summaries without disturbing the existing season balance.

**Architecture:** Extend the event contract with declarative themes, interaction modes, profile/state conditions, and base weights. Keep hard eligibility and dynamic weight calculation in simulation, resolve both interactive and automatic choices through one application-layer reducer, and split new content by narrative responsibility. The web layer receives pure profile and recent-record presentation helpers, while the balance runner measures interaction density and theme diversity.

**Tech Stack:** TypeScript 6/7, Zod, seeded simulation, React 19, Vitest, Testing Library, Playwright, pnpm workspace.

## Global Constraints

- Keep the month-based career loop; do not add weekly player actions.
- A month may contain zero or multiple background changes, but at most two events may interrupt for a player decision.
- Do not expose hidden development traits or numeric relationship values.
- All player-facing copy remains Chinese and all club/person names remain fictional.
- Same save plus same random state remains deterministic.
- Profile/event randomness must not shift the existing match, development, injury, first-team, or season-outcome distributions outside their current balance thresholds.
- No external AI service, runtime dependency, real club brand, or adult-career implementation is added.
- Existing v2 saves load through Zod defaults for every new persisted field.

---

## File Structure

- `packages/contracts/src/event.ts`: declarative event theme, interaction mode, and new hard conditions.
- `packages/contracts/src/youth-season.ts`: persisted theme cooldowns, monthly decision count, and instance interaction mode.
- `packages/contracts/tests/youth-season-v2.test.ts`: schema defaults and backwards-compatible parsing.
- `packages/simulation/src/events/event-selector.ts`: hard eligibility and context-sensitive event weights.
- `packages/simulation/src/career/event-integration.ts`: deterministic weekly event roll, theme cooldowns, chain gating, and interaction cap.
- `packages/simulation/tests/events/event-selector.test.ts`: weight and hard-condition tests.
- `packages/simulation/tests/events/youth-event-selector.test.ts`: v2 save conditions, chain eligibility, and monthly cap tests.
- `packages/application/src/use-cases/resolve-career-event.ts`: shared pure event-choice reducer for manual and automatic resolution.
- `packages/application/src/use-cases/submit-career-decision.ts`: validation wrapper around the shared reducer.
- `packages/application/src/use-cases/advance-career-month.ts`: automatically resolves non-interactive events and continues the month.
- `packages/application/tests/use-cases/advance-career-month-v2.test.ts`: zero-to-many events and maximum-two-interruptions behavior.
- `packages/application/tests/use-cases/submit-career-decision.test.ts`: story progression and delayed-effect regression.
- `packages/content/src/events/youth-events.ts`: existing events plus combined exports from focused new files.
- `packages/content/src/events/one-off-events.ts`: sixteen balanced one-step event definitions.
- `packages/content/src/events/story-events.ts`: two three-step short stories.
- `packages/content/src/events/trajectory-events.ts`: early-prodigy and late-bloomer entry signals.
- `packages/content/src/validation/validate-content.ts`: validates themes, chains, interaction rules, and automatic choices.
- `packages/content/tests/youth-content.test.ts`: content counts, theme coverage, and chain integrity.
- `apps/web/src/career-dashboard/career-presentation.ts`: profile labels, strongest attributes, and priority-based monthly highlights.
- `apps/web/src/career-dashboard/CareerDashboard.tsx`: player-profile card and improved recent records.
- `apps/web/src/app/app.css`: profile card and timeline presentation.
- `apps/web/tests/career-dashboard/career-presentation.test.ts`: profile projection and highlight selection.
- `apps/web/tests/career-dashboard/CareerDashboard.test.tsx`: visible profile and hidden internals.
- `apps/web/tests/e2e/youth-season.spec.ts`: generated profile, monthly decisions, and full-season regression.
- `tools/balance/src/youth-season-metrics.ts`: theme diversity and interaction-density metrics.
- `tools/balance/src/run-youth-seasons.ts`: records new metrics without changing simulation choices.
- `tools/balance/tests/youth-season-balance.test.ts`: asserts completion, balance, decision cap, and diversity.

---

### Task 1: Extend Event and Save Contracts Safely

**Files:**
- Modify: `packages/contracts/src/event.ts`
- Modify: `packages/contracts/src/youth-season.ts`
- Modify: `packages/contracts/tests/youth-season-v2.test.ts`
- Modify: `packages/contracts/tests/save-migration.test.ts`

**Interfaces:**
- Consumes: existing `EventDefinitionSchema`, `YouthStoryStateSchema`, `MonthlyAdvanceCursorSchema`, and `YouthEventInstanceSchema`.
- Produces: `YouthEventTheme`, `EventInteraction`, new `EventCondition` fields, `themeCooldownsByTheme`, `interactiveEventCount`, and `interaction` on event instances.

- [ ] **Step 1: Write failing schema tests for new event metadata**

Add a valid definition using all new fields:

```ts
const conditionalEvent = EventDefinitionSchema.parse({
  id: 'school-pressure',
  version: 1,
  category: 'off-pitch',
  rarity: 'uncommon',
  theme: 'off-pitch',
  interaction: 'decision',
  baseWeight: 24,
  title: '训练与考试',
  description: '考试周与客场安排发生冲突。',
  condition: {
    growthBackground: ['school'],
    personalityTendency: ['disciplined', 'composed'],
    maxMorale: 65,
    minFatigue: 25,
    playerRoles: ['fringe', 'rotation'],
    firstTeamStages: ['none', 'watchlist'],
  },
  choices: [{ id: 'plan', text: '制定计划', riskLabel: 'low', effects: {} }],
  cooldownWeeks: 8,
});
expect(conditionalEvent.theme).toBe('off-pitch');
```

The theme enum is exactly `match | training | relationships | off-pitch | health | trajectory`; interaction is `decision | automatic`; base weight is an integer from 1 to 100.

- [ ] **Step 2: Write failing backwards-compatibility tests for save defaults**

Parse an existing v2 fixture with the new fields omitted and assert:

```ts
const parsed = CareerSaveV2Schema.parse(existingV2Fixture);
expect(parsed.story.themeCooldownsByTheme).toEqual({});
expect(parsed.monthlyAdvance.interactiveEventCount).toBe(0);
```

Parse a `YouthEventInstance` without `interaction` and assert it defaults to `decision` so pending events in existing saves still require user input.

- [ ] **Step 3: Run contract tests and confirm RED**

Run: `pnpm vitest run packages/contracts/tests/youth-season-v2.test.ts packages/contracts/tests/save-migration.test.ts`

Expected: the new schema keys and defaults do not exist.

- [ ] **Step 4: Implement the event metadata schemas**

Add:

```ts
export const YouthEventThemeSchema = z.enum([
  'match',
  'training',
  'relationships',
  'off-pitch',
  'health',
  'trajectory',
]);
export type YouthEventTheme = z.infer<typeof YouthEventThemeSchema>;

export const EventInteractionSchema = z.enum(['decision', 'automatic']);
```

Extend `EventConditionSchema` with arrays for `growthBackground`, `personalityTendency`, `playerRoles`, and `firstTeamStages`, plus integer score bounds `minMorale`, `maxMorale`, `minConfidence`, `maxConfidence`, `minFatigue`, `maxFatigue`, `minCoachEvaluation`, and `maxCoachEvaluation`. Give legacy event definitions defaults `theme: 'off-pitch'`, `interaction: 'decision'`, and `baseWeight` derived by schema default `20`; focused content tasks will explicitly classify every new event.

- [ ] **Step 5: Add persisted defaults to v2 state**

Extend:

```ts
themeCooldownsByTheme: z.record(YouthEventThemeSchema, z.number().int().min(0).max(12)).default({}),
interactiveEventCount: z.number().int().min(0).max(2).default(0),
interaction: EventInteractionSchema.default('decision'),
```

Place them in `YouthStoryStateSchema`, `MonthlyAdvanceCursorSchema`, and `YouthEventInstanceSchema` respectively. Include explicit empty/zero values in v1-to-v2 migration output for readability, even though defaults protect existing v2 saves.

- [ ] **Step 6: Run contract tests and confirm GREEN**

Run: `pnpm vitest run packages/contracts/tests/youth-season-v2.test.ts packages/contracts/tests/save-migration.test.ts`

Expected: all selected tests pass.

- [ ] **Step 7: Run contract typecheck and commit**

Run: `pnpm --filter @football/contracts typecheck`

```bash
git add packages/contracts/src packages/contracts/tests
git commit -m "feat: extend youth event contracts"
```

---

### Task 2: Implement Hard Conditions and Dynamic Event Weights

**Files:**
- Modify: `packages/simulation/src/events/event-selector.ts`
- Modify: `packages/simulation/tests/events/event-selector.test.ts`
- Modify: `packages/simulation/tests/events/youth-event-selector.test.ts`

**Interfaces:**
- Consumes: Task 1 `EventCondition`, `YouthEventTheme`, `EventDefinition.baseWeight`, and player/save context.
- Produces: `calculateYouthEventWeight(event: EventDefinition, save: CareerSaveV2): number` and `selectYouthEvent(eligible: EventDefinition[], save: CareerSaveV2, rng: SeededRandomSource): EventDefinition | undefined`.

- [ ] **Step 1: Write failing hard-condition tests**

Create events requiring school background, disciplined personality, low morale, high fatigue, rotation role, and watchlist stage. Mutate one save field at a time and assert only exact matches survive `filterEligibleYouthEvents`. Include position checking, because the legacy filter currently defines `position` but never evaluates it.

```ts
expect(filterEligibleYouthEvents([schoolEvent], schoolSave)).toHaveLength(1);
expect(filterEligibleYouthEvents([schoolEvent], academySave)).toHaveLength(0);
expect(filterEligibleYouthEvents([forwardEvent], centerBackSave)).toHaveLength(0);
```

- [ ] **Step 2: Run selector tests and confirm RED**

Run: `pnpm vitest run packages/simulation/tests/events/event-selector.test.ts packages/simulation/tests/events/youth-event-selector.test.ts`

Expected: new conditions are ignored.

- [ ] **Step 3: Implement every hard-condition comparison**

Keep `filterEligibleEvents` for legacy v1 calls. In `filterEligibleYouthEvents`, add small helpers `within(value, min, max)` and `includesIfDefined(values, value)`. Evaluate position, profile fields, state scores, club role/stage, facts, injury, people, relocation, story prerequisites, and event cooldown. No weighting function may make a failed hard condition eligible.

- [ ] **Step 4: Write failing weight tests for profile and state modifiers**

Classify fixtures by theme and assert exact relative behavior:

```ts
expect(calculateYouthEventWeight(schoolEvent, schoolSave)).toBeGreaterThan(
  calculateYouthEventWeight(schoolEvent, academySave),
);
expect(calculateYouthEventWeight(trainingEvent, disciplinedSave)).toBeGreaterThan(
  calculateYouthEventWeight(trainingEvent, expressiveSave),
);
expect(calculateYouthEventWeight(healthEvent, fatiguedSave)).toBeGreaterThan(
  calculateYouthEventWeight(healthEvent, restedSave),
);
expect(calculateYouthEventWeight(repeatedThemeEvent, themeCoolingSave)).toBeLessThan(
  calculateYouthEventWeight(repeatedThemeEvent, neutralSave),
);
```

- [ ] **Step 5: Implement explainable dynamic weights**

Start from `event.baseWeight`, multiply by modifiers, then clamp and round to `1..200`. Use these initial multipliers:

```ts
const BACKGROUND_THEME_BONUS = {
  academy: { training: 1.25, relationships: 1.15 },
  school: { 'off-pitch': 1.35, match: 1.1 },
  community: { 'off-pitch': 1.25, relationships: 1.15 },
  'late-bloomer': { training: 1.2, trajectory: 1.25 },
};
```

Apply focused personality modifiers: ambitious boosts `match` and `trajectory`; composed boosts `health` and reduces relationship conflict only through content conditions; disciplined boosts `training`; expressive boosts `relationships` and `off-pitch`. Fatigue `>= 60` boosts health by `1.35`; morale `<= 35` boosts health/off-pitch by `1.2`; coach evaluation `>= 65` boosts match/trajectory by `1.15`. A positive theme cooldown multiplies by `0.45`; no recent theme multiplies by `1.05`, which is the bounded diversity compensation.

- [ ] **Step 6: Replace rarity-only selection for v2 events**

Implement `selectYouthEvent` using `rng.pickWeighted(eligible, weights)` where weight is dynamic weight times rarity factor `common 1`, `uncommon 0.7`, `rare 0.35`, `legendary 0.12`. Leave legacy `selectEvent` intact for v1 compatibility.

- [ ] **Step 7: Run selector tests and commit**

Run: `pnpm vitest run packages/simulation/tests/events/event-selector.test.ts packages/simulation/tests/events/youth-event-selector.test.ts`

```bash
git add packages/simulation/src/events/event-selector.ts packages/simulation/tests/events
git commit -m "feat: weight youth events by career context"
```

---

### Task 3: Enforce Story Gating, Theme Cooldowns, and Two Decisions per Month

**Files:**
- Modify: `packages/simulation/src/career/event-integration.ts`
- Modify: `packages/simulation/tests/events/youth-event-selector.test.ts`
- Modify: `packages/application/src/use-cases/create-youth-career-v2.ts`
- Modify: `packages/application/src/use-cases/advance-career-month.ts`
- Modify: `packages/application/tests/use-cases/advance-career-month-v2.test.ts`

**Interfaces:**
- Consumes: Task 2 `selectYouthEvent()` and Task 1 persisted counters.
- Produces: one event roll per simulated week, strict `nextEvents` chain gating, decremented theme cooldowns, and no more than two decision interruptions in a month.

- [ ] **Step 1: Write failing story-gating tests**

Use an opener with `nextEvents: ['position-review']`, an unrelated event, and a follow-up with `requireStoryId: 'position-race-opened'`. Assert the follow-up is ineligible before the opener memory exists; after resolving the opener, its ID is prioritized only when it appears in `activeStorylines` and its hard condition passes. An active next-event ID must never bypass injury, position, or other hard conditions.

- [ ] **Step 2: Write failing cooldown and interaction-cap tests**

Create a save with `themeCooldownsByTheme: { training: 2 }` and verify the value decrements once per weekly roll. Create a monthly cursor with `interactiveEventCount: 2`; a decision event must not be instantiated, while an automatic event may still resolve. Starting a new month must reset the count to zero.

- [ ] **Step 3: Run focused integration tests and confirm RED**

Run: `pnpm vitest run packages/simulation/tests/events/youth-event-selector.test.ts packages/application/tests/use-cases/advance-career-month-v2.test.ts`

- [ ] **Step 4: Integrate dynamic selection and chain priority**

In `pickYouthEventForWeek`, replace `selectEvent` with `selectYouthEvent`. Filter decision events when `interactiveEventCount >= 2`. When eligible definitions include IDs in `story.activeStorylines`, select from that subset first; otherwise use all eligible definitions. Instantiate `interaction`, increment `interactiveEventCount` only for `decision`, and set theme cooldown to `2` for the selected theme while decrementing existing values.

- [ ] **Step 5: Reset new monthly counters correctly**

Set `interactiveEventCount: 0` when `advanceCareerMonth` starts a different month and when it emits the next report-ready cursor. Preserve it when resuming the same interrupted month. Initialize it explicitly in v2 career creation fixtures and application code.

- [ ] **Step 6: Run focused tests and commit**

Run: `pnpm vitest run packages/simulation/tests/events/youth-event-selector.test.ts packages/application/tests/use-cases/advance-career-month-v2.test.ts`

```bash
git add packages/simulation/src/career/event-integration.ts packages/simulation/tests/events packages/application/src/use-cases/create-youth-career-v2.ts packages/application/src/use-cases/advance-career-month.ts packages/application/tests/use-cases/advance-career-month-v2.test.ts
git commit -m "feat: control monthly youth event flow"
```

---

### Task 4: Share Event Resolution Between Manual and Automatic Events

**Files:**
- Create: `packages/application/src/use-cases/resolve-career-event.ts`
- Modify: `packages/application/src/use-cases/submit-career-decision.ts`
- Modify: `packages/application/src/use-cases/advance-career-month.ts`
- Modify: `packages/application/src/index.ts`
- Modify: `packages/application/tests/use-cases/submit-career-decision.test.ts`
- Modify: `packages/application/tests/use-cases/advance-career-month-v2.test.ts`

**Interfaces:**
- Consumes: pending `YouthEventInstance`, choice effects, and save state.
- Produces: internal `resolveCareerEvent(save: CareerSaveV2, choiceId: string): CareerSaveV2` used by manual submit and month advancement.

- [ ] **Step 1: Write failing reducer-equivalence tests**

For one decision event, compare `submitCareerDecision(save, eventId, choiceId)` with `resolveCareerEvent(save, choiceId)` and assert identical current state, health, coach evaluation, relationships, story memories, delayed effects, ledger, and monthly cursor.

- [ ] **Step 2: Write failing automatic-event flow test**

Provide one `interaction: 'automatic'` definition with exactly one choice. Advance a month and assert it never returns `awaiting-decision`, applies the choice once, writes an event/decision fact, and continues weekly simulation. Add a guard assertion that an automatic event with multiple choices is rejected by content validation in Task 5.

- [ ] **Step 3: Run application tests and confirm RED**

Run: `pnpm vitest run packages/application/tests/use-cases/submit-career-decision.test.ts packages/application/tests/use-cases/advance-career-month-v2.test.ts`

- [ ] **Step 4: Extract the existing resolution body unchanged**

Move state, health, club, relationship, ledger, story, delayed-effect, and cursor updates from `submit-career-decision.ts` into `resolve-career-event.ts`. Keep public validation of event ID, missing event, resolved event, and invalid choice in `submitCareerDecision`; then delegate to the reducer.

- [ ] **Step 5: Resolve automatic events inside month advancement**

After `pickYouthEventForWeek`, if `event?.interaction === 'automatic'`, call `resolveCareerEvent(eventPick.save, event.choices[0]!.id)` and continue the loop. Only return `awaiting-decision` for `decision`. Write a player-facing result fact using the event title and the selected automatic choice, never the English interaction enum.

- [ ] **Step 6: Run application tests and commit**

Run: `pnpm vitest run packages/application/tests/use-cases/submit-career-decision.test.ts packages/application/tests/use-cases/advance-career-month-v2.test.ts`

```bash
git add packages/application/src packages/application/tests/use-cases
git commit -m "feat: resolve automatic youth events"
```

---

### Task 5: Add the Balanced One-Off Event Pool

**Files:**
- Create: `packages/content/src/events/one-off-events.ts`
- Modify: `packages/content/src/events/youth-events.ts`
- Modify: `packages/content/src/validation/validate-content.ts`
- Modify: `packages/content/tests/youth-content.test.ts`

**Interfaces:**
- Consumes: Task 1 event definition fields and Task 4 automatic-event semantics.
- Produces: `balancedOneOffEvents: EventDefinition[]` containing exactly sixteen new one-step definitions.

- [ ] **Step 1: Write failing content-coverage tests**

Assert the new exported array contains sixteen unique IDs, at least two events in each non-trajectory theme, both interaction modes, no unconditional rare/legendary events, and all content validates. Assert automatic definitions have exactly one choice.

- [ ] **Step 2: Run content tests and confirm RED**

Run: `pnpm vitest run packages/content/tests/youth-content.test.ts`

- [ ] **Step 3: Add four match/training events**

Implement these exact IDs and purposes:

- `underdog-starting-call`: conditional recent match/rotation-or-better decision about an unexpected start against stronger opposition.
- `emergency-substitute`: automatic recent-match opportunity with a morale/form signal.
- `costly-match-mistake`: low-form decision between hiding and requesting video review.
- `weak-foot-workshop`: background/personality-weighted training decision with modest fatigue and confidence effects.
- `technical-plateau`: low-confidence training decision between switching focus and patient repetition.
- `recovery-session-warning`: high-fatigue automatic warning that reduces load and records recovery.

Use `match` or `training` themes and cooldowns from 6 to 14 weeks. No choice changes an attribute by more than 1 or a visible state by more than 8.

- [ ] **Step 4: Add five relationship/off-pitch events**

Implement:

- `coach-video-review`: youth-coach decision conditioned on recent match.
- `senior-youth-guidance`: teammate automatic encouragement.
- `teammate-misunderstanding`: relationship decision weighted toward expressive personalities.
- `school-exam-week`: school-background decision with training/rest tradeoff.
- `hometown-community-message`: community-background or non-relocated automatic morale signal.
- `idol-training-note`: rare conditional event following visible monthly growth.
- `local-fan-attention`: uncommon match-performance decision, fictional and locally framed.

Assign participant roles where available without requiring relationship numbers in copy.

- [ ] **Step 5: Add three health/low-period events**

Implement:

- `return-to-full-training`: active/recent injury recovery decision.
- `confidence-slump-talk`: low-confidence decision to talk with a coach or work privately.
- `minor-pain-check`: active-injury automatic medical check that does not create a second injury.

- [ ] **Step 6: Strengthen content validation**

Reject automatic events unless they have exactly one choice. Reject duplicate IDs across the combined pool, real brands, broken next-event references, unknown effects, and rare/legendary definitions without meaningful conditions. Assert every new event explicitly declares theme, interaction, and base weight rather than relying on defaults.

- [ ] **Step 7: Run content tests and commit**

Run: `pnpm vitest run packages/content/tests/youth-content.test.ts`

```bash
git add packages/content/src/events packages/content/src/validation packages/content/tests
git commit -m "feat: add balanced youth one-off events"
```

---

### Task 6: Add Two Short Stories and Two Rare Trajectory Signals

**Files:**
- Create: `packages/content/src/events/story-events.ts`
- Create: `packages/content/src/events/trajectory-events.ts`
- Modify: `packages/content/src/events/youth-events.ts`
- Modify: `packages/content/tests/youth-content.test.ts`
- Modify: `packages/application/tests/use-cases/submit-career-decision.test.ts`

**Interfaces:**
- Consumes: Task 3 active next-event gating and Task 4 shared resolution.
- Produces: `shortStoryEvents` with two three-stage chains and `trajectoryEvents` with two rare entry signals.

- [ ] **Step 1: Write failing story progression tests**

For each chain, resolve each stage and assert the next exact event ID enters `activeStorylines`, the stage memory enters `completedStoryIds`, and unrelated follow-ups remain ineligible. Ensure a chain cannot request two decisions in the same month after the cap is reached.

- [ ] **Step 2: Add the three-stage position competition story**

Create:

1. `position-race-opening`, story memory `position-race-opened`, next `position-race-review`.
2. `position-race-review`, requires the opening memory and recent match/training evidence, next `position-race-resolution`.
3. `position-race-resolution`, requires review memory and ends with one of three choices: compete for the same role, explore a position focus, or cooperate with the rival.

Use rival and youth-coach participants. Effects remain small and affect fatigue, confidence, coach evaluation, or relationship qualities only.

- [ ] **Step 3: Add the three-stage coach trust story**

Create:

1. `coach-trust-opening`, conditioned on coach evaluation at least 50, next `coach-trust-test`.
2. `coach-trust-test`, requires opening memory and offers a difficult training/match responsibility, next `coach-trust-resolution`.
3. `coach-trust-resolution`, requires the test memory and recent evidence; it may yield extra guidance, a cautious reset, or a lost opportunity.

- [ ] **Step 4: Add rare trajectory entries**

Create:

- `early-prodigy-signal`: rare, theme `trajectory`, maturation pace `early` is checked by a new hard condition or an explicit derived eligibility helper; also requires high coach evaluation or first-team watchlist. Choices manage pressure versus ambition and may schedule a delayed confidence effect.
- `late-bloomer-window`: rare, theme `trajectory`, requires growth background `late-bloomer`, later season week, professionalism/stability-derived eligibility, and visible accumulated training. Choices focus on patient growth versus aggressively seeking minutes.

Neither event sets a final outcome or guarantees a first-team stage.

- [ ] **Step 5: Validate chains and run tests**

Run: `pnpm vitest run packages/content/tests/youth-content.test.ts packages/application/tests/use-cases/submit-career-decision.test.ts packages/simulation/tests/events/youth-event-selector.test.ts`

- [ ] **Step 6: Commit story and trajectory content**

```bash
git add packages/content/src/events packages/content/tests packages/application/tests/use-cases/submit-career-decision.test.ts
git commit -m "feat: add youth story and trajectory events"
```

---

### Task 7: Present the Generated Player Profile

**Files:**
- Modify: `apps/web/src/career-dashboard/career-presentation.ts`
- Modify: `apps/web/src/career-dashboard/CareerDashboard.tsx`
- Modify: `apps/web/src/app/app.css`
- Modify: `apps/web/tests/career-dashboard/career-presentation.test.ts`
- Modify: `apps/web/tests/career-dashboard/CareerDashboard.test.tsx`

**Interfaces:**
- Consumes: player identity and visible attributes.
- Produces: `buildPlayerProfile(player: CareerSaveV2['player']): PlayerProfileView` where the view contains Chinese background, personality, weak-foot label, and three strongest attributes.

- [ ] **Step 1: Write failing profile projection tests**

Assert exact mappings:

```ts
expect(profile.background).toBe('校园足球');
expect(profile.personality).toBe('自律');
expect(profile.weakFoot).toBe('较好');
expect(profile.strengths).toEqual([
  { label: '速度', value: 72 },
  { label: '盘带', value: 69 },
  { label: '无球跑动', value: 67 },
]);
```

Tie-break equal values using the stable attribute order from `ATTRIBUTE_LABELS`. Unknown legacy background/personality values display `其他经历` and `尚待观察`, never the internal key.

- [ ] **Step 2: Run presentation tests and confirm RED**

Run: `pnpm vitest run apps/web/tests/career-dashboard/career-presentation.test.ts apps/web/tests/career-dashboard/CareerDashboard.test.tsx`

- [ ] **Step 3: Implement pure profile projection**

Define `PlayerProfileView` and mapping dictionaries in `career-presentation.ts`. Flatten only visible technical, physical, and mental attributes; never read `player.development` hidden fields.

- [ ] **Step 4: Render the profile card**

Place the card after current state and before the full attributes card. Render four text facts and three strength chips. Use existing card tokens, responsive two-column layout, and semantic heading “球员档案”. Do not render potential, professionalism, stability, pressure resistance, adaptability, injury proneness, person IDs, or relationship scores.

- [ ] **Step 5: Run component tests and commit**

Run: `pnpm vitest run apps/web/tests/career-dashboard/career-presentation.test.ts apps/web/tests/career-dashboard/CareerDashboard.test.tsx`

```bash
git add apps/web/src/career-dashboard apps/web/src/app/app.css apps/web/tests/career-dashboard
git commit -m "feat: show generated player profiles"
```

---

### Task 8: Replace Generic Counts with Priority-Based Career Highlights

**Files:**
- Modify: `apps/web/src/career-dashboard/career-presentation.ts`
- Modify: `apps/web/src/career-dashboard/CareerDashboard.tsx`
- Modify: `apps/web/src/app/app.css`
- Modify: `apps/web/tests/career-dashboard/career-presentation.test.ts`
- Modify: `apps/web/tests/career-dashboard/CareerDashboard.test.tsx`

**Interfaces:**
- Consumes: existing Chinese ledger summaries and the latest three calendar months.
- Produces: each `RecentRecord` with two or three prioritized, deduplicated Chinese highlight lines.

- [ ] **Step 1: Write failing highlight-priority tests**

Build one busy month containing settlement, three training facts, two matches, health, first-team, relationship, event, and decision facts. Assert output contains at most three lines and prioritizes first-team, health, and the titled decision over routine training. Build a quiet month and assert repeated training becomes one natural sentence.

- [ ] **Step 2: Write failing sanitization tests**

Assert output never contains event type enums, IDs, numeric relationship labels, bracket syntax, slash-separated training internals, or more than 80 Chinese characters per line. A decision summary `[位置竞争] 请求教练录像复盘` becomes `在位置竞争中，你选择请求教练录像复盘。`.

- [ ] **Step 3: Run presentation tests and confirm RED**

Run: `pnpm vitest run apps/web/tests/career-dashboard/career-presentation.test.ts`

- [ ] **Step 4: Implement scored highlights**

Assign priority `trajectory/event decision 100`, `first-team 90`, `health 80`, `decision 75`, outstanding/upset match 70`, ordinary match 50`, settlement 40`, relationship 35`, training 20`. Convert recognized summaries with focused pure formatters, deduplicate normalized lines, sort by priority then ledger order, and take three. If no high-value fact exists, emit one consolidated training/match line.

- [ ] **Step 5: Render compact highlights and run tests**

Use an unordered list or short paragraphs under the month heading; keep recent three months. Run:

`pnpm vitest run apps/web/tests/career-dashboard/career-presentation.test.ts apps/web/tests/career-dashboard/CareerDashboard.test.tsx`

- [ ] **Step 6: Commit highlight presentation**

```bash
git add apps/web/src/career-dashboard apps/web/src/app/app.css apps/web/tests/career-dashboard
git commit -m "feat: prioritize meaningful career highlights"
```

---

### Task 9: Extend Balance Metrics and Calibrate Event Density

**Files:**
- Modify: `tools/balance/src/youth-season-metrics.ts`
- Modify: `tools/balance/src/run-youth-seasons.ts`
- Modify: `tools/balance/tests/youth-season-balance.test.ts`
- Modify only if calibration fails: event `baseWeight`, rarity, conditions, or cooldowns in `packages/content/src/events/*.ts`

**Interfaces:**
- Consumes: completed event pool and deterministic headless season runner.
- Produces: `decisionP50`, `decisionP90`, `maxDecisionsInMonth`, `themeCoverageRate`, and `uniqueEventCombinations` summary metrics.

- [ ] **Step 1: Write failing metric tests**

For 1,000 seeds assert:

```ts
expect(report.summary.maxDecisionsInMonth).toBeLessThanOrEqual(2);
expect(report.summary.decisionMedian).toBeGreaterThanOrEqual(4);
expect(report.summary.decisionP90).toBeLessThanOrEqual(18);
expect(report.summary.themeCoverageRate).toBeGreaterThanOrEqual(0.65);
expect(report.summary.uniqueEventCombinations).toBeGreaterThanOrEqual(80);
```

Keep every existing growth, injury, first-team, release, match, and completion threshold unchanged.

- [ ] **Step 2: Run balance test and confirm RED for missing metrics**

Run: `pnpm vitest run tools/balance/tests/youth-season-balance.test.ts`

- [ ] **Step 3: Collect exact event and theme metrics**

Resolve event IDs using the known content definitions rather than ambiguous string splitting: find the event whose ID matches the `decision-${event.id}-` prefix. Map IDs to themes, group decision facts by projected month, and compute percentiles with existing `percentile()`.

- [ ] **Step 4: Run 1,000-season calibration**

Run: `pnpm balance:youth -- --runs 1000 --output artifacts/youth-balance-balanced-events.json`

Change only declarative weights, rarity, hard conditions, or cooldowns when a new density/diversity threshold fails. Do not change match, growth, health, first-team, or outcome algorithms to make event metrics pass.

- [ ] **Step 5: Run balance tests and commit**

Run: `pnpm vitest run tools/balance/tests/youth-season-balance.test.ts`

```bash
git add tools/balance packages/content/src/events
git commit -m "test: calibrate balanced youth event variety"
```

---

### Task 10: Complete Browser Flow, Review Findings, and Full Verification

**Files:**
- Modify: `apps/web/tests/e2e/youth-season.spec.ts`
- Modify only files needed to fix regressions caused by Tasks 1-9.
- Modify: `docs/ROADMAP.md` if it still lists this event/profile slice as pending.

**Interfaces:**
- Consumes: completed profile, event flow, content, highlights, and metrics.
- Produces: a clean verified feature branch ready for local `master` integration.

- [ ] **Step 1: Update E2E assertions**

After academy selection assert “球员档案”, one generated background label, and three strength items are visible. During full-season advancement count decision interruptions by month and assert no month exceeds two. Continue resolving the first available choice so the deterministic smoke flow completes on desktop and mobile.

- [ ] **Step 2: Run focused E2E**

Run: `pnpm test:e2e -- apps/web/tests/e2e/youth-season.spec.ts`

Expected: monthly persistence and full-season tests pass for desktop and mobile.

- [ ] **Step 3: Conduct the requested post-implementation review**

Review the branch diff for correctness, architecture, content consistency, accessibility, mobile behavior, deterministic randomness, old-save compatibility, and player-facing English leakage. Fix only issues introduced by or directly exposed through this scope; record larger future work in `docs/ROADMAP.md` rather than expanding the implementation.

- [ ] **Step 4: Run all repository gates**

Run each command independently and require exit code zero:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm test:e2e
pnpm balance:youth -- --runs 1000 --output artifacts/youth-balance-balanced-events.json
git diff --check
```

- [ ] **Step 5: Commit final review corrections if needed**

```bash
git add <only-files-changed-by-final-review>
git commit -m "fix: complete balanced event quality gate"
```

Do not create an empty commit.

- [ ] **Step 6: Finish the branch locally**

Use the `finishing-a-development-branch` skill. The user has already selected local integration without online submission: merge the verified feature branch into local `master`, rerun `pnpm test` on the merged tree, then remove the owned worktree and delete the merged feature branch. Do not push `master` or create a Pull Request.

---

## Self-Review Result

- Spec coverage: player profile, five themes, sixteen one-offs, six short-story stages, two rare trajectory entries, hard conditions, dynamic weights, theme cooldown, two-interruption cap, automatic events, personalized summaries, deterministic balance, final review, and local merge each map to explicit tasks.
- Placeholder scan: every task names concrete files, interfaces, test commands, expected failures, implementation rules, and commits.
- Type consistency: `interaction`, `themeCooldownsByTheme`, `interactiveEventCount`, `calculateYouthEventWeight`, `selectYouthEvent`, `resolveCareerEvent`, and `buildPlayerProfile` are defined before consumption.
- Scope check: the tasks span contracts, simulation, application, content, web, and tooling, but they form one vertical event-experience slice and each intermediate task remains independently testable.
