import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  advanceCareerMonth,
  completeYouthSeason,
  createCareerSave,
  createYouthCareerV2,
  submitCareerDecision,
} from '@football/application';
import { getYouthContent } from '@football/content';
import type { PlayerAttributes } from '@football/contracts';
import {
  percentile,
  type YouthBalanceReport,
  type YouthSeasonMetrics,
} from './youth-season-metrics';

export const runYouthSeasons = (runs: number, seedStart = 1): YouthBalanceReport => {
  const content = getYouthContent();
  const metrics: YouthSeasonMetrics[] = [];
  for (let seed = seedStart; seed < seedStart + runs; seed += 1) {
    let save = createYouthCareerV2(
      createCareerSave({
        playerName: `球员${seed}`,
        hometown: '上海',
        primaryPosition: 'FORWARD',
        preferredFoot: 'RIGHT',
        weakFootLevel: 35,
        growthBackground: 'academy',
        personalityTendency: 'composed',
        regionId: 'shanghai',
        seed,
      }),
      content,
    );
    const initialAttributes = flatten(save.player.attributes);
    let guard = 0;
    while (!save.season.completed && guard < 100) {
      const outcome = advanceCareerMonth(save, content.academies, content.events);
      save = outcome.save;
      if (outcome.status === 'awaiting-decision') {
        save = submitCareerDecision(save, outcome.event.eventId, outcome.event.choices[0]!.id);
      }
      guard += 1;
    }
    if (!save.season.completed) throw new Error(`种子 ${seed} 未在保护步数内完成`);
    const final = completeYouthSeason(save);
    const finalAttributes = flatten(final.save.player.attributes);
    const growth = Object.keys(initialAttributes).map(
      (key) => finalAttributes[key]! - initialAttributes[key]!,
    );
    const matchFacts = final.save.ledger.filter(({ type }) => type === 'match');
    const totalGoals = matchFacts.reduce((sum, { summary }) => {
      const score = summary.match(/(\d+):(\d+)/);
      return sum + (score ? Number(score[1]) + Number(score[2]) : 0);
    }, 0);
    const decisionFacts = final.save.ledger.filter(({ type }) => type === 'decision');
    metrics.push({
      seed,
      fixtures: final.save.season.fixtures.length,
      decisions: decisionFacts.length,
      totalAttributeGrowth: growth.reduce((sum, value) => sum + value, 0),
      maxAttributeGrowth: Math.max(...growth),
      injuries:
        final.save.health.previousInjuries.length + Number(Boolean(final.save.health.activeInjury)),
      severeInjuries: [
        ...final.save.health.previousInjuries,
        ...(final.save.health.activeInjury ? [final.save.health.activeInjury] : []),
      ].filter(({ kind }) => kind === 'severe').length,
      firstTeamStage: final.save.clubContext.firstTeamStage,
      released: final.outcome.status === 'released',
      goalsPerMatch: matchFacts.length ? totalGoals / matchFacts.length : 0,
      uniqueDecisionEvents: new Set(
        decisionFacts.map(({ id }) => id.split('-').slice(1, -1).join('-')),
      ).size,
      coachEvaluation: final.save.clubContext.coachEvaluation,
      form: final.save.currentState.form,
      confidence: final.save.currentState.confidence,
      playerRole: final.save.clubContext.playerRole,
    });
  }
  const watchStages = new Set([
    'watchlist',
    'training-invite',
    'bench-list',
    'substitute-appearance',
    'starting-appearance',
  ]);
  const appearanceStages = new Set(['substitute-appearance', 'starting-appearance']);
  return {
    runs,
    seedStart,
    metrics,
    summary: {
      completionRate: metrics.length / runs,
      fixtureMedian: percentile(
        metrics.map(({ fixtures }) => fixtures),
        0.5,
      ),
      decisionMedian: percentile(
        metrics.map(({ decisions }) => decisions),
        0.5,
      ),
      attributeGrowthMedian: percentile(
        metrics.map(({ totalAttributeGrowth }) => totalAttributeGrowth),
        0.5,
      ),
      maxAttributeGrowthP90: percentile(
        metrics.map(({ maxAttributeGrowth }) => maxAttributeGrowth),
        0.9,
      ),
      severeInjuryRate: metrics.filter(({ severeInjuries }) => severeInjuries > 0).length / runs,
      firstTeamWatchlistRate:
        metrics.filter(({ firstTeamStage }) => watchStages.has(firstTeamStage)).length / runs,
      firstTeamAppearanceRate:
        metrics.filter(({ firstTeamStage }) => appearanceStages.has(firstTeamStage)).length / runs,
      releaseRate: metrics.filter(({ released }) => released).length / runs,
      goalsPerMatch: metrics.reduce((sum, item) => sum + item.goalsPerMatch, 0) / runs,
      uniqueStoryCombinations: new Set(
        metrics.map(
          ({ decisions, uniqueDecisionEvents }) => `${decisions}:${uniqueDecisionEvents}`,
        ),
      ).size,
    },
  };
};

const flatten = (attributes: PlayerAttributes): Record<string, number> => ({
  ...attributes.technical,
  ...attributes.physical,
  ...attributes.mental,
});

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const readArg = (name: string, fallback: string) =>
    process.argv[process.argv.indexOf(name) + 1] ?? fallback;
  const runs = Number(readArg('--runs', '1000'));
  const seedStart = Number(readArg('--seed-start', '1'));
  const output = resolve(readArg('--output', 'artifacts/youth-balance.json'));
  const report = runYouthSeasons(runs, seedStart);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report.summary, null, 2));
}
