"use client";

import {
  ARC_METHODS,
  arcFromCenterStartAngle,
  arcFromCenterStartEnd,
  arcFromCenterStartLength,
  arcFromStartCenterAngle,
  arcFromStartCenterEnd,
  arcFromStartCenterLength,
  arcFromStartEndAngle,
  arcFromStartEndDirection,
  arcFromStartEndDirectionAngle,
  arcFromStartEndRadius,
  arcFromThreePoints,
  arcGripPoints,
  arcLength,
  arcPointAtFraction,
  arcSweepAngle,
  type ArcGeometry,
  type ArcGrip,
  type ArcMethod,
} from "@/lib/cad-arc";
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  formatArchitectural,
  formatSignedArchitectural,
  parseArchitectural,
  parseSignedArchitectural,
  snapToSixteenth,
} from "@/lib/architectural-units";
import {
  boxLocalAxis,
  boxWorldBounds,
  boxWorldPoint,
  cloneBoxModel,
  FACE_DEFINITIONS,
  MAXIMUM_COORDINATE,
  moveBoxFace,
  ROTATION_BASE_DEFINITIONS,
  snapRotationAngle,
  type AxisKey,
  type BoxModel,
  type DimensionKey,
  type RotationBaseKey,
} from "@/lib/box-model";
import {
  BOX_GRIP_DEFINITIONS,
  boxGripPosition,
  faceIndexForBoxGrip,
  resizeBoxFromGrip,
  type BoxGripDefinition,
  type BoxGripKind,
} from "@/lib/box-grips";
import {
  lineAngle,
  lineElevationAngle,
  lineFromDirection,
  lineFromLengthAngles,
  lineLength,
  lineMidpoint,
  parseLineCoordinate,
  snapLinePoint,
  type LineGeometry,
  type LinePoint,
  type PlanPoint,
} from "@/lib/cad-line";
import {
  CIRCLE_METHODS,
  circleArea,
  circleCircumference,
  circleDiameter,
  circleFromCenterDiameter,
  circleFromCenterPoint,
  circleFromCenterRadius,
  circleFromDiameterPoints,
  circleFromThreePoints,
  circleFromThreeTangencies,
  circleFromTwoTangenciesRadius,
  circleGripPoints,
  type CircleGeometry,
  type CircleGrip,
  type CircleMethod,
  type CircleTangentConstraint,
} from "@/lib/cad-circle";
import {
  acquireCadPoint,
  circularQuadrantPoints,
  DEFAULT_OBJECT_SNAP_MODES,
  derivedSnapCandidates,
  nearestPointOnCircularCurve,
  nearestPointOnSegment,
  trackingCandidatesFromAcquiredPoints,
  type CadSnapCandidate,
  type CadSnapKind,
  type CircularSnapGeometry,
  type ObjectSnapMode,
} from "@/lib/cad-point-acquisition";
import {
  advanceSelectionCycle,
  cadEntityKey,
  cadEntityRefFromKey,
  selectScreenGeometries,
  selectScreenStretchTargets,
  visibleCadEntityRefs,
  type CadEntityRef,
  type ScreenPoint,
  type ScreenSelectionGeometry,
  type ScreenStretchGeometry,
  type SelectionCycleState,
  type SelectionWindowMode,
} from "@/lib/cad-selection";
import type { CadStretchTarget } from "@/lib/cad-stretch";
import {
  parseRectangleDimensionPair,
  polylineArea,
  polylineBulgeFromThreePoints,
  polylineCentroid,
  polylineLength,
  polylinePathPoints,
  polylineSegmentPoints,
  polylineSegmentCircularGeometry,
  polylineSegments,
  rectangleDimensions,
  rectangleFromArea,
  rectangleFromCorners,
  rectangleFromDimensions,
  rectangleGripPoints,
  rectangleSupportsConstrainedGrips,
  type PolylineGeometry,
  type RectangleAreaBasis,
  type RectangleConstructionOptions,
  type RectangleGrip,
} from "@/lib/cad-polyline";
import {
  closestLengthenEndpoint,
  type LengthenEndpoint,
  type LengthenMethod,
  type LengthenRequest,
} from "@/lib/cad-lengthen";
import {
  addArcObject,
  addCircleObject,
  addPolylineObject,
  addLineObject,
  addWallOpening,
  addLayer,
  addBoxObject,
  alignBoxObjects,
  assignObjectToLayer,
  assignArcToLayer,
  assignCircleToLayer,
  assignLineToLayer,
  assignModelEntityToStory,
  assignPolylineToLayer,
  assignFoundationWallType,
  assignWallFoundationSupport,
  assignWallOpeningType,
  assignWallType,
  cloneDocument,
  arcIsEditable,
  circleIsEditable,
  copyModelEntities,
  copyBoxObjects,
  createFloorPlatformFromPolyline,
  createFoundationWallFromLine,
  createWallFromLine,
  createBoundaryPolylineObject,
  continuePlatformOpening,
  DEFAULT_LAYER_ID,
  NEW_PROJECT_DOCUMENT,
  deleteLayer,
  deleteArcObject,
  deleteLineObject,
  deleteWallOpening,
  deletePolylineObject,
  deleteBoxObject,
  deleteBoxObjects,
  deleteCircleObject,
  deleteModelEntities,
  documentsEqual,
  discoverDocumentBoundary,
  findBoxObject,
  findArcObject,
  findCircleObject,
  findGroup,
  findLayer,
  findLineObject,
  findPolylineObject,
  groupBoxObjects,
  breakModelEntity,
  explodeModelEntities,
  lengthenModelEntity,
  modelEntityLengthenEndpoints,
  joinModelEntities,
  chamferLineObjects,
  chamferPolylineObject,
  mirrorModelEntities,
  offsetModelEntity,
  filletCurveObjects,
  filletPolylineObject,
  extendModelEntity,
  trimModelEntity,
  moveBoxObject,
  moveBoxObjects,
  moveModelEntities,
  modelEntityIsEditable,
  modelSelectionBounds,
  modelSelectionRotationBase,
  modelSelectionScaleBase,
  objectIsEditable,
  lineIsEditable,
  polylineIsEditable,
  renameGroup,
  renameArcObject,
  renameLayer,
  renameLineObject,
  renamePolylineObject,
  renameBoxObject,
  renameCircleObject,
  removeFloorPlatformRole,
  removeWallRole,
  refreshRoomsForStory,
  resolveOpeningComponents,
  roomObjectIsValid,
  rotateModelEntities,
  scaleModelEntities,
  stretchModelEntities,
  selectionIdsForObject,
  setActiveLayer,
  setArcLocked,
  setBoxObjectsLocked,
  setBoxObjectPosition,
  setCircleLocked,
  setLineLocked,
  setPolylineLocked,
  snapObjectMoveDistance,
  toggleLayerLock,
  toggleLayerVisibility,
  ungroupBoxObjects,
  updateDocumentBuilding,
  updateBoxObject,
  updateArcGrip,
  updateArcObject,
  updateCircleGrip,
  updateCircleObject,
  updateLineGrip,
  updateLineObject,
  updateWallPlacement,
  updateWallOpening,
  updatePolylineObjectGrip,
  updatePolylineObject,
  updatePolylineObjectVertex,
  addPlatformOpening,
  deletePlatformOpening,
  disconnectPlatformOpeningContinuity,
  effectiveRoomSettings,
  PLATFORM_OPENING_CUTS,
  PLATFORM_OPENING_KINDS,
  platformOpeningContinuity,
  platformOpeningContinuityIsValid,
  roomHorizontalPlatformSolution,
  updatePlatformOpening,
  foundationSillOffsetFromReference,
  foundationWallVerticalExtent,
  wallVerticalExtent,
  type BoxObject,
  type ArcObject,
  type CircleObject,
  type CurveFilletPick,
  type LineObject,
  type WallOpening,
  type WallOpeningKind,
  type PolylineObject,
  type PlatformOpening,
  type AlignmentMode,
  type ModelDocument,
  type ModelEntityRef,
  type OpeningComponentOverride,
  type RoomObject,
  type RoomHorizontalPlatformSolution,
  type FoundationWallVerticalExtent,
  type WallVerticalExtent,
} from "@/lib/document-model";
import {
  addBuildingStory,
  assemblyTotalThickness,
  buildingStructureIsValid,
  calculateStoryElevations,
  cloneBuildingStructure,
  cloneFoundationWallType,
  cloneWallHeaderType,
  cloneLayeredAssembly,
  cloneWallOpeningType,
  configureDoorPanelLayout,
  configureWindowLitePattern,
  configureWindowSashArrangement,
  doorPanelLayoutForType,
  DOOR_PANEL_LAYOUTS,
  MAXIMUM_OPENING_COMPONENT_COUNT,
  OPENING_COMPONENT_DEPTH_ANCHORS,
  OPENING_COMPONENT_GEOMETRIES,
  OPENING_COMPONENT_ROLES,
  foundationConditionPlateDefaults,
  foundationSillStackHeight,
  FOUNDATION_WALL_CONDITIONS,
  MAXIMUM_WALL_OPENING_TYPE_COUNT,
  MAXIMUM_WALL_HEADER_TYPE_COUNT,
  removeBuildingStory,
  recommendedWallHeaderTypeId,
  resolveWallHeaderType,
  wallDefaultHeaderTypeId,
  wallLayerGroupThickness,
  wallFramingSettingsAreValid,
  wallHeaderTypeRequiredMainThickness,
  WALL_LAYER_GROUPS,
  windowLitePatternForType,
  WINDOW_LITE_PATTERNS,
  windowSashArrangementForType,
  WINDOW_SASH_ARRANGEMENTS,
  type AssemblyKind,
  type AssemblyLayer,
  type AssemblyLayerRole,
  type BuildingStructure,
  type DoorPanelLayout,
  type FoundationWallCondition,
  type FoundationWallType,
  type LayeredAssembly,
  type OpeningAssemblyComponent,
  type WindowLitePattern,
  type WindowSashArrangement,
  type WallExteriorSide,
  type WallJoinMode,
  type WallCornerFramingStyle,
  type WallLayerGroup,
  type WallLocation,
  type WallOpeningType,
  type WallHeaderType,
  type WallFramingSettings,
  type WallPartitionBackingStyle,
  type WallReferenceLine,
  type WallStructuralRole,
} from "@/lib/building-stories";
import {
  automaticWallJoinCount,
  buildAutomaticWallJoinPlan,
  unresolvedWallJunctionCount,
  wallEndCapFootprints,
  wallLayerSolidSegments,
  wallOpeningComponentSolids,
  wallOpeningReturnSolids,
  type AutomaticWallJoinPlan,
} from "@/lib/wall-joins";
import { wallFramingSolids } from "@/lib/wall-framing";
import {
  automaticFoundationWallJoinCount,
  buildAutomaticFoundationWallJoinPlan,
  foundationBandFootprint,
  unresolvedFoundationWallJunctionCount,
  type AutomaticFoundationWallJoinPlan,
} from "@/lib/foundation-wall-joins";
import {
  createProjectDocument,
  parseProjectDocument,
  projectFilename,
  projectToDocument,
  serializeProjectDocument,
} from "@/lib/project-file";
import {
  createRecoverySnapshot,
  parseRecoverySnapshot,
  PROJECT_RECOVERY_STORAGE_KEY,
  serializeRecoverySnapshot,
} from "@/lib/project-recovery";
import {
  navigationTargetFromDirection,
  VIEW_PRESETS,
  type ViewDirection,
  type ViewTarget,
} from "@/lib/view-navigation";

type DragStatus = {
  angle?: number;
  axis?: AxisKey;
  axisDistances?: Partial<Record<AxisKey, number>>;
  distance: number;
  factor?: number;
  gripKind?: BoxGripKind;
  kind: "arc" | "arc-grip" | "boundary" | "break" | "chamfer" | "circle" | "circle-grip" | "copy" | "entry" | "extend" | "face" | "fillet" | "grip" | "lengthen" | "line" | "line-grip" | "mirror" | "object" | "offset" | "plan-move" | "polyline" | "polyline-grip" | "rectangle" | "rotate" | "scale" | "stretch" | "trim";
  snapped?: boolean;
  polarAngle?: number | null;
  valid: boolean;
};
type LineViewportCommand =
  | { id: number; kind: "coordinate"; point: LinePoint }
  | { distance: number; id: number; kind: "distance" }
  | { id: number; kind: "close" | "undo" };
type RectangleViewportCommand =
  | { id: number; kind: "coordinate"; point: LinePoint }
  | { height: number; id: number; kind: "dimensions"; width: number };
type RectangleMethod = "area" | "corners" | "dimensions";
type RectangleCornerStyle = "chamfer" | "fillet" | "sharp";
type RectangleDraftSettings = RectangleConstructionOptions & {
  area: number;
  areaBasis: RectangleAreaBasis;
  fixedDimension: number;
  height: number;
  method: RectangleMethod;
  widthDimension: number;
};

function rectangleConstructionOptions(settings: RectangleDraftSettings): RectangleConstructionOptions {
  return {
    chamferX: settings.chamferX,
    chamferY: settings.chamferY,
    filletRadius: settings.filletRadius,
    rotation: settings.rotation,
    width: settings.width,
  };
}

function rectangleFromDraftSettings(start: LinePoint, cursor: LinePoint | null, settings: RectangleDraftSettings): PolylineGeometry | null {
  const options = rectangleConstructionOptions(settings);
  if (settings.method === "dimensions") {
    return rectangleFromDimensions(start, cursor, settings.widthDimension, settings.height, start.z, options);
  }
  if (settings.method === "area") {
    return rectangleFromArea(start, cursor, settings.area, settings.fixedDimension, settings.areaBasis, start.z, options);
  }
  return cursor ? rectangleFromCorners(start, cursor, start.z, options) : null;
}

function rectangleDraftDimensions(start: LinePoint, cursor: LinePoint, settings: RectangleDraftSettings) {
  if (settings.method === "dimensions") return { height: settings.height, width: settings.widthDimension };
  if (settings.method === "area") {
    const other = snapToSixteenth(settings.area / settings.fixedDimension);
    return settings.areaBasis === "length" ? { height: other, width: settings.fixedDimension } : { height: settings.fixedDimension, width: other };
  }
  const angle = (settings.rotation ?? 0) * Math.PI / 180;
  const dx = cursor.x - start.x;
  const dy = cursor.y - start.y;
  return {
    height: Math.abs(dx * -Math.sin(angle) + dy * Math.cos(angle)),
    width: Math.abs(dx * Math.cos(angle) + dy * Math.sin(angle)),
  };
}
type PolylineViewportCommand =
  | { id: number; kind: "coordinate"; point: LinePoint }
  | { distance: number; id: number; kind: "distance" }
  | { id: number; kind: "close" | "finish" | "undo" };
type PolylineSegmentMode = "arc" | "line";
type BreakMode = "break" | "break-at-point";
type CircleViewportCommand =
  | { id: number; kind: "coordinate"; point: LinePoint }
  | { distance: number; id: number; kind: "distance" }
  | { id: number; kind: "scalar"; value: number };
type ArcViewportCommand =
  | { id: number; kind: "coordinate"; point: LinePoint }
  | { distance: number; id: number; kind: "distance" }
  | { id: number; kind: "scalar"; scalar: "angle" | "direction-angle" | "length" | "radius"; value: number };
type ArcContinueSeed = { direction: LinePoint; source: string; start: LinePoint };
type ContinuableEntityReference = { id: string; type: "arc" | "line" | "polyline" };
type PickedCircleTangentConstraint = { constraint: CircleTangentConstraint; key: string };
type LineCommandFeedback = { message: string; tone: "error" | "info" | "success" };
type RibbonTab = "Home" | "Draw" | "Model" | "Annotate" | "View" | "Manage";
const LINE_SNAP_ANGLES_STORAGE_KEY = "model-builder:line-snap-angles:v1";
const CAD_DRAFTING_SETTINGS_STORAGE_KEY = "model-builder:cad-drafting-settings:v3";
const LEGACY_CAD_DRAFTING_SETTINGS_STORAGE_KEYS = ["model-builder:cad-drafting-settings:v2", "model-builder:cad-drafting-settings:v1"];
const INTERFACE_THEME_STORAGE_KEY = "model-builder:interface-theme:v1";
const INTERFACE_THEME_CHANGE_EVENT = "model-builder:interface-theme-change";
type InterfaceTheme = "dark" | "light";
let interfaceThemeFallback: InterfaceTheme = "light";

function storedInterfaceTheme(): InterfaceTheme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(INTERFACE_THEME_STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : interfaceThemeFallback;
  } catch {
    return interfaceThemeFallback;
  }
}

function subscribeInterfaceTheme(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === INTERFACE_THEME_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(INTERFACE_THEME_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(INTERFACE_THEME_CHANGE_EVENT, onStoreChange);
  };
}

function setStoredInterfaceTheme(theme: InterfaceTheme) {
  interfaceThemeFallback = theme;
  try {
    window.localStorage.setItem(INTERFACE_THEME_STORAGE_KEY, theme);
  } catch {
    // The selected theme remains available through the current render.
  }
  window.dispatchEvent(new Event(INTERFACE_THEME_CHANGE_EVENT));
}
const CAD_SNAP_LABELS: Record<CadSnapKind, string> = {
  center: "CEN",
  corner: "CORNER",
  endpoint: "END",
  extension: "EXT",
  "geometric-center": "GCE",
  grid: "GRID",
  intersection: "INT",
  midpoint: "MID",
  nearest: "NEAR",
  node: "NODE",
  ortho: "ORTHO",
  parallel: "PAR",
  perpendicular: "PERP",
  polar: "POLAR",
  quadrant: "QUAD",
  tangent: "TAN",
  tracking: "TRACK",
};

const OBJECT_SNAP_MODE_DEFINITIONS: Array<{ label: string; mode: ObjectSnapMode }> = [
  { mode: "endpoint", label: "Endpoint" },
  { mode: "midpoint", label: "Midpoint" },
  { mode: "center", label: "Center" },
  { mode: "geometric-center", label: "Geometric center" },
  { mode: "node", label: "Node" },
  { mode: "quadrant", label: "Quadrant" },
  { mode: "intersection", label: "Intersection" },
  { mode: "tangent", label: "Tangent" },
  { mode: "perpendicular", label: "Perpendicular" },
  { mode: "extension", label: "Extension" },
  { mode: "parallel", label: "Parallel" },
  { mode: "nearest", label: "Nearest" },
  { mode: "corner", label: "3D corner" },
];

const OBJECT_SNAP_OVERRIDE_ALIASES: Record<string, ObjectSnapMode> = {
  cen: "center", center: "center",
  cor: "corner", corner: "corner",
  end: "endpoint", endpoint: "endpoint",
  ext: "extension", extension: "extension",
  gce: "geometric-center", geometric: "geometric-center", "geometric-center": "geometric-center",
  int: "intersection", intersection: "intersection",
  mid: "midpoint", midpoint: "midpoint",
  nea: "nearest", near: "nearest", nearest: "nearest",
  nod: "node", node: "node",
  par: "parallel", parallel: "parallel",
  per: "perpendicular", perp: "perpendicular", perpendicular: "perpendicular",
  qua: "quadrant", quad: "quadrant", quadrant: "quadrant",
  tan: "tangent", tangent: "tangent",
};

function arcMethodDefinition(method: ArcMethod) {
  return ARC_METHODS.find((definition) => definition.method === method) ?? ARC_METHODS[0];
}

function circleMethodDefinition(method: CircleMethod) {
  return CIRCLE_METHODS.find((definition) => definition.method === method) ?? CIRCLE_METHODS[0];
}

function circlePointStage(method: CircleMethod, pointCount: number): string {
  if (method === "tangent-tangent-radius") return pointCount < 2 ? `${pointCount === 0 ? "first" : "second"} tangent object` : "radius";
  if (method === "tangent-tangent-tangent") return `${["first", "second", "third"][Math.min(pointCount, 2)]} tangent object`;
  if (method === "three-point") return ["first circumference point", "second circumference point", "third circumference point"][Math.min(pointCount, 2)];
  if (method === "two-point") return pointCount ? "second diameter endpoint" : "first diameter endpoint";
  if (method === "center-diameter") return pointCount ? "diameter or diameter point" : "center point";
  return pointCount ? "radius or edge point" : "center point";
}

function circleGeometryFromPointer(method: CircleMethod, points: LinePoint[], cursor: LinePoint): CircleGeometry | null {
  const first = points[0];
  if (!first) return null;
  if (method === "center-radius") return circleFromCenterPoint(first, cursor);
  if (method === "center-diameter") return circleFromCenterDiameter(first, planarDistance(first, cursor));
  if (method === "two-point") return circleFromDiameterPoints(first, cursor);
  return method === "three-point" && points[1] ? circleFromThreePoints(first, points[1], cursor) : null;
}

function circlePointCompletes(method: CircleMethod, pointCount: number): boolean {
  return method === "three-point" ? pointCount >= 2 : pointCount >= 1;
}

function planarDistance(first: LinePoint, second: LinePoint): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function includedAngleFromCursor(center: LinePoint, start: LinePoint, cursor: LinePoint): number {
  const startAngle = Math.atan2(start.y - center.y, start.x - center.x) * 180 / Math.PI;
  const cursorAngle = Math.atan2(cursor.y - center.y, cursor.x - center.x) * 180 / Math.PI;
  return ((cursorAngle - startAngle) % 360 + 360) % 360;
}

function arcGeometryFromMethodPointer(method: ArcMethod, points: LinePoint[], cursor: LinePoint, seed: ArcContinueSeed | null): ArcGeometry | null {
  if (method === "continue") return seed ? arcFromStartEndDirection(seed.start, cursor, seed.direction) : null;
  if (points.length < 2) return null;
  const [first, second] = points;
  if (method === "three-point") return arcFromThreePoints(first, second, cursor);
  if (method === "start-center-end") return arcFromStartCenterEnd(first, second, cursor);
  if (method === "center-start-end") return arcFromCenterStartEnd(first, second, cursor);
  if (method === "start-center-angle") return arcFromStartCenterAngle(first, second, includedAngleFromCursor(second, first, cursor));
  if (method === "center-start-angle") return arcFromCenterStartAngle(first, second, includedAngleFromCursor(first, second, cursor));
  if (method === "start-center-length") return arcFromStartCenterLength(first, second, planarDistance(first, cursor));
  if (method === "center-start-length") return arcFromCenterStartLength(first, second, planarDistance(second, cursor));
  if (method === "start-end-angle") return arcFromThreePoints(first, cursor, second);
  if (method === "start-end-direction") return arcFromStartEndDirection(first, second, cursor);
  return arcFromStartEndRadius(first, second, planarDistance(first, cursor));
}

function arcGeometryFromMethodScalar(method: ArcMethod, points: LinePoint[], scalar: "angle" | "direction-angle" | "length" | "radius", value: number): ArcGeometry | null {
  if (points.length < 2) return null;
  const [first, second] = points;
  if (method === "start-center-angle" && scalar === "angle") return arcFromStartCenterAngle(first, second, value);
  if (method === "center-start-angle" && scalar === "angle") return arcFromCenterStartAngle(first, second, value);
  if (method === "start-center-length" && scalar === "length") return arcFromStartCenterLength(first, second, value);
  if (method === "center-start-length" && scalar === "length") return arcFromCenterStartLength(first, second, value);
  if (method === "start-end-angle" && scalar === "angle") return arcFromStartEndAngle(first, second, value);
  if (method === "start-end-direction" && scalar === "direction-angle") return arcFromStartEndDirectionAngle(first, second, value);
  if (method === "start-end-radius" && scalar === "radius") return arcFromStartEndRadius(first, second, value);
  return null;
}

function arcPointStage(method: ArcMethod, count: number): string {
  if (method === "continue") return "endpoint";
  const roles: Record<Exclude<ArcMethod, "continue">, [string, string]> = {
    "three-point": ["start point", "second point on the Arc"],
    "start-center-end": ["start point", "center point"],
    "start-center-angle": ["start point", "center point"],
    "start-center-length": ["start point", "center point"],
    "start-end-angle": ["start point", "endpoint"],
    "start-end-direction": ["start point", "endpoint"],
    "start-end-radius": ["start point", "endpoint"],
    "center-start-end": ["center point", "start point"],
    "center-start-angle": ["center point", "start point"],
    "center-start-length": ["center point", "start point"],
  };
  if (count < 2) return roles[method][count];
  if (method === "three-point" || method === "start-center-end" || method === "center-start-end") return "endpoint";
  if (method.includes("angle")) return method === "start-end-angle" ? "included angle or point on Arc" : "included angle";
  if (method === "start-end-direction") return "starting tangent direction";
  if (method === "start-end-radius") return "radius";
  return "chord length";
}

function arcCommandPlaceholder(method: ArcMethod, count: number): string {
  const stage = arcPointStage(method, count);
  if (method === "continue") return "Endpoint X,Y, @X,Y, or distance";
  if (count < 2) return `${stage[0].toUpperCase()}${stage.slice(1)} X,Y or X,Y,Z`;
  if (method === "start-center-angle" || method === "center-start-angle" || method === "start-end-angle") return "Included angle in degrees, or defining point";
  if (method === "start-end-direction") return "Tangent angle in degrees, or direction point";
  if (method === "start-end-radius") return "Radius, or point establishing radius";
  if (method === "start-center-length" || method === "center-start-length") return "Chord length, or point establishing length";
  return "Endpoint X,Y, @X,Y, or distance";
}

function arcCursorAnchor(method: ArcMethod, points: LinePoint[], seed: ArcContinueSeed | null): LinePoint | null {
  if (method === "continue") return seed?.start ?? null;
  if (points.length < 2) return points.at(-1) ?? null;
  if (method === "start-center-length" || method === "start-end-direction" || method === "start-end-radius") return points[0];
  if (method === "center-start-angle") return points[0];
  return points[1];
}

function continueSeedFromReference(document: ModelDocument, reference: ContinuableEntityReference | null): ArcContinueSeed | null {
  if (!reference) return null;
  if (reference.type === "line") {
    const line = findLineObject(document, reference.id);
    if (!line) return null;
    const length = planarDistance(line.start, line.end);
    if (length < 1 / 16) return null;
    return {
      start: { ...line.end },
      direction: { x: line.end.x + (line.end.x - line.start.x) / length * 12, y: line.end.y + (line.end.y - line.start.y) / length * 12, z: line.end.z },
      source: line.name,
    };
  }
  if (reference.type === "polyline") {
    const polyline = findPolylineObject(document, reference.id);
    if (!polyline || polyline.vertices.length < 2) return null;
    const prior = polyline.closed ? polyline.vertices.at(-1)! : polyline.vertices.at(-2)!;
    const end = polyline.closed ? polyline.vertices[0] : polyline.vertices.at(-1)!;
    const length = Math.hypot(end.x - prior.x, end.y - prior.y);
    if (length < 1 / 16) return null;
    return {
      start: { ...end, z: polyline.elevation },
      direction: { x: end.x + (end.x - prior.x) / length * 12, y: end.y + (end.y - prior.y) / length * 12, z: polyline.elevation },
      source: polyline.name,
    };
  }
  const arc = findArcObject(document, reference.id);
  if (!arc) return null;
  const start = arcPointAtFraction(arc, 1);
  const radialX = start.x - arc.center.x;
  const radialY = start.y - arc.center.y;
  const tangentX = arc.counterclockwise ? -radialY : radialY;
  const tangentY = arc.counterclockwise ? radialX : -radialX;
  const tangentLength = Math.hypot(tangentX, tangentY);
  if (tangentLength < 1e-8) return null;
  return {
    start,
    direction: { x: start.x + tangentX / tangentLength * 12, y: start.y + tangentY / tangentLength * 12, z: start.z },
    source: arc.name,
  };
}

function continueSeedFromHistory(document: ModelDocument, history: ContinuableEntityReference[]): ArcContinueSeed | null {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const seed = continueSeedFromReference(document, history[index]);
    if (seed) return seed;
  }
  return null;
}

type CadDraftingSettings = {
  activeElevation: number;
  gridSpacing: number;
  gridVisible: boolean;
  objectSnapEnabled: boolean;
  objectSnapModes: ObjectSnapMode[];
  orthoEnabled: boolean;
  polarEnabled: boolean;
  snapIncrement: number;
};

const GRID_SPACING_OPTIONS = [12, 24, 48, 96, 120] as const;
const SNAP_INCREMENT_OPTIONS = [1 / 16, 1 / 8, 1 / 4, 1 / 2, 1, 3, 6, 12] as const;

function formatDraftingSpacing(value: number): string {
  const formatted = formatArchitectural(value);
  if (value < 1) return formatted.replace(/^0'-0 /, "");
  if (value < 12) return formatted.replace(/^0'-/, "");
  return formatted;
}

function titleCase(value: string): string {
  return value.replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

const DEFAULT_CAD_DRAFTING_SETTINGS: CadDraftingSettings = {
  activeElevation: 0,
  gridSpacing: 12,
  gridVisible: true,
  objectSnapEnabled: true,
  objectSnapModes: DEFAULT_OBJECT_SNAP_MODES,
  orthoEnabled: false,
  polarEnabled: true,
  snapIncrement: 1 / 16,
};

function storedCadDraftingSettings(): CadDraftingSettings {
  if (typeof window === "undefined") return { ...DEFAULT_CAD_DRAFTING_SETTINGS, objectSnapModes: [...DEFAULT_OBJECT_SNAP_MODES] };
  try {
    const currentStored = window.localStorage.getItem(CAD_DRAFTING_SETTINGS_STORAGE_KEY);
    const stored = currentStored ?? LEGACY_CAD_DRAFTING_SETTINGS_STORAGE_KEYS.map((key) => window.localStorage.getItem(key)).find((value) => value !== null);
    if (!stored) return { ...DEFAULT_CAD_DRAFTING_SETTINGS, objectSnapModes: [...DEFAULT_OBJECT_SNAP_MODES] };
    const value = JSON.parse(stored) as Partial<CadDraftingSettings>;
    const validModeNames = OBJECT_SNAP_MODE_DEFINITIONS.map(({ mode }) => mode);
    const validModes = Array.isArray(value.objectSnapModes)
      ? value.objectSnapModes.filter((mode): mode is ObjectSnapMode => validModeNames.includes(mode as ObjectSnapMode))
      : DEFAULT_OBJECT_SNAP_MODES;
    const migratedModes = currentStored ? validModes : [...new Set([...validModes, ...DEFAULT_OBJECT_SNAP_MODES])];
    return {
      activeElevation: typeof value.activeElevation === "number" && Number.isFinite(value.activeElevation) ? snapToSixteenth(value.activeElevation) : 0,
      gridSpacing: GRID_SPACING_OPTIONS.includes(value.gridSpacing as typeof GRID_SPACING_OPTIONS[number]) ? value.gridSpacing! : DEFAULT_CAD_DRAFTING_SETTINGS.gridSpacing,
      gridVisible: value.gridVisible !== false,
      objectSnapEnabled: value.objectSnapEnabled !== false,
      objectSnapModes: [...new Set(migratedModes)],
      orthoEnabled: value.orthoEnabled === true,
      polarEnabled: value.polarEnabled !== false,
      snapIncrement: SNAP_INCREMENT_OPTIONS.includes(value.snapIncrement as typeof SNAP_INCREMENT_OPTIONS[number]) ? value.snapIncrement! : DEFAULT_CAD_DRAFTING_SETTINGS.snapIncrement,
    };
  } catch {
    return { ...DEFAULT_CAD_DRAFTING_SETTINGS, objectSnapModes: [...DEFAULT_OBJECT_SNAP_MODES] };
  }
}

function storedAdditionalLineSnapAngles(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(LINE_SNAP_ANGLES_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed) || parsed.some((angle) => typeof angle !== "number" || !Number.isFinite(angle))) return [];
    return [...new Set(parsed.map((angle) => ((angle % 360) + 360) % 360))]
      .filter((angle) => ![0, 90, 180, 270].includes(angle))
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}
type CubeOrbitController = {
  end: () => void;
  move: (deltaX: number, deltaY: number) => void;
  start: () => void;
};

function NavigationCube({
  onNavigate,
  orbitRef,
  orientationRef,
}: {
  onNavigate: (target: ViewTarget) => void;
  orbitRef: { current: CubeOrbitController | null };
  orientationRef: { current: THREE.Quaternion };
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const size = 112;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
    camera.position.set(0, 0, 5.4);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);
    const raycaster = new THREE.Raycaster();
    raycaster.params.Line = { threshold: 3 };
    const pointer = new THREE.Vector2();
    const interactive: THREE.Mesh[] = [];
    const textures: THREE.Texture[] = [];

    const baseCube = new THREE.Mesh(
      new THREE.BoxGeometry(1.34, 1.34, 1.34),
      new THREE.MeshBasicMaterial({ color: 0x344250 }),
    );
    group.add(baseCube);

    const labelMaterial = (label: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = 192;
      canvas.height = 192;
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#3a4856";
        context.fillRect(0, 0, 192, 192);
        context.strokeStyle = "#8493a1";
        context.lineWidth = 6;
        context.strokeRect(4, 4, 184, 184);
        context.fillStyle = "#d9e1e8";
        context.font = "600 31px Arial, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(label, 96, 99);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      textures.push(texture);
      return new THREE.MeshBasicMaterial({ color: 0xffffff, map: texture, side: THREE.DoubleSide });
    };

    const addInteractive = (mesh: THREE.Mesh, direction: ViewDirection, priority: number) => {
      mesh.userData.direction = direction;
      mesh.userData.priority = priority;
      mesh.userData.baseColor = (mesh.material as THREE.MeshBasicMaterial).color.getHex();
      interactive.push(mesh);
      group.add(mesh);
    };

    const faceDefinitions: Array<{ direction: ViewDirection; label: string }> = [
      { direction: [1, 0, 0], label: "RIGHT" },
      { direction: [-1, 0, 0], label: "LEFT" },
      { direction: [0, 1, 0], label: "BACK" },
      { direction: [0, -1, 0], label: "FRONT" },
      { direction: [0, 0, 1], label: "TOP" },
      { direction: [0, 0, -1], label: "BOTTOM" },
    ];
    const faceGeometry = new THREE.PlaneGeometry(1.18, 1.18);
    faceDefinitions.forEach(({ direction, label }) => {
      const normal = new THREE.Vector3(...direction);
      const face = new THREE.Mesh(faceGeometry, labelMaterial(label));
      face.position.copy(normal).multiplyScalar(0.681);
      face.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      addInteractive(face, direction, 1);
    });

    const edgeGeometryX = new THREE.BoxGeometry(1.2, 0.17, 0.17);
    const edgeGeometryY = new THREE.BoxGeometry(0.17, 1.2, 0.17);
    const edgeGeometryZ = new THREE.BoxGeometry(0.17, 0.17, 1.2);
    const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0x607181 });
    ([-1, 1] as const).forEach((first) => {
      ([-1, 1] as const).forEach((second) => {
        const xEdge = new THREE.Mesh(edgeGeometryX, edgeMaterial.clone());
        xEdge.position.set(0, first * 0.68, second * 0.68);
        addInteractive(xEdge, [0, first, second], 2);
        const yEdge = new THREE.Mesh(edgeGeometryY, edgeMaterial.clone());
        yEdge.position.set(first * 0.68, 0, second * 0.68);
        addInteractive(yEdge, [first, 0, second], 2);
        const zEdge = new THREE.Mesh(edgeGeometryZ, edgeMaterial.clone());
        zEdge.position.set(first * 0.68, second * 0.68, 0);
        addInteractive(zEdge, [first, second, 0], 2);
      });
    });

    const cornerGeometry = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    ([-1, 1] as const).forEach((x) => {
      ([-1, 1] as const).forEach((y) => {
        ([-1, 1] as const).forEach((z) => {
          const corner = new THREE.Mesh(
            cornerGeometry,
            new THREE.MeshBasicMaterial({ color: 0x738392 }),
          );
          corner.position.set(x * 0.68, y * 0.68, z * 0.68);
          addInteractive(corner, [x, y, z], 3);
        });
      });
    });

    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.58, 1.58, 1.58)),
      new THREE.LineBasicMaterial({ color: 0x9eabb6, transparent: true, opacity: 0.72 }),
    );
    group.add(outline);

    let hovered: THREE.Mesh | null = null;
    const setHovered = (next: THREE.Mesh | null) => {
      if (hovered === next) return;
      if (hovered) {
        (hovered.material as THREE.MeshBasicMaterial).color.setHex(hovered.userData.baseColor);
      }
      hovered = next;
      if (hovered) (hovered.material as THREE.MeshBasicMaterial).color.setHex(0xe1ad43);
      renderer.domElement.style.cursor = hovered ? "pointer" : "default";
    };
    const hitTest = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      return (raycaster.intersectObjects(interactive, false)[0]?.object as THREE.Mesh | undefined) ?? null;
    };
    type CubePointerDrag = {
      lastX: number;
      lastY: number;
      orbiting: boolean;
      pointerId: number;
      startX: number;
      startY: number;
    };
    let pointerDrag: CubePointerDrag | null = null;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      pointerDrag = {
        lastX: event.clientX,
        lastY: event.clientY,
        orbiting: false,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) {
        setHovered(hitTest(event));
        return;
      }
      const totalDistance = Math.hypot(
        event.clientX - pointerDrag.startX,
        event.clientY - pointerDrag.startY,
      );
      if (!pointerDrag.orbiting && totalDistance >= 4) {
        pointerDrag.orbiting = true;
        setHovered(null);
        renderer.domElement.classList.add("is-orbiting");
        orbitRef.current?.start();
      }
      if (pointerDrag.orbiting) {
        orbitRef.current?.move(
          event.clientX - pointerDrag.lastX,
          event.clientY - pointerDrag.lastY,
        );
      }
      pointerDrag.lastX = event.clientX;
      pointerDrag.lastY = event.clientY;
    };
    const finishPointer = (event: PointerEvent, canceled = false) => {
      if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
      const completed = pointerDrag;
      pointerDrag = null;
      renderer.domElement.classList.remove("is-orbiting");
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      if (completed.orbiting) {
        orbitRef.current?.end();
        return;
      }
      if (canceled) return;
      const target = hitTest(event);
      const direction = target?.userData.direction as ViewDirection | undefined;
      if (direction) onNavigate(navigationTargetFromDirection(direction));
    };
    const handlePointerLeave = () => {
      if (!pointerDrag) setHovered(null);
    };
    const handlePointerUp = (event: PointerEvent) => finishPointer(event);
    const handlePointerCancel = (event: PointerEvent) => finishPointer(event, true);
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerleave", handlePointerLeave);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointercancel", handlePointerCancel);

    let animationFrame = 0;
    const render = () => {
      animationFrame = requestAnimationFrame(render);
      group.quaternion.copy(orientationRef.current).invert();
      renderer.render(scene, camera);
    };
    render();

    return () => {
      cancelAnimationFrame(animationFrame);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointercancel", handlePointerCancel);
      interactive.forEach((mesh) => (mesh.material as THREE.Material).dispose());
      faceGeometry.dispose();
      edgeGeometryX.dispose();
      edgeGeometryY.dispose();
      edgeGeometryZ.dispose();
      cornerGeometry.dispose();
      baseCube.geometry.dispose();
      (baseCube.material as THREE.Material).dispose();
      outline.geometry.dispose();
      (outline.material as THREE.Material).dispose();
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [onNavigate, orbitRef, orientationRef]);

  return (
    <div className="navigation-cube" aria-label="3D navigation cube">
      <div className="navigation-cube-canvas" ref={mountRef} />
      <button
        type="button"
        className="navigation-home"
        aria-label="Home — Top plan view"
        title="Home — Top plan view"
        onClick={() => onNavigate(VIEW_PRESETS.top)}
      >
        ⌂
      </button>
    </div>
  );
}

type EditorState = {
  future: ModelDocument[];
  past: ModelDocument[];
  present: ModelDocument;
  saved: ModelDocument;
};

type EditorAction =
  | { type: "commit"; next: ModelDocument }
  | { type: "preview"; next: ModelDocument }
  | { type: "commit-preview"; before: ModelDocument; next: ModelDocument }
  | { type: "load"; next: ModelDocument }
  | { type: "recover"; next: ModelDocument; saved: ModelDocument }
  | { type: "mark-saved" }
  | { type: "undo" }
  | { type: "redo" };

const HISTORY_LIMIT = 100;
const RECOVERY_DELAY_MS = 500;
const DIMENSION_LABELS: Record<DimensionKey, string> = {
  length: "Length (X)",
  width: "Width (Y)",
  height: "Height (Z)",
};

function historyReducer(state: EditorState, action: EditorAction): EditorState {
  if (action.type === "preview") {
    return { ...state, present: action.next };
  }

  if (action.type === "load") {
    const next = cloneDocument(action.next);
    return {
      future: [],
      past: [],
      present: next,
      saved: cloneDocument(next),
    };
  }

  if (action.type === "recover") {
    return {
      future: [],
      past: [],
      present: cloneDocument(action.next),
      saved: cloneDocument(action.saved),
    };
  }

  if (action.type === "mark-saved") {
    return { ...state, saved: cloneDocument(state.present) };
  }

  if (action.type === "commit") {
    if (documentsEqual(state.present, action.next)) return state;
    return {
      future: [],
      past: [...state.past, cloneDocument(state.present)].slice(-HISTORY_LIMIT),
      present: cloneDocument(action.next),
      saved: state.saved,
    };
  }

  if (action.type === "commit-preview") {
    if (documentsEqual(action.before, action.next)) {
      return { ...state, present: cloneDocument(action.before) };
    }
    return {
      future: [],
      past: [...state.past, cloneDocument(action.before)].slice(-HISTORY_LIMIT),
      present: cloneDocument(action.next),
      saved: state.saved,
    };
  }

  if (action.type === "undo") {
    const previous = state.past.at(-1);
    if (!previous) return state;
    return {
      future: [cloneDocument(state.present), ...state.future].slice(0, HISTORY_LIMIT),
      past: state.past.slice(0, -1),
      present: cloneDocument(previous),
      saved: state.saved,
    };
  }

  const next = state.future[0];
  if (!next) return state;
  return {
    future: state.future.slice(1),
    past: [...state.past, cloneDocument(state.present)].slice(-HISTORY_LIMIT),
    present: cloneDocument(next),
    saved: state.saved,
  };
}

function axisVector(axis: AxisKey): THREE.Vector3 {
  if (axis === "x") return new THREE.Vector3(1, 0, 0);
  if (axis === "y") return new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3(0, 0, 1);
}

function firstSelectableObjectId(document: ModelDocument): string | null {
  return document.objects.find((object) => {
    const layer = findLayer(document, object.layerId);
    return layer?.visible;
  })?.id ?? null;
}

function objectIsSelectable(document: ModelDocument, object: BoxObject): boolean {
  const layer = findLayer(document, object.layerId);
  return Boolean(layer?.visible);
}

function DraftCubeIcon() {
  return (
    <span className="cube-icon" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function DraftLineIcon() {
  return <span className="line-icon" aria-hidden="true"><span /></span>;
}

type ViewportProps = {
  activeElevation: number;
  gridSpacing: number;
  gridVisible: boolean;
  interfaceTheme: InterfaceTheme;
  arcCommand: ArcViewportCommand | null;
  arcContinueSeed: ArcContinueSeed | null;
  arcMethod: ArcMethod;
  arcMode: boolean;
  circleCommand: CircleViewportCommand | null;
  circleMethod: CircleMethod;
  circleMode: boolean;
  copyMode: boolean;
  document: ModelDocument;
  dragStatus: DragStatus | null;
  fitViewSignal: number;
  lineCommand: LineViewportCommand | null;
  lineMode: boolean;
  lineSnapAngles: number[];
  polylineCommand: PolylineViewportCommand | null;
  polylineMode: boolean;
  polylineSegmentMode: PolylineSegmentMode;
  polylineWidth: number;
  rectangleCommand: RectangleViewportCommand | null;
  rectangleDraftSettings: RectangleDraftSettings;
  rectangleMode: boolean;
  moveMode: boolean;
  mirrorMode: boolean;
  mirrorKeepSource: boolean;
  offsetDistance: number;
  offsetKeepSource: boolean;
  offsetMode: boolean;
  chamferFirstDistance: number;
  chamferMode: boolean;
  chamferSecondDistance: number;
  breakMode: BreakMode | null;
  boundaryMode: boolean;
  filletMode: boolean;
  filletRadius: number;
  lengthenMethod: LengthenMethod;
  lengthenMode: boolean;
  lengthenValue: number;
  extendMode: boolean;
  trimMode: boolean;
  objectSnapEnabled: boolean;
  objectSnapModes: ObjectSnapMode[];
  objectSnapOverride: ObjectSnapMode | null;
  orthoEnabled: boolean;
  polarEnabled: boolean;
  rotateMode: boolean;
  rotationBaseKey: RotationBaseKey;
  scaleMode: boolean;
  scaleBaseKey: RotationBaseKey;
  stretchMode: boolean;
  stretchTargets: CadStretchTarget[];
  onDragCancel: (before: ModelDocument) => void;
  onDragCommit: (before: ModelDocument, next: ModelDocument) => void;
  onDragPreview: (next: ModelDocument) => void;
  onDragStatus: (status: DragStatus | null) => void;
  onExactFaceMove: (objectId: string, faceIndex: number, distance: number) => boolean;
  onFaceSelect: (objectId: string | null, faceIndex: number | null, additive: boolean) => void;
  onArcCreate: (geometry: ArcGeometry) => boolean;
  onArcFinishRequested: () => void;
  onArcPointsChange: (points: LinePoint[]) => void;
  onArcSelect: (arcId: string | null, additive?: boolean) => void;
  onCirclePointsChange: (points: LinePoint[]) => void;
  onCircleCreate: (geometry: CircleGeometry) => boolean;
  onCircleFinishRequested: () => void;
  onCircleSelect: (circleId: string | null, additive?: boolean) => void;
  onLineAnchorChange: (point: LinePoint | null) => void;
  onLineCommandFeedback: (feedback: LineCommandFeedback) => void;
  onLineCreate: (start: LinePoint, end: LinePoint) => boolean;
  onLineFinishRequested: () => void;
  onLineSelect: (lineId: string | null, additive?: boolean) => void;
  onLineUndoSegment: () => boolean;
  onModifyCommit: (before: ModelDocument, next: ModelDocument, copiedRefs: CadEntityRef[] | null) => void;
  onModifyFinishRequested: (canceled: boolean) => void;
  onMirrorCommit: (before: ModelDocument, next: ModelDocument, refs: CadEntityRef[], keepSource: boolean) => void;
  onMirrorFinishRequested: () => void;
  onOffsetCommit: (before: ModelDocument, next: ModelDocument, ref: CadEntityRef, keepSource: boolean) => void;
  onOffsetFinishRequested: () => void;
  onChamferCommit: (before: ModelDocument, next: ModelDocument, refs: CadEntityRef[]) => void;
  onChamferFinishRequested: (canceled: boolean) => void;
  onChamferStageChange: (stage: 0 | 1) => void;
  onBreakCommit: (before: ModelDocument, next: ModelDocument, refs: CadEntityRef[], mode: BreakMode) => void;
  onBreakFinishRequested: (canceled: boolean) => void;
  onBreakStageChange: (stage: 0 | 1 | 2) => void;
  onBoundaryCommit: (before: ModelDocument, next: ModelDocument, polylineId: string) => void;
  onBoundaryFinishRequested: (canceled: boolean) => void;
  onFilletCommit: (before: ModelDocument, next: ModelDocument, refs: CadEntityRef[]) => void;
  onFilletFinishRequested: (canceled: boolean) => void;
  onFilletStageChange: (stage: 0 | 1) => void;
  onLengthenCommit: (before: ModelDocument, next: ModelDocument, ref: CadEntityRef, endpoint: LengthenEndpoint) => void;
  onLengthenFinishRequested: (canceled: boolean) => void;
  onTrimExtendCommit: (before: ModelDocument, next: ModelDocument, refs: CadEntityRef[], operation: "extend" | "trim") => void;
  onTrimExtendFinishRequested: () => void;
  onObjectSnapOverrideConsumed: () => void;
  onPolylineCreate: (geometry: PolylineGeometry, shape: "polyline" | "rectangle") => boolean;
  onPolylineAnchorChange: (point: LinePoint | null) => void;
  onPolylineFinishRequested: () => void;
  onPolylineSelect: (polylineId: string | null, additive?: boolean) => void;
  onSelectionWindow: (refs: CadEntityRef[], additive: boolean, mode: SelectionWindowMode) => void;
  onRectangleAnchorChange: (point: LinePoint | null) => void;
  onRectangleFinishRequested: () => void;
  onRotateFinishRequested: () => void;
  onScaleFinishRequested: () => void;
  onStretchCommit: (before: ModelDocument, next: ModelDocument, targets: CadStretchTarget[]) => void;
  onStretchFinishRequested: (canceled: boolean) => void;
  onStretchTargetsChange: (targets: CadStretchTarget[], mode: SelectionWindowMode) => void;
  onViewChange: (view: ViewTarget) => void;
  selectedArcId: string | null;
  selectedFaceIndex: number | null;
  selectedCircleId: string | null;
  selectedLineId: string | null;
  selectedPolylineId: string | null;
  selectedObjectId: string | null;
  selectedObjectIds: string[];
  selectedEntityKeys: string[];
  snapIncrement: number;
  viewTarget: ViewTarget;
};

type ActiveGripInput = {
  axis: AxisKey;
  faceIndex: number;
  objectId: string;
  x: number;
  y: number;
};

type ViewportObject = {
  edges: THREE.LineSegments;
  materials: THREE.MeshStandardMaterial[];
  mesh: THREE.Mesh;
};

type ViewportLine = {
  fill?: THREE.Mesh;
  fillGeometry?: THREE.BufferGeometry;
  fillMaterial?: THREE.MeshBasicMaterial;
  geometry: THREE.BufferGeometry;
  material: THREE.LineBasicMaterial;
  line: THREE.Line;
};

type FloorPlatformView = {
  group: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
  meshes: THREE.Mesh[];
  outlineMaterials: THREE.LineDashedMaterial[];
  outlines: THREE.Line[];
};

type WallView = {
  group: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
  meshes: THREE.Mesh[];
};

const FLOOR_LAYER_COLORS: Record<AssemblyLayerRole, number> = {
  "air-gap": 0x8fa4b2,
  finish: 0xc99762,
  framing: 0xb58a5c,
  insulation: 0xd6b76f,
  membrane: 0x506b7c,
  sheathing: 0xc3a176,
  substrate: 0x9b9385,
};

function createFloorPlatformView(scene: THREE.Scene): FloorPlatformView {
  const group = new THREE.Group();
  group.renderOrder = 5;
  scene.add(group);
  return { group, materials: [], meshes: [], outlineMaterials: [], outlines: [] };
}

function clearFloorPlatformView(view: FloorPlatformView) {
  view.meshes.forEach((mesh) => {
    view.group.remove(mesh);
    mesh.geometry.dispose();
  });
  view.materials.forEach((material) => material.dispose());
  view.outlines.forEach((outline) => {
    view.group.remove(outline);
    outline.geometry.dispose();
  });
  view.outlineMaterials.forEach((material) => material.dispose());
  view.meshes = [];
  view.materials = [];
  view.outlines = [];
  view.outlineMaterials = [];
}

function platformPath(boundary: PolylineGeometry) {
  const path = polylinePathPoints(boundary);
  if (path.length < 4) return null;
  const outline = path.slice(0, -1);
  const shape = new THREE.Path();
  shape.moveTo(outline[0].x, outline[0].y);
  outline.slice(1).forEach((point) => shape.lineTo(point.x, point.y));
  shape.closePath();
  return shape;
}

function platformShape(boundary: PolylineGeometry, holes: PolylineGeometry[] = []) {
  const path = platformPath(boundary);
  if (!path) return null;
  const shape = new THREE.Shape();
  shape.curves = path.curves;
  shape.currentPoint.copy(path.currentPoint);
  holes.forEach((hole) => {
    const holePath = platformPath(hole);
    if (holePath) shape.holes.push(holePath);
  });
  return shape;
}

function addPlatformOpeningOutline(view: FloorPlatformView, boundary: PolylineGeometry, elevation: number, opening: PlatformOpening) {
  const path = polylinePathPoints(boundary);
  if (path.length < 4) return;
  const points = path[0].x === path.at(-1)?.x && path[0].y === path.at(-1)?.y ? path : [...path, path[0]];
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map((point) => new THREE.Vector3(point.x, point.y, elevation)));
  const material = new THREE.LineDashedMaterial({ color: 0xd69b3f, dashSize: 5, depthTest: false, gapSize: 3, opacity: 0.95, transparent: true });
  const outline = new THREE.Line(geometry, material);
  outline.computeLineDistances();
  outline.renderOrder = 18;
  outline.userData.platformOpeningId = opening.id;
  outline.userData.roomOpeningKind = opening.kind;
  view.group.add(outline);
  view.outlines.push(outline);
  view.outlineMaterials.push(material);
}

function addHorizontalPlatformLayer(
  view: FloorPlatformView,
  shape: THREE.Shape,
  thickness: number,
  baseZ: number,
  role: AssemblyLayerRole,
  userData: Record<string, string>,
) {
  if (thickness < 1 / 16) return;
  const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: false, depth: thickness, steps: 1 });
  const material = new THREE.MeshStandardMaterial({ color: FLOOR_LAYER_COLORS[role], metalness: 0, opacity: 0.86, roughness: 0.86, side: THREE.DoubleSide, transparent: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = baseZ;
  Object.assign(mesh.userData, userData);
  view.group.add(mesh);
  view.meshes.push(mesh);
  view.materials.push(material);
}

function updateFloorPlatformView(view: FloorPlatformView, polyline: PolylineObject, story: BuildingStructure["stories"][number]) {
  clearFloorPlatformView(view);
  const shape = platformShape(polyline);
  if (!shape) return;
  let structureTop = polyline.elevation;
  story.floorStructure.layers.forEach((layer) => {
    const base = structureTop - layer.thickness;
    addHorizontalPlatformLayer(view, shape, layer.thickness, base, layer.role, { floorLayer: layer.name, polylineId: polyline.id });
    structureTop = base;
  });
  let finishBase = polyline.elevation;
  [...story.floorFinish.layers].reverse().forEach((layer) => {
    addHorizontalPlatformLayer(view, shape, layer.thickness, finishBase, layer.role, { floorLayer: layer.name, polylineId: polyline.id });
    finishBase += layer.thickness;
  });
}

function updateRoomPlatformView(view: FloorPlatformView, solution: RoomHorizontalPlatformSolution) {
  clearFloorPlatformView(view);
  const floorShape = platformShape(solution.floorBoundary, solution.floorOpeningBoundaries);
  const ceilingShape = platformShape(solution.boundary, solution.ceilingOpeningBoundaries);
  if (!floorShape || !ceilingShape) return;
  const addRoomLayer = (thickness: number, baseZ: number, role: AssemblyLayerRole, layerName: string, platformKind: string) => {
    const shape = platformKind.startsWith("floor") ? floorShape : ceilingShape;
    addHorizontalPlatformLayer(view, shape, thickness, baseZ, role, {
      platformKind,
      roomId: solution.roomId,
      roomLayer: layerName,
    });
  };
  let floorStructureTop = solution.roughFloorElevation;
  solution.floorStructure.layers.forEach((layer) => {
    const base = floorStructureTop - layer.thickness;
    addRoomLayer(layer.thickness, base, layer.role, layer.name, "floor-structure");
    floorStructureTop = base;
  });
  let floorFinishBase = solution.roughFloorElevation;
  [...solution.floorFinish.layers].reverse().forEach((layer) => {
    addRoomLayer(layer.thickness, floorFinishBase, layer.role, layer.name, "floor-finish");
    floorFinishBase += layer.thickness;
  });
  let ceilingStructureTop = solution.roughCeilingElevation;
  solution.ceilingStructure.layers.forEach((layer) => {
    const base = ceilingStructureTop - layer.thickness;
    addRoomLayer(layer.thickness, base, layer.role, layer.name, "ceiling-structure");
    ceilingStructureTop = base;
  });
  let ceilingFinishTop = solution.ceilingStructureBottomElevation;
  solution.ceilingFinish.layers.forEach((layer) => {
    const base = ceilingFinishTop - layer.thickness;
    addRoomLayer(layer.thickness, base, layer.role, layer.name, "ceiling-finish");
    ceilingFinishTop = base;
  });
  solution.platformOpenings.forEach((opening) => {
    if (opening.cuts === "floor" || opening.cuts === "both") {
      addPlatformOpeningOutline(view, opening.boundary, solution.finishedFloorElevation + 1 / 16, opening);
    }
    if (opening.cuts === "ceiling" || opening.cuts === "both") {
      addPlatformOpeningOutline(view, opening.boundary, solution.finishedCeilingElevation - 1 / 16, opening);
    }
  });
}

function disposeFloorPlatformView(scene: THREE.Scene, view: FloorPlatformView) {
  clearFloorPlatformView(view);
  scene.remove(view.group);
}

function createWallView(scene: THREE.Scene): WallView {
  const group = new THREE.Group();
  group.renderOrder = 6;
  scene.add(group);
  return { group, materials: [], meshes: [] };
}

function clearWallView(view: WallView) {
  view.meshes.forEach((mesh) => {
    view.group.remove(mesh);
    mesh.geometry.dispose();
  });
  view.materials.forEach((material) => material.dispose());
  view.meshes = [];
  view.materials = [];
}

function updateWallView(
  view: WallView,
  line: LineObject,
  vertical: WallVerticalExtent,
  wallType: LayeredAssembly,
  joinPlan: AutomaticWallJoinPlan,
  linesById: ReadonlyMap<string, LineObject>,
  wallTypesById: ReadonlyMap<string, LayeredAssembly>,
  openingTypesById: ReadonlyMap<string, WallOpeningType>,
  headerTypesById: ReadonlyMap<string, WallHeaderType>,
  framing: WallFramingSettings,
  showFraming: boolean,
) {
  clearWallView(view);
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const length = Math.hypot(dx, dy);
  if (length < 1 / 16) return;
  const framingReveal = framing.enabled && framing.showInModel && showFraming;
  wallType.layers.forEach((layer, index) => {
    if (layer.thickness < 1 / 16) return;
    wallLayerSolidSegments(line, wallType, index, joinPlan, linesById, wallTypesById, vertical.height).forEach((segment) => {
      const shape = new THREE.Shape();
      shape.moveTo(segment.startExterior.x, segment.startExterior.y);
      shape.lineTo(segment.startInterior.x, segment.startInterior.y);
      shape.lineTo(segment.endInterior.x, segment.endInterior.y);
      shape.lineTo(segment.endExterior.x, segment.endExterior.y);
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: false, depth: segment.height, steps: 1 });
      const material = new THREE.MeshStandardMaterial({ color: FLOOR_LAYER_COLORS[layer.role], depthWrite: !framingReveal, metalness: 0, opacity: framingReveal ? (layer.wallGroup === "main" ? 0.1 : 0.18) : 0.92, roughness: 0.84, transparent: true });
      material.userData.baseOpacity = material.opacity;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = vertical.baseElevation + segment.baseHeight;
      mesh.userData.lineId = line.id;
      mesh.userData.wallLayer = layer.name;
      view.group.add(mesh);
      view.meshes.push(mesh);
      view.materials.push(material);
    });
  });
  wallEndCapFootprints(line, wallType, joinPlan).forEach((footprint) => {
    const layer = wallType.layers[footprint.layerIndex];
    const shape = new THREE.Shape();
    shape.moveTo(footprint.startExterior.x, footprint.startExterior.y);
    shape.lineTo(footprint.startInterior.x, footprint.startInterior.y);
    shape.lineTo(footprint.endInterior.x, footprint.endInterior.y);
    shape.lineTo(footprint.endExterior.x, footprint.endExterior.y);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: false, depth: vertical.height, steps: 1 });
    const material = new THREE.MeshStandardMaterial({ color: FLOOR_LAYER_COLORS[layer.role], depthWrite: !framingReveal, metalness: 0, opacity: framingReveal ? 0.18 : 0.92, roughness: 0.84, transparent: true });
    material.userData.baseOpacity = material.opacity;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = vertical.baseElevation;
    mesh.userData.lineId = line.id;
    mesh.userData.wallLayer = `${layer.name} end cap`;
    view.group.add(mesh);
    view.meshes.push(mesh);
    view.materials.push(material);
  });
  wallOpeningReturnSolids(line, wallType, openingTypesById).forEach((returnSolid) => {
    const layer = wallType.layers[returnSolid.layerIndex];
    const shape = new THREE.Shape();
    shape.moveTo(returnSolid.startExterior.x, returnSolid.startExterior.y);
    shape.lineTo(returnSolid.startInterior.x, returnSolid.startInterior.y);
    shape.lineTo(returnSolid.endInterior.x, returnSolid.endInterior.y);
    shape.lineTo(returnSolid.endExterior.x, returnSolid.endExterior.y);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: false, depth: returnSolid.height, steps: 1 });
    const material = new THREE.MeshStandardMaterial({ color: FLOOR_LAYER_COLORS[layer.role], depthWrite: !framingReveal, metalness: 0, opacity: framingReveal ? 0.28 : 0.96, roughness: 0.82, transparent: true });
    material.userData.baseOpacity = material.opacity;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = vertical.baseElevation + returnSolid.baseHeight;
    mesh.userData.lineId = line.id;
    mesh.userData.wallLayer = `${layer.name} ${returnSolid.side} ${returnSolid.component}`;
    mesh.userData.wallOpeningId = returnSolid.openingId;
    mesh.userData.wallOpeningReturn = returnSolid.component;
    view.group.add(mesh);
    view.meshes.push(mesh);
    view.materials.push(material);
  });
  wallOpeningComponentSolids(line, wallType, openingTypesById).forEach((componentSolid) => {
    const shape = new THREE.Shape();
    shape.moveTo(componentSolid.startExterior.x, componentSolid.startExterior.y);
    shape.lineTo(componentSolid.startInterior.x, componentSolid.startInterior.y);
    shape.lineTo(componentSolid.endInterior.x, componentSolid.endInterior.y);
    shape.lineTo(componentSolid.endExterior.x, componentSolid.endExterior.y);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: false, depth: componentSolid.height, steps: 1 });
    const roleColors: Record<OpeningAssemblyComponent["role"], number> = {
      frame: 0xd9d4c7,
      glazing: 0x8fc4d7,
      hardware: 0x59646d,
      jamb: 0xd2c8b5,
      mullion: 0xe3ded2,
      panel: 0xb99a78,
      sash: 0xe0dbcf,
      threshold: 0x8b8073,
      trim: 0xeee9dd,
    };
    const isGlass = componentSolid.role === "glazing" || componentSolid.material.toLocaleLowerCase().includes("glass");
    const material = new THREE.MeshStandardMaterial({ color: roleColors[componentSolid.role], depthWrite: !isGlass, metalness: componentSolid.material.toLocaleLowerCase().includes("steel") ? 0.45 : 0, opacity: isGlass ? 0.42 : 0.98, roughness: isGlass ? 0.22 : 0.72, transparent: true });
    material.userData.baseOpacity = material.opacity;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = vertical.baseElevation + componentSolid.baseHeight;
    mesh.userData.lineId = line.id;
    mesh.userData.wallOpeningId = componentSolid.openingId;
    mesh.userData.openingComponentId = componentSolid.componentId;
    mesh.userData.openingComponentRole = componentSolid.role;
    view.group.add(mesh);
    view.meshes.push(mesh);
    view.materials.push(material);
  });
  if (framingReveal) wallFramingSolids(line, wallType, framing, vertical.height, joinPlan, [...linesById.values()], openingTypesById, headerTypesById).forEach((framingMember) => {
    const shape = new THREE.Shape();
    shape.moveTo(framingMember.startExterior.x, framingMember.startExterior.y);
    shape.lineTo(framingMember.startInterior.x, framingMember.startInterior.y);
    shape.lineTo(framingMember.endInterior.x, framingMember.endInterior.y);
    shape.lineTo(framingMember.endExterior.x, framingMember.endExterior.y);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: false, depth: framingMember.height, steps: 1 });
    const materialName = framingMember.material.toLocaleLowerCase();
    const framingColor = materialName.includes("steel")
      ? 0x7b8790
      : framingMember.kind === "header-filler"
        ? materialName.includes("insulation") ? 0x7fa9b9 : 0xc59b62
        : framingMember.kind === "header"
          ? 0xad7545
          : framingMember.kind === "backing-block" || framingMember.kind === "backing-stud"
            ? 0xb98751
            : framingMember.kind === "corner-stud" ? 0xc8945c : 0xd2a36c;
    const material = new THREE.MeshStandardMaterial({ color: framingColor, metalness: 0, opacity: 1, roughness: 0.78 });
    material.userData.baseOpacity = material.opacity;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = vertical.baseElevation + framingMember.baseHeight;
    mesh.userData.lineId = line.id;
    mesh.userData.wallFramingMember = framingMember.kind;
    mesh.userData.wallFramingMaterial = framingMember.material;
    if (framingMember.openingId) mesh.userData.wallOpeningId = framingMember.openingId;
    view.group.add(mesh);
    view.meshes.push(mesh);
    view.materials.push(material);
  });
}

function addFoundationSolid(
  view: WallView,
  footprint: [PlanPoint, PlanPoint, PlanPoint, PlanPoint] | null,
  height: number,
  baseElevation: number,
  color: number,
  lineId: string,
  component: string,
) {
  if (!footprint || height < 1 / 16) return;
  const shape = new THREE.Shape();
  shape.moveTo(footprint[0].x, footprint[0].y);
  footprint.slice(1).forEach((point) => shape.lineTo(point.x, point.y));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: false, depth: height, steps: 1 });
  const material = new THREE.MeshStandardMaterial({ color, metalness: 0, opacity: 0.94, roughness: 0.9, transparent: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = baseElevation;
  mesh.userData.lineId = lineId;
  mesh.userData.foundationComponent = component;
  view.group.add(mesh);
  view.meshes.push(mesh);
  view.materials.push(material);
}

function updateFoundationWallView(
  view: WallView,
  line: LineObject,
  vertical: FoundationWallVerticalExtent,
  type: FoundationWallType,
  joinPlan: AutomaticFoundationWallJoinPlan,
  linesById: ReadonlyMap<string, LineObject>,
  typesById: ReadonlyMap<string, FoundationWallType>,
) {
  clearWallView(view);
  const footprintPoints = (component: "footing" | "sill" | "stem") => {
    const footprint = foundationBandFootprint(line, type, component, joinPlan, linesById, typesById);
    return footprint ? [footprint.startExterior, footprint.startInterior, footprint.endInterior, footprint.endExterior] as [PlanPoint, PlanPoint, PlanPoint, PlanPoint] : null;
  };
  addFoundationSolid(view, footprintPoints("stem"), type.wallHeight, vertical.baseElevation, 0x9ca5a8, line.id, "Concrete stem");
  if (type.footing.enabled) {
    addFoundationSolid(view, footprintPoints("footing"), type.footing.height, vertical.footingBottomElevation, 0x879194, line.id, "Continuous footing");
  }
  for (let index = 0; index < type.sill.foundationPlateCount; index += 1) {
    addFoundationSolid(
      view,
      footprintPoints("sill"),
      type.sill.plateHeight,
      vertical.topElevation + index * type.sill.plateHeight,
      0xb8905f,
      line.id,
      `Foundation sill plate ${index + 1}`,
    );
  }
}

function disposeWallView(scene: THREE.Scene, view: WallView) {
  clearWallView(view);
  scene.remove(view.group);
}

function createViewportLine(scene: THREE.Scene, lineId: string): ViewportLine {
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.LineBasicMaterial({ color: 0x88bff0, depthTest: false, toneMapped: false });
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 12;
  line.userData.lineId = lineId;
  scene.add(line);
  return { geometry, material, line };
}

function updateViewportLine(view: ViewportLine, geometry: LineGeometry, zOffset = 0.35) {
  view.geometry.setFromPoints([
    new THREE.Vector3(geometry.start.x, geometry.start.y, geometry.start.z + zOffset),
    new THREE.Vector3(geometry.end.x, geometry.end.y, geometry.end.z + zOffset),
  ]);
  view.geometry.computeBoundingSphere();
}

function disposeViewportLine(scene: THREE.Scene, view: ViewportLine) {
  scene.remove(view.line);
  if (view.fill) scene.remove(view.fill);
  view.geometry.dispose();
  view.material.dispose();
  view.fillGeometry?.dispose();
  view.fillMaterial?.dispose();
}

function createViewportPolyline(scene: THREE.Scene, polylineId: string): ViewportLine {
  const view = createViewportLine(scene, polylineId);
  delete view.line.userData.lineId;
  view.line.userData.polylineId = polylineId;
  const fillGeometry = new THREE.BufferGeometry();
  const fillMaterial = new THREE.MeshBasicMaterial({ color: 0x88bff0, depthTest: false, opacity: 0.42, side: THREE.DoubleSide, transparent: true, toneMapped: false });
  const fill = new THREE.Mesh(fillGeometry, fillMaterial);
  fill.renderOrder = 11;
  fill.userData.polylineId = polylineId;
  scene.add(fill);
  view.fill = fill;
  view.fillGeometry = fillGeometry;
  view.fillMaterial = fillMaterial;
  return view;
}

function updateViewportPolyline(view: ViewportLine, polyline: PolylineGeometry, zOffset = 0.45) {
  const points = polylinePathPoints(polyline).map((point) => new THREE.Vector3(point.x, point.y, polyline.elevation + zOffset));
  view.geometry.setFromPoints(points);
  view.geometry.computeBoundingSphere();
  if (view.fill && view.fillGeometry) {
    const width = polyline.width ?? 0;
    const positions: number[] = [];
    if (width >= 1 / 16) {
      points.slice(1).forEach((end, index) => {
        const start = points[index];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.hypot(dx, dy);
        if (length < 1e-8) return;
        const nx = -dy / length * width / 2;
        const ny = dx / length * width / 2;
        positions.push(
          start.x + nx, start.y + ny, start.z - 0.05,
          start.x - nx, start.y - ny, start.z - 0.05,
          end.x + nx, end.y + ny, end.z - 0.05,
          start.x - nx, start.y - ny, start.z - 0.05,
          end.x - nx, end.y - ny, end.z - 0.05,
          end.x + nx, end.y + ny, end.z - 0.05,
        );
      });
    }
    view.fillGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    view.fillGeometry.computeBoundingSphere();
    view.fill.visible = width >= 1 / 16;
  }
}

function createViewportCircle(scene: THREE.Scene, circleId: string): ViewportLine {
  const view = createViewportLine(scene, circleId);
  delete view.line.userData.lineId;
  view.line.userData.circleId = circleId;
  return view;
}

function updateViewportCircle(view: ViewportLine, circle: CircleGeometry, zOffset = 0.5) {
  const points = Array.from({ length: 97 }, (_, index) => {
    const angle = index / 96 * Math.PI * 2;
    return new THREE.Vector3(
      circle.center.x + Math.cos(angle) * circle.radius,
      circle.center.y + Math.sin(angle) * circle.radius,
      circle.center.z + zOffset,
    );
  });
  view.geometry.setFromPoints(points);
  view.geometry.computeBoundingSphere();
}

function createViewportArc(scene: THREE.Scene, arcId: string): ViewportLine {
  const view = createViewportLine(scene, arcId);
  delete view.line.userData.lineId;
  view.line.userData.arcId = arcId;
  return view;
}

function updateViewportArc(view: ViewportLine, arc: ArcGeometry, zOffset = 0.55) {
  const segmentCount = Math.max(16, Math.ceil(arcSweepAngle(arc) / 4));
  const points = Array.from({ length: segmentCount + 1 }, (_, index) => {
    const point = arcPointAtFraction(arc, index / segmentCount);
    return new THREE.Vector3(point.x, point.y, point.z + zOffset);
  });
  view.geometry.setFromPoints(points);
  view.geometry.computeBoundingSphere();
}

type LineGripSet = {
  group: THREE.Group;
  handles: THREE.Mesh[];
};

function createLineGripSet(scene: THREE.Scene): LineGripSet {
  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 32;
  const handles = (["start", "midpoint", "end"] as const).map((grip) => {
    const handle = new THREE.Mesh(
      grip === "midpoint" ? new THREE.OctahedronGeometry(1, 0) : new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: grip === "midpoint" ? 0x71d49a : 0x39a9ff, depthTest: false, toneMapped: false }),
    );
    handle.renderOrder = 32;
    handle.userData.lineGrip = grip;
    handle.userData.screenPixels = grip === "midpoint" ? 12 : 10;
    group.add(handle);
    return handle;
  });
  scene.add(group);
  return { group, handles };
}

function updateLineGripPositions(grips: LineGripSet, line: LineObject) {
  const midpoint = lineMidpoint(line);
  const points = [line.start, midpoint, line.end];
  grips.handles.forEach((handle, index) => handle.position.set(points[index].x, points[index].y, points[index].z + 0.7));
}

function disposeLineGripSet(scene: THREE.Scene, grips: LineGripSet) {
  scene.remove(grips.group);
  grips.handles.forEach((handle) => {
    handle.geometry.dispose();
    (handle.material as THREE.Material).dispose();
  });
}

type PolylineGripSet = { group: THREE.Group; handles: THREE.Mesh[] };

function createPolylineGripSet(scene: THREE.Scene): PolylineGripSet {
  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 33;
  scene.add(group);
  return { group, handles: [] };
}

function updatePolylineGripPositions(grips: PolylineGripSet, polyline: PolylineObject) {
  const definitions = polyline.shape === "rectangle" && rectangleSupportsConstrainedGrips(polyline)
    ? rectangleGripPoints(polyline).map(({ grip, point }) => ({ grip, point, vertex: null }))
    : polyline.vertices.map((point, vertex) => ({ grip: null, point, vertex }));
  while (grips.handles.length < definitions.length) {
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0x39a9ff, depthTest: false, toneMapped: false }),
    );
    handle.renderOrder = 33;
    handle.userData.screenPixels = 10;
    grips.group.add(handle);
    grips.handles.push(handle);
  }
  grips.handles.forEach((handle, index) => {
    const definition = definitions[index];
    handle.visible = Boolean(definition);
    delete handle.userData.polylineVertex;
    delete handle.userData.rectangleGrip;
    if (!definition) return;
    if (definition.grip) handle.userData.rectangleGrip = definition.grip;
    else handle.userData.polylineVertex = definition.vertex;
    handle.userData.screenPixels = definition.grip?.kind === "center" ? 12 : 10;
    (handle.material as THREE.MeshBasicMaterial).color.setHex(definition.grip?.kind === "center" ? 0x55d68a : definition.grip?.kind === "edge" ? 0x62c3ff : 0x39a9ff);
    handle.position.set(definition.point.x, definition.point.y, polyline.elevation + 0.8);
  });
}

function disposePolylineGripSet(scene: THREE.Scene, grips: PolylineGripSet) {
  scene.remove(grips.group);
  grips.handles.forEach((handle) => {
    handle.geometry.dispose();
    (handle.material as THREE.Material).dispose();
  });
}

type CircleGripSet = { group: THREE.Group; handles: THREE.Mesh[] };

function createCircleGripSet(scene: THREE.Scene): CircleGripSet {
  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 34;
  const handles = (["center", "east", "north", "west", "south"] as CircleGrip[]).map((grip) => {
    const handle = new THREE.Mesh(
      grip === "center" ? new THREE.OctahedronGeometry(1, 0) : new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: grip === "center" ? 0x71d49a : 0x39a9ff, depthTest: false, toneMapped: false }),
    );
    handle.renderOrder = 34;
    handle.userData.circleGrip = grip;
    handle.userData.screenPixels = grip === "center" ? 12 : 10;
    group.add(handle);
    return handle;
  });
  scene.add(group);
  return { group, handles };
}

function updateCircleGripPositions(grips: CircleGripSet, circle: CircleObject) {
  circleGripPoints(circle).forEach(({ point }, index) => {
    grips.handles[index].position.set(point.x, point.y, point.z + 0.85);
  });
}

function disposeCircleGripSet(scene: THREE.Scene, grips: CircleGripSet) {
  scene.remove(grips.group);
  grips.handles.forEach((handle) => {
    handle.geometry.dispose();
    (handle.material as THREE.Material).dispose();
  });
}

type ArcGripSet = { group: THREE.Group; handles: THREE.Mesh[] };

function createArcGripSet(scene: THREE.Scene): ArcGripSet {
  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 35;
  const handles = (["center", "start", "midpoint", "end"] as ArcGrip[]).map((grip) => {
    const handle = new THREE.Mesh(
      grip === "center" ? new THREE.OctahedronGeometry(1, 0) : new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: grip === "center" ? 0x71d49a : 0x39a9ff, depthTest: false, toneMapped: false }),
    );
    handle.renderOrder = 35;
    handle.userData.arcGrip = grip;
    handle.userData.screenPixels = grip === "center" ? 12 : 10;
    group.add(handle);
    return handle;
  });
  scene.add(group);
  return { group, handles };
}

function updateArcGripPositions(grips: ArcGripSet, arc: ArcObject) {
  arcGripPoints(arc).forEach(({ point }, index) => grips.handles[index].position.set(point.x, point.y, point.z + 0.9));
}

function disposeArcGripSet(scene: THREE.Scene, grips: ArcGripSet) {
  scene.remove(grips.group);
  grips.handles.forEach((handle) => {
    handle.geometry.dispose();
    (handle.material as THREE.Material).dispose();
  });
}

function createViewportObject(scene: THREE.Scene, objectId: string): ViewportObject {
  const materials = FACE_DEFINITIONS.map(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x66788a,
        emissive: 0x000000,
        roughness: 0.58,
        metalness: 0.06,
        transparent: true,
        opacity: 0.84,
      }),
  );
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materials);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.objectId = objectId;
  scene.add(mesh);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    new THREE.LineBasicMaterial({ color: 0x8da0b2 }),
  );
  scene.add(edges);
  return { edges, materials, mesh };
}

function disposeViewportObject(scene: THREE.Scene, view: ViewportObject) {
  scene.remove(view.mesh, view.edges);
  view.mesh.geometry.dispose();
  view.materials.forEach((material) => material.dispose());
  view.edges.geometry.dispose();
  (view.edges.material as THREE.Material).dispose();
}

type MoveGizmo = {
  group: THREE.Group;
  handles: THREE.Mesh[];
};

function createMoveGizmo(scene: THREE.Scene): MoveGizmo {
  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 20;
  const handles: THREE.Mesh[] = [];
  const origin = new THREE.Mesh(
    new THREE.SphereGeometry(3.2, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xf0d49d, depthTest: false }),
  );
  origin.renderOrder = 20;
  group.add(origin);

  const axes: Array<{ axis: AxisKey; color: number; direction: THREE.Vector3 }> = [
    { axis: "x", color: 0xe36b63, direction: new THREE.Vector3(1, 0, 0) },
    { axis: "y", color: 0x65c38b, direction: new THREE.Vector3(0, 1, 0) },
    { axis: "z", color: 0x61a9e7, direction: new THREE.Vector3(0, 0, 1) },
  ];
  const cylinderUp = new THREE.Vector3(0, 1, 0);

  axes.forEach(({ axis, color, direction }) => {
    const material = new THREE.MeshBasicMaterial({
      color,
      depthTest: false,
      transparent: true,
      opacity: 0.96,
    });
    const orientation = new THREE.Quaternion().setFromUnitVectors(cylinderUp, direction);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 34, 8), material);
    shaft.position.copy(direction).multiplyScalar(17);
    shaft.quaternion.copy(orientation);
    shaft.renderOrder = 20;
    shaft.userData.moveAxis = axis;
    group.add(shaft);
    handles.push(shaft);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(5, 12, 10), material);
    tip.position.copy(direction).multiplyScalar(40);
    tip.quaternion.copy(orientation);
    tip.renderOrder = 20;
    tip.userData.moveAxis = axis;
    group.add(tip);
    handles.push(tip);
  });

  scene.add(group);
  return { group, handles };
}

type RotationGizmo = {
  baseHandle: THREE.Mesh;
  group: THREE.Group;
  ring: THREE.Mesh;
};

function createRotationGizmo(scene: THREE.Scene): RotationGizmo {
  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 35;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.035, 10, 72),
    new THREE.MeshBasicMaterial({
      color: 0xe3ad4d,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.96,
      toneMapped: false,
    }),
  );
  ring.renderOrder = 35;
  ring.userData.rotationHandle = true;
  group.add(ring);
  const baseHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 2.8, 1.2, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd47d, depthTest: false, toneMapped: false }),
  );
  baseHandle.rotation.x = Math.PI / 2;
  baseHandle.renderOrder = 36;
  group.add(baseHandle);
  scene.add(group);
  return { baseHandle, group, ring };
}

function disposeRotationGizmo(scene: THREE.Scene, gizmo: RotationGizmo) {
  scene.remove(gizmo.group);
  gizmo.ring.geometry.dispose();
  (gizmo.ring.material as THREE.Material).dispose();
  gizmo.baseHandle.geometry.dispose();
  (gizmo.baseHandle.material as THREE.Material).dispose();
}

type ScaleGizmo = {
  baseHandle: THREE.Mesh;
  group: THREE.Group;
  guide: THREE.Line;
  handle: THREE.Mesh;
};

function createScaleGizmo(scene: THREE.Scene): ScaleGizmo {
  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 35;
  const guide = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
    ]),
    new THREE.LineDashedMaterial({ color: 0x65d8a6, dashSize: 6, depthTest: false, gapSize: 3, toneMapped: false }),
  );
  guide.computeLineDistances();
  guide.renderOrder = 35;
  group.add(guide);
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(9, 9, 2),
    new THREE.MeshBasicMaterial({ color: 0x65d8a6, depthTest: false, toneMapped: false }),
  );
  handle.renderOrder = 36;
  handle.userData.scaleHandle = true;
  group.add(handle);
  const baseHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 2.8, 1.2, 16),
    new THREE.MeshBasicMaterial({ color: 0xb8f5dc, depthTest: false, toneMapped: false }),
  );
  baseHandle.rotation.x = Math.PI / 2;
  baseHandle.renderOrder = 36;
  group.add(baseHandle);
  scene.add(group);
  return { baseHandle, group, guide, handle };
}

function disposeScaleGizmo(scene: THREE.Scene, gizmo: ScaleGizmo) {
  scene.remove(gizmo.group);
  gizmo.guide.geometry.dispose();
  (gizmo.guide.material as THREE.Material).dispose();
  gizmo.handle.geometry.dispose();
  (gizmo.handle.material as THREE.Material).dispose();
  gizmo.baseHandle.geometry.dispose();
  (gizmo.baseHandle.material as THREE.Material).dispose();
}

function disposeMoveGizmo(scene: THREE.Scene, gizmo: MoveGizmo) {
  scene.remove(gizmo.group);
  const materials = new Set<THREE.Material>();
  gizmo.group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    if (Array.isArray(child.material)) child.material.forEach((material) => materials.add(material));
    else materials.add(child.material);
  });
  materials.forEach((material) => material.dispose());
}

type BoxGripSet = {
  centerHandle: THREE.Mesh;
  group: THREE.Group;
  handles: THREE.Mesh[];
};

const GRIP_COLORS: Record<BoxGripKind, number> = {
  corner: 0x39a9ff,
  edge: 0x58b8ff,
  face: 0x78c7ff,
};

function createBoxGripSet(scene: THREE.Scene): BoxGripSet {
  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 30;
  const centerHandle = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.35, 0),
    new THREE.MeshBasicMaterial({
      color: 0x71d49a,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  centerHandle.frustumCulled = false;
  centerHandle.renderOrder = 31;
  centerHandle.userData.objectMoveGrip = true;
  centerHandle.userData.screenPixels = 14;
  group.add(centerHandle);

  const resizeHandles = BOX_GRIP_DEFINITIONS.map((grip) => {
    const size = grip.kind === "face" ? 1.18 : grip.kind === "edge" ? 1.02 : 0.92;
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      new THREE.MeshBasicMaterial({
        color: GRIP_COLORS[grip.kind],
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    handle.frustumCulled = false;
    handle.renderOrder = 30;
    handle.userData.boxGrip = grip;
    handle.userData.screenPixels = 10;
    group.add(handle);
    return handle;
  });
  const handles = [centerHandle, ...resizeHandles];
  scene.add(group);
  return { centerHandle, group, handles };
}

function updateBoxGripPositions(gripSet: BoxGripSet, object: BoxObject) {
  const center = boxWorldPoint(object, 0.5, 0.5, 0.5);
  gripSet.centerHandle.position.set(center.x, center.y, center.z);
  gripSet.handles.slice(1).forEach((handle) => {
    const grip = handle.userData.boxGrip as BoxGripDefinition;
    const position = boxGripPosition(object, grip);
    handle.position.set(position.x, position.y, position.z);
  });
}

function disposeBoxGripSet(scene: THREE.Scene, gripSet: BoxGripSet) {
  scene.remove(gripSet.group);
  gripSet.handles.forEach((handle) => {
    handle.geometry.dispose();
    (handle.material as THREE.Material).dispose();
  });
}

function Viewport({
  activeElevation,
  gridSpacing,
  gridVisible,
  interfaceTheme,
  arcCommand,
  arcContinueSeed,
  arcMethod,
  arcMode,
  circleCommand,
  circleMethod,
  circleMode,
  copyMode,
  document,
  dragStatus,
  fitViewSignal,
  lineCommand,
  lineMode,
  lineSnapAngles,
  polylineCommand,
  polylineMode,
  polylineSegmentMode,
  polylineWidth,
  rectangleCommand,
  rectangleDraftSettings,
  rectangleMode,
  moveMode,
  mirrorMode,
  mirrorKeepSource,
  offsetDistance,
  offsetKeepSource,
  offsetMode,
  chamferFirstDistance,
  chamferMode,
  chamferSecondDistance,
  breakMode,
  boundaryMode,
  filletMode,
  filletRadius,
  lengthenMethod,
  lengthenMode,
  lengthenValue,
  extendMode,
  trimMode,
  objectSnapEnabled,
  objectSnapModes,
  objectSnapOverride,
  orthoEnabled,
  polarEnabled,
  rotateMode,
  rotationBaseKey,
  scaleMode,
  scaleBaseKey,
  stretchMode,
  stretchTargets,
  onDragCancel,
  onDragCommit,
  onDragPreview,
  onDragStatus,
  onExactFaceMove,
  onFaceSelect,
  onArcCreate,
  onArcFinishRequested,
  onArcPointsChange,
  onArcSelect,
  onCirclePointsChange,
  onCircleCreate,
  onCircleFinishRequested,
  onCircleSelect,
  onLineAnchorChange,
  onLineCommandFeedback,
  onLineCreate,
  onLineFinishRequested,
  onLineSelect,
  onLineUndoSegment,
  onModifyCommit,
  onModifyFinishRequested,
  onMirrorCommit,
  onMirrorFinishRequested,
  onOffsetCommit,
  onOffsetFinishRequested,
  onChamferCommit,
  onChamferFinishRequested,
  onChamferStageChange,
  onBreakCommit,
  onBreakFinishRequested,
  onBreakStageChange,
  onBoundaryCommit,
  onBoundaryFinishRequested,
  onFilletCommit,
  onFilletFinishRequested,
  onFilletStageChange,
  onLengthenCommit,
  onLengthenFinishRequested,
  onTrimExtendCommit,
  onTrimExtendFinishRequested,
  onObjectSnapOverrideConsumed,
  onPolylineCreate,
  onPolylineAnchorChange,
  onPolylineFinishRequested,
  onPolylineSelect,
  onSelectionWindow,
  onRectangleAnchorChange,
  onRectangleFinishRequested,
  onRotateFinishRequested,
  onScaleFinishRequested,
  onStretchCommit,
  onStretchFinishRequested,
  onStretchTargetsChange,
  onViewChange,
  selectedArcId,
  selectedFaceIndex,
  selectedCircleId,
  selectedLineId,
  selectedPolylineId,
  selectedObjectId,
  selectedObjectIds,
  selectedEntityKeys,
  snapIncrement,
  viewTarget,
}: ViewportProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeGripInput, setActiveGripInput] = useState<ActiveGripInput | null>(null);
  const [gripDraft, setGripDraft] = useState("");
  const [gripInputError, setGripInputError] = useState("");
  const [dynamicLineInput, setDynamicLineInput] = useState<{ angle: number; distance: number; elevation: number; label: string; x: number; y: number } | null>(null);
  const [dynamicArcInput, setDynamicArcInput] = useState<{ elevation: number; label: string; stage: string; x: number; y: number } | null>(null);
  const [dynamicCircleInput, setDynamicCircleInput] = useState<{ elevation: number; label: string; radius: number; stage: string; x: number; y: number } | null>(null);
  const [dynamicPolylineInput, setDynamicPolylineInput] = useState<{ angle: number; distance: number; elevation: number; label: string; x: number; y: number } | null>(null);
  const [dynamicRectangleInput, setDynamicRectangleInput] = useState<{ elevation: number; height: number; label: string; width: number; x: number; y: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ end: ScreenPoint; mode: SelectionWindowMode; start: ScreenPoint } | null>(null);
  const [hoveredEntityKey, setHoveredEntityKey] = useState<string | null>(null);
  const [selectionCycle, setSelectionCycle] = useState<{ count: number; index: number; label: string; x: number; y: number } | null>(null);
  const objectViewsRef = useRef(new Map<string, ViewportObject>());
  const lineViewsRef = useRef(new Map<string, ViewportLine>());
  const wallViewsRef = useRef(new Map<string, WallView>());
  const arcViewsRef = useRef(new Map<string, ViewportLine>());
  const circleViewsRef = useRef(new Map<string, ViewportLine>());
  const polylineViewsRef = useRef(new Map<string, ViewportLine>());
  const floorPlatformViewsRef = useRef(new Map<string, FloorPlatformView>());
  const roomPlatformViewsRef = useRef(new Map<string, FloorPlatformView>());
  const moveGizmoRef = useRef<MoveGizmo | null>(null);
  const rotationGizmoRef = useRef<RotationGizmo | null>(null);
  const scaleGizmoRef = useRef<ScaleGizmo | null>(null);
  const boxGripSetRef = useRef<BoxGripSet | null>(null);
  const lineGripSetRef = useRef<LineGripSet | null>(null);
  const arcGripSetRef = useRef<ArcGripSet | null>(null);
  const polylineGripSetRef = useRef<PolylineGripSet | null>(null);
  const circleGripSetRef = useRef<CircleGripSet | null>(null);
  const selectedObjectIdRef = useRef(selectedObjectId);
  const selectedObjectIdsRef = useRef(selectedObjectIds);
  const selectedEntityKeysRef = useRef(selectedEntityKeys);
  const copyModeRef = useRef(copyMode);
  const moveModeRef = useRef(moveMode);
  const mirrorModeRef = useRef(mirrorMode);
  const mirrorKeepSourceRef = useRef(mirrorKeepSource);
  const offsetDistanceRef = useRef(offsetDistance);
  const offsetKeepSourceRef = useRef(offsetKeepSource);
  const offsetModeRef = useRef(offsetMode);
  const chamferFirstDistanceRef = useRef(chamferFirstDistance);
  const chamferModeRef = useRef(chamferMode);
  const chamferSecondDistanceRef = useRef(chamferSecondDistance);
  const breakModeRef = useRef(breakMode);
  const boundaryModeRef = useRef(boundaryMode);
  const filletModeRef = useRef(filletMode);
  const filletRadiusRef = useRef(filletRadius);
  const lengthenMethodRef = useRef(lengthenMethod);
  const lengthenModeRef = useRef(lengthenMode);
  const lengthenValueRef = useRef(lengthenValue);
  const extendModeRef = useRef(extendMode);
  const trimModeRef = useRef(trimMode);
  const rotateModeRef = useRef(rotateMode);
  const scaleModeRef = useRef(scaleMode);
  const stretchModeRef = useRef(stretchMode);
  const stretchTargetsRef = useRef(stretchTargets);
  const lineModeRef = useRef(lineMode);
  const arcModeRef = useRef(arcMode);
  const arcMethodRef = useRef(arcMethod);
  const arcContinueSeedRef = useRef(arcContinueSeed);
  const circleModeRef = useRef(circleMode);
  const circleMethodRef = useRef(circleMethod);
  const activeElevationRef = useRef(activeElevation);
  const objectSnapEnabledRef = useRef(objectSnapEnabled);
  const objectSnapModesRef = useRef(objectSnapModes);
  const objectSnapOverrideRef = useRef(objectSnapOverride);
  const orthoEnabledRef = useRef(orthoEnabled);
  const polarEnabledRef = useRef(polarEnabled);
  const lineCommandRef = useRef(lineCommand);
  const arcCommandRef = useRef(arcCommand);
  const circleCommandRef = useRef(circleCommand);
  const rectangleCommandRef = useRef(rectangleCommand);
  const rectangleDraftSettingsRef = useRef(rectangleDraftSettings);
  const polylineCommandRef = useRef(polylineCommand);
  const lineSnapAnglesRef = useRef(lineSnapAngles);
  const snapIncrementRef = useRef(snapIncrement);
  const processedLineCommandIdRef = useRef(0);
  const processedArcCommandIdRef = useRef(0);
  const processedCircleCommandIdRef = useRef(0);
  const processedRectangleCommandIdRef = useRef(0);
  const processedPolylineCommandIdRef = useRef(0);
  const selectedLineIdRef = useRef(selectedLineId);
  const selectedArcIdRef = useRef(selectedArcId);
  const selectedCircleIdRef = useRef(selectedCircleId);
  const selectedPolylineIdRef = useRef(selectedPolylineId);
  const polylineModeRef = useRef(polylineMode);
  const polylineSegmentModeRef = useRef(polylineSegmentMode);
  const polylineWidthRef = useRef(polylineWidth);
  const rectangleModeRef = useRef(rectangleMode);
  const lineStartRef = useRef<LinePoint | null>(null);
  const arcPointsRef = useRef<LinePoint[]>([]);
  const arcCursorRef = useRef<LinePoint | null>(null);
  const circlePointsRef = useRef<LinePoint[]>([]);
  const circleTangentConstraintsRef = useRef<PickedCircleTangentConstraint[]>([]);
  const circleCursorRef = useRef<LinePoint | null>(null);
  const lineCursorRef = useRef<LinePoint | null>(null);
  const linePointHistoryRef = useRef<LinePoint[]>([]);
  const lineEscapeArmedRef = useRef(false);
  const polylinePointsRef = useRef<PlanPoint[]>([]);
  const polylineBulgesRef = useRef<number[]>([]);
  const polylineArcThroughRef = useRef<LinePoint | null>(null);
  const polylineElevationRef = useRef(activeElevation);
  const polylineCursorRef = useRef<LinePoint | null>(null);
  const polylineEscapeArmedRef = useRef(false);
  const rectangleStartRef = useRef<LinePoint | null>(null);
  const rectangleCursorRef = useRef<LinePoint | null>(null);
  const rectangleEscapeArmedRef = useRef(false);
  const modifyBaseRef = useRef<LinePoint | null>(null);
  const modifyBeforeRef = useRef<ModelDocument | null>(null);
  const mirrorAxisStartRef = useRef<LinePoint | null>(null);
  const mirrorBeforeRef = useRef<ModelDocument | null>(null);
  const offsetBeforeRef = useRef<ModelDocument | null>(null);
  const chamferBeforeRef = useRef<ModelDocument | null>(null);
  const chamferFirstPickRef = useRef<{ id: string; point: LinePoint } | null>(null);
  const breakBeforeRef = useRef<ModelDocument | null>(null);
  const breakTargetRef = useRef<CadEntityRef | null>(null);
  const breakFirstPointRef = useRef<LinePoint | null>(null);
  const filletBeforeRef = useRef<ModelDocument | null>(null);
  const filletFirstPickRef = useRef<CurveFilletPick | null>(null);
  const lengthenBeforeRef = useRef<ModelDocument | null>(null);
  const lengthenEndpointRef = useRef<LengthenEndpoint | null>(null);
  const trimExtendBeforeRef = useRef<ModelDocument | null>(null);
  const acquiredTrackingPointsRef = useRef<LinePoint[]>([]);
  const objectSnapHoverRef = useRef<{ key: string; since: number } | null>(null);
  const objectSnapAcquisitionTimerRef = useRef<number | null>(null);
  const objectSnapCycleIndexRef = useRef(0);
  const objectSnapCycleCountRef = useRef(0);
  const objectSnapCyclePointerRef = useRef<LinePoint | null>(null);
  const rotationBaseKeyRef = useRef(rotationBaseKey);
  const scaleBaseKeyRef = useRef(scaleBaseKey);
  const viewTargetRef = useRef(viewTarget);
  const cameraOrientationRef = useRef(new THREE.Quaternion());
  const cubeOrbitRef = useRef<CubeOrbitController | null>(null);
  const skipNextViewApplyRef = useRef(false);
  const onViewChangeRef = useRef(onViewChange);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const gridPlacementRef = useRef<{ position: [number, number, number]; rotation: [number, number, number] }>({
    position: [0, 0, -0.15],
    rotation: [Math.PI / 2, 0, 0],
  });
  const objectCountRef = useRef(document.objects.length);
  const lineCountRef = useRef(document.lines.length);
  const arcCountRef = useRef(document.arcs.length);
  const circleCountRef = useRef(document.circles.length);
  const polylineCountRef = useRef(document.polylines.length);
  const fitViewRef = useRef<(() => void) | null>(null);
  const applyViewRef = useRef<((view: ViewTarget) => void) | null>(null);
  const documentRef = useRef(document);
  const callbacksRef = useRef({
    onDragCancel,
    onDragCommit,
    onDragPreview,
    onDragStatus,
    onFaceSelect,
    onArcCreate,
    onArcFinishRequested,
    onArcPointsChange,
    onArcSelect,
    onCirclePointsChange,
    onCircleCreate,
    onCircleFinishRequested,
    onCircleSelect,
    onLineAnchorChange,
    onLineCommandFeedback,
    onLineCreate,
    onLineFinishRequested,
    onLineSelect,
    onLineUndoSegment,
    onModifyCommit,
    onModifyFinishRequested,
    onMirrorCommit,
    onMirrorFinishRequested,
    onOffsetCommit,
    onOffsetFinishRequested,
    onChamferCommit,
    onChamferFinishRequested,
    onChamferStageChange,
    onBreakCommit,
    onBreakFinishRequested,
    onBreakStageChange,
    onBoundaryCommit,
    onBoundaryFinishRequested,
    onFilletCommit,
    onFilletFinishRequested,
    onFilletStageChange,
    onLengthenCommit,
    onLengthenFinishRequested,
    onTrimExtendCommit,
    onTrimExtendFinishRequested,
    onObjectSnapOverrideConsumed,
    onPolylineAnchorChange,
    onPolylineCreate,
    onPolylineFinishRequested,
    onPolylineSelect,
    onSelectionWindow,
    onRectangleAnchorChange,
    onRectangleFinishRequested,
    onRotateFinishRequested,
    onScaleFinishRequested,
    onStretchCommit,
    onStretchFinishRequested,
    onStretchTargetsChange,
  });

  const closeGripInput = useCallback(() => {
    setActiveGripInput(null);
    setGripDraft("");
    setGripInputError("");
    onDragStatus(null);
  }, [onDragStatus]);

  useEffect(() => {
    if (!selectionCycle) return;
    const timeout = window.setTimeout(() => setSelectionCycle(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [selectionCycle]);

  useEffect(() => {
    if (moveMode || copyMode || stretchMode || !modifyBeforeRef.current) return;
    onDragCancel(modifyBeforeRef.current);
    modifyBaseRef.current = null;
    modifyBeforeRef.current = null;
    setDynamicLineInput(null);
    onDragStatus(null);
  }, [copyMode, moveMode, onDragCancel, onDragStatus, stretchMode]);

  useEffect(() => {
    if (mirrorMode || !mirrorBeforeRef.current) return;
    onDragCancel(mirrorBeforeRef.current);
    mirrorAxisStartRef.current = null;
    mirrorBeforeRef.current = null;
    setDynamicLineInput(null);
    onDragStatus(null);
  }, [mirrorMode, onDragCancel, onDragStatus]);

  useEffect(() => {
    if (offsetMode || !offsetBeforeRef.current) return;
    onDragCancel(offsetBeforeRef.current);
    offsetBeforeRef.current = null;
    setDynamicLineInput(null);
    onDragStatus(null);
  }, [offsetMode, onDragCancel, onDragStatus]);

  useEffect(() => {
    if (breakMode) return;
    if (breakBeforeRef.current) onDragCancel(breakBeforeRef.current);
    breakBeforeRef.current = null;
    breakTargetRef.current = null;
    breakFirstPointRef.current = null;
  }, [breakMode, onDragCancel]);

  useEffect(() => {
    if (chamferMode) return;
    if (chamferBeforeRef.current) onDragCancel(chamferBeforeRef.current);
    chamferBeforeRef.current = null;
    chamferFirstPickRef.current = null;
  }, [chamferMode, onDragCancel]);

  useEffect(() => {
    if (filletMode) return;
    if (filletBeforeRef.current) onDragCancel(filletBeforeRef.current);
    filletBeforeRef.current = null;
    filletFirstPickRef.current = null;
  }, [filletMode, onDragCancel]);

  useEffect(() => {
    if (lengthenMode) return;
    if (lengthenBeforeRef.current) onDragCancel(lengthenBeforeRef.current);
    lengthenBeforeRef.current = null;
    lengthenEndpointRef.current = null;
  }, [lengthenMode, onDragCancel]);

  useEffect(() => {
    if (trimMode || extendMode || !trimExtendBeforeRef.current) return;
    onDragCancel(trimExtendBeforeRef.current);
    trimExtendBeforeRef.current = null;
    setDynamicLineInput(null);
    onDragStatus(null);
  }, [extendMode, onDragCancel, onDragStatus, trimMode]);

  const updateGripDraft = useCallback((draft: string) => {
    setGripDraft(draft);
    setGripInputError("");
    if (!activeGripInput) return;
    const parsed = parseSignedArchitectural(draft);
    onDragStatus({
      axis: activeGripInput.axis,
      distance: parsed === null ? 0 : snapToSixteenth(parsed),
      gripKind: "face",
      kind: "entry",
      valid: parsed !== null,
    });
  }, [activeGripInput, onDragStatus]);

  const commitGripInput = useCallback(() => {
    if (!activeGripInput) return;
    const parsed = parseSignedArchitectural(gripDraft);
    if (parsed === null) {
      setGripInputError("Enter a signed architectural distance.");
      onDragStatus({
        axis: activeGripInput.axis,
        distance: 0,
        gripKind: "face",
        kind: "entry",
        valid: false,
      });
      return;
    }
    const distance = snapToSixteenth(parsed);
    if (!onExactFaceMove(activeGripInput.objectId, activeGripInput.faceIndex, distance)) {
      setGripInputError("That distance would make the box too small.");
      onDragStatus({
        axis: activeGripInput.axis,
        distance,
        gripKind: "face",
        kind: "entry",
        valid: false,
      });
      return;
    }
    closeGripInput();
  }, [activeGripInput, closeGripInput, gripDraft, onDragStatus, onExactFaceMove]);

  const focusGripInput = useCallback((input: HTMLInputElement | null) => {
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  useEffect(() => {
    documentRef.current = document;
    selectedObjectIdRef.current = selectedObjectId;
    selectedObjectIdsRef.current = selectedObjectIds;
    selectedEntityKeysRef.current = selectedEntityKeys;
    copyModeRef.current = copyMode;
    moveModeRef.current = moveMode;
    mirrorModeRef.current = mirrorMode;
    mirrorKeepSourceRef.current = mirrorKeepSource;
    offsetDistanceRef.current = offsetDistance;
    offsetKeepSourceRef.current = offsetKeepSource;
    offsetModeRef.current = offsetMode;
    chamferFirstDistanceRef.current = chamferFirstDistance;
    chamferModeRef.current = chamferMode;
    chamferSecondDistanceRef.current = chamferSecondDistance;
    breakModeRef.current = breakMode;
    boundaryModeRef.current = boundaryMode;
    filletModeRef.current = filletMode;
    filletRadiusRef.current = filletRadius;
    lengthenMethodRef.current = lengthenMethod;
    lengthenModeRef.current = lengthenMode;
    lengthenValueRef.current = lengthenValue;
    extendModeRef.current = extendMode;
    trimModeRef.current = trimMode;
    rotateModeRef.current = rotateMode;
    scaleModeRef.current = scaleMode;
    stretchModeRef.current = stretchMode;
    stretchTargetsRef.current = stretchTargets;
    lineModeRef.current = lineMode;
    arcModeRef.current = arcMode;
    arcMethodRef.current = arcMethod;
    arcContinueSeedRef.current = arcContinueSeed;
    circleModeRef.current = circleMode;
    circleMethodRef.current = circleMethod;
    activeElevationRef.current = activeElevation;
    objectSnapEnabledRef.current = objectSnapEnabled;
    objectSnapModesRef.current = objectSnapModes;
    objectSnapOverrideRef.current = objectSnapOverride;
    orthoEnabledRef.current = orthoEnabled;
    polarEnabledRef.current = polarEnabled;
    lineCommandRef.current = lineCommand;
    arcCommandRef.current = arcCommand;
    circleCommandRef.current = circleCommand;
    rectangleCommandRef.current = rectangleCommand;
    rectangleDraftSettingsRef.current = rectangleDraftSettings;
    polylineCommandRef.current = polylineCommand;
    lineSnapAnglesRef.current = lineSnapAngles;
    snapIncrementRef.current = snapIncrement;
    selectedLineIdRef.current = selectedLineId;
    selectedArcIdRef.current = selectedArcId;
    selectedCircleIdRef.current = selectedCircleId;
    selectedPolylineIdRef.current = selectedPolylineId;
    polylineModeRef.current = polylineMode;
    polylineSegmentModeRef.current = polylineSegmentMode;
    polylineWidthRef.current = polylineWidth;
    rectangleModeRef.current = rectangleMode;
    rotationBaseKeyRef.current = rotationBaseKey;
    scaleBaseKeyRef.current = scaleBaseKey;
    viewTargetRef.current = viewTarget;
    onViewChangeRef.current = onViewChange;
    callbacksRef.current = {
      onDragCancel,
      onDragCommit,
      onDragPreview,
      onDragStatus,
      onFaceSelect,
      onArcCreate,
      onArcFinishRequested,
      onArcPointsChange,
      onArcSelect,
      onCirclePointsChange,
      onCircleCreate,
      onCircleFinishRequested,
      onCircleSelect,
      onLineAnchorChange,
      onLineCommandFeedback,
      onLineCreate,
      onLineFinishRequested,
      onLineSelect,
      onLineUndoSegment,
      onModifyCommit,
      onModifyFinishRequested,
      onMirrorCommit,
      onMirrorFinishRequested,
      onOffsetCommit,
      onOffsetFinishRequested,
      onChamferCommit,
      onChamferFinishRequested,
      onChamferStageChange,
      onBreakCommit,
      onBreakFinishRequested,
      onBreakStageChange,
      onBoundaryCommit,
      onBoundaryFinishRequested,
      onFilletCommit,
      onFilletFinishRequested,
      onFilletStageChange,
      onLengthenCommit,
      onLengthenFinishRequested,
      onTrimExtendCommit,
      onTrimExtendFinishRequested,
      onObjectSnapOverrideConsumed,
      onPolylineAnchorChange,
      onPolylineCreate,
      onPolylineFinishRequested,
      onPolylineSelect,
      onSelectionWindow,
      onRectangleAnchorChange,
      onRectangleFinishRequested,
      onRotateFinishRequested,
      onScaleFinishRequested,
      onStretchCommit,
      onStretchFinishRequested,
      onStretchTargetsChange,
    };
  }, [
    document,
    activeElevation,
    copyMode,
    moveMode,
    mirrorMode,
    mirrorKeepSource,
    offsetDistance,
    offsetKeepSource,
    offsetMode,
    chamferFirstDistance,
    chamferMode,
    chamferSecondDistance,
    breakMode,
    boundaryMode,
    filletMode,
    filletRadius,
    lengthenMethod,
    lengthenMode,
    lengthenValue,
    extendMode,
    trimMode,
    rotateMode,
    scaleMode,
    stretchMode,
    stretchTargets,
    lineMode,
    arcMode,
    arcMethod,
    arcContinueSeed,
    circleMode,
    circleMethod,
    lineCommand,
    arcCommand,
    circleCommand,
    rectangleCommand,
    rectangleDraftSettings,
    polylineCommand,
    lineSnapAngles,
    snapIncrement,
    objectSnapEnabled,
    objectSnapModes,
    objectSnapOverride,
    orthoEnabled,
    polarEnabled,
    polylineMode,
    polylineSegmentMode,
    polylineWidth,
    rectangleMode,
    rotationBaseKey,
    scaleBaseKey,
    onDragCancel,
    onDragCommit,
    onDragPreview,
    onChamferCommit,
    onChamferFinishRequested,
    onChamferStageChange,
    onBreakCommit,
    onBreakFinishRequested,
    onBreakStageChange,
    onBoundaryCommit,
    onBoundaryFinishRequested,
    onFilletCommit,
    onFilletFinishRequested,
    onFilletStageChange,
    onLengthenCommit,
    onLengthenFinishRequested,
    onDragStatus,
    onFaceSelect,
    onArcCreate,
    onArcFinishRequested,
    onArcPointsChange,
    onArcSelect,
    onCirclePointsChange,
    onCircleCreate,
    onCircleFinishRequested,
    onCircleSelect,
    onLineAnchorChange,
    onLineCommandFeedback,
    onLineCreate,
    onLineFinishRequested,
    onLineSelect,
    onLineUndoSegment,
    onModifyCommit,
    onModifyFinishRequested,
    onMirrorCommit,
    onMirrorFinishRequested,
    onOffsetCommit,
    onOffsetFinishRequested,
    onTrimExtendCommit,
    onTrimExtendFinishRequested,
    onObjectSnapOverrideConsumed,
    onPolylineAnchorChange,
    onPolylineCreate,
    onPolylineFinishRequested,
    onPolylineSelect,
    onSelectionWindow,
    onRectangleAnchorChange,
    onRectangleFinishRequested,
    onRotateFinishRequested,
    onScaleFinishRequested,
    onStretchCommit,
    onStretchFinishRequested,
    onStretchTargetsChange,
    onViewChange,
    selectedObjectId,
    selectedObjectIds,
    selectedEntityKeys,
    selectedLineId,
    selectedArcId,
    selectedCircleId,
    selectedPolylineId,
    viewTarget,
  ]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const objectViews = objectViewsRef.current;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x151b22);
    const perspectiveCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 10000);
    perspectiveCamera.up.set(0, 0, 1);
    const orthographicCamera = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 10000);
    orthographicCamera.up.set(0, 0, 1);
    let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera = perspectiveCamera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.mouseButtons.LEFT = null;
    controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
    controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;

    const setMiddleMode = (event: PointerEvent) => {
      if (event.button === 1) {
        controls.mouseButtons.MIDDLE = event.shiftKey
          ? THREE.MOUSE.ROTATE
          : THREE.MOUSE.PAN;
      }
    };
    renderer.domElement.addEventListener("pointerdown", setMiddleMode, true);

    scene.add(new THREE.HemisphereLight(0xd7e8ff, 0x34404d, 2.3));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
    keyLight.position.set(-180, -220, 340);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x76b8ff, 0.65);
    fillLight.position.set(220, 120, 160);
    scene.add(fillLight);

    const moveGizmo = createMoveGizmo(scene);
    moveGizmoRef.current = moveGizmo;
    const rotationGizmo = createRotationGizmo(scene);
    rotationGizmoRef.current = rotationGizmo;
    const scaleGizmo = createScaleGizmo(scene);
    scaleGizmoRef.current = scaleGizmo;
    const boxGripSet = createBoxGripSet(scene);
    boxGripSetRef.current = boxGripSet;
    const lineGripSet = createLineGripSet(scene);
    lineGripSetRef.current = lineGripSet;
    const polylineGripSet = createPolylineGripSet(scene);
    polylineGripSetRef.current = polylineGripSet;
    const circleGripSet = createCircleGripSet(scene);
    circleGripSetRef.current = circleGripSet;
    const arcGripSet = createArcGripSet(scene);
    arcGripSetRef.current = arcGripSet;

    documentRef.current.objects.forEach((object) => {
      objectViews.set(object.id, createViewportObject(scene, object.id));
    });
    const lineViews = lineViewsRef.current;
    documentRef.current.lines.forEach((line) => {
      const view = createViewportLine(scene, line.id);
      updateViewportLine(view, line);
      lineViews.set(line.id, view);
    });
    const wallViews = wallViewsRef.current;
    const polylineViews = polylineViewsRef.current;
    documentRef.current.polylines.forEach((polyline) => {
      const view = createViewportPolyline(scene, polyline.id);
      updateViewportPolyline(view, polyline);
      polylineViews.set(polyline.id, view);
    });
    const floorPlatformViews = floorPlatformViewsRef.current;
    const roomPlatformViews = roomPlatformViewsRef.current;
    const circleViews = circleViewsRef.current;
    documentRef.current.circles.forEach((circle) => {
      const view = createViewportCircle(scene, circle.id);
      updateViewportCircle(view, circle);
      circleViews.set(circle.id, view);
    });
    const arcViews = arcViewsRef.current;
    documentRef.current.arcs.forEach((arc) => {
      const view = createViewportArc(scene, arc.id);
      updateViewportArc(view, arc);
      arcViews.set(arc.id, view);
    });

    const linePreviewGeometry = new THREE.BufferGeometry();
    const linePreview = new THREE.Line(
      linePreviewGeometry,
      new THREE.LineDashedMaterial({ color: 0xf1bb55, dashSize: 8, gapSize: 4, depthTest: false, toneMapped: false }),
    );
    linePreview.visible = false;
    linePreview.renderOrder = 40;
    scene.add(linePreview);
    const trackingGuideGeometry = new THREE.BufferGeometry();
    const trackingGuide = new THREE.Line(
      trackingGuideGeometry,
      new THREE.LineDashedMaterial({ color: 0x69d89a, dashSize: 5, gapSize: 4, depthTest: false, transparent: true, opacity: 0.72, toneMapped: false }),
    );
    trackingGuide.visible = false;
    trackingGuide.renderOrder = 39;
    scene.add(trackingGuide);
    const snapMarker = new THREE.Mesh(
      new THREE.RingGeometry(2.5, 3.6, 16),
      new THREE.MeshBasicMaterial({ color: 0x69d89a, depthTest: false, side: THREE.DoubleSide, toneMapped: false }),
    );
    snapMarker.visible = false;
    snapMarker.position.z = 0.9;
    snapMarker.renderOrder = 41;
    scene.add(snapMarker);

    type CameraTransition = {
      duration: number;
      fromPosition: THREE.Vector3;
      fromQuaternion: THREE.Quaternion;
      fromTarget: THREE.Vector3;
      startedAt: number;
      toPosition: THREE.Vector3;
      toQuaternion: THREE.Quaternion;
      toTarget: THREE.Vector3;
    };
    let cameraTransition: CameraTransition | null = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const fitView = (requestedTarget = viewTargetRef.current, animate = false) => {
      const objects = documentRef.current.objects.filter((object) =>
        findLayer(documentRef.current, object.layerId)?.visible,
      );
      const lines = documentRef.current.lines.filter((line) =>
        findLayer(documentRef.current, line.layerId)?.visible,
      );
      const polylines = documentRef.current.polylines.filter((polyline) =>
        findLayer(documentRef.current, polyline.layerId)?.visible,
      );
      const circles = documentRef.current.circles.filter((circle) =>
        findLayer(documentRef.current, circle.layerId)?.visible,
      );
      const arcs = documentRef.current.arcs.filter((arc) => findLayer(documentRef.current, arc.layerId)?.visible);
      const roomPlatforms = documentRef.current.rooms
        .map((room) => roomHorizontalPlatformSolution(documentRef.current, room))
        .filter((solution): solution is RoomHorizontalPlatformSolution => solution !== null);
      const bounds = objects.map(boxWorldBounds);
      const lineXs = lines.flatMap((line) => [line.start.x, line.end.x]);
      const lineYs = lines.flatMap((line) => [line.start.y, line.end.y]);
      const lineZs = lines.flatMap((line) => {
        const vertical = wallVerticalExtent(documentRef.current, line);
        const foundationVertical = foundationWallVerticalExtent(documentRef.current, line);
        return vertical
          ? [vertical.baseElevation, vertical.baseElevation, vertical.topElevation, vertical.topElevation]
          : foundationVertical
            ? [foundationVertical.footingBottomElevation, foundationVertical.sillTopElevation]
          : [line.start.z, line.end.z];
      });
      const polylineXs = polylines.flatMap((polyline) => polyline.vertices.map((point) => point.x));
      const polylineYs = polylines.flatMap((polyline) => polyline.vertices.map((point) => point.y));
      const circleXs = circles.flatMap((circle) => [circle.center.x - circle.radius, circle.center.x + circle.radius]);
      const circleYs = circles.flatMap((circle) => [circle.center.y - circle.radius, circle.center.y + circle.radius]);
      const arcXs = arcs.flatMap((arc) => [arc.center.x - arc.radius, arc.center.x + arc.radius]);
      const arcYs = arcs.flatMap((arc) => [arc.center.y - arc.radius, arc.center.y + arc.radius]);
      const roomXs = roomPlatforms.flatMap((solution) => [solution.boundary, solution.floorBoundary].flatMap((boundary) => boundary.vertices.map((point) => point.x)));
      const roomYs = roomPlatforms.flatMap((solution) => [solution.boundary, solution.floorBoundary].flatMap((boundary) => boundary.vertices.map((point) => point.y)));
      const roomZs = roomPlatforms.flatMap((solution) => [
        solution.roughFloorElevation - assemblyTotalThickness(solution.floorStructure),
        solution.finishedFloorElevation,
        solution.finishedCeilingElevation,
        solution.roughCeilingElevation,
      ]);
      const hasGeometry = Boolean(objects.length || lines.length || polylines.length || circles.length || arcs.length || roomPlatforms.length);
      const min = new THREE.Vector3(
        hasGeometry ? Math.min(...bounds.map((bound) => bound.minimum.x), ...lineXs, ...polylineXs, ...circleXs, ...arcXs, ...roomXs) : -48,
        hasGeometry ? Math.min(...bounds.map((bound) => bound.minimum.y), ...lineYs, ...polylineYs, ...circleYs, ...arcYs, ...roomYs) : -48,
        hasGeometry ? Math.min(...bounds.map((bound) => bound.minimum.z), ...lineZs, ...polylines.map((polyline) => polyline.elevation), ...circles.map((circle) => circle.center.z), ...arcs.map((arc) => arc.center.z), ...roomZs) : 0,
      );
      const max = new THREE.Vector3(
        hasGeometry ? Math.max(...bounds.map((bound) => bound.maximum.x), ...lineXs, ...polylineXs, ...circleXs, ...arcXs, ...roomXs) : 48,
        hasGeometry ? Math.max(...bounds.map((bound) => bound.maximum.y), ...lineYs, ...polylineYs, ...circleYs, ...arcYs, ...roomYs) : 48,
        hasGeometry ? Math.max(...bounds.map((bound) => bound.maximum.z), ...lineZs, ...polylines.map((polyline) => polyline.elevation), ...circles.map((circle) => circle.center.z), ...arcs.map((arc) => arc.center.z), ...roomZs) : 96,
      );
      const size = max.clone().sub(min);
      const maximum = Math.max(size.x, size.y, size.z, 1);
      const center = min.clone().add(max).multiplyScalar(0.5);
      const aspect = Math.max(mount.clientWidth / Math.max(mount.clientHeight, 1), 0.1);
      const viewDirection = new THREE.Vector3(...requestedTarget.direction).normalize();
      const previousCamera = camera;
      const previousPosition = camera.position.clone();
      const previousQuaternion = camera.quaternion.clone();
      const previousTarget = controls.target.clone();
      let targetPosition: THREE.Vector3;
      let targetControlsTarget: THREE.Vector3;
      const placeGrid = (rotation: [number, number, number], position: [number, number, number]) => {
        gridPlacementRef.current = { position, rotation };
        const grid = gridRef.current;
        if (!grid) return;
        grid.rotation.set(...rotation);
        grid.position.set(...position);
      };

      if (requestedTarget.projection === "perspective") {
        camera = perspectiveCamera;
        camera.aspect = aspect;
        camera.up.set(0, 0, 1);
        targetControlsTarget = new THREE.Vector3(center.x, center.y, min.z + size.z * 0.4);
        targetPosition = targetControlsTarget.clone().addScaledVector(viewDirection, maximum * 2.55);
        controls.enableRotate = true;
        controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
        placeGrid([Math.PI / 2, 0, 0], [center.x, center.y, min.z - 0.15]);
      } else {
        camera = orthographicCamera;
        const boundingRadius = Math.max(size.length() / 2, 12);
        const halfHeight = boundingRadius * 1.28 * Math.max(1, 1 / aspect);
        camera.left = -halfHeight * aspect;
        camera.right = halfHeight * aspect;
        camera.top = halfHeight;
        camera.bottom = -halfHeight;
        const distance = maximum * 3 + 240;
        targetControlsTarget = center.clone();
        targetPosition = center.clone().addScaledVector(viewDirection, distance);
        if (Math.abs(viewDirection.z) > 0.95) {
          camera.up.set(0, 1, 0);
        } else {
          camera.up.set(0, 0, 1);
        }
        if (requestedTarget.id === "top" || requestedTarget.id === "bottom") {
          placeGrid([Math.PI / 2, 0, 0], [center.x, center.y, min.z - 0.15]);
        } else if (requestedTarget.id === "front" || requestedTarget.id === "back") {
          placeGrid([0, 0, 0], [center.x, requestedTarget.id === "front" ? min.y - 0.15 : max.y + 0.15, center.z]);
        } else if (requestedTarget.id === "right" || requestedTarget.id === "left") {
          placeGrid([0, 0, -Math.PI / 2], [requestedTarget.id === "right" ? max.x + 0.15 : min.x - 0.15, center.y, center.z]);
        } else {
          placeGrid([Math.PI / 2, 0, 0], [center.x, center.y, min.z - 0.15]);
        }
        controls.enableRotate = false;
        controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
      }
      controls.object = camera;
      camera.position.copy(targetPosition);
      controls.target.copy(targetControlsTarget);
      camera.lookAt(targetControlsTarget);
      const targetQuaternion = camera.quaternion.clone();
      camera.updateProjectionMatrix();
      cameraTransition = null;

      if (animate && !reducedMotion.matches) {
        let fromPosition = previousPosition;
        if (previousCamera !== camera) {
          const previousDirection = previousPosition.clone().sub(previousTarget);
          if (previousDirection.lengthSq() < 0.000001) previousDirection.copy(viewDirection);
          fromPosition = previousTarget.clone().addScaledVector(
            previousDirection.normalize(),
            targetPosition.distanceTo(targetControlsTarget),
          );
        }
        camera.position.copy(fromPosition);
        camera.quaternion.copy(previousQuaternion);
        controls.target.copy(previousTarget);
        controls.enabled = false;
        cameraTransition = {
          duration: 440,
          fromPosition,
          fromQuaternion: previousQuaternion,
          fromTarget: previousTarget,
          startedAt: performance.now(),
          toPosition: targetPosition,
          toQuaternion: targetQuaternion,
          toTarget: targetControlsTarget,
        };
      } else {
        controls.enabled = true;
        controls.update();
      }
    };
    fitViewRef.current = () => fitView();
    applyViewRef.current = (target) => fitView(target, true);
    fitView(viewTargetRef.current);
    const worldUp = new THREE.Vector3(0, 0, 1);
    cubeOrbitRef.current = {
      start: () => {
        cameraTransition = null;
        if (!(camera instanceof THREE.PerspectiveCamera)) {
          const currentDirection = camera.position.clone().sub(controls.target).normalize();
          if (Math.abs(currentDirection.dot(worldUp)) > 0.995) {
            currentDirection.y = currentDirection.z > 0 ? -0.06 : 0.06;
            currentDirection.normalize();
          }
          fitView({
            direction: [currentDirection.x, currentDirection.y, currentDirection.z],
            id: "orbit",
            label: "Perspective",
            projection: "perspective",
          });
        }
        controls.enabled = false;
      },
      move: (deltaX, deltaY) => {
        const offset = camera.position.clone().sub(controls.target);
        offset.applyAxisAngle(worldUp, -deltaX * 0.009);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
        const pitchedOffset = offset.clone().applyAxisAngle(right, -deltaY * 0.009);
        if (Math.abs(pitchedOffset.clone().normalize().dot(worldUp)) < 0.992) {
          offset.copy(pitchedOffset);
        }
        camera.position.copy(controls.target).add(offset);
        camera.up.copy(worldUp);
        camera.lookAt(controls.target);
        camera.updateMatrixWorld();
      },
      end: () => {
        controls.enabled = true;
        controls.update();
        const direction = camera.position.clone().sub(controls.target).normalize();
        skipNextViewApplyRef.current = true;
        onViewChangeRef.current({
          direction: [direction.x, direction.y, direction.z],
          id: "orbit",
          label: "Perspective",
          projection: "perspective",
        });
      },
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const setPointer = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
    };

    type ActiveDrag = {
      active: boolean;
      axis: THREE.Vector3;
      axisKey: AxisKey;
      before: ModelDocument;
      faceIndex: number | null;
      grip: BoxGripDefinition | null;
      kind: "arc-grip" | "circle-grip" | "copy" | "face" | "grip" | "line-grip" | "object" | "plan-move" | "polyline-grip" | "rotate" | "scale";
      lastValid: ModelDocument;
      lineGrip?: "start" | "midpoint" | "end";
      circleGrip?: CircleGrip;
      arcGrip?: ArcGrip;
      polylineGrip?: RectangleGrip;
      polylineVertex?: number;
      objectId: string;
      plane: THREE.Plane;
      pointerId: number;
      rotationBase?: THREE.Vector3;
      scaleBase?: THREE.Vector3;
      scaleStartDistance?: number;
      sign: 1 | -1;
      startAngle?: number;
      startClientX: number;
      startClientY: number;
      startPoint: THREE.Vector3;
    };
    type ActiveSelectionDrag = {
      active: boolean;
      additive: boolean;
      current: ScreenPoint;
      pointerId: number;
      purpose: "selection" | "stretch";
      start: ScreenPoint;
    };
    let drag: ActiveDrag | null = null;
    let selectionDrag: ActiveSelectionDrag | null = null;
    let hoveredGripHandle: THREE.Mesh | null = null;

    const projectPoint = (point: LinePoint): ScreenPoint => {
      const bounds = renderer.domElement.getBoundingClientRect();
      const projected = new THREE.Vector3(point.x, point.y, point.z).project(camera);
      return {
        x: (projected.x + 1) * bounds.width / 2,
        y: (1 - projected.y) * bounds.height / 2,
      };
    };

    const pathSelectionGeometry = (
      ref: CadEntityRef,
      worldPoints: LinePoint[],
      closed = false,
      explicitSegments?: Array<[LinePoint, LinePoint]>,
    ): ScreenSelectionGeometry => {
      const points = worldPoints.map(projectPoint);
      const segments = explicitSegments
        ? explicitSegments.map(([start, end]) => ({ start: projectPoint(start), end: projectPoint(end) }))
        : points.slice(1).map((end, index) => ({ start: points[index], end }));
      if (closed && points.length > 2) segments.push({ start: points.at(-1)!, end: points[0] });
      return { points, ref, segments };
    };

    const screenSelectionGeometries = (): ScreenSelectionGeometry[] => {
      const current = documentRef.current;
      const visible = (layerId: string) => Boolean(findLayer(current, layerId)?.visible);
      const geometries: ScreenSelectionGeometry[] = [];
      current.lines.filter((line) => visible(line.layerId)).forEach((line) => {
        geometries.push(pathSelectionGeometry({ id: line.id, kind: "line" }, [line.start, line.end]));
      });
      current.polylines.filter((polyline) => visible(polyline.layerId)).forEach((polyline) => {
        geometries.push(pathSelectionGeometry(
          { id: polyline.id, kind: "polyline" },
          polylinePathPoints(polyline).map((point) => ({ ...point, z: polyline.elevation })),
          false,
        ));
      });
      current.circles.filter((circle) => visible(circle.layerId)).forEach((circle) => {
        const points = Array.from({ length: 49 }, (_, index) => {
          const angle = index / 48 * Math.PI * 2;
          return {
            x: circle.center.x + Math.cos(angle) * circle.radius,
            y: circle.center.y + Math.sin(angle) * circle.radius,
            z: circle.center.z,
          };
        });
        geometries.push(pathSelectionGeometry({ id: circle.id, kind: "circle" }, points));
      });
      current.arcs.filter((arc) => visible(arc.layerId)).forEach((arc) => {
        const points = Array.from({ length: 49 }, (_, index) => arcPointAtFraction(arc, index / 48));
        geometries.push(pathSelectionGeometry({ id: arc.id, kind: "arc" }, points));
      });
      current.objects.filter((object) => visible(object.layerId)).forEach((object) => {
        const corners = [
          boxWorldPoint(object, 0, 0, 0), boxWorldPoint(object, 1, 0, 0),
          boxWorldPoint(object, 1, 1, 0), boxWorldPoint(object, 0, 1, 0),
          boxWorldPoint(object, 0, 0, 1), boxWorldPoint(object, 1, 0, 1),
          boxWorldPoint(object, 1, 1, 1), boxWorldPoint(object, 0, 1, 1),
        ];
        const edgeIndexes = [
          [0, 1], [1, 2], [2, 3], [3, 0],
          [4, 5], [5, 6], [6, 7], [7, 4],
          [0, 4], [1, 5], [2, 6], [3, 7],
        ] as const;
        geometries.push(pathSelectionGeometry(
          { id: object.id, kind: "box" },
          corners,
          false,
          edgeIndexes.map(([start, end]) => [corners[start], corners[end]]),
        ));
      });
      return geometries;
    };

    const screenStretchGeometries = (): ScreenStretchGeometry[] => {
      const current = documentRef.current;
      return screenSelectionGeometries().map((geometry) => {
        if (geometry.ref.kind === "line") {
          const line = findLineObject(current, geometry.ref.id);
          return {
            ...geometry,
            handles: line ? [
              { component: 0, point: projectPoint(line.start) },
              { component: 1, point: projectPoint(line.end) },
            ] : [],
          };
        }
        if (geometry.ref.kind === "polyline") {
          const polyline = findPolylineObject(current, geometry.ref.id);
          return {
            ...geometry,
            handles: polyline ? polyline.vertices.map((point, component) => ({
              component,
              point: projectPoint({ ...point, z: polyline.elevation }),
            })) : [],
          };
        }
        return { ...geometry, handles: [] };
      });
    };

    type EntityHitCandidate = {
      distance: number;
      faceIndex: number | null;
      point: THREE.Vector3 | null;
      ref: CadEntityRef;
    };

    const entityDisplayName = (ref: CadEntityRef): string => {
      const current = documentRef.current;
      if (ref.kind === "box") return findBoxObject(current, ref.id)?.name ?? "Box";
      if (ref.kind === "line") return findLineObject(current, ref.id)?.name ?? "Line";
      if (ref.kind === "polyline") return findPolylineObject(current, ref.id)?.name ?? "Polyline";
      if (ref.kind === "circle") return findCircleObject(current, ref.id)?.name ?? "Circle";
      return findArcObject(current, ref.id)?.name ?? "Arc";
    };

    const entityHitCandidates = (): EntityHitCandidate[] => {
      const current = documentRef.current;
      const candidates = new Map<string, EntityHitCandidate>();
      const visible = (ref: CadEntityRef) => {
        const layerId = ref.kind === "box" ? findBoxObject(current, ref.id)?.layerId
          : ref.kind === "line" ? findLineObject(current, ref.id)?.layerId
          : ref.kind === "polyline" ? findPolylineObject(current, ref.id)?.layerId
          : ref.kind === "circle" ? findCircleObject(current, ref.id)?.layerId
          : findArcObject(current, ref.id)?.layerId;
        return Boolean(layerId && findLayer(current, layerId)?.visible);
      };
      const register = (candidate: EntityHitCandidate) => {
        if (!visible(candidate.ref)) return;
        const key = cadEntityKey(candidate.ref);
        const existing = candidates.get(key);
        if (!existing || candidate.distance < existing.distance) candidates.set(key, candidate);
      };
      raycaster.intersectObjects([...lineViews.values()].map((view) => view.line), false).forEach((hit) => {
        const id = hit.object.userData.lineId;
        if (typeof id === "string") register({ distance: hit.distance, faceIndex: null, point: hit.point, ref: { id, kind: "line" } });
      });
      raycaster.intersectObjects([...wallViewsRef.current.values()].flatMap((view) => view.meshes), false).forEach((hit) => {
        const id = hit.object.userData.lineId;
        if (typeof id === "string") register({ distance: hit.distance, faceIndex: null, point: hit.point, ref: { id, kind: "line" } });
      });
      raycaster.intersectObjects([...polylineViews.values()].flatMap((view) => view.fill ? [view.line, view.fill] : [view.line]), false).forEach((hit) => {
        const id = hit.object.userData.polylineId;
        if (typeof id === "string") register({ distance: hit.distance, faceIndex: null, point: hit.point, ref: { id, kind: "polyline" } });
      });
      raycaster.intersectObjects([...floorPlatformViewsRef.current.values()].flatMap((view) => view.meshes), false).forEach((hit) => {
        const id = hit.object.userData.polylineId;
        if (typeof id === "string") register({ distance: hit.distance, faceIndex: null, point: hit.point, ref: { id, kind: "polyline" } });
      });
      raycaster.intersectObjects([...circleViews.values()].map((view) => view.line), false).forEach((hit) => {
        const id = hit.object.userData.circleId;
        if (typeof id === "string") register({ distance: hit.distance, faceIndex: null, point: hit.point, ref: { id, kind: "circle" } });
      });
      raycaster.intersectObjects([...arcViews.values()].map((view) => view.line), false).forEach((hit) => {
        const id = hit.object.userData.arcId;
        if (typeof id === "string") register({ distance: hit.distance, faceIndex: null, point: hit.point, ref: { id, kind: "arc" } });
      });
      raycaster.intersectObjects([...objectViews.values()].map((view) => view.mesh), false).forEach((hit) => {
        const id = hit.object.userData.objectId;
        if (typeof id === "string") register({ distance: hit.distance, faceIndex: hit.face?.materialIndex ?? null, point: hit.point, ref: { id, kind: "box" } });
      });
      const priority: Record<CadEntityRef["kind"], number> = { arc: 0, circle: 0, line: 0, polyline: 0, box: 1 };
      return [...candidates.values()].sort((a, b) => priority[a.ref.kind] - priority[b.ref.kind] || a.distance - b.distance || cadEntityKey(a.ref).localeCompare(cadEntityKey(b.ref)));
    };

    let selectionCycleState: SelectionCycleState | null = null;
    let selectionCycleCandidates: EntityHitCandidate[] = [];
    let lastDrawingPointerEvent: PointerEvent | null = null;

    const selectHitCandidate = (candidate: EntityHitCandidate, additive: boolean, includeFace = true) => {
      const { ref } = candidate;
      if (ref.kind === "line") callbacksRef.current.onLineSelect(ref.id, additive);
      else if (ref.kind === "polyline") callbacksRef.current.onPolylineSelect(ref.id, additive);
      else if (ref.kind === "circle") callbacksRef.current.onCircleSelect(ref.id, additive);
      else if (ref.kind === "arc") callbacksRef.current.onArcSelect(ref.id, additive);
      else {
        const object = findBoxObject(documentRef.current, ref.id);
        const layer = findLayer(documentRef.current, object?.layerId ?? null);
        callbacksRef.current.onFaceSelect(
          ref.id,
          includeFace && !layer?.locked && !object?.locked && !breakModeRef.current && !chamferModeRef.current && !copyModeRef.current && !extendModeRef.current && !filletModeRef.current && !mirrorModeRef.current && !offsetModeRef.current && !rotateModeRef.current && !scaleModeRef.current && !stretchModeRef.current && !trimModeRef.current
            ? candidate.faceIndex
            : null,
          additive,
        );
      }
    };

    const showSelectionCycle = (candidates: EntityHitCandidate[], index: number, point: ScreenPoint) => {
      const candidate = candidates[index];
      if (!candidate || candidates.length < 2) {
        setSelectionCycle(null);
        return;
      }
      const bounds = renderer.domElement.getBoundingClientRect();
      setSelectionCycle({
        count: candidates.length,
        index,
        label: entityDisplayName(candidate.ref),
        x: Math.min(point.x + 14, Math.max(bounds.width - 180, 8)),
        y: Math.min(point.y + 14, Math.max(bounds.height - 62, 8)),
      });
    };

    const setHoveredGrip = (nextHandle: THREE.Mesh | null) => {
      if (hoveredGripHandle === nextHandle) return;
      if (hoveredGripHandle) {
        const previousGrip = hoveredGripHandle.userData.boxGrip as BoxGripDefinition | undefined;
        (hoveredGripHandle.material as THREE.MeshBasicMaterial).color.setHex(
          previousGrip ? GRIP_COLORS[previousGrip.kind] : 0x71d49a,
        );
      }
      hoveredGripHandle = nextHandle;
      if (hoveredGripHandle) {
        (hoveredGripHandle.material as THREE.MeshBasicMaterial).color.setHex(0xffc65c);
      }
      renderer.domElement.style.cursor = hoveredGripHandle ? "crosshair" : "default";
    };

    const createDragPlane = (axis: THREE.Vector3, point: THREE.Vector3) => {
      const viewDirection = camera.getWorldDirection(new THREE.Vector3());
      const planeNormal = viewDirection
        .clone()
        .sub(axis.clone().multiplyScalar(viewDirection.dot(axis)));
      if (planeNormal.lengthSq() < 0.000001) {
        planeNormal.copy(axis.z ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1));
      }
      planeNormal.normalize();
      return new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, point);
    };

    const planPointFromPointer = (elevation = 0): LinePoint | null => {
      const hit = raycaster.ray.intersectPlane(
        new THREE.Plane(new THREE.Vector3(0, 0, 1), -elevation),
        new THREE.Vector3(),
      );
      return hit ? { x: hit.x, y: hit.y, z: elevation } : null;
    };

    const snapCadPoint = (
      point: LinePoint,
      excludedLineId: string | null = null,
      anchor: LinePoint | null = null,
      useTracking = false,
      consumeOverride = false,
    ) => {
      const effectiveObjectSnapModes = objectSnapOverrideRef.current
        ? [objectSnapOverrideRef.current]
        : objectSnapModesRef.current;
      const candidates: CadSnapCandidate[] = [];
      const segments: LineGeometry[] = [];
      const circulars: CircularSnapGeometry[] = [];
      documentRef.current.lines.forEach((line) => {
        if (line.id === excludedLineId || !findLayer(documentRef.current, line.layerId)?.visible) return;
        candidates.push(
          { kind: "endpoint", point: line.start },
          { kind: "midpoint", point: lineMidpoint(line) },
          { kind: "endpoint", point: line.end },
        );
        segments.push({ start: line.start, end: line.end });
      });
      documentRef.current.polylines.forEach((polyline) => {
        if (polyline.id === excludedLineId || !findLayer(documentRef.current, polyline.layerId)?.visible) return;
        candidates.push(...polyline.vertices.map((vertex) => ({ kind: "endpoint" as const, point: { ...vertex, z: polyline.elevation } })));
        const centroid = polylineCentroid(polyline);
        if (centroid) candidates.push({ kind: "geometric-center", point: { ...centroid, z: polyline.elevation } });
        polylineSegments(polyline).forEach((segment) => {
          const sampled = polylineSegmentPoints(segment);
          const midpoint = sampled[Math.floor(sampled.length / 2)];
          candidates.push({ kind: "midpoint", point: { ...midpoint, z: polyline.elevation } });
          sampled.slice(1).forEach((end, index) => segments.push({
            start: { ...sampled[index], z: polyline.elevation },
            end: { ...end, z: polyline.elevation },
          }));
        });
      });
      documentRef.current.circles.forEach((circle) => {
        if (circle.id === excludedLineId || !findLayer(documentRef.current, circle.layerId)?.visible) return;
        const curve: CircularSnapGeometry = { center: circle.center, radius: circle.radius };
        circulars.push(curve);
        candidates.push(
          { kind: "center", point: circle.center },
          ...circularQuadrantPoints(curve).map((point) => ({ kind: "quadrant" as const, point })),
        );
      });
      documentRef.current.arcs.forEach((arc) => {
        if (arc.id === excludedLineId || !findLayer(documentRef.current, arc.layerId)?.visible) return;
        const grips = arcGripPoints(arc);
        const curve: CircularSnapGeometry = { center: arc.center, counterclockwise: arc.counterclockwise, endAngle: arc.endAngle, radius: arc.radius, startAngle: arc.startAngle };
        circulars.push(curve);
        candidates.push(
          { kind: "center", point: arc.center },
          { kind: "endpoint", point: grips.find(({ grip }) => grip === "start")!.point },
          { kind: "midpoint", point: grips.find(({ grip }) => grip === "midpoint")!.point },
          { kind: "endpoint", point: grips.find(({ grip }) => grip === "end")!.point },
          ...circularQuadrantPoints(curve).map((point) => ({ kind: "quadrant" as const, point })),
        );
      });
      documentRef.current.objects.forEach((object) => {
        if (!findLayer(documentRef.current, object.layerId)?.visible) return;
        const corners = [
          boxWorldPoint(object, 0, 0, 0),
          boxWorldPoint(object, 1, 0, 0),
          boxWorldPoint(object, 1, 1, 0),
          boxWorldPoint(object, 0, 1, 0),
        ];
        candidates.push(...corners.map((corner) => ({ kind: "corner" as const, point: corner })));
        candidates.push({ kind: "geometric-center", point: boxWorldPoint(object, 0.5, 0.5, 0) });
        corners.forEach((corner, index) => {
          const end = corners[(index + 1) % corners.length];
          candidates.push({ kind: "midpoint", point: lineMidpoint({ start: corner, end }) });
          segments.push({ start: corner, end });
        });
      });
      const nearbySegments = segments.filter((segment) => {
        const minimumX = Math.min(segment.start.x, segment.end.x) - 6;
        const maximumX = Math.max(segment.start.x, segment.end.x) + 6;
        const minimumY = Math.min(segment.start.y, segment.end.y) - 6;
        const maximumY = Math.max(segment.start.y, segment.end.y) + 6;
        if (point.x >= minimumX && point.x <= maximumX && point.y >= minimumY && point.y <= maximumY) return true;
        if (anchor && effectiveObjectSnapModes.includes("parallel")) return true;
        if (!effectiveObjectSnapModes.includes("extension")) return false;
        const dx = segment.end.x - segment.start.x;
        const dy = segment.end.y - segment.start.y;
        const length = Math.hypot(dx, dy);
        return length >= 1 / 16 && Math.abs((point.x - segment.start.x) * dy - (point.y - segment.start.y) * dx) / length <= 6;
      });
      candidates.push(...derivedSnapCandidates({ anchor, circulars, modes: effectiveObjectSnapModes, pointer: point, segments: nearbySegments }));
      const previousCyclePointer = objectSnapCyclePointerRef.current;
      if (!previousCyclePointer || planarDistance(previousCyclePointer, point) > 2) objectSnapCycleIndexRef.current = 0;
      objectSnapCyclePointerRef.current = point;
      const acquired = acquireCadPoint({
        anchor,
        candidates,
        gridIncrement: snapIncrementRef.current,
        objectSnapCycleIndex: objectSnapCycleIndexRef.current,
        objectSnapEnabled: objectSnapEnabledRef.current || Boolean(objectSnapOverrideRef.current),
        objectSnapModes: effectiveObjectSnapModes,
        orthoEnabled: useTracking && orthoEnabledRef.current,
        pointer: point,
        polarAngles: lineSnapAnglesRef.current,
        polarEnabled: useTracking && polarEnabledRef.current,
        trackingCandidates: trackingCandidatesFromAcquiredPoints({
          acquiredPoints: acquiredTrackingPointsRef.current,
          angles: lineSnapAnglesRef.current,
          gridIncrement: snapIncrementRef.current,
          pointer: point,
        }),
      });
      objectSnapCycleCountRef.current = acquired.candidateCount;
      const objectSnapped = !["grid", "ortho", "polar", "tracking"].includes(acquired.snapKind);
      if (objectSnapped) {
        const hoverKey = `${acquired.snapKind}:${acquired.point.x}:${acquired.point.y}:${acquired.point.z}`;
        const now = performance.now();
        if (objectSnapHoverRef.current?.key === hoverKey) {
          if (now - objectSnapHoverRef.current.since >= 400 && !acquiredTrackingPointsRef.current.some((candidate) => planarDistance(candidate, acquired.point) < 1 / 16)) {
            acquiredTrackingPointsRef.current = [...acquiredTrackingPointsRef.current.slice(-3), acquired.point];
          }
        } else {
          objectSnapHoverRef.current = { key: hoverKey, since: now };
          if (objectSnapAcquisitionTimerRef.current !== null) window.clearTimeout(objectSnapAcquisitionTimerRef.current);
          objectSnapAcquisitionTimerRef.current = window.setTimeout(() => {
            if (objectSnapHoverRef.current?.key !== hoverKey) return;
            if (!acquiredTrackingPointsRef.current.some((candidate) => planarDistance(candidate, acquired.point) < 1 / 16)) {
              acquiredTrackingPointsRef.current = [...acquiredTrackingPointsRef.current.slice(-3), acquired.point];
            }
          }, 400);
        }
      } else {
        objectSnapHoverRef.current = null;
        if (objectSnapAcquisitionTimerRef.current !== null) window.clearTimeout(objectSnapAcquisitionTimerRef.current);
        objectSnapAcquisitionTimerRef.current = null;
      }
      if (consumeOverride) {
        acquiredTrackingPointsRef.current = [];
        objectSnapHoverRef.current = null;
        objectSnapCycleIndexRef.current = 0;
        objectSnapCycleCountRef.current = 0;
        if (objectSnapAcquisitionTimerRef.current !== null) window.clearTimeout(objectSnapAcquisitionTimerRef.current);
        objectSnapAcquisitionTimerRef.current = null;
        if (objectSnapOverrideRef.current) callbacksRef.current.onObjectSnapOverrideConsumed();
      }
      return {
        candidateCount: acquired.candidateCount,
        guideOrigin: acquired.guideOrigin,
        point: acquired.point,
        polarAngle: acquired.guideAngle,
        snapKind: acquired.snapKind,
        snapped: objectSnapped,
      };
    };

    const pickCircleTangentConstraint = (point: LinePoint): PickedCircleTangentConstraint | null => {
      const choices: Array<PickedCircleTangentConstraint & { distance: number }> = [];
      const addLineChoice = (key: string, start: LinePoint, end: LinePoint) => {
        if (Math.abs(start.z - end.z) >= 1 / 16 || Math.abs(start.z - point.z) >= 1 / 16) return;
        const pick = nearestPointOnSegment(point, { start, end });
        choices.push({ key, constraint: { end, kind: "line", pick, start }, distance: planarDistance(point, pick) });
      };
      const addCircleChoice = (key: string, curve: CircularSnapGeometry) => {
        if (Math.abs(curve.center.z - point.z) >= 1 / 16) return;
        const pick = nearestPointOnCircularCurve(point, curve);
        choices.push({
          key,
          constraint: { center: curve.center, counterclockwise: curve.counterclockwise, endAngle: curve.endAngle, kind: "circle", pick, radius: curve.radius, startAngle: curve.startAngle },
          distance: planarDistance(point, pick),
        });
      };
      documentRef.current.lines.forEach((line) => {
        if (findLayer(documentRef.current, line.layerId)?.visible) addLineChoice(`line:${line.id}`, line.start, line.end);
      });
      documentRef.current.polylines.forEach((polyline) => {
        if (!findLayer(documentRef.current, polyline.layerId)?.visible) return;
        polylineSegments(polyline).forEach((segment, index) => {
          const circular = polylineSegmentCircularGeometry(segment);
          if (circular) addCircleChoice(`polyline:${polyline.id}:${index}`, { ...circular, center: { ...circular.center, z: polyline.elevation } });
          else addLineChoice(`polyline:${polyline.id}:${index}`, { ...segment.start, z: polyline.elevation }, { ...segment.end, z: polyline.elevation });
        });
      });
      documentRef.current.circles.forEach((circle) => {
        if (findLayer(documentRef.current, circle.layerId)?.visible) addCircleChoice(`circle:${circle.id}`, { center: circle.center, radius: circle.radius });
      });
      documentRef.current.arcs.forEach((arc) => {
        if (findLayer(documentRef.current, arc.layerId)?.visible) addCircleChoice(`arc:${arc.id}`, { center: arc.center, counterclockwise: arc.counterclockwise, endAngle: arc.endAngle, radius: arc.radius, startAngle: arc.startAngle });
      });
      documentRef.current.objects.forEach((object) => {
        if (!findLayer(documentRef.current, object.layerId)?.visible) return;
        const corners = [boxWorldPoint(object, 0, 0, 0), boxWorldPoint(object, 1, 0, 0), boxWorldPoint(object, 1, 1, 0), boxWorldPoint(object, 0, 1, 0)];
        corners.forEach((corner, index) => addLineChoice(`box:${object.id}:${index}`, corner, corners[(index + 1) % 4]));
      });
      return choices.filter((choice) => choice.distance <= 4).sort((a, b) => a.distance - b.distance)[0] ?? null;
    };

    const snapLineCandidate = (point: LinePoint, consumeOverride = false) => {
      return snapCadPoint(point, null, lineStartRef.current, true, consumeOverride);
    };

    const selectedModifyRefs = () => selectedEntityKeysRef.current
      .map(cadEntityRefFromKey)
      .filter((ref): ref is CadEntityRef => ref !== null);

    const selectedOffsetRef = () => {
      const refs = selectedModifyRefs();
      return refs.length === 1 && refs[0].kind !== "box" ? refs[0] : null;
    };

    const selectedLengthenRef = () => {
      const ref = selectedOffsetRef();
      if (!ref || (ref.kind !== "line" && ref.kind !== "arc" && ref.kind !== "polyline")) return null;
      if (ref.kind === "polyline" && findPolylineObject(documentRef.current, ref.id)?.closed) return null;
      return modelEntityIsEditable(documentRef.current, ref) ? ref : null;
    };

    const lengthenRequest = (point: LinePoint | null = null): LengthenRequest | null => {
      const method = lengthenMethodRef.current;
      if (method === "dynamic") return point ? { method, point } : null;
      return { method, value: lengthenValueRef.current };
    };

    const selectedOffsetElevation = (ref: CadEntityRef, sourceDocument = documentRef.current) => {
      if (ref.kind === "line") return findLineObject(sourceDocument, ref.id)?.start.z ?? activeElevationRef.current;
      if (ref.kind === "polyline") return findPolylineObject(sourceDocument, ref.id)?.elevation ?? activeElevationRef.current;
      if (ref.kind === "circle") return findCircleObject(sourceDocument, ref.id)?.center.z ?? activeElevationRef.current;
      if (ref.kind === "arc") return findArcObject(sourceDocument, ref.id)?.center.z ?? activeElevationRef.current;
      return activeElevationRef.current;
    };

    const previewTrimExtend = (before: ModelDocument, ref: CadEntityRef, point: LinePoint) => {
      if (trimModeRef.current) return trimModelEntity(before, ref, point);
      const result = extendModelEntity(before, ref, point);
      return result ? { document: result.document, refs: [result.ref] } : null;
    };

    const clearModifyPreview = () => {
      modifyBaseRef.current = null;
      modifyBeforeRef.current = null;
      linePreview.visible = false;
      trackingGuide.visible = false;
      snapMarker.visible = false;
      setDynamicLineInput(null);
      callbacksRef.current.onDragStatus(null);
    };

    const updateTrackingGuide = (start: LinePoint, point: LinePoint, snapKind: CadSnapKind, guideOrigin: LinePoint | null = null) => {
      if (snapKind !== "polar" && snapKind !== "ortho" && snapKind !== "tracking") {
        trackingGuide.visible = false;
        return;
      }
      const origin = snapKind === "tracking" && guideOrigin ? guideOrigin : start;
      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      const horizontalLength = Math.hypot(dx, dy);
      if (horizontalLength < 1 / 16) {
        trackingGuide.visible = false;
        return;
      }
      const extension = Math.max(horizontalLength + 96, 192);
      const end = {
        x: origin.x + dx / horizontalLength * extension,
        y: origin.y + dy / horizontalLength * extension,
        z: point.z,
      };
      trackingGuideGeometry.setFromPoints([
        new THREE.Vector3(origin.x, origin.y, origin.z + 0.55),
        new THREE.Vector3(end.x, end.y, end.z + 0.55),
      ]);
      trackingGuideGeometry.computeBoundingSphere();
      trackingGuide.computeLineDistances();
      trackingGuide.visible = true;
    };

    const selectAndPrepareDrag = (event: PointerEvent) => {
      if (event.button !== 0) return;
      setActiveGripInput(null);
      setGripDraft("");
      setGripInputError("");
      callbacksRef.current.onDragStatus(null);
      setPointer(event);
      if (boundaryModeRef.current) {
        const before = cloneDocument(documentRef.current);
        const point = planPointFromPointer(activeElevationRef.current);
        const result = point ? createBoundaryPolylineObject(before, point, activeElevationRef.current) : null;
        if (!result) {
          callbacksRef.current.onLineCommandFeedback({ message: "No closed visible area was found here at the active elevation. Check for gaps or a locked current layer.", tone: "error" });
          return;
        }
        linePreview.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onBoundaryCommit(before, result.document, result.polyline.id);
        callbacksRef.current.onBoundaryFinishRequested(false);
        callbacksRef.current.onLineCommandFeedback({ message: "Boundary created as one closed Polyline.", tone: "success" });
        return;
      }
      if (lengthenModeRef.current) {
        const ref = selectedLengthenRef();
        if (!ref) {
          callbacksRef.current.onLineCommandFeedback({ message: "Lengthen needs one editable Line, Arc, or open Polyline.", tone: "error" });
          return;
        }
        const before = lengthenBeforeRef.current ?? cloneDocument(documentRef.current);
        const activeEndpoint = lengthenEndpointRef.current;
        if (lengthenMethodRef.current === "dynamic" && activeEndpoint) {
          const rawPoint = planPointFromPointer(selectedOffsetElevation(ref, before));
          if (!rawPoint) return;
          const snapped = snapCadPoint(rawPoint, null, null, false);
          const request = lengthenRequest(snapped.point);
          const result = request ? lengthenModelEntity(before, ref, activeEndpoint, request) : null;
          if (!result) {
            callbacksRef.current.onLineCommandFeedback({ message: "That cursor position does not leave a valid curve. Choose another point.", tone: "error" });
            return;
          }
          lengthenBeforeRef.current = null;
          lengthenEndpointRef.current = null;
          snapMarker.visible = false;
          setDynamicLineInput(null);
          callbacksRef.current.onDragStatus(null);
          callbacksRef.current.onLengthenCommit(before, result.document, result.ref, activeEndpoint);
          callbacksRef.current.onLengthenFinishRequested(false);
          callbacksRef.current.onLineCommandFeedback({ message: "Dynamic Lengthen complete.", tone: "success" });
          return;
        }

        const candidate = entityHitCandidates().find(({ ref: candidateRef }) => candidateRef.kind === ref.kind && candidateRef.id === ref.id);
        const endpoints = modelEntityLengthenEndpoints(before, ref);
        if (!candidate?.point || !endpoints) {
          callbacksRef.current.onLineCommandFeedback({ message: "Pick near the endpoint of the selected curve.", tone: "error" });
          return;
        }
        const pick = { ...candidate.point, z: selectedOffsetElevation(ref, before) };
        const endpoint = closestLengthenEndpoint(endpoints.start, endpoints.end, pick);
        if (lengthenMethodRef.current === "dynamic") {
          lengthenBeforeRef.current = before;
          lengthenEndpointRef.current = endpoint;
          callbacksRef.current.onLineCommandFeedback({ message: `${endpoint === "start" ? "Start" : "End"} endpoint accepted. Move the cursor and click its new position.`, tone: "success" });
          return;
        }
        const request = lengthenRequest();
        const result = request ? lengthenModelEntity(before, ref, endpoint, request) : null;
        if (!result) {
          callbacksRef.current.onDragPreview(before);
          callbacksRef.current.onLineCommandFeedback({ message: "That Lengthen value would collapse or invalidate the curve. Change the method value and try again.", tone: "error" });
          return;
        }
        lengthenBeforeRef.current = null;
        lengthenEndpointRef.current = null;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onLengthenCommit(before, result.document, result.ref, endpoint);
        callbacksRef.current.onLengthenFinishRequested(false);
        callbacksRef.current.onLineCommandFeedback({ message: "Lengthen complete.", tone: "success" });
        return;
      }
      if (breakModeRef.current) {
        const mode = breakModeRef.current;
        const target = breakTargetRef.current;
        if (!target) {
          const candidate = entityHitCandidates().find(({ ref }) => {
            if (ref.kind === "box" || !modelEntityIsEditable(documentRef.current, ref)) return false;
            if (mode === "break-at-point" && ref.kind === "circle") return false;
            if (mode === "break-at-point" && ref.kind === "polyline") return !findPolylineObject(documentRef.current, ref.id)?.closed;
            return true;
          });
          if (!candidate || candidate.ref.kind === "box") {
            callbacksRef.current.onLineCommandFeedback({ message: mode === "break" ? "Select an editable Line, Polyline, Circle, or Arc." : "Break at Point needs an open Line, Polyline, or Arc.", tone: "error" });
            return;
          }
          breakBeforeRef.current = cloneDocument(documentRef.current);
          breakTargetRef.current = candidate.ref;
          breakFirstPointRef.current = null;
          if (candidate.ref.kind === "line") callbacksRef.current.onLineSelect(candidate.ref.id, false);
          else if (candidate.ref.kind === "polyline") callbacksRef.current.onPolylineSelect(candidate.ref.id, false);
          else if (candidate.ref.kind === "circle") callbacksRef.current.onCircleSelect(candidate.ref.id, false);
          else callbacksRef.current.onArcSelect(candidate.ref.id, false);
          callbacksRef.current.onBreakStageChange(1);
          callbacksRef.current.onLineCommandFeedback({ message: `${mode === "break" ? "Curve" : "Open curve"} accepted. Select the ${mode === "break" ? "first break point" : "break point"}.`, tone: "success" });
          return;
        }
        const candidate = entityHitCandidates().find(({ ref }) => ref.kind === target.kind && ref.id === target.id);
        if (!candidate?.point) {
          callbacksRef.current.onLineCommandFeedback({ message: "Pick a point directly on the selected curve.", tone: "error" });
          return;
        }
        const point = { ...candidate.point, z: selectedOffsetElevation(target, breakBeforeRef.current ?? documentRef.current) };
        if (mode === "break" && !breakFirstPointRef.current) {
          breakFirstPointRef.current = point;
          callbacksRef.current.onBreakStageChange(2);
          callbacksRef.current.onLineCommandFeedback({ message: "First break point accepted. Select the second break point; the portion between the points will be removed.", tone: "success" });
          return;
        }
        const before = breakBeforeRef.current ?? cloneDocument(documentRef.current);
        const result = breakModelEntity(before, target, breakFirstPointRef.current ?? point, mode === "break" ? point : null);
        if (!result) {
          callbacksRef.current.onDragPreview(before);
          callbacksRef.current.onLineCommandFeedback({ message: mode === "break" ? "Those points do not leave valid curve geometry. Choose different points." : "That point cannot split this curve. Pick an interior point.", tone: "error" });
          return;
        }
        breakBeforeRef.current = null;
        breakTargetRef.current = null;
        breakFirstPointRef.current = null;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onBreakCommit(before, result.document, result.refs, mode);
        callbacksRef.current.onBreakStageChange(0);
        callbacksRef.current.onBreakFinishRequested(false);
        callbacksRef.current.onLineCommandFeedback({ message: `${mode === "break" ? "Break" : "Break at Point"} complete.`, tone: "success" });
        return;
      }
      if (chamferModeRef.current) {
        const firstPick = chamferFirstPickRef.current;
        const candidate = entityHitCandidates().find(({ ref }) =>
          ref.kind === "line" && (!firstPick || ref.id !== firstPick.id) && modelEntityIsEditable(documentRef.current, ref));
        if (!candidate || candidate.ref.kind !== "line" || !candidate.point) {
          callbacksRef.current.onLineCommandFeedback({ message: `Chamfer needs ${firstPick ? "a different editable second Line" : "an editable first Line"}.`, tone: "error" });
          return;
        }
        const line = findLineObject(documentRef.current, candidate.ref.id);
        if (!line) return;
        const pick = { id: line.id, point: { x: candidate.point.x, y: candidate.point.y, z: line.start.z } };
        if (!firstPick) {
          chamferBeforeRef.current = cloneDocument(documentRef.current);
          chamferFirstPickRef.current = pick;
          callbacksRef.current.onLineSelect(line.id, false);
          callbacksRef.current.onChamferStageChange(1);
          callbacksRef.current.onLineCommandFeedback({ message: `First Line accepted. Select the second Line for a ${formatArchitectural(chamferFirstDistanceRef.current)} × ${formatArchitectural(chamferSecondDistanceRef.current)} Chamfer.`, tone: "success" });
          return;
        }
        const before = chamferBeforeRef.current ?? cloneDocument(documentRef.current);
        const result = chamferLineObjects(before, firstPick, pick, chamferFirstDistanceRef.current, chamferSecondDistanceRef.current);
        if (!result) {
          callbacksRef.current.onDragPreview(before);
          callbacksRef.current.onLineCommandFeedback({ message: "Those picks cannot produce this Chamfer. Try smaller distances or different retained sides.", tone: "error" });
          return;
        }
        chamferBeforeRef.current = null;
        chamferFirstPickRef.current = null;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onChamferCommit(before, result.document, result.refs);
        callbacksRef.current.onChamferStageChange(0);
        callbacksRef.current.onChamferFinishRequested(false);
        callbacksRef.current.onLineCommandFeedback({ message: `Chamfer complete at ${formatArchitectural(chamferFirstDistanceRef.current)} × ${formatArchitectural(chamferSecondDistanceRef.current)}.`, tone: "success" });
        return;
      }
      if (filletModeRef.current) {
        const firstPick = filletFirstPickRef.current;
        const candidate = entityHitCandidates().find(({ ref }) =>
          (ref.kind === "line" || ref.kind === "arc") && (!firstPick || ref.id !== firstPick.id || ref.kind !== firstPick.kind) && modelEntityIsEditable(documentRef.current, ref));
        if (!candidate || (candidate.ref.kind !== "line" && candidate.ref.kind !== "arc") || !candidate.point) {
          callbacksRef.current.onLineCommandFeedback({ message: `Fillet needs ${firstPick ? "a different editable second Line or Arc" : "an editable first Line or Arc"}.`, tone: "error" });
          return;
        }
        let pick: CurveFilletPick | null = null;
        if (candidate.ref.kind === "line") {
          const source = findLineObject(documentRef.current, candidate.ref.id);
          if (source) pick = { id: source.id, kind: "line", point: { x: candidate.point.x, y: candidate.point.y, z: source.start.z } };
        } else {
          const source = findArcObject(documentRef.current, candidate.ref.id);
          if (source) pick = { id: source.id, kind: "arc", point: { x: candidate.point.x, y: candidate.point.y, z: source.center.z } };
        }
        if (!pick) return;
        if (!firstPick) {
          filletBeforeRef.current = cloneDocument(documentRef.current);
          filletFirstPickRef.current = pick;
          if (pick.kind === "line") callbacksRef.current.onLineSelect(pick.id, false);
          else callbacksRef.current.onArcSelect(pick.id, false);
          callbacksRef.current.onFilletStageChange(1);
          callbacksRef.current.onLineCommandFeedback({ message: `First ${pick.kind === "line" ? "Line" : "Arc"} accepted. Select the second Line or Arc for a ${formatArchitectural(filletRadiusRef.current)} Fillet.`, tone: "success" });
          return;
        }
        const before = filletBeforeRef.current ?? cloneDocument(documentRef.current);
        const result = filletCurveObjects(before, firstPick, pick, filletRadiusRef.current);
        if (!result) {
          callbacksRef.current.onDragPreview(before);
          callbacksRef.current.onLineCommandFeedback({ message: "Those curve picks cannot produce this Fillet. Try a different radius or retained side.", tone: "error" });
          return;
        }
        filletBeforeRef.current = null;
        filletFirstPickRef.current = null;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onFilletCommit(before, result.document, result.refs);
        callbacksRef.current.onFilletStageChange(0);
        callbacksRef.current.onFilletFinishRequested(false);
        callbacksRef.current.onLineCommandFeedback({ message: `Fillet complete at ${formatArchitectural(filletRadiusRef.current)}.`, tone: "success" });
        return;
      }
      if (trimModeRef.current || extendModeRef.current) {
        const ref = selectedOffsetRef();
        const operation = trimModeRef.current ? "trim" : "extend";
        if (!ref) {
          callbacksRef.current.onLineCommandFeedback({ message: `${operation === "trim" ? "Trim" : "Extend"} needs one editable 2D entity.`, tone: "error" });
          return;
        }
        const before = trimExtendBeforeRef.current ?? cloneDocument(documentRef.current);
        trimExtendBeforeRef.current = before;
        const point = planPointFromPointer(selectedOffsetElevation(ref, before));
        if (!point) return;
        const result = previewTrimExtend(before, ref, point);
        if (!result) {
          callbacksRef.current.onLineCommandFeedback({ message: `No valid visible boundary was found for this ${operation}.`, tone: "error" });
          return;
        }
        trimExtendBeforeRef.current = null;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onTrimExtendCommit(before, result.document, result.refs, operation);
        callbacksRef.current.onTrimExtendFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: `${operation === "trim" ? "Trim" : "Extend"} complete.`, tone: "success" });
        return;
      }
      if (offsetModeRef.current) {
        const ref = selectedOffsetRef();
        if (!ref) {
          callbacksRef.current.onLineCommandFeedback({ message: "Offset needs one editable 2D entity.", tone: "error" });
          return;
        }
        const before = offsetBeforeRef.current ?? cloneDocument(documentRef.current);
        offsetBeforeRef.current = before;
        const rawPoint = planPointFromPointer(selectedOffsetElevation(ref));
        if (!rawPoint) return;
        const snapped = snapCadPoint(rawPoint, null, null, false, true);
        const result = offsetModelEntity(before, ref, offsetDistanceRef.current, snapped.point, offsetKeepSourceRef.current);
        if (!result) {
          callbacksRef.current.onLineCommandFeedback({ message: "That side cannot produce a valid offset at this distance.", tone: "error" });
          return;
        }
        offsetBeforeRef.current = null;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onOffsetCommit(before, result.document, result.ref, offsetKeepSourceRef.current);
        callbacksRef.current.onOffsetFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: `Offset complete at ${formatArchitectural(offsetDistanceRef.current)}.`, tone: "success" });
        return;
      }
      if (mirrorModeRef.current) {
        const axisStart = mirrorAxisStartRef.current;
        const rawPoint = planPointFromPointer(axisStart?.z ?? activeElevationRef.current);
        if (!rawPoint) return;
        const snapped = snapCadPoint(rawPoint, null, axisStart, Boolean(axisStart), true);
        snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
        snapMarker.visible = true;
        if (!axisStart) {
          mirrorAxisStartRef.current = snapped.point;
          mirrorBeforeRef.current = cloneDocument(documentRef.current);
          callbacksRef.current.onDragStatus({ distance: 0, kind: "mirror", snapped: snapped.snapped, valid: true });
          callbacksRef.current.onLineCommandFeedback({ message: "Mirror: specify the second point of the mirror axis.", tone: "success" });
          return;
        }
        const before = mirrorBeforeRef.current;
        const distance = planarDistance(axisStart, snapped.point);
        const result = before && distance >= 1 / 16
          ? mirrorModelEntities(before, selectedModifyRefs(), axisStart, snapped.point, mirrorKeepSourceRef.current)
          : null;
        if (!before || !result) {
          callbacksRef.current.onLineCommandFeedback({ message: distance < 1 / 16 ? "Choose a different second point for the mirror axis." : "That mirror would create unsupported geometry.", tone: "error" });
          return;
        }
        mirrorAxisStartRef.current = null;
        mirrorBeforeRef.current = null;
        linePreview.visible = false;
        trackingGuide.visible = false;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onMirrorCommit(before, result.document, result.refs, mirrorKeepSourceRef.current);
        callbacksRef.current.onMirrorFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: `Mirror complete — source entities ${mirrorKeepSourceRef.current ? "kept" : "replaced"}.`, tone: "success" });
        return;
      }
      if (arcModeRef.current) {
        const method = arcMethodRef.current;
        const continueSeed = arcContinueSeedRef.current;
        const existingPoints = arcPointsRef.current;
        const anchor = arcCursorAnchor(method, existingPoints, continueSeed);
        const rawPoint = planPointFromPointer(existingPoints[0]?.z ?? continueSeed?.start.z ?? activeElevationRef.current);
        if (!rawPoint) return;
        const snapped = snapCadPoint(rawPoint, null, anchor, Boolean(anchor), true);
        arcCursorRef.current = snapped.point;
        if (method !== "continue" && existingPoints.length < 2) {
          if (!anchor || Math.hypot(snapped.point.x - anchor.x, snapped.point.y - anchor.y) >= 1 / 16) {
            arcPointsRef.current = [...existingPoints, snapped.point];
            callbacksRef.current.onArcPointsChange(arcPointsRef.current);
          }
          callbacksRef.current.onDragStatus({ distance: anchor ? lineLength({ start: anchor, end: snapped.point }) : 0, kind: "arc", snapped: snapped.snapped, valid: true });
          callbacksRef.current.onLineCommandFeedback({ message: `Arc ${arcMethodDefinition(method).label}: specify the ${arcPointStage(method, arcPointsRef.current.length)}.`, tone: "success" });
          return;
        }
        const arc = arcGeometryFromMethodPointer(method, existingPoints, snapped.point, continueSeed);
        if (arc && callbacksRef.current.onArcCreate(arc)) {
          arcPointsRef.current = [];
          arcCursorRef.current = null;
          callbacksRef.current.onArcPointsChange([]);
          linePreview.visible = false;
          trackingGuide.visible = false;
          snapMarker.visible = false;
          setDynamicArcInput(null);
          callbacksRef.current.onDragStatus(null);
          callbacksRef.current.onArcFinishRequested();
          callbacksRef.current.onLineCommandFeedback({ message: `${arcMethodDefinition(method).label} Arc placed. Press Enter to repeat Arc.`, tone: "success" });
        } else {
          callbacksRef.current.onLineCommandFeedback({ message: `Those inputs cannot form a valid ${arcMethodDefinition(method).label} Arc.`, tone: "error" });
        }
        return;
      }
      if (circleModeRef.current) {
        const points = circlePointsRef.current;
        const method = circleMethodRef.current;
        const anchor = points.at(-1) ?? null;
        const rawPoint = planPointFromPointer(points[0]?.z ?? activeElevationRef.current);
        if (!rawPoint) return;
        if (method === "tangent-tangent-radius" || method === "tangent-tangent-tangent") {
          const pickedConstraints = circleTangentConstraintsRef.current;
          if (method === "tangent-tangent-radius" && pickedConstraints.length >= 2) {
            const radius = snapToSixteenth(planarDistance(pickedConstraints[1].constraint.pick, rawPoint));
            const circle = circleFromTwoTangenciesRadius(pickedConstraints[0].constraint, pickedConstraints[1].constraint, radius);
            if (circle && callbacksRef.current.onCircleCreate(circle)) {
              circleTangentConstraintsRef.current = [];
              circlePointsRef.current = [];
              callbacksRef.current.onCirclePointsChange([]);
              linePreview.visible = false;
              snapMarker.visible = false;
              setDynamicCircleInput(null);
              callbacksRef.current.onDragStatus(null);
              callbacksRef.current.onCircleFinishRequested();
              callbacksRef.current.onLineCommandFeedback({ message: `Tangent, Tangent, Radius Circle placed at ${formatArchitectural(circle.radius)} radius.`, tone: "success" });
            } else {
              callbacksRef.current.onLineCommandFeedback({ message: "That radius cannot create a Circle tangent to both selected objects.", tone: "error" });
            }
            return;
          }
          const picked = pickCircleTangentConstraint(rawPoint);
          if (!picked) {
            callbacksRef.current.onLineCommandFeedback({ message: "Select a visible Line, Polyline segment, Circle, Arc, or box edge near the cursor.", tone: "error" });
            return;
          }
          if (pickedConstraints.some((candidate) => candidate.key === picked.key)) {
            callbacksRef.current.onLineCommandFeedback({ message: "Select a different tangent object or segment.", tone: "error" });
            return;
          }
          const nextConstraints = [...pickedConstraints, picked];
          circleTangentConstraintsRef.current = nextConstraints;
          circlePointsRef.current = nextConstraints.map(({ constraint }) => constraint.pick);
          callbacksRef.current.onCirclePointsChange(circlePointsRef.current);
          snapMarker.position.set(picked.constraint.pick.x, picked.constraint.pick.y, picked.constraint.pick.z + 0.9);
          snapMarker.visible = true;
          if (method === "tangent-tangent-tangent" && nextConstraints.length === 3) {
            const circle = circleFromThreeTangencies(nextConstraints[0].constraint, nextConstraints[1].constraint, nextConstraints[2].constraint);
            if (circle && callbacksRef.current.onCircleCreate(circle)) {
              circleTangentConstraintsRef.current = [];
              circlePointsRef.current = [];
              callbacksRef.current.onCirclePointsChange([]);
              snapMarker.visible = false;
              callbacksRef.current.onDragStatus(null);
              callbacksRef.current.onCircleFinishRequested();
              callbacksRef.current.onLineCommandFeedback({ message: "Tangent, Tangent, Tangent Circle placed. Press Enter to repeat Circle.", tone: "success" });
            } else {
              circleTangentConstraintsRef.current = nextConstraints.slice(0, 2);
              circlePointsRef.current = circleTangentConstraintsRef.current.map(({ constraint }) => constraint.pick);
              callbacksRef.current.onCirclePointsChange(circlePointsRef.current);
              callbacksRef.current.onLineCommandFeedback({ message: "Those three selections cannot form a valid tangent Circle. Select a different third object.", tone: "error" });
            }
          } else {
            callbacksRef.current.onLineCommandFeedback({ message: `${circleMethodDefinition(method).label}: ${nextConstraints.length} tangent object${nextConstraints.length === 1 ? "" : "s"} selected. Specify the ${circlePointStage(method, nextConstraints.length)}.`, tone: "success" });
          }
          return;
        }
        const snapped = snapCadPoint(rawPoint, null, anchor, Boolean(anchor), true);
        circleCursorRef.current = snapped.point;
        if (!circlePointCompletes(method, points.length)) {
          if (!anchor || planarDistance(anchor, snapped.point) >= 1 / 16) {
            circlePointsRef.current = [...points, snapped.point];
            callbacksRef.current.onCirclePointsChange(circlePointsRef.current);
          }
          snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
          snapMarker.visible = true;
          callbacksRef.current.onDragStatus({ distance: anchor ? planarDistance(anchor, snapped.point) : 0, kind: "circle", snapped: snapped.snapped, valid: true });
          callbacksRef.current.onLineCommandFeedback({ message: `${circleMethodDefinition(method).label} Circle: specify the ${circlePointStage(method, circlePointsRef.current.length)}.`, tone: "success" });
          return;
        }
        const circle = circleGeometryFromPointer(method, points, snapped.point);
        if (circle && callbacksRef.current.onCircleCreate(circle)) {
          circlePointsRef.current = [];
          circleCursorRef.current = null;
          callbacksRef.current.onCirclePointsChange([]);
          linePreview.visible = false;
          trackingGuide.visible = false;
          snapMarker.visible = false;
          setDynamicCircleInput(null);
          callbacksRef.current.onDragStatus(null);
          callbacksRef.current.onCircleFinishRequested();
          callbacksRef.current.onLineCommandFeedback({ message: `${circleMethodDefinition(method).label} Circle placed. Press Enter to repeat Circle.`, tone: "success" });
        } else {
          callbacksRef.current.onLineCommandFeedback({ message: `Those points cannot form a valid ${circleMethodDefinition(method).label} Circle.`, tone: "error" });
        }
        return;
      }
      if (rectangleModeRef.current) {
        const rawPoint = planPointFromPointer(rectangleStartRef.current?.z ?? activeElevationRef.current);
        if (!rawPoint) return;
        const snapped = snapCadPoint(rawPoint, null, rectangleStartRef.current, Boolean(rectangleStartRef.current), true);
        rectangleCursorRef.current = snapped.point;
        rectangleEscapeArmedRef.current = false;
        if (!rectangleStartRef.current) {
          rectangleStartRef.current = snapped.point;
          callbacksRef.current.onRectangleAnchorChange(snapped.point);
          snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
          snapMarker.visible = true;
          callbacksRef.current.onDragStatus({ distance: 0, kind: "rectangle", snapped: snapped.snapped, valid: true });
          return;
        }
        const rectangle = rectangleFromDraftSettings(rectangleStartRef.current, snapped.point, rectangleDraftSettingsRef.current);
        if (rectangle && callbacksRef.current.onPolylineCreate(rectangle, "rectangle")) {
          rectangleStartRef.current = null;
          rectangleCursorRef.current = null;
          callbacksRef.current.onRectangleAnchorChange(null);
          linePreview.visible = false;
          trackingGuide.visible = false;
          setDynamicRectangleInput(null);
          callbacksRef.current.onDragStatus(null);
          callbacksRef.current.onRectangleFinishRequested();
          callbacksRef.current.onLineCommandFeedback({ message: "Rectangle placed. Press Enter to repeat Rectangle.", tone: "success" });
        }
        return;
      }
      if (polylineModeRef.current) {
        const rawPoint = planPointFromPointer(polylinePointsRef.current.length ? polylineElevationRef.current : activeElevationRef.current);
        if (!rawPoint) return;
        const points = polylinePointsRef.current;
        const previous = points.at(-1);
        const anchor = previous ? { ...previous, z: polylineElevationRef.current } : null;
        const snapped = snapCadPoint(rawPoint, null, anchor, Boolean(anchor), true);
        polylineCursorRef.current = snapped.point;
        polylineEscapeArmedRef.current = false;
        if (!previous) {
          polylineElevationRef.current = snapped.point.z;
          polylinePointsRef.current = [snapped.point];
          polylineBulgesRef.current = [];
          callbacksRef.current.onPolylineAnchorChange(snapped.point);
        } else if (polylineSegmentModeRef.current === "arc" && !polylineArcThroughRef.current) {
          polylineArcThroughRef.current = snapped.point;
          callbacksRef.current.onLineCommandFeedback({ message: "Arc through-point accepted. Specify the Arc endpoint.", tone: "success" });
        } else if (Math.hypot(previous.x - snapped.point.x, previous.y - snapped.point.y) >= 1 / 16) {
          const bulge = polylineSegmentModeRef.current === "arc" && polylineArcThroughRef.current
            ? polylineBulgeFromThreePoints(previous, polylineArcThroughRef.current, snapped.point)
            : 0;
          if (bulge === null) {
            callbacksRef.current.onLineCommandFeedback({ message: "Those three points cannot form a valid Polyline Arc segment.", tone: "error" });
            return;
          }
          polylinePointsRef.current = [...points, snapped.point];
          polylineBulgesRef.current = [...polylineBulgesRef.current, bulge];
          polylineArcThroughRef.current = null;
          callbacksRef.current.onPolylineAnchorChange(snapped.point);
        }
        linePreview.visible = false;
        trackingGuide.visible = false;
        setDynamicPolylineInput(null);
        callbacksRef.current.onDragStatus({ angle: previous ? lineAngle({ start: anchor!, end: snapped.point }) : 0, distance: previous ? lineLength({ start: anchor!, end: snapped.point }) : 0, kind: "polyline", polarAngle: snapped.polarAngle, snapped: snapped.snapped, valid: true });
        return;
      }
      if (lineModeRef.current) {
        const rawPoint = planPointFromPointer(lineStartRef.current?.z ?? activeElevationRef.current);
        if (!rawPoint) return;
        const snapped = snapLineCandidate(rawPoint, true);
        if (!lineStartRef.current) {
          lineStartRef.current = snapped.point;
          lineCursorRef.current = snapped.point;
          linePointHistoryRef.current = [snapped.point];
          lineEscapeArmedRef.current = false;
          callbacksRef.current.onLineAnchorChange(snapped.point);
          snapMarker.position.set(lineStartRef.current.x, lineStartRef.current.y, lineStartRef.current.z + 0.9);
          snapMarker.visible = true;
          callbacksRef.current.onDragStatus({ distance: 0, kind: "line", snapped: snapped.snapped, valid: true });
          return;
        }
        const completedStart = lineStartRef.current;
        if (callbacksRef.current.onLineCreate(completedStart, snapped.point)) {
          lineStartRef.current = snapped.point;
          lineCursorRef.current = snapped.point;
          linePointHistoryRef.current = [...linePointHistoryRef.current, snapped.point];
          lineEscapeArmedRef.current = false;
          callbacksRef.current.onLineAnchorChange(snapped.point);
          linePreview.visible = false;
          trackingGuide.visible = false;
          setDynamicLineInput(null);
          callbacksRef.current.onDragStatus({
            angle: lineAngle({ start: completedStart, end: snapped.point }),
            distance: lineLength({ start: completedStart, end: snapped.point }),
            kind: "line",
            polarAngle: snapped.polarAngle,
            snapped: snapped.snapped,
            valid: true,
          });
        }
        return;
      }
      if (moveModeRef.current || copyModeRef.current || (stretchModeRef.current && stretchTargetsRef.current.length > 0)) {
        const refs = selectedModifyRefs();
        const source = modifyBeforeRef.current ?? documentRef.current;
        const stretchTargets = stretchTargetsRef.current;
        if (!refs.length || refs.some((ref) => !modelEntityIsEditable(source, ref))) {
          callbacksRef.current.onLineCommandFeedback({
            message: stretchModeRef.current
              ? "Stretch needs editable geometry selected by a crossing window."
              : "Select unlocked entities on unlocked layers before using Move or Copy.",
            tone: "error",
          });
          if (stretchModeRef.current) callbacksRef.current.onStretchFinishRequested(true);
          else callbacksRef.current.onModifyFinishRequested(true);
          clearModifyPreview();
          return;
        }
        const rawPoint = planPointFromPointer(modifyBaseRef.current?.z ?? activeElevationRef.current);
        if (!rawPoint) return;
        const snapped = snapCadPoint(rawPoint, null, modifyBaseRef.current, Boolean(modifyBaseRef.current), true);
        if (!modifyBaseRef.current) {
          modifyBaseRef.current = snapped.point;
          modifyBeforeRef.current = cloneDocument(documentRef.current);
          snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
          snapMarker.visible = true;
          callbacksRef.current.onLineCommandFeedback({
            message: `${stretchModeRef.current ? "Stretch" : copyModeRef.current ? "Copy" : "Move"}: base point accepted. Specify the target point.`,
            tone: "success",
          });
          return;
        }
        const before = modifyBeforeRef.current;
        const base = modifyBaseRef.current;
        if (!before) return;
        const delta = {
          x: snapped.point.x - base.x,
          y: snapped.point.y - base.y,
          z: snapped.point.z - base.z,
        };
        const copied = copyModeRef.current ? copyModelEntities(before, refs, delta) : null;
        const next = stretchModeRef.current
          ? stretchModelEntities(before, stretchTargets, delta)
          : copyModeRef.current ? copied?.document ?? null : moveModelEntities(before, refs, delta);
        if (!next) {
          callbacksRef.current.onLineCommandFeedback({
            message: "Choose a different target point; the offset must be nonzero and stay inside the drawing range.",
            tone: "error",
          });
          return;
        }
        if (stretchModeRef.current) {
          callbacksRef.current.onStretchCommit(before, next, stretchTargets);
          callbacksRef.current.onStretchFinishRequested(false);
        } else {
          callbacksRef.current.onModifyCommit(before, next, copied?.refs ?? null);
          callbacksRef.current.onModifyFinishRequested(false);
        }
        clearModifyPreview();
        return;
      }
      if (stretchModeRef.current) {
        const bounds = renderer.domElement.getBoundingClientRect();
        const start = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
        selectionDrag = {
          active: false,
          additive: false,
          current: start,
          pointerId: event.pointerId,
          purpose: "stretch",
          start,
        };
        controls.enabled = false;
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      const activeObjectId = selectedObjectIdRef.current;
      const activeArcId = selectedArcIdRef.current;
      const activeLineId = selectedLineIdRef.current;
      const activeCircleId = selectedCircleIdRef.current;
      const activePolylineId = selectedPolylineIdRef.current;
      const arcGripHit = arcGripSet.group.visible ? raycaster.intersectObjects(arcGripSet.handles, false)[0] : undefined;
      const arcGrip = arcGripHit?.object.userData.arcGrip as ArcGrip | undefined;
      if (arcGripHit && arcGrip && activeArcId) {
        const source = findArcObject(documentRef.current, activeArcId);
        if (!source || !arcIsEditable(documentRef.current, source)) return;
        const startPoint = planPointFromPointer(source.center.z);
        if (!startPoint) return;
        const before = cloneDocument(documentRef.current);
        drag = { active: false, arcGrip, axis: axisVector("x"), axisKey: "x", before, faceIndex: null, grip: null, kind: "arc-grip", lastValid: before, objectId: activeArcId, plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), -source.center.z), pointerId: event.pointerId, sign: 1, startClientX: event.clientX, startClientY: event.clientY, startPoint: new THREE.Vector3(startPoint.x, startPoint.y, source.center.z) };
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      const circleGripHit = circleGripSet.group.visible
        ? raycaster.intersectObjects(circleGripSet.handles, false)[0]
        : undefined;
      const circleGrip = circleGripHit?.object.userData.circleGrip as CircleGrip | undefined;
      if (circleGripHit && circleGrip && activeCircleId) {
        const source = findCircleObject(documentRef.current, activeCircleId);
        if (!source || !circleIsEditable(documentRef.current, source)) return;
        const startPoint = planPointFromPointer(source.center.z);
        if (!startPoint) return;
        const before = cloneDocument(documentRef.current);
        drag = { active: false, axis: axisVector("x"), axisKey: "x", before, circleGrip, faceIndex: null, grip: null, kind: "circle-grip", lastValid: before, objectId: activeCircleId, plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), -source.center.z), pointerId: event.pointerId, sign: 1, startClientX: event.clientX, startClientY: event.clientY, startPoint: new THREE.Vector3(startPoint.x, startPoint.y, source.center.z) };
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      const polylineGripHit = polylineGripSet.group.visible
        ? raycaster.intersectObjects(polylineGripSet.handles, false)[0]
        : undefined;
      const polylineVertex = polylineGripHit?.object.userData.polylineVertex as number | undefined;
      const rectangleGrip = polylineGripHit?.object.userData.rectangleGrip as RectangleGrip | undefined;
      if (polylineGripHit && (polylineVertex !== undefined || rectangleGrip) && activePolylineId) {
        const source = findPolylineObject(documentRef.current, activePolylineId);
        if (!source || !polylineIsEditable(documentRef.current, source)) return;
        const startPoint = planPointFromPointer(source.elevation);
        if (!startPoint) return;
        const before = cloneDocument(documentRef.current);
        drag = { active: false, axis: axisVector("x"), axisKey: "x", before, faceIndex: null, grip: null, kind: "polyline-grip", lastValid: before, objectId: activePolylineId, plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), -source.elevation), pointerId: event.pointerId, polylineGrip: rectangleGrip, polylineVertex, sign: 1, startClientX: event.clientX, startClientY: event.clientY, startPoint: new THREE.Vector3(startPoint.x, startPoint.y, source.elevation) };
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      const lineGripHit = lineGripSet.group.visible
        ? raycaster.intersectObjects(lineGripSet.handles, false)[0]
        : undefined;
      const lineGrip = lineGripHit?.object.userData.lineGrip as "start" | "midpoint" | "end" | undefined;
      if (lineGripHit && lineGrip && activeLineId) {
        const source = findLineObject(documentRef.current, activeLineId);
        if (!source || !lineIsEditable(documentRef.current, source)) return;
        const gripElevation = lineGrip === "start" ? source.start.z : lineGrip === "end" ? source.end.z : lineMidpoint(source).z;
        const startPoint = planPointFromPointer(gripElevation);
        if (!startPoint) return;
        const before = cloneDocument(documentRef.current);
        drag = {
          active: false,
          axis: axisVector("x"),
          axisKey: "x",
          before,
          faceIndex: null,
          grip: null,
          kind: "line-grip",
          lastValid: before,
          lineGrip,
          objectId: activeLineId,
          plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), -gripElevation),
          pointerId: event.pointerId,
          sign: 1,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startPoint: new THREE.Vector3(startPoint.x, startPoint.y, gripElevation),
        };
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      const rotationHit = rotationGizmo.group.visible
        ? raycaster.intersectObject(rotationGizmo.ring, false)[0]
        : undefined;
      if (rotationHit) {
        const refs = selectedModifyRefs();
        if (!refs.length || refs.some((ref) => !modelEntityIsEditable(documentRef.current, ref))) return;
        const baseRecord = modelSelectionRotationBase(documentRef.current, refs, rotationBaseKeyRef.current);
        if (!baseRecord) return;
        const rotationBase = new THREE.Vector3(baseRecord.x, baseRecord.y, baseRecord.z);
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), rotationBase);
        const startPoint = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
        if (!startPoint || startPoint.distanceToSquared(rotationBase) < 0.001) return;
        const before = cloneDocument(documentRef.current);
        drag = {
          active: false,
          axis: axisVector("z"),
          axisKey: "z",
          before,
          faceIndex: null,
          grip: null,
          kind: "rotate",
          lastValid: before,
          objectId: refs.at(-1)!.id,
          plane,
          pointerId: event.pointerId,
          rotationBase,
          sign: 1,
          startAngle: Math.atan2(startPoint.y - rotationBase.y, startPoint.x - rotationBase.x),
          startClientX: event.clientX,
          startClientY: event.clientY,
          startPoint,
        };
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      const scaleHit = scaleGizmo.group.visible
        ? raycaster.intersectObject(scaleGizmo.handle, false)[0]
        : undefined;
      if (scaleHit) {
        const refs = selectedModifyRefs();
        if (!refs.length || refs.some((ref) => !modelEntityIsEditable(documentRef.current, ref))) return;
        const baseRecord = modelSelectionScaleBase(documentRef.current, refs, scaleBaseKeyRef.current);
        if (!baseRecord) return;
        const scaleBase = new THREE.Vector3(baseRecord.x, baseRecord.y, baseRecord.z);
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), scaleBase);
        const startPoint = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
        const scaleStartDistance = startPoint?.distanceTo(scaleBase) ?? 0;
        if (!startPoint || scaleStartDistance < 0.001) return;
        const before = cloneDocument(documentRef.current);
        drag = {
          active: false,
          axis: axisVector("x"),
          axisKey: "x",
          before,
          faceIndex: null,
          grip: null,
          kind: "scale",
          lastValid: before,
          objectId: refs.at(-1)!.id,
          plane,
          pointerId: event.pointerId,
          scaleBase,
          scaleStartDistance,
          sign: 1,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startPoint,
        };
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      const gripHit = boxGripSet.group.visible
        ? raycaster.intersectObjects(boxGripSet.handles, false)[0]
        : undefined;
      const boxGrip = gripHit?.object.userData.boxGrip as BoxGripDefinition | undefined;
      const objectMoveGrip = Boolean(gripHit?.object.userData.objectMoveGrip);
      if (gripHit && objectMoveGrip && activeObjectId) {
        const source = findBoxObject(documentRef.current, activeObjectId);
        if (!source || !objectIsEditable(documentRef.current, source)) return;
        const centerRecord = boxWorldPoint(source, 0.5, 0.5, 0.5);
        const center = new THREE.Vector3(centerRecord.x, centerRecord.y, centerRecord.z);
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 0, 1),
          center,
        );
        const startPoint = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
        if (!startPoint) return;
        const before = cloneDocument(documentRef.current);
        drag = {
          active: false,
          axis: axisVector("x"),
          axisKey: "x",
          before,
          faceIndex: null,
          grip: null,
          kind: "plan-move",
          lastValid: before,
          objectId: activeObjectId,
          plane,
          pointerId: event.pointerId,
          sign: 1,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startPoint,
        };
        callbacksRef.current.onFaceSelect(activeObjectId, null, false);
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      if (gripHit && boxGrip && activeObjectId) {
        const source = findBoxObject(documentRef.current, activeObjectId);
        if (!source || !objectIsEditable(documentRef.current, source)) return;
        const primaryAxis = boxGrip.axes[0];
        const localAxis = boxLocalAxis(source, primaryAxis);
        const axis = new THREE.Vector3(localAxis.x, localAxis.y, localAxis.z);
        const plane = boxGrip.axes.length === 1
          ? createDragPlane(axis, gripHit.point)
          : new THREE.Plane().setFromNormalAndCoplanarPoint(
              camera.getWorldDirection(new THREE.Vector3()),
              gripHit.point,
            );
        const startPoint = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
        if (!startPoint) return;
        const before = cloneDocument(documentRef.current);
        drag = {
          active: false,
          axis,
          axisKey: primaryAxis,
          before,
          faceIndex: faceIndexForBoxGrip(boxGrip),
          grip: boxGrip,
          kind: "grip",
          lastValid: before,
          objectId: activeObjectId,
          plane,
          pointerId: event.pointerId,
          sign: boxGrip.signs[primaryAxis] || 1,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startPoint,
        };
        callbacksRef.current.onFaceSelect(activeObjectId, faceIndexForBoxGrip(boxGrip), false);
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      const gizmoHit = moveGizmo.group.visible
        ? raycaster.intersectObjects(moveGizmo.handles, false)[0]
        : undefined;
      const moveAxis = gizmoHit?.object.userData.moveAxis as AxisKey | undefined;
      if (gizmoHit && moveAxis && activeObjectId) {
        const source = findBoxObject(documentRef.current, activeObjectId);
        if (!source || !objectIsEditable(documentRef.current, source)) return;
        const axis = axisVector(moveAxis);
        const plane = createDragPlane(axis, gizmoHit.point);
        const startPoint = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
        if (!startPoint) return;
        const before = cloneDocument(documentRef.current);
        drag = {
          active: false,
          axis,
          axisKey: moveAxis,
          before,
          faceIndex: null,
          grip: null,
          kind: copyModeRef.current ? "copy" : "object",
          lastValid: before,
          objectId: activeObjectId,
          plane,
          pointerId: event.pointerId,
          sign: 1,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startPoint,
        };
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      const candidates = entityHitCandidates();
      const bounds = renderer.domElement.getBoundingClientRect();
      const clickPoint = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      const candidateKeys = candidates.map((candidate) => cadEntityKey(candidate.ref));
      selectionCycleState = advanceSelectionCycle(selectionCycleState, candidateKeys, clickPoint, performance.now());
      selectionCycleCandidates = candidates;
      const chosenCandidate = candidates[selectionCycleState.index];
      setHoveredEntityKey(null);
      showSelectionCycle(candidates, selectionCycleState.index, clickPoint);
      if (!chosenCandidate) {
        setSelectionCycle(null);
        selectionCycleState = null;
        selectionCycleCandidates = [];
        const start = clickPoint;
        selectionDrag = {
          active: false,
          additive: event.shiftKey,
          current: start,
          pointerId: event.pointerId,
          purpose: "selection",
          start,
        };
        controls.enabled = false;
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      selectHitCandidate(chosenCandidate, event.shiftKey);
      if (chosenCandidate.ref.kind !== "box") return;
      const objectId = chosenCandidate.ref.id;
      const faceIndex = chosenCandidate.faceIndex ?? undefined;
      const hitPoint = chosenCandidate.point;
      const hitObject = findBoxObject(documentRef.current, objectId);
      const hitLayer = findLayer(documentRef.current, hitObject?.layerId ?? null);
      const layerLocked = Boolean(hitLayer?.locked);
      const objectLocked = Boolean(hitObject?.locked);
      if (layerLocked || objectLocked) return;
      if (event.shiftKey) return;
      if (copyModeRef.current) return;
      if (moveModeRef.current) return;
      if (mirrorModeRef.current) return;
      if (breakModeRef.current || chamferModeRef.current || filletModeRef.current || lengthenModeRef.current || offsetModeRef.current || stretchModeRef.current || trimModeRef.current || extendModeRef.current) return;
      if (rotateModeRef.current) return;
      if (scaleModeRef.current) return;
      if (faceIndex === undefined || !hitPoint) return;

      const face = FACE_DEFINITIONS[faceIndex];
      const localAxis = hitObject ? boxLocalAxis(hitObject, face.axis) : { x: 0, y: 0, z: 0 };
      const axis = new THREE.Vector3(localAxis.x, localAxis.y, localAxis.z);
      const plane = createDragPlane(axis, hitPoint);
      const startPoint = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
      if (!startPoint) return;

      const before = cloneDocument(documentRef.current);
      if (!findBoxObject(before, objectId)) return;
      drag = {
        active: false,
        axis,
        axisKey: face.axis,
        before,
        faceIndex,
        grip: null,
        kind: "face",
        lastValid: before,
        objectId,
        plane,
        pointerId: event.pointerId,
        sign: face.sign,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPoint,
      };
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const moveDrag = (event: PointerEvent) => {
      lastDrawingPointerEvent = event;
      if (selectionDrag && event.pointerId === selectionDrag.pointerId) {
        const bounds = renderer.domElement.getBoundingClientRect();
        selectionDrag.current = {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        };
        selectionDrag.active = selectionDrag.active || Math.hypot(
          selectionDrag.current.x - selectionDrag.start.x,
          selectionDrag.current.y - selectionDrag.start.y,
        ) >= 4;
        if (selectionDrag.active) {
          setSelectionBox({
            end: selectionDrag.current,
            mode: selectionDrag.current.x >= selectionDrag.start.x ? "window" : "crossing",
            start: selectionDrag.start,
          });
        }
        return;
      }
      if (!drag) {
        setPointer(event);
        if (arcModeRef.current || boundaryModeRef.current || breakModeRef.current || chamferModeRef.current || circleModeRef.current || extendModeRef.current || filletModeRef.current || lengthenModeRef.current || lineModeRef.current || mirrorModeRef.current || offsetModeRef.current || polylineModeRef.current || rectangleModeRef.current || trimModeRef.current) {
          setHoveredEntityKey(null);
        }
        if (boundaryModeRef.current) {
          const point = planPointFromPointer(activeElevationRef.current);
          if (!point) return;
          const boundary = discoverDocumentBoundary(documentRef.current, point, activeElevationRef.current);
          const bounds = mount.getBoundingClientRect();
          renderer.domElement.style.cursor = "crosshair";
          snapMarker.visible = false;
          trackingGuide.visible = false;
          if (boundary) {
            updateViewportPolyline(
              { geometry: linePreviewGeometry, material: linePreview.material as THREE.LineBasicMaterial, line: linePreview },
              boundary.geometry,
              0.8,
            );
            linePreview.computeLineDistances();
            linePreview.visible = true;
          } else {
            linePreview.visible = false;
          }
          setDynamicLineInput({ angle: 0, distance: boundary?.area ?? 0, elevation: point.z, label: boundary ? "BOUNDARY · CLICK INSIDE" : "BOUNDARY · NO CLOSED AREA", x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          callbacksRef.current.onDragStatus({ distance: boundary?.area ?? 0, kind: "boundary", valid: Boolean(boundary) });
          return;
        }
        if (lengthenModeRef.current) {
          const ref = selectedLengthenRef();
          if (!ref) return;
          const before = lengthenBeforeRef.current ?? cloneDocument(documentRef.current);
          lengthenBeforeRef.current = before;
          const bounds = mount.getBoundingClientRect();
          renderer.domElement.style.cursor = "crosshair";
          snapMarker.visible = false;
          const activeEndpoint = lengthenEndpointRef.current;
          let endpoint: LengthenEndpoint | null = activeEndpoint;
          let result: ReturnType<typeof lengthenModelEntity> = null;
          if (lengthenMethodRef.current === "dynamic" && activeEndpoint) {
            const rawPoint = planPointFromPointer(selectedOffsetElevation(ref, before));
            if (rawPoint) {
              const snapped = snapCadPoint(rawPoint, null, null, false);
              snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
              snapMarker.visible = snapped.snapped;
              const request = lengthenRequest(snapped.point);
              result = request ? lengthenModelEntity(before, ref, activeEndpoint, request) : null;
            }
          } else {
            const candidate = entityHitCandidates().find(({ ref: candidateRef }) => candidateRef.kind === ref.kind && candidateRef.id === ref.id);
            const endpoints = modelEntityLengthenEndpoints(before, ref);
            if (candidate?.point && endpoints) {
              endpoint = closestLengthenEndpoint(endpoints.start, endpoints.end, { ...candidate.point, z: selectedOffsetElevation(ref, before) });
              const request = lengthenRequest();
              result = request ? lengthenModelEntity(before, ref, endpoint, request) : null;
            }
          }
          callbacksRef.current.onDragPreview(result?.document ?? before);
          const methodLabel = lengthenMethodRef.current.toUpperCase();
          const label = lengthenMethodRef.current === "dynamic" && !activeEndpoint
            ? "LENGTHEN · PICK ENDPOINT"
            : result
              ? `${methodLabel} · ${endpoint === "start" ? "START" : "END"} · CLICK TO ACCEPT`
              : `${methodLabel} · INVALID RESULT`;
          setDynamicLineInput({ angle: 0, distance: lengthenValueRef.current, elevation: selectedOffsetElevation(ref, before), label, x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          callbacksRef.current.onDragStatus({ distance: lengthenValueRef.current, kind: "lengthen", valid: lengthenMethodRef.current === "dynamic" && !activeEndpoint ? true : Boolean(result) });
          return;
        }
        if (breakModeRef.current) {
          const mode = breakModeRef.current;
          const target = breakTargetRef.current;
          const firstPoint = breakFirstPointRef.current;
          const before = breakBeforeRef.current;
          const bounds = mount.getBoundingClientRect();
          renderer.domElement.style.cursor = "crosshair";
          snapMarker.visible = false;
          if (!target || !before) {
            setDynamicLineInput({ angle: 0, distance: 0, elevation: activeElevationRef.current, label: `${mode === "break" ? "BREAK" : "BREAK AT POINT"} · SELECT CURVE`, x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
            callbacksRef.current.onDragStatus({ distance: 0, kind: "break", valid: true });
            return;
          }
          const candidate = entityHitCandidates().find(({ ref }) => ref.kind === target.kind && ref.id === target.id);
          const point = candidate?.point ? { ...candidate.point, z: selectedOffsetElevation(target, before) } : null;
          const result = point && (mode === "break-at-point" || firstPoint)
            ? breakModelEntity(before, target, firstPoint ?? point, mode === "break" ? point : null)
            : null;
          callbacksRef.current.onDragPreview(result?.document ?? before);
          const label = !point
            ? `${mode === "break" ? "BREAK" : "BREAK AT POINT"} · PICK ON CURVE`
            : mode === "break" && !firstPoint
              ? "BREAK · CLICK FIRST POINT"
              : result
                ? `${mode === "break" ? "BREAK" : "BREAK AT POINT"} · CLICK TO COMPLETE`
                : `${mode === "break" ? "BREAK" : "BREAK AT POINT"} · INVALID POINT`;
          setDynamicLineInput({ angle: 0, distance: 0, elevation: point?.z ?? selectedOffsetElevation(target, before), label, x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          callbacksRef.current.onDragStatus({ distance: 0, kind: "break", valid: Boolean(point && (mode === "break" && !firstPoint ? true : result)) });
          return;
        }
        if (chamferModeRef.current) {
          const firstPick = chamferFirstPickRef.current;
          const before = chamferBeforeRef.current;
          const bounds = mount.getBoundingClientRect();
          renderer.domElement.style.cursor = "crosshair";
          snapMarker.visible = false;
          if (!firstPick || !before) {
            setDynamicLineInput({ angle: chamferSecondDistanceRef.current, distance: chamferFirstDistanceRef.current, elevation: activeElevationRef.current, label: "CHAMFER · SELECT FIRST LINE", x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
            callbacksRef.current.onDragStatus({ distance: chamferFirstDistanceRef.current, kind: "chamfer", valid: true });
            return;
          }
          const candidate = entityHitCandidates().find(({ ref }) =>
            ref.kind === "line" && ref.id !== firstPick.id && modelEntityIsEditable(before, ref));
          const line = candidate?.ref.kind === "line" ? findLineObject(before, candidate.ref.id) : null;
          const secondPick = candidate?.point && line
            ? { id: line.id, point: { x: candidate.point.x, y: candidate.point.y, z: line.start.z } }
            : null;
          const result = secondPick ? chamferLineObjects(before, firstPick, secondPick, chamferFirstDistanceRef.current, chamferSecondDistanceRef.current) : null;
          callbacksRef.current.onDragPreview(result?.document ?? before);
          setDynamicLineInput({ angle: chamferSecondDistanceRef.current, distance: chamferFirstDistanceRef.current, elevation: firstPick.point.z, label: result ? "CHAMFER · CLICK SECOND LINE" : "CHAMFER · SELECT VALID SECOND LINE", x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          callbacksRef.current.onDragStatus({ distance: chamferFirstDistanceRef.current, kind: "chamfer", valid: Boolean(result) });
          return;
        }
        if (filletModeRef.current) {
          const firstPick = filletFirstPickRef.current;
          const before = filletBeforeRef.current;
          const bounds = mount.getBoundingClientRect();
          renderer.domElement.style.cursor = "crosshair";
          snapMarker.visible = false;
          if (!firstPick || !before) {
            setDynamicLineInput({ angle: 0, distance: filletRadiusRef.current, elevation: activeElevationRef.current, label: "FILLET · SELECT FIRST CURVE", x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
            callbacksRef.current.onDragStatus({ distance: filletRadiusRef.current, kind: "fillet", valid: true });
            return;
          }
          const candidate = entityHitCandidates().find(({ ref }) =>
            (ref.kind === "line" || ref.kind === "arc") && (ref.id !== firstPick.id || ref.kind !== firstPick.kind) && modelEntityIsEditable(before, ref));
          let secondPick: CurveFilletPick | null = null;
          if (candidate?.point && candidate.ref.kind === "line") {
            const source = findLineObject(before, candidate.ref.id);
            if (source) secondPick = { id: source.id, kind: "line", point: { x: candidate.point.x, y: candidate.point.y, z: source.start.z } };
          } else if (candidate?.point && candidate.ref.kind === "arc") {
            const source = findArcObject(before, candidate.ref.id);
            if (source) secondPick = { id: source.id, kind: "arc", point: { x: candidate.point.x, y: candidate.point.y, z: source.center.z } };
          }
          const result = secondPick ? filletCurveObjects(before, firstPick, secondPick, filletRadiusRef.current) : null;
          callbacksRef.current.onDragPreview(result?.document ?? before);
          setDynamicLineInput({ angle: 0, distance: filletRadiusRef.current, elevation: firstPick.point.z, label: result ? "FILLET · CLICK SECOND CURVE" : "FILLET · SELECT VALID SECOND CURVE", x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          callbacksRef.current.onDragStatus({ distance: filletRadiusRef.current, kind: "fillet", valid: Boolean(result) });
          return;
        }
        if (trimModeRef.current || extendModeRef.current) {
          const ref = selectedOffsetRef();
          if (!ref) return;
          const operation = trimModeRef.current ? "trim" : "extend";
          const before = trimExtendBeforeRef.current ?? cloneDocument(documentRef.current);
          trimExtendBeforeRef.current = before;
          const point = planPointFromPointer(selectedOffsetElevation(ref, before));
          if (!point) return;
          const result = previewTrimExtend(before, ref, point);
          const bounds = mount.getBoundingClientRect();
          renderer.domElement.style.cursor = "crosshair";
          snapMarker.visible = false;
          setDynamicLineInput({ angle: 0, distance: 0, elevation: point.z, label: result ? `${operation.toUpperCase()} · CLICK TARGET` : `${operation.toUpperCase()} · NO BOUNDARY`, x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          callbacksRef.current.onDragStatus({ distance: 0, kind: operation, valid: Boolean(result) });
          callbacksRef.current.onDragPreview(result?.document ?? before);
          return;
        }
        if (offsetModeRef.current) {
          const ref = selectedOffsetRef();
          if (!ref) return;
          const before = offsetBeforeRef.current ?? cloneDocument(documentRef.current);
          offsetBeforeRef.current = before;
          const rawPoint = planPointFromPointer(selectedOffsetElevation(ref));
          if (!rawPoint) return;
          const snapped = snapCadPoint(rawPoint, null, null, false);
          const result = offsetModelEntity(before, ref, offsetDistanceRef.current, snapped.point, offsetKeepSourceRef.current);
          const bounds = mount.getBoundingClientRect();
          renderer.domElement.style.cursor = "crosshair";
          snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
          snapMarker.visible = snapped.snapped;
          setDynamicLineInput({ angle: 0, distance: offsetDistanceRef.current, elevation: snapped.point.z, label: result ? "OFFSET · CLICK SIDE" : "OFFSET · INVALID SIDE", x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          callbacksRef.current.onDragStatus({ distance: offsetDistanceRef.current, kind: "offset", snapped: snapped.snapped, valid: Boolean(result) });
          callbacksRef.current.onDragPreview(result?.document ?? before);
          return;
        }
        if (mirrorModeRef.current) {
          const axisStart = mirrorAxisStartRef.current;
          const before = mirrorBeforeRef.current;
          const rawPoint = planPointFromPointer(axisStart?.z ?? activeElevationRef.current);
          if (!rawPoint) return;
          const snapped = snapCadPoint(rawPoint, null, axisStart, Boolean(axisStart));
          const bounds = mount.getBoundingClientRect();
          snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
          snapMarker.visible = snapped.snapped || Boolean(axisStart);
          renderer.domElement.style.cursor = "crosshair";
          if (axisStart && before) {
            const distance = planarDistance(axisStart, snapped.point);
            const angle = lineAngle({ start: axisStart, end: snapped.point });
            const result = distance >= 1 / 16
              ? mirrorModelEntities(before, selectedModifyRefs(), axisStart, snapped.point, mirrorKeepSourceRef.current)
              : null;
            updateViewportLine(
              { geometry: linePreviewGeometry, material: linePreview.material as THREE.LineBasicMaterial, line: linePreview },
              { start: axisStart, end: snapped.point },
              0.8,
            );
            linePreview.computeLineDistances();
            linePreview.visible = true;
            updateTrackingGuide(axisStart, snapped.point, snapped.snapKind, snapped.guideOrigin);
            setDynamicLineInput({ angle, distance, elevation: axisStart.z, label: "MIRROR", x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
            callbacksRef.current.onDragStatus({ angle, distance, kind: "mirror", polarAngle: snapped.polarAngle, snapped: snapped.snapped, valid: Boolean(result) });
            callbacksRef.current.onDragPreview(result?.document ?? before);
          } else {
            linePreview.visible = false;
            trackingGuide.visible = false;
            setDynamicLineInput({ angle: 0, distance: 0, elevation: snapped.point.z, label: "MIRROR AXIS", x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          }
          return;
        }
        if (moveModeRef.current || copyModeRef.current || (stretchModeRef.current && stretchTargetsRef.current.length > 0)) {
          const rawPoint = planPointFromPointer(modifyBaseRef.current?.z ?? activeElevationRef.current);
          if (!rawPoint) return;
          const snapped = snapCadPoint(rawPoint, null, modifyBaseRef.current, Boolean(modifyBaseRef.current));
          const bounds = mount.getBoundingClientRect();
          snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
          snapMarker.visible = snapped.snapped || Boolean(modifyBaseRef.current);
          renderer.domElement.style.cursor = "crosshair";
          if (modifyBaseRef.current && modifyBeforeRef.current) {
            const base = modifyBaseRef.current;
            const refs = selectedModifyRefs();
            const delta = {
              x: snapped.point.x - base.x,
              y: snapped.point.y - base.y,
              z: snapped.point.z - base.z,
            };
            const copied = copyModeRef.current
              ? copyModelEntities(modifyBeforeRef.current, refs, delta)
              : null;
            const next = stretchModeRef.current
              ? stretchModelEntities(modifyBeforeRef.current, stretchTargetsRef.current, delta)
              : copyModeRef.current
                ? copied?.document ?? null
                : moveModelEntities(modifyBeforeRef.current, refs, delta);
            updateViewportLine(
              {
                geometry: linePreviewGeometry,
                material: linePreview.material as THREE.LineBasicMaterial,
                line: linePreview,
              },
              { start: base, end: snapped.point },
              0.8,
            );
            linePreview.computeLineDistances();
            linePreview.visible = true;
            updateTrackingGuide(base, snapped.point, snapped.snapKind, snapped.guideOrigin);
            const geometry = { start: base, end: snapped.point };
            const distance = lineLength(geometry);
            const angle = lineAngle(geometry);
            setDynamicLineInput({
              angle,
              distance,
              elevation: base.z,
              label: stretchModeRef.current ? "STRETCH" : copyModeRef.current ? "COPY" : "MOVE",
              x: event.clientX - bounds.left + 16,
              y: event.clientY - bounds.top + 16,
            });
            callbacksRef.current.onDragStatus({
              angle,
              distance,
              kind: stretchModeRef.current ? "stretch" : "line",
              polarAngle: snapped.polarAngle,
              snapped: snapped.snapped,
              valid: Boolean(next),
            });
            if (next) callbacksRef.current.onDragPreview(next);
          } else {
            linePreview.visible = false;
            trackingGuide.visible = false;
            setDynamicLineInput({
              angle: 0,
              distance: 0,
              elevation: snapped.point.z,
              label: "BASE POINT",
              x: event.clientX - bounds.left + 16,
              y: event.clientY - bounds.top + 16,
            });
          }
          return;
        }
        if (arcModeRef.current) {
          const method = arcMethodRef.current;
          const continueSeed = arcContinueSeedRef.current;
          const points = arcPointsRef.current;
          const anchor = arcCursorAnchor(method, points, continueSeed);
          const rawPoint = planPointFromPointer(points[0]?.z ?? continueSeed?.start.z ?? activeElevationRef.current);
          if (!rawPoint) return;
          const snapped = snapCadPoint(rawPoint, null, anchor, Boolean(anchor));
          arcCursorRef.current = snapped.point;
          snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
          snapMarker.visible = snapped.snapped || points.length > 0;
          renderer.domElement.style.cursor = "crosshair";
          const bounds = mount.getBoundingClientRect();
          let valid = true;
          let previewArc: ArcGeometry | null = null;
          if (method === "continue") {
            previewArc = arcGeometryFromMethodPointer(method, points, snapped.point, continueSeed);
            valid = Boolean(previewArc);
          } else if (points.length === 1) {
            updateViewportLine({ geometry: linePreviewGeometry, material: linePreview.material as THREE.LineBasicMaterial, line: linePreview }, { start: points[0], end: snapped.point }, 0.8);
            linePreview.computeLineDistances();
            linePreview.visible = true;
            updateTrackingGuide(points[0], snapped.point, snapped.snapKind, snapped.guideOrigin);
          } else if (points.length === 2) {
            previewArc = arcGeometryFromMethodPointer(method, points, snapped.point, continueSeed);
            valid = Boolean(previewArc);
          } else {
            linePreview.visible = false;
            trackingGuide.visible = false;
          }
          if (previewArc) {
            updateViewportArc({ geometry: linePreviewGeometry, material: linePreview.material as THREE.LineBasicMaterial, line: linePreview }, previewArc, 0.8);
            linePreview.computeLineDistances();
            linePreview.visible = true;
            if (anchor) updateTrackingGuide(anchor, snapped.point, snapped.snapKind, snapped.guideOrigin);
          } else if ((method === "continue" || points.length === 2) && !valid) {
            linePreview.visible = false;
          }
          setDynamicArcInput({ elevation: points[0]?.z ?? continueSeed?.start.z ?? snapped.point.z, label: valid ? CAD_SNAP_LABELS[snapped.snapKind] : "INVALID", stage: arcPointStage(method, points.length).toUpperCase(), x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          callbacksRef.current.onDragStatus({ distance: previewArc ? arcLength(previewArc) : anchor ? lineLength({ start: anchor, end: snapped.point }) : 0, kind: "arc", snapped: snapped.snapped, valid });
          return;
        }
        if (circleModeRef.current) {
          const points = circlePointsRef.current;
          const method = circleMethodRef.current;
          const anchor = points.at(-1) ?? null;
          const rawPoint = planPointFromPointer(points[0]?.z ?? activeElevationRef.current);
          if (!rawPoint) return;
          if (method === "tangent-tangent-radius" || method === "tangent-tangent-tangent") {
            const bounds = mount.getBoundingClientRect();
            const pickedConstraints = circleTangentConstraintsRef.current;
            const hovered = pickCircleTangentConstraint(rawPoint);
            const selectingRadius = method === "tangent-tangent-radius" && pickedConstraints.length === 2;
            renderer.domElement.style.cursor = hovered || selectingRadius ? "crosshair" : "not-allowed";
            snapMarker.visible = Boolean(hovered) && !selectingRadius;
            if (hovered) snapMarker.position.set(hovered.constraint.pick.x, hovered.constraint.pick.y, hovered.constraint.pick.z + 0.9);
            let circle: CircleGeometry | null = null;
            let radius = 0;
            if (method === "tangent-tangent-radius" && pickedConstraints.length === 2) {
              radius = snapToSixteenth(planarDistance(pickedConstraints[1].constraint.pick, rawPoint));
              circle = circleFromTwoTangenciesRadius(pickedConstraints[0].constraint, pickedConstraints[1].constraint, radius);
            } else if (method === "tangent-tangent-tangent" && pickedConstraints.length === 2 && hovered && !pickedConstraints.some((candidate) => candidate.key === hovered.key)) {
              circle = circleFromThreeTangencies(pickedConstraints[0].constraint, pickedConstraints[1].constraint, hovered.constraint);
              radius = circle?.radius ?? 0;
            }
            if (circle) {
              updateViewportCircle({ geometry: linePreviewGeometry, material: linePreview.material as THREE.LineBasicMaterial, line: linePreview }, circle, 0.8);
              linePreview.computeLineDistances();
              linePreview.visible = true;
            } else {
              linePreview.visible = false;
            }
            setDynamicCircleInput({ elevation: points[0]?.z ?? rawPoint.z, label: selectingRadius ? "RADIUS" : hovered ? "TANGENT" : "SELECT OBJECT", radius, stage: circlePointStage(method, pickedConstraints.length).toUpperCase(), x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
            callbacksRef.current.onDragStatus({ distance: radius, kind: "circle", snapped: Boolean(hovered), valid: method === "tangent-tangent-radius" && pickedConstraints.length === 2 ? Boolean(circle) : Boolean(hovered) });
            return;
          }
          const snapped = snapCadPoint(rawPoint, null, anchor, Boolean(anchor));
          circleCursorRef.current = snapped.point;
          snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
          snapMarker.visible = snapped.snapped || points.length > 0;
          renderer.domElement.style.cursor = "crosshair";
          const bounds = mount.getBoundingClientRect();
          if (circlePointCompletes(method, points.length)) {
            const circle = circleGeometryFromPointer(method, points, snapped.point);
            if (circle) {
              updateViewportCircle({ geometry: linePreviewGeometry, material: linePreview.material as THREE.LineBasicMaterial, line: linePreview }, circle, 0.8);
              linePreview.computeLineDistances();
              linePreview.visible = true;
              if (anchor) updateTrackingGuide(anchor, snapped.point, snapped.snapKind, snapped.guideOrigin);
              setDynamicCircleInput({ elevation: circle.center.z, label: CAD_SNAP_LABELS[snapped.snapKind], radius: circle.radius, stage: circlePointStage(method, points.length).toUpperCase(), x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
              callbacksRef.current.onDragStatus({ distance: circle.radius, kind: "circle", polarAngle: snapped.polarAngle, snapped: snapped.snapped, valid: true });
            } else {
              linePreview.visible = false;
              setDynamicCircleInput({ elevation: points[0]?.z ?? snapped.point.z, label: "INVALID", radius: 0, stage: circlePointStage(method, points.length).toUpperCase(), x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
              callbacksRef.current.onDragStatus({ distance: 0, kind: "circle", snapped: snapped.snapped, valid: false });
            }
          } else if (anchor) {
            updateViewportLine({ geometry: linePreviewGeometry, material: linePreview.material as THREE.LineBasicMaterial, line: linePreview }, { start: anchor, end: snapped.point }, 0.8);
            linePreview.computeLineDistances();
            linePreview.visible = true;
            updateTrackingGuide(anchor, snapped.point, snapped.snapKind, snapped.guideOrigin);
            setDynamicCircleInput({ elevation: points[0].z, label: CAD_SNAP_LABELS[snapped.snapKind], radius: 0, stage: circlePointStage(method, points.length).toUpperCase(), x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
            callbacksRef.current.onDragStatus({ distance: planarDistance(anchor, snapped.point), kind: "circle", snapped: snapped.snapped, valid: true });
          } else {
            linePreview.visible = false;
            trackingGuide.visible = false;
            setDynamicCircleInput({ elevation: snapped.point.z, label: CAD_SNAP_LABELS[snapped.snapKind], radius: 0, stage: circlePointStage(method, points.length).toUpperCase(), x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
            callbacksRef.current.onDragStatus({ distance: 0, kind: "circle", snapped: snapped.snapped, valid: true });
          }
          return;
        }
        if (rectangleModeRef.current) {
          const rawPoint = planPointFromPointer(rectangleStartRef.current?.z ?? activeElevationRef.current);
          if (!rawPoint) return;
          const snapped = snapCadPoint(rawPoint, null, rectangleStartRef.current, Boolean(rectangleStartRef.current));
          rectangleCursorRef.current = snapped.point;
          rectangleEscapeArmedRef.current = false;
          snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
          snapMarker.visible = snapped.snapped || Boolean(rectangleStartRef.current);
          renderer.domElement.style.cursor = "crosshair";
          const bounds = mount.getBoundingClientRect();
          if (rectangleStartRef.current) {
            const dimensions = rectangleDraftDimensions(rectangleStartRef.current, snapped.point, rectangleDraftSettingsRef.current);
            const rectangle = rectangleFromDraftSettings(rectangleStartRef.current, snapped.point, rectangleDraftSettingsRef.current);
            if (rectangle) {
              updateViewportPolyline({ geometry: linePreviewGeometry, material: linePreview.material as THREE.LineBasicMaterial, line: linePreview }, rectangle, 0.8);
              linePreview.computeLineDistances();
              linePreview.visible = true;
              updateTrackingGuide(rectangleStartRef.current, snapped.point, snapped.snapKind, snapped.guideOrigin);
              setDynamicRectangleInput({ elevation: rectangleStartRef.current.z, height: dimensions.height, label: CAD_SNAP_LABELS[snapped.snapKind], width: dimensions.width, x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
              callbacksRef.current.onDragStatus({ distance: Math.hypot(snapped.point.x - rectangleStartRef.current.x, snapped.point.y - rectangleStartRef.current.y), kind: "rectangle", snapped: snapped.snapped, valid: true });
            }
          } else {
            trackingGuide.visible = false;
            setDynamicRectangleInput({ elevation: snapped.point.z, height: 0, label: CAD_SNAP_LABELS[snapped.snapKind], width: 0, x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          }
          return;
        }
        if (polylineModeRef.current) {
          const rawPoint = planPointFromPointer(polylinePointsRef.current.length ? polylineElevationRef.current : activeElevationRef.current);
          if (!rawPoint) return;
          const previous = polylinePointsRef.current.at(-1);
          const anchor = previous ? { ...previous, z: polylineElevationRef.current } : null;
          const snapped = snapCadPoint(rawPoint, null, anchor, Boolean(anchor));
          polylineCursorRef.current = snapped.point;
          polylineEscapeArmedRef.current = false;
          snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
          snapMarker.visible = snapped.snapped || polylinePointsRef.current.length > 0;
          renderer.domElement.style.cursor = "crosshair";
          const bounds = mount.getBoundingClientRect();
          if (polylinePointsRef.current.length) {
            const previous = polylinePointsRef.current.at(-1)!;
            const through = polylineArcThroughRef.current;
            const previewBulge = polylineSegmentModeRef.current === "arc" && through
              ? polylineBulgeFromThreePoints(previous, through, snapped.point)
              : 0;
            const vertices = through && polylineSegmentModeRef.current === "arc" && previewBulge === null
              ? [...polylinePointsRef.current, through]
              : [...polylinePointsRef.current, snapped.point];
            const bulges = [...polylineBulgesRef.current, previewBulge ?? 0];
            updateViewportPolyline({ geometry: linePreviewGeometry, material: linePreview.material as THREE.LineBasicMaterial, line: linePreview }, { bulges, closed: false, elevation: polylineElevationRef.current, vertices, width: polylineWidthRef.current }, 0.8);
            linePreview.computeLineDistances();
            linePreview.visible = true;
            const geometry = { start: anchor!, end: snapped.point };
            const angle = lineAngle(geometry);
            const distance = lineLength(geometry);
            updateTrackingGuide(anchor!, snapped.point, snapped.snapKind, snapped.guideOrigin);
            setDynamicPolylineInput({ angle, distance, elevation: polylineElevationRef.current, label: polylineSegmentModeRef.current === "arc" ? through ? "ARC END" : "ARC THROUGH" : CAD_SNAP_LABELS[snapped.snapKind], x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
            callbacksRef.current.onDragStatus({ angle, distance, kind: "polyline", polarAngle: snapped.polarAngle, snapped: snapped.snapped, valid: true });
          } else {
            trackingGuide.visible = false;
            setDynamicPolylineInput({ angle: 0, distance: 0, elevation: snapped.point.z, label: CAD_SNAP_LABELS[snapped.snapKind], x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          }
          return;
        }
        if (lineModeRef.current) {
          const rawPoint = planPointFromPointer(lineStartRef.current?.z ?? activeElevationRef.current);
          if (!rawPoint) return;
          const snapped = snapLineCandidate(rawPoint);
          lineEscapeArmedRef.current = false;
          lineCursorRef.current = snapped.point;
          snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
          snapMarker.visible = snapped.snapped || Boolean(lineStartRef.current);
          renderer.domElement.style.cursor = "crosshair";
          const bounds = mount.getBoundingClientRect();
          if (lineStartRef.current) {
            const currentGeometry = { start: lineStartRef.current, end: snapped.point };
            const currentAngle = lineAngle(currentGeometry);
            const currentDistance = lineLength(currentGeometry);
            updateViewportLine({ geometry: linePreviewGeometry, material: linePreview.material as THREE.LineBasicMaterial, line: linePreview }, { start: lineStartRef.current, end: snapped.point }, 0.8);
            linePreview.computeLineDistances();
            linePreview.visible = true;
            updateTrackingGuide(lineStartRef.current, snapped.point, snapped.snapKind, snapped.guideOrigin);
            setDynamicLineInput({
              angle: currentAngle,
              distance: currentDistance,
              elevation: lineStartRef.current.z,
              label: CAD_SNAP_LABELS[snapped.snapKind],
              x: event.clientX - bounds.left + 16,
              y: event.clientY - bounds.top + 16,
            });
            callbacksRef.current.onDragStatus({
              angle: currentAngle,
              distance: currentDistance,
              kind: "line",
              polarAngle: snapped.polarAngle,
              snapped: snapped.snapped,
              valid: true,
            });
          } else {
            trackingGuide.visible = false;
            setDynamicLineInput({ angle: 0, distance: 0, elevation: snapped.point.z, label: CAD_SNAP_LABELS[snapped.snapKind], x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          }
          return;
        }
        linePreview.visible = false;
        trackingGuide.visible = false;
        setDynamicArcInput(null);
        setDynamicCircleInput(null);
        setDynamicLineInput(null);
        setDynamicPolylineInput(null);
        setDynamicRectangleInput(null);
        snapMarker.visible = false;
        const rotationHover = rotationGizmo.group.visible
          ? raycaster.intersectObject(rotationGizmo.ring, false)[0]
          : undefined;
        if (rotationHover) {
          setHoveredGrip(null);
          setHoveredEntityKey(null);
          renderer.domElement.style.cursor = "alias";
          return;
        }
        const hoverHit = boxGripSet.group.visible
          ? raycaster.intersectObjects(boxGripSet.handles, false)[0]
          : undefined;
        if (hoverHit?.object instanceof THREE.Mesh) {
          setHoveredGrip(hoverHit.object);
          setHoveredEntityKey(null);
          return;
        }
        setHoveredGrip(null);
        const hoverCandidate = entityHitCandidates()[0];
        setHoveredEntityKey(hoverCandidate ? cadEntityKey(hoverCandidate.ref) : null);
        renderer.domElement.style.cursor = hoverCandidate ? "pointer" : "default";
        return;
      }
      if (event.pointerId !== drag.pointerId) return;
      const pixelDistance = Math.hypot(
        event.clientX - drag.startClientX,
        event.clientY - drag.startClientY,
      );
      if (!drag.active && pixelDistance < 3) return;
      drag.active = true;
      controls.enabled = false;
      mount.classList.add(drag.kind === "face" || drag.kind === "grip" ? "is-dragging-face" : drag.kind === "rotate" || drag.kind === "scale" ? "is-dragging-rotation" : "is-dragging-object");

      setPointer(event);
      const currentPoint = raycaster.ray.intersectPlane(
        drag.plane,
        new THREE.Vector3(),
      );
      if (!currentPoint) return;

      if (drag.kind === "line-grip" && drag.lineGrip) {
        const snapped = snapCadPoint({ x: currentPoint.x, y: currentPoint.y, z: currentPoint.z }, drag.objectId);
        const next = updateLineGrip(drag.before, drag.objectId, drag.lineGrip, snapped.point);
        const source = findLineObject(drag.before, drag.objectId);
        const nextLine = next ? findLineObject(next, drag.objectId) : null;
        callbacksRef.current.onDragStatus({
          angle: nextLine ? lineAngle(nextLine) : source ? lineAngle(source) : 0,
          distance: nextLine ? lineLength(nextLine) : source ? lineLength(source) : 0,
          kind: "line-grip",
          snapped: snapped.snapped,
          valid: Boolean(next),
        });
        snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
        snapMarker.visible = snapped.snapped;
        if (!next) return;
        drag.lastValid = next;
        callbacksRef.current.onDragPreview(next);
        return;
      }

      if (drag.kind === "circle-grip" && drag.circleGrip) {
        const source = findCircleObject(drag.before, drag.objectId);
        const elevation = source?.center.z ?? 0;
        const snapped = snapCadPoint({ x: currentPoint.x, y: currentPoint.y, z: elevation }, drag.objectId);
        const next = updateCircleGrip(drag.before, drag.objectId, drag.circleGrip, snapped.point);
        const nextCircle = next ? findCircleObject(next, drag.objectId) : null;
        callbacksRef.current.onDragStatus({ distance: nextCircle?.radius ?? source?.radius ?? 0, kind: "circle-grip", snapped: snapped.snapped, valid: Boolean(next) });
        snapMarker.position.set(snapped.point.x, snapped.point.y, elevation + 0.9);
        snapMarker.visible = snapped.snapped;
        if (!next) return;
        drag.lastValid = next;
        callbacksRef.current.onDragPreview(next);
        return;
      }

      if (drag.kind === "arc-grip" && drag.arcGrip) {
        const source = findArcObject(drag.before, drag.objectId);
        const elevation = source?.center.z ?? 0;
        const snapped = snapCadPoint({ x: currentPoint.x, y: currentPoint.y, z: elevation }, drag.objectId);
        const next = updateArcGrip(drag.before, drag.objectId, drag.arcGrip, snapped.point);
        const nextArc = next ? findArcObject(next, drag.objectId) : null;
        callbacksRef.current.onDragStatus({ distance: nextArc ? arcLength(nextArc) : source ? arcLength(source) : 0, kind: "arc-grip", snapped: snapped.snapped, valid: Boolean(next) });
        snapMarker.position.set(snapped.point.x, snapped.point.y, elevation + 0.9);
        snapMarker.visible = snapped.snapped;
        if (!next) return;
        drag.lastValid = next;
        callbacksRef.current.onDragPreview(next);
        return;
      }

      if (drag.kind === "polyline-grip" && (drag.polylineVertex !== undefined || drag.polylineGrip)) {
        const source = findPolylineObject(drag.before, drag.objectId);
        const elevation = source?.elevation ?? 0;
        const snapped = snapCadPoint({ x: currentPoint.x, y: currentPoint.y, z: elevation }, drag.objectId);
        const next = drag.polylineGrip
          ? updatePolylineObjectGrip(drag.before, drag.objectId, drag.polylineGrip, snapped.point)
          : updatePolylineObjectVertex(drag.before, drag.objectId, drag.polylineVertex!, snapped.point);
        const nextPolyline = next ? findPolylineObject(next, drag.objectId) : null;
        callbacksRef.current.onDragStatus({ distance: nextPolyline ? polylineLength(nextPolyline) : 0, kind: "polyline-grip", snapped: snapped.snapped, valid: Boolean(next) });
        snapMarker.position.set(snapped.point.x, snapped.point.y, elevation + 0.9);
        snapMarker.visible = snapped.snapped;
        if (!next) return;
        drag.lastValid = next;
        callbacksRef.current.onDragPreview(next);
        return;
      }

      if (drag.kind === "rotate" && drag.rotationBase && drag.startAngle !== undefined) {
        const currentAngle = Math.atan2(
          currentPoint.y - drag.rotationBase.y,
          currentPoint.x - drag.rotationBase.x,
        );
        const rawDegrees = (currentAngle - drag.startAngle) * 180 / Math.PI;
        const angle = snapRotationAngle(rawDegrees, event.shiftKey ? 1 : 15);
        const next = rotateModelEntities(
          drag.before,
          selectedModifyRefs(),
          { x: drag.rotationBase.x, y: drag.rotationBase.y, z: drag.rotationBase.z },
          angle,
        );
        callbacksRef.current.onDragStatus({
          angle,
          distance: 0,
          kind: "rotate",
          snapped: true,
          valid: Boolean(next),
        });
        if (!next) return;
        drag.lastValid = next;
        callbacksRef.current.onDragPreview(next);
        return;
      }

      if (drag.kind === "scale" && drag.scaleBase && drag.scaleStartDistance) {
        const currentDistance = currentPoint.distanceTo(drag.scaleBase);
        const increment = event.shiftKey ? 0.01 : 0.1;
        const factor = Math.max(0.01, Math.round((currentDistance / drag.scaleStartDistance) / increment) * increment);
        const next = scaleModelEntities(
          drag.before,
          selectedModifyRefs(),
          { x: drag.scaleBase.x, y: drag.scaleBase.y, z: drag.scaleBase.z },
          factor,
        );
        callbacksRef.current.onDragStatus({
          distance: currentDistance,
          factor: Math.round(factor * 100) / 100,
          kind: "scale",
          snapped: true,
          valid: Math.abs(factor - 1) < 0.0001 || Boolean(next),
        });
        if (!next) return;
        drag.lastValid = next;
        callbacksRef.current.onDragPreview(next);
        return;
      }

      const worldMovement = currentPoint.clone().sub(drag.startPoint);
      if (drag.kind === "plan-move") {
        const xMovement = snapObjectMoveDistance(
          drag.before,
          drag.objectId,
          "x",
          snapToSixteenth(worldMovement.x),
        );
        const movedX = moveBoxObject(drag.before, drag.objectId, "x", xMovement.distance);
        const yMovement = snapObjectMoveDistance(
          movedX ?? drag.before,
          drag.objectId,
          "y",
          snapToSixteenth(worldMovement.y),
        );
        const next = movedX
          ? moveBoxObject(movedX, drag.objectId, "y", yMovement.distance)
          : null;
        callbacksRef.current.onDragStatus({
          axisDistances: { x: xMovement.distance, y: yMovement.distance },
          distance: Math.hypot(xMovement.distance, yMovement.distance),
          kind: "plan-move",
          snapped: xMovement.snapped || yMovement.snapped,
          valid: Boolean(next),
        });
        if (!next) return;
        drag.lastValid = next;
        callbacksRef.current.onDragPreview(next);
        return;
      }
      if (drag.kind === "grip" && drag.grip) {
        const sourceBox = findBoxObject(drag.before, drag.objectId);
        const coordinateDeltas = Object.fromEntries(
          drag.grip.axes.map((axis) => {
            const localAxis = sourceBox ? boxLocalAxis(sourceBox, axis) : { x: 0, y: 0, z: 0 };
            const projected = worldMovement.x * localAxis.x + worldMovement.y * localAxis.y + worldMovement.z * localAxis.z;
            return [axis, snapToSixteenth(projected)];
          }),
        ) as Partial<Record<AxisKey, number>>;
        const outwardDistances = Object.fromEntries(
          drag.grip.axes.map((axis) => [
            axis,
            snapToSixteenth((coordinateDeltas[axis] ?? 0) * drag.grip!.signs[axis]),
          ]),
        ) as Partial<Record<AxisKey, number>>;
        const nextBox = sourceBox
          ? resizeBoxFromGrip(sourceBox, drag.grip, coordinateDeltas)
          : null;
        const dominantDistance = drag.grip.axes.reduce((largest, axis) => {
          const distance = outwardDistances[axis] ?? 0;
          return Math.abs(distance) > Math.abs(largest) ? distance : largest;
        }, 0);
        callbacksRef.current.onDragStatus({
          axisDistances: outwardDistances,
          distance: dominantDistance,
          gripKind: drag.grip.kind,
          kind: "grip",
          valid: Boolean(nextBox),
        });
        if (!nextBox) return;
        const next = updateBoxObject(drag.before, drag.objectId, nextBox);
        if (!next) return;
        drag.lastValid = next;
        callbacksRef.current.onDragPreview(next);
        return;
      }

      const axisMovement = worldMovement.dot(drag.axis);
      if (drag.kind === "object" || drag.kind === "copy") {
        const selectedIds = selectedObjectIdsRef.current;
        const gridMovement = snapToSixteenth(axisMovement);
        const movement = selectedIds.length > 1
          ? { distance: gridMovement, snapped: false }
          : snapObjectMoveDistance(drag.before, drag.objectId, drag.axisKey, gridMovement);
        const copyResult = drag.kind === "copy"
          ? copyBoxObjects(drag.before, selectedIds, drag.axisKey, movement.distance)
          : null;
        const next = drag.kind === "copy"
          ? copyResult?.document ?? null
          : selectedIds.length > 1
            ? moveBoxObjects(drag.before, selectedIds, drag.axisKey, movement.distance)
            : moveBoxObject(drag.before, drag.objectId, drag.axisKey, movement.distance);
        callbacksRef.current.onDragStatus({
          axis: drag.axisKey,
          distance: movement.distance,
          kind: drag.kind,
          snapped: movement.snapped,
          valid: Boolean(next),
        });
        if (!next) return;
        drag.lastValid = next;
        callbacksRef.current.onDragPreview(next);
        return;
      }

      const outwardDistance = snapToSixteenth(axisMovement * drag.sign);
      const sourceBox = findBoxObject(drag.before, drag.objectId);
      const nextBox = sourceBox && drag.faceIndex !== null
        ? moveBoxFace(sourceBox, drag.faceIndex, outwardDistance)
        : null;
      callbacksRef.current.onDragStatus({
        distance: outwardDistance,
        kind: "face",
        valid: Boolean(nextBox),
      });
      if (!nextBox) return;
      const next = updateBoxObject(drag.before, drag.objectId, nextBox);
      if (!next) return;
      drag.lastValid = next;
      callbacksRef.current.onDragPreview(next);
    };

    const finishDrag = (event: PointerEvent, commit: boolean) => {
      if (selectionDrag && event.pointerId === selectionDrag.pointerId) {
        const completed = selectionDrag;
        selectionDrag = null;
        controls.enabled = true;
        setSelectionBox(null);
        if (renderer.domElement.hasPointerCapture(event.pointerId)) {
          renderer.domElement.releasePointerCapture(event.pointerId);
        }
        if (!commit) return;
        if (!completed.active) {
          if (completed.purpose === "stretch") {
            callbacksRef.current.onStretchTargetsChange([], "crossing");
          } else {
            callbacksRef.current.onSelectionWindow([], completed.additive, "window");
          }
          return;
        }
        if (completed.purpose === "stretch") {
          const result = selectScreenStretchTargets(
            screenStretchGeometries(),
            completed.start,
            completed.current,
          );
          callbacksRef.current.onStretchTargetsChange(result.targets, result.mode);
          return;
        }
        const result = selectScreenGeometries(
          screenSelectionGeometries(),
          completed.start,
          completed.current,
        );
        callbacksRef.current.onSelectionWindow(result.refs, completed.additive, result.mode);
        return;
      }
      if (!drag || event.pointerId !== drag.pointerId) return;
      const completed = drag;
      drag = null;
      controls.enabled = true;
      mount.classList.remove("is-dragging-face", "is-dragging-object", "is-dragging-rotation");
      callbacksRef.current.onDragStatus(null);
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }

      if (completed.active && commit) {
        callbacksRef.current.onDragCommit(completed.before, completed.lastValid);
      } else if (completed.active) {
        callbacksRef.current.onDragCancel(completed.before);
      } else if (
        commit &&
        completed.kind === "grip" &&
        completed.grip?.kind === "face" &&
        completed.faceIndex !== null
      ) {
        const bounds = renderer.domElement.getBoundingClientRect();
        setActiveGripInput({
          axis: completed.axisKey,
          faceIndex: completed.faceIndex,
          objectId: completed.objectId,
          x: Math.min(Math.max(completed.startClientX - bounds.left + 14, 12), Math.max(bounds.width - 172, 12)),
          y: Math.min(Math.max(completed.startClientY - bounds.top - 18, 64), Math.max(bounds.height - 70, 64)),
        });
        setGripDraft("");
        setGripInputError("");
        callbacksRef.current.onDragStatus({
          axis: completed.axisKey,
          distance: 0,
          gripKind: "face",
          kind: "entry",
          valid: true,
        });
      }
    };

    const cancelWithEscape = (event: KeyboardEvent) => {
      if (
        event.key === "Tab" &&
        (arcModeRef.current || circleModeRef.current || lineModeRef.current || polylineModeRef.current || rectangleModeRef.current) &&
        objectSnapCycleCountRef.current > 1
      ) {
        event.preventDefault();
        objectSnapCycleIndexRef.current = (objectSnapCycleIndexRef.current + 1) % objectSnapCycleCountRef.current;
        if (lastDrawingPointerEvent) moveDrag(lastDrawingPointerEvent);
        callbacksRef.current.onLineCommandFeedback({
          message: `Snap choice ${objectSnapCycleIndexRef.current + 1} of ${objectSnapCycleCountRef.current}.`,
          tone: "success",
        });
        return;
      }
      if (
        event.key === "Tab" &&
        selectionCycleState &&
        selectionCycleCandidates.length > 1 &&
        performance.now() - selectionCycleState.updatedAt <= 2400
      ) {
        event.preventDefault();
        const nextIndex = (selectionCycleState.index + 1) % selectionCycleCandidates.length;
        selectionCycleState = { ...selectionCycleState, index: nextIndex, updatedAt: performance.now() };
        const candidate = selectionCycleCandidates[nextIndex];
        selectHitCandidate(candidate, false, false);
        showSelectionCycle(selectionCycleCandidates, nextIndex, selectionCycleState.point);
        callbacksRef.current.onLineCommandFeedback({ message: `Selection cycling: ${entityDisplayName(candidate.ref)} (${nextIndex + 1} of ${selectionCycleCandidates.length}).`, tone: "info" });
        return;
      }
      if (event.key !== "Escape") return;
      acquiredTrackingPointsRef.current = [];
      objectSnapHoverRef.current = null;
      objectSnapCycleIndexRef.current = 0;
      objectSnapCycleCountRef.current = 0;
      if (objectSnapAcquisitionTimerRef.current !== null) window.clearTimeout(objectSnapAcquisitionTimerRef.current);
      objectSnapAcquisitionTimerRef.current = null;
      setSelectionCycle(null);
      selectionCycleState = null;
      selectionCycleCandidates = [];
      if (selectionDrag) {
        event.preventDefault();
        const canceled = selectionDrag;
        selectionDrag = null;
        controls.enabled = true;
        setSelectionBox(null);
        if (renderer.domElement.hasPointerCapture(canceled.pointerId)) {
          renderer.domElement.releasePointerCapture(canceled.pointerId);
        }
        return;
      }
      if (boundaryModeRef.current && !drag) {
        event.preventDefault();
        linePreview.visible = false;
        trackingGuide.visible = false;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onBoundaryFinishRequested(true);
        callbacksRef.current.onLineCommandFeedback({ message: "Boundary canceled.", tone: "success" });
        return;
      }
      if ((moveModeRef.current || copyModeRef.current || stretchModeRef.current) && !drag) {
        event.preventDefault();
        const before = modifyBeforeRef.current;
        if (before) callbacksRef.current.onDragCancel(before);
        clearModifyPreview();
        if (stretchModeRef.current) callbacksRef.current.onStretchFinishRequested(true);
        else callbacksRef.current.onModifyFinishRequested(true);
        callbacksRef.current.onLineCommandFeedback({
          message: `${stretchModeRef.current ? "Stretch" : copyModeRef.current ? "Copy" : "Move"} canceled.`,
          tone: "success",
        });
        return;
      }
      if (mirrorModeRef.current && !drag) {
        event.preventDefault();
        const before = mirrorBeforeRef.current;
        if (before) callbacksRef.current.onDragCancel(before);
        mirrorAxisStartRef.current = null;
        mirrorBeforeRef.current = null;
        linePreview.visible = false;
        trackingGuide.visible = false;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onMirrorFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: "Mirror canceled.", tone: "success" });
        return;
      }
      if (lengthenModeRef.current && !drag) {
        event.preventDefault();
        const before = lengthenBeforeRef.current;
        if (before) callbacksRef.current.onDragCancel(before);
        lengthenBeforeRef.current = null;
        lengthenEndpointRef.current = null;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onLengthenFinishRequested(true);
        callbacksRef.current.onLineCommandFeedback({ message: "Lengthen canceled.", tone: "success" });
        return;
      }
      if (breakModeRef.current && !drag) {
        event.preventDefault();
        const before = breakBeforeRef.current;
        if (before) callbacksRef.current.onDragCancel(before);
        breakBeforeRef.current = null;
        breakTargetRef.current = null;
        breakFirstPointRef.current = null;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onBreakStageChange(0);
        callbacksRef.current.onBreakFinishRequested(true);
        callbacksRef.current.onLineCommandFeedback({ message: `${breakModeRef.current === "break" ? "Break" : "Break at Point"} canceled.`, tone: "success" });
        return;
      }
      if (offsetModeRef.current && !drag) {
        event.preventDefault();
        const before = offsetBeforeRef.current;
        if (before) callbacksRef.current.onDragCancel(before);
        offsetBeforeRef.current = null;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onOffsetFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: "Offset canceled.", tone: "success" });
        return;
      }
      if (chamferModeRef.current && !drag) {
        event.preventDefault();
        const before = chamferBeforeRef.current;
        if (before) callbacksRef.current.onDragCancel(before);
        chamferBeforeRef.current = null;
        chamferFirstPickRef.current = null;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onChamferStageChange(0);
        callbacksRef.current.onChamferFinishRequested(true);
        callbacksRef.current.onLineCommandFeedback({ message: "Chamfer canceled.", tone: "success" });
        return;
      }
      if (filletModeRef.current && !drag) {
        event.preventDefault();
        const before = filletBeforeRef.current;
        if (before) callbacksRef.current.onDragCancel(before);
        filletBeforeRef.current = null;
        filletFirstPickRef.current = null;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onFilletStageChange(0);
        callbacksRef.current.onFilletFinishRequested(true);
        callbacksRef.current.onLineCommandFeedback({ message: "Fillet canceled.", tone: "success" });
        return;
      }
      if ((trimModeRef.current || extendModeRef.current) && !drag) {
        event.preventDefault();
        const before = trimExtendBeforeRef.current;
        if (before) callbacksRef.current.onDragCancel(before);
        const operation = trimModeRef.current ? "Trim" : "Extend";
        trimExtendBeforeRef.current = null;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onTrimExtendFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: `${operation} canceled.`, tone: "success" });
        return;
      }
      if (rotateModeRef.current && !drag) {
        event.preventDefault();
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onRotateFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: "Rotate canceled.", tone: "success" });
        return;
      }
      if (scaleModeRef.current && !drag) {
        event.preventDefault();
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onScaleFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: "Scale canceled.", tone: "success" });
        return;
      }
      if (arcModeRef.current && !drag) {
        event.preventDefault();
        arcPointsRef.current = [];
        arcCursorRef.current = null;
        callbacksRef.current.onArcPointsChange([]);
        linePreview.visible = false;
        trackingGuide.visible = false;
        snapMarker.visible = false;
        setDynamicArcInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onArcFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: "Arc canceled. Press Enter to repeat Arc.", tone: "success" });
        return;
      }
      if (circleModeRef.current && !drag) {
        event.preventDefault();
        circlePointsRef.current = [];
        circleTangentConstraintsRef.current = [];
        circleCursorRef.current = null;
        callbacksRef.current.onCirclePointsChange([]);
        linePreview.visible = false;
        trackingGuide.visible = false;
        snapMarker.visible = false;
        setDynamicCircleInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onCircleFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: "Circle canceled. Press Enter to repeat Circle.", tone: "success" });
        return;
      }
      if (polylineModeRef.current && !drag) {
        event.preventDefault();
        const vertices = polylinePointsRef.current;
        const created = vertices.length >= 2 && callbacksRef.current.onPolylineCreate({ bulges: polylineBulgesRef.current, closed: false, elevation: polylineElevationRef.current, vertices, width: polylineWidthRef.current }, "polyline");
        polylinePointsRef.current = [];
        polylineBulgesRef.current = [];
        polylineArcThroughRef.current = null;
        polylineCursorRef.current = null;
        polylineEscapeArmedRef.current = false;
        callbacksRef.current.onPolylineAnchorChange(null);
        linePreview.visible = false;
        trackingGuide.visible = false;
        snapMarker.visible = false;
        setDynamicPolylineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onPolylineFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: created ? "Finished the open Polyline. Press Enter to repeat Polyline." : "Polyline canceled.", tone: "success" });
        return;
      }
      if (rectangleModeRef.current && !drag) {
        event.preventDefault();
        rectangleStartRef.current = null;
        rectangleCursorRef.current = null;
        rectangleEscapeArmedRef.current = false;
        callbacksRef.current.onRectangleAnchorChange(null);
        linePreview.visible = false;
        trackingGuide.visible = false;
        setDynamicRectangleInput(null);
        snapMarker.visible = false;
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onRectangleFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: "Rectangle canceled.", tone: "success" });
        return;
      }
      if (lineModeRef.current && !drag) {
        event.preventDefault();
        lineStartRef.current = null;
        lineCursorRef.current = null;
        linePointHistoryRef.current = [];
        lineEscapeArmedRef.current = false;
        callbacksRef.current.onLineAnchorChange(null);
        linePreview.visible = false;
        trackingGuide.visible = false;
        setDynamicLineInput(null);
        snapMarker.visible = false;
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onLineFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: "Line canceled. Press Enter to repeat Line.", tone: "success" });
        return;
      }
      if (!drag) {
        arcPointsRef.current = [];
        arcCursorRef.current = null;
        callbacksRef.current.onArcPointsChange([]);
        lineStartRef.current = null;
        lineCursorRef.current = null;
        linePointHistoryRef.current = [];
        lineEscapeArmedRef.current = false;
        callbacksRef.current.onLineAnchorChange(null);
        polylinePointsRef.current = [];
        polylineCursorRef.current = null;
        polylineEscapeArmedRef.current = false;
        callbacksRef.current.onPolylineAnchorChange(null);
        rectangleStartRef.current = null;
        rectangleCursorRef.current = null;
        rectangleEscapeArmedRef.current = false;
        callbacksRef.current.onRectangleAnchorChange(null);
        linePreview.visible = false;
        trackingGuide.visible = false;
        setDynamicRectangleInput(null);
        snapMarker.visible = false;
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onSelectionWindow([], false, "window");
        return;
      }
      const canceled = drag;
      drag = null;
      controls.enabled = true;
      mount.classList.remove("is-dragging-face", "is-dragging-object", "is-dragging-rotation");
      callbacksRef.current.onDragStatus(null);
      callbacksRef.current.onDragCancel(canceled.before);
      if (canceled.kind === "rotate") callbacksRef.current.onRotateFinishRequested();
      if (canceled.kind === "scale") callbacksRef.current.onScaleFinishRequested();
      if (renderer.domElement.hasPointerCapture(canceled.pointerId)) {
        renderer.domElement.releasePointerCapture(canceled.pointerId);
      }
    };
    const clearGripHover = () => {
      setHoveredGrip(null);
      setHoveredEntityKey(null);
      renderer.domElement.style.cursor = "default";
    };
    const commitPointerDrag = (event: PointerEvent) => finishDrag(event, true);
    const cancelPointerDrag = (event: PointerEvent) => finishDrag(event, false);

    renderer.domElement.addEventListener("pointerdown", selectAndPrepareDrag);
    renderer.domElement.addEventListener("pointermove", moveDrag);
    renderer.domElement.addEventListener("pointerleave", clearGripHover);
    renderer.domElement.addEventListener("pointerup", commitPointerDrag);
    renderer.domElement.addEventListener("pointercancel", cancelPointerDrag);
    window.addEventListener("keydown", cancelWithEscape);

    const resize = () => {
      const { clientWidth, clientHeight } = mount;
      if (!clientWidth || !clientHeight) return;
      renderer.setSize(clientWidth, clientHeight, false);
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
      } else {
        fitView(viewTargetRef.current);
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    let animationFrame = 0;
    let activePreviewMode: "arc" | "boundary" | "break" | "chamfer" | "circle" | "extend" | "fillet" | "line" | "mirror" | "offset" | "polyline" | "rectangle" | "trim" | null = null;
    const render = () => {
      animationFrame = requestAnimationFrame(render);
      const nextPreviewMode = arcModeRef.current
        ? "arc"
        : boundaryModeRef.current
        ? "boundary"
        : breakModeRef.current
        ? "break"
        : chamferModeRef.current
        ? "chamfer"
        : circleModeRef.current
        ? "circle"
        : lineModeRef.current
        ? "line"
        : mirrorModeRef.current
          ? "mirror"
        : offsetModeRef.current
          ? "offset"
        : filletModeRef.current
          ? "fillet"
        : trimModeRef.current
          ? "trim"
        : extendModeRef.current
          ? "extend"
        : polylineModeRef.current
          ? "polyline"
          : rectangleModeRef.current
            ? "rectangle"
            : null;
      if (nextPreviewMode !== activePreviewMode) {
        activePreviewMode = nextPreviewMode;
        linePreview.visible = false;
        trackingGuide.visible = false;
        snapMarker.visible = false;
        setDynamicArcInput(null);
        setDynamicCircleInput(null);
        setDynamicLineInput(null);
        setDynamicPolylineInput(null);
        setDynamicRectangleInput(null);
      }
      if (!arcModeRef.current && !boundaryModeRef.current && !breakModeRef.current && !chamferModeRef.current && !circleModeRef.current && !extendModeRef.current && !filletModeRef.current && !lengthenModeRef.current && !lineModeRef.current && !mirrorModeRef.current && !offsetModeRef.current && !polylineModeRef.current && !rectangleModeRef.current && !trimModeRef.current) {
        linePreview.visible = false;
        trackingGuide.visible = false;
        snapMarker.visible = false;
      }
      const pendingArcCommand = arcCommandRef.current;
      if (arcModeRef.current && pendingArcCommand && pendingArcCommand.id > processedArcCommandIdRef.current) {
        processedArcCommandIdRef.current = pendingArcCommand.id;
        const method = arcMethodRef.current;
        const continueSeed = arcContinueSeedRef.current;
        const points = arcPointsRef.current;
        const finishExactArc = (geometry: ArcGeometry | null) => {
          if (geometry && callbacksRef.current.onArcCreate(geometry)) {
            arcPointsRef.current = [];
            arcCursorRef.current = null;
            callbacksRef.current.onArcPointsChange([]);
            linePreview.visible = false;
            trackingGuide.visible = false;
            snapMarker.visible = false;
            setDynamicArcInput(null);
            callbacksRef.current.onDragStatus(null);
            callbacksRef.current.onArcFinishRequested();
            callbacksRef.current.onLineCommandFeedback({ message: `${arcMethodDefinition(method).label} Arc placed with a ${formatArchitectural(geometry.radius)} radius and ${Math.round(arcSweepAngle(geometry) * 100) / 100}° sweep. Press Enter to repeat Arc.`, tone: "success" });
          } else {
            callbacksRef.current.onLineCommandFeedback({ message: `Those inputs cannot form a valid ${arcMethodDefinition(method).label} Arc.`, tone: "error" });
          }
        };
        if (pendingArcCommand.kind === "scalar") {
          finishExactArc(arcGeometryFromMethodScalar(method, points, pendingArcCommand.scalar, pendingArcCommand.value));
        } else {
          const previous = method === "continue" ? continueSeed?.start ?? null : points.at(-1) ?? null;
          const coordinate = pendingArcCommand.kind === "coordinate"
            ? snapLinePoint(pendingArcCommand.point)
            : previous && arcCursorRef.current
              ? lineFromDirection(previous, { ...arcCursorRef.current, z: previous.z }, pendingArcCommand.distance)?.end ?? null
              : null;
          if (!coordinate) {
            callbacksRef.current.onLineCommandFeedback({ message: previous ? "Move the pointer to establish a direction before entering a distance." : `Specify the Arc ${arcPointStage(method, points.length)} first.`, tone: "error" });
          } else if ((points[0] || continueSeed?.start) && Math.abs(coordinate.z - (points[0] ?? continueSeed?.start ?? coordinate).z) >= 1 / 16) {
            callbacksRef.current.onLineCommandFeedback({ message: "Arc construction points must remain on one elevation plane.", tone: "error" });
          } else if (previous && lineLength({ start: previous, end: coordinate }) < 1 / 16) {
            callbacksRef.current.onLineCommandFeedback({ message: "Choose a different Arc input point.", tone: "error" });
          } else if (method !== "continue" && points.length < 2) {
            arcPointsRef.current = [...points, coordinate];
            arcCursorRef.current = coordinate;
            callbacksRef.current.onArcPointsChange(arcPointsRef.current);
            callbacksRef.current.onDragStatus({ distance: previous ? lineLength({ start: previous, end: coordinate }) : 0, kind: "arc", snapped: false, valid: true });
            callbacksRef.current.onLineCommandFeedback({ message: `Arc input accepted. Specify the ${arcPointStage(method, arcPointsRef.current.length)}.`, tone: "success" });
          } else {
            finishExactArc(arcGeometryFromMethodPointer(method, points, coordinate, continueSeed));
          }
        }
      }
      const pendingCircleCommand = circleCommandRef.current;
      if (circleModeRef.current && pendingCircleCommand && pendingCircleCommand.id > processedCircleCommandIdRef.current) {
        processedCircleCommandIdRef.current = pendingCircleCommand.id;
        const method = circleMethodRef.current;
        const points = circlePointsRef.current;
        const previous = points.at(-1) ?? null;
        const coordinate = pendingCircleCommand.kind === "coordinate"
          ? snapLinePoint(pendingCircleCommand.point)
          : pendingCircleCommand.kind === "distance" && previous && circleCursorRef.current
            ? lineFromDirection(previous, { ...circleCursorRef.current, z: previous.z }, pendingCircleCommand.distance)?.end ?? null
            : null;
        if (pendingCircleCommand.kind === "scalar") {
          const tangentConstraints = circleTangentConstraintsRef.current;
          const geometry = method === "tangent-tangent-radius" && tangentConstraints.length === 2
            ? circleFromTwoTangenciesRadius(tangentConstraints[0].constraint, tangentConstraints[1].constraint, pendingCircleCommand.value)
            : points[0] && method === "center-diameter"
            ? circleFromCenterDiameter(points[0], pendingCircleCommand.value)
            : points[0] && method === "center-radius"
              ? circleFromCenterRadius(points[0], pendingCircleCommand.value)
              : null;
          if (geometry && callbacksRef.current.onCircleCreate(geometry)) {
            circleTangentConstraintsRef.current = [];
            circlePointsRef.current = [];
            circleCursorRef.current = null;
            callbacksRef.current.onCirclePointsChange([]);
            linePreview.visible = false;
            trackingGuide.visible = false;
            snapMarker.visible = false;
            setDynamicCircleInput(null);
            callbacksRef.current.onDragStatus(null);
            callbacksRef.current.onCircleFinishRequested();
            callbacksRef.current.onLineCommandFeedback({ message: `${circleMethodDefinition(method).label} Circle placed. Press Enter to repeat Circle.`, tone: "success" });
          } else {
            callbacksRef.current.onLineCommandFeedback({ message: method === "tangent-tangent-radius" ? "Select two valid tangent objects before entering the radius." : `Specify the Circle center before entering a ${method === "center-diameter" ? "diameter" : "radius"}.`, tone: "error" });
          }
        } else if (!coordinate) {
          callbacksRef.current.onLineCommandFeedback({ message: previous ? "Move the pointer to establish a direction before entering a distance." : `Specify the Circle ${circlePointStage(method, points.length)} as an exact point.`, tone: "error" });
        } else if (points[0] && Math.abs(coordinate.z - points[0].z) >= 1 / 16) {
          callbacksRef.current.onLineCommandFeedback({ message: "Circle construction points must remain on one elevation plane.", tone: "error" });
        } else if (!circlePointCompletes(method, points.length)) {
          circlePointsRef.current = [...points, coordinate];
          circleCursorRef.current = coordinate;
          callbacksRef.current.onCirclePointsChange(circlePointsRef.current);
          snapMarker.position.set(coordinate.x, coordinate.y, coordinate.z + 0.9);
          snapMarker.visible = true;
          callbacksRef.current.onDragStatus({ distance: previous ? planarDistance(previous, coordinate) : 0, kind: "circle", snapped: false, valid: true });
          callbacksRef.current.onLineCommandFeedback({ message: `Circle input accepted. Specify the ${circlePointStage(method, circlePointsRef.current.length)}.`, tone: "success" });
        } else {
          const geometry = circleGeometryFromPointer(method, points, coordinate);
          if (geometry && callbacksRef.current.onCircleCreate(geometry)) {
            circlePointsRef.current = [];
            circleCursorRef.current = null;
            callbacksRef.current.onCirclePointsChange([]);
            linePreview.visible = false;
            trackingGuide.visible = false;
            snapMarker.visible = false;
            setDynamicCircleInput(null);
            callbacksRef.current.onDragStatus(null);
            callbacksRef.current.onCircleFinishRequested();
            callbacksRef.current.onLineCommandFeedback({ message: `${circleMethodDefinition(method).label} Circle placed with a ${formatArchitectural(geometry.radius)} radius. Press Enter to repeat Circle.`, tone: "success" });
          } else {
            callbacksRef.current.onLineCommandFeedback({ message: `Those inputs cannot form a valid ${circleMethodDefinition(method).label} Circle.`, tone: "error" });
          }
        }
      }
      const pendingPolylineCommand = polylineCommandRef.current;
      if (
        polylineModeRef.current &&
        pendingPolylineCommand &&
        pendingPolylineCommand.id > processedPolylineCommandIdRef.current
      ) {
        processedPolylineCommandIdRef.current = pendingPolylineCommand.id;
        const vertices = polylinePointsRef.current;
        const acceptPolylinePoint = (point: LinePoint) => {
          const currentVertices = polylinePointsRef.current;
          const previous = currentVertices.at(-1);
          if (!previous) {
            polylineElevationRef.current = point.z;
            polylinePointsRef.current = [point];
            polylineBulgesRef.current = [];
            polylineCursorRef.current = point;
            polylineArcThroughRef.current = null;
            callbacksRef.current.onPolylineAnchorChange(point);
            snapMarker.position.set(point.x, point.y, point.z + 0.9);
            snapMarker.visible = true;
            callbacksRef.current.onDragStatus({ distance: 0, kind: "polyline", snapped: false, valid: true });
            callbacksRef.current.onLineCommandFeedback({ message: `Polyline starts at ${formatSignedArchitectural(point.x)}, ${formatSignedArchitectural(point.y)}, ${formatSignedArchitectural(point.z)}.`, tone: "success" });
            return;
          }
          if (Math.abs(point.z - polylineElevationRef.current) >= 1 / 16) {
            callbacksRef.current.onLineCommandFeedback({ message: "Every Polyline point must stay on the first point's elevation plane.", tone: "error" });
            return;
          }
          if (polylineSegmentModeRef.current === "arc" && !polylineArcThroughRef.current) {
            polylineArcThroughRef.current = point;
            polylineCursorRef.current = point;
            callbacksRef.current.onLineCommandFeedback({ message: "Arc through-point accepted. Specify the Arc endpoint.", tone: "success" });
            return;
          }
          const geometry = { start: { ...previous, z: polylineElevationRef.current }, end: point };
          if (lineLength(geometry) < 1 / 16) {
            callbacksRef.current.onLineCommandFeedback({ message: "That point would create a zero-length Polyline segment.", tone: "error" });
            return;
          }
          const bulge = polylineSegmentModeRef.current === "arc" && polylineArcThroughRef.current
            ? polylineBulgeFromThreePoints(previous, polylineArcThroughRef.current, point)
            : 0;
          if (bulge === null) {
            callbacksRef.current.onLineCommandFeedback({ message: "Those three points cannot form a valid Polyline Arc segment.", tone: "error" });
            return;
          }
          polylinePointsRef.current = [...currentVertices, point];
          polylineBulgesRef.current = [...polylineBulgesRef.current, bulge];
          polylineCursorRef.current = point;
          polylineArcThroughRef.current = null;
          polylineEscapeArmedRef.current = false;
          callbacksRef.current.onPolylineAnchorChange(point);
          linePreview.visible = false;
          trackingGuide.visible = false;
          setDynamicPolylineInput(null);
          callbacksRef.current.onDragStatus({ angle: lineAngle(geometry), distance: lineLength(geometry), kind: "polyline", snapped: false, valid: true });
          callbacksRef.current.onLineCommandFeedback({ message: `${polylineSegmentModeRef.current === "arc" ? "Arc" : "Line"} segment accepted. Continue, Undo, Close, or press Enter to finish.`, tone: "success" });
        };
        if (pendingPolylineCommand.kind === "coordinate") {
          const point = snapLinePoint(pendingPolylineCommand.point);
          acceptPolylinePoint(point);
        } else if (pendingPolylineCommand.kind === "distance") {
          const previous = vertices.at(-1);
          const start = previous ? { ...previous, z: polylineElevationRef.current } : null;
          const geometry = start && polylineCursorRef.current
            ? lineFromDirection(start, { ...polylineCursorRef.current, z: polylineElevationRef.current }, pendingPolylineCommand.distance)
            : null;
          if (geometry) {
            acceptPolylinePoint(geometry.end);
          } else {
            callbacksRef.current.onLineCommandFeedback({ message: start ? "Move the pointer away from the last vertex to establish a direction." : "Specify the first Polyline point before entering a distance.", tone: "error" });
          }
        } else if (pendingPolylineCommand.kind === "undo") {
          if (polylineArcThroughRef.current) {
            polylineArcThroughRef.current = null;
            callbacksRef.current.onLineCommandFeedback({ message: "Removed the pending Polyline Arc through-point.", tone: "success" });
          } else if (!vertices.length) {
            callbacksRef.current.onLineCommandFeedback({ message: "There is no Polyline vertex to undo.", tone: "error" });
          } else {
            polylinePointsRef.current = vertices.slice(0, -1);
            polylineBulgesRef.current = polylineBulgesRef.current.slice(0, Math.max(0, polylinePointsRef.current.length - 1));
            const point = polylinePointsRef.current.at(-1);
            const linePoint = point ? { ...point, z: polylineElevationRef.current } : null;
            polylineCursorRef.current = linePoint;
            polylineEscapeArmedRef.current = false;
            callbacksRef.current.onPolylineAnchorChange(linePoint);
            linePreview.visible = false;
            trackingGuide.visible = false;
            setDynamicPolylineInput(null);
            callbacksRef.current.onDragStatus({ distance: 0, kind: "polyline", snapped: false, valid: true });
            callbacksRef.current.onLineCommandFeedback({ message: point ? "Removed the previous Polyline vertex." : "Removed the first Polyline point. Specify a new first point.", tone: "success" });
          }
        } else {
          const closed = pendingPolylineCommand.kind === "close";
          const minimum = closed ? 3 : 2;
          if (vertices.length < minimum) {
            callbacksRef.current.onLineCommandFeedback({ message: closed ? "Add at least three vertices before closing the Polyline." : "Add at least two vertices before finishing the Polyline.", tone: "error" });
          } else if (callbacksRef.current.onPolylineCreate({ bulges: closed ? [...polylineBulgesRef.current, 0] : polylineBulgesRef.current, closed, elevation: polylineElevationRef.current, vertices, width: polylineWidthRef.current }, "polyline")) {
            polylinePointsRef.current = [];
            polylineBulgesRef.current = [];
            polylineArcThroughRef.current = null;
            polylineCursorRef.current = null;
            polylineEscapeArmedRef.current = false;
            callbacksRef.current.onPolylineAnchorChange(null);
            callbacksRef.current.onPolylineFinishRequested();
            callbacksRef.current.onLineCommandFeedback({ message: `${closed ? "Closed" : "Finished"} the Polyline. Press Enter to repeat Polyline.`, tone: "success" });
          } else {
            callbacksRef.current.onLineCommandFeedback({ message: "The Polyline could not be created inside the supported drawing area.", tone: "error" });
          }
        }
      }
      const pendingRectangleCommand = rectangleCommandRef.current;
      if (
        rectangleModeRef.current &&
        pendingRectangleCommand &&
        pendingRectangleCommand.id > processedRectangleCommandIdRef.current
      ) {
        processedRectangleCommandIdRef.current = pendingRectangleCommand.id;
        if (pendingRectangleCommand.kind === "coordinate") {
          const point = snapLinePoint(pendingRectangleCommand.point);
          if (!rectangleStartRef.current) {
            rectangleStartRef.current = point;
            rectangleCursorRef.current = point;
            rectangleEscapeArmedRef.current = false;
            callbacksRef.current.onRectangleAnchorChange(point);
            snapMarker.position.set(point.x, point.y, point.z + 0.9);
            snapMarker.visible = true;
            callbacksRef.current.onDragStatus({ distance: 0, kind: "rectangle", snapped: false, valid: true });
            callbacksRef.current.onLineCommandFeedback({ message: `Rectangle starts at ${formatSignedArchitectural(point.x)}, ${formatSignedArchitectural(point.y)}, ${formatSignedArchitectural(point.z)}.`, tone: "success" });
          } else if (Math.abs(point.z - rectangleStartRef.current.z) >= 1 / 16) {
            callbacksRef.current.onLineCommandFeedback({ message: "The opposite Rectangle corner must stay on the first corner's elevation plane.", tone: "error" });
          } else {
            const rectangle = rectangleFromDraftSettings(rectangleStartRef.current, point, rectangleDraftSettingsRef.current);
            if (rectangle && callbacksRef.current.onPolylineCreate(rectangle, "rectangle")) {
              callbacksRef.current.onRectangleAnchorChange(null);
              callbacksRef.current.onRectangleFinishRequested();
              callbacksRef.current.onLineCommandFeedback({ message: `Rectangle placed with the ${rectangleDraftSettingsRef.current.method} method. Press Enter to repeat Rectangle.`, tone: "success" });
            } else {
              callbacksRef.current.onLineCommandFeedback({ message: "The Rectangle needs non-zero width and height inside the drawing area.", tone: "error" });
            }
          }
        } else {
          const start = rectangleStartRef.current;
          const rectangle = start ? rectangleFromDimensions(start, rectangleCursorRef.current, pendingRectangleCommand.width, pendingRectangleCommand.height, start.z, rectangleConstructionOptions(rectangleDraftSettingsRef.current)) : null;
          if (rectangle && callbacksRef.current.onPolylineCreate(rectangle, "rectangle")) {
            callbacksRef.current.onRectangleAnchorChange(null);
            callbacksRef.current.onRectangleFinishRequested();
            callbacksRef.current.onLineCommandFeedback({ message: "Rectangle placed at the entered dimensions. Press Enter to repeat Rectangle.", tone: "success" });
          } else {
            callbacksRef.current.onLineCommandFeedback({ message: start ? "Those Rectangle dimensions extend outside the supported drawing area." : "Specify the first corner before entering Rectangle dimensions.", tone: "error" });
          }
        }
      }
      const pendingLineCommand = lineCommandRef.current;
      if (
        lineModeRef.current &&
        pendingLineCommand &&
        pendingLineCommand.id > processedLineCommandIdRef.current
      ) {
        processedLineCommandIdRef.current = pendingLineCommand.id;
        if (pendingLineCommand.kind === "coordinate") {
          const point = snapLinePoint(pendingLineCommand.point);
          if (!lineStartRef.current) {
            lineStartRef.current = point;
            lineCursorRef.current = point;
            linePointHistoryRef.current = [point];
            lineEscapeArmedRef.current = false;
            callbacksRef.current.onLineAnchorChange(point);
            snapMarker.position.set(point.x, point.y, point.z + 0.9);
            snapMarker.visible = true;
            callbacksRef.current.onDragStatus({ distance: 0, kind: "line", snapped: false, valid: true });
            callbacksRef.current.onLineCommandFeedback({ message: `Line starts at ${formatSignedArchitectural(point.x)}, ${formatSignedArchitectural(point.y)}, ${formatSignedArchitectural(point.z)}.`, tone: "success" });
          } else {
            const start = lineStartRef.current;
            if (callbacksRef.current.onLineCreate(start, point)) {
              lineStartRef.current = point;
              lineCursorRef.current = point;
              linePointHistoryRef.current = [...linePointHistoryRef.current, point];
              lineEscapeArmedRef.current = false;
              callbacksRef.current.onLineAnchorChange(point);
              linePreview.visible = false;
              trackingGuide.visible = false;
              setDynamicLineInput(null);
              callbacksRef.current.onDragStatus({ angle: lineAngle({ start, end: point }), distance: lineLength({ start, end: point }), kind: "line", snapped: false, valid: true });
              callbacksRef.current.onLineCommandFeedback({ message: "Exact endpoint accepted. Continue the line or press Escape to finish.", tone: "success" });
            } else {
              callbacksRef.current.onLineCommandFeedback({ message: "That endpoint would create an invalid or zero-length line.", tone: "error" });
            }
          }
        } else if (pendingLineCommand.kind === "distance") {
          const start = lineStartRef.current;
          const directionPoint = lineCursorRef.current;
          const geometry = start && directionPoint
            ? lineFromDirection(start, directionPoint, pendingLineCommand.distance)
            : null;
          if (geometry && callbacksRef.current.onLineCreate(geometry.start, geometry.end)) {
            lineStartRef.current = geometry.end;
            lineCursorRef.current = geometry.end;
            linePointHistoryRef.current = [...linePointHistoryRef.current, geometry.end];
            lineEscapeArmedRef.current = false;
            callbacksRef.current.onLineAnchorChange(geometry.end);
            linePreview.visible = false;
            trackingGuide.visible = false;
            setDynamicLineInput(null);
            snapMarker.position.set(geometry.end.x, geometry.end.y, geometry.end.z + 0.9);
            snapMarker.visible = true;
            callbacksRef.current.onDragStatus({ angle: lineAngle(geometry), distance: lineLength(geometry), kind: "line", snapped: false, valid: true });
            callbacksRef.current.onLineCommandFeedback({ message: `Drew ${formatArchitectural(lineLength(geometry))} at ${lineAngle(geometry)}°.`, tone: "success" });
          } else {
            callbacksRef.current.onLineCommandFeedback({ message: start ? "Move the pointer away from the start point to establish a direction." : "Specify the first point before entering a distance.", tone: "error" });
          }
        } else if (pendingLineCommand.kind === "undo") {
          if (linePointHistoryRef.current.length < 2 || !callbacksRef.current.onLineUndoSegment()) {
            callbacksRef.current.onLineCommandFeedback({ message: "There is no completed Line segment to undo.", tone: "error" });
          } else {
            linePointHistoryRef.current = linePointHistoryRef.current.slice(0, -1);
            const point = linePointHistoryRef.current.at(-1)!;
            lineStartRef.current = point;
            lineCursorRef.current = point;
            lineEscapeArmedRef.current = false;
            callbacksRef.current.onLineAnchorChange(point);
            linePreview.visible = false;
            trackingGuide.visible = false;
            setDynamicLineInput(null);
            snapMarker.position.set(point.x, point.y, point.z + 0.9);
            snapMarker.visible = true;
            callbacksRef.current.onDragStatus({ distance: 0, kind: "line", snapped: false, valid: true });
            callbacksRef.current.onLineCommandFeedback({ message: "Removed the previous Line segment. Continue from the restored endpoint.", tone: "success" });
          }
        } else {
          const first = linePointHistoryRef.current[0];
          const start = lineStartRef.current;
          if (!first || !start || linePointHistoryRef.current.length < 3) {
            callbacksRef.current.onLineCommandFeedback({ message: "Draw at least two segments before using Close.", tone: "error" });
          } else if (callbacksRef.current.onLineCreate(start, first)) {
            callbacksRef.current.onLineFinishRequested();
            callbacksRef.current.onLineCommandFeedback({ message: "Closed the chained Line segments.", tone: "success" });
          } else {
            callbacksRef.current.onLineCommandFeedback({ message: "The Line chain could not be closed.", tone: "error" });
          }
        }
      }
      if (cameraTransition) {
        const elapsed = performance.now() - cameraTransition.startedAt;
        const progress = Math.min(elapsed / cameraTransition.duration, 1);
        const eased = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
        camera.position.lerpVectors(
          cameraTransition.fromPosition,
          cameraTransition.toPosition,
          eased,
        );
        camera.quaternion.slerpQuaternions(
          cameraTransition.fromQuaternion,
          cameraTransition.toQuaternion,
          eased,
        );
        controls.target.lerpVectors(
          cameraTransition.fromTarget,
          cameraTransition.toTarget,
          eased,
        );
        camera.updateMatrixWorld();
        if (progress >= 1) {
          camera.position.copy(cameraTransition.toPosition);
          camera.quaternion.copy(cameraTransition.toQuaternion);
          controls.target.copy(cameraTransition.toTarget);
          cameraTransition = null;
          controls.enabled = true;
          controls.update();
        }
      } else {
        controls.update();
      }
      cameraOrientationRef.current.copy(camera.quaternion);
      if (boxGripSet.group.visible) {
        const viewportHeight = Math.max(renderer.domElement.clientHeight, 1);
        boxGripSet.handles.forEach((handle) => {
          const worldUnitsPerPixel = camera instanceof THREE.PerspectiveCamera
            ? (2 * camera.position.distanceTo(handle.position) * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / viewportHeight
            : (camera.top - camera.bottom) / (camera.zoom * viewportHeight);
          handle.scale.setScalar(worldUnitsPerPixel * (handle.userData.screenPixels ?? 10));
        });
      }
      if (lineGripSet.group.visible) {
        const viewportHeight = Math.max(renderer.domElement.clientHeight, 1);
        lineGripSet.handles.forEach((handle) => {
          const worldUnitsPerPixel = camera instanceof THREE.PerspectiveCamera
            ? (2 * camera.position.distanceTo(handle.position) * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / viewportHeight
            : (camera.top - camera.bottom) / (camera.zoom * viewportHeight);
          handle.scale.setScalar(worldUnitsPerPixel * (handle.userData.screenPixels ?? 10));
        });
      }
      if (polylineGripSet.group.visible) {
        const viewportHeight = Math.max(renderer.domElement.clientHeight, 1);
        polylineGripSet.handles.forEach((handle) => {
          if (!handle.visible) return;
          const worldUnitsPerPixel = camera instanceof THREE.PerspectiveCamera
            ? (2 * camera.position.distanceTo(handle.position) * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / viewportHeight
            : (camera.top - camera.bottom) / (camera.zoom * viewportHeight);
          handle.scale.setScalar(worldUnitsPerPixel * (handle.userData.screenPixels ?? 10));
        });
      }
      if (circleGripSet.group.visible) {
        const viewportHeight = Math.max(renderer.domElement.clientHeight, 1);
        circleGripSet.handles.forEach((handle) => {
          const worldUnitsPerPixel = camera instanceof THREE.PerspectiveCamera
            ? (2 * camera.position.distanceTo(handle.position) * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / viewportHeight
            : (camera.top - camera.bottom) / (camera.zoom * viewportHeight);
          handle.scale.setScalar(worldUnitsPerPixel * (handle.userData.screenPixels ?? 10));
        });
      }
      if (arcGripSet.group.visible) {
        const viewportHeight = Math.max(renderer.domElement.clientHeight, 1);
        arcGripSet.handles.forEach((handle) => {
          const worldUnitsPerPixel = camera instanceof THREE.PerspectiveCamera
            ? (2 * camera.position.distanceTo(handle.position) * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / viewportHeight
            : (camera.top - camera.bottom) / (camera.zoom * viewportHeight);
          handle.scale.setScalar(worldUnitsPerPixel * (handle.userData.screenPixels ?? 10));
        });
      }
      renderer.render(scene, camera);
    };
    render();

    return () => {
      if (objectSnapAcquisitionTimerRef.current !== null) window.clearTimeout(objectSnapAcquisitionTimerRef.current);
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      window.removeEventListener("keydown", cancelWithEscape);
      renderer.domElement.removeEventListener("pointerdown", setMiddleMode, true);
      renderer.domElement.removeEventListener("pointerdown", selectAndPrepareDrag);
      renderer.domElement.removeEventListener("pointermove", moveDrag);
      renderer.domElement.removeEventListener("pointerup", commitPointerDrag);
      renderer.domElement.removeEventListener("pointercancel", cancelPointerDrag);
      renderer.domElement.removeEventListener("pointerleave", clearGripHover);
      renderer.domElement.removeEventListener("pointerleave", clearGripHover);
      controls.dispose();
      objectViews.forEach((view) => disposeViewportObject(scene, view));
      objectViews.clear();
      lineViews.forEach((view) => disposeViewportLine(scene, view));
      lineViews.clear();
      wallViews.forEach((view) => disposeWallView(scene, view));
      wallViews.clear();
      polylineViews.forEach((view) => disposeViewportLine(scene, view));
      polylineViews.clear();
      floorPlatformViews.forEach((view) => disposeFloorPlatformView(scene, view));
      floorPlatformViews.clear();
      roomPlatformViews.forEach((view) => disposeFloorPlatformView(scene, view));
      roomPlatformViews.clear();
      circleViews.forEach((view) => disposeViewportLine(scene, view));
      circleViews.clear();
      arcViews.forEach((view) => disposeViewportLine(scene, view));
      arcViews.clear();
      scene.remove(linePreview, trackingGuide, snapMarker);
      linePreviewGeometry.dispose();
      (linePreview.material as THREE.Material).dispose();
      trackingGuideGeometry.dispose();
      (trackingGuide.material as THREE.Material).dispose();
      snapMarker.geometry.dispose();
      (snapMarker.material as THREE.Material).dispose();
      disposeMoveGizmo(scene, moveGizmo);
      moveGizmoRef.current = null;
      disposeRotationGizmo(scene, rotationGizmo);
      rotationGizmoRef.current = null;
      disposeScaleGizmo(scene, scaleGizmo);
      scaleGizmoRef.current = null;
      disposeBoxGripSet(scene, boxGripSet);
      boxGripSetRef.current = null;
      disposeLineGripSet(scene, lineGripSet);
      lineGripSetRef.current = null;
      disposePolylineGripSet(scene, polylineGripSet);
      polylineGripSetRef.current = null;
      disposeCircleGripSet(scene, circleGripSet);
      circleGripSetRef.current = null;
      disposeArcGripSet(scene, arcGripSet);
      arcGripSetRef.current = null;
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      fitViewRef.current = null;
      applyViewRef.current = null;
      cubeOrbitRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const divisions = Math.max(2, Math.round(960 / gridSpacing));
    const colors = interfaceTheme === "light" ? [0x7f9bb0, 0xc7d1d7] : [0x5d7188, 0x2a3541];
    const grid = new THREE.GridHelper(divisions * gridSpacing, divisions, colors[0], colors[1]);
    grid.rotation.set(...gridPlacementRef.current.rotation);
    grid.position.set(...gridPlacementRef.current.position);
    grid.visible = gridVisible;
    const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
    materials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.62;
    });
    scene.add(grid);
    gridRef.current = grid;
    return () => {
      scene.remove(grid);
      grid.geometry.dispose();
      materials.forEach((material) => material.dispose());
      if (gridRef.current === grid) gridRef.current = null;
    };
  }, [gridSpacing, gridVisible, interfaceTheme]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.background = new THREE.Color(interfaceTheme === "light" ? 0xf1f3f3 : 0x151b22);
  }, [interfaceTheme]);

  useEffect(() => {
    if (skipNextViewApplyRef.current) {
      skipNextViewApplyRef.current = false;
      return;
    }
    applyViewRef.current?.(viewTarget);
  }, [viewTarget]);

  useEffect(() => {
    const initialArcPoints = arcMode && arcMethod === "continue" && arcContinueSeed ? [{ ...arcContinueSeed.start }] : [];
    arcPointsRef.current = initialArcPoints;
    arcCursorRef.current = null;
    onArcPointsChange(initialArcPoints);
    circlePointsRef.current = [];
    circleTangentConstraintsRef.current = [];
    circleCursorRef.current = null;
    onCirclePointsChange([]);
    if (!lineMode) {
      lineStartRef.current = null;
      lineCursorRef.current = null;
      linePointHistoryRef.current = [];
      lineEscapeArmedRef.current = false;
      onLineAnchorChange(null);
    }
    if (polylineSegmentMode === "line") polylineArcThroughRef.current = null;
    if (!polylineMode) {
      polylinePointsRef.current = [];
      polylineBulgesRef.current = [];
      polylineArcThroughRef.current = null;
      polylineCursorRef.current = null;
      polylineEscapeArmedRef.current = false;
      onPolylineAnchorChange(null);
    }
    if (!rectangleMode) {
      rectangleStartRef.current = null;
      rectangleCursorRef.current = null;
      rectangleEscapeArmedRef.current = false;
      onRectangleAnchorChange(null);
    }
  }, [arcContinueSeed, arcMethod, arcMode, circleMethod, circleMode, lineMode, onArcPointsChange, onCirclePointsChange, onLineAnchorChange, onPolylineAnchorChange, onRectangleAnchorChange, polylineMode, polylineSegmentMode, rectangleMode]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const currentIds = new Set(document.objects.map((object) => object.id));
    objectViewsRef.current.forEach((view, objectId) => {
      if (!currentIds.has(objectId)) {
        disposeViewportObject(scene, view);
        objectViewsRef.current.delete(objectId);
      }
    });
    document.objects.forEach((object) => {
      let view = objectViewsRef.current.get(object.id);
      if (!view) {
        view = createViewportObject(scene, object.id);
        objectViewsRef.current.set(object.id, view);
      }
      const { dimensions } = object;
      const layer = findLayer(document, object.layerId);
      const visible = layer?.visible ?? true;
      view.mesh.visible = visible;
      view.edges.visible = visible;
      view.mesh.scale.set(dimensions.length, dimensions.width, dimensions.height);
      const center = boxWorldPoint(object, 0.5, 0.5, 0.5);
      view.mesh.position.set(center.x, center.y, center.z);
      view.mesh.rotation.set(0, 0, THREE.MathUtils.degToRad(object.rotationZ));
      view.edges.scale.copy(view.mesh.scale);
      view.edges.position.copy(view.mesh.position);
      view.edges.rotation.copy(view.mesh.rotation);
    });
    const currentLineIds = new Set(document.lines.map((line) => line.id));
    lineViewsRef.current.forEach((view, lineId) => {
      if (!currentLineIds.has(lineId)) {
        disposeViewportLine(scene, view);
        lineViewsRef.current.delete(lineId);
      }
    });
    document.lines.forEach((line) => {
      let view = lineViewsRef.current.get(line.id);
      if (!view) {
        view = createViewportLine(scene, line.id);
        lineViewsRef.current.set(line.id, view);
      }
      updateViewportLine(view, line);
      view.line.visible = findLayer(document, line.layerId)?.visible ?? true;
    });
    const currentWallIds = new Set(document.lines.filter((line) => line.architecturalRole !== null).map((line) => line.id));
    wallViewsRef.current.forEach((view, lineId) => {
      if (!currentWallIds.has(lineId)) {
        disposeWallView(scene, view);
        wallViewsRef.current.delete(lineId);
      }
    });
    const wallLines = document.lines.filter((line) => line.architecturalRole === "wall");
    const wallJoinPlan = buildAutomaticWallJoinPlan(wallLines, document.building.wallTypes);
    const wallLinesById = new Map(wallLines.map((line) => [line.id, line]));
    const wallTypesById = new Map(document.building.wallTypes.map((wallType) => [wallType.id, wallType]));
    const openingTypesById = new Map(document.building.openingTypes.map((openingType) => [openingType.id, openingType]));
    const headerTypesById = new Map(document.building.headerTypes.map((headerType) => [headerType.id, headerType]));
    wallLines.forEach((line) => {
      let view = wallViewsRef.current.get(line.id);
      if (!view) {
        view = createWallView(scene);
        wallViewsRef.current.set(line.id, view);
      }
      const vertical = wallVerticalExtent(document, line);
      const wallType = document.building.wallTypes.find((candidate) => candidate.id === line.wallTypeId);
      if (vertical && wallType) updateWallView(view, line, vertical, wallType, wallJoinPlan, wallLinesById, wallTypesById, openingTypesById, headerTypesById, document.building.wallFraming, viewTarget.id !== "top");
      view.group.visible = Boolean(vertical && wallType && (findLayer(document, line.layerId)?.visible ?? true));
    });
    const foundationWallLines = document.lines.filter((line) => line.architecturalRole === "foundation-wall");
    const foundationWallJoinPlan = buildAutomaticFoundationWallJoinPlan(foundationWallLines, document.building.foundationWallTypes);
    const foundationWallLinesById = new Map(foundationWallLines.map((line) => [line.id, line]));
    const foundationWallTypesById = new Map(document.building.foundationWallTypes.map((type) => [type.id, type]));
    foundationWallLines.forEach((line) => {
      let view = wallViewsRef.current.get(line.id);
      if (!view) {
        view = createWallView(scene);
        wallViewsRef.current.set(line.id, view);
      }
      const vertical = foundationWallVerticalExtent(document, line);
      const foundationType = document.building.foundationWallTypes.find((candidate) => candidate.id === line.foundationWallTypeId);
      if (vertical && foundationType) updateFoundationWallView(view, line, vertical, foundationType, foundationWallJoinPlan, foundationWallLinesById, foundationWallTypesById);
      view.group.visible = Boolean(vertical && foundationType && (findLayer(document, line.layerId)?.visible ?? true));
    });
    const currentPolylineIds = new Set(document.polylines.map((polyline) => polyline.id));
    polylineViewsRef.current.forEach((view, polylineId) => {
      if (!currentPolylineIds.has(polylineId)) {
        disposeViewportLine(scene, view);
        polylineViewsRef.current.delete(polylineId);
      }
    });
    document.polylines.forEach((polyline) => {
      let view = polylineViewsRef.current.get(polyline.id);
      if (!view) {
        view = createViewportPolyline(scene, polyline.id);
        polylineViewsRef.current.set(polyline.id, view);
      }
      updateViewportPolyline(view, polyline);
      const visible = findLayer(document, polyline.layerId)?.visible ?? true;
      view.line.visible = visible;
      if (view.fill) view.fill.visible = visible && (polyline.width ?? 0) >= 1 / 16;
    });
    const currentFloorIds = new Set(document.polylines.filter((polyline) => polyline.architecturalRole === "floor-platform").map((polyline) => polyline.id));
    floorPlatformViewsRef.current.forEach((view, polylineId) => {
      if (!currentFloorIds.has(polylineId)) {
        disposeFloorPlatformView(scene, view);
        floorPlatformViewsRef.current.delete(polylineId);
      }
    });
    document.polylines.filter((polyline) => polyline.architecturalRole === "floor-platform").forEach((polyline) => {
      let view = floorPlatformViewsRef.current.get(polyline.id);
      if (!view) {
        view = createFloorPlatformView(scene);
        floorPlatformViewsRef.current.set(polyline.id, view);
      }
      const story = document.building.stories.find((candidate) => candidate.id === polyline.storyId);
      if (story) updateFloorPlatformView(view, polyline, story);
      view.group.visible = Boolean(story && (findLayer(document, polyline.layerId)?.visible ?? true));
    });
    const currentRoomIds = new Set(document.rooms.map((room) => room.id));
    roomPlatformViewsRef.current.forEach((view, roomId) => {
      if (!currentRoomIds.has(roomId)) {
        disposeFloorPlatformView(scene, view);
        roomPlatformViewsRef.current.delete(roomId);
      }
    });
    document.rooms.forEach((room) => {
      let view = roomPlatformViewsRef.current.get(room.id);
      if (!view) {
        view = createFloorPlatformView(scene);
        roomPlatformViewsRef.current.set(room.id, view);
      }
      const solution = roomHorizontalPlatformSolution(document, room);
      if (solution) updateRoomPlatformView(view, solution);
      const boundaryWallsVisible = room.boundaryWallIds.some((wallId) => {
        const wall = document.lines.find((line) => line.id === wallId);
        return Boolean(wall && (findLayer(document, wall.layerId)?.visible ?? true));
      });
      view.group.visible = Boolean(solution && boundaryWallsVisible);
    });
    const currentCircleIds = new Set(document.circles.map((circle) => circle.id));
    circleViewsRef.current.forEach((view, circleId) => {
      if (!currentCircleIds.has(circleId)) {
        disposeViewportLine(scene, view);
        circleViewsRef.current.delete(circleId);
      }
    });
    document.circles.forEach((circle) => {
      let view = circleViewsRef.current.get(circle.id);
      if (!view) {
        view = createViewportCircle(scene, circle.id);
        circleViewsRef.current.set(circle.id, view);
      }
      updateViewportCircle(view, circle);
      view.line.visible = findLayer(document, circle.layerId)?.visible ?? true;
    });
    const currentArcIds = new Set(document.arcs.map((arc) => arc.id));
    arcViewsRef.current.forEach((view, arcId) => {
      if (!currentArcIds.has(arcId)) {
        disposeViewportLine(scene, view);
        arcViewsRef.current.delete(arcId);
      }
    });
    document.arcs.forEach((arc) => {
      let view = arcViewsRef.current.get(arc.id);
      if (!view) {
        view = createViewportArc(scene, arc.id);
        arcViewsRef.current.set(arc.id, view);
      }
      updateViewportArc(view, arc);
      view.line.visible = findLayer(document, arc.layerId)?.visible ?? true;
    });
    const selectedObject = findBoxObject(document, selectedObjectId);
    const selectedRefs = selectedEntityKeys
      .map(cadEntityRefFromKey)
      .filter((ref): ref is CadEntityRef => ref !== null);
    const selectionCanRotate = selectedRefs.length > 0 &&
      selectedRefs.every((ref) => modelEntityIsEditable(document, ref));
    const gizmo = moveGizmoRef.current;
    const canShowSelectionTools = Boolean(
      selectedObject &&
      selectedObjectIds.every((objectId) => {
        const object = findBoxObject(document, objectId);
        return object && objectIsEditable(document, object);
      }),
    );
    if (gizmo) {
      const canShowMoveGizmo = canShowSelectionTools && !breakMode && !chamferMode && !extendMode && !filletMode && !lengthenMode && !mirrorMode && !offsetMode && !rotateMode && !scaleMode && !stretchMode && !trimMode && (
        copyMode || moveMode || selectedObjectIds.length > 1
      );
      gizmo.group.visible = canShowMoveGizmo;
      if (canShowMoveGizmo && selectedObject) {
        const corner = boxWorldPoint(selectedObject, 1, 1, 1);
        gizmo.group.position.set(corner.x, corner.y, corner.z);
      }
    }
    const rotationGizmo = rotationGizmoRef.current;
    if (rotationGizmo) {
      const rotationBase = modelSelectionRotationBase(document, selectedRefs, rotationBaseKey);
      const selectionBounds = modelSelectionBounds(document, selectedRefs);
      const canShowRotation = selectionCanRotate && rotateMode && Boolean(rotationBase && selectionBounds);
      rotationGizmo.group.visible = canShowRotation;
      if (canShowRotation && rotationBase && selectionBounds) {
        const radius = Math.max(
          selectionBounds.maximum.x - selectionBounds.minimum.x,
          selectionBounds.maximum.y - selectionBounds.minimum.y,
          24,
        ) * 0.62 + 14;
        rotationGizmo.group.position.set(rotationBase.x, rotationBase.y, rotationBase.z);
        rotationGizmo.ring.scale.setScalar(radius);
      }
    }
    const scaleGizmo = scaleGizmoRef.current;
    if (scaleGizmo) {
      const scaleBase = modelSelectionScaleBase(document, selectedRefs, scaleBaseKey);
      const selectionBounds = modelSelectionBounds(document, selectedRefs);
      const canShowScale = selectionCanRotate && scaleMode && Boolean(scaleBase && selectionBounds);
      const wasVisible = scaleGizmo.group.visible;
      scaleGizmo.group.visible = canShowScale;
      if (canShowScale && scaleBase && selectionBounds) {
        const signature = `${selectedEntityKeys.join("|")}:${scaleBaseKey}`;
        if (!wasVisible || scaleGizmo.group.userData.selectionSignature !== signature) {
          scaleGizmo.group.userData.referenceRadius = Math.max(
            selectionBounds.maximum.x - selectionBounds.minimum.x,
            selectionBounds.maximum.y - selectionBounds.minimum.y,
            24,
          ) * 0.62 + 14;
          scaleGizmo.group.userData.selectionSignature = signature;
        }
        const radius = scaleGizmo.group.userData.referenceRadius as number;
        scaleGizmo.group.position.set(scaleBase.x, scaleBase.y, scaleBase.z);
        scaleGizmo.guide.scale.x = radius;
        scaleGizmo.handle.position.set(radius, 0, 0);
      }
    }
    const gripSet = boxGripSetRef.current;
    if (gripSet) {
      const canShowGrips = canShowSelectionTools && !breakMode && !chamferMode && !copyMode && !extendMode && !filletMode && !lengthenMode && !mirrorMode && !offsetMode && !moveMode && !rotateMode && !scaleMode && !stretchMode && !trimMode && selectedObjectIds.length === 1;
      gripSet.group.visible = canShowGrips;
      if (canShowGrips && selectedObject) updateBoxGripPositions(gripSet, selectedObject);
    }
    const lineGripSet = lineGripSetRef.current;
    const selectedLine = findLineObject(document, selectedLineId);
    if (lineGripSet) {
      const canShowLineGrips = Boolean(selectedLine && lineIsEditable(document, selectedLine) && !lineMode && !breakMode && !chamferMode && !copyMode && !extendMode && !filletMode && !lengthenMode && !mirrorMode && !offsetMode && !moveMode && !rotateMode && !scaleMode && !stretchMode && !trimMode);
      lineGripSet.group.visible = canShowLineGrips;
      if (canShowLineGrips && selectedLine) updateLineGripPositions(lineGripSet, selectedLine);
    }
    const polylineGripSet = polylineGripSetRef.current;
    const selectedPolyline = findPolylineObject(document, selectedPolylineId);
    if (polylineGripSet) {
      const canShowPolylineGrips = Boolean(selectedPolyline && polylineIsEditable(document, selectedPolyline) && !polylineMode && !rectangleMode && !breakMode && !chamferMode && !copyMode && !extendMode && !filletMode && !lengthenMode && !mirrorMode && !offsetMode && !moveMode && !rotateMode && !scaleMode && !stretchMode && !trimMode);
      polylineGripSet.group.visible = canShowPolylineGrips;
      if (canShowPolylineGrips && selectedPolyline) updatePolylineGripPositions(polylineGripSet, selectedPolyline);
    }
    const circleGripSet = circleGripSetRef.current;
    const selectedCircle = findCircleObject(document, selectedCircleId);
    if (circleGripSet) {
      const canShowCircleGrips = Boolean(selectedCircle && circleIsEditable(document, selectedCircle) && !circleMode && !breakMode && !chamferMode && !copyMode && !extendMode && !filletMode && !lengthenMode && !mirrorMode && !offsetMode && !moveMode && !rotateMode && !scaleMode && !stretchMode && !trimMode);
      circleGripSet.group.visible = canShowCircleGrips;
      if (canShowCircleGrips && selectedCircle) updateCircleGripPositions(circleGripSet, selectedCircle);
    }
    const arcGripSet = arcGripSetRef.current;
    const selectedArc = findArcObject(document, selectedArcId);
    if (arcGripSet) {
      const canShowArcGrips = Boolean(selectedArc && arcIsEditable(document, selectedArc) && !arcMode && !breakMode && !chamferMode && !copyMode && !extendMode && !filletMode && !lengthenMode && !mirrorMode && !offsetMode && !moveMode && !rotateMode && !scaleMode && !stretchMode && !trimMode);
      arcGripSet.group.visible = canShowArcGrips;
      if (canShowArcGrips && selectedArc) updateArcGripPositions(arcGripSet, selectedArc);
    }
    if (objectCountRef.current !== document.objects.length) {
      objectCountRef.current = document.objects.length;
      if (!copyMode) fitViewRef.current?.();
    }
    if (lineCountRef.current !== document.lines.length) {
      lineCountRef.current = document.lines.length;
      if (!lineMode) fitViewRef.current?.();
    }
    if (polylineCountRef.current !== document.polylines.length) {
      polylineCountRef.current = document.polylines.length;
      if (!polylineMode && !rectangleMode) fitViewRef.current?.();
    }
    if (circleCountRef.current !== document.circles.length) {
      circleCountRef.current = document.circles.length;
      if (!circleMode) fitViewRef.current?.();
    }
    if (arcCountRef.current !== document.arcs.length) {
      arcCountRef.current = document.arcs.length;
      if (!arcMode) fitViewRef.current?.();
    }
  }, [arcMode, breakMode, chamferMode, circleMode, copyMode, document, extendMode, filletMode, lengthenMode, lineMode, mirrorMode, moveMode, offsetMode, polylineMode, rectangleMode, rotateMode, rotationBaseKey, scaleBaseKey, scaleMode, selectedArcId, selectedCircleId, selectedEntityKeys, selectedLineId, selectedObjectId, selectedObjectIds, selectedPolylineId, stretchMode, trimMode, viewTarget.id]);

  useEffect(() => {
    const selectedIds = new Set(selectedEntityKeys
      .map(cadEntityRefFromKey)
      .filter((ref): ref is CadEntityRef => ref?.kind === "box")
      .map((ref) => ref.id));
    objectViewsRef.current.forEach((view, objectId) => {
      const selectedObject = selectedIds.has(objectId);
      const primaryObject = objectId === selectedObjectId;
      const hoveredObject = hoveredEntityKey === cadEntityKey({ id: objectId, kind: "box" });
      const object = findBoxObject(document, objectId);
      const layer = findLayer(document, object?.layerId ?? null);
      const layerColor = layer ? Number.parseInt(layer.color.slice(1), 16) : 0x66788a;
      view.materials.forEach((material, index) => {
        const selectedFace = objectId === selectedObjectId && index === selectedFaceIndex;
        material.color.setHex(
          selectedFace ? 0xf2bd5b : selectedObject ? primaryObject ? 0xd7a64b : 0xa98345 : hoveredObject ? 0x4ba6c8 : layerColor,
        );
        material.emissive.setHex(selectedFace ? 0x4a2b06 : hoveredObject ? 0x082a38 : 0x000000);
        material.opacity = selectedObject || hoveredObject ? 0.95 : 0.84;
      });
      (view.edges.material as THREE.LineBasicMaterial).color.setHex(
        primaryObject ? 0xffe3a3 : selectedObject ? 0xd5b16d : hoveredObject ? 0x87d8f3 : 0x8da0b2,
      );
    });
  }, [arcMode, circleMode, copyMode, document, hoveredEntityKey, lineMode, moveMode, polylineMode, rectangleMode, rotateMode, rotationBaseKey, selectedEntityKeys, selectedFaceIndex, selectedObjectId, selectedObjectIds]);

  useEffect(() => {
    lineViewsRef.current.forEach((view, lineId) => {
      const selected = selectedEntityKeys.includes(cadEntityKey({ id: lineId, kind: "line" }));
      const hovered = hoveredEntityKey === cadEntityKey({ id: lineId, kind: "line" });
      const line = findLineObject(document, lineId);
      const layer = findLayer(document, line?.layerId ?? null);
      view.material.color.setHex(selected ? 0xf2bd5b : hovered ? 0x6fd8f5 : layer ? Number.parseInt(layer.color.slice(1), 16) : 0x88bff0);
      view.fillMaterial?.color.setHex(selected ? 0xd9a53f : hovered ? 0x4fb7d6 : layer ? Number.parseInt(layer.color.slice(1), 16) : 0x88bff0);
      if (view.fillMaterial) view.fillMaterial.opacity = selected || hovered ? 0.58 : 0.38;
      view.material.linewidth = selected || hovered ? 2 : 1;
    });
    wallViewsRef.current.forEach((view, lineId) => {
      const selected = selectedEntityKeys.includes(cadEntityKey({ id: lineId, kind: "line" }));
      const hovered = hoveredEntityKey === cadEntityKey({ id: lineId, kind: "line" });
      view.materials.forEach((material) => {
        material.emissive.setHex(selected ? 0x422906 : hovered ? 0x063345 : 0x000000);
        const baseOpacity = typeof material.userData.baseOpacity === "number" ? material.userData.baseOpacity : 0.92;
        material.opacity = selected || hovered ? Math.min(1, baseOpacity + 0.18) : baseOpacity;
      });
    });
  }, [document, hoveredEntityKey, selectedEntityKeys]);

  useEffect(() => {
    polylineViewsRef.current.forEach((view, polylineId) => {
      const selected = selectedEntityKeys.includes(cadEntityKey({ id: polylineId, kind: "polyline" }));
      const hovered = hoveredEntityKey === cadEntityKey({ id: polylineId, kind: "polyline" });
      const polyline = findPolylineObject(document, polylineId);
      const layer = findLayer(document, polyline?.layerId ?? null);
      view.material.color.setHex(selected ? 0xf2bd5b : hovered ? 0x6fd8f5 : layer ? Number.parseInt(layer.color.slice(1), 16) : 0x88bff0);
    });
    floorPlatformViewsRef.current.forEach((view, polylineId) => {
      const selected = selectedEntityKeys.includes(cadEntityKey({ id: polylineId, kind: "polyline" }));
      const hovered = hoveredEntityKey === cadEntityKey({ id: polylineId, kind: "polyline" });
      view.materials.forEach((material) => {
        material.emissive.setHex(selected ? 0x422906 : hovered ? 0x063345 : 0x000000);
        material.opacity = selected || hovered ? 1 : 0.9;
      });
    });
  }, [document, hoveredEntityKey, selectedEntityKeys]);

  useEffect(() => {
    const showGeneratedRoomPlatforms = viewTarget.id !== "top";
    roomPlatformViewsRef.current.forEach((view) => {
      view.meshes.forEach((mesh) => {
        mesh.visible = showGeneratedRoomPlatforms;
      });
    });
  }, [document, viewTarget]);

  useEffect(() => {
    circleViewsRef.current.forEach((view, circleId) => {
      const selected = selectedEntityKeys.includes(cadEntityKey({ id: circleId, kind: "circle" }));
      const hovered = hoveredEntityKey === cadEntityKey({ id: circleId, kind: "circle" });
      const circle = findCircleObject(document, circleId);
      const layer = findLayer(document, circle?.layerId ?? null);
      view.material.color.setHex(selected ? 0xf2bd5b : hovered ? 0x6fd8f5 : layer ? Number.parseInt(layer.color.slice(1), 16) : 0x88bff0);
    });
  }, [document, hoveredEntityKey, selectedEntityKeys]);

  useEffect(() => {
    arcViewsRef.current.forEach((view, arcId) => {
      const selected = selectedEntityKeys.includes(cadEntityKey({ id: arcId, kind: "arc" }));
      const hovered = hoveredEntityKey === cadEntityKey({ id: arcId, kind: "arc" });
      const arc = findArcObject(document, arcId);
      const layer = findLayer(document, arc?.layerId ?? null);
      view.material.color.setHex(selected ? 0xf2bd5b : hovered ? 0x6fd8f5 : layer ? Number.parseInt(layer.color.slice(1), 16) : 0x88bff0);
    });
  }, [document, hoveredEntityKey, selectedEntityKeys]);

  useEffect(() => {
    if (fitViewSignal > 0) fitViewRef.current?.();
  }, [fitViewSignal]);

  const dragVerb = dragStatus?.kind === "object" || dragStatus?.kind === "copy"
    ? `${dragStatus.kind === "copy" ? "COPY" : "MOVE"} ${dragStatus.axis?.toUpperCase() ?? ""}`
    : dragStatus?.kind === "plan-move"
      ? "MOVE CENTER · X/Y"
    : dragStatus?.kind === "entry"
      ? `EXACT FACE · ${dragStatus.axis?.toUpperCase() ?? ""}`
    : dragStatus?.kind === "grip"
      ? `RESIZE ${dragStatus.gripKind?.toUpperCase() ?? "GRIP"}`
    : dragStatus?.kind === "rotate"
      ? "ROTATE Z"
    : dragStatus?.kind === "scale"
      ? "SCALE"
    : dragStatus?.kind === "mirror"
      ? "MIRROR AXIS"
    : dragStatus?.kind === "offset"
      ? "OFFSET"
    : dragStatus?.kind === "chamfer"
      ? "CHAMFER"
    : dragStatus?.kind === "fillet"
      ? "FILLET"
    : dragStatus?.kind === "lengthen"
      ? "LENGTHEN"
    : dragStatus?.kind === "line"
      ? "LINE"
    : dragStatus?.kind === "line-grip"
      ? "EDIT LINE"
    : dragStatus?.kind === "arc"
      ? "ARC"
    : dragStatus?.kind === "arc-grip"
      ? "EDIT ARC"
    : dragStatus?.kind === "circle"
      ? "CIRCLE"
    : dragStatus?.kind === "circle-grip"
      ? "EDIT CIRCLE"
    : dragStatus?.kind === "polyline"
      ? "POLYLINE"
    : dragStatus?.kind === "rectangle"
      ? "RECTANGLE"
    : dragStatus?.kind === "polyline-grip"
      ? "EDIT VERTEX"
    : dragStatus && dragStatus.distance < 0 ? "PUSH" : "PULL";
  const multiAxisDistanceText = dragStatus?.kind === "grip" || dragStatus?.kind === "plan-move"
    ? (["x", "y", "z"] as AxisKey[])
        .filter((axis) => dragStatus.axisDistances?.[axis] !== undefined)
        .map((axis) => `${axis.toUpperCase()} ${formatSignedArchitectural(dragStatus.axisDistances?.[axis] ?? 0)}`)
        .join(" · ")
    : "";
  const viewportSelectionIsEditable = selectedObjectIds.every((objectId) => {
    const object = findBoxObject(document, objectId);
    return object && objectIsEditable(document, object);
  });

  return (
    <div className="viewport" ref={mountRef} aria-label="3D model viewport">
      {selectionBox ? (
        <div
          className={`cad-selection-window is-${selectionBox.mode}`}
          style={{
            height: Math.abs(selectionBox.end.y - selectionBox.start.y),
            left: Math.min(selectionBox.start.x, selectionBox.end.x),
            top: Math.min(selectionBox.start.y, selectionBox.end.y),
            width: Math.abs(selectionBox.end.x - selectionBox.start.x),
          }}
          aria-hidden="true"
        >
          <span>{selectionBox.mode === "window" ? "WINDOW" : "CROSSING"}</span>
        </div>
      ) : null}
      {selectionCycle ? (
        <div
          className="cad-selection-cycle"
          style={{ left: selectionCycle.x, top: selectionCycle.y }}
          role="status"
          aria-live="polite"
        >
          <strong>{selectionCycle.label}</strong>
          <span>{selectionCycle.index + 1} of {selectionCycle.count}</span>
          <small>Click again or press Tab to cycle</small>
        </div>
      ) : null}
      <div className="viewport-badge">{viewTarget.label}</div>
      <NavigationCube
        orbitRef={cubeOrbitRef}
        orientationRef={cameraOrientationRef}
        onNavigate={onViewChange}
      />
      <button className="fit-view" type="button" onClick={() => fitViewRef.current?.()}>
        Fit view
      </button>
      {arcMode && dynamicArcInput ? (
        <div className="line-dynamic-input arc-dynamic-input" style={{ left: dynamicArcInput.x, top: dynamicArcInput.y }} aria-live="polite">
          <strong>Z {formatSignedArchitectural(dynamicArcInput.elevation)}</strong>
          <span>{dynamicArcInput.stage}</span>
          <small>{dynamicArcInput.label}</small>
        </div>
      ) : null}
      {lineMode && dynamicLineInput ? (
        <div className="line-dynamic-input" style={{ left: dynamicLineInput.x, top: dynamicLineInput.y }} aria-live="polite">
          <strong>{dynamicLineInput.distance > 0 ? formatArchitectural(dynamicLineInput.distance) : `Z ${formatSignedArchitectural(dynamicLineInput.elevation)}`}</strong>
          <span>{dynamicLineInput.distance > 0 ? `${dynamicLineInput.angle}°` : "FIRST POINT"}</span>
          <small>{dynamicLineInput.label}</small>
        </div>
      ) : null}
      {(moveMode || copyMode || stretchMode) && dynamicLineInput ? (
        <div className="line-dynamic-input" style={{ left: dynamicLineInput.x, top: dynamicLineInput.y }} aria-live="polite">
          <strong>{dynamicLineInput.distance > 0 ? formatArchitectural(dynamicLineInput.distance) : `Z ${formatSignedArchitectural(dynamicLineInput.elevation)}`}</strong>
          <span>{dynamicLineInput.distance > 0 ? `${dynamicLineInput.angle}°` : "BASE POINT"}</span>
          <small>{dynamicLineInput.label}</small>
        </div>
      ) : null}
      {(offsetMode || breakMode || chamferMode || filletMode || lengthenMode || trimMode || extendMode) && dynamicLineInput ? (
        <div className="line-dynamic-input offset-dynamic-input" style={{ left: dynamicLineInput.x, top: dynamicLineInput.y }} aria-live="polite">
          <strong>{chamferMode ? `${formatArchitectural(dynamicLineInput.distance)} × ${formatArchitectural(dynamicLineInput.angle)}` : formatArchitectural(dynamicLineInput.distance)}</strong>
          <span>{breakMode || filletMode || lengthenMode ? "PICK CURVE" : chamferMode ? "PICK LINE" : "PICK SIDE"}</span>
          <small>{dynamicLineInput.label}</small>
        </div>
      ) : null}
      {circleMode && dynamicCircleInput ? (
        <div className="line-dynamic-input circle-dynamic-input" style={{ left: dynamicCircleInput.x, top: dynamicCircleInput.y }} aria-live="polite">
          <strong>{dynamicCircleInput.radius > 0 ? `R ${formatArchitectural(dynamicCircleInput.radius)}` : `Z ${formatSignedArchitectural(dynamicCircleInput.elevation)}`}</strong>
          <span>{dynamicCircleInput.radius > 0 ? `D ${formatArchitectural(dynamicCircleInput.radius * 2)}` : dynamicCircleInput.stage}</span>
          <small>{dynamicCircleInput.label}</small>
        </div>
      ) : null}
      {polylineMode && dynamicPolylineInput ? (
        <div className="line-dynamic-input polyline-dynamic-input" style={{ left: dynamicPolylineInput.x, top: dynamicPolylineInput.y }} aria-live="polite">
          <strong>{dynamicPolylineInput.distance > 0 ? formatArchitectural(dynamicPolylineInput.distance) : `Z ${formatSignedArchitectural(dynamicPolylineInput.elevation)}`}</strong>
          <span>{dynamicPolylineInput.distance > 0 ? `${dynamicPolylineInput.angle}°` : "FIRST POINT"}</span>
          <small>{dynamicPolylineInput.label}</small>
        </div>
      ) : null}
      {rectangleMode && dynamicRectangleInput ? (
        <div className="line-dynamic-input rectangle-dynamic-input" style={{ left: dynamicRectangleInput.x, top: dynamicRectangleInput.y }} aria-live="polite">
          <strong>{dynamicRectangleInput.width > 0 ? `${formatArchitectural(dynamicRectangleInput.width)} × ${formatArchitectural(dynamicRectangleInput.height)}` : `Z ${formatSignedArchitectural(dynamicRectangleInput.elevation)}`}</strong>
          <span>{dynamicRectangleInput.width > 0 ? "WIDTH × HEIGHT" : "FIRST CORNER"}</span>
          <small>{dynamicRectangleInput.label}</small>
        </div>
      ) : null}
      {dragStatus ? (
        <div className={`${dragStatus.valid ? "drag-readout" : "drag-readout is-invalid"}${dragStatus.snapped || dragStatus.polarAngle !== null && dragStatus.polarAngle !== undefined ? " is-snapped" : ""}`}>
          <span>{dragVerb}</span>
          <strong>{dragStatus.kind === "rotate" ? `${dragStatus.angle ?? 0}°` : dragStatus.kind === "scale" ? `${dragStatus.factor ?? 1}×` : dragStatus.kind === "mirror" ? `${formatArchitectural(dragStatus.distance)} · ${dragStatus.angle ?? 0}°` : dragStatus.kind === "offset" ? formatArchitectural(dragStatus.distance) : dragStatus.kind === "line" || dragStatus.kind === "line-grip" || dragStatus.kind === "polyline" ? `${formatArchitectural(dragStatus.distance)} · ${dragStatus.angle ?? 0}°` : dragStatus.kind === "circle" || dragStatus.kind === "circle-grip" ? `R ${formatArchitectural(dragStatus.distance)}` : dragStatus.kind === "arc" || dragStatus.kind === "arc-grip" || dragStatus.kind === "rectangle" || dragStatus.kind === "polyline-grip" ? formatArchitectural(dragStatus.distance) : dragStatus.kind === "grip" || dragStatus.kind === "plan-move" ? multiAxisDistanceText : dragStatus.kind !== "face" ? formatSignedArchitectural(dragStatus.distance) : formatArchitectural(Math.abs(dragStatus.distance))}</strong>
          <small>{dragStatus.kind === "entry"
            ? dragStatus.valid ? "Enter to apply · Escape to cancel" : "Enter a valid architectural distance"
            : dragStatus.kind === "rotate"
            ? dragStatus.valid ? "15° snap · hold Shift for 1°" : "Rotation is outside the supported range"
            : dragStatus.kind === "scale"
            ? dragStatus.valid ? "0.1 factor snap · hold Shift for 0.01" : "Scale is outside the supported range"
            : dragStatus.kind === "mirror"
            ? dragStatus.valid ? `${dragStatus.snapped ? "Object snap" : "1/16 inch grid"} · click to set the second axis point` : "Mirror axis points must be different"
            : dragStatus.kind === "offset"
            ? dragStatus.valid ? "Click to create the offset on this side" : "This side cannot produce a valid offset"
            : dragStatus.kind === "line"
            ? dragStatus.distance > 0 ? `${dragStatus.snapped ? "Object snap" : dragStatus.polarAngle !== null && dragStatus.polarAngle !== undefined ? `Polar ${dragStatus.polarAngle}°` : "1/16 inch grid"} · click or type distance` : "Choose a start point"
            : dragStatus.kind === "line-grip"
            ? dragStatus.snapped ? "Endpoint or midpoint snap" : "1/16 inch grid"
            : dragStatus.kind === "arc"
            ? dragStatus.valid ? "Three-point Arc · click or enter the next point" : "Choose a non-collinear endpoint"
            : dragStatus.kind === "arc-grip"
            ? dragStatus.valid ? "Arc grip · release to apply" : "That grip position cannot form a valid Arc"
            : dragStatus.kind === "circle"
            ? dragStatus.distance > 0 ? `${dragStatus.snapped ? "Object snap" : "1/16 inch grid"} · click or type radius` : "Choose the center point"
            : dragStatus.kind === "circle-grip"
            ? dragStatus.snapped ? "Circle grip · object snap" : "Circle grip · 1/16 inch grid"
            : dragStatus.kind === "polyline"
            ? dragStatus.distance > 0 ? `${dragStatus.snapped ? "Object snap" : dragStatus.polarAngle !== null && dragStatus.polarAngle !== undefined ? `Polar ${dragStatus.polarAngle}°` : "1/16 inch grid"} · click or type distance` : "Choose the first vertex"
            : dragStatus.kind === "rectangle"
            ? dragStatus.distance > 0 ? "Click opposite corner to place" : "Choose first corner"
            : dragStatus.kind === "polyline-grip"
            ? dragStatus.snapped ? "Vertex object snap" : "Vertex · 1/16 inch grid"
            : dragStatus.kind === "plan-move"
            ? dragStatus.valid ? dragStatus.snapped ? "Work plane · object face snap" : "Work plane X/Y · 1/16 inch" : "Coordinate limit reached"
            : dragStatus.kind === "grip"
            ? dragStatus.valid ? "Opposite faces fixed · 1/16 inch" : "Minimum size reached"
            : dragStatus.kind !== "face"
            ? dragStatus.snapped ? "Object face snap" : dragStatus.valid ? dragStatus.kind === "copy" ? "Release to place copy" : "Grid snap · 1/16 inch" : dragStatus.kind === "copy" ? "Copy cannot be placed" : "Coordinate limit reached"
            : dragStatus.valid ? "Opposite face fixed" : "Minimum size reached"}</small>
        </div>
      ) : null}
      {activeGripInput && !copyMode && !moveMode && activeGripInput.objectId === selectedObjectId && activeGripInput.faceIndex === selectedFaceIndex ? (
        <form
          className={gripInputError ? "grip-dynamic-input has-error" : "grip-dynamic-input"}
          style={{ left: activeGripInput.x, top: activeGripInput.y }}
          onSubmit={(event) => {
            event.preventDefault();
            commitGripInput();
          }}
        >
          <span>{activeGripInput.axis.toUpperCase()}</span>
          <input
            ref={focusGripInput}
            value={gripDraft}
            onChange={(event) => updateGripDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitGripInput();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                closeGripInput();
              }
            }}
            aria-label="Exact face grip distance"
            placeholder={'6" or -6"'}
            spellCheck={false}
          />
          <b>ft-in</b>
          {gripInputError ? <small role="alert">{gripInputError}</small> : null}
        </form>
      ) : null}
      {selectedObjectId && !dragStatus ? <div className={`${copyMode ? "move-grip-hint is-copying" : rotateMode || scaleMode ? "move-grip-hint is-rotating" : "move-grip-hint"}${viewportSelectionIsEditable ? "" : " is-locked"}`}>{!viewportSelectionIsEditable ? "Selection locked · unlock to edit" : copyMode ? "COPY MODE · drag an axis arrow to place" : mirrorMode ? "MIRROR · pick two points for the mirror axis" : rotateMode ? "ROTATE Z · drag the gold ring · Shift for 1°" : scaleMode ? "SCALE · drag the green square · Shift for 0.01 precision" : selectedObjectIds.length > 1 ? `Drag axis arrows to move ${selectedObjectIds.length} selected objects` : moveMode ? "MOVE MODE · drag an X · Y · Z arrow" : "Center grip moves · face, edge, and corner grips resize"}</div> : null}
      {arcMode && !dragStatus ? <div className="move-grip-hint is-drawing">ARC · start point · second point · endpoint · exact coordinates accepted</div> : null}
      {lineMode && !dragStatus ? <div className="move-grip-hint is-drawing">LINE · click or type X,Y,Z · type a distance · U undoes · C closes</div> : null}
      {circleMode && !dragStatus ? <div className="move-grip-hint is-drawing">CIRCLE · click or type center · click edge or type radius · Escape exits</div> : null}
      {selectedLineId && !lineMode && !dragStatus ? <div className="move-grip-hint">Line selected · blue endpoints reshape · green midpoint moves</div> : null}
      {selectedCircleId && !circleMode && !dragStatus ? <div className="move-grip-hint">Circle selected · green center moves · blue quadrant grips resize</div> : null}
      {selectedArcId && !arcMode && !dragStatus ? <div className="move-grip-hint">Arc selected · blue endpoints and midpoint reshape · green center moves</div> : null}
      {polylineMode && !dragStatus ? <div className="move-grip-hint is-drawing">POLYLINE · click or type points · distance follows cursor · U undoes · C closes</div> : null}
      {rectangleMode && !dragStatus ? <div className="move-grip-hint is-drawing">RECTANGLE · click or type first corner · opposite corner or width × height</div> : null}
      {selectedPolylineId && !polylineMode && !rectangleMode && !dragStatus ? <div className="move-grip-hint">{(() => { const selected = document.polylines.find((polyline) => polyline.id === selectedPolylineId); return selected?.shape === "rectangle" && rectangleSupportsConstrainedGrips(selected) ? "Rectangle selected · corner and edge grips resize · center grip moves" : "Closed polyline selected · drag blue vertex grips to reshape"; })()}</div> : null}
      {viewTarget.id === "top" ? (
        <div className="axis-labels plan-ucs" aria-hidden="true">
          <i className="plan-ucs-origin" />
          <span className="plan-ucs-axis plan-ucs-x"><b>X</b></span>
          <span className="plan-ucs-axis plan-ucs-y"><b>Y</b></span>
        </div>
      ) : (
        <div className="axis-labels perspective-ucs" aria-hidden="true">
          <span className="axis-x">X</span><span className="axis-y">Y</span><span className="axis-z">Z</span>
        </div>
      )}
    </div>
  );
}

function PropertyGridSection({
  ariaLabel,
  children,
  className = "",
  meta,
  title,
}: {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  meta?: string;
  title: string;
}) {
  return (
    <details className={`property-grid-section ${className}`.trim()} open aria-label={ariaLabel}>
      <summary>
        <span className="property-disclosure" aria-hidden="true">▾</span>
        <strong>{title}</strong>
        {meta ? <small>{meta}</small> : null}
      </summary>
      <div className="property-grid-body">{children}</div>
    </details>
  );
}

function PropertyGridRow({
  children,
  className = "",
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div className={`property-table-row ${className}`.trim()}>
      <span className="property-table-label">{label}</span>
      <div className="property-table-value">{children}</div>
    </div>
  );
}

function DimensionField({
  dimensionKey,
  value,
  onCommit,
}: {
  dimensionKey: DimensionKey;
  value: number;
  onCommit: (key: DimensionKey, value: number) => void;
}) {
  const [draft, setDraft] = useState(formatArchitectural(value));
  const [error, setError] = useState("");

  const commit = () => {
    const parsed = parseArchitectural(draft);
    if (parsed === null || parsed <= 0) {
      setError("Enter a dimension greater than 0\".");
      return;
    }
    setError("");
    onCommit(dimensionKey, snapToSixteenth(parsed));
  };

  return (
    <label className="property-table-row property-input-row">
      <span className="property-table-label">{DIMENSION_LABELS[dimensionKey]}</span>
      <div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") { commit(); event.currentTarget.blur(); }
            if (event.key === "Escape") {
              setDraft(formatArchitectural(value));
              setError("");
              event.currentTarget.blur();
            }
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${dimensionKey}-error` : undefined}
          spellCheck={false}
        />
        <span>ft-in</span>
      </div>
      {error ? <small className="property-row-error" id={`${dimensionKey}-error`} role="alert">{error}</small> : null}
    </label>
  );
}

function PositionField({
  axis,
  onCommit,
  value,
}: {
  axis: AxisKey;
  onCommit: (axis: AxisKey, value: number) => void;
  value: number;
}) {
  const [draft, setDraft] = useState(formatSignedArchitectural(value));
  const [error, setError] = useState("");

  const commit = () => {
    const parsed = parseSignedArchitectural(draft);
    if (parsed === null || Math.abs(parsed) > MAXIMUM_COORDINATE) {
      setError("Enter a valid signed architectural coordinate.");
      return;
    }
    setError("");
    onCommit(axis, snapToSixteenth(parsed));
  };

  return (
    <label className="property-table-row property-input-row">
      <span className="property-table-label">{axis.toUpperCase()}</span>
      <div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") { commit(); event.currentTarget.blur(); }
            if (event.key === "Escape") {
              setDraft(formatSignedArchitectural(value));
              setError("");
              event.currentTarget.blur();
            }
          }}
          aria-label={`${axis.toUpperCase()} position`}
          aria-invalid={Boolean(error)}
          spellCheck={false}
        />
        <span>ft-in</span>
      </div>
      {error ? <small className="property-row-error" role="alert">{error}</small> : null}
    </label>
  );
}

function EditableObjectName({
  entity = "object",
  name,
  onRename,
}: {
  entity?: "group" | "object";
  name: string;
  onRename: (name: string) => boolean;
}) {
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const cancelingRef = useRef(false);
  const focusNameEditor = useCallback((input: HTMLInputElement | null) => {
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  const commit = () => {
    if (cancelingRef.current) {
      cancelingRef.current = false;
      return;
    }
    const normalized = draft.trim();
    if (!normalized) {
      setError(`Enter a ${entity} name.`);
      return;
    }
    if (!onRename(normalized)) {
      setError(`${entity === "group" ? "Group" : "Object"} names must be unique.`);
      return;
    }
    setDraft(normalized);
    setError("");
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        className="selection-name"
        onClick={() => {
          setDraft(name);
          setError("");
          setEditing(true);
        }}
        aria-label={`Rename ${entity} ${name}`}
        title="Click to rename"
      >
        {name}
      </button>
    );
  }

  return (
    <div className="selection-name-editor">
      <input
        ref={focusNameEditor}
        value={draft}
        maxLength={120}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") {
            cancelingRef.current = true;
            setDraft(name);
            setError("");
            setEditing(false);
          }
        }}
        aria-label={`Edit ${entity} name`}
        aria-invalid={Boolean(error)}
        spellCheck={false}
      />
      {error ? <small role="alert">{error}</small> : null}
    </div>
  );
}

function LayerNameField({
  name,
  onRename,
}: {
  name: string;
  onRename: (name: string) => boolean;
}) {
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState(false);

  const commit = () => {
    const normalized = draft.trim();
    if (!normalized || !onRename(normalized)) {
      setDraft(name);
      setError(true);
      return;
    }
    setDraft(normalized);
    setError(false);
  };

  return (
    <input
      className={error ? "layer-name-input is-invalid" : "layer-name-input"}
      value={draft}
      maxLength={80}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(name);
          setError(false);
          event.currentTarget.blur();
        }
      }}
      aria-label={`Layer name: ${name}`}
      title={error ? "Layer names must be unique" : "Edit layer name"}
      spellCheck={false}
    />
  );
}

function MoveObjectControl({
  onMove,
}: {
  onMove: (axis: AxisKey, distance: number) => boolean;
}) {
  const [axis, setAxis] = useState<AxisKey>("x");
  const [draft, setDraft] = useState('6"');
  const [error, setError] = useState("");

  const move = (sign: 1 | -1) => {
    const parsed = parseArchitectural(draft);
    if (parsed === null || parsed <= 0) {
      setError("Enter a positive movement distance.");
      return;
    }
    if (!onMove(axis, snapToSixteenth(parsed) * sign)) {
      setError("That move is outside the supported coordinate range.");
      return;
    }
    setError("");
  };

  return (
    <PropertyGridSection className="move-object-panel" title="Move" meta="Exact offset">
      <PropertyGridRow label="Axis">
        <div className="axis-switch" aria-label="Movement axis">
          {(["x", "y", "z"] as AxisKey[]).map((axisOption) => (
            <button
              key={axisOption}
              type="button"
              className={axis === axisOption ? "is-active" : ""}
              onClick={() => setAxis(axisOption)}
            >
              {axisOption.toUpperCase()}
            </button>
          ))}
        </div>
      </PropertyGridRow>
      <label className="property-table-row property-input-row">
        <span className="property-table-label">Distance</span>
        <div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") move(1);
              if (event.key === "Escape") { setDraft('6"'); setError(""); }
            }}
            aria-invalid={Boolean(error)}
            aria-label="Object movement distance"
            spellCheck={false}
          />
          <span>ft-in</span>
        </div>
        {error ? <small className="property-row-error" role="alert">{error}</small> : null}
      </label>
      <div className="property-action-row move-object-actions">
        <button type="button" onClick={() => move(-1)}>− {axis.toUpperCase()}</button>
        <button type="button" onClick={() => move(1)}>+ {axis.toUpperCase()}</button>
      </div>
      <p className="property-grid-note">Click a base point and target point in the drawing, or apply an exact X, Y, or Z offset here.</p>
    </PropertyGridSection>
  );
}

function CopyObjectsControl({
  onCopy,
  onFinish,
  selectionCount,
}: {
  onCopy: (axis: AxisKey, distance: number) => boolean;
  onFinish: () => void;
  selectionCount: number;
}) {
  const [axis, setAxis] = useState<AxisKey>("x");
  const [draft, setDraft] = useState('2\'');
  const [error, setError] = useState("");
  const place = (sign: 1 | -1) => {
    const parsed = parseArchitectural(draft);
    if (parsed === null || parsed <= 0) {
      setError("Enter a positive copy distance.");
      return;
    }
    if (!onCopy(axis, snapToSixteenth(parsed) * sign)) {
      setError("That copy cannot be placed there.");
      return;
    }
    setError("");
  };
  return (
    <PropertyGridSection className="copy-object-panel" title="Copy Mode" meta={`${selectionCount} entit${selectionCount === 1 ? "y" : "ies"}`}>
      <PropertyGridRow label="Axis"><div className="axis-switch" aria-label="Copy axis">{(["x", "y", "z"] as AxisKey[]).map((axisOption) => <button key={axisOption} type="button" className={axis === axisOption ? "is-active" : ""} onClick={() => setAxis(axisOption)}>{axisOption.toUpperCase()}</button>)}</div></PropertyGridRow>
      <label className="property-table-row property-input-row"><span className="property-table-label">Offset</span><div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") place(1); if (event.key === "Escape") onFinish(); }} aria-label="Copy offset distance" spellCheck={false} /><span>ft-in</span></div>{error ? <small className="property-row-error" role="alert">{error}</small> : null}</label>
      <div className="property-action-row copy-offset-actions"><button type="button" onClick={() => place(-1)}>Copy −{axis.toUpperCase()}</button><button type="button" onClick={() => place(1)}>Copy +{axis.toUpperCase()}</button></div>
      <div className="property-action-row single-action"><button type="button" onClick={onFinish}>Finish Copy</button></div>
      <p className="property-grid-note">Click a base point and target point in the drawing, or apply an exact X, Y, or Z offset here.</p>
    </PropertyGridSection>
  );
}

function AlignmentControl({
  anchorName,
  onAlign,
}: {
  anchorName: string;
  onAlign: (axis: AxisKey, mode: AlignmentMode) => void;
}) {
  const [axis, setAxis] = useState<AxisKey>("x");
  const modes: Array<{ label: string; mode: AlignmentMode }> = [
    { label: "Minimum", mode: "minimum" },
    { label: "Center", mode: "center" },
    { label: "Maximum", mode: "maximum" },
  ];
  return (
    <PropertyGridSection className="alignment-panel" title="Align Objects" meta={`Anchor: ${anchorName}`}>
      <PropertyGridRow label="Axis"><div className="axis-switch" aria-label="Alignment axis">{(["x", "y", "z"] as AxisKey[]).map((axisOption) => (
        <button key={axisOption} type="button" className={axis === axisOption ? "is-active" : ""} onClick={() => setAxis(axisOption)}>{axisOption.toUpperCase()}</button>
      ))}</div></PropertyGridRow>
      <div className="property-action-row alignment-actions">
        {modes.map(({ label, mode }) => <button key={mode} type="button" onClick={() => onAlign(axis, mode)}><b>{mode === "minimum" ? "⊣" : mode === "center" ? "↔" : "⊢"}</b><span>{label}</span></button>)}
      </div>
      <p className="property-grid-note">The last-selected object stays fixed and anchors the alignment.</p>
    </PropertyGridSection>
  );
}

function RotationControl({
  baseKey,
  currentRotation,
  onBaseChange,
  onFinish,
  onRotate,
  onStart,
  rotateMode,
  selectionCount,
}: {
  baseKey: RotationBaseKey;
  currentRotation: string;
  onBaseChange: (baseKey: RotationBaseKey) => void;
  onFinish: () => void;
  onRotate: (degrees: number) => boolean;
  onStart: () => void;
  rotateMode: boolean;
  selectionCount: number;
}) {
  const [draft, setDraft] = useState("90");
  const [error, setError] = useState("");
  const apply = (sign: 1 | -1) => {
    const normalized = draft.trim().replace(/°$/, "");
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
      setError("Enter a positive angle in degrees.");
      return;
    }
    const degrees = Number(normalized);
    if (!Number.isFinite(degrees) || degrees <= 0 || degrees > 3600) {
      setError("Enter an angle from 0° through 3600°.");
      return;
    }
    if (!onRotate(degrees * sign)) {
      setError("That rotation is outside the supported coordinate range.");
      return;
    }
    setError("");
  };
  return (
    <PropertyGridSection className="rotation-panel" title="Rotation" meta="Z axis">
      <PropertyGridRow label="Current"><span className="property-readout">{currentRotation}</span></PropertyGridRow>
      <PropertyGridRow label="Base point">
        <select className="property-cell-select" value={baseKey} onChange={(event) => onBaseChange(event.target.value as RotationBaseKey)} aria-label="Rotation base point">
          {ROTATION_BASE_DEFINITIONS.map((base) => <option key={base.key} value={base.key}>{base.label}</option>)}
        </select>
      </PropertyGridRow>
      <label className="property-table-row property-input-row">
        <span className="property-table-label">Angle</span>
        <div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}>
          <input value={draft} onChange={(event) => { setDraft(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") apply(1); if (event.key === "Escape") { setDraft("90"); setError(""); } }} aria-label="Rotation angle" aria-invalid={Boolean(error)} spellCheck={false} />
          <span>deg</span>
        </div>
        {error ? <small className="property-row-error" role="alert">{error}</small> : null}
      </label>
      <div className="property-action-row rotation-actions"><button type="button" onClick={() => apply(-1)}>↻ Clockwise</button><button type="button" onClick={() => apply(1)}>↺ Counterclockwise</button></div>
      <div className="property-action-row single-action"><button className={rotateMode ? "is-active" : ""} type="button" onClick={rotateMode ? onFinish : onStart}>{rotateMode ? "Finish Freehand Rotation" : "Start Freehand Rotation"}</button></div>
      <p className="property-grid-note">Rotates {selectionCount === 1 ? "the selected entity" : `${selectionCount} selected entities`} around the selected base point. Freehand drag snaps to 15°; hold Shift for 1°.</p>
    </PropertyGridSection>
  );
}

function ScaleControl({
  baseKey,
  onBaseChange,
  onFinish,
  onScale,
  onStart,
  scaleMode,
  selectionCount,
}: {
  baseKey: RotationBaseKey;
  onBaseChange: (baseKey: RotationBaseKey) => void;
  onFinish: () => void;
  onScale: (factor: number) => boolean;
  onStart: () => void;
  scaleMode: boolean;
  selectionCount: number;
}) {
  const [draft, setDraft] = useState("2");
  const [error, setError] = useState("");
  const apply = () => {
    const factor = Number(draft.trim().replace(/[x×]$/i, ""));
    if (!Number.isFinite(factor) || factor <= 0 || factor > 1000 || Math.abs(factor - 1) < 0.0001) {
      setError("Enter a scale factor above 0 and other than 1.");
      return;
    }
    if (!onScale(factor)) {
      setError("That factor would make the selection too small or place it outside the drawing range.");
      return;
    }
    setError("");
  };
  return (
    <PropertyGridSection className="scale-panel" title="Scale" meta="Uniform plan">
      <PropertyGridRow label="Base point">
        <select className="property-cell-select" value={baseKey} onChange={(event) => onBaseChange(event.target.value as RotationBaseKey)} aria-label="Scale base point">
          {ROTATION_BASE_DEFINITIONS.map((base) => <option key={base.key} value={base.key}>{base.label}</option>)}
        </select>
      </PropertyGridRow>
      <label className="property-table-row property-input-row">
        <span className="property-table-label">Factor</span>
        <div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}>
          <input value={draft} onChange={(event) => { setDraft(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") apply(); if (event.key === "Escape") { setDraft("2"); setError(""); } }} aria-label="Scale factor" aria-invalid={Boolean(error)} spellCheck={false} />
          <span>×</span>
        </div>
        {error ? <small className="property-row-error" role="alert">{error}</small> : null}
      </label>
      <div className="property-action-row single-action"><button type="button" onClick={apply}>Apply Exact Scale</button></div>
      <div className="property-action-row single-action"><button className={scaleMode ? "is-active" : ""} type="button" onClick={scaleMode ? onFinish : onStart}>{scaleMode ? "Finish Freehand Scale" : "Start Freehand Scale"}</button></div>
      <p className="property-grid-note">Scales {selectionCount === 1 ? "the selected entity" : `${selectionCount} selected entities`} uniformly in plan around the selected base point. Box height and drawing elevation stay unchanged.</p>
    </PropertyGridSection>
  );
}

function MirrorControl({
  keepSource,
  mirrorMode,
  onFinish,
  onKeepSourceChange,
  onQuickMirror,
  onStart,
  selectionCount,
}: {
  keepSource: boolean;
  mirrorMode: boolean;
  onFinish: () => void;
  onKeepSourceChange: (keepSource: boolean) => void;
  onQuickMirror: (orientation: "horizontal" | "vertical") => boolean;
  onStart: () => void;
  selectionCount: number;
}) {
  return (
    <PropertyGridSection className="mirror-panel" title="Mirror" meta="Two-point axis">
      <PropertyGridRow label="Keep source">
        <label className="property-checkbox"><input type="checkbox" checked={keepSource} onChange={(event) => onKeepSourceChange(event.target.checked)} /><span>{keepSource ? "Yes — create mirrored copies" : "No — replace selection"}</span></label>
      </PropertyGridRow>
      <div className="property-action-row rotation-actions"><button type="button" onClick={() => onQuickMirror("vertical")}>↔ Vertical Axis</button><button type="button" onClick={() => onQuickMirror("horizontal")}>↕ Horizontal Axis</button></div>
      <div className="property-action-row single-action"><button className={mirrorMode ? "is-active" : ""} type="button" onClick={mirrorMode ? onFinish : onStart}>{mirrorMode ? "Cancel Mirror" : "Pick Mirror Axis"}</button></div>
      <p className="property-grid-note">Mirrors {selectionCount === 1 ? "the selected entity" : `${selectionCount} selected entities`}. Pick two snapped points for any axis, or use a centered horizontal or vertical axis.</p>
    </PropertyGridSection>
  );
}

function OffsetControl({
  distance,
  keepSource,
  offsetMode,
  onDistanceChange,
  onFinish,
  onKeepSourceChange,
  onStart,
}: {
  distance: number;
  keepSource: boolean;
  offsetMode: boolean;
  onDistanceChange: (distance: number) => void;
  onFinish: () => void;
  onKeepSourceChange: (keepSource: boolean) => void;
  onStart: () => void;
}) {
  const [draft, setDraft] = useState(() => formatArchitectural(distance));
  const [error, setError] = useState("");
  const applyDistance = () => {
    const parsed = parseArchitectural(draft);
    if (parsed === null || parsed < 1 / 16) {
      setError("Enter a positive offset distance of at least 1/16 inch.");
      return;
    }
    onDistanceChange(snapToSixteenth(parsed));
    setDraft(formatArchitectural(snapToSixteenth(parsed)));
    setError("");
  };
  return (
    <PropertyGridSection className="offset-panel" title="Offset" meta="Selected 2D entity">
      <label className="property-table-row property-input-row">
        <span className="property-table-label">Distance</span>
        <div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}>
          <input value={draft} onChange={(event) => { setDraft(event.target.value); setError(""); }} onBlur={applyDistance} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setDraft(formatArchitectural(distance)); setError(""); event.currentTarget.blur(); } }} aria-label="Offset distance" aria-invalid={Boolean(error)} spellCheck={false} />
          <span>ft-in</span>
        </div>
        {error ? <small className="property-row-error" role="alert">{error}</small> : null}
      </label>
      <PropertyGridRow label="Keep source">
        <label className="property-checkbox"><input type="checkbox" checked={keepSource} onChange={(event) => onKeepSourceChange(event.target.checked)} /><span>{keepSource ? "Yes — create offset copy" : "No — replace source"}</span></label>
      </PropertyGridRow>
      <div className="property-action-row single-action"><button className={offsetMode ? "is-active" : ""} type="button" onClick={offsetMode ? onFinish : onStart}>{offsetMode ? "Cancel Offset" : "Pick Offset Side"}</button></div>
      <p className="property-grid-note">Click the side where the new Line, Polyline, Rectangle, Circle, or Arc should be created. Curves remain native editable curves.</p>
    </PropertyGridSection>
  );
}

function TrimExtendControl({
  canExtend,
  extendMode,
  onExtend,
  onFinish,
  onTrim,
  trimMode,
}: {
  canExtend: boolean;
  extendMode: boolean;
  onExtend: () => void;
  onFinish: () => void;
  onTrim: () => void;
  trimMode: boolean;
}) {
  return (
    <PropertyGridSection className="trim-extend-panel" title="Trim & Extend" meta="Quick boundaries">
      <div className="property-action-row rotation-actions">
        <button className={trimMode ? "is-active" : ""} type="button" onClick={trimMode ? onFinish : onTrim}>{trimMode ? "Cancel Trim" : "Start Trim"}</button>
        <button className={extendMode ? "is-active" : ""} type="button" onClick={extendMode ? onFinish : onExtend} disabled={!canExtend}>{extendMode ? "Cancel Extend" : "Start Extend"}</button>
      </div>
      <p className="property-grid-note">Every other visible 2D entity acts as a boundary. Trim removes the portion you click; Extend moves the nearest open endpoint to the first boundary.</p>
    </PropertyGridSection>
  );
}

function BreakControl({ mode, onCancel, stage }: { mode: BreakMode; onCancel: () => void; stage: 0 | 1 | 2 }) {
  const next = stage === 0 ? "Select curve" : stage === 1 ? "Select break point" : "Select second point";
  return (
    <PropertyGridSection className="break-panel" title={mode === "break" ? "Break" : "Break at Point"} meta="Native curve edit">
      <PropertyGridRow label="Method"><span className="property-readout">{mode === "break" ? "Remove between two points" : "Split at one point"}</span></PropertyGridRow>
      <PropertyGridRow label="Next"><span className="property-readout is-active">{next}</span></PropertyGridRow>
      <div className="property-action-row single-action"><button className="is-active" type="button" onClick={onCancel}>Cancel {mode === "break" ? "Break" : "Break at Point"}</button></div>
      <p className="property-grid-note">The resulting pieces remain editable Lines, Polylines, or Arcs. Escape cancels and restores the source.</p>
    </PropertyGridSection>
  );
}

function JoinControl({ onJoin, selectionCount }: { onJoin: () => boolean; selectionCount: number }) {
  return (
    <PropertyGridSection className="join-panel" title="Join" meta="Endpoint chain">
      <PropertyGridRow label="Selected"><span className="property-readout">{selectionCount} open curves</span></PropertyGridRow>
      <div className="property-action-row single-action"><button type="button" onClick={onJoin}>Join Selected Curves</button></div>
      <p className="property-grid-note">Creates one native Line, Arc, Circle, or Polyline when the selected endpoints form one unbranched chain at a common elevation.</p>
    </PropertyGridSection>
  );
}

function ExplodeControl({
  hasWidth,
  onExplode,
  segmentCount,
  selectionCount,
}: {
  hasWidth: boolean;
  onExplode: () => boolean;
  segmentCount: number;
  selectionCount: number;
}) {
  return (
    <PropertyGridSection className="explode-panel" title="Explode" meta="Native segments">
      <PropertyGridRow label="Selected"><span className="property-readout">{selectionCount} {selectionCount === 1 ? "Polyline" : "Polylines"}</span></PropertyGridRow>
      <PropertyGridRow label="Result"><span className="property-readout">{segmentCount} editable Lines / Arcs</span></PropertyGridRow>
      <div className="property-action-row single-action"><button type="button" onClick={onExplode}>Explode Selected Geometry</button></div>
      <p className="property-grid-note">Each straight or curved segment becomes an independent native entity on the source layer.{hasWidth ? " Constant Polyline width will be removed because Lines and Arcs do not store width." : ""}</p>
    </PropertyGridSection>
  );
}

function LengthenControl({
  method,
  mode,
  onFinish,
  onMethodChange,
  onStart,
  onValueChange,
  value,
}: {
  method: LengthenMethod;
  mode: boolean;
  onFinish: () => void;
  onMethodChange: (method: LengthenMethod) => void;
  onStart: () => void;
  onValueChange: (value: number) => void;
  value: number;
}) {
  const formatValue = () => method === "percent" ? String(value) : formatSignedArchitectural(value);
  const [draft, setDraft] = useState(formatValue);
  const [error, setError] = useState("");
  const applyValue = () => {
    const parsed = method === "percent" ? Number(draft.trim()) : method === "delta" ? parseSignedArchitectural(draft) : parseArchitectural(draft);
    if (parsed === null || !Number.isFinite(parsed) || (method === "delta" ? parsed === 0 : parsed <= 0)) {
      setError(method === "percent" ? "Enter a positive percentage." : method === "delta" ? "Enter a nonzero signed distance." : "Enter a positive total length.");
      return;
    }
    const normalized = method === "percent" ? Math.round(parsed * 1000) / 1000 : snapToSixteenth(parsed);
    onValueChange(normalized);
    setDraft(method === "percent" ? String(normalized) : formatSignedArchitectural(normalized));
    setError("");
  };
  return (
    <PropertyGridSection className="lengthen-panel" title="Lengthen" meta="Open curve endpoint">
      <label className="property-table-row"><span className="property-table-label">Method</span><select className="property-table-value property-select" value={method} onChange={(event) => { const next = event.target.value as LengthenMethod; onMethodChange(next); setError(""); }} aria-label="Lengthen method"><option value="delta">Delta</option><option value="total">Total</option><option value="percent">Percent</option><option value="dynamic">Dynamic</option></select></label>
      {method !== "dynamic" ? <label className="property-table-row property-input-row"><span className="property-table-label">{method === "percent" ? "Percent" : method === "delta" ? "Length change" : "Total length"}</span><div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}><input value={draft} onChange={(event) => { setDraft(event.target.value); setError(""); }} onBlur={applyValue} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} aria-label="Lengthen value" spellCheck={false} /><span>{method === "percent" ? "%" : "ft-in"}</span></div>{error ? <small className="property-row-error" role="alert">{error}</small> : null}</label> : null}
      <div className="property-action-row single-action"><button className={mode ? "is-active" : ""} type="button" onClick={mode ? onFinish : onStart}>{mode ? "Cancel Lengthen" : "Start Lengthen"}</button></div>
      <p className="property-grid-note">Pick the curve near the endpoint to change. Delta adds or removes length, Total sets the full curve length, Percent scales the full length, and Dynamic follows the cursor while preserving the terminal direction or arc radius.</p>
    </PropertyGridSection>
  );
}

function FilletControl({
  canApplyPolyline,
  mode,
  onApplyPolyline,
  onCancel,
  onRadiusChange,
  radius,
  stage,
}: {
  canApplyPolyline: boolean;
  mode: boolean;
  onApplyPolyline: (radius: number) => void;
  onCancel: () => void;
  onRadiusChange: (radius: number) => void;
  radius: number;
  stage: 0 | 1;
}) {
  const [draft, setDraft] = useState(() => formatArchitectural(radius));
  const [error, setError] = useState("");
  const apply = (): number | null => {
    const parsed = parseSignedArchitectural(draft);
    if (parsed === null || parsed < 0 || parsed > MAXIMUM_COORDINATE) {
      setError("Enter zero or a positive architectural radius.");
      return null;
    }
    const snapped = snapToSixteenth(parsed);
    onRadiusChange(snapped);
    setDraft(formatArchitectural(snapped));
    setError("");
    return snapped;
  };
  return (
    <PropertyGridSection className="fillet-panel" title="Fillet" meta="Curves or Polyline">
      <label className="property-table-row property-input-row">
        <span className="property-table-label">Radius</span>
        <div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}>
          <input value={draft} onChange={(event) => { setDraft(event.target.value); setError(""); }} onBlur={apply} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setDraft(formatArchitectural(radius)); setError(""); } }} aria-label="Fillet radius" aria-invalid={Boolean(error)} spellCheck={false} />
          <span>ft-in</span>
        </div>
        {error ? <small className="property-row-error" role="alert">{error}</small> : null}
      </label>
      <PropertyGridRow label="Next pick"><span className="property-readout">{stage === 0 ? "First curve" : "Second curve"}</span></PropertyGridRow>
      <div className="property-action-row"><button type="button" onClick={() => { const next = apply(); if (next !== null) onApplyPolyline(next); }} disabled={!canApplyPolyline}>Fillet Polyline</button><button className={mode ? "is-active" : ""} type="button" onClick={onCancel}>Cancel Fillet</button></div>
      <p className="property-grid-note">Pick the retained sides of two Lines or Arcs, or apply the radius to every valid corner of one selected straight-segment Polyline. Open endpoints stay fixed. The complete edit is one Undo step.</p>
    </PropertyGridSection>
  );
}

function ChamferControl({
  canApplyPolyline,
  firstDistance,
  mode,
  onApplyPolyline,
  onCancel,
  onDistanceChange,
  secondDistance,
  stage,
}: {
  canApplyPolyline: boolean;
  firstDistance: number;
  mode: boolean;
  onApplyPolyline: (first: number, second: number) => void;
  onCancel: () => void;
  onDistanceChange: (first: number, second: number) => void;
  secondDistance: number;
  stage: 0 | 1;
}) {
  const [firstDraft, setFirstDraft] = useState(() => formatArchitectural(firstDistance));
  const [secondDraft, setSecondDraft] = useState(() => formatArchitectural(secondDistance));
  const [error, setError] = useState("");
  const apply = (): { first: number; second: number } | null => {
    const first = parseSignedArchitectural(firstDraft);
    const second = parseSignedArchitectural(secondDraft);
    if (first === null || second === null || first < 0 || second < 0 || first > MAXIMUM_COORDINATE || second > MAXIMUM_COORDINATE) {
      setError("Enter zero or positive architectural distances.");
      return null;
    }
    const nextFirst = snapToSixteenth(first);
    const nextSecond = snapToSixteenth(second);
    onDistanceChange(nextFirst, nextSecond);
    setFirstDraft(formatArchitectural(nextFirst));
    setSecondDraft(formatArchitectural(nextSecond));
    setError("");
    return { first: nextFirst, second: nextSecond };
  };
  const restore = () => {
    setFirstDraft(formatArchitectural(firstDistance));
    setSecondDraft(formatArchitectural(secondDistance));
    setError("");
  };
  const distanceField = (label: string, value: string, setValue: (value: string) => void, ariaLabel: string) => (
    <label className="property-table-row property-input-row">
      <span className="property-table-label">{label}</span>
      <div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}>
        <input value={value} onChange={(event) => { setValue(event.target.value); setError(""); }} onBlur={apply} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") restore(); }} aria-label={ariaLabel} aria-invalid={Boolean(error)} spellCheck={false} />
        <span>ft-in</span>
      </div>
    </label>
  );
  return (
    <PropertyGridSection className="chamfer-panel" title="Chamfer" meta="Lines or Polyline">
      {distanceField("First distance", firstDraft, setFirstDraft, "Chamfer first distance")}
      {distanceField("Second distance", secondDraft, setSecondDraft, "Chamfer second distance")}
      {error ? <small className="property-row-error" role="alert">{error}</small> : null}
      <PropertyGridRow label="Next pick"><span className="property-readout">{stage === 0 ? "First Line" : "Second Line"}</span></PropertyGridRow>
      <div className="property-action-row"><button type="button" onClick={() => { const next = apply(); if (next) onApplyPolyline(next.first, next.second); }} disabled={!canApplyPolyline}>Chamfer Polyline</button><button className={mode ? "is-active" : ""} type="button" onClick={onCancel}>Cancel Chamfer</button></div>
      <p className="property-grid-note">The distances follow the selected path order. Pick two Lines, or apply both setbacks to every valid corner of one selected straight-segment Polyline. Open endpoints stay fixed. The complete edit is one Undo step.</p>
    </PropertyGridSection>
  );
}

function StretchControl({
  onApply,
  onCancel,
  targetCount,
}: {
  onApply: (delta: LinePoint) => boolean;
  onCancel: () => void;
  targetCount: number;
}) {
  const [xDraft, setXDraft] = useState("0");
  const [yDraft, setYDraft] = useState("0");
  const [error, setError] = useState("");
  const apply = () => {
    const x = parseSignedArchitectural(xDraft);
    const y = parseSignedArchitectural(yDraft);
    if (x === null || y === null || (Math.abs(x) < 1 / 16 && Math.abs(y) < 1 / 16)) {
      setError("Enter a nonzero signed X or Y displacement.");
      return;
    }
    if (!onApply({ x: snapToSixteenth(x), y: snapToSixteenth(y), z: 0 })) {
      setError("That displacement would create invalid geometry.");
      return;
    }
    setError("");
  };
  return (
    <PropertyGridSection className="stretch-panel" title="Stretch" meta={`${targetCount} target${targetCount === 1 ? "" : "s"}`}>
      <PropertyGridRow label="X displacement"><input value={xDraft} onChange={(event) => { setXDraft(event.target.value); setError(""); }} aria-label="Stretch X displacement" spellCheck={false} /></PropertyGridRow>
      <PropertyGridRow label="Y displacement"><input value={yDraft} onChange={(event) => { setYDraft(event.target.value); setError(""); }} aria-label="Stretch Y displacement" spellCheck={false} /></PropertyGridRow>
      <div className="property-action-row rotation-actions">
        <button type="button" onClick={apply}>Apply exact</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
      {error ? <p className="property-grid-note field-error-text">{error}</p> : null}
      <p className="property-grid-note">Click a base point and target point in the drawing, or enter signed X/Y displacements here.</p>
    </PropertyGridSection>
  );
}

function ExactMoveControl({
  model,
  onCommit,
  selectedFaceIndex,
}: {
  model: BoxModel;
  onCommit: (next: BoxModel) => void;
  selectedFaceIndex: number | null;
}) {
  const [direction, setDirection] = useState<"pull" | "push">("pull");
  const [draft, setDraft] = useState('6"');
  const [error, setError] = useState("");

  const apply = () => {
    if (selectedFaceIndex === null) return;
    const parsed = parseArchitectural(draft);
    if (parsed === null || parsed <= 0) {
      setError("Enter a positive movement distance.");
      return;
    }
    const signedDistance = direction === "pull" ? parsed : -parsed;
    const next = moveBoxFace(model, selectedFaceIndex, signedDistance);
    if (!next) {
      setError("That push would make the box too small.");
      return;
    }
    setError("");
    onCommit(next);
  };

  return (
    <PropertyGridSection className="push-pull-panel" title="Push / Pull" meta="Opposite face fixed">
      <PropertyGridRow label="Direction">
        <div className="direction-switch" aria-label="Movement direction">
          <button
            type="button"
            className={direction === "pull" ? "is-active" : ""}
            onClick={() => setDirection("pull")}
          >
            Pull
          </button>
          <button
            type="button"
            className={direction === "push" ? "is-active" : ""}
            onClick={() => setDirection("push")}
          >
            Push
          </button>
        </div>
      </PropertyGridRow>
      <label className="property-table-row property-input-row">
        <span className="property-table-label">Distance</span>
        <div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") apply();
              if (event.key === "Escape") { setDraft('6"'); setError(""); }
            }}
            disabled={selectedFaceIndex === null}
            aria-invalid={Boolean(error)}
            aria-label="Exact push or pull distance"
            spellCheck={false}
          />
          <span>ft-in</span>
        </div>
        {error ? <small className="property-row-error" role="alert">{error}</small> : null}
      </label>
      <div className="property-action-row single-action"><button className="apply-move" type="button" onClick={apply} disabled={selectedFaceIndex === null}>Apply {direction}</button></div>
      <p className="property-grid-note">{selectedFaceIndex === null ? "Select a face to enable movement." : "Drag the highlighted face or apply an exact distance."}</p>
    </PropertyGridSection>
  );
}

function ArcGeometryControl({ arc, onUpdate }: { arc: ArcObject; onUpdate: (geometry: ArcGeometry) => boolean }) {
  const updateCenter = (axis: "x" | "y" | "z", draft: string) => {
    const value = parseSignedArchitectural(draft);
    if (value === null || Math.abs(value) > MAXIMUM_COORDINATE) return false;
    return onUpdate({ ...arc, center: { ...arc.center, [axis]: snapToSixteenth(value) } });
  };
  const updateRadius = (draft: string) => {
    const value = parseArchitectural(draft);
    if (value === null || value < 1 / 16) return false;
    return onUpdate({ ...arc, radius: snapToSixteenth(value) });
  };
  const start = arcPointAtFraction(arc, 0);
  const end = arcPointAtFraction(arc, 1);
  return (
    <PropertyGridSection title="Geometry" meta="Three-point Arc">
      <LineCoordinateField label="Center X" value={arc.center.x} onCommit={(draft) => updateCenter("x", draft)} />
      <LineCoordinateField label="Center Y" value={arc.center.y} onCommit={(draft) => updateCenter("y", draft)} />
      <LineCoordinateField label="Elevation" value={arc.center.z} onCommit={(draft) => updateCenter("z", draft)} />
      <LineCoordinateField label="Radius" value={arc.radius} onCommit={updateRadius} />
      <PropertyGridRow label="Sweep"><span className="property-readout">{Math.round(arcSweepAngle(arc) * 1000) / 1000}° · {arc.counterclockwise ? "counterclockwise" : "clockwise"}</span></PropertyGridRow>
      <PropertyGridRow label="Arc length"><span className="property-readout">{formatArchitectural(arcLength(arc))}</span></PropertyGridRow>
      <PropertyGridRow label="Start"><span className="property-readout">{formatSignedArchitectural(start.x)}, {formatSignedArchitectural(start.y)}</span></PropertyGridRow>
      <PropertyGridRow label="End"><span className="property-readout">{formatSignedArchitectural(end.x)}, {formatSignedArchitectural(end.y)}</span></PropertyGridRow>
      <p className="property-grid-note">The green center grip moves the Arc. Blue endpoint and midpoint grips reshape it through three points.</p>
    </PropertyGridSection>
  );
}

function CircleGeometryControl({ circle, onUpdate }: { circle: CircleObject; onUpdate: (geometry: CircleGeometry) => boolean }) {
  const updateCenter = (axis: "x" | "y" | "z", draft: string) => {
    const value = parseSignedArchitectural(draft);
    if (value === null || Math.abs(value) > MAXIMUM_COORDINATE) return false;
    return onUpdate({ ...circle, center: { ...circle.center, [axis]: snapToSixteenth(value) } });
  };
  const updateRadius = (draft: string) => {
    const value = parseArchitectural(draft);
    if (value === null || value < 1 / 16) return false;
    return onUpdate({ ...circle, radius: snapToSixteenth(value) });
  };
  return (
    <PropertyGridSection title="Geometry" meta="Center · radius">
      <LineCoordinateField label="Center X" value={circle.center.x} onCommit={(draft) => updateCenter("x", draft)} />
      <LineCoordinateField label="Center Y" value={circle.center.y} onCommit={(draft) => updateCenter("y", draft)} />
      <LineCoordinateField label="Elevation" value={circle.center.z} onCommit={(draft) => updateCenter("z", draft)} />
      <LineCoordinateField label="Radius" value={circle.radius} onCommit={updateRadius} />
      <PropertyGridRow label="Diameter"><span className="property-readout">{formatArchitectural(circleDiameter(circle))}</span></PropertyGridRow>
      <PropertyGridRow label="Circumference"><span className="property-readout">{formatArchitectural(circleCircumference(circle))}</span></PropertyGridRow>
      <PropertyGridRow label="Area"><span className="property-readout">{(circleArea(circle) / 144).toLocaleString(undefined, { maximumFractionDigits: 2 })} sq ft</span></PropertyGridRow>
      <p className="property-grid-note">The green center grip moves the Circle. Four blue quadrant grips change its radius while keeping the center fixed.</p>
    </PropertyGridSection>
  );
}

function PolylineGeometryControl({ elevationLocked = false, polyline, onUpdate }: { elevationLocked?: boolean; polyline: PolylineObject; onUpdate: (geometry: PolylineGeometry) => boolean }) {
  const updateElevation = (draft: string) => {
    const value = parseSignedArchitectural(draft);
    if (value === null || Math.abs(value) > MAXIMUM_COORDINATE) return false;
    return onUpdate({ ...polyline, elevation: snapToSixteenth(value) });
  };
  const updateWidth = (draft: string) => {
    const value = parseSignedArchitectural(draft);
    if (value === null || value < 0 || value > MAXIMUM_COORDINATE) return false;
    return onUpdate({ ...polyline, width: snapToSixteenth(value) });
  };
  const first = polyline.vertices[0];
  const last = polyline.vertices.at(-1)!;
  const arcCount = polyline.bulges?.filter((bulge) => Math.abs(bulge) > 1e-10).length ?? 0;
  return (
    <PropertyGridSection title="Geometry" meta="XY work plane">
      {elevationLocked ? <PropertyGridRow label="Rough floor"><span className="property-readout">{formatSignedArchitectural(polyline.elevation)} · Story controlled</span></PropertyGridRow> : <LineCoordinateField label="Elevation" value={polyline.elevation} onCommit={updateElevation} />}
      <LineCoordinateField label="Constant width" value={polyline.width ?? 0} onCommit={updateWidth} unsigned />
      <PropertyGridRow label="Vertices"><span className="property-readout">{polyline.vertices.length}</span></PropertyGridRow>
      <PropertyGridRow label="Arc segments"><span className="property-readout">{arcCount}</span></PropertyGridRow>
      <PropertyGridRow label="Closed"><span className="property-readout">{polyline.closed ? "Yes" : "No"}</span></PropertyGridRow>
      {polyline.closed ? <PropertyGridRow label="Area"><span className="property-readout">{(polylineArea(polyline) / 144).toLocaleString(undefined, { maximumFractionDigits: 2 })} sq ft</span></PropertyGridRow> : null}
      <PropertyGridRow label="Total length"><span className="property-readout">{formatArchitectural(polylineLength(polyline))}</span></PropertyGridRow>
      <PropertyGridRow label="First vertex"><span className="property-readout">{formatSignedArchitectural(first.x)}, {formatSignedArchitectural(first.y)}</span></PropertyGridRow>
      <PropertyGridRow label="Last vertex"><span className="property-readout">{formatSignedArchitectural(last.x)}, {formatSignedArchitectural(last.y)}</span></PropertyGridRow>
      <p className="property-grid-note">{elevationLocked ? "Drag a blue vertex grip to reshape the footprint. Its elevation follows the assigned Story rough floor." : "Drag a blue vertex grip to reshape the Polyline. Elevation moves the complete entity to another XY work plane."}</p>
    </PropertyGridSection>
  );
}

function RectangleGeometryControl({ elevationLocked = false, rectangle, onUpdate }: { elevationLocked?: boolean; rectangle: PolylineObject; onUpdate: (geometry: PolylineGeometry) => boolean }) {
  const first = rectangle.vertices[0];
  const opposite = rectangle.vertices[2];
  const dimensions = rectangleDimensions(first, opposite);
  const updateBase = (axis: "x" | "y", draft: string) => {
    const value = parseSignedArchitectural(draft);
    if (value === null || Math.abs(value) > MAXIMUM_COORDINATE) return false;
    const snapped = snapToSixteenth(value);
    const delta = snapped - first[axis];
    return onUpdate({ ...rectangle, vertices: rectangle.vertices.map((point) => ({ ...point, [axis]: snapToSixteenth(point[axis] + delta) })) });
  };
  const updateDimension = (axis: "x" | "y", draft: string) => {
    const value = parseArchitectural(draft);
    if (value === null || value < 1 / 16) return false;
    const nextOpposite = { ...opposite };
    nextOpposite[axis] = first[axis] + Math.sign(opposite[axis] - first[axis]) * snapToSixteenth(value);
    const geometry = rectangleFromCorners(first, nextOpposite, rectangle.elevation, { width: rectangle.width ?? 0 });
    return Boolean(geometry && onUpdate(geometry));
  };
  const updateElevation = (draft: string) => {
    const value = parseSignedArchitectural(draft);
    if (value === null || Math.abs(value) > MAXIMUM_COORDINATE) return false;
    return onUpdate({ ...rectangle, elevation: snapToSixteenth(value) });
  };
  const updateWidth = (draft: string) => {
    const value = parseSignedArchitectural(draft);
    if (value === null || value < 0 || value > MAXIMUM_COORDINATE) return false;
    return onUpdate({ ...rectangle, width: snapToSixteenth(value) });
  };
  return (
    <PropertyGridSection title="Geometry" meta="Rectangular constraint">
      <LineCoordinateField label="Base X" value={first.x} onCommit={(draft) => updateBase("x", draft)} />
      <LineCoordinateField label="Base Y" value={first.y} onCommit={(draft) => updateBase("y", draft)} />
      {elevationLocked ? <PropertyGridRow label="Rough floor"><span className="property-readout">{formatSignedArchitectural(rectangle.elevation)} · Story controlled</span></PropertyGridRow> : <LineCoordinateField label="Elevation" value={rectangle.elevation} onCommit={updateElevation} />}
      <LineCoordinateField label="Constant width" value={rectangle.width ?? 0} onCommit={updateWidth} unsigned />
      <LineCoordinateField label="Width (X)" value={dimensions.width} onCommit={(draft) => updateDimension("x", draft)} />
      <LineCoordinateField label="Height (Y)" value={dimensions.height} onCommit={(draft) => updateDimension("y", draft)} />
      <PropertyGridRow label="Area"><span className="property-readout">{(dimensions.area / 144).toLocaleString(undefined, { maximumFractionDigits: 2 })} sq ft</span></PropertyGridRow>
      <PropertyGridRow label="Perimeter"><span className="property-readout">{formatArchitectural(dimensions.perimeter)}</span></PropertyGridRow>
      <p className="property-grid-note">{elevationLocked ? "Corner and edge grips reshape the footprint; the elevation follows its assigned Story rough floor." : "Corner grips resize in two directions. Edge grips resize one side. The center grip moves the rectangle."}</p>
    </PropertyGridSection>
  );
}

function LineGeometryControl({ line, onUpdate }: { line: LineObject; onUpdate: (geometry: LineGeometry) => boolean }) {
  const [lengthDraft, setLengthDraft] = useState(formatArchitectural(lineLength(line)));
  const [angleDraft, setAngleDraft] = useState(String(lineAngle(line)));
  const [elevationDraft, setElevationDraft] = useState(String(lineElevationAngle(line)));
  const [error, setError] = useState("");
  const updatePoint = (endpoint: "start" | "end", axis: "x" | "y" | "z", draft: string) => {
    const value = parseSignedArchitectural(draft);
    if (value === null || Math.abs(value) > MAXIMUM_COORDINATE) return false;
    const geometry = { start: { ...line.start }, end: { ...line.end } };
    geometry[endpoint][axis] = snapToSixteenth(value);
    return onUpdate(geometry);
  };
  const applyPolar = () => {
    const length = parseArchitectural(lengthDraft);
    const normalizedAngle = angleDraft.trim().replace(/°$/, "");
    const angle = Number(normalizedAngle);
    const elevation = Number(elevationDraft.trim().replace(/°$/, ""));
    if (length === null || length < 1 / 16 || !Number.isFinite(angle) || !Number.isFinite(elevation) || Math.abs(elevation) > 90) {
      setError("Enter a valid length, plan angle, and elevation from −90° through 90°.");
      return;
    }
    const geometry = lineFromLengthAngles(line.start, snapToSixteenth(length), angle, elevation);
    if (!geometry || !onUpdate(geometry)) {
      setError("That line is outside the supported drawing area.");
      return;
    }
    setError("");
  };
  const coordinateRows: Array<{ endpoint: "start" | "end"; axis: "x" | "y" | "z"; label: string }> = [
    { endpoint: "start", axis: "x", label: "Start X" },
    { endpoint: "start", axis: "y", label: "Start Y" },
    { endpoint: "start", axis: "z", label: "Start Z" },
    { endpoint: "end", axis: "x", label: "End X" },
    { endpoint: "end", axis: "y", label: "End Y" },
    { endpoint: "end", axis: "z", label: "End Z" },
  ];
  return (
    <>
      <PropertyGridSection title="Geometry" meta="3D coordinates">
        {coordinateRows.map(({ endpoint, axis, label }) => (
          <LineCoordinateField key={`${endpoint}-${axis}-${line[endpoint][axis]}`} label={label} value={line[endpoint][axis]} onCommit={(draft) => updatePoint(endpoint, axis, draft)} />
        ))}
      </PropertyGridSection>
      <PropertyGridSection title="Polar" meta="Start point fixed">
        <label className="property-table-row property-input-row"><span className="property-table-label">Length</span><div className="property-table-value field-shell"><input value={lengthDraft} onChange={(event) => { setLengthDraft(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") applyPolar(); }} aria-label="Line length" spellCheck={false} /><span>ft-in</span></div></label>
        <label className="property-table-row property-input-row"><span className="property-table-label">Angle</span><div className="property-table-value field-shell"><input value={angleDraft} onChange={(event) => { setAngleDraft(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") applyPolar(); }} aria-label="Line angle" spellCheck={false} /><span>deg</span></div></label>
        <label className="property-table-row property-input-row"><span className="property-table-label">Elevation</span><div className="property-table-value field-shell"><input value={elevationDraft} onChange={(event) => { setElevationDraft(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") applyPolar(); }} aria-label="Line elevation angle" spellCheck={false} /><span>deg</span></div></label>
        {error ? <p className="property-grid-note property-row-error" role="alert">{error}</p> : null}
        <div className="property-action-row single-action"><button type="button" onClick={applyPolar}>Apply Length + Angles</button></div>
        <p className="property-grid-note">Plan angles measure counterclockwise from +X. Elevation measures above or below the XY plane.</p>
      </PropertyGridSection>
    </>
  );
}

function WallGeometryControl({
  document,
  line,
  onUpdate,
}: {
  document: ModelDocument;
  line: LineObject;
  onUpdate: (geometry: LineGeometry) => boolean;
}) {
  const vertical = wallVerticalExtent(document, line);
  const referenceLabel = WALL_REFERENCE_LINE_LABELS[line.wallReferenceLine ?? "wall-center"];
  const exteriorSideLabel = line.wallExteriorSide === "right" ? "right" : "left";
  const updatePoint = (endpoint: "start" | "end", axis: "x" | "y", draft: string) => {
    const value = parseSignedArchitectural(draft);
    if (value === null || Math.abs(value) > MAXIMUM_COORDINATE) return false;
    const geometry = { start: { ...line.start }, end: { ...line.end } };
    geometry[endpoint][axis] = snapToSixteenth(value);
    return onUpdate(geometry);
  };
  return (
    <PropertyGridSection title="Geometry" meta="Story controlled">
      <LineCoordinateField label="Start X" value={line.start.x} onCommit={(draft) => updatePoint("start", "x", draft)} />
      <LineCoordinateField label="Start Y" value={line.start.y} onCommit={(draft) => updatePoint("start", "y", draft)} />
      <LineCoordinateField label="End X" value={line.end.x} onCommit={(draft) => updatePoint("end", "x", draft)} />
      <LineCoordinateField label="End Y" value={line.end.y} onCommit={(draft) => updatePoint("end", "y", draft)} />
      <PropertyGridRow label="Length"><span className="property-readout">{formatArchitectural(Math.hypot(line.end.x - line.start.x, line.end.y - line.start.y))}</span></PropertyGridRow>
      <PropertyGridRow label="Plan angle"><span className="property-readout">{lineAngle(line)}°</span></PropertyGridRow>
      <PropertyGridRow label="Automatic base"><span className="property-readout">{vertical ? formatSignedArchitectural(vertical.baseElevation) : "—"}</span></PropertyGridRow>
      <PropertyGridRow label="Automatic top"><span className="property-readout">{vertical ? formatSignedArchitectural(vertical.topElevation) : "—"}</span></PropertyGridRow>
      <PropertyGridRow label="Wall height"><span className="property-readout">{vertical ? formatArchitectural(vertical.height) : "—"}</span></PropertyGridRow>
      <PropertyGridRow label="Vertical source"><span className="property-readout">{vertical?.source === "rooms" ? `${vertical.adjacentRoomIds.length} adjacent Room${vertical.adjacentRoomIds.length === 1 ? "" : "s"}` : "Story defaults"}</span></PropertyGridRow>
      <p className="property-grid-note">X and Y define the {referenceLabel.toLowerCase()}. Looking from Start to End, the exterior is on the {exteriorSideLabel}; base and top automatically follow adjacent Room rough conditions, then fall back to the Story defaults.</p>
      {vertical?.hasDifferentRoomFloors || vertical?.hasDifferentRoomCeilings ? <p className="property-grid-note">Adjacent Rooms have different rough conditions. This Wall spans their full structural envelope; stepped finish profiles will be generated separately.</p> : null}
    </PropertyGridSection>
  );
}

function FoundationWallGeometryControl({
  document,
  line,
  onUpdate,
}: {
  document: ModelDocument;
  line: LineObject;
  onUpdate: (geometry: LineGeometry) => boolean;
}) {
  const vertical = foundationWallVerticalExtent(document, line);
  const type = document.building.foundationWallTypes.find((candidate) => candidate.id === line.foundationWallTypeId);
  const referenceLabel = WALL_REFERENCE_LINE_LABELS[line.wallReferenceLine ?? "exterior-main"];
  const exteriorSideLabel = line.wallExteriorSide === "right" ? "right" : "left";
  const updatePoint = (endpoint: "start" | "end", axis: "x" | "y", draft: string) => {
    const value = parseSignedArchitectural(draft);
    if (value === null || Math.abs(value) > MAXIMUM_COORDINATE) return false;
    const geometry = { start: { ...line.start }, end: { ...line.end } };
    geometry[endpoint][axis] = snapToSixteenth(value);
    return onUpdate(geometry);
  };
  return (
    <PropertyGridSection title="Geometry" meta="Story-controlled foundation">
      <LineCoordinateField label="Start X" value={line.start.x} onCommit={(draft) => updatePoint("start", "x", draft)} />
      <LineCoordinateField label="Start Y" value={line.start.y} onCommit={(draft) => updatePoint("start", "y", draft)} />
      <LineCoordinateField label="End X" value={line.end.x} onCommit={(draft) => updatePoint("end", "x", draft)} />
      <LineCoordinateField label="End Y" value={line.end.y} onCommit={(draft) => updatePoint("end", "y", draft)} />
      <PropertyGridRow label="Length"><span className="property-readout">{formatArchitectural(Math.hypot(line.end.x - line.start.x, line.end.y - line.start.y))}</span></PropertyGridRow>
      <PropertyGridRow label="Concrete top"><span className="property-readout">{vertical ? formatSignedArchitectural(vertical.topElevation) : "—"}</span></PropertyGridRow>
      <PropertyGridRow label="Concrete bottom"><span className="property-readout">{vertical ? formatSignedArchitectural(vertical.baseElevation) : "—"}</span></PropertyGridRow>
      <PropertyGridRow label="Footing bottom"><span className="property-readout">{vertical ? formatSignedArchitectural(vertical.footingBottomElevation) : "—"}</span></PropertyGridRow>
      <PropertyGridRow label="Sill top"><span className="property-readout">{vertical ? formatSignedArchitectural(vertical.sillTopElevation) : "—"}</span></PropertyGridRow>
      <p className="property-grid-note">X and Y define the {referenceLabel.toLowerCase()}. Looking from Start to End, the exterior is on the {exteriorSideLabel}. Concrete, footing, and foundation-hosted sill geometry comes from {type?.name ?? "the assigned Foundation Wall type"}.</p>
    </PropertyGridSection>
  );
}

function WallOpeningNameField({ opening, onUpdate }: { opening: WallOpening; onUpdate: (change: Partial<WallOpening>) => boolean }) {
  const [draft, setDraft] = useState(opening.name);
  const [error, setError] = useState(false);
  const commit = () => {
    if (!onUpdate({ name: draft })) {
      setDraft(opening.name);
      setError(true);
      return;
    }
    setError(false);
  };
  return (
    <label className="property-table-row property-input-row"><span className="property-table-label">Name</span><div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}><input value={draft} onChange={(event) => { setDraft(event.target.value); setError(false); }} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setDraft(opening.name); setError(false); event.currentTarget.blur(); } }} aria-label="Opening name" spellCheck={false} /></div></label>
  );
}

function WallOpeningComponentMaterialField({ material, onUpdate }: { material: string; onUpdate: (material: string) => boolean }) {
  const [draft, setDraft] = useState(material);
  const [error, setError] = useState(false);
  const commit = () => {
    const next = draft.trim();
    if (!next || !onUpdate(next)) {
      setDraft(material);
      setError(true);
      return;
    }
    setError(false);
  };
  return <label className="property-table-row property-input-row"><span className="property-table-label">Part material</span><div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}><input value={draft} onChange={(event) => { setDraft(event.target.value); setError(false); }} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setDraft(material); setError(false); event.currentTarget.blur(); } }} aria-label="Opening component material" spellCheck={false} /></div></label>;
}

function WallOpeningsControl({
  building,
  line,
  onAdd,
  onAssignType,
  onDelete,
  onUpdate,
}: {
  building: BuildingStructure;
  line: LineObject;
  onAdd: (kind: WallOpeningKind) => string | null;
  onAssignType: (openingId: string, typeId: string) => boolean;
  onDelete: (openingId: string) => void;
  onUpdate: (openingId: string, change: Partial<WallOpening>) => boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(line.wallOpenings[0]?.id ?? null);
  const initialOpeningType = building.openingTypes.find((type) => type.id === line.wallOpenings[0]?.wallOpeningTypeId) ?? null;
  const [selectedComponentId, setSelectedComponentId] = useState(initialOpeningType?.components[0]?.id ?? "");
  const opening = line.wallOpenings.find((candidate) => candidate.id === selectedId) ?? line.wallOpenings.at(-1) ?? null;
  const add = (kind: WallOpeningKind) => {
    const id = onAdd(kind);
    if (id) setSelectedId(id);
  };
  const updateDimension = (field: "centerOffset" | "headerBottomHeight", draft: string) => {
    const value = parseArchitectural(draft);
    if (value === null || (field === "centerOffset" ? value < 0 : value <= 0)) return false;
    return opening ? onUpdate(opening.id, { [field]: snapToSixteenth(value) }) : false;
  };
  const componentType = building.openingTypes.find((type) => type.id === opening?.wallOpeningTypeId) ?? null;
  const resolvedComponents = componentType && opening ? resolveOpeningComponents(componentType, opening.componentOverrides) : null;
  const baseComponent = componentType?.components.find((component) => component.id === selectedComponentId) ?? componentType?.components[0] ?? null;
  const resolvedComponent = baseComponent ? resolvedComponents?.find((component) => component.id === baseComponent.id) ?? null : null;
  const componentOverride = opening && baseComponent ? opening.componentOverrides.find((override) => override.componentId === baseComponent.id) ?? null : null;
  const updateComponentOverride = (change: Partial<Omit<OpeningComponentOverride, "componentId">>) => {
    if (!opening || !baseComponent) return false;
    const nextOverride = { ...(componentOverride ?? { componentId: baseComponent.id }), ...change, componentId: baseComponent.id };
    const componentOverrides = [...opening.componentOverrides.filter((override) => override.componentId !== baseComponent.id), nextOverride].sort((first, second) => first.componentId.localeCompare(second.componentId));
    return onUpdate(opening.id, { componentOverrides });
  };
  const resetComponentOverride = () => opening && baseComponent ? onUpdate(opening.id, { componentOverrides: opening.componentOverrides.filter((override) => override.componentId !== baseComponent.id) }) : false;
  const updateComponentDimension = (field: "depth" | "depthOffset" | "inset" | "profileWidth", draft: string, signed = false, allowZero = false) => {
    const value = (signed ? parseSignedArchitectural : parseArchitectural)(draft);
    if (value === null || (!signed && (allowZero ? value < 0 : value <= 0))) return false;
    return updateComponentOverride({ [field]: snapToSixteenth(value) });
  };
  const wallType = building.wallTypes.find((type) => type.id === line.wallTypeId) ?? null;
  const resolvedHeader = opening ? resolveWallHeaderType(building, line.wallTypeId, opening.wallOpeningTypeId, opening.headerTypeIdOverride) : null;
  const compatibleHeaders = building.headerTypes.filter((headerType) => {
    const required = wallHeaderTypeRequiredMainThickness(headerType);
    return !wallType || required === 0 || required <= wallLayerGroupThickness(wallType, "main") + 1e-8;
  });
  const compatibleTypes = building.openingTypes.filter((type) => type.kind === opening?.kind);
  return (
    <PropertyGridSection title="Openings" meta={`${line.wallOpenings.length} hosted`}>
      <div className="property-action-row"><button type="button" onClick={() => add("door")}>+ Door</button><button type="button" onClick={() => add("window")}>+ Window</button></div>
      {line.wallOpenings.length > 0 ? <PropertyGridRow label="Opening"><select className="property-cell-select" value={opening?.id ?? ""} onChange={(event) => { const nextOpening = line.wallOpenings.find((candidate) => candidate.id === event.target.value); const nextType = building.openingTypes.find((type) => type.id === nextOpening?.wallOpeningTypeId); setSelectedId(event.target.value); setSelectedComponentId(nextType?.components[0]?.id ?? ""); }} aria-label="Hosted wall opening">{line.wallOpenings.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.kind === "door" ? "Door" : "Window"}</option>)}</select></PropertyGridRow> : <p className="property-grid-note">Add a Door or Window to cut its rough opening through every Wall layer.</p>}
      {opening ? <>
        <WallOpeningNameField key={`${opening.id}:${opening.name}`} opening={opening} onUpdate={(change) => onUpdate(opening.id, change)} />
        <PropertyGridRow label="Component type"><select className="property-cell-select" value={opening.wallOpeningTypeId ?? ""} onChange={(event) => onAssignType(opening.id, event.target.value)} aria-label="Door or Window component type">{opening.wallOpeningTypeId === null ? <option value="" disabled>Legacy custom opening</option> : null}{compatibleTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></PropertyGridRow>
        {componentType ? <PropertyGridRow label="3D assembly"><span className="property-readout">{componentType.components.length} joined components</span></PropertyGridRow> : null}
        {componentType && baseComponent && resolvedComponent ? <>
          <PropertyGridRow label="Assembly part"><select className="property-cell-select" value={baseComponent.id} onChange={(event) => setSelectedComponentId(event.target.value)} aria-label="Placed opening assembly component">{componentType.components.map((component) => <option key={component.id} value={component.id}>{component.name} · {component.role}</option>)}</select></PropertyGridRow>
          <PropertyGridRow label="Part source"><span className="property-readout">{componentOverride ? "Opening override" : "Type default"}</span></PropertyGridRow>
          <WallOpeningComponentMaterialField key={`${opening.id}:${baseComponent.id}:${resolvedComponent.material}`} material={resolvedComponent.material} onUpdate={(material) => updateComponentOverride({ material })} />
          <PropertyGridRow label="Part display"><label className="property-checkbox"><input type="checkbox" checked={resolvedComponent.visible} onChange={(event) => updateComponentOverride({ visible: event.target.checked })} /><span>Visible</span></label></PropertyGridRow>
          <LineCoordinateField label="Part inset" value={resolvedComponent.inset} onCommit={(draft) => updateComponentDimension("inset", draft, true)} />
          <LineCoordinateField label={resolvedComponent.geometry === "panel-grid" ? "Panel gap" : resolvedComponent.geometry.includes("divider") ? "Divider width" : "Profile width"} unsigned value={resolvedComponent.profileWidth} onCommit={(draft) => updateComponentDimension("profileWidth", draft)} />
          <LineCoordinateField label="Part depth" unsigned value={resolvedComponent.depth} onCommit={(draft) => updateComponentDimension("depth", draft)} />
          <PropertyGridRow label="Depth anchor"><select className="property-cell-select" value={resolvedComponent.depthAnchor} onChange={(event) => updateComponentOverride({ depthAnchor: event.target.value as OpeningAssemblyComponent["depthAnchor"] })} aria-label="Placed opening component depth anchor">{OPENING_COMPONENT_DEPTH_ANCHORS.map((anchor) => <option key={anchor} value={anchor}>{titleCase(anchor)} face</option>)}</select></PropertyGridRow>
          <LineCoordinateField label="Depth offset" unsigned value={resolvedComponent.depthOffset} onCommit={(draft) => updateComponentDimension("depthOffset", draft, false, true)} />
          {resolvedComponent.geometry.includes("divider") || resolvedComponent.geometry === "panel-grid" ? <PropertyGridRow label={resolvedComponent.geometry === "panel-grid" ? "Panel count" : "Divider count"}><select className="property-cell-select" value={resolvedComponent.divisionCount} onChange={(event) => updateComponentOverride({ divisionCount: Number(event.target.value) })} aria-label="Placed opening component division count">{[1, 2, 3, 4, 5, 6, 7, 8].map((count) => <option key={count} value={count}>{count}</option>)}</select></PropertyGridRow> : null}
          {componentOverride ? <div className="property-action-row single-action"><button type="button" onClick={resetComponentOverride}>Reset Part to Type</button></div> : null}
        </> : null}
        <LineCoordinateField label="Center from start" unsigned value={opening.centerOffset} onCommit={(draft) => updateDimension("centerOffset", draft)} />
        <PropertyGridRow label="Unit size"><span className="property-readout">{formatArchitectural(opening.unitWidth)} × {formatArchitectural(opening.unitHeight)}</span></PropertyGridRow>
        <PropertyGridRow label="Rough opening"><span className="property-readout">{formatArchitectural(opening.roughWidth)} × {formatArchitectural(opening.roughHeight)}</span></PropertyGridRow>
        {componentType ? <PropertyGridRow label="Finish returns"><span className="property-readout">Ext {formatArchitectural(componentType.exteriorReturnDepth)} · Int {formatArchitectural(componentType.interiorReturnDepth)}</span></PropertyGridRow> : null}
        <PropertyGridRow label="Header override"><select className="property-cell-select" value={opening.headerTypeIdOverride ?? ""} onChange={(event) => onUpdate(opening.id, { headerTypeIdOverride: event.target.value || null })} aria-label="Placed opening header override"><option value="">Automatic · {resolvedHeader?.scheduleMark ?? "—"} {resolvedHeader?.name ?? "No compatible header"}</option>{compatibleHeaders.map((headerType) => <option key={headerType.id} value={headerType.id}>{headerType.scheduleMark} · {headerType.name}{headerType.engineeringRequired ? " · Engineering" : ""}</option>)}</select></PropertyGridRow>
        {resolvedHeader ? <PropertyGridRow label="Resolved header"><span className="property-readout">{resolvedHeader.scheduleMark} · {opening.headerTypeIdOverride ? "Opening override" : componentType?.headerTypeId ? "Component override" : "Wall default"}{resolvedHeader.engineeringRequired ? " · Engineering required" : ""}</span></PropertyGridRow> : null}
        {opening.kind === "window" ? <>
          <LineCoordinateField label="Bottom of header" unsigned value={opening.headerBottomHeight} onCommit={(draft) => updateDimension("headerBottomHeight", draft)} />
          <PropertyGridRow label="Rough sill"><span className="property-readout">{formatArchitectural(opening.headerBottomHeight - opening.roughHeight)}</span></PropertyGridRow>
        </> : <PropertyGridRow label="Bottom of header"><span className="property-readout">{formatArchitectural(opening.headerBottomHeight)}</span></PropertyGridRow>}
        <div className="property-action-row single-action"><button type="button" onClick={() => onDelete(opening.id)}>Delete Opening</button></div>
        <p className="property-grid-note">The reusable Type controls assembly topology, unit size, rough opening, and generated finish returns. Part controls above override only this placed opening; Reset Part to Type restores inheritance. Header priority is placed-opening override, component override, then host Wall default. Window header height remains measured to the bottom of the structural header above the Story subfloor.</p>
      </> : null}
    </PropertyGridSection>
  );
}

function LineCoordinateField({ label, onCommit, unsigned = false, value }: { label: string; onCommit: (draft: string) => boolean; unsigned?: boolean; value: number }) {
  const formatValue = unsigned ? formatArchitectural : formatSignedArchitectural;
  const [draft, setDraft] = useState(formatValue(value));
  const [error, setError] = useState(false);
  const commit = () => {
    if (!onCommit(draft)) {
      setDraft(formatValue(value));
      setError(true);
      return;
    }
    setError(false);
  };
  return (
    <label className="property-table-row property-input-row"><span className="property-table-label">{label}</span><div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}><input value={draft} onChange={(event) => { setDraft(event.target.value); setError(false); }} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setDraft(formatValue(value)); setError(false); event.currentTarget.blur(); } }} aria-label={`${label} coordinate`} spellCheck={false} /><span>ft-in</span></div></label>
  );
}

const ASSEMBLY_ROLE_LABELS: Record<AssemblyLayerRole, string> = {
  "air-gap": "Air gap",
  finish: "Finish",
  framing: "Framing",
  insulation: "Insulation",
  membrane: "Membrane",
  sheathing: "Sheathing / subfloor",
  substrate: "Substrate",
};

const WALL_LAYER_GROUP_LABELS: Record<WallLayerGroup, string> = {
  exterior: "Exterior Layers",
  main: "Main Layers",
  interior: "Interior Layers",
};

const WALL_REFERENCE_LINE_LABELS: Record<WallReferenceLine, string> = {
  "wall-center": "Wall centerline",
  "exterior-main": "Exterior face of Main",
  "center-main": "Center of Main",
  "interior-main": "Interior face of Main",
};

function nextAssemblyLayerId(assembly: LayeredAssembly): string {
  let number = 1;
  const ids = new Set(assembly.layers.map((layer) => layer.id));
  while (ids.has(`${assembly.id}-${String(number).padStart(2, "0")}`)) number += 1;
  return `${assembly.id}-${String(number).padStart(2, "0")}`;
}

function StoryDimensionInput({
  allowZero = false,
  label,
  onChange,
  signed = false,
  value,
}: {
  allowZero?: boolean;
  label: string;
  onChange: (value: number) => void;
  signed?: boolean;
  value: number;
}) {
  const formatter = signed ? formatSignedArchitectural : formatArchitectural;
  const parser = signed ? parseSignedArchitectural : parseArchitectural;
  const [draft, setDraft] = useState(() => formatter(value));
  const [error, setError] = useState(false);

  const commit = () => {
    const parsed = parser(draft);
    if (parsed === null || (!signed && (allowZero ? parsed < 0 : parsed <= 0))) {
      setError(true);
      return;
    }
    setError(false);
    onChange(snapToSixteenth(parsed));
  };

  return (
    <label className="story-field">
      <span>{label}</span>
      <div className={error ? "story-field-shell is-error" : "story-field-shell"}>
        <input
          value={draft}
          onChange={(event) => { setDraft(event.target.value); setError(false); }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") { setDraft(formatter(value)); setError(false); event.currentTarget.blur(); }
          }}
          aria-label={label}
          spellCheck={false}
        />
        <small>ft-in</small>
      </div>
    </label>
  );
}

function StoryAssemblyEditor({
  assembly,
  onChange,
}: {
  assembly: LayeredAssembly;
  onChange: (assembly: LayeredAssembly) => void;
}) {
  const isWallAssembly = assembly.kind === "wall-structure";
  const addLayer = (wallGroup?: WallLayerGroup) => {
    const next = { ...assembly, layers: assembly.layers.map((layer) => ({ ...layer })) };
    const layer: AssemblyLayer = {
      id: nextAssemblyLayerId(next),
      material: "New Material",
      name: "New Layer",
      role: assembly.kind === "floor-structure" || assembly.kind === "ceiling-structure" || isWallAssembly ? "framing" : "finish",
      thickness: 0.5,
    };
    if (isWallAssembly) {
      layer.participatesInJoin = true;
      layer.wallGroup = wallGroup ?? "main";
    }
    next.layers.push(layer);
    if (isWallAssembly) {
      next.layers.sort((first, second) => WALL_LAYER_GROUPS.indexOf(first.wallGroup ?? "main") - WALL_LAYER_GROUPS.indexOf(second.wallGroup ?? "main"));
    }
    onChange(next);
  };
  const updateLayer = (index: number, change: Partial<LayeredAssembly["layers"][number]>) => {
    const next = { ...assembly, layers: assembly.layers.map((layer) => ({ ...layer })) };
    next.layers[index] = { ...next.layers[index], ...change };
    if (isWallAssembly && (next.layers[index].role !== "finish" || next.layers[index].thickness <= 0)) {
      next.wallEndCapLayerIds = (next.wallEndCapLayerIds ?? []).filter((layerId) => layerId !== next.layers[index].id);
    }
    if (isWallAssembly && change.wallGroup !== undefined) {
      next.layers.sort((first, second) => WALL_LAYER_GROUPS.indexOf(first.wallGroup ?? "main") - WALL_LAYER_GROUPS.indexOf(second.wallGroup ?? "main"));
    }
    onChange(next);
  };
  const moveLayer = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= assembly.layers.length) return;
    if (isWallAssembly && assembly.layers[index].wallGroup !== assembly.layers[target].wallGroup) return;
    const next = { ...assembly, layers: assembly.layers.map((layer) => ({ ...layer })) };
    [next.layers[index], next.layers[target]] = [next.layers[target], next.layers[index]];
    onChange(next);
  };
  const removeLayer = (index: number) => {
    const next = { ...assembly, layers: assembly.layers.filter((_, candidate) => candidate !== index).map((layer) => ({ ...layer })) };
    if (isWallAssembly) next.wallEndCapLayerIds = (next.wallEndCapLayerIds ?? []).filter((layerId) => layerId !== assembly.layers[index]?.id);
    onChange(next);
  };
  const toggleEndCapLayer = (layerId: string, enabled: boolean) => {
    const selectedIds = new Set(assembly.wallEndCapLayerIds ?? []);
    if (enabled) selectedIds.add(layerId);
    else selectedIds.delete(layerId);
    onChange({ ...assembly, wallEndCapLayerIds: assembly.layers.flatMap((layer) => selectedIds.has(layer.id) ? [layer.id] : []) });
  };
  const mainLayerCount = assembly.layers.filter((layer) => layer.wallGroup === "main").length;
  const renderLayer = (layer: AssemblyLayer, index: number) => {
    const isOnlyMainLayer = isWallAssembly && layer.wallGroup === "main" && mainLayerCount === 1;
    const previousLayer = assembly.layers[index - 1];
    const nextLayer = assembly.layers[index + 1];
    return (
      <div className={isWallAssembly ? "story-layer-grid has-wall-group" : "story-layer-grid"} key={layer.id}>
        <span>{index + 1}</span>
        <div className="story-layer-names">
          <input value={layer.name} onChange={(event) => updateLayer(index, { name: event.target.value })} aria-label={`${assembly.name} layer ${index + 1} name`} />
          <input value={layer.material} onChange={(event) => updateLayer(index, { material: event.target.value })} aria-label={`${layer.name} material`} />
        </div>
        {isWallAssembly ? (
          <select value={layer.wallGroup} onChange={(event) => updateLayer(index, { wallGroup: event.target.value as WallLayerGroup })} aria-label={`${layer.name} wall layer group`}>
            {WALL_LAYER_GROUPS.map((group) => <option key={group} value={group} disabled={isOnlyMainLayer && group !== "main"}>{WALL_LAYER_GROUP_LABELS[group]}</option>)}
          </select>
        ) : null}
        <select value={layer.role} onChange={(event) => updateLayer(index, { role: event.target.value as AssemblyLayerRole })} aria-label={`${layer.name} role`}>
          {Object.entries(ASSEMBLY_ROLE_LABELS).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
        </select>
        <StoryDimensionInput allowZero={isWallAssembly} key={`${layer.id}:${layer.thickness}`} label={`${layer.name} thickness`} value={layer.thickness} onChange={(thickness) => updateLayer(index, { thickness })} />
        {isWallAssembly ? <label className="story-layer-join" title="When enabled, this layer is trimmed or mitered by automatic wall junctions."><input type="checkbox" checked={layer.participatesInJoin ?? true} onChange={(event) => updateLayer(index, { participatesInJoin: event.target.checked })} aria-label={`${layer.name} participates in automatic wall joins`} /><span>{layer.participatesInJoin === false ? "Square" : "Auto"}</span></label> : null}
        {isWallAssembly ? <label className="story-layer-join" title={layer.role === "finish" && layer.thickness > 0 ? "Wrap this finish across truly open wall ends." : "Only positive-thickness Finish layers can wrap open wall ends."}><input type="checkbox" checked={(assembly.wallEndCapLayerIds ?? []).includes(layer.id)} disabled={layer.role !== "finish" || layer.thickness <= 0} onChange={(event) => toggleEndCapLayer(layer.id, event.target.checked)} aria-label={`${layer.name} wraps open wall ends`} /><span>{(assembly.wallEndCapLayerIds ?? []).includes(layer.id) ? "Wrap" : "Off"}</span></label> : null}
        <div className="story-layer-actions"><button type="button" onClick={() => moveLayer(index, -1)} disabled={!previousLayer || (isWallAssembly && previousLayer.wallGroup !== layer.wallGroup)} aria-label={`Move ${layer.name} up`}>↑</button><button type="button" onClick={() => moveLayer(index, 1)} disabled={!nextLayer || (isWallAssembly && nextLayer.wallGroup !== layer.wallGroup)} aria-label={`Move ${layer.name} down`}>↓</button><button type="button" onClick={() => removeLayer(index)} disabled={isOnlyMainLayer} aria-label={`Remove ${layer.name}`}>×</button></div>
      </div>
    );
  };
  return (
    <section className="story-assembly">
      <header>
        <div><strong>{assembly.name}</strong><span>{assembly.kind === "floor-structure" ? "Controls floor-to-floor stacking" : assembly.kind === "ceiling-structure" ? "Builds down from the rough ceiling" : assembly.kind === "wall-structure" ? "Exterior-to-interior wall layers" : "Finish only · does not move Story datums"}</span></div>
        <b>{formatArchitectural(assemblyTotalThickness(assembly))}</b>
      </header>
      <div className={isWallAssembly ? "story-layer-grid story-layer-head has-wall-group" : "story-layer-grid story-layer-head"}><span>#</span><span>Layer / material</span>{isWallAssembly ? <span>Group</span> : null}<span>Role</span><span>Thickness</span>{isWallAssembly ? <><span>Join</span><span>End</span></> : null}<span>Order</span></div>
      {isWallAssembly ? WALL_LAYER_GROUPS.map((group) => (
        <div className="story-wall-layer-group" key={group}>
          <div className={`story-wall-group-heading is-${group}`}><strong>{WALL_LAYER_GROUP_LABELS[group]}</strong><span>{group === "main" ? "Structural core and future reference layer" : group === "exterior" ? "Outside of the Main layer" : "Room side of the Main layer"}</span><b>{formatArchitectural(wallLayerGroupThickness(assembly, group))}</b></div>
          {assembly.layers.map((layer, index) => layer.wallGroup === group ? renderLayer(layer, index) : null)}
        </div>
      )) : assembly.layers.map(renderLayer)}
      {isWallAssembly ? <div className="story-add-wall-layers">{WALL_LAYER_GROUPS.map((group) => <button type="button" className="story-add-layer" key={group} onClick={() => addLayer(group)}>＋ {WALL_LAYER_GROUP_LABELS[group].replace(" Layers", "")}</button>)}</div> : <button type="button" className="story-add-layer" onClick={() => addLayer()}>＋ Add layer</button>}
    </section>
  );
}

function StoryManagerDialog({
  building,
  onCancel,
  onSave,
}: {
  building: BuildingStructure;
  onCancel: () => void;
  onSave: (building: BuildingStructure) => void;
}) {
  const [draft, setDraft] = useState(() => cloneBuildingStructure(building));
  const [selectedStoryId, setSelectedStoryId] = useState(building.activeStoryId);
  const [error, setError] = useState("");
  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onCancel();
    };
    window.addEventListener("keydown", closeWithEscape, true);
    return () => window.removeEventListener("keydown", closeWithEscape, true);
  }, [onCancel]);
  const calculations = calculateStoryElevations(draft);
  const selectedIndex = draft.stories.findIndex((story) => story.id === selectedStoryId);
  const selectedStory = draft.stories[selectedIndex] ?? draft.stories[0];
  const selectedCalculation = calculations.find((item) => item.storyId === selectedStory.id);

  const replaceSelectedStory = (change: Partial<typeof selectedStory>) => {
    setDraft((current) => {
      const next = cloneBuildingStructure(current);
      const index = next.stories.findIndex((story) => story.id === selectedStory.id);
      if (index >= 0) next.stories[index] = { ...next.stories[index], ...change };
      return next;
    });
    setError("");
  };
  const replaceAssembly = (kind: AssemblyKind, assembly: LayeredAssembly) => {
    replaceSelectedStory(kind === "floor-structure" ? { floorStructure: assembly } : kind === "floor-finish" ? { floorFinish: assembly } : kind === "ceiling-structure" ? { ceilingStructure: assembly } : { ceilingFinish: assembly });
  };
  const addStory = (placement: "above" | "below") => {
    const next = addBuildingStory(draft, selectedStory.id, placement);
    if (!next) return;
    setDraft(next);
    setSelectedStoryId(next.activeStoryId);
    setError("");
  };
  const removeStory = () => {
    const next = removeBuildingStory(draft, selectedStory.id);
    if (!next) return;
    setDraft(next);
    setSelectedStoryId(next.activeStoryId);
    setError("");
  };
  const setDatumAnchor = () => {
    const elevation = calculations.find((item) => item.storyId === selectedStory.id)?.roughFloorElevation;
    if (elevation === undefined) return;
    setDraft((current) => ({ ...cloneBuildingStructure(current), anchorStoryId: selectedStory.id, datumElevation: elevation }));
  };
  const save = () => {
    const next = cloneBuildingStructure(draft);
    next.activeStoryId = selectedStory.id;
    if (!buildingStructureIsValid(next)) {
      setError("Check Story names, rough heights, and assembly layers. Names must be unique and every thickness must be a valid architectural dimension.");
      return;
    }
    onSave(next);
  };

  return (
    <div className="story-manager-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="story-manager" role="dialog" aria-modal="true" aria-labelledby="story-manager-title">
        <header className="story-manager-header"><div><strong id="story-manager-title">Story &amp; Assembly Manager</strong><span>Rough framing establishes vertical datums. Finish layers calculate finished dimensions.</span></div><button type="button" onClick={onCancel} aria-label="Close Story Manager">×</button></header>
        <div className="story-manager-body">
          <aside className="story-list">
            <header><strong>Stories</strong><span>Bottom to top</span></header>
            {[...draft.stories].reverse().map((story) => {
              const calculation = calculations.find((item) => item.storyId === story.id);
              return <button type="button" key={story.id} className={story.id === selectedStory.id ? "is-selected" : ""} onClick={() => setSelectedStoryId(story.id)}><strong>{story.name}</strong><span>Rough floor {calculation ? formatSignedArchitectural(calculation.roughFloorElevation) : "—"}</span>{story.id === draft.anchorStoryId ? <small>DATUM ANCHOR</small> : null}</button>;
            })}
            <div className="story-list-actions"><button type="button" onClick={() => addStory("above")}>＋ Above</button><button type="button" onClick={() => addStory("below")}>＋ Below</button><button type="button" onClick={removeStory} disabled={draft.stories.length === 1}>Delete</button></div>
          </aside>
          <main className="story-editor">
            <section className="story-editor-summary">
              <label><span>Story name</span><input value={selectedStory.name} maxLength={80} onChange={(event) => replaceSelectedStory({ name: event.target.value })} /></label>
              <StoryDimensionInput key={`${selectedStory.id}:${selectedStory.roughCeilingHeight}`} label="Rough ceiling / plate height" value={selectedStory.roughCeilingHeight} onChange={(roughCeilingHeight) => replaceSelectedStory({ roughCeilingHeight })} />
              <StoryDimensionInput key={`${draft.anchorStoryId}:${draft.datumElevation}`} label="Datum elevation" signed value={draft.datumElevation} onChange={(datumElevation) => setDraft((current) => ({ ...cloneBuildingStructure(current), datumElevation }))} />
              <button type="button" className={selectedStory.id === draft.anchorStoryId ? "is-anchor" : ""} onClick={setDatumAnchor}>{selectedStory.id === draft.anchorStoryId ? "Datum anchor" : "Set as datum anchor"}</button>
            </section>
            <section className="story-calculated-grid" aria-label="Calculated Story elevations">
              <div><span>Rough floor</span><strong>{selectedCalculation ? formatSignedArchitectural(selectedCalculation.roughFloorElevation) : "—"}</strong></div>
              <div><span>Finished floor</span><strong>{selectedCalculation ? formatSignedArchitectural(selectedCalculation.finishedFloorElevation) : "—"}</strong></div>
              <div><span>Rough ceiling</span><strong>{selectedCalculation ? formatSignedArchitectural(selectedCalculation.roughCeilingElevation) : "—"}</strong></div>
              <div><span>Floor structure depth</span><strong>{selectedCalculation ? formatArchitectural(selectedCalculation.floorStructureThickness) : "—"}</strong></div>
              <div><span>Ceiling structure depth</span><strong>{selectedCalculation ? formatArchitectural(selectedCalculation.ceilingStructureThickness) : "—"}</strong></div>
              <div><span>Finished ceiling</span><strong>{selectedCalculation ? formatSignedArchitectural(selectedCalculation.finishedCeilingElevation) : "—"}</strong></div>
              <div><span>Finished clear height</span><strong>{selectedCalculation ? formatArchitectural(selectedCalculation.finishedClearHeight) : "—"}</strong></div>
              <div><span>Floor above</span><strong>{selectedCalculation?.floorAboveElevation !== null && selectedCalculation?.floorAboveElevation !== undefined ? formatSignedArchitectural(selectedCalculation.floorAboveElevation) : "No Story above"}</strong></div>
            </section>
            <StoryAssemblyEditor assembly={selectedStory.floorStructure} onChange={(assembly) => replaceAssembly("floor-structure", assembly)} />
            <StoryAssemblyEditor assembly={selectedStory.floorFinish} onChange={(assembly) => replaceAssembly("floor-finish", assembly)} />
            <StoryAssemblyEditor assembly={selectedStory.ceilingStructure} onChange={(assembly) => replaceAssembly("ceiling-structure", assembly)} />
            <StoryAssemblyEditor assembly={selectedStory.ceilingFinish} onChange={(assembly) => replaceAssembly("ceiling-finish", assembly)} />
          </main>
          <aside className="story-section-preview" aria-label="Story section preview">
            <header><strong>Section Preview</strong><span>Calculated rough and finish planes</span></header>
            <div className="story-pole">
              {[...draft.stories].reverse().map((story) => {
                const calculation = calculations.find((item) => item.storyId === story.id);
                if (!calculation) return null;
                return <button type="button" key={story.id} className={story.id === selectedStory.id ? "story-pole-level is-selected" : "story-pole-level"} onClick={() => setSelectedStoryId(story.id)}><span className="story-pole-ceiling"><b>ROUGH CEILING</b>{formatSignedArchitectural(calculation.roughCeilingElevation)}</span><strong>{story.name}</strong><span className="story-pole-floor"><b>ROUGH FLOOR</b>{formatSignedArchitectural(calculation.roughFloorElevation)}</span><i style={{ height: `${Math.max(5, Math.min(24, calculation.floorStructureThickness))}px` }} title={`Rough floor structure ${formatArchitectural(calculation.floorStructureThickness)}`} /></button>;
              })}
            </div>
            <p>Gold lines are rough framing datums. Thin interior lines represent finish surfaces.</p>
          </aside>
        </div>
        {error ? <p className="story-manager-error" role="alert">{error}</p> : null}
        <footer className="story-manager-footer"><span>{draft.stories.length} Stor{draft.stories.length === 1 ? "y" : "ies"} · active plan: {selectedStory.name}</span><div><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="story-save" onClick={save}>Apply Story Settings</button></div></footer>
      </section>
    </div>
  );
}

function nextWallTypeId(building: BuildingStructure): string {
  let number = 1;
  const ids = new Set(building.wallTypes.map((wallType) => wallType.id));
  while (ids.has(`wall-type-${String(number).padStart(2, "0")}`)) number += 1;
  return `wall-type-${String(number).padStart(2, "0")}`;
}

function WallTypeManagerDialog({
  building,
  onCancel,
  onSave,
}: {
  building: BuildingStructure;
  onCancel: () => void;
  onSave: (building: BuildingStructure) => void;
}) {
  const [draft, setDraft] = useState(() => cloneBuildingStructure(building));
  const [selectedId, setSelectedId] = useState(building.activeWallTypeId);
  const [error, setError] = useState("");
  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onCancel();
    };
    window.addEventListener("keydown", closeWithEscape, true);
    return () => window.removeEventListener("keydown", closeWithEscape, true);
  }, [onCancel]);
  const selected = draft.wallTypes.find((wallType) => wallType.id === selectedId) ?? draft.wallTypes[0];
  const selectedMainThickness = wallLayerGroupThickness(selected, "main");
  const compatibleHeaders = draft.headerTypes.filter((headerType) => {
    const required = wallHeaderTypeRequiredMainThickness(headerType);
    return required === 0 || required <= selectedMainThickness + 1e-8;
  });
  const replaceSelected = (assembly: LayeredAssembly) => {
    setDraft((current) => ({
      ...cloneBuildingStructure(current),
      wallTypes: current.wallTypes.map((wallType) => wallType.id === selected.id ? { ...assembly, kind: "wall-structure" } : { ...wallType, layers: wallType.layers.map((layer) => ({ ...layer })) }),
    }));
    setError("");
  };
  const addType = () => {
    if (draft.wallTypes.length >= 32) return;
    const id = nextWallTypeId(draft);
    const layerIdMap = new Map(selected.layers.map((layer, index) => [layer.id, `${id}-${String(index + 1).padStart(2, "0")}`]));
    const copy: LayeredAssembly = {
      ...selected,
      id,
      name: `${selected.name} Copy`,
      layers: selected.layers.map((layer) => ({ ...layer, id: layerIdMap.get(layer.id) ?? layer.id })),
      wallEndCapLayerIds: (selected.wallEndCapLayerIds ?? []).flatMap((layerId) => layerIdMap.get(layerId) ?? []),
    };
    setDraft((current) => ({ ...cloneBuildingStructure(current), activeWallTypeId: id, wallTypes: [...current.wallTypes.map((wallType) => ({ ...wallType, layers: wallType.layers.map((layer) => ({ ...layer })) })), copy] }));
    setSelectedId(id);
  };
  const deleteType = () => {
    if (draft.wallTypes.length <= 1) return;
    const remaining = draft.wallTypes.filter((wallType) => wallType.id !== selected.id);
    const nextActive = draft.activeWallTypeId === selected.id ? remaining[0].id : draft.activeWallTypeId;
    setDraft((current) => ({ ...cloneBuildingStructure(current), activeWallTypeId: nextActive, wallTypes: remaining }));
    setSelectedId(nextActive);
  };
  const save = () => {
    const next = cloneBuildingStructure(draft);
    if (!buildingStructureIsValid(next)) {
      setError("Wall types need unique names, ordered Exterior/Main/Interior groups, a positive-thickness Main layer, and a compatible default header assembly.");
      return;
    }
    onSave(next);
  };
  return (
    <div className="story-manager-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="story-manager wall-type-manager" role="dialog" aria-modal="true" aria-labelledby="wall-type-manager-title">
        <header className="story-manager-header"><div><strong id="wall-type-manager-title">Wall Type Manager</strong><span>Reusable assemblies define wall thickness from exterior to interior.</span></div><button type="button" onClick={onCancel} aria-label="Close Wall Type Manager">×</button></header>
        <div className="story-manager-body">
          <aside className="story-list">
            <header><strong>Wall Types</strong><span>{draft.wallTypes.length} defined</span></header>
            {draft.wallTypes.map((wallType) => <button type="button" key={wallType.id} className={wallType.id === selected.id ? "is-selected" : ""} onClick={() => setSelectedId(wallType.id)}><strong>{wallType.name}</strong><span>{formatArchitectural(assemblyTotalThickness(wallType))} total</span>{wallType.id === draft.activeWallTypeId ? <small>ACTIVE TYPE</small> : null}</button>)}
            <div className="story-list-actions"><button type="button" onClick={addType} disabled={draft.wallTypes.length >= 32}>＋ Duplicate</button><button type="button" onClick={deleteType} disabled={draft.wallTypes.length <= 1}>Delete</button></div>
          </aside>
          <main className="story-editor">
            <section className="story-editor-summary">
              <label><span>Type name</span><input value={selected.name} maxLength={80} onChange={(event) => replaceSelected({ ...selected, name: event.target.value })} /></label>
              <label><span>Open-end wrap</span><output>{selected.wallEndCapLayerIds?.length ? `${selected.wallEndCapLayerIds.length} finish layer${selected.wallEndCapLayerIds.length === 1 ? "" : "s"}` : "None"}</output></label>
              <button type="button" className={selected.id === draft.activeWallTypeId ? "is-anchor" : ""} onClick={() => setDraft((current) => ({ ...cloneBuildingStructure(current), activeWallTypeId: selected.id }))}>{selected.id === draft.activeWallTypeId ? "Active wall type" : "Make active"}</button>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Wall Use &amp; Opening Framing</strong><span>The host Wall supplies the normal header assembly; a Door/Window Type or placed opening can override it.</span></div></header>
              <div className="foundation-field-grid">
                <label className="story-field"><span>Wall location</span><select value={selected.wallLocation ?? "exterior"} onChange={(event) => { const wallLocation = event.target.value as WallLocation; const next = { ...selected, wallLocation }; replaceSelected({ ...next, defaultHeaderTypeId: recommendedWallHeaderTypeId(next) }); }}><option value="exterior">Exterior</option><option value="interior">Interior</option></select></label>
                <label className="story-field"><span>Structural role</span><select value={selected.wallStructuralRole ?? "bearing"} onChange={(event) => { const wallStructuralRole = event.target.value as WallStructuralRole; const next = { ...selected, wallStructuralRole }; replaceSelected({ ...next, defaultHeaderTypeId: recommendedWallHeaderTypeId(next) }); }}><option value="bearing">Bearing</option><option value="non-bearing">Non-bearing</option></select></label>
                <label className="story-field"><span>Default header assembly</span><select value={wallDefaultHeaderTypeId(selected)} onChange={(event) => replaceSelected({ ...selected, defaultHeaderTypeId: event.target.value })}>{compatibleHeaders.map((headerType) => <option key={headerType.id} value={headerType.id}>{headerType.scheduleMark} · {headerType.name}{headerType.engineeringRequired ? " · Engineering" : ""}</option>)}</select></label>
              </div>
              <p className="opening-type-note">Changing the location or structural role applies the recommended residential default. The selected assembly remains an explicit project rule; loads, spans, species, grades, and code compliance are not calculated here.</p>
            </section>
            <StoryAssemblyEditor assembly={selected} onChange={replaceSelected} />
            <p className="property-grid-note">Layers are stored from exterior to interior. The Main group is the structural core. Use End to stack one or more positive Finish layers across truly open or manually disconnected ends. Each wrap uses its material thickness, and body layers stop behind the complete stack so solids do not overlap. New walls use the active type; existing walls retain their assigned type until changed.</p>
          </main>
        </div>
        {error ? <p className="story-manager-error" role="alert">{error}</p> : null}
        <footer className="story-manager-footer"><span>{selected.name} · {formatArchitectural(assemblyTotalThickness(selected))}</span><div><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="story-save" onClick={save}>Apply Wall Types</button></div></footer>
      </section>
    </div>
  );
}

const FOUNDATION_CONDITION_LABELS: Record<FoundationWallCondition, string> = {
  "dropped-wall": "Dropped Foundation Wall",
  "garage-wall": "Garage Foundation Wall",
  "interior-mudsill": "Interior Mudsill",
  "slab-walkout": "Complete Slab Walk-out",
  "standard-bearing": "Standard Bearing Wall",
};

function nextFoundationWallTypeId(building: BuildingStructure): string {
  let number = 1;
  const ids = new Set(building.foundationWallTypes.map((type) => type.id));
  while (ids.has(`foundation-wall-type-${String(number).padStart(2, "0")}`)) number += 1;
  return `foundation-wall-type-${String(number).padStart(2, "0")}`;
}

function FoundationDiagramDimension({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  const [draft, setDraft] = useState(() => formatArchitectural(value));
  const [error, setError] = useState(false);
  const commit = () => {
    const parsed = parseArchitectural(draft);
    if (parsed === null || parsed <= 0) {
      setError(true);
      return;
    }
    setError(false);
    onChange(snapToSixteenth(parsed));
  };
  return (
    <div className={error ? "foundation-diagram-input is-error" : "foundation-diagram-input"}>
      <span>{label}</span>
      <input
        aria-label={`${label} in section diagram`}
        value={draft}
        onChange={(event) => { setDraft(event.target.value); setError(false); }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") { setDraft(formatArchitectural(value)); setError(false); event.currentTarget.blur(); }
        }}
        spellCheck={false}
      />
    </div>
  );
}

function FoundationSectionDiagram({
  onFootingChange,
  onSillChange,
  onWallHeightChange,
  onWallWidthChange,
  type,
}: {
  onFootingChange: (change: Partial<FoundationWallType["footing"]>) => void;
  onSillChange: (change: Partial<FoundationWallType["sill"]>) => void;
  onWallHeightChange: (wallHeight: number) => void;
  onWallWidthChange: (wallWidth: number) => void;
  type: FoundationWallType;
}) {
  const maximumWidth = Math.max(type.wallWidth, type.sill.plateWidth, type.footing.enabled ? type.footing.width : 0, 18);
  const horizontalScale = 205 / maximumWidth;
  const verticalScale = Math.min(2.4, 240 / type.wallHeight);
  const centerX = 185;
  const wallWidth = Math.max(8, type.wallWidth * horizontalScale);
  const wallTop = 152 - Math.max(-34, Math.min(34, type.topOffset * 1.5));
  const wallBottom = wallTop + Math.max(24, type.wallHeight * verticalScale);
  const footingHeight = type.footing.enabled ? Math.max(10, Math.min(60, type.footing.height * verticalScale)) : 0;
  const footingTop = wallBottom;
  const footingBottom = footingTop + footingHeight;
  const wallX = centerX - wallWidth / 2;
  const plateHeight = Math.max(6, Math.min(22, type.sill.plateHeight * verticalScale));
  const plateStackHeight = plateHeight * type.sill.foundationPlateCount;
  const plateTop = wallTop - plateStackHeight;
  const plateWidth = Math.max(8, type.sill.plateWidth * horizontalScale);
  const plateX = Math.max(18, Math.min(374 - plateWidth, wallX + type.sill.exteriorSetback * horizontalScale));
  const rawFootingWidth = type.footing.width * horizontalScale;
  const footingWidth = Math.max(wallWidth, Math.min(300, rawFootingWidth));
  const rawFootingX = centerX + type.footing.centerOffset * horizontalScale - footingWidth / 2;
  const footingX = Math.max(18, Math.min(392 - footingWidth, rawFootingX));
  const floorHeight = 48;
  const floorY = plateTop - floorHeight;
  const floorX = plateX;
  const floorWidth = Math.max(30, 397 - floorX);
  const wallDimensionY = Math.min(wallBottom - 52, wallTop + 105);

  return (
    <svg className="foundation-section-svg" viewBox="0 0 420 490" role="img" aria-labelledby="foundation-section-title foundation-section-description">
      <title id="foundation-section-title">Editable Foundation Wall support section</title>
      <desc id="foundation-section-description">A proportional section through the concrete wall, sill plates, floor platform, and continuous footing. Dimension fields in the drawing edit the same values as the form.</desc>
      <defs>
        <pattern id="foundation-concrete-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" className="foundation-svg-concrete-fill" />
          <circle cx="4" cy="5" r="1.3" className="foundation-svg-concrete-stone" />
          <circle cx="15" cy="13" r="1" className="foundation-svg-concrete-stone" />
          <path d="M0 18L7 14M13 3L20 0" className="foundation-svg-concrete-mark" />
        </pattern>
        <pattern id="foundation-floor-pattern" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="12" height="12" className="foundation-svg-floor-fill" />
          <line x1="0" y1="0" x2="0" y2="12" className="foundation-svg-floor-line" />
        </pattern>
        <marker id="foundation-dimension-arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
          <path d="M0,3 L6,0 L6,6 Z" className="foundation-svg-dimension-arrow" />
        </marker>
      </defs>

      <path d={`M18 ${Math.min(285, wallTop + 65)} H${Math.max(18, wallX - 5)} M18 ${Math.min(285, wallTop + 65)} L18 430`} className="foundation-svg-grade" />
      <text x="22" y={Math.min(279, wallTop + 59)} className="foundation-svg-note">EXTERIOR GRADE</text>
      <line x1="18" y1="102" x2="397" y2="102" className="foundation-svg-datum" />
      <text x="22" y="96" className="foundation-svg-note">PROJECT FOUNDATION TOP DATUM · OFFSET {formatSignedArchitectural(type.topOffset)}</text>

      <rect x={floorX} y={floorY} width={floorWidth} height={floorHeight} rx="1" fill="url(#foundation-floor-pattern)" className="foundation-svg-floor" />
      <rect x={floorX} y={floorY} width={floorWidth} height="7" className="foundation-svg-subfloor" />
      <text x={floorX + floorWidth / 2} y={floorY + 29} textAnchor="middle" className="foundation-svg-component-label">FLOOR PLATFORM</text>
      <line x1={floorX} y1={floorY - 7} x2={floorX} y2={floorY + floorHeight + 6} className="foundation-svg-stop-edge" />
      <text x={Math.min(392, floorX + 7)} y={floorY - 11} className="foundation-svg-stop-label">FLOOR STOP EDGE</text>

      {Array.from({ length: type.sill.foundationPlateCount }, (_, index) => (
        <rect key={index} x={plateX} y={wallTop - plateHeight * (index + 1)} width={plateWidth} height={plateHeight} className="foundation-svg-lumber" />
      ))}
      {Array.from({ length: type.sill.upperWallBottomPlateCount }, (_, index) => (
        <rect key={index} x={plateX} y={floorY - plateHeight * (index + 1)} width={plateWidth} height={plateHeight} className="foundation-svg-lumber foundation-svg-upper-wall-plate" />
      ))}
      {type.sill.upperWallBottomPlateCount ? <text x={plateX + plateWidth / 2} y={Math.max(10, floorY - plateHeight * type.sill.upperWallBottomPlateCount - 5)} textAnchor="middle" className="foundation-svg-upper-wall-label">FRAMED-WALL PLATE</text> : null}
      <rect x={wallX} y={wallTop} width={wallWidth} height={Math.max(24, wallBottom - wallTop)} fill="url(#foundation-concrete-pattern)" className="foundation-svg-concrete" />
      {type.footing.enabled ? <rect x={footingX} y={footingTop} width={footingWidth} height={footingHeight} fill="url(#foundation-concrete-pattern)" className="foundation-svg-concrete foundation-svg-footing" /> : null}
      <line x1={centerX} y1={wallTop - 8} x2={centerX} y2={footingBottom + 10} className="foundation-svg-centerline" />
      <text x={centerX} y={(wallTop + wallBottom) / 2} textAnchor="middle" className="foundation-svg-material-label">{type.material}</text>

      <line x1={plateX} y1={plateTop - 11} x2={plateX + plateWidth} y2={plateTop - 11} className="foundation-svg-dimension" markerStart="url(#foundation-dimension-arrow)" markerEnd="url(#foundation-dimension-arrow)" />
      <line x1={plateX} y1={plateTop - 17} x2={plateX} y2={plateTop - 3} className="foundation-svg-extension" />
      <line x1={plateX + plateWidth} y1={plateTop - 17} x2={plateX + plateWidth} y2={plateTop - 3} className="foundation-svg-extension" />
      <foreignObject x="294" y="24" width="116" height="47"><FoundationDiagramDimension key={`${type.id}:diagram-pw:${type.sill.plateWidth}`} label="Sill plate width" value={type.sill.plateWidth} onChange={(plateWidth) => onSillChange({ plateWidth })} /></foreignObject>

      <line x1={Math.max(8, plateX - 12)} y1={plateTop} x2={Math.max(8, plateX - 12)} y2={wallTop} className="foundation-svg-dimension" markerStart="url(#foundation-dimension-arrow)" markerEnd="url(#foundation-dimension-arrow)" />
      <foreignObject x="7" y="112" width="116" height="47"><FoundationDiagramDimension key={`${type.id}:diagram-ph:${type.sill.plateHeight}`} label="Plate height each" value={type.sill.plateHeight} onChange={(plateHeight) => onSillChange({ plateHeight })} /></foreignObject>

      <line x1={wallX} y1={wallDimensionY} x2={wallX + wallWidth} y2={wallDimensionY} className="foundation-svg-dimension foundation-svg-dimension-contrast" markerStart="url(#foundation-dimension-arrow)" markerEnd="url(#foundation-dimension-arrow)" />
      <foreignObject x="294" y="207" width="116" height="47"><FoundationDiagramDimension key={`${type.id}:diagram-ww:${type.wallWidth}`} label="Concrete width" value={type.wallWidth} onChange={onWallWidthChange} /></foreignObject>

      <line x1={Math.max(8, wallX - 17)} y1={wallTop} x2={Math.max(8, wallX - 17)} y2={wallBottom} className="foundation-svg-dimension" markerStart="url(#foundation-dimension-arrow)" markerEnd="url(#foundation-dimension-arrow)" />
      <foreignObject x="7" y="270" width="116" height="47"><FoundationDiagramDimension key={`${type.id}:diagram-wh:${type.wallHeight}`} label="Concrete height" value={type.wallHeight} onChange={onWallHeightChange} /></foreignObject>

      {type.footing.enabled ? <>
        <line x1={footingX} y1={footingBottom + 18} x2={footingX + footingWidth} y2={footingBottom + 18} className="foundation-svg-dimension" markerStart="url(#foundation-dimension-arrow)" markerEnd="url(#foundation-dimension-arrow)" />
        <line x1={footingX} y1={footingBottom + 4} x2={footingX} y2={footingBottom + 24} className="foundation-svg-extension" />
        <line x1={footingX + footingWidth} y1={footingBottom + 4} x2={footingX + footingWidth} y2={footingBottom + 24} className="foundation-svg-extension" />
        <foreignObject x="151" y="443" width="118" height="47"><FoundationDiagramDimension key={`${type.id}:diagram-fw:${type.footing.width}`} label="Footing width" value={type.footing.width} onChange={(width) => onFootingChange({ width })} /></foreignObject>
        <line x1={Math.min(402, footingX + footingWidth + 12)} y1={footingTop} x2={Math.min(402, footingX + footingWidth + 12)} y2={footingBottom} className="foundation-svg-dimension" markerStart="url(#foundation-dimension-arrow)" markerEnd="url(#foundation-dimension-arrow)" />
        <foreignObject x="294" y="350" width="116" height="47"><FoundationDiagramDimension key={`${type.id}:diagram-fh:${type.footing.height}`} label="Footing height" value={type.footing.height} onChange={(height) => onFootingChange({ height })} /></foreignObject>
      </> : <text x="210" y="433" textAnchor="middle" className="foundation-svg-disabled-note">CONTINUOUS FOOTING OFF</text>}
    </svg>
  );
}

function FoundationWallManagerDialog({
  building,
  onCancel,
  onSave,
}: {
  building: BuildingStructure;
  onCancel: () => void;
  onSave: (building: BuildingStructure) => void;
}) {
  const [draft, setDraft] = useState(() => cloneBuildingStructure(building));
  const [selectedId, setSelectedId] = useState(building.activeFoundationWallTypeId);
  const [error, setError] = useState("");
  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onCancel();
    };
    window.addEventListener("keydown", closeWithEscape, true);
    return () => window.removeEventListener("keydown", closeWithEscape, true);
  }, [onCancel]);
  const selected = draft.foundationWallTypes.find((type) => type.id === selectedId) ?? draft.foundationWallTypes[0];
  const replaceSelected = (change: Partial<FoundationWallType>) => {
    setDraft((current) => ({
      ...cloneBuildingStructure(current),
      foundationWallTypes: current.foundationWallTypes.map((type) => type.id === selected.id ? { ...cloneFoundationWallType(type), ...change } : cloneFoundationWallType(type)),
    }));
    setError("");
  };
  const replaceFooting = (change: Partial<FoundationWallType["footing"]>) => replaceSelected({ footing: { ...selected.footing, ...change } });
  const replaceSill = (change: Partial<FoundationWallType["sill"]>) => replaceSelected({ sill: { ...selected.sill, ...change } });
  const changeCondition = (condition: FoundationWallCondition) => replaceSelected({
    condition,
    sill: { ...selected.sill, ...foundationConditionPlateDefaults(condition) },
  });
  const duplicateType = () => {
    if (draft.foundationWallTypes.length >= 32) return;
    const id = nextFoundationWallTypeId(draft);
    const copy = { ...cloneFoundationWallType(selected), id, name: `${selected.name} Copy` };
    setDraft((current) => ({ ...cloneBuildingStructure(current), activeFoundationWallTypeId: id, foundationWallTypes: [...current.foundationWallTypes.map(cloneFoundationWallType), copy] }));
    setSelectedId(id);
  };
  const deleteType = () => {
    if (draft.foundationWallTypes.length <= 1) return;
    const remaining = draft.foundationWallTypes.filter((type) => type.id !== selected.id).map(cloneFoundationWallType);
    const nextActive = draft.activeFoundationWallTypeId === selected.id ? remaining[0].id : draft.activeFoundationWallTypeId;
    setDraft((current) => ({ ...cloneBuildingStructure(current), activeFoundationWallTypeId: nextActive, foundationWallTypes: remaining }));
    setSelectedId(nextActive);
  };
  const save = () => {
    const next = cloneBuildingStructure(draft);
    if (!buildingStructureIsValid(next)) {
      setError("Check the type names and dimensions. Footings cannot be narrower than their concrete Wall, and plate counts must remain within the supported range.");
      return;
    }
    onSave(next);
  };
  const plateStackHeight = foundationSillStackHeight(selected);
  const ownershipLabel = selected.sill.upperWallBottomPlateCount
    ? `${selected.sill.foundationPlateCount} foundation sill + ${selected.sill.upperWallBottomPlateCount} framed-Wall bottom plate`
    : `${selected.sill.foundationPlateCount} foundation-hosted sill plates`;
  return (
    <div className="story-manager-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="story-manager foundation-manager" role="dialog" aria-modal="true" aria-labelledby="foundation-manager-title">
        <header className="story-manager-header"><div><strong id="foundation-manager-title">Foundation Wall Type Manager</strong><span>Define concrete support, footing geometry, and the sill edge that controls the floor perimeter.</span></div><button type="button" onClick={onCancel} aria-label="Close Foundation Wall Type Manager">×</button></header>
        <div className="story-manager-body">
          <aside className="story-list">
            <header><strong>Foundation Wall Types</strong><span>{draft.foundationWallTypes.length} defined</span></header>
            {draft.foundationWallTypes.map((type) => <button type="button" key={type.id} className={type.id === selected.id ? "is-selected" : ""} onClick={() => setSelectedId(type.id)}><strong>{type.name}</strong><span>{formatArchitectural(type.wallWidth)} concrete · {type.sill.foundationPlateCount} sill plate{type.sill.foundationPlateCount === 1 ? "" : "s"}</span>{type.id === draft.activeFoundationWallTypeId ? <small>ACTIVE TYPE</small> : null}</button>)}
            <div className="story-list-actions"><button type="button" onClick={duplicateType} disabled={draft.foundationWallTypes.length >= 32}>＋ Duplicate</button><button type="button" onClick={deleteType} disabled={draft.foundationWallTypes.length <= 1}>Delete</button></div>
          </aside>
          <main className="story-editor foundation-editor">
            <section className="story-editor-summary foundation-editor-summary">
              <label><span>Type name</span><input value={selected.name} maxLength={100} onChange={(event) => replaceSelected({ name: event.target.value })} /></label>
              <label><span>Foundation condition</span><select value={selected.condition} onChange={(event) => changeCondition(event.target.value as FoundationWallCondition)}>{FOUNDATION_WALL_CONDITIONS.map((condition) => <option value={condition} key={condition}>{FOUNDATION_CONDITION_LABELS[condition]}</option>)}</select></label>
              <button type="button" className={selected.id === draft.activeFoundationWallTypeId ? "is-anchor" : ""} onClick={() => setDraft((current) => ({ ...cloneBuildingStructure(current), activeFoundationWallTypeId: selected.id }))}>{selected.id === draft.activeFoundationWallTypeId ? "Active foundation type" : "Make active"}</button>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Concrete Wall</strong><span>Structural stem and project top condition</span></div></header>
              <div className="foundation-field-grid">
                <label className="story-field"><span>Material</span><input value={selected.material} maxLength={120} onChange={(event) => replaceSelected({ material: event.target.value })} /></label>
                <StoryDimensionInput key={`${selected.id}:wall-height:${selected.wallHeight}`} label="Wall height" value={selected.wallHeight} onChange={(wallHeight) => replaceSelected({ wallHeight })} />
                <StoryDimensionInput key={`${selected.id}:wall:${selected.wallWidth}`} label="Wall width" value={selected.wallWidth} onChange={(wallWidth) => replaceSelected({ wallWidth })} />
                <StoryDimensionInput signed key={`${selected.id}:top:${selected.topOffset}`} label="Top offset" value={selected.topOffset} onChange={(topOffset) => replaceSelected({ topOffset })} />
              </div>
            </section>
            <section className="foundation-setting-section">
              <header><label><input type="checkbox" checked={selected.footing.enabled} onChange={(event) => replaceFooting({ enabled: event.target.checked })} /><strong>Continuous Footing</strong></label><span>Centered under the concrete Main layer unless offset</span></header>
              <div className="foundation-field-grid">
                <StoryDimensionInput key={`${selected.id}:fw:${selected.footing.width}`} label="Footing width" value={selected.footing.width} onChange={(width) => replaceFooting({ width })} />
                <StoryDimensionInput key={`${selected.id}:fh:${selected.footing.height}`} label="Footing height" value={selected.footing.height} onChange={(height) => replaceFooting({ height })} />
                <StoryDimensionInput signed key={`${selected.id}:fo:${selected.footing.centerOffset}`} label="Center offset" value={selected.footing.centerOffset} onChange={(centerOffset) => replaceFooting({ centerOffset })} />
              </div>
            </section>
            <section className="foundation-setting-section foundation-sill-settings">
              <header><div><strong>Sill Support</strong><span>The exterior sill edge becomes the authoritative floor-perimeter stop.</span></div><output>{ownershipLabel}</output></header>
              <div className="foundation-field-grid">
                <StoryDimensionInput key={`${selected.id}:sw:${selected.sill.plateWidth}`} label="Plate width" value={selected.sill.plateWidth} onChange={(plateWidth) => replaceSill({ plateWidth })} />
                <StoryDimensionInput key={`${selected.id}:sh:${selected.sill.plateHeight}`} label="Plate height" value={selected.sill.plateHeight} onChange={(plateHeight) => replaceSill({ plateHeight })} />
                <StoryDimensionInput signed key={`${selected.id}:ss:${selected.sill.exteriorSetback}`} label="Exterior setback" value={selected.sill.exteriorSetback} onChange={(exteriorSetback) => replaceSill({ exteriorSetback })} />
                <label className="story-field"><span>Foundation sill plates</span><input type="number" min={1} max={4} step={1} value={selected.sill.foundationPlateCount} onChange={(event) => replaceSill({ foundationPlateCount: Number(event.target.value) })} /></label>
                <label className="story-field"><span>Framed-Wall bottom plates</span><input type="number" min={0} max={2} step={1} value={selected.sill.upperWallBottomPlateCount} onChange={(event) => replaceSill({ upperWallBottomPlateCount: Number(event.target.value) })} /></label>
                <label className="story-field"><span>Foundation plate stack</span><output className="room-output">{formatArchitectural(plateStackHeight)}</output></label>
              </div>
              <p>Changing the condition applies the reviewed residential plate ownership: Standard and Interior Mudsill use two foundation-hosted plates; Dropped, Garage, and Slab Walk-out use one foundation sill plus the framed Wall bottom plate.</p>
            </section>
          </main>
          <aside className="foundation-section-preview" aria-label="Foundation Wall section preview">
            <header><strong>Editable Support Section</strong><span>Proportional component preview · exterior at left</span></header>
            <div className="foundation-preview-canvas"><FoundationSectionDiagram type={selected} onWallHeightChange={(wallHeight) => replaceSelected({ wallHeight })} onWallWidthChange={(wallWidth) => replaceSelected({ wallWidth })} onFootingChange={replaceFooting} onSillChange={replaceSill} /></div>
            <dl><div><dt>Condition</dt><dd>{FOUNDATION_CONDITION_LABELS[selected.condition]}</dd></div><div><dt>Concrete top</dt><dd>{formatSignedArchitectural(selected.topOffset)}</dd></div><div><dt>Sill edge</dt><dd>{selected.sill.exteriorSetback === 0 ? "Flush to Main exterior" : `${formatSignedArchitectural(selected.sill.exteriorSetback)} setback`}</dd></div><div><dt>Plate ownership</dt><dd>{ownershipLabel}</dd></div></dl>
          </aside>
        </div>
        {error ? <p className="story-manager-error" role="alert">{error}</p> : null}
        <footer className="story-manager-footer"><span>{draft.foundationWallTypes.length} reusable Foundation Wall type{draft.foundationWallTypes.length === 1 ? "" : "s"} · saved with this project</span><div><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="story-save" onClick={save}>Apply Foundation Types</button></div></footer>
      </section>
    </div>
  );
}

function nextWallOpeningTypeId(building: BuildingStructure, kind: WallOpeningKind): string {
  const prefix = kind === "door" ? "door-type" : "window-type";
  const ids = new Set(building.openingTypes.map((type) => type.id));
  let number = 1;
  while (ids.has(`${prefix}-${String(number).padStart(2, "0")}`)) number += 1;
  return `${prefix}-${String(number).padStart(2, "0")}`;
}

function nextWallOpeningTypeName(building: BuildingStructure, sourceName: string): string {
  const names = new Set(building.openingTypes.map((type) => type.name.trim().toLocaleLowerCase()));
  const baseName = `${sourceName.trim()} Copy`;
  if (!names.has(baseName.toLocaleLowerCase())) return baseName;
  let number = 2;
  while (names.has(`${baseName} ${number}`.toLocaleLowerCase())) number += 1;
  return `${baseName} ${number}`;
}

function nextOpeningComponentId(type: WallOpeningType): string {
  const ids = new Set(type.components.map((component) => component.id));
  let number = 1;
  while (ids.has(`component-${String(number).padStart(2, "0")}`)) number += 1;
  return `component-${String(number).padStart(2, "0")}`;
}

function nextOpeningComponentName(type: WallOpeningType, sourceName = "Component"): string {
  const names = new Set(type.components.map((component) => component.name.trim().toLocaleLowerCase()));
  if (!names.has(sourceName.toLocaleLowerCase())) return sourceName;
  let number = 2;
  while (names.has(`${sourceName} ${number}`.toLocaleLowerCase())) number += 1;
  return `${sourceName} ${number}`;
}

function nextWallHeaderTypeId(building: BuildingStructure): string {
  const ids = new Set(building.headerTypes.map((type) => type.id));
  let number = 1;
  while (ids.has(`header-type-${String(number).padStart(2, "0")}`)) number += 1;
  return `header-type-${String(number).padStart(2, "0")}`;
}

function nextWallHeaderTypeName(building: BuildingStructure, sourceName: string): string {
  const names = new Set(building.headerTypes.map((type) => type.name.trim().toLocaleLowerCase()));
  const baseName = `${sourceName.trim()} Copy`;
  if (!names.has(baseName.toLocaleLowerCase())) return baseName;
  let number = 2;
  while (names.has(`${baseName} ${number}`.toLocaleLowerCase())) number += 1;
  return `${baseName} ${number}`;
}

function nextWallHeaderScheduleMark(building: BuildingStructure): string {
  const marks = new Set(building.headerTypes.map((type) => type.scheduleMark.toUpperCase()));
  let number = 1;
  while (marks.has(`H${number}`)) number += 1;
  return `H${number}`;
}

function OpeningTypeManagerDialog({
  document,
  onCancel,
  onSave,
}: {
  document: ModelDocument;
  onCancel: () => void;
  onSave: (building: BuildingStructure) => boolean;
}) {
  const [draft, setDraft] = useState(() => cloneBuildingStructure(document.building));
  const [selectedId, setSelectedId] = useState(document.building.activeDoorTypeId);
  const [selectedComponentId, setSelectedComponentId] = useState(document.building.openingTypes.find((type) => type.id === document.building.activeDoorTypeId)?.components[0]?.id ?? "");
  const [error, setError] = useState("");
  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onCancel();
    };
    window.addEventListener("keydown", closeWithEscape, true);
    return () => window.removeEventListener("keydown", closeWithEscape, true);
  }, [onCancel]);
  const selected = draft.openingTypes.find((type) => type.id === selectedId) ?? draft.openingTypes[0];
  const selectedComponent = selected.components.find((component) => component.id === selectedComponentId) ?? selected.components[0];
  const activeWallType = draft.wallTypes.find((type) => type.id === draft.activeWallTypeId) ?? draft.wallTypes[0];
  const selectedHeader = draft.headerTypes.find((type) => type.id === (selected.headerTypeId ?? wallDefaultHeaderTypeId(activeWallType))) ?? draft.headerTypes[0];
  const usageCount = document.lines.reduce((count, line) => count + line.wallOpenings.filter((opening) => opening.wallOpeningTypeId === selected.id).length, 0);
  const headerUsageCount = draft.openingTypes.filter((type) => type.headerTypeId === selectedHeader.id).length +
    draft.wallTypes.filter((type) => wallDefaultHeaderTypeId(type) === selectedHeader.id).length +
    document.lines.reduce((count, line) => count + line.wallOpenings.filter((opening) => opening.headerTypeIdOverride === selectedHeader.id).length, 0);
  const kindCount = draft.openingTypes.filter((type) => type.kind === selected.kind).length;
  const replaceSelected = (change: Partial<WallOpeningType>) => {
    setDraft((current) => ({ ...cloneBuildingStructure(current), openingTypes: current.openingTypes.map((type) => type.id === selected.id ? { ...cloneWallOpeningType(type), ...change } : cloneWallOpeningType(type)) }));
    setError("");
  };
  const replaceSelectedComponent = (change: Partial<OpeningAssemblyComponent>) => {
    setDraft((current) => ({
      ...cloneBuildingStructure(current),
      openingTypes: current.openingTypes.map((type) => type.id === selected.id ? {
        ...cloneWallOpeningType(type),
        components: type.components.map((component) => component.id === selectedComponent.id ? { ...component, ...change } : { ...component }),
      } : cloneWallOpeningType(type)),
    }));
    setError("");
  };
  const addComponent = () => {
    if (selected.components.length >= MAXIMUM_OPENING_COMPONENT_COUNT) return;
    const id = nextOpeningComponentId(selected);
    const component: OpeningAssemblyComponent = {
      depth: 1.5,
      depthAnchor: "center",
      depthOffset: 0,
      divisionCount: 1,
      geometry: "perimeter",
      id,
      inset: 0,
      material: "Wood",
      name: nextOpeningComponentName(selected),
      parentComponentId: null,
      profileWidth: 1.5,
      role: "frame",
      visible: true,
    };
    replaceSelected({ components: [...selected.components.map((candidate) => ({ ...candidate })), component] });
    setSelectedComponentId(id);
  };
  const duplicateComponent = () => {
    if (selected.components.length >= MAXIMUM_OPENING_COMPONENT_COUNT) return;
    const id = nextOpeningComponentId(selected);
    const copy = { ...selectedComponent, id, name: nextOpeningComponentName(selected, `${selectedComponent.name} Copy`), parentComponentId: selectedComponent.parentComponentId };
    replaceSelected({ components: [...selected.components.map((candidate) => ({ ...candidate })), copy] });
    setSelectedComponentId(id);
  };
  const deleteComponent = () => {
    if (selected.components.length <= 1 || selected.components.some((candidate) => candidate.parentComponentId === selectedComponent.id)) return;
    const remaining = selected.components.filter((candidate) => candidate.id !== selectedComponent.id).map((candidate) => ({ ...candidate }));
    replaceSelected({ components: remaining });
    setSelectedComponentId(selectedComponent.parentComponentId ?? remaining[0].id);
  };
  const componentParentOptions = selected.components.filter((candidate) => {
    if (candidate.id === selectedComponent.id) return false;
    let parentId = candidate.parentComponentId;
    while (parentId !== null) {
      if (parentId === selectedComponent.id) return false;
      parentId = selected.components.find((item) => item.id === parentId)?.parentComponentId ?? null;
    }
    return true;
  });
  const replaceSelectedHeader = (change: Partial<WallHeaderType>) => {
    setDraft((current) => ({ ...cloneBuildingStructure(current), headerTypes: current.headerTypes.map((type) => type.id === selectedHeader.id ? { ...cloneWallHeaderType(type), ...change } : cloneWallHeaderType(type)) }));
    setError("");
  };
  const duplicateHeaderType = () => {
    if (draft.headerTypes.length >= MAXIMUM_WALL_HEADER_TYPE_COUNT) return;
    const id = nextWallHeaderTypeId(draft);
    const copy = { ...cloneWallHeaderType(selectedHeader), id, name: nextWallHeaderTypeName(draft, selectedHeader.name), scheduleMark: nextWallHeaderScheduleMark(draft) };
    setDraft((current) => ({
      ...cloneBuildingStructure(current),
      headerTypes: [...current.headerTypes.map(cloneWallHeaderType), copy],
      openingTypes: current.openingTypes.map((type) => type.id === selected.id ? { ...cloneWallOpeningType(type), headerTypeId: id } : cloneWallOpeningType(type)),
    }));
    setError("");
  };
  const duplicateType = () => {
    if (draft.openingTypes.length >= MAXIMUM_WALL_OPENING_TYPE_COUNT) return;
    const id = nextWallOpeningTypeId(draft, selected.kind);
    const copy = { ...cloneWallOpeningType(selected), id, name: nextWallOpeningTypeName(draft, selected.name) };
    setDraft((current) => ({
      ...cloneBuildingStructure(current),
      [selected.kind === "door" ? "activeDoorTypeId" : "activeWindowTypeId"]: id,
      openingTypes: [...current.openingTypes.map(cloneWallOpeningType), copy],
    }));
    setSelectedId(id);
  };
  const deleteType = () => {
    if (kindCount <= 1 || usageCount > 0) return;
    const remaining = draft.openingTypes.filter((type) => type.id !== selected.id).map(cloneWallOpeningType);
    const activeKey = selected.kind === "door" ? "activeDoorTypeId" : "activeWindowTypeId";
    const nextActive = draft[activeKey] === selected.id ? remaining.find((type) => type.kind === selected.kind)!.id : draft[activeKey];
    setDraft((current) => ({ ...cloneBuildingStructure(current), [activeKey]: nextActive, openingTypes: remaining }));
    setSelectedId(nextActive);
  };
  const makeActive = () => setDraft((current) => ({ ...cloneBuildingStructure(current), [selected.kind === "door" ? "activeDoorTypeId" : "activeWindowTypeId"]: selected.id }));
  const activeId = selected.kind === "door" ? draft.activeDoorTypeId : draft.activeWindowTypeId;
  const doorPanelLayout = doorPanelLayoutForType(selected);
  const windowSashArrangement = windowSashArrangementForType(selected);
  const windowLitePattern = windowLitePatternForType(selected);
  const save = () => {
    const next = cloneBuildingStructure(draft);
    if (!buildingStructureIsValid(next)) {
      setError("Check names, dimensions, framing counts, unique header schedule marks, and Wall compatibility. Unit size must fit inside the rough opening, and every project needs at least one Door and one Window type.");
      return;
    }
    if (!onSave(next)) {
      setError("This header assembly is wider than the Main layer of at least one Wall where the Door or Window type is already placed. Choose a thinner assembly, duplicate the opening type, or use a thicker host Wall.");
    }
  };
  return (
    <div className="story-manager-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="story-manager wall-type-manager opening-type-manager" role="dialog" aria-modal="true" aria-labelledby="opening-type-manager-title">
        <header className="story-manager-header"><div><strong id="opening-type-manager-title">Door &amp; Window Type Manager</strong><span>Reusable units, rough openings, finish returns, and shared structural header assemblies.</span></div><button type="button" onClick={onCancel} aria-label="Close Door and Window Type Manager">×</button></header>
        <div className="story-manager-body">
          <aside className="story-list">
            <header><strong>Component Types</strong><span>{draft.openingTypes.length} defined</span></header>
            {draft.openingTypes.map((type) => {
              const isActive = type.id === (type.kind === "door" ? draft.activeDoorTypeId : draft.activeWindowTypeId);
              return <button type="button" key={type.id} className={type.id === selected.id ? "is-selected" : ""} onClick={() => { setSelectedId(type.id); setSelectedComponentId(type.components[0]?.id ?? ""); }}><strong>{type.name}</strong><span>{type.kind === "door" ? "Door" : "Window"} · {formatArchitectural(type.unitWidth)} × {formatArchitectural(type.unitHeight)} · {type.components.length} parts</span>{isActive ? <small>ACTIVE {type.kind.toUpperCase()}</small> : null}</button>;
            })}
            <div className="story-list-actions"><button type="button" onClick={duplicateType} disabled={draft.openingTypes.length >= MAXIMUM_WALL_OPENING_TYPE_COUNT}>＋ Duplicate</button><button type="button" onClick={deleteType} disabled={kindCount <= 1 || usageCount > 0}>Delete</button></div>
          </aside>
          <main className="story-editor opening-type-editor">
            <section className="story-editor-summary foundation-editor-summary">
              <label><span>Type name</span><input value={selected.name} maxLength={100} onChange={(event) => replaceSelected({ name: event.target.value })} /></label>
              <label><span>Component family</span><output className="room-output">{selected.kind === "door" ? "Door" : "Window"}</output></label>
              <button type="button" className={selected.id === activeId ? "is-anchor" : ""} onClick={makeActive}>{selected.id === activeId ? `Active ${selected.kind} type` : `Make active ${selected.kind}`}</button>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Unit &amp; Rough Opening</strong><span>The product size and the structural cut remain separate.</span></div><output>{usageCount} placed</output></header>
              <div className="foundation-field-grid">
                <StoryDimensionInput key={`${selected.id}:uw:${selected.unitWidth}`} label="Unit width" value={selected.unitWidth} onChange={(unitWidth) => replaceSelected({ unitWidth })} />
                <StoryDimensionInput key={`${selected.id}:uh:${selected.unitHeight}`} label="Unit height" value={selected.unitHeight} onChange={(unitHeight) => replaceSelected({ unitHeight })} />
                <StoryDimensionInput key={`${selected.id}:rw:${selected.roughWidth}`} label="Rough width" value={selected.roughWidth} onChange={(roughWidth) => replaceSelected({ roughWidth })} />
                <StoryDimensionInput key={`${selected.id}:rh:${selected.roughHeight}`} label="Rough height" value={selected.roughHeight} onChange={(roughHeight) => replaceSelected({ roughHeight, ...(selected.kind === "door" ? { defaultHeaderBottomHeight: roughHeight } : {}) })} />
                <StoryDimensionInput signed key={`${selected.id}:uox:${selected.unitOffsetX}`} label="Unit horizontal offset" value={selected.unitOffsetX} onChange={(unitOffsetX) => replaceSelected({ unitOffsetX })} />
                <StoryDimensionInput allowZero key={`${selected.id}:uoz:${selected.unitOffsetZ}`} label="Unit bottom above rough" value={selected.unitOffsetZ} onChange={(unitOffsetZ) => replaceSelected({ unitOffsetZ })} />
                {selected.kind === "window" ? <StoryDimensionInput key={`${selected.id}:hh:${selected.defaultHeaderBottomHeight}`} label="Default header bottom" value={selected.defaultHeaderBottomHeight} onChange={(defaultHeaderBottomHeight) => replaceSelected({ defaultHeaderBottomHeight })} /> : <label className="story-field"><span>Header bottom</span><output className="room-output">Matches rough height</output></label>}
              </div>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Product Layout Generator</strong><span>Build familiar residential product geometry from editable components.</span></div><output>Parametric</output></header>
              <div className="foundation-field-grid">
                {selected.kind === "door" ? <label className="story-field"><span>Door panel layout</span><select value={doorPanelLayout ?? "custom"} onChange={(event) => { const configured = configureDoorPanelLayout(selected, event.target.value as DoorPanelLayout); if (configured) replaceSelected(configured); }}><option value="custom" disabled>Custom component layout</option>{DOOR_PANEL_LAYOUTS.map((layout) => <option key={layout} value={layout}>{layout === "flush" ? "Flush slab" : titleCase(layout)}</option>)}</select></label> : <>
                  <label className="story-field"><span>Sash arrangement</span><select value={windowSashArrangement ?? "custom"} onChange={(event) => { const configured = configureWindowSashArrangement(selected, event.target.value as WindowSashArrangement); if (configured) replaceSelected(configured); }}><option value="custom" disabled>Custom component layout</option>{WINDOW_SASH_ARRANGEMENTS.map((arrangement) => <option key={arrangement} value={arrangement}>{titleCase(arrangement)}</option>)}</select></label>
                  <label className="story-field"><span>Divided-lite pattern</span><select value={windowLitePattern ?? "custom"} onChange={(event) => { const configured = configureWindowLitePattern(selected, event.target.value as WindowLitePattern); if (configured) replaceSelected(configured); }}><option value="custom" disabled>Custom component layout</option>{WINDOW_LITE_PATTERNS.map((pattern) => <option key={pattern} value={pattern}>{pattern === "none" ? "None" : titleCase(pattern)}</option>)}</select></label>
                </>}
              </div>
              <p className="opening-type-note">Generators create ordinary, editable assembly components: raised Door panel fields, fixed or operable Window sash sets, and equal, colonial, or prairie grille patterns. Product identity and manufacturer-specific profile libraries remain separate so generic geometry is never presented as a certified manufacturer model.</p>
            </section>
            <section className="foundation-setting-section opening-component-section">
              <header><div><strong>3D Assembly Components</strong><span>Joined parametric parts generated inside the independent rough opening.</span></div><output>{selected.components.length} parts</output></header>
              <div className="opening-component-toolbar">
                <label className="story-field"><span>Selected component</span><select value={selectedComponent.id} onChange={(event) => setSelectedComponentId(event.target.value)}>{selected.components.map((component) => <option key={component.id} value={component.id}>{component.name} · {component.role}</option>)}</select></label>
                <button type="button" onClick={addComponent} disabled={selected.components.length >= MAXIMUM_OPENING_COMPONENT_COUNT}>＋ Add</button>
                <button type="button" onClick={duplicateComponent} disabled={selected.components.length >= MAXIMUM_OPENING_COMPONENT_COUNT}>Duplicate</button>
                <button type="button" onClick={deleteComponent} disabled={selected.components.length <= 1 || selected.components.some((candidate) => candidate.parentComponentId === selectedComponent.id)}>Delete</button>
              </div>
              <div className="foundation-field-grid">
                <label className="story-field"><span>Component name</span><input value={selectedComponent.name} maxLength={100} onChange={(event) => replaceSelectedComponent({ name: event.target.value })} /></label>
                <label className="story-field"><span>Role</span><select value={selectedComponent.role} onChange={(event) => replaceSelectedComponent({ role: event.target.value as OpeningAssemblyComponent["role"] })}>{OPENING_COMPONENT_ROLES.map((role) => <option key={role} value={role}>{titleCase(role)}</option>)}</select></label>
                <label className="story-field"><span>Geometry</span><select value={selectedComponent.geometry} onChange={(event) => replaceSelectedComponent({ geometry: event.target.value as OpeningAssemblyComponent["geometry"] })}>{OPENING_COMPONENT_GEOMETRIES.map((geometry) => <option key={geometry} value={geometry}>{titleCase(geometry)}</option>)}</select></label>
                <label className="story-field"><span>Joined inside</span><select value={selectedComponent.parentComponentId ?? ""} onChange={(event) => replaceSelectedComponent({ parentComponentId: event.target.value || null })}><option value="">Unit rectangle</option>{componentParentOptions.map((component) => <option key={component.id} value={component.id}>{component.name}</option>)}</select></label>
                <label className="story-field"><span>Material</span><input value={selectedComponent.material} maxLength={120} onChange={(event) => replaceSelectedComponent({ material: event.target.value })} /></label>
                <label className="story-field"><span>Display</span><span className="room-checkbox-field"><input type="checkbox" checked={selectedComponent.visible} onChange={(event) => replaceSelectedComponent({ visible: event.target.checked })} /> Visible in model</span></label>
                <StoryDimensionInput signed key={`${selected.id}:${selectedComponent.id}:inset:${selectedComponent.inset}`} label="Inset from parent" value={selectedComponent.inset} onChange={(inset) => replaceSelectedComponent({ inset })} />
                <StoryDimensionInput key={`${selected.id}:${selectedComponent.id}:profile:${selectedComponent.profileWidth}`} label={selectedComponent.geometry === "panel-grid" ? "Panel gap" : selectedComponent.geometry.includes("divider") ? "Divider width" : "Profile width"} value={selectedComponent.profileWidth} onChange={(profileWidth) => replaceSelectedComponent({ profileWidth })} />
                <StoryDimensionInput key={`${selected.id}:${selectedComponent.id}:depth:${selectedComponent.depth}`} label="Component depth" value={selectedComponent.depth} onChange={(depth) => replaceSelectedComponent({ depth })} />
                <label className="story-field"><span>Depth anchor</span><select value={selectedComponent.depthAnchor} onChange={(event) => replaceSelectedComponent({ depthAnchor: event.target.value as OpeningAssemblyComponent["depthAnchor"] })}>{OPENING_COMPONENT_DEPTH_ANCHORS.map((anchor) => <option key={anchor} value={anchor}>{titleCase(anchor)} face</option>)}</select></label>
                <StoryDimensionInput allowZero key={`${selected.id}:${selectedComponent.id}:do:${selectedComponent.depthOffset}`} label="Depth offset" value={selectedComponent.depthOffset} onChange={(depthOffset) => replaceSelectedComponent({ depthOffset })} />
                {selectedComponent.geometry.includes("divider") || selectedComponent.geometry === "panel-grid" ? <label className="story-field"><span>{selectedComponent.geometry === "panel-grid" ? "Panel count" : "Divider count"}</span><select value={selectedComponent.divisionCount} onChange={(event) => replaceSelectedComponent({ divisionCount: Number(event.target.value) })}>{[1, 2, 3, 4, 5, 6, 7, 8].map((count) => <option key={count} value={count}>{count}</option>)}</select></label> : null}
              </div>
              <p className="opening-type-note">Each part keeps a stable identity for future schedules and placed-object overrides. A child uses its parent&apos;s clear opening, so changing the frame, sash, glass, panel, mullion, jamb, or trim dimensions rebuilds the joined 3D object without changing the structural rough opening.</p>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Finish Returns</strong><span>Generate jamb, head, and Window sill finish geometry inside the rough opening.</span></div></header>
              <div className="foundation-field-grid">
                <StoryDimensionInput allowZero key={`${selected.id}:er:${selected.exteriorReturnDepth}`} label="Exterior return depth" value={selected.exteriorReturnDepth} onChange={(exteriorReturnDepth) => replaceSelected({ exteriorReturnDepth })} />
                <StoryDimensionInput allowZero key={`${selected.id}:ir:${selected.interiorReturnDepth}`} label="Interior return depth" value={selected.interiorReturnDepth} onChange={(interiorReturnDepth) => replaceSelected({ interiorReturnDepth })} />
              </div>
              <p className="opening-type-note">Each nonzero depth generates returns from that Wall face. If their combined depth exceeds a thinner Wall, the two sides meet without overlapping. Structural framing will use the rough opening, not the unit size.</p>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Opening Framing</strong><span>Define the repeatable framing package generated with this component type.</span></div></header>
              <div className="foundation-field-grid">
                <label className="story-field"><span>Header source</span><select value={selected.headerTypeId ?? ""} onChange={(event) => replaceSelected({ headerTypeId: event.target.value || null })}><option value="">Automatic from host Wall Type</option>{draft.headerTypes.map((type) => <option key={type.id} value={type.id}>{type.scheduleMark} · {type.name}</option>)}</select></label>
                {selectedHeader.layout === "flat-stack" ? <label className="story-field"><span>Generated header depth</span><output className="room-output">{formatArchitectural(selectedHeader.plyCount * selectedHeader.plyThickness)}</output></label> : <StoryDimensionInput key={`${selected.id}:hd:${selected.headerDepth}`} label="Header depth" value={selected.headerDepth} onChange={(headerDepth) => replaceSelected({ headerDepth })} />}
                <label className="story-field"><span>King studs per side</span><select value={selected.kingStudCountPerSide} onChange={(event) => replaceSelected({ kingStudCountPerSide: Number(event.target.value) })}>{[0, 1, 2, 3].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
                <label className="story-field"><span>Jack studs per side</span><select value={selected.jackStudCountPerSide} onChange={(event) => replaceSelected({ jackStudCountPerSide: Number(event.target.value) })}>{[0, 1, 2, 3, 4].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
                {selected.kind === "window" ? <label className="story-field"><span>Rough-sill plates</span><select value={selected.windowSillPlateCount} onChange={(event) => replaceSelected({ windowSillPlateCount: Number(event.target.value) })}>{[0, 1, 2].map((count) => <option key={count} value={count}>{count}</option>)}</select></label> : <label className="story-field"><span>Rough sill</span><output className="room-output">Not used for Doors</output></label>}
              </div>
              <p className="opening-type-note">These are explicit drafting and modeling rules, not an engineered span calculation. Header depth is limited by the available space below the top plates; sizing and support counts must be selected for the project&apos;s loads, span, material, and code requirements.</p>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Header Assembly Definition</strong><span>{selected.headerTypeId === null ? `Previewing the ${activeWallType.name} default; ` : ""}shared by {headerUsageCount} Wall or opening type{headerUsageCount === 1 ? "" : "s"}.</span></div><button type="button" onClick={duplicateHeaderType} disabled={draft.headerTypes.length >= MAXIMUM_WALL_HEADER_TYPE_COUNT}>Duplicate &amp; Assign</button></header>
              <div className="foundation-field-grid">
                <label className="story-field"><span>Assembly name</span><input value={selectedHeader.name} maxLength={100} onChange={(event) => replaceSelectedHeader({ name: event.target.value })} /></label>
                <label className="story-field"><span>Schedule mark</span><input value={selectedHeader.scheduleMark} maxLength={16} onChange={(event) => replaceSelectedHeader({ scheduleMark: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} /></label>
                <label className="story-field"><span>Layout</span><select value={selectedHeader.layout} onChange={(event) => { const layout = event.target.value as WallHeaderType["layout"]; replaceSelectedHeader({ layout, ...(layout === "on-edge" ? {} : { alignment: "center", fillMethod: "none" }) }); }}><option value="on-edge">Built-up on edge</option><option value="flat-stack">Members on flat</option><option value="solid">Full Main depth</option></select></label>
                <label className="story-field"><span>Structural material</span><input value={selectedHeader.plyMaterial} maxLength={120} onChange={(event) => replaceSelectedHeader({ plyMaterial: event.target.value })} /></label>
                {selectedHeader.layout !== "solid" ? <label className="story-field"><span>{selectedHeader.layout === "flat-stack" ? "Flat courses" : "Structural plies"}</span><select value={selectedHeader.plyCount} onChange={(event) => replaceSelectedHeader({ plyCount: Number(event.target.value) })}>{[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count}</option>)}</select></label> : null}
                {selectedHeader.layout !== "solid" ? <StoryDimensionInput key={`${selectedHeader.id}:pt:${selectedHeader.plyThickness}`} label={selectedHeader.layout === "flat-stack" ? "Course thickness" : "Ply thickness"} value={selectedHeader.plyThickness} onChange={(plyThickness) => replaceSelectedHeader({ plyThickness })} /> : null}
                {selectedHeader.layout === "on-edge" ? <label className="story-field"><span>Fill method</span><select value={selectedHeader.fillMethod} onChange={(event) => { const fillMethod = event.target.value as WallHeaderType["fillMethod"]; replaceSelectedHeader({ fillMethod, ...(fillMethod === "interior-insulation" ? { alignment: "exterior" } : {}) }); }}><option value="none">None</option><option value="interior-insulation">Rigid insulation at interior</option><option value="between-plies">Spacers between plies</option></select></label> : null}
                {selectedHeader.layout === "on-edge" && selectedHeader.fillMethod !== "none" ? <label className="story-field"><span>{selectedHeader.fillMethod === "interior-insulation" ? "Insulation material" : "Spacer material"}</span><input value={selectedHeader.fillMaterial} maxLength={120} onChange={(event) => replaceSelectedHeader({ fillMaterial: event.target.value })} /></label> : null}
                {selectedHeader.layout === "on-edge" && selectedHeader.fillMethod === "between-plies" ? <StoryDimensionInput key={`${selectedHeader.id}:st:${selectedHeader.spacerThickness}`} label="Spacer thickness" value={selectedHeader.spacerThickness} onChange={(spacerThickness) => replaceSelectedHeader({ spacerThickness })} /> : null}
                {selectedHeader.layout === "on-edge" && selectedHeader.fillMethod !== "interior-insulation" ? <label className="story-field"><span>Across-wall alignment</span><select value={selectedHeader.alignment} onChange={(event) => replaceSelectedHeader({ alignment: event.target.value as WallHeaderType["alignment"] })}><option value="exterior">Exterior</option><option value="center">Centered</option><option value="interior">Interior</option></select></label> : null}
                <label className="story-field"><span>Main thickness required</span><output className="room-output">{wallHeaderTypeRequiredMainThickness(selectedHeader) === 0 ? "Adapts to Wall" : formatArchitectural(wallHeaderTypeRequiredMainThickness(selectedHeader))}</output></label>
                <label className="story-field"><span>Engineering review</span><span className="room-checkbox-field"><input type="checkbox" checked={selectedHeader.engineeringRequired} onChange={(event) => replaceSelectedHeader({ engineeringRequired: event.target.checked })} /> Required</span></label>
              </div>
              <p className="opening-type-note">On-edge plies and spacers are modeled across the Wall Main layer. Interior-rigid assemblies place the structural plies at the exterior and fill the remaining interior cavity. Flat members span the Main layer and stack vertically. Steel is supported as a user-defined rectangular material representation; detailed steel profiles can be added later.</p>
            </section>
          </main>
        </div>
        {error ? <p className="story-manager-error" role="alert">{error}</p> : null}
        <footer className="story-manager-footer"><span>{draft.openingTypes.length} opening types · {draft.headerTypes.length} reusable header assemblies · saved with this project</span><div><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="story-save" onClick={save}>Apply Opening Types</button></div></footer>
      </section>
    </div>
  );
}

function WallFramingManagerDialog({
  building,
  onCancel,
  onSave,
}: {
  building: BuildingStructure;
  onCancel: () => void;
  onSave: (building: BuildingStructure) => void;
}) {
  const [draft, setDraft] = useState<WallFramingSettings>(() => ({ ...building.wallFraming }));
  const [error, setError] = useState("");
  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onCancel();
    };
    window.addEventListener("keydown", closeWithEscape, true);
    return () => window.removeEventListener("keydown", closeWithEscape, true);
  }, [onCancel]);
  const replace = (change: Partial<WallFramingSettings>) => {
    setDraft((current) => ({ ...current, ...change }));
    setError("");
  };
  const save = () => {
    if (!wallFramingSettingsAreValid(draft)) {
      setError("Check the member dimensions, spacing, plate counts, and material name.");
      return;
    }
    const next = cloneBuildingStructure(building);
    next.wallFraming = { ...draft };
    onSave(next);
  };
  return (
    <div className="story-manager-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="story-manager framing-manager" role="dialog" aria-modal="true" aria-labelledby="framing-manager-title">
        <header className="story-manager-header"><div><strong id="framing-manager-title">Wall Framing Defaults</strong><span>Generate conventional light-frame members from each Wall Main layer and its structural rough openings.</span></div><button type="button" onClick={onCancel} aria-label="Close Wall Framing Defaults">×</button></header>
        <div className="framing-manager-body">
          <section className="framing-status-card">
            <strong>Framing Generation</strong>
            <label><input type="checkbox" checked={draft.enabled} onChange={(event) => replace({ enabled: event.target.checked, ...(!event.target.checked ? { showInModel: false } : {}) })} /><span>Generate framing from Walls</span></label>
            <label><input type="checkbox" checked={draft.showInModel} disabled={!draft.enabled} onChange={(event) => replace({ showInModel: event.target.checked })} /><span>Show framing in the 3D model</span></label>
            <p>Framing remains derived from the host Wall and stays on that Wall&apos;s layer. The 3D framing view fades finish layers so structural members remain readable.</p>
          </section>
          <main className="story-editor framing-editor">
            <section className="story-editor-summary foundation-editor-summary">
              <label><span>Framing material</span><input value={draft.material} maxLength={120} onChange={(event) => replace({ material: event.target.value })} /></label>
              <label><span>Layout</span><output className="room-output">{formatArchitectural(draft.studSpacing)} on center</output></label>
              <label><span>Status</span><output className="room-output">{draft.enabled ? "Generated" : "Disabled"}</output></label>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Stud &amp; Plate Layout</strong><span>The Main-layer thickness supplies member depth.</span></div></header>
              <div className="foundation-field-grid">
                <StoryDimensionInput key={`spacing:${draft.studSpacing}`} label="Stud spacing" value={draft.studSpacing} onChange={(studSpacing) => replace({ studSpacing })} />
                <StoryDimensionInput key={`stud:${draft.studWidth}`} label="Stud width" value={draft.studWidth} onChange={(studWidth) => replace({ studWidth })} />
                <StoryDimensionInput key={`plate:${draft.plateHeight}`} label="Plate height" value={draft.plateHeight} onChange={(plateHeight) => replace({ plateHeight })} />
                <label className="story-field"><span>Bottom plates</span><select value={draft.bottomPlateCount} onChange={(event) => replace({ bottomPlateCount: Number(event.target.value) })}>{[0, 1, 2, 3].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
                <label className="story-field"><span>Top plates</span><select value={draft.topPlateCount} onChange={(event) => replace({ topPlateCount: Number(event.target.value) })}>{[0, 1, 2, 3, 4].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
              </div>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Junction Framing</strong><span>Automatic Wall joins determine corners and partition intersections.</span></div></header>
              <div className="foundation-field-grid">
                <label className="story-field"><span>Corner method</span><select value={draft.cornerStyle} onChange={(event) => replace({ cornerStyle: event.target.value as WallCornerFramingStyle })}><option value="three-stud">Three-stud conventional</option><option value="two-stud">Two-stud advanced</option></select></label>
                <label className="story-field"><span>Partition backing</span><select value={draft.partitionBackingStyle} onChange={(event) => replace({ partitionBackingStyle: event.target.value as WallPartitionBackingStyle })}><option value="three-stud">Three-stud backing</option><option value="ladder">Ladder blocking</option><option value="none">None</option></select></label>
                {draft.partitionBackingStyle === "ladder" ? <StoryDimensionInput key={`ladder:${draft.ladderBlockSpacing}`} label="Ladder block spacing" value={draft.ladderBlockSpacing} onChange={(ladderBlockSpacing) => replace({ ladderBlockSpacing })} /> : null}
              </div>
              <p className="opening-type-note">Three-stud corners add one deterministic shared-corner member; the two-stud option leaves one end stud from each participating Wall. Partition backing is generated in the host Wall at resolved T-intersections.</p>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Opening Framing</strong><span>Rough dimensions and bottom-of-header elevations remain authoritative.</span></div></header>
              <div className="foundation-field-grid">
                <StoryDimensionInput key={`header:${draft.headerHeight}`} label="Legacy/custom header depth" value={draft.headerHeight} onChange={(headerHeight) => replace({ headerHeight })} />
                <label className="story-field"><span>Reusable types</span><output className="room-output">Use type-specific framing</output></label>
                <label className="story-field"><span>Window support</span><output className="room-output">Type sill + cripples</output></label>
              </div>
              <p className="opening-type-note">The fallback applies only to older custom openings without a reusable type. Door and Window types control their own header depth, king studs, jack studs, and Window rough-sill count. Door bottom plates are cut at the rough opening; Window bottom plates remain continuous.</p>
            </section>
          </main>
        </div>
        {error ? <p className="story-manager-error" role="alert">{error}</p> : null}
        <footer className="story-manager-footer"><span>Wall framing defaults · saved with this project</span><div><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="story-save" onClick={save}>Apply Framing Defaults</button></div></footer>
      </section>
    </div>
  );
}

type RoomAssemblyOverrideKey = "floorStructureOverride" | "floorFinishOverride" | "ceilingStructureOverride" | "ceilingFinishOverride";

function RoomManagerDialog({
  document,
  onCancel,
  onSave,
}: {
  document: ModelDocument;
  onCancel: () => void;
  onSave: (document: ModelDocument) => void;
}) {
  const [draft, setDraft] = useState(() => cloneDocument(document));
  const [selectedStoryId, setSelectedStoryId] = useState(document.building.activeStoryId);
  const [selectedRoomId, setSelectedRoomId] = useState(document.rooms.find((room) => room.storyId === document.building.activeStoryId)?.id ?? null);
  const [error, setError] = useState("");
  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onCancel();
    };
    window.addEventListener("keydown", closeWithEscape, true);
    return () => window.removeEventListener("keydown", closeWithEscape, true);
  }, [onCancel]);
  const story = draft.building.stories.find((candidate) => candidate.id === selectedStoryId) ?? draft.building.stories[0];
  const rooms = draft.rooms.filter((room) => room.storyId === story.id);
  const selected = rooms.find((room) => room.id === selectedRoomId) ?? rooms[0] ?? null;
  const storyElevation = calculateStoryElevations(draft.building).find((item) => item.storyId === story.id)?.roughFloorElevation ?? 0;
  const effective = selected ? effectiveRoomSettings(selected, story, storyElevation) : null;
  const generatedPlatforms = selected ? roomHorizontalPlatformSolution(draft, selected) : null;
  const perimeterFloorEdgeCount = generatedPlatforms?.floorEdgeConditions.filter((edge) => edge.rule === "perimeter-main-exterior").length ?? 0;
  const foundationFloorEdgeCount = generatedPlatforms?.floorEdgeConditions.filter((edge) => edge.rule === "foundation-sill-exterior").length ?? 0;
  const sharedFloorEdgeCount = generatedPlatforms?.floorEdgeConditions.filter((edge) => edge.rule === "shared-wall-reference").length ?? 0;
  const formatRoomArea = (room: RoomObject) => `${(polylineArea(room.boundary) / 144).toLocaleString(undefined, { maximumFractionDigits: 2 })} sq ft`;
  const selectStory = (storyId: string) => {
    setSelectedStoryId(storyId);
    setSelectedRoomId(draft.rooms.find((room) => room.storyId === storyId)?.id ?? null);
    setError("");
  };
  const replaceSelected = (change: Partial<RoomObject>) => {
    if (!selected) return;
    setDraft((current) => ({ ...cloneDocument(current), rooms: current.rooms.map((room) => room.id === selected.id ? { ...room, ...change } : room) }));
    setError("");
  };
  const detect = () => {
    const next = refreshRoomsForStory(draft, story.id);
    if (!next) {
      setError("Rooms could not be updated. Check that the Story walls form valid closed areas.");
      return;
    }
    const firstRoom = next.rooms.find((room) => room.storyId === story.id) ?? null;
    setDraft(next);
    setSelectedRoomId((current) => next.rooms.some((room) => room.id === current) ? current : firstRoom?.id ?? null);
    setError("");
  };
  const setAssemblyOverride = (key: RoomAssemblyOverrideKey, enabled: boolean) => {
    if (!selected) return;
    const storyKey = key.replace("Override", "") as "floorStructure" | "floorFinish" | "ceilingStructure" | "ceilingFinish";
    replaceSelected({ [key]: enabled ? cloneLayeredAssembly(story[storyKey]) : null });
  };
  const openingBounds = (opening: PlatformOpening) => {
    const xs = opening.boundary.vertices.map((point) => point.x);
    const ys = opening.boundary.vertices.map((point) => point.y);
    const minimumX = Math.min(...xs);
    const maximumX = Math.max(...xs);
    const minimumY = Math.min(...ys);
    const maximumY = Math.max(...ys);
    return {
      centerX: (minimumX + maximumX) / 2,
      centerY: (minimumY + maximumY) / 2,
      depth: maximumY - minimumY,
      width: maximumX - minimumX,
    };
  };
  const replaceOpening = (openingId: string, change: Partial<Omit<PlatformOpening, "id">>) => {
    if (!selected) return;
    const next = updatePlatformOpening(draft, selected.id, openingId, change);
    if (!next) {
      setError("Platform Openings must remain inside the Room, avoid overlaps, and preserve any connected vertical path.");
      return;
    }
    setDraft(next);
    setError("");
  };
  const replaceOpeningRectangle = (opening: PlatformOpening, change: Partial<{ centerX: number; centerY: number; depth: number; width: number }>) => {
    const bounds = { ...openingBounds(opening), ...change };
    const boundary = rectangleFromCorners(
      { x: bounds.centerX - bounds.width / 2, y: bounds.centerY - bounds.depth / 2 },
      { x: bounds.centerX + bounds.width / 2, y: bounds.centerY + bounds.depth / 2 },
      opening.boundary.elevation,
    );
    if (boundary) replaceOpening(opening.id, { boundary });
  };
  const addOpening = () => {
    if (!selected) return;
    const result = addPlatformOpening(draft, selected.id, "stairwell", "both");
    if (!result) {
      setError("A centered opening could not fit inside this Room. Adjust the Room shape before adding an opening.");
      return;
    }
    setDraft(result.document);
    setError("");
  };
  const removeOpening = (openingId: string) => {
    if (!selected) return;
    const next = deletePlatformOpening(draft, selected.id, openingId);
    if (next) setDraft(next);
    setError("");
  };
  const continueOpening = (openingId: string, direction: "above" | "below") => {
    if (!selected) return;
    const next = continuePlatformOpening(draft, selected.id, openingId, direction);
    if (!next) {
      setError(`The opening cannot continue ${direction}. Detect Rooms on the adjacent Story and make sure the same footprint fits fully inside one Room.`);
      return;
    }
    setDraft(next);
    setError("");
  };
  const disconnectOpening = (openingId: string) => {
    if (!selected) return;
    const next = disconnectPlatformOpeningContinuity(draft, selected.id, openingId);
    if (next) setDraft(next);
    setError("");
  };
  const save = () => {
    const next = cloneDocument(draft);
    if (next.rooms.some((room) => !roomObjectIsValid(room, next)) || !platformOpeningContinuityIsValid(next)) {
      setError("Check the Room settings and make sure every connected platform opening stays aligned through adjacent Stories.");
      return;
    }
    onSave(next);
  };
  const overrideEditor = (key: RoomAssemblyOverrideKey, label: string) => {
    if (!selected) return null;
    const assembly = selected[key];
    return (
      <section className="room-override-section" key={key}>
        <label><input type="checkbox" checked={assembly !== null} onChange={(event) => setAssemblyOverride(key, event.target.checked)} /><span>{assembly ? `${label} override` : `Use Story ${label.toLowerCase()}`}</span></label>
        {assembly ? <StoryAssemblyEditor assembly={assembly} onChange={(next) => replaceSelected({ [key]: next })} /> : null}
      </section>
    );
  };
  return (
    <div className="story-manager-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="story-manager room-manager" role="dialog" aria-modal="true" aria-labelledby="room-manager-title">
        <header className="story-manager-header"><div><strong id="room-manager-title">Room Manager</strong><span>Closed Wall loops create Rooms. Each Room inherits its Story settings until an override is enabled.</span></div><button type="button" onClick={onCancel} aria-label="Close Room Manager">×</button></header>
        <div className="story-manager-body">
          <aside className="story-list">
            <header><strong>{story.name}</strong><span>{rooms.length} detected Room{rooms.length === 1 ? "" : "s"}</span></header>
            <label className="room-story-picker"><span>Story</span><select value={story.id} onChange={(event) => selectStory(event.target.value)}>{draft.building.stories.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.name}</option>)}</select></label>
            {rooms.map((room) => <button type="button" key={room.id} className={room.id === selected?.id ? "is-selected" : ""} onClick={() => setSelectedRoomId(room.id)}><strong>{room.name}</strong><span>{formatRoomArea(room)} · {room.boundaryWallIds.length} walls · {room.platformOpenings.length} opening{room.platformOpenings.length === 1 ? "" : "s"}</span>{room.roughCeilingHeightOverride !== null || room.roughFloorOffset !== 0 || room.floorStructureOverride || room.floorFinishOverride || room.ceilingStructureOverride || room.ceilingFinishOverride ? <small>OVERRIDES</small> : <small>STORY DEFAULTS</small>}</button>)}
            <div className="story-list-actions"><button type="button" onClick={detect}>↻ Detect / Update Rooms</button></div>
          </aside>
          <main className="story-editor">
            {selected && effective ? <>
              <section className="story-editor-summary room-editor-summary">
                <label><span>Room name</span><input value={selected.name} maxLength={120} onChange={(event) => replaceSelected({ name: event.target.value })} /></label>
                <label><span>Enclosed area</span><output>{formatRoomArea(selected)}</output></label>
                <label><span>Boundary</span><output>{selected.boundaryWallIds.length} Walls</output></label>
              </section>
              <section className="room-height-settings">
                <StoryDimensionInput signed key={`${selected.id}:floor:${selected.roughFloorOffset}`} label="Rough floor offset" value={selected.roughFloorOffset} onChange={(roughFloorOffset) => replaceSelected({ roughFloorOffset })} />
                <label className="room-inherit-toggle"><input type="checkbox" checked={selected.roughCeilingHeightOverride !== null} onChange={(event) => replaceSelected({ roughCeilingHeightOverride: event.target.checked ? story.roughCeilingHeight : null })} /><span>{selected.roughCeilingHeightOverride === null ? "Use Story ceiling height" : "Override ceiling height"}</span></label>
                {selected.roughCeilingHeightOverride !== null ? <StoryDimensionInput key={`${selected.id}:ceiling:${selected.roughCeilingHeightOverride}`} label="Rough ceiling / plate height" value={selected.roughCeilingHeightOverride} onChange={(roughCeilingHeightOverride) => replaceSelected({ roughCeilingHeightOverride })} /> : <label className="story-field"><span>Effective rough ceiling</span><output className="room-output">{formatArchitectural(effective.roughCeilingHeight)}</output></label>}
              </section>
              <section className="story-calculated-grid room-calculated-grid" aria-label="Effective Room settings">
                <div><span>Effective rough floor</span><strong>{formatSignedArchitectural(effective.roughFloorElevation)}</strong></div>
                <div><span>Effective ceiling height</span><strong>{formatArchitectural(effective.roughCeilingHeight)}</strong></div>
                <div><span>Floor structure</span><strong>{formatArchitectural(assemblyTotalThickness(effective.floorStructure))}</strong></div>
                <div><span>Floor finish</span><strong>{formatArchitectural(assemblyTotalThickness(effective.floorFinish))}</strong></div>
                <div><span>Ceiling structure</span><strong>{formatArchitectural(assemblyTotalThickness(effective.ceilingStructure))}</strong></div>
                <div><span>Ceiling finish</span><strong>{formatArchitectural(assemblyTotalThickness(effective.ceilingFinish))}</strong></div>
              </section>
              <section className="story-calculated-grid room-calculated-grid" aria-label="Generated Room platforms">
                <div><span>Generated floor structure top</span><strong>{generatedPlatforms ? formatSignedArchitectural(generatedPlatforms.roughFloorElevation) : "—"}</strong></div>
                <div><span>Generated finished floor</span><strong>{generatedPlatforms ? formatSignedArchitectural(generatedPlatforms.finishedFloorElevation) : "—"}</strong></div>
                <div><span>Generated rough ceiling</span><strong>{generatedPlatforms ? formatSignedArchitectural(generatedPlatforms.roughCeilingElevation) : "—"}</strong></div>
                <div><span>Generated finished ceiling</span><strong>{generatedPlatforms ? formatSignedArchitectural(generatedPlatforms.finishedCeilingElevation) : "—"}</strong></div>
              </section>
              <section className="room-platform-edges" aria-label="Resolved floor platform edges">
                <header><div><strong>Floor Platform Edges</strong><span>Automatic Wall-aware edge rules</span></div><output>{foundationFloorEdgeCount} foundation · {perimeterFloorEdgeCount} framed · {sharedFloorEdgeCount} shared</output></header>
                {generatedPlatforms?.floorEdgeConditions.map((edge, index) => {
                  const wall = edge.wallId ? draft.lines.find((line) => line.id === edge.wallId) : null;
                  const ruleLabel = edge.rule === "foundation-sill-exterior"
                    ? "Foundation sill exterior"
                    : edge.rule === "perimeter-main-exterior"
                    ? "Exterior face of Main layer"
                    : edge.rule === "shared-wall-reference"
                      ? "Shared Room boundary"
                      : "Room boundary fallback";
                  return <div className="room-platform-edge" key={`${edge.wallId ?? "fallback"}-${index}`}><span>{wall?.name ?? `Boundary edge ${index + 1}`}</span><strong>{ruleLabel}</strong><small>{Math.abs(edge.offsetFromReference) < 1 / 32 ? "On Wall reference" : `${formatArchitectural(Math.abs(edge.offsetFromReference))} from Wall reference`}</small></div>;
                })}
                <p>Where a Foundation Wall aligns with a perimeter edge, its sill exterior edge takes priority. Otherwise the framed Wall Main-layer exterior remains the default. Manual edge offsets remain reserved for exceptional details.</p>
              </section>
              <section className="room-platform-openings" aria-label="Platform Openings">
                <header><div><strong>Platform Openings</strong><span>Hosted cuts for stairs, shafts, and open-below areas</span></div><button type="button" onClick={addOpening}>+ Add Opening</button></header>
                {selected.platformOpenings.length ? selected.platformOpenings.map((opening) => {
                  const bounds = openingBounds(opening);
                  const continuity = platformOpeningContinuity(draft, selected.id, opening.id);
                  const storyIndex = draft.building.stories.findIndex((candidate) => candidate.id === selected.storyId);
                  const canContinueBelow = storyIndex > 0 && !continuity?.below;
                  const canContinueAbove = storyIndex >= 0 && storyIndex < draft.building.stories.length - 1 && !continuity?.above;
                  const continuityLabel = continuity?.above && continuity.below
                    ? `Continues below to ${continuity.below.storyName} and above to ${continuity.above.storyName}`
                    : continuity?.above
                      ? `Continues above to ${continuity.above.storyName}`
                      : continuity?.below
                        ? `Continues below to ${continuity.below.storyName}`
                        : "Single-Story opening";
                  return <article className="room-platform-opening" key={opening.id}>
                    <div className="room-platform-opening-heading">
                      <label><span>Name</span><input value={opening.name} maxLength={120} onChange={(event) => replaceOpening(opening.id, { name: event.target.value })} /></label>
                      <label><span>Purpose</span><select value={opening.kind} onChange={(event) => replaceOpening(opening.id, { kind: event.target.value as PlatformOpening["kind"] })}>{PLATFORM_OPENING_KINDS.map((kind) => <option key={kind} value={kind}>{kind === "open-below" ? "Open Below" : kind === "stairwell" ? "Stairwell" : "Shaft"}</option>)}</select></label>
                      <label><span>Cuts</span><select value={opening.cuts} onChange={(event) => replaceOpening(opening.id, { cuts: event.target.value as PlatformOpening["cuts"] })}>{PLATFORM_OPENING_CUTS.map((cuts) => <option key={cuts} value={cuts}>{cuts === "both" ? "Floor + Ceiling" : cuts === "floor" ? "Floor only" : "Ceiling only"}</option>)}</select></label>
                      <button type="button" className="room-platform-opening-delete" onClick={() => removeOpening(opening.id)}>Delete</button>
                    </div>
                    <div className="room-platform-opening-geometry">
                      <StoryDimensionInput key={`${opening.id}:w:${bounds.width}`} label="Width" value={bounds.width} onChange={(width) => replaceOpeningRectangle(opening, { width })} />
                      <StoryDimensionInput key={`${opening.id}:d:${bounds.depth}`} label="Depth" value={bounds.depth} onChange={(depth) => replaceOpeningRectangle(opening, { depth })} />
                      <StoryDimensionInput signed key={`${opening.id}:x:${bounds.centerX}`} label="Center X" value={bounds.centerX} onChange={(centerX) => replaceOpeningRectangle(opening, { centerX })} />
                      <StoryDimensionInput signed key={`${opening.id}:y:${bounds.centerY}`} label="Center Y" value={bounds.centerY} onChange={(centerY) => replaceOpeningRectangle(opening, { centerY })} />
                    </div>
                    <div className="room-platform-opening-continuity">
                      <span><strong>Vertical path</strong>{continuityLabel}</span>
                      <div>
                        {canContinueBelow ? <button type="button" onClick={() => continueOpening(opening.id, "below")}>Continue Below</button> : null}
                        {canContinueAbove ? <button type="button" onClick={() => continueOpening(opening.id, "above")}>Continue Above</button> : null}
                        {continuity?.verticalOpeningId ? <button type="button" onClick={() => disconnectOpening(opening.id)}>Disconnect Path</button> : null}
                      </div>
                    </div>
                  </article>;
                }) : <p>No platform openings in this Room. Add one when the design needs a stairwell, shaft, or open-below cut.</p>}
              </section>
              {overrideEditor("floorStructureOverride", "Floor structure")}
              {overrideEditor("floorFinishOverride", "Floor finish")}
              {overrideEditor("ceilingStructureOverride", "Ceiling structure")}
              {overrideEditor("ceilingFinishOverride", "Ceiling finish")}
            </> : <section className="room-empty-state"><strong>No enclosed Rooms found on {story.name}</strong><span>Draw connected Walls around each space, then choose Detect / Update Rooms. Open wall networks do not create Rooms.</span><button type="button" onClick={detect}>Detect Rooms</button></section>}
          </main>
        </div>
        {error ? <p className="story-manager-error" role="alert">{error}</p> : null}
        <footer className="story-manager-footer"><span>{rooms.length} Room{rooms.length === 1 ? "" : "s"} on {story.name} · inherited values remain linked to Story defaults</span><div><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="story-save" onClick={save}>Apply Room Settings</button></div></footer>
      </section>
    </div>
  );
}

export function ModelBuilderApp() {
  const [editor, dispatch] = useReducer(historyReducer, {
    future: [],
    past: [],
    present: cloneDocument(NEW_PROJECT_DOCUMENT),
    saved: cloneDocument(NEW_PROJECT_DOCUMENT),
  });
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [selectedEntityKeys, setSelectedEntityKeys] = useState<string[]>([]);
  const [selectedFaceIndex, setSelectedFaceIndex] = useState<number | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [selectedArcId, setSelectedArcId] = useState<string | null>(null);
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [selectedPolylineId, setSelectedPolylineId] = useState<string | null>(null);
  const [dragStatus, setDragStatus] = useState<DragStatus | null>(null);
  const [activeRibbonTab, setActiveRibbonTab] = useState<RibbonTab>("Home");
  const [storyManagerOpen, setStoryManagerOpen] = useState(false);
  const [foundationManagerOpen, setFoundationManagerOpen] = useState(false);
  const [framingManagerOpen, setFramingManagerOpen] = useState(false);
  const [openingTypeManagerOpen, setOpeningTypeManagerOpen] = useState(false);
  const [wallTypeManagerOpen, setWallTypeManagerOpen] = useState(false);
  const [roomManagerOpen, setRoomManagerOpen] = useState(false);
  const [explorerTab, setExplorerTab] = useState<"building" | "objects" | "layers">("objects");
  const [showStartGuide, setShowStartGuide] = useState(true);
  const [topMenu, setTopMenu] = useState<"edit" | "file" | "help" | "program" | "tools" | "view" | "window" | null>(null);
  const interfaceTheme = useSyncExternalStore(subscribeInterfaceTheme, storedInterfaceTheme, () => "light");
  const [layerFilter, setLayerFilter] = useState("");
  const [fitViewSignal, setFitViewSignal] = useState(0);
  const [viewTarget, setViewTarget] = useState<ViewTarget>(VIEW_PRESETS.top);
  const [copyMode, setCopyMode] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [mirrorMode, setMirrorMode] = useState(false);
  const [mirrorKeepSource, setMirrorKeepSource] = useState(true);
  const [offsetMode, setOffsetMode] = useState(false);
  const [offsetDistance, setOffsetDistance] = useState(6);
  const [offsetKeepSource, setOffsetKeepSource] = useState(true);
  const [chamferMode, setChamferMode] = useState(false);
  const [chamferFirstDistance, setChamferFirstDistance] = useState(6);
  const [chamferSecondDistance, setChamferSecondDistance] = useState(6);
  const [chamferStage, setChamferStage] = useState<0 | 1>(0);
  const [chamferDistancePrompt, setChamferDistancePrompt] = useState<0 | 1 | 2>(0);
  const [breakMode, setBreakMode] = useState<BreakMode | null>(null);
  const [breakStage, setBreakStage] = useState<0 | 1 | 2>(0);
  const [boundaryMode, setBoundaryMode] = useState(false);
  const [filletMode, setFilletMode] = useState(false);
  const [filletRadius, setFilletRadius] = useState(6);
  const [filletStage, setFilletStage] = useState<0 | 1>(0);
  const [lengthenMode, setLengthenMode] = useState(false);
  const [lengthenMethod, setLengthenMethod] = useState<LengthenMethod>("delta");
  const [lengthenValue, setLengthenValue] = useState(6);
  const [trimMode, setTrimMode] = useState(false);
  const [extendMode, setExtendMode] = useState(false);
  const [rotateMode, setRotateMode] = useState(false);
  const [scaleMode, setScaleMode] = useState(false);
  const [stretchMode, setStretchMode] = useState(false);
  const [stretchTargets, setStretchTargets] = useState<CadStretchTarget[]>([]);
  const [lineMode, setLineMode] = useState(false);
  const [wallMode, setWallMode] = useState(false);
  const [foundationWallMode, setFoundationWallMode] = useState(false);
  const [lineAnchor, setLineAnchor] = useState<LinePoint | null>(null);
  const [lineCommand, setLineCommand] = useState<LineViewportCommand | null>(null);
  const [arcPoints, setArcPoints] = useState<LinePoint[]>([]);
  const [arcCommand, setArcCommand] = useState<ArcViewportCommand | null>(null);
  const [arcMethod, setArcMethod] = useState<ArcMethod>("three-point");
  const [arcContinueSeed, setArcContinueSeed] = useState<ArcContinueSeed | null>(null);
  const [circlePoints, setCirclePoints] = useState<LinePoint[]>([]);
  const [circleCommand, setCircleCommand] = useState<CircleViewportCommand | null>(null);
  const [circleMethod, setCircleMethod] = useState<CircleMethod>("center-radius");
  const [polylineAnchor, setPolylineAnchor] = useState<LinePoint | null>(null);
  const [polylineCommand, setPolylineCommand] = useState<PolylineViewportCommand | null>(null);
  const [rectangleAnchor, setRectangleAnchor] = useState<LinePoint | null>(null);
  const [rectangleCommand, setRectangleCommand] = useState<RectangleViewportCommand | null>(null);
  const [lineSnapAngles, setLineSnapAngles] = useState(() => [0, 90, 180, 270, ...storedAdditionalLineSnapAngles()]);
  const [lineSnapAngleDraft, setLineSnapAngleDraft] = useState(() => storedAdditionalLineSnapAngles().join(", "));
  const [lineSnapAngleError, setLineSnapAngleError] = useState("");
  const [cadDraftingSettings, setCadDraftingSettings] = useState(storedCadDraftingSettings);
  const [objectSnapOverride, setObjectSnapOverride] = useState<ObjectSnapMode | null>(null);
  const [activeElevationDraft, setActiveElevationDraft] = useState(() => formatSignedArchitectural(storedCadDraftingSettings().activeElevation));
  const [activeElevationError, setActiveElevationError] = useState("");
  const [commandDraft, setCommandDraft] = useState("");
  const [lastCommandName, setLastCommandName] = useState<"arc" | "circle" | "foundation-wall" | "line" | "polyline" | "rectangle" | "wall" | null>(null);
  const [arcMode, setArcMode] = useState(false);
  const [circleMode, setCircleMode] = useState(false);
  const [polylineMode, setPolylineMode] = useState(false);
  const [polylineSegmentMode, setPolylineSegmentMode] = useState<PolylineSegmentMode>("line");
  const [polylineWidth, setPolylineWidth] = useState(0);
  const [polylineWidthDraft, setPolylineWidthDraft] = useState("0");
  const [rectangleMode, setRectangleMode] = useState(false);
  const [rectangleMethod, setRectangleMethod] = useState<RectangleMethod>("corners");
  const [rectangleCornerStyle, setRectangleCornerStyle] = useState<RectangleCornerStyle>("sharp");
  const [rectangleWidthDimension, setRectangleWidthDimension] = useState(144);
  const [rectangleHeight, setRectangleHeight] = useState(96);
  const [rectangleArea, setRectangleArea] = useState(144 * 96);
  const [rectangleAreaBasis, setRectangleAreaBasis] = useState<RectangleAreaBasis>("length");
  const [rectangleFixedDimension, setRectangleFixedDimension] = useState(144);
  const [rectangleRotation, setRectangleRotation] = useState(0);
  const [rectangleWidth, setRectangleWidth] = useState(0);
  const [rectangleChamferX, setRectangleChamferX] = useState(0);
  const [rectangleChamferY, setRectangleChamferY] = useState(0);
  const [rectangleFilletRadius, setRectangleFilletRadius] = useState(0);
  const [rectangleWidthDimensionDraft, setRectangleWidthDimensionDraft] = useState("12'-0\"");
  const [rectangleHeightDraft, setRectangleHeightDraft] = useState("8'-0\"");
  const [rectangleAreaDraft, setRectangleAreaDraft] = useState("96");
  const [rectangleFixedDimensionDraft, setRectangleFixedDimensionDraft] = useState("12'-0\"");
  const [rectangleRotationDraft, setRectangleRotationDraft] = useState("0");
  const [rectangleWidthDraft, setRectangleWidthDraft] = useState("0");
  const [rectangleChamferXDraft, setRectangleChamferXDraft] = useState("0");
  const [rectangleChamferYDraft, setRectangleChamferYDraft] = useState("0");
  const [rectangleFilletRadiusDraft, setRectangleFilletRadiusDraft] = useState("0");
  const [rotationBaseKey, setRotationBaseKey] = useState<RotationBaseKey>("center");
  const [scaleBaseKey, setScaleBaseKey] = useState<RotationBaseKey>("center");
  const [projectName, setProjectName] = useState("Untitled Model");
  const [savedProjectName, setSavedProjectName] = useState("Untitled Model");
  const [projectCreatedAt, setProjectCreatedAt] = useState(() => new Date().toISOString());
  const [fileNotice, setFileNotice] = useState<{
    text: string;
    tone: "error" | "info" | "success";
  } | null>(null);
  const [recoveredAt, setRecoveredAt] = useState<string | null>(null);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const lineCommandIdRef = useRef(0);
  const arcCommandIdRef = useRef(0);
  const circleCommandIdRef = useRef(0);
  const polylineCommandIdRef = useRef(0);
  const rectangleCommandIdRef = useRef(0);
  const arcMethodCommandRef = useRef<ArcMethod>("three-point");
  const arcContinueSeedCommandRef = useRef<ArcContinueSeed | null>(null);
  const continuableEntityHistoryRef = useRef<ContinuableEntityReference[]>([]);
  const recoveryErrorReportedRef = useRef(false);

  const selectedBox = findBoxObject(editor.present, selectedObjectId);
  const selectedLine = findLineObject(editor.present, selectedLineId);
  const selectedWallJoinPlan = buildAutomaticWallJoinPlan(editor.present.lines, editor.present.building.wallTypes);
  const selectedFoundationWallJoinPlan = buildAutomaticFoundationWallJoinPlan(editor.present.lines, editor.present.building.foundationWallTypes);
  const selectedWallJoinCount = selectedLine?.architecturalRole === "foundation-wall"
    ? automaticFoundationWallJoinCount(selectedLine.id, selectedFoundationWallJoinPlan)
    : selectedLine?.architecturalRole === "wall"
      ? automaticWallJoinCount(selectedLine.id, selectedWallJoinPlan)
      : 0;
  const selectedWallUnresolvedCount = selectedLine?.architecturalRole === "foundation-wall"
    ? unresolvedFoundationWallJunctionCount(selectedLine.id, selectedFoundationWallJoinPlan)
    : selectedLine?.architecturalRole === "wall"
      ? unresolvedWallJunctionCount(selectedLine.id, selectedWallJoinPlan)
      : 0;
  const selectedWallJunctionLabel = selectedWallJoinCount && selectedWallUnresolvedCount
    ? `${selectedWallJoinCount} automatic · ${selectedWallUnresolvedCount} unresolved`
    : selectedWallUnresolvedCount
      ? `${selectedWallUnresolvedCount} unresolved`
      : selectedWallJoinCount
        ? `${selectedWallJoinCount} automatic`
        : "Open ends";
  const selectedLineIsEditable = Boolean(selectedLine && lineIsEditable(editor.present, selectedLine));
  const selectedPolyline = findPolylineObject(editor.present, selectedPolylineId);
  const selectedPolylineIsEditable = Boolean(selectedPolyline && polylineIsEditable(editor.present, selectedPolyline));
  const selectedCircle = findCircleObject(editor.present, selectedCircleId);
  const selectedCircleIsEditable = Boolean(selectedCircle && circleIsEditable(editor.present, selectedCircle));
  const selectedArc = findArcObject(editor.present, selectedArcId);
  const selectedArcIsEditable = Boolean(selectedArc && arcIsEditable(editor.present, selectedArc));
  const activeStory = editor.present.building.stories.find((story) => story.id === editor.present.building.activeStoryId) ?? editor.present.building.stories[0];
  const activeWallType = editor.present.building.wallTypes.find((wallType) => wallType.id === editor.present.building.activeWallTypeId) ?? editor.present.building.wallTypes[0];
  const activeFoundationWallType = editor.present.building.foundationWallTypes.find((type) => type.id === editor.present.building.activeFoundationWallTypeId) ?? editor.present.building.foundationWallTypes[0];
  const modelEntityCount = editor.present.objects.length + editor.present.lines.length + editor.present.polylines.length + editor.present.circles.length + editor.present.arcs.length;
  const activeStoryRoomCount = editor.present.rooms.filter((room) => room.storyId === activeStory.id).length;
  const setDrawingPlaneFromBuilding = useCallback((building: BuildingStructure) => {
    const activeId = building.activeStoryId;
    const elevation = calculateStoryElevations(building).find((calculation) => calculation.storyId === activeId)?.roughFloorElevation ?? 0;
    setCadDraftingSettings((current) => current.activeElevation === elevation ? current : { ...current, activeElevation: elevation });
    setActiveElevationDraft(formatSignedArchitectural(elevation));
    setActiveElevationError("");
  }, []);
  const rectangleDraftSettings: RectangleDraftSettings = {
    area: rectangleArea,
    areaBasis: rectangleAreaBasis,
    chamferX: rectangleCornerStyle === "chamfer" ? rectangleChamferX : 0,
    chamferY: rectangleCornerStyle === "chamfer" ? rectangleChamferY : 0,
    filletRadius: rectangleCornerStyle === "fillet" ? rectangleFilletRadius : 0,
    fixedDimension: rectangleFixedDimension,
    height: rectangleHeight,
    method: rectangleMethod,
    rotation: rectangleRotation,
    width: rectangleWidth,
    widthDimension: rectangleWidthDimension,
  };
  const selectedObjects = selectedObjectIds
    .map((objectId) => findBoxObject(editor.present, objectId))
    .filter((object): object is BoxObject => object !== null);
  const selectionIsEditable = selectedObjects.length === selectedObjectIds.length &&
    selectedObjects.every((object) => objectIsEditable(editor.present, object));
  const selectedEntityRefs = selectedEntityKeys
    .map(cadEntityRefFromKey)
    .filter((ref): ref is CadEntityRef => ref !== null);
  const selectionCanModify = selectedEntityRefs.length > 0 &&
    selectedEntityRefs.every((ref) => modelEntityIsEditable(editor.present, ref));
  const selectedOffsetRef = selectedEntityRefs.length === 1 && selectedEntityRefs[0].kind !== "box"
    ? selectedEntityRefs[0]
    : null;
  const selectionCanOffset = Boolean(selectedOffsetRef && modelEntityIsEditable(editor.present, selectedOffsetRef));
  const selectionCanTrim = selectionCanOffset;
  const selectionCanExtend = Boolean(
    selectedOffsetRef &&
    selectedOffsetRef.kind !== "circle" &&
    modelEntityIsEditable(editor.present, selectedOffsetRef) &&
    (selectedOffsetRef.kind !== "polyline" || !findPolylineObject(editor.present, selectedOffsetRef.id)?.closed),
  );
  const selectionCanJoin = selectedEntityRefs.length >= 2 && selectedEntityRefs.every((ref) =>
    (ref.kind === "line" || ref.kind === "arc" || (ref.kind === "polyline" && !findPolylineObject(editor.present, ref.id)?.closed)) &&
    modelEntityIsEditable(editor.present, ref));
  const selectedExplodePolylines = selectedEntityRefs
    .filter((ref) => ref.kind === "polyline")
    .map((ref) => findPolylineObject(editor.present, ref.id))
    .filter((polyline): polyline is PolylineObject => polyline !== null);
  const selectionCanExplode = selectedEntityRefs.length > 0 &&
    selectedExplodePolylines.length === selectedEntityRefs.length &&
    selectedEntityRefs.every((ref) => modelEntityIsEditable(editor.present, ref));
  const selectedExplodeSegmentCount = selectedExplodePolylines.reduce((total, polyline) => total + polylineSegments(polyline).length, 0);
  const selectedExplodeHasWidth = selectedExplodePolylines.some((polyline) => (polyline.width ?? 0) > 0);
  const selectedLengthenRef = selectedEntityRefs.length === 1 &&
    (selectedEntityRefs[0].kind === "line" || selectedEntityRefs[0].kind === "arc" ||
      (selectedEntityRefs[0].kind === "polyline" && !findPolylineObject(editor.present, selectedEntityRefs[0].id)?.closed))
    ? selectedEntityRefs[0]
    : null;
  const selectionCanLengthen = Boolean(selectedLengthenRef && modelEntityIsEditable(editor.present, selectedLengthenRef));
  const selectedCornerPolyline = selectedEntityRefs.length === 1 && selectedEntityRefs[0].kind === "polyline"
    ? findPolylineObject(editor.present, selectedEntityRefs[0].id)
    : null;
  const selectionCanModifyPolylineCorners = Boolean(
    selectedCornerPolyline && polylineIsEditable(editor.present, selectedCornerPolyline),
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(LINE_SNAP_ANGLES_STORAGE_KEY, JSON.stringify(lineSnapAngles));
    } catch {
      // Line tracking settings remain available for the current session.
    }
  }, [lineSnapAngles]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CAD_DRAFTING_SETTINGS_STORAGE_KEY, JSON.stringify(cadDraftingSettings));
    } catch {
      // Drafting settings remain available for the current session.
    }
  }, [cadDraftingSettings]);

  useEffect(() => {
    document.documentElement.style.colorScheme = interfaceTheme;
  }, [interfaceTheme]);

  const commonGroupId = selectedObjects.length > 1 &&
    selectedObjects[0]?.groupId &&
    selectedObjects.every((object) => object.groupId === selectedObjects[0].groupId)
      ? selectedObjects[0].groupId
      : null;
  const selectedGroup = findGroup(editor.present, commonGroupId);
  const allSelectedLocked = selectedObjects.length > 0 && selectedObjects.every((object) => object.locked);
  const canCreateGroup = selectedObjects.length > 1 && selectionIsEditable &&
    selectedObjects.every((object) => object.groupId === null);
  const rotationReadout = selectedObjects.length && selectedObjects.every((object) => object.rotationZ === selectedObjects[0].rotationZ)
    ? `${selectedObjects[0].rotationZ}°`
    : selectedBox ? `Mixed · primary ${selectedBox.rotationZ}°`
      : selectedLine ? `${lineAngle(selectedLine)}° line angle`
        : "Selection geometry";
  const selectedLayer = findLayer(editor.present, selectedBox?.layerId ?? null);
  const activeLayer = findLayer(editor.present, editor.present.activeLayerId);
  const filteredLayers = editor.present.layers.filter((layer) =>
    layer.name.toLocaleLowerCase().includes(layerFilter.trim().toLocaleLowerCase()),
  );
  const selectedFace = selectedBox && selectedFaceIndex !== null
    ? FACE_DEFINITIONS[selectedFaceIndex]
    : null;
  const normalizedProjectName = projectName.trim() || "Untitled Model";
  const isDirty =
    !documentsEqual(editor.present, editor.saved) ||
    normalizedProjectName !== savedProjectName;
  const isPristineProject =
    !isDirty &&
    normalizedProjectName === "Untitled Model" &&
    documentsEqual(editor.present, NEW_PROJECT_DOCUMENT);

  const applyCadSelection = useCallback((
    document: ModelDocument,
    refs: CadEntityRef[],
    primaryRef: CadEntityRef | null = refs.at(-1) ?? null,
  ) => {
    const expanded: CadEntityRef[] = [];
    refs.forEach((ref) => {
      const candidates = ref.kind === "box"
        ? selectionIdsForObject(document, ref.id).map((id) => ({ id, kind: "box" as const }))
        : [ref];
      candidates.forEach((candidate) => {
        if (!expanded.some((existing) => cadEntityKey(existing) === cadEntityKey(candidate))) expanded.push(candidate);
      });
    });
    const keys = expanded.map(cadEntityKey);
    const boxIds = expanded.filter((ref) => ref.kind === "box").map((ref) => ref.id);
    setSelectedEntityKeys(keys);
    setSelectedObjectIds(boxIds);
    setSelectedObjectId(primaryRef?.kind === "box" && boxIds.includes(primaryRef.id) ? primaryRef.id : null);
    setSelectedLineId(primaryRef?.kind === "line" && keys.includes(cadEntityKey(primaryRef)) ? primaryRef.id : null);
    setSelectedPolylineId(primaryRef?.kind === "polyline" && keys.includes(cadEntityKey(primaryRef)) ? primaryRef.id : null);
    setSelectedCircleId(primaryRef?.kind === "circle" && keys.includes(cadEntityKey(primaryRef)) ? primaryRef.id : null);
    setSelectedArcId(primaryRef?.kind === "arc" && keys.includes(cadEntityKey(primaryRef)) ? primaryRef.id : null);
    setSelectedFaceIndex(null);
    setDragStatus(null);
  }, []);

  const setSelectionForDocument = useCallback((
    document: ModelDocument,
    objectId: string | null,
    faceIndex: number | null = null,
  ) => {
    const selectionIds = objectId ? selectionIdsForObject(document, objectId) : [];
    const object = findBoxObject(document, objectId);
    applyCadSelection(
      document,
      selectionIds.map((id) => ({ id, kind: "box" })),
      objectId ? { id: objectId, kind: "box" } : null,
    );
    setSelectedFaceIndex(
      selectionIds.length === 1 && object && objectIsEditable(document, object)
        ? faceIndex
        : null,
    );
  }, [applyCadSelection]);

  const selectCadEntity = useCallback((ref: CadEntityRef | null, additive = false) => {
    if (!ref) {
      if (!additive) applyCadSelection(editor.present, []);
      return;
    }
    const targetRefs = ref.kind === "box"
      ? selectionIdsForObject(editor.present, ref.id).map((id) => ({ id, kind: "box" as const }))
      : [ref];
    if (!additive) {
      applyCadSelection(editor.present, targetRefs, ref);
      return;
    }
    const currentRefs = selectedEntityKeys
      .map(cadEntityRefFromKey)
      .filter((candidate): candidate is CadEntityRef => candidate !== null);
    const currentKeys = new Set(currentRefs.map(cadEntityKey));
    const targetKeys = new Set(targetRefs.map(cadEntityKey));
    const allSelected = targetRefs.every((candidate) => currentKeys.has(cadEntityKey(candidate)));
    const nextRefs = allSelected
      ? currentRefs.filter((candidate) => !targetKeys.has(cadEntityKey(candidate)))
      : [...currentRefs, ...targetRefs.filter((candidate) => !currentKeys.has(cadEntityKey(candidate)))];
    applyCadSelection(editor.present, nextRefs, allSelected ? nextRefs.at(-1) ?? null : ref);
  }, [applyCadSelection, editor.present, selectedEntityKeys]);

  const selectLine = useCallback((lineId: string | null, additive = false) => {
    const line = findLineObject(editor.present, lineId);
    const layer = findLayer(editor.present, line?.layerId ?? null);
    if (line && !layer?.visible) return;
    selectCadEntity(line ? { id: line.id, kind: "line" } : null, additive);
    setCopyMode(false);
    setMoveMode(false);
    setRotateMode(false);
    setScaleMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setStretchMode(false);
    setStretchTargets([]);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setWallMode(false);
    setFoundationWallMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setShowStartGuide(true);
    setDragStatus(null);
  }, [editor.present, selectCadEntity]);

  const selectPolyline = useCallback((polylineId: string | null, additive = false) => {
    const polyline = findPolylineObject(editor.present, polylineId);
    const layer = findLayer(editor.present, polyline?.layerId ?? null);
    if (polyline && !layer?.visible) return;
    selectCadEntity(polyline ? { id: polyline.id, kind: "polyline" } : null, additive);
    setCopyMode(false);
    setMoveMode(false);
    setRotateMode(false);
    setScaleMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setWallMode(false);
    setFoundationWallMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setDragStatus(null);
  }, [editor.present, selectCadEntity]);

  const selectCircle = useCallback((circleId: string | null, additive = false) => {
    const circle = findCircleObject(editor.present, circleId);
    const layer = findLayer(editor.present, circle?.layerId ?? null);
    if (circle && !layer?.visible) return;
    selectCadEntity(circle ? { id: circle.id, kind: "circle" } : null, additive);
    setCopyMode(false);
    setMoveMode(false);
    setRotateMode(false);
    setScaleMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setDragStatus(null);
  }, [editor.present, selectCadEntity]);

  const selectArc = useCallback((arcId: string | null, additive = false) => {
    const arc = findArcObject(editor.present, arcId);
    const layer = findLayer(editor.present, arc?.layerId ?? null);
    if (arc && !layer?.visible) return;
    selectCadEntity(arc ? { id: arc.id, kind: "arc" } : null, additive);
    setCopyMode(false);
    setMoveMode(false);
    setRotateMode(false);
    setScaleMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setDragStatus(null);
  }, [editor.present, selectCadEntity]);

  const setSingleSelection = useCallback((objectId: string | null, faceIndex: number | null = null) => {
    setSelectionForDocument(editor.present, objectId, faceIndex);
  }, [editor.present, setSelectionForDocument]);

  const selectObject = useCallback((
    objectId: string | null,
    faceIndex: number | null,
    additive: boolean,
  ) => {
    setOffsetMode(false);
    if (!objectId) {
      if (!additive) setSingleSelection(null);
      return;
    }
    const object = findBoxObject(editor.present, objectId);
    if (!object || !objectIsSelectable(editor.present, object)) return;
    const targetIds = selectionIdsForObject(editor.present, objectId);
    selectCadEntity({ id: objectId, kind: "box" }, additive);
    setSelectedFaceIndex(!additive && targetIds.length === 1 && objectIsEditable(editor.present, object) ? faceIndex : null);
  }, [editor.present, selectCadEntity, setSingleSelection]);

  const selectWindow = useCallback((refs: CadEntityRef[], additive: boolean, mode: SelectionWindowMode) => {
    const expandedTargets = refs.flatMap((ref) => ref.kind === "box"
      ? selectionIdsForObject(editor.present, ref.id).map((id) => ({ id, kind: "box" as const }))
      : [ref]);
    const uniqueTargets = expandedTargets.filter((ref, index, all) =>
      all.findIndex((candidate) => cadEntityKey(candidate) === cadEntityKey(ref)) === index);
    const currentRefs = selectedEntityKeys
      .map(cadEntityRefFromKey)
      .filter((ref): ref is CadEntityRef => ref !== null);
    const currentKeys = new Set(currentRefs.map(cadEntityKey));
    const targetKeys = new Set(uniqueTargets.map(cadEntityKey));
    const allSelected = uniqueTargets.length > 0 && uniqueTargets.every((ref) => currentKeys.has(cadEntityKey(ref)));
    const nextRefs = !additive
      ? uniqueTargets
      : allSelected
        ? currentRefs.filter((ref) => !targetKeys.has(cadEntityKey(ref)))
        : [...currentRefs, ...uniqueTargets.filter((ref) => !currentKeys.has(cadEntityKey(ref)))];
    applyCadSelection(editor.present, nextRefs, nextRefs.at(-1) ?? null);
    if (uniqueTargets.length > 0) {
      setFileNotice({
        text: `${mode === "window" ? "Window" : "Crossing"} selected ${uniqueTargets.length} entit${uniqueTargets.length === 1 ? "y" : "ies"}${additive ? " with Shift" : ""}.`,
        tone: "success",
      });
    }
  }, [applyCadSelection, editor.present, selectedEntityKeys]);

  const selectStretchTargets = useCallback((targets: CadStretchTarget[], mode: SelectionWindowMode) => {
    const editableTargets = targets.filter((target) => modelEntityIsEditable(editor.present, target));
    if (!editableTargets.length) {
      setStretchTargets([]);
      setFileNotice({
        text: mode === "window"
          ? "Stretch needs geometry inside the window. Drag right-to-left across endpoints or vertices for a partial stretch."
          : "No editable endpoints or vertices were captured. Draw another crossing window.",
        tone: "info",
      });
      return;
    }
    const refs = editableTargets.map(({ id, kind }) => ({ id, kind } satisfies CadEntityRef));
    setStretchTargets(editableTargets);
    applyCadSelection(editor.present, refs, refs.at(-1) ?? null);
    const componentCount = editableTargets.reduce((sum, target) => sum + (target.whole ? 1 : target.components.length), 0);
    setFileNotice({
      text: `${mode === "crossing" ? "Crossing" : "Window"} captured ${componentCount} stretch target${componentCount === 1 ? "" : "s"}. Specify a base point, then the target point.`,
      tone: "success",
    });
  }, [applyCadSelection, editor.present]);

  useEffect(() => {
    const selectAll = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLocaleLowerCase() !== "a") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (arcMode || circleMode || lineMode || mirrorMode || offsetMode || polylineMode || rectangleMode) return;
      event.preventDefault();
      const refs = visibleCadEntityRefs(editor.present);
      applyCadSelection(editor.present, refs, refs.at(-1) ?? null);
      setFileNotice({ text: `Selected all ${refs.length} visible entit${refs.length === 1 ? "y" : "ies"}.`, tone: "success" });
    };
    window.addEventListener("keydown", selectAll);
    return () => window.removeEventListener("keydown", selectAll);
  }, [applyCadSelection, arcMode, circleMode, editor.present, lineMode, mirrorMode, offsetMode, polylineMode, rectangleMode]);

  const persistRecovery = useCallback(() => {
    if (!recoveryReady) return true;
    try {
      if (isPristineProject) {
        window.localStorage.removeItem(PROJECT_RECOVERY_STORAGE_KEY);
        return true;
      }
      const autosavedAt = new Date().toISOString();
      const snapshot = createRecoverySnapshot({
        autosavedAt,
        createdAt: projectCreatedAt,
        currentDocument: editor.present,
        projectName: normalizedProjectName,
        savedDocument: editor.saved,
        savedProjectName,
      });
      window.localStorage.setItem(
        PROJECT_RECOVERY_STORAGE_KEY,
        serializeRecoverySnapshot(snapshot),
      );
      return true;
    } catch {
      return false;
    }
  }, [
    editor.present,
    editor.saved,
    isPristineProject,
    normalizedProjectName,
    projectCreatedAt,
    recoveryReady,
    savedProjectName,
  ]);

  const commitModel = useCallback((next: BoxModel) => {
    if (!selectedObjectId) return;
    const nextDocument = updateBoxObject(editor.present, selectedObjectId, next);
    if (nextDocument) dispatch({ type: "commit", next: nextDocument });
  }, [editor.present, selectedObjectId]);

  const moveFaceByExactGripDistance = useCallback((
    objectId: string,
    faceIndex: number,
    distance: number,
  ) => {
    const object = findBoxObject(editor.present, objectId);
    const nextBox = object ? moveBoxFace(object, faceIndex, distance) : null;
    if (!nextBox) return false;
    const nextDocument = updateBoxObject(editor.present, objectId, nextBox);
    if (!nextDocument) return false;
    dispatch({ type: "commit", next: nextDocument });
    return true;
  }, [editor.present]);

  const updateDimension = useCallback((key: DimensionKey, value: number) => {
    if (!selectedBox || !selectedObjectId) return;
    const nextBox = cloneBoxModel(selectedBox);
    nextBox.dimensions[key] = value;
    const nextDocument = updateBoxObject(editor.present, selectedObjectId, nextBox);
    if (nextDocument) dispatch({ type: "commit", next: nextDocument });
  }, [editor.present, selectedBox, selectedObjectId]);

  const updatePosition = useCallback((axis: AxisKey, value: number) => {
    if (!selectedObjectId) return;
    const next = setBoxObjectPosition(editor.present, selectedObjectId, axis, value);
    if (next) dispatch({ type: "commit", next });
  }, [editor.present, selectedObjectId]);

  const moveSelectedObject = useCallback((axis: AxisKey, distance: number) => {
    if (!selectionCanModify) return false;
    const next = moveModelEntities(editor.present, selectedEntityRefs, {
      x: axis === "x" ? distance : 0,
      y: axis === "y" ? distance : 0,
      z: axis === "z" ? distance : 0,
    });
    if (!next) return false;
    dispatch({ type: "commit", next });
    setMoveMode(false);
    setFileNotice({ text: `Moved ${selectedEntityRefs.length} entit${selectedEntityRefs.length === 1 ? "y" : "ies"}.`, tone: "success" });
    return true;
  }, [editor.present, selectedEntityRefs, selectionCanModify]);

  const rotateSelection = useCallback((degrees: number) => {
    if (!selectionCanModify) return false;
    const base = modelSelectionRotationBase(editor.present, selectedEntityRefs, rotationBaseKey);
    const next = base ? rotateModelEntities(editor.present, selectedEntityRefs, base, degrees) : null;
    if (!next) return false;
    dispatch({ type: "commit", next });
    setSelectedFaceIndex(null);
    setFileNotice({ text: `Rotated ${selectedEntityRefs.length} entit${selectedEntityRefs.length === 1 ? "y" : "ies"} ${Math.abs(degrees)}° ${degrees < 0 ? "clockwise" : "counterclockwise"}.`, tone: "success" });
    return true;
  }, [editor.present, rotationBaseKey, selectedEntityRefs, selectionCanModify]);

  const scaleSelection = useCallback((factor: number) => {
    if (!selectionCanModify) return false;
    const base = modelSelectionScaleBase(editor.present, selectedEntityRefs, scaleBaseKey);
    const next = base ? scaleModelEntities(editor.present, selectedEntityRefs, base, factor) : null;
    if (!next) return false;
    dispatch({ type: "commit", next });
    setSelectedFaceIndex(null);
    setFileNotice({ text: `Scaled ${selectedEntityRefs.length} entit${selectedEntityRefs.length === 1 ? "y" : "ies"} by ${Math.round(factor * 1000) / 1000}×.`, tone: "success" });
    return true;
  }, [editor.present, scaleBaseKey, selectedEntityRefs, selectionCanModify]);

  const commitMirrorMode = useCallback((
    before: ModelDocument,
    next: ModelDocument,
    refs: CadEntityRef[],
    keepSource: boolean,
  ) => {
    dispatch({ type: "commit-preview", before, next });
    applyCadSelection(next, refs, refs.at(-1) ?? null);
    setSelectedFaceIndex(null);
    setFileNotice({ text: `Mirrored ${refs.length} entit${refs.length === 1 ? "y" : "ies"}; source entities ${keepSource ? "kept" : "replaced"}.`, tone: "success" });
  }, [applyCadSelection]);

  const quickMirrorSelection = useCallback((orientation: "horizontal" | "vertical") => {
    if (!selectionCanModify) return false;
    const bounds = modelSelectionBounds(editor.present, selectedEntityRefs);
    if (!bounds) return false;
    const center = {
      x: (bounds.minimum.x + bounds.maximum.x) / 2,
      y: (bounds.minimum.y + bounds.maximum.y) / 2,
      z: (bounds.minimum.z + bounds.maximum.z) / 2,
    };
    const span = Math.max(bounds.maximum.x - bounds.minimum.x, bounds.maximum.y - bounds.minimum.y, 24) + 24;
    const axisStart = orientation === "vertical"
      ? { x: center.x, y: center.y - span, z: center.z }
      : { x: center.x - span, y: center.y, z: center.z };
    const axisEnd = orientation === "vertical"
      ? { x: center.x, y: center.y + span, z: center.z }
      : { x: center.x + span, y: center.y, z: center.z };
    const result = mirrorModelEntities(editor.present, selectedEntityRefs, axisStart, axisEnd, mirrorKeepSource);
    if (!result) return false;
    commitMirrorMode(editor.present, result.document, result.refs, mirrorKeepSource);
    setMirrorMode(false);
    return true;
  }, [commitMirrorMode, editor.present, mirrorKeepSource, selectedEntityRefs, selectionCanModify]);

  const commitOffsetMode = useCallback((
    before: ModelDocument,
    next: ModelDocument,
    ref: CadEntityRef,
    keepSource: boolean,
  ) => {
    dispatch({ type: "commit-preview", before, next });
    applyCadSelection(next, [ref], ref);
    setSelectedFaceIndex(null);
    setFileNotice({ text: `Offset created at ${formatArchitectural(offsetDistance)}; source ${keepSource ? "kept" : "replaced"}.`, tone: "success" });
  }, [applyCadSelection, offsetDistance]);

  const commitTrimExtendMode = useCallback((
    before: ModelDocument,
    next: ModelDocument,
    refs: CadEntityRef[],
    operation: "extend" | "trim",
  ) => {
    dispatch({ type: "commit-preview", before, next });
    applyCadSelection(next, refs, refs.at(-1) ?? null);
    setSelectedFaceIndex(null);
    setFileNotice({ text: `${operation === "trim" ? "Trim" : "Extend"} complete.`, tone: "success" });
  }, [applyCadSelection]);

  const commitBreakMode = useCallback((before: ModelDocument, next: ModelDocument, refs: CadEntityRef[], mode: BreakMode) => {
    dispatch({ type: "commit-preview", before, next });
    applyCadSelection(next, refs, refs.at(-1) ?? null);
    setSelectedFaceIndex(null);
    setFileNotice({ text: `${mode === "break" ? "Break" : "Break at Point"} complete.`, tone: "success" });
  }, [applyCadSelection]);

  const commitBoundaryMode = useCallback((before: ModelDocument, next: ModelDocument, polylineId: string) => {
    dispatch({ type: "commit-preview", before, next });
    const ref = { id: polylineId, kind: "polyline" as const };
    applyCadSelection(next, [ref], ref);
    setSelectedFaceIndex(null);
    setFileNotice({ text: "Boundary created as one editable closed Polyline.", tone: "success" });
  }, [applyCadSelection]);

  const commitLengthenMode = useCallback((before: ModelDocument, next: ModelDocument, ref: CadEntityRef, endpoint: LengthenEndpoint) => {
    dispatch({ type: "commit-preview", before, next });
    applyCadSelection(next, [ref], ref);
    setSelectedFaceIndex(null);
    setFileNotice({ text: `Lengthened the ${endpoint} endpoint using ${lengthenMethod}.`, tone: "success" });
  }, [applyCadSelection, lengthenMethod]);

  const commitChamferMode = useCallback((before: ModelDocument, next: ModelDocument, refs: CadEntityRef[]) => {
    dispatch({ type: "commit-preview", before, next });
    applyCadSelection(next, refs, refs.at(-1) ?? null);
    setSelectedFaceIndex(null);
    setFileNotice({ text: `Chamfer complete at ${formatArchitectural(chamferFirstDistance)} × ${formatArchitectural(chamferSecondDistance)}.`, tone: "success" });
  }, [applyCadSelection, chamferFirstDistance, chamferSecondDistance]);

  const commitFilletMode = useCallback((before: ModelDocument, next: ModelDocument, refs: CadEntityRef[]) => {
    dispatch({ type: "commit-preview", before, next });
    applyCadSelection(next, refs, refs.at(-1) ?? null);
    setSelectedFaceIndex(null);
    setFileNotice({ text: `Fillet complete at ${formatArchitectural(filletRadius)}.`, tone: "success" });
  }, [applyCadSelection, filletRadius]);

  const applyPolylineChamfer = useCallback((firstDistance = chamferFirstDistance, secondDistance = chamferSecondDistance) => {
    if (!selectedCornerPolyline || !selectionCanModifyPolylineCorners || chamferStage !== 0) {
      setFileNotice({ text: chamferStage !== 0 ? "Cancel the current Line pick before applying Chamfer to a Polyline." : "Select one unlocked straight-segment Polyline first.", tone: "info" });
      return;
    }
    const result = chamferPolylineObject(editor.present, selectedCornerPolyline.id, firstDistance, secondDistance);
    if (!result) {
      setFileNotice({ text: "Those setbacks do not fit every Polyline corner, or the Polyline already contains curved segments.", tone: "error" });
      return;
    }
    dispatch({ type: "commit", next: result.document });
    applyCadSelection(result.document, [result.ref], result.ref);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setSelectedFaceIndex(null);
    setFileNotice({ text: `Chamfered every valid Polyline corner at ${formatArchitectural(firstDistance)} × ${formatArchitectural(secondDistance)}.`, tone: "success" });
  }, [applyCadSelection, chamferFirstDistance, chamferSecondDistance, chamferStage, editor.present, selectedCornerPolyline, selectionCanModifyPolylineCorners]);

  const applyPolylineFillet = useCallback((radius = filletRadius) => {
    if (!selectedCornerPolyline || !selectionCanModifyPolylineCorners || filletStage !== 0) {
      setFileNotice({ text: filletStage !== 0 ? "Cancel the current Line pick before applying Fillet to a Polyline." : "Select one unlocked straight-segment Polyline first.", tone: "info" });
      return;
    }
    const result = filletPolylineObject(editor.present, selectedCornerPolyline.id, radius);
    if (!result) {
      setFileNotice({ text: radius === 0 ? "A positive radius is required to round Polyline corners." : "That radius does not fit every Polyline corner, or the Polyline already contains curved segments.", tone: "error" });
      return;
    }
    dispatch({ type: "commit", next: result.document });
    applyCadSelection(result.document, [result.ref], result.ref);
    setFilletMode(false);
    setFilletStage(0);
    setSelectedFaceIndex(null);
    setFileNotice({ text: `Filleted every valid Polyline corner at ${formatArchitectural(radius)}.`, tone: "success" });
  }, [applyCadSelection, editor.present, filletRadius, filletStage, selectedCornerPolyline, selectionCanModifyPolylineCorners]);

  const alignSelection = useCallback((axis: AxisKey, mode: AlignmentMode) => {
    if (!selectedObjectId || selectedObjectIds.length < 2 || !selectionIsEditable) return;
    const next = alignBoxObjects(
      editor.present,
      selectedObjectIds,
      selectedObjectId,
      axis,
      mode,
    );
    if (!next) {
      setFileNotice({ text: "Those objects cannot be aligned within the supported coordinate range.", tone: "error" });
      return;
    }
    dispatch({ type: "commit", next });
    setSelectedFaceIndex(null);
    setFileNotice({ text: `Aligned ${selectedObjectIds.length} objects on ${axis.toUpperCase()} ${mode}.`, tone: "success" });
  }, [editor.present, selectedObjectId, selectedObjectIds, selectionIsEditable]);

  const createSelectionGroup = useCallback(() => {
    const result = groupBoxObjects(editor.present, selectedObjectIds);
    if (!result) {
      setFileNotice({ text: "Select at least two unlocked, ungrouped objects.", tone: "info" });
      return;
    }
    dispatch({ type: "commit", next: result.document });
    setFileNotice({ text: `Created ${result.group.name}.`, tone: "success" });
  }, [editor.present, selectedObjectIds]);

  const ungroupSelection = useCallback(() => {
    if (!selectedGroup) return;
    const next = ungroupBoxObjects(editor.present, selectedGroup.id);
    if (!next) {
      setFileNotice({ text: "Unlock every group member before ungrouping.", tone: "info" });
      return;
    }
    dispatch({ type: "commit", next });
    setFileNotice({ text: `Ungrouped ${selectedGroup.name}.`, tone: "success" });
  }, [editor.present, selectedGroup]);

  const renameSelectedGroup = useCallback((name: string) => {
    if (!selectedGroup || selectedGroup.name === name.trim()) return Boolean(selectedGroup);
    const next = renameGroup(editor.present, selectedGroup.id, name);
    if (!next) return false;
    dispatch({ type: "commit", next });
    setFileNotice({ text: `Renamed group to ${name.trim()}.`, tone: "success" });
    return true;
  }, [editor.present, selectedGroup]);

  const toggleSelectionLock = useCallback(() => {
    if (!selectedObjectIds.length) return;
    const lockNext = !allSelectedLocked;
    const next = setBoxObjectsLocked(editor.present, selectedObjectIds, lockNext);
    if (!next) return;
    dispatch({ type: "commit", next });
    setCopyMode(false);
    setMoveMode(false);
    setRotateMode(false);
    setScaleMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setSelectedFaceIndex(null);
    setFileNotice({
      text: `${lockNext ? "Locked" : "Unlocked"} ${selectedObjectIds.length} object${selectedObjectIds.length === 1 ? "" : "s"}.`,
      tone: "success",
    });
  }, [allSelectedLocked, editor.present, selectedObjectIds]);

  const startCopyMode = useCallback(() => {
    setBreakMode(null);
    setBreakStage(0);
    if (!selectionCanModify) return;
    setDragStatus(null);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletMode(false);
    setFilletStage(0);
    setLengthenMode(false);
    setSelectedFaceIndex(null);
    setCopyMode(true);
    setRotateMode(false);
    setScaleMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setTrimMode(false);
    setExtendMode(false);
    setStretchMode(false);
    setStretchTargets([]);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setFileNotice({ text: "Copy active. Click a base point, then click a target point, or enter an exact offset.", tone: "info" });
  }, [selectionCanModify]);

  const finishCopyMode = useCallback(() => {
    setCopyMode(false);
    setMoveMode(false);
    setRotateMode(false);
    setScaleMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setTrimMode(false);
    setExtendMode(false);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setFileNotice({ text: "Copy mode finished.", tone: "info" });
  }, []);

  useEffect(() => {
    if (!lengthenMode) return;
    if (!selectionCanLengthen || arcMode || breakMode || chamferMode || circleMode || copyMode || extendMode || filletMode || lineMode || mirrorMode || moveMode || offsetMode || polylineMode || rectangleMode || rotateMode || scaleMode || stretchMode || trimMode) {
      const timeout = window.setTimeout(() => setLengthenMode(false), 0);
      return () => window.clearTimeout(timeout);
    }
  }, [arcMode, breakMode, chamferMode, circleMode, copyMode, extendMode, filletMode, lengthenMode, lineMode, mirrorMode, moveMode, offsetMode, polylineMode, rectangleMode, rotateMode, scaleMode, selectionCanLengthen, stretchMode, trimMode]);

  const finishModifyMode = useCallback((canceled: boolean) => {
    setCopyMode(false);
    setMoveMode(false);
    setDragStatus(null);
    if (canceled) setFileNotice({ text: "Move/Copy canceled.", tone: "info" });
  }, []);

  const commitModifyMode = useCallback((
    before: ModelDocument,
    next: ModelDocument,
    copiedRefs: CadEntityRef[] | null,
  ) => {
    dispatch({ type: "commit-preview", before, next });
    const nextRefs = copiedRefs ?? selectedEntityRefs;
    applyCadSelection(next, nextRefs, nextRefs.at(-1) ?? null);
    setFileNotice({
      text: copiedRefs
        ? `Placed ${copiedRefs.length} copied entit${copiedRefs.length === 1 ? "y" : "ies"}.`
        : `Moved ${nextRefs.length} entit${nextRefs.length === 1 ? "y" : "ies"}.`,
      tone: "success",
    });
  }, [applyCadSelection, selectedEntityRefs]);

  const activateSelectMode = useCallback(() => {
    setDragStatus(null);
    setBreakMode(null);
    setBreakStage(0);
    setBoundaryMode(false);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setCopyMode(false);
    setMoveMode(false);
    setRotateMode(false);
    setScaleMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setFilletMode(false);
    setFilletStage(0);
    setTrimMode(false);
    setExtendMode(false);
    setTrimMode(false);
    setExtendMode(false);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setStretchMode(false);
    setStretchTargets([]);
    setSelectedFaceIndex(null);
  }, []);

  const finishBoundaryMode = useCallback((canceled = true) => {
    setBoundaryMode(false);
    setCommandDraft("");
    setDragStatus(null);
    if (canceled) setFileNotice({ text: "Boundary canceled.", tone: "info" });
  }, []);

  const activateBoundaryMode = useCallback(() => {
    const currentLayer = findLayer(editor.present, editor.present.activeLayerId);
    if (!currentLayer?.visible || currentLayer.locked) {
      setFileNotice({ text: "Boundary needs a visible, unlocked current layer for the new Polyline.", tone: "error" });
      return;
    }
    setBreakMode(null);
    setBreakStage(0);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletMode(false);
    setFilletStage(0);
    setLengthenMode(false);
    setCopyMode(false);
    setMoveMode(false);
    setRotateMode(false);
    setScaleMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setTrimMode(false);
    setExtendMode(false);
    setStretchMode(false);
    setStretchTargets([]);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setBoundaryMode(true);
    setSelectedObjectId(null);
    setSelectedObjectIds([]);
    setSelectedEntityKeys([]);
    setSelectedLineId(null);
    setSelectedArcId(null);
    setSelectedCircleId(null);
    setSelectedPolylineId(null);
    setSelectedFaceIndex(null);
    setCommandDraft("");
    setViewTarget(VIEW_PRESETS.top);
    setFileNotice({ text: `Boundary active at ${formatSignedArchitectural(cadDraftingSettings.activeElevation)}. Click inside a closed visible area.`, tone: "info" });
  }, [cadDraftingSettings.activeElevation, editor.present]);

  useEffect(() => {
    if (!boundaryMode) return;
    if (arcMode || breakMode || chamferMode || circleMode || copyMode || extendMode || filletMode || lengthenMode || lineMode || mirrorMode || moveMode || offsetMode || polylineMode || rectangleMode || rotateMode || scaleMode || stretchMode || trimMode) {
      const timeout = window.setTimeout(() => setBoundaryMode(false), 0);
      return () => window.clearTimeout(timeout);
    }
  }, [arcMode, boundaryMode, breakMode, chamferMode, circleMode, copyMode, extendMode, filletMode, lengthenMode, lineMode, mirrorMode, moveMode, offsetMode, polylineMode, rectangleMode, rotateMode, scaleMode, stretchMode, trimMode]);

  const joinSelection = useCallback(() => {
    if (!selectionCanJoin) {
      setFileNotice({ text: "Select at least two unlocked, endpoint-connected Lines, Arcs, or open Polylines before using Join.", tone: "info" });
      return false;
    }
    const primaryRef: CadEntityRef | null = selectedLineId
      ? { id: selectedLineId, kind: "line" }
      : selectedArcId
        ? { id: selectedArcId, kind: "arc" }
        : selectedPolylineId
          ? { id: selectedPolylineId, kind: "polyline" }
          : selectedEntityRefs.at(-1) ?? null;
    const result = joinModelEntities(editor.present, selectedEntityRefs, primaryRef);
    if (!result) {
      setFileNotice({ text: "Join needs one unbranched endpoint chain at a common elevation. Remove gaps, branches, closed Polylines, or incompatible curve directions and try again.", tone: "error" });
      return false;
    }
    activateSelectMode();
    dispatch({ type: "commit", next: result.document });
    applyCadSelection(result.document, [result.ref], result.ref);
    setFileNotice({ text: `Joined ${selectedEntityRefs.length} entities into one native ${result.ref.kind === "polyline" ? "Polyline" : result.ref.kind === "arc" ? "Arc" : result.ref.kind === "circle" ? "Circle" : "Line"}.`, tone: "success" });
    return true;
  }, [activateSelectMode, applyCadSelection, editor.present, selectedArcId, selectedEntityRefs, selectedLineId, selectedPolylineId, selectionCanJoin]);

  const explodeSelection = useCallback(() => {
    if (!selectionCanExplode) {
      setFileNotice({ text: "Select one or more unlocked Rectangles or Polylines before using Explode.", tone: "info" });
      return false;
    }
    const result = explodeModelEntities(editor.present, selectedEntityRefs);
    if (!result) {
      setFileNotice({ text: "Explode could not create valid native segments. Check the selection and drawing limits, then try again.", tone: "error" });
      return false;
    }
    activateSelectMode();
    dispatch({ type: "commit", next: result.document });
    applyCadSelection(result.document, result.refs, result.refs.at(-1) ?? null);
    const widthNotice = selectedExplodeHasWidth ? " Constant Polyline width was removed." : "";
    setFileNotice({ text: `Exploded ${selectedEntityRefs.length} ${selectedEntityRefs.length === 1 ? "entity" : "entities"} into ${result.refs.length} native Line / Arc ${result.refs.length === 1 ? "segment" : "segments"}.${widthNotice}`, tone: "success" });
    return true;
  }, [activateSelectMode, applyCadSelection, editor.present, selectedEntityRefs, selectedExplodeHasWidth, selectionCanExplode]);

  const finishStretchMode = useCallback((canceled = false) => {
    setStretchMode(false);
    setStretchTargets([]);
    setDragStatus(null);
    if (canceled) setFileNotice({ text: "Stretch canceled.", tone: "info" });
  }, []);

  const activateStretchMode = useCallback(() => {
    setBreakMode(null);
    setBreakStage(0);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletMode(false);
    setFilletStage(0);
    setDragStatus(null);
    setCopyMode(false);
    setMoveMode(false);
    setRotateMode(false);
    setScaleMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setTrimMode(false);
    setExtendMode(false);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setStretchTargets([]);
    setStretchMode(true);
    setSelectedObjectId(null);
    setSelectedObjectIds([]);
    setSelectedEntityKeys([]);
    setSelectedLineId(null);
    setSelectedArcId(null);
    setSelectedCircleId(null);
    setSelectedPolylineId(null);
    setSelectedFaceIndex(null);
    setViewTarget(VIEW_PRESETS.top);
    setFileNotice({ text: "Stretch active. Drag a right-to-left crossing window across the endpoints or vertices to reshape.", tone: "info" });
  }, []);

  const commitStretchMode = useCallback((
    before: ModelDocument,
    next: ModelDocument,
    targets: CadStretchTarget[],
  ) => {
    dispatch({ type: "commit-preview", before, next });
    const refs = targets.map(({ id, kind }) => ({ id, kind } satisfies CadEntityRef));
    applyCadSelection(next, refs, refs.at(-1) ?? null);
    setFileNotice({ text: `Stretched ${targets.length} entit${targets.length === 1 ? "y" : "ies"}.`, tone: "success" });
  }, [applyCadSelection]);

  const stretchSelectionExact = useCallback((delta: LinePoint) => {
    if (!stretchMode || !stretchTargets.length) return false;
    const next = stretchModelEntities(editor.present, stretchTargets, delta);
    if (!next) return false;
    commitStretchMode(editor.present, next, stretchTargets);
    finishStretchMode(false);
    return true;
  }, [commitStretchMode, editor.present, finishStretchMode, stretchMode, stretchTargets]);

  const activateMoveMode = useCallback(() => {
    setBreakMode(null);
    setBreakStage(0);
    if (!selectionCanModify) return;
    setDragStatus(null);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletMode(false);
    setFilletStage(0);
    setCopyMode(false);
    setMoveMode(true);
    setRotateMode(false);
    setScaleMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setTrimMode(false);
    setExtendMode(false);
    setStretchMode(false);
    setStretchTargets([]);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setSelectedFaceIndex(null);
    setFileNotice({ text: "Move active. Click a base point, then click a target point, or enter an exact offset.", tone: "info" });
  }, [selectionCanModify]);

  const activateRotateMode = useCallback(() => {
    setBreakMode(null);
    setBreakStage(0);
    if (!selectionCanModify) return;
    setDragStatus(null);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletMode(false);
    setFilletStage(0);
    setCopyMode(false);
    setMoveMode(false);
    setRotateMode(true);
    setScaleMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setTrimMode(false);
    setExtendMode(false);
    setStretchMode(false);
    setStretchTargets([]);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setSelectedFaceIndex(null);
    setFileNotice({ text: "Rotate active. Drag the gold ring; hold Shift for 1° snapping, or enter an exact angle in Properties.", tone: "info" });
  }, [selectionCanModify]);

  const activateScaleMode = useCallback(() => {
    setBreakMode(null);
    setBreakStage(0);
    if (!selectionCanModify) return;
    setDragStatus(null);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletMode(false);
    setFilletStage(0);
    setCopyMode(false);
    setMoveMode(false);
    setRotateMode(false);
    setScaleMode(true);
    setMirrorMode(false);
    setOffsetMode(false);
    setTrimMode(false);
    setExtendMode(false);
    setStretchMode(false);
    setStretchTargets([]);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setSelectedFaceIndex(null);
    setFileNotice({ text: "Scale active. Drag the green square, hold Shift for 0.01 precision, or enter an exact factor in Properties.", tone: "info" });
  }, [selectionCanModify]);

  const activateMirrorMode = useCallback(() => {
    setBreakMode(null);
    setBreakStage(0);
    if (!selectionCanModify) return;
    setDragStatus(null);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletMode(false);
    setFilletStage(0);
    setCopyMode(false);
    setMirrorMode(true);
    setOffsetMode(false);
    setTrimMode(false);
    setExtendMode(false);
    setStretchMode(false);
    setStretchTargets([]);
    setMoveMode(false);
    setRotateMode(false);
    setScaleMode(false);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setSelectedFaceIndex(null);
    setViewTarget(VIEW_PRESETS.top);
    setFileNotice({ text: "Mirror active. Pick two snapped points to define the mirror axis.", tone: "info" });
  }, [selectionCanModify]);

  const activateOffsetMode = useCallback(() => {
    setBreakMode(null);
    setBreakStage(0);
    if (!selectionCanOffset) {
      setFileNotice({ text: "Select one unlocked Line, Polyline, Rectangle, Circle, or Arc before starting Offset.", tone: "info" });
      return;
    }
    setDragStatus(null);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletMode(false);
    setFilletStage(0);
    setCopyMode(false);
    setMoveMode(false);
    setMirrorMode(false);
    setOffsetMode(true);
    setTrimMode(false);
    setExtendMode(false);
    setStretchMode(false);
    setStretchTargets([]);
    setRotateMode(false);
    setScaleMode(false);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setSelectedFaceIndex(null);
    setViewTarget(VIEW_PRESETS.top);
    setFileNotice({ text: `Offset active at ${formatArchitectural(offsetDistance)}. Click the side for the new entity.`, tone: "info" });
  }, [offsetDistance, selectionCanOffset]);

  const activateChamferMode = useCallback(() => {
    setBreakMode(null);
    setBreakStage(0);
    setDragStatus(null);
    setCopyMode(false);
    setMoveMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setFilletMode(false);
    setFilletStage(0);
    setTrimMode(false);
    setExtendMode(false);
    setStretchMode(false);
    setStretchTargets([]);
    setRotateMode(false);
    setScaleMode(false);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setSelectedFaceIndex(null);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setChamferMode(true);
    setViewTarget(VIEW_PRESETS.top);
    setCommandDraft("");
    setFileNotice({ text: `Chamfer active at ${formatArchitectural(chamferFirstDistance)} × ${formatArchitectural(chamferSecondDistance)}. Select two Lines, or type P to apply it to the selected Polyline.`, tone: "info" });
  }, [chamferFirstDistance, chamferSecondDistance]);

  const activateBreakMode = useCallback((mode: BreakMode) => {
    setDragStatus(null);
    setBreakMode(mode);
    setBreakStage(0);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletMode(false);
    setFilletStage(0);
    setCopyMode(false);
    setMoveMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setTrimMode(false);
    setExtendMode(false);
    setStretchMode(false);
    setStretchTargets([]);
    setRotateMode(false);
    setScaleMode(false);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setSelectedFaceIndex(null);
    setViewTarget(VIEW_PRESETS.top);
    setCommandDraft("");
    setFileNotice({
      text: mode === "break"
        ? "Break active. Select a Line, Polyline, Circle, or Arc, then choose two break points."
        : "Break at Point active. Select an open Line, Polyline, or Arc, then choose one interior point.",
      tone: "info",
    });
  }, []);

  const activateLengthenMode = useCallback(() => {
    if (!selectionCanLengthen) {
      setFileNotice({ text: "Select one unlocked Line, Arc, or open Polyline before starting Lengthen.", tone: "info" });
      return;
    }
    setDragStatus(null);
    setBreakMode(null);
    setBreakStage(0);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletMode(false);
    setFilletStage(0);
    setCopyMode(false);
    setMoveMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setTrimMode(false);
    setExtendMode(false);
    setStretchMode(false);
    setStretchTargets([]);
    setRotateMode(false);
    setScaleMode(false);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setSelectedFaceIndex(null);
    setViewTarget(VIEW_PRESETS.top);
    setCommandDraft("");
    setLengthenMode(true);
    setFileNotice({ text: `Lengthen ${lengthenMethod} active. Pick the selected curve near the endpoint to change.`, tone: "info" });
  }, [lengthenMethod, selectionCanLengthen]);

  const activateFilletMode = useCallback(() => {
    setBreakMode(null);
    setBreakStage(0);
    setDragStatus(null);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setCopyMode(false);
    setMoveMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setTrimMode(false);
    setExtendMode(false);
    setStretchMode(false);
    setStretchTargets([]);
    setRotateMode(false);
    setScaleMode(false);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setSelectedFaceIndex(null);
    setFilletStage(0);
    setFilletMode(true);
    setViewTarget(VIEW_PRESETS.top);
    setCommandDraft("");
    setFileNotice({ text: `Fillet active at ${formatArchitectural(filletRadius)}. Select two Lines or Arcs, or type P to apply it to the selected Polyline.`, tone: "info" });
  }, [filletRadius]);

  const activateTrimMode = useCallback(() => {
    setBreakMode(null);
    setBreakStage(0);
    if (!selectionCanTrim) {
      setFileNotice({ text: "Select one unlocked Line, Polyline, Rectangle, Circle, or Arc before starting Trim.", tone: "info" });
      return;
    }
    setDragStatus(null);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletMode(false);
    setFilletStage(0);
    setCopyMode(false);
    setMoveMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setRotateMode(false);
    setScaleMode(false);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setExtendMode(false);
    setTrimMode(true);
    setStretchMode(false);
    setStretchTargets([]);
    setSelectedFaceIndex(null);
    setViewTarget(VIEW_PRESETS.top);
    setFileNotice({ text: "Trim active. Every other visible 2D entity is a boundary; click the portion to remove.", tone: "info" });
  }, [selectionCanTrim]);

  const activateExtendMode = useCallback(() => {
    setBreakMode(null);
    setBreakStage(0);
    if (!selectionCanExtend) {
      setFileNotice({ text: "Select one unlocked Line, Arc, or open Polyline before starting Extend.", tone: "info" });
      return;
    }
    setDragStatus(null);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletMode(false);
    setFilletStage(0);
    setCopyMode(false);
    setMoveMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setRotateMode(false);
    setScaleMode(false);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setTrimMode(false);
    setExtendMode(true);
    setStretchMode(false);
    setStretchTargets([]);
    setSelectedFaceIndex(null);
    setViewTarget(VIEW_PRESETS.top);
    setFileNotice({ text: "Extend active. Click near the open endpoint to extend it to the first visible boundary.", tone: "info" });
  }, [selectionCanExtend]);

  const activateLineMode = useCallback(() => {
    setBreakMode(null);
    setBreakStage(0);
    setDragStatus(null);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletMode(false);
    setFilletStage(0);
    setObjectSnapOverride(null);
    setCopyMode(false);
    setMoveMode(false);
    setRotateMode(false);
    setScaleMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setTrimMode(false);
    setExtendMode(false);
    setStretchMode(false);
    setStretchTargets([]);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(true);
    setWallMode(false);
    setFoundationWallMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setSelectedObjectId(null);
    setSelectedObjectIds([]);
    setSelectedEntityKeys([]);
    setSelectedLineId(null);
    setSelectedArcId(null);
    setSelectedCircleId(null);
    setSelectedPolylineId(null);
    setSelectedFaceIndex(null);
    setLineAnchor(null);
    setCommandDraft("");
    setLastCommandName("line");
    setViewTarget(VIEW_PRESETS.top);
    window.setTimeout(() => commandInputRef.current?.focus(), 0);
    setFileNotice({ text: "Line active. Enter X,Y or X,Y,Z, or click the first point.", tone: "info" });
  }, []);

  const activateWallMode = useCallback(() => {
    activateLineMode();
    setWallMode(true);
    setLastCommandName("wall");
    setDrawingPlaneFromBuilding(editor.present.building);
    setFileNotice({ text: "Wall active. Draw the exterior face of the Main layer; the exterior defaults to the left of Start → End.", tone: "info" });
  }, [activateLineMode, editor.present.building, setDrawingPlaneFromBuilding]);

  const activateFoundationWallMode = useCallback(() => {
    activateLineMode();
    setWallMode(false);
    setFoundationWallMode(true);
    setLastCommandName("foundation-wall");
    setDrawingPlaneFromBuilding(editor.present.building);
    setFileNotice({ text: "Foundation Wall active. Draw the exterior face of the concrete Main layer; the exterior defaults to the left of Start → End.", tone: "info" });
  }, [activateLineMode, editor.present.building, setDrawingPlaneFromBuilding]);

  const activateArcMode = useCallback((method: ArcMethod = arcMethod) => {
    setBreakMode(null);
    setBreakStage(0);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletMode(false);
    setFilletStage(0);
    const selectedReference: ContinuableEntityReference | null = selectedArc
      ? { id: selectedArc.id, type: "arc" }
      : selectedLine
        ? { id: selectedLine.id, type: "line" }
        : selectedPolyline
          ? { id: selectedPolyline.id, type: "polyline" }
          : null;
    const continueSeed = method === "continue"
      ? continueSeedFromReference(editor.present, selectedReference) ?? continueSeedFromHistory(editor.present, continuableEntityHistoryRef.current)
      : null;
    setArcMethod(method);
    setArcContinueSeed(continueSeed);
    arcMethodCommandRef.current = method;
    arcContinueSeedCommandRef.current = continueSeed;
    if (method === "continue" && !continueSeed) {
      setArcMode(false);
      setFileNotice({ text: "Continue needs a previously drawn or selected line, Arc, or open polyline.", tone: "error" });
      return;
    }
    setDragStatus(null);
    setObjectSnapOverride(null);
    setCopyMode(false);
    setMoveMode(false);
    setRotateMode(false);
    setScaleMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setTrimMode(false);
    setExtendMode(false);
    setStretchMode(false);
    setStretchTargets([]);
    setArcMode(true);
    setCircleMode(false);
    setLineMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setSelectedObjectId(null);
    setSelectedObjectIds([]);
    setSelectedEntityKeys([]);
    setSelectedArcId(null);
    setSelectedCircleId(null);
    setSelectedLineId(null);
    setSelectedPolylineId(null);
    setSelectedFaceIndex(null);
    setArcPoints(continueSeed ? [{ ...continueSeed.start }] : []);
    setArcCommand(null);
    setCommandDraft("");
    setLastCommandName("arc");
    setViewTarget(VIEW_PRESETS.top);
    window.setTimeout(() => commandInputRef.current?.focus(), 0);
    setFileNotice({ text: method === "continue" ? `Arc Continue active from ${continueSeed?.source}. Specify the endpoint.` : `${arcMethodDefinition(method).label} Arc active. Specify the ${arcPointStage(method, 0)}.`, tone: "info" });
  }, [arcMethod, editor.present, selectedArc, selectedLine, selectedPolyline]);

  const activateCircleMode = useCallback((method: CircleMethod = circleMethod) => {
    setBreakMode(null);
    setBreakStage(0);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletMode(false);
    setFilletStage(0);
    setDragStatus(null);
    setObjectSnapOverride(null);
    setCopyMode(false);
    setMoveMode(false);
    setRotateMode(false);
    setScaleMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setTrimMode(false);
    setExtendMode(false);
    setStretchMode(false);
    setStretchTargets([]);
    setArcMode(false);
    setCircleMode(true);
    setCircleMethod(method);
    setLineMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    setSelectedObjectId(null);
    setSelectedObjectIds([]);
    setSelectedEntityKeys([]);
    setSelectedCircleId(null);
    setSelectedArcId(null);
    setSelectedLineId(null);
    setSelectedPolylineId(null);
    setSelectedFaceIndex(null);
    setCirclePoints([]);
    setCircleCommand(null);
    setCommandDraft("");
    setLastCommandName("circle");
    setViewTarget(VIEW_PRESETS.top);
    window.setTimeout(() => commandInputRef.current?.focus(), 0);
    setFileNotice({ text: `${circleMethodDefinition(method).label} Circle active. Specify the ${circlePointStage(method, 0)}.`, tone: "info" });
  }, [circleMethod]);

  const activatePolylineMode = useCallback(() => {
    setBreakMode(null);
    setBreakStage(0);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletMode(false);
    setFilletStage(0);
    setDragStatus(null);
    setObjectSnapOverride(null);
    setCopyMode(false);
    setMoveMode(false);
    setRotateMode(false);
    setScaleMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setTrimMode(false);
    setExtendMode(false);
    setStretchMode(false);
    setStretchTargets([]);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setRectangleMode(false);
    setPolylineMode(true);
    setPolylineSegmentMode("line");
    setSelectedObjectId(null);
    setSelectedObjectIds([]);
    setSelectedEntityKeys([]);
    setSelectedLineId(null);
    setSelectedArcId(null);
    setSelectedCircleId(null);
    setSelectedPolylineId(null);
    setSelectedFaceIndex(null);
    setPolylineAnchor(null);
    setPolylineCommand(null);
    setCommandDraft("");
    setLastCommandName("polyline");
    setViewTarget(VIEW_PRESETS.top);
    window.setTimeout(() => commandInputRef.current?.focus(), 0);
    setFileNotice({ text: `Polyline active in Line mode at ${formatArchitectural(polylineWidth)} width. Enter X,Y or X,Y,Z, or click the first point.`, tone: "info" });
  }, [polylineWidth]);

  const applyPolylineWidth = useCallback(() => {
    const parsed = parseSignedArchitectural(polylineWidthDraft);
    if (parsed === null || parsed < 0 || parsed > MAXIMUM_COORDINATE) {
      setFileNotice({ text: "Polyline width must be zero or a positive architectural distance.", tone: "error" });
      return;
    }
    const width = snapToSixteenth(parsed);
    setPolylineWidth(width);
    setPolylineWidthDraft(formatArchitectural(width));
    setFileNotice({ text: `Polyline width set to ${formatArchitectural(width)}.`, tone: "success" });
  }, [polylineWidthDraft]);

  const applyRectangleDistance = (
    draft: string,
    setDraft: (value: string) => void,
    setValue: (value: number) => void,
    label: string,
    allowZero = false,
  ) => {
    const parsed = parseSignedArchitectural(draft);
    if (parsed === null || parsed < (allowZero ? 0 : 1 / 16) || parsed > MAXIMUM_COORDINATE) {
      setFileNotice({ text: `${label} must be ${allowZero ? "zero or " : ""}a positive architectural distance.`, tone: "error" });
      return;
    }
    const value = snapToSixteenth(parsed);
    setValue(value);
    setDraft(formatArchitectural(value));
  };

  const applyRectangleArea = () => {
    const squareFeet = Number(rectangleAreaDraft.trim());
    if (!Number.isFinite(squareFeet) || squareFeet <= 0 || squareFeet * 144 > MAXIMUM_COORDINATE ** 2) {
      setFileNotice({ text: "Rectangle target area must be a positive number of square feet.", tone: "error" });
      return;
    }
    setRectangleArea(squareFeet * 144);
    setRectangleAreaDraft(String(squareFeet));
  };

  const applyRectangleRotation = () => {
    const value = Number(rectangleRotationDraft.trim().replace(/°$/, ""));
    if (!Number.isFinite(value)) {
      setFileNotice({ text: "Rectangle rotation must be an angle in degrees.", tone: "error" });
      return;
    }
    const normalized = ((value % 360) + 360) % 360;
    setRectangleRotation(normalized);
    setRectangleRotationDraft(String(normalized));
  };

  const activateRectangleMode = useCallback(() => {
    setBreakMode(null);
    setBreakStage(0);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletMode(false);
    setFilletStage(0);
    setDragStatus(null);
    setObjectSnapOverride(null);
    setCopyMode(false);
    setMoveMode(false);
    setRotateMode(false);
    setScaleMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setTrimMode(false);
    setExtendMode(false);
    setStretchMode(false);
    setStretchTargets([]);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setPolylineMode(false);
    setRectangleMode(true);
    setSelectedObjectId(null);
    setSelectedObjectIds([]);
    setSelectedEntityKeys([]);
    setSelectedLineId(null);
    setSelectedArcId(null);
    setSelectedCircleId(null);
    setSelectedPolylineId(null);
    setSelectedFaceIndex(null);
    setRectangleAnchor(null);
    setRectangleCommand(null);
    setCommandDraft("");
    setLastCommandName("rectangle");
    setViewTarget(VIEW_PRESETS.top);
    window.setTimeout(() => commandInputRef.current?.focus(), 0);
    setFileNotice({ text: `Rectangle ${rectangleMethod} method active. Enter X,Y or X,Y,Z, or click the first corner.`, tone: "info" });
  }, [rectangleMethod]);

  const finishLineMode = useCallback(() => {
    setLineMode(false);
    setWallMode(false);
    setFoundationWallMode(false);
    setLineAnchor(null);
    setObjectSnapOverride(null);
    setCommandDraft("");
    setDragStatus(null);
    setFileNotice({ text: `${foundationWallMode ? "Foundation Wall" : wallMode ? "Wall" : "Line"} tool finished.`, tone: "info" });
  }, [foundationWallMode, wallMode]);

  const finishArcMode = useCallback(() => {
    setArcMode(false);
    setArcPoints([]);
    setArcCommand(null);
    setArcContinueSeed(null);
    arcContinueSeedCommandRef.current = null;
    setObjectSnapOverride(null);
    setCommandDraft("");
    setDragStatus(null);
    setFileNotice({ text: "Arc tool finished.", tone: "info" });
  }, []);

  const finishCircleMode = useCallback(() => {
    setCircleMode(false);
    setCirclePoints([]);
    setCircleCommand(null);
    setObjectSnapOverride(null);
    setCommandDraft("");
    setDragStatus(null);
    setFileNotice({ text: "Circle tool finished.", tone: "info" });
  }, []);

  const finishPolylineMode = useCallback(() => {
    setPolylineMode(false);
    setPolylineAnchor(null);
    setPolylineCommand(null);
    setObjectSnapOverride(null);
    setCommandDraft("");
    setDragStatus(null);
    setFileNotice({ text: "Polyline tool finished.", tone: "info" });
  }, []);

  const finishRectangleMode = useCallback(() => {
    setRectangleMode(false);
    setRectangleAnchor(null);
    setRectangleCommand(null);
    setObjectSnapOverride(null);
    setCommandDraft("");
    setDragStatus(null);
    setFileNotice({ text: "Rectangle tool finished.", tone: "info" });
  }, []);

  const applyAdditionalLineSnapAngles = useCallback(() => {
    const trimmed = lineSnapAngleDraft.trim();
    if (!trimmed) {
      setLineSnapAngles([0, 90, 180, 270]);
      setLineSnapAngleError("");
      return;
    }
    const parsed = trimmed.split(",").map((part) => Number(part.trim().replace(/°$/, "")));
    if (parsed.some((angle) => !Number.isFinite(angle))) {
      setLineSnapAngleError("Use comma-separated degree angles, such as 30, 45, 135.");
      return;
    }
    const normalizedAdditional = [...new Set(parsed.map((angle) => ((angle % 360) + 360) % 360))]
      .filter((angle) => ![0, 90, 180, 270].includes(angle))
      .sort((a, b) => a - b);
    setLineSnapAngles([...new Set([0, 90, 180, 270, ...normalizedAdditional])]);
    setLineSnapAngleDraft(normalizedAdditional.join(", "));
    setLineSnapAngleError("");
    setFileNotice({ text: normalizedAdditional.length ? `Added polar tracking at ${normalizedAdditional.join("°, ")}°.` : "Using the four cardinal tracking angles.", tone: "success" });
  }, [lineSnapAngleDraft]);

  const applyActiveElevation = useCallback(() => {
    const elevation = parseSignedArchitectural(activeElevationDraft);
    if (elevation === null || Math.abs(elevation) > MAXIMUM_COORDINATE) {
      setActiveElevationError("Enter an architectural elevation inside the supported drawing area.");
      return;
    }
    const snapped = snapToSixteenth(elevation);
    setCadDraftingSettings((current) => ({ ...current, activeElevation: snapped }));
    setActiveElevationDraft(formatSignedArchitectural(snapped));
    setActiveElevationError("");
    setFileNotice({ text: `Active drawing elevation set to ${formatSignedArchitectural(snapped)}.`, tone: "success" });
  }, [activeElevationDraft]);

  const toggleObjectSnapMode = useCallback((mode: ObjectSnapMode) => {
    setCadDraftingSettings((current) => ({
      ...current,
      objectSnapModes: current.objectSnapModes.includes(mode)
        ? current.objectSnapModes.filter((candidate) => candidate !== mode)
        : [...current.objectSnapModes, mode],
    }));
  }, []);

  const consumeObjectSnapOverride = useCallback(() => setObjectSnapOverride(null), []);

  const submitCommand = useCallback(() => {
    const value = commandDraft.trim();
    const normalizedValue = value.toLowerCase();
    if (boundaryMode || breakMode || trimMode || extendMode || stretchMode) return;
    if (lengthenMode) {
      const methodAliases: Record<string, LengthenMethod> = { d: "delta", de: "delta", delta: "delta", t: "total", total: "total", p: "percent", percent: "percent", dy: "dynamic", dynamic: "dynamic" };
      const nextMethod = methodAliases[normalizedValue];
      if (nextMethod) {
        setLengthenMethod(nextMethod);
        setCommandDraft("");
        setFileNotice({ text: `Lengthen method set to ${nextMethod}. ${nextMethod === "dynamic" ? "Pick the endpoint, then its new cursor position." : "Enter the method value or pick an endpoint using the current value."}`, tone: "info" });
        return;
      }
      if (!value || lengthenMethod === "dynamic") return;
      const parsed = lengthenMethod === "percent" ? Number(value.replace(/%$/, "")) : lengthenMethod === "delta" ? parseSignedArchitectural(value) : parseArchitectural(value);
      if (parsed === null || !Number.isFinite(parsed) || (lengthenMethod === "delta" ? parsed === 0 : parsed <= 0)) {
        setFileNotice({ text: lengthenMethod === "percent" ? "Enter a positive Lengthen percentage." : lengthenMethod === "delta" ? "Enter a nonzero signed architectural Delta." : "Enter a positive architectural Total length.", tone: "error" });
        return;
      }
      const normalized = lengthenMethod === "percent" ? Math.round(parsed * 1000) / 1000 : snapToSixteenth(parsed);
      setLengthenValue(normalized);
      setCommandDraft("");
      setFileNotice({ text: `Lengthen ${lengthenMethod} set to ${lengthenMethod === "percent" ? `${normalized}%` : formatSignedArchitectural(normalized)}. Pick the curve near the endpoint to change.`, tone: "success" });
      return;
    }
    if (chamferMode) {
      if (!value) return;
      if (chamferDistancePrompt === 0 && ["p", "polyline"].includes(normalizedValue)) {
        setCommandDraft("");
        applyPolylineChamfer();
        return;
      }
      if (chamferDistancePrompt === 0 && ["d", "distance"].includes(normalizedValue)) {
        setChamferDistancePrompt(1);
        setCommandDraft("");
        setFileNotice({ text: "Enter the first Chamfer distance.", tone: "info" });
        return;
      }
      const parsed = parseSignedArchitectural(value);
      if (parsed === null || parsed < 0 || parsed > MAXIMUM_COORDINATE) {
        setFileNotice({ text: "Enter zero or a positive architectural Chamfer distance.", tone: "error" });
        return;
      }
      const snapped = snapToSixteenth(parsed);
      if (chamferDistancePrompt === 1) {
        setChamferFirstDistance(snapped);
        setChamferDistancePrompt(2);
        setCommandDraft("");
        setFileNotice({ text: `First Chamfer distance set to ${formatArchitectural(snapped)}. Enter the second distance.`, tone: "info" });
        return;
      }
      if (chamferDistancePrompt === 2) {
        setChamferSecondDistance(snapped);
        setChamferDistancePrompt(0);
        setCommandDraft("");
        setFileNotice({ text: `Chamfer distances set to ${formatArchitectural(chamferFirstDistance)} × ${formatArchitectural(snapped)}. Select the ${chamferStage === 0 ? "first" : "second"} Line.`, tone: "success" });
        return;
      }
      setChamferFirstDistance(snapped);
      setChamferSecondDistance(snapped);
      setCommandDraft("");
      setFileNotice({ text: `Both Chamfer distances set to ${formatArchitectural(snapped)}. Select the ${chamferStage === 0 ? "first" : "second"} Line.`, tone: "success" });
      return;
    }
    if (filletMode) {
      if (!value) return;
      if (["p", "polyline"].includes(normalizedValue)) {
        setCommandDraft("");
        applyPolylineFillet();
        return;
      }
      const radiusText = value.replace(/^(?:r|radius)\s*/i, "").trim();
      const radius = parseSignedArchitectural(radiusText);
      if (radius === null || radius < 0 || radius > MAXIMUM_COORDINATE) {
        setFileNotice({ text: "Enter zero or a positive architectural Fillet radius, such as R 6\".", tone: "error" });
        return;
      }
      const snapped = snapToSixteenth(radius);
      setFilletRadius(snapped);
      setCommandDraft("");
      setFileNotice({ text: `Fillet radius set to ${formatArchitectural(snapped)}. ${filletStage === 0 ? "Select the first Line." : "Select the second Line."}`, tone: "success" });
      return;
    }
    if (offsetMode) {
      if (!value) return;
      const distance = parseArchitectural(value);
      if (distance === null || distance < 1 / 16) {
        setFileNotice({ text: "Enter a positive architectural Offset distance of at least 1/16 inch.", tone: "error" });
        return;
      }
      const snapped = snapToSixteenth(distance);
      setOffsetDistance(snapped);
      setCommandDraft("");
      setFileNotice({ text: `Offset distance set to ${formatArchitectural(snapped)}. Click the side for the new entity.`, tone: "success" });
      return;
    }
    if (arcMode || circleMode || lineMode || polylineMode || rectangleMode) {
      const override = OBJECT_SNAP_OVERRIDE_ALIASES[normalizedValue];
      if (override) {
        setObjectSnapOverride(override);
        setCommandDraft("");
        setFileNotice({ text: `${OBJECT_SNAP_MODE_DEFINITIONS.find(({ mode }) => mode === override)?.label ?? override} snap override active for the next point.`, tone: "info" });
        return;
      }
      if (value && objectSnapOverride) setObjectSnapOverride(null);
    }
    if (!arcMode && !boundaryMode && !breakMode && !chamferMode && !circleMode && !extendMode && !filletMode && !lengthenMode && !lineMode && !offsetMode && !polylineMode && !rectangleMode && !trimMode) {
      const normalized = normalizedValue;
      if (normalized === "a" || normalized === "arc") {
        setCommandDraft("");
        activateArcMode();
      } else if (["b", "bo", "boundary", "bpoly"].includes(normalized)) {
        setCommandDraft("");
        activateBoundaryMode();
      } else if (["cha", "chamfer"].includes(normalized)) {
        setCommandDraft("");
        activateChamferMode();
      } else if (["br", "break"].includes(normalized)) {
        setCommandDraft("");
        activateBreakMode("break");
      } else if (["bp", "breakatpoint", "break-at-point"].includes(normalized)) {
        setCommandDraft("");
        activateBreakMode("break-at-point");
      } else if (normalized === "j" || normalized === "join") {
        setCommandDraft("");
        joinSelection();
      } else if (normalized === "x" || normalized === "explode") {
        setCommandDraft("");
        explodeSelection();
      } else if (normalized === "len" || normalized === "lengthen") {
        setCommandDraft("");
        activateLengthenMode();
      } else if (normalized === "c" || normalized === "circle") {
        setCommandDraft("");
        activateCircleMode();
      } else if (normalized === "l" || normalized === "line") {
        setCommandDraft("");
        activateLineMode();
      } else if (normalized === "w" || normalized === "wall") {
        setCommandDraft("");
        activateWallMode();
      } else if (["fw", "foundationwall", "foundation-wall"].includes(normalized)) {
        setCommandDraft("");
        activateFoundationWallMode();
      } else if (["p", "pl", "pline", "polyline"].includes(normalized)) {
        setCommandDraft("");
        activatePolylineMode();
      } else if (["r", "rec", "rectang", "rectangle"].includes(normalized)) {
        setCommandDraft("");
        activateRectangleMode();
      } else if (normalized === "m" || normalized === "move") {
        setCommandDraft("");
        activateMoveMode();
      } else if (["co", "cp", "copy"].includes(normalized)) {
        setCommandDraft("");
        startCopyMode();
      } else if (["mi", "mirror"].includes(normalized)) {
        setCommandDraft("");
        activateMirrorMode();
      } else if (normalized === "o" || normalized === "offset") {
        setCommandDraft("");
        activateOffsetMode();
      } else if (normalized === "tr" || normalized === "trim") {
        setCommandDraft("");
        activateTrimMode();
      } else if (["ex", "extend"].includes(normalized)) {
        setCommandDraft("");
        activateExtendMode();
      } else if (["f", "fillet"].includes(normalized)) {
        setCommandDraft("");
        activateFilletMode();
      } else if (["ro", "rotate"].includes(normalized)) {
        setCommandDraft("");
        activateRotateMode();
      } else if (["sc", "scale"].includes(normalized)) {
        setCommandDraft("");
        activateScaleMode();
      } else if (["s", "stretch"].includes(normalized)) {
        setCommandDraft("");
        activateStretchMode();
      } else if (!value && lastCommandName === "arc") {
        activateArcMode();
      } else if (!value && lastCommandName === "line") {
        activateLineMode();
      } else if (!value && lastCommandName === "wall") {
        activateWallMode();
      } else if (!value && lastCommandName === "foundation-wall") {
        activateFoundationWallMode();
      } else if (!value && lastCommandName === "circle") {
        activateCircleMode();
      } else if (!value && lastCommandName === "polyline") {
        activatePolylineMode();
      } else if (!value && lastCommandName === "rectangle") {
        activateRectangleMode();
      } else if (value) {
        setFileNotice({ text: `“${value}” is not available. Try W, FW, L, PL, REC, C, A, BOUNDARY, M, CO, MI, O, TR, EX, F, S, RO, or SC.`, tone: "error" });
      }
      return;
    }
    if (arcMode) {
      if (!value) {
        finishArcMode();
        return;
      }
      const commandArcMethod = arcMethodCommandRef.current;
      const commandContinueSeed = arcContinueSeedCommandRef.current;
      const anchor = arcCursorAnchor(commandArcMethod, arcPoints, commandContinueSeed);
      if (value.includes(",") || value.startsWith("@")) {
        const point = parseLineCoordinate(value, arcPoints[0]?.z ?? commandContinueSeed?.start.z ?? cadDraftingSettings.activeElevation, anchor);
        if (!point) {
          setFileNotice({ text: "Enter the Arc point as X,Y or X,Y,Z. Use @X,Y for a relative point.", tone: "error" });
          return;
        }
        arcCommandIdRef.current += 1;
        setArcCommand({ id: arcCommandIdRef.current, kind: "coordinate", point });
        setCommandDraft("");
        return;
      }
      const scalarStage = commandArcMethod !== "continue" && arcPoints.length >= 2;
      if (scalarStage && (commandArcMethod === "start-center-angle" || commandArcMethod === "center-start-angle" || commandArcMethod === "start-end-angle")) {
        const angle = Number(value.replace(/°|deg(?:rees?)?/gi, "").trim());
        if (!Number.isFinite(angle) || Math.abs(angle) <= 0 || Math.abs(angle) >= 360) {
          setFileNotice({ text: "Enter an included angle greater than 0° and less than 360°. Negative angles draw clockwise.", tone: "error" });
          return;
        }
        arcCommandIdRef.current += 1;
        setArcCommand({ id: arcCommandIdRef.current, kind: "scalar", scalar: "angle", value: angle });
        setCommandDraft("");
        return;
      }
      if (scalarStage && commandArcMethod === "start-end-direction") {
        const directionAngle = Number(value.replace(/°|deg(?:rees?)?/gi, "").trim());
        if (!Number.isFinite(directionAngle)) {
          setFileNotice({ text: "Enter the starting tangent as an angle in degrees or an exact direction point.", tone: "error" });
          return;
        }
        arcCommandIdRef.current += 1;
        setArcCommand({ id: arcCommandIdRef.current, kind: "scalar", scalar: "direction-angle", value: directionAngle });
        setCommandDraft("");
        return;
      }
      if (scalarStage && (commandArcMethod === "start-center-length" || commandArcMethod === "center-start-length" || commandArcMethod === "start-end-radius")) {
        const scalarValue = parseArchitectural(value);
        if (scalarValue === null || scalarValue < 1 / 16) {
          setFileNotice({ text: `Enter a positive architectural ${commandArcMethod === "start-end-radius" ? "radius" : "chord length"}.`, tone: "error" });
          return;
        }
        arcCommandIdRef.current += 1;
        setArcCommand({ id: arcCommandIdRef.current, kind: "scalar", scalar: commandArcMethod === "start-end-radius" ? "radius" : "length", value: snapToSixteenth(scalarValue) });
        setCommandDraft("");
        return;
      }
      const distance = parseArchitectural(value);
      if (!anchor || distance === null || distance < 1 / 16) {
        setFileNotice({ text: anchor ? `Enter the Arc ${arcPointStage(commandArcMethod, arcPoints.length)} as an exact point or positive architectural distance.` : `Specify the Arc ${arcPointStage(commandArcMethod, arcPoints.length)} first.`, tone: "error" });
        return;
      }
      arcCommandIdRef.current += 1;
      setArcCommand({ distance: snapToSixteenth(distance), id: arcCommandIdRef.current, kind: "distance" });
      setCommandDraft("");
      return;
    }
    if (circleMode) {
      if (!value) {
        finishCircleMode();
        return;
      }
      if (circleMethod === "tangent-tangent-tangent") {
        setFileNotice({ text: `Select the ${circlePointStage(circleMethod, circlePoints.length)} in the drawing area.`, tone: "error" });
        return;
      }
      if (circleMethod === "tangent-tangent-radius") {
        if (circlePoints.length < 2) {
          setFileNotice({ text: `Select the ${circlePointStage(circleMethod, circlePoints.length)} before entering the radius.`, tone: "error" });
          return;
        }
        const radius = parseArchitectural(value);
        if (radius === null || radius < 1 / 16) {
          setFileNotice({ text: "Enter a positive architectural radius after selecting two tangent objects.", tone: "error" });
          return;
        }
        circleCommandIdRef.current += 1;
        setCircleCommand({ id: circleCommandIdRef.current, kind: "scalar", value: snapToSixteenth(radius) });
        setCommandDraft("");
        return;
      }
      const circleAnchor = circlePoints.at(-1) ?? null;
      if (value.includes(",") || value.startsWith("@")) {
        const point = parseLineCoordinate(value, circleAnchor?.z ?? cadDraftingSettings.activeElevation, circleAnchor);
        if (!point) {
          setFileNotice({ text: `Enter the ${circlePointStage(circleMethod, circlePoints.length)} as X,Y or X,Y,Z. Use @X,Y for a relative point.`, tone: "error" });
          return;
        }
        circleCommandIdRef.current += 1;
        setCircleCommand({ id: circleCommandIdRef.current, kind: "coordinate", point });
        setCommandDraft("");
        return;
      }
      if (!circleAnchor) {
        setFileNotice({ text: `Specify the Circle ${circlePointStage(circleMethod, 0)} before entering a distance.`, tone: "error" });
        return;
      }
      const measure = parseArchitectural(value);
      if (measure === null || measure < 1 / 16) {
        setFileNotice({ text: `Enter the ${circlePointStage(circleMethod, circlePoints.length)} as an exact point or positive architectural distance.`, tone: "error" });
        return;
      }
      circleCommandIdRef.current += 1;
      setCircleCommand(circleMethod === "center-radius" || circleMethod === "center-diameter"
        ? { id: circleCommandIdRef.current, kind: "scalar", value: snapToSixteenth(measure) }
        : { distance: snapToSixteenth(measure), id: circleCommandIdRef.current, kind: "distance" });
      setCommandDraft("");
      return;
    }
    if (rectangleMode) {
      if (!value) {
        finishRectangleMode();
        return;
      }
      const dimensions = parseRectangleDimensionPair(value);
      if (dimensions) {
        if (!rectangleAnchor) {
          setFileNotice({ text: "Specify the first Rectangle corner before entering width × height.", tone: "error" });
          return;
        }
        rectangleCommandIdRef.current += 1;
        setRectangleCommand({ ...dimensions, id: rectangleCommandIdRef.current, kind: "dimensions" });
        setCommandDraft("");
        return;
      }
      if (value.includes(",") || value.startsWith("@")) {
        const point = parseLineCoordinate(value, rectangleAnchor?.z ?? cadDraftingSettings.activeElevation, rectangleAnchor);
        if (!point) {
          setFileNotice({ text: "Enter X,Y or X,Y,Z. Use @X,Y for a relative opposite corner.", tone: "error" });
          return;
        }
        rectangleCommandIdRef.current += 1;
        setRectangleCommand({ id: rectangleCommandIdRef.current, kind: "coordinate", point });
        setCommandDraft("");
        return;
      }
      setFileNotice({ text: rectangleAnchor ? `Enter an opposite corner, @relative corner, or dimensions such as 12' x 8'.` : "Enter the first corner as X,Y or X,Y,Z.", tone: "error" });
      return;
    }
    if (polylineMode) {
      if (!value) {
        polylineCommandIdRef.current += 1;
        setPolylineCommand({ id: polylineCommandIdRef.current, kind: "finish" });
        return;
      }
      const normalizedCommand = value.toLowerCase();
      if (["l", "line", "a", "arc"].includes(normalizedCommand)) {
        const mode: PolylineSegmentMode = normalizedCommand === "a" || normalizedCommand === "arc" ? "arc" : "line";
        setPolylineSegmentMode(mode);
        setCommandDraft("");
        setFileNotice({ text: `Polyline ${mode === "arc" ? "Arc" : "Line"} mode active.${mode === "arc" ? " Specify a through-point, then the endpoint." : ""}`, tone: "success" });
        return;
      }
      const widthCommand = value.match(/^(?:w|width)\s+(.+)$/i);
      if (widthCommand) {
        const parsed = parseSignedArchitectural(widthCommand[1]);
        if (parsed === null || parsed < 0 || parsed > MAXIMUM_COORDINATE) {
          setFileNotice({ text: "Enter WIDTH followed by zero or a positive architectural distance.", tone: "error" });
          return;
        }
        const width = snapToSixteenth(parsed);
        setPolylineWidth(width);
        setPolylineWidthDraft(formatArchitectural(width));
        setCommandDraft("");
        setFileNotice({ text: `Polyline width set to ${formatArchitectural(width)}.`, tone: "success" });
        return;
      }
      if (["u", "undo", "c", "close"].includes(normalizedCommand)) {
        polylineCommandIdRef.current += 1;
        setPolylineCommand({ id: polylineCommandIdRef.current, kind: normalizedCommand === "u" || normalizedCommand === "undo" ? "undo" : "close" });
        setCommandDraft("");
        return;
      }
      if (value.includes(",") || value.startsWith("@")) {
        const point = parseLineCoordinate(value, polylineAnchor?.z ?? cadDraftingSettings.activeElevation, polylineAnchor);
        if (!point) {
          setFileNotice({ text: "Enter X,Y or X,Y,Z in architectural units. Use @X,Y for a relative Polyline vertex.", tone: "error" });
          return;
        }
        polylineCommandIdRef.current += 1;
        setPolylineCommand({ id: polylineCommandIdRef.current, kind: "coordinate", point });
        setCommandDraft("");
        return;
      }
      const distance = parseArchitectural(value);
      if (distance === null || distance < 1 / 16) {
        setFileNotice({ text: "Enter a coordinate, a positive architectural distance, U to undo, or C to close.", tone: "error" });
        return;
      }
      polylineCommandIdRef.current += 1;
      setPolylineCommand({ distance: snapToSixteenth(distance), id: polylineCommandIdRef.current, kind: "distance" });
      setCommandDraft("");
      return;
    }
    if (!value) {
      finishLineMode();
      return;
    }
    const normalizedCommand = value.toLowerCase();
    if (normalizedCommand === "u" || normalizedCommand === "undo" || normalizedCommand === "c" || normalizedCommand === "close") {
      lineCommandIdRef.current += 1;
      setLineCommand({ id: lineCommandIdRef.current, kind: normalizedCommand === "u" || normalizedCommand === "undo" ? "undo" : "close" });
      setCommandDraft("");
      return;
    }
    if (value.includes(",") || value.startsWith("@")) {
      const point = parseLineCoordinate(value, lineAnchor?.z ?? cadDraftingSettings.activeElevation, lineAnchor);
      if (!point) {
        setFileNotice({ text: "Enter X,Y or X,Y,Z in architectural units. Use @X,Y for a relative point.", tone: "error" });
        return;
      }
      lineCommandIdRef.current += 1;
      setLineCommand({ id: lineCommandIdRef.current, kind: "coordinate", point });
      setCommandDraft("");
      return;
    }
    const distance = parseArchitectural(value);
    if (distance === null || distance < 1 / 16) {
      setFileNotice({ text: "Enter a coordinate or a positive architectural distance.", tone: "error" });
      return;
    }
    lineCommandIdRef.current += 1;
    setLineCommand({ distance: snapToSixteenth(distance), id: lineCommandIdRef.current, kind: "distance" });
    setCommandDraft("");
  }, [activateArcMode, activateBoundaryMode, activateBreakMode, activateChamferMode, activateCircleMode, activateExtendMode, activateFilletMode, activateFoundationWallMode, activateLengthenMode, activateLineMode, activateMirrorMode, activateMoveMode, activateOffsetMode, activatePolylineMode, activateRectangleMode, activateRotateMode, activateScaleMode, activateStretchMode, activateTrimMode, activateWallMode, applyPolylineChamfer, applyPolylineFillet, arcMode, arcPoints, boundaryMode, breakMode, cadDraftingSettings.activeElevation, chamferDistancePrompt, chamferFirstDistance, chamferMode, chamferStage, circleMethod, circleMode, circlePoints, commandDraft, explodeSelection, extendMode, filletMode, filletStage, finishArcMode, finishCircleMode, finishLineMode, finishRectangleMode, joinSelection, lastCommandName, lengthenMethod, lengthenMode, lineAnchor, lineMode, objectSnapOverride, offsetMode, polylineAnchor, polylineMode, rectangleAnchor, rectangleMode, startCopyMode, stretchMode, trimMode]);

  useEffect(() => {
    const handleLineKeyboard = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "F3") {
        event.preventDefault();
        setCadDraftingSettings((current) => ({ ...current, objectSnapEnabled: !current.objectSnapEnabled }));
        return;
      }
      if (event.key === "F7") {
        event.preventDefault();
        setCadDraftingSettings((current) => ({ ...current, gridVisible: !current.gridVisible }));
        return;
      }
      if (event.key === "F8") {
        event.preventDefault();
        setCadDraftingSettings((current) => ({ ...current, orthoEnabled: !current.orthoEnabled }));
        return;
      }
      if (event.key === "F10") {
        event.preventDefault();
        setCadDraftingSettings((current) => ({ ...current, polarEnabled: !current.polarEnabled }));
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (boundaryMode || breakMode || lengthenMode) return;
      if (!arcMode && !boundaryMode && !chamferMode && !circleMode && !copyMode && !extendMode && !filletMode && !lineMode && !mirrorMode && !moveMode && !offsetMode && !polylineMode && !rectangleMode && !rotateMode && !scaleMode && !stretchMode && !trimMode && event.key.toLowerCase() === "b") {
        event.preventDefault();
        activateBoundaryMode();
        return;
      }
      if (!arcMode && !chamferMode && !circleMode && !copyMode && !extendMode && !filletMode && !lineMode && !mirrorMode && !moveMode && !offsetMode && !polylineMode && !rectangleMode && !rotateMode && !scaleMode && !stretchMode && !trimMode && event.key.toLowerCase() === "j") {
        event.preventDefault();
        joinSelection();
        return;
      }
      if (!arcMode && !chamferMode && !circleMode && !copyMode && !extendMode && !filletMode && !lineMode && !mirrorMode && !moveMode && !offsetMode && !polylineMode && !rectangleMode && !rotateMode && !scaleMode && !stretchMode && !trimMode && event.key.toLowerCase() === "x") {
        event.preventDefault();
        explodeSelection();
        return;
      }
      if (!arcMode && !chamferMode && !circleMode && !lineMode && !offsetMode && !polylineMode && !rectangleMode && event.key.toLowerCase() === "a") {
        event.preventDefault();
        activateArcMode();
        return;
      }
      if (!arcMode && !chamferMode && !circleMode && !lineMode && !offsetMode && !polylineMode && !rectangleMode && event.key.toLowerCase() === "c") {
        event.preventDefault();
        activateCircleMode();
        return;
      }
      if (!arcMode && !chamferMode && !circleMode && !lineMode && !offsetMode && !polylineMode && !rectangleMode && event.key.toLowerCase() === "l") {
        event.preventDefault();
        activateLineMode();
        return;
      }
      if (!arcMode && !chamferMode && !circleMode && !lineMode && !offsetMode && !polylineMode && !rectangleMode && event.key.toLowerCase() === "w") {
        event.preventDefault();
        activateWallMode();
        return;
      }
      if (!arcMode && !chamferMode && !circleMode && !lineMode && !offsetMode && !polylineMode && !rectangleMode && event.key.toLowerCase() === "p") {
        event.preventDefault();
        activatePolylineMode();
        return;
      }
      if (!arcMode && !chamferMode && !circleMode && !lineMode && !offsetMode && !polylineMode && !rectangleMode && event.key.toLowerCase() === "r") {
        event.preventDefault();
        activateRectangleMode();
        return;
      }
      if (!arcMode && !chamferMode && !circleMode && !lineMode && !offsetMode && !polylineMode && !rectangleMode && event.key.toLowerCase() === "m") {
        event.preventDefault();
        activateMoveMode();
        return;
      }
      if (!arcMode && !chamferMode && !circleMode && !lineMode && !offsetMode && !polylineMode && !rectangleMode && event.key.toLowerCase() === "o") {
        event.preventDefault();
        activateOffsetMode();
        return;
      }
      if (!arcMode && !chamferMode && !circleMode && !lineMode && !offsetMode && !polylineMode && !rectangleMode && !stretchMode && event.key.toLowerCase() === "s") {
        event.preventDefault();
        activateStretchMode();
        return;
      }
      if (!arcMode && !chamferMode && !circleMode && !filletMode && !lineMode && !offsetMode && !polylineMode && !rectangleMode && event.key.toLowerCase() === "f") {
        event.preventDefault();
        activateFilletMode();
        return;
      }
      if (!arcMode && !chamferMode && !circleMode && !lineMode && !offsetMode && !polylineMode && !rectangleMode && event.key === "Enter" && lastCommandName) {
        event.preventDefault();
        if (lastCommandName === "arc") activateArcMode();
        else if (lastCommandName === "circle") activateCircleMode();
        else if (lastCommandName === "line") activateLineMode();
        else if (lastCommandName === "wall") activateWallMode();
        else if (lastCommandName === "foundation-wall") activateFoundationWallMode();
        else if (lastCommandName === "polyline") activatePolylineMode();
        else activateRectangleMode();
        return;
      }
      if ((lineMode || polylineMode) && (event.key.toLowerCase() === "u" || event.key.toLowerCase() === "c")) {
        event.preventDefault();
        setCommandDraft(event.key.toUpperCase());
        commandInputRef.current?.focus();
        return;
      }
      if (polylineMode && ["a", "l", "w"].includes(event.key.toLowerCase())) {
        event.preventDefault();
        setCommandDraft(event.key.toUpperCase());
        commandInputRef.current?.focus();
        return;
      }
      if ((arcMode || circleMode || lineMode || polylineMode || rectangleMode) && /^[a-z]$/i.test(event.key)) {
        event.preventDefault();
        setCommandDraft(event.key.toUpperCase());
        commandInputRef.current?.focus();
        return;
      }
      if ((lineMode || polylineMode) && event.key.length === 1 && /[0-9@,+\-'".−]/.test(event.key)) {
        event.preventDefault();
        setCommandDraft(event.key);
        commandInputRef.current?.focus();
      }
      if (circleMode && event.key.length === 1 && /[0-9@,+\-'".−]/.test(event.key)) {
        event.preventDefault();
        setCommandDraft(event.key);
        commandInputRef.current?.focus();
      }
      if (arcMode && event.key.length === 1 && /[0-9@,+\-'".−]/.test(event.key)) {
        event.preventDefault();
        setCommandDraft(event.key);
        commandInputRef.current?.focus();
      }
      if (rectangleMode && event.key.length === 1 && /[0-9@,+\-'".x×−]/i.test(event.key)) {
        event.preventDefault();
        setCommandDraft(event.key);
        commandInputRef.current?.focus();
      }
      if (offsetMode && event.key.length === 1 && /[0-9\-'".]/.test(event.key)) {
        event.preventDefault();
        setCommandDraft(event.key);
        commandInputRef.current?.focus();
      }
      if (chamferMode && event.key.length === 1 && /[0-9\-'".d]/i.test(event.key)) {
        event.preventDefault();
        setCommandDraft(event.key);
        commandInputRef.current?.focus();
      }
      if (filletMode && event.key.length === 1 && /[0-9\-'".r]/i.test(event.key)) {
        event.preventDefault();
        setCommandDraft(event.key);
        commandInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleLineKeyboard);
    return () => window.removeEventListener("keydown", handleLineKeyboard);
  }, [activateArcMode, activateBoundaryMode, activateCircleMode, activateFilletMode, activateFoundationWallMode, activateLineMode, activateMoveMode, activateOffsetMode, activatePolylineMode, activateRectangleMode, activateStretchMode, activateWallMode, arcMode, boundaryMode, breakMode, chamferMode, circleMode, copyMode, explodeSelection, extendMode, filletMode, joinSelection, lastCommandName, lengthenMode, lineMode, mirrorMode, moveMode, offsetMode, polylineMode, rectangleMode, rotateMode, scaleMode, stretchMode, trimMode]);

  const finishRotateMode = useCallback(() => {
    setRotateMode(false);
    setLineMode(false);
    setDragStatus(null);
    setFileNotice({ text: "Rotate mode finished.", tone: "info" });
  }, []);

  const finishScaleMode = useCallback(() => {
    setScaleMode(false);
    setDragStatus(null);
    setFileNotice({ text: "Scale mode finished.", tone: "info" });
  }, []);

  const finishMirrorMode = useCallback(() => {
    setMirrorMode(false);
    setDragStatus(null);
    setFileNotice({ text: "Mirror canceled.", tone: "info" });
  }, []);

  const finishOffsetMode = useCallback(() => {
    setOffsetMode(false);
    setDragStatus(null);
    setFileNotice({ text: "Offset canceled.", tone: "info" });
  }, []);

  const finishChamferMode = useCallback((canceled = true) => {
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setDragStatus(null);
    if (canceled) setFileNotice({ text: "Chamfer canceled.", tone: "info" });
  }, []);

  const finishBreakMode = useCallback((canceled = true) => {
    setBreakMode(null);
    setBreakStage(0);
    setDragStatus(null);
    if (canceled) setFileNotice({ text: "Break canceled.", tone: "info" });
  }, []);

  const finishLengthenMode = useCallback((canceled = true) => {
    setLengthenMode(false);
    setDragStatus(null);
    if (canceled) setFileNotice({ text: "Lengthen canceled.", tone: "info" });
  }, []);

  const finishFilletMode = useCallback((canceled = true) => {
    setFilletMode(false);
    setFilletStage(0);
    setDragStatus(null);
    if (canceled) setFileNotice({ text: "Fillet canceled.", tone: "info" });
  }, []);

  const finishTrimExtendMode = useCallback(() => {
    setTrimMode(false);
    setExtendMode(false);
    setDragStatus(null);
    setFileNotice({ text: "Trim/Extend canceled.", tone: "info" });
  }, []);

  const changeViewTarget = useCallback((nextView: ViewTarget) => {
    setDragStatus(null);
    setSelectedFaceIndex(null);
    setViewTarget(nextView);
    setFileNotice({
      text: nextView.projection === "perspective"
        ? "Perspective view active. Right-drag rotates the model."
        : `${nextView.label} view active. Rotation is locked for precise editing.`,
      tone: "info",
    });
  }, []);

  const copySelection = useCallback((axis: AxisKey, distance: number) => {
    const result = copyModelEntities(editor.present, selectedEntityRefs, {
      x: axis === "x" ? distance : 0,
      y: axis === "y" ? distance : 0,
      z: axis === "z" ? distance : 0,
    });
    if (!result) return false;
    dispatch({ type: "commit", next: result.document });
    applyCadSelection(result.document, result.refs, result.refs.at(-1) ?? null);
    setFileNotice({ text: `Placed ${result.refs.length} copied entit${result.refs.length === 1 ? "y" : "ies"}.`, tone: "success" });
    return true;
  }, [applyCadSelection, editor.present, selectedEntityRefs]);

  const undo = useCallback(() => {
    const previous = editor.past.at(-1);
    if (!previous) return;
    const previousArc = findArcObject(previous, selectedArcId);
    if (previousArc && findLayer(previous, previousArc.layerId)?.visible) {
      setSelectedArcId(previousArc.id); setSelectedCircleId(null); setSelectedPolylineId(null); setSelectedLineId(null); setSelectedObjectId(null); setSelectedObjectIds([]); setSelectedEntityKeys([cadEntityKey({ id: previousArc.id, kind: "arc" })]); setSelectedFaceIndex(null);
      dispatch({ type: "undo" });
      return;
    }
    const previousCircle = findCircleObject(previous, selectedCircleId);
    if (previousCircle && findLayer(previous, previousCircle.layerId)?.visible) {
      setSelectedCircleId(previousCircle.id); setSelectedPolylineId(null); setSelectedLineId(null); setSelectedObjectId(null); setSelectedObjectIds([]); setSelectedEntityKeys([cadEntityKey({ id: previousCircle.id, kind: "circle" })]); setSelectedFaceIndex(null);
      dispatch({ type: "undo" });
      return;
    }
    const previousPolyline = findPolylineObject(previous, selectedPolylineId);
    if (previousPolyline && findLayer(previous, previousPolyline.layerId)?.visible) {
      setSelectedPolylineId(previousPolyline.id); setSelectedCircleId(null); setSelectedLineId(null); setSelectedObjectId(null); setSelectedObjectIds([]); setSelectedEntityKeys([cadEntityKey({ id: previousPolyline.id, kind: "polyline" })]); setSelectedFaceIndex(null);
      dispatch({ type: "undo" });
      return;
    }
    const previousLine = findLineObject(previous, selectedLineId);
    if (previousLine && findLayer(previous, previousLine.layerId)?.visible) {
      setSelectedLineId(previousLine.id);
      setSelectedCircleId(null);
      setSelectedPolylineId(null);
      setSelectedObjectId(null);
      setSelectedObjectIds([]);
      setSelectedEntityKeys([cadEntityKey({ id: previousLine.id, kind: "line" })]);
      setSelectedFaceIndex(null);
      dispatch({ type: "undo" });
      return;
    }
    const previousSelection = findBoxObject(previous, selectedObjectId);
    if (!previousSelection || !objectIsSelectable(previous, previousSelection)) {
      setSelectionForDocument(previous, firstSelectableObjectId(previous));
    } else {
      setSelectionForDocument(previous, previousSelection.id);
    }
    dispatch({ type: "undo" });
  }, [editor.past, selectedArcId, selectedCircleId, selectedLineId, selectedObjectId, selectedPolylineId, setSelectionForDocument]);
  const redo = useCallback(() => {
    const next = editor.future[0];
    if (!next) return;
    const nextArc = findArcObject(next, selectedArcId);
    if (nextArc && findLayer(next, nextArc.layerId)?.visible) {
      setSelectedArcId(nextArc.id); setSelectedCircleId(null); setSelectedPolylineId(null); setSelectedLineId(null); setSelectedObjectId(null); setSelectedObjectIds([]); setSelectedEntityKeys([cadEntityKey({ id: nextArc.id, kind: "arc" })]); setSelectedFaceIndex(null);
      dispatch({ type: "redo" });
      return;
    }
    const nextCircle = findCircleObject(next, selectedCircleId);
    if (nextCircle && findLayer(next, nextCircle.layerId)?.visible) {
      setSelectedCircleId(nextCircle.id); setSelectedPolylineId(null); setSelectedLineId(null); setSelectedObjectId(null); setSelectedObjectIds([]); setSelectedEntityKeys([cadEntityKey({ id: nextCircle.id, kind: "circle" })]); setSelectedFaceIndex(null);
      dispatch({ type: "redo" });
      return;
    }
    const nextPolyline = findPolylineObject(next, selectedPolylineId);
    if (nextPolyline && findLayer(next, nextPolyline.layerId)?.visible) {
      setSelectedPolylineId(nextPolyline.id); setSelectedCircleId(null); setSelectedLineId(null); setSelectedObjectId(null); setSelectedObjectIds([]); setSelectedEntityKeys([cadEntityKey({ id: nextPolyline.id, kind: "polyline" })]); setSelectedFaceIndex(null);
      dispatch({ type: "redo" });
      return;
    }
    const nextLine = findLineObject(next, selectedLineId);
    if (nextLine && findLayer(next, nextLine.layerId)?.visible) {
      setSelectedLineId(nextLine.id);
      setSelectedCircleId(null);
      setSelectedPolylineId(null);
      setSelectedObjectId(null);
      setSelectedObjectIds([]);
      setSelectedEntityKeys([cadEntityKey({ id: nextLine.id, kind: "line" })]);
      setSelectedFaceIndex(null);
      dispatch({ type: "redo" });
      return;
    }
    const nextSelection = findBoxObject(next, selectedObjectId);
    if (!nextSelection || !objectIsSelectable(next, nextSelection)) {
      setSelectionForDocument(next, firstSelectableObjectId(next));
    } else {
      setSelectionForDocument(next, nextSelection.id);
    }
    dispatch({ type: "redo" });
  }, [editor.future, selectedArcId, selectedCircleId, selectedLineId, selectedObjectId, selectedPolylineId, setSelectionForDocument]);

  const undoLineSegment = useCallback(() => {
    if (!editor.past.length) return false;
    dispatch({ type: "undo" });
    return true;
  }, [editor.past.length]);

  const addBox = useCallback(() => {
    setBoundaryMode(false);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    const result = addBoxObject(editor.present);
    if (!result) {
      setFileNotice({ text: "This project has reached the 100-box limit.", tone: "error" });
      return;
    }
    dispatch({ type: "commit", next: result.document });
    setSelectionForDocument(result.document, result.object.id);
    setFileNotice({ text: `Added ${result.object.name}.`, tone: "success" });
  }, [editor.present, setSelectionForDocument]);

  const createLine = useCallback((start: LinePoint, end: LinePoint) => {
    const result = addLineObject(editor.present, start, end);
    if (!result) {
      setFileNotice({ text: "The line must have a measurable length and stay within the drawing area.", tone: "error" });
      return false;
    }
    const next = foundationWallMode
      ? createFoundationWallFromLine(result.document, result.line.id)
      : wallMode
        ? createWallFromLine(result.document, result.line.id)
        : result.document;
    const createdLine = next ? findLineObject(next, result.line.id) : null;
    if (!next || !createdLine) {
      setFileNotice({ text: `The ${foundationWallMode ? "Foundation Wall" : wallMode ? "Wall" : "Line"} could not be created with the active Story and type.`, tone: "error" });
      return false;
    }
    dispatch({ type: "commit", next });
    continuableEntityHistoryRef.current.push({ id: createdLine.id, type: "line" });
    if (!lineMode) setSelectedLineId(result.line.id);
    setFileNotice({ text: `Added ${createdLine.name}. Continue from its endpoint or press Escape to finish.`, tone: "success" });
    return true;
  }, [editor.present, foundationWallMode, lineMode, wallMode]);

  const updateSelectedLine = useCallback((geometry: LineGeometry) => {
    if (!selectedLineId) return false;
    const next = updateLineObject(editor.present, selectedLineId, geometry);
    if (!next) return false;
    dispatch({ type: "commit", next });
    return true;
  }, [editor.present, selectedLineId]);

  const renameSelectedLine = useCallback((name: string) => {
    if (!selectedLineId) return false;
    const next = renameLineObject(editor.present, selectedLineId, name);
    if (!next) return false;
    dispatch({ type: "commit", next });
    return true;
  }, [editor.present, selectedLineId]);

  const assignSelectedLineLayer = useCallback((layerId: string) => {
    if (!selectedLineId) return;
    const next = assignLineToLayer(editor.present, selectedLineId, layerId);
    if (!next) return;
    dispatch({ type: "commit", next });
    const layer = findLayer(next, layerId);
    if (!layer?.visible || layer.locked) selectLine(null);
  }, [editor.present, selectLine, selectedLineId]);

  const toggleSelectedWallRole = useCallback(() => {
    if (!selectedLine || !selectedLineIsEditable) return;
    const next = selectedLine.architecturalRole !== null
      ? removeWallRole(editor.present, selectedLine.id)
      : createWallFromLine(editor.present, selectedLine.id);
    if (!next) {
      setFileNotice({ text: "A wall needs a measurable plan length, an assigned Story, and a valid active wall type.", tone: "error" });
      return;
    }
    dispatch({ type: "commit", next });
    setFileNotice({ text: selectedLine.architecturalRole !== null ? `${selectedLine.name} is now a drafting Line.` : `${selectedLine.name} is now a Story-controlled Wall.`, tone: "success" });
  }, [editor.present, selectedLine, selectedLineIsEditable]);

  const makeSelectedFoundationWall = useCallback(() => {
    if (!selectedLine || !selectedLineIsEditable || selectedLine.architecturalRole !== null) return;
    const next = createFoundationWallFromLine(editor.present, selectedLine.id);
    if (!next) {
      setFileNotice({ text: "A Foundation Wall needs a measurable plan length, an assigned Story, and a valid active Foundation Wall type.", tone: "error" });
      return;
    }
    dispatch({ type: "commit", next });
    setFileNotice({ text: `${selectedLine.name} is now a Story-controlled Foundation Wall.`, tone: "success" });
  }, [editor.present, selectedLine, selectedLineIsEditable]);

  const assignSelectedWallType = useCallback((wallTypeId: string) => {
    if (!selectedLine) return;
    const next = assignWallType(editor.present, selectedLine.id, wallTypeId);
    if (!next) return;
    dispatch({ type: "commit", next });
  }, [editor.present, selectedLine]);

  const assignSelectedWallFoundationSupport = useCallback((foundationSupportWallId: string | null) => {
    if (!selectedLine) return;
    const next = assignWallFoundationSupport(editor.present, selectedLine.id, foundationSupportWallId);
    if (!next) return;
    dispatch({ type: "commit", next });
  }, [editor.present, selectedLine]);

  const assignSelectedFoundationWallType = useCallback((foundationWallTypeId: string) => {
    if (!selectedLine) return;
    const next = assignFoundationWallType(editor.present, selectedLine.id, foundationWallTypeId);
    if (!next) return;
    dispatch({ type: "commit", next });
  }, [editor.present, selectedLine]);

  const setSelectedWallPlacement = useCallback((change: { endJoinMode?: WallJoinMode; exteriorSide?: WallExteriorSide; joinPriority?: number; referenceLine?: WallReferenceLine; startJoinMode?: WallJoinMode }) => {
    if (!selectedLine) return;
    const next = updateWallPlacement(editor.present, selectedLine.id, change);
    if (!next) return;
    dispatch({ type: "commit", next });
  }, [editor.present, selectedLine]);

  const addSelectedWallOpening = useCallback((kind: WallOpeningKind) => {
    if (!selectedLine) return null;
    const result = addWallOpening(editor.present, selectedLine.id, kind);
    if (!result) {
      setFileNotice({ text: `There is not enough clear Wall length or height for another ${kind}.`, tone: "error" });
      return null;
    }
    dispatch({ type: "commit", next: result.document });
    setFileNotice({ text: `Added ${result.opening.name}; its rough opening now cuts every Wall layer.`, tone: "success" });
    return result.opening.id;
  }, [editor.present, selectedLine]);

  const updateSelectedWallOpening = useCallback((openingId: string, change: Partial<WallOpening>) => {
    if (!selectedLine) return false;
    const next = updateWallOpening(editor.present, selectedLine.id, openingId, change);
    if (!next) {
      setFileNotice({ text: "That opening would overlap another opening, leave the Wall, or exceed the Story height.", tone: "error" });
      return false;
    }
    dispatch({ type: "commit", next });
    return true;
  }, [editor.present, selectedLine]);

  const assignSelectedWallOpeningType = useCallback((openingId: string, typeId: string) => {
    if (!selectedLine) return false;
    const next = assignWallOpeningType(editor.present, selectedLine.id, openingId, typeId);
    if (!next) {
      setFileNotice({ text: "That component type does not fit the available Wall length or Story height.", tone: "error" });
      return false;
    }
    dispatch({ type: "commit", next });
    return true;
  }, [editor.present, selectedLine]);

  const deleteSelectedWallOpening = useCallback((openingId: string) => {
    if (!selectedLine) return;
    const opening = selectedLine.wallOpenings.find((candidate) => candidate.id === openingId);
    if (!opening || !window.confirm(`Delete ${opening.name}? You can restore it with Undo.`)) return;
    const next = deleteWallOpening(editor.present, selectedLine.id, openingId);
    if (!next) return;
    dispatch({ type: "commit", next });
    setFileNotice({ text: `Deleted ${opening.name}.`, tone: "info" });
  }, [editor.present, selectedLine]);

  const toggleSelectedLineLock = useCallback(() => {
    if (!selectedLine) return;
    const next = setLineLocked(editor.present, selectedLine.id, !selectedLine.locked);
    if (!next) return;
    dispatch({ type: "commit", next });
  }, [editor.present, selectedLine]);

  const deleteSelectedLine = useCallback(() => {
    if (!selectedLine || !selectedLineIsEditable) return;
    if (!window.confirm(`Delete ${selectedLine.name}? You can restore it with Undo.`)) return;
    const next = deleteLineObject(editor.present, selectedLine.id);
    if (!next) return;
    dispatch({ type: "commit", next });
    setSelectedLineId(null);
    setFileNotice({ text: `Deleted ${selectedLine.name}.`, tone: "info" });
  }, [editor.present, selectedLine, selectedLineIsEditable]);

  const createArc = useCallback((geometry: ArcGeometry) => {
    const result = addArcObject(editor.present, geometry);
    if (!result) {
      setFileNotice({ text: "The Arc needs three non-collinear points inside the supported drawing area.", tone: "error" });
      return false;
    }
    dispatch({ type: "commit", next: result.document });
    continuableEntityHistoryRef.current.push({ id: result.arc.id, type: "arc" });
    setSelectedArcId(result.arc.id);
    setFileNotice({ text: `Added ${result.arc.name}.`, tone: "success" });
    return true;
  }, [editor.present]);

  const updateSelectedArc = useCallback((geometry: ArcGeometry) => {
    if (!selectedArcId) return false;
    const next = updateArcObject(editor.present, selectedArcId, geometry);
    if (!next) return false;
    dispatch({ type: "commit", next });
    return true;
  }, [editor.present, selectedArcId]);

  const renameSelectedArc = useCallback((name: string) => {
    if (!selectedArcId) return false;
    const next = renameArcObject(editor.present, selectedArcId, name);
    if (!next) return false;
    dispatch({ type: "commit", next });
    return true;
  }, [editor.present, selectedArcId]);

  const assignSelectedArcLayer = useCallback((layerId: string) => {
    if (!selectedArcId) return;
    const next = assignArcToLayer(editor.present, selectedArcId, layerId);
    if (!next) return;
    dispatch({ type: "commit", next });
    const layer = findLayer(next, layerId);
    if (!layer?.visible || layer.locked) selectArc(null);
  }, [editor.present, selectArc, selectedArcId]);

  const toggleSelectedArcLock = useCallback(() => {
    if (!selectedArc) return;
    const next = setArcLocked(editor.present, selectedArc.id, !selectedArc.locked);
    if (next) dispatch({ type: "commit", next });
  }, [editor.present, selectedArc]);

  const deleteSelectedArc = useCallback(() => {
    if (!selectedArc || !selectedArcIsEditable) return;
    if (!window.confirm(`Delete ${selectedArc.name}? You can restore it with Undo.`)) return;
    const next = deleteArcObject(editor.present, selectedArc.id);
    if (!next) return;
    dispatch({ type: "commit", next });
    setSelectedArcId(null);
    setFileNotice({ text: `Deleted ${selectedArc.name}.`, tone: "info" });
  }, [editor.present, selectedArc, selectedArcIsEditable]);

  const createCircle = useCallback((geometry: CircleGeometry) => {
    const result = addCircleObject(editor.present, geometry);
    if (!result) {
      setFileNotice({ text: "The Circle needs a measurable radius inside the supported drawing area.", tone: "error" });
      return false;
    }
    dispatch({ type: "commit", next: result.document });
    setSelectedCircleId(result.circle.id);
    setFileNotice({ text: `Added ${result.circle.name}.`, tone: "success" });
    return true;
  }, [editor.present]);

  const updateSelectedCircle = useCallback((geometry: CircleGeometry) => {
    if (!selectedCircleId) return false;
    const next = updateCircleObject(editor.present, selectedCircleId, geometry);
    if (!next) return false;
    dispatch({ type: "commit", next });
    return true;
  }, [editor.present, selectedCircleId]);

  const renameSelectedCircle = useCallback((name: string) => {
    if (!selectedCircleId) return false;
    const next = renameCircleObject(editor.present, selectedCircleId, name);
    if (!next) return false;
    dispatch({ type: "commit", next });
    return true;
  }, [editor.present, selectedCircleId]);

  const assignSelectedCircleLayer = useCallback((layerId: string) => {
    if (!selectedCircleId) return;
    const next = assignCircleToLayer(editor.present, selectedCircleId, layerId);
    if (!next) return;
    dispatch({ type: "commit", next });
    const layer = findLayer(next, layerId);
    if (!layer?.visible || layer.locked) selectCircle(null);
  }, [editor.present, selectCircle, selectedCircleId]);

  const toggleSelectedCircleLock = useCallback(() => {
    if (!selectedCircle) return;
    const next = setCircleLocked(editor.present, selectedCircle.id, !selectedCircle.locked);
    if (next) dispatch({ type: "commit", next });
  }, [editor.present, selectedCircle]);

  const deleteSelectedCircle = useCallback(() => {
    if (!selectedCircle || !selectedCircleIsEditable) return;
    if (!window.confirm(`Delete ${selectedCircle.name}? You can restore it with Undo.`)) return;
    const next = deleteCircleObject(editor.present, selectedCircle.id);
    if (!next) return;
    dispatch({ type: "commit", next });
    setSelectedCircleId(null);
    setFileNotice({ text: `Deleted ${selectedCircle.name}.`, tone: "info" });
  }, [editor.present, selectedCircle, selectedCircleIsEditable]);

  const createPolyline = useCallback((geometry: PolylineGeometry, shape: "polyline" | "rectangle") => {
    const result = addPolylineObject(editor.present, geometry, shape);
    if (!result) {
      setFileNotice({ text: `The ${shape} needs distinct points inside the supported drawing area.`, tone: "error" });
      return false;
    }
    dispatch({ type: "commit", next: result.document });
    continuableEntityHistoryRef.current.push({ id: result.polyline.id, type: "polyline" });
    setSelectedPolylineId(result.polyline.id);
    setFileNotice({ text: `Added ${result.polyline.name}.`, tone: "success" });
    return true;
  }, [editor.present]);

  const updateSelectedPolyline = useCallback((geometry: PolylineGeometry) => {
    if (!selectedPolylineId) return false;
    const next = updatePolylineObject(editor.present, selectedPolylineId, geometry);
    if (!next) return false;
    dispatch({ type: "commit", next });
    return true;
  }, [editor.present, selectedPolylineId]);

  const renameSelectedPolyline = useCallback((name: string) => {
    if (!selectedPolylineId) return false;
    const next = renamePolylineObject(editor.present, selectedPolylineId, name);
    if (!next) return false;
    dispatch({ type: "commit", next });
    return true;
  }, [editor.present, selectedPolylineId]);

  const assignSelectedPolylineLayer = useCallback((layerId: string) => {
    if (!selectedPolylineId) return;
    const next = assignPolylineToLayer(editor.present, selectedPolylineId, layerId);
    if (!next) return;
    dispatch({ type: "commit", next });
    const layer = findLayer(next, layerId);
    if (!layer?.visible || layer.locked) selectPolyline(null);
  }, [editor.present, selectPolyline, selectedPolylineId]);

  const assignSelectedEntityStory = useCallback((ref: ModelEntityRef, storyId: string) => {
    const next = assignModelEntityToStory(editor.present, ref, storyId);
    if (!next || next === editor.present) return;
    dispatch({ type: "commit", next });
    const story = next.building.stories.find((candidate) => candidate.id === storyId);
    setFileNotice({ text: `Moved selection to ${story?.name ?? "Story"} at its rough-floor elevation.`, tone: "success" });
  }, [editor.present]);

  const toggleSelectedPolylineLock = useCallback(() => {
    if (!selectedPolyline) return;
    const next = setPolylineLocked(editor.present, selectedPolyline.id, !selectedPolyline.locked);
    if (next) dispatch({ type: "commit", next });
  }, [editor.present, selectedPolyline]);

  const toggleSelectedFloorPlatform = useCallback(() => {
    if (!selectedPolyline || !selectedPolylineIsEditable) return;
    const next = selectedPolyline.architecturalRole === "floor-platform"
      ? removeFloorPlatformRole(editor.present, selectedPolyline.id)
      : createFloorPlatformFromPolyline(editor.present, selectedPolyline.id);
    if (!next) {
      setFileNotice({ text: "A floor platform requires one editable closed boundary on a valid Story.", tone: "error" });
      return;
    }
    dispatch({ type: "commit", next });
    setFileNotice({
      text: selectedPolyline.architecturalRole === "floor-platform"
        ? "Removed the architectural floor role; the closed boundary remains."
        : "Created a live layered floor platform at the Story rough-floor elevation.",
      tone: "success",
    });
  }, [editor.present, selectedPolyline, selectedPolylineIsEditable]);

  const deleteSelectedPolyline = useCallback(() => {
    if (!selectedPolyline || !selectedPolylineIsEditable) return;
    if (!window.confirm(`Delete ${selectedPolyline.name}? You can restore it with Undo.`)) return;
    const next = deletePolylineObject(editor.present, selectedPolyline.id);
    if (!next) return;
    dispatch({ type: "commit", next });
    setSelectedPolylineId(null);
    setFileNotice({ text: `Deleted ${selectedPolyline.name}.`, tone: "info" });
  }, [editor.present, selectedPolyline, selectedPolylineIsEditable]);

  const addNewLayer = useCallback(() => {
    const result = addLayer(editor.present);
    if (!result) {
      setFileNotice({ text: "This project has reached the 64-layer limit.", tone: "error" });
      return;
    }
    dispatch({ type: "commit", next: result.document });
    setExplorerTab("layers");
    setFileNotice({ text: `Added ${result.layer.name} and made it current.`, tone: "success" });
  }, [editor.present]);

  const applyStorySettings = useCallback((building: BuildingStructure) => {
    const next = updateDocumentBuilding(editor.present, building);
    if (!next) {
      setFileNotice({ text: "Story settings contain an invalid height or assembly.", tone: "error" });
      return;
    }
    dispatch({ type: "commit", next });
    setDrawingPlaneFromBuilding(building);
    setStoryManagerOpen(false);
    const selectedStory = building.stories.find((story) => story.id === building.activeStoryId);
    setFileNotice({ text: `${selectedStory?.name ?? "Story"} is active. Rough framing elevations were recalculated.`, tone: "success" });
  }, [editor.present, setDrawingPlaneFromBuilding]);

  const applyWallTypes = useCallback((building: BuildingStructure) => {
    const next = updateDocumentBuilding(editor.present, building);
    if (!next) {
      setFileNotice({ text: "Wall types contain an invalid name, layer, or thickness.", tone: "error" });
      return;
    }
    dispatch({ type: "commit", next });
    setWallTypeManagerOpen(false);
    const activeType = building.wallTypes.find((wallType) => wallType.id === building.activeWallTypeId);
    setFileNotice({ text: `${activeType?.name ?? "Wall type"} is active for new walls.`, tone: "success" });
  }, [editor.present]);

  const applyFoundationWallTypes = useCallback((building: BuildingStructure) => {
    const next = updateDocumentBuilding(editor.present, building);
    if (!next) {
      setFileNotice({ text: "Foundation Wall types contain an invalid name, dimension, footing, or sill configuration.", tone: "error" });
      return;
    }
    dispatch({ type: "commit", next });
    setFoundationManagerOpen(false);
    const activeType = building.foundationWallTypes.find((type) => type.id === building.activeFoundationWallTypeId);
    setFileNotice({ text: `${activeType?.name ?? "Foundation Wall type"} is active for future Foundation Walls.`, tone: "success" });
  }, [editor.present]);

  const applyOpeningTypes = useCallback((building: BuildingStructure) => {
    const next = updateDocumentBuilding(editor.present, building);
    if (!next) {
      setFileNotice({ text: "A changed Door, Window, or header assembly no longer fits one of its placed Walls.", tone: "error" });
      return false;
    }
    dispatch({ type: "commit", next });
    setOpeningTypeManagerOpen(false);
    const activeDoor = building.openingTypes.find((type) => type.id === building.activeDoorTypeId);
    const activeWindow = building.openingTypes.find((type) => type.id === building.activeWindowTypeId);
    setFileNotice({ text: `${activeDoor?.name ?? "Door"} and ${activeWindow?.name ?? "Window"} are active for new openings.`, tone: "success" });
    return true;
  }, [editor.present]);

  const applyWallFraming = useCallback((building: BuildingStructure) => {
    const next = updateDocumentBuilding(editor.present, building);
    if (!next) {
      setFileNotice({ text: "Wall framing defaults contain an invalid member size, spacing, plate count, or material.", tone: "error" });
      return;
    }
    dispatch({ type: "commit", next });
    setFramingManagerOpen(false);
    setFileNotice({ text: building.wallFraming.showInModel ? "Wall framing is generated and visible in 3D." : "Wall framing defaults were saved with the project.", tone: "success" });
  }, [editor.present]);

  const applyRoomSettings = useCallback((next: ModelDocument) => {
    dispatch({ type: "commit", next });
    setRoomManagerOpen(false);
    const count = next.rooms.filter((room) => room.storyId === next.building.activeStoryId).length;
    setFileNotice({ text: `${count} Room${count === 1 ? "" : "s"} saved for the active Story.`, tone: "success" });
  }, []);

  const activateLayer = useCallback((layerId: string) => {
    const next = setActiveLayer(editor.present, layerId);
    if (!next) return;
    dispatch({ type: "commit", next });
  }, [editor.present]);

  const changeLayerVisibility = useCallback((layerId: string) => {
    const next = toggleLayerVisibility(editor.present, layerId);
    if (!next) {
      setFileNotice({ text: "The current layer must remain visible.", tone: "info" });
      return;
    }
    const selectionTouchesLayer = selectedObjectIds.some(
      (id) => findBoxObject(editor.present, id)?.layerId === layerId,
    ) || selectedLine?.layerId === layerId || selectedPolyline?.layerId === layerId || selectedCircle?.layerId === layerId || selectedArc?.layerId === layerId;
    if (selectionTouchesLayer) setSelectionForDocument(next, null);
    dispatch({ type: "commit", next });
  }, [editor.present, selectedArc, selectedCircle, selectedLine, selectedObjectIds, selectedPolyline, setSelectionForDocument]);

  const changeLayerLock = useCallback((layerId: string) => {
    const next = toggleLayerLock(editor.present, layerId);
    if (!next) {
      setFileNotice({ text: "The current layer must remain unlocked.", tone: "info" });
      return;
    }
    const selectionTouchesLayer = selectedObjectIds.some(
      (id) => findBoxObject(editor.present, id)?.layerId === layerId,
    ) || selectedLine?.layerId === layerId || selectedPolyline?.layerId === layerId || selectedCircle?.layerId === layerId || selectedArc?.layerId === layerId;
    if (selectionTouchesLayer) setSelectionForDocument(next, null);
    dispatch({ type: "commit", next });
  }, [editor.present, selectedArc, selectedCircle, selectedLine, selectedObjectIds, selectedPolyline, setSelectionForDocument]);

  const renameProjectLayer = useCallback((layerId: string, name: string) => {
    const next = renameLayer(editor.present, layerId, name);
    if (!next) return false;
    dispatch({ type: "commit", next });
    return true;
  }, [editor.present]);

  const removeLayer = useCallback((layerId: string) => {
    const layer = findLayer(editor.present, layerId);
    const next = deleteLayer(editor.present, layerId);
    if (!next) {
      setFileNotice({ text: "Only an empty, non-current custom layer can be deleted.", tone: "info" });
      return;
    }
    dispatch({ type: "commit", next });
    setFileNotice({ text: `Deleted ${layer?.name ?? "layer"}.`, tone: "info" });
  }, [editor.present]);

  const assignSelectedLayer = useCallback((layerId: string) => {
    if (!selectedObjectId) return;
    const next = assignObjectToLayer(editor.present, selectedObjectId, layerId);
    if (!next) return;
    dispatch({ type: "commit", next });
    const layer = findLayer(next, layerId);
    if (!layer?.visible || layer.locked) {
      setSingleSelection(null);
    }
  }, [editor.present, selectedObjectId, setSingleSelection]);

  const renameSelectedObject = useCallback((name: string) => {
    if (!selectedBox || !selectedObjectId) return false;
    if (selectedBox.name === name.trim()) return true;
    const next = renameBoxObject(editor.present, selectedObjectId, name);
    if (!next) return false;
    dispatch({ type: "commit", next });
    setFileNotice({ text: `Renamed object to ${name.trim()}.`, tone: "success" });
    return true;
  }, [editor.present, selectedBox, selectedObjectId]);

  const deleteSelectedObject = useCallback(() => {
    if (
      !selectedBox ||
      !selectedObjectId ||
      !selectionIsEditable ||
      !selectedObjectIds.length
    ) return;
    const selectionCount = selectedObjectIds.length;
    const description = selectionCount > 1 ? `${selectionCount} selected objects` : selectedBox.name;
    if (!window.confirm(`Delete ${description}? You can restore it with Undo.`)) {
      return;
    }
    const selectedIndex = editor.present.objects.findIndex(
      (object) => object.id === selectedObjectId,
    );
    const next = selectionCount > 1
      ? deleteBoxObjects(editor.present, selectedObjectIds)
      : deleteBoxObject(editor.present, selectedObjectId);
    if (!next) return;
    const nextSelection = next.objects[Math.min(selectedIndex, next.objects.length - 1)];
    dispatch({ type: "commit", next });
    setSelectionForDocument(next, nextSelection?.id ?? null);
    setFileNotice({ text: `Deleted ${description}.`, tone: "info" });
  }, [editor.present, selectedBox, selectedObjectId, selectedObjectIds, selectionIsEditable, setSelectionForDocument]);

  const eraseSelection = useCallback(() => {
    if (!selectionCanModify) return;
    const count = selectedEntityRefs.length;
    const description = count === 1 ? "the selected entity" : `${count} selected entities`;
    if (!window.confirm(`Erase ${description}? You can restore the selection with Undo.`)) return;
    const next = deleteModelEntities(editor.present, selectedEntityRefs);
    if (!next) {
      setFileNotice({ text: "Locked entities cannot be erased.", tone: "info" });
      return;
    }
    dispatch({ type: "commit", next });
    applyCadSelection(next, []);
    setCopyMode(false);
    setMoveMode(false);
    setRotateMode(false);
    setScaleMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setFileNotice({ text: `Erased ${count} entit${count === 1 ? "y" : "ies"}.`, tone: "info" });
  }, [applyCadSelection, editor.present, selectedEntityRefs, selectionCanModify]);

  useEffect(() => {
    const eraseWithDeleteKey = (event: KeyboardEvent) => {
      if (event.key !== "Delete") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (arcMode || boundaryMode || breakMode || chamferMode || circleMode || extendMode || filletMode || lineMode || mirrorMode || offsetMode || polylineMode || rectangleMode || moveMode || copyMode || rotateMode || scaleMode || trimMode) return;
      event.preventDefault();
      eraseSelection();
    };
    window.addEventListener("keydown", eraseWithDeleteKey);
    return () => window.removeEventListener("keydown", eraseWithDeleteKey);
  }, [arcMode, boundaryMode, breakMode, chamferMode, circleMode, copyMode, eraseSelection, extendMode, filletMode, lineMode, mirrorMode, moveMode, offsetMode, polylineMode, rectangleMode, rotateMode, scaleMode, trimMode]);

  const confirmDiscard = useCallback(() => {
    return !isDirty || window.confirm(
      "This project has unsaved changes. Discard them and continue?",
    );
  }, [isDirty]);

  const newProject = useCallback(() => {
    if (!confirmDiscard()) return;
    const now = new Date().toISOString();
    dispatch({ type: "load", next: NEW_PROJECT_DOCUMENT });
    setDrawingPlaneFromBuilding(NEW_PROJECT_DOCUMENT.building);
    setProjectName("Untitled Model");
    setSavedProjectName("Untitled Model");
    setProjectCreatedAt(now);
    setSelectionForDocument(NEW_PROJECT_DOCUMENT, null);
    setViewTarget(VIEW_PRESETS.top);
    setFitViewSignal((value) => value + 1);
    setCopyMode(false);
    setMoveMode(false);
    setRotateMode(false);
    setScaleMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setBoundaryMode(false);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletMode(false);
    setFilletStage(0);
    setStretchMode(false);
    setStretchTargets([]);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setWallMode(false);
    setFoundationWallMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    continuableEntityHistoryRef.current = [];
    setRecoveredAt(null);
    setFileNotice({ text: "Started a blank new plan in Top view. Adjust Stories and Wall Types, then begin drawing.", tone: "info" });
  }, [confirmDiscard, setDrawingPlaneFromBuilding, setSelectionForDocument]);

  const saveProjectWithName = useCallback((requestedName: string) => {
    const now = new Date().toISOString();
    const name = requestedName.trim() || "Untitled Model";
    const project = createProjectDocument({
      createdAt: projectCreatedAt,
      document: editor.present,
      name,
      updatedAt: now,
    });
    const blob = new Blob([serializeProjectDocument(project)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = projectFilename(name);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);

    dispatch({ type: "mark-saved" });
    setProjectName(name);
    setSavedProjectName(name);
    setRecoveredAt(null);
    setFileNotice({
      text: `Saved ${projectFilename(name)} to Downloads.`,
      tone: "success",
    });
  }, [editor.present, projectCreatedAt]);

  const saveProject = useCallback(() => {
    saveProjectWithName(normalizedProjectName);
  }, [normalizedProjectName, saveProjectWithName]);

  const saveProjectAs = useCallback(() => {
    const requestedName = window.prompt("Save project as", normalizedProjectName);
    if (requestedName === null) return;
    saveProjectWithName(requestedName);
  }, [normalizedProjectName, saveProjectWithName]);

  const requestOpen = useCallback(() => {
    if (!confirmDiscard()) return;
    fileInputRef.current?.click();
  }, [confirmDiscard]);

  const openProjectFile = useCallback(async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 1_000_000) {
      setFileNotice({
        text: "That project file is unexpectedly large and was not opened.",
        tone: "error",
      });
      return;
    }

    try {
      const result = parseProjectDocument(await file.text());
      if (!result.ok) {
        setFileNotice({ text: result.error, tone: "error" });
        return;
      }
      const openedDocument = projectToDocument(result.project);
      dispatch({ type: "load", next: openedDocument });
      setDrawingPlaneFromBuilding(openedDocument.building);
      setProjectName(result.project.name);
      setSavedProjectName(result.project.name);
      setProjectCreatedAt(result.project.createdAt);
      setSelectionForDocument(openedDocument, firstSelectableObjectId(openedDocument));
      setCopyMode(false);
      setMoveMode(false);
      setRotateMode(false);
      setScaleMode(false);
      setBoundaryMode(false);
      setMirrorMode(false);
      setOffsetMode(false);
      setChamferMode(false);
      setChamferStage(0);
      setChamferDistancePrompt(0);
      setFilletMode(false);
      setFilletStage(0);
      setStretchMode(false);
      setStretchTargets([]);
      setArcMode(false);
      setCircleMode(false);
      setLineMode(false);
      setWallMode(false);
      setFoundationWallMode(false);
      setPolylineMode(false);
      setRectangleMode(false);
      continuableEntityHistoryRef.current = [];
      setRecoveredAt(null);
      setFileNotice({ text: `Opened ${file.name}.`, tone: "success" });
    } catch {
      setFileNotice({
        text: "Model Builder could not read that project file.",
        tone: "error",
      });
    }
  }, [setDrawingPlaneFromBuilding, setSelectionForDocument]);

  const discardRecoveredDraft = useCallback(() => {
    if (!window.confirm("Discard the recovered draft and start a blank new plan?")) {
      return;
    }
    window.localStorage.removeItem(PROJECT_RECOVERY_STORAGE_KEY);
    const now = new Date().toISOString();
    dispatch({ type: "load", next: NEW_PROJECT_DOCUMENT });
    setDrawingPlaneFromBuilding(NEW_PROJECT_DOCUMENT.building);
    setProjectName("Untitled Model");
    setSavedProjectName("Untitled Model");
    setProjectCreatedAt(now);
    setSelectionForDocument(NEW_PROJECT_DOCUMENT, null);
    setViewTarget(VIEW_PRESETS.top);
    setFitViewSignal((value) => value + 1);
    setCopyMode(false);
    setMoveMode(false);
    setRotateMode(false);
    setScaleMode(false);
    setMirrorMode(false);
    setOffsetMode(false);
    setBoundaryMode(false);
    setChamferMode(false);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletMode(false);
    setFilletStage(0);
    setStretchMode(false);
    setStretchTargets([]);
    setArcMode(false);
    setCircleMode(false);
    setLineMode(false);
    setWallMode(false);
    setFoundationWallMode(false);
    setPolylineMode(false);
    setRectangleMode(false);
    continuableEntityHistoryRef.current = [];
    setRecoveredAt(null);
    setFileNotice({ text: "Discarded the recovered draft.", tone: "info" });
  }, [setDrawingPlaneFromBuilding, setSelectionForDocument]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(PROJECT_RECOVERY_STORAGE_KEY);
        if (stored) {
          const result = parseRecoverySnapshot(stored);
          if (result.ok) {
            const { snapshot } = result;
            dispatch({
              type: "recover",
              next: projectToDocument(snapshot.currentProject),
              saved: projectToDocument(snapshot.savedProject),
            });
            setProjectName(snapshot.currentProject.name);
            setSavedProjectName(snapshot.savedProject.name);
            setProjectCreatedAt(snapshot.currentProject.createdAt);
            const recoveredDocument = projectToDocument(snapshot.currentProject);
            setDrawingPlaneFromBuilding(recoveredDocument.building);
            setSelectionForDocument(recoveredDocument, firstSelectableObjectId(recoveredDocument));
            setCopyMode(false);
            setMoveMode(false);
            setRotateMode(false);
            setScaleMode(false);
            setMirrorMode(false);
            setOffsetMode(false);
            setBoundaryMode(false);
            setChamferMode(false);
            setChamferStage(0);
            setChamferDistancePrompt(0);
            setFilletMode(false);
            setFilletStage(0);
            setArcMode(false);
            setCircleMode(false);
            setLineMode(false);
            setWallMode(false);
            setFoundationWallMode(false);
            setPolylineMode(false);
            setRectangleMode(false);
            continuableEntityHistoryRef.current = [];
            setRecoveredAt(new Date(snapshot.autosavedAt).toLocaleString());
          } else {
            window.localStorage.removeItem(PROJECT_RECOVERY_STORAGE_KEY);
            setFileNotice({
              text: "A damaged local recovery draft was removed. Saved project files were not affected.",
              tone: "error",
            });
          }
        }
      } catch {
        recoveryErrorReportedRef.current = true;
        setFileNotice({
          text: "Local recovery is unavailable in this browser session.",
          tone: "error",
        });
      } finally {
        setRecoveryReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [setDrawingPlaneFromBuilding, setSelectionForDocument]);

  useEffect(() => {
    if (!recoveryReady) return;
    const timeout = window.setTimeout(() => {
      if (!persistRecovery() && !recoveryErrorReportedRef.current) {
        recoveryErrorReportedRef.current = true;
        setFileNotice({
          text: "Model Builder could not update the local recovery draft. Use Save to protect this work.",
          tone: "error",
        });
      }
    }, RECOVERY_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [persistRecovery, recoveryReady]);

  useEffect(() => {
    if (!recoveryReady) return;
    const flushRecovery = () => persistRecovery();
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") persistRecovery();
    };
    window.addEventListener("pagehide", flushRecovery);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.removeEventListener("pagehide", flushRecovery);
      document.removeEventListener("visibilitychange", flushWhenHidden);
    };
  }, [persistRecovery, recoveryReady]);

  useEffect(() => {
    if (!copyMode && !extendMode && !mirrorMode && !moveMode && !offsetMode && !rotateMode && !scaleMode && !stretchMode && !trimMode) return;
    const finishToolWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (copyMode) {
        setCopyMode(false);
        setFileNotice({ text: "Copy mode finished.", tone: "info" });
      }
      setMoveMode(false);
      if (mirrorMode) {
        setMirrorMode(false);
        setFileNotice({ text: "Mirror canceled.", tone: "info" });
      }
      if (offsetMode) {
        setOffsetMode(false);
        setFileNotice({ text: "Offset canceled.", tone: "info" });
      }
      if (trimMode || extendMode) {
        setTrimMode(false);
        setExtendMode(false);
        setFileNotice({ text: `${trimMode ? "Trim" : "Extend"} canceled.`, tone: "info" });
      }
      if (rotateMode) {
        setRotateMode(false);
        setFileNotice({ text: "Rotate mode finished.", tone: "info" });
      }
      if (scaleMode) {
        setScaleMode(false);
        setFileNotice({ text: "Scale mode finished.", tone: "info" });
      }
      if (stretchMode) {
        setStretchMode(false);
        setStretchTargets([]);
        setFileNotice({ text: "Stretch canceled.", tone: "info" });
      }
    };
    window.addEventListener("keydown", finishToolWithEscape);
    return () => window.removeEventListener("keydown", finishToolWithEscape);
  }, [copyMode, extendMode, mirrorMode, moveMode, offsetMode, rotateMode, scaleMode, stretchMode, trimMode]);

  useEffect(() => {
    const handleHistoryShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        newProject();
        return;
      }
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (event.shiftKey) saveProjectAs(); else saveProject();
        return;
      }
      if (event.key.toLowerCase() === "o") {
        event.preventDefault();
        requestOpen();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (lineMode && !event.shiftKey) {
          lineCommandIdRef.current += 1;
          setLineCommand({ id: lineCommandIdRef.current, kind: "undo" });
          return;
        }
        if (polylineMode && !event.shiftKey) {
          polylineCommandIdRef.current += 1;
          setPolylineCommand({ id: polylineCommandIdRef.current, kind: "undo" });
          return;
        }
        if (event.shiftKey) redo(); else undo();
      } else if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleHistoryShortcut);
    return () => window.removeEventListener("keydown", handleHistoryShortcut);
  }, [lineMode, newProject, polylineMode, redo, requestOpen, saveProject, saveProjectAs, undo]);

  useEffect(() => {
    const warnBeforeClose = (event: BeforeUnloadEvent) => {
      persistRecovery();
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeClose);
    return () => window.removeEventListener("beforeunload", warnBeforeClose);
  }, [isDirty, persistRecovery]);

  useEffect(() => {
    if (!fileNotice) return;
    const timeout = window.setTimeout(() => setFileNotice(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [fileNotice]);

  const ribbonTabs: RibbonTab[] = ["Home", "Draw", "Model", "Annotate", "View", "Manage"];
  const commandText = dragStatus
    ? dragStatus.kind === "object"
      ? `Move ${dragStatus.axis?.toUpperCase()} ${formatSignedArchitectural(dragStatus.distance)}${dragStatus.snapped ? " — object face snap" : ""}`
      : dragStatus.kind === "copy"
        ? `Copy ${dragStatus.axis?.toUpperCase()} ${formatSignedArchitectural(dragStatus.distance)}${dragStatus.snapped ? " — object face snap" : ""}`
        : dragStatus.kind === "plan-move"
          ? `Move on work plane — ${(["x", "y"] as AxisKey[]).map((axis) => `${axis.toUpperCase()} ${formatSignedArchitectural(dragStatus.axisDistances?.[axis] ?? 0)}`).join(" · ")}${dragStatus.snapped ? " — object face snap" : ""}`
        : dragStatus.kind === "entry"
          ? `Exact ${dragStatus.axis?.toUpperCase() ?? ""} face distance — type a signed architectural value; Enter applies, Escape cancels.`
        : dragStatus.kind === "grip"
          ? `Resize ${dragStatus.gripKind ?? "box"} grip — ${(["x", "y", "z"] as AxisKey[]).filter((axis) => dragStatus.axisDistances?.[axis] !== undefined).map((axis) => `${axis.toUpperCase()} ${formatSignedArchitectural(dragStatus.axisDistances?.[axis] ?? 0)}`).join(" · ")}`
        : dragStatus.kind === "mirror"
          ? `Mirror axis — ${formatArchitectural(dragStatus.distance)} at ${dragStatus.angle ?? 0}°${dragStatus.snapped ? " — object snap" : ""}.`
        : dragStatus.kind === "offset"
          ? `Offset ${formatArchitectural(dragStatus.distance)} — ${dragStatus.valid ? "click this side to create" : "this side is not valid"}.`
        : dragStatus.kind === "boundary"
          ? `Boundary — ${dragStatus.valid ? "click inside to create the highlighted closed Polyline" : "no closed visible area at this elevation"}.`
        : dragStatus.kind === "break"
          ? `${breakMode === "break" ? "Break" : "Break at Point"} — ${dragStatus.valid ? "click to accept this point" : "pick directly on the selected curve"}.`
        : dragStatus.kind === "chamfer"
          ? `Chamfer ${formatArchitectural(chamferFirstDistance)} × ${formatArchitectural(chamferSecondDistance)} — ${dragStatus.valid ? "select the highlighted Line" : "this pick cannot produce the Chamfer"}.`
        : dragStatus.kind === "fillet"
          ? `Fillet ${formatArchitectural(dragStatus.distance)} — ${dragStatus.valid ? "select the highlighted Line" : "this pick cannot produce the Fillet"}.`
        : dragStatus.kind === "lengthen"
          ? `Lengthen ${lengthenMethod} — ${dragStatus.valid ? "click to apply at this endpoint" : "this value or cursor position is not valid"}.`
        : dragStatus.kind === "trim" || dragStatus.kind === "extend"
          ? `${dragStatus.kind === "trim" ? "Trim" : "Extend"} — ${dragStatus.valid ? "click to apply" : "no valid visible boundary here"}.`
        : dragStatus.kind === "stretch"
          ? `Stretch — ${formatArchitectural(dragStatus.distance)} at ${dragStatus.angle ?? 0}°${dragStatus.snapped ? " — object snap" : ""}.`
        : dragStatus.kind === "rotate"
          ? `Rotate Z ${dragStatus.angle ?? 0}° — 15° snap; hold Shift for 1°.`
        : dragStatus.kind === "scale"
          ? `Scale ${dragStatus.factor ?? 1}× — 0.1 snap; hold Shift for 0.01 precision.`
        : dragStatus.kind === "line" || dragStatus.kind === "line-grip"
          ? `${dragStatus.kind === "line" ? foundationWallMode ? "Draw Foundation Wall reference line" : wallMode ? "Draw wall reference line" : "Draw line" : "Edit line"} — ${formatArchitectural(dragStatus.distance)} at ${dragStatus.angle ?? 0}°${dragStatus.snapped ? " — object snap" : dragStatus.polarAngle !== null && dragStatus.polarAngle !== undefined ? ` — polar ${dragStatus.polarAngle}°` : " — 1/16 inch grid"}.`
        : dragStatus.kind === "polyline" || dragStatus.kind === "polyline-grip" || dragStatus.kind === "rectangle"
          ? `${dragStatus.kind === "rectangle" ? "Draw rectangle" : dragStatus.kind === "polyline-grip" ? "Edit polyline vertex" : "Draw polyline"} — ${formatArchitectural(dragStatus.distance)}${dragStatus.angle !== undefined ? ` at ${dragStatus.angle}°` : ""}${dragStatus.snapped ? " — object snap" : dragStatus.polarAngle !== null && dragStatus.polarAngle !== undefined ? ` — polar ${dragStatus.polarAngle}°` : " — 1/16 inch grid"}.`
        : dragStatus.kind === "circle" || dragStatus.kind === "circle-grip"
          ? `${dragStatus.kind === "circle" ? "Draw" : "Edit"} circle — radius ${formatArchitectural(dragStatus.distance)}${dragStatus.snapped ? " — object snap" : " — 1/16 inch grid"}.`
        : dragStatus.kind === "arc" || dragStatus.kind === "arc-grip"
          ? `${dragStatus.kind === "arc" ? "Draw" : "Edit"} Arc — ${formatArchitectural(dragStatus.distance)}${dragStatus.snapped ? " — object snap" : " — 1/16 inch grid"}.`
        : `${dragStatus.distance < 0 ? "Push" : "Pull"} ${formatArchitectural(Math.abs(dragStatus.distance))}`
    : copyMode
      ? `COPY active — drag an XYZ axis arrow or enter an exact offset. Escape finishes.`
    : mirrorMode
      ? `MIRROR active — ${dragStatus ? "specify the second axis point" : "specify the first axis point"}. Source entities will be ${mirrorKeepSource ? "kept" : "replaced"}.`
    : offsetMode
      ? `OFFSET active — distance ${formatArchitectural(offsetDistance)}. Click the side to offset; source will be ${offsetKeepSource ? "kept" : "replaced"}.`
    : boundaryMode
      ? `BOUNDARY active — click inside a closed visible area at ${formatSignedArchitectural(cadDraftingSettings.activeElevation)}.`
    : breakMode
      ? `${breakMode === "break" ? "BREAK" : "BREAK AT POINT"} active — ${breakStage === 0 ? "select a native curve" : breakStage === 1 ? "select the break point" : "select the second point; the interval between points will be removed"}.`
    : chamferMode
      ? `CHAMFER active — ${formatArchitectural(chamferFirstDistance)} × ${formatArchitectural(chamferSecondDistance)}. ${chamferDistancePrompt === 1 ? "Enter the first distance." : chamferDistancePrompt === 2 ? "Enter the second distance." : `Select the ${chamferStage === 0 ? "first" : "second"} Line near the side to keep.`}`
    : filletMode
      ? `FILLET active — radius ${formatArchitectural(filletRadius)}. Select the ${filletStage === 0 ? "first" : "second"} Line near the side to keep.`
    : lengthenMode
      ? `LENGTHEN · ${lengthenMethod.toUpperCase()} active — pick near the endpoint to change${lengthenMethod === "dynamic" ? ", then click its new position" : ""}.`
    : trimMode
      ? "TRIM active — click the portion of the selected entity to remove. Other visible 2D entities are boundaries."
    : extendMode
      ? "EXTEND active — click near the selected entity's open endpoint. Other visible 2D entities are boundaries."
    : stretchMode
      ? stretchTargets.length
        ? "STRETCH active — specify a base point, then a target point; exact X/Y displacement is available in Properties."
        : "STRETCH active — drag a right-to-left crossing window across endpoints or vertices."
    : rotateMode
      ? `ROTATE Z active — drag the gold ring around the selected ${rotationBaseKey === "center" ? "center" : "base point"}. Escape finishes.`
    : scaleMode
      ? `SCALE active — drag the green square from the selected ${scaleBaseKey === "center" ? "center" : "base point"}. Escape finishes.`
    : arcMode
      ? `ARC · ${arcMethodDefinition(arcMethod).label.toUpperCase()} — specify the ${arcPointStage(arcMethod, arcPoints.length)}.`
    : circleMode
      ? `CIRCLE · ${circleMethodDefinition(circleMethod).label.toUpperCase()} — specify the ${circlePointStage(circleMethod, circlePoints.length)}.`
    : lineMode
      ? lineAnchor
        ? `${foundationWallMode ? "FOUNDATION WALL" : wallMode ? "WALL" : "LINE"} — next point or distance · U undoes · C closes · Escape exits.`
        : foundationWallMode ? `FOUNDATION WALL — specify the first concrete Main-layer reference point on ${activeStory.name}.` : wallMode ? `WALL — specify the first Main-layer reference point on ${activeStory.name}.` : "LINE — specify first point by click, X,Y, or X,Y,Z. Z defaults to 0."
    : polylineMode
      ? polylineAnchor
        ? `POLYLINE · ${polylineSegmentMode.toUpperCase()} · W ${formatArchitectural(polylineWidth)} — ${polylineSegmentMode === "arc" ? "through-point, then endpoint" : "next vertex or distance"} · A/L switches · U undoes · C closes.`
        : `POLYLINE · ${polylineSegmentMode.toUpperCase()} · W ${formatArchitectural(polylineWidth)} — specify first vertex by click, X,Y, or X,Y,Z.`
    : rectangleMode
      ? rectangleAnchor
        ? rectangleMethod === "corners"
          ? `RECTANGLE · CORNERS · ${rectangleRotation}° — specify opposite corner, @relative corner, or width × height.`
          : rectangleMethod === "dimensions"
            ? `RECTANGLE · DIMENSIONS · ${formatArchitectural(rectangleWidthDimension)} × ${formatArchitectural(rectangleHeight)} — click to choose the placement quadrant.`
            : `RECTANGLE · AREA · ${(rectangleArea / 144).toLocaleString(undefined, { maximumFractionDigits: 2 })} sq ft — click to choose the placement quadrant.`
        : `RECTANGLE · ${rectangleMethod.toUpperCase()} — specify first corner by click, X,Y, or X,Y,Z.`
    : selectedPolyline
      ? selectedPolyline.shape === "rectangle" && rectangleSupportsConstrainedGrips(selectedPolyline)
        ? `${selectedPolyline.name} selected — corner and edge grips resize; the center grip moves it.`
        : `${selectedPolyline.name} selected — drag blue vertex grips to reshape its closed polyline geometry.`
    : selectedLine
      ? `${selectedLine.name} selected — endpoint grips reshape; midpoint grip moves the line.`
    : selectedCircle
      ? `${selectedCircle.name} selected — the center grip moves it; quadrant grips change the radius.`
    : selectedArc
      ? `${selectedArc.name} selected — endpoint and midpoint grips reshape it; the center grip moves it.`
    : selectedObjectIds.length > 0 && !selectionIsEditable
      ? `${selectedGroup?.name ?? selectedBox?.name ?? "Selection"} is locked — unlock it to edit.`
    : selectedObjectIds.length > 1
      ? selectedGroup
        ? `${selectedGroup.name} selected — ${selectedObjectIds.length} objects move and copy together.`
        : `${selectedObjectIds.length} objects selected — ${selectedBox?.name ?? "last selected"} is the alignment anchor.`
    : selectedFace
      ? `${selectedBox?.name}: ${selectedFace.label} selected — drag or enter an exact distance.`
      : selectedBox
        ? moveMode
          ? `${selectedBox.name} selected — drag an XYZ arrow to move along one axis.`
          : `${selectedBox.name} selected — center grip moves on X/Y; face, edge, and corner grips resize.`
        : "Ready — select an object; Shift-click builds a selection set, or start Line from Home.";
  const activeDrawingAnchor = arcMode ? arcPoints.at(-1) ?? null : circleMode ? circlePoints.at(-1) ?? null : lineMode ? lineAnchor : polylineMode ? polylineAnchor : rectangleAnchor;
  const activeDrawingTitle = arcMode ? `Arc · ${arcMethodDefinition(arcMethod).label}` : circleMode ? `Circle · ${circleMethodDefinition(circleMethod).label}` : lineMode ? foundationWallMode ? "Foundation Wall" : wallMode ? "Wall" : "Line" : polylineMode ? `Polyline · ${polylineSegmentMode === "arc" ? "Arc" : "Line"}` : "Rectangle";
  const activeDrawingMeta = activeDrawingAnchor
    ? arcMode ? arcPointStage(arcMethod, arcPoints.length) : circleMode ? circlePointStage(circleMethod, circlePoints.length) : lineMode ? "Next point" : polylineMode ? polylineSegmentMode === "arc" ? "Through-point, then endpoint" : "Next vertex" : "Opposite corner"
    : arcMode ? arcPointStage(arcMethod, arcPoints.length) : circleMode ? circlePointStage(circleMethod, circlePoints.length) : lineMode ? "First point" : polylineMode ? "First vertex" : "First corner";
  const activeDrawingNote = arcMode
    ? `${arcMethodDefinition(arcMethod).description}. Exact and @relative coordinates are accepted. Angle methods accept degrees; length and radius methods accept architectural dimensions.${arcMethod === "continue" ? ` Tangency continues from ${arcContinueSeed?.source ?? "the preceding entity"}.` : ""}`
    : circleMode
    ? `${circleMethodDefinition(circleMethod).description}. Exact and @relative coordinates are accepted. Plain dimensions follow the pointer for point-defined methods. All construction points stay on one elevation plane.`
    : lineMode
    ? foundationWallMode ? `Draw the exterior face of the concrete Main layer. New Foundation Walls use ${activeFoundationWallType.name}; concrete height, footing, and sill plates follow that saved type.` : wallMode ? `Draw the exterior face of the Main layer with Line-grade snaps and exact input. The exterior defaults left of Start → End. New walls use ${editor.present.building.wallTypes.find((wallType) => wallType.id === editor.present.building.activeWallTypeId)?.name ?? "the active wall type"} and follow ${activeStory.name} rough floor and ceiling.` : "Use the command input below. A plain distance follows the cursor. Exact and @relative points are accepted. U undoes the previous segment; C closes the chain."
    : polylineMode
      ? "Line mode adds straight segments. Arc mode uses a through-point and endpoint to store a true curved segment. A/L switches modes; WIDTH plus a dimension sets constant width. U undoes, C closes, and Enter finishes open."
      : `Specify two corners by click or exact coordinates. After the first corner, use @X,Y or enter dimensions such as 12' x 8'; the cursor chooses the quadrant.`;

  const activeStoryCalculation = calculateStoryElevations(editor.present.building).find((calculation) => calculation.storyId === activeStory.id);
  const runTopMenuCommand = (command: () => void) => {
    setTopMenu(null);
    command();
  };

  return (
    <main className={`app-shell theme-${interfaceTheme}`}>
      <input
        ref={fileInputRef}
        className="project-file-input"
        type="file"
        accept=".mbproj,application/json"
        onChange={openProjectFile}
        tabIndex={-1}
        aria-hidden="true"
      />
      <header className="appbar">
        <button className="program-button" type="button" onClick={() => setTopMenu((current) => current === "program" ? null : "program")} aria-label="Program menu" aria-haspopup="menu" aria-expanded={topMenu === "program"} title="Program menu">
          <DraftCubeIcon />
        </button>
        <nav className="quick-access" aria-label="Quick access">
          <button type="button" onClick={newProject} title="New Plan" aria-label="New Plan">＋</button>
          <button type="button" onClick={requestOpen} title="Open (Ctrl+O)" aria-label="Open project">▱</button>
          <button type="button" onClick={saveProject} title="Save (Ctrl+S)" aria-label="Save project">▣</button>
          <button type="button" onClick={saveProjectAs} title="Save As" aria-label="Save project as">▣<sup>+</sup></button>
          <span className="quick-separator" />
          <button type="button" onClick={undo} disabled={!editor.past.length} title="Undo (Ctrl+Z)" aria-label="Undo">↶</button>
          <button type="button" onClick={redo} disabled={!editor.future.length} title="Redo (Ctrl+Y)" aria-label="Redo">↷</button>
        </nav>
        <label className="project-name-shell">
          <span className="sr-only">Project name</span>
          <input
            value={projectName}
            maxLength={120}
            onChange={(event) => setProjectName(event.target.value)}
            onBlur={() => setProjectName(normalizedProjectName)}
            aria-label="Project name"
            spellCheck={false}
          />
          {isDirty ? <span className="dirty-mark" title="Unsaved changes">•</span> : null}
        </label>
        <span className="workspace-name">2D + 3D Modeling</span>
        <button
          className="theme-toggle"
          type="button"
          onClick={() => setStoredInterfaceTheme(interfaceTheme === "light" ? "dark" : "light")}
          title={`Switch to ${interfaceTheme === "light" ? "dark" : "light"} mode`}
          aria-label={`Switch to ${interfaceTheme === "light" ? "dark" : "light"} mode`}
          aria-pressed={interfaceTheme === "dark"}
        >
          <span aria-hidden="true">{interfaceTheme === "light" ? "☾" : "☀"}</span>
          <small>{interfaceTheme === "light" ? "Light" : "Dark"}</small>
        </button>
        <button className="help-button" type="button" title="Help" aria-label="Help">?</button>
        {topMenu === "program" ? (
          <div className="program-menu" role="menu" aria-label="Program menu">
            <header><DraftCubeIcon /><span><strong>Project</strong><small>File and application commands</small></span></header>
            <div className="program-menu-primary">
              <button type="button" role="menuitem" onClick={() => runTopMenuCommand(newProject)}><b>＋</b><span><strong>New Plan</strong><small>Start with a blank Top view</small></span></button>
              <button type="button" role="menuitem" onClick={() => runTopMenuCommand(requestOpen)}><b>▱</b><span><strong>Open</strong><small>Open an .mbproj project</small></span></button>
              <button type="button" role="menuitem" onClick={() => runTopMenuCommand(saveProject)}><b>▣</b><span><strong>Save</strong><small>Save the current project</small></span></button>
              <button type="button" role="menuitem" onClick={() => runTopMenuCommand(saveProjectAs)}><b>▣</b><span><strong>Save As</strong><small>Save with a different project name</small></span></button>
            </div>
            <footer><span>{normalizedProjectName}</span><small>{isDirty ? "Unsaved changes" : "Current project is saved"}</small></footer>
          </div>
        ) : null}
      </header>

      <nav className="menu-strip" aria-label="Application menus">
        {(["File", "Edit", "View", "Window", "Tools", "Help"] as const).map((label) => {
          const menu = label.toLowerCase() as "edit" | "file" | "help" | "tools" | "view" | "window";
          return (
            <div className="menu-bar-item" key={label}>
              <button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={topMenu === menu} className={topMenu === menu ? "is-open" : ""} onClick={() => setTopMenu((current) => current === menu ? null : menu)}>{label}</button>
              {topMenu === menu ? (
                <div className="application-menu" role="menu" aria-label={`${label} menu`}>
                  {menu === "file" ? <><button type="button" role="menuitem" onClick={() => runTopMenuCommand(newProject)}><span>New Plan</span><kbd>Ctrl+N</kbd></button><button type="button" role="menuitem" onClick={() => runTopMenuCommand(requestOpen)}><span>Open…</span><kbd>Ctrl+O</kbd></button><hr /><button type="button" role="menuitem" onClick={() => runTopMenuCommand(saveProject)}><span>Save</span><kbd>Ctrl+S</kbd></button><button type="button" role="menuitem" onClick={() => runTopMenuCommand(saveProjectAs)}><span>Save As…</span><kbd>Ctrl+Shift+S</kbd></button></> : null}
                  {menu === "edit" ? <><button type="button" role="menuitem" disabled={!editor.past.length} onClick={() => runTopMenuCommand(undo)}><span>Undo</span><kbd>Ctrl+Z</kbd></button><button type="button" role="menuitem" disabled={!editor.future.length} onClick={() => runTopMenuCommand(redo)}><span>Redo</span><kbd>Ctrl+Y</kbd></button><hr /><button type="button" role="menuitem" disabled={!selectionCanModify} onClick={() => runTopMenuCommand(eraseSelection)}><span>Erase Selection</span><kbd>Delete</kbd></button></> : null}
                  {menu === "view" ? <><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => changeViewTarget(VIEW_PRESETS.top))}><span>Top View</span><kbd>2D · Home</kbd></button><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => changeViewTarget(VIEW_PRESETS.perspective))}><span>3D Perspective</span><kbd>3D</kbd></button><hr /><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setFitViewSignal((value) => value + 1))}><span>Fit View</span><kbd>F</kbd></button><hr /><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setStoredInterfaceTheme(interfaceTheme === "light" ? "dark" : "light"))}><span>Use {interfaceTheme === "light" ? "Dark" : "Light"} Interface</span><kbd>{interfaceTheme === "light" ? "☾" : "☀"}</kbd></button></> : null}
                  {menu === "window" ? <><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setExplorerTab("objects"))}><span>Model Explorer · Objects</span></button><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setExplorerTab("layers"))}><span>Model Explorer · Layers</span></button><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setExplorerTab("building"))}><span>Model Explorer · Building</span></button></> : null}
                  {menu === "tools" ? <><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setStoryManagerOpen(true))}><span>Plan Settings…</span></button><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setWallTypeManagerOpen(true))}><span>Wall Types…</span></button><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setOpeningTypeManagerOpen(true))}><span>Door &amp; Window Types…</span></button><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setFramingManagerOpen(true))}><span>Wall Framing Defaults…</span></button><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setRoomManagerOpen(true))}><span>Rooms…</span></button><hr /><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setExplorerTab("layers"))}><span>Layer Manager</span></button></> : null}
                  {menu === "help" ? <><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setFileNotice({ text: "Keyboard: Ctrl+O opens, Ctrl+S saves, Ctrl+Z undoes, Ctrl+Y redoes, and command aliases start drafting tools.", tone: "info" }))}><span>Keyboard Shortcuts</span></button><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setFileNotice({ text: "Precision residential 2D and 3D modeling workspace.", tone: "info" }))}><span>About This Workspace</span></button></> : null}
                </div>
              ) : null}
            </div>
          );
        })}
        <span className="menu-strip-context">PROJECT TOOLS</span>
      </nav>

      {topMenu ? <button type="button" className="menu-dismiss-layer" onClick={() => setTopMenu(null)} aria-label="Close application menu" /> : null}

      <nav className="ribbon-tabs" aria-label="Tool categories">
        {ribbonTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeRibbonTab === tab ? "is-active" : ""}
            onClick={() => setActiveRibbonTab(tab)}
            aria-pressed={activeRibbonTab === tab}
          >
            {tab}
          </button>
        ))}
      </nav>

      <section className={`ribbon ribbon-${activeRibbonTab.toLowerCase()}`} aria-label={`${activeRibbonTab} tools`}>
        {activeRibbonTab === "Home" ? (
          <>
            <div className="ribbon-group home-project-group">
              <div className="ribbon-tools compact-tools home-tool-grid">
                <button type="button" onClick={newProject} title="Start a blank plan"><b>＋</b><span>New Plan</span></button>
                <button type="button" onClick={requestOpen} title="Open project (Ctrl+O)"><b>▱</b><span>Open</span></button>
                <button type="button" onClick={saveProject} title="Save project (Ctrl+S)"><b>▣</b><span>Save</span></button>
              </div>
              <small>Project</small>
            </div>
            <div className="ribbon-group home-architecture-group">
              <div className="ribbon-tools compact-tools home-tool-grid">
                <button type="button" onClick={() => setStoryManagerOpen(true)} title="Set Stories, floor depth, finishes, and ceiling height"><b>≋</b><span>Plan Setup</span></button>
                <button className={lineMode && wallMode ? "primary-tool is-engaged" : "primary-tool"} type="button" onClick={lineMode && wallMode ? finishLineMode : activateWallMode} title={`Draw Walls using ${activeWallType.name}`}><b>▥</b><span>{lineMode && wallMode ? "Finish Wall" : "Walls"}</span></button>
                <button className={lineMode && foundationWallMode ? "primary-tool is-engaged" : "primary-tool"} type="button" onClick={lineMode && foundationWallMode ? finishLineMode : activateFoundationWallMode} title={`Draw Foundation Walls using ${activeFoundationWallType.name}`}><b>▰</b><span>{lineMode && foundationWallMode ? "Finish Foundation" : "Foundation Walls"}</span></button>
                <button type="button" onClick={() => setRoomManagerOpen(true)} title="Detect enclosed Rooms and manage overrides"><b>▦</b><span>Rooms</span></button>
              </div>
              <small>Building workflow</small>
            </div>
            <div className="ribbon-group home-create-group">
              <div className="ribbon-tools compact-tools home-tool-grid">
                <button className={lineMode && !wallMode && !foundationWallMode ? "primary-tool is-engaged" : "primary-tool"} type="button" onClick={lineMode && !wallMode && !foundationWallMode ? finishLineMode : activateLineMode} title="Draw exact 2D or 3D line segments"><b>╱</b><span>{lineMode && !wallMode && !foundationWallMode ? "Finish Line" : "Line"}</span></button>
                <button className={polylineMode ? "primary-tool is-engaged" : "primary-tool"} type="button" onClick={polylineMode ? finishPolylineMode : activatePolylineMode} title="Draw one connected polyline entity"><b>⌁</b><span>Polyline</span></button>
                <button className={rectangleMode ? "primary-tool is-engaged" : "primary-tool"} type="button" onClick={rectangleMode ? finishRectangleMode : activateRectangleMode} title="Draw a closed rectangular polyline"><b>▭</b><span>Rectangle</span></button>
                <button className={circleMode ? "primary-tool is-engaged" : "primary-tool"} type="button" onClick={() => circleMode ? finishCircleMode() : activateCircleMode()} title={`Draw Circle: ${circleMethodDefinition(circleMethod).label}`}><b>○</b><span>Circle</span></button>
                <button className={arcMode ? "primary-tool is-engaged" : "primary-tool"} type="button" onClick={() => arcMode ? finishArcMode() : activateArcMode()} title={`Draw Arc: ${arcMethodDefinition(arcMethod).label}`}><b>⌒</b><span>Arc</span></button>
                <button className={boundaryMode ? "primary-tool is-engaged" : "primary-tool"} type="button" onClick={boundaryMode ? () => finishBoundaryMode(true) : activateBoundaryMode} title="Create a closed Polyline from a visible enclosed area"><b>◇</b><span>{boundaryMode ? "Cancel Boundary" : "Boundary"}</span></button>
                <button className="primary-tool" type="button" onClick={addBox} title="Add a parametric box"><b>▰</b><span>Box</span></button>
              </div>
              <small>Create</small>
            </div>
            <div className="ribbon-group home-modify-group">
              <div className="ribbon-tools compact-tools home-tool-grid">
                <button type="button" className={!moveMode && !copyMode && !boundaryMode && !breakMode && !chamferMode && !extendMode && !filletMode && !lengthenMode && !mirrorMode && !offsetMode && !rotateMode && !scaleMode && !stretchMode && !trimMode && !arcMode && !circleMode && !lineMode && !polylineMode && !rectangleMode ? "is-engaged" : ""} onClick={activateSelectMode}><b>↖</b><span>Select</span></button>
                <button type="button" className={moveMode ? "is-engaged" : ""} onClick={activateMoveMode} disabled={!selectionCanModify} title="Move selected entities from a base point to a target point"><b>✣</b><span>Move</span></button>
                <button type="button" className={rotateMode ? "is-engaged" : ""} onClick={rotateMode ? finishRotateMode : activateRotateMode} disabled={!selectionCanModify} title="Rotate selected entities around the vertical Z axis"><b>↻</b><span>{rotateMode ? "Finish Rotate" : "Rotate"}</span></button>
                <button type="button" className={scaleMode ? "is-engaged" : ""} onClick={scaleMode ? finishScaleMode : activateScaleMode} disabled={!selectionCanModify} title="Scale selected entities uniformly in plan"><b>↗</b><span>{scaleMode ? "Finish Scale" : "Scale"}</span></button>
                <button type="button" className={mirrorMode ? "is-engaged" : ""} onClick={mirrorMode ? finishMirrorMode : activateMirrorMode} disabled={!selectionCanModify} title="Mirror selected entities across a two-point axis"><b>◫</b><span>{mirrorMode ? "Cancel Mirror" : "Mirror"}</span></button>
                <button type="button" className={offsetMode ? "is-engaged" : ""} onClick={offsetMode ? finishOffsetMode : activateOffsetMode} disabled={!selectionCanOffset} title="Offset one selected 2D entity to a chosen side"><b>⫴</b><span>{offsetMode ? "Cancel Offset" : "Offset"}</span></button>
                <button type="button" className={trimMode ? "is-engaged" : ""} onClick={trimMode ? finishTrimExtendMode : activateTrimMode} disabled={!selectionCanTrim} title="Trim the clicked portion to visible 2D boundaries"><b>✂</b><span>{trimMode ? "Cancel Trim" : "Trim"}</span></button>
                <button type="button" className={extendMode ? "is-engaged" : ""} onClick={extendMode ? finishTrimExtendMode : activateExtendMode} disabled={!selectionCanExtend} title="Extend the nearest open endpoint to a visible boundary"><b>↦</b><span>{extendMode ? "Cancel Extend" : "Extend"}</span></button>
                <button type="button" className={breakMode === "break" ? "is-engaged" : ""} onClick={() => breakMode === "break" ? finishBreakMode(true) : activateBreakMode("break")} title="Remove the portion between two points on a native curve"><b>⫯</b><span>{breakMode === "break" ? "Cancel Break" : "Break"}</span></button>
                <button type="button" className={breakMode === "break-at-point" ? "is-engaged" : ""} onClick={() => breakMode === "break-at-point" ? finishBreakMode(true) : activateBreakMode("break-at-point")} title="Split an open native curve at one point"><b>⋮</b><span>{breakMode === "break-at-point" ? "Cancel Point" : "Break Point"}</span></button>
                <button type="button" onClick={joinSelection} disabled={!selectionCanJoin} title="Join endpoint-connected Lines, Arcs, and open Polylines into one native curve"><b>⌇</b><span>Join</span></button>
                <button type="button" onClick={explodeSelection} disabled={!selectionCanExplode} title="Explode selected Rectangles and Polylines into native Lines and Arcs"><b>✣</b><span>Explode</span></button>
                <button type="button" className={lengthenMode ? "is-engaged" : ""} onClick={lengthenMode ? () => finishLengthenMode(true) : activateLengthenMode} disabled={!selectionCanLengthen} title="Lengthen one Line, Arc, or open Polyline by Delta, Total, Percent, or Dynamic"><b>↤</b><span>{lengthenMode ? "Cancel Lengthen" : "Lengthen"}</span></button>
                <button type="button" className={chamferMode ? "is-engaged" : ""} onClick={chamferMode ? () => finishChamferMode(true) : activateChamferMode} title="Chamfer two Lines or every corner of one selected Polyline"><b>⌿</b><span>{chamferMode ? "Cancel Chamfer" : "Chamfer"}</span></button>
                <button type="button" className={filletMode ? "is-engaged" : ""} onClick={filletMode ? () => finishFilletMode(true) : activateFilletMode} title="Fillet Lines, Arcs, or every corner of one selected Polyline"><b>⌜</b><span>{filletMode ? "Cancel Fillet" : "Fillet"}</span></button>
                <button type="button" className={stretchMode ? "is-engaged" : ""} onClick={stretchMode ? () => finishStretchMode(true) : activateStretchMode} title="Stretch endpoints and vertices captured by a crossing window"><b>⇲</b><span>{stretchMode ? "Cancel Stretch" : "Stretch"}</span></button>
                <button type="button" className={copyMode ? "is-engaged" : ""} onClick={copyMode ? finishCopyMode : startCopyMode} disabled={!selectionCanModify}><b>⧉</b><span>{copyMode ? "Finish Copy" : "Copy"}</span></button>
                <button type="button" onClick={eraseSelection} disabled={!selectionCanModify}><b>×</b><span>Erase</span></button>
              </div>
              <small>Modify</small>
            </div>
            <div className="ribbon-group home-history-group">
              <div className="ribbon-tools compact-tools home-tool-grid">
                <button type="button" onClick={undo} disabled={!editor.past.length}><b>↶</b><span>Undo</span></button>
                <button type="button" onClick={redo} disabled={!editor.future.length}><b>↷</b><span>Redo</span></button>
              </div>
              <small>History</small>
            </div>
            <div className="ribbon-group home-organize-group">
              <div className="ribbon-tools compact-tools home-tool-grid">
                <button type="button" onClick={selectedGroup ? ungroupSelection : createSelectionGroup} disabled={selectedGroup ? !selectionIsEditable : !canCreateGroup}><b>{selectedGroup ? "⌁" : "⌘"}</b><span>{selectedGroup ? "Ungroup" : "Group"}</span></button>
                <button type="button" className={selectedArc?.locked || selectedCircle?.locked || selectedPolyline?.locked || selectedLine?.locked || allSelectedLocked ? "is-engaged" : ""} onClick={selectedArc ? toggleSelectedArcLock : selectedCircle ? toggleSelectedCircleLock : selectedPolyline ? toggleSelectedPolylineLock : selectedLine ? toggleSelectedLineLock : toggleSelectionLock} disabled={!selectedArc && !selectedCircle && !selectedPolyline && !selectedLine && !selectedObjectIds.length}><b>{selectedArc?.locked || selectedCircle?.locked || selectedPolyline?.locked || selectedLine?.locked || allSelectedLocked ? "◆" : "◇"}</b><span>{selectedArc?.locked || selectedCircle?.locked || selectedPolyline?.locked || selectedLine?.locked || allSelectedLocked ? "Unlock" : "Lock"}</span></button>
              </div>
              <small>Organize</small>
            </div>
          </>
        ) : null}
        {activeRibbonTab === "Draw" ? (
          <>
            <div className="ribbon-group">
              <div className="ribbon-tools"><button className={lineMode && !wallMode && !foundationWallMode ? "primary-tool is-engaged" : "primary-tool"} type="button" onClick={lineMode && !wallMode && !foundationWallMode ? finishLineMode : activateLineMode} title="Draw connected line segments"><b>╱</b><span>Line</span></button><button className={polylineMode ? "primary-tool is-engaged" : "primary-tool"} type="button" onClick={polylineMode ? finishPolylineMode : activatePolylineMode} title="Draw one connected polyline"><b>⌁</b><span>Polyline</span></button><button className={rectangleMode ? "primary-tool is-engaged" : "primary-tool"} type="button" onClick={rectangleMode ? finishRectangleMode : activateRectangleMode} title="Draw a closed rectangular polyline"><b>▭</b><span>Rectangle</span></button><button className={circleMode ? "primary-tool is-engaged" : "primary-tool"} type="button" onClick={() => circleMode ? finishCircleMode() : activateCircleMode()} title={`Draw Circle: ${circleMethodDefinition(circleMethod).label}`}><b>○</b><span>Circle</span></button><button className={arcMode ? "primary-tool is-engaged" : "primary-tool"} type="button" onClick={() => arcMode ? finishArcMode() : activateArcMode()} title={`Draw Arc: ${arcMethodDefinition(arcMethod).label}`}><b>⌒</b><span>Arc</span></button><button className={boundaryMode ? "primary-tool is-engaged" : "primary-tool"} type="button" onClick={boundaryMode ? () => finishBoundaryMode(true) : activateBoundaryMode} title="Create a closed Polyline from a visible enclosed area"><b>◇</b><span>Boundary</span></button></div>
              <small>Geometry</small>
            </div>
            <div className="ribbon-group arc-method-group rectangle-method-group">
              <label><span>Rectangle method</span><select value={rectangleMethod} onChange={(event) => setRectangleMethod(event.target.value as RectangleMethod)} aria-label="Rectangle construction method"><option value="corners">Corners</option><option value="dimensions">Dimensions</option><option value="area">Area</option></select></label>
              {rectangleMethod === "dimensions" ? <div className="ribbon-input-pair"><label><span>Length</span><input value={rectangleWidthDimensionDraft} onChange={(event) => setRectangleWidthDimensionDraft(event.target.value)} onBlur={() => applyRectangleDistance(rectangleWidthDimensionDraft, setRectangleWidthDimensionDraft, setRectangleWidthDimension, "Rectangle length")} onKeyDown={(event) => { if (event.key === "Enter") applyRectangleDistance(rectangleWidthDimensionDraft, setRectangleWidthDimensionDraft, setRectangleWidthDimension, "Rectangle length"); }} /></label><label><span>Width</span><input value={rectangleHeightDraft} onChange={(event) => setRectangleHeightDraft(event.target.value)} onBlur={() => applyRectangleDistance(rectangleHeightDraft, setRectangleHeightDraft, setRectangleHeight, "Rectangle width")} onKeyDown={(event) => { if (event.key === "Enter") applyRectangleDistance(rectangleHeightDraft, setRectangleHeightDraft, setRectangleHeight, "Rectangle width"); }} /></label></div> : null}
              {rectangleMethod === "area" ? <><label><span>Target area · sq ft</span><input value={rectangleAreaDraft} onChange={(event) => setRectangleAreaDraft(event.target.value)} onBlur={applyRectangleArea} onKeyDown={(event) => { if (event.key === "Enter") applyRectangleArea(); }} /></label><div className="ribbon-input-pair"><label><span>Fix</span><select value={rectangleAreaBasis} onChange={(event) => setRectangleAreaBasis(event.target.value as RectangleAreaBasis)}><option value="length">Length</option><option value="width">Width</option></select></label><label><span>Dimension</span><input value={rectangleFixedDimensionDraft} onChange={(event) => setRectangleFixedDimensionDraft(event.target.value)} onBlur={() => applyRectangleDistance(rectangleFixedDimensionDraft, setRectangleFixedDimensionDraft, setRectangleFixedDimension, "Fixed dimension")} onKeyDown={(event) => { if (event.key === "Enter") applyRectangleDistance(rectangleFixedDimensionDraft, setRectangleFixedDimensionDraft, setRectangleFixedDimension, "Fixed dimension"); }} /></label></div></> : null}
              <small>{rectangleMethod === "corners" ? "Pick two opposite corners" : rectangleMethod === "dimensions" ? "Cursor chooses the placement quadrant" : "Area calculates the unfixed side"}</small>
            </div>
            <div className="ribbon-group arc-method-group rectangle-method-group">
              <label><span>Corner style</span><select value={rectangleCornerStyle} onChange={(event) => setRectangleCornerStyle(event.target.value as RectangleCornerStyle)} aria-label="Rectangle corner style"><option value="sharp">Sharp</option><option value="chamfer">Chamfer</option><option value="fillet">Fillet</option></select></label>
              {rectangleCornerStyle === "chamfer" ? <div className="ribbon-input-pair"><label><span>Chamfer X</span><input value={rectangleChamferXDraft} onChange={(event) => setRectangleChamferXDraft(event.target.value)} onBlur={() => applyRectangleDistance(rectangleChamferXDraft, setRectangleChamferXDraft, setRectangleChamferX, "Chamfer X", true)} onKeyDown={(event) => { if (event.key === "Enter") applyRectangleDistance(rectangleChamferXDraft, setRectangleChamferXDraft, setRectangleChamferX, "Chamfer X", true); }} /></label><label><span>Chamfer Y</span><input value={rectangleChamferYDraft} onChange={(event) => setRectangleChamferYDraft(event.target.value)} onBlur={() => applyRectangleDistance(rectangleChamferYDraft, setRectangleChamferYDraft, setRectangleChamferY, "Chamfer Y", true)} onKeyDown={(event) => { if (event.key === "Enter") applyRectangleDistance(rectangleChamferYDraft, setRectangleChamferYDraft, setRectangleChamferY, "Chamfer Y", true); }} /></label></div> : null}
              {rectangleCornerStyle === "fillet" ? <label><span>Fillet radius</span><input value={rectangleFilletRadiusDraft} onChange={(event) => setRectangleFilletRadiusDraft(event.target.value)} onBlur={() => applyRectangleDistance(rectangleFilletRadiusDraft, setRectangleFilletRadiusDraft, setRectangleFilletRadius, "Fillet radius", true)} onKeyDown={(event) => { if (event.key === "Enter") applyRectangleDistance(rectangleFilletRadiusDraft, setRectangleFilletRadiusDraft, setRectangleFilletRadius, "Fillet radius", true); }} /></label> : null}
              <small>Chamfer and Fillet create editable polyline segments</small>
            </div>
            <div className="ribbon-group arc-method-group rectangle-method-group">
              <label><span>Rotation · degrees</span><input value={rectangleRotationDraft} onChange={(event) => setRectangleRotationDraft(event.target.value)} onBlur={applyRectangleRotation} onKeyDown={(event) => { if (event.key === "Enter") applyRectangleRotation(); }} /></label>
              <label><span>Constant width</span><input value={rectangleWidthDraft} onChange={(event) => setRectangleWidthDraft(event.target.value)} onBlur={() => applyRectangleDistance(rectangleWidthDraft, setRectangleWidthDraft, setRectangleWidth, "Rectangle width", true)} onKeyDown={(event) => { if (event.key === "Enter") applyRectangleDistance(rectangleWidthDraft, setRectangleWidthDraft, setRectangleWidth, "Rectangle width", true); }} /></label>
              <small>Rotation is measured counterclockwise from X</small>
            </div>
            <div className="ribbon-group arc-method-group">
              <label><span>Polyline segment</span><select value={polylineSegmentMode} onChange={(event) => setPolylineSegmentMode(event.target.value as PolylineSegmentMode)} aria-label="Polyline segment mode"><option value="line">Line</option><option value="arc">Arc · 3-Point</option></select></label>
              <label><span>Constant width</span><input value={polylineWidthDraft} onChange={(event) => setPolylineWidthDraft(event.target.value)} onBlur={applyPolylineWidth} onKeyDown={(event) => { if (event.key === "Enter") applyPolylineWidth(); }} aria-label="Polyline constant width" spellCheck={false} /></label>
              <small>A/L switches while drawing · WIDTH 6&quot; sets width</small>
            </div>
            <div className="ribbon-group arc-method-group">
              <label><span>Circle method</span><select value={circleMethod} onChange={(event) => activateCircleMode(event.target.value as CircleMethod)} aria-label="Circle construction method">{CIRCLE_METHODS.map((definition) => <option key={definition.method} value={definition.method}>{definition.label}</option>)}</select></label>
              <small>{circleMethodDefinition(circleMethod).description}</small>
            </div>
            <div className="ribbon-group arc-method-group">
              <label><span>Arc method</span><select value={arcMethod} onChange={(event) => activateArcMode(event.target.value as ArcMethod)} aria-label="Arc construction method">{ARC_METHODS.map((definition) => <option key={definition.method} value={definition.method}>{definition.label}</option>)}</select></label>
              <small>{arcMethodDefinition(arcMethod).description}</small>
            </div>
            <div className="ribbon-group planned-group"><div className="planned-tools"><span>Polygon</span></div><small>2D creation · planned</small></div>
            <div className="ribbon-group planned-group"><div className="planned-tools"><span>Offset</span><span>Trim</span><span>Extend</span></div><small>2D modify · planned</small></div>
          </>
        ) : null}
        {activeRibbonTab === "Model" ? (
          <>
            <div className="ribbon-group">
              <div className="ribbon-tools"><button className={lineMode && wallMode ? "primary-tool is-engaged" : "primary-tool"} type="button" onClick={lineMode && wallMode ? finishLineMode : activateWallMode} title="Draw layered walls on the active Story"><b>▥</b><span>{lineMode && wallMode ? "Finish Wall" : "Wall"}</span></button><button className={lineMode && foundationWallMode ? "primary-tool is-engaged" : "primary-tool"} type="button" onClick={lineMode && foundationWallMode ? finishLineMode : activateFoundationWallMode} title={`Draw concrete Foundation Walls using ${activeFoundationWallType.name}`}><b>▰</b><span>{lineMode && foundationWallMode ? "Finish Foundation" : "Foundation Wall"}</span></button><button className="primary-tool" type="button" onClick={addBox} title="Add a parametric box"><b>▰</b><span>Box</span></button></div>
              <small>Primitives</small>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-tools compact-tools">
                <button type="button" className={!moveMode && !copyMode && !boundaryMode && !breakMode && !chamferMode && !extendMode && !filletMode && !lengthenMode && !mirrorMode && !offsetMode && !rotateMode && !scaleMode && !stretchMode && !trimMode && !arcMode && !circleMode && !lineMode && !polylineMode && !rectangleMode ? "is-engaged" : ""} onClick={activateSelectMode}><b>↖</b><span>Select</span></button>
                <button type="button" className={moveMode ? "is-engaged" : ""} onClick={activateMoveMode} disabled={!selectionCanModify} title="Move selected entities from a base point to a target point"><b>✣</b><span>Move</span></button>
                <button type="button" className={rotateMode ? "is-engaged" : ""} onClick={rotateMode ? finishRotateMode : activateRotateMode} disabled={!selectionCanModify} title="Rotate selected entities around the vertical Z axis"><b>↻</b><span>{rotateMode ? "Finish Rotate" : "Rotate"}</span></button>
                <button type="button" className={scaleMode ? "is-engaged" : ""} onClick={scaleMode ? finishScaleMode : activateScaleMode} disabled={!selectionCanModify} title="Scale selected entities uniformly in plan"><b>↗</b><span>{scaleMode ? "Finish Scale" : "Scale"}</span></button>
                <button type="button" className={mirrorMode ? "is-engaged" : ""} onClick={mirrorMode ? finishMirrorMode : activateMirrorMode} disabled={!selectionCanModify} title="Mirror selected entities across a two-point axis"><b>◫</b><span>{mirrorMode ? "Cancel Mirror" : "Mirror"}</span></button>
                <button type="button" className={offsetMode ? "is-engaged" : ""} onClick={offsetMode ? finishOffsetMode : activateOffsetMode} disabled={!selectionCanOffset} title="Offset one selected 2D entity to a chosen side"><b>⫴</b><span>{offsetMode ? "Cancel Offset" : "Offset"}</span></button>
                <button type="button" className={trimMode ? "is-engaged" : ""} onClick={trimMode ? finishTrimExtendMode : activateTrimMode} disabled={!selectionCanTrim} title="Trim the clicked portion to visible 2D boundaries"><b>✂</b><span>{trimMode ? "Cancel Trim" : "Trim"}</span></button>
                <button type="button" className={extendMode ? "is-engaged" : ""} onClick={extendMode ? finishTrimExtendMode : activateExtendMode} disabled={!selectionCanExtend} title="Extend the nearest open endpoint to a visible boundary"><b>↦</b><span>{extendMode ? "Cancel Extend" : "Extend"}</span></button>
                <button type="button" className={breakMode === "break" ? "is-engaged" : ""} onClick={() => breakMode === "break" ? finishBreakMode(true) : activateBreakMode("break")} title="Remove the portion between two points on a native curve"><b>⫯</b><span>{breakMode === "break" ? "Cancel Break" : "Break"}</span></button>
                <button type="button" className={breakMode === "break-at-point" ? "is-engaged" : ""} onClick={() => breakMode === "break-at-point" ? finishBreakMode(true) : activateBreakMode("break-at-point")} title="Split an open native curve at one point"><b>⋮</b><span>{breakMode === "break-at-point" ? "Cancel Point" : "Break Point"}</span></button>
                <button type="button" onClick={joinSelection} disabled={!selectionCanJoin} title="Join endpoint-connected Lines, Arcs, and open Polylines into one native curve"><b>⌇</b><span>Join</span></button>
                <button type="button" onClick={explodeSelection} disabled={!selectionCanExplode} title="Explode selected Rectangles and Polylines into native Lines and Arcs"><b>✣</b><span>Explode</span></button>
                <button type="button" className={lengthenMode ? "is-engaged" : ""} onClick={lengthenMode ? () => finishLengthenMode(true) : activateLengthenMode} disabled={!selectionCanLengthen} title="Lengthen one Line, Arc, or open Polyline by Delta, Total, Percent, or Dynamic"><b>↤</b><span>{lengthenMode ? "Cancel Lengthen" : "Lengthen"}</span></button>
                <button type="button" className={chamferMode ? "is-engaged" : ""} onClick={chamferMode ? () => finishChamferMode(true) : activateChamferMode} title="Chamfer two Lines or every corner of one selected Polyline"><b>⌿</b><span>{chamferMode ? "Cancel Chamfer" : "Chamfer"}</span></button>
                <button type="button" className={filletMode ? "is-engaged" : ""} onClick={filletMode ? () => finishFilletMode(true) : activateFilletMode} title="Fillet Lines, Arcs, or every corner of one selected Polyline"><b>⌜</b><span>{filletMode ? "Cancel Fillet" : "Fillet"}</span></button>
                <button type="button" className={stretchMode ? "is-engaged" : ""} onClick={stretchMode ? () => finishStretchMode(true) : activateStretchMode} title="Stretch endpoints and vertices captured by a crossing window"><b>⇲</b><span>{stretchMode ? "Cancel Stretch" : "Stretch"}</span></button>
                <button type="button" className={copyMode ? "is-engaged" : ""} onClick={copyMode ? finishCopyMode : startCopyMode} disabled={!selectionCanModify}><b>⧉</b><span>{copyMode ? "Finish Copy" : "Copy"}</span></button>
                <button type="button" disabled={!selectedFace || selectedObjectIds.length > 1 || !selectionIsEditable} title={selectedFace ? "Drag the selected face or use exact entry in Properties" : "Select a face first"}><b>↔</b><span>Push / Pull</span></button>
              </div>
              <small>Edit</small>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-tools compact-tools"><button type="button" disabled={selectedObjectIds.length < 2 || !selectionIsEditable} onClick={() => document.querySelector(".alignment-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" })} title="Choose axis and alignment edge in Properties"><b>≡</b><span>Align</span></button><button type="button" onClick={selectedGroup ? ungroupSelection : createSelectionGroup} disabled={selectedGroup ? !selectionIsEditable : !canCreateGroup}><b>{selectedGroup ? "⌁" : "⌘"}</b><span>{selectedGroup ? "Ungroup" : "Group"}</span></button><button type="button" className={allSelectedLocked ? "is-engaged" : ""} onClick={toggleSelectionLock} disabled={!selectedObjectIds.length}><b>{allSelectedLocked ? "◆" : "◇"}</b><span>{allSelectedLocked ? "Unlock" : "Lock"}</span></button></div>
              <small>Selection</small>
            </div>
            <div className="ribbon-group planned-group">
              <div className="planned-tools"><span>Array</span></div>
              <small>Transform · planned</small>
            </div>
          </>
        ) : null}
        {activeRibbonTab === "Annotate" ? (
          <>
            <div className="ribbon-group planned-group"><div className="planned-tools"><span>Dimension</span><span>Measure</span><span>Text</span></div><small>Annotation · planned</small></div>
            <div className="ribbon-group planned-group"><div className="planned-tools"><span>Tag</span><span>Callout</span></div><small>Documentation · planned</small></div>
          </>
        ) : null}
        {activeRibbonTab === "View" ? (
          <>
            <div className="ribbon-group">
              <div className="ribbon-tools compact-tools"><button type="button" onClick={() => setFitViewSignal((value) => value + 1)}><b>⊡</b><span>Fit View</span></button><button type="button" className={viewTarget.id === "perspective" ? "is-engaged" : ""} onClick={() => changeViewTarget(VIEW_PRESETS.perspective)}><b>◇</b><span>Perspective</span></button></div>
              <small>Navigate</small>
            </div>
            <div className="ribbon-group">
              <div className="ribbon-tools compact-tools">
                <button type="button" className={viewTarget.id === "top" ? "is-engaged" : ""} onClick={() => changeViewTarget(VIEW_PRESETS.top)}><b>▱</b><span>Top</span></button>
                <button type="button" className={viewTarget.id === "front" ? "is-engaged" : ""} onClick={() => changeViewTarget(VIEW_PRESETS.front)}><b>▤</b><span>Front</span></button>
                <button type="button" className={viewTarget.id === "right" ? "is-engaged" : ""} onClick={() => changeViewTarget(VIEW_PRESETS.right)}><b>▥</b><span>Right</span></button>
              </div>
              <small>Standard views · orthographic</small>
            </div>
          </>
        ) : null}
        {activeRibbonTab === "Manage" ? (
          <>
            <div className="ribbon-group current-settings manage-project-summary"><div><span>Units</span><strong>Architectural</strong></div><div><span>Active Story</span><strong>{activeStory.name}</strong></div><small>Project</small></div>
            <div className="ribbon-group manage-setting-group">
              <div className="ribbon-tools compact-tools manage-tools">
                <button type="button" onClick={() => setStoryManagerOpen(true)} title="Set Stories, floor and ceiling assemblies, and vertical building defaults"><b>≋</b><span>Floors &amp;<br />Ceilings</span></button>
                <button type="button" onClick={() => setFoundationManagerOpen(true)} title="Define concrete Foundation Wall, footing, and sill support types"><b>▰</b><span>Foundation</span></button>
                <button type="button" onClick={() => setWallTypeManagerOpen(true)} title="Define reusable Exterior, Main, and Interior wall assemblies"><b>▥</b><span>Wall Types</span></button>
                <button type="button" onClick={() => setOpeningTypeManagerOpen(true)} title="Define reusable Door and Window unit sizes, rough openings, headers, and finish returns"><b>▣</b><span>Doors &amp;<br />Windows</span></button>
                <button type="button" className="is-planned" disabled title="Roof standards will be added with roof modeling"><b>⌂</b><span>Roof</span><small>Planned</small></button>
                <button type="button" onClick={() => setFramingManagerOpen(true)} title="Set generated Wall stud, plate, and opening-framing defaults"><b>╫</b><span>Framing</span></button>
                <button type="button" className="is-planned" disabled title="Project material definitions are planned"><b>▧</b><span>Materials</span><small>Planned</small></button>
              </div>
              <small>Building standards · saved with project</small>
            </div>
            <div className="ribbon-group manage-setting-group">
              <div className="ribbon-tools compact-tools manage-tools">
                <button type="button" className="is-planned" disabled title="Annotation styles are planned"><b>A</b><span>Annotation</span><small>Planned</small></button>
                <button type="button" className="is-planned" disabled title="Dimension styles are planned"><b>↔</b><span>Dimensions</span><small>Planned</small></button>
                <button type="button" onClick={() => setExplorerTab("layers")} title="Open Layer Properties in Model Explorer"><b>▤</b><span>Layer<br />Properties</span></button>
              </div>
              <small>Documentation standards · saved with project</small>
            </div>
            <div className="ribbon-group manage-setting-group">
              <div className="ribbon-tools compact-tools manage-tools">
                <button type="button" onClick={() => setStoredInterfaceTheme(interfaceTheme === "light" ? "dark" : "light")} title={`Switch to the ${interfaceTheme === "light" ? "dark" : "light"} interface`}><b>{interfaceTheme === "light" ? "☾" : "☀"}</b><span>Interface</span></button>
                <button type="button" className="is-planned" disabled title="Application-wide drafting preferences are planned"><b>⌖</b><span>Drafting</span><small>Planned</small></button>
              </div>
              <small>Application preferences · follows user</small>
            </div>
          </>
        ) : null}
        <div className="ribbon-reserve"><span>Reserved for future {activeRibbonTab.toLowerCase()} tools</span></div>
      </section>

      <nav className="document-tabs" aria-label="Open projects">
        <button className="document-menu" type="button" aria-label="Project menu">☰</button>
        <button className="document-tab is-active" type="button"><span>{normalizedProjectName}</span>{isDirty ? <b>•</b> : null}<i>×</i></button>
        <button className="new-document-tab" type="button" onClick={newProject} title="New blank plan">＋</button>
      </nav>

      {recoveredAt ? (
        <div className="recovery-notice" role="status">
          <div>
            <strong>Local work recovered</strong>
            <span>Autosaved {recoveredAt}. Save a project file when you want a portable copy.</span>
          </div>
          <div className="recovery-actions">
            <button type="button" onClick={() => setRecoveredAt(null)}>Keep working</button>
            <button type="button" className="discard-recovery" onClick={discardRecoveredDraft}>Discard draft</button>
          </div>
        </div>
      ) : fileNotice ? (
        <div className={`file-notice notice-${fileNotice.tone}`} role={fileNotice.tone === "error" ? "alert" : "status"}>
          <span>{fileNotice.text}</span>
          <button type="button" onClick={() => setFileNotice(null)} aria-label="Dismiss notification">×</button>
        </div>
      ) : null}

      <section className="work-area">
        <aside className="properties-panel">
          <div className="panel-heading"><span>PROPERTIES</span><button type="button" aria-label="More property options">···</button></div>
          <div className="selection-card">
            {selectedArc || selectedCircle || selectedLine || selectedPolyline || arcMode || boundaryMode || circleMode || lineMode || polylineMode || rectangleMode ? <DraftLineIcon /> : <DraftCubeIcon />}
            <div className="selection-details">
              {selectedArc && selectedArcIsEditable ? (
                <EditableObjectName key={`${selectedArc.id}:${selectedArc.name}`} name={selectedArc.name} onRename={renameSelectedArc} />
              ) : selectedArc ? (
                <strong>{selectedArc.name}</strong>
              ) : selectedCircle && selectedCircleIsEditable ? (
                <EditableObjectName key={`${selectedCircle.id}:${selectedCircle.name}`} name={selectedCircle.name} onRename={renameSelectedCircle} />
              ) : selectedCircle ? (
                <strong>{selectedCircle.name}</strong>
              ) : selectedPolyline && selectedPolylineIsEditable ? (
                <EditableObjectName key={`${selectedPolyline.id}:${selectedPolyline.name}`} name={selectedPolyline.name} onRename={renameSelectedPolyline} />
              ) : selectedPolyline ? (
                <strong>{selectedPolyline.name}</strong>
              ) : selectedLine && selectedLineIsEditable ? (
                <EditableObjectName key={`${selectedLine.id}:${selectedLine.name}`} name={selectedLine.name} onRename={renameSelectedLine} />
              ) : selectedLine ? (
                <strong>{selectedLine.name}</strong>
              ) : selectedGroup && selectionIsEditable ? (
                <EditableObjectName key={`${selectedGroup.id}:${selectedGroup.name}`} entity="group" name={selectedGroup.name} onRename={renameSelectedGroup} />
              ) : selectedGroup ? (
                <strong>{selectedGroup.name}</strong>
              ) : selectedObjectIds.length > 1 ? (
                <strong>{selectedObjectIds.length} Objects Selected</strong>
              ) : selectedBox && selectionIsEditable ? (
                <EditableObjectName key={`${selectedBox.id}:${selectedBox.name}`} name={selectedBox.name} onRename={renameSelectedObject} />
              ) : selectedBox ? (
                <strong>{selectedBox.name}</strong>
              ) : boundaryMode ? <strong>Boundary Command</strong> : arcMode ? <strong>Arc · {arcMethodDefinition(arcMethod).label}</strong> : circleMode ? <strong>Circle Command</strong> : lineMode ? <strong>{foundationWallMode ? "Foundation Wall" : wallMode ? "Wall" : "Line"} Command</strong> : polylineMode ? <strong>Polyline Command</strong> : rectangleMode ? <strong>Rectangle Command</strong> : <strong>No selection</strong>}
              <span>{selectedArc
                ? `${findLayer(editor.present, selectedArc.layerId)?.name ?? "Default"} layer${selectedArc.locked ? " · locked" : " · click name to edit"}`
                : selectedCircle
                ? `${findLayer(editor.present, selectedCircle.layerId)?.name ?? "Default"} layer${selectedCircle.locked ? " · locked" : " · click name to edit"}`
                : selectedPolyline
                ? `${findLayer(editor.present, selectedPolyline.layerId)?.name ?? "Default"} layer${selectedPolyline.locked ? " · locked" : " · click name to edit"}`
                : selectedLine
                ? `${findLayer(editor.present, selectedLine.layerId)?.name ?? "Default"} layer${selectedLine.locked ? " · locked" : " · click name to edit"}`
                : selectedGroup
                ? `${selectedObjectIds.length} grouped objects${selectionIsEditable ? " · click name to edit" : " · locked"}`
                : selectedObjectIds.length > 1
                  ? `${selectedBox?.name ?? "Last selected"} is the alignment anchor`
                  : selectedBox ? `${selectedLayer?.name ?? "Default"} layer${selectedBox.locked ? " · locked" : " · click name to edit"}` : boundaryMode ? `Click inside a closed area on Z ${formatSignedArchitectural(cadDraftingSettings.activeElevation)}` : arcMode ? `Specify ${arcPointStage(arcMethod, arcPoints.length)}${arcMethod === "continue" && arcContinueSeed ? ` from ${arcContinueSeed.source}` : ""}` : circleMode ? `Specify ${circlePointStage(circleMethod, circlePoints.length)}${circlePoints[0] ? ` on Z ${formatSignedArchitectural(circlePoints[0].z)}` : ""}` : lineMode ? lineAnchor ? `Next point from Z ${formatSignedArchitectural(lineAnchor.z)}` : "Specify first point" : polylineMode ? polylineAnchor ? `Next vertex from Z ${formatSignedArchitectural(polylineAnchor.z)}` : "Specify first vertex" : rectangleMode ? rectangleAnchor ? `Opposite corner from Z ${formatSignedArchitectural(rectangleAnchor.z)}` : "Specify first corner" : "Drawing properties"}</span>
            </div>
            {selectedBox || selectedArc || selectedCircle || selectedLine || selectedPolyline ? <span className={selectedArc ? selectedArcIsEditable ? "visible-dot" : "visible-dot is-locked" : selectedCircle ? selectedCircleIsEditable ? "visible-dot" : "visible-dot is-locked" : selectedPolyline ? selectedPolylineIsEditable ? "visible-dot" : "visible-dot is-locked" : selectedLine ? selectedLineIsEditable ? "visible-dot" : "visible-dot is-locked" : selectionIsEditable ? "visible-dot" : "visible-dot is-locked"} title="Selection status" /> : null}
          </div>

          {selectedArc ? (
            <PropertyGridSection ariaLabel="Arc properties" title="General" meta="2D entity">
              <PropertyGridRow label="Type"><span className="property-readout">Three-point arc</span></PropertyGridRow>
              <PropertyGridRow label="Story"><select className="property-cell-select" value={selectedArc.storyId} onChange={(event) => assignSelectedEntityStory({ id: selectedArc.id, kind: "arc" }, event.target.value)} aria-label="Arc Story" disabled={!selectedArcIsEditable}>{editor.present.building.stories.map((story) => <option key={story.id} value={story.id}>{story.name}</option>)}</select></PropertyGridRow>
              <PropertyGridRow label="Layer"><select className="property-cell-select" value={selectedArc.layerId} onChange={(event) => assignSelectedArcLayer(event.target.value)} aria-label="Arc layer" disabled={!selectedArcIsEditable}>{editor.present.layers.map((layer) => <option key={layer.id} value={layer.id}>{layer.name}{layer.locked ? " (locked)" : ""}{!layer.visible ? " (hidden)" : ""}</option>)}</select></PropertyGridRow>
              <PropertyGridRow label="Locked"><button className={selectedArc.locked ? "property-cell-button is-locked" : "property-cell-button"} type="button" onClick={toggleSelectedArcLock}>{selectedArc.locked ? "◆ Yes — unlock" : "◇ No — lock"}</button></PropertyGridRow>
            </PropertyGridSection>
          ) : selectedCircle ? (
            <PropertyGridSection ariaLabel="Circle properties" title="General" meta="2D entity">
              <PropertyGridRow label="Type"><span className="property-readout">Circle</span></PropertyGridRow>
              <PropertyGridRow label="Story"><select className="property-cell-select" value={selectedCircle.storyId} onChange={(event) => assignSelectedEntityStory({ id: selectedCircle.id, kind: "circle" }, event.target.value)} aria-label="Circle Story" disabled={!selectedCircleIsEditable}>{editor.present.building.stories.map((story) => <option key={story.id} value={story.id}>{story.name}</option>)}</select></PropertyGridRow>
              <PropertyGridRow label="Layer"><select className="property-cell-select" value={selectedCircle.layerId} onChange={(event) => assignSelectedCircleLayer(event.target.value)} aria-label="Circle layer" disabled={!selectedCircleIsEditable}>{editor.present.layers.map((layer) => <option key={layer.id} value={layer.id}>{layer.name}{layer.locked ? " (locked)" : ""}{!layer.visible ? " (hidden)" : ""}</option>)}</select></PropertyGridRow>
              <PropertyGridRow label="Locked"><button className={selectedCircle.locked ? "property-cell-button is-locked" : "property-cell-button"} type="button" onClick={toggleSelectedCircleLock}>{selectedCircle.locked ? "◆ Yes — unlock" : "◇ No — lock"}</button></PropertyGridRow>
            </PropertyGridSection>
          ) : selectedPolyline ? (
            <PropertyGridSection ariaLabel="Polyline properties" title="General" meta="2D entity">
              <PropertyGridRow label="Type"><span className="property-readout">{selectedPolyline.architecturalRole === "floor-platform" ? "Floor platform · closed footprint" : selectedPolyline.shape === "rectangle" ? "Rectangle · closed polyline" : `${selectedPolyline.closed ? "Closed" : "Open"} polyline`}</span></PropertyGridRow>
              <PropertyGridRow label="Story"><select className="property-cell-select" value={selectedPolyline.storyId} onChange={(event) => assignSelectedEntityStory({ id: selectedPolyline.id, kind: "polyline" }, event.target.value)} aria-label="Polyline Story" disabled={!selectedPolylineIsEditable}>{editor.present.building.stories.map((story) => <option key={story.id} value={story.id}>{story.name}</option>)}</select></PropertyGridRow>
              <PropertyGridRow label="Layer"><select className="property-cell-select" value={selectedPolyline.layerId} onChange={(event) => assignSelectedPolylineLayer(event.target.value)} aria-label="Polyline layer" disabled={!selectedPolylineIsEditable}>{editor.present.layers.map((layer) => <option key={layer.id} value={layer.id}>{layer.name}{layer.locked ? " (locked)" : ""}{!layer.visible ? " (hidden)" : ""}</option>)}</select></PropertyGridRow>
              <PropertyGridRow label="Locked"><button className={selectedPolyline.locked ? "property-cell-button is-locked" : "property-cell-button"} type="button" onClick={toggleSelectedPolylineLock}>{selectedPolyline.locked ? "◆ Yes — unlock" : "◇ No — lock"}</button></PropertyGridRow>
              {selectedPolyline.architecturalRole === "floor-platform" ? (() => {
                const story = editor.present.building.stories.find((candidate) => candidate.id === selectedPolyline.storyId);
                return story ? <>
                  <PropertyGridRow label="Structure"><span className="property-readout">{formatArchitectural(assemblyTotalThickness(story.floorStructure))} · {story.floorStructure.layers.length} layer{story.floorStructure.layers.length === 1 ? "" : "s"}</span></PropertyGridRow>
                  <PropertyGridRow label="Finish"><span className="property-readout">{formatArchitectural(assemblyTotalThickness(story.floorFinish))} · {story.floorFinish.layers.length} layer{story.floorFinish.layers.length === 1 ? "" : "s"}</span></PropertyGridRow>
                </> : null;
              })() : null}
              {selectedPolyline.closed ? <div className="property-action-row single-action"><button type="button" onClick={toggleSelectedFloorPlatform} disabled={!selectedPolylineIsEditable}>{selectedPolyline.architecturalRole === "floor-platform" ? "Convert to Boundary" : "Create Floor Platform"}</button></div> : null}
            </PropertyGridSection>
          ) : selectedLine ? (
            <PropertyGridSection ariaLabel="Line properties" title="General" meta={selectedLine.architecturalRole !== null ? "Architectural" : "3D entity"}>
              <PropertyGridRow label="Type"><span className="property-readout">{selectedLine.architecturalRole === "wall" ? "Wall reference line" : selectedLine.architecturalRole === "foundation-wall" ? "Foundation Wall reference line" : "Line"}</span></PropertyGridRow>
              <PropertyGridRow label="Story"><select className="property-cell-select" value={selectedLine.storyId} onChange={(event) => assignSelectedEntityStory({ id: selectedLine.id, kind: "line" }, event.target.value)} aria-label="Line Story" disabled={!selectedLineIsEditable}>{editor.present.building.stories.map((story) => <option key={story.id} value={story.id}>{story.name}</option>)}</select></PropertyGridRow>
              <PropertyGridRow label="Layer"><select className="property-cell-select" value={selectedLine.layerId} onChange={(event) => assignSelectedLineLayer(event.target.value)} aria-label="Line layer" disabled={!selectedLineIsEditable}>{editor.present.layers.map((layer) => <option key={layer.id} value={layer.id}>{layer.name}{layer.locked ? " (locked)" : ""}{!layer.visible ? " (hidden)" : ""}</option>)}</select></PropertyGridRow>
              {selectedLine.architecturalRole === "wall" ? <>
                <PropertyGridRow label="Wall type"><select className="property-cell-select" value={selectedLine.wallTypeId ?? editor.present.building.activeWallTypeId} onChange={(event) => assignSelectedWallType(event.target.value)} aria-label="Wall type" disabled={!selectedLineIsEditable}>{editor.present.building.wallTypes.map((wallType) => <option key={wallType.id} value={wallType.id}>{wallType.name}</option>)}</select></PropertyGridRow>
                {(() => { const wallType = editor.present.building.wallTypes.find((candidate) => candidate.id === selectedLine.wallTypeId) ?? editor.present.building.wallTypes[0]; const header = editor.present.building.headerTypes.find((candidate) => candidate.id === wallDefaultHeaderTypeId(wallType)); return <>
                  <PropertyGridRow label="Wall use"><span className="property-readout">{wallType.wallLocation === "interior" ? "Interior" : "Exterior"} · {wallType.wallStructuralRole === "non-bearing" ? "Non-bearing" : "Bearing"}</span></PropertyGridRow>
                  <PropertyGridRow label="Default header"><span className="property-readout">{header ? `${header.scheduleMark} · ${header.name}` : "—"}</span></PropertyGridRow>
                </>; })()}
                <PropertyGridRow label="Thickness"><span className="property-readout">{formatArchitectural(assemblyTotalThickness(editor.present.building.wallTypes.find((wallType) => wallType.id === selectedLine.wallTypeId) ?? editor.present.building.wallTypes[0]))}</span></PropertyGridRow>
                <PropertyGridRow label="Reference"><select className="property-cell-select" value={selectedLine.wallReferenceLine ?? "wall-center"} onChange={(event) => setSelectedWallPlacement({ referenceLine: event.target.value as WallReferenceLine })} aria-label="Wall reference line" disabled={!selectedLineIsEditable}>{Object.entries(WALL_REFERENCE_LINE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></PropertyGridRow>
                <PropertyGridRow label="Exterior side"><select className="property-cell-select" value={selectedLine.wallExteriorSide ?? "left"} onChange={(event) => setSelectedWallPlacement({ exteriorSide: event.target.value as WallExteriorSide })} aria-label="Wall exterior side" disabled={!selectedLineIsEditable}><option value="left">Left of Start → End</option><option value="right">Right of Start → End</option></select></PropertyGridRow>
                <PropertyGridRow label="Foundation support"><select className="property-cell-select" value={selectedLine.foundationSupportWallId ?? ""} onChange={(event) => assignSelectedWallFoundationSupport(event.target.value || null)} aria-label="Supporting Foundation Wall" disabled={!selectedLineIsEditable}><option value="">Not assigned</option>{editor.present.lines.filter((line) => line.architecturalRole === "foundation-wall" && line.storyId === selectedLine.storyId).map((line) => <option key={line.id} value={line.id}>{line.name}</option>)}</select></PropertyGridRow>
                <PropertyGridRow label="Join priority"><select className="property-cell-select" value={selectedLine.wallJoinPriority ?? 0} onChange={(event) => setSelectedWallPlacement({ joinPriority: Number(event.target.value) })} aria-label="Wall join priority" disabled={!selectedLineIsEditable}><option value={-10}>Low</option><option value={0}>Normal</option><option value={10}>High</option><option value={20}>Primary</option></select></PropertyGridRow>
                <PropertyGridRow label="Start cleanup"><select className="property-cell-select" value={selectedLine.wallStartJoinMode ?? "auto"} onChange={(event) => setSelectedWallPlacement({ startJoinMode: event.target.value as WallJoinMode })} aria-label="Wall start junction cleanup" disabled={!selectedLineIsEditable}><option value="auto">Automatic</option><option value="square">Square / disconnected</option></select></PropertyGridRow>
                <PropertyGridRow label="End cleanup"><select className="property-cell-select" value={selectedLine.wallEndJoinMode ?? "auto"} onChange={(event) => setSelectedWallPlacement({ endJoinMode: event.target.value as WallJoinMode })} aria-label="Wall end junction cleanup" disabled={!selectedLineIsEditable}><option value="auto">Automatic</option><option value="square">Square / disconnected</option></select></PropertyGridRow>
                <PropertyGridRow label="Junctions"><span className="property-readout">{selectedWallJunctionLabel}</span></PropertyGridRow>
              </> : null}
              {selectedLine.architecturalRole === "foundation-wall" ? (() => {
                const foundationType = editor.present.building.foundationWallTypes.find((type) => type.id === selectedLine.foundationWallTypeId) ?? activeFoundationWallType;
                return <>
                  <PropertyGridRow label="Foundation type"><select className="property-cell-select" value={foundationType.id} onChange={(event) => assignSelectedFoundationWallType(event.target.value)} aria-label="Foundation Wall type" disabled={!selectedLineIsEditable}>{editor.present.building.foundationWallTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></PropertyGridRow>
                  <PropertyGridRow label="Concrete"><span className="property-readout">{formatArchitectural(foundationType.wallHeight)} high × {formatArchitectural(foundationType.wallWidth)} wide</span></PropertyGridRow>
                  <PropertyGridRow label="Reference"><select className="property-cell-select" value={selectedLine.wallReferenceLine ?? "exterior-main"} onChange={(event) => setSelectedWallPlacement({ referenceLine: event.target.value as WallReferenceLine })} aria-label="Foundation Wall reference line" disabled={!selectedLineIsEditable}>{Object.entries(WALL_REFERENCE_LINE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></PropertyGridRow>
                  <PropertyGridRow label="Exterior side"><select className="property-cell-select" value={selectedLine.wallExteriorSide ?? "left"} onChange={(event) => setSelectedWallPlacement({ exteriorSide: event.target.value as WallExteriorSide })} aria-label="Foundation Wall exterior side" disabled={!selectedLineIsEditable}><option value="left">Left of Start → End</option><option value="right">Right of Start → End</option></select></PropertyGridRow>
                  <PropertyGridRow label="Join priority"><select className="property-cell-select" value={selectedLine.wallJoinPriority ?? 0} onChange={(event) => setSelectedWallPlacement({ joinPriority: Number(event.target.value) })} aria-label="Foundation Wall join priority" disabled={!selectedLineIsEditable}><option value={-10}>Low</option><option value={0}>Normal</option><option value={10}>High</option><option value={20}>Primary</option></select></PropertyGridRow>
                  <PropertyGridRow label="Start cleanup"><select className="property-cell-select" value={selectedLine.wallStartJoinMode ?? "auto"} onChange={(event) => setSelectedWallPlacement({ startJoinMode: event.target.value as WallJoinMode })} aria-label="Foundation Wall start junction cleanup" disabled={!selectedLineIsEditable}><option value="auto">Automatic</option><option value="square">Square / disconnected</option></select></PropertyGridRow>
                  <PropertyGridRow label="End cleanup"><select className="property-cell-select" value={selectedLine.wallEndJoinMode ?? "auto"} onChange={(event) => setSelectedWallPlacement({ endJoinMode: event.target.value as WallJoinMode })} aria-label="Foundation Wall end junction cleanup" disabled={!selectedLineIsEditable}><option value="auto">Automatic</option><option value="square">Square / disconnected</option></select></PropertyGridRow>
                  <PropertyGridRow label="Junctions"><span className="property-readout">{selectedWallJunctionLabel}</span></PropertyGridRow>
                  <PropertyGridRow label="Floor stop"><span className="property-readout">Sill exterior · {formatSignedArchitectural(foundationSillOffsetFromReference(selectedLine, foundationType))} from reference</span></PropertyGridRow>
                </>;
              })() : null}
              <PropertyGridRow label="Locked"><button className={selectedLine.locked ? "property-cell-button is-locked" : "property-cell-button"} type="button" onClick={toggleSelectedLineLock}>{selectedLine.locked ? "◆ Yes — unlock" : "◇ No — lock"}</button></PropertyGridRow>
              {selectedLine.architecturalRole !== null
                ? <div className="property-action-row single-action"><button type="button" onClick={toggleSelectedWallRole} disabled={!selectedLineIsEditable}>Convert to Line</button></div>
                : <div className="property-action-row"><button type="button" onClick={toggleSelectedWallRole} disabled={!selectedLineIsEditable}>Create Wall</button><button type="button" onClick={makeSelectedFoundationWall} disabled={!selectedLineIsEditable}>Create Foundation Wall</button></div>}
            </PropertyGridSection>
          ) : selectedBox ? (
            <PropertyGridSection ariaLabel="Selection organization" title="General" meta={selectedGroup ? "Group" : selectedObjectIds.length > 1 ? "Selection" : "Object"}>
              <PropertyGridRow label="Type"><span className="property-readout">{selectedGroup ? "Named group" : selectedObjectIds.length > 1 ? "Selection set" : "Parametric box"}</span></PropertyGridRow>
              {selectedObjectIds.length > 1 ? <PropertyGridRow label="Objects"><span className="property-readout">{selectedObjectIds.length}</span></PropertyGridRow> : null}
              {selectedObjectIds.length > 1 ? <PropertyGridRow label="Primary"><span className="property-readout">{selectedBox.name}</span></PropertyGridRow> : null}
              {selectedObjectIds.length === 1 ? (
                <PropertyGridRow label="Story">
                  <select className="property-cell-select" value={selectedBox.storyId} onChange={(event) => assignSelectedEntityStory({ id: selectedBox.id, kind: "box" }, event.target.value)} aria-label="Object Story" disabled={!selectionIsEditable}>
                    {editor.present.building.stories.map((story) => <option key={story.id} value={story.id}>{story.name}</option>)}
                  </select>
                </PropertyGridRow>
              ) : null}
              {selectedObjectIds.length === 1 ? (
                <PropertyGridRow label="Layer">
                  <select className="property-cell-select" value={selectedBox.layerId} onChange={(event) => assignSelectedLayer(event.target.value)} aria-label="Object layer" disabled={!selectionIsEditable}>
                    {editor.present.layers.map((layer) => (
                      <option key={layer.id} value={layer.id}>{layer.name}{layer.locked ? " (locked)" : ""}{!layer.visible ? " (hidden)" : ""}</option>
                    ))}
                  </select>
                </PropertyGridRow>
              ) : null}
              <PropertyGridRow label="Group">
                <button className="property-cell-button" type="button" onClick={selectedGroup ? ungroupSelection : createSelectionGroup} disabled={selectedGroup ? !selectionIsEditable : !canCreateGroup}>{selectedGroup ? `Ungroup ${selectedGroup.name}` : canCreateGroup ? "Create group" : "None"}</button>
              </PropertyGridRow>
              <PropertyGridRow label="Locked">
                <button className={allSelectedLocked ? "property-cell-button is-locked" : "property-cell-button"} type="button" onClick={toggleSelectionLock}>{allSelectedLocked ? "◆ Yes — unlock" : "◇ No — lock"}</button>
              </PropertyGridRow>
            </PropertyGridSection>
          ) : null}

          {stretchMode ? (
            stretchTargets.length ? (
              <StretchControl key={`stretch:${stretchTargets.map((target) => `${target.kind}:${target.id}:${target.components.join("-")}:${target.whole}`).join("|")}`} onApply={stretchSelectionExact} onCancel={() => finishStretchMode(true)} targetCount={stretchTargets.length} />
            ) : (
              <PropertyGridSection className="stretch-panel" title="Stretch" meta="Select targets">
                <p className="property-grid-note">Drag a right-to-left crossing window across Line endpoints or Polyline vertices. Geometry fully inside the window moves as a whole.</p>
                <div className="property-action-row single-action"><button type="button" onClick={() => finishStretchMode(true)}>Cancel Stretch</button></div>
              </PropertyGridSection>
            )
          ) : copyMode && selectionCanModify ? (
            <CopyObjectsControl key={`copy:${selectedEntityKeys.join(":")}`} selectionCount={selectedEntityRefs.length} onCopy={copySelection} onFinish={finishCopyMode} />
          ) : moveMode && selectionCanModify ? (
            <MoveObjectControl key={`move:${selectedEntityKeys.join(":")}`} onMove={moveSelectedObject} />
          ) : null}
          {breakMode ? <BreakControl mode={breakMode} onCancel={() => finishBreakMode(true)} stage={breakStage} /> : null}
          {chamferMode ? <ChamferControl key={`chamfer:${chamferFirstDistance}:${chamferSecondDistance}`} canApplyPolyline={selectionCanModifyPolylineCorners && chamferStage === 0} firstDistance={chamferFirstDistance} mode={chamferMode} onApplyPolyline={applyPolylineChamfer} onCancel={() => finishChamferMode(true)} onDistanceChange={(first, second) => { setChamferFirstDistance(first); setChamferSecondDistance(second); setChamferDistancePrompt(0); }} secondDistance={chamferSecondDistance} stage={chamferStage} /> : null}
          {filletMode ? <FilletControl key={`fillet:${filletRadius}`} canApplyPolyline={selectionCanModifyPolylineCorners && filletStage === 0} mode={filletMode} onApplyPolyline={applyPolylineFillet} onCancel={() => finishFilletMode(true)} onRadiusChange={setFilletRadius} radius={filletRadius} stage={filletStage} /> : null}
          {selectionCanModify ? (
            <>
              <RotationControl baseKey={rotationBaseKey} currentRotation={rotationReadout} onBaseChange={setRotationBaseKey} onFinish={finishRotateMode} onRotate={rotateSelection} onStart={activateRotateMode} rotateMode={rotateMode} selectionCount={selectedEntityRefs.length} />
              <ScaleControl baseKey={scaleBaseKey} onBaseChange={setScaleBaseKey} onFinish={finishScaleMode} onScale={scaleSelection} onStart={activateScaleMode} scaleMode={scaleMode} selectionCount={selectedEntityRefs.length} />
              <MirrorControl keepSource={mirrorKeepSource} mirrorMode={mirrorMode} onFinish={finishMirrorMode} onKeepSourceChange={setMirrorKeepSource} onQuickMirror={quickMirrorSelection} onStart={activateMirrorMode} selectionCount={selectedEntityRefs.length} />
              {selectionCanOffset ? <OffsetControl key={`offset:${selectedOffsetRef?.kind}:${selectedOffsetRef?.id}:${offsetDistance}`} distance={offsetDistance} keepSource={offsetKeepSource} offsetMode={offsetMode} onDistanceChange={setOffsetDistance} onFinish={finishOffsetMode} onKeepSourceChange={setOffsetKeepSource} onStart={activateOffsetMode} /> : null}
              {selectionCanTrim ? <TrimExtendControl canExtend={selectionCanExtend} extendMode={extendMode} onExtend={activateExtendMode} onFinish={finishTrimExtendMode} onTrim={activateTrimMode} trimMode={trimMode} /> : null}
              {selectionCanJoin ? <JoinControl onJoin={joinSelection} selectionCount={selectedEntityRefs.length} /> : null}
              {selectionCanExplode ? <ExplodeControl hasWidth={selectedExplodeHasWidth} onExplode={explodeSelection} segmentCount={selectedExplodeSegmentCount} selectionCount={selectedEntityRefs.length} /> : null}
              {selectionCanLengthen ? <LengthenControl key={`lengthen:${lengthenMethod}:${lengthenValue}`} method={lengthenMethod} mode={lengthenMode} onFinish={() => finishLengthenMode(true)} onMethodChange={(method) => { setLengthenMethod(method); if (lengthenMode) finishLengthenMode(true); }} onStart={activateLengthenMode} onValueChange={(value) => { setLengthenValue(value); if (lengthenMode) finishLengthenMode(true); }} value={lengthenValue} /> : null}
            </>
          ) : null}

          {selectedArc && !selectedArcIsEditable ? (
            <PropertyGridSection className="locked-selection-notice" title="Editing" meta="Read only"><PropertyGridRow label="Status"><span className="property-readout is-locked">Arc locked</span></PropertyGridRow><p className="property-grid-note">Unlock the Arc or its layer to edit its geometry.</p></PropertyGridSection>
          ) : selectedArc ? (
            <ArcGeometryControl key={`${selectedArc.id}:${selectedArc.center.x}:${selectedArc.center.y}:${selectedArc.center.z}:${selectedArc.radius}:${selectedArc.startAngle}:${selectedArc.endAngle}:${selectedArc.counterclockwise}`} arc={selectedArc} onUpdate={updateSelectedArc} />
          ) : selectedCircle && !selectedCircleIsEditable ? (
            <PropertyGridSection className="locked-selection-notice" title="Editing" meta="Read only"><PropertyGridRow label="Status"><span className="property-readout is-locked">Circle locked</span></PropertyGridRow><p className="property-grid-note">Unlock the Circle or its layer to edit its geometry.</p></PropertyGridSection>
          ) : selectedCircle ? (
            <CircleGeometryControl key={`${selectedCircle.id}:${selectedCircle.center.x}:${selectedCircle.center.y}:${selectedCircle.center.z}:${selectedCircle.radius}`} circle={selectedCircle} onUpdate={updateSelectedCircle} />
          ) : selectedPolyline && !selectedPolylineIsEditable ? (
            <PropertyGridSection className="locked-selection-notice" title="Editing" meta="Read only"><PropertyGridRow label="Status"><span className="property-readout is-locked">{selectedPolyline.shape === "rectangle" ? "Rectangle" : "Polyline"} locked</span></PropertyGridRow><p className="property-grid-note">Unlock the entity or its layer to edit its geometry.</p></PropertyGridSection>
          ) : selectedPolyline?.shape === "rectangle" && rectangleSupportsConstrainedGrips(selectedPolyline) ? (
            <RectangleGeometryControl elevationLocked={selectedPolyline.architecturalRole === "floor-platform"} key={`${selectedPolyline.id}:${selectedPolyline.elevation}:${selectedPolyline.vertices.map((point) => `${point.x},${point.y}`).join(":")}`} rectangle={selectedPolyline} onUpdate={updateSelectedPolyline} />
          ) : selectedPolyline ? (
            <PolylineGeometryControl elevationLocked={selectedPolyline.architecturalRole === "floor-platform"} key={`${selectedPolyline.id}:${selectedPolyline.elevation}:${selectedPolyline.width ?? 0}:${selectedPolyline.bulges?.join(",") ?? ""}:${selectedPolyline.vertices.map((point) => `${point.x},${point.y}`).join(":")}`} polyline={selectedPolyline} onUpdate={updateSelectedPolyline} />
          ) : selectedLine && !selectedLineIsEditable ? (
            <PropertyGridSection className="locked-selection-notice" title="Editing" meta="Read only"><PropertyGridRow label="Status"><span className="property-readout is-locked">Line locked</span></PropertyGridRow><p className="property-grid-note">Unlock the line or its layer to edit its geometry.</p></PropertyGridSection>
          ) : selectedLine ? (
            selectedLine.architecturalRole === "wall"
              ? <>
                <WallGeometryControl document={editor.present} key={`${selectedLine.id}:${selectedLine.start.x}:${selectedLine.start.y}:${selectedLine.end.x}:${selectedLine.end.y}:${selectedLine.storyId}`} line={selectedLine} onUpdate={updateSelectedLine} />
                <WallOpeningsControl building={editor.present.building} line={selectedLine} onAdd={addSelectedWallOpening} onAssignType={assignSelectedWallOpeningType} onDelete={deleteSelectedWallOpening} onUpdate={updateSelectedWallOpening} />
              </>
              : selectedLine.architecturalRole === "foundation-wall"
                ? <FoundationWallGeometryControl document={editor.present} key={`${selectedLine.id}:${selectedLine.start.x}:${selectedLine.start.y}:${selectedLine.end.x}:${selectedLine.end.y}:${selectedLine.storyId}:${selectedLine.foundationWallTypeId}`} line={selectedLine} onUpdate={updateSelectedLine} />
              : <LineGeometryControl key={`${selectedLine.id}:${selectedLine.start.x}:${selectedLine.start.y}:${selectedLine.start.z}:${selectedLine.end.x}:${selectedLine.end.y}:${selectedLine.end.z}`} line={selectedLine} onUpdate={updateSelectedLine} />
          ) : selectedBox && !selectionIsEditable ? (
            <PropertyGridSection className="locked-selection-notice" title="Editing" meta="Read only">
              <PropertyGridRow label="Status"><span className="property-readout is-locked">Selection locked</span></PropertyGridRow>
              <p className="property-grid-note">Unlock the selection to change dimensions, position, layer, grouping, or geometry.</p>
            </PropertyGridSection>
          ) : selectedBox && selectedObjectIds.length > 1 ? (
            <>
              <AlignmentControl anchorName={selectedBox.name} onAlign={alignSelection} />
            </>
          ) : selectedBox ? (
            <>
              <PropertyGridSection title="Dimensions" meta="Architectural">
                {(Object.keys(selectedBox.dimensions) as DimensionKey[]).map((key) => (
                  <DimensionField key={`${selectedBox.id}:${key}:${selectedBox.dimensions[key]}`} dimensionKey={key} value={selectedBox.dimensions[key]} onCommit={updateDimension} />
                ))}
              </PropertyGridSection>
              <PropertyGridSection title="Position" meta="Local minimum corner">
                {(["x", "y", "z"] as AxisKey[]).map((axis) => (
                  <PositionField key={`${selectedBox.id}:${axis}:${selectedBox.position[axis]}`} axis={axis} value={selectedBox.position[axis]} onCommit={updatePosition} />
                ))}
              </PropertyGridSection>
              <PropertyGridSection title="Selection" meta="Sub-object">
                <PropertyGridRow label="Face"><div className={selectedFace ? "face-selection is-selected" : "face-selection"}><span className="face-swatch" /><span>{selectedFace?.label ?? "Click a box face"}</span></div></PropertyGridRow>
              </PropertyGridSection>
              <ExactMoveControl key={`${selectedBox.id}:${selectedFaceIndex ?? "no-face"}`} model={selectedBox} selectedFaceIndex={selectedFaceIndex} onCommit={commitModel} />
            </>
          ) : boundaryMode ? (
            <PropertyGridSection className="drawing-properties" title="Boundary" meta="Closed Polyline">
              <PropertyGridRow label="Current layer"><span className="property-readout">{activeLayer?.name ?? "Default"}</span></PropertyGridRow>
              <PropertyGridRow label="Elevation"><span className="property-readout">{formatSignedArchitectural(cadDraftingSettings.activeElevation)}</span></PropertyGridRow>
              <PropertyGridRow label="Sources"><span className="property-readout">Visible Lines, Arcs, Circles, and Polylines</span></PropertyGridRow>
              <p className="property-grid-note">Move inside an enclosed area to preview its exact loop, then click to create one editable closed Polyline. Hidden layers and other elevations are ignored.</p>
              <div className="property-action-row single-action"><button type="button" onClick={() => finishBoundaryMode(true)}>Cancel Boundary</button></div>
            </PropertyGridSection>
          ) : arcMode || circleMode || lineMode || polylineMode || rectangleMode ? (
            <>
              <PropertyGridSection className="drawing-properties" title={activeDrawingTitle} meta={activeDrawingMeta}>
                {arcMode ? <PropertyGridRow label="Method"><select className="property-cell-select" value={arcMethod} onChange={(event) => activateArcMode(event.target.value as ArcMethod)} aria-label="Active Arc method">{ARC_METHODS.map((definition) => <option key={definition.method} value={definition.method}>{definition.label}</option>)}</select></PropertyGridRow> : null}
                <PropertyGridRow label="Current layer"><span className="property-readout">{activeLayer?.name ?? "Default"}</span></PropertyGridRow>
                {wallMode || foundationWallMode ? <PropertyGridRow label="Elevation"><span className="property-readout">{formatSignedArchitectural(cadDraftingSettings.activeElevation)} · Story controlled</span></PropertyGridRow> : <label className="property-table-row property-input-row"><span className="property-table-label">Elevation</span><div className={activeElevationError ? "property-table-value field-shell field-error" : "property-table-value field-shell"}><input value={activeElevationDraft} onChange={(event) => { setActiveElevationDraft(event.target.value); setActiveElevationError(""); }} onKeyDown={(event) => { if (event.key === "Enter") applyActiveElevation(); }} onBlur={applyActiveElevation} aria-label="Active drawing elevation" spellCheck={false} /><span>ft-in</span></div></label>}
                {!wallMode && activeElevationError ? <p className="property-grid-note property-row-error" role="alert">{activeElevationError}</p> : null}
                <PropertyGridRow label="Start X"><span className="property-readout">{activeDrawingAnchor ? formatSignedArchitectural(activeDrawingAnchor.x) : "Click or type X,Y"}</span></PropertyGridRow>
                <PropertyGridRow label="Start Y"><span className="property-readout">{activeDrawingAnchor ? formatSignedArchitectural(activeDrawingAnchor.y) : `Default Z = ${formatSignedArchitectural(cadDraftingSettings.activeElevation)}`}</span></PropertyGridRow>
                <PropertyGridRow label="Start Z"><span className="property-readout">{activeDrawingAnchor ? formatSignedArchitectural(activeDrawingAnchor.z) : wallMode || foundationWallMode ? "Active Story rough floor" : "Type X,Y,Z to override"}</span></PropertyGridRow>
                <p className="property-grid-note">{activeDrawingNote}</p>
              </PropertyGridSection>
              <PropertyGridSection title="Grid & Snap" meta="Independent controls">
                <PropertyGridRow label="Grid display (F7)"><button type="button" className={cadDraftingSettings.gridVisible ? "property-cell-button is-locked" : "property-cell-button"} onClick={() => setCadDraftingSettings((current) => ({ ...current, gridVisible: !current.gridVisible }))}>{cadDraftingSettings.gridVisible ? "● On" : "○ Off"}</button></PropertyGridRow>
                <PropertyGridRow label="Grid spacing"><select className="property-cell-select" value={cadDraftingSettings.gridSpacing} onChange={(event) => setCadDraftingSettings((current) => ({ ...current, gridSpacing: Number(event.target.value) }))} aria-label="Visible grid spacing">{GRID_SPACING_OPTIONS.map((spacing) => <option key={spacing} value={spacing}>{formatDraftingSpacing(spacing)}</option>)}</select></PropertyGridRow>
                <PropertyGridRow label="Cursor snap"><select className="property-cell-select" value={cadDraftingSettings.snapIncrement} onChange={(event) => setCadDraftingSettings((current) => ({ ...current, snapIncrement: Number(event.target.value) }))} aria-label="Cursor snap increment">{SNAP_INCREMENT_OPTIONS.map((increment) => <option key={increment} value={increment}>{formatDraftingSpacing(increment)}</option>)}</select></PropertyGridRow>
                <PropertyGridRow label="Exact input"><span className="property-readout">1/16&quot; precision</span></PropertyGridRow>
                <p className="property-grid-note">The visible grid does not control the cursor. Freehand points use the cursor snap increment; typed dimensions and object snaps retain 1/16-inch precision.</p>
              </PropertyGridSection>
              <PropertyGridSection title="Polar Tracking" meta="4° capture">
                <PropertyGridRow label="Ortho (F8)"><button type="button" className={cadDraftingSettings.orthoEnabled ? "property-cell-button is-locked" : "property-cell-button"} onClick={() => setCadDraftingSettings((current) => ({ ...current, orthoEnabled: !current.orthoEnabled }))}>{cadDraftingSettings.orthoEnabled ? "● On" : "○ Off"}</button></PropertyGridRow>
                <PropertyGridRow label="Polar (F10)"><button type="button" className={cadDraftingSettings.polarEnabled ? "property-cell-button is-locked" : "property-cell-button"} onClick={() => setCadDraftingSettings((current) => ({ ...current, polarEnabled: !current.polarEnabled }))}>{cadDraftingSettings.polarEnabled ? "● On" : "○ Off"}</button></PropertyGridRow>
                <PropertyGridRow label="Always on"><span className="property-readout">0°, 90°, 180°, 270°</span></PropertyGridRow>
                <label className="property-table-row property-input-row"><span className="property-table-label">Additional</span><div className={lineSnapAngleError ? "property-table-value field-shell field-error" : "property-table-value field-shell"}><input value={lineSnapAngleDraft} onChange={(event) => { setLineSnapAngleDraft(event.target.value); setLineSnapAngleError(""); }} onKeyDown={(event) => { if (event.key === "Enter") applyAdditionalLineSnapAngles(); }} aria-label="Additional line snap angles" placeholder="30, 45, 135" spellCheck={false} /><span>deg</span></div></label>
                {lineSnapAngleError ? <p className="property-grid-note property-row-error" role="alert">{lineSnapAngleError}</p> : null}
                <div className="property-action-row single-action"><button type="button" onClick={applyAdditionalLineSnapAngles}>Apply Angle Settings</button></div>
                <p className="property-grid-note">Active angles: {lineSnapAngles.join("°, ")}°.</p>
              </PropertyGridSection>
              <PropertyGridSection title="Object Snaps" meta="F3 master toggle">
                <PropertyGridRow label="Enabled"><button type="button" className={cadDraftingSettings.objectSnapEnabled ? "property-cell-button is-locked" : "property-cell-button"} onClick={() => setCadDraftingSettings((current) => ({ ...current, objectSnapEnabled: !current.objectSnapEnabled }))}>{cadDraftingSettings.objectSnapEnabled ? "● On" : "○ Off"}</button></PropertyGridRow>
                <PropertyGridRow label="Next override"><button type="button" className={objectSnapOverride ? "property-cell-button is-locked" : "property-cell-button"} onClick={() => setObjectSnapOverride(null)} disabled={!objectSnapOverride}>{objectSnapOverride ? `${CAD_SNAP_LABELS[objectSnapOverride]} · click to clear` : "None"}</button></PropertyGridRow>
                {OBJECT_SNAP_MODE_DEFINITIONS.map(({ label, mode }) => (
                  <PropertyGridRow key={mode} label={label}><button type="button" className={cadDraftingSettings.objectSnapModes.includes(mode) ? "property-cell-button is-locked" : "property-cell-button"} onClick={() => toggleObjectSnapMode(mode)}>{cadDraftingSettings.objectSnapModes.includes(mode) ? "✓ Enabled" : "Disabled"}</button></PropertyGridRow>
                ))}
                <p className="property-grid-note">Pause over a snap point to acquire its tracking paths. Press Tab when snaps overlap. Type END, MID, CEN, INT, TAN, PER, or another snap name for a one-point override. Node is ready for future Point entities.</p>
              </PropertyGridSection>
            </>
          ) : (
            <>
              <PropertyGridSection className="project-setup-properties" title="Project Setup" meta={modelEntityCount ? "Building defaults" : "Start here"}>
                <PropertyGridRow label="Active Story"><span className="property-readout">{activeStory.name}</span></PropertyGridRow>
                <PropertyGridRow label="Rough floor"><span className="property-readout">{formatSignedArchitectural(activeStoryCalculation?.roughFloorElevation ?? 0)}</span></PropertyGridRow>
                <PropertyGridRow label="Ceiling height"><span className="property-readout">{formatArchitectural(activeStory.roughCeilingHeight)}</span></PropertyGridRow>
                <PropertyGridRow label="Floor depth"><span className="property-readout">{formatArchitectural(assemblyTotalThickness(activeStory.floorStructure))}</span></PropertyGridRow>
                <PropertyGridRow label="Active Wall"><span className="property-readout">{activeWallType.name} · {formatArchitectural(assemblyTotalThickness(activeWallType))}</span></PropertyGridRow>
                <PropertyGridRow label="Rooms"><span className="property-readout">{activeStoryRoomCount} detected</span></PropertyGridRow>
                <div className="property-action-row project-setup-actions"><button type="button" onClick={() => setStoryManagerOpen(true)}>Story &amp; Floor Settings</button><button type="button" onClick={() => setWallTypeManagerOpen(true)}>Wall Types</button><button type="button" onClick={() => setRoomManagerOpen(true)}>Rooms</button></div>
                <p className="property-grid-note">Story settings establish the defaults. Room settings override them only where needed.</p>
              </PropertyGridSection>
              <PropertyGridSection className="drawing-properties" title="Drawing" meta="No selection">
                <PropertyGridRow label="Current layer"><span className="property-readout">{activeLayer?.name ?? "Default"}</span></PropertyGridRow>
                <PropertyGridRow label="Units"><span className="property-readout">Architectural</span></PropertyGridRow>
                <PropertyGridRow label="Precision"><span className="property-readout">1/16&quot;</span></PropertyGridRow>
                <PropertyGridRow label="Grid display (F7)"><button type="button" className={cadDraftingSettings.gridVisible ? "property-cell-button is-locked" : "property-cell-button"} onClick={() => setCadDraftingSettings((current) => ({ ...current, gridVisible: !current.gridVisible }))}>{cadDraftingSettings.gridVisible ? "● On" : "○ Off"}</button></PropertyGridRow>
                <PropertyGridRow label="Grid spacing"><select className="property-cell-select" value={cadDraftingSettings.gridSpacing} onChange={(event) => setCadDraftingSettings((current) => ({ ...current, gridSpacing: Number(event.target.value) }))} aria-label="Visible grid spacing">{GRID_SPACING_OPTIONS.map((spacing) => <option key={spacing} value={spacing}>{formatDraftingSpacing(spacing)}</option>)}</select></PropertyGridRow>
                <PropertyGridRow label="Cursor snap"><select className="property-cell-select" value={cadDraftingSettings.snapIncrement} onChange={(event) => setCadDraftingSettings((current) => ({ ...current, snapIncrement: Number(event.target.value) }))} aria-label="Cursor snap increment">{SNAP_INCREMENT_OPTIONS.map((increment) => <option key={increment} value={increment}>{formatDraftingSpacing(increment)}</option>)}</select></PropertyGridRow>
              </PropertyGridSection>
            </>
          )}
        </aside>

        <div className="viewport-workspace">
        <Viewport
          activeElevation={cadDraftingSettings.activeElevation}
          interfaceTheme={interfaceTheme}
          gridSpacing={cadDraftingSettings.gridSpacing}
          gridVisible={cadDraftingSettings.gridVisible}
          arcCommand={arcCommand}
          arcContinueSeed={arcContinueSeed}
          arcMethod={arcMethod}
          arcMode={arcMode}
          circleCommand={circleCommand}
          circleMethod={circleMethod}
          circleMode={circleMode}
          copyMode={copyMode}
          document={editor.present}
          dragStatus={dragStatus}
          fitViewSignal={fitViewSignal}
          lineCommand={lineCommand}
          lineMode={lineMode}
          lineSnapAngles={lineSnapAngles}
          polylineCommand={polylineCommand}
          polylineMode={polylineMode}
          polylineSegmentMode={polylineSegmentMode}
          polylineWidth={polylineWidth}
          rectangleCommand={rectangleCommand}
          rectangleDraftSettings={rectangleDraftSettings}
          rectangleMode={rectangleMode}
          moveMode={moveMode}
          mirrorMode={mirrorMode}
          mirrorKeepSource={mirrorKeepSource}
          offsetDistance={offsetDistance}
          offsetKeepSource={offsetKeepSource}
          offsetMode={offsetMode}
          chamferFirstDistance={chamferFirstDistance}
          chamferMode={chamferMode}
          chamferSecondDistance={chamferSecondDistance}
          breakMode={breakMode}
          boundaryMode={boundaryMode}
          filletMode={filletMode}
          filletRadius={filletRadius}
          lengthenMethod={lengthenMethod}
          lengthenMode={lengthenMode}
          lengthenValue={lengthenValue}
          extendMode={extendMode}
          trimMode={trimMode}
          objectSnapEnabled={cadDraftingSettings.objectSnapEnabled}
          objectSnapModes={cadDraftingSettings.objectSnapModes}
          objectSnapOverride={objectSnapOverride}
          orthoEnabled={cadDraftingSettings.orthoEnabled}
          polarEnabled={cadDraftingSettings.polarEnabled}
          rotateMode={rotateMode}
          rotationBaseKey={rotationBaseKey}
          scaleMode={scaleMode}
          scaleBaseKey={scaleBaseKey}
          stretchMode={stretchMode}
          stretchTargets={stretchTargets}
          viewTarget={viewTarget}
          selectedObjectId={selectedObjectId}
          selectedObjectIds={selectedObjectIds}
          selectedEntityKeys={selectedEntityKeys}
          snapIncrement={cadDraftingSettings.snapIncrement}
          selectedFaceIndex={selectedFaceIndex}
          selectedArcId={selectedArcId}
          selectedCircleId={selectedCircleId}
          selectedLineId={selectedLineId}
          selectedPolylineId={selectedPolylineId}
          onArcCreate={createArc}
          onArcFinishRequested={finishArcMode}
          onArcPointsChange={setArcPoints}
          onArcSelect={selectArc}
          onCirclePointsChange={setCirclePoints}
          onCircleCreate={createCircle}
          onCircleFinishRequested={finishCircleMode}
          onCircleSelect={selectCircle}
          onFaceSelect={selectObject}
          onLineAnchorChange={setLineAnchor}
          onLineCommandFeedback={({ message, tone }) => setFileNotice({ text: message, tone })}
          onLineCreate={createLine}
          onLineFinishRequested={finishLineMode}
          onLineSelect={selectLine}
          onLineUndoSegment={undoLineSegment}
          onModifyCommit={commitModifyMode}
          onModifyFinishRequested={finishModifyMode}
          onMirrorCommit={commitMirrorMode}
          onMirrorFinishRequested={finishMirrorMode}
          onOffsetCommit={commitOffsetMode}
          onOffsetFinishRequested={finishOffsetMode}
          onChamferCommit={commitChamferMode}
          onChamferFinishRequested={finishChamferMode}
          onChamferStageChange={setChamferStage}
          onBreakCommit={commitBreakMode}
          onBreakFinishRequested={finishBreakMode}
          onBreakStageChange={setBreakStage}
          onBoundaryCommit={commitBoundaryMode}
          onBoundaryFinishRequested={finishBoundaryMode}
          onFilletCommit={commitFilletMode}
          onFilletFinishRequested={finishFilletMode}
          onFilletStageChange={setFilletStage}
          onLengthenCommit={commitLengthenMode}
          onLengthenFinishRequested={finishLengthenMode}
          onTrimExtendCommit={commitTrimExtendMode}
          onTrimExtendFinishRequested={finishTrimExtendMode}
          onObjectSnapOverrideConsumed={consumeObjectSnapOverride}
          onPolylineAnchorChange={setPolylineAnchor}
          onPolylineCreate={createPolyline}
          onPolylineFinishRequested={finishPolylineMode}
          onPolylineSelect={selectPolyline}
          onSelectionWindow={selectWindow}
          onRectangleAnchorChange={setRectangleAnchor}
          onRectangleFinishRequested={finishRectangleMode}
          onRotateFinishRequested={finishRotateMode}
          onScaleFinishRequested={finishScaleMode}
          onStretchCommit={commitStretchMode}
          onStretchFinishRequested={finishStretchMode}
          onStretchTargetsChange={selectStretchTargets}
          onViewChange={changeViewTarget}
          onDragStatus={setDragStatus}
          onExactFaceMove={moveFaceByExactGripDistance}
          onDragPreview={(next) => dispatch({ type: "preview", next })}
          onDragCancel={(before) => dispatch({ type: "preview", next: before })}
          onDragCommit={(before, next) => {
            dispatch({ type: "commit-preview", before, next });
            if (!copyMode) return;
            const priorIds = new Set(before.objects.map((object) => object.id));
            const copiedIds = next.objects.filter((object) => !priorIds.has(object.id)).map((object) => object.id);
            if (!copiedIds.length) return;
            setSelectedObjectIds(copiedIds);
            setSelectedEntityKeys(copiedIds.map((id) => cadEntityKey({ id, kind: "box" })));
            setSelectedObjectId(copiedIds.at(-1) ?? null);
            setSelectedFaceIndex(null);
            setFileNotice({ text: `Placed ${copiedIds.length} copied object${copiedIds.length === 1 ? "" : "s"}.`, tone: "success" });
          }}
        />
        {modelEntityCount === 0 && showStartGuide && !arcMode && !boundaryMode && !circleMode && !lineMode && !polylineMode && !rectangleMode ? (
          <section className="empty-plan-guide" aria-label="New plan workflow">
            <button className="empty-plan-close" type="button" onClick={() => setShowStartGuide(false)} aria-label="Dismiss new plan guide">×</button>
            <header><span>NEW PLAN · TOP VIEW</span><strong>Set the building defaults, then draw the plan.</strong><p>The model space is intentionally blank. Story settings control floor depth and ceiling height; Rooms can override those defaults later.</p></header>
            <div className="empty-plan-status">
              <div><span>1 · STORY</span><strong>{activeStory.name}</strong><small>{formatArchitectural(activeStory.roughCeilingHeight)} rough ceiling</small></div>
              <div><span>2 · FLOOR</span><strong>{formatArchitectural(assemblyTotalThickness(activeStory.floorStructure))}</strong><small>structural depth</small></div>
              <div><span>3 · WALL</span><strong>{activeWallType.name}</strong><small>{formatArchitectural(assemblyTotalThickness(activeWallType))} total thickness</small></div>
            </div>
            <div className="empty-plan-actions"><button type="button" className="is-primary" onClick={() => setStoryManagerOpen(true)}><b>≋</b><span><strong>Plan Settings</strong><small>Stories, floors, and ceilings</small></span></button><button type="button" onClick={() => setWallTypeManagerOpen(true)}><b>▥</b><span><strong>Wall Types</strong><small>Exterior, Main, and Interior layers</small></span></button><button type="button" onClick={activateWallMode}><b>⌁</b><span><strong>Start Drawing Walls</strong><small>Uses the active Story and Wall Type</small></span></button></div>
            <footer><span><b>1</b> Confirm project settings</span><i>→</i><span><b>2</b> Draw connected Walls</span><i>→</i><span><b>3</b> Detect Rooms</span></footer>
          </section>
        ) : null}
        </div>

        <aside className="model-explorer">
          <div className="panel-heading"><span>MODEL EXPLORER</span><button type="button" aria-label="More model explorer options">···</button></div>
          <div className="explorer-tabs" role="tablist" aria-label="Model explorer views">
            <button type="button" className={explorerTab === "objects" ? "is-active" : ""} role="tab" aria-selected={explorerTab === "objects"} onClick={() => setExplorerTab("objects")}>Objects</button>
            <button type="button" className={explorerTab === "layers" ? "is-active" : ""} role="tab" aria-selected={explorerTab === "layers"} onClick={() => setExplorerTab("layers")}>Layers</button>
            <button type="button" className={explorerTab === "building" ? "is-active" : ""} role="tab" aria-selected={explorerTab === "building"} onClick={() => setExplorerTab("building")}>Building</button>
          </div>
          {explorerTab === "objects" ? (
            <section className="object-browser" aria-label="Project objects">
              <div className="object-browser-heading">
                <div><strong>Entities</strong><span>{editor.present.objects.length + editor.present.lines.length + editor.present.polylines.length + editor.present.circles.length + editor.present.arcs.length}</span></div>
                <div className="entity-add-actions"><button type="button" onClick={arcMode ? finishArcMode : circleMode ? finishCircleMode : lineMode ? finishLineMode : polylineMode ? finishPolylineMode : rectangleMode ? finishRectangleMode : activateLineMode}>{arcMode || circleMode || lineMode || polylineMode || rectangleMode ? "Finish" : "+ Line"}</button><button type="button" onClick={activateWallMode}>+ Wall</button><button type="button" onClick={addBox}>+ Box</button></div>
              </div>
              <div className="object-list">
                {editor.present.objects.map((object) => {
                  const layer = findLayer(editor.present, object.layerId);
                  const group = findGroup(editor.present, object.groupId);
                  const selectable = objectIsSelectable(editor.present, object);
                  return (
                    <button
                      key={object.id}
                      type="button"
                      className={`${selectedObjectIds.includes(object.id) ? "is-selected" : ""}${object.id === selectedObjectId && selectedObjectIds.length > 1 ? " is-primary" : ""}${object.locked ? " is-object-locked" : ""}${selectable ? "" : " is-unavailable"}`}
                      onClick={(event) => {
                        if (!selectable) return;
                        selectObject(object.id, null, event.shiftKey);
                      }}
                      aria-pressed={selectedObjectIds.includes(object.id)}
                      aria-disabled={!selectable}
                      title={!layer?.visible ? "Object layer is hidden" : layer?.locked ? "Object layer is locked" : object.locked ? "Object is locked — select it to unlock" : group ? `Member of ${group.name}` : undefined}
                    >
                      <span className="object-state-markers"><span className="object-layer-swatch" style={{ backgroundColor: layer?.color }} />{object.locked ? <i title="Locked">◆</i> : group ? <i title={group.name}>G</i> : null}</span>
                      <span><strong>{object.name}</strong><small>{group ? `${group.name} · ` : ""}{layer?.name ?? "Default"} · {formatArchitectural(object.dimensions.length)} × {formatArchitectural(object.dimensions.width)}</small></span>
                    </button>
                  );
                })}
                {editor.present.lines.map((line) => {
                  const layer = findLayer(editor.present, line.layerId);
                  const selectable = Boolean(layer?.visible);
                  const selected = selectedEntityKeys.includes(cadEntityKey({ id: line.id, kind: "line" }));
                  return (
                    <button key={line.id} type="button" className={`${selected ? "is-selected" : ""}${line.locked ? " is-object-locked" : ""}${selectable ? "" : " is-unavailable"}`} onClick={(event) => { if (selectable) selectLine(line.id, event.shiftKey); }} aria-pressed={selected} aria-disabled={!selectable} title={!layer?.visible ? "Line layer is hidden" : layer?.locked ? "Line layer is locked — selection is available, editing is not" : line.locked ? "Line is locked — select it to unlock" : undefined}>
                      <span className="object-state-markers"><span className="object-layer-swatch" style={{ backgroundColor: layer?.color }} />{line.locked ? <i title="Locked">◆</i> : null}</span>
                      <span><strong>{line.name}</strong><small>{layer?.name ?? "Default"} · {line.architecturalRole === "wall" ? "Wall" : line.architecturalRole === "foundation-wall" ? "Foundation Wall" : "Line"} · {formatArchitectural(lineLength(line))} · {lineAngle(line)}°</small></span>
                    </button>
                  );
                })}
                {editor.present.polylines.map((polyline) => {
                  const layer = findLayer(editor.present, polyline.layerId);
                  const selectable = Boolean(layer?.visible);
                  const selected = selectedEntityKeys.includes(cadEntityKey({ id: polyline.id, kind: "polyline" }));
                  return <button key={polyline.id} type="button" className={`${selected ? "is-selected" : ""}${polyline.locked ? " is-object-locked" : ""}${selectable ? "" : " is-unavailable"}`} onClick={(event) => { if (selectable) selectPolyline(polyline.id, event.shiftKey); }} aria-pressed={selected} aria-disabled={!selectable}><span className="object-state-markers"><span className="object-layer-swatch" style={{ backgroundColor: layer?.color }} />{polyline.locked ? <i title="Locked">◆</i> : null}</span><span><strong>{polyline.name}</strong><small>{layer?.name ?? "Default"} · {polyline.shape === "rectangle" ? "Rectangle" : polyline.closed ? "Closed polyline" : "Polyline"} · {formatArchitectural(polylineLength(polyline))}</small></span></button>;
                })}
                {editor.present.circles.map((circle) => {
                  const layer = findLayer(editor.present, circle.layerId);
                  const selectable = Boolean(layer?.visible);
                  const selected = selectedEntityKeys.includes(cadEntityKey({ id: circle.id, kind: "circle" }));
                  return <button key={circle.id} type="button" className={`${selected ? "is-selected" : ""}${circle.locked ? " is-object-locked" : ""}${selectable ? "" : " is-unavailable"}`} onClick={(event) => { if (selectable) selectCircle(circle.id, event.shiftKey); }} aria-pressed={selected} aria-disabled={!selectable} title={!layer?.visible ? "Circle layer is hidden" : layer?.locked ? "Circle layer is locked — selection is available, editing is not" : circle.locked ? "Circle is locked — select it to unlock" : undefined}><span className="object-state-markers"><span className="object-layer-swatch" style={{ backgroundColor: layer?.color }} />{circle.locked ? <i title="Locked">◆</i> : null}</span><span><strong>{circle.name}</strong><small>{layer?.name ?? "Default"} · Circle · R {formatArchitectural(circle.radius)}</small></span></button>;
                })}
                {editor.present.arcs.map((arc) => {
                  const layer = findLayer(editor.present, arc.layerId);
                  const selectable = Boolean(layer?.visible);
                  const selected = selectedEntityKeys.includes(cadEntityKey({ id: arc.id, kind: "arc" }));
                  return <button key={arc.id} type="button" className={`${selected ? "is-selected" : ""}${arc.locked ? " is-object-locked" : ""}${selectable ? "" : " is-unavailable"}`} onClick={(event) => { if (selectable) selectArc(arc.id, event.shiftKey); }} aria-pressed={selected} aria-disabled={!selectable} title={!layer?.visible ? "Arc layer is hidden" : layer?.locked ? "Arc layer is locked — selection is available, editing is not" : arc.locked ? "Arc is locked — select it to unlock" : undefined}><span className="object-state-markers"><span className="object-layer-swatch" style={{ backgroundColor: layer?.color }} />{arc.locked ? <i title="Locked">◆</i> : null}</span><span><strong>{arc.name}</strong><small>{layer?.name ?? "Default"} · Arc · R {formatArchitectural(arc.radius)} · {Math.round(arcSweepAngle(arc))}°</small></span></button>;
                })}
              </div>
              {selectedBox ? (
                <div className="object-browser-actions" aria-label="Selected object actions">
                  <button type="button" onClick={copyMode ? finishCopyMode : startCopyMode} disabled={!selectionIsEditable}>{copyMode ? "Finish Copy" : "Copy"}</button>
                  <button type="button" onClick={selectedGroup ? ungroupSelection : createSelectionGroup} disabled={selectedGroup ? !selectionIsEditable : !canCreateGroup}>{selectedGroup ? "Ungroup" : "Group"}</button>
                  <button type="button" className={allSelectedLocked ? "lock-object is-locked" : "lock-object"} onClick={toggleSelectionLock}>{allSelectedLocked ? "Unlock" : "Lock"}</button>
                  <button type="button" className="delete-object" onClick={deleteSelectedObject} disabled={!selectionIsEditable} title={!selectionIsEditable ? "Unlock the selection before deleting" : `Delete ${selectedObjectIds.length} selected object${selectedObjectIds.length === 1 ? "" : "s"}`}>Delete</button>
                </div>
              ) : null}
              {selectedLine ? <div className="object-browser-actions" aria-label="Selected line actions"><button type="button" className={selectedLine.locked ? "lock-object is-locked" : "lock-object"} onClick={toggleSelectedLineLock}>{selectedLine.locked ? "Unlock" : "Lock"}</button><button type="button" className="delete-object" onClick={deleteSelectedLine} disabled={!selectedLineIsEditable}>Delete</button></div> : null}
              {selectedPolyline ? <div className="object-browser-actions" aria-label="Selected polyline actions"><button type="button" className={selectedPolyline.locked ? "lock-object is-locked" : "lock-object"} onClick={toggleSelectedPolylineLock}>{selectedPolyline.locked ? "Unlock" : "Lock"}</button><button type="button" className="delete-object" onClick={deleteSelectedPolyline} disabled={!selectedPolylineIsEditable}>Delete</button></div> : null}
              {selectedCircle ? <div className="object-browser-actions" aria-label="Selected Circle actions"><button type="button" className={selectedCircle.locked ? "lock-object is-locked" : "lock-object"} onClick={toggleSelectedCircleLock}>{selectedCircle.locked ? "Unlock" : "Lock"}</button><button type="button" className="delete-object" onClick={deleteSelectedCircle} disabled={!selectedCircleIsEditable}>Delete</button></div> : null}
              {selectedArc ? <div className="object-browser-actions" aria-label="Selected Arc actions"><button type="button" className={selectedArc.locked ? "lock-object is-locked" : "lock-object"} onClick={toggleSelectedArcLock}>{selectedArc.locked ? "Unlock" : "Lock"}</button><button type="button" className="delete-object" onClick={deleteSelectedArc} disabled={!selectedArcIsEditable}>Delete</button></div> : null}
            </section>
          ) : explorerTab === "layers" ? (
            <section className="layer-manager" aria-label="Project layers">
              <div className="layer-manager-toolbar"><div><span>Current layer</span><strong>{activeLayer?.name ?? "Default"}</strong></div><button type="button" onClick={addNewLayer}>+ Layer</button></div>
              <label className="layer-search"><span aria-hidden="true">⌕</span><input value={layerFilter} onChange={(event) => setLayerFilter(event.target.value)} placeholder="Search layers" aria-label="Search layers" spellCheck={false} /></label>
              <div className="layer-grid" role="table" aria-label="Layer properties grid">
                <div className="layer-column-headings" role="row">
                  <span role="columnheader" title="Current layer">C</span>
                  <span role="columnheader">Color</span>
                  <span role="columnheader">Name</span>
                  <span role="columnheader" title="Object count">Objects</span>
                  <span role="columnheader">Show</span>
                  <span role="columnheader">Lock</span>
                  <span role="columnheader" aria-label="Delete" />
                </div>
                <div className="layer-list" role="rowgroup">
                {filteredLayers.map((layer) => {
                  const objectCount = editor.present.objects.filter((object) => object.layerId === layer.id).length + editor.present.lines.filter((line) => line.layerId === layer.id).length + editor.present.polylines.filter((polyline) => polyline.layerId === layer.id).length + editor.present.circles.filter((circle) => circle.layerId === layer.id).length + editor.present.arcs.filter((arc) => arc.layerId === layer.id).length;
                  const isActive = layer.id === editor.present.activeLayerId;
                  const canDelete = layer.id !== DEFAULT_LAYER_ID && !isActive && objectCount === 0;
                  return (
                    <div className={isActive ? "layer-row is-active" : "layer-row"} key={layer.id} role="row">
                      <div className="layer-cell current-cell" role="cell"><button className="make-current" type="button" onClick={() => activateLayer(layer.id)} aria-label={`Make ${layer.name} current`} title={isActive ? "Current layer" : "Make current"}>{isActive ? "✓" : "○"}</button></div>
                      <div className="layer-cell color-cell" role="cell"><span className="layer-swatch" style={{ backgroundColor: layer.color }} /></div>
                      <div className="layer-cell name-cell" role="cell"><LayerNameField key={`${layer.id}:${layer.name}`} name={layer.name} onRename={(name) => renameProjectLayer(layer.id, name)} /></div>
                      <div className="layer-cell count-cell" role="cell">{objectCount}</div>
                      <div className="layer-cell toggle-cell" role="cell"><button className={layer.visible ? "layer-toggle is-on" : "layer-toggle"} type="button" onClick={() => changeLayerVisibility(layer.id)} disabled={isActive} aria-label={`${layer.visible ? "Hide" : "Show"} ${layer.name}`} title={isActive ? "Current layer must stay visible" : layer.visible ? "Hide layer" : "Show layer"}>{layer.visible ? "●" : "○"}</button></div>
                      <div className="layer-cell toggle-cell" role="cell"><button className={layer.locked ? "layer-toggle is-locked" : "layer-toggle"} type="button" onClick={() => changeLayerLock(layer.id)} disabled={isActive} aria-label={`${layer.locked ? "Unlock" : "Lock"} ${layer.name}`} title={isActive ? "Current layer must stay unlocked" : layer.locked ? "Unlock layer" : "Lock layer"}>{layer.locked ? "◆" : "◇"}</button></div>
                      <div className="layer-cell delete-cell" role="cell"><button className="delete-layer" type="button" onClick={() => removeLayer(layer.id)} disabled={!canDelete} aria-label={`Delete ${layer.name}`} title={canDelete ? "Delete empty layer" : "Only empty, non-current custom layers can be deleted"}>×</button></div>
                    </div>
                  );
                })}
                {!filteredLayers.length ? <div className="layer-empty-row">No layers match “{layerFilter.trim()}”.</div> : null}
                </div>
              </div>
              <p className="layer-manager-note">Click C to make a layer current. The current layer remains visible and unlocked.</p>
            </section>
          ) : (
            <section className="building-browser" aria-label="Building structure">
              <header className="building-browser-header"><div><span>Active Story</span><strong>{activeStory.name}</strong></div><button type="button" onClick={() => setStoryManagerOpen(true)}>Edit Setup</button></header>
              <section className="building-browser-section">
                <header><strong>Stories</strong><span>{editor.present.building.stories.length}</span></header>
                {calculateStoryElevations(editor.present.building).map((calculation) => {
                  const story = editor.present.building.stories.find((candidate) => candidate.id === calculation.storyId);
                  if (!story) return null;
                  return <button type="button" className={story.id === activeStory.id ? "building-browser-row is-active" : "building-browser-row"} key={story.id} onClick={() => setStoryManagerOpen(true)}><span className="building-browser-icon">≋</span><span><strong>{story.name}</strong><small>Floor {formatSignedArchitectural(calculation.roughFloorElevation)} · Ceiling {formatSignedArchitectural(calculation.roughCeilingElevation)}</small></span>{story.id === activeStory.id ? <b>ACTIVE</b> : null}</button>;
                })}
              </section>
              <section className="building-browser-section">
                <header><strong>Wall Types</strong><span>{editor.present.building.wallTypes.length}</span></header>
                {editor.present.building.wallTypes.map((wallType) => <button type="button" className={wallType.id === activeWallType.id ? "building-browser-row is-active" : "building-browser-row"} key={wallType.id} onClick={() => setWallTypeManagerOpen(true)}><span className="building-browser-icon">▥</span><span><strong>{wallType.name}</strong><small>{wallType.wallLocation === "interior" ? "Interior" : "Exterior"} · {wallType.wallStructuralRole === "non-bearing" ? "Non-bearing" : "Bearing"} · {formatArchitectural(assemblyTotalThickness(wallType))}</small></span>{wallType.id === activeWallType.id ? <b>ACTIVE</b> : null}</button>)}
              </section>
              <section className="building-browser-section">
                <header><strong>Door &amp; Window Types</strong><span>{editor.present.building.openingTypes.length}</span></header>
                {editor.present.building.openingTypes.map((type) => <button type="button" className={type.id === (type.kind === "door" ? editor.present.building.activeDoorTypeId : editor.present.building.activeWindowTypeId) ? "building-browser-row is-active" : "building-browser-row"} key={type.id} onClick={() => setOpeningTypeManagerOpen(true)}><span className="building-browser-icon">▣</span><span><strong>{type.name}</strong><small>{type.kind === "door" ? "Door" : "Window"} · RO {formatArchitectural(type.roughWidth)} × {formatArchitectural(type.roughHeight)} · {type.kingStudCountPerSide}K/{type.jackStudCountPerSide}J each side</small></span>{type.id === (type.kind === "door" ? editor.present.building.activeDoorTypeId : editor.present.building.activeWindowTypeId) ? <b>ACTIVE</b> : null}</button>)}
              </section>
              <section className="building-browser-section">
                <header><strong>Wall Framing</strong><span>{editor.present.building.wallFraming.enabled ? "ON" : "OFF"}</span></header>
                <button type="button" className={editor.present.building.wallFraming.showInModel ? "building-browser-row is-active" : "building-browser-row"} onClick={() => setFramingManagerOpen(true)}><span className="building-browser-icon">╫</span><span><strong>{formatArchitectural(editor.present.building.wallFraming.studSpacing)} on center</strong><small>{editor.present.building.wallFraming.cornerStyle === "three-stud" ? "3-stud corners" : "2-stud corners"} · {editor.present.building.wallFraming.partitionBackingStyle === "ladder" ? "ladder backing" : editor.present.building.wallFraming.partitionBackingStyle === "three-stud" ? "3-stud backing" : "no backing"}</small></span>{editor.present.building.wallFraming.showInModel ? <b>VISIBLE</b> : null}</button>
              </section>
              <section className="building-browser-section">
                <header><strong>Rooms · {activeStory.name}</strong><span>{activeStoryRoomCount}</span></header>
                {editor.present.rooms.filter((room) => room.storyId === activeStory.id).map((room) => <button type="button" className="building-browser-row" key={room.id} onClick={() => setRoomManagerOpen(true)}><span className="building-browser-icon">▦</span><span><strong>{room.name}</strong><small>{(polylineArea(room.boundary) / 144).toLocaleString(undefined, { maximumFractionDigits: 2 })} sq ft · {room.boundaryWallIds.length} Walls · {room.platformOpenings.length} Openings</small></span></button>)}
                {!activeStoryRoomCount ? <div className="building-browser-empty"><span>No Rooms detected yet.</span><button type="button" onClick={() => setRoomManagerOpen(true)}>Open Room Manager</button></div> : null}
              </section>
              <div className="building-browser-actions"><button type="button" onClick={() => setStoryManagerOpen(true)}>Story Settings</button><button type="button" onClick={() => setWallTypeManagerOpen(true)}>Wall Types</button><button type="button" onClick={() => setFramingManagerOpen(true)}>Framing</button><button type="button" onClick={() => setRoomManagerOpen(true)}>Rooms</button></div>
            </section>
          )}
        </aside>
      </section>

      <div className="commandbar">
        <button type="button" aria-label="Command history">⌄</button>
        <strong>Command:</strong>
        <span>{commandText}</span>
        <input
          ref={commandInputRef}
          value={commandDraft}
          onChange={(event) => setCommandDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submitCommand();
            }
          }}
          aria-label="Command input"
              placeholder={boundaryMode ? "Click inside a closed area · Escape cancels" : arcMode ? arcCommandPlaceholder(arcMethod, arcPoints.length) : circleMode ? circleMethod === "tangent-tangent-radius" ? circlePoints.length < 2 ? `Select ${circlePointStage(circleMethod, circlePoints.length)}` : "Enter radius or click to set radius" : circleMethod === "tangent-tangent-tangent" ? `Select ${circlePointStage(circleMethod, circlePoints.length)}` : `${circlePointStage(circleMethod, circlePoints.length)}${circlePoints.length ? ", distance, or @X,Y" : " X,Y or X,Y,Z"}` : lineMode ? lineAnchor ? "Distance, next point, U, or C" : "First point X,Y or X,Y,Z" : offsetMode ? `Offset distance ${formatArchitectural(offsetDistance)} · type a new distance or click a side` : lengthenMode ? lengthenMethod === "dynamic" ? "Pick endpoint, then click its new position · D/T/P changes method" : `Lengthen ${lengthenMethod} ${lengthenMethod === "percent" ? `${lengthenValue}%` : formatSignedArchitectural(lengthenValue)} · enter value or pick endpoint` : breakMode ? breakStage === 0 ? "Select a curve · Escape cancels" : breakStage === 1 ? "Select the break point · Escape cancels" : "Select the second break point · Escape cancels" : chamferMode ? chamferDistancePrompt === 1 ? "Enter first Chamfer distance" : chamferDistancePrompt === 2 ? "Enter second Chamfer distance" : `Chamfer ${formatArchitectural(chamferFirstDistance)} × ${formatArchitectural(chamferSecondDistance)} · D changes distances · select ${chamferStage === 0 ? "first" : "second"} Line` : filletMode ? `Fillet radius ${formatArchitectural(filletRadius)} · R 6" changes it · select ${filletStage === 0 ? "first" : "second"} Line` : trimMode ? "Click the portion to trim · Escape cancels" : extendMode ? "Click near the endpoint to extend · Escape cancels" : stretchMode ? stretchTargets.length ? "Pick base point, then target · Escape cancels" : "Draw crossing window · Escape cancels" : polylineMode ? polylineAnchor ? polylineSegmentMode === "arc" ? "Arc through/end point · L line · W width · U/C" : "Distance/vertex · A arc · W width · U/C" : "First vertex X,Y or X,Y,Z" : rectangleMode ? rectangleAnchor ? rectangleMethod === "corners" ? `Opposite corner, @X,Y, or 12' x 8'` : "Click or enter a point to choose the quadrant" : "First corner X,Y or X,Y,Z" : lastCommandName ? `Enter repeats ${lastCommandName === "arc" ? "Arc" : lastCommandName === "circle" ? "Circle" : lastCommandName === "line" ? "Line" : lastCommandName === "wall" ? "Wall" : lastCommandName === "foundation-wall" ? "Foundation Wall" : lastCommandName === "polyline" ? "Polyline" : "Rectangle"} · W, FW, L, PL, REC, C, A, BOUNDARY, M, CO, MI, O, TR, EX, BR, BP, J, X, LEN, CHA, F, S, RO, or SC starts a command` : "Type W, FW, L, PL, REC, C, A, BOUNDARY, M, CO, MI, O, TR, EX, BR, BP, J, X, LEN, CHA, F, S, RO, or SC to start a command"}
          spellCheck={false}
        />
      </div>
      <footer className="statusbar">
        <nav className="space-tabs" aria-label="Model and layouts"><button type="button" className="space-menu" aria-label="Space menu">☰</button><button type="button" className="is-active">Model</button><button type="button" disabled title="Layouts are planned">Layout 1 <small>planned</small></button><button type="button" disabled aria-label="Add layout">＋</button></nav>
        <div className="status-items"><span>{editor.present.objects.length} BOX{editor.present.objects.length === 1 ? "" : "ES"} · {editor.present.lines.length} LINE{editor.present.lines.length === 1 ? "" : "S"} · {editor.present.polylines.length} POLYLINE{editor.present.polylines.length === 1 ? "" : "S"} · {editor.present.circles.length} CIRCLE{editor.present.circles.length === 1 ? "" : "S"} · {editor.present.arcs.length} ARC{editor.present.arcs.length === 1 ? "" : "S"}</span><span>Story: {activeStory.name}</span><span>Layer: {activeLayer?.name ?? "Default"}</span><span>FT-IN</span><button type="button" className={cadDraftingSettings.gridVisible ? "status-toggle grid-toggle is-on" : "status-toggle grid-toggle"} onClick={() => setCadDraftingSettings((current) => ({ ...current, gridVisible: !current.gridVisible }))} title="Grid Display (F7)" aria-label="Toggle model space grid" aria-pressed={cadDraftingSettings.gridVisible}>GRID <small>{formatDraftingSpacing(cadDraftingSettings.gridSpacing)}</small></button><span>Snap {formatDraftingSpacing(cadDraftingSettings.snapIncrement)}</span><button type="button" className={cadDraftingSettings.objectSnapEnabled ? "status-toggle is-on" : "status-toggle"} onClick={() => setCadDraftingSettings((current) => ({ ...current, objectSnapEnabled: !current.objectSnapEnabled }))} title="Object Snap (F3)">OSNAP</button><button type="button" className={cadDraftingSettings.orthoEnabled ? "status-toggle is-on" : "status-toggle"} onClick={() => setCadDraftingSettings((current) => ({ ...current, orthoEnabled: !current.orthoEnabled }))} title="Ortho Mode (F8)">ORTHO</button><button type="button" className={cadDraftingSettings.polarEnabled ? "status-toggle is-on" : "status-toggle"} onClick={() => setCadDraftingSettings((current) => ({ ...current, polarEnabled: !current.polarEnabled }))} title="Polar Tracking (F10)">POLAR</button><span>ELEV {formatSignedArchitectural(cadDraftingSettings.activeElevation)}</span><span>{viewTarget.label}</span><span title="Work is automatically recoverable on this device">RECOVERY ON</span></div>
      </footer>
      {storyManagerOpen ? <StoryManagerDialog building={editor.present.building} onCancel={() => setStoryManagerOpen(false)} onSave={applyStorySettings} /> : null}
      {foundationManagerOpen ? <FoundationWallManagerDialog building={editor.present.building} onCancel={() => setFoundationManagerOpen(false)} onSave={applyFoundationWallTypes} /> : null}
      {framingManagerOpen ? <WallFramingManagerDialog building={editor.present.building} onCancel={() => setFramingManagerOpen(false)} onSave={applyWallFraming} /> : null}
      {openingTypeManagerOpen ? <OpeningTypeManagerDialog document={editor.present} onCancel={() => setOpeningTypeManagerOpen(false)} onSave={applyOpeningTypes} /> : null}
      {wallTypeManagerOpen ? <WallTypeManagerDialog building={editor.present.building} onCancel={() => setWallTypeManagerOpen(false)} onSave={applyWallTypes} /> : null}
      {roomManagerOpen ? <RoomManagerDialog document={editor.present} onCancel={() => setRoomManagerOpen(false)} onSave={applyRoomSettings} /> : null}
    </main>
  );
}
