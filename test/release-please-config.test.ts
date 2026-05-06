import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

type ReleasePleaseConfig = Readonly<{
  packages: Readonly<
    Record<
      string,
      Readonly<{
        'include-component-in-tag'?: boolean;
        'package-name'?: string;
        'release-type'?: string;
      }>
    >
  >;
}>;

describe('release-please configuration', () => {
  it('tracks the current package version in the release manifest', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      version: string;
    };
    const manifest = JSON.parse(
      readFileSync('.release-please-manifest.json', 'utf8'),
    ) as Record<string, string>;

    expect(manifest['.']).toBe(packageJson.version);
  });

  it('configures the root node package without component-prefixed tags', () => {
    const config = JSON.parse(
      readFileSync('release-please-config.json', 'utf8'),
    ) as ReleasePleaseConfig;

    expect(config.packages['.']).toMatchObject({
      'include-component-in-tag': false,
      'package-name': '@darbsen/cnodes',
      'release-type': 'node',
    });
  });

  it('marks the README package status version for release-please updates', () => {
    const readme = readFileSync('README.md', 'utf8');

    expect(readme).toContain('x-release-please-version');
  });
});
