import assert from "node:assert/strict";
import test from "node:test";
import { arcLength } from "../lib/cad-arc.ts";
import { lineLength } from "../lib/cad-line.ts";
import { polylineLength } from "../lib/cad-polyline.ts";
import {
  closestLengthenEndpoint,
  lengthenArcGeometry,
  lengthenLineGeometry,
  lengthenPolylineGeometry,
} from "../lib/cad-lengthen.ts";

test("Lengthen changes either Line endpoint by Delta while preserving direction", () => {
  const line = { start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } };
  assert.deepEqual(lengthenLineGeometry(line, "end", { method: "delta", value: 5 }), {
    start: { x: 0, y: 0, z: 0 }, end: { x: 15, y: 0, z: 0 },
  });
  assert.deepEqual(lengthenLineGeometry(line, "start", { method: "delta", value: -4 }), {
    start: { x: 4, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 },
  });
});

test("Lengthen supports Total, Percent, and constrained Dynamic Line methods", () => {
  const line = { start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } };
  assert.equal(lineLength(lengthenLineGeometry(line, "end", { method: "total", value: 25 })!), 25);
  assert.equal(lineLength(lengthenLineGeometry(line, "end", { method: "percent", value: 150 })!), 15);
  assert.deepEqual(lengthenLineGeometry(line, "end", { method: "dynamic", point: { x: 18, y: 7, z: 0 } })?.end, { x: 18, y: 0, z: 0 });
});

test("Lengthen preserves Arc center and radius while changing its sweep", () => {
  const arc = { center: { x: 0, y: 0, z: 0 }, radius: 10, startAngle: 0, endAngle: 90, counterclockwise: true };
  const doubled = lengthenArcGeometry(arc, "end", { method: "percent", value: 200 });
  assert.ok(doubled);
  assert.equal(doubled.endAngle, 180);
  assert.equal(doubled.radius, 10);
  assert.ok(Math.abs(arcLength(doubled) - arcLength(arc) * 2) < 1e-8);
  const dynamic = lengthenArcGeometry(arc, "start", { method: "dynamic", point: { x: -10, y: 0, z: 0 } });
  assert.equal(dynamic?.startAngle, 180);
});

test("Lengthen changes only the selected terminal Polyline segment", () => {
  const polyline = { vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], closed: false, elevation: 4, bulges: [0, 0] };
  const result = lengthenPolylineGeometry(polyline, "end", { method: "delta", value: 5 });
  assert.ok(result);
  assert.deepEqual(result.vertices.slice(0, 2), polyline.vertices.slice(0, 2));
  assert.deepEqual(result.vertices[2], { x: 10, y: 15 });
  assert.equal(polylineLength(result), 25);
});

test("Lengthen retains curved terminal Polyline segments as bulges", () => {
  const polyline = { vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }], closed: false, elevation: 0, bulges: [1] };
  const result = lengthenPolylineGeometry(polyline, "end", { method: "percent", value: 50 });
  assert.ok(result);
  assert.ok(Math.abs(polylineLength(result) - polylineLength(polyline) / 2) < 1e-8);
  assert.notEqual(result.bulges?.[0], 0);
});

test("Lengthen rejects collapsed, closed, and over-360-degree results", () => {
  const line = { start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } };
  assert.equal(lengthenLineGeometry(line, "end", { method: "delta", value: -10 }), null);
  assert.equal(lengthenPolylineGeometry({ vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }], closed: true, elevation: 0 }, "end", { method: "delta", value: 1 }), null);
  assert.equal(lengthenArcGeometry({ center: { x: 0, y: 0, z: 0 }, radius: 1, startAngle: 0, endAngle: 90, counterclockwise: true }, "end", { method: "total", value: 2 * Math.PI }), null);
});

test("Lengthen endpoint selection uses the pick nearest an open end", () => {
  assert.equal(closestLengthenEndpoint({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 9, y: 2, z: 0 }), "end");
  assert.equal(closestLengthenEndpoint({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 1, y: 2, z: 0 }), "start");
});
