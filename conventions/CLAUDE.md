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
