import { BaseEntity } from './BaseEntity.js';

export class Cargo extends BaseEntity {
  public constructor(
    id: string,
    x: number,
    worldDistanceMeters: number,
    public readonly bonusPoints: number
  ) {
    super(id, x, worldDistanceMeters, 42, 42);
  }
}
