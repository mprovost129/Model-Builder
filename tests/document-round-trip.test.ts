import assert from "node:assert/strict";
import test from "node:test";
import {
  addArcObject,
  addBoxObject,
  addCircleObject,
  addLineObject,
  addPolylineObject,
  addRectangleObject,
  addWallOpening,
  addLayer,
  cloneDocument,
  createWallFromLine,
  documentsEqual,
  NEW_PROJECT_DOCUMENT,
  setActiveLayer,
  type ModelDocument,
} from "../lib/document-model.ts";
import { deepEqual } from "../lib/deep-equal.ts";
import {
  createProjectDocument,
  parseProjectDocument,
  serializeProjectDocument,
} from "../lib/project-file.ts";

/**
 * Guards the single highest-risk bug class in this codebase.
 *
 * Every entity type has hand-written clone, equality, read, and write functions
 * spread across document-model.ts and project-file.ts. Adding a field to an
 * entity means remembering all four. Forget cloneX and the field disappears on
 * undo. Forget writeX and it disappears on save. Nothing else in the suite
 * notices, because every other test asserts on fields it already knows about.
 *
 * These tests assert structurally instead: whatever fields the document happens
 * to carry must survive a clone and a file round trip. They need no maintenance
 * when the model grows, provided new entity types get added to richDocument().
 */

/** Every key path present in a value, as sorted dotted strings. Array indices collapse to [] so element order does not matter. */
function keyPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.flatMap((entry) => keyPaths(entry, `${prefix}[]`)))];
  }
  if (value === null || typeof value !== "object") return prefix ? [prefix] : [];
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 0) return prefix ? [prefix] : [];
  return keys.flatMap((key) => keyPaths(record[key], prefix ? `${prefix}.${key}` : key));
}

function assertNoFieldsLost(source: ModelDocument, result: ModelDocument, label: string) {
  const before = new Set(keyPaths(source));
  const after = new Set(keyPaths(result));
  const dropped = [...before].filter((path) => !after.has(path)).sort();
  const invented = [...after].filter((path) => !before.has(path)).sort();
  assert.deepEqual(dropped, [], `${label} dropped these fields: ${dropped.join(", ")}`);
  assert.deepEqual(invented, [], `${label} invented these fields: ${invented.join(", ")}`);
}

/** A document holding at least one of every entity type, with non-default values where the public API allows. */
function richDocument(): ModelDocument {
  const layer = addLayer(NEW_PROJECT_DOCUMENT);
  assert.ok(layer, "addLayer");
  const activated = setActiveLayer(layer.document, layer.layer.id);
  assert.ok(activated, "setActiveLayer");

  const box = addBoxObject(activated);
  assert.ok(box, "addBoxObject");

  const line = addLineObject(box.document, { x: 0, y: 0, z: 0 }, { x: 240, y: 0, z: 0 });
  assert.ok(line, "addLineObject");

  // Promote the line to a Wall so wall types, join modes, and openings are exercised.
  const walled = createWallFromLine(line.document, line.line.id);
  assert.ok(walled, "createWallFromLine");

  const door = addWallOpening(walled, line.line.id, "door");
  assert.ok(door, "addWallOpening door");
  const window = addWallOpening(door.document, line.line.id, "window");
  assert.ok(window, "addWallOpening window");

  const polyline = addPolylineObject(window.document, {
    bulges: [0.5, 0, 0],
    closed: true,
    elevation: 12,
    vertices: [{ x: 0, y: 0 }, { x: 120, y: 0 }, { x: 120, y: 96 }],
    width: 0.25,
  });
  assert.ok(polyline, "addPolylineObject");

  const rectangle = addRectangleObject(polyline.document, { x: 300, y: 0 }, { x: 420, y: 96 }, 6);
  assert.ok(rectangle, "addRectangleObject");

  const circle = addCircleObject(rectangle.document, { center: { x: 500, y: 50, z: 3 }, radius: 24 });
  assert.ok(circle, "addCircleObject");

  const arc = addArcObject(circle.document, {
    center: { x: 600, y: 50, z: 9 },
    counterclockwise: false,
    endAngle: Math.PI / 2,
    radius: 36,
    startAngle: 0,
  });
  assert.ok(arc, "addArcObject");

  return arc.document;
}

test("richDocument exercises every entity collection", () => {
  const document = richDocument();
  assert.ok(document.objects.length > 0, "objects");
  assert.ok(document.lines.length > 0, "lines");
  assert.ok(document.polylines.length > 1, "polylines and rectangles");
  assert.ok(document.circles.length > 0, "circles");
  assert.ok(document.arcs.length > 0, "arcs");
  assert.ok(document.layers.length > 1, "layers");
  assert.ok(document.layerSets.length > 0, "layer sets");
  assert.ok(document.savedPlanViews.length > 0, "saved plan views");
  assert.ok(document.lines.some((line) => line.wallOpenings.length > 1), "wall openings");
  assert.ok(document.building.wallTypes.length > 0, "wall types");
});

test("cloneDocument preserves every field, so undo cannot silently drop data", () => {
  const document = richDocument();
  const cloned = cloneDocument(document);
  assertNoFieldsLost(document, cloned, "cloneDocument");
  assert.deepEqual(cloned, document);
  assert.ok(documentsEqual(document, cloned), "documentsEqual disagrees with deepEqual");
});

test("cloneDocument returns an independent copy", () => {
  const document = richDocument();
  const cloned = cloneDocument(document);
  cloned.lines[0].name = "Mutated";
  cloned.lines[0].wallOpenings[0].centerOffset += 12;
  cloned.building.wallTypes[0].name = "Mutated";
  assert.notEqual(document.lines[0].name, "Mutated");
  assert.notEqual(document.lines[0].wallOpenings[0].centerOffset, cloned.lines[0].wallOpenings[0].centerOffset);
  assert.notEqual(document.building.wallTypes[0].name, "Mutated");
});

test("a project file round trip preserves every field, so Save cannot silently drop data", () => {
  const document = richDocument();
  const serialized = serializeProjectDocument(createProjectDocument({
    createdAt: "2026-01-01T00:00:00.000Z",
    document,
    name: "Round Trip House",
    updatedAt: "2026-01-02T00:00:00.000Z",
  }));

  const parsed = parseProjectDocument(serialized);
  assert.ok(parsed.ok, parsed.ok ? "" : `parse failed: ${parsed.error}`);

  const restored: ModelDocument = {
    activeLayerSetId: parsed.project.activeLayerSetId,
    activeLayerId: parsed.project.activeLayerId,
    activeSavedPlanViewId: parsed.project.activeSavedPlanViewId,
    arcs: parsed.project.arcs,
    building: parsed.project.building,
    circles: parsed.project.circles,
    groups: parsed.project.groups,
    layers: parsed.project.layers,
    layerSets: parsed.project.layerSets,
    lines: parsed.project.lines,
    objects: parsed.project.objects,
    polylines: parsed.project.polylines,
    projectInformation: parsed.project.projectInformation,
    rooms: parsed.project.rooms,
    roomAnnotations: parsed.project.roomAnnotations,
    savedPlanViews: parsed.project.savedPlanViews,
  };

  assertNoFieldsLost(document, restored, "a save and reopen round trip");
  assert.ok(documentsEqual(document, restored), "the reopened document is not equal to the saved one");
});

test("repeated save and reopen cycles do not drift the model", () => {
  const document = richDocument();
  const once = serializeProjectDocument(createProjectDocument({
    createdAt: "2026-01-01T00:00:00.000Z",
    document,
    name: "Round Trip House",
    updatedAt: "2026-01-02T00:00:00.000Z",
  }));

  const first = parseProjectDocument(once);
  assert.ok(first.ok, first.ok ? "" : `first parse failed: ${first.error}`);
  const twice = serializeProjectDocument(first.project);
  const second = parseProjectDocument(twice);
  assert.ok(second.ok, second.ok ? "" : `second parse failed: ${second.error}`);

  // Compared as data, not as bytes. The writers and readers do not currently
  // agree on key order, so the two JSON strings differ while describing the
  // same model. Making the serialized bytes stable would be a worthwhile
  // separate change: it is what makes file diffs and checksums meaningful.
  assert.ok(deepEqual(first.project, second.project), "the model drifted between save cycles");
});
