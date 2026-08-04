import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { Position, Foot, CareerStage, PositionSchema, FootSchema, CareerStageSchema } from '../src/primitives';

describe('Position', () => {
  it('has all outfield positions excluding goalkeeper', () => {
    expect(Position.CenterBack).toBe('CENTER_BACK');
    expect(Position.FullBack).toBe('FULL_BACK');
    expect(Position.DefensiveMidfielder).toBe('DEFENSIVE_MIDFIELDER');
    expect(Position.Midfielder).toBe('MIDFIELDER');
    expect(Position.Winger).toBe('WINGER');
    expect(Position.Forward).toBe('FORWARD');
    // Goalkeeper explicitly excluded per spec §3.2
    expect(Object.keys(Position).length).toBe(6);
  });

  it('validates positions via Zod schema', () => {
    expect(PositionSchema.parse('CENTER_BACK')).toBe('CENTER_BACK');
    expect(() => PositionSchema.parse('GOALKEEPER')).toThrow();
    expect(() => PositionSchema.parse('INVALID')).toThrow();
  });
});

describe('Foot', () => {
  it('has left, right, and both', () => {
    expect(Foot.Left).toBe('LEFT');
    expect(Foot.Right).toBe('RIGHT');
    expect(Foot.Both).toBe('BOTH');
  });

  it('validates via Zod schema', () => {
    expect(FootSchema.parse('LEFT')).toBe('LEFT');
    expect(FootSchema.parse('RIGHT')).toBe('RIGHT');
    expect(FootSchema.parse('BOTH')).toBe('BOTH');
    expect(() => FootSchema.parse('AMBIDEXTROUS')).toThrow();
  });
});

describe('CareerStage', () => {
  it('has all career stages', () => {
    expect(CareerStage.Youth).toBe('YOUTH');
    expect(CareerStage.Professional).toBe('PROFESSIONAL');
    expect(CareerStage.Peak).toBe('PEAK');
    expect(CareerStage.Decline).toBe('DECLINE');
    expect(CareerStage.Retired).toBe('RETIRED');
  });

  it('validates via Zod schema', () => {
    expect(CareerStageSchema.parse('YOUTH')).toBe('YOUTH');
    expect(CareerStageSchema.parse('RETIRED')).toBe('RETIRED');
    expect(() => CareerStageSchema.parse('UNKNOWN')).toThrow();
  });
});