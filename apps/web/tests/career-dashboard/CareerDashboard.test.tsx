import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CareerDashboard } from '../../src/career-dashboard/CareerDashboard';
import type { CareerSave } from '@football/contracts';

const mockSave: CareerSave = {
  schemaVersion: 1,
  contentVersion: 'bootstrap-1',
  careerId: 'test-career',
  player: {
    identity: {
      name: '林岳',
      hometown: '上海',
      homelandId: 'shanghai',
      dateOfBirth: '2008-06-15',
      primaryPosition: 'CENTER_BACK',
      preferredFoot: 'RIGHT',
      weakFootLevel: 30,
      growthBackground: 'academy',
      personalityTendency: 'composed',
    },
    attributes: {
      technical: {
        firstTouch: 50,
        dribbling: 45,
        passing: 55,
        shooting: 30,
        defending: 65,
        aerialAbility: 60,
      },
      physical: { pace: 55, strength: 60, stamina: 50, agility: 45 },
      mental: {
        offTheBall: 40,
        vision: 45,
        decision: 55,
        composure: 50,
        determination: 60,
        discipline: 65,
      },
    },
    hiddenTraits: {
      potential: 80,
      stability: 60,
      professionalism: 70,
      pressureResistance: 60,
      adaptability: 50,
      injuryProneness: 30,
    },
    age: 16,
    careerStage: 'YOUTH',
    reputation: 20,
  },
  world: { currentDate: '2024-09-08', season: 2024, weekNumber: 2 },
  context: {
    academyId: 'shanghai-pujiang',
    pendingOpportunity: null,
    playerState: { fitness: 70, morale: 62, coachTrust: 38, fatigue: 8, teamStatus: 'fringe' },
    pendingEvent: null,
  },
  relationships: { persons: [], activeRelations: [] },
  story: { bootstrapOpportunityWeek: 3, resolvedOpportunityIds: [] },
  ledger: [
    {
      type: 'career-started',
      date: '2024-09-01',
      playerName: '林岳',
      age: 16,
      position: 'CENTER_BACK',
    },
    {
      type: 'youth-opportunity-chosen',
      date: '2024-09-08',
      week: 2,
      offerId: 'offer-shanghai-pujiang',
      academyId: 'shanghai-pujiang',
      academyName: '浦江青训中心',
    },
  ],
  randomState: { seed: 42, sequencePosition: 10 },
};

describe('CareerDashboard', () => {
  it('displays player name', () => {
    render(<CareerDashboard save={mockSave} onSaveUpdate={() => {}} onNewCareer={() => {}} />);
    expect(screen.getByText('林岳')).toBeDefined();
  });

  it('displays the academy name', () => {
    render(<CareerDashboard save={mockSave} onSaveUpdate={() => {}} onNewCareer={() => {}} />);
    const matches = screen.getAllByText(/浦江青训中心/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('displays current date and week', () => {
    render(<CareerDashboard save={mockSave} onSaveUpdate={() => {}} onNewCareer={() => {}} />);
    expect(screen.getByText(/第2周/)).toBeDefined();
  });

  it('has an advance week button', () => {
    render(<CareerDashboard save={mockSave} onSaveUpdate={() => {}} onNewCareer={() => {}} />);
    expect(screen.getByRole('button', { name: /推进一周/i })).toBeDefined();
  });

  it('displays state bars', () => {
    render(<CareerDashboard save={mockSave} onSaveUpdate={() => {}} onNewCareer={() => {}} />);
    expect(screen.getByText('体能')).toBeDefined();
    expect(screen.getByText('士气')).toBeDefined();
    expect(screen.getByText('教练信任')).toBeDefined();
  });

  it('displays attributes', () => {
    render(<CareerDashboard save={mockSave} onSaveUpdate={() => {}} onNewCareer={() => {}} />);
    expect(screen.getByText('停球')).toBeDefined();
    expect(screen.getByText('射门')).toBeDefined();
    expect(screen.getByText('速度')).toBeDefined();
  });
});
