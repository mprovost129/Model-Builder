import { wallOpeningRoughBottom, type LineObject } from "./document-model.ts";
import {
  wallLayerGroupThickness,
  wallReferenceDistanceFromExterior,
  type LayeredAssembly,
  type WallFramingSettings,
  type WallOpeningType,
} from "./building-stories.ts";
import type { AutomaticWallJoinPlan, WallEndpoint } from "./wall-joins.ts";

export type WallFramingMemberKind =
  | "backing-block"
  | "backing-stud"
  | "bottom-plate"
  | "common-stud"
  | "corner-stud"
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

function distanceAlongLine(line: LineObject, point: { x: number; y: number }) {
  const direction = lineDirection(line);
  return direction ? (point.x - line.start.x) * direction.x + (point.y - line.start.y) * direction.y : null;
}

function endpointPoint(line: LineObject, endpoint: WallEndpoint) {
  return endpoint === "start" ? line.start : line.end;
}

function teeCentersForHost(line: LineObject, wallLines: LineObject[], joinPlan: AutomaticWallJoinPlan | undefined) {
  if (!joinPlan) return [];
  const centers: number[] = [];
  wallLines.forEach((branch) => {
    const joins = joinPlan.endpointJoins.get(branch.id);
    (["start", "end"] as const).forEach((endpoint) => {
      const join = joins?.[endpoint];
      if (join?.kind !== "tee" || join.hostWallId !== line.id) return;
      const distance = distanceAlongLine(line, endpointPoint(branch, endpoint));
      if (distance !== null && !centers.some((existing) => Math.abs(existing - distance) < TOLERANCE)) centers.push(distance);
    });
  });
  return centers;
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
  joinPlan?: AutomaticWallJoinPlan,
  wallLines: LineObject[] = [line],
  openingTypesById: ReadonlyMap<string, WallOpeningType> = new Map(),
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
  const openingFraming = (opening: LineObject["wallOpenings"][number]) => {
    const type = opening.wallOpeningTypeId === null ? null : openingTypesById.get(opening.wallOpeningTypeId) ?? null;
    return type?.kind === opening.kind ? {
      headerDepth: type.headerDepth,
      jackStudCountPerSide: type.jackStudCountPerSide,
      kingStudCountPerSide: type.kingStudCountPerSide,
      windowSillPlateCount: type.windowSillPlateCount,
    } : {
      headerDepth: settings.headerHeight,
      jackStudCountPerSide: 1,
      kingStudCountPerSide: 1,
      windowSillPlateCount: opening.kind === "window" ? 1 : 0,
    };
  };
  const doorCuts = line.wallOpenings
    .filter((opening) => opening.kind === "door")
    .map((opening) => ({ start: opening.centerOffset - opening.roughWidth / 2, end: opening.centerOffset + opening.roughWidth / 2 }));
  for (let index = 0; index < settings.bottomPlateCount; index += 1) {
    subtractIntervals(direction.length, doorCuts).forEach((segment) => add("bottom-plate", segment.start, segment.end, index * settings.plateHeight, settings.plateHeight));
  }
  for (let index = 0; index < settings.topPlateCount; index += 1) {
    add("top-plate", 0, direction.length, wallHeight - (index + 1) * settings.plateHeight, settings.plateHeight);
  }

  const teeCenters = teeCentersForHost(line, wallLines, joinPlan).filter((center) => !line.wallOpenings.some((opening) => (
    center > opening.centerOffset - opening.roughWidth / 2 - settings.studWidth &&
    center < opening.centerOffset + opening.roughWidth / 2 + settings.studWidth
  )));
  const protectedZones = line.wallOpenings.map((opening) => {
    const framing = openingFraming(opening);
    const sideMemberCount = framing.jackStudCountPerSide + framing.kingStudCountPerSide;
    return {
      start: opening.centerOffset - opening.roughWidth / 2 - settings.studWidth * sideMemberCount,
      end: opening.centerOffset + opening.roughWidth / 2 + settings.studWidth * sideMemberCount,
    };
  });
  if (settings.partitionBackingStyle === "three-stud") teeCenters.forEach((center) => protectedZones.push({ start: center - settings.studWidth * 2, end: center + settings.studWidth * 2 }));
  const addCommonStud = (start: number) => {
    const end = Math.min(direction.length, start + settings.studWidth);
    if (protectedZones.some((zone) => intervalsOverlap(start, end, zone.start, zone.end))) return;
    add("common-stud", start, end, bottomStackHeight, fullStudHeight);
  };
  for (let start = 0; start < direction.length - TOLERANCE; start += settings.studSpacing) addCommonStud(start);
  addCommonStud(Math.max(0, direction.length - settings.studWidth));

  if (settings.cornerStyle === "three-stud" && joinPlan) {
    const joins = joinPlan.endpointJoins.get(line.id);
    (["start", "end"] as const).forEach((endpoint) => {
      const join = joins?.[endpoint];
      if (join?.kind !== "corner" || line.id.localeCompare(join.otherWallId) >= 0) return;
      const start = endpoint === "start" ? settings.studWidth : direction.length - settings.studWidth * 2;
      add("corner-stud", start, start + settings.studWidth, bottomStackHeight, fullStudHeight);
    });
  }

  if (settings.partitionBackingStyle === "three-stud") teeCenters.forEach((center) => {
    for (let index = -1; index <= 1; index += 1) {
      const start = center + (index - 0.5) * settings.studWidth;
      add("backing-stud", start, start + settings.studWidth, bottomStackHeight, fullStudHeight);
    }
  });
  if (settings.partitionBackingStyle === "ladder") teeCenters.forEach((center) => {
    const start = center - settings.studSpacing / 2;
    const end = center + settings.studSpacing / 2;
    for (let base = bottomStackHeight + settings.ladderBlockSpacing; base + settings.plateHeight <= studTop + TOLERANCE; base += settings.ladderBlockSpacing) {
      add("backing-block", start, end, base, settings.plateHeight);
    }
  });

  line.wallOpenings.forEach((opening) => {
    const openingStart = opening.centerOffset - opening.roughWidth / 2;
    const openingEnd = opening.centerOffset + opening.roughWidth / 2;
    const roughBottom = wallOpeningRoughBottom(opening);
    const framing = openingFraming(opening);
    for (let index = 0; index < framing.jackStudCountPerSide; index += 1) {
      add("jack-stud", openingStart - settings.studWidth * (index + 1), openingStart - settings.studWidth * index, bottomStackHeight, opening.headerBottomHeight - bottomStackHeight, opening.id);
      add("jack-stud", openingEnd + settings.studWidth * index, openingEnd + settings.studWidth * (index + 1), bottomStackHeight, opening.headerBottomHeight - bottomStackHeight, opening.id);
    }
    for (let index = 0; index < framing.kingStudCountPerSide; index += 1) {
      const memberIndex = framing.jackStudCountPerSide + index;
      add("king-stud", openingStart - settings.studWidth * (memberIndex + 1), openingStart - settings.studWidth * memberIndex, bottomStackHeight, fullStudHeight, opening.id);
      add("king-stud", openingEnd + settings.studWidth * memberIndex, openingEnd + settings.studWidth * (memberIndex + 1), bottomStackHeight, fullStudHeight, opening.id);
    }
    const headerHeight = Math.min(framing.headerDepth, Math.max(0, studTop - opening.headerBottomHeight));
    const jackBearingWidth = framing.jackStudCountPerSide * settings.studWidth;
    add("header", openingStart - jackBearingWidth, openingEnd + jackBearingWidth, opening.headerBottomHeight, headerHeight, opening.id);
    const sillStackHeight = opening.kind === "window" ? framing.windowSillPlateCount * settings.plateHeight : 0;
    if (opening.kind === "window") for (let index = 0; index < framing.windowSillPlateCount; index += 1) {
      add("rough-sill", openingStart, openingEnd, roughBottom - (index + 1) * settings.plateHeight, settings.plateHeight, opening.id);
    }
    const headerTop = opening.headerBottomHeight + headerHeight;
    for (let start = Math.ceil(openingStart / settings.studSpacing) * settings.studSpacing; start + settings.studWidth <= openingEnd + TOLERANCE; start += settings.studSpacing) {
      if (opening.kind === "window") add("cripple-stud", start, start + settings.studWidth, bottomStackHeight, roughBottom - sillStackHeight - bottomStackHeight, opening.id);
      add("cripple-stud", start, start + settings.studWidth, headerTop, studTop - headerTop, opening.id);
    }
  });

  return result;
}
