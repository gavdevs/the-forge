import {
  Tree,
  generateFiles,
  joinPathFragments,
  readJson,
} from '@nx/devkit';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WebGeneratorSchema } from './schema';

const generatorDir = dirname(fileURLToPath(import.meta.url));

export async function webGenerator(
  tree: Tree,
  options: WebGeneratorSchema,
): Promise<void> {
  const styling = options.styling ?? 'tailwind';
  // Default to 'hono' for backwards compatibility — existing projects that
  // invoked `web --styling=tailwind` keep getting tRPC + Better Auth.
  const apiFramework = options.apiFramework ?? 'hono';
  const projectRoot = options.targetDir ?? '.';
  const projectName = readProjectName(tree, projectRoot);

  generateFiles(
    tree,
    joinPathFragments(generatorDir, 'files'),
    projectRoot,
    {
      styling,
      apiFramework,
      projectName,
      template: '',
    },
  );

  // The files/ tree contains both hono- and python-only templates. Drop the
  // ones that don't match the chosen framework so the generated project
  // doesn't ship dead imports.
  if (apiFramework === 'python') {
    for (const path of PYTHON_ONLY_REMOVALS) {
      tree.delete(joinPathFragments(projectRoot, path));
    }
  } else {
    for (const path of HONO_ONLY_REMOVALS) {
      tree.delete(joinPathFragments(projectRoot, path));
    }
  }

  // Create empty directories
  tree.write(joinPathFragments(projectRoot, 'apps/web/src/features/.gitkeep'), '');
  tree.write(joinPathFragments(projectRoot, 'apps/web/src/components/.gitkeep'), '');
  tree.write(joinPathFragments(projectRoot, 'apps/web/src/hooks/.gitkeep'), '');

  // Add web service to docker-compose.yml
  updateDockerCompose(tree, projectRoot);
}

/** Files emitted only when apiFramework is 'python'. Removed for 'hono'. */
const PYTHON_ONLY_REMOVALS: readonly string[] = [
  'apps/web/src/lib/trpc.ts',
  'apps/web/src/lib/auth.ts',
];

/** Files emitted only when apiFramework is 'hono'. Removed for 'python'. */
const HONO_ONLY_REMOVALS: readonly string[] = [
  'apps/web/src/lib/apiClient.ts',
  'apps/web/src/lib/api-schema.ts',
  'apps/web/.env.example',
];

function readProjectName(tree: Tree, projectRoot: string): string {
  const pkgPath = joinPathFragments(projectRoot, 'package.json');
  if (tree.exists(pkgPath)) {
    const pkg = readJson(tree, pkgPath);
    return pkg.name || 'my-app';
  }
  return 'my-app';
}

function updateDockerCompose(tree: Tree, projectRoot: string): void {
  const composePath = joinPathFragments(projectRoot, 'docker-compose.yml');
  const existing = tree.read(composePath, 'utf-8') ?? '';

  const webService = `  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "5173:5173"
    restart: unless-stopped
`;

  tree.write(composePath, existing + webService);
}

export default webGenerator;
