# OhFixIt – Compact Handoff (Durable Technical Summary)

This handoff captures the end-to-end status of the OhFixIt vertical: what shipped, how it works, where the code lives, key contracts (APIs, data, JWT), current test/quality status, and the next steps. It’s designed so another engineer can continue seamlessly without digging through prior discussions.

## Objectives and current outcome

- Verify each checked item in the roadmap corresponds to a real, working implementation (not a scaffold).
- Ensure Phase 2 “one‑click safe auto‑fix” reuses the central automation pipeline (preview → approve → execute) and preserves rollback/auditability.
- Provide a durable summary of architecture, endpoints, and data models with precise pointers into the codebase and pragmatic next steps.

Result: All checked roadmap items map to working implementations. The health “Fix Now” path routes through the approval pipeline with audit and rollback readiness. Conservative mappings exist; privileged checks remain gated behind the Desktop Helper.

## Tech stack and patterns

- Next.js App Router (next@15 canary), React 19, TypeScript 5.8
- Drizzle ORM + Postgres; jose for JWT; Vitest + Playwright; Biome
- Patterns:
  - Central allowlist-driven automation orchestrator with lifecycle: preview → approve → execute → rollback
  - Consent-by-design, immutable audit (ActionLog + artifacts + rollback points)
  - Desktop Helper handshake via short‑lived scoped JWT
  - Health checks engine + dashboard with “Fix Now”→ automation pipeline
  - Fixlets: CRUD, execution, sharing

## Core flows and endpoints

Lifecycle contract (all POST): `/api/automation/action`
- Operations: `preview`, `approve`, `execute`, `rollback`
- Preview validates allowlist and returns ActionPreview (description, commands, risks, reversible, etc.)
- Approve mints a helper JWT (10‑minute TTL), writes audit with status=approved
- Execute validates approval (and expiry), logs execution intent, and re‑mints helper JWT
- Rollback locates the most relevant RollbackPoint (by approvalId or actionId), logs rollback intent, and mints helper JWT
- Code: `app/api/automation/action/route.ts`

Desktop Helper handshake and reporting
- POST `/api/automation/helper/token` – mints short‑lived helper JWT; dynamic route
- POST `/api/automation/helper/report` – bearer‑token verify; persists ActionArtifact(s) and RollbackPoint; updates/creates ActionLog; dynamic route
- Code: `app/api/automation/helper/token/route.ts`, `app/api/automation/helper/report/route.ts`

One‑click health auto‑fix orchestration (Phase 2 acceptance)
- POST `/api/ohfixit/health/fix` – orchestrates preview → approve → execute via the central action endpoint
- Mapping from check → action: `lib/ohfixit/health-fix-map.ts`
- UI “Fix Now” calls this route; see `components/ohfixit/health-check-dashboard.tsx` and wiring in `app/(chat)/chat/[id]/chat-page.tsx`

Fixlets (playbooks)
- CRUD and execution APIs:
  - GET/POST `/api/ohfixit/fixlet`
  - GET/PUT/DELETE `/api/ohfixit/fixlet/[id]`
  - POST/PUT `/api/ohfixit/fixlet/[id]/execute`
  - GET/POST/DELETE `/api/ohfixit/fixlet/[id]/share`
- Code: `app/api/ohfixit/fixlet/*`

Health engine and dashboard
- Engine: `lib/ohfixit/health-check-engine.ts` – ≥10 checks across system/network/security/performance/browser; browser‑based with placeholders where helper is required
- Dashboard UI: `components/ohfixit/health-check-dashboard.tsx` – shows score, categories, quick fixes, and detailed results; emits onFixIssue for “Fix Now”

## JWT helper token details

- Implementation: `lib/ohfixit/jwt` via `jose`
- Signing: HS256; required secret: `OHFIXIT_JWT_SECRET` (falls back to `NEXTAUTH_SECRET`)
- TTL: ~10 minutes (600 seconds) for helper operations
- Claims include: `chatId`, `userId`, `anonymousId`, `actionId`, `approvalId`, `scope` ('execute' | 'report' | 'both')
- Strict scoping recommended: iss/aud constraints enforced in verification logic

## Data models (Drizzle ORM)

Located in `lib/db/schema.ts`:
- Audit trail
  - `ActionLog(id, chatId, userId, actionType, status, summary, payload, executionHost, outcome, createdAt)`
  - `ActionArtifact(id, actionLogId, type, uri, hash, createdAt)`
  - `RollbackPoint(id, actionLogId, method, data, createdAt)`
  - `ConsentEvent`, `DiagnosticsSnapshot`
- Health checks
  - `HealthCheck(id, chatId, userId, checkKey, status, score, details, createdAt)`
- Fixlets
  - `Fixlet`, `FixletStep`, `FixletExecution`, `FixletExecutionStep`, `FixletShare`, `FixletRating`
- Device and handoff
  - `DeviceProfile`, `PlaybookRun`, `PlaybookRunStep`, `HumanHandoffSession`

## Allowlist and previews

- Allowlist registry: `lib/ohfixit/allowlist.ts`
  - macOS‑safe examples: `flush-dns-macos`, `toggle-wifi-macos`, `clear-app-cache` (parameterizable), `restart-finder`, `clear-recent-items`, `reset-launchpad`, `clear-system-logs`
  - `generateActionPreview(actionId, parameters)` produces a Zod‑validated `ActionPreview`

## Health auto‑fix mapping (conservative)

- File: `lib/ohfixit/health-fix-map.ts`
- Current map:
  - `dns-health` → `flush-dns-macos`
  - `network-connectivity` → `toggle-wifi-macos`
  - `temp-files` → `clear-system-logs`
- Unmapped checks gracefully return 400 with clear message

## UI integration points

- Approval panel and audit timeline: `components/ohfixit-approval-panel`, `components/ohfixit-audit-timeline`
- Health dashboard renders “Fix Now” and calls `/api/ohfixit/health/fix`: `components/ohfixit/health-check-dashboard.tsx`
- Chat wiring renders dashboard and routes onFixIssue to the orchestration endpoint: `app/(chat)/chat/[id]/chat-page.tsx`

## Caching and route guidance

- Mutation/orchestration routes use dynamic/no‑store semantics (e.g., `dynamic = 'force-dynamic'` for helper routes; internal fetch calls use `cache: 'no-store'`)
- All inputs are Zod‑validated; orchestration enforces approval gating and expiry checks

## What’s done vs. what remains

Done (corresponds to checked roadmap items):
- Automation lifecycle through a single orchestrator; audit logging; helper JWT mint/verify
- Helper/report endpoint writes artifacts and rollback points
- Health checks engine + dashboard; “Fix Now” uses automation pipeline (preview → approve → execute) with rollback readiness
- Fixlets CRUD/execution/sharing and data model

Pending / next steps:
- Expand conservative health→action mapping and safe parameterization (e.g., time sync, bundle‑ID cache clearing)
- Implement privileged helper‑backed checks (firewall, OS updates, antivirus, startup hygiene)
- Verify/import/export Fixlets and device‑aware playbooks; extend tests
- Flesh out computer‑use executor behind flags with proper artifact capture and approvals
- Stabilize repo‑wide typecheck and some pre‑existing unit tests unrelated to this vertical

## Testing and quality gates (current)

- Unit tests: Health auto‑fix orchestration route tests pass (mapping and orchestration happy/unmapped cases).
- Broader test run status from this session:
  - New health auto‑fix tests: PASS
  - Some unrelated tests are failing (logger and diagnostics store/context) due to DB and request‑scope assumptions; these pre‑date this vertical and don’t stem from the new changes.
- Recommendation: Triage failing tests after this handoff; prioritize logger DB mocks and diagnostics request context setup for unit environments.

## How to continue (prioritized steps)

1) Expand mappings safely
- Add 1–2 additional macOS actions with clear rollbacks (e.g., NTP time sync helper command; app cache by bundle ID). Add unit tests for each mapping.

2) Privileged helper checks
- Add Desktop Helper adapters to power firewall, OS updates, antivirus, and startup hygiene checks. Persist artifacts (e.g., config snapshots) where useful.

3) Fixlets: playbook polish
- Verify import/export endpoints and device‑aware overrides; add integration tests for step execution and audit trail completeness.

4) Computer‑use executor (behind flags)
- Implement planner→executor with allowlist mapping and per‑step approvals; ensure screenshots/diffs logged as artifacts.

5) Quality stabilization
- Address repo‑wide type errors and unit flakiness (logger/diagnostics). Restore CI trust.

## Operational notes

- Environment: Set `OHFIXIT_JWT_SECRET` (or `NEXTAUTH_SECRET`) so helper JWTs are issued; ensure DB is configured for Drizzle migrations.
- Scripts:
  - Unit tests via Vitest (`test:unit`)
  - E2E via Playwright (`test`)
  - DB migration scaffolding (`db:generate`, `db:migrate`)

## Requirements coverage snapshot

- Phase 1 acceptance: Approving triggers helper; artifacts and rollback points recorded; rollback path queued with JWT and latest rollback point resolution → Implemented
- Phase 2 acceptance: ≥10 checks present; one‑click auto‑fix routes through automation pipeline with approval and rollback readiness → Implemented

## File index (quick pointers)

- Orchestrator: `app/api/automation/action/route.ts`
- Helper JWT/report: `app/api/automation/helper/token/route.ts`, `app/api/automation/helper/report/route.ts`
- Health auto‑fix orchestration: `app/api/ohfixit/health/fix/route.ts`
- Mapping: `lib/ohfixit/health-fix-map.ts`
- Allowlist/preview: `lib/ohfixit/allowlist.ts`
- Health engine: `lib/ohfixit/health-check-engine.ts`
- Dashboard UI: `components/ohfixit/health-check-dashboard.tsx`
- Chat integration: `app/(chat)/chat/[id]/chat-page.tsx`
- Fixlets: `app/api/ohfixit/fixlet/*`
- Data models: `lib/db/schema.ts`

---

If you need more depth in any area (e.g., Desktop Helper adapters or computer‑use executor), start with the pending items above; all core contracts are in place and designed to be extended safely.
