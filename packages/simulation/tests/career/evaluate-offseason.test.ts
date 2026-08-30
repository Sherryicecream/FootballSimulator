import { describe, expect, it } from 'vitest';
import { CareerSaveV3Schema, type CareerSaveV3 } from '@football/contracts';
import { createSeededRandomSource } from '../../src/randomness';
import { evaluateOffseason } from '../../src/career/evaluate-offseason';
import { evaluateGraduationEligibility } from '../../src/career/graduation';
import { createYouthSave } from '../fixtures/youth-save';

const NEXT_SEASON_START = '2025-09-01';
const academy = {
  id: 'home',
  name: '浦江青年队',
  regionId: 'test',
  pathway: 'local-academy',
  facilityLevel: 72,
  coachingLevel: 72,
  competitionLevel: 72,
  competitionIntensity: 72,
  developmentStyle: '均衡',
  firstTeamLevel: 72,
  promotionTendency: 55,
  relocationPressure: 20,
} as const;

const asV3 = (overrides: Partial<CareerSaveV3> = {}): CareerSaveV3 =>
  CareerSaveV3Schema.parse({ ...createYouthSave(), schemaVersion: 3, ...overrides });

describe('evaluateOffseason', () => {
  it('同种子同输入产生完全一致的结果', () => {
    const save = asV3();
    const a = evaluateOffseason(save, academy, NEXT_SEASON_START, createSeededRandomSource(7));
    const b = evaluateOffseason(save, academy, NEXT_SEASON_START, createSeededRandomSource(7));
    expect(a).toEqual(b);
  });

  it('结算后进入休赛期阶段，体能重置且疲劳清零', () => {
    const save = asV3({
      health: {
        fitness: 60,
        fatigue: 75,
        recentLoad: 80,
        activeInjury: null,
        previousInjuries: [],
      },
    });
    const { save: next } = evaluateOffseason(
      save,
      academy,
      NEXT_SEASON_START,
      createSeededRandomSource(7),
    );
    expect(next.careerPhase).toBe('offseason');
    expect(next.health.fitness).toBeGreaterThanOrEqual(88);
    expect(next.health.fitness).toBeLessThanOrEqual(96);
    expect(next.health.fatigue).toBe(0);
    expect(next.health.recentLoad).toBe(0);
  });

  it('年龄按出生日期与新赛季开始日期派生并写入简报', () => {
    const save = asV3();
    const { save: next, briefing } = evaluateOffseason(
      save,
      academy,
      NEXT_SEASON_START,
      createSeededRandomSource(7),
    );
    expect(next.player.age).toBe(17);
    expect(briefing.ageUpdate).toEqual({ from: 16, to: 17 });
  });

  it('轻微不适与小伤痊愈，中等伤病剩余恢复期折半带入新赛季', () => {
    const discomfort = asV3({
      health: {
        fitness: 80,
        fatigue: 10,
        recentLoad: 10,
        activeInjury: {
          id: 'inj-1',
          kind: 'discomfort',
          bodyArea: '脚踝',
          occurredWeek: '2025-W40',
          expectedRecoveryWeeks: 2,
          recoveredWeeks: 1,
          recurrenceRisk: 0.1,
        },
        previousInjuries: [],
      },
    });
    const moderate = asV3({
      health: {
        fitness: 80,
        fatigue: 10,
        recentLoad: 10,
        activeInjury: {
          id: 'inj-2',
          kind: 'moderate',
          bodyArea: '大腿',
          occurredWeek: '2025-W38',
          expectedRecoveryWeeks: 6,
          recoveredWeeks: 2,
          recurrenceRisk: 0.2,
        },
        previousInjuries: [],
      },
    });
    const healed = evaluateOffseason(
      discomfort,
      academy,
      NEXT_SEASON_START,
      createSeededRandomSource(7),
    );
    expect(healed.save.health.activeInjury).toBeNull();
    const carried = evaluateOffseason(
      moderate,
      academy,
      NEXT_SEASON_START,
      createSeededRandomSource(7),
    );
    expect(carried.save.health.activeInjury).toMatchObject({
      id: 'inj-2',
      kind: 'moderate',
      expectedRecoveryWeeks: 2,
      recoveredWeeks: 0,
    });
    expect(carried.briefing.healthClearance).toContain('大腿');
  });

  it('休赛期沉淀只影响身体属性且单项变化不超过 1 点', () => {
    const save = asV3();
    const { save: next, briefing } = evaluateOffseason(
      save,
      academy,
      NEXT_SEASON_START,
      createSeededRandomSource(7),
    );
    const paceDelta = next.player.attributes.physical.pace - save.player.attributes.physical.pace;
    const staminaDelta =
      next.player.attributes.physical.stamina - save.player.attributes.physical.stamina;
    expect([0, 1]).toContain(paceDelta);
    expect([0, 1]).toContain(staminaDelta);
    expect(briefing.attributeDrift.length).toBeLessThanOrEqual(2);
    for (const change of briefing.attributeDrift) {
      expect(['pace', 'stamina']).toContain(change.attribute);
      expect(change.newValue - change.oldValue).toBe(1);
    }
  });

  it('声望按赛季表现调整：高评分加分，进球助攻与一线队经历额外加分', () => {
    const strongStats = asV3({
      seasonStats: { appearances: 20, goals: 6, assists: 4, ratingSum: 150, ratingCount: 20 },
      clubContext: {
        ...createYouthSave().clubContext,
        firstTeamStage: 'substitute-appearance',
      },
    });
    const { save: next, briefing } = evaluateOffseason(
      strongStats,
      academy,
      NEXT_SEASON_START,
      createSeededRandomSource(7),
    );
    expect(briefing.reputationChange).toBe(7);
    expect(next.player.reputation).toBe(17);
  });

  it('未达标球员毕业资格为 false 且报告逐条列出四项标准', () => {
    const save = asV3();
    const { graduationEligible, eligibilityReport } = evaluateOffseason(
      save,
      academy,
      NEXT_SEASON_START,
      createSeededRandomSource(7),
    );
    expect(graduationEligible).toBe(false);
    expect(eligibilityReport.map(({ criterion }) => criterion)).toEqual([
      '年龄达标',
      '能力达标',
      '发展信号达标',
      '一线队或教练认可',
    ]);
    expect(eligibilityReport.filter(({ met }) => met).length).toBeGreaterThan(0);
    expect(eligibilityReport.filter(({ met }) => met).length).toBeLessThan(4);
  });

  it('达标球员毕业资格为 true', () => {
    const graduationAcademy = { ...academy, competitionLevel: 60 };
    const strong = asV3({
      player: {
        ...createYouthSave().player,
        age: 18,
        attributes: {
          technical: {
            firstTouch: 70,
            dribbling: 70,
            passing: 70,
            shooting: 70,
            defending: 60,
            aerialAbility: 60,
          },
          physical: { pace: 75, strength: 70, stamina: 72, agility: 70 },
          mental: {
            offTheBall: 70,
            vision: 70,
            decision: 70,
            composure: 70,
            determination: 75,
            discipline: 70,
          },
        },
      },
      clubContext: {
        ...createYouthSave().clubContext,
        coachEvaluation: 75,
        firstTeamStage: 'watchlist',
      },
    });
    const { graduationEligible } = evaluateOffseason(
      strong,
      graduationAcademy,
      NEXT_SEASON_START,
      createSeededRandomSource(7),
    );
    expect(graduationEligible).toBe(true);
  });
});

describe('evaluateGraduationEligibility', () => {
  it('连续拒绝要约后能力门槛放宽 4 点', () => {
    const allFifty = {
      technical: {
        firstTouch: 50,
        dribbling: 50,
        passing: 50,
        shooting: 50,
        defending: 50,
        aerialAbility: 50,
      },
      physical: { pace: 50, strength: 50, stamina: 50, agility: 50 },
      mental: {
        offTheBall: 50,
        vision: 50,
        decision: 50,
        composure: 50,
        determination: 50,
        discipline: 50,
      },
    };
    const weakAcademy = { ...academy, competitionLevel: 25 };
    const base = asV3({
      player: { ...createYouthSave().player, age: 18, attributes: allFifty },
    });
    const normal = evaluateGraduationEligibility(base, weakAcademy);
    const pressured = evaluateGraduationEligibility(
      { ...base, graduationPressure: 2 } as CareerSaveV3,
      weakAcademy,
    );
    const abilityMet = (evaluation: ReturnType<typeof evaluateGraduationEligibility>) =>
      evaluation.report.find(({ criterion }) => criterion === '能力达标')!.met;
    expect(abilityMet(normal)).toBe(false);
    expect(abilityMet(pressured)).toBe(true);
  });
});
