import { GameConfig, laneCenter } from '../config/GameConfig.js';
import type { LevelDefinition } from '../config/LevelFactory.js';
import { Cargo } from '../entities/Cargo.js';
import { Obstacle, type ObstacleKind } from '../entities/Obstacle.js';
import { TrafficVehicle, type TrafficVehicleKind } from '../entities/TrafficVehicle.js';
import { clamp } from '../utils/MathUtils.js';
import { RandomNumberGenerator } from '../utils/Random.js';

export interface SpawnedEntities {
  readonly trafficVehicles: TrafficVehicle[];
  readonly obstacles: Obstacle[];
  readonly cargos: Cargo[];
}

export class SpawnSystem {
  private trafficTimer = 1.05;
  private rearTrafficTimer: number;
  private obstacleTimer = 7.2;
  private cargoTimer = 2.1;
  private idCounter = 0;

  public constructor(
    private readonly level: LevelDefinition,
    private readonly random: RandomNumberGenerator
  ) {
    this.rearTrafficTimer = this.rearTrafficIsEnabled() ? level.rearTrafficSpawnIntervalSeconds : Number.POSITIVE_INFINITY;
  }

  public update(
    deltaSeconds: number,
    playerDistanceMeters: number,
    playerSpeedKmh: number,
    existingTrafficVehicles: readonly TrafficVehicle[] = []
  ): SpawnedEntities {
    this.trafficTimer -= deltaSeconds;
    this.obstacleTimer -= deltaSeconds;
    this.cargoTimer -= deltaSeconds;
    if (this.rearTrafficIsEnabled()) this.rearTrafficTimer -= deltaSeconds;

    const trafficVehicles: TrafficVehicle[] = [];
    const obstacles: Obstacle[] = [];
    const cargos: Cargo[] = [];

    if (this.trafficTimer <= 0) {
      const vehicle = this.createTrafficVehicle(playerDistanceMeters, false, playerSpeedKmh, existingTrafficVehicles);
      if (vehicle) trafficVehicles.push(vehicle);
      this.trafficTimer = this.level.trafficSpawnIntervalSeconds * this.random.range(0.86, 1.38);
    }

    if (this.rearTrafficIsEnabled() && this.rearTrafficTimer <= 0) {
      const vehicle = this.createTrafficVehicle(playerDistanceMeters, true, playerSpeedKmh, existingTrafficVehicles);
      if (vehicle) trafficVehicles.push(vehicle);
      this.rearTrafficTimer = this.level.rearTrafficSpawnIntervalSeconds * this.random.range(0.92, 1.55);
    }

    if (this.obstacleTimer <= 0) {
      obstacles.push(this.createObstacle(playerDistanceMeters));
      this.obstacleTimer = this.level.obstacleSpawnIntervalSeconds * this.random.range(0.88, 1.55);
    }

    if (this.cargoTimer <= 0) {
      cargos.push(this.createCargo(playerDistanceMeters));
      this.cargoTimer = this.level.cargoSpawnIntervalSeconds * this.random.range(0.72, 1.26);
    }

    return { trafficVehicles, obstacles, cargos };
  }

  public createTrafficAccidentId(): string {
    return this.nextId('traffic-accident');
  }

  private createTrafficVehicle(
    playerDistanceMeters: number,
    fromBehind: boolean,
    playerSpeedKmh: number,
    existingTrafficVehicles: readonly TrafficVehicle[]
  ): TrafficVehicle | null {
    const preferredLane = this.random.integer(0, GameConfig.road.laneCount - 1);
    const kind = this.pickTrafficKind();
    const worldDistanceMeters = fromBehind
      ? playerDistanceMeters - this.random.range(58, 96)
      : playerDistanceMeters + this.random.range(GameConfig.world.entitySpawnAheadMeters, GameConfig.world.entitySpawnAheadMeters + 145);
    const safeLaneIndex = this.findSafeSpawnLane(preferredLane, worldDistanceMeters, existingTrafficVehicles);
    if (safeLaneIndex === null) return null;

    const speedKmh = fromBehind ? this.createRearTrafficSpeed(playerSpeedKmh) : this.createForwardTrafficSpeed();
    return new TrafficVehicle(this.nextId('traffic'), kind, safeLaneIndex, worldDistanceMeters, speedKmh, this.pickVehicleColor(kind), !fromBehind);
  }

  private findSafeSpawnLane(preferredLane: number, worldDistanceMeters: number, existingTrafficVehicles: readonly TrafficVehicle[]): number | null {
    const laneOrder = [preferredLane, ...this.shuffledLanes().filter((lane) => lane !== preferredLane)];
    for (const laneIndex of laneOrder) {
      const isSafe = existingTrafficVehicles.every((vehicle) => {
        if (!vehicle.isActive) return true;
        const vehicleUsesLane = vehicle.currentLaneIndex === laneIndex || vehicle.targetLaneIndex === laneIndex;
        if (!vehicleUsesLane) return true;
        return Math.abs(vehicle.worldDistanceMeters - worldDistanceMeters) > 32;
      });
      if (isSafe) return laneIndex;
    }

    return null;
  }

  private shuffledLanes(): number[] {
    const lanes = Array.from({ length: GameConfig.road.laneCount }, (_value, index) => index);
    for (let index = lanes.length - 1; index > 0; index -= 1) {
      const swapIndex = this.random.integer(0, index);
      const lane = lanes[index];
      lanes[index] = lanes[swapIndex];
      lanes[swapIndex] = lane;
    }
    return lanes;
  }

  private createForwardTrafficSpeed(): number {
    const upperSpeed = clamp(78 + this.level.levelNumber * 4, 78, 114);
    return this.random.range(38, upperSpeed);
  }

  private createRearTrafficSpeed(playerSpeedKmh: number): number {
    const minimumRearSpeed = Math.max(62, playerSpeedKmh + 8);
    const maximumRearSpeed = Math.max(minimumRearSpeed + 8, playerSpeedKmh + 22);
    return this.random.range(minimumRearSpeed, maximumRearSpeed);
  }

  private createObstacle(playerDistanceMeters: number): Obstacle {
    const laneIndex = this.random.integer(0, GameConfig.road.laneCount - 1);
    const kind: ObstacleKind = this.random.chance(0.58) ? 'pit' : 'accident';
    const x = laneCenter(laneIndex) + this.random.range(-12, 12);
    const worldDistanceMeters = playerDistanceMeters + this.random.range(GameConfig.world.entitySpawnAheadMeters + 55, GameConfig.world.entitySpawnAheadMeters + 155);

    if (kind === 'pit') {
      return new Obstacle(this.nextId('obstacle'), kind, x, worldDistanceMeters);
    }

    const firstKind = this.pickTrafficKind();
    const secondKind = this.pickTrafficKind();
    return Obstacle.createStaticAccident(
      this.nextId('obstacle'),
      x,
      worldDistanceMeters,
      firstKind,
      this.pickVehicleColor(firstKind),
      secondKind,
      this.pickVehicleColor(secondKind),
      this.random
    );
  }

  private createCargo(playerDistanceMeters: number): Cargo {
    const laneIndex = this.random.integer(0, GameConfig.road.laneCount - 1);
    const bonus = this.random.pick([10, 20, 30, 50, 75, 100, 150, 200, 300, 500]);
    return new Cargo(
      this.nextId('cargo'),
      laneCenter(laneIndex) + this.random.range(-24, 24),
      playerDistanceMeters + this.random.range(GameConfig.world.entitySpawnAheadMeters + 20, GameConfig.world.entitySpawnAheadMeters + 120),
      bonus
    );
  }

  private pickTrafficKind(): TrafficVehicleKind {
    const roll = this.random.next();
    if (roll < 0.55) return 'car';
    if (roll < 0.73) return 'pickup';
    if (roll < 0.85) return 'truck';
    if (roll < 0.95) return 'bus';
    return 'motorcycle';
  }

  private pickVehicleColor(kind: TrafficVehicleKind): string {
    if (kind === 'truck') return this.random.pick(['#e6e2d5', '#ffb44a', '#9bd3ff', '#d1d5db']);
    if (kind === 'bus') return this.random.pick(['#ffce2e', '#69d2ff', '#a5f26c', '#f785a2']);
    if (kind === 'motorcycle') return this.random.pick(['#e11d48', '#1d4ed8', '#101827', '#f97316']);
    return this.random.pick(['#2fb8ff', '#ffd23f', '#8b5cf6', '#22c55e', '#f97316', '#f43f5e', '#f8fafc']);
  }

  private rearTrafficIsEnabled(): boolean {
    return this.level.levelNumber >= 4;
  }

  private nextId(prefix: string): string {
    this.idCounter += 1;
    return `${prefix}-${this.idCounter}`;
  }
}
