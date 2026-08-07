import type { RelationshipGraph } from '@football/contracts';
import { addMemory, updateRelationship } from './relationship-manager';

export interface RelationshipEffects {
  trust?: number;
  respect?: number;
  closeness?: number;
}

export const applyRelationshipEffects = (
  graph: RelationshipGraph,
  participantIds: readonly string[],
  effects: RelationshipEffects,
  memory: {
    eventId: string;
    summary: string;
    season: number;
    week: number;
    impact: 'positive' | 'negative' | 'neutral';
  },
): RelationshipGraph => {
  const participants = new Set(participantIds);
  return {
    ...graph,
    persons: graph.persons.map((person) => {
      if (!participants.has(person.id)) return person;
      return addMemory(
        updateRelationship(person, effects),
        memory.eventId,
        memory.summary,
        memory.season,
        memory.week,
        memory.impact,
      );
    }),
  };
};
