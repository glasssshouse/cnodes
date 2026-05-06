import { describe, expect, it } from 'vitest';

import {
  computeNextVersion,
  promoteUnreleasedChangelog,
  updateReadmeVersion,
} from '../scripts/release.mjs';

describe('release script helpers', () => {
  it('computes stable semver bumps', () => {
    expect(computeNextVersion('0.1.1', 'patch')).toBe('0.1.2');
    expect(computeNextVersion('0.1.1', 'minor')).toBe('0.2.0');
    expect(computeNextVersion('0.1.1', 'major')).toBe('1.0.0');
  });

  it('computes prerelease semver bumps with a preid', () => {
    expect(computeNextVersion('0.1.1', 'preminor', 'beta')).toBe('0.2.0-beta.0');
    expect(computeNextVersion('0.2.0-beta.0', 'prerelease', 'beta')).toBe('0.2.0-beta.1');
  });

  it('promotes unreleased changelog entries into a dated version section', () => {
    const changelog = [
      '# Changelog',
      '',
      '## Unreleased',
      '',
      '- Added named ports.',
      '- Added release tooling.',
      '',
      '## 0.1.1 - 2026-04-28',
      '',
      '- Previous release.',
      '',
    ].join('\n');

    expect(promoteUnreleasedChangelog(changelog, '0.1.2', '2026-05-02')).toBe([
      '# Changelog',
      '',
      '## Unreleased',
      '',
      '## 0.1.2 - 2026-05-02',
      '',
      '- Added named ports.',
      '- Added release tooling.',
      '',
      '## 0.1.1 - 2026-04-28',
      '',
      '- Previous release.',
      '',
    ].join('\n'));
  });

  it('refuses to promote an empty unreleased changelog by default', () => {
    const changelog = [
      '# Changelog',
      '',
      '## Unreleased',
      '',
      '## 0.1.1 - 2026-04-28',
      '',
      '- Previous release.',
      '',
    ].join('\n');

    expect(() => promoteUnreleasedChangelog(changelog, '0.1.2', '2026-05-02')).toThrowError(
      'CHANGELOG.md has no Unreleased entries.',
    );
  });

  it('updates the README package status version', () => {
    const readme = [
      '# cnodes',
      '',
      '## Package Status',
      '',
      '`0.1.1` is an early public release. The current API is ready for use and feedback, but it is not a finalized `1.0` contract yet.',
      '',
    ].join('\n');

    expect(updateReadmeVersion(readme, '0.1.2')).toBe([
      '# cnodes',
      '',
      '## Package Status',
      '',
      '`0.1.2` is an early public release. The current API is ready for use and feedback, but it is not a finalized `1.0` contract yet.',
      '',
    ].join('\n'));
  });

  it('throws when the README package status version marker is missing', () => {
    expect(() => updateReadmeVersion('# cnodes\n', '0.1.2')).toThrowError(
      'README.md package status version marker was not found.',
    );
  });
});
