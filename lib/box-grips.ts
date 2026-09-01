import {
  boxWorldPoint,
  cloneBoxModel,
  moveBoxFace,
  type AxisKey,
  type BoxModel,
} from "./box-model.ts";

export type BoxGripKind = "corner" | "edge" | "face";
export type GripSign = -1 | 0 | 1;

export type BoxGripDefinition = {
  axes: AxisKey[];
  id: string;
  kind: BoxGripKind;
  signs: Record<AxisKey, GripSign>;
};

const AXES: AxisKey[] = ["x", "y", "z"];
const SIGNS: GripSign[] = [-1, 0, 1];
const FACE_INDEX_BY_AXIS_AND_SIGN: Record<AxisKey, Record<-1 | 1, number>> = {
  x: { "-1": 1, "1": 0 },
  y: { "-1": 3, "1": 2 },
  z: { "-1": 5, "1": 4 },
};

export const BOX_GRIP_DEFINITIONS: BoxGripDefinition[] = SIGNS.flatMap((x) =>
  SIGNS.flatMap((y) =>
    SIGNS.map((z) => ({ x, y, z })),
  ),
)
  .filter(({ x, y, z }) => x !== 0 || y !== 0 || z !== 0)
  .map((signs) => {
    const axes = AXES.filter((axis) => signs[axis] !== 0);
    const kind: BoxGripKind = axes.length === 1
      ? "face"
      : axes.length === 2
        ? "edge"
        : "corner";
    return {
      axes,
      id: `${kind}:${signs.x},${signs.y},${signs.z}`,
      kind,
      signs,
    };
  });

export function boxGripPosition(
  model: BoxModel,
  grip: BoxGripDefinition,
): Record<AxisKey, number> {
  const factors = Object.fromEntries(
    AXES.map((axis) => [axis, grip.signs[axis] < 0 ? 0 : grip.signs[axis] > 0 ? 1 : 0.5]),
  ) as Record<AxisKey, number>;
  return boxWorldPoint(model, factors.x, factors.y, factors.z);
}

/**
 * Resizes an axis-aligned box from a grip. Coordinate deltas are measured in
 * world X/Y/Z. Every opposite face remains fixed, preserving a rectangular box.
 */
export function resizeBoxFromGrip(
  model: BoxModel,
  grip: BoxGripDefinition,
  coordinateDeltas: Partial<Record<AxisKey, number>>,
): BoxModel | null {
  let next = cloneBoxModel(model);
  for (const axis of grip.axes) {
    const sign = grip.signs[axis];
    if (sign === 0) continue;
    const coordinateDelta = coordinateDeltas[axis] ?? 0;
    const resized = moveBoxFace(
      next,
      FACE_INDEX_BY_AXIS_AND_SIGN[axis][sign],
      coordinateDelta * sign,
    );
    if (!resized) return null;
    next = resized;
  }
  return next;
}

export function faceIndexForBoxGrip(grip: BoxGripDefinition): number | null {
  if (grip.kind !== "face") return null;
  const axis = grip.axes[0];
  const sign = grip.signs[axis];
  return sign === 0 ? null : FACE_INDEX_BY_AXIS_AND_SIGN[axis][sign];
}
