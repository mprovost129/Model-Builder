import assert from "node:assert/strict";
import test from "node:test";

import { chamferLineGeometries } from "../lib/cad-chamfer.ts";

test("creates an asymmetric exact chamfer between perpendicular Lines", () => {
  const result = chamferLineGeometries(
    { start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } },
    { start: { x: 0, y: 0, z: 0 }, end: { x: 0, y: 10, z: 0 } },
    { x: 8, y: 0, z: 0 },
    { x: 0, y: 8, z: 0 },
    2,
    3,
  );
  assert.ok(result);
  assert.deepEqual(result.first.start, { x: 2, y: 0, z: 0 });
  assert.deepEqual(result.second.start, { x: 0, y: 3, z: 0 });
  assert.deepEqual(result.chamfer, {
    start: { x: 2, y: 0, z: 0 },
    end: { x: 0, y: 3, z: 0 },
  });
});

test("zero distances clean the corner without creating a bevel Line", () => {
  const result = chamferLineGeometries(
    { start: { x: 4, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } },
    { start: { x: 0, y: 5, z: 0 }, end: { x: 0, y: 10, z: 0 } },
    { x: 8, y: 0, z: 0 },
    { x: 0, y: 8, z: 0 },
    0,
    0,
  );
  assert.ok(result);
  assert.equal(result.chamfer, null);
  assert.deepEqual(result.first.start, { x: 0, y: 0, z: 0 });
  assert.deepEqual(result.second.start, { x: 0, y: 0, z: 0 });
});

test("retains calculation precision for an angled chamfer", () => {
  const result = chamferLineGeometries(
    { start: { x: 0, y: 0, z: 4 }, end: { x: 10, y: 10, z: 4 } },
    { start: { x: 0, y: 0, z: 4 }, end: { x: -10, y: 10, z: 4 } },
    { x: 8, y: 8, z: 4 },
    { x: -8, y: 8, z: 4 },
    2,
    2,
  );
  assert.ok(result);
  assert.deepEqual(result.firstChamferPoint, { x: 1.414213562, y: 1.414213562, z: 4 });
  assert.deepEqual(result.secondChamferPoint, { x: -1.414213562, y: 1.414213562, z: 4 });
});

test("rejects parallel, non-coplanar, negative, and overlarge chamfers", () => {
  const horizontal = { start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } };
  assert.equal(chamferLineGeometries(horizontal, { start: { x: 0, y: 2, z: 0 }, end: { x: 10, y: 2, z: 0 } }, horizontal.end, { x: 8, y: 2, z: 0 }, 1, 1), null);
  assert.equal(chamferLineGeometries(horizontal, { start: { x: 0, y: 0, z: 1 }, end: { x: 0, y: 10, z: 1 } }, horizontal.end, { x: 0, y: 8, z: 1 }, 1, 1), null);
  assert.equal(chamferLineGeometries(horizontal, { start: { x: 0, y: 0, z: 0 }, end: { x: 0, y: 10, z: 0 } }, horizontal.end, { x: 0, y: 8, z: 0 }, -1, 1), null);
  assert.equal(chamferLineGeometries(horizontal, { start: { x: 0, y: 0, z: 0 }, end: { x: 0, y: 10, z: 0 } }, horizontal.end, { x: 0, y: 8, z: 0 }, 20, 1), null);
});
