import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultBuildingStructure, createDefaultProductAssetAlignment } from "../lib/building-stories.ts";
import { createProjectProductLibrary, filterProjectProductLibrary } from "../lib/product-library.ts";

test("builds a searchable project library from reusable opening Types", () => {
  const building = createDefaultBuildingStructure();
  building.openingTypes[1].productSource = {
    manufacturer: "Example Window Co.", modelNumber: "DH-3040", productLine: "Heritage", revision: "2026",
    sourceFileName: "dh-3040.dwg", sourceFormat: "dwg", sourceUrl: "", verifiedAt: "",
  };
  building.openingTypes[1].productAssets = [{
    alignment: createDefaultProductAssetAlignment("glb"),
    byteLength: 24576, checksumSha256: "a".repeat(64), fileName: "dh-3040.glb", format: "glb",
    id: "asset-dh-3040-model", name: "Manufacturer 3D Model", role: "model-3d", sourceUrl: "", usage: "reference",
  }];
  building.productObjectTypes.push({
    category: "appliance",
    dimensions: { height: 70, length: 36, width: 30 },
    id: "product-object-type-01",
    name: "36 in. Refrigerator",
    productAssets: [],
    productSource: null,
  });
  const entries = createProjectProductLibrary(building);
  assert.equal(entries.length, 3);
  assert.equal(entries[1].representations.length, 4);
  assert.equal(entries[1].representations[3].source, "manufacturer-reference");
  assert.deepEqual(filterProjectProductLibrary(entries, "heritage", "all").map((entry) => entry.name), ["3-0 x 4-0 Window"]);
  assert.deepEqual(filterProjectProductLibrary(entries, "", "door").map((entry) => entry.category), ["door"]);
  assert.deepEqual(filterProjectProductLibrary(entries, "appliance", "object").map((entry) => entry.name), ["36 in. Refrigerator"]);
  assert.deepEqual(entries[2].target, { kind: "object", typeId: "product-object-type-01" });
});
