# Integrate OhFixIt Tech Helper into Oh Fix It (MVP + Phases)

OhFixIt is a screen-aware tech helper that can see what the user sees, diagnose problems, explain fixes in plain language, and—when permitted—perform the necessary actions. This issue aligns the OhFixIt concept with the existing Oh Fix It codebase and elevates it into a practical, safe, and delightful product for everyday technical support.

> Status: Planning (MVP scope defined). This spec maps to existing components and calls out concrete additions. Many conversational foundations are already implemented in Oh Fix It.

## Current Capabilities Mapping (Already in Oh Fix It)

- Conversational foundation
  - Streaming responses and resumability: `streamText`, `createUIMessageStream`, `ResumableStreamContext`, Redis-backed resume
    - Files: `app/(chat)/api/chat/route.ts`, `app/(chat)/api/chat/[id]/stream/route.ts`, `hooks/use-auto-resume.ts`, `components/chat-sync.tsx`
  - Message persistence and chat history: Drizzle ORM models and queries; TRPC routers; anonymous and authenticated sessions
    - Files: `lib/db/queries.ts`, `trpc/routers/chat.router.ts`, `hooks/chat-sync-hooks.ts`, `lib/stores/chat-store.ts`
  - Attachments and multimodal input: images, PDFs, docs, binary inlining before model calls
    - Files: `components/attachment-list.tsx`, `components/preview-attachment.tsx`, `lib/utils/download-assets.ts` (replace URLs with binary), `lib/ai/model-features.ts`
  - Tool calling infra and orchestration with AI SDK v5
    - Files: `lib/ai/tools/tools.ts`, tools such as `deep-research`, `code-interpreter`, `web-search`, `create-document`, `read-document`
  - UI scaffolding for chat, artifacts, and data stream handling
    - Files: `components/chat*.tsx`, `components/data-stream-handler.tsx`, `lib/artifacts/*`

- Reliability and safety primitives
  - Error handling (server `ChatSDKError`, client toasts), telemetry toggles, rate-limits for anonymous users
    - Files: `app/(chat)/api/chat/route.ts`, `components/chat-sync.tsx`, `lib/utils/rate-limit.ts`
  - Auth (NextAuth), anonymous sessions; visibility and sharing support
    - Files: `app/(auth)/*`, `lib/anonymous-session-*`, `hooks/chat-sync-hooks.ts`

These cover most of the “Conversational Foundation” portion from the draft. The remaining gaps focus on screen capture + annotation, guided/automated flows, diagnostics, and trust features.

## Product Goals (OhFixIt)

1. Help users fix everyday tech issues quickly via two flows:
   - Guide Me: step-by-step coaching with checklists and clear language.
   - Do It For Me: automated browser-side fixes where safe, or generated scripts with previews and consent for OS-level tasks.
2. Be screen-aware: let users capture and annotate screens to provide immediate context.
3. Build trust: previews, explicit consent, redaction/annotation tools, and a transparent action/audit trail.

## MVP Scope (Phase 1)

### 1) Screen Capture and Annotation

- [ ] Add client-side one-click screen capture (tab/window/screen) and screenshot extraction
  - Component: `components/ohfixit/screen-capture-button.tsx` (uses `navigator.mediaDevices.getDisplayMedia`) and a helper to capture a still frame as PNG and attach as a file part to the pending user message.
- [ ] Integrate an annotation overlay for screenshots (arrows, boxes, blur)
  - Reuse/adapt existing `components/image-editor.tsx` to support blur tool and callouts; new wrapper `components/ohfixit/screenshot-annotator.tsx`.
- [ ] Store screenshots and edits as attachments, leveraging existing upload/storage paths.
  - Use existing attachment flows and (if enabled) Vercel Blob storage for persistence.

Acceptance:
- From the chat input, users can capture their screen, annotate the image (draw, arrow, blur regions), and send it with their message.

### 2) Diagnostics Toolkit (Safe, Consent-Driven)

- [ ] Client environment probe tool: OS, browser version, user agent hints, language, timezone, battery/network info (where available)
  - Component: `components/ohfixit/collect-client-diagnostics.tsx` (runs on consent; persists a summarized JSON blob on the message or session).
  - Tool: `lib/ai/tools/diagnostics/client-env.ts` that the model can call to request the latest probe.
- [ ] Network sanity checks: latency to known endpoints, DNS resolution attempt (server-side), fetch status to common domains
  - Tools: `lib/ai/tools/diagnostics/network-check.ts` (server-initiated), with clear user consent gate and rate limit.
- [ ] OS detection heuristic and capability map (what we can/can’t automate in-browser)
  - Helper: `lib/ohfixit/os-capabilities.ts` to classify environment and suggest appropriate flow.

Acceptance:
- With consent, OhFixIt captures diagnostics and exposes them to the model as structured data, referenced in the assistant’s reasoning and responses.

### 3) Guided Fixes (“Guide Me”)

- [ ] Add a “Guide Me” mode toggle in chat header or model selector area
  - Component: `components/ohfixit/flow-toggle.tsx` with persisted preference per chat.
- [ ] Checklist-style step runner
  - Component: `components/ohfixit/guide-steps.tsx` rendering assistant-proposed steps with checkboxes and notes, progress tracking, and one-tap “It worked/Didn’t work”.
- [ ] Tool: `lib/ai/tools/ohfixit/guide-steps.ts` that returns structured steps (title, rationale, actions, fallback) based on the conversation + diagnostics.

Acceptance:
- Assistant can propose a fix plan as a structured checklist. User can mark progress; assistant adapts follow-ups.

### 4) Safe Automation (“Do It For Me”) – Browser-Scoped MVP

- [ ] Define safe automation primitives available in a browser (no native OS control). Examples:
  - Open a URL in a new tab with parameters.
  - Run small DOM helpers on the current page (only within our app domain), e.g., toggle settings in-app.
  - Generate copyable terminal commands or PowerShell scripts with dry-run explanations for OS tasks.
- [ ] Consent & preview gates
  - Component: `components/ohfixit/action-preview-dialog.tsx` with a diff/summary of proposed changes or steps.
- [ ] Tool: `lib/ai/tools/ohfixit/automation.ts` that returns a set of actions with types: `open_url`, `dom_instruction`, `script_recommendation`. Execution is always explicit and gated.

Acceptance:
- “Do It For Me” may execute safe browser-scoped actions with explicit user confirmation, or generate scripts with clear copy/run instructions and safety notes.

### 5) Trust, Consent, and Audit Trail

- [ ] Central consent model capturing: screenshot capture consent, diagnostics consent, automation consent
  - Schema additions: `consent_event`, `action_log` tables (Drizzle).
- [ ] Live preview and dry-run summary for any automation or script
  - Reuse preview dialog + new server-side generators for diffs/summaries when applicable.
- [ ] Audit trail UI on a per-chat basis
  - Component: `components/ohfixit/audit-timeline.tsx` listing actions, timestamps, and outcomes.

Acceptance:
- Every potentially sensitive operation shows a preview with a clear prompt and requires consent. A per-chat audit timeline lists what was proposed and what the user approved.

## Phase 2 (Future)

- Voice mode (AI SDK experimental speech) for hands-free guidance.
- “OhFixIt Desktop Helper” (Tauri/Electron) enabling selective native automation (Wi‑Fi resets, printers, OS settings). Strict sandboxing and code signing.
- Family portal: pooled minutes, remote assist with secure, time-scoped session links.
- Issue playbooks library with reusable steps for common problems (Wi‑Fi slow, printer offline, storage full, browser popup malware, etc.).
- Redaction assist: automatic detection and blur of emails/SSNs in screenshots (client-side ML or server service).

## Architecture and Integration Notes

1) Frontend/UI
- Add OhFixIt UI surface in existing chat shell (`components/chat-header.tsx`, `components/chat-input.tsx`) with mode toggle and capture/annotate buttons.
- Use existing artifact and streaming patterns for long operations and step updates (`components/data-stream-handler.tsx`).
- Reuse `image-editor.tsx` to implement blur/arrow tools and provide a simple API to produce a flattened PNG for upload.

2) Tools & Reasoning
- Add new tools under `lib/ai/tools/ohfixit/*`:
  - `guide-steps.ts` – returns structured steps for “Guide Me”.
  - `automation.ts` – returns a candidate action plan with `open_url | dom_instruction | script_recommendation` items and human-readable previews.
  - `diagnostics/*` – client env reflection, network tests, capability map. Tools must be idempotent and produce structured JSON.
- Register in `lib/ai/tools/tools.ts` and ensure tool affordability via existing credits utilities.

3) Persistence
- Drizzle schema additions (indicative, to be applied via migrations):
  - `consent_event(id, chatId, userId, kind, payload, createdAt)`
  - `action_log(id, chatId, userId, actionType, summary, payload, status, createdAt)`
  - `diagnostics_snapshot(id, chatId, userId, payload, createdAt)`
- Store references to attachments (screenshots) using existing `document`/blob flow where appropriate.

4) Security & Privacy
- All sensitive features are opt-in with explicit prompts. Defaults to “Guide Me”.
- No native OS changes in MVP. Automation limited to browser-safe actions within our domain.
- Screenshots stay user-owned; allow delete/redact. Blur tool recommended for sensitive regions.
- Rate-limit diagnostics and network tests, attribute to sessions/users.

## Detailed Task Checklist

### Conversational Foundation (Validated/Minor Enhancements)
- [x] Streamed replies via AI SDK UI and resumable streams (`app/(chat)/api/chat/route.ts`, `components/chat-sync.tsx`).
- [x] Message persistence & chat history (Drizzle/TRPC).
- [x] Error handling (server + client toasts).
- [x] Chat sharing/visibility controls (existing hooks and queries).
- [ ] Minor: Add “OhFixIt” system prompt augment when flows are enabled (coaching tone, step structure).

### Tool Calling Infrastructure
- [x] Baseline tool framework and registry (`lib/ai/tools/tools.ts`).
- [ ] Add diagnostics tool suite (`lib/ai/tools/ohfixit/diagnostics/*`).
- [ ] Add “Guide Me” step planner tool (`lib/ai/tools/ohfixit/guide-steps.ts`).
- [ ] Add “Do It For Me” action planner tool (`lib/ai/tools/ohfixit/automation.ts`).
- [ ] Step introspection updates to improve UX (emit step state deltas via `DataStreamHandler`).

### Multimodal Input Processing
- [x] Text + image + PDF attachments supported and inlined for models that accept them.
- [ ] Unified OhFixIt context builder that merges diagnostics + recent screenshot metadata into model messages (augment `convertToModelMessages` or pre-hook).

### Screen Sharing Capabilities
- [ ] One-click screen capture via `getDisplayMedia` and still-frame extraction.
- [ ] Annotation system (draw/arrow/blur) for captured images.
- [ ] Preview before attach/send.
- [ ] Secure handling of captured data using existing storage and delete flows.

### User Flow Implementation
- [ ] “Guide Me” coaching flow with checklist UI and adaptive next steps.
- [ ] “Do It For Me” flow with preview & consent, limited to browser-safe actions or generated scripts.
- [ ] Explicit approval gates for each sensitive operation.
- [ ] One-tap Undo for in-app changes (where applicable) and easy “Re-run last fix”.
- [ ] Action logging system with per-chat timeline.

### Trust and Safety
- [ ] Live previews for proposed actions.
- [ ] Dry-run diff/summary generator for scripts/config changes (textual previews).
- [ ] Clear permission prompts with granular toggles.
- [ ] Full audit trail persisted and viewable.

### UI Development
- [x] Baseline chat UI using shadcn and AI SDK patterns.
- [ ] OhFixIt mode, capture/annotate buttons, and premium styling polish.
- [ ] Responsive, accessible controls for checklists and previews.

## Acceptance Criteria (MVP)

1) A user can:
   - Start a chat in OhFixIt mode, capture a screen, annotate it, and send it in one flow.
   - Toggle “Guide Me” to receive a clear, checkbox-based plan and mark steps as completed.
   - Toggle “Do It For Me” to see a preview of safe actions or a script with a dry-run explanation and explicit consent controls.
2) The assistant automatically incorporates diagnostics (when consented) to tailor the plan.
3) Every sensitive action has a preview and requires consent; all actions are recorded in an audit timeline.
4) Anonymous users can try limited features; authenticated users get full persistence and history.

## Engineering Notes & Contracts

- Tools contract
  - Inputs: structured JSON; outputs: structured JSON with `kind`, `title`, `steps` or `actions`, `preview`.
  - Error modes: validation errors, network failures, unavailable capabilities (return `capability_unavailable`).
  - Success: emits deltas to `DataStreamHandler` for real-time UX updates.
- Edge cases
  - No camera/screen permissions: degrade to manual file upload and text-only guidance.
  - Unsupported browsers: hide capture button, suggest manual screenshot.
  - Long-running diagnostics: chunk updates with progress.

## Data Model (proposed Drizzle)

Migration sketches (pseudo):

```ts
// consent_event
id: uuid PK
chatId: varchar -> references chat.id
userId: varchar -> references user.id (nullable for anonymous)
kind: varchar // 'screenshot', 'diagnostics', 'automation'
payload: jsonb
createdAt: timestamp

// action_log
id: uuid PK
chatId: varchar
userId: varchar (nullable)
actionType: varchar // 'open_url' | 'dom_instruction' | 'script_recommendation' | 'guide_step'
summary: text
payload: jsonb
status: varchar // 'proposed' | 'approved' | 'executed' | 'cancelled'
createdAt: timestamp

// diagnostics_snapshot
id: uuid PK
chatId: varchar
userId: varchar (nullable)
payload: jsonb
createdAt: timestamp
```

Apply via `drizzle` migration once finalized.

## QA Plan

- Unit tests for tool schemas and reducers producing step/action deltas.
- Browser tests (Playwright) for: screen capture prompt flow, annotation UI, consent dialogs, and audit timeline updates.
- Smoke tests for anonymous vs authenticated paths and resumable streams during fix generation.

## Out of Scope (MVP)

- Native OS automation. Propose a signed desktop helper in Phase 2.
- Full OCR/PII redaction pipeline. Start with manual blur tool.

---

If this scope looks good, we can break it down into subtasks/issues per area (UI, tools, persistence, QA) and start with Screen Capture + Guide Me flow as the first milestone.
