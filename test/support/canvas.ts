import { vi } from 'vitest';

export type MockCanvasContext = Pick<
  CanvasRenderingContext2D,
  | 'arc'
  | 'bezierCurveTo'
  | 'beginPath'
  | 'closePath'
  | 'clearRect'
  | 'fill'
  | 'fillRect'
  | 'fillText'
  | 'lineTo'
  | 'measureText'
  | 'moveTo'
  | 'restore'
  | 'roundRect'
  | 'scale'
  | 'save'
  | 'setTransform'
  | 'setLineDash'
  | 'stroke'
> & {
  fillRecords: Array<{
    fillStyle: string;
    shadowBlur: number;
    shadowColor: string;
    shadowOffsetY: number;
  }>;
  fillStyle: string;
  fillTextRecords: Array<{
    fillStyle: string;
    text: string;
    x: number;
    y: number;
  }>;
  lineJoin: CanvasLineJoin;
  lineWidth: number;
  lineDashOffset: number;
  shadowBlur: number;
  shadowColor: string;
  shadowOffsetY: number;
  strokeStyle: string;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  strokeRecords: Array<{
    lineDash: number[];
    lineDashOffset: number;
    lineWidth: number;
    shadowBlur: number;
    shadowColor: string;
    shadowOffsetY: number;
    strokeStyle: string;
  }>;
};

export function createMockContext(): MockCanvasContext {
  let currentLineDash: number[] = [];

  const context: MockCanvasContext = {
    arc: vi.fn(),
    bezierCurveTo: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    clearRect: vi.fn(),
    fill: vi.fn(() => {
      context.fillRecords.push({
        fillStyle: context.fillStyle,
        shadowBlur: context.shadowBlur,
        shadowColor: context.shadowColor,
        shadowOffsetY: context.shadowOffsetY,
      });
    }),
    fillRect: vi.fn(),
    fillRecords: [],
    fillStyle: '',
    fillText: vi.fn((text: string, x: number, y: number) => {
      context.fillTextRecords.push({
        fillStyle: context.fillStyle,
        text,
        x,
        y,
      });
    }),
    fillTextRecords: [],
    font: '',
    lineJoin: 'miter',
    lineDashOffset: 0,
    lineTo: vi.fn(),
    lineWidth: 1,
    measureText: vi.fn((text: string) => {
      const fontSize = readFontSize(context.font);

      return {
        width: text.length * fontSize * 0.6,
      } as TextMetrics;
    }),
    moveTo: vi.fn(),
    restore: vi.fn(),
    roundRect: vi.fn(),
    scale: vi.fn(),
    save: vi.fn(),
    setTransform: vi.fn(),
    setLineDash: vi.fn((dash: number[]) => {
      currentLineDash = [...dash];
    }),
    shadowBlur: 0,
    shadowColor: '',
    shadowOffsetY: 0,
    stroke: vi.fn(() => {
      context.strokeRecords.push({
        lineDash: currentLineDash,
        lineDashOffset: context.lineDashOffset,
        lineWidth: context.lineWidth,
        shadowBlur: context.shadowBlur,
        shadowColor: context.shadowColor,
        shadowOffsetY: context.shadowOffsetY,
        strokeStyle: context.strokeStyle,
      });
    }),
    strokeRecords: [],
    strokeStyle: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
  };

  return context;
}

export function setDevicePixelRatio(value: number): void {
  Object.defineProperty(window, 'devicePixelRatio', {
    configurable: true,
    value,
  });
}

export function stubCanvasContext(context: MockCanvasContext): void {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind) => {
    if (kind === '2d') {
      return context as unknown as CanvasRenderingContext2D;
    }

    return null;
  });
}

function readFontSize(font: string): number {
  const match = font.match(/(\d+)px/);

  if (!match) {
    return 12;
  }

  return Number(match[1]);
}
