import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from '@nx/devkit';
import { mobileGenerator } from './generator';

describe('mobile generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    tree.write('apps/.gitkeep', '');
    tree.write('package.json', JSON.stringify({ name: 'my-app' }));
  });

  it('should create mobile app structure', async () => {
    await mobileGenerator(tree, {});

    expect(tree.exists('apps/mobile/app.json')).toBeTruthy();
    expect(tree.exists('apps/mobile/src/lib/trpc.ts')).toBeTruthy();
    expect(tree.exists('apps/mobile/src/lib/auth.ts')).toBeTruthy();
    expect(tree.exists('apps/mobile/src/features/auth/LoginScreen.tsx')).toBeTruthy();
    expect(tree.exists('apps/mobile/src/features/auth/SignupScreen.tsx')).toBeTruthy();
  });

  it('should create package.json with correct dependencies', async () => {
    await mobileGenerator(tree, {});

    const content = tree.read('apps/mobile/package.json', 'utf-8')!;
    const pkg = JSON.parse(content);
    expect(pkg.dependencies).toHaveProperty('expo');
    expect(pkg.dependencies).toHaveProperty('react-native');
    expect(pkg.dependencies).toHaveProperty('nativewind');
    expect(pkg.dependencies).toHaveProperty('@trpc/client');
    expect(pkg.dependencies).toHaveProperty('@trpc/react-query');
  });

  it('should have empty features directory', async () => {
    await mobileGenerator(tree, {});

    expect(tree.exists('apps/mobile/src/features/.gitkeep')).toBeTruthy();
  });

  it('should not create Dockerfile', async () => {
    await mobileGenerator(tree, {});

    expect(tree.exists('apps/mobile/Dockerfile')).toBeFalsy();
  });
});
