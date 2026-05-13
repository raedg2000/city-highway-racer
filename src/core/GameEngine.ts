import { GameConfig } from '../config/GameConfig.js';
import { AssetManager } from './AssetManager.js';
import { AudioManager } from './AudioManager.js';
import { InputController } from './InputController.js';
import type { Scene } from './Scene.js';
import type { Vector2 } from '../types/Geometry.js';

export class GameEngine {
  public readonly input = new InputController();
  public readonly audio = new AudioManager();
  public readonly assets = new AssetManager();
  public readonly canvas: HTMLCanvasElement;
  public readonly context: CanvasRenderingContext2D;

  private activeScene: Scene | null = null;
  private lastFrameTime = 0;
  private animationFrameHandle = 0;

  public constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to create 2D canvas context.');
    this.context = context;
    this.canvas.width = GameConfig.canvas.width;
    this.canvas.height = GameConfig.canvas.height;
    void this.assets.preloadAll().catch(() => undefined);
  }

  public setScene(scene: Scene): void {
    this.activeScene?.exit?.();
    this.activeScene = scene;
    document.documentElement.dataset.gameScene = scene.name;
    scene.enter?.(this);
  }

  public start(): void {
    this.lastFrameTime = performance.now();
    this.animationFrameHandle = requestAnimationFrame(this.onAnimationFrame);
  }

  public stop(): void {
    cancelAnimationFrame(this.animationFrameHandle);
    this.input.destroy();
  }

  public clientPointToCanvasPoint(clientX: number, clientY: number): Vector2 {
    const bounds = this.canvas.getBoundingClientRect();
    if (this.isForcedLandscapeLayout()) {
      const localX = clientY - bounds.top;
      const localY = bounds.right - clientX;
      const scaleX = this.canvas.width / bounds.height;
      const scaleY = this.canvas.height / bounds.width;

      return {
        x: localX * scaleX,
        y: localY * scaleY
      };
    }

    const scaleX = this.canvas.width / bounds.width;
    const scaleY = this.canvas.height / bounds.height;

    return {
      x: (clientX - bounds.left) * scaleX,
      y: (clientY - bounds.top) * scaleY
    };
  }

  public isCompactViewport(): boolean {
    const bounds = this.canvas.getBoundingClientRect();
    return bounds.width < 820 || bounds.height < 500;
  }

  public isForcedLandscapeLayout(): boolean {
    return window.matchMedia('(max-width: 820px) and (orientation: portrait)').matches;
  }

  public requestLandscapeMode(): void {
    if (!this.isForcedLandscapeLayout()) return;

    const root = document.documentElement;
    const fullscreenPromise = document.fullscreenElement ? Promise.resolve() : root.requestFullscreen?.() ?? Promise.resolve();
    void fullscreenPromise
      .catch(() => undefined)
      .then(() => screen.orientation?.lock?.('landscape'))
      .catch(() => undefined);
  }

  private readonly onAnimationFrame = (timestamp: number): void => {
    const deltaSeconds = Math.min((timestamp - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = timestamp;

    this.audio.update(deltaSeconds);
    this.activeScene?.update(deltaSeconds, this);
    this.activeScene?.render(this.context, this);
    this.input.endFrame();

    this.animationFrameHandle = requestAnimationFrame(this.onAnimationFrame);
  };
}
