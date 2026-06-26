#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as p from '@clack/prompts';
import { parseArgs, printUsage, resolveOptions } from './prompts';

const cliDir = dirname(fileURLToPath(import.meta.url));
const forgeRoot = resolve(cliDir, '..', '..');

async function main(): Promise<void> {
  // Skip argv[0] (node) and argv[1] (script). What remains is user input.
  const userArgv = process.argv.slice(2);

  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs(userArgv);
  } catch (err) {
    printUsage(err instanceof Error ? err.message : String(err));
    process.exit(2);
  }

  if (parsed.showHelp) {
    printUsage();
    return;
  }

  // Default to non-interactive when stdin is not a TTY (e.g. piped from
  // an agent). The flag parser already forces non-interactive whenever
  // any flag is passed.
  const tty = process.stdin.isTTY === true;
  const nonInteractive = parsed.nonInteractive || !tty;

  const options = await resolveOptions(parsed.positional, parsed.flags, nonInteractive);
  if (!options) {
    // resolveOptions already printed the appropriate message
    process.exit(parsed.flagsPresent ? 2 : 1);
  }

  const targetDir = resolve(process.cwd(), options.name);
  const isOpenSource = options.projectType === 'open-source';

  const s = p.spinner();

  // Step 1: Generate workspace (writes to forge repo, then move to target)
  s.start('Generating workspace...');
  runForgeGenerator(
    `workspace ${options.name} --projectType=${options.projectType} --database=${options.database} --styling=${options.styling} --no-interactive`,
  );

  // Move generated output from forge repo to user's target directory
  const generatedDir = isOpenSource
    ? resolve(forgeRoot, `${options.name}-wrapper`)
    : resolve(forgeRoot, options.name);
  const moveTarget = isOpenSource ? resolve(process.cwd(), `${options.name}-wrapper`) : targetDir;

  if (existsSync(moveTarget)) {
    execSync(`rm -rf "${moveTarget}"`, { stdio: 'pipe' });
  }
  mkdirSync(dirname(moveTarget), { recursive: true });
  execSync(`mv "${generatedDir}" "${moveTarget}"`, { stdio: 'pipe' });
  s.stop('Workspace created.');

  // Resolve the actual project root (where apps/ lives)
  const projectRoot = isOpenSource ? resolve(moveTarget, options.name) : moveTarget;

  // Step 2: Generate selected apps
  // App generators use targetDir which is relative in the Nx tree,
  // but since the project is now outside the forge repo, we generate
  // into a temp name inside forge and move each app.
  const optionalFeaturesFlag =
    options.optionalFeatures.length > 0
      ? ` --optionalFeatures=${options.optionalFeatures.join(',')}`
      : '';

  for (const app of options.apps) {
    s.start(`Generating ${app} app...`);

    const td = `--targetDir=${options.name}`;

    switch (app) {
      case 'api':
        runForgeGenerator(
          `api --framework=${options.backendFramework} --database=${options.database}${optionalFeaturesFlag} --projectName=${options.name} ${td}`,
        );
        break;
      case 'web':
        // Pair the web app's data layer with the chosen backend framework.
        // Python backends can't use tRPC (it's TS-only) — they get a typed
        // fetch client + OpenAPI codegen instead. See WebGeneratorSchema.apiFramework.
        const apiFrameworkFlag =
          options.backendFramework === 'python' ? ' --apiFramework=python' : '';
        runForgeGenerator(`web --styling=${options.styling}${apiFrameworkFlag} ${td}`);
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

    // Move generated app files from forge repo to target
    const genAppDir = resolve(forgeRoot, options.name);
    if (existsSync(genAppDir)) {
      execSync(`cp -r "${genAppDir}/"* "${projectRoot}/"`, { stdio: 'pipe' });
      execSync(`rm -rf "${genAppDir}"`, { stdio: 'pipe' });
    }

    s.stop(`${app} app created.`);
  }

  // Step 3: Install dependencies
  s.start('Installing dependencies...');
  try {
    execSync('pnpm install', { cwd: projectRoot, stdio: 'inherit', timeout: 180000 });
    s.stop('Dependencies installed.');
  } catch {
    s.stop('Dependencies install failed — run `pnpm install` manually.');
  }

  // Step 3b: Sync Python dependencies for a Python API app (uv)
  if (options.apps.includes('api') && options.backendFramework === 'python') {
    const pyAppDir = resolve(projectRoot, 'apps/api');
    s.start('Syncing Python dependencies (uv)...');
    try {
      execSync('uv sync', { cwd: pyAppDir, stdio: 'inherit', timeout: 180000 });
      s.stop('Python dependencies installed.');
    } catch {
      s.stop('Python deps sync skipped — install uv and run `uv sync` in apps/api.');
    }
  }

  // Step 4: Configure Nx AI agents (MCP server, skills, enhanced AGENTS.md)
  s.start('Configuring AI agents...');
  try {
    execSync('npx nx configure-ai-agents --no-interactive', {
      cwd: projectRoot,
      stdio: 'pipe',
      timeout: 60000,
    });
    s.stop('AI agents configured.');
  } catch {
    s.stop('AI agent setup skipped — run `npx nx configure-ai-agents` manually.');
  }

  // Step 5: Initialize git
  try {
    const gitRoot = isOpenSource ? moveTarget : projectRoot;
    execSync(
      'git init && git add -A && git commit -m "chore: initial project scaffold from the forge"',
      {
        cwd: gitRoot,
        stdio: 'pipe',
      },
    );
    s.stop('Git initialized.');
  } catch {
    s.stop('Git init skipped.');
  }

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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
