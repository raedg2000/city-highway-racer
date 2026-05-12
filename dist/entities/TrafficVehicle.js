import { GameConfig, laneCenter } from '../config/GameConfig.js';
import { clamp, kmhToMetersPerSecond, moveTowards } from '../utils/MathUtils.js';
import { BaseEntity } from './BaseEntity.js';
export const vehicleSizes = {
    car: { width: 48, height: 76 },
    pickup: { width: 54, height: 88 },
    truck: { width: 64, height: 122 },
    bus: { width: 62, height: 132 },
    motorcycle: { width: 28, height: 54 }
};
export class TrafficVehicle extends BaseEntity {
    kind;
    speedKmh;
    color;
    spawnedAhead;
    targetLaneIndex;
    currentLaneIndex;
    hasBeenOvertaken = false;
    cruiseSpeedKmh;
    desiredSpeedKmh;
    isBraking = false;
    avoidanceAlertSeconds = 0;
    laneChangeCooldownSeconds = 0;
    constructor(id, kind, laneIndex, worldDistanceMeters, speedKmh, color, spawnedAhead) {
        const size = vehicleSizes[kind];
        super(id, laneCenter(laneIndex), worldDistanceMeters, size.width, size.height);
        this.kind = kind;
        this.speedKmh = speedKmh;
        this.color = color;
        this.spawnedAhead = spawnedAhead;
        this.targetLaneIndex = laneIndex;
        this.currentLaneIndex = laneIndex;
        this.cruiseSpeedKmh = speedKmh;
        this.desiredSpeedKmh = speedKmh;
    }
    update(deltaSeconds) {
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
    setCruiseSpeed(speedKmh) {
        this.desiredSpeedKmh = clamp(speedKmh, GameConfig.traffic.minimumCruiseSpeedKmh, GameConfig.player.maximumSpeedKmh);
    }
    brakeBehind(speedKmh, emergency = false) {
        this.desiredSpeedKmh = clamp(speedKmh, GameConfig.traffic.minimumCruiseSpeedKmh, this.speedKmh);
        this.isBraking = true;
        this.avoidanceAlertSeconds = emergency ? 0.65 : 0.35;
    }
    chooseLane(targetLaneIndex) {
        const safeLaneIndex = Math.max(0, Math.min(GameConfig.road.laneCount - 1, targetLaneIndex));
        if (safeLaneIndex === this.targetLaneIndex)
            return;
        this.targetLaneIndex = safeLaneIndex;
        this.laneChangeCooldownSeconds = 1.2;
        this.avoidanceAlertSeconds = 0.6;
    }
    isChangingLane() {
        return Math.abs(this.x - laneCenter(this.targetLaneIndex)) > 2;
    }
    laneChangeDirection() {
        if (!this.isChangingLane())
            return 0;
        return laneCenter(this.targetLaneIndex) > this.x ? 1 : -1;
    }
}
