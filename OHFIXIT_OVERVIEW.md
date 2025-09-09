**What It Is**
- **AI Hub:** Single interface to chat with Claude, GPT, Gemini, Grok, and 100+ models.
- **Hands‑On Tech Helper:** “See it, diagnose it, fix it” workflows designed for everyday support.
- **Open Source & Ready:** Next.js 15 + React 19 app with Postgres/Drizzle and Vercel AI SDK.

**What It Does**
- **Multi‑model chat:** Attach files, generate images, run code, and perform deep research.
- **Zero‑friction trial:** Many features work without an account; full history when signed in.
- **Production tooling:** Resumable streams, sharing, branching chats, and performance caching.

**OhFixIt Features (Core)**
- **Assist Dock:** Right‑side hub to access “Do It For Me,” Issue Playbooks, Redaction Assist, Voice Mode, and Family Portal. `components/ohfixit/assist-dock.tsx:1`
- **Automation Panel (“Do It For Me”):** Preview → approve → execute allowlisted actions with rollback and audit logs. Uses an explicit allowlist and JWT‑gated approvals. `components/ohfixit/automation-panel.tsx:1`
- **Health Scan:** Runs device/network checks, returns a scored summary, and offers “Quick Fix” or “Open Guide” actions back into chat. `components/ohfixit/health-scan.tsx:1`
- **Fixlets & Playbooks:** Create, share, and run step‑by‑step solutions with per‑step state, notes, and artifacts. Backed by API routes and DB models for executions. `app/api/ohfixit/fixlet/[id]/execute/route.ts:1`
- **Guide Me Steps:** Structured, checkbox‑style steps the assistant proposes and updates; keep users in control with clear progress. `components/ohfixit/guide-steps.tsx:1`
- **Safe Automation Plans:** AI proposes actions of types `open_url`, `dom_instruction`, or `script_recommendation` with rationale and safety notes; user must approve. `lib/ai/tools/ohfixit/automation.ts:1`
- **Diagnostics + Consent:** One‑tap client diagnostics and explicit consent prompts feed the assistant context; everything is logged to an audit timeline. `components/ohfixit/collect-client-diagnostics.tsx:1`, `lib/ohfixit/logger.ts:1`
- **Screenshot Capture + Redaction:** Capture, annotate, and blur sensitive info before sharing; permission middleware and services manage capture safely. `components/ohfixit/screen-capture-button.tsx:1`, `components/ohfixit/redaction-assist.tsx:1`
- **Desktop Helper (optional):** Secure, short‑lived tokens let a local helper execute approved native actions; handshake/report endpoints and rollback model. `lib/ohfixit/desktop-helper-architecture.ts:1`
- **Allowlist & Safety Rails:** Granular allowlist of computer‑use actions with categories, risk levels, parameter validation, and approval requirements. `lib/ohfixit/computer-use-allowlist.ts:1`

**How It Works In Chat**
- **Context → Plan:** Screenshots and diagnostics inform a “Guide Me” plan or an “Automation Plan.”
- **Preview First:** Users get human‑readable previews (commands, risks, reversibility, estimated time).
- **Consent Gate:** Nothing executes without explicit approval; medium/high‑risk actions always gated.
- **Audit Trail:** Every consent, action, and diagnostic snapshot is recorded per chat for traceability.

**Tech Notes**
- **APIs:** Health check queue + results endpoints, fixlet CRUD/execution, action logs, consent events. `app/api/ohfixit/health/run/route.ts:1`
- **Env:** Set `OHFIXIT_JWT_SECRET` to enable automation approvals and helper tokens (README).
- **Safety:** Allowlist config enforces timeouts, retries, rollback, and approval policy.

**Try It**
- Web: https://ohfixit.app
- Local: `bun dev` after configuring `.env.local` (see README “Getting Started”).