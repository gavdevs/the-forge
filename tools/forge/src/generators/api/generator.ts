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

export async function apiGenerator(
  tree: Tree,
  options: ApiGeneratorSchema,
): Promise<void> {
  const database = options.database ?? 'sqlite';

  // When called from CLI, targetDir is the absolute path to the generated project.
  // When called in tests, targetDir is omitted and we write to tree root.
  const projectRoot = options.targetDir ?? '.';
  const projectName = readProjectName(tree, projectRoot);

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
  updateDockerCompose(tree, projectRoot, database);

  // Create empty directories
  tree.write(joinPathFragments(projectRoot, 'apps/api/src/features/.gitkeep'), '');
  tree.write(joinPathFragments(projectRoot, 'apps/api/src/db/migrations/.gitkeep'), '');
  tree.write(joinPathFragments(projectRoot, 'apps/api/src/lib/.gitkeep'), '');

  // Generate optional features
  const optionals = options.optionalFeatures ?? [];
  for (const feature of optionals) {
    const optionalDir = joinPathFragments(generatorDir, `optional-${feature}`);
    generateFiles(tree, optionalDir, projectRoot, { database, projectName, template: '' });
  }

  // Add optional feature dependencies to package.json
  if (optionals.length > 0) {
    addOptionalDependencies(tree, projectRoot, optionals, database);
  }
}

function readProjectName(tree: Tree, projectRoot: string): string {
  const pkgPath = joinPathFragments(projectRoot, 'package.json');
  if (tree.exists(pkgPath)) {
    const pkg = readJson(tree, pkgPath);
    return pkg.name || 'my-app';
  }
  return 'my-app';
}

function updateDockerCompose(tree: Tree, projectRoot: string, database: string): void {
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

const OPTIONAL_DEPS: Record<string, { deps?: Record<string, string>; devDeps?: Record<string, string> }> = {
  ai: { deps: { 'ai': '*', '@ai-sdk/anthropic': '*' } },
  agents: { deps: { '@mastra/core': '*', '@mastra/engine': '*' } },
  payments: { deps: { '@polar-sh/sdk': '*' } },
  email: { deps: { 'resend': '*', '@react-email/components': '*' } },
  realtime: {},
  cron: { deps: { 'node-cron': '*' }, devDeps: { '@types/node-cron': '*' } },
  vector: {},
  observability: { deps: { '@opentelemetry/sdk-node': '*', '@opentelemetry/auto-instrumentations-node': '*', '@opentelemetry/exporter-trace-otlp-http': '*' } },
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
      pkg.dependencies = { ...pkg.dependencies, 'sqlite-vec': '^0.1.0' };
    }
  }

  tree.write(pkgPath, JSON.stringify(pkg, null, 2));
}

export default apiGenerator;
