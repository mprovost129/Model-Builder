import {
  cloneArcObject,
  cloneBoxObject,
  cloneCircleObject,
  cloneDocument,
  cloneGroup,
  cloneLayer,
  cloneLineObject,
  clonePolylineObject,
  DEFAULT_LAYER,
  DEFAULT_LAYER_ID,
  MAXIMUM_GROUP_COUNT,
  MAXIMUM_ARC_COUNT,
  MAXIMUM_CIRCLE_COUNT,
  MAXIMUM_LAYER_COUNT,
  MAXIMUM_LINE_COUNT,
  MAXIMUM_POLYLINE_COUNT,
  MAXIMUM_OBJECT_COUNT,
  type BoxObject,
  type ArcObject,
  type CircleObject,
  type ModelGroup,
  type ModelDocument,
  type ModelLayer,
  type LineObject,
  type PolylineObject,
} from "./document-model.ts";
import { arcGeometryIsValid } from "./cad-arc.ts";
import { circleGeometryIsValid } from "./cad-circle.ts";
import { polylineGeometryIsValid } from "./cad-polyline.ts";
import {
  MAXIMUM_COORDINATE,
  MINIMUM_DIMENSION,
  normalizeRotationZ,
  type BoxModel,
} from "./box-model.ts";
import {
  buildingStructureIsValid,
  cloneBuildingStructure,
  createDefaultCeilingStructure,
  createDefaultBuildingStructure,
  WALL_EXTERIOR_SIDES,
  WALL_LAYER_GROUPS,
  WALL_REFERENCE_LINES,
  type AssemblyKind,
  type AssemblyLayer,
  type AssemblyLayerRole,
  type BuildingStory,
  type BuildingStructure,
  type LayeredAssembly,
  type WallExteriorSide,
  type WallLayerGroup,
  type WallReferenceLine,
} from "./building-stories.ts";

export const PROJECT_FILE_FORMAT = "model-builder-project";
export const PROJECT_FILE_VERSION = 19;
export const PROJECT_FILE_EXTENSION = ".mbproj";

export type ModelBuilderProject = {
  activeLayerId: string;
  arcs: ArcObject[];
  building: BuildingStructure;
  circles: CircleObject[];
  createdAt: string;
  format: typeof PROJECT_FILE_FORMAT;
  groups: ModelGroup[];
  layers: ModelLayer[];
  lines: LineObject[];
  name: string;
  objects: BoxObject[];
  polylines: PolylineObject[];
  units: {
    display: "us-architectural";
    internal: "inch";
    precision: "1/16-inch";
  };
  updatedAt: string;
  version: typeof PROJECT_FILE_VERSION;
};

export type ProjectParseResult =
  | { ok: true; project: ModelBuilderProject }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isSixteenth(value: number): boolean {
  return Math.abs(value * 16 - Math.round(value * 16)) < 1e-8;
}

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    Number.isFinite(Date.parse(value))
  );
}

const ASSEMBLY_KINDS: AssemblyKind[] = ["ceiling-finish", "ceiling-structure", "floor-finish", "floor-structure", "wall-structure"];
const ASSEMBLY_LAYER_ROLES: AssemblyLayerRole[] = ["air-gap", "finish", "framing", "insulation", "membrane", "sheathing", "substrate"];

function readStoryId(value: Record<string, unknown>, supportsStories: boolean, fallbackStoryId: string): string | null {
  const storyId = supportsStories ? value.storyId : fallbackStoryId;
  return typeof storyId === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(storyId) ? storyId : null;
}

function readAssemblyLayer(value: unknown, requireWallGroup: boolean, supportsWallJoinMetadata: boolean): AssemblyLayer | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.material !== "string" ||
    typeof value.role !== "string" ||
    !ASSEMBLY_LAYER_ROLES.includes(value.role as AssemblyLayerRole) ||
    (requireWallGroup && (typeof value.wallGroup !== "string" || !WALL_LAYER_GROUPS.includes(value.wallGroup as WallLayerGroup))) ||
    (requireWallGroup && supportsWallJoinMetadata && typeof value.participatesInJoin !== "boolean") ||
    !isFiniteNumber(value.thickness)
  ) return null;
  const layer: AssemblyLayer = {
    id: value.id,
    material: value.material.trim(),
    name: value.name.trim(),
    role: value.role as AssemblyLayerRole,
    thickness: value.thickness,
  };
  if (requireWallGroup) {
    layer.wallGroup = value.wallGroup as WallLayerGroup;
    layer.participatesInJoin = supportsWallJoinMetadata
      ? value.participatesInJoin as boolean
      : layer.role !== "membrane";
  }
  return layer;
}

function inferLegacyWallLayerGroups(layers: AssemblyLayer[]): AssemblyLayer[] {
  const framingIndexes = layers.flatMap((layer, index) => layer.role === "framing" ? [index] : []);
  const fallbackMainIndex = layers.reduce(
    (largestIndex, layer, index) => layer.thickness > (layers[largestIndex]?.thickness ?? -1) ? index : largestIndex,
    0,
  );
  const firstMainIndex = framingIndexes[0] ?? fallbackMainIndex;
  const lastMainIndex = framingIndexes.at(-1) ?? fallbackMainIndex;
  return layers.map((layer, index) => ({
    ...layer,
    participatesInJoin: layer.role !== "membrane",
    wallGroup: index < firstMainIndex ? "exterior" : index > lastMainIndex ? "interior" : "main",
  }));
}

function readLayeredAssembly(value: unknown, kind: AssemblyKind, supportsWallGroups = false, supportsWallJoinMetadata = false): LayeredAssembly | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.kind !== "string" ||
    !ASSEMBLY_KINDS.includes(value.kind as AssemblyKind) ||
    value.kind !== kind ||
    !Array.isArray(value.layers)
  ) return null;
  const layers = value.layers.map((layer) => readAssemblyLayer(layer, kind === "wall-structure" && supportsWallGroups, supportsWallJoinMetadata));
  if (layers.some((layer) => layer === null)) return null;
  const validLayers = layers as AssemblyLayer[];
  return {
    id: value.id,
    kind,
    layers: kind === "wall-structure" && !supportsWallGroups ? inferLegacyWallLayerGroups(validLayers) : validLayers,
    name: value.name.trim(),
  };
}

function readBuildingStory(value: unknown, supportsCeilingStructure: boolean): BuildingStory | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    !isFiniteNumber(value.roughCeilingHeight)
  ) return null;
  const floorStructure = readLayeredAssembly(value.floorStructure, "floor-structure");
  const floorFinish = readLayeredAssembly(value.floorFinish, "floor-finish");
  const ceilingStructure = supportsCeilingStructure
    ? readLayeredAssembly(value.ceilingStructure, "ceiling-structure")
    : createDefaultCeilingStructure(value.id);
  const ceilingFinish = readLayeredAssembly(value.ceilingFinish, "ceiling-finish");
  if (!floorStructure || !floorFinish || !ceilingStructure || !ceilingFinish) return null;
  return {
    ceilingFinish,
    ceilingStructure,
    floorFinish,
    floorStructure,
    id: value.id,
    name: value.name.trim(),
    roughCeilingHeight: value.roughCeilingHeight,
  };
}

function readBuildingStructure(value: unknown, supportsWallTypes: boolean, supportsCeilingStructure: boolean, supportsWallGroups: boolean, supportsWallJoinMetadata: boolean): BuildingStructure | null {
  if (
    !isRecord(value) ||
    typeof value.activeStoryId !== "string" ||
    typeof value.anchorStoryId !== "string" ||
    !isFiniteNumber(value.datumElevation) ||
    !Array.isArray(value.stories)
  ) return null;
  const stories = value.stories.map((story) => readBuildingStory(story, supportsCeilingStructure));
  if (stories.some((story) => story === null)) return null;
  const defaults = createDefaultBuildingStructure();
  const wallTypes = supportsWallTypes && Array.isArray(value.wallTypes)
    ? value.wallTypes.map((wallType) => readLayeredAssembly(wallType, "wall-structure", supportsWallGroups, supportsWallJoinMetadata))
    : defaults.wallTypes;
  if (wallTypes.some((wallType) => wallType === null)) return null;
  const activeWallTypeId = supportsWallTypes ? value.activeWallTypeId : defaults.activeWallTypeId;
  if (typeof activeWallTypeId !== "string") return null;
  const building: BuildingStructure = {
    activeWallTypeId,
    activeStoryId: value.activeStoryId,
    anchorStoryId: value.anchorStoryId,
    datumElevation: value.datumElevation,
    stories: stories as BuildingStory[],
    wallTypes: wallTypes as LayeredAssembly[],
  };
  return buildingStructureIsValid(building) ? building : null;
}

function readBoxObject(
  value: unknown,
  fallbackLayerId: string | null,
  supportsGroupsAndLocks: boolean,
  supportsRotation: boolean,
  supportsStories: boolean,
  fallbackStoryId: string,
): BoxObject | null {
  if (!isRecord(value) || value.type !== "box") return null;
  if (!isRecord(value.dimensions) || !isRecord(value.position)) return null;
  if (
    typeof value.id !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.id) ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.trim().length > 120
  ) {
    return null;
  }

  const { length, width, height } = value.dimensions;
  const { x, y, z } = value.position;
  const numbers = [length, width, height, x, y, z];
  if (!numbers.every(isFiniteNumber)) return null;
  const [numericLength, numericWidth, numericHeight, numericX, numericY, numericZ] = numbers as number[];
  if (![numericLength, numericWidth, numericHeight, numericX, numericY, numericZ].every((number) => Math.abs(number) <= MAXIMUM_COORDINATE)) return null;
  if (![numericLength, numericWidth, numericHeight, numericX, numericY, numericZ].every(isSixteenth)) return null;
  if (
    numericLength < MINIMUM_DIMENSION ||
    numericWidth < MINIMUM_DIMENSION ||
    numericHeight < MINIMUM_DIMENSION
  ) {
    return null;
  }

  const layerId = typeof value.layerId === "string" ? value.layerId : fallbackLayerId;
  if (!layerId || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(layerId)) return null;
  const groupId = supportsGroupsAndLocks
    ? value.groupId === null
      ? null
      : typeof value.groupId === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.groupId)
        ? value.groupId
        : undefined
    : null;
  if (groupId === undefined || (supportsGroupsAndLocks && typeof value.locked !== "boolean")) return null;
  const rotationZ = supportsRotation ? value.rotationZ : 0;
  const storyId = readStoryId(value, supportsStories, fallbackStoryId);
  if (
    !storyId ||
    !isFiniteNumber(rotationZ) ||
    rotationZ < -180 ||
    rotationZ >= 180 ||
    Math.abs(rotationZ * 1000 - Math.round(rotationZ * 1000)) > 1e-8
  ) {
    return null;
  }

  return {
    dimensions: { length: numericLength, width: numericWidth, height: numericHeight },
    groupId,
    id: value.id,
    layerId,
    locked: supportsGroupsAndLocks ? value.locked as boolean : false,
    name: value.name.trim(),
    position: { x: numericX, y: numericY, z: numericZ },
    rotationZ: normalizeRotationZ(rotationZ),
    storyId,
    type: "box",
  };
}

function readGroup(value: unknown): ModelGroup | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.id) ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.trim().length > 80
  ) {
    return null;
  }
  return { id: value.id, name: value.name.trim() };
}

function readLayer(value: unknown): ModelLayer | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.id) ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.trim().length > 80 ||
    typeof value.color !== "string" ||
    !/^#[0-9A-F]{6}$/i.test(value.color) ||
    typeof value.visible !== "boolean" ||
    typeof value.locked !== "boolean"
  ) {
    return null;
  }
  return {
    color: value.color.toLowerCase(),
    id: value.id,
    locked: value.locked,
    name: value.name.trim(),
    visible: value.visible,
  };
}

function readLineObject(value: unknown, supportsZ: boolean, supportsStories: boolean, fallbackStoryId: string, supportsWalls: boolean, supportsWallPlacement: boolean): LineObject | null {
  if (!isRecord(value) || value.type !== "line" || !isRecord(value.start) || !isRecord(value.end)) return null;
  if (
    typeof value.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.id) ||
    typeof value.name !== "string" || !value.name.trim() || value.name.trim().length > 120 ||
    typeof value.layerId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.layerId) ||
    typeof value.locked !== "boolean"
  ) return null;
  const { x: startX, y: startY } = value.start;
  const { x: endX, y: endY } = value.end;
  const startZ = supportsZ ? value.start.z : 0;
  const endZ = supportsZ ? value.end.z : 0;
  const storyId = readStoryId(value, supportsStories, fallbackStoryId);
  if (!storyId) return null;
  const architecturalRole = supportsWalls
    ? value.architecturalRole === null ? null : value.architecturalRole === "wall" ? "wall" : undefined
    : null;
  const wallTypeId = supportsWalls
    ? value.wallTypeId === null ? null : typeof value.wallTypeId === "string" ? value.wallTypeId : undefined
    : null;
  const wallExteriorSide = supportsWallPlacement
    ? value.wallExteriorSide === null ? null : typeof value.wallExteriorSide === "string" && WALL_EXTERIOR_SIDES.includes(value.wallExteriorSide as WallExteriorSide) ? value.wallExteriorSide as WallExteriorSide : undefined
    : architecturalRole === "wall" ? "left" : null;
  const wallReferenceLine = supportsWallPlacement
    ? value.wallReferenceLine === null ? null : typeof value.wallReferenceLine === "string" && WALL_REFERENCE_LINES.includes(value.wallReferenceLine as WallReferenceLine) ? value.wallReferenceLine as WallReferenceLine : undefined
    : architecturalRole === "wall" ? "wall-center" : null;
  if (
    architecturalRole === undefined ||
    wallTypeId === undefined ||
    wallExteriorSide === undefined ||
    wallReferenceLine === undefined ||
    (architecturalRole === "wall") !== (wallTypeId !== null && wallExteriorSide !== null && wallReferenceLine !== null)
  ) return null;
  if (!isFiniteNumber(startX) || !isFiniteNumber(startY) || !isFiniteNumber(startZ) ||
      !isFiniteNumber(endX) || !isFiniteNumber(endY) || !isFiniteNumber(endZ)) return null;
  const numbers = [startX, startY, startZ, endX, endY, endZ];
  if (!numbers.every((number) => Math.abs(number) <= MAXIMUM_COORDINATE) || !numbers.every(isSixteenth)) return null;
  if (Math.hypot(endX - startX, endY - startY, endZ - startZ) < 1 / 16) return null;
  return {
    architecturalRole,
    end: { x: endX, y: endY, z: endZ },
    id: value.id,
    layerId: value.layerId,
    locked: value.locked,
    name: value.name.trim(),
    start: { x: startX, y: startY, z: startZ },
    storyId,
    type: "line",
    wallExteriorSide,
    wallReferenceLine,
    wallTypeId,
  };
}

function readPolylineObject(value: unknown, hasElevation: boolean, hasArcSegmentsAndWidth: boolean, supportsStories: boolean, fallbackStoryId: string): PolylineObject | null {
  if (!isRecord(value) || value.type !== "polyline" || !Array.isArray(value.vertices) || typeof value.closed !== "boolean") return null;
  if (
    typeof value.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.id) ||
    typeof value.name !== "string" || !value.name.trim() || value.name.trim().length > 120 ||
    typeof value.layerId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.layerId) ||
    typeof value.locked !== "boolean" ||
    (value.shape !== "polyline" && value.shape !== "rectangle")
  ) return null;
  const vertices = value.vertices.map((point) => {
    if (!isRecord(point) || !isFiniteNumber(point.x) || !isFiniteNumber(point.y)) return null;
    return { x: point.x, y: point.y };
  });
  if (vertices.some((point) => point === null)) return null;
  const elevation = hasElevation ? value.elevation : 0;
  const storyId = readStoryId(value, supportsStories, fallbackStoryId);
  if (!storyId) return null;
  if (!isFiniteNumber(elevation)) return null;
  const bulges = hasArcSegmentsAndWidth ? value.bulges : undefined;
  const widthValue = hasArcSegmentsAndWidth ? value.width : 0;
  if (hasArcSegmentsAndWidth && (!Array.isArray(bulges) || !bulges.every(isFiniteNumber) || !isFiniteNumber(widthValue))) return null;
  const geometry = { bulges: bulges as number[] | undefined, closed: value.closed, elevation, vertices: vertices as Array<{ x: number; y: number }>, width: widthValue as number };
  if (!polylineGeometryIsValid(geometry)) return null;
  const architecturalRole = value.architecturalRole === undefined || value.architecturalRole === null
    ? null
    : value.architecturalRole === "floor-platform"
      ? "floor-platform"
      : undefined;
  if (architecturalRole === undefined || (architecturalRole === "floor-platform" && !geometry.closed)) return null;
  return { ...geometry, architecturalRole, id: value.id, layerId: value.layerId, locked: value.locked, name: value.name.trim(), shape: value.shape, storyId, type: "polyline" };
}

function readCircleObject(value: unknown, supportsStories: boolean, fallbackStoryId: string): CircleObject | null {
  if (!isRecord(value) || value.type !== "circle" || !isRecord(value.center)) return null;
  if (
    typeof value.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.id) ||
    typeof value.name !== "string" || !value.name.trim() || value.name.trim().length > 120 ||
    typeof value.layerId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.layerId) ||
    typeof value.locked !== "boolean" ||
    !isFiniteNumber(value.center.x) || !isFiniteNumber(value.center.y) || !isFiniteNumber(value.center.z) ||
    !isFiniteNumber(value.radius)
  ) return null;
  const geometry = { center: { x: value.center.x, y: value.center.y, z: value.center.z }, radius: value.radius };
  const storyId = readStoryId(value, supportsStories, fallbackStoryId);
  if (!storyId) return null;
  if (!circleGeometryIsValid(geometry)) return null;
  return { ...geometry, id: value.id, layerId: value.layerId, locked: value.locked, name: value.name.trim(), storyId, type: "circle" };
}

function readArcObject(value: unknown, supportsStories: boolean, fallbackStoryId: string): ArcObject | null {
  if (!isRecord(value) || value.type !== "arc" || !isRecord(value.center)) return null;
  if (
    typeof value.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.id) ||
    typeof value.name !== "string" || !value.name.trim() || value.name.trim().length > 120 ||
    typeof value.layerId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.layerId) ||
    typeof value.locked !== "boolean" || typeof value.counterclockwise !== "boolean" ||
    !isFiniteNumber(value.center.x) || !isFiniteNumber(value.center.y) || !isFiniteNumber(value.center.z) ||
    !isFiniteNumber(value.radius) || !isFiniteNumber(value.startAngle) || !isFiniteNumber(value.endAngle)
  ) return null;
  const geometry = {
    center: { x: value.center.x, y: value.center.y, z: value.center.z },
    radius: value.radius,
    startAngle: value.startAngle,
    endAngle: value.endAngle,
    counterclockwise: value.counterclockwise,
  };
  const storyId = readStoryId(value, supportsStories, fallbackStoryId);
  if (!storyId) return null;
  if (!arcGeometryIsValid(geometry)) return null;
  return { ...geometry, id: value.id, layerId: value.layerId, locked: value.locked, name: value.name.trim(), storyId, type: "arc" };
}

export function createProjectDocument({
  createdAt,
  document,
  name,
  updatedAt,
}: {
  createdAt: string;
  document: ModelDocument;
  name: string;
  updatedAt: string;
}): ModelBuilderProject {
  return {
    activeLayerId: document.activeLayerId,
    arcs: cloneDocument(document).arcs,
    building: cloneBuildingStructure(document.building),
    circles: cloneDocument(document).circles,
    createdAt,
    format: PROJECT_FILE_FORMAT,
    groups: cloneDocument(document).groups,
    layers: cloneDocument(document).layers,
    lines: cloneDocument(document).lines,
    name: name.trim() || "Untitled Model",
    objects: cloneDocument(document).objects,
    polylines: cloneDocument(document).polylines,
    units: {
      display: "us-architectural",
      internal: "inch",
      precision: "1/16-inch",
    },
    updatedAt,
    version: PROJECT_FILE_VERSION,
  };
}

export function serializeProjectDocument(project: ModelBuilderProject): string {
  return `${JSON.stringify(project, null, 2)}\n`;
}

export function parseProjectDocument(content: string): ProjectParseResult {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    return { ok: false, error: "This file does not contain valid Model Builder data." };
  }

  if (!isRecord(value) || value.format !== PROJECT_FILE_FORMAT) {
    return { ok: false, error: "This is not a Model Builder project file." };
  }
  if (typeof value.version !== "number" || !Number.isInteger(value.version) || value.version < 1 || value.version > PROJECT_FILE_VERSION) {
    return {
      ok: false,
      error: typeof value.version === "number" && value.version > PROJECT_FILE_VERSION
        ? "This project was created by a newer version of Model Builder."
        : "This project file version is not supported.",
    };
  }
  const version = value.version;
  if (
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.trim().length > 120
  ) {
    return { ok: false, error: "The project name is missing or invalid." };
  }
  if (!isIsoDate(value.createdAt) || !isIsoDate(value.updatedAt)) {
    return { ok: false, error: "The project dates are missing or invalid." };
  }
  if (!isRecord(value.units)) {
    return { ok: false, error: "The project units are missing." };
  }
  if (
    value.units.display !== "us-architectural" ||
    value.units.internal !== "inch" ||
    value.units.precision !== "1/16-inch"
  ) {
    return { ok: false, error: "This project's measurement format is not supported." };
  }

  let building = createDefaultBuildingStructure();
  if (version >= 13) {
    const parsedBuilding = readBuildingStructure(value.building, version >= 15, version >= 16, version >= 17, version >= 19);
    if (!parsedBuilding) return { ok: false, error: "The project Story and assembly configuration is missing or invalid." };
    building = parsedBuilding;
  }
  const storyIds = new Set(building.stories.map((story) => story.id));
  const fallbackStoryId = building.anchorStoryId;
  if (
    !Array.isArray(value.objects) ||
    value.objects.length > MAXIMUM_OBJECT_COUNT ||
    (version === 1 && value.objects.length !== 1)
  ) {
    return {
      ok: false,
      error: version === 1
        ? "This legacy project must contain exactly one box."
        : `A project cannot contain more than ${MAXIMUM_OBJECT_COUNT} boxes.`,
    };
  }

  let layers: ModelLayer[];
  let activeLayerId: string;
  if (version >= 3) {
    if (
      !Array.isArray(value.layers) ||
      value.layers.length < 1 ||
      value.layers.length > MAXIMUM_LAYER_COUNT ||
      typeof value.activeLayerId !== "string"
    ) {
      return { ok: false, error: "The project layer configuration is missing or invalid." };
    }
    const parsedLayers = value.layers.map(readLayer);
    if (parsedLayers.some((layer) => layer === null)) {
      return { ok: false, error: "One or more project layers are invalid." };
    }
    layers = parsedLayers as ModelLayer[];
    if (
      new Set(layers.map((layer) => layer.id)).size !== layers.length ||
      new Set(layers.map((layer) => layer.name.toLowerCase())).size !== layers.length
    ) {
      return { ok: false, error: "Project layer identifiers and names must be unique." };
    }
    activeLayerId = value.activeLayerId;
    const activeLayer = layers.find((layer) => layer.id === activeLayerId);
    if (!activeLayer || !activeLayer.visible || activeLayer.locked) {
      return { ok: false, error: "The active project layer must be visible and unlocked." };
    }
  } else {
    layers = [{ ...DEFAULT_LAYER }];
    activeLayerId = DEFAULT_LAYER_ID;
  }

  let groups: ModelGroup[] = [];
  if (version >= 4) {
    if (!Array.isArray(value.groups) || value.groups.length > MAXIMUM_GROUP_COUNT) {
      return { ok: false, error: "The project group configuration is missing or invalid." };
    }
    const parsedGroups = value.groups.map(readGroup);
    if (parsedGroups.some((group) => group === null)) {
      return { ok: false, error: "One or more project groups are invalid." };
    }
    groups = parsedGroups as ModelGroup[];
    if (
      new Set(groups.map((group) => group.id)).size !== groups.length ||
      new Set(groups.map((group) => group.name.toLowerCase())).size !== groups.length
    ) {
      return { ok: false, error: "Project group identifiers and names must be unique." };
    }
  }

  const objects = value.objects.map((object) =>
    readBoxObject(object, version >= 3 ? null : DEFAULT_LAYER_ID, version >= 4, version >= 5, version >= 14, fallbackStoryId),
  );
  if (objects.some((object) => object === null)) {
    return { ok: false, error: "One or more boxes in this project are invalid." };
  }
  const validObjects = objects as BoxObject[];
  const layerIds = new Set(layers.map((layer) => layer.id));
  if (validObjects.some((object) => !layerIds.has(object.layerId))) {
    return { ok: false, error: "One or more boxes reference a missing layer." };
  }
  if (validObjects.some((object) => !storyIds.has(object.storyId))) {
    return { ok: false, error: "One or more boxes reference a missing Story." };
  }
  const groupIds = new Set(groups.map((group) => group.id));
  if (validObjects.some((object) => object.groupId && !groupIds.has(object.groupId))) {
    return { ok: false, error: "One or more boxes reference a missing group." };
  }
  if (groups.some((group) => validObjects.filter((object) => object.groupId === group.id).length < 2)) {
    return { ok: false, error: "Every project group must contain at least two boxes." };
  }
  if (new Set(validObjects.map((object) => object.id)).size !== validObjects.length) {
    return { ok: false, error: "Project box identifiers must be unique." };
  }
  if (
    new Set(validObjects.map((object) => object.name.toLowerCase())).size !==
    validObjects.length
  ) {
    return { ok: false, error: "Project box names must be unique." };
  }

  let lines: LineObject[] = [];
  if (version >= 6) {
    if (!Array.isArray(value.lines) || value.lines.length > MAXIMUM_LINE_COUNT) {
      return { ok: false, error: "The project line collection is missing or invalid." };
    }
    const parsedLines = value.lines.map((line) => readLineObject(line, version >= 8, version >= 14, fallbackStoryId, version >= 15, version >= 18));
    if (parsedLines.some((line) => line === null)) {
      return { ok: false, error: "One or more drawing lines are invalid." };
    }
    lines = parsedLines as LineObject[];
    if (new Set(lines.map((line) => line.id)).size !== lines.length ||
        new Set(lines.map((line) => line.name.toLowerCase())).size !== lines.length) {
      return { ok: false, error: "Drawing line identifiers and names must be unique." };
    }
    if (lines.some((line) => !layerIds.has(line.layerId))) {
      return { ok: false, error: "One or more drawing lines reference a missing layer." };
    }
    if (lines.some((line) => !storyIds.has(line.storyId))) return { ok: false, error: "One or more drawing lines reference a missing Story." };
    const wallTypeIds = new Set(building.wallTypes.map((wallType) => wallType.id));
    if (lines.some((line) => line.wallTypeId !== null && !wallTypeIds.has(line.wallTypeId))) return { ok: false, error: "One or more Walls reference a missing Wall Type." };
    const allIds = [...validObjects.map((object) => object.id), ...lines.map((line) => line.id)];
    const allNames = [...validObjects.map((object) => object.name.toLowerCase()), ...lines.map((line) => line.name.toLowerCase())];
    if (new Set(allIds).size !== allIds.length || new Set(allNames).size !== allNames.length) {
      return { ok: false, error: "Project entity identifiers and names must be unique." };
    }
  }

  let polylines: PolylineObject[] = [];
  if (version >= 7) {
    if (!Array.isArray(value.polylines) || value.polylines.length > MAXIMUM_POLYLINE_COUNT) {
      return { ok: false, error: "The project polyline collection is missing or invalid." };
    }
    const parsedPolylines = value.polylines.map((polyline) => readPolylineObject(polyline, version >= 9, version >= 12, version >= 14, fallbackStoryId));
    if (parsedPolylines.some((polyline) => polyline === null)) return { ok: false, error: "One or more drawing polylines are invalid." };
    polylines = parsedPolylines as PolylineObject[];
    if (new Set(polylines.map((polyline) => polyline.id)).size !== polylines.length ||
        new Set(polylines.map((polyline) => polyline.name.toLowerCase())).size !== polylines.length ||
        polylines.some((polyline) => !layerIds.has(polyline.layerId))) {
      return { ok: false, error: "Drawing polyline identities, names, or layers are invalid." };
    }
    if (polylines.some((polyline) => !storyIds.has(polyline.storyId))) return { ok: false, error: "One or more drawing polylines reference a missing Story." };
    const allIds = [...validObjects.map((object) => object.id), ...lines.map((line) => line.id), ...polylines.map((polyline) => polyline.id)];
    const allNames = [...validObjects.map((object) => object.name.toLowerCase()), ...lines.map((line) => line.name.toLowerCase()), ...polylines.map((polyline) => polyline.name.toLowerCase())];
    if (new Set(allIds).size !== allIds.length || new Set(allNames).size !== allNames.length) return { ok: false, error: "Project entity identifiers and names must be unique." };
  }

  let circles: CircleObject[] = [];
  if (version >= 10) {
    if (!Array.isArray(value.circles) || value.circles.length > MAXIMUM_CIRCLE_COUNT) {
      return { ok: false, error: "The project circle collection is missing or invalid." };
    }
    const parsedCircles = value.circles.map((circle) => readCircleObject(circle, version >= 14, fallbackStoryId));
    if (parsedCircles.some((circle) => circle === null)) return { ok: false, error: "One or more drawing circles are invalid." };
    circles = parsedCircles as CircleObject[];
    if (new Set(circles.map((circle) => circle.id)).size !== circles.length ||
        new Set(circles.map((circle) => circle.name.toLowerCase())).size !== circles.length ||
        circles.some((circle) => !layerIds.has(circle.layerId))) {
      return { ok: false, error: "Drawing circle identities, names, or layers are invalid." };
    }
    if (circles.some((circle) => !storyIds.has(circle.storyId))) return { ok: false, error: "One or more drawing circles reference a missing Story." };
  }

  let arcs: ArcObject[] = [];
  if (version >= 11) {
    if (!Array.isArray(value.arcs) || value.arcs.length > MAXIMUM_ARC_COUNT) {
      return { ok: false, error: "The project arc collection is missing or invalid." };
    }
    const parsedArcs = value.arcs.map((arc) => readArcObject(arc, version >= 14, fallbackStoryId));
    if (parsedArcs.some((arc) => arc === null)) return { ok: false, error: "One or more drawing arcs are invalid." };
    arcs = parsedArcs as ArcObject[];
    if (new Set(arcs.map((arc) => arc.id)).size !== arcs.length ||
        new Set(arcs.map((arc) => arc.name.toLowerCase())).size !== arcs.length ||
        arcs.some((arc) => !layerIds.has(arc.layerId))) {
      return { ok: false, error: "Drawing arc identities, names, or layers are invalid." };
    }
    if (arcs.some((arc) => !storyIds.has(arc.storyId))) return { ok: false, error: "One or more drawing arcs reference a missing Story." };
  }
  const allEntityIds = [...validObjects.map((object) => object.id), ...lines.map((line) => line.id), ...polylines.map((polyline) => polyline.id), ...circles.map((circle) => circle.id), ...arcs.map((arc) => arc.id)];
  const allEntityNames = [...validObjects.map((object) => object.name.toLowerCase()), ...lines.map((line) => line.name.toLowerCase()), ...polylines.map((polyline) => polyline.name.toLowerCase()), ...circles.map((circle) => circle.name.toLowerCase()), ...arcs.map((arc) => arc.name.toLowerCase())];
  if (new Set(allEntityIds).size !== allEntityIds.length || new Set(allEntityNames).size !== allEntityNames.length) return { ok: false, error: "Project entity identifiers and names must be unique." };

  return {
    ok: true,
    project: createProjectDocument({
      createdAt: value.createdAt,
      document: { activeLayerId, arcs, building, circles, groups, layers, lines, objects: validObjects, polylines },
      name: value.name,
      updatedAt: value.updatedAt,
    }),
  };
}

export function projectToDocument(project: ModelBuilderProject): ModelDocument {
  return {
    activeLayerId: project.activeLayerId,
    arcs: project.arcs.map(cloneArcObject),
    building: cloneBuildingStructure(project.building),
    circles: project.circles.map(cloneCircleObject),
    groups: project.groups.map(cloneGroup),
    layers: project.layers.map(cloneLayer),
    lines: project.lines.map(cloneLineObject),
    objects: project.objects.map(cloneBoxObject),
    polylines: project.polylines.map(clonePolylineObject),
  };
}

export function projectToBoxModel(project: ModelBuilderProject): BoxModel {
  const first = project.objects[0];
  return { dimensions: { ...first.dimensions }, position: { ...first.position }, rotationZ: first.rotationZ };
}

export function projectFilename(name: string): string {
  const withoutControlCharacters = Array.from(name, (character) =>
    character.charCodeAt(0) < 32 ? " " : character,
  ).join("");
  const sanitized = withoutControlCharacters
    .replace(/[<>:"/\\|?*]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 100);
  return `${sanitized || "Untitled Model"}${PROJECT_FILE_EXTENSION}`;
}
