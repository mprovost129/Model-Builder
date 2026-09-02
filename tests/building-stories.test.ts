import assert from "node:assert/strict";
import test from "node:test";
import {
  addBuildingStory,
  assemblyTotalThickness,
  buildingStructureIsValid,
  calculateStoryElevations,
  cloneBuildingStructure,
  createDefaultBuildingStructure,
  foundationConditionPlateDefaults,
  foundationSillStackHeight,
  resolveWallHeaderType,
  wallOpeningTypeIsValid,
  wallFramingSettingsAreValid,
  wallHeaderTypeIsValid,
  wallHeaderTypeRequiredMainThickness,
  wallLayerGroupThickness,
  removeBuildingStory,
  wallLayerCenterOffsets,
  wallReferenceDistanceFromExterior,
} from "../lib/building-stories.ts";

test("uses rough framing rather than finishes to calculate the next Story datum", () => {
  const building = createDefaultBuildingStructure();
  const withSecond = addBuildingStory(building, building.activeStoryId, "above");
  assert.ok(withSecond);
  const elevations = calculateStoryElevations(withSecond);
  assert.equal(elevations.length, 2);
  assert.equal(elevations[0].roughFloorElevation, 0);
  assert.equal(elevations[1].roughFloorElevation, 121.125);

  const changedFinishes = cloneBuildingStructure(withSecond);
  changedFinishes.stories[0].floorFinish.layers[0].thickness = 2;
  changedFinishes.stories[0].ceilingStructure.layers.push({ id: "story-01-ceiling-structure-01", material: "Lumber", name: "Dropped Furring", role: "framing", thickness: 2 });
  changedFinishes.stories[0].ceilingFinish.layers[0].thickness = 2;
  assert.equal(calculateStoryElevations(changedFinishes)[1].roughFloorElevation, 121.125);
});

test("derives finished elevations and clear height from finish layers", () => {
  const building = createDefaultBuildingStructure();
  const [elevation] = calculateStoryElevations(building);
  assert.equal(elevation.roughFloorElevation, 0);
  assert.equal(elevation.finishedFloorElevation, 0.75);
  assert.equal(elevation.roughCeilingElevation, 109.125);
  assert.equal(elevation.finishedCeilingElevation, 107.875);
  assert.equal(elevation.finishedClearHeight, 107.125);
});

test("ceiling structure lowers the finished ceiling without moving the rough ceiling", () => {
  const building = createDefaultBuildingStructure();
  building.stories[0].ceilingStructure.layers.push({ id: "story-01-ceiling-structure-01", material: "Lumber", name: "Dropped Furring", role: "framing", thickness: 3.5 });
  const [elevation] = calculateStoryElevations(building);
  assert.equal(elevation.roughCeilingElevation, 109.125);
  assert.equal(elevation.ceilingStructureBottomElevation, 105.625);
  assert.equal(elevation.finishedCeilingElevation, 104.375);
  assert.equal(elevation.finishedClearHeight, 103.625);
});

test("sums every layer in a rough floor assembly", () => {
  const building = createDefaultBuildingStructure();
  const assembly = building.stories[0].floorStructure;
  assert.equal(assemblyTotalThickness(assembly), 12);
  assembly.layers.push({ id: "story-01-floor-structure-03", material: "Resilient Channel", name: "Service Layer", role: "substrate", thickness: 0.5 });
  assert.equal(assemblyTotalThickness(assembly), 12.5);
});

test("defines reusable exterior-to-interior layered wall types", () => {
  const building = createDefaultBuildingStructure();
  assert.equal(building.wallTypes.length, 4);
  assert.equal(building.activeWallTypeId, "wall-type-02");
  assert.deepEqual(building.wallTypes.map((type) => type.name), ["2x4 Exterior Wall", "2x6 Exterior Wall", "2x4 Interior Wall", "2x6 Interior Wall"]);
  assert.deepEqual(building.wallTypes.map((type) => wallLayerGroupThickness(type, "main")), [3.5, 5.5, 3.5, 5.5]);
  assert.equal(building.wallTypes[0].kind, "wall-structure");
  assert.equal(assemblyTotalThickness(building.wallTypes[0]), 4.9375);
  assert.equal(building.wallTypes[0].layers[0].name, "Exterior Finish");
  assert.equal(building.wallTypes[0].layers.at(-1)?.name, "Interior Finish");
  assert.deepEqual(building.wallTypes[0].layers.map((layer) => layer.wallGroup), ["exterior", "exterior", "main", "interior"]);
  assert.deepEqual(building.wallTypes[0].layers.map((layer) => layer.participatesInJoin), [true, true, true, true]);
  assert.deepEqual(building.wallTypes[0].wallEndCapLayerIds, []);
  assert.deepEqual(building.wallTypes[2].layers.map((layer) => layer.wallGroup), ["exterior", "main", "interior"]);
  assert.deepEqual(building.wallTypes[2].layers.map((layer) => layer.name), ["Side A Finish", "2x4 Stud Framing", "Side B Finish"]);
  assert.deepEqual(building.wallTypes.map((type) => [type.wallLocation, type.wallStructuralRole, type.defaultHeaderTypeId]), [
    ["exterior", "bearing", "header-type-04"],
    ["exterior", "bearing", "header-type-01"],
    ["interior", "non-bearing", "header-type-02"],
    ["interior", "non-bearing", "header-type-02"],
  ]);
});

test("defines reusable Foundation Wall types with condition-based sill ownership", () => {
  const building = createDefaultBuildingStructure();
  const foundationType = building.foundationWallTypes[0];

  assert.equal(building.activeFoundationWallTypeId, foundationType.id);
  assert.equal(foundationType.condition, "standard-bearing");
  assert.equal(foundationType.wallWidth, 8);
  assert.equal(foundationType.footing.enabled, true);
  assert.deepEqual(foundationConditionPlateDefaults("standard-bearing"), { foundationPlateCount: 2, upperWallBottomPlateCount: 0 });
  assert.deepEqual(foundationConditionPlateDefaults("interior-mudsill"), { foundationPlateCount: 2, upperWallBottomPlateCount: 0 });
  for (const condition of ["dropped-wall", "garage-wall", "slab-walkout"] as const) {
    assert.deepEqual(foundationConditionPlateDefaults(condition), { foundationPlateCount: 1, upperWallBottomPlateCount: 1 });
  }
  assert.equal(foundationSillStackHeight(foundationType), 3);

  const cloned = cloneBuildingStructure(building);
  cloned.foundationWallTypes[0].footing.width = 20;
  cloned.foundationWallTypes[0].sill.exteriorSetback = 1.5;
  assert.equal(building.foundationWallTypes[0].footing.width, 16);
  assert.equal(building.foundationWallTypes[0].sill.exteriorSetback, 0);
  assert.equal(buildingStructureIsValid(cloned), true);
});

test("defines reusable Door and Window component types for rough openings and finish returns", () => {
  const building = createDefaultBuildingStructure();
  const door = building.openingTypes.find((type) => type.kind === "door");
  const window = building.openingTypes.find((type) => type.kind === "window");
  assert.ok(door);
  assert.ok(window);
  assert.equal(building.activeDoorTypeId, door.id);
  assert.equal(building.activeWindowTypeId, window.id);
  assert.equal(door.roughWidth, 38);
  assert.equal(window.defaultHeaderBottomHeight, 80);
  assert.deepEqual([door.headerDepth, door.kingStudCountPerSide, door.jackStudCountPerSide, door.windowSillPlateCount], [9.25, 1, 1, 0]);
  assert.deepEqual([window.headerDepth, window.kingStudCountPerSide, window.jackStudCountPerSide, window.windowSillPlateCount], [9.25, 1, 1, 1]);
  assert.equal(wallOpeningTypeIsValid(door), true);
  assert.equal(door.headerTypeId, null);
  assert.equal(resolveWallHeaderType(building, "wall-type-02", door.id, null)?.id, "header-type-01");
  assert.equal(resolveWallHeaderType(building, "wall-type-03", door.id, null)?.id, "header-type-02");
  assert.equal(resolveWallHeaderType(building, "wall-type-02", door.id, "header-type-05")?.id, "header-type-05");

  const invalid = { ...window, interiorReturnDepth: -0.5 };
  assert.equal(wallOpeningTypeIsValid(invalid), false);
  assert.equal(wallOpeningTypeIsValid({ ...door, windowSillPlateCount: 1 }), false);
  assert.equal(wallOpeningTypeIsValid({ ...window, jackStudCountPerSide: 5 }), false);

  const cloned = cloneBuildingStructure(building);
  cloned.openingTypes[0].roughWidth = 40;
  assert.equal(building.openingTypes[0].roughWidth, 38);
});

test("defines reusable lumber, LVL, steel, insulated, flat, and spaced header assemblies", () => {
  const building = createDefaultBuildingStructure();
  assert.deepEqual(building.headerTypes.map((type) => type.layout), ["on-edge", "flat-stack", "on-edge", "solid", "on-edge", "solid"]);
  assert.deepEqual(building.headerTypes.map(wallHeaderTypeRequiredMainThickness), [4.5, 0, 5.5, 0, 3.5, 0]);
  assert.deepEqual(building.headerTypes.map((type) => type.scheduleMark), ["H1", "H2", "H3", "H4", "H5", "H6"]);
  assert.deepEqual(building.headerTypes.map((type) => type.engineeringRequired), [false, false, false, true, true, true]);
  assert.equal(building.headerTypes.every(wallHeaderTypeIsValid), true);
  assert.equal(wallHeaderTypeIsValid({ ...building.headerTypes[0], alignment: "center" }), false);
  assert.equal(wallHeaderTypeIsValid({ ...building.headerTypes[2], spacerThickness: 0 }), false);
  const duplicateScheduleMark = cloneBuildingStructure(building);
  duplicateScheduleMark.headerTypes[1].scheduleMark = duplicateScheduleMark.headerTypes[0].scheduleMark;
  assert.equal(buildingStructureIsValid(duplicateScheduleMark), false);
  const incompatibleWallDefault = cloneBuildingStructure(building);
  incompatibleWallDefault.wallTypes[0].defaultHeaderTypeId = "header-type-03";
  assert.equal(buildingStructureIsValid(incompatibleWallDefault), false);
});

test("defines project Wall framing defaults independently from finish assemblies", () => {
  const building = createDefaultBuildingStructure();
  assert.deepEqual(building.wallFraming, {
    bottomPlateCount: 1,
    cornerStyle: "three-stud",
    enabled: true,
    headerHeight: 9.25,
    ladderBlockSpacing: 24,
    material: "Lumber",
    partitionBackingStyle: "three-stud",
    plateHeight: 1.5,
    showInModel: false,
    studSpacing: 16,
    studWidth: 1.5,
    topPlateCount: 2,
  });
  assert.equal(wallFramingSettingsAreValid(building.wallFraming), true);
  const cloned = cloneBuildingStructure(building);
  cloned.wallFraming.studSpacing = 24;
  assert.equal(building.wallFraming.studSpacing, 16);
  cloned.wallFraming.studWidth = 25;
  assert.equal(wallFramingSettingsAreValid(cloned.wallFraming), false);
  assert.equal(buildingStructureIsValid(cloned), false);
});

test("rejects invalid Foundation Wall support geometry and duplicate type names", () => {
  const narrowFooting = createDefaultBuildingStructure();
  narrowFooting.foundationWallTypes[0].footing.width = 6;
  assert.equal(buildingStructureIsValid(narrowFooting), false);

  const duplicateName = createDefaultBuildingStructure();
  duplicateName.foundationWallTypes.push({
    ...duplicateName.foundationWallTypes[0],
    id: "foundation-wall-type-02",
    footing: { ...duplicateName.foundationWallTypes[0].footing },
    sill: { ...duplicateName.foundationWallTypes[0].sill },
  });
  assert.equal(buildingStructureIsValid(duplicateName), false);
});

test("allows unique positive finish layers to wrap open wall ends", () => {
  const building = createDefaultBuildingStructure();
  building.wallTypes[0].wallEndCapLayerIds = [building.wallTypes[0].layers[0].id, building.wallTypes[0].layers.at(-1)?.id ?? ""];
  assert.equal(buildingStructureIsValid(building), true);

  const framingCap = createDefaultBuildingStructure();
  framingCap.wallTypes[0].wallEndCapLayerIds = [framingCap.wallTypes[0].layers.find((layer) => layer.role === "framing")?.id ?? ""];
  assert.equal(buildingStructureIsValid(framingCap), false);

  const missingCap = createDefaultBuildingStructure();
  missingCap.wallTypes[0].wallEndCapLayerIds = ["missing-layer"];
  assert.equal(buildingStructureIsValid(missingCap), false);

  const duplicateCap = createDefaultBuildingStructure();
  duplicateCap.wallTypes[0].wallEndCapLayerIds = [duplicateCap.wallTypes[0].layers[0].id, duplicateCap.wallTypes[0].layers[0].id];
  assert.equal(buildingStructureIsValid(duplicateCap), false);
});

test("requires an ordered positive-thickness Main group in every wall type", () => {
  const outOfOrder = createDefaultBuildingStructure();
  outOfOrder.wallTypes[0].layers[0].wallGroup = "interior";
  assert.equal(buildingStructureIsValid(outOfOrder), false);

  const missingMain = createDefaultBuildingStructure();
  for (const layer of missingMain.wallTypes[0].layers) {
    layer.wallGroup = layer.wallGroup === "main" ? "interior" : layer.wallGroup;
  }
  assert.equal(buildingStructureIsValid(missingMain), false);

  const zeroDepthMain = createDefaultBuildingStructure();
  const mainLayer = zeroDepthMain.wallTypes[0].layers.find((layer) => layer.wallGroup === "main");
  assert.ok(mainLayer);
  mainLayer.thickness = 0;
  assert.equal(buildingStructureIsValid(zeroDepthMain), false);

  const missingJoinBehavior = createDefaultBuildingStructure();
  delete missingJoinBehavior.wallTypes[0].layers[0].participatesInJoin;
  assert.equal(buildingStructureIsValid(missingJoinBehavior), false);
});

test("positions wall layers from selectable Main reference lines and exterior sides", () => {
  const wallType = createDefaultBuildingStructure().wallTypes[0];
  assert.equal(wallReferenceDistanceFromExterior(wallType, "exterior-main"), 0.9375);
  assert.equal(wallReferenceDistanceFromExterior(wallType, "center-main"), 2.6875);
  assert.equal(wallReferenceDistanceFromExterior(wallType, "interior-main"), 4.4375);
  assert.equal(wallReferenceDistanceFromExterior(wallType, "wall-center"), 2.46875);
  assert.deepEqual(wallLayerCenterOffsets(wallType, "exterior-main", "left"), [0.6875, 0.21875, -1.75, -3.75]);
  assert.deepEqual(wallLayerCenterOffsets(wallType, "exterior-main", "right"), [-0.6875, -0.21875, 1.75, 3.75]);
  assert.deepEqual(wallLayerCenterOffsets(wallType, "wall-center", "left"), [2.21875, 1.75, -0.21875, -2.21875]);
});

test("calculates Stories below the anchored First Floor downward", () => {
  const building = createDefaultBuildingStructure();
  const withBasement = addBuildingStory(building, building.activeStoryId, "below");
  assert.ok(withBasement);
  withBasement.stories[0].name = "Basement";
  const elevations = calculateStoryElevations(withBasement);
  assert.equal(elevations[0].roughFloorElevation, -121.125);
  assert.equal(elevations[1].roughFloorElevation, 0);
});

test("removing an anchor Story preserves remaining absolute elevations", () => {
  const building = createDefaultBuildingStructure();
  const withSecond = addBuildingStory(building, building.activeStoryId, "above");
  assert.ok(withSecond);
  const before = calculateStoryElevations(withSecond);
  const removed = removeBuildingStory(withSecond, "story-01");
  assert.ok(removed);
  assert.equal(removed.anchorStoryId, removed.stories[0].id);
  assert.equal(calculateStoryElevations(removed)[0].roughFloorElevation, before[1].roughFloorElevation);
});

test("rejects duplicate Story names and invalid layer thicknesses", () => {
  const building = createDefaultBuildingStructure();
  const withSecond = addBuildingStory(building, building.activeStoryId, "above");
  assert.ok(withSecond);
  withSecond.stories[1].name = "First Floor";
  assert.equal(buildingStructureIsValid(withSecond), false);

  const invalidLayer = createDefaultBuildingStructure();
  invalidLayer.stories[0].floorStructure.layers[0].thickness = -0.75;
  assert.equal(buildingStructureIsValid(invalidLayer), false);

  const duplicateWallType = createDefaultBuildingStructure();
  duplicateWallType.wallTypes.push({ ...duplicateWallType.wallTypes[0], id: "wall-type-02", layers: duplicateWallType.wallTypes[0].layers.map((layer, index) => ({ ...layer, id: `wall-type-02-${index + 1}` })) });
  assert.equal(buildingStructureIsValid(duplicateWallType), false);
});
