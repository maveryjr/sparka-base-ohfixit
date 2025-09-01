# OhFixIt – Implementation Roadmap (Updated Phases)

This roadmap outlines the end-to-end plan to fully implement OhFixIt, aligned to the updated phase order. Each phase includes scope, key deliverables, acceptance criteria, risks, and dependencies.

## Architecture at a glance

- Core: Next.js App Router, Vercel AI SDK v5 tool-calling, Drizzle + Postgres, optional Redis for resumable streams
- Trust: Consent-by-design, immutable audit (`ConsentEvent`, `ActionLog`, `DiagnosticsSnapshot` + artifacts)
- Automation: Desktop Helper (Tauri recommended) with strict allowlist, preview → approve → execute → rollback
- Voice: Whisper STT and AI SDK speech TTS (fallback to Web Speech API)
- Live Share: WebRTC peer-to-peer with annotated overlays, snapshots as audit artifacts
- Safety: Every action previewed with diffs, logged, and reversible where feasible

## Phase 0 – foundation and safety rails (1 week)

- [x] Allowlist and action contract
  - Action descriptor schema: id, title, os, preconditions, implementation, preview, rollback strategy
  - Shared action contract for tools: inputs, previewDiff, risk, estimatedTime, permissions
- [x] Audit model enrichment
  - Extend `ActionLog` with: outcome, preview, diff, artifacts[], rollbackPointId, executionHost
  - New tables (planned): `ActionArtifact`, `RollbackPoint`
- [x] Minimal tooling
  - Standardize preview-only responses for all execution-capable tools

Acceptance
- [x] All execution-capable tools return a preview (no real execution)
- [x] Audit timeline renders previews and risk levels

## Phase 1 – automation v1 (preview → approve → execute → rollback) (2–3 weeks)

- [ ] Desktop Helper (Tauri), secure WS handshake, JWT-scoped to chat/session
- [ ] Implement 3 safe macOS actions with rollbacks:
  - Flush DNS, Toggle Wi‑Fi (restore prior state), Clear app cache (backup+restore)
- [x] Server APIs: preview/approve/execute/rollback with robust validation and audit
- [x] UI approval flow: “Do It For Me” panel with diff, risks, and one-tap Undo

Acceptance
- [ ] Approving triggers helper; `ActionLog` enriched with artifacts and rollback handle
- [ ] One-tap Undo restores prior state; unallowlisted actions are rejected (partial: allowlist enforcement in place)

## Phase 2 – health checks dashboard (1.5 weeks)

- Health check engine: browser + helper-powered privileged checks
- API to run and fetch results; schedule periodic checks via helper
- UI dashboard with severity, insights, and one-click safe auto-fixes

Acceptance
- ≥10 meaningful checks across network/disk/startup/services
- Auto-fix uses automation pipeline with approval + rollback

## Phase 3 – playbooks & Fixlet Builder (2 weeks)

- Device-aware playbooks: tailor steps using `clientEnv` + device profile
- Fixlet Builder: record executed steps into reusable fixlets; share and rerun

Acceptance
- Recorded fixlets execute as playbook steps with approvals and audit artifacts

## Phase 4 – computer use and safe UI automation (2–3 weeks)

- Integrate computer-use-capable provider behind feature flag
- Planner → Executor split with allowlist mapping and per-step approvals

Acceptance
- Model proposes UI steps; helper executes only mapped safe actions; screenshots + diffs logged

## Phase 5 – pro channel (2–3 weeks, gated)

- macOS: Homebrew ops, pkg receipts diff, launchd services
- Windows: winget, registry snapshot/restore, services
- Heavy previews and backups before destructive changes

Acceptance
- All pro operations: preview → approve → execute with backup/rollback artifacts

## Phase 6 – polish: knowledge cards, scheduler, device profiles, family portal (1–2 weeks)

- Knowledge cards: what changed, how to undo
- Scheduler: queue jobs via helper (“run updates at 2am”)
- Device profiles: lastSeenAt, capabilities, warranty
- Family portal: share sessions/minutes, join links

Acceptance
- Cards attached in chat; scheduled jobs run; device profiles visible; portal functional (MVP)

## Phase 7 – voice mode upgrade (1–1.5 weeks)

- Whisper STT endpoint, chunked mic streaming; AI SDK speech TTS fallback
- Replace/augment browser Web Speech pipeline

Acceptance
- Robust STT with streaming partials; TTS available across platforms

## Phase 8 – human handoff (1 week)

- Create handoff session with context escrow
- Operator UI/flow with replayable audit + redaction

Acceptance
- Operator joins with audit replay; all operator actions audited

## Phase 9 – live screen share (WebRTC)

- Signaling endpoints; `getDisplayMedia` → `RTCPeerConnection`
- Pointer overlay/annotations; periodic snapshots stored as artifacts

Acceptance
- Start/stop with consent; snapshots visible in audit; no raw stream stored server-side

---

## APIs to scaffold now

- [x] POST `/api/automation/action` – operations: preview, approve, execute, rollback
- [x] POST `/api/ohfixit/health/run` – schedule health checks (stub)
- [x] GET `/api/ohfixit/health/results` – fetch health check results (by jobId/chatId) (stub)

## Data models (planned)

- [x] ActionArtifact(id, actionId, type, uri/blobRef, hash, createdAt)
- [x] RollbackPoint(id, actionId, method, data JSON, createdAt)
- [ ] PlaybookRun(id, chatId, playbookId, deviceProfileId, status, startedAt, finishedAt)
- [ ] PlaybookRunStep(id, runId, stepId, status, artifacts[], notes)
- [ ] HealthCheck(id, chatId/userId, checkKey, status, score, details JSON, createdAt)
- [ ] DeviceProfile(id, userId, os, name, capabilities JSON, lastSeenAt, warranty JSON)
- [ ] HumanHandoffSession(id, chatId, status, operatorId, startedAt, endedAt, transcriptRef)

## Consent & privacy

- Explicit consent for diagnostics, live share, automation, audio
- Helper enforces allowlist, least privilege; short-lived tokens; TLS pinning recommended
- Redaction for images/audio artifacts when stored

## Testing & rollout

- Unit: tool contracts, schema validation, helper action adapters (mocked)
- Integration: API routes with mocked helper + audit logging
- E2E: Preview → approve → execute → rollback; health checks; (later) live share
- Feature flags per phase; canary group; rollback on error budgets
