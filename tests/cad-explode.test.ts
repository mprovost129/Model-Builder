import assert from "node:assert/strict";
import test from "node:test";
import { explodePolylineGeometry } from "../lib/cad-explode.ts";

test("Explode converts an open Polyline into elevation-preserving Lines", () => {
  const pieces = explodePolylineGeometry({
    bulges: [0, 0],
    closed: false,
    elevation: 9,
    vertices: [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 12, y: 5 }],
    width: 0.25,
  });
  assert.deepEqual(pieces, [
    { kind: "line", geometry: { start: { x: 0, y: 0, z: 9 }, end: { x: 12, y: 0, z: 9 } } },
    { kind: "line", geometry: { start: { x: 12, y: 0, z: 9 }, end: { x: 12, y: 5, z: 9 } } },
  ]);
});

test("Explode includes the closing segment of a Rectangle", () => {
  const pieces = explodePolylineGeometry({
    closed: true,
    elevation: 0,
    vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 6 }, { x: 0, y: 6 }],
  });
  assert.equal(pieces?.length, 4);
  assert.deepEqual(pieces?.at(-1), {
    kind: "line",
    geometry: { start: { x: 0, y: 6, z: 0 }, end: { x: 0, y: 0, z: 0 } },
  });
});

test("Explode converts curved Polyline segments into exact native Arcs", () => {
  const pieces = explodePolylineGeometry({
    bulges: [1, 0],
    closed: false,
    elevation: 3,
    vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 15, y: 0 }],
  });
  assert.equal(pieces?.[0].kind, "arc");
  if (pieces?.[0].kind !== "arc") return;
  assert.deepEqual(pieces[0].geometry.center, { x: 5, y: 0, z: 3 });
  assert.equal(pieces[0].geometry.radius, 5);
  assert.equal(pieces[0].geometry.counterclockwise, true);
  assert.equal(pieces[1].kind, "line");
});

test("Explode rejects invalid Polyline geometry", () => {
  assert.equal(explodePolylineGeometry({
    closed: false,
    elevation: 0,
    vertices: [{ x: 0, y: 0 }, { x: 0, y: 0 }],
  }), null);
});
