import { describe, expect, it, beforeEach } from 'vitest';
import { bfPath, setBurnFatStandalone } from './paths';

describe('bfPath', () => {
  beforeEach(() => {
    setBurnFatStandalone(false);
  });

  it('prefixes /burnfat when embedded in the WODYBODY app', () => {
    expect(bfPath('/')).toBe('/burnfat');
    expect(bfPath('/create')).toBe('/burnfat/create');
    expect(bfPath('/c/ABC123')).toBe('/burnfat/c/ABC123');
  });

  it('keeps root-relative paths in standalone mode', () => {
    setBurnFatStandalone(true);
    expect(bfPath('/')).toBe('/');
    expect(bfPath('/create')).toBe('/create');
    expect(bfPath('/c/ABC123')).toBe('/c/ABC123');
  });
});
