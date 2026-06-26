import { describe, expect, it } from 'vitest';
import { resolveOptions } from './prompts';

describe('resolveOptions (non-interactive)', () => {
  it('returns full options from flags with sensible defaults', async () => {
    const r = await resolveOptions(
      'my-app',
      {
        apps: ['api'],
        backendFramework: 'hono',
        database: 'postgres',
        styling: 'panda',
        optionalFeatures: ['ai', 'realtime'],
      },
      true,
    );
    expect(r).toEqual({
      name: 'my-app',
      projectType: 'standalone',
      apps: ['api'],
      backendFramework: 'hono',
      database: 'postgres',
      styling: 'panda',
      optionalFeatures: ['ai', 'realtime'],
    });
  });

  it('defaults projectType, database, backendFramework, styling when omitted', async () => {
    const r = await resolveOptions('my-app', { apps: ['api'] }, true);
    expect(r).not.toBeNull();
    expect(r?.projectType).toBe('standalone');
    expect(r?.database).toBe('sqlite');
    expect(r?.backendFramework).toBe('hono');
    expect(r?.styling).toBe('tailwind');
    expect(r?.optionalFeatures).toEqual([]);
  });

  it('accepts comma-separated apps', async () => {
    const r = await resolveOptions('my-app', { apps: ['api,web,desktop'] }, true);
    expect(r?.apps).toEqual(['api', 'web', 'desktop']);
  });

  it('auto-adds web when desktop is requested alone', async () => {
    const r = await resolveOptions('my-app', { apps: ['desktop'] }, true);
    expect(r?.apps).toEqual(['desktop', 'web']);
  });

  it('returns null with usage error when name is missing in non-interactive mode', async () => {
    const r = await resolveOptions(undefined, { apps: ['api'] }, true);
    expect(r).toBeNull();
  });

  it('returns null with usage error when apps is missing in non-interactive mode', async () => {
    const r = await resolveOptions('my-app', {}, true);
    expect(r).toBeNull();
  });

  it('returns null with usage error when apps is empty', async () => {
    const r = await resolveOptions('my-app', { apps: [] }, true);
    expect(r).toBeNull();
  });

  it('returns null for unknown app', async () => {
    const r = await resolveOptions('my-app', { apps: ['bogus'] }, true);
    expect(r).toBeNull();
  });

  it('returns null for unknown feature', async () => {
    const r = await resolveOptions(
      'my-app',
      { apps: ['api'], backendFramework: 'hono', optionalFeatures: ['bogus'] },
      true,
    );
    expect(r).toBeNull();
  });

  it('rejects invalid project names', async () => {
    expect(await resolveOptions('MyApp', { apps: ['api'] }, true)).toBeNull();
    expect(await resolveOptions('my app', { apps: ['api'] }, true)).toBeNull();
    expect(await resolveOptions('my_app', { apps: ['api'] }, true)).toBeNull();
  });

  it('does not apply features when framework is python', async () => {
    // Features are silently dropped — Python backend doesn't support them
    const r = await resolveOptions(
      'my-app',
      {
        apps: ['api'],
        backendFramework: 'python',
        optionalFeatures: ['ai', 'realtime'],
      },
      true,
    );
    expect(r?.optionalFeatures).toEqual([]);
  });

  it('does not require backendFramework when api is not in apps', async () => {
    const r = await resolveOptions('my-app', { apps: ['web'] }, true);
    expect(r?.backendFramework).toBe('hono');
  });

  it('Python full config', async () => {
    const r = await resolveOptions(
      'py-svc',
      { apps: ['api'], backendFramework: 'python', database: 'sqlite' },
      true,
    );
    expect(r).toEqual({
      name: 'py-svc',
      projectType: 'standalone',
      apps: ['api'],
      backendFramework: 'python',
      database: 'sqlite',
      styling: 'tailwind',
      optionalFeatures: [],
    });
  });

  it('Open-source + api + features', async () => {
    const r = await resolveOptions(
      'launcher',
      {
        projectType: 'open-source',
        apps: ['api'],
        backendFramework: 'hono',
        styling: 'panda',
        optionalFeatures: ['ai'],
      },
      true,
    );
    expect(r?.projectType).toBe('open-source');
    expect(r?.apps).toEqual(['api']);
    expect(r?.styling).toBe('panda');
    expect(r?.optionalFeatures).toEqual(['ai']);
  });
});
