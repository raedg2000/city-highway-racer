import type { LevelDefinition } from '../config/LevelFactory.js';
import { GameConfig } from '../config/GameConfig.js';
import { RandomNumberGenerator } from '../utils/Random.js';

export interface SpeedLimitStatus {
  readonly minimumSpeedKmh: number;
  readonly maximumSpeedKmh: number;
  readonly isViolation: boolean;
  readonly violationSeconds: number;
  readonly secondsUntilPenalty: number;
  readonly penaltyIsActive: boolean;
  readonly recentlyChangedSecondsRemaining: number;
}

export class SpeedLimitSystem {
  private minimumSpeedKmh: number;
  private maximumSpeedKmh: number;
  private nextChangeDistanceMeters: number;
  private violationSeconds = 0;
  private recentlyChangedSecondsRemaining = 0;

  public constructor(
    private readonly level: LevelDefinition,
    private readonly random: RandomNumberGenerator
  ) {
    this.minimumSpeedKmh = level.startingMinimumSpeedKmh;
    this.maximumSpeedKmh = level.startingMaximumSpeedKmh;
    this.nextChangeDistanceMeters = level.speedRuleChangeDistanceMeters;
  }

  public update(deltaSeconds: number, playerSpeedKmh: number, playerDistanceMeters: number): SpeedLimitStatus {
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

  public getStatus(isViolationOverride?: boolean): SpeedLimitStatus {
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

  private changeSpeedRule(playerDistanceMeters: number): void {
    this.minimumSpeedKmh = GameConfig.rules.minimumSpeedLimitKmh;
    this.maximumSpeedKmh = GameConfig.rules.maximumSpeedLimitKmh;

    this.recentlyChangedSecondsRemaining = 0;
    this.nextChangeDistanceMeters = playerDistanceMeters + this.level.speedRuleChangeDistanceMeters + this.random.range(-90, 180);
  }
}
