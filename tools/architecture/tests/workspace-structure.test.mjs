import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

import {
  assertRequiredDirectories,
  validateWorkspacePackageManifest,
} from '../src/workspace-policy.mjs';

const repositoryRoot = new URL('../../../', import.meta.url);

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
  '@football/web': ['@football/application', '@football/content', '@football/contracts'],
  '@football/local-ai': ['@football/contracts'],
  '@football/contracts': [],
  '@football/simulation': ['@football/contracts'],
  '@football/application': ['@football/contracts', '@football/simulation'],
  '@football/content': ['@football/contracts'],
  '@football/balance': [
    '@football/application',
    '@football/content',
    '@football/contracts',
    '@football/simulation',
  ],
  '@football/architecture': [],
};

const readPackage = async (path) =>
  JSON.parse(await readFile(new URL(`../../../${path}`, import.meta.url), 'utf8'));

test('workspace package names and dependency directions are valid', async () => {
  for (const [expectedName, path] of Object.entries(packages)) {
    const manifest = await readPackage(path);
    validateWorkspacePackageManifest({
      manifest,
      expectedName,
      allowedWorkspaceDependencies: allowedWorkspaceDependencies[expectedName],
    });
  }
});

const requiredDirectories = [
  'apps/web/src/app',
  'apps/web/src/career-creation',
  'apps/web/src/career-dashboard',
  'apps/web/src/event-choice',
  'apps/web/src/match-moment',
  'apps/web/src/retirement-review',
  'apps/web/src/design-system',
  'apps/web/src/persistence',
  'apps/web/src/narration',
  'apps/local-ai/src/server',
  'apps/local-ai/src/providers',
  'apps/local-ai/src/prompts',
  'apps/local-ai/src/validation',
  'packages/simulation/src/career',
  'packages/simulation/src/player-development',
  'packages/simulation/src/match',
  'packages/simulation/src/club-career',
  'packages/simulation/src/transfer-market',
  'packages/simulation/src/health',
  'packages/simulation/src/relationships',
  'packages/simulation/src/national-team',
  'packages/simulation/src/world',
  'packages/simulation/src/events',
  'packages/simulation/src/randomness',
  'packages/simulation/src/evaluation',
  'packages/application/src/use-cases',
  'packages/application/src/ports',
  'packages/content/data',
  'packages/content/data/clubs',
  'packages/content/data/events',
];

test('required domain directories exist', async () => {
  await assertRequiredDirectories(repositoryRoot, requiredDirectories);
});

const architectureRoots = ['apps', 'packages', 'tools'];
const forbiddenDirectoryNames = new Set(['utils', 'helpers', 'common', 'shared']);

const findForbiddenDirectories = async (directory) => {
  const entries = await readdir(new URL(`../../../${directory}`, import.meta.url), {
    withFileTypes: true,
  });
  const nestedDirectories = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const nestedDirectory = `${directory}/${entry.name}`;

        if (forbiddenDirectoryNames.has(entry.name)) {
          return [nestedDirectory];
        }

        return findForbiddenDirectories(nestedDirectory);
      }),
  );

  return nestedDirectories.flat();
};

test('generic dumping-ground directories are forbidden', async () => {
  const forbiddenDirectories = (
    await Promise.all(architectureRoots.map(findForbiddenDirectories))
  ).flat();

  assert.deepEqual(
    forbiddenDirectories,
    [],
    `generic directories are not allowed: ${forbiddenDirectories.join(', ')}`,
  );
});
