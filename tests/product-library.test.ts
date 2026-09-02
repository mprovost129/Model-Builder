import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultBuildingStructure } from "../lib/building-stories.ts";
import { createProjectProductLibrary, filterProjectProductLibrary } from "../lib/product-library.ts";

test("builds a searchable project library from reusable opening Types", () => {
  const building = createDefaultBuildingStructure();
  building.openingTypes[1].productSource = {
    manufacturer: "Example Window Co.", modelNumber: "DH-3040", productLine: "Heritage", revision: "2026",
    sourceFileName: "dh-3040.dwg", sourceFormat: "dwg", sourceUrl: "", verifiedAt: "",
  };
  building.openingTypes[1].productAssets = [{
    byteLength: 24576, checksumSha256: "a".repeat(64), fileName: "dh-3040.glb", format: "glb",
    id: "asset-dh-3040-model", name: "Manufacturer 3D Model", role: "model-3d", sourceUrl: "",
  }];
  const entries = createProjectProductLibrary(building);
  assert.equal(entries.length, 2);
  assert.equal(entries[1].representations.length, 4);
  assert.equal(entries[1].representations[3].source, "manufacturer-reference");
  assert.deepEqual(filterProjectProductLibrary(entries, "heritage", "all").map((entry) => entry.name), ["3-0 x 4-0 Window"]);
  assert.deepEqual(filterProjectProductLibrary(entries, "", "door").map((entry) => entry.category), ["door"]);
});
