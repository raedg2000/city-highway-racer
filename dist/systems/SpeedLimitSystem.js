import { GameConfig } from '../config/GameConfig.js';
import { clamp, roundToNearest } from '../utils/MathUtils.js';
export class SpeedLimitSystem {
    level;
    random;
    minimumSpeedKmh;
    maximumSpeedKmh;
    nextChangeDistanceMeters;
    violationSeconds = 0;
    recentlyChangedSecondsRemaining = 0;
    constructor(level, random) {
        this.level = level;
        this.random = random;
        this.minimumSpeedKmh = level.startingMinimumSpeedKmh;
        this.maximumSpeedKmh = level.startingMaximumSpeedKmh;
        this.nextChangeDistanceMeters = level.speedRuleChangeDistanceMeters;
    }
    update(deltaSeconds, playerSpeedKmh, playerDistanceMeters) {
        if (playerDistanceMeters >= this.nextChangeDistanceMeters) {
            this.changeSpeedRule(playerDistanceMeters);
        }
        const isBelowMinimum = playerSpeedKmh < this.minimumSpeedKmh;
        const isAboveMaximum = playerSpeedKmh > this.maximumSpeedKmh;
        const isStillLeavingCity = playerDistanceMeters < GameConfig.rules.speedLimitWarmupDistanceMeters && isBelowMinimum;
        const isViolation = !isStillLeavingCity && (isBelowMinimum || isAboveMaximum);
        this.violationSeconds = isViolation ? this.violationSeconds + deltaSeconds : 0;
        this.recentlyChangedSecondsRemaining = Math.max(0, this.recentlyChangedSecondsRemaining - deltaSeconds);
        return this.getStatus(isViolation);
    }
    getStatus(isViolationOverride) {
        const isViolation = isViolationOverride ?? false;
        const secondsUntilPenalty = Math.max(0, GameConfig.rules.speedPenaltyDelaySeconds - this.violationSeconds);
        return {
            minimumSpeedKmh: this.minimumSpeedKmh,
            maximumSpeedKmh: this.maximumSpeedKmh,
            isViolation,
            violationSeconds: this.violationSeconds,
            secondsUntilPenalty,
            penaltyIsActive: isViolation && secondsUntilPenalty <= 0,
            recentlyChangedSecondsRemaining: this.recentlyChangedSecondsRemaining
        };
    }
    changeSpeedRule(playerDistanceMeters) {
        const speedShift = this.random.integer(-2, 3) * 5;
        const baseMinimum = clamp(this.level.startingMinimumSpeedKmh + speedShift + this.random.integer(-1, 2) * 5, 20, 75);
        const range = this.random.pick([50, 55, 60, 65, 70]);
        const maxByLevel = clamp(122 + this.level.levelNumber * 5, 120, 155);
        this.minimumSpeedKmh = roundToNearest(baseMinimum, 5);
        this.maximumSpeedKmh = roundToNearest(clamp(this.minimumSpeedKmh + range, 95, maxByLevel), 5);
        if (this.maximumSpeedKmh <= this.minimumSpeedKmh + 35)
            this.maximumSpeedKmh = this.minimumSpeedKmh + 40;
        this.recentlyChangedSecondsRemaining = 5.5;
        this.nextChangeDistanceMeters = playerDistanceMeters + this.level.speedRuleChangeDistanceMeters + this.random.range(-90, 180);
    }
}
