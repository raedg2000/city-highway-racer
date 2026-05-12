import { GameConfig, laneCenter } from '../config/GameConfig.js';
import { Obstacle } from '../entities/Obstacle.js';
import { CollisionSystem } from './CollisionSystem.js';
import { clamp } from '../utils/MathUtils.js';
export class TrafficSystem {
    level;
    random;
    collisionSystem = new CollisionSystem();
    accidentCounter = 0;
    constructor(level, random) {
        this.level = level;
        this.random = random;
    }
    update(deltaSeconds, trafficVehicles) {
        const activeVehicles = trafficVehicles.filter((vehicle) => vehicle.isActive);
        this.resetVehicleIntentions(activeVehicles);
        this.planOvertakingAndBraking(deltaSeconds, activeVehicles);
        this.planRandomLaneChanges(deltaSeconds, activeVehicles);
        for (const vehicle of activeVehicles)
            vehicle.update(deltaSeconds);
        const accidents = this.convertTrafficCollisionsToAccidents(activeVehicles);
        return { accidents };
    }
    resetVehicleIntentions(trafficVehicles) {
        for (const vehicle of trafficVehicles) {
            vehicle.isBraking = false;
            vehicle.setCruiseSpeed(vehicle.cruiseSpeedKmh);
        }
    }
    planOvertakingAndBraking(deltaSeconds, trafficVehicles) {
        const followers = [...trafficVehicles].sort((first, second) => second.worldDistanceMeters - first.worldDistanceMeters);
        for (const follower of followers) {
            const lead = this.findClosestLeadVehicle(follower, trafficVehicles);
            if (!lead)
                continue;
            const gapMeters = lead.worldDistanceMeters - follower.worldDistanceMeters - this.combinedHalfLengthMeters(follower, lead);
            const closingSpeedKmh = Math.max(0, follower.speedKmh - lead.speedKmh);
            const lookAheadMeters = GameConfig.traffic.followingLookAheadMeters + closingSpeedKmh * 0.38;
            if (gapMeters > lookAheadMeters)
                continue;
            const safeLane = this.findSafePassingLane(follower, trafficVehicles);
            if (safeLane !== null) {
                follower.chooseLane(safeLane);
                follower.setCruiseSpeed(Math.max(follower.cruiseSpeedKmh, lead.speedKmh + 10));
                continue;
            }
            const emergency = gapMeters < 7;
            const driverMistakeChance = emergency ? clamp(0.008 + this.level.levelNumber * 0.003, 0.008, 0.045) * deltaSeconds : 0;
            if (driverMistakeChance > 0 && this.random.chance(driverMistakeChance)) {
                follower.setCruiseSpeed(Math.max(follower.speedKmh, lead.speedKmh + 16));
                follower.avoidanceAlertSeconds = 0.8;
                continue;
            }
            const desiredSpeed = Math.min(follower.cruiseSpeedKmh, lead.speedKmh - (emergency ? 18 : 7));
            follower.brakeBehind(desiredSpeed, emergency);
        }
    }
    planRandomLaneChanges(deltaSeconds, trafficVehicles) {
        const chance = this.level.trafficLaneChangeChancePerSecond * deltaSeconds;
        for (const vehicle of trafficVehicles) {
            if (vehicle.isChangingLane() || vehicle.laneChangeCooldownSeconds > 0)
                continue;
            if (!this.random.chance(chance))
                continue;
            const direction = this.random.pick([-1, 1]);
            const candidateLane = vehicle.targetLaneIndex + direction;
            if (candidateLane < 0 || candidateLane >= GameConfig.road.laneCount)
                continue;
            if (!this.isLaneSafe(vehicle, candidateLane, trafficVehicles))
                continue;
            vehicle.chooseLane(candidateLane);
        }
    }
    findClosestLeadVehicle(follower, trafficVehicles) {
        let closestLead = null;
        let closestGap = Number.POSITIVE_INFINITY;
        for (const other of trafficVehicles) {
            if (other === follower || !other.isActive)
                continue;
            if (!this.vehiclesShareTravelPath(follower, other))
                continue;
            const gap = other.worldDistanceMeters - follower.worldDistanceMeters;
            if (gap <= 0 || gap >= closestGap)
                continue;
            closestLead = other;
            closestGap = gap;
        }
        return closestLead;
    }
    findSafePassingLane(vehicle, trafficVehicles) {
        const directions = this.random.chance(0.5) ? [-1, 1] : [1, -1];
        for (const direction of directions) {
            const candidateLane = vehicle.targetLaneIndex + direction;
            if (candidateLane < 0 || candidateLane >= GameConfig.road.laneCount)
                continue;
            if (this.isLaneSafe(vehicle, candidateLane, trafficVehicles))
                return candidateLane;
        }
        return null;
    }
    isLaneSafe(vehicle, laneIndex, trafficVehicles) {
        const vehicleCenterX = laneCenter(laneIndex);
        for (const other of trafficVehicles) {
            if (other === vehicle || !other.isActive)
                continue;
            if (!this.vehicleUsesLane(other, laneIndex, vehicleCenterX))
                continue;
            const gapMeters = other.worldDistanceMeters - vehicle.worldDistanceMeters;
            const dynamicFrontGap = GameConfig.traffic.safeFrontGapMeters + Math.max(0, vehicle.speedKmh - other.speedKmh) * 0.24;
            const dynamicRearGap = GameConfig.traffic.safeRearGapMeters + Math.max(0, other.speedKmh - vehicle.speedKmh) * 0.2;
            const requiredGap = this.combinedHalfLengthMeters(vehicle, other) + (gapMeters >= 0 ? dynamicFrontGap : dynamicRearGap);
            if (Math.abs(gapMeters) < requiredGap)
                return false;
        }
        return true;
    }
    vehicleUsesLane(vehicle, laneIndex, laneCenterX) {
        return (vehicle.currentLaneIndex === laneIndex ||
            vehicle.targetLaneIndex === laneIndex ||
            Math.abs(vehicle.x - laneCenterX) < vehicle.width * 0.82);
    }
    vehiclesShareTravelPath(first, second) {
        return (first.currentLaneIndex === second.currentLaneIndex ||
            first.targetLaneIndex === second.targetLaneIndex ||
            first.currentLaneIndex === second.targetLaneIndex ||
            first.targetLaneIndex === second.currentLaneIndex ||
            Math.abs(first.x - second.x) < (first.width + second.width) * 0.55);
    }
    combinedHalfLengthMeters(first, second) {
        return (first.height + second.height) / (2 * GameConfig.world.pixelsPerMeter);
    }
    convertTrafficCollisionsToAccidents(trafficVehicles) {
        const accidents = [];
        for (let firstIndex = 0; firstIndex < trafficVehicles.length; firstIndex += 1) {
            const firstVehicle = trafficVehicles[firstIndex];
            if (!firstVehicle.isActive)
                continue;
            for (let secondIndex = firstIndex + 1; secondIndex < trafficVehicles.length; secondIndex += 1) {
                const secondVehicle = trafficVehicles[secondIndex];
                if (!secondVehicle.isActive)
                    continue;
                if (!this.trafficVehiclesTouch(firstVehicle, secondVehicle))
                    continue;
                firstVehicle.isActive = false;
                secondVehicle.isActive = false;
                accidents.push(Obstacle.createTrafficAccident(this.nextAccidentId(), firstVehicle, secondVehicle, this.random));
                break;
            }
        }
        return accidents;
    }
    trafficVehiclesTouch(firstVehicle, secondVehicle) {
        const firstY = firstVehicle.worldDistanceMeters * GameConfig.world.pixelsPerMeter;
        const secondY = secondVehicle.worldDistanceMeters * GameConfig.world.pixelsPerMeter;
        const firstCircles = this.collisionSystem.createVehicleContactCircles(firstVehicle.x, firstY, firstVehicle.width, firstVehicle.height, firstVehicle.kind);
        const secondCircles = this.collisionSystem.createVehicleContactCircles(secondVehicle.x, secondY, secondVehicle.width, secondVehicle.height, secondVehicle.kind);
        return this.collisionSystem.circleSetsTouch(firstCircles, secondCircles);
    }
    nextAccidentId() {
        this.accidentCounter += 1;
        return `traffic-accident-${this.accidentCounter}`;
    }
}
