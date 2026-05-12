import type { GameEngine } from '../core/GameEngine.js';
import type { Scene } from '../core/Scene.js';
import { RoadRenderer } from '../rendering/RoadRenderer.js';
import { drawButton, drawOutlinedText, drawPanel } from '../rendering/CanvasDrawing.js';
import type { FailureSummary } from '../types/GameFlow.js';
import { drawScreenControls, handleScreenControlInput } from '../ui/ScreenControls.js';
import { formatTime } from '../utils/MathUtils.js';
import { PlayScene } from './PlayScene.js';
import { StartScene } from './StartScene.js';

export class FailScene implements Scene {
  public readonly name = 'fail';
  private readonly roadRenderer = new RoadRenderer();

  public constructor(private readonly summary: FailureSummary) {}

  public enter(engine: GameEngine): void {
    engine.audio.stopBackgroundMusic();
  }

  public update(_deltaSeconds: number, engine: GameEngine): void {
    if (handleScreenControlInput(engine, { x: 470, y: 436 }) !== 'none') return;

    if (engine.input.consumePressed('Enter', ' ') || engine.input.consumePointerClick()) {
      void engine.audio.startBackgroundMusic();
      engine.setScene(new PlayScene({ levelNumber: this.summary.levelNumber, score: this.summary.score }));
    }

    if (engine.input.consumePressed('Escape')) {
      engine.setScene(new StartScene({ levelNumber: this.summary.levelNumber, score: this.summary.score }));
    }
  }

  public render(context: CanvasRenderingContext2D, engine: GameEngine): void {
    this.roadRenderer.render(context, this.summary.distanceMeters);
    context.fillStyle = 'rgba(69, 10, 10, 0.58)';
    context.fillRect(0, 0, 1280, 720);

    drawPanel(context, 330, 106, 620, 492, 'LEVEL FAILED');

    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '800 24px Inter, system-ui, sans-serif';
    drawOutlinedText(context, `${this.summary.fromCity} → ${this.summary.toCity}`, 640, 194, '#fecaca');

    context.font = '600 20px Inter, system-ui, sans-serif';
    context.fillStyle = '#ffffff';
    this.wrapText(context, this.summary.reason, 640, 258, 490, 30);

    const percent = Math.round((this.summary.distanceMeters / this.summary.levelDistanceMeters) * 100);
    context.font = '700 19px Inter, system-ui, sans-serif';
    context.fillStyle = '#fef3c7';
    context.fillText(`Progress: ${percent}%`, 640, 348);
    context.fillText(`Time: ${formatTime(this.summary.elapsedSeconds)}`, 640, 382);
    context.fillText(`Score kept: ${this.summary.score}`, 640, 416);

    drawScreenControls(context, engine, { x: 470, y: 436 });
    drawButton(context, 'RETRY LEVEL', 470, 486, 340, 62);
    context.font = '500 16px Inter, system-ui, sans-serif';
    context.fillStyle = '#e5e7eb';
    context.fillText('Press Escape to return to the startup screen.', 640, 570);
    context.restore();
  }

  private wrapText(context: CanvasRenderingContext2D, text: string, centerX: number, startY: number, maxWidth: number, lineHeight: number): void {
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (context.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);

    lines.forEach((lineText, index) => context.fillText(lineText, centerX, startY + index * lineHeight));
  }
}
