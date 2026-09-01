import assert from "node:assert/strict";
import test from "node:test";
import {
  addBoxObject,
  addArcObject,
  addCircleObject,
  addLineObject,
  addPolylineObject,
  addRectangleObject,
  createFloorPlatformFromPolyline,
  createWallFromLine,
  DEFAULT_DOCUMENT,
  groupBoxObjects,
  moveBoxObject,
  rotateBoxObjects,
  setBoxObjectsLocked,
} from "../lib/document-model.ts";
import { arcFromThreePoints } from "../lib/cad-arc.ts";
import { polylineBulgeFromThreePoints } from "../lib/cad-polyline.ts";
import { addBuildingStory, cloneBuildingStructure } from "../lib/building-stories.ts";
import {
  createProjectDocument,
  parseProjectDocument,
  projectFilename,
  projectToDocument,
  serializeProjectDocument,
} from "../lib/project-file.ts";

const createdAt = "2026-08-27T12:00:00.000Z";
const updatedAt = "2026-08-27T12:30:00.000Z";

test("round-trips a versioned multi-box project without dimensional drift", () => {
  const added = addBoxObject(DEFAULT_DOCUMENT);
  assert.ok(added);
  const positioned = moveBoxObject(added.document, "box-02", "y", -18.5);
  assert.ok(positioned);
  const grouped = groupBoxObjects(positioned, ["box-01", "box-02"]);
  assert.ok(grouped);
  const rotated = rotateBoxObjects(grouped.document, ["box-01", "box-02"], "box-01", 45, "center");
  assert.ok(rotated);
  const locked = setBoxObjectsLocked(rotated, ["box-01", "box-02"], true);
  assert.ok(locked);
  const original = createProjectDocument({
    createdAt,
    document: locked,
    name: "Sample House",
    updatedAt,
  });
  const parsed = parseProjectDocument(serializeProjectDocument(original));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(projectToDocument(parsed.project), locked);
  assert.equal(parsed.project.name, "Sample House");
  assert.equal(parsed.project.version, 15);
  assert.equal(parsed.project.objects.length, 2);
});

test("round-trips rough-framing Stories and layered assemblies", () => {
  const building = addBuildingStory(DEFAULT_DOCUMENT.building, "story-01", "above");
  assert.ok(building);
  building.stories[1].name = "Second Floor";
  building.stories[1].floorStructure.layers[1].thickness = 14;
  building.stories[1].floorFinish.layers[0].material = "White Oak";
  const document = { ...DEFAULT_DOCUMENT, building: cloneBuildingStructure(building) };
  const project = createProjectDocument({ createdAt, document, name: "Story Test", updatedAt });
  const parsed = parseProjectDocument(serializeProjectDocument(project));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(projectToDocument(parsed.project).building, building);
});

test("round-trips a layered floor platform footprint", () => {
  const rectangle = addRectangleObject(DEFAULT_DOCUMENT, { x: 0, y: 0 }, { x: 240, y: 120 }, 0);
  assert.ok(rectangle);
  const platform = createFloorPlatformFromPolyline(rectangle.document, rectangle.polyline.id);
  assert.ok(platform);
  const project = createProjectDocument({ createdAt, document: platform, name: "Floor Platform", updatedAt });
  const parsed = parseProjectDocument(serializeProjectDocument(project));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.polylines[0].architecturalRole, "floor-platform");
});

test("round-trips Story-controlled walls and reusable layered wall types", () => {
  const added = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 36 }, { x: 144, y: 0, z: 36 });
  assert.ok(added);
  const wall = createWallFromLine(added.document, added.line.id);
  assert.ok(wall);
  const project = createProjectDocument({ createdAt, document: wall, name: "Wall Study", updatedAt });
  const parsed = parseProjectDocument(serializeProjectDocument(project));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const document = projectToDocument(parsed.project);
  assert.equal(document.lines[0].architecturalRole, "wall");
  assert.equal(document.lines[0].wallTypeId, document.building.activeWallTypeId);
  assert.deepEqual(document.building.wallTypes, wall.building.wallTypes);
});

test("upgrades version-14 projects with default wall types and drafting Lines", () => {
  const added = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 144, y: 0, z: 0 });
  assert.ok(added);
  const legacy = createProjectDocument({ createdAt, document: added.document, name: "Pre-Wall Model", updatedAt });
  legacy.version = 14 as 15;
  delete (legacy.building as unknown as Record<string, unknown>).activeWallTypeId;
  delete (legacy.building as unknown as Record<string, unknown>).wallTypes;
  delete (legacy.lines[0] as unknown as Record<string, unknown>).architecturalRole;
  delete (legacy.lines[0] as unknown as Record<string, unknown>).wallTypeId;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, 15);
  assert.equal(parsed.project.lines[0].architecturalRole, null);
  assert.equal(parsed.project.lines[0].wallTypeId, null);
  assert.equal(parsed.project.building.wallTypes.length, 1);
});

test("upgrades version-12 files with the default rough-framing Story", () => {
  const project = createProjectDocument({ createdAt, document: DEFAULT_DOCUMENT, name: "Legacy Story", updatedAt });
  const legacy = structuredClone(project);
  legacy.version = 12 as 15;
  delete (legacy as unknown as Record<string, unknown>).building;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(projectToDocument(parsed.project).building, DEFAULT_DOCUMENT.building);
});

test("upgrades version-13 entities onto the saved anchor Story", () => {
  const building = addBuildingStory(DEFAULT_DOCUMENT.building, "story-01", "below");
  assert.ok(building);
  const project = createProjectDocument({
    createdAt,
    document: { ...DEFAULT_DOCUMENT, building },
    name: "Legacy Story Ownership",
    updatedAt,
  });
  const legacy = structuredClone(project);
  legacy.version = 13 as 15;
  for (const collection of [legacy.objects, legacy.lines, legacy.polylines, legacy.circles, legacy.arcs]) {
    for (const entity of collection) delete (entity as unknown as Record<string, unknown>).storyId;
  }
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.objects[0].storyId, building.anchorStoryId);
});

test("rejects invalid saved Story assemblies", () => {
  const project = createProjectDocument({ createdAt, document: DEFAULT_DOCUMENT, name: "Invalid Story", updatedAt });
  project.building.stories[0].floorStructure.layers[0].thickness = -1;
  const parsed = parseProjectDocument(JSON.stringify(project));
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.match(parsed.error, /Story and assembly/i);
});

test("opens legacy version-1 through version-7 projects and upgrades them", () => {
  const current = createProjectDocument({
    createdAt,
    document: DEFAULT_DOCUMENT,
    name: "Legacy Study",
    updatedAt,
  });
  const legacyObjects = current.objects.map((currentObject) => {
    const { layerId, ...legacyObject } = currentObject;
    void layerId;
    return legacyObject;
  });
  const legacyBase = {
    createdAt: current.createdAt,
    format: current.format,
    name: current.name,
    objects: legacyObjects,
    units: current.units,
    updatedAt: current.updatedAt,
  };
  for (const version of [1, 2]) {
    const parsed = parseProjectDocument(JSON.stringify({ ...legacyBase, version }));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) continue;
    assert.equal(parsed.project.version, 15);
    assert.deepEqual(projectToDocument(parsed.project), DEFAULT_DOCUMENT);
  }

  const legacyVersion3 = structuredClone(current);
  legacyVersion3.version = 3 as 15;
  delete (legacyVersion3 as unknown as Record<string, unknown>).groups;
  legacyVersion3.objects = legacyVersion3.objects.map((object) => {
    const legacyObject = { ...object } as Partial<typeof object>;
    delete legacyObject.groupId;
    delete legacyObject.locked;
    return legacyObject as typeof object;
  });
  const parsedVersion3 = parseProjectDocument(JSON.stringify(legacyVersion3));
  assert.equal(parsedVersion3.ok, true);
  if (parsedVersion3.ok) assert.deepEqual(projectToDocument(parsedVersion3.project), DEFAULT_DOCUMENT);

  const legacyVersion4 = structuredClone(current);
  legacyVersion4.version = 4 as 15;
  legacyVersion4.objects = legacyVersion4.objects.map((object) => {
    const legacyObject = { ...object } as Partial<typeof object>;
    delete legacyObject.rotationZ;
    return legacyObject as typeof object;
  });
  const parsedVersion4 = parseProjectDocument(JSON.stringify(legacyVersion4));
  assert.equal(parsedVersion4.ok, true);
  if (parsedVersion4.ok) assert.deepEqual(projectToDocument(parsedVersion4.project), DEFAULT_DOCUMENT);

  const legacyVersion5 = structuredClone(current);
  legacyVersion5.version = 5 as 15;
  delete (legacyVersion5 as unknown as Record<string, unknown>).lines;
  const parsedVersion5 = parseProjectDocument(JSON.stringify(legacyVersion5));
  assert.equal(parsedVersion5.ok, true);
  if (parsedVersion5.ok) assert.deepEqual(projectToDocument(parsedVersion5.project), DEFAULT_DOCUMENT);

  const legacyVersion6 = structuredClone(current);
  legacyVersion6.version = 6 as 15;
  delete (legacyVersion6 as unknown as Record<string, unknown>).polylines;
  const parsedVersion6 = parseProjectDocument(JSON.stringify(legacyVersion6));
  assert.equal(parsedVersion6.ok, true);
  if (parsedVersion6.ok) assert.deepEqual(projectToDocument(parsedVersion6.project), DEFAULT_DOCUMENT);

  const legacyVersion7 = structuredClone(current);
  legacyVersion7.version = 7 as 15;
  const parsedVersion7 = parseProjectDocument(JSON.stringify(legacyVersion7));
  assert.equal(parsedVersion7.ok, true);
  if (parsedVersion7.ok) assert.deepEqual(projectToDocument(parsedVersion7.project), DEFAULT_DOCUMENT);
});

test("rejects malformed, unrelated, and future files", () => {
  assert.equal(parseProjectDocument("not json").ok, false);
  assert.equal(parseProjectDocument('{"format":"something-else"}').ok, false);
  const project = createProjectDocument({
    createdAt,
    document: DEFAULT_DOCUMENT,
    name: "Test",
    updatedAt,
  });
  const future = parseProjectDocument(JSON.stringify({ ...project, version: 16 }));
  assert.equal(future.ok, false);
  if (!future.ok) assert.match(future.error, /newer version/i);
});

test("round-trips saved 3D lines and validates their geometry", () => {
  const added = addLineObject(DEFAULT_DOCUMENT, { x: -12, y: 6, z: 24 }, { x: 120, y: 78, z: 96 });
  assert.ok(added);
  const project = createProjectDocument({ createdAt, document: added.document, name: "Plan", updatedAt });
  const parsed = parseProjectDocument(serializeProjectDocument(project));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(projectToDocument(parsed.project).lines, added.document.lines);

  const invalid = structuredClone(project);
  invalid.lines[0].end.x = 120.01;
  assert.equal(parseProjectDocument(JSON.stringify(invalid)).ok, false);
});

test("upgrades version-7 planar lines to explicit zero elevation", () => {
  const added = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 120, y: 60, z: 0 });
  assert.ok(added);
  const legacy = createProjectDocument({ createdAt, document: added.document, name: "Legacy Lines", updatedAt });
  legacy.version = 7 as 15;
  delete (legacy.lines[0].start as unknown as Record<string, unknown>).z;
  delete (legacy.lines[0].end as unknown as Record<string, unknown>).z;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, 15);
  assert.equal(parsed.project.lines[0].start.z, 0);
  assert.equal(parsed.project.lines[0].end.z, 0);
});

test("upgrades version-8 polylines to an explicit zero elevation", () => {
  const added = addPolylineObject(DEFAULT_DOCUMENT, { closed: true, elevation: 0, vertices: [{ x: 0, y: 0 }, { x: 120, y: 0 }, { x: 120, y: 96 }, { x: 0, y: 96 }] }, "rectangle");
  assert.ok(added);
  const legacy = createProjectDocument({ createdAt, document: added.document, name: "Legacy Rectangle", updatedAt });
  legacy.version = 8 as 15;
  delete (legacy.polylines[0] as unknown as Record<string, unknown>).elevation;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, 15);
  assert.equal(parsed.project.polylines[0].elevation, 0);
});

test("round-trips open and closed polylines", () => {
  const added = addPolylineObject(DEFAULT_DOCUMENT, { closed: true, elevation: 108, vertices: [{ x: 0, y: 0 }, { x: 120, y: 0 }, { x: 120, y: 96 }, { x: 0, y: 96 }] }, "rectangle");
  assert.ok(added);
  const project = createProjectDocument({ createdAt, document: added.document, name: "Profiles", updatedAt });
  const parsed = parseProjectDocument(serializeProjectDocument(project));
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.deepEqual(projectToDocument(parsed.project).polylines, added.document.polylines);
});

test("round-trips Polyline Arc segments and constant width", () => {
  const bulge = polylineBulgeFromThreePoints({ x: 0, y: 0 }, { x: 24, y: 24 }, { x: 48, y: 0 });
  assert.ok(bulge);
  const added = addPolylineObject(DEFAULT_DOCUMENT, { bulges: [bulge], closed: false, elevation: 12, vertices: [{ x: 0, y: 0 }, { x: 48, y: 0 }], width: 6 }, "polyline");
  assert.ok(added);
  const project = createProjectDocument({ createdAt, document: added.document, name: "Curved Profile", updatedAt });
  const parsed = parseProjectDocument(serializeProjectDocument(project));
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.deepEqual(projectToDocument(parsed.project).polylines, added.document.polylines);
});

test("upgrades version-11 polylines to straight zero-width geometry", () => {
  const added = addPolylineObject(DEFAULT_DOCUMENT, { closed: false, elevation: 0, vertices: [{ x: 0, y: 0 }, { x: 48, y: 0 }] }, "polyline");
  assert.ok(added);
  const legacy = createProjectDocument({ createdAt, document: added.document, name: "Legacy Polyline", updatedAt });
  legacy.version = 11 as 15;
  delete (legacy.polylines[0] as unknown as Record<string, unknown>).bulges;
  delete (legacy.polylines[0] as unknown as Record<string, unknown>).width;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, 15);
  assert.deepEqual(parsed.project.polylines[0].bulges, [0]);
  assert.equal(parsed.project.polylines[0].width, 0);
});

test("round-trips Circles and upgrades version-9 projects without Circle data", () => {
  const added = addCircleObject(DEFAULT_DOCUMENT, { center: { x: 36, y: -24, z: 108 }, radius: 42 });
  assert.ok(added);
  const project = createProjectDocument({ createdAt, document: added.document, name: "Circular Plan", updatedAt });
  const parsed = parseProjectDocument(serializeProjectDocument(project));
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.deepEqual(projectToDocument(parsed.project).circles, added.document.circles);

  const legacy = structuredClone(project);
  legacy.version = 9 as 15;
  delete (legacy as unknown as Record<string, unknown>).circles;
  const upgraded = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(upgraded.ok, true);
  if (!upgraded.ok) return;
  assert.equal(upgraded.project.version, 15);
  assert.deepEqual(upgraded.project.circles, []);
});

test("round-trips Arcs and upgrades version-10 projects without Arc data", () => {
  const geometry = arcFromThreePoints(
    { x: 0, y: 0, z: 108 },
    { x: 60, y: 60, z: 108 },
    { x: 120, y: 0, z: 108 },
  );
  assert.ok(geometry);
  const added = addArcObject(DEFAULT_DOCUMENT, geometry);
  assert.ok(added);
  const project = createProjectDocument({ createdAt, document: added.document, name: "Arched Plan", updatedAt });
  const parsed = parseProjectDocument(serializeProjectDocument(project));
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.deepEqual(projectToDocument(parsed.project).arcs, added.document.arcs);

  const legacy = structuredClone(project);
  legacy.version = 10 as 15;
  delete (legacy as unknown as Record<string, unknown>).arcs;
  const upgraded = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(upgraded.ok, true);
  if (!upgraded.ok) return;
  assert.equal(upgraded.project.version, 15);
  assert.deepEqual(upgraded.project.arcs, []);
});

test("rejects duplicate ids or names, off-grid geometry, and empty documents", () => {
  const added = addBoxObject(DEFAULT_DOCUMENT);
  assert.ok(added);
  const project = createProjectDocument({
    createdAt,
    document: added.document,
    name: "Test",
    updatedAt,
  });
  const duplicate = structuredClone(project);
  duplicate.objects[1].id = duplicate.objects[0].id;
  assert.equal(parseProjectDocument(JSON.stringify(duplicate)).ok, false);

  const duplicateName = structuredClone(project);
  duplicateName.objects[1].name = duplicateName.objects[0].name;
  assert.equal(parseProjectDocument(JSON.stringify(duplicateName)).ok, false);

  const offGrid = structuredClone(project);
  offGrid.objects[0].dimensions.length = 144.01;
  assert.equal(parseProjectDocument(JSON.stringify(offGrid)).ok, false);

  const invalidRotation = structuredClone(project);
  invalidRotation.objects[0].rotationZ = 180;
  assert.equal(parseProjectDocument(JSON.stringify(invalidRotation)).ok, false);

  const impreciseRotation = structuredClone(project);
  impreciseRotation.objects[0].rotationZ = 12.3456;
  assert.equal(parseProjectDocument(JSON.stringify(impreciseRotation)).ok, false);

  const empty = structuredClone(project);
  empty.objects = [];
  assert.equal(parseProjectDocument(JSON.stringify(empty)).ok, false);

  const missingLayer = structuredClone(project);
  missingLayer.objects[0].layerId = "missing-layer";
  assert.equal(parseProjectDocument(JSON.stringify(missingLayer)).ok, false);

  const lockedActiveLayer = structuredClone(project);
  lockedActiveLayer.layers[0].locked = true;
  assert.equal(parseProjectDocument(JSON.stringify(lockedActiveLayer)).ok, false);

  const missingGroup = structuredClone(project);
  missingGroup.objects[0].groupId = "missing-group";
  assert.equal(parseProjectDocument(JSON.stringify(missingGroup)).ok, false);
});

test("creates Windows-safe project filenames", () => {
  assert.equal(projectFilename("My House"), "My House.mbproj");
  assert.equal(projectFilename('House: Lot 4?'), "House Lot 4.mbproj");
  assert.equal(projectFilename("   "), "Untitled Model.mbproj");
});
