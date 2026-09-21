import { describe, expect, it } from 'vitest';
import {
  CareerSaveV7Schema,
  CareerArchiveV1Schema,
  CareerSaveEnvelopeSchema,
  migrateCareerSaveV6,
  migrateCareerSaveV7,
} from '../src';
import { buildYouthSaveV2Fixture } from './fixtures/youth-save-v2';

const createArchiveCandidate = () => {
  const v6 = migrateCareerSaveV6(buildYouthSaveV2Fixture());

  return {
    archiveVersion: 1,
    careerId: v6.careerId,
    player: { ...v6.player, careerStage: 'RETIRED' as const },
    careerEnd: {
      kind: 'voluntary-retirement' as const,
      endedOn: '2040-06-30',
      summary: '正式结束球员生涯。',
      evidenceIds: ['retirement-1'],
    },
    review: {
      tier: 'solid' as const,
      tierLabel: '稳健生涯',
      commentary: '一段踏实而长久的职业生涯。',
      ending: {
        kind: 'voluntary-retirement' as const,
        label: '主动退役',
        summary: '正式结束球员生涯。',
        endedOn: '2040-06-30',
      },
      dimensions: [
        {
          key: 'competition' as const,
          label: '竞技水平',
          score: 60,
          ratingLabel: '出色',
          evidenceIds: [],
        },
      ],
      behindTheScenes: {
        potentials: [
          {
            group: 'technical' as const,
            label: '技术',
            items: [{ key: 'passing', label: '传球', potential: 80, achieved: 70 }],
            fulfillment: 87,
          },
        ],
        traits: [
          {
            key: 'professionalism',
            label: '职业素养',
            value: '70',
            rawValue: '70',
            note: '影响训练收益。',
          },
        ],
        missedOpportunities: [],
      },
      seasons: 1,
      replay: [
        {
          evidenceId: 'retirement-1',
          timeKey: '2040-06-30',
          kind: 'milestone' as const,
          title: '生涯节点',
          summary: '正式结束球员生涯。',
          participantIds: [],
          sourceType: 'retirement' as const,
        },
      ],
      goals: [
        {
          id: 'professional-contract',
          label: '拿到第一份职业合同',
          progress: 1,
          target: 1,
          status: 'complete' as const,
          evidenceIds: [],
        },
      ],
      totals: { appearances: 12, goals: 3, assists: 4, minutes: 720 },
      caps: 2,
      nationalGoals: 1,
      clubs: 2,
      honours: [],
      overseasSpells: false,
      timeline: [
        {
          seasonId: 'pro-2039',
          status: 'retained',
          appearances: 12,
          goals: 3,
          avgRating: 7.1,
        },
      ],
    },
    history: {
      seasonHistory: v6.seasonHistory,
      clubHistory: v6.clubHistory,
      loanHistory: v6.loanHistory,
      nationalTeam: v6.nationalTeam,
      totals: { appearances: 12, goals: 3, assists: 4, minutes: 720 },
      honours: [],
    },
  };
};

describe('CareerArchiveV1 schema', () => {
  it('accepts a compact terminal archive with review and career history', () => {
    const archive = CareerArchiveV1Schema.parse(createArchiveCandidate());

    expect(archive.archiveVersion).toBe(1);
    expect(archive.player.identity.name).toBe('林河');
    expect(archive.review.tier).toBe('solid');
    expect(archive.history.totals.minutes).toBe(720);
  });

  it('rejects runtime-only state from a historical archive', () => {
    const v6 = migrateCareerSaveV6(buildYouthSaveV2Fixture());
    const parsed = CareerArchiveV1Schema.safeParse({
      ...createArchiveCandidate(),
      randomState: v6.randomState,
    });

    expect(parsed.success).toBe(false);
  });
});

describe('CareerSaveEnvelope schema', () => {
  it('distinguishes a complete active save from a read-only archive', () => {
    const active = migrateCareerSaveV7(buildYouthSaveV2Fixture());
    const archive = createArchiveCandidate();

    const activeEnvelope = CareerSaveEnvelopeSchema.parse({
      storageVersion: 2,
      kind: 'active',
      savedAt: '2040-06-30T12:00:00.000Z',
      data: active,
    });
    const archiveEnvelope = CareerSaveEnvelopeSchema.parse({
      storageVersion: 2,
      kind: 'archive',
      savedAt: '2040-06-30T12:00:00.000Z',
      data: archive,
    });

    expect(activeEnvelope.kind).toBe('active');
    expect(archiveEnvelope.kind).toBe('archive');
    if (activeEnvelope.kind === 'active') {
      expect(CareerSaveV7Schema.parse(activeEnvelope.data).randomState.sequencePosition).toBe(0);
    }
  });

  it('rejects a complete active save inside an archive envelope', () => {
    const active = migrateCareerSaveV7(buildYouthSaveV2Fixture());

    const parsed = CareerSaveEnvelopeSchema.safeParse({
      storageVersion: 2,
      kind: 'archive',
      savedAt: '2040-06-30T12:00:00.000Z',
      data: active,
    });

    expect(parsed.success).toBe(false);
  });
});
