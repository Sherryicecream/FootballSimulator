import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import {
  assertRequiredDirectories,
  validateWorkspacePackageManifest,
} from '../src/workspace-policy.mjs';

const dependencySections = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

test('internal dependencies in every dependency section must use workspace:*', () => {
  for (const section of dependencySections) {
    assert.throws(
      () =>
        validateWorkspacePackageManifest({
          manifest: {
            name: '@football/simulation',
            private: true,
            [section]: { '@football/contracts': '^1.0.0' },
          },
          expectedName: '@football/simulation',
          allowedWorkspaceDependencies: ['@football/contracts'],
        }),
      new RegExp(`${section}.*workspace:\\*`),
      `${section} accepted a non-workspace internal dependency`,
    );
  }
});

test('peerDependencies and optionalDependencies cannot bypass dependency direction', () => {
  for (const section of ['peerDependencies', 'optionalDependencies']) {
    assert.throws(
      () =>
        validateWorkspacePackageManifest({
          manifest: {
            name: '@football/web',
            private: true,
            dependencies: {
              '@football/application': 'workspace:*',
              '@football/contracts': 'workspace:*',
            },
            [section]: { '@football/simulation': 'workspace:*' },
          },
          expectedName: '@football/web',
          allowedWorkspaceDependencies: ['@football/application', '@football/contracts'],
        }),
      /invalid workspace dependency/,
      `${section} bypassed the allowed dependency direction`,
    );
  }
});

test('simulation rejects external dependencies in every dependency section', () => {
  for (const section of dependencySections) {
    const manifest = {
      name: '@football/simulation',
      private: true,
      dependencies: { '@football/contracts': 'workspace:*' },
      [section]: { react: '^19.0.0' },
    };

    if (section === 'dependencies') {
      manifest.dependencies = {
        '@football/contracts': 'workspace:*',
        react: '^19.0.0',
      };
    }

    assert.throws(
      () =>
        validateWorkspacePackageManifest({
          manifest,
          expectedName: '@football/simulation',
          allowedWorkspaceDependencies: ['@football/contracts'],
        }),
      /may only depend on @football\/contracts/,
      `${section} allowed simulation to depend on React`,
    );
  }
});

test('required directory validation rejects a regular file', async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'football-architecture-'));

  try {
    await writeFile(join(temporaryRoot, 'required-path'), 'not a directory');

    await assert.rejects(
      assertRequiredDirectories(pathToFileURL(`${temporaryRoot}${sep}`), ['required-path']),
      /required path is not a directory: required-path/,
    );
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
});
