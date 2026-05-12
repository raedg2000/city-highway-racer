export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

export function moveTowards(current: number, target: number, maximumDelta: number): number {
  if (Math.abs(target - current) <= maximumDelta) return target;
  return current + Math.sign(target - current) * maximumDelta;
}

export function kmhToMetersPerSecond(speedKmh: number): number {
  return speedKmh / 3.6;
}

export function metersPerSecondToKmh(speedMetersPerSecond: number): number {
  return speedMetersPerSecond * 3.6;
}

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const tenths = Math.floor((totalSeconds % 1) * 10);
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
}

export function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}
