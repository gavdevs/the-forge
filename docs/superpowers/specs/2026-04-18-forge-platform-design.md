# Forge Platform — Design Spec

An AI app builder that generates production-ready TypeScript monorepos via chat. Users describe what they want, Pi Agent builds it using the forge engine, and the platform handles hosting, previews, billing, and custom domains. Generated apps are always downloadable — users can self-host anytime.

---

## Philosophy

- **Opinionated by default.** Users never choose between Tailwind and Panda, SQLite and Postgres, or any other forge option. The platform makes every technical decision. One stack, no configuration.
- **SQLite only.** If an app outgrows SQLite, it's outgrown this platform. Download the source, host it yourself, swap in Postgres. That's a success story, not a failure.
- **No lock-in.** Source code is always downloadable. The generated project runs with `docker compose up` anywhere. The platform is convenience, not a cage.
- **You are the provider.** Users don't configure Stripe keys, Resend accounts, or API tokens. The platform wraps providers behind its own SDK. Users pay the platform, the platform pays providers.

---

## User Experience

### Building

User opens the platform, describes their app in chat:

> "Build me a SaaS for dog walkers to manage bookings and charge customers monthly"

The platform:
1. Pi Agent interprets intent → determines needed features (auth, bookings, payments, email notifications)
2. Forge generators scaffold silently — `workspace` + `api` + `web` with hardcoded defaults (standalone, tailwind, sqlite)
3. Pi Agent calls the feature generator for each feature (`bookings`, `customers`, `payments`)
4. Pi Agent fills in business logic inside the generated structure, guided by CLAUDE.md conventions
5. Preview spins up — user sees their app live at `preview-abc123.forgeplatform.dev`
6. User iterates via chat — "add a calendar view", "send email when booking is confirmed"

The user never sees: nx.json, package.json, tsconfig, Docker, or any infrastructure.

### Previewing

**Web preview:** Docker container built and deployed to Cloud Run. Available at `preview-{id}.forgeplatform.dev`. Scales to zero when idle.

**Mobile preview:** Two modes, user chooses:
- **Webview (default):** React Native components rendered via react-native-web in the browser preview. Instant, no setup. Good enough for layout and interaction during iteration.
- **Expo Go:** QR code in the builder UI. User scans with Expo Go on their phone. Real native rendering. Uses EAS Update for OTA pushes.

### Deploying

User clicks "Deploy" or says "deploy my app":
1. Docker image built from the generated project
2. Pushed to container registry
3. Cloud Run service created/updated
4. Available at `{project-name}.forgeplatform.dev`
5. Optional: user adds custom domain via the dashboard

### Custom Domains

- Powered by Cloudflare for SaaS (SSL for SaaS)
- User adds their domain in the platform dashboard
- Platform tells them to point a CNAME to `apps.forgeplatform.dev`
- Cloudflare provisions SSL automatically via API
- No cert management, no manual config
- Cost: free up to 100 hostnames, then $0.10/hostname/month
- We do NOT sell domains — users buy wherever they want and point them at us

### Source Code

- Always downloadable as a zip or git repo
- Generated project runs standalone with `docker compose up`
- Zero platform dependencies in the source (if user opts out of platform SDK, they wire up their own providers)
- This is the exit ramp: "outgrew us? Take your code and go"

---

## Platform Architecture

### Infrastructure

| Layer | Choice | Why |
|-------|--------|-----|
| Compute | Google Cloud Run | Scale to zero, per-second billing, push Docker image → get URL |
| Routing / SSL | Cloudflare for SaaS | API-driven custom domains, auto SSL, DDoS protection |
| Container registry | Google Artifact Registry | Push built images, Cloud Run pulls them |
| Preview URLs | `preview-{id}.forgeplatform.dev` | Wildcard DNS + Cloud Run revisions, scale to zero when idle |
| Database (user apps) | SQLite on Cloud Run persistent volumes | No DB server, file-based, matches forge stack |
| Database (platform) | SQLite or Postgres for platform's own data | Users, projects, billing, deployments |
| Code storage | Managed git (Gitea self-hosted or GitHub API) | Each project is a git repo |
| Builder API | Hono API (built with the forge) | Orchestrates everything |

### Builder Flow (Technical)

```
User message
  → Platform API receives chat message
  → Pi Agent session (injected with CLAUDE.md + AGENTS.md)
  → Pi Agent calls forge generators via Nx devkit (programmatically, not CLI)
  → Pi Agent writes business logic inside generated structure
  → Platform API triggers Docker build
  → Image pushed to Artifact Registry
  → Cloud Run service created/updated
  → Preview URL returned to user
```

### Pi Agent Integration

- Pi Agent runs in the platform backend, not on the user's machine
- Each project gets an isolated agent session
- The agent session is pre-loaded with:
  - CLAUDE.md (coding conventions)
  - AGENTS.md (workflow rules — use feature generator, spec-driven development)
  - The project's current file tree
  - PostToolUse hooks (auto-run tests after edits)
- Users can BYO API key (Anthropic, OpenAI, etc.) or pay for managed tokens
- Agent sessions are stateless between messages — context is rebuilt from the git repo each time

### Platform SDK

Generated apps that run on the platform use `@forgeplatform/sdk` instead of direct provider integrations:

```typescript
// Instead of raw Resend
import { email } from '@forgeplatform/sdk';
await email.send({ to, subject, body });

// Instead of raw Stripe/Polar
import { payments } from '@forgeplatform/sdk';
const checkout = await payments.createCheckout({ priceId, customerId });

// Instead of raw S3/storage
import { storage } from '@forgeplatform/sdk';
await storage.upload(file);
```

The SDK calls the platform API, which proxies to underlying providers using the platform's accounts. Users never handle API keys for third-party services.

**Ejection path:** When a user downloads their source code, they can swap SDK calls for direct provider calls. The SDK methods map 1:1 to standard provider APIs, so migration is straightforward.

---

## Revenue Model

### For the Platform

| Revenue stream | Pricing model | Platform cost |
|---------------|--------------|---------------|
| **AI tokens** | Per-token markup (20-50%) or monthly token bucket | Anthropic API cost |
| **Hosting** | Per-project/month ($5-15) | Cloud Run per-second billing |
| **Email** | Per 1k emails ($1-2) | Resend ~$0.40/1k |
| **Payments processing** | Percentage on transactions (1-2% on top of Stripe) | Stripe Connect fees |
| **Custom domains** | Included in hosting tier or small add-on | Cloudflare $0.10/hostname/month |
| **Storage** | Per GB/month | Cloud Run volumes / GCS |
| **Premium support** | Monthly tier | Your time |

### For User Apps (App Billing)

Users who want to charge their end users:
- Platform wraps Stripe Connect (or Polar)
- User's customer pays → Stripe → Platform takes cut → User gets remainder
- Platform handles the Stripe Connect onboarding flow
- Generated app has working checkout, webhook handler, subscription management
- This is a first-class feature, not an afterthought

---

## What the Forge Generators Need (Platform Mode)

The forge generators currently produce standalone apps with direct provider configs. For the platform, they need a **platform mode** that:

1. **Replaces direct provider imports with SDK calls** — email, payments, storage
2. **Points at platform API endpoints** instead of localhost for tRPC/auth
3. **Removes provider-specific env vars** — no RESEND_API_KEY, no STRIPE_SECRET_KEY
4. **Adds platform auth** — the app authenticates with the platform to use services
5. **Keeps the same file structure** — conventions, feature organization, testing rules all stay identical

This could be a flag on the workspace generator: `--platform=true` that swaps templates.

---

## Two Products, One Engine

### Product A: Forge Platform (non-technical users)
- Chat interface, no code visible
- "Build me X" → working app with preview
- All technical decisions made for them
- Monetize: hosting, tokens, email, payments, domains

### Product B: Forge CLI (technical users)
- `forge my-app` → scaffold, develop with Claude Code
- Full control, all options exposed
- Free / open-source
- Drives awareness, some users upgrade to platform for hosting

Both use the same generators, conventions, and agent guardrails. The difference is the interface and who makes the decisions.

---

## Not In Scope (For Now)

- **Domain registration** — users buy domains elsewhere, point CNAME at us
- **Postgres option** — SQLite only. Outgrowing SQLite = outgrowing the platform.
- **Multi-region** — single region to start. Add regions when demand justifies it.
- **Team collaboration** — single-user projects initially
- **Native app store deployment** — Expo EAS builds for preview only, not App Store/Play Store submission
- **Self-hosted platform** — the platform itself is not self-hostable (the generated apps are)
