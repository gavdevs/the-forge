import {
  Tree,
  generateFiles,
  joinPathFragments,
  readJson,
} from '@nx/devkit';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MobileGeneratorSchema } from './schema';

const generatorDir = dirname(fileURLToPath(import.meta.url));

export async function mobileGenerator(
  tree: Tree,
  options: MobileGeneratorSchema,
): Promise<void> {
  const projectRoot = options.targetDir ?? '.';
  const projectName = readProjectName(tree, projectRoot);

  generateFiles(
    tree,
    joinPathFragments(generatorDir, 'files'),
    projectRoot,
    {
      projectName,
      template: '',
    },
  );

  // Create empty directories
  tree.write(joinPathFragments(projectRoot, 'apps/mobile/src/features/.gitkeep'), '');
  tree.write(joinPathFragments(projectRoot, 'apps/mobile/src/components/.gitkeep'), '');
  tree.write(joinPathFragments(projectRoot, 'apps/mobile/src/hooks/.gitkeep'), '');

  // No Docker entry — mobile builds are native
}

function readProjectName(tree: Tree, projectRoot: string): string {
  const pkgPath = joinPathFragments(projectRoot, 'package.json');
  if (tree.exists(pkgPath)) {
    const pkg = readJson(tree, pkgPath);
    return pkg.name || 'my-app';
  }
  return 'my-app';
}

export default mobileGenerator;
