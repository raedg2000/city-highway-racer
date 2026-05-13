import { clamp } from '../utils/MathUtils.js';
import { GameConfig } from './GameConfig.js';

export interface LevelDefinition {
  readonly levelNumber: number;
  readonly fromCity: string;
  readonly toCity: string;
  readonly distanceMeters: number;
  readonly startingMinimumSpeedKmh: number;
  readonly startingMaximumSpeedKmh: number;
  readonly trafficSpawnIntervalSeconds: number;
  readonly rearTrafficSpawnIntervalSeconds: number;
  readonly obstacleSpawnIntervalSeconds: number;
  readonly cargoSpawnIntervalSeconds: number;
  readonly trafficLaneChangeChancePerSecond: number;
  readonly speedRuleChangeDistanceMeters: number;
  readonly targetCompletionSeconds: number;
  readonly seed: number;
}

const cities = [
  'Cedar Town',
  'Harbor City',
  'Palm Junction',
  'Metro Bay',
  'Oakridge',
  'Sunset Port',
  'Hill Valley',
  'Lakeview',
  'Skyline City',
  'Riverbend'
] as const;

export function createLevelDefinition(levelNumber: number): LevelDefinition {
  const index = Math.max(1, Math.floor(levelNumber));
  const fromCity = cities[(index - 1) % cities.length];
  const toCity = cities[index % cities.length];
  const distanceMeters = 2300 + index * 520;
  const startingMinimumSpeedKmh = GameConfig.rules.minimumSpeedLimitKmh;
  const startingMaximumSpeedKmh = GameConfig.rules.maximumSpeedLimitKmh;

  return {
    levelNumber: index,
    fromCity,
    toCity,
    distanceMeters,
    startingMinimumSpeedKmh,
    startingMaximumSpeedKmh,
    trafficSpawnIntervalSeconds: clamp(3.2 - index * 0.08, 1.35, 3.2),
    rearTrafficSpawnIntervalSeconds: clamp(18 - index * 0.7, 7.5, 18),
    obstacleSpawnIntervalSeconds: clamp(14 - index * 0.5, 5.6, 14),
    cargoSpawnIntervalSeconds: clamp(6.4 - index * 0.08, 4.6, 6.4),
    trafficLaneChangeChancePerSecond: clamp(0.025 + index * 0.011, 0.025, 0.18),
    speedRuleChangeDistanceMeters: clamp(1050 - index * 42, 520, 1050),
    targetCompletionSeconds: distanceMeters / ((150 + index * 4) / 3.6),
    seed: 2049 + index * 977
  };
}
