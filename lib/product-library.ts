import type {
  BuildingStructure,
  ProductAssetFormat,
  ProductAssetReference,
  ProductAssetRole,
  ProductObjectCategory,
  WallOpeningKind,
} from "./building-stories.ts";

export type ProductLibraryCategory = WallOpeningKind | "object";
export type ProductLibraryTarget = { kind: "opening"; typeId: string } | { kind: "object"; typeId: string };

export type ProductLibraryRepresentation = {
  format: ProductAssetFormat | "native";
  id: string;
  label: string;
  role: ProductAssetRole;
  source: "generated" | "manufacturer-reference";
};

export type ProductLibraryEntry = {
  assets: ProductAssetReference[];
  category: ProductLibraryCategory;
  dimensions: { height: number; length: number; width: number };
  id: string;
  isActive: boolean;
  manufacturer: string;
  modelNumber: string;
  name: string;
  objectCategory: ProductObjectCategory | null;
  productLine: string;
  representations: ProductLibraryRepresentation[];
  revision: string;
  target: ProductLibraryTarget;
};

function representations(typeId: string, assets: ProductAssetReference[]): ProductLibraryRepresentation[] {
  return [
    { format: "native", id: `${typeId}-generated-plan`, label: "Generated Plan", role: "plan-symbol", source: "generated" },
    { format: "native", id: `${typeId}-generated-elevation`, label: "Generated Elevation", role: "elevation-symbol", source: "generated" },
    { format: "native", id: `${typeId}-generated-model`, label: "Parametric 3D", role: "model-3d", source: "generated" },
    ...assets.map((asset) => ({ format: asset.format, id: asset.id, label: asset.name, role: asset.role, source: "manufacturer-reference" as const })),
  ];
}

export function createProjectProductLibrary(building: BuildingStructure): ProductLibraryEntry[] {
  const openings = building.openingTypes.map((type): ProductLibraryEntry => ({
    assets: type.productAssets,
    category: type.kind,
    dimensions: { height: type.unitHeight, length: type.unitWidth, width: type.roughWidth },
    id: `opening-product-${type.id}`,
    isActive: type.id === (type.kind === "door" ? building.activeDoorTypeId : building.activeWindowTypeId),
    manufacturer: type.productSource?.manufacturer ?? "Model Builder",
    modelNumber: type.productSource?.modelNumber ?? "Generic",
    name: type.name,
    objectCategory: null,
    productLine: type.productSource?.productLine ?? "Native Components",
    representations: representations(type.id, type.productAssets),
    revision: type.productSource?.revision ?? "Project-defined",
    target: { kind: "opening", typeId: type.id },
  }));
  const objects = building.productObjectTypes.map((type): ProductLibraryEntry => ({
    assets: type.productAssets,
    category: "object",
    dimensions: { ...type.dimensions },
    id: `object-product-${type.id}`,
    isActive: false,
    manufacturer: type.productSource?.manufacturer ?? "Model Builder",
    modelNumber: type.productSource?.modelNumber ?? "Generic",
    name: type.name,
    objectCategory: type.category,
    productLine: type.productSource?.productLine ?? "Native Object",
    representations: representations(type.id, type.productAssets),
    revision: type.productSource?.revision ?? "Project-defined",
    target: { kind: "object", typeId: type.id },
  }));
  return [...openings, ...objects];
}

export function filterProjectProductLibrary(entries: ProductLibraryEntry[], query: string, category: "all" | ProductLibraryCategory): ProductLibraryEntry[] {
  const normalized = query.trim().toLocaleLowerCase();
  return entries.filter((entry) => (category === "all" || entry.category === category) && (!normalized || [
    entry.name,
    entry.manufacturer,
    entry.modelNumber,
    entry.productLine,
    entry.revision,
    entry.objectCategory ?? "",
  ].some((value) => value.toLocaleLowerCase().includes(normalized))));
}
