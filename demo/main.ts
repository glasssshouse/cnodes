import {
  buildDemoGraph,
  getImportantTrafficRoute,
  getTrafficRoutes,
  type DemoGraph,
} from './demo-graph';
import { createDemoLayout } from './demo-layout';
import {
  createActionButton,
  createRangeControl,
  createToggle,
} from './controls';
import { createTrafficController } from './traffic-controller';
import { type CanvasGraphAction, type CanvasThemePreset } from '../src/index';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Demo root element "#app" is missing.');
}

type DemoState = {
  animatedConnections: boolean;
  burstSize: number;
  packetsEnabled: boolean;
  packetTrails: boolean;
  portsVisible: boolean;
  themePreset: CanvasThemePreset;
};

const state: DemoState = {
  animatedConnections: true,
  burstSize: 24,
  packetsEnabled: true,
  packetTrails: true,
  portsVisible: true,
  themePreset: 'forest',
};

let activeGraph: DemoGraph | null = null;

app.innerHTML = '';
const layout = createDemoLayout(app);
const trafficController = createTrafficController({
  dispatch(action) {
    dispatchDemoAction(action);
  },
  getRoutes() {
    return activeGraph ? getTrafficRoutes(activeGraph) : [];
  },
});

layout.header.append(
  createPresetSelect(
    ['default', 'ocean', 'forest', 'ember'],
    state.themePreset,
    (preset) => {
      state.themePreset = preset;
      rebuildGraph();
    },
  ),
);

layout.visualControls.append(
  createToggle('Ports', state.portsVisible, (checked) => {
    state.portsVisible = checked;
    rebuildGraph();
  }),
  createToggle('Packet traffic', state.packetsEnabled, (checked) => {
    state.packetsEnabled = checked;
    syncPacketTraffic();
  }),
  createToggle('Packet trails', state.packetTrails, (checked) => {
    state.packetTrails = checked;
    rebuildGraph();
  }),
  createRangeControl('Burst size', state.burstSize, 1, 240, 1, (value) => {
    state.burstSize = value;
  }),
  createActionButton('Send burst', () => {
    trafficController.sendBurst(state.burstSize);
  }),
  createActionButton('Important packet', () => {
    if (!activeGraph) {
      return;
    }

    dispatchDemoAction(getImportantTrafficRoute(activeGraph).action);
  }),
);

rebuildGraph();

function rebuildGraph(): void {
  trafficController.stop();
  activeGraph?.graph.destroy();
  layout.graphMount.replaceChildren();

  activeGraph = buildDemoGraph(layout.graphMount, {
    animatedConnections: state.animatedConnections,
    onRenderStats() {},
    packetTrails: state.packetTrails,
    portsVisible: state.portsVisible,
    themePreset: state.themePreset,
  });

  renderRouteControls();
  syncPacketTraffic();
}

function dispatchDemoAction(action: CanvasGraphAction): void {
  const result = activeGraph?.graph.dispatch(action);

  if (result && !result.ok) {
    console.warn(result.error.message);
  }
}

function renderRouteControls(): void {
  layout.routeControls.replaceChildren();

  const routes = activeGraph ? getTrafficRoutes(activeGraph) : [];

  for (const route of routes) {
    layout.routeControls.append(
      createActionButton(`Dispatch ${route.label}`, () => {
        dispatchDemoAction(route.action);
      }),
    );
  }
}

function syncPacketTraffic(): void {
  trafficController.stop();

  if (!state.packetsEnabled || !activeGraph) {
    return;
  }

  trafficController.start();
}

function createPresetSelect(
  presets: readonly CanvasThemePreset[],
  value: CanvasThemePreset,
  onChange: (preset: CanvasThemePreset) => void,
): HTMLLabelElement {
  const wrapper = document.createElement('label');

  wrapper.className =
    'ml-auto inline-flex items-center gap-2 text-sm font-semibold text-[#a8b8ad]';

  const text = document.createElement('span');

  text.textContent = 'Theme preset';

  const select = document.createElement('select');

  select.className =
    'rounded-full border border-[#eee6d2]/10 bg-[#eee6d2]/6 px-3 py-2 text-sm font-semibold text-[#fff8e8] outline-none transition focus:border-emerald-300';

  for (const preset of presets) {
    const option = document.createElement('option');

    option.value = preset;
    option.textContent = preset;
    option.selected = preset === value;
    select.append(option);
  }

  select.addEventListener('change', () => {
    onChange(select.value as CanvasThemePreset);
  });

  wrapper.append(text, select);

  return wrapper;
}
