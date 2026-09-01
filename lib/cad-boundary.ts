import type { ArcGeometry } from "./cad-arc.ts";
import type { CircleGeometry } from "./cad-circle.ts";
import type { LineGeometry, LinePoint, PlanPoint } from "./cad-line.ts";
import {
  MAXIMUM_POLYLINE_VERTICES,
  polylineGeometryIsValid,
  polylineSegmentCircularGeometry,
  polylineSegmentPoints,
  polylineSegments,
  type PolylineGeometry,
} from "./cad-polyline.ts";

export const BOUNDARY_ELEVATION_TOLERANCE = 1 / 32;
export const BOUNDARY_NODE_TOLERANCE = 1e-6;
export const BOUNDARY_PICK_TOLERANCE = 1e-5;
export const BOUNDARY_ARC_CONTAINMENT_SUBDIVISIONS = 256;
export const MAXIMUM_BOUNDARY_PRIMITIVES = 4000;

export type BoundarySource =
  | { geometry: ArcGeometry; kind: "arc" }
  | { geometry: CircleGeometry; kind: "circle" }
  | { geometry: LineGeometry; kind: "line" }
  | { geometry: PolylineGeometry; kind: "polyline" };

export type BoundaryDiscoveryResult = {
  area: number;
  geometry: PolylineGeometry;
};

type LinePrimitive = {
  end: PlanPoint;
  kind: "line";
  start: PlanPoint;
};

type ArcPrimitive = {
  center: PlanPoint;
  counterclockwise: boolean;
  endAngle: number;
  kind: "arc";
  radius: number;
  startAngle: number;
};

type BoundaryPrimitive = LinePrimitive | ArcPrimitive;

type SplitEdge = {
  bulge: number;
  end: PlanPoint;
  endTangent: number;
  start: PlanPoint;
  startTangent: number;
};

type HalfEdge = {
  bulge: number;
  endNode: number;
  id: number;
  startNode: number;
  tangent: number;
  twin: number;
};

const TAU = Math.PI * 2;

function normalizeRadians(angle: number): number {
  return ((angle % TAU) + TAU) % TAU;
}

function stableNumber(value: number): number {
  const stable = Math.round(value * 1_000_000_000) / 1_000_000_000;
  return Object.is(stable, -0) ? 0 : stable;
}

function stablePoint(point: PlanPoint): PlanPoint {
  return { x: stableNumber(point.x), y: stableNumber(point.y) };
}

function planarDistance(first: PlanPoint, second: PlanPoint): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function pointsClose(first: PlanPoint, second: PlanPoint, tolerance = BOUNDARY_NODE_TOLERANCE): boolean {
  return planarDistance(first, second) <= tolerance;
}

function arcPoint(arc: ArcPrimitive, fraction: number): PlanPoint {
  const sweep = directedArcSweep(arc);
  const angle = arc.counterclockwise
    ? arc.startAngle + sweep * fraction
    : arc.startAngle - sweep * fraction;
  return stablePoint({
    x: arc.center.x + Math.cos(angle) * arc.radius,
    y: arc.center.y + Math.sin(angle) * arc.radius,
  });
}

function directedArcSweep(arc: ArcPrimitive): number {
  return arc.counterclockwise
    ? normalizeRadians(arc.endAngle - arc.startAngle)
    : normalizeRadians(arc.startAngle - arc.endAngle);
}

function primitiveBounds(primitive: BoundaryPrimitive) {
  if (primitive.kind === "line") {
    return {
      maximumX: Math.max(primitive.start.x, primitive.end.x),
      maximumY: Math.max(primitive.start.y, primitive.end.y),
      minimumX: Math.min(primitive.start.x, primitive.end.x),
      minimumY: Math.min(primitive.start.y, primitive.end.y),
    };
  }
  const points = [arcPoint(primitive, 0), arcPoint(primitive, 1)];
  for (let index = 0; index < 4; index += 1) {
    const angle = index * Math.PI / 2;
    const parameter = arcParameter(primitive, {
      x: primitive.center.x + Math.cos(angle) * primitive.radius,
      y: primitive.center.y + Math.sin(angle) * primitive.radius,
    });
    if (parameter !== null) points.push(arcPoint(primitive, parameter));
  }
  return {
    maximumX: Math.max(...points.map((point) => point.x)),
    maximumY: Math.max(...points.map((point) => point.y)),
    minimumX: Math.min(...points.map((point) => point.x)),
    minimumY: Math.min(...points.map((point) => point.y)),
  };
}

function boundsOverlap(first: ReturnType<typeof primitiveBounds>, second: ReturnType<typeof primitiveBounds>): boolean {
  return first.minimumX <= second.maximumX + BOUNDARY_NODE_TOLERANCE &&
    first.maximumX >= second.minimumX - BOUNDARY_NODE_TOLERANCE &&
    first.minimumY <= second.maximumY + BOUNDARY_NODE_TOLERANCE &&
    first.maximumY >= second.minimumY - BOUNDARY_NODE_TOLERANCE;
}

function lineParameter(line: LinePrimitive, point: PlanPoint): number | null {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= BOUNDARY_NODE_TOLERANCE ** 2) return null;
  const parameter = ((point.x - line.start.x) * dx + (point.y - line.start.y) * dy) / lengthSquared;
  const projected = { x: line.start.x + dx * parameter, y: line.start.y + dy * parameter };
  if (planarDistance(projected, point) > BOUNDARY_NODE_TOLERANCE || parameter < -BOUNDARY_NODE_TOLERANCE || parameter > 1 + BOUNDARY_NODE_TOLERANCE) return null;
  return Math.max(0, Math.min(1, parameter));
}

function arcParameter(arc: ArcPrimitive, point: PlanPoint): number | null {
  const radialDistance = planarDistance(arc.center, point);
  if (Math.abs(radialDistance - arc.radius) > BOUNDARY_NODE_TOLERANCE * Math.max(1, arc.radius)) return null;
  const sweep = directedArcSweep(arc);
  if (sweep <= BOUNDARY_NODE_TOLERANCE) return null;
  const angle = Math.atan2(point.y - arc.center.y, point.x - arc.center.x);
  let distance = arc.counterclockwise
    ? normalizeRadians(angle - arc.startAngle)
    : normalizeRadians(arc.startAngle - angle);
  if (pointsClose(point, arcPoint(arc, 1))) distance = sweep;
  if (distance > sweep + BOUNDARY_NODE_TOLERANCE) return null;
  return Math.max(0, Math.min(1, distance / sweep));
}

function uniquePoints(points: PlanPoint[]): PlanPoint[] {
  return points.reduce<PlanPoint[]>((result, point) => {
    if (!result.some((candidate) => pointsClose(candidate, point))) result.push(stablePoint(point));
    return result;
  }, []);
}

function lineLineIntersections(first: LinePrimitive, second: LinePrimitive): PlanPoint[] {
  const ax = first.end.x - first.start.x;
  const ay = first.end.y - first.start.y;
  const bx = second.end.x - second.start.x;
  const by = second.end.y - second.start.y;
  const denominator = ax * by - ay * bx;
  const offsetX = second.start.x - first.start.x;
  const offsetY = second.start.y - first.start.y;
  if (Math.abs(denominator) <= BOUNDARY_NODE_TOLERANCE) {
    if (Math.abs(offsetX * ay - offsetY * ax) > BOUNDARY_NODE_TOLERANCE) return [];
    return uniquePoints([first.start, first.end, second.start, second.end].filter((point) =>
      lineParameter(first, point) !== null && lineParameter(second, point) !== null));
  }
  const firstParameter = (offsetX * by - offsetY * bx) / denominator;
  const secondParameter = (offsetX * ay - offsetY * ax) / denominator;
  if (firstParameter < -BOUNDARY_NODE_TOLERANCE || firstParameter > 1 + BOUNDARY_NODE_TOLERANCE ||
      secondParameter < -BOUNDARY_NODE_TOLERANCE || secondParameter > 1 + BOUNDARY_NODE_TOLERANCE) return [];
  return [stablePoint({ x: first.start.x + ax * firstParameter, y: first.start.y + ay * firstParameter })];
}

function lineArcIntersections(line: LinePrimitive, arc: ArcPrimitive): PlanPoint[] {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const fx = line.start.x - arc.center.x;
  const fy = line.start.y - arc.center.y;
  const a = dx * dx + dy * dy;
  if (a <= BOUNDARY_NODE_TOLERANCE ** 2) return [];
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - arc.radius ** 2;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < -BOUNDARY_NODE_TOLERANCE) return [];
  const root = Math.sqrt(Math.max(0, discriminant));
  const parameters = root <= BOUNDARY_NODE_TOLERANCE ? [-b / (2 * a)] : [(-b - root) / (2 * a), (-b + root) / (2 * a)];
  return uniquePoints(parameters
    .filter((parameter) => parameter >= -BOUNDARY_NODE_TOLERANCE && parameter <= 1 + BOUNDARY_NODE_TOLERANCE)
    .map((parameter) => stablePoint({ x: line.start.x + dx * parameter, y: line.start.y + dy * parameter }))
    .filter((point) => arcParameter(arc, point) !== null));
}

function arcArcIntersections(first: ArcPrimitive, second: ArcPrimitive): PlanPoint[] {
  const dx = second.center.x - first.center.x;
  const dy = second.center.y - first.center.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= BOUNDARY_NODE_TOLERANCE ||
      distance > first.radius + second.radius + BOUNDARY_NODE_TOLERANCE ||
      distance < Math.abs(first.radius - second.radius) - BOUNDARY_NODE_TOLERANCE) return [];
  const along = (first.radius ** 2 - second.radius ** 2 + distance ** 2) / (2 * distance);
  const heightSquared = first.radius ** 2 - along ** 2;
  if (heightSquared < -BOUNDARY_NODE_TOLERANCE) return [];
  const height = Math.sqrt(Math.max(0, heightSquared));
  const base = {
    x: first.center.x + dx / distance * along,
    y: first.center.y + dy / distance * along,
  };
  const candidates = height <= BOUNDARY_NODE_TOLERANCE ? [base] : [
    { x: base.x - dy / distance * height, y: base.y + dx / distance * height },
    { x: base.x + dy / distance * height, y: base.y - dx / distance * height },
  ];
  return uniquePoints(candidates.map(stablePoint).filter((point) =>
    arcParameter(first, point) !== null && arcParameter(second, point) !== null));
}

function primitiveIntersections(first: BoundaryPrimitive, second: BoundaryPrimitive): PlanPoint[] {
  if (first.kind === "line" && second.kind === "line") return lineLineIntersections(first, second);
  if (first.kind === "line" && second.kind === "arc") return lineArcIntersections(first, second);
  if (first.kind === "arc" && second.kind === "line") return lineArcIntersections(second, first);
  return arcArcIntersections(first as ArcPrimitive, second as ArcPrimitive);
}

function arcPrimitive(geometry: ArcGeometry): ArcPrimitive {
  return {
    center: { x: geometry.center.x, y: geometry.center.y },
    counterclockwise: geometry.counterclockwise,
    endAngle: geometry.endAngle * Math.PI / 180,
    kind: "arc",
    radius: geometry.radius,
    startAngle: geometry.startAngle * Math.PI / 180,
  };
}

function sourcePrimitives(source: BoundarySource, elevation: number): BoundaryPrimitive[] {
  if (source.kind === "line") {
    if (Math.abs(source.geometry.start.z - elevation) > BOUNDARY_ELEVATION_TOLERANCE ||
        Math.abs(source.geometry.end.z - elevation) > BOUNDARY_ELEVATION_TOLERANCE) return [];
    return [{ end: stablePoint(source.geometry.end), kind: "line", start: stablePoint(source.geometry.start) }];
  }
  if (source.kind === "arc") {
    return Math.abs(source.geometry.center.z - elevation) <= BOUNDARY_ELEVATION_TOLERANCE ? [arcPrimitive(source.geometry)] : [];
  }
  if (source.kind === "circle") {
    if (Math.abs(source.geometry.center.z - elevation) > BOUNDARY_ELEVATION_TOLERANCE) return [];
    return Array.from({ length: 4 }, (_, index): ArcPrimitive => ({
      center: stablePoint(source.geometry.center),
      counterclockwise: true,
      endAngle: (index + 1) * Math.PI / 2,
      kind: "arc",
      radius: source.geometry.radius,
      startAngle: index * Math.PI / 2,
    }));
  }
  if (Math.abs(source.geometry.elevation - elevation) > BOUNDARY_ELEVATION_TOLERANCE) return [];
  return polylineSegments(source.geometry).map((segment): BoundaryPrimitive => {
    const circular = polylineSegmentCircularGeometry(segment);
    if (!circular) return { end: stablePoint(segment.end), kind: "line", start: stablePoint(segment.start) };
    return {
      center: stablePoint(circular.center),
      counterclockwise: circular.counterclockwise,
      endAngle: circular.endAngle * Math.PI / 180,
      kind: "arc",
      radius: circular.radius,
      startAngle: circular.startAngle * Math.PI / 180,
    };
  });
}

function uniqueParameters(parameters: number[]): number[] {
  return parameters
    .map((value) => Math.max(0, Math.min(1, value)))
    .sort((first, second) => first - second)
    .reduce<number[]>((result, value) => {
      if (!result.length || Math.abs(result.at(-1)! - value) > 1e-8) result.push(value);
      return result;
    }, []);
}

function splitPrimitives(primitives: BoundaryPrimitive[]): SplitEdge[] {
  const splitParameters = primitives.map((primitive) => {
    if (primitive.kind === "line") return [0, 1];
    const subdivisions = Math.max(1, Math.ceil(directedArcSweep(primitive) / (Math.PI / 2)));
    return Array.from({ length: subdivisions + 1 }, (_, index) => index / subdivisions);
  });
  const bounds = primitives.map(primitiveBounds);
  for (let firstIndex = 0; firstIndex < primitives.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < primitives.length; secondIndex += 1) {
      if (!boundsOverlap(bounds[firstIndex], bounds[secondIndex])) continue;
      const firstPrimitive = primitives[firstIndex];
      const secondPrimitive = primitives[secondIndex];
      primitiveIntersections(firstPrimitive, secondPrimitive).forEach((point) => {
        const firstParameter = firstPrimitive.kind === "line"
          ? lineParameter(firstPrimitive, point)
          : arcParameter(firstPrimitive, point);
        const secondParameter = secondPrimitive.kind === "line"
          ? lineParameter(secondPrimitive, point)
          : arcParameter(secondPrimitive, point);
        if (firstParameter !== null) splitParameters[firstIndex].push(firstParameter);
        if (secondParameter !== null) splitParameters[secondIndex].push(secondParameter);
      });
    }
  }

  const edges: SplitEdge[] = [];
  primitives.forEach((primitive, primitiveIndex) => {
    const parameters = uniqueParameters(splitParameters[primitiveIndex]);
    parameters.slice(1).forEach((endParameter, index) => {
      const startParameter = parameters[index];
      if (endParameter - startParameter <= 1e-8) return;
      if (primitive.kind === "line") {
        const start = stablePoint({
          x: primitive.start.x + (primitive.end.x - primitive.start.x) * startParameter,
          y: primitive.start.y + (primitive.end.y - primitive.start.y) * startParameter,
        });
        const end = stablePoint({
          x: primitive.start.x + (primitive.end.x - primitive.start.x) * endParameter,
          y: primitive.start.y + (primitive.end.y - primitive.start.y) * endParameter,
        });
        if (planarDistance(start, end) <= BOUNDARY_NODE_TOLERANCE) return;
        const tangent = Math.atan2(end.y - start.y, end.x - start.x);
        edges.push({ bulge: 0, end, endTangent: tangent, start, startTangent: tangent });
        return;
      }
      const start = arcPoint(primitive, startParameter);
      const end = arcPoint(primitive, endParameter);
      const signedSweep = directedArcSweep(primitive) * (endParameter - startParameter) * (primitive.counterclockwise ? 1 : -1);
      if (Math.abs(signedSweep) <= 1e-8 || planarDistance(start, end) <= BOUNDARY_NODE_TOLERANCE) return;
      const startRadial = Math.atan2(start.y - primitive.center.y, start.x - primitive.center.x);
      const endRadial = Math.atan2(end.y - primitive.center.y, end.x - primitive.center.x);
      const tangentOffset = primitive.counterclockwise ? Math.PI / 2 : -Math.PI / 2;
      edges.push({
        bulge: stableNumber(Math.tan(signedSweep / 4)),
        end,
        endTangent: normalizeRadians(endRadial + tangentOffset),
        start,
        startTangent: normalizeRadians(startRadial + tangentOffset),
      });
    });
  });
  return edges;
}

function buildGraph(edges: SplitEdge[]): { halfEdges: HalfEdge[]; nodes: PlanPoint[]; outgoing: number[][] } {
  const nodes: PlanPoint[] = [];
  const nodeFor = (point: PlanPoint) => {
    const existing = nodes.findIndex((candidate) => pointsClose(candidate, point));
    if (existing >= 0) return existing;
    nodes.push(stablePoint(point));
    return nodes.length - 1;
  };
  const halfEdges: HalfEdge[] = [];
  const edgeKeys = new Set<string>();
  edges.forEach((edge) => {
    const startNode = nodeFor(edge.start);
    const endNode = nodeFor(edge.end);
    if (startNode === endNode) return;
    const canonicalBulge = startNode < endNode ? edge.bulge : -edge.bulge;
    const key = `${Math.min(startNode, endNode)}:${Math.max(startNode, endNode)}:${Math.round(canonicalBulge * 1e9)}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    const forwardId = halfEdges.length;
    const reverseId = forwardId + 1;
    halfEdges.push({
      bulge: edge.bulge,
      endNode,
      id: forwardId,
      startNode,
      tangent: normalizeRadians(edge.startTangent),
      twin: reverseId,
    });
    halfEdges.push({
      bulge: -edge.bulge,
      endNode: startNode,
      id: reverseId,
      startNode: endNode,
      tangent: normalizeRadians(edge.endTangent + Math.PI),
      twin: forwardId,
    });
  });
  const outgoing = nodes.map(() => [] as number[]);
  halfEdges.forEach((halfEdge) => outgoing[halfEdge.startNode].push(halfEdge.id));
  outgoing.forEach((edgeIds) => edgeIds.sort((first, second) => halfEdges[first].tangent - halfEdges[second].tangent || first - second));
  return { halfEdges, nodes, outgoing };
}

function nextFaceHalfEdge(current: HalfEdge, halfEdges: HalfEdge[], outgoing: number[][]): number | null {
  const candidates = outgoing[current.endNode];
  const twinIndex = candidates.indexOf(current.twin);
  if (twinIndex < 0 || !candidates.length) return null;
  return candidates[(twinIndex - 1 + candidates.length) % candidates.length];
}

function traceFaces(graph: ReturnType<typeof buildGraph>): PolylineGeometry[] {
  const visited = new Set<number>();
  const faces: PolylineGeometry[] = [];
  graph.halfEdges.forEach((startingEdge) => {
    if (visited.has(startingEdge.id)) return;
    const path: HalfEdge[] = [];
    const localVisited = new Set<number>();
    let currentId: number | null = startingEdge.id;
    while (currentId !== null && !localVisited.has(currentId) && path.length <= graph.halfEdges.length) {
      localVisited.add(currentId);
      path.push(graph.halfEdges[currentId]);
      currentId = nextFaceHalfEdge(graph.halfEdges[currentId], graph.halfEdges, graph.outgoing);
      if (currentId === startingEdge.id) break;
    }
    localVisited.forEach((id) => visited.add(id));
    if (currentId !== startingEdge.id || path.length < 2 || path.length > MAXIMUM_POLYLINE_VERTICES) return;
    const geometry: PolylineGeometry = {
      bulges: path.map((edge) => edge.bulge),
      closed: true,
      elevation: 0,
      vertices: path.map((edge) => ({ ...graph.nodes[edge.startNode] })),
      width: 0,
    };
    if (polylineGeometryIsValid(geometry)) faces.push(geometry);
  });
  return faces;
}

function signedPolylineArea(polyline: PolylineGeometry): number {
  return polylineSegments(polyline).reduce((total, segment) => {
    const chordArea = (segment.start.x * segment.end.y - segment.end.x * segment.start.y) / 2;
    if (Math.abs(segment.bulge) <= 1e-12) return total + chordArea;
    const chord = planarDistance(segment.start, segment.end);
    const sweep = 4 * Math.atan(segment.bulge);
    const radius = chord * (1 + segment.bulge ** 2) / (4 * Math.abs(segment.bulge));
    return total + chordArea + radius ** 2 * (sweep - Math.sin(sweep)) / 2;
  }, 0);
}

function pointToSegmentDistance(point: PlanPoint, start: PlanPoint, end: PlanPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= BOUNDARY_NODE_TOLERANCE ** 2) return planarDistance(point, start);
  const parameter = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return planarDistance(point, { x: start.x + dx * parameter, y: start.y + dy * parameter });
}

function boundaryPathPoints(polyline: PolylineGeometry): PlanPoint[] {
  return polylineSegments(polyline).flatMap((segment, index) =>
    polylineSegmentPoints(segment, BOUNDARY_ARC_CONTAINMENT_SUBDIVISIONS).slice(index ? 1 : 0));
}

function polylineContainsPoint(polyline: PolylineGeometry, point: PlanPoint): boolean {
  const path = boundaryPathPoints(polyline);
  if (path.length < 3) return false;
  const closed = pointsClose(path[0], path.at(-1)!) ? path : [...path, path[0]];
  if (closed.slice(1).some((end, index) => pointToSegmentDistance(point, closed[index], end) <= BOUNDARY_PICK_TOLERANCE)) return false;
  let inside = false;
  for (let index = 0; index < closed.length - 1; index += 1) {
    const start = closed[index];
    const end = closed[index + 1];
    if ((start.y > point.y) === (end.y > point.y)) continue;
    const intersectionX = start.x + (point.y - start.y) * (end.x - start.x) / (end.y - start.y);
    if (intersectionX > point.x) inside = !inside;
  }
  return inside;
}

export function discoverBoundaryAtPoint(
  sources: BoundarySource[],
  pick: LinePoint,
  elevation = pick.z,
): BoundaryDiscoveryResult | null {
  if (![pick.x, pick.y, pick.z, elevation].every(Number.isFinite) || Math.abs(pick.z - elevation) > BOUNDARY_ELEVATION_TOLERANCE) return null;
  const primitives = sources.flatMap((source) => sourcePrimitives(source, elevation));
  if (!primitives.length || primitives.length > MAXIMUM_BOUNDARY_PRIMITIVES) return null;
  const graph = buildGraph(splitPrimitives(primitives));
  const candidates = traceFaces(graph)
    .map((geometry) => ({ area: signedPolylineArea(geometry), geometry: { ...geometry, elevation } }))
    .filter((candidate) => candidate.area > BOUNDARY_NODE_TOLERANCE && polylineContainsPoint(candidate.geometry, pick))
    .sort((first, second) => first.area - second.area);
  const result = candidates[0];
  if (!result || !polylineGeometryIsValid(result.geometry)) return null;
  return { area: stableNumber(result.area), geometry: result.geometry };
}
