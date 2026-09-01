import assert from "node:assert/strict";
import test from "node:test";
import {
  circleArea,
  circleCircumference,
  circleDiameter,
  circleFromCenterDiameter,
  circleFromCenterPoint,
  circleFromCenterRadius,
  circleFromDiameterPoints,
  circleFromThreePoints,
  circleFromThreeTangencies,
  circleFromTwoTangenciesRadius,
  circleGripPoints,
  moveCircleGrip,
} from "../lib/cad-circle.ts";

test("creates a snapped elevated circle from a center and edge point", () => {
  const circle = circleFromCenterPoint({ x: 12, y: -6, z: 108 }, { x: 72.04, y: -6, z: 108 });
  assert.ok(circle);
  assert.deepEqual(circle.center, { x: 12, y: -6, z: 108 });
  assert.equal(circle.radius, 60.0625);
  assert.equal(circleDiameter(circle), 120.125);
  assert.ok(Math.abs(circleCircumference(circle) - 2 * Math.PI * circle.radius) < 1e-8);
  assert.ok(Math.abs(circleArea(circle) - Math.PI * circle.radius ** 2) < 1e-8);
});

test("provides a center grip and four quadrant grips", () => {
  const circle = circleFromCenterRadius({ x: 24, y: 36, z: 8 }, 12);
  assert.ok(circle);
  assert.deepEqual(circleGripPoints(circle), [
    { grip: "center", point: { x: 24, y: 36, z: 8 } },
    { grip: "east", point: { x: 36, y: 36, z: 8 } },
    { grip: "north", point: { x: 24, y: 48, z: 8 } },
    { grip: "west", point: { x: 12, y: 36, z: 8 } },
    { grip: "south", point: { x: 24, y: 24, z: 8 } },
  ]);
});

test("creates circles from a center and diameter or two diameter endpoints", () => {
  assert.deepEqual(circleFromCenterDiameter({ x: 12, y: 18, z: 6 }, 48), {
    center: { x: 12, y: 18, z: 6 },
    radius: 24,
  });
  assert.deepEqual(circleFromDiameterPoints({ x: -24, y: 12, z: 8 }, { x: 48, y: 12, z: 8 }), {
    center: { x: 12, y: 12, z: 8 },
    radius: 36,
  });
});

test("creates the circumcircle through three non-collinear points", () => {
  assert.deepEqual(circleFromThreePoints(
    { x: 0, y: 24, z: 10 },
    { x: 24, y: 0, z: 10 },
    { x: 0, y: -24, z: 10 },
  ), {
    center: { x: 0, y: 0, z: 10 },
    radius: 24,
  });
  assert.equal(circleFromThreePoints(
    { x: 0, y: 0, z: 0 },
    { x: 12, y: 0, z: 0 },
    { x: 24, y: 0, z: 0 },
  ), null);
});

test("moves the center grip and resizes from any edge grip", () => {
  const circle = circleFromCenterRadius({ x: 0, y: 0, z: 18 }, 24);
  assert.ok(circle);
  const moved = moveCircleGrip(circle, "center", { x: 12.02, y: -6.02, z: 30 });
  assert.deepEqual(moved, { center: { x: 12, y: -6, z: 30 }, radius: 24 });
  const resized = moveCircleGrip(circle, "east", { x: 36.02, y: 0, z: 18 });
  assert.deepEqual(resized, { center: { x: 0, y: 0, z: 18 }, radius: 36 });
});

test("rejects collapsed or unsupported circle geometry", () => {
  assert.equal(circleFromCenterRadius({ x: 0, y: 0, z: 0 }, 0), null);
  assert.equal(circleFromCenterRadius({ x: 9_999_990, y: 0, z: 0 }, 24), null);
});

test("creates a Circle tangent to two selected lines at an exact radius", () => {
  const circle = circleFromTwoTangenciesRadius(
    { kind: "line", start: { x: 0, y: -100, z: 0 }, end: { x: 0, y: 100, z: 0 }, pick: { x: 0, y: 10, z: 0 } },
    { kind: "line", start: { x: -100, y: 0, z: 0 }, end: { x: 100, y: 0, z: 0 }, pick: { x: 10, y: 0, z: 0 } },
    10,
  );
  assert.deepEqual(circle, { center: { x: 10, y: 10, z: 0 }, radius: 10 });
});

test("creates a Circle tangent to a line and an existing Circle", () => {
  const circle = circleFromTwoTangenciesRadius(
    { kind: "circle", center: { x: 0, y: 0, z: 0 }, radius: 10, pick: { x: 10, y: 0, z: 0 } },
    { kind: "line", start: { x: 20, y: -100, z: 0 }, end: { x: 20, y: 100, z: 0 }, pick: { x: 20, y: 0, z: 0 } },
    5,
  );
  assert.deepEqual(circle, { center: { x: 15, y: 0, z: 0 }, radius: 5 });
});

test("creates the picked incircle tangent to three lines", () => {
  const circle = circleFromThreeTangencies(
    { kind: "line", start: { x: 0, y: 0, z: 0 }, end: { x: 0, y: 100, z: 0 }, pick: { x: 0, y: 30, z: 0 } },
    { kind: "line", start: { x: 0, y: 0, z: 0 }, end: { x: 100, y: 0, z: 0 }, pick: { x: 30, y: 0, z: 0 } },
    { kind: "line", start: { x: 100, y: 0, z: 0 }, end: { x: 0, y: 100, z: 0 }, pick: { x: 50, y: 50, z: 0 } },
  );
  assert.deepEqual(circle, { center: { x: 29.3125, y: 29.3125, z: 0 }, radius: 29.3125 });
});
