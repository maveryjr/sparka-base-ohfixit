<div align="center">

<img src="public/icon.svg" alt="Oh Fix It" width="64" height="64">

# Oh Fix It - Tech Helper

**AI for everyone, from everyone**

*Multi-provider AI Chat - access Claude, ChatGPT, Gemini, and Grok with advanced features, open-source and production-ready.*

[**Try Oh Fix It**](https://ohfixit.app)


</div>

![sparka_gif_demo](https://github.com/user-attachments/assets/34a03eed-58fa-4b1e-b453-384351b1c08c)

Access every major AI assistant Claude, GPT-4, Gemini, Grok, and 20+ models through one interface. Get capabilities like document analysis, image generation, code execution, and research tools without managing multiple subscriptions. Try instantly, no signup required.


## ✨ Features

- **🤖 Multi-Model Chat** - Access 100+ AI models including Claude, GPT-5, Gemini, and Grok in one interface.
- **🎯 Easy to Try** - Try the interface and some features without creating an account.

- **📎 Attachment Support** - Upload and analyze images, PDFs, and documents in conversations.

- **🎨 AI-Powered Image Generation** - Generate and edit images with advanced AI models.

- **💻 Syntax Highlighting** - Beautiful code formatting and highlighting for all programming languages.

- **🔄 Resumable Streams** - Continue AI generations after page refreshes or interruptions.

- **🌳 Chat Branching** - Create alternative conversation paths without losing your original thread.

- **🔗 Chat Sharing** - Share conversations with others and collaborate on AI-assisted projects.

- **🔭 Deep Research** - Comprehensive research with real-time web search, source analysis, and cited findings.

- **⚡ Code Execution** - Run Python, JavaScript, and more in secure sandboxes.

- **📄 Document Creation** - Generate and edit documents, spreadsheets, and presentations.

For maintainers: see docs/handoff-guide-steps-streaming.md for the Guide Steps dynamic + streaming implementation notes.


## 🛠️ Tech Stack

Oh Fix It is built with modern technologies for scalability and performance:

### **Frontend**
- **Next.js 15**: App Router with React Server Components
- **TypeScript**: Full type safety and developer experience
## Development
   - OhFixIt Automation (Phase 1 slice)
      - Set OHFIXIT_JWT_SECRET in your environment (falls back to NEXTAUTH_SECRET if set).
      - Open a chat page and use the "Do It For Me" panel to:
         - List allowlisted actions, preview diffs/commands and risks
         - Approve (mints a short-lived helper token) and Execute (queues via helper/report pipeline)
         - Undo triggers a rollback request (helper should report artifacts and rollback handles)
         - Audit timeline renders recent consent, diagnostics snapshots, and action logs.
      - Desktop Helper integration
         - Handshake: POST /api/automation/helper/handshake with Authorization: Bearer <helperToken> to verify claims and register presence.
         - Reporting: POST /api/automation/helper/report with Authorization: Bearer <helperToken> and JSON payload { actionLogId?, actionId?, success, output, artifacts[], rollbackPoint }.

- **Tailwind CSS**: Responsive, utility-first styling
- **Radix UI**: Accessible component primitives
- **Framer Motion**: Smooth animations and transitions
- **Zustand**: Lightweight state management
- **Vercel AI SDK**: Unified AI provider integration
- **tRPC**: End-to-end typesafe APIs
- **Drizzle ORM**: Type-safe database operations
- **PostgreSQL**: Robust data persistence
- **Redis**: Caching and real-time features

### **AI Integration**
- **AI SDK v5**: Latest Vercel AI SDK for unified provider integration
- **AI SDK Gateway**: Models from various AI providers with automatic fallbacks


## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+ or Bun
- PostgreSQL database
- Redis (optional, for scaling)

### **Quick Start**

1. **Clone and Install**
   ```bash
   git clone https://github.com/maveryjr/sparka-base-ohfixit.git
   cd sparka-base-ohfixit
   bun install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Configure your environment variables
   ```

3. **Database Setup**
   ```bash
   bun run db:migrate
   ```

4. **Development Server**
   ```bash
   bun dev
   ```

Visit [http://localhost:3000](http://localhost:3000) to start using Oh Fix It locally.


## 🙏 Acknowledgements

Oh Fix It was built on the shoulders of giants. We're deeply grateful to these outstanding open source projects:

- **[Vercel AI Chatbot](https://github.com/vercel/ai-chatbot)** - Core architecture and AI SDK integration patterns
- **[Scira](https://github.com/zaidmukaddam/scira)** - AI-powered search engine

