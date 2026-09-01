import assert from "node:assert/strict";
import test from "node:test";

import { stretchLineGeometry, stretchPolylineGeometry } from "../lib/cad-stretch.ts";

test("stretches only the selected Line endpoint", () => {
  const stretched = stretchLineGeometry(
    { start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } },
    [1],
    { x: 4, y: 3, z: 0 },
  );
  assert.deepEqual(stretched, {
    start: { x: 0, y: 0, z: 0 },
    end: { x: 14, y: 3, z: 0 },
  });
});

test("stretches captured Polyline vertices while preserving native bulges", () => {
  const stretched = stretchPolylineGeometry(
    {
      bulges: [0, 0.5, 0],
      closed: false,
      elevation: 12,
      vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 10 }],
      width: 0,
    },
    [1, 2],
    { x: 3, y: -2, z: 0 },
  );
  assert.deepEqual(stretched?.vertices, [
    { x: 0, y: 0 }, { x: 13, y: -2 }, { x: 13, y: 8 }, { x: 20, y: 10 },
  ]);
  assert.deepEqual(stretched?.bulges, [0, 0.5, 0]);
  assert.equal(stretched?.elevation, 12);
});

test("rejects partial Polyline elevation changes and collapsed Lines", () => {
  assert.equal(stretchPolylineGeometry(
    { closed: false, elevation: 0, vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }], width: 0 },
    [1],
    { x: 0, y: 0, z: 1 },
  ), null);
  assert.equal(stretchLineGeometry(
    { start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } },
    [1],
    { x: -10, y: 0, z: 0 },
  ), null);
});
