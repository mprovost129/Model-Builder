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
    { centerOffset: 60, headerBottomHeight: 82.5, id: "door-01", kind: "door", name: "Door 01", roughHeight: 82.5, roughWidth: 38, unitHeight: 80, unitWidth: 36, wallOpeningTypeId: "door-type-01" },
    { centerOffset: 156, headerBottomHeight: 84, id: "window-01", kind: "window", name: "Window 01", roughHeight: 48.5, roughWidth: 36.5, unitHeight: 48, unitWidth: 36, wallOpeningTypeId: "window-type-01" },
  ]);
  const solids = wallFramingSolids(line, building.wallTypes[0], building.wallFraming, 109.125);
  assert.equal(solids.filter((solid) => solid.kind === "header").length, 2);
  assert.equal(solids.filter((solid) => solid.kind === "jack-stud").length, 4);
  assert.equal(solids.filter((solid) => solid.kind === "king-stud").length, 4);
  assert.equal(solids.filter((solid) => solid.kind === "rough-sill").length, 1);
  const doorPlateSegments = solids.filter((solid) => solid.kind === "bottom-plate");
  assert.deepEqual(doorPlateSegments.map((solid) => [solid.startExterior.x, solid.endExterior.x]), [[0, 41], [79, 240]]);
  const doorHeader = solids.find((solid) => solid.kind === "header" && solid.openingId === "door-01")!;
  assert.deepEqual([doorHeader.startExterior.x, doorHeader.endExterior.x, doorHeader.baseHeight, doorHeader.height], [39.5, 80.5, 82.5, 9.25]);
  const windowSill = solids.find((solid) => solid.kind === "rough-sill")!;
  assert.deepEqual([windowSill.baseHeight, windowSill.height], [35.5, 1.5]);
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
