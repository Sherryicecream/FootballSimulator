import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BootstrapCareerSummary } from '../../src/career-dashboard/BootstrapCareerSummary';
import type { CareerSave } from '@football/contracts';

const mockSave: CareerSave = {
  schemaVersion: 1,
  contentVersion: 'bootstrap-1',
  careerId: 'career-test',
  player: {
    identity: {
      name: '张伟', hometown: '上海', dateOfBirth: '2008-06-15',
      primaryPosition: 'CENTER_BACK', secondaryPosition: 'FULL_BACK',
      preferredFoot: 'RIGHT', weakFootLevel: 30,
      growthBackground: '城市青训', personalityTendency: 'balanced',
    },
    attributes: {
      technical: { firstTouch: 60, dribbling: 65, passing: 70, shooting: 55, defending: 50, aerialAbility: 62 },
      physical: { pace: 78, strength: 68, stamina: 72, agility: 74 },
      mental: { offTheBall: 60, vision: 65, decision: 63, composure: 67, determination: 75, discipline: 70 },
    },
    hiddenTraits: {
      potential: 85, stability: 70, professionalism: 75,
      pressureResistance: 65, adaptability: 60, injuryProneness: 40,
    },
    age: 16, careerStage: 'YOUTH', reputation: 20,
  },
  world: { currentDate: '2024-09-15', season: 2024 },
  context: { academyId: 'academy-b', pendingOpportunity: null },
  relationships: { people: [], edges: [] },
  story: { bootstrapOpportunityWeek: 3, resolvedOpportunityIds: ['offer-2'] },
  ledger: [
    { type: 'career-started', date: '2024-09-01', playerName: '张伟', age: 16, position: 'CENTER_BACK' },
    { type: 'week-advanced', date: '2024-09-08', week: 2 },
    { type: 'week-advanced', date: '2024-09-15', week: 3 },
    { type: 'youth-opportunity-chosen', date: '2024-09-15', week: 3, offerId: 'offer-2', academyId: 'academy-b', academyName: '校园精英计划' },
  ],
};

describe('BootstrapCareerSummary', () => {
  it('renders player name and age', () => {
    render(<BootstrapCareerSummary save={mockSave} />);
    expect(screen.getByText('张伟')).toBeDefined();
    expect(screen.getByText(/16岁/)).toBeDefined();
  });

  it('shows academy placement', () => {
    render(<BootstrapCareerSummary save={mockSave} />);
    expect(screen.getByText((content) => content.includes('校园精英计划'))).toBeDefined();
  });

  it('shows attribute summary', () => {
    render(<BootstrapCareerSummary save={mockSave} />);
    expect(screen.getByText('60')).toBeDefined();
    expect(screen.getByText('78')).toBeDefined();
  });

  it('shows seed fingerprint', () => {
    render(<BootstrapCareerSummary save={mockSave} />);
    expect(screen.getByText(/career-test/)).toBeDefined();
  });
});