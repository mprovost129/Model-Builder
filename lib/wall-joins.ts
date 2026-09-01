import type { LineObject } from "./document-model.ts";
import {
  wallLayerCenterOffsets,
  type LayeredAssembly,
} from "./building-stories.ts";

export type WallEndpoint = "start" | "end";

export type AutomaticWallJoin = {
  otherEndpoint: WallEndpoint;
  otherWallId: string;
};

export type AutomaticWallJoinPlan = Map<
  string,
  Partial<Record<WallEndpoint, AutomaticWallJoin>>
>;

export type WallFootprintPoint = { x: number; y: number };

export type WallLayerFootprint = {
  endExterior: WallFootprintPoint;
  endInterior: WallFootprintPoint;
  startExterior: WallFootprintPoint;
  startInterior: WallFootprintPoint;
};

const ENDPOINT_TOLERANCE = 1 / 16;
const MINIMUM_JOIN_ANGLE = 15 * Math.PI / 180;

type EndpointCandidate = {
  endpoint: WallEndpoint;
  line: LineObject;
  point: WallFootprintPoint & { z: number };
};

function endpointPoint(line: LineObject, endpoint: WallEndpoint) {
  return endpoint === "start" ? line.start : line.end;
}

function endpointDirection(line: LineObject, endpoint: WallEndpoint) {
  const point = endpointPoint(line, endpoint);
  const other = endpointPoint(line, endpoint === "start" ? "end" : "start");
  const dx = other.x - point.x;
  const dy = other.y - point.y;
  const length = Math.hypot(dx, dy);
  return length < ENDPOINT_TOLERANCE ? null : { x: dx / length, y: dy / length };
}

function endpointsCoincide(a: EndpointCandidate, b: EndpointCandidate) {
  return (
    a.line.storyId === b.line.storyId &&
    Math.hypot(a.point.x - b.point.x, a.point.y - b.point.y) <= ENDPOINT_TOLERANCE &&
    Math.abs(a.point.z - b.point.z) <= ENDPOINT_TOLERANCE
  );
}

function canJoinPair(a: EndpointCandidate, b: EndpointCandidate) {
  if (
    a.line.id === b.line.id ||
    !a.line.wallTypeId ||
    a.line.wallTypeId !== b.line.wallTypeId
  ) {
    return false;
  }
  const aDirection = endpointDirection(a.line, a.endpoint);
  const bDirection = endpointDirection(b.line, b.endpoint);
  if (!aDirection || !bDirection) return false;
  const dot = Math.max(-1, Math.min(1, aDirection.x * bDirection.x + aDirection.y * bDirection.y));
  const angle = Math.acos(dot);
  return angle >= MINIMUM_JOIN_ANGLE && angle <= Math.PI - MINIMUM_JOIN_ANGLE;
}

/**
 * Finds conservative two-wall corner joins. Ambiguous nodes intentionally remain
 * unresolved so a later junction solver can make an explicit architectural choice.
 */
export function buildAutomaticWallJoinPlan(lines: LineObject[]): AutomaticWallJoinPlan {
  const endpoints: EndpointCandidate[] = lines
    .filter((line) => line.architecturalRole === "wall")
    .flatMap((line) => (["start", "end"] as const).map((endpoint) => ({
      endpoint,
      line,
      point: endpointPoint(line, endpoint),
    })));
  const groups: EndpointCandidate[][] = [];
  endpoints.forEach((candidate) => {
    const group = groups.find((existing) => endpointsCoincide(existing[0], candidate));
    if (group) group.push(candidate);
    else groups.push([candidate]);
  });

  const plan: AutomaticWallJoinPlan = new Map();
  groups.forEach((group) => {
    if (group.length !== 2 || !canJoinPair(group[0], group[1])) return;
    const [a, b] = group;
    const aJoins = plan.get(a.line.id) ?? {};
    const bJoins = plan.get(b.line.id) ?? {};
    aJoins[a.endpoint] = { otherEndpoint: b.endpoint, otherWallId: b.line.id };
    bJoins[b.endpoint] = { otherEndpoint: a.endpoint, otherWallId: a.line.id };
    plan.set(a.line.id, aJoins);
    plan.set(b.line.id, bJoins);
  });
  return plan;
}

function lineDirection(line: LineObject) {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const length = Math.hypot(dx, dy);
  return length < ENDPOINT_TOLERANCE ? null : { x: dx / length, y: dy / length };
}

function boundaryOffsets(wallType: LayeredAssembly, line: LineObject, layerIndex: number) {
  const layer = wallType.layers[layerIndex];
  const center = wallLayerCenterOffsets(
    wallType,
    line.wallReferenceLine ?? "wall-center",
    line.wallExteriorSide ?? "left",
  )[layerIndex];
  const exteriorSign = (line.wallExteriorSide ?? "left") === "left" ? 1 : -1;
  return {
    exterior: center + exteriorSign * layer.thickness / 2,
    interior: center - exteriorSign * layer.thickness / 2,
  };
}

function offsetPoint(line: LineObject, endpoint: WallEndpoint, offset: number): WallFootprintPoint {
  const point = endpointPoint(line, endpoint);
  const direction = lineDirection(line);
  if (!direction) return { x: point.x, y: point.y };
  return {
    x: point.x - direction.y * offset,
    y: point.y + direction.x * offset,
  };
}

function intersectInfiniteLines(
  firstPoint: WallFootprintPoint,
  firstDirection: WallFootprintPoint,
  secondPoint: WallFootprintPoint,
  secondDirection: WallFootprintPoint,
) {
  const denominator = firstDirection.x * secondDirection.y - firstDirection.y * secondDirection.x;
  if (Math.abs(denominator) < 1e-8) return null;
  const dx = secondPoint.x - firstPoint.x;
  const dy = secondPoint.y - firstPoint.y;
  const distance = (dx * secondDirection.y - dy * secondDirection.x) / denominator;
  return {
    x: firstPoint.x + firstDirection.x * distance,
    y: firstPoint.y + firstDirection.y * distance,
  };
}

function joinedBoundaryPoint(
  line: LineObject,
  endpoint: WallEndpoint,
  wallType: LayeredAssembly,
  layerIndex: number,
  boundary: "exterior" | "interior",
  join: AutomaticWallJoin | undefined,
  linesById: ReadonlyMap<string, LineObject>,
) {
  const ownOffset = boundaryOffsets(wallType, line, layerIndex)[boundary];
  const ownPoint = offsetPoint(line, endpoint, ownOffset);
  if (!join) return ownPoint;
  const otherLine = linesById.get(join.otherWallId);
  const ownDirection = lineDirection(line);
  const otherDirection = otherLine ? lineDirection(otherLine) : null;
  if (!otherLine || !ownDirection || !otherDirection) return ownPoint;
  const otherOffset = boundaryOffsets(wallType, otherLine, layerIndex)[boundary];
  const otherPoint = offsetPoint(otherLine, join.otherEndpoint, otherOffset);
  return intersectInfiniteLines(ownPoint, ownDirection, otherPoint, otherDirection) ?? ownPoint;
}

export function wallLayerFootprint(
  line: LineObject,
  wallType: LayeredAssembly,
  layerIndex: number,
  joinPlan: AutomaticWallJoinPlan,
  linesById: ReadonlyMap<string, LineObject>,
): WallLayerFootprint {
  const joins = joinPlan.get(line.id);
  return {
    startExterior: joinedBoundaryPoint(line, "start", wallType, layerIndex, "exterior", joins?.start, linesById),
    startInterior: joinedBoundaryPoint(line, "start", wallType, layerIndex, "interior", joins?.start, linesById),
    endExterior: joinedBoundaryPoint(line, "end", wallType, layerIndex, "exterior", joins?.end, linesById),
    endInterior: joinedBoundaryPoint(line, "end", wallType, layerIndex, "interior", joins?.end, linesById),
  };
}

export function automaticWallJoinCount(lineId: string, joinPlan: AutomaticWallJoinPlan) {
  const joins = joinPlan.get(lineId);
  return Number(Boolean(joins?.start)) + Number(Boolean(joins?.end));
}
