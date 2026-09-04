import type { AssemblyLayerRole } from "./building-stories.ts";

export const MATERIAL_CATEGORIES = [
  "concrete-masonry",
  "wood-framing",
  "sheet-goods",
  "finishes",
  "insulation",
  "membranes",
  "metals",
  "glass",
] as const;

export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];
export type MaterialPlanPattern = "crosshatch" | "diagonal" | "dots" | "insulation" | "none" | "solid" | "wood";

export type ArchitecturalMaterialDefinition = {
  category: MaterialCategory;
  compatibleRoles: readonly AssemblyLayerRole[];
  model: {
    color: string;
    metalness: number;
    roughness: number;
    /** Reserved for a validated project or manufacturer texture asset. */
    textureAssetId: string | null;
  };
  name: string;
  plan: {
    color: string;
    pattern: MaterialPlanPattern;
  };
};

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  "concrete-masonry": "Concrete & Masonry",
  "wood-framing": "Wood & Framing",
  "sheet-goods": "Sheathing & Substrates",
  finishes: "Finish Materials",
  insulation: "Insulation",
  membranes: "Membranes & Barriers",
  metals: "Metals",
  glass: "Glass",
};

const ALL_STRUCTURAL_ROLES = ["framing", "structure"] as const;
const FINISH_ROLES = ["finish", "substrate"] as const;

/**
 * Initial program catalog. Assemblies keep material names for backward-compatible
 * project files; these records provide controlled choices and future rendering data.
 */
export const ARCHITECTURAL_MATERIALS: readonly ArchitecturalMaterialDefinition[] = [
  { category: "concrete-masonry", compatibleRoles: ["structure", "substrate"], model: { color: "#a9ada9", metalness: 0, roughness: 0.92, textureAssetId: null }, name: "Concrete", plan: { color: "#c4c7c3", pattern: "crosshatch" } },
  { category: "concrete-masonry", compatibleRoles: ["finish", "structure"], model: { color: "#9f5f49", metalness: 0, roughness: 0.9, textureAssetId: null }, name: "Brick Veneer", plan: { color: "#b97760", pattern: "crosshatch" } },
  { category: "concrete-masonry", compatibleRoles: ["finish", "structure"], model: { color: "#8f918a", metalness: 0, roughness: 0.95, textureAssetId: null }, name: "Stone Veneer", plan: { color: "#aaa99f", pattern: "crosshatch" } },
  { category: "wood-framing", compatibleRoles: ALL_STRUCTURAL_ROLES, model: { color: "#cda56f", metalness: 0, roughness: 0.8, textureAssetId: null }, name: "Lumber", plan: { color: "#dec49a", pattern: "wood" } },
  { category: "wood-framing", compatibleRoles: ALL_STRUCTURAL_ROLES, model: { color: "#c29862", metalness: 0, roughness: 0.82, textureAssetId: null }, name: "Engineered Wood", plan: { color: "#d7bb8d", pattern: "wood" } },
  { category: "wood-framing", compatibleRoles: ALL_STRUCTURAL_ROLES, model: { color: "#b98b55", metalness: 0, roughness: 0.78, textureAssetId: null }, name: "LVL", plan: { color: "#ccaa77", pattern: "wood" } },
  { category: "sheet-goods", compatibleRoles: ["sheathing", "substrate"], model: { color: "#b98b63", metalness: 0, roughness: 0.86, textureAssetId: null }, name: "OSB", plan: { color: "#caa986", pattern: "dots" } },
  { category: "sheet-goods", compatibleRoles: ["sheathing", "substrate", "structure"], model: { color: "#d1b78a", metalness: 0, roughness: 0.82, textureAssetId: null }, name: "Plywood", plan: { color: "#dac6a3", pattern: "wood" } },
  { category: "sheet-goods", compatibleRoles: ["sheathing", "substrate"], model: { color: "#b8b7ac", metalness: 0, roughness: 0.9, textureAssetId: null }, name: "Cement Board", plan: { color: "#cdccc4", pattern: "dots" } },
  { category: "finishes", compatibleRoles: FINISH_ROLES, model: { color: "#d9d4c8", metalness: 0, roughness: 0.74, textureAssetId: null }, name: "Gypsum Board", plan: { color: "#e5e1d8", pattern: "solid" } },
  { category: "finishes", compatibleRoles: ["finish"], model: { color: "#b7b3aa", metalness: 0, roughness: 0.78, textureAssetId: null }, name: "Exterior Cladding", plan: { color: "#c9c5bc", pattern: "diagonal" } },
  { category: "finishes", compatibleRoles: ["finish"], model: { color: "#b5b8b4", metalness: 0, roughness: 0.82, textureAssetId: null }, name: "Fiber Cement Siding", plan: { color: "#cdd0cc", pattern: "diagonal" } },
  { category: "finishes", compatibleRoles: ["finish"], model: { color: "#ddd9cc", metalness: 0, roughness: 0.7, textureAssetId: null }, name: "Vinyl Siding", plan: { color: "#e5e2d9", pattern: "diagonal" } },
  { category: "finishes", compatibleRoles: ["finish"], model: { color: "#d3cbbb", metalness: 0, roughness: 0.92, textureAssetId: null }, name: "Stucco", plan: { color: "#ddd6c8", pattern: "dots" } },
  { category: "finishes", compatibleRoles: ["finish"], model: { color: "#4d5357", metalness: 0, roughness: 0.94, textureAssetId: null }, name: "Asphalt Shingles", plan: { color: "#70777b", pattern: "diagonal" } },
  { category: "finishes", compatibleRoles: ["finish"], model: { color: "#a7774f", metalness: 0, roughness: 0.72, textureAssetId: null }, name: "Hardwood", plan: { color: "#c49b73", pattern: "wood" } },
  { category: "finishes", compatibleRoles: ["finish"], model: { color: "#c9c5b8", metalness: 0, roughness: 0.68, textureAssetId: null }, name: "Ceramic Tile", plan: { color: "#d8d4c9", pattern: "crosshatch" } },
  { category: "finishes", compatibleRoles: ["finish"], model: { color: "#aaa9a2", metalness: 0, roughness: 0.96, textureAssetId: null }, name: "Carpet", plan: { color: "#c6c5bf", pattern: "dots" } },
  { category: "insulation", compatibleRoles: ["insulation"], model: { color: "#d8b86c", metalness: 0, roughness: 0.95, textureAssetId: null }, name: "Fiberglass Batt", plan: { color: "#e8cf91", pattern: "insulation" } },
  { category: "insulation", compatibleRoles: ["insulation"], model: { color: "#9ca58f", metalness: 0, roughness: 0.96, textureAssetId: null }, name: "Mineral Wool", plan: { color: "#bcc3af", pattern: "insulation" } },
  { category: "insulation", compatibleRoles: ["insulation"], model: { color: "#8fb5c3", metalness: 0, roughness: 0.76, textureAssetId: null }, name: "Rigid Insulation", plan: { color: "#b5d0da", pattern: "diagonal" } },
  { category: "insulation", compatibleRoles: ["insulation"], model: { color: "#d6cfab", metalness: 0, roughness: 0.9, textureAssetId: null }, name: "Spray Foam", plan: { color: "#e3ddc0", pattern: "insulation" } },
  { category: "membranes", compatibleRoles: ["membrane"], model: { color: "#787f83", metalness: 0, roughness: 0.55, textureAssetId: null }, name: "Vapor Retarder", plan: { color: "#8d9599", pattern: "solid" } },
  { category: "membranes", compatibleRoles: ["membrane"], model: { color: "#578ca0", metalness: 0, roughness: 0.6, textureAssetId: null }, name: "Air/Water Barrier", plan: { color: "#75a9ba", pattern: "solid" } },
  { category: "membranes", compatibleRoles: ["membrane"], model: { color: "#4f565a", metalness: 0, roughness: 0.78, textureAssetId: null }, name: "Roofing Underlayment", plan: { color: "#70777a", pattern: "solid" } },
  { category: "metals", compatibleRoles: ["framing", "sheathing", "structure"], model: { color: "#7d858c", metalness: 0.72, roughness: 0.36, textureAssetId: null }, name: "Structural Steel", plan: { color: "#9aa1a6", pattern: "diagonal" } },
  { category: "metals", compatibleRoles: ["framing"], model: { color: "#9ca4a8", metalness: 0.6, roughness: 0.42, textureAssetId: null }, name: "Cold-Formed Steel", plan: { color: "#b2b9bc", pattern: "diagonal" } },
  { category: "glass", compatibleRoles: ["finish"], model: { color: "#8fbfc8", metalness: 0.05, roughness: 0.18, textureAssetId: null }, name: "Glass", plan: { color: "#b4d8df", pattern: "none" } },
  { category: "glass", compatibleRoles: ["finish"], model: { color: "#83b6c1", metalness: 0.05, roughness: 0.16, textureAssetId: null }, name: "Insulated Glass", plan: { color: "#abd1d9", pattern: "none" } },
  { category: "finishes", compatibleRoles: ["air-gap"], model: { color: "#e5e8e8", metalness: 0, roughness: 1, textureAssetId: null }, name: "Air Gap", plan: { color: "#ffffff", pattern: "none" } },
] as const;

export function architecturalMaterialByName(name: string): ArchitecturalMaterialDefinition | null {
  const normalized = name.trim().toLocaleLowerCase();
  return ARCHITECTURAL_MATERIALS.find((material) => material.name.toLocaleLowerCase() === normalized) ?? null;
}

export function architecturalMaterialsForRole(role: AssemblyLayerRole): readonly ArchitecturalMaterialDefinition[] {
  return ARCHITECTURAL_MATERIALS.filter((material) => material.compatibleRoles.includes(role));
}
