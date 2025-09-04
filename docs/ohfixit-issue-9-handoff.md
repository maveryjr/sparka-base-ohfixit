# OhFixIt – Trust, Consent, and Audit Trail (Issue #9) Handoff

## 1) Conversation Overview
- Primary Objectives:
  - Begin and complete Issue #9: Trust, Consent, and Audit Trail for OhFixIt MVP in Oh Fix It.
  - Integrate consent management, audit logging, and an audit timeline UI, referencing `docs/ohfixit-integration-issue.md`.
- Session Context:
  - Prior milestones landed Screen Capture + Annotator, Diagnostics toolkit + consent, Diagnostics context injection, and “Guide Me” tool + UI.
  - This handoff focuses on Trust, Consent, and Audit Trail: DB schema, API routes, UI consent prompts, server logging helpers, and an audit timeline.
- Intent Evolution:
  - Shift from core MVP features to trust/transparency: explicit consent gates, previews/dry-run summaries, and per-chat audit timelines.

## 2) Technical Foundation
- Next.js App Router with Route Handlers; dynamic APIs use `cache: 'no-store'`.
- Vercel AI SDK v5 tool-calling with Zod schemas; streaming in `app/(chat)/api/chat/route.ts`.
- Drizzle ORM (Postgres) with schema in `lib/db/schema.ts`, migrations in `lib/db/migrations/`, configured via `drizzle.config.ts`.
- shadcn/ui for dialogs/toggles; Zod for validation; testing with Vitest + Playwright; Biome for lint/format.
- Conventions: PascalCase table names; camelCase columns; JSON fields for message parts/attachments.

## 3) Codebase Status
- docs/ohfixit-integration-issue.md: Canonical spec with acceptance criteria; proposes tables `consent_event`, `action_log`, `diagnostics_snapshot`, and an audit timeline UI.
- lib/db/schema.ts: Current schema for User, Chat, Message, Vote, Document, Suggestion; follows naming conventions.
- drizzle.config.ts: Points to `./lib/db/schema.ts` and `./lib/db/migrations`.
- lib/db/migrate.ts: Programmatic migrator; package.json includes `db:migrate`.
- app/(chat)/api/chat/route.ts: Main streaming endpoint; injects diagnostics context into system prompt.
- lib/ohfixit/*: diagnostics-store, diagnostics-context, os-capabilities; tools under lib/ai/tools/ohfixit/*.
- components/ohfixit/*: capture/annotator, diagnostics consent modal, guide steps, automation preview.
- tests/unit/*: diagnostics-store, diagnostics-context, tool schemas.

## 4) Problem Resolution (Recent)
- Fixed Next.js server action export violation by removing 'use server' from value-exporting tool modules and using `server-only` imports.
- Normalized diagnostics payload keys and updated preview/UI.
- Confirmed system prompt enrichment with environment context.

## 5) Progress Tracking
- Completed:
  - Screen capture + annotation; integrated with multimodal input and attachments.
  - Diagnostics toolkit + consent modal; network check tool; in-memory diagnostics store.
  - Diagnostics context builder + system prompt enrichment.
  - “Guide Me” plan tool + checklist UI; tool registration and rendering.
  - Unit tests for diagnostics and plan schemas; build issues resolved.
- Pending (Issue #9):
  - DB: Add `consent_event`, `action_log`, `diagnostics_snapshot`.
  - Migrations and Drizzle schema updates.
  - APIs: POST consent, POST action log, GET audit timeline.
  - Consent prompts with live preview/dry-run summaries.
  - Per-chat audit timeline UI component and integration.
  - Server logging helpers for tools and actions.
  - Tests (unit + E2E) for consent and audit flow.

## 6) Active Work State
- Ready to implement DB schema/migrations, then API endpoints, UI, and server helpers.
- Integration points validated: tools registry, chat route system prompt, header UI, message rendering.

## 7) Recent Operations
- Repo scans for OhFixIt and trust/audit-related terms; verified route and tools wiring.
- Reviewed `docs/ohfixit-integration-issue.md` for acceptance criteria and schema guidance.
- Confirmed diagnostics endpoints and components exist; tool registration verified.

## 8) Continuation Plan (Actionable)
1) Schema + Migrations
   - Add to `lib/db/schema.ts`:
     - consentEvent: id (uuid pk), chatId (fk -> Chat, cascade), userId (nullable fk -> User), kind (varchar 64), payload (json), createdAt (timestamp default now).
     - actionLog: id (uuid pk), chatId (fk), userId (nullable fk), actionType (varchar 64), summary (text), payload (json), status (varchar 32), createdAt (timestamp default now).
     - diagnosticsSnapshot: id (uuid pk), chatId (fk), userId (nullable fk), payload (json), createdAt (timestamp default now).
   - Create migration under `lib/db/migrations/` and run `bun run db:migrate`.

2) API Endpoints (App Router)
   - POST `/api/ohfixit/consent` → record consent events.
   - POST `/api/ohfixit/action-log` → record actions (proposed/approved/completed/failed) with payload.
   - GET `/api/ohfixit/audit?chatId=...` → return combined timeline (consents, actions, snapshots) sorted desc, paginated.
   - Use Zod validation; `cache: 'no-store'`; attribute via userId or anonymous session id.

3) UI: Consent & Audit Timeline
   - Consent prompts for screenshot, diagnostics, and automation (preview/dry-run) using shadcn/ui dialogs.
   - New `components/ohfixit/audit-timeline.tsx` to render grouped events with status icons and summaries; mount under chat view.

4) Server Utilities
   - `lib/ohfixit/logger.ts` with helpers to write consent/action entries from tools and APIs; export typed functions.

5) Tests
   - Unit: Zod schemas for API bodies; Drizzle types; logger helpers.
   - Integration: API route handlers for POST/GET.
   - E2E (Playwright): consent prompt submit and audit timeline update.

Acceptance criteria is tracked in `docs/ohfixit-integration-issue.md`; implement incrementally starting with DB → APIs → UI. 