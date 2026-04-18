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

  // Step 1: Generate workspace
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

  // Step 3: Install dependencies
  s.start('Installing dependencies...');
  try {
    execSync('pnpm install', { cwd: projectRoot, stdio: 'pipe' });
    s.stop('Dependencies installed.');
  } catch {
    s.stop('Dependencies install failed — run pnpm install manually.');
  }

  // Step 4: Initialize git
  s.start('Initializing git...');
  const gitRoot = options.projectType === 'open-source'
    ? resolve(process.cwd(), `${options.name}-wrapper`)
    : projectRoot;
  try {
    execSync('git init && git add -A && git commit -m "chore: initial project scaffold from the forge"', {
      cwd: gitRoot,
      stdio: 'pipe',
    });
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

main().catch(console.error);
