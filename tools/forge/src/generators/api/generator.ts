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

export default apiGenerator;
