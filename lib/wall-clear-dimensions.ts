import {
  assemblyTotalThickness,
  wallLayerGroupThickness,
  wallReferenceDistanceFromExterior,
  type LayeredAssembly,
} from "./building-stories.ts";
import {
  findLineObject,
  updateLineObject,
  type LineObject,
  type ModelDocument,
} from "./document-model.ts";
import { snapLinePoint, type LinePoint } from "./cad-line.ts";

export type WallClearDimension = {
  distance: number;
  from: LinePoint;
  referenceWallId: string;
  side: "left" | "right";
  to: LinePoint;
};

const PARALLEL_DOT_TOLERANCE = Math.cos(Math.PI / 180);
const MINIMUM_OVERLAP = 1 / 16;

type Direction = { x: number; y: number };
type FaceCoordinates = { exterior: number; high: number; interior: number; low: number; mainExterior: number };

function wallDirection(line: LineObject): Direction | null {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const length = Math.hypot(dx, dy);
  return length >= 1 / 16 ? { x: dx / length, y: dy / length } : null;
}

function dot(point: { x: number; y: number }, axis: Direction): number {
  return point.x * axis.x + point.y * axis.y;
}

function wallFaceOffsets(line: LineObject, wallType: LayeredAssembly): [number, number] {
  const referenceDistance = wallReferenceDistanceFromExterior(wallType, line.wallReferenceLine ?? "wall-center");
  const totalThickness = assemblyTotalThickness(wallType);
  const exteriorSide = line.wallExteriorSide ?? "left";
  const signedOffset = (distanceFromExterior: number) => {
    const inwardDistance = distanceFromExterior - referenceDistance;
    return exteriorSide === "left" ? -inwardDistance : inwardDistance;
  };
  return [signedOffset(0), signedOffset(totalThickness)];
}

function faceCoordinatesAlongNormal(
  line: LineObject,
  wallType: LayeredAssembly,
  normal: Direction,
): FaceCoordinates | null {
  const direction = wallDirection(line);
  if (!direction) return null;
  const leftNormal = { x: -direction.y, y: direction.x };
  const normalAlignment = dot(leftNormal, normal);
  const base = dot(line.start, normal);
  const [exteriorOffset, interiorOffset] = wallFaceOffsets(line, wallType);
  const referenceDistance = wallReferenceDistanceFromExterior(wallType, line.wallReferenceLine ?? "wall-center");
  const mainExteriorDistance = wallLayerGroupThickness(wallType, "exterior");
  const mainExteriorOffset = (line.wallExteriorSide ?? "left") === "left"
    ? -(mainExteriorDistance - referenceDistance)
    : mainExteriorDistance - referenceDistance;
  const exterior = base + normalAlignment * exteriorOffset;
  const interior = base + normalAlignment * interiorOffset;
  const mainExterior = base + normalAlignment * mainExteriorOffset;
  return { exterior, high: Math.max(exterior, interior), interior, low: Math.min(exterior, interior), mainExterior };
}

function pointFromAxes(longitudinal: number, normalCoordinate: number, direction: Direction, normal: Direction, z: number): LinePoint {
  return {
    x: direction.x * longitudinal + normal.x * normalCoordinate,
    y: direction.y * longitudinal + normal.y * normalCoordinate,
    z,
  };
}

/**
 * Finds at most one nearest, physically clear Wall-face dimension on each side
 * of the selected Wall. Candidates must be parallel, overlap the selected Wall
 * along its length, share its Story, and have a resolvable Wall Type.
 */
export function nearestParallelWallClearDimensions(
  selected: LineObject,
  candidates: readonly LineObject[],
  wallTypes: readonly LayeredAssembly[],
): WallClearDimension[] {
  const direction = wallDirection(selected);
  const selectedType = wallTypes.find((type) => type.id === selected.wallTypeId);
  if (!direction || selected.architecturalRole !== "wall" || !selectedType) return [];
  const normal = { x: -direction.y, y: direction.x };
  const selectedFaces = faceCoordinatesAlongNormal(selected, selectedType, normal);
  if (!selectedFaces) return [];
  const selectedLongitudinal = [dot(selected.start, direction), dot(selected.end, direction)].sort((a, b) => a - b);
  const nearest = new Map<WallClearDimension["side"], WallClearDimension>();

  for (const candidate of candidates) {
    if (candidate.id === selected.id || candidate.architecturalRole !== "wall" || candidate.storyId !== selected.storyId) continue;
    const candidateDirection = wallDirection(candidate);
    const candidateType = wallTypes.find((type) => type.id === candidate.wallTypeId);
    if (!candidateDirection || !candidateType || Math.abs(dot(direction, candidateDirection)) < PARALLEL_DOT_TOLERANCE) continue;
    const candidateLongitudinal = [dot(candidate.start, direction), dot(candidate.end, direction)].sort((a, b) => a - b);
    const overlapStart = Math.max(selectedLongitudinal[0], candidateLongitudinal[0]);
    const overlapEnd = Math.min(selectedLongitudinal[1], candidateLongitudinal[1]);
    if (overlapEnd - overlapStart < MINIMUM_OVERLAP) continue;
    const candidateFaces = faceCoordinatesAlongNormal(candidate, candidateType, normal);
    if (!candidateFaces) continue;

    let dimension: WallClearDimension | null = null;
    const longitudinal = (overlapStart + overlapEnd) / 2;
    if (candidateFaces.low > selectedFaces.high) {
      const selectedCoordinate = selectedFaces.mainExterior;
      const candidateCoordinate = candidateFaces.mainExterior;
      dimension = {
        distance: Math.abs(candidateCoordinate - selectedCoordinate),
        from: pointFromAxes(longitudinal, selectedCoordinate, direction, normal, selected.start.z),
        referenceWallId: candidate.id,
        side: "left",
        to: pointFromAxes(longitudinal, candidateCoordinate, direction, normal, selected.start.z),
      };
    } else if (candidateFaces.high < selectedFaces.low) {
      const selectedCoordinate = selectedFaces.mainExterior;
      const candidateCoordinate = candidateFaces.mainExterior;
      dimension = {
        distance: Math.abs(selectedCoordinate - candidateCoordinate),
        from: pointFromAxes(longitudinal, selectedCoordinate, direction, normal, selected.start.z),
        referenceWallId: candidate.id,
        side: "right",
        to: pointFromAxes(longitudinal, candidateCoordinate, direction, normal, selected.start.z),
      };
    }
    if (!dimension || dimension.distance < 1 / 16) continue;
    const current = nearest.get(dimension.side);
    if (!current || dimension.distance < current.distance || dimension.distance === current.distance && dimension.referenceWallId < current.referenceWallId) {
      nearest.set(dimension.side, dimension);
    }
  }

  return (["left", "right"] as const).flatMap((side) => nearest.get(side) ?? []);
}

function endpointsCoincide(first: LinePoint, second: LinePoint): boolean {
  return Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z) < 1 / 16;
}

function endpointUsesAutomaticJoin(line: LineObject, endpoint: "start" | "end"): boolean {
  return (endpoint === "start" ? line.wallStartJoinMode : line.wallEndJoinMode) !== "square";
}

/**
 * Moves the selected Wall parallel until the chosen temporary face dimension
 * reaches the requested value. Automatically joined Wall endpoints that share
 * either selected endpoint follow the move so ordinary corners stay closed.
 */
export function setParallelWallDimension(
  document: ModelDocument,
  selectedWallId: string,
  referenceWallId: string,
  distance: number,
): ModelDocument | null {
  if (!Number.isFinite(distance) || distance < 1 / 16) return null;
  const selected = findLineObject(document, selectedWallId);
  const reference = findLineObject(document, referenceWallId);
  if (!selected || !reference || selected.architecturalRole !== "wall" || reference.architecturalRole !== "wall") return null;
  const dimension = nearestParallelWallClearDimensions(selected, [reference], document.building.wallTypes)
    .find((candidate) => candidate.referenceWallId === referenceWallId);
  if (!dimension) return null;
  const currentDistance = Math.hypot(dimension.from.x - dimension.to.x, dimension.from.y - dimension.to.y);
  if (currentDistance < 1 / 16) return null;
  const unitFromReference = {
    x: (dimension.from.x - dimension.to.x) / currentDistance,
    y: (dimension.from.y - dimension.to.y) / currentDistance,
  };
  const targetSelectedFace = {
    x: dimension.to.x + unitFromReference.x * distance,
    y: dimension.to.y + unitFromReference.y * distance,
  };
  const delta = {
    x: targetSelectedFace.x - dimension.from.x,
    y: targetSelectedFace.y - dimension.from.y,
  };
  const nextStart = snapLinePoint({ x: selected.start.x + delta.x, y: selected.start.y + delta.y, z: selected.start.z });
  const nextEnd = snapLinePoint({ x: selected.end.x + delta.x, y: selected.end.y + delta.y, z: selected.end.z });
  let next = updateLineObject(document, selected.id, { start: nextStart, end: nextEnd });
  if (!next) return null;

  for (const connected of document.lines) {
    if (connected.id === selected.id || connected.architecturalRole !== "wall" || connected.storyId !== selected.storyId) continue;
    let geometry = { start: connected.start, end: connected.end };
    let changed = false;
    for (const selectedEndpoint of ["start", "end"] as const) {
      if (!endpointUsesAutomaticJoin(selected, selectedEndpoint)) continue;
      for (const connectedEndpoint of ["start", "end"] as const) {
        if (!endpointUsesAutomaticJoin(connected, connectedEndpoint) || !endpointsCoincide(selected[selectedEndpoint], connected[connectedEndpoint])) continue;
        geometry = { ...geometry, [connectedEndpoint]: selectedEndpoint === "start" ? nextStart : nextEnd };
        changed = true;
      }
    }
    if (!changed) continue;
    next = updateLineObject(next, connected.id, geometry);
    if (!next) return null;
  }
  return next;
}
