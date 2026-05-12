import { BaseEntity } from './BaseEntity.js';
export class Cargo extends BaseEntity {
    bonusPoints;
    constructor(id, x, worldDistanceMeters, bonusPoints) {
        super(id, x, worldDistanceMeters, 42, 42);
        this.bonusPoints = bonusPoints;
    }
}
