import assert from "node:assert/strict";
import test from "node:test";
import {
  addBuildingStory,
  assemblyTotalThickness,
  buildingStructureIsValid,
  calculateStoryElevations,
  cloneBuildingStructure,
  createDefaultBuildingStructure,
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
  assert.equal(building.wallTypes.length, 1);
  assert.equal(building.activeWallTypeId, building.wallTypes[0].id);
  assert.equal(building.wallTypes[0].kind, "wall-structure");
  assert.equal(assemblyTotalThickness(building.wallTypes[0]), 4.9375);
  assert.equal(building.wallTypes[0].layers[0].name, "Exterior Finish");
  assert.equal(building.wallTypes[0].layers.at(-1)?.name, "Interior Finish");
  assert.deepEqual(building.wallTypes[0].layers.map((layer) => layer.wallGroup), ["exterior", "exterior", "main", "interior"]);
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
