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
- **React 19**: Latest React version with concurrent features
- **TypeScript 5.8**: Full type safety and developer experience
- **Tailwind CSS 4**: Responsive, utility-first styling
- **Radix UI**: Accessible component primitives
- **Framer Motion**: Smooth animations and transitions
- **Zustand**: Lightweight state management

### **Backend**
- **Node.js 18+** or **Bun 1.1.34**: Runtime environment
- **tRPC**: End-to-end typesafe APIs
- **Drizzle ORM**: Type-safe database operations
- **PostgreSQL**: Robust data persistence
- **Redis**: Caching and real-time features
- **NextAuth v5**: Authentication and session management

### **AI Integration**
- **Vercel AI SDK v5**: Unified AI provider integration
- **AI SDK Gateway**: Models from various AI providers with automatic fallbacks
- **Multi-provider support**: OpenAI, Anthropic, Google, xAI, and more
- **Code execution**: E2B sandboxes for secure code running
- **Web search**: Tavily and Exa integration for research
- **Image generation**: Multiple AI image models


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
   # Configure your environment variables (see Environment Variables section)
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

### **Environment Variables**

Configure the following environment variables in your `.env.local` file:

#### **Required**
- `AUTH_SECRET`: Random secret for authentication
- `POSTGRES_URL`: PostgreSQL database connection string
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob storage token

#### **AI Providers** (at least one required)
- `OPENAI_API_KEY`: OpenAI API key for GPT models
- `ANTHROPIC_API_KEY`: Anthropic API key for Claude models
- `GOOGLE_API_KEY`: Google API key for Gemini models
- `XAI_API_KEY`: xAI API key for Grok models

#### **Optional Features**
- `E2B_API_KEY`: For code execution capabilities
- `FIRECRAWL_API_KEY`: For web scraping in research
- `EXA_API_KEY`: For enhanced web search
- `REDIS_URL`: For improved performance and caching
- `OHFIXIT_JWT_SECRET`: For automation features

#### **Authentication (optional)**
- `AUTH_GOOGLE_ID` & `AUTH_GOOGLE_SECRET`: Google OAuth
- `AUTH_GITHUB_ID` & `AUTH_GITHUB_SECRET`: GitHub OAuth
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Email/password auth

## 🧪 Development

### **Available Scripts**

```bash
# Development
bun dev                    # Start development server with Turbo

# Database
bun run db:migrate         # Run database migrations
bun run db:studio          # Open Drizzle Studio
bun run db:generate        # Generate new migrations

# Building
bun build                  # Build for production
bun start                  # Start production server

# Testing
bun run test               # Run Playwright tests
bun run test:unit          # Run unit tests with Vitest
bun run test:types         # Type checking

# Code Quality
bun run lint               # Lint and format code
bun run format             # Format code with Biome

# Desktop Helper
bun run desktop-helper:dev     # Develop desktop helper
bun run desktop-helper:build   # Build desktop helper
```

### **OhFixIt Automation Features**

- Set `OHFIXIT_JWT_SECRET` in your environment
- Use the "Do It For Me" panel in chat to:
  - Preview and approve system actions
  - Execute commands with audit trails
  - Rollback changes when needed
  - View automation history

### **Desktop Helper Integration**

The desktop helper enables system-level automation:

- **Handshake**: `POST /api/automation/helper/handshake`
- **Reporting**: `POST /api/automation/helper/report`
- Built with Tauri for cross-platform support

## 🚀 Deployment

### **Vercel (Recommended)**

1. Fork this repository
2. Connect to Vercel
3. Configure environment variables
4. Deploy automatically

### **Self-Hosting**

1. Build the application:
   ```bash
   bun build
   ```

2. Set up PostgreSQL and Redis
3. Configure environment variables
4. Start the server:
   ```bash
   bun start
   ```

## 🧪 Testing

Oh Fix It includes comprehensive testing:

- **E2E Tests**: Playwright for full application testing
- **Unit Tests**: Vitest for component and utility testing
- **Type Safety**: TypeScript strict mode
- **Code Quality**: Biome for linting and formatting

Run the test suite:
```bash
bun run test        # E2E tests
bun run test:unit   # Unit tests
```

## 📖 Documentation

For more detailed information:

- **Architecture**: See `docs/` directory
- **API Reference**: tRPC endpoints in `trpc/routers/`
- **Components**: Storybook documentation
- **Contributing**: See contribution guidelines

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

Licensed under the Apache License 2.0. See [LICENSE](./LICENSE) for details.


## 🙏 Acknowledgements

Oh Fix It was built on the shoulders of giants. We're deeply grateful to these outstanding open source projects:

- **[Vercel AI Chatbot](https://github.com/vercel/ai-chatbot)** - Core architecture and AI SDK integration patterns
- **[Scira](https://github.com/zaidmukaddam/scira)** - AI-powered search engine

