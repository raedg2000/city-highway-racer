import { GameConfig } from '../config/GameConfig.js';
import { clamp, kmhToMetersPerSecond } from '../utils/MathUtils.js';
import { BaseEntity } from './BaseEntity.js';
import { laneCenter } from '../config/GameConfig.js';
export class PlayerCar extends BaseEntity {
    speedKmh = 0;
    distanceMeters = 0;
    constructor() {
        super('player', laneCenter(1), 0, GameConfig.player.width, GameConfig.player.height);
    }
    update(deltaSeconds, input) {
        this.updateSpeed(deltaSeconds, input);
        this.updateSteering(deltaSeconds, input);
        this.distanceMeters += kmhToMetersPerSecond(this.speedKmh) * deltaSeconds;
        this.worldDistanceMeters = this.distanceMeters;
    }
    getScreenY() {
        return GameConfig.player.screenY;
    }
    updateSpeed(deltaSeconds, input) {
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
    updateSteering(deltaSeconds, input) {
        const left = input.isPressed('ArrowLeft', 'a', 'A') ? -1 : 0;
        const right = input.isPressed('ArrowRight', 'd', 'D') ? 1 : 0;
        const steering = left + right;
        this.x += steering * GameConfig.player.steeringPixelsPerSecond * deltaSeconds;
        const halfWidth = this.width / 2 + 6;
        this.x = clamp(this.x, GameConfig.road.left + halfWidth, GameConfig.road.right - halfWidth);
    }
}
