import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTrafficController } from '../demo/traffic-controller';

describe('demo traffic controller', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('dispatches periodic bursts while traffic is running', () => {
    const dispatch = vi.fn();
    const controller = createTrafficController({
      dispatch,
      getRoutes: () => [
        {
          action: {
            sourceNodeId: 'ingress',
            targetNodeId: 'target',
            type: 'packet:send',
          },
          label: 'Direct event',
        },
        {
          action: {
            sourceNodeId: 'ingress',
            targetNodeId: 'target',
            type: 'packet:send',
            viaNodeIds: ['router', 'cache'],
          },
          label: 'Via event',
        },
      ],
    });

    controller.start();
    vi.advanceTimersByTime(2200);

    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(dispatch.mock.calls).toEqual([
      [
        {
          sourceNodeId: 'ingress',
          targetNodeId: 'target',
          type: 'packet:send',
        },
      ],
      [
        {
          sourceNodeId: 'ingress',
          targetNodeId: 'target',
          type: 'packet:send',
          viaNodeIds: ['router', 'cache'],
        },
      ],
      [
        {
          sourceNodeId: 'ingress',
          targetNodeId: 'target',
          type: 'packet:send',
        },
      ],
    ]);
  });

  it('stops periodic traffic cleanly', () => {
    const dispatch = vi.fn();
    const controller = createTrafficController({
      dispatch,
      getRoutes: () => [
        {
          action: {
            sourceNodeId: 'ingress',
            targetNodeId: 'target',
            type: 'packet:send',
          },
          label: 'Direct event',
        },
      ],
    });

    controller.start();
    controller.stop();
    vi.advanceTimersByTime(2200);

    expect(dispatch).not.toHaveBeenCalled();
  });
});
