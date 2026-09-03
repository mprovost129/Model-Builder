import {
  cloneArcObject,
  cloneBoxObject,
  cloneCircleObject,
  cloneDocument,
  cloneGroup,
  cloneLayer,
  cloneLayerSet,
  cloneLineObject,
  clonePolylineObject,
  DEFAULT_LAYER,
  DEFAULT_LAYER_ID,
  MAXIMUM_GROUP_COUNT,
  MAXIMUM_ARC_COUNT,
  MAXIMUM_CIRCLE_COUNT,
  MAXIMUM_LAYER_COUNT,
  MAXIMUM_LINE_COUNT,
  MAXIMUM_WALL_OPENING_COUNT,
  MAXIMUM_POLYLINE_COUNT,
  MAXIMUM_ROOM_COUNT,
  MAXIMUM_OBJECT_COUNT,
  MAXIMUM_PLATFORM_OPENING_COUNT,
  PLATFORM_OPENING_CUTS,
  PLATFORM_OPENING_KINDS,
  type BoxObject,
  type ArcObject,
  type CircleObject,
  type ModelGroup,
  type ModelDocument,
  type ModelLayer,
  type LineObject,
  type WallOpening,
  type PolylineObject,
  type PlatformOpening,
  type RoomObject,
  cloneRoomObject,
  cloneRoomAnnotation,
  cloneSavedPlanView,
  platformOpeningContinuityIsValid,
  roomAnnotationIsValid,
  roomObjectIsValid,
  resolveOpeningComponents,
  wallOpeningsAreValid,
  type OpeningComponentOverride,
  type LayerSet,
  type RoomAnnotationObject,
  type SavedPlanView,
} from "./document-model.ts";
import {
  DEFAULT_LAYER_SET_ID,
  DEFAULT_SAVED_PLAN_VIEW_ID,
  MODEL_LINE_STYLES,
  ROOM_ANNOTATION_KINDS,
  STANDARD_LAYER_IDS,
  STANDARD_LAYERS,
  createDefaultLayerSet,
  createDefaultSavedPlanView,
  mergeStandardLayers,
  type LayerSetState,
} from "../features/project-presentation.ts";
import { arcGeometryIsValid } from "./cad-arc.ts";
import { circleGeometryIsValid } from "./cad-circle.ts";
import { polylineCentroid, polylineGeometryIsValid, type PolylineGeometry } from "./cad-polyline.ts";
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
  createDefaultProductAssetAlignment,
  createDefaultWallType,
  createDefaultWallFramingSettings,
  FOUNDATION_WALL_CONDITIONS,
  OPENING_COMPONENT_DEPTH_ANCHORS,
  OPENING_COMPONENT_GEOMETRIES,
  OPENING_COMPONENT_ROLES,
  PRODUCT_ASSET_FORMATS,
  PRODUCT_ASSET_ORIGINS,
  PRODUCT_ASSET_ROLES,
  PRODUCT_ASSET_SOURCE_UNITS,
  PRODUCT_ASSET_USAGE_MODES,
  PRODUCT_SOURCE_FORMATS,
  PRODUCT_OBJECT_CATEGORIES,
  WALL_CORNER_FRAMING_STYLES,
  WALL_HEADER_ALIGNMENTS,
  WALL_HEADER_FILL_METHODS,
  WALL_HEADER_LAYOUTS,
  WALL_OPENING_KINDS,
  WALL_PARTITION_BACKING_STYLES,
  MAXIMUM_WALL_JOIN_PRIORITY,
  MINIMUM_WALL_JOIN_PRIORITY,
  WALL_EXTERIOR_SIDES,
  WALL_JOIN_MODES,
  WALL_LAYER_GROUPS,
  WALL_LOCATIONS,
  WALL_REFERENCE_LINES,
  WALL_STRUCTURAL_ROLES,
  createDefaultOpeningComponents,
  type AssemblyKind,
  type AssemblyLayer,
  type AssemblyLayerRole,
  type BuildingStory,
  type BuildingStructure,
  type FoundationWallCondition,
  type FoundationWallType,
  type LayeredAssembly,
  type OpeningAssemblyComponent,
  type OpeningComponentDepthAnchor,
  type OpeningComponentGeometry,
  type OpeningComponentRole,
  type ManufacturerProductSource,
  type ProductAssetFormat,
  type ProductAssetOrigin,
  type ProductAssetReference,
  type ProductAssetRole,
  type ProductAssetSourceUnit,
  type ProductSourceFormat,
  type ProductObjectCategory,
  type ProductObjectType,
  type WallExteriorSide,
  type WallJoinMode,
  type WallOpeningKind,
  type WallOpeningType,
  type WallFramingSettings,
  type WallHeaderType,
  type WallHeaderAlignment,
  type WallHeaderFillMethod,
  type WallHeaderLayout,
  type WallCornerFramingStyle,
  type WallPartitionBackingStyle,
  type WallLayerGroup,
  type WallLocation,
  type WallReferenceLine,
  type WallStructuralRole,
} from "./building-stories.ts";

export const PROJECT_FILE_FORMAT = "model-builder-project";
export const PROJECT_FILE_VERSION = 43;
export const PROJECT_FILE_EXTENSION = ".mbproj";

export type ModelBuilderProject = {
  activeLayerSetId: string;
  activeLayerId: string;
  activeSavedPlanViewId: string;
  arcs: ArcObject[];
  building: BuildingStructure;
  circles: CircleObject[];
  createdAt: string;
  format: typeof PROJECT_FILE_FORMAT;
  groups: ModelGroup[];
  layers: ModelLayer[];
  layerSets: LayerSet[];
  lines: LineObject[];
  name: string;
  objects: BoxObject[];
  polylines: PolylineObject[];
  rooms: RoomObject[];
  roomAnnotations: RoomAnnotationObject[];
  savedPlanViews: SavedPlanView[];
  units: {
    display: "us-architectural";
    internal: "inch";
    precision: "1/16-inch";
  };
  updatedAt: string;
  version: number;
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

function readLayeredAssembly(value: unknown, kind: AssemblyKind, supportsWallGroups = false, supportsWallJoinMetadata = false, wallEndCapVersion: 0 | 1 | 2 = 0, supportsHostAwareHeaders = false): LayeredAssembly | null {
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
  const assembly: LayeredAssembly = {
    id: value.id,
    kind,
    layers: kind === "wall-structure" && !supportsWallGroups ? inferLegacyWallLayerGroups(validLayers) : validLayers,
    name: value.name.trim(),
  };
  if (kind === "wall-structure") {
    if (wallEndCapVersion === 2) {
      if (!Array.isArray(value.wallEndCapLayerIds) || value.wallEndCapLayerIds.some((layerId) => typeof layerId !== "string")) return null;
      assembly.wallEndCapLayerIds = value.wallEndCapLayerIds as string[];
    } else if (wallEndCapVersion === 1) {
      if (value.wallEndCapLayerId !== null && typeof value.wallEndCapLayerId !== "string") return null;
      assembly.wallEndCapLayerIds = typeof value.wallEndCapLayerId === "string" ? [value.wallEndCapLayerId] : [];
    } else {
      assembly.wallEndCapLayerIds = [];
    }
    if (supportsHostAwareHeaders) {
      if (typeof value.defaultHeaderTypeId !== "string" || typeof value.wallLocation !== "string" || !WALL_LOCATIONS.includes(value.wallLocation as WallLocation) || typeof value.wallStructuralRole !== "string" || !WALL_STRUCTURAL_ROLES.includes(value.wallStructuralRole as WallStructuralRole)) return null;
      assembly.defaultHeaderTypeId = value.defaultHeaderTypeId;
      assembly.wallLocation = value.wallLocation as WallLocation;
      assembly.wallStructuralRole = value.wallStructuralRole as WallStructuralRole;
    } else {
      assembly.defaultHeaderTypeId = "header-type-04";
      assembly.wallLocation = "exterior";
      assembly.wallStructuralRole = "bearing";
    }
  }
  return assembly;
}

function readFoundationWallType(value: unknown, supportsWallHeight: boolean): FoundationWallType | null {
  if (!isRecord(value) || !isRecord(value.footing) || !isRecord(value.sill) ||
    typeof value.id !== "string" || typeof value.name !== "string" || typeof value.material !== "string" ||
    typeof value.condition !== "string" || !FOUNDATION_WALL_CONDITIONS.includes(value.condition as FoundationWallCondition) ||
    typeof value.footing.enabled !== "boolean" || !isFiniteNumber(value.footing.width) || !isFiniteNumber(value.footing.height) || !isFiniteNumber(value.footing.centerOffset) ||
    !isFiniteNumber(value.sill.plateWidth) || !isFiniteNumber(value.sill.plateHeight) || !isFiniteNumber(value.sill.exteriorSetback) ||
    !Number.isInteger(value.sill.foundationPlateCount) || !Number.isInteger(value.sill.upperWallBottomPlateCount) ||
    !isFiniteNumber(value.topOffset) || !isFiniteNumber(value.wallWidth) || (supportsWallHeight && !isFiniteNumber(value.wallHeight))) return null;
  return {
    condition: value.condition as FoundationWallCondition,
    footing: {
      centerOffset: value.footing.centerOffset,
      enabled: value.footing.enabled,
      height: value.footing.height,
      width: value.footing.width,
    },
    id: value.id,
    material: value.material.trim(),
    name: value.name.trim(),
    sill: {
      exteriorSetback: value.sill.exteriorSetback,
      foundationPlateCount: value.sill.foundationPlateCount as number,
      plateHeight: value.sill.plateHeight,
      plateWidth: value.sill.plateWidth,
      upperWallBottomPlateCount: value.sill.upperWallBottomPlateCount as number,
    },
    topOffset: value.topOffset,
    wallHeight: supportsWallHeight ? value.wallHeight as number : 96,
    wallWidth: value.wallWidth,
  };
}

function readWallHeaderType(value: unknown, supportsHeaderMetadata: boolean, index: number): WallHeaderType | null {
  if (!isRecord(value) ||
    typeof value.id !== "string" || typeof value.name !== "string" ||
    typeof value.layout !== "string" || !WALL_HEADER_LAYOUTS.includes(value.layout as WallHeaderLayout) ||
    typeof value.fillMethod !== "string" || !WALL_HEADER_FILL_METHODS.includes(value.fillMethod as WallHeaderFillMethod) ||
    typeof value.alignment !== "string" || !WALL_HEADER_ALIGNMENTS.includes(value.alignment as WallHeaderAlignment) ||
    typeof value.plyMaterial !== "string" || typeof value.fillMaterial !== "string" ||
    (supportsHeaderMetadata && (typeof value.engineeringRequired !== "boolean" || typeof value.scheduleMark !== "string")) ||
    !Number.isInteger(value.plyCount) || !isFiniteNumber(value.plyThickness) || !isFiniteNumber(value.spacerThickness)) return null;
  return {
    alignment: value.alignment as WallHeaderAlignment,
    engineeringRequired: supportsHeaderMetadata ? value.engineeringRequired as boolean : value.layout === "solid",
    fillMaterial: value.fillMaterial.trim(),
    fillMethod: value.fillMethod as WallHeaderFillMethod,
    id: value.id,
    layout: value.layout as WallHeaderLayout,
    name: value.name.trim(),
    plyCount: value.plyCount as number,
    plyMaterial: value.plyMaterial.trim(),
    plyThickness: value.plyThickness,
    scheduleMark: supportsHeaderMetadata ? (value.scheduleMark as string).trim() : `H${index + 1}`,
    spacerThickness: value.spacerThickness,
  };
}

function readOpeningAssemblyComponent(value: unknown): OpeningAssemblyComponent | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string" || typeof value.material !== "string" ||
    typeof value.role !== "string" || !OPENING_COMPONENT_ROLES.includes(value.role as OpeningComponentRole) ||
    typeof value.geometry !== "string" || !OPENING_COMPONENT_GEOMETRIES.includes(value.geometry as OpeningComponentGeometry) ||
    typeof value.depthAnchor !== "string" || !OPENING_COMPONENT_DEPTH_ANCHORS.includes(value.depthAnchor as OpeningComponentDepthAnchor) ||
    (value.parentComponentId !== null && typeof value.parentComponentId !== "string") || typeof value.visible !== "boolean" ||
    !isFiniteNumber(value.inset) || !isFiniteNumber(value.profileWidth) || !isFiniteNumber(value.depth) || !isFiniteNumber(value.depthOffset) || !Number.isInteger(value.divisionCount)) return null;
  return {
    depth: value.depth,
    depthAnchor: value.depthAnchor as OpeningComponentDepthAnchor,
    depthOffset: value.depthOffset,
    divisionCount: value.divisionCount as number,
    geometry: value.geometry as OpeningComponentGeometry,
    id: value.id,
    inset: value.inset,
    material: value.material.trim(),
    name: value.name.trim(),
    parentComponentId: value.parentComponentId as string | null,
    profileWidth: value.profileWidth,
    role: value.role as OpeningComponentRole,
    visible: value.visible,
  };
}

function readManufacturerProductSource(value: unknown): ManufacturerProductSource | null | undefined {
  if (value === null) return null;
  if (!isRecord(value) || typeof value.manufacturer !== "string" || typeof value.modelNumber !== "string" ||
    typeof value.productLine !== "string" || typeof value.revision !== "string" || typeof value.sourceFileName !== "string" ||
    typeof value.sourceFormat !== "string" || !PRODUCT_SOURCE_FORMATS.includes(value.sourceFormat as ProductSourceFormat) ||
    typeof value.sourceUrl !== "string" || typeof value.verifiedAt !== "string") return undefined;
  return {
    manufacturer: value.manufacturer.trim(),
    modelNumber: value.modelNumber.trim(),
    productLine: value.productLine.trim(),
    revision: value.revision.trim(),
    sourceFileName: value.sourceFileName.trim(),
    sourceFormat: value.sourceFormat as ProductSourceFormat,
    sourceUrl: value.sourceUrl.trim(),
    verifiedAt: value.verifiedAt,
  };
}

function readProductAssetReference(value: unknown, supportsAlignment: boolean): ProductAssetReference | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string" || typeof value.fileName !== "string" ||
    typeof value.role !== "string" || !PRODUCT_ASSET_ROLES.includes(value.role as ProductAssetRole) ||
    typeof value.format !== "string" || !PRODUCT_ASSET_FORMATS.includes(value.format as ProductAssetFormat) ||
    typeof value.sourceUrl !== "string" || typeof value.checksumSha256 !== "string" || !Number.isInteger(value.byteLength) ||
    (supportsAlignment && (typeof value.usage !== "string" || !PRODUCT_ASSET_USAGE_MODES.includes(value.usage as ProductAssetReference["usage"]) || !isRecord(value.alignment)))) return null;
  const format = value.format as ProductAssetFormat;
  const fallbackAlignment = createDefaultProductAssetAlignment(format);
  const alignment = supportsAlignment ? value.alignment as Record<string, unknown> : fallbackAlignment;
  if (supportsAlignment && (
    typeof alignment.sourceUnits !== "string" || !PRODUCT_ASSET_SOURCE_UNITS.includes(alignment.sourceUnits as ProductAssetSourceUnit) ||
    typeof alignment.origin !== "string" || !PRODUCT_ASSET_ORIGINS.includes(alignment.origin as ProductAssetOrigin) ||
    !isFiniteNumber(alignment.scaleMultiplier) || !isFiniteNumber(alignment.rotationX) || !isFiniteNumber(alignment.rotationY) || !isFiniteNumber(alignment.rotationZ) ||
    !isFiniteNumber(alignment.offsetX) || !isFiniteNumber(alignment.offsetY) || !isFiniteNumber(alignment.offsetZ)
  )) return null;
  return {
    alignment: {
      offsetX: alignment.offsetX as number,
      offsetY: alignment.offsetY as number,
      offsetZ: alignment.offsetZ as number,
      origin: alignment.origin as ProductAssetOrigin,
      rotationX: alignment.rotationX as number,
      rotationY: alignment.rotationY as number,
      rotationZ: alignment.rotationZ as number,
      scaleMultiplier: alignment.scaleMultiplier as number,
      sourceUnits: alignment.sourceUnits as ProductAssetSourceUnit,
    },
    byteLength: value.byteLength as number,
    checksumSha256: value.checksumSha256.trim(),
    fileName: value.fileName.trim(),
    format,
    id: value.id,
    name: value.name.trim(),
    role: value.role as ProductAssetRole,
    sourceUrl: value.sourceUrl.trim(),
    usage: supportsAlignment ? value.usage as ProductAssetReference["usage"] : "reference",
  };
}

function readWallOpeningType(value: unknown, supportsOpeningFraming: boolean, fallbackHeaderDepth: number, supportsHeaderTypes: boolean, fallbackHeaderTypeId: string, supportsHostAwareHeaders: boolean, supportsAssemblyComponents: boolean, supportsProductSources: boolean, supportsProductAssets: boolean, supportsProductAssetAlignment: boolean): WallOpeningType | null {
  if (!isRecord(value) ||
    typeof value.id !== "string" || typeof value.name !== "string" ||
    typeof value.kind !== "string" || !WALL_OPENING_KINDS.includes(value.kind as WallOpeningKind) ||
    !isFiniteNumber(value.unitWidth) || !isFiniteNumber(value.unitHeight) ||
    !isFiniteNumber(value.roughWidth) || !isFiniteNumber(value.roughHeight) ||
    !isFiniteNumber(value.defaultHeaderBottomHeight) ||
    !isFiniteNumber(value.exteriorReturnDepth) || !isFiniteNumber(value.interiorReturnDepth) ||
    (supportsAssemblyComponents && (!Array.isArray(value.components) || !isFiniteNumber(value.unitOffsetX) || !isFiniteNumber(value.unitOffsetZ))) ||
    (supportsOpeningFraming && (!isFiniteNumber(value.headerDepth) || !Number.isInteger(value.kingStudCountPerSide) || !Number.isInteger(value.jackStudCountPerSide) || !Number.isInteger(value.windowSillPlateCount))) ||
    (supportsHeaderTypes && (supportsHostAwareHeaders ? value.headerTypeId !== null && typeof value.headerTypeId !== "string" : typeof value.headerTypeId !== "string")) ||
    (supportsProductSources && value.productSource !== null && !isRecord(value.productSource)) ||
    (supportsProductAssets && !Array.isArray(value.productAssets))) return null;
  const kind = value.kind as WallOpeningKind;
  const components = supportsAssemblyComponents
    ? (value.components as unknown[]).map(readOpeningAssemblyComponent)
    : createDefaultOpeningComponents(kind);
  if (components.some((component) => component === null)) return null;
  const productSource = supportsProductSources ? readManufacturerProductSource(value.productSource) : null;
  if (productSource === undefined) return null;
  const productAssets = supportsProductAssets ? (value.productAssets as unknown[]).map((asset) => readProductAssetReference(asset, supportsProductAssetAlignment)) : [];
  if (productAssets.some((asset) => asset === null)) return null;
  return {
    components: components as OpeningAssemblyComponent[],
    defaultHeaderBottomHeight: value.defaultHeaderBottomHeight,
    exteriorReturnDepth: value.exteriorReturnDepth,
    headerDepth: supportsOpeningFraming ? value.headerDepth as number : fallbackHeaderDepth,
    headerTypeId: supportsHeaderTypes ? value.headerTypeId as string | null : fallbackHeaderTypeId,
    id: value.id,
    interiorReturnDepth: value.interiorReturnDepth,
    jackStudCountPerSide: supportsOpeningFraming ? value.jackStudCountPerSide as number : 1,
    kingStudCountPerSide: supportsOpeningFraming ? value.kingStudCountPerSide as number : 1,
    kind,
    name: value.name.trim(),
    productAssets: productAssets as ProductAssetReference[],
    productSource,
    roughHeight: value.roughHeight,
    roughWidth: value.roughWidth,
    unitHeight: value.unitHeight,
    unitOffsetX: supportsAssemblyComponents ? value.unitOffsetX as number : 0,
    unitOffsetZ: supportsAssemblyComponents ? value.unitOffsetZ as number : kind === "window" ? Math.max(0, Math.floor((value.roughHeight - value.unitHeight) * 8 + 1e-8) / 16) : 0,
    unitWidth: value.unitWidth,
    windowSillPlateCount: supportsOpeningFraming ? value.windowSillPlateCount as number : kind === "window" ? 1 : 0,
  };
}

function readProductObjectType(value: unknown): ProductObjectType | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string" ||
    typeof value.category !== "string" || !PRODUCT_OBJECT_CATEGORIES.includes(value.category as ProductObjectCategory) ||
    !isRecord(value.dimensions) || !isFiniteNumber(value.dimensions.length) || !isFiniteNumber(value.dimensions.width) || !isFiniteNumber(value.dimensions.height) ||
    value.productSource !== null && !isRecord(value.productSource) || !Array.isArray(value.productAssets)) return null;
  const productSource = readManufacturerProductSource(value.productSource);
  if (productSource === undefined) return null;
  const productAssets = value.productAssets.map((asset) => readProductAssetReference(asset, true));
  if (productAssets.some((asset) => asset === null)) return null;
  return {
    category: value.category as ProductObjectCategory,
    dimensions: { height: value.dimensions.height, length: value.dimensions.length, width: value.dimensions.width },
    id: value.id,
    name: value.name.trim(),
    productAssets: productAssets as ProductAssetReference[],
    productSource,
  };
}

function readWallFramingSettings(value: unknown, supportsJunctionSettings: boolean): WallFramingSettings | null {
  if (!isRecord(value) ||
    typeof value.enabled !== "boolean" || typeof value.showInModel !== "boolean" || typeof value.material !== "string" ||
    !isFiniteNumber(value.studSpacing) || !isFiniteNumber(value.studWidth) ||
    !isFiniteNumber(value.plateHeight) || !isFiniteNumber(value.headerHeight) ||
    !isFiniteNumber(value.bottomPlateCount) || !Number.isInteger(value.bottomPlateCount) ||
    !isFiniteNumber(value.topPlateCount) || !Number.isInteger(value.topPlateCount)) return null;
  const defaults = createDefaultWallFramingSettings();
  if (supportsJunctionSettings && (
    typeof value.cornerStyle !== "string" || !WALL_CORNER_FRAMING_STYLES.includes(value.cornerStyle as WallCornerFramingStyle) ||
    typeof value.partitionBackingStyle !== "string" || !WALL_PARTITION_BACKING_STYLES.includes(value.partitionBackingStyle as WallPartitionBackingStyle) ||
    !isFiniteNumber(value.ladderBlockSpacing)
  )) return null;
  return {
    bottomPlateCount: value.bottomPlateCount as number,
    cornerStyle: supportsJunctionSettings ? value.cornerStyle as WallCornerFramingStyle : defaults.cornerStyle,
    enabled: value.enabled,
    headerHeight: value.headerHeight,
    ladderBlockSpacing: supportsJunctionSettings ? value.ladderBlockSpacing as number : defaults.ladderBlockSpacing,
    material: value.material.trim(),
    partitionBackingStyle: supportsJunctionSettings ? value.partitionBackingStyle as WallPartitionBackingStyle : defaults.partitionBackingStyle,
    plateHeight: value.plateHeight,
    showInModel: value.showInModel,
    studSpacing: value.studSpacing,
    studWidth: value.studWidth,
    topPlateCount: value.topPlateCount as number,
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

function readBuildingStructure(value: unknown, supportsWallTypes: boolean, supportsCeilingStructure: boolean, supportsWallGroups: boolean, supportsWallJoinMetadata: boolean, wallEndCapVersion: 0 | 1 | 2, supportsFoundationWallTypes: boolean, supportsFoundationWallHeight: boolean, supportsOpeningTypes: boolean, supportsWallFraming: boolean, supportsWallJunctionFraming: boolean, supportsOpeningFraming: boolean, supportsHeaderTypes: boolean, supportsHostAwareHeaders: boolean, supportsAssemblyComponents: boolean, supportsProductSources: boolean, supportsProductAssets: boolean, supportsProductAssetAlignment: boolean, supportsProductObjectTypes: boolean): BuildingStructure | null {
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
  const legacyWallType = createDefaultWallType();
  const wallTypes = supportsWallTypes && Array.isArray(value.wallTypes)
    ? value.wallTypes.map((wallType) => readLayeredAssembly(wallType, "wall-structure", supportsWallGroups, supportsWallJoinMetadata, wallEndCapVersion, supportsHostAwareHeaders))
    : [legacyWallType];
  if (wallTypes.some((wallType) => wallType === null)) return null;
  if (supportsFoundationWallTypes && !Array.isArray(value.foundationWallTypes)) return null;
  const foundationWallTypes = supportsFoundationWallTypes
    ? (value.foundationWallTypes as unknown[]).map((type) => readFoundationWallType(type, supportsFoundationWallHeight))
    : defaults.foundationWallTypes;
  if (foundationWallTypes.some((foundationType) => foundationType === null)) return null;
  const wallFraming = supportsWallFraming ? readWallFramingSettings(value.wallFraming, supportsWallJunctionFraming) : createDefaultWallFramingSettings();
  if (!wallFraming) return null;
  if (supportsHeaderTypes && !Array.isArray(value.headerTypes)) return null;
  const headerTypes = supportsHeaderTypes
    ? (value.headerTypes as unknown[]).map((type, index) => readWallHeaderType(type, supportsHostAwareHeaders, index))
    : defaults.headerTypes;
  if (headerTypes.some((headerType) => headerType === null)) return null;
  const fallbackHeaderTypeId = supportsHeaderTypes ? defaults.headerTypes[0].id : defaults.headerTypes.find((type) => type.layout === "solid")!.id;
  if (supportsOpeningTypes && !Array.isArray(value.openingTypes)) return null;
  const openingTypes = supportsOpeningTypes
    ? (value.openingTypes as unknown[]).map((type) => readWallOpeningType(type, supportsOpeningFraming, wallFraming.headerHeight, supportsHeaderTypes, fallbackHeaderTypeId, supportsHostAwareHeaders, supportsAssemblyComponents, supportsProductSources, supportsProductAssets, supportsProductAssetAlignment))
    : defaults.openingTypes;
  if (openingTypes.some((openingType) => openingType === null)) return null;
  if (supportsProductObjectTypes && !Array.isArray(value.productObjectTypes)) return null;
  const productObjectTypes = supportsProductObjectTypes
    ? (value.productObjectTypes as unknown[]).map(readProductObjectType)
    : [];
  if (productObjectTypes.some((productObjectType) => productObjectType === null)) return null;
  const activeWallTypeId = supportsWallTypes ? value.activeWallTypeId : legacyWallType.id;
  if (typeof activeWallTypeId !== "string") return null;
  const activeFoundationWallTypeId = supportsFoundationWallTypes ? value.activeFoundationWallTypeId : defaults.activeFoundationWallTypeId;
  if (typeof activeFoundationWallTypeId !== "string") return null;
  const activeDoorTypeId = supportsOpeningTypes ? value.activeDoorTypeId : defaults.activeDoorTypeId;
  const activeWindowTypeId = supportsOpeningTypes ? value.activeWindowTypeId : defaults.activeWindowTypeId;
  if (typeof activeDoorTypeId !== "string" || typeof activeWindowTypeId !== "string") return null;
  const building: BuildingStructure = {
    activeDoorTypeId,
    activeFoundationWallTypeId,
    activeWindowTypeId,
    activeWallTypeId,
    activeStoryId: value.activeStoryId,
    anchorStoryId: value.anchorStoryId,
    datumElevation: value.datumElevation,
    foundationWallTypes: foundationWallTypes as FoundationWallType[],
    headerTypes: headerTypes as WallHeaderType[],
    openingTypes: openingTypes as WallOpeningType[],
    productObjectTypes: productObjectTypes as ProductObjectType[],
    stories: stories as BuildingStory[],
    wallFraming,
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
  supportsProductObjectTypes: boolean,
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
  const productObjectTypeId = supportsProductObjectTypes
    ? value.productObjectTypeId === null
      ? null
      : typeof value.productObjectTypeId === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.productObjectTypeId)
        ? value.productObjectTypeId
        : undefined
    : null;
  if (
    !storyId ||
    productObjectTypeId === undefined ||
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
    productObjectTypeId,
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

function readLayer(value: unknown, supportsPresentationProperties: boolean): ModelLayer | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.id) ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.trim().length > 80 ||
    typeof value.color !== "string" ||
    !/^#[0-9A-F]{6}$/i.test(value.color) ||
    (supportsPresentationProperties && (typeof value.printColor !== "string" || !/^#[0-9A-F]{6}$/i.test(value.printColor) || typeof value.lineStyle !== "string" || !MODEL_LINE_STYLES.includes(value.lineStyle as ModelLayer["lineStyle"]) || typeof value.lineWeight !== "number" || !Number.isInteger(value.lineWeight) || value.lineWeight < 1 || value.lineWeight > 10)) ||
    typeof value.visible !== "boolean" ||
    typeof value.locked !== "boolean"
  ) {
    return null;
  }
  return {
    color: value.color.toLowerCase(),
    id: value.id,
    lineStyle: supportsPresentationProperties ? value.lineStyle as ModelLayer["lineStyle"] : "solid",
    lineWeight: supportsPresentationProperties ? value.lineWeight as number : 1,
    locked: value.locked,
    name: value.name.trim(),
    printColor: supportsPresentationProperties ? (value.printColor as string).toLowerCase() : value.color.toLowerCase(),
    visible: value.visible,
  };
}

function readOpeningComponentOverride(value: unknown): OpeningComponentOverride | null {
  if (!isRecord(value) || typeof value.componentId !== "string" ||
    (value.depth !== undefined && !isFiniteNumber(value.depth)) ||
    (value.depthAnchor !== undefined && (typeof value.depthAnchor !== "string" || !OPENING_COMPONENT_DEPTH_ANCHORS.includes(value.depthAnchor as OpeningComponentDepthAnchor))) ||
    (value.depthOffset !== undefined && !isFiniteNumber(value.depthOffset)) ||
    (value.divisionCount !== undefined && !Number.isInteger(value.divisionCount)) ||
    (value.inset !== undefined && !isFiniteNumber(value.inset)) ||
    (value.material !== undefined && typeof value.material !== "string") ||
    (value.profileWidth !== undefined && !isFiniteNumber(value.profileWidth)) ||
    (value.visible !== undefined && typeof value.visible !== "boolean")) return null;
  return {
    componentId: value.componentId,
    ...(value.depth === undefined ? {} : { depth: value.depth }),
    ...(value.depthAnchor === undefined ? {} : { depthAnchor: value.depthAnchor as OpeningComponentDepthAnchor }),
    ...(value.depthOffset === undefined ? {} : { depthOffset: value.depthOffset }),
    ...(value.divisionCount === undefined ? {} : { divisionCount: value.divisionCount as number }),
    ...(value.inset === undefined ? {} : { inset: value.inset }),
    ...(value.material === undefined ? {} : { material: value.material.trim() }),
    ...(value.profileWidth === undefined ? {} : { profileWidth: value.profileWidth }),
    ...(value.visible === undefined ? {} : { visible: value.visible }),
  };
}

function readWallOpening(value: unknown, supportsOpeningTypes: boolean, supportsHostAwareHeaders: boolean, supportsComponentOverrides: boolean, supportsObjectLayers: boolean, defaults: BuildingStructure): WallOpening | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.id) ||
    typeof value.name !== "string" || !value.name.trim() || value.name.trim().length > 120 ||
    (value.kind !== "door" && value.kind !== "window") ||
    (supportsObjectLayers && (typeof value.layerId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.layerId))) ||
    !isFiniteNumber(value.centerOffset) || !isFiniteNumber(value.headerBottomHeight) ||
    !isFiniteNumber(value.roughHeight) || !isFiniteNumber(value.roughWidth) ||
    !isFiniteNumber(value.unitHeight) || !isFiniteNumber(value.unitWidth) ||
    (supportsComponentOverrides && !Array.isArray(value.componentOverrides)) ||
    (supportsOpeningTypes && value.wallOpeningTypeId !== null && typeof value.wallOpeningTypeId !== "string") ||
    (supportsHostAwareHeaders && value.headerTypeIdOverride !== null && typeof value.headerTypeIdOverride !== "string")
  ) return null;
  const componentOverrides = supportsComponentOverrides ? (value.componentOverrides as unknown[]).map(readOpeningComponentOverride) : [];
  if (componentOverrides.some((override) => override === null)) return null;
  return {
    centerOffset: value.centerOffset,
    componentOverrides: componentOverrides as OpeningComponentOverride[],
    headerBottomHeight: value.headerBottomHeight,
    headerTypeIdOverride: supportsHostAwareHeaders ? value.headerTypeIdOverride as string | null : null,
    id: value.id,
    kind: value.kind,
    layerId: supportsObjectLayers ? value.layerId as string : STANDARD_LAYER_IDS[value.kind],
    name: value.name.trim(),
    roughHeight: value.roughHeight,
    roughWidth: value.roughWidth,
    unitHeight: value.unitHeight,
    unitWidth: value.unitWidth,
    wallOpeningTypeId: supportsOpeningTypes
      ? value.wallOpeningTypeId as string | null
      : defaults.openingTypes.find((type) => type.kind === value.kind && type.unitWidth === value.unitWidth && type.unitHeight === value.unitHeight && type.roughWidth === value.roughWidth && type.roughHeight === value.roughHeight)?.id ?? null,
  };
}

function readLineObject(value: unknown, supportsZ: boolean, supportsStories: boolean, fallbackStoryId: string, supportsWalls: boolean, supportsWallPlacement: boolean, supportsWallJunctionOverrides: boolean, supportsWallOpenings: boolean, supportsFoundationWalls: boolean, supportsFoundationSupportLinks: boolean, supportsOpeningTypes: boolean, supportsHostAwareHeaders: boolean, supportsComponentOverrides: boolean, supportsObjectLayers: boolean, building: BuildingStructure): LineObject | null {
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
    ? value.architecturalRole === null ? null : value.architecturalRole === "wall" ? "wall" : supportsFoundationWalls && value.architecturalRole === "foundation-wall" ? "foundation-wall" : undefined
    : null;
  const wallTypeId = supportsWalls
    ? value.wallTypeId === null ? null : typeof value.wallTypeId === "string" ? value.wallTypeId : undefined
    : null;
  const foundationWallTypeId = supportsFoundationWalls
    ? value.foundationWallTypeId === null ? null : typeof value.foundationWallTypeId === "string" ? value.foundationWallTypeId : undefined
    : null;
  const foundationSupportWallId = supportsFoundationSupportLinks
    ? value.foundationSupportWallId === null ? null : typeof value.foundationSupportWallId === "string" ? value.foundationSupportWallId : undefined
    : null;
  const wallExteriorSide = supportsWallPlacement
    ? value.wallExteriorSide === null ? null : typeof value.wallExteriorSide === "string" && WALL_EXTERIOR_SIDES.includes(value.wallExteriorSide as WallExteriorSide) ? value.wallExteriorSide as WallExteriorSide : undefined
    : architecturalRole === "wall" ? "left" : null;
  const wallReferenceLine = supportsWallPlacement
    ? value.wallReferenceLine === null ? null : typeof value.wallReferenceLine === "string" && WALL_REFERENCE_LINES.includes(value.wallReferenceLine as WallReferenceLine) ? value.wallReferenceLine as WallReferenceLine : undefined
    : architecturalRole === "wall" ? "wall-center" : null;
  const wallJoinPriority = supportsWallJunctionOverrides
    ? value.wallJoinPriority === null ? null : isFiniteNumber(value.wallJoinPriority) && Number.isInteger(value.wallJoinPriority) && value.wallJoinPriority >= MINIMUM_WALL_JOIN_PRIORITY && value.wallJoinPriority <= MAXIMUM_WALL_JOIN_PRIORITY ? value.wallJoinPriority : undefined
    : architecturalRole === "wall" ? 0 : null;
  const readJoinMode = (candidate: unknown): WallJoinMode | null | undefined => candidate === null ? null : typeof candidate === "string" && WALL_JOIN_MODES.includes(candidate as WallJoinMode) ? candidate as WallJoinMode : undefined;
  const wallStartJoinMode = supportsWallJunctionOverrides ? readJoinMode(value.wallStartJoinMode) : architecturalRole === "wall" ? "auto" : null;
  const wallEndJoinMode = supportsWallJunctionOverrides ? readJoinMode(value.wallEndJoinMode) : architecturalRole === "wall" ? "auto" : null;
  const wallOpenings = supportsWallOpenings
    ? Array.isArray(value.wallOpenings) && value.wallOpenings.length <= MAXIMUM_WALL_OPENING_COUNT
      ? value.wallOpenings.map((opening) => readWallOpening(opening, supportsOpeningTypes, supportsHostAwareHeaders, supportsComponentOverrides, supportsObjectLayers, building))
      : null
    : [];
  if (
    architecturalRole === undefined ||
    wallTypeId === undefined ||
    wallExteriorSide === undefined ||
    wallReferenceLine === undefined ||
    wallJoinPriority === undefined || wallStartJoinMode === undefined || wallEndJoinMode === undefined || wallOpenings === null || wallOpenings.some((opening) => opening === null) ||
    foundationWallTypeId === undefined || foundationSupportWallId === undefined ||
    (architecturalRole === null && (wallTypeId !== null || foundationWallTypeId !== null || foundationSupportWallId !== null || wallExteriorSide !== null || wallReferenceLine !== null || wallJoinPriority !== null || wallStartJoinMode !== null || wallEndJoinMode !== null)) ||
    (architecturalRole === "wall" && (wallTypeId === null || foundationWallTypeId !== null || wallExteriorSide === null || wallReferenceLine === null || wallJoinPriority === null || wallStartJoinMode === null || wallEndJoinMode === null)) ||
    (architecturalRole === "foundation-wall" && (foundationWallTypeId === null || foundationSupportWallId !== null || wallTypeId !== null || wallExteriorSide === null || wallReferenceLine === null || wallJoinPriority === null || wallStartJoinMode === null || wallEndJoinMode === null))
  ) return null;
  if (!isFiniteNumber(startX) || !isFiniteNumber(startY) || !isFiniteNumber(startZ) ||
      !isFiniteNumber(endX) || !isFiniteNumber(endY) || !isFiniteNumber(endZ)) return null;
  const numbers = [startX, startY, startZ, endX, endY, endZ];
  if (!numbers.every((number) => Math.abs(number) <= MAXIMUM_COORDINATE) || !numbers.every(isSixteenth)) return null;
  if (Math.hypot(endX - startX, endY - startY, endZ - startZ) < 1 / 16) return null;
  return {
    architecturalRole,
    end: { x: endX, y: endY, z: endZ },
    foundationSupportWallId,
    foundationWallTypeId,
    id: value.id,
    layerId: value.layerId,
    locked: value.locked,
    name: value.name.trim(),
    start: { x: startX, y: startY, z: startZ },
    storyId,
    type: "line",
    wallExteriorSide,
    wallJoinPriority,
    wallStartJoinMode,
    wallEndJoinMode,
    wallReferenceLine,
    wallTypeId,
    wallOpenings: wallOpenings as WallOpening[],
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

function readPlatformOpening(value: unknown, supportsVerticalOpeningContinuity: boolean): PlatformOpening | null {
  if (
    !isRecord(value) || !isRecord(value.boundary) || !Array.isArray(value.boundary.vertices) ||
    typeof value.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.id) ||
    typeof value.name !== "string" || !value.name.trim() || value.name.trim().length > 120 ||
    typeof value.kind !== "string" || !PLATFORM_OPENING_KINDS.includes(value.kind as PlatformOpening["kind"]) ||
    typeof value.cuts !== "string" || !PLATFORM_OPENING_CUTS.includes(value.cuts as PlatformOpening["cuts"]) ||
    (supportsVerticalOpeningContinuity && !(value.verticalOpeningId === null || typeof value.verticalOpeningId === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.verticalOpeningId)))
  ) return null;
  const vertices = value.boundary.vertices.map((point) => isRecord(point) && isFiniteNumber(point.x) && isFiniteNumber(point.y) ? { x: point.x, y: point.y } : null);
  if (vertices.some((point) => point === null) || !Array.isArray(value.boundary.bulges) || !value.boundary.bulges.every(isFiniteNumber) || !isFiniteNumber(value.boundary.elevation) || !isFiniteNumber(value.boundary.width) || value.boundary.closed !== true) return null;
  const boundary: PolylineGeometry = { bulges: value.boundary.bulges as number[], closed: true, elevation: value.boundary.elevation, vertices: vertices as Array<{ x: number; y: number }>, width: value.boundary.width };
  if (!polylineGeometryIsValid(boundary)) return null;
  return { boundary, cuts: value.cuts as PlatformOpening["cuts"], id: value.id, kind: value.kind as PlatformOpening["kind"], name: value.name.trim(), verticalOpeningId: supportsVerticalOpeningContinuity ? value.verticalOpeningId as string | null : null };
}

function readRoomObject(value: unknown, supportsPlatformOpenings: boolean, supportsVerticalOpeningContinuity: boolean, supportsPresentation: boolean): RoomObject | null {
  if (
    !isRecord(value) || !isRecord(value.boundary) || !Array.isArray(value.boundary.vertices) ||
    typeof value.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.id) ||
    typeof value.name !== "string" || !value.name.trim() || value.name.trim().length > 120 ||
    (supportsPresentation && (typeof value.layerId !== "string" || typeof value.roomType !== "string" || !value.roomType.trim() || value.roomType.trim().length > 80)) ||
    typeof value.storyId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.storyId) ||
    !Array.isArray(value.boundaryWallIds) || value.boundaryWallIds.some((id) => typeof id !== "string") ||
    !isFiniteNumber(value.roughFloorOffset) ||
    !(value.roughCeilingHeightOverride === null || isFiniteNumber(value.roughCeilingHeightOverride))
  ) return null;
  const vertices = value.boundary.vertices.map((point) => isRecord(point) && isFiniteNumber(point.x) && isFiniteNumber(point.y) ? { x: point.x, y: point.y } : null);
  if (vertices.some((point) => point === null) || !Array.isArray(value.boundary.bulges) || !value.boundary.bulges.every(isFiniteNumber) || !isFiniteNumber(value.boundary.elevation) || !isFiniteNumber(value.boundary.width) || value.boundary.closed !== true) return null;
  const boundary: PolylineGeometry = { bulges: value.boundary.bulges as number[], closed: true, elevation: value.boundary.elevation, vertices: vertices as Array<{ x: number; y: number }>, width: value.boundary.width };
  if (!polylineGeometryIsValid(boundary)) return null;
  const readOverride = (candidate: unknown, kind: AssemblyKind) => candidate === null ? null : readLayeredAssembly(candidate, kind);
  const floorStructureOverride = readOverride(value.floorStructureOverride, "floor-structure");
  const floorFinishOverride = readOverride(value.floorFinishOverride, "floor-finish");
  const ceilingStructureOverride = readOverride(value.ceilingStructureOverride, "ceiling-structure");
  const ceilingFinishOverride = readOverride(value.ceilingFinishOverride, "ceiling-finish");
  if ((value.floorStructureOverride !== null && !floorStructureOverride) || (value.floorFinishOverride !== null && !floorFinishOverride) || (value.ceilingStructureOverride !== null && !ceilingStructureOverride) || (value.ceilingFinishOverride !== null && !ceilingFinishOverride)) return null;
  const platformOpenings = supportsPlatformOpenings
    ? Array.isArray(value.platformOpenings) && value.platformOpenings.length <= MAXIMUM_PLATFORM_OPENING_COUNT
      ? value.platformOpenings.map((opening) => readPlatformOpening(opening, supportsVerticalOpeningContinuity))
      : null
    : [];
  if (!platformOpenings || platformOpenings.some((opening) => opening === null)) return null;
  return {
    boundary,
    boundaryWallIds: value.boundaryWallIds as string[],
    ceilingFinishOverride,
    ceilingStructureOverride,
    floorFinishOverride,
    floorStructureOverride,
    id: value.id,
    layerId: supportsPresentation ? value.layerId as string : STANDARD_LAYER_IDS.room,
    name: value.name.trim(),
    platformOpenings: platformOpenings as PlatformOpening[],
    roughCeilingHeightOverride: value.roughCeilingHeightOverride as number | null,
    roughFloorOffset: value.roughFloorOffset,
    roomType: supportsPresentation ? (value.roomType as string).trim() : value.name.trim() === "Unassigned" ? "Unassigned" : value.name.trim(),
    storyId: value.storyId,
  };
}

function readRoomAnnotation(value: unknown): RoomAnnotationObject | null {
  if (!isRecord(value) || !isRecord(value.position) || typeof value.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/.test(value.id) || typeof value.kind !== "string" || !ROOM_ANNOTATION_KINDS.includes(value.kind as RoomAnnotationObject["kind"]) || typeof value.layerId !== "string" || typeof value.roomId !== "string" || typeof value.storyId !== "string" || typeof value.visible !== "boolean" || !isFiniteNumber(value.position.x) || !isFiniteNumber(value.position.y)) return null;
  return { id: value.id, kind: value.kind as RoomAnnotationObject["kind"], layerId: value.layerId, position: { x: value.position.x, y: value.position.y }, roomId: value.roomId, storyId: value.storyId, visible: value.visible };
}

function readLayerSetState(value: unknown): LayerSetState | null {
  const parsed = readLayer({ ...(isRecord(value) ? value : {}), name: "Layer Set State" }, true);
  return parsed ? { color: parsed.color, id: parsed.id, lineStyle: parsed.lineStyle, lineWeight: parsed.lineWeight, locked: parsed.locked, printColor: parsed.printColor, visible: parsed.visible } : null;
}

function readLayerSet(value: unknown): LayerSet | null {
  if (!isRecord(value) || typeof value.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.id) || typeof value.name !== "string" || !value.name.trim() || value.name.trim().length > 80 || !Array.isArray(value.layers)) return null;
  const layers = value.layers.map(readLayerSetState);
  return layers.some((layer) => layer === null) ? null : { id: value.id, layers: layers as LayerSetState[], name: value.name.trim() };
}

function readSavedPlanView(value: unknown): SavedPlanView | null {
  if (!isRecord(value) || typeof value.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.id) || typeof value.name !== "string" || !value.name.trim() || value.name.trim().length > 80 || typeof value.activeLayerId !== "string" || typeof value.layerSetId !== "string" || typeof value.storyId !== "string" || !(value.referenceStoryId === null || typeof value.referenceStoryId === "string") || !isFiniteNumber(value.annotationScale) || value.annotationScale < 1 || value.annotationScale > 1200 || !["front", "perspective", "right", "top"].includes(String(value.viewMode))) return null;
  return { activeLayerId: value.activeLayerId, annotationScale: value.annotationScale, id: value.id, layerSetId: value.layerSetId, name: value.name.trim(), referenceStoryId: value.referenceStoryId as string | null, storyId: value.storyId, viewMode: value.viewMode as SavedPlanView["viewMode"] };
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
    activeLayerSetId: document.activeLayerSetId,
    activeLayerId: document.activeLayerId,
    activeSavedPlanViewId: document.activeSavedPlanViewId,
    arcs: cloneDocument(document).arcs,
    building: cloneBuildingStructure(document.building),
    circles: cloneDocument(document).circles,
    createdAt,
    format: PROJECT_FILE_FORMAT,
    groups: cloneDocument(document).groups,
    layers: cloneDocument(document).layers,
    layerSets: cloneDocument(document).layerSets,
    lines: cloneDocument(document).lines,
    name: name.trim() || "Untitled Model",
    objects: cloneDocument(document).objects,
    polylines: cloneDocument(document).polylines,
    rooms: cloneDocument(document).rooms,
    roomAnnotations: cloneDocument(document).roomAnnotations,
    savedPlanViews: cloneDocument(document).savedPlanViews,
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
    const parsedBuilding = readBuildingStructure(value.building, version >= 15, version >= 16, version >= 17, version >= 19, version >= 22 ? 2 : version >= 21 ? 1 : 0, version >= 26, version >= 27, version >= 30, version >= 31, version >= 32, version >= 33, version >= 34, version >= 35, version >= 36, version >= 39, version >= 40, version >= 41, version >= 42);
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
    const parsedLayers = value.layers.map((layer) => readLayer(layer, version >= 43));
    if (parsedLayers.some((layer) => layer === null)) {
      return { ok: false, error: "One or more project layers are invalid." };
    }
    layers = version >= 43 ? parsedLayers as ModelLayer[] : mergeStandardLayers(parsedLayers as ModelLayer[]).map((layer) => {
      const standard = STANDARD_LAYERS.find((candidate) => candidate.id === layer.id);
      return standard ? { ...layer, lineStyle: standard.lineStyle, lineWeight: standard.lineWeight, printColor: layer.color } : layer;
    });
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
    layers = mergeStandardLayers([{ ...DEFAULT_LAYER }]);
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
    readBoxObject(object, version >= 3 ? null : DEFAULT_LAYER_ID, version >= 4, version >= 5, version >= 14, fallbackStoryId, version >= 42),
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
  const productObjectTypeIds = new Set(building.productObjectTypes.map((type) => type.id));
  if (validObjects.some((object) => object.productObjectTypeId !== null && !productObjectTypeIds.has(object.productObjectTypeId))) {
    return { ok: false, error: "One or more objects reference a missing product Type." };
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
    const parsedLines = value.lines.map((line) => readLineObject(line, version >= 8, version >= 14, fallbackStoryId, version >= 15, version >= 18, version >= 20, version >= 23, version >= 27, version >= 28, version >= 30, version >= 35, version >= 37, version >= 43, building));
    if (parsedLines.some((line) => line === null)) {
      return { ok: false, error: "One or more drawing lines are invalid." };
    }
    lines = (parsedLines as LineObject[]).map((line) => version >= 43 ? line : {
      ...line,
      layerId: line.architecturalRole === "wall" ? STANDARD_LAYER_IDS.wall : line.architecturalRole === "foundation-wall" ? STANDARD_LAYER_IDS["foundation-wall"] : line.layerId,
    });
    if (new Set(lines.map((line) => line.id)).size !== lines.length ||
        new Set(lines.map((line) => line.name.toLowerCase())).size !== lines.length) {
      return { ok: false, error: "Drawing line identifiers and names must be unique." };
    }
    if (lines.some((line) => !layerIds.has(line.layerId))) {
      return { ok: false, error: "One or more drawing lines reference a missing layer." };
    }
    if (lines.some((line) => line.wallOpenings.some((opening) => !layerIds.has(opening.layerId)))) return { ok: false, error: "One or more Doors or Windows reference a missing layer." };
    if (lines.some((line) => !storyIds.has(line.storyId))) return { ok: false, error: "One or more drawing lines reference a missing Story." };
    const wallTypeIds = new Set(building.wallTypes.map((wallType) => wallType.id));
    if (lines.some((line) => line.wallTypeId !== null && !wallTypeIds.has(line.wallTypeId))) return { ok: false, error: "One or more Walls reference a missing Wall Type." };
    const foundationWallTypeIds = new Set(building.foundationWallTypes.map((type) => type.id));
    if (lines.some((line) => line.foundationWallTypeId !== null && !foundationWallTypeIds.has(line.foundationWallTypeId))) return { ok: false, error: "One or more Foundation Walls reference a missing Foundation Wall Type." };
    const openingTypeIds = new Set(building.openingTypes.map((type) => type.id));
    if (lines.some((line) => line.wallOpenings.some((opening) => opening.wallOpeningTypeId !== null && !openingTypeIds.has(opening.wallOpeningTypeId)))) return { ok: false, error: "One or more Wall openings reference a missing Door or Window Type." };
    const headerTypeIds = new Set(building.headerTypes.map((type) => type.id));
    if (lines.some((line) => line.wallOpenings.some((opening) => opening.headerTypeIdOverride !== null && !headerTypeIds.has(opening.headerTypeIdOverride)))) return { ok: false, error: "One or more Wall openings reference a missing header assembly override." };
    const openingTypesById = new Map(building.openingTypes.map((type) => [type.id, type]));
    if (lines.some((line) => line.wallOpenings.some((opening) => {
      if (opening.wallOpeningTypeId === null) return opening.componentOverrides.length > 0;
      const type = openingTypesById.get(opening.wallOpeningTypeId);
      return !type || resolveOpeningComponents(type, opening.componentOverrides) === null;
    }))) return { ok: false, error: "One or more Wall openings contain invalid 3D component overrides." };
    if (lines.some((line) => line.wallOpenings.some((opening) => {
      if (opening.wallOpeningTypeId === null) return false;
      const type = openingTypesById.get(opening.wallOpeningTypeId);
      return !type || type.kind !== opening.kind || type.unitWidth !== opening.unitWidth || type.unitHeight !== opening.unitHeight || type.roughWidth !== opening.roughWidth || type.roughHeight !== opening.roughHeight;
    }))) return { ok: false, error: "One or more Wall openings do not match their Door or Window Type." };
    const foundationWallsById = new Map(lines.filter((line) => line.architecturalRole === "foundation-wall").map((line) => [line.id, line]));
    if (lines.some((line) => {
      if (line.foundationSupportWallId === null) return false;
      const support = foundationWallsById.get(line.foundationSupportWallId);
      return line.architecturalRole !== "wall" || !support || support.storyId !== line.storyId;
    })) return { ok: false, error: "One or more framed Walls reference an invalid Foundation Wall support." };
    const storiesById = new Map(building.stories.map((story) => [story.id, story]));
    if (lines.some((line) => !wallOpeningsAreValid(line, storiesById.get(line.storyId)?.roughCeilingHeight ?? 0))) {
      return { ok: false, error: "One or more Wall openings are invalid." };
    }
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
    polylines = (parsedPolylines as PolylineObject[]).map((polyline) => version >= 43 || polyline.architecturalRole !== "floor-platform" ? polyline : { ...polyline, layerId: STANDARD_LAYER_IDS["floor-platform"] });
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
  let rooms: RoomObject[] = [];
  if (version >= 24) {
    if (!Array.isArray(value.rooms) || value.rooms.length > MAXIMUM_ROOM_COUNT) return { ok: false, error: "The project Room collection is missing or invalid." };
    const parsedRooms = value.rooms.map((room) => readRoomObject(room, version >= 25, version >= 29, version >= 43));
    if (parsedRooms.some((room) => room === null)) return { ok: false, error: "One or more Rooms are invalid." };
    rooms = parsedRooms as RoomObject[];
  }

  let layerSets: LayerSet[];
  let activeLayerSetId: string;
  let savedPlanViews: SavedPlanView[];
  let activeSavedPlanViewId: string;
  let roomAnnotations: RoomAnnotationObject[];
  if (version >= 43) {
    if (!Array.isArray(value.layerSets) || value.layerSets.length < 1 || value.layerSets.length > 32 || typeof value.activeLayerSetId !== "string" || !Array.isArray(value.savedPlanViews) || value.savedPlanViews.length < 1 || value.savedPlanViews.length > 64 || typeof value.activeSavedPlanViewId !== "string" || !Array.isArray(value.roomAnnotations) || value.roomAnnotations.length > MAXIMUM_ROOM_COUNT * ROOM_ANNOTATION_KINDS.length) return { ok: false, error: "The project Layer Set, Saved View, or Room annotation configuration is missing or invalid." };
    const parsedSets = value.layerSets.map(readLayerSet);
    const parsedViews = value.savedPlanViews.map(readSavedPlanView);
    const parsedAnnotations = value.roomAnnotations.map(readRoomAnnotation);
    if (parsedSets.some((set) => set === null) || parsedViews.some((view) => view === null) || parsedAnnotations.some((annotation) => annotation === null)) return { ok: false, error: "One or more Layer Sets, Saved Views, or Room annotations are invalid." };
    layerSets = parsedSets as LayerSet[];
    savedPlanViews = parsedViews as SavedPlanView[];
    roomAnnotations = parsedAnnotations as RoomAnnotationObject[];
    activeLayerSetId = value.activeLayerSetId;
    activeSavedPlanViewId = value.activeSavedPlanViewId;
  } else {
    layerSets = [createDefaultLayerSet(layers)];
    activeLayerSetId = DEFAULT_LAYER_SET_ID;
    savedPlanViews = [createDefaultSavedPlanView(building.activeStoryId)];
    activeSavedPlanViewId = DEFAULT_SAVED_PLAN_VIEW_ID;
    roomAnnotations = rooms.flatMap((room) => {
      const center = polylineCentroid(room.boundary) ?? room.boundary.vertices[0] ?? { x: 0, y: 0 };
      return ROOM_ANNOTATION_KINDS.map((kind) => ({ id: `${room.id}-${kind}`, kind, layerId: kind === "label" ? STANDARD_LAYER_IDS["room-label"] : kind === "area" ? STANDARD_LAYER_IDS["room-area"] : kind === "interior-dimensions" ? STANDARD_LAYER_IDS["room-interior-dimensions"] : STANDARD_LAYER_IDS["room-ceiling-height"], position: { ...center }, roomId: room.id, storyId: room.storyId, visible: true }));
    });
  }
  const roomDocument: ModelDocument = { activeLayerSetId, activeLayerId, activeSavedPlanViewId, arcs, building, circles, groups, layers, layerSets, lines, objects: validObjects, polylines, rooms, roomAnnotations, savedPlanViews };
  if (new Set(layerSets.map((set) => set.id)).size !== layerSets.length || !layerSets.some((set) => set.id === activeLayerSetId) || layerSets.some((set) => set.layers.length !== layers.length || new Set(set.layers.map((layer) => layer.id)).size !== layers.length || set.layers.some((layer) => !layerIds.has(layer.id)))) return { ok: false, error: "Layer Set identities or layer references are invalid." };
  if (new Set(savedPlanViews.map((view) => view.id)).size !== savedPlanViews.length || !savedPlanViews.some((view) => view.id === activeSavedPlanViewId) || savedPlanViews.some((view) => !layerSets.some((set) => set.id === view.layerSetId) || !layerIds.has(view.activeLayerId) || !storyIds.has(view.storyId) || view.referenceStoryId !== null && !storyIds.has(view.referenceStoryId))) return { ok: false, error: "Saved Plan View identities or references are invalid." };
  if (version >= 24) {
    if (new Set(rooms.map((room) => room.id)).size !== rooms.length || rooms.some((room) => !roomObjectIsValid(room, roomDocument))) return { ok: false, error: "One or more Rooms reference invalid Stories, Walls, or settings." };
    const annotationKeys = roomAnnotations.map((annotation) => `${annotation.roomId}:${annotation.kind}`);
    if (new Set(roomAnnotations.map((annotation) => annotation.id)).size !== roomAnnotations.length || new Set(annotationKeys).size !== annotationKeys.length || roomAnnotations.some((annotation) => !roomAnnotationIsValid(annotation, roomDocument)) || rooms.some((room) => ROOM_ANNOTATION_KINDS.some((kind) => !annotationKeys.includes(`${room.id}:${kind}`)))) return { ok: false, error: "One or more Room annotations reference invalid Rooms, Stories, or layers." };
    if (!platformOpeningContinuityIsValid(roomDocument)) return { ok: false, error: "One or more vertical platform-opening paths are invalid or discontinuous." };
  }
  const allEntityIds = [...validObjects.map((object) => object.id), ...lines.map((line) => line.id), ...polylines.map((polyline) => polyline.id), ...circles.map((circle) => circle.id), ...arcs.map((arc) => arc.id)];
  const allEntityNames = [...validObjects.map((object) => object.name.toLowerCase()), ...lines.map((line) => line.name.toLowerCase()), ...polylines.map((polyline) => polyline.name.toLowerCase()), ...circles.map((circle) => circle.name.toLowerCase()), ...arcs.map((arc) => arc.name.toLowerCase())];
  if (new Set(allEntityIds).size !== allEntityIds.length || new Set(allEntityNames).size !== allEntityNames.length) return { ok: false, error: "Project entity identifiers and names must be unique." };

  return {
    ok: true,
    project: createProjectDocument({
      createdAt: value.createdAt,
      document: roomDocument,
      name: value.name,
      updatedAt: value.updatedAt,
    }),
  };
}

export function projectToDocument(project: ModelBuilderProject): ModelDocument {
  return {
    activeLayerSetId: project.activeLayerSetId,
    activeLayerId: project.activeLayerId,
    activeSavedPlanViewId: project.activeSavedPlanViewId,
    arcs: project.arcs.map(cloneArcObject),
    building: cloneBuildingStructure(project.building),
    circles: project.circles.map(cloneCircleObject),
    groups: project.groups.map(cloneGroup),
    layers: project.layers.map(cloneLayer),
    layerSets: project.layerSets.map(cloneLayerSet),
    lines: project.lines.map(cloneLineObject),
    objects: project.objects.map(cloneBoxObject),
    polylines: project.polylines.map(clonePolylineObject),
    rooms: project.rooms.map(cloneRoomObject),
    roomAnnotations: project.roomAnnotations.map(cloneRoomAnnotation),
    savedPlanViews: project.savedPlanViews.map(cloneSavedPlanView),
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
