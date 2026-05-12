import { GameConfig } from '../config/GameConfig.js';
import { createLevelDefinition, type LevelDefinition } from '../config/LevelFactory.js';
import type { GameEngine } from '../core/GameEngine.js';
import type { Scene } from '../core/Scene.js';
import type { Cargo } from '../entities/Cargo.js';
import type { Obstacle } from '../entities/Obstacle.js';
import { PlayerCar } from '../entities/PlayerCar.js';
import type { TrafficVehicle } from '../entities/TrafficVehicle.js';
import { drawOutlinedText, fillRoundedRectangle, strokeRoundedRectangle } from '../rendering/CanvasDrawing.js';
import { EntityRenderer } from '../rendering/EntityRenderer.js';
import { RoadRenderer } from '../rendering/RoadRenderer.js';
import { VehicleRenderer } from '../rendering/VehicleRenderer.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { SpawnSystem } from '../systems/SpawnSystem.js';
import { SpeedLimitSystem, type SpeedLimitStatus } from '../systems/SpeedLimitSystem.js';
import { TrafficSystem } from '../systems/TrafficSystem.js';
import type { FailureSummary, GameSessionOptions, ResultSummary } from '../types/GameFlow.js';
import { drawScreenControls, handleScreenControlInput } from '../ui/ScreenControls.js';
import { clamp, formatTime } from '../utils/MathUtils.js';
import { RandomNumberGenerator } from '../utils/Random.js';
import { FailScene } from './FailScene.js';
import { ResultScene } from './ResultScene.js';
import { StartScene } from './StartScene.js';

interface DrawableEntity {
  readonly screenY: number;
  draw(context: CanvasRenderingContext2D): void;
}

interface FloatingTextEffect {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly fillStyle: string;
  readonly totalSeconds: number;
  secondsRemaining: number;
}

export class PlayScene implements Scene {
  public readonly name = 'play';

  private readonly level: LevelDefinition;
  private readonly previousScore: number;
  private readonly player = new PlayerCar();
  private readonly random: RandomNumberGenerator;
  private readonly spawner: SpawnSystem;
  private readonly speedLimitSystem: SpeedLimitSystem;
  private readonly trafficSystem: TrafficSystem;
  private readonly collisionSystem = new CollisionSystem();
  private readonly roadRenderer = new RoadRenderer();
  private readonly vehicleRenderer = new VehicleRenderer();
  private readonly entityRenderer = new EntityRenderer();

  private readonly trafficVehicles: TrafficVehicle[] = [];
  private readonly obstacles: Obstacle[] = [];
  private readonly cargos: Cargo[] = [];
  private readonly floatingTextEffects: FloatingTextEffect[] = [];

  private elapsedSeconds = 0;
  private cargoScore = 0;
  private passingScore = 0;
  private speedPenaltyScore = 0;
  private speedPenaltyAccumulatorSeconds = 0;
  private wasSpeedPenaltyActive = false;
  private passedVehicleCount = 0;
  private passingPulseSeconds = 0;
  private speedLimitStatus: SpeedLimitStatus;
  private lastCargoPopupText = '';
  private cargoPopupSeconds = 0;

  public constructor(options: GameSessionOptions) {
    this.level = createLevelDefinition(options.levelNumber);
    this.previousScore = options.score;
    this.random = new RandomNumberGenerator(this.level.seed);
    this.spawner = new SpawnSystem(this.level, this.random);
    this.speedLimitSystem = new SpeedLimitSystem(this.level, this.random);
    this.trafficSystem = new TrafficSystem(this.level, this.random);
    this.speedLimitStatus = this.speedLimitSystem.getStatus(false);
  }

  public enter(engine: GameEngine): void {
    void engine.audio.startBackgroundMusic();
  }

  public update(deltaSeconds: number, engine: GameEngine): void {
    if (this.handleExitOrSettings(engine)) return;

    this.elapsedSeconds += deltaSeconds;
    this.cargoPopupSeconds = Math.max(0, this.cargoPopupSeconds - deltaSeconds);
    this.passingPulseSeconds = Math.max(0, this.passingPulseSeconds - deltaSeconds);
    this.updateFloatingTextEffects(deltaSeconds);

    this.player.update(deltaSeconds, engine.input);
    this.speedLimitStatus = this.speedLimitSystem.update(deltaSeconds, this.player.speedKmh, this.player.distanceMeters);
    this.applySpeedLimitPenalty(deltaSeconds);

    const spawnedEntities = this.spawner.update(deltaSeconds, this.player.distanceMeters, this.player.speedKmh, this.trafficVehicles);
    this.trafficVehicles.push(...spawnedEntities.trafficVehicles);
    this.obstacles.push(...spawnedEntities.obstacles);
    this.cargos.push(...spawnedEntities.cargos);

    const trafficUpdateResult = this.trafficSystem.update(deltaSeconds, this.trafficVehicles);
    if (trafficUpdateResult.accidents.length > 0) {
      this.obstacles.push(...trafficUpdateResult.accidents);
      if (trafficUpdateResult.accidents.some((accident) => this.isEntityVisible(accident.worldDistanceMeters, 120))) {
        engine.audio.playCrash();
      }
    }

    this.markOvertakenTrafficVehicles();
    this.collectCargo(engine);
    this.removeInactiveEntities();

    const trafficCollision = this.collisionSystem.findTrafficCollision(this.player, this.trafficVehicles);
    if (trafficCollision) {
      this.fail(engine, `You collided with a ${trafficCollision.kind}.`);
      return;
    }

    const obstacleCollision = this.collisionSystem.findObstacleCollision(this.player, this.obstacles);
    if (obstacleCollision) {
      this.fail(engine, obstacleCollision.kind === 'pit' ? 'You failed to avoid a large pit.' : 'You crashed into an accident scene.');
      return;
    }

    if (this.player.distanceMeters >= this.level.distanceMeters) {
      this.completeLevel(engine);
    }
  }

  public render(context: CanvasRenderingContext2D, engine: GameEngine): void {
    this.roadRenderer.render(context, this.player.distanceMeters, this.player.speedKmh);
    this.drawWorldEntities(context);
    this.vehicleRenderer.drawPlayer(context, this.player, this.player.speedKmh, this.passingPulseSeconds);
    this.drawDrivingEffects(context);
    this.drawHeadsUpDisplay(context, engine);
  }


  private handleExitOrSettings(engine: GameEngine): boolean {
    const controlAction = handleScreenControlInput(engine, this.getPlayScreenControlsLayout());
    if (controlAction === 'endGame' || engine.input.consumePressed('Escape')) {
      engine.audio.stopBackgroundMusic();
      engine.setScene(new StartScene({ levelNumber: this.level.levelNumber, score: this.previousScore }));
      return true;
    }

    return controlAction !== 'none';
  }

  private applySpeedLimitPenalty(deltaSeconds: number): void {
    if (!this.speedLimitStatus.isViolation || !this.speedLimitStatus.penaltyIsActive) {
      this.speedPenaltyAccumulatorSeconds = 0;
      this.wasSpeedPenaltyActive = false;
      return;
    }

    if (!this.wasSpeedPenaltyActive) {
      this.wasSpeedPenaltyActive = true;
      this.speedPenaltyScore += GameConfig.rules.speedPenaltyPointsPerSecond;
      this.addFloatingText('-1 SPEED', this.player.x, this.player.getScreenY() - 122, '#fecaca', 0.95);
    }

    this.speedPenaltyAccumulatorSeconds += deltaSeconds;
    while (this.speedPenaltyAccumulatorSeconds >= 1) {
      this.speedPenaltyAccumulatorSeconds -= 1;
      this.speedPenaltyScore += GameConfig.rules.speedPenaltyPointsPerSecond;
      this.addFloatingText('-1 SPEED', this.player.x, this.player.getScreenY() - 122, '#fecaca', 0.95);
    }
  }

  private collectCargo(engine: GameEngine): void {
    const collected = this.collisionSystem.collectCargo(this.player, this.cargos);
    if (collected.length === 0) return;

    const bonus = collected.reduce((total, cargo) => total + cargo.bonusPoints, 0);
    this.cargoScore += bonus;
    this.lastCargoPopupText = `Cargo +${bonus}`;
    this.cargoPopupSeconds = 1.1;
    this.addFloatingText(`CARGO +${bonus}`, this.player.x, this.player.getScreenY() - 92, '#fde68a', 1.05);
    engine.audio.playCargoCollected();
  }

  private markOvertakenTrafficVehicles(): void {
    for (const vehicle of this.trafficVehicles) {
      if (!vehicle.isActive || !vehicle.spawnedAhead || vehicle.hasBeenOvertaken) continue;
      const hasDroppedBehindPlayer = vehicle.worldDistanceMeters < this.player.distanceMeters - 8;
      if (!hasDroppedBehindPlayer) continue;

      vehicle.hasBeenOvertaken = true;
      this.passedVehicleCount += 1;
      this.passingScore += GameConfig.rules.safePassBonus;
      this.passingPulseSeconds = 0.75;
      this.addFloatingText(`PASS +${GameConfig.rules.safePassBonus}`, clamp(vehicle.x, GameConfig.road.left + 70, GameConfig.road.right - 70), this.player.getScreenY() - 96, '#bbf7d0', 1.1);
    }
  }

  private updateFloatingTextEffects(deltaSeconds: number): void {
    for (const effect of this.floatingTextEffects) {
      effect.secondsRemaining -= deltaSeconds;
    }

    for (let index = this.floatingTextEffects.length - 1; index >= 0; index -= 1) {
      if (this.floatingTextEffects[index].secondsRemaining <= 0) this.floatingTextEffects.splice(index, 1);
    }
  }

  private addFloatingText(text: string, x: number, y: number, fillStyle: string, totalSeconds: number): void {
    this.floatingTextEffects.push({ text, x, y, fillStyle, totalSeconds, secondsRemaining: totalSeconds });
  }

  private isEntityVisible(worldDistanceMeters: number, verticalPadding: number): boolean {
    const screenY = this.toScreenY(worldDistanceMeters);
    return screenY >= -verticalPadding && screenY <= GameConfig.canvas.height + verticalPadding;
  }

  private removeInactiveEntities(): void {
    const minimumDistance = this.player.distanceMeters - GameConfig.world.entityCleanupBehindMeters;

    this.removeInactiveOrOld(this.trafficVehicles, minimumDistance);
    this.removeInactiveOrOld(this.obstacles, minimumDistance);
    this.removeInactiveOrOld(this.cargos, minimumDistance);
  }

  private removeInactiveOrOld<T extends { isActive: boolean; worldDistanceMeters: number }>(entities: T[], minimumDistanceMeters: number): void {
    for (let index = entities.length - 1; index >= 0; index -= 1) {
      const entity = entities[index];
      if (!entity.isActive || entity.worldDistanceMeters < minimumDistanceMeters) entities.splice(index, 1);
    }
  }

  private drawWorldEntities(context: CanvasRenderingContext2D): void {
    const drawables: DrawableEntity[] = [];

    for (const obstacle of this.obstacles) {
      const screenY = this.toScreenY(obstacle.worldDistanceMeters);
      if (screenY < -150 || screenY > GameConfig.canvas.height + 150) continue;
      drawables.push({ screenY, draw: (ctx) => this.entityRenderer.drawObstacle(ctx, obstacle, screenY) });
    }

    for (const cargo of this.cargos) {
      const screenY = this.toScreenY(cargo.worldDistanceMeters);
      if (screenY < -120 || screenY > GameConfig.canvas.height + 120) continue;
      drawables.push({ screenY, draw: (ctx) => this.entityRenderer.drawCargo(ctx, cargo, screenY) });
    }

    for (const vehicle of this.trafficVehicles) {
      const screenY = this.toScreenY(vehicle.worldDistanceMeters);
      if (screenY < -180 || screenY > GameConfig.canvas.height + 180) continue;
      drawables.push({ screenY, draw: (ctx) => this.vehicleRenderer.drawTrafficVehicle(ctx, vehicle, screenY) });
    }

    drawables.sort((first, second) => first.screenY - second.screenY);
    for (const drawable of drawables) drawable.draw(context);
  }

  private drawDrivingEffects(context: CanvasRenderingContext2D): void {
    this.drawPassingRibbons(context);
    this.drawFloatingTextEffects(context);
  }

  private drawPassingRibbons(context: CanvasRenderingContext2D): void {
    if (this.passingPulseSeconds <= 0) return;

    const intensity = clamp(this.passingPulseSeconds / 0.75, 0, 1);
    const playerY = this.player.getScreenY();

    context.save();
    context.lineCap = 'round';
    context.lineWidth = 5;
    context.strokeStyle = `rgba(250, 204, 21, ${0.18 + intensity * 0.28})`;
    for (const side of [-1, 1] as const) {
      context.beginPath();
      context.moveTo(this.player.x + side * 34, playerY + 30);
      context.quadraticCurveTo(this.player.x + side * 86, playerY - 18, this.player.x + side * 58, playerY - 102);
      context.stroke();
    }
    context.restore();
  }

  private drawFloatingTextEffects(context: CanvasRenderingContext2D): void {
    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '900 24px Inter, system-ui, sans-serif';

    for (const effect of this.floatingTextEffects) {
      const progress = 1 - effect.secondsRemaining / effect.totalSeconds;
      const y = effect.y - progress * 44;
      const alpha = clamp(effect.secondsRemaining / effect.totalSeconds, 0, 1);
      context.globalAlpha = alpha;
      drawOutlinedText(context, effect.text, effect.x, y, effect.fillStyle, 'rgba(0,0,0,0.7)', 5);
    }

    context.restore();
  }

  private drawHeadsUpDisplay(context: CanvasRenderingContext2D, engine: GameEngine): void {
    const score = this.currentScore();
    const progress = Math.min(1, this.player.distanceMeters / this.level.distanceMeters);
    const screenControlsLayout = this.getPlayScreenControlsLayout();

    context.save();
    fillRoundedRectangle(context, 18, 16, 376, 178, 16, 'rgba(15, 23, 42, 0.86)');
    strokeRoundedRectangle(context, 18, 16, 376, 178, 16, 'rgba(255, 255, 255, 0.2)', 2);
    context.font = '800 22px Inter, system-ui, sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillStyle = '#fef08a';
    context.fillText(`Level ${this.level.levelNumber}`, 38, 42);
    context.fillStyle = '#ffffff';
    context.font = '600 18px Inter, system-ui, sans-serif';
    context.fillText(`${this.level.fromCity} → ${this.level.toCity}`, 38, 72);
    context.fillText(`Score: ${score}`, 38, 102);
    context.fillText(`Time: ${formatTime(this.elapsedSeconds)}`, 38, 132);
    context.fillText(`Safe passes: ${this.passedVehicleCount}`, 38, 162);

    fillRoundedRectangle(context, 186, 153, 172, 16, 8, 'rgba(255,255,255,0.16)');
    fillRoundedRectangle(context, 186, 153, 172 * progress, 16, 8, '#22c55e');

    this.drawSpeedPanel(context);
    this.drawSpeedLimitRoadSign(context);
    drawScreenControls(context, engine, screenControlsLayout);
    this.drawSpeedViolationWarning(context);
    

    if (this.cargoPopupSeconds > 0) {
      context.font = '900 30px Inter, system-ui, sans-serif';
      context.textAlign = 'center';
      drawOutlinedText(context, this.lastCargoPopupText, this.player.x, this.player.getScreenY() - 76, '#fde68a', 'rgba(0,0,0,0.7)', 6);
    }

    context.restore();
  }

  private getPlayScreenControlsLayout(): { x: number; y: number; includeEndGameButton: true } {
    const topHudRightEdge = 18 + 376;
    const speedPanelLeftEdge = 990;
    const buttonRowWidth = 136 + 10 + 136 + 10 + 108;
    const availableWidth = speedPanelLeftEdge - topHudRightEdge;
    const x = topHudRightEdge + Math.round((availableWidth - buttonRowWidth) / 2);
    return { x, y: 18, includeEndGameButton: true };
  }

  private drawSpeedPanel(context: CanvasRenderingContext2D): void {
    const isViolation = this.speedLimitStatus.isViolation;
    fillRoundedRectangle(context, 990, 18, 262, isViolation ? 154 : 116, 16, 'rgba(15, 23, 42, 0.86)');
    strokeRoundedRectangle(context, 990, 18, 262, isViolation ? 154 : 116, 16, isViolation ? '#f87171' : 'rgba(255, 255, 255, 0.2)', 2);

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '900 44px Inter, system-ui, sans-serif';
    drawOutlinedText(context, `${Math.round(this.player.speedKmh)}`, 1124, 58, isViolation ? '#fca5a5' : '#93c5fd', 'rgba(0,0,0,0.65)', 5);
    context.font = '700 17px Inter, system-ui, sans-serif';
    context.fillStyle = '#ffffff';
    context.fillText('km/h', 1194, 58);
    context.font = '700 18px Inter, system-ui, sans-serif';
    context.fillText(`Limit ${this.speedLimitStatus.minimumSpeedKmh}-${this.speedLimitStatus.maximumSpeedKmh}`, 1121, 101);

    if (isViolation) {
      context.font = '800 16px Inter, system-ui, sans-serif';
      context.fillStyle = '#fecaca';
      const warningText = this.speedLimitStatus.penaltyIsActive
        ? `Penalty active -${GameConfig.rules.speedPenaltyPointsPerSecond}/s`
        : `Penalty in ${this.speedLimitStatus.secondsUntilPenalty.toFixed(1)}s`;
      context.fillText(warningText, 1121, 140);
    }
  }

  private drawSpeedViolationWarning(context: CanvasRenderingContext2D): void {
    if (!this.speedLimitStatus.isViolation) return;

    const isPenaltyActive = this.speedLimitStatus.penaltyIsActive;
    const blink = Math.sin(this.elapsedSeconds * 10) > 0;
    const width = 490;
    const height = 72;
    const topHudRightEdge = 18 + 376;
    const speedPanelLeftEdge = 990;
    const availableWidth = speedPanelLeftEdge - topHudRightEdge;
    const x = topHudRightEdge + Math.round((availableWidth - width) / 2);
    const y = 62;

    context.save();
    fillRoundedRectangle(context, x, y, width, height, 18, isPenaltyActive ? 'rgba(127, 29, 29, 0.94)' : 'rgba(120, 53, 15, 0.94)');
    strokeRoundedRectangle(context, x, y, width, height, 18, blink ? '#fef08a' : '#fecaca', 4);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '900 23px Inter, system-ui, sans-serif';
    drawOutlinedText(context, '⚠ SPEED LIMIT WARNING', x + width / 2, y + 24, '#ffffff', 'rgba(0,0,0,0.65)', 5);
    context.font = '800 17px Inter, system-ui, sans-serif';
    const detail = isPenaltyActive
      ? `Penalty active: losing ${GameConfig.rules.speedPenaltyPointsPerSecond} point every second`
      : `Adjust speed within ${this.speedLimitStatus.secondsUntilPenalty.toFixed(1)} seconds to avoid penalty`;
    context.fillStyle = isPenaltyActive ? '#fecaca' : '#fef3c7';
    context.fillText(detail, x + width / 2, y + 51);
    context.restore();
  }

  private drawSpeedLimitRoadSign(context: CanvasRenderingContext2D): void {
    const shouldHighlight = this.speedLimitStatus.recentlyChangedSecondsRemaining > 0;
    const x = 1140;
    const y = 214;
    context.save();
    context.strokeStyle = '#475569';
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(x, y + 54);
    context.lineTo(x, y + 118);
    context.stroke();
    fillRoundedRectangle(context, x - 74, y - 58, 148, 112, 12, shouldHighlight ? '#dc2626' : '#ffffff');
    strokeRoundedRectangle(context, x - 74, y - 58, 148, 112, 12, shouldHighlight ? '#fef08a' : '#111827', 4);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '900 16px Inter, system-ui, sans-serif';
    context.fillStyle = shouldHighlight ? '#ffffff' : '#111827';
    context.fillText('SPEED', x, y - 34);
    context.font = '800 22px Inter, system-ui, sans-serif';
    context.fillText(`MIN ${this.speedLimitStatus.minimumSpeedKmh}`, x, y - 7);
    context.fillText(`MAX ${this.speedLimitStatus.maximumSpeedKmh}`, x, y + 25);
    context.restore();
  }

  private fail(engine: GameEngine, reason: string): void {
    engine.audio.playCrash();
    const summary: FailureSummary = {
      levelNumber: this.level.levelNumber,
      fromCity: this.level.fromCity,
      toCity: this.level.toCity,
      reason,
      score: this.previousScore,
      distanceMeters: Math.min(this.player.distanceMeters, this.level.distanceMeters),
      levelDistanceMeters: this.level.distanceMeters,
      elapsedSeconds: this.elapsedSeconds
    };
    engine.setScene(new FailScene(summary));
  }

  private completeLevel(engine: GameEngine): void {
    const completionBonus = 500 + this.level.levelNumber * 175;
    const timeBonus = Math.max(0, Math.round((this.level.targetCompletionSeconds - this.elapsedSeconds) * 22 + GameConfig.rules.finishBonusBase));
    const totalScore = Math.max(0, this.previousScore + this.cargoScore + this.passingScore + completionBonus + timeBonus - this.speedPenaltyScore);
    const summary: ResultSummary = {
      levelNumber: this.level.levelNumber,
      fromCity: this.level.fromCity,
      toCity: this.level.toCity,
      elapsedSeconds: this.elapsedSeconds,
      cargoScore: this.cargoScore,
      passingScore: this.passingScore,
      speedPenaltyScore: this.speedPenaltyScore,
      completionBonus,
      timeBonus,
      previousScore: this.previousScore,
      totalScore
    };
    engine.setScene(new ResultScene(summary));
  }

  private currentScore(): number {
    return Math.max(0, this.previousScore + this.cargoScore + this.passingScore - this.speedPenaltyScore);
  }

  private toScreenY(worldDistanceMeters: number): number {
    return this.player.getScreenY() - (worldDistanceMeters - this.player.distanceMeters) * GameConfig.world.pixelsPerMeter;
  }
}
