import { GameConfig } from '../config/GameConfig.js';

export type AssetPreloadState = 'idle' | 'loading' | 'ready' | 'failed';

export class AssetManager {
  private preloadPromise: Promise<void> | null = null;
  private state: AssetPreloadState = 'idle';
  private loadedCount = 0;
  private failedMessage = '';

  public preloadAll(): Promise<void> {
    if (this.preloadPromise) return this.preloadPromise;

    this.state = 'loading';
    this.loadedCount = 0;
    this.failedMessage = '';

    const tasks = [
      ...GameConfig.assets.images.map((path) => this.preloadImage(path)),
      ...GameConfig.assets.audio.map((path) => this.preloadAudio(path))
    ];

    this.preloadPromise = Promise.all(tasks)
      .then(() => {
        this.state = 'ready';
      })
      .catch((error: unknown) => {
        this.state = 'failed';
        this.failedMessage = error instanceof Error ? error.message : 'Unable to load game assets.';
        this.preloadPromise = null;
        throw error;
      });

    return this.preloadPromise;
  }

  public retry(): Promise<void> {
    if (this.state !== 'failed') return this.preloadAll();
    this.preloadPromise = null;
    return this.preloadAll();
  }

  public isReady(): boolean {
    return this.state === 'ready';
  }

  public getState(): AssetPreloadState {
    return this.state;
  }

  public getLoadedCount(): number {
    return this.loadedCount;
  }

  public getTotalCount(): number {
    return GameConfig.assets.images.length + GameConfig.assets.audio.length;
  }

  public getFailedMessage(): string {
    return this.failedMessage;
  }

  private async preloadImage(path: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Unable to load image asset: ${path}`));
      image.src = path;
    });

    this.loadedCount += 1;
  }

  private async preloadAudio(path: string): Promise<void> {
    const response = await fetch(path, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Unable to load audio asset: ${path}`);
    await response.blob();
    this.loadedCount += 1;
  }
}