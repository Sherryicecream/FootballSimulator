import {
  CareerSaveV3Schema,
  CareerSaveV5Schema,
  type CareerLedgerEntryV2,
  type CareerSaveV2Like,
} from '@football/contracts';
import {
  applyRelationshipEffects,
  buildEventFeedback,
  resolveChoiceOutcome,
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
      season: Number(save.season.startDate.slice(0, 4)),
      week: save.season.currentWeek,
      impact,
    },
  );
  const automatic = event.interaction === 'automatic';
  const fact: CareerLedgerEntryV2 = {
    id: `${automatic ? 'event' : 'decision'}-${event.eventId}-${save.season.currentWeek}`,
    weekKey: `${save.season.startDate.slice(0, 4)}-W${String(save.season.currentWeek).padStart(2, '0')}`,
    type: automatic ? 'event' : 'decision',
    summary: resolvedChoice.summary
      ? `[${event.title}] ${choice.text}（${resolvedChoice.summary.label}：${resolvedChoice.summary.reason}）`
      : `[${event.title}] ${choice.text}`,
    participantIds: event.participantIds,
    outcome: resolvedChoice.summary ?? undefined,
  };
  const activeStorylines = save.story.activeStorylines.filter((id) => id !== event.eventId);
  const nextEventIds = resolvedChoice.nextEventIds ?? choice.nextEventIds ?? event.nextEventIds;

  // 按输入版本选择校验 Schema：v4 存档保留 v4 字段，v2/v3 走原路径
  // v3 走原 Schema；v4/v5 归一化为 v5（补默认字段且保留新字段）
  const isV3 = (save as { schemaVersion?: number }).schemaVersion === 3;
  const resolvedSave = {
    ...save,
    schemaVersion: isV3 ? 3 : 5,
    currentState,
    health,
    clubContext,
    relationships,
    story: {
      ...save.story,
      activeStorylines: [...new Set([...activeStorylines, ...nextEventIds])],
      completedStoryIds:
        event.storyId && !save.story.completedStoryIds.includes(event.storyId)
          ? [...save.story.completedStoryIds, event.storyId]
          : save.story.completedStoryIds,
      pendingDelayedEffects: resolvedChoice.delayEffects
        ? [
            ...save.story.pendingDelayedEffects,
            {
              id: `delayed-${event.eventId}-${choiceId}`,
              sourceEventId: event.eventId,
              triggerWeekKey: `${save.season.startDate.slice(0, 4)}-W${String(save.season.currentWeek + 2).padStart(2, '0')}`,
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
  return (isV3 ? CareerSaveV3Schema : CareerSaveV5Schema).parse({
    ...resolvedSave,
    story: {
      ...resolvedSave.story,
      pendingFeedback: event.interaction === 'automatic' ? null : feedback,
    },
  }) as unknown as S;
};

const applyScore = (current: number, delta: number | undefined) =>
  Math.min(100, Math.max(0, current + (delta ?? 0)));
