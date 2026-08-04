import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';

const dependencySections = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

const dependencyEntries = (manifest) =>
  dependencySections.flatMap((section) =>
    Object.entries(manifest[section] ?? {}).map(([name, range]) => ({ name, range, section })),
  );

export const validateWorkspacePackageManifest = ({
  manifest,
  expectedName,
  allowedWorkspaceDependencies,
}) => {
  assert.equal(manifest.name, expectedName);
  assert.equal(manifest.private, true);

  const entries = dependencyEntries(manifest);
  const workspaceEntries = entries.filter(({ name }) => name.startsWith('@football/'));

  for (const { name, range, section } of workspaceEntries) {
    assert.equal(
      range,
      'workspace:*',
      `${expectedName} ${section} dependency ${name} must use workspace:*`,
    );
  }

  const workspaceDependencyNames = [...new Set(workspaceEntries.map(({ name }) => name))];
  assert.deepEqual(
    workspaceDependencyNames.sort(),
    allowedWorkspaceDependencies.toSorted(),
    `${expectedName} has an invalid workspace dependency`,
  );

  if (expectedName !== '@football/simulation') {
    return;
  }

  const runtimeDependencies = Object.keys(manifest.dependencies ?? {});
  assert.deepEqual(
    runtimeDependencies.sort(),
    ['@football/contracts'],
    '@football/simulation may only depend on @football/contracts as runtime dependencies',
  );
};

export const assertRequiredDirectories = async (rootUrl, requiredDirectories) => {
  await Promise.all(
    requiredDirectories.map(async (directory) => {
      const fileStatus = await stat(new URL(directory, rootUrl));
      assert.ok(fileStatus.isDirectory(), `required path is not a directory: ${directory}`);
    }),
  );
};
