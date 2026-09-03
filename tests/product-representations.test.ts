import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultBuildingStructure } from "../lib/building-stories.ts";
import {
  preferredProductAssetForView,
  productAssetCanRenderInView,
  productRepresentationViewForTarget,
} from "../lib/product-representations.ts";

const building = createDefaultBuildingStructure();
const openingType = building.openingTypes[0];
const storedAsset = {
  alignment: {
    offsetX: 0, offsetY: 0, offsetZ: 0, origin: "bounds-center" as const,
    rotationX: 0, rotationY: 0, rotationZ: 0, scaleMultiplier: 1, sourceUnits: "fit-to-unit" as const,
  },
  byteLength: 120,
  checksumSha256: "a".repeat(64),
  fileName: "window-plan.svg",
  format: "svg" as const,
  id: "asset-00000000-0000-4000-8000-000000000001",
  name: "Window plan",
  role: "plan-symbol" as const,
  sourceUrl: "/api/product-assets/asset-00000000-0000-4000-8000-000000000001",
  usage: "preferred" as const,
};

test("maps plan, elevation, and perspective targets to product representation views", () => {
  assert.equal(productRepresentationViewForTarget({ id: "top", projection: "orthographic" }), "plan");
  assert.equal(productRepresentationViewForTarget({ id: "front", projection: "orthographic" }), "elevation");
  assert.equal(productRepresentationViewForTarget({ id: "orbit", projection: "perspective" }), "model-3d");
});

test("renders only preferred, compatible assets from validated project storage", () => {
  assert.equal(productAssetCanRenderInView(storedAsset, "plan"), true);
  assert.equal(productAssetCanRenderInView({ ...storedAsset, usage: "reference" }, "plan"), false);
  assert.equal(productAssetCanRenderInView({ ...storedAsset, sourceUrl: "https://example.test/window.svg" }, "plan"), false);
  assert.equal(productAssetCanRenderInView({ ...storedAsset, format: "glb" }, "plan"), false);
});

test("selects the view-specific preferred asset without making it required", () => {
  const type = { ...openingType, productAssets: [storedAsset] };
  assert.equal(preferredProductAssetForView(type, { id: "top", projection: "orthographic" })?.id, storedAsset.id);
  assert.equal(preferredProductAssetForView(type, { id: "front", projection: "orthographic" }), null);
  assert.equal(preferredProductAssetForView(openingType, { id: "top", projection: "orthographic" }), null);
});
