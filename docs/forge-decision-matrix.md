# The Forge: Stack Decisions

One answer per layer. Solo dev. Minimal cost, minimal surface area.

---

## The Stack

| Layer | Choice |
|-------|--------|
| Package manager | pnpm |
| Monorepo | Nx |
| Runtime | Node |
| Frontend | React + Vite + TanStack Router |
| SSR / SEO | Astro + Hono (ISR via SQLite page cache) |
| Desktop | Tauri v2 |
| Mobile | Expo (default) · Tauri v2 mobile (desktop companion) |
| Backend | Hono |
| API contract | tRPC on Hono |
| Validation | Zod |
| Database | SQLite (default) · Postgres (when needed) |
| Vector search | sqlite-vec (SQLite) · pgvector (Postgres) |
| ORM | Drizzle |
| Auth | Better Auth |
| Payments | Polar |
| Styling | Tailwind v4 + shadcn/ui (AI-driven) · Panda CSS + Ark UI (hand-crafted) |
| AI plumbing | Vercel AI SDK |
| AI agents | Mastra (when needed) |
| Cron / background jobs | node-cron (in-process) |
| Testing | Vitest + Playwright + fast-check + Stryker (audit) |
| Deploy | Docker on Hetzner VPS, managed by Coolify |
| CDN / protection | Cloudflare (free plan, proxy mode) |
| Real-time | Hono WebSockets |
| Email (transactional) | Resend + React Email |
| Observability | OpenTelemetry → self-hosted Grafana on homelab |
| Feature flags | Env vars |

**Monthly cost: ~€4-5 for a single VPS that runs everything.** Coolify is free self-hosted. Cloudflare free plan. SQLite means no database server. Polar takes a cut only when you earn. One VPS runs all your projects.

---

## Why Each Choice

### pnpm
Strict dependency isolation. No phantom deps from hoisting. What works in the monorepo also works when the forge generates a standalone project.

### Nx
Generators. `nx generate @forge/api` scaffolds a full backend with your conventions baked in. Also gives affected commands for CI and module boundary enforcement. Without generators you're just copying folders.

### Node
Not Bun. Node is mature, Docker images are straightforward, zero edge cases. The speed difference doesn't matter at solo dev scale. Switching runtimes later is trivial if Bun matures.

### React + Vite + TanStack Router
SPA-first. Most things don't need SSR. TanStack Router gives fully typed file-based routing with built-in SWR caching via loaders. Vite builds it. Default for every web app.

### Astro + Hono for SSR / SEO
When SEO or static content pages matter. Astro ships zero JS by default. Interactive parts use React islands — only hydrate what needs interactivity. Hono serves as the SSR runtime via Astro's Hono adapter.

**ISR / page caching:** Pre-rendered HTML stored in a SQLite table. Hono middleware serves cached HTML on request. Cloudflare edge caches on top. Cache invalidation via node-cron or on-demand after data changes. No Redis needed — SQLite reads are sub-millisecond on NVMe and don't eat RAM. This replaces Cloudflare KV.

This replaces Next.js and every other meta-framework.

### Tauri v2
Desktop apps. 10-20MB bundles vs Electron's 100MB+. Uses the OS native webview. Your React SPA runs inside it — TanStack Query, tRPC, Router, Zod all work identically. Tauri-specific code is only for OS access (file system, system tray, notifications) via Rust commands. Tauri v2 also supports iOS/Android, so evaluate against Expo per-project.

### Expo
Mobile-first apps. Shares TanStack Query, tRPC client, Zod schemas, and business logic with web. NativeWind for Tailwind-style classes. Native CallKit/ConnectionService access for things like VoIP.

### Hono
Runs on Node or inside Docker. Web standards. Tiny. Handles API routes, SSR via Astro adapter, static files, WebSockets. One server.

### tRPC on Hono
End-to-end type safety. Reusable procedures. Batch fetching. Deep TanStack Query integration. Ctrl+click to resolvers. `@hono/trpc-server` mounts tRPC directly on Hono. You're the only consumer of every API you build.

### Zod
tRPC inputs. Drizzle schema inference. AI SDK structured outputs. Better Auth config. One validation library for the entire stack.

### SQLite (default) + sqlite-vec
Most apps don't need Postgres. SQLite is fast, zero-config, no separate server. Backups are copying a file. Docker: mount a volume.

**Vector / semantic search:** sqlite-vec extension. Pure SQLite, self-hosted, no vendor. Full replacement for Turso.

### Postgres (when needed) + pgvector
Multi-writer concurrency, PostGIS, or a project specifically demands it. pgvector for vector search. Drizzle schema syntax is nearly identical — switching is a driver swap.

### Drizzle
SQL-like TypeScript ORM. Works with both SQLite and Postgres. Migrations via `drizzle-kit`. Schemas in a shared package = single source of truth.

### Better Auth
TypeScript-first. Plugins for 2FA, passkeys, magic links, OAuth. Auth data lives in your database. Auto-generates Drizzle schemas.

### Polar
Payments for dev tools and digital products. Open-source friendly. No upfront cost — percentage on earnings. Fits solo dev products.

### Styling — chose per project at scaffold time
**Tailwind v4 + shadcn/ui:** Default for AI-driven builds. Deterministic utility classes produce the most reliable AI output. shadcn/ui components are copied into your project, fully owned. NativeWind for React Native.

**Panda CSS + Ark UI:** For projects you want to hand-craft or where visual identity matters. TypeScript object syntax, full theming with design tokens, style props on JSX. From the Chakra team — same mental model as styled-components/Chakra but zero runtime. Ark UI for headless component primitives. Type-safe tokens keep AI honest when it does assist.

### Vercel AI SDK
MIT licensed. Works anywhere. `generateText`, `streamText`, `generateObject`, `useChat` hook. Zod for structured outputs. 40+ providers.

### Mastra (when needed)
TypeScript-native agent framework. Hono server adapter. Built on AI SDK. Use for multi-step agents, workflows, RAG, memory. Skip for simple completions.

### node-cron (in-process)
Scheduled jobs run inside the Hono process. Cache invalidation, data refresh, cleanup. No Redis, no BullMQ, no separate container. If a job is heavy enough to block the server, spawn it as a child process or run a separate lightweight container for batch work.

### Vitest + Playwright + fast-check + Stryker
Vitest for unit/integration. Playwright for E2E. fast-check for property-based tests on pure logic — these can't be gamed by AI mirroring implementation. Stryker for periodic mutation testing to audit whether tests actually catch real bugs. Hono's built-in test client means API tests don't need a running server. PostToolUse hook in Claude Code auto-runs tests after every file edit so agents can't silently break things.

### Hono WebSockets
Built into Hono. Handles signaling servers, real-time updates, live features. No additional dependency. For TURN/STUN (WebRTC NAT traversal), add a coturn container managed by Coolify alongside the app.

### Docker on Hetzner + Coolify + Cloudflare
Every app is a Docker image. One Hetzner VPS runs them all. Coolify manages deploys — git-push, SSL via Traefik, health checks, rollbacks, one dashboard for all projects. Cloudflare proxies traffic — DDoS, WAF, edge caching, origin hidden.

Multiple projects share one VPS. Each is a Docker container. Each gets its own domain routed by Traefik. SQLite files on mounted volumes. If a project needs to be self-hostable, the same Docker image works on anyone's machine.

If the VPS fills up, get a bigger one or add a second. Still cheaper than any PaaS or managed service.

---

## Settled (Previously Open)

- **Email:** Forward Email for receiving (personal/domain). Resend for sending transactional email from apps (free tier: 3k/month). React Email for templates. Both.
- **Observability:** Self-hosted Grafana + Prometheus on Isengard (homelab), not on the Hetzner VPS. Apps send telemetry via OpenTelemetry. Add per-project only when warranted — most FOSS-niche apps won't need it.
- **Feature flags:** Env vars. Adding a service for feature flags as a solo dev is unnecessary ceremony.
- **Mobile default:** Expo. Native APIs (CallKit, ConnectionService) are the reason. Tauri v2 mobile only for the case where a desktop app needs a mobile companion from the same codebase.

---

## The Forge Architecture

```
THE FORGE (private, never shipped)
├── generators/              # Nx custom generators
│   ├── api/                 # Hono + tRPC + Drizzle + Better Auth
│   ├── web/                 # React + Vite + TanStack Router
│   ├── static/              # Astro + Hono ISR
│   ├── desktop/             # Tauri v2 + React
│   ├── mobile/              # Expo + React Native
│   └── feature/             # Cross-stack feature scaffold
├── agents/                  # Mastra dev agents
├── conventions/             # AGENTS.md, CLAUDE.md, coding standards
├── packages/
│   ├── ui/                  # shadcn/ui or Ark UI components
│   ├── shared/              # Zod schemas, types, utils
│   └── config/              # ESLint, TSConfig, Biome, style presets
├── pnpm-workspace.yaml
└── nx.json

GENERATED PROJECT (clean, zero forge dependency)
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── ui/                  # Copied, not linked
│   └── shared/              # Copied, not linked
├── Dockerfile
├── docker-compose.yml
├── vitest.config.ts
├── pnpm-workspace.yaml
└── nx.json
```

Generated projects stand alone. Shared packages are copied. The forge generates it, agents work on it, but the output has zero dependency on the forge.
