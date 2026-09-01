import assert from "node:assert/strict";
import test from "node:test";
import { joinCurveGeometries } from "../lib/cad-join.ts";

const line = (startX: number, startY: number, endX: number, endY: number, z = 0) => ({
  kind: "line" as const,
  geometry: { start: { x: startX, y: startY, z }, end: { x: endX, y: endY, z } },
});

test("Join merges an out-of-order collinear chain into one Line", () => {
  const result = joinCurveGeometries([
    line(10, 0, 20, 0),
    line(30, 0, 20, 0),
    line(0, 0, 10, 0),
  ]);
  assert.deepEqual(result, {
    kind: "line",
    geometry: { start: { x: 30, y: 0, z: 0 }, end: { x: 0, y: 0, z: 0 } },
  });
});

test("Join creates one native Polyline for a connected corner", () => {
  const result = joinCurveGeometries([line(0, 0, 10, 0), line(10, 10, 10, 0)]);
  assert.equal(result?.kind, "polyline");
  if (result?.kind !== "polyline") return;
  assert.deepEqual(result.geometry.vertices, [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]);
  assert.deepEqual(result.geometry.bulges, [0, 0]);
  assert.equal(result.geometry.closed, false);
});

test("Join retains compatible circular geometry as one Arc", () => {
  const result = joinCurveGeometries([
    { kind: "arc", geometry: { center: { x: 0, y: 0, z: 0 }, radius: 10, startAngle: 0, endAngle: 90, counterclockwise: true } },
    { kind: "arc", geometry: { center: { x: 0, y: 0, z: 0 }, radius: 10, startAngle: 180, endAngle: 90, counterclockwise: false } },
  ]);
  assert.equal(result?.kind, "arc");
  if (result?.kind !== "arc") return;
  assert.equal(result.geometry.radius, 10);
  assert.equal(result.geometry.startAngle, 0);
  assert.equal(result.geometry.endAngle, 180);
  assert.equal(result.geometry.counterclockwise, true);
});

test("Join closes four compatible quarter Arcs into one Circle", () => {
  const result = joinCurveGeometries([0, 90, 180, 270].map((startAngle) => ({
    kind: "arc" as const,
    geometry: { center: { x: 0, y: 0, z: 0 }, radius: 5, startAngle, endAngle: (startAngle + 90) % 360, counterclockwise: true },
  })));
  assert.deepEqual(result, { kind: "circle", geometry: { center: { x: 0, y: 0, z: 0 }, radius: 5 } });
});

test("Join preserves curved Polyline segments, elevation, and primary width", () => {
  const result = joinCurveGeometries([
    {
      kind: "polyline",
      geometry: { vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }], bulges: [0.5], closed: false, elevation: 12, width: 0.25 },
    },
    line(10, 0, 20, 0, 12),
  ]);
  assert.equal(result?.kind, "polyline");
  if (result?.kind !== "polyline") return;
  assert.deepEqual(result.geometry.vertices, [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }]);
  assert.deepEqual(result.geometry.bulges, [0.5, 0]);
  assert.equal(result.geometry.elevation, 12);
  assert.equal(result.geometry.width, 0.25);
});

test("Join rejects gaps, branches, elevation changes, and closed source Polylines", () => {
  assert.equal(joinCurveGeometries([line(0, 0, 5, 0), line(6, 0, 10, 0)]), null);
  assert.equal(joinCurveGeometries([line(0, 0, 5, 0), line(5, 0, 10, 0), line(5, 0, 5, 5)]), null);
  assert.equal(joinCurveGeometries([line(0, 0, 5, 0), line(5, 0, 10, 0, 1)]), null);
  assert.equal(joinCurveGeometries([
    { kind: "polyline", geometry: { vertices: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 5 }], closed: true, elevation: 0 } },
    line(0, 0, -5, 0),
  ]), null);
});
