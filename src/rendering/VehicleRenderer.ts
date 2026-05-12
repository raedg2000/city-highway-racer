import { GameConfig } from '../config/GameConfig.js';
import type { PlayerCar } from '../entities/PlayerCar.js';
import type { TrafficVehicle, TrafficVehicleKind } from '../entities/TrafficVehicle.js';
import { clamp } from '../utils/MathUtils.js';
import { drawOutlinedText, fillRoundedRectangle, strokeRoundedRectangle } from './CanvasDrawing.js';

export class VehicleRenderer {
  public drawPlayer(context: CanvasRenderingContext2D, player: PlayerCar, speedKmh = 0, passingPulseSeconds = 0): void {
    const speedIntensity = clamp(speedKmh / GameConfig.player.maximumSpeedKmh, 0, 1);
    this.drawPlayerMotionTrail(context, player.x, player.getScreenY(), player.width, player.height, speedIntensity, passingPulseSeconds);
    this.drawVehicleBody(context, player.x, player.getScreenY(), player.width, player.height, '#ef2525', 'car', true, false);
  }

  public drawTrafficVehicle(context: CanvasRenderingContext2D, vehicle: TrafficVehicle, screenY: number): void {
    context.save();
    if (vehicle.hasBeenOvertaken) context.globalAlpha = 0.78;
    this.drawVehicleBody(context, vehicle.x, screenY, vehicle.width, vehicle.height, vehicle.color, vehicle.kind, false, vehicle.hasBeenOvertaken);

    if (vehicle.isChangingLane()) {
      this.drawLaneChangeArrow(context, vehicle.x, screenY - vehicle.height / 2 - 17, vehicle.laneChangeDirection());
    }

    if (vehicle.isBraking || vehicle.avoidanceAlertSeconds > 0) {
      this.drawAvoidanceCue(context, vehicle.x, screenY, vehicle.width, vehicle.height, vehicle.isBraking);
    }

    if (vehicle.hasBeenOvertaken) {
      context.font = '800 13px Inter, system-ui, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      drawOutlinedText(context, 'PASSED', vehicle.x, screenY - vehicle.height / 2 - 8, '#bbf7d0', 'rgba(0,0,0,0.55)', 3);
    }
    context.restore();
  }

  private drawVehicleBody(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    color: string,
    kind: TrafficVehicleKind | 'car',
    isPlayer: boolean,
    isPassed: boolean
  ): void {
    context.save();
    context.shadowColor = isPassed ? 'rgba(34, 197, 94, 0.42)' : 'rgba(0, 0, 0, 0.35)';
    context.shadowBlur = isPassed ? 16 : 10;
    context.shadowOffsetY = 6;

    if (kind === 'truck') this.drawTruck(context, centerX, centerY, width, height, color);
    else if (kind === 'bus') this.drawBus(context, centerX, centerY, width, height, color);
    else if (kind === 'pickup') this.drawPickup(context, centerX, centerY, width, height, color);
    else if (kind === 'motorcycle') this.drawMotorcycle(context, centerX, centerY, width, height, color);
    else this.drawCar(context, centerX, centerY, width, height, color, isPlayer);

    context.restore();
  }

  private drawPlayerMotionTrail(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    speedIntensity: number,
    passingPulseSeconds: number
  ): void {
    if (speedIntensity < 0.12 && passingPulseSeconds <= 0) return;

    const pulseIntensity = clamp(passingPulseSeconds / 0.75, 0, 1);
    const trailLength = 22 + speedIntensity * 94 + pulseIntensity * 34;
    const alpha = 0.1 + speedIntensity * 0.22 + pulseIntensity * 0.2;

    context.save();
    context.lineCap = 'round';
    context.lineWidth = 5;
    context.strokeStyle = `rgba(248, 250, 252, ${alpha})`;
    for (let index = 0; index < 4; index += 1) {
      const sideOffset = (index - 1.5) * (width * 0.34);
      const x = centerX + sideOffset;
      context.beginPath();
      context.moveTo(x, centerY + height * 0.35);
      context.lineTo(x, centerY + height * 0.35 + trailLength * (0.68 + index * 0.08));
      context.stroke();
    }

    if (pulseIntensity > 0) {
      context.strokeStyle = `rgba(250, 204, 21, ${0.2 + pulseIntensity * 0.34})`;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(centerX, centerY, width * (0.85 + pulseIntensity * 0.25), 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }

  private drawCar(context: CanvasRenderingContext2D, centerX: number, centerY: number, width: number, height: number, color: string, isPlayer: boolean): void {
    const left = centerX - width / 2;
    const top = centerY - height / 2;
    this.drawCarWheels(context, left, top, width, height);
    fillRoundedRectangle(context, left, top, width, height, 15, color);
    strokeRoundedRectangle(context, left, top, width, height, 15, 'rgba(15, 23, 42, 0.75)', 3);

    fillRoundedRectangle(context, left + 8, top + 10, width - 16, 18, 8, '#111827');
    fillRoundedRectangle(context, left + 9, top + height - 32, width - 18, 23, 9, '#1f2937');
    fillRoundedRectangle(context, left + 12, top + 36, width - 24, 17, 8, isPlayer ? '#7dd3fc' : 'rgba(255,255,255,0.45)');

    context.fillStyle = 'rgba(255,255,255,0.38)';
    context.beginPath();
    context.moveTo(left + 13, top + 12);
    context.lineTo(left + width - 16, top + 12);
    context.lineTo(left + width - 22, top + 21);
    context.lineTo(left + 18, top + 21);
    context.closePath();
    context.fill();

    context.fillStyle = '#fde68a';
    context.fillRect(left + 7, top + 3, 9, 6);
    context.fillRect(left + width - 16, top + 3, 9, 6);
    context.fillStyle = '#991b1b';
    context.fillRect(left + 8, top + height - 8, 10, 5);
    context.fillRect(left + width - 18, top + height - 8, 10, 5);
  }

  private drawPickup(context: CanvasRenderingContext2D, centerX: number, centerY: number, width: number, height: number, color: string): void {
    const left = centerX - width / 2;
    const top = centerY - height / 2;
    this.drawCarWheels(context, left, top, width, height);
    fillRoundedRectangle(context, left, top, width, height, 12, color);
    strokeRoundedRectangle(context, left, top, width, height, 12, 'rgba(15, 23, 42, 0.75)', 3);
    fillRoundedRectangle(context, left + 8, top + 10, width - 16, 20, 8, '#111827');
    fillRoundedRectangle(context, left + 7, top + 45, width - 14, height - 55, 6, 'rgba(15, 23, 42, 0.3)');
    context.strokeStyle = 'rgba(255,255,255,0.35)';
    context.lineWidth = 2;
    context.strokeRect(left + 10, top + 50, width - 20, height - 65);
  }

  private drawTruck(context: CanvasRenderingContext2D, centerX: number, centerY: number, width: number, height: number, color: string): void {
    const left = centerX - width / 2;
    const top = centerY - height / 2;
    this.drawLargeVehicleWheels(context, left, top, width, height);
    fillRoundedRectangle(context, left + 4, top + 38, width - 8, height - 42, 9, color);
    strokeRoundedRectangle(context, left + 4, top + 38, width - 8, height - 42, 9, '#475569', 3);
    fillRoundedRectangle(context, left, top, width, 46, 10, '#f97316');
    strokeRoundedRectangle(context, left, top, width, 46, 10, 'rgba(15, 23, 42, 0.75)', 3);
    fillRoundedRectangle(context, left + 10, top + 10, width - 20, 16, 7, '#111827');
    context.strokeStyle = 'rgba(255,255,255,0.42)';
    context.lineWidth = 2;
    for (let y = top + 56; y < top + height - 8; y += 22) {
      context.beginPath();
      context.moveTo(left + 10, y);
      context.lineTo(left + width - 10, y);
      context.stroke();
    }
  }

  private drawBus(context: CanvasRenderingContext2D, centerX: number, centerY: number, width: number, height: number, color: string): void {
    const left = centerX - width / 2;
    const top = centerY - height / 2;
    this.drawLargeVehicleWheels(context, left, top, width, height);
    fillRoundedRectangle(context, left, top, width, height, 13, color);
    strokeRoundedRectangle(context, left, top, width, height, 13, 'rgba(15, 23, 42, 0.75)', 3);
    fillRoundedRectangle(context, left + 8, top + 9, width - 16, 18, 8, '#0f172a');
    context.fillStyle = 'rgba(255,255,255,0.55)';
    for (let y = top + 36; y < top + height - 20; y += 20) {
      fillRoundedRectangle(context, left + 8, y, 14, 12, 4, 'rgba(255,255,255,0.55)');
      fillRoundedRectangle(context, left + width - 22, y, 14, 12, 4, 'rgba(255,255,255,0.55)');
    }
    context.fillStyle = 'rgba(15,23,42,0.28)';
    fillRoundedRectangle(context, left + width / 2 - 10, top + 36, 20, height - 56, 8, 'rgba(15,23,42,0.18)');
  }

  private drawMotorcycle(context: CanvasRenderingContext2D, centerX: number, centerY: number, width: number, height: number, color: string): void {
    const left = centerX - width / 2;
    const top = centerY - height / 2;
    context.fillStyle = '#111827';
    context.beginPath();
    context.ellipse(centerX, top + 8, width * 0.36, 8, 0, 0, Math.PI * 2);
    context.ellipse(centerX, top + height - 8, width * 0.36, 8, 0, 0, Math.PI * 2);
    context.fill();
    fillRoundedRectangle(context, left + 7, top + 10, width - 14, height - 20, 8, color);
    fillRoundedRectangle(context, centerX - 7, centerY - 10, 14, 21, 7, '#0f172a');
    strokeRoundedRectangle(context, left + 7, top + 10, width - 14, height - 20, 8, 'rgba(15, 23, 42, 0.75)', 2);
  }

  private drawCarWheels(context: CanvasRenderingContext2D, left: number, top: number, width: number, height: number): void {
    fillRoundedRectangle(context, left - 5, top + 14, 9, 18, 4, '#111827');
    fillRoundedRectangle(context, left + width - 4, top + 14, 9, 18, 4, '#111827');
    fillRoundedRectangle(context, left - 5, top + height - 32, 9, 18, 4, '#111827');
    fillRoundedRectangle(context, left + width - 4, top + height - 32, 9, 18, 4, '#111827');
  }

  private drawLargeVehicleWheels(context: CanvasRenderingContext2D, left: number, top: number, width: number, height: number): void {
    for (const wheelY of [top + 16, top + height * 0.47, top + height - 28]) {
      fillRoundedRectangle(context, left - 6, wheelY, 10, 18, 4, '#111827');
      fillRoundedRectangle(context, left + width - 4, wheelY, 10, 18, 4, '#111827');
    }
  }

  private drawAvoidanceCue(context: CanvasRenderingContext2D, centerX: number, centerY: number, width: number, height: number, isBraking: boolean): void {
    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '900 16px Inter, system-ui, sans-serif';
    if (isBraking) {
      fillRoundedRectangle(context, centerX - width / 2 - 8, centerY + height / 2 - 15, 8, 18, 4, '#ef4444');
      fillRoundedRectangle(context, centerX + width / 2, centerY + height / 2 - 15, 8, 18, 4, '#ef4444');
    }
    drawOutlinedText(context, '!', centerX, centerY - height / 2 - 16, '#fef08a', 'rgba(0,0,0,0.65)', 4);
    context.restore();
  }

  private drawLaneChangeArrow(context: CanvasRenderingContext2D, centerX: number, centerY: number, direction: -1 | 0 | 1): void {
    if (direction === 0) return;

    context.save();
    context.strokeStyle = '#fef08a';
    context.fillStyle = '#fef08a';
    context.lineWidth = 4;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    const arrowLength = 26 * direction;
    context.beginPath();
    context.moveTo(centerX - arrowLength * 0.5, centerY);
    context.lineTo(centerX + arrowLength * 0.5, centerY);
    context.stroke();
    context.beginPath();
    context.moveTo(centerX + arrowLength * 0.5, centerY);
    context.lineTo(centerX + arrowLength * 0.5 - direction * 9, centerY - 8);
    context.lineTo(centerX + arrowLength * 0.5 - direction * 9, centerY + 8);
    context.closePath();
    context.fill();
    context.restore();
  }
}
