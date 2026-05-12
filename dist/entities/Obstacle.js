import { GameConfig } from '../config/GameConfig.js';
import { clamp } from '../utils/MathUtils.js';
import { BaseEntity } from './BaseEntity.js';
export class Obstacle extends BaseEntity {
    kind;
    accidentVehicles;
    constructor(id, kind, x, worldDistanceMeters, width = kind === 'pit' ? 78 : 132, height = kind === 'pit' ? 66 : 118, accidentVehicles = []) {
        super(id, x, worldDistanceMeters, width, height);
        this.kind = kind;
        this.accidentVehicles = accidentVehicles;
    }
    static createTrafficAccident(id, firstVehicle, secondVehicle, random) {
        const centerX = (firstVehicle.x + secondVehicle.x) / 2;
        const centerWorldDistanceMeters = (firstVehicle.worldDistanceMeters + secondVehicle.worldDistanceMeters) / 2;
        const firstRotation = random.range(-0.56, 0.56);
        const secondRotation = random.range(-0.56, 0.56) + (firstRotation > 0 ? -0.34 : 0.34);
        const accidentVehicles = [
            this.createAccidentVisual(firstVehicle, centerX, centerWorldDistanceMeters, firstRotation),
            this.createAccidentVisual(secondVehicle, centerX, centerWorldDistanceMeters, secondRotation)
        ];
        const width = this.measureAccidentWidth(accidentVehicles);
        const height = this.measureAccidentHeight(accidentVehicles);
        return new Obstacle(id, 'accident', centerX, centerWorldDistanceMeters, width, height, accidentVehicles);
    }
    static createStaticAccident(id, x, worldDistanceMeters, firstKind, firstColor, secondKind, secondColor, random) {
        const firstSize = this.sizeForKind(firstKind);
        const secondSize = this.sizeForKind(secondKind);
        const accidentVehicles = [
            {
                kind: firstKind,
                color: firstColor,
                width: firstSize.width,
                height: firstSize.height,
                offsetX: random.range(-32, -18),
                offsetY: random.range(-18, 12),
                rotationRadians: random.range(-0.58, -0.28)
            },
            {
                kind: secondKind,
                color: secondColor,
                width: secondSize.width,
                height: secondSize.height,
                offsetX: random.range(18, 34),
                offsetY: random.range(-4, 22),
                rotationRadians: random.range(0.26, 0.62)
            }
        ];
        const width = this.measureAccidentWidth(accidentVehicles);
        const height = this.measureAccidentHeight(accidentVehicles);
        return new Obstacle(id, 'accident', x, worldDistanceMeters, width, height, accidentVehicles);
    }
    static createAccidentVisual(vehicle, centerX, centerWorldDistanceMeters, rotationRadians) {
        return {
            kind: vehicle.kind,
            color: vehicle.color,
            width: vehicle.width,
            height: vehicle.height,
            offsetX: vehicle.x - centerX,
            offsetY: -(vehicle.worldDistanceMeters - centerWorldDistanceMeters) * GameConfig.world.pixelsPerMeter,
            rotationRadians
        };
    }
    static sizeForKind(kind) {
        const sizes = {
            car: { width: 48, height: 76 },
            pickup: { width: 54, height: 88 },
            truck: { width: 64, height: 122 },
            bus: { width: 62, height: 132 },
            motorcycle: { width: 28, height: 54 }
        };
        return sizes[kind];
    }
    static measureAccidentWidth(vehicles) {
        const halfWidth = Math.max(...vehicles.map((vehicle) => Math.abs(vehicle.offsetX) + vehicle.width * 0.62));
        return clamp(halfWidth * 2 + 34, 118, 224);
    }
    static measureAccidentHeight(vehicles) {
        const halfHeight = Math.max(...vehicles.map((vehicle) => Math.abs(vehicle.offsetY) + vehicle.height * 0.6));
        return clamp(halfHeight * 2 + 40, 108, 242);
    }
}
