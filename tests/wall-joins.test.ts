import assert from "node:assert/strict";
import test from "node:test";
import {
  configureDoorPanelLayout,
  configureWindowLitePattern,
  configureWindowSashArrangement,
  createDefaultBuildingStructure,
  type LayeredAssembly,
} from "../lib/building-stories.ts";
import type { LineObject } from "../lib/document-model.ts";
import {
  automaticWallJoinCount,
  buildAutomaticWallJoinPlan,
  unresolvedWallJunctionCount,
  wallEndCapFootprints,
  wallLayerFootprint,
  wallLayerSolidSegments,
  wallOpeningComponentSolids,
  wallOpeningReturnSolids,
} from "../lib/wall-joins.ts";
import {
  automaticFoundationWallJoinCount,
  buildAutomaticFoundationWallJoinPlan,
  foundationBandFootprint,
  unresolvedFoundationWallJunctionCount,
} from "../lib/foundation-wall-joins.ts";

function wall(
  id: string,
  start: { x: number; y: number; z?: number },
  end: { x: number; y: number; z?: number },
  overrides: Partial<LineObject> = {},
): LineObject {
  return {
    architecturalRole: "wall",
    end: { ...end, z: end.z ?? 0 },
    foundationSupportWallId: null,
    foundationWallTypeId: null,
    id,
    layerId: "layer-01",
    locked: false,
    name: id,
    start: { ...start, z: start.z ?? 0 },
    storyId: "story-01",
    type: "line",
    wallExteriorSide: "left",
    wallJoinPriority: 0,
    wallStartJoinMode: "auto",
    wallEndJoinMode: "auto",
    wallReferenceLine: "exterior-main",
    wallTypeId: "wall-type-01",
    wallOpenings: [],
    ...overrides,
  };
}

function foundationWall(
  id: string,
  start: { x: number; y: number; z?: number },
  end: { x: number; y: number; z?: number },
  overrides: Partial<LineObject> = {},
): LineObject {
  return wall(id, start, end, {
    architecturalRole: "foundation-wall",
    foundationWallTypeId: "foundation-wall-type-01",
    wallTypeId: null,
    ...overrides,
  });
}

test("miters Foundation Wall stems, footings, and sill plates at automatic corners", () => {
  const first = foundationWall("foundation-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const second = foundationWall("foundation-02", { x: 120, y: 0 }, { x: 120, y: 120 });
  const lines = [first, second];
  const types = createDefaultBuildingStructure().foundationWallTypes;
  const plan = buildAutomaticFoundationWallJoinPlan(lines, types);
  const linesById = new Map(lines.map((line) => [line.id, line]));
  const typesById = new Map(types.map((type) => [type.id, type]));
  const stem = foundationBandFootprint(first, types[0], "stem", plan, linesById, typesById);
  const footing = foundationBandFootprint(first, types[0], "footing", plan, linesById, typesById);
  const sill = foundationBandFootprint(first, types[0], "sill", plan, linesById, typesById);

  assert.deepEqual(stem?.endExterior, { x: 120, y: 0 });
  assert.deepEqual(stem?.endInterior, { x: 128, y: -8 });
  assert.deepEqual(footing?.endExterior, { x: 116, y: 4 });
  assert.deepEqual(footing?.endInterior, { x: 132, y: -12 });
  assert.deepEqual(sill?.endExterior, { x: 120, y: 0 });
  assert.deepEqual(sill?.endInterior, { x: 125.5, y: -5.5 });
  assert.equal(automaticFoundationWallJoinCount(first.id, plan), 1);
  assert.equal(unresolvedFoundationWallJunctionCount(first.id, plan), 0);
});

test("trims a Foundation Wall T branch to each near host component face", () => {
  const host = foundationWall("foundation-01", { x: 0, y: 0 }, { x: 240, y: 0 });
  const branch = foundationWall("foundation-02", { x: 120, y: 0 }, { x: 120, y: -120 });
  const lines = [host, branch];
  const types = createDefaultBuildingStructure().foundationWallTypes;
  const plan = buildAutomaticFoundationWallJoinPlan(lines, types);
  const linesById = new Map(lines.map((line) => [line.id, line]));
  const typesById = new Map(types.map((type) => [type.id, type]));
  const stem = foundationBandFootprint(branch, types[0], "stem", plan, linesById, typesById);
  const footing = foundationBandFootprint(branch, types[0], "footing", plan, linesById, typesById);

  assert.equal(stem?.startExterior.y, -8);
  assert.equal(stem?.startInterior.y, -8);
  assert.equal(footing?.startExterior.y, -12);
  assert.equal(footing?.startInterior.y, -12);
  assert.equal(automaticFoundationWallJoinCount(host.id, plan), 1);
  assert.equal(automaticFoundationWallJoinCount(branch.id, plan), 1);
});

test("keeps manually disconnected Foundation Wall ends square", () => {
  const first = foundationWall("foundation-01", { x: 0, y: 0 }, { x: 120, y: 0 }, { wallEndJoinMode: "square" });
  const second = foundationWall("foundation-02", { x: 120, y: 0 }, { x: 120, y: 120 });
  const plan = buildAutomaticFoundationWallJoinPlan([first, second], createDefaultBuildingStructure().foundationWallTypes);
  assert.equal(plan.endpointJoins.size, 0);
  assert.equal(unresolvedFoundationWallJunctionCount(first.id, plan), 0);
});

test("cuts Door and Window rough openings through a Wall layer", () => {
  const source = wall("wall-01", { x: 0, y: 0 }, { x: 240, y: 0 }, {
    wallOpenings: [
      { componentOverrides: [], centerOffset: 60, headerBottomHeight: 82.5, headerTypeIdOverride: null, id: "opening-01", kind: "door", layerId: "layer-01", name: "Door 01", roughHeight: 82.5, roughWidth: 38, unitHeight: 80, unitWidth: 36, wallOpeningTypeId: "door-type-01" },
      { componentOverrides: [], centerOffset: 156, headerBottomHeight: 84, headerTypeIdOverride: null, id: "opening-02", kind: "window", layerId: "layer-01", name: "Window 02", roughHeight: 48.5, roughWidth: 36.5, unitHeight: 48, unitWidth: 36, wallOpeningTypeId: "window-type-01" },
    ],
  });
  const types = wallTypes();
  const plan = buildAutomaticWallJoinPlan([source], types);
  const segments = wallLayerSolidSegments(source, types[0], 2, plan, new Map([[source.id, source]]), typeMap(types), 97.125);
  assert.equal(segments.length, 6);
  assert.deepEqual(segments.map((segment) => [segment.baseHeight, segment.height]), [
    [0, 97.125],
    [82.5, 14.625],
    [0, 97.125],
    [0, 35.5],
    [84, 13.125],
    [0, 97.125],
  ]);
  const windowLower = segments[3];
  assert.equal(windowLower.startExterior.x, 137.75);
  assert.equal(windowLower.endExterior.x, 174.25);
});

test("generates exterior and interior jamb, head, and Window sill finish returns", () => {
  const source = wall("wall-01", { x: 0, y: 0 }, { x: 240, y: 0 }, {
    wallOpenings: [
      { componentOverrides: [], centerOffset: 60, headerBottomHeight: 82.5, headerTypeIdOverride: null, id: "opening-01", kind: "door", layerId: "layer-01", name: "Door 01", roughHeight: 82.5, roughWidth: 38, unitHeight: 80, unitWidth: 36, wallOpeningTypeId: "door-type-01" },
      { componentOverrides: [], centerOffset: 156, headerBottomHeight: 84, headerTypeIdOverride: null, id: "opening-02", kind: "window", layerId: "layer-01", name: "Window 02", roughHeight: 48.5, roughWidth: 36.5, unitHeight: 48, unitWidth: 36, wallOpeningTypeId: "window-type-01" },
    ],
  });
  const building = createDefaultBuildingStructure();
  building.openingTypes[0].exteriorReturnDepth = 1;
  building.openingTypes[0].interiorReturnDepth = 2;
  building.openingTypes[1].interiorReturnDepth = 3;
  const returns = wallOpeningReturnSolids(source, building.wallTypes[0], new Map(building.openingTypes.map((type) => [type.id, type])));
  assert.equal(returns.length, 10);
  assert.deepEqual(returns.map((solid) => [solid.openingId, solid.side, solid.component]), [
    ["opening-01", "exterior", "left-jamb"],
    ["opening-01", "exterior", "right-jamb"],
    ["opening-01", "exterior", "head"],
    ["opening-01", "interior", "left-jamb"],
    ["opening-01", "interior", "right-jamb"],
    ["opening-01", "interior", "head"],
    ["opening-02", "interior", "left-jamb"],
    ["opening-02", "interior", "right-jamb"],
    ["opening-02", "interior", "head"],
    ["opening-02", "interior", "sill"],
  ]);
  const exteriorDoorJamb = returns[0];
  assert.deepEqual([exteriorDoorJamb.startExterior, exteriorDoorJamb.startInterior], [{ x: 41, y: 0.9375 }, { x: 41, y: -0.0625 }]);
  assert.deepEqual([exteriorDoorJamb.baseHeight, exteriorDoorJamb.height], [0, 82.5]);
  const interiorWindowSill = returns.at(-1)!;
  assert.deepEqual([interiorWindowSill.startExterior.y, interiorWindowSill.startInterior.y], [-4, -1]);
  assert.deepEqual([interiorWindowSill.baseHeight, interiorWindowSill.height], [35.5, 0.5]);
});

test("limits opposite finish returns to the Wall depth without overlap", () => {
  const source = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 }, {
    wallOpenings: [
      { componentOverrides: [], centerOffset: 60, headerBottomHeight: 82.5, headerTypeIdOverride: null, id: "opening-01", kind: "door", layerId: "layer-01", name: "Door 01", roughHeight: 82.5, roughWidth: 38, unitHeight: 80, unitWidth: 36, wallOpeningTypeId: "door-type-01" },
    ],
  });
  const building = createDefaultBuildingStructure();
  building.openingTypes[0].exteriorReturnDepth = 4;
  building.openingTypes[0].interiorReturnDepth = 4;
  const returns = wallOpeningReturnSolids(source, building.wallTypes[0], new Map(building.openingTypes.map((type) => [type.id, type])));
  const exterior = returns.find((solid) => solid.side === "exterior" && solid.component === "left-jamb")!;
  const interior = returns.find((solid) => solid.side === "interior" && solid.component === "left-jamb")!;
  assert.equal(exterior.startInterior.y, interior.startInterior.y);
  assert.equal(returns.length, 6);
});

test("builds joined Door and Window component trees as host-aware 3D solids", () => {
  const source = wall("wall-01", { x: 0, y: 0 }, { x: 240, y: 0 }, {
    wallOpenings: [
      { componentOverrides: [], centerOffset: 60, headerBottomHeight: 82.5, headerTypeIdOverride: null, id: "opening-01", kind: "door", layerId: "layer-01", name: "Door 01", roughHeight: 82.5, roughWidth: 38, unitHeight: 80, unitWidth: 36, wallOpeningTypeId: "door-type-01" },
      { componentOverrides: [], centerOffset: 156, headerBottomHeight: 84, headerTypeIdOverride: null, id: "opening-02", kind: "window", layerId: "layer-01", name: "Window 02", roughHeight: 48.5, roughWidth: 36.5, unitHeight: 48, unitWidth: 36, wallOpeningTypeId: "window-type-01" },
    ],
  });
  const building = createDefaultBuildingStructure();
  const typeMap = new Map(building.openingTypes.map((type) => [type.id, type]));
  const solids = wallOpeningComponentSolids(source, building.wallTypes[0], typeMap);
  assert.equal(solids.length, 36);
  assert.equal(solids.filter((solid) => solid.openingId === "opening-01" && solid.componentId === "component-jamb").length, 4);
  assert.equal(solids.filter((solid) => solid.openingId === "opening-02" && solid.componentId === "component-frame").length, 4);
  const glass = solids.find((solid) => solid.openingId === "opening-02" && solid.role === "glazing")!;
  assert.deepEqual([glass.baseHeight, glass.height, glass.material], [39.75, 18.25, "Insulated Glass"]);

  const windowType = building.openingTypes.find((type) => type.kind === "window")!;
  windowType.components.find((component) => component.id === "component-frame")!.profileWidth = 3;
  const resizedGlass = wallOpeningComponentSolids(source, building.wallTypes[0], typeMap).find((solid) => solid.openingId === "opening-02" && solid.role === "glazing")!;
  assert.deepEqual([resizedGlass.baseHeight, resizedGlass.height], [40.75, 17.25]);

  const overrideBuilding = createDefaultBuildingStructure();
  const overriddenSource = structuredClone(source);
  overriddenSource.wallOpenings[1].componentOverrides = [
    { componentId: "component-frame", material: "Composite", profileWidth: 3 },
    { componentId: "component-glass", visible: false },
  ];
  const overriddenSolids = wallOpeningComponentSolids(overriddenSource, overrideBuilding.wallTypes[0], new Map(overrideBuilding.openingTypes.map((type) => [type.id, type])));
  assert.equal(overriddenSolids.some((solid) => solid.openingId === "opening-02" && solid.role === "glazing"), false);
  assert.equal(overriddenSolids.filter((solid) => solid.openingId === "opening-02" && solid.componentId === "component-frame").every((solid) => solid.material === "Composite"), true);

  const productBuilding = createDefaultBuildingStructure();
  const doorTypeIndex = productBuilding.openingTypes.findIndex((type) => type.kind === "door");
  const windowTypeIndex = productBuilding.openingTypes.findIndex((type) => type.kind === "window");
  productBuilding.openingTypes[doorTypeIndex] = configureDoorPanelLayout(productBuilding.openingTypes[doorTypeIndex], "six-panel")!;
  const casement = configureWindowSashArrangement(productBuilding.openingTypes[windowTypeIndex], "casement-pair")!;
  productBuilding.openingTypes[windowTypeIndex] = configureWindowLitePattern(casement, "prairie")!;
  const productSolids = wallOpeningComponentSolids(source, productBuilding.wallTypes[0], new Map(productBuilding.openingTypes.map((type) => [type.id, type])));
  assert.equal(productSolids.filter((solid) => solid.componentId === "product-door-panel-detail").length, 6);
  assert.equal(productSolids.filter((solid) => solid.componentId === "component-sash" && solid.openingId === "opening-02").length, 8);
  assert.equal(productSolids.filter((solid) => solid.componentId === "product-window-lite-vertical").length, 4);
  assert.equal(productSolids.filter((solid) => solid.componentId === "product-window-lite-horizontal").length, 4);
});

function wallTypes() {
  return createDefaultBuildingStructure().wallTypes;
}

function typeMap(types: LayeredAssembly[]) {
  return new Map(types.map((wallType) => [wallType.id, wallType]));
}

test("plans an automatic Main-core corner for two compatible wall endpoints", () => {
  const first = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const second = wall("wall-02", { x: 120, y: 0 }, { x: 120, y: 120 });
  const plan = buildAutomaticWallJoinPlan([first, second], wallTypes());
  assert.deepEqual(plan.endpointJoins.get(first.id)?.end, { kind: "corner", otherEndpoint: "start", otherWallId: second.id });
  assert.deepEqual(plan.endpointJoins.get(second.id)?.start, { kind: "corner", otherEndpoint: "end", otherWallId: first.id });
  assert.equal(automaticWallJoinCount(first.id, plan), 1);
  assert.equal(unresolvedWallJunctionCount(first.id, plan), 0);
});

test("miters corresponding boundaries without moving editable reference paths", () => {
  const first = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const second = wall("wall-02", { x: 120, y: 0 }, { x: 120, y: 120 });
  const lines = [first, second];
  const types = wallTypes();
  const plan = buildAutomaticWallJoinPlan(lines, types);
  const footprint = wallLayerFootprint(first, types[0], 0, plan, new Map(lines.map((line) => [line.id, line])), typeMap(types));
  assert.deepEqual(footprint.endExterior, { x: 119.0625, y: 0.9375 });
  assert.deepEqual(footprint.endInterior, { x: 119.5625, y: 0.4375 });
  assert.deepEqual(first.end, { x: 120, y: 0, z: 0 });
  assert.deepEqual(second.start, { x: 120, y: 0, z: 0 });
});

test("keeps layers excluded from automatic joins square at the editable endpoint", () => {
  const first = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const second = wall("wall-02", { x: 120, y: 0 }, { x: 120, y: 120 });
  const lines = [first, second];
  const types = wallTypes();
  types[0].layers[0].participatesInJoin = false;
  const plan = buildAutomaticWallJoinPlan(lines, types);
  const footprint = wallLayerFootprint(first, types[0], 0, plan, new Map(lines.map((line) => [line.id, line])), typeMap(types));
  assert.deepEqual(footprint.endExterior, { x: 120, y: 0.9375 });
  assert.deepEqual(footprint.endInterior, { x: 120, y: 0.4375 });
  assert.equal(plan.endpointJoins.get(first.id)?.end?.kind, "corner");
});

test("joins mixed wall types from their Main boundaries", () => {
  const types = wallTypes();
  const first = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const second = wall("wall-02", { x: 120, y: 0 }, { x: 120, y: 120 }, { wallTypeId: "wall-type-02" });
  const lines = [first, second];
  const plan = buildAutomaticWallJoinPlan(lines, types);
  assert.equal(plan.endpointJoins.get(first.id)?.end?.kind, "corner");
  assert.equal(plan.endpointJoins.get(second.id)?.start?.kind, "corner");
  const footprint = wallLayerFootprint(first, types[0], 2, plan, new Map(lines.map((line) => [line.id, line])), typeMap(types));
  assert.deepEqual(footprint.endExterior, { x: 120, y: 0 });
  assert.deepEqual(footprint.endInterior, { x: 125.5, y: -3.5 });
});

test("joins a 2x4 interior partition into a 2x6 exterior host and hides the joined plan seam", () => {
  const types = wallTypes();
  const exteriorType = types.find((type) => type.id === "wall-type-02")!;
  const interiorType = types.find((type) => type.id === "wall-type-03")!;
  const host = wall("wall-exterior", { x: 0, y: 0 }, { x: 240, y: 0 }, { wallTypeId: exteriorType.id });
  const branch = wall("wall-interior", { x: 120, y: 0 }, { x: 120, y: -120 }, { wallTypeId: interiorType.id });
  const lines = [host, branch];
  const plan = buildAutomaticWallJoinPlan(lines, types);
  const linesById = new Map(lines.map((line) => [line.id, line]));
  const mainLayerIndex = interiorType.layers.findIndex((layer) => layer.wallGroup === "main");
  const segments = wallLayerSolidSegments(branch, interiorType, mainLayerIndex, plan, linesById, typeMap(types), 97.125);

  assert.deepEqual(plan.endpointJoins.get(branch.id)?.start, { hostWallId: host.id, kind: "tee" });
  assert.equal(unresolvedWallJunctionCount(branch.id, plan), 0);
  assert.equal(segments.length, 1);
  assert.equal(segments[0].hidePlanStartSeam, true);
  assert.equal(segments[0].hidePlanEndSeam, false);
  assert.equal(segments[0].startExterior.y, -5.5);
  assert.equal(segments[0].startInterior.y, -5.5);
});

test("trims a branch endpoint to the near Main face of an uninterrupted host wall", () => {
  const host = wall("wall-01", { x: 0, y: 0 }, { x: 240, y: 0 });
  const branch = wall("wall-02", { x: 120, y: 0 }, { x: 120, y: -120 });
  const lines = [host, branch];
  const types = wallTypes();
  const plan = buildAutomaticWallJoinPlan(lines, types);
  assert.deepEqual(plan.endpointJoins.get(branch.id)?.start, { hostWallId: host.id, kind: "tee" });
  assert.equal(automaticWallJoinCount(host.id, plan), 1);
  assert.equal(automaticWallJoinCount(branch.id, plan), 1);
  const footprint = wallLayerFootprint(branch, types[0], 2, plan, new Map(lines.map((line) => [line.id, line])), typeMap(types));
  assert.equal(footprint.startExterior.y, -3.5);
  assert.equal(footprint.startInterior.y, -3.5);
  assert.deepEqual(host.start, { x: 0, y: 0, z: 0 });
  assert.deepEqual(host.end, { x: 240, y: 0, z: 0 });
});

test("recognizes an aligned split host as one through-wall T-junction", () => {
  const firstHost = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const secondHost = wall("wall-02", { x: 120, y: 0 }, { x: 240, y: 0 });
  const branch = wall("wall-03", { x: 120, y: 0 }, { x: 120, y: -120 });
  const plan = buildAutomaticWallJoinPlan([firstHost, secondHost, branch], wallTypes());
  assert.equal(plan.endpointJoins.get(branch.id)?.start?.kind, "tee");
  assert.equal(automaticWallJoinCount(firstHost.id, plan), 1);
  assert.equal(automaticWallJoinCount(secondHost.id, plan), 1);
  assert.equal(unresolvedWallJunctionCount(branch.id, plan), 0);
});

test("leaves straight continuations square and flags shallow corners", () => {
  const first = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const continuation = wall("wall-02", { x: 120, y: 0 }, { x: 240, y: 0 });
  const shallow = wall("wall-03", { x: 120, y: 0 }, { x: 240, y: 12 });
  const straightPlan = buildAutomaticWallJoinPlan([first, continuation], wallTypes());
  assert.equal(automaticWallJoinCount(first.id, straightPlan), 0);
  assert.equal(unresolvedWallJunctionCount(first.id, straightPlan), 0);
  const shallowPlan = buildAutomaticWallJoinPlan([first, shallow], wallTypes());
  assert.equal(automaticWallJoinCount(first.id, shallowPlan), 0);
  assert.equal(unresolvedWallJunctionCount(first.id, shallowPlan), 1);
});

test("flags Y-junctions and ambiguous crossings instead of guessing", () => {
  const first = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const second = wall("wall-02", { x: 120, y: 0 }, { x: 180, y: 90 });
  const third = wall("wall-03", { x: 120, y: 0 }, { x: 60, y: 90 });
  const yPlan = buildAutomaticWallJoinPlan([first, second, third], wallTypes());
  assert.equal(yPlan.endpointJoins.size, 0);
  assert.equal(unresolvedWallJunctionCount(first.id, yPlan), 1);
  assert.equal(unresolvedWallJunctionCount(second.id, yPlan), 1);
  assert.equal(unresolvedWallJunctionCount(third.id, yPlan), 1);

  const hostA = wall("wall-04", { x: 0, y: 0 }, { x: 240, y: 0 });
  const hostB = wall("wall-05", { x: 0, y: 0 }, { x: 240, y: 0 });
  const branch = wall("wall-06", { x: 120, y: 0 }, { x: 120, y: -120 });
  const ambiguousPlan = buildAutomaticWallJoinPlan([hostA, hostB, branch], wallTypes());
  assert.equal(ambiguousPlan.endpointJoins.size, 0);
  assert.equal(unresolvedWallJunctionCount(branch.id, ambiguousPlan), 1);
});

test("keeps coincident endpoints on different Stories independent", () => {
  const first = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const upper = wall("wall-02", { x: 120, y: 0, z: 121.125 }, { x: 120, y: 120, z: 121.125 }, { storyId: "story-02" });
  const plan = buildAutomaticWallJoinPlan([first, upper], wallTypes());
  assert.equal(plan.endpointJoins.size, 0);
  assert.equal(unresolvedWallJunctionCount(first.id, plan), 0);
});

test("uses explicit priority to resolve a four-Wall crossing", () => {
  const west = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 }, { wallJoinPriority: 10 });
  const east = wall("wall-02", { x: 120, y: 0 }, { x: 240, y: 0 }, { wallJoinPriority: 10 });
  const south = wall("wall-03", { x: 120, y: -120 }, { x: 120, y: 0 });
  const north = wall("wall-04", { x: 120, y: 0 }, { x: 120, y: 120 });
  const plan = buildAutomaticWallJoinPlan([west, east, south, north], wallTypes());
  assert.equal(plan.endpointJoins.get(south.id)?.end?.kind, "tee");
  assert.equal(plan.endpointJoins.get(north.id)?.start?.kind, "tee");
  assert.equal(unresolvedWallJunctionCount(west.id, plan), 0);
});

test("respects a manual square endpoint without reporting an unresolved junction", () => {
  const first = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 }, { wallEndJoinMode: "square" });
  const second = wall("wall-02", { x: 120, y: 0 }, { x: 120, y: 120 });
  const plan = buildAutomaticWallJoinPlan([first, second], wallTypes());
  assert.equal(plan.endpointJoins.size, 0);
  assert.equal(unresolvedWallJunctionCount(first.id, plan), 0);
  assert.equal(unresolvedWallJunctionCount(second.id, plan), 0);
});

test("builds non-overlapping finish caps at truly open wall ends", () => {
  const line = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const types = wallTypes();
  types[0].wallEndCapLayerIds = [types[0].layers[0].id];
  const plan = buildAutomaticWallJoinPlan([line], types);
  const footprint = wallLayerFootprint(line, types[0], 2, plan, new Map([[line.id, line]]), typeMap(types));
  const caps = wallEndCapFootprints(line, types[0], plan);

  assert.equal(caps.length, 2);
  assert.deepEqual(caps.map((cap) => cap.endpoint), ["start", "end"]);
  assert.deepEqual(caps.map((cap) => cap.layerIndex), [0, 0]);
  assert.equal(footprint.startExterior.x, 0.5);
  assert.equal(footprint.endExterior.x, 119.5);
  assert.equal(caps[0].startExterior.x, 0);
  assert.equal(caps[0].endExterior.x, 0.5);
  assert.equal(Math.abs(caps[0].startExterior.y - caps[0].startInterior.y), 4.9375);
});

test("does not cap shared straight or automatically joined endpoints", () => {
  const first = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const continuation = wall("wall-02", { x: 120, y: 0 }, { x: 240, y: 0 });
  const corner = wall("wall-03", { x: 240, y: 0 }, { x: 240, y: 120 });
  const lines = [first, continuation, corner];
  const types = wallTypes();
  types[0].wallEndCapLayerIds = [types[0].layers[0].id];
  const plan = buildAutomaticWallJoinPlan(lines, types);

  assert.deepEqual(wallEndCapFootprints(first, types[0], plan).map((cap) => cap.endpoint), ["start"]);
  assert.deepEqual(wallEndCapFootprints(continuation, types[0], plan), []);
  assert.deepEqual(wallEndCapFootprints(corner, types[0], plan).map((cap) => cap.endpoint), ["end"]);
});

test("caps endpoints explicitly disconnected from automatic cleanup", () => {
  const first = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 }, { wallEndJoinMode: "square" });
  const second = wall("wall-02", { x: 120, y: 0 }, { x: 120, y: 120 }, { wallStartJoinMode: "square" });
  const types = wallTypes();
  types[0].wallEndCapLayerIds = [types[0].layers.at(-1)?.id ?? ""];
  const plan = buildAutomaticWallJoinPlan([first, second], types);

  assert.deepEqual(wallEndCapFootprints(first, types[0], plan).map((cap) => cap.endpoint), ["start", "end"]);
  assert.deepEqual(wallEndCapFootprints(second, types[0], plan).map((cap) => cap.endpoint), ["start", "end"]);
});

test("stacks multiple finish wraps without overlaps", () => {
  const line = wall("wall-01", { x: 0, y: 0 }, { x: 120, y: 0 });
  const types = wallTypes();
  types[0].wallEndCapLayerIds = [types[0].layers[0].id, types[0].layers.at(-1)?.id ?? ""];
  const plan = buildAutomaticWallJoinPlan([line], types);
  const caps = wallEndCapFootprints(line, types[0], plan);
  const startCaps = caps.filter((cap) => cap.endpoint === "start");
  const endCaps = caps.filter((cap) => cap.endpoint === "end");
  const body = wallLayerFootprint(line, types[0], 2, plan, new Map([[line.id, line]]), typeMap(types));

  assert.equal(startCaps.length, 2);
  assert.equal(endCaps.length, 2);
  assert.deepEqual(startCaps.map((cap) => cap.layerIndex), [0, 3]);
  assert.equal(startCaps[0].startExterior.x, 0);
  assert.equal(startCaps[0].endExterior.x, 0.5);
  assert.equal(startCaps[1].startExterior.x, startCaps[0].endExterior.x);
  assert.equal(startCaps[1].endExterior.x, 1);
  assert.equal(body.startExterior.x, 1);
  assert.equal(body.endExterior.x, 119);
});
