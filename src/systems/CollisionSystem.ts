import { GameConfig } from '../config/GameConfig.js';
import type { Cargo } from '../entities/Cargo.js';
import type { Obstacle } from '../entities/Obstacle.js';
import type { PlayerCar } from '../entities/PlayerCar.js';
import type { TrafficVehicle, TrafficVehicleKind } from '../entities/TrafficVehicle.js';
import {
  circleIntersectsEllipse,
  circleIntersectsRectangle,
  circleIntersectsRotatedRectangle,
  circlesTouch,
  expandRectangle,
  rectanglesOverlap,
  type Circle,
  type Ellipse,
  type Rectangle,
  type RotatedRectangle
} from '../types/Geometry.js';

export type VehicleContactKind = TrafficVehicleKind | 'player';

export class CollisionSystem {
  public findTrafficCollision(player: PlayerCar, trafficVehicles: readonly TrafficVehicle[]): TrafficVehicle | null {
    const playerCircles = this.createVehicleContactCircles(player.x, player.getScreenY(), player.width, player.height, 'player');

    for (const vehicle of trafficVehicles) {
      if (!vehicle.isActive) continue;
      const vehicleScreenY = this.toScreenY(player, vehicle.worldDistanceMeters);
      const vehicleCircles = this.createVehicleContactCircles(vehicle.x, vehicleScreenY, vehicle.width, vehicle.height, vehicle.kind);
      if (this.circleSetsTouch(playerCircles, vehicleCircles)) return vehicle;
    }

    return null;
  }

  public findObstacleCollision(player: PlayerCar, obstacles: readonly Obstacle[]): Obstacle | null {
    const playerCircles = this.createVehicleContactCircles(player.x, player.getScreenY(), player.width, player.height, 'player');

    for (const obstacle of obstacles) {
      if (!obstacle.isActive) continue;
      const obstacleScreenY = this.toScreenY(player, obstacle.worldDistanceMeters);
      if (obstacle.kind === 'pit' && this.vehicleTouchesPit(playerCircles, obstacle.x, obstacleScreenY, obstacle.width, obstacle.height)) {
        return obstacle;
      }

      if (obstacle.kind === 'accident' && this.vehicleTouchesAccident(playerCircles, obstacle, obstacleScreenY)) {
        return obstacle;
      }
    }

    return null;
  }

  public collectCargo(player: PlayerCar, cargos: Cargo[]): Cargo[] {
    const playerRect = expandRectangle(player.getScreenRectangle(player.getScreenY()), 8, 10);
    const collected: Cargo[] = [];

    for (const cargo of cargos) {
      if (!cargo.isActive) continue;
      const cargoScreenY = this.toScreenY(player, cargo.worldDistanceMeters);
      const cargoRect = expandRectangle(cargo.getScreenRectangle(cargoScreenY), 7, 7);
      if (rectanglesOverlap(playerRect, cargoRect)) {
        cargo.isActive = false;
        collected.push(cargo);
      }
    }

    return collected;
  }

  public createVehicleContactCircles(centerX: number, centerY: number, width: number, height: number, kind: VehicleContactKind): Circle[] {
    const radius = this.getVehicleContactRadius(width, kind);
    const topCircleY = centerY - height / 2 + radius;
    const bottomCircleY = centerY + height / 2 - radius;

    if (bottomCircleY <= topCircleY) return [{ x: centerX, y: centerY, radius }];

    const spacing = radius * 1.25;
    const circleCount = Math.max(2, Math.ceil((bottomCircleY - topCircleY) / spacing) + 1);
    const circles: Circle[] = [];

    for (let index = 0; index < circleCount; index += 1) {
      const t = circleCount === 1 ? 0.5 : index / (circleCount - 1);
      circles.push({
        x: centerX,
        y: topCircleY + (bottomCircleY - topCircleY) * t,
        radius
      });
    }

    return circles;
  }

  public circleSetsTouch(firstCircles: readonly Circle[], secondCircles: readonly Circle[]): boolean {
    for (const first of firstCircles) {
      for (const second of secondCircles) {
        if (circlesTouch(first, second)) return true;
      }
    }

    return false;
  }

  private getVehicleContactRadius(width: number, kind: VehicleContactKind): number {
    const radiusRatioByKind: Record<VehicleContactKind, number> = {
      player: 0.47,
      car: 0.46,
      pickup: 0.46,
      truck: 0.45,
      bus: 0.45,
      motorcycle: 0.42
    };

    const visibleBodyRadius = width * radiusRatioByKind[kind];
    return Math.max(7, Math.min(width / 2 - 2, visibleBodyRadius));
  }

  private vehicleTouchesPit(playerCircles: readonly Circle[], centerX: number, centerY: number, width: number, height: number): boolean {
    const pitShape: Ellipse = {
      x: centerX,
      y: centerY,
      radiusX: width / 2 - 4,
      radiusY: height / 2 - 4
    };

    return playerCircles.some((circle) => circleIntersectsEllipse(circle, pitShape));
  }

  private vehicleTouchesAccident(playerCircles: readonly Circle[], obstacle: Obstacle, screenY: number): boolean {
    if (obstacle.accidentVehicles.length > 0) {
      return obstacle.accidentVehicles.some((vehicle) => {
        const hitBox: RotatedRectangle = {
          x: obstacle.x + vehicle.offsetX,
          y: screenY + vehicle.offsetY,
          width: vehicle.width * 0.78,
          height: vehicle.height * 0.78,
          rotationRadians: vehicle.rotationRadians
        };

        return playerCircles.some((circle) => circleIntersectsRotatedRectangle(circle, hitBox));
      });
    }

    const accidentBody: Rectangle = {
      x: obstacle.x - obstacle.width / 2 + 10,
      y: screenY - obstacle.height / 2 + 16,
      width: obstacle.width - 22,
      height: obstacle.height - 38
    };

    return playerCircles.some((circle) => circleIntersectsRectangle(circle, accidentBody));
  }

  private toScreenY(player: PlayerCar, entityWorldDistanceMeters: number): number {
    return player.getScreenY() - (entityWorldDistanceMeters - player.distanceMeters) * GameConfig.world.pixelsPerMeter;
  }
}
