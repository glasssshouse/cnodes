# cnodes

Browser-first TypeScript library for interactive node canvases.

`cnodes` lets you create nodes, connect them, and animate packets through the graph. It is framework-agnostic and renders into a managed `<canvas>` inside a target element.

## Package Status

`0.2.0` is an early public release. The current API is ready for use and feedback, but it is not a finalized `1.0` contract yet.

Supported in this alpha:

- create nodes with stable ids, labels, descriptions, colors, and shapes
- connect nodes with straight or bezier lines, arrows, labels, named ports, and animated stroke styles
- send packets across direct, shortest-path, waypoint-constrained, and bidirectional routes
- shift-click multiple nodes and drag them as a group
- dispatch serializable packet actions from external event systems
- persist dragged node positions and enable visible automatic ports

Intentional limits:

- packet payload modeling
- editor mutation features like delete, reconnect, or pointer-driven edge creation

## Install

```bash
npm i @darbsen/cnodes
```

```ts
import { CanvasGraph } from '@darbsen/cnodes';
```

## Quick Start

```ts
import { CanvasGraph } from '@darbsen/cnodes';

const graph = new CanvasGraph('#app', {
  connection: {
    arrow: 'end',
    line: 'bezier',
  },
});

const ingress = graph
  .createNode('ingress')
  .id('ingress')
  .title('Ingress')
  .description('Receives external events.')
  .at(120, 180)
  .size(156, 72)
  .port('out', { side: 'right' })
  .done();

const target = graph
  .createNode('target')
  .id('target')
  .title('Target')
  .description('Receives packets.')
  .at(420, 180)
  .size(156, 72)
  .port('in', { side: 'left' })
  .done();

graph.connect(ingress, target, {
  label: 'primary',
  sourcePort: 'out',
  style: {
    arrow: 'both',
  },
  targetPort: 'in',
  travel: 'both',
});

graph.send('ingress', 'target');
graph.send('target', 'ingress');
```

### Dispatching External Events

Use `dispatch(action)` when packets should be triggered by WebSockets or any other external event source. The library stays transport-agnostic.

```ts
Echo.channel('traffic').listen('PacketSent', (event) => {
  const result = graph.dispatch({
    type: 'packet:send',
    sourceNodeId: event.sourceNodeId,
    targetNodeId: event.targetNodeId,
    viaNodeIds: event.viaNodeIds,
    packet: event.packet,
  });

  if (!result.ok) {
    console.warn(result.error.message);
  }
});
```

Unlike `send(...)`, `dispatch(...)` returns `{ ok: false, error }` instead of throwing for invalid actions.

## Options Reference

```ts
const graph = new CanvasGraph('#app', {
  connection: {
    arrow: 'end',
    line: 'bezier',
    stroke: 'animated',
    color: '#64748b',
  },
  packet: {
    radius: 8,
    trail: true,
    trailLength: 32,
  },
  ports: {
    visible: true,
  },
  layoutPersistence: {
    enabled: true,
    storage: localStorage,
    key: 'traffic-layout',
  },
  theme: {
    preset: 'forest',
  },
});
```

`connection`

Graph-wide defaults for committed connections. Per-connection `style` overrides `arrow`, `color`, `line`, and `stroke`.

`travel`

Use `travel: 'both'` on a connection when packets should be able to traverse the same committed connection in either direction. The default is `'forward'`, so existing connections only route from source to target. `style.arrow` is visual only and does not change packet routing.

`packet`

Graph-wide defaults for packet rendering. Use `radius`, `trail`, and `trailLength` here. Per-send packet styling can override `color`, `radius`, `trail`, `trailColor`, `trailLength`, and `receiveHighlight`.

`receiveHighlight`

- omitted or `false`: no node receive highlight
- `'target'`: highlight only the final target node
- `'route'`: highlight every node that receives the packet after a hop

`ports`

Set `ports.visible` to `true` to render used endpoint ports. Without explicit port names, endpoints are selected automatically from the committed connection layout.

### Named Ports

Use `.port(id, { side })` when a node needs stable connection endpoints:

```ts
const source = graph
  .createNode('source')
  .id('source')
  .port('out', { side: 'right' })
  .done();

const target = graph
  .createNode('target')
  .id('target')
  .port('in', { side: 'left' })
  .done();

graph.connect(source, target, {
  sourcePort: 'out',
  targetPort: 'in',
});
```

Named ports are fixed side anchors. `ports.visible` controls whether used endpoint dots are drawn; explicit port routing still works when port dots are hidden.

`layoutPersistence`

Set `enabled`, provide a `storage` implementation, and optionally override `key`. Persisted positions are keyed by node id, so explicit ids are recommended when this is enabled.

`theme`

Use `theme.preset` for a built-in palette or `theme.tokens` to override individual colors.

## Notes

- `createNode(kind)` returns a fluent builder and `.done()` commits the node.
- `connect(...)` and `send(...)` accept either committed nodes or node ids.
- Shift-click nodes to select or deselect them, then drag any selected node to move the selected group.
- Define named ports with `.port(id, { side })`, then route connections with `sourcePort` and `targetPort`.
- `send(...)` uses the shortest available path, throws when no path exists, accepts `via` to force intermediate nodes in order, and can traverse `travel: 'both'` connections in reverse.

### `layoutPersistence`

```ts
layoutPersistence: {
  enabled: true,
  storage: localStorage,
  key: 'my-graph-layout',
}
```

Only nodes with explicit `.id(...)` values participate in persisted layout restore.

### `theme`

Built-in presets:

- `default`
- `ocean`
- `forest`
- `ember`

You can also override tokens locally:

```ts
theme: {
  preset: 'default',
  tokens: {
    nodeFill: '#111827',
    nodeTextColor: '#f8fafc',
    nodeSecondaryTextColor: '#cbd5e1',
    connectionDefaultColor: '#38bdf8',
    packetColor: '#f97316',
    packetTrailColor: 'rgba(249, 115, 22, 0.32)',
  },
}
```

### `debug`

Use `debug.onRenderStats` to inspect render timing and packet activity in development:

```ts
debug: {
  onRenderStats(sample) {
    console.log(sample.renderDurationMs, sample.packetsCount);
  },
}
```

## Lifecycle

Call `destroy()` when removing a graph from the page:

```ts
graph.destroy();
```

This stops animation work and removes event listeners. It does not clear persisted layout data.

## Demo

The repository includes a framework-free browser demo called **Signal Desk**.

```bash
npm install
npm run dev
```

The demo uses the library from `src/` directly, demonstrates named ports on the graph routes, and uses Tailwind through the browser CDN in `demo/index.html`.

To build the static demo bundle locally:

```bash
npm run build:demo
```

The repository also includes a GitHub Pages workflow that deploys the demo on pushes to `main`. In the repository settings, set **Pages** to use **GitHub Actions** as the source.

The package can also be published automatically from GitHub Actions on pushes to `main` using npm trusted publishing. Configure a trusted publisher for this repository and the `publish-npm.yml` workflow in npm package settings before relying on that workflow. No long-lived `NPM_TOKEN` secret is required for publishing.

## Development

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

Before publishing or opening a PR:

```bash
npm run check
```

### Release Automation

Publishing stays in GitHub Actions through npm trusted publishing. The local release script prepares version files and changelog entries, but it does not commit, tag, push, or publish.

```bash
npm run release:prepare -- patch --yes
npm run release:prepare -- minor --yes
npm run release:prepare -- preminor --preid beta --yes
```

Useful options:

- `--dry-run`: show the next version without writing files
- `--allow-dirty`: allow release prep with uncommitted changes
- `--allow-empty`: create a release section even when `Unreleased` has no entries
- `--dispatch`: trigger the publish workflow after release prep

Recommended release flow:

```bash
npm run release:prepare -- patch --yes
npm run check
npm run build:demo
git diff
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: prepare release"
git push
```

To trigger publishing for the current ref without changing files, after the release prep commit is pushed:

```bash
npm run release:dispatch
```

`release:dispatch` requires the GitHub CLI (`gh`) and runs `.github/workflows/publish-npm.yml`. Configure npm trusted publishing for this repository before relying on the workflow.

## Intentional Limits

- No packet payload model yet
- No editor mutation API for deleting, reconnecting, or creating nodes through pointer gestures
- Connection labels are visual annotations, not interactive targets
