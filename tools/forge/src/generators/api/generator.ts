import {
  Tree,
  generateFiles,
  joinPathFragments,
  readJson,
} from '@nx/devkit';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ApiGeneratorSchema } from './schema';

const generatorDir = dirname(fileURLToPath(import.meta.url));

/**
 * Default SQLAlchemy async DATABASE_URL for each supported engine.
 * Used by the Python framework in config.py and .env.example.
 */
function defaultDatabaseUrl(database: string, projectName: string): string {
  if (database === 'postgres') {
    return `postgresql+asyncpg://user:password@localhost:5432/${projectName}`;
  }
  return `sqlite+aiosqlite:///./data/${projectName}.db`;
}

/** Async DB driver package added to pyproject deps for the Python framework. */
function dbDriverPackage(database: string): string {
  return database === 'postgres' ? 'asyncpg' : 'aiosqlite';
}

export async function apiGenerator(
  tree: Tree,
  options: ApiGeneratorSchema,
): Promise<void> {
  const database = options.database ?? 'sqlite';
  const framework = options.framework ?? 'hono';

  // When called from CLI, targetDir is the absolute path to the generated project.
  // When called in tests, targetDir is omitted and we write to tree root.
  const projectRoot = options.targetDir ?? '.';
  const projectName = readProjectName(tree, projectRoot);

  if (framework === 'python') {
    return apiGeneratorPython(tree, { database, projectRoot, projectName });
  }
  return apiGeneratorHono(tree, {
    database,
    projectRoot,
    projectName,
    optionalFeatures: options.optionalFeatures ?? [],
  });
}

function apiGeneratorHono(
  tree: Tree,
  opts: {
    database: string;
    projectRoot: string;
    projectName: string;
    optionalFeatures: string[];
  },
): void {
  const { database, projectRoot, projectName, optionalFeatures } = opts;

  generateFiles(
    tree,
    joinPathFragments(generatorDir, 'files'),
    projectRoot,
    {
      database,
      projectName,
      template: '',
    },
  );

  // Add API service to docker-compose.yml
  updateDockerComposeHono(tree, projectRoot, database);

  // Create empty directories
  tree.write(joinPathFragments(projectRoot, 'apps/api/src/features/.gitkeep'), '');
  tree.write(joinPathFragments(projectRoot, 'apps/api/src/db/migrations/.gitkeep'), '');
  tree.write(joinPathFragments(projectRoot, 'apps/api/src/lib/.gitkeep'), '');

  // Generate optional features
  for (const feature of optionalFeatures) {
    const optionalDir = joinPathFragments(generatorDir, `optional-${feature}`);
    generateFiles(tree, optionalDir, projectRoot, { database, projectName, template: '' });
  }

  // Add optional feature dependencies to package.json
  if (optionalFeatures.length > 0) {
    addOptionalDependencies(tree, projectRoot, optionalFeatures, database);
  }
}

function apiGeneratorPython(
  tree: Tree,
  opts: { database: string; projectRoot: string; projectName: string },
): void {
  const { database, projectRoot, projectName } = opts;
  const dbUrl = defaultDatabaseUrl(database, projectName);
  const dbDriver = dbDriverPackage(database);

  generateFiles(
    tree,
    joinPathFragments(generatorDir, 'files-python'),
    projectRoot,
    {
      database,
      projectName,
      dbDriver,
      dbUrl,
      template: '',
    },
  );

  // Alembic's script.py.mako contains `${...}` and `<% %>` control blocks that
  // would collide with EJS templating in generateFiles, so write it verbatim.
  writeAlembicMako(tree, projectRoot);

  // Add the Python API service to docker-compose.yml
  updateDockerComposePython(tree, projectRoot, database);
}

function readProjectName(tree: Tree, projectRoot: string): string {
  const pkgPath = joinPathFragments(projectRoot, 'package.json');
  if (tree.exists(pkgPath)) {
    const pkg = readJson(tree, pkgPath);
    return pkg.name || 'my-app';
  }
  return 'my-app';
}

function writeAlembicMako(tree: Tree, projectRoot: string): void {
  const makoPath = joinPathFragments(projectRoot, 'apps/api/alembic/script.py.mako');
  // Alembic's script.py.mako uses ${...} mako interpolation. The `${` prefix
  // is assembled from parts so no string literal contains the sequence
  // (which linters flag).
  const O = '$' + '{';
  const lines = [
    `"""${O}message}`,
    '',
    `Revision ID: ${O}revision}`,
    `Revises: ${O}down_revision | comma,n}`,
    `Create Date: ${O}creates date stamp}`,
    '',
    '"""',
    'from typing import Sequence, Union',
    '',
    'from alembic import op',
    'import sqlalchemy as sa',
    `${O}imports if imports else ""}`,
    '',
    '# revision identifiers, used by Alembic.',
    `revision: str = ${O}revision}`,
    `down_revision: Union[str, None] = ${O}down_revision}`,
    `branch_labels: Union[str, Sequence[str], None] = ${O}branch_labels}`,
    `depends_on: Union[str, Sequence[str], None] = ${O}depends_on}`,
    '',
    '',
    'def upgrade() -> None:',
    `    ${O}upgrades if upgrades else "pass"}`,
    '',
    '',
    'def downgrade() -> None:',
    `    ${O}downgrades if downgrades else "pass"}`,
    '',
  ];
  tree.write(makoPath, lines.join('\n'));
}

function updateDockerComposeHono(tree: Tree, projectRoot: string, database: string): void {
  const composePath = joinPathFragments(projectRoot, 'docker-compose.yml');

  const apiService = `services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "3000:3000"
${database === 'sqlite' ? '    volumes:\n      - ./data:/app/data\n' : ''}    restart: unless-stopped
`;

  tree.write(composePath, apiService);
}

function updateDockerComposePython(tree: Tree, projectRoot: string, database: string): void {
  const composePath = joinPathFragments(projectRoot, 'docker-compose.yml');
  const existing = tree.read(composePath, 'utf-8') ?? '';

  const volumes =
    database === 'sqlite'
      ? '    volumes:\n      - ./data:/app/data\n'
      : '';

  const service = `  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "8000:8000"
${volumes}    restart: unless-stopped
`;

  tree.write(composePath, existing + service);
}

const OPTIONAL_DEPS: Record<string, { deps?: Record<string, string>; devDeps?: Record<string, string> }> = {
  ai: { deps: { 'ai': 'latest', '@ai-sdk/anthropic': 'latest' } },
  agents: { deps: { '@mastra/core': 'latest', '@mastra/engine': 'latest' } },
  payments: { deps: { '@polar-sh/sdk': 'latest' } },
  email: { deps: { 'resend': 'latest', 'react-email': 'latest' } },
  realtime: {},
  cron: { deps: { 'node-cron': 'latest' }, devDeps: { '@types/node-cron': 'latest' } },
  vector: {},
  observability: { deps: { '@opentelemetry/sdk-node': 'latest', '@opentelemetry/auto-instrumentations-node': 'latest', '@opentelemetry/exporter-trace-otlp-http': 'latest' } },
};

function addOptionalDependencies(tree: Tree, projectRoot: string, optionals: string[], database: string): void {
  const pkgPath = joinPathFragments(projectRoot, 'apps/api/package.json');
  const content = tree.read(pkgPath, 'utf-8');
  if (!content) return;

  const pkg = JSON.parse(content);

  for (const feature of optionals) {
    const config = OPTIONAL_DEPS[feature];
    if (!config) continue;

    if (config.deps) {
      pkg.dependencies = { ...pkg.dependencies, ...config.deps };
    }
    if (config.devDeps) {
      pkg.devDependencies = { ...pkg.devDependencies, ...config.devDeps };
    }

    // Special case: vector depends on database choice
    if (feature === 'vector' && database === 'sqlite') {
      pkg.dependencies = { ...pkg.dependencies, 'sqlite-vec': 'latest' };
    }
  }

  tree.write(pkgPath, JSON.stringify(pkg, null, 2));
}

export default apiGenerator;
