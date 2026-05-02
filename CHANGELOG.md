# Changelog

## Unreleased

- Added named node ports with `.port(id, { side })` and `connect(..., { sourcePort, targetPort })`.
- Updated the demo graph to use named ports for explicit route endpoints.
- Added CI validation and release helper scripts for version, changelog, and publish workflow dispatch.

## 0.1.1 - 2026-04-28

- Promoted the package version from the alpha prerelease line to the stable `0.1.1` release.
- Added GitHub Actions automation to publish to npm and create matching GitHub Releases from `CHANGELOG.md`.
- Changed publishing so new releases are published with the `latest` dist-tag.
