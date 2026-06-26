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

  describe('hono framework (default)', () => {
    it('should create web app structure', async () => {
      await webGenerator(tree, { styling: 'tailwind' });

      expect(tree.exists('apps/web/src/main.tsx')).toBeTruthy();
      expect(tree.exists('apps/web/src/lib/trpc.ts')).toBeTruthy();
      expect(tree.exists('apps/web/src/lib/auth.ts')).toBeTruthy();
      expect(tree.exists('apps/web/src/routes/__root.tsx')).toBeTruthy();
      expect(tree.exists('apps/web/index.html')).toBeTruthy();
      expect(tree.exists('apps/web/vite.config.ts')).toBeTruthy();
    });

    it('should NOT emit python-only files in hono mode', async () => {
      await webGenerator(tree, { styling: 'tailwind' });

      expect(tree.exists('apps/web/src/lib/apiClient.ts')).toBeFalsy();
      expect(tree.exists('apps/web/src/lib/api-schema.ts')).toBeFalsy();
      expect(tree.exists('apps/web/.env.example')).toBeFalsy();
    });

    it('should create package.json with correct dependencies', async () => {
      await webGenerator(tree, { styling: 'tailwind' });

      const content = tree.read('apps/web/package.json', 'utf-8')!;
      const pkg = JSON.parse(content);
      expect(pkg.dependencies).toHaveProperty('react');
      expect(pkg.dependencies).toHaveProperty('@tanstack/react-router');
      expect(pkg.dependencies).toHaveProperty('@trpc/client');
      expect(pkg.dependencies).toHaveProperty('@trpc/react-query');
      expect(pkg.dependencies).toHaveProperty('better-auth');
    });

    it('should NOT include openapi-typescript in hono mode', async () => {
      await webGenerator(tree, { styling: 'tailwind' });

      const content = tree.read('apps/web/package.json', 'utf-8')!;
      const pkg = JSON.parse(content);
      expect(pkg.devDependencies).not.toHaveProperty('openapi-typescript');
    });

    it('should proxy to localhost:3000 in vite config (hono default port)', async () => {
      await webGenerator(tree, { styling: 'tailwind' });

      const content = tree.read('apps/web/vite.config.ts', 'utf-8')!;
      expect(content).toContain('localhost:3000');
      expect(content).toContain('/trpc');
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

    it('should wire the TanStack Router vite plugin so routeTree.gen is generated', async () => {
      // Without the plugin, `pnpm build` fails: main.tsx imports
      // './routeTree.gen' but no generator emits it before tsc runs.
      await webGenerator(tree, { styling: 'tailwind' });

      const content = tree.read('apps/web/vite.config.ts', 'utf-8')!;
      expect(content).toContain("from '@tanstack/router-plugin/vite'");
      expect(content).toContain('tanstackRouter(');
    });

    it('should emit vite-env.d.ts so tsc -b resolves routeTree.gen before the plugin runs', async () => {
      // The plugin generates routeTree.gen.ts during vite's transform
      // pipeline, but `pnpm build` runs `tsc -b` first. The ambient
      // declaration hides the import from tsc so the first build passes
      // even before vite has produced the real file.
      await webGenerator(tree, { styling: 'tailwind' });

      expect(tree.exists('apps/web/src/vite-env.d.ts')).toBeTruthy();
      const content = tree.read('apps/web/src/vite-env.d.ts', 'utf-8')!;
      expect(content).toContain("declare module '*/routeTree.gen'");
    });
  });

  describe('python framework', () => {
    it('should create web app structure with apiClient instead of trpc/auth', async () => {
      await webGenerator(tree, { styling: 'tailwind', apiFramework: 'python' });

      expect(tree.exists('apps/web/src/main.tsx')).toBeTruthy();
      expect(tree.exists('apps/web/src/lib/apiClient.ts')).toBeTruthy();
      expect(tree.exists('apps/web/src/lib/api-schema.ts')).toBeTruthy();
      expect(tree.exists('apps/web/src/routes/__root.tsx')).toBeTruthy();
      expect(tree.exists('apps/web/index.html')).toBeTruthy();
      expect(tree.exists('apps/web/vite.config.ts')).toBeTruthy();
    });

    it('should NOT emit hono-only files in python mode', async () => {
      await webGenerator(tree, { styling: 'tailwind', apiFramework: 'python' });

      expect(tree.exists('apps/web/src/lib/trpc.ts')).toBeFalsy();
      expect(tree.exists('apps/web/src/lib/auth.ts')).toBeFalsy();
    });

    it('should create package.json without tRPC or better-auth', async () => {
      await webGenerator(tree, { styling: 'tailwind', apiFramework: 'python' });

      const content = tree.read('apps/web/package.json', 'utf-8')!;
      const pkg = JSON.parse(content);
      expect(pkg.dependencies).toHaveProperty('react');
      expect(pkg.dependencies).toHaveProperty('@tanstack/react-query');
      expect(pkg.dependencies).not.toHaveProperty('@trpc/client');
      expect(pkg.dependencies).not.toHaveProperty('@trpc/react-query');
      expect(pkg.dependencies).not.toHaveProperty('better-auth');
    });

    it('should include openapi-typescript as a devDep', async () => {
      await webGenerator(tree, { styling: 'tailwind', apiFramework: 'python' });

      const content = tree.read('apps/web/package.json', 'utf-8')!;
      const pkg = JSON.parse(content);
      expect(pkg.devDependencies).toHaveProperty('openapi-typescript');
    });

    it('should add a codegen script', async () => {
      await webGenerator(tree, { styling: 'tailwind', apiFramework: 'python' });

      const content = tree.read('apps/web/package.json', 'utf-8')!;
      const pkg = JSON.parse(content);
      expect(pkg.scripts).toHaveProperty('codegen');
      expect(pkg.scripts.codegen).toContain('openapi-typescript');
    });

    it('should proxy to localhost:8000 (FastAPI default)', async () => {
      await webGenerator(tree, { styling: 'tailwind', apiFramework: 'python' });

      const content = tree.read('apps/web/vite.config.ts', 'utf-8')!;
      expect(content).toContain('localhost:8000');
      expect(content).not.toContain('/trpc');
    });

    it('should emit .env.example with VITE_API_URL', async () => {
      await webGenerator(tree, { styling: 'tailwind', apiFramework: 'python' });

      expect(tree.exists('apps/web/.env.example')).toBeTruthy();
      const content = tree.read('apps/web/.env.example', 'utf-8')!;
      expect(content).toContain('VITE_API_URL=http://localhost:8000');
    });

    it('should NOT reference Login link in __root.tsx (no auth)', async () => {
      await webGenerator(tree, { styling: 'tailwind', apiFramework: 'python' });

      const content = tree.read('apps/web/src/routes/__root.tsx', 'utf-8')!;
      expect(content).not.toContain('Login');
    });
  });
});
