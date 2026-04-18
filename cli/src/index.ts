#!/usr/bin/env node
import * as p from '@clack/prompts';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, renameSync, mkdirSync } from 'node:fs';
import { runPrompts } from './prompts';

const cliDir = dirname(fileURLToPath(import.meta.url));
const forgeRoot = resolve(cliDir, '..', '..');

async function main(): Promise<void> {
  const nameArg = process.argv[2];
  const options = await runPrompts(nameArg);
  if (!options) return;

  const targetDir = resolve(process.cwd(), options.name);
  const isOpenSource = options.projectType === 'open-source';

  const s = p.spinner();

  // Step 1: Generate workspace (writes to forge repo, then move to target)
  s.start('Generating workspace...');
  runForgeGenerator(`workspace ${options.name} --projectType=${options.projectType} --database=${options.database} --styling=${options.styling} --no-interactive`);

  // Move generated output from forge repo to user's target directory
  const generatedDir = isOpenSource
    ? resolve(forgeRoot, `${options.name}-wrapper`)
    : resolve(forgeRoot, options.name);
  const moveTarget = isOpenSource
    ? resolve(process.cwd(), `${options.name}-wrapper`)
    : targetDir;

  mkdirSync(dirname(moveTarget), { recursive: true });
  renameSync(generatedDir, moveTarget);
  s.stop('Workspace created.');

  // Resolve the actual project root (where apps/ lives)
  const projectRoot = isOpenSource
    ? resolve(moveTarget, options.name)
    : moveTarget;

  // Step 2: Generate selected apps
  // App generators use targetDir which is relative in the Nx tree,
  // but since the project is now outside the forge repo, we generate
  // into a temp name inside forge and move each app.
  const optionalFeaturesFlag = options.optionalFeatures.length > 0
    ? ` --optionalFeatures=${options.optionalFeatures.join(',')}`
    : '';

  for (const app of options.apps) {
    s.start(`Generating ${app} app...`);

    const td = `--targetDir=${options.name}`;

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

    // Move generated app files from forge repo to target
    const genAppDir = resolve(forgeRoot, options.name);
    if (existsSync(genAppDir)) {
      execSync(`cp -r "${genAppDir}/"* "${projectRoot}/"`, { stdio: 'pipe' });
      execSync(`rm -rf "${genAppDir}"`, { stdio: 'pipe' });
    }

    s.stop(`${app} app created.`);
  }

  // Step 3: Install dependencies
  s.stop('Installing dependencies...');
  try {
    execSync('pnpm install', { cwd: projectRoot, stdio: 'inherit', timeout: 180000 });
    p.log.success('Dependencies installed.');
  } catch {
    p.log.warn('Dependencies install failed — run `pnpm install` manually.');
  }

  // Step 4: Initialize git
  try {
    const gitRoot = isOpenSource ? moveTarget : projectRoot;
    execSync('git init && git add -A && git commit -m "chore: initial project scaffold from the forge"', {
      cwd: gitRoot,
      stdio: 'pipe',
    });
    p.log.success('Git initialized.');
  } catch {
    p.log.warn('Git init skipped.');
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
