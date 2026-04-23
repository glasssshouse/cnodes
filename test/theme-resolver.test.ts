import { describe, expect, it } from 'vitest';

import { resolveCanvasTheme } from '../src/theme/canvas-theme';

describe('canvas theme resolution', () => {
  it('uses the default preset when no theme is provided', () => {
    const theme = resolveCanvasTheme({});

    expect(theme.preset).toBe('default');
    expect(theme.tokens.nodeFill).toBe('#6b7280');
    expect(theme.tokens.connectionDefaultColor).toBe('#64748b');
    expect(theme.tokens.connectionLabelBackgroundColor).toBe('rgba(248, 250, 252, 0.92)');
    expect(theme.tokens.connectionLabelBorderColor).toBe('rgba(100, 116, 139, 0.22)');
    expect(theme.tokens.connectionLabelTextColor).toBe('#334155');
    expect(theme.tokens.packetColor).toBe('#f97316');
    expect(theme.tokens.packetTrailColor).toBe('rgba(249, 115, 22, 0.32)');
    expect(theme.tokens.portFillColor).toBe('#f8fafc');
    expect(theme.tokens.portBorderColor).toBe('#94a3b8');
  });

  it('resolves a named preset', () => {
    const theme = resolveCanvasTheme({
      theme: {
        preset: 'forest',
      },
    });

    expect(theme.preset).toBe('forest');
    expect(theme.tokens.nodeFill).toBe('#166534');
    expect(theme.tokens.packetColor).toBe('#84cc16');
  });

  it('applies token overrides on top of the selected preset', () => {
    const theme = resolveCanvasTheme({
      theme: {
        preset: 'forest',
        tokens: {
          connectionLabelTextColor: '#f8fafc',
          nodeFill: '#111827',
          packetColor: '#f97316',
          packetTrailColor: '#fb923c',
          portFillColor: '#020617',
        },
      },
    });

    expect(theme.tokens.connectionLabelTextColor).toBe('#f8fafc');
    expect(theme.tokens.connectionLabelBackgroundColor).toBe('rgba(240, 253, 244, 0.9)');
    expect(theme.tokens.nodeFill).toBe('#111827');
    expect(theme.tokens.nodeBorderColor).toBe('#14532d');
    expect(theme.tokens.packetColor).toBe('#f97316');
    expect(theme.tokens.packetTrailColor).toBe('#fb923c');
    expect(theme.tokens.portFillColor).toBe('#020617');
    expect(theme.tokens.portBorderColor).toBe('#84cc16');
  });
});
