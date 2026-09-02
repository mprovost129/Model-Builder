import type { FoundationWallType } from "./building-stories.ts";
import type { LineObject } from "./document-model.ts";

export type FoundationWallEndpoint = "start" | "end";
export type FoundationWallComponent = "footing" | "sill" | "stem";

type FoundationCornerJoin = {
  kind: "corner";
  otherEndpoint: FoundationWallEndpoint;
  otherWallId: string;
};

type FoundationTeeJoin = {
  hostWallId: string;
  kind: "tee";
};

export type AutomaticFoundationWallJoin = FoundationCornerJoin | FoundationTeeJoin;

export type AutomaticFoundationWallJoinPlan = {
  endpointJoins: Map<string, Partial<Record<FoundationWallEndpoint, AutomaticFoundationWallJoin>>>;
  occupiedEndpoints: Map<string, Set<FoundationWallEndpoint>>;
  passThroughCounts: Map<string, number>;
  unresolvedCounts: Map<string, number>;
};

export type FoundationFootprintPoint = { x: number; y: number };

export type FoundationBandFootprint = {
  endExterior: FoundationFootprintPoint;
  endInterior: FoundationFootprintPoint;
  startExterior: FoundationFootprintPoint;
  startInterior: FoundationFootprintPoint;
};

type FoundationBand = {
  centerDistanceFromExterior: number;
  width: number;
};

type CutLine = {
  direction: FoundationFootprintPoint;
  point: FoundationFootprintPoint;
};

type EndpointCandidate = {
  endpoint: FoundationWallEndpoint;
  line: LineObject;
  point: FoundationFootprintPoint & { z: number };
};

const ENDPOINT_TOLERANCE = 1 / 16;
const MINIMUM_JOIN_ANGLE = 15 * Math.PI / 180;
const COLLINEAR_TOLERANCE = Math.PI / 180;

function foundationTypeFor(line: LineObject, typesById: ReadonlyMap<string, FoundationWallType>) {
  return line.foundationWallTypeId ? typesById.get(line.foundationWallTypeId) : undefined;
}

function bandFor(type: FoundationWallType, component: FoundationWallComponent): FoundationBand | null {
  if (component === "stem") return { centerDistanceFromExterior: type.wallWidth / 2, width: type.wallWidth };
  if (component === "footing") return type.footing.enabled
    ? { centerDistanceFromExterior: type.wallWidth / 2 + type.footing.centerOffset, width: type.footing.width }
    : null;
  return type.sill.foundationPlateCount > 0
    ? { centerDistanceFromExterior: type.sill.exteriorSetback + type.sill.plateWidth / 2, width: type.sill.plateWidth }
    : null;
}

function endpointPoint(line: LineObject, endpoint: FoundationWallEndpoint) {
  return endpoint === "start" ? line.start : line.end;
}

function endpointUsesAutomaticJoin(line: LineObject, endpoint: FoundationWallEndpoint) {
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

function endpointDirection(line: LineObject, endpoint: FoundationWallEndpoint) {
  const direction = lineDirection(line);
  if (!direction) return null;
  return endpoint === "start" ? direction : { x: -direction.x, y: -direction.y };
}

function endpointsCoincide(a: EndpointCandidate, b: EndpointCandidate) {
  return a.line.storyId === b.line.storyId &&
    Math.hypot(a.point.x - b.point.x, a.point.y - b.point.y) <= ENDPOINT_TOLERANCE &&
    Math.abs(a.point.z - b.point.z) <= ENDPOINT_TOLERANCE;
}

function angleBetween(a: FoundationFootprintPoint, b: FoundationFootprintPoint) {
  return Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y)));
}

function validJoinAngle(a: FoundationFootprintPoint, b: FoundationFootprintPoint) {
  const angle = angleBetween(a, b);
  return angle >= MINIMUM_JOIN_ANGLE && angle <= Math.PI - MINIMUM_JOIN_ANGLE;
}

function referenceDistanceFromExterior(type: FoundationWallType, line: LineObject) {
  if (line.wallReferenceLine === "interior-main") return type.wallWidth;
  if (line.wallReferenceLine === "center-main" || line.wallReferenceLine === "wall-center") return type.wallWidth / 2;
  return 0;
}

function bandBoundaryOffsets(type: FoundationWallType, line: LineObject, band: FoundationBand) {
  const inwardCenter = band.centerDistanceFromExterior - referenceDistanceFromExterior(type, line);
  const center = (line.wallExteriorSide ?? "left") === "left" ? -inwardCenter : inwardCenter;
  const exteriorSign = (line.wallExteriorSide ?? "left") === "left" ? 1 : -1;
  return {
    exterior: center + exteriorSign * band.width / 2,
    interior: center - exteriorSign * band.width / 2,
  };
}

function offsetPoint(point: FoundationFootprintPoint, direction: FoundationFootprintPoint, offset: number) {
  return { x: point.x - direction.y * offset, y: point.y + direction.x * offset };
}

function offsetEndpoint(line: LineObject, endpoint: FoundationWallEndpoint, offset: number) {
  const direction = lineDirection(line);
  const point = endpointPoint(line, endpoint);
  return direction ? offsetPoint(point, direction, offset) : { x: point.x, y: point.y };
}

function intersectInfiniteLines(
  firstPoint: FoundationFootprintPoint,
  firstDirection: FoundationFootprintPoint,
  secondPoint: FoundationFootprintPoint,
  secondDirection: FoundationFootprintPoint,
) {
  const denominator = firstDirection.x * secondDirection.y - firstDirection.y * secondDirection.x;
  if (Math.abs(denominator) < 1e-8) return null;
  const dx = secondPoint.x - firstPoint.x;
  const dy = secondPoint.y - firstPoint.y;
  const distance = (dx * secondDirection.y - dy * secondDirection.x) / denominator;
  return { x: firstPoint.x + firstDirection.x * distance, y: firstPoint.y + firstDirection.y * distance };
}

function cornerCutLine(
  first: EndpointCandidate,
  firstType: FoundationWallType,
  second: EndpointCandidate,
  secondType: FoundationWallType,
  component: FoundationWallComponent,
): CutLine | null {
  const firstDirection = lineDirection(first.line);
  const secondDirection = lineDirection(second.line);
  const firstBand = bandFor(firstType, component);
  const secondBand = bandFor(secondType, component);
  if (!firstDirection || !secondDirection || !firstBand || !secondBand) return null;
  const firstOffsets = bandBoundaryOffsets(firstType, first.line, firstBand);
  const secondOffsets = bandBoundaryOffsets(secondType, second.line, secondBand);
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
  return length < ENDPOINT_TOLERANCE ? null : { point: exterior, direction: { x: dx / length, y: dy / length } };
}

function stemBoundaryCoordinatesAt(
  candidate: EndpointCandidate,
  type: FoundationWallType,
  comparisonNormal: FoundationFootprintPoint,
) {
  const band = bandFor(type, "stem");
  const direction = lineDirection(candidate.line);
  if (!band || !direction) return null;
  const offsets = bandBoundaryOffsets(type, candidate.line, band);
  return [offsets.exterior, offsets.interior].map((offset) => {
    const point = offsetEndpoint(candidate.line, candidate.endpoint, offset);
    return point.x * comparisonNormal.x + point.y * comparisonNormal.y;
  }).sort((a, b) => a - b);
}

function hostSegmentsAlign(
  first: EndpointCandidate,
  second: EndpointCandidate,
  typesById: ReadonlyMap<string, FoundationWallType>,
) {
  const firstDirection = endpointDirection(first.line, first.endpoint);
  const secondDirection = endpointDirection(second.line, second.endpoint);
  const firstType = foundationTypeFor(first.line, typesById);
  const secondType = foundationTypeFor(second.line, typesById);
  if (!firstDirection || !secondDirection || !firstType || !secondType) return false;
  if (Math.PI - angleBetween(firstDirection, secondDirection) > COLLINEAR_TOLERANCE) return false;
  const comparisonNormal = { x: -firstDirection.y, y: firstDirection.x };
  const firstCoordinates = stemBoundaryCoordinatesAt(first, firstType, comparisonNormal);
  const secondCoordinates = stemBoundaryCoordinatesAt(second, secondType, comparisonNormal);
  return Boolean(firstCoordinates && secondCoordinates &&
    Math.abs(firstCoordinates[0] - secondCoordinates[0]) <= ENDPOINT_TOLERANCE &&
    Math.abs(firstCoordinates[1] - secondCoordinates[1]) <= ENDPOINT_TOLERANCE);
}

function canJoinCorner(a: EndpointCandidate, b: EndpointCandidate, typesById: ReadonlyMap<string, FoundationWallType>) {
  const aDirection = endpointDirection(a.line, a.endpoint);
  const bDirection = endpointDirection(b.line, b.endpoint);
  const aType = foundationTypeFor(a.line, typesById);
  const bType = foundationTypeFor(b.line, typesById);
  return Boolean(a.line.id !== b.line.id && aDirection && bDirection && aType && bType &&
    validJoinAngle(aDirection, bDirection) && cornerCutLine(a, aType, b, bType, "stem"));
}

function canBranchIntoHost(branch: EndpointCandidate, host: LineObject) {
  const branchDirection = endpointDirection(branch.line, branch.endpoint);
  const hostDirection = lineDirection(host);
  return Boolean(branchDirection && hostDirection && validJoinAngle(branchDirection, hostDirection));
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

function addEndpointJoin(plan: AutomaticFoundationWallJoinPlan, wallId: string, endpoint: FoundationWallEndpoint, join: AutomaticFoundationWallJoin) {
  const joins = plan.endpointJoins.get(wallId) ?? {};
  joins[endpoint] = join;
  plan.endpointJoins.set(wallId, joins);
}

function incrementCount(counts: Map<string, number>, wallId: string) {
  counts.set(wallId, (counts.get(wallId) ?? 0) + 1);
}

function markUnresolved(plan: AutomaticFoundationWallJoinPlan, candidates: EndpointCandidate[]) {
  new Set(candidates.map((candidate) => candidate.line.id)).forEach((wallId) => incrementCount(plan.unresolvedCounts, wallId));
}

function addTeeJoin(plan: AutomaticFoundationWallJoinPlan, branch: EndpointCandidate, hostWallIds: string[], capHostWallId: string) {
  addEndpointJoin(plan, branch.line.id, branch.endpoint, { hostWallId: capHostWallId, kind: "tee" });
  hostWallIds.forEach((wallId) => incrementCount(plan.passThroughCounts, wallId));
}

/** Builds non-destructive corner and T-junction behavior for Foundation Wall assemblies. */
export function buildAutomaticFoundationWallJoinPlan(
  lines: LineObject[],
  foundationTypes: FoundationWallType[],
): AutomaticFoundationWallJoinPlan {
  const plan: AutomaticFoundationWallJoinPlan = {
    endpointJoins: new Map(), occupiedEndpoints: new Map(), passThroughCounts: new Map(), unresolvedCounts: new Map(),
  };
  const foundationWalls = lines.filter((line) => line.architecturalRole === "foundation-wall");
  const typesById = new Map(foundationTypes.map((type) => [type.id, type]));
  const endpoints: EndpointCandidate[] = foundationWalls.flatMap((line) =>
    (["start", "end"] as const).filter((endpoint) => endpointUsesAutomaticJoin(line, endpoint)).map((endpoint) => ({ endpoint, line, point: endpointPoint(line, endpoint) })),
  );
  const groups: EndpointCandidate[][] = [];
  endpoints.forEach((candidate) => {
    const group = groups.find((existing) => endpointsCoincide(existing[0], candidate));
    if (group) group.push(candidate);
    else groups.push([candidate]);
  });
  groups.filter((group) => group.length > 1).forEach((group) => group.forEach((candidate) => {
    const occupied = plan.occupiedEndpoints.get(candidate.line.id) ?? new Set<FoundationWallEndpoint>();
    occupied.add(candidate.endpoint);
    plan.occupiedEndpoints.set(candidate.line.id, occupied);
  }));

  groups.forEach((group) => {
    if (group.length === 2) {
      const [first, second] = group;
      if (canJoinCorner(first, second, typesById)) {
        addEndpointJoin(plan, first.line.id, first.endpoint, { kind: "corner", otherEndpoint: second.endpoint, otherWallId: second.line.id });
        addEndpointJoin(plan, second.line.id, second.endpoint, { kind: "corner", otherEndpoint: first.endpoint, otherWallId: first.line.id });
      } else {
        const firstDirection = endpointDirection(first.line, first.endpoint);
        const secondDirection = endpointDirection(second.line, second.endpoint);
        if (!firstDirection || !secondDirection || Math.PI - angleBetween(firstDirection, secondDirection) > COLLINEAR_TOLERANCE) markUnresolved(plan, group);
      }
      return;
    }
    if (group.length === 3) {
      const possibleHosts: Array<[EndpointCandidate, EndpointCandidate, EndpointCandidate]> = [];
      for (let firstIndex = 0; firstIndex < group.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < group.length; secondIndex += 1) {
          const branch = group.find((_, index) => index !== firstIndex && index !== secondIndex);
          if (branch && hostSegmentsAlign(group[firstIndex], group[secondIndex], typesById)) possibleHosts.push([group[firstIndex], group[secondIndex], branch]);
        }
      }
      possibleHosts.sort((a, b) => joinPriority(b[0].line) + joinPriority(b[1].line) - joinPriority(a[0].line) - joinPriority(a[1].line));
      const best = possibleHosts[0];
      const bestScore = best ? joinPriority(best[0].line) + joinPriority(best[1].line) : 0;
      const nextScore = possibleHosts[1] ? joinPriority(possibleHosts[1][0].line) + joinPriority(possibleHosts[1][1].line) : Number.NEGATIVE_INFINITY;
      if (best && (possibleHosts.length === 1 || bestScore > nextScore) && canBranchIntoHost(best[2], best[0].line)) {
        addTeeJoin(plan, best[2], [best[0].line.id, best[1].line.id], best[0].line.id);
      } else markUnresolved(plan, group);
      return;
    }
    if (group.length > 3) markUnresolved(plan, group);
  });

  groups.filter((group) => group.length === 1).forEach(([branch]) => {
    const hosts = foundationWalls.filter((line) => line.id !== branch.line.id && line.storyId === branch.line.storyId &&
      Math.abs(line.start.z - branch.point.z) <= ENDPOINT_TOLERANCE && pointOnLineInterior(branch.point, line));
    const rankedHosts = hosts.filter((host) => foundationTypeFor(host, typesById)).sort((a, b) => joinPriority(b) - joinPriority(a));
    const selectedHost = rankedHosts[0];
    if (selectedHost && (rankedHosts.length === 1 || joinPriority(selectedHost) > joinPriority(rankedHosts[1])) && canBranchIntoHost(branch, selectedHost)) {
      addTeeJoin(plan, branch, [selectedHost.id], selectedHost.id);
    } else if (hosts.length > 0) {
      markUnresolved(plan, [branch, ...hosts.map((line) => ({ endpoint: "start" as const, line, point: line.start }))]);
    }
  });
  return plan;
}

function teeCutLine(
  branch: LineObject,
  endpoint: FoundationWallEndpoint,
  host: LineObject,
  hostType: FoundationWallType,
  component: FoundationWallComponent,
): CutLine | null {
  const branchDirection = endpointDirection(branch, endpoint);
  const hostDirection = lineDirection(host);
  const hostBand = bandFor(hostType, component);
  if (!branchDirection || !hostDirection || !hostBand) return null;
  const hostNormal = { x: -hostDirection.y, y: hostDirection.x };
  const branchSide = branchDirection.x * hostNormal.x + branchDirection.y * hostNormal.y;
  if (Math.abs(branchSide) < Math.sin(MINIMUM_JOIN_ANGLE)) return null;
  const offsets = bandBoundaryOffsets(hostType, host, hostBand);
  const offset = branchSide > 0 ? Math.max(offsets.exterior, offsets.interior) : Math.min(offsets.exterior, offsets.interior);
  return { direction: hostDirection, point: offsetPoint(endpointPoint(branch, endpoint), hostDirection, offset) };
}

function cutLineForJoin(
  line: LineObject,
  endpoint: FoundationWallEndpoint,
  type: FoundationWallType,
  component: FoundationWallComponent,
  join: AutomaticFoundationWallJoin,
  linesById: ReadonlyMap<string, LineObject>,
  typesById: ReadonlyMap<string, FoundationWallType>,
) {
  if (join.kind === "corner") {
    const otherLine = linesById.get(join.otherWallId);
    const otherType = otherLine ? foundationTypeFor(otherLine, typesById) : undefined;
    return otherLine && otherType ? cornerCutLine(
      { endpoint, line, point: endpointPoint(line, endpoint) }, type,
      { endpoint: join.otherEndpoint, line: otherLine, point: endpointPoint(otherLine, join.otherEndpoint) }, otherType,
      component,
    ) : null;
  }
  const host = linesById.get(join.hostWallId);
  const hostType = host ? foundationTypeFor(host, typesById) : undefined;
  return host && hostType ? teeCutLine(line, endpoint, host, hostType, component) : null;
}

function joinedBoundaryPoint(
  line: LineObject,
  endpoint: FoundationWallEndpoint,
  type: FoundationWallType,
  component: FoundationWallComponent,
  boundary: "exterior" | "interior",
  join: AutomaticFoundationWallJoin | undefined,
  linesById: ReadonlyMap<string, LineObject>,
  typesById: ReadonlyMap<string, FoundationWallType>,
) {
  const band = bandFor(type, component);
  const direction = lineDirection(line);
  if (!band || !direction) return endpointPoint(line, endpoint);
  const ownPoint = offsetEndpoint(line, endpoint, bandBoundaryOffsets(type, line, band)[boundary]);
  if (!join) return ownPoint;
  const cutLine = cutLineForJoin(line, endpoint, type, component, join, linesById, typesById);
  return cutLine ? intersectInfiniteLines(ownPoint, direction, cutLine.point, cutLine.direction) ?? ownPoint : ownPoint;
}

export function foundationBandFootprint(
  line: LineObject,
  type: FoundationWallType,
  component: FoundationWallComponent,
  joinPlan: AutomaticFoundationWallJoinPlan,
  linesById: ReadonlyMap<string, LineObject>,
  typesById: ReadonlyMap<string, FoundationWallType>,
): FoundationBandFootprint | null {
  if (!bandFor(type, component) || !lineDirection(line)) return null;
  const joins = joinPlan.endpointJoins.get(line.id);
  return {
    startExterior: joinedBoundaryPoint(line, "start", type, component, "exterior", joins?.start, linesById, typesById),
    startInterior: joinedBoundaryPoint(line, "start", type, component, "interior", joins?.start, linesById, typesById),
    endExterior: joinedBoundaryPoint(line, "end", type, component, "exterior", joins?.end, linesById, typesById),
    endInterior: joinedBoundaryPoint(line, "end", type, component, "interior", joins?.end, linesById, typesById),
  };
}

export function automaticFoundationWallJoinCount(lineId: string, plan: AutomaticFoundationWallJoinPlan) {
  const joins = plan.endpointJoins.get(lineId);
  return Number(Boolean(joins?.start)) + Number(Boolean(joins?.end)) + (plan.passThroughCounts.get(lineId) ?? 0);
}

export function unresolvedFoundationWallJunctionCount(lineId: string, plan: AutomaticFoundationWallJoinPlan) {
  return plan.unresolvedCounts.get(lineId) ?? 0;
}
