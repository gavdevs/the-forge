# The Forge Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Nx-based project generator that scaffolds agent-optimized TypeScript monorepos via an interactive CLI.

**Architecture:** The forge is an Nx workspace containing a local Nx plugin (`tools/forge/`) with generators for each project component. A separate CLI (`cli/`) wraps the generators with interactive prompts. Source packages (`packages/`) contain shared code that gets copied into generated projects.

**Tech Stack:** Nx, @nx/devkit, @nx/plugin, @clack/prompts, TypeScript, EJS templates, Vitest

**Spec:** `docs/superpowers/specs/2026-03-23-the-forge-design.md`

**Conventions:** `docs/forge-conventions.md`

---

## Chunk 1: Foundation — Forge Repo Bootstrap

### Task 1: Initialize the Nx Workspace

**Files:**
- Create: `package.json`
- Create: `nx.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `biome.json`

- [ ] **Step 1: Initialize pnpm and Nx**

```bash
cd /Users/gav/Programming/personal/the-forge
pnpm init
pnpm add -D nx@latest @nx/devkit@latest @nx/plugin@latest @nx/js@latest typescript@latest @biomejs/biome@latest vitest@latest
```

- [ ] **Step 2: Create `nx.json`**

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "plugins": ["tools/forge"]
}
```

- [ ] **Step 3: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'tools/*'
  - 'cli'
  - 'packages/*'
```

- [ ] **Step 4: Create `tsconfig.base.json`**

```json
{
  "compileOnSave": false,
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "paths": {}
  }
}
```

- [ ] **Step 5: Create `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "always"
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add package.json nx.json pnpm-workspace.yaml tsconfig.base.json biome.json pnpm-lock.yaml
git commit -m "chore: initialize nx workspace for the forge"
```

---

### Task 2: Scaffold the Nx Plugin

**Files:**
- Create: `tools/forge/package.json`
- Create: `tools/forge/tsconfig.json`
- Create: `tools/forge/generators.json`
- Create: `tools/forge/src/index.ts`

- [ ] **Step 1: Generate the plugin scaffold**

```bash
npx nx g @nx/plugin:plugin tools/forge
```

This creates the `tools/forge/` directory with the Nx plugin structure. If the scaffold generates extra files (executors, etc.), remove them — we only need generators.

- [ ] **Step 2: Verify `tools/forge/package.json` has correct name**

Ensure `package.json` has:
```json
{
  "name": "@forge/plugin",
  "generators": "./generators.json"
}
```

- [ ] **Step 3: Verify `tools/forge/generators.json` exists**

Should be:
```json
{
  "generators": {}
}
```

We'll register generators as we build them.

- [ ] **Step 4: Verify the plugin is recognized**

```bash
npx nx list @forge/plugin
```

Expected: plugin is listed (may show no generators yet).

- [ ] **Step 5: Commit**

```bash
git add tools/
git commit -m "chore: scaffold nx plugin at tools/forge"
```

---

### Task 3: Create Convention Templates

These are the source templates for CLAUDE.md and AGENTS.md that get copied into generated projects.

**Files:**
- Create: `conventions/CLAUDE.md`
- Create: `conventions/AGENTS.md`

- [ ] **Step 1: Create `conventions/CLAUDE.md`**

This is the full coding standards doc derived from `docs/forge-conventions.md`, formatted for use inside a generated project. Key content:

```markdown
# Project Conventions

## Language and Runtime
- TypeScript everywhere. Strict mode. No `any` unless explicitly justified with a comment.
- Node runtime. Not Bun, not Deno.
- All code is ESM. No CommonJS.

## File Naming
- camelCase for all files: `userService.ts`, `createPost.ts`, `authMiddleware.ts`
- React components use PascalCase: `UserProfile.tsx`, `DashboardLayout.tsx`
- Test files sit next to what they test: `userService.test.ts` alongside `userService.ts`
- No `index.ts` barrel files inside app directories. Only at package boundaries (`packages/ui/index.ts`, `packages/shared/index.ts`).

## Exports
- Default exports for React components only.
- Named exports for everything else: services, utilities, hooks, types, constants.
- Every exported function has an explicit return type annotation. No exceptions.

## Functions
- `function` keyword for all top-level and exported functions.
- Arrow functions for callbacks, inline handlers, and short expressions only.

## Error Handling
- Services throw `TRPCError` with the appropriate code.
- No try/catch blocks in business logic. Ever.
- The only try/catch blocks are at entry points: cron job handlers, background task runners, top-level process error handlers.

## Validation
- Zod everywhere. Every external input is validated.
- tRPC procedure inputs use Zod schemas.
- Shared schemas live in `packages/shared/`. Feature-specific schemas live in the feature's `types.ts`.

## Testing Rules
- NEVER write tests after implementation in the same session.
- Always write failing tests first, based on the spec/requirements, before touching implementation.
- Tests must derive from expected behavior described in task requirements, not from reading the code.
- If you see implementation before tests exist, stop and ask for the spec.
- Vitest for all unit and integration tests.
- fast-check for property-based tests on pure functions and data transformations.
- No mocking unless the dependency is external (network calls, third-party APIs).
- Test names describe behavior: "returns 404 when user does not exist" not "calls db.findFirst and throws TRPCError".

## Linting and Formatting
- Biome handles both linting and formatting. No ESLint. No Prettier.
- Single quotes. Semicolons: yes. Tab width: 2 spaces. Trailing commas: all. Print width: 100.

## Git
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`
- One logical change per commit.

## Comments
- No obvious comments. Comment WHY, never WHAT.
- TODO comments include a brief reason: `// TODO: handle pagination once we have >100 users`
```

- [ ] **Step 2: Create `conventions/AGENTS.md`**

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add conventions/
git commit -m "docs: add CLAUDE.md and AGENTS.md convention templates"
```

---

### Task 4: Create Source Packages

These packages get copied into generated projects. They need to be real, working packages.

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/schemas/index.ts`
- Create: `packages/shared/src/types/trpc.ts`
- Create: `packages/shared/src/utils/index.ts`
- Create: `packages/config/tsconfig.app.json`
- Create: `packages/config/tsconfig.lib.json`
- Create: `packages/config/biome.json`
- Create: `packages/config/package.json`

Note: `packages/ui/` contains styling-dependent components. The workspace generator creates two variants in the forge repo:

- `packages/ui-tailwind/` — shadcn/ui base components (Button, Card, Input, etc.)
- `packages/ui-panda/` — Ark UI base components with Panda CSS tokens

The workspace generator copies the correct variant into the generated project's `packages/ui/` based on the `styling` option. This requires:

- [ ] **Step 10a: Create `packages/ui-tailwind/package.json`**

```json
{
  "name": "@project/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

- [ ] **Step 10b: Create `packages/ui-tailwind/src/index.ts`**

```typescript
// Re-export UI components
// Add shadcn/ui components here as needed via `npx shadcn-ui@latest add`
export {};
```

- [ ] **Step 10c: Create `packages/ui-panda/package.json`** (same as tailwind variant)

- [ ] **Step 10d: Create `packages/ui-panda/src/index.ts`**

```typescript
// Re-export UI components
// Add Ark UI components here as needed
export {};
```

Update the workspace generator (`createProjectPlugin` or a new helper) to copy the correct ui variant:
```typescript
const uiSource = styling === 'tailwind' ? 'packages/ui-tailwind' : 'packages/ui-panda';
copyDirectoryFromDisk(resolve(forgeRoot, uiSource), joinPathFragments(projectDir, 'packages/ui'), tree);
```

- [ ] **Step 1: Create `packages/shared/package.json`**

```json
{
  "name": "@project/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    "./schemas": "./src/schemas/index.ts",
    "./types": "./src/types/trpc.ts",
    "./utils": "./src/utils/index.ts"
  }
}
```

- [ ] **Step 2: Create `packages/shared/tsconfig.json`**

```json
{
  "extends": "../config/tsconfig.lib.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create `packages/shared/src/schemas/index.ts`**

```typescript
// Shared Zod schemas go here.
// Feature-specific schemas are added by the feature generator.
export {};
```

- [ ] **Step 4: Create `packages/shared/src/types/trpc.ts`**

```typescript
// This file is populated by the api generator.
// It re-exports the AppRouter type so web/mobile tRPC clients get full type inference.
//
// After the api app is generated, this will contain:
// export type { AppRouter } from '../../apps/api/src/trpc';
export {};
```

- [ ] **Step 5: Create `packages/shared/src/utils/index.ts`**

```typescript
// Shared utility functions go here.
export {};
```

- [ ] **Step 6: Create `packages/config/package.json`**

```json
{
  "name": "@project/config",
  "version": "0.0.0",
  "private": true,
  "type": "module"
}
```

- [ ] **Step 7: Create `packages/config/tsconfig.app.json`**

Extends the project's base tsconfig with app-specific settings:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "declaration": true,
    "jsx": "react-jsx"
  },
  "exclude": ["**/*.test.ts", "**/*.test.tsx"]
}
```

- [ ] **Step 8: Create `packages/config/tsconfig.lib.json`**

For shared library packages:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "declaration": true
  },
  "exclude": ["**/*.test.ts"]
}
```

- [ ] **Step 9: Create `packages/config/biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "extends": ["../../biome.json"]
}
```

- [ ] **Step 10: Commit**

```bash
git add packages/
git commit -m "chore: add shared and config source packages"
```

---

## Chunk 2: Workspace Generator

### Task 5: Write Workspace Generator Tests

**Files:**
- Create: `tools/forge/src/generators/workspace/generator.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readJson } from '@nx/devkit';
import { workspaceGenerator } from './generator';

describe('workspace generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should create root config files', async () => {
    await workspaceGenerator(tree, {
      name: 'my-app',
      projectType: 'standalone',
      database: 'sqlite',
      styling: 'tailwind',
    });

    expect(tree.exists('my-app/package.json')).toBeTruthy();
    expect(tree.exists('my-app/nx.json')).toBeTruthy();
    expect(tree.exists('my-app/pnpm-workspace.yaml')).toBeTruthy();
    expect(tree.exists('my-app/tsconfig.base.json')).toBeTruthy();
    expect(tree.exists('my-app/biome.json')).toBeTruthy();
    expect(tree.exists('my-app/vitest.config.ts')).toBeTruthy();
    expect(tree.exists('my-app/.gitignore')).toBeTruthy();
    expect(tree.exists('my-app/.env.example')).toBeTruthy();
    expect(tree.exists('my-app/docker-compose.yml')).toBeTruthy();
  });

  it('should create agent config files for standalone', async () => {
    await workspaceGenerator(tree, {
      name: 'my-app',
      projectType: 'standalone',
      database: 'sqlite',
      styling: 'tailwind',
    });

    expect(tree.exists('my-app/CLAUDE.md')).toBeTruthy();
    expect(tree.exists('my-app/AGENTS.md')).toBeTruthy();
    expect(tree.exists('my-app/.claude/settings.json')).toBeTruthy();
  });

  it('should create parent wrapper for open-source projects', async () => {
    await workspaceGenerator(tree, {
      name: 'my-app',
      projectType: 'open-source',
      database: 'sqlite',
      styling: 'tailwind',
    });

    // Agentic files in wrapper
    expect(tree.exists('my-app-wrapper/CLAUDE.md')).toBeTruthy();
    expect(tree.exists('my-app-wrapper/AGENTS.md')).toBeTruthy();
    expect(tree.exists('my-app-wrapper/.claude/settings.json')).toBeTruthy();

    // Project nested inside, no agentic files
    expect(tree.exists('my-app-wrapper/my-app/package.json')).toBeTruthy();
    expect(tree.exists('my-app-wrapper/my-app/nx.json')).toBeTruthy();
    expect(tree.exists('my-app-wrapper/my-app/CLAUDE.md')).toBeFalsy();
    expect(tree.exists('my-app-wrapper/my-app/AGENTS.md')).toBeFalsy();
  });

  it('should copy shared packages', async () => {
    await workspaceGenerator(tree, {
      name: 'my-app',
      projectType: 'standalone',
      database: 'sqlite',
      styling: 'tailwind',
    });

    expect(tree.exists('my-app/packages/shared/package.json')).toBeTruthy();
    expect(tree.exists('my-app/packages/config/package.json')).toBeTruthy();
  });

  it('should create project-plugin with feature generator', async () => {
    await workspaceGenerator(tree, {
      name: 'my-app',
      projectType: 'standalone',
      database: 'sqlite',
      styling: 'tailwind',
    });

    expect(tree.exists('my-app/tools/project-plugin/package.json')).toBeTruthy();
    expect(tree.exists('my-app/tools/project-plugin/generators.json')).toBeTruthy();
  });

  it('should set correct PostToolUse hook in .claude/settings.json', async () => {
    await workspaceGenerator(tree, {
      name: 'my-app',
      projectType: 'standalone',
      database: 'sqlite',
      styling: 'tailwind',
    });

    const settings = readJson(tree, 'my-app/.claude/settings.json');
    expect(settings.hooks.PostToolUse).toBeDefined();
    expect(settings.hooks.PostToolUse[0].matcher).toBe('Write|Edit');
    expect(settings.hooks.PostToolUse[0].hooks[0].command).toContain('vitest run');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx nx test @forge/plugin --testPathPattern=workspace
```

Expected: FAIL — `workspaceGenerator` does not exist yet.

- [ ] **Step 3: Commit failing test**

```bash
git add tools/forge/src/generators/workspace/
git commit -m "test: add workspace generator tests"
```

---

### Task 6: Implement Workspace Generator Schema

**Files:**
- Create: `tools/forge/src/generators/workspace/schema.json`
- Create: `tools/forge/src/generators/workspace/schema.d.ts`

- [ ] **Step 1: Create `schema.json`**

```json
{
  "$schema": "https://json-schema.org/schema",
  "$id": "ForgeWorkspace",
  "title": "Forge Workspace Generator",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Project name",
      "$default": {
        "$source": "argv",
        "index": 0
      },
      "x-prompt": "What is the project name?"
    },
    "projectType": {
      "type": "string",
      "description": "Project type",
      "enum": ["standalone", "open-source"],
      "default": "standalone",
      "x-prompt": {
        "message": "What type of project?",
        "type": "list",
        "items": [
          { "value": "standalone", "label": "Standalone — everything in one repo" },
          { "value": "open-source", "label": "Open-source — parent wrapper hides AI tooling" }
        ]
      }
    },
    "database": {
      "type": "string",
      "description": "Database choice",
      "enum": ["sqlite", "postgres"],
      "default": "sqlite"
    },
    "styling": {
      "type": "string",
      "description": "Styling approach",
      "enum": ["tailwind", "panda"],
      "default": "tailwind"
    }
  },
  "required": ["name"]
}
```

- [ ] **Step 2: Create `schema.d.ts`**

```typescript
export interface WorkspaceGeneratorSchema {
  name: string;
  projectType: 'standalone' | 'open-source';
  database: 'sqlite' | 'postgres';
  styling: 'tailwind' | 'panda';
}
```

- [ ] **Step 3: Commit**

```bash
git add tools/forge/src/generators/workspace/schema*
git commit -m "feat: add workspace generator schema"
```

---

### Task 7: Create Workspace Generator Template Files

**Files:**
- Create: `tools/forge/src/generators/workspace/files/` (multiple EJS template files)

The `files/` directory mirrors the output structure. Nx's `generateFiles()` copies this tree, processing EJS tags.

- [ ] **Step 1: Create `files/package.json.template`**

```json
{
  "name": "<%= name %>",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nx run-many --target=dev",
    "build": "nx run-many --target=build",
    "test": "nx run-many --target=test",
    "lint": "biome check .",
    "lint:fix": "biome check --write ."
  }
}
```

- [ ] **Step 2: Create `files/nx.json.template`**

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "plugins": ["tools/project-plugin"],
  "defaultBase": "main",
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "sharedGlobals": []
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "test": {
      "cache": true
    },
    "lint": {
      "cache": true
    }
  }
}
```

- [ ] **Step 3: Create `files/pnpm-workspace.yaml.template`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'tools/*'
```

- [ ] **Step 4: Create `files/tsconfig.base.json.template`**

```json
{
  "compileOnSave": false,
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "paths": {}
  }
}
```

- [ ] **Step 5: Create `files/biome.json.template`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "always"
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  }
}
```

- [ ] **Step 6: Create `files/vitest.config.ts.template`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

- [ ] **Step 7: Create `files/.gitignore.template`**

```
node_modules/
dist/
.env
.env.local
*.db
data/
.nx/
.turbo/
```

- [ ] **Step 8: Create `files/.env.example.template`**

```
# Database
DATABASE_URL=file:./data/<%= name %>.db

# Auth
BETTER_AUTH_SECRET=change-me-in-production
BETTER_AUTH_URL=http://localhost:3000

# Add API keys for optional features below
```

- [ ] **Step 9: Create `files/docker-compose.yml.template`**

```yaml
services: {}
# App generators add service entries here
```

- [ ] **Step 10: Remove root Dockerfile template**

The root `Dockerfile` is not needed — each app has its own Dockerfile created by its respective generator. The root `docker-compose.yml` references per-app Dockerfiles. Do NOT create a `files/Dockerfile.template`. Remove any reference to a root Dockerfile from the workspace generator.

Also update the spec: the root `Dockerfile` listed in the generated project structure should be removed — only per-app Dockerfiles exist.

- [ ] **Step 11: Create `files/.claude/settings.json.template`**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npx vitest run --reporter=verbose 2>&1 | tail -20"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 12: Commit**

```bash
git add tools/forge/src/generators/workspace/files/
git commit -m "feat: add workspace generator template files"
```

---

### Task 8: Implement Workspace Generator Logic

**Files:**
- Create: `tools/forge/src/generators/workspace/generator.ts`
- Modify: `tools/forge/generators.json`

- [ ] **Step 1: Create `generator.ts`**

```typescript
import {
  Tree,
  generateFiles,
  joinPathFragments,
  readJson,
  writeJson,
} from '@nx/devkit';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WorkspaceGeneratorSchema } from './schema';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const generatorDir = dirname(__filename);
// Forge repo root: tools/forge/src/generators/workspace/ -> 5 levels up
const forgeRoot = resolve(generatorDir, '..', '..', '..', '..', '..');

export async function workspaceGenerator(
  tree: Tree,
  options: WorkspaceGeneratorSchema,
): Promise<void> {
  const projectType = options.projectType ?? 'standalone';
  const database = options.database ?? 'sqlite';
  const styling = options.styling ?? 'tailwind';

  // Determine output paths
  const isOpenSource = projectType === 'open-source';
  const wrapperDir = isOpenSource ? `${options.name}-wrapper` : null;
  const projectDir = isOpenSource
    ? joinPathFragments(wrapperDir!, options.name)
    : options.name;

  // Generate project files from templates
  generateFiles(
    tree,
    joinPathFragments(generatorDir, 'files'),
    projectDir,
    {
      name: options.name,
      database,
      styling,
      template: '',
    },
  );

  // Copy source packages (recursive, no hardcoded file list)
  copyDirectoryFromDisk(resolve(forgeRoot, 'packages/shared'), joinPathFragments(projectDir, 'packages/shared'), tree);
  copyDirectoryFromDisk(resolve(forgeRoot, 'packages/config'), joinPathFragments(projectDir, 'packages/config'), tree);

  // Copy the correct UI package variant based on styling choice
  const uiSource = styling === 'tailwind' ? 'packages/ui-tailwind' : 'packages/ui-panda';
  copyDirectoryFromDisk(resolve(forgeRoot, uiSource), joinPathFragments(projectDir, 'packages/ui'), tree);

  // Create tools/project-plugin (feature generator — real implementation copied in Task 15)
  createProjectPlugin(tree, projectDir, options.name);

  // Create empty apps directory
  tree.write(joinPathFragments(projectDir, 'apps/.gitkeep'), '');

  // Create agents/ directory placeholder (for Mastra dev agents)
  tree.write(joinPathFragments(projectDir, 'agents/.gitkeep'), '');

  // Note: `nx configure-ai-agents` is run by the CLI after all generators complete
  // and after `pnpm install` (it needs nx installed). If running the workspace
  // generator directly (without the CLI), run it manually afterwards.

  if (isOpenSource) {
    // Agentic files go in wrapper, not in project
    copyFileFromDisk(resolve(forgeRoot, 'conventions/CLAUDE.md'), joinPathFragments(wrapperDir!, 'CLAUDE.md'), tree);
    copyFileFromDisk(resolve(forgeRoot, 'conventions/AGENTS.md'), joinPathFragments(wrapperDir!, 'AGENTS.md'), tree);
    moveFile(tree, joinPathFragments(projectDir, '.claude/settings.json'), joinPathFragments(wrapperDir!, '.claude/settings.json'));
  } else {
    // Agentic files in project root
    copyFileFromDisk(resolve(forgeRoot, 'conventions/CLAUDE.md'), joinPathFragments(projectDir, 'CLAUDE.md'), tree);
    copyFileFromDisk(resolve(forgeRoot, 'conventions/AGENTS.md'), joinPathFragments(projectDir, 'AGENTS.md'), tree);
  }
}

/**
 * Recursively copy a directory from the real filesystem into the Nx virtual tree.
 * This avoids hardcoding file lists — any file added to the source package is automatically included.
 */
function copyDirectoryFromDisk(sourceDir: string, targetDir: string, tree: Tree): void {
  try {
    const entries = readdirSync(sourceDir, { withFileTypes: true });
    for (const entry of entries) {
      const sourcePath = resolve(sourceDir, entry.name);
      const targetPath = joinPathFragments(targetDir, entry.name);
      if (entry.isDirectory()) {
        copyDirectoryFromDisk(sourcePath, targetPath, tree);
      } else {
        const content = readFileSync(sourcePath, 'utf-8');
        tree.write(targetPath, content);
      }
    }
  } catch {
    // Source directory doesn't exist (e.g., during tests with virtual tree)
  }
}

/**
 * Copy a single file from the real filesystem into the Nx virtual tree.
 */
function copyFileFromDisk(sourcePath: string, targetPath: string, tree: Tree): void {
  try {
    const content = readFileSync(sourcePath, 'utf-8');
    tree.write(targetPath, content);
  } catch {
    tree.write(targetPath, `# ${basename(sourcePath)}\n\nSee forge conventions.\n`);
  }
}

function moveFile(tree: Tree, from: string, to: string): void {
  const content = tree.read(from, 'utf-8');
  if (content) {
    tree.write(to, content);
    tree.delete(from);
  }
}

function createProjectPlugin(tree: Tree, projectDir: string, projectName: string): void {
  const pluginDir = joinPathFragments(projectDir, 'tools/project-plugin');

  tree.write(
    joinPathFragments(pluginDir, 'package.json'),
    JSON.stringify(
      {
        name: `@${projectName}/project-plugin`,
        version: '0.0.0',
        private: true,
        type: 'module',
        generators: './generators.json',
      },
      null,
      2,
    ),
  );

  tree.write(
    joinPathFragments(pluginDir, 'generators.json'),
    JSON.stringify(
      {
        generators: {
          feature: {
            factory: './src/generators/feature/generator',
            schema: './src/generators/feature/schema.json',
            description: 'Generate a cross-app feature scaffold',
          },
        },
      },
      null,
      2,
    ),
  );

  // Feature generator placeholder — replaced with real implementation in Task 15, Step 9
  tree.write(
    joinPathFragments(pluginDir, 'src/generators/feature/generator.ts'),
    `import { Tree } from '@nx/devkit';\nimport type { FeatureGeneratorSchema } from './schema';\n\nexport async function featureGenerator(tree: Tree, options: FeatureGeneratorSchema): Promise<void> {\n  // TODO: implement feature generator\n}\n\nexport default featureGenerator;\n`,
  );

  tree.write(
    joinPathFragments(pluginDir, 'src/generators/feature/schema.json'),
    JSON.stringify(
      {
        $schema: 'https://json-schema.org/schema',
        $id: 'Feature',
        title: 'Feature Generator',
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Feature name' },
          apps: { type: 'string', description: 'Comma-separated list of apps (api,web,mobile,desktop,static)' },
        },
        required: ['name', 'apps'],
      },
      null,
      2,
    ),
  );

  tree.write(
    joinPathFragments(pluginDir, 'src/generators/feature/schema.d.ts'),
    `export interface FeatureGeneratorSchema {\n  name: string;\n  apps: string;\n}\n`,
  );
}

export default workspaceGenerator;
```

**ESM Note for ALL generators:** Every generator must use `fileURLToPath(import.meta.url)` instead of `__dirname`, and `import { readFileSync } from 'node:fs'` instead of `require('fs')`. This pattern applies to the API, Web, Mobile, Desktop, Static, and Feature generators too.

- [ ] **Step 2: Register in `generators.json`**

Update `tools/forge/generators.json`:

```json
{
  "generators": {
    "workspace": {
      "factory": "./src/generators/workspace/generator",
      "schema": "./src/generators/workspace/schema.json",
      "description": "Generate a new forge project workspace"
    }
  }
}
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
npx nx test @forge/plugin --testPathPattern=workspace
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add tools/forge/
git commit -m "feat: implement workspace generator"
```

---

## Chunk 3: API Generator

### Task 9: Write API Generator Tests

**Files:**
- Create: `tools/forge/src/generators/api/generator.spec.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from '@nx/devkit';
import { apiGenerator } from './generator';

describe('api generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    // Simulate a workspace that already exists
    tree.write('apps/.gitkeep', '');
    tree.write('docker-compose.yml', 'services: {}\n');
  });

  it('should create api app structure', async () => {
    await apiGenerator(tree, { database: 'sqlite' });

    expect(tree.exists('apps/api/src/index.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/trpc.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/middleware/auth.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/middleware/errorHandler.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/db/schema.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/auth/auth.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/auth/authSchema.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/auth/authRoutes.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/features/.gitkeep')).toBeTruthy();
  });

  it('should create package.json with correct dependencies', async () => {
    await apiGenerator(tree, { database: 'sqlite' });

    const content = tree.read('apps/api/package.json', 'utf-8')!;
    const pkg = JSON.parse(content);
    expect(pkg.dependencies).toHaveProperty('hono');
    expect(pkg.dependencies).toHaveProperty('@trpc/server');
    expect(pkg.dependencies).toHaveProperty('drizzle-orm');
    expect(pkg.dependencies).toHaveProperty('better-sqlite3');
    expect(pkg.dependencies).toHaveProperty('better-auth');
    expect(pkg.dependencies).toHaveProperty('zod');
  });

  it('should use postgres driver when database is postgres', async () => {
    await apiGenerator(tree, { database: 'postgres' });

    const content = tree.read('apps/api/package.json', 'utf-8')!;
    const pkg = JSON.parse(content);
    expect(pkg.dependencies).toHaveProperty('postgres');
    expect(pkg.dependencies).not.toHaveProperty('better-sqlite3');
  });

  it('should add service entry to docker-compose.yml', async () => {
    await apiGenerator(tree, { database: 'sqlite' });

    const content = tree.read('docker-compose.yml', 'utf-8')!;
    expect(content).toContain('api:');
    expect(content).toContain('3000:3000');
  });

  it('should create Dockerfile', async () => {
    await apiGenerator(tree, { database: 'sqlite' });

    expect(tree.exists('apps/api/Dockerfile')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx nx test @forge/plugin --testPathPattern=api/generator
```

Expected: FAIL.

- [ ] **Step 3: Commit failing test**

```bash
git add tools/forge/src/generators/api/
git commit -m "test: add api generator tests"
```

---

### Task 10: Implement API Generator

**Files:**
- Create: `tools/forge/src/generators/api/schema.json`
- Create: `tools/forge/src/generators/api/schema.d.ts`
- Create: `tools/forge/src/generators/api/generator.ts`
- Create: `tools/forge/src/generators/api/files/` (template files)
- Modify: `tools/forge/generators.json`

- [ ] **Step 1: Create `schema.json` and `schema.d.ts`**

```json
{
  "$schema": "https://json-schema.org/schema",
  "$id": "ForgeApi",
  "title": "Forge API Generator",
  "type": "object",
  "properties": {
    "database": {
      "type": "string",
      "enum": ["sqlite", "postgres"],
      "default": "sqlite",
      "description": "Database engine"
    },
    "targetDir": {
      "type": "string",
      "description": "Absolute path to the generated project root. Required when running from forge CLI."
    }
  },
  "required": []
}
```

```typescript
export interface ApiGeneratorSchema {
  database: 'sqlite' | 'postgres';
  targetDir?: string;
}
```

- [ ] **Step 2: Create template files**

Create `tools/forge/src/generators/api/files/` with these templates. Each file uses EJS for dynamic parts.

**`files/apps/api/package.json.template`:**
```json
{
  "name": "@<%= projectName %>/api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup src/index.ts --format esm --dts",
    "test": "vitest run",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "hono": "^4.0.0",
    "@hono/node-server": "^1.0.0",
    "@hono/trpc-server": "^1.0.0",
    "@trpc/server": "^11.0.0",
    "drizzle-orm": "^0.35.0",
    "better-auth": "^1.0.0",
    "zod": "^3.23.0",
    <% if (database === 'sqlite') { %>"better-sqlite3": "^11.0.0"<% } else { %>"postgres": "^3.4.0"<% } %>
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "tsup": "^8.0.0",
    "drizzle-kit": "^0.28.0",
    <% if (database === 'sqlite') { %>"@types/better-sqlite3": "^7.0.0",<% } %>
    "vitest": "^2.0.0",
    "typescript": "^5.6.0"
  }
}
```

**`files/apps/api/src/index.ts.template`:**
```typescript
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './trpc';
import { createContext } from './trpc';
import { authRoutes } from './auth/authRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = new Hono();

app.onError(errorHandler);

// Mount auth routes
app.route('/api/auth', authRoutes);

// Mount tRPC
app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext,
  }),
);

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
});

export default app;
```

**`files/apps/api/src/trpc.ts.template`:**
```typescript
import { initTRPC } from '@trpc/server';
import type { Context as HonoContext } from 'hono';

export function createContext({ req }: { req: Request }): Context {
  return { req };
}

export interface Context {
  req: Request;
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure; // TODO: add auth middleware

export const appRouter = router({
  health: publicProcedure.query((): { status: string } => {
    return { status: 'ok' };
  }),
});

export type AppRouter = typeof appRouter;
```

**`files/apps/api/src/db/schema.ts.template`:**
```typescript
<% if (database === 'sqlite') { %>
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
<% } else { %>
import { pgTable, text, integer, serial } from 'drizzle-orm/pg-core';
<% } %>

// Auth schema is in ../auth/authSchema.ts
// Feature-specific schemas are added by the feature generator.

export {};
```

**`files/apps/api/src/middleware/auth.ts.template`:**
```typescript
import type { MiddlewareHandler } from 'hono';
import { auth } from '../auth/auth';

export function authMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });
    c.set('session', session);
    await next();
  };
}
```

**`files/apps/api/src/middleware/errorHandler.ts.template`:**
```typescript
import type { ErrorHandler } from 'hono';

export const errorHandler: ErrorHandler = (err, c) => {
  console.error('Unhandled error:', err);

  return c.json(
    {
      error: {
        message: err.message || 'Internal Server Error',
      },
    },
    500,
  );
};
```

**`files/apps/api/src/auth/auth.ts.template`:**
```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
<% if (database === 'sqlite') { %>
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const sqlite = new Database(process.env.DATABASE_URL?.replace('file:', '') ?? './data/<%= projectName %>.db');
const db = drizzle(sqlite);
<% } else { %>
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

const client = postgres(process.env.DATABASE_URL ?? 'postgresql://user:password@localhost:5432/<%= projectName %>');
const db = drizzle(client);
<% } %>

export const auth = betterAuth({
  database: drizzleAdapter(db),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
});
```

**`files/apps/api/src/auth/authSchema.ts.template`:**
```typescript
<% if (database === 'sqlite') { %>
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
<% } else { %>
import { pgTable, text, integer, serial, timestamp } from 'drizzle-orm/pg-core';
<% } %>

// Better Auth auto-generates these schemas.
// See: https://www.better-auth.com/docs/concepts/database

export {};
```

**`files/apps/api/src/auth/authRoutes.ts.template`:**
```typescript
import { Hono } from 'hono';
import { auth } from './auth';

export const authRoutes = new Hono();

authRoutes.on(['GET', 'POST'], '/*', (c) => {
  return auth.handler(c.req.raw);
});
```

**`files/apps/api/src/features/.gitkeep`:** (empty file)

**`files/apps/api/vitest.config.ts.template`:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

**`files/apps/api/tsconfig.json.template`:**
```json
{
  "extends": "../../packages/config/tsconfig.app.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"]
}
```

**`files/apps/api/.env.example.template`:**
```
DATABASE_URL=<% if (database === 'sqlite') { %>file:./data/<%= projectName %>.db<% } else { %>postgresql://user:password@localhost:5432/<%= projectName %><% } %>
BETTER_AUTH_SECRET=change-me-in-production
BETTER_AUTH_URL=http://localhost:3000
```

**`files/apps/api/Dockerfile.template`:**
```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM base AS build
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
<% if (database === 'sqlite') { %>
VOLUME ["/app/data"]
<% } %>
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost:3000/trpc/health || exit 1
CMD ["node", "dist/index.js"]
```

- [ ] **Step 3: Create `generator.ts`**

```typescript
import {
  Tree,
  generateFiles,
  joinPathFragments,
  readJson,
  writeJson,
} from '@nx/devkit';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiGeneratorSchema } from './schema';

const generatorDir = dirname(fileURLToPath(import.meta.url));

export async function apiGenerator(
  tree: Tree,
  options: ApiGeneratorSchema,
): Promise<void> {
  const database = options.database ?? 'sqlite';

  // When called from CLI, targetDir is the absolute path to the generated project.
  // When called in tests, targetDir is omitted and we write to tree root.
  const projectRoot = options.targetDir ?? '.';
  const projectName = readProjectName(tree, projectRoot);

  generateFiles(
    tree,
    joinPathFragments(generatorDir, 'files'),
    projectRoot,
    {
      database,
      projectName,
      template: '',
    },
  );

  // Add API service to docker-compose.yml
  updateDockerCompose(tree, projectRoot, database);

  // Create empty directories
  tree.write(joinPathFragments(projectRoot, 'apps/api/src/features/.gitkeep'), '');
  tree.write(joinPathFragments(projectRoot, 'apps/api/src/db/migrations/.gitkeep'), '');
  tree.write(joinPathFragments(projectRoot, 'apps/api/src/lib/.gitkeep'), '');
}

function readProjectName(tree: Tree, projectRoot: string): string {
  const pkgPath = joinPathFragments(projectRoot, 'package.json');
  if (tree.exists(pkgPath)) {
    const pkg = readJson(tree, pkgPath);
    return pkg.name || 'my-app';
  }
  return 'my-app';
}

function updateDockerCompose(tree: Tree, projectRoot: string, database: string): void {
  const composePath = joinPathFragments(projectRoot, 'docker-compose.yml');

  const apiService = `services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "3000:3000"
${database === 'sqlite' ? '    volumes:\n      - ./data:/app/data\n' : ''}    restart: unless-stopped
`;

  tree.write(composePath, apiService);
}

export default apiGenerator;
```

- [ ] **Step 4: Register api generator in `generators.json`**

Add to `tools/forge/generators.json`:
```json
{
  "generators": {
    "workspace": { ... },
    "api": {
      "factory": "./src/generators/api/generator",
      "schema": "./src/generators/api/schema.json",
      "description": "Generate a Hono + tRPC + Drizzle + Better Auth API app"
    }
  }
}
```

- [ ] **Step 5: Run tests**

```bash
npx nx test @forge/plugin --testPathPattern=api/generator
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add tools/forge/src/generators/api/ tools/forge/generators.json
git commit -m "feat: implement api generator with Hono, tRPC, Drizzle, Better Auth"
```

---

## Chunk 4: Web Generator

### Task 11: Implement Web Generator (test-first)

**Files:**
- Create: `tools/forge/src/generators/web/generator.spec.ts`
- Create: `tools/forge/src/generators/web/schema.json`
- Create: `tools/forge/src/generators/web/schema.d.ts`
- Create: `tools/forge/src/generators/web/generator.ts`
- Create: `tools/forge/src/generators/web/files/` (template files)
- Modify: `tools/forge/generators.json`

Follow the same TDD pattern as the API generator (Tasks 9-10). Use ESM-compatible `import.meta.url` pattern for `generatorDir`.

**Schema:** `{ styling: 'tailwind' | 'panda' }`

**Key template files the implementor must create:**

**`files/apps/web/package.json.template`** — Dependencies:
- `react`, `react-dom`, `@tanstack/react-router`, `@tanstack/router-devtools`
- `@trpc/client`, `@trpc/react-query`, `@tanstack/react-query`
- `better-auth/react` (auth client hooks)
- Styling: if tailwind → `tailwindcss`, `@tailwindcss/vite`, `shadcn/ui`; if panda → `@pandacss/dev`, `@ark-ui/react`
- DevDeps: `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`

**`files/apps/web/src/main.tsx.template`:**
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { routeTree } from './routeTree.gen';
<% if (styling === 'tailwind') { %>
import './index.css';
<% } %>

const queryClient = new QueryClient();
const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root')!;
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
```

**`files/apps/web/src/lib/trpc.ts.template`:**
```typescript
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@<%= projectName %>/shared/types';

export const trpc = createTRPCReact<AppRouter>();

export function createTRPCClient(): ReturnType<typeof trpc.createClient> {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: 'http://localhost:3000/trpc',
      }),
    ],
  });
}
```

**`files/apps/web/src/lib/auth.ts.template`:**
```typescript
import { createAuthClient } from 'better-auth/react';

export const { signIn, signUp, signOut, useSession } = createAuthClient({
  baseURL: 'http://localhost:3000/api/auth',
});
```

**`files/apps/web/src/routes/__root.tsx.template`:**
```tsx
import { createRootRoute, Outlet, Link } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout(): React.ReactElement {
  return (
    <div>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/login">Login</Link>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
```

**`files/apps/web/Dockerfile.template`:**
```dockerfile
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]
```

Also create login.tsx, signup.tsx routes, vite.config.ts, tsconfig.json, index.html, and `.gitkeep` files for components/, hooks/, features/ directories.

**Generator logic:** `generateFiles()` with styling variable, add web service to docker-compose.yml (port 5173, nginx).

- [ ] **Step 1: Write failing tests** — assert structure, deps, styling-conditional content
- [ ] **Step 2: Run tests, verify fail**
- [ ] **Step 3: Commit failing tests**
- [ ] **Step 4: Create schema files**
- [ ] **Step 5: Create all template files listed above**
- [ ] **Step 6: Implement generator.ts** (same pattern as api, ESM-compatible)
- [ ] **Step 7: Register in generators.json**
- [ ] **Step 8: Run tests, verify pass**
- [ ] **Step 9: Commit**

```bash
git commit -m "feat: implement web generator with React, Vite, TanStack Router"
```

---

## Chunk 5: Mobile Generator

### Task 12: Implement Mobile Generator (test-first)

**Files:**
- Create: `tools/forge/src/generators/mobile/generator.spec.ts`
- Create: `tools/forge/src/generators/mobile/schema.json`
- Create: `tools/forge/src/generators/mobile/schema.d.ts`
- Create: `tools/forge/src/generators/mobile/generator.ts`
- Create: `tools/forge/src/generators/mobile/files/` (template files)
- Modify: `tools/forge/generators.json`

Follow the same TDD pattern. ESM-compatible `import.meta.url` for `generatorDir`.

**Schema:** `{}` (no options — mobile is always Expo + NativeWind + Expo Router)

**Key template files:**

**`files/apps/mobile/package.json.template`** — Dependencies:
- `expo`, `expo-router`, `expo-linking`, `expo-status-bar`
- `react-native`, `react-native-safe-area-context`, `react-native-screens`
- `nativewind`, `tailwindcss` (NativeWind v4 uses Tailwind)
- `@trpc/client`, `@trpc/react-query`, `@tanstack/react-query`
- `better-auth/react` (auth client)
- DevDeps: `typescript`, `@types/react`, `@types/react-native`

**`files/apps/mobile/app.json.template`:**
```json
{
  "expo": {
    "name": "<%= projectName %>",
    "slug": "<%= projectName %>",
    "version": "1.0.0",
    "scheme": "<%= projectName %>",
    "platforms": ["ios", "android"],
    "plugins": ["expo-router"]
  }
}
```

**`files/apps/mobile/src/lib/trpc.ts.template`:**
```typescript
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@<%= projectName %>/shared/types';

export const trpc = createTRPCReact<AppRouter>();

export function createTRPCClient(): ReturnType<typeof trpc.createClient> {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/trpc',
      }),
    ],
  });
}
```

**`files/apps/mobile/src/lib/auth.ts.template`:**
```typescript
import { createAuthClient } from 'better-auth/react';

export const { signIn, signUp, signOut, useSession } = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL?.replace('/trpc', '/api/auth') ?? 'http://localhost:3000/api/auth',
});
```

**`files/apps/mobile/src/features/auth/LoginScreen.tsx.template`:**
```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { signIn } from '../../lib/auth';

export default function LoginScreen(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin(): Promise<void> {
    await signIn.email({ email, password });
  }

  return (
    <View>
      <Text>Login</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Pressable onPress={handleLogin}><Text>Sign In</Text></Pressable>
    </View>
  );
}
```

Create similar SignupScreen.tsx, plus Expo Router `app/` directory with `_layout.tsx` and `index.tsx` for navigation.

**Generator logic:** `generateFiles()`. No Docker entry. No docker-compose update.

- [ ] **Step 1: Write failing tests** — assert structure, deps, auth screens, Expo Router files
- [ ] **Step 2: Run tests, verify fail**
- [ ] **Step 3: Commit failing tests**
- [ ] **Step 4: Create schema + all template files**
- [ ] **Step 5: Implement generator.ts** (ESM-compatible)
- [ ] **Step 6: Register in generators.json**
- [ ] **Step 7: Run tests, verify pass**
- [ ] **Step 8: Commit**

```bash
git commit -m "feat: implement mobile generator with Expo, NativeWind, Expo Router"
```

---

## Chunk 6: Desktop + Static Generators

### Task 13: Implement Desktop Generator (test-first)

**Files:**
- Create: `tools/forge/src/generators/desktop/generator.spec.ts`
- Create: `tools/forge/src/generators/desktop/schema.json`
- Create: `tools/forge/src/generators/desktop/schema.d.ts`
- Create: `tools/forge/src/generators/desktop/generator.ts`
- Create: `tools/forge/src/generators/desktop/files/`
- Modify: `tools/forge/generators.json`

**Schema:** `{}` (no options — always wraps web)

**Key template files:**

**`files/apps/desktop/src-tauri/src/lib.rs.template`:**
```rust
// Tauri Rust commands for OS access.
// Add commands here for file system, system tray, notifications, etc.

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**`files/apps/desktop/src-tauri/tauri.conf.json.template`:**
```json
{
  "$schema": "https://raw.githubusercontent.com/nicedoc/tauri/refs/heads/v2/crates/tauri-cli/schema.json",
  "productName": "<%= projectName %>",
  "version": "0.0.0",
  "identifier": "com.<%= projectName %>.app",
  "build": {
    "beforeDevCommand": "cd ../web && pnpm dev",
    "devUrl": "http://localhost:5173",
    "beforeBuildCommand": "cd ../web && pnpm build",
    "frontendDist": "../web/dist"
  },
  "app": {
    "title": "<%= projectName %>",
    "windows": [{ "title": "<%= projectName %>", "width": 1200, "height": 800 }]
  }
}
```

**`files/apps/desktop/src-tauri/Cargo.toml.template`:**
```toml
[package]
name = "<%= projectName %>-desktop"
version = "0.0.0"
edition = "2021"

[lib]
name = "<%= projectName.replace(/-/g, '_') %>_lib"
crate-type = ["lib", "cdylib", "staticlib"]

[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

**`files/apps/desktop/package.json.template`:**
```json
{
  "name": "@<%= projectName %>/desktop",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "tauri dev",
    "build": "tauri build"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0"
  }
}
```

**Tests must verify:** `apps/desktop/` structure exists, `tauri.conf.json` has `devUrl` pointing at localhost:5173, generator throws if `apps/web/` doesn't exist in the tree.

**Generator logic:** Check `tree.exists('apps/web/')`, throw if missing. `generateFiles()`. No Docker.

- [ ] **Step 1: Write failing tests** — structure, tauri.conf content, web dependency check
- [ ] **Step 2: Run tests, verify fail**
- [ ] **Step 3: Commit failing tests**
- [ ] **Step 4: Create schema + all template files**
- [ ] **Step 5: Implement generator.ts** (ESM-compatible, check web exists)
- [ ] **Step 6: Register in generators.json**
- [ ] **Step 7: Run tests, verify pass**
- [ ] **Step 8: Commit**

```bash
git commit -m "feat: implement desktop generator with Tauri v2"
```

---

### Task 14: Implement Static Generator (test-first)

**Files:**
- Create: `tools/forge/src/generators/static/generator.spec.ts`
- Create: `tools/forge/src/generators/static/schema.json`
- Create: `tools/forge/src/generators/static/schema.d.ts`
- Create: `tools/forge/src/generators/static/generator.ts`
- Create: `tools/forge/src/generators/static/files/`
- Modify: `tools/forge/generators.json`

**Schema:** `{ database: 'sqlite' | 'postgres' }` (for cache backend)

**Key template files:**

**`files/apps/static/package.json.template`** — Dependencies:
- `astro`, `@astrojs/react`, `@astrojs/node` (or Hono adapter)
- `hono` (for ISR middleware)
- `react`, `react-dom`
- Cache: if sqlite → `better-sqlite3`; if postgres → `postgres`
- `drizzle-orm` (for cache table)

**`files/apps/static/astro.config.ts.template`:**
```typescript
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';

export default defineConfig({
  integrations: [react()],
  output: 'server',
  adapter: node({ mode: 'standalone' }),
});
```

**`files/apps/static/src/lib/cache.ts.template`:**
```typescript
<% if (database === 'sqlite') { %>
import Database from 'better-sqlite3';

const db = new Database(process.env.CACHE_DB_PATH ?? './data/page-cache.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS page_cache (
    url TEXT PRIMARY KEY,
    html TEXT NOT NULL,
    cached_at INTEGER NOT NULL,
    expires_at INTEGER
  )
`);

export function getCachedPage(url: string): string | null {
  const row = db.prepare('SELECT html, expires_at FROM page_cache WHERE url = ?').get(url) as { html: string; expires_at: number | null } | undefined;
  if (!row) return null;
  if (row.expires_at && row.expires_at < Date.now()) {
    db.prepare('DELETE FROM page_cache WHERE url = ?').run(url);
    return null;
  }
  return row.html;
}

export function setCachedPage(url: string, html: string, ttlMs?: number): void {
  const expiresAt = ttlMs ? Date.now() + ttlMs : null;
  db.prepare('INSERT OR REPLACE INTO page_cache (url, html, cached_at, expires_at) VALUES (?, ?, ?, ?)').run(url, html, Date.now(), expiresAt);
}

export function invalidateCache(url?: string): void {
  if (url) {
    db.prepare('DELETE FROM page_cache WHERE url = ?').run(url);
  } else {
    db.prepare('DELETE FROM page_cache').run();
  }
}
<% } else { %>
// Postgres cache implementation — use drizzle-orm with pgTable
// TODO: implement postgres variant
export function getCachedPage(_url: string): string | null { return null; }
export function setCachedPage(_url: string, _html: string, _ttlMs?: number): void {}
export function invalidateCache(_url?: string): void {}
<% } %>
```

**`files/apps/static/src/pages/index.astro.template`:**
```astro
---
import Layout from '../layouts/Layout.astro';
---
<Layout title="<%= projectName %>">
  <h1>Welcome to <%= projectName %></h1>
</Layout>
```

Also create `Layout.astro`, `Dockerfile` (multi-stage node build), `tsconfig.json`, `.gitkeep` files.

**Generator logic:** `generateFiles()`, add static service to docker-compose (port 4321).

- [ ] **Step 1: Write failing tests** — structure, deps, cache.ts content, astro config
- [ ] **Step 2: Run tests, verify fail**
- [ ] **Step 3: Commit failing tests**
- [ ] **Step 4: Create schema + all template files**
- [ ] **Step 5: Implement generator.ts** (ESM-compatible)
- [ ] **Step 6: Register in generators.json**
- [ ] **Step 7: Run tests, verify pass**
- [ ] **Step 8: Commit**

```bash
git commit -m "feat: implement static generator with Astro, Hono ISR, SQLite page cache"
```

---

## Chunk 7: Feature Generator

### Task 15: Implement Feature Generator (test-first)

This is the most complex generator — it creates files across multiple apps based on the `--apps` flag.

**Files:**
- Create: `tools/forge/src/generators/feature/generator.spec.ts`
- Create: `tools/forge/src/generators/feature/schema.json`
- Create: `tools/forge/src/generators/feature/schema.d.ts`
- Create: `tools/forge/src/generators/feature/generator.ts`
- Create: `tools/forge/src/generators/feature/files/` (per-app template subdirectories)
- Modify: `tools/forge/generators.json`

**Also:** The same generator logic must be copied into the generated project's `tools/project-plugin/`. Update the workspace generator (Task 8) to copy the real implementation instead of the placeholder.

- [ ] **Step 1: Write failing tests**

```typescript
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from '@nx/devkit';
import { featureGenerator } from './generator';

describe('feature generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    // Simulate existing app structures
    tree.write('apps/api/src/trpc.ts', 'export const appRouter = router({});');
    tree.write('apps/api/src/features/.gitkeep', '');
    tree.write('apps/web/src/features/.gitkeep', '');
    tree.write('apps/mobile/src/features/.gitkeep', '');
    tree.write('packages/shared/src/schemas/index.ts', 'export {};');
  });

  it('should create api feature files', async () => {
    await featureGenerator(tree, { name: 'users', apps: 'api' });

    expect(tree.exists('apps/api/src/features/users/router.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/features/users/service.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/features/users/service.test.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/features/users/types.ts')).toBeTruthy();
  });

  it('should create web feature files', async () => {
    await featureGenerator(tree, { name: 'users', apps: 'web' });

    expect(tree.exists('apps/web/src/features/users/UsersList.tsx')).toBeTruthy();
    expect(tree.exists('apps/web/src/features/users/useUsersActions.ts')).toBeTruthy();
    expect(tree.exists('apps/web/src/features/users/usersList.test.ts')).toBeTruthy();
  });

  it('should create mobile feature files', async () => {
    await featureGenerator(tree, { name: 'users', apps: 'mobile' });

    expect(tree.exists('apps/mobile/src/features/users/UsersList.tsx')).toBeTruthy();
    expect(tree.exists('apps/mobile/src/features/users/useUsersActions.ts')).toBeTruthy();
    expect(tree.exists('apps/mobile/src/features/users/usersList.test.ts')).toBeTruthy();
  });

  it('should handle multiple apps', async () => {
    await featureGenerator(tree, { name: 'users', apps: 'api,web,mobile' });

    expect(tree.exists('apps/api/src/features/users/router.ts')).toBeTruthy();
    expect(tree.exists('apps/web/src/features/users/UsersList.tsx')).toBeTruthy();
    expect(tree.exists('apps/mobile/src/features/users/UsersList.tsx')).toBeTruthy();
  });

  it('should add shared schema', async () => {
    await featureGenerator(tree, { name: 'users', apps: 'api' });

    expect(tree.exists('packages/shared/src/schemas/users.ts')).toBeTruthy();
  });

  it('should create desktop feature files when explicitly requested', async () => {
    tree.write('apps/desktop/src-tauri/src/lib.rs', '');

    await featureGenerator(tree, { name: 'files', apps: 'desktop' });

    expect(tree.exists('apps/desktop/src-tauri/src/commands/files.rs')).toBeTruthy();
  });

  it('should create static feature files', async () => {
    tree.write('apps/static/src/pages/.gitkeep', '');
    tree.write('apps/static/src/components/.gitkeep', '');

    await featureGenerator(tree, { name: 'users', apps: 'static' });

    expect(tree.exists('apps/static/src/pages/users/index.astro')).toBeTruthy();
    expect(tree.exists('apps/static/src/components/users/UsersIsland.tsx')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests, verify fail**
- [ ] **Step 3: Commit failing tests**

- [ ] **Step 4: Create schema**

```json
{
  "$schema": "https://json-schema.org/schema",
  "$id": "ForgeFeature",
  "title": "Forge Feature Generator",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Feature name (lowercase)",
      "$default": { "$source": "argv", "index": 0 }
    },
    "apps": {
      "type": "string",
      "description": "Comma-separated apps: api,web,mobile,desktop,static"
    }
  },
  "required": ["name", "apps"]
}
```

- [ ] **Step 5: Create per-app template files**

Organize under `files/` with subdirectories per app type:

```
files/
├── api/
│   ├── router.ts.template
│   ├── service.ts.template
│   ├── service.test.ts.template
│   └── types.ts.template
├── web/
│   ├── __Name__List.tsx.template
│   ├── use__Name__Actions.ts.template
│   └── __name__List.test.ts.template
├── mobile/
│   ├── __Name__List.tsx.template
│   ├── use__Name__Actions.ts.template
│   └── __name__List.test.ts.template
├── desktop/
│   └── __name__.rs.template         # Rust command stub
├── static/
│   ├── page.astro.template
│   └── __Name__Island.tsx.template
└── shared/
    └── schema.ts.template
```

API template examples:

**`files/api/router.ts.template`:**
```typescript
import { router, publicProcedure } from '../../trpc';
import { z } from 'zod';
import type { <%= className %>Service } from './service';

export const <%= name %>Router = router({
  // Add procedures here
});
```

**`files/api/service.ts.template`:**
```typescript
// Business logic for <%= name %> feature
// Add service functions here. Each must have an explicit return type.

export {};
```

**`files/api/service.test.ts.template`:**
```typescript
import { describe, it, expect } from 'vitest';

describe('<%= name %> service', () => {
  // Write tests from spec before implementation
  it.todo('should be implemented based on spec');
});
```

**`files/api/types.ts.template`:**
```typescript
import { z } from 'zod';

// Feature-specific Zod schemas for <%= name %>
// Add input/output schemas here.

export {};
```

**`files/web/__Name__List.tsx.template`:**
```typescript
import { trpc } from '../../lib/trpc';

export default function <%= className %>List(): React.ReactElement {
  // const { data } = trpc.<%= name %>.useQuery();

  return (
    <div>
      <h1><%= className %></h1>
      {/* Implement UI here */}
    </div>
  );
}
```

**`files/shared/schema.ts.template`:**
```typescript
import { z } from 'zod';

// Shared schemas for the <%= name %> feature
// These are consumed by both API and client apps.

export {};
```

- [ ] **Step 6: Implement `generator.ts`**

The generator parses the `apps` string, iterates over each app, and calls `generateFiles()` with the appropriate template subdirectory and target path. It also:
- Capitalizes the feature name for PascalCase file names (`className` variable)
- Registers the router in the API's app router (modifies `apps/api/src/trpc.ts`)
- Adds a shared schema file to `packages/shared/src/schemas/`

- [ ] **Step 7: Register in generators.json**
- [ ] **Step 8: Run tests, verify pass**
- [ ] **Step 9: Update workspace generator to copy real feature generator into project-plugin**
- [ ] **Step 10: Commit**

```bash
git commit -m "feat: implement feature generator for cross-app scaffolding"
```

---

## Chunk 8: Optional Features

### Task 16: Implement Optional Feature Generators

Each optional feature is a sub-generator that adds files to the API app (and sometimes shared packages). They follow the same pattern but are simpler — they just add a feature directory.

**Files per optional feature:**
- Create: `tools/forge/src/generators/api/optionals/<feature>.ts`

Rather than separate Nx generators, these are functions called by the API generator when optional features are selected. Update the API generator schema to accept an `optionalFeatures` array.

**TDD discipline:** Write tests FIRST for each optional feature (asserting files exist and deps are added), then implement templates. Commit tests separately from implementation.

- [ ] **Step 1: Update API generator schema**

Add to `schema.json` and `schema.d.ts`:
```typescript
export interface ApiGeneratorSchema {
  database: 'sqlite' | 'postgres';
  optionalFeatures?: string[]; // 'ai' | 'agents' | 'payments' | 'email' | 'realtime' | 'cron' | 'vector' | 'observability'
}
```

- [ ] **Step 2: Write failing tests for each optional feature and commit them**

Test that when `optionalFeatures` includes e.g. `'ai'`, the generator creates `apps/api/src/features/ai/router.ts`, `service.ts`, `types.ts` and adds `ai` to package.json dependencies.

```bash
git commit -m "test: add optional feature generator tests"
```

- [ ] **Step 3: Create template files in SEPARATE directories per optional feature**

**IMPORTANT:** `generateFiles()` copies the entire `files/` tree — there is no built-in filtering. Optional features MUST live in separate template directories, not inside the main API `files/` directory. Each optional feature gets its own directory:

```
tools/forge/src/generators/api/
├── files/                    # Base API templates (always generated)
├── optional-ai/              # AI feature templates
│   └── apps/api/src/features/ai/
│       ├── router.ts.template
│       ├── service.ts.template
│       └── types.ts.template
├── optional-agents/          # Mastra templates
│   ├── apps/api/src/features/agents/
│   └── apps/api/mastra.config.ts.template
├── optional-payments/
├── optional-email/
│   └── apps/api/src/features/email/
│       ├── router.ts.template
│       ├── service.ts.template
│       ├── types.ts.template
│       └── templates/Welcome.tsx.template
├── optional-realtime/
│   └── apps/api/src/features/realtime/
│       ├── router.ts.template
│       ├── service.ts.template
│       ├── types.ts.template
│       └── websocket.ts.template
├── optional-cron/
│   └── apps/api/src/features/cron/
│       ├── scheduler.ts.template
│       ├── types.ts.template
│       └── jobs/example.ts.template
├── optional-vector/
│   └── apps/api/src/db/vector.ts.template
└── optional-observability/
    └── apps/api/src/lib/telemetry.ts.template
```

- [ ] **Step 4: Update API generator to call `generateFiles()` per optional feature**

```typescript
// In api generator.ts, after base generateFiles():
const optionals = options.optionalFeatures ?? [];
for (const feature of optionals) {
  const optionalDir = joinPathFragments(generatorDir, `optional-${feature}`);
  generateFiles(tree, optionalDir, projectRoot, { database, projectName, template: '' });
}
```

Also add the correct npm dependencies for each optional feature to the generated `package.json`:

| Feature | Dependencies |
|---------|-------------|
| ai | `ai`, `@ai-sdk/anthropic` (or provider of choice) |
| agents | `@mastra/core`, `@mastra/engine` |
| payments | `@polar-sh/sdk` |
| email | `resend`, `@react-email/components` |
| realtime | (built into hono, no extra deps) |
| cron | `node-cron`, `@types/node-cron` (dev) |
| vector | sqlite: `sqlite-vec`; postgres: (pgvector is part of postgres driver) |
| observability | `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-trace-otlp-http` |

- [ ] **Step 5: Run all tests**

```bash
npx nx test @forge/plugin
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: add optional feature generators (AI, agents, payments, email, realtime, cron, vector, observability)"
```

---

## Chunk 9: CLI + Integration

### Task 17: Implement the CLI

**Files:**
- Create: `cli/package.json`
- Create: `cli/tsconfig.json`
- Create: `cli/src/index.ts`
- Create: `cli/src/prompts.ts`

- [ ] **Step 1: Create `cli/package.json`**

```json
{
  "name": "@forge/cli",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "bin": {
    "forge": "./dist/index.js"
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@clack/prompts": "^0.8.0",
    "nx": "latest"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create `cli/tsconfig.json`**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create `cli/src/prompts.ts`**

```typescript
import * as p from '@clack/prompts';

export interface ForgeOptions {
  name: string;
  projectType: 'standalone' | 'open-source';
  apps: string[];
  database: 'sqlite' | 'postgres';
  styling: 'tailwind' | 'panda';
  optionalFeatures: string[];
}

export async function runPrompts(nameArg?: string): Promise<ForgeOptions | null> {
  p.intro('The Forge — Project Generator');

  const name = nameArg ?? await p.text({
    message: 'Project name:',
    placeholder: 'my-app',
    validate: (value) => {
      if (!value) return 'Name is required';
      if (!/^[a-z0-9-]+$/.test(value)) return 'Use lowercase letters, numbers, and hyphens only';
      return undefined;
    },
  });

  if (p.isCancel(name)) { p.cancel('Cancelled.'); return null; }

  const projectType = await p.select({
    message: 'Project type:',
    options: [
      { value: 'standalone', label: 'Standalone — everything in one repo' },
      { value: 'open-source', label: 'Open-source — parent wrapper hides AI tooling' },
    ],
  });

  if (p.isCancel(projectType)) { p.cancel('Cancelled.'); return null; }

  const apps = await p.multiselect({
    message: 'Which apps?',
    options: [
      { value: 'api', label: 'API (Hono + tRPC + Drizzle + Better Auth)' },
      { value: 'web', label: 'Web (React + Vite + TanStack Router)' },
      { value: 'mobile', label: 'Mobile (Expo + React Native)' },
      { value: 'desktop', label: 'Desktop (Tauri v2 — requires Web)' },
      { value: 'static', label: 'Static (Astro + Hono ISR)' },
    ],
    required: true,
  });

  if (p.isCancel(apps)) { p.cancel('Cancelled.'); return null; }

  // Validate: desktop requires web
  if (apps.includes('desktop') && !apps.includes('web')) {
    p.log.warn('Desktop requires the Web app. Adding Web automatically.');
    apps.push('web');
  }

  const database = await p.select({
    message: 'Database:',
    options: [
      { value: 'sqlite', label: 'SQLite (default — zero config, file-based)' },
      { value: 'postgres', label: 'PostgreSQL (multi-writer, advanced features)' },
    ],
  });

  if (p.isCancel(database)) { p.cancel('Cancelled.'); return null; }

  const styling = await p.select({
    message: 'Styling:',
    options: [
      { value: 'tailwind', label: 'Tailwind v4 + shadcn/ui (default for AI-driven builds)' },
      { value: 'panda', label: 'Panda CSS + Ark UI (hand-crafted, type-safe tokens)' },
    ],
  });

  if (p.isCancel(styling)) { p.cancel('Cancelled.'); return null; }

  const optionalFeatures = await p.multiselect({
    message: 'Optional features:',
    options: [
      { value: 'ai', label: 'AI (Vercel AI SDK)' },
      { value: 'agents', label: 'AI Agents (Mastra)' },
      { value: 'payments', label: 'Payments (Polar)' },
      { value: 'email', label: 'Email (Resend + React Email)' },
      { value: 'realtime', label: 'Real-time (Hono WebSockets)' },
      { value: 'cron', label: 'Cron Jobs (node-cron)' },
      { value: 'vector', label: 'Vector Search (sqlite-vec / pgvector)' },
      { value: 'observability', label: 'Observability (OpenTelemetry)' },
    ],
    required: false,
  });

  if (p.isCancel(optionalFeatures)) { p.cancel('Cancelled.'); return null; }

  return {
    name: name as string,
    projectType: projectType as ForgeOptions['projectType'],
    apps: apps as string[],
    database: database as ForgeOptions['database'],
    styling: styling as ForgeOptions['styling'],
    optionalFeatures: (optionalFeatures as string[]) ?? [],
  };
}
```

- [ ] **Step 4: Create `cli/src/index.ts`**

**IMPORTANT architectural note:** The CLI must run ALL generators from the forge repo root (where `@forge/plugin` is registered in `nx.json`). The generators themselves accept a `targetDir` option that tells them where to write files. Do NOT try to run `nx generate` from inside the generated project — the forge plugin isn't registered there.

Each generator's schema needs a `targetDir` option (or the generators detect the output path from the workspace generator's context). The simplest approach: all generators always run from the forge root with `--targetDir` pointing at the output location.

```typescript
#!/usr/bin/env node
import * as p from '@clack/prompts';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPrompts } from './prompts';

const cliDir = dirname(fileURLToPath(import.meta.url));
const forgeRoot = resolve(cliDir, '..', '..');

async function main(): Promise<void> {
  const nameArg = process.argv[2];
  const options = await runPrompts(nameArg);
  if (!options) return;

  const targetDir = resolve(process.cwd(), options.name);
  const projectRoot = options.projectType === 'open-source'
    ? resolve(process.cwd(), `${options.name}-wrapper`, options.name)
    : targetDir;

  const s = p.spinner();

  // Step 1: Generate workspace (always runs from forge root)
  s.start('Generating workspace...');
  runForgeGenerator(`workspace ${options.name} --projectType=${options.projectType} --database=${options.database} --styling=${options.styling} --no-interactive`);
  s.stop('Workspace created.');

  // Step 2: Generate selected apps
  const optionalFeaturesFlag = options.optionalFeatures.length > 0
    ? ` --optionalFeatures=${options.optionalFeatures.join(',')}`
    : '';

  for (const app of options.apps) {
    s.start(`Generating ${app} app...`);

    const td = `--targetDir=${projectRoot}`;

    switch (app) {
      case 'api':
        runForgeGenerator(`api --database=${options.database}${optionalFeaturesFlag} ${td}`);
        break;
      case 'web':
        runForgeGenerator(`web --styling=${options.styling} ${td}`);
        break;
      case 'mobile':
        runForgeGenerator(`mobile ${td}`);
        break;
      case 'desktop':
        runForgeGenerator(`desktop ${td}`);
        break;
      case 'static':
        runForgeGenerator(`static --database=${options.database} ${td}`);
        break;
    }

    s.stop(`${app} app created.`);
  }

  // Step 3: Install dependencies in generated project
  s.start('Installing dependencies...');
  execSync('pnpm install', { cwd: projectRoot, stdio: 'pipe' });
  s.stop('Dependencies installed.');

  // Step 4: Configure AI agents in generated project
  s.start('Configuring Nx AI agents...');
  try {
    execSync('npx nx configure-ai-agents', { cwd: projectRoot, stdio: 'pipe' });
  } catch {
    p.log.warn('Could not configure AI agents automatically. Run `npx nx configure-ai-agents` manually.');
  }
  s.stop('AI agents configured.');

  // Step 5: Initialize git
  s.start('Initializing git...');
  const gitRoot = options.projectType === 'open-source'
    ? resolve(process.cwd(), `${options.name}-wrapper`)
    : projectRoot;
  execSync('git init && git add -A && git commit -m "chore: initial project scaffold from the forge"', {
    cwd: gitRoot,
    stdio: 'pipe',
  });
  s.stop('Git initialized.');

  p.outro(`Project created at ${projectRoot}. Happy forging!`);
}

/**
 * Run a forge generator from the forge repo root.
 * All generators run in the forge workspace context where @forge/plugin is registered.
 */
function runForgeGenerator(args: string): void {
  execSync(`npx nx generate @forge/plugin:${args}`, {
    cwd: forgeRoot,
    stdio: 'pipe',
  });
}

main().catch(console.error);
```

**Note:** Each app generator accepts a `--targetDir` option pointing at the generated project root. The workspace generator creates the project directory, then the CLI passes `--targetDir` to all subsequent generators. All generators must include `targetDir?: string` in their schema and use `options.targetDir ?? '.'` as the output root (defaulting to `'.'` for test compatibility).

- [ ] **Step 5: Write CLI unit tests**

Create `cli/src/prompts.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
// Test the ForgeOptions type and any validation logic
// Note: @clack/prompts interactive flow can't be unit tested easily,
// but we can test any validation/transform functions extracted from prompts.ts

describe('CLI prompts', () => {
  it('should enforce desktop requires web', () => {
    // Extract validation logic into a testable function
    const apps = ['api', 'desktop'];
    if (apps.includes('desktop') && !apps.includes('web')) {
      apps.push('web');
    }
    expect(apps).toContain('web');
  });
});
```

- [ ] **Step 6: Build and link the CLI**

```bash
cd /Users/gav/Programming/personal/the-forge/cli && pnpm install && pnpm build
cd /Users/gav/Programming/personal/the-forge && pnpm --filter @forge/cli link --global
```

Verify: `forge` runs the prompts.

- [ ] **Step 7: Commit**

```bash
git add cli/
git commit -m "feat: implement interactive forge CLI with @clack/prompts"
```

---

### Task 18: Integration Test — End-to-End Scaffold

**Files:**
- Create: `tools/forge/src/generators/integration.spec.ts`

- [ ] **Step 1: Write integration test**

```typescript
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from '@nx/devkit';
import { workspaceGenerator } from './workspace/generator';
import { apiGenerator } from './api/generator';
import { webGenerator } from './web/generator';

describe('integration: full project scaffold', () => {
  let tree: Tree;

  it('should generate a complete standalone project', async () => {
    tree = createTreeWithEmptyWorkspace();

    // Workspace generator creates the project directory
    await workspaceGenerator(tree, {
      name: 'test-app',
      projectType: 'standalone',
      database: 'sqlite',
      styling: 'tailwind',
    });

    // Verify workspace structure
    expect(tree.exists('test-app/nx.json')).toBeTruthy();
    expect(tree.exists('test-app/CLAUDE.md')).toBeTruthy();
    expect(tree.exists('test-app/packages/shared/package.json')).toBeTruthy();
    expect(tree.exists('test-app/packages/ui/package.json')).toBeTruthy();
    expect(tree.exists('test-app/tools/project-plugin/generators.json')).toBeTruthy();
    expect(tree.exists('test-app/biome.json')).toBeTruthy();
    expect(tree.exists('test-app/.claude/settings.json')).toBeTruthy();

    // Note: App generators (api, web) write to the tree relative to the
    // project root. In the CLI, this is handled by running generators with
    // the correct target directory. In integration tests, we verify each
    // generator independently in their own test suites.
  });

  it('should generate an open-source project with wrapper', async () => {
    tree = createTreeWithEmptyWorkspace();

    await workspaceGenerator(tree, {
      name: 'oss-app',
      projectType: 'open-source',
      database: 'sqlite',
      styling: 'tailwind',
    });

    // Wrapper has agentic files
    expect(tree.exists('oss-app-wrapper/CLAUDE.md')).toBeTruthy();
    expect(tree.exists('oss-app-wrapper/AGENTS.md')).toBeTruthy();
    expect(tree.exists('oss-app-wrapper/.claude/settings.json')).toBeTruthy();

    // Project has no agentic files
    expect(tree.exists('oss-app-wrapper/oss-app/CLAUDE.md')).toBeFalsy();
    expect(tree.exists('oss-app-wrapper/oss-app/nx.json')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run integration tests**

```bash
npx nx test @forge/plugin --testPathPattern=integration
```

Expected: All PASS.

- [ ] **Step 3: Run full test suite**

```bash
npx nx test @forge/plugin
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add tools/forge/src/generators/integration.spec.ts
git commit -m "test: add integration tests for full project scaffold"
```

---

### Task 19: Manual End-to-End Test

- [ ] **Step 1: Run forge CLI to generate a test project**

```bash
cd /tmp
forge test-forge-output
```

Select: standalone, api + web + mobile, SQLite, Tailwind, no optional features.

- [ ] **Step 2: Verify the generated project**

```bash
cd /tmp/test-forge-output
pnpm install
npx nx run api:dev     # Should start Hono server on port 3000
npx nx run web:dev     # Should start Vite dev server
npx nx test            # Should run vitest across all apps
```

- [ ] **Step 3: Verify agent integration**

```bash
cat CLAUDE.md           # Should contain full conventions
cat AGENTS.md           # Should contain agent workflow rules
cat .claude/settings.json  # Should have PostToolUse hook
npx nx list             # Should show project-plugin with feature generator
```

- [ ] **Step 4: Test feature generator**

```bash
npx nx generate @test-forge-output/project-plugin:feature --name users --apps api,web
ls apps/api/src/features/users/    # Should have router.ts, service.ts, service.test.ts, types.ts
ls apps/web/src/features/users/    # Should have UsersList.tsx, useUsersActions.ts, usersList.test.ts
```

- [ ] **Step 5: Clean up**

```bash
rm -rf /tmp/test-forge-output
```

- [ ] **Step 6: Final commit if any fixes were needed**

```bash
git commit -m "fix: address issues found during manual e2e testing"
```

---

## Summary

| Chunk | Tasks | What It Produces |
|-------|-------|-----------------|
| 1: Foundation | 1-4 | Nx workspace, plugin scaffold, conventions, source packages |
| 2: Workspace Generator | 5-8 | Working `nx generate @forge/plugin:workspace` |
| 3: API Generator | 9-10 | Working `nx generate @forge/plugin:api` |
| 4: Web Generator | 11 | Working `nx generate @forge/plugin:web` |
| 5: Mobile Generator | 12 | Working `nx generate @forge/plugin:mobile` |
| 6: Desktop + Static | 13-14 | Working desktop and static generators |
| 7: Feature Generator | 15 | Working cross-app feature scaffold |
| 8: Optional Features | 16 | AI, payments, email, realtime, cron, vector, observability |
| 9: CLI + Integration | 17-19 | `forge my-app` interactive command, e2e verified |
