import assert from "node:assert/strict";
import test from "node:test";
import {
  offsetArcGeometry,
  offsetCircleGeometry,
  offsetLineGeometry,
  offsetPolylineGeometry,
} from "../lib/cad-offset.ts";
import { rectangleFromCorners } from "../lib/cad-polyline.ts";

test("offsets a Line toward the chosen side while preserving its elevation", () => {
  const line = { start: { x: 0, y: 0, z: 12 }, end: { x: 10, y: 0, z: 18 } };
  assert.deepEqual(offsetLineGeometry(line, 2, { x: 4, y: 5 }), {
    start: { x: 0, y: 2, z: 12 },
    end: { x: 10, y: 2, z: 18 },
  });
  assert.deepEqual(offsetLineGeometry(line, 2, { x: 4, y: -5 }), {
    start: { x: 0, y: -2, z: 12 },
    end: { x: 10, y: -2, z: 18 },
  });
});

test("offsets Circles and Arcs inward or outward from the picked side", () => {
  const circle = { center: { x: 0, y: 0, z: 4 }, radius: 10 };
  assert.equal(offsetCircleGeometry(circle, 2, { x: 15, y: 0 })?.radius, 12);
  assert.equal(offsetCircleGeometry(circle, 2, { x: 5, y: 0 })?.radius, 8);
  assert.equal(offsetCircleGeometry(circle, 12, { x: 0, y: 0 }), null);

  const arc = { ...circle, counterclockwise: true, startAngle: 0, endAngle: 90 };
  assert.equal(offsetArcGeometry(arc, 3, { x: 20, y: 0 })?.radius, 13);
  assert.equal(offsetArcGeometry(arc, 3, { x: 5, y: 0 })?.radius, 7);
});

test("offsets a closed Rectangle outward and inward with mitered corners", () => {
  const rectangle = rectangleFromCorners({ x: 0, y: 0 }, { x: 10, y: 5 });
  assert.ok(rectangle);
  const outward = offsetPolylineGeometry(rectangle, 1, { x: 5, y: -3 });
  assert.deepEqual(outward?.vertices, [
    { x: -1, y: -1 },
    { x: 11, y: -1 },
    { x: 11, y: 6 },
    { x: -1, y: 6 },
  ]);
  const inward = offsetPolylineGeometry(rectangle, 1, { x: 5, y: 2 });
  assert.deepEqual(inward?.vertices, [
    { x: 1, y: 1 },
    { x: 9, y: 1 },
    { x: 9, y: 4 },
    { x: 1, y: 4 },
  ]);
});

test("preserves a curved Polyline segment as a bulge-based native curve", () => {
  const polyline = {
    bulges: [1],
    closed: false,
    elevation: 0,
    vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
    width: 0,
  };
  const result = offsetPolylineGeometry(polyline, 1, { x: 5, y: -8 });
  assert.ok(result);
  assert.equal(result.bulges?.length, 1);
  assert.ok(Math.abs(Math.abs(result.bulges?.[0] ?? 0) - 1) < 1e-8);
});
