import { snapToSixteenth } from "./architectural-units.ts";

export type AssemblyKind = "ceiling-finish" | "ceiling-structure" | "floor-finish" | "floor-structure" | "wall-structure";
export type AssemblyLayerRole =
  | "air-gap"
  | "finish"
  | "framing"
  | "insulation"
  | "membrane"
  | "sheathing"
  | "substrate";

export const WALL_LAYER_GROUPS = ["exterior", "main", "interior"] as const;
export type WallLayerGroup = (typeof WALL_LAYER_GROUPS)[number];
export const WALL_REFERENCE_LINES = ["wall-center", "exterior-main", "center-main", "interior-main"] as const;
export type WallReferenceLine = (typeof WALL_REFERENCE_LINES)[number];
export const WALL_EXTERIOR_SIDES = ["left", "right"] as const;
export type WallExteriorSide = (typeof WALL_EXTERIOR_SIDES)[number];
export const WALL_JOIN_MODES = ["auto", "square"] as const;
export type WallJoinMode = (typeof WALL_JOIN_MODES)[number];
export const FOUNDATION_WALL_CONDITIONS = ["standard-bearing", "interior-mudsill", "dropped-wall", "garage-wall", "slab-walkout"] as const;
export type FoundationWallCondition = (typeof FOUNDATION_WALL_CONDITIONS)[number];
export const WALL_OPENING_KINDS = ["door", "window"] as const;
export type WallOpeningKind = (typeof WALL_OPENING_KINDS)[number];
export const PRODUCT_SOURCE_FORMATS = ["mbproduct", "svg", "glb", "gltf", "dxf", "dwg", "rfa", "ifc", "skp", "other"] as const;
export type ProductSourceFormat = (typeof PRODUCT_SOURCE_FORMATS)[number];
export const PRODUCT_ASSET_ROLES = ["plan-symbol", "elevation-symbol", "model-3d", "thumbnail"] as const;
export type ProductAssetRole = (typeof PRODUCT_ASSET_ROLES)[number];
export const PRODUCT_ASSET_FORMATS = ["svg", "glb", "gltf", "png", "jpeg"] as const;
export type ProductAssetFormat = (typeof PRODUCT_ASSET_FORMATS)[number];
export const PRODUCT_ASSET_SOURCE_UNITS = ["fit-to-unit", "inches", "feet", "millimeters", "centimeters", "meters"] as const;
export type ProductAssetSourceUnit = (typeof PRODUCT_ASSET_SOURCE_UNITS)[number];
export const PRODUCT_ASSET_ORIGINS = ["source-origin", "bounds-center", "bottom-center"] as const;
export type ProductAssetOrigin = (typeof PRODUCT_ASSET_ORIGINS)[number];
export const PRODUCT_ASSET_USAGE_MODES = ["reference", "preferred"] as const;
export type ProductAssetUsageMode = (typeof PRODUCT_ASSET_USAGE_MODES)[number];
export const PRODUCT_OBJECT_CATEGORIES = ["appliance", "cabinetry", "electrical", "furniture", "mechanical", "plumbing", "site", "specialty", "other"] as const;
export type ProductObjectCategory = (typeof PRODUCT_OBJECT_CATEGORIES)[number];
export const WALL_HEADER_LAYOUTS = ["solid", "on-edge", "flat-stack"] as const;
export type WallHeaderLayout = (typeof WALL_HEADER_LAYOUTS)[number];
export const WALL_HEADER_FILL_METHODS = ["none", "interior-insulation", "between-plies"] as const;
export type WallHeaderFillMethod = (typeof WALL_HEADER_FILL_METHODS)[number];
export const WALL_HEADER_ALIGNMENTS = ["exterior", "center", "interior"] as const;
export type WallHeaderAlignment = (typeof WALL_HEADER_ALIGNMENTS)[number];
export const WALL_LOCATIONS = ["exterior", "interior"] as const;
export type WallLocation = (typeof WALL_LOCATIONS)[number];
export const WALL_STRUCTURAL_ROLES = ["bearing", "non-bearing"] as const;
export type WallStructuralRole = (typeof WALL_STRUCTURAL_ROLES)[number];
export const OPENING_COMPONENT_ROLES = ["frame", "jamb", "sash", "panel", "glazing", "mullion", "trim", "threshold", "hardware"] as const;
export type OpeningComponentRole = (typeof OPENING_COMPONENT_ROLES)[number];
export const OPENING_COMPONENT_GEOMETRIES = ["perimeter", "panel", "panel-grid", "fixed-sash", "single-hung-sashes", "double-hung-sashes", "casement-sashes", "awning-sash", "sliding-sashes", "vertical-divider", "horizontal-divider", "vertical-prairie-divider", "horizontal-prairie-divider"] as const;
export type OpeningComponentGeometry = (typeof OPENING_COMPONENT_GEOMETRIES)[number];
export const OPENING_COMPONENT_DEPTH_ANCHORS = ["exterior", "center", "interior"] as const;
export type OpeningComponentDepthAnchor = (typeof OPENING_COMPONENT_DEPTH_ANCHORS)[number];
export const DOOR_PANEL_LAYOUTS = ["flush", "one-panel", "two-panel", "four-panel", "six-panel"] as const;
export type DoorPanelLayout = (typeof DOOR_PANEL_LAYOUTS)[number];
export const WINDOW_SASH_ARRANGEMENTS = ["fixed", "single-hung", "double-hung", "casement-pair", "awning", "sliding"] as const;
export type WindowSashArrangement = (typeof WINDOW_SASH_ARRANGEMENTS)[number];
export const WINDOW_LITE_PATTERNS = ["none", "equal-2x2", "colonial-3x2", "prairie"] as const;
export type WindowLitePattern = (typeof WINDOW_LITE_PATTERNS)[number];

export function openingPanelGridShape(panelCount: number): { columns: number; rows: number } {
  if (panelCount >= 4 && panelCount % 2 === 0) return { columns: 2, rows: panelCount / 2 };
  return { columns: 1, rows: panelCount };
}

export function openingSashGridShape(geometry: OpeningComponentGeometry): { columns: number; rows: number } | null {
  if (geometry === "single-hung-sashes" || geometry === "double-hung-sashes") return { columns: 1, rows: 2 };
  if (geometry === "casement-sashes" || geometry === "sliding-sashes") return { columns: 2, rows: 1 };
  if (geometry === "fixed-sash" || geometry === "awning-sash") return { columns: 1, rows: 1 };
  return null;
}
export const WALL_CORNER_FRAMING_STYLES = ["two-stud", "three-stud"] as const;
export type WallCornerFramingStyle = (typeof WALL_CORNER_FRAMING_STYLES)[number];
export const WALL_PARTITION_BACKING_STYLES = ["none", "three-stud", "ladder"] as const;
export type WallPartitionBackingStyle = (typeof WALL_PARTITION_BACKING_STYLES)[number];
export const MINIMUM_WALL_JOIN_PRIORITY = -100;
export const MAXIMUM_WALL_JOIN_PRIORITY = 100;

export type AssemblyLayer = {
  id: string;
  material: string;
  name: string;
  role: AssemblyLayerRole;
  thickness: number;
  /** Required for wall assemblies; omitted for horizontal assemblies. */
  wallGroup?: WallLayerGroup;
  /** Required for wall assemblies. False keeps this layer square at automatic junctions. */
  participatesInJoin?: boolean;
};

export type LayeredAssembly = {
  /** Wall-only reusable header default. */
  defaultHeaderTypeId?: string;
  id: string;
  kind: AssemblyKind;
  layers: AssemblyLayer[];
  name: string;
  /** Wall-only architectural location used by framing defaults. */
  wallLocation?: WallLocation;
  /** Wall-only load-path classification; this is not an engineered determination. */
  wallStructuralRole?: WallStructuralRole;
  /** Wall-only ordered finish layers used to generate non-overlapping wraps at open ends. */
  wallEndCapLayerIds?: string[];
};

export type BuildingStory = {
  ceilingFinish: LayeredAssembly;
  ceilingStructure: LayeredAssembly;
  floorFinish: LayeredAssembly;
  floorStructure: LayeredAssembly;
  id: string;
  name: string;
  roughCeilingHeight: number;
};

export type FoundationWallType = {
  condition: FoundationWallCondition;
  footing: {
    centerOffset: number;
    enabled: boolean;
    height: number;
    width: number;
  };
  id: string;
  material: string;
  name: string;
  sill: {
    /** Number of plates hosted by the concrete foundation Wall. */
    foundationPlateCount: number;
    /** Positive values move the sill's exterior edge toward the interior. */
    exteriorSetback: number;
    plateHeight: number;
    plateWidth: number;
    /** Bottom plates owned by the framed Wall above, not by the foundation. */
    upperWallBottomPlateCount: number;
  };
  /** Signed difference from the Story's normal foundation top plane. */
  topOffset: number;
  /** Concrete stem height measured down from the foundation top. */
  wallHeight: number;
  wallWidth: number;
};

export type WallHeaderType = {
  alignment: WallHeaderAlignment;
  /** Project flag indicating that final sizing requires engineering. */
  engineeringRequired: boolean;
  fillMaterial: string;
  fillMethod: WallHeaderFillMethod;
  id: string;
  layout: WallHeaderLayout;
  name: string;
  plyCount: number;
  plyMaterial: string;
  /** Short identifier used in future schedules and plan callouts. */
  scheduleMark: string;
  /** Across-wall thickness for on-edge plies; vertical thickness for flat courses. */
  plyThickness: number;
  /** Across-wall spacer thickness used only between on-edge plies. */
  spacerThickness: number;
};

export type OpeningAssemblyComponent = {
  /** Across-wall placement is resolved against the host Wall thickness. */
  depthAnchor: OpeningComponentDepthAnchor;
  depth: number;
  depthOffset: number;
  /** Divider count; retained as one for non-divider components. */
  divisionCount: number;
  geometry: OpeningComponentGeometry;
  id: string;
  /** Positive values shrink and negative values expand the parent rectangle. */
  inset: number;
  material: string;
  name: string;
  /** Null uses the unit rectangle. Children use their parent's clear rectangle. */
  parentComponentId: string | null;
  /** Rail/stile or divider width; retained for panel geometry for stable editing. */
  profileWidth: number;
  role: OpeningComponentRole;
  visible: boolean;
};

export type ManufacturerProductSource = {
  manufacturer: string;
  modelNumber: string;
  productLine: string;
  revision: string;
  sourceFileName: string;
  sourceFormat: ProductSourceFormat;
  sourceUrl: string;
  verifiedAt: string;
};

export type ProductAssetReference = {
  alignment: ProductAssetAlignment;
  byteLength: number;
  checksumSha256: string;
  fileName: string;
  format: ProductAssetFormat;
  id: string;
  name: string;
  role: ProductAssetRole;
  sourceUrl: string;
  /** Preferred assets are eligible for their declared view; native parametric geometry remains the fallback. */
  usage: ProductAssetUsageMode;
};

export type ProductAssetAlignment = {
  /** Offsets are stored in the project's native inch coordinate system. */
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  origin: ProductAssetOrigin;
  /** Euler rotations in degrees, applied after source-unit conversion. */
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scaleMultiplier: number;
  sourceUnits: ProductAssetSourceUnit;
};

export function createDefaultProductAssetAlignment(format: ProductAssetFormat): ProductAssetAlignment {
  return {
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    origin: format === "glb" || format === "gltf" ? "bottom-center" : "bounds-center",
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scaleMultiplier: 1,
    sourceUnits: format === "glb" || format === "gltf" ? "meters" : "fit-to-unit",
  };
}

/** Returns source-unit-to-project-inch scale; fit-to-unit is resolved against the native unit bounds. */
export function productAssetSourceUnitScale(sourceUnits: ProductAssetSourceUnit): number | null {
  if (sourceUnits === "fit-to-unit") return null;
  if (sourceUnits === "feet") return 12;
  if (sourceUnits === "millimeters") return 1 / 25.4;
  if (sourceUnits === "centimeters") return 1 / 2.54;
  if (sourceUnits === "meters") return 100 / 2.54;
  return 1;
}

export type WallOpeningType = {
  /** Joined parametric parts that generate the placed Door or Window model. */
  components: OpeningAssemblyComponent[];
  /** Default bottom of the structural header above the Story rough floor. */
  defaultHeaderBottomHeight: number;
  /** Finish-return depth measured from the exterior face into the rough opening. */
  exteriorReturnDepth: number;
  id: string;
  /** Finish-return depth measured from the interior face into the rough opening. */
  interiorReturnDepth: number;
  kind: WallOpeningKind;
  /** Vertical header depth; structural sizing remains user-defined. */
  headerDepth: number;
  /** Null resolves the assembly from the host Wall Type. */
  headerTypeId: string | null;
  /** Full-height king studs generated at each side of the rough opening. */
  kingStudCountPerSide: number;
  name: string;
  /** Validated representation manifest; asset binary storage remains separate. */
  productAssets: ProductAssetReference[];
  /** Manufacturer identity and source provenance; null denotes a native generic Type. */
  productSource: ManufacturerProductSource | null;
  /** Header-bearing jack studs generated at each side of the rough opening. */
  jackStudCountPerSide: number;
  roughHeight: number;
  roughWidth: number;
  unitHeight: number;
  /** Horizontal unit shift from the center of the rough opening. */
  unitOffsetX: number;
  /** Unit bottom above the rough-opening bottom. */
  unitOffsetZ: number;
  unitWidth: number;
  /** Stacked rough-sill plates below a Window opening; always zero for Doors. */
  windowSillPlateCount: number;
};

/** Reusable, non-hosted product definition. Placed instances retain independent layer and transform data. */
export type ProductObjectType = {
  category: ProductObjectCategory;
  dimensions: { height: number; length: number; width: number };
  id: string;
  name: string;
  productAssets: ProductAssetReference[];
  productSource: ManufacturerProductSource | null;
};

export type WallFramingSettings = {
  bottomPlateCount: number;
  cornerStyle: WallCornerFramingStyle;
  enabled: boolean;
  headerHeight: number;
  ladderBlockSpacing: number;
  material: string;
  partitionBackingStyle: WallPartitionBackingStyle;
  plateHeight: number;
  showInModel: boolean;
  studSpacing: number;
  studWidth: number;
  topPlateCount: number;
};

export type BuildingStructure = {
  activeDoorTypeId: string;
  activeFoundationWallTypeId: string;
  activeWindowTypeId: string;
  activeWallTypeId: string;
  activeStoryId: string;
  anchorStoryId: string;
  datumElevation: number;
  foundationWallTypes: FoundationWallType[];
  headerTypes: WallHeaderType[];
  openingTypes: WallOpeningType[];
  productObjectTypes: ProductObjectType[];
  stories: BuildingStory[];
  wallFraming: WallFramingSettings;
  wallTypes: LayeredAssembly[];
};

export type CalculatedStoryElevations = {
  ceilingFinishThickness: number;
  ceilingStructureBottomElevation: number;
  ceilingStructureThickness: number;
  finishedCeilingElevation: number;
  finishedClearHeight: number;
  finishedFloorElevation: number;
  floorAboveElevation: number | null;
  floorFinishThickness: number;
  floorStructureThickness: number;
  roughCeilingElevation: number;
  roughFloorElevation: number;
  storyId: string;
};

export const MAXIMUM_STORY_COUNT = 12;
export const MAXIMUM_WALL_TYPE_COUNT = 32;
export const MAXIMUM_FOUNDATION_WALL_TYPE_COUNT = 32;
export const MAXIMUM_WALL_OPENING_TYPE_COUNT = 64;
export const MAXIMUM_WALL_HEADER_TYPE_COUNT = 32;
export const MAXIMUM_PRODUCT_OBJECT_TYPE_COUNT = 128;
export const MAXIMUM_OPENING_COMPONENT_COUNT = 48;
export const MAXIMUM_ASSEMBLY_LAYER_COUNT = 32;
export const MAXIMUM_ASSEMBLY_THICKNESS = 240;
export const MINIMUM_ROUGH_CEILING_HEIGHT = 12;
export const MAXIMUM_ROUGH_CEILING_HEIGHT = 600;
export const MAXIMUM_BUILDING_DATUM = 1_000_000;

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const STORY_NAME_LIMIT = 80;
const ASSEMBLY_NAME_LIMIT = 100;
const LAYER_NAME_LIMIT = 100;
const MATERIAL_NAME_LIMIT = 120;

function isSixteenth(value: number): boolean {
  return Math.abs(value * 16 - Math.round(value * 16)) < 1e-8;
}

function defaultFloorStructure(storyId: string): LayeredAssembly {
  return {
    id: `${storyId}-floor-structure`,
    kind: "floor-structure",
    name: "12 in. I-Joist Floor",
    layers: [
      {
        id: `${storyId}-floor-structure-01`,
        material: "OSB",
        name: "OSB Subfloor",
        role: "sheathing",
        thickness: 0.75,
      },
      {
        id: `${storyId}-floor-structure-02`,
        material: "Engineered Wood",
        name: "I-Joists",
        role: "framing",
        thickness: 11.25,
      },
    ],
  };
}

function defaultFloorFinish(storyId: string): LayeredAssembly {
  return {
    id: `${storyId}-floor-finish`,
    kind: "floor-finish",
    name: "Hardwood Floor Finish",
    layers: [
      {
        id: `${storyId}-floor-finish-01`,
        material: "Hardwood",
        name: "Hardwood Flooring",
        role: "finish",
        thickness: 0.75,
      },
    ],
  };
}

export function createDefaultCeilingStructure(storyId: string): LayeredAssembly {
  return {
    id: `${storyId}-ceiling-structure`,
    kind: "ceiling-structure",
    name: "Ceiling Structure",
    layers: [],
  };
}

function defaultCeilingFinish(storyId: string): LayeredAssembly {
  return {
    id: `${storyId}-ceiling-finish`,
    kind: "ceiling-finish",
    name: "Ceiling Finish",
    layers: [
      {
        id: `${storyId}-ceiling-finish-01`,
        material: "Gypsum Board",
        name: "Ceiling Finish",
        role: "finish",
        thickness: 1.25,
      },
    ],
  };
}

export function createDefaultWallType(): LayeredAssembly {
  return {
    defaultHeaderTypeId: "header-type-04",
    id: "wall-type-01",
    kind: "wall-structure",
    name: "2x4 Exterior Wall",
    wallLocation: "exterior",
    wallStructuralRole: "bearing",
    wallEndCapLayerIds: [],
    layers: [
      { id: "wall-type-01-01", material: "Exterior Cladding", name: "Exterior Finish", participatesInJoin: true, role: "finish", thickness: 0.5, wallGroup: "exterior" },
      { id: "wall-type-01-02", material: "OSB", name: "Wall Sheathing", participatesInJoin: true, role: "sheathing", thickness: 0.4375, wallGroup: "exterior" },
      { id: "wall-type-01-03", material: "Lumber", name: "2x4 Stud Framing", participatesInJoin: true, role: "framing", thickness: 3.5, wallGroup: "main" },
      { id: "wall-type-01-04", material: "Gypsum Board", name: "Interior Finish", participatesInJoin: true, role: "finish", thickness: 0.5, wallGroup: "interior" },
    ],
  };
}

export function createDefaultWallTypes(): LayeredAssembly[] {
  return [
    createDefaultWallType(),
    {
      defaultHeaderTypeId: "header-type-01",
      id: "wall-type-02",
      kind: "wall-structure",
      name: "2x6 Exterior Wall",
      wallLocation: "exterior",
      wallStructuralRole: "bearing",
      wallEndCapLayerIds: [],
      layers: [
        { id: "wall-type-02-01", material: "Exterior Cladding", name: "Exterior Finish", participatesInJoin: true, role: "finish", thickness: 0.5, wallGroup: "exterior" },
        { id: "wall-type-02-02", material: "OSB", name: "Wall Sheathing", participatesInJoin: true, role: "sheathing", thickness: 0.4375, wallGroup: "exterior" },
        { id: "wall-type-02-03", material: "Lumber", name: "2x6 Stud Framing", participatesInJoin: true, role: "framing", thickness: 5.5, wallGroup: "main" },
        { id: "wall-type-02-04", material: "Gypsum Board", name: "Interior Finish", participatesInJoin: true, role: "finish", thickness: 0.5, wallGroup: "interior" },
      ],
    },
    {
      defaultHeaderTypeId: "header-type-02",
      id: "wall-type-03",
      kind: "wall-structure",
      name: "2x4 Interior Wall",
      wallLocation: "interior",
      wallStructuralRole: "non-bearing",
      wallEndCapLayerIds: [],
      layers: [
        { id: "wall-type-03-01", material: "Gypsum Board", name: "Side A Finish", participatesInJoin: true, role: "finish", thickness: 0.5, wallGroup: "exterior" },
        { id: "wall-type-03-02", material: "Lumber", name: "2x4 Stud Framing", participatesInJoin: true, role: "framing", thickness: 3.5, wallGroup: "main" },
        { id: "wall-type-03-03", material: "Gypsum Board", name: "Side B Finish", participatesInJoin: true, role: "finish", thickness: 0.5, wallGroup: "interior" },
      ],
    },
    {
      defaultHeaderTypeId: "header-type-02",
      id: "wall-type-04",
      kind: "wall-structure",
      name: "2x6 Interior Wall",
      wallLocation: "interior",
      wallStructuralRole: "non-bearing",
      wallEndCapLayerIds: [],
      layers: [
        { id: "wall-type-04-01", material: "Gypsum Board", name: "Side A Finish", participatesInJoin: true, role: "finish", thickness: 0.5, wallGroup: "exterior" },
        { id: "wall-type-04-02", material: "Lumber", name: "2x6 Stud Framing", participatesInJoin: true, role: "framing", thickness: 5.5, wallGroup: "main" },
        { id: "wall-type-04-03", material: "Gypsum Board", name: "Side B Finish", participatesInJoin: true, role: "finish", thickness: 0.5, wallGroup: "interior" },
      ],
    },
  ];
}

export function createDefaultWallHeaderTypes(): WallHeaderType[] {
  return [
    { alignment: "exterior", engineeringRequired: false, fillMaterial: "Rigid Insulation", fillMethod: "interior-insulation", id: "header-type-01", layout: "on-edge", name: "3-Ply Lumber + Interior Rigid", plyCount: 3, plyMaterial: "Dimensional Lumber", plyThickness: 1.5, scheduleMark: "H1", spacerThickness: 0.5 },
    { alignment: "center", engineeringRequired: false, fillMaterial: "None", fillMethod: "none", id: "header-type-02", layout: "flat-stack", name: "2-Piece Flat Stack", plyCount: 2, plyMaterial: "Dimensional Lumber", plyThickness: 1.5, scheduleMark: "H2", spacerThickness: 0.5 },
    { alignment: "center", engineeringRequired: false, fillMaterial: "OSB Sheathing", fillMethod: "between-plies", id: "header-type-03", layout: "on-edge", name: "3-Ply Lumber + Sheathing Spacers", plyCount: 3, plyMaterial: "Dimensional Lumber", plyThickness: 1.5, scheduleMark: "H3", spacerThickness: 0.5 },
    { alignment: "center", engineeringRequired: true, fillMaterial: "None", fillMethod: "none", id: "header-type-04", layout: "solid", name: "Full Main Header", plyCount: 1, plyMaterial: "Lumber", plyThickness: 1.5, scheduleMark: "H4", spacerThickness: 0.5 },
    { alignment: "center", engineeringRequired: true, fillMaterial: "None", fillMethod: "none", id: "header-type-05", layout: "on-edge", name: "2-Ply LVL", plyCount: 2, plyMaterial: "LVL", plyThickness: 1.75, scheduleMark: "H5", spacerThickness: 0.5 },
    { alignment: "center", engineeringRequired: true, fillMaterial: "None", fillMethod: "none", id: "header-type-06", layout: "solid", name: "Steel Header · User Defined", plyCount: 1, plyMaterial: "Structural Steel", plyThickness: 1.5, scheduleMark: "H6", spacerThickness: 0.5 },
  ];
}

export function foundationConditionPlateDefaults(condition: FoundationWallCondition) {
  const foundationPlateCount = condition === "standard-bearing" || condition === "interior-mudsill" ? 2 : 1;
  return {
    foundationPlateCount,
    upperWallBottomPlateCount: foundationPlateCount === 2 ? 0 : 1,
  };
}

export function createDefaultFoundationWallType(): FoundationWallType {
  return {
    condition: "standard-bearing",
    footing: { centerOffset: 0, enabled: true, height: 8, width: 16 },
    id: "foundation-wall-type-01",
    material: "Concrete",
    name: "8 in. Concrete · Standard Bearing",
    sill: {
      ...foundationConditionPlateDefaults("standard-bearing"),
      exteriorSetback: 0,
      plateHeight: 1.5,
      plateWidth: 5.5,
    },
    topOffset: 0,
    wallHeight: 96,
    wallWidth: 8,
  };
}

export function createDefaultWallOpeningTypes(): WallOpeningType[] {
  return [
    {
      components: createDefaultOpeningComponents("door"),
      defaultHeaderBottomHeight: 82.5,
      exteriorReturnDepth: 0,
      headerDepth: 9.25,
      headerTypeId: null,
      id: "door-type-01",
      interiorReturnDepth: 0,
      jackStudCountPerSide: 1,
      kingStudCountPerSide: 1,
      kind: "door",
      name: "3-0 x 6-8 Door",
      productAssets: [],
      productSource: null,
      roughHeight: 82.5,
      roughWidth: 38,
      unitHeight: 80,
      unitOffsetX: 0,
      unitOffsetZ: 0,
      unitWidth: 36,
      windowSillPlateCount: 0,
    },
    {
      components: createDefaultOpeningComponents("window"),
      defaultHeaderBottomHeight: 80,
      exteriorReturnDepth: 0,
      headerDepth: 9.25,
      headerTypeId: null,
      id: "window-type-01",
      interiorReturnDepth: 0,
      jackStudCountPerSide: 1,
      kingStudCountPerSide: 1,
      kind: "window",
      name: "3-0 x 4-0 Window",
      productAssets: [],
      productSource: null,
      roughHeight: 48.5,
      roughWidth: 36.5,
      unitHeight: 48,
      unitOffsetX: 0,
      unitOffsetZ: 0.25,
      unitWidth: 36,
      windowSillPlateCount: 1,
    },
  ];
}

export function createDefaultOpeningComponents(kind: WallOpeningKind): OpeningAssemblyComponent[] {
  const perimeter = (id: string, name: string, role: OpeningComponentRole, parentComponentId: string | null, inset: number, profileWidth: number, depth: number, depthAnchor: OpeningComponentDepthAnchor): OpeningAssemblyComponent => ({
    depth,
    depthAnchor,
    depthOffset: 0,
    divisionCount: 1,
    geometry: "perimeter",
    id,
    inset,
    material: role === "trim" ? "Painted Wood" : kind === "window" ? "Vinyl" : "Wood",
    name,
    parentComponentId,
    profileWidth,
    role,
    visible: true,
  });
  if (kind === "door") {
    return [
      perimeter("component-jamb", "Jamb", "jamb", null, 0, 0.75, 4.5, "center"),
      { ...perimeter("component-panel", "Door Panel", "panel", "component-jamb", 0.125, 0.25, 1.75, "center"), geometry: "panel", material: "Painted Wood" },
      perimeter("component-exterior-trim", "Exterior Trim", "trim", null, -2.5, 2.5, 0.75, "exterior"),
      perimeter("component-interior-trim", "Interior Trim", "trim", null, -2.5, 2.5, 0.75, "interior"),
    ];
  }
  return [
    perimeter("component-frame", "Frame", "frame", null, 0, 2, 3.25, "center"),
    { ...perimeter("component-sash", "Double-Hung Sashes", "sash", "component-frame", 0.25, 1.5, 1.75, "center"), geometry: "double-hung-sashes", divisionCount: 2 },
    { ...perimeter("component-glass", "Insulated Glass", "glazing", "component-sash", 0.25, 0.25, 0.25, "center"), geometry: "panel", material: "Insulated Glass" },
    { ...perimeter("component-meeting-rail", "Meeting Rail", "mullion", "component-frame", 0.25, 0.75, 0.75, "center"), geometry: "horizontal-divider" },
    perimeter("component-exterior-trim", "Exterior Trim", "trim", null, -3.5, 3.5, 0.75, "exterior"),
    perimeter("component-interior-trim", "Interior Trim", "trim", null, -3.5, 3.5, 0.75, "interior"),
  ];
}

const DOOR_PANEL_DETAIL_ID = "product-door-panel-detail";
const WINDOW_VERTICAL_LITE_ID = "product-window-lite-vertical";
const WINDOW_HORIZONTAL_LITE_ID = "product-window-lite-horizontal";

function openingProductComponent(id: string, name: string, geometry: OpeningComponentGeometry, parentComponentId: string, divisionCount: number): OpeningAssemblyComponent {
  return {
    depth: 0.375,
    depthAnchor: "interior",
    depthOffset: 0.125,
    divisionCount,
    geometry,
    id,
    inset: 3,
    material: "Painted Wood",
    name,
    parentComponentId,
    profileWidth: 2,
    role: geometry === "panel-grid" ? "panel" : "mullion",
    visible: true,
  };
}

export function doorPanelLayoutForType(type: WallOpeningType): DoorPanelLayout | null {
  if (type.kind !== "door") return null;
  const detail = type.components.find((component) => component.id === DOOR_PANEL_DETAIL_ID);
  if (!detail) return "flush";
  if (detail.geometry !== "panel-grid") return null;
  return ({ 1: "one-panel", 2: "two-panel", 4: "four-panel", 6: "six-panel" } as const)[detail.divisionCount as 1 | 2 | 4 | 6] ?? null;
}

export function configureDoorPanelLayout(type: WallOpeningType, layout: DoorPanelLayout): WallOpeningType | null {
  if (type.kind !== "door") return null;
  const leaf = type.components.find((component) => component.role === "panel" && component.id !== DOOR_PANEL_DETAIL_ID);
  if (!leaf) return null;
  const components = type.components.filter((component) => component.id !== DOOR_PANEL_DETAIL_ID).map((component) => ({ ...component }));
  if (layout !== "flush") {
    const divisionCount = { "one-panel": 1, "two-panel": 2, "four-panel": 4, "six-panel": 6 }[layout];
    components.push(openingProductComponent(DOOR_PANEL_DETAIL_ID, `${divisionCount}-Panel Face`, "panel-grid", leaf.id, divisionCount));
  }
  return { ...cloneWallOpeningType(type), components };
}

const SASH_GEOMETRY_BY_ARRANGEMENT: Record<WindowSashArrangement, OpeningComponentGeometry> = {
  fixed: "fixed-sash",
  "single-hung": "single-hung-sashes",
  "double-hung": "double-hung-sashes",
  "casement-pair": "casement-sashes",
  awning: "awning-sash",
  sliding: "sliding-sashes",
};

export function windowSashArrangementForType(type: WallOpeningType): WindowSashArrangement | null {
  if (type.kind !== "window") return null;
  const geometry = type.components.find((component) => component.role === "sash")?.geometry;
  return (Object.entries(SASH_GEOMETRY_BY_ARRANGEMENT).find(([, candidate]) => candidate === geometry)?.[0] as WindowSashArrangement | undefined) ?? null;
}

export function configureWindowSashArrangement(type: WallOpeningType, arrangement: WindowSashArrangement): WallOpeningType | null {
  if (type.kind !== "window") return null;
  const sash = type.components.find((component) => component.role === "sash");
  if (!sash) return null;
  const paired = ["single-hung", "double-hung", "casement-pair", "sliding"].includes(arrangement);
  const components = type.components.map((component) => component.id === sash.id
    ? { ...component, divisionCount: paired ? 2 : 1, geometry: SASH_GEOMETRY_BY_ARRANGEMENT[arrangement], name: `${arrangement.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ")} ${paired ? "Sashes" : "Sash"}` }
    : component.id === "component-meeting-rail" ? { ...component, visible: arrangement === "single-hung" || arrangement === "double-hung" } : { ...component });
  return { ...cloneWallOpeningType(type), components };
}

export function windowLitePatternForType(type: WallOpeningType): WindowLitePattern | null {
  if (type.kind !== "window") return null;
  const vertical = type.components.find((component) => component.id === WINDOW_VERTICAL_LITE_ID);
  const horizontal = type.components.find((component) => component.id === WINDOW_HORIZONTAL_LITE_ID);
  if (!vertical && !horizontal) return "none";
  if (!vertical || !horizontal) return null;
  if (vertical.geometry === "vertical-prairie-divider" && horizontal.geometry === "horizontal-prairie-divider") return "prairie";
  if (vertical.geometry !== "vertical-divider" || horizontal.geometry !== "horizontal-divider") return null;
  if (vertical.divisionCount === 1 && horizontal.divisionCount === 1) return "equal-2x2";
  if (vertical.divisionCount === 2 && horizontal.divisionCount === 1) return "colonial-3x2";
  return null;
}

export function configureWindowLitePattern(type: WallOpeningType, pattern: WindowLitePattern): WallOpeningType | null {
  if (type.kind !== "window") return null;
  const glazing = type.components.find((component) => component.role === "glazing");
  if (!glazing) return null;
  const components = type.components.filter((component) => component.id !== WINDOW_VERTICAL_LITE_ID && component.id !== WINDOW_HORIZONTAL_LITE_ID).map((component) => ({ ...component }));
  if (pattern !== "none") {
    const prairie = pattern === "prairie";
    const verticalCount = pattern === "colonial-3x2" ? 2 : 1;
    const vertical = openingProductComponent(WINDOW_VERTICAL_LITE_ID, prairie ? "Prairie Vertical Grilles" : "Vertical Grilles", prairie ? "vertical-prairie-divider" : "vertical-divider", glazing.id, verticalCount);
    const horizontal = openingProductComponent(WINDOW_HORIZONTAL_LITE_ID, prairie ? "Prairie Horizontal Grilles" : "Horizontal Grilles", prairie ? "horizontal-prairie-divider" : "horizontal-divider", glazing.id, 1);
    components.push({ ...vertical, depthAnchor: "exterior", inset: 0, material: "Applied Grille", profileWidth: 0.75 }, { ...horizontal, depthAnchor: "exterior", inset: 0, material: "Applied Grille", profileWidth: 0.75 });
  }
  return { ...cloneWallOpeningType(type), components };
}

export function createDefaultWallFramingSettings(): WallFramingSettings {
  return {
    bottomPlateCount: 1,
    cornerStyle: "three-stud",
    enabled: true,
    headerHeight: 9.25,
    ladderBlockSpacing: 24,
    material: "Lumber",
    partitionBackingStyle: "three-stud",
    plateHeight: 1.5,
    showInModel: false,
    studSpacing: 16,
    studWidth: 1.5,
    topPlateCount: 2,
  };
}

export function createBuildingStory(id: string, name: string): BuildingStory {
  return {
    ceilingFinish: defaultCeilingFinish(id),
    ceilingStructure: createDefaultCeilingStructure(id),
    floorFinish: defaultFloorFinish(id),
    floorStructure: defaultFloorStructure(id),
    id,
    name,
    roughCeilingHeight: 109.125,
  };
}

export function createDefaultBuildingStructure(): BuildingStructure {
  const openingTypes = createDefaultWallOpeningTypes();
  return {
    activeDoorTypeId: openingTypes.find((type) => type.kind === "door")!.id,
    activeFoundationWallTypeId: "foundation-wall-type-01",
    activeWindowTypeId: openingTypes.find((type) => type.kind === "window")!.id,
    activeWallTypeId: "wall-type-02",
    activeStoryId: "story-01",
    anchorStoryId: "story-01",
    datumElevation: 0,
    foundationWallTypes: [createDefaultFoundationWallType()],
    headerTypes: createDefaultWallHeaderTypes(),
    openingTypes,
    productObjectTypes: [],
    stories: [createBuildingStory("story-01", "First Floor")],
    wallFraming: createDefaultWallFramingSettings(),
    wallTypes: createDefaultWallTypes(),
  };
}

export function cloneFoundationWallType(type: FoundationWallType): FoundationWallType {
  return { ...type, footing: { ...type.footing }, sill: { ...type.sill } };
}

export function cloneWallOpeningType(type: WallOpeningType): WallOpeningType {
  return { ...type, components: type.components.map((component) => ({ ...component })), productAssets: type.productAssets.map((asset) => ({ ...asset, alignment: { ...asset.alignment } })), productSource: type.productSource === null ? null : { ...type.productSource } };
}

export function cloneProductObjectType(type: ProductObjectType): ProductObjectType {
  return { ...type, dimensions: { ...type.dimensions }, productAssets: type.productAssets.map((asset) => ({ ...asset, alignment: { ...asset.alignment } })), productSource: type.productSource === null ? null : { ...type.productSource } };
}

export function cloneWallHeaderType(type: WallHeaderType): WallHeaderType {
  return { ...type };
}

export function cloneAssemblyLayer(layer: AssemblyLayer): AssemblyLayer {
  return { ...layer };
}

export function cloneLayeredAssembly(assembly: LayeredAssembly): LayeredAssembly {
  const clone = { ...assembly, layers: assembly.layers.map(cloneAssemblyLayer) };
  if (assembly.wallEndCapLayerIds) clone.wallEndCapLayerIds = [...assembly.wallEndCapLayerIds];
  return clone;
}

export function cloneBuildingStory(story: BuildingStory): BuildingStory {
  return {
    ...story,
    ceilingFinish: cloneLayeredAssembly(story.ceilingFinish),
    ceilingStructure: cloneLayeredAssembly(story.ceilingStructure),
    floorFinish: cloneLayeredAssembly(story.floorFinish),
    floorStructure: cloneLayeredAssembly(story.floorStructure),
  };
}

export function cloneBuildingStructure(building: BuildingStructure): BuildingStructure {
  return { ...building, foundationWallTypes: building.foundationWallTypes.map(cloneFoundationWallType), headerTypes: building.headerTypes.map(cloneWallHeaderType), openingTypes: building.openingTypes.map(cloneWallOpeningType), productObjectTypes: building.productObjectTypes.map(cloneProductObjectType), stories: building.stories.map(cloneBuildingStory), wallFraming: { ...building.wallFraming }, wallTypes: building.wallTypes.map(cloneLayeredAssembly) };
}

export function foundationSillStackHeight(type: FoundationWallType): number {
  return snapToSixteenth(type.sill.foundationPlateCount * type.sill.plateHeight);
}

export function foundationWallTypeIsValid(type: FoundationWallType): boolean {
  const dimensions = [type.wallHeight, type.wallWidth, type.footing.width, type.footing.height, type.sill.plateWidth, type.sill.plateHeight];
  const signedDimensions = [type.topOffset, type.footing.centerOffset, type.sill.exteriorSetback];
  return IDENTIFIER_PATTERN.test(type.id) && stringsAreValid([
    { value: type.name, limit: ASSEMBLY_NAME_LIMIT },
    { value: type.material, limit: MATERIAL_NAME_LIMIT },
  ]) && FOUNDATION_WALL_CONDITIONS.includes(type.condition) &&
    dimensions.every((value) => Number.isFinite(value) && value >= 1 / 16 && value <= MAXIMUM_ASSEMBLY_THICKNESS && isSixteenth(value)) &&
    signedDimensions.every((value) => Number.isFinite(value) && Math.abs(value) <= MAXIMUM_ASSEMBLY_THICKNESS && isSixteenth(value)) &&
    (!type.footing.enabled || type.footing.width >= type.wallWidth) &&
    Number.isInteger(type.sill.foundationPlateCount) && type.sill.foundationPlateCount >= 1 && type.sill.foundationPlateCount <= 4 &&
    Number.isInteger(type.sill.upperWallBottomPlateCount) && type.sill.upperWallBottomPlateCount >= 0 && type.sill.upperWallBottomPlateCount <= 2;
}

export function wallOpeningTypeIsValid(type: WallOpeningType): boolean {
  const positiveDimensions = [type.unitWidth, type.unitHeight, type.roughWidth, type.roughHeight, type.defaultHeaderBottomHeight, type.headerDepth];
  const returnDepths = [type.exteriorReturnDepth, type.interiorReturnDepth];
  const componentIds = new Set<string>();
  if (!Array.isArray(type.components) || type.components.length < 1 || type.components.length > MAXIMUM_OPENING_COMPONENT_COUNT) return false;
  for (const component of type.components) {
    if (!IDENTIFIER_PATTERN.test(component.id) || componentIds.has(component.id) ||
      !stringsAreValid([{ value: component.name, limit: ASSEMBLY_NAME_LIMIT }, { value: component.material, limit: MATERIAL_NAME_LIMIT }]) ||
      !OPENING_COMPONENT_ROLES.includes(component.role) || !OPENING_COMPONENT_GEOMETRIES.includes(component.geometry) || !OPENING_COMPONENT_DEPTH_ANCHORS.includes(component.depthAnchor) ||
      typeof component.visible !== "boolean" ||
      !Number.isFinite(component.inset) || Math.abs(component.inset) > 48 || !isSixteenth(component.inset) ||
      !Number.isFinite(component.depth) || component.depth < 1 / 16 || component.depth > MAXIMUM_ASSEMBLY_THICKNESS || !isSixteenth(component.depth) ||
      !Number.isFinite(component.depthOffset) || component.depthOffset < 0 || component.depthOffset > MAXIMUM_ASSEMBLY_THICKNESS || !isSixteenth(component.depthOffset) ||
      !Number.isFinite(component.profileWidth) || component.profileWidth < 1 / 16 || component.profileWidth > 48 || !isSixteenth(component.profileWidth) ||
      !Number.isInteger(component.divisionCount) || component.divisionCount < 1 || component.divisionCount > 8 ||
      (component.parentComponentId !== null && !IDENTIFIER_PATTERN.test(component.parentComponentId))) return false;
    componentIds.add(component.id);
  }
  if (type.components.some((component) => component.parentComponentId !== null && !componentIds.has(component.parentComponentId))) return false;
  const byId = new Map(type.components.map((component) => [component.id, component]));
  for (const component of type.components) {
    const visited = new Set<string>([component.id]);
    let parentId = component.parentComponentId;
    while (parentId !== null) {
      if (visited.has(parentId)) return false;
      visited.add(parentId);
      parentId = byId.get(parentId)?.parentComponentId ?? null;
    }
  }
  const resolvedBounds = new Map<string, { contentHeight: number; contentWidth: number }>();
  const resolveBounds = (component: OpeningAssemblyComponent): { contentHeight: number; contentWidth: number } | null => {
    const cached = resolvedBounds.get(component.id);
    if (cached) return cached;
    const parent = component.parentComponentId === null ? null : byId.get(component.parentComponentId);
    const source = parent ? resolveBounds(parent) : { contentHeight: type.unitHeight, contentWidth: type.unitWidth };
    if (!source) return null;
    const height = source.contentHeight - component.inset * 2;
    const width = source.contentWidth - component.inset * 2;
    if (height < 1 / 16 || width < 1 / 16) return null;
    const panelGrid = component.geometry === "panel-grid" ? openingPanelGridShape(component.divisionCount) : null;
    const sashGrid = openingSashGridShape(component.geometry);
    const grid = panelGrid ?? sashGrid ?? { columns: 1, rows: 1 };
    const horizontalGaps = panelGrid ? (grid.columns - 1) * component.profileWidth : 0;
    const verticalGaps = panelGrid ? (grid.rows - 1) * component.profileWidth : 0;
    const cellHeight = (height - verticalGaps) / grid.rows;
    const cellWidth = (width - horizontalGaps) / grid.columns;
    const perimeterGeometry = component.geometry === "perimeter" || sashGrid !== null;
    const contentHeight = perimeterGeometry ? cellHeight - component.profileWidth * 2 : cellHeight;
    const contentWidth = perimeterGeometry ? cellWidth - component.profileWidth * 2 : cellWidth;
    if (contentHeight < 1 / 16 || contentWidth < 1 / 16 ||
      ((component.geometry === "vertical-divider" || component.geometry === "vertical-prairie-divider") && component.profileWidth >= width) ||
      ((component.geometry === "horizontal-divider" || component.geometry === "horizontal-prairie-divider") && component.profileWidth >= height)) return null;
    const result = { contentHeight, contentWidth };
    resolvedBounds.set(component.id, result);
    return result;
  };
  if (type.components.some((component) => resolveBounds(component) === null)) return false;
  return IDENTIFIER_PATTERN.test(type.id) && (type.headerTypeId === null || IDENTIFIER_PATTERN.test(type.headerTypeId)) &&
    productAssetReferencesAreValid(type.productAssets) &&
    manufacturerProductSourceIsValid(type.productSource) &&
    stringsAreValid([{ value: type.name, limit: ASSEMBLY_NAME_LIMIT }]) &&
    WALL_OPENING_KINDS.includes(type.kind) &&
    positiveDimensions.every((value) => Number.isFinite(value) && value >= 1 / 16 && value <= 600 && isSixteenth(value)) &&
    returnDepths.every((value) => Number.isFinite(value) && value >= 0 && value <= MAXIMUM_ASSEMBLY_THICKNESS && isSixteenth(value)) &&
    type.unitWidth <= type.roughWidth &&
    type.unitHeight <= type.roughHeight &&
    Number.isFinite(type.unitOffsetX) && Math.abs(type.unitOffsetX) <= 600 && isSixteenth(type.unitOffsetX) &&
    Number.isFinite(type.unitOffsetZ) && type.unitOffsetZ >= 0 && type.unitOffsetZ <= 600 && isSixteenth(type.unitOffsetZ) &&
    Math.abs(type.unitOffsetX) + type.unitWidth / 2 <= type.roughWidth / 2 + 1e-8 &&
    type.unitOffsetZ + type.unitHeight <= type.roughHeight + 1e-8 &&
    type.defaultHeaderBottomHeight >= type.roughHeight &&
    Number.isInteger(type.kingStudCountPerSide) && type.kingStudCountPerSide >= 0 && type.kingStudCountPerSide <= 3 &&
    Number.isInteger(type.jackStudCountPerSide) && type.jackStudCountPerSide >= 0 && type.jackStudCountPerSide <= 4 &&
    Number.isInteger(type.windowSillPlateCount) && type.windowSillPlateCount >= 0 && type.windowSillPlateCount <= 2 &&
    (type.kind !== "door" || (type.defaultHeaderBottomHeight === type.roughHeight && type.windowSillPlateCount === 0));
}

export function productObjectTypeIsValid(type: ProductObjectType): boolean {
  const dimensions = [type.dimensions.length, type.dimensions.width, type.dimensions.height];
  return IDENTIFIER_PATTERN.test(type.id) &&
    stringsAreValid([{ value: type.name, limit: ASSEMBLY_NAME_LIMIT }]) &&
    PRODUCT_OBJECT_CATEGORIES.includes(type.category) &&
    dimensions.every((value) => Number.isFinite(value) && value >= 1 / 16 && value <= 600 && isSixteenth(value)) &&
    productAssetReferencesAreValid(type.productAssets) &&
    manufacturerProductSourceIsValid(type.productSource);
}

export function manufacturerProductSourceIsValid(source: ManufacturerProductSource | null): boolean {
  if (source === null) return true;
  if (typeof source !== "object" || source === null || !PRODUCT_SOURCE_FORMATS.includes(source.sourceFormat)) return false;
  const required = [source.manufacturer, source.modelNumber, source.sourceFileName];
  const optional = [source.productLine, source.revision, source.sourceUrl];
  return required.every((value) => typeof value === "string" && Boolean(value.trim()) && value.trim().length <= 240) &&
    optional.every((value) => typeof value === "string" && value.trim().length <= 500) &&
    typeof source.verifiedAt === "string" && (source.verifiedAt === "" || Number.isFinite(Date.parse(source.verifiedAt)));
}

export function productAssetReferencesAreValid(assets: ProductAssetReference[]): boolean {
  if (!Array.isArray(assets) || assets.length > 16) return false;
  const ids = new Set<string>();
  const preferredRoles = new Set<ProductAssetRole>();
  return assets.every((asset) => {
    if (typeof asset !== "object" || asset === null || ids.has(asset.id)) return false;
    ids.add(asset.id);
    if (asset.usage === "preferred") {
      if (preferredRoles.has(asset.role)) return false;
      preferredRoles.add(asset.role);
    }
    const alignment = asset.alignment;
    return IDENTIFIER_PATTERN.test(asset.id) && PRODUCT_ASSET_ROLES.includes(asset.role) && PRODUCT_ASSET_FORMATS.includes(asset.format) && PRODUCT_ASSET_USAGE_MODES.includes(asset.usage) &&
      typeof asset.name === "string" && Boolean(asset.name.trim()) && asset.name.trim().length <= 100 &&
      typeof asset.fileName === "string" && Boolean(asset.fileName.trim()) && asset.fileName.trim().length <= 240 &&
      typeof asset.sourceUrl === "string" && asset.sourceUrl.trim().length <= 500 &&
      typeof asset.checksumSha256 === "string" && (asset.checksumSha256 === "" || /^[a-f0-9]{64}$/i.test(asset.checksumSha256)) &&
      Number.isInteger(asset.byteLength) && asset.byteLength >= 0 && asset.byteLength <= 100_000_000 &&
      typeof alignment === "object" && alignment !== null &&
      PRODUCT_ASSET_SOURCE_UNITS.includes(alignment.sourceUnits) && PRODUCT_ASSET_ORIGINS.includes(alignment.origin) &&
      Number.isFinite(alignment.scaleMultiplier) && alignment.scaleMultiplier >= 0.0001 && alignment.scaleMultiplier <= 10_000 &&
      [alignment.rotationX, alignment.rotationY, alignment.rotationZ].every((value) => Number.isFinite(value) && value >= -360 && value <= 360) &&
      [alignment.offsetX, alignment.offsetY, alignment.offsetZ].every((value) => Number.isFinite(value) && Math.abs(value) <= 1_200 && isSixteenth(value));
  });
}

export function wallHeaderTypeRequiredMainThickness(type: WallHeaderType): number {
  if (type.layout === "solid" || type.layout === "flat-stack") return 0;
  const spacers = type.fillMethod === "between-plies" ? Math.max(0, type.plyCount - 1) * type.spacerThickness : 0;
  return snapToSixteenth(type.plyCount * type.plyThickness + spacers);
}

export function wallHeaderTypeIsValid(type: WallHeaderType): boolean {
  const dimensions = [type.plyThickness, type.spacerThickness];
  return IDENTIFIER_PATTERN.test(type.id) && typeof type.engineeringRequired === "boolean" &&
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,15}$/.test(type.scheduleMark) &&
    stringsAreValid([{ value: type.name, limit: ASSEMBLY_NAME_LIMIT }, { value: type.plyMaterial, limit: MATERIAL_NAME_LIMIT }, { value: type.fillMaterial, limit: MATERIAL_NAME_LIMIT }]) &&
    WALL_HEADER_LAYOUTS.includes(type.layout) && WALL_HEADER_FILL_METHODS.includes(type.fillMethod) && WALL_HEADER_ALIGNMENTS.includes(type.alignment) &&
    dimensions.every((value) => Number.isFinite(value) && value >= 1 / 16 && value <= MAXIMUM_ASSEMBLY_THICKNESS && isSixteenth(value)) &&
    Number.isInteger(type.plyCount) && type.plyCount >= 1 && type.plyCount <= 6 &&
    (type.layout === "on-edge" || type.fillMethod === "none") &&
    (type.fillMethod !== "interior-insulation" || type.alignment === "exterior") &&
    (type.fillMethod !== "between-plies" || type.plyCount >= 2) &&
    wallHeaderTypeRequiredMainThickness(type) <= MAXIMUM_ASSEMBLY_THICKNESS;
}

export function wallFramingSettingsAreValid(settings: WallFramingSettings): boolean {
  const dimensions = [settings.headerHeight, settings.ladderBlockSpacing, settings.plateHeight, settings.studSpacing, settings.studWidth];
  return typeof settings.enabled === "boolean" && typeof settings.showInModel === "boolean" &&
    WALL_CORNER_FRAMING_STYLES.includes(settings.cornerStyle) &&
    WALL_PARTITION_BACKING_STYLES.includes(settings.partitionBackingStyle) &&
    stringsAreValid([{ value: settings.material, limit: MATERIAL_NAME_LIMIT }]) &&
    dimensions.every((value) => Number.isFinite(value) && value >= 1 / 16 && value <= MAXIMUM_ASSEMBLY_THICKNESS && isSixteenth(value)) &&
    settings.studSpacing >= settings.studWidth && settings.headerHeight >= settings.plateHeight &&
    Number.isInteger(settings.bottomPlateCount) && settings.bottomPlateCount >= 0 && settings.bottomPlateCount <= 3 &&
    Number.isInteger(settings.topPlateCount) && settings.topPlateCount >= 0 && settings.topPlateCount <= 4;
}

export function assemblyTotalThickness(assembly: LayeredAssembly): number {
  return snapToSixteenth(
    assembly.layers.reduce((total, layer) => total + layer.thickness, 0),
  );
}

export function wallLayerGroupThickness(assembly: LayeredAssembly, group: WallLayerGroup): number {
  return snapToSixteenth(
    assembly.layers.reduce((total, layer) => total + (layer.wallGroup === group ? layer.thickness : 0), 0),
  );
}

/** Compatibility defaults are used only by in-memory legacy assemblies that predate wall classifications. */
export function wallLocation(assembly: LayeredAssembly): WallLocation {
  return assembly.wallLocation ?? "exterior";
}

export function wallStructuralRole(assembly: LayeredAssembly): WallStructuralRole {
  return assembly.wallStructuralRole ?? "bearing";
}

export function recommendedWallHeaderTypeId(assembly: LayeredAssembly): string {
  if (wallLocation(assembly) === "interior" && wallStructuralRole(assembly) === "non-bearing") return "header-type-02";
  if (wallLocation(assembly) === "exterior" && wallLayerGroupThickness(assembly, "main") >= 5.5) return "header-type-01";
  return "header-type-04";
}

export function wallDefaultHeaderTypeId(assembly: LayeredAssembly): string {
  return assembly.defaultHeaderTypeId ?? recommendedWallHeaderTypeId(assembly);
}

/** Placed override wins, followed by the component type and then the host Wall Type. */
export function resolveWallHeaderType(
  building: BuildingStructure,
  wallTypeId: string | null,
  openingTypeId: string | null,
  headerTypeIdOverride: string | null,
): WallHeaderType | null {
  const wallType = building.wallTypes.find((candidate) => candidate.id === wallTypeId);
  const openingType = building.openingTypes.find((candidate) => candidate.id === openingTypeId);
  const headerTypeId = headerTypeIdOverride ?? openingType?.headerTypeId ?? (wallType ? wallDefaultHeaderTypeId(wallType) : null);
  return building.headerTypes.find((candidate) => candidate.id === headerTypeId) ?? null;
}

export function wallReferenceDistanceFromExterior(assembly: LayeredAssembly, referenceLine: WallReferenceLine): number {
  const exteriorThickness = wallLayerGroupThickness(assembly, "exterior");
  const mainThickness = wallLayerGroupThickness(assembly, "main");
  if (referenceLine === "exterior-main") return exteriorThickness;
  if (referenceLine === "center-main") return exteriorThickness + mainThickness / 2;
  if (referenceLine === "interior-main") return exteriorThickness + mainThickness;
  return assemblyTotalThickness(assembly) / 2;
}

export type WallLayerDistanceRange = {
  center: number;
  end: number;
  layerId: string;
  start: number;
};

/** Exterior-face distances used by plan graphics, dimensions, and assembly previews. */
export function wallLayerDistanceRanges(assembly: LayeredAssembly): WallLayerDistanceRange[] {
  let distanceFromExterior = 0;
  return assembly.layers.map((layer) => {
    const start = distanceFromExterior;
    const end = start + layer.thickness;
    distanceFromExterior = end;
    return {
      center: start + layer.thickness / 2,
      end,
      layerId: layer.id,
      start,
    };
  });
}

/** Layer-center offsets from the drawn reference line along its left-hand normal. */
export function wallLayerCenterOffsets(
  assembly: LayeredAssembly,
  referenceLine: WallReferenceLine,
  exteriorSide: WallExteriorSide,
): number[] {
  const referenceDistance = wallReferenceDistanceFromExterior(assembly, referenceLine);
  let distanceFromExterior = 0;
  return assembly.layers.map((layer) => {
    const inwardDistance = distanceFromExterior + layer.thickness / 2 - referenceDistance;
    distanceFromExterior += layer.thickness;
    return exteriorSide === "left" ? -inwardDistance : inwardDistance;
  });
}

function stringsAreValid(values: Array<{ limit: number; value: string }>): boolean {
  return values.every(({ limit, value }) => Boolean(value.trim()) && value.trim().length <= limit);
}

export function layeredAssemblyIsValid(assembly: LayeredAssembly, expectedKind?: AssemblyKind): boolean {
  if (
    !IDENTIFIER_PATTERN.test(assembly.id) ||
    (expectedKind !== undefined && assembly.kind !== expectedKind) ||
    !stringsAreValid([{ value: assembly.name, limit: ASSEMBLY_NAME_LIMIT }]) ||
    assembly.layers.length > MAXIMUM_ASSEMBLY_LAYER_COUNT
  ) {
    return false;
  }
  const ids = new Set<string>();
  for (const layer of assembly.layers) {
    if (
      !IDENTIFIER_PATTERN.test(layer.id) ||
      ids.has(layer.id) ||
      !stringsAreValid([
        { value: layer.name, limit: LAYER_NAME_LIMIT },
        { value: layer.material, limit: MATERIAL_NAME_LIMIT },
      ]) ||
      !["air-gap", "finish", "framing", "insulation", "membrane", "sheathing", "substrate"].includes(layer.role) ||
      (layer.wallGroup !== undefined && !WALL_LAYER_GROUPS.includes(layer.wallGroup)) ||
      !Number.isFinite(layer.thickness) ||
      layer.thickness < 0 ||
      layer.thickness > MAXIMUM_ASSEMBLY_THICKNESS ||
      !isSixteenth(layer.thickness)
    ) {
      return false;
    }
    ids.add(layer.id);
  }
  if (assembly.kind === "wall-structure") {
    if ((assembly.wallLocation !== undefined && !WALL_LOCATIONS.includes(assembly.wallLocation)) ||
      (assembly.wallStructuralRole !== undefined && !WALL_STRUCTURAL_ROLES.includes(assembly.wallStructuralRole)) ||
      (assembly.defaultHeaderTypeId !== undefined && !IDENTIFIER_PATTERN.test(assembly.defaultHeaderTypeId))) return false;
    let previousGroupIndex = 0;
    let hasPositiveMainLayer = false;
    for (const layer of assembly.layers) {
      if (layer.wallGroup === undefined || typeof layer.participatesInJoin !== "boolean") return false;
      const groupIndex = WALL_LAYER_GROUPS.indexOf(layer.wallGroup);
      if (groupIndex < previousGroupIndex) return false;
      previousGroupIndex = groupIndex;
      if (layer.wallGroup === "main" && layer.thickness > 0) hasPositiveMainLayer = true;
    }
    if (!Array.isArray(assembly.wallEndCapLayerIds) || new Set(assembly.wallEndCapLayerIds).size !== assembly.wallEndCapLayerIds.length) return false;
    if (assembly.wallEndCapLayerIds.some((layerId) => !assembly.layers.some((layer) => layer.id === layerId && layer.role === "finish" && layer.thickness > 0))) return false;
    if (!hasPositiveMainLayer) return false;
  } else if (assembly.defaultHeaderTypeId !== undefined || assembly.wallLocation !== undefined || assembly.wallStructuralRole !== undefined || assembly.wallEndCapLayerIds !== undefined || assembly.layers.some((layer) => layer.wallGroup !== undefined || layer.participatesInJoin !== undefined)) {
    return false;
  }
  return assemblyTotalThickness(assembly) <= MAXIMUM_ASSEMBLY_THICKNESS;
}

export function buildingStructureIsValid(building: BuildingStructure): boolean {
  if (
    !Number.isFinite(building.datumElevation) ||
    Math.abs(building.datumElevation) > MAXIMUM_BUILDING_DATUM ||
    !isSixteenth(building.datumElevation) ||
    building.stories.length < 1 ||
    building.stories.length > MAXIMUM_STORY_COUNT ||
    building.wallTypes.length < 1 ||
    building.wallTypes.length > MAXIMUM_WALL_TYPE_COUNT ||
    building.foundationWallTypes.length < 1 ||
    building.foundationWallTypes.length > MAXIMUM_FOUNDATION_WALL_TYPE_COUNT ||
    building.openingTypes.length < 2 ||
    building.openingTypes.length > MAXIMUM_WALL_OPENING_TYPE_COUNT ||
    building.headerTypes.length < 1 ||
    building.headerTypes.length > MAXIMUM_WALL_HEADER_TYPE_COUNT ||
    !Array.isArray(building.productObjectTypes) ||
    building.productObjectTypes.length > MAXIMUM_PRODUCT_OBJECT_TYPE_COUNT ||
    !wallFramingSettingsAreValid(building.wallFraming)
  ) {
    return false;
  }
  const wallTypeIds = new Set<string>();
  const wallTypeNames = new Set<string>();
  for (const wallType of building.wallTypes) {
    const normalizedName = wallType.name.trim().toLowerCase();
    if (
      wallTypeIds.has(wallType.id) ||
      wallTypeNames.has(normalizedName) ||
      !layeredAssemblyIsValid(wallType, "wall-structure") ||
      assemblyTotalThickness(wallType) < 1 / 16
    ) return false;
    wallTypeIds.add(wallType.id);
    wallTypeNames.add(normalizedName);
  }
  const foundationTypeIds = new Set<string>();
  const foundationTypeNames = new Set<string>();
  for (const foundationType of building.foundationWallTypes) {
    const normalizedName = foundationType.name.trim().toLowerCase();
    if (foundationTypeIds.has(foundationType.id) || foundationTypeNames.has(normalizedName) || !foundationWallTypeIsValid(foundationType)) return false;
    foundationTypeIds.add(foundationType.id);
    foundationTypeNames.add(normalizedName);
  }
  const openingTypeIds = new Set<string>();
  const openingTypeNames = new Set<string>();
  const headerTypeIds = new Set<string>();
  const headerTypeNames = new Set<string>();
  const headerScheduleMarks = new Set<string>();
  for (const headerType of building.headerTypes) {
    const normalizedName = headerType.name.trim().toLowerCase();
    const normalizedScheduleMark = headerType.scheduleMark.trim().toLowerCase();
    if (headerTypeIds.has(headerType.id) || headerTypeNames.has(normalizedName) || headerScheduleMarks.has(normalizedScheduleMark) || !wallHeaderTypeIsValid(headerType)) return false;
    headerTypeIds.add(headerType.id);
    headerTypeNames.add(normalizedName);
    headerScheduleMarks.add(normalizedScheduleMark);
  }
  if (building.wallTypes.some((wallType) => {
    const headerType = building.headerTypes.find((candidate) => candidate.id === wallDefaultHeaderTypeId(wallType));
    if (!headerType) return true;
    const requiredThickness = wallHeaderTypeRequiredMainThickness(headerType);
    return requiredThickness > 0 && requiredThickness > wallLayerGroupThickness(wallType, "main") + 1e-8;
  })) return false;
  for (const openingType of building.openingTypes) {
    const normalizedName = openingType.name.trim().toLowerCase();
    if (openingTypeIds.has(openingType.id) || openingTypeNames.has(normalizedName) || !wallOpeningTypeIsValid(openingType) || (openingType.headerTypeId !== null && !headerTypeIds.has(openingType.headerTypeId))) return false;
    openingTypeIds.add(openingType.id);
    openingTypeNames.add(normalizedName);
  }
  const productObjectTypeIds = new Set<string>();
  const productObjectTypeNames = new Set<string>();
  for (const productObjectType of building.productObjectTypes) {
    const normalizedName = productObjectType.name.trim().toLowerCase();
    if (productObjectTypeIds.has(productObjectType.id) || productObjectTypeNames.has(normalizedName) || !productObjectTypeIsValid(productObjectType)) return false;
    productObjectTypeIds.add(productObjectType.id);
    productObjectTypeNames.add(normalizedName);
  }
  const storyIds = new Set<string>();
  const storyNames = new Set<string>();
  for (const story of building.stories) {
    const normalizedName = story.name.trim().toLowerCase();
    if (
      !IDENTIFIER_PATTERN.test(story.id) ||
      storyIds.has(story.id) ||
      !stringsAreValid([{ value: story.name, limit: STORY_NAME_LIMIT }]) ||
      storyNames.has(normalizedName) ||
      !Number.isFinite(story.roughCeilingHeight) ||
      story.roughCeilingHeight < MINIMUM_ROUGH_CEILING_HEIGHT ||
      story.roughCeilingHeight > MAXIMUM_ROUGH_CEILING_HEIGHT ||
      !isSixteenth(story.roughCeilingHeight) ||
      !layeredAssemblyIsValid(story.floorStructure, "floor-structure") ||
      !layeredAssemblyIsValid(story.floorFinish, "floor-finish") ||
      !layeredAssemblyIsValid(story.ceilingStructure, "ceiling-structure") ||
      !layeredAssemblyIsValid(story.ceilingFinish, "ceiling-finish") ||
      story.roughCeilingHeight < assemblyTotalThickness(story.floorFinish) + assemblyTotalThickness(story.ceilingStructure) + assemblyTotalThickness(story.ceilingFinish)
    ) {
      return false;
    }
    storyIds.add(story.id);
    storyNames.add(normalizedName);
  }
  return storyIds.has(building.anchorStoryId) && storyIds.has(building.activeStoryId) &&
    wallTypeIds.has(building.activeWallTypeId) && foundationTypeIds.has(building.activeFoundationWallTypeId) &&
    building.openingTypes.some((type) => type.id === building.activeDoorTypeId && type.kind === "door") &&
    building.openingTypes.some((type) => type.id === building.activeWindowTypeId && type.kind === "window");
}

export function buildingStructuresEqual(first: BuildingStructure, second: BuildingStructure): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

export function calculateStoryElevations(building: BuildingStructure): CalculatedStoryElevations[] {
  if (!buildingStructureIsValid(building)) return [];
  const anchorIndex = building.stories.findIndex((story) => story.id === building.anchorStoryId);
  const roughFloors = new Array<number>(building.stories.length);
  roughFloors[anchorIndex] = building.datumElevation;

  for (let index = anchorIndex + 1; index < building.stories.length; index += 1) {
    const storyBelow = building.stories[index - 1];
    const story = building.stories[index];
    roughFloors[index] = snapToSixteenth(
      roughFloors[index - 1] + storyBelow.roughCeilingHeight + assemblyTotalThickness(story.floorStructure),
    );
  }
  for (let index = anchorIndex - 1; index >= 0; index -= 1) {
    const story = building.stories[index];
    const storyAbove = building.stories[index + 1];
    roughFloors[index] = snapToSixteenth(
      roughFloors[index + 1] - story.roughCeilingHeight - assemblyTotalThickness(storyAbove.floorStructure),
    );
  }

  return building.stories.map((story, index) => {
    const roughFloorElevation = roughFloors[index];
    const floorStructureThickness = assemblyTotalThickness(story.floorStructure);
    const floorFinishThickness = assemblyTotalThickness(story.floorFinish);
    const ceilingStructureThickness = assemblyTotalThickness(story.ceilingStructure);
    const ceilingFinishThickness = assemblyTotalThickness(story.ceilingFinish);
    const roughCeilingElevation = snapToSixteenth(roughFloorElevation + story.roughCeilingHeight);
    const ceilingStructureBottomElevation = snapToSixteenth(roughCeilingElevation - ceilingStructureThickness);
    return {
      ceilingFinishThickness,
      ceilingStructureBottomElevation,
      ceilingStructureThickness,
      finishedCeilingElevation: snapToSixteenth(ceilingStructureBottomElevation - ceilingFinishThickness),
      finishedClearHeight: snapToSixteenth(story.roughCeilingHeight - floorFinishThickness - ceilingStructureThickness - ceilingFinishThickness),
      finishedFloorElevation: snapToSixteenth(roughFloorElevation + floorFinishThickness),
      floorAboveElevation: index < building.stories.length - 1 ? roughFloors[index + 1] : null,
      floorFinishThickness,
      floorStructureThickness,
      roughCeilingElevation,
      roughFloorElevation,
      storyId: story.id,
    };
  });
}

function nextStoryNumber(building: BuildingStructure): number {
  return Math.max(0, ...building.stories.map((story) => Number(/^story-(\d+)$/i.exec(story.id)?.[1] ?? 0))) + 1;
}

export function addBuildingStory(
  building: BuildingStructure,
  relativeToStoryId: string,
  placement: "above" | "below",
): BuildingStructure | null {
  const relativeIndex = building.stories.findIndex((story) => story.id === relativeToStoryId);
  if (relativeIndex < 0 || building.stories.length >= MAXIMUM_STORY_COUNT) return null;
  const number = nextStoryNumber(building);
  const story = createBuildingStory(`story-${String(number).padStart(2, "0")}`, `Story ${number}`);
  const insertionIndex = placement === "above" ? relativeIndex + 1 : relativeIndex;
  const next = cloneBuildingStructure(building);
  next.stories.splice(insertionIndex, 0, story);
  next.activeStoryId = story.id;
  return next;
}

export function removeBuildingStory(building: BuildingStructure, storyId: string): BuildingStructure | null {
  const index = building.stories.findIndex((story) => story.id === storyId);
  if (index < 0 || building.stories.length <= 1) return null;
  const elevations = calculateStoryElevations(building);
  const next = cloneBuildingStructure(building);
  next.stories.splice(index, 1);
  if (storyId === building.anchorStoryId) {
    const replacement = next.stories[Math.min(index, next.stories.length - 1)];
    const oldElevation = elevations.find((elevation) => elevation.storyId === replacement.id);
    next.anchorStoryId = replacement.id;
    next.datumElevation = oldElevation?.roughFloorElevation ?? building.datumElevation;
  }
  if (storyId === building.activeStoryId) {
    next.activeStoryId = next.stories[Math.min(index, next.stories.length - 1)].id;
  }
  return next;
}
