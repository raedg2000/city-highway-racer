export interface Vector2 {
  readonly x: number;
  readonly y: number;
}

export interface MutableVector2 {
  x: number;
  y: number;
}

export interface Rectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface RotatedRectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotationRadians: number;
}

export interface Circle {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export interface Ellipse {
  readonly x: number;
  readonly y: number;
  readonly radiusX: number;
  readonly radiusY: number;
}

export function rectanglesOverlap(first: Rectangle, second: Rectangle): boolean {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

export function insetRectangle(rectangle: Rectangle, horizontalInset: number, verticalInset: number): Rectangle {
  const safeHorizontalInset = Math.min(horizontalInset, rectangle.width / 2 - 1);
  const safeVerticalInset = Math.min(verticalInset, rectangle.height / 2 - 1);

  return {
    x: rectangle.x + safeHorizontalInset,
    y: rectangle.y + safeVerticalInset,
    width: rectangle.width - safeHorizontalInset * 2,
    height: rectangle.height - safeVerticalInset * 2
  };
}

export function expandRectangle(rectangle: Rectangle, horizontalPadding: number, verticalPadding: number): Rectangle {
  return {
    x: rectangle.x - horizontalPadding,
    y: rectangle.y - verticalPadding,
    width: rectangle.width + horizontalPadding * 2,
    height: rectangle.height + verticalPadding * 2
  };
}

export function circlesTouch(first: Circle, second: Circle): boolean {
  const radiusSum = first.radius + second.radius;
  const deltaX = first.x - second.x;
  const deltaY = first.y - second.y;
  return deltaX * deltaX + deltaY * deltaY <= radiusSum * radiusSum;
}

export function circleIntersectsRectangle(circle: Circle, rectangle: Rectangle): boolean {
  const closestX = clampNumber(circle.x, rectangle.x, rectangle.x + rectangle.width);
  const closestY = clampNumber(circle.y, rectangle.y, rectangle.y + rectangle.height);
  const deltaX = circle.x - closestX;
  const deltaY = circle.y - closestY;
  return deltaX * deltaX + deltaY * deltaY <= circle.radius * circle.radius;
}

export function circleIntersectsRotatedRectangle(circle: Circle, rectangle: RotatedRectangle): boolean {
  const sine = Math.sin(-rectangle.rotationRadians);
  const cosine = Math.cos(-rectangle.rotationRadians);
  const translatedX = circle.x - rectangle.x;
  const translatedY = circle.y - rectangle.y;
  const localCircle: Circle = {
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

export function circleIntersectsEllipse(circle: Circle, ellipse: Ellipse): boolean {
  const expandedRadiusX = ellipse.radiusX + circle.radius;
  const expandedRadiusY = ellipse.radiusY + circle.radius;
  const normalizedX = (circle.x - ellipse.x) / expandedRadiusX;
  const normalizedY = (circle.y - ellipse.y) / expandedRadiusY;
  return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
}

function clampNumber(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
