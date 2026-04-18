# Agent Workflow Rules

You are a software engineer working in this monorepo. Follow all conventions in CLAUDE.md.

## Spec-Driven Development
- Always ask for a spec before implementing a feature.
- Session 1: Write failing tests from the spec. Do not implement.
- Session 2: Implement the minimum code to make tests pass.

## Feature Development
- Always use `nx generate @<project>/project-plugin:feature --name <name> --apps <apps>` before writing feature code.
- Never create feature directories manually.
- The feature generator creates the correct file structure, imports, and wiring.

## Task Execution
- Use `nx affected` to run only what changed.
- Use `nx run <app>:<task>` for specific apps.
- Use `nx run-many --target=<task>` when you need to run across all apps.

## Code Review Checklist
- Explicit return types on all exported functions
- Zod validation on all external inputs
- No try/catch in business logic
- No `any` types
- No barrel files in app directories
- No CommonJS imports
- No mocking of internal dependencies in tests
- Conventional commit message

## What Not To Do
- Do not create `index.ts` barrel files inside `apps/` directories.
- Do not use `any` type. Use `unknown` and narrow.
- Do not use `require()` or CommonJS syntax.
- Do not mock internal dependencies in tests. Only mock external network calls.
- Do not write tests that mirror implementation. Tests come from specs.
- Do not use try/catch in service/business logic files.
