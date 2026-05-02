import type { CanvasConnectionStyle, CanvasNodePort, CanvasShape } from './public';

export type CanvasConnectionDraft = {
  label?: string;
  sourcePortId?: string;
  sourceNodeId: string;
  style: CanvasConnectionStyle;
  targetPortId?: string;
  targetNodeId: string;
};

export type CanvasNodeDraft = {
  color?: string;
  description?: string;
  height: number;
  id?: string;
  kind: string;
  ports?: CanvasNodePort[];
  shape: CanvasShape;
  title: string;
  width: number;
  x: number;
  y: number;
};
