import { describe, expect, it } from 'vitest';
import { parseArgs } from './prompts';

describe('parseArgs', () => {
  describe('positional name', () => {
    it('captures the first positional arg as the name', () => {
      const r = parseArgs(['my-app']);
      expect(r.positional).toBe('my-app');
      expect(r.flagsPresent).toBe(false);
      expect(r.nonInteractive).toBe(false);
    });

    it('ignores extra positionals', () => {
      expect(() => parseArgs(['my-app', 'extra'])).toThrow(/Unexpected positional/);
    });
  });

  describe('flag detection', () => {
    it('sets flagsPresent=true and nonInteractive=true when any flag is passed', () => {
      const r = parseArgs(['my-app', '--yes']);
      expect(r.flagsPresent).toBe(true);
      expect(r.nonInteractive).toBe(true);
    });

    it('--help sets showHelp', () => {
      const r = parseArgs(['--help']);
      expect(r.showHelp).toBe(true);
      expect(r.flagsPresent).toBe(true);
    });

    it('-h sets showHelp', () => {
      const r = parseArgs(['-h']);
      expect(r.showHelp).toBe(true);
    });
  });

  describe('--name', () => {
    it('accepts space-separated value', () => {
      const r = parseArgs(['--name', 'my-app']);
      expect(r.flags.name).toBe('my-app');
    });

    it('accepts equals-separated value', () => {
      const r = parseArgs(['--name=my-app']);
      expect(r.flags.name).toBe('my-app');
    });

    it('throws when value is missing', () => {
      expect(() => parseArgs(['--name'])).toThrow(/requires a value/);
      expect(() => parseArgs(['--name', '--apps', 'api'])).toThrow(/requires a value/);
    });
  });

  describe('--apps', () => {
    it('accepts space-separated list', () => {
      const r = parseArgs(['--apps', 'api', 'web', 'mobile']);
      expect(r.flags.apps).toEqual(['api', 'web', 'mobile']);
    });

    it('accepts comma-separated list', () => {
      const r = parseArgs(['--apps', 'api,web']);
      expect(r.flags.apps).toEqual(['api', 'web']);
    });

    it('concatenates across multiple --apps flags', () => {
      const r = parseArgs(['--apps', 'api', '--apps', 'web']);
      expect(r.flags.apps).toEqual(['api', 'web']);
    });

    it('accepts equals form', () => {
      const r = parseArgs(['--apps=api,web,mobile']);
      expect(r.flags.apps).toEqual(['api', 'web', 'mobile']);
    });
  });

  describe('--framework', () => {
    it('accepts hono and python', () => {
      expect(parseArgs(['--framework', 'hono']).flags.backendFramework).toBe('hono');
      expect(parseArgs(['--framework', 'python']).flags.backendFramework).toBe('python');
    });

    it('rejects unknown values', () => {
      expect(() => parseArgs(['--framework', 'ruby'])).toThrow(/Invalid --framework/);
    });
  });

  describe('--database', () => {
    it('accepts sqlite and postgres', () => {
      expect(parseArgs(['--database', 'sqlite']).flags.database).toBe('sqlite');
      expect(parseArgs(['--database', 'postgres']).flags.database).toBe('postgres');
    });

    it('rejects unknown values', () => {
      expect(() => parseArgs(['--database', 'mysql'])).toThrow(/Invalid --database/);
    });
  });

  describe('--styling', () => {
    it('accepts tailwind and panda', () => {
      expect(parseArgs(['--styling', 'tailwind']).flags.styling).toBe('tailwind');
      expect(parseArgs(['--styling', 'panda']).flags.styling).toBe('panda');
    });

    it('rejects unknown values', () => {
      expect(() => parseArgs(['--styling', 'css'])).toThrow(/Invalid --styling/);
    });
  });

  describe('--features', () => {
    it('accepts comma-separated list', () => {
      const r = parseArgs(['--features', 'ai,realtime']);
      expect(r.flags.optionalFeatures).toEqual(['ai', 'realtime']);
    });

    it('accepts space-separated list', () => {
      const r = parseArgs(['--features', 'ai', 'realtime', 'cron']);
      expect(r.flags.optionalFeatures).toEqual(['ai', 'realtime', 'cron']);
    });
  });

  describe('--project-type', () => {
    it('accepts standalone and open-source', () => {
      expect(parseArgs(['--project-type', 'standalone']).flags.projectType).toBe('standalone');
      expect(parseArgs(['--project-type', 'open-source']).flags.projectType).toBe('open-source');
    });

    it('rejects unknown values', () => {
      expect(() => parseArgs(['--project-type', 'mono'])).toThrow(/Invalid --project-type/);
    });
  });

  describe('--open-source shorthand', () => {
    it('sets projectType to open-source and openSource=true', () => {
      const r = parseArgs(['my-app', '--open-source']);
      expect(r.openSource).toBe(true);
      expect(r.flags.projectType).toBe('open-source');
    });

    it('does not override explicit --project-type', () => {
      const r = parseArgs(['--project-type', 'standalone', '--open-source']);
      expect(r.flags.projectType).toBe('standalone');
      expect(r.openSource).toBe(true);
    });
  });

  describe('unknown flags', () => {
    it('rejects unknown long flags', () => {
      expect(() => parseArgs(['--bogus'])).toThrow(/Unknown flag/);
    });

    it('rejects unknown short flags', () => {
      expect(() => parseArgs(['-x'])).toThrow(/Unknown flag/);
    });
  });

  describe('combined usage', () => {
    it('parses a full agent-style invocation', () => {
      const r = parseArgs([
        'launcher',
        '--apps',
        'api',
        'web',
        'mobile',
        '--framework',
        'python',
        '--database',
        'postgres',
        '--styling',
        'tailwind',
        '--features',
        'ai,realtime',
        '--open-source',
      ]);
      expect(r.positional).toBe('launcher');
      expect(r.flags.name).toBeUndefined();
      expect(r.flags.apps).toEqual(['api', 'web', 'mobile']);
      expect(r.flags.backendFramework).toBe('python');
      expect(r.flags.database).toBe('postgres');
      expect(r.flags.styling).toBe('tailwind');
      expect(r.flags.optionalFeatures).toEqual(['ai', 'realtime']);
      expect(r.flags.projectType).toBe('open-source');
      expect(r.nonInteractive).toBe(true);
    });
  });
});
