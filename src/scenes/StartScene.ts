import { createLevelDefinition } from '../config/LevelFactory.js';
import type { GameEngine } from '../core/GameEngine.js';
import type { Scene } from '../core/Scene.js';
import { RoadRenderer } from '../rendering/RoadRenderer.js';
import { drawButton, drawOutlinedText, drawPanel } from '../rendering/CanvasDrawing.js';
import type { GameSessionOptions } from '../types/GameFlow.js';
import { drawScreenControls, handleScreenControlInput } from '../ui/ScreenControls.js';
import { PlayScene } from './PlayScene.js';

export class StartScene implements Scene {
  public readonly name = 'start';
  private readonly roadRenderer = new RoadRenderer();
  private readonly options: GameSessionOptions;

  public constructor(options: GameSessionOptions = { levelNumber: 1, score: 0 }) {
    this.options = options;
  }

  public update(_deltaSeconds: number, engine: GameEngine): void {
    if (handleScreenControlInput(engine, { x: 704, y: 512 }) !== 'none') return;

    if (engine.input.consumePressed('Enter', ' ') || engine.input.consumePointerClick()) {
      void engine.audio.startBackgroundMusic();
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
    context.fillText('Drive between cities, avoid traffic, pits, and accidents.', 640, 224);
    context.fillText('Pass slower vehicles safely for bonus points.', 640, 256);
    context.fillText('Collect cargo and respect changing speed signs.', 640, 288);
    context.fillText('After 5 seconds over/under the limit, you lose 1 point per second.', 640, 320);

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
    context.fillText('Esc during play ends the current drive', 402, 548);

    context.textAlign = 'left';
    context.fillStyle = '#93c5fd';
    context.font = '600 18px Inter, system-ui, sans-serif';
    context.fillText(`Current score: ${this.options.score}`, 700, 398);
    context.fillText(`Route distance: ${(level.distanceMeters / 1000).toFixed(1)} km`, 700, 430);
    context.fillText(`Starting speed range: ${level.startingMinimumSpeedKmh}-${level.startingMaximumSpeedKmh} km/h`, 700, 462);
    context.fillText('AI traffic steers around slower vehicles', 700, 494);
    drawScreenControls(context, engine, { x: 704, y: 512 });

    drawButton(context, 'PRESS ENTER OR TAP TO START', 405, 574, 470, 58);
    context.restore();
  }
}
