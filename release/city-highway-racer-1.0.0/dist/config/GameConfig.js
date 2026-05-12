export const GameConfig = {
    canvas: {
        width: 1280,
        height: 720
    },
    road: {
        left: 260,
        right: 1020,
        laneCount: 4,
        shoulderWidth: 28,
        centerLineWidth: 8,
        dashedLineHeight: 46,
        dashedLineGap: 58
    },
    player: {
        width: 54,
        height: 82,
        screenY: 570,
        accelerationKmhPerSecond: 56,
        brakeKmhPerSecond: 84,
        dragKmhPerSecond: 2.5,
        steeringPixelsPerSecond: 450,
        maximumSpeedKmh: 160
    },
    traffic: {
        laneChangePixelsPerSecond: 116,
        accelerationKmhPerSecond: 34,
        brakingKmhPerSecond: 86,
        emergencyBrakingKmhPerSecond: 128,
        minimumCruiseSpeedKmh: 24,
        followingLookAheadMeters: 30,
        safeFrontGapMeters: 20,
        safeRearGapMeters: 17
    },
    world: {
        pixelsPerMeter: 5.75,
        entityCleanupBehindMeters: 125,
        entitySpawnAheadMeters: 155,
        scenerySpacingMeters: 25
    },
    rules: {
        speedPenaltyDelaySeconds: 5,
        speedPenaltyPointsPerSecond: 1,
        speedLimitWarmupDistanceMeters: 135,
        finishBonusBase: 950,
        safePassBonus: 25
    },
    audio: {
        backgroundMusicPath: './assets/music/background.mp3',
        musicVolume: 0.34,
        effectsVolume: 0.55
    }
};
export function laneWidth() {
    return (GameConfig.road.right - GameConfig.road.left) / GameConfig.road.laneCount;
}
export function laneCenter(laneIndex) {
    return GameConfig.road.left + laneWidth() * (laneIndex + 0.5);
}
