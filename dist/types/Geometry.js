export function rectanglesOverlap(first, second) {
    return (first.x < second.x + second.width &&
        first.x + first.width > second.x &&
        first.y < second.y + second.height &&
        first.y + first.height > second.y);
}
export function insetRectangle(rectangle, horizontalInset, verticalInset) {
    const safeHorizontalInset = Math.min(horizontalInset, rectangle.width / 2 - 1);
    const safeVerticalInset = Math.min(verticalInset, rectangle.height / 2 - 1);
    return {
        x: rectangle.x + safeHorizontalInset,
        y: rectangle.y + safeVerticalInset,
        width: rectangle.width - safeHorizontalInset * 2,
        height: rectangle.height - safeVerticalInset * 2
    };
}
export function expandRectangle(rectangle, horizontalPadding, verticalPadding) {
    return {
        x: rectangle.x - horizontalPadding,
        y: rectangle.y - verticalPadding,
        width: rectangle.width + horizontalPadding * 2,
        height: rectangle.height + verticalPadding * 2
    };
}
export function circlesTouch(first, second) {
    const radiusSum = first.radius + second.radius;
    const deltaX = first.x - second.x;
    const deltaY = first.y - second.y;
    return deltaX * deltaX + deltaY * deltaY <= radiusSum * radiusSum;
}
export function circleIntersectsRectangle(circle, rectangle) {
    const closestX = clampNumber(circle.x, rectangle.x, rectangle.x + rectangle.width);
    const closestY = clampNumber(circle.y, rectangle.y, rectangle.y + rectangle.height);
    const deltaX = circle.x - closestX;
    const deltaY = circle.y - closestY;
    return deltaX * deltaX + deltaY * deltaY <= circle.radius * circle.radius;
}
export function circleIntersectsRotatedRectangle(circle, rectangle) {
    const sine = Math.sin(-rectangle.rotationRadians);
    const cosine = Math.cos(-rectangle.rotationRadians);
    const translatedX = circle.x - rectangle.x;
    const translatedY = circle.y - rectangle.y;
    const localCircle = {
        x: translatedX * cosine - translatedY * sine,
        y: translatedX * sine + translatedY * cosine,
        radius: circle.radius
    };
    return circleIntersectsRectangle(localCircle, {
        x: -rectangle.width / 2,
        y: -rectangle.height / 2,
        width: rectangle.width,
        height: rectangle.height
    });
}
export function circleIntersectsEllipse(circle, ellipse) {
    const expandedRadiusX = ellipse.radiusX + circle.radius;
    const expandedRadiusY = ellipse.radiusY + circle.radius;
    const normalizedX = (circle.x - ellipse.x) / expandedRadiusX;
    const normalizedY = (circle.y - ellipse.y) / expandedRadiusY;
    return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
}
function clampNumber(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
}
