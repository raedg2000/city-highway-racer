import { createLevelDefinition } from '../config/LevelFactory.js';
import type { GameEngine } from '../core/GameEngine.js';
import type { Scene } from '../core/Scene.js';
import { RoadRenderer } from '../rendering/RoadRenderer.js';
import { drawButton, drawOutlinedText, drawPanel } from '../rendering/CanvasDrawing.js';
import type { GameSessionOptions } from '../types/GameFlow.js';
import { drawScreenControls, handleScreenControlInput, type ScreenControlLayout } from '../ui/ScreenControls.js';
import { PlayScene } from './PlayScene.js';

export class StartScene implements Scene {
  public readonly name = 'start';
  private readonly roadRenderer = new RoadRenderer();
  private readonly options: GameSessionOptions;

  public constructor(options: GameSessionOptions = { levelNumber: 1, score: 0 }) {
    this.options = options;
  }

  public enter(engine: GameEngine): void {
    void engine.assets.preloadAll().catch(() => undefined);
  }

  public update(_deltaSeconds: number, engine: GameEngine): void {
    if (handleScreenControlInput(engine, this.getScreenControlsLayout(engine)) !== 'none') return;

    if (!engine.assets.isReady()) {
      if (engine.assets.getState() === 'failed' && (engine.input.consumePressed('Enter', ' ') || engine.input.consumePointerClick())) {
        void engine.assets.retry().catch(() => undefined);
      }
      return;
    }

    if (engine.input.consumePressed('Enter', ' ') || engine.input.consumePointerClick()) {
      engine.requestLandscapeMode();
      engine.audio.prepareForPlayback();
      engine.audio.startFromUserGesture();
      engine.setScene(new PlayScene(this.options));
    }
  }

  public render(context: CanvasRenderingContext2D, engine: GameEngine): void {
    const level = createLevelDefinition(this.options.levelNumber);
    this.roadRenderer.render(context, 0);
    context.fillStyle = 'rgba(0, 0, 0, 0.32)';
    context.fillRect(0, 0, 1280, 720);

    drawPanel(context, 270, 62, 740, 594, 'CITY HIGHWAY RACER');

    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '800 26px Inter, system-ui, sans-serif';
    drawOutlinedText(context, `Level ${level.levelNumber}: ${level.fromCity} → ${level.toCity}`, 640, 168, '#bbf7d0');

    context.font = '600 20px Inter, system-ui, sans-serif';
    context.fillStyle = '#e5e7eb';
    context.fillText('Drive between cities, avoid traffic, pits, and accidents.', 640, 218);
    context.fillText('Pass slower vehicles safely for bonus points.', 640, 250);
    context.fillText('Collect cargo and keep speed between 80 and 300 km/h.', 640, 282);
    context.fillText('After 5 seconds outside the range, you lose 1 point per second.', 640, 314);

    context.textAlign = 'left';
    context.font = '700 20px Inter, system-ui, sans-serif';
    context.fillStyle = '#fef08a';
    context.fillText('Controls', 402, 362);
    context.fillStyle = '#f8fafc';
    context.font = '500 18px Inter, system-ui, sans-serif';
    context.fillText('↑ / W  Accelerate', 402, 398);
    context.fillText('↓ / S  Decelerate', 402, 430);
    context.fillText('← / A  Steer left', 402, 462);
    context.fillText('→ / D  Steer right', 402, 494);
    context.fillText('Touch: on-screen GO, BRAKE, ←, →', 402, 526);
    context.fillText('P pauses. Esc opens pause, then exits from pause.', 402, 548);

    context.textAlign = 'left';
    context.fillStyle = '#93c5fd';
    context.font = '600 18px Inter, system-ui, sans-serif';
    context.fillText(`Current score: ${this.options.score}`, 700, 398);
    context.fillText(`Route distance: ${(level.distanceMeters / 1000).toFixed(1)} km`, 700, 430);
    context.fillText(`Speed range: ${level.startingMinimumSpeedKmh}-${level.startingMaximumSpeedKmh} km/h`, 700, 462);
    context.fillText('AI traffic steers around slower vehicles', 700, 494);
    drawScreenControls(context, engine, this.getScreenControlsLayout(engine));

    this.drawAssetReadiness(context, engine);
    context.restore();
  }

  private getScreenControlsLayout(engine: GameEngine): ScreenControlLayout {
    if (engine.isCompactViewport()) return { x: 982, y: 518, density: 'compact' };
    return { x: 704, y: 512 };
  }

  private drawAssetReadiness(context: CanvasRenderingContext2D, engine: GameEngine): void {
    const state = engine.assets.getState();
    const loaded = engine.assets.getLoadedCount();
    const total = engine.assets.getTotalCount();

    if (state === 'ready') {
      drawButton(context, 'PRESS ENTER OR TAP TO START', 405, 574, 470, 58);
      return;
    }

    if (state === 'failed') {
      context.font = '800 18px Inter, system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillStyle = '#fecaca';
      context.fillText(engine.assets.getFailedMessage(), 640, 585);
      drawButton(context, 'RETRY ASSET DOWNLOAD', 430, 606, 420, 50);
      return;
    }

    context.textAlign = 'center';
    context.font = '900 22px Inter, system-ui, sans-serif';
    context.fillStyle = '#bfdbfe';
    context.fillText(`LOADING ASSETS ${loaded}/${total}`, 640, 588);
    context.fillStyle = 'rgba(255,255,255,0.16)';
    context.fillRect(430, 610, 420, 14);
    context.fillStyle = '#38bdf8';
    context.fillRect(430, 610, total > 0 ? 420 * (loaded / total) : 0, 14);
  }
}
