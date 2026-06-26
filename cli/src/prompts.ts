import * as p from '@clack/prompts';

export type BackendFramework = 'hono' | 'python';
export type Database = 'sqlite' | 'postgres';
export type Styling = 'tailwind' | 'panda';
export type ProjectType = 'standalone' | 'open-source';

export const APP_KEYS = ['api', 'web', 'mobile', 'desktop', 'static'] as const;
export type AppKey = (typeof APP_KEYS)[number];

export const OPTIONAL_FEATURES = [
  'ai',
  'agents',
  'payments',
  'email',
  'realtime',
  'cron',
  'vector',
  'observability',
] as const;
export type OptionalFeature = (typeof OPTIONAL_FEATURES)[number];

export interface ForgeOptions {
  name: string;
  projectType: ProjectType;
  apps: AppKey[];
  backendFramework: BackendFramework;
  database: Database;
  styling: Styling;
  optionalFeatures: OptionalFeature[];
}

/**
 * All non-interactive inputs that flags can supply. A flag override of
 * `undefined` means "user did not provide this on the CLI"; the TUI
 * (or defaults) will fill it in.
 */
export interface FlagOverrides {
  name?: string;
  projectType?: ProjectType;
  apps?: string[];
  backendFramework?: BackendFramework;
  database?: Database;
  styling?: Styling;
  optionalFeatures?: string[];
}

const NAME_RE = /^[a-z0-9-]+$/;

function isAppKey(v: string): v is AppKey {
  return (APP_KEYS as readonly string[]).includes(v);
}

function isOptionalFeature(v: string): v is OptionalFeature {
  return (OPTIONAL_FEATURES as readonly string[]).includes(v);
}

/**
 * Print a usage message to stderr and return null. Callers should exit
 * with a non-zero status when this happens.
 */
export function printUsage(error?: string): null {
  const lines = [
    'Usage: forge <name> [flags]',
    '',
    'Flags:',
    '  --name <name>            Project name (lowercase letters, numbers, hyphens)',
    '  --project-type <type>    standalone | open-source',
    '  --apps <list>            Space- or comma-separated: api web mobile desktop static',
    '  --framework <fw>         hono | python (only meaningful with --apps api)',
    '  --database <db>          sqlite | postgres',
    '  --styling <s>            tailwind | panda',
    '  --features <list>        Comma-separated: ai,agents,payments,email,realtime,cron,vector,observability',
    '  --open-source            Shortcut for --project-type open-source',
    '  --yes                    Skip confirmation prompts; required when stdin is not a TTY',
    '  --help, -h               Show this message',
    '',
    'Examples:',
    '  forge my-app --apps api web --framework hono --database postgres',
    '  forge py-svc --apps api --framework python --database sqlite --yes',
    '  forge launcher --apps web desktop --styling panda --features ai,realtime --yes',
    '',
    'When any flag is provided the CLI runs non-interactively and uses',
    'sensible defaults for any field you did not specify. If a required',
    'field has no default (project name, apps), the CLI exits with an error.',
  ];
  if (error) {
    process.stderr.write(`Error: ${error}\n\n`);
  }
  process.stderr.write(`${lines.join('\n')}\n`);
  return null;
}

/**
 * Resolve a complete ForgeOptions from the positional name + flags.
 * If `nonInteractive` is true, the TUI is never shown; missing required
 * fields cause an error. Otherwise, the TUI prompts for anything the
 * flags did not supply.
 */
export async function resolveOptions(
  positionalName: string | undefined,
  flags: FlagOverrides,
  nonInteractive: boolean,
): Promise<ForgeOptions | null> {
  // Resolve name: positional arg wins; else flag; else prompt (or error).
  let name = positionalName ?? flags.name;
  if (!name) {
    if (nonInteractive) {
      printUsage('Missing project name. Provide it as the first argument or via --name.');
      return null;
    }
    const prompted = await p.text({
      message: 'Project name:',
      placeholder: 'my-app',
      validate: (value) => {
        if (!value) return 'Name is required';
        if (!NAME_RE.test(value)) {
          return 'Use lowercase letters, numbers, and hyphens only';
        }
        return undefined;
      },
    });
    if (p.isCancel(prompted)) {
      p.cancel('Cancelled.');
      return null;
    }
    name = prompted;
  } else if (!NAME_RE.test(name)) {
    printUsage(`Invalid project name "${name}". Use lowercase letters, numbers, and hyphens only.`);
    return null;
  }

  // Apps: required. Must have at least one. Default = none — agent must decide.
  let apps: AppKey[] | undefined = flags.apps ? normalizeApps(flags.apps) : undefined;
  if (apps) {
    const err = validateApps(apps);
    if (err) {
      printUsage(err);
      return null;
    }
  }
  if (!apps || apps.length === 0) {
    if (nonInteractive) {
      printUsage('Missing --apps. Provide at least one of: api web mobile desktop static.');
      return null;
    }
    const prompted = await p.multiselect({
      message: 'Which apps?',
      options: [
        { value: 'api', label: 'API (backend)' },
        { value: 'web', label: 'Web (React + Vite + TanStack Router)' },
        { value: 'mobile', label: 'Mobile (Expo + React Native)' },
        { value: 'desktop', label: 'Desktop (Tauri v2 — requires Web)' },
        { value: 'static', label: 'Static (Astro + Hono ISR)' },
      ],
      required: true,
    });
    if (p.isCancel(prompted)) {
      p.cancel('Cancelled.');
      return null;
    }
    apps = prompted as AppKey[];
    // Validate desktop-requires-web after interactive selection too
    if (apps.includes('desktop') && !apps.includes('web')) {
      p.log.warn('Desktop requires the Web app. Adding Web automatically.');
      apps.push('web');
    }
  }

  // Project type: defaults to standalone.
  let projectType: ProjectType | undefined = flags.projectType;
  if (!projectType) {
    if (nonInteractive) {
      projectType = 'standalone';
    } else {
      const prompted = await p.select({
        message: 'Project type:',
        options: [
          { value: 'standalone', label: 'Standalone — everything in one repo' },
          {
            value: 'open-source',
            label: 'Open-source — parent wrapper hides AI tooling',
          },
        ],
      });
      if (p.isCancel(prompted)) {
        p.cancel('Cancelled.');
        return null;
      }
      projectType = prompted;
    }
  }

  // Database: defaults to sqlite.
  let database: Database | undefined = flags.database;
  if (!database) {
    if (nonInteractive) {
      database = 'sqlite';
    } else {
      const prompted = await p.select({
        message: 'Database:',
        options: [
          { value: 'sqlite', label: 'SQLite (default — zero config, file-based)' },
          { value: 'postgres', label: 'PostgreSQL (multi-writer, advanced features)' },
        ],
      });
      if (p.isCancel(prompted)) {
        p.cancel('Cancelled.');
        return null;
      }
      database = prompted;
    }
  }

  // Backend framework: required only when apps includes api. Defaults to hono.
  let backendFramework: BackendFramework | undefined = flags.backendFramework;
  if (apps.includes('api')) {
    if (!backendFramework) {
      if (nonInteractive) {
        backendFramework = 'hono';
      } else {
        const prompted = await p.select({
          message: 'API framework:',
          options: [
            {
              value: 'hono',
              label: 'Hono (TypeScript) — Hono + tRPC + Drizzle + Better Auth',
            },
            { value: 'python', label: 'Python API (FastAPI + SQLAlchemy + uv)' },
          ],
        });
        if (p.isCancel(prompted)) {
          p.cancel('Cancelled.');
          return null;
        }
        backendFramework = prompted;
      }
    }
  } else {
    backendFramework = 'hono'; // not used, but ForgeOptions requires it
  }

  // Styling: defaults to tailwind.
  let styling: Styling | undefined = flags.styling;
  if (!styling) {
    if (nonInteractive) {
      styling = 'tailwind';
    } else {
      const prompted = await p.select({
        message: 'Styling:',
        options: [
          { value: 'tailwind', label: 'Tailwind v4 + shadcn/ui (default for AI-driven builds)' },
          { value: 'panda', label: 'Panda CSS + Ark UI (hand-crafted, type-safe tokens)' },
        ],
      });
      if (p.isCancel(prompted)) {
        p.cancel('Cancelled.');
        return null;
      }
      styling = prompted;
    }
  }

  // Optional features: only valid for hono. Defaults to empty.
  let optionalFeatures: OptionalFeature[] = [];
  if (apps.includes('api') && backendFramework === 'hono' && flags.optionalFeatures) {
    const { features, error } = normalizeFeatures(flags.optionalFeatures);
    if (error) {
      printUsage(error);
      return null;
    }
    optionalFeatures = features;
  }

  return {
    name,
    projectType,
    apps,
    backendFramework,
    database,
    styling,
    optionalFeatures,
  };
}

function normalizeApps(raw: string[]): AppKey[] {
  // Accept both space- and comma-separated. The CLI parser already
  // splits on whitespace; commas get split here.
  const flat = raw
    .flatMap((s) => s.split(','))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const dedup: AppKey[] = [];
  for (const k of flat) {
    if (!isAppKey(k)) {
      // Will be caught by validateApps; keep going so the error message
      // can list all invalid keys.
      dedup.push(k as AppKey);
      continue;
    }
    if (!dedup.includes(k)) dedup.push(k);
  }
  return dedup;
}

function validateApps(apps: AppKey[]): string | null {
  const invalid = apps.filter((a) => !isAppKey(a));
  if (invalid.length > 0) {
    return `Unknown app(s): ${invalid.join(', ')}. Valid: ${APP_KEYS.join(', ')}`;
  }
  if (apps.includes('desktop') && !apps.includes('web')) {
    // Auto-fix: the caller treats this as a warning, not an error.
    apps.push('web');
  }
  return null;
}

function normalizeFeatures(raw: string[]): {
  features: OptionalFeature[];
  error: string | null;
} {
  const flat = raw
    .flatMap((s) => s.split(','))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const out: OptionalFeature[] = [];
  for (const f of flat) {
    if (!isOptionalFeature(f)) {
      return {
        features: [],
        error: `Unknown feature: "${f}". Valid: ${OPTIONAL_FEATURES.join(', ')}`,
      };
    }
    if (!out.includes(f)) out.push(f);
  }
  return { features: out, error: null };
}

/**
 * Backwards-compatible TUI-only entry point. Used by `npm run dev` and
 * by older callers. Returns null when the user cancels.
 */
export async function runPrompts(nameArg?: string): Promise<ForgeOptions | null> {
  return resolveOptions(nameArg, {}, false);
}

/**
 * Parse `process.argv` (excluding node + script) into a positional
 * name and a typed overrides object. Throws Error with a usage-friendly
 * message on any unknown flag or invalid value.
 */
export function parseArgs(argv: string[]): {
  positional?: string;
  flags: FlagOverrides;
  flagsPresent: boolean;
  showHelp: boolean;
  nonInteractive: boolean;
  openSource: boolean;
} {
  const flags: FlagOverrides = {};
  let positional: string | undefined;
  let flagsPresent = false;
  let showHelp = false;
  let nonInteractive = false;
  let openSource = false;

  function flagName(arg: string): string {
    const eq = arg.indexOf('=');
    return eq === -1 ? arg : arg.slice(0, eq);
  }

  // Collect repeating --flags into arrays (--apps accepts multiple values
  // space-separated: --apps api web mobile).
  function readValue(i: number, splitOnComma = false): { value: string[]; consumed: number } {
    // Accepts --flag=value or --flag value
    const eq = argv[i].indexOf('=');
    let raw: string;
    let consumed: number;
    if (eq !== -1) {
      raw = argv[i].slice(eq + 1);
      consumed = 1;
    } else {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        throw new Error(`Flag ${argv[i]} requires a value.`);
      }
      raw = next;
      consumed = 2;
    }
    const parts = splitOnComma
      ? raw.split(/[\s,]+/).filter((s) => s.length > 0)
      : raw.split(/\s+/).filter((s) => s.length > 0);
    if (parts.length === 0) {
      throw new Error(`Flag ${argv[i]} requires a value.`);
    }
    return { value: parts, consumed };
  }

  /**
   * Like readValue but for flags whose value can be followed by more
   * non-flag tokens. Consumes the value AND any subsequent tokens that
   * don't begin with `--`. Lets users write `--apps api web mobile` or
   * `--features ai realtime`.
   */
  function readMultiValue(i: number, splitOnComma = false): { value: string[]; consumed: number } {
    const eq = argv[i].indexOf('=');
    let consumed: number;
    let firstRaw: string;
    if (eq !== -1) {
      firstRaw = argv[i].slice(eq + 1);
      consumed = 1;
    } else {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        throw new Error(`Flag ${argv[i]} requires a value.`);
      }
      firstRaw = next;
      consumed = 2;
    }
    // Greedily pull in any further non-flag tokens
    while (consumed + i < argv.length) {
      const candidate = argv[i + consumed];
      if (candidate.startsWith('--') || candidate.startsWith('-')) break;
      firstRaw += ` ${candidate}`;
      consumed += 1;
    }
    const parts = splitOnComma
      ? firstRaw.split(/[\s,]+/).filter((s) => s.length > 0)
      : firstRaw.split(/\s+/).filter((s) => s.length > 0);
    if (parts.length === 0) {
      throw new Error(`Flag ${argv[i]} requires a value.`);
    }
    return { value: parts, consumed };
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const name = flagName(a);

    if (name === '--help' || name === '-h') {
      showHelp = true;
      flagsPresent = true;
      continue;
    }

    if (name === '--yes') {
      nonInteractive = true;
      flagsPresent = true;
      continue;
    }

    if (name === '--open-source') {
      openSource = true;
      flagsPresent = true;
      continue;
    }

    if (name === '--name') {
      const { value, consumed } = readValue(i);
      flags.name = value[0];
      i += consumed - 1;
      flagsPresent = true;
      continue;
    }

    if (name === '--project-type') {
      const { value, consumed } = readValue(i, true);
      const v = value[0].trim();
      if (v !== 'standalone' && v !== 'open-source') {
        throw new Error(`Invalid --project-type "${v}". Must be standalone or open-source.`);
      }
      flags.projectType = v;
      i += consumed - 1;
      flagsPresent = true;
      continue;
    }

    if (name === '--apps') {
      const { value, consumed } = readMultiValue(i, true);
      flags.apps = (flags.apps ?? []).concat(value);
      i += consumed - 1;
      flagsPresent = true;
      continue;
    }

    if (name === '--framework') {
      const { value, consumed } = readValue(i, true);
      const v = value[0].trim();
      if (v !== 'hono' && v !== 'python') {
        throw new Error(`Invalid --framework "${v}". Must be hono or python.`);
      }
      flags.backendFramework = v;
      i += consumed - 1;
      flagsPresent = true;
      continue;
    }

    if (name === '--database') {
      const { value, consumed } = readValue(i, true);
      const v = value[0].trim();
      if (v !== 'sqlite' && v !== 'postgres') {
        throw new Error(`Invalid --database "${v}". Must be sqlite or postgres.`);
      }
      flags.database = v;
      i += consumed - 1;
      flagsPresent = true;
      continue;
    }

    if (name === '--styling') {
      const { value, consumed } = readValue(i, true);
      const v = value[0].trim();
      if (v !== 'tailwind' && v !== 'panda') {
        throw new Error(`Invalid --styling "${v}". Must be tailwind or panda.`);
      }
      flags.styling = v;
      i += consumed - 1;
      flagsPresent = true;
      continue;
    }

    if (name === '--features') {
      const { value, consumed } = readMultiValue(i, true);
      flags.optionalFeatures = (flags.optionalFeatures ?? []).concat(value);
      i += consumed - 1;
      flagsPresent = true;
      continue;
    }

    // Unknown flag
    if (a.startsWith('--') || a.startsWith('-')) {
      throw new Error(`Unknown flag: ${a}`);
    }

    // Positional
    if (!positional) {
      positional = a;
      continue;
    }
    throw new Error(`Unexpected positional argument: ${a}`);
  }

  // Apply --open-source shorthand
  if (openSource && !flags.projectType) {
    flags.projectType = 'open-source';
  }

  // If user is passing flags, they almost certainly want non-interactive.
  if (flagsPresent && !nonInteractive) {
    nonInteractive = true;
  }

  return { positional, flags, flagsPresent, showHelp, nonInteractive, openSource };
}
