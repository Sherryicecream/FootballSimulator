import { expect, it } from 'vitest';
import type { ClubProfile } from '@football/contracts';
import { WorldRegistrySchema } from '@football/contracts';
import { settleWorldTransferWindow } from '../../src/use-cases/settle-world-transfer-window';
import { createWorldRegistry } from '../../src/world/world-registry';

it('persists and reuses the same world transfer window after reload', () => {
  const clubs: ClubProfile[] = [
    {
      id: 'club-a',
      name: '甲队',
      country: 'china',
      tier: 8,
      regionId: 'north',
      positionalNeeds: ['FORWARD'],
      youthCycle: 'stable',
      overseas: false,
      wageBudget: 70,
    },
    {
      id: 'club-b',
      name: '乙队',
      country: 'japan',
      tier: 7,
      regionId: 'tokyo',
      positionalNeeds: ['MIDFIELDER'],
      youthCycle: 'contending',
      overseas: true,
      wageBudget: 65,
    },
  ];
  const input = {
    registry: createWorldRegistry(),
    clubs,
    pulses: [],
    seasonId: 'world-2030',
    window: 'summer' as const,
    seed: 7,
  };
  const first = settleWorldTransferWindow(input);
  const reloaded = WorldRegistrySchema.parse(JSON.parse(JSON.stringify(first.registry)));
  const second = settleWorldTransferWindow({ ...input, registry: reloaded });

  expect(second.activities).toEqual(first.activities);
  expect(second.registry).toEqual(first.registry);
  expect(second.registry.transferWindow?.activities.length).toBeLessThanOrEqual(24);
});
