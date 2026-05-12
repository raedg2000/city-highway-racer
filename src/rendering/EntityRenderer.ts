import type { Cargo } from '../entities/Cargo.js';
import type { AccidentVehicleVisual, Obstacle } from '../entities/Obstacle.js';
import { drawOutlinedText, fillRoundedRectangle, strokeRoundedRectangle } from './CanvasDrawing.js';

export class EntityRenderer {
  public drawObstacle(context: CanvasRenderingContext2D, obstacle: Obstacle, screenY: number): void {
    if (obstacle.kind === 'pit') this.drawPit(context, obstacle.x, screenY, obstacle.width, obstacle.height);
    else this.drawAccident(context, obstacle, screenY);
  }

  public drawCargo(context: CanvasRenderingContext2D, cargo: Cargo, screenY: number): void {
    const left = cargo.x - cargo.width / 2;
    const top = screenY - cargo.height / 2;
    context.save();
    context.shadowColor = 'rgba(0, 0, 0, 0.28)';
    context.shadowBlur = 12;
    context.shadowOffsetY = 5;
    fillRoundedRectangle(context, left, top, cargo.width, cargo.height, 9, '#d97706');
    context.shadowBlur = 0;
    strokeRoundedRectangle(context, left, top, cargo.width, cargo.height, 9, '#92400e', 3);
    context.strokeStyle = '#fef3c7';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(left + 6, top + 15);
    context.lineTo(left + cargo.width - 6, top + 15);
    context.moveTo(cargo.x, top + 4);
    context.lineTo(cargo.x, top + cargo.height - 4);
    context.stroke();
    context.font = '800 15px Inter, system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    drawOutlinedText(context, `+${cargo.bonusPoints}`, cargo.x, screenY + 2, '#ffffff', 'rgba(0,0,0,0.6)', 4);
    context.restore();
  }

  private drawPit(context: CanvasRenderingContext2D, centerX: number, centerY: number, width: number, height: number): void {
    context.save();
    context.shadowColor = 'rgba(0, 0, 0, 0.35)';
    context.shadowBlur = 12;
    context.fillStyle = '#020617';
    context.beginPath();
    context.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = '#64748b';
    context.lineWidth = 5;
    context.stroke();
    context.strokeStyle = '#1e293b';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(centerX - width / 3, centerY - 4);
    context.lineTo(centerX - 8, centerY + height / 4);
    context.lineTo(centerX + 8, centerY - height / 5);
    context.lineTo(centerX + width / 3, centerY + 3);
    context.stroke();
    context.restore();
  }

  private drawAccident(context: CanvasRenderingContext2D, obstacle: Obstacle, screenY: number): void {
    if (obstacle.accidentVehicles.length === 0) {
      this.drawLegacyAccident(context, obstacle.x, screenY, obstacle.width, obstacle.height);
      return;
    }

    context.save();
    this.drawAccidentShadow(context, obstacle.x, screenY, obstacle.width, obstacle.height);
    this.drawSkidMarks(context, obstacle.x, screenY, obstacle.width, obstacle.height);
    this.drawSmoke(context, obstacle.x, screenY, obstacle.width, obstacle.height);

    for (const vehicle of obstacle.accidentVehicles) {
      this.drawDamagedVehicle(context, obstacle.x + vehicle.offsetX, screenY + vehicle.offsetY, vehicle);
    }

    this.drawDebris(context, obstacle.x, screenY, obstacle.width, obstacle.height);
    this.drawTrafficCones(context, obstacle.x, screenY, obstacle.width, obstacle.height);
    context.font = '900 14px Inter, system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    drawOutlinedText(context, 'CRASH', obstacle.x, screenY - obstacle.height / 2 - 8, '#fecaca', 'rgba(0,0,0,0.7)', 4);
    context.restore();
  }

  private drawAccidentShadow(context: CanvasRenderingContext2D, centerX: number, centerY: number, width: number, height: number): void {
    context.save();
    context.fillStyle = 'rgba(0, 0, 0, 0.22)';
    context.beginPath();
    context.ellipse(centerX, centerY + 10, width * 0.48, height * 0.42, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  private drawSkidMarks(context: CanvasRenderingContext2D, centerX: number, centerY: number, width: number, height: number): void {
    context.save();
    context.strokeStyle = 'rgba(15, 23, 42, 0.52)';
    context.lineWidth = 5;
    context.lineCap = 'round';
    for (const side of [-1, 1] as const) {
      context.beginPath();
      context.moveTo(centerX + side * width * 0.16, centerY + height * 0.48);
      context.quadraticCurveTo(centerX + side * width * 0.32, centerY + height * 0.08, centerX + side * width * 0.08, centerY - height * 0.42);
      context.stroke();
    }
    context.restore();
  }

  private drawSmoke(context: CanvasRenderingContext2D, centerX: number, centerY: number, width: number, height: number): void {
    context.save();
    context.fillStyle = 'rgba(71, 85, 105, 0.38)';
    const smokePuffs = [
      { x: -0.18, y: -0.4, r: 17 },
      { x: 0.04, y: -0.48, r: 21 },
      { x: 0.24, y: -0.34, r: 14 }
    ];
    for (const puff of smokePuffs) {
      context.beginPath();
      context.arc(centerX + puff.x * width, centerY + puff.y * height, puff.r, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  private drawDamagedVehicle(context: CanvasRenderingContext2D, centerX: number, centerY: number, vehicle: AccidentVehicleVisual): void {
    context.save();
    context.translate(centerX, centerY);
    context.rotate(vehicle.rotationRadians);
    context.shadowColor = 'rgba(0, 0, 0, 0.34)';
    context.shadowBlur = 10;
    context.shadowOffsetY = 5;

    if (vehicle.kind === 'motorcycle') this.drawDamagedMotorcycle(context, vehicle);
    else if (vehicle.kind === 'truck') this.drawDamagedTruck(context, vehicle);
    else if (vehicle.kind === 'bus') this.drawDamagedBus(context, vehicle);
    else this.drawDamagedCarLikeVehicle(context, vehicle);

    this.drawDamageMarks(context, vehicle.width, vehicle.height);
    context.restore();
  }

  private drawDamagedCarLikeVehicle(context: CanvasRenderingContext2D, vehicle: AccidentVehicleVisual): void {
    const width = vehicle.width;
    const height = vehicle.height;
    const left = -width / 2;
    const top = -height / 2;
    fillRoundedRectangle(context, left, top, width, height, 13, vehicle.color);
    strokeRoundedRectangle(context, left, top, width, height, 13, '#7f1d1d', 3);
    fillRoundedRectangle(context, left + 8, top + 10, width - 16, 18, 8, '#111827');
    fillRoundedRectangle(context, left + 9, top + height - 32, width - 18, 22, 8, '#1f2937');
    fillRoundedRectangle(context, left + 10, top + height * 0.46, width - 20, 15, 8, 'rgba(255,255,255,0.24)');

    if (vehicle.kind === 'pickup') {
      fillRoundedRectangle(context, left + 8, top + height - 34, width - 16, 24, 6, 'rgba(15, 23, 42, 0.32)');
    }
  }

  private drawDamagedTruck(context: CanvasRenderingContext2D, vehicle: AccidentVehicleVisual): void {
    const width = vehicle.width;
    const height = vehicle.height;
    const left = -width / 2;
    const top = -height / 2;
    fillRoundedRectangle(context, left + 3, top + 38, width - 6, height - 42, 8, vehicle.color);
    strokeRoundedRectangle(context, left + 3, top + 38, width - 6, height - 42, 8, '#7f1d1d', 3);
    fillRoundedRectangle(context, left, top, width, 46, 10, '#f97316');
    fillRoundedRectangle(context, left + 10, top + 9, width - 20, 16, 7, '#111827');
  }

  private drawDamagedBus(context: CanvasRenderingContext2D, vehicle: AccidentVehicleVisual): void {
    const width = vehicle.width;
    const height = vehicle.height;
    const left = -width / 2;
    const top = -height / 2;
    fillRoundedRectangle(context, left, top, width, height, 13, vehicle.color);
    strokeRoundedRectangle(context, left, top, width, height, 13, '#7f1d1d', 3);
    fillRoundedRectangle(context, left + 8, top + 9, width - 16, 18, 8, '#111827');
    context.fillStyle = 'rgba(255,255,255,0.38)';
    for (let y = top + 36; y < top + height - 20; y += 22) {
      fillRoundedRectangle(context, left + 8, y, 14, 12, 4, 'rgba(255,255,255,0.38)');
      fillRoundedRectangle(context, left + width - 22, y, 14, 12, 4, 'rgba(255,255,255,0.38)');
    }
  }

  private drawDamagedMotorcycle(context: CanvasRenderingContext2D, vehicle: AccidentVehicleVisual): void {
    const width = vehicle.width;
    const height = vehicle.height;
    context.fillStyle = '#111827';
    context.beginPath();
    context.ellipse(0, -height / 2 + 8, width * 0.36, 8, 0, 0, Math.PI * 2);
    context.ellipse(0, height / 2 - 8, width * 0.36, 8, 0, 0, Math.PI * 2);
    context.fill();
    fillRoundedRectangle(context, -width / 2 + 7, -height / 2 + 10, width - 14, height - 20, 8, vehicle.color);
    fillRoundedRectangle(context, -7, -10, 14, 21, 7, '#0f172a');
  }

  private drawDamageMarks(context: CanvasRenderingContext2D, width: number, height: number): void {
    context.shadowBlur = 0;
    context.strokeStyle = '#111827';
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(-width * 0.22, -height * 0.3);
    context.lineTo(width * 0.18, height * 0.22);
    context.moveTo(width * 0.24, -height * 0.32);
    context.lineTo(-width * 0.14, height * 0.1);
    context.stroke();

    context.fillStyle = 'rgba(239, 68, 68, 0.55)';
    context.beginPath();
    context.arc(width * 0.28, height * 0.18, 7, 0, Math.PI * 2);
    context.fill();
  }

  private drawDebris(context: CanvasRenderingContext2D, centerX: number, centerY: number, width: number, height: number): void {
    context.save();
    const pieces = [
      [-0.45, -0.08, '#94a3b8'],
      [-0.32, 0.28, '#f97316'],
      [-0.08, 0.44, '#facc15'],
      [0.33, 0.12, '#94a3b8'],
      [0.45, -0.18, '#ef4444']
    ] as const;

    for (const [xRatio, yRatio, color] of pieces) {
      context.fillStyle = color;
      context.beginPath();
      context.arc(centerX + xRatio * width, centerY + yRatio * height, 4, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  private drawTrafficCones(context: CanvasRenderingContext2D, centerX: number, centerY: number, width: number, height: number): void {
    for (let i = 0; i < 3; i += 1) {
      const coneX = centerX - width * 0.36 + i * width * 0.36;
      const coneY = centerY + height * 0.52 + (i % 2) * 6;
      context.fillStyle = '#fb923c';
      context.beginPath();
      context.moveTo(coneX, coneY - 18);
      context.lineTo(coneX - 10, coneY + 10);
      context.lineTo(coneX + 10, coneY + 10);
      context.closePath();
      context.fill();
      context.strokeStyle = '#7c2d12';
      context.lineWidth = 2;
      context.stroke();
    }
  }

  private drawLegacyAccident(context: CanvasRenderingContext2D, centerX: number, centerY: number, width: number, height: number): void {
    context.save();
    const left = centerX - width / 2;
    const top = centerY - height / 2;
    fillRoundedRectangle(context, left + 8, top + 14, width - 18, height - 32, 9, '#ef4444');
    strokeRoundedRectangle(context, left + 8, top + 14, width - 18, height - 32, 9, '#7f1d1d', 3);
    context.strokeStyle = '#111827';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(left + 16, top + 18);
    context.lineTo(left + width - 18, top + height - 20);
    context.moveTo(left + width - 16, top + 18);
    context.lineTo(left + 18, top + height - 22);
    context.stroke();
    this.drawTrafficCones(context, centerX, centerY, width, height);
    context.restore();
  }
}
