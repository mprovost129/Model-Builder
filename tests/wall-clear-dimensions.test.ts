import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultBuildingStructure } from "../lib/building-stories.ts";
import { cloneDocument, NEW_PROJECT_DOCUMENT, STANDARD_LAYER_IDS, type LineObject } from "../lib/document-model.ts";
import { nearestParallelWallClearDimensions, setParallelWallDimension } from "../lib/wall-clear-dimensions.ts";

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
  assert.equal(dimensions[0].distance, 120);
  assert.equal(dimensions[0].from.x, 60);
  assert.equal(dimensions[0].to.x, 60);
  assert.equal(dimensions[1].distance, 100);
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

test("edits an exterior-Main-layer dimension while keeping joined corners closed", () => {
  const reference = wall("reference", [0, 0], [0, 120], { layerId: STANDARD_LAYER_IDS.wall });
  const selected = wall("selected", [120, 120], [120, 0], { layerId: STANDARD_LAYER_IDS.wall });
  const top = wall("top", [0, 120], [120, 120], { layerId: STANDARD_LAYER_IDS.wall });
  const bottom = wall("bottom", [120, 0], [0, 0], { layerId: STANDARD_LAYER_IDS.wall });
  const document = cloneDocument(NEW_PROJECT_DOCUMENT);
  document.lines = [reference, selected, top, bottom];

  const moved = setParallelWallDimension(document, selected.id, reference.id, 144);
  assert.ok(moved);
  const movedReference = moved.lines.find((line) => line.id === reference.id)!;
  const movedSelected = moved.lines.find((line) => line.id === selected.id)!;
  const movedTop = moved.lines.find((line) => line.id === top.id)!;
  const movedBottom = moved.lines.find((line) => line.id === bottom.id)!;
  assert.deepEqual(movedReference.start, reference.start);
  assert.deepEqual(movedReference.end, reference.end);
  assert.deepEqual(movedTop.end, movedSelected.start);
  assert.deepEqual(movedBottom.start, movedSelected.end);
  assert.deepEqual(movedTop.start, top.start);
  assert.deepEqual(movedBottom.end, bottom.end);
  const updatedDimension = nearestParallelWallClearDimensions(movedSelected, moved.lines, moved.building.wallTypes)
    .find((dimension) => dimension.referenceWallId === reference.id);
  assert.ok(updatedDimension);
  assert.equal(updatedDimension.distance, 144);
});
