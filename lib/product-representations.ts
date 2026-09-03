import type { ProductAssetReference, ProductAssetRole, WallOpeningType } from "./building-stories.ts";

export type ProductRepresentationView = "elevation" | "model-3d" | "plan";

export type ProductRepresentationTarget = {
  id: string;
  projection: "orthographic" | "perspective";
};

const STORED_PRODUCT_ASSET_PATH = /^\/api\/product-assets\/asset-[a-f0-9-]{36}$/;

export function productRepresentationViewForTarget(target: ProductRepresentationTarget): ProductRepresentationView {
  if (target.id === "top" || target.id === "bottom") return "plan";
  return target.projection === "perspective" ? "model-3d" : "elevation";
}

export function productRepresentationRoleForView(view: ProductRepresentationView): ProductAssetRole {
  if (view === "plan") return "plan-symbol";
  if (view === "elevation") return "elevation-symbol";
  return "model-3d";
}

export function productAssetCanRenderInView(asset: ProductAssetReference, view: ProductRepresentationView): boolean {
  if (asset.usage !== "preferred" || asset.role !== productRepresentationRoleForView(view)) return false;
  if (!STORED_PRODUCT_ASSET_PATH.test(asset.sourceUrl)) return false;
  return view === "model-3d" ? asset.format === "glb" : asset.format === "svg";
}

export function preferredProductAssetForView(
  openingType: WallOpeningType,
  target: ProductRepresentationTarget,
): ProductAssetReference | null {
  const view = productRepresentationViewForTarget(target);
  return openingType.productAssets.find((asset) => productAssetCanRenderInView(asset, view)) ?? null;
}
