import { GameConfig, laneCenter } from '../config/GameConfig.js';
import { clamp, kmhToMetersPerSecond, moveTowards } from '../utils/MathUtils.js';
import { BaseEntity } from './BaseEntity.js';

export type TrafficVehicleKind = 'car' | 'pickup' | 'truck' | 'bus' | 'motorcycle';

export interface TrafficVehicleSize {
  readonly width: number;
  readonly height: number;
}

export const vehicleSizes: Record<TrafficVehicleKind, TrafficVehicleSize> = {
  car: { width: 48, height: 76 },
  pickup: { width: 54, height: 88 },
  truck: { width: 64, height: 122 },
  bus: { width: 62, height: 132 },
  motorcycle: { width: 28, height: 54 }
};

export class TrafficVehicle extends BaseEntity {
  public targetLaneIndex: number;
  public currentLaneIndex: number;
  public hasBeenOvertaken = false;
  public readonly cruiseSpeedKmh: number;
  public desiredSpeedKmh: number;
  public isBraking = false;
  public avoidanceAlertSeconds = 0;
  public laneChangeCooldownSeconds = 0;

  public constructor(
    id: string,
    public readonly kind: TrafficVehicleKind,
    laneIndex: number,
    worldDistanceMeters: number,
    public speedKmh: number,
    public readonly color: string,
    public readonly spawnedAhead: boolean
  ) {
    const size = vehicleSizes[kind];
    super(id, laneCenter(laneIndex), worldDistanceMeters, size.width, size.height);
    this.targetLaneIndex = laneIndex;
    this.currentLaneIndex = laneIndex;
    this.cruiseSpeedKmh = speedKmh;
    this.desiredSpeedKmh = speedKmh;
  }

  public update(deltaSeconds: number): void {
    const acceleration = this.desiredSpeedKmh < this.speedKmh
      ? GameConfig.traffic.brakingKmhPerSecond
      : GameConfig.traffic.accelerationKmhPerSecond;

    this.speedKmh = moveTowards(this.speedKmh, this.desiredSpeedKmh, acceleration * deltaSeconds);
    this.speedKmh = clamp(this.speedKmh, GameConfig.traffic.minimumCruiseSpeedKmh, GameConfig.player.maximumSpeedKmh);
    this.worldDistanceMeters += kmhToMetersPerSecond(this.speedKmh) * deltaSeconds;

    const targetX = laneCenter(this.targetLaneIndex);
    this.x = moveTowards(this.x, targetX, GameConfig.traffic.laneChangePixelsPerSecond * deltaSeconds);
    this.laneChangeCooldownSeconds = Math.max(0, this.laneChangeCooldownSeconds - deltaSeconds);
    this.avoidanceAlertSeconds = Math.max(0, this.avoidanceAlertSeconds - deltaSeconds);

    if (!this.isChangingLane()) {
      this.currentLaneIndex = this.targetLaneIndex;
    }
  }

  public setCruiseSpeed(speedKmh: number): void {
    this.desiredSpeedKmh = clamp(speedKmh, GameConfig.traffic.minimumCruiseSpeedKmh, GameConfig.player.maximumSpeedKmh);
  }

  public brakeBehind(speedKmh: number, emergency = false): void {
    this.desiredSpeedKmh = clamp(speedKmh, GameConfig.traffic.minimumCruiseSpeedKmh, this.speedKmh);
    this.isBraking = true;
    this.avoidanceAlertSeconds = emergency ? 0.65 : 0.35;
  }

  public chooseLane(targetLaneIndex: number): void {
    const safeLaneIndex = Math.max(0, Math.min(GameConfig.road.laneCount - 1, targetLaneIndex));
    if (safeLaneIndex === this.targetLaneIndex) return;

    this.targetLaneIndex = safeLaneIndex;
    this.laneChangeCooldownSeconds = 1.2;
    this.avoidanceAlertSeconds = 0.6;
  }

  public isChangingLane(): boolean {
    return Math.abs(this.x - laneCenter(this.targetLaneIndex)) > 2;
  }

  public laneChangeDirection(): -1 | 0 | 1 {
    if (!this.isChangingLane()) return 0;
    return laneCenter(this.targetLaneIndex) > this.x ? 1 : -1;
  }
}
