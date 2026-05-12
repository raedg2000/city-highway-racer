export class BaseEntity {
    id;
    x;
    worldDistanceMeters;
    width;
    height;
    isActive = true;
    constructor(id, x, worldDistanceMeters, width, height) {
        this.id = id;
        this.x = x;
        this.worldDistanceMeters = worldDistanceMeters;
        this.width = width;
        this.height = height;
    }
    getScreenRectangle(screenY) {
        return {
            x: this.x - this.width / 2,
            y: screenY - this.height / 2,
            width: this.width,
            height: this.height
        };
    }
}
