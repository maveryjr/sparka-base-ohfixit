# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Development**
- `bun dev` - Start development server with Turbo (default: localhost:3000)
- `bun run dev` - Alternative dev command

**Building & Production**
- `bun run build` - Run database migrations then build for production
- `bun start` - Start production server

**Code Quality**
- `bun run lint` - Run Next.js linting + Biome linting with auto-fix
- `bun run lint:fix` - Run linting with fixes for both Next.js and Biome
- `bun run format` - Format code with Biome
- `bun run test:types` - TypeScript type checking

**Database Operations**
- `bun run db:generate` - Generate Drizzle schema files
- `bun run db:migrate` - Run database migrations
- `bun run db:studio` - Open Drizzle Studio for database management
- `bun run db:push` - Push schema changes to database
- `bun run db:pull` - Pull schema from database
- `bun run db:check` - Check schema consistency
- `bun run db:up` - Update database schema

**Testing**
- `bun run test` - Run Playwright E2E tests (sets PLAYWRIGHT=True environment variable)
- `bun run test:unit` - Run Vitest unit tests

**Desktop Helper (Tauri Application)**
- `bun run desktop-helper:dev` - Start Tauri development server
- `bun run desktop-helper:build` - Build Tauri desktop application
- `bun run desktop-helper:install` - Install desktop helper dependencies

**Other Utilities**
- `bun run fetch-models` - Fetch latest AI model configurations
- `bun run storybook` - Start Storybook development server
- `bun run build:storybook` - Build Storybook for production

## Architecture Overview

### Core Technology Stack
- **Framework**: Next.js 15 with App Router and React Server Components
- **Package Manager**: Bun (specified in packageManager field)
- **Database**: PostgreSQL with Drizzle ORM for type-safe operations
- **Authentication**: NextAuth.js with Google/GitHub OAuth and Supabase email/password
- **AI Integration**: Vercel AI SDK v5 with multiple provider support (Anthropic, OpenAI, Google, xAI)
- **Styling**: Tailwind CSS with Radix UI components
- **State Management**: Zustand for client state
- **API Layer**: tRPC for end-to-end typesafe APIs
- **Code Quality**: Biome for linting/formatting, TypeScript for type safety

### Key Features & Components

**Multi-Provider AI Chat**
- Access to 100+ AI models through unified interface
- Tools integration for code execution, web search, document analysis
- Streaming responses with resumable capabilities
- Chat branching for alternative conversation paths

**OhFixIt Automation System** (Phase 2.6 active branch)
- Desktop helper integration with Tauri application
- Automation approval panel with audit timeline
- JWT-based helper token authentication
- Rollback system for automation actions
- Consent tracking and diagnostics snapshots

**Document & Artifact Management**
- Support for text, code, and spreadsheet documents
- Real-time collaborative editing capabilities
- Version control and suggestion system
- File upload support (images, PDFs, documents)

**Advanced Features**
- Deep research with web search integration
- Code interpreter with E2B sandboxes
- Image generation and editing
- Stock chart visualization
- Weather data integration

### Database Schema Structure

**Core Tables**:
- `User` - User accounts with credits system
- `Chat` - Conversations with visibility controls
- `Message` - Chat messages with branching support via parentMessageId
- `Document` - Generated artifacts (text/code/sheets)
- `Vote` - Message voting system

**OhFixIt Tables**:
- `ConsentEvent` - User consent tracking for automation
- `ActionLog` - Automation action audit trail
- `DiagnosticsSnapshot` - System diagnostics captures
- `RollbackPoint` - Rollback data for automation actions
- `ActionArtifact` - Automation execution artifacts

### File Structure Patterns

**App Router Structure**:
- `app/(auth)/` - Authentication pages and API routes
- `app/(chat)/` - Main chat interface and functionality
- `app/api/` - API routes including automation, diagnostics, OhFixIt endpoints

**Key Directories**:
- `lib/ai/` - AI providers, tools, and model management
- `lib/db/` - Database schema, migrations, and queries
- `lib/ohfixit/` - OhFixIt automation system components
- `components/` - React components organized by feature
- `trpc/routers/` - tRPC API route definitions
- `hooks/` - Custom React hooks
- `providers/` - React context providers

### Environment Configuration

Critical environment variables (see .env.example):
- Database: `POSTGRES_URL`
- Authentication: `AUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET`, `AUTH_GITHUB_ID/SECRET`
- AI Providers: `OPENAI_API_KEY`, `FIREWORKS_KEY`
- External Services: `FIRECRAWL_API_KEY`, `EXA_API_KEY`, `E2B_API_KEY`
- Storage: `BLOB_READ_WRITE_TOKEN`
- Observability: `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`
- OhFixIt: `OHFIXIT_JWT_SECRET` (falls back to NEXTAUTH_SECRET)

### Testing Setup

**Playwright E2E Tests**:
- Located in `tests/` directory
- Requires authentication setup via `auth.setup.ts`
- Covers chat, artifacts, reasoning, and guide-mode functionality
- Uses storage state for authenticated tests

**Unit Tests**:
- Located in `tests/unit/` directory 
- Uses Vitest with Node.js environment
- Focuses on OhFixIt automation components and utilities

### Desktop Helper Integration

The repository includes a Tauri-based desktop helper application:
- Located in `desktop-helper/` directory
- Provides system-level automation capabilities
- Integrates with main application via JWT authentication
- Handles automation execution and rollback functionality

### Development Notes

- Uses Bun as the primary package manager and runtime
- TypeScript strict mode enabled with path aliases (`@/*` maps to root)
- Biome handles code formatting and linting (replaces ESLint/Prettier)
- Database migrations run automatically during build process
- Hot reloading enabled via Next.js Turbo mode