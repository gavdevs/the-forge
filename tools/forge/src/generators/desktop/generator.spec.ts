import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from '@nx/devkit';
import { desktopGenerator } from './generator';

describe('desktop generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    tree.write('apps/.gitkeep', '');
    tree.write('package.json', JSON.stringify({ name: 'my-app' }));
    // Desktop requires web to exist
    tree.write('apps/web/package.json', JSON.stringify({ name: '@my-app/web' }));
  });

  it('should create desktop app structure', async () => {
    await desktopGenerator(tree, {});

    expect(tree.exists('apps/desktop/src-tauri/src/lib.rs')).toBeTruthy();
    expect(tree.exists('apps/desktop/src-tauri/tauri.conf.json')).toBeTruthy();
    expect(tree.exists('apps/desktop/src-tauri/Cargo.toml')).toBeTruthy();
    expect(tree.exists('apps/desktop/package.json')).toBeTruthy();
  });

  it('should point tauri devUrl at web dev server', async () => {
    await desktopGenerator(tree, {});

    const content = tree.read('apps/desktop/src-tauri/tauri.conf.json', 'utf-8')!;
    const config = JSON.parse(content);
    expect(config.build.devUrl).toBe('http://localhost:5173');
  });

  it('should not create Dockerfile', async () => {
    await desktopGenerator(tree, {});

    expect(tree.exists('apps/desktop/Dockerfile')).toBeFalsy();
  });
});
