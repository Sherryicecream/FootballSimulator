import {
  CareerSaveV2Schema,
  type CareerLedgerEntryV2,
  type CareerSaveV2,
} from '@football/contracts';
import { applyRelationshipEffects } from '@football/simulation';

export const submitCareerDecision = (
  save: CareerSaveV2,
  eventId: string,
  choiceId: string,
): CareerSaveV2 => {
  const event = save.story.pendingEvent;
  if (!event) throw new Error('没有待处理的生涯事件');
  if (event.eventId !== eventId) throw new Error('事件 ID 与当前待处理事件不一致');
  if (event.resolvedChoiceId !== null) throw new Error('该事件已经处理，不能重复提交');
  const choice = event.choices.find(({ id }) => id === choiceId);
  if (!choice) throw new Error(`无效的选择 ID：${choiceId}`);
  const effects = choice.effects;
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
      eventId,
      summary: `[${event.title}] ${choice.text}`,
      season: Number(save.season.startDate.slice(0, 4)),
      week: save.season.currentWeek,
      impact,
    },
  );
  const fact: CareerLedgerEntryV2 = {
    id: `decision-${eventId}-${save.season.currentWeek}`,
    weekKey: `${save.season.startDate.slice(0, 4)}-W${String(save.season.currentWeek).padStart(2, '0')}`,
    type: 'decision',
    summary: `[${event.title}] ${choice.text}`,
    participantIds: event.participantIds,
  };
  return CareerSaveV2Schema.parse({
    ...save,
    currentState,
    health,
    clubContext,
    relationships,
    story: {
      ...save.story,
      activeStorylines: [...new Set([...save.story.activeStorylines, ...event.nextEventIds])],
      completedStoryIds:
        event.storyId && !save.story.completedStoryIds.includes(event.storyId)
          ? [...save.story.completedStoryIds, event.storyId]
          : save.story.completedStoryIds,
      pendingDelayedEffects: choice.delayEffects
        ? [
            ...save.story.pendingDelayedEffects,
            {
              id: `delayed-${eventId}-${choiceId}`,
              sourceEventId: eventId,
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
  });
};

const applyScore = (current: number, delta: number | undefined) =>
  Math.min(100, Math.max(0, current + (delta ?? 0)));
