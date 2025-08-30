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
- Libraries researched on Context7: [placeholder for future entries]
- Best practices discovered: [to be filled when research occurs]
- Implementation patterns used: AI SDK v5 streamText with tools; media capture via getDisplayMedia; attachment flows
- Version-specific findings: [to be populated]

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

## Next Steps
- Verify capture→attach preview→submit flow manually; ensure model auto-switch messages appear and attachment previews render
- Implement `components/ohfixit/screenshot-annotator.tsx` with blur/arrow/box and export flattened PNG
- Add `components/ohfixit/screenshot-annotator.tsx` with blur/arrow/box and export flattened PNG
- Wire the button into `PromptInputTools` in `components/multimodal-input.tsx` and show previews via `AttachmentList`
- Create initial `lib/ai/tools/ohfixit/guide-steps.ts` scaffold and register in `lib/ai/tools/tools.ts`
- Add tests: unit for attachment injection and tool schema; Playwright for capture→annotate→attach→send flow

## Notes
- Branch context: working within current workspace; add migrations for consent and audit when reaching that phase
- Acceptance criteria tracked in docs/ohfixit-integration-issue.md; prioritize consent and clear UX copy
