import assert from "node:assert/strict";
import test from "node:test";
import {
  ARC_METHODS,
  arcFromCenterStartAngle,
  arcFromCenterStartEnd,
  arcFromCenterStartLength,
  arcFromStartCenterAngle,
  arcFromStartCenterEnd,
  arcFromStartCenterLength,
  arcFromStartEndAngle,
  arcFromStartEndDirection,
  arcFromStartEndDirectionAngle,
  arcFromStartEndRadius,
  arcFromThreePoints,
  arcGripPoints,
  arcLength,
  arcPointAtFraction,
  arcSweepAngle,
  moveArcGrip,
} from "../lib/cad-arc.ts";

test("creates a counterclockwise semicircle from three snapped points", () => {
  const arc = arcFromThreePoints(
    { x: 0, y: 0, z: 24 },
    { x: 60, y: 60, z: 24 },
    { x: 120, y: 0, z: 24 },
  );
  assert.ok(arc);
  assert.deepEqual(arc.center, { x: 60, y: 0, z: 24 });
  assert.equal(arc.radius, 60);
  assert.equal(arcSweepAngle(arc), 180);
  assert.ok(Math.abs(arcLength(arc) - 60 * Math.PI) < 1e-9);
  assert.deepEqual(arcPointAtFraction(arc, 0.5), { x: 60, y: 60, z: 24 });
});

test("selects the sweep that passes through the second point", () => {
  const upper = arcFromThreePoints({ x: 0, y: 0, z: 0 }, { x: 60, y: 60, z: 0 }, { x: 120, y: 0, z: 0 });
  const lower = arcFromThreePoints({ x: 0, y: 0, z: 0 }, { x: 60, y: -60, z: 0 }, { x: 120, y: 0, z: 0 });
  assert.ok(upper && lower);
  assert.equal(arcPointAtFraction(upper, 0.5).y, 60);
  assert.equal(arcPointAtFraction(lower, 0.5).y, -60);
  assert.notEqual(upper.counterclockwise, lower.counterclockwise);
});

test("provides center, endpoint, and midpoint grips", () => {
  const arc = arcFromThreePoints({ x: 0, y: 0, z: 0 }, { x: 60, y: 60, z: 0 }, { x: 120, y: 0, z: 0 });
  assert.ok(arc);
  assert.deepEqual(arcGripPoints(arc).map(({ grip }) => grip), ["center", "start", "midpoint", "end"]);
  const moved = moveArcGrip(arc, "center", { x: 72, y: 24, z: 36 });
  assert.ok(moved);
  assert.deepEqual(moved.center, { x: 72, y: 24, z: 36 });
  assert.equal(moved.radius, arc.radius);
});

test("rejects collinear points and points on different elevations", () => {
  assert.equal(arcFromThreePoints({ x: 0, y: 0, z: 0 }, { x: 60, y: 0, z: 0 }, { x: 120, y: 0, z: 0 }), null);
  assert.equal(arcFromThreePoints({ x: 0, y: 0, z: 0 }, { x: 60, y: 60, z: 12 }, { x: 120, y: 0, z: 0 }), null);
});

test("defines the complete AutoCAD-style Arc method family", () => {
  assert.deepEqual(ARC_METHODS.map(({ method }) => method), [
    "three-point", "start-center-end", "start-center-angle", "start-center-length",
    "start-end-angle", "start-end-direction", "start-end-radius", "center-start-end",
    "center-start-angle", "center-start-length", "continue",
  ]);
});

test("constructs start-center and center-start Arc variants", () => {
  const center = { x: 0, y: 0, z: 24 };
  const start = { x: 60, y: 0, z: 24 };
  const end = { x: 0, y: 60, z: 24 };
  const byEnd = arcFromStartCenterEnd(start, center, end);
  const centerFirst = arcFromCenterStartEnd(center, start, end);
  const byAngle = arcFromStartCenterAngle(start, center, 90);
  const centerAngle = arcFromCenterStartAngle(center, start, 90);
  const byLength = arcFromStartCenterLength(start, center, Math.sqrt(60 ** 2 * 2));
  const centerLength = arcFromCenterStartLength(center, start, Math.sqrt(60 ** 2 * 2));
  for (const arc of [byEnd, centerFirst, byAngle, centerAngle, byLength, centerLength]) {
    assert.ok(arc);
    assert.equal(arc.radius, 60);
    assert.ok(Math.abs(arcSweepAngle(arc) - 90) < 1e-7);
  }
});

test("constructs start-end Arc variants from angle, tangent direction, and radius", () => {
  const start = { x: 0, y: 0, z: 0 };
  const end = { x: 120, y: 120, z: 0 };
  const byAngle = arcFromStartEndAngle(start, end, 90);
  const byDirection = arcFromStartEndDirection(start, end, { x: 24, y: 0, z: 0 });
  const byDirectionAngle = arcFromStartEndDirectionAngle(start, end, 0);
  for (const arc of [byAngle, byDirection, byDirectionAngle]) {
    assert.ok(arc);
    assert.ok(Math.abs(arc.radius - 120) < 1e-7);
    assert.ok(Math.abs(arcSweepAngle(arc) - 90) < 1e-7);
  }

  const byRadius = arcFromStartEndRadius({ x: 0, y: 0, z: 0 }, { x: 120, y: 0, z: 0 }, 60);
  assert.ok(byRadius);
  assert.equal(byRadius.radius, 60);
  assert.equal(arcSweepAngle(byRadius), 180);
});

test("rejects impossible method dimensions and tangent directions", () => {
  assert.equal(arcFromStartCenterLength({ x: 60, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 121), null);
  assert.equal(arcFromStartEndRadius({ x: 0, y: 0, z: 0 }, { x: 120, y: 0, z: 0 }, 59), null);
  assert.equal(arcFromStartEndDirection({ x: 0, y: 0, z: 0 }, { x: 120, y: 0, z: 0 }, { x: 24, y: 0, z: 0 }), null);
});
