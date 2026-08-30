import { describe, expect, it } from 'vitest';
import { CareerSaveV5Schema, migrateCareerSaveV5, CareerSaveV4Schema } from '../src/index';
import { buildYouthSaveV2Fixture } from './fixtures/youth-save-v2';

describe('CareerSaveV5 边界', () => {
  it('v4 结构存档解析为 v5 并填充默认字段', () => {
    const v4 = {
      ...buildYouthSaveV2Fixture(),
      schemaVersion: 5,
      careerPhase: 'pro-season',
    };
    const v5 = CareerSaveV5Schema.parse(v4);
    expect(v5.schemaVersion).toBe(5);
    expect(v5.clubHistory).toEqual([]);
    expect(v5.nationalTeam).toBeNull();
    expect(v5.totals).toEqual({ appearances: 0, goals: 0, assists: 0, minutes: 0 });
    expect(v5.overseasSince).toBeNull();
    expect(v5.freeAgentSeasons).toBe(0);
    expect(v5.retiredOn).toBeNull();
  });

  it('v4 存档经 migrateCareerSaveV5 保留关键数据并补默认', () => {
    const v4 = CareerSaveV4Schema.parse({
      ...buildYouthSaveV2Fixture(),
      schemaVersion: 4,
      careerPhase: 'free-agent',
    });
    const v5 = migrateCareerSaveV5(v4);
    expect(v5.careerPhase).toBe('free-agent');
    expect(v5.schemaVersion).toBe(5);
    expect(v5.randomState.seed).toBe(v4.randomState.seed);
  });

  it('v5 存档原样通过迁移；retired 阶段合法', () => {
    const v5 = CareerSaveV5Schema.parse({
      ...buildYouthSaveV2Fixture(),
      schemaVersion: 5,
      careerPhase: 'retired',
      retiredOn: '2040-06-30',
    });
    expect(migrateCareerSaveV5(v5)).toEqual(v5);
  });

  it('拒绝非法 retiredOn 类型', () => {
    const raw = {
      ...buildYouthSaveV2Fixture(),
      schemaVersion: 5,
      careerPhase: 'retired',
      retiredOn: 'not-a-date',
    };
    expect(CareerSaveV5Schema.safeParse(raw).success).toBe(false);
  });
});
