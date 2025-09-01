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
- **Phase 1 (Partial)**: Server APIs and UI approval flow implemented; Desktop Helper and additional actions needed
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

## Implementation Priorities
1. Desktop Helper (Tauri) for privileged operations
2. Additional safe macOS actions (beyond the 3 currently implemented)
3. Real health check implementations (currently browser-only)
4. Playbooks and Fixlet Builder
5. Voice mode upgrade
6. Live screen share with WebRTC