# OhFixIt – Image Upload Chat Error & Tool Schema Fix: Handoff

This handoff captures the investigation, root cause, fixes applied, and the continuation plan for the image-upload chat error and related tool-schema issue.

## What was broken
- Symptom: When sending an image in chat, the UI shows “Something went wrong” and server logs include: Cannot read properties of undefined (reading '_zod').
- Context: Next.js 15.4.2-canary.12 (Turbopack), React 19.1.1, ai@^5.0.23, zod@^4.1.4.
- Path: Chat API uses `streamText` with tools assembled by `getTools`; image attachments are passed as FileUIParts to `generateImage` tool.

## Root cause
- Several AI SDK tools defined their input schema with a non-standard key `parameters` instead of the required `inputSchema` (AI SDK v5).
- AI SDK attempted to access the Zod internals on an undefined schema, triggering `_zod` read on undefined.
- Confirmed via current AI SDK docs: tools must specify `inputSchema` (Zod or JSON Schema).

## Fixes applied
- Standardized tool definitions to use `inputSchema` and resolved Zod v4 typing issues:
  - `lib/ai/tools/screenshot-capture.ts` – parameters → inputSchema.
  - `lib/ai/tools/ui-automation.ts` – parameters → inputSchema; corrected `z.record(z.string(), z.any())`; removed stray text line.
  - `lib/ai/tools/computer-use.ts` – parameters → inputSchema; added `PlanStep` interface and adjusted function signatures.
- Left `lib/ai/tools/stock-chart.ts` unchanged (already correct, served as reference).
- Typecheck hygiene: Updated `tsconfig.json` to exclude `.next` artifacts and removed `.next/types/**/*.ts` from include to avoid noise from generated types.

## References (Context7 research)
- AI SDK tool definition requires `inputSchema` (Zod or JSON Schema) and optional `execute`.
- Prefer `.nullable()` over `.optional()` for maximum provider compatibility on optional fields.
- Zod v4 requires both key and value types with `z.record`, e.g., `z.record(z.string(), z.any())`.

## Files of interest
- Chat orchestration: `app/(chat)/api/chat/route.ts` (streamText, tools, attachments flow)
- Tools registry: `lib/ai/tools/tools.ts`
- Image generation/editing: `lib/ai/tools/generate-image.ts`
- Modified tools:
  - `lib/ai/tools/screenshot-capture.ts`
  - `lib/ai/tools/ui-automation.ts`
  - `lib/ai/tools/computer-use.ts`
- Tool catalog/costs: `lib/ai/tools/tools-definitions.ts`
- Types: `lib/ai/types.ts`
- Typecheck config: `tsconfig.json` (exclude `.next`)

## Current state
- Tool schema mismatch fixed where detected; Zod v4 record typing corrected; compile is clean for modified files.
- Repository-wide typecheck now excludes `.next`; focus remains on source code.
- Pending runtime verification: Start dev server and re-send an image to chat; watch server logs.

## How to verify (runtime)
1) Start the dev server.
2) Open chat UI, upload an image (png/jpg), send message.
3) Expectation: No `_zod` error; assistant can proceed (may call `generateImage` or handle attachments normally). Monitor logs for `streamText` tool registration or validation errors.

## Suggested regression test (follow-up)
- Add an integration-style test that simulates a chat POST with a UIMessage containing a file part (image/*). Assert that the route returns a 200 streaming response without tool schema errors.
- Consider a unit test on `getTools` to ensure every tool has an `inputSchema` and that Zod schemas compile for Zod v4.

## Open follow-ups / risks
- Some API routes unrelated to the chat may have pre-existing type issues (e.g., next-auth v5 import style, z.record usage). Not required for this fix but worth stabilizing subsequently.
- Ensure all custom tools (including OhFixIt automation) consistently use `inputSchema`; audit remaining tools as part of hardening.
- Provider strictness: Prefer `.nullable()` when parameters are optional.

## Rollback
- If needed, revert the changes in the three modified tool files and `tsconfig.json` via git.

## Notes
- This change aligns the codebase with AI SDK v5 tool requirements and resolves the crash when the SDK expects a Zod-backed schema.
- Keep future tool additions consistent: always define `inputSchema`, annotate with `.describe()`, and avoid `.optional()` in favor of `.nullable()` when possible.

---
Maintainer: add verification notes and logs after runtime smoke test here.
