import type { CanvasConnectionStyle, CanvasShape } from './public';

export type CanvasConnectionDraft = {
  label?: string;
  sourceNodeId: string;
  style: CanvasConnectionStyle;
  targetNodeId: string;
};

export type CanvasNodeDraft = {
  color?: string;
  description?: string;
  height: number;
  id?: string;
  kind: string;
  shape: CanvasShape;
  title: string;
  width: number;
  x: number;
  y: number;
};
