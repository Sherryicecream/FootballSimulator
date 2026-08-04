import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../../${path}`, import.meta.url), 'utf8');

test('root package exposes architecture verification commands', async () => {
  const rootPackage = JSON.parse(await read('package.json'));

  assert.equal(rootPackage.private, true);
  assert.equal(rootPackage.packageManager, 'pnpm@11.9.0');
  assert.equal(rootPackage.engines.node, '>=24.16.0');
  assert.equal(
    rootPackage.scripts['test:architecture'],
    'node --test tools/architecture/tests/repository-config.test.mjs tools/architecture/tests/workspace-policy.test.mjs tools/architecture/tests/workspace-structure.test.mjs',
  );
  assert.equal(rootPackage.scripts.lint, 'eslint . --max-warnings=0');
});

test('workspace includes apps, packages, and tools', async () => {
  const workspace = await read('pnpm-workspace.yaml');

  assert.match(workspace, /- 'apps\/\*'/);
  assert.match(workspace, /- 'packages\/\*'/);
  assert.match(workspace, /- 'tools\/\*'/);
});

test('local and generated artifacts are ignored', async () => {
  const gitignore = await read('.gitignore');

  for (const ignored of [
    '.worktrees/',
    '.superpowers/',
    'node_modules/',
    'dist/',
    'coverage/',
    '.env',
    '.env.*',
    '!.env.example',
    'reports/balance/',
  ]) {
    assert.ok(gitignore.includes(ignored), `missing ignore rule: ${ignored}`);
  }
});
