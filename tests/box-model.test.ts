import assert from "node:assert/strict";
import test from "node:test";
import {
  boxWorldBounds,
  boxWorldPoint,
  DEFAULT_BOX_MODEL,
  moveBoxFace,
  rotateBoxModel,
  rotationBasePoint,
  snapRotationAngle,
} from "../lib/box-model.ts";

test("pulling a positive face grows the box from the fixed opposite face", () => {
  const next = moveBoxFace(DEFAULT_BOX_MODEL, 0, 6);
  assert.ok(next);
  assert.equal(next.dimensions.length, 150);
  assert.equal(next.position.x, 0);
});

test("pulling a negative face moves the origin and keeps the far face fixed", () => {
  const next = moveBoxFace(DEFAULT_BOX_MODEL, 1, 6);
  assert.ok(next);
  assert.equal(next.dimensions.length, 150);
  assert.equal(next.position.x, -6);
  assert.equal(next.position.x + next.dimensions.length, 144);
});

test("pushing a negative face inward preserves the opposite coordinate", () => {
  const next = moveBoxFace(DEFAULT_BOX_MODEL, 1, -6);
  assert.ok(next);
  assert.equal(next.dimensions.length, 138);
  assert.equal(next.position.x, 6);
  assert.equal(next.position.x + next.dimensions.length, 144);
});

test("top and bottom edits use the same fixed-face rule", () => {
  const pushedTop = moveBoxFace(DEFAULT_BOX_MODEL, 4, -6);
  const pushedBottom = moveBoxFace(DEFAULT_BOX_MODEL, 5, -6);
  assert.ok(pushedTop);
  assert.ok(pushedBottom);
  assert.equal(pushedTop.dimensions.height, 90);
  assert.equal(pushedTop.position.z, 0);
  assert.equal(pushedBottom.dimensions.height, 90);
  assert.equal(pushedBottom.position.z, 6);
  assert.equal(pushedBottom.position.z + pushedBottom.dimensions.height, 96);
});

test("movement snaps to a sixteenth inch and rejects collapsed geometry", () => {
  const snapped = moveBoxFace(DEFAULT_BOX_MODEL, 0, 0.04);
  assert.ok(snapped);
  assert.equal(snapped.dimensions.length, 144.0625);
  assert.equal(moveBoxFace(DEFAULT_BOX_MODEL, 0, -144), null);
});

test("rotates a box around its center while preserving dimensions and base point", () => {
  const base = rotationBasePoint(DEFAULT_BOX_MODEL, "center");
  const rotated = rotateBoxModel(DEFAULT_BOX_MODEL, 90, base);
  assert.ok(rotated);
  assert.equal(rotated.rotationZ, 90);
  assert.deepEqual(rotated.dimensions, DEFAULT_BOX_MODEL.dimensions);
  assert.deepEqual(rotated.position, { x: 120, y: -24, z: 0 });
  assert.deepEqual(boxWorldPoint(rotated, 0.5, 0.5, 0.5), base);
  assert.deepEqual(boxWorldBounds(rotated), {
    minimum: { x: 24, y: -24, z: 0 },
    maximum: { x: 120, y: 120, z: 96 },
  });
  assert.equal(snapRotationAngle(22), 15);
  assert.equal(snapRotationAngle(22, 1), 22);
});

test("resizes a rotated negative face along its local axis", () => {
  const rotated = { ...DEFAULT_BOX_MODEL, rotationZ: 90 };
  const next = moveBoxFace(rotated, 1, 6);
  assert.ok(next);
  assert.equal(next.dimensions.length, 150);
  assert.deepEqual(next.position, { x: 0, y: -6, z: 0 });
});
