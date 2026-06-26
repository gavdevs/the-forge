import { readJson, type Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { workspaceGenerator } from './generator';

describe('workspace generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should create root config files', async () => {
    await workspaceGenerator(tree, {
      name: 'my-app',
      projectType: 'standalone',
      database: 'sqlite',
      styling: 'tailwind',
    });

    expect(tree.exists('my-app/package.json')).toBeTruthy();
    expect(tree.exists('my-app/nx.json')).toBeTruthy();
    expect(tree.exists('my-app/pnpm-workspace.yaml')).toBeTruthy();
    expect(tree.exists('my-app/tsconfig.base.json')).toBeTruthy();
    expect(tree.exists('my-app/biome.json')).toBeTruthy();
    expect(tree.exists('my-app/vitest.config.ts')).toBeTruthy();
    expect(tree.exists('my-app/.gitignore')).toBeTruthy();
    expect(tree.exists('my-app/.env.example')).toBeTruthy();
    expect(tree.exists('my-app/docker-compose.yml')).toBeTruthy();
  });

  it('should create pnpm 11 build-script approvals', async () => {
    await workspaceGenerator(tree, {
      name: 'my-app',
      projectType: 'standalone',
      database: 'sqlite',
      styling: 'tailwind',
    });

    const workspace = tree.read('my-app/pnpm-workspace.yaml', 'utf-8');
    const pkg = readJson(tree, 'my-app/package.json');

    expect(workspace).toContain('allowBuilds:');
    expect(workspace).toContain("  '@swc/core': true");
    expect(workspace).toContain('  esbuild: true');
    expect(workspace).toContain('  nx: true');
    expect(workspace).toContain('  unrs-resolver: true');
    expect(pkg.pnpm).toBeUndefined();
  });

  it('should create Biome 2 configuration', async () => {
    await workspaceGenerator(tree, {
      name: 'my-app',
      projectType: 'standalone',
      database: 'sqlite',
      styling: 'tailwind',
    });

    const biomeConfig = readJson(tree, 'my-app/biome.json');
    const packageBiomeConfig = readJson(tree, 'my-app/packages/config/biome.json');

    expect(biomeConfig.$schema).toBe('https://biomejs.dev/schemas/2.4.12/schema.json');
    expect(biomeConfig.organizeImports).toBeUndefined();
    expect(biomeConfig.assist.actions.source.organizeImports).toBe('on');
    expect(packageBiomeConfig.root).toBe(false);
  });

  it('should create agent config files for standalone', async () => {
    await workspaceGenerator(tree, {
      name: 'my-app',
      projectType: 'standalone',
      database: 'sqlite',
      styling: 'tailwind',
    });

    expect(tree.exists('my-app/AGENTS.md')).toBeTruthy();
    expect(tree.exists('my-app/.claude/settings.json')).toBeTruthy();
  });

  it('should create parent wrapper for open-source projects', async () => {
    await workspaceGenerator(tree, {
      name: 'my-app',
      projectType: 'open-source',
      database: 'sqlite',
      styling: 'tailwind',
    });

    // Agentic file in wrapper (no CLAUDE.md — consolidated into AGENTS.md)
    expect(tree.exists('my-app-wrapper/CLAUDE.md')).toBeFalsy();
    expect(tree.exists('my-app-wrapper/AGENTS.md')).toBeTruthy();
    expect(tree.exists('my-app-wrapper/.claude/settings.json')).toBeTruthy();

    // Project nested inside, no agentic files
    expect(tree.exists('my-app-wrapper/my-app/package.json')).toBeTruthy();
    expect(tree.exists('my-app-wrapper/my-app/nx.json')).toBeTruthy();
    expect(tree.exists('my-app-wrapper/my-app/CLAUDE.md')).toBeFalsy();
    expect(tree.exists('my-app-wrapper/my-app/AGENTS.md')).toBeFalsy();
  });

  it('should copy shared packages', async () => {
    await workspaceGenerator(tree, {
      name: 'my-app',
      projectType: 'standalone',
      database: 'sqlite',
      styling: 'tailwind',
    });

    expect(tree.exists('my-app/packages/shared/package.json')).toBeTruthy();
    expect(tree.exists('my-app/packages/config/package.json')).toBeTruthy();
  });

  it('should create project-plugin with feature generator', async () => {
    await workspaceGenerator(tree, {
      name: 'my-app',
      projectType: 'standalone',
      database: 'sqlite',
      styling: 'tailwind',
    });

    expect(tree.exists('my-app/tools/project-plugin/package.json')).toBeTruthy();
    expect(tree.exists('my-app/tools/project-plugin/generators.json')).toBeTruthy();
  });

  it('should set correct PostToolUse hook in .claude/settings.json', async () => {
    await workspaceGenerator(tree, {
      name: 'my-app',
      projectType: 'standalone',
      database: 'sqlite',
      styling: 'tailwind',
    });

    const settings = readJson(tree, 'my-app/.claude/settings.json');
    expect(settings.hooks.PostToolUse).toBeDefined();
    expect(settings.hooks.PostToolUse[0].matcher).toBe('Write|Edit');
    expect(settings.hooks.PostToolUse[0].hooks[0].command).toContain('vitest run');
  });
});
