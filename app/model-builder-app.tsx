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
  type ChangeEvent,
  type CSSProperties,
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
  resizeLineFromFixedEndpoint,
  snapLinePoint,
  type LineFixedEndpoint,
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
  addProductObject,
  alignBoxObjects,
  assignObjectToLayer,
  assignArcToLayer,
  assignCircleToLayer,
  assignLineToLayer,
  assignModelEntityToStory,
  assignPolylineToLayer,
  assignFoundationWallType,
  assignRoofPlaneType,
  assignWallFoundationSupport,
  assignWallOpeningType,
  assignWallType,
  activateLayerSet,
  activateSavedPlanView,
  activateStoryPlanView,
  cloneDocument,
  arcIsEditable,
  circleIsEditable,
  copyModelEntities,
  copyBoxObjects,
  createFloorPlatformFromPolyline,
  createRoofPlaneFromWall,
  addRoofPlaneBoundaryVertex,
  createFoundationWallFromLine,
  createWallFromLine,
  duplicateLayerSet,
  createBoundaryPolylineObject,
  continuePlatformOpening,
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
  joinRoofPlanes,
  lineIsEditable,
  polylineIsEditable,
  renameGroup,
  renameArcObject,
  renameLayer,
  renameLayerSet,
  renameLineObject,
  renamePolylineObject,
  renameBoxObject,
  renameCircleObject,
  removeFloorPlatformRole,
  removeRoofPlaneRole,
  removeWallRole,
  refreshRoomsForStory,
  resolveReferenceStoryId,
  ROOM_TYPES,
  STANDARD_LAYER_IDS,
  resolveOpeningComponents,
  roomObjectIsValid,
  roomAnnotationIsValid,
  rotateModelEntities,
  scaleModelEntities,
  simplifyRoofPlaneBoundary,
  stretchModelEntities,
  selectionIdsForObject,
  setActiveLayer,
  setActiveLayerSetFillsVisible,
  setArcLocked,
  setBoxObjectsLocked,
  setBoxObjectPosition,
  setCircleLocked,
  setLineLocked,
  setPolylineLocked,
  savePlanView,
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
  updateRoomAnnotation,
  updateRoomObject,
  updateLayerAppearance,
  updateModelEntityFillOverride,
  updateSavedPlanView,
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
  roofPlaneGeometry,
  roofPlaneLayerTakeoffGeometry,
  roofPlaneReferenceDimensions,
  roofPlaneSurfaceElevation,
  roofPlaneTakeoffGeometry,
  matchRoofPlaneFascia,
  updateRoofPlane,
  updateRoofPlaneFasciaTop,
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
  type LayerSet,
  type OpeningComponentOverride,
  type ProjectInformation,
  type ProjectType,
  type ReferenceDisplayMode,
  type RoomObject,
  type RoomAnnotationObject,
  type RoomHorizontalPlatformSolution,
  type SavedPlanView,
  type FoundationWallVerticalExtent,
  type WallVerticalExtent,
} from "@/lib/document-model";
import {
  addBuildingStory,
  applyFloorStructurePreset,
  assemblyTotalThickness,
  buildingStructureIsValid,
  calculateRoofReferenceDimensions,
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
  defaultWallTypeIdForUse,
  foundationSillStackHeight,
  FOUNDATION_WALL_CONDITIONS,
  MAXIMUM_WALL_OPENING_TYPE_COUNT,
  MAXIMUM_WALL_HEADER_TYPE_COUNT,
  MAXIMUM_PRODUCT_OBJECT_TYPE_COUNT,
  MAXIMUM_ROOF_TYPE_COUNT,
  removeBuildingStory,
  recommendedWallHeaderTypeId,
  resolveWallHeaderType,
  wallDefaultHeaderTypeId,
  wallTypeMatchesUse,
  wallUseForType,
  wallLayerGroupThickness,
  wallLayerDistanceRanges,
  wallReferenceDistanceFromExterior,
  wallFramingSettingsAreValid,
  roofSettingsAreValid,
  ROOF_LAYER_SIDES,
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
  type FloorStructurePreset,
  type LayeredAssembly,
  type OpeningAssemblyComponent,
  type ManufacturerProductSource,
  type ProductAssetReference,
  type ProductObjectCategory,
  type RoofFramingMethod,
  type RoofSettings,
  type RoofLayerSide,
  type StoryPurpose,
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
  type WallUse,
} from "@/lib/building-stories";
import type { ProductLibraryTarget } from "@/lib/product-library";
import {
  MATERIAL_CATEGORIES,
  MATERIAL_CATEGORY_LABELS,
  architecturalMaterialByName,
  architecturalMaterialsForRole,
} from "@/lib/material-library";
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
import { roofFramingLayout } from "@/lib/roof-framing";
import { nearestParallelWallClearDimensions, setParallelWallDimension } from "@/lib/wall-clear-dimensions";
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
  type ModelBuilderProject,
} from "@/lib/project-file";
import {
  parseRecentProjects,
  RECENT_PROJECTS_STORAGE_KEY,
  describeRecentProjectSkip,
  MAXIMUM_RECENT_PROJECT_BYTES,
  rememberRecentProject,
  type RecentProjectSkip,
  removeRecentProject,
  serializeRecentProjects,
  type RecentProjectRecord,
} from "@/lib/recent-projects";
import {
  MAXIMUM_PRODUCT_PACKAGE_BYTES,
  PRODUCT_PACKAGE_EXTENSION,
  parseProductPackage,
} from "@/lib/product-package";
import { ProductLibraryDialog } from "@/features/products/product-library-dialog";
import { StartDashboard } from "@/features/start-dashboard";
import {
  ESCAPE_CANCEL_NOTICES,
  SELECT_TOOL,
  toolAfterSelection,
  toolFlags,
  type ActiveTool,
  type BreakMode,
} from "@/features/tools/tool-types";
import { ProjectSetupDialog } from "@/features/dialogs/project-setup-dialog";
import { NameEntryDialog } from "@/features/dialogs/name-entry-dialog";
import { ReferenceDisplayDialog } from "@/features/dialogs/reference-display-dialog";
import { RoomManagerDialog } from "@/features/dialogs/room-manager-dialog";
import { RoofDefaultsDialog } from "@/features/dialogs/roof-defaults-dialog";
import { WallFramingManagerDialog } from "@/features/dialogs/wall-framing-manager-dialog";
import { OpeningTypeManagerDialog } from "@/features/dialogs/opening-type-manager-dialog";
import { FoundationWallManagerDialog } from "@/features/dialogs/foundation-wall-manager-dialog";
import { WallTypeManagerDialog } from "@/features/dialogs/wall-type-manager-dialog";
import { StoryAssemblyEditor, StoryDimensionInput } from "@/features/dialogs/assembly-editor";
import { StoryManagerDialog } from "@/features/dialogs/story-manager-dialog";
import { titleCase } from "@/lib/text";
import {
  ASSEMBLY_ROLE_LABELS,
  FLOOR_STRUCTURE_PRESET_LABELS,
  FOUNDATION_CONDITION_LABELS,
  OPENING_PREVIEW_ROLE_COLORS,
  PROJECT_TYPE_LABELS,
  ROOF_LAYER_SIDE_LABELS,
  STORY_PURPOSE_HELP,
  STORY_PURPOSE_LABELS,
  WALL_LAYER_GROUP_LABELS,
  WALL_PREVIEW_REFERENCE_CODES,
  WALL_REFERENCE_LINE_LABELS,
  WALL_USE_LABELS,
} from "@/features/properties/building-labels";
import {
  ArcGeometryControl,
  CircleGeometryControl,
  FoundationWallGeometryControl,
  LineGeometryControl,
  PolylineGeometryControl,
  RectangleGeometryControl,
  WallGeometryControl,
  WallOpeningComponentMaterialField,
  WallOpeningNameField,
  WallOpeningsControl,
} from "@/features/properties/geometry-controls";
import {
  AlignmentControl,
  BreakControl,
  ChamferControl,
  CopyObjectsControl,
  ExactMoveControl,
  ExplodeControl,
  FilletControl,
  JoinControl,
  LengthenControl,
  MirrorControl,
  MoveObjectControl,
  OffsetControl,
  RotationControl,
  ScaleControl,
  StretchControl,
  TrimExtendControl,
} from "@/features/properties/modify-tool-controls";
import {
  EditableObjectName,
  LayerColorField,
  LayerNameField,
} from "@/features/properties/naming-fields";
import {
  ArchitecturalPropertyField,
  DIMENSION_LABELS,
  DimensionField,
  LineCoordinateField,
  NumberPropertyField,
  PositionField,
  PropertyGridRow,
  PropertyGridSection,
  RoofPlaneFasciaMatchControl,
} from "@/features/properties/property-fields";
import {
  applyPreferredProductRepresentations,
  clearPreferredProductRepresentations,
} from "@/features/products/product-representation-renderer";
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

type StoryDisplayRole = "active" | "reference" | "hidden";

function activeReferenceStoryId(document: ModelDocument) {
  const view = document.savedPlanViews.find((candidate) => candidate.id === document.activeSavedPlanViewId);
  return view ? resolveReferenceStoryId(view, document.building.stories.map((story) => story.id)) : null;
}

function storyDisplayRole(document: ModelDocument, viewTarget: ViewTarget, storyId: string): StoryDisplayRole {
  if (viewTarget.id !== "top") return "active";
  if (storyId === document.building.activeStoryId) return "active";
  return storyId === activeReferenceStoryId(document) ? "reference" : "hidden";
}

function displayLayerForStory(document: ModelDocument, viewTarget: ViewTarget, storyId: string, layerId: string | null | undefined) {
  const base = findLayer(document, layerId ?? null);
  if (!base || storyDisplayRole(document, viewTarget, storyId) !== "reference") return base;
  const savedView = document.savedPlanViews.find((candidate) => candidate.id === document.activeSavedPlanViewId);
  const referenceSet = document.layerSets.find((set) => set.id === savedView?.referenceLayerSetId);
  const state = referenceSet?.layers.find((candidate) => candidate.id === base.id);
  return state ? { ...base, ...state } : base;
}

function resolvedStoryFill(document: ModelDocument, viewTarget: ViewTarget, storyId: string, layerId: string | null | undefined, object?: FillStyledObject | null) {
  if (storyDisplayRole(document, viewTarget, storyId) !== "reference") return resolvedObjectFill(document, layerId, object);
  const savedView = document.savedPlanViews.find((candidate) => candidate.id === document.activeSavedPlanViewId);
  const layer = displayLayerForStory(document, viewTarget, storyId, layerId);
  const referenceSet = document.layerSets.find((set) => set.id === savedView?.referenceLayerSetId);
  const override = object?.fillOverride ?? null;
  return {
    color: override?.color ?? layer?.fillColor ?? layer?.color ?? "#7f95aa",
    visible: Boolean(savedView?.referenceFillsVisible && (referenceSet?.fillsVisible ?? true) && (override?.visible ?? layer?.fillVisible ?? true)),
  };
}

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
  onRoomLabelOpen: (roomId: string) => void;
  onRoomLabelTypeChange: (roomId: string, roomType: string) => void;
  onRoomCeilingHeightChange: (roomId: string, height: number) => boolean;
  onWallClearanceChange: (selectedWallId: string, referenceWallId: string, distance: number) => boolean;
  onWallLengthChange: (lineId: string, fixedEndpoint: LineFixedEndpoint, length: number) => boolean;
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

type TemporaryWallClearDimensionScreen = {
  distance: number;
  from: ScreenPoint;
  referenceWallId: string;
  side: "left" | "right";
  to: ScreenPoint;
};

type TemporaryWallDimensionScreen = {
  clearDimensions: TemporaryWallClearDimensionScreen[];
  dimensionEnd: ScreenPoint;
  dimensionStart: ScreenPoint;
  label: ScreenPoint;
  lineId: string;
  wallEnd: ScreenPoint;
  wallStart: ScreenPoint;
};

function readableScreenDimensionAngle(from: ScreenPoint, to: ScreenPoint): number {
  let angle = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
  if (angle >= 90) angle -= 180;
  if (angle < -90) angle += 180;
  return angle;
}

function TemporaryWallDimension({
  length,
  onClearanceCommit,
  onCommit,
  screen,
}: {
  length: number;
  onClearanceCommit: (referenceWallId: string, distance: number) => boolean;
  onCommit: (fixedEndpoint: LineFixedEndpoint, length: number) => boolean;
  screen: TemporaryWallDimensionScreen;
}) {
  const [draft, setDraft] = useState(formatArchitectural(length));
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [fixedEndpoint, setFixedEndpoint] = useState<LineFixedEndpoint>("start");

  const commit = () => {
    const parsed = parseArchitectural(draft);
    if (parsed === null || parsed < 1 / 16) {
      setError("Enter a Wall length of at least 1/16 inch.");
      return;
    }
    if (!onCommit(fixedEndpoint, snapToSixteenth(parsed))) {
      setError("That length conflicts with the Wall, its openings, or a lock.");
      return;
    }
    setError("");
    setEditing(false);
  };

  const selectFixedEndpoint = (endpoint: LineFixedEndpoint) => {
    setFixedEndpoint(endpoint);
    setError("");
  };

  return (
    <div className="temporary-wall-dimension" aria-label="Selected Wall temporary dimension">
      <svg aria-hidden="true">
        <line className="temporary-wall-extension" x1={screen.wallStart.x} y1={screen.wallStart.y} x2={screen.dimensionStart.x} y2={screen.dimensionStart.y} />
        <line className="temporary-wall-extension" x1={screen.wallEnd.x} y1={screen.wallEnd.y} x2={screen.dimensionEnd.x} y2={screen.dimensionEnd.y} />
        <line className="temporary-wall-dimension-line" x1={screen.dimensionStart.x} y1={screen.dimensionStart.y} x2={screen.dimensionEnd.x} y2={screen.dimensionEnd.y} />
        {screen.clearDimensions.map((dimension) => <g key={`${dimension.side}:${dimension.referenceWallId}`}>
          <line className="temporary-wall-clear-line" x1={dimension.from.x} y1={dimension.from.y} x2={dimension.to.x} y2={dimension.to.y} />
          <circle className="temporary-wall-clear-witness" cx={dimension.from.x} cy={dimension.from.y} r="2.5" />
          <circle className="temporary-wall-clear-witness" cx={dimension.to.x} cy={dimension.to.y} r="2.5" />
        </g>)}
      </svg>
      {screen.clearDimensions.map((dimension) => <TemporaryWallClearDimensionInput
        key={`${dimension.side}:${dimension.referenceWallId}`}
        dimension={dimension}
        onCommit={(distance) => onClearanceCommit(dimension.referenceWallId, distance)}
      />)}
      <button
        type="button"
        className={fixedEndpoint === "start" ? "temporary-wall-anchor is-fixed" : "temporary-wall-anchor"}
        style={{ left: screen.dimensionStart.x, top: screen.dimensionStart.y }}
        onClick={() => selectFixedEndpoint("start")}
        aria-label="Keep Wall start fixed"
        aria-pressed={fixedEndpoint === "start"}
        title="Keep Wall start fixed"
      >S</button>
      <button
        type="button"
        className={fixedEndpoint === "end" ? "temporary-wall-anchor is-fixed" : "temporary-wall-anchor"}
        style={{ left: screen.dimensionEnd.x, top: screen.dimensionEnd.y }}
        onClick={() => selectFixedEndpoint("end")}
        aria-label="Keep Wall end fixed"
        aria-pressed={fixedEndpoint === "end"}
        title="Keep Wall end fixed"
      >E</button>
      <form
        className={error ? "temporary-wall-dimension-input has-error" : "temporary-wall-dimension-input"}
        style={{
          left: screen.label.x,
          top: screen.label.y,
          transform: `translate(-50%, -50%) rotate(${readableScreenDimensionAngle(screen.dimensionStart, screen.dimensionEnd)}deg)`,
        }}
        onSubmit={(event) => { event.preventDefault(); commit(); }}
        title={`${fixedEndpoint === "start" ? "Start" : "End"} endpoint stays fixed`}
      >
        <span>{fixedEndpoint === "start" ? "S" : "E"} FIXED</span>
        <input
          value={editing ? draft : formatArchitectural(length)}
          onChange={(event) => { setDraft(event.target.value); setError(""); }}
          onFocus={(event) => { setDraft(formatArchitectural(length)); setEditing(true); event.currentTarget.select(); }}
          onBlur={() => { setEditing(false); setError(""); }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setError("");
              setEditing(false);
              event.currentTarget.blur();
            }
          }}
          aria-label="Selected Wall length"
          spellCheck={false}
        />
        <b>↵</b>
        {error ? <small role="alert">{error}</small> : null}
      </form>
    </div>
  );
}

function TemporaryWallClearDimensionInput({
  dimension,
  onCommit,
}: {
  dimension: TemporaryWallClearDimensionScreen;
  onCommit: (distance: number) => boolean;
}) {
  const [draft, setDraft] = useState(formatArchitectural(dimension.distance));
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  const commit = () => {
    const parsed = parseArchitectural(draft);
    if (parsed === null || parsed < 1 / 16) {
      setError("Enter a distance of at least 1/16 inch.");
      return;
    }
    if (!onCommit(snapToSixteenth(parsed))) {
      setError("That distance conflicts with a connected Wall, opening, or lock.");
      return;
    }
    setError("");
    setEditing(false);
  };

  return (
    <form
      className={error ? "temporary-wall-clear-input has-error" : "temporary-wall-clear-input"}
      style={{
        left: (dimension.from.x + dimension.to.x) / 2,
        top: (dimension.from.y + dimension.to.y) / 2,
        transform: `translate(-50%, -50%) rotate(${readableScreenDimensionAngle(dimension.from, dimension.to)}deg)`,
      }}
      onSubmit={(event) => { event.preventDefault(); commit(); }}
      title="Dimensions use the exterior face of each Wall Main layer; the reference Wall stays fixed"
    >
      <span>DIM</span>
      <input
        value={editing ? draft : formatArchitectural(dimension.distance)}
        onChange={(event) => { setDraft(event.target.value); setError(""); }}
        onFocus={(event) => { setDraft(formatArchitectural(dimension.distance)); setEditing(true); event.currentTarget.select(); }}
        onBlur={() => { setEditing(false); setError(""); }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setError("");
            setEditing(false);
            event.currentTarget.blur();
          }
        }}
        aria-label="Temporary Wall-to-Wall dimension"
        spellCheck={false}
      />
      <b>↵</b>
      {error ? <small role="alert">{error}</small> : null}
    </form>
  );
}

type ViewportObject = {
  edges: THREE.LineSegments;
  materials: THREE.MeshStandardMaterial[];
  mesh: THREE.Mesh;
};

/**
 * The geometry half of a viewport line view. The update* helpers below only
 * rewrite buffers, so they accept this narrower shape. That lets transient
 * preview views be passed without inventing a material to satisfy the type.
 */
type ViewportLineGeometry = {
  fill?: THREE.Mesh;
  fillGeometry?: THREE.BufferGeometry;
  geometry: THREE.BufferGeometry;
  line: THREE.Line;
};

/** A fully owned line view, including the materials this module disposes. */
type ViewportLine = ViewportLineGeometry & {
  fillMaterial?: THREE.MeshBasicMaterial;
  material: THREE.LineDashedMaterial;
};

type FloorPlatformView = {
  edgeMaterials: THREE.LineBasicMaterial[];
  edges: THREE.LineSegments[];
  group: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
  meshes: THREE.Mesh[];
  outlineMaterials: THREE.LineBasicMaterial[];
  outlines: THREE.Line[];
};

type WallView = {
  edgeMaterials: THREE.LineBasicMaterial[];
  edges: THREE.LineSegments[];
  group: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
  meshes: THREE.Mesh[];
  productMeshes: THREE.Mesh[];
};

const FLOOR_LAYER_COLORS: Record<AssemblyLayerRole, number> = {
  "air-gap": 0x8fa4b2,
  finish: 0xc99762,
  framing: 0xb58a5c,
  insulation: 0xd6b76f,
  membrane: 0x506b7c,
  sheathing: 0xc3a176,
  structure: 0xa9afb2,
  substrate: 0x9b9385,
};

type FillStyledObject = { fillOverride?: { color: string; visible: boolean } | null };

function resolvedObjectFill(document: ModelDocument, layerId: string | null | undefined, object?: FillStyledObject | null) {
  const layer = findLayer(document, layerId ?? null);
  const layerSet = document.layerSets.find((set) => set.id === document.activeLayerSetId);
  const override = object?.fillOverride ?? null;
  return {
    color: override?.color ?? layer?.fillColor ?? layer?.color ?? "#7f95aa",
    visible: (layerSet?.fillsVisible ?? true) && (override?.visible ?? layer?.fillVisible ?? true),
  };
}

function setMeshOpacity(mesh: THREE.Mesh, visible: boolean, selected = false, hovered = false, reference = false) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.forEach((material) => {
    if (!(material instanceof THREE.MeshStandardMaterial) && !(material instanceof THREE.MeshBasicMaterial)) return;
    const baseOpacity = typeof material.userData.baseOpacity === "number" ? material.userData.baseOpacity : 0.92;
    material.transparent = true;
    const resolvedOpacity = reference ? Math.min(0.28, baseOpacity * 0.32) : selected || hovered ? Math.min(1, baseOpacity + 0.18) : baseOpacity;
    material.opacity = visible ? resolvedOpacity : 0;
    material.depthWrite = visible && !reference && baseOpacity >= 0.8;
  });
}

function createFloorPlatformView(scene: THREE.Scene): FloorPlatformView {
  const group = new THREE.Group();
  group.renderOrder = 5;
  scene.add(group);
  return { edgeMaterials: [], edges: [], group, materials: [], meshes: [], outlineMaterials: [], outlines: [] };
}

function clearFloorPlatformView(view: FloorPlatformView) {
  view.meshes.forEach((mesh) => {
    view.group.remove(mesh);
    mesh.geometry.dispose();
  });
  view.materials.forEach((material) => material.dispose());
  view.edges.forEach((edge) => {
    view.group.remove(edge);
    edge.geometry.dispose();
  });
  view.edgeMaterials.forEach((material) => material.dispose());
  view.outlines.forEach((outline) => {
    view.group.remove(outline);
    outline.geometry.dispose();
  });
  view.outlineMaterials.forEach((material) => material.dispose());
  view.meshes = [];
  view.materials = [];
  view.edges = [];
  view.edgeMaterials = [];
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

function rebuildPlatformEdges(view: FloorPlatformView) {
  view.edges.forEach((edge) => { view.group.remove(edge); edge.geometry.dispose(); });
  view.edgeMaterials.forEach((material) => material.dispose());
  view.edges = [];
  view.edgeMaterials = [];
  view.meshes.forEach((mesh) => {
    const material = new THREE.LineBasicMaterial({ color: 0x263746, depthTest: false, toneMapped: false, transparent: true, opacity: 0.92 });
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 20), material);
    edge.position.copy(mesh.position);
    edge.rotation.copy(mesh.rotation);
    edge.scale.copy(mesh.scale);
    edge.renderOrder = 14;
    edge.userData.sourceMesh = mesh;
    view.group.add(edge);
    view.edges.push(edge);
    view.edgeMaterials.push(material);
  });
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
  rebuildPlatformEdges(view);
}

function updateRoofPlaneView(view: FloorPlatformView, document: ModelDocument, polyline: PolylineObject, viewTarget: ViewTarget) {
  clearFloorPlatformView(view);
  const geometry = roofPlaneGeometry(polyline);
  const reference = roofPlaneReferenceDimensions(document, polyline);
  if (!geometry || !reference) return;
  const eaveZ = reference.fasciaTopElevation;
  const risePerInch = polyline.roofSettings!.pitchRise / 12;
  const triangles = THREE.ShapeUtils.triangulateShape(polyline.vertices.map((point) => new THREE.Vector2(point.x, point.y)), []);
  if (!triangles.length) return;
  const basePositions = polyline.vertices.map((point, index) => new THREE.Vector3(point.x, point.y, eaveZ + geometry.boundaryDepths[index] * risePerInch));
  const normal = new THREE.Vector3(-geometry.inwardNormal.x * risePerInch, -geometry.inwardNormal.y * risePerInch, 1).normalize();
  const framingReveal = polyline.roofSettings!.showFramingInModel;
  const addRoofLayer = (innerOffset: number, outerOffset: number, color: string | number, materialName: string, layerName: string) => {
    if (Math.abs(outerOffset - innerOffset) < 1 / 16) return;
    const vertexCount = basePositions.length;
    const positions = [innerOffset, outerOffset].flatMap((offset) => basePositions.flatMap((point) => {
      const shifted = point.clone().addScaledVector(normal, offset);
      return [shifted.x, shifted.y, shifted.z];
    }));
    const indices: number[] = [];
    triangles.forEach((triangle) => {
      indices.push(triangle[2], triangle[1], triangle[0]);
      indices.push(triangle[0] + vertexCount, triangle[1] + vertexCount, triangle[2] + vertexCount);
    });
    for (let index = 0; index < vertexCount; index += 1) {
      const next = (index + 1) % vertexCount;
      indices.push(index, next, next + vertexCount, index, next + vertexCount, index + vertexCount);
    }
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    buffer.setIndex(indices);
    buffer.computeVertexNormals();
    const definition = architecturalMaterialByName(materialName);
    const material = new THREE.MeshStandardMaterial({ color: definition?.model.color ?? color, depthWrite: !framingReveal, metalness: definition?.model.metalness ?? 0, opacity: framingReveal ? 0.18 : 0.88, roughness: definition?.model.roughness ?? 0.84, side: THREE.DoubleSide, transparent: true });
    material.userData.baseOpacity = material.opacity;
    const mesh = new THREE.Mesh(buffer, material);
    mesh.userData.polylineId = polyline.id;
    mesh.userData.roofLayer = layerName;
    mesh.userData.roofPlane = true;
    view.group.add(mesh);
    view.meshes.push(mesh);
    view.materials.push(material);
  };
  const layerTakeoffs = roofPlaneLayerTakeoffGeometry(document, polyline);
  if (layerTakeoffs?.some((layer) => layer.thickness > 0)) {
    layerTakeoffs.forEach((layer) => {
      if (framingReveal && layer.role === "framing") return;
      const nearOffset = layer.roofSide === "exterior" ? layer.outerOffset - layer.thickness : layer.outerOffset + layer.thickness;
      addRoofLayer(Math.min(nearOffset, layer.outerOffset), Math.max(nearOffset, layer.outerOffset), FLOOR_LAYER_COLORS[layer.role], layer.material, layer.name);
    });
  } else {
    addRoofLayer(-1 / 32, 1 / 32, 0xd7b99a, "", "Structural Roof Plane");
  }
  if (framingReveal) roofFramingLayout(document, polyline)?.members.forEach((member) => {
    const start = new THREE.Vector3(member.start.x, member.start.y, member.start.z);
    const end = new THREE.Vector3(member.end.x, member.end.y, member.end.z);
    const xAxis = end.clone().sub(start).normalize();
    const zAxis = member.orientation === "roof-normal" ? normal.clone() : new THREE.Vector3(0, 0, 1);
    const yAxis = zAxis.clone().cross(xAxis).normalize();
    if (xAxis.lengthSq() < 1e-8 || yAxis.lengthSq() < 1e-8) return;
    const correctedZ = xAxis.clone().cross(yAxis).normalize();
    const center = start.clone().add(end).multiplyScalar(0.5).addScaledVector(correctedZ, -member.depth / 2);
    const memberGeometry = new THREE.BoxGeometry(member.grossLength, member.width, member.depth);
    const materialName = member.material.toLocaleLowerCase();
    const color = member.kind === "ridge-board" ? 0xa86837 : member.kind === "fascia" ? 0xc58b52 : member.kind === "subfascia" ? 0xb77a45 : member.kind === "truss-top-chord" ? 0xbf8750 : 0xd1a06a;
    const memberMaterial = new THREE.MeshStandardMaterial({ color, metalness: materialName.includes("steel") ? 0.42 : 0, opacity: 1, roughness: 0.76 });
    memberMaterial.userData.baseOpacity = 1;
    const mesh = new THREE.Mesh(memberGeometry, memberMaterial);
    mesh.position.copy(center);
    mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, correctedZ));
    mesh.userData.polylineId = polyline.id;
    mesh.userData.roofFramingMember = member.kind;
    mesh.userData.roofFramingMemberId = member.id;
    mesh.userData.roofFramingMaterial = member.material;
    view.group.add(mesh);
    view.meshes.push(mesh);
    view.materials.push(memberMaterial);
  });
  rebuildPlatformEdges(view);

  const takeoff = roofPlaneTakeoffGeometry(document, polyline);
  const joinedEdgeColors: Record<string, number> = { hip: 0xb66e35, ridge: 0x397ca2, transition: 0x8261a8, valley: 0x2f8f83 };
  takeoff?.edges.filter((edge) => edge.joinedRoofPlaneId).forEach((edge) => {
    const startZ = roofPlaneSurfaceElevation(document, polyline, edge.start);
    const endZ = roofPlaneSurfaceElevation(document, polyline, edge.end);
    if (startZ === null || endZ === null) return;
    const edgeMaterial = new THREE.LineBasicMaterial({ color: joinedEdgeColors[edge.role] ?? 0x397ca2, depthTest: false, toneMapped: false });
    const joinedEdge = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(edge.start.x, edge.start.y, startZ + 1 / 8),
      new THREE.Vector3(edge.end.x, edge.end.y, endZ + 1 / 8),
    ]), edgeMaterial);
    joinedEdge.renderOrder = 20;
    joinedEdge.userData.roofEdgeRole = edge.role;
    joinedEdge.userData.joinedRoofPlaneId = edge.joinedRoofPlaneId;
    view.group.add(joinedEdge);
    view.outlines.push(joinedEdge);
    view.outlineMaterials.push(edgeMaterial);
  });

  const bearingMaterial = new THREE.LineDashedMaterial({ color: 0x3f7592, dashSize: 6, depthTest: false, gapSize: 3, opacity: 0.95, transparent: true });
  const bearingLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(geometry.bearingStart.x, geometry.bearingStart.y, reference.heelElevation + 1 / 16),
    new THREE.Vector3(geometry.bearingEnd.x, geometry.bearingEnd.y, reference.heelElevation + 1 / 16),
  ]), bearingMaterial);
  bearingLine.computeLineDistances();
  bearingLine.renderOrder = 18;
  bearingLine.visible = viewTarget.id === "top";
  view.group.add(bearingLine);
  view.outlines.push(bearingLine);
  view.outlineMaterials.push(bearingMaterial);

  const midpoint = { x: (geometry.bearingStart.x + geometry.bearingEnd.x) / 2, y: (geometry.bearingStart.y + geometry.bearingEnd.y) / 2 };
  const arrowLength = Math.min(60, geometry.horizontalRun * 0.55);
  const tip = { x: midpoint.x + geometry.inwardNormal.x * arrowLength, y: midpoint.y + geometry.inwardNormal.y * arrowLength };
  const tangent = { x: -geometry.inwardNormal.y, y: geometry.inwardNormal.x };
  const arrowZ = reference.heelElevation + 1 / 8;
  const roofArrowMaterial = new THREE.LineDashedMaterial({ color: 0x3f7592, dashSize: 1000, depthTest: false, gapSize: 0, opacity: 0.95, transparent: true });
  const roofArrow = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(midpoint.x, midpoint.y, arrowZ),
    new THREE.Vector3(tip.x, tip.y, arrowZ),
    new THREE.Vector3(tip.x - geometry.inwardNormal.x * 8 + tangent.x * 4, tip.y - geometry.inwardNormal.y * 8 + tangent.y * 4, arrowZ),
    new THREE.Vector3(tip.x, tip.y, arrowZ),
    new THREE.Vector3(tip.x - geometry.inwardNormal.x * 8 - tangent.x * 4, tip.y - geometry.inwardNormal.y * 8 - tangent.y * 4, arrowZ),
  ]), roofArrowMaterial);
  roofArrow.computeLineDistances();
  roofArrow.renderOrder = 19;
  roofArrow.visible = viewTarget.id === "top";
  view.group.add(roofArrow);
  view.outlines.push(roofArrow);
  view.outlineMaterials.push(roofArrowMaterial);
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
  rebuildPlatformEdges(view);
}

function disposeFloorPlatformView(scene: THREE.Scene, view: FloorPlatformView) {
  clearFloorPlatformView(view);
  scene.remove(view.group);
}

function createWallView(scene: THREE.Scene): WallView {
  const group = new THREE.Group();
  group.renderOrder = 6;
  scene.add(group);
  return { edgeMaterials: [], edges: [], group, materials: [], meshes: [], productMeshes: [] };
}

function clearWallView(view: WallView) {
  clearPreferredProductRepresentations(view.group, view.productMeshes);
  view.meshes.forEach((mesh) => {
    view.group.remove(mesh);
    mesh.geometry.dispose();
  });
  view.materials.forEach((material) => material.dispose());
  view.edges.forEach((edge) => {
    view.group.remove(edge);
    edge.geometry.dispose();
  });
  view.edgeMaterials.forEach((material) => material.dispose());
  view.meshes = [];
  view.materials = [];
  view.edges = [];
  view.edgeMaterials = [];
}

function rebuildWallEdges(view: WallView, target?: ViewTarget) {
  view.edges.forEach((edge) => { view.group.remove(edge); edge.geometry.dispose(); });
  view.edgeMaterials.forEach((material) => material.dispose());
  view.edges = [];
  view.edgeMaterials = [];
  [...view.meshes, ...view.productMeshes].forEach((mesh) => {
    const material = new THREE.LineBasicMaterial({ color: 0x263746, depthTest: false, toneMapped: false, transparent: true, opacity: 0.94 });
    const baseGeometry = new THREE.EdgesGeometry(mesh.geometry, 20);
    const hiddenPlanSeams = target?.id === "top"
      ? mesh.userData.hiddenPlanSeams as [PlanPoint, PlanPoint][] | undefined
      : undefined;
    let edgeGeometry: THREE.BufferGeometry = baseGeometry;
    if (hiddenPlanSeams?.length) {
      const position = baseGeometry.getAttribute("position");
      const keptPositions: number[] = [];
      const near = (first: PlanPoint, second: PlanPoint) => Math.hypot(first.x - second.x, first.y - second.y) <= 1 / 64;
      for (let index = 0; index < position.count; index += 2) {
        const first = { x: position.getX(index), y: position.getY(index) };
        const second = { x: position.getX(index + 1), y: position.getY(index + 1) };
        const hidden = hiddenPlanSeams.some(([seamFirst, seamSecond]) =>
          (near(first, seamFirst) && near(second, seamSecond))
          || (near(first, seamSecond) && near(second, seamFirst))
        );
        if (hidden) continue;
        keptPositions.push(
          position.getX(index), position.getY(index), position.getZ(index),
          position.getX(index + 1), position.getY(index + 1), position.getZ(index + 1),
        );
      }
      baseGeometry.dispose();
      edgeGeometry = new THREE.BufferGeometry();
      edgeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(keptPositions, 3));
    }
    const edge = new THREE.LineSegments(edgeGeometry, material);
    edge.position.copy(mesh.position);
    edge.rotation.copy(mesh.rotation);
    edge.scale.copy(mesh.scale);
    edge.renderOrder = 15;
    edge.userData.sourceMesh = mesh;
    Object.assign(edge.userData, mesh.userData);
    view.group.add(edge);
    view.edges.push(edge);
    view.edgeMaterials.push(material);
  });
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
  target: ViewTarget,
) {
  clearWallView(view);
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const length = Math.hypot(dx, dy);
  if (length < 1 / 16) return;
  const framingReveal = framing.enabled && framing.showInModel && target.id !== "top";
  const nativeComponentMeshes = new Map<string, THREE.Mesh[]>();
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
      mesh.userData.hiddenPlanSeams = [
        ...(segment.hidePlanStartSeam ? [[segment.startExterior, segment.startInterior] as [PlanPoint, PlanPoint]] : []),
        ...(segment.hidePlanEndSeam ? [[segment.endExterior, segment.endInterior] as [PlanPoint, PlanPoint]] : []),
      ];
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
    const openingMeshes = nativeComponentMeshes.get(componentSolid.openingId) ?? [];
    openingMeshes.push(mesh);
    nativeComponentMeshes.set(componentSolid.openingId, openingMeshes);
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
  applyPreferredProductRepresentations({
    host: view.group,
    interactiveMeshes: view.productMeshes,
    line,
    nativeComponentMeshes,
    openingTypesById,
    target,
    vertical,
    wallType,
  });
  rebuildWallEdges(view, target);
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
  rebuildWallEdges(view);
}

function disposeWallView(scene: THREE.Scene, view: WallView) {
  clearWallView(view);
  scene.remove(view.group);
}

function createViewportLine(scene: THREE.Scene, lineId: string): ViewportLine {
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.LineDashedMaterial({ color: 0x88bff0, dashSize: 1e9, depthTest: false, gapSize: 0, toneMapped: false });
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 12;
  line.userData.lineId = lineId;
  scene.add(line);
  return { geometry, material, line };
}

function updateViewportLine(view: ViewportLineGeometry, geometry: LineGeometry, zOffset = 0.35) {
  view.geometry.setFromPoints([
    new THREE.Vector3(geometry.start.x, geometry.start.y, geometry.start.z + zOffset),
    new THREE.Vector3(geometry.end.x, geometry.end.y, geometry.end.z + zOffset),
  ]);
  view.geometry.computeBoundingSphere();
  view.line.computeLineDistances();
}

function applyLayerAppearanceToViewportLine(view: ViewportLine, layer: ReturnType<typeof findLayer>) {
  if (!layer) return;
  view.material.color.set(layer.color);
  view.material.dashSize = layer.lineStyle === "solid" ? 1e9 : layer.lineStyle === "dotted" ? 1.25 : layer.lineStyle === "center" ? 12 : 6;
  view.material.gapSize = layer.lineStyle === "solid" ? 0 : layer.lineStyle === "dotted" ? 2.5 : layer.lineStyle === "center" ? 3 : 4;
  view.material.needsUpdate = true;
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

function updateViewportPolyline(view: ViewportLineGeometry, polyline: PolylineGeometry, zOffset = 0.45) {
  const points = polylinePathPoints(polyline).map((point) => new THREE.Vector3(point.x, point.y, polyline.elevation + zOffset));
  view.geometry.setFromPoints(points);
  view.geometry.computeBoundingSphere();
  view.line.computeLineDistances();
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

function updateViewportCircle(view: ViewportLineGeometry, circle: CircleGeometry, zOffset = 0.5) {
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
  view.line.computeLineDistances();
}

function createViewportArc(scene: THREE.Scene, arcId: string): ViewportLine {
  const view = createViewportLine(scene, arcId);
  delete view.line.userData.lineId;
  view.line.userData.arcId = arcId;
  return view;
}

function updateViewportArc(view: ViewportLineGeometry, arc: ArcGeometry, zOffset = 0.55) {
  const segmentCount = Math.max(16, Math.ceil(arcSweepAngle(arc) / 4));
  const points = Array.from({ length: segmentCount + 1 }, (_, index) => {
    const point = arcPointAtFraction(arc, index / segmentCount);
    return new THREE.Vector3(point.x, point.y, point.z + zOffset);
  });
  view.geometry.setFromPoints(points);
  view.geometry.computeBoundingSphere();
  view.line.computeLineDistances();
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
    delete handle.userData.roofPlaneGrip;
    if (!definition) return;
    if (definition.grip) handle.userData.rectangleGrip = definition.grip;
    else handle.userData.polylineVertex = definition.vertex;
    if (polyline.architecturalRole === "roof-plane" && definition.vertex !== null) handle.userData.roofPlaneGrip = definition.vertex < 2 ? "eave-span" : "boundary";
    handle.userData.screenPixels = definition.grip?.kind === "center" ? 12 : 10;
    (handle.material as THREE.MeshBasicMaterial).color.setHex(polyline.architecturalRole === "roof-plane" && definition.vertex !== null && definition.vertex < 2 ? 0xf2ad32 : definition.grip?.kind === "center" ? 0x55d68a : definition.grip?.kind === "edge" ? 0x62c3ff : 0x39a9ff);
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
  onRoomLabelOpen,
  onRoomLabelTypeChange,
  onRoomCeilingHeightChange,
  onWallClearanceChange,
  onWallLengthChange,
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
  const [activeRoomLabelId, setActiveRoomLabelId] = useState<string | null>(null);
  const [activeRoomCeilingId, setActiveRoomCeilingId] = useState<string | null>(null);
  const [roomCeilingDraft, setRoomCeilingDraft] = useState("");
  const [roomLabelScreens, setRoomLabelScreens] = useState<Array<{ roomId: string; x: number; y: number }>>([]);
  const roomLabelScreenSignatureRef = useRef("");
  const [temporaryWallDimensionScreen, setTemporaryWallDimensionScreen] = useState<TemporaryWallDimensionScreen | null>(null);
  const temporaryWallDimensionScreenSignatureRef = useRef("");
  const objectViewsRef = useRef(new Map<string, ViewportObject>());
  const lineViewsRef = useRef(new Map<string, ViewportLine>());
  const wallViewsRef = useRef(new Map<string, WallView>());
  const arcViewsRef = useRef(new Map<string, ViewportLine>());
  const circleViewsRef = useRef(new Map<string, ViewportLine>());
  const polylineViewsRef = useRef(new Map<string, ViewportLine>());
  const floorPlatformViewsRef = useRef(new Map<string, FloorPlatformView>());
  const roofPlaneViewsRef = useRef(new Map<string, FloorPlatformView>());
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

    // The viewport swaps between perspective and orthographic cameras, so the
    // controls must be parameterized over both rather than inferring the first one.
    const controls = new OrbitControls<THREE.PerspectiveCamera | THREE.OrthographicCamera>(camera, renderer.domElement);
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
    const roofPlaneViews = roofPlaneViewsRef.current;
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
      const activeStoryId = documentRef.current.building.activeStoryId;
      const storyIsIncluded = (storyId: string) => requestedTarget.id !== "top" || storyId === activeStoryId;
      const objects = documentRef.current.objects.filter((object) =>
        findLayer(documentRef.current, object.layerId)?.visible && storyIsIncluded(object.storyId),
      );
      const lines = documentRef.current.lines.filter((line) =>
        findLayer(documentRef.current, line.layerId)?.visible && storyIsIncluded(line.storyId),
      );
      const polylines = documentRef.current.polylines.filter((polyline) =>
        findLayer(documentRef.current, polyline.layerId)?.visible && storyIsIncluded(polyline.storyId),
      );
      const circles = documentRef.current.circles.filter((circle) =>
        findLayer(documentRef.current, circle.layerId)?.visible && storyIsIncluded(circle.storyId),
      );
      const arcs = documentRef.current.arcs.filter((arc) => findLayer(documentRef.current, arc.layerId)?.visible && storyIsIncluded(arc.storyId));
      const roomPlatforms = documentRef.current.rooms
        .map((room) => roomHorizontalPlatformSolution(documentRef.current, room))
        .filter((solution): solution is RoomHorizontalPlatformSolution => solution !== null && storyIsIncluded(solution.storyId));
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
      const visible = (layerId: string, storyId: string) => Boolean(findLayer(current, layerId)?.visible) && (viewTargetRef.current.id !== "top" || storyId === current.building.activeStoryId);
      const geometries: ScreenSelectionGeometry[] = [];
      current.lines.filter((line) => visible(line.layerId, line.storyId)).forEach((line) => {
        geometries.push(pathSelectionGeometry({ id: line.id, kind: "line" }, [line.start, line.end]));
      });
      current.polylines.filter((polyline) => visible(polyline.layerId, polyline.storyId)).forEach((polyline) => {
        geometries.push(pathSelectionGeometry(
          { id: polyline.id, kind: "polyline" },
          polylinePathPoints(polyline).map((point) => ({ ...point, z: polyline.elevation })),
          false,
        ));
      });
      current.circles.filter((circle) => visible(circle.layerId, circle.storyId)).forEach((circle) => {
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
      current.arcs.filter((arc) => visible(arc.layerId, arc.storyId)).forEach((arc) => {
        const points = Array.from({ length: 49 }, (_, index) => arcPointAtFraction(arc, index / 48));
        geometries.push(pathSelectionGeometry({ id: arc.id, kind: "arc" }, points));
      });
      current.objects.filter((object) => visible(object.layerId, object.storyId)).forEach((object) => {
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
        const entity = ref.kind === "box" ? findBoxObject(current, ref.id)
          : ref.kind === "line" ? findLineObject(current, ref.id)
          : ref.kind === "polyline" ? findPolylineObject(current, ref.id)
          : ref.kind === "circle" ? findCircleObject(current, ref.id)
          : findArcObject(current, ref.id);
        return Boolean(entity && findLayer(current, entity.layerId)?.visible && (viewTargetRef.current.id !== "top" || entity.storyId === current.building.activeStoryId));
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
      raycaster.intersectObjects([...wallViewsRef.current.values()].flatMap((view) => [...view.meshes, ...view.productMeshes]), false).forEach((hit) => {
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
      raycaster.intersectObjects([...roofPlaneViewsRef.current.values()].flatMap((view) => view.meshes), false).forEach((hit) => {
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
              { geometry: linePreviewGeometry, line: linePreview },
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
              { geometry: linePreviewGeometry, line: linePreview },
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
            updateViewportLine({ geometry: linePreviewGeometry, line: linePreview }, { start: points[0], end: snapped.point }, 0.8);
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
            updateViewportArc({ geometry: linePreviewGeometry, line: linePreview }, previewArc, 0.8);
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
              updateViewportCircle({ geometry: linePreviewGeometry, line: linePreview }, circle, 0.8);
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
              updateViewportCircle({ geometry: linePreviewGeometry, line: linePreview }, circle, 0.8);
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
            updateViewportLine({ geometry: linePreviewGeometry, line: linePreview }, { start: anchor, end: snapped.point }, 0.8);
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
              updateViewportPolyline({ geometry: linePreviewGeometry, line: linePreview }, rectangle, 0.8);
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
            updateViewportPolyline({ geometry: linePreviewGeometry, line: linePreview }, { bulges, closed: false, elevation: polylineElevationRef.current, vertices, width: polylineWidthRef.current }, 0.8);
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
            updateViewportLine({ geometry: linePreviewGeometry, line: linePreview }, { start: lineStartRef.current, end: snapped.point }, 0.8);
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
        const source = findLineObject(drag.before, drag.objectId);
        const trackingAnchor = source
          ? drag.lineGrip === "start"
            ? source.end
            : drag.lineGrip === "end"
              ? source.start
              : lineMidpoint(source)
          : null;
        const snapped = snapCadPoint(
          { x: currentPoint.x, y: currentPoint.y, z: currentPoint.z },
          drag.objectId,
          trackingAnchor,
          true,
        );
        const next = updateLineGrip(drag.before, drag.objectId, drag.lineGrip, snapped.point);
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
        // Capture the narrowed grip: `drag` is a mutable closure variable, so the
        // narrowing above does not survive into these callbacks.
        const grip = drag.grip;
        const sourceBox = findBoxObject(drag.before, drag.objectId);
        const coordinateDeltas = Object.fromEntries(
          grip.axes.map((axis) => {
            const localAxis = sourceBox ? boxLocalAxis(sourceBox, axis) : { x: 0, y: 0, z: 0 };
            const projected = worldMovement.x * localAxis.x + worldMovement.y * localAxis.y + worldMovement.z * localAxis.z;
            return [axis, snapToSixteenth(projected)];
          }),
        ) as Partial<Record<AxisKey, number>>;
        const outwardDistances = Object.fromEntries(
          grip.axes.map((axis) => [
            axis,
            snapToSixteenth((coordinateDeltas[axis] ?? 0) * grip.signs[axis]),
          ]),
        ) as Partial<Record<AxisKey, number>>;
        const nextBox = sourceBox
          ? resizeBoxFromGrip(sourceBox, grip, coordinateDeltas)
          : null;
        const dominantDistance = grip.axes.reduce((largest, axis) => {
          const distance = outwardDistances[axis] ?? 0;
          return Math.abs(distance) > Math.abs(largest) ? distance : largest;
        }, 0);
        callbacksRef.current.onDragStatus({
          axisDistances: outwardDistances,
          distance: dominantDistance,
          gripKind: grip.kind,
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
      if (viewTargetRef.current.id === "top") {
        const activeStoryId = documentRef.current.building.activeStoryId;
        const screens = documentRef.current.roomAnnotations.filter((annotation) => annotation.kind === "label" && annotation.storyId === activeStoryId && annotation.visible && findLayer(documentRef.current, annotation.layerId)?.visible).map((annotation) => {
          const projected = new THREE.Vector3(annotation.position.x, annotation.position.y, activeElevationRef.current + 1).project(camera);
          return { roomId: annotation.roomId, x: Math.round((projected.x * 0.5 + 0.5) * renderer.domElement.clientWidth), y: Math.round((-projected.y * 0.5 + 0.5) * renderer.domElement.clientHeight) };
        });
        const signature = screens.map((item) => `${item.roomId}:${item.x}:${item.y}`).join("|");
        if (signature !== roomLabelScreenSignatureRef.current) {
          roomLabelScreenSignatureRef.current = signature;
          setRoomLabelScreens(screens);
        }
      } else if (roomLabelScreenSignatureRef.current) {
        roomLabelScreenSignatureRef.current = "";
        setRoomLabelScreens([]);
      }
      const selectedWall = findLineObject(documentRef.current, selectedLineIdRef.current);
      if (
        viewTargetRef.current.id === "top" &&
        selectedWall?.architecturalRole === "wall" &&
        lineIsEditable(documentRef.current, selectedWall) &&
        findLayer(documentRef.current, selectedWall.layerId)?.visible
      ) {
        const projectDimensionPoint = (point: LinePoint) => {
          const projected = new THREE.Vector3(point.x, point.y, point.z + 1).project(camera);
          return {
            x: (projected.x * 0.5 + 0.5) * renderer.domElement.clientWidth,
            y: (-projected.y * 0.5 + 0.5) * renderer.domElement.clientHeight,
          };
        };
        const wallStart = projectDimensionPoint(selectedWall.start);
        const wallEnd = projectDimensionPoint(selectedWall.end);
        const dx = wallEnd.x - wallStart.x;
        const dy = wallEnd.y - wallStart.y;
        const projectedLength = Math.hypot(dx, dy);
        if (projectedLength >= 36) {
          let normalX = -dy / projectedLength;
          let normalY = dx / projectedLength;
          if (normalY > 0 || Math.abs(normalY) < 0.08 && normalX < 0) {
            normalX *= -1;
            normalY *= -1;
          }
          const dimensionOffset = 38;
          const dimensionStart = { x: wallStart.x + normalX * dimensionOffset, y: wallStart.y + normalY * dimensionOffset };
          const dimensionEnd = { x: wallEnd.x + normalX * dimensionOffset, y: wallEnd.y + normalY * dimensionOffset };
          const clearDimensions = nearestParallelWallClearDimensions(
            selectedWall,
            documentRef.current.lines.filter((line) => findLayer(documentRef.current, line.layerId)?.visible),
            documentRef.current.building.wallTypes,
          ).map((dimension) => ({
            distance: dimension.distance,
            from: projectDimensionPoint(dimension.from),
            referenceWallId: dimension.referenceWallId,
            side: dimension.side,
            to: projectDimensionPoint(dimension.to),
          })).filter((dimension) => Math.hypot(dimension.to.x - dimension.from.x, dimension.to.y - dimension.from.y) >= 30);
          const screen: TemporaryWallDimensionScreen = {
            clearDimensions,
            dimensionEnd,
            dimensionStart,
            label: { x: (dimensionStart.x + dimensionEnd.x) / 2, y: (dimensionStart.y + dimensionEnd.y) / 2 },
            lineId: selectedWall.id,
            wallEnd,
            wallStart,
          };
          const signature = [
            screen.lineId,
            screen.wallStart.x,
            screen.wallStart.y,
            screen.wallEnd.x,
            screen.wallEnd.y,
            screen.dimensionStart.x,
            screen.dimensionStart.y,
            ...screen.clearDimensions.flatMap((dimension) => [dimension.referenceWallId, dimension.distance, dimension.from.x, dimension.from.y, dimension.to.x, dimension.to.y]),
          ].map((value) => typeof value === "number" ? Math.round(value) : value).join(":");
          if (signature !== temporaryWallDimensionScreenSignatureRef.current) {
            temporaryWallDimensionScreenSignatureRef.current = signature;
            setTemporaryWallDimensionScreen(screen);
          }
        } else if (temporaryWallDimensionScreenSignatureRef.current) {
          temporaryWallDimensionScreenSignatureRef.current = "";
          setTemporaryWallDimensionScreen(null);
        }
      } else if (temporaryWallDimensionScreenSignatureRef.current) {
        temporaryWallDimensionScreenSignatureRef.current = "";
        setTemporaryWallDimensionScreen(null);
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
      roofPlaneViews.forEach((view) => disposeFloorPlatformView(scene, view));
      roofPlaneViews.clear();
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
      const layer = displayLayerForStory(document, viewTarget, object.storyId, object.layerId);
      const visible = (layer?.visible ?? true) && storyDisplayRole(document, viewTarget, object.storyId) !== "hidden";
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
      const layer = displayLayerForStory(document, viewTarget, line.storyId, line.layerId);
      applyLayerAppearanceToViewportLine(view, layer);
      view.line.visible = (layer?.visible ?? true) && storyDisplayRole(document, viewTarget, line.storyId) !== "hidden";
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
      if (vertical && wallType) updateWallView(view, line, vertical, wallType, wallJoinPlan, wallLinesById, wallTypesById, openingTypesById, headerTypesById, document.building.wallFraming, viewTarget);
      const openingById = new Map(line.wallOpenings.map((opening) => [opening.id, opening]));
      [...view.meshes.filter((mesh) => Boolean(mesh.userData.openingComponentRole)), ...view.productMeshes].forEach((mesh) => {
        const opening = openingById.get(String(mesh.userData.wallOpeningId ?? ""));
        if (opening) mesh.visible = displayLayerForStory(document, viewTarget, line.storyId, opening.layerId)?.visible ?? true;
      });
      const wallLayer = displayLayerForStory(document, viewTarget, line.storyId, line.layerId);
      view.group.visible = Boolean(vertical && wallType && (wallLayer?.visible ?? true) && storyDisplayRole(document, viewTarget, line.storyId) !== "hidden");
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
      const foundationLayer = displayLayerForStory(document, viewTarget, line.storyId, line.layerId);
      view.group.visible = Boolean(vertical && foundationType && (foundationLayer?.visible ?? true) && storyDisplayRole(document, viewTarget, line.storyId) !== "hidden");
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
      const layer = displayLayerForStory(document, viewTarget, polyline.storyId, polyline.layerId);
      applyLayerAppearanceToViewportLine(view, layer);
      const visible = (layer?.visible ?? true) && storyDisplayRole(document, viewTarget, polyline.storyId) !== "hidden";
      view.line.visible = visible && (polyline.architecturalRole !== "roof-plane" || viewTarget.id === "top");
      if (view.fill) view.fill.visible = visible && resolvedStoryFill(document, viewTarget, polyline.storyId, polyline.layerId, polyline).visible && (polyline.width ?? 0) >= 1 / 16;
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
      const layer = displayLayerForStory(document, viewTarget, polyline.storyId, polyline.layerId);
      view.group.visible = Boolean(story && (layer?.visible ?? true) && storyDisplayRole(document, viewTarget, polyline.storyId) !== "hidden");
    });
    const currentRoofPlaneIds = new Set(document.polylines.filter((polyline) => polyline.architecturalRole === "roof-plane").map((polyline) => polyline.id));
    roofPlaneViewsRef.current.forEach((view, polylineId) => {
      if (!currentRoofPlaneIds.has(polylineId)) {
        disposeFloorPlatformView(scene, view);
        roofPlaneViewsRef.current.delete(polylineId);
      }
    });
    document.polylines.filter((polyline) => polyline.architecturalRole === "roof-plane").forEach((polyline) => {
      let view = roofPlaneViewsRef.current.get(polyline.id);
      if (!view) {
        view = createFloorPlatformView(scene);
        roofPlaneViewsRef.current.set(polyline.id, view);
      }
      updateRoofPlaneView(view, document, polyline, viewTarget);
      const layer = displayLayerForStory(document, viewTarget, polyline.storyId, polyline.layerId);
      view.group.visible = Boolean((layer?.visible ?? true) && storyDisplayRole(document, viewTarget, polyline.storyId) !== "hidden");
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
      view.group.visible = Boolean(solution && boundaryWallsVisible && storyDisplayRole(document, viewTarget, room.storyId) !== "hidden");
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
      const layer = displayLayerForStory(document, viewTarget, circle.storyId, circle.layerId);
      applyLayerAppearanceToViewportLine(view, layer);
      view.line.visible = (layer?.visible ?? true) && storyDisplayRole(document, viewTarget, circle.storyId) !== "hidden";
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
      const layer = displayLayerForStory(document, viewTarget, arc.storyId, arc.layerId);
      applyLayerAppearanceToViewportLine(view, layer);
      view.line.visible = (layer?.visible ?? true) && storyDisplayRole(document, viewTarget, arc.storyId) !== "hidden";
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
  }, [arcMode, breakMode, chamferMode, circleMode, copyMode, document, extendMode, filletMode, lengthenMode, lineMode, mirrorMode, moveMode, offsetMode, polylineMode, rectangleMode, rotateMode, rotationBaseKey, scaleBaseKey, scaleMode, selectedArcId, selectedCircleId, selectedEntityKeys, selectedLineId, selectedObjectId, selectedObjectIds, selectedPolylineId, stretchMode, trimMode, viewTarget]);

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
      if (!object) return;
      const role = storyDisplayRole(document, viewTarget, object.storyId);
      const layer = displayLayerForStory(document, viewTarget, object.storyId, object.layerId);
      const fill = resolvedStoryFill(document, viewTarget, object.storyId, object.layerId, object);
      const fillColor = Number.parseInt(fill.color.slice(1), 16);
      view.materials.forEach((material, index) => {
        const selectedFace = objectId === selectedObjectId && index === selectedFaceIndex;
        material.color.setHex(
          selectedFace ? 0xf2bd5b : selectedObject ? primaryObject ? 0xd7a64b : 0xa98345 : hoveredObject ? 0x4ba6c8 : fillColor,
        );
        material.emissive.setHex(selectedFace ? 0x4a2b06 : hoveredObject ? 0x082a38 : 0x000000);
        material.opacity = fill.visible ? role === "reference" ? 0.28 : selectedObject || hoveredObject ? 0.95 : 0.84 : 0;
        material.depthWrite = fill.visible && role !== "reference";
        material.depthTest = viewTarget.id !== "top";
      });
      (view.edges.material as THREE.LineBasicMaterial).color.setHex(
        primaryObject ? 0xffe3a3 : selectedObject ? 0xd5b16d : hoveredObject ? 0x87d8f3 : layer ? Number.parseInt(layer.color.slice(1), 16) : 0x8da0b2,
      );
      const edgeMaterial = view.edges.material as THREE.LineBasicMaterial;
      edgeMaterial.transparent = role === "reference";
      edgeMaterial.opacity = role === "reference" ? 0.62 : 1;
      view.mesh.renderOrder = role === "reference" ? 2 : 4;
      view.edges.renderOrder = role === "reference" ? 8 : 13;
    });
  }, [arcMode, circleMode, copyMode, document, hoveredEntityKey, lineMode, moveMode, polylineMode, rectangleMode, rotateMode, rotationBaseKey, selectedEntityKeys, selectedFaceIndex, selectedObjectId, selectedObjectIds, viewTarget]);

  useEffect(() => {
    lineViewsRef.current.forEach((view, lineId) => {
      const selected = selectedEntityKeys.includes(cadEntityKey({ id: lineId, kind: "line" }));
      const hovered = hoveredEntityKey === cadEntityKey({ id: lineId, kind: "line" });
      const line = findLineObject(document, lineId);
      if (!line) return;
      const role = storyDisplayRole(document, viewTarget, line.storyId);
      const layer = displayLayerForStory(document, viewTarget, line.storyId, line.layerId);
      const fill = resolvedStoryFill(document, viewTarget, line.storyId, line.layerId, line);
      view.material.color.setHex(selected ? 0xf2bd5b : hovered ? 0x6fd8f5 : layer ? Number.parseInt(layer.color.slice(1), 16) : 0x88bff0);
      view.material.transparent = role === "reference";
      view.material.opacity = role === "reference" ? 0.62 : 1;
      view.line.renderOrder = role === "reference" ? 7 : 12;
      view.fillMaterial?.color.setHex(selected ? 0xd9a53f : hovered ? 0x4fb7d6 : Number.parseInt(fill.color.slice(1), 16));
      if (view.fill && view.fillMaterial) {
        view.fill.visible = Boolean(role !== "hidden" && (layer?.visible ?? true) && fill.visible);
        view.fillMaterial.opacity = selected || hovered ? 0.58 : 0.38;
      }
      view.material.linewidth = selected || hovered ? 2 : 1;
    });
    wallViewsRef.current.forEach((view, lineId) => {
      const selected = selectedEntityKeys.includes(cadEntityKey({ id: lineId, kind: "line" }));
      const hovered = hoveredEntityKey === cadEntityKey({ id: lineId, kind: "line" });
      const line = findLineObject(document, lineId);
      if (!line) return;
      const role = storyDisplayRole(document, viewTarget, line.storyId);
      const hostLayer = displayLayerForStory(document, viewTarget, line.storyId, line.layerId);
      const openingById = new Map(line?.wallOpenings.map((opening) => [opening.id, opening]) ?? []);
      [...view.meshes, ...view.productMeshes].forEach((mesh) => {
        const opening = openingById.get(String(mesh.userData.wallOpeningId ?? ""));
        const owner = opening ?? line;
        const ownerLayerId = opening?.layerId ?? line?.layerId;
        const fill = resolvedStoryFill(document, viewTarget, line.storyId, ownerLayerId, owner);
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => {
          if (!(material instanceof THREE.MeshStandardMaterial)) return;
          if (viewTarget.id === "top") material.color.set(fill.color);
          material.emissive.setHex(selected ? 0x422906 : hovered ? 0x063345 : 0x000000);
        });
        setMeshOpacity(mesh, fill.visible, selected, hovered, role === "reference");
        mesh.renderOrder = role === "reference" ? 2 : 4;
      });
      view.edges.forEach((edge) => {
        const opening = openingById.get(String(edge.userData.wallOpeningId ?? ""));
        const edgeLayer = displayLayerForStory(document, viewTarget, line.storyId, opening?.layerId ?? line.layerId) ?? hostLayer;
        const edgeMaterial = edge.material as THREE.LineBasicMaterial;
        edgeMaterial.color.setHex(selected ? 0xf2bd5b : hovered ? 0x6fd8f5 : edgeLayer ? Number.parseInt(edgeLayer.color.slice(1), 16) : 0x263746);
        edgeMaterial.transparent = role === "reference";
        edgeMaterial.opacity = role === "reference" ? 0.62 : 0.94;
        edge.renderOrder = role === "reference" ? 8 : 20;
        const sourceMesh = edge.userData.sourceMesh as THREE.Mesh | undefined;
        edge.visible = sourceMesh?.visible ?? true;
      });
      view.materials.forEach((material) => {
        material.emissive.setHex(selected ? 0x422906 : hovered ? 0x063345 : 0x000000);
      });
    });
    roofPlaneViewsRef.current.forEach((view, polylineId) => {
      const selected = selectedEntityKeys.includes(cadEntityKey({ id: polylineId, kind: "polyline" }));
      const hovered = hoveredEntityKey === cadEntityKey({ id: polylineId, kind: "polyline" });
      const polyline = findPolylineObject(document, polylineId);
      if (!polyline) return;
      const role = storyDisplayRole(document, viewTarget, polyline.storyId);
      const layer = displayLayerForStory(document, viewTarget, polyline.storyId, polyline.layerId);
      const fill = resolvedStoryFill(document, viewTarget, polyline.storyId, polyline.layerId, polyline);
      view.meshes.forEach((mesh) => {
        setMeshOpacity(mesh, fill.visible, selected, hovered, role === "reference");
        mesh.renderOrder = role === "reference" ? 2 : 4;
      });
      view.edges.forEach((edge) => {
        const material = edge.material as THREE.LineBasicMaterial;
        material.color.setHex(selected ? 0xf2bd5b : hovered ? 0x6fd8f5 : layer ? Number.parseInt(layer.color.slice(1), 16) : 0x6d4f39);
        material.transparent = role === "reference";
        material.opacity = role === "reference" ? 0.62 : 0.92;
        edge.renderOrder = role === "reference" ? 8 : 14;
      });
      view.materials.forEach((material) => {
        material.color.set(fill.color);
        material.emissive.setHex(selected ? 0x422906 : hovered ? 0x063345 : 0x000000);
      });
    });
  }, [document, hoveredEntityKey, selectedEntityKeys, viewTarget]);

  useEffect(() => {
    polylineViewsRef.current.forEach((view, polylineId) => {
      const selected = selectedEntityKeys.includes(cadEntityKey({ id: polylineId, kind: "polyline" }));
      const hovered = hoveredEntityKey === cadEntityKey({ id: polylineId, kind: "polyline" });
      const polyline = findPolylineObject(document, polylineId);
      if (!polyline) return;
      const role = storyDisplayRole(document, viewTarget, polyline.storyId);
      const layer = displayLayerForStory(document, viewTarget, polyline.storyId, polyline.layerId);
      const fill = resolvedStoryFill(document, viewTarget, polyline.storyId, polyline.layerId, polyline);
      view.material.color.setHex(selected ? 0xf2bd5b : hovered ? 0x6fd8f5 : layer ? Number.parseInt(layer.color.slice(1), 16) : 0x88bff0);
      view.material.transparent = role === "reference";
      view.material.opacity = role === "reference" ? 0.62 : 1;
      view.line.renderOrder = role === "reference" ? 7 : 12;
      if (view.fillMaterial) view.fillMaterial.color.setHex(Number.parseInt(fill.color.slice(1), 16));
      if (view.fill) {
        view.fill.visible = Boolean(role !== "hidden" && (layer?.visible ?? true) && fill.visible && (polyline.width ?? 0) >= 1 / 16);
        view.fill.renderOrder = role === "reference" ? 6 : 11;
      }
    });
    floorPlatformViewsRef.current.forEach((view, polylineId) => {
      const selected = selectedEntityKeys.includes(cadEntityKey({ id: polylineId, kind: "polyline" }));
      const hovered = hoveredEntityKey === cadEntityKey({ id: polylineId, kind: "polyline" });
      const polyline = findPolylineObject(document, polylineId);
      if (!polyline) return;
      const role = storyDisplayRole(document, viewTarget, polyline.storyId);
      const layer = displayLayerForStory(document, viewTarget, polyline.storyId, polyline.layerId);
      const fill = resolvedStoryFill(document, viewTarget, polyline.storyId, polyline.layerId, polyline);
      view.meshes.forEach((mesh) => {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => {
          if (material instanceof THREE.MeshStandardMaterial && viewTarget.id === "top") material.color.set(fill.color);
        });
        setMeshOpacity(mesh, fill.visible, selected, hovered, role === "reference");
        mesh.renderOrder = role === "reference" ? 2 : 4;
      });
      view.edges.forEach((edge) => {
        const material = edge.material as THREE.LineBasicMaterial;
        material.color.setHex(selected ? 0xf2bd5b : hovered ? 0x6fd8f5 : layer ? Number.parseInt(layer.color.slice(1), 16) : 0x263746);
        material.transparent = role === "reference";
        material.opacity = role === "reference" ? 0.62 : 0.92;
        edge.renderOrder = role === "reference" ? 8 : 14;
      });
      view.materials.forEach((material) => {
        material.emissive.setHex(selected ? 0x422906 : hovered ? 0x063345 : 0x000000);
      });
    });
  }, [document, hoveredEntityKey, selectedEntityKeys, viewTarget]);

  useEffect(() => {
    const showGeneratedRoomPlatforms = viewTarget.id !== "top";
    roomPlatformViewsRef.current.forEach((view, roomId) => {
      const room = document.rooms.find((candidate) => candidate.id === roomId);
      const fill = resolvedObjectFill(document, room?.layerId, room);
      view.meshes.forEach((mesh) => {
        mesh.visible = showGeneratedRoomPlatforms;
        setMeshOpacity(mesh, fill.visible);
      });
      view.edges.forEach((edge) => { edge.visible = showGeneratedRoomPlatforms; });
    });
  }, [document, viewTarget]);

  useEffect(() => {
    circleViewsRef.current.forEach((view, circleId) => {
      const selected = selectedEntityKeys.includes(cadEntityKey({ id: circleId, kind: "circle" }));
      const hovered = hoveredEntityKey === cadEntityKey({ id: circleId, kind: "circle" });
      const circle = findCircleObject(document, circleId);
      if (!circle) return;
      const role = storyDisplayRole(document, viewTarget, circle.storyId);
      const layer = displayLayerForStory(document, viewTarget, circle.storyId, circle.layerId);
      view.material.color.setHex(selected ? 0xf2bd5b : hovered ? 0x6fd8f5 : layer ? Number.parseInt(layer.color.slice(1), 16) : 0x88bff0);
      view.material.transparent = role === "reference";
      view.material.opacity = role === "reference" ? 0.62 : 1;
      view.line.renderOrder = role === "reference" ? 7 : 12;
    });
  }, [document, hoveredEntityKey, selectedEntityKeys, viewTarget]);

  useEffect(() => {
    arcViewsRef.current.forEach((view, arcId) => {
      const selected = selectedEntityKeys.includes(cadEntityKey({ id: arcId, kind: "arc" }));
      const hovered = hoveredEntityKey === cadEntityKey({ id: arcId, kind: "arc" });
      const arc = findArcObject(document, arcId);
      if (!arc) return;
      const role = storyDisplayRole(document, viewTarget, arc.storyId);
      const layer = displayLayerForStory(document, viewTarget, arc.storyId, arc.layerId);
      view.material.color.setHex(selected ? 0xf2bd5b : hovered ? 0x6fd8f5 : layer ? Number.parseInt(layer.color.slice(1), 16) : 0x88bff0);
      view.material.transparent = role === "reference";
      view.material.opacity = role === "reference" ? 0.62 : 1;
      view.line.renderOrder = role === "reference" ? 7 : 12;
    });
  }, [document, hoveredEntityKey, selectedEntityKeys, viewTarget]);

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
  const temporarilyDimensionedWall = findLineObject(document, temporaryWallDimensionScreen?.lineId ?? null);

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
      {roomLabelScreens.map((screen) => {
        const room = document.rooms.find((candidate) => candidate.id === screen.roomId);
        if (!room) return null;
        const story = document.building.stories.find((candidate) => candidate.id === room.storyId);
        const storyElevation = calculateStoryElevations(document.building).find((item) => item.storyId === room.storyId)?.roughFloorElevation ?? 0;
        const effective = story ? effectiveRoomSettings(room, story, storyElevation) : null;
        const annotationVisible = (kind: RoomAnnotationObject["kind"]) => {
          const annotation = document.roomAnnotations.find((candidate) => candidate.roomId === room.id && candidate.kind === kind);
          return Boolean(annotation?.visible && findLayer(document, annotation.layerId)?.visible);
        };
        const xs = room.boundary.vertices.map((point) => point.x);
        const ys = room.boundary.vertices.map((point) => point.y);
        const width = Math.max(...xs) - Math.min(...xs);
        const depth = Math.max(...ys) - Math.min(...ys);
        const annotationScale = document.savedPlanViews.find((candidate) => candidate.id === document.activeSavedPlanViewId)?.annotationScale ?? 48;
        const labelScale = Math.max(0.7, Math.min(1.45, 48 / annotationScale));
        return <div className="room-label-object" key={room.id} style={{ left: screen.x, top: screen.y, "--room-label-scale": labelScale } as CSSProperties} onDoubleClick={() => onRoomLabelOpen(room.id)}>
          {activeRoomLabelId === room.id ? <select value={room.roomType} onBlur={() => setActiveRoomLabelId(null)} onChange={(event) => { onRoomLabelTypeChange(room.id, event.target.value); setActiveRoomLabelId(null); }} aria-label={`Room type for ${room.name}`}>{ROOM_TYPES.map((type) => <option value={type} key={type}>{type}</option>)}</select> : <button type="button" onClick={() => setActiveRoomLabelId(room.id)}>{room.name}</button>}
          {annotationVisible("area") ? <span>{(polylineArea(room.boundary) / 144).toLocaleString(undefined, { maximumFractionDigits: 1 })} SQ FT</span> : null}
          {annotationVisible("interior-dimensions") ? <span>{formatArchitectural(width)} × {formatArchitectural(depth)}</span> : null}
          {annotationVisible("rough-ceiling-height") && effective ? activeRoomCeilingId === room.id ? <input className="room-label-ceiling-input" value={roomCeilingDraft} onChange={(event) => setRoomCeilingDraft(event.target.value)} onBlur={() => setActiveRoomCeilingId(null)} onKeyDown={(event) => {
            if (event.key === "Escape") setActiveRoomCeilingId(null);
            if (event.key === "Enter") {
              const height = parseArchitectural(roomCeilingDraft);
              if (height !== null && onRoomCeilingHeightChange(room.id, height)) setActiveRoomCeilingId(null);
            }
          }} aria-label={`Rough ceiling height for ${room.name}`} /> : <span className="room-label-ceiling" title="Double-click to edit the Room rough ceiling height" onDoubleClick={(event) => { event.stopPropagation(); setRoomCeilingDraft(formatArchitectural(effective.roughCeilingHeight)); setActiveRoomCeilingId(room.id); }}>CLG {formatArchitectural(effective.roughCeilingHeight)}</span> : null}
        </div>;
      })}
      {temporaryWallDimensionScreen && temporarilyDimensionedWall?.architecturalRole === "wall" && !dragStatus && !lineMode ? (
        <TemporaryWallDimension
          key={temporarilyDimensionedWall.id}
          length={lineLength(temporarilyDimensionedWall)}
          screen={temporaryWallDimensionScreen}
          onClearanceCommit={(referenceWallId, distance) => onWallClearanceChange(temporarilyDimensionedWall.id, referenceWallId, distance)}
          onCommit={(fixedEndpoint, length) => onWallLengthChange(temporarilyDimensionedWall.id, fixedEndpoint, length)}
        />
      ) : null}
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
      {selectedLineId && !lineMode && !dragStatus ? <div className="move-grip-hint">{temporarilyDimensionedWall?.architecturalRole === "wall" ? "Wall selected · edit blue length · S/E holds an endpoint · edit green Wall-to-Wall dimensions" : "Line selected · blue endpoints reshape · green midpoint moves"}</div> : null}
      {selectedCircleId && !circleMode && !dragStatus ? <div className="move-grip-hint">Circle selected · green center moves · blue quadrant grips resize</div> : null}
      {selectedArcId && !arcMode && !dragStatus ? <div className="move-grip-hint">Arc selected · blue endpoints and midpoint reshape · green center moves</div> : null}
      {polylineMode && !dragStatus ? <div className="move-grip-hint is-drawing">POLYLINE · click or type points · distance follows cursor · U undoes · C closes</div> : null}
      {rectangleMode && !dragStatus ? <div className="move-grip-hint is-drawing">RECTANGLE · click or type first corner · opposite corner or width × height</div> : null}
      {selectedPolylineId && !polylineMode && !rectangleMode && !dragStatus ? <div className="move-grip-hint">{(() => { const selected = document.polylines.find((polyline) => polyline.id === selectedPolylineId); return selected?.architecturalRole === "roof-plane" ? "Roof Plane selected · gold eave grips adjust bearing span · blue grips shape the roof boundary" : selected?.shape === "rectangle" && rectangleSupportsConstrainedGrips(selected) ? "Rectangle selected · corner and edge grips resize · center grip moves" : "Closed polyline selected · drag blue vertex grips to reshape"; })()}</div> : null}
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
  const [projectSetupMode, setProjectSetupMode] = useState<"edit" | "new" | null>(null);
  // One value is the source of truth for which tool is running. The individual
  // flags below are derived from it, so the Viewport and the panels keep reading
  // the booleans they always read while two tools can no longer be active at once.
  const [activeTool, setActiveTool] = useState<ActiveTool>(SELECT_TOOL);
  const {
    arcMode, boundaryMode, breakMode, chamferMode, circleMode, copyMode, extendMode,
    filletMode, foundationWallMode, lengthenMode, lineMode, mirrorMode, moveMode,
    offsetMode, polylineMode, rectangleMode, rotateMode, scaleMode, stretchMode,
    trimMode, wallMode,
  } = toolFlags(activeTool);
  const [referenceDisplayOpen, setReferenceDisplayOpen] = useState(false);
  const [storyManagerOpen, setStoryManagerOpen] = useState(false);
  const [foundationManagerOpen, setFoundationManagerOpen] = useState(false);
  const [framingManagerOpen, setFramingManagerOpen] = useState(false);
  const [roofDefaultsOpen, setRoofDefaultsOpen] = useState(false);
  const [openingTypeManagerOpen, setOpeningTypeManagerOpen] = useState(false);
  const [productLibraryOpen, setProductLibraryOpen] = useState(false);
  const [wallTypeManagerOpen, setWallTypeManagerOpen] = useState(false);
  const [roomManagerOpen, setRoomManagerOpen] = useState(false);
  const [roomManagerInitialRoomId, setRoomManagerInitialRoomId] = useState<string | null>(null);
  const [nameEntryDialog, setNameEntryDialog] = useState<null | {
    initialValue: string;
    kind: "rename-layer-set" | "save-plan-view";
    targetId?: string;
  }>(null);
  const [explorerTab, setExplorerTab] = useState<"building" | "objects" | "layers">("objects");
  const [showStartGuide, setShowStartGuide] = useState(true);
  const [topMenu, setTopMenu] = useState<"edit" | "file" | "help" | "program" | "tools" | "view" | "window" | null>(null);
  const interfaceTheme = useSyncExternalStore(subscribeInterfaceTheme, storedInterfaceTheme, (): InterfaceTheme => "light");
  const [layerFilter, setLayerFilter] = useState("");
  const [fitViewSignal, setFitViewSignal] = useState(0);
  const [viewTarget, setViewTarget] = useState<ViewTarget>(VIEW_PRESETS.top);
  const [mirrorKeepSource, setMirrorKeepSource] = useState(true);
  const [offsetDistance, setOffsetDistance] = useState(6);
  const [offsetKeepSource, setOffsetKeepSource] = useState(true);
  const [chamferFirstDistance, setChamferFirstDistance] = useState(6);
  const [chamferSecondDistance, setChamferSecondDistance] = useState(6);
  const [chamferStage, setChamferStage] = useState<0 | 1>(0);
  const [chamferDistancePrompt, setChamferDistancePrompt] = useState<0 | 1 | 2>(0);
  const [breakStage, setBreakStage] = useState<0 | 1 | 2>(0);
  const [filletRadius, setFilletRadius] = useState(6);
  const [filletStage, setFilletStage] = useState<0 | 1>(0);
  const [lengthenMethod, setLengthenMethod] = useState<LengthenMethod>("delta");
  const [lengthenValue, setLengthenValue] = useState(6);
  const [stretchTargets, setStretchTargets] = useState<CadStretchTarget[]>([]);
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
  const [lineSnapAngles, setLineSnapAngles] = useState(() => [0, 90, 180, 270]);
  const [lineSnapAngleDraft, setLineSnapAngleDraft] = useState("");
  const [lineSnapAngleError, setLineSnapAngleError] = useState("");
  const [cadDraftingSettings, setCadDraftingSettings] = useState<CadDraftingSettings>(() => ({ ...DEFAULT_CAD_DRAFTING_SETTINGS, objectSnapModes: [...DEFAULT_OBJECT_SNAP_MODES] }));
  const [draftingPreferencesReady, setDraftingPreferencesReady] = useState(false);
  const [objectSnapOverride, setObjectSnapOverride] = useState<ObjectSnapMode | null>(null);
  const [activeElevationDraft, setActiveElevationDraft] = useState(() => formatSignedArchitectural(DEFAULT_CAD_DRAFTING_SETTINGS.activeElevation));
  const [activeElevationError, setActiveElevationError] = useState("");
  const [commandDraft, setCommandDraft] = useState("");
  const [lastCommandName, setLastCommandName] = useState<"arc" | "circle" | "foundation-wall" | "line" | "polyline" | "rectangle" | "wall" | null>(null);
  const [polylineSegmentMode, setPolylineSegmentMode] = useState<PolylineSegmentMode>("line");
  const [polylineWidth, setPolylineWidth] = useState(0);
  const [polylineWidthDraft, setPolylineWidthDraft] = useState("0");
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
  const [showDashboard, setShowDashboard] = useState(true);
  const [hasActiveProject, setHasActiveProject] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProjectRecord[]>([]);
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

  const storeRecentProject = useCallback((project: ModelBuilderProject) => {
    let skipped: RecentProjectSkip | null = null;
    setRecentProjects((current) => {
      const update = rememberRecentProject(current, project);
      try {
        window.localStorage.setItem(
          RECENT_PROJECTS_STORAGE_KEY,
          serializeRecentProjects(update.records),
        );
        skipped = update.skipped;
        return update.records;
      } catch {
        skipped = { bytes: 0, limit: MAXIMUM_RECENT_PROJECT_BYTES, reason: "storage-full" };
        return current;
      }
    });
    // Report rather than drop in silence: a project missing from the dashboard
    // reads as lost work even though the .mbproj file is intact.
    if (skipped) setFileNotice({ text: describeRecentProjectSkip(skipped), tone: "error" });
  }, []);

  const forgetRecentProject = useCallback((projectId: string) => {
    setRecentProjects((current) => {
      const next = removeRecentProject(current, projectId);
      try {
        window.localStorage.setItem(
          RECENT_PROJECTS_STORAGE_KEY,
          serializeRecentProjects(next),
        );
      } catch {
        // Removing the dashboard shortcut remains best-effort if browser storage is unavailable.
      }
      return next;
    });
  }, []);

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
  const activeStoryIndex = editor.present.building.stories.findIndex((story) => story.id === activeStory.id);
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
  const selectedAppearanceRef = selectedEntityRefs.length === 1 ? selectedEntityRefs[0] : null;
  const selectedAppearanceObject = selectedAppearanceRef?.kind === "box" ? findBoxObject(editor.present, selectedAppearanceRef.id)
    : selectedAppearanceRef?.kind === "line" ? findLineObject(editor.present, selectedAppearanceRef.id)
      : selectedAppearanceRef?.kind === "polyline" ? findPolylineObject(editor.present, selectedAppearanceRef.id)
        : selectedAppearanceRef?.kind === "circle" ? findCircleObject(editor.present, selectedAppearanceRef.id)
          : selectedAppearanceRef?.kind === "arc" ? findArcObject(editor.present, selectedAppearanceRef.id)
            : null;
  const selectedAppearanceLayer = findLayer(editor.present, selectedAppearanceObject?.layerId ?? null);
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
  const selectedRoofPlanes = selectedEntityRefs
    .filter((ref) => ref.kind === "polyline")
    .map((ref) => findPolylineObject(editor.present, ref.id))
    .filter((polyline): polyline is PolylineObject => polyline?.architecturalRole === "roof-plane");
  const selectionCanJoinRoofPlanes = selectedEntityRefs.length === 2 &&
    selectedRoofPlanes.length === 2 &&
    selectedRoofPlanes[0].storyId === selectedRoofPlanes[1].storyId &&
    selectedRoofPlanes.every((polyline) => polylineIsEditable(editor.present, polyline));
  const selectionCanJoinCurves = selectedEntityRefs.length >= 2 && selectedEntityRefs.every((ref) =>
    (ref.kind === "line" || ref.kind === "arc" || (ref.kind === "polyline" && !findPolylineObject(editor.present, ref.id)?.closed)) &&
    modelEntityIsEditable(editor.present, ref));
  const selectionCanJoin = selectionCanJoinCurves || selectionCanJoinRoofPlanes;
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
    const timeout = window.setTimeout(() => {
      const storedAngles = storedAdditionalLineSnapAngles();
      const storedDrafting = storedCadDraftingSettings();
      setLineSnapAngles([0, 90, 180, 270, ...storedAngles]);
      setLineSnapAngleDraft(storedAngles.join(", "));
      setCadDraftingSettings(storedDrafting);
      setActiveElevationDraft(formatSignedArchitectural(storedDrafting.activeElevation));
      setDraftingPreferencesReady(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        setRecentProjects(parseRecentProjects(
          window.localStorage.getItem(RECENT_PROJECTS_STORAGE_KEY),
        ));
      } catch {
        setRecentProjects([]);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!draftingPreferencesReady) return;
    try {
      window.localStorage.setItem(LINE_SNAP_ANGLES_STORAGE_KEY, JSON.stringify(lineSnapAngles));
    } catch {
      // Line tracking settings remain available for the current session.
    }
  }, [draftingPreferencesReady, lineSnapAngles]);

  useEffect(() => {
    if (!draftingPreferencesReady) return;
    try {
      window.localStorage.setItem(CAD_DRAFTING_SETTINGS_STORAGE_KEY, JSON.stringify(cadDraftingSettings));
    } catch {
      // Drafting settings remain available for the current session.
    }
  }, [cadDraftingSettings, draftingPreferencesReady]);

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
  const activeLayerSet = editor.present.layerSets.find((set) => set.id === editor.present.activeLayerSetId) ?? editor.present.layerSets[0];
  const activeSavedPlanView = editor.present.savedPlanViews.find((view) => view.id === editor.present.activeSavedPlanViewId) ?? editor.present.savedPlanViews[0];
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
    setActiveTool(toolAfterSelection);
    setStretchTargets([]);
    setShowStartGuide(true);
    setDragStatus(null);
  }, [editor.present, selectCadEntity]);

  const selectPolyline = useCallback((polylineId: string | null, additive = false) => {
    const polyline = findPolylineObject(editor.present, polylineId);
    const layer = findLayer(editor.present, polyline?.layerId ?? null);
    if (polyline && !layer?.visible) return;
    selectCadEntity(polyline ? { id: polyline.id, kind: "polyline" } : null, additive);
    setActiveTool(toolAfterSelection);
    setDragStatus(null);
  }, [editor.present, selectCadEntity]);

  const selectCircle = useCallback((circleId: string | null, additive = false) => {
    const circle = findCircleObject(editor.present, circleId);
    const layer = findLayer(editor.present, circle?.layerId ?? null);
    if (circle && !layer?.visible) return;
    selectCadEntity(circle ? { id: circle.id, kind: "circle" } : null, additive);
    setActiveTool(toolAfterSelection);
    setDragStatus(null);
  }, [editor.present, selectCadEntity]);

  const selectArc = useCallback((arcId: string | null, additive = false) => {
    const arc = findArcObject(editor.present, arcId);
    const layer = findLayer(editor.present, arc?.layerId ?? null);
    if (arc && !layer?.visible) return;
    selectCadEntity(arc ? { id: arc.id, kind: "arc" } : null, additive);
    setActiveTool(toolAfterSelection);
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
    setActiveTool(toolAfterSelection);
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
    setActiveTool(toolAfterSelection);
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
    setActiveTool(toolAfterSelection);
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
    setActiveTool(toolAfterSelection);
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
    setActiveTool(toolAfterSelection);
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
    setActiveTool(toolAfterSelection);
    setSelectedFaceIndex(null);
    setFileNotice({
      text: `${lockNext ? "Locked" : "Unlocked"} ${selectedObjectIds.length} object${selectedObjectIds.length === 1 ? "" : "s"}.`,
      tone: "success",
    });
  }, [allSelectedLocked, editor.present, selectedObjectIds]);

  const startCopyMode = useCallback(() => {
    setActiveTool({ kind: "copy" });
    setBreakStage(0);
    if (!selectionCanModify) return;
    setDragStatus(null);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletStage(0);
    setSelectedFaceIndex(null);
    setStretchTargets([]);
    setFileNotice({ text: "Copy active. Click a base point, then click a target point, or enter an exact offset.", tone: "info" });
  }, [selectionCanModify]);

  const finishCopyMode = useCallback(() => {
    setActiveTool(SELECT_TOOL);
    setFileNotice({ text: "Copy mode finished.", tone: "info" });
  }, []);

  // Lengthen needs a selection it can act on. It used to also need clearing when
  // another mode turned on, but two tools can no longer run at once.
  useEffect(() => {
    if (!lengthenMode || selectionCanLengthen) return;
    const timeout = window.setTimeout(() => setActiveTool(SELECT_TOOL), 0);
    return () => window.clearTimeout(timeout);
  }, [lengthenMode, selectionCanLengthen]);

  const finishModifyMode = useCallback((canceled: boolean) => {
    setActiveTool(SELECT_TOOL);
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
    setActiveTool(SELECT_TOOL);
    setBreakStage(0);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletStage(0);
    setStretchTargets([]);
    setSelectedFaceIndex(null);
  }, []);

  const finishBoundaryMode = useCallback((canceled = true) => {
    setActiveTool(SELECT_TOOL);
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
    setActiveTool({ kind: "boundary" });
    setBreakStage(0);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletStage(0);
    setStretchTargets([]);
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

  const joinSelection = useCallback(() => {
    if (!selectionCanJoin) {
      setFileNotice({ text: "Select two overlapping Roof Planes, or at least two unlocked endpoint-connected curves, before using Join.", tone: "info" });
      return false;
    }
    if (selectionCanJoinRoofPlanes) {
      const result = joinRoofPlanes(editor.present, selectedRoofPlanes[0].id, selectedRoofPlanes[1].id);
      if (!result) {
        setFileNotice({ text: "Roof Join needs two intersecting, nonparallel Roof Planes on the same Story, with each protected eave on its own side of the calculated intersection.", tone: "error" });
        return false;
      }
      activateSelectMode();
      dispatch({ type: "commit", next: result.document });
      applyCadSelection(result.document, selectedEntityRefs, selectedEntityRefs.at(-1) ?? null);
      setFileNotice({ text: `Joined the Roof Planes at a calculated ${result.edge.role}. The shared edge and net roof areas are ready for future material calculations.`, tone: "success" });
      return true;
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
  }, [activateSelectMode, applyCadSelection, editor.present, selectedArcId, selectedEntityRefs, selectedLineId, selectedPolylineId, selectedRoofPlanes, selectionCanJoin, selectionCanJoinRoofPlanes]);

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
    setActiveTool(SELECT_TOOL);
    setStretchTargets([]);
    setDragStatus(null);
    if (canceled) setFileNotice({ text: "Stretch canceled.", tone: "info" });
  }, []);

  const activateStretchMode = useCallback(() => {
    setActiveTool({ kind: "stretch" });
    setBreakStage(0);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletStage(0);
    setDragStatus(null);
    setStretchTargets([]);
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
    setActiveTool({ kind: "move" });
    setBreakStage(0);
    if (!selectionCanModify) return;
    setDragStatus(null);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletStage(0);
    setStretchTargets([]);
    setSelectedFaceIndex(null);
    setFileNotice({ text: "Move active. Click a base point, then click a target point, or enter an exact offset.", tone: "info" });
  }, [selectionCanModify]);

  const activateRotateMode = useCallback(() => {
    setActiveTool({ kind: "rotate" });
    setBreakStage(0);
    if (!selectionCanModify) return;
    setDragStatus(null);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletStage(0);
    setStretchTargets([]);
    setSelectedFaceIndex(null);
    setFileNotice({ text: "Rotate active. Drag the gold ring; hold Shift for 1° snapping, or enter an exact angle in Properties.", tone: "info" });
  }, [selectionCanModify]);

  const activateScaleMode = useCallback(() => {
    setActiveTool({ kind: "scale" });
    setBreakStage(0);
    if (!selectionCanModify) return;
    setDragStatus(null);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletStage(0);
    setStretchTargets([]);
    setSelectedFaceIndex(null);
    setFileNotice({ text: "Scale active. Drag the green square, hold Shift for 0.01 precision, or enter an exact factor in Properties.", tone: "info" });
  }, [selectionCanModify]);

  const activateMirrorMode = useCallback(() => {
    setActiveTool({ kind: "mirror" });
    setBreakStage(0);
    if (!selectionCanModify) return;
    setDragStatus(null);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletStage(0);
    setStretchTargets([]);
    setSelectedFaceIndex(null);
    setViewTarget(VIEW_PRESETS.top);
    setFileNotice({ text: "Mirror active. Pick two snapped points to define the mirror axis.", tone: "info" });
  }, [selectionCanModify]);

  const activateOffsetMode = useCallback(() => {
    setActiveTool({ kind: "offset" });
    setBreakStage(0);
    if (!selectionCanOffset) {
      setFileNotice({ text: "Select one unlocked Line, Polyline, Rectangle, Circle, or Arc before starting Offset.", tone: "info" });
      return;
    }
    setDragStatus(null);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletStage(0);
    setStretchTargets([]);
    setSelectedFaceIndex(null);
    setViewTarget(VIEW_PRESETS.top);
    setFileNotice({ text: `Offset active at ${formatArchitectural(offsetDistance)}. Click the side for the new entity.`, tone: "info" });
  }, [offsetDistance, selectionCanOffset]);

  const activateChamferMode = useCallback(() => {
    setActiveTool({ kind: "chamfer" });
    setBreakStage(0);
    setDragStatus(null);
    setFilletStage(0);
    setStretchTargets([]);
    setSelectedFaceIndex(null);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setViewTarget(VIEW_PRESETS.top);
    setCommandDraft("");
    setFileNotice({ text: `Chamfer active at ${formatArchitectural(chamferFirstDistance)} × ${formatArchitectural(chamferSecondDistance)}. Select two Lines, or type P to apply it to the selected Polyline.`, tone: "info" });
  }, [chamferFirstDistance, chamferSecondDistance]);

  const activateBreakMode = useCallback((mode: BreakMode) => {
    setDragStatus(null);
    setActiveTool({ kind: "break", mode });
    setBreakStage(0);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletStage(0);
    setStretchTargets([]);
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
    setActiveTool({ kind: "lengthen" });
    setBreakStage(0);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletStage(0);
    setStretchTargets([]);
    setSelectedFaceIndex(null);
    setViewTarget(VIEW_PRESETS.top);
    setCommandDraft("");
    setFileNotice({ text: `Lengthen ${lengthenMethod} active. Pick the selected curve near the endpoint to change.`, tone: "info" });
  }, [lengthenMethod, selectionCanLengthen]);

  const activateFilletMode = useCallback(() => {
    setActiveTool({ kind: "fillet" });
    setBreakStage(0);
    setDragStatus(null);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setStretchTargets([]);
    setSelectedFaceIndex(null);
    setFilletStage(0);
    setViewTarget(VIEW_PRESETS.top);
    setCommandDraft("");
    setFileNotice({ text: `Fillet active at ${formatArchitectural(filletRadius)}. Select two Lines or Arcs, or type P to apply it to the selected Polyline.`, tone: "info" });
  }, [filletRadius]);

  const activateTrimMode = useCallback(() => {
    setActiveTool({ kind: "trim" });
    setBreakStage(0);
    if (!selectionCanTrim) {
      setFileNotice({ text: "Select one unlocked Line, Polyline, Rectangle, Circle, or Arc before starting Trim.", tone: "info" });
      return;
    }
    setDragStatus(null);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletStage(0);
    setStretchTargets([]);
    setSelectedFaceIndex(null);
    setViewTarget(VIEW_PRESETS.top);
    setFileNotice({ text: "Trim active. Every other visible 2D entity is a boundary; click the portion to remove.", tone: "info" });
  }, [selectionCanTrim]);

  const activateExtendMode = useCallback(() => {
    setActiveTool({ kind: "extend" });
    setBreakStage(0);
    if (!selectionCanExtend) {
      setFileNotice({ text: "Select one unlocked Line, Arc, or open Polyline before starting Extend.", tone: "info" });
      return;
    }
    setDragStatus(null);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletStage(0);
    setStretchTargets([]);
    setSelectedFaceIndex(null);
    setViewTarget(VIEW_PRESETS.top);
    setFileNotice({ text: "Extend active. Click near the open endpoint to extend it to the first visible boundary.", tone: "info" });
  }, [selectionCanExtend]);

  const activateLineMode = useCallback(() => {
    setActiveTool({ kind: "line", role: null });
    setBreakStage(0);
    setDragStatus(null);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletStage(0);
    setObjectSnapOverride(null);
    setStretchTargets([]);
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
    setActiveTool({ kind: "line", role: "wall" });
    setLastCommandName("wall");
    setDrawingPlaneFromBuilding(editor.present.building);
    setFileNotice({ text: "Wall active. Draw the exterior face of the Main layer; the exterior defaults to the left of Start → End.", tone: "info" });
  }, [activateLineMode, editor.present.building, setDrawingPlaneFromBuilding]);

  const activateFoundationWallMode = useCallback(() => {
    activateLineMode();
    setActiveTool({ kind: "line", role: "foundation-wall" });
    setLastCommandName("foundation-wall");
    setDrawingPlaneFromBuilding(editor.present.building);
    setFileNotice({ text: "Foundation Wall active. Draw the exterior face of the concrete Main layer; the exterior defaults to the left of Start → End.", tone: "info" });
  }, [activateLineMode, editor.present.building, setDrawingPlaneFromBuilding]);

  const activateArcMode = useCallback((method: ArcMethod = arcMethod) => {
    setActiveTool({ kind: "arc" });
    setBreakStage(0);
    setChamferStage(0);
    setChamferDistancePrompt(0);
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
      setFileNotice({ text: "Continue needs a previously drawn or selected line, Arc, or open polyline.", tone: "error" });
      return;
    }
    setDragStatus(null);
    setObjectSnapOverride(null);
    setStretchTargets([]);
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
    setActiveTool({ kind: "circle" });
    setBreakStage(0);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletStage(0);
    setDragStatus(null);
    setObjectSnapOverride(null);
    setStretchTargets([]);
    setCircleMethod(method);
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
    setActiveTool({ kind: "polyline" });
    setBreakStage(0);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletStage(0);
    setDragStatus(null);
    setObjectSnapOverride(null);
    setStretchTargets([]);
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
    setActiveTool({ kind: "rectangle" });
    setBreakStage(0);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletStage(0);
    setDragStatus(null);
    setObjectSnapOverride(null);
    setStretchTargets([]);
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
    setActiveTool(SELECT_TOOL);
    setLineAnchor(null);
    setObjectSnapOverride(null);
    setCommandDraft("");
    setDragStatus(null);
    setFileNotice({ text: `${foundationWallMode ? "Foundation Wall" : wallMode ? "Wall" : "Line"} tool finished.`, tone: "info" });
  }, [foundationWallMode, wallMode]);

  const finishArcMode = useCallback(() => {
    setActiveTool(SELECT_TOOL);
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
    setActiveTool(SELECT_TOOL);
    setCirclePoints([]);
    setCircleCommand(null);
    setObjectSnapOverride(null);
    setCommandDraft("");
    setDragStatus(null);
    setFileNotice({ text: "Circle tool finished.", tone: "info" });
  }, []);

  const finishPolylineMode = useCallback(() => {
    setActiveTool(SELECT_TOOL);
    setPolylineAnchor(null);
    setPolylineCommand(null);
    setObjectSnapOverride(null);
    setCommandDraft("");
    setDragStatus(null);
    setFileNotice({ text: "Polyline tool finished.", tone: "info" });
  }, []);

  const finishRectangleMode = useCallback(() => {
    setActiveTool(SELECT_TOOL);
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
    setActiveTool(SELECT_TOOL);
    setDragStatus(null);
    setFileNotice({ text: "Rotate mode finished.", tone: "info" });
  }, []);

  const finishScaleMode = useCallback(() => {
    setActiveTool(SELECT_TOOL);
    setDragStatus(null);
    setFileNotice({ text: "Scale mode finished.", tone: "info" });
  }, []);

  const finishMirrorMode = useCallback(() => {
    setActiveTool(SELECT_TOOL);
    setDragStatus(null);
    setFileNotice({ text: "Mirror canceled.", tone: "info" });
  }, []);

  const finishOffsetMode = useCallback(() => {
    setActiveTool(SELECT_TOOL);
    setDragStatus(null);
    setFileNotice({ text: "Offset canceled.", tone: "info" });
  }, []);

  const finishChamferMode = useCallback((canceled = true) => {
    setActiveTool(SELECT_TOOL);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setDragStatus(null);
    if (canceled) setFileNotice({ text: "Chamfer canceled.", tone: "info" });
  }, []);

  const finishBreakMode = useCallback((canceled = true) => {
    setActiveTool(SELECT_TOOL);
    setBreakStage(0);
    setDragStatus(null);
    if (canceled) setFileNotice({ text: "Break canceled.", tone: "info" });
  }, []);

  const finishLengthenMode = useCallback((canceled = true) => {
    setActiveTool(SELECT_TOOL);
    setDragStatus(null);
    if (canceled) setFileNotice({ text: "Lengthen canceled.", tone: "info" });
  }, []);

  const finishFilletMode = useCallback((canceled = true) => {
    setActiveTool(SELECT_TOOL);
    setFilletStage(0);
    setDragStatus(null);
    if (canceled) setFileNotice({ text: "Fillet canceled.", tone: "info" });
  }, []);

  const finishTrimExtendMode = useCallback(() => {
    setActiveTool(SELECT_TOOL);
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
    setActiveTool(toolAfterSelection);
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

  const resizeWallFromTemporaryDimension = useCallback((lineId: string, fixedEndpoint: LineFixedEndpoint, length: number) => {
    const line = findLineObject(editor.present, lineId);
    if (!line || line.architecturalRole !== "wall") return false;
    if (Math.abs(lineLength(line) - length) < 1 / 32) return true;
    const geometry = resizeLineFromFixedEndpoint(line, length, fixedEndpoint);
    const next = geometry ? updateLineObject(editor.present, line.id, geometry) : null;
    if (!next) {
      setFileNotice({ text: "That Wall length conflicts with a lock or its hosted openings.", tone: "error" });
      return false;
    }
    dispatch({ type: "commit", next });
    setFileNotice({ text: `${line.name} is now ${formatArchitectural(length)} long; the ${fixedEndpoint} endpoint stayed fixed.`, tone: "success" });
    return true;
  }, [editor.present]);

  const setWallClearanceFromTemporaryDimension = useCallback((selectedWallId: string, referenceWallId: string, distance: number) => {
    const selected = findLineObject(editor.present, selectedWallId);
    const reference = findLineObject(editor.present, referenceWallId);
    if (!selected || !reference) return false;
    const next = setParallelWallDimension(editor.present, selectedWallId, referenceWallId, distance);
    if (!next) {
      setFileNotice({ text: "That clearance conflicts with a connected Wall, hosted opening, or locked object.", tone: "error" });
      return false;
    }
    dispatch({ type: "commit", next });
    setFileNotice({ text: `${selected.name} moved to ${formatArchitectural(distance)} from ${reference.name}; automatically joined corners stayed connected.`, tone: "success" });
    return true;
  }, [editor.present]);

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

  const createRoofPlaneForSelectedWall = useCallback(() => {
    if (!selectedLine || selectedLine.architecturalRole !== "wall" || !selectedLineIsEditable) return;
    const result = createRoofPlaneFromWall(editor.present, selectedLine.id);
    if (!result) {
      setFileNotice({ text: "A Roof Plane requires an editable framed Wall with a valid exterior side, Wall Type, Story, and Roof defaults.", tone: "error" });
      return;
    }
    dispatch({ type: "commit", next: result.document });
    setSelectedLineId(null);
    setSelectedPolylineId(result.roofPlane.id);
    setSelectedEntityKeys([cadEntityKey({ id: result.roofPlane.id, kind: "polyline" })]);
    setFileNotice({ text: `Created ${result.roofPlane.name} from the exterior face of the Wall main layer.`, tone: "success" });
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

  const updateSelectedRoofPlane = useCallback((change: Parameters<typeof updateRoofPlane>[2]) => {
    if (!selectedPolyline || selectedPolyline.architecturalRole !== "roof-plane") return;
    const next = updateRoofPlane(editor.present, selectedPolyline.id, change);
    if (!next) {
      setFileNotice({ text: "That Roof Plane value is outside the supported range or would collapse its footprint.", tone: "error" });
      return;
    }
    dispatch({ type: "commit", next });
  }, [editor.present, selectedPolyline]);

  const assignSelectedRoofType = useCallback((roofTypeId: string) => {
    if (!selectedPolyline || selectedPolyline.architecturalRole !== "roof-plane") return;
    const next = assignRoofPlaneType(editor.present, selectedPolyline.id, roofTypeId);
    if (!next) {
      setFileNotice({ text: "That Roof Type is unavailable or the Roof Plane is locked.", tone: "error" });
      return;
    }
    dispatch({ type: "commit", next });
    const roofType = next.building.roofTypes.find((candidate) => candidate.id === roofTypeId);
    setFileNotice({ text: `Assigned ${roofType?.name ?? "Roof Type"} to ${selectedPolyline.name}.`, tone: "success" });
  }, [editor.present, selectedPolyline]);

  const setSelectedRoofPlaneFasciaTop = useCallback((fasciaTopElevation: number) => {
    if (!selectedPolyline || selectedPolyline.architecturalRole !== "roof-plane") return;
    const next = updateRoofPlaneFasciaTop(editor.present, selectedPolyline.id, fasciaTopElevation);
    if (!next) {
      setFileNotice({ text: "That fascia elevation would create an unsupported Height Above Plate.", tone: "error" });
      return;
    }
    dispatch({ type: "commit", next });
    setFileNotice({ text: "Updated Fascia Top and recalculated Height Above Plate.", tone: "success" });
  }, [editor.present, selectedPolyline]);

  const matchSelectedRoofPlaneFascia = useCallback((sourceRoofPlaneId: string) => {
    if (!selectedPolyline || selectedPolyline.architecturalRole !== "roof-plane") return;
    const source = findPolylineObject(editor.present, sourceRoofPlaneId);
    const next = matchRoofPlaneFascia(editor.present, selectedPolyline.id, sourceRoofPlaneId);
    if (!next || !source) {
      setFileNotice({ text: "Select another valid Roof Plane to match.", tone: "error" });
      return;
    }
    dispatch({ type: "commit", next });
    setFileNotice({ text: `Matched ${selectedPolyline.name} fascia elevation to ${source.name}.`, tone: "success" });
  }, [editor.present, selectedPolyline]);

  const addSelectedRoofBoundaryVertex = useCallback(() => {
    if (!selectedPolyline || selectedPolyline.architecturalRole !== "roof-plane") return;
    const next = addRoofPlaneBoundaryVertex(editor.present, selectedPolyline.id);
    if (!next) {
      setFileNotice({ text: "A boundary point could not be added without making the Roof Plane invalid.", tone: "error" });
      return;
    }
    dispatch({ type: "commit", next });
    setFileNotice({ text: "Added a blue Roof boundary grip. Drag it to shape a hip, valley, rake, or clipped edge.", tone: "success" });
  }, [editor.present, selectedPolyline]);

  const simplifySelectedRoofBoundary = useCallback(() => {
    if (!selectedPolyline || selectedPolyline.architecturalRole !== "roof-plane") return;
    const next = simplifyRoofPlaneBoundary(editor.present, selectedPolyline.id);
    if (!next) {
      setFileNotice({ text: "This Roof Plane is already at its minimum boundary or cannot be simplified safely.", tone: "error" });
      return;
    }
    dispatch({ type: "commit", next });
    setFileNotice({ text: "Removed the least shape-defining Roof boundary point.", tone: "success" });
  }, [editor.present, selectedPolyline]);

  const convertSelectedRoofPlaneToBoundary = useCallback(() => {
    if (!selectedPolyline || selectedPolyline.architecturalRole !== "roof-plane") return;
    const next = removeRoofPlaneRole(editor.present, selectedPolyline.id);
    if (!next) return;
    dispatch({ type: "commit", next });
    setFileNotice({ text: "Removed the Roof Plane role; its closed outline remains as a drafting boundary.", tone: "success" });
  }, [editor.present, selectedPolyline]);

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

  const selectActiveWallType = useCallback((wallTypeId: string) => {
    const selectedType = editor.present.building.wallTypes.find((wallType) => wallType.id === wallTypeId);
    if (!selectedType) return;
    const building = cloneBuildingStructure(editor.present.building);
    building.activeWallUse = wallUseForType(selectedType);
    building.activeWallTypeId = wallTypeId;
    const next = updateDocumentBuilding(editor.present, building);
    if (!next) {
      setFileNotice({ text: "The selected Wall type could not be activated.", tone: "error" });
      return;
    }
    dispatch({ type: "commit", next });
    setFileNotice({ text: `${selectedType?.name ?? "Wall type"} is active for new walls.`, tone: "success" });
  }, [editor.present]);

  const selectActiveWallUse = useCallback((use: WallUse) => {
    const building = cloneBuildingStructure(editor.present.building);
    const wallTypeId = defaultWallTypeIdForUse(building, use);
    const selectedType = building.wallTypes.find((wallType) => wallType.id === wallTypeId && wallTypeMatchesUse(wallType, use));
    if (!selectedType) {
      setFileNotice({ text: `No valid ${WALL_USE_LABELS[use]} default is assigned. Open Project Setup to choose one.`, tone: "error" });
      return;
    }
    building.activeWallUse = use;
    building.activeWallTypeId = wallTypeId;
    const next = updateDocumentBuilding(editor.present, building);
    if (!next) return;
    dispatch({ type: "commit", next });
    setFileNotice({ text: `${WALL_USE_LABELS[use]} active · ${selectedType.name}.`, tone: "success" });
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

  const activateLibraryProduct = useCallback((target: ProductLibraryTarget) => {
    if (target.kind !== "opening") return;
    const openingType = editor.present.building.openingTypes.find((type) => type.id === target.typeId);
    if (!openingType) return;
    const building = cloneBuildingStructure(editor.present.building);
    if (openingType.kind === "door") building.activeDoorTypeId = target.typeId;
    else building.activeWindowTypeId = target.typeId;
    const next = updateDocumentBuilding(editor.present, building);
    if (!next) {
      setFileNotice({ text: "That product could not be made active because its project Type is invalid.", tone: "error" });
      return;
    }
    dispatch({ type: "commit", next });
    setFileNotice({ text: `${openingType.name} is active for new ${openingType.kind === "door" ? "Doors" : "Windows"}.`, tone: "success" });
  }, [editor.present]);

  const attachLibraryProductAsset = useCallback((target: ProductLibraryTarget, asset: ProductAssetReference) => {
    const building = cloneBuildingStructure(editor.present.building);
    const productType = target.kind === "opening"
      ? building.openingTypes.find((type) => type.id === target.typeId)
      : building.productObjectTypes.find((type) => type.id === target.typeId);
    if (!productType || productType.productAssets.length >= 16) {
      setFileNotice({ text: "That product cannot accept another representation.", tone: "error" });
      return false;
    }
    productType.productAssets.push({ ...asset, alignment: { ...asset.alignment } });
    const next = updateDocumentBuilding(editor.present, building);
    if (!next) {
      setFileNotice({ text: "The stored representation did not produce a valid product record.", tone: "error" });
      return false;
    }
    dispatch({ type: "commit", next });
    setFileNotice({ text: `${asset.name} was validated, stored privately, and attached to ${productType.name}.`, tone: "success" });
    return true;
  }, [editor.present]);

  const updateLibraryProductAsset = useCallback((target: ProductLibraryTarget, asset: ProductAssetReference) => {
    const building = cloneBuildingStructure(editor.present.building);
    const productType = target.kind === "opening"
      ? building.openingTypes.find((type) => type.id === target.typeId)
      : building.productObjectTypes.find((type) => type.id === target.typeId);
    const assetIndex = productType?.productAssets.findIndex((candidate) => candidate.id === asset.id) ?? -1;
    if (!productType || assetIndex < 0) {
      setFileNotice({ text: "That product representation is no longer available.", tone: "error" });
      return false;
    }
    productType.productAssets = productType.productAssets.map((candidate, index) => ({
      ...(asset.usage === "preferred" && candidate.role === asset.role ? { ...candidate, usage: "reference" as const } : candidate),
      ...(index === assetIndex ? { ...asset, alignment: { ...asset.alignment } } : {}),
    }));
    const next = updateDocumentBuilding(editor.present, building);
    if (!next) {
      setFileNotice({ text: "The representation alignment or usage is invalid.", tone: "error" });
      return false;
    }
    dispatch({ type: "commit", next });
    setFileNotice({ text: `${asset.name} alignment was saved. Native geometry remains available as the fallback.`, tone: "success" });
    return true;
  }, [editor.present]);

  const createLibraryObjectType = useCallback((definition: { category: ProductObjectCategory; dimensions: { height: number; length: number; width: number }; name: string }) => {
    if (editor.present.building.productObjectTypes.length >= MAXIMUM_PRODUCT_OBJECT_TYPE_COUNT) {
      setFileNotice({ text: "This project has reached the reusable object Type limit.", tone: "error" });
      return false;
    }
    const name = definition.name.trim();
    if (!name || editor.present.building.productObjectTypes.some((type) => type.name.toLowerCase() === name.toLowerCase())) {
      setFileNotice({ text: "Use a unique name for the new object Type.", tone: "error" });
      return false;
    }
    const usedIds = new Set(editor.present.building.productObjectTypes.map((type) => type.id));
    let number = editor.present.building.productObjectTypes.length + 1;
    while (usedIds.has(`product-object-type-${String(number).padStart(2, "0")}`)) number += 1;
    const building = cloneBuildingStructure(editor.present.building);
    building.productObjectTypes.push({
      category: definition.category,
      dimensions: { ...definition.dimensions },
      id: `product-object-type-${String(number).padStart(2, "0")}`,
      name,
      productAssets: [],
      productSource: null,
    });
    const next = updateDocumentBuilding(editor.present, building);
    if (!next) {
      setFileNotice({ text: "Check the object Type name and dimensions.", tone: "error" });
      return false;
    }
    dispatch({ type: "commit", next });
    setFileNotice({ text: `${name} is now available in this project's Product Library.`, tone: "success" });
    return true;
  }, [editor.present]);

  const placeLibraryProduct = useCallback((target: ProductLibraryTarget) => {
    if (target.kind === "object") {
      const productType = editor.present.building.productObjectTypes.find((type) => type.id === target.typeId);
      if (!productType) return;
      const result = addProductObject(editor.present, productType);
      if (!result) {
        setFileNotice({ text: "That object could not be placed on the current Story and Layer.", tone: "error" });
        return;
      }
      dispatch({ type: "commit", next: result.document });
      setSelectionForDocument(result.document, result.object.id);
      setProductLibraryOpen(false);
      setFileNotice({ text: `Placed ${result.object.name} on the current Layer. Its Type remains linked for product identity.`, tone: "success" });
      return;
    }
    if (!selectedLine || selectedLine.architecturalRole !== "wall") {
      setFileNotice({ text: "Select a Wall before placing a Door or Window product.", tone: "error" });
      return;
    }
    const openingType = editor.present.building.openingTypes.find((type) => type.id === target.typeId);
    if (!openingType) return;
    const building = cloneBuildingStructure(editor.present.building);
    if (openingType.kind === "door") building.activeDoorTypeId = target.typeId;
    else building.activeWindowTypeId = target.typeId;
    const withActiveProduct = updateDocumentBuilding(editor.present, building);
    if (!withActiveProduct) {
      setFileNotice({ text: "That product could not be activated for placement.", tone: "error" });
      return;
    }
    const result = addWallOpening(withActiveProduct, selectedLine.id, openingType.kind);
    if (!result) {
      setFileNotice({ text: `There is not enough clear Wall length or height for ${openingType.name}.`, tone: "error" });
      return;
    }
    dispatch({ type: "commit", next: result.document });
    setProductLibraryOpen(false);
    setFileNotice({ text: `Placed ${openingType.name} in ${selectedLine.name}; its rough opening cuts every Wall layer.`, tone: "success" });
  }, [editor.present, selectedLine, setSelectionForDocument]);

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

  const applyRoofDefaults = useCallback((building: BuildingStructure) => {
    const next = updateDocumentBuilding(editor.present, building);
    if (!next) {
      setFileNotice({ text: "Roof defaults contain an invalid pitch, heel, overhang, member, birdsmouth, fascia, or subfascia value.", tone: "error" });
      return;
    }
    dispatch({ type: "commit", next });
    setRoofDefaultsOpen(false);
    setFileNotice({ text: `Roof defaults saved · ${building.roofSettings.pitchRise}:12 pitch with ${formatArchitectural(building.roofSettings.heightAbovePlate)} height above plate.`, tone: "success" });
  }, [editor.present]);

  const applyRoomSettings = useCallback((next: ModelDocument) => {
    dispatch({ type: "commit", next });
    setRoomManagerOpen(false);
    const count = next.rooms.filter((room) => room.storyId === next.building.activeStoryId).length;
    setFileNotice({ text: `${count} Room${count === 1 ? "" : "s"} saved for the active Story.`, tone: "success" });
  }, []);

  const changeRoomTypeFromLabel = useCallback((roomId: string, roomType: string) => {
    const room = editor.present.rooms.find((candidate) => candidate.id === roomId);
    if (!room) return;
    const nameFollowsType = room.name === "Unassigned" || room.name === room.roomType;
    const next = updateRoomObject(editor.present, roomId, { roomType, ...(nameFollowsType ? { name: roomType } : {}) });
    if (!next) return;
    dispatch({ type: "commit", next });
    setFileNotice({ text: `${roomType} assigned. Double-click the label for full Room settings.`, tone: "success" });
  }, [editor.present]);

  const openRoomFromLabel = useCallback((roomId: string) => {
    setRoomManagerInitialRoomId(roomId);
    setRoomManagerOpen(true);
  }, []);

  const changeRoomCeilingFromLabel = useCallback((roomId: string, height: number) => {
    const next = updateRoomObject(editor.present, roomId, { roughCeilingHeightOverride: snapToSixteenth(height) });
    if (!next) {
      setFileNotice({ text: "Enter a supported rough ceiling height between 6 and 20 feet.", tone: "error" });
      return false;
    }
    dispatch({ type: "commit", next });
    setFileNotice({ text: "Room ceiling override updated from the plan label; the Story default was not changed.", tone: "success" });
    return true;
  }, [editor.present]);

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

  const changeLayerAppearance = useCallback((layerId: string, change: Parameters<typeof updateLayerAppearance>[2]) => {
    const next = updateLayerAppearance(editor.present, layerId, change);
    if (next) dispatch({ type: "commit", next });
  }, [editor.present]);

  const toggleActiveLayerSetFills = useCallback(() => {
    const current = editor.present.layerSets.find((set) => set.id === editor.present.activeLayerSetId);
    const next = setActiveLayerSetFillsVisible(editor.present, !(current?.fillsVisible ?? true));
    if (!next) return;
    dispatch({ type: "commit", next });
    setFileNotice({ text: current?.fillsVisible ?? true ? "All fills are off for this Layer Set. Linework remains visible." : "Layer and object fills are on for this Layer Set.", tone: "success" });
  }, [editor.present]);

  const changeSelectedFillOverride = useCallback((change: { color?: string; visible?: boolean } | null) => {
    if (!selectedAppearanceRef || !selectedAppearanceObject || !selectedAppearanceLayer) return;
    const current = selectedAppearanceObject.fillOverride ?? { color: selectedAppearanceLayer.fillColor, visible: selectedAppearanceLayer.fillVisible };
    const nextOverride = change === null ? null : { ...current, ...change };
    const next = updateModelEntityFillOverride(editor.present, selectedAppearanceRef, nextOverride);
    if (!next) return;
    dispatch({ type: "commit", next });
  }, [editor.present, selectedAppearanceLayer, selectedAppearanceObject, selectedAppearanceRef]);

  const selectLayerSet = useCallback((layerSetId: string) => {
    const next = activateLayerSet(editor.present, layerSetId);
    if (!next) return;
    dispatch({ type: "commit", next });
    setSelectionForDocument(next, null);
    setFileNotice({ text: `${next.layerSets.find((set) => set.id === layerSetId)?.name ?? "Layer Set"} is active.`, tone: "success" });
  }, [editor.present, setSelectionForDocument]);

  const copyActiveLayerSet = useCallback(() => {
    const next = duplicateLayerSet(editor.present);
    if (!next) return;
    dispatch({ type: "commit", next });
    setExplorerTab("layers");
    setFileNotice({ text: "Created a reusable Layer Set from the current display.", tone: "success" });
  }, [editor.present]);

  const renameActiveLayerSet = useCallback(() => {
    if (!activeLayerSet) return;
    setNameEntryDialog({ initialValue: activeLayerSet.name, kind: "rename-layer-set", targetId: activeLayerSet.id });
  }, [activeLayerSet]);

  const createSavedPlanView = useCallback(() => {
    setNameEntryDialog({ initialValue: `Plan View ${editor.present.savedPlanViews.length + 1}`, kind: "save-plan-view" });
  }, [editor.present.savedPlanViews.length]);

  const submitNameEntry = useCallback((name: string) => {
    const normalized = name.trim();
    if (!normalized) return "Enter a name.";
    if (!nameEntryDialog) return "This naming action is no longer available.";
    if (nameEntryDialog.kind === "rename-layer-set") {
      const next = renameLayerSet(editor.present, nameEntryDialog.targetId ?? "", normalized);
      if (!next) return "Use a unique Layer Set name with 80 characters or fewer.";
      dispatch({ type: "commit", next });
      setNameEntryDialog(null);
      setFileNotice({ text: `${normalized} is now the active Layer Set.`, tone: "success" });
      return null;
    }
    const next = savePlanView(editor.present, {
      activeLayerId: editor.present.activeLayerId,
      annotationScale: activeSavedPlanView?.annotationScale ?? 48,
      layerSetId: editor.present.activeLayerSetId,
      name: normalized,
      referenceDisplayEnabled: activeSavedPlanView?.referenceDisplayEnabled ?? false,
      referenceFillsVisible: activeSavedPlanView?.referenceFillsVisible ?? false,
      referenceLayerSetId: activeSavedPlanView?.referenceLayerSetId ?? editor.present.activeLayerSetId,
      referenceMode: activeSavedPlanView?.referenceMode ?? "automatic",
      referenceStoryId: activeSavedPlanView?.referenceStoryId ?? null,
      storyId: editor.present.building.activeStoryId,
      viewMode: viewTarget.id === "front" || viewTarget.id === "right" || viewTarget.id === "perspective" ? viewTarget.id : "top",
    });
    if (!next) return "Use a valid Plan View name with 80 characters or fewer.";
    dispatch({ type: "commit", next });
    setNameEntryDialog(null);
    setFileNotice({ text: `${normalized} saved with the current Story, Layer Set, scale, and view direction.`, tone: "success" });
    return null;
  }, [activeSavedPlanView, editor.present, nameEntryDialog, viewTarget.id]);

  const selectSavedPlanView = useCallback((viewId: string) => {
    const view = editor.present.savedPlanViews.find((candidate) => candidate.id === viewId);
    const next = activateSavedPlanView(editor.present, viewId);
    if (!view || !next) return;
    dispatch({ type: "commit", next });
    setViewTarget(VIEW_PRESETS[view.viewMode]);
    setDrawingPlaneFromBuilding(next.building);
    setSelectionForDocument(next, null);
    setFitViewSignal((value) => value + 1);
    setFileNotice({ text: `${view.name} restored.`, tone: "success" });
  }, [editor.present, setDrawingPlaneFromBuilding, setSelectionForDocument]);

  const activateStoryView = useCallback((storyId: string) => {
    const next = activateStoryPlanView(editor.present, storyId);
    if (!next) return;
    const story = next.building.stories.find((candidate) => candidate.id === storyId);
    const view = next.savedPlanViews.find((candidate) => candidate.id === next.activeSavedPlanViewId);
    dispatch({ type: "commit", next });
    if (view) setViewTarget(VIEW_PRESETS[view.viewMode]);
    setDrawingPlaneFromBuilding(next.building);
    setSelectionForDocument(next, null);
    setFitViewSignal((value) => value + 1);
    setFileNotice({ text: `${story?.name ?? "Story"} is now the active floor.`, tone: "success" });
  }, [editor.present, setDrawingPlaneFromBuilding, setSelectionForDocument]);

  const stepActiveStory = useCallback((direction: -1 | 1) => {
    const nextStory = editor.present.building.stories[activeStoryIndex + direction];
    if (nextStory) activateStoryView(nextStory.id);
  }, [activateStoryView, activeStoryIndex, editor.present.building.stories]);

  const changeAnnotationScale = useCallback((annotationScale: number) => {
    if (!activeSavedPlanView) return;
    const next = updateSavedPlanView(editor.present, activeSavedPlanView.id, { annotationScale });
    if (next) dispatch({ type: "commit", next });
  }, [activeSavedPlanView, editor.present]);

  const toggleReferenceDisplay = useCallback(() => {
    if (!activeSavedPlanView) return;
    const referenceDisplayEnabled = !activeSavedPlanView.referenceDisplayEnabled;
    const candidate = { ...activeSavedPlanView, referenceDisplayEnabled };
    if (referenceDisplayEnabled && !resolveReferenceStoryId(candidate, editor.present.building.stories.map((story) => story.id))) {
      setFileNotice({ text: "No reference floor is available in the selected direction. Open Floor / Reference Display to choose another floor.", tone: "info" });
      setReferenceDisplayOpen(true);
      return;
    }
    const next = updateSavedPlanView(editor.present, activeSavedPlanView.id, { referenceDisplayEnabled });
    if (!next) return;
    dispatch({ type: "commit", next });
    setSelectionForDocument(next, null);
    setFileNotice({ text: referenceDisplayEnabled ? "Reference floor is visible as non-editable coordination linework." : "Reference floor is hidden.", tone: "success" });
  }, [activeSavedPlanView, editor.present, setSelectionForDocument]);

  const applyReferenceDisplay = useCallback((view: SavedPlanView) => {
    const next = updateSavedPlanView(editor.present, view.id, {
      referenceDisplayEnabled: view.referenceDisplayEnabled,
      referenceFillsVisible: view.referenceFillsVisible,
      referenceLayerSetId: view.referenceLayerSetId,
      referenceMode: view.referenceMode,
      referenceStoryId: view.referenceStoryId,
    });
    if (!next) {
      setFileNotice({ text: "The reference display settings could not be applied. Check the floor and Layer Set selections.", tone: "info" });
      return;
    }
    dispatch({ type: "commit", next });
    setSelectionForDocument(next, null);
    setReferenceDisplayOpen(false);
    const resolvedId = resolveReferenceStoryId(next.savedPlanViews.find((candidate) => candidate.id === view.id) ?? view, next.building.stories.map((story) => story.id));
    const resolvedName = next.building.stories.find((story) => story.id === resolvedId)?.name;
    setFileNotice({ text: view.referenceDisplayEnabled && resolvedName ? `${resolvedName} is shown as the reference floor.` : "Reference display is off for this Plan View.", tone: "success" });
  }, [editor.present, setSelectionForDocument]);

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
    setActiveTool(toolAfterSelection);
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
    setTopMenu(null);
    setProjectSetupMode("new");
  }, [confirmDiscard]);

  const applyProjectSetup = useCallback((name: string, nextDocument: ModelDocument) => {
    if (projectSetupMode === "new") {
      const now = new Date().toISOString();
      dispatch({ type: "recover", next: nextDocument, saved: NEW_PROJECT_DOCUMENT });
      setSavedProjectName("Untitled Model");
      setProjectCreatedAt(now);
      setSelectionForDocument(nextDocument, null);
      setViewTarget(VIEW_PRESETS.top);
      setFitViewSignal((value) => value + 1);
      setActiveTool(SELECT_TOOL);
      setChamferStage(0);
      setChamferDistancePrompt(0);
      setFilletStage(0);
      setStretchTargets([]);
      continuableEntityHistoryRef.current = [];
      setRecoveredAt(null);
      setHasActiveProject(true);
      setShowDashboard(false);
      setShowStartGuide(false);
      setFileNotice({ text: `Created ${name} in Top view. Project defaults are ready; begin with Foundation Walls or Walls.`, tone: "success" });
    } else {
      dispatch({ type: "commit", next: nextDocument });
      setFileNotice({ text: `Updated project setup for ${name}.`, tone: "success" });
    }
    setProjectName(name);
    setDrawingPlaneFromBuilding(nextDocument.building);
    setProjectSetupMode(null);
  }, [projectSetupMode, setDrawingPlaneFromBuilding, setSelectionForDocument]);

  const saveProjectWithName = useCallback((requestedName: string) => {
    const now = new Date().toISOString();
    const name = requestedName.trim() || "Untitled Model";
    const project = createProjectDocument({
      createdAt: projectCreatedAt,
      document: editor.present,
      name,
      updatedAt: now,
    });
    const serializedProject = serializeProjectDocument(project);
    const blob = new Blob([serializedProject], {
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
    setHasActiveProject(true);
    storeRecentProject(project);
    setFileNotice({
      text: `Saved ${projectFilename(name)} to Downloads.`,
      tone: "success",
    });
  }, [editor.present, projectCreatedAt, storeRecentProject]);

  const saveProject = useCallback(() => {
    if (!hasActiveProject) {
      setFileNotice({ text: "Start a New Plan or open a project before saving.", tone: "info" });
      return;
    }
    saveProjectWithName(normalizedProjectName);
  }, [hasActiveProject, normalizedProjectName, saveProjectWithName]);

  const saveProjectAs = useCallback(() => {
    if (!hasActiveProject) {
      setFileNotice({ text: "Start a New Plan or open a project before saving.", tone: "info" });
      return;
    }
    const requestedName = window.prompt("Save project as", normalizedProjectName);
    if (requestedName === null) return;
    saveProjectWithName(requestedName);
  }, [hasActiveProject, normalizedProjectName, saveProjectWithName]);

  const requestOpen = useCallback(() => {
    if (!confirmDiscard()) return;
    fileInputRef.current?.click();
  }, [confirmDiscard]);

  const loadProjectIntoWorkspace = useCallback((
    project: ModelBuilderProject,
    notice: string,
  ) => {
    const openedDocument = projectToDocument(project);
    dispatch({ type: "load", next: openedDocument });
    setDrawingPlaneFromBuilding(openedDocument.building);
    setProjectName(project.name);
    setSavedProjectName(project.name);
    setProjectCreatedAt(project.createdAt);
    setSelectionForDocument(openedDocument, firstSelectableObjectId(openedDocument));
    setActiveTool(SELECT_TOOL);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletStage(0);
    setStretchTargets([]);
    continuableEntityHistoryRef.current = [];
    setRecoveredAt(null);
    setHasActiveProject(true);
    setShowDashboard(false);
    storeRecentProject(project);
    setFileNotice({ text: notice, tone: "success" });
  }, [setDrawingPlaneFromBuilding, setSelectionForDocument, storeRecentProject]);

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
      loadProjectIntoWorkspace(result.project, `Opened ${file.name}.`);
    } catch {
      setFileNotice({
        text: "Model Builder could not read that project file.",
        tone: "error",
      });
    }
  }, [loadProjectIntoWorkspace]);

  const openRecentProject = useCallback((projectId: string) => {
    const recentProject = recentProjects.find((project) => project.id === projectId);
    if (!recentProject || !confirmDiscard()) return;
    const result = parseProjectDocument(recentProject.project);
    if (!result.ok) {
      forgetRecentProject(projectId);
      setFileNotice({ text: "That recent-project shortcut was damaged and has been removed.", tone: "error" });
      return;
    }
    loadProjectIntoWorkspace(result.project, `Opened ${result.project.name} from Recent Projects.`);
  }, [confirmDiscard, forgetRecentProject, loadProjectIntoWorkspace, recentProjects]);

  const openDashboard = useCallback(() => {
    setTopMenu(null);
    setShowDashboard(true);
  }, []);

  const continueCurrentProject = useCallback(() => {
    if (!hasActiveProject) return;
    setShowDashboard(false);
  }, [hasActiveProject]);

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
    setActiveTool(SELECT_TOOL);
    setChamferStage(0);
    setChamferDistancePrompt(0);
    setFilletStage(0);
    setStretchTargets([]);
    continuableEntityHistoryRef.current = [];
    setRecoveredAt(null);
    setHasActiveProject(true);
    setShowDashboard(false);
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
            setActiveTool(SELECT_TOOL);
            setChamferStage(0);
            setChamferDistancePrompt(0);
            setFilletStage(0);
            continuableEntityHistoryRef.current = [];
            setHasActiveProject(true);
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

  // Escape cancels a running transform tool. One table replaces nine near-identical
  // branches; a tool absent from the table is one Escape does not cancel here.
  useEffect(() => {
    const notice = ESCAPE_CANCEL_NOTICES[activeTool.kind];
    if (!notice) return;
    const finishToolWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (activeTool.kind === "stretch") setStretchTargets([]);
      setActiveTool(SELECT_TOOL);
      setFileNotice({ text: notice, tone: "info" });
    };
    window.addEventListener("keydown", finishToolWithEscape);
    return () => window.removeEventListener("keydown", finishToolWithEscape);
  }, [activeTool]);

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
      ? selectedPolyline.architecturalRole === "roof-plane"
        ? `${selectedPolyline.name} selected — gold eave grips adjust the bearing span; blue high-edge grips adjust horizontal run.`
        : selectedPolyline.shape === "rectangle" && rectangleSupportsConstrainedGrips(selectedPolyline)
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
  const storyNavigationDisabled = Boolean(arcMode || boundaryMode || breakMode || chamferMode || circleMode || copyMode || dragStatus || extendMode || filletMode || lengthenMode || lineMode || mirrorMode || moveMode || offsetMode || polylineMode || rectangleMode || rotateMode || scaleMode || stretchMode || trimMode);
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
    <main className={`app-shell theme-${interfaceTheme}${showDashboard ? " is-dashboard" : ""}`}>
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
          <button type="button" onClick={saveProject} disabled={!hasActiveProject} title="Save (Ctrl+S)" aria-label="Save project">▣</button>
          <button type="button" onClick={saveProjectAs} disabled={!hasActiveProject} title="Save As" aria-label="Save project as">▣<sup>+</sup></button>
          <span className="quick-separator" />
          <button type="button" onClick={undo} disabled={!editor.past.length} title="Undo (Ctrl+Z)" aria-label="Undo">↶</button>
          <button type="button" onClick={redo} disabled={!editor.future.length} title="Redo (Ctrl+Y)" aria-label="Redo">↷</button>
        </nav>
        <label className="project-name-shell">
          <span className="sr-only">Project name</span>
          <input
            value={hasActiveProject ? projectName : "Dashboard"}
            maxLength={120}
            onChange={(event) => setProjectName(event.target.value)}
            onBlur={() => setProjectName(normalizedProjectName)}
            aria-label="Project name"
            spellCheck={false}
            disabled={!hasActiveProject}
          />
          {isDirty ? <span className="dirty-mark" title="Unsaved changes">•</span> : null}
        </label>
        <span className="workspace-name">Slater Woods Omni Design</span>
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
              <button type="button" role="menuitem" onClick={() => runTopMenuCommand(saveProject)} disabled={!hasActiveProject}><b>▣</b><span><strong>Save</strong><small>Save the current project</small></span></button>
              <button type="button" role="menuitem" onClick={() => runTopMenuCommand(saveProjectAs)} disabled={!hasActiveProject}><b>▣</b><span><strong>Save As</strong><small>Save with a different project name</small></span></button>
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
                  {menu === "file" ? <><button type="button" role="menuitem" onClick={() => runTopMenuCommand(openDashboard)}><span>Dashboard</span><kbd>Home</kbd></button><hr /><button type="button" role="menuitem" onClick={() => runTopMenuCommand(newProject)}><span>New Plan</span><kbd>Ctrl+N</kbd></button><button type="button" role="menuitem" onClick={() => runTopMenuCommand(requestOpen)}><span>Open…</span><kbd>Ctrl+O</kbd></button><hr /><button type="button" role="menuitem" disabled={!hasActiveProject} onClick={() => runTopMenuCommand(saveProject)}><span>Save</span><kbd>Ctrl+S</kbd></button><button type="button" role="menuitem" disabled={!hasActiveProject} onClick={() => runTopMenuCommand(saveProjectAs)}><span>Save As…</span><kbd>Ctrl+Shift+S</kbd></button></> : null}
                  {menu === "edit" ? <><button type="button" role="menuitem" disabled={!editor.past.length} onClick={() => runTopMenuCommand(undo)}><span>Undo</span><kbd>Ctrl+Z</kbd></button><button type="button" role="menuitem" disabled={!editor.future.length} onClick={() => runTopMenuCommand(redo)}><span>Redo</span><kbd>Ctrl+Y</kbd></button><hr /><button type="button" role="menuitem" disabled={!selectionCanModify} onClick={() => runTopMenuCommand(eraseSelection)}><span>Erase Selection</span><kbd>Delete</kbd></button></> : null}
                  {menu === "view" ? <><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => changeViewTarget(VIEW_PRESETS.top))}><span>Top View</span><kbd>2D · Home</kbd></button><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => changeViewTarget(VIEW_PRESETS.perspective))}><span>3D Perspective</span><kbd>3D</kbd></button><hr /><button type="button" role="menuitem" disabled={editor.present.building.stories.length < 2 || viewTarget.id !== "top"} onClick={() => runTopMenuCommand(toggleReferenceDisplay)}><span>{activeSavedPlanView?.referenceDisplayEnabled ? "Hide" : "Show"} Reference Floor</span><kbd>REF</kbd></button><button type="button" role="menuitem" disabled={editor.present.building.stories.length < 2 || viewTarget.id !== "top"} onClick={() => runTopMenuCommand(() => setReferenceDisplayOpen(true))}><span>Floor / Reference Display…</span></button><hr /><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setFitViewSignal((value) => value + 1))}><span>Fit View</span><kbd>F</kbd></button><hr /><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setStoredInterfaceTheme(interfaceTheme === "light" ? "dark" : "light"))}><span>Use {interfaceTheme === "light" ? "Dark" : "Light"} Interface</span><kbd>{interfaceTheme === "light" ? "☾" : "☀"}</kbd></button></> : null}
                  {menu === "window" ? <><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setExplorerTab("objects"))}><span>Model Explorer · Objects</span></button><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setExplorerTab("layers"))}><span>Model Explorer · Layers</span></button><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setExplorerTab("building"))}><span>Model Explorer · Building</span></button></> : null}
                  {menu === "tools" ? <><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setStoryManagerOpen(true))}><span>Plan Settings…</span></button><button type="button" role="menuitem" disabled={editor.present.building.stories.length < 2 || viewTarget.id !== "top"} onClick={() => runTopMenuCommand(() => setReferenceDisplayOpen(true))}><span>Floor / Reference Display…</span></button><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setWallTypeManagerOpen(true))}><span>Wall Types…</span></button><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setProductLibraryOpen(true))}><span>Product Library…</span></button><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setOpeningTypeManagerOpen(true))}><span>Door &amp; Window Types…</span></button><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setRoofDefaultsOpen(true))}><span>Roof Design Defaults…</span></button><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setFramingManagerOpen(true))}><span>Wall Framing Defaults…</span></button><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setRoomManagerOpen(true))}><span>Rooms…</span></button><hr /><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setExplorerTab("layers"))}><span>Layer Manager</span></button></> : null}
                  {menu === "help" ? <><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setFileNotice({ text: "Keyboard: Ctrl+O opens, Ctrl+S saves, Ctrl+Z undoes, Ctrl+Y redoes, and command aliases start drafting tools.", tone: "info" }))}><span>Keyboard Shortcuts</span></button><button type="button" role="menuitem" onClick={() => runTopMenuCommand(() => setFileNotice({ text: "Precision residential 2D and 3D modeling workspace.", tone: "info" }))}><span>About This Workspace</span></button></> : null}
                </div>
              ) : null}
            </div>
          );
        })}
        <span className="menu-strip-context">PROJECT TOOLS</span>
      </nav>

      {topMenu ? <button type="button" className="menu-dismiss-layer" onClick={() => setTopMenu(null)} aria-label="Close application menu" /> : null}

      {!showDashboard ? <>
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
                <button type="button" onClick={() => addSelectedWallOpening("door")} disabled={selectedLine?.architecturalRole !== "wall" || !selectedLineIsEditable} title={selectedLine?.architecturalRole === "wall" ? "Add the active Door Type to the selected Wall" : "Select a Wall, then add the active Door Type"}><b>▯</b><span>Add Door</span></button>
                <button type="button" onClick={() => addSelectedWallOpening("window")} disabled={selectedLine?.architecturalRole !== "wall" || !selectedLineIsEditable} title={selectedLine?.architecturalRole === "wall" ? "Add the active Window Type to the selected Wall" : "Select a Wall, then add the active Window Type"}><b>▭</b><span>Add Window</span></button>
                <button type="button" onClick={createRoofPlaneForSelectedWall} disabled={selectedLine?.architecturalRole !== "wall" || !selectedLineIsEditable} title="Create a manual Roof Plane from the selected Wall"><b>⌂</b><span>Roof Plane</span></button>
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
                <button type="button" onClick={joinSelection} disabled={!selectionCanJoin} title={selectionCanJoinRoofPlanes ? "Trim two selected Roof Planes to their calculated surface intersection" : "Join endpoint-connected Lines, Arcs, and open Polylines into one native curve"}><b>⌇</b><span>Join</span></button>
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
              <div className="ribbon-tools"><button className={lineMode && wallMode ? "primary-tool is-engaged" : "primary-tool"} type="button" onClick={lineMode && wallMode ? finishLineMode : activateWallMode} title="Draw layered walls on the active Story"><b>▥</b><span>{lineMode && wallMode ? "Finish Wall" : "Wall"}</span></button><button className={lineMode && foundationWallMode ? "primary-tool is-engaged" : "primary-tool"} type="button" onClick={lineMode && foundationWallMode ? finishLineMode : activateFoundationWallMode} title={`Draw concrete Foundation Walls using ${activeFoundationWallType.name}`}><b>▰</b><span>{lineMode && foundationWallMode ? "Finish Foundation" : "Foundation Wall"}</span></button><button type="button" onClick={() => addSelectedWallOpening("door")} disabled={selectedLine?.architecturalRole !== "wall" || !selectedLineIsEditable} title="Add the active Door Type to the selected Wall"><b>▯</b><span>Add Door</span></button><button type="button" onClick={() => addSelectedWallOpening("window")} disabled={selectedLine?.architecturalRole !== "wall" || !selectedLineIsEditable} title="Add the active Window Type to the selected Wall"><b>▭</b><span>Add Window</span></button><button className="primary-tool" type="button" onClick={addBox} title="Add a parametric box"><b>▰</b><span>Box</span></button></div>
              <small>Building objects</small>
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
                <button type="button" onClick={joinSelection} disabled={!selectionCanJoin} title={selectionCanJoinRoofPlanes ? "Trim two selected Roof Planes to their calculated surface intersection" : "Join endpoint-connected Lines, Arcs, and open Polylines into one native curve"}><b>⌇</b><span>Join</span></button>
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
                <button type="button" onClick={() => setProjectSetupMode("edit")} title="Review project information, Stories, and active building defaults in one place"><b>☷</b><span>Project<br />Setup</span></button>
                <button type="button" onClick={() => setStoryManagerOpen(true)} title="Set Stories, floor and ceiling assemblies, and vertical building defaults"><b>≋</b><span>Floors &amp;<br />Ceilings</span></button>
                <button type="button" onClick={() => setFoundationManagerOpen(true)} title="Define concrete Foundation Wall, footing, and sill support types"><b>▰</b><span>Foundation</span></button>
                <button type="button" onClick={() => setWallTypeManagerOpen(true)} title="Define reusable Exterior, Main, and Interior wall assemblies"><b>▥</b><span>Wall Types</span></button>
                <button type="button" onClick={() => setOpeningTypeManagerOpen(true)} title="Define reusable Door and Window unit sizes, rough openings, headers, and finish returns"><b>▣</b><span>Doors &amp;<br />Windows</span></button>
                <button type="button" onClick={() => setProductLibraryOpen(true)} title="Browse project Door and Window products, set active defaults, and place into a selected Wall"><b>▦</b><span>Product<br />Library</span></button>
                <button type="button" onClick={() => setRoofDefaultsOpen(true)} title="Set roof pitch, exterior heel, bearing, overhang, birdsmouth, fascia, and subfascia defaults"><b>⌂</b><span>Roof</span></button>
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

      <section className="plan-view-toolbar" aria-label="Plan view controls">
        <label><span>Annotation Scale</span><select className="annotation-scale-select" value={activeSavedPlanView?.annotationScale ?? 48} onChange={(event) => changeAnnotationScale(Number(event.target.value))}><option value={96}>1/8&quot; = 1&apos;-0&quot;</option><option value={48}>1/4&quot; = 1&apos;-0&quot;</option><option value={24}>1/2&quot; = 1&apos;-0&quot;</option><option value={12}>1&quot; = 1&apos;-0&quot;</option></select></label>
        <label><span>Layer Set</span><select value={editor.present.activeLayerSetId} onChange={(event) => selectLayerSet(event.target.value)}>{editor.present.layerSets.map((set) => <option value={set.id} key={set.id}>{set.name}</option>)}</select></label>
        <button type="button" className={activeLayerSet?.fillsVisible ?? true ? "is-engaged" : ""} onClick={toggleActiveLayerSetFills} aria-pressed={activeLayerSet?.fillsVisible ?? true} title="Show or hide all object fills in this Layer Set">{activeLayerSet?.fillsVisible ?? true ? "Fills On" : "Linework Only"}</button>
        <button type="button" onClick={copyActiveLayerSet}>Copy Set</button>
        <button type="button" onClick={renameActiveLayerSet}>Rename Set</button>
        <span className="plan-view-toolbar-divider" />
        <label className="plan-view-selector"><span>Plan View</span><select value={editor.present.activeSavedPlanViewId} onChange={(event) => selectSavedPlanView(event.target.value)}>{editor.present.savedPlanViews.map((view) => <option value={view.id} key={view.id}>{view.name} · {editor.present.building.stories.find((story) => story.id === view.storyId)?.name ?? "Story"}</option>)}</select></label>
        <div className="story-stepper" role="group" aria-label="Change active floor">
          <button type="button" className="story-step-button" onClick={() => stepActiveStory(-1)} disabled={storyNavigationDisabled || activeStoryIndex <= 0} aria-label="Move down one floor" title={activeStoryIndex > 0 ? `Move down to ${editor.present.building.stories[activeStoryIndex - 1]?.name}` : "No lower floor"}>↓</button>
          <span title="Active floor"><small>Floor</small><strong>{activeStory.name}</strong></span>
          <button type="button" className="story-step-button" onClick={() => stepActiveStory(1)} disabled={storyNavigationDisabled || activeStoryIndex >= editor.present.building.stories.length - 1} aria-label="Move up one floor" title={activeStoryIndex < editor.present.building.stories.length - 1 ? `Move up to ${editor.present.building.stories[activeStoryIndex + 1]?.name}` : "No higher floor"}>↑</button>
        </div>
        <div className="reference-toolbar-control" role="group" aria-label="Floor reference display">
          <button type="button" className={activeSavedPlanView?.referenceDisplayEnabled ? "is-engaged" : ""} onClick={toggleReferenceDisplay} disabled={editor.present.building.stories.length < 2 || viewTarget.id !== "top"} aria-pressed={activeSavedPlanView?.referenceDisplayEnabled ?? false} title="Show or hide the non-editable reference floor">{activeSavedPlanView?.referenceDisplayEnabled ? "Reference On" : "Reference Off"}</button>
          <button type="button" onClick={() => setReferenceDisplayOpen(true)} disabled={editor.present.building.stories.length < 2 || viewTarget.id !== "top"} title="Choose the reference floor, Layer Set, and fill display" aria-label="Open Floor and Reference Display settings">▾</button>
        </div>
        <button type="button" onClick={createSavedPlanView}>Save View As…</button>
        <output>{activeStory.name} · {viewTarget.id === "top" ? "Plan" : viewTarget.label}</output>
      </section>
      </> : null}

      <nav className="document-tabs" aria-label="Open projects">
        <button className="document-menu" type="button" aria-label="Project menu">☰</button>
        <button className={showDashboard ? "document-tab dashboard-document-tab is-active" : "document-tab dashboard-document-tab"} type="button" onClick={openDashboard}><span>Dashboard</span></button>
        {hasActiveProject ? <button className={!showDashboard ? "document-tab is-active" : "document-tab"} type="button" onClick={continueCurrentProject}><span>{normalizedProjectName}</span>{isDirty ? <b>•</b> : null}</button> : null}
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

      {showDashboard ? (
        <StartDashboard
          currentProjectDirty={isDirty}
          currentProjectName={normalizedProjectName}
          hasActiveProject={hasActiveProject}
          onContinueProject={continueCurrentProject}
          onNewPlan={newProject}
          onOpenProject={requestOpen}
          onOpenRecentProject={openRecentProject}
          onRemoveRecentProject={forgetRecentProject}
          recentProjects={recentProjects}
        />
      ) : <>
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
              <PropertyGridRow label="Type"><span className="property-readout">{selectedPolyline.architecturalRole === "floor-platform" ? "Floor platform · closed footprint" : selectedPolyline.architecturalRole === "roof-plane" ? "Manual Roof Plane" : selectedPolyline.shape === "rectangle" ? "Rectangle · closed polyline" : `${selectedPolyline.closed ? "Closed" : "Open"} polyline`}</span></PropertyGridRow>
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
              {selectedPolyline.architecturalRole === "roof-plane" ? (() => {
                const geometry = roofPlaneGeometry(selectedPolyline);
                const reference = roofPlaneReferenceDimensions(editor.present, selectedPolyline);
                const takeoff = roofPlaneTakeoffGeometry(editor.present, selectedPolyline);
                const roofType = editor.present.building.roofTypes.find((candidate) => candidate.id === selectedPolyline.roofTypeId) ?? editor.present.building.roofTypes[0];
                const layerTakeoffs = roofPlaneLayerTakeoffGeometry(editor.present, selectedPolyline);
                const framingLayout = roofFramingLayout(editor.present, selectedPolyline);
                const stationMembers = framingLayout?.members.filter((member) => member.kind === "common-rafter" || member.kind === "truss-top-chord") ?? [];
                const ridgeMembers = framingLayout?.members.filter((member) => member.kind === "ridge-board") ?? [];
                const edgeTotals = takeoff?.edges.reduce<Record<string, number>>((totals, edge) => {
                  totals[edge.role] = (totals[edge.role] ?? 0) + edge.slopedLength;
                  return totals;
                }, {}) ?? {};
                const sharedEdgeSummary = (["ridge", "hip", "valley", "transition"] as const)
                  .filter((role) => edgeTotals[role])
                  .map((role) => `${role[0].toUpperCase()}${role.slice(1)} ${formatArchitectural(edgeTotals[role])}`)
                  .join(" · ");
                const fasciaMatchOptions = editor.present.polylines.flatMap((candidate) => {
                  if (candidate.id === selectedPolyline.id || candidate.architecturalRole !== "roof-plane") return [];
                  const candidateReference = roofPlaneReferenceDimensions(editor.present, candidate);
                  return candidateReference ? [{ fasciaTopElevation: candidateReference.fasciaTopElevation, id: candidate.id, name: candidate.name }] : [];
                });
                return geometry && reference && selectedPolyline.roofSettings ? <>
                  <PropertyGridRow label="Roof Type"><select className="property-cell-select" value={selectedPolyline.roofTypeId ?? editor.present.building.activeRoofTypeId} onChange={(event) => assignSelectedRoofType(event.target.value)} aria-label="Roof Type" disabled={!selectedPolylineIsEditable}>{editor.present.building.roofTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></PropertyGridRow>
                  {roofType ? <PropertyGridRow label="Assembly"><span className="property-readout">Above {formatArchitectural(roofType.layers.filter((layer) => layer.roofSide === "exterior").reduce((total, layer) => total + layer.thickness, 0))} · below {formatArchitectural(roofType.layers.filter((layer) => layer.roofSide === "interior").reduce((total, layer) => total + layer.thickness, 0))}</span></PropertyGridRow> : null}
                  <PropertyGridRow label="Framing method"><select className="property-cell-select" value={selectedPolyline.roofSettings.framingMethod} onChange={(event) => updateSelectedRoofPlane({ framingMethod: event.target.value as RoofFramingMethod })} aria-label="Roof framing method" disabled={!selectedPolylineIsEditable}><option value="rafters">Conventional rafters</option><option value="trusses">Roof truss top chords</option></select></PropertyGridRow>
                  <ArchitecturalPropertyField key={`${selectedPolyline.id}:framing-spacing:${selectedPolyline.roofSettings.framingSpacing}`} label="Framing spacing" value={selectedPolyline.roofSettings.framingSpacing} onCommit={(framingSpacing) => updateSelectedRoofPlane({ framingSpacing })} />
                  <PropertyGridRow label="Framing view"><button className={selectedPolyline.roofSettings.showFramingInModel ? "property-cell-button is-locked" : "property-cell-button"} type="button" onClick={() => updateSelectedRoofPlane({ showFramingInModel: !selectedPolyline.roofSettings!.showFramingInModel })} disabled={!selectedPolylineIsEditable}>{selectedPolyline.roofSettings.showFramingInModel ? "Visible — hide" : "Hidden — show in 3D"}</button></PropertyGridRow>
                  <PropertyGridRow label="Bearing"><span className="property-readout">{selectedPolyline.roofBearingWallId ? `${findLineObject(editor.present, selectedPolyline.roofBearingWallId)?.name ?? "Missing Wall"} · exterior Main face` : "Detached manual plane"}</span></PropertyGridRow>
                  <PropertyGridRow label="Top of plate"><span className="property-readout">{formatSignedArchitectural(reference.topOfPlateElevation)}</span></PropertyGridRow>
                  <ArchitecturalPropertyField key={`${selectedPolyline.id}:eave:${geometry.eaveStart.x}:${geometry.eaveStart.y}:${geometry.eaveEnd.x}:${geometry.eaveEnd.y}`} label="Eave length" value={Math.hypot(geometry.eaveEnd.x - geometry.eaveStart.x, geometry.eaveEnd.y - geometry.eaveStart.y)} onCommit={(eaveLength) => updateSelectedRoofPlane({ eaveLength })} />
                  <ArchitecturalPropertyField key={`${selectedPolyline.id}:run:${geometry.horizontalRun}`} label="Horizontal run" value={geometry.horizontalRun} onCommit={(horizontalRun) => updateSelectedRoofPlane({ horizontalRun })} />
                  <NumberPropertyField key={`${selectedPolyline.id}:pitch:${selectedPolyline.roofSettings.pitchRise}`} label="Roof pitch" min={0.25} max={24} value={selectedPolyline.roofSettings.pitchRise} onCommit={(pitchRise) => updateSelectedRoofPlane({ pitchRise })} />
                  <ArchitecturalPropertyField key={`${selectedPolyline.id}:heel:${selectedPolyline.roofSettings.heightAbovePlate}`} label="Height above plate" value={selectedPolyline.roofSettings.heightAbovePlate} onCommit={(heightAbovePlate) => updateSelectedRoofPlane({ heightAbovePlate })} />
                  <ArchitecturalPropertyField key={`${selectedPolyline.id}:overhang:${selectedPolyline.roofSettings.overhang}`} allowZero label="Overhang" value={selectedPolyline.roofSettings.overhang} onCommit={(overhang) => updateSelectedRoofPlane({ overhang })} />
                  <PropertyGridRow label="Heel"><span className="property-readout">{formatSignedArchitectural(reference.heelElevation)}</span></PropertyGridRow>
                  <PropertyGridRow label="Highest edge"><span className="property-readout">{formatSignedArchitectural(reference.peakElevation)}</span></PropertyGridRow>
                  <ArchitecturalPropertyField key={`${selectedPolyline.id}:fascia-top:${reference.fasciaTopElevation}`} allowNegative label="Fascia top" value={reference.fasciaTopElevation} onCommit={setSelectedRoofPlaneFasciaTop} />
                  <PropertyGridRow label="Fascia bottom"><span className="property-readout">{formatSignedArchitectural(reference.fasciaBottomElevation)}</span></PropertyGridRow>
                  <RoofPlaneFasciaMatchControl key={`${selectedPolyline.id}:fascia-match:${fasciaMatchOptions.map((option) => option.id).join(":")}`} onMatch={matchSelectedRoofPlaneFascia} options={fasciaMatchOptions} />
                  <PropertyGridRow label="Subfascia"><span className="property-readout">Top {formatSignedArchitectural(reference.subfasciaTopElevation)} · bottom {formatSignedArchitectural(reference.subfasciaBottomElevation)}</span></PropertyGridRow>
                  {takeoff ? <>
                    <PropertyGridRow label="Net plan area"><span className="property-readout">{(takeoff.planArea / 144).toLocaleString(undefined, { maximumFractionDigits: 2 })} sq ft</span></PropertyGridRow>
                    <PropertyGridRow label="Net roof area"><span className="property-readout">{(takeoff.surfaceArea / 144).toLocaleString(undefined, { maximumFractionDigits: 2 })} sq ft · {takeoff.slopeFactor.toFixed(3)} slope factor</span></PropertyGridRow>
                    <PropertyGridRow label="Eave edge"><span className="property-readout">{formatArchitectural(edgeTotals.eave ?? 0)}</span></PropertyGridRow>
                    <PropertyGridRow label="Rake edges"><span className="property-readout">{formatArchitectural(edgeTotals.rake ?? 0)}</span></PropertyGridRow>
                    <PropertyGridRow label="Joined edges"><span className="property-readout">{sharedEdgeSummary || "Not joined"}</span></PropertyGridRow>
                  </> : null}
                  {layerTakeoffs?.map((layer) => <PropertyGridRow key={layer.layerId} label={layer.name}><span className="property-readout">{layer.material} · {(layer.surfaceArea / 144).toLocaleString(undefined, { maximumFractionDigits: 2 })} sq ft{layer.thickness > 0 ? ` · ${formatArchitectural(layer.thickness)}` : " · membrane"}</span></PropertyGridRow>)}
                  {layerTakeoffs ? <p className="property-grid-note">Layer coverage uses the exact net sloped Roof Plane area. Waste factors, rolls, bundles, and purchasing allowances remain separate estimating inputs.</p> : null}
                  {framingLayout ? <>
                    <PropertyGridRow label={selectedPolyline.roofSettings.framingMethod === "rafters" ? "Common rafters" : "Top-chord stations"}><span className="property-readout">{stationMembers.length} · {formatArchitectural(stationMembers.reduce((total, member) => total + member.grossLength, 0))} gross</span></PropertyGridRow>
                    <PropertyGridRow label="Ridge board"><span className="property-readout">{ridgeMembers.length ? `${ridgeMembers.length} · ${formatArchitectural(ridgeMembers.reduce((total, member) => total + member.grossLength, 0))} gross` : "No joined ridge"}</span></PropertyGridRow>
                    <PropertyGridRow label="Fascia / subfascia"><span className="property-readout">{formatArchitectural(framingLayout.members.filter((member) => member.kind === "fascia").reduce((total, member) => total + member.grossLength, 0))} each</span></PropertyGridRow>
                    {framingLayout.unsupportedStationCount ? <p className="property-grid-note">{framingLayout.unsupportedStationCount} station{framingLayout.unsupportedStationCount === 1 ? "" : "s"} end at a hip, valley, clipped, concave, or otherwise complex boundary. They are excluded until jack-rafter and complex-intersection framing is implemented.</p> : <p className="property-grid-note">Gross member lengths are derived from the Roof Plane. Ridge-face trimming, birdsmouth cuts, end cuts, stock optimization, and waste remain separate future calculations.</p>}
                  </> : null}
                  <div className="property-action-row">
                    <button type="button" onClick={addSelectedRoofBoundaryVertex} disabled={!selectedPolylineIsEditable}>Add Edge Point</button>
                    <button type="button" onClick={simplifySelectedRoofBoundary} disabled={!selectedPolylineIsEditable || selectedPolyline.vertices.length <= 3}>Simplify Boundary</button>
                  </div>
                  <div className="property-action-row single-action"><button type="button" onClick={convertSelectedRoofPlaneToBoundary} disabled={!selectedPolylineIsEditable}>Convert to Boundary</button></div>
                </> : <p className="property-grid-note">This Roof Plane footprint needs repair before its calculated elevations can be shown.</p>;
              })() : selectedPolyline.closed ? <div className="property-action-row single-action"><button type="button" onClick={toggleSelectedFloorPlatform} disabled={!selectedPolylineIsEditable}>{selectedPolyline.architecturalRole === "floor-platform" ? "Convert to Boundary" : "Create Floor Platform"}</button></div> : null}
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
                ? <div className={selectedLine.architecturalRole === "wall" ? "property-action-row" : "property-action-row single-action"}><button type="button" onClick={toggleSelectedWallRole} disabled={!selectedLineIsEditable}>Convert to Line</button>{selectedLine.architecturalRole === "wall" ? <button type="button" onClick={createRoofPlaneForSelectedWall} disabled={!selectedLineIsEditable}>Create Roof Plane</button> : null}</div>
                : <div className="property-action-row"><button type="button" onClick={toggleSelectedWallRole} disabled={!selectedLineIsEditable}>Create Wall</button><button type="button" onClick={makeSelectedFoundationWall} disabled={!selectedLineIsEditable}>Create Foundation Wall</button></div>}
            </PropertyGridSection>
          ) : selectedBox ? (
            <PropertyGridSection ariaLabel="Selection organization" title="General" meta={selectedGroup ? "Group" : selectedObjectIds.length > 1 ? "Selection" : "Object"}>
              <PropertyGridRow label="Type"><span className="property-readout">{selectedGroup ? "Named group" : selectedObjectIds.length > 1 ? "Selection set" : selectedBox.productObjectTypeId ? editor.present.building.productObjectTypes.find((type) => type.id === selectedBox.productObjectTypeId)?.name ?? "Missing product Type" : "Parametric box"}</span></PropertyGridRow>
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

          {selectedAppearanceRef && selectedAppearanceObject && selectedAppearanceLayer && (selectedAppearanceRef.kind === "box" || selectedAppearanceRef.kind === "polyline" || selectedAppearanceRef.kind === "line" && selectedLine?.architecturalRole !== null) ? (
            <PropertyGridSection title="Appearance" meta={selectedAppearanceObject.fillOverride ? "Object override" : "By Layer"}>
              <PropertyGridRow label="By Layer"><button type="button" className={!selectedAppearanceObject.fillOverride ? "property-cell-button is-locked" : "property-cell-button"} onClick={() => changeSelectedFillOverride(selectedAppearanceObject.fillOverride ? null : {})} disabled={!selectionCanModify}>{!selectedAppearanceObject.fillOverride ? "✓ Inherited" : "○ Use Layer"}</button></PropertyGridRow>
              <PropertyGridRow label="Fill color"><span className="object-fill-field"><LayerColorField key={`${selectedAppearanceObject.id}:fill:${selectedAppearanceObject.fillOverride?.color ?? selectedAppearanceLayer.fillColor}`} color={selectedAppearanceObject.fillOverride?.color ?? selectedAppearanceLayer.fillColor} label={`${selectedAppearanceObject.name} fill color`} onCommit={(color) => changeSelectedFillOverride({ color })} /></span></PropertyGridRow>
              <PropertyGridRow label="Fill"><button type="button" className={(selectedAppearanceObject.fillOverride?.visible ?? selectedAppearanceLayer.fillVisible) ? "property-cell-button is-locked" : "property-cell-button"} onClick={() => changeSelectedFillOverride({ visible: !(selectedAppearanceObject.fillOverride?.visible ?? selectedAppearanceLayer.fillVisible) })} disabled={!selectionCanModify}>{(selectedAppearanceObject.fillOverride?.visible ?? selectedAppearanceLayer.fillVisible) ? "● On" : "○ Off"}</button></PropertyGridRow>
              <p className="property-grid-note">Changing either object value clears By Layer. The Layer Set’s master fill switch still wins.</p>
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
              {selectionCanJoin ? <JoinControl onJoin={joinSelection} roofPlanes={selectionCanJoinRoofPlanes} selectionCount={selectedEntityRefs.length} /> : null}
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
          ) : selectedPolyline?.architecturalRole === "roof-plane" ? (
            <PropertyGridSection title="Plan Editing" meta="Editable Roof Boundary">
              <PropertyGridRow label="Eave grips"><span className="property-readout">Adjust bearing-line start or end</span></PropertyGridRow>
              <PropertyGridRow label="Blue grips"><span className="property-readout">Shape hips, valleys, rakes, and clips</span></PropertyGridRow>
              <p className="property-grid-note">The gold eave edge preserves the bearing reference. Add an edge point, then drag its blue grip to shape the Roof Plane. Horizontal Run scales the full boundary depth. Shift-select two overlapping Roof Planes and use Join to calculate their shared 3D edge. Move, Rotate, Mirror, or Copy detaches a plane from its original Wall.</p>
            </PropertyGridSection>
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
                <WallOpeningsControl building={editor.present.building} layers={editor.present.layers} line={selectedLine} onAdd={addSelectedWallOpening} onAssignType={assignSelectedWallOpeningType} onDelete={deleteSelectedWallOpening} onUpdate={updateSelectedWallOpening} />
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
                {wallMode ? <><PropertyGridRow label="Wall Use"><select className="property-cell-select" value={editor.present.building.activeWallUse} onChange={(event) => selectActiveWallUse(event.target.value as WallUse)} aria-label="Wall Use for new walls">{Object.entries(WALL_USE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></PropertyGridRow><PropertyGridRow label="Active Wall Type"><select className="property-cell-select" value={activeWallType.id} onChange={(event) => selectActiveWallType(event.target.value)} aria-label="Active Wall Type for new walls">{editor.present.building.wallTypes.filter((wallType) => wallTypeMatchesUse(wallType, editor.present.building.activeWallUse)).map((wallType) => <option key={wallType.id} value={wallType.id}>{wallType.name}</option>)}</select></PropertyGridRow></> : null}
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
                <PropertyGridRow label="Starting Wall Use"><select className="property-cell-select" value={editor.present.building.activeWallUse} onChange={(event) => selectActiveWallUse(event.target.value as WallUse)} aria-label="Project starting Wall Use">{Object.entries(WALL_USE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></PropertyGridRow>
                <PropertyGridRow label="Active Wall Type"><select className="property-cell-select" value={activeWallType.id} onChange={(event) => selectActiveWallType(event.target.value)} aria-label="Project active Wall Type">{editor.present.building.wallTypes.filter((wallType) => wallTypeMatchesUse(wallType, editor.present.building.activeWallUse)).map((wallType) => <option key={wallType.id} value={wallType.id}>{wallType.name}</option>)}</select></PropertyGridRow>
                <PropertyGridRow label="Rooms"><span className="property-readout">{activeStoryRoomCount} detected</span></PropertyGridRow>
                <div className="property-action-row project-setup-actions"><button type="button" onClick={() => setProjectSetupMode("edit")}>Project Setup Center</button><button type="button" onClick={() => setStoryManagerOpen(true)}>Story &amp; Floor Settings</button><button type="button" onClick={() => setWallTypeManagerOpen(true)}>Wall Types</button><button type="button" onClick={() => setRoomManagerOpen(true)}>Rooms</button></div>
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
          onRoomLabelOpen={openRoomFromLabel}
          onRoomLabelTypeChange={changeRoomTypeFromLabel}
          onRoomCeilingHeightChange={changeRoomCeilingFromLabel}
          onWallClearanceChange={setWallClearanceFromTemporaryDimension}
          onWallLengthChange={resizeWallFromTemporaryDimension}
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
                <div><strong>{activeStory.name} Entities</strong><span>{editor.present.objects.filter((item) => item.storyId === activeStory.id).length + editor.present.lines.filter((item) => item.storyId === activeStory.id).length + editor.present.polylines.filter((item) => item.storyId === activeStory.id).length + editor.present.circles.filter((item) => item.storyId === activeStory.id).length + editor.present.arcs.filter((item) => item.storyId === activeStory.id).length}</span></div>
                <div className="entity-add-actions"><button type="button" onClick={arcMode ? finishArcMode : circleMode ? finishCircleMode : lineMode ? finishLineMode : polylineMode ? finishPolylineMode : rectangleMode ? finishRectangleMode : activateLineMode}>{arcMode || circleMode || lineMode || polylineMode || rectangleMode ? "Finish" : "+ Line"}</button><button type="button" onClick={activateWallMode}>+ Wall</button><button type="button" onClick={addBox}>+ Box</button></div>
              </div>
              <div className="object-list">
                {editor.present.objects.filter((object) => object.storyId === activeStory.id).map((object) => {
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
                {editor.present.lines.filter((line) => line.storyId === activeStory.id).map((line) => {
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
                {editor.present.polylines.filter((polyline) => polyline.storyId === activeStory.id).map((polyline) => {
                  const layer = findLayer(editor.present, polyline.layerId);
                  const selectable = Boolean(layer?.visible);
                  const selected = selectedEntityKeys.includes(cadEntityKey({ id: polyline.id, kind: "polyline" }));
                  return <button key={polyline.id} type="button" className={`${selected ? "is-selected" : ""}${polyline.locked ? " is-object-locked" : ""}${selectable ? "" : " is-unavailable"}`} onClick={(event) => { if (selectable) selectPolyline(polyline.id, event.shiftKey); }} aria-pressed={selected} aria-disabled={!selectable}><span className="object-state-markers"><span className="object-layer-swatch" style={{ backgroundColor: layer?.color }} />{polyline.locked ? <i title="Locked">◆</i> : null}</span><span><strong>{polyline.name}</strong><small>{layer?.name ?? "Default"} · {polyline.architecturalRole === "roof-plane" ? "Roof Plane" : polyline.architecturalRole === "floor-platform" ? "Floor Platform" : polyline.shape === "rectangle" ? "Rectangle" : polyline.closed ? "Closed polyline" : "Polyline"} · {formatArchitectural(polylineLength(polyline))}</small></span></button>;
                })}
                {editor.present.circles.filter((circle) => circle.storyId === activeStory.id).map((circle) => {
                  const layer = findLayer(editor.present, circle.layerId);
                  const selectable = Boolean(layer?.visible);
                  const selected = selectedEntityKeys.includes(cadEntityKey({ id: circle.id, kind: "circle" }));
                  return <button key={circle.id} type="button" className={`${selected ? "is-selected" : ""}${circle.locked ? " is-object-locked" : ""}${selectable ? "" : " is-unavailable"}`} onClick={(event) => { if (selectable) selectCircle(circle.id, event.shiftKey); }} aria-pressed={selected} aria-disabled={!selectable} title={!layer?.visible ? "Circle layer is hidden" : layer?.locked ? "Circle layer is locked — selection is available, editing is not" : circle.locked ? "Circle is locked — select it to unlock" : undefined}><span className="object-state-markers"><span className="object-layer-swatch" style={{ backgroundColor: layer?.color }} />{circle.locked ? <i title="Locked">◆</i> : null}</span><span><strong>{circle.name}</strong><small>{layer?.name ?? "Default"} · Circle · R {formatArchitectural(circle.radius)}</small></span></button>;
                })}
                {editor.present.arcs.filter((arc) => arc.storyId === activeStory.id).map((arc) => {
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
                  <span role="columnheader">Display</span>
                  <span role="columnheader">Name</span>
                  <span role="columnheader">Line</span>
                  <span role="columnheader">Wt</span>
                  <span role="columnheader">Print</span>
                  <span role="columnheader">Fill</span>
                  <span role="columnheader" title="Layer fill display">Use</span>
                  <span role="columnheader" title="Object count">Objects</span>
                  <span role="columnheader">Show</span>
                  <span role="columnheader">Lock</span>
                  <span role="columnheader" aria-label="Delete" />
                </div>
                <div className="layer-list" role="rowgroup">
                {filteredLayers.map((layer) => {
                  const objectCount = editor.present.objects.filter((object) => object.layerId === layer.id).length + editor.present.lines.filter((line) => line.layerId === layer.id).length + editor.present.lines.flatMap((line) => line.wallOpenings).filter((opening) => opening.layerId === layer.id).length + editor.present.polylines.filter((polyline) => polyline.layerId === layer.id).length + editor.present.circles.filter((circle) => circle.layerId === layer.id).length + editor.present.arcs.filter((arc) => arc.layerId === layer.id).length + editor.present.rooms.filter((room) => room.layerId === layer.id).length + editor.present.roomAnnotations.filter((annotation) => annotation.layerId === layer.id).length;
                  const isActive = layer.id === editor.present.activeLayerId;
                  const isStandard = Object.values(STANDARD_LAYER_IDS).includes(layer.id);
                  const canDelete = !isStandard && !isActive && objectCount === 0;
                  return (
                    <div className={isActive ? "layer-row is-active" : "layer-row"} key={layer.id} role="row">
                      <div className="layer-cell current-cell" role="cell"><button className="make-current" type="button" onClick={() => activateLayer(layer.id)} aria-label={`Make ${layer.name} current`} title={isActive ? "Current layer" : "Make current"}>{isActive ? "✓" : "○"}</button></div>
                      <div className="layer-cell color-cell" role="cell"><LayerColorField key={`${layer.id}:display:${layer.color}`} color={layer.color} label={`${layer.name} display color`} onCommit={(color) => changeLayerAppearance(layer.id, { color })} /></div>
                      <div className="layer-cell name-cell" role="cell"><LayerNameField key={`${layer.id}:${layer.name}`} name={layer.name} onRename={(name) => renameProjectLayer(layer.id, name)} /></div>
                      <div className="layer-cell style-cell" role="cell"><select value={layer.lineStyle} onChange={(event) => changeLayerAppearance(layer.id, { lineStyle: event.target.value as typeof layer.lineStyle })} aria-label={`${layer.name} line style`}><option value="solid">Solid</option><option value="dashed">Dash</option><option value="dotted">Dot</option><option value="center">Center</option></select></div>
                      <div className="layer-cell weight-cell" role="cell"><input type="number" min="1" max="10" value={layer.lineWeight} onChange={(event) => changeLayerAppearance(layer.id, { lineWeight: Number(event.target.value) })} aria-label={`${layer.name} line weight`} /></div>
                      <div className="layer-cell color-cell" role="cell"><LayerColorField key={`${layer.id}:print:${layer.printColor}`} color={layer.printColor} label={`${layer.name} print color`} onCommit={(printColor) => changeLayerAppearance(layer.id, { printColor })} /></div>
                      <div className="layer-cell color-cell" role="cell"><LayerColorField key={`${layer.id}:fill:${layer.fillColor}`} color={layer.fillColor} label={`${layer.name} fill color`} onCommit={(fillColor) => changeLayerAppearance(layer.id, { fillColor })} /></div>
                      <div className="layer-cell toggle-cell" role="cell"><button className={layer.fillVisible ? "layer-toggle is-on" : "layer-toggle"} type="button" onClick={() => changeLayerAppearance(layer.id, { fillVisible: !layer.fillVisible })} aria-label={`${layer.fillVisible ? "Hide" : "Show"} ${layer.name} fills`} title={layer.fillVisible ? "Hide fills on this layer" : "Show fills on this layer"}>{layer.fillVisible ? "●" : "○"}</button></div>
                      <div className="layer-cell count-cell" role="cell">{objectCount}</div>
                      <div className="layer-cell toggle-cell" role="cell"><button className={layer.visible ? "layer-toggle is-on" : "layer-toggle"} type="button" onClick={() => changeLayerVisibility(layer.id)} disabled={isActive} aria-label={`${layer.visible ? "Hide" : "Show"} ${layer.name}`} title={isActive ? "Current layer must stay visible" : layer.visible ? "Hide layer" : "Show layer"}>{layer.visible ? "●" : "○"}</button></div>
                      <div className="layer-cell toggle-cell" role="cell"><button className={layer.locked ? "layer-toggle is-locked" : "layer-toggle"} type="button" onClick={() => changeLayerLock(layer.id)} disabled={isActive} aria-label={`${layer.locked ? "Unlock" : "Lock"} ${layer.name}`} title={isActive ? "Current layer must stay unlocked" : layer.locked ? "Unlock layer" : "Lock layer"}>{layer.locked ? "◆" : "◇"}</button></div>
                      <div className="layer-cell delete-cell" role="cell"><button className="delete-layer" type="button" onClick={() => removeLayer(layer.id)} disabled={!canDelete} aria-label={`Delete ${layer.name}`} title={canDelete ? "Delete empty layer" : isStandard ? "Standard object layers remain available" : "Only empty, non-current custom layers can be deleted"}>×</button></div>
                    </div>
                  );
                })}
                {!filteredLayers.length ? <div className="layer-empty-row">No layers match “{layerFilter.trim()}”.</div> : null}
                </div>
              </div>
              <p className="layer-manager-note">Line and fill appearance are independent. The Layer Set button above can suppress every fill without changing object or layer colors.</p>
            </section>
          ) : (
            <section className="building-browser" aria-label="Building structure">
              <header className="building-browser-header"><div><span>Active Story</span><strong>{activeStory.name}</strong></div><button type="button" onClick={() => setStoryManagerOpen(true)}>Edit Setup</button></header>
              <section className="building-browser-section">
                <header><strong>Stories</strong><span>{editor.present.building.stories.length}</span></header>
                {calculateStoryElevations(editor.present.building).map((calculation) => {
                  const story = editor.present.building.stories.find((candidate) => candidate.id === calculation.storyId);
                  if (!story) return null;
                  return <button type="button" className={story.id === activeStory.id ? "building-browser-row is-active" : "building-browser-row"} key={story.id} onClick={() => activateStoryView(story.id)} disabled={storyNavigationDisabled} title={storyNavigationDisabled ? "Finish the current drawing or editing command before changing floors" : `Open ${story.name}`}><span className="building-browser-icon">≋</span><span><strong>{story.name}</strong><small>Floor {formatSignedArchitectural(calculation.roughFloorElevation)} · Ceiling {formatSignedArchitectural(calculation.roughCeilingElevation)}</small></span>{story.id === activeStory.id ? <b>ACTIVE</b> : null}</button>;
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
                <header><strong>Roof Types &amp; Defaults</strong><span>{editor.present.building.roofTypes.length}</span></header>
                <button type="button" className="building-browser-row is-active" onClick={() => setRoofDefaultsOpen(true)}><span className="building-browser-icon">⌂</span><span><strong>{editor.present.building.roofTypes.find((type) => type.id === editor.present.building.activeRoofTypeId)?.name ?? "Roof Type"}</strong><small>{editor.present.building.roofSettings.framingMethod === "rafters" ? "Conventional rafters" : "Roof trusses"} · {formatArchitectural(editor.present.building.roofSettings.framingSpacing)} O.C. · {editor.present.building.roofSettings.showFramingInModel ? "framing visible" : "framing hidden"}</small></span><b>ACTIVE</b></button>
                {editor.present.polylines.filter((polyline) => polyline.architecturalRole === "roof-plane").map((roofPlane) => {
                  const geometry = roofPlaneGeometry(roofPlane);
                  const roofType = editor.present.building.roofTypes.find((type) => type.id === roofPlane.roofTypeId);
                  return <button type="button" className="building-browser-row" key={roofPlane.id} onClick={() => selectPolyline(roofPlane.id, false)}><span className="building-browser-icon">◩</span><span><strong>{roofPlane.name}</strong><small>{roofType?.name ?? "Missing Roof Type"} · {roofPlane.roofSettings?.pitchRise ?? editor.present.building.roofSettings.pitchRise}:12 · run {geometry ? formatArchitectural(geometry.horizontalRun) : "needs repair"}</small></span></button>;
                })}
              </section>
              <section className="building-browser-section">
                <header><strong>Rooms · {activeStory.name}</strong><span>{activeStoryRoomCount}</span></header>
                {editor.present.rooms.filter((room) => room.storyId === activeStory.id).map((room) => <button type="button" className="building-browser-row" key={room.id} onClick={() => setRoomManagerOpen(true)}><span className="building-browser-icon">▦</span><span><strong>{room.name}</strong><small>{(polylineArea(room.boundary) / 144).toLocaleString(undefined, { maximumFractionDigits: 2 })} sq ft · {room.boundaryWallIds.length} Walls · {room.platformOpenings.length} Openings</small></span></button>)}
                {!activeStoryRoomCount ? <div className="building-browser-empty"><span>No Rooms detected yet.</span><button type="button" onClick={() => setRoomManagerOpen(true)}>Open Room Manager</button></div> : null}
              </section>
              <div className="building-browser-actions"><button type="button" onClick={() => setStoryManagerOpen(true)}>Story Settings</button><button type="button" onClick={() => setWallTypeManagerOpen(true)}>Wall Types</button><button type="button" onClick={() => setRoofDefaultsOpen(true)}>Roof</button><button type="button" onClick={() => setFramingManagerOpen(true)}>Framing</button><button type="button" onClick={() => setRoomManagerOpen(true)}>Rooms</button></div>
            </section>
          )}
        </aside>
      </section>

      <div className="commandbar" aria-label="Command line">
        <div className="commandbar-shell">
          <strong>Command:</strong>
          <span className="command-feedback">{commandText}</span>
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
      </div>
      <footer className="statusbar">
        <div className="model-space-indicator" aria-label="Current workspace"><strong>MODEL</strong></div>
        <div className="status-items" aria-label="Drafting status controls">
          <span className="status-readout entity-status" title="Model entity count">{modelEntityCount} {modelEntityCount === 1 ? "ENTITY" : "ENTITIES"}</span>
          <span className="status-readout story-status" title={`Active Story: ${activeStory.name}`}>STORY <b>{activeStory.name}</b></span>
          <span className="status-readout layer-status" title={`Current Layer: ${activeLayer?.name ?? "Default"}`}>LAYER <b>{activeLayer?.name ?? "Default"}</b></span>
          <span className="status-readout unit-status" title="Architectural feet and inches">FT-IN</span>
          <button type="button" className={cadDraftingSettings.gridVisible ? "status-toggle is-on" : "status-toggle"} onClick={() => setCadDraftingSettings((current) => ({ ...current, gridVisible: !current.gridVisible }))} title={`Grid Display (F7) · ${formatDraftingSpacing(cadDraftingSettings.gridSpacing)} spacing`} aria-label="Toggle model space grid" aria-pressed={cadDraftingSettings.gridVisible}>GRID</button>
          <button type="button" className={activeLayerSet?.fillsVisible ?? true ? "status-toggle is-on" : "status-toggle"} onClick={toggleActiveLayerSetFills} title="Show or hide all fills for the active Layer Set" aria-pressed={activeLayerSet?.fillsVisible ?? true}>FILLS</button>
          <button type="button" className={activeSavedPlanView?.referenceDisplayEnabled ? "status-toggle is-on" : "status-toggle"} onClick={toggleReferenceDisplay} disabled={editor.present.building.stories.length < 2 || viewTarget.id !== "top"} title="Reference Floor Display" aria-pressed={activeSavedPlanView?.referenceDisplayEnabled ?? false}>REF</button>
          <span className="status-readout snap-status" title="Cursor snap increment">SNAP <b>{formatDraftingSpacing(cadDraftingSettings.snapIncrement)}</b></span>
          <button type="button" className={cadDraftingSettings.objectSnapEnabled ? "status-toggle is-on" : "status-toggle"} onClick={() => setCadDraftingSettings((current) => ({ ...current, objectSnapEnabled: !current.objectSnapEnabled }))} title="Object Snap (F3)" aria-pressed={cadDraftingSettings.objectSnapEnabled}>OSNAP</button>
          <button type="button" className={cadDraftingSettings.orthoEnabled ? "status-toggle is-on" : "status-toggle"} onClick={() => setCadDraftingSettings((current) => ({ ...current, orthoEnabled: !current.orthoEnabled }))} title="Ortho Mode (F8)" aria-pressed={cadDraftingSettings.orthoEnabled}>ORTHO</button>
          <button type="button" className={cadDraftingSettings.polarEnabled ? "status-toggle is-on" : "status-toggle"} onClick={() => setCadDraftingSettings((current) => ({ ...current, polarEnabled: !current.polarEnabled }))} title="Polar Tracking (F10)" aria-pressed={cadDraftingSettings.polarEnabled}>POLAR</button>
          <span className="status-readout elevation-status" title="Active drawing elevation">ELEV <b>{formatSignedArchitectural(cadDraftingSettings.activeElevation)}</b></span>
          <span className="status-readout view-status" title={`Current view: ${viewTarget.label}`}>{viewTarget.id === "top" ? "TOP" : viewTarget.label.toUpperCase()}</span>
          <span className="status-readout recovery-status" title="Work is automatically recoverable on this device"><i aria-hidden="true" /> RECOVERY</span>
        </div>
      </footer>
      </>}
      {projectSetupMode ? <ProjectSetupDialog document={projectSetupMode === "new" ? NEW_PROJECT_DOCUMENT : editor.present} initialName={projectSetupMode === "new" ? "Untitled Project" : normalizedProjectName} mode={projectSetupMode} onCancel={() => setProjectSetupMode(null)} onOpenAdvanced={(target) => { setProjectSetupMode(null); if (target === "stories") setStoryManagerOpen(true); else if (target === "foundation") setFoundationManagerOpen(true); else if (target === "roof") setRoofDefaultsOpen(true); else setWallTypeManagerOpen(true); }} onSave={applyProjectSetup} /> : null}
      {referenceDisplayOpen && activeSavedPlanView ? <ReferenceDisplayDialog layerSets={editor.present.layerSets} onCancel={() => setReferenceDisplayOpen(false)} onSave={applyReferenceDisplay} stories={editor.present.building.stories} view={activeSavedPlanView} /> : null}
      {storyManagerOpen ? <StoryManagerDialog building={editor.present.building} onCancel={() => setStoryManagerOpen(false)} onSave={applyStorySettings} /> : null}
      {foundationManagerOpen ? <FoundationWallManagerDialog building={editor.present.building} onCancel={() => setFoundationManagerOpen(false)} onSave={applyFoundationWallTypes} /> : null}
      {framingManagerOpen ? <WallFramingManagerDialog building={editor.present.building} onCancel={() => setFramingManagerOpen(false)} onSave={applyWallFraming} /> : null}
      {roofDefaultsOpen ? <RoofDefaultsDialog building={editor.present.building} onCancel={() => setRoofDefaultsOpen(false)} onSave={applyRoofDefaults} /> : null}
      {openingTypeManagerOpen ? <OpeningTypeManagerDialog document={editor.present} onCancel={() => setOpeningTypeManagerOpen(false)} onSave={applyOpeningTypes} /> : null}
      {productLibraryOpen ? <ProductLibraryDialog building={editor.present.building} selectedWallName={selectedLine?.architecturalRole === "wall" ? selectedLine.name : null} onActivate={activateLibraryProduct} onAssetAttached={attachLibraryProductAsset} onAssetUpdated={updateLibraryProductAsset} onCancel={() => setProductLibraryOpen(false)} onCreateObjectType={createLibraryObjectType} onManageOpeningTypes={() => { setProductLibraryOpen(false); setOpeningTypeManagerOpen(true); }} onPlace={placeLibraryProduct} /> : null}
      {wallTypeManagerOpen ? <WallTypeManagerDialog building={editor.present.building} onCancel={() => setWallTypeManagerOpen(false)} onSave={applyWallTypes} /> : null}
      {roomManagerOpen ? <RoomManagerDialog document={editor.present} initialRoomId={roomManagerInitialRoomId} onCancel={() => { setRoomManagerOpen(false); setRoomManagerInitialRoomId(null); }} onSave={(next) => { setRoomManagerInitialRoomId(null); applyRoomSettings(next); }} /> : null}
      {nameEntryDialog ? <NameEntryDialog description={nameEntryDialog.kind === "rename-layer-set" ? "Use a clear name for this reusable layer display configuration." : "This view will remember the Story, Layer Set, annotation scale, view direction, and Floor Reference settings."} initialValue={nameEntryDialog.initialValue} label={nameEntryDialog.kind === "rename-layer-set" ? "Layer Set name" : "Saved Plan View name"} onCancel={() => setNameEntryDialog(null)} onSubmit={submitNameEntry} submitLabel={nameEntryDialog.kind === "rename-layer-set" ? "Rename Set" : "Save View"} title={nameEntryDialog.kind === "rename-layer-set" ? "Rename Layer Set" : "Save Current Plan View"} /> : null}
    </main>
  );
}
