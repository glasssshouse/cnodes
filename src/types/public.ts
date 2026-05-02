import type { CANVAS_THEME_PRESET_NAMES } from '../theme/presets';

export type CanvasShape = 'circle' | 'rect';
export type CanvasLineStyle = 'straight' | 'bezier';
export type CanvasArrowStyle = 'none' | 'end' | 'start' | 'both';
export type CanvasPortSide = 'left' | 'right' | 'top' | 'bottom';
export type CanvasConnectionStrokeStyle =
  | 'solid'
  | 'dashed'
  | 'dotted'
  | 'animated'
  | 'animated-dotted';
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
export type CanvasRenderCause =
  | 'connection-animation'
  | 'drag'
  | 'packets'
  | 'static';
export type CanvasRenderStatsSample = Readonly<{
  animatedConnections: boolean;
  cause: CanvasRenderCause;
  connectionCount: number;
  dragging: boolean;
  packetsActive: boolean;
  packetsCount: number;
  renderDurationMs: number;
  timestamp: number;
}>;
export type CanvasThemePreset = (typeof CANVAS_THEME_PRESET_NAMES)[number];
export type CanvasThemeTokens = Readonly<{
  connectionDefaultColor?: string;
  connectionLabelBackgroundColor?: string;
  connectionLabelBorderColor?: string;
  connectionLabelTextColor?: string;
  nodeBorderColor?: string;
  nodeFill?: string;
  nodeHoverBorderColor?: string;
  nodeSecondaryTextColor?: string;
  nodeShadowColor?: string;
  nodeTextColor?: string;
  packetColor?: string;
  packetTrailColor?: string;
  portBorderColor?: string;
  portFillColor?: string;
}>;

export type CanvasConnectionStyle = Readonly<{
  arrow: CanvasArrowStyle;
  color: string;
  line: CanvasLineStyle;
  stroke: CanvasConnectionStrokeStyle;
}>;

export type CanvasConnectionStyleOptions = Readonly<{
  arrow?: CanvasArrowStyle;
  color?: string;
  line?: CanvasLineStyle;
  stroke?: CanvasConnectionStrokeStyle;
}>;

export type CanvasConnectionOptions = Readonly<{
  label?: string;
  sourcePort?: string;
  style?: CanvasConnectionStyleOptions;
  targetPort?: string;
}>;

export type CanvasGraphOptions = Readonly<{
  connection?: CanvasConnectionStyleOptions;
  debug?: Readonly<{
    onRenderStats?: (sample: CanvasRenderStatsSample) => void;
  }>;
  layoutPersistence?: Readonly<{
    enabled?: boolean;
    key?: string;
    storage?: StorageLike;
  }>;
  packet?: Readonly<{
    radius?: number;
    trail?: boolean;
    trailLength?: number;
  }>;
  ports?: Readonly<{
    visible?: boolean;
  }>;
  theme?: Readonly<{
    preset?: CanvasThemePreset;
    tokens?: CanvasThemeTokens;
  }>;
}>;

export type CanvasConnection = Readonly<{
  id: string;
  label?: string;
  sourcePortId?: string;
  sourceNodeId: string;
  style: CanvasConnectionStyle;
  targetPortId?: string;
  targetNodeId: string;
}>;

export type CanvasPacket = Readonly<{
  id: string;
  progress: number;
  sourceNodeId: string;
  status: 'running' | 'completed';
  targetNodeId: string;
}>;

export type CanvasPacketStyleOptions = Readonly<{
  color?: string;
  radius?: number;
  receiveHighlight?: false | 'target' | 'route';
  trail?: boolean;
  trailColor?: string;
  trailLength?: number;
}>;

export type CanvasPacketSendOptions = Readonly<{
  packet?: CanvasPacketStyleOptions;
  via?: readonly CanvasNodeRef[];
}>;

export type CanvasGraphAction = Readonly<{
  packet?: CanvasPacketStyleOptions;
  sourceNodeId: string;
  targetNodeId: string;
  type: 'packet:send';
  viaNodeIds?: readonly string[];
}>;

export type CanvasGraphActionResult =
  | Readonly<{
      ok: true;
      packet: CanvasPacket;
    }>
  | Readonly<{
      error: Error;
      ok: false;
    }>;

export type CanvasNode = Readonly<{
  color: string;
  description?: string;
  height: number;
  id: string;
  kind: string;
  ports?: readonly CanvasNodePort[];
  shape: CanvasShape;
  title: string;
  width: number;
  x: number;
  y: number;
}>;

export type CanvasNodePort = Readonly<{
  id: string;
  side: CanvasPortSide;
}>;

export type CanvasNodePortOptions = Readonly<{
  side: CanvasPortSide;
}>;

export type CanvasNodeRef = CanvasNode | string;
