import { describe, expect, it } from 'vitest';
import { detectFactualContradiction } from '../../src/ai/ai-guard';

const facts = {
  honours: ['asian-cup-champion'],
  appearances: 45,
  currentClub: '杭州城',
  seasons: 4,
  age: 24,
  injuryType: '轻度扭伤',
  durationWeeks: 2,
};

describe('detectFactualContradiction', () => {
  it('flags a fabricated honour', () => {
    const errors = detectFactualContradiction('他赢得了世界杯冠军', facts);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.join('、')).toContain('世界杯');
  });

  it('distinguishes a world cup runner-up honour from a world cup title', () => {
    const errors = detectFactualContradiction('他赢得了世界杯冠军', {
      honours: ['world-cup-runner-up'],
    });

    expect(errors).toContain('世界杯');
  });

  it('flags a new custom honour even when another honour exists', () => {
    const errors = detectFactualContradiction('他还获得了金靴奖', {
      honours: ['asian-cup-champion'],
    });

    expect(errors).toContain('荣誉');
  });

  it('flags an appearance total beyond the small display tolerance', () => {
    const errors = detectFactualContradiction('他共出场50次', facts);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.join('、')).toContain('出场');
  });

  it('accepts an appearance count within the absolute tolerance', () => {
    expect(detectFactualContradiction('他共出场47次', facts)).not.toContain('出场');
  });

  it('rejects an appearance count outside the absolute tolerance even below twenty percent', () => {
    expect(detectFactualContradiction('他共出场48次', facts)).toContain('出场');
  });

  it('rejects an appearance count at the twenty percent boundary', () => {
    expect(detectFactualContradiction('他共出场54次', { appearances: 45 })).toContain('出场');
  });

  it('flags an incorrect current club', () => {
    const errors = detectFactualContradiction('他目前效力皇家马德里', facts);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.join('、')).toContain('俱乐部');
  });

  it('accepts common club-name suffixes for the current club', () => {
    expect(detectFactualContradiction('他目前效力于杭州城足球俱乐部', facts)).not.toContain(
      '俱乐部',
    );
  });

  it('flags a different next club', () => {
    expect(detectFactualContradiction('他的下一站是皇家马德里', facts)).toContain('俱乐部');
  });

  it('flags an unreasonable season or age claim', () => {
    const errors = detectFactualContradiction('他已经经历10个赛季，现年31岁', facts);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.join('、')).toContain('赛季');
    expect(errors.join('、')).toContain('年龄');
  });

  it('flags a mixed-up injury type and duration', () => {
    const errors = detectFactualContradiction('他遭遇重伤，休战2周后艰难恢复', facts);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.join('、')).toContain('伤病');
  });

  it('accepts claims consistent with the fact package', () => {
    const errors = detectFactualContradiction(
      '他共出场45次，效力杭州城，经历4个赛季，现年24岁。轻度扭伤后休战2周。',
      facts,
    );

    expect(errors).toHaveLength(0);
  });
});
