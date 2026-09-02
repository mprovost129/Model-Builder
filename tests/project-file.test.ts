import assert from "node:assert/strict";
import test from "node:test";
import {
  addBoxObject,
  addArcObject,
  addCircleObject,
  addLineObject,
  addPolylineObject,
  addPlatformOpening,
  addRectangleObject,
  addWallOpening,
  createFloorPlatformFromPolyline,
  createFoundationWallFromLine,
  createWallFromLine,
  DEFAULT_DOCUMENT,
  NEW_PROJECT_DOCUMENT,
  groupBoxObjects,
  moveBoxObject,
  rotateBoxObjects,
  refreshRoomsForStory,
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

test("round-trips a blank new plan with its project settings", () => {
  const project = createProjectDocument({
    createdAt,
    document: NEW_PROJECT_DOCUMENT,
    name: "Blank Plan",
    updatedAt,
  });
  const parsed = parseProjectDocument(serializeProjectDocument(project));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const document = projectToDocument(parsed.project);
  assert.deepEqual(document.objects, []);
  assert.deepEqual(document.lines, []);
  assert.equal(document.building.stories[0].name, "First Floor");
  assert.equal(document.building.wallTypes.length, 1);
  assert.equal(document.building.foundationWallTypes.length, 1);
  assert.equal(document.building.activeFoundationWallTypeId, document.building.foundationWallTypes[0].id);
});

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
  assert.equal(parsed.project.version, 27);
  assert.equal(parsed.project.objects.length, 2);
});

test("round-trips rough-framing Stories and layered assemblies", () => {
  const building = addBuildingStory(DEFAULT_DOCUMENT.building, "story-01", "above");
  assert.ok(building);
  building.stories[1].name = "Second Floor";
  building.stories[1].floorStructure.layers[1].thickness = 14;
  building.stories[1].floorFinish.layers[0].material = "White Oak";
  building.stories[1].ceilingStructure.layers.push({ id: "story-02-ceiling-structure-01", material: "Lumber", name: "Dropped Furring", role: "framing", thickness: 1.5 });
  const document = { ...DEFAULT_DOCUMENT, building: cloneBuildingStructure(building) };
  const project = createProjectDocument({ createdAt, document, name: "Story Test", updatedAt });
  const parsed = parseProjectDocument(serializeProjectDocument(project));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(projectToDocument(parsed.project).building, building);
});

test("round-trips Foundation Wall types and upgrades version-25 projects", () => {
  const building = cloneBuildingStructure(DEFAULT_DOCUMENT.building);
  const foundationType = building.foundationWallTypes[0];
  foundationType.name = "8 in. Garage Foundation";
  foundationType.condition = "garage-wall";
  foundationType.topOffset = -12;
  foundationType.footing.width = 20;
  foundationType.sill.exteriorSetback = 1.5;
  foundationType.sill.foundationPlateCount = 1;
  foundationType.sill.upperWallBottomPlateCount = 1;

  const current = createProjectDocument({
    createdAt,
    document: { ...DEFAULT_DOCUMENT, building },
    name: "Foundation Types",
    updatedAt,
  });
  const parsedCurrent = parseProjectDocument(serializeProjectDocument(current));
  assert.equal(parsedCurrent.ok, true);
  if (parsedCurrent.ok) assert.deepEqual(parsedCurrent.project.building.foundationWallTypes, building.foundationWallTypes);

  const legacy = structuredClone(current);
  legacy.version = 25 as 27;
  delete (legacy.building as unknown as Record<string, unknown>).activeFoundationWallTypeId;
  delete (legacy.building as unknown as Record<string, unknown>).foundationWallTypes;
  const parsedLegacy = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsedLegacy.ok, true);
  if (parsedLegacy.ok) {
    assert.equal(parsedLegacy.project.version, 27);
    assert.equal(parsedLegacy.project.building.foundationWallTypes.length, 1);
    assert.equal(parsedLegacy.project.building.foundationWallTypes[0].sill.foundationPlateCount, 2);
    assert.equal(parsedLegacy.project.building.foundationWallTypes[0].sill.upperWallBottomPlateCount, 0);
  }
});

test("round-trips placed Foundation Walls and upgrades version-26 stem heights", () => {
  const added = addLineObject(NEW_PROJECT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 192, y: 0, z: 0 });
  assert.ok(added);
  const foundation = createFoundationWallFromLine(added.document, added.line.id);
  assert.ok(foundation);
  foundation.building.foundationWallTypes[0].wallHeight = 108;
  const project = createProjectDocument({ createdAt, document: foundation, name: "Foundation Layout", updatedAt });
  const parsed = parseProjectDocument(serializeProjectDocument(project));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.lines[0].architecturalRole, "foundation-wall");
  assert.equal(parsed.project.lines[0].foundationWallTypeId, parsed.project.building.activeFoundationWallTypeId);
  assert.equal(parsed.project.building.foundationWallTypes[0].wallHeight, 108);

  const legacy = structuredClone(project);
  legacy.version = 26 as 27;
  legacy.lines = [];
  delete (legacy.building.foundationWallTypes[0] as unknown as Record<string, unknown>).wallHeight;
  const upgraded = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(upgraded.ok, true);
  if (upgraded.ok) assert.equal(upgraded.project.building.foundationWallTypes[0].wallHeight, 96);
});

test("rejects version-26 projects without Foundation Wall type data", () => {
  const project = createProjectDocument({ createdAt, document: DEFAULT_DOCUMENT, name: "Missing Foundation Types", updatedAt });
  project.version = 26 as 27;
  delete (project.building as unknown as Record<string, unknown>).foundationWallTypes;
  const parsed = parseProjectDocument(JSON.stringify(project));
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.match(parsed.error, /Story and assembly/i);
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
  const withOpening = addWallOpening(wall, added.line.id, "window");
  assert.ok(withOpening);
  const project = createProjectDocument({ createdAt, document: withOpening.document, name: "Wall Study", updatedAt });
  const parsed = parseProjectDocument(serializeProjectDocument(project));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const document = projectToDocument(parsed.project);
  assert.equal(document.lines[0].architecturalRole, "wall");
  assert.equal(document.lines[0].wallTypeId, document.building.activeWallTypeId);
  assert.equal(document.lines[0].wallReferenceLine, "exterior-main");
  assert.equal(document.lines[0].wallExteriorSide, "left");
  assert.equal(document.lines[0].wallJoinPriority, 0);
  assert.equal(document.lines[0].wallStartJoinMode, "auto");
  assert.equal(document.lines[0].wallEndJoinMode, "auto");
  assert.deepEqual(document.lines[0].wallOpenings, withOpening.document.lines[0].wallOpenings);
  assert.deepEqual(document.building.wallTypes, wall.building.wallTypes);
});

test("round-trips hosted Platform Openings and upgrades earlier Room records", () => {
  let document = structuredClone(NEW_PROJECT_DOCUMENT);
  for (const [start, end] of [
    [{ x: 0, y: 0, z: 0 }, { x: 120, y: 0, z: 0 }],
    [{ x: 120, y: 0, z: 0 }, { x: 120, y: 120, z: 0 }],
    [{ x: 120, y: 120, z: 0 }, { x: 0, y: 120, z: 0 }],
    [{ x: 0, y: 120, z: 0 }, { x: 0, y: 0, z: 0 }],
  ] as const) {
    const added = addLineObject(document, start, end);
    assert.ok(added);
    const wall = createWallFromLine(added.document, added.line.id);
    assert.ok(wall);
    document = wall;
  }
  const detected = refreshRoomsForStory(document, "story-01");
  assert.ok(detected);
  detected.rooms[0].name = "Living Room";
  detected.rooms[0].roughCeilingHeightOverride = 108;
  const opened = addPlatformOpening(detected, detected.rooms[0].id, "open-below", "floor");
  assert.ok(opened);
  const project = createProjectDocument({ createdAt, document: opened.document, name: "Room Plan", updatedAt });
  const parsed = parseProjectDocument(serializeProjectDocument(project));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(projectToDocument(parsed.project).rooms, opened.document.rooms);
  assert.equal(parsed.project.rooms[0].platformOpenings[0].kind, "open-below");
  assert.equal(parsed.project.rooms[0].platformOpenings[0].cuts, "floor");

  const legacy = structuredClone(project);
  legacy.version = 24 as 27;
  legacy.rooms.forEach((room) => delete (room as unknown as Record<string, unknown>).platformOpenings);
  const upgradedRoom = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(upgradedRoom.ok, true);
  if (!upgradedRoom.ok) return;
  assert.deepEqual(upgradedRoom.project.rooms[0].platformOpenings, []);

  const preRoom = structuredClone(project);
  preRoom.version = 23 as 27;
  delete (preRoom as unknown as Record<string, unknown>).rooms;
  const upgraded = parseProjectDocument(JSON.stringify(preRoom));
  assert.equal(upgraded.ok, true);
  if (!upgraded.ok) return;
  assert.deepEqual(upgraded.project.rooms, []);

  const incomplete = structuredClone(project);
  delete (incomplete.rooms[0] as unknown as Record<string, unknown>).platformOpenings;
  const rejected = parseProjectDocument(JSON.stringify(incomplete));
  assert.equal(rejected.ok, false);
  if (!rejected.ok) assert.match(rejected.error, /Rooms/i);
});

test("upgrades version-22 walls with no hosted openings", () => {
  const added = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 144, y: 0, z: 0 });
  assert.ok(added);
  const wall = createWallFromLine(added.document, added.line.id);
  assert.ok(wall);
  const legacy = createProjectDocument({ createdAt, document: wall, name: "Pre-Opening Wall", updatedAt });
  legacy.version = 22 as 27;
  delete (legacy.lines[0] as unknown as Record<string, unknown>).wallOpenings;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, 27);
  assert.deepEqual(parsed.project.lines[0].wallOpenings, []);
});

test("rejects version-23 walls without explicit hosted-opening data", () => {
  const added = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 144, y: 0, z: 0 });
  assert.ok(added);
  const wall = createWallFromLine(added.document, added.line.id);
  assert.ok(wall);
  const project = createProjectDocument({ createdAt, document: wall, name: "Missing Opening Data", updatedAt });
  delete (project.lines[0] as unknown as Record<string, unknown>).wallOpenings;
  const parsed = parseProjectDocument(JSON.stringify(project));
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.match(parsed.error, /drawing lines/i);
});

test("round-trips selected wall open-end wrap finishes", () => {
  const document = structuredClone(DEFAULT_DOCUMENT);
  document.building.wallTypes[0].wallEndCapLayerIds = [document.building.wallTypes[0].layers[0].id, document.building.wallTypes[0].layers.at(-1)?.id ?? ""];
  const project = createProjectDocument({ createdAt, document, name: "Wrapped Wall Type", updatedAt });
  const parsed = parseProjectDocument(serializeProjectDocument(project));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(parsed.project.building.wallTypes[0].wallEndCapLayerIds, document.building.wallTypes[0].wallEndCapLayerIds);
});

test("upgrades version-20 wall types without open-end caps", () => {
  const legacy = createProjectDocument({ createdAt, document: DEFAULT_DOCUMENT, name: "Pre-End Caps", updatedAt });
  legacy.version = 20 as 27;
  delete (legacy.building.wallTypes[0] as unknown as Record<string, unknown>).wallEndCapLayerIds;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, 27);
  assert.deepEqual(parsed.project.building.wallTypes[0].wallEndCapLayerIds, []);
});

test("upgrades a version-21 open-end cap into a one-layer wrap", () => {
  const legacy = createProjectDocument({ createdAt, document: DEFAULT_DOCUMENT, name: "Single End Cap", updatedAt });
  legacy.version = 21 as 27;
  const wallType = legacy.building.wallTypes[0] as unknown as Record<string, unknown>;
  delete wallType.wallEndCapLayerIds;
  wallType.wallEndCapLayerId = legacy.building.wallTypes[0].layers[0].id;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(parsed.project.building.wallTypes[0].wallEndCapLayerIds, [legacy.building.wallTypes[0].layers[0].id]);
});

test("rejects version-22 wall types without explicit open-end wrap behavior", () => {
  const project = createProjectDocument({ createdAt, document: DEFAULT_DOCUMENT, name: "Missing End Wrap Metadata", updatedAt });
  delete (project.building.wallTypes[0] as unknown as Record<string, unknown>).wallEndCapLayerIds;
  const parsed = parseProjectDocument(JSON.stringify(project));
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.match(parsed.error, /Story and assembly/i);
});

test("upgrades version-14 projects with default wall types and drafting Lines", () => {
  const added = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 144, y: 0, z: 0 });
  assert.ok(added);
  const legacy = createProjectDocument({ createdAt, document: added.document, name: "Pre-Wall Model", updatedAt });
  legacy.version = 14 as 27;
  delete (legacy.building as unknown as Record<string, unknown>).activeWallTypeId;
  delete (legacy.building as unknown as Record<string, unknown>).wallTypes;
  delete (legacy.lines[0] as unknown as Record<string, unknown>).architecturalRole;
  delete (legacy.lines[0] as unknown as Record<string, unknown>).wallTypeId;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, 27);
  assert.equal(parsed.project.lines[0].architecturalRole, null);
  assert.equal(parsed.project.lines[0].wallTypeId, null);
  assert.equal(parsed.project.building.wallTypes.length, 1);
});

test("upgrades version-15 Stories with an empty ceiling-structure assembly", () => {
  const legacy = createProjectDocument({ createdAt, document: DEFAULT_DOCUMENT, name: "Pre-Ceiling Structure", updatedAt });
  legacy.version = 15 as 27;
  delete (legacy.building.stories[0] as unknown as Record<string, unknown>).ceilingStructure;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, 27);
  assert.equal(parsed.project.building.stories[0].ceilingStructure.kind, "ceiling-structure");
  assert.deepEqual(parsed.project.building.stories[0].ceilingStructure.layers, []);
});

test("upgrades version-16 wall layers into Exterior, Main, and Interior groups", () => {
  const legacy = createProjectDocument({ createdAt, document: DEFAULT_DOCUMENT, name: "Pre-Wall Groups", updatedAt });
  legacy.version = 16 as 27;
  for (const layer of legacy.building.wallTypes[0].layers) {
    delete (layer as unknown as Record<string, unknown>).wallGroup;
  }
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, 27);
  assert.deepEqual(parsed.project.building.wallTypes[0].layers.map((layer) => layer.wallGroup), ["exterior", "exterior", "main", "interior"]);
});

test("rejects version-19 wall layers without an explicit group", () => {
  const project = createProjectDocument({ createdAt, document: DEFAULT_DOCUMENT, name: "Missing Wall Group", updatedAt });
  delete (project.building.wallTypes[0].layers[0] as unknown as Record<string, unknown>).wallGroup;
  const parsed = parseProjectDocument(JSON.stringify(project));
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.match(parsed.error, /Story and assembly/i);
});

test("upgrades version-18 wall layers with role-based automatic-join defaults", () => {
  const legacy = createProjectDocument({ createdAt, document: DEFAULT_DOCUMENT, name: "Pre-Wall Join Metadata", updatedAt });
  legacy.version = 18 as 27;
  legacy.building.wallTypes[0].layers[0].role = "membrane";
  for (const layer of legacy.building.wallTypes[0].layers) {
    delete (layer as unknown as Record<string, unknown>).participatesInJoin;
  }
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, 27);
  assert.deepEqual(parsed.project.building.wallTypes[0].layers.map((layer) => layer.participatesInJoin), [false, true, true, true]);
});

test("rejects version-19 wall layers without explicit automatic-join behavior", () => {
  const project = createProjectDocument({ createdAt, document: DEFAULT_DOCUMENT, name: "Missing Wall Join Metadata", updatedAt });
  delete (project.building.wallTypes[0].layers[0] as unknown as Record<string, unknown>).participatesInJoin;
  const parsed = parseProjectDocument(JSON.stringify(project));
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.match(parsed.error, /Story and assembly/i);
});

test("upgrades version-17 walls without changing their centerline geometry", () => {
  const added = addLineObject(DEFAULT_DOCUMENT, { x: 12, y: 24, z: 0 }, { x: 156, y: 24, z: 0 });
  assert.ok(added);
  const wall = createWallFromLine(added.document, added.line.id);
  assert.ok(wall);
  const legacy = createProjectDocument({ createdAt, document: wall, name: "Pre-Wall Placement", updatedAt });
  legacy.version = 17 as 27;
  delete (legacy.lines[0] as unknown as Record<string, unknown>).wallExteriorSide;
  delete (legacy.lines[0] as unknown as Record<string, unknown>).wallReferenceLine;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, 27);
  assert.equal(parsed.project.lines[0].wallReferenceLine, "wall-center");
  assert.equal(parsed.project.lines[0].wallExteriorSide, "left");
  assert.deepEqual(parsed.project.lines[0].start, legacy.lines[0].start);
  assert.deepEqual(parsed.project.lines[0].end, legacy.lines[0].end);
});

test("upgrades version-19 walls with automatic junction defaults", () => {
  const added = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 144, y: 0, z: 0 });
  assert.ok(added);
  const wall = createWallFromLine(added.document, added.line.id);
  assert.ok(wall);
  const legacy = createProjectDocument({ createdAt, document: wall, name: "Pre-Junction Overrides", updatedAt });
  legacy.version = 19 as 27;
  delete (legacy.lines[0] as unknown as Record<string, unknown>).wallJoinPriority;
  delete (legacy.lines[0] as unknown as Record<string, unknown>).wallStartJoinMode;
  delete (legacy.lines[0] as unknown as Record<string, unknown>).wallEndJoinMode;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, 27);
  assert.equal(parsed.project.lines[0].wallJoinPriority, 0);
  assert.equal(parsed.project.lines[0].wallStartJoinMode, "auto");
  assert.equal(parsed.project.lines[0].wallEndJoinMode, "auto");
});

test("upgrades version-12 files with the default rough-framing Story", () => {
  const project = createProjectDocument({ createdAt, document: DEFAULT_DOCUMENT, name: "Legacy Story", updatedAt });
  const legacy = structuredClone(project);
  legacy.version = 12 as 27;
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
  legacy.version = 13 as 27;
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
    assert.equal(parsed.project.version, 27);
    assert.deepEqual(projectToDocument(parsed.project), DEFAULT_DOCUMENT);
  }

  const legacyVersion3 = structuredClone(current);
  legacyVersion3.version = 3 as 27;
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
  legacyVersion4.version = 4 as 27;
  legacyVersion4.objects = legacyVersion4.objects.map((object) => {
    const legacyObject = { ...object } as Partial<typeof object>;
    delete legacyObject.rotationZ;
    return legacyObject as typeof object;
  });
  const parsedVersion4 = parseProjectDocument(JSON.stringify(legacyVersion4));
  assert.equal(parsedVersion4.ok, true);
  if (parsedVersion4.ok) assert.deepEqual(projectToDocument(parsedVersion4.project), DEFAULT_DOCUMENT);

  const legacyVersion5 = structuredClone(current);
  legacyVersion5.version = 5 as 27;
  delete (legacyVersion5 as unknown as Record<string, unknown>).lines;
  const parsedVersion5 = parseProjectDocument(JSON.stringify(legacyVersion5));
  assert.equal(parsedVersion5.ok, true);
  if (parsedVersion5.ok) assert.deepEqual(projectToDocument(parsedVersion5.project), DEFAULT_DOCUMENT);

  const legacyVersion6 = structuredClone(current);
  legacyVersion6.version = 6 as 27;
  delete (legacyVersion6 as unknown as Record<string, unknown>).polylines;
  const parsedVersion6 = parseProjectDocument(JSON.stringify(legacyVersion6));
  assert.equal(parsedVersion6.ok, true);
  if (parsedVersion6.ok) assert.deepEqual(projectToDocument(parsedVersion6.project), DEFAULT_DOCUMENT);

  const legacyVersion7 = structuredClone(current);
  legacyVersion7.version = 7 as 27;
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
  const future = parseProjectDocument(JSON.stringify({ ...project, version: 28 }));
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
  legacy.version = 7 as 27;
  delete (legacy.lines[0].start as unknown as Record<string, unknown>).z;
  delete (legacy.lines[0].end as unknown as Record<string, unknown>).z;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, 27);
  assert.equal(parsed.project.lines[0].start.z, 0);
  assert.equal(parsed.project.lines[0].end.z, 0);
});

test("upgrades version-8 polylines to an explicit zero elevation", () => {
  const added = addPolylineObject(DEFAULT_DOCUMENT, { closed: true, elevation: 0, vertices: [{ x: 0, y: 0 }, { x: 120, y: 0 }, { x: 120, y: 96 }, { x: 0, y: 96 }] }, "rectangle");
  assert.ok(added);
  const legacy = createProjectDocument({ createdAt, document: added.document, name: "Legacy Rectangle", updatedAt });
  legacy.version = 8 as 27;
  delete (legacy.polylines[0] as unknown as Record<string, unknown>).elevation;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, 27);
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
  legacy.version = 11 as 27;
  delete (legacy.polylines[0] as unknown as Record<string, unknown>).bulges;
  delete (legacy.polylines[0] as unknown as Record<string, unknown>).width;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, 27);
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
  legacy.version = 9 as 27;
  delete (legacy as unknown as Record<string, unknown>).circles;
  const upgraded = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(upgraded.ok, true);
  if (!upgraded.ok) return;
  assert.equal(upgraded.project.version, 27);
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
  legacy.version = 10 as 27;
  delete (legacy as unknown as Record<string, unknown>).arcs;
  const upgraded = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(upgraded.ok, true);
  if (!upgraded.ok) return;
  assert.equal(upgraded.project.version, 27);
  assert.deepEqual(upgraded.project.arcs, []);
});

test("rejects duplicate ids or names and off-grid geometry", () => {
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
