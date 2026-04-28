# Changelog

## Unreleased

- Added GitHub Actions automation to publish the package to npm on pushes to `main`, while skipping versions that are already published.
- Switched npm publishing automation to trusted publishing with GitHub Actions OIDC instead of a long-lived npm token.
