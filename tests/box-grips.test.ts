import assert from "node:assert/strict";
import test from "node:test";
import {
  BOX_GRIP_DEFINITIONS,
  boxGripPosition,
  resizeBoxFromGrip,
} from "../lib/box-grips.ts";
import { DEFAULT_BOX_MODEL } from "../lib/box-model.ts";

test("defines the complete box grip layout", () => {
  assert.equal(BOX_GRIP_DEFINITIONS.length, 26);
  assert.equal(BOX_GRIP_DEFINITIONS.filter((grip) => grip.kind === "face").length, 6);
  assert.equal(BOX_GRIP_DEFINITIONS.filter((grip) => grip.kind === "edge").length, 12);
  assert.equal(BOX_GRIP_DEFINITIONS.filter((grip) => grip.kind === "corner").length, 8);
  assert.equal(new Set(BOX_GRIP_DEFINITIONS.map((grip) => grip.id)).size, 26);
});

test("places grips at face centers, edge midpoints, and corners", () => {
  const positiveXFace = BOX_GRIP_DEFINITIONS.find((grip) => grip.id === "face:1,0,0");
  const upperEdge = BOX_GRIP_DEFINITIONS.find((grip) => grip.id === "edge:1,0,1");
  const minimumCorner = BOX_GRIP_DEFINITIONS.find((grip) => grip.id === "corner:-1,-1,-1");
  assert.ok(positiveXFace && upperEdge && minimumCorner);
  assert.deepEqual(boxGripPosition(DEFAULT_BOX_MODEL, positiveXFace), { x: 144, y: 48, z: 48 });
  assert.deepEqual(boxGripPosition(DEFAULT_BOX_MODEL, upperEdge), { x: 144, y: 48, z: 96 });
  assert.deepEqual(boxGripPosition(DEFAULT_BOX_MODEL, minimumCorner), { x: 0, y: 0, z: 0 });
});

test("resizes from an edge grip while fixing the opposite faces", () => {
  const grip = BOX_GRIP_DEFINITIONS.find((candidate) => candidate.id === "edge:-1,1,0");
  assert.ok(grip);
  const resized = resizeBoxFromGrip(DEFAULT_BOX_MODEL, grip, { x: -12, y: 6 });
  assert.ok(resized);
  assert.deepEqual(resized.dimensions, { length: 156, width: 102, height: 96 });
  assert.deepEqual(resized.position, { x: -12, y: 0, z: 0 });
});

test("rejects a corner drag that would cross an opposite face", () => {
  const grip = BOX_GRIP_DEFINITIONS.find((candidate) => candidate.id === "corner:1,1,1");
  assert.ok(grip);
  assert.equal(resizeBoxFromGrip(DEFAULT_BOX_MODEL, grip, { x: -144, y: 0, z: 0 }), null);
});

test("places grips on rotated local faces", () => {
  const positiveXFace = BOX_GRIP_DEFINITIONS.find((grip) => grip.id === "face:1,0,0");
  assert.ok(positiveXFace);
  const position = boxGripPosition({ ...DEFAULT_BOX_MODEL, rotationZ: 90 }, positiveXFace);
  assert.ok(Math.abs(position.x + 48) < 1e-8);
  assert.ok(Math.abs(position.y - 144) < 1e-8);
  assert.equal(position.z, 48);
});
