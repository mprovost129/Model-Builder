"use client";

import {
  ARC_METHODS,
  arcPointAtFraction,
  arcSweepAngle,
  type ArcGeometry,
  type ArcMethod,
} from "@/lib/cad-arc";
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  formatArchitectural,
  formatSignedArchitectural,
  parseArchitectural,
  parseSignedArchitectural,
  snapToSixteenth,
} from "@/lib/architectural-units";
import {
  cloneBoxModel,
  FACE_DEFINITIONS,
  MAXIMUM_COORDINATE,
  moveBoxFace,
  type AxisKey,
  type BoxModel,
  type DimensionKey,
  type RotationBaseKey,
} from "@/lib/box-model";
import {
  lineAngle,
  lineLength,
  parseLineCoordinate,
  resizeLineFromFixedEndpoint,
  type LineFixedEndpoint,
  type LineGeometry,
  type LinePoint,
} from "@/lib/cad-line";
import {
  CIRCLE_METHODS,
  type CircleGeometry,
  type CircleMethod,
} from "@/lib/cad-circle";
import {
  DEFAULT_OBJECT_SNAP_MODES,
  type ObjectSnapMode,
} from "@/lib/cad-point-acquisition";
import {
  cadEntityKey,
  cadEntityRefFromKey,
  visibleCadEntityRefs,
  type CadEntityRef,
  type SelectionWindowMode,
} from "@/lib/cad-selection";
import type { CadStretchTarget } from "@/lib/cad-stretch";
import {
  parseRectangleDimensionPair,
  polylineArea,
  polylineLength,
  polylineSegments,
  rectangleSupportsConstrainedGrips,
  type PolylineGeometry,
  type RectangleAreaBasis,
} from "@/lib/cad-polyline";
import {
  type LengthenEndpoint,
  type LengthenMethod,
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
  createFloorPlatformFromPolyline,
  createRoofPlaneFromWall,
  addRoofPlaneBoundaryVertex,
  createFoundationWallFromLine,
  createWallFromLine,
  duplicateLayerSet,
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
  findBoxObject,
  findArcObject,
  findCircleObject,
  findGroup,
  findLayer,
  findLineObject,
  findPolylineObject,
  groupBoxObjects,
  explodeModelEntities,
  joinModelEntities,
  chamferPolylineObject,
  mirrorModelEntities,
  filletPolylineObject,
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
  resolveReferenceStoryId,
  STANDARD_LAYER_IDS,
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
  toggleLayerLock,
  toggleLayerVisibility,
  ungroupBoxObjects,
  updateDocumentBuilding,
  updateBoxObject,
  updateArcObject,
  updateCircleObject,
  updateLineObject,
  updateWallPlacement,
  updateWallOpening,
  updateRoomObject,
  updateLayerAppearance,
  updateModelEntityFillOverride,
  updateSavedPlanView,
  updatePolylineObject,
  roofPlaneGeometry,
  roofPlaneLayerTakeoffGeometry,
  roofPlaneReferenceDimensions,
  roofPlaneTakeoffGeometry,
  matchRoofPlaneFascia,
  updateRoofPlane,
  updateRoofPlaneFasciaTop,
  foundationSillOffsetFromReference,
  type BoxObject,
  type WallOpening,
  type WallOpeningKind,
  type PolylineObject,
  type AlignmentMode,
  type ModelDocument,
  type ModelEntityRef,
  type SavedPlanView,
} from "@/lib/document-model";
import {
  assemblyTotalThickness,
  calculateStoryElevations,
  cloneBuildingStructure,
  defaultWallTypeIdForUse,
  MAXIMUM_PRODUCT_OBJECT_TYPE_COUNT,
  wallDefaultHeaderTypeId,
  wallTypeMatchesUse,
  wallUseForType,
  type BuildingStructure,
  type ProductAssetReference,
  type ProductObjectCategory,
  type RoofFramingMethod,
  type WallExteriorSide,
  type WallJoinMode,
  type WallReferenceLine,
  type WallUse,
} from "@/lib/building-stories";
import type { ProductLibraryTarget } from "@/lib/product-library";
import {
  automaticWallJoinCount,
  buildAutomaticWallJoinPlan,
  unresolvedWallJunctionCount,
} from "@/lib/wall-joins";
import { roofFramingLayout } from "@/lib/roof-framing";
import { setParallelWallDimension } from "@/lib/wall-clear-dimensions";
import {
  automaticFoundationWallJoinCount,
  buildAutomaticFoundationWallJoinPlan,
  unresolvedFoundationWallJunctionCount,
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
import { ProductLibraryDialog } from "@/features/products/product-library-dialog";
import { StartDashboard } from "@/features/start-dashboard";
import { Viewport } from "@/features/viewport/viewport";
import {
  arcCursorAnchor,
  arcMethodDefinition,
  arcPointStage,
  CAD_SNAP_LABELS,
  circleMethodDefinition,
  circlePointStage,
  planarDistance,
  type ArcContinueSeed,
  type ArcViewportCommand,
  type CircleViewportCommand,
  type DragStatus,
  type LineViewportCommand,
  type PolylineSegmentMode,
  type PolylineViewportCommand,
  type RectangleDraftSettings,
  type RectangleMethod,
  type RectangleViewportCommand,
} from "@/features/viewport/viewport-types";
import {
  setStoredInterfaceTheme,
  storedInterfaceTheme,
  subscribeInterfaceTheme,
  type InterfaceTheme,
} from "@/features/interface-theme";
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
import { StoryManagerDialog } from "@/features/dialogs/story-manager-dialog";
import {
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
  DimensionField,
  NumberPropertyField,
  PositionField,
  PropertyGridRow,
  PropertyGridSection,
  RoofPlaneFasciaMatchControl,
} from "@/features/properties/property-fields";
import {
  createRecoverySnapshot,
  parseRecoverySnapshot,
  PROJECT_RECOVERY_STORAGE_KEY,
  serializeRecoverySnapshot,
} from "@/lib/project-recovery";
import {
  VIEW_PRESETS,
  type ViewTarget,
} from "@/lib/view-navigation";

type RectangleCornerStyle = "chamfer" | "fillet" | "sharp";

type ContinuableEntityReference = { id: string; type: "arc" | "line" | "polyline" };
type RibbonTab = "Home" | "Draw" | "Model" | "Annotate" | "View" | "Manage";
const LINE_SNAP_ANGLES_STORAGE_KEY = "model-builder:line-snap-angles:v1";
const CAD_DRAFTING_SETTINGS_STORAGE_KEY = "model-builder:cad-drafting-settings:v3";
const LEGACY_CAD_DRAFTING_SETTINGS_STORAGE_KEYS = ["model-builder:cad-drafting-settings:v2", "model-builder:cad-drafting-settings:v1"];

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
