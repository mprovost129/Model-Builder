import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultBuildingStructure } from "../lib/building-stories.ts";
import type { LineObject } from "../lib/document-model.ts";
import { wallFramingSolids } from "../lib/wall-framing.ts";
import { buildAutomaticWallJoinPlan } from "../lib/wall-joins.ts";

function framedWall(openings: LineObject["wallOpenings"] = []): LineObject {
  return {
    architecturalRole: "wall",
    end: { x: 240, y: 0, z: 0 },
    foundationSupportWallId: null,
    foundationWallTypeId: null,
    id: "wall-01",
    layerId: "layer-01",
    locked: false,
    name: "Wall 01",
    start: { x: 0, y: 0, z: 0 },
    storyId: "story-01",
    type: "line",
    wallEndJoinMode: "auto",
    wallExteriorSide: "left",
    wallJoinPriority: 0,
    wallOpenings: openings,
    wallReferenceLine: "exterior-main",
    wallStartJoinMode: "auto",
    wallTypeId: "wall-type-01",
  };
}

test("generates plates and regularly spaced full-height studs in the Wall Main layer", () => {
  const building = createDefaultBuildingStructure();
  const solids = wallFramingSolids(framedWall(), building.wallTypes[0], building.wallFraming, 109.125);
  assert.equal(solids.filter((solid) => solid.kind === "bottom-plate").length, 1);
  assert.equal(solids.filter((solid) => solid.kind === "top-plate").length, 2);
  assert.equal(solids.filter((solid) => solid.kind === "common-stud").length, 16);
  const firstStud = solids.find((solid) => solid.kind === "common-stud")!;
  assert.deepEqual([firstStud.baseHeight, firstStud.height], [1.5, 104.625]);
  assert.deepEqual([firstStud.startExterior.y, firstStud.startInterior.y], [0, -3.5]);
});

test("frames Door and Window rough openings with structural member roles", () => {
  const building = createDefaultBuildingStructure();
  const line = framedWall([
    { componentOverrides: [], centerOffset: 60, headerBottomHeight: 82.5, headerTypeIdOverride: null, id: "door-01", kind: "door", name: "Door 01", roughHeight: 82.5, roughWidth: 38, unitHeight: 80, unitWidth: 36, wallOpeningTypeId: "door-type-01" },
    { componentOverrides: [], centerOffset: 156, headerBottomHeight: 84, headerTypeIdOverride: null, id: "window-01", kind: "window", name: "Window 01", roughHeight: 48.5, roughWidth: 36.5, unitHeight: 48, unitWidth: 36, wallOpeningTypeId: "window-type-01" },
  ]);
  const openingTypes = new Map(building.openingTypes.map((type) => [type.id, type]));
  const solids = wallFramingSolids(line, building.wallTypes[0], building.wallFraming, 109.125, undefined, [line], openingTypes);
  assert.equal(solids.filter((solid) => solid.kind === "header").length, 2);
  assert.equal(solids.filter((solid) => solid.kind === "jack-stud").length, 4);
  assert.equal(solids.filter((solid) => solid.kind === "king-stud").length, 4);
  assert.equal(solids.filter((solid) => solid.kind === "rough-sill").length, 1);
  const doorPlateSegments = solids.filter((solid) => solid.kind === "bottom-plate");
  assert.deepEqual(doorPlateSegments.map((solid) => [solid.startExterior.x, solid.endExterior.x]), [[0, 41], [79, 240]]);
  const doorHeader = solids.find((solid) => solid.kind === "header" && solid.openingId === "door-01")!;
  assert.deepEqual([doorHeader.startExterior.x, doorHeader.endExterior.x, doorHeader.baseHeight, doorHeader.height], [39.5, 80.5, 82.5, 9.25]);
  const windowSill = solids.find((solid) => solid.kind === "rough-sill")!;
  assert.deepEqual([windowSill.baseHeight, windowSill.height], [34, 1.5]);
});

test("uses each reusable opening type's header and side-support package", () => {
  const building = createDefaultBuildingStructure();
  const windowType = building.openingTypes.find((type) => type.kind === "window")!;
  windowType.headerDepth = 11.25;
  windowType.jackStudCountPerSide = 2;
  windowType.kingStudCountPerSide = 2;
  windowType.windowSillPlateCount = 2;
  const line = framedWall([
    { componentOverrides: [], centerOffset: 120, headerBottomHeight: 84, headerTypeIdOverride: null, id: "window-01", kind: "window", name: "Window 01", roughHeight: 48.5, roughWidth: 36.5, unitHeight: 48, unitWidth: 36, wallOpeningTypeId: windowType.id },
  ]);
  const openingTypes = new Map(building.openingTypes.map((type) => [type.id, type]));
  const solids = wallFramingSolids(line, building.wallTypes[0], building.wallFraming, 109.125, undefined, [line], openingTypes);
  assert.equal(solids.filter((solid) => solid.kind === "jack-stud").length, 4);
  assert.equal(solids.filter((solid) => solid.kind === "king-stud").length, 4);
  assert.equal(solids.filter((solid) => solid.kind === "rough-sill").length, 2);
  const header = solids.find((solid) => solid.kind === "header")!;
  assert.deepEqual([header.startExterior.x, header.endExterior.x, header.height], [98.75, 141.25, 11.25]);
  assert.deepEqual(solids.filter((solid) => solid.kind === "rough-sill").map((solid) => solid.baseHeight), [34, 32.5]);
});

test("models on-edge plies, interior insulation, between-ply spacers, and flat courses", () => {
  const building = createDefaultBuildingStructure();
  const wallType = structuredClone(building.wallTypes[0]);
  wallType.layers.find((layer) => layer.wallGroup === "main")!.thickness = 5.5;
  const windowType = building.openingTypes.find((type) => type.kind === "window")!;
  const line = framedWall([
    { componentOverrides: [], centerOffset: 120, headerBottomHeight: 84, headerTypeIdOverride: null, id: "window-01", kind: "window", name: "Window 01", roughHeight: 48.5, roughWidth: 36.5, unitHeight: 48, unitWidth: 36, wallOpeningTypeId: windowType.id },
  ]);
  const openingTypes = new Map(building.openingTypes.map((type) => [type.id, type]));
  const headerTypes = new Map(building.headerTypes.map((type) => [type.id, type]));

  windowType.headerTypeId = "header-type-01";
  const insulated = wallFramingSolids(line, wallType, building.wallFraming, 109.125, undefined, [line], openingTypes, headerTypes);
  assert.equal(insulated.filter((solid) => solid.kind === "header").length, 3);
  assert.equal(insulated.filter((solid) => solid.kind === "header-filler").length, 1);
  assert.deepEqual(insulated.filter((solid) => solid.kind === "header").map((solid) => [solid.startExterior.y, solid.startInterior.y]), [[0, -1.5], [-1.5, -3], [-3, -4.5]]);
  const insulation = insulated.find((solid) => solid.kind === "header-filler");
  assert.ok(insulation);
  assert.deepEqual([insulation.startExterior.y, insulation.startInterior.y], [-4.5, -5.5]);

  windowType.headerTypeId = "header-type-03";
  const spaced = wallFramingSolids(line, wallType, building.wallFraming, 109.125, undefined, [line], openingTypes, headerTypes);
  assert.equal(spaced.filter((solid) => solid.kind === "header").length, 3);
  assert.equal(spaced.filter((solid) => solid.kind === "header-filler").length, 2);

  windowType.headerTypeId = "header-type-02";
  const flat = wallFramingSolids(line, wallType, building.wallFraming, 109.125, undefined, [line], openingTypes, headerTypes);
  assert.deepEqual(flat.filter((solid) => solid.kind === "header").map((solid) => [solid.baseHeight, solid.height, solid.startInterior.y]), [[84, 1.5, -5.5], [85.5, 1.5, -5.5]]);

  line.wallOpenings[0].headerTypeIdOverride = "header-type-01";
  const overridden = wallFramingSolids(line, wallType, building.wallFraming, 109.125, undefined, [line], openingTypes, headerTypes);
  assert.equal(overridden.filter((solid) => solid.kind === "header").length, 3);
  assert.equal(overridden.filter((solid) => solid.kind === "header-filler").length, 1);
});

test("can disable derived framing without changing Wall or opening geometry", () => {
  const building = createDefaultBuildingStructure();
  building.wallFraming.enabled = false;
  assert.deepEqual(wallFramingSolids(framedWall(), building.wallTypes[0], building.wallFraming, 109.125), []);
});

test("creates one additional member for a deterministic three-stud corner", () => {
  const building = createDefaultBuildingStructure();
  const first = { ...framedWall(), end: { x: 120, y: 0, z: 0 } };
  const second = { ...framedWall(), id: "wall-02", start: { x: 120, y: 0, z: 0 }, end: { x: 120, y: 120, z: 0 } };
  const lines = [first, second];
  const plan = buildAutomaticWallJoinPlan(lines, building.wallTypes);
  const solids = lines.flatMap((line) => wallFramingSolids(line, building.wallTypes[0], building.wallFraming, 109.125, plan, lines));
  assert.equal(solids.filter((solid) => solid.kind === "corner-stud").length, 1);
  building.wallFraming.cornerStyle = "two-stud";
  const efficient = lines.flatMap((line) => wallFramingSolids(line, building.wallTypes[0], building.wallFraming, 109.125, plan, lines));
  assert.equal(efficient.filter((solid) => solid.kind === "corner-stud").length, 0);
});

test("generates three-stud or ladder backing where a partition tees into a host", () => {
  const building = createDefaultBuildingStructure();
  const host = framedWall();
  const branch = { ...framedWall(), id: "wall-02", start: { x: 120, y: 0, z: 0 }, end: { x: 120, y: -120, z: 0 } };
  const lines = [host, branch];
  const plan = buildAutomaticWallJoinPlan(lines, building.wallTypes);
  const conventional = wallFramingSolids(host, building.wallTypes[0], building.wallFraming, 109.125, plan, lines);
  assert.equal(conventional.filter((solid) => solid.kind === "backing-stud").length, 3);
  assert.equal(conventional.filter((solid) => solid.kind === "common-stud" && solid.startExterior.x >= 117 && solid.endExterior.x <= 123).length, 0);

  building.wallFraming.partitionBackingStyle = "ladder";
  const ladder = wallFramingSolids(host, building.wallTypes[0], building.wallFraming, 109.125, plan, lines);
  assert.equal(ladder.filter((solid) => solid.kind === "backing-stud").length, 0);
  assert.deepEqual(ladder.filter((solid) => solid.kind === "backing-block").map((solid) => solid.baseHeight), [25.5, 49.5, 73.5, 97.5]);
});
