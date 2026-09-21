import { describe, expect, it } from 'vitest';
import { migrateCareerSaveV5 } from '@football/contracts';
import {
  enterOffseason,
  completeYouthSeason,
  generateContractOffers,
  signContract,
  startProfessionalSeason,
  submitAgentPreferences,
} from '../../src';
import { createSave, content, finishSeason } from '../fixtures/youth-save';

const signedSave = () => {
  const completed = completeYouthSeason(finishSeason(createSave(42)));
  let save = enterOffseason(completed.save, content.academies).save;
  save = {
    ...save,
    offseason: save.offseason ? { ...save.offseason, graduationEligible: true } : save.offseason,
  };
  save = submitAgentPreferences(save, {
    leagueTierBias: 'balanced',
    priority: 'playing-time',
  });
  save = generateContractOffers(save, content);
  const offer = save.pendingOffers[0]!;
  return migrateCareerSaveV5(signContract(save, offer.id));
};

describe('professional person continuity', () => {
  it('keeps same-club competitors traceable across consecutive seasons', () => {
    const first = startProfessionalSeason(signedSave(), content.clubs);
    const next = startProfessionalSeason(
      {
        ...first,
        careerPhase: 'pro-offseason',
        proSeason: { ...first.proSeason!, completed: true },
      },
      content.clubs,
    );
    const previousById = new Map(first.proSeason!.squad.map((member) => [member.personId, member]));
    const retained = next.proSeason!.squad.filter((member) => previousById.has(member.personId));

    expect(retained.length).toBeGreaterThanOrEqual(Math.ceil(first.proSeason!.squad.length * 0.6));
    expect(retained.length).toBeLessThanOrEqual(Math.floor(first.proSeason!.squad.length * 0.7));
    for (const member of retained) {
      const previous = previousById.get(member.personId)!;
      expect(member.name).toBe(previous.name);
      expect(member.currentAbility).toBe(previous.currentAbility);
      expect(member.traits).toEqual(previous.traits);
      expect(member.relationshipToPlayer).toBe(previous.relationshipToPlayer);
    }
  });

  it('does not transfer the previous club squad into a new club', () => {
    const first = startProfessionalSeason(signedSave(), content.clubs);
    const target = content.clubs.find(
      ({ id, tier }) => id !== first.proSeason!.clubId && tier === first.contract!.clubTier,
    )!;
    const moved = startProfessionalSeason(
      {
        ...first,
        careerPhase: 'pro-offseason',
        contract: {
          ...first.contract!,
          clubId: target.id,
          clubName: target.name,
        },
        proSeason: { ...first.proSeason!, completed: true },
      },
      content.clubs,
    );

    expect(moved.proSeason!.clubId).toBe(target.id);
    expect(
      moved.proSeason!.squad.some(({ personId }) =>
        first.proSeason!.squad.some((member) => member.personId === personId),
      ),
    ).toBe(false);
    expect(
      moved.proSeason!.squad.every(({ personId }) => personId.startsWith(target.id + '-')),
    ).toBe(true);
  });
});
