import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultBuildingStructure } from "../lib/building-stories.ts";
import type { LineObject } from "../lib/document-model.ts";
import {
  automaticWallJoinCount,
  buildAutomaticWallJoinPlan,
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

test("plans an automatic join for exactly two compatible wall endpoints", () => {
  const first = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const second = wall("wall-02", { x: 120, y: 0 }, { x: 120, y: 120 });
  const plan = buildAutomaticWallJoinPlan([first, second]);
  assert.deepEqual(plan.get(first.id)?.end, { otherEndpoint: "start", otherWallId: second.id });
  assert.deepEqual(plan.get(second.id)?.start, { otherEndpoint: "end", otherWallId: first.id });
  assert.equal(automaticWallJoinCount(first.id, plan), 1);
  assert.equal(automaticWallJoinCount(second.id, plan), 1);
});

test("miters corresponding wall-layer boundaries without moving reference paths", () => {
  const first = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const second = wall("wall-02", { x: 120, y: 0 }, { x: 120, y: 120 });
  const lines = [first, second];
  const plan = buildAutomaticWallJoinPlan(lines);
  const wallType = createDefaultBuildingStructure().wallTypes[0];
  const footprint = wallLayerFootprint(first, wallType, 0, plan, new Map(lines.map((line) => [line.id, line])));
  assert.deepEqual(footprint.endExterior, { x: 119.0625, y: 0.9375 });
  assert.deepEqual(footprint.endInterior, { x: 119.5625, y: 0.4375 });
  assert.deepEqual(first.end, { x: 120, y: 0, z: 0 });
  assert.deepEqual(second.start, { x: 120, y: 0, z: 0 });
});

test("leaves straight continuations and shallow-angle corners square-ended", () => {
  const first = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const continuation = wall("wall-02", { x: 120, y: 0 }, { x: 240, y: 0 });
  const shallow = wall("wall-03", { x: 120, y: 0 }, { x: 240, y: 12 });
  assert.equal(buildAutomaticWallJoinPlan([first, continuation]).size, 0);
  assert.equal(buildAutomaticWallJoinPlan([first, shallow]).size, 0);
});

test("does not guess at three-way or mixed-wall-type junctions", () => {
  const first = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const second = wall("wall-02", { x: 120, y: 0 }, { x: 120, y: 120 });
  const third = wall("wall-03", { x: 120, y: 0 }, { x: 120, y: -120 });
  assert.equal(buildAutomaticWallJoinPlan([first, second, third]).size, 0);

  const mixed = wall("wall-04", { x: 120, y: 0 }, { x: 120, y: 120 }, { wallTypeId: "wall-type-02" });
  assert.equal(buildAutomaticWallJoinPlan([first, mixed]).size, 0);
});

test("keeps coincident endpoints on different Stories independent", () => {
  const first = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const upper = wall("wall-02", { x: 120, y: 0, z: 121.125 }, { x: 120, y: 120, z: 121.125 }, { storyId: "story-02" });
  assert.equal(buildAutomaticWallJoinPlan([first, upper]).size, 0);
});
