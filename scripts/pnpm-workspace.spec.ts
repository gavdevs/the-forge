import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspacePath = resolve(repoRoot, 'pnpm-workspace.yaml');

describe('root pnpm workspace configuration', () => {
  it('allows required dependency build scripts explicitly for pnpm 11', () => {
    const workspace = readFileSync(workspacePath, 'utf-8');

    expect(workspace).toContain('allowBuilds:');
    expect(workspace).toContain("  '@swc/core': true");
    expect(workspace).toContain('  esbuild: true');
    expect(workspace).toContain('  nx: true');
    expect(workspace).toContain('  unrs-resolver: true');
    expect(workspace).not.toContain('set this to true or false');
  });
});
