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
  /** Wall-only finish layer used to generate non-overlapping caps at open ends. */
  wallEndCapLayerId?: string | null;
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

export type BuildingStructure = {
  activeWallTypeId: string;
  activeStoryId: string;
  anchorStoryId: string;
  datumElevation: number;
  stories: BuildingStory[];
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
    wallEndCapLayerId: null,
    layers: [
      { id: "wall-type-01-01", material: "Exterior Cladding", name: "Exterior Finish", participatesInJoin: true, role: "finish", thickness: 0.5, wallGroup: "exterior" },
      { id: "wall-type-01-02", material: "OSB", name: "Wall Sheathing", participatesInJoin: true, role: "sheathing", thickness: 0.4375, wallGroup: "exterior" },
      { id: "wall-type-01-03", material: "Lumber", name: "2x4 Stud Framing", participatesInJoin: true, role: "framing", thickness: 3.5, wallGroup: "main" },
      { id: "wall-type-01-04", material: "Gypsum Board", name: "Interior Finish", participatesInJoin: true, role: "finish", thickness: 0.5, wallGroup: "interior" },
    ],
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
  return {
    activeWallTypeId: "wall-type-01",
    activeStoryId: "story-01",
    anchorStoryId: "story-01",
    datumElevation: 0,
    stories: [createBuildingStory("story-01", "First Floor")],
    wallTypes: [createDefaultWallType()],
  };
}

export function cloneAssemblyLayer(layer: AssemblyLayer): AssemblyLayer {
  return { ...layer };
}

export function cloneLayeredAssembly(assembly: LayeredAssembly): LayeredAssembly {
  return { ...assembly, layers: assembly.layers.map(cloneAssemblyLayer) };
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
  return { ...building, stories: building.stories.map(cloneBuildingStory), wallTypes: building.wallTypes.map(cloneLayeredAssembly) };
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
    if (
      assembly.wallEndCapLayerId !== null &&
      (typeof assembly.wallEndCapLayerId !== "string" || !assembly.layers.some((layer) => layer.id === assembly.wallEndCapLayerId && layer.role === "finish" && layer.thickness > 0))
    ) return false;
    if (!hasPositiveMainLayer) return false;
  } else if (assembly.wallEndCapLayerId !== undefined || assembly.layers.some((layer) => layer.wallGroup !== undefined || layer.participatesInJoin !== undefined)) {
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
    building.wallTypes.length > MAXIMUM_WALL_TYPE_COUNT
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
  return storyIds.has(building.anchorStoryId) && storyIds.has(building.activeStoryId) && wallTypeIds.has(building.activeWallTypeId);
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
