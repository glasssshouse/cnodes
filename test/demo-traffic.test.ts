import { describe, expect, it, vi } from 'vitest';

import { dispatchBurst } from '../demo/traffic';

describe('demo traffic', () => {
  it('dispatches the requested number of packets across the available routes', () => {
    const dispatch = vi.fn();
    const routes = [
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
    ] as const;

    const sentCount = dispatchBurst(dispatch, routes, 5);

    expect(sentCount).toBe(5);
    expect(dispatch.mock.calls).toEqual([
      [routes[0].action],
      [routes[1].action],
      [routes[0].action],
      [routes[1].action],
      [routes[0].action],
    ]);
  });

  it('does not dispatch anything when the burst size is zero', () => {
    const dispatch = vi.fn();
    const routes = [
      {
        action: {
          sourceNodeId: 'ingress',
          targetNodeId: 'target',
          type: 'packet:send',
        },
        label: 'Direct event',
      },
    ] as const;

    const sentCount = dispatchBurst(dispatch, routes, 0);

    expect(sentCount).toBe(0);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
