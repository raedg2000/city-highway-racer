import { clamp } from '../utils/MathUtils.js';
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
];
export function createLevelDefinition(levelNumber) {
    const index = Math.max(1, Math.floor(levelNumber));
    const fromCity = cities[(index - 1) % cities.length];
    const toCity = cities[index % cities.length];
    const distanceMeters = 2300 + index * 520;
    const startingMinimumSpeedKmh = clamp(25 + Math.floor((index - 1) / 3) * 5, 25, 65);
    const startingMaximumSpeedKmh = clamp(115 + Math.floor((index - 1) / 4) * 5, 110, 145);
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
        targetCompletionSeconds: distanceMeters / ((88 + index * 2) / 3.6),
        seed: 2049 + index * 977
    };
}
