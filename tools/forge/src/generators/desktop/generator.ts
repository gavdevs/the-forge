import {
  Tree,
  generateFiles,
  joinPathFragments,
  readJson,
} from '@nx/devkit';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DesktopGeneratorSchema } from './schema';

const generatorDir = dirname(fileURLToPath(import.meta.url));

export async function desktopGenerator(
  tree: Tree,
  options: DesktopGeneratorSchema,
): Promise<void> {
  const projectRoot = options.targetDir ?? '.';
  const projectName = readProjectName(tree, projectRoot);

  // Note: Desktop requires web app. The CLI validates this in prompts
  // and ensures web is generated before desktop.

  generateFiles(
    tree,
    joinPathFragments(generatorDir, 'files'),
    projectRoot,
    {
      projectName,
      template: '',
    },
  );

  // No Docker entry — desktop builds are native
}

function readProjectName(tree: Tree, projectRoot: string): string {
  const pkgPath = joinPathFragments(projectRoot, 'package.json');
  if (tree.exists(pkgPath)) {
    const pkg = readJson(tree, pkgPath);
    return pkg.name || 'my-app';
  }
  return 'my-app';
}

export default desktopGenerator;
