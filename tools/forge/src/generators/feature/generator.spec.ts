import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from '@nx/devkit';
import { featureGenerator } from './generator';

describe('feature generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    tree.write('apps/api/src/trpc.ts', 'export const appRouter = router({});');
    tree.write('apps/api/src/features/.gitkeep', '');
    tree.write('apps/web/src/features/.gitkeep', '');
    tree.write('apps/mobile/src/features/.gitkeep', '');
    tree.write('packages/shared/src/schemas/index.ts', 'export {};');
  });

  it('should create api feature files', async () => {
    await featureGenerator(tree, { name: 'users', apps: 'api' });

    expect(tree.exists('apps/api/src/features/users/router.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/features/users/service.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/features/users/service.test.ts')).toBeTruthy();
    expect(tree.exists('apps/api/src/features/users/types.ts')).toBeTruthy();
  });

  it('should create web feature files', async () => {
    await featureGenerator(tree, { name: 'users', apps: 'web' });

    expect(tree.exists('apps/web/src/features/users/UsersList.tsx')).toBeTruthy();
    expect(tree.exists('apps/web/src/features/users/useUsersActions.ts')).toBeTruthy();
    expect(tree.exists('apps/web/src/features/users/usersList.test.ts')).toBeTruthy();
  });

  it('should create mobile feature files', async () => {
    await featureGenerator(tree, { name: 'users', apps: 'mobile' });

    expect(tree.exists('apps/mobile/src/features/users/UsersList.tsx')).toBeTruthy();
    expect(tree.exists('apps/mobile/src/features/users/useUsersActions.ts')).toBeTruthy();
    expect(tree.exists('apps/mobile/src/features/users/usersList.test.ts')).toBeTruthy();
  });

  it('should handle multiple apps', async () => {
    await featureGenerator(tree, { name: 'users', apps: 'api,web,mobile' });

    expect(tree.exists('apps/api/src/features/users/router.ts')).toBeTruthy();
    expect(tree.exists('apps/web/src/features/users/UsersList.tsx')).toBeTruthy();
    expect(tree.exists('apps/mobile/src/features/users/UsersList.tsx')).toBeTruthy();
  });

  it('should add shared schema', async () => {
    await featureGenerator(tree, { name: 'users', apps: 'api' });

    expect(tree.exists('packages/shared/src/schemas/users.ts')).toBeTruthy();
  });

  it('should create desktop feature files when explicitly requested', async () => {
    tree.write('apps/desktop/src-tauri/src/lib.rs', '');

    await featureGenerator(tree, { name: 'files', apps: 'desktop' });

    expect(tree.exists('apps/desktop/src-tauri/src/commands/files.rs')).toBeTruthy();
  });

  it('should create static feature files', async () => {
    tree.write('apps/static/src/pages/.gitkeep', '');
    tree.write('apps/static/src/components/.gitkeep', '');

    await featureGenerator(tree, { name: 'users', apps: 'static' });

    expect(tree.exists('apps/static/src/pages/users/index.astro')).toBeTruthy();
    expect(tree.exists('apps/static/src/components/users/UsersIsland.tsx')).toBeTruthy();
  });
});
