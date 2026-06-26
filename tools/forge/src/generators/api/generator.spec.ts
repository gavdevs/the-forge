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
    expect(tree.exists('apps/api/AGENTS.md')).toBeTruthy();
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

  // Optional feature tests
  it('should create AI feature files when ai is selected', async () => {
    await apiGenerator(tree, { database: 'sqlite', optionalFeatures: ['ai'] });

    expect(tree.exists('apps/api/src/features/ai/router.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/features/ai/service.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/features/ai/types.ts')).toBeTruthy();

    const content = tree.read('apps/api/package.json', 'utf-8')!;
    const pkg = JSON.parse(content);
    expect(pkg.dependencies).toHaveProperty('ai');
  });

  it('should create email feature files when email is selected', async () => {
    await apiGenerator(tree, { database: 'sqlite', optionalFeatures: ['email'] });

    expect(tree.exists('apps/api/src/features/email/router.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/features/email/service.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/features/email/templates/Welcome.tsx')).toBeTruthy();

    const content = tree.read('apps/api/package.json', 'utf-8')!;
    const pkg = JSON.parse(content);
    expect(pkg.dependencies).toHaveProperty('resend');
  });

  it('should create realtime feature files when realtime is selected', async () => {
    await apiGenerator(tree, { database: 'sqlite', optionalFeatures: ['realtime'] });

    expect(tree.exists('apps/api/src/features/realtime/websocket.ts')).toBeTruthy();
  });

  it('should create cron feature files when cron is selected', async () => {
    await apiGenerator(tree, { database: 'sqlite', optionalFeatures: ['cron'] });

    expect(tree.exists('apps/api/src/features/cron/scheduler.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/features/cron/jobs/example.ts')).toBeTruthy();

    const content = tree.read('apps/api/package.json', 'utf-8')!;
    const pkg = JSON.parse(content);
    expect(pkg.dependencies).toHaveProperty('node-cron');
  });

  it('should create vector search files when vector is selected', async () => {
    await apiGenerator(tree, { database: 'sqlite', optionalFeatures: ['vector'] });

    expect(tree.exists('apps/api/src/db/vector.ts')).toBeTruthy();
  });

  it('should create observability files when observability is selected', async () => {
    await apiGenerator(tree, { database: 'sqlite', optionalFeatures: ['observability'] });

    expect(tree.exists('apps/api/src/lib/telemetry.ts')).toBeTruthy();

    const content = tree.read('apps/api/package.json', 'utf-8')!;
    const pkg = JSON.parse(content);
    expect(pkg.dependencies).toHaveProperty('@opentelemetry/sdk-node');
  });

  it('should handle multiple optional features', async () => {
    await apiGenerator(tree, { database: 'sqlite', optionalFeatures: ['ai', 'cron', 'observability'] });

    expect(tree.exists('apps/api/src/features/ai/router.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/features/cron/scheduler.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/lib/telemetry.ts')).toBeTruthy();
  });
});

describe('api generator: framework python', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    tree.write('apps/.gitkeep', '');
    tree.write('docker-compose.yml', 'services: {}\n');
  });

  it('should create the python app structure', async () => {
    await apiGenerator(tree, { framework: 'python', database: 'sqlite' });

    expect(tree.exists('apps/api/pyproject.toml')).toBeTruthy();
    expect(tree.exists('apps/api/project.json')).toBeTruthy();
    expect(tree.exists('apps/api/src/app/main.py')).toBeTruthy();
    expect(tree.exists('apps/api/src/app/config.py')).toBeTruthy();
    expect(tree.exists('apps/api/src/app/db.py')).toBeTruthy();
    expect(tree.exists('apps/api/src/app/models/base.py')).toBeTruthy();
    expect(tree.exists('apps/api/src/app/models/item.py')).toBeTruthy();
    expect(tree.exists('apps/api/src/app/schemas/item.py')).toBeTruthy();
    expect(tree.exists('apps/api/src/app/routers/items.py')).toBeTruthy();
    expect(tree.exists('apps/api/alembic/env.py')).toBeTruthy();
    expect(tree.exists('apps/api/alembic/versions/0001_create_items.py')).toBeTruthy();
    expect(tree.exists('apps/api/alembic/script.py.mako')).toBeTruthy();
    expect(tree.exists('apps/api/tests/conftest.py')).toBeTruthy();
    expect(tree.exists('apps/api/tests/test_health.py')).toBeTruthy();
    expect(tree.exists('apps/api/tests/test_items.py')).toBeTruthy();
    expect(tree.exists('apps/api/Dockerfile')).toBeTruthy();
    expect(tree.exists('apps/api/.env.example')).toBeTruthy();
    expect(tree.exists('apps/api/README.md')).toBeTruthy();
    expect(tree.exists('apps/api/AGENTS.md')).toBeTruthy();
  });

  it('should not create hono/drizzle files', async () => {
    await apiGenerator(tree, { framework: 'python', database: 'sqlite' });

    expect(tree.exists('apps/api/src/index.ts')).toBeFalsy();
    expect(tree.exists('apps/api/package.json')).toBeFalsy();
    expect(tree.exists('apps/api/src/db/schema.ts')).toBeFalsy();
  });

  it('should declare fastapi/sqlalchemy/alembic deps in pyproject.toml', async () => {
    await apiGenerator(tree, { framework: 'python', database: 'sqlite' });

    const content = tree.read('apps/api/pyproject.toml', 'utf-8')!;
    expect(content).toContain('fastapi');
    expect(content).toContain('sqlalchemy[asyncio]');
    expect(content).toContain('alembic');
    expect(content).toContain('pydantic-settings');
    expect(content).toContain('uvicorn[standard]');
  });

  it('should use the sqlite driver (aiosqlite) for sqlite', async () => {
    await apiGenerator(tree, { framework: 'python', database: 'sqlite' });

    const pyproject = tree.read('apps/api/pyproject.toml', 'utf-8')!;
    expect(pyproject).toContain('aiosqlite');
    expect(pyproject).not.toContain('asyncpg');

    const envExample = tree.read('apps/api/.env.example', 'utf-8')!;
    expect(envExample).toContain('sqlite+aiosqlite');
    expect(envExample).not.toContain('postgresql+asyncpg');
  });

  it('should use the postgres driver (asyncpg) for postgres', async () => {
    await apiGenerator(tree, { framework: 'python', database: 'postgres' });

    const pyproject = tree.read('apps/api/pyproject.toml', 'utf-8')!;
    expect(pyproject).toContain('asyncpg');
    expect(pyproject).not.toContain('aiosqlite');

    const envExample = tree.read('apps/api/.env.example', 'utf-8')!;
    expect(envExample).toContain('postgresql+asyncpg');
    expect(envExample).not.toContain('sqlite+aiosqlite');
  });

  it('should define Nx targets in project.json', async () => {
    await apiGenerator(tree, { framework: 'python', database: 'sqlite' });

    const content = tree.read('apps/api/project.json', 'utf-8')!;
    const project = JSON.parse(content);
    expect(project.name).toMatch(/-api$/);
    expect(project.targets).toHaveProperty('serve');
    expect(project.targets.serve.options.command).toContain('uvicorn');
    expect(project.targets).toHaveProperty('test');
    expect(project.targets.test.options.command).toContain('pytest');
    expect(project.targets).toHaveProperty('migrate');
    expect(project.targets.migrate.options.command).toContain('alembic upgrade head');
  });

  it('should write alembic script.py.mako verbatim (mako interpolation intact)', async () => {
    await apiGenerator(tree, { framework: 'python', database: 'sqlite' });

    const mako = tree.read('apps/api/alembic/script.py.mako', 'utf-8')!;
    const O = '$' + '{';
    expect(mako).toContain(`${O}message`);
    expect(mako).toContain(`${O}revision`);
    expect(mako).toContain('def upgrade');
    expect(mako).toContain('def downgrade');
  });

  it('should add the api service to docker-compose.yml with port 8000', async () => {
    await apiGenerator(tree, { framework: 'python', database: 'sqlite' });

    const content = tree.read('docker-compose.yml', 'utf-8')!;
    expect(content).toContain('api:');
    expect(content).toContain('8000:8000');
  });

  it('should use the explicit projectName for the python package name (no my-app fallback)', async () => {
    await apiGenerator(tree, {
      framework: 'python',
      database: 'sqlite',
      projectName: 'open-plate',
    });

    const pyproject = tree.read('apps/api/pyproject.toml', 'utf-8')!;
    expect(pyproject).toContain('name = "open-plate-api"');
    expect(pyproject).not.toContain('name = "my-app-api"');
  });

  it('should import StaticPool from sqlalchemy.pool (not sqlalchemy.ext.asyncio)', async () => {
    await apiGenerator(tree, { framework: 'python', database: 'sqlite' });

    const conftest = tree.read('apps/api/tests/conftest.py', 'utf-8')!;
    expect(conftest).toContain('from sqlalchemy.pool import StaticPool');
    expect(conftest).not.toContain('from sqlalchemy.ext.asyncio import StaticPool');
  });
});
