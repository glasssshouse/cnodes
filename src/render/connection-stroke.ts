import type { CanvasConnectionStrokeStyle } from '../types/public';

export type ResolvedConnectionStroke = Readonly<{
  animated: boolean;
  lineDash: number[];
}>;

export function resolveConnectionStroke(
  strokeStyle: CanvasConnectionStrokeStyle,
): ResolvedConnectionStroke {
  switch (strokeStyle) {
    case 'solid':
      return { animated: false, lineDash: [] };
    case 'dashed':
      return { animated: false, lineDash: [10, 8] };
    case 'dotted':
      return { animated: false, lineDash: [2, 10] };
    case 'animated':
      return { animated: true, lineDash: [10, 8] };
    case 'animated-dotted':
      return { animated: true, lineDash: [2, 10] };
    default: {
      const exhaustiveCheck: never = strokeStyle;

      throw new Error(`Unsupported connection stroke style: ${exhaustiveCheck}`);
    }
  }
}
