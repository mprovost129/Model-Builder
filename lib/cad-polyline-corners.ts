import {
  clonePolylineGeometry,
  normalizedPolylineBulges,
  polylineGeometryIsValid,
  type PolylineGeometry,
} from "./cad-polyline.ts";
import type { PlanPoint } from "./cad-line.ts";

const EPSILON = 1e-9;
const MINIMUM_SEGMENT_LENGTH = 1 / 16;

type CornerTreatment = {
  after: PlanPoint;
  before: PlanPoint;
  bulge: number;
  incomingDistance: number;
  outgoingDistance: number;
} | null;

function stableNumber(value: number): number {
  const rounded = Math.round(value * 1e12) / 1e12;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function pointAlong(vertex: PlanPoint, direction: PlanPoint, distance: number): PlanPoint {
  return {
    x: stableNumber(vertex.x + direction.x * distance),
    y: stableNumber(vertex.y + direction.y * distance),
  };
}

function sourceSupportsCornerTreatment(polyline: PolylineGeometry): boolean {
  return polylineGeometryIsValid(polyline) &&
    normalizedPolylineBulges(polyline).every((bulge) => Math.abs(bulge) <= EPSILON) &&
    polyline.vertices.length < 1000;
}

function buildCornerTreatments(
  polyline: PolylineGeometry,
  distances: (interiorAngle: number) => { incoming: number; outgoing: number },
  fillet: boolean,
): CornerTreatment[] | null {
  const vertices = polyline.vertices;
  const treatments: CornerTreatment[] = Array.from({ length: vertices.length }, () => null);
  let changed = false;

  for (let index = 0; index < vertices.length; index += 1) {
    if (!polyline.closed && (index === 0 || index === vertices.length - 1)) continue;
    const previous = vertices[(index - 1 + vertices.length) % vertices.length];
    const vertex = vertices[index];
    const next = vertices[(index + 1) % vertices.length];
    const incomingLength = Math.hypot(vertex.x - previous.x, vertex.y - previous.y);
    const outgoingLength = Math.hypot(next.x - vertex.x, next.y - vertex.y);
    if (incomingLength < MINIMUM_SEGMENT_LENGTH || outgoingLength < MINIMUM_SEGMENT_LENGTH) return null;

    const incoming = { x: (vertex.x - previous.x) / incomingLength, y: (vertex.y - previous.y) / incomingLength };
    const outgoing = { x: (next.x - vertex.x) / outgoingLength, y: (next.y - vertex.y) / outgoingLength };
    const interiorDot = Math.max(-1, Math.min(1, -incoming.x * outgoing.x - incoming.y * outgoing.y));
    const interiorAngle = Math.acos(interiorDot);
    if (interiorAngle <= EPSILON) return null;
    if (Math.PI - interiorAngle <= EPSILON) continue;

    const { incoming: incomingDistance, outgoing: outgoingDistance } = distances(interiorAngle);
    if (![incomingDistance, outgoingDistance].every(Number.isFinite) || incomingDistance < 0 || outgoingDistance < 0) return null;
    if (incomingDistance <= EPSILON && outgoingDistance <= EPSILON) continue;

    const turn = Math.atan2(incoming.x * outgoing.y - incoming.y * outgoing.x, incoming.x * outgoing.x + incoming.y * outgoing.y);
    treatments[index] = {
      after: pointAlong(vertex, outgoing, outgoingDistance),
      before: pointAlong(vertex, { x: -incoming.x, y: -incoming.y }, incomingDistance),
      bulge: fillet ? stableNumber(Math.tan(turn / 4)) : 0,
      incomingDistance,
      outgoingDistance,
    };
    changed = true;
  }
  if (!changed) return null;

  const segmentCount = vertices.length - 1 + (polyline.closed ? 1 : 0);
  for (let index = 0; index < segmentCount; index += 1) {
    const nextIndex = (index + 1) % vertices.length;
    const length = Math.hypot(vertices[nextIndex].x - vertices[index].x, vertices[nextIndex].y - vertices[index].y);
    const occupied = (treatments[index]?.outgoingDistance ?? 0) + (treatments[nextIndex]?.incomingDistance ?? 0);
    if (occupied > length - MINIMUM_SEGMENT_LENGTH + EPSILON) return null;
  }
  return treatments;
}

function rebuildPolyline(polyline: PolylineGeometry, treatments: CornerTreatment[]): PolylineGeometry | null {
  const vertices: PlanPoint[] = [];
  const bulges: number[] = [];

  if (polyline.closed) {
    treatments.forEach((treatment, index) => {
      if (!treatment) {
        vertices.push({ ...polyline.vertices[index] });
        bulges.push(0);
        return;
      }
      vertices.push(treatment.before, treatment.after);
      bulges.push(treatment.bulge, 0);
    });
  } else {
    vertices.push({ ...polyline.vertices[0] });
    for (let index = 1; index < polyline.vertices.length - 1; index += 1) {
      const treatment = treatments[index];
      if (!treatment) {
        bulges.push(0);
        vertices.push({ ...polyline.vertices[index] });
        continue;
      }
      bulges.push(0);
      vertices.push(treatment.before);
      bulges.push(treatment.bulge);
      vertices.push(treatment.after);
    }
    bulges.push(0);
    vertices.push({ ...polyline.vertices.at(-1)! });
  }

  const result = {
    ...clonePolylineGeometry(polyline),
    bulges,
    vertices,
  };
  return polylineGeometryIsValid(result) ? result : null;
}

/** Rounds every eligible straight-segment corner while keeping one native Polyline. */
export function filletPolylineCorners(polyline: PolylineGeometry, radius: number): PolylineGeometry | null {
  if (!sourceSupportsCornerTreatment(polyline) || !Number.isFinite(radius) || radius <= 0) return null;
  const treatments = buildCornerTreatments(
    polyline,
    (interiorAngle) => {
      const tangentDistance = radius / Math.tan(interiorAngle / 2);
      return { incoming: tangentDistance, outgoing: tangentDistance };
    },
    true,
  );
  return treatments ? rebuildPolyline(polyline, treatments) : null;
}

/** Bevels every eligible straight-segment corner while keeping one native Polyline. */
export function chamferPolylineCorners(
  polyline: PolylineGeometry,
  firstDistance: number,
  secondDistance: number,
): PolylineGeometry | null {
  if (!sourceSupportsCornerTreatment(polyline) || !Number.isFinite(firstDistance) || !Number.isFinite(secondDistance) ||
      firstDistance < 0 || secondDistance < 0 || (firstDistance === 0 && secondDistance === 0)) return null;
  const treatments = buildCornerTreatments(
    polyline,
    () => ({ incoming: firstDistance, outgoing: secondDistance }),
    false,
  );
  return treatments ? rebuildPolyline(polyline, treatments) : null;
}
