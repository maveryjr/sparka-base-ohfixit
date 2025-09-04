---
applyTo: '**'
---

# User Memory

## User Preferences
- Programming languages: TypeScript, JavaScript
- Code style preferences: Conservative, minimal diffs, Zod for validation, Drizzle for DB, App Router patterns
- Development environment: VS Code on macOS, zsh shell
- Communication style: Concise but thorough, skimmable checklists, actionable summaries

## Project Context
- Current project type: Next.js App Router full‑stack web app
- Tech stack: Next.js (App Router), React 19, TypeScript, Drizzle ORM + Postgres, Tailwind, Vitest, Playwright
- Architecture patterns: API route handlers, server actions, allowlist-driven automation pipeline, audit logging
- Key requirements: Approval workflow (preview → approve → execute → rollback), helper JWT, audit artifacts/rollback points, health check engine & dashboard, Fixlets lifecycle

## Coding Patterns
- Preferred patterns and practices: Zod schemas for inputs/outputs, typed DB access via Drizzle, strict JWT iss/aud, dynamic=no-store for mutation routes, small incremental changes
- Code organization preferences: lib/ohfixit/* for domain logic; app/api/* for endpoints; components/* for UI; tests under tests/
- Testing approaches: Vitest for unit tests, Playwright for E2E; test happy path + unmapped/edge cases
- Documentation style: Roadmap-driven with acceptance criteria, durable handoff summaries

## Context7 Research History
- Libraries researched on Context7: Vercel AI SDK v5 (tools, tool(), streamText), Zod v4 usage nuances
- Best practices discovered: Prefer dynamic = 'force-dynamic' for helper endpoints; cache: 'no-store' for POST; strict iss/aud on JWT; approval TTL ≈10m
- Implementation patterns used: Orchestrate preview → approve → execute via central automation endpoint; conservative health→action mapping
- Version-specific findings: AI SDK v5 requires `inputSchema` for tools (Zod or JSON Schema). Avoid `.optional()` in strict providers; prefer `.nullable()` where optionality is needed. Zod v4 `z.record` requires both key and value types, e.g. `z.record(z.string(), z.any())`.
 - Durable summary: See docs/ohfixit-handoff.md for compact technical handoff and code pointers.

## Conversation History
- Important decisions made: Enforce one-click auto-fix through approval pipeline; persist artifacts and rollback via helper/report; conservative mappings first
- Recurring questions or topics: Verification that roadmap checkmarks reflect real implementations; health checks coverage; Fixlet lifecycle
- Solutions that worked well: Centralized automation/action route with audit logging; zod-validated mapping and orchestration route; UI wiring for Fix Now
- Things to avoid or that didn't work: Ad‑hoc execution paths bypassing approvals; broad/unscoped JWTs

## Notes
- Environment: Requires OHFIXIT_JWT_SECRET (or NEXTAUTH_SECRET) for helper JWT
- Next steps: Expand mappings; privileged checks via helper; stabilize type errors; add tests per new mapping
 - Handoff: A durable summary capturing architecture, endpoints, data models, and next steps is available at docs/ohfixit-handoff.md.

## Branding
- Rebranded application from "Sparka AI" to "Oh Fix It" across codebase.
- Updated site metadata, PWA manifest, UI labels, README/docs, and GitHub links.
- Internal prefixes updated:
	- appPrefix: `ohfixit`
	- Redis keys: `ohfixit:*`
	- Blob storage prefix: `ohfixit/files/`
- Backward-compat: kept legacy string handling where necessary (e.g., stripping `sparka-ai/files/` in clone helpers) to avoid breaking existing data.
---
applyTo: '**'
---

# User Memory

## Project Context
- Current project: OhFixIt implementation within a Next.js chat application
- Tech stack: Next.js, Vercel AI SDK, Drizzle + Postgres, TypeScript
- Purpose: Automated troubleshooting and system maintenance with consent-by-design
 - Current implementation status: Phase 0 complete; Phase 1 largely implemented; Phase 2 partially implemented (auto-fix via automation pipeline)

## OhFixIt Implementation Status
- **Phase 0 (Complete)**: Foundation with audit models, allowlist, minimal tooling
 - **Phase 1 (Largely Complete)**: Server APIs implemented (preview/approve/execute/rollback, helper token/report/status). UI approval panel present. Desktop Helper handshake (JWT) in place; artifacts/rollback persisted on report.
 - **Phase 2 (In Progress)**: Health checks engine and run/results APIs implemented; HealthCheckDashboard wired. One-click safe auto-fix flows through preview → approve → execute via `/api/ohfixit/health/fix` and reuses automation pipeline with rollback.
- **Phase 3-9**: Not implemented yet

## Recent Updates (this session)
- Fixed chat image-upload crash caused by AI SDK tool schema mismatch. Several tools used `parameters` instead of required `inputSchema` leading to runtime `_zod` undefined error during tool schema access.
- Updated tools: `lib/ai/tools/screenshot-capture.ts`, `lib/ai/tools/ui-automation.ts`, `lib/ai/tools/computer-use.ts` to use `inputSchema`; corrected Zod v4 `z.record` signatures; added `PlanStep` typing.
- Performed Context7 research to confirm AI SDK v5 tool schema requirements and Zod v4 patterns.
- Added note to audit remaining tools and add regression tests for image attachments and tool schema validation.
- Added health auto-fix orchestration using the automation pipeline (preview → approve → execute) via new API: POST `/api/ohfixit/health/fix`.
- Created conservative mapping from select health checks to allowlisted actions (dns-health → flush-dns-macos, network-connectivity → toggle-wifi-macos, temp-files → clear-system-logs).
- Wired `HealthCheckDashboard` into chat page with onFixIssue handler calling the new API.
- Added unit test for health auto-fix route.
 - Observed repository-wide TypeScript type errors in unrelated areas; new changes do not introduce additional errors.
 - Refactored `lib/ai/tools/ohfixit/guide-steps.ts` to remove all hardcoded issue patterns (e.g., printer/drive mapping). Guide steps are now generated dynamically via AI (`generateObject`) against `GuidePlanSchema`, with normalization and a robust fallback. This aligns with the preference to keep troubleshooting logic model-driven rather than rule-based.

### New or Changed Files
- `lib/ohfixit/health-fix-map.ts` – conservative mapping and `HealthFixRequestSchema`.
- `app/api/ohfixit/health/fix/route.ts` – orchestrates preview → approve → execute via automation action endpoint.
- `app/(chat)/chat/[id]/chat-page.tsx` – integrates `HealthCheckDashboard` with “Fix Now”.
- `tests/unit/health.fix.route.test.ts` – unit tests for mapping/orchestration and unmapped case.

## Coding Patterns
- Uses inline interfaces with function parameters
- No index barrel files
- Direct imports with named exports
- Comprehensive error handling
- Consent-by-design for all automation
- Immutable audit logging

## Research Findings
- Desktop Helper needs Tauri for secure cross-platform execution
- WebRTC for live screen share
- Whisper STT for voice mode
- JWT-scoped authentication for helper communication
- Allowlist-based action execution with rollback capabilities

## Context7 Research History
- Next.js App Router and route handlers used for APIs; Drizzle ORM schemas for audit tables.
- JWT via jose for helper tokens; acceptance: short-lived tokens and scoped claims.
- Drizzle ORM Postgres patterns reviewed (Context7) for schema/query usage; ensured new code conforms to existing patterns.
 - Verified allowlist and desktop-helper alignment patterns for safe automation.

## Conversation History
- Roadmap file `docs/ohfixit-roadmap.md` dictates phased plan; this session focuses on continuing Phase 1 acceptance criteria.

## Notes
- Acceptance tracking:
	- Phase 1: Approving triggers helper; ActionLog enriched with artifacts and rollback handle (helper/report implemented). One-tap Undo to be wired in UI later.
	- Phase 2: Auto-fix now routes through the automation pipeline with approval + rollback available for mapped checks; expand mappings next.

## Known Gaps / Follow-ups
- Stabilize TypeScript typecheck (numerous pre-existing errors)
- Expand health→action mappings conservatively and parameterize safely
- Privileged helper-backed checks (firewall, OS updates, antivirus)
- Verify fixlet import/export endpoints and device-aware playbooks
- Implement computer-use executor with artifact capture
 - Consider adding streaming object generation for guide steps for better UX; add unit tests to validate schema conformity and id normalization.

## Implementation Priorities
1. Desktop Helper (Tauri) for privileged operations
2. Additional safe macOS actions (beyond the 3 currently implemented)
3. Real health check implementations (currently browser-only)
4. Playbooks and Fixlet Builder
5. Voice mode upgrade
6. Live screen share with WebRTC