import assert from "node:assert/strict";
import test from "node:test";
import { moveRectangleGrip, parseRectangleDimensionPair, polylineArea, polylineBulgeFromThreePoints, polylineCentroid, polylineLength, polylinePathPoints, polylineSegments, polylineGeometryIsValid, rectangleDimensions, rectangleFromArea, rectangleFromCorners, rectangleFromDimensions, rectangleGripPoints, rectangleSupportsConstrainedGrips, updatePolylineVertex } from "../lib/cad-polyline.ts";

test("creates a closed rectangular polyline from opposite corners", () => {
  const rectangle = rectangleFromCorners({ x: 0, y: 0 }, { x: 144, y: 96 });
  assert.ok(rectangle);
  assert.equal(rectangle.closed, true);
  assert.equal(rectangle.elevation, 0);
  assert.equal(rectangle.vertices.length, 4);
  assert.equal(polylineSegments(rectangle).length, 4);
  assert.equal(polylineLength(rectangle), 480);
  assert.deepEqual(polylineCentroid(rectangle), { x: 72, y: 48 });
});

test("creates an elevated rectangle from exact dimensions in the cursor quadrant", () => {
  const rectangle = rectangleFromDimensions({ x: 120, y: 120 }, { x: 0, y: 0 }, 144, 96, 108);
  assert.ok(rectangle);
  assert.equal(rectangle.elevation, 108);
  assert.deepEqual(rectangle.vertices[2], { x: -24, y: 24 });
  assert.deepEqual(rectangleDimensions(rectangle.vertices[0], rectangle.vertices[2]), {
    area: 13_824,
    height: 96,
    perimeter: 480,
    width: 144,
  });
});

test("creates rotated rectangles from corners and exact dimensions", () => {
  const byCorners = rectangleFromCorners({ x: 0, y: 0 }, { x: 24, y: 120 }, 0, { rotation: 90 });
  assert.ok(byCorners);
  assert.deepEqual(byCorners.vertices, [{ x: 0, y: 0 }, { x: 0, y: 120 }, { x: 24, y: 120 }, { x: 24, y: 0 }]);
  assert.equal(rectangleSupportsConstrainedGrips(byCorners), true);

  const diagonal = rectangleFromDimensions({ x: 0, y: 0 }, null, 120, 24, 0, { rotation: 30 });
  assert.ok(diagonal);
  assert.equal(rectangleSupportsConstrainedGrips(diagonal), false);

  const byDimensions = rectangleFromDimensions({ x: 0, y: 0 }, { x: 24, y: 120 }, 120, 24, 0, { rotation: 90, width: 0.5 });
  assert.ok(byDimensions);
  assert.equal(byDimensions.width, 0.5);
  assert.equal(polylineArea(byDimensions), 2880);
});

test("creates area rectangles with a fixed length or width", () => {
  const fixedLength = rectangleFromArea({ x: 0, y: 0 }, null, 144 * 96, 144, "length");
  assert.ok(fixedLength);
  assert.equal(polylineArea(fixedLength), 144 * 96);
  assert.deepEqual(fixedLength.vertices[2], { x: 144, y: 96 });

  const fixedWidth = rectangleFromArea({ x: 0, y: 0 }, null, 144 * 96, 96, "width");
  assert.ok(fixedWidth);
  assert.deepEqual(fixedWidth.vertices[2], { x: 144, y: 96 });
});

test("creates chamfered and filleted rectangles as closed polylines", () => {
  const chamfered = rectangleFromDimensions({ x: 0, y: 0 }, null, 144, 96, 0, { chamferX: 6, chamferY: 12 });
  assert.ok(chamfered);
  assert.equal(chamfered.vertices.length, 8);
  assert.equal(chamfered.bulges?.every((bulge) => bulge === 0), true);
  assert.equal(rectangleSupportsConstrainedGrips(chamfered), false);

  const filleted = rectangleFromDimensions({ x: 0, y: 0 }, null, 144, 96, 0, { filletRadius: 12 });
  assert.ok(filleted);
  assert.equal(filleted.vertices.length, 8);
  assert.equal(filleted.bulges?.filter((bulge) => Math.abs(bulge) > 0).length, 4);
  assert.ok(Math.abs(polylineArea(filleted) - (144 * 96 - (4 - Math.PI) * 12 ** 2)) < 0.01);
  assert.equal(rectangleFromDimensions({ x: 0, y: 0 }, null, 144, 96, 0, { chamferX: 6, filletRadius: 12 }), null);
});

test("parses architectural rectangle dimension pairs", () => {
  assert.deepEqual(parseRectangleDimensionPair(`12' x 8'`), { width: 144, height: 96 });
  assert.deepEqual(parseRectangleDimensionPair(`3'-4 1/2" × 2'-0"`), { width: 40.5, height: 24 });
  assert.equal(parseRectangleDimensionPair(`12',8'`), null);
  assert.equal(parseRectangleDimensionPair(`12' x 0`), null);
});

test("provides rectangle corner, edge, and center grips", () => {
  const rectangle = rectangleFromCorners({ x: 0, y: 0 }, { x: 144, y: 96 }, 24);
  assert.ok(rectangle);
  const grips = rectangleGripPoints(rectangle);
  assert.equal(grips.length, 9);
  assert.deepEqual(grips[4], { grip: { index: 0, kind: "edge" }, point: { x: 72, y: 0 } });
  assert.deepEqual(grips[8], { grip: { kind: "center" }, point: { x: 72, y: 48 } });
});

test("rectangle grips preserve its shape and fixed opposite sides", () => {
  const rectangle = rectangleFromCorners({ x: 0, y: 0 }, { x: 144, y: 96 }, 24);
  assert.ok(rectangle);
  const corner = moveRectangleGrip(rectangle, { index: 2, kind: "corner" }, { x: 180, y: 120 });
  assert.ok(corner);
  assert.deepEqual(corner.vertices, [{ x: 0, y: 0 }, { x: 180, y: 0 }, { x: 180, y: 120 }, { x: 0, y: 120 }]);
  const edge = moveRectangleGrip(rectangle, { index: 1, kind: "edge" }, { x: 168, y: 48 });
  assert.ok(edge);
  assert.deepEqual(edge.vertices, [{ x: 0, y: 0 }, { x: 168, y: 0 }, { x: 168, y: 96 }, { x: 0, y: 96 }]);
  const moved = moveRectangleGrip(rectangle, { kind: "center" }, { x: 84, y: 72 });
  assert.ok(moved);
  assert.deepEqual(moved.vertices[0], { x: 12, y: 24 });
  assert.equal(moveRectangleGrip(rectangle, { index: 0, kind: "corner" }, { x: 144, y: 96 }), null);
});

test("moves a polyline vertex on the sixteenth-inch grid", () => {
  const geometry = { closed: false, elevation: 24, vertices: [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 12, y: 12 }] };
  const next = updatePolylineVertex(geometry, 1, { x: 12.04, y: 6.04 });
  assert.ok(next);
  assert.deepEqual(next.vertices[1], { x: 12.0625, y: 6.0625 });
  assert.equal(next.elevation, 24);
});

test("stores true arc segments as bulges and measures their curved length", () => {
  const bulge = polylineBulgeFromThreePoints({ x: 0, y: 0 }, { x: 12, y: 12 }, { x: 24, y: 0 });
  assert.ok(bulge);
  const polyline = { bulges: [bulge], closed: false, elevation: 0, vertices: [{ x: 0, y: 0 }, { x: 24, y: 0 }], width: 6 };
  assert.equal(polylineGeometryIsValid(polyline), true);
  assert.ok(polylineLength(polyline) > 24);
  const points = polylinePathPoints(polyline);
  assert.ok(points.length > 4);
  assert.deepEqual(points[0], { x: 0, y: 0 });
  assert.ok(Math.abs(points.at(-1)!.x - 24) < 1e-8);
});
