import { describe, it, expect } from 'vitest';
import { generateActionPreview, listAllowlistedActions } from '@/lib/ohfixit/allowlist';

describe('OhFixIt allowlist', () => {
  it('lists allowlisted actions', () => {
    const actions = listAllowlistedActions();
    expect(actions.length).toBeGreaterThan(0);
    const ids = actions.map((a) => a.id);
    expect(ids).toContain('flush-dns-macos');
  });

  it('generates preview for a known action', () => {
    const preview = generateActionPreview('flush-dns-macos');
    expect(preview.description).toContain('DNS');
    expect(preview.commands.length).toBeGreaterThan(0);
  });

  it('parameterizes clear-app-cache with bundleId', () => {
    const preview = generateActionPreview('clear-app-cache', { bundleId: 'com.example.app' });
    expect(preview.commands.some((c) => c.includes('com.example.app'))).toBe(true);
  });
});
