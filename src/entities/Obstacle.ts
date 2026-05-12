import { GameConfig } from '../config/GameConfig.js';
import { clamp } from '../utils/MathUtils.js';
import type { RandomNumberGenerator } from '../utils/Random.js';
import { BaseEntity } from './BaseEntity.js';
import type { TrafficVehicle, TrafficVehicleKind } from './TrafficVehicle.js';

export type ObstacleKind = 'pit' | 'accident';

export interface AccidentVehicleVisual {
  readonly kind: TrafficVehicleKind;
  readonly color: string;
  readonly width: number;
  readonly height: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly rotationRadians: number;
}

export class Obstacle extends BaseEntity {
  public constructor(
    id: string,
    public readonly kind: ObstacleKind,
    x: number,
    worldDistanceMeters: number,
    width = kind === 'pit' ? 78 : 132,
    height = kind === 'pit' ? 66 : 118,
    public readonly accidentVehicles: readonly AccidentVehicleVisual[] = []
  ) {
    super(id, x, worldDistanceMeters, width, height);
  }

  public static createTrafficAccident(id: string, firstVehicle: TrafficVehicle, secondVehicle: TrafficVehicle, random: RandomNumberGenerator): Obstacle {
    const centerX = (firstVehicle.x + secondVehicle.x) / 2;
    const centerWorldDistanceMeters = (firstVehicle.worldDistanceMeters + secondVehicle.worldDistanceMeters) / 2;
    const firstRotation = random.range(-0.56, 0.56);
    const secondRotation = random.range(-0.56, 0.56) + (firstRotation > 0 ? -0.34 : 0.34);

    const accidentVehicles: AccidentVehicleVisual[] = [
      this.createAccidentVisual(firstVehicle, centerX, centerWorldDistanceMeters, firstRotation),
      this.createAccidentVisual(secondVehicle, centerX, centerWorldDistanceMeters, secondRotation)
    ];

    const width = this.measureAccidentWidth(accidentVehicles);
    const height = this.measureAccidentHeight(accidentVehicles);

    return new Obstacle(id, 'accident', centerX, centerWorldDistanceMeters, width, height, accidentVehicles);
  }

  public static createStaticAccident(
    id: string,
    x: number,
    worldDistanceMeters: number,
    firstKind: TrafficVehicleKind,
    firstColor: string,
    secondKind: TrafficVehicleKind,
    secondColor: string,
    random: RandomNumberGenerator
  ): Obstacle {
    const firstSize = this.sizeForKind(firstKind);
    const secondSize = this.sizeForKind(secondKind);
    const accidentVehicles: AccidentVehicleVisual[] = [
      {
        kind: firstKind,
        color: firstColor,
        width: firstSize.width,
        height: firstSize.height,
        offsetX: random.range(-32, -18),
        offsetY: random.range(-18, 12),
        rotationRadians: random.range(-0.58, -0.28)
      },
      {
        kind: secondKind,
        color: secondColor,
        width: secondSize.width,
        height: secondSize.height,
        offsetX: random.range(18, 34),
        offsetY: random.range(-4, 22),
        rotationRadians: random.range(0.26, 0.62)
      }
    ];

    const width = this.measureAccidentWidth(accidentVehicles);
    const height = this.measureAccidentHeight(accidentVehicles);
    return new Obstacle(id, 'accident', x, worldDistanceMeters, width, height, accidentVehicles);
  }

  private static createAccidentVisual(
    vehicle: TrafficVehicle,
    centerX: number,
    centerWorldDistanceMeters: number,
    rotationRadians: number
  ): AccidentVehicleVisual {
    return {
      kind: vehicle.kind,
      color: vehicle.color,
      width: vehicle.width,
      height: vehicle.height,
      offsetX: vehicle.x - centerX,
      offsetY: -(vehicle.worldDistanceMeters - centerWorldDistanceMeters) * GameConfig.world.pixelsPerMeter,
      rotationRadians
    };
  }

  private static sizeForKind(kind: TrafficVehicleKind): { readonly width: number; readonly height: number } {
    const sizes: Record<TrafficVehicleKind, { readonly width: number; readonly height: number }> = {
      car: { width: 48, height: 76 },
      pickup: { width: 54, height: 88 },
      truck: { width: 64, height: 122 },
      bus: { width: 62, height: 132 },
      motorcycle: { width: 28, height: 54 }
    };

    return sizes[kind];
  }

  private static measureAccidentWidth(vehicles: readonly AccidentVehicleVisual[]): number {
    const halfWidth = Math.max(...vehicles.map((vehicle) => Math.abs(vehicle.offsetX) + vehicle.width * 0.62));
    return clamp(halfWidth * 2 + 34, 118, 224);
  }

  private static measureAccidentHeight(vehicles: readonly AccidentVehicleVisual[]): number {
    const halfHeight = Math.max(...vehicles.map((vehicle) => Math.abs(vehicle.offsetY) + vehicle.height * 0.6));
    return clamp(halfHeight * 2 + 40, 108, 242);
  }
}
