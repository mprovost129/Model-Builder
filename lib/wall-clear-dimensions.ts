import {
  assemblyTotalThickness,
  wallReferenceDistanceFromExterior,
  type LayeredAssembly,
} from "./building-stories.ts";
import type { LineObject } from "./document-model.ts";
import type { LinePoint } from "./cad-line.ts";

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
type FaceRange = { high: number; low: number };

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

function faceRangeAlongNormal(
  line: LineObject,
  wallType: LayeredAssembly,
  normal: Direction,
): FaceRange | null {
  const direction = wallDirection(line);
  if (!direction) return null;
  const leftNormal = { x: -direction.y, y: direction.x };
  const normalAlignment = dot(leftNormal, normal);
  const base = dot(line.start, normal);
  const coordinates = wallFaceOffsets(line, wallType).map((offset) => base + normalAlignment * offset);
  return { high: Math.max(...coordinates), low: Math.min(...coordinates) };
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
  const selectedFaces = faceRangeAlongNormal(selected, selectedType, normal);
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
    const candidateFaces = faceRangeAlongNormal(candidate, candidateType, normal);
    if (!candidateFaces) continue;

    let dimension: WallClearDimension | null = null;
    const longitudinal = (overlapStart + overlapEnd) / 2;
    if (candidateFaces.low > selectedFaces.high) {
      dimension = {
        distance: candidateFaces.low - selectedFaces.high,
        from: pointFromAxes(longitudinal, selectedFaces.high, direction, normal, selected.start.z),
        referenceWallId: candidate.id,
        side: "left",
        to: pointFromAxes(longitudinal, candidateFaces.low, direction, normal, selected.start.z),
      };
    } else if (candidateFaces.high < selectedFaces.low) {
      dimension = {
        distance: selectedFaces.low - candidateFaces.high,
        from: pointFromAxes(longitudinal, selectedFaces.low, direction, normal, selected.start.z),
        referenceWallId: candidate.id,
        side: "right",
        to: pointFromAxes(longitudinal, candidateFaces.high, direction, normal, selected.start.z),
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
