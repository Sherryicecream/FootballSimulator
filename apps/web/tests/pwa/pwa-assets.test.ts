import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const webRoot = join(__dirname, '../..');

describe('PWA assets', () => {
  it('declares an installable manifest with app identity', () => {
    const manifest = JSON.parse(
      readFileSync(join(webRoot, 'public/manifest.webmanifest'), 'utf-8'),
    ) as Record<string, unknown>;
    expect(manifest.name).toBe('足球生涯模拟器');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect((manifest.icons as unknown[]).length).toBeGreaterThan(0);
  });

  it('ships a service worker that precaches the app shell', () => {
    const sw = readFileSync(join(webRoot, 'public/sw.js'), 'utf-8');
    expect(sw).toContain("addEventListener('install'");
    expect(sw).toContain("addEventListener('fetch'");
    expect(sw).toContain('/index.html');
  });

  it('links the manifest and theme color from the document head', () => {
    const html = readFileSync(join(webRoot, 'index.html'), 'utf-8');
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('theme-color');
    expect(html).toContain('/icon.svg');
  });

  it('registers the service worker only in production builds', () => {
    const source = readFileSync(join(webRoot, 'src/pwa/register-service-worker.ts'), 'utf-8');
    expect(source).toContain('import.meta.env.PROD');
    expect(source).toContain("'serviceWorker' in navigator");
  });
});
