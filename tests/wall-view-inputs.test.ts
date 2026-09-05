import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultBuildingStructure } from "../lib/building-stories.ts";
import { deepEqual } from "../lib/deep-equal.ts";
import type { LineObject, WallVerticalExtent } from "../lib/document-model.ts";
import { wallViewInputs } from "../lib/wall-view-inputs.ts";
import { buildAutomaticWallJoinPlan } from "../lib/wall-joins.ts";
import { VIEW_PRESETS } from "../lib/view-navigation.ts";

const building = createDefaultBuildingStructure();
const wallType = building.wallTypes[0];
const openingTypes = new Map(building.openingTypes.map((type) => [type.id, type]));
const headerTypes = new Map(building.headerTypes.map((type) => [type.id, type]));
const vertical: WallVerticalExtent = {
  adjacentRoomIds: [], baseElevation: 0, hasDifferentRoomCeilings: false,
  hasDifferentRoomFloors: false, height: 109.125, source: "story", topElevation: 109.125,
};

function wall(id: string, sx: number, sy: number, ex: number, ey: number): LineObject {
  return {
    architecturalRole: "wall", start: { x: sx, y: sy, z: 0 }, end: { x: ex, y: ey, z: 0 },
    foundationSupportWallId: null, foundationWallTypeId: null, id, layerId: "layer-01",
    locked: false, name: id, storyId: building.stories[0].id, type: "line",
    wallEndJoinMode: "auto", wallExteriorSide: "left", wallJoinPriority: 0, wallOpenings: [],
    wallReferenceLine: "exterior-main", wallStartJoinMode: "auto", wallTypeId: wallType.id,
  };
}

/** Snapshot the inputs for every wall in a set, the way the viewport does. */
function snapshot(lines: LineObject[]) {
  const plan = buildAutomaticWallJoinPlan(lines, building.wallTypes);
  const linesById = new Map(lines.map((line) => [line.id, line]));
  const typesById = new Map(building.wallTypes.map((type) => [type.id, type]));
  return new Map(lines.map((line) => [
    line.id,
    wallViewInputs(line, vertical, wallType, plan, linesById, typesById, openingTypes, headerTypes, building.wallFraming, VIEW_PRESETS.front),
  ]));
}

function changedWalls(before: ReturnType<typeof snapshot>, after: ReturnType<typeof snapshot>) {
  return [...after].filter(([id, inputs]) => !deepEqual(before.get(id), inputs)).map(([id]) => id).sort();
}

// Three walls in an L: A and B meet at a corner, C is far away and touches nothing.
const layout = () => [
  wall("a", 0, 0, 240, 0),
  wall("b", 240, 0, 240, 240),
  wall("c", 2400, 2400, 2640, 2400),
];

test("an unchanged model rebuilds nothing", () => {
  assert.deepEqual(changedWalls(snapshot(layout()), snapshot(layout())), []);
});

test("moving a wall rebuilds it and the wall it joins, but not an unrelated wall", () => {
  const before = snapshot(layout());
  const moved = layout();
  moved[0].end = { x: 252, y: 0, z: 0 };
  const changed = changedWalls(before, snapshot(moved));
  assert.ok(changed.includes("a"), "the moved wall must rebuild");
  assert.ok(!changed.includes("c"), "an unrelated wall must not rebuild");
});

test("editing an unrelated wall never rebuilds the others", () => {
  const before = snapshot(layout());
  const moved = layout();
  moved[2].end = { x: 2652, y: 2400, z: 0 };
  assert.deepEqual(changedWalls(before, snapshot(moved)), ["c"]);
});

test("adding an opening rebuilds only that wall", () => {
  const before = snapshot(layout());
  const withOpening = layout();
  withOpening[2].wallOpenings = [{
    componentOverrides: [], centerOffset: 120, headerBottomHeight: 84, headerTypeIdOverride: null,
    id: "op-1", kind: "window", layerId: "layer-01", name: "Window 01",
    roughHeight: 48.5, roughWidth: 36.5, unitHeight: 48, unitWidth: 36,
    wallOpeningTypeId: building.openingTypes.find((type) => type.kind === "window")!.id,
  }];
  assert.deepEqual(changedWalls(before, snapshot(withOpening)), ["c"]);
});

test("switching to a view that hides framing rebuilds every wall", () => {
  // Framing is only drawn when it is both enabled and shown in the model, and
  // never in Top view. showInModel is off by default, so turn it on here.
  const framing = { ...building.wallFraming, enabled: true, showInModel: true };
  const lines = layout();
  const plan = buildAutomaticWallJoinPlan(lines, building.wallTypes);
  const linesById = new Map(lines.map((line) => [line.id, line]));
  const typesById = new Map(building.wallTypes.map((type) => [type.id, type]));
  const inFront = wallViewInputs(lines[0], vertical, wallType, plan, linesById, typesById, openingTypes, headerTypes, framing, VIEW_PRESETS.front);
  const inTop = wallViewInputs(lines[0], vertical, wallType, plan, linesById, typesById, openingTypes, headerTypes, framing, VIEW_PRESETS.top);
  assert.notEqual(inFront.framingReveal, inTop.framingReveal, "Top view suppresses framing");
  assert.ok(!deepEqual(inFront, inTop), "a framing change must invalidate the built geometry");
});

test("a changed Story height rebuilds the wall", () => {
  const lines = layout();
  const plan = buildAutomaticWallJoinPlan(lines, building.wallTypes);
  const linesById = new Map(lines.map((line) => [line.id, line]));
  const typesById = new Map(building.wallTypes.map((type) => [type.id, type]));
  const build = (extent: WallVerticalExtent) =>
    wallViewInputs(lines[0], extent, wallType, plan, linesById, typesById, openingTypes, headerTypes, building.wallFraming, VIEW_PRESETS.front);
  assert.ok(!deepEqual(build(vertical), build({ ...vertical, height: 120, topElevation: 120 })));
  assert.ok(!deepEqual(build(vertical), build({ ...vertical, baseElevation: 12 })));
});

test("a wall built for one view is not reused in another", () => {
  // Product representations resolve a different asset per view: a Door shows its
  // plan symbol in Top, its elevation in Front, and its 3D model in Perspective.
  // Front and Perspective both reveal framing, so the view itself has to be part
  // of the input set or the wrong representation would stay on screen.
  const lines = layout();
  const plan = buildAutomaticWallJoinPlan(lines, building.wallTypes);
  const linesById = new Map(lines.map((line) => [line.id, line]));
  const typesById = new Map(building.wallTypes.map((type) => [type.id, type]));
  const build = (target: typeof VIEW_PRESETS.front) =>
    wallViewInputs(lines[0], vertical, wallType, plan, linesById, typesById, openingTypes, headerTypes, building.wallFraming, target);

  const front = build(VIEW_PRESETS.front);
  const perspective = build(VIEW_PRESETS.perspective);
  assert.equal(front.framingReveal, perspective.framingReveal, "both reveal framing, so framingReveal cannot be the discriminator");
  assert.ok(!deepEqual(front, perspective), "changing view must invalidate the built geometry");
  assert.ok(!deepEqual(front, build(VIEW_PRESETS.top)));
  assert.ok(deepEqual(front, build(VIEW_PRESETS.front)), "the same view must stay valid");
});
