import type { GameEngine } from '../core/GameEngine.js';
import { fillRoundedRectangle, strokeRoundedRectangle } from '../rendering/CanvasDrawing.js';
import type { Rectangle, Vector2 } from '../types/Geometry.js';

export interface ScreenControlLayout {
  readonly x: number;
  readonly y: number;
  readonly includeEndGameButton?: boolean;
}

export type ScreenControlAction = 'none' | 'music' | 'effects' | 'endGame';

const audioButtonWidth = 136;
const endButtonWidth = 108;
const buttonHeight = 36;
const gap = 10;

export function handleScreenControlInput(engine: GameEngine, layout: ScreenControlLayout): ScreenControlAction {
  if (engine.input.consumePressed('m', 'M')) {
    engine.audio.toggleMusic();
    return 'music';
  }

  if (engine.input.consumePressed('n', 'N')) {
    engine.audio.toggleEffects();
    return 'effects';
  }

  const click = engine.input.getPointerClick();
  if (!click) return 'none';

  const point = engine.clientPointToCanvasPoint(click.clientX, click.clientY);
  const target = hitTestScreenControls(point, layout);
  if (target === 'none') return 'none';

  engine.input.clearPointerClick();

  if (target === 'music') engine.audio.toggleMusic();
  if (target === 'effects') engine.audio.toggleEffects();
  return target;
}

export function drawScreenControls(context: CanvasRenderingContext2D, engine: GameEngine, layout: ScreenControlLayout): void {
  const musicRect = musicButtonRectangle(layout);
  const effectsRect = effectsButtonRectangle(layout);

  drawToggleButton(context, musicRect, 'Music', engine.audio.isMusicEnabled(), 'M');
  drawToggleButton(context, effectsRect, 'Sound', engine.audio.isEffectsEnabled(), 'N');

  if (layout.includeEndGameButton) {
    drawEndGameButton(context, endGameButtonRectangle(layout));
  }
}

function hitTestScreenControls(point: Vector2, layout: ScreenControlLayout): ScreenControlAction {
  if (pointInsideRectangle(point, musicButtonRectangle(layout))) return 'music';
  if (pointInsideRectangle(point, effectsButtonRectangle(layout))) return 'effects';
  if (layout.includeEndGameButton && pointInsideRectangle(point, endGameButtonRectangle(layout))) return 'endGame';
  return 'none';
}

function musicButtonRectangle(layout: ScreenControlLayout): Rectangle {
  return { x: layout.x, y: layout.y, width: audioButtonWidth, height: buttonHeight };
}

function effectsButtonRectangle(layout: ScreenControlLayout): Rectangle {
  return { x: layout.x + audioButtonWidth + gap, y: layout.y, width: audioButtonWidth, height: buttonHeight };
}

function endGameButtonRectangle(layout: ScreenControlLayout): Rectangle {
  return { x: layout.x + audioButtonWidth * 2 + gap * 2, y: layout.y, width: endButtonWidth, height: buttonHeight };
}

function drawToggleButton(context: CanvasRenderingContext2D, rectangle: Rectangle, label: string, isEnabled: boolean, shortcut: string): void {
  const fillStyle = isEnabled ? 'rgba(22, 101, 52, 0.88)' : 'rgba(69, 10, 10, 0.88)';
  const strokeStyle = isEnabled ? '#86efac' : '#fca5a5';
  const statusText = isEnabled ? 'ON' : 'OFF';

  context.save();
  fillRoundedRectangle(context, rectangle.x, rectangle.y, rectangle.width, rectangle.height, 12, fillStyle);
  strokeRoundedRectangle(context, rectangle.x, rectangle.y, rectangle.width, rectangle.height, 12, strokeStyle, 2);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '800 14px Inter, system-ui, sans-serif';
  context.fillStyle = '#ffffff';
  context.fillText(`${label}: ${statusText}`, rectangle.x + rectangle.width / 2, rectangle.y + 14);
  context.font = '600 10px Inter, system-ui, sans-serif';
  context.fillStyle = 'rgba(255, 255, 255, 0.78)';
  context.fillText(`Tap / ${shortcut}`, rectangle.x + rectangle.width / 2, rectangle.y + 28);
  context.restore();
}

function drawEndGameButton(context: CanvasRenderingContext2D, rectangle: Rectangle): void {
  context.save();
  fillRoundedRectangle(context, rectangle.x, rectangle.y, rectangle.width, rectangle.height, 12, 'rgba(127, 29, 29, 0.9)');
  strokeRoundedRectangle(context, rectangle.x, rectangle.y, rectangle.width, rectangle.height, 12, '#fecaca', 2);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '900 14px Inter, system-ui, sans-serif';
  context.fillStyle = '#ffffff';
  context.fillText('END', rectangle.x + rectangle.width / 2, rectangle.y + 14);
  context.font = '600 10px Inter, system-ui, sans-serif';
  context.fillStyle = 'rgba(255, 255, 255, 0.78)';
  context.fillText('Tap / Esc', rectangle.x + rectangle.width / 2, rectangle.y + 28);
  context.restore();
}

function pointInsideRectangle(point: Vector2, rectangle: Rectangle): boolean {
  return (
    point.x >= rectangle.x &&
    point.x <= rectangle.x + rectangle.width &&
    point.y >= rectangle.y &&
    point.y <= rectangle.y + rectangle.height
  );
}
