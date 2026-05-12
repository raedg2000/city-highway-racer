import type { GameEngine } from '../core/GameEngine.js';
import type { Scene } from '../core/Scene.js';
import { RoadRenderer } from '../rendering/RoadRenderer.js';
import { drawButton, drawOutlinedText, drawPanel } from '../rendering/CanvasDrawing.js';
import type { ResultSummary } from '../types/GameFlow.js';
import { drawScreenControls, handleScreenControlInput } from '../ui/ScreenControls.js';
import { formatTime } from '../utils/MathUtils.js';
import { PlayScene } from './PlayScene.js';
import { StartScene } from './StartScene.js';

export class ResultScene implements Scene {
  public readonly name = 'result';
  private readonly roadRenderer = new RoadRenderer();

  public constructor(private readonly summary: ResultSummary) {}

  public update(_deltaSeconds: number, engine: GameEngine): void {
    if (handleScreenControlInput(engine, { x: 470, y: 508 }) !== 'none') return;

    if (engine.input.consumePressed('Enter', ' ') || engine.input.consumePointerClick()) {
      engine.setScene(new PlayScene({ levelNumber: this.summary.levelNumber + 1, score: this.summary.totalScore }));
    }

    if (engine.input.consumePressed('Escape')) {
      engine.audio.stopBackgroundMusic();
      engine.setScene(new StartScene({ levelNumber: this.summary.levelNumber + 1, score: this.summary.totalScore }));
    }
  }

  public render(context: CanvasRenderingContext2D, engine: GameEngine): void {
    this.roadRenderer.render(context, 0);
    context.fillStyle = 'rgba(6, 78, 59, 0.55)';
    context.fillRect(0, 0, 1280, 720);

    drawPanel(context, 318, 62, 644, 640, 'ROUTE COMPLETE');

    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '800 24px Inter, system-ui, sans-serif';
    drawOutlinedText(context, `${this.summary.fromCity} → ${this.summary.toCity}`, 640, 154, '#bbf7d0');

    context.font = '700 20px Inter, system-ui, sans-serif';
    context.fillStyle = '#ffffff';
    context.fillText(`Finished in ${formatTime(this.summary.elapsedSeconds)}`, 640, 214);

    context.textAlign = 'left';
    const labelX = 450;
    const valueX = 790;
    const startY = 260;
    const rowGap = 36;
    this.drawScoreRow(context, labelX, valueX, startY, 'Previous score', this.summary.previousScore);
    this.drawScoreRow(context, labelX, valueX, startY + rowGap, 'Cargo bonus', this.summary.cargoScore);
    this.drawScoreRow(context, labelX, valueX, startY + rowGap * 2, 'Safe passing bonus', this.summary.passingScore);
    this.drawScoreRow(context, labelX, valueX, startY + rowGap * 3, 'Speed-limit penalties', -this.summary.speedPenaltyScore);
    this.drawScoreRow(context, labelX, valueX, startY + rowGap * 4, 'Completion bonus', this.summary.completionBonus);
    this.drawScoreRow(context, labelX, valueX, startY + rowGap * 5, 'Fast finish bonus', this.summary.timeBonus);

    context.strokeStyle = 'rgba(255,255,255,0.3)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(labelX, startY + rowGap * 5.8);
    context.lineTo(valueX + 54, startY + rowGap * 5.8);
    context.stroke();

    context.font = '900 30px Inter, system-ui, sans-serif';
    context.fillStyle = '#fef08a';
    context.textAlign = 'left';
    context.fillText('Total score', labelX, startY + rowGap * 6.55);
    context.textAlign = 'right';
    context.fillText(String(this.summary.totalScore), valueX, startY + rowGap * 6.55);

    drawScreenControls(context, engine, { x: 470, y: 508 });
    drawButton(context, 'NEXT LEVEL', 470, 558, 340, 62);
    context.font = '500 16px Inter, system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillStyle = '#e5e7eb';
    context.fillText('Press Escape to stop at the startup screen.', 640, 642);
    context.restore();
  }

  private drawScoreRow(context: CanvasRenderingContext2D, labelX: number, valueX: number, y: number, label: string, value: number): void {
    context.font = '600 19px Inter, system-ui, sans-serif';
    context.fillStyle = '#dbeafe';
    context.textAlign = 'left';
    context.fillText(label, labelX, y);
    context.textAlign = 'right';
    context.fillStyle = '#ffffff';
    context.fillText(String(value), valueX, y);
  }
}
