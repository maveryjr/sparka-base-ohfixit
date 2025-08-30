---
applyTo: '**'
---

# User Memory

## User Preferences
- Programming languages: TypeScript/JavaScript
- Code style preferences: Follow existing project conventions; minimal diffs; typed schemas; tests before/after when feasible
- Development environment: VS Code on macOS with zsh
- Communication style: Concise but thorough; progress checklists; concrete actions; avoid filler

## Project Context
- Current project type: Next.js AI chat app with tools, streaming, and artifacts
- Tech stack: Next.js App Router, Vercel AI SDK v5, Drizzle ORM, TRPC, shadcn/ui, Playwright, Biome
- Architecture patterns: Tool-calling via AI SDK, streaming chat endpoint, components for messages and attachments
- Key requirements: Implement OhFixIt MVP (Screen Capture + Guide Me) under issue #5; privacy/consent gates; robust testing
 - Key integration points discovered:
	 - Attachment lifecycle centralized in `providers/chat-input-provider.tsx` (state) and `components/multimodal-input.tsx` (UI + upload)
	 - Upload path via `POST /api/files/upload` and helper `uploadFile` inside `components/multimodal-input.tsx`
	 - Attachment preview using `components/attachment-list.tsx` and `components/preview-attachment.tsx`
	 - Model auto-switching for images/PDFs in `multimodal-input.tsx`
	 - Chat input surface composed from `PromptInput` + `ChatInputTextArea` with toolbar `PromptInputToolbar`

## Coding Patterns
- Preferred patterns and practices: Small, incremental changes; strong typing for tool schemas; register tools in central registry; UI components co-located under components/*; server tools under lib/ai/tools/*
- Code organization preferences: New feature namespace under components/ohfixit and lib/ai/tools/ohfixit
- Testing approaches: Unit tests for tool schemas and reducers; Playwright for E2E capture/attach flow
- Documentation style: docs/ohfixit-integration-issue.md as authoritative spec; update README or docs selectively

## Context7 Research History
- Libraries researched on Context7:
	- /vercel/ai (AI SDK v5): tools with zod schemas; streamText server usage; toUIMessageStreamResponse; tool streaming default; onError handlers; multi-step with stopWhen
	- /vercel/next.js (App Router): route handlers using Web Request/Response; streaming with ReadableStream; caching and dynamic rendering notes
- Best practices discovered:
	- Define tools with tool({ description, inputSchema, execute }) and register in streamText; tool streaming is default in v5
	- Use route handlers in app/**/route.ts for server endpoints; prefer cache: 'no-store' for dynamic diagnostics
	- Use onFinish/onStepFinish to inspect tool results if needed; UI can render tool part states
- Implementation patterns used: AI SDK v5 streamText with tools; media capture via getDisplayMedia; attachment flows; tool registry in lib/ai/tools/tools.ts
- Version-specific findings:
	- AI SDK v5 uses result.toUIMessageStreamResponse for UI streaming
	- streamText is synchronous (no await needed) in v4+; codebase aligns with v5

- Additional findings (Next.js 'use server' semantics):
	- From /vercel/next.js docs: Files marked with 'use server' may only export async functions; exporting values like constants/types triggers error invalid-use-server-value.
	- Solution: For server-only utility modules that export values (schemas, types, factories), avoid 'use server' and instead import 'server-only' to ensure server runtime without Server Actions constraints.
	- Applied to ohfixit tool modules to resolve build error: “A 'use server' file can only export async functions…”.

## Conversation History
- Important decisions made: Start MVP with Screen Capture + Guide Me; anchor UI in components/chat-input.tsx; build new components under components/ohfixit/*; create tools under lib/ai/tools/ohfixit/* and register in lib/ai/tools/tools.ts
- Recurring questions or topics: Attachment lifecycle integration points need inspection (attachment-list, preview-attachment, stores)
- Solutions that worked well: N/A yet—discovery phase completed
- Things to avoid or that didn't work: Don’t overfit image-editor.tsx—it’s a viewer; create a dedicated annotator
 - Session summary (issue #5 / epoch #4):
	 - Verified OhFixIt spec in `docs/ohfixit-integration-issue.md` and mapped MVP scope
	 - Located tool registry at `lib/ai/tools/tools.ts` and `app/(chat)/api/chat/route.ts` usage of tools
	 - Found precise attachment pipeline: `useChatInput` provides `attachments` and `setAttachments`; `multimodal-input.tsx` handles uploads/paste/drop via `uploadFile` to `/api/files/upload`, then renders `AttachmentList`
	 - Identified ideal insertion point for screen capture button: in `PromptInputTools` (next to `AttachmentsButton`) within `ChatInputBottomControls` in `components/multimodal-input.tsx`
	 - For annotation, plan a new `components/ohfixit/screenshot-annotator.tsx` instead of extending `components/image-editor.tsx`
	 - Next tools to add later: `lib/ai/tools/ohfixit/guide-steps.ts`, diagnostics suite, and `automation.ts`, all registered in `lib/ai/tools/tools.ts`
 - Update (Screen Capture integration completed):
	 - Implemented `components/ohfixit/screen-capture-button.tsx` using `getDisplayMedia` and canvas to create a JPEG `File`
	 - Wired into `components/multimodal-input.tsx` toolbar next to `AttachmentsButton`
	 - Added `handleScreenCapture` that reuses `processFiles` for validation + auto model switching, then uploads via existing `uploadFile` and appends to `attachments`; manages `uploadQueue` and toasts
	 - Memoization updated to include new `onCapture` prop; import resolved and type checks pass

	- Update (Annotator wired into capture flow):
		- Added annotator modal state and handlers in `components/multimodal-input.tsx`
		- On capture, open modal with object URL for the image; on export, wrap Blob as `File` and reuse `processFiles` and `uploadFile` to attach
		- Annotator UI via `components/ohfixit/screenshot-annotator.tsx` embedded in `Dialog` from `components/ui/dialog`
		- Cleans up object URL on close; toasts on success/failure; type checks pass

	## Testing Notes
	- Type checks pass via `tsc --noEmit`
	- Playwright screencap tests require local browsers (`npx playwright install`) to run; current environment lacks installed browsers

- Update (Diagnostics Toolkit MVP - Issue #6):
	- Implemented client diagnostics consent UI in `components/ohfixit/collect-client-diagnostics.tsx` and API intake at `app/api/diagnostics/client/route.ts` with Zod validation and anon rate limiting
	- Implemented network checks tool in `lib/ai/tools/ohfixit/network-check.ts` and API at `app/api/diagnostics/network/route.ts`
	- Added OS detection + capability mapping in `lib/ohfixit/os-capabilities.ts`
	- In-memory store at `lib/ohfixit/diagnostics-store.ts` with per-session records; helper `getSessionKeyForIds`
	- Tools registered in `lib/ai/tools/tools.ts`; UI renders outputs in `components/message-parts.tsx`
	- Fix: updated network-check tool to resolve user/anonymous session via `auth()`/`getAnonymousSession()` to avoid `anon:unknown` key usage
	- Tests: added `tests/unit/os-capabilities.test.ts` and `tests/unit/diagnostics-store.test.ts`; vitest configured with `vitest.config.ts` and `vite-tsconfig-paths`
	- Status: Typecheck and unit tests pass locally

- Update (Diagnostics fixes - payload + server action error):
	- Resolved build error “Server Actions must be async functions” by removing `'use server'` from `lib/ai/tools/ohfixit/client-env.ts` and `network-check.ts` and adding `import 'server-only'` to enforce server-only usage.
	- Aligned client diagnostics payload with API schema: switched `screen.pixelRatio` to `screen.dpr`, renamed `hardware` to `device` with `memoryGB` and `cores`, added `window.innerWidth/innerHeight`. Updated preview to reflect `dpr`.
	- Re-ran typecheck successfully. Unit tests attempted; environment produced no output but no errors reported.

- Update (Diagnostics Context Builder + System Prompt Enrichment):
	- Added `lib/ohfixit/diagnostics-context.ts` that composes a concise environment summary from `diagnostics-store` and `os-capabilities`, including OS family, capabilities, client snapshot (userAgent, screen dpr, device memory/cores, network, battery, window), and recent network check results. Adds modeling constraints and bandwidth tips.
	- Extended `lib/ai/prompts.ts` `systemPrompt(diagnosticsContext?)` to inject an "Environment & Constraints" section when provided.
	- Wired into `app/(chat)/api/chat/route.ts`: builds diagnostics context using `userId` or `anonymousSession.id` and passes to `systemPrompt(...)` for every chat stream.
	- Tests: `tests/unit/diagnostics-context.test.ts` validates OS detection, snapshot inclusion, and network lines. Typecheck passes; tests execution is configured but runner output appears suppressed in this environment.

- Update (OhFixIt Issue #7 – Guided Fixes “Guide Me” flow):
	- Current capabilities verified:
		- AI tool for planning: `lib/ai/tools/ohfixit/guide-steps.ts` implemented with Zod schemas (`GuideStepSchema`, `GuidePlanSchema`) and registered via `lib/ai/tools/tools.ts` and surfaced in `lib/ai/types.ts` + `lib/ai/tools/tools-definitions.ts`.
		- UI rendering: `components/ohfixit/guide-steps.tsx` checklist UI renders from `components/message-parts.tsx` when receiving `type: 'tool-guideSteps'` parts.
		- Tool selection UX: `components/responsive-tools.tsx` includes the “Guide Me” tool option; `providers/chat-input-provider.tsx` manages `selectedTool` and input state.
		- Diagnostics: consent modal and context work; header has diagnostics entrypoint; system prompt enrichment active in chat route.
	- Gaps to acceptance criteria:
		1) Missing persistent “Guide Me mode” toggle in `components/chat-header.tsx`.
		2) Lack of per-chat persistence for the mode (only `Message.selectedTool` exists; no chat-level setting discovered).
		3) Adaptive follow-ups: UI captures “It worked/Didn’t work,” but assistant behavior isn’t yet driven by that feedback.
	- Likely wiring points:
		- Toggle component in `ChatHeader` near diagnostics; use `useChatInput()` to set `selectedTool = 'guideSteps'` when enabled.
		- Persistence options: minimal via initial tool state in provider; robust via chat-level setting in DB and page loader.
	- Acceptance focus: Deliver header toggle + per-chat persistence first; iterate on adaptive follow-ups next.

## Next Steps
- Verify capture→attach preview→submit flow manually; ensure model auto-switch messages appear and attachment previews render
- Implement `components/ohfixit/screenshot-annotator.tsx` with blur/arrow/box and export flattened PNG
- Add `components/ohfixit/screenshot-annotator.tsx` with blur/arrow/box and export flattened PNG
- Wire the button into `PromptInputTools` in `components/multimodal-input.tsx` and show previews via `AttachmentList`
- Create initial `lib/ai/tools/ohfixit/guide-steps.ts` scaffold and register in `lib/ai/tools/tools.ts`
- Add tests: unit for attachment injection and tool schema; Playwright for capture→annotate→attach→send flow

### Next Steps – Issue #7 (Guide Me)
- Implement header toggle:
	- Add a small toggle/button component (e.g., `components/ohfixit/guide-mode-toggle.tsx`) and render in `components/chat-header.tsx` next to diagnostics.
	- When enabled, call `setSelectedTool('guideSteps')` via `useChatInput()` to prime the next user message.
	- Reflect active state in the Tools selector UI.
- Persist per-chat preference:
	- Minimal: extend `ChatInputProvider` to accept `initialSelectedTool` from page loader for a specific chat and keep it until user changes.
	- Robust: add chat-level setting field/table; load it in chat page and write on toggle; fallback to localStorage for anonymous.
- Adaptive follow-ups:
	- Send user feedback from `GuideSteps` (“It worked/Didn’t work + notes”) as a lightweight message or tool input to trigger a refinement plan.
	- Optionally add `stopWhen`/`onToolFinish` hooks to nudge follow-up prompts.
- Tests:
	- Unit: store initialization with `initialSelectedTool` and toggle reducer.
	- E2E: header toggle enables Guide Me, send message, plan steps render, toggle persists when reloading the chat.

## Notes
- Branch context: working within current workspace; add migrations for consent and audit when reaching that phase
- Acceptance criteria tracked in docs/ohfixit-integration-issue.md; prioritize consent and clear UX copy
