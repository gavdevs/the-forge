import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from '@nx/devkit';
import { workspaceGenerator } from './workspace/generator';

describe('integration: full project scaffold', () => {
  it('should generate a complete standalone project', async () => {
    const tree = createTreeWithEmptyWorkspace();

    await workspaceGenerator(tree, {
      name: 'test-app',
      projectType: 'standalone',
      database: 'sqlite',
      styling: 'tailwind',
    });

    // Verify workspace structure
    expect(tree.exists('test-app/nx.json')).toBeTruthy();
    expect(tree.exists('test-app/CLAUDE.md')).toBeTruthy();
    expect(tree.exists('test-app/AGENTS.md')).toBeTruthy();
    expect(tree.exists('test-app/packages/shared/package.json')).toBeTruthy();
    expect(tree.exists('test-app/packages/config/package.json')).toBeTruthy();
    expect(tree.exists('test-app/packages/ui/package.json')).toBeTruthy();
    expect(tree.exists('test-app/tools/project-plugin/generators.json')).toBeTruthy();
    expect(tree.exists('test-app/biome.json')).toBeTruthy();
    expect(tree.exists('test-app/.claude/settings.json')).toBeTruthy();
  });

  it('should generate an open-source project with wrapper', async () => {
    const tree = createTreeWithEmptyWorkspace();

    await workspaceGenerator(tree, {
      name: 'oss-app',
      projectType: 'open-source',
      database: 'sqlite',
      styling: 'tailwind',
    });

    // Wrapper has agentic files
    expect(tree.exists('oss-app-wrapper/CLAUDE.md')).toBeTruthy();
    expect(tree.exists('oss-app-wrapper/AGENTS.md')).toBeTruthy();
    expect(tree.exists('oss-app-wrapper/.claude/settings.json')).toBeTruthy();

    // Project has no agentic files
    expect(tree.exists('oss-app-wrapper/oss-app/CLAUDE.md')).toBeFalsy();
    expect(tree.exists('oss-app-wrapper/oss-app/nx.json')).toBeTruthy();
  });
});
