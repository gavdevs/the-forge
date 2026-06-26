import {
  Tree,
  generateFiles,
  joinPathFragments,
} from '@nx/devkit';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WorkspaceGeneratorSchema } from './schema';

const generatorDir = dirname(fileURLToPath(import.meta.url));
// Forge repo root: tools/forge/src/generators/workspace/ -> 5 levels up
const forgeRoot = resolve(generatorDir, '..', '..', '..', '..', '..');

export async function workspaceGenerator(
  tree: Tree,
  options: WorkspaceGeneratorSchema,
): Promise<void> {
  const projectType = options.projectType ?? 'standalone';
  const database = options.database ?? 'sqlite';
  const styling = options.styling ?? 'tailwind';

  // Determine output paths
  // Nx tree only supports relative paths — the CLI moves output to user's cwd after generation
  const isOpenSource = projectType === 'open-source';
  const wrapperDir = isOpenSource ? `${options.name}-wrapper` : null;
  const projectDir = isOpenSource
    ? joinPathFragments(wrapperDir!, options.name)
    : options.name;

  // Generate project files from templates
  generateFiles(
    tree,
    joinPathFragments(generatorDir, 'files'),
    projectDir,
    {
      name: options.name,
      database,
      styling,
      template: '',
    },
  );

  // Copy source packages (recursive, no hardcoded file list)
  copyDirectoryFromDisk(resolve(forgeRoot, 'packages/shared'), joinPathFragments(projectDir, 'packages/shared'), tree);
  copyDirectoryFromDisk(resolve(forgeRoot, 'packages/config'), joinPathFragments(projectDir, 'packages/config'), tree);

  // Copy the correct UI package variant based on styling choice
  const uiSource = styling === 'tailwind' ? 'packages/ui-tailwind' : 'packages/ui-panda';
  copyDirectoryFromDisk(resolve(forgeRoot, uiSource), joinPathFragments(projectDir, 'packages/ui'), tree);

  // Create tools/project-plugin (feature generator — real implementation copied in Task 15)
  createProjectPlugin(tree, projectDir, options.name);

  // Create empty apps directory
  tree.write(joinPathFragments(projectDir, 'apps/.gitkeep'), '');

  if (isOpenSource) {
    // Agentic file goes in wrapper, not in project
    copyFileFromDisk(resolve(forgeRoot, 'conventions/AGENTS.md'), joinPathFragments(wrapperDir!, 'AGENTS.md'), tree);
    moveFile(tree, joinPathFragments(projectDir, '.claude/settings.json'), joinPathFragments(wrapperDir!, '.claude/settings.json'));
  } else {
    // Agentic file in project root
    copyFileFromDisk(resolve(forgeRoot, 'conventions/AGENTS.md'), joinPathFragments(projectDir, 'AGENTS.md'), tree);
  }
}

/**
 * Recursively copy a directory from the real filesystem into the Nx virtual tree.
 * This avoids hardcoding file lists — any file added to the source package is automatically included.
 */
function copyDirectoryFromDisk(sourceDir: string, targetDir: string, tree: Tree): void {
  try {
    const entries = readdirSync(sourceDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules') continue;
      const sourcePath = resolve(sourceDir, entry.name);
      const targetPath = joinPathFragments(targetDir, entry.name);
      if (entry.isDirectory()) {
        copyDirectoryFromDisk(sourcePath, targetPath, tree);
      } else {
        const content = readFileSync(sourcePath, 'utf-8');
        tree.write(targetPath, content);
      }
    }
  } catch {
    // Source directory doesn't exist (e.g., during tests with virtual tree)
  }
}

/**
 * Copy a single file from the real filesystem into the Nx virtual tree.
 */
function copyFileFromDisk(sourcePath: string, targetPath: string, tree: Tree): void {
  try {
    const content = readFileSync(sourcePath, 'utf-8');
    tree.write(targetPath, content);
  } catch {
    tree.write(targetPath, `# ${basename(sourcePath)}\n\nSee forge conventions.\n`);
  }
}

function moveFile(tree: Tree, from: string, to: string): void {
  const content = tree.read(from, 'utf-8');
  if (content) {
    tree.write(to, content);
    tree.delete(from);
  }
}

function createProjectPlugin(tree: Tree, projectDir: string, projectName: string): void {
  const pluginDir = joinPathFragments(projectDir, 'tools/project-plugin');

  tree.write(
    joinPathFragments(pluginDir, 'package.json'),
    JSON.stringify(
      {
        name: `@${projectName}/project-plugin`,
        version: '0.0.0',
        private: true,
        type: 'module',
        generators: './generators.json',
      },
      null,
      2,
    ),
  );

  tree.write(
    joinPathFragments(pluginDir, 'generators.json'),
    JSON.stringify(
      {
        generators: {
          feature: {
            factory: './src/generators/feature/generator',
            schema: './src/generators/feature/schema.json',
            description: 'Generate a cross-app feature scaffold',
          },
        },
      },
      null,
      2,
    ),
  );

  // Copy real feature generator from forge into the project-plugin
  const featureGenSource = resolve(forgeRoot, 'tools/forge/src/generators/feature');
  copyDirectoryFromDisk(featureGenSource, joinPathFragments(pluginDir, 'src/generators/feature'), tree);
}

export default workspaceGenerator;
