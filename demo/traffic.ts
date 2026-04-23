import type { CanvasGraphAction } from '../src/index';

export type TrafficRoute = Readonly<{
  action: CanvasGraphAction;
  label: string;
}>;

export function dispatchBurst(
  dispatch: (action: CanvasGraphAction) => void,
  routes: readonly TrafficRoute[],
  burstSize: number,
): number {
  if (burstSize <= 0 || routes.length === 0) {
    return 0;
  }

  for (let index = 0; index < burstSize; index += 1) {
    const route = routes[index % routes.length];

    if (!route) {
      continue;
    }

    dispatch(route.action);
  }

  return burstSize;
}
