import type {
  CanvasGraphOptions,
  CanvasThemePreset,
  CanvasThemeTokens,
} from '../types/public';
import {
  THEME_PRESETS,
  type CanvasThemePresetTokens,
} from './presets';

type ResolvedCanvasThemeTokens = Readonly<Required<CanvasThemeTokens>>;

export type ResolvedCanvasTheme = Readonly<{
  preset: CanvasThemePreset;
  tokens: ResolvedCanvasThemeTokens;
}>;

export function resolveCanvasTheme(options: CanvasGraphOptions): ResolvedCanvasTheme {
  const preset = options.theme?.preset ?? 'default';
  const presetTokens: CanvasThemePresetTokens = THEME_PRESETS[preset];

  return {
    preset,
    tokens: {
      ...presetTokens,
      ...options.theme?.tokens,
    },
  };
}
