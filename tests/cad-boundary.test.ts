import assert from "node:assert/strict";
import test from "node:test";

import { discoverBoundaryAtPoint, discoverBoundedFaces, type BoundarySource } from "../lib/cad-boundary.ts";
import { polylineArea } from "../lib/cad-polyline.ts";

const line = (startX: number, startY: number, endX: number, endY: number, z = 0): BoundarySource => ({
  geometry: { end: { x: endX, y: endY, z }, start: { x: startX, y: startY, z } },
  kind: "line",
});

test("discovers a closed rectangular face from independent Lines", () => {
  const result = discoverBoundaryAtPoint([
    line(0, 0, 12, 0),
    line(12, 0, 12, 8),
    line(12, 8, 0, 8),
    line(0, 8, 0, 0),
  ], { x: 6, y: 4, z: 0 });

  assert.ok(result);
  assert.equal(result.geometry.closed, true);
  assert.equal(result.geometry.elevation, 0);
  assert.equal(result.geometry.vertices.length, 4);
  assert.equal(result.area, 96);
  assert.equal(polylineArea(result.geometry), 96);
});

test("selects the smallest enclosed face containing the picked point", () => {
  const sources = [
    line(0, 0, 20, 0),
    line(20, 0, 20, 10),
    line(20, 10, 0, 10),
    line(0, 10, 0, 0),
    line(8, 0, 8, 10),
  ];
  const left = discoverBoundaryAtPoint(sources, { x: 4, y: 5, z: 0 });
  const right = discoverBoundaryAtPoint(sources, { x: 14, y: 5, z: 0 });

  assert.ok(left);
  assert.ok(right);
  assert.equal(left.area, 80);
  assert.equal(right.area, 120);
  assert.deepEqual(discoverBoundedFaces(sources, 0).map((face) => face.area), [80, 120]);
});

test("preserves circular boundaries as exact curved Polyline segments", () => {
  const result = discoverBoundaryAtPoint([{
    geometry: { center: { x: 5, y: 5, z: 3 }, radius: 4 },
    kind: "circle",
  }], { x: 5, y: 5, z: 3 });

  assert.ok(result);
  assert.equal(result.geometry.vertices.length, 4);
  assert.ok(result.geometry.bulges?.every((bulge) => Math.abs(bulge - Math.tan(Math.PI / 8)) < 1e-9));
  assert.ok(Math.abs(result.area - Math.PI * 16) < 1e-6);
  assert.ok(Math.abs(polylineArea(result.geometry) - Math.PI * 16) < 1e-6);
});

test("combines Lines and Arcs into one exact enclosed loop", () => {
  const result = discoverBoundaryAtPoint([
    line(-5, 0, 5, 0),
    {
      geometry: {
        center: { x: 0, y: 0, z: 0 },
        counterclockwise: true,
        endAngle: 180,
        radius: 5,
        startAngle: 0,
      },
      kind: "arc",
    },
  ], { x: 0, y: 2, z: 0 });

  assert.ok(result);
  assert.equal(result.geometry.vertices.length, 3);
  assert.equal(result.geometry.bulges?.[0], 0);
  assert.ok(result.geometry.bulges?.slice(1).every((bulge) => Math.abs(bulge - Math.tan(Math.PI / 8)) < 1e-9));
  assert.ok(Math.abs(result.area - Math.PI * 25 / 2) < 1e-6);
});

test("uses only geometry at the requested elevation and rejects open areas", () => {
  const open = [line(0, 0, 10, 0), line(10, 0, 10, 10), line(10, 10, 0, 10)];
  assert.equal(discoverBoundaryAtPoint(open, { x: 5, y: 5, z: 0 }), null);

  const elevated = [
    line(0, 0, 10, 0, 8),
    line(10, 0, 10, 10, 8),
    line(10, 10, 0, 10, 8),
    line(0, 10, 0, 0, 8),
  ];
  assert.equal(discoverBoundaryAtPoint(elevated, { x: 5, y: 5, z: 0 }), null);
  assert.ok(discoverBoundaryAtPoint(elevated, { x: 5, y: 5, z: 8 }));
});

test("rejects a pick made directly on a boundary", () => {
  const square = [line(0, 0, 10, 0), line(10, 0, 10, 10), line(10, 10, 0, 10), line(0, 10, 0, 0)];
  assert.equal(discoverBoundaryAtPoint(square, { x: 0, y: 5, z: 0 }), null);
});
