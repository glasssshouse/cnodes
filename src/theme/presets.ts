export type CanvasThemePresetTokens = Readonly<{
  connectionDefaultColor: string;
  connectionLabelBackgroundColor: string;
  connectionLabelBorderColor: string;
  connectionLabelTextColor: string;
  nodeBorderColor: string;
  nodeFill: string;
  nodeHoverBorderColor: string;
  nodeSecondaryTextColor: string;
  nodeShadowColor: string;
  nodeTextColor: string;
  packetColor: string;
  packetTrailColor: string;
  portBorderColor: string;
  portFillColor: string;
}>;

export const CANVAS_THEME_PRESET_NAMES = [
  'default',
  'ocean',
  'forest',
  'ember',
] as const;

export const THEME_PRESETS: Readonly<
  Record<(typeof CANVAS_THEME_PRESET_NAMES)[number], CanvasThemePresetTokens>
> = {
  default: {
    connectionDefaultColor: '#64748b',
    connectionLabelBackgroundColor: 'rgba(248, 250, 252, 0.92)',
    connectionLabelBorderColor: 'rgba(100, 116, 139, 0.22)',
    connectionLabelTextColor: '#334155',
    nodeBorderColor: 'rgba(15, 23, 42, 0.12)',
    nodeFill: '#6b7280',
    nodeHoverBorderColor: 'rgba(15, 23, 42, 0.28)',
    nodeSecondaryTextColor: '#475569',
    nodeShadowColor: 'rgba(15, 23, 42, 0.16)',
    nodeTextColor: '#0f172a',
    packetColor: '#f97316',
    packetTrailColor: 'rgba(249, 115, 22, 0.32)',
    portBorderColor: '#94a3b8',
    portFillColor: '#f8fafc',
  },
  ocean: {
    connectionDefaultColor: '#0ea5e9',
    connectionLabelBackgroundColor: 'rgba(226, 248, 245, 0.9)',
    connectionLabelBorderColor: 'rgba(34, 211, 238, 0.36)',
    connectionLabelTextColor: '#0f172a',
    nodeBorderColor: '#0f172a',
    nodeFill: '#0f766e',
    nodeHoverBorderColor: '#22d3ee',
    nodeSecondaryTextColor: '#99f6e4',
    nodeShadowColor: 'rgba(15, 118, 110, 0.28)',
    nodeTextColor: '#e2f8f5',
    packetColor: '#22d3ee',
    packetTrailColor: 'rgba(34, 211, 238, 0.32)',
    portBorderColor: '#22d3ee',
    portFillColor: '#e2f8f5',
  },
  forest: {
    connectionDefaultColor: '#15803d',
    connectionLabelBackgroundColor: 'rgba(240, 253, 244, 0.9)',
    connectionLabelBorderColor: 'rgba(132, 204, 22, 0.34)',
    connectionLabelTextColor: '#14532d',
    nodeBorderColor: '#14532d',
    nodeFill: '#166534',
    nodeHoverBorderColor: '#84cc16',
    nodeSecondaryTextColor: '#bbf7d0',
    nodeShadowColor: 'rgba(20, 83, 45, 0.28)',
    nodeTextColor: '#ecfdf5',
    packetColor: '#84cc16',
    packetTrailColor: 'rgba(132, 204, 22, 0.32)',
    portBorderColor: '#84cc16',
    portFillColor: '#f0fdf4',
  },
  ember: {
    connectionDefaultColor: '#ea580c',
    connectionLabelBackgroundColor: 'rgba(255, 241, 242, 0.9)',
    connectionLabelBorderColor: 'rgba(251, 113, 133, 0.36)',
    connectionLabelTextColor: '#7f1d1d',
    nodeBorderColor: '#7f1d1d',
    nodeFill: '#be123c',
    nodeHoverBorderColor: '#fb7185',
    nodeSecondaryTextColor: '#fecdd3',
    nodeShadowColor: 'rgba(190, 24, 93, 0.28)',
    nodeTextColor: '#fff1f2',
    packetColor: '#fb7185',
    packetTrailColor: 'rgba(251, 113, 133, 0.34)',
    portBorderColor: '#fb7185',
    portFillColor: '#fff1f2',
  },
};
