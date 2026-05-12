import { GameConfig } from '../config/GameConfig.js';
import { clamp, kmhToMetersPerSecond } from '../utils/MathUtils.js';
import { BaseEntity } from './BaseEntity.js';
import { laneCenter } from '../config/GameConfig.js';
import type { InputController } from '../core/InputController.js';

export class PlayerCar extends BaseEntity {
  public speedKmh = 0;
  public distanceMeters = 0;

  public constructor() {
    super('player', laneCenter(1), 0, GameConfig.player.width, GameConfig.player.height);
  }

  public update(deltaSeconds: number, input: InputController): void {
    this.updateSpeed(deltaSeconds, input);
    this.updateSteering(deltaSeconds, input);
    this.distanceMeters += kmhToMetersPerSecond(this.speedKmh) * deltaSeconds;
    this.worldDistanceMeters = this.distanceMeters;
  }

  public getScreenY(): number {
    return GameConfig.player.screenY;
  }

  private updateSpeed(deltaSeconds: number, input: InputController): void {
    const isAccelerating = input.isPressed('ArrowUp', 'w', 'W');
    const isBraking = input.isPressed('ArrowDown', 's', 'S');

    if (isAccelerating) {
      this.speedKmh += GameConfig.player.accelerationKmhPerSecond * deltaSeconds;
    }

    if (isBraking) {
      this.speedKmh -= GameConfig.player.brakeKmhPerSecond * deltaSeconds;
    }

    if (!isAccelerating && !isBraking) {
      this.speedKmh -= GameConfig.player.dragKmhPerSecond * deltaSeconds;
    }

    this.speedKmh = clamp(this.speedKmh, 0, GameConfig.player.maximumSpeedKmh);
  }

  private updateSteering(deltaSeconds: number, input: InputController): void {
    const left = input.isPressed('ArrowLeft', 'a', 'A') ? -1 : 0;
    const right = input.isPressed('ArrowRight', 'd', 'D') ? 1 : 0;
    const steering = left + right;

    this.x += steering * GameConfig.player.steeringPixelsPerSecond * deltaSeconds;
    const halfWidth = this.width / 2 + 6;
    this.x = clamp(this.x, GameConfig.road.left + halfWidth, GameConfig.road.right - halfWidth);
  }
}
