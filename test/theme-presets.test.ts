import { describe, expect, it } from 'vitest';

import {
  CANVAS_THEME_PRESET_NAMES,
  THEME_PRESETS,
} from '../src/theme/presets';

describe('theme presets', () => {
  it('exposes the preset names as a single source of truth', () => {
    expect(CANVAS_THEME_PRESET_NAMES).toEqual([
      'default',
      'ocean',
      'forest',
      'ember',
    ]);
  });

  it('keeps the preset map keys aligned with the exported preset names', () => {
    expect(Object.keys(THEME_PRESETS)).toEqual(CANVAS_THEME_PRESET_NAMES);
  });
});
