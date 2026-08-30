import { describe, expect, it } from 'vitest';
import { CareerSaveV3Schema, migrateCareerSaveV3, type CareerSaveV2 } from '../src/index';
import { buildYouthSaveV2Fixture } from './fixtures/youth-save-v2';

describe('CareerSaveV3 边界', () => {
  it('v2 结构存档可直接解析为 v3 并填充默认字段', () => {
    const v2 = buildYouthSaveV2Fixture();
    const v3 = CareerSaveV3Schema.parse({ ...v2, schemaVersion: 3 });
    expect(v3.schemaVersion).toBe(3);
    expect(v3.careerPhase).toBe('youth-season');
    expect(v3.contract).toBeNull();
    expect(v3.pendingOffers).toEqual([]);
    expect(v3.agentPreferences).toBeNull();
    expect(v3.offseason).toBeNull();
    expect(v3.seasonHistory).toEqual([]);
    expect(v3.graduationPressure).toBe(0);
    expect(v3.seasonStats).toEqual({
      appearances: 0,
      goals: 0,
      assists: 0,
      ratingSum: 0,
      ratingCount: 0,
    });
  });

  it('v2 存档经 migrateCareerSaveV3 后保留球员身份与随机种子', () => {
    const v2: CareerSaveV2 = buildYouthSaveV2Fixture();
    const v3 = migrateCareerSaveV3(v2);
    expect(v3.player.identity.name).toBe(v2.player.identity.name);
    expect(v3.randomState.seed).toBe(v2.randomState.seed);
    expect(v3.ledger).toEqual(v2.ledger);
  });

  it('v3 存档通过 migrateCareerSaveV3 原样返回', () => {
    const v3 = CareerSaveV3Schema.parse({ ...buildYouthSaveV2Fixture(), schemaVersion: 3 });
    expect(migrateCareerSaveV3(v3)).toEqual(v3);
  });

  it('拒绝非法 v3 字段：合同期限超过 3 年', () => {
    const raw = {
      ...buildYouthSaveV2Fixture(),
      schemaVersion: 3,
      careerPhase: 'youth-season',
      contract: null,
    };
    const bad = {
      ...raw,
      contract: {
        id: 'offer-1',
        clubId: 'club-a',
        clubName: '测试俱乐部',
        clubTier: 5,
        salaryPerYear: 100,
        contractYears: 4,
        squadRole: 'rotation',
        promise: { kind: 'none' },
        releaseClauseNote: '',
        signedOn: '2027-07-01',
      },
    };
    expect(CareerSaveV3Schema.safeParse(bad).success).toBe(false);
  });

  it('拒绝非法阶段值', () => {
    const raw = { ...buildYouthSaveV2Fixture(), schemaVersion: 3, careerPhase: 'retired' };
    expect(CareerSaveV3Schema.safeParse(raw).success).toBe(false);
  });

  it('账本接受休赛期与合同新条目类型', () => {
    const v3 = CareerSaveV3Schema.parse({ ...buildYouthSaveV2Fixture(), schemaVersion: 3 });
    const withNewTypes = CareerSaveV3Schema.parse({
      ...v3,
      ledger: [
        ...v3.ledger,
        {
          id: 'offseason-1',
          weekKey: '2027-W01',
          type: 'offseason-settlement',
          summary: '休赛期结算完成',
          participantIds: [],
        },
        {
          id: 'contract-1',
          weekKey: '2027-W02',
          type: 'contract-signed',
          summary: '签署职业合同',
          participantIds: [],
        },
        {
          id: 'promise-1',
          weekKey: '2028-W01',
          type: 'promise-review',
          summary: '承诺对照完成',
          participantIds: [],
        },
      ],
    });
    expect(withNewTypes.ledger).toHaveLength(v3.ledger.length + 3);
  });
});
