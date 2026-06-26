# Forge CLI — Reference

Complete flag matrix, framework comparison, generated layout, and known pitfalls for the Forge CLI.

## Install

The CLI is installed globally via pnpm when `the-forge` is set up:

```sh
pnpm install            # root: postinstall builds + links the CLI
command -v forge        # verify
```

To re-link manually: `pnpm setup` from `the-forge` repo root, or `node ./scripts/link-cli.js`.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success — project scaffolded and committed. |
| 1 | User cancelled (TUI) or missing required field with no flag set. |
| 2 | Usage error (unknown flag, invalid value, missing required field in non-interactive mode). |

Agents should treat 2 as "your command was malformed — fix the flags and retry".

## Full flag matrix

### `--name <name>`

- Required if no positional arg.
- Must match `^[a-z0-9-]+$`.
- Used as the directory name and the npm/pip package prefix.

### `--apps <list>`

Accepts space-separated, comma-separated, or both. Concatenates across multiple `--apps` flags. Examples:

```sh
--apps api web mobile
--apps api,web,mobile
--apps api --apps web
```

Valid values:

| Value | Description |
|---|---|
| `api` | Backend service. Choose `--framework` to pick Hono (TS) or Python (FastAPI). |
| `web` | React + Vite + TanStack Router + tRPC client + Better Auth. |
| `mobile` | Expo + React Native + expo-router. |
| `desktop` | Tauri v2 wrapper around `web`. Auto-adds `web` if omitted. |
| `static` | Astro site with Hono ISR + Drizzle-backed cache. |

At least one is required.

### `--framework <fw>`

Only meaningful when `--apps` includes `api`. Defaults to `hono`.

| Value | Stack |
|---|---|
| `hono` | Hono + tRPC + Drizzle + Better Auth (TypeScript). Supports `--features`. |
| `python` | FastAPI + SQLAlchemy 2.0 async + Alembic + Pydantic + uv (Python). No features. |

You cannot pick both — one backend per project. They share `apps/api/` and never coexist.

### `--database <db>`

Defaults to `sqlite`. Drives:

- Hono backend → Drizzle dialect (sqlite → `better-sqlite3`, postgres → `postgres`).
- Python backend → async driver (sqlite → `aiosqlite`, postgres → `asyncpg`).
- Static site → ISR cache DB.

### `--styling <s>`

Only affects `web`. Defaults to `tailwind`.

| Value | Stack |
|---|---|
| `tailwind` | Tailwind CSS v4 + shadcn/ui. Best for AI-driven builds. |
| `panda` | Panda CSS + Ark UI. Type-safe tokens, hand-crafted. |

### `--features <list>`

Comma- or space-separated. Only valid for the Hono backend — silently dropped for Python.

| Value | What it adds |
|---|---|
| `ai` | Vercel AI SDK + provider scaffolding. |
| `agents` | Mastra agents framework. |
| `payments` | Polar payments integration. |
| `email` | Resend + React Email. |
| `realtime` | Hono WebSockets channel helpers. |
| `cron` | node-cron scheduled jobs. |
| `vector` | Vector search (sqlite-vec / pgvector). |
| `observability` | OpenTelemetry exporters. |

### `--project-type <t>` / `--open-source`

| Value | Layout |
|---|---|
| `standalone` | Everything in one repo (`./<name>/`). |
| `open-source` | Parent wrapper (`./<name>-wrapper/`) hides AI tooling. Use for public projects. |

`--open-source` is a shorthand for `--project-type open-source`. If both are passed, `--project-type` wins.

### `--yes`

Forces non-interactive. Auto-set when any flag is passed, or when stdin is not a TTY (e.g., piped from an agent).

## Generated layout

```
<name>/
├── AGENTS.md                          # project conventions, points to per-app AGENTS.md
├── nx.json / package.json             # Nx workspace
├── docker-compose.yml.template        # dev services
├── apps/
│   ├── api/                           # Hono OR Python (mutually exclusive)
│   │   ├── AGENTS.md                  # framework-specific conventions
│   │   └── ...
│   ├── web/                           # if selected
│   ├── mobile/                        # if selected
│   ├── desktop/                       # if selected
│   └── static/                        # if selected
├── packages/
│   ├── shared/                        # cross-app types/zod schemas
│   ├── ui/                            # shadcn primitives (tailwind) or ark wrappers (panda)
│   └── config/                        # tsconfig/eslint base
└── tools/
    └── project-plugin/                # @<name>/project-plugin — `nx generate feature`
```

For `--open-source`, the whole tree is inside `./<name>-wrapper/<name>/`, with `AGENTS.md` hoisted to the wrapper root.

## Per-app AGENTS.md

Each generated `apps/<app>/AGENTS.md` is framework-aware. The api generator emits different content for Hono vs Python — agents always see language-specific guidance for the backend they're working in.

## Known pitfalls

- **Python requires `uv`.** The CLI runs `uv sync` automatically when `--framework python`, but only if `uv` is on PATH. If the user doesn't have it, install from https://docs.astral.sh/uv/ first.
- **Features silently dropped for Python.** Don't pass `--features` with `--framework python`; it has no effect.
- **Desktop requires web.** Omitting `web` when `desktop` is selected auto-adds `web`. The reverse is not true.
- **`--name` format is strict.** Lowercase, digits, hyphens only. No underscores, no uppercase.
- **Existing directory is overwritten.** If `./<name>/` already exists, the CLI wipes it after the workspace generator writes to its temp location inside the forge repo. Confirm with the user before running in a populated directory.
- **Open-source wraps even an empty app.** Passing `--open-source` without `--apps` still produces a valid wrapper repo with no apps.
- **Git init may fail silently.** Some sandboxes block `git init`. The CLI logs a warning and continues. Run `git init && git add -A && git commit` manually if needed.
- **Python deps install may fail silently.** Same as above — the CLI logs a skip and continues. Run `cd apps/api && uv sync` manually.

## Examples (full)

```sh
# Minimal API-only TypeScript
forge svc --apps api --framework hono --database sqlite

# Minimal API-only Python
forge py --apps api --framework python --database postgres

# Full SaaS stack with everything
forge my-saas --apps api web --framework hono --database postgres \
  --styling tailwind --features ai,payments,email,observability

# Mobile + desktop cross-platform with realtime chat
forge chat --apps api web mobile desktop --features realtime

# Open-source Astro static site with ISR
forge docs --apps static --open-source
```
