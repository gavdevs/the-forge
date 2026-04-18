import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from '@nx/devkit';
import { webGenerator } from './generator';

describe('web generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    tree.write('apps/.gitkeep', '');
    tree.write('docker-compose.yml', 'services: {}\n');
    tree.write('package.json', JSON.stringify({ name: 'my-app' }));
  });

  it('should create web app structure', async () => {
    await webGenerator(tree, { styling: 'tailwind' });

    expect(tree.exists('apps/web/src/main.tsx')).toBeTruthy();
    expect(tree.exists('apps/web/src/lib/trpc.ts')).toBeTruthy();
    expect(tree.exists('apps/web/src/lib/auth.ts')).toBeTruthy();
    expect(tree.exists('apps/web/src/routes/__root.tsx')).toBeTruthy();
    expect(tree.exists('apps/web/index.html')).toBeTruthy();
    expect(tree.exists('apps/web/vite.config.ts')).toBeTruthy();
  });

  it('should create package.json with correct dependencies', async () => {
    await webGenerator(tree, { styling: 'tailwind' });

    const content = tree.read('apps/web/package.json', 'utf-8')!;
    const pkg = JSON.parse(content);
    expect(pkg.dependencies).toHaveProperty('react');
    expect(pkg.dependencies).toHaveProperty('@tanstack/react-router');
    expect(pkg.dependencies).toHaveProperty('@trpc/client');
    expect(pkg.dependencies).toHaveProperty('@trpc/react-query');
  });

  it('should include tailwind deps when styling is tailwind', async () => {
    await webGenerator(tree, { styling: 'tailwind' });

    const content = tree.read('apps/web/package.json', 'utf-8')!;
    const pkg = JSON.parse(content);
    expect(pkg.dependencies).toHaveProperty('tailwindcss');
  });

  it('should include panda deps when styling is panda', async () => {
    await webGenerator(tree, { styling: 'panda' });

    const content = tree.read('apps/web/package.json', 'utf-8')!;
    const pkg = JSON.parse(content);
    expect(pkg.devDependencies).toHaveProperty('@pandacss/dev');
    expect(pkg.dependencies).toHaveProperty('@ark-ui/react');
  });

  it('should create Dockerfile', async () => {
    await webGenerator(tree, { styling: 'tailwind' });

    expect(tree.exists('apps/web/Dockerfile')).toBeTruthy();
  });

  it('should have empty feature and component directories', async () => {
    await webGenerator(tree, { styling: 'tailwind' });

    expect(tree.exists('apps/web/src/features/.gitkeep')).toBeTruthy();
    expect(tree.exists('apps/web/src/components/.gitkeep')).toBeTruthy();
    expect(tree.exists('apps/web/src/hooks/.gitkeep')).toBeTruthy();
  });
});
