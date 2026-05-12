export class RandomNumberGenerator {
    seed;
    constructor(seed) {
        this.seed = seed >>> 0;
    }
    next() {
        this.seed = (1664525 * this.seed + 1013904223) >>> 0;
        return this.seed / 0x100000000;
    }
    range(minimum, maximum) {
        return minimum + (maximum - minimum) * this.next();
    }
    integer(minimum, maximumInclusive) {
        return Math.floor(this.range(minimum, maximumInclusive + 1));
    }
    chance(probability) {
        return this.next() < probability;
    }
    pick(items) {
        if (items.length === 0)
            throw new Error('Cannot pick from an empty array.');
        return items[this.integer(0, items.length - 1)];
    }
}
export function deterministicNoise(index, salt) {
    let value = (index * 374761393 + salt * 668265263) >>> 0;
    value = (value ^ (value >> 13)) >>> 0;
    value = Math.imul(value, 1274126177) >>> 0;
    return ((value ^ (value >> 16)) >>> 0) / 0x100000000;
}
