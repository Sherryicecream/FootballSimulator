import {
  WorldRegistryEntrySchema,
  WorldClubPulseSchema,
  WorldRegistrySchema,
  WorldTransferWindowStateSchema,
  type Country,
  type WorldClubPulse,
  type WorldRegistry,
  type WorldRegistryEntry,
  type WorldTransferWindowState,
} from '@football/contracts';

export type WorldLeagueSummaryInput = Omit<
  WorldRegistryEntry,
  'completed' | 'promoted' | 'relegated'
> &
  Partial<Pick<WorldRegistryEntry, 'completed' | 'promoted' | 'relegated'>>;

export const createWorldRegistry = (): WorldRegistry => WorldRegistrySchema.parse({ entries: [] });

export const readWorldLeague = (
  registry: WorldRegistry,
  country: Country,
  seasonId: string,
): WorldRegistryEntry | undefined =>
  registry.entries.find((entry) => entry.country === country && entry.seasonId === seasonId);

export const writeWorldLeagueSummary = (
  registry: WorldRegistry,
  input: WorldLeagueSummaryInput,
): WorldRegistry => {
  const entry = WorldRegistryEntrySchema.parse({
    ...input,
    completed: input.completed ?? false,
    promoted: input.promoted ?? [],
    relegated: input.relegated ?? [],
  });
  const keyMatches = (candidate: WorldRegistryEntry): boolean =>
    candidate.country === entry.country &&
    candidate.source === entry.source &&
    candidate.seasonId === entry.seasonId;
  const entries = registry.entries.some(keyMatches)
    ? registry.entries.map((candidate) => (keyMatches(candidate) ? entry : candidate))
    : [...registry.entries, entry];
  return WorldRegistrySchema.parse({ ...registry, entries });
};

export const mergeWorldClubPulses = (
  registry: WorldRegistry,
  pulses: readonly WorldClubPulse[],
): WorldRegistry => {
  const pulsesByKey = new Map<string, WorldClubPulse>();
  const setPulse = (pulse: WorldClubPulse): void => {
    const parsed = WorldClubPulseSchema.parse(pulse);
    pulsesByKey.set(JSON.stringify([parsed.clubId, parsed.seasonId]), parsed);
  };

  for (const pulse of registry.clubPulses) setPulse(pulse);
  for (const pulse of pulses) setPulse(pulse);

  // Pulses carry their own rolling counters; keep only the newest compact
  // record per club so the v8 registry remains bounded at 240 clubs.
  const latestByClub = new Map<string, WorldClubPulse>();
  for (const pulse of pulsesByKey.values()) {
    const previous = latestByClub.get(pulse.clubId);
    if (!previous || pulse.seasonId.localeCompare(previous.seasonId) >= 0) {
      latestByClub.set(pulse.clubId, pulse);
    }
  }

  return WorldRegistrySchema.parse({
    ...registry,
    clubPulses: [...latestByClub.values()],
  });
};

export const writeWorldTransferWindow = (
  registry: WorldRegistry,
  input: WorldTransferWindowState,
): WorldRegistry =>
  WorldRegistrySchema.parse({
    ...registry,
    transferWindow: WorldTransferWindowStateSchema.parse(input),
  });

/** 玩家联赛只有一个当前明细来源；转会时移交来源，避免旧联赛继续被推进。 */
export const writePlayerLeagueReference = (
  registry: WorldRegistry,
  input: Omit<WorldLeagueSummaryInput, 'source'>,
): WorldRegistry => {
  return writeWorldLeagueSummary(withoutPreviousPlayerRegistry(registry), {
    ...input,
    source: 'player',
  });
};

const withoutPreviousPlayerRegistry = (registry: WorldRegistry): WorldRegistry =>
  WorldRegistrySchema.parse({
    ...registry,
    entries: registry.entries.filter(({ source }) => source !== 'player'),
  });
