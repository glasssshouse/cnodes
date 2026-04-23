import { dispatchBurst, type TrafficRoute } from './traffic';
import type { CanvasGraphAction } from '../src/index';

type TrafficControllerOptions = Readonly<{
  dispatch: (action: CanvasGraphAction) => void;
  getRoutes: () => readonly TrafficRoute[];
  periodicBurstSize?: number;
  intervalMs?: number;
}>;

type TrafficController = Readonly<{
  sendBurst(burstSize: number): number;
  start(): void;
  stop(): void;
}>;

const DEFAULT_INTERVAL_MS = 2200;
const DEFAULT_PERIODIC_BURST_SIZE = 3;

export function createTrafficController(
  options: TrafficControllerOptions,
): TrafficController {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const periodicBurstSize =
    options.periodicBurstSize ?? DEFAULT_PERIODIC_BURST_SIZE;
  let timerId: number | null = null;

  const sendBurst = (burstSize: number): number =>
    dispatchBurst(options.dispatch, options.getRoutes(), burstSize);

  const stop = (): void => {
    if (timerId === null) {
      return;
    }

    window.clearInterval(timerId);
    timerId = null;
  };

  const start = (): void => {
    stop();
    timerId = window.setInterval(() => {
      sendBurst(periodicBurstSize);
    }, intervalMs);
  };

  return {
    sendBurst,
    start,
    stop,
  };
}
