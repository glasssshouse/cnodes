import { describe, expect, it } from 'vitest';

import * as cnodes from '../src/index';

describe('package entrypoint', () => {
  it('exports CanvasGraph', () => {
    expect(cnodes.CanvasGraph).toBeTypeOf('function');
  });
});
