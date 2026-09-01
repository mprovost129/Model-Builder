import assert from "node:assert/strict";
import test from "node:test";
import {
  acquireCadPoint,
  circularQuadrantPoints,
  circularIntersections,
  derivedSnapCandidates,
  extensionPointOnSegment,
  nearestPointOnSegment,
  nearestPointOnCircularCurve,
  parallelPointFromAnchor,
  perpendicularPointOnSegment,
  segmentIntersection,
  segmentCircularIntersections,
  snapPointToGridIncrement,
  tangentPointsFromAnchor,
  trackingCandidatesFromAcquiredPoints,
} from "../lib/cad-point-acquisition.ts";

const horizontal = { start: { x: 0, y: 0, z: 0 }, end: { x: 120, y: 0, z: 0 } };
const vertical = { start: { x: 60, y: -60, z: 0 }, end: { x: 60, y: 60, z: 0 } };

test("finds nearest, perpendicular, and intersection points on line segments", () => {
  assert.deepEqual(nearestPointOnSegment({ x: 48, y: 10, z: 0 }, horizontal), { x: 48, y: 0, z: 0 });
  assert.deepEqual(perpendicularPointOnSegment({ x: 72, y: 36, z: 0 }, horizontal), { x: 72, y: 0, z: 0 });
  assert.deepEqual(segmentIntersection(horizontal, vertical), { x: 60, y: 0, z: 0 });
});

test("gives object snaps priority over polar and grid tracking", () => {
  const result = acquireCadPoint({
    anchor: { x: 0, y: 0, z: 0 },
    candidates: [{ kind: "endpoint", point: { x: 120, y: 3, z: 0 } }],
    objectSnapEnabled: true,
    objectSnapModes: ["endpoint"],
    orthoEnabled: false,
    pointer: { x: 119, y: 2, z: 0 },
    polarAngles: [0, 90, 180, 270],
    polarEnabled: true,
  });
  assert.equal(result.snapKind, "endpoint");
  assert.deepEqual(result.point, { x: 120, y: 3, z: 0 });
});

test("supports always-on ortho and tolerance-based polar tracking", () => {
  const ortho = acquireCadPoint({
    anchor: { x: 0, y: 0, z: 0 }, candidates: [], objectSnapEnabled: false, objectSnapModes: [],
    orthoEnabled: true, pointer: { x: 80, y: 40, z: 0 }, polarAngles: [], polarEnabled: false,
  });
  assert.equal(ortho.snapKind, "ortho");
  assert.equal(ortho.point.y, 0);

  const polar = acquireCadPoint({
    anchor: { x: 0, y: 0, z: 0 }, candidates: [], objectSnapEnabled: false, objectSnapModes: [],
    orthoEnabled: false, pointer: { x: 70, y: 68, z: 0 }, polarAngles: [45], polarEnabled: true,
  });
  assert.equal(polar.snapKind, "polar");
  assert.equal(polar.point.x, polar.point.y);
});

test("derives enabled intersection, perpendicular, and nearest candidates", () => {
  const candidates = derivedSnapCandidates({
    anchor: { x: 30, y: 30, z: 0 },
    modes: ["intersection", "perpendicular", "nearest"],
    pointer: { x: 52, y: 4, z: 0 },
    segments: [horizontal, vertical],
  });
  assert.ok(candidates.some((candidate) => candidate.kind === "intersection"));
  assert.ok(candidates.some((candidate) => candidate.kind === "perpendicular"));
  assert.ok(candidates.some((candidate) => candidate.kind === "nearest"));
});

test("snaps to true circle quadrants, nearest points, and tangencies", () => {
  const circle = { center: { x: 0, y: 0, z: 0 }, radius: 60 };
  assert.deepEqual(circularQuadrantPoints(circle), [
    { x: 60, y: 0, z: 0 },
    { x: 0, y: 60, z: 0 },
    { x: -60, y: 0, z: 0 },
    { x: 0, y: -60, z: 0 },
  ]);
  assert.deepEqual(nearestPointOnCircularCurve({ x: 72, y: 0, z: 0 }, circle), { x: 60, y: 0, z: 0 });
  assert.deepEqual(tangentPointsFromAnchor({ x: 100, y: 0, z: 0 }, circle), [
    { x: 36, y: 48, z: 0 },
    { x: 36, y: -48, z: 0 },
  ]);
  assert.deepEqual(tangentPointsFromAnchor({ x: 30, y: 0, z: 0 }, circle), []);
});

test("limits circular snap points to an Arc sweep", () => {
  const arc = { center: { x: 0, y: 0, z: 0 }, radius: 60, startAngle: 0, endAngle: 90, counterclockwise: true };
  assert.deepEqual(circularQuadrantPoints(arc), [{ x: 60, y: 0, z: 0 }, { x: 0, y: 60, z: 0 }]);
  assert.deepEqual(nearestPointOnCircularCurve({ x: -60, y: 0, z: 0 }, arc), { x: 0, y: 60, z: 0 });
});

test("finds exact line-circle, circle-circle, and Arc-limited intersections", () => {
  const circle = { center: { x: 60, y: 0, z: 0 }, radius: 30 };
  assert.deepEqual(segmentCircularIntersections(horizontal, circle), [
    { x: 30, y: 0, z: 0 },
    { x: 90, y: 0, z: 0 },
  ]);
  assert.deepEqual(circularIntersections(
    { center: { x: 0, y: 0, z: 0 }, radius: 50 },
    { center: { x: 60, y: 0, z: 0 }, radius: 50 },
  ), [{ x: 30, y: 40, z: 0 }, { x: 30, y: -40, z: 0 }]);
  assert.deepEqual(segmentCircularIntersections(horizontal, { ...circle, startAngle: 0, endAngle: 90, counterclockwise: true }), [{ x: 90, y: 0, z: 0 }]);
});

test("acquires extension and parallel tracking points", () => {
  assert.deepEqual(extensionPointOnSegment({ x: 150, y: 3, z: 0 }, horizontal), { x: 150, y: 0, z: 0 });
  assert.equal(extensionPointOnSegment({ x: 60, y: 3, z: 0 }, horizontal), null);
  assert.deepEqual(parallelPointFromAnchor({ x: 0, y: 24, z: 0 }, { x: 70, y: 28, z: 0 }, horizontal), { x: 70, y: 24, z: 0 });
});

test("derives tangent, circular perpendicular, extension, and parallel candidates", () => {
  const candidates = derivedSnapCandidates({
    anchor: { x: 100, y: 0, z: 0 },
    circulars: [{ center: { x: 0, y: 0, z: 0 }, radius: 60 }],
    modes: ["tangent", "perpendicular", "extension", "parallel", "nearest"],
    pointer: { x: 148, y: 2, z: 0 },
    segments: [horizontal],
  });
  assert.ok(candidates.some((candidate) => candidate.kind === "tangent"));
  assert.ok(candidates.some((candidate) => candidate.kind === "perpendicular"));
  assert.ok(candidates.some((candidate) => candidate.kind === "extension"));
  assert.ok(candidates.some((candidate) => candidate.kind === "parallel"));
  assert.ok(candidates.some((candidate) => candidate.kind === "nearest"));
});

test("projects the cursor onto tracking paths acquired from snap points", () => {
  const candidates = trackingCandidatesFromAcquiredPoints({
    acquiredPoints: [{ x: 24, y: 36, z: 0 }],
    angles: [0, 90],
    pointer: { x: 100, y: 38, z: 0 },
  });
  assert.deepEqual(candidates, [{
    angle: 0,
    origin: { x: 24, y: 36, z: 0 },
    point: { x: 100, y: 36, z: 0 },
  }]);
});

test("cycles overlapping object snap candidates in distance order", () => {
  const common = {
    anchor: null,
    candidates: [
      { kind: "endpoint" as const, point: { x: 12, y: 12, z: 0 } },
      { kind: "intersection" as const, point: { x: 12, y: 12, z: 0 } },
    ],
    objectSnapEnabled: true,
    objectSnapModes: ["endpoint", "intersection"] as const,
    orthoEnabled: false,
    pointer: { x: 12, y: 12, z: 0 },
    polarAngles: [],
    polarEnabled: false,
  };
  const first = acquireCadPoint({ ...common, objectSnapModes: [...common.objectSnapModes] });
  const second = acquireCadPoint({ ...common, objectSnapCycleIndex: 1, objectSnapModes: [...common.objectSnapModes] });
  assert.equal(first.candidateCount, 2);
  assert.equal(first.snapKind, "endpoint");
  assert.equal(second.snapKind, "intersection");
});

test("uses acquired tracking after object snaps and before ordinary direction tracking", () => {
  const result = acquireCadPoint({
    anchor: { x: 0, y: 0, z: 0 },
    candidates: [],
    objectSnapEnabled: true,
    objectSnapModes: ["endpoint"],
    orthoEnabled: true,
    pointer: { x: 80, y: 38, z: 0 },
    polarAngles: [0, 90],
    polarEnabled: true,
    trackingCandidates: [{ angle: 0, origin: { x: 24, y: 36, z: 0 }, point: { x: 80, y: 36, z: 0 } }],
  });
  assert.equal(result.snapKind, "tracking");
  assert.deepEqual(result.guideOrigin, { x: 24, y: 36, z: 0 });
  assert.deepEqual(result.point, { x: 80, y: 36, z: 0 });
});

test("keeps display-independent cursor snapping on the selected increment", () => {
  assert.deepEqual(snapPointToGridIncrement({ x: 13.2, y: -8.8, z: 1 / 16 }, 3), { x: 12, y: -9, z: 1 / 16 });
  const result = acquireCadPoint({
    anchor: null,
    candidates: [],
    gridIncrement: 6,
    objectSnapEnabled: true,
    objectSnapModes: ["endpoint"],
    orthoEnabled: false,
    pointer: { x: 20.2, y: 27.1, z: 5 / 16 },
    polarAngles: [],
    polarEnabled: false,
  });
  assert.deepEqual(result.point, { x: 18, y: 30, z: 5 / 16 });
});

test("snaps tracked distance relative to an exact anchor", () => {
  const result = acquireCadPoint({
    anchor: { x: 1, y: 1, z: 0 },
    candidates: [],
    gridIncrement: 6,
    objectSnapEnabled: false,
    objectSnapModes: [],
    orthoEnabled: true,
    pointer: { x: 14.1, y: 2.2, z: 0 },
    polarAngles: [],
    polarEnabled: false,
  });
  assert.deepEqual(result.point, { x: 13, y: 1, z: 0 });
});
