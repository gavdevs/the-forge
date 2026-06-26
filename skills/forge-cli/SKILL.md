---
name: forge-cli
description: "Scaffold a new TypeScript or Python monorepo from a single command using the Forge CLI. Use when you need to create a new app from scratch — full stack (api + web + mobile + desktop + static), Python service, or anything in between."
---

# Forge CLI

The Forge scaffolds opinionated TypeScript/Python monorepos. The CLI accepts flags so an agent can scaffold a project in one shot without driving a TUI.

## When to use this skill

- You need to start a brand-new app and the user wants to use the forge scaffold.
- You know what apps, framework, database, styling, and features are wanted — no design interview needed.
- The user (or you) have already decided `forge <name> ...` is the right move.

If the user wants a grilling session first to decide what to build, hand off to `grill-me` or `grill-with-docs` first.

## Quick start

Run `forge` with the name as the first arg and flags for everything else. Any flag → non-interactive mode (the TUI is skipped). Missing required fields print usage and exit non-zero.

```sh
# Minimal full-stack TypeScript app
forge my-app --apps api web --framework hono --database postgres

# Pure Python API service
forge py-svc --apps api --framework python --database sqlite

# Cross-platform launcher with realtime + AI
forge launcher --apps web mobile desktop --features ai,realtime

# Open-source layout with parent wrapper
forge oss --apps api web --framework hono --open-source
```

A passing invocation returns 0. A usage error returns 2. The project lands at `./<name>/` (or `./<name>-wrapper/<name>/` for open-source).

## Flags

| Flag | Values | Default |
|---|---|---|
| `--name <name>` | lowercase letters/numbers/hyphens | (required if no positional arg) |
| `--apps <list>` | `api web mobile desktop static` (space- or comma-separated) | (required) |
| `--framework <fw>` | `hono` \| `python` | `hono` (only when `--apps` includes `api`) |
| `--database <db>` | `sqlite` \| `postgres` | `sqlite` |
| `--styling <s>` | `tailwind` \| `panda` | `tailwind` |
| `--features <list>` | `ai,agents,payments,email,realtime,cron,vector,observability` | none |
| `--project-type <t>` | `standalone` \| `open-source` | `standalone` |
| `--open-source` | (shorthand for `--project-type open-source`) | — |
| `--yes` | (force non-interactive; auto-set when stdin is not a TTY) | — |
| `--help`, `-h` | show usage | — |

The first positional argument is the project name.

## Recipes

- **Solo API service (Python)**: `forge py-svc --apps api --framework python --database postgres`
- **SaaS web app**: `forge my-saas --apps api web --framework hono --database postgres --features ai,payments,email`
- **Cross-platform with realtime**: `forge chat --apps api web mobile desktop --features realtime`
- **Static site only**: `forge docs --apps static --database sqlite`
- **Open-source wrapper**: `forge oss --apps api web --framework hono --open-source`

For the full flag matrix, framework comparison, generated layout, and known pitfalls, see [REFERENCE.md](./REFERENCE.md).

## Verification

After `forge` exits 0:

1. `cd <name>` (or `cd <name>-wrapper/<name>` for open-source)
2. `pnpm install`
3. For Python API: `cd apps/api && uv sync && uv run pytest`
4. `git log --oneline` — should show the initial scaffold commit
5. Inspect `apps/<app>/AGENTS.md` — verify it matches the framework you chose

If `forge` exits non-zero, read stderr — usage errors explain exactly what is missing or invalid.
