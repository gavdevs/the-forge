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

  // Desktop requires web app to exist
  const webPkgPath = joinPathFragments(projectRoot, 'apps/web/package.json');
  if (!tree.exists(webPkgPath)) {
    throw new Error('Desktop generator requires the web app to exist. Generate the web app first.');
  }

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
