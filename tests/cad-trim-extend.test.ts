import assert from "node:assert/strict";
import test from "node:test";
import {
  extendArcGeometry,
  extendLineGeometry,
  extendPolylineGeometry,
  trimArcGeometry,
  trimCircleGeometry,
  trimLineGeometry,
  trimPolylineGeometry,
  type TrimExtendBoundary,
} from "../lib/cad-trim-extend.ts";
import { rectangleFromCorners } from "../lib/cad-polyline.ts";

const verticalBoundary = (x: number): TrimExtendBoundary => ({
  geometry: { start: { x, y: -20, z: 0 }, end: { x, y: 20, z: 0 } },
  kind: "line",
});

test("trims the picked interval from a Line and preserves both remaining pieces", () => {
  const line = { start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } };
  assert.deepEqual(trimLineGeometry(line, [verticalBoundary(3), verticalBoundary(7)], { x: 5, y: 0, z: 0 }), [
    { start: line.start, end: { x: 3, y: 0, z: 0 } },
    { start: { x: 7, y: 0, z: 0 }, end: line.end },
  ]);
});

test("extends the endpoint nearest the pick to the closest boundary", () => {
  const line = { start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } };
  assert.deepEqual(extendLineGeometry(line, [verticalBoundary(15), verticalBoundary(20)], { x: 10, y: 0, z: 0 }), {
    start: line.start,
    end: { x: 15, y: 0, z: 0 },
  });
});

test("trims and extends native Arcs without flattening them", () => {
  const arc = { center: { x: 0, y: 0, z: 0 }, radius: 10, startAngle: 0, endAngle: 180, counterclockwise: true };
  const trimmed = trimArcGeometry(arc, [verticalBoundary(-5), verticalBoundary(5)], { x: 0, y: 10, z: 0 });
  assert.equal(trimmed?.length, 2);
  assert.ok(trimmed?.every((piece) => piece.radius === 10));

  const quarter = { ...arc, endAngle: 90 };
  const horizontalBoundary: TrimExtendBoundary = { geometry: { start: { x: -20, y: -5, z: 0 }, end: { x: 20, y: -5, z: 0 } }, kind: "line" };
  const extended = extendArcGeometry(quarter, [horizontalBoundary], { x: 0, y: 10, z: 0 });
  assert.ok(extended);
  assert.equal(extended.radius, 10);
  assert.ok(extended.endAngle > 180);
});

test("converts a trimmed Circle into one native Arc", () => {
  const circle = { center: { x: 0, y: 0, z: 0 }, radius: 10 };
  const trimmed = trimCircleGeometry(circle, [verticalBoundary(0)], { x: 8, y: 0, z: 0 });
  assert.ok(trimmed);
  assert.equal(trimmed.radius, 10);
  assert.equal(trimmed.counterclockwise, true);
});

test("opens a trimmed Rectangle and extends an open Polyline endpoint", () => {
  const rectangle = rectangleFromCorners({ x: 0, y: 0 }, { x: 10, y: 5 });
  assert.ok(rectangle);
  const trimmed = trimPolylineGeometry(rectangle, [verticalBoundary(3), verticalBoundary(7)], { x: 5, y: 0, z: 0 });
  assert.equal(trimmed?.length, 1);
  assert.equal(trimmed?.[0].closed, false);
  assert.deepEqual(trimmed?.[0].vertices.at(0), { x: 7, y: 0 });
  assert.deepEqual(trimmed?.[0].vertices.at(-1), { x: 3, y: 0 });

  const polyline = { bulges: [0, 0], closed: false, elevation: 0, vertices: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }], width: 0 };
  const extended = extendPolylineGeometry(polyline, [verticalBoundary(15)], { x: 10, y: 0, z: 0 });
  assert.deepEqual(extended?.vertices.at(-1), { x: 15, y: 0 });
});
