# cnodes

Alpha browser-first TypeScript library for interactive node canvases.

`cnodes` lets you create nodes, connect them, and animate packets through the graph. It is framework-agnostic and renders into a managed `<canvas>` inside a target element.

## Alpha Status

`0.1.0-alpha.0` is the first public alpha. The current API is ready for early use and feedback, but it is not a finalized `1.0` contract yet.

Supported in this alpha:

- create nodes with stable ids, labels, descriptions, colors, and shapes
- connect nodes with straight or bezier lines, arrows, labels, and animated stroke styles
- send packets across direct, shortest-path, and waypoint-constrained routes
- dispatch serializable packet actions from external event systems
- persist dragged node positions and enable visible automatic ports

Intentional limits:

- named ports or connect-to-specific-port APIs
- packet payload modeling
- editor mutation features like delete, reconnect, or pointer-driven edge creation

## Install

```bash
npm install cnodes@0.1.0-alpha.0
```

```ts
import { CanvasGraph } from 'cnodes';
```

## Quick Start

```ts
import { CanvasGraph } from 'cnodes';

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
  .done();

const target = graph
  .createNode('target')
  .id('target')
  .title('Target')
  .description('Receives packets.')
  .at(420, 180)
  .size(156, 72)
  .done();

graph.connect(ingress, target, {
  label: 'primary',
});

graph.send('ingress', 'target');
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

`packet`

Graph-wide defaults for packet rendering. Use `radius`, `trail`, and `trailLength` here. Per-send packet styling can override `color`, `radius`, `trail`, `trailColor`, `trailLength`, and `receiveHighlight`.

`receiveHighlight`

- omitted or `false`: no node receive highlight
- `'target'`: highlight only the final target node
- `'route'`: highlight every node that receives the packet after a hop

`ports`

Set `ports.visible` to `true` to render automatically selected ports based on the committed connection layout.

`layoutPersistence`

Set `enabled`, provide a `storage` implementation, and optionally override `key`. Persisted positions are keyed by node id, so explicit ids are recommended when this is enabled.

`theme`

Use `theme.preset` for a built-in palette or `theme.tokens` to override individual colors.

## Notes

- `createNode(kind)` returns a fluent builder and `.done()` commits the node.
- `connect(...)` and `send(...)` accept either committed nodes or node ids.
- `send(...)` uses the shortest directed path by default, throws when no path exists, and accepts `via` to force intermediate nodes in order.

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

The demo uses the library from `src/` directly and uses Tailwind through the browser CDN in `demo/index.html`.

## Development

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

Before publishing:

```bash
npm run check
```

## Intentional Limits

- No named ports or connect-to-specific-port API yet
- No packet payload model yet
- No editor mutation API for deleting, reconnecting, or creating nodes through pointer gestures
- Connection labels are visual annotations, not interactive targets
