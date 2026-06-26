import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { apiGenerator } from './api/generator';
import { webGenerator } from './web/generator';
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
    expect(tree.exists('test-app/CLAUDE.md')).toBeFalsy();
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

    // Wrapper has agentic files (consolidated into AGENTS.md only)
    expect(tree.exists('oss-app-wrapper/CLAUDE.md')).toBeFalsy();
    expect(tree.exists('oss-app-wrapper/AGENTS.md')).toBeTruthy();
    expect(tree.exists('oss-app-wrapper/.claude/settings.json')).toBeTruthy();

    // Project has no agentic files
    expect(tree.exists('oss-app-wrapper/oss-app/CLAUDE.md')).toBeFalsy();
    expect(tree.exists('oss-app-wrapper/oss-app/AGENTS.md')).toBeFalsy();
    expect(tree.exists('oss-app-wrapper/oss-app/nx.json')).toBeTruthy();
  });

  it('should scaffold a Python (FastAPI) backend into a generated workspace', async () => {
    const tree = createTreeWithEmptyWorkspace();

    await workspaceGenerator(tree, {
      name: 'py-app',
      projectType: 'standalone',
      database: 'postgres',
      styling: 'tailwind',
    });

    // App generators are invoked with targetDir = the project name (matching CLI flow).
    // Framework = python writes the FastAPI files into apps/api/.
    await apiGenerator(tree, {
      framework: 'python',
      database: 'postgres',
      targetDir: 'py-app',
    });

    expect(tree.exists('py-app/apps/api/pyproject.toml')).toBeTruthy();
    expect(tree.exists('py-app/apps/api/project.json')).toBeTruthy();
    expect(tree.exists('py-app/apps/api/src/app/main.py')).toBeTruthy();
    expect(tree.exists('py-app/apps/api/alembic/env.py')).toBeTruthy();
    expect(tree.exists('py-app/apps/api/alembic/script.py.mako')).toBeTruthy();

    const pyproject = tree.read('py-app/apps/api/pyproject.toml', 'utf-8')!;
    expect(pyproject).toContain('asyncpg');
    expect(pyproject).not.toContain('aiosqlite');

    const project = JSON.parse(tree.read('py-app/apps/api/project.json', 'utf-8')!);
    expect(project.name).toBe('py-app-api');

    const compose = tree.read('py-app/docker-compose.yml', 'utf-8')!;
    expect(compose).toContain('api:');
    expect(compose).toContain('8000:8000');
  });

  it('should scaffold a web app that talks to a Python (FastAPI) backend', async () => {
    const tree = createTreeWithEmptyWorkspace();

    await workspaceGenerator(tree, {
      name: 'py-web',
      projectType: 'standalone',
      database: 'sqlite',
      styling: 'tailwind',
    });

    await apiGenerator(tree, {
      framework: 'python',
      database: 'sqlite',
      targetDir: 'py-web',
    });

    await webGenerator(tree, {
      styling: 'tailwind',
      apiFramework: 'python',
      targetDir: 'py-web',
    });

    // Web app ships the python-mode files...
    expect(tree.exists('py-web/apps/web/src/lib/apiClient.ts')).toBeTruthy();
    expect(tree.exists('py-web/apps/web/src/lib/api-schema.ts')).toBeTruthy();
    expect(tree.exists('py-web/apps/web/.env.example')).toBeTruthy();

    // ...and NOT the hono-mode files.
    expect(tree.exists('py-web/apps/web/src/lib/trpc.ts')).toBeFalsy();
    expect(tree.exists('py-web/apps/web/src/lib/auth.ts')).toBeFalsy();

    // Web app's vite proxy points at the FastAPI port.
    const vite = tree.read('py-web/apps/web/vite.config.ts', 'utf-8')!;
    expect(vite).toContain('localhost:8000');
    expect(vite).not.toContain('/trpc');
  });
});
