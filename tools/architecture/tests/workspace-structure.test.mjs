import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const packages = {
  '@football/web': 'apps/web/package.json',
  '@football/local-ai': 'apps/local-ai/package.json',
  '@football/contracts': 'packages/contracts/package.json',
  '@football/simulation': 'packages/simulation/package.json',
  '@football/application': 'packages/application/package.json',
  '@football/content': 'packages/content/package.json',
  '@football/balance': 'tools/balance/package.json',
  '@football/architecture': 'tools/architecture/package.json',
};

const allowedWorkspaceDependencies = {
  '@football/web': ['@football/application', '@football/contracts'],
  '@football/local-ai': ['@football/contracts'],
  '@football/contracts': [],
  '@football/simulation': ['@football/contracts'],
  '@football/application': ['@football/contracts', '@football/simulation'],
  '@football/content': ['@football/contracts'],
  '@football/balance': ['@football/content', '@football/simulation'],
  '@football/architecture': [],
};

const readPackage = async (path) =>
  JSON.parse(await readFile(new URL(`../../../${path}`, import.meta.url), 'utf8'));

test('workspace package names and dependency directions are valid', async () => {
  for (const [expectedName, path] of Object.entries(packages)) {
    const manifest = await readPackage(path);
    assert.equal(manifest.name, expectedName);
    assert.equal(manifest.private, true);

    const dependencies = {
      ...manifest.dependencies,
      ...manifest.devDependencies,
    };
    const workspaceDependencies = Object.keys(dependencies).filter((name) =>
      name.startsWith('@football/'),
    );

    assert.deepEqual(
      workspaceDependencies.sort(),
      allowedWorkspaceDependencies[expectedName].toSorted(),
      `${expectedName} has an invalid workspace dependency`,
    );
  }
});
