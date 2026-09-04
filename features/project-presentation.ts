export const MODEL_LINE_STYLES = ["solid", "dashed", "dotted", "center"] as const;
export type ModelLineStyle = (typeof MODEL_LINE_STYLES)[number];

export type ModelObjectCategory =
  | "arc"
  | "circle"
  | "door"
  | "floor-platform"
  | "foundation-wall"
  | "generic-object"
  | "line"
  | "polyline"
  | "room"
  | "room-area"
  | "room-ceiling-height"
  | "room-interior-dimensions"
  | "room-label"
  | "roof-plane"
  | "wall"
  | "window";

export type ModelLayer = {
  color: string;
  fillColor: string;
  fillVisible: boolean;
  id: string;
  lineStyle: ModelLineStyle;
  lineWeight: number;
  locked: boolean;
  name: string;
  printColor: string;
  visible: boolean;
};

export type LayerSetState = Pick<ModelLayer, "color" | "fillColor" | "fillVisible" | "id" | "lineStyle" | "lineWeight" | "locked" | "printColor" | "visible">;

export type LayerSet = {
  fillsVisible: boolean;
  id: string;
  layers: LayerSetState[];
  name: string;
};

/** Null means the object inherits its parent Layer's fill settings. */
export type ModelFillOverride = {
  color: string;
  visible: boolean;
};

export const ROOM_ANNOTATION_KINDS = ["label", "area", "interior-dimensions", "rough-ceiling-height"] as const;
export type RoomAnnotationKind = (typeof ROOM_ANNOTATION_KINDS)[number];

export type RoomAnnotationObject = {
  fillOverride?: ModelFillOverride | null;
  id: string;
  kind: RoomAnnotationKind;
  layerId: string;
  position: { x: number; y: number };
  roomId: string;
  storyId: string;
  visible: boolean;
};

export const ROOM_TYPES = [
  "Unassigned",
  "Bathroom",
  "Bedroom",
  "Closet",
  "Deck",
  "Dining Room",
  "Family Room",
  "Foyer",
  "Garage",
  "Hall",
  "Kitchen",
  "Laundry",
  "Living Room",
  "Office",
  "Open Below",
  "Pantry",
  "Porch",
  "Sunroom",
  "Utility",
] as const;
export type RoomType = (typeof ROOM_TYPES)[number] | string;

export type SavedPlanViewMode = "front" | "perspective" | "right" | "top";
export const REFERENCE_DISPLAY_MODES = ["automatic", "below", "above", "specific"] as const;
export type ReferenceDisplayMode = (typeof REFERENCE_DISPLAY_MODES)[number];

export type SavedPlanView = {
  activeLayerId: string;
  annotationScale: number;
  id: string;
  layerSetId: string;
  name: string;
  referenceDisplayEnabled: boolean;
  referenceFillsVisible: boolean;
  referenceLayerSetId: string;
  referenceMode: ReferenceDisplayMode;
  referenceStoryId: string | null;
  storyId: string;
  viewMode: SavedPlanViewMode;
};

export const DEFAULT_LAYER_ID = "layer-default";
export const DEFAULT_LAYER_SET_ID = "layer-set-working-plan";
export const DEFAULT_REFERENCE_LAYER_SET_ID = "layer-set-reference-display";
export const DEFAULT_SAVED_PLAN_VIEW_ID = "saved-view-working-plan";

export const STANDARD_LAYER_IDS: Record<ModelObjectCategory, string> = {
  arc: "layer-default",
  circle: "layer-default",
  door: "layer-doors",
  "floor-platform": "layer-floor-platforms",
  "foundation-wall": "layer-foundation-walls",
  "generic-object": "layer-default",
  line: "layer-default",
  polyline: "layer-default",
  room: "layer-rooms",
  "room-area": "layer-room-area",
  "room-ceiling-height": "layer-room-ceiling-heights",
  "room-interior-dimensions": "layer-room-interior-dimensions",
  "room-label": "layer-room-labels",
  "roof-plane": "layer-roof-planes",
  wall: "layer-walls",
  window: "layer-windows",
};

function layer(id: string, name: string, color: string, fillColor: string, lineWeight = 1): ModelLayer {
  return { color, fillColor, fillVisible: true, id, lineStyle: "solid", lineWeight, locked: false, name, printColor: color, visible: true };
}

export const STANDARD_LAYERS: readonly ModelLayer[] = [
  layer(DEFAULT_LAYER_ID, "Default", "#7f95aa", "#c7d2dc"),
  layer("layer-walls", "Walls", "#263746", "#b9c8d2", 3),
  layer("layer-foundation-walls", "Walls, Foundation", "#657277", "#c8ced0", 3),
  layer("layer-doors", "Doors", "#8a5d45", "#d8c3b7", 2),
  layer("layer-windows", "Windows", "#397d9d", "#b7d8e5", 2),
  layer("layer-floor-platforms", "Floors, Platforms", "#927c58", "#ded2bd", 2),
  layer("layer-roof-planes", "Roofs, Planes", "#6d4f39", "#d7b99a", 2),
  layer("layer-rooms", "Rooms", "#d6e8f3", "#e8eef2"),
  layer("layer-room-labels", "Rooms, Labels", "#20394c", "#ffffff", 2),
  layer("layer-room-area", "Rooms, Standard Area", "#496b80", "#ffffff"),
  layer("layer-room-interior-dimensions", "Rooms, Interior Dimensions", "#496b80", "#ffffff"),
  layer("layer-room-ceiling-heights", "Rooms, Ceiling Heights", "#496b80", "#ffffff"),
];

export function clonePresentationLayer(layerValue: ModelLayer): ModelLayer {
  return { ...layerValue };
}

export function layerSetStateFromLayer(layerValue: ModelLayer): LayerSetState {
  const { color, fillColor, fillVisible, id, lineStyle, lineWeight, locked, printColor, visible } = layerValue;
  return { color, fillColor, fillVisible, id, lineStyle, lineWeight, locked, printColor, visible };
}

export function createDefaultLayers(): ModelLayer[] {
  return STANDARD_LAYERS.map(clonePresentationLayer);
}

export function createDefaultLayerSet(layers: readonly ModelLayer[]): LayerSet {
  return { fillsVisible: true, id: DEFAULT_LAYER_SET_ID, layers: layers.map(layerSetStateFromLayer), name: "Working Plan" };
}

export function createDefaultReferenceLayerSet(layers: readonly ModelLayer[]): LayerSet {
  return {
    fillsVisible: true,
    id: DEFAULT_REFERENCE_LAYER_SET_ID,
    layers: layers.map((layerValue) => ({
      ...layerSetStateFromLayer(layerValue),
      color: "#7f98a7",
      lineWeight: Math.min(layerValue.lineWeight, 2),
      printColor: "#7f98a7",
    })),
    name: "Reference Display",
  };
}

export function createDefaultSavedPlanView(storyId: string): SavedPlanView {
  return {
    activeLayerId: DEFAULT_LAYER_ID,
    annotationScale: 48,
    id: DEFAULT_SAVED_PLAN_VIEW_ID,
    layerSetId: DEFAULT_LAYER_SET_ID,
    name: "Working Plan View",
    referenceDisplayEnabled: false,
    referenceFillsVisible: false,
    referenceLayerSetId: DEFAULT_REFERENCE_LAYER_SET_ID,
    referenceMode: "automatic",
    referenceStoryId: null,
    storyId,
    viewMode: "top",
  };
}

export function resolveReferenceStoryId(view: SavedPlanView, orderedStoryIds: readonly string[]): string | null {
  if (!view.referenceDisplayEnabled || view.viewMode !== "top") return null;
  if (view.referenceMode === "specific") {
    return view.referenceStoryId && view.referenceStoryId !== view.storyId && orderedStoryIds.includes(view.referenceStoryId)
      ? view.referenceStoryId
      : null;
  }
  const activeIndex = orderedStoryIds.indexOf(view.storyId);
  if (activeIndex < 0) return null;
  if (view.referenceMode === "above") return orderedStoryIds[activeIndex + 1] ?? null;
  if (view.referenceMode === "below") return orderedStoryIds[activeIndex - 1] ?? null;
  return orderedStoryIds[activeIndex - 1] ?? orderedStoryIds[activeIndex + 1] ?? null;
}

export function mergeStandardLayers(layers: readonly ModelLayer[]): ModelLayer[] {
  const existing = new Set(layers.map((item) => item.id));
  return [...layers.map(clonePresentationLayer), ...STANDARD_LAYERS.filter((item) => !existing.has(item.id)).map(clonePresentationLayer)];
}
