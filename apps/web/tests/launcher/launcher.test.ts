import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = join(__dirname, '../../../..');
const launcherPath = join(repositoryRoot, '启动足球模拟器.cmd');

describe('Windows launcher', () => {
  it('exposes a LAN development script without changing the default dev script', () => {
    const packageJson = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf-8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.dev).toBe('pnpm --filter @football/web exec vite');
    expect(packageJson.scripts?.['dev:lan']).toBe(
      'pnpm --filter @football/web exec vite --host 0.0.0.0',
    );
  });

  it('contains a safe double-click entry point for local and phone access', () => {
    expect(existsSync(launcherPath)).toBe(true);
    const source = readFileSync(launcherPath, 'utf-8');

    expect(source).toContain('@echo off');
    expect(source).toContain('cd /d "%~dp0"');
    expect(source).toContain('where node');
    expect(source).toContain('where pnpm');
    expect(source).toContain('pnpm install --frozen-lockfile');
    expect(source).toContain('pnpm dev:lan');
    expect(source).toContain('http://127.0.0.1:5173/');
    expect(source).toContain('LAN_IP');
    expect(source).not.toMatch(/firewall|local-ai|localStorage/i);
  });
});
