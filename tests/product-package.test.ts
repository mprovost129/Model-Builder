import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultBuildingStructure, type ManufacturerProductSource } from "../lib/building-stories.ts";
import {
  PRODUCT_PACKAGE_FORMAT,
  PRODUCT_PACKAGE_VERSION,
  parseProductPackage,
  serializeProductPackage,
} from "../lib/product-package.ts";

const source: ManufacturerProductSource = {
  manufacturer: "Example Window Co.",
  modelNumber: "DH-3040",
  productLine: "Heritage",
  revision: "2026-08",
  sourceFileName: "heritage-dh-3040.dwg",
  sourceFormat: "dwg",
  sourceUrl: "https://example.test/products/dh-3040",
  verifiedAt: "2026-09-02T12:00:00.000Z",
};

test("round-trips a native manufacturer product package", () => {
  const windowType = createDefaultBuildingStructure().openingTypes.find((type) => type.kind === "window")!;
  windowType.headerTypeId = "header-type-01";
  windowType.productAssets = [{
    byteLength: 24_576,
    checksumSha256: "a".repeat(64),
    fileName: "heritage-dh-3040.glb",
    format: "glb",
    id: "asset-dh-3040-model",
    name: "Manufacturer 3D Model",
    role: "model-3d",
    sourceUrl: "https://example.test/products/dh-3040.glb",
  }];
  const parsed = parseProductPackage(serializeProductPackage(windowType, source));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.product.manufacturer, source.manufacturer);
  assert.equal(parsed.openingType.productSource?.modelNumber, source.modelNumber);
  assert.equal(parsed.openingType.headerTypeId, null);
  assert.equal(parsed.openingType.components.length, windowType.components.length);
  assert.deepEqual(parsed.openingType.productAssets, windowType.productAssets);
});

test("opens version-1 product packages without an asset manifest", () => {
  const openingType = createDefaultBuildingStructure().openingTypes[1];
  const current = JSON.parse(serializeProductPackage(openingType, source)) as Record<string, unknown>;
  current.version = 1;
  delete current.assets;
  const parsed = parseProductPackage(JSON.stringify(current));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(parsed.openingType.productAssets, []);
});

test("rejects packages without complete source provenance", () => {
  const openingType = createDefaultBuildingStructure().openingTypes[0];
  const parsed = parseProductPackage(JSON.stringify({
    format: PRODUCT_PACKAGE_FORMAT,
    version: PRODUCT_PACKAGE_VERSION,
    assets: [],
    product: { ...source, manufacturer: "" },
    openingType,
  }));
  assert.equal(parsed.ok, false);
  if (parsed.ok) return;
  assert.match(parsed.error, /manufacturer identity/i);
});

test("rejects invalid native dimensions without throwing", () => {
  const openingType = createDefaultBuildingStructure().openingTypes[0];
  const parsed = parseProductPackage(JSON.stringify({
    format: PRODUCT_PACKAGE_FORMAT,
    version: PRODUCT_PACKAGE_VERSION,
    assets: [],
    product: source,
    openingType: { ...openingType, name: null },
  }));
  assert.equal(parsed.ok, false);
  if (parsed.ok) return;
  assert.match(parsed.error, /dimensions or assembly components/i);
});

test("rejects product packages from a newer schema", () => {
  const parsed = parseProductPackage(JSON.stringify({ format: PRODUCT_PACKAGE_FORMAT, version: PRODUCT_PACKAGE_VERSION + 1 }));
  assert.equal(parsed.ok, false);
  if (parsed.ok) return;
  assert.match(parsed.error, /newer version/i);
});
