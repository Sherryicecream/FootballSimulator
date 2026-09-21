import {
  CareerSaveV3Schema,
  CareerSaveV5Schema,
  CareerSaveV7Schema,
  CareerSaveV8Schema,
  type CareerLedgerEntryV2,
  type CareerSaveV2Like,
  type CareerSaveV4Like,
  type CareerSaveV6Like,
} from '@football/contracts';
import {
  applyRelationshipEffects,
  buildEventFeedback,
  resolveChoiceOutcome,
  stampCareerFact,
} from '@football/simulation';

export const resolveCareerEvent = <S extends CareerSaveV2Like>(save: S, choiceId: string): S => {
  const event = save.story.pendingEvent;
  if (!event) throw new Error('没有待处理的生涯事件');
  if (event.resolvedChoiceId !== null) throw new Error('该事件已经处理，不能重复提交');
  const choice = event.choices.find(({ id }) => id === choiceId);
  if (!choice) throw new Error(`无效的选择 ID：${choiceId}`);

  const resolvedChoice = resolveChoiceOutcome({
    save,
    choice,
    eventId: event.eventId,
    seed: save.randomState.seed,
  });
  const effects = resolvedChoice.effects;
  const currentState = {
    morale: applyScore(save.currentState.morale, effects.morale),
    form: applyScore(save.currentState.form, effects.form),
    confidence: applyScore(save.currentState.confidence, effects.confidence),
  };
  const health = {
    ...save.health,
    fitness: applyScore(save.health.fitness, effects.fitness),
    fatigue: applyScore(save.health.fatigue, effects.fatigue),
  };
  const clubContext = {
    ...save.clubContext,
    coachEvaluation: applyScore(save.clubContext.coachEvaluation, effects.coachTrust),
  };
  const eventTime = eventTimeContextOf(save);
  const effectTotal = Object.values(effects).reduce((sum, value) => sum + value, 0);
  const impact = effectTotal > 0 ? 'positive' : effectTotal < 0 ? 'negative' : 'neutral';
  const relationships = applyRelationshipEffects(
    save.relationships,
    event.participantIds,
    {
      ...(effects.trust !== undefined ? { trust: effects.trust } : {}),
      ...(effects.respect !== undefined ? { respect: effects.respect } : {}),
      ...(effects.closeness !== undefined ? { closeness: effects.closeness } : {}),
    },
    {
      eventId: event.eventId,
      summary: `[${event.title}] ${choice.text}`,
      season: eventTime.season,
      week: eventTime.week,
      impact,
    },
  );
  const automatic = event.interaction === 'automatic';
  const rawFact: CareerLedgerEntryV2 = {
    id: `${automatic ? 'event' : 'decision'}-${event.eventId}-${eventTime.idSuffix}`,
    eventId: event.eventId,
    weekKey: eventTime.weekKey,
    type: automatic ? 'event' : 'decision',
    summary: resolvedChoice.summary
      ? `[${event.title}] ${choice.text}（${resolvedChoice.summary.label}：${resolvedChoice.summary.reason}）`
      : `[${event.title}] ${choice.text}`,
    participantIds: event.participantIds,
    outcome: resolvedChoice.summary ?? undefined,
  };
  const fact = {
    ...stampCareerFact(save as unknown as CareerSaveV6Like, rawFact),
    id: rawFact.id,
  };
  const activeStorylines = save.story.activeStorylines.filter((id) => id !== event.eventId);
  const nextEventIds = resolvedChoice.nextEventIds ?? choice.nextEventIds ?? event.nextEventIds;
  const completedStoryIds = new Set(save.story.completedStoryIds);
  if (event.storyId) completedStoryIds.add(event.storyId);
  if (resolvedChoice.eventOutcome === 'adapted') completedStoryIds.add('cross-country-adapted');

  // 按输入版本选择校验 Schema：v3 → CareerSaveV3Schema；v5 → CareerSaveV5Schema；v6/v7 → CareerSaveV7Schema
  const isV3 = (save as { schemaVersion?: number }).schemaVersion === 3;
  const isV6or7 =
    (save as { schemaVersion?: number }).schemaVersion === 6 ||
    (save as { schemaVersion?: number }).schemaVersion === 7;
  const isV8 = (save as { schemaVersion?: number }).schemaVersion === 8;
  const targetVersion = isV3 ? 3 : isV8 ? 8 : isV6or7 ? 7 : 5;
  const resolvedSave = {
    ...save,
    schemaVersion: targetVersion,
    currentState,
    health,
    clubContext,
    relationships,
    story: {
      ...save.story,
      activeStorylines: [...new Set([...activeStorylines, ...nextEventIds])],
      completedStoryIds: [...completedStoryIds],
      pendingDelayedEffects: resolvedChoice.delayEffects
        ? [
            ...save.story.pendingDelayedEffects,
            {
              id: `delayed-${event.eventId}-${choiceId}`,
              sourceEventId: event.eventId,
              triggerWeekKey: `${eventTime.season}-W${String(eventTime.week + 2).padStart(2, '0')}`,
              effects: choice.delayEffects,
              participantIds: event.participantIds,
            },
          ]
        : save.story.pendingDelayedEffects,
      pendingEvent: null,
    },
    monthlyAdvance: {
      ...save.monthlyAdvance,
      status: 'advancing',
      factIds: [...save.monthlyAdvance.factIds, fact.id],
    },
    ledger: [...save.ledger, fact],
  } as S;
  const feedback = buildEventFeedback(save, resolvedSave, event, choice, resolvedChoice);
  const targetSchema = isV3
    ? CareerSaveV3Schema
    : isV8
      ? CareerSaveV8Schema
      : isV6or7
        ? CareerSaveV7Schema
        : CareerSaveV5Schema;
  return targetSchema.parse({
    ...resolvedSave,
    story: {
      ...resolvedSave.story,
      pendingFeedback: event.interaction === 'automatic' ? null : feedback,
    },
  }) as unknown as S;
};

const applyScore = (current: number, delta: number | undefined) =>
  Math.min(100, Math.max(0, current + (delta ?? 0)));

const eventTimeContextOf = (save: CareerSaveV2Like) => {
  const proSeason = (save as Partial<CareerSaveV4Like>).proSeason;
  const season = Number((proSeason?.startDate ?? save.season.startDate).slice(0, 4));
  const week = proSeason?.currentWeek ?? save.season.currentWeek;
  const paddedWeek = String(week).padStart(2, '0');
  return {
    season,
    week,
    weekKey: `${season}-W${paddedWeek}`,
    idSuffix: `${season}${paddedWeek}`,
  };
};
