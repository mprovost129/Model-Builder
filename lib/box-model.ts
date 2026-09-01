import { snapToSixteenth } from "./architectural-units.ts";

export type DimensionKey = "length" | "width" | "height";
export type AxisKey = "x" | "y" | "z";

export type BoxModel = {
  dimensions: Record<DimensionKey, number>;
  position: Record<AxisKey, number>;
  rotationZ: number;
};

export type RotationBaseKey =
  | "center"
  | "corner-min-min"
  | "corner-max-min"
  | "corner-max-max"
  | "corner-min-max"
  | "mid-min-y"
  | "mid-max-x"
  | "mid-max-y"
  | "mid-min-x";

export type RotationBaseDefinition = {
  key: RotationBaseKey;
  label: string;
  xFactor: 0 | 0.5 | 1;
  yFactor: 0 | 0.5 | 1;
};

export type FaceDefinition = {
  axis: AxisKey;
  dimension: DimensionKey;
  index: number;
  label: string;
  sign: 1 | -1;
};

export const MINIMUM_DIMENSION = 1 / 16;
export const MAXIMUM_COORDINATE = 10_000_000;
export const ROTATION_SNAP_DEGREES = 15;

export const ROTATION_BASE_DEFINITIONS: ReadonlyArray<RotationBaseDefinition> = [
  { key: "center", label: "Center", xFactor: 0.5, yFactor: 0.5 },
  { key: "corner-min-min", label: "Corner · −X / −Y", xFactor: 0, yFactor: 0 },
  { key: "corner-max-min", label: "Corner · +X / −Y", xFactor: 1, yFactor: 0 },
  { key: "corner-max-max", label: "Corner · +X / +Y", xFactor: 1, yFactor: 1 },
  { key: "corner-min-max", label: "Corner · −X / +Y", xFactor: 0, yFactor: 1 },
  { key: "mid-min-y", label: "Midpoint · −Y edge", xFactor: 0.5, yFactor: 0 },
  { key: "mid-max-x", label: "Midpoint · +X edge", xFactor: 1, yFactor: 0.5 },
  { key: "mid-max-y", label: "Midpoint · +Y edge", xFactor: 0.5, yFactor: 1 },
  { key: "mid-min-x", label: "Midpoint · −X edge", xFactor: 0, yFactor: 0.5 },
];

export const FACE_DEFINITIONS: ReadonlyArray<FaceDefinition> = [
  { index: 0, axis: "x", dimension: "length", sign: 1, label: "+X · Length end" },
  { index: 1, axis: "x", dimension: "length", sign: -1, label: "−X · Length start" },
  { index: 2, axis: "y", dimension: "width", sign: 1, label: "+Y · Width side" },
  { index: 3, axis: "y", dimension: "width", sign: -1, label: "−Y · Width side" },
  { index: 4, axis: "z", dimension: "height", sign: 1, label: "+Z · Top" },
  { index: 5, axis: "z", dimension: "height", sign: -1, label: "−Z · Bottom" },
];

export const DEFAULT_BOX_MODEL: BoxModel = {
  dimensions: { length: 144, width: 96, height: 96 },
  position: { x: 0, y: 0, z: 0 },
  rotationZ: 0,
};

export function cloneBoxModel(model: BoxModel): BoxModel {
  return {
    dimensions: { ...model.dimensions },
    position: { ...model.position },
    rotationZ: model.rotationZ,
  };
}

export function boxModelsEqual(a: BoxModel, b: BoxModel): boolean {
  return (
    a.dimensions.length === b.dimensions.length &&
    a.dimensions.width === b.dimensions.width &&
    a.dimensions.height === b.dimensions.height &&
    a.position.x === b.position.x &&
    a.position.y === b.position.y &&
    a.position.z === b.position.z &&
    a.rotationZ === b.rotationZ
  );
}

export function normalizeRotationZ(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  const normalized = ((degrees + 180) % 360 + 360) % 360 - 180;
  return Math.round(normalized * 1000) / 1000;
}

export function snapRotationAngle(
  degrees: number,
  increment = ROTATION_SNAP_DEGREES,
): number {
  if (!Number.isFinite(degrees) || !Number.isFinite(increment) || increment <= 0) return 0;
  return normalizeRotationZ(Math.round(degrees / increment) * increment);
}

export function boxLocalAxis(
  model: BoxModel,
  axis: AxisKey,
): Record<AxisKey, number> {
  if (axis === "z") return { x: 0, y: 0, z: 1 };
  const radians = model.rotationZ * Math.PI / 180;
  const rawCosine = Math.cos(radians);
  const rawSine = Math.sin(radians);
  const cosine = Math.abs(rawCosine) < 1e-12 ? 0 : rawCosine;
  const sine = Math.abs(rawSine) < 1e-12 ? 0 : rawSine;
  return axis === "x"
    ? { x: cosine, y: sine, z: 0 }
    : { x: -sine, y: cosine, z: 0 };
}

export function boxWorldPoint(
  model: BoxModel,
  xFactor: number,
  yFactor: number,
  zFactor: number,
): Record<AxisKey, number> {
  const localX = model.dimensions.length * xFactor;
  const localY = model.dimensions.width * yFactor;
  const xAxis = boxLocalAxis(model, "x");
  const yAxis = boxLocalAxis(model, "y");
  return {
    x: model.position.x + xAxis.x * localX + yAxis.x * localY,
    y: model.position.y + xAxis.y * localX + yAxis.y * localY,
    z: model.position.z + model.dimensions.height * zFactor,
  };
}

export function rotationBasePoint(
  model: BoxModel,
  baseKey: RotationBaseKey,
): Record<AxisKey, number> {
  const base = ROTATION_BASE_DEFINITIONS.find((candidate) => candidate.key === baseKey) ?? ROTATION_BASE_DEFINITIONS[0];
  return boxWorldPoint(model, base.xFactor, base.yFactor, 0.5);
}

export function boxWorldBounds(model: BoxModel): {
  maximum: Record<AxisKey, number>;
  minimum: Record<AxisKey, number>;
} {
  const corners = [0, 1].flatMap((xFactor) =>
    [0, 1].flatMap((yFactor) =>
      [0, 1].map((zFactor) => boxWorldPoint(model, xFactor, yFactor, zFactor)),
    ),
  );
  return {
    minimum: {
      x: Math.min(...corners.map((corner) => corner.x)),
      y: Math.min(...corners.map((corner) => corner.y)),
      z: Math.min(...corners.map((corner) => corner.z)),
    },
    maximum: {
      x: Math.max(...corners.map((corner) => corner.x)),
      y: Math.max(...corners.map((corner) => corner.y)),
      z: Math.max(...corners.map((corner) => corner.z)),
    },
  };
}

export function rotateBoxModel(
  model: BoxModel,
  deltaDegrees: number,
  basePoint: Record<AxisKey, number>,
): BoxModel | null {
  if (!Number.isFinite(deltaDegrees)) return null;
  const radians = deltaDegrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const offsetX = model.position.x - basePoint.x;
  const offsetY = model.position.y - basePoint.y;
  const next = cloneBoxModel(model);
  next.position.x = snapToSixteenth(basePoint.x + offsetX * cosine - offsetY * sine);
  next.position.y = snapToSixteenth(basePoint.y + offsetX * sine + offsetY * cosine);
  next.rotationZ = normalizeRotationZ(model.rotationZ + deltaDegrees);
  if (
    Math.abs(next.position.x) > MAXIMUM_COORDINATE ||
    Math.abs(next.position.y) > MAXIMUM_COORDINATE
  ) {
    return null;
  }
  return next;
}

/**
 * Moves one face by a signed distance measured outward from that face.
 * Positive values pull outward; negative values push inward. The opposite
 * face remains fixed. Returns null when the result would be smaller than the
 * supported minimum dimension.
 */
export function moveBoxFace(
  model: BoxModel,
  faceIndex: number,
  outwardDistance: number,
): BoxModel | null {
  const face = FACE_DEFINITIONS[faceIndex];
  if (!face || !Number.isFinite(outwardDistance)) return null;

  const distance = snapToSixteenth(outwardDistance);
  const currentDimension = model.dimensions[face.dimension];
  const nextDimension = snapToSixteenth(currentDimension + distance);
  if (nextDimension < MINIMUM_DIMENSION) return null;

  const next = cloneBoxModel(model);
  next.dimensions[face.dimension] = nextDimension;

  if (face.sign < 0) {
    const axis = boxLocalAxis(model, face.axis);
    next.position.x = snapToSixteenth(model.position.x - axis.x * distance);
    next.position.y = snapToSixteenth(model.position.y - axis.y * distance);
    next.position.z = snapToSixteenth(model.position.z - axis.z * distance);
  }

  return next;
}
