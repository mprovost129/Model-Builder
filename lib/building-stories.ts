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
export const WALL_HEADER_LAYOUTS = ["solid", "on-edge", "flat-stack"] as const;
export type WallHeaderLayout = (typeof WALL_HEADER_LAYOUTS)[number];
export const WALL_HEADER_FILL_METHODS = ["none", "interior-insulation", "between-plies"] as const;
export type WallHeaderFillMethod = (typeof WALL_HEADER_FILL_METHODS)[number];
export const WALL_HEADER_ALIGNMENTS = ["exterior", "center", "interior"] as const;
export type WallHeaderAlignment = (typeof WALL_HEADER_ALIGNMENTS)[number];
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
  id: string;
  kind: AssemblyKind;
  layers: AssemblyLayer[];
  name: string;
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
  fillMaterial: string;
  fillMethod: WallHeaderFillMethod;
  id: string;
  layout: WallHeaderLayout;
  name: string;
  plyCount: number;
  plyMaterial: string;
  /** Across-wall thickness for on-edge plies; vertical thickness for flat courses. */
  plyThickness: number;
  /** Across-wall spacer thickness used only between on-edge plies. */
  spacerThickness: number;
};

export type WallOpeningType = {
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
  headerTypeId: string;
  /** Full-height king studs generated at each side of the rough opening. */
  kingStudCountPerSide: number;
  name: string;
  /** Header-bearing jack studs generated at each side of the rough opening. */
  jackStudCountPerSide: number;
  roughHeight: number;
  roughWidth: number;
  unitHeight: number;
  unitWidth: number;
  /** Stacked rough-sill plates below a Window opening; always zero for Doors. */
  windowSillPlateCount: number;
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
    id: "wall-type-01",
    kind: "wall-structure",
    name: "2x4 Exterior Wall",
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
      id: "wall-type-02",
      kind: "wall-structure",
      name: "2x6 Exterior Wall",
      wallEndCapLayerIds: [],
      layers: [
        { id: "wall-type-02-01", material: "Exterior Cladding", name: "Exterior Finish", participatesInJoin: true, role: "finish", thickness: 0.5, wallGroup: "exterior" },
        { id: "wall-type-02-02", material: "OSB", name: "Wall Sheathing", participatesInJoin: true, role: "sheathing", thickness: 0.4375, wallGroup: "exterior" },
        { id: "wall-type-02-03", material: "Lumber", name: "2x6 Stud Framing", participatesInJoin: true, role: "framing", thickness: 5.5, wallGroup: "main" },
        { id: "wall-type-02-04", material: "Gypsum Board", name: "Interior Finish", participatesInJoin: true, role: "finish", thickness: 0.5, wallGroup: "interior" },
      ],
    },
    {
      id: "wall-type-03",
      kind: "wall-structure",
      name: "2x4 Interior Wall",
      wallEndCapLayerIds: [],
      layers: [
        { id: "wall-type-03-01", material: "Gypsum Board", name: "Side A Finish", participatesInJoin: true, role: "finish", thickness: 0.5, wallGroup: "exterior" },
        { id: "wall-type-03-02", material: "Lumber", name: "2x4 Stud Framing", participatesInJoin: true, role: "framing", thickness: 3.5, wallGroup: "main" },
        { id: "wall-type-03-03", material: "Gypsum Board", name: "Side B Finish", participatesInJoin: true, role: "finish", thickness: 0.5, wallGroup: "interior" },
      ],
    },
    {
      id: "wall-type-04",
      kind: "wall-structure",
      name: "2x6 Interior Wall",
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
    { alignment: "exterior", fillMaterial: "Rigid Insulation", fillMethod: "interior-insulation", id: "header-type-01", layout: "on-edge", name: "3-Ply Lumber + Interior Rigid", plyCount: 3, plyMaterial: "Dimensional Lumber", plyThickness: 1.5, spacerThickness: 0.5 },
    { alignment: "center", fillMaterial: "None", fillMethod: "none", id: "header-type-02", layout: "flat-stack", name: "2-Piece Flat Stack", plyCount: 2, plyMaterial: "Dimensional Lumber", plyThickness: 1.5, spacerThickness: 0.5 },
    { alignment: "center", fillMaterial: "OSB Sheathing", fillMethod: "between-plies", id: "header-type-03", layout: "on-edge", name: "3-Ply Lumber + Sheathing Spacers", plyCount: 3, plyMaterial: "Dimensional Lumber", plyThickness: 1.5, spacerThickness: 0.5 },
    { alignment: "center", fillMaterial: "None", fillMethod: "none", id: "header-type-04", layout: "solid", name: "Full Main Header", plyCount: 1, plyMaterial: "Lumber", plyThickness: 1.5, spacerThickness: 0.5 },
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
      defaultHeaderBottomHeight: 82.5,
      exteriorReturnDepth: 0,
      headerDepth: 9.25,
      headerTypeId: "header-type-04",
      id: "door-type-01",
      interiorReturnDepth: 0,
      jackStudCountPerSide: 1,
      kingStudCountPerSide: 1,
      kind: "door",
      name: "3-0 x 6-8 Door",
      roughHeight: 82.5,
      roughWidth: 38,
      unitHeight: 80,
      unitWidth: 36,
      windowSillPlateCount: 0,
    },
    {
      defaultHeaderBottomHeight: 80,
      exteriorReturnDepth: 0,
      headerDepth: 9.25,
      headerTypeId: "header-type-04",
      id: "window-type-01",
      interiorReturnDepth: 0,
      jackStudCountPerSide: 1,
      kingStudCountPerSide: 1,
      kind: "window",
      name: "3-0 x 4-0 Window",
      roughHeight: 48.5,
      roughWidth: 36.5,
      unitHeight: 48,
      unitWidth: 36,
      windowSillPlateCount: 1,
    },
  ];
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
    stories: [createBuildingStory("story-01", "First Floor")],
    wallFraming: createDefaultWallFramingSettings(),
    wallTypes: createDefaultWallTypes(),
  };
}

export function cloneFoundationWallType(type: FoundationWallType): FoundationWallType {
  return { ...type, footing: { ...type.footing }, sill: { ...type.sill } };
}

export function cloneWallOpeningType(type: WallOpeningType): WallOpeningType {
  return { ...type };
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
  return { ...building, foundationWallTypes: building.foundationWallTypes.map(cloneFoundationWallType), headerTypes: building.headerTypes.map(cloneWallHeaderType), openingTypes: building.openingTypes.map(cloneWallOpeningType), stories: building.stories.map(cloneBuildingStory), wallFraming: { ...building.wallFraming }, wallTypes: building.wallTypes.map(cloneLayeredAssembly) };
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
  return IDENTIFIER_PATTERN.test(type.id) && IDENTIFIER_PATTERN.test(type.headerTypeId) &&
    stringsAreValid([{ value: type.name, limit: ASSEMBLY_NAME_LIMIT }]) &&
    WALL_OPENING_KINDS.includes(type.kind) &&
    positiveDimensions.every((value) => Number.isFinite(value) && value >= 1 / 16 && value <= 600 && isSixteenth(value)) &&
    returnDepths.every((value) => Number.isFinite(value) && value >= 0 && value <= MAXIMUM_ASSEMBLY_THICKNESS && isSixteenth(value)) &&
    type.unitWidth <= type.roughWidth &&
    type.unitHeight <= type.roughHeight &&
    type.defaultHeaderBottomHeight >= type.roughHeight &&
    Number.isInteger(type.kingStudCountPerSide) && type.kingStudCountPerSide >= 0 && type.kingStudCountPerSide <= 3 &&
    Number.isInteger(type.jackStudCountPerSide) && type.jackStudCountPerSide >= 0 && type.jackStudCountPerSide <= 4 &&
    Number.isInteger(type.windowSillPlateCount) && type.windowSillPlateCount >= 0 && type.windowSillPlateCount <= 2 &&
    (type.kind !== "door" || (type.defaultHeaderBottomHeight === type.roughHeight && type.windowSillPlateCount === 0));
}

export function wallHeaderTypeRequiredMainThickness(type: WallHeaderType): number {
  if (type.layout === "solid" || type.layout === "flat-stack") return 0;
  const spacers = type.fillMethod === "between-plies" ? Math.max(0, type.plyCount - 1) * type.spacerThickness : 0;
  return snapToSixteenth(type.plyCount * type.plyThickness + spacers);
}

export function wallHeaderTypeIsValid(type: WallHeaderType): boolean {
  const dimensions = [type.plyThickness, type.spacerThickness];
  return IDENTIFIER_PATTERN.test(type.id) &&
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

export function wallReferenceDistanceFromExterior(assembly: LayeredAssembly, referenceLine: WallReferenceLine): number {
  const exteriorThickness = wallLayerGroupThickness(assembly, "exterior");
  const mainThickness = wallLayerGroupThickness(assembly, "main");
  if (referenceLine === "exterior-main") return exteriorThickness;
  if (referenceLine === "center-main") return exteriorThickness + mainThickness / 2;
  if (referenceLine === "interior-main") return exteriorThickness + mainThickness;
  return assemblyTotalThickness(assembly) / 2;
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
  } else if (assembly.wallEndCapLayerIds !== undefined || assembly.layers.some((layer) => layer.wallGroup !== undefined || layer.participatesInJoin !== undefined)) {
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
  for (const headerType of building.headerTypes) {
    const normalizedName = headerType.name.trim().toLowerCase();
    if (headerTypeIds.has(headerType.id) || headerTypeNames.has(normalizedName) || !wallHeaderTypeIsValid(headerType)) return false;
    headerTypeIds.add(headerType.id);
    headerTypeNames.add(normalizedName);
  }
  for (const openingType of building.openingTypes) {
    const normalizedName = openingType.name.trim().toLowerCase();
    if (openingTypeIds.has(openingType.id) || openingTypeNames.has(normalizedName) || !wallOpeningTypeIsValid(openingType) || !headerTypeIds.has(openingType.headerTypeId)) return false;
    openingTypeIds.add(openingType.id);
    openingTypeNames.add(normalizedName);
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
