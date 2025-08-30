import { describe, it, expect } from 'vitest';
import { AutomationPlanSchema } from '@/lib/ai/tools/ohfixit/automation';

describe('AutomationPlan', () => {
  it('validates a minimal plan', () => {
    const parsed = AutomationPlanSchema.parse({
      summary: 'Test plan',
      actions: [
        {
          type: 'open_url',
          id: 'a1',
          title: 'Open site',
          url: 'https://example.com',
        },
      ],
    });
    expect(parsed.summary).toBe('Test plan');
    expect(parsed.actions[0].type).toBe('open_url');
  });

  it('rejects invalid action types', () => {
    expect(() =>
      AutomationPlanSchema.parse({
        summary: 'Bad plan',
        actions: [
          { type: 'do_magic', id: 'x', title: 'x' } as any,
        ],
      }),
    ).toThrow();
  });
});
