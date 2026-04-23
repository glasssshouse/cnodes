import {
  CanvasGraph,
  type CanvasNode,
  type CanvasRenderStatsSample,
  type CanvasThemePreset,
  type CanvasConnectionStrokeStyle,
} from '../src/index';
import type { TrafficRoute } from './traffic';

export type DemoGraph = Readonly<{
  balancer: CanvasNode;
  cache: CanvasNode;
  graph: CanvasGraph;
  ingress: CanvasNode;
  router: CanvasNode;
  target: CanvasNode;
  worker: CanvasNode;
}>;

type DemoGraphNodeKey = Exclude<keyof DemoGraph, 'graph'>;

type BuildDemoGraphOptions = Readonly<{
  animatedConnections: boolean;
  onRenderStats: (sample: CanvasRenderStatsSample) => void;
  packetTrails: boolean;
  portsVisible: boolean;
  themePreset: CanvasThemePreset;
}>;

type DemoTrafficRouteDefinition = Readonly<{
  featured?: boolean;
  label: string;
  packet?: TrafficRoute['action']['packet'];
  viaNodeKeys?: readonly DemoGraphNodeKey[];
}>;

const DEMO_TRAFFIC_ROUTE_DEFINITIONS: readonly DemoTrafficRouteDefinition[] = [
  {
    label: 'Direct',
  },
  {
    label: 'Cache route',
    viaNodeKeys: ['router', 'balancer', 'cache'],
  },
  {
    label: 'Worker route',
    viaNodeKeys: ['router', 'balancer', 'worker'],
  },
  {
    featured: true,
    label: 'Important route',
    packet: {
      color: '#f97316',
      radius: 10,
      receiveHighlight: 'route',
      trail: true,
    },
    viaNodeKeys: ['router', 'balancer', 'worker'],
  },
];

export function buildDemoGraph(
  graphMount: HTMLDivElement,
  options: BuildDemoGraphOptions,
): DemoGraph {
  const graph = new CanvasGraph(graphMount, {
    connection: {
      line: 'bezier',
      stroke: options.animatedConnections ? 'animated' : 'solid',
    },
    debug: {
      onRenderStats(sample) {
        options.onRenderStats(sample);
      },
    },
    layoutPersistence: {
      enabled: true,
      storage: localStorage,
    },
    packet: {
      trail: options.packetTrails,
      trailLength: 34,
    },
    ports: {
      visible: options.portsVisible,
    },
    theme: {
      preset: options.themePreset,
    },
  });

  const ingress = graph
    .createNode('ingress')
    .id('ingress')
    .title('Ingress')
    .description('Receives external events.')
    .at(80, 220)
    .size(132, 64)
    .done();

  const router = graph
    .createNode('router')
    .id('router')
    .title('Router')
    .description('Finds directed routes.')
    .at(220, 220)
    .size(132, 64)
    .done();

  const balancer = graph
    .createNode('balancer')
    .id('balancer')
    .title('Balancer')
    .description('Splits traffic paths.')
    .at(380, 220)
    .size(144, 64)
    .done();

  const cache = graph
    .createNode('cache')
    .id('cache')
    .title('Cache')
    .description('Fast route waypoint.')
    .at(560, 130)
    .size(136, 64)
    .done();

  const worker = graph
    .createNode('worker')
    .id('worker')
    .title('Worker')
    .description('Full processing path.')
    .at(560, 310)
    .size(136, 64)
    .done();

  const target = graph
    .createNode('target')
    .id('target')
    .title('Target')
    .description('Receives packets.')
    .at(740, 220)
    .size(136, 64)
    .done();

  graph.connect(ingress, router, {
    label: 'ingress',
    style: {
      arrow: 'end',
      color: '#2563eb',
      stroke: resolveDemoStroke('dashed', options.animatedConnections),
    },
  });
  graph.connect(router, balancer, {
    label: 'route',
    style: {
      arrow: 'both',
      color: '#f59e0b',
      line: 'bezier',
      stroke: resolveDemoStroke('animated', options.animatedConnections),
    },
  });
  graph.connect(balancer, cache, {
    label: 'cache',
    style: {
      arrow: 'end',
      color: '#0891b2',
      line: 'bezier',
      stroke: resolveDemoStroke('dotted', options.animatedConnections),
    },
  });
  graph.connect(balancer, worker, {
    label: 'worker',
    style: {
      arrow: 'start',
      color: '#7c3aed',
      line: 'straight',
      stroke: resolveDemoStroke('animated-dotted', options.animatedConnections),
    },
  });
  graph.connect(cache, target, {
    label: 'fast path',
    style: {
      color: '#0f766e',
      line: 'straight',
      stroke: resolveDemoStroke('solid', options.animatedConnections),
    },
  });
  graph.connect(worker, target, {
    label: 'complete',
    style: {
      arrow: 'end',
      color: '#0f766e',
      line: 'bezier',
      stroke: resolveDemoStroke('animated', options.animatedConnections),
    },
  });

  return {
    balancer,
    cache,
    graph,
    ingress,
    router,
    target,
    worker,
  };
}

export function getTrafficRoutes(
  demoGraph: DemoGraph,
): readonly TrafficRoute[] {
  return DEMO_TRAFFIC_ROUTE_DEFINITIONS
    .filter((definition) => !definition.featured)
    .map((definition) => resolveTrafficRoute(demoGraph, definition));
}

export function getImportantTrafficRoute(demoGraph: DemoGraph): TrafficRoute {
  const definition = DEMO_TRAFFIC_ROUTE_DEFINITIONS.find(
    (routeDefinition) => routeDefinition.featured,
  );

  if (!definition) {
    throw new Error('The demo important route is not configured.');
  }

  return resolveTrafficRoute(demoGraph, definition);
}

function resolveDemoStroke(
  stroke: CanvasConnectionStrokeStyle,
  animatedConnections: boolean,
): CanvasConnectionStrokeStyle {
  if (animatedConnections) {
    return stroke;
  }

  if (stroke === 'animated') {
    return 'dashed';
  }

  if (stroke === 'animated-dotted') {
    return 'dotted';
  }

  return stroke;
}

function resolveTrafficRoute(
  demoGraph: DemoGraph,
  definition: DemoTrafficRouteDefinition,
): TrafficRoute {
  return {
    action: {
      ...(definition.packet ? { packet: definition.packet } : {}),
      sourceNodeId: demoGraph.ingress.id,
      targetNodeId: demoGraph.target.id,
      type: 'packet:send',
      ...(definition.viaNodeKeys
        ? {
            viaNodeIds: definition.viaNodeKeys.map(
              (nodeKey) => demoGraph[nodeKey].id,
            ),
          }
        : {}),
    },
    label: definition.label,
  };
}
