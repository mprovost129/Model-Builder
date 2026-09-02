import { wallOpeningRoughBottom, type LineObject } from "./document-model.ts";
import {
  wallLayerGroupThickness,
  wallReferenceDistanceFromExterior,
  type LayeredAssembly,
  type WallFramingSettings,
} from "./building-stories.ts";

export type WallFramingMemberKind =
  | "bottom-plate"
  | "common-stud"
  | "cripple-stud"
  | "header"
  | "jack-stud"
  | "king-stud"
  | "rough-sill"
  | "top-plate";

export type WallFramingSolid = {
  baseHeight: number;
  endExterior: { x: number; y: number };
  endInterior: { x: number; y: number };
  height: number;
  kind: WallFramingMemberKind;
  material: string;
  openingId: string | null;
  startExterior: { x: number; y: number };
  startInterior: { x: number; y: number };
};

const TOLERANCE = 1 / 16;

function lineDirection(line: LineObject) {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const length = Math.hypot(dx, dy);
  return length < TOLERANCE ? null : { length, x: dx / length, y: dy / length };
}

function offsetFromExteriorDistance(wallType: LayeredAssembly, line: LineObject, distanceFromExterior: number) {
  const inwardDistance = distanceFromExterior - wallReferenceDistanceFromExterior(wallType, line.wallReferenceLine ?? "wall-center");
  return (line.wallExteriorSide ?? "left") === "left" ? -inwardDistance : inwardDistance;
}

function offsetPoint(point: { x: number; y: number }, direction: { x: number; y: number }, offset: number) {
  return { x: point.x - direction.y * offset, y: point.y + direction.x * offset };
}

function intervalsOverlap(firstStart: number, firstEnd: number, secondStart: number, secondEnd: number) {
  return firstStart < secondEnd - TOLERANCE && firstEnd > secondStart + TOLERANCE;
}

function subtractIntervals(length: number, cuts: Array<{ end: number; start: number }>) {
  const result: Array<{ end: number; start: number }> = [];
  let cursor = 0;
  cuts
    .map((cut) => ({ start: Math.max(0, cut.start), end: Math.min(length, cut.end) }))
    .filter((cut) => cut.end - cut.start >= TOLERANCE)
    .sort((first, second) => first.start - second.start)
    .forEach((cut) => {
      if (cut.start - cursor >= TOLERANCE) result.push({ start: cursor, end: cut.start });
      cursor = Math.max(cursor, cut.end);
    });
  if (length - cursor >= TOLERANCE) result.push({ start: cursor, end: length });
  return result;
}

/** Generates deterministic light-frame members from the Wall Main layer and rough openings. */
export function wallFramingSolids(
  line: LineObject,
  wallType: LayeredAssembly,
  settings: WallFramingSettings,
  wallHeight: number,
): WallFramingSolid[] {
  if (!settings.enabled || line.architecturalRole !== "wall") return [];
  const direction = lineDirection(line);
  const exteriorThickness = wallLayerGroupThickness(wallType, "exterior");
  const mainThickness = wallLayerGroupThickness(wallType, "main");
  if (!direction || mainThickness < TOLERANCE || wallHeight < TOLERANCE) return [];
  const mainExteriorOffset = offsetFromExteriorDistance(wallType, line, exteriorThickness);
  const mainInteriorOffset = offsetFromExteriorDistance(wallType, line, exteriorThickness + mainThickness);
  const pointAt = (distance: number) => ({ x: line.start.x + direction.x * distance, y: line.start.y + direction.y * distance });
  const result: WallFramingSolid[] = [];
  const keys = new Set<string>();
  const add = (kind: WallFramingMemberKind, start: number, end: number, baseHeight: number, height: number, openingId: string | null = null) => {
    const clippedStart = Math.max(0, start);
    const clippedEnd = Math.min(direction.length, end);
    if (clippedEnd - clippedStart < TOLERANCE || height < TOLERANCE || baseHeight < -TOLERANCE || baseHeight + height > wallHeight + TOLERANCE) return;
    const key = [kind, clippedStart, clippedEnd, baseHeight, height, openingId ?? ""].join(":");
    if (keys.has(key)) return;
    keys.add(key);
    const startPoint = pointAt(clippedStart);
    const endPoint = pointAt(clippedEnd);
    result.push({
      baseHeight,
      endExterior: offsetPoint(endPoint, direction, mainExteriorOffset),
      endInterior: offsetPoint(endPoint, direction, mainInteriorOffset),
      height,
      kind,
      material: settings.material,
      openingId,
      startExterior: offsetPoint(startPoint, direction, mainExteriorOffset),
      startInterior: offsetPoint(startPoint, direction, mainInteriorOffset),
    });
  };

  const bottomStackHeight = settings.bottomPlateCount * settings.plateHeight;
  const topStackHeight = settings.topPlateCount * settings.plateHeight;
  const studTop = wallHeight - topStackHeight;
  const fullStudHeight = studTop - bottomStackHeight;
  const doorCuts = line.wallOpenings
    .filter((opening) => opening.kind === "door")
    .map((opening) => ({ start: opening.centerOffset - opening.roughWidth / 2, end: opening.centerOffset + opening.roughWidth / 2 }));
  for (let index = 0; index < settings.bottomPlateCount; index += 1) {
    subtractIntervals(direction.length, doorCuts).forEach((segment) => add("bottom-plate", segment.start, segment.end, index * settings.plateHeight, settings.plateHeight));
  }
  for (let index = 0; index < settings.topPlateCount; index += 1) {
    add("top-plate", 0, direction.length, wallHeight - (index + 1) * settings.plateHeight, settings.plateHeight);
  }

  const protectedZones = line.wallOpenings.map((opening) => ({
    start: opening.centerOffset - opening.roughWidth / 2 - settings.studWidth * 2,
    end: opening.centerOffset + opening.roughWidth / 2 + settings.studWidth * 2,
  }));
  const addCommonStud = (start: number) => {
    const end = Math.min(direction.length, start + settings.studWidth);
    if (protectedZones.some((zone) => intervalsOverlap(start, end, zone.start, zone.end))) return;
    add("common-stud", start, end, bottomStackHeight, fullStudHeight);
  };
  for (let start = 0; start < direction.length - TOLERANCE; start += settings.studSpacing) addCommonStud(start);
  addCommonStud(Math.max(0, direction.length - settings.studWidth));

  line.wallOpenings.forEach((opening) => {
    const openingStart = opening.centerOffset - opening.roughWidth / 2;
    const openingEnd = opening.centerOffset + opening.roughWidth / 2;
    const roughBottom = wallOpeningRoughBottom(opening);
    add("king-stud", openingStart - settings.studWidth * 2, openingStart - settings.studWidth, bottomStackHeight, fullStudHeight, opening.id);
    add("king-stud", openingEnd + settings.studWidth, openingEnd + settings.studWidth * 2, bottomStackHeight, fullStudHeight, opening.id);
    add("jack-stud", openingStart - settings.studWidth, openingStart, bottomStackHeight, opening.headerBottomHeight - bottomStackHeight, opening.id);
    add("jack-stud", openingEnd, openingEnd + settings.studWidth, bottomStackHeight, opening.headerBottomHeight - bottomStackHeight, opening.id);
    const headerHeight = Math.min(settings.headerHeight, Math.max(0, studTop - opening.headerBottomHeight));
    add("header", openingStart - settings.studWidth, openingEnd + settings.studWidth, opening.headerBottomHeight, headerHeight, opening.id);
    if (opening.kind === "window") {
      add("rough-sill", openingStart, openingEnd, roughBottom, Math.min(settings.plateHeight, opening.roughHeight), opening.id);
    }
    const headerTop = opening.headerBottomHeight + headerHeight;
    for (let start = Math.ceil(openingStart / settings.studSpacing) * settings.studSpacing; start + settings.studWidth <= openingEnd + TOLERANCE; start += settings.studSpacing) {
      if (opening.kind === "window") add("cripple-stud", start, start + settings.studWidth, bottomStackHeight, roughBottom - bottomStackHeight, opening.id);
      add("cripple-stud", start, start + settings.studWidth, headerTop, studTop - headerTop, opening.id);
    }
  });

  return result;
}
