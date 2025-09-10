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

    // Check if the tool exists and is not null/undefined
    if (!t || typeof t !== 'object') {
      excluded.push({ name, reason: 'tool is null, undefined, or not an object' });
      continue;
    }

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

    // Check if execute function exists
    if (typeof (t as any).execute !== 'function') {
      excluded.push({ name, reason: 'missing or invalid execute function' });
      continue;
    }

    // Additional validation: ensure the schema is a valid object
    try {
      // Just verify it's a valid object with safeParse - don't check _zod as it's internal
      if (schema && typeof schema === 'object' && typeof schema.safeParse === 'function') {
        // Try a test parse to ensure the schema is functional
        const testResult = schema.safeParse({});
        // If safeParse works (even if it fails validation), the schema is valid
      } else {
        excluded.push({ name, reason: `schema validation failed: invalid schema structure` });
        continue;
      }
    } catch (err) {
      // If schema validation fails, exclude the tool
      console.error(`Tool ${name} schema validation failed:`, err);
      excluded.push({ name, reason: `schema validation failed: ${err instanceof Error ? err.message : 'unknown error'}` });
      continue;
    }

    included[name] = t;
  }

  const sanitizedActive = activeTools.filter((n) => included[n] !== undefined);
  return { tools: included, activeTools: sanitizedActive, excluded };
}
