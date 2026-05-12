export function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
}
export function lerp(start, end, amount) {
    return start + (end - start) * amount;
}
export function moveTowards(current, target, maximumDelta) {
    if (Math.abs(target - current) <= maximumDelta)
        return target;
    return current + Math.sign(target - current) * maximumDelta;
}
export function kmhToMetersPerSecond(speedKmh) {
    return speedKmh / 3.6;
}
export function metersPerSecondToKmh(speedMetersPerSecond) {
    return speedMetersPerSecond * 3.6;
}
export function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const tenths = Math.floor((totalSeconds % 1) * 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
}
export function roundToNearest(value, step) {
    return Math.round(value / step) * step;
}
