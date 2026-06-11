#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliDir = resolve(__dirname, '..', 'cli');

// Ensure PNPM_HOME is set so pnpm can register global binaries.
const home = process.env.HOME || process.env.USERPROFILE;
const pnpmHome =
  process.env.PNPM_HOME ||
  (process.platform === 'darwin' ? `${home}/Library/pnpm` : `${home}/.local/share/pnpm`);
const pnpmBinDir = `${pnpmHome}/bin`;

// Run pnpm setup if PNPM_HOME dir doesn't exist
if (!existsSync(pnpmHome)) {
  console.log('Running pnpm setup...');
  execSync('pnpm setup', { stdio: 'inherit' });
}

console.log(`Linking forge CLI globally (PNPM_HOME=${pnpmHome})...`);
execSync('pnpm add -g .', {
  cwd: cliDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    PNPM_HOME: pnpmHome,
    PATH: `${pnpmBinDir}:${pnpmHome}:${process.env.PATH}`,
  },
});

console.log('\nForge CLI linked. Run `source ~/.zshrc` (or restart terminal) then `forge my-app`.');
