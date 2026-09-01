import type {
  CareerSaveV2Like,
  EventChoice,
  EventFeedback,
  YouthEventInstance,
} from '@football/contracts';
import { renderTemplate } from './narrative';
import { selectEventNarrativeVariant } from './narrative-variants';

const RELATIONSHIP_DIMENSIONS = ['trust', 'respect', 'closeness'] as const;

export const buildEventFeedback = (
  before: CareerSaveV2Like,
  after: CareerSaveV2Like,
  event: YouthEventInstance,
  choice: EventChoice,
): EventFeedback => {
  const participants = event.participantIds
    .map((personId) => before.relationships.persons.find((person) => person.id === personId))
    .filter((person): person is NonNullable<typeof person> => Boolean(person));
  const variables = buildTemplateVariables(before, event, participants);
  const selectedNarrative = choice.narrativeVariants
    ? selectEventNarrativeVariant(choice.narrativeVariants, {
        seed: before.randomState.seed,
        eventId: event.eventId,
        choiceId: choice.id,
      })
    : undefined;

  return {
    eventId: event.eventId,
    title: event.title,
    choiceId: choice.id,
    choiceText: renderTemplate(choice.text, variables),
    response: renderTemplate(
      selectedNarrative?.variant.response ??
        choice.response ??
        `${before.player.identity.name}的处理方式让事件暂时告一段落。`,
      variables,
    ),
    participantResponses: buildParticipantResponses(
      selectedNarrative?.variant.responses ?? choice.responses,
      participants,
      variables,
    ),
    stateChanges: buildStateChanges(before, after),
    relationshipChanges: buildRelationshipChanges(before, after, event.participantIds),
    followUp: renderTemplate(
      selectedNarrative?.variant.followUp ??
        choice.followUp ??
        '真正的影响会在接下来的训练和比赛中显现。',
      variables,
    ),
    nextEventIds: choice.nextEventIds ?? event.nextEventIds,
    ...(selectedNarrative ? { narrativeVariantIndex: selectedNarrative.index } : {}),
  };
};

const buildTemplateVariables = (
  save: CareerSaveV2Like,
  event: YouthEventInstance,
  participants: readonly { name: string; role: string }[],
): Record<string, string | number> => {
  const variables: Record<string, string | number> = {
    playerName: save.player.identity.name,
    eventTitle: event.title,
  };
  const variableByRole: Record<string, string> = {
    'youth-coach': 'coachName',
    'assistant-coach': 'assistantCoachName',
    teammate: 'teammateName',
    rival: 'rivalName',
    family: 'familyName',
  };
  for (const role of Object.keys(variableByRole)) {
    const person = participants.find(({ role: personRole }) => personRole === role);
    if (person) variables[variableByRole[role]!] = person.name;
  }
  return variables;
};

const buildParticipantResponses = (
  configuredResponses: EventChoice['responses'],
  participants: readonly { id: string; name: string; role: string }[],
  variables: Record<string, string | number>,
): EventFeedback['participantResponses'] => {
  const configured = configuredResponses ?? [];
  return participants.map((person) => {
    const configuredResponse = configured.find(({ speakerRole }) => speakerRole === person.role);
    const text = configuredResponse
      ? configuredResponse.text
      : defaultParticipantResponse(person.role);
    return {
      personId: person.id,
      personName: person.name,
      role: person.role,
      text: renderTemplate(text, { ...variables, personName: person.name }),
    };
  });
};

const defaultParticipantResponse = (role: string): string => {
  if (role === 'youth-coach' || role === 'assistant-coach') {
    return '{personName}没有立即表态，只说：“接下来用训练表现证明你的选择。”';
  }
  if (role === 'family') return '{personName}记住了你的决定，提醒你照顾好自己。';
  return '{personName}留意到了你的处理方式，关系暂时没有明显变化。';
};

const buildStateChanges = (
  before: CareerSaveV2Like,
  after: CareerSaveV2Like,
): EventFeedback['stateChanges'] => {
  const values = [
    ['morale', before.currentState.morale, after.currentState.morale],
    ['form', before.currentState.form, after.currentState.form],
    ['confidence', before.currentState.confidence, after.currentState.confidence],
    ['fitness', before.health.fitness, after.health.fitness],
    ['fatigue', before.health.fatigue, after.health.fatigue],
    ['coachTrust', before.clubContext.coachEvaluation, after.clubContext.coachEvaluation],
  ] as const;
  return values
    .filter(([, oldValue, newValue]) => oldValue !== newValue)
    .map(([key, oldValue, newValue]) => ({
      key,
      oldValue,
      newValue,
    }));
};

const buildRelationshipChanges = (
  before: CareerSaveV2Like,
  after: CareerSaveV2Like,
  participantIds: readonly string[],
): EventFeedback['relationshipChanges'] =>
  participantIds.flatMap((personId) => {
    const oldPerson = before.relationships.persons.find((person) => person.id === personId);
    const newPerson = after.relationships.persons.find((person) => person.id === personId);
    if (!oldPerson || !newPerson) return [];
    return RELATIONSHIP_DIMENSIONS.flatMap((dimension) => {
      const oldValue = oldPerson.relationship[dimension];
      const newValue = newPerson.relationship[dimension];
      if (oldValue === newValue) return [];
      return [
        {
          personId,
          personName: newPerson.name,
          dimension,
          oldValue,
          newValue,
          delta: newValue - oldValue,
        },
      ];
    });
  });
