import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from '@nx/devkit';
import { staticGenerator } from './generator';

describe('static generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    tree.write('apps/.gitkeep', '');
    tree.write('docker-compose.yml', 'services: {}\n');
    tree.write('package.json', JSON.stringify({ name: 'my-app' }));
  });

  it('should create static app structure', async () => {
    await staticGenerator(tree, { database: 'sqlite' });

    expect(tree.exists('apps/static/src/pages/index.astro')).toBeTruthy();
    expect(tree.exists('apps/static/src/layouts/Layout.astro')).toBeTruthy();
    expect(tree.exists('apps/static/src/lib/cache.ts')).toBeTruthy();
    expect(tree.exists('apps/static/astro.config.ts')).toBeTruthy();
  });

  it('should create package.json with correct dependencies', async () => {
    await staticGenerator(tree, { database: 'sqlite' });

    const content = tree.read('apps/static/package.json', 'utf-8')!;
    const pkg = JSON.parse(content);
    expect(pkg.dependencies).toHaveProperty('astro');
    expect(pkg.dependencies).toHaveProperty('hono');
    expect(pkg.dependencies).toHaveProperty('react');
  });

  it('should include sqlite cache when database is sqlite', async () => {
    await staticGenerator(tree, { database: 'sqlite' });

    const content = tree.read('apps/static/src/lib/cache.ts', 'utf-8')!;
    expect(content).toContain('better-sqlite3');
  });

  it('should create Dockerfile', async () => {
    await staticGenerator(tree, { database: 'sqlite' });

    expect(tree.exists('apps/static/Dockerfile')).toBeTruthy();
  });
});
