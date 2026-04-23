type AnimationControllerOptions = Readonly<{
  onFrame(timestamp: number): void;
  shouldAnimate(): boolean;
}>;

export class AnimationController {
  #animationFrameId: number | null = null;
  readonly #onFrame: (timestamp: number) => void;
  readonly #shouldAnimate: () => boolean;

  constructor(options: AnimationControllerOptions) {
    this.#onFrame = options.onFrame;
    this.#shouldAnimate = options.shouldAnimate;
  }

  ensureRunning(): void {
    if (this.#animationFrameId !== null || !this.#shouldAnimate()) {
      return;
    }

    this.#animationFrameId = window.requestAnimationFrame(this.#tickFrame);
  }

  stop(): void {
    if (this.#animationFrameId === null) {
      return;
    }

    window.cancelAnimationFrame(this.#animationFrameId);
    this.#animationFrameId = null;
  }

  readonly #tickFrame = (timestamp: number): void => {
    this.#animationFrameId = null;
    this.#onFrame(timestamp);

    if (this.#shouldAnimate()) {
      this.ensureRunning();
    }
  };
}
