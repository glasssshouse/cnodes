# Changelog

## Unreleased

## 0.1.0-alpha.1 - 2026-04-28

- Added GitHub Actions automation to publish the package to npm on pushes to `main`, while skipping versions that are already published.
- Switched npm publishing automation to trusted publishing with GitHub Actions OIDC instead of a long-lived npm token.
- Changed npm publishing automation to always publish with the `latest` dist-tag, including prereleases.
- Added GitHub Actions automation to create or update a GitHub Release from the package version and matching changelog section.
