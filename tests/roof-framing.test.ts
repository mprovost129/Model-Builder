import assert from "node:assert/strict";
import test from "node:test";
import {
  addLineObject,
  createRoofPlaneFromWall,
  createWallFromLine,
  joinRoofPlanes,
  NEW_PROJECT_DOCUMENT,
  roofPlaneGeometry,
  updateRoofPlane,
} from "../lib/document-model.ts";
import { roofFramingLayout } from "../lib/roof-framing.ts";

function rectangularRoofPlane() {
  const line = addLineObject(NEW_PROJECT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 240, y: 0, z: 0 });
  assert.ok(line);
  const wallDocument = createWallFromLine(line.document, line.line.id);
  assert.ok(wallDocument);
  const created = createRoofPlaneFromWall(wallDocument, line.line.id, 144);
  assert.ok(created);
  return created;
}

test("lays out discrete common rafters, fascia, and subfascia with gross lengths", () => {
  const created = rectangularRoofPlane();
  const layout = roofFramingLayout(created.document, created.roofPlane);
  assert.ok(layout);
  assert.equal(layout.scheduledStationCount, 16);
  assert.equal(layout.unsupportedStationCount, 0);
  assert.equal(layout.members.filter((member) => member.kind === "common-rafter").length, 16);
  assert.equal(layout.members.filter((member) => member.kind === "fascia").length, 1);
  assert.equal(layout.members.filter((member) => member.kind === "subfascia").length, 1);
  const firstRafter = layout.members.find((member) => member.kind === "common-rafter");
  assert.ok(firstRafter);
  assert.ok(Math.abs(firstRafter.grossLength - Math.hypot(156, 78)) < 1e-8);
  assert.equal(firstRafter.width, 1.5);
  assert.equal(firstRafter.depth, 9.25);
});

test("uses truss top-chord stations without claiming complete truss assemblies", () => {
  const created = rectangularRoofPlane();
  const updated = updateRoofPlane(created.document, created.roofPlane.id, { framingMethod: "trusses", framingSpacing: 24 });
  assert.ok(updated);
  const plane = updated.polylines.find((polyline) => polyline.id === created.roofPlane.id)!;
  const layout = roofFramingLayout(updated, plane);
  assert.ok(layout);
  assert.equal(layout.members.some((member) => member.kind === "common-rafter"), false);
  assert.equal(layout.members.filter((member) => member.kind === "truss-top-chord").length, layout.scheduledStationCount);
});

test("creates one owned ridge board for two joined opposing Roof Planes", () => {
  const created = rectangularRoofPlane();
  const first = created.roofPlane;
  const geometry = roofPlaneGeometry(first)!;
  const translate = (point: { x: number; y: number }, distance: number) => ({
    x: point.x + geometry.inwardNormal.x * distance,
    y: point.y + geometry.inwardNormal.y * distance,
  });
  const secondEaveStart = translate(geometry.eaveStart, 156);
  const secondEaveEnd = translate(geometry.eaveEnd, 156);
  const second = {
    ...structuredClone(first),
    id: "polyline-opposing-roof",
    name: "Opposing Roof Plane",
    roofBearingWallId: null,
    vertices: [
      secondEaveStart,
      secondEaveEnd,
      translate(secondEaveEnd, -geometry.totalDepth),
      translate(secondEaveStart, -geometry.totalDepth),
    ],
  };
  const joined = joinRoofPlanes({ ...created.document, polylines: [...created.document.polylines, second] }, first.id, second.id);
  assert.ok(joined);
  const ridgeBoards = joined.document.polylines.flatMap((plane) => roofFramingLayout(joined.document, plane)?.members.filter((member) => member.kind === "ridge-board") ?? []);
  assert.equal(ridgeBoards.length, 1);
  assert.equal(ridgeBoards[0].grossLength, 240);
  assert.equal(ridgeBoards[0].width, 1.5);
  assert.equal(ridgeBoards[0].depth, 11.25);
});
