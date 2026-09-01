import { findLayer, type ModelDocument } from "./document-model.ts";
import type { CadStretchTarget } from "./cad-stretch.ts";

export type CadEntityKind = "arc" | "box" | "circle" | "line" | "polyline";

export type CadEntityRef = {
  id: string;
  kind: CadEntityKind;
};

export type ScreenPoint = {
  x: number;
  y: number;
};

export type ScreenSegment = {
  end: ScreenPoint;
  start: ScreenPoint;
};

export type ScreenSelectionGeometry = {
  points: ScreenPoint[];
  ref: CadEntityRef;
  segments: ScreenSegment[];
};

export type ScreenStretchGeometry = ScreenSelectionGeometry & {
  handles: Array<{ component: number; point: ScreenPoint }>;
};

export type SelectionWindowMode = "crossing" | "window";

export type SelectionCycleState = {
  candidateKeys: string[];
  index: number;
  point: ScreenPoint;
  updatedAt: number;
};

export function cadEntityKey(ref: CadEntityRef): string {
  return `${ref.kind}:${ref.id}`;
}

export function cadEntityRefFromKey(key: string): CadEntityRef | null {
  const separator = key.indexOf(":");
  if (separator <= 0 || separator === key.length - 1) return null;
  const kind = key.slice(0, separator) as CadEntityKind;
  if (!["arc", "box", "circle", "line", "polyline"].includes(kind)) return null;
  return { id: key.slice(separator + 1), kind };
}

export function visibleCadEntityRefs(document: ModelDocument): CadEntityRef[] {
  const visible = (layerId: string) => Boolean(findLayer(document, layerId)?.visible);
  return [
    ...document.objects.filter((entity) => visible(entity.layerId)).map((entity) => ({ id: entity.id, kind: "box" as const })),
    ...document.lines.filter((entity) => visible(entity.layerId)).map((entity) => ({ id: entity.id, kind: "line" as const })),
    ...document.polylines.filter((entity) => visible(entity.layerId)).map((entity) => ({ id: entity.id, kind: "polyline" as const })),
    ...document.circles.filter((entity) => visible(entity.layerId)).map((entity) => ({ id: entity.id, kind: "circle" as const })),
    ...document.arcs.filter((entity) => visible(entity.layerId)).map((entity) => ({ id: entity.id, kind: "arc" as const })),
  ];
}

export function selectionWindowMode(start: ScreenPoint, end: ScreenPoint): SelectionWindowMode {
  return end.x >= start.x ? "window" : "crossing";
}

export function advanceSelectionCycle(
  previous: SelectionCycleState | null,
  candidateKeys: string[],
  point: ScreenPoint,
  updatedAt: number,
  maximumDistance = 6,
  timeoutMilliseconds = 1500,
): SelectionCycleState {
  const sameCandidates = previous?.candidateKeys.length === candidateKeys.length &&
    previous.candidateKeys.every((key, index) => key === candidateKeys[index]);
  const closeEnough = previous
    ? Math.hypot(point.x - previous.point.x, point.y - previous.point.y) <= maximumDistance
    : false;
  const recentEnough = previous
    ? updatedAt - previous.updatedAt <= timeoutMilliseconds
    : false;
  const shouldAdvance = Boolean(previous && candidateKeys.length > 1 && sameCandidates && closeEnough && recentEnough);
  return {
    candidateKeys: [...candidateKeys],
    index: shouldAdvance ? (previous!.index + 1) % candidateKeys.length : 0,
    point: { ...point },
    updatedAt,
  };
}

function normalizedBounds(start: ScreenPoint, end: ScreenPoint) {
  return {
    maximumX: Math.max(start.x, end.x),
    maximumY: Math.max(start.y, end.y),
    minimumX: Math.min(start.x, end.x),
    minimumY: Math.min(start.y, end.y),
  };
}

function pointInside(point: ScreenPoint, bounds: ReturnType<typeof normalizedBounds>): boolean {
  return point.x >= bounds.minimumX && point.x <= bounds.maximumX &&
    point.y >= bounds.minimumY && point.y <= bounds.maximumY;
}

function orientation(a: ScreenPoint, b: ScreenPoint, c: ScreenPoint): number {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(value) <= 1e-9) return 0;
  return value > 0 ? 1 : 2;
}

function onSegment(a: ScreenPoint, b: ScreenPoint, point: ScreenPoint): boolean {
  return point.x <= Math.max(a.x, b.x) + 1e-9 && point.x + 1e-9 >= Math.min(a.x, b.x) &&
    point.y <= Math.max(a.y, b.y) + 1e-9 && point.y + 1e-9 >= Math.min(a.y, b.y);
}

function segmentsIntersect(first: ScreenSegment, second: ScreenSegment): boolean {
  const o1 = orientation(first.start, first.end, second.start);
  const o2 = orientation(first.start, first.end, second.end);
  const o3 = orientation(second.start, second.end, first.start);
  const o4 = orientation(second.start, second.end, first.end);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(first.start, first.end, second.start)) return true;
  if (o2 === 0 && onSegment(first.start, first.end, second.end)) return true;
  if (o3 === 0 && onSegment(second.start, second.end, first.start)) return true;
  return o4 === 0 && onSegment(second.start, second.end, first.end);
}

function crossingIntersects(
  geometry: ScreenSelectionGeometry,
  bounds: ReturnType<typeof normalizedBounds>,
): boolean {
  if (geometry.points.some((point) => pointInside(point, bounds))) return true;
  const corners = [
    { x: bounds.minimumX, y: bounds.minimumY },
    { x: bounds.maximumX, y: bounds.minimumY },
    { x: bounds.maximumX, y: bounds.maximumY },
    { x: bounds.minimumX, y: bounds.maximumY },
  ];
  const edges = corners.map((start, index) => ({ start, end: corners[(index + 1) % corners.length] }));
  return geometry.segments.some((segment) => edges.some((edge) => segmentsIntersect(segment, edge)));
}

export function selectScreenGeometries(
  geometries: ScreenSelectionGeometry[],
  start: ScreenPoint,
  end: ScreenPoint,
): { mode: SelectionWindowMode; refs: CadEntityRef[] } {
  const bounds = normalizedBounds(start, end);
  const mode = selectionWindowMode(start, end);
  const refs = geometries
    .filter((geometry) => geometry.points.length > 0)
    .filter((geometry) => mode === "window"
      ? geometry.points.every((point) => pointInside(point, bounds))
      : crossingIntersects(geometry, bounds))
    .map((geometry) => geometry.ref);
  return { mode, refs };
}

export function selectScreenStretchTargets(
  geometries: ScreenStretchGeometry[],
  start: ScreenPoint,
  end: ScreenPoint,
): { mode: SelectionWindowMode; targets: CadStretchTarget[] } {
  const bounds = normalizedBounds(start, end);
  const mode = selectionWindowMode(start, end);
  const targets = geometries.flatMap((geometry): CadStretchTarget[] => {
    if (!geometry.points.length) return [];
    const whole = geometry.points.every((point) => pointInside(point, bounds));
    if (whole) return [{ components: [], id: geometry.ref.id, kind: geometry.ref.kind, whole: true }];
    if (mode !== "crossing" || !crossingIntersects(geometry, bounds)) return [];
    const components = geometry.handles
      .filter(({ point }) => pointInside(point, bounds))
      .map(({ component }) => component);
    if (!components.length || !["line", "polyline"].includes(geometry.ref.kind)) return [];
    return [{ components, id: geometry.ref.id, kind: geometry.ref.kind, whole: false }];
  });
  return { mode, targets };
}
