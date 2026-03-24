# The Forge — Design Spec

An Nx-based private monorepo that generates standalone, agent-optimized projects using an opinionated TypeScript stack. Generated projects have zero dependency on the forge. The entire system is designed so AI agents (Claude Code) can build features with minimal hallucination by providing strict types, explicit return types, Zod validation, and baked-in conventions.

---

## User Experience

Run `forge my-app` from anywhere. An interactive CLI walks through decisions:

1. **Project name** — from CLI arg or prompted
2. **Project type** — standalone | open-source (parent wrapper hides agentic files)
3. **Which apps** — multi-select: api, web, mobile, desktop, static
4. **Database** — SQLite (default) | Postgres
5. **Styling** — Tailwind v4 + shadcn/ui (default) | Panda CSS + Ark UI
6. **Optional features** — multi-select: AI (Vercel AI SDK), Agents (Mastra), Payments (Polar), Email (Resend + React Email), Real-time (Hono WebSockets), Cron Jobs (node-cron), Vector Search (sqlite-vec or pgvector based on DB choice), Observability (OpenTelemetry)

After prompts, the CLI calls Nx generators in sequence, copies shared packages, runs `pnpm install`, configures Nx MCP + AI skills, and initializes git. The result is a fully runnable project.

Distribution: clone the forge repo, `pnpm link --global` the CLI. Works on all devices via git pull.

---

## Forge Repo Structure

```
the-forge/
├── tools/
│   └── forge/                       # Local Nx plugin (all generators)
│       ├── src/generators/
│       │   ├── workspace/           # Root project structure
│       │   ├── api/                 # Hono + tRPC + Drizzle + Better Auth
│       │   ├── web/                 # React + Vite + TanStack Router
│       │   ├── mobile/             # Expo + React Native + NativeWind
│       │   ├── desktop/            # Tauri v2 + React
│       │   ├── static/             # Astro + Hono ISR
│       │   └── feature/            # Cross-app feature scaffold
│       ├── generators.json
│       └── package.json
├── cli/                             # The `forge` interactive command
│   └── src/
│       ├── index.ts                 # Entry point
│       └── prompts.ts               # @clack/prompts interactive flow
├── agents/                          # Mastra dev agents
├── conventions/                     # CLAUDE.md, AGENTS.md templates
├── packages/
│   ├── ui/                          # shadcn/ui or Ark UI — copied into generated projects
│   ├── shared/                      # Zod schemas, types, utils — copied
│   └── config/                      # TSConfig, Biome presets — copied
├── docs/
├── nx.json
├── pnpm-workspace.yaml
└── package.json
```

Each generator has:
- `schema.json` — options, flags, validation, defaults
- `schema.d.ts` — TypeScript interface for options
- `generator.ts` — logic using `@nx/devkit` (generateFiles, addDependenciesToPackageJson, updateJson, etc.)
- `files/` — EJS template files that get copied with interpolation

---

## Generated Project Structure

### Standalone

```
my-app/
├── apps/
│   ├── api/
│   ├── web/
│   ├── mobile/
│   └── ...                          # Based on selections
├── packages/
│   ├── ui/                          # Copied, not linked
│   ├── shared/                      # Copied, not linked
│   └── config/                      # Copied, not linked
├── tools/
│   └── project-plugin/              # Local Nx plugin (feature generator only)
│       ├── src/generators/feature/  # Same structure as forge's feature generator
│       ├── generators.json
│       └── package.json
├── .claude/
│   └── settings.json                # PostToolUse hook for auto-running tests
├── CLAUDE.md                        # Full coding standards from forge conventions
├── AGENTS.md                        # Agent workflow rules
├── nx.json
├── pnpm-workspace.yaml
├── biome.json
├── tsconfig.base.json
├── Dockerfile                       # Multi-stage, node alpine, layer caching
├── docker-compose.yml               # Per-app services
├── vitest.config.ts
├── .env.example
├── .gitignore
└── package.json
```

### Open-Source (parent wrapper)

```
my-app-wrapper/                      # Private, never pushed publicly
├── CLAUDE.md                        # Agent instructions, conventions
├── AGENTS.md                        # Agent workflow rules
├── .claude/
│   └── settings.json                # PostToolUse hook, MCP config
└── my-app/                          # Public repo — no trace of AI tooling
    ├── apps/
    ├── packages/
    ├── tools/
    ├── nx.json
    ├── Dockerfile
    └── ...
```

---

## Generator Details

### `workspace` generator

Creates the root project structure. Everything else builds on this.

**Produces:**
- `nx.json`, `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`
- `biome.json` — single quotes, semicolons, 2-space indent, trailing commas, 100 print width
- `vitest.config.ts` — workspace-level config
- `Dockerfile` — multi-stage production build, node alpine
- `docker-compose.yml` — per-app service entries (added by app generators)
- `.gitignore`, `.env.example`
- `CLAUDE.md` — generated from `conventions/`, contains full coding standards and testing rules
- `AGENTS.md` — agent workflow rules
- `.claude/settings.json` — PostToolUse hook that auto-runs `npx vitest run --reporter=verbose 2>&1 | tail -20` after every Write/Edit
- Copies `packages/ui/`, `packages/shared/`, `packages/config/` from forge
- For open-source: creates parent wrapper directory, nests project inside, agentic files in wrapper only
- Runs `nx configure-ai-agents` to set up Nx MCP server and skills

### `api` generator

Hono + tRPC + Drizzle + Better Auth. Runnable immediately.

**Produces:**
```
apps/api/src/
├── middleware/
│   ├── auth.ts                      # Better Auth middleware
│   └── errorHandler.ts              # Hono onError handler
├── lib/
├── db/
│   ├── schema.ts                    # Drizzle schema (SQLite or Postgres)
│   └── migrations/
├── auth/
│   ├── auth.ts                      # Better Auth instance — providers, plugins, Drizzle adapter
│   ├── authSchema.ts                # Drizzle schema for auth tables
│   └── authRoutes.ts                # Mounted on Hono at /api/auth/*
├── features/                        # Empty — feature generator populates
├── trpc.ts                          # tRPC init, context, base procedures
└── index.ts                         # Hono app entry, mounts tRPC + middleware + auth routes
```

Plus `vitest.config.ts`, `tsconfig.json`, `package.json`, `.env.example`, `Dockerfile`.

Adds service entry to root `docker-compose.yml` with SQLite volume mount.

### `web` generator

React + Vite + TanStack Router. tRPC client wired to API.

**Produces:**
```
apps/web/src/
├── components/                      # Layout, shared UI primitives
├── hooks/
├── lib/
│   ├── trpc.ts                      # tRPC client setup
│   └── auth.ts                      # Better Auth client, React hooks
├── features/                        # Empty — feature generator populates
├── routes/
│   ├── __root.tsx
│   ├── login.tsx
│   └── signup.tsx
└── main.tsx
```

Plus `vite.config.ts`, `tsconfig.json`, `package.json`, `Dockerfile`.

Styling based on choice — Tailwind v4 + shadcn/ui or Panda CSS + Ark UI.

### `mobile` generator

Expo + React Native. Shares tRPC client, Zod schemas, business logic with web.

**Produces:**
```
apps/mobile/src/
├── components/
├── hooks/
├── lib/
│   ├── trpc.ts                      # tRPC client (same contract as web)
│   └── auth.ts                      # Better Auth client for React Native
├── features/
│   └── auth/                        # Pre-populated auth feature
│       ├── LoginScreen.tsx
│       └── SignupScreen.tsx
└── navigation/                      # Expo Router file-based routing
```

Plus `app.json`, `tsconfig.json`, `package.json`. NativeWind for Tailwind-style styling.

No Dockerfile — mobile builds are native.

### `desktop` generator

Tauri v2 wrapping the `apps/web/` SPA. The desktop app always shares the web frontend — Tauri points its webview at the web app's dev server (dev) or built output (prod). Tauri-specific code is only for OS access (file system, system tray, notifications) via Rust commands.

**Produces:**
```
apps/desktop/
├── src/
│   └── lib.rs                       # Tauri Rust commands for OS access
├── tauri.conf.json                  # Points build.devUrl at apps/web dev server
├── Cargo.toml
└── package.json
```

Requires `web` app to exist. No Dockerfile — desktop builds are native.

### `static` generator

Astro + Hono ISR with SQLite page cache.

**Produces:**
```
apps/static/src/
├── pages/                           # Astro pages (.astro files)
├── components/                      # React islands for interactive parts
├── layouts/
└── lib/
    └── cache.ts                     # SQLite page cache — read/write/invalidate
```

Plus `astro.config.ts` (Hono adapter), `tsconfig.json`, `package.json`, `Dockerfile`.

### `feature` generator

Called as: `nx generate @my-app/project-plugin:feature --name users --apps api,web,mobile`

Explicitly specify which apps. Supports: api, web, mobile, desktop, static. Creates per-app:

**API side:**
```
apps/api/src/features/<name>/
├── router.ts                        # tRPC router with empty procedures, registered in app router
├── service.ts                       # Business logic stubs with correct imports + return types
├── service.test.ts                  # Empty test file with correct imports
└── types.ts                         # Zod schemas for this feature
```
Also registers the router in the API's app router and adds shared schema to `packages/shared/`.

**Web side:**
```
apps/web/src/features/<name>/
├── <Name>List.tsx                   # Component stub with tRPC hook wired
├── use<Name>Actions.ts             # Hook stub
└── <name>List.test.ts
```

**Mobile side:**
```
apps/mobile/src/features/<name>/
├── <Name>List.tsx                   # React Native component stub with tRPC hook
├── use<Name>Actions.ts
└── <name>List.test.ts
```

**Desktop side** (adds Tauri Rust command stubs if the feature needs OS access):
```
apps/desktop/src/
└── commands/<name>.rs               # Rust command stubs (only if feature needs OS APIs)
```
Most features don't need desktop-specific files since the desktop app shares the web SPA. The feature generator only creates desktop files when `--apps` explicitly includes `desktop`.

**Static side:**
```
apps/static/src/
├── pages/<name>/
│   └── index.astro                  # Astro page for this feature
└── components/<name>/
    └── <Name>Island.tsx             # React island for interactive parts
```

The feature generator is the agent guardrail — it constrains Claude Code to fill in business logic inside an already-correct structure rather than deciding file names, imports, and wiring from scratch.

---

## Optional Features

Selected during CLI prompts. Each modifies the `api` generator output by adding a feature directory.

### AI (Vercel AI SDK)

```
apps/api/src/features/ai/
├── router.ts                        # tRPC procedures wrapping generateText/streamText
├── service.ts                       # AI SDK calls, model config
└── types.ts                         # Zod schemas for structured outputs
```
Plus `packages/shared/src/schemas/ai.ts`.

### Agents (Mastra)

```
apps/api/src/features/agents/
├── router.ts
├── service.ts                       # Mastra agent setup, workflows
└── types.ts
```
Plus `mastra.config.ts` at api root.

### Payments (Polar)

```
apps/api/src/features/payments/
├── router.ts                        # Webhook handler, subscription status
├── service.ts                       # Polar SDK integration
└── types.ts
```

### Email (Resend + React Email)

```
apps/api/src/features/email/
├── router.ts                        # Send email procedures
├── service.ts                       # Resend client setup
├── types.ts
└── templates/
    └── Welcome.tsx                  # React Email template
```

### Real-time (Hono WebSockets)

```
apps/api/src/features/realtime/
├── router.ts                        # REST fallback endpoints
├── service.ts                       # Business logic for real-time events
├── types.ts                         # Zod schemas for message types
└── websocket.ts                     # Hono WebSocket upgrade, registered in index.ts
```

### Cron Jobs (node-cron)

```
apps/api/src/features/cron/
├── jobs/                            # Individual job files
│   └── example.ts                   # Example cron job with schedule
├── scheduler.ts                     # node-cron setup, job registration
└── types.ts                         # Job config types
```
Scheduler is imported and started in `apps/api/src/index.ts`. Jobs run in-process. Heavy jobs should spawn a child process.

### Vector Search (sqlite-vec / pgvector)

```
apps/api/src/db/
└── vector.ts                        # Vector search setup — sqlite-vec extension loading or pgvector config
```
Adds vector column helpers to the Drizzle schema. Extension choice follows database choice: sqlite-vec for SQLite, pgvector for Postgres.

### Observability (OpenTelemetry)

```
apps/api/src/lib/
└── telemetry.ts                     # OpenTelemetry SDK setup, trace/metric exporters
```
Configures OTLP exporter pointing at a configurable endpoint (default: self-hosted Grafana on homelab). Instruments Hono middleware for request tracing. Added per-project only when selected — most apps won't need it.

---

## Shared Packages (Copied into Generated Projects)

### `packages/shared/`

```
packages/shared/src/
├── schemas/                         # Shared Zod schemas
│   └── index.ts
├── types/
│   └── trpc.ts                      # AppRouter type export for tRPC client type inference
└── utils/
    └── index.ts
```

### `packages/ui/`

shadcn/ui components (Tailwind choice) or Ark UI components (Panda choice). Fully owned copies.

### `packages/config/`

Shared tsconfig, biome presets. Consumed by all apps.

---

## Agent Integration in Generated Projects

Every generated project is immediately ready for Claude Code development:

1. **CLAUDE.md** — full coding standards from forge conventions (strict types, explicit return types, Zod validation, file naming, error handling, testing rules). Includes the barrel file rule: no `index.ts` inside app directories, only at package boundaries.
2. **AGENTS.md** — agent workflow rules (see below)
3. **.claude/settings.json** — PostToolUse hook auto-runs `npx vitest run --reporter=verbose 2>&1 | tail -20` after every Write/Edit
4. **Nx MCP server** — configured via `nx configure-ai-agents`, gives Claude Code workspace introspection (project graph, generator discovery, task running)
5. **Nx skills** — Claude Code knows how to use `nx affected`, `nx generate`, `nx run`
6. **Feature generator as local plugin** — `tools/project-plugin/` ships with the project so `nx generate @my-app/project-plugin:feature` works without the forge
7. **Spec-driven testing rules** — CLAUDE.md enforces two-session pattern (tests from spec first, implementation second)

### AGENTS.md Contents

Generated from `conventions/AGENTS.md` template. Contains:

- **Role definition** — "You are a software engineer working in this monorepo. Follow all conventions in CLAUDE.md."
- **Workflow rules** — spec-driven development: always ask for a spec before implementing, write tests from spec in session 1, implement in session 2
- **Feature development** — always use `nx generate @my-app/project-plugin:feature --name <name> --apps <apps>` before writing feature code. Never create feature directories manually.
- **Task execution** — use `nx affected` to run only what changed. Use `nx run <app>:<task>` for specific apps.
- **Code review rules** — check explicit return types on all exports, verify Zod validation on all inputs, ensure no try/catch in business logic
- **Commit rules** — conventional commits, one logical change per commit
- **What not to do** — no barrel files in app directories, no `any` types, no CommonJS, no mocking internal dependencies in tests

---

## TypeScript Config (All Projects)

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "target": "ES2022",
  "module": "ESNext",
  "moduleResolution": "bundler"
}
```

---

## Docker

`docker-compose.yml` at project root with per-app services:

```yaml
services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    volumes:
      - ./data:/app/data
    ports:
      - "3000:3000"
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "5173:5173"
```

Each app Dockerfile: multi-stage build, node alpine, proper COPY order for layer caching, health checks, restart policy. Mobile and desktop excluded (native builds).

Deploy target: Docker on Hetzner VPS managed by Coolify, Cloudflare in front. Deploy setup is manual per-project, not generated.

---

## Decisions That Are Not Configurable

These are the whole point of the forge — settled choices that reduce agent hallucination:

- TypeScript strict mode everywhere
- ESM only
- Hono for backend
- tRPC for API contract
- Zod for all validation
- Drizzle for ORM
- Better Auth for authentication
- Biome for linting + formatting
- Vitest for testing
- Explicit return types on all exported functions
- Feature-based file organization
- camelCase files, PascalCase React components
- Named exports (default only for React components)
- No try/catch in business logic
- Tests next to code
