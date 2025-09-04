# Handoff: Guide Steps – Dynamic + Streaming

This document summarizes the current state of the "Guide Me" (guideSteps) feature, the changes implemented, and the exact plan to add streaming structured object generation using the Vercel AI SDK.

## Objectives
- Dynamic, schema-validated troubleshooting plans (no hardcoded issue catalogs).
- Show steps only in the checklist UI; chat text shows one wrap-up sentence when guideSteps is present.
- Implement streaming structured object generation so the plan appears progressively.

## What’s Implemented
- Dynamic plan generation with Zod validation and normalization.
  - File: `lib/ai/tools/ohfixit/guide-steps.ts`
  - Schemas: `GuideStepSchema`, `GuidePlanSchema`.
  - Normalization: stable `id` for each step; robust fallback plan on validation failure.
- No-duplication UI rule for guideSteps output.
  - File: `components/message-parts.tsx`
  - Behavior: when `tool-guideSteps` emits an output, suppress assistant text and render only the wrap-up line.
- Prompt rules updated to reinforce UI behavior.
  - File: `lib/ai/prompts.ts`
- Server route is ready for streaming partial objects.
  - File: `app/(chat)/api/chat/route.ts` (uses AI SDK data stream already for text/tools)

## Pending: Streaming Structured Object Generation
We’ll stream a partial GuidePlan object while the model is generating it, then render progressive updates in the UI until the final normalized plan is returned.

### Server Changes
- In `lib/ai/tools/ohfixit/guide-steps.ts`, switch from one-shot object generation to streaming:
  - Use `streamObject({ model, schema: GuidePlanSchema, ... })` instead of a single `generateObject` call.
  - Iterate over `partialObjectStream` to emit partial plan updates as custom data parts into the existing data stream.
  - Continue to await the final `result.object` (or use `onFinish`) to validate and normalize the plan; return it as the tool output.
  - Error handling: log with context; keep the robust fallback if schema validation fails.

### Client/UI Changes
- Define a lightweight data-part shape for partial plan updates, e.g. `{ type: 'data-guidePlanPartial', value: DeepPartial<GuidePlan> }`.
- Update `components/message-parts.tsx` to:
  - When a `data-guidePlanPartial` appears for the current assistant message, render a “planning…” skeleton that fills in summary and steps as they arrive.
  - When the final `tool-guideSteps` output arrives, replace the partial view with the final `<GuideSteps plan={output} />` component (already implemented).
  - Preserve existing suppression so only the wrap-up sentence shows in chat text.

### Data Flow
- Tool execute() starts `streamObject` → emits partials as data parts → finishes with the validated final output.
- Chat route merges data parts into the message’s stream.
- Renderer picks up partials and progressively shows a draft plan; once final output appears, it shows the normalized checklist.

## Acceptance Criteria
- No hardcoded issue catalogs.
- While guideSteps is running, the user sees partial plan content filling in (summary first, then steps) without flicker.
- When complete, the checklist UI shows the final normalized plan with stable step IDs.
- Assistant chat text shows only the wrap-up sentence when the tool output is present.
- Robust fallback: if streaming or schema validation fails, user still gets a minimal plan with 1–3 generic steps.

## Implementation Notes
- Vercel AI SDK (Context7): `streamObject` exposes `partialObjectStream` for progressive updates and `object`/`onFinish` for final object; supports `output: 'object' | 'array' | 'enum' | 'no-schema'`. Use `onError` to capture stream errors.
- For providers without incremental tool streaming (e.g., Anthropic tools), partial updates may queue and arrive late. Keep UI resilient.
- Keep changes minimal: reuse the message streaming infra already used for tools/text.

## Minimal Test Plan
- Unit: validate `GuidePlanSchema` acceptance and ID normalization for sample model outputs.
- Integration: simulate a stream of partial plan objects and assert UI renders summary and steps progressively.
- E2E (Playwright): trigger Guide Me for a prompt, assert partial UI appears, then final checklist renders and chat text is suppressed accordingly.

## File Touchpoints Overview
- Server tool: `lib/ai/tools/ohfixit/guide-steps.ts`
- Types: `lib/ai/types.ts` (data-part type addition if needed)
- Chat route: `app/(chat)/api/chat/route.ts` (ensure data parts are forwarded)
- Renderer: `components/message-parts.tsx` (partial plan rendering + suppression)
- Checklist: `components/ohfixit/guide-steps.tsx` (unchanged for final plan)

## Next Steps
1) Implement server-side `streamObject` for guideSteps and emit partial data parts.
2) Add client rendering for `data-guidePlanPartial` with graceful merging.
3) Keep final normalization + fallback unchanged; wire tests.
4) Validate UX with long generations and mixed providers.
