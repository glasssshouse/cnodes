import { describe, expect, it } from 'vitest';

// @ts-expect-error The release helper is a Node ESM script, not TS source.
import { computeNextVersion, promoteUnreleasedChangelog } from '../scripts/release.mjs';

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
});
