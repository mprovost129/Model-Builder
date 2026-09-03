import {
  arcGeometriesEqual,
  arcGeometryIsValid,
  arcPointAtFraction,
  cloneArcGeometry,
  moveArcGrip,
  type ArcGeometry,
  type ArcGrip,
} from "./cad-arc.ts";
import {
  boxWorldBounds,
  boxWorldPoint,
  boxModelsEqual,
  cloneBoxModel,
  DEFAULT_BOX_MODEL,
  MAXIMUM_COORDINATE,
  MINIMUM_DIMENSION,
  normalizeRotationZ,
  rotateBoxModel,
  ROTATION_BASE_DEFINITIONS,
  rotationBasePoint,
  type BoxModel,
  type AxisKey,
  type RotationBaseKey,
} from "./box-model.ts";
import {
  cloneLineGeometry,
  lineGeometryIsValid,
  lineGeometriesEqual,
  moveLineGrip,
  type LineGeometry,
  type LinePoint,
} from "./cad-line.ts";
import type { PlanPoint } from "./cad-line.ts";
import {
  offsetArcGeometry,
  offsetCircleGeometry,
  offsetLineGeometry,
  offsetPolylineGeometry,
} from "./cad-offset.ts";
import {
  circleGeometriesEqual,
  circleGeometryIsValid,
  cloneCircleGeometry,
  moveCircleGrip,
  type CircleGeometry,
  type CircleGrip,
} from "./cad-circle.ts";
import {
  clonePolylineGeometry,
  moveRectangleGrip,
  polylineArea,
  polylineCentroid,
  polylineGeometriesEqual,
  polylineGeometryIsValid,
  polylinePathPoints,
  polylineSegmentCircularGeometry,
  polylineSegments,
  rectangleFromCorners,
  updatePolylineVertex,
  type PolylineGeometry,
  type RectangleGrip,
} from "./cad-polyline.ts";
import {
  extendArcGeometry,
  extendLineGeometry,
  extendPolylineGeometry,
  trimArcGeometry,
  trimCircleGeometry,
  trimLineGeometry,
  trimPolylineGeometry,
  type TrimExtendBoundary,
} from "./cad-trim-extend.ts";
import {
  stretchLineGeometry,
  stretchPolylineGeometry,
  type CadStretchTarget,
} from "./cad-stretch.ts";
import { chamferLineGeometries } from "./cad-chamfer.ts";
import { filletCurveGeometries, filletLineGeometries, type FilletCurveGeometry } from "./cad-fillet.ts";
import { chamferPolylineCorners, filletPolylineCorners } from "./cad-polyline-corners.ts";
import {
  breakArcAtPointGeometry,
  breakArcGeometry,
  breakCircleGeometry,
  breakLineAtPointGeometry,
  breakLineGeometry,
  breakPolylineAtPointGeometry,
  breakPolylineGeometry,
} from "./cad-break.ts";
import { joinCurveGeometries, type JoinCurveGeometry } from "./cad-join.ts";
import { explodePolylineGeometry } from "./cad-explode.ts";
import {
  lengthenArcGeometry,
  lengthenLineGeometry,
  lengthenPolylineGeometry,
  type LengthenEndpoint,
  type LengthenRequest,
} from "./cad-lengthen.ts";
import {
  discoverBoundaryAtPoint,
  discoverBoundedFaces,
  type BoundaryDiscoveryResult,
  type BoundarySource,
} from "./cad-boundary.ts";
import { snapToSixteenth } from "./architectural-units.ts";
import {
  buildingStructureIsValid,
  buildingStructuresEqual,
  assemblyTotalThickness,
  calculateStoryElevations,
  cloneBuildingStructure,
  cloneLayeredAssembly,
  createDefaultBuildingStructure,
  resolveWallHeaderType,
  wallHeaderTypeRequiredMainThickness,
  wallLayerGroupThickness,
  wallOpeningTypeIsValid,
  wallReferenceDistanceFromExterior,
  MAXIMUM_WALL_JOIN_PRIORITY,
  MINIMUM_WALL_JOIN_PRIORITY,
  MINIMUM_ROUGH_CEILING_HEIGHT,
  MAXIMUM_ROUGH_CEILING_HEIGHT,
  layeredAssemblyIsValid,
  WALL_EXTERIOR_SIDES,
  WALL_JOIN_MODES,
  WALL_REFERENCE_LINES,
  type BuildingStructure,
  type BuildingStory,
  type FoundationWallType,
  type LayeredAssembly,
  type OpeningAssemblyComponent,
  type OpeningComponentDepthAnchor,
  type ProductObjectType,
  type WallOpeningKind,
  type WallOpeningType,
  type WallExteriorSide,
  type WallJoinMode,
  type WallReferenceLine,
} from "./building-stories.ts";
import {
  DEFAULT_LAYER_ID,
  DEFAULT_LAYER_SET_ID,
  DEFAULT_SAVED_PLAN_VIEW_ID,
  ROOM_ANNOTATION_KINDS,
  STANDARD_LAYER_IDS,
  createDefaultLayerSet,
  createDefaultLayers,
  createDefaultSavedPlanView,
  layerSetStateFromLayer,
  type LayerSet,
  type ModelLayer,
  type ModelLineStyle,
  type ModelObjectCategory,
  type RoomAnnotationKind,
  type RoomAnnotationObject,
  type RoomType,
  type SavedPlanView,
} from "../features/project-presentation.ts";

export {
  DEFAULT_LAYER_ID,
  DEFAULT_LAYER_SET_ID,
  DEFAULT_SAVED_PLAN_VIEW_ID,
  ROOM_ANNOTATION_KINDS,
  ROOM_TYPES,
  STANDARD_LAYER_IDS,
  STANDARD_LAYERS,
} from "../features/project-presentation.ts";
export type { LayerSet, ModelLayer, ModelLineStyle, ModelObjectCategory, RoomAnnotationKind, RoomAnnotationObject, RoomType, SavedPlanView } from "../features/project-presentation.ts";

export type BoxObject = BoxModel & {
  groupId: string | null;
  id: string;
  layerId: string;
  locked: boolean;
  name: string;
  /** Reusable non-hosted product Type; null denotes a freeform native box. */
  productObjectTypeId: string | null;
  storyId: string;
  type: "box";
};

export type { WallOpeningKind } from "./building-stories.ts";

export type OpeningComponentOverride = {
  componentId: string;
  depth?: number;
  depthAnchor?: OpeningComponentDepthAnchor;
  depthOffset?: number;
  divisionCount?: number;
  inset?: number;
  material?: string;
  profileWidth?: number;
  visible?: boolean;
};

export type WallOpening = {
  /** Distance from the Wall start point to the center of the rough opening. */
  centerOffset: number;
  /** Instance parameters keyed to stable components in the reusable Type. */
  componentOverrides: OpeningComponentOverride[];
  /** Bottom of the structural header above the Story rough floor/subfloor. */
  headerBottomHeight: number;
  /** Null uses the component or host Wall default; otherwise overrides the resolved assembly. */
  headerTypeIdOverride: string | null;
  id: string;
  kind: WallOpeningKind;
  layerId: string;
  name: string;
  roughHeight: number;
  roughWidth: number;
  unitHeight: number;
  unitWidth: number;
  /** Reusable component definition. Null is retained only for upgraded legacy custom openings. */
  wallOpeningTypeId: string | null;
};

export type LineObject = LineGeometry & {
  architecturalRole: "foundation-wall" | "wall" | null;
  /** Saved Foundation Wall that physically supports this framed Wall. */
  foundationSupportWallId: string | null;
  foundationWallTypeId: string | null;
  id: string;
  layerId: string;
  locked: boolean;
  name: string;
  storyId: string;
  type: "line";
  wallExteriorSide: WallExteriorSide | null;
  wallJoinPriority: number | null;
  wallStartJoinMode: WallJoinMode | null;
  wallEndJoinMode: WallJoinMode | null;
  wallReferenceLine: WallReferenceLine | null;
  wallTypeId: string | null;
  wallOpenings: WallOpening[];
};

export type PolylineObject = PolylineGeometry & {
  architecturalRole: "floor-platform" | null;
  id: string;
  layerId: string;
  locked: boolean;
  name: string;
  shape: "polyline" | "rectangle";
  storyId: string;
  type: "polyline";
};

export type CircleObject = CircleGeometry & {
  id: string;
  layerId: string;
  locked: boolean;
  name: string;
  storyId: string;
  type: "circle";
};

export type ArcObject = ArcGeometry & {
  id: string;
  layerId: string;
  locked: boolean;
  name: string;
  storyId: string;
  type: "arc";
};

export type RoomObject = {
  boundary: PolylineGeometry;
  boundaryWallIds: string[];
  ceilingFinishOverride: LayeredAssembly | null;
  ceilingStructureOverride: LayeredAssembly | null;
  floorFinishOverride: LayeredAssembly | null;
  floorStructureOverride: LayeredAssembly | null;
  id: string;
  layerId: string;
  name: string;
  platformOpenings: PlatformOpening[];
  /** Local offset above or below the Story rough floor/subfloor. */
  roughFloorOffset: number;
  roughCeilingHeightOverride: number | null;
  roomType: RoomType;
  storyId: string;
};

export const PLATFORM_OPENING_KINDS = ["stairwell", "shaft", "open-below"] as const;
export type PlatformOpeningKind = (typeof PLATFORM_OPENING_KINDS)[number];
export const PLATFORM_OPENING_CUTS = ["floor", "ceiling", "both"] as const;
export type PlatformOpeningCuts = (typeof PLATFORM_OPENING_CUTS)[number];

export type PlatformOpening = {
  boundary: PolylineGeometry;
  cuts: PlatformOpeningCuts;
  id: string;
  kind: PlatformOpeningKind;
  name: string;
  /** Shared identity for one aligned opening path through adjacent Stories. */
  verticalOpeningId: string | null;
};

export type PlatformOpeningContinuationDirection = "above" | "below";

export type PlatformOpeningContinuation = {
  openingId: string;
  roomId: string;
  storyId: string;
  storyName: string;
};

export type EffectiveRoomSettings = {
  ceilingFinish: LayeredAssembly;
  ceilingStructure: LayeredAssembly;
  floorFinish: LayeredAssembly;
  floorStructure: LayeredAssembly;
  roughCeilingHeight: number;
  roughFloorElevation: number;
};

export type RoomHorizontalPlatformSolution = EffectiveRoomSettings & {
  boundary: PolylineGeometry;
  ceilingOpeningBoundaries: PolylineGeometry[];
  ceilingStructureBottomElevation: number;
  finishedCeilingElevation: number;
  finishedFloorElevation: number;
  floorBoundary: PolylineGeometry;
  floorEdgeConditions: RoomFloorEdgeCondition[];
  floorOpeningBoundaries: PolylineGeometry[];
  platformOpenings: PlatformOpening[];
  roomId: string;
  roughCeilingElevation: number;
  storyId: string;
};

export type RoomFloorEdgeCondition = {
  adjacentRoomCount: number;
  /** Signed distance from the Wall reference line along its left-hand normal. */
  offsetFromReference: number;
  rule: "foundation-sill-exterior" | "perimeter-main-exterior" | "room-boundary-fallback" | "shared-wall-reference";
  wallId: string | null;
};

export type FoundationWallVerticalExtent = {
  baseElevation: number;
  footingBottomElevation: number;
  footingTopElevation: number;
  sillTopElevation: number;
  topElevation: number;
};

export type WallVerticalExtent = {
  adjacentRoomIds: string[];
  baseElevation: number;
  hasDifferentRoomCeilings: boolean;
  hasDifferentRoomFloors: boolean;
  height: number;
  source: "rooms" | "story";
  topElevation: number;
};

export type ModelGroup = {
  id: string;
  name: string;
};

export type ModelDocument = {
  activeLayerSetId: string;
  activeLayerId: string;
  activeSavedPlanViewId: string;
  arcs: ArcObject[];
  building: BuildingStructure;
  circles: CircleObject[];
  groups: ModelGroup[];
  layers: ModelLayer[];
  layerSets: LayerSet[];
  lines: LineObject[];
  objects: BoxObject[];
  polylines: PolylineObject[];
  rooms: RoomObject[];
  roomAnnotations: RoomAnnotationObject[];
  savedPlanViews: SavedPlanView[];
};

export type ModelEntityKind = "arc" | "box" | "circle" | "line" | "polyline";
export type ModelEntityRef = { id: string; kind: ModelEntityKind };

export type AlignmentMode = "minimum" | "center" | "maximum";

export const MAXIMUM_OBJECT_COUNT = 100;
export const MAXIMUM_LINE_COUNT = 2000;
export const MAXIMUM_WALL_OPENING_COUNT = 64;
export const MAXIMUM_POLYLINE_COUNT = 1000;
export const MAXIMUM_CIRCLE_COUNT = 1000;
export const MAXIMUM_ARC_COUNT = 1000;
export const MAXIMUM_LAYER_COUNT = 64;
export const MAXIMUM_GROUP_COUNT = 64;
export const MAXIMUM_ROOM_COUNT = 1000;
export const MAXIMUM_PLATFORM_OPENING_COUNT = 64;
export const DEFAULT_LAYER: ModelLayer = createDefaultLayers()[0];

const LAYER_COLORS = [
  "#6ea8d9",
  "#75be8f",
  "#d6a85e",
  "#c98585",
  "#9d89cf",
  "#68b8b1",
  "#bd8db6",
  "#aab16d",
];

export const DEFAULT_DOCUMENT: ModelDocument = {
  activeLayerSetId: DEFAULT_LAYER_SET_ID,
  activeLayerId: DEFAULT_LAYER_ID,
  activeSavedPlanViewId: DEFAULT_SAVED_PLAN_VIEW_ID,
  arcs: [],
  building: createDefaultBuildingStructure(),
  circles: [],
  groups: [],
  layers: createDefaultLayers(),
  layerSets: [createDefaultLayerSet(createDefaultLayers())],
  lines: [],
  objects: [
    {
      ...cloneBoxModel(DEFAULT_BOX_MODEL),
      groupId: null,
      id: "box-01",
      layerId: DEFAULT_LAYER_ID,
      locked: false,
      name: "Box 01",
      productObjectTypeId: null,
      storyId: "story-01",
      type: "box",
    },
  ],
  polylines: [],
  rooms: [],
  roomAnnotations: [],
  savedPlanViews: [createDefaultSavedPlanView("story-01")],
};

/** A new user project keeps editable project defaults but starts with no model entities. */
export const NEW_PROJECT_DOCUMENT: ModelDocument = {
  activeLayerSetId: DEFAULT_LAYER_SET_ID,
  activeLayerId: DEFAULT_LAYER_ID,
  activeSavedPlanViewId: DEFAULT_SAVED_PLAN_VIEW_ID,
  arcs: [],
  building: createDefaultBuildingStructure(),
  circles: [],
  groups: [],
  layers: createDefaultLayers(),
  layerSets: [createDefaultLayerSet(createDefaultLayers())],
  lines: [],
  objects: [],
  polylines: [],
  rooms: [],
  roomAnnotations: [],
  savedPlanViews: [createDefaultSavedPlanView("story-01")],
};

export function cloneArcObject(arc: ArcObject): ArcObject {
  return {
    ...cloneArcGeometry(arc),
    id: arc.id,
    layerId: arc.layerId,
    locked: arc.locked,
    name: arc.name,
    storyId: arc.storyId,
    type: "arc",
  };
}

export function cloneCircleObject(circle: CircleObject): CircleObject {
  return {
    ...cloneCircleGeometry(circle),
    id: circle.id,
    layerId: circle.layerId,
    locked: circle.locked,
    name: circle.name,
    storyId: circle.storyId,
    type: "circle",
  };
}

export function cloneLineObject(line: LineObject): LineObject {
  return {
    ...cloneLineGeometry(line),
    architecturalRole: line.architecturalRole,
    foundationSupportWallId: line.foundationSupportWallId,
    foundationWallTypeId: line.foundationWallTypeId,
    id: line.id,
    layerId: line.layerId,
    locked: line.locked,
    name: line.name,
    storyId: line.storyId,
    type: "line",
    wallExteriorSide: line.wallExteriorSide,
    wallJoinPriority: line.wallJoinPriority,
    wallStartJoinMode: line.wallStartJoinMode,
    wallEndJoinMode: line.wallEndJoinMode,
    wallReferenceLine: line.wallReferenceLine,
    wallTypeId: line.wallTypeId,
    wallOpenings: line.wallOpenings.map((opening) => ({ ...opening, componentOverrides: opening.componentOverrides.map((override) => ({ ...override })) })),
  };
}

export function wallOpeningRoughBottom(opening: WallOpening): number {
  return opening.kind === "door" ? 0 : opening.headerBottomHeight - opening.roughHeight;
}

function openingDimensionIsValid(value: number, allowZero = false): boolean {
  return Number.isFinite(value) && value >= (allowZero ? 0 : 1 / 16) && value <= 600 && Math.abs(value * 16 - Math.round(value * 16)) < 1e-8;
}

function openingComponentOverrideIsValid(override: OpeningComponentOverride): boolean {
  const signedDimensions = [override.inset].filter((value): value is number => value !== undefined);
  const nonnegativeDimensions = [override.depthOffset].filter((value): value is number => value !== undefined);
  const positiveDimensions = [override.depth, override.profileWidth].filter((value): value is number => value !== undefined);
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(override.componentId) &&
    (override.material === undefined || (override.material.trim().length > 0 && override.material.trim().length <= 120)) &&
    (override.visible === undefined || typeof override.visible === "boolean") &&
    (override.depthAnchor === undefined || ["exterior", "center", "interior"].includes(override.depthAnchor)) &&
    (override.divisionCount === undefined || (Number.isInteger(override.divisionCount) && override.divisionCount >= 1 && override.divisionCount <= 8)) &&
    signedDimensions.every((value) => Number.isFinite(value) && Math.abs(value) <= 48 && Math.abs(value * 16 - Math.round(value * 16)) < 1e-8) &&
    nonnegativeDimensions.every((value) => openingDimensionIsValid(value, true)) &&
    positiveDimensions.every((value) => openingDimensionIsValid(value));
}

export function resolveOpeningComponents(type: WallOpeningType, overrides: readonly OpeningComponentOverride[]): OpeningAssemblyComponent[] | null {
  const overrideIds = new Set<string>();
  const componentsById = new Map(type.components.map((component) => [component.id, component]));
  for (const override of overrides) {
    if (!openingComponentOverrideIsValid(override) || overrideIds.has(override.componentId) || !componentsById.has(override.componentId)) return null;
    overrideIds.add(override.componentId);
  }
  const overridesById = new Map(overrides.map((override) => [override.componentId, override]));
  const components = type.components.map((component) => {
    const override = overridesById.get(component.id);
    if (!override) return { ...component };
    const fields = { ...override } as Partial<OpeningAssemblyComponent> & { componentId?: string };
    delete fields.componentId;
    return { ...component, ...fields, id: component.id };
  });
  return wallOpeningTypeIsValid({ ...type, components }) ? components : null;
}

export function wallOpeningsAreValid(line: LineObject, roughCeilingHeight: number): boolean {
  if (!Array.isArray(line.wallOpenings) || line.wallOpenings.length > MAXIMUM_WALL_OPENING_COUNT) return false;
  if (line.architecturalRole !== "wall") return line.wallOpenings.length === 0;
  const length = Math.hypot(line.end.x - line.start.x, line.end.y - line.start.y);
  const ids = new Set<string>();
  const names = new Set<string>();
  const intervals: Array<{ end: number; start: number }> = [];
  for (const opening of line.wallOpenings) {
    if (
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(opening.id) ||
      ids.has(opening.id) ||
      !opening.name.trim() ||
      opening.name.trim().length > 120 ||
      names.has(opening.name.trim().toLowerCase()) ||
      (opening.kind !== "door" && opening.kind !== "window") ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(opening.layerId) ||
      !Array.isArray(opening.componentOverrides) || opening.componentOverrides.length > 48 || opening.componentOverrides.some((override) => !openingComponentOverrideIsValid(override)) || new Set(opening.componentOverrides.map((override) => override.componentId)).size !== opening.componentOverrides.length ||
      (opening.headerTypeIdOverride !== null && !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(opening.headerTypeIdOverride)) ||
      (opening.wallOpeningTypeId !== null && !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(opening.wallOpeningTypeId)) ||
      !Number.isFinite(opening.centerOffset) || opening.centerOffset < 0 || opening.centerOffset > MAXIMUM_COORDINATE || Math.abs(opening.centerOffset * 16 - Math.round(opening.centerOffset * 16)) >= 1e-8 ||
      !openingDimensionIsValid(opening.unitWidth) ||
      !openingDimensionIsValid(opening.unitHeight) ||
      !openingDimensionIsValid(opening.roughWidth) ||
      !openingDimensionIsValid(opening.roughHeight) ||
      !openingDimensionIsValid(opening.headerBottomHeight) ||
      opening.unitWidth > opening.roughWidth ||
      opening.unitHeight > opening.roughHeight ||
      (opening.kind === "door" && opening.headerBottomHeight !== opening.roughHeight) ||
      wallOpeningRoughBottom(opening) < 0 ||
      opening.headerBottomHeight > roughCeilingHeight
    ) return false;
    const start = opening.centerOffset - opening.roughWidth / 2;
    const end = opening.centerOffset + opening.roughWidth / 2;
    if (start < 0 || end > length) return false;
    ids.add(opening.id);
    names.add(opening.name.trim().toLowerCase());
    intervals.push({ end, start });
  }
  intervals.sort((first, second) => first.start - second.start);
  return intervals.every((interval, index) => index === 0 || interval.start >= intervals[index - 1].end);
}

export function clonePolylineObject(polyline: PolylineObject): PolylineObject {
  return {
    ...clonePolylineGeometry(polyline),
    architecturalRole: polyline.architecturalRole,
    id: polyline.id,
    layerId: polyline.layerId,
    locked: polyline.locked,
    name: polyline.name,
    shape: polyline.shape,
    storyId: polyline.storyId,
    type: "polyline",
  };
}

export function cloneBoxObject(object: BoxObject): BoxObject {
  return {
    ...cloneBoxModel(object),
    groupId: object.groupId,
    id: object.id,
    layerId: object.layerId,
    locked: object.locked,
    name: object.name,
    productObjectTypeId: object.productObjectTypeId,
    storyId: object.storyId,
    type: "box",
  };
}

export function cloneLayer(layer: ModelLayer): ModelLayer {
  return { ...layer };
}

export function cloneLayerSet(layerSet: LayerSet): LayerSet {
  return { id: layerSet.id, layers: layerSet.layers.map((layer) => ({ ...layer })), name: layerSet.name };
}

export function cloneRoomAnnotation(annotation: RoomAnnotationObject): RoomAnnotationObject {
  return { ...annotation, position: { ...annotation.position } };
}

export function cloneSavedPlanView(view: SavedPlanView): SavedPlanView {
  return { ...view };
}

export function cloneGroup(group: ModelGroup): ModelGroup {
  return { ...group };
}

export function clonePlatformOpening(opening: PlatformOpening): PlatformOpening {
  return {
    boundary: clonePolylineGeometry(opening.boundary),
    cuts: opening.cuts,
    id: opening.id,
    kind: opening.kind,
    name: opening.name,
    verticalOpeningId: opening.verticalOpeningId,
  };
}

export function cloneRoomObject(room: RoomObject): RoomObject {
  return {
    boundary: clonePolylineGeometry(room.boundary),
    boundaryWallIds: [...room.boundaryWallIds],
    ceilingFinishOverride: room.ceilingFinishOverride ? cloneLayeredAssembly(room.ceilingFinishOverride) : null,
    ceilingStructureOverride: room.ceilingStructureOverride ? cloneLayeredAssembly(room.ceilingStructureOverride) : null,
    floorFinishOverride: room.floorFinishOverride ? cloneLayeredAssembly(room.floorFinishOverride) : null,
    floorStructureOverride: room.floorStructureOverride ? cloneLayeredAssembly(room.floorStructureOverride) : null,
    id: room.id,
    layerId: room.layerId,
    name: room.name,
    platformOpenings: (room.platformOpenings ?? []).map(clonePlatformOpening),
    roughCeilingHeightOverride: room.roughCeilingHeightOverride,
    roughFloorOffset: room.roughFloorOffset,
    roomType: room.roomType,
    storyId: room.storyId,
  };
}

function roomAnnotationLayerId(kind: RoomAnnotationKind): string {
  if (kind === "area") return STANDARD_LAYER_IDS["room-area"];
  if (kind === "interior-dimensions") return STANDARD_LAYER_IDS["room-interior-dimensions"];
  if (kind === "rough-ceiling-height") return STANDARD_LAYER_IDS["room-ceiling-height"];
  return STANDARD_LAYER_IDS["room-label"];
}

function defaultRoomAnnotations(room: RoomObject): RoomAnnotationObject[] {
  const center = polylineCentroid(room.boundary) ?? room.boundary.vertices[0] ?? { x: 0, y: 0 };
  return ROOM_ANNOTATION_KINDS.map((kind) => ({
    id: `${room.id}-${kind}`,
    kind,
    layerId: roomAnnotationLayerId(kind),
    position: { ...center },
    roomId: room.id,
    storyId: room.storyId,
    visible: true,
  }));
}

export function roomAnnotationIsValid(annotation: RoomAnnotationObject, document: ModelDocument): boolean {
  const room = document.rooms.find((candidate) => candidate.id === annotation.roomId);
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/.test(annotation.id) &&
    ROOM_ANNOTATION_KINDS.includes(annotation.kind) &&
    Boolean(room && room.storyId === annotation.storyId) &&
    document.layers.some((layer) => layer.id === annotation.layerId) &&
    Number.isFinite(annotation.position.x) && Number.isFinite(annotation.position.y) &&
    Math.abs(annotation.position.x) <= MAXIMUM_COORDINATE && Math.abs(annotation.position.y) <= MAXIMUM_COORDINATE &&
    typeof annotation.visible === "boolean";
}

function pointOnPlanSegment(point: PlanPoint, start: PlanPoint, end: PlanPoint, tolerance = 1e-7): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const cross = (point.x - start.x) * dy - (point.y - start.y) * dx;
  if (Math.abs(cross) > tolerance * Math.max(1, Math.hypot(dx, dy))) return false;
  const dot = (point.x - start.x) * dx + (point.y - start.y) * dy;
  return dot >= -tolerance && dot <= dx * dx + dy * dy + tolerance;
}

function pointInsidePolyline(point: PlanPoint, boundary: PolylineGeometry): boolean {
  const path = polylinePathPoints(boundary);
  if (path.length < 3) return false;
  const closed = path[0].x === path.at(-1)?.x && path[0].y === path.at(-1)?.y ? path : [...path, path[0]];
  let inside = false;
  for (let index = 0; index < closed.length - 1; index += 1) {
    const start = closed[index];
    const end = closed[index + 1];
    if (pointOnPlanSegment(point, start, end)) return false;
    const crosses = (start.y > point.y) !== (end.y > point.y) &&
      point.x < (end.x - start.x) * (point.y - start.y) / (end.y - start.y) + start.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function planSegmentsIntersect(firstStart: PlanPoint, firstEnd: PlanPoint, secondStart: PlanPoint, secondEnd: PlanPoint): boolean {
  const orient = (a: PlanPoint, b: PlanPoint, c: PlanPoint) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const firstA = orient(firstStart, firstEnd, secondStart);
  const firstB = orient(firstStart, firstEnd, secondEnd);
  const secondA = orient(secondStart, secondEnd, firstStart);
  const secondB = orient(secondStart, secondEnd, firstEnd);
  const tolerance = 1e-7;
  if (((firstA > tolerance && firstB < -tolerance) || (firstA < -tolerance && firstB > tolerance)) &&
      ((secondA > tolerance && secondB < -tolerance) || (secondA < -tolerance && secondB > tolerance))) return true;
  return Math.abs(firstA) <= tolerance && pointOnPlanSegment(secondStart, firstStart, firstEnd) ||
    Math.abs(firstB) <= tolerance && pointOnPlanSegment(secondEnd, firstStart, firstEnd) ||
    Math.abs(secondA) <= tolerance && pointOnPlanSegment(firstStart, secondStart, secondEnd) ||
    Math.abs(secondB) <= tolerance && pointOnPlanSegment(firstEnd, secondStart, secondEnd);
}

function polylinePathsIntersect(first: PolylineGeometry, second: PolylineGeometry): boolean {
  const firstPath = polylinePathPoints(first);
  const secondPath = polylinePathPoints(second);
  const close = (path: PlanPoint[]) => path[0].x === path.at(-1)?.x && path[0].y === path.at(-1)?.y ? path : [...path, path[0]];
  const firstClosed = close(firstPath);
  const secondClosed = close(secondPath);
  for (let firstIndex = 0; firstIndex < firstClosed.length - 1; firstIndex += 1) {
    for (let secondIndex = 0; secondIndex < secondClosed.length - 1; secondIndex += 1) {
      if (planSegmentsIntersect(firstClosed[firstIndex], firstClosed[firstIndex + 1], secondClosed[secondIndex], secondClosed[secondIndex + 1])) return true;
    }
  }
  return false;
}

export function platformOpeningIsValid(opening: PlatformOpening, room: RoomObject): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(opening.id) &&
    opening.name.trim().length > 0 && opening.name.trim().length <= 120 &&
    (opening.verticalOpeningId === null || /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(opening.verticalOpeningId)) &&
    PLATFORM_OPENING_KINDS.includes(opening.kind) && PLATFORM_OPENING_CUTS.includes(opening.cuts) &&
    polylineGeometryIsValid(opening.boundary) && opening.boundary.closed && opening.boundary.vertices.length === 4 &&
    (opening.boundary.bulges ?? []).every((bulge) => Math.abs(bulge) < 1e-10) && polylineArea(opening.boundary) > 0 &&
    Math.abs(opening.boundary.elevation - room.boundary.elevation) < 1e-8 &&
    !polylinePathsIntersect(opening.boundary, room.boundary) &&
    polylinePathPoints(opening.boundary).every((point) => pointInsidePolyline(point, room.boundary));
}

function roomAssemblyIsValid(assembly: LayeredAssembly | null, kind: LayeredAssembly["kind"]): boolean {
  return assembly === null || layeredAssemblyIsValid(assembly, kind);
}

export function roomObjectIsValid(room: RoomObject, document: ModelDocument): boolean {
  const wallIds = new Set(document.lines.filter((line) => line.architecturalRole === "wall" && line.storyId === room.storyId).map((line) => line.id));
  const openings = room.platformOpenings ?? [];
  const openingIds = new Set(openings.map((opening) => opening.id));
  const openingNames = new Set(openings.map((opening) => opening.name.trim().toLowerCase()));
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(room.id) &&
    room.name.trim().length > 0 && room.name.trim().length <= 120 &&
    room.roomType.trim().length > 0 && room.roomType.trim().length <= 80 &&
    document.layers.some((layer) => layer.id === room.layerId) &&
    document.building.stories.some((story) => story.id === room.storyId) &&
    polylineGeometryIsValid(room.boundary) && room.boundary.closed && polylineArea(room.boundary) > 0 &&
    room.boundaryWallIds.length >= 3 && new Set(room.boundaryWallIds).size === room.boundaryWallIds.length && room.boundaryWallIds.every((id) => wallIds.has(id)) &&
    Number.isFinite(room.roughFloorOffset) && Math.abs(room.roughFloorOffset) <= MAXIMUM_COORDINATE && Math.abs(room.roughFloorOffset * 16 - Math.round(room.roughFloorOffset * 16)) < 1e-8 &&
    (room.roughCeilingHeightOverride === null ||
      (Number.isFinite(room.roughCeilingHeightOverride) && room.roughCeilingHeightOverride >= MINIMUM_ROUGH_CEILING_HEIGHT && room.roughCeilingHeightOverride <= MAXIMUM_ROUGH_CEILING_HEIGHT && Math.abs(room.roughCeilingHeightOverride * 16 - Math.round(room.roughCeilingHeightOverride * 16)) < 1e-8)) &&
    openings.length <= MAXIMUM_PLATFORM_OPENING_COUNT && openingIds.size === openings.length && openingNames.size === openings.length &&
    openings.every((opening) => platformOpeningIsValid(opening, room)) &&
    openings.every((opening, index) => openings.slice(index + 1).every((other) =>
      !polylinePathsIntersect(opening.boundary, other.boundary) &&
      !pointInsidePolyline(opening.boundary.vertices[0], other.boundary) &&
      !pointInsidePolyline(other.boundary.vertices[0], opening.boundary))) &&
    roomAssemblyIsValid(room.floorStructureOverride, "floor-structure") &&
    roomAssemblyIsValid(room.floorFinishOverride, "floor-finish") &&
    roomAssemblyIsValid(room.ceilingStructureOverride, "ceiling-structure") &&
    roomAssemblyIsValid(room.ceilingFinishOverride, "ceiling-finish");
}

type PlatformOpeningMember = {
  opening: PlatformOpening;
  room: RoomObject;
  storyIndex: number;
};

function platformOpeningCutsFloor(opening: PlatformOpening): boolean {
  return opening.cuts === "floor" || opening.cuts === "both";
}

function platformOpeningCutsCeiling(opening: PlatformOpening): boolean {
  return opening.cuts === "ceiling" || opening.cuts === "both";
}

function platformOpeningBoundaryMatches(first: PolylineGeometry, second: PolylineGeometry): boolean {
  if (first.vertices.length !== second.vertices.length) return false;
  const count = first.vertices.length;
  const matches = (reverse: boolean, shift: number) => first.vertices.every((point, index) => {
    const candidateIndex = reverse
      ? (shift - index + count) % count
      : (index + shift) % count;
    const candidate = second.vertices[candidateIndex];
    return Math.abs(point.x - candidate.x) < 1e-8 && Math.abs(point.y - candidate.y) < 1e-8;
  });
  return Array.from({ length: count }, (_, shift) => shift).some((shift) => matches(false, shift) || matches(true, shift));
}

function platformOpeningMembers(document: ModelDocument): PlatformOpeningMember[] {
  const storyIndices = new Map(document.building.stories.map((story, index) => [story.id, index]));
  return document.rooms.flatMap((room) => room.platformOpenings.map((opening) => ({
    opening,
    room,
    storyIndex: storyIndices.get(room.storyId) ?? -1,
  })));
}

function invalidVerticalOpeningIds(document: ModelDocument): Set<string> {
  const groups = new Map<string, PlatformOpeningMember[]>();
  platformOpeningMembers(document).forEach((member) => {
    if (member.opening.verticalOpeningId === null) return;
    const group = groups.get(member.opening.verticalOpeningId) ?? [];
    group.push(member);
    groups.set(member.opening.verticalOpeningId, group);
  });
  const invalid = new Set<string>();
  groups.forEach((members, id) => {
    const ordered = [...members].sort((first, second) => first.storyIndex - second.storyIndex);
    const reference = ordered[0];
    if (
      ordered.length < 2 ||
      ordered.some((member) => member.storyIndex < 0 || member.opening.kind !== reference.opening.kind || !platformOpeningBoundaryMatches(member.opening.boundary, reference.opening.boundary)) ||
      new Set(ordered.map((member) => member.storyIndex)).size !== ordered.length ||
      ordered.some((member, index) => index > 0 && member.storyIndex !== ordered[index - 1].storyIndex + 1) ||
      ordered.some((member, index) => index > 0 && (!platformOpeningCutsCeiling(ordered[index - 1].opening) || !platformOpeningCutsFloor(member.opening)))
    ) invalid.add(id);
  });
  return invalid;
}

/** Validates saved, aligned opening paths that pass through adjacent Stories. */
export function platformOpeningContinuityIsValid(document: ModelDocument): boolean {
  return invalidVerticalOpeningIds(document).size === 0;
}

function clearInvalidPlatformOpeningContinuity(document: ModelDocument): ModelDocument {
  const invalidIds = invalidVerticalOpeningIds(document);
  if (invalidIds.size === 0) return document;
  const next = cloneDocument(document);
  next.rooms.forEach((room) => room.platformOpenings.forEach((opening) => {
    if (opening.verticalOpeningId !== null && invalidIds.has(opening.verticalOpeningId)) opening.verticalOpeningId = null;
  }));
  return next;
}

/** Reports the immediately adjacent members of one saved vertical opening path. */
export function platformOpeningContinuity(
  document: ModelDocument,
  roomId: string,
  openingId: string,
): { above: PlatformOpeningContinuation | null; below: PlatformOpeningContinuation | null; verticalOpeningId: string | null } | null {
  const source = platformOpeningMembers(document).find((member) => member.room.id === roomId && member.opening.id === openingId);
  if (!source) return null;
  const members = source.opening.verticalOpeningId === null
    ? []
    : platformOpeningMembers(document).filter((member) => member.opening.verticalOpeningId === source.opening.verticalOpeningId);
  const result = (storyIndex: number): PlatformOpeningContinuation | null => {
    const member = members.find((candidate) => candidate.storyIndex === storyIndex);
    const story = member ? document.building.stories[member.storyIndex] : null;
    return member && story ? { openingId: member.opening.id, roomId: member.room.id, storyId: member.room.storyId, storyName: story.name } : null;
  };
  return {
    above: result(source.storyIndex + 1),
    below: result(source.storyIndex - 1),
    verticalOpeningId: source.opening.verticalOpeningId,
  };
}

export function effectiveRoomSettings(
  room: RoomObject,
  story: BuildingStory,
  roughFloorElevation: number,
): EffectiveRoomSettings {
  return {
    ceilingFinish: cloneLayeredAssembly(room.ceilingFinishOverride ?? story.ceilingFinish),
    ceilingStructure: cloneLayeredAssembly(room.ceilingStructureOverride ?? story.ceilingStructure),
    floorFinish: cloneLayeredAssembly(room.floorFinishOverride ?? story.floorFinish),
    floorStructure: cloneLayeredAssembly(room.floorStructureOverride ?? story.floorStructure),
    roughCeilingHeight: room.roughCeilingHeightOverride ?? story.roughCeilingHeight,
    roughFloorElevation: snapToSixteenth(roughFloorElevation + room.roughFloorOffset),
  };
}

type FloorEdgeLine = {
  condition: RoomFloorEdgeCondition;
  direction: PlanPoint;
  point: PlanPoint;
};

function wallForRoomBoundarySegment(
  segment: ReturnType<typeof polylineSegments>[number],
  walls: LineObject[],
): LineObject | null {
  const tolerance = 1e-5;
  const midpoint = { x: (segment.start.x + segment.end.x) / 2, y: (segment.start.y + segment.end.y) / 2 };
  return walls.find((wall) => {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared <= tolerance) return false;
    const cross = (midpoint.x - wall.start.x) * dy - (midpoint.y - wall.start.y) * dx;
    const projection = ((midpoint.x - wall.start.x) * dx + (midpoint.y - wall.start.y) * dy) / lengthSquared;
    return Math.abs(cross) <= tolerance * Math.sqrt(lengthSquared) && projection >= -tolerance && projection <= 1 + tolerance;
  }) ?? null;
}

function foundationReferenceDistanceFromExterior(type: FoundationWallType, referenceLine: WallReferenceLine): number {
  if (referenceLine === "exterior-main") return 0;
  if (referenceLine === "interior-main") return type.wallWidth;
  return type.wallWidth / 2;
}

/** Signed sill exterior-edge offset from the drawn reference line along its left-hand normal. */
export function foundationSillOffsetFromReference(line: LineObject, type: FoundationWallType): number {
  const referenceDistance = foundationReferenceDistanceFromExterior(type, line.wallReferenceLine ?? "exterior-main");
  const inwardDistance = type.sill.exteriorSetback - referenceDistance;
  return (line.wallExteriorSide ?? "left") === "left" ? -inwardDistance : inwardDistance;
}

function hostedFoundationWallForSegment(
  segment: { end: PlanPoint; start: PlanPoint },
  walls: LineObject[],
  typesById: ReadonlyMap<string, FoundationWallType>,
  preferredWallId: string | null = null,
): { line: LineObject; offsetFromReference: number; point: PlanPoint } | null {
  const segmentDx = segment.end.x - segment.start.x;
  const segmentDy = segment.end.y - segment.start.y;
  const segmentLength = Math.hypot(segmentDx, segmentDy);
  if (segmentLength < 1 / 16) return null;
  const segmentDirection = { x: segmentDx / segmentLength, y: segmentDy / segmentLength };
  const midpoint = { x: (segment.start.x + segment.end.x) / 2, y: (segment.start.y + segment.end.y) / 2 };
  const candidates = walls.flatMap((line) => {
    if (preferredWallId !== null && line.id !== preferredWallId) return [];
    const type = typesById.get(line.foundationWallTypeId ?? "");
    if (!type) return [];
    const dx = line.end.x - line.start.x;
    const dy = line.end.y - line.start.y;
    const length = Math.hypot(dx, dy);
    if (length < 1 / 16) return [];
    const direction = { x: dx / length, y: dy / length };
    const parallel = Math.abs(segmentDirection.x * direction.y - segmentDirection.y * direction.x);
    if (parallel > 1e-5) return [];
    const offsetFromReference = foundationSillOffsetFromReference(line, type);
    const point = {
      x: line.start.x - direction.y * offsetFromReference,
      y: line.start.y + direction.x * offsetFromReference,
    };
    const normalDistance = Math.abs((midpoint.x - point.x) * direction.y - (midpoint.y - point.y) * direction.x);
    const projection = (midpoint.x - line.start.x) * direction.x + (midpoint.y - line.start.y) * direction.y;
    if (normalDistance > Math.max(type.wallWidth, type.sill.plateWidth, 12) || projection < -1e-5 || projection > length + 1e-5) return [];
    return [{ line, normalDistance, offsetFromReference, point }];
  }).sort((first, second) => first.normalDistance - second.normalDistance);
  return candidates[0] ?? null;
}

/** Finds the closest aligned Foundation Wall suitable for a saved framed-wall support link. */
export function automaticFoundationSupportWall(document: ModelDocument, wall: LineObject): LineObject | null {
  const candidates = document.lines.filter((line) => line.architecturalRole === "foundation-wall" && line.storyId === wall.storyId);
  const typesById = new Map(document.building.foundationWallTypes.map((type) => [type.id, type]));
  return hostedFoundationWallForSegment(wall, candidates, typesById)?.line ?? null;
}

function roomBoundaryContainsPoint(room: RoomObject, point: PlanPoint): boolean {
  const tolerance = 1e-5;
  return polylineSegments(room.boundary).some((segment) => {
    const dx = segment.end.x - segment.start.x;
    const dy = segment.end.y - segment.start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared <= tolerance) return false;
    const cross = (point.x - segment.start.x) * dy - (point.y - segment.start.y) * dx;
    const projection = ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) / lengthSquared;
    return Math.abs(cross) <= tolerance * Math.sqrt(lengthSquared) && projection >= -tolerance && projection <= 1 + tolerance;
  });
}

function intersectFloorEdgeLines(first: FloorEdgeLine, second: FloorEdgeLine, fallback: PlanPoint): PlanPoint {
  const denominator = first.direction.x * second.direction.y - first.direction.y * second.direction.x;
  if (Math.abs(denominator) >= 1e-8) {
    const dx = second.point.x - first.point.x;
    const dy = second.point.y - first.point.y;
    const distance = (dx * second.direction.y - dy * second.direction.x) / denominator;
    return {
      x: snapToSixteenth(first.point.x + first.direction.x * distance),
      y: snapToSixteenth(first.point.y + first.direction.y * distance),
    };
  }
  const project = (line: FloorEdgeLine) => {
    const dx = fallback.x - line.point.x;
    const dy = fallback.y - line.point.y;
    const distance = dx * line.direction.x + dy * line.direction.y;
    return { x: line.point.x + line.direction.x * distance, y: line.point.y + line.direction.y * distance };
  };
  const firstProjection = project(first);
  const secondProjection = project(second);
  return {
    x: snapToSixteenth((firstProjection.x + secondProjection.x) / 2),
    y: snapToSixteenth((firstProjection.y + secondProjection.y) / 2),
  };
}

/**
 * Resolves the default floor outline edge-by-edge instead of copying the Room
 * center/reference-line loop. Perimeter edges stop at the exterior face of the
 * Wall type's Main structural group; shared Walls keep one common Room boundary.
 * A hosted Foundation Wall supersedes the framed-Wall fallback with its sill's
 * exterior support edge. Explicit per-edge offsets remain available for exceptional details.
 */
export function roomFloorPlatformBoundary(
  document: ModelDocument,
  room: RoomObject,
): { boundary: PolylineGeometry; conditions: RoomFloorEdgeCondition[] } {
  const segments = polylineSegments(room.boundary);
  const storyWalls = document.lines.filter((line) =>
    line.architecturalRole === "wall" && line.storyId === room.storyId && room.boundaryWallIds.includes(line.id));
  const foundationWalls = document.lines.filter((line) => line.architecturalRole === "foundation-wall" && line.storyId === room.storyId);
  const foundationTypesById = new Map(document.building.foundationWallTypes.map((type) => [type.id, type]));
  const edgeLines = segments.map((segment): FloorEdgeLine => {
    const wall = wallForRoomBoundarySegment(segment, storyWalls);
    const segmentDx = segment.end.x - segment.start.x;
    const segmentDy = segment.end.y - segment.start.y;
    const segmentLength = Math.hypot(segmentDx, segmentDy);
    const fallbackDirection = segmentLength > 1e-8
      ? { x: segmentDx / segmentLength, y: segmentDy / segmentLength }
      : { x: 1, y: 0 };
    if (!wall) return {
      condition: { adjacentRoomCount: 0, offsetFromReference: 0, rule: "room-boundary-fallback", wallId: null },
      direction: fallbackDirection,
      point: { ...segment.start },
    };
    const wallDx = wall.end.x - wall.start.x;
    const wallDy = wall.end.y - wall.start.y;
    const wallLength = Math.hypot(wallDx, wallDy);
    const direction = wallLength > 1e-8
      ? { x: wallDx / wallLength, y: wallDy / wallLength }
      : fallbackDirection;
    const segmentMidpoint = { x: (segment.start.x + segment.end.x) / 2, y: (segment.start.y + segment.end.y) / 2 };
    const adjacentRoomCount = document.rooms.filter((candidate) =>
      candidate.storyId === room.storyId && candidate.boundaryWallIds.includes(wall.id) && roomBoundaryContainsPoint(candidate, segmentMidpoint)).length;
    if (adjacentRoomCount > 1) return {
      condition: { adjacentRoomCount, offsetFromReference: 0, rule: "shared-wall-reference", wallId: wall.id },
      direction,
      point: { x: wall.start.x, y: wall.start.y },
    };
    const foundationSupport = hostedFoundationWallForSegment(segment, foundationWalls, foundationTypesById, wall.foundationSupportWallId);
    if (foundationSupport) {
      const supportDx = foundationSupport.line.end.x - foundationSupport.line.start.x;
      const supportDy = foundationSupport.line.end.y - foundationSupport.line.start.y;
      const supportLength = Math.hypot(supportDx, supportDy);
      return {
        condition: { adjacentRoomCount, offsetFromReference: foundationSupport.offsetFromReference, rule: "foundation-sill-exterior", wallId: foundationSupport.line.id },
        direction: { x: supportDx / supportLength, y: supportDy / supportLength },
        point: foundationSupport.point,
      };
    }
    const wallType = document.building.wallTypes.find((candidate) => candidate.id === wall.wallTypeId);
    if (!wallType) return {
      condition: { adjacentRoomCount, offsetFromReference: 0, rule: "room-boundary-fallback", wallId: wall.id },
      direction,
      point: { x: wall.start.x, y: wall.start.y },
    };
    const distanceFromExterior = wallLayerGroupThickness(wallType, "exterior");
    const referenceDistance = wallReferenceDistanceFromExterior(wallType, wall.wallReferenceLine ?? "wall-center");
    const inwardDistance = distanceFromExterior - referenceDistance;
    const offsetFromReference = (wall.wallExteriorSide ?? "left") === "left" ? -inwardDistance : inwardDistance;
    return {
      condition: { adjacentRoomCount, offsetFromReference, rule: "perimeter-main-exterior", wallId: wall.id },
      direction,
      point: {
        x: wall.start.x - direction.y * offsetFromReference,
        y: wall.start.y + direction.x * offsetFromReference,
      },
    };
  });
  const conditions = edgeLines.map((edge) => edge.condition);
  if (edgeLines.length !== room.boundary.vertices.length || edgeLines.length < 3) {
    return { boundary: clonePolylineGeometry(room.boundary), conditions };
  }
  const vertices = room.boundary.vertices.map((vertex, index) =>
    intersectFloorEdgeLines(edgeLines[(index - 1 + edgeLines.length) % edgeLines.length], edgeLines[index], vertex));
  const boundary: PolylineGeometry = {
    bulges: vertices.map(() => 0),
    closed: true,
    elevation: room.boundary.elevation,
    vertices,
    width: 0,
  };
  return polylineGeometryIsValid(boundary) && polylineArea(boundary) > 0
    ? { boundary, conditions }
    : { boundary: clonePolylineGeometry(room.boundary), conditions };
}

/**
 * Resolves the horizontal assemblies generated by one enclosed Room.
 *
 * These platforms remain derived from the Room boundary and its effective
 * Story/override settings. They are intentionally not persisted as duplicate
 * Polyline objects; separately drawn Floor Platforms remain independent manual
 * objects until explicit hosting and opening rules are introduced.
 */
export function roomHorizontalPlatformSolution(
  document: ModelDocument,
  room: RoomObject,
): RoomHorizontalPlatformSolution | null {
  const story = document.building.stories.find((candidate) => candidate.id === room.storyId);
  const storyElevation = calculateStoryElevations(document.building).find((candidate) => candidate.storyId === room.storyId);
  if (!story || !storyElevation || !roomObjectIsValid(room, document)) return null;
  const effective = effectiveRoomSettings(room, story, storyElevation.roughFloorElevation);
  const floorPlatform = roomFloorPlatformBoundary(document, room);
  const roughCeilingElevation = snapToSixteenth(effective.roughFloorElevation + effective.roughCeilingHeight);
  const ceilingStructureBottomElevation = snapToSixteenth(
    roughCeilingElevation - assemblyTotalThickness(effective.ceilingStructure),
  );
  return {
    ...effective,
    boundary: clonePolylineGeometry(room.boundary),
    ceilingOpeningBoundaries: room.platformOpenings.filter((opening) => opening.cuts === "ceiling" || opening.cuts === "both").map((opening) => clonePolylineGeometry(opening.boundary)),
    ceilingStructureBottomElevation,
    finishedCeilingElevation: snapToSixteenth(
      ceilingStructureBottomElevation - assemblyTotalThickness(effective.ceilingFinish),
    ),
    finishedFloorElevation: snapToSixteenth(
      effective.roughFloorElevation + assemblyTotalThickness(effective.floorFinish),
    ),
    floorBoundary: floorPlatform.boundary,
    floorEdgeConditions: floorPlatform.conditions,
    floorOpeningBoundaries: room.platformOpenings.filter((opening) => opening.cuts === "floor" || opening.cuts === "both").map((opening) => clonePolylineGeometry(opening.boundary)),
    platformOpenings: room.platformOpenings.map(clonePlatformOpening),
    roomId: room.id,
    roughCeilingElevation,
    storyId: room.storyId,
  };
}

/**
 * Resolves the automatic rough-framing envelope for a Wall.
 *
 * A detected adjacent Room supplies its effective local subfloor and ceiling
 * conditions. A Wall shared by rooms with different conditions spans the full
 * rough envelope for this first vertical-constraint stage; stepped per-side
 * finish profiles remain a separate generated-geometry concern.
 */
export function wallVerticalExtent(document: ModelDocument, line: LineObject): WallVerticalExtent | null {
  if (line.architecturalRole !== "wall") return null;
  const story = document.building.stories.find((candidate) => candidate.id === line.storyId);
  const storyElevation = calculateStoryElevations(document.building).find((candidate) => candidate.storyId === line.storyId);
  if (!story || !storyElevation) return null;
  const rooms = document.rooms.filter((room) => room.storyId === line.storyId && room.boundaryWallIds.includes(line.id));
  if (!rooms.length) {
    return {
      adjacentRoomIds: [],
      baseElevation: storyElevation.roughFloorElevation,
      hasDifferentRoomCeilings: false,
      hasDifferentRoomFloors: false,
      height: story.roughCeilingHeight,
      source: "story",
      topElevation: storyElevation.roughCeilingElevation,
    };
  }
  const roomExtents = rooms.map((room) => {
    const settings = effectiveRoomSettings(room, story, storyElevation.roughFloorElevation);
    return {
      baseElevation: settings.roughFloorElevation,
      roomId: room.id,
      topElevation: snapToSixteenth(settings.roughFloorElevation + settings.roughCeilingHeight),
    };
  });
  const baseElevation = snapToSixteenth(Math.min(...roomExtents.map((extent) => extent.baseElevation)));
  const topElevation = snapToSixteenth(Math.max(...roomExtents.map((extent) => extent.topElevation)));
  return {
    adjacentRoomIds: roomExtents.map((extent) => extent.roomId).sort(),
    baseElevation,
    hasDifferentRoomCeilings: new Set(roomExtents.map((extent) => extent.topElevation)).size > 1,
    hasDifferentRoomFloors: new Set(roomExtents.map((extent) => extent.baseElevation)).size > 1,
    height: snapToSixteenth(topElevation - baseElevation),
    source: "rooms",
    topElevation,
  };
}

export function foundationWallVerticalExtent(document: ModelDocument, line: LineObject): FoundationWallVerticalExtent | null {
  if (line.architecturalRole !== "foundation-wall") return null;
  const type = document.building.foundationWallTypes.find((candidate) => candidate.id === line.foundationWallTypeId);
  const storyElevation = calculateStoryElevations(document.building).find((candidate) => candidate.storyId === line.storyId);
  if (!type || !storyElevation) return null;
  const topElevation = snapToSixteenth(storyElevation.roughFloorElevation + type.topOffset);
  const baseElevation = snapToSixteenth(topElevation - type.wallHeight);
  return {
    baseElevation,
    footingBottomElevation: snapToSixteenth(baseElevation - (type.footing.enabled ? type.footing.height : 0)),
    footingTopElevation: baseElevation,
    sillTopElevation: snapToSixteenth(topElevation + type.sill.foundationPlateCount * type.sill.plateHeight),
    topElevation,
  };
}

function documentWallOpeningsAreValid(document: ModelDocument): boolean {
  return document.lines.every((line) => {
    const wallHeight = wallVerticalExtent(document, line)?.height ?? document.building.stories.find((story) => story.id === line.storyId)?.roughCeilingHeight ?? 0;
    return wallOpeningsAreValid(line, wallHeight) && line.wallOpenings.every((opening) => document.layers.some((layer) => layer.id === opening.layerId));
  });
}

function wallOpeningTypeFitsWall(building: BuildingStructure, line: LineObject, openingType: WallOpeningType, headerTypeIdOverride: string | null = null): boolean {
  if (line.architecturalRole !== "wall") return false;
  const wallType = building.wallTypes.find((candidate) => candidate.id === line.wallTypeId);
  const headerType = resolveWallHeaderType(building, line.wallTypeId, openingType.id, headerTypeIdOverride);
  if (!wallType || !headerType) return false;
  const requiredThickness = wallHeaderTypeRequiredMainThickness(headerType);
  return requiredThickness === 0 || requiredThickness <= wallLayerGroupThickness(wallType, "main") + 1e-8;
}

function documentWallHeaderAssembliesFit(document: ModelDocument): boolean {
  const openingTypesById = new Map(document.building.openingTypes.map((type) => [type.id, type]));
  return document.lines.every((line) => line.wallOpenings.every((opening) => {
    if (opening.wallOpeningTypeId === null) {
      if (opening.headerTypeIdOverride === null) return true;
      const wallType = document.building.wallTypes.find((candidate) => candidate.id === line.wallTypeId);
      const headerType = resolveWallHeaderType(document.building, line.wallTypeId, null, opening.headerTypeIdOverride);
      if (!wallType || !headerType) return false;
      const requiredThickness = wallHeaderTypeRequiredMainThickness(headerType);
      return requiredThickness === 0 || requiredThickness <= wallLayerGroupThickness(wallType, "main") + 1e-8;
    }
    const openingType = openingTypesById.get(opening.wallOpeningTypeId);
    return openingType !== undefined && wallOpeningTypeFitsWall(document.building, line, openingType, opening.headerTypeIdOverride);
  }));
}

function documentOpeningComponentOverridesAreValid(document: ModelDocument): boolean {
  const openingTypesById = new Map(document.building.openingTypes.map((type) => [type.id, type]));
  return document.lines.every((line) => line.wallOpenings.every((opening) => {
    if (opening.wallOpeningTypeId === null) return opening.componentOverrides.length === 0;
    const type = openingTypesById.get(opening.wallOpeningTypeId);
    return type !== undefined && resolveOpeningComponents(type, opening.componentOverrides) !== null;
  }));
}

function roomBoundaryWallIds(boundary: PolylineGeometry, walls: LineObject[]): string[] {
  const tolerance = 1e-5;
  const ids = new Set<string>();
  for (const segment of polylineSegments(boundary)) {
    if (Math.abs(segment.bulge) >= 1e-10) continue;
    const midpoint = { x: (segment.start.x + segment.end.x) / 2, y: (segment.start.y + segment.end.y) / 2 };
    for (const wall of walls) {
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const lengthSquared = dx * dx + dy * dy;
      if (lengthSquared <= tolerance) continue;
      const cross = (midpoint.x - wall.start.x) * dy - (midpoint.y - wall.start.y) * dx;
      const projection = ((midpoint.x - wall.start.x) * dx + (midpoint.y - wall.start.y) * dy) / lengthSquared;
      if (Math.abs(cross) <= tolerance * Math.sqrt(lengthSquared) && projection >= -tolerance && projection <= 1 + tolerance) ids.add(wall.id);
    }
  }
  return [...ids].sort();
}

/** Rebuilds the enclosed Rooms on one Story while preserving settings for unchanged wall loops. */
export function refreshRoomsForStory(document: ModelDocument, storyId: string): ModelDocument | null {
  const elevation = calculateStoryElevations(document.building).find((item) => item.storyId === storyId)?.roughFloorElevation;
  if (elevation === undefined) return null;
  const walls = document.lines.filter((line) => line.architecturalRole === "wall" && line.storyId === storyId);
  const sources: BoundarySource[] = walls.map((wall) => ({ kind: "line", geometry: { start: wall.start, end: wall.end } }));
  const faces = discoverBoundedFaces(sources, elevation)
    .map((face) => ({ ...face, boundaryWallIds: roomBoundaryWallIds(face.geometry, walls), centroid: polylineCentroid(face.geometry) }))
    .filter((face) => face.boundaryWallIds.length >= 3)
    .sort((first, second) => (first.centroid?.y ?? 0) - (second.centroid?.y ?? 0) || (first.centroid?.x ?? 0) - (second.centroid?.x ?? 0) || first.area - second.area);
  const existingByWalls = new Map(document.rooms.filter((room) => room.storyId === storyId).map((room) => [room.boundaryWallIds.join("|"), room]));
  const usedIds = new Set(document.rooms.map((room) => room.id));
  let nextNumber = 1;
  const nextId = () => {
    while (usedIds.has(`room-${String(nextNumber).padStart(2, "0")}`)) nextNumber += 1;
    const id = `room-${String(nextNumber).padStart(2, "0")}`;
    usedIds.add(id);
    nextNumber += 1;
    return id;
  };
  const rooms = faces.map((face) => {
    const existing = existingByWalls.get(face.boundaryWallIds.join("|"));
    if (existing) return { ...cloneRoomObject(existing), boundary: clonePolylineGeometry(face.geometry), boundaryWallIds: face.boundaryWallIds };
    return {
      boundary: clonePolylineGeometry(face.geometry),
      boundaryWallIds: face.boundaryWallIds,
      ceilingFinishOverride: null,
      ceilingStructureOverride: null,
      floorFinishOverride: null,
      floorStructureOverride: null,
      id: nextId(),
      layerId: STANDARD_LAYER_IDS.room,
      name: "Unassigned",
      platformOpenings: [],
      roughCeilingHeightOverride: null,
      roughFloorOffset: 0,
      roomType: "Unassigned",
      storyId,
    } satisfies RoomObject;
  });
  if (rooms.length > MAXIMUM_ROOM_COUNT) return null;
  const next = cloneDocument(document);
  next.rooms = [...next.rooms.filter((room) => room.storyId !== storyId), ...rooms];
  const annotationsByKey = new Map(next.roomAnnotations.map((annotation) => [`${annotation.roomId}:${annotation.kind}`, annotation]));
  next.roomAnnotations = [
    ...next.roomAnnotations.filter((annotation) => annotation.storyId !== storyId),
    ...rooms.flatMap((room) => defaultRoomAnnotations(room).map((fallback) => {
      const existing = annotationsByKey.get(`${room.id}:${fallback.kind}`);
      return existing ? { ...cloneRoomAnnotation(existing), storyId: room.storyId } : fallback;
    })),
  ];
  const normalized = clearInvalidPlatformOpeningContinuity(next);
  return normalized.rooms.every((room) => roomObjectIsValid(room, normalized)) && normalized.roomAnnotations.every((annotation) => roomAnnotationIsValid(annotation, normalized)) && documentWallOpeningsAreValid(normalized) ? normalized : null;
}

export function updateRoomObject(document: ModelDocument, roomId: string, change: Partial<Omit<RoomObject, "id" | "storyId" | "boundary" | "boundaryWallIds" | "platformOpenings">>): ModelDocument | null {
  const next = cloneDocument(document);
  const index = next.rooms.findIndex((room) => room.id === roomId);
  if (index < 0) return null;
  next.rooms[index] = { ...next.rooms[index], ...change, name: change.name?.trim() || next.rooms[index].name };
  return roomObjectIsValid(next.rooms[index], next) && documentWallOpeningsAreValid(next) ? next : null;
}

export function updateRoomAnnotation(document: ModelDocument, annotationId: string, change: Partial<Pick<RoomAnnotationObject, "layerId" | "position" | "visible">>): ModelDocument | null {
  const next = cloneDocument(document);
  const index = next.roomAnnotations.findIndex((annotation) => annotation.id === annotationId);
  if (index < 0) return null;
  next.roomAnnotations[index] = { ...next.roomAnnotations[index], ...change, position: change.position ? { ...change.position } : next.roomAnnotations[index].position };
  return roomAnnotationIsValid(next.roomAnnotations[index], next) ? next : null;
}

function nextPlatformOpeningIdentity(room: RoomObject, kind: PlatformOpeningKind) {
  const label = kind === "stairwell" ? "Stairwell" : kind === "shaft" ? "Shaft" : "Open Below";
  let number = 1;
  while (room.platformOpenings.some((opening) => opening.id === `${room.id}-platform-opening-${String(number).padStart(2, "0")}`)) number += 1;
  let name = `${label} ${String(number).padStart(2, "0")}`;
  while (room.platformOpenings.some((opening) => opening.name.trim().toLowerCase() === name.toLowerCase())) {
    number += 1;
    name = `${label} ${String(number).padStart(2, "0")}`;
  }
  return { id: `${room.id}-platform-opening-${String(number).padStart(2, "0")}`, name };
}

export function addPlatformOpening(
  document: ModelDocument,
  roomId: string,
  kind: PlatformOpeningKind = "stairwell",
  cuts: PlatformOpeningCuts = "both",
): { document: ModelDocument; opening: PlatformOpening } | null {
  const room = document.rooms.find((candidate) => candidate.id === roomId);
  if (!room || room.platformOpenings.length >= MAXIMUM_PLATFORM_OPENING_COUNT || !PLATFORM_OPENING_KINDS.includes(kind) || !PLATFORM_OPENING_CUTS.includes(cuts)) return null;
  const center = polylineCentroid(room.boundary);
  if (!center) return null;
  const xs = room.boundary.vertices.map((point) => point.x);
  const ys = room.boundary.vertices.map((point) => point.y);
  const maximumWidth = Math.min(48, (Math.max(...xs) - Math.min(...xs)) * 0.4);
  const maximumDepth = Math.min(48, (Math.max(...ys) - Math.min(...ys)) * 0.4);
  const identity = nextPlatformOpeningIdentity(room, kind);
  for (const scale of [1, 0.75, 0.5, 0.35, 0.25]) {
    const width = snapToSixteenth(maximumWidth * scale);
    const depth = snapToSixteenth(maximumDepth * scale);
    if (width < 6 || depth < 6) continue;
    const boundary = rectangleFromCorners(
      { x: center.x - width / 2, y: center.y - depth / 2 },
      { x: center.x + width / 2, y: center.y + depth / 2 },
      room.boundary.elevation,
    );
    if (!boundary) continue;
    const opening: PlatformOpening = { boundary, cuts, id: identity.id, kind, name: identity.name, verticalOpeningId: null };
    const next = cloneDocument(document);
    const nextRoom = next.rooms.find((candidate) => candidate.id === roomId);
    if (!nextRoom) return null;
    nextRoom.platformOpenings.push(clonePlatformOpening(opening));
    if (roomObjectIsValid(nextRoom, next)) return { document: next, opening: clonePlatformOpening(opening) };
  }
  return null;
}

export function updatePlatformOpening(
  document: ModelDocument,
  roomId: string,
  openingId: string,
  change: Partial<Omit<PlatformOpening, "id" | "verticalOpeningId">>,
): ModelDocument | null {
  const next = cloneDocument(document);
  const room = next.rooms.find((candidate) => candidate.id === roomId);
  const openingIndex = room?.platformOpenings.findIndex((opening) => opening.id === openingId) ?? -1;
  if (!room || openingIndex < 0) return null;
  const current = room.platformOpenings[openingIndex];
  room.platformOpenings[openingIndex] = {
    ...current,
    ...change,
    boundary: change.boundary ? clonePolylineGeometry(change.boundary) : current.boundary,
    name: change.name?.trim() || current.name,
  };
  if (current.verticalOpeningId !== null && (change.boundary || change.kind)) {
    next.rooms.forEach((candidateRoom) => candidateRoom.platformOpenings.forEach((candidateOpening) => {
      if (candidateOpening.verticalOpeningId !== current.verticalOpeningId || candidateRoom.id === roomId && candidateOpening.id === openingId) return;
      if (change.boundary) candidateOpening.boundary = { ...clonePolylineGeometry(change.boundary), elevation: candidateRoom.boundary.elevation };
      if (change.kind) candidateOpening.kind = change.kind;
    }));
  }
  return next.rooms.every((candidate) => roomObjectIsValid(candidate, next)) && platformOpeningContinuityIsValid(next) ? next : null;
}

export function deletePlatformOpening(document: ModelDocument, roomId: string, openingId: string): ModelDocument | null {
  const next = cloneDocument(document);
  const room = next.rooms.find((candidate) => candidate.id === roomId);
  const opening = room?.platformOpenings.find((candidate) => candidate.id === openingId);
  if (!room || !opening) return null;
  room.platformOpenings = room.platformOpenings.filter((opening) => opening.id !== openingId);
  if (opening.verticalOpeningId !== null) next.rooms.forEach((candidateRoom) => candidateRoom.platformOpenings.forEach((candidateOpening) => {
    if (candidateOpening.verticalOpeningId === opening.verticalOpeningId) candidateOpening.verticalOpeningId = null;
  }));
  return next.rooms.every((candidate) => roomObjectIsValid(candidate, next)) && platformOpeningContinuityIsValid(next) ? next : null;
}

function nextVerticalOpeningId(document: ModelDocument): string {
  const ids = new Set(platformOpeningMembers(document).map((member) => member.opening.verticalOpeningId).filter((id): id is string => id !== null));
  let number = 1;
  while (ids.has(`vertical-opening-${String(number).padStart(2, "0")}`)) number += 1;
  return `vertical-opening-${String(number).padStart(2, "0")}`;
}

function addRequiredPlatformCut(cuts: PlatformOpeningCuts, cut: "ceiling" | "floor"): PlatformOpeningCuts {
  if (cuts === "both" || cuts === cut) return cuts;
  return "both";
}

/** Creates or links an aligned opening in the immediately adjacent Story. */
export function continuePlatformOpening(
  document: ModelDocument,
  roomId: string,
  openingId: string,
  direction: PlatformOpeningContinuationDirection,
): ModelDocument | null {
  const sourceRoom = document.rooms.find((room) => room.id === roomId);
  const sourceOpening = sourceRoom?.platformOpenings.find((opening) => opening.id === openingId);
  const sourceStoryIndex = document.building.stories.findIndex((story) => story.id === sourceRoom?.storyId);
  const targetStoryIndex = sourceStoryIndex + (direction === "above" ? 1 : -1);
  const targetStory = document.building.stories[targetStoryIndex];
  if (!sourceRoom || !sourceOpening || sourceStoryIndex < 0 || !targetStory) return null;
  const existingContinuation = platformOpeningContinuity(document, roomId, openingId);
  if (existingContinuation?.[direction]) return cloneDocument(document);

  const targetRooms = document.rooms.filter((room) => room.storyId === targetStory.id);
  const matchingMembers = targetRooms.flatMap((room) => room.platformOpenings
    .filter((opening) => platformOpeningBoundaryMatches(opening.boundary, sourceOpening.boundary))
    .map((opening) => ({ opening, room })));
  if (matchingMembers.length > 1) return null;

  const verticalOpeningId = sourceOpening.verticalOpeningId ?? nextVerticalOpeningId(document);
  const next = cloneDocument(document);
  const nextSourceRoom = next.rooms.find((room) => room.id === roomId);
  const nextSourceOpening = nextSourceRoom?.platformOpenings.find((opening) => opening.id === openingId);
  if (!nextSourceOpening) return null;
  nextSourceOpening.verticalOpeningId = verticalOpeningId;
  nextSourceOpening.cuts = addRequiredPlatformCut(nextSourceOpening.cuts, direction === "above" ? "ceiling" : "floor");

  if (matchingMembers.length === 1) {
    const match = matchingMembers[0];
    if (match.opening.kind !== sourceOpening.kind || match.opening.verticalOpeningId !== null && match.opening.verticalOpeningId !== verticalOpeningId) return null;
    const targetOpening = next.rooms.find((room) => room.id === match.room.id)?.platformOpenings.find((opening) => opening.id === match.opening.id);
    if (!targetOpening) return null;
    targetOpening.verticalOpeningId = verticalOpeningId;
    targetOpening.cuts = addRequiredPlatformCut(targetOpening.cuts, direction === "above" ? "floor" : "ceiling");
  } else {
    const boundaryAtTarget = { ...clonePolylineGeometry(sourceOpening.boundary), elevation: targetRooms[0]?.boundary.elevation ?? 0 };
    const containingRooms = targetRooms.filter((room) => platformOpeningIsValid({ ...sourceOpening, boundary: { ...boundaryAtTarget, elevation: room.boundary.elevation } }, room));
    if (containingRooms.length !== 1 || containingRooms[0].platformOpenings.length >= MAXIMUM_PLATFORM_OPENING_COUNT) return null;
    const targetRoom = next.rooms.find((room) => room.id === containingRooms[0].id);
    if (!targetRoom) return null;
    const identity = nextPlatformOpeningIdentity(targetRoom, sourceOpening.kind);
    targetRoom.platformOpenings.push({
      boundary: { ...clonePolylineGeometry(sourceOpening.boundary), elevation: targetRoom.boundary.elevation },
      cuts: direction === "above" ? "floor" : "ceiling",
      id: identity.id,
      kind: sourceOpening.kind,
      name: identity.name,
      verticalOpeningId,
    });
  }
  return next.rooms.every((room) => roomObjectIsValid(room, next)) && platformOpeningContinuityIsValid(next) ? next : null;
}

/** Disconnects every Story member of the selected vertical opening path. */
export function disconnectPlatformOpeningContinuity(document: ModelDocument, roomId: string, openingId: string): ModelDocument | null {
  const source = document.rooms.find((room) => room.id === roomId)?.platformOpenings.find((opening) => opening.id === openingId);
  if (!source) return null;
  if (source.verticalOpeningId === null) return cloneDocument(document);
  const next = cloneDocument(document);
  next.rooms.forEach((room) => room.platformOpenings.forEach((opening) => {
    if (opening.verticalOpeningId === source.verticalOpeningId) opening.verticalOpeningId = null;
  }));
  return next;
}

export function cloneDocument(document: ModelDocument): ModelDocument {
  return {
    activeLayerSetId: document.activeLayerSetId,
    activeLayerId: document.activeLayerId,
    activeSavedPlanViewId: document.activeSavedPlanViewId,
    arcs: document.arcs.map(cloneArcObject),
    building: cloneBuildingStructure(document.building),
    circles: document.circles.map(cloneCircleObject),
    groups: document.groups.map(cloneGroup),
    layers: document.layers.map(cloneLayer),
    layerSets: document.layerSets.map(cloneLayerSet),
    lines: document.lines.map(cloneLineObject),
    objects: document.objects.map(cloneBoxObject),
    polylines: document.polylines.map(clonePolylineObject),
    rooms: (document.rooms ?? []).map(cloneRoomObject),
    roomAnnotations: document.roomAnnotations.map(cloneRoomAnnotation),
    savedPlanViews: document.savedPlanViews.map(cloneSavedPlanView),
  };
}

export function documentsEqual(a: ModelDocument, b: ModelDocument): boolean {
  return (
    a.activeLayerSetId === b.activeLayerSetId &&
    a.activeLayerId === b.activeLayerId &&
    a.activeSavedPlanViewId === b.activeSavedPlanViewId &&
    buildingStructuresEqual(a.building, b.building) &&
    a.arcs.length === b.arcs.length &&
    a.arcs.every((arc, index) => {
      const other = b.arcs[index];
      return other !== undefined && arc.id === other.id && arc.layerId === other.layerId &&
        arc.locked === other.locked && arc.name === other.name && arc.storyId === other.storyId && arc.type === other.type &&
        arcGeometriesEqual(arc, other);
    }) &&
    a.circles.length === b.circles.length &&
    a.circles.every((circle, index) => {
      const other = b.circles[index];
      return other !== undefined && circle.id === other.id && circle.layerId === other.layerId &&
        circle.locked === other.locked && circle.name === other.name && circle.storyId === other.storyId && circle.type === other.type &&
        circleGeometriesEqual(circle, other);
    }) &&
    a.groups.length === b.groups.length &&
    a.groups.every((group, index) => {
      const other = b.groups[index];
      return other !== undefined && group.id === other.id && group.name === other.name;
    }) &&
    a.layers.length === b.layers.length &&
    a.layers.every((layer, index) => {
      const other = b.layers[index];
      return other !== undefined &&
        layer.id === other.id &&
        layer.name === other.name &&
        layer.color === other.color &&
        layer.printColor === other.printColor &&
        layer.lineStyle === other.lineStyle &&
        layer.lineWeight === other.lineWeight &&
        layer.visible === other.visible &&
        layer.locked === other.locked;
    }) &&
    JSON.stringify(a.layerSets) === JSON.stringify(b.layerSets) &&
    a.lines.length === b.lines.length &&
    a.lines.every((line, index) => {
      const other = b.lines[index];
      return other !== undefined && line.id === other.id && line.layerId === other.layerId &&
        line.architecturalRole === other.architecturalRole && line.foundationSupportWallId === other.foundationSupportWallId && line.foundationWallTypeId === other.foundationWallTypeId && line.locked === other.locked && line.name === other.name && line.storyId === other.storyId && line.type === other.type && line.wallExteriorSide === other.wallExteriorSide && line.wallJoinPriority === other.wallJoinPriority && line.wallStartJoinMode === other.wallStartJoinMode && line.wallEndJoinMode === other.wallEndJoinMode && line.wallReferenceLine === other.wallReferenceLine && line.wallTypeId === other.wallTypeId &&
        line.wallOpenings.length === other.wallOpenings.length && line.wallOpenings.every((opening, openingIndex) => {
          const otherOpening = other.wallOpenings[openingIndex];
          return otherOpening !== undefined && opening.centerOffset === otherOpening.centerOffset && opening.headerBottomHeight === otherOpening.headerBottomHeight && opening.headerTypeIdOverride === otherOpening.headerTypeIdOverride && opening.id === otherOpening.id && opening.kind === otherOpening.kind && opening.layerId === otherOpening.layerId && opening.name === otherOpening.name && opening.roughHeight === otherOpening.roughHeight && opening.roughWidth === otherOpening.roughWidth && opening.unitHeight === otherOpening.unitHeight && opening.unitWidth === otherOpening.unitWidth && opening.wallOpeningTypeId === otherOpening.wallOpeningTypeId && JSON.stringify(opening.componentOverrides) === JSON.stringify(otherOpening.componentOverrides);
        }) &&
        lineGeometriesEqual(line, other);
    }) &&
    a.polylines.length === b.polylines.length &&
    a.polylines.every((polyline, index) => {
      const other = b.polylines[index];
      return other !== undefined && polyline.id === other.id && polyline.layerId === other.layerId &&
        polyline.architecturalRole === other.architecturalRole && polyline.locked === other.locked && polyline.name === other.name && polyline.shape === other.shape && polyline.storyId === other.storyId &&
        polylineGeometriesEqual(polyline, other);
    }) &&
    (a.rooms ?? []).length === (b.rooms ?? []).length &&
    (a.rooms ?? []).every((room, index) => {
      const other = (b.rooms ?? [])[index];
      return other !== undefined && room.id === other.id && room.layerId === other.layerId && room.name === other.name && room.roomType === other.roomType && room.storyId === other.storyId &&
        room.roughFloorOffset === other.roughFloorOffset && room.roughCeilingHeightOverride === other.roughCeilingHeightOverride &&
        room.boundaryWallIds.length === other.boundaryWallIds.length && room.boundaryWallIds.every((wallId, wallIndex) => wallId === other.boundaryWallIds[wallIndex]) &&
        polylineGeometriesEqual(room.boundary, other.boundary) &&
        room.platformOpenings.length === other.platformOpenings.length && room.platformOpenings.every((opening, openingIndex) => {
          const otherOpening = other.platformOpenings[openingIndex];
          return otherOpening !== undefined && opening.id === otherOpening.id && opening.name === otherOpening.name && opening.kind === otherOpening.kind && opening.cuts === otherOpening.cuts && opening.verticalOpeningId === otherOpening.verticalOpeningId && polylineGeometriesEqual(opening.boundary, otherOpening.boundary);
        }) &&
        JSON.stringify(room.floorStructureOverride) === JSON.stringify(other.floorStructureOverride) &&
        JSON.stringify(room.floorFinishOverride) === JSON.stringify(other.floorFinishOverride) &&
        JSON.stringify(room.ceilingStructureOverride) === JSON.stringify(other.ceilingStructureOverride) &&
        JSON.stringify(room.ceilingFinishOverride) === JSON.stringify(other.ceilingFinishOverride);
    }) &&
    JSON.stringify(a.roomAnnotations) === JSON.stringify(b.roomAnnotations) &&
    JSON.stringify(a.savedPlanViews) === JSON.stringify(b.savedPlanViews) &&
    a.objects.length === b.objects.length &&
    a.objects.every((object, index) => {
      const other = b.objects[index];
      return (
        other !== undefined &&
        object.id === other.id &&
        object.groupId === other.groupId &&
        object.layerId === other.layerId &&
        object.locked === other.locked &&
        object.name === other.name &&
        object.storyId === other.storyId &&
        object.type === other.type &&
        boxModelsEqual(object, other)
      );
    })
  );
}

export function updateDocumentBuilding(
  document: ModelDocument,
  building: BuildingStructure,
): ModelDocument | null {
  if (!buildingStructureIsValid(building)) return null;
  const next = cloneDocument(document);
  const openingTypesById = new Map(building.openingTypes.map((type) => [type.id, type]));
  if (next.lines.some((line) => line.wallOpenings.some((opening) => opening.wallOpeningTypeId !== null && openingTypesById.get(opening.wallOpeningTypeId)?.kind !== opening.kind))) return null;
  for (const line of next.lines) {
    line.wallOpenings = line.wallOpenings.map((opening) => {
      if (opening.wallOpeningTypeId === null) return opening;
      const type = openingTypesById.get(opening.wallOpeningTypeId);
      if (!type || type.kind !== opening.kind) return opening;
      return {
        ...opening,
        headerBottomHeight: type.kind === "door" ? type.roughHeight : opening.headerBottomHeight,
        roughHeight: type.roughHeight,
        roughWidth: type.roughWidth,
        unitHeight: type.unitHeight,
        unitWidth: type.unitWidth,
      };
    });
  }
  const previousElevations = new Map(calculateStoryElevations(document.building).map((item) => [item.storyId, item.roughFloorElevation]));
  const nextElevations = new Map(calculateStoryElevations(building).map((item) => [item.storyId, item.roughFloorElevation]));
  const storyChange = (storyId: string): { delta: number; storyId: string } => {
    const previousElevation = previousElevations.get(storyId) ?? 0;
    if (nextElevations.has(storyId)) {
      return { delta: (nextElevations.get(storyId) ?? 0) - previousElevation, storyId };
    }
    const nearest = [...nextElevations.entries()].sort((first, second) =>
      Math.abs(first[1] - previousElevation) - Math.abs(second[1] - previousElevation))[0];
    return { delta: 0, storyId: nearest?.[0] ?? building.activeStoryId };
  };
  next.objects = next.objects.map((object) => {
    const change = storyChange(object.storyId);
    return { ...object, position: { ...object.position, z: snapToSixteenth(object.position.z + change.delta) }, storyId: change.storyId };
  });
  next.lines = next.lines.map((line) => {
    const change = storyChange(line.storyId);
    const wallTypeId = line.architecturalRole === "wall" && !building.wallTypes.some((wallType) => wallType.id === line.wallTypeId)
      ? building.activeWallTypeId
      : line.wallTypeId;
    const foundationWallTypeId = line.architecturalRole === "foundation-wall" && !building.foundationWallTypes.some((type) => type.id === line.foundationWallTypeId)
      ? building.activeFoundationWallTypeId
      : line.foundationWallTypeId;
    return { ...line, foundationWallTypeId, start: { ...line.start, z: snapToSixteenth(line.start.z + change.delta) }, end: { ...line.end, z: snapToSixteenth(line.end.z + change.delta) }, storyId: change.storyId, wallTypeId };
  });
  next.polylines = next.polylines.map((polyline) => {
    const change = storyChange(polyline.storyId);
    return { ...polyline, elevation: snapToSixteenth(polyline.elevation + change.delta), storyId: change.storyId };
  });
  next.circles = next.circles.map((circle) => {
    const change = storyChange(circle.storyId);
    return { ...circle, center: { ...circle.center, z: snapToSixteenth(circle.center.z + change.delta) }, storyId: change.storyId };
  });
  next.arcs = next.arcs.map((arc) => {
    const change = storyChange(arc.storyId);
    return { ...arc, center: { ...arc.center, z: snapToSixteenth(arc.center.z + change.delta) }, storyId: change.storyId };
  });
  next.rooms = next.rooms.map((room) => {
    const change = storyChange(room.storyId);
    return {
      ...room,
      boundary: { ...clonePolylineGeometry(room.boundary), elevation: snapToSixteenth(room.boundary.elevation + change.delta) },
      platformOpenings: room.platformOpenings.map((opening) => ({
        ...clonePlatformOpening(opening),
        boundary: { ...clonePolylineGeometry(opening.boundary), elevation: snapToSixteenth(opening.boundary.elevation + change.delta) },
      })),
      storyId: change.storyId,
    };
  });
  const roomStoryById = new Map(next.rooms.map((room) => [room.id, room.storyId]));
  next.roomAnnotations = next.roomAnnotations.map((annotation) => ({ ...annotation, storyId: roomStoryById.get(annotation.roomId) ?? annotation.storyId }));
  const nextStoryIds = new Set(building.stories.map((story) => story.id));
  next.savedPlanViews = next.savedPlanViews.map((view) => ({
    ...view,
    referenceStoryId: view.referenceStoryId && nextStoryIds.has(view.referenceStoryId) ? view.referenceStoryId : null,
    storyId: nextStoryIds.has(view.storyId) ? view.storyId : building.activeStoryId,
  }));
  next.building = cloneBuildingStructure(building);
  const normalized = clearInvalidPlatformOpeningContinuity(next);
  if (!documentWallHeaderAssembliesFit(normalized)) return null;
  if (!documentOpeningComponentOverridesAreValid(normalized)) return null;
  if (!documentWallOpeningsAreValid(normalized)) return null;
  if (normalized.rooms.some((room) => !roomObjectIsValid(room, normalized))) return null;
  if (normalized.roomAnnotations.some((annotation) => !roomAnnotationIsValid(annotation, normalized))) return null;
  return normalized;
}

export function assignModelEntityToStory(
  document: ModelDocument,
  ref: ModelEntityRef,
  storyId: string,
): ModelDocument | null {
  if (!document.building.stories.some((story) => story.id === storyId) || !modelEntityIsEditable(document, ref)) return null;
  const current = ref.kind === "box"
    ? findBoxObject(document, ref.id)
    : ref.kind === "line"
      ? findLineObject(document, ref.id)
      : ref.kind === "polyline"
        ? findPolylineObject(document, ref.id)
        : ref.kind === "circle"
          ? findCircleObject(document, ref.id)
          : findArcObject(document, ref.id);
  if (!current || current.storyId === storyId) return cloneDocument(document);
  if (ref.kind === "line") {
    const line = current as LineObject;
    const targetStory = document.building.stories.find((story) => story.id === storyId);
    if (!targetStory || !wallOpeningsAreValid(line, targetStory.roughCeilingHeight)) return null;
  }
  const elevations = new Map(calculateStoryElevations(document.building).map((item) => [item.storyId, item.roughFloorElevation]));
  const delta = (elevations.get(storyId) ?? 0) - (elevations.get(current.storyId) ?? 0);
  const next = cloneDocument(document);
  if (ref.kind === "box") next.objects = next.objects.map((object) => object.id === ref.id ? { ...object, position: { ...object.position, z: snapToSixteenth(object.position.z + delta) }, storyId } : object);
  if (ref.kind === "line") next.lines = next.lines.map((line) => line.id === ref.id ? {
    ...line,
    end: { ...line.end, z: snapToSixteenth(line.end.z + delta) },
    foundationSupportWallId: line.architecturalRole === "wall" ? null : line.foundationSupportWallId,
    start: { ...line.start, z: snapToSixteenth(line.start.z + delta) },
    storyId,
  } : line);
  if (ref.kind === "polyline") next.polylines = next.polylines.map((polyline) => polyline.id === ref.id ? { ...polyline, elevation: snapToSixteenth(polyline.elevation + delta), storyId } : polyline);
  if (ref.kind === "circle") next.circles = next.circles.map((circle) => circle.id === ref.id ? { ...circle, center: { ...circle.center, z: snapToSixteenth(circle.center.z + delta) }, storyId } : circle);
  if (ref.kind === "arc") next.arcs = next.arcs.map((arc) => arc.id === ref.id ? { ...arc, center: { ...arc.center, z: snapToSixteenth(arc.center.z + delta) }, storyId } : arc);
  if (ref.kind === "line") {
    const foundationWallStories = new Map(next.lines.filter((line) => line.architecturalRole === "foundation-wall").map((line) => [line.id, line.storyId]));
    next.lines = next.lines.map((line) => line.foundationSupportWallId !== null && foundationWallStories.get(line.foundationSupportWallId) !== line.storyId
      ? { ...line, foundationSupportWallId: null }
      : line);
    next.rooms = next.rooms.filter((room) => !room.boundaryWallIds.includes(ref.id));
    const roomIds = new Set(next.rooms.map((room) => room.id));
    next.roomAnnotations = next.roomAnnotations.filter((annotation) => roomIds.has(annotation.roomId));
  }
  return next;
}

export function findLayer(
  document: ModelDocument,
  layerId: string | null,
): ModelLayer | null {
  if (!layerId) return null;
  return document.layers.find((layer) => layer.id === layerId) ?? null;
}

function withObjects(document: ModelDocument, objects: BoxObject[]): ModelDocument {
  const usedGroupIds = new Set(objects.map((object) => object.groupId).filter(Boolean));
  const next = cloneDocument(document);
  next.groups = next.groups.filter((group) => usedGroupIds.has(group.id));
  next.objects = objects.map(cloneBoxObject);
  return next;
}

function withLines(document: ModelDocument, lines: LineObject[]): ModelDocument {
  const foundationWallStories = new Map(lines.filter((line) => line.architecturalRole === "foundation-wall").map((line) => [line.id, line.storyId]));
  const normalizedLines = lines.map((line) => line.foundationSupportWallId !== null && (
    line.architecturalRole !== "wall" || foundationWallStories.get(line.foundationSupportWallId) !== line.storyId
  ) ? { ...line, foundationSupportWallId: null } : line);
  const roomWallKeys = new Set(normalizedLines.filter((line) => line.architecturalRole === "wall").map((line) => `${line.storyId}:${line.id}`));
  const next = cloneDocument(document);
  next.lines = normalizedLines.map(cloneLineObject);
  next.rooms = next.rooms.filter((room) => room.boundaryWallIds.every((wallId) => roomWallKeys.has(`${room.storyId}:${wallId}`)));
  const roomIds = new Set(next.rooms.map((room) => room.id));
  next.roomAnnotations = next.roomAnnotations.filter((annotation) => roomIds.has(annotation.roomId));
  return next;
}

function withPolylines(document: ModelDocument, polylines: PolylineObject[]): ModelDocument {
  const next = cloneDocument(document);
  next.polylines = polylines.map(clonePolylineObject);
  return next;
}

function withCircles(document: ModelDocument, circles: CircleObject[]): ModelDocument {
  const next = cloneDocument(document);
  next.circles = circles.map(cloneCircleObject);
  return next;
}

function withArcs(document: ModelDocument, arcs: ArcObject[]): ModelDocument {
  const next = cloneDocument(document);
  next.arcs = arcs.map(cloneArcObject);
  return next;
}

export function findBoxObject(
  document: ModelDocument,
  objectId: string | null,
): BoxObject | null {
  if (!objectId) return null;
  return document.objects.find((object) => object.id === objectId) ?? null;
}

export function findLineObject(document: ModelDocument, lineId: string | null): LineObject | null {
  if (!lineId) return null;
  return document.lines.find((line) => line.id === lineId) ?? null;
}

export function findPolylineObject(document: ModelDocument, polylineId: string | null): PolylineObject | null {
  if (!polylineId) return null;
  return document.polylines.find((polyline) => polyline.id === polylineId) ?? null;
}

export function findCircleObject(document: ModelDocument, circleId: string | null): CircleObject | null {
  if (!circleId) return null;
  return document.circles.find((circle) => circle.id === circleId) ?? null;
}

export function findArcObject(document: ModelDocument, arcId: string | null): ArcObject | null {
  if (!arcId) return null;
  return document.arcs.find((arc) => arc.id === arcId) ?? null;
}

export function findGroup(
  document: ModelDocument,
  groupId: string | null,
): ModelGroup | null {
  if (!groupId) return null;
  return document.groups.find((group) => group.id === groupId) ?? null;
}

export function selectionIdsForObject(document: ModelDocument, objectId: string): string[] {
  const object = findBoxObject(document, objectId);
  if (!object) return [];
  if (!object.groupId) return [object.id];
  return document.objects
    .filter((candidate) => candidate.groupId === object.groupId)
    .map((candidate) => candidate.id);
}

export function objectIsEditable(document: ModelDocument, object: BoxObject): boolean {
  const layer = findLayer(document, object.layerId);
  return Boolean(layer?.visible && !layer.locked && !object.locked);
}

export function lineIsEditable(document: ModelDocument, line: LineObject): boolean {
  const layer = findLayer(document, line.layerId);
  return Boolean(layer?.visible && !layer.locked && !line.locked);
}

export function polylineIsEditable(document: ModelDocument, polyline: PolylineObject): boolean {
  const layer = findLayer(document, polyline.layerId);
  return Boolean(layer?.visible && !layer.locked && !polyline.locked);
}

export function circleIsEditable(document: ModelDocument, circle: CircleObject): boolean {
  const layer = findLayer(document, circle.layerId);
  return Boolean(layer?.visible && !layer.locked && !circle.locked);
}

export function arcIsEditable(document: ModelDocument, arc: ArcObject): boolean {
  const layer = findLayer(document, arc.layerId);
  return Boolean(layer?.visible && !layer.locked && !arc.locked);
}

export function updateBoxObject(
  document: ModelDocument,
  objectId: string,
  model: BoxModel,
): ModelDocument | null {
  const existing = findBoxObject(document, objectId);
  if (!existing || !objectIsEditable(document, existing)) return null;
  return withObjects(
    document,
    document.objects.map((object) =>
      object.id === objectId
        ? { ...cloneBoxModel(model), groupId: object.groupId, id: object.id, layerId: object.layerId, locked: object.locked, name: object.name, productObjectTypeId: object.productObjectTypeId, storyId: object.storyId, type: "box" }
        : cloneBoxObject(object),
    ),
  );
}

export function setBoxObjectPosition(
  document: ModelDocument,
  objectId: string,
  axis: AxisKey,
  value: number,
): ModelDocument | null {
  const object = findBoxObject(document, objectId);
  if (!object || !objectIsEditable(document, object) || !Number.isFinite(value)) return null;
  const snapped = Math.round(value * 16) / 16;
  if (Math.abs(snapped) > MAXIMUM_COORDINATE) return null;
  const next = cloneBoxModel(object);
  next.position[axis] = snapped;
  return updateBoxObject(document, objectId, next);
}

export function moveBoxObject(
  document: ModelDocument,
  objectId: string,
  axis: AxisKey,
  distance: number,
): ModelDocument | null {
  const object = findBoxObject(document, objectId);
  if (!object || !Number.isFinite(distance)) return null;
  return setBoxObjectPosition(
    document,
    objectId,
    axis,
    object.position[axis] + distance,
  );
}

export function moveBoxObjects(
  document: ModelDocument,
  objectIds: string[],
  axis: AxisKey,
  distance: number,
): ModelDocument | null {
  const ids = new Set(objectIds);
  if (!ids.size || !Number.isFinite(distance)) return null;
  const snappedDistance = Math.round(distance * 16) / 16;
  if (document.objects.filter((object) => ids.has(object.id)).length !== ids.size) return null;
  if (document.objects.some((object) => ids.has(object.id) && !objectIsEditable(document, object))) return null;
  if (
    document.objects.some(
      (object) => ids.has(object.id) &&
        Math.abs(object.position[axis] + snappedDistance) > MAXIMUM_COORDINATE,
    )
  ) {
    return null;
  }
  return withObjects(
    document,
    document.objects.map((object) => {
      if (!ids.has(object.id)) return object;
      const next = cloneBoxObject(object);
      next.position[axis] = Math.round((next.position[axis] + snappedDistance) * 16) / 16;
      return next;
    }),
  );
}

export function alignBoxObjects(
  document: ModelDocument,
  objectIds: string[],
  anchorObjectId: string,
  axis: AxisKey,
  mode: AlignmentMode,
): ModelDocument | null {
  const ids = new Set(objectIds);
  const anchor = findBoxObject(document, anchorObjectId);
  if (ids.size < 2 || !anchor || !ids.has(anchorObjectId)) return null;
  if (document.objects.filter((object) => ids.has(object.id)).length !== ids.size) return null;
  if (document.objects.some((object) => ids.has(object.id) && !objectIsEditable(document, object))) return null;
  const factor = mode === "minimum" ? 0 : mode === "center" ? 0.5 : 1;
  const anchorBounds = boxWorldBounds(anchor);
  const anchorCoordinate = anchorBounds.minimum[axis] +
    (anchorBounds.maximum[axis] - anchorBounds.minimum[axis]) * factor;
  const positions = new Map<string, number>();
  for (const object of document.objects) {
    if (!ids.has(object.id) || object.id === anchorObjectId) continue;
    const bounds = boxWorldBounds(object);
    const objectCoordinate = bounds.minimum[axis] +
      (bounds.maximum[axis] - bounds.minimum[axis]) * factor;
    const position = Math.round((object.position[axis] + anchorCoordinate - objectCoordinate) * 16) / 16;
    if (Math.abs(position) > MAXIMUM_COORDINATE) return null;
    positions.set(object.id, position);
  }
  return withObjects(
    document,
    document.objects.map((object) => {
      const position = positions.get(object.id);
      if (position === undefined) return object;
      const next = cloneBoxObject(object);
      next.position[axis] = position;
      return next;
    }),
  );
}

export function rotateBoxObjects(
  document: ModelDocument,
  objectIds: string[],
  anchorObjectId: string,
  deltaDegrees: number,
  baseKey: RotationBaseKey,
): ModelDocument | null {
  const ids = new Set(objectIds);
  const anchor = findBoxObject(document, anchorObjectId);
  if (!ids.size || !anchor || !ids.has(anchorObjectId) || !Number.isFinite(deltaDegrees)) return null;
  const selected = document.objects.filter((object) => ids.has(object.id));
  if (selected.length !== ids.size || selected.some((object) => !objectIsEditable(document, object))) return null;
  const basePoint = rotationBasePoint(anchor, baseKey);
  const rotated = new Map<string, BoxObject>();
  for (const object of selected) {
    const next = rotateBoxModel(object, deltaDegrees, basePoint);
    if (!next) return null;
    rotated.set(object.id, { ...cloneBoxObject(object), ...next });
  }
  return withObjects(
    document,
    document.objects.map((object) => rotated.get(object.id) ?? object),
  );
}

function intervalsOverlap(
  aMinimum: number,
  aMaximum: number,
  bMinimum: number,
  bMaximum: number,
): boolean {
  return aMinimum <= bMaximum && bMinimum <= aMaximum;
}

export function snapObjectMoveDistance(
  document: ModelDocument,
  objectId: string,
  axis: AxisKey,
  distance: number,
  threshold = 3,
): { distance: number; snapped: boolean } {
  const source = findBoxObject(document, objectId);
  const gridDistance = Math.round(distance * 16) / 16;
  if (!source || !Number.isFinite(gridDistance) || threshold < 0) {
    return { distance: gridDistance, snapped: false };
  }

  const sourceBounds = boxWorldBounds(source);
  const sourceMinimum = sourceBounds.minimum[axis] + gridDistance;
  const sourceMaximum = sourceBounds.maximum[axis] + gridDistance;
  const orthogonalAxes = (["x", "y", "z"] as AxisKey[]).filter(
    (candidate) => candidate !== axis,
  );
  let bestCorrection: number | null = null;

  document.objects.forEach((object) => {
    if (object.id === objectId || !findLayer(document, object.layerId)?.visible) return;
    const overlaps = orthogonalAxes.every((orthogonalAxis) => {
      const objectBounds = boxWorldBounds(object);
      return intervalsOverlap(
        sourceBounds.minimum[orthogonalAxis],
        sourceBounds.maximum[orthogonalAxis],
        objectBounds.minimum[orthogonalAxis],
        objectBounds.maximum[orthogonalAxis],
      );
    });
    if (!overlaps) return;

    const targetBounds = boxWorldBounds(object);
    const targetMinimum = targetBounds.minimum[axis];
    const targetMaximum = targetBounds.maximum[axis];
    const corrections = [
      targetMinimum - sourceMaximum,
      targetMaximum - sourceMinimum,
      targetMinimum - sourceMinimum,
      targetMaximum - sourceMaximum,
    ];
    corrections.forEach((correction) => {
      if (Math.abs(correction) > threshold) return;
      if (bestCorrection === null || Math.abs(correction) < Math.abs(bestCorrection)) {
        bestCorrection = correction;
      }
    });
  });

  if (bestCorrection === null) return { distance: gridDistance, snapped: false };
  return {
    distance: Math.round((gridDistance + bestCorrection) * 16) / 16,
    snapped: true,
  };
}

function nextObjectNumber(document: ModelDocument): number {
  const usedNumbers = document.objects.map((object) => {
    const match = /^box-(\d+)$/i.exec(object.id);
    return match ? Number(match[1]) : 0;
  });
  return Math.max(0, ...usedNumbers) + 1;
}

function uniqueObjectName(document: ModelDocument, desiredName: string): string {
  const existing = new Set([
    ...document.arcs.map((arc) => arc.name.toLowerCase()),
    ...document.circles.map((circle) => circle.name.toLowerCase()),
    ...document.objects.map((object) => object.name.toLowerCase()),
    ...document.lines.map((line) => line.name.toLowerCase()),
    ...document.polylines.map((polyline) => polyline.name.toLowerCase()),
  ]);
  const maximumAttempts = MAXIMUM_OBJECT_COUNT + MAXIMUM_LINE_COUNT + MAXIMUM_POLYLINE_COUNT + MAXIMUM_CIRCLE_COUNT + MAXIMUM_ARC_COUNT + 1;
  for (let copyNumber = 1; copyNumber <= maximumAttempts; copyNumber += 1) {
    const suffix = copyNumber === 1 ? "" : ` ${copyNumber}`;
    const candidate = `${desiredName.slice(0, 120 - suffix.length).trimEnd()}${suffix}`;
    if (!existing.has(candidate.toLowerCase())) return candidate;
  }
  return "Box Copy";
}

export function activeStoryRoughFloorElevation(document: ModelDocument): number {
  return calculateStoryElevations(document.building).find(
    (calculation) => calculation.storyId === document.building.activeStoryId,
  )?.roughFloorElevation ?? 0;
}

export function addBoxObject(document: ModelDocument): {
  document: ModelDocument;
  object: BoxObject;
} | null {
  if (document.objects.length >= MAXIMUM_OBJECT_COUNT) return null;
  const number = nextObjectNumber(document);
  const rightEdge = Math.max(
    0,
    ...document.objects.map((object) => boxWorldBounds(object).maximum.x),
  );
  const object: BoxObject = {
    ...cloneBoxModel(DEFAULT_BOX_MODEL),
    groupId: null,
    id: `box-${String(number).padStart(2, "0")}`,
    layerId: document.activeLayerId,
    locked: false,
    name: `Box ${String(number).padStart(2, "0")}`,
    productObjectTypeId: null,
    position: { x: rightEdge + 24, y: 0, z: activeStoryRoughFloorElevation(document) },
    storyId: document.building.activeStoryId,
    type: "box",
  };
  return {
    document: withObjects(document, [...document.objects, object]),
    object: cloneBoxObject(object),
  };
}

export function addProductObject(document: ModelDocument, productType: ProductObjectType): {
  document: ModelDocument;
  object: BoxObject;
} | null {
  if (document.objects.length >= MAXIMUM_OBJECT_COUNT || !document.building.productObjectTypes.some((type) => type.id === productType.id)) return null;
  const number = nextObjectNumber(document);
  const rightEdge = Math.max(0, ...document.objects.map((object) => boxWorldBounds(object).maximum.x));
  const object: BoxObject = {
    dimensions: { ...productType.dimensions },
    groupId: null,
    id: `box-${String(number).padStart(2, "0")}`,
    layerId: document.activeLayerId,
    locked: false,
    name: uniqueObjectName(document, productType.name),
    position: { x: snapToSixteenth(rightEdge + productType.dimensions.length / 2 + 12), y: 0, z: activeStoryRoughFloorElevation(document) },
    productObjectTypeId: productType.id,
    rotationZ: 0,
    storyId: document.building.activeStoryId,
    type: "box",
  };
  return { document: withObjects(document, [...document.objects, object]), object: cloneBoxObject(object) };
}

function nextLineNumber(document: ModelDocument): number {
  const usedNumbers = document.lines.map((line) => {
    const match = /^line-(\d+)$/i.exec(line.id);
    return match ? Number(match[1]) : 0;
  });
  return Math.max(0, ...usedNumbers) + 1;
}

export function addLineObject(
  document: ModelDocument,
  start: LinePoint,
  end: LinePoint,
): { document: ModelDocument; line: LineObject } | null {
  if (document.lines.length >= MAXIMUM_LINE_COUNT) return null;
  const geometry: LineGeometry = {
    start: { x: Math.round(start.x * 16) / 16, y: Math.round(start.y * 16) / 16, z: Math.round(start.z * 16) / 16 },
    end: { x: Math.round(end.x * 16) / 16, y: Math.round(end.y * 16) / 16, z: Math.round(end.z * 16) / 16 },
  };
  if (!lineGeometryIsValid(geometry)) return null;
  const number = nextLineNumber(document);
  const line: LineObject = {
    ...geometry,
    architecturalRole: null,
    foundationSupportWallId: null,
    foundationWallTypeId: null,
    id: `line-${String(number).padStart(2, "0")}`,
    layerId: document.activeLayerId,
    locked: false,
    name: uniqueObjectName(document, `Line ${String(number).padStart(2, "0")}`),
    storyId: document.building.activeStoryId,
    type: "line",
    wallExteriorSide: null,
    wallJoinPriority: null,
    wallStartJoinMode: null,
    wallEndJoinMode: null,
    wallReferenceLine: null,
    wallTypeId: null,
    wallOpenings: [],
  };
  return { document: withLines(document, [...document.lines, line]), line: cloneLineObject(line) };
}

export function updateLineObject(
  document: ModelDocument,
  lineId: string,
  geometry: LineGeometry,
): ModelDocument | null {
  const line = findLineObject(document, lineId);
  if (!line || !lineIsEditable(document, line)) return null;
  const normalizedGeometry = cloneLineGeometry(geometry);
  if (line.architecturalRole !== null) {
    const roughFloor = calculateStoryElevations(document.building).find((story) => story.storyId === line.storyId)?.roughFloorElevation;
    if (roughFloor === undefined) return null;
    normalizedGeometry.start.z = roughFloor;
    normalizedGeometry.end.z = roughFloor;
  }
  if (!lineGeometryIsValid(normalizedGeometry)) return null;
  if (line.architecturalRole === "wall") {
    const story = document.building.stories.find((candidate) => candidate.id === line.storyId);
    if (!story || !wallOpeningsAreValid({ ...line, ...normalizedGeometry }, story.roughCeilingHeight)) return null;
  }
  return withLines(document, document.lines.map((candidate) =>
    candidate.id === lineId ? { ...cloneLineObject(candidate), ...normalizedGeometry } : candidate,
  ));
}

export function createWallFromLine(document: ModelDocument, lineId: string): ModelDocument | null {
  const line = findLineObject(document, lineId);
  const wallType = document.building.wallTypes.find((candidate) => candidate.id === document.building.activeWallTypeId);
  const roughFloor = calculateStoryElevations(document.building).find((story) => story.storyId === line?.storyId)?.roughFloorElevation;
  if (!line || !wallType || roughFloor === undefined || !lineIsEditable(document, line) || Math.hypot(line.end.x - line.start.x, line.end.y - line.start.y) < 1 / 16) return null;
  const lineNumber = /^Line\s+(.+)$/i.exec(line.name)?.[1];
  const wallName = line.name.startsWith("Wall ") ? line.name : lineNumber ? `Wall ${lineNumber}` : `Wall ${line.name}`;
  return withLines(document, document.lines.map((candidate) => candidate.id === lineId ? {
    ...cloneLineObject(candidate),
    architecturalRole: "wall",
    foundationSupportWallId: automaticFoundationSupportWall(document, candidate)?.id ?? null,
    foundationWallTypeId: null,
    end: { ...candidate.end, z: roughFloor },
    layerId: STANDARD_LAYER_IDS.wall,
    name: candidate.name.startsWith("Wall ") ? candidate.name : uniqueObjectName(document, wallName),
    start: { ...candidate.start, z: roughFloor },
    wallExteriorSide: "left",
    wallJoinPriority: 0,
    wallStartJoinMode: "auto",
    wallEndJoinMode: "auto",
    wallReferenceLine: "exterior-main",
    wallTypeId: wallType.id,
  } : candidate));
}

export function createFoundationWallFromLine(document: ModelDocument, lineId: string): ModelDocument | null {
  const line = findLineObject(document, lineId);
  const foundationType = document.building.foundationWallTypes.find((candidate) => candidate.id === document.building.activeFoundationWallTypeId);
  const roughFloor = calculateStoryElevations(document.building).find((story) => story.storyId === line?.storyId)?.roughFloorElevation;
  if (!line || !foundationType || roughFloor === undefined || !lineIsEditable(document, line) || Math.hypot(line.end.x - line.start.x, line.end.y - line.start.y) < 1 / 16) return null;
  const lineNumber = /^Line\s+(.+)$/i.exec(line.name)?.[1];
  const foundationName = line.name.startsWith("Foundation Wall ") ? line.name : lineNumber ? `Foundation Wall ${lineNumber}` : `Foundation Wall ${line.name}`;
  return withLines(document, document.lines.map((candidate) => candidate.id === lineId ? {
    ...cloneLineObject(candidate),
    architecturalRole: "foundation-wall",
    end: { ...candidate.end, z: roughFloor },
    foundationSupportWallId: null,
    foundationWallTypeId: foundationType.id,
    layerId: STANDARD_LAYER_IDS["foundation-wall"],
    name: candidate.name.startsWith("Foundation Wall ") ? candidate.name : uniqueObjectName(document, foundationName),
    start: { ...candidate.start, z: roughFloor },
    wallExteriorSide: "left",
    wallJoinPriority: 0,
    wallStartJoinMode: "auto",
    wallEndJoinMode: "auto",
    wallReferenceLine: "exterior-main",
    wallTypeId: null,
    wallOpenings: [],
  } : candidate));
}

export function removeWallRole(document: ModelDocument, lineId: string): ModelDocument | null {
  const line = findLineObject(document, lineId);
  if (!line || line.architecturalRole === null || !lineIsEditable(document, line)) return null;
  return withLines(document, document.lines.map((candidate) => candidate.id === lineId ? { ...cloneLineObject(candidate), architecturalRole: null, foundationSupportWallId: null, foundationWallTypeId: null, wallExteriorSide: null, wallJoinPriority: null, wallStartJoinMode: null, wallEndJoinMode: null, wallReferenceLine: null, wallTypeId: null, wallOpenings: [] } : candidate));
}

function nextWallOpeningId(line: LineObject): string {
  let number = 1;
  const ids = new Set(line.wallOpenings.map((opening) => opening.id));
  while (ids.has(`opening-${String(number).padStart(2, "0")}`)) number += 1;
  return `opening-${String(number).padStart(2, "0")}`;
}

function nextWallOpeningName(line: LineObject, kind: WallOpeningKind): string {
  const prefix = kind === "door" ? "Door" : "Window";
  const names = new Set(line.wallOpenings.map((opening) => opening.name.toLowerCase()));
  let number = 1;
  while (names.has(`${prefix} ${String(number).padStart(2, "0")}`.toLowerCase())) number += 1;
  return `${prefix} ${String(number).padStart(2, "0")}`;
}

export function addWallOpening(
  document: ModelDocument,
  lineId: string,
  kind: WallOpeningKind,
): { document: ModelDocument; opening: WallOpening } | null {
  const line = findLineObject(document, lineId);
  const story = document.building.stories.find((candidate) => candidate.id === line?.storyId);
  const wallType = document.building.wallTypes.find((candidate) => candidate.id === line?.wallTypeId);
  const activeOpeningTypeId = kind === "door" ? document.building.activeDoorTypeId : document.building.activeWindowTypeId;
  const openingType = document.building.openingTypes.find((candidate) => candidate.id === activeOpeningTypeId && candidate.kind === kind);
  if (!line || line.architecturalRole !== "wall" || !story || !wallType || !openingType || !lineIsEditable(document, line) || line.wallOpenings.length >= MAXIMUM_WALL_OPENING_COUNT || !wallOpeningTypeFitsWall(document.building, line, openingType)) return null;
  const wallHeight = wallVerticalExtent(document, line)?.height ?? story.roughCeilingHeight;
  const defaults = {
    headerBottomHeight: kind === "door" ? openingType.roughHeight : Math.min(openingType.defaultHeaderBottomHeight, wallHeight),
    roughHeight: openingType.roughHeight,
    roughWidth: openingType.roughWidth,
    unitHeight: openingType.unitHeight,
    unitWidth: openingType.unitWidth,
  };
  if (defaults.headerBottomHeight > wallHeight || defaults.headerBottomHeight < defaults.roughHeight) return null;
  const length = Math.hypot(line.end.x - line.start.x, line.end.y - line.start.y);
  const wrapDepth = wallType.layers.filter((layer) => wallType.wallEndCapLayerIds?.includes(layer.id)).reduce((total, layer) => total + layer.thickness, 0);
  const occupied = line.wallOpenings.map((opening) => ({ start: opening.centerOffset - opening.roughWidth / 2, end: opening.centerOffset + opening.roughWidth / 2 })).sort((first, second) => first.start - second.start);
  const gaps: Array<{ end: number; start: number }> = [];
  let cursor = wrapDepth;
  occupied.forEach((interval) => { if (interval.start > cursor) gaps.push({ start: cursor, end: interval.start }); cursor = Math.max(cursor, interval.end); });
  if (length - wrapDepth > cursor) gaps.push({ start: cursor, end: length - wrapDepth });
  const gap = gaps.filter((candidate) => candidate.end - candidate.start >= defaults.roughWidth).sort((first, second) => (second.end - second.start) - (first.end - first.start))[0];
  if (!gap) return null;
  const id = nextWallOpeningId(line);
  const opening: WallOpening = {
    ...defaults,
    centerOffset: snapToSixteenth((gap.start + gap.end) / 2),
    componentOverrides: [],
    headerTypeIdOverride: null,
    id,
    kind,
    layerId: STANDARD_LAYER_IDS[kind],
    name: nextWallOpeningName(line, kind),
    wallOpeningTypeId: openingType.id,
  };
  const nextLine = { ...cloneLineObject(line), wallOpenings: [...line.wallOpenings.map((candidate) => ({ ...candidate })), opening].sort((first, second) => first.centerOffset - second.centerOffset) };
  if (!wallOpeningsAreValid(nextLine, wallHeight)) return null;
  return { document: withLines(document, document.lines.map((candidate) => candidate.id === lineId ? nextLine : candidate)), opening: { ...opening } };
}

export function updateWallOpening(
  document: ModelDocument,
  lineId: string,
  openingId: string,
  change: Partial<Pick<WallOpening, "centerOffset" | "componentOverrides" | "headerBottomHeight" | "headerTypeIdOverride" | "name" | "roughHeight" | "roughWidth" | "unitHeight" | "unitWidth">>,
): ModelDocument | null {
  const line = findLineObject(document, lineId);
  const story = document.building.stories.find((candidate) => candidate.id === line?.storyId);
  const opening = line?.wallOpenings.find((candidate) => candidate.id === openingId);
  if (!line || line.architecturalRole !== "wall" || !story || !opening || !lineIsEditable(document, line) || (change.headerTypeIdOverride !== undefined && change.headerTypeIdOverride !== null && !document.building.headerTypes.some((type) => type.id === change.headerTypeIdOverride))) return null;
  const wallHeight = wallVerticalExtent(document, line)?.height ?? story.roughCeilingHeight;
  const updated = { ...opening, ...change };
  updated.name = updated.name.trim();
  if (updated.kind === "door") updated.headerBottomHeight = updated.roughHeight;
  const nextLine = { ...cloneLineObject(line), wallOpenings: line.wallOpenings.map((candidate) => candidate.id === openingId ? { ...updated, componentOverrides: updated.componentOverrides.map((override) => ({ ...override })) } : { ...candidate, componentOverrides: candidate.componentOverrides.map((override) => ({ ...override })) }).sort((first, second) => first.centerOffset - second.centerOffset) };
  if (!wallOpeningsAreValid(nextLine, wallHeight)) return null;
  const next = withLines(document, document.lines.map((candidate) => candidate.id === lineId ? nextLine : candidate));
  return documentWallHeaderAssembliesFit(next) && documentOpeningComponentOverridesAreValid(next) ? next : null;
}

export function deleteWallOpening(document: ModelDocument, lineId: string, openingId: string): ModelDocument | null {
  const line = findLineObject(document, lineId);
  if (!line || line.architecturalRole !== "wall" || !line.wallOpenings.some((opening) => opening.id === openingId) || !lineIsEditable(document, line)) return null;
  return withLines(document, document.lines.map((candidate) => candidate.id === lineId ? { ...cloneLineObject(candidate), wallOpenings: candidate.wallOpenings.filter((opening) => opening.id !== openingId).map((opening) => ({ ...opening })) } : candidate));
}

export function assignWallOpeningType(document: ModelDocument, lineId: string, openingId: string, typeId: string): ModelDocument | null {
  const line = findLineObject(document, lineId);
  const story = document.building.stories.find((candidate) => candidate.id === line?.storyId);
  const opening = line?.wallOpenings.find((candidate) => candidate.id === openingId);
  const type = document.building.openingTypes.find((candidate) => candidate.id === typeId);
  if (!line || line.architecturalRole !== "wall" || !story || !opening || !type || type.kind !== opening.kind || !lineIsEditable(document, line) || !wallOpeningTypeFitsWall(document.building, line, type, opening.headerTypeIdOverride)) return null;
  const wallHeight = wallVerticalExtent(document, line)?.height ?? story.roughCeilingHeight;
  const updated: WallOpening = {
    ...opening,
    componentOverrides: [],
    headerBottomHeight: type.kind === "door" ? type.roughHeight : Math.min(type.defaultHeaderBottomHeight, wallHeight),
    roughHeight: type.roughHeight,
    roughWidth: type.roughWidth,
    unitHeight: type.unitHeight,
    unitWidth: type.unitWidth,
    wallOpeningTypeId: type.id,
  };
  const nextLine = { ...cloneLineObject(line), wallOpenings: line.wallOpenings.map((candidate) => candidate.id === openingId ? { ...updated, componentOverrides: [] } : { ...candidate, componentOverrides: candidate.componentOverrides.map((override) => ({ ...override })) }).sort((first, second) => first.centerOffset - second.centerOffset) };
  if (!wallOpeningsAreValid(nextLine, wallHeight)) return null;
  const next = withLines(document, document.lines.map((candidate) => candidate.id === lineId ? nextLine : candidate));
  return documentOpeningComponentOverridesAreValid(next) ? next : null;
}

export function assignWallType(document: ModelDocument, lineId: string, wallTypeId: string): ModelDocument | null {
  const line = findLineObject(document, lineId);
  if (!line || line.architecturalRole !== "wall" || !lineIsEditable(document, line) || !document.building.wallTypes.some((wallType) => wallType.id === wallTypeId)) return null;
  const next = withLines(document, document.lines.map((candidate) => candidate.id === lineId ? { ...cloneLineObject(candidate), wallTypeId } : candidate));
  return documentWallHeaderAssembliesFit(next) ? next : null;
}

export function assignFoundationWallType(document: ModelDocument, lineId: string, foundationWallTypeId: string): ModelDocument | null {
  const line = findLineObject(document, lineId);
  if (!line || line.architecturalRole !== "foundation-wall" || !lineIsEditable(document, line) || !document.building.foundationWallTypes.some((type) => type.id === foundationWallTypeId)) return null;
  return withLines(document, document.lines.map((candidate) => candidate.id === lineId ? { ...cloneLineObject(candidate), foundationWallTypeId } : candidate));
}

export function assignWallFoundationSupport(document: ModelDocument, lineId: string, foundationSupportWallId: string | null): ModelDocument | null {
  const line = findLineObject(document, lineId);
  const support = foundationSupportWallId === null ? null : findLineObject(document, foundationSupportWallId);
  if (
    !line || line.architecturalRole !== "wall" || !lineIsEditable(document, line) ||
    (foundationSupportWallId !== null && (!support || support.architecturalRole !== "foundation-wall" || support.storyId !== line.storyId))
  ) return null;
  return withLines(document, document.lines.map((candidate) => candidate.id === lineId
    ? { ...cloneLineObject(candidate), foundationSupportWallId }
    : candidate));
}

export function updateWallPlacement(
  document: ModelDocument,
  lineId: string,
  change: { endJoinMode?: WallJoinMode; exteriorSide?: WallExteriorSide; joinPriority?: number; referenceLine?: WallReferenceLine; startJoinMode?: WallJoinMode },
): ModelDocument | null {
  const line = findLineObject(document, lineId);
  if (
    !line ||
    line.architecturalRole === null ||
    !lineIsEditable(document, line) ||
    (change.exteriorSide !== undefined && !WALL_EXTERIOR_SIDES.includes(change.exteriorSide)) ||
    (change.referenceLine !== undefined && !WALL_REFERENCE_LINES.includes(change.referenceLine)) ||
    (change.startJoinMode !== undefined && !WALL_JOIN_MODES.includes(change.startJoinMode)) ||
    (change.endJoinMode !== undefined && !WALL_JOIN_MODES.includes(change.endJoinMode)) ||
    (change.joinPriority !== undefined && (!Number.isInteger(change.joinPriority) || change.joinPriority < MINIMUM_WALL_JOIN_PRIORITY || change.joinPriority > MAXIMUM_WALL_JOIN_PRIORITY))
  ) return null;
  return withLines(document, document.lines.map((candidate) => candidate.id === lineId ? {
    ...cloneLineObject(candidate),
    wallExteriorSide: change.exteriorSide ?? candidate.wallExteriorSide,
    wallJoinPriority: change.joinPriority ?? candidate.wallJoinPriority,
    wallStartJoinMode: change.startJoinMode ?? candidate.wallStartJoinMode,
    wallEndJoinMode: change.endJoinMode ?? candidate.wallEndJoinMode,
    wallReferenceLine: change.referenceLine ?? candidate.wallReferenceLine,
  } : candidate));
}

export function updateLineGrip(
  document: ModelDocument,
  lineId: string,
  grip: "start" | "midpoint" | "end",
  target: LinePoint,
): ModelDocument | null {
  const line = findLineObject(document, lineId);
  if (!line) return null;
  const geometry = moveLineGrip(line, grip, target);
  return geometry ? updateLineObject(document, lineId, geometry) : null;
}

export function renameLineObject(document: ModelDocument, lineId: string, name: string): ModelDocument | null {
  const normalizedName = name.trim();
  const line = findLineObject(document, lineId);
  if (!line || !lineIsEditable(document, line) || !normalizedName || normalizedName.length > 120) return null;
  if (document.lines.some((candidate) => candidate.id !== lineId && candidate.name.toLowerCase() === normalizedName.toLowerCase()) ||
      document.objects.some((object) => object.name.toLowerCase() === normalizedName.toLowerCase()) ||
      document.polylines.some((polyline) => polyline.name.toLowerCase() === normalizedName.toLowerCase()) ||
      document.circles.some((circle) => circle.name.toLowerCase() === normalizedName.toLowerCase()) ||
      document.arcs.some((arc) => arc.name.toLowerCase() === normalizedName.toLowerCase())) return null;
  return withLines(document, document.lines.map((candidate) =>
    candidate.id === lineId ? { ...cloneLineObject(candidate), name: normalizedName } : candidate,
  ));
}

export function assignLineToLayer(document: ModelDocument, lineId: string, layerId: string): ModelDocument | null {
  const line = findLineObject(document, lineId);
  if (!line || !lineIsEditable(document, line) || !findLayer(document, layerId)) return null;
  return withLines(document, document.lines.map((candidate) =>
    candidate.id === lineId ? { ...cloneLineObject(candidate), layerId } : candidate,
  ));
}

export function setLineLocked(document: ModelDocument, lineId: string, locked: boolean): ModelDocument | null {
  if (!findLineObject(document, lineId)) return null;
  return withLines(document, document.lines.map((line) =>
    line.id === lineId ? { ...cloneLineObject(line), locked } : line,
  ));
}

export function deleteLineObject(document: ModelDocument, lineId: string): ModelDocument | null {
  const line = findLineObject(document, lineId);
  if (!line || !lineIsEditable(document, line)) return null;
  return withLines(document, document.lines.filter((candidate) => candidate.id !== lineId));
}

function nextPolylineNumber(document: ModelDocument): number {
  const usedNumbers = document.polylines.map((polyline) => {
    const match = /^polyline-(\d+)$/i.exec(polyline.id);
    return match ? Number(match[1]) : 0;
  });
  return Math.max(0, ...usedNumbers) + 1;
}

export function addPolylineObject(
  document: ModelDocument,
  geometry: PolylineGeometry,
  shape: "polyline" | "rectangle" = "polyline",
): { document: ModelDocument; polyline: PolylineObject } | null {
  if (document.polylines.length >= MAXIMUM_POLYLINE_COUNT || !polylineGeometryIsValid(geometry)) return null;
  const number = nextPolylineNumber(document);
  const baseName = `${shape === "rectangle" ? "Rectangle" : "Polyline"} ${String(number).padStart(2, "0")}`;
  const polyline: PolylineObject = {
    ...clonePolylineGeometry(geometry),
    architecturalRole: null,
    id: `polyline-${String(number).padStart(2, "0")}`,
    layerId: document.activeLayerId,
    locked: false,
    name: uniqueObjectName(document, baseName),
    shape,
    storyId: document.building.activeStoryId,
    type: "polyline",
  };
  return { document: withPolylines(document, [...document.polylines, polyline]), polyline: clonePolylineObject(polyline) };
}

export function addRectangleObject(document: ModelDocument, start: PlanPoint, end: PlanPoint, elevation = 0) {
  const rectangle = rectangleFromCorners(start, end, elevation);
  return rectangle ? addPolylineObject(document, rectangle, "rectangle") : null;
}

function visibleBoundarySources(document: ModelDocument): BoundarySource[] {
  const visibleLayerIds = new Set(document.layers.filter((layer) => layer.visible).map((layer) => layer.id));
  return [
    ...document.lines.filter((line) => visibleLayerIds.has(line.layerId)).map((line) => ({ geometry: cloneLineGeometry(line), kind: "line" as const })),
    ...document.polylines.filter((polyline) => visibleLayerIds.has(polyline.layerId)).map((polyline) => ({ geometry: clonePolylineGeometry(polyline), kind: "polyline" as const })),
    ...document.circles.filter((circle) => visibleLayerIds.has(circle.layerId)).map((circle) => ({ geometry: cloneCircleGeometry(circle), kind: "circle" as const })),
    ...document.arcs.filter((arc) => visibleLayerIds.has(arc.layerId)).map((arc) => ({ geometry: cloneArcGeometry(arc), kind: "arc" as const })),
  ];
}

export function discoverDocumentBoundary(
  document: ModelDocument,
  pick: LinePoint,
  elevation = pick.z,
): BoundaryDiscoveryResult | null {
  return discoverBoundaryAtPoint(visibleBoundarySources(document), pick, elevation);
}

export function createBoundaryPolylineObject(
  document: ModelDocument,
  pick: LinePoint,
  elevation = pick.z,
): { document: ModelDocument; polyline: PolylineObject } | null {
  const activeLayer = findLayer(document, document.activeLayerId);
  if (!activeLayer || !activeLayer.visible || activeLayer.locked) return null;
  const boundary = discoverDocumentBoundary(document, pick, elevation);
  return boundary ? addPolylineObject(document, boundary.geometry, "polyline") : null;
}

export function updatePolylineObject(document: ModelDocument, polylineId: string, geometry: PolylineGeometry): ModelDocument | null {
  const polyline = findPolylineObject(document, polylineId);
  if (!polyline || !polylineIsEditable(document, polyline) || !polylineGeometryIsValid(geometry)) return null;
  return withPolylines(document, document.polylines.map((candidate) =>
    candidate.id === polylineId ? {
      ...clonePolylineObject(candidate),
      ...clonePolylineGeometry(geometry),
      architecturalRole: geometry.closed ? candidate.architecturalRole : null,
      elevation: candidate.architecturalRole === "floor-platform" ? candidate.elevation : geometry.elevation,
    } : candidate,
  ));
}

export function createFloorPlatformFromPolyline(document: ModelDocument, polylineId: string): ModelDocument | null {
  const polyline = findPolylineObject(document, polylineId);
  if (!polyline || !polyline.closed || !polylineIsEditable(document, polyline)) return null;
  const story = document.building.stories.find((candidate) => candidate.id === polyline.storyId);
  if (!story || !story.floorStructure.layers.length) return null;
  const roughFloorElevation = calculateStoryElevations(document.building).find((candidate) => candidate.storyId === polyline.storyId)?.roughFloorElevation;
  if (roughFloorElevation === undefined) return null;
  return withPolylines(document, document.polylines.map((candidate) => candidate.id === polylineId
    ? { ...clonePolylineObject(candidate), architecturalRole: "floor-platform", elevation: roughFloorElevation, layerId: STANDARD_LAYER_IDS["floor-platform"], name: candidate.name.startsWith("Floor Platform") ? candidate.name : uniqueObjectName(document, `Floor Platform ${candidate.name}`) }
    : candidate));
}

export function removeFloorPlatformRole(document: ModelDocument, polylineId: string): ModelDocument | null {
  const polyline = findPolylineObject(document, polylineId);
  if (!polyline || polyline.architecturalRole !== "floor-platform" || !polylineIsEditable(document, polyline)) return null;
  return withPolylines(document, document.polylines.map((candidate) => candidate.id === polylineId
    ? { ...clonePolylineObject(candidate), architecturalRole: null }
    : candidate));
}

export function updatePolylineObjectVertex(document: ModelDocument, polylineId: string, index: number, point: PlanPoint): ModelDocument | null {
  const polyline = findPolylineObject(document, polylineId);
  if (!polyline) return null;
  const geometry = polyline.shape === "rectangle"
    ? moveRectangleGrip(polyline, { index, kind: "corner" }, point)
    : updatePolylineVertex(polyline, index, point);
  return geometry ? updatePolylineObject(document, polylineId, geometry) : null;
}

export function updatePolylineObjectGrip(document: ModelDocument, polylineId: string, grip: RectangleGrip, point: PlanPoint): ModelDocument | null {
  const polyline = findPolylineObject(document, polylineId);
  if (!polyline || polyline.shape !== "rectangle") return null;
  const geometry = moveRectangleGrip(polyline, grip, point);
  return geometry ? updatePolylineObject(document, polylineId, geometry) : null;
}

export function renamePolylineObject(document: ModelDocument, polylineId: string, name: string): ModelDocument | null {
  const normalizedName = name.trim();
  const polyline = findPolylineObject(document, polylineId);
  if (!polyline || !polylineIsEditable(document, polyline) || !normalizedName || normalizedName.length > 120) return null;
  if (document.polylines.some((candidate) => candidate.id !== polylineId && candidate.name.toLowerCase() === normalizedName.toLowerCase()) ||
      document.lines.some((line) => line.name.toLowerCase() === normalizedName.toLowerCase()) ||
      document.objects.some((object) => object.name.toLowerCase() === normalizedName.toLowerCase()) ||
      document.circles.some((circle) => circle.name.toLowerCase() === normalizedName.toLowerCase()) ||
      document.arcs.some((arc) => arc.name.toLowerCase() === normalizedName.toLowerCase())) return null;
  return withPolylines(document, document.polylines.map((candidate) => candidate.id === polylineId ? { ...clonePolylineObject(candidate), name: normalizedName } : candidate));
}

export function assignPolylineToLayer(document: ModelDocument, polylineId: string, layerId: string): ModelDocument | null {
  const polyline = findPolylineObject(document, polylineId);
  if (!polyline || !polylineIsEditable(document, polyline) || !findLayer(document, layerId)) return null;
  return withPolylines(document, document.polylines.map((candidate) => candidate.id === polylineId ? { ...clonePolylineObject(candidate), layerId } : candidate));
}

export function setPolylineLocked(document: ModelDocument, polylineId: string, locked: boolean): ModelDocument | null {
  if (!findPolylineObject(document, polylineId)) return null;
  return withPolylines(document, document.polylines.map((polyline) => polyline.id === polylineId ? { ...clonePolylineObject(polyline), locked } : polyline));
}

export function deletePolylineObject(document: ModelDocument, polylineId: string): ModelDocument | null {
  const polyline = findPolylineObject(document, polylineId);
  if (!polyline || !polylineIsEditable(document, polyline)) return null;
  return withPolylines(document, document.polylines.filter((candidate) => candidate.id !== polylineId));
}

function nextCircleNumber(document: ModelDocument): number {
  const usedNumbers = document.circles.map((circle) => {
    const match = /^circle-(\d+)$/i.exec(circle.id);
    return match ? Number(match[1]) : 0;
  });
  return Math.max(0, ...usedNumbers) + 1;
}

export function addCircleObject(document: ModelDocument, geometry: CircleGeometry): { document: ModelDocument; circle: CircleObject } | null {
  if (document.circles.length >= MAXIMUM_CIRCLE_COUNT || !circleGeometryIsValid(geometry)) return null;
  const number = nextCircleNumber(document);
  const circle: CircleObject = {
    ...cloneCircleGeometry(geometry),
    id: `circle-${String(number).padStart(2, "0")}`,
    layerId: document.activeLayerId,
    locked: false,
    name: uniqueObjectName(document, `Circle ${String(number).padStart(2, "0")}`),
    storyId: document.building.activeStoryId,
    type: "circle",
  };
  return { document: withCircles(document, [...document.circles, circle]), circle: cloneCircleObject(circle) };
}

export function updateCircleObject(document: ModelDocument, circleId: string, geometry: CircleGeometry): ModelDocument | null {
  const circle = findCircleObject(document, circleId);
  if (!circle || !circleIsEditable(document, circle) || !circleGeometryIsValid(geometry)) return null;
  return withCircles(document, document.circles.map((candidate) =>
    candidate.id === circleId ? { ...cloneCircleObject(candidate), ...cloneCircleGeometry(geometry) } : candidate,
  ));
}

export function updateCircleGrip(document: ModelDocument, circleId: string, grip: CircleGrip, target: LinePoint): ModelDocument | null {
  const circle = findCircleObject(document, circleId);
  if (!circle) return null;
  const geometry = moveCircleGrip(circle, grip, target);
  return geometry ? updateCircleObject(document, circleId, geometry) : null;
}

export function renameCircleObject(document: ModelDocument, circleId: string, name: string): ModelDocument | null {
  const normalizedName = name.trim();
  const circle = findCircleObject(document, circleId);
  if (!circle || !circleIsEditable(document, circle) || !normalizedName || normalizedName.length > 120) return null;
  const existingNames = [...document.objects, ...document.lines, ...document.polylines, ...document.arcs, ...document.circles.filter((candidate) => candidate.id !== circleId)].map((entity) => entity.name.toLowerCase());
  if (existingNames.includes(normalizedName.toLowerCase())) return null;
  return withCircles(document, document.circles.map((candidate) => candidate.id === circleId ? { ...cloneCircleObject(candidate), name: normalizedName } : candidate));
}

export function assignCircleToLayer(document: ModelDocument, circleId: string, layerId: string): ModelDocument | null {
  const circle = findCircleObject(document, circleId);
  if (!circle || !circleIsEditable(document, circle) || !findLayer(document, layerId)) return null;
  return withCircles(document, document.circles.map((candidate) => candidate.id === circleId ? { ...cloneCircleObject(candidate), layerId } : candidate));
}

export function setCircleLocked(document: ModelDocument, circleId: string, locked: boolean): ModelDocument | null {
  if (!findCircleObject(document, circleId)) return null;
  return withCircles(document, document.circles.map((circle) => circle.id === circleId ? { ...cloneCircleObject(circle), locked } : circle));
}

export function deleteCircleObject(document: ModelDocument, circleId: string): ModelDocument | null {
  const circle = findCircleObject(document, circleId);
  if (!circle || !circleIsEditable(document, circle)) return null;
  return withCircles(document, document.circles.filter((candidate) => candidate.id !== circleId));
}

function nextArcNumber(document: ModelDocument): number {
  const usedNumbers = document.arcs.map((arc) => {
    const match = /^arc-(\d+)$/i.exec(arc.id);
    return match ? Number(match[1]) : 0;
  });
  return Math.max(0, ...usedNumbers) + 1;
}

export function addArcObject(document: ModelDocument, geometry: ArcGeometry): { document: ModelDocument; arc: ArcObject } | null {
  if (document.arcs.length >= MAXIMUM_ARC_COUNT || !arcGeometryIsValid(geometry)) return null;
  const number = nextArcNumber(document);
  const arc: ArcObject = {
    ...cloneArcGeometry(geometry),
    id: `arc-${String(number).padStart(2, "0")}`,
    layerId: document.activeLayerId,
    locked: false,
    name: uniqueObjectName(document, `Arc ${String(number).padStart(2, "0")}`),
    storyId: document.building.activeStoryId,
    type: "arc",
  };
  return { document: withArcs(document, [...document.arcs, arc]), arc: cloneArcObject(arc) };
}

export function updateArcObject(document: ModelDocument, arcId: string, geometry: ArcGeometry): ModelDocument | null {
  const arc = findArcObject(document, arcId);
  if (!arc || !arcIsEditable(document, arc) || !arcGeometryIsValid(geometry)) return null;
  return withArcs(document, document.arcs.map((candidate) => candidate.id === arcId ? { ...cloneArcObject(candidate), ...cloneArcGeometry(geometry) } : candidate));
}

export function updateArcGrip(document: ModelDocument, arcId: string, grip: ArcGrip, target: LinePoint): ModelDocument | null {
  const arc = findArcObject(document, arcId);
  if (!arc) return null;
  const geometry = moveArcGrip(arc, grip, target);
  return geometry ? updateArcObject(document, arcId, geometry) : null;
}

export function renameArcObject(document: ModelDocument, arcId: string, name: string): ModelDocument | null {
  const normalizedName = name.trim();
  const arc = findArcObject(document, arcId);
  if (!arc || !arcIsEditable(document, arc) || !normalizedName || normalizedName.length > 120) return null;
  const existingNames = [...document.objects, ...document.lines, ...document.polylines, ...document.circles, ...document.arcs.filter((candidate) => candidate.id !== arcId)].map((entity) => entity.name.toLowerCase());
  if (existingNames.includes(normalizedName.toLowerCase())) return null;
  return withArcs(document, document.arcs.map((candidate) => candidate.id === arcId ? { ...cloneArcObject(candidate), name: normalizedName } : candidate));
}

export function assignArcToLayer(document: ModelDocument, arcId: string, layerId: string): ModelDocument | null {
  const arc = findArcObject(document, arcId);
  if (!arc || !arcIsEditable(document, arc) || !findLayer(document, layerId)) return null;
  return withArcs(document, document.arcs.map((candidate) => candidate.id === arcId ? { ...cloneArcObject(candidate), layerId } : candidate));
}

export function setArcLocked(document: ModelDocument, arcId: string, locked: boolean): ModelDocument | null {
  if (!findArcObject(document, arcId)) return null;
  return withArcs(document, document.arcs.map((arc) => arc.id === arcId ? { ...cloneArcObject(arc), locked } : arc));
}

export function deleteArcObject(document: ModelDocument, arcId: string): ModelDocument | null {
  const arc = findArcObject(document, arcId);
  if (!arc || !arcIsEditable(document, arc)) return null;
  return withArcs(document, document.arcs.filter((candidate) => candidate.id !== arcId));
}

export function renameBoxObject(
  document: ModelDocument,
  objectId: string,
  name: string,
): ModelDocument | null {
  const normalizedName = name.trim();
  if (!normalizedName || normalizedName.length > 120) return null;
  const selected = findBoxObject(document, objectId);
  if (!selected || !objectIsEditable(document, selected)) return null;
  if (
    document.objects.some(
      (object) =>
        object.id !== objectId &&
        object.name.toLowerCase() === normalizedName.toLowerCase(),
    ) || document.lines.some((line) => line.name.toLowerCase() === normalizedName.toLowerCase()) ||
      document.polylines.some((polyline) => polyline.name.toLowerCase() === normalizedName.toLowerCase()) ||
      document.circles.some((circle) => circle.name.toLowerCase() === normalizedName.toLowerCase()) ||
      document.arcs.some((arc) => arc.name.toLowerCase() === normalizedName.toLowerCase())
  ) {
    return null;
  }
  return withObjects(
    document,
    document.objects.map((object) =>
      object.id === objectId
        ? { ...cloneBoxObject(object), name: normalizedName }
        : cloneBoxObject(object),
    ),
  );
}

export function duplicateBoxObject(
  document: ModelDocument,
  objectId: string,
): { document: ModelDocument; object: BoxObject } | null {
  if (document.objects.length >= MAXIMUM_OBJECT_COUNT) return null;
  const source = findBoxObject(document, objectId);
  if (!source || !objectIsEditable(document, source)) return null;
  const number = nextObjectNumber(document);
  const object: BoxObject = {
    ...cloneBoxObject(source),
    groupId: null,
    id: `box-${String(number).padStart(2, "0")}`,
    locked: false,
    name: uniqueObjectName(document, `${source.name.slice(0, 115).trimEnd()} Copy`),
    position: {
      x: source.position.x + 24 <= MAXIMUM_COORDINATE
        ? source.position.x + 24
        : source.position.x - 24,
      y: source.position.y + 24 <= MAXIMUM_COORDINATE
        ? source.position.y + 24
        : source.position.y - 24,
      z: source.position.z,
    },
  };
  return {
    document: withObjects(document, [...document.objects, object]),
    object: cloneBoxObject(object),
  };
}

export function copyBoxObjects(
  document: ModelDocument,
  objectIds: string[],
  axis: AxisKey,
  distance: number,
): { document: ModelDocument; objects: BoxObject[] } | null {
  const uniqueIds = [...new Set(objectIds)];
  const snappedDistance = Math.round(distance * 16) / 16;
  if (
    !uniqueIds.length ||
    !Number.isFinite(snappedDistance) ||
    snappedDistance === 0 ||
    document.objects.length + uniqueIds.length > MAXIMUM_OBJECT_COUNT
  ) {
    return null;
  }
  const sources = uniqueIds.map((objectId) => findBoxObject(document, objectId));
  if (sources.some((source) => source === null)) return null;
  if (sources.some((source) => source && !objectIsEditable(document, source))) return null;
  if (
    sources.some(
      (source) => source && Math.abs(source.position[axis] + snappedDistance) > MAXIMUM_COORDINATE,
    )
  ) {
    return null;
  }

  let workingDocument = cloneDocument(document);
  const copies: BoxObject[] = [];
  for (const source of sources as BoxObject[]) {
    const number = nextObjectNumber(workingDocument);
    const copy = cloneBoxObject(source);
    copy.groupId = null;
    copy.id = `box-${String(number).padStart(2, "0")}`;
    copy.locked = false;
    copy.name = uniqueObjectName(
      workingDocument,
      `${source.name.slice(0, 115).trimEnd()} Copy`,
    );
    copy.position[axis] = Math.round((source.position[axis] + snappedDistance) * 16) / 16;
    workingDocument = withObjects(workingDocument, [...workingDocument.objects, copy]);
    copies.push(cloneBoxObject(copy));
  }
  return { document: workingDocument, objects: copies };
}

export function deleteBoxObject(
  document: ModelDocument,
  objectId: string,
): ModelDocument | null {
  const object = findBoxObject(document, objectId);
  if (!object || !objectIsEditable(document, object)) return null;
  return withObjects(
    document,
    document.objects
      .filter((object) => object.id !== objectId)
      .map(cloneBoxObject),
  );
}

export function deleteBoxObjects(
  document: ModelDocument,
  objectIds: string[],
): ModelDocument | null {
  const ids = new Set(objectIds);
  if (!ids.size) return null;
  const found = document.objects.filter((object) => ids.has(object.id));
  if (found.length !== ids.size) return null;
  if (found.some((object) => !objectIsEditable(document, object))) return null;
  return withObjects(
    document,
    document.objects.filter((object) => !ids.has(object.id)),
  );
}

export function modelEntityIsEditable(document: ModelDocument, ref: ModelEntityRef): boolean {
  if (ref.kind === "box") {
    const entity = findBoxObject(document, ref.id);
    return Boolean(entity && objectIsEditable(document, entity));
  }
  if (ref.kind === "line") {
    const entity = findLineObject(document, ref.id);
    return Boolean(entity && lineIsEditable(document, entity));
  }
  if (ref.kind === "polyline") {
    const entity = findPolylineObject(document, ref.id);
    return Boolean(entity && polylineIsEditable(document, entity));
  }
  if (ref.kind === "circle") {
    const entity = findCircleObject(document, ref.id);
    return Boolean(entity && circleIsEditable(document, entity));
  }
  const entity = findArcObject(document, ref.id);
  return Boolean(entity && arcIsEditable(document, entity));
}

function normalizedEntityRefs(refs: ModelEntityRef[]): ModelEntityRef[] {
  return refs.filter((ref, index, all) => all.findIndex((candidate) => candidate.kind === ref.kind && candidate.id === ref.id) === index);
}

function snappedDelta(delta: LinePoint): LinePoint {
  return {
    x: Math.round(delta.x * 16) / 16,
    y: Math.round(delta.y * 16) / 16,
    z: Math.round(delta.z * 16) / 16,
  };
}

function documentCoordinatesWithinBounds(document: ModelDocument): boolean {
  const coordinates = [
    ...document.objects.flatMap((object) => {
      const bounds = boxWorldBounds(object);
      return [
        object.position.x,
        object.position.y,
        object.position.z,
        bounds.minimum.x,
        bounds.minimum.y,
        bounds.minimum.z,
        bounds.maximum.x,
        bounds.maximum.y,
        bounds.maximum.z,
      ];
    }),
    ...document.lines.flatMap((line) => [
      line.start.x,
      line.start.y,
      line.start.z,
      line.end.x,
      line.end.y,
      line.end.z,
    ]),
    ...document.polylines.flatMap((polyline) => [
      polyline.elevation,
      ...polyline.vertices.flatMap((point) => [point.x, point.y]),
    ]),
    ...document.circles.flatMap((circle) => [
      circle.center.x - circle.radius,
      circle.center.x + circle.radius,
      circle.center.y - circle.radius,
      circle.center.y + circle.radius,
      circle.center.z,
    ]),
    ...document.arcs.flatMap((arc) => [
      arc.center.x - arc.radius,
      arc.center.x + arc.radius,
      arc.center.y - arc.radius,
      arc.center.y + arc.radius,
      arc.center.z,
    ]),
  ];
  return coordinates.every(
    (coordinate) => Number.isFinite(coordinate) && Math.abs(coordinate) <= MAXIMUM_COORDINATE,
  ) && documentWallOpeningsAreValid(document);
}

export function moveModelEntities(document: ModelDocument, refs: ModelEntityRef[], delta: LinePoint): ModelDocument | null {
  const selected = normalizedEntityRefs(refs);
  const offset = snappedDelta(delta);
  if (!selected.length || (!offset.x && !offset.y && !offset.z) || selected.some((ref) => !modelEntityIsEditable(document, ref))) return null;
  const keys = new Set(selected.map((ref) => `${ref.kind}:${ref.id}`));
  const next = cloneDocument(document);
  next.objects = next.objects.map((object) => keys.has(`box:${object.id}`) ? {
    ...object,
    position: { x: object.position.x + offset.x, y: object.position.y + offset.y, z: object.position.z + offset.z },
  } : object);
  next.lines = next.lines.map((line) => keys.has(`line:${line.id}`) ? {
    ...line,
    start: { x: line.start.x + offset.x, y: line.start.y + offset.y, z: line.start.z + (line.architecturalRole !== null ? 0 : offset.z) },
    end: { x: line.end.x + offset.x, y: line.end.y + offset.y, z: line.end.z + (line.architecturalRole !== null ? 0 : offset.z) },
  } : line);
  next.polylines = next.polylines.map((polyline) => keys.has(`polyline:${polyline.id}`) ? {
    ...polyline,
    elevation: polyline.elevation + offset.z,
    vertices: polyline.vertices.map((point) => ({ x: point.x + offset.x, y: point.y + offset.y })),
  } : polyline);
  next.circles = next.circles.map((circle) => keys.has(`circle:${circle.id}`) ? {
    ...circle,
    center: { x: circle.center.x + offset.x, y: circle.center.y + offset.y, z: circle.center.z + offset.z },
  } : circle);
  next.arcs = next.arcs.map((arc) => keys.has(`arc:${arc.id}`) ? {
    ...arc,
    center: { x: arc.center.x + offset.x, y: arc.center.y + offset.y, z: arc.center.z + offset.z },
  } : arc);
  return documentCoordinatesWithinBounds(next) ? next : null;
}

export type ModelSelectionBounds = {
  maximum: LinePoint;
  minimum: LinePoint;
};

export function modelSelectionBounds(
  document: ModelDocument,
  refs: ModelEntityRef[],
): ModelSelectionBounds | null {
  const selected = normalizedEntityRefs(refs);
  if (!selected.length) return null;
  const points: LinePoint[] = [];
  for (const ref of selected) {
    if (ref.kind === "box") {
      const entity = findBoxObject(document, ref.id);
      if (!entity) return null;
      const bounds = boxWorldBounds(entity);
      points.push(bounds.minimum, bounds.maximum);
    } else if (ref.kind === "line") {
      const entity = findLineObject(document, ref.id);
      if (!entity) return null;
      points.push(entity.start, entity.end);
    } else if (ref.kind === "polyline") {
      const entity = findPolylineObject(document, ref.id);
      if (!entity) return null;
      points.push(...entity.vertices.map((point) => ({ ...point, z: entity.elevation })));
    } else if (ref.kind === "circle") {
      const entity = findCircleObject(document, ref.id);
      if (!entity) return null;
      points.push(
        { x: entity.center.x - entity.radius, y: entity.center.y - entity.radius, z: entity.center.z },
        { x: entity.center.x + entity.radius, y: entity.center.y + entity.radius, z: entity.center.z },
      );
    } else {
      const entity = findArcObject(document, ref.id);
      if (!entity) return null;
      points.push(
        { x: entity.center.x - entity.radius, y: entity.center.y - entity.radius, z: entity.center.z },
        { x: entity.center.x + entity.radius, y: entity.center.y + entity.radius, z: entity.center.z },
      );
    }
  }
  return {
    maximum: {
      x: Math.max(...points.map((point) => point.x)),
      y: Math.max(...points.map((point) => point.y)),
      z: Math.max(...points.map((point) => point.z)),
    },
    minimum: {
      x: Math.min(...points.map((point) => point.x)),
      y: Math.min(...points.map((point) => point.y)),
      z: Math.min(...points.map((point) => point.z)),
    },
  };
}

export function modelSelectionRotationBase(
  document: ModelDocument,
  refs: ModelEntityRef[],
  baseKey: RotationBaseKey,
): LinePoint | null {
  const bounds = modelSelectionBounds(document, refs);
  if (!bounds) return null;
  const definition = ROTATION_BASE_DEFINITIONS.find((candidate) => candidate.key === baseKey) ??
    ROTATION_BASE_DEFINITIONS[0];
  return {
    x: bounds.minimum.x + (bounds.maximum.x - bounds.minimum.x) * definition.xFactor,
    y: bounds.minimum.y + (bounds.maximum.y - bounds.minimum.y) * definition.yFactor,
    z: bounds.minimum.z + (bounds.maximum.z - bounds.minimum.z) / 2,
  };
}

export function modelSelectionScaleBase(
  document: ModelDocument,
  refs: ModelEntityRef[],
  baseKey: RotationBaseKey,
): LinePoint | null {
  return modelSelectionRotationBase(document, refs, baseKey);
}

function rotatePlanPoint(point: LinePoint, base: LinePoint, radians: number): LinePoint {
  const deltaX = point.x - base.x;
  const deltaY = point.y - base.y;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: Math.round((base.x + deltaX * cosine - deltaY * sine) * 16) / 16,
    y: Math.round((base.y + deltaX * sine + deltaY * cosine) * 16) / 16,
    z: point.z,
  };
}

function normalizeArcAngle(radians: number): number {
  const fullTurn = Math.PI * 2;
  return ((radians % fullTurn) + fullTurn) % fullTurn;
}

export function rotateModelEntities(
  document: ModelDocument,
  refs: ModelEntityRef[],
  base: LinePoint,
  deltaDegrees: number,
): ModelDocument | null {
  const selected = normalizedEntityRefs(refs);
  if (
    !selected.length ||
    !Number.isFinite(deltaDegrees) ||
    Math.abs(deltaDegrees) < 0.001 ||
    ![base.x, base.y, base.z].every(Number.isFinite) ||
    selected.some((ref) => !modelEntityIsEditable(document, ref))
  ) return null;
  const keys = new Set(selected.map((ref) => `${ref.kind}:${ref.id}`));
  const radians = deltaDegrees * Math.PI / 180;
  const next = cloneDocument(document);
  let boxRotationFailed = false;
  next.objects = next.objects.map((object) => {
    if (!keys.has(`box:${object.id}`)) return object;
    const rotated = rotateBoxModel(object, deltaDegrees, base);
    if (!rotated) {
      boxRotationFailed = true;
      return object;
    }
    return { ...object, ...rotated };
  });
  next.lines = next.lines.map((line) => keys.has(`line:${line.id}`) ? {
    ...line,
    start: rotatePlanPoint(line.start, base, radians),
    end: rotatePlanPoint(line.end, base, radians),
  } : line);
  next.polylines = next.polylines.map((polyline) => keys.has(`polyline:${polyline.id}`) ? {
    ...polyline,
    vertices: polyline.vertices.map((point) => {
      const rotated = rotatePlanPoint({ ...point, z: polyline.elevation }, base, radians);
      return { x: rotated.x, y: rotated.y };
    }),
  } : polyline);
  next.circles = next.circles.map((circle) => keys.has(`circle:${circle.id}`) ? {
    ...circle,
    center: rotatePlanPoint(circle.center, base, radians),
  } : circle);
  next.arcs = next.arcs.map((arc) => keys.has(`arc:${arc.id}`) ? {
    ...arc,
    center: rotatePlanPoint(arc.center, base, radians),
    endAngle: normalizeArcAngle(arc.endAngle + radians),
    startAngle: normalizeArcAngle(arc.startAngle + radians),
  } : arc);
  const valid = !boxRotationFailed && next.lines.every(lineGeometryIsValid) &&
    next.polylines.every(polylineGeometryIsValid) &&
    next.circles.every(circleGeometryIsValid) &&
    next.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(next) ? next : null;
}

function scalePlanPoint(point: LinePoint, base: LinePoint, factor: number): LinePoint {
  return {
    x: Math.round((base.x + (point.x - base.x) * factor) * 16) / 16,
    y: Math.round((base.y + (point.y - base.y) * factor) * 16) / 16,
    z: point.z,
  };
}

export function scaleModelEntities(
  document: ModelDocument,
  refs: ModelEntityRef[],
  base: LinePoint,
  factor: number,
): ModelDocument | null {
  const selected = normalizedEntityRefs(refs);
  if (
    !selected.length ||
    !Number.isFinite(factor) ||
    factor <= 0 ||
    Math.abs(factor - 1) < 0.0001 ||
    ![base.x, base.y, base.z].every(Number.isFinite) ||
    selected.some((ref) => !modelEntityIsEditable(document, ref))
  ) return null;
  const keys = new Set(selected.map((ref) => `${ref.kind}:${ref.id}`));
  const next = cloneDocument(document);
  let boxScaleFailed = false;
  next.objects = next.objects.map((object) => {
    if (!keys.has(`box:${object.id}`)) return object;
    const position = scalePlanPoint(object.position, base, factor);
    const length = Math.round(object.dimensions.length * factor * 16) / 16;
    const width = Math.round(object.dimensions.width * factor * 16) / 16;
    if (length < MINIMUM_DIMENSION || width < MINIMUM_DIMENSION) {
      boxScaleFailed = true;
      return object;
    }
    return {
      ...object,
      dimensions: { ...object.dimensions, length, width },
      position,
    };
  });
  next.lines = next.lines.map((line) => keys.has(`line:${line.id}`) ? {
    ...line,
    start: scalePlanPoint(line.start, base, factor),
    end: scalePlanPoint(line.end, base, factor),
  } : line);
  next.polylines = next.polylines.map((polyline) => keys.has(`polyline:${polyline.id}`) ? {
    ...polyline,
    vertices: polyline.vertices.map((point) => {
      const scaled = scalePlanPoint({ ...point, z: polyline.elevation }, base, factor);
      return { x: scaled.x, y: scaled.y };
    }),
    width: Math.round((polyline.width ?? 0) * factor * 16) / 16,
  } : polyline);
  next.circles = next.circles.map((circle) => keys.has(`circle:${circle.id}`) ? {
    ...circle,
    center: scalePlanPoint(circle.center, base, factor),
    radius: Math.round(circle.radius * factor * 16) / 16,
  } : circle);
  next.arcs = next.arcs.map((arc) => keys.has(`arc:${arc.id}`) ? {
    ...arc,
    center: scalePlanPoint(arc.center, base, factor),
    radius: Math.round(arc.radius * factor * 16) / 16,
  } : arc);
  const valid = !boxScaleFailed && next.lines.every(lineGeometryIsValid) &&
    next.polylines.every(polylineGeometryIsValid) &&
    next.circles.every(circleGeometryIsValid) &&
    next.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(next) ? next : null;
}

function mirrorPlanPoint(point: LinePoint, axisStart: LinePoint, axisEnd: LinePoint): LinePoint {
  const axisX = axisEnd.x - axisStart.x;
  const axisY = axisEnd.y - axisStart.y;
  const axisLengthSquared = axisX * axisX + axisY * axisY;
  const offsetX = point.x - axisStart.x;
  const offsetY = point.y - axisStart.y;
  const projection = (offsetX * axisX + offsetY * axisY) / axisLengthSquared;
  const projectedX = axisStart.x + projection * axisX;
  const projectedY = axisStart.y + projection * axisY;
  return {
    x: Math.round((projectedX * 2 - point.x) * 16) / 16,
    y: Math.round((projectedY * 2 - point.y) * 16) / 16,
    z: point.z,
  };
}

function mirroredPlanAngle(radians: number, axisRadians: number): number {
  return normalizeArcAngle(axisRadians * 2 - radians);
}

export function mirrorModelEntities(
  document: ModelDocument,
  refs: ModelEntityRef[],
  axisStart: LinePoint,
  axisEnd: LinePoint,
  keepSource: boolean,
): { document: ModelDocument; refs: ModelEntityRef[] } | null {
  const selected = normalizedEntityRefs(refs);
  const axisLength = Math.hypot(axisEnd.x - axisStart.x, axisEnd.y - axisStart.y);
  if (
    !selected.length ||
    axisLength < MINIMUM_DIMENSION ||
    ![axisStart.x, axisStart.y, axisStart.z, axisEnd.x, axisEnd.y, axisEnd.z].every(Number.isFinite) ||
    selected.some((ref) => !modelEntityIsEditable(document, ref))
  ) return null;
  const counts = {
    arc: selected.filter((ref) => ref.kind === "arc").length,
    box: selected.filter((ref) => ref.kind === "box").length,
    circle: selected.filter((ref) => ref.kind === "circle").length,
    line: selected.filter((ref) => ref.kind === "line").length,
    polyline: selected.filter((ref) => ref.kind === "polyline").length,
  };
  if (keepSource && (
    document.arcs.length + counts.arc > MAXIMUM_ARC_COUNT ||
    document.objects.length + counts.box > MAXIMUM_OBJECT_COUNT ||
    document.circles.length + counts.circle > MAXIMUM_CIRCLE_COUNT ||
    document.lines.length + counts.line > MAXIMUM_LINE_COUNT ||
    document.polylines.length + counts.polyline > MAXIMUM_POLYLINE_COUNT
  )) return null;

  const working = cloneDocument(document);
  const mirroredRefs: ModelEntityRef[] = [];
  if (keepSource) {
    for (const ref of selected) {
      if (ref.kind === "box") {
        const source = findBoxObject(working, ref.id)!;
        const copy = cloneBoxObject(source);
        const number = nextObjectNumber(working);
        copy.id = `box-${String(number).padStart(2, "0")}`;
        copy.name = uniqueObjectName(working, `${source.name.slice(0, 113).trimEnd()} Mirror`);
        copy.groupId = null;
        copy.locked = false;
        working.objects.push(copy);
        mirroredRefs.push({ id: copy.id, kind: "box" });
      } else if (ref.kind === "line") {
        const source = findLineObject(working, ref.id)!;
        const copy = cloneLineObject(source);
        const number = nextLineNumber(working);
        copy.id = `line-${String(number).padStart(2, "0")}`;
        copy.name = uniqueObjectName(working, `${source.name.slice(0, 113).trimEnd()} Mirror`);
        copy.locked = false;
        working.lines.push(copy);
        mirroredRefs.push({ id: copy.id, kind: "line" });
      } else if (ref.kind === "polyline") {
        const source = findPolylineObject(working, ref.id)!;
        const copy = clonePolylineObject(source);
        const number = nextPolylineNumber(working);
        copy.id = `polyline-${String(number).padStart(2, "0")}`;
        copy.name = uniqueObjectName(working, `${source.name.slice(0, 113).trimEnd()} Mirror`);
        copy.locked = false;
        working.polylines.push(copy);
        mirroredRefs.push({ id: copy.id, kind: "polyline" });
      } else if (ref.kind === "circle") {
        const source = findCircleObject(working, ref.id)!;
        const copy = cloneCircleObject(source);
        const number = nextCircleNumber(working);
        copy.id = `circle-${String(number).padStart(2, "0")}`;
        copy.name = uniqueObjectName(working, `${source.name.slice(0, 113).trimEnd()} Mirror`);
        copy.locked = false;
        working.circles.push(copy);
        mirroredRefs.push({ id: copy.id, kind: "circle" });
      } else {
        const source = findArcObject(working, ref.id)!;
        const copy = cloneArcObject(source);
        const number = nextArcNumber(working);
        copy.id = `arc-${String(number).padStart(2, "0")}`;
        copy.name = uniqueObjectName(working, `${source.name.slice(0, 113).trimEnd()} Mirror`);
        copy.locked = false;
        working.arcs.push(copy);
        mirroredRefs.push({ id: copy.id, kind: "arc" });
      }
    }
  } else {
    mirroredRefs.push(...selected);
  }

  const keys = new Set(mirroredRefs.map((ref) => `${ref.kind}:${ref.id}`));
  const axisRadians = Math.atan2(axisEnd.y - axisStart.y, axisEnd.x - axisStart.x);
  working.objects = working.objects.map((object) => {
    if (!keys.has(`box:${object.id}`)) return object;
    const mirroredOrigin = mirrorPlanPoint(boxWorldPoint(object, 0, 1, 0), axisStart, axisEnd);
    return {
      ...object,
      position: mirroredOrigin,
      rotationZ: normalizeRotationZ(axisRadians * 360 / Math.PI - object.rotationZ),
    };
  });
  working.lines = working.lines.map((line) => keys.has(`line:${line.id}`) ? {
    ...line,
    start: mirrorPlanPoint(line.start, axisStart, axisEnd),
    end: mirrorPlanPoint(line.end, axisStart, axisEnd),
    wallExteriorSide: line.architecturalRole !== null ? line.wallExteriorSide === "left" ? "right" : "left" : line.wallExteriorSide,
  } : line);
  working.polylines = working.polylines.map((polyline) => keys.has(`polyline:${polyline.id}`) ? {
    ...polyline,
    bulges: polyline.bulges?.map((bulge) => -bulge),
    vertices: polyline.vertices.map((point) => {
      const mirrored = mirrorPlanPoint({ ...point, z: polyline.elevation }, axisStart, axisEnd);
      return { x: mirrored.x, y: mirrored.y };
    }),
  } : polyline);
  working.circles = working.circles.map((circle) => keys.has(`circle:${circle.id}`) ? {
    ...circle,
    center: mirrorPlanPoint(circle.center, axisStart, axisEnd),
  } : circle);
  working.arcs = working.arcs.map((arc) => keys.has(`arc:${arc.id}`) ? {
    ...arc,
    center: mirrorPlanPoint(arc.center, axisStart, axisEnd),
    counterclockwise: !arc.counterclockwise,
    endAngle: mirroredPlanAngle(arc.endAngle, axisRadians),
    startAngle: mirroredPlanAngle(arc.startAngle, axisRadians),
  } : arc);
  const valid = working.lines.every(lineGeometryIsValid) &&
    working.polylines.every(polylineGeometryIsValid) &&
    working.circles.every(circleGeometryIsValid) &&
    working.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working)
    ? { document: working, refs: mirroredRefs }
    : null;
}

export function offsetModelEntity(
  document: ModelDocument,
  ref: ModelEntityRef,
  distance: number,
  sidePoint: PlanPoint,
  keepSource: boolean,
): { document: ModelDocument; ref: ModelEntityRef } | null {
  if (
    ref.kind === "box" ||
    !Number.isFinite(distance) ||
    distance < 1 / 16 ||
    !Number.isFinite(sidePoint.x) ||
    !Number.isFinite(sidePoint.y) ||
    !modelEntityIsEditable(document, ref)
  ) return null;
  if (keepSource && (
    ref.kind === "line" && document.lines.length >= MAXIMUM_LINE_COUNT ||
    ref.kind === "polyline" && document.polylines.length >= MAXIMUM_POLYLINE_COUNT ||
    ref.kind === "circle" && document.circles.length >= MAXIMUM_CIRCLE_COUNT ||
    ref.kind === "arc" && document.arcs.length >= MAXIMUM_ARC_COUNT
  )) return null;

  const working = cloneDocument(document);
  let targetRef = ref;
  if (keepSource) {
    if (ref.kind === "line") {
      const source = findLineObject(working, ref.id);
      if (!source) return null;
      const copy = cloneLineObject(source);
      const number = nextLineNumber(working);
      copy.id = `line-${String(number).padStart(2, "0")}`;
      copy.name = uniqueObjectName(working, `${source.name.slice(0, 113).trimEnd()} Offset`);
      copy.locked = false;
      working.lines.push(copy);
      targetRef = { id: copy.id, kind: "line" };
    } else if (ref.kind === "polyline") {
      const source = findPolylineObject(working, ref.id);
      if (!source) return null;
      const copy = clonePolylineObject(source);
      const number = nextPolylineNumber(working);
      copy.id = `polyline-${String(number).padStart(2, "0")}`;
      copy.name = uniqueObjectName(working, `${source.name.slice(0, 113).trimEnd()} Offset`);
      copy.locked = false;
      working.polylines.push(copy);
      targetRef = { id: copy.id, kind: "polyline" };
    } else if (ref.kind === "circle") {
      const source = findCircleObject(working, ref.id);
      if (!source) return null;
      const copy = cloneCircleObject(source);
      const number = nextCircleNumber(working);
      copy.id = `circle-${String(number).padStart(2, "0")}`;
      copy.name = uniqueObjectName(working, `${source.name.slice(0, 113).trimEnd()} Offset`);
      copy.locked = false;
      working.circles.push(copy);
      targetRef = { id: copy.id, kind: "circle" };
    } else {
      const source = findArcObject(working, ref.id);
      if (!source) return null;
      const copy = cloneArcObject(source);
      const number = nextArcNumber(working);
      copy.id = `arc-${String(number).padStart(2, "0")}`;
      copy.name = uniqueObjectName(working, `${source.name.slice(0, 113).trimEnd()} Offset`);
      copy.locked = false;
      working.arcs.push(copy);
      targetRef = { id: copy.id, kind: "arc" };
    }
  }

  let geometrySucceeded = false;
  if (targetRef.kind === "line") {
    working.lines = working.lines.map((line) => {
      if (line.id !== targetRef.id) return line;
      const geometry = offsetLineGeometry(line, distance, sidePoint);
      geometrySucceeded = Boolean(geometry);
      return geometry ? { ...line, ...geometry } : line;
    });
  } else if (targetRef.kind === "polyline") {
    working.polylines = working.polylines.map((polyline) => {
      if (polyline.id !== targetRef.id) return polyline;
      const geometry = offsetPolylineGeometry(polyline, distance, sidePoint);
      geometrySucceeded = Boolean(geometry);
      return geometry ? { ...polyline, ...geometry } : polyline;
    });
  } else if (targetRef.kind === "circle") {
    working.circles = working.circles.map((circle) => {
      if (circle.id !== targetRef.id) return circle;
      const geometry = offsetCircleGeometry(circle, distance, sidePoint);
      geometrySucceeded = Boolean(geometry);
      return geometry ? { ...circle, ...geometry } : circle;
    });
  } else {
    working.arcs = working.arcs.map((arc) => {
      if (arc.id !== targetRef.id) return arc;
      const geometry = offsetArcGeometry(arc, distance, sidePoint);
      geometrySucceeded = Boolean(geometry);
      return geometry ? { ...arc, ...geometry } : arc;
    });
  }
  if (!geometrySucceeded) return null;
  const valid = working.lines.every(lineGeometryIsValid) &&
    working.polylines.every(polylineGeometryIsValid) &&
    working.circles.every(circleGeometryIsValid) &&
    working.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working)
    ? { document: working, ref: targetRef }
    : null;
}

function trimExtendBoundaries(document: ModelDocument, exclude: ModelEntityRef): TrimExtendBoundary[] {
  const visible = (layerId: string) => findLayer(document, layerId)?.visible ?? false;
  const boundaries: TrimExtendBoundary[] = [];
  document.lines.forEach((line) => {
    if (exclude.kind !== "line" || exclude.id !== line.id) {
      if (visible(line.layerId)) boundaries.push({ geometry: cloneLineGeometry(line), kind: "line" });
    }
  });
  document.polylines.forEach((polyline) => {
    if ((exclude.kind === "polyline" && exclude.id === polyline.id) || !visible(polyline.layerId)) return;
    polylineSegments(polyline).forEach((segment) => {
      const circular = polylineSegmentCircularGeometry(segment);
      boundaries.push(circular ? {
        geometry: { ...circular, center: { ...circular.center, z: polyline.elevation } },
        kind: "circular",
      } : {
        geometry: { start: { ...segment.start, z: polyline.elevation }, end: { ...segment.end, z: polyline.elevation } },
        kind: "line",
      });
    });
  });
  document.circles.forEach((circle) => {
    if ((exclude.kind !== "circle" || exclude.id !== circle.id) && visible(circle.layerId)) {
      boundaries.push({ geometry: { center: { ...circle.center }, radius: circle.radius }, kind: "circular" });
    }
  });
  document.arcs.forEach((arc) => {
    if ((exclude.kind !== "arc" || exclude.id !== arc.id) && visible(arc.layerId)) {
      boundaries.push({ geometry: cloneArcGeometry(arc), kind: "circular" });
    }
  });
  return boundaries;
}

export function trimModelEntity(
  document: ModelDocument,
  ref: ModelEntityRef,
  pick: LinePoint,
): { document: ModelDocument; refs: ModelEntityRef[] } | null {
  if (ref.kind === "box" || !modelEntityIsEditable(document, ref)) return null;
  const boundaries = trimExtendBoundaries(document, ref);
  if (!boundaries.length) return null;
  const working = cloneDocument(document);
  const resultRefs: ModelEntityRef[] = [];

  if (ref.kind === "line") {
    const source = findLineObject(working, ref.id);
    if (!source) return null;
    const pieces = trimLineGeometry(source, boundaries, pick);
    if (!pieces || working.lines.length - 1 + pieces.length > MAXIMUM_LINE_COUNT) return null;
    working.lines = working.lines.filter((line) => line.id !== source.id);
    pieces.forEach((geometry, index) => {
      if (index === 0) {
        working.lines.push({ ...source, ...geometry });
        resultRefs.push(ref);
      } else {
        const number = nextLineNumber(working);
        const line = {
          ...source,
          ...geometry,
          id: `line-${String(number).padStart(2, "0")}`,
          locked: false,
          name: uniqueObjectName(working, `${source.name.slice(0, 115).trimEnd()} Trim`),
        };
        working.lines.push(line);
        resultRefs.push({ id: line.id, kind: "line" });
      }
    });
  } else if (ref.kind === "arc") {
    const source = findArcObject(working, ref.id);
    if (!source) return null;
    const pieces = trimArcGeometry(source, boundaries, pick);
    if (!pieces || working.arcs.length - 1 + pieces.length > MAXIMUM_ARC_COUNT) return null;
    working.arcs = working.arcs.filter((arc) => arc.id !== source.id);
    pieces.forEach((geometry, index) => {
      if (index === 0) {
        working.arcs.push({ ...source, ...geometry });
        resultRefs.push(ref);
      } else {
        const number = nextArcNumber(working);
        const arc = {
          ...source,
          ...geometry,
          id: `arc-${String(number).padStart(2, "0")}`,
          locked: false,
          name: uniqueObjectName(working, `${source.name.slice(0, 115).trimEnd()} Trim`),
        };
        working.arcs.push(arc);
        resultRefs.push({ id: arc.id, kind: "arc" });
      }
    });
  } else if (ref.kind === "circle") {
    const source = findCircleObject(working, ref.id);
    if (!source || working.arcs.length >= MAXIMUM_ARC_COUNT) return null;
    const geometry = trimCircleGeometry({ center: source.center, radius: source.radius }, boundaries, pick);
    if (!geometry) return null;
    working.circles = working.circles.filter((circle) => circle.id !== source.id);
    const number = nextArcNumber(working);
    const arc: ArcObject = {
      ...geometry,
      id: `arc-${String(number).padStart(2, "0")}`,
      layerId: source.layerId,
      locked: false,
      name: uniqueObjectName(working, `${source.name.slice(0, 115).trimEnd()} Trim`),
      storyId: source.storyId,
      type: "arc",
    };
    working.arcs.push(arc);
    resultRefs.push({ id: arc.id, kind: "arc" });
  } else {
    const source = findPolylineObject(working, ref.id);
    if (!source) return null;
    const pieces = trimPolylineGeometry(source, boundaries, pick);
    if (!pieces || working.polylines.length - 1 + pieces.length > MAXIMUM_POLYLINE_COUNT) return null;
    working.polylines = working.polylines.filter((polyline) => polyline.id !== source.id);
    pieces.forEach((geometry, index) => {
      if (index === 0) {
        working.polylines.push({ ...source, ...geometry, architecturalRole: geometry.closed ? source.architecturalRole : null, shape: "polyline" });
        resultRefs.push(ref);
      } else {
        const number = nextPolylineNumber(working);
        const polyline: PolylineObject = {
          ...source,
          ...geometry,
          architecturalRole: geometry.closed ? source.architecturalRole : null,
          id: `polyline-${String(number).padStart(2, "0")}`,
          locked: false,
          name: uniqueObjectName(working, `${source.name.slice(0, 115).trimEnd()} Trim`),
          shape: "polyline",
        };
        working.polylines.push(polyline);
        resultRefs.push({ id: polyline.id, kind: "polyline" });
      }
    });
  }

  const valid = working.lines.every(lineGeometryIsValid) && working.polylines.every(polylineGeometryIsValid) &&
    working.circles.every(circleGeometryIsValid) && working.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working) ? { document: working, refs: resultRefs } : null;
}

export function breakModelEntity(
  document: ModelDocument,
  ref: ModelEntityRef,
  firstPick: LinePoint,
  secondPick: LinePoint | null,
): { document: ModelDocument; refs: ModelEntityRef[] } | null {
  if (ref.kind === "box" || !modelEntityIsEditable(document, ref)) return null;
  const atPoint = secondPick === null;
  if (atPoint && ref.kind === "circle") return null;
  const working = cloneDocument(document);
  const resultRefs: ModelEntityRef[] = [];

  if (ref.kind === "line") {
    const source = findLineObject(working, ref.id);
    if (!source) return null;
    const pieces = atPoint
      ? breakLineAtPointGeometry(source, firstPick)
      : breakLineGeometry(source, firstPick, secondPick);
    if (!pieces || working.lines.length - 1 + pieces.length > MAXIMUM_LINE_COUNT) return null;
    working.lines = working.lines.filter((line) => line.id !== source.id);
    pieces.forEach((geometry, index) => {
      if (index === 0) {
        working.lines.push({ ...source, ...geometry });
        resultRefs.push(ref);
      } else {
        const number = nextLineNumber(working);
        const line: LineObject = {
          ...source,
          ...geometry,
          id: `line-${String(number).padStart(2, "0")}`,
          name: uniqueObjectName(working, `${source.name.slice(0, 114).trimEnd()} Break`),
        };
        working.lines.push(line);
        resultRefs.push({ id: line.id, kind: "line" });
      }
    });
  } else if (ref.kind === "arc") {
    const source = findArcObject(working, ref.id);
    if (!source) return null;
    const pieces = atPoint
      ? breakArcAtPointGeometry(source, firstPick)
      : breakArcGeometry(source, firstPick, secondPick);
    if (!pieces || working.arcs.length - 1 + pieces.length > MAXIMUM_ARC_COUNT) return null;
    working.arcs = working.arcs.filter((arc) => arc.id !== source.id);
    pieces.forEach((geometry, index) => {
      if (index === 0) {
        working.arcs.push({ ...source, ...geometry });
        resultRefs.push(ref);
      } else {
        const number = nextArcNumber(working);
        const arc: ArcObject = {
          ...source,
          ...geometry,
          id: `arc-${String(number).padStart(2, "0")}`,
          name: uniqueObjectName(working, `${source.name.slice(0, 114).trimEnd()} Break`),
        };
        working.arcs.push(arc);
        resultRefs.push({ id: arc.id, kind: "arc" });
      }
    });
  } else if (ref.kind === "circle") {
    const source = findCircleObject(working, ref.id);
    if (!source || !secondPick || working.arcs.length >= MAXIMUM_ARC_COUNT) return null;
    const geometry = breakCircleGeometry(source, firstPick, secondPick);
    if (!geometry) return null;
    working.circles = working.circles.filter((circle) => circle.id !== source.id);
    const number = nextArcNumber(working);
    const arc: ArcObject = {
      ...geometry,
      id: `arc-${String(number).padStart(2, "0")}`,
      layerId: source.layerId,
      locked: source.locked,
      name: uniqueObjectName(working, `${source.name.slice(0, 114).trimEnd()} Break`),
      storyId: source.storyId,
      type: "arc",
    };
    working.arcs.push(arc);
    resultRefs.push({ id: arc.id, kind: "arc" });
  } else {
    const source = findPolylineObject(working, ref.id);
    if (!source || (atPoint && source.closed)) return null;
    const pieces = atPoint
      ? breakPolylineAtPointGeometry(source, firstPick)
      : breakPolylineGeometry(source, firstPick, secondPick);
    if (!pieces || working.polylines.length - 1 + pieces.length > MAXIMUM_POLYLINE_COUNT) return null;
    working.polylines = working.polylines.filter((polyline) => polyline.id !== source.id);
    pieces.forEach((geometry, index) => {
      if (index === 0) {
        working.polylines.push({ ...source, ...geometry, architecturalRole: geometry.closed ? source.architecturalRole : null, shape: "polyline" });
        resultRefs.push(ref);
      } else {
        const number = nextPolylineNumber(working);
        const polyline: PolylineObject = {
          ...source,
          ...geometry,
          architecturalRole: geometry.closed ? source.architecturalRole : null,
          id: `polyline-${String(number).padStart(2, "0")}`,
          name: uniqueObjectName(working, `${source.name.slice(0, 114).trimEnd()} Break`),
          shape: "polyline",
        };
        working.polylines.push(polyline);
        resultRefs.push({ id: polyline.id, kind: "polyline" });
      }
    });
  }

  const valid = working.lines.every(lineGeometryIsValid) && working.polylines.every(polylineGeometryIsValid) &&
    working.circles.every(circleGeometryIsValid) && working.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working) ? { document: working, refs: resultRefs } : null;
}

export function joinModelEntities(
  document: ModelDocument,
  refs: ModelEntityRef[],
  primaryRef: ModelEntityRef | null = refs.at(-1) ?? null,
): { document: ModelDocument; ref: ModelEntityRef } | null {
  const uniqueRefs = refs.filter((ref, index) => refs.findIndex((candidate) => candidate.kind === ref.kind && candidate.id === ref.id) === index);
  if (uniqueRefs.length < 2 || uniqueRefs.some((ref) =>
    (ref.kind !== "line" && ref.kind !== "arc" && ref.kind !== "polyline") || !modelEntityIsEditable(document, ref))) return null;
  const primary = primaryRef && uniqueRefs.some((ref) => ref.kind === primaryRef.kind && ref.id === primaryRef.id)
    ? primaryRef
    : uniqueRefs.at(-1)!;
  const orderedRefs = [primary, ...uniqueRefs.filter((ref) => ref.kind !== primary.kind || ref.id !== primary.id)];
  const curves: JoinCurveGeometry[] = [];
  for (const ref of orderedRefs) {
    if (ref.kind === "line") {
      const line = findLineObject(document, ref.id);
      if (!line) return null;
      curves.push({ kind: "line", geometry: cloneLineGeometry(line) });
    } else if (ref.kind === "arc") {
      const arc = findArcObject(document, ref.id);
      if (!arc) return null;
      curves.push({ kind: "arc", geometry: cloneArcGeometry(arc) });
    } else if (ref.kind === "polyline") {
      const polyline = findPolylineObject(document, ref.id);
      if (!polyline || polyline.closed) return null;
      curves.push({ kind: "polyline", geometry: clonePolylineGeometry(polyline) });
    }
  }
  const joined = joinCurveGeometries(curves);
  if (!joined) return null;

  const primaryEntity = primary.kind === "line"
    ? findLineObject(document, primary.id)
    : primary.kind === "arc"
      ? findArcObject(document, primary.id)
      : primary.kind === "polyline"
        ? findPolylineObject(document, primary.id)
        : null;
  if (!primaryEntity) return null;
  const working = cloneDocument(document);
  const selected = new Set(uniqueRefs.map((ref) => `${ref.kind}:${ref.id}`));
  working.lines = working.lines.filter((line) => !selected.has(`line:${line.id}`));
  working.arcs = working.arcs.filter((arc) => !selected.has(`arc:${arc.id}`));
  working.polylines = working.polylines.filter((polyline) => !selected.has(`polyline:${polyline.id}`));
  const sourceName = primaryEntity.name;
  const layerId = primaryEntity.layerId;
  const locked = primaryEntity.locked;
  const storyId = primaryEntity.storyId;
  let resultRef: ModelEntityRef;

  if (joined.kind === "line") {
    const preserve = primary.kind === "line";
    const number = preserve ? 0 : nextLineNumber(working);
    const line: LineObject = {
      ...joined.geometry,
      architecturalRole: preserve && primary.kind === "line" ? (primaryEntity as LineObject).architecturalRole : null,
      foundationSupportWallId: preserve && primary.kind === "line" ? (primaryEntity as LineObject).foundationSupportWallId : null,
      foundationWallTypeId: preserve && primary.kind === "line" ? (primaryEntity as LineObject).foundationWallTypeId : null,
      id: preserve ? primary.id : `line-${String(number).padStart(2, "0")}`,
      layerId,
      locked,
      name: preserve ? sourceName : uniqueObjectName(working, `${sourceName.slice(0, 115).trimEnd()} Join`),
      storyId,
      type: "line",
      wallExteriorSide: preserve && primary.kind === "line" ? (primaryEntity as LineObject).wallExteriorSide : null,
      wallJoinPriority: preserve && primary.kind === "line" ? (primaryEntity as LineObject).wallJoinPriority : null,
      wallStartJoinMode: preserve && primary.kind === "line" ? (primaryEntity as LineObject).wallStartJoinMode : null,
      wallEndJoinMode: preserve && primary.kind === "line" ? (primaryEntity as LineObject).wallEndJoinMode : null,
      wallReferenceLine: preserve && primary.kind === "line" ? (primaryEntity as LineObject).wallReferenceLine : null,
      wallTypeId: preserve && primary.kind === "line" ? (primaryEntity as LineObject).wallTypeId : null,
      wallOpenings: preserve && primary.kind === "line" ? (primaryEntity as LineObject).wallOpenings.map((opening) => ({ ...opening })) : [],
    };
    working.lines.push(line);
    resultRef = { id: line.id, kind: "line" };
  } else if (joined.kind === "arc") {
    const preserve = primary.kind === "arc";
    const number = preserve ? 0 : nextArcNumber(working);
    const arc: ArcObject = {
      ...joined.geometry,
      id: preserve ? primary.id : `arc-${String(number).padStart(2, "0")}`,
      layerId,
      locked,
      name: preserve ? sourceName : uniqueObjectName(working, `${sourceName.slice(0, 115).trimEnd()} Join`),
      storyId,
      type: "arc",
    };
    working.arcs.push(arc);
    resultRef = { id: arc.id, kind: "arc" };
  } else if (joined.kind === "circle") {
    const number = nextCircleNumber(working);
    const circle: CircleObject = {
      ...joined.geometry,
      id: `circle-${String(number).padStart(2, "0")}`,
      layerId,
      locked,
      name: uniqueObjectName(working, `${sourceName.slice(0, 115).trimEnd()} Join`),
      storyId,
      type: "circle",
    };
    working.circles.push(circle);
    resultRef = { id: circle.id, kind: "circle" };
  } else {
    const preserve = primary.kind === "polyline";
    const number = preserve ? 0 : nextPolylineNumber(working);
    const polyline: PolylineObject = {
      ...joined.geometry,
      architecturalRole: preserve && joined.geometry.closed && primary.kind === "polyline" ? (primaryEntity as PolylineObject).architecturalRole : null,
      id: preserve ? primary.id : `polyline-${String(number).padStart(2, "0")}`,
      layerId,
      locked,
      name: preserve ? sourceName : uniqueObjectName(working, `${sourceName.slice(0, 115).trimEnd()} Join`),
      shape: "polyline",
      storyId,
      type: "polyline",
    };
    working.polylines.push(polyline);
    resultRef = { id: polyline.id, kind: "polyline" };
  }

  const valid = working.lines.length <= MAXIMUM_LINE_COUNT && working.polylines.length <= MAXIMUM_POLYLINE_COUNT &&
    working.circles.length <= MAXIMUM_CIRCLE_COUNT && working.arcs.length <= MAXIMUM_ARC_COUNT &&
    working.lines.every(lineGeometryIsValid) && working.polylines.every(polylineGeometryIsValid) &&
    working.circles.every(circleGeometryIsValid) && working.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working) ? { document: working, ref: resultRef } : null;
}

export function explodeModelEntities(
  document: ModelDocument,
  refs: ModelEntityRef[],
): { document: ModelDocument; refs: ModelEntityRef[] } | null {
  const uniqueRefs = refs.filter((ref, index) =>
    refs.findIndex((candidate) => candidate.kind === ref.kind && candidate.id === ref.id) === index);
  if (!uniqueRefs.length || uniqueRefs.some((ref) => ref.kind !== "polyline" || !modelEntityIsEditable(document, ref))) return null;

  const sources: Array<{ pieces: NonNullable<ReturnType<typeof explodePolylineGeometry>>; polyline: PolylineObject }> = [];
  let addedLines = 0;
  let addedArcs = 0;
  for (const ref of uniqueRefs) {
    const polyline = findPolylineObject(document, ref.id);
    const pieces = polyline ? explodePolylineGeometry(polyline) : null;
    if (!polyline || !pieces) return null;
    addedLines += pieces.filter((piece) => piece.kind === "line").length;
    addedArcs += pieces.filter((piece) => piece.kind === "arc").length;
    sources.push({ pieces, polyline });
  }
  if (document.lines.length + addedLines > MAXIMUM_LINE_COUNT || document.arcs.length + addedArcs > MAXIMUM_ARC_COUNT) return null;

  const working = cloneDocument(document);
  const sourceIds = new Set(sources.map(({ polyline }) => polyline.id));
  working.polylines = working.polylines.filter((polyline) => !sourceIds.has(polyline.id));
  const resultRefs: ModelEntityRef[] = [];

  for (const { pieces, polyline } of sources) {
    pieces.forEach((piece, index) => {
      const suffix = ` Segment ${String(index + 1).padStart(2, "0")}`;
      const baseName = `${polyline.name.slice(0, 120 - suffix.length).trimEnd()}${suffix}`;
      if (piece.kind === "line") {
        const number = nextLineNumber(working);
        const line: LineObject = {
          ...piece.geometry,
          architecturalRole: null,
          foundationSupportWallId: null,
          foundationWallTypeId: null,
          id: `line-${String(number).padStart(2, "0")}`,
          layerId: polyline.layerId,
          locked: polyline.locked,
          name: uniqueObjectName(working, baseName),
          storyId: polyline.storyId,
          type: "line",
          wallExteriorSide: null,
          wallJoinPriority: null,
          wallStartJoinMode: null,
          wallEndJoinMode: null,
          wallReferenceLine: null,
          wallTypeId: null,
          wallOpenings: [],
        };
        working.lines.push(line);
        resultRefs.push({ id: line.id, kind: "line" });
      } else {
        const number = nextArcNumber(working);
        const arc: ArcObject = {
          ...piece.geometry,
          id: `arc-${String(number).padStart(2, "0")}`,
          layerId: polyline.layerId,
          locked: polyline.locked,
          name: uniqueObjectName(working, baseName),
          storyId: polyline.storyId,
          type: "arc",
        };
        working.arcs.push(arc);
        resultRefs.push({ id: arc.id, kind: "arc" });
      }
    });
  }

  const valid = working.lines.every(lineGeometryIsValid) && working.polylines.every(polylineGeometryIsValid) &&
    working.circles.every(circleGeometryIsValid) && working.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working) ? { document: working, refs: resultRefs } : null;
}

export function modelEntityLengthenEndpoints(
  document: ModelDocument,
  ref: ModelEntityRef,
): { start: LinePoint; end: LinePoint } | null {
  if (ref.kind === "line") {
    const line = findLineObject(document, ref.id);
    return line ? { start: { ...line.start }, end: { ...line.end } } : null;
  }
  if (ref.kind === "arc") {
    const arc = findArcObject(document, ref.id);
    return arc ? { start: arcPointAtFraction(arc, 0), end: arcPointAtFraction(arc, 1) } : null;
  }
  if (ref.kind === "polyline") {
    const polyline = findPolylineObject(document, ref.id);
    if (!polyline || polyline.closed) return null;
    return {
      start: { ...polyline.vertices[0], z: polyline.elevation },
      end: { ...polyline.vertices.at(-1)!, z: polyline.elevation },
    };
  }
  return null;
}

export function lengthenModelEntity(
  document: ModelDocument,
  ref: ModelEntityRef,
  endpoint: LengthenEndpoint,
  request: LengthenRequest,
): { document: ModelDocument; ref: ModelEntityRef } | null {
  if ((ref.kind !== "line" && ref.kind !== "arc" && ref.kind !== "polyline") || !modelEntityIsEditable(document, ref)) return null;
  const working = cloneDocument(document);
  let changed = false;
  if (ref.kind === "line") {
    working.lines = working.lines.map((line) => {
      if (line.id !== ref.id) return line;
      const geometry = lengthenLineGeometry(line, endpoint, request);
      changed = Boolean(geometry);
      return geometry ? { ...line, ...geometry } : line;
    });
  } else if (ref.kind === "arc") {
    working.arcs = working.arcs.map((arc) => {
      if (arc.id !== ref.id) return arc;
      const geometry = lengthenArcGeometry(arc, endpoint, request);
      changed = Boolean(geometry);
      return geometry ? { ...arc, ...geometry } : arc;
    });
  } else {
    working.polylines = working.polylines.map((polyline) => {
      if (polyline.id !== ref.id || polyline.closed) return polyline;
      const geometry = lengthenPolylineGeometry(polyline, endpoint, request);
      changed = Boolean(geometry);
      return geometry ? { ...polyline, ...geometry, shape: "polyline" as const } : polyline;
    });
  }
  if (!changed || documentsEqual(document, working)) return null;
  const valid = working.lines.every(lineGeometryIsValid) && working.polylines.every(polylineGeometryIsValid) &&
    working.circles.every(circleGeometryIsValid) && working.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working) ? { document: working, ref } : null;
}

export function extendModelEntity(
  document: ModelDocument,
  ref: ModelEntityRef,
  pick: LinePoint,
): { document: ModelDocument; ref: ModelEntityRef } | null {
  if ((ref.kind !== "line" && ref.kind !== "arc" && ref.kind !== "polyline") || !modelEntityIsEditable(document, ref)) return null;
  const boundaries = trimExtendBoundaries(document, ref);
  if (!boundaries.length) return null;
  const working = cloneDocument(document);
  let succeeded = false;
  if (ref.kind === "line") {
    working.lines = working.lines.map((line) => {
      if (line.id !== ref.id) return line;
      const geometry = extendLineGeometry(line, boundaries, pick);
      succeeded = Boolean(geometry);
      return geometry ? { ...line, ...geometry } : line;
    });
  } else if (ref.kind === "arc") {
    working.arcs = working.arcs.map((arc) => {
      if (arc.id !== ref.id) return arc;
      const geometry = extendArcGeometry(arc, boundaries, pick);
      succeeded = Boolean(geometry);
      return geometry ? { ...arc, ...geometry } : arc;
    });
  } else {
    working.polylines = working.polylines.map((polyline) => {
      if (polyline.id !== ref.id) return polyline;
      const geometry = extendPolylineGeometry(polyline, boundaries, pick);
      succeeded = Boolean(geometry);
      return geometry ? { ...polyline, ...geometry } : polyline;
    });
  }
  if (!succeeded) return null;
  const valid = working.lines.every(lineGeometryIsValid) && working.polylines.every(polylineGeometryIsValid) &&
    working.circles.every(circleGeometryIsValid) && working.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working) ? { document: working, ref } : null;
}

export type LineFilletPick = { id: string; point: LinePoint };

export type CurveFilletPick = { id: string; kind: "arc" | "line"; point: LinePoint };

export type LineChamferPick = { id: string; point: LinePoint };

function replacePolylineCornerGeometry(
  document: ModelDocument,
  id: string,
  geometry: PolylineGeometry | null,
): { document: ModelDocument; ref: ModelEntityRef } | null {
  const ref = { id, kind: "polyline" } satisfies ModelEntityRef;
  if (!geometry || !modelEntityIsEditable(document, ref)) return null;
  const source = findPolylineObject(document, id);
  if (!source || polylineGeometriesEqual(source, geometry)) return null;
  const working = cloneDocument(document);
  working.polylines = working.polylines.map((polyline) => polyline.id === id
    ? { ...polyline, ...clonePolylineGeometry(geometry), shape: "polyline" }
    : polyline);
  const valid = working.polylines.every(polylineGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working) ? { document: working, ref } : null;
}

export function chamferPolylineObject(
  document: ModelDocument,
  id: string,
  firstDistance: number,
  secondDistance: number,
): { document: ModelDocument; ref: ModelEntityRef } | null {
  const source = findPolylineObject(document, id);
  return replacePolylineCornerGeometry(
    document,
    id,
    source ? chamferPolylineCorners(source, firstDistance, secondDistance) : null,
  );
}

export function filletPolylineObject(
  document: ModelDocument,
  id: string,
  radius: number,
): { document: ModelDocument; ref: ModelEntityRef } | null {
  const source = findPolylineObject(document, id);
  return replacePolylineCornerGeometry(document, id, source ? filletPolylineCorners(source, radius) : null);
}

export function chamferLineObjects(
  document: ModelDocument,
  firstPick: LineChamferPick,
  secondPick: LineChamferPick,
  firstDistance: number,
  secondDistance: number,
): { document: ModelDocument; refs: ModelEntityRef[] } | null {
  if (
    firstPick.id === secondPick.id ||
    !Number.isFinite(firstDistance) ||
    !Number.isFinite(secondDistance) ||
    firstDistance < 0 ||
    secondDistance < 0
  ) return null;
  const firstRef = { id: firstPick.id, kind: "line" } satisfies ModelEntityRef;
  const secondRef = { id: secondPick.id, kind: "line" } satisfies ModelEntityRef;
  if (!modelEntityIsEditable(document, firstRef) || !modelEntityIsEditable(document, secondRef)) return null;
  if ((firstDistance > 0 || secondDistance > 0) && document.lines.length >= MAXIMUM_LINE_COUNT) return null;
  const first = findLineObject(document, firstPick.id);
  const second = findLineObject(document, secondPick.id);
  if (!first || !second || first.architecturalRole !== null || second.architecturalRole !== null) return null;
  const geometry = chamferLineGeometries(
    first,
    second,
    firstPick.point,
    secondPick.point,
    firstDistance,
    secondDistance,
  );
  if (!geometry) return null;

  const working = cloneDocument(document);
  working.lines = working.lines.map((line) => {
    if (line.id === first.id) return { ...line, ...cloneLineGeometry(geometry.first) };
    if (line.id === second.id) return { ...line, ...cloneLineGeometry(geometry.second) };
    return line;
  });
  const refs: ModelEntityRef[] = [firstRef, secondRef];
  if (geometry.chamfer) {
    const number = nextLineNumber(working);
    const chamfer: LineObject = {
      ...cloneLineGeometry(geometry.chamfer),
      architecturalRole: null,
      foundationSupportWallId: null,
      foundationWallTypeId: null,
      id: `line-${String(number).padStart(2, "0")}`,
      layerId: document.activeLayerId,
      locked: false,
      name: uniqueObjectName(working, `Chamfer ${String(number).padStart(2, "0")}`),
      storyId: first.storyId,
      type: "line",
      wallExteriorSide: null,
      wallJoinPriority: null,
      wallStartJoinMode: null,
      wallEndJoinMode: null,
      wallReferenceLine: null,
      wallTypeId: null,
      wallOpenings: [],
    };
    working.lines.push(chamfer);
    refs.push({ id: chamfer.id, kind: "line" });
  }
  const valid = working.lines.every(lineGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working) ? { document: working, refs } : null;
}

export function filletLineObjects(
  document: ModelDocument,
  firstPick: LineFilletPick,
  secondPick: LineFilletPick,
  radius: number,
): { document: ModelDocument; refs: ModelEntityRef[] } | null {
  if (firstPick.id === secondPick.id || !Number.isFinite(radius) || radius < 0) return null;
  const firstRef = { id: firstPick.id, kind: "line" } satisfies ModelEntityRef;
  const secondRef = { id: secondPick.id, kind: "line" } satisfies ModelEntityRef;
  if (!modelEntityIsEditable(document, firstRef) || !modelEntityIsEditable(document, secondRef)) return null;
  if (radius > 0 && document.arcs.length >= MAXIMUM_ARC_COUNT) return null;
  const first = findLineObject(document, firstPick.id);
  const second = findLineObject(document, secondPick.id);
  if (!first || !second || first.architecturalRole !== null || second.architecturalRole !== null) return null;
  const geometry = filletLineGeometries(first, second, firstPick.point, secondPick.point, radius);
  if (!geometry) return null;

  const working = cloneDocument(document);
  working.lines = working.lines.map((line) => {
    if (line.id === first.id) return { ...line, ...cloneLineGeometry(geometry.first) };
    if (line.id === second.id) return { ...line, ...cloneLineGeometry(geometry.second) };
    return line;
  });
  const refs: ModelEntityRef[] = [firstRef, secondRef];
  if (geometry.arc) {
    const number = nextArcNumber(working);
    const arc: ArcObject = {
      ...cloneArcGeometry(geometry.arc),
      id: `arc-${String(number).padStart(2, "0")}`,
      layerId: document.activeLayerId,
      locked: false,
      name: uniqueObjectName(working, `Fillet ${String(number).padStart(2, "0")}`),
      storyId: first.storyId,
      type: "arc",
    };
    working.arcs.push(arc);
    refs.push({ id: arc.id, kind: "arc" });
  }
  const valid = working.lines.every(lineGeometryIsValid) && working.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working) ? { document: working, refs } : null;
}

export function filletCurveObjects(
  document: ModelDocument,
  firstPick: CurveFilletPick,
  secondPick: CurveFilletPick,
  radius: number,
): { document: ModelDocument; refs: ModelEntityRef[] } | null {
  if (firstPick.kind === "line" && secondPick.kind === "line") {
    return filletLineObjects(document, firstPick, secondPick, radius);
  }
  if ((firstPick.kind === secondPick.kind && firstPick.id === secondPick.id) || !Number.isFinite(radius) || radius <= 0) return null;
  const firstRef = { id: firstPick.id, kind: firstPick.kind } satisfies ModelEntityRef;
  const secondRef = { id: secondPick.id, kind: secondPick.kind } satisfies ModelEntityRef;
  if (!modelEntityIsEditable(document, firstRef) || !modelEntityIsEditable(document, secondRef) || document.arcs.length >= MAXIMUM_ARC_COUNT) return null;

  const curveFor = (pick: CurveFilletPick): FilletCurveGeometry | null => {
    if (pick.kind === "line") {
      const geometry = findLineObject(document, pick.id);
      return geometry ? { geometry, kind: "line" } : null;
    }
    const geometry = findArcObject(document, pick.id);
    return geometry ? { geometry, kind: "arc" } : null;
  };
  const first = curveFor(firstPick);
  const second = curveFor(secondPick);
  if (!first || !second) return null;
  const geometry = filletCurveGeometries(first, second, firstPick.point, secondPick.point, radius);
  if (!geometry) return null;

  const working = cloneDocument(document);
  const applyResult = (ref: ModelEntityRef, result: FilletCurveGeometry) => {
    if (ref.kind === "line" && result.kind === "line") {
      working.lines = working.lines.map((line) => line.id === ref.id ? { ...line, ...cloneLineGeometry(result.geometry) } : line);
      return true;
    }
    if (ref.kind === "arc" && result.kind === "arc") {
      working.arcs = working.arcs.map((arc) => arc.id === ref.id ? { ...arc, ...cloneArcGeometry(result.geometry) } : arc);
      return true;
    }
    return false;
  };
  if (!applyResult(firstRef, geometry.first) || !applyResult(secondRef, geometry.second)) return null;

  const firstObject = firstPick.kind === "line" ? findLineObject(document, firstPick.id) : findArcObject(document, firstPick.id);
  const secondObject = secondPick.kind === "line" ? findLineObject(document, secondPick.id) : findArcObject(document, secondPick.id);
  const number = nextArcNumber(working);
  const fillet: ArcObject = {
    ...cloneArcGeometry(geometry.arc),
    id: `arc-${String(number).padStart(2, "0")}`,
    layerId: firstObject && secondObject && firstObject.layerId === secondObject.layerId ? firstObject.layerId : document.activeLayerId,
    locked: false,
    name: uniqueObjectName(working, `Fillet ${String(number).padStart(2, "0")}`),
    storyId: firstObject?.storyId ?? document.building.activeStoryId,
    type: "arc",
  };
  working.arcs.push(fillet);
  const refs: ModelEntityRef[] = [firstRef, secondRef, { id: fillet.id, kind: "arc" }];
  const valid = working.lines.every(lineGeometryIsValid) && working.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working) ? { document: working, refs } : null;
}

export function stretchModelEntities(
  document: ModelDocument,
  targets: CadStretchTarget[],
  delta: LinePoint,
): ModelDocument | null {
  const offset = snappedDelta(delta);
  if (!targets.length || (!offset.x && !offset.y && !offset.z)) return null;
  const uniqueTargets = targets.filter((target, index, all) =>
    all.findIndex((candidate) => candidate.kind === target.kind && candidate.id === target.id) === index);
  const refs = uniqueTargets.map(({ id, kind }) => ({ id, kind } satisfies ModelEntityRef));
  if (refs.some((ref) => !modelEntityIsEditable(document, ref))) return null;

  const wholeRefs = uniqueTargets
    .filter((target) => target.whole)
    .map(({ id, kind }) => ({ id, kind } satisfies ModelEntityRef));
  const moved = wholeRefs.length ? moveModelEntities(document, wholeRefs, offset) : cloneDocument(document);
  if (!moved) return null;

  for (const target of uniqueTargets.filter((candidate) => !candidate.whole)) {
    if (target.kind === "line") {
      const source = findLineObject(moved, target.id);
      const geometry = source ? stretchLineGeometry(source, target.components, offset) : null;
      if (!source || !geometry) return null;
      if (source.architecturalRole !== null) {
        const roughFloor = calculateStoryElevations(moved.building).find((story) => story.storyId === source.storyId)?.roughFloorElevation;
        if (roughFloor === undefined) return null;
        geometry.start.z = roughFloor;
        geometry.end.z = roughFloor;
      }
      const index = moved.lines.findIndex((line) => line.id === source.id);
      moved.lines[index] = { ...source, ...geometry };
      continue;
    }
    if (target.kind === "polyline") {
      const source = findPolylineObject(moved, target.id);
      const geometry = source ? stretchPolylineGeometry(source, target.components, offset) : null;
      if (!source || !geometry) return null;
      const index = moved.polylines.findIndex((polyline) => polyline.id === source.id);
      moved.polylines[index] = { ...source, ...geometry, shape: "polyline" };
      continue;
    }
    return null;
  }
  const valid = moved.lines.every(lineGeometryIsValid) && moved.polylines.every(polylineGeometryIsValid) &&
    moved.circles.every(circleGeometryIsValid) && moved.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(moved) ? moved : null;
}

export function copyModelEntities(document: ModelDocument, refs: ModelEntityRef[], delta: LinePoint): { document: ModelDocument; refs: ModelEntityRef[] } | null {
  const selected = normalizedEntityRefs(refs);
  const offset = snappedDelta(delta);
  if (!selected.length || (!offset.x && !offset.y && !offset.z) || selected.some((ref) => !modelEntityIsEditable(document, ref))) return null;
  const counts = {
    arc: selected.filter((ref) => ref.kind === "arc").length,
    box: selected.filter((ref) => ref.kind === "box").length,
    circle: selected.filter((ref) => ref.kind === "circle").length,
    line: selected.filter((ref) => ref.kind === "line").length,
    polyline: selected.filter((ref) => ref.kind === "polyline").length,
  };
  if (document.arcs.length + counts.arc > MAXIMUM_ARC_COUNT || document.objects.length + counts.box > MAXIMUM_OBJECT_COUNT || document.circles.length + counts.circle > MAXIMUM_CIRCLE_COUNT || document.lines.length + counts.line > MAXIMUM_LINE_COUNT || document.polylines.length + counts.polyline > MAXIMUM_POLYLINE_COUNT) return null;
  const working = cloneDocument(document);
  const copiedRefs: ModelEntityRef[] = [];
  const copiedLineIds = new Map<string, string>();
  for (const ref of selected) {
    if (ref.kind === "box") {
      const source = findBoxObject(working, ref.id)!;
      const copy = cloneBoxObject(source);
      const number = nextObjectNumber(working);
      copy.id = `box-${String(number).padStart(2, "0")}`;
      copy.name = uniqueObjectName(working, `${source.name.slice(0, 115).trimEnd()} Copy`);
      copy.groupId = null; copy.locked = false;
      copy.position = { x: source.position.x + offset.x, y: source.position.y + offset.y, z: source.position.z + offset.z };
      working.objects.push(copy); copiedRefs.push({ id: copy.id, kind: "box" });
    } else if (ref.kind === "line") {
      const source = findLineObject(working, ref.id)!;
      const copy = cloneLineObject(source); const number = nextLineNumber(working);
      copy.id = `line-${String(number).padStart(2, "0")}`; copy.name = uniqueObjectName(working, `${source.name.slice(0, 115).trimEnd()} Copy`); copy.locked = false;
      copy.start = { x: source.start.x + offset.x, y: source.start.y + offset.y, z: source.start.z + (source.architecturalRole !== null ? 0 : offset.z) }; copy.end = { x: source.end.x + offset.x, y: source.end.y + offset.y, z: source.end.z + (source.architecturalRole !== null ? 0 : offset.z) };
      working.lines.push(copy); copiedLineIds.set(source.id, copy.id); copiedRefs.push({ id: copy.id, kind: "line" });
    } else if (ref.kind === "polyline") {
      const source = findPolylineObject(working, ref.id)!;
      const copy = clonePolylineObject(source); const number = nextPolylineNumber(working);
      copy.id = `polyline-${String(number).padStart(2, "0")}`; copy.name = uniqueObjectName(working, `${source.name.slice(0, 115).trimEnd()} Copy`); copy.locked = false;
      copy.elevation = source.elevation + offset.z; copy.vertices = source.vertices.map((point) => ({ x: point.x + offset.x, y: point.y + offset.y }));
      working.polylines.push(copy); copiedRefs.push({ id: copy.id, kind: "polyline" });
    } else if (ref.kind === "circle") {
      const source = findCircleObject(working, ref.id)!;
      const copy = cloneCircleObject(source); const number = nextCircleNumber(working);
      copy.id = `circle-${String(number).padStart(2, "0")}`; copy.name = uniqueObjectName(working, `${source.name.slice(0, 115).trimEnd()} Copy`); copy.locked = false;
      copy.center = { x: source.center.x + offset.x, y: source.center.y + offset.y, z: source.center.z + offset.z };
      working.circles.push(copy); copiedRefs.push({ id: copy.id, kind: "circle" });
    } else {
      const source = findArcObject(working, ref.id)!;
      const copy = cloneArcObject(source); const number = nextArcNumber(working);
      copy.id = `arc-${String(number).padStart(2, "0")}`; copy.name = uniqueObjectName(working, `${source.name.slice(0, 115).trimEnd()} Copy`); copy.locked = false;
      copy.center = { x: source.center.x + offset.x, y: source.center.y + offset.y, z: source.center.z + offset.z };
      working.arcs.push(copy); copiedRefs.push({ id: copy.id, kind: "arc" });
    }
  }
  copiedLineIds.forEach((copiedId, sourceId) => {
    const source = findLineObject(document, sourceId);
    const copy = findLineObject(working, copiedId);
    const copiedSupportId = source?.foundationSupportWallId ? copiedLineIds.get(source.foundationSupportWallId) : null;
    if (copy && copiedSupportId) copy.foundationSupportWallId = copiedSupportId;
  });
  return documentCoordinatesWithinBounds(working)
    ? { document: working, refs: copiedRefs }
    : null;
}

export function deleteModelEntities(document: ModelDocument, refs: ModelEntityRef[]): ModelDocument | null {
  const selected = normalizedEntityRefs(refs);
  if (!selected.length || selected.some((ref) => !modelEntityIsEditable(document, ref))) return null;
  const keys = new Set(selected.map((ref) => `${ref.kind}:${ref.id}`));
  const next = cloneDocument(document);
  next.objects = next.objects.filter((object) => !keys.has(`box:${object.id}`));
  next.lines = next.lines.filter((line) => !keys.has(`line:${line.id}`));
  const remainingFoundationWallIds = new Set(next.lines.filter((line) => line.architecturalRole === "foundation-wall").map((line) => line.id));
  next.lines = next.lines.map((line) => line.foundationSupportWallId !== null && !remainingFoundationWallIds.has(line.foundationSupportWallId)
    ? { ...line, foundationSupportWallId: null }
    : line);
  next.rooms = next.rooms.filter((room) => room.boundaryWallIds.every((wallId) => next.lines.some((line) => line.id === wallId && line.storyId === room.storyId && line.architecturalRole === "wall")));
  next.polylines = next.polylines.filter((polyline) => !keys.has(`polyline:${polyline.id}`));
  next.circles = next.circles.filter((circle) => !keys.has(`circle:${circle.id}`));
  next.arcs = next.arcs.filter((arc) => !keys.has(`arc:${arc.id}`));
  const usedGroups = new Set(next.objects.map((object) => object.groupId).filter((id): id is string => Boolean(id)));
  next.groups = next.groups.filter((group) => usedGroups.has(group.id));
  return next;
}

function nextGroupNumber(document: ModelDocument): number {
  const usedNumbers = document.groups.map((group) => {
    const match = /^group-(\d+)$/i.exec(group.id);
    return match ? Number(match[1]) : 0;
  });
  return Math.max(0, ...usedNumbers) + 1;
}

export function groupBoxObjects(
  document: ModelDocument,
  objectIds: string[],
): { document: ModelDocument; group: ModelGroup } | null {
  const ids = new Set(objectIds);
  if (ids.size < 2 || document.groups.length >= MAXIMUM_GROUP_COUNT) return null;
  const objects = document.objects.filter((object) => ids.has(object.id));
  if (
    objects.length !== ids.size ||
    objects.some((object) => object.groupId || !objectIsEditable(document, object))
  ) {
    return null;
  }
  const number = nextGroupNumber(document);
  const group: ModelGroup = {
    id: `group-${String(number).padStart(2, "0")}`,
    name: `Group ${String(number).padStart(2, "0")}`,
  };
  const next = cloneDocument(document);
  next.groups = [...next.groups, group];
  next.objects = next.objects.map((object) => ({ ...object, groupId: ids.has(object.id) ? group.id : object.groupId }));
  return {
    document: next,
    group: cloneGroup(group),
  };
}

export function ungroupBoxObjects(
  document: ModelDocument,
  groupId: string,
): ModelDocument | null {
  const group = findGroup(document, groupId);
  const members = document.objects.filter((object) => object.groupId === groupId);
  if (!group || members.length < 2 || members.some((object) => !objectIsEditable(document, object))) {
    return null;
  }
  const next = cloneDocument(document);
  next.groups = next.groups.filter((candidate) => candidate.id !== groupId);
  next.objects = next.objects.map((object) => ({ ...object, groupId: object.groupId === groupId ? null : object.groupId }));
  return next;
}

export function renameGroup(
  document: ModelDocument,
  groupId: string,
  name: string,
): ModelDocument | null {
  const normalizedName = name.trim();
  const group = findGroup(document, groupId);
  if (!group || !normalizedName || normalizedName.length > 80) return null;
  if (
    document.groups.some(
      (candidate) => candidate.id !== groupId && candidate.name.toLowerCase() === normalizedName.toLowerCase(),
    ) ||
    document.objects.some(
      (object) => object.groupId === groupId && !objectIsEditable(document, object),
    )
  ) {
    return null;
  }
  const next = cloneDocument(document);
  next.groups = next.groups.map((candidate) =>
    candidate.id === groupId ? { ...candidate, name: normalizedName } : candidate,
  );
  return next;
}

export function setBoxObjectsLocked(
  document: ModelDocument,
  objectIds: string[],
  locked: boolean,
): ModelDocument | null {
  const ids = new Set(objectIds);
  if (!ids.size || document.objects.filter((object) => ids.has(object.id)).length !== ids.size) {
    return null;
  }
  return withObjects(
    document,
    document.objects.map((object) =>
      ids.has(object.id) ? { ...cloneBoxObject(object), locked } : object,
    ),
  );
}

function nextLayerNumber(document: ModelDocument): number {
  const usedNumbers = document.layers.map((layer) => {
    const match = /^layer-(\d+)$/i.exec(layer.id);
    return match ? Number(match[1]) : 0;
  });
  return Math.max(0, ...usedNumbers) + 1;
}

export function addLayer(document: ModelDocument): {
  document: ModelDocument;
  layer: ModelLayer;
} | null {
  if (document.layers.length >= MAXIMUM_LAYER_COUNT) return null;
  const number = nextLayerNumber(document);
  const layer: ModelLayer = {
    color: LAYER_COLORS[(number - 1) % LAYER_COLORS.length],
    id: `layer-${String(number).padStart(2, "0")}`,
    lineStyle: "solid",
    lineWeight: 1,
    locked: false,
    name: `Layer ${number}`,
    printColor: LAYER_COLORS[(number - 1) % LAYER_COLORS.length],
    visible: true,
  };
  const layers = [...document.layers.map(cloneLayer), layer];
  return {
    document: {
      activeLayerSetId: document.activeLayerSetId,
      activeLayerId: layer.id,
      activeSavedPlanViewId: document.activeSavedPlanViewId,
      arcs: document.arcs.map(cloneArcObject),
      building: cloneBuildingStructure(document.building),
      circles: document.circles.map(cloneCircleObject),
      groups: document.groups.map(cloneGroup),
      layers,
      layerSets: document.layerSets.map((set) => ({ ...cloneLayerSet(set), layers: [...set.layers.map((state) => ({ ...state })), layerSetStateFromLayer(layer)] })),
      lines: document.lines.map(cloneLineObject),
      objects: document.objects.map(cloneBoxObject),
      polylines: document.polylines.map(clonePolylineObject),
      rooms: (document.rooms ?? []).map(cloneRoomObject),
      roomAnnotations: document.roomAnnotations.map(cloneRoomAnnotation),
      savedPlanViews: document.savedPlanViews.map(cloneSavedPlanView),
    },
    layer: cloneLayer(layer),
  };
}

function syncActiveLayerSet(document: ModelDocument): ModelDocument {
  const next = cloneDocument(document);
  next.layerSets = next.layerSets.map((set) => set.id === next.activeLayerSetId
    ? { ...set, layers: next.layers.map(layerSetStateFromLayer) }
    : set);
  return next;
}

export function modelObjectCategory(value: BoxObject | LineObject | PolylineObject | CircleObject | ArcObject | RoomObject | RoomAnnotationObject | WallOpening): ModelObjectCategory {
  if ("kind" in value && (value.kind === "door" || value.kind === "window")) return value.kind;
  if ("roomId" in value) {
    if (value.kind === "area") return "room-area";
    if (value.kind === "interior-dimensions") return "room-interior-dimensions";
    if (value.kind === "rough-ceiling-height") return "room-ceiling-height";
    return "room-label";
  }
  if ("boundaryWallIds" in value) return "room";
  if ("type" in value) {
    if (value.type === "box") return "generic-object";
    if (value.type === "circle") return "circle";
    if (value.type === "arc") return "arc";
    if (value.type === "polyline") return value.architecturalRole === "floor-platform" ? "floor-platform" : "polyline";
    if (value.architecturalRole === "wall") return "wall";
    if (value.architecturalRole === "foundation-wall") return "foundation-wall";
  }
  return "line";
}

export function updateLayerAppearance(document: ModelDocument, layerId: string, change: Partial<Pick<ModelLayer, "color" | "lineStyle" | "lineWeight" | "printColor">>): ModelDocument | null {
  const layer = findLayer(document, layerId);
  if (!layer) return null;
  const colorValid = (value: string | undefined) => value === undefined || /^#[0-9a-f]{6}$/i.test(value);
  if (!colorValid(change.color) || !colorValid(change.printColor) || change.lineStyle !== undefined && !(["solid", "dashed", "dotted", "center"] satisfies ModelLineStyle[]).includes(change.lineStyle) || change.lineWeight !== undefined && (!Number.isInteger(change.lineWeight) || change.lineWeight < 1 || change.lineWeight > 10)) return null;
  const next = cloneDocument(document);
  next.layers = next.layers.map((item) => item.id === layerId ? { ...item, ...change } : item);
  return syncActiveLayerSet(next);
}

export function activateLayerSet(document: ModelDocument, layerSetId: string): ModelDocument | null {
  if (!document.layerSets.some((set) => set.id === layerSetId)) return null;
  const currentSaved = syncActiveLayerSet(document);
  const target = currentSaved.layerSets.find((set) => set.id === layerSetId);
  if (!target) return null;
  const stateById = new Map(target.layers.map((state) => [state.id, state]));
  const next = cloneDocument(currentSaved);
  next.activeLayerSetId = layerSetId;
  next.layers = next.layers.map((item) => ({ ...item, ...(stateById.get(item.id) ?? {}) }));
  const active = next.layers.find((item) => item.id === next.activeLayerId);
  if (!active || !active.visible || active.locked) {
    next.activeLayerId = next.layers.find((item) => item.visible && !item.locked)?.id ?? DEFAULT_LAYER_ID;
  }
  return next;
}

export function duplicateLayerSet(document: ModelDocument, sourceId = document.activeLayerSetId): ModelDocument | null {
  if (document.layerSets.length >= 32) return null;
  const source = document.layerSets.find((set) => set.id === sourceId);
  if (!source) return null;
  let number = 1;
  while (document.layerSets.some((set) => set.id === `layer-set-${String(number).padStart(2, "0")}`)) number += 1;
  const nextSet: LayerSet = { id: `layer-set-${String(number).padStart(2, "0")}`, layers: document.layers.map(layerSetStateFromLayer), name: `Layer Set ${number}` };
  const next = cloneDocument(document);
  next.layerSets.push(nextSet);
  next.activeLayerSetId = nextSet.id;
  return next;
}

export function renameLayerSet(document: ModelDocument, layerSetId: string, name: string): ModelDocument | null {
  const normalized = name.trim();
  if (!normalized || normalized.length > 80 || !document.layerSets.some((set) => set.id === layerSetId) || document.layerSets.some((set) => set.id !== layerSetId && set.name.toLowerCase() === normalized.toLowerCase())) return null;
  const next = cloneDocument(document);
  next.layerSets = next.layerSets.map((set) => set.id === layerSetId ? { ...set, name: normalized } : set);
  return next;
}

export function savePlanView(document: ModelDocument, input: Omit<SavedPlanView, "id">): ModelDocument | null {
  if (!document.layerSets.some((set) => set.id === input.layerSetId) || !document.layers.some((layer) => layer.id === input.activeLayerId) || !document.building.stories.some((story) => story.id === input.storyId) || input.referenceStoryId !== null && !document.building.stories.some((story) => story.id === input.referenceStoryId) || !Number.isFinite(input.annotationScale) || input.annotationScale < 1 || input.annotationScale > 1200 || !input.name.trim() || input.name.trim().length > 80) return null;
  let number = 1;
  while (document.savedPlanViews.some((view) => view.id === `saved-view-${String(number).padStart(2, "0")}`)) number += 1;
  const view: SavedPlanView = { ...input, id: `saved-view-${String(number).padStart(2, "0")}`, name: input.name.trim() };
  const next = cloneDocument(document);
  next.savedPlanViews.push(view);
  next.activeSavedPlanViewId = view.id;
  return next;
}

export function updateSavedPlanView(document: ModelDocument, viewId: string, change: Partial<Omit<SavedPlanView, "id">>): ModelDocument | null {
  const current = document.savedPlanViews.find((view) => view.id === viewId);
  if (!current) return null;
  const updated = { ...current, ...change, name: change.name?.trim() || current.name };
  if (!document.layerSets.some((set) => set.id === updated.layerSetId) || !document.layers.some((layer) => layer.id === updated.activeLayerId) || !document.building.stories.some((story) => story.id === updated.storyId) || updated.referenceStoryId !== null && !document.building.stories.some((story) => story.id === updated.referenceStoryId) || !Number.isFinite(updated.annotationScale) || updated.annotationScale < 1 || updated.annotationScale > 1200 || updated.name.length > 80) return null;
  const next = cloneDocument(document);
  next.savedPlanViews = next.savedPlanViews.map((view) => view.id === viewId ? updated : view);
  return next;
}

export function activateSavedPlanView(document: ModelDocument, viewId: string): ModelDocument | null {
  const view = document.savedPlanViews.find((candidate) => candidate.id === viewId);
  if (!view) return null;
  const withLayers = activateLayerSet(document, view.layerSetId);
  if (!withLayers) return null;
  const next = cloneDocument(withLayers);
  next.activeSavedPlanViewId = view.id;
  next.activeLayerId = next.layers.some((layer) => layer.id === view.activeLayerId && layer.visible && !layer.locked) ? view.activeLayerId : next.activeLayerId;
  next.building.activeStoryId = view.storyId;
  return next;
}

export function setActiveLayer(
  document: ModelDocument,
  layerId: string,
): ModelDocument | null {
  if (!findLayer(document, layerId)) return null;
  const next = cloneDocument(document);
  next.activeLayerId = layerId;
  next.layers = next.layers.map((layer) =>
    layer.id === layerId ? { ...layer, locked: false, visible: true } : layer,
  );
  return next;
}

export function toggleLayerVisibility(
  document: ModelDocument,
  layerId: string,
): ModelDocument | null {
  const layer = findLayer(document, layerId);
  if (!layer || layerId === document.activeLayerId) return null;
  const next = cloneDocument(document);
  next.layers = next.layers.map((item) =>
    item.id === layerId ? { ...item, visible: !item.visible } : item,
  );
  return syncActiveLayerSet(next);
}

export function toggleLayerLock(
  document: ModelDocument,
  layerId: string,
): ModelDocument | null {
  const layer = findLayer(document, layerId);
  if (!layer || layerId === document.activeLayerId) return null;
  const next = cloneDocument(document);
  next.layers = next.layers.map((item) =>
    item.id === layerId ? { ...item, locked: !item.locked } : item,
  );
  return syncActiveLayerSet(next);
}

export function assignObjectToLayer(
  document: ModelDocument,
  objectId: string,
  layerId: string,
): ModelDocument | null {
  const object = findBoxObject(document, objectId);
  if (!object || !objectIsEditable(document, object) || !findLayer(document, layerId)) return null;
  return withObjects(
    document,
    document.objects.map((object) =>
      object.id === objectId ? { ...cloneBoxObject(object), layerId } : object,
    ),
  );
}

export function renameLayer(
  document: ModelDocument,
  layerId: string,
  name: string,
): ModelDocument | null {
  const normalizedName = name.trim();
  if (!findLayer(document, layerId) || !normalizedName || normalizedName.length > 80) return null;
  if (document.layers.some((layer) => layer.id !== layerId && layer.name.toLowerCase() === normalizedName.toLowerCase())) return null;
  const next = cloneDocument(document);
  next.layers = next.layers.map((layer) =>
    layer.id === layerId ? { ...layer, name: normalizedName } : layer,
  );
  return next;
}

export function deleteLayer(
  document: ModelDocument,
  layerId: string,
): ModelDocument | null {
  if (
    Object.values(STANDARD_LAYER_IDS).includes(layerId) ||
    layerId === document.activeLayerId ||
    !findLayer(document, layerId) ||
    document.objects.some((object) => object.layerId === layerId) ||
    document.lines.some((line) => line.layerId === layerId) ||
    document.polylines.some((polyline) => polyline.layerId === layerId) ||
    document.circles.some((circle) => circle.layerId === layerId) ||
    document.arcs.some((arc) => arc.layerId === layerId)
    || document.rooms.some((room) => room.layerId === layerId)
    || document.roomAnnotations.some((annotation) => annotation.layerId === layerId)
    || document.lines.some((line) => line.wallOpenings.some((opening) => opening.layerId === layerId))
  ) {
    return null;
  }
  const next = cloneDocument(document);
  next.layers = next.layers.filter((layer) => layer.id !== layerId);
  next.layerSets = next.layerSets.map((set) => ({ ...set, layers: set.layers.filter((layer) => layer.id !== layerId) }));
  return next;
}
