export function drawRoundedRectangle(context, x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + safeRadius, y);
    context.lineTo(x + width - safeRadius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    context.lineTo(x + width, y + height - safeRadius);
    context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
    context.lineTo(x + safeRadius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    context.lineTo(x, y + safeRadius);
    context.quadraticCurveTo(x, y, x + safeRadius, y);
    context.closePath();
}
export function fillRoundedRectangle(context, x, y, width, height, radius, fillStyle) {
    drawRoundedRectangle(context, x, y, width, height, radius);
    context.fillStyle = fillStyle;
    context.fill();
}
export function strokeRoundedRectangle(context, x, y, width, height, radius, strokeStyle, lineWidth = 2) {
    drawRoundedRectangle(context, x, y, width, height, radius);
    context.strokeStyle = strokeStyle;
    context.lineWidth = lineWidth;
    context.stroke();
}
export function drawOutlinedText(context, text, x, y, fillStyle = '#ffffff', strokeStyle = 'rgba(0, 0, 0, 0.5)', strokeWidth = 5) {
    context.lineWidth = strokeWidth;
    context.strokeStyle = strokeStyle;
    context.strokeText(text, x, y);
    context.fillStyle = fillStyle;
    context.fillText(text, x, y);
}
export function drawPanel(context, x, y, width, height, title) {
    context.save();
    context.shadowColor = 'rgba(0, 0, 0, 0.35)';
    context.shadowBlur = 18;
    context.shadowOffsetY = 8;
    fillRoundedRectangle(context, x, y, width, height, 18, 'rgba(11, 24, 38, 0.88)');
    context.shadowBlur = 0;
    strokeRoundedRectangle(context, x, y, width, height, 18, 'rgba(255, 255, 255, 0.22)', 2);
    if (title) {
        context.font = '700 30px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        drawOutlinedText(context, title, x + width / 2, y + 42, '#fef08a');
    }
    context.restore();
}
export function drawButton(context, label, x, y, width, height) {
    context.save();
    context.shadowColor = 'rgba(0, 0, 0, 0.35)';
    context.shadowBlur = 14;
    context.shadowOffsetY = 5;
    fillRoundedRectangle(context, x, y, width, height, 16, '#facc15');
    context.shadowBlur = 0;
    strokeRoundedRectangle(context, x, y, width, height, 16, '#fff7ad', 3);
    context.font = '800 26px Inter, system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    drawOutlinedText(context, label, x + width / 2, y + height / 2, '#1f2937', 'rgba(255,255,255,0.65)', 2);
    context.restore();
}
