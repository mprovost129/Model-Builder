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

export type SavedPlanView = {
  activeLayerId: string;
  annotationScale: number;
  id: string;
  layerSetId: string;
  name: string;
  referenceStoryId: string | null;
  storyId: string;
  viewMode: SavedPlanViewMode;
};

export const DEFAULT_LAYER_ID = "layer-default";
export const DEFAULT_LAYER_SET_ID = "layer-set-working-plan";
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

export function createDefaultSavedPlanView(storyId: string): SavedPlanView {
  return {
    activeLayerId: DEFAULT_LAYER_ID,
    annotationScale: 48,
    id: DEFAULT_SAVED_PLAN_VIEW_ID,
    layerSetId: DEFAULT_LAYER_SET_ID,
    name: "Working Plan View",
    referenceStoryId: null,
    storyId,
    viewMode: "top",
  };
}

export function mergeStandardLayers(layers: readonly ModelLayer[]): ModelLayer[] {
  const existing = new Set(layers.map((item) => item.id));
  return [...layers.map(clonePresentationLayer), ...STANDARD_LAYERS.filter((item) => !existing.has(item.id)).map(clonePresentationLayer)];
}
