import type { CanvasNode } from '../types/public';

const DESCRIPTION_FONT = '12px sans-serif';
const DESCRIPTION_LINE_HEIGHT = 16;
const HORIZONTAL_TEXT_PADDING = 12;
const TITLE_FONT = '600 14px sans-serif';
const TITLE_LINE_HEIGHT = 20;
const TITLE_VERTICAL_PADDING = 12;

type MeasureContext = Pick<CanvasRenderingContext2D, 'font' | 'measureText'>;

export function getDescriptionLines(context: MeasureContext, description: string, width: number): string[] {
  return measureLines(context, description, width, DESCRIPTION_FONT);
}

export function getDescriptionLineHeight(): number {
  return DESCRIPTION_LINE_HEIGHT;
}

export function getDescriptionFont(): string {
  return DESCRIPTION_FONT;
}

export function getRequiredNodeHeight(context: MeasureContext, node: CanvasNode | NodeLike): number {
  if (node.shape === 'circle') {
    return node.height;
  }

  const titleLines = getTitleLines(context, node.title, node.width);
  const requiredHeight = titleLines.length * TITLE_LINE_HEIGHT + TITLE_VERTICAL_PADDING * 2;

  return Math.max(node.height, requiredHeight);
}

export function getTitleFont(): string {
  return TITLE_FONT;
}

export function getTitleLineHeight(): number {
  return TITLE_LINE_HEIGHT;
}

export function getTitleLines(context: MeasureContext, title: string, width: number): string[] {
  return measureLines(context, title, width, TITLE_FONT);
}

type NodeLike = {
  height: number;
  shape?: 'circle' | 'rect';
  title: string;
  width: number;
};

function measureLines(
  context: MeasureContext,
  text: string,
  width: number,
  font: string,
): string[] {
  const maxWidth = Math.max(width - HORIZONTAL_TEXT_PADDING * 2, 1);
  const normalizedText = text.trim();

  if (normalizedText.length === 0) {
    return [''];
  }

  const words = normalizedText.split(/\s+/);
  const previousFont = context.font;

  context.font = font;

  try {
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length === 0) {
        if (fits(context, word, maxWidth)) {
          currentLine = word;
          continue;
        }

        currentLine = appendBrokenTokenLines(lines, splitLongToken(context, word, maxWidth));
        continue;
      }

      const candidate = `${currentLine} ${word}`;

      if (fits(context, candidate, maxWidth)) {
        currentLine = candidate;
        continue;
      }

      lines.push(currentLine);

      if (fits(context, word, maxWidth)) {
        currentLine = word;
        continue;
      }

      currentLine = appendBrokenTokenLines(lines, splitLongToken(context, word, maxWidth));
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  } finally {
    context.font = previousFont;
  }
}

function fits(context: MeasureContext, text: string, maxWidth: number): boolean {
  return context.measureText(text).width <= maxWidth;
}

function splitLongToken(context: MeasureContext, token: string, maxWidth: number): string[] {
  const chunks: string[] = [];
  let currentChunk = '';

  for (const character of token) {
    const nextChunk = `${currentChunk}${character}`;

    if (currentChunk.length > 0 && !fits(context, nextChunk, maxWidth)) {
      chunks.push(currentChunk);
      currentChunk = character;
      continue;
    }

    currentChunk = nextChunk;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function appendBrokenTokenLines(lines: string[], chunks: readonly string[]): string {
  const [firstChunk, ...restChunks] = chunks;

  if (!firstChunk) {
    return '';
  }

  lines.push(firstChunk);
  lines.push(...restChunks.slice(0, -1));

  return restChunks[restChunks.length - 1] ?? '';
}
