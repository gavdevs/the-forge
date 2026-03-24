# Forge Conventions

These are the rules for building software in this system. They apply whether a human or an AI agent is writing the code. No exceptions.

---

## Language and Runtime

- TypeScript everywhere. Strict mode. No `any` unless explicitly justified with a comment explaining why.
- Node runtime. Not Bun, not Deno.
- All code is ESM. No CommonJS.

## File Naming

- camelCase for all files: `userService.ts`, `createPost.ts`, `authMiddleware.ts`
- React components use PascalCase: `UserProfile.tsx`, `DashboardLayout.tsx`
- Test files sit next to what they test: `userService.test.ts` alongside `userService.ts`
- No `index.ts` barrel files inside app directories. Only at package boundaries (`packages/ui/index.ts`, `packages/shared/index.ts`).

## File Organization

Hybrid approach. Shared concerns are flat. Features are grouped.

```
apps/api/src/
├── middleware/           # Shared middleware (auth, logging, errors)
│   ├── auth.ts
│   └── errorHandler.ts
├── lib/                  # Shared utilities
│   └── cache.ts
├── db/                   # Database schema and migrations
│   ├── schema.ts
│   └── migrations/
├── features/             # Feature directories
│   ├── users/
│   │   ├── router.ts     # tRPC router for this feature
│   │   ├── service.ts    # Business logic
│   │   ├── service.test.ts
│   │   └── types.ts      # Feature-specific Zod schemas / types
│   └── posts/
│       ├── router.ts
│       ├── service.ts
│       ├── service.test.ts
│       └── types.ts
├── trpc.ts               # tRPC init, procedures, context
└── index.ts              # Hono app entry, mounts tRPC + middleware

apps/web/src/
├── components/           # Shared components (layout, ui primitives)
├── hooks/                # Shared hooks
├── lib/                  # Shared utilities (trpc client, etc.)
├── features/             # Feature directories
│   ├── users/
│   │   ├── UserProfile.tsx
│   │   ├── useUserData.ts
│   │   └── userProfile.test.ts
│   └── posts/
│       ├── PostList.tsx
│       ├── usePostActions.ts
│       └── postList.test.ts
├── routes/               # TanStack Router file-based routes
└── main.tsx
```

## Exports

- Default exports for React components only.
- Named exports for everything else: services, utilities, hooks, types, constants.
- Every exported function has an explicit return type annotation. No exceptions. This is the single most important rule for producing consistent code.

```typescript
// ✅ Correct
export default function UserProfile({ id }: UserProfileProps): React.ReactElement {
  // ...
}

export function getUserById(id: string): Promise<User> {
  // ...
}

// ❌ Wrong — missing return type
export function getUserById(id: string) {
  // ...
}
```

## Functions

- `function` keyword for all top-level and exported functions.
- Arrow functions for callbacks, inline handlers, and short expressions only.

```typescript
// ✅ Top-level: function keyword
export function createUser(data: CreateUserInput): Promise<User> {
  // ...
}

// ✅ Callback: arrow
const activeUsers = users.filter((u) => u.isActive);

// ✅ Inline handler: arrow
<button onClick={() => handleDelete(id)}>Delete</button>

// ❌ Wrong — top-level arrow
export const createUser = async (data: CreateUserInput): Promise<User> => {
  // ...
};
```

## Error Handling

Errors throw at the point of failure. Boundaries catch.

- Services throw `TRPCError` with the appropriate code (`NOT_FOUND`, `UNAUTHORIZED`, `BAD_REQUEST`, etc.)
- tRPC handles error response formatting automatically.
- Hono `onError` middleware catches non-tRPC errors.
- No try/catch blocks in business logic. Ever. If something can fail, it throws.
- The only try/catch blocks in the codebase are at entry points: cron job handlers, background task runners, top-level process error handlers.

```typescript
// ✅ Service throws, tRPC catches
export function getUserById(id: string): Promise<User> {
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `User ${id} not found` });
  }
  return user;
}

// ❌ Wrong — try/catch in business logic
export function getUserById(id: string): Promise<User> {
  try {
    const user = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!user) throw new Error('not found');
    return user;
  } catch (e) {
    // Don't do this
  }
}
```

## Validation

Zod everywhere. Every external input is validated.

- tRPC procedure inputs use Zod schemas.
- Drizzle schemas infer types from Zod where possible.
- Shared schemas live in `packages/shared/`. Feature-specific schemas live in the feature's `types.ts`.
- Never trust input. Even internal service boundaries validate if the data crosses a feature.

## Styling

Two options. Chosen at project start. Not mixed within a project.

### Option A: Tailwind v4 + shadcn/ui (default for AI-driven builds)
- Tailwind utility classes for layout, spacing, responsiveness.
- shadcn/ui for base components — copied into project, fully owned.
- Component variants via class-variance-authority (cva).
- Custom CSS is fine when Tailwind can't express what you need. No purity about it.
- NativeWind for React Native projects.

### Option B: Panda CSS + Ark UI (for hand-crafted builds)
- Panda CSS for styling — TypeScript object syntax, design tokens, recipes for variants.
- Ark UI for headless component primitives (same role as Radix under shadcn).
- Full theming via `panda.config.ts` — colors, spacing, typography defined as tokens.
- Style props on JSX (`<styled.div bg="primary" p="4">`) or separated into style files.
- Type-safe tokens prevent hallucination when AI does assist.

## Testing — Spec-Driven Verification

Tests are an independent verification layer, not a guide for implementation. The core problem this solves is "circular validation" — when the same agent writes both code and tests, the tests just mirror the bugs. Tests must come from specs, not from implementation.

### The workflow

1. Write a feature spec (what it does, inputs, outputs, edge cases).
2. Write tests from the spec. Tests encode what SHOULD happen.
3. Write the implementation from the spec. The implementation should never reference or be influenced by the test code.
4. Run the tests. Pass or fail.
5. If tests fail, the default assumption is the implementation is wrong. Not the tests. Tests are only updated if the spec itself changes.

This workflow is identical whether you're writing code by hand or delegating to AI.

### Two-session pattern for AI agents

When using Claude Code (or any AI agent), enforce isolation between test writing and implementation by splitting into two explicit sessions:

- **Session 1:** "Here is the spec for X. Write failing tests only. Do not implement."
- **Session 2:** "Here are the failing tests. Implement the minimum code to make them pass."

The agent in Session 2 cannot cheat because it never saw the test-writing context. This is the manual version of multi-agent isolation. The key: the agent writing tests cannot see existing code — only the spec.

### PostToolUse hook — auto-run tests on every edit

Add to `.claude/settings.json` in the parent wrapper (or project root for private repos):

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

This forces the agent to see test results after every file write. It can't silently break things and move on.

### Tools

- **Vitest** for all unit and integration tests.
- **fast-check** for property-based tests. Use for pure logic, schema transforms, data utilities — anywhere an invariant holds. Property-based tests can't be gamed by mirroring implementation because they test properties across random inputs, not specific examples.

```typescript
// Example: instead of specific cases an AI could reverse-engineer
// ❌ expect(formatPrice(100)).toBe("$100.00")

// Property-based: test the invariant
// ✅
fc.assert(fc.property(fc.integer({ min: 0, max: 99999 }), (cents) => {
  const result = formatPrice(cents);
  return result.startsWith('$') && result.includes('.');
}));
```

- **Playwright** for E2E tests (separate `e2e/` directory at the app level).
- **Hono's built-in test client** (`app.request()`) for API integration tests. No running server needed.
- **Stryker** (mutation testing, periodic) for auditing test quality. It mutates your code and checks if tests catch the changes. If they don't, the tests are fake. Run it when you want to verify a module's test coverage is real, not just high numbers.

### Rules

- Tests sit next to the code they test: `userService.test.ts` next to `userService.ts`.
- Test names describe behavior, not implementation: `"returns 404 when user does not exist"` not `"calls db.findFirst and throws TRPCError"`.
- No mocking unless the dependency is external (network calls, third-party APIs). Test real service logic against real (in-memory or test) databases.
- For SQLite: use an in-memory database for tests. Fast, isolated, no cleanup.
- Use property-based tests (fast-check) for all pure functions and data transformations. Use example-based tests for integration and behavior verification.

### CLAUDE.md testing rules

Every project's CLAUDE.md includes:

```
## Testing Rules
- NEVER write tests after implementation in the same session.
- Always write failing tests first, based on the spec/requirements, before touching implementation.
- Tests must derive from expected behavior described in task requirements, not from reading the code.
- If you see implementation before tests exist, stop and ask for the spec.
```

## Linting and Formatting

- Biome handles both linting and formatting. No ESLint. No Prettier.
- Single quotes.
- Semicolons: yes.
- Tab width: 2 spaces.
- Trailing commas: all.
- Print width: 100.
- Biome runs on save and in CI. Code that doesn't pass Biome doesn't merge.

## Git

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`
- One logical change per commit. Not "implement entire feature" in one commit.
- Branch naming: `feat/short-description`, `fix/short-description`
- Main branch is always deployable.

## TypeScript Config

- `strict: true` — non-negotiable.
- `noUncheckedIndexedAccess: true` — catches undefined array/object access.
- `exactOptionalPropertyTypes: true` — distinguishes between `undefined` and missing.
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`
- Target: `ES2022`
- Module: `ESNext`
- Module resolution: `bundler`

## Comments

- No obvious comments. `// increment counter` above `counter++` is noise.
- Comment WHY, never WHAT. The code shows what. Comments explain decisions.
- JSDoc on exported functions in packages (`packages/ui`, `packages/shared`). Not on internal feature code.
- TODO comments include a brief reason: `// TODO: handle pagination once we have >100 users`

## Dependencies

Use battle-tested libraries. Don't reinvent the wheel. The goal is building fast, not writing your own debounce function.

- Lodash, date-fns, and similar well-maintained utility libraries are encouraged. They're tree-shakeable, tested, and every AI model knows them.
- Prefer established solutions over hand-rolled alternatives. Someone already solved most problems better than you will in an afternoon.
- Standard library and built-in APIs are great when they cover the use case. Don't add a dependency for something `Array.prototype.filter` handles.
- The only dependency to be cautious about is one that's unmaintained, has a tiny user base, or pulls in a massive transitive tree for one function. Check download counts and last publish date.

## What This Document Does Not Cover

- Project-specific architecture decisions (those go in the project's own docs or ADRs).
- Deployment specifics (those are in the project's docker-compose or deploy configs).
- AI agent workflow instructions (those go in CLAUDE.md / AGENTS.md in the parent wrapper or the project root).

These conventions are about how code looks and behaves. Everything else is project-specific.
