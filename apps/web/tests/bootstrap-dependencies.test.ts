import { describe, it, expect } from 'vitest';
import { createBootstrapContent } from '../src/app/bootstrap-dependencies';

describe('bootstrapDependencies', () => {
  it('creates content port with region lookup', () => {
    const content = createBootstrapContent();
    const shanghai = content.getRegionProfile('shanghai');
    expect(shanghai).toBeDefined();
    expect(shanghai!.name).toBe('上海');
  });

  it('returns undefined for unknown region', () => {
    const content = createBootstrapContent();
    expect(content.getRegionProfile('nonexistent')).toBeUndefined();
  });
});
