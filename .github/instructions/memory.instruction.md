---
applyTo: '**'
---

# User Memory

## Project Context
- Current project: OhFixIt implementation within a Next.js chat application
- Tech stack: Next.js, Vercel AI SDK, Drizzle + Postgres, TypeScript
- Purpose: Automated troubleshooting and system maintenance with consent-by-design
- Current implementation status: Phase 0 and partial Phase 1 complete

## OhFixIt Implementation Status
- **Phase 0 (Complete)**: Foundation with audit models, allowlist, minimal tooling
- **Phase 1 (Partial)**: Server APIs implemented (preview/approve/execute/rollback, helper token/report). UI "Do It For Me" panel pending. Desktop Helper handshake (JWT) partially in place; artifacts/rollback persisted on report.
- **Phase 2**: Health checks dashboard (stubbed APIs, comprehensive engine exists)
- **Phase 3-9**: Not implemented yet

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

## Conversation History
- Roadmap file `docs/ohfixit-roadmap.md` dictates phased plan; this session focuses on continuing Phase 1 acceptance criteria.

## Notes
- Acceptance tracking:
	- Phase 1: Approving triggers helper; ActionLog enriched with artifacts and rollback handle (helper/report implemented). One-tap Undo to be wired in UI later.

## Implementation Priorities
1. Desktop Helper (Tauri) for privileged operations
2. Additional safe macOS actions (beyond the 3 currently implemented)
3. Real health check implementations (currently browser-only)
4. Playbooks and Fixlet Builder
5. Voice mode upgrade
6. Live screen share with WebRTC