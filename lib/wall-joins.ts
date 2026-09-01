import type { LineObject } from "./document-model.ts";
import {
  wallLayerCenterOffsets,
  wallLayerGroupThickness,
  wallReferenceDistanceFromExterior,
  type LayeredAssembly,
} from "./building-stories.ts";

export type WallEndpoint = "start" | "end";

type CornerWallJoin = {
  kind: "corner";
  otherEndpoint: WallEndpoint;
  otherWallId: string;
};

type TeeWallJoin = {
  hostWallId: string;
  kind: "tee";
};

export type AutomaticWallJoin = CornerWallJoin | TeeWallJoin;

export type AutomaticWallJoinPlan = {
  endpointJoins: Map<string, Partial<Record<WallEndpoint, AutomaticWallJoin>>>;
  passThroughCounts: Map<string, number>;
  unresolvedCounts: Map<string, number>;
};

export type WallFootprintPoint = { x: number; y: number };

export type WallLayerFootprint = {
  endExterior: WallFootprintPoint;
  endInterior: WallFootprintPoint;
  startExterior: WallFootprintPoint;
  startInterior: WallFootprintPoint;
};

type CutLine = {
  direction: WallFootprintPoint;
  point: WallFootprintPoint;
};

type EndpointCandidate = {
  endpoint: WallEndpoint;
  line: LineObject;
  point: WallFootprintPoint & { z: number };
};

const ENDPOINT_TOLERANCE = 1 / 16;
const MINIMUM_JOIN_ANGLE = 15 * Math.PI / 180;
const COLLINEAR_TOLERANCE = Math.PI / 180;

function endpointPoint(line: LineObject, endpoint: WallEndpoint) {
  return endpoint === "start" ? line.start : line.end;
}

function endpointUsesAutomaticJoin(line: LineObject, endpoint: WallEndpoint) {
  return (endpoint === "start" ? line.wallStartJoinMode : line.wallEndJoinMode) !== "square";
}

function joinPriority(line: LineObject) {
  return line.wallJoinPriority ?? 0;
}

function lineDirection(line: LineObject) {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const length = Math.hypot(dx, dy);
  return length < ENDPOINT_TOLERANCE ? null : { x: dx / length, y: dy / length };
}

function endpointDirection(line: LineObject, endpoint: WallEndpoint) {
  const direction = lineDirection(line);
  if (!direction) return null;
  return endpoint === "start" ? direction : { x: -direction.x, y: -direction.y };
}

function endpointsCoincide(a: EndpointCandidate, b: EndpointCandidate) {
  return (
    a.line.storyId === b.line.storyId &&
    Math.hypot(a.point.x - b.point.x, a.point.y - b.point.y) <= ENDPOINT_TOLERANCE &&
    Math.abs(a.point.z - b.point.z) <= ENDPOINT_TOLERANCE
  );
}

function angleBetween(a: WallFootprintPoint, b: WallFootprintPoint) {
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y));
  return Math.acos(dot);
}

function validJoinAngle(a: WallFootprintPoint, b: WallFootprintPoint) {
  const angle = angleBetween(a, b);
  return angle >= MINIMUM_JOIN_ANGLE && angle <= Math.PI - MINIMUM_JOIN_ANGLE;
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

function offsetFromExteriorDistance(wallType: LayeredAssembly, line: LineObject, distanceFromExterior: number) {
  const inwardDistance = distanceFromExterior - wallReferenceDistanceFromExterior(
    wallType,
    line.wallReferenceLine ?? "wall-center",
  );
  return (line.wallExteriorSide ?? "left") === "left" ? -inwardDistance : inwardDistance;
}

function mainBoundaryOffsets(wallType: LayeredAssembly, line: LineObject) {
  const exteriorThickness = wallLayerGroupThickness(wallType, "exterior");
  const mainThickness = wallLayerGroupThickness(wallType, "main");
  return {
    exterior: offsetFromExteriorDistance(wallType, line, exteriorThickness),
    interior: offsetFromExteriorDistance(wallType, line, exteriorThickness + mainThickness),
  };
}

function offsetPointAt(point: WallFootprintPoint, direction: WallFootprintPoint, offset: number) {
  return {
    x: point.x - direction.y * offset,
    y: point.y + direction.x * offset,
  };
}

function offsetEndpoint(line: LineObject, endpoint: WallEndpoint, offset: number) {
  const direction = lineDirection(line);
  const point = endpointPoint(line, endpoint);
  return direction ? offsetPointAt(point, direction, offset) : { x: point.x, y: point.y };
}

function cornerCutLine(
  first: EndpointCandidate,
  firstType: LayeredAssembly,
  second: EndpointCandidate,
  secondType: LayeredAssembly,
): CutLine | null {
  const firstDirection = lineDirection(first.line);
  const secondDirection = lineDirection(second.line);
  if (!firstDirection || !secondDirection) return null;
  const firstOffsets = mainBoundaryOffsets(firstType, first.line);
  const secondOffsets = mainBoundaryOffsets(secondType, second.line);
  const exterior = intersectInfiniteLines(
    offsetEndpoint(first.line, first.endpoint, firstOffsets.exterior),
    firstDirection,
    offsetEndpoint(second.line, second.endpoint, secondOffsets.exterior),
    secondDirection,
  );
  const interior = intersectInfiniteLines(
    offsetEndpoint(first.line, first.endpoint, firstOffsets.interior),
    firstDirection,
    offsetEndpoint(second.line, second.endpoint, secondOffsets.interior),
    secondDirection,
  );
  if (!exterior || !interior) return null;
  const dx = interior.x - exterior.x;
  const dy = interior.y - exterior.y;
  const length = Math.hypot(dx, dy);
  return length < ENDPOINT_TOLERANCE
    ? null
    : { point: exterior, direction: { x: dx / length, y: dy / length } };
}

function wallTypeFor(line: LineObject, wallTypesById: ReadonlyMap<string, LayeredAssembly>) {
  return line.wallTypeId ? wallTypesById.get(line.wallTypeId) : undefined;
}

function canJoinCorner(
  a: EndpointCandidate,
  b: EndpointCandidate,
  wallTypesById: ReadonlyMap<string, LayeredAssembly>,
) {
  if (a.line.id === b.line.id) return false;
  const aDirection = endpointDirection(a.line, a.endpoint);
  const bDirection = endpointDirection(b.line, b.endpoint);
  const aType = wallTypeFor(a.line, wallTypesById);
  const bType = wallTypeFor(b.line, wallTypesById);
  return Boolean(
    aDirection &&
    bDirection &&
    aType &&
    bType &&
    validJoinAngle(aDirection, bDirection) &&
    cornerCutLine(a, aType, b, bType)
  );
}

function addEndpointJoin(
  plan: AutomaticWallJoinPlan,
  wallId: string,
  endpoint: WallEndpoint,
  join: AutomaticWallJoin,
) {
  const joins = plan.endpointJoins.get(wallId) ?? {};
  joins[endpoint] = join;
  plan.endpointJoins.set(wallId, joins);
}

function incrementCount(counts: Map<string, number>, wallId: string) {
  counts.set(wallId, (counts.get(wallId) ?? 0) + 1);
}

function markUnresolved(plan: AutomaticWallJoinPlan, candidates: EndpointCandidate[]) {
  new Set(candidates.map((candidate) => candidate.line.id)).forEach((wallId) => {
    incrementCount(plan.unresolvedCounts, wallId);
  });
}

function mainBoundaryCoordinatesAt(
  candidate: EndpointCandidate,
  wallType: LayeredAssembly,
  comparisonNormal: WallFootprintPoint,
) {
  const direction = lineDirection(candidate.line);
  if (!direction) return null;
  const offsets = mainBoundaryOffsets(wallType, candidate.line);
  return [offsets.exterior, offsets.interior]
    .map((offset) => {
      const point = offsetEndpoint(candidate.line, candidate.endpoint, offset);
      return point.x * comparisonNormal.x + point.y * comparisonNormal.y;
    })
    .sort((a, b) => a - b);
}

function hostSegmentsAlign(
  a: EndpointCandidate,
  b: EndpointCandidate,
  wallTypesById: ReadonlyMap<string, LayeredAssembly>,
) {
  const aDirection = endpointDirection(a.line, a.endpoint);
  const bDirection = endpointDirection(b.line, b.endpoint);
  const aType = wallTypeFor(a.line, wallTypesById);
  const bType = wallTypeFor(b.line, wallTypesById);
  if (!aDirection || !bDirection || !aType || !bType) return false;
  if (Math.PI - angleBetween(aDirection, bDirection) > COLLINEAR_TOLERANCE) return false;
  const comparisonNormal = { x: -aDirection.y, y: aDirection.x };
  const aCoordinates = mainBoundaryCoordinatesAt(a, aType, comparisonNormal);
  const bCoordinates = mainBoundaryCoordinatesAt(b, bType, comparisonNormal);
  return Boolean(
    aCoordinates &&
    bCoordinates &&
    Math.abs(aCoordinates[0] - bCoordinates[0]) <= ENDPOINT_TOLERANCE &&
    Math.abs(aCoordinates[1] - bCoordinates[1]) <= ENDPOINT_TOLERANCE
  );
}

function canBranchIntoHost(branch: EndpointCandidate, host: LineObject) {
  const branchDirection = endpointDirection(branch.line, branch.endpoint);
  const hostDirection = lineDirection(host);
  return Boolean(branchDirection && hostDirection && validJoinAngle(branchDirection, hostDirection));
}

function addTeeJoin(
  plan: AutomaticWallJoinPlan,
  branch: EndpointCandidate,
  hostWallIds: string[],
  capHostWallId: string,
) {
  addEndpointJoin(plan, branch.line.id, branch.endpoint, { hostWallId: capHostWallId, kind: "tee" });
  hostWallIds.forEach((wallId) => incrementCount(plan.passThroughCounts, wallId));
}

function pointOnLineInterior(point: EndpointCandidate["point"], line: LineObject) {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared < ENDPOINT_TOLERANCE * ENDPOINT_TOLERANCE) return false;
  const t = ((point.x - line.start.x) * dx + (point.y - line.start.y) * dy) / lengthSquared;
  const endpointMargin = ENDPOINT_TOLERANCE / Math.sqrt(lengthSquared);
  if (t <= endpointMargin || t >= 1 - endpointMargin) return false;
  const projected = { x: line.start.x + dx * t, y: line.start.y + dy * t };
  return Math.hypot(point.x - projected.x, point.y - projected.y) <= ENDPOINT_TOLERANCE;
}

/**
 * Builds derived wall-junction behavior without modifying the editable reference
 * paths. Two-wall corners use Main-core miter lines; valid T branches stop at the
 * near Main face of an uninterrupted or aligned split host wall.
 */
export function buildAutomaticWallJoinPlan(
  lines: LineObject[],
  wallTypes: LayeredAssembly[],
): AutomaticWallJoinPlan {
  const plan: AutomaticWallJoinPlan = {
    endpointJoins: new Map(),
    passThroughCounts: new Map(),
    unresolvedCounts: new Map(),
  };
  const wallLines = lines.filter((line) => line.architecturalRole === "wall");
  const wallTypesById = new Map(wallTypes.map((wallType) => [wallType.id, wallType]));
  const endpoints: EndpointCandidate[] = wallLines.flatMap((line) =>
    (["start", "end"] as const).filter((endpoint) => endpointUsesAutomaticJoin(line, endpoint)).map((endpoint) => ({ endpoint, line, point: endpointPoint(line, endpoint) })),
  );
  const groups: EndpointCandidate[][] = [];
  endpoints.forEach((candidate) => {
    const group = groups.find((existing) => endpointsCoincide(existing[0], candidate));
    if (group) group.push(candidate);
    else groups.push([candidate]);
  });

  groups.forEach((group) => {
    if (group.length === 2) {
      const [a, b] = group;
      if (canJoinCorner(a, b, wallTypesById)) {
        addEndpointJoin(plan, a.line.id, a.endpoint, { kind: "corner", otherEndpoint: b.endpoint, otherWallId: b.line.id });
        addEndpointJoin(plan, b.line.id, b.endpoint, { kind: "corner", otherEndpoint: a.endpoint, otherWallId: a.line.id });
      } else {
        const aDirection = endpointDirection(a.line, a.endpoint);
        const bDirection = endpointDirection(b.line, b.endpoint);
        if (!aDirection || !bDirection || Math.PI - angleBetween(aDirection, bDirection) > COLLINEAR_TOLERANCE) {
          markUnresolved(plan, group);
        }
      }
      return;
    }

    if (group.length === 3) {
      const possibleHosts: Array<[EndpointCandidate, EndpointCandidate, EndpointCandidate]> = [];
      for (let firstIndex = 0; firstIndex < group.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < group.length; secondIndex += 1) {
          const branch = group.find((_, index) => index !== firstIndex && index !== secondIndex);
          if (branch && hostSegmentsAlign(group[firstIndex], group[secondIndex], wallTypesById)) {
            possibleHosts.push([group[firstIndex], group[secondIndex], branch]);
          }
        }
      }
      const rankedHosts = possibleHosts.sort((first, second) => joinPriority(second[0].line) + joinPriority(second[1].line) - joinPriority(first[0].line) - joinPriority(first[1].line));
      const bestHost = rankedHosts[0];
      const bestScore = bestHost ? joinPriority(bestHost[0].line) + joinPriority(bestHost[1].line) : 0;
      const nextScore = rankedHosts[1] ? joinPriority(rankedHosts[1][0].line) + joinPriority(rankedHosts[1][1].line) : Number.NEGATIVE_INFINITY;
      if (bestHost && (rankedHosts.length === 1 || bestScore > nextScore)) {
        const [firstHost, secondHost, branch] = bestHost;
        if (canBranchIntoHost(branch, firstHost.line)) {
          addTeeJoin(plan, branch, [firstHost.line.id, secondHost.line.id], firstHost.line.id);
          return;
        }
      }
      markUnresolved(plan, group);
      return;
    }

    if (group.length > 3) {
      const hostPairs: Array<[EndpointCandidate, EndpointCandidate]> = [];
      for (let firstIndex = 0; firstIndex < group.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < group.length; secondIndex += 1) {
          if (hostSegmentsAlign(group[firstIndex], group[secondIndex], wallTypesById)) hostPairs.push([group[firstIndex], group[secondIndex]]);
        }
      }
      hostPairs.sort((first, second) => joinPriority(second[0].line) + joinPriority(second[1].line) - joinPriority(first[0].line) - joinPriority(first[1].line));
      const best = hostPairs[0];
      const bestScore = best ? joinPriority(best[0].line) + joinPriority(best[1].line) : 0;
      const nextScore = hostPairs[1] ? joinPriority(hostPairs[1][0].line) + joinPriority(hostPairs[1][1].line) : Number.NEGATIVE_INFINITY;
      const branches = best ? group.filter((candidate) => candidate !== best[0] && candidate !== best[1]) : [];
      if (best && bestScore > nextScore && branches.every((branch) => canBranchIntoHost(branch, best[0].line))) {
        branches.forEach((branch) => addTeeJoin(plan, branch, [best[0].line.id, best[1].line.id], best[0].line.id));
      } else {
        markUnresolved(plan, group);
      }
    }
  });

  groups.filter((group) => group.length === 1).forEach(([branch]) => {
    const hosts = wallLines.filter((line) => (
      line.id !== branch.line.id &&
      line.storyId === branch.line.storyId &&
      Math.abs(line.start.z - branch.point.z) <= ENDPOINT_TOLERANCE &&
      pointOnLineInterior(branch.point, line)
    ));
    const rankedHosts = hosts.filter((host) => wallTypeFor(host, wallTypesById)).sort((first, second) => joinPriority(second) - joinPriority(first));
    const selectedHost = rankedHosts[0];
    if (selectedHost && (rankedHosts.length === 1 || joinPriority(selectedHost) > joinPriority(rankedHosts[1])) && canBranchIntoHost(branch, selectedHost)) {
      addTeeJoin(plan, branch, [selectedHost.id], selectedHost.id);
    } else if (hosts.length > 0) {
      markUnresolved(plan, [branch, ...hosts.map((line) => ({ endpoint: "start" as const, line, point: line.start }))]);
    }
  });

  return plan;
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

function teeCutLine(
  branch: LineObject,
  endpoint: WallEndpoint,
  host: LineObject,
  hostType: LayeredAssembly,
): CutLine | null {
  const branchDirection = endpointDirection(branch, endpoint);
  const hostDirection = lineDirection(host);
  if (!branchDirection || !hostDirection) return null;
  const hostNormal = { x: -hostDirection.y, y: hostDirection.x };
  const branchSide = branchDirection.x * hostNormal.x + branchDirection.y * hostNormal.y;
  if (Math.abs(branchSide) < Math.sin(MINIMUM_JOIN_ANGLE)) return null;
  const offsets = mainBoundaryOffsets(hostType, host);
  const offset = branchSide > 0
    ? Math.max(offsets.exterior, offsets.interior)
    : Math.min(offsets.exterior, offsets.interior);
  return {
    direction: hostDirection,
    point: offsetPointAt(endpointPoint(branch, endpoint), hostDirection, offset),
  };
}

function cutLineForJoin(
  line: LineObject,
  endpoint: WallEndpoint,
  wallType: LayeredAssembly,
  join: AutomaticWallJoin,
  linesById: ReadonlyMap<string, LineObject>,
  wallTypesById: ReadonlyMap<string, LayeredAssembly>,
) {
  if (join.kind === "corner") {
    const otherLine = linesById.get(join.otherWallId);
    const otherType = otherLine ? wallTypeFor(otherLine, wallTypesById) : undefined;
    return otherLine && otherType
      ? cornerCutLine(
        { endpoint, line, point: endpointPoint(line, endpoint) },
        wallType,
        { endpoint: join.otherEndpoint, line: otherLine, point: endpointPoint(otherLine, join.otherEndpoint) },
        otherType,
      )
      : null;
  }
  const host = linesById.get(join.hostWallId);
  const hostType = host ? wallTypeFor(host, wallTypesById) : undefined;
  return host && hostType ? teeCutLine(line, endpoint, host, hostType) : null;
}

function joinedBoundaryPoint(
  line: LineObject,
  endpoint: WallEndpoint,
  wallType: LayeredAssembly,
  layerIndex: number,
  boundary: "exterior" | "interior",
  join: AutomaticWallJoin | undefined,
  linesById: ReadonlyMap<string, LineObject>,
  wallTypesById: ReadonlyMap<string, LayeredAssembly>,
) {
  const ownOffset = boundaryOffsets(wallType, line, layerIndex)[boundary];
  const ownPoint = offsetEndpoint(line, endpoint, ownOffset);
  const ownDirection = lineDirection(line);
  if (!join || !ownDirection) return ownPoint;
  const cutLine = cutLineForJoin(line, endpoint, wallType, join, linesById, wallTypesById);
  return cutLine
    ? intersectInfiniteLines(ownPoint, ownDirection, cutLine.point, cutLine.direction) ?? ownPoint
    : ownPoint;
}

export function wallLayerFootprint(
  line: LineObject,
  wallType: LayeredAssembly,
  layerIndex: number,
  joinPlan: AutomaticWallJoinPlan,
  linesById: ReadonlyMap<string, LineObject>,
  wallTypesById: ReadonlyMap<string, LayeredAssembly>,
): WallLayerFootprint {
  const joins = joinPlan.endpointJoins.get(line.id);
  const participatesInJoin = wallType.layers[layerIndex]?.participatesInJoin !== false;
  return {
    startExterior: joinedBoundaryPoint(line, "start", wallType, layerIndex, "exterior", participatesInJoin ? joins?.start : undefined, linesById, wallTypesById),
    startInterior: joinedBoundaryPoint(line, "start", wallType, layerIndex, "interior", participatesInJoin ? joins?.start : undefined, linesById, wallTypesById),
    endExterior: joinedBoundaryPoint(line, "end", wallType, layerIndex, "exterior", participatesInJoin ? joins?.end : undefined, linesById, wallTypesById),
    endInterior: joinedBoundaryPoint(line, "end", wallType, layerIndex, "interior", participatesInJoin ? joins?.end : undefined, linesById, wallTypesById),
  };
}

export function automaticWallJoinCount(lineId: string, joinPlan: AutomaticWallJoinPlan) {
  const joins = joinPlan.endpointJoins.get(lineId);
  return Number(Boolean(joins?.start)) + Number(Boolean(joins?.end)) + (joinPlan.passThroughCounts.get(lineId) ?? 0);
}

export function unresolvedWallJunctionCount(lineId: string, joinPlan: AutomaticWallJoinPlan) {
  return joinPlan.unresolvedCounts.get(lineId) ?? 0;
}
