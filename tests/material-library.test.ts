import assert from "node:assert/strict";
import test from "node:test";
import {
  ARCHITECTURAL_MATERIALS,
  architecturalMaterialByName,
  architecturalMaterialsForRole,
} from "../lib/material-library.ts";

test("defines unique architectural materials with plan and future 3D properties", () => {
  assert.equal(new Set(ARCHITECTURAL_MATERIALS.map((material) => material.name.toLocaleLowerCase())).size, ARCHITECTURAL_MATERIALS.length);
  assert.ok(ARCHITECTURAL_MATERIALS.every((material) => /^#[0-9a-f]{6}$/i.test(material.plan.color)));
  assert.ok(ARCHITECTURAL_MATERIALS.every((material) => /^#[0-9a-f]{6}$/i.test(material.model.color)));
  assert.ok(ARCHITECTURAL_MATERIALS.every((material) => material.model.textureAssetId === null));
});

test("filters material choices by assembly role without losing case-insensitive lookup", () => {
  assert.ok(architecturalMaterialsForRole("structure").some((material) => material.name === "Concrete"));
  assert.ok(architecturalMaterialsForRole("framing").some((material) => material.name === "Lumber"));
  assert.ok(architecturalMaterialsForRole("insulation").some((material) => material.name === "Rigid Insulation"));
  assert.ok(!architecturalMaterialsForRole("membrane").some((material) => material.name === "Concrete"));
  assert.equal(architecturalMaterialByName(" gypsum board ")?.name, "Gypsum Board");
  assert.equal(architecturalMaterialByName("Unlisted Project Material"), null);
});
