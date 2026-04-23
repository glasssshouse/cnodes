import { vi } from 'vitest';

type FrameQueue = Map<number, FrameRequestCallback>;

export type AnimationFrameController = {
  pending(): number;
  step(timestamp: number): void;
};

export function stubAnimationFrame(): AnimationFrameController {
  const queue: FrameQueue = new Map();
  let nextId = 1;

  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    const id = nextId++;

    queue.set(id, callback);

    return id;
  });

  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    queue.delete(id);
  });

  return {
    pending(): number {
      return queue.size;
    },
    step(timestamp: number): void {
      const callbacks = [...queue.values()];

      queue.clear();

      for (const callback of callbacks) {
        callback(timestamp);
      }
    },
  };
}
