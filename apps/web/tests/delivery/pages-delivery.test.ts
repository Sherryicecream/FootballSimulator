import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = join(__dirname, '../../../..');

describe('GitHub Pages delivery', () => {
  it('defines a Pages workflow with the required permissions and build path', () => {
    const workflowPath = join(repositoryRoot, '.github/workflows/deploy-pages.yml');
    expect(existsSync(workflowPath)).toBe(true);
    const workflow = readFileSync(workflowPath, 'utf-8');

    expect(workflow).toContain('actions/checkout@v6');
    expect(workflow).toContain('pnpm/action-setup@v4');
    expect(workflow).toContain('actions/setup-node@v4');
    expect(workflow).toContain('actions/configure-pages@v5');
    expect(workflow).toContain('actions/upload-pages-artifact@v4');
    expect(workflow).toContain('actions/deploy-pages@v4');
    expect(workflow).toContain('pnpm install --frozen-lockfile');
    expect(workflow).toContain('VITE_BASE_PATH: /${{ github.event.repository.name }}/');
    expect(workflow).toContain('path: apps/web/dist');
    expect(workflow).toContain('pages: write');
    expect(workflow).toContain('id-token: write');
  });

  it('documents desktop and Android installation paths', () => {
    const installationPath = join(repositoryRoot, 'docs/INSTALLATION.md');
    expect(existsSync(installationPath)).toBe(true);
    const installation = readFileSync(installationPath, 'utf-8');

    expect(installation).toContain('GitHub Pages');
    expect(installation).toContain('启动足球模拟器.cmd');
    expect(installation).toContain('pnpm dev:lan');
    expect(installation).toContain('Android');
    expect(installation).toContain('同一 Wi-Fi');
  });

  it('links the installation guide from the release notes', () => {
    const releaseNotes = readFileSync(join(repositoryRoot, 'docs/RELEASE_NOTES-v1.md'), 'utf-8');
    expect(releaseNotes).toContain('docs/INSTALLATION.md');
    expect(releaseNotes).toContain('GitHub Pages');
  });
});
