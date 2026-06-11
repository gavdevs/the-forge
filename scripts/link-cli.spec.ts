import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const scriptPath = resolve(scriptDir, 'link-cli.js');

describe('link-cli script', () => {
  it('registers the local CLI globally with the pnpm 11 command', () => {
    const script = readFileSync(scriptPath, 'utf-8');

    expect(script).toMatch(/const pnpmBinDir = `\$\{pnpmHome\}\/bin`;/);
    expect(script).toContain("execSync('pnpm add -g .'");
    expect(script).toMatch(/PATH: `\$\{pnpmBinDir\}:\$\{pnpmHome\}:\$\{process\.env\.PATH\}`/);
    expect(script).not.toContain('pnpm link --global');
  });
});
