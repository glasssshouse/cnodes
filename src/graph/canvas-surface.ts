const DEFAULT_CANVAS_HEIGHT = 480;
const DEFAULT_CANVAS_WIDTH = 640;

type CanvasMetrics = Readonly<{
  devicePixelRatio: number;
  height: number;
  width: number;
}>;

export class CanvasSurface {
  readonly #canvas: HTMLCanvasElement;
  readonly #context: CanvasRenderingContext2D;
  #devicePixelRatio: number;
  #height: number;
  readonly #target: HTMLElement;
  #width: number;

  constructor(target: string | HTMLElement) {
    this.#target = resolveTarget(target);
    this.#canvas = document.createElement('canvas');
    const context = this.#canvas.getContext('2d');

    if (!context) {
      throw new Error('A 2D canvas rendering context is required.');
    }

    this.#context = context;
    const initialMetrics = readCanvasMetrics(this.#target);

    this.#width = initialMetrics.width;
    this.#height = initialMetrics.height;
    this.#devicePixelRatio = initialMetrics.devicePixelRatio;
    this.#target.append(this.#canvas);
  }

  get canvas(): HTMLCanvasElement {
    return this.#canvas;
  }

  get context(): CanvasRenderingContext2D {
    return this.#context;
  }

  get height(): number {
    return this.#height;
  }

  get target(): HTMLElement {
    return this.#target;
  }

  get width(): number {
    return this.#width;
  }

  bindResizeObservation(onResize: () => void): () => void {
    window.addEventListener('resize', onResize);

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        window.removeEventListener('resize', onResize);
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      onResize();
    });

    resizeObserver.observe(this.#target);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }

  getPointerPosition(event: PointerEvent): { x: number; y: number } {
    const rect = this.#canvas.getBoundingClientRect();
    const scaleX = rect.width === 0 ? 1 : parseCssPixels(this.#canvas.style.width) / rect.width;
    const scaleY = rect.height === 0 ? 1 : parseCssPixels(this.#canvas.style.height) / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  syncSize(force = false): boolean {
    const metrics = readCanvasMetrics(this.#target);

    if (
      !force
      && metrics.width === this.#width
      && metrics.height === this.#height
      && metrics.devicePixelRatio === this.#devicePixelRatio
    ) {
      return false;
    }

    this.#width = metrics.width;
    this.#height = metrics.height;
    this.#devicePixelRatio = metrics.devicePixelRatio;
    this.#canvas.width = metrics.width * metrics.devicePixelRatio;
    this.#canvas.height = metrics.height * metrics.devicePixelRatio;
    this.#canvas.style.width = `${metrics.width}px`;
    this.#canvas.style.height = `${metrics.height}px`;
    this.#context.setTransform(
      metrics.devicePixelRatio,
      0,
      0,
      metrics.devicePixelRatio,
      0,
      0,
    );

    return true;
  }
}

function parseCssPixels(value: string): number {
  const parsedValue = Number.parseFloat(value);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;
}

function readCanvasMetrics(target: HTMLElement): CanvasMetrics {
  return {
    devicePixelRatio: Math.max(window.devicePixelRatio || 1, 1),
    height: target.clientHeight || DEFAULT_CANVAS_HEIGHT,
    width: target.clientWidth || DEFAULT_CANVAS_WIDTH,
  };
}

function resolveTarget(target: string | HTMLElement): HTMLElement {
  if (typeof target !== 'string') {
    return target;
  }

  const element = document.getElementById(target);

  if (!element) {
    throw new Error(`Target container "${target}" was not found.`);
  }

  return element;
}
