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
  'packages/content/data/regions',
  'packages/content/data/clubs',
  'packages/content/data/competitions',
  'packages/content/data/person-archetypes',
  'packages/content/data/events/china-youth',
  'packages/content/data/events/dressing-room',
  'packages/content/data/events/off-pitch',
  'packages/content/data/events/asia-career',
  'packages/content/data/events/europe-career',
  'packages/content/data/events/national-team',
  'packages/content/data/templates',
];

test('required domain directories exist', async () => {
  await Promise.all(
    requiredDirectories.map((directory) =>
      access(new URL(`../../../${directory}`, import.meta.url)),
    ),
  );
});

test('generic dumping-ground directories are forbidden', async () => {
  const forbidden = ['utils', 'helpers', 'common', 'shared'];

  for (const directory of requiredDirectories) {
    assert.equal(
      forbidden.includes(directory.split('/').at(-1)),
      false,
      `generic directory is not allowed: ${directory}`,
    );
  }
});
