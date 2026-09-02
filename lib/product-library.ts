import type {
  BuildingStructure,
  ProductAssetFormat,
  ProductAssetRole,
  WallOpeningKind,
} from "./building-stories.ts";

export type ProductLibraryRepresentation = {
  format: ProductAssetFormat | "native";
  id: string;
  label: string;
  role: ProductAssetRole;
  source: "generated" | "manufacturer-reference";
};

export type ProductLibraryEntry = {
  category: WallOpeningKind;
  id: string;
  isActive: boolean;
  manufacturer: string;
  modelNumber: string;
  name: string;
  openingTypeId: string;
  productLine: string;
  representations: ProductLibraryRepresentation[];
  revision: string;
};

export function createProjectProductLibrary(building: BuildingStructure): ProductLibraryEntry[] {
  return building.openingTypes.map((openingType) => ({
    category: openingType.kind,
    id: `opening-product-${openingType.id}`,
    isActive: openingType.id === (openingType.kind === "door" ? building.activeDoorTypeId : building.activeWindowTypeId),
    manufacturer: openingType.productSource?.manufacturer ?? "Model Builder",
    modelNumber: openingType.productSource?.modelNumber ?? "Generic",
    name: openingType.name,
    openingTypeId: openingType.id,
    productLine: openingType.productSource?.productLine ?? "Native Components",
    representations: [
      { format: "native", id: `${openingType.id}-generated-plan`, label: "Generated Plan", role: "plan-symbol", source: "generated" },
      { format: "native", id: `${openingType.id}-generated-elevation`, label: "Generated Elevation", role: "elevation-symbol", source: "generated" },
      { format: "native", id: `${openingType.id}-generated-model`, label: "Parametric 3D", role: "model-3d", source: "generated" },
      ...openingType.productAssets.map((asset) => ({
        format: asset.format,
        id: asset.id,
        label: asset.name,
        role: asset.role,
        source: "manufacturer-reference" as const,
      })),
    ],
    revision: openingType.productSource?.revision ?? "Project-defined",
  }));
}

export function filterProjectProductLibrary(entries: ProductLibraryEntry[], query: string, category: "all" | WallOpeningKind): ProductLibraryEntry[] {
  const normalized = query.trim().toLocaleLowerCase();
  return entries.filter((entry) => (category === "all" || entry.category === category) && (!normalized || [
    entry.name,
    entry.manufacturer,
    entry.modelNumber,
    entry.productLine,
    entry.revision,
  ].some((value) => value.toLocaleLowerCase().includes(normalized))));
}
