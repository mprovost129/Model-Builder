import assert from "node:assert/strict";
import test from "node:test";
import {
  addBoxObject,
  addProductObject,
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
import { addBuildingStory, calculateStoryElevations, cloneBuildingStructure, createDefaultProductAssetAlignment } from "../lib/building-stories.ts";
import {
  createProjectDocument,
  parseProjectDocument,
  PROJECT_FILE_VERSION,
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
  assert.equal(document.building.wallTypes.length, 4);
  assert.equal(document.building.activeWallTypeId, "wall-type-02");
  assert.equal(document.building.foundationWallTypes.length, 1);
  assert.equal(document.building.activeFoundationWallTypeId, document.building.foundationWallTypes[0].id);
  assert.equal(document.layerSets.length, 1);
  assert.equal(document.savedPlanViews[0].viewMode, "top");
});

test("upgrades version-42 projects with standard layers, Layer Sets, Saved Views, and Room annotation storage", () => {
  const current = createProjectDocument({ createdAt, document: NEW_PROJECT_DOCUMENT, name: "Version 42 Plan", updatedAt });
  const legacy = structuredClone(current) as unknown as Record<string, unknown>;
  legacy.version = 42;
  delete legacy.activeLayerSetId;
  delete legacy.activeSavedPlanViewId;
  delete legacy.layerSets;
  delete legacy.roomAnnotations;
  delete legacy.savedPlanViews;
  (legacy.layers as Array<Record<string, unknown>>).forEach((layer) => {
    delete layer.lineStyle;
    delete layer.lineWeight;
    delete layer.printColor;
  });
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const document = projectToDocument(parsed.project);
  assert.equal(parsed.project.version, PROJECT_FILE_VERSION);
  assert.equal(document.activeLayerSetId, "layer-set-working-plan");
  assert.equal(document.savedPlanViews[0].viewMode, "top");
  assert.equal(document.layers.find((layer) => layer.id === "layer-walls")?.lineWeight, 3);
});

test("upgrades version-43 Layer Sets with fill defaults and the fill master enabled", () => {
  const current = createProjectDocument({ createdAt, document: NEW_PROJECT_DOCUMENT, name: "Version 43 Plan", updatedAt });
  const legacy = structuredClone(current);
  legacy.version = 43 as number;
  legacy.layers.forEach((layer) => {
    delete (layer as Partial<typeof layer>).fillColor;
    delete (layer as Partial<typeof layer>).fillVisible;
  });
  legacy.layerSets.forEach((set) => {
    delete (set as Partial<typeof set>).fillsVisible;
    set.layers.forEach((layer) => {
      delete (layer as Partial<typeof layer>).fillColor;
      delete (layer as Partial<typeof layer>).fillVisible;
    });
  });
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const document = projectToDocument(parsed.project);
  assert.equal(document.layerSets[0].fillsVisible, true);
  assert.equal(document.layers.find((layer) => layer.id === "layer-walls")?.fillColor, "#b9c8d2");
  assert.equal(document.layers.every((layer) => layer.fillVisible), true);
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
  assert.equal(parsed.project.version, PROJECT_FILE_VERSION);
  assert.equal(parsed.project.objects.length, 2);
});

test("round-trips reusable product object Types and placed instance links", () => {
  const document = structuredClone(NEW_PROJECT_DOCUMENT);
  document.building.productObjectTypes.push({
    category: "appliance",
    dimensions: { height: 70, length: 36, width: 30 },
    id: "product-object-type-01",
    name: "36 in. Refrigerator",
    productAssets: [],
    productSource: null,
  });
  const placed = addProductObject(document, document.building.productObjectTypes[0]);
  assert.ok(placed);
  const project = createProjectDocument({ createdAt, document: placed.document, name: "Products", updatedAt });
  const parsed = parseProjectDocument(serializeProjectDocument(project));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const restored = projectToDocument(parsed.project);
  assert.equal(restored.building.productObjectTypes[0].name, "36 in. Refrigerator");
  assert.equal(restored.objects[0].productObjectTypeId, "product-object-type-01");

  const legacy = structuredClone(project);
  legacy.version = 41 as number;
  delete (legacy.building as unknown as Record<string, unknown>).productObjectTypes;
  for (const object of legacy.objects) delete (object as unknown as Record<string, unknown>).productObjectTypeId;
  const upgraded = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(upgraded.ok, true);
  if (upgraded.ok) assert.deepEqual(projectToDocument(upgraded.project).building.productObjectTypes, []);
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
  legacy.version = 25 as number;
  delete (legacy.building as unknown as Record<string, unknown>).activeFoundationWallTypeId;
  delete (legacy.building as unknown as Record<string, unknown>).foundationWallTypes;
  const parsedLegacy = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsedLegacy.ok, true);
  if (parsedLegacy.ok) {
    assert.equal(parsedLegacy.project.version, PROJECT_FILE_VERSION);
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
  legacy.version = 26 as number;
  legacy.lines = [];
  delete (legacy.building.foundationWallTypes[0] as unknown as Record<string, unknown>).wallHeight;
  const upgraded = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(upgraded.ok, true);
  if (upgraded.ok) assert.equal(upgraded.project.building.foundationWallTypes[0].wallHeight, 96);
});

test("round-trips framed-Wall Foundation support links and upgrades version-27 projects", () => {
  const foundationLine = addLineObject(NEW_PROJECT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 192, y: 0, z: 0 });
  assert.ok(foundationLine);
  const foundation = createFoundationWallFromLine(foundationLine.document, foundationLine.line.id);
  assert.ok(foundation);
  const framedLine = addLineObject(foundation, { x: 0, y: 0, z: 0 }, { x: 192, y: 0, z: 0 });
  assert.ok(framedLine);
  const framed = createWallFromLine(framedLine.document, framedLine.line.id);
  assert.ok(framed);
  const project = createProjectDocument({ createdAt, document: framed, name: "Supported Wall", updatedAt });
  const parsed = parseProjectDocument(serializeProjectDocument(project));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.lines.find((line) => line.id === framedLine.line.id)?.foundationSupportWallId, foundationLine.line.id);

  const legacy = structuredClone(project);
  legacy.version = 27 as number;
  legacy.lines.forEach((line) => delete (line as unknown as Record<string, unknown>).foundationSupportWallId);
  const upgraded = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(upgraded.ok, true);
  if (upgraded.ok) assert.equal(upgraded.project.lines.find((line) => line.architecturalRole === "wall")?.foundationSupportWallId, null);

  const invalid = structuredClone(project);
  const invalidWall = invalid.lines.find((line) => line.architecturalRole === "wall");
  assert.ok(invalidWall);
  invalidWall.foundationSupportWallId = "missing-foundation";
  const rejected = parseProjectDocument(JSON.stringify(invalid));
  assert.equal(rejected.ok, false);
  if (!rejected.ok) assert.match(rejected.error, /Foundation Wall support/i);
});

test("rejects version-26 projects without Foundation Wall type data", () => {
  const project = createProjectDocument({ createdAt, document: DEFAULT_DOCUMENT, name: "Missing Foundation Types", updatedAt });
  project.version = 26 as number;
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
  withOpening.document.lines[0].wallOpenings[0].headerTypeIdOverride = "header-type-05";
  withOpening.document.lines[0].wallOpenings[0].componentOverrides = [
    { componentId: "component-glass", material: "Low-E Tinted Glass", visible: false },
  ];
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
  assert.equal(document.lines[0].wallOpenings[0].headerTypeIdOverride, "header-type-05");
  assert.deepEqual(document.lines[0].wallOpenings[0].componentOverrides, [
    { componentId: "component-glass", material: "Low-E Tinted Glass", visible: false },
  ]);
  assert.deepEqual(document.building.wallTypes, wall.building.wallTypes);
  assert.deepEqual(document.building.openingTypes, wall.building.openingTypes);

  const version36 = structuredClone(project);
  version36.version = 36 as number;
  version36.lines.forEach((line) => line.wallOpenings.forEach((opening) =>
    delete (opening as unknown as Record<string, unknown>).componentOverrides));
  const upgraded = parseProjectDocument(JSON.stringify(version36));
  assert.equal(upgraded.ok, true);
  if (upgraded.ok) assert.deepEqual(upgraded.project.lines[0].wallOpenings[0].componentOverrides, []);
});

test("upgrades version-29 openings into reusable default component types", () => {
  const added = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 144, y: 0, z: 0 });
  assert.ok(added);
  const wall = createWallFromLine(added.document, added.line.id);
  assert.ok(wall);
  const opened = addWallOpening(wall, added.line.id, "window");
  assert.ok(opened);
  const legacy = createProjectDocument({ createdAt, document: opened.document, name: "Pre-Component Window", updatedAt });
  legacy.version = 29 as number;
  const legacyBuilding = legacy.building as unknown as Record<string, unknown>;
  delete legacyBuilding.activeDoorTypeId;
  delete legacyBuilding.activeWindowTypeId;
  delete legacyBuilding.openingTypes;
  delete (legacy.lines[0].wallOpenings[0] as unknown as Record<string, unknown>).wallOpeningTypeId;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.lines[0].wallOpenings[0].wallOpeningTypeId, parsed.project.building.activeWindowTypeId);
});

test("upgrades version-38 opening types without manufacturer provenance", () => {
  const project = createProjectDocument({ createdAt, document: NEW_PROJECT_DOCUMENT, name: "Pre-Catalog Plan", updatedAt });
  project.version = 38 as number;
  project.building.openingTypes.forEach((openingType) => delete (openingType as unknown as Record<string, unknown>).productSource);
  const parsed = parseProjectDocument(JSON.stringify(project));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.ok(parsed.project.building.openingTypes.every((openingType) => openingType.productSource === null));
});

test("upgrades version-39 opening types without product asset manifests", () => {
  const project = createProjectDocument({ createdAt, document: NEW_PROJECT_DOCUMENT, name: "Pre-Asset Library Plan", updatedAt });
  project.version = 39 as number;
  project.building.openingTypes.forEach((openingType) => delete (openingType as unknown as Record<string, unknown>).productAssets);
  const parsed = parseProjectDocument(JSON.stringify(project));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.ok(parsed.project.building.openingTypes.every((openingType) => openingType.productAssets.length === 0));
});

test("round-trips manufacturer provenance on a Door or Window Type", () => {
  const document = structuredClone(NEW_PROJECT_DOCUMENT);
  document.building.openingTypes[0].productSource = {
    manufacturer: "Example Door Co.",
    modelNumber: "ED-3068",
    productLine: "Residential",
    revision: "2026-09",
    sourceFileName: "ed-3068.rfa",
    sourceFormat: "rfa",
    sourceUrl: "https://example.test/ed-3068",
    verifiedAt: "2026-09-02T12:00:00.000Z",
  };
  document.building.openingTypes[0].productAssets = [{
    alignment: createDefaultProductAssetAlignment("glb"),
    byteLength: 32_768,
    checksumSha256: "b".repeat(64),
    fileName: "ed-3068.glb",
    format: "glb",
    id: "asset-ed-3068-model",
    name: "Manufacturer 3D Model",
    role: "model-3d",
    sourceUrl: "https://example.test/ed-3068.glb",
    usage: "preferred",
  }];
  const project = createProjectDocument({ createdAt, document, name: "Catalog Door Plan", updatedAt });
  const parsed = parseProjectDocument(serializeProjectDocument(project));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(parsed.project.building.openingTypes[0].productSource, document.building.openingTypes[0].productSource);
  assert.deepEqual(parsed.project.building.openingTypes[0].productAssets, document.building.openingTypes[0].productAssets);
});

test("upgrades version-40 product assets with safe alignment and fallback defaults", () => {
  const document = structuredClone(NEW_PROJECT_DOCUMENT);
  document.building.openingTypes[0].productAssets = [{
    alignment: createDefaultProductAssetAlignment("svg"),
    byteLength: 512,
    checksumSha256: "c".repeat(64),
    fileName: "door-elevation.svg",
    format: "svg",
    id: "asset-legacy-door-elevation",
    name: "Door Elevation",
    role: "elevation-symbol",
    sourceUrl: "https://example.test/door-elevation.svg",
    usage: "reference",
  }];
  const project = createProjectDocument({ createdAt, document, name: "Legacy Asset Plan", updatedAt });
  project.version = 40 as number;
  const legacyAsset = project.building.openingTypes[0].productAssets[0] as unknown as Record<string, unknown>;
  delete legacyAsset.alignment;
  delete legacyAsset.usage;
  const parsed = parseProjectDocument(JSON.stringify(project));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.building.openingTypes[0].productAssets[0].usage, "reference");
  assert.deepEqual(parsed.project.building.openingTypes[0].productAssets[0].alignment, createDefaultProductAssetAlignment("svg"));
});

test("round-trips host-aware header assemblies and upgrades version-30 through version-34 projects", () => {
  const document = structuredClone(DEFAULT_DOCUMENT);
  document.building.wallFraming.studSpacing = 24;
  document.building.wallFraming.showInModel = true;
  document.building.wallFraming.cornerStyle = "two-stud";
  document.building.wallFraming.partitionBackingStyle = "ladder";
  const project = createProjectDocument({ createdAt, document, name: "Framing Settings", updatedAt });
  const parsed = parseProjectDocument(serializeProjectDocument(project));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.building.wallFraming.studSpacing, 24);
  assert.equal(parsed.project.building.wallFraming.showInModel, true);
  assert.equal(parsed.project.building.wallFraming.cornerStyle, "two-stud");
  assert.equal(parsed.project.building.wallFraming.partitionBackingStyle, "ladder");
  assert.equal(parsed.project.building.openingTypes[0].headerDepth, 9.25);
  assert.equal(parsed.project.building.headerTypes.length, 6);
  assert.deepEqual(parsed.project.building.headerTypes.map((type) => type.scheduleMark), ["H1", "H2", "H3", "H4", "H5", "H6"]);

  const version35 = structuredClone(project);
  version35.version = 35 as number;
  version35.building.openingTypes.forEach((type) => {
    const legacyType = type as unknown as Record<string, unknown>;
    delete legacyType.components;
    delete legacyType.unitOffsetX;
    delete legacyType.unitOffsetZ;
  });
  const upgradedComponents = parseProjectDocument(JSON.stringify(version35));
  assert.equal(upgradedComponents.ok, true);
  if (!upgradedComponents.ok) return;
  const upgradedComponentDoor = upgradedComponents.project.building.openingTypes.find((type) => type.kind === "door")!;
  const upgradedComponentWindow = upgradedComponents.project.building.openingTypes.find((type) => type.kind === "window")!;
  assert.deepEqual([upgradedComponentDoor.unitOffsetX, upgradedComponentDoor.unitOffsetZ, upgradedComponentDoor.components.length], [0, 0, 4]);
  assert.deepEqual([upgradedComponentWindow.unitOffsetX, upgradedComponentWindow.unitOffsetZ, upgradedComponentWindow.components.length], [0, 0.25, 6]);
  assert.equal(upgradedComponentWindow.components.some((component) => component.role === "glazing"), true);

  const version34 = structuredClone(project);
  version34.version = 34 as number;
  version34.building.wallTypes.forEach((type) => {
    const legacyType = type as unknown as Record<string, unknown>;
    delete legacyType.defaultHeaderTypeId;
    delete legacyType.wallLocation;
    delete legacyType.wallStructuralRole;
  });
  version34.building.headerTypes.forEach((type) => {
    const legacyType = type as unknown as Record<string, unknown>;
    delete legacyType.engineeringRequired;
    delete legacyType.scheduleMark;
  });
  version34.building.openingTypes.forEach((type) => { type.headerTypeId = "header-type-04"; });
  const upgradedHostHeaders = parseProjectDocument(JSON.stringify(version34));
  assert.equal(upgradedHostHeaders.ok, true);
  if (!upgradedHostHeaders.ok) return;
  assert.deepEqual(upgradedHostHeaders.project.building.wallTypes.map((type) => [type.wallLocation, type.wallStructuralRole, type.defaultHeaderTypeId]), [
    ["exterior", "bearing", "header-type-04"],
    ["exterior", "bearing", "header-type-04"],
    ["exterior", "bearing", "header-type-04"],
    ["exterior", "bearing", "header-type-04"],
  ]);
  assert.equal(upgradedHostHeaders.project.building.openingTypes.every((type) => type.headerTypeId === "header-type-04"), true);

  const version33 = structuredClone(project);
  version33.version = 33 as number;
  delete (version33.building as unknown as Record<string, unknown>).headerTypes;
  version33.building.openingTypes.forEach((type) => delete (type as unknown as Record<string, unknown>).headerTypeId);
  const upgradedHeaders = parseProjectDocument(JSON.stringify(version33));
  assert.equal(upgradedHeaders.ok, true);
  if (!upgradedHeaders.ok) return;
  const legacyHeader = upgradedHeaders.project.building.headerTypes.find((type) => type.layout === "solid")!;
  assert.equal(upgradedHeaders.project.building.openingTypes.every((type) => type.headerTypeId === legacyHeader.id), true);

  const version32 = structuredClone(project);
  version32.version = 32 as number;
  delete (version32.building as unknown as Record<string, unknown>).headerTypes;
  version32.building.openingTypes.forEach((type) => {
    const legacyType = type as unknown as Record<string, unknown>;
    delete legacyType.headerDepth;
    delete legacyType.kingStudCountPerSide;
    delete legacyType.jackStudCountPerSide;
    delete legacyType.windowSillPlateCount;
    delete legacyType.headerTypeId;
  });
  const upgradedOpenings = parseProjectDocument(JSON.stringify(version32));
  assert.equal(upgradedOpenings.ok, true);
  if (!upgradedOpenings.ok) return;
  const upgradedDoor = upgradedOpenings.project.building.openingTypes.find((type) => type.kind === "door")!;
  const upgradedWindow = upgradedOpenings.project.building.openingTypes.find((type) => type.kind === "window")!;
  assert.deepEqual([upgradedDoor.headerDepth, upgradedDoor.kingStudCountPerSide, upgradedDoor.jackStudCountPerSide, upgradedDoor.windowSillPlateCount], [9.25, 1, 1, 0]);
  assert.deepEqual([upgradedWindow.headerDepth, upgradedWindow.kingStudCountPerSide, upgradedWindow.jackStudCountPerSide, upgradedWindow.windowSillPlateCount], [9.25, 1, 1, 1]);

  const version31 = structuredClone(project);
  version31.version = 31 as number;
  delete (version31.building.wallFraming as unknown as Record<string, unknown>).cornerStyle;
  delete (version31.building.wallFraming as unknown as Record<string, unknown>).partitionBackingStyle;
  delete (version31.building.wallFraming as unknown as Record<string, unknown>).ladderBlockSpacing;
  const upgradedJunctions = parseProjectDocument(JSON.stringify(version31));
  assert.equal(upgradedJunctions.ok, true);
  if (!upgradedJunctions.ok) return;
  assert.equal(upgradedJunctions.project.building.wallFraming.cornerStyle, "three-stud");
  assert.equal(upgradedJunctions.project.building.wallFraming.partitionBackingStyle, "three-stud");
  assert.equal(upgradedJunctions.project.building.wallFraming.ladderBlockSpacing, 24);

  const legacy = structuredClone(project);
  legacy.version = 30 as number;
  delete (legacy.building as unknown as Record<string, unknown>).wallFraming;
  const upgraded = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(upgraded.ok, true);
  if (!upgraded.ok) return;
  assert.equal(upgraded.project.building.wallFraming.studSpacing, 16);
  assert.equal(upgraded.project.building.wallFraming.showInModel, false);
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
  assert.equal(parsed.project.rooms[0].platformOpenings[0].verticalOpeningId, null);

  const version28 = structuredClone(project);
  version28.version = 28 as number;
  version28.rooms.forEach((room) => room.platformOpenings.forEach((opening) =>
    delete (opening as unknown as Record<string, unknown>).verticalOpeningId));
  const upgradedVerticalOpenings = parseProjectDocument(JSON.stringify(version28));
  assert.equal(upgradedVerticalOpenings.ok, true);
  if (!upgradedVerticalOpenings.ok) return;
  assert.equal(upgradedVerticalOpenings.project.rooms[0].platformOpenings[0].verticalOpeningId, null);

  const incompleteCurrentOpening = structuredClone(project);
  delete (incompleteCurrentOpening.rooms[0].platformOpenings[0] as unknown as Record<string, unknown>).verticalOpeningId;
  assert.equal(parseProjectDocument(JSON.stringify(incompleteCurrentOpening)).ok, false);

  const orphanedVerticalOpening = structuredClone(project);
  orphanedVerticalOpening.rooms[0].platformOpenings[0].verticalOpeningId = "vertical-opening-01";
  const rejectedVerticalOpening = parseProjectDocument(JSON.stringify(orphanedVerticalOpening));
  assert.equal(rejectedVerticalOpening.ok, false);
  if (!rejectedVerticalOpening.ok) assert.match(rejectedVerticalOpening.error, /vertical platform-opening/i);

  const legacy = structuredClone(project);
  legacy.version = 24 as number;
  legacy.rooms.forEach((room) => delete (room as unknown as Record<string, unknown>).platformOpenings);
  const upgradedRoom = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(upgradedRoom.ok, true);
  if (!upgradedRoom.ok) return;
  assert.deepEqual(upgradedRoom.project.rooms[0].platformOpenings, []);

  const preRoom = structuredClone(project);
  preRoom.version = 23 as number;
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

test("round-trips a valid platform opening path across adjacent Stories", () => {
  let document = structuredClone(NEW_PROJECT_DOCUMENT);
  for (const [start, end] of [
    [{ x: 0, y: 0, z: 0 }, { x: 240, y: 0, z: 0 }],
    [{ x: 240, y: 0, z: 0 }, { x: 240, y: 180, z: 0 }],
    [{ x: 240, y: 180, z: 0 }, { x: 0, y: 180, z: 0 }],
    [{ x: 0, y: 180, z: 0 }, { x: 0, y: 0, z: 0 }],
  ] as const) {
    const added = addLineObject(document, start, end);
    assert.ok(added);
    const wall = createWallFromLine(added.document, added.line.id);
    assert.ok(wall);
    document = wall;
  }
  const detected = refreshRoomsForStory(document, "story-01");
  assert.ok(detected);
  const lowerRoom = detected.rooms[0];
  const opened = addPlatformOpening(detected, lowerRoom.id, "shaft", "ceiling");
  assert.ok(opened);

  const expandedBuilding = addBuildingStory(opened.document.building, "story-01", "above");
  assert.ok(expandedBuilding);
  const upperStoryId = expandedBuilding.stories[1].id;
  const upperElevation = calculateStoryElevations(expandedBuilding).find((story) => story.storyId === upperStoryId)?.roughFloorElevation;
  assert.notEqual(upperElevation, undefined);
  const verticalDocument = structuredClone(opened.document);
  verticalDocument.building = expandedBuilding;
  const wallIds = new Map<string, string>();
  const upperWalls = verticalDocument.lines.map((line, index) => {
    const id = `upper-wall-${String(index + 1).padStart(2, "0")}`;
    wallIds.set(line.id, id);
    return {
      ...structuredClone(line),
      end: { ...line.end, z: upperElevation! },
      id,
      name: `Upper ${line.name}`,
      start: { ...line.start, z: upperElevation! },
      storyId: upperStoryId,
    };
  });
  verticalDocument.lines.push(...upperWalls);
  const lowerOpening = verticalDocument.rooms[0].platformOpenings[0];
  lowerOpening.verticalOpeningId = "vertical-opening-01";
  const upperRoom = structuredClone(verticalDocument.rooms[0]);
  upperRoom.id = "room-upper";
  upperRoom.name = "Upper Room";
  upperRoom.storyId = upperStoryId;
  upperRoom.boundaryWallIds = upperRoom.boundaryWallIds.map((id) => wallIds.get(id)!);
  upperRoom.boundary.elevation = upperElevation!;
  upperRoom.platformOpenings = [{
    ...structuredClone(lowerOpening),
    boundary: { ...structuredClone(lowerOpening.boundary), elevation: upperElevation! },
    cuts: "floor",
    id: "room-upper-platform-opening-01",
    name: "Upper Shaft 01",
  }];
  verticalDocument.rooms.push(upperRoom);
  verticalDocument.roomAnnotations.push(...verticalDocument.roomAnnotations.filter((annotation) => annotation.roomId === lowerRoom.id).map((annotation) => ({ ...structuredClone(annotation), id: `room-upper-${annotation.kind}`, roomId: upperRoom.id, storyId: upperStoryId })));

  const project = createProjectDocument({ createdAt, document: verticalDocument, name: "Vertical Shaft", updatedAt });
  const parsed = parseProjectDocument(serializeProjectDocument(project));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, PROJECT_FILE_VERSION);
  assert.equal(parsed.project.rooms[0].platformOpenings[0].verticalOpeningId, "vertical-opening-01");
  assert.equal(parsed.project.rooms[1].platformOpenings[0].verticalOpeningId, "vertical-opening-01");
});

test("upgrades version-22 walls with no hosted openings", () => {
  const added = addLineObject(DEFAULT_DOCUMENT, { x: 0, y: 0, z: 0 }, { x: 144, y: 0, z: 0 });
  assert.ok(added);
  const wall = createWallFromLine(added.document, added.line.id);
  assert.ok(wall);
  const legacy = createProjectDocument({ createdAt, document: wall, name: "Pre-Opening Wall", updatedAt });
  legacy.version = 22 as number;
  delete (legacy.lines[0] as unknown as Record<string, unknown>).wallOpenings;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, PROJECT_FILE_VERSION);
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
  legacy.version = 20 as number;
  delete (legacy.building.wallTypes[0] as unknown as Record<string, unknown>).wallEndCapLayerIds;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, PROJECT_FILE_VERSION);
  assert.deepEqual(parsed.project.building.wallTypes[0].wallEndCapLayerIds, []);
});

test("upgrades a version-21 open-end cap into a one-layer wrap", () => {
  const legacy = createProjectDocument({ createdAt, document: DEFAULT_DOCUMENT, name: "Single End Cap", updatedAt });
  legacy.version = 21 as number;
  legacy.building.wallTypes.forEach((type, index) => {
    const wallType = type as unknown as Record<string, unknown>;
    delete wallType.wallEndCapLayerIds;
    wallType.wallEndCapLayerId = index === 0 ? type.layers[0].id : null;
  });
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
  legacy.version = 14 as number;
  delete (legacy.building as unknown as Record<string, unknown>).activeWallTypeId;
  delete (legacy.building as unknown as Record<string, unknown>).wallTypes;
  delete (legacy.lines[0] as unknown as Record<string, unknown>).architecturalRole;
  delete (legacy.lines[0] as unknown as Record<string, unknown>).wallTypeId;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, PROJECT_FILE_VERSION);
  assert.equal(parsed.project.lines[0].architecturalRole, null);
  assert.equal(parsed.project.lines[0].wallTypeId, null);
  assert.equal(parsed.project.building.wallTypes.length, 1);
});

test("upgrades version-15 Stories with an empty ceiling-structure assembly", () => {
  const legacy = createProjectDocument({ createdAt, document: DEFAULT_DOCUMENT, name: "Pre-Ceiling Structure", updatedAt });
  legacy.version = 15 as number;
  delete (legacy.building.stories[0] as unknown as Record<string, unknown>).ceilingStructure;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, PROJECT_FILE_VERSION);
  assert.equal(parsed.project.building.stories[0].ceilingStructure.kind, "ceiling-structure");
  assert.deepEqual(parsed.project.building.stories[0].ceilingStructure.layers, []);
});

test("upgrades version-16 wall layers into Exterior, Main, and Interior groups", () => {
  const legacy = createProjectDocument({ createdAt, document: DEFAULT_DOCUMENT, name: "Pre-Wall Groups", updatedAt });
  legacy.version = 16 as number;
  for (const layer of legacy.building.wallTypes[0].layers) {
    delete (layer as unknown as Record<string, unknown>).wallGroup;
  }
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, PROJECT_FILE_VERSION);
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
  legacy.version = 18 as number;
  legacy.building.wallTypes[0].layers[0].role = "membrane";
  for (const layer of legacy.building.wallTypes[0].layers) {
    delete (layer as unknown as Record<string, unknown>).participatesInJoin;
  }
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, PROJECT_FILE_VERSION);
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
  legacy.version = 17 as number;
  delete (legacy.lines[0] as unknown as Record<string, unknown>).wallExteriorSide;
  delete (legacy.lines[0] as unknown as Record<string, unknown>).wallReferenceLine;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, PROJECT_FILE_VERSION);
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
  legacy.version = 19 as number;
  delete (legacy.lines[0] as unknown as Record<string, unknown>).wallJoinPriority;
  delete (legacy.lines[0] as unknown as Record<string, unknown>).wallStartJoinMode;
  delete (legacy.lines[0] as unknown as Record<string, unknown>).wallEndJoinMode;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, PROJECT_FILE_VERSION);
  assert.equal(parsed.project.lines[0].wallJoinPriority, 0);
  assert.equal(parsed.project.lines[0].wallStartJoinMode, "auto");
  assert.equal(parsed.project.lines[0].wallEndJoinMode, "auto");
});

test("upgrades version-12 files with the default rough-framing Story", () => {
  const project = createProjectDocument({ createdAt, document: DEFAULT_DOCUMENT, name: "Legacy Story", updatedAt });
  const legacy = structuredClone(project);
  legacy.version = 12 as number;
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
  legacy.version = 13 as number;
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
    assert.equal(parsed.project.version, PROJECT_FILE_VERSION);
    assert.deepEqual(projectToDocument(parsed.project), DEFAULT_DOCUMENT);
  }

  const legacyVersion3 = structuredClone(current);
  legacyVersion3.version = 3 as number;
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
  legacyVersion4.version = 4 as number;
  legacyVersion4.objects = legacyVersion4.objects.map((object) => {
    const legacyObject = { ...object } as Partial<typeof object>;
    delete legacyObject.rotationZ;
    return legacyObject as typeof object;
  });
  const parsedVersion4 = parseProjectDocument(JSON.stringify(legacyVersion4));
  assert.equal(parsedVersion4.ok, true);
  if (parsedVersion4.ok) assert.deepEqual(projectToDocument(parsedVersion4.project), DEFAULT_DOCUMENT);

  const legacyVersion5 = structuredClone(current);
  legacyVersion5.version = 5 as number;
  delete (legacyVersion5 as unknown as Record<string, unknown>).lines;
  const parsedVersion5 = parseProjectDocument(JSON.stringify(legacyVersion5));
  assert.equal(parsedVersion5.ok, true);
  if (parsedVersion5.ok) assert.deepEqual(projectToDocument(parsedVersion5.project), DEFAULT_DOCUMENT);

  const legacyVersion6 = structuredClone(current);
  legacyVersion6.version = 6 as number;
  delete (legacyVersion6 as unknown as Record<string, unknown>).polylines;
  const parsedVersion6 = parseProjectDocument(JSON.stringify(legacyVersion6));
  assert.equal(parsedVersion6.ok, true);
  if (parsedVersion6.ok) assert.deepEqual(projectToDocument(parsedVersion6.project), DEFAULT_DOCUMENT);

  const legacyVersion7 = structuredClone(current);
  legacyVersion7.version = 7 as number;
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
  const future = parseProjectDocument(JSON.stringify({ ...project, version: PROJECT_FILE_VERSION + 1 }));
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
  legacy.version = 7 as number;
  delete (legacy.lines[0].start as unknown as Record<string, unknown>).z;
  delete (legacy.lines[0].end as unknown as Record<string, unknown>).z;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, PROJECT_FILE_VERSION);
  assert.equal(parsed.project.lines[0].start.z, 0);
  assert.equal(parsed.project.lines[0].end.z, 0);
});

test("upgrades version-8 polylines to an explicit zero elevation", () => {
  const added = addPolylineObject(DEFAULT_DOCUMENT, { closed: true, elevation: 0, vertices: [{ x: 0, y: 0 }, { x: 120, y: 0 }, { x: 120, y: 96 }, { x: 0, y: 96 }] }, "rectangle");
  assert.ok(added);
  const legacy = createProjectDocument({ createdAt, document: added.document, name: "Legacy Rectangle", updatedAt });
  legacy.version = 8 as number;
  delete (legacy.polylines[0] as unknown as Record<string, unknown>).elevation;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, PROJECT_FILE_VERSION);
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
  legacy.version = 11 as number;
  delete (legacy.polylines[0] as unknown as Record<string, unknown>).bulges;
  delete (legacy.polylines[0] as unknown as Record<string, unknown>).width;
  const parsed = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.project.version, PROJECT_FILE_VERSION);
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
  legacy.version = 9 as number;
  delete (legacy as unknown as Record<string, unknown>).circles;
  const upgraded = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(upgraded.ok, true);
  if (!upgraded.ok) return;
  assert.equal(upgraded.project.version, PROJECT_FILE_VERSION);
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
  legacy.version = 10 as number;
  delete (legacy as unknown as Record<string, unknown>).arcs;
  const upgraded = parseProjectDocument(JSON.stringify(legacy));
  assert.equal(upgraded.ok, true);
  if (!upgraded.ok) return;
  assert.equal(upgraded.project.version, PROJECT_FILE_VERSION);
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
