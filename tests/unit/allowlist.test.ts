import { describe, it, expect } from 'vitest';
import { generateActionPreview } from '@/lib/ohfixit/allowlist';

describe('ohfixit allowlist', () => {
  it('generates preview for flush-dns-macos', () => {
    const preview = generateActionPreview('flush-dns-macos');
    expect(preview.description).toMatch(/DNS/i);
    expect(preview.commands.length).toBeGreaterThan(0);
    expect(Array.isArray(preview.risks)).toBe(true);
  });

  it('parameterizes clear-app-cache with bundleId', () => {
    const bundleId = 'com.example.app';
    const preview = generateActionPreview('clear-app-cache', { bundleId });
    expect(preview.commands.some((c) => c.includes(bundleId))).toBe(true);
  });
});
