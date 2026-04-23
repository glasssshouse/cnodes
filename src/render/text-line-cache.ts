import {
  getDescriptionLines,
  getTitleLines,
} from '../layout/text-layout';
import type { CanvasNode } from '../types/public';

type CachedTextLines = Readonly<{
  lines: readonly string[];
  text: string;
  width: number;
}>;

type MeasureContext = Pick<CanvasRenderingContext2D, 'font' | 'measureText'>;

export class TextLineCache {
  readonly #descriptionLinesCache = new Map<string, CachedTextLines>();
  readonly #titleLinesCache = new Map<string, CachedTextLines>();
  readonly #context: MeasureContext;

  constructor(context: MeasureContext) {
    this.#context = context;
  }

  getDescriptionLines(node: CanvasNode): readonly string[] {
    if (!node.description) {
      this.#descriptionLinesCache.delete(node.id);

      return [];
    }

    const cachedLines = this.#descriptionLinesCache.get(node.id);

    if (cachedLines && cachedLines.text === node.description && cachedLines.width === node.width) {
      return cachedLines.lines;
    }

    const lines = getDescriptionLines(this.#context, node.description, node.width);

    this.#descriptionLinesCache.set(node.id, {
      lines,
      text: node.description,
      width: node.width,
    });

    return lines;
  }

  getTitleLines(node: CanvasNode): readonly string[] {
    const cachedLines = this.#titleLinesCache.get(node.id);

    if (cachedLines && cachedLines.text === node.title && cachedLines.width === node.width) {
      return cachedLines.lines;
    }

    const lines = getTitleLines(this.#context, node.title, node.width);

    this.#titleLinesCache.set(node.id, {
      lines,
      text: node.title,
      width: node.width,
    });

    return lines;
  }
}
