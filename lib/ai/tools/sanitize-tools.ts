import type { Tool } from 'ai';

type AnyTool = Tool<any, any> | { inputSchema?: any; execute?: any; description?: string } | any;

export type SanitizeResult = {
  tools: Record<string, AnyTool>;
  activeTools: string[];
  excluded: Array<{ name: string; reason: string }>;
};

/**
 * Filters a tools map down to only those that have a valid Zod inputSchema and are present in activeTools.
 * A valid Zod schema is heuristically detected via presence of a `safeParse` function.
 */
export function sanitizeTools(
  tools: Record<string, AnyTool>,
  activeTools: string[]
): SanitizeResult {
  const included: Record<string, AnyTool> = {};
  const excluded: Array<{ name: string; reason: string }> = [];

  const set = new Set(activeTools);
  for (const [name, t] of Object.entries(tools)) {
    if (!set.has(name)) continue; // only include active tools

    const schema = (t as any)?.inputSchema;
    if (!schema) {
      excluded.push({ name, reason: 'missing inputSchema' });
      continue;
    }
    // Rough Zod check: safeParse should exist on Zod schemas
    if (typeof schema.safeParse !== 'function') {
      excluded.push({ name, reason: 'inputSchema is not a Zod schema (no safeParse)' });
      continue;
    }
    included[name] = t;
  }

  const sanitizedActive = activeTools.filter((n) => included[n] !== undefined);
  return { tools: included, activeTools: sanitizedActive, excluded };
}
