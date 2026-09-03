import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultBuildingStructure } from "../lib/building-stories.ts";
import type { LineObject } from "../lib/document-model.ts";
import { nearestParallelWallClearDimensions } from "../lib/wall-clear-dimensions.ts";

function wall(id: string, start: [number, number], end: [number, number], overrides: Partial<LineObject> = {}): LineObject {
  return {
    architecturalRole: "wall",
    end: { x: end[0], y: end[1], z: 0 },
    foundationSupportWallId: null,
    foundationWallTypeId: null,
    id,
    layerId: "layer-01",
    locked: false,
    name: id,
    start: { x: start[0], y: start[1], z: 0 },
    storyId: "story-01",
    type: "line",
    wallExteriorSide: "left",
    wallJoinPriority: 0,
    wallStartJoinMode: "auto",
    wallEndJoinMode: "auto",
    wallReferenceLine: "exterior-main",
    wallTypeId: "wall-type-01",
    wallOpenings: [],
    ...overrides,
  };
}

test("finds the nearest overlapping parallel Wall faces on both sides", () => {
  const wallTypes = createDefaultBuildingStructure().wallTypes;
  const selected = wall("selected", [0, 0], [120, 0]);
  const fartherLeft = wall("left-far", [0, 180], [120, 180]);
  const nearerLeft = wall("left-near", [24, 120], [96, 120]);
  const right = wall("right", [120, -100], [0, -100]);
  const dimensions = nearestParallelWallClearDimensions(selected, [fartherLeft, nearerLeft, right], wallTypes);

  assert.deepEqual(dimensions.map((dimension) => [dimension.side, dimension.referenceWallId]), [
    ["left", "left-near"],
    ["right", "right"],
  ]);
  assert.equal(dimensions[0].distance, 115.0625);
  assert.equal(dimensions[0].from.x, 60);
  assert.equal(dimensions[0].to.x, 60);
  assert.equal(dimensions[1].distance, 92);
});

test("ignores perpendicular, non-overlapping, other-Story, and unresolved Walls", () => {
  const wallTypes = createDefaultBuildingStructure().wallTypes;
  const selected = wall("selected", [0, 0], [120, 0]);
  const candidates = [
    wall("perpendicular", [60, 20], [60, 100]),
    wall("past-end", [144, 80], [240, 80]),
    wall("other-story", [0, 80], [120, 80], { storyId: "story-02" }),
    wall("unknown-type", [0, -80], [120, -80], { wallTypeId: "missing" }),
  ];
  assert.deepEqual(nearestParallelWallClearDimensions(selected, candidates, wallTypes), []);
});
