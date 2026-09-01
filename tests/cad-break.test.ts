import assert from "node:assert/strict";
import test from "node:test";
import {
  breakArcAtPointGeometry,
  breakArcGeometry,
  breakCircleGeometry,
  breakLineAtPointGeometry,
  breakLineGeometry,
  breakPolylineAtPointGeometry,
  breakPolylineGeometry,
} from "../lib/cad-break.ts";
import { polylineLength, type PolylineGeometry } from "../lib/cad-polyline.ts";

test("Break at Point splits a Line into two native Lines", () => {
  const pieces = breakLineAtPointGeometry(
    { start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } },
    { x: 4, y: 1, z: 0 },
  );
  assert.deepEqual(pieces, [
    { start: { x: 0, y: 0, z: 0 }, end: { x: 4, y: 0, z: 0 } },
    { start: { x: 4, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } },
  ]);
});

test("Break removes the portion between two Line points", () => {
  const pieces = breakLineGeometry(
    { start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } },
    { x: 8, y: 2, z: 0 },
    { x: 3, y: -2, z: 0 },
  );
  assert.deepEqual(pieces, [
    { start: { x: 0, y: 0, z: 0 }, end: { x: 3, y: 0, z: 0 } },
    { start: { x: 8, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } },
  ]);
});

test("Break at Point rejects a Line endpoint", () => {
  assert.equal(breakLineAtPointGeometry(
    { start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } },
    { x: 0, y: 0, z: 0 },
  ), null);
});

test("Break at Point splits an Arc while retaining Arc geometry", () => {
  const pieces = breakArcAtPointGeometry(
    { center: { x: 0, y: 0, z: 0 }, radius: 10, startAngle: 0, endAngle: 180, counterclockwise: true },
    { x: 0, y: 10, z: 0 },
  );
  assert.equal(pieces?.length, 2);
  assert.equal(pieces?.[0].startAngle, 0);
  assert.equal(pieces?.[0].endAngle, 90);
  assert.equal(pieces?.[1].startAngle, 90);
  assert.equal(pieces?.[1].endAngle, 180);
});

test("Break removes the selected interval from a clockwise Arc", () => {
  const pieces = breakArcGeometry(
    { center: { x: 0, y: 0, z: 0 }, radius: 10, startAngle: 180, endAngle: 0, counterclockwise: false },
    { x: 0, y: 10, z: 0 },
    { x: Math.sqrt(50), y: Math.sqrt(50), z: 0 },
  );
  assert.equal(pieces?.length, 2);
  assert.equal(pieces?.[0].startAngle, 180);
  assert.equal(pieces?.[0].endAngle, 90);
  assert.equal(pieces?.[1].startAngle, 45);
  assert.equal(pieces?.[1].endAngle, 0);
  assert.equal(pieces?.every((piece) => !piece.counterclockwise), true);
});

test("Breaking a Circle converts the remainder into one native Arc", () => {
  const result = breakCircleGeometry(
    { center: { x: 0, y: 0, z: 0 }, radius: 5 },
    { x: 5, y: 0, z: 0 },
    { x: 0, y: 5, z: 0 },
  );
  assert.deepEqual(result, {
    center: { x: 0, y: 0, z: 0 },
    radius: 5,
    startAngle: 90,
    endAngle: 0,
    counterclockwise: true,
  });
});

test("Break at Point splits an open Polyline and preserves bulges and width", () => {
  const source: PolylineGeometry = {
    vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }],
    bulges: [0.5, 0],
    closed: false,
    elevation: 2,
    width: 0.25,
  };
  const pieces = breakPolylineAtPointGeometry(source, { x: 10, y: 0, z: 2 });
  assert.equal(pieces?.length, 2);
  assert.deepEqual(pieces?.[0].vertices, [{ x: 0, y: 0 }, { x: 10, y: 0 }]);
  assert.deepEqual(pieces?.[0].bulges, [0.5]);
  assert.deepEqual(pieces?.[1].vertices, [{ x: 10, y: 0 }, { x: 20, y: 0 }]);
  assert.equal(pieces?.every((piece) => piece.width === 0.25 && piece.elevation === 2), true);
});

test("Break removes the interval between two points on an open Polyline", () => {
  const source: PolylineGeometry = {
    vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }],
    bulges: [0, 0],
    closed: false,
    elevation: 0,
  };
  const pieces = breakPolylineGeometry(source, { x: 4, y: 0, z: 0 }, { x: 16, y: 0, z: 0 });
  assert.deepEqual(pieces?.map((piece) => piece.vertices), [
    [{ x: 0, y: 0 }, { x: 4, y: 0 }],
    [{ x: 16, y: 0 }, { x: 20, y: 0 }],
  ]);
});

test("Break opens a closed Polyline and keeps the path outside the directed interval", () => {
  const source: PolylineGeometry = {
    vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
    bulges: [0, 0, 0, 0],
    closed: true,
    elevation: 0,
  };
  const pieces = breakPolylineGeometry(source, { x: 5, y: 0, z: 0 }, { x: 10, y: 5, z: 0 });
  assert.equal(pieces?.length, 1);
  assert.equal(pieces?.[0].closed, false);
  assert.deepEqual(pieces?.[0].vertices, [{ x: 10, y: 5 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }, { x: 5, y: 0 }]);
  assert.equal(polylineLength(pieces![0]), 30);
});

test("Break at Point rejects a closed Polyline because one point cannot divide a loop", () => {
  assert.equal(breakPolylineAtPointGeometry({
    vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }],
    closed: true,
    elevation: 0,
  }, { x: 5, y: 0, z: 0 }), null);
});
