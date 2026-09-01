import assert from "node:assert/strict";
import test from "node:test";
import { moveBoxFace } from "../lib/box-model.ts";
import { arcFromThreePoints } from "../lib/cad-arc.ts";
import {
  addArcObject,
  addCircleObject,
  addLineObject,
  addPolylineObject,
  addRectangleObject,
  addLayer,
  addBoxObject,
  alignBoxObjects,
  assignObjectToLayer,
  assignModelEntityToStory,
  assignWallType,
  cloneDocument,
  copyBoxObjects,
  copyModelEntities,
  createBoundaryPolylineObject,
  createFloorPlatformFromPolyline,
  createWallFromLine,
  DEFAULT_DOCUMENT,
  NEW_PROJECT_DOCUMENT,
  deleteLayer,
  deleteBoxObject,
  deleteBoxObjects,
  deleteModelEntities,
  documentsEqual,
  discoverDocumentBoundary,
  duplicateBoxObject,
  findBoxObject,
  findGroup,
  breakModelEntity,
  explodeModelEntities,
  lengthenModelEntity,
  modelEntityLengthenEndpoints,
  joinModelEntities,
  chamferLineObjects,
  chamferPolylineObject,
  filletLineObjects,
  filletCurveObjects,
  filletPolylineObject,
  groupBoxObjects,
  mirrorModelEntities,
  extendModelEntity,
  offsetModelEntity,
  trimModelEntity,
  updateDocumentBuilding,
  moveBoxObject,
  moveBoxObjects,
  moveModelEntities,
  modelSelectionRotationBase,
  modelSelectionScaleBase,
  renameGroup,
  renameLayer,
  renameBoxObject,
  rotateBoxObjects,
  rotateModelEntities,
  scaleModelEntities,
  stretchModelEntities,
  updateLineGrip,
  updateLineObject,
  updateWallPlacement,
  updateCircleGrip,
  updateArcGrip,
  updatePolylineObjectVertex,
  selectionIdsForObject,
  setActiveLayer,
  setBoxObjectsLocked,
  setBoxObjectPosition,
  snapObjectMoveDistance,
  toggleLayerLock,
  toggleLayerVisibility,
  ungroupBoxObjects,
  updateBoxObject,
} from "../lib/document-model.ts";
import { addBuildingStory, calculateStoryElevations, cloneBuildingStructure } from "../lib/building-stories.ts";

test("clones documents without sharing nested geometry", () => {
  const clone = cloneDocument(DEFAULT_DOCUMENT);
  clone.objects[0].dimensions.length = 200;
  assert.equal(DEFAULT_DOCUMENT.objects[0].dimensions.length, 144);
  assert.equal(documentsEqual(DEFAULT_DOCUMENT, clone), false);
});

test("adds a uniquely named box beyond the current document bounds", () => {
  const result = addBoxObject(DEFAULT_DOCUMENT);
  assert.ok(result);
  assert.equal(result.document.objects.length, 2);
  assert.equal(result.object.id, "box-02");
  assert.equal(result.object.name, "Box 02");
  assert.equal(result.object.position.x, 168);
  assert.equal(findBoxObject(result.document, "box-02")?.id, "box-02");
});

test("updates only the selected box geometry", () => {
  const added = addBoxObject(DEFAULT_DOCUMENT);
  assert.ok(added);
  const selected = findBoxObject(added.document, "box-02");
  assert.ok(selected);
  const moved = moveBoxFace(selected, 0, 6);
  assert.ok(moved);
  const updated = updateBoxObject(added.document, selected.id, moved);
  assert.equal(updated.objects[0].dimensions.length, 144);
  assert.equal(updated.objects[1].dimensions.length, 150);
});

test("document equality includes object identity, names, order, and geometry", () => {
  assert.equal(documentsEqual(DEFAULT_DOCUMENT, cloneDocument(DEFAULT_DOCUMENT)), true);
  const renamed = cloneDocument(DEFAULT_DOCUMENT);
  renamed.objects[0].name = "Foundation";
  assert.equal(documentsEqual(DEFAULT_DOCUMENT, renamed), false);
});

test("sets exact signed positions on the sixteenth-inch grid", () => {
  const moved = setBoxObjectPosition(DEFAULT_DOCUMENT, "box-01", "x", -18.53);
  assert.ok(moved);
  assert.equal(moved.objects[0].position.x, -18.5);
  assert.equal(DEFAULT_DOCUMENT.objects[0].position.x, 0);
});

test("nudges one axis without changing dimensions or other coordinates", () => {
  const moved = moveBoxObject(DEFAULT_DOCUMENT, "box-01", "z", 6.04);
  assert.ok(moved);
  assert.equal(moved.objects[0].position.z, 6.0625);
  assert.equal(moved.objects[0].position.x, 0);
  assert.deepEqual(moved.objects[0].dimensions, DEFAULT_DOCUMENT.objects[0].dimensions);
  assert.equal(moveBoxObject(DEFAULT_DOCUMENT, "missing", "x", 6), null);
});

test("renames one object with trimmed, unique names", () => {
  const renamed = renameBoxObject(DEFAULT_DOCUMENT, "box-01", "  Foundation  ");
  assert.ok(renamed);
  assert.equal(renamed.objects[0].name, "Foundation");
  assert.equal(DEFAULT_DOCUMENT.objects[0].name, "Box 01");

  const added = addBoxObject(DEFAULT_DOCUMENT);
  assert.ok(added);
  assert.equal(renameBoxObject(added.document, "box-02", "Box 01"), null);
  assert.equal(renameBoxObject(DEFAULT_DOCUMENT, "box-01", "  "), null);
});

test("duplicates the selected object with a unique name and visible offset", () => {
  const renamed = renameBoxObject(DEFAULT_DOCUMENT, "box-01", "Foundation");
  assert.ok(renamed);
  const duplicated = duplicateBoxObject(renamed, "box-01");
  assert.ok(duplicated);
  assert.equal(duplicated.object.id, "box-02");
  assert.equal(duplicated.object.name, "Foundation Copy");
  assert.equal(duplicated.object.position.x, 24);
  assert.equal(duplicated.object.position.y, 24);
  assert.deepEqual(duplicated.object.dimensions, renamed.objects[0].dimensions);

  const duplicatedAgain = duplicateBoxObject(duplicated.document, "box-01");
  assert.ok(duplicatedAgain);
  assert.equal(duplicatedAgain.object.name, "Foundation Copy 2");
});

test("defines a blank new-project document with editable project defaults", () => {
  assert.deepEqual(NEW_PROJECT_DOCUMENT.objects, []);
  assert.deepEqual(NEW_PROJECT_DOCUMENT.lines, []);
  assert.deepEqual(NEW_PROJECT_DOCUMENT.polylines, []);
  assert.deepEqual(NEW_PROJECT_DOCUMENT.circles, []);
  assert.deepEqual(NEW_PROJECT_DOCUMENT.arcs, []);
  assert.equal(NEW_PROJECT_DOCUMENT.building.stories[0].name, "First Floor");
  assert.equal(NEW_PROJECT_DOCUMENT.building.wallTypes.length, 1);
  const added = addBoxObject(NEW_PROJECT_DOCUMENT);
  assert.ok(added);
  assert.equal(added.object.id, "box-01");
});

test("deletes a selected object and allows a blank model", () => {
  const blank = deleteBoxObject(DEFAULT_DOCUMENT, "box-01");
  assert.ok(blank);
  assert.deepEqual(blank.objects, []);
  const added = addBoxObject(DEFAULT_DOCUMENT);
  assert.ok(added);
  const deleted = deleteBoxObject(added.document, "box-01");
  assert.ok(deleted);
  assert.deepEqual(deleted.objects.map((object) => object.id), ["box-02"]);
  assert.equal(deleteBoxObject(added.document, "missing"), null);
});

test("creates layers, makes them current, and places new boxes on the current layer", () => {
  const addedLayer = addLayer(DEFAULT_DOCUMENT);
  assert.ok(addedLayer);
  assert.equal(addedLayer.layer.name, "Layer 1");
  assert.equal(addedLayer.document.activeLayerId, addedLayer.layer.id);
  const addedBox = addBoxObject(addedLayer.document);
  assert.ok(addedBox);
  assert.equal(addedBox.object.layerId, addedLayer.layer.id);
});

test("assigns objects and manages layer visibility, locking, names, and deletion", () => {
  const addedLayer = addLayer(DEFAULT_DOCUMENT);
  assert.ok(addedLayer);
  const assigned = assignObjectToLayer(
    addedLayer.document,
    "box-01",
    addedLayer.layer.id,
  );
  assert.ok(assigned);
  assert.equal(assigned.objects[0].layerId, addedLayer.layer.id);

  const defaultActive = setActiveLayer(assigned, "layer-default");
  assert.ok(defaultActive);
  const hidden = toggleLayerVisibility(defaultActive, addedLayer.layer.id);
  assert.ok(hidden);
  assert.equal(hidden.layers[1].visible, false);
  const locked = toggleLayerLock(hidden, addedLayer.layer.id);
  assert.ok(locked);
  assert.equal(locked.layers[1].locked, true);
  assert.equal(toggleLayerVisibility(defaultActive, "layer-default"), null);
  assert.equal(toggleLayerLock(defaultActive, "layer-default"), null);

  const renamed = renameLayer(defaultActive, addedLayer.layer.id, "Walls");
  assert.ok(renamed);
  assert.equal(renamed.layers[1].name, "Walls");
  assert.equal(deleteLayer(renamed, addedLayer.layer.id), null);

  const emptyLayer = addLayer(DEFAULT_DOCUMENT);
  assert.ok(emptyLayer);
  const currentDefault = setActiveLayer(emptyLayer.document, "layer-default");
  assert.ok(currentDefault);
  const deleted = deleteLayer(currentDefault, emptyLayer.layer.id);
  assert.ok(deleted);
  assert.equal(deleted.layers.length, 1);
});

test("snaps direct object movement to nearby aligned faces", () => {
  const added = addBoxObject(DEFAULT_DOCUMENT);
  assert.ok(added);
  const nearFace = snapObjectMoveDistance(added.document, "box-01", "x", 21.5);
  assert.deepEqual(nearFace, { distance: 24, snapped: true });

  const awayFromFaces = snapObjectMoveDistance(added.document, "box-01", "x", 10);
  assert.deepEqual(awayFromFaces, { distance: 10, snapped: false });
});

test("moves and aligns a multi-object selection using a primary anchor", () => {
  const second = addBoxObject(DEFAULT_DOCUMENT);
  assert.ok(second);
  const third = addBoxObject(second.document);
  assert.ok(third);
  const ids = ["box-01", "box-02"];

  const moved = moveBoxObjects(third.document, ids, "z", 18.03);
  assert.ok(moved);
  assert.equal(moved.objects[0].position.z, 18);
  assert.equal(moved.objects[1].position.z, 18);
  assert.equal(moved.objects[2].position.z, 0);

  const aligned = alignBoxObjects(moved, ids, "box-02", "x", "maximum");
  assert.ok(aligned);
  assert.equal(
    aligned.objects[0].position.x + aligned.objects[0].dimensions.length,
    aligned.objects[1].position.x + aligned.objects[1].dimensions.length,
  );
});

test("deletes multiple selected objects including every box", () => {
  const second = addBoxObject(DEFAULT_DOCUMENT);
  assert.ok(second);
  const third = addBoxObject(second.document);
  assert.ok(third);
  const deleted = deleteBoxObjects(third.document, ["box-01", "box-02"]);
  assert.ok(deleted);
  assert.deepEqual(deleted.objects.map((object) => object.id), ["box-03"]);
  const empty = deleteBoxObjects(second.document, ["box-01", "box-02"]);
  assert.ok(empty);
  assert.deepEqual(empty.objects, []);
});

test("copies one or more objects by an exact offset while preserving layers", () => {
  const second = addBoxObject(DEFAULT_DOCUMENT);
  assert.ok(second);
  const copied = copyBoxObjects(
    second.document,
    ["box-01", "box-02"],
    "y",
    30.03,
  );
  assert.ok(copied);
  assert.equal(copied.objects.length, 2);
  assert.deepEqual(copied.objects.map((object) => object.id), ["box-03", "box-04"]);
  assert.deepEqual(copied.objects.map((object) => object.name), ["Box 01 Copy", "Box 02 Copy"]);
  assert.equal(copied.objects[0].position.y, 30);
  assert.equal(copied.objects[1].position.y, 30);
  assert.equal(copied.objects[0].layerId, second.document.objects[0].layerId);
  assert.equal(copyBoxObjects(second.document, ["box-01"], "x", 0), null);
});

test("groups objects into one selection unit and supports group naming", () => {
  const added = addBoxObject(DEFAULT_DOCUMENT);
  assert.ok(added);
  const grouped = groupBoxObjects(added.document, ["box-01", "box-02"]);
  assert.ok(grouped);
  assert.equal(grouped.document.groups.length, 1);
  assert.deepEqual(selectionIdsForObject(grouped.document, "box-01"), ["box-01", "box-02"]);
  assert.equal(findGroup(grouped.document, grouped.group.id)?.name, "Group 01");

  const renamed = renameGroup(grouped.document, grouped.group.id, "Kitchen Island");
  assert.ok(renamed);
  assert.equal(renamed.groups[0].name, "Kitchen Island");
  assert.equal(groupBoxObjects(renamed, ["box-01", "box-02"]), null);

  const ungrouped = ungroupBoxObjects(renamed, grouped.group.id);
  assert.ok(ungrouped);
  assert.equal(ungrouped.groups.length, 0);
  assert.ok(ungrouped.objects.every((object) => object.groupId === null));
});

test("locked objects remain identifiable but reject geometry changes", () => {
  const added = addBoxObject(DEFAULT_DOCUMENT);
  assert.ok(added);
  const locked = setBoxObjectsLocked(added.document, ["box-01", "box-02"], true);
  assert.ok(locked);
  assert.ok(locked.objects.every((object) => object.locked));
  assert.equal(moveBoxObject(locked, "box-01", "x", 12), null);
  assert.equal(copyBoxObjects(locked, ["box-01"], "x", 12), null);
  assert.equal(deleteBoxObject(locked, "box-01"), null);
  assert.equal(renameBoxObject(locked, "box-01", "Locked Box"), null);

  const unlocked = setBoxObjectsLocked(locked, ["box-01", "box-02"], false);
  assert.ok(unlocked);
  assert.ok(moveBoxObject(unlocked, "box-01", "x", 12));
});

test("rotates one object or a group around the primary base point", () => {
  const added = addBoxObject(DEFAULT_DOCUMENT);
  assert.ok(added);
  const rotated = rotateBoxObjects(added.document, ["box-01", "box-02"], "box-01", 90, "center");
  assert.ok(rotated);
  assert.deepEqual(rotated.objects.map((object) => object.rotationZ), [90, 90]);
  assert.deepEqual(rotated.objects[0].position, { x: 120, y: -24, z: 0 });
  assert.deepEqual(rotated.objects[1].position, { x: 120, y: 144, z: 0 });

  const locked = setBoxObjectsLocked(rotated, ["box-01"], true);
  assert.ok(locked);
  assert.equal(rotateBoxObjects(locked, ["box-01"], "box-01", 45, "center"), null);
});

test("adds and edits first-class 3D line entities", () => {
  const boxNamedLikeLine = renameBoxObject(DEFAULT_DOCUMENT, "box-01", "Line 01");
  assert.ok(boxNamedLikeLine);
  const added = addLineObject(boxNamedLikeLine, { x: 0, y: 0, z: 24 }, { x: 144, y: 0, z: 24 });
  assert.ok(added);
  assert.equal(added.line.name, "Line 01 2");
  assert.equal(added.line.layerId, DEFAULT_DOCUMENT.activeLayerId);
  const reshaped = updateLineGrip(added.document, added.line.id, "end", { x: 144, y: 72, z: 48 });
  assert.ok(reshaped);
  assert.deepEqual(reshaped.lines[0].end, { x: 144, y: 72, z: 48 });
  const moved = updateLineGrip(reshaped, added.line.id, "midpoint", { x: 84, y: 48, z: 48 });
  assert.ok(moved);
  assert.deepEqual(moved.lines[0].start, { x: 12, y: 12, z: 36 });
});

test("adds closed rectangle polylines and edits their vertices", () => {
  const added = addRectangleObject(DEFAULT_DOCUMENT, { x: 0, y: 0 }, { x: 144, y: 96 });
  assert.ok(added);
  assert.equal(added.polyline.shape, "rectangle");
  assert.equal(added.polyline.closed, true);
  const edited = updatePolylineObjectVertex(added.document, added.polyline.id, 2, { x: 156, y: 108 });
  assert.ok(edited);
  assert.deepEqual(edited.polylines[0].vertices[2], { x: 156, y: 108 });
});

test("adds first-class Circle entities and edits center and quadrant grips", () => {
  const added = addCircleObject(DEFAULT_DOCUMENT, { center: { x: 24, y: 36, z: 96 }, radius: 48 });
  assert.ok(added);
  assert.equal(added.circle.name, "Circle 01");
  assert.equal(added.circle.layerId, DEFAULT_DOCUMENT.activeLayerId);

  const resized = updateCircleGrip(added.document, added.circle.id, "east", { x: 84, y: 36, z: 96 });
  assert.ok(resized);
  assert.equal(resized.circles[0].radius, 60);

  const moved = updateCircleGrip(resized, added.circle.id, "center", { x: -12, y: 18, z: 108 });
  assert.ok(moved);
  assert.deepEqual(moved.circles[0].center, { x: -12, y: 18, z: 108 });
  assert.equal(moved.circles[0].radius, 60);
});

test("adds first-class Arc entities and edits center and curve grips", () => {
  const geometry = arcFromThreePoints(
    { x: 0, y: 0, z: 96 },
    { x: 60, y: 60, z: 96 },
    { x: 120, y: 0, z: 96 },
  );
  assert.ok(geometry);
  const added = addArcObject(DEFAULT_DOCUMENT, geometry);
  assert.ok(added);
  assert.equal(added.arc.name, "Arc 01");
  assert.equal(added.arc.layerId, DEFAULT_DOCUMENT.activeLayerId);

  const moved = updateArcGrip(added.document, added.arc.id, "center", { x: 72, y: 12, z: 108 });
  assert.ok(moved);
  assert.deepEqual(moved.arcs[0].center, { x: 72, y: 12, z: 108 });

  const reshaped = updateArcGrip(moved, added.arc.id, "midpoint", { x: 72, y: 84, z: 108 });
  assert.ok(reshaped);
  assert.notDeepEqual(reshaped.arcs[0], moved.arcs[0]);
});

test("moves a mixed 2D and 3D selection with one snapped offset", () => {
  const lineResult = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 120, y: 0, z: 0 });
  assert.ok(lineResult);
  const rectangleResult = addRectangleObject(lineResult.document, { x: 0, y: 0 }, { x: 48, y: 36 });
  assert.ok(rectangleResult);
  const circleResult = addCircleObject(rectangleResult.document, { center: { x: 24, y: 24, z: 0 }, radius: 12 });
  assert.ok(circleResult);
  const arcGeometry = arcFromThreePoints(
    { x: 0, y: 0, z: 0 },
    { x: 12, y: 12, z: 0 },
    { x: 24, y: 0, z: 0 },
  );
  assert.ok(arcGeometry);
  const arcResult = addArcObject(circleResult.document, arcGeometry);
  assert.ok(arcResult);

  const moved = moveModelEntities(
    arcResult.document,
    [
      { kind: "box", id: "box-01" },
      { kind: "line", id: lineResult.line.id },
      { kind: "polyline", id: rectangleResult.polyline.id },
      { kind: "circle", id: circleResult.circle.id },
      { kind: "arc", id: arcResult.arc.id },
    ],
    { x: 12.03, y: -6.03, z: 3.03 },
  );

  assert.ok(moved);
  assert.deepEqual(moved.objects[0].position, { x: 12, y: -6, z: 3 });
  assert.deepEqual(moved.lines[0].start, { x: 12, y: -6, z: 3 });
  assert.deepEqual(moved.polylines[0].vertices[0], { x: 12, y: -6 });
  assert.equal(moved.polylines[0].elevation, 3);
  assert.deepEqual(moved.circles[0].center, { x: 36, y: 18, z: 3 });
  assert.deepEqual(moved.arcs[0].center, {
    x: arcResult.arc.center.x + 12,
    y: arcResult.arc.center.y - 6,
    z: arcResult.arc.center.z + 3,
  });
});

test("copies mixed entities with new identities and leaves sources unchanged", () => {
  const lineResult = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 24, y: 0, z: 0 });
  assert.ok(lineResult);
  const circleResult = addCircleObject(lineResult.document, { center: { x: 12, y: 12, z: 0 }, radius: 6 });
  assert.ok(circleResult);

  const copied = copyModelEntities(
    circleResult.document,
    [
      { kind: "line", id: lineResult.line.id },
      { kind: "circle", id: circleResult.circle.id },
    ],
    { x: 48, y: 24, z: 12 },
  );

  assert.ok(copied);
  assert.deepEqual(copied.refs.map((ref) => ref.kind), ["line", "circle"]);
  assert.equal(copied.document.lines.length, 2);
  assert.equal(copied.document.circles.length, 2);
  assert.deepEqual(copied.document.lines[0].start, { x: 0, y: 0, z: 0 });
  assert.deepEqual(copied.document.lines[1].start, { x: 48, y: 24, z: 12 });
  assert.deepEqual(copied.document.circles[1].center, { x: 60, y: 36, z: 12 });
  assert.notEqual(copied.document.lines[1].id, lineResult.line.id);
  assert.match(copied.document.lines[1].name, /Copy/);
});

test("deletes an editable mixed selection and can erase the final box", () => {
  const lineResult = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 24, y: 0, z: 0 });
  assert.ok(lineResult);
  const circleResult = addCircleObject(lineResult.document, { center: { x: 12, y: 12, z: 0 }, radius: 6 });
  assert.ok(circleResult);
  const deleted = deleteModelEntities(circleResult.document, [
    { kind: "line", id: lineResult.line.id },
    { kind: "circle", id: circleResult.circle.id },
  ]);
  assert.ok(deleted);
  assert.equal(deleted.lines.length, 0);
  assert.equal(deleted.circles.length, 0);
  assert.equal(deleted.objects.length, 1);
  const empty = deleteModelEntities(DEFAULT_DOCUMENT, [{ kind: "box", id: "box-01" }]);
  assert.ok(empty);
  assert.deepEqual(empty.objects, []);
});

test("derives a shared rotation base from mixed selection bounds", () => {
  const lineResult = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 24, y: 0, z: 0 });
  assert.ok(lineResult);
  const circleResult = addCircleObject(lineResult.document, { center: { x: 12, y: 12, z: 0 }, radius: 6 });
  assert.ok(circleResult);
  const base = modelSelectionRotationBase(circleResult.document, [
    { kind: "line", id: lineResult.line.id },
    { kind: "circle", id: circleResult.circle.id },
  ], "center");
  assert.deepEqual(base, { x: 12, y: 9, z: 0 });
});

test("rotates mixed 2D and 3D entities around one base point", () => {
  const lineResult = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 24, y: 0, z: 0 });
  assert.ok(lineResult);
  const rectangleResult = addRectangleObject(lineResult.document, { x: 0, y: 0 }, { x: 24, y: 12 });
  assert.ok(rectangleResult);
  const circleResult = addCircleObject(rectangleResult.document, { center: { x: 12, y: 0, z: 0 }, radius: 6 });
  assert.ok(circleResult);
  const arcGeometry = arcFromThreePoints(
    { x: 12, y: 0, z: 0 },
    { x: 18, y: 6, z: 0 },
    { x: 24, y: 0, z: 0 },
  );
  assert.ok(arcGeometry);
  const arcResult = addArcObject(circleResult.document, arcGeometry);
  assert.ok(arcResult);
  const rotated = rotateModelEntities(arcResult.document, [
    { kind: "box", id: "box-01" },
    { kind: "line", id: lineResult.line.id },
    { kind: "polyline", id: rectangleResult.polyline.id },
    { kind: "circle", id: circleResult.circle.id },
    { kind: "arc", id: arcResult.arc.id },
  ], { x: 0, y: 0, z: 0 }, 90);
  assert.ok(rotated);
  assert.equal(rotated.objects[0].rotationZ, 90);
  assert.deepEqual(rotated.lines[0].end, { x: 0, y: 24, z: 0 });
  assert.deepEqual(rotated.polylines[0].vertices[1], { x: 0, y: 24 });
  assert.deepEqual(rotated.circles[0].center, { x: 0, y: 12, z: 0 });
  assert.deepEqual(rotated.arcs[0].center, { x: 0, y: 18, z: 0 });
  assert.equal(rotateModelEntities(arcResult.document, [{ kind: "line", id: lineResult.line.id }], { x: 0, y: 0, z: 0 }, 0), null);
});

test("scales mixed entities uniformly in plan around one shared base point", () => {
  const lineResult = addLineObject(DEFAULT_DOCUMENT, { x: 6, y: 6, z: 12 }, { x: 18, y: 6, z: 12 });
  assert.ok(lineResult);
  const rectangleResult = addRectangleObject(lineResult.document, { x: 6, y: 6 }, { x: 18, y: 12 }, 12);
  assert.ok(rectangleResult);
  const circleResult = addCircleObject(rectangleResult.document, { center: { x: 12, y: 12, z: 12 }, radius: 3 });
  assert.ok(circleResult);
  const arcGeometry = arcFromThreePoints(
    { x: 12, y: 12, z: 12 },
    { x: 15, y: 15, z: 12 },
    { x: 18, y: 12, z: 12 },
  );
  assert.ok(arcGeometry);
  const arcResult = addArcObject(circleResult.document, arcGeometry);
  assert.ok(arcResult);
  const refs = [
    { kind: "line", id: lineResult.line.id },
    { kind: "polyline", id: rectangleResult.polyline.id },
    { kind: "circle", id: circleResult.circle.id },
    { kind: "arc", id: arcResult.arc.id },
  ] as const;
  const base = modelSelectionScaleBase(arcResult.document, [...refs], "corner-min-min");
  assert.deepEqual(base, { x: 6, y: 6, z: 12 });
  const scaled = scaleModelEntities(arcResult.document, [...refs], base!, 2);
  assert.ok(scaled);
  assert.deepEqual(scaled.lines[0].start, { x: 6, y: 6, z: 12 });
  assert.deepEqual(scaled.lines[0].end, { x: 30, y: 6, z: 12 });
  assert.deepEqual(scaled.polylines[0].vertices[2], { x: 30, y: 18 });
  assert.deepEqual(scaled.circles[0].center, { x: 18, y: 18, z: 12 });
  assert.equal(scaled.circles[0].radius, 6);
  assert.deepEqual(scaled.arcs[0].center, { x: 24, y: 18, z: 12 });
  assert.equal(scaled.arcs[0].radius, 6);
  assert.equal(scaleModelEntities(arcResult.document, [...refs], base!, 1), null);
});

test("scales box plan dimensions while preserving height and rejects locked selections", () => {
  const ref = { kind: "box" as const, id: "box-01" };
  const base = modelSelectionScaleBase(DEFAULT_DOCUMENT, [ref], "corner-min-min");
  assert.ok(base);
  const scaled = scaleModelEntities(DEFAULT_DOCUMENT, [ref], base, 0.5);
  assert.ok(scaled);
  assert.deepEqual(scaled.objects[0].dimensions, { length: 72, width: 48, height: 96 });
  assert.deepEqual(scaled.objects[0].position, { x: 0, y: 0, z: 0 });
  const locked = setBoxObjectsLocked(DEFAULT_DOCUMENT, [ref.id], true);
  assert.ok(locked);
  assert.equal(scaleModelEntities(locked, [ref], base, 2), null);
});

test("mirrors mixed native entities across a two-point axis", () => {
  const lineResult = addLineObject(DEFAULT_DOCUMENT, { x: 6, y: 3, z: 12 }, { x: 18, y: 3, z: 12 });
  assert.ok(lineResult);
  const rectangleResult = addRectangleObject(lineResult.document, { x: 6, y: 6 }, { x: 18, y: 12 }, 12);
  assert.ok(rectangleResult);
  const circleResult = addCircleObject(rectangleResult.document, { center: { x: 9, y: 6, z: 12 }, radius: 3 });
  assert.ok(circleResult);
  const arcGeometry = arcFromThreePoints(
    { x: 6, y: 12, z: 12 },
    { x: 9, y: 15, z: 12 },
    { x: 12, y: 12, z: 12 },
  );
  assert.ok(arcGeometry);
  const arcResult = addArcObject(circleResult.document, arcGeometry);
  assert.ok(arcResult);
  const refs = [
    { kind: "box" as const, id: "box-01" },
    { kind: "line" as const, id: lineResult.line.id },
    { kind: "polyline" as const, id: rectangleResult.polyline.id },
    { kind: "circle" as const, id: circleResult.circle.id },
    { kind: "arc" as const, id: arcResult.arc.id },
  ];
  const mirrored = mirrorModelEntities(
    arcResult.document,
    refs,
    { x: 0, y: -24, z: 0 },
    { x: 0, y: 24, z: 0 },
    false,
  );
  assert.ok(mirrored);
  assert.deepEqual(mirrored.refs, refs);
  assert.deepEqual(mirrored.document.lines[0].start, { x: -6, y: 3, z: 12 });
  assert.deepEqual(mirrored.document.polylines[0].vertices[2], { x: -18, y: 12 });
  assert.deepEqual(mirrored.document.circles[0].center, { x: -9, y: 6, z: 12 });
  assert.deepEqual(mirrored.document.arcs[0].center, { x: -9, y: 12, z: 12 });
  assert.equal(mirrored.document.arcs[0].counterclockwise, !arcResult.arc.counterclockwise);
  assert.deepEqual(mirrored.document.objects[0].position, { x: 0, y: 96, z: 0 });
  assert.equal(mirrored.document.objects[0].rotationZ, -180);
});

test("keeps source entities when creating mirrored copies", () => {
  const lineResult = addLineObject(DEFAULT_DOCUMENT, { x: 6, y: 3, z: 0 }, { x: 18, y: 3, z: 0 });
  assert.ok(lineResult);
  const mirrored = mirrorModelEntities(
    lineResult.document,
    [{ kind: "line", id: lineResult.line.id }],
    { x: 0, y: -24, z: 0 },
    { x: 0, y: 24, z: 0 },
    true,
  );
  assert.ok(mirrored);
  assert.equal(mirrored.document.lines.length, 2);
  assert.deepEqual(mirrored.document.lines[0].start, { x: 6, y: 3, z: 0 });
  assert.deepEqual(mirrored.document.lines[1].start, { x: -6, y: 3, z: 0 });
  assert.match(mirrored.document.lines[1].name, /Mirror/);
  assert.notEqual(mirrored.refs[0].id, lineResult.line.id);
  assert.equal(mirrorModelEntities(lineResult.document, [{ kind: "line", id: lineResult.line.id }], { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, true), null);
});

test("creates a native Offset copy on the selected side", () => {
  const lineResult = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 12 }, { x: 24, y: 0, z: 12 });
  assert.ok(lineResult);
  const offset = offsetModelEntity(
    lineResult.document,
    { kind: "line", id: lineResult.line.id },
    6,
    { x: 12, y: 12 },
    true,
  );
  assert.ok(offset);
  assert.equal(offset.document.lines.length, 2);
  assert.deepEqual(offset.document.lines[0].start, { x: 0, y: 0, z: 12 });
  assert.deepEqual(offset.document.lines[1].start, { x: 0, y: 6, z: 12 });
  assert.match(offset.document.lines[1].name, /Offset/);
  assert.notEqual(offset.ref.id, lineResult.line.id);
});

test("can replace a Rectangle with an inward Offset and rejects boxes", () => {
  const rectangleResult = addRectangleObject(DEFAULT_DOCUMENT, { x: 0, y: 0 }, { x: 24, y: 12 }, 0);
  assert.ok(rectangleResult);
  const ref = { kind: "polyline" as const, id: rectangleResult.polyline.id };
  const offset = offsetModelEntity(rectangleResult.document, ref, 2, { x: 12, y: 6 }, false);
  assert.ok(offset);
  assert.deepEqual(offset.ref, ref);
  assert.deepEqual(offset.document.polylines[0].vertices, [
    { x: 2, y: 2 },
    { x: 22, y: 2 },
    { x: 22, y: 10 },
    { x: 2, y: 10 },
  ]);
  assert.equal(offsetModelEntity(DEFAULT_DOCUMENT, { kind: "box", id: "box-01" }, 2, { x: 0, y: 0 }, true), null);
});

test("trims a selected Line into native pieces using other visible entities as boundaries", () => {
  const target = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 });
  assert.ok(target);
  const firstBoundary = addLineObject(target.document, { x: 3, y: -5, z: 0 }, { x: 3, y: 5, z: 0 });
  assert.ok(firstBoundary);
  const secondBoundary = addLineObject(firstBoundary.document, { x: 7, y: -5, z: 0 }, { x: 7, y: 5, z: 0 });
  assert.ok(secondBoundary);
  const trimmed = trimModelEntity(secondBoundary.document, { kind: "line", id: target.line.id }, { x: 5, y: 0, z: 0 });
  assert.ok(trimmed);
  assert.equal(trimmed.refs.length, 2);
  const pieces = trimmed.refs.map((ref) => trimmed.document.lines.find((line) => line.id === ref.id));
  assert.deepEqual(pieces.map((line) => line && [line.start.x, line.end.x]), [[0, 3], [7, 10]]);
});

test("Break at Point splits a Line as one stable document edit", () => {
  const added = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 12, y: 0, z: 0 });
  assert.ok(added);
  const broken = breakModelEntity(added.document, { kind: "line", id: added.line.id }, { x: 5, y: 2, z: 0 }, null);
  assert.ok(broken);
  assert.deepEqual(broken.refs.map((ref) => ref.kind), ["line", "line"]);
  assert.equal(broken.refs[0].id, added.line.id);
  assert.deepEqual(broken.document.lines.map((line) => [line.start.x, line.end.x]), [[0, 5], [5, 12]]);
  assert.match(broken.document.lines[1].name, /Break/);
});

test("Break removes a Polyline interval and converts a broken Circle to an Arc", () => {
  const rectangle = addRectangleObject(DEFAULT_DOCUMENT, { x: 0, y: 0 }, { x: 10, y: 10 }, 0);
  assert.ok(rectangle);
  const opened = breakModelEntity(
    rectangle.document,
    { kind: "polyline", id: rectangle.polyline.id },
    { x: 2, y: 0, z: 0 },
    { x: 8, y: 0, z: 0 },
  );
  assert.ok(opened);
  assert.equal(opened.document.polylines[0].closed, false);
  assert.equal(opened.document.polylines[0].shape, "polyline");

  const circle = addCircleObject(DEFAULT_DOCUMENT, { center: { x: 0, y: 0, z: 0 }, radius: 10 });
  assert.ok(circle);
  const brokenCircle = breakModelEntity(
    circle.document,
    { kind: "circle", id: circle.circle.id },
    { x: 10, y: 0, z: 0 },
    { x: 0, y: 10, z: 0 },
  );
  assert.ok(brokenCircle);
  assert.equal(brokenCircle.document.circles.length, 0);
  assert.equal(brokenCircle.document.arcs.length, 1);
  assert.equal(brokenCircle.refs[0].kind, "arc");
});

test("Break rejects protected targets and one-point breaks on closed curves", () => {
  const rectangle = addRectangleObject(DEFAULT_DOCUMENT, { x: 0, y: 0 }, { x: 10, y: 10 }, 0);
  assert.ok(rectangle);
  assert.equal(breakModelEntity(rectangle.document, { kind: "polyline", id: rectangle.polyline.id }, { x: 5, y: 0, z: 0 }, null), null);
  const locked = cloneDocument(rectangle.document);
  locked.polylines[0].locked = true;
  assert.equal(breakModelEntity(locked, { kind: "polyline", id: rectangle.polyline.id }, { x: 2, y: 0, z: 0 }, { x: 8, y: 0, z: 0 }), null);
});

test("Join combines compatible selected Lines and preserves the primary identity and layer", () => {
  const first = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 });
  assert.ok(first);
  const second = addLineObject(first.document, { x: 10, y: 0, z: 0 }, { x: 20, y: 0, z: 0 });
  assert.ok(second);
  const refs = [{ kind: "line" as const, id: first.line.id }, { kind: "line" as const, id: second.line.id }];
  const joined = joinModelEntities(second.document, refs, refs[1]);
  assert.ok(joined);
  assert.deepEqual(joined.ref, refs[1]);
  assert.equal(joined.document.lines.length, 1);
  assert.equal(joined.document.lines[0].name, second.line.name);
  assert.deepEqual([joined.document.lines[0].start.x, joined.document.lines[0].end.x].sort((a, b) => a - b), [0, 20]);
});

test("Join creates one native Polyline from connected straight and curved entities", () => {
  const line = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 });
  assert.ok(line);
  const arc = addArcObject(line.document, { center: { x: 10, y: 5, z: 0 }, radius: 5, startAngle: 270, endAngle: 0, counterclockwise: true });
  assert.ok(arc);
  const joined = joinModelEntities(arc.document, [
    { kind: "line", id: line.line.id },
    { kind: "arc", id: arc.arc.id },
  ], { kind: "line", id: line.line.id });
  assert.ok(joined);
  assert.equal(joined.ref.kind, "polyline");
  assert.equal(joined.document.lines.length, 0);
  assert.equal(joined.document.arcs.length, 0);
  assert.equal(joined.document.polylines.length, 1);
  assert.equal(joined.document.polylines[0].bulges?.length, 2);
  assert.notEqual(joined.document.polylines[0].bulges?.[1], 0);
});

test("Join rejects gaps, closed Polylines, and locked selections", () => {
  const first = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 });
  assert.ok(first);
  const second = addLineObject(first.document, { x: 6, y: 0, z: 0 }, { x: 10, y: 0, z: 0 });
  assert.ok(second);
  const refs = [{ kind: "line" as const, id: first.line.id }, { kind: "line" as const, id: second.line.id }];
  assert.equal(joinModelEntities(second.document, refs), null);
  const locked = cloneDocument(second.document);
  locked.lines[0].locked = true;
  assert.equal(joinModelEntities(locked, refs), null);

  const rectangle = addRectangleObject(DEFAULT_DOCUMENT, { x: 0, y: 0 }, { x: 10, y: 10 }, 0);
  assert.ok(rectangle);
  assert.equal(joinModelEntities(rectangle.document, [{ kind: "polyline", id: rectangle.polyline.id }, { kind: "line", id: "missing" }]), null);
});

test("Explode replaces a Rectangle with native Lines while preserving source properties", () => {
  const layer = addLayer(DEFAULT_DOCUMENT, "Walls");
  assert.ok(layer);
  const active = setActiveLayer(layer.document, layer.layer.id);
  assert.ok(active);
  const rectangle = addRectangleObject(active, { x: 0, y: 0 }, { x: 12, y: 8 }, 6);
  assert.ok(rectangle);
  const exploded = explodeModelEntities(rectangle.document, [{ kind: "polyline", id: rectangle.polyline.id }]);
  assert.ok(exploded);
  assert.equal(exploded.document.polylines.length, 0);
  assert.equal(exploded.document.lines.length, 4);
  assert.equal(exploded.refs.length, 4);
  assert.ok(exploded.refs.every((ref) => ref.kind === "line"));
  assert.ok(exploded.document.lines.every((line) => line.layerId === layer.layer.id));
  assert.ok(exploded.document.lines.every((line) => line.start.z === 6 && line.end.z === 6));
});

test("Explode creates native Arcs for curved Polyline segments and drops Polyline width", () => {
  const polyline = addPolylineObject(DEFAULT_DOCUMENT, {
    bulges: [1, 0],
    closed: false,
    elevation: 2,
    vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 15, y: 0 }],
    width: 0.5,
  });
  assert.ok(polyline);
  const exploded = explodeModelEntities(polyline.document, [{ kind: "polyline", id: polyline.polyline.id }]);
  assert.ok(exploded);
  assert.equal(exploded.document.polylines.length, 0);
  assert.equal(exploded.document.arcs.length, 1);
  assert.equal(exploded.document.lines.length, 1);
  assert.equal(exploded.document.arcs[0].center.z, 2);
  assert.equal("width" in exploded.document.arcs[0], false);
  assert.equal("width" in exploded.document.lines[0], false);
});

test("Explode handles multiple Polylines atomically and rejects protected or mixed selections", () => {
  const first = addRectangleObject(DEFAULT_DOCUMENT, { x: 0, y: 0 }, { x: 4, y: 3 }, 0);
  assert.ok(first);
  const second = addPolylineObject(first.document, {
    closed: false,
    elevation: 0,
    vertices: [{ x: 10, y: 0 }, { x: 15, y: 0 }],
  });
  assert.ok(second);
  const exploded = explodeModelEntities(second.document, [
    { kind: "polyline", id: first.polyline.id },
    { kind: "polyline", id: second.polyline.id },
  ]);
  assert.ok(exploded);
  assert.equal(exploded.document.polylines.length, 0);
  assert.equal(exploded.document.lines.length, 5);

  const locked = cloneDocument(second.document);
  locked.polylines[0].locked = true;
  assert.equal(explodeModelEntities(locked, [{ kind: "polyline", id: first.polyline.id }]), null);
  assert.equal(explodeModelEntities(second.document, [{ kind: "line", id: "missing" }]), null);
});

test("Lengthen edits a selected Line endpoint as one stable document operation", () => {
  const added = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 2 }, { x: 10, y: 0, z: 2 });
  assert.ok(added);
  const ref = { kind: "line" as const, id: added.line.id };
  assert.deepEqual(modelEntityLengthenEndpoints(added.document, ref), { start: added.line.start, end: added.line.end });
  const changed = lengthenModelEntity(added.document, ref, "end", { method: "total", value: 18 });
  assert.ok(changed);
  assert.equal(changed.document.lines[0].end.x, 18);
  assert.equal(changed.document.lines[0].id, added.line.id);
  assert.equal(changed.document.lines[0].layerId, added.line.layerId);
});

test("Lengthen supports Arc and open Polyline endpoints but rejects closed or locked curves", () => {
  const arc = addArcObject(DEFAULT_DOCUMENT, { center: { x: 0, y: 0, z: 0 }, radius: 10, startAngle: 0, endAngle: 90, counterclockwise: true });
  assert.ok(arc);
  const arcRef = { kind: "arc" as const, id: arc.arc.id };
  const changedArc = lengthenModelEntity(arc.document, arcRef, "end", { method: "percent", value: 200 });
  assert.equal(changedArc?.document.arcs[0].endAngle, 180);

  const polyline = addPolylineObject(DEFAULT_DOCUMENT, { closed: false, elevation: 0, vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }] });
  assert.ok(polyline);
  const polylineRef = { kind: "polyline" as const, id: polyline.polyline.id };
  assert.equal(lengthenModelEntity(polyline.document, polylineRef, "end", { method: "delta", value: 5 })?.document.polylines[0].vertices.at(-1)?.y, 15);

  const rectangle = addRectangleObject(DEFAULT_DOCUMENT, { x: 0, y: 0 }, { x: 10, y: 10 }, 0);
  assert.ok(rectangle);
  assert.equal(lengthenModelEntity(rectangle.document, { kind: "polyline", id: rectangle.polyline.id }, "end", { method: "delta", value: 1 }), null);
  const locked = cloneDocument(polyline.document);
  locked.polylines[0].locked = true;
  assert.equal(lengthenModelEntity(locked, polylineRef, "end", { method: "delta", value: 1 }), null);
});

test("extends the selected Line endpoint to the first visible boundary", () => {
  const target = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 });
  assert.ok(target);
  const boundary = addLineObject(target.document, { x: 15, y: -5, z: 0 }, { x: 15, y: 5, z: 0 });
  assert.ok(boundary);
  const extended = extendModelEntity(boundary.document, { kind: "line", id: target.line.id }, { x: 10, y: 0, z: 0 });
  assert.ok(extended);
  assert.deepEqual(extended.document.lines.find((line) => line.id === target.line.id)?.end, { x: 15, y: 0, z: 0 });
});

test("fillets two Lines as one stable document edit", () => {
  const first = addLineObject(DEFAULT_DOCUMENT, { x: -10, y: 0, z: 0 }, { x: 10, y: 0, z: 0 });
  assert.ok(first);
  const second = addLineObject(first.document, { x: 0, y: -10, z: 0 }, { x: 0, y: 10, z: 0 });
  assert.ok(second);
  const filleted = filletLineObjects(
    second.document,
    { id: first.line.id, point: { x: 8, y: 0, z: 0 } },
    { id: second.line.id, point: { x: 0, y: 8, z: 0 } },
    2,
  );
  assert.ok(filleted);
  assert.deepEqual(filleted.refs.map((ref) => ref.kind), ["line", "line", "arc"]);
  assert.deepEqual(filleted.document.lines.map((line) => line.id), [first.line.id, second.line.id]);
  assert.deepEqual(filleted.document.lines[0].start, { x: 2, y: 0, z: 0 });
  assert.deepEqual(filleted.document.lines[1].start, { x: 0, y: 2, z: 0 });
  assert.equal(filleted.document.arcs[0].name, "Fillet 01");
});

test("fillets a Line and Arc as one stable mixed-curve document edit", () => {
  const line = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 20, y: 0, z: 0 });
  assert.ok(line);
  const sourceArc = addArcObject(line.document, { center: { x: 10, y: 10, z: 0 }, radius: 5, startAngle: 180, endAngle: 0, counterclockwise: true });
  assert.ok(sourceArc);
  const result = filletCurveObjects(
    sourceArc.document,
    { id: line.line.id, kind: "line", point: { x: 0, y: 0, z: 0 } },
    { id: sourceArc.arc.id, kind: "arc", point: { x: 5, y: 10, z: 0 } },
    2.5,
  );
  assert.ok(result);
  assert.deepEqual(result.refs.map((ref) => ref.kind), ["line", "arc", "arc"]);
  assert.equal(result.document.lines[0].id, line.line.id);
  assert.equal(result.document.arcs[0].id, sourceArc.arc.id);
  assert.equal(result.document.arcs[0].endAngle, 270);
  assert.deepEqual(result.document.arcs[1].center, { x: 10, y: 2.5, z: 0 });
});

test("fillets two Arcs while preserving source IDs and protecting locked curves", () => {
  const first = addArcObject(DEFAULT_DOCUMENT, { center: { x: 0, y: 0, z: 4 }, radius: 5, startAngle: 270, endAngle: 90, counterclockwise: true });
  assert.ok(first);
  const second = addArcObject(first.document, { center: { x: 15, y: 0, z: 4 }, radius: 5, startAngle: 90, endAngle: 270, counterclockwise: true });
  assert.ok(second);
  const picks = [
    { id: first.arc.id, kind: "arc" as const, point: { x: 0, y: -5, z: 4 } },
    { id: second.arc.id, kind: "arc" as const, point: { x: 15, y: 5, z: 4 } },
  ] as const;
  const result = filletCurveObjects(second.document, picks[0], picks[1], 2.5);
  assert.ok(result);
  assert.deepEqual(result.document.arcs.slice(0, 2).map((arc) => arc.id), [first.arc.id, second.arc.id]);
  assert.deepEqual(result.document.arcs[2].center, { x: 7.5, y: 0, z: 4 });

  const locked = cloneDocument(second.document);
  locked.arcs[0].locked = true;
  assert.equal(filletCurveObjects(locked, picks[0], picks[1], 2.5), null);
});

test("chamfers two Lines with separate setbacks as one stable document edit", () => {
  const first = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 });
  assert.ok(first);
  const second = addLineObject(first.document, { x: 0, y: 0, z: 0 }, { x: 0, y: 10, z: 0 });
  assert.ok(second);
  const chamfered = chamferLineObjects(
    second.document,
    { id: first.line.id, point: { x: 8, y: 0, z: 0 } },
    { id: second.line.id, point: { x: 0, y: 8, z: 0 } },
    2,
    3,
  );
  assert.ok(chamfered);
  assert.deepEqual(chamfered.refs.map((ref) => ref.kind), ["line", "line", "line"]);
  assert.deepEqual(chamfered.document.lines.slice(0, 2).map((line) => line.id), [first.line.id, second.line.id]);
  assert.deepEqual(chamfered.document.lines[0].start, { x: 2, y: 0, z: 0 });
  assert.deepEqual(chamfered.document.lines[1].start, { x: 0, y: 3, z: 0 });
  assert.equal(chamfered.document.lines[2].name, "Chamfer 03");
});

test("Fillet and Chamfer update every Polyline corner while preserving identity and properties", () => {
  const rectangle = addPolylineObject(DEFAULT_DOCUMENT, {
    bulges: [0, 0, 0, 0],
    closed: true,
    elevation: 24,
    vertices: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 10 }, { x: 0, y: 10 }],
    width: 0.5,
  }, "rectangle");
  assert.ok(rectangle);
  const filleted = filletPolylineObject(rectangle.document, rectangle.polyline.id, 2);
  assert.ok(filleted);
  assert.equal(filleted.ref.id, rectangle.polyline.id);
  assert.equal(filleted.document.polylines[0].id, rectangle.polyline.id);
  assert.equal(filleted.document.polylines[0].name, rectangle.polyline.name);
  assert.equal(filleted.document.polylines[0].layerId, rectangle.polyline.layerId);
  assert.equal(filleted.document.polylines[0].elevation, 24);
  assert.equal(filleted.document.polylines[0].width, 0.5);
  assert.equal(filleted.document.polylines[0].shape, "polyline");
  assert.equal(filleted.document.polylines[0].vertices.length, 8);

  const chamfered = chamferPolylineObject(rectangle.document, rectangle.polyline.id, 2, 3);
  assert.ok(chamfered);
  assert.deepEqual(chamfered.document.polylines[0].vertices.slice(0, 2), [{ x: 0, y: 2 }, { x: 3, y: 0 }]);
  assert.equal(chamfered.document.polylines[0].bulges?.every((bulge) => bulge === 0), true);
});

test("Polyline Fillet and Chamfer reject protected, curved, zero, and impossible edits", () => {
  const rectangle = addRectangleObject(DEFAULT_DOCUMENT, { x: 0, y: 0 }, { x: 10, y: 10 }, 0);
  assert.ok(rectangle);
  assert.equal(filletPolylineObject(rectangle.document, rectangle.polyline.id, 6), null);
  assert.equal(chamferPolylineObject(rectangle.document, rectangle.polyline.id, 6, 6), null);
  assert.equal(filletPolylineObject(rectangle.document, rectangle.polyline.id, 0), null);
  assert.equal(chamferPolylineObject(rectangle.document, rectangle.polyline.id, 0, 0), null);

  const locked = cloneDocument(rectangle.document);
  locked.polylines[0].locked = true;
  assert.equal(filletPolylineObject(locked, rectangle.polyline.id, 2), null);
  assert.equal(chamferPolylineObject(locked, rectangle.polyline.id, 2, 2), null);

  const curved = cloneDocument(rectangle.document);
  curved.polylines[0].bulges = [0.25, 0, 0, 0];
  assert.equal(filletPolylineObject(curved, rectangle.polyline.id, 2), null);
});

test("zero-distance Chamfer cleans a corner and locked Lines are protected", () => {
  const first = addLineObject(DEFAULT_DOCUMENT, { x: 4, y: 0, z: 0 }, { x: 10, y: 0, z: 0 });
  assert.ok(first);
  const second = addLineObject(first.document, { x: 0, y: 5, z: 0 }, { x: 0, y: 10, z: 0 });
  assert.ok(second);
  const picks = [
    { id: first.line.id, point: { x: 8, y: 0, z: 0 } },
    { id: second.line.id, point: { x: 0, y: 8, z: 0 } },
  ] as const;
  const joined = chamferLineObjects(second.document, picks[0], picks[1], 0, 0);
  assert.ok(joined);
  assert.equal(joined.document.lines.length, 2);
  assert.deepEqual(joined.document.lines[0].start, { x: 0, y: 0, z: 0 });
  const locked = cloneDocument(second.document);
  locked.lines[0].locked = true;
  assert.equal(chamferLineObjects(locked, picks[0], picks[1], 1, 1), null);
});

test("radius-zero Fillet cleans a corner and locked Lines are protected", () => {
  const first = addLineObject(DEFAULT_DOCUMENT, { x: -10, y: 0, z: 0 }, { x: -2, y: 0, z: 0 });
  assert.ok(first);
  const second = addLineObject(first.document, { x: 0, y: 2, z: 0 }, { x: 0, y: 10, z: 0 });
  assert.ok(second);
  const picks = [
    { id: first.line.id, point: { x: -3, y: 0, z: 0 } },
    { id: second.line.id, point: { x: 0, y: 3, z: 0 } },
  ] as const;
  const joined = filletLineObjects(second.document, picks[0], picks[1], 0);
  assert.ok(joined);
  assert.equal(joined.document.arcs.length, 0);
  assert.deepEqual(joined.refs.map((ref) => ref.kind), ["line", "line"]);

  const locked = cloneDocument(second.document);
  locked.lines[0].locked = true;
  assert.equal(filletLineObjects(locked, picks[0], picks[1], 1), null);
});

test("trimming a Circle creates a native Arc and locked targets remain unchanged", () => {
  const circle = addCircleObject(DEFAULT_DOCUMENT, { center: { x: 0, y: 0, z: 0 }, radius: 10 });
  assert.ok(circle);
  const boundary = addLineObject(circle.document, { x: 0, y: -15, z: 0 }, { x: 0, y: 15, z: 0 });
  assert.ok(boundary);
  const trimmed = trimModelEntity(boundary.document, { kind: "circle", id: circle.circle.id }, { x: 10, y: 0, z: 0 });
  assert.ok(trimmed);
  assert.equal(trimmed.refs[0]?.kind, "arc");
  assert.equal(trimmed.document.circles.length, 0);
  assert.equal(trimmed.document.arcs.length, 1);
  const locked = cloneDocument(boundary.document);
  locked.circles[0].locked = true;
  assert.equal(trimModelEntity(locked, { kind: "circle", id: circle.circle.id }, { x: 10, y: 0, z: 0 }), null);
});

test("stretches a captured Line endpoint and preserves its stable identity", () => {
  const added = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 });
  assert.ok(added);
  const stretched = stretchModelEntities(added.document, [{
    components: [1],
    id: added.line.id,
    kind: "line",
    whole: false,
  }], { x: 6, y: 2, z: 0 });
  assert.ok(stretched);
  assert.equal(stretched.lines[0].id, added.line.id);
  assert.deepEqual(stretched.lines[0].start, { x: 0, y: 0, z: 0 });
  assert.deepEqual(stretched.lines[0].end, { x: 16, y: 2, z: 0 });
});

test("moves whole Stretch targets, reshapes partial Rectangles, and respects locks", () => {
  const rectangle = addRectangleObject(DEFAULT_DOCUMENT, { x: 0, y: 0 }, { x: 20, y: 10 }, 0);
  assert.ok(rectangle);
  const partial = stretchModelEntities(rectangle.document, [{
    components: [1, 2],
    id: rectangle.polyline.id,
    kind: "polyline",
    whole: false,
  }], { x: 5, y: 0, z: 0 });
  assert.ok(partial);
  assert.equal(partial.polylines[0].shape, "polyline");
  assert.deepEqual(partial.polylines[0].vertices, [
    { x: 0, y: 0 }, { x: 25, y: 0 }, { x: 25, y: 10 }, { x: 0, y: 10 },
  ]);

  const whole = stretchModelEntities(rectangle.document, [{
    components: [],
    id: rectangle.polyline.id,
    kind: "polyline",
    whole: true,
  }], { x: 3, y: 4, z: 12 });
  assert.ok(whole);
  assert.equal(whole.polylines[0].shape, "rectangle");
  assert.equal(whole.polylines[0].elevation, 12);
  assert.deepEqual(whole.polylines[0].vertices[0], { x: 3, y: 4 });

  const locked = cloneDocument(rectangle.document);
  locked.polylines[0].locked = true;
  assert.equal(stretchModelEntities(locked, [{ components: [1], id: rectangle.polyline.id, kind: "polyline", whole: false }], { x: 1, y: 0, z: 0 }), null);
});

test("Boundary discovers a visible enclosure and creates one closed Polyline transaction", () => {
  const first = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 6 }, { x: 16, y: 0, z: 6 });
  assert.ok(first);
  const second = addLineObject(first.document, { x: 16, y: 0, z: 6 }, { x: 16, y: 10, z: 6 });
  assert.ok(second);
  const third = addLineObject(second.document, { x: 16, y: 10, z: 6 }, { x: 0, y: 10, z: 6 });
  assert.ok(third);
  const fourth = addLineObject(third.document, { x: 0, y: 10, z: 6 }, { x: 0, y: 0, z: 6 });
  assert.ok(fourth);

  const discovered = discoverDocumentBoundary(fourth.document, { x: 8, y: 5, z: 6 });
  assert.ok(discovered);
  assert.equal(discovered.area, 160);

  const created = createBoundaryPolylineObject(fourth.document, { x: 8, y: 5, z: 6 });
  assert.ok(created);
  assert.equal(created.document.lines.length, 4);
  assert.equal(created.document.polylines.length, 1);
  assert.equal(created.polyline.closed, true);
  assert.equal(created.polyline.elevation, 6);
  assert.equal(created.polyline.layerId, fourth.document.activeLayerId);
});

test("Boundary ignores hidden geometry and refuses creation on a locked active layer", () => {
  const rectangle = addRectangleObject(DEFAULT_DOCUMENT, { x: 0, y: 0 }, { x: 10, y: 10 }, 0);
  assert.ok(rectangle);
  const hidden = cloneDocument(rectangle.document);
  hidden.layers[0].visible = false;
  assert.equal(discoverDocumentBoundary(hidden, { x: 5, y: 5, z: 0 }), null);

  const locked = cloneDocument(rectangle.document);
  locked.layers[0].locked = true;
  assert.ok(discoverDocumentBoundary(locked, { x: 5, y: 5, z: 0 }));
  assert.equal(createBoundaryPolylineObject(locked, { x: 5, y: 5, z: 0 }), null);
});

test("updates the building definition without changing drawing entities", () => {
  const building = addBuildingStory(DEFAULT_DOCUMENT.building, "story-01", "above");
  assert.ok(building);
  building.stories[1].name = "Second Floor";
  const updated = updateDocumentBuilding(DEFAULT_DOCUMENT, building);
  assert.ok(updated);
  assert.deepEqual(updated.building, building);
  assert.deepEqual(updated.objects, DEFAULT_DOCUMENT.objects);

  const invalid = cloneBuildingStructure(building);
  invalid.stories[1].name = "First Floor";
  assert.equal(updateDocumentBuilding(DEFAULT_DOCUMENT, invalid), null);
});

test("creates entities on the active Story and reassigns them by rough-floor elevation", () => {
  const building = addBuildingStory(DEFAULT_DOCUMENT.building, "story-01", "above");
  assert.ok(building);
  const document = updateDocumentBuilding(DEFAULT_DOCUMENT, building);
  assert.ok(document);
  const added = addLineObject(document, { x: 0, y: 0, z: 0 }, { x: 12, y: 0, z: 0 });
  assert.ok(added);
  assert.equal(added.line.storyId, building.activeStoryId);

  const reassigned = assignModelEntityToStory(added.document, { id: added.line.id, kind: "line" }, building.anchorStoryId);
  assert.ok(reassigned);
  const elevations = new Map(calculateStoryElevations(building).map((story) => [story.storyId, story.roughFloorElevation]));
  const expectedDelta = (elevations.get(building.anchorStoryId) ?? 0) - (elevations.get(building.activeStoryId) ?? 0);
  assert.equal(reassigned.lines[0].storyId, building.anchorStoryId);
  assert.equal(reassigned.lines[0].start.z, expectedDelta);
  assert.equal(reassigned.lines[0].end.z, expectedDelta);
});

test("moves Story-owned geometry when rough framing changes", () => {
  const building = addBuildingStory(DEFAULT_DOCUMENT.building, "story-01", "above");
  assert.ok(building);
  const secondStoryId = building.activeStoryId;
  const document = updateDocumentBuilding(DEFAULT_DOCUMENT, building);
  assert.ok(document);
  const added = addBoxObject(document);
  assert.ok(added);
  const before = added.object.position.z;

  const revised = cloneBuildingStructure(building);
  revised.stories[0].roughCeilingHeight += 12;
  const updated = updateDocumentBuilding(added.document, revised);
  assert.ok(updated);
  assert.equal(updated.objects.find((object) => object.id === added.object.id)?.storyId, secondStoryId);
  assert.equal(updated.objects.find((object) => object.id === added.object.id)?.position.z, before + 12);
  assert.equal(updated.objects[0].position.z, DEFAULT_DOCUMENT.objects[0].position.z);
});

test("converts a closed Story boundary into a live layered floor platform", () => {
  const building = addBuildingStory(DEFAULT_DOCUMENT.building, "story-01", "above");
  assert.ok(building);
  const document = updateDocumentBuilding(DEFAULT_DOCUMENT, building);
  assert.ok(document);
  const rectangle = addRectangleObject(document, { x: 0, y: 0 }, { x: 240, y: 120 }, 0);
  assert.ok(rectangle);
  const platform = createFloorPlatformFromPolyline(rectangle.document, rectangle.polyline.id);
  assert.ok(platform);
  const roughFloor = calculateStoryElevations(building).find((story) => story.storyId === building.activeStoryId)?.roughFloorElevation;
  assert.equal(platform.polylines[0].architecturalRole, "floor-platform");
  assert.equal(platform.polylines[0].elevation, roughFloor);
  assert.match(platform.polylines[0].name, /^Floor Platform/);

  const open = addPolylineObject(document, { closed: false, elevation: 0, vertices: [{ x: 0, y: 0 }, { x: 12, y: 0 }], width: 0 });
  assert.ok(open);
  assert.equal(createFloorPlatformFromPolyline(open.document, open.polyline.id), null);
});

test("converts a Line into a layered Wall controlled by its Story", () => {
  const added = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 42 }, { x: 144, y: 0, z: 42 });
  assert.ok(added);
  const wall = createWallFromLine(added.document, added.line.id);
  assert.ok(wall);
  assert.equal(wall.lines[0].architecturalRole, "wall");
  assert.equal(wall.lines[0].wallTypeId, wall.building.activeWallTypeId);
  assert.equal(wall.lines[0].wallReferenceLine, "exterior-main");
  assert.equal(wall.lines[0].wallExteriorSide, "left");
  assert.equal(wall.lines[0].start.z, 0);
  assert.equal(wall.lines[0].end.z, 0);

  const edited = updateLineObject(wall, added.line.id, { start: { x: 12, y: 6, z: 120 }, end: { x: 180, y: 6, z: 120 } });
  assert.ok(edited);
  assert.equal(edited.lines[0].start.z, 0);
  assert.equal(edited.lines[0].end.z, 0);

  const placed = updateWallPlacement(edited, added.line.id, { exteriorSide: "right", referenceLine: "center-main" });
  assert.ok(placed);
  assert.equal(placed.lines[0].wallExteriorSide, "right");
  assert.equal(placed.lines[0].wallReferenceLine, "center-main");
});

test("keeps Walls on their Story when moved or copied and reassigns removed wall types", () => {
  const added = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 144, y: 0, z: 0 });
  assert.ok(added);
  const wall = createWallFromLine(added.document, added.line.id);
  assert.ok(wall);
  const moved = moveModelEntities(wall, [{ id: added.line.id, kind: "line" }], { x: 12, y: 24, z: 96 });
  assert.ok(moved);
  assert.equal(moved.lines[0].start.z, 0);
  const copied = copyModelEntities(moved, [{ id: added.line.id, kind: "line" }], { x: 0, y: 48, z: 96 });
  assert.ok(copied);
  assert.equal(copied.document.lines[1].start.z, 0);

  const revised = cloneBuildingStructure(copied.document.building);
  revised.wallTypes.push({ ...revised.wallTypes[0], id: "wall-type-02", name: "Alternate Wall", layers: revised.wallTypes[0].layers.map((layer, index) => ({ ...layer, id: `wall-type-02-${index + 1}` })) });
  revised.activeWallTypeId = "wall-type-02";
  const withTypes = updateDocumentBuilding(copied.document, revised);
  assert.ok(withTypes);
  const reassigned = assignWallType(withTypes, withTypes.lines[0].id, "wall-type-02");
  assert.ok(reassigned);
  const removed = cloneBuildingStructure(revised);
  removed.wallTypes = removed.wallTypes.filter((wallType) => wallType.id !== "wall-type-02");
  removed.activeWallTypeId = removed.wallTypes[0].id;
  const normalized = updateDocumentBuilding({ ...reassigned, building: revised }, removed);
  assert.ok(normalized);
  assert.equal(normalized.lines[0].wallTypeId, removed.activeWallTypeId);
});

test("flips a Wall's handedness when mirroring so the physical exterior remains mirrored", () => {
  const added = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 144, y: 0, z: 0 });
  assert.ok(added);
  const wall = createWallFromLine(added.document, added.line.id);
  assert.ok(wall);
  const mirrored = mirrorModelEntities(wall, [{ id: added.line.id, kind: "line" }], { x: 0, y: -120, z: 0 }, { x: 0, y: 120, z: 0 }, false);
  assert.ok(mirrored);
  assert.deepEqual(mirrored.document.lines[0].start, { x: 0, y: 0, z: 0 });
  assert.deepEqual(mirrored.document.lines[0].end, { x: -144, y: 0, z: 0 });
  assert.equal(mirrored.document.lines[0].wallExteriorSide, "right");
  assert.equal(mirrored.document.lines[0].wallReferenceLine, "exterior-main");
});

test("protects straight Walls from unsupported curved and chamfered corner conversions", () => {
  const first = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 120, y: 0, z: 0 });
  assert.ok(first);
  const second = addLineObject(first.document, { x: 120, y: 0, z: 0 }, { x: 120, y: 120, z: 0 });
  assert.ok(second);
  const wall = createWallFromLine(second.document, first.line.id);
  assert.ok(wall);
  assert.equal(chamferLineObjects(wall, { id: first.line.id, point: { x: 110, y: 0, z: 0 } }, { id: second.line.id, point: { x: 120, y: 10, z: 0 } }, 6, 6), null);
  assert.equal(filletLineObjects(wall, { id: first.line.id, point: { x: 110, y: 0, z: 0 } }, { id: second.line.id, point: { x: 120, y: 10, z: 0 } }, 6), null);
});
