# Implementation Roadmap — OhFixIt Tools and AI Features

This roadmap turns the proposed features into actionable tasks with phases, file paths, and acceptance criteria. Use the checkboxes to track progress. Priorities: P0 (highest), P1, P2.

How to use:
- Work top‑down by phase. Each feature lists concrete code changes, UI hooks, and DB/logging.
- Keep changes minimal and aligned with existing patterns in `lib/ai/tools`, `components/*`, and `lib/db/schema.ts`.
- After each feature, add tool metadata in `lib/ai/tools/tools-definitions.ts` and type entries in `lib/ai/types.ts`.

---

## Milestone 0 — Quick Wins (P0)

- [x] Types: Strongly type guide streaming partials (P0)
  - Change `guidePlanPartial: any` to `Partial<import('./tools/ohfixit/guide-steps').GuidePlan>`.
    - File: `lib/ai/types.ts`
  - Remove unused import `generateObject`.
    - File: `lib/ai/tools/ohfixit/guide-steps.ts`
  - Acceptance: TypeScript passes; no `any` for guide plan stream.

- [x] Deterministic JSON tools mode (P1)
  - Add optional deterministic mode flag (seed/temperature) for schema‑constrained tools to stabilize tests.
  - Files: `lib/ai/providers.ts`, `lib/ai/model-features.ts` (feature flag), and pass through from tool constructors where helpful.
  - Acceptance: Can enable lower temperature and stable sampling for tools like `guideSteps` from config.

---

## Milestone 1 — High‑Impact Features

### 1. Health Scan Tool (P0)
Goal: One‑click device health summary with actionable fixes and persistence.

- Server tool
  - [x] Add `lib/ai/tools/ohfixit/health-scan.ts`
    - Wrap `healthCheckEngine` to run `runAllChecks()` and persist per‑check results into `HealthCheck` table.
    - Input: `{ includeCategories?: ('system'|'network'|'security'|'performance'|'browser')[] }` (optional filter).
    - Output: summary + checks (match `HealthCheckSummary`).
    - Record a `ConsentEvent` if this exposes previously unshared client diagnostics.
- Tool registration
  - [x] Register in `lib/ai/tools/tools.ts` and add name to `lib/ai/types.ts` + `lib/ai/tools/tools-definitions.ts`.
- UI
  - [x] Add UI component `components/ohfixit/health-scan.tsx` to render summary, counts, and top critical items.
  - [x] Handle `tool-healthScan` in `components/message-parts.tsx` similarly to existing OhFixIt tools.
- Acceptance
  - Run, renders a compact summary, persists rows to `HealthCheck`, and links to fixes (fallback to `guideSteps`/`oneClickFixTool`).

### 2. Guide → Automation Bridge (P0)
Goal: Convert a generated guide into an executable automation plan with approvals and logging.

- Mapping tool
  - [x] Add `lib/ai/tools/ohfixit/guide-to-automation.ts` that accepts a `GuidePlan` (or message reference) and maps actions to `AutomationAction` entries (open_url, dom_instruction, script_recommendation).
  - [x] On execution, create `ActionLog` entries for each mapped action with `status='proposed'`, `executionHost` set appropriately, and attach `RollbackPoint` for risky/script actions.
- UI glue
  - [x] Update `components/ohfixit/guide-steps.tsx` to show a “Run Automatically” CTA when steps are present; posting to a handler that calls the tool and then renders the standard Automation plan component.
  - [x] Ensure `components/message-parts.tsx` wrap‑up text remains shown once to avoid double content.
- Acceptance
  - From a guide output, clicking “Run Automatically” creates an automation plan mirroring guide steps and shows approval buttons per action.

### 3. Screenshot OCR + Redaction (P1)
Goal: Extract meaningful error text from screenshots and mask PII before model use.

- Tool
  - [x] Add `lib/ai/tools/ohfixit/screenshot-ocr.ts` (server‑only) using an OCR provider (pluggable). Inputs: attachment IDs; Output: extracted text + redaction map.
  - [x] Redact sensitive patterns (emails, phone, secrets) before passing into prompt context.
- Integration
  - [x] In `guide-steps.ts`, if attachments exist, optionally call OCR tool first and inject the textual hints into `buildGuidePlanPrompt` context.
- UI
  - [x] Add a compact “Extracted from screenshot” expandable in `components/ohfixit/guide-steps.tsx`.
- Acceptance
  - With a screenshot attached, the guide uses extracted text and displays redacted excerpt.

### 4. Action Artifact Explorer (P1)
Goal: Unified viewer for artifacts (screenshots/logs/diffs) tied to actions for audit/diagnostics.

- Tool
  - [x] Add `lib/ai/tools/ohfixit/get-action-artifacts.ts` to fetch `ActionArtifact` by `actionLogId` or `chatId`.
- UI
  - [x] Add `components/ohfixit/action-artifacts.tsx` to render timeline with thumbnails and metadata (hash/uri).
  - [x] Add case in `components/message-parts.tsx` for `tool-getActionArtifacts`.
- Acceptance
  - After an automation run with screenshots/logs, artifacts appear in an ordered, filterable list.

### 5. Consent Audit Viewer (P1)
Goal: Display a transparent “consent receipt” timeline for user trust.

- Tool
  - [x] Add `lib/ai/tools/ohfixit/get-consent-log.ts` to query `ConsentEvent` and related `ActionLog` for a chat.
- UI
  - [x] Add `components/ohfixit/audit-trail.tsx` to show event types, payload summaries, timestamps.
- Acceptance
  - User can see exactly what was captured and why, per chat.

### 6. Network Investigator+ (P1)
Goal: Enrich `networkCheck` with captive portal detection, DNS issues, TLS handshake failures, and hop latency hints.

- Backend
  - [x] Extend `NetworkCheckInput` to include `{ deep?: boolean }`.
  - [x] Add captive portal heuristic (e.g., fetch `http://example.com` expecting redirect), TLS probe (HEAD to known HTTPS with error capture), and latency sampling.
  - [x] Persist `NetworkDiagnostics` as today via `setNetworkDiagnostics`.
- UI
  - [x] Expand network check renderer in `components/message-parts.tsx` to surface new fields (reason codes, hints).
- Acceptance
  - Deep mode highlights captive portal or DNS/TLS trouble with a short next‑step suggestion.

### 7. Script Risk Analyzer (P1)
Goal: Pre‑execution static risk analysis for scripts with automatic rollback capture.

- Tool
  - [x] Add `lib/ai/tools/ohfixit/analyze-script.ts` that reuses `ScriptGenerator` risk model and enforces allowlist.
  - [x] If execution is approved, create a `RollbackPoint` before execution and log details.
- UI
  - [x] Show risk badge and mitigation list when proposing script actions (inside `AutomationPlanView`).
- Acceptance
  - Every proposed script displays risk with mitigations and creates rollback metadata upon approval.

---

## Milestone 2 — OhFixIt Extensions

### 8. Fixlet Creator (P1)
Goal: Save successful plans as reusable Fixlets.

- Tool
  - [x] Add `lib/ai/tools/ohfixit/fixlet.ts` with `saveFixlet(plan|steps)` and optional tags.
- UI
  - [x] Add a “Save as Fixlet” CTA to automation/guide UIs; create `components/ohfixit/fixlet-save.tsx`.
- Persistence
  - [x] Use `Fixlet`, `FixletStep`, `FixletExecution*` tables (`lib/db/schema.ts`).
- Acceptance
  - A plan can be saved; later discoverable and executable with step tracking.

### 9. Device Profile Sync (P2)
Goal: Promote `clientEnv` snapshots into `DeviceProfile` to adapt future playbooks.

- Tool
  - [x] Add `lib/ai/tools/ohfixit/upsert-device-profile.ts` to infer OS/capabilities and upsert. (Integrated into clientEnv tool)
- Integration
  - [x] Call after successful `clientEnv` read (only when consent true).
  - [x] Pass `deviceOS`/capabilities into `getPlaybook` for adaptation.
- Acceptance
  - Future playbooks filter/adapt to profile and capabilities.

### 10. Human Handoff (P2)
Goal: Launch live support escalation flow with audit and transcript slot.

- Tool
  - [x] Add `lib/ai/tools/ohfixit/start-handoff.ts` to create `HumanHandoffSession` and return a join link/token placeholder.
- UI
  - [x] Add `components/ohfixit/handoff.tsx` banner and status updates.
- Acceptance
  - Starting handoff creates a session record and shows status in UI.

### 11. Plan‑and‑Execute Orchestrator (P2)
Goal: Meta‑tool to choose best pathway among `guideSteps`, `getPlaybook`, `oneClickFixTool`, `automation`.

- Tool
  - [x] Add `lib/ai/tools/orchestrate.ts` that inspects goal/context/attachments and calls sub‑tools, streams a unified plan.
- UI
  - [x] Render orchestrator output similarly to guide/automation with provenance chips (which subtool produced which step).
- Acceptance
  - For ambiguous requests, orchestrator produces a cohesive plan that may include guide steps, quick fixes, and automation proposals.

---

## Milestone 3 — Research/Search Upgrades

### 12. Clarify‑Loop for Playbooks (P2)
Goal: Ask 1–2 targeted follow‑ups when playbook match is ambiguous.

- Backend
  - [x] Extend `getPlaybook` to optionally return `clarifyingQuestions` when multiple candidates are close.
  - [ ] If a user responds, call `getPlaybook` again with answers to re‑rank.
- UI
  - [x] Render clarifying questions in the chat flow and wire the answers as tool input.
- Acceptance
  - Ambiguous symptom queries trigger 1–2 clarifying questions before returning a refined playbook.

### 13. Page‑Aware UI Overlay (P2)
Goal: “Guide me” mode with DOM highlights and scroll‑to actions using `uiAutomation`.

- Client overlay
  - [x] Add a lightweight overlay component to draw rectangles/highlights for selectors and attach labels.
- Tool contract
  - [x] Extend `uiAutomation` to optionally “preview” actions and emit overlay hints instead of running them.
- Acceptance
  - A step can visually highlight where to click/type with an overlay before execution.

---

## Global Integration Tasks (apply per new tool)

- [x] Add tool to `lib/ai/tools/tools.ts` and to `lib/ai/types.ts` (`toolNameSchema`, `frontendToolsSchema` if user‑selectable, `ChatTools` type) and to `lib/ai/tools/tools-definitions.ts` (name, description, cost).
- [x] Add renderer case to `components/message-parts.tsx` (loading + output states, errors).
- [x] If relevant, add or reuse a small UI under `components/ohfixit/*` to keep message‑parts lean.
- [x] Persist artifacts/logs via `ActionLog`, `ActionArtifact`, `RollbackPoint`, `ConsentEvent` as applicable.
- [ ] Update README with a brief feature description and how to trigger it.

---

## Security, Consent, and Safety Notes

- Always record user consent via `ConsentEvent` for diagnostics, screenshots, or any non‑trivial automation.
- Route risky actions through approval UX; ensure `rollbackSystem` has enough data to revert where feasible.
- Respect allowlists in `lib/ohfixit/computer-use-allowlist.ts` for UI and script actions.
- Redact extracted text before using it in prompts.

---

## Acceptance Criteria Summary

- Health Scan: Runs, renders summary, stores per‑check results, links to fixes.
- Guide→Automation: One‑click CTA turns guide into a reviewable, consent‑gated automation plan with logs/rollback points.
- Screenshot OCR: Extracts text from screenshots, redacts, and improves guide grounding.
- Artifacts Viewer: Lists screenshots/logs/diffs per action chronologically.
- Consent Viewer: Shows consent and action events timeline per chat.
- Network+: Deep diagnostics flags captive portal/DNS/TLS issues.
- Script Risk: Shows risk/mitigations and creates rollback on approval.
- Fixlets: Save/execute plans as reusable fixlets with steps and tags.
- Device Profile: Profiles upserted from consented data; playbooks adapt.
- Handoff: Creates live support session record and surfaces status.
- Orchestrator: Produces cohesive, multi‑tool plans for ambiguous requests.
- Clarify‑Loop: Asks targeted questions then returns refined playbook.
- Page Overlay: Provides visual guidance before UI actions execute.

---

## Sequencing Recommendations

1) Ship P0: Health Scan + Guide→Automation + Type polish.
2) Add artifacts/audit for trust; expand NetworkCheck and Script Risk.
3) Layer Fixlets + Device Profiles; then Handoff + Orchestrator.
4) Research clarifications and page overlay for polish.

---

## Notes and Pointers

- Tool patterns: See `lib/ai/tools/ohfixit/network-check.ts` and `client-env.ts` for consent/session resolution. Follow identical shape.
- UI patterns: See `components/ohfixit/guide-steps.tsx` and the `tool-*` branches in `components/message-parts.tsx`.
- DB models: See OhFixIt tables in `lib/db/schema.ts` (ActionLog, ActionArtifact, RollbackPoint, ConsentEvent, HealthCheck, DeviceProfile, Fixlet*, HumanHandoffSession).
- Streaming: For JSON‑schema tools that stream partials, mirror the `guideSteps` approach and the `data-guidePlanPartial` pattern in `components/message-parts.tsx`.

---

## Backlog / Stretch

- Offline execution queue for desktop‑helper integrated actions.
- Cross‑device device‑profile sync and selection.
- Automated regression tests for tool JSON outputs against zod schemas.
- Cost telemetry hooks using `tools-definitions.ts` cost metadata.
