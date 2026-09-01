import assert from "node:assert/strict";
import test from "node:test";
import { chamferPolylineCorners, filletPolylineCorners } from "../lib/cad-polyline-corners.ts";
import { polylineArea, polylineGeometryIsValid, type PolylineGeometry } from "../lib/cad-polyline.ts";

const rectangle: PolylineGeometry = {
  bulges: [0, 0, 0, 0],
  closed: true,
  elevation: 24,
  vertices: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 10 }, { x: 0, y: 10 }],
  width: 0.5,
};

test("fillets every closed Polyline corner with tangent bulge arcs", () => {
  const result = filletPolylineCorners(rectangle, 2);
  assert.ok(result);
  assert.equal(result.vertices.length, 8);
  assert.equal(result.bulges?.filter((bulge) => Math.abs(bulge) > 1e-10).length, 4);
  assert.equal(result.elevation, 24);
  assert.equal(result.width, 0.5);
  assert.equal(polylineGeometryIsValid(result), true);
  assert.ok(Math.abs(polylineArea(result) - (200 - (4 - Math.PI) * 4)) < 1e-8);
});

test("chamfers every closed Polyline corner using path-order distances", () => {
  const result = chamferPolylineCorners(rectangle, 2, 3);
  assert.ok(result);
  assert.equal(result.vertices.length, 8);
  assert.deepEqual(result.vertices.slice(0, 2), [{ x: 0, y: 2 }, { x: 3, y: 0 }]);
  assert.equal(result.bulges?.every((bulge) => bulge === 0), true);
  assert.equal(result.elevation, 24);
  assert.equal(result.width, 0.5);
});

test("keeps open Polyline endpoints fixed while treating interior corners", () => {
  const open: PolylineGeometry = {
    bulges: [0, 0],
    closed: false,
    elevation: 0,
    vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }],
  };
  const result = filletPolylineCorners(open, 2);
  assert.ok(result);
  assert.deepEqual(result.vertices[0], open.vertices[0]);
  assert.deepEqual(result.vertices.at(-1), open.vertices.at(-1));
  assert.deepEqual(result.vertices.slice(1, 3), [{ x: 8, y: 0 }, { x: 10, y: 2 }]);
});

test("skips straight-through vertices and rejects curved, reversing, and overlapping sources", () => {
  const withStraightVertex: PolylineGeometry = {
    closed: false,
    elevation: 0,
    vertices: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }],
  };
  assert.equal(filletPolylineCorners(withStraightVertex, 2)?.vertices.length, 5);
  assert.equal(filletPolylineCorners({ ...withStraightVertex, bulges: [0.1, 0, 0] }, 2), null);
  assert.equal(filletPolylineCorners({ closed: false, elevation: 0, vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 0 }] }, 2), null);
  assert.equal(chamferPolylineCorners(rectangle, 6, 6), null);
  assert.equal(filletPolylineCorners(rectangle, 6), null);
});
