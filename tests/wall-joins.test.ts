import assert from "node:assert/strict";
import test from "node:test";
import {
  createDefaultBuildingStructure,
  type LayeredAssembly,
} from "../lib/building-stories.ts";
import type { LineObject } from "../lib/document-model.ts";
import {
  automaticWallJoinCount,
  buildAutomaticWallJoinPlan,
  unresolvedWallJunctionCount,
  wallLayerFootprint,
} from "../lib/wall-joins.ts";

function wall(
  id: string,
  start: { x: number; y: number; z?: number },
  end: { x: number; y: number; z?: number },
  overrides: Partial<LineObject> = {},
): LineObject {
  return {
    architecturalRole: "wall",
    end: { ...end, z: end.z ?? 0 },
    id,
    layerId: "layer-01",
    locked: false,
    name: id,
    start: { ...start, z: start.z ?? 0 },
    storyId: "story-01",
    type: "line",
    wallExteriorSide: "left",
    wallReferenceLine: "exterior-main",
    wallTypeId: "wall-type-01",
    ...overrides,
  };
}

function wallTypes() {
  return createDefaultBuildingStructure().wallTypes;
}

function typeMap(types: LayeredAssembly[]) {
  return new Map(types.map((wallType) => [wallType.id, wallType]));
}

function alternateWallType(): LayeredAssembly {
  const source = wallTypes()[0];
  return {
    ...source,
    id: "wall-type-02",
    name: "2x6 Exterior Wall",
    layers: source.layers.map((layer, index) => ({
      ...layer,
      id: `wall-type-02-${index + 1}`,
      thickness: layer.wallGroup === "main" ? 5.5 : layer.thickness,
    })),
  };
}

test("plans an automatic Main-core corner for two compatible wall endpoints", () => {
  const first = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const second = wall("wall-02", { x: 120, y: 0 }, { x: 120, y: 120 });
  const plan = buildAutomaticWallJoinPlan([first, second], wallTypes());
  assert.deepEqual(plan.endpointJoins.get(first.id)?.end, { kind: "corner", otherEndpoint: "start", otherWallId: second.id });
  assert.deepEqual(plan.endpointJoins.get(second.id)?.start, { kind: "corner", otherEndpoint: "end", otherWallId: first.id });
  assert.equal(automaticWallJoinCount(first.id, plan), 1);
  assert.equal(unresolvedWallJunctionCount(first.id, plan), 0);
});

test("miters corresponding boundaries without moving editable reference paths", () => {
  const first = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const second = wall("wall-02", { x: 120, y: 0 }, { x: 120, y: 120 });
  const lines = [first, second];
  const types = wallTypes();
  const plan = buildAutomaticWallJoinPlan(lines, types);
  const footprint = wallLayerFootprint(first, types[0], 0, plan, new Map(lines.map((line) => [line.id, line])), typeMap(types));
  assert.deepEqual(footprint.endExterior, { x: 119.0625, y: 0.9375 });
  assert.deepEqual(footprint.endInterior, { x: 119.5625, y: 0.4375 });
  assert.deepEqual(first.end, { x: 120, y: 0, z: 0 });
  assert.deepEqual(second.start, { x: 120, y: 0, z: 0 });
});

test("joins mixed wall types from their Main boundaries", () => {
  const types = [...wallTypes(), alternateWallType()];
  const first = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const second = wall("wall-02", { x: 120, y: 0 }, { x: 120, y: 120 }, { wallTypeId: "wall-type-02" });
  const lines = [first, second];
  const plan = buildAutomaticWallJoinPlan(lines, types);
  assert.equal(plan.endpointJoins.get(first.id)?.end?.kind, "corner");
  assert.equal(plan.endpointJoins.get(second.id)?.start?.kind, "corner");
  const footprint = wallLayerFootprint(first, types[0], 2, plan, new Map(lines.map((line) => [line.id, line])), typeMap(types));
  assert.deepEqual(footprint.endExterior, { x: 120, y: 0 });
  assert.deepEqual(footprint.endInterior, { x: 125.5, y: -3.5 });
});

test("trims a branch endpoint to the near Main face of an uninterrupted host wall", () => {
  const host = wall("wall-01", { x: 0, y: 0 }, { x: 240, y: 0 });
  const branch = wall("wall-02", { x: 120, y: 0 }, { x: 120, y: -120 });
  const lines = [host, branch];
  const types = wallTypes();
  const plan = buildAutomaticWallJoinPlan(lines, types);
  assert.deepEqual(plan.endpointJoins.get(branch.id)?.start, { hostWallId: host.id, kind: "tee" });
  assert.equal(automaticWallJoinCount(host.id, plan), 1);
  assert.equal(automaticWallJoinCount(branch.id, plan), 1);
  const footprint = wallLayerFootprint(branch, types[0], 2, plan, new Map(lines.map((line) => [line.id, line])), typeMap(types));
  assert.equal(footprint.startExterior.y, -3.5);
  assert.equal(footprint.startInterior.y, -3.5);
  assert.deepEqual(host.start, { x: 0, y: 0, z: 0 });
  assert.deepEqual(host.end, { x: 240, y: 0, z: 0 });
});

test("recognizes an aligned split host as one through-wall T-junction", () => {
  const firstHost = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const secondHost = wall("wall-02", { x: 120, y: 0 }, { x: 240, y: 0 });
  const branch = wall("wall-03", { x: 120, y: 0 }, { x: 120, y: -120 });
  const plan = buildAutomaticWallJoinPlan([firstHost, secondHost, branch], wallTypes());
  assert.equal(plan.endpointJoins.get(branch.id)?.start?.kind, "tee");
  assert.equal(automaticWallJoinCount(firstHost.id, plan), 1);
  assert.equal(automaticWallJoinCount(secondHost.id, plan), 1);
  assert.equal(unresolvedWallJunctionCount(branch.id, plan), 0);
});

test("leaves straight continuations square and flags shallow corners", () => {
  const first = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const continuation = wall("wall-02", { x: 120, y: 0 }, { x: 240, y: 0 });
  const shallow = wall("wall-03", { x: 120, y: 0 }, { x: 240, y: 12 });
  const straightPlan = buildAutomaticWallJoinPlan([first, continuation], wallTypes());
  assert.equal(automaticWallJoinCount(first.id, straightPlan), 0);
  assert.equal(unresolvedWallJunctionCount(first.id, straightPlan), 0);
  const shallowPlan = buildAutomaticWallJoinPlan([first, shallow], wallTypes());
  assert.equal(automaticWallJoinCount(first.id, shallowPlan), 0);
  assert.equal(unresolvedWallJunctionCount(first.id, shallowPlan), 1);
});

test("flags Y-junctions and ambiguous crossings instead of guessing", () => {
  const first = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const second = wall("wall-02", { x: 120, y: 0 }, { x: 180, y: 90 });
  const third = wall("wall-03", { x: 120, y: 0 }, { x: 60, y: 90 });
  const yPlan = buildAutomaticWallJoinPlan([first, second, third], wallTypes());
  assert.equal(yPlan.endpointJoins.size, 0);
  assert.equal(unresolvedWallJunctionCount(first.id, yPlan), 1);
  assert.equal(unresolvedWallJunctionCount(second.id, yPlan), 1);
  assert.equal(unresolvedWallJunctionCount(third.id, yPlan), 1);

  const hostA = wall("wall-04", { x: 0, y: 0 }, { x: 240, y: 0 });
  const hostB = wall("wall-05", { x: 0, y: 0 }, { x: 240, y: 0 });
  const branch = wall("wall-06", { x: 120, y: 0 }, { x: 120, y: -120 });
  const ambiguousPlan = buildAutomaticWallJoinPlan([hostA, hostB, branch], wallTypes());
  assert.equal(ambiguousPlan.endpointJoins.size, 0);
  assert.equal(unresolvedWallJunctionCount(branch.id, ambiguousPlan), 1);
});

test("keeps coincident endpoints on different Stories independent", () => {
  const first = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const upper = wall("wall-02", { x: 120, y: 0, z: 121.125 }, { x: 120, y: 120, z: 121.125 }, { storyId: "story-02" });
  const plan = buildAutomaticWallJoinPlan([first, upper], wallTypes());
  assert.equal(plan.endpointJoins.size, 0);
  assert.equal(unresolvedWallJunctionCount(first.id, plan), 0);
});
