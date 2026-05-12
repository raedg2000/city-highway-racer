import type { Rectangle } from '../types/Geometry.js';

export abstract class BaseEntity {
  public isActive = true;

  protected constructor(
    public readonly id: string,
    public x: number,
    public worldDistanceMeters: number,
    public readonly width: number,
    public readonly height: number
  ) {}

  public getScreenRectangle(screenY: number): Rectangle {
    return {
      x: this.x - this.width / 2,
      y: screenY - this.height / 2,
      width: this.width,
      height: this.height
    };
  }
}
