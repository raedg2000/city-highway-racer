export class RandomNumberGenerator {
  private seed: number;

  public constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  public next(): number {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }

  public range(minimum: number, maximum: number): number {
    return minimum + (maximum - minimum) * this.next();
  }

  public integer(minimum: number, maximumInclusive: number): number {
    return Math.floor(this.range(minimum, maximumInclusive + 1));
  }

  public chance(probability: number): boolean {
    return this.next() < probability;
  }

  public pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Cannot pick from an empty array.');
    return items[this.integer(0, items.length - 1)];
  }
}

export function deterministicNoise(index: number, salt: number): number {
  let value = (index * 374761393 + salt * 668265263) >>> 0;
  value = (value ^ (value >> 13)) >>> 0;
  value = Math.imul(value, 1274126177) >>> 0;
  return ((value ^ (value >> 16)) >>> 0) / 0x100000000;
}
