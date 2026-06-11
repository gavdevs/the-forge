# The Forge Agent Instructions

This repository is The Forge: a private scaffold engine for creating new app repositories with the `forge` CLI. Agents working here are maintaining the generator system itself, not building inside a generated app.

## Purpose

- The Forge scaffolds opinionated TypeScript monorepos based on project choices.
- Generated projects must stand alone with zero runtime dependency on this repository.
- The global `forge` command is the intended user interface: run it from the parent directory where the new project should be created.

## Repo Map

- `cli/` contains the interactive `forge` command.
- `tools/forge/` contains the local Nx plugin and all scaffold generators.
- `tools/forge/src/generators/*/files/` contains templates copied into generated projects.
- `conventions/` contains agent and coding convention files copied into generated projects.
- `packages/` contains shared packages copied into generated projects.
- `docs/` contains design decisions, specs, and implementation plans for The Forge.

## Boundary Rules

- Root `AGENTS.md` is for working on The Forge repository only.
- Do not change `conventions/AGENTS.md` unless intentionally changing instructions for projects created by the CLI.
- Do not add dependencies from generated projects back to The Forge unless the generator itself requires them.
- Keep generated projects independent: copy templates and packages, do not link them to this repo.

## Local Setup

Use pnpm from the repository root:

```bash
pnpm install
```

The root `postinstall` script builds and links the CLI globally. To run setup explicitly:

```bash
pnpm setup
```

Verify the CLI is available:

```bash
command -v forge
forge my-app
```

If `forge` is not found after setup, restart the shell or run:

```bash
source ~/.zshrc
```

The link script uses `PNPM_HOME`, defaulting to `~/.local/share/pnpm` on Linux and `~/Library/pnpm` on macOS. It registers the local CLI globally with `pnpm add -g .` from `cli/`, which is the pnpm 11-compatible replacement for the old `pnpm link --global` flow.

## CLI Usage

Run the CLI from the directory that should contain the new project:

```bash
forge my-app
```

The CLI prompts for project type, selected apps, database, styling, and optional features. It then runs the Forge Nx generators, installs dependencies in the generated project, configures Nx AI agents when available, and initializes git.

## Development Workflow

- Edit prompt behavior in `cli/src/`.
- Edit scaffold structure in `tools/forge/src/generators/*/generator.ts`.
- Edit emitted files in `tools/forge/src/generators/*/files/`.
- Edit generated-project conventions in `conventions/` only when changing every future scaffolded project's agent or coding rules.
- After CLI changes, run `pnpm --filter @forge/cli run build` and relink with `node ./scripts/link-cli.js` or `pnpm setup`.

## Verification

Use focused checks while developing:

```bash
pnpm test
pnpm lint
```

For generator work, prefer the relevant generator test first, then the integration scaffold test. Before claiming CLI setup works, verify `command -v forge` returns a path and run a small scaffold in a temporary directory if needed.

## Safety

- Be careful with generated output paths. The CLI may overwrite an existing target directory during scaffold creation.
- Do not use destructive git commands unless the user explicitly requests them.
- Do not revert unrelated user changes in this repo.
- Keep changes minimal and scoped to the requested generator, template, CLI, or documentation area.
