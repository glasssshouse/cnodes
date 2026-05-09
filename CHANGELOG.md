# Changelog

## Unreleased

- Added shift-click node selection so multiple selected nodes can be dragged together.
- Updated layout persistence to save every explicit-id node moved by a selected group drag.

## 0.2.0 - 2026-05-09

- Added opt-in bidirectional packet travel with `connect(..., { travel: 'both' })`.
- Updated packet routing, rendering, receive highlights, and the demo to support reverse traversal over a single connection.

## 0.1.2 - 2026-05-02

- Added named node ports with `.port(id, { side })` and `connect(..., { sourcePort, targetPort })`.
- Updated the demo graph to use named ports for explicit route endpoints.
- Added CI validation and release helper scripts for version, changelog, and publish workflow dispatch.

## 0.1.1 - 2026-04-28

- Promoted the package version from the alpha prerelease line to the stable `0.1.1` release.
- Added GitHub Actions automation to publish to npm and create matching GitHub Releases from `CHANGELOG.md`.
- Changed publishing so new releases are published with the `latest` dist-tag.
