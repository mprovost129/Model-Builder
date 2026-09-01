import assert from "node:assert/strict";
import test from "node:test";
import { arcPointAtFraction } from "../lib/cad-arc.ts";
import { filletCurveGeometries, filletLineGeometries } from "../lib/cad-fillet.ts";

test("creates an exact tangent fillet between perpendicular Lines", () => {
  const result = filletLineGeometries(
    { start: { x: -10, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } },
    { start: { x: 0, y: -10, z: 0 }, end: { x: 0, y: 10, z: 0 } },
    { x: 8, y: 0, z: 0 },
    { x: 0, y: 8, z: 0 },
    2,
  );
  assert.ok(result);
  assert.deepEqual(result.first, { start: { x: 2, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } });
  assert.deepEqual(result.second, { start: { x: 0, y: 2, z: 0 }, end: { x: 0, y: 10, z: 0 } });
  assert.deepEqual(result.center, { x: 2, y: 2, z: 0 });
  assert.equal(result.arc?.radius, 2);
  assert.equal(result.arc?.counterclockwise, false);
  assert.deepEqual(arcPointAtFraction(result.arc!, 0), result.firstTangent);
  assert.deepEqual(arcPointAtFraction(result.arc!, 1), result.secondTangent);
});

test("radius zero cleans a corner without creating an Arc", () => {
  const result = filletLineGeometries(
    { start: { x: -8, y: 0, z: 0 }, end: { x: -2, y: 0, z: 0 } },
    { start: { x: 0, y: 4, z: 0 }, end: { x: 0, y: 10, z: 0 } },
    { x: -3, y: 0, z: 0 },
    { x: 0, y: 5, z: 0 },
    0,
  );
  assert.ok(result);
  assert.equal(result.arc, null);
  assert.deepEqual(result.first.end, { x: 0, y: 0, z: 0 });
  assert.deepEqual(result.second.start, { x: 0, y: 0, z: 0 });
});

test("retains exact off-grid tangent coordinates for angled geometry", () => {
  const result = filletLineGeometries(
    { start: { x: -20, y: 0, z: 0 }, end: { x: 20, y: 0, z: 0 } },
    { start: { x: -10, y: -10, z: 0 }, end: { x: 10, y: 10, z: 0 } },
    { x: 12, y: 0, z: 0 },
    { x: 8, y: 8, z: 0 },
    3,
  );
  assert.ok(result?.arc);
  assert.notEqual(result.firstTangent.x * 16, Math.round(result.firstTangent.x * 16));
  const firstRadius = Math.hypot(result.firstTangent.x - result.arc.center.x, result.firstTangent.y - result.arc.center.y);
  const secondRadius = Math.hypot(result.secondTangent.x - result.arc.center.x, result.secondTangent.y - result.arc.center.y);
  assert.ok(Math.abs(firstRadius - 3) < 1e-8);
  assert.ok(Math.abs(secondRadius - 3) < 1e-8);
});

test("rejects parallel, non-coplanar, and overlarge fillets", () => {
  const horizontal = { start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } };
  assert.equal(filletLineGeometries(horizontal, { start: { x: 0, y: 2, z: 0 }, end: { x: 10, y: 2, z: 0 } }, horizontal.start, { x: 1, y: 2, z: 0 }, 1), null);
  assert.equal(filletLineGeometries(horizontal, { start: { x: 0, y: 0, z: 1 }, end: { x: 0, y: 10, z: 1 } }, horizontal.end, { x: 0, y: 8, z: 1 }, 1), null);
  assert.equal(filletLineGeometries(horizontal, { start: { x: 0, y: 0, z: 0 }, end: { x: 0, y: 10, z: 0 } }, horizontal.end, { x: 0, y: 8, z: 0 }, 20), null);
});

test("creates an exact tangent Fillet between a Line and an Arc", () => {
  const result = filletCurveGeometries(
    { kind: "line", geometry: { start: { x: 0, y: 0, z: 0 }, end: { x: 20, y: 0, z: 0 } } },
    { kind: "arc", geometry: { center: { x: 10, y: 10, z: 0 }, radius: 5, startAngle: 180, endAngle: 0, counterclockwise: true } },
    { x: 0, y: 0, z: 0 },
    { x: 5, y: 10, z: 0 },
    2.5,
  );
  assert.ok(result);
  assert.deepEqual(result.firstTangent, { x: 10, y: 0, z: 0 });
  assert.deepEqual(result.secondTangent, { x: 10, y: 5, z: 0 });
  assert.deepEqual(result.arc.center, { x: 10, y: 2.5, z: 0 });
  assert.equal(result.first.kind, "line");
  assert.equal(result.second.kind, "arc");
  if (result.second.kind !== "arc") assert.fail("Expected an Arc result");
  assert.equal(result.second.geometry.endAngle, 270);
});

test("creates an exact tangent Fillet between two Arcs", () => {
  const result = filletCurveGeometries(
    { kind: "arc", geometry: { center: { x: 0, y: 0, z: 4 }, radius: 5, startAngle: 270, endAngle: 90, counterclockwise: true } },
    { kind: "arc", geometry: { center: { x: 15, y: 0, z: 4 }, radius: 5, startAngle: 90, endAngle: 270, counterclockwise: true } },
    { x: 0, y: -5, z: 4 },
    { x: 15, y: 5, z: 4 },
    2.5,
  );
  assert.ok(result);
  assert.deepEqual(result.firstTangent, { x: 5, y: 0, z: 4 });
  assert.deepEqual(result.secondTangent, { x: 10, y: 0, z: 4 });
  assert.deepEqual(result.arc.center, { x: 7.5, y: 0, z: 4 });
  assert.equal(result.first.kind, "arc");
  assert.equal(result.second.kind, "arc");
  if (result.first.kind !== "arc" || result.second.kind !== "arc") assert.fail("Expected Arc results");
  assert.equal(result.first.geometry.endAngle, 0);
  assert.equal(result.second.geometry.endAngle, 180);
});

test("rejects zero-radius, non-coplanar, and impossible curve Fillets", () => {
  const line = { kind: "line" as const, geometry: { start: { x: 0, y: 0, z: 0 }, end: { x: 20, y: 0, z: 0 } } };
  const arc = { kind: "arc" as const, geometry: { center: { x: 10, y: 10, z: 0 }, radius: 5, startAngle: 180, endAngle: 0, counterclockwise: true } };
  assert.equal(filletCurveGeometries(line, arc, line.geometry.start, { x: 5, y: 10, z: 0 }, 0), null);
  assert.equal(filletCurveGeometries(line, { ...arc, geometry: { ...arc.geometry, center: { ...arc.geometry.center, z: 1 } } }, line.geometry.start, { x: 5, y: 10, z: 1 }, 2.5), null);
  const concentric = { kind: "arc" as const, geometry: { ...arc.geometry, radius: 3 } };
  assert.equal(filletCurveGeometries(arc, concentric, { x: 5, y: 10, z: 0 }, { x: 7, y: 10, z: 0 }, 2), null);
});
