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
