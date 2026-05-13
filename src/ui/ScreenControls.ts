import type { GameEngine } from '../core/GameEngine.js';
import { drawRoundedRectangle, fillRoundedRectangle, strokeRoundedRectangle } from '../rendering/CanvasDrawing.js';
import type { Rectangle, Vector2 } from '../types/Geometry.js';

export interface ScreenControlLayout {
  readonly x: number;
  readonly y: number;
  readonly includeEndGameButton?: boolean;
  readonly includePauseButton?: boolean;
  readonly includeAudioButtons?: boolean;
  readonly density?: 'regular' | 'compact';
}

export type ScreenControlAction = 'none' | 'music' | 'effects' | 'endGame' | 'pause';

const audioButtonWidth = 136;
const endButtonWidth = 108;
const buttonHeight = 36;
const gap = 10;
const compactButtonSize = 44;
const compactPauseButtonSize = 84;

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
  if (layout.includeAudioButtons !== false) {
    const musicRect = musicButtonRectangle(layout);
    const effectsRect = effectsButtonRectangle(layout);

    drawToggleButton(context, musicRect, 'Music', engine.audio.isMusicEnabled(), 'M', layout.density);
    drawToggleButton(context, effectsRect, 'Sound', engine.audio.isEffectsEnabled(), 'N', layout.density);
  }

  if (layout.includePauseButton) {
    drawPauseButton(context, pauseButtonRectangle(layout), layout.density);
  }

  if (layout.includeEndGameButton) {
    drawEndGameButton(context, endGameButtonRectangle(layout), layout.density);
  }
}

function hitTestScreenControls(point: Vector2, layout: ScreenControlLayout): ScreenControlAction {
  if (layout.includeAudioButtons !== false && pointInsideRectangle(point, musicButtonRectangle(layout))) return 'music';
  if (layout.includeAudioButtons !== false && pointInsideRectangle(point, effectsButtonRectangle(layout))) return 'effects';
  if (layout.includePauseButton && pointInsideRectangle(point, pauseButtonRectangle(layout))) return 'pause';
  if (layout.includeEndGameButton && pointInsideRectangle(point, endGameButtonRectangle(layout))) return 'endGame';
  return 'none';
}

function musicButtonRectangle(layout: ScreenControlLayout): Rectangle {
  if (layout.density === 'compact') return { x: layout.x, y: layout.y, width: compactButtonSize, height: compactButtonSize };
  return { x: layout.x, y: layout.y, width: audioButtonWidth, height: buttonHeight };
}

function effectsButtonRectangle(layout: ScreenControlLayout): Rectangle {
  if (layout.density === 'compact') return { x: layout.x + compactButtonSize + gap, y: layout.y, width: compactButtonSize, height: compactButtonSize };
  return { x: layout.x + audioButtonWidth + gap, y: layout.y, width: audioButtonWidth, height: buttonHeight };
}

function pauseButtonRectangle(layout: ScreenControlLayout): Rectangle {
  if (layout.density === 'compact') return { x: layout.x, y: layout.y, width: compactPauseButtonSize, height: compactPauseButtonSize };
  const audioOffset = layout.includeAudioButtons === false ? 0 : audioButtonWidth * 2 + gap * 2;
  return { x: layout.x + audioOffset, y: layout.y, width: endButtonWidth, height: buttonHeight };
}

function endGameButtonRectangle(layout: ScreenControlLayout): Rectangle {
  if (layout.density === 'compact') {
    const pauseOffset = layout.includePauseButton ? compactButtonSize + gap : 0;
    return { x: layout.x + pauseOffset, y: layout.y, width: compactButtonSize, height: compactButtonSize };
  }

  const audioOffset = layout.includeAudioButtons === false ? 0 : audioButtonWidth * 2 + gap * 2;
  const pauseOffset = layout.includePauseButton ? endButtonWidth + gap : 0;
  return { x: layout.x + audioOffset + pauseOffset, y: layout.y, width: endButtonWidth, height: buttonHeight };
}

function drawToggleButton(context: CanvasRenderingContext2D, rectangle: Rectangle, label: string, isEnabled: boolean, shortcut: string, density: ScreenControlLayout['density']): void {
  const fillStyle = isEnabled ? 'rgba(22, 101, 52, 0.88)' : 'rgba(69, 10, 10, 0.88)';
  const strokeStyle = isEnabled ? '#86efac' : '#fca5a5';
  const statusText = isEnabled ? 'ON' : 'OFF';

  context.save();
  fillRoundedRectangle(context, rectangle.x, rectangle.y, rectangle.width, rectangle.height, density === 'compact' ? 14 : 12, fillStyle);
  strokeRoundedRectangle(context, rectangle.x, rectangle.y, rectangle.width, rectangle.height, density === 'compact' ? 14 : 12, strokeStyle, 2);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = density === 'compact' ? '900 13px Inter, system-ui, sans-serif' : '800 14px Inter, system-ui, sans-serif';
  context.fillStyle = '#ffffff';
  context.fillText(density === 'compact' ? (label === 'Music' ? 'M' : 'S') : `${label}: ${statusText}`, rectangle.x + rectangle.width / 2, rectangle.y + (density === 'compact' ? 17 : 14));
  context.font = density === 'compact' ? '800 9px Inter, system-ui, sans-serif' : '600 10px Inter, system-ui, sans-serif';
  context.fillStyle = 'rgba(255, 255, 255, 0.78)';
  context.fillText(density === 'compact' ? statusText : `Tap / ${shortcut}`, rectangle.x + rectangle.width / 2, rectangle.y + (density === 'compact' ? 31 : 28));
  context.restore();
}

function drawPauseButton(context: CanvasRenderingContext2D, rectangle: Rectangle, density: ScreenControlLayout['density']): void {
  if (density === 'compact') {
    drawCompactPauseButton(context, rectangle);
    return;
  }

  context.save();
  fillRoundedRectangle(context, rectangle.x, rectangle.y, rectangle.width, rectangle.height, 12, 'rgba(30, 64, 175, 0.9)');
  strokeRoundedRectangle(context, rectangle.x, rectangle.y, rectangle.width, rectangle.height, 12, '#bfdbfe', 2);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#ffffff';
  context.font = '900 14px Inter, system-ui, sans-serif';
  context.fillText('II', rectangle.x + rectangle.width / 2, rectangle.y + 14);
  context.font = '600 10px Inter, system-ui, sans-serif';
  context.fillStyle = 'rgba(255, 255, 255, 0.78)';
  context.fillText('Tap / P', rectangle.x + rectangle.width / 2, rectangle.y + 28);
  context.restore();
}

function drawCompactPauseButton(context: CanvasRenderingContext2D, rectangle: Rectangle): void {
  const radius = 24;
  const gradient = context.createLinearGradient(rectangle.x, rectangle.y, rectangle.x, rectangle.y + rectangle.height);
  gradient.addColorStop(0, 'rgba(37, 99, 235, 0.9)');
  gradient.addColorStop(1, 'rgba(29, 78, 216, 0.82)');

  context.save();
  context.shadowColor = 'rgba(0, 0, 0, 0.38)';
  context.shadowBlur = 18;
  context.shadowOffsetY = 9;
  drawRoundedRectangle(context, rectangle.x, rectangle.y, rectangle.width, rectangle.height, radius);
  context.fillStyle = gradient;
  context.fill();
  context.shadowBlur = 0;
  strokeRoundedRectangle(context, rectangle.x, rectangle.y, rectangle.width, rectangle.height, radius, 'rgba(255, 255, 255, 0.92)', 5);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#ffffff';
  context.font = '900 19px Inter, system-ui, sans-serif';
  context.fillText('PAUSE', rectangle.x + rectangle.width / 2, rectangle.y + rectangle.height / 2 + 1);
  context.restore();
}

function drawEndGameButton(context: CanvasRenderingContext2D, rectangle: Rectangle, density: ScreenControlLayout['density']): void {
  context.save();
  fillRoundedRectangle(context, rectangle.x, rectangle.y, rectangle.width, rectangle.height, density === 'compact' ? 14 : 12, 'rgba(127, 29, 29, 0.9)');
  strokeRoundedRectangle(context, rectangle.x, rectangle.y, rectangle.width, rectangle.height, density === 'compact' ? 14 : 12, '#fecaca', 2);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = density === 'compact' ? '900 16px Inter, system-ui, sans-serif' : '900 14px Inter, system-ui, sans-serif';
  context.fillStyle = '#ffffff';
  context.fillText(density === 'compact' ? 'X' : 'END', rectangle.x + rectangle.width / 2, rectangle.y + (density === 'compact' ? 18 : 14));
  context.font = density === 'compact' ? '800 9px Inter, system-ui, sans-serif' : '600 10px Inter, system-ui, sans-serif';
  context.fillStyle = 'rgba(255, 255, 255, 0.78)';
  context.fillText(density === 'compact' ? 'Esc' : 'Tap / Esc', rectangle.x + rectangle.width / 2, rectangle.y + (density === 'compact' ? 32 : 28));
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
