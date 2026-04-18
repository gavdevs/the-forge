import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from '@nx/devkit';
import { apiGenerator } from './generator';

describe('api generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    // Simulate a workspace that already exists
    tree.write('apps/.gitkeep', '');
    tree.write('docker-compose.yml', 'services: {}\n');
  });

  it('should create api app structure', async () => {
    await apiGenerator(tree, { database: 'sqlite' });

    expect(tree.exists('apps/api/src/index.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/trpc.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/middleware/auth.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/middleware/errorHandler.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/db/schema.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/auth/auth.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/auth/authSchema.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/auth/authRoutes.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/features/.gitkeep')).toBeTruthy();
  });

  it('should create package.json with correct dependencies', async () => {
    await apiGenerator(tree, { database: 'sqlite' });

    const content = tree.read('apps/api/package.json', 'utf-8')!;
    const pkg = JSON.parse(content);
    expect(pkg.dependencies).toHaveProperty('hono');
    expect(pkg.dependencies).toHaveProperty('@trpc/server');
    expect(pkg.dependencies).toHaveProperty('drizzle-orm');
    expect(pkg.dependencies).toHaveProperty('better-sqlite3');
    expect(pkg.dependencies).toHaveProperty('better-auth');
    expect(pkg.dependencies).toHaveProperty('zod');
  });

  it('should use postgres driver when database is postgres', async () => {
    await apiGenerator(tree, { database: 'postgres' });

    const content = tree.read('apps/api/package.json', 'utf-8')!;
    const pkg = JSON.parse(content);
    expect(pkg.dependencies).toHaveProperty('postgres');
    expect(pkg.dependencies).not.toHaveProperty('better-sqlite3');
  });

  it('should add service entry to docker-compose.yml', async () => {
    await apiGenerator(tree, { database: 'sqlite' });

    const content = tree.read('docker-compose.yml', 'utf-8')!;
    expect(content).toContain('api:');
    expect(content).toContain('3000:3000');
  });

  it('should create Dockerfile', async () => {
    await apiGenerator(tree, { database: 'sqlite' });

    expect(tree.exists('apps/api/Dockerfile')).toBeTruthy();
  });
});
