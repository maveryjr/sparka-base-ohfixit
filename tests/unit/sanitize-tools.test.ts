import { describe, it, expect } from 'vitest';
import { sanitizeTools } from '@/lib/ai/tools/sanitize-tools';

function makeZodLike() {
  return { safeParse: () => ({ success: true, data: {} }) };
}

describe('sanitizeTools', () => {
  it('includes only tools with inputSchema that has safeParse', () => {
    const tools = {
      good: { inputSchema: makeZodLike(), execute: () => {} },
      badNoSchema: { execute: () => {} },
      badNonZod: { inputSchema: {}, execute: () => {} },
    } as any;

    const { tools: t, activeTools, excluded } = sanitizeTools(tools, ['good', 'badNoSchema', 'badNonZod']);

    expect(Object.keys(t)).toEqual(['good']);
    expect(activeTools).toEqual(['good']);
    expect(excluded.map((e) => e.name).sort()).toEqual(['badNoSchema', 'badNonZod'].sort());
  });

  it('ignores tools not in activeTools', () => {
    const tools = {
      good: { inputSchema: makeZodLike(), execute: () => {} },
      other: { inputSchema: makeZodLike(), execute: () => {} },
    } as any;

    const { tools: t, activeTools, excluded } = sanitizeTools(tools, ['good']);

    expect(Object.keys(t)).toEqual(['good']);
    expect(activeTools).toEqual(['good']);
    expect(excluded).toEqual([]);
  });
});
