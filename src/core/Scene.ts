import type { GameEngine } from './GameEngine.js';

export interface Scene {
  readonly name: string;
  enter?(engine: GameEngine): void;
  exit?(): void;
  update(deltaSeconds: number, engine: GameEngine): void;
  render(context: CanvasRenderingContext2D, engine: GameEngine): void;
}
