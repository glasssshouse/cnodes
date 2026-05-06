#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const VALID_BUMPS = new Set([
  'major',
  'minor',
  'patch',
  'premajor',
  'preminor',
  'prepatch',
  'prerelease',
]);

const VALID_PREIDS = new Set(['alpha', 'beta', 'rc']);

export function computeNextVersion(version, bump, preid = 'alpha') {
  if (!VALID_BUMPS.has(bump)) {
    throw new Error(`Unsupported version bump "${bump}".`);
  }

  if (!VALID_PREIDS.has(preid)) {
    throw new Error(`Unsupported prerelease id "${preid}".`);
  }

  const parsed = parseVersion(version);

  switch (bump) {
    case 'major':
      return `${parsed.major + 1}.0.0`;
    case 'minor':
      return `${parsed.major}.${parsed.minor + 1}.0`;
    case 'patch':
      return parsed.prerelease
        ? `${parsed.major}.${parsed.minor}.${parsed.patch}`
        : `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
    case 'premajor':
      return `${parsed.major + 1}.0.0-${preid}.0`;
    case 'preminor':
      return `${parsed.major}.${parsed.minor + 1}.0-${preid}.0`;
    case 'prepatch':
      return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}-${preid}.0`;
    case 'prerelease':
      return getNextPrereleaseVersion(parsed, preid);
    default: {
      const exhaustive = bump;
      throw new Error(`Unsupported version bump "${exhaustive}".`);
    }
  }
}

export function promoteUnreleasedChangelog(
  changelog,
  version,
  date,
  options = {},
) {
  const unreleasedHeading = '## Unreleased';
  const unreleasedStart = changelog.indexOf(`${unreleasedHeading}\n`);

  if (unreleasedStart === -1) {
    throw new Error('CHANGELOG.md is missing an Unreleased section.');
  }

  const contentStart = unreleasedStart + unreleasedHeading.length + 1;
  const nextHeadingMatch = changelog.slice(contentStart).match(/\n##\s+/);
  const nextHeadingOffset = nextHeadingMatch?.index;
  const contentEnd =
    nextHeadingOffset === undefined
      ? changelog.length
      : contentStart + nextHeadingOffset;
  const beforeUnreleasedContent = changelog.slice(0, contentStart);
  const unreleasedContent = changelog.slice(contentStart, contentEnd).trim();
  const afterUnreleasedContent = changelog.slice(contentEnd).replace(/^\n*/, '');

  if (!unreleasedContent && !options.allowEmpty) {
    throw new Error('CHANGELOG.md has no Unreleased entries.');
  }

  const releaseSection = [
    `## ${version} - ${date}`,
    '',
    unreleasedContent || '- No user-visible changes.',
  ].join('\n');

  return [
    beforeUnreleasedContent.trimEnd(),
    '',
    releaseSection,
    '',
    afterUnreleasedContent.trimEnd(),
    '',
  ].join('\n');
}

export function updateReadmeVersion(readme, version) {
  const statusVersionPattern =
    /`(\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+\.\d+)?)` is an early public release\./;

  if (!statusVersionPattern.test(readme)) {
    throw new Error('README.md package status version marker was not found.');
  }

  return readme.replace(
    statusVersionPattern,
    `\`${version}\` is an early public release.`,
  );
}

function parseVersion(version) {
  const match = version.match(
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+)\.(\d+))?$/,
  );

  if (!match) {
    throw new Error(`Invalid semver version "${version}".`);
  }

  const [, major, minor, patch, prereleaseId, prereleaseNumber] = match;

  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease: prereleaseId
      ? {
          id: prereleaseId,
          number: Number(prereleaseNumber),
        }
      : null,
  };
}

function getNextPrereleaseVersion(version, preid) {
  if (version.prerelease?.id === preid) {
    return `${version.major}.${version.minor}.${version.patch}-${preid}.${version.prerelease.number + 1}`;
  }

  if (version.prerelease) {
    return `${version.major}.${version.minor}.${version.patch}-${preid}.0`;
  }

  return `${version.major}.${version.minor}.${version.patch + 1}-${preid}.0`;
}

function parseArgs(argv) {
  const args = [...argv];
  const command = args[0] === 'dispatch' || args[0] === 'prepare'
    ? args.shift()
    : 'prepare';
  const options = {
    allowDirty: false,
    allowEmpty: false,
    bump: 'patch',
    dispatch: false,
    dryRun: false,
    preid: 'alpha',
    yes: false,
  };

  while (args.length > 0) {
    const arg = args.shift();

    if (!arg) {
      continue;
    }

    if (VALID_BUMPS.has(arg)) {
      options.bump = arg;
      continue;
    }

    if (arg === '--allow-dirty') {
      options.allowDirty = true;
      continue;
    }

    if (arg === '--allow-empty') {
      options.allowEmpty = true;
      continue;
    }

    if (arg === '--dispatch') {
      options.dispatch = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--yes') {
      options.yes = true;
      continue;
    }

    if (arg === '--preid') {
      const preid = args.shift();

      if (!preid) {
        throw new Error('--preid requires alpha, beta, or rc.');
      }

      options.preid = preid;
      continue;
    }

    throw new Error(`Unknown release option "${arg}".`);
  }

  return {
    command,
    options,
  };
}

function prepareRelease(options) {
  ensureRepositoryFiles();
  ensureCleanWorkingTree(options.allowDirty);

  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const nextVersion = computeNextVersion(
    packageJson.version,
    options.bump,
    options.preid,
  );
  const changelog = readFileSync('CHANGELOG.md', 'utf8');
  const nextChangelog = promoteUnreleasedChangelog(
    changelog,
    nextVersion,
    getToday(),
    { allowEmpty: options.allowEmpty },
  );
  const readme = readFileSync('README.md', 'utf8');
  const nextReadme = updateReadmeVersion(readme, nextVersion);

  if (options.dryRun) {
    console.log(`Would prepare ${packageJson.name}@${nextVersion}.`);
    return nextVersion;
  }

  if (!options.yes) {
    console.log(`Preparing ${packageJson.name}@${nextVersion}.`);
    console.log('Pass --yes to write package files and CHANGELOG.md.');
    return nextVersion;
  }

  run('npm', ['version', nextVersion, '--no-git-tag-version']);
  writeFileSync('CHANGELOG.md', nextChangelog);
  writeFileSync('README.md', nextReadme);
  console.log(`Prepared ${packageJson.name}@${nextVersion}.`);

  if (options.dispatch) {
    dispatchPublishWorkflow();
  }

  return nextVersion;
}

function dispatchPublishWorkflow() {
  ensureCommandExists('gh');
  run('npm', ['run', 'check']);
  const ref = getCurrentRef();

  run('gh', ['workflow', 'run', 'publish-npm.yml', '--ref', ref]);
  console.log(`Dispatched publish-npm.yml for ${ref}.`);
}

function ensureRepositoryFiles() {
  for (const file of [
    'package.json',
    'package-lock.json',
    'CHANGELOG.md',
    'README.md',
  ]) {
    if (!existsSync(file)) {
      throw new Error(`Expected ${file} in the current working directory.`);
    }
  }
}

function ensureCleanWorkingTree(allowDirty) {
  if (allowDirty) {
    return;
  }

  const result = run('git', ['status', '--porcelain'], { capture: true });

  if (result.stdout.trim()) {
    throw new Error(
      'Working tree has uncommitted changes. Commit first or pass --allow-dirty.',
    );
  }
}

function ensureCommandExists(command) {
  const result = spawnSync(command, ['--version'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    throw new Error(`Required command "${command}" is not available.`);
  }
}

function getCurrentRef() {
  const branch = run('git', ['branch', '--show-current'], {
    capture: true,
  }).stdout.trim();

  if (branch) {
    return branch;
  }

  return run('git', ['rev-parse', 'HEAD'], { capture: true }).stdout.trim();
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }

  return {
    stdout: result.stdout ?? '',
  };
}

function main() {
  const { command, options } = parseArgs(process.argv.slice(2));

  if (command === 'dispatch') {
    dispatchPublishWorkflow();
    return;
  }

  prepareRelease(options);
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
