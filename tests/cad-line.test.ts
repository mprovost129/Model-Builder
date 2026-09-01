import assert from "node:assert/strict";
import test from "node:test";
import { lineAngle, lineElevationAngle, lineFromDirection, lineFromLengthAngle, lineFromLengthAngles, lineLength, lineMidpoint, moveLineGrip, parseLineCoordinate, snapLineDirection } from "../lib/cad-line.ts";

test("calculates line length, angle, and midpoint", () => {
  const line = { start: { x: 0, y: 0, z: 0 }, end: { x: 36, y: 48, z: 0 } };
  assert.equal(lineLength(line), 60);
  assert.equal(lineAngle(line), 53.13);
  assert.deepEqual(lineMidpoint(line), { x: 18, y: 24, z: 0 });
});

test("creates snapped polar lines and edits all three grips", () => {
  const line = lineFromLengthAngle({ x: 0, y: 0 }, 120, 30);
  assert.ok(line);
  assert.equal(line.end.x * 16, Math.round(line.end.x * 16));
  assert.equal(line.end.y, 60);
  const movedEnd = moveLineGrip(line, "end", { x: 144, y: 0, z: 0 });
  assert.ok(movedEnd);
  assert.deepEqual(movedEnd.end, { x: 144, y: 0, z: 0 });
  const movedWhole = moveLineGrip(movedEnd, "midpoint", { x: 84, y: 12, z: 0 });
  assert.ok(movedWhole);
  assert.deepEqual(movedWhole.start, { x: 12, y: 12, z: 0 });
  assert.deepEqual(movedWhole.end, { x: 156, y: 12, z: 0 });
});

test("parses absolute and relative architectural line coordinates", () => {
  assert.deepEqual(parseLineCoordinate("12', 6'"), { x: 144, y: 72, z: 0 });
  assert.deepEqual(parseLineCoordinate("12', 6', 8'"), { x: 144, y: 72, z: 96 });
  assert.deepEqual(parseLineCoordinate("@2', -6\"", 0, { x: 120, y: 60, z: 24 }), { x: 144, y: 54, z: 24 });
  assert.equal(parseLineCoordinate("12'"), null);
});

test("tracks configured angles and draws typed lengths in the live direction", () => {
  const tracked = snapLineDirection(
    { x: 0, y: 0, z: 24 },
    { x: 119.9, y: 2, z: 24 },
    [0, 90, 180, 270],
  );
  assert.equal(tracked.angle, 0);
  assert.equal(tracked.point.y, 0);
  const line = lineFromDirection({ x: 0, y: 0, z: 24 }, tracked.point, 144);
  assert.ok(line);
  assert.deepEqual(line.end, { x: 144, y: 0, z: 24 });
});

test("supports true 3D line lengths", () => {
  const line = lineFromDirection({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 12 }, 130);
  assert.ok(line);
  assert.equal(lineLength(line), 130);
  assert.equal(line.end.z, 120);
  assert.equal(lineElevationAngle(line), 67.38);
  const polar3d = lineFromLengthAngles({ x: 0, y: 0, z: 24 }, 120, 90, 30);
  assert.ok(polar3d);
  assert.equal(polar3d.end.x, 0);
  assert.equal(polar3d.end.z, 84);
});
