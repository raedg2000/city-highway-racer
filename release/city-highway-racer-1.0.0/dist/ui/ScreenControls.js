import { fillRoundedRectangle, strokeRoundedRectangle } from '../rendering/CanvasDrawing.js';
const audioButtonWidth = 136;
const endButtonWidth = 108;
const buttonHeight = 36;
const gap = 10;
export function handleScreenControlInput(engine, layout) {
    if (engine.input.consumePressed('m', 'M')) {
        engine.audio.toggleMusic();
        return 'music';
    }
    if (engine.input.consumePressed('n', 'N')) {
        engine.audio.toggleEffects();
        return 'effects';
    }
    const click = engine.input.getPointerClick();
    if (!click)
        return 'none';
    const point = engine.clientPointToCanvasPoint(click.clientX, click.clientY);
    const target = hitTestScreenControls(point, layout);
    if (target === 'none')
        return 'none';
    engine.input.clearPointerClick();
    if (target === 'music')
        engine.audio.toggleMusic();
    if (target === 'effects')
        engine.audio.toggleEffects();
    return target;
}
export function drawScreenControls(context, engine, layout) {
    const musicRect = musicButtonRectangle(layout);
    const effectsRect = effectsButtonRectangle(layout);
    drawToggleButton(context, musicRect, 'Music', engine.audio.isMusicEnabled(), 'M');
    drawToggleButton(context, effectsRect, 'Sound', engine.audio.isEffectsEnabled(), 'N');
    if (layout.includeEndGameButton) {
        drawEndGameButton(context, endGameButtonRectangle(layout));
    }
}
function hitTestScreenControls(point, layout) {
    if (pointInsideRectangle(point, musicButtonRectangle(layout)))
        return 'music';
    if (pointInsideRectangle(point, effectsButtonRectangle(layout)))
        return 'effects';
    if (layout.includeEndGameButton && pointInsideRectangle(point, endGameButtonRectangle(layout)))
        return 'endGame';
    return 'none';
}
function musicButtonRectangle(layout) {
    return { x: layout.x, y: layout.y, width: audioButtonWidth, height: buttonHeight };
}
function effectsButtonRectangle(layout) {
    return { x: layout.x + audioButtonWidth + gap, y: layout.y, width: audioButtonWidth, height: buttonHeight };
}
function endGameButtonRectangle(layout) {
    return { x: layout.x + audioButtonWidth * 2 + gap * 2, y: layout.y, width: endButtonWidth, height: buttonHeight };
}
function drawToggleButton(context, rectangle, label, isEnabled, shortcut) {
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
function drawEndGameButton(context, rectangle) {
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
function pointInsideRectangle(point, rectangle) {
    return (point.x >= rectangle.x &&
        point.x <= rectangle.x + rectangle.width &&
        point.y >= rectangle.y &&
        point.y <= rectangle.y + rectangle.height);
}
