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
  const parsed = parseProductPackage(serializeProductPackage(windowType, source));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.product.manufacturer, source.manufacturer);
  assert.equal(parsed.openingType.productSource?.modelNumber, source.modelNumber);
  assert.equal(parsed.openingType.headerTypeId, null);
  assert.equal(parsed.openingType.components.length, windowType.components.length);
});

test("rejects packages without complete source provenance", () => {
  const openingType = createDefaultBuildingStructure().openingTypes[0];
  const parsed = parseProductPackage(JSON.stringify({
    format: PRODUCT_PACKAGE_FORMAT,
    version: PRODUCT_PACKAGE_VERSION,
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
