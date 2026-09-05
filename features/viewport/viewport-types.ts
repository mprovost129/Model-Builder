/**
 * Vocabulary shared between the viewport and the app shell: the command objects
 * the shell sends into the viewport, the draft settings it carries, and the
 * small pure helpers both sides use to describe a command's current stage.
 * Extracted from app/model-builder-app.tsx.
 */
import {
  type BoxGripKind,
} from "@/lib/box-grips";
import {
  type AxisKey,
} from "@/lib/box-model";
import {
  ARC_METHODS,
  type ArcMethod,
} from "@/lib/cad-arc";
import {
  CIRCLE_METHODS,
  type CircleMethod,
} from "@/lib/cad-circle";
import {
  type LinePoint,
} from "@/lib/cad-line";
import {
  type CadSnapKind,
} from "@/lib/cad-point-acquisition";
import {
  type RectangleAreaBasis,
  type RectangleConstructionOptions,
} from "@/lib/cad-polyline";

export type DragStatus = {
  angle?: number;
  axis?: AxisKey;
  axisDistances?: Partial<Record<AxisKey, number>>;
  distance: number;
  factor?: number;
  gripKind?: BoxGripKind;
  kind: "arc" | "arc-grip" | "boundary" | "break" | "chamfer" | "circle" | "circle-grip" | "copy" | "entry" | "extend" | "face" | "fillet" | "grip" | "lengthen" | "line" | "line-grip" | "mirror" | "object" | "offset" | "plan-move" | "polyline" | "polyline-grip" | "rectangle" | "rotate" | "scale" | "stretch" | "trim";
  snapped?: boolean;
  polarAngle?: number | null;
  valid: boolean;
};

export type LineViewportCommand =
  | { id: number; kind: "coordinate"; point: LinePoint }
  | { distance: number; id: number; kind: "distance" }
  | { id: number; kind: "close" | "undo" };

export type RectangleViewportCommand =
  | { id: number; kind: "coordinate"; point: LinePoint }
  | { height: number; id: number; kind: "dimensions"; width: number };

export type RectangleMethod = "area" | "corners" | "dimensions";

export type RectangleDraftSettings = RectangleConstructionOptions & {
  area: number;
  areaBasis: RectangleAreaBasis;
  fixedDimension: number;
  height: number;
  method: RectangleMethod;
  widthDimension: number;
};

export type PolylineViewportCommand =
  | { id: number; kind: "coordinate"; point: LinePoint }
  | { distance: number; id: number; kind: "distance" }
  | { id: number; kind: "close" | "finish" | "undo" };

export type PolylineSegmentMode = "arc" | "line";

export type CircleViewportCommand =
  | { id: number; kind: "coordinate"; point: LinePoint }
  | { distance: number; id: number; kind: "distance" }
  | { id: number; kind: "scalar"; value: number };

export type ArcViewportCommand =
  | { id: number; kind: "coordinate"; point: LinePoint }
  | { distance: number; id: number; kind: "distance" }
  | { id: number; kind: "scalar"; scalar: "angle" | "direction-angle" | "length" | "radius"; value: number };

export type ArcContinueSeed = { direction: LinePoint; source: string; start: LinePoint };

export const CAD_SNAP_LABELS: Record<CadSnapKind, string> = {
  center: "CEN",
  corner: "CORNER",
  endpoint: "END",
  extension: "EXT",
  "geometric-center": "GCE",
  grid: "GRID",
  intersection: "INT",
  midpoint: "MID",
  nearest: "NEAR",
  node: "NODE",
  ortho: "ORTHO",
  parallel: "PAR",
  perpendicular: "PERP",
  polar: "POLAR",
  quadrant: "QUAD",
  tangent: "TAN",
  tracking: "TRACK",
};

export function arcMethodDefinition(method: ArcMethod) {
  return ARC_METHODS.find((definition) => definition.method === method) ?? ARC_METHODS[0];
}

export function circleMethodDefinition(method: CircleMethod) {
  return CIRCLE_METHODS.find((definition) => definition.method === method) ?? CIRCLE_METHODS[0];
}

export function circlePointStage(method: CircleMethod, pointCount: number): string {
  if (method === "tangent-tangent-radius") return pointCount < 2 ? `${pointCount === 0 ? "first" : "second"} tangent object` : "radius";
  if (method === "tangent-tangent-tangent") return `${["first", "second", "third"][Math.min(pointCount, 2)]} tangent object`;
  if (method === "three-point") return ["first circumference point", "second circumference point", "third circumference point"][Math.min(pointCount, 2)];
  if (method === "two-point") return pointCount ? "second diameter endpoint" : "first diameter endpoint";
  if (method === "center-diameter") return pointCount ? "diameter or diameter point" : "center point";
  return pointCount ? "radius or edge point" : "center point";
}

export function planarDistance(first: LinePoint, second: LinePoint): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function arcPointStage(method: ArcMethod, count: number): string {
  if (method === "continue") return "endpoint";
  const roles: Record<Exclude<ArcMethod, "continue">, [string, string]> = {
    "three-point": ["start point", "second point on the Arc"],
    "start-center-end": ["start point", "center point"],
    "start-center-angle": ["start point", "center point"],
    "start-center-length": ["start point", "center point"],
    "start-end-angle": ["start point", "endpoint"],
    "start-end-direction": ["start point", "endpoint"],
    "start-end-radius": ["start point", "endpoint"],
    "center-start-end": ["center point", "start point"],
    "center-start-angle": ["center point", "start point"],
    "center-start-length": ["center point", "start point"],
  };
  if (count < 2) return roles[method][count];
  if (method === "three-point" || method === "start-center-end" || method === "center-start-end") return "endpoint";
  if (method.includes("angle")) return method === "start-end-angle" ? "included angle or point on Arc" : "included angle";
  if (method === "start-end-direction") return "starting tangent direction";
  if (method === "start-end-radius") return "radius";
  return "chord length";
}

export function arcCursorAnchor(method: ArcMethod, points: LinePoint[], seed: ArcContinueSeed | null): LinePoint | null {
  if (method === "continue") return seed?.start ?? null;
  if (points.length < 2) return points.at(-1) ?? null;
  if (method === "start-center-length" || method === "start-end-direction" || method === "start-end-radius") return points[0];
  if (method === "center-start-angle") return points[0];
  return points[1];
}
