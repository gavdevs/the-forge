import {
  Tree,
  generateFiles,
  joinPathFragments,
  readJson,
} from '@nx/devkit';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StaticGeneratorSchema } from './schema';

const generatorDir = dirname(fileURLToPath(import.meta.url));

export async function staticGenerator(
  tree: Tree,
  options: StaticGeneratorSchema,
): Promise<void> {
  const database = options.database ?? 'sqlite';
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

  // Create empty directories
  tree.write(joinPathFragments(projectRoot, 'apps/static/src/components/.gitkeep'), '');

  // Add static service to docker-compose.yml
  updateDockerCompose(tree, projectRoot, database);
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
  const existing = tree.read(composePath, 'utf-8') ?? '';

  const staticService = `  static:
    build:
      context: .
      dockerfile: apps/static/Dockerfile
    ports:
      - "4321:4321"
${database === 'sqlite' ? '    volumes:\n      - ./data:/app/data\n' : ''}    restart: unless-stopped
`;

  tree.write(composePath, existing + staticService);
}

export default staticGenerator;
