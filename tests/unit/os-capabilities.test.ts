import { describe, it, expect } from 'vitest';
import { detectOS, capabilityMap, type OSFamily } from '@/lib/ohfixit/os-capabilities';

describe('os-capabilities', () => {
  it('detectOS should detect macOS from UA and platform', () => {
    expect(detectOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel')).toBe('macOS');
  });

  it('detectOS should detect Windows', () => {
    expect(detectOS('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32')).toBe('Windows');
  });

  it('detectOS should detect Linux', () => {
    expect(detectOS('Mozilla/5.0 (X11; Linux x86_64)', 'Linux x86_64')).toBe('Linux');
  });

  it('detectOS should detect iOS', () => {
    expect(detectOS('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'iPhone')).toBe('iOS');
  });

  it('detectOS should detect Android', () => {
    expect(detectOS('Mozilla/5.0 (Linux; Android 14; Pixel 7)', 'Android')).toBe('Android');
  });

  it('capabilityMap returns sensible defaults and notes', () => {
    const families: OSFamily[] = ['macOS', 'Windows', 'Linux', 'Android', 'iOS', 'Unknown'];
    for (const fam of families) {
      const caps = capabilityMap(fam);
      expect(caps.family).toBe(fam);
      expect(caps.canBrowserAutomate).toBe(true);
      expect(caps.canRunShellScripts).toBe(false);
      expect(Array.isArray(caps.notes)).toBe(true);
      expect(caps.notes && caps.notes.length).toBeGreaterThan(0);
    }
  });
});
