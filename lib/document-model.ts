import {
  arcGeometriesEqual,
  arcGeometryIsValid,
  arcPointAtFraction,
  cloneArcGeometry,
  moveArcGrip,
  type ArcGeometry,
  type ArcGrip,
} from "./cad-arc.ts";
import {
  boxWorldBounds,
  boxWorldPoint,
  boxModelsEqual,
  cloneBoxModel,
  DEFAULT_BOX_MODEL,
  MAXIMUM_COORDINATE,
  MINIMUM_DIMENSION,
  normalizeRotationZ,
  rotateBoxModel,
  ROTATION_BASE_DEFINITIONS,
  rotationBasePoint,
  type BoxModel,
  type AxisKey,
  type RotationBaseKey,
} from "./box-model.ts";
import {
  cloneLineGeometry,
  lineGeometryIsValid,
  lineGeometriesEqual,
  moveLineGrip,
  type LineGeometry,
  type LinePoint,
} from "./cad-line.ts";
import type { PlanPoint } from "./cad-line.ts";
import {
  offsetArcGeometry,
  offsetCircleGeometry,
  offsetLineGeometry,
  offsetPolylineGeometry,
} from "./cad-offset.ts";
import {
  circleGeometriesEqual,
  circleGeometryIsValid,
  cloneCircleGeometry,
  moveCircleGrip,
  type CircleGeometry,
  type CircleGrip,
} from "./cad-circle.ts";
import {
  clonePolylineGeometry,
  moveRectangleGrip,
  polylineGeometriesEqual,
  polylineGeometryIsValid,
  polylineSegmentCircularGeometry,
  polylineSegments,
  rectangleFromCorners,
  updatePolylineVertex,
  type PolylineGeometry,
  type RectangleGrip,
} from "./cad-polyline.ts";
import {
  extendArcGeometry,
  extendLineGeometry,
  extendPolylineGeometry,
  trimArcGeometry,
  trimCircleGeometry,
  trimLineGeometry,
  trimPolylineGeometry,
  type TrimExtendBoundary,
} from "./cad-trim-extend.ts";
import {
  stretchLineGeometry,
  stretchPolylineGeometry,
  type CadStretchTarget,
} from "./cad-stretch.ts";
import { chamferLineGeometries } from "./cad-chamfer.ts";
import { filletCurveGeometries, filletLineGeometries, type FilletCurveGeometry } from "./cad-fillet.ts";
import { chamferPolylineCorners, filletPolylineCorners } from "./cad-polyline-corners.ts";
import {
  breakArcAtPointGeometry,
  breakArcGeometry,
  breakCircleGeometry,
  breakLineAtPointGeometry,
  breakLineGeometry,
  breakPolylineAtPointGeometry,
  breakPolylineGeometry,
} from "./cad-break.ts";
import { joinCurveGeometries, type JoinCurveGeometry } from "./cad-join.ts";
import { explodePolylineGeometry } from "./cad-explode.ts";
import {
  lengthenArcGeometry,
  lengthenLineGeometry,
  lengthenPolylineGeometry,
  type LengthenEndpoint,
  type LengthenRequest,
} from "./cad-lengthen.ts";
import {
  discoverBoundaryAtPoint,
  type BoundaryDiscoveryResult,
  type BoundarySource,
} from "./cad-boundary.ts";
import { snapToSixteenth } from "./architectural-units.ts";
import {
  buildingStructureIsValid,
  buildingStructuresEqual,
  calculateStoryElevations,
  cloneBuildingStructure,
  createDefaultBuildingStructure,
  WALL_EXTERIOR_SIDES,
  WALL_REFERENCE_LINES,
  type BuildingStructure,
  type WallExteriorSide,
  type WallReferenceLine,
} from "./building-stories.ts";

export type BoxObject = BoxModel & {
  groupId: string | null;
  id: string;
  layerId: string;
  locked: boolean;
  name: string;
  storyId: string;
  type: "box";
};

export type LineObject = LineGeometry & {
  architecturalRole: "wall" | null;
  id: string;
  layerId: string;
  locked: boolean;
  name: string;
  storyId: string;
  type: "line";
  wallExteriorSide: WallExteriorSide | null;
  wallReferenceLine: WallReferenceLine | null;
  wallTypeId: string | null;
};

export type PolylineObject = PolylineGeometry & {
  architecturalRole: "floor-platform" | null;
  id: string;
  layerId: string;
  locked: boolean;
  name: string;
  shape: "polyline" | "rectangle";
  storyId: string;
  type: "polyline";
};

export type CircleObject = CircleGeometry & {
  id: string;
  layerId: string;
  locked: boolean;
  name: string;
  storyId: string;
  type: "circle";
};

export type ArcObject = ArcGeometry & {
  id: string;
  layerId: string;
  locked: boolean;
  name: string;
  storyId: string;
  type: "arc";
};

export type ModelGroup = {
  id: string;
  name: string;
};

export type ModelLayer = {
  color: string;
  id: string;
  locked: boolean;
  name: string;
  visible: boolean;
};

export type ModelDocument = {
  activeLayerId: string;
  arcs: ArcObject[];
  building: BuildingStructure;
  circles: CircleObject[];
  groups: ModelGroup[];
  layers: ModelLayer[];
  lines: LineObject[];
  objects: BoxObject[];
  polylines: PolylineObject[];
};

export type ModelEntityKind = "arc" | "box" | "circle" | "line" | "polyline";
export type ModelEntityRef = { id: string; kind: ModelEntityKind };

export type AlignmentMode = "minimum" | "center" | "maximum";

export const MAXIMUM_OBJECT_COUNT = 100;
export const MAXIMUM_LINE_COUNT = 2000;
export const MAXIMUM_POLYLINE_COUNT = 1000;
export const MAXIMUM_CIRCLE_COUNT = 1000;
export const MAXIMUM_ARC_COUNT = 1000;
export const MAXIMUM_LAYER_COUNT = 64;
export const MAXIMUM_GROUP_COUNT = 64;
export const DEFAULT_LAYER_ID = "layer-default";

export const DEFAULT_LAYER: ModelLayer = {
  color: "#7f95aa",
  id: DEFAULT_LAYER_ID,
  locked: false,
  name: "Default",
  visible: true,
};

const LAYER_COLORS = [
  "#6ea8d9",
  "#75be8f",
  "#d6a85e",
  "#c98585",
  "#9d89cf",
  "#68b8b1",
  "#bd8db6",
  "#aab16d",
];

export const DEFAULT_DOCUMENT: ModelDocument = {
  activeLayerId: DEFAULT_LAYER_ID,
  arcs: [],
  building: createDefaultBuildingStructure(),
  circles: [],
  groups: [],
  layers: [{ ...DEFAULT_LAYER }],
  lines: [],
  objects: [
    {
      ...cloneBoxModel(DEFAULT_BOX_MODEL),
      groupId: null,
      id: "box-01",
      layerId: DEFAULT_LAYER_ID,
      locked: false,
      name: "Box 01",
      storyId: "story-01",
      type: "box",
    },
  ],
  polylines: [],
};

export function cloneArcObject(arc: ArcObject): ArcObject {
  return {
    ...cloneArcGeometry(arc),
    id: arc.id,
    layerId: arc.layerId,
    locked: arc.locked,
    name: arc.name,
    storyId: arc.storyId,
    type: "arc",
  };
}

export function cloneCircleObject(circle: CircleObject): CircleObject {
  return {
    ...cloneCircleGeometry(circle),
    id: circle.id,
    layerId: circle.layerId,
    locked: circle.locked,
    name: circle.name,
    storyId: circle.storyId,
    type: "circle",
  };
}

export function cloneLineObject(line: LineObject): LineObject {
  return {
    ...cloneLineGeometry(line),
    architecturalRole: line.architecturalRole,
    id: line.id,
    layerId: line.layerId,
    locked: line.locked,
    name: line.name,
    storyId: line.storyId,
    type: "line",
    wallExteriorSide: line.wallExteriorSide,
    wallReferenceLine: line.wallReferenceLine,
    wallTypeId: line.wallTypeId,
  };
}

export function clonePolylineObject(polyline: PolylineObject): PolylineObject {
  return {
    ...clonePolylineGeometry(polyline),
    architecturalRole: polyline.architecturalRole,
    id: polyline.id,
    layerId: polyline.layerId,
    locked: polyline.locked,
    name: polyline.name,
    shape: polyline.shape,
    storyId: polyline.storyId,
    type: "polyline",
  };
}

export function cloneBoxObject(object: BoxObject): BoxObject {
  return {
    ...cloneBoxModel(object),
    groupId: object.groupId,
    id: object.id,
    layerId: object.layerId,
    locked: object.locked,
    name: object.name,
    storyId: object.storyId,
    type: "box",
  };
}

export function cloneLayer(layer: ModelLayer): ModelLayer {
  return { ...layer };
}

export function cloneGroup(group: ModelGroup): ModelGroup {
  return { ...group };
}

export function cloneDocument(document: ModelDocument): ModelDocument {
  return {
    activeLayerId: document.activeLayerId,
    arcs: document.arcs.map(cloneArcObject),
    building: cloneBuildingStructure(document.building),
    circles: document.circles.map(cloneCircleObject),
    groups: document.groups.map(cloneGroup),
    layers: document.layers.map(cloneLayer),
    lines: document.lines.map(cloneLineObject),
    objects: document.objects.map(cloneBoxObject),
    polylines: document.polylines.map(clonePolylineObject),
  };
}

export function documentsEqual(a: ModelDocument, b: ModelDocument): boolean {
  return (
    a.activeLayerId === b.activeLayerId &&
    buildingStructuresEqual(a.building, b.building) &&
    a.arcs.length === b.arcs.length &&
    a.arcs.every((arc, index) => {
      const other = b.arcs[index];
      return other !== undefined && arc.id === other.id && arc.layerId === other.layerId &&
        arc.locked === other.locked && arc.name === other.name && arc.storyId === other.storyId && arc.type === other.type &&
        arcGeometriesEqual(arc, other);
    }) &&
    a.circles.length === b.circles.length &&
    a.circles.every((circle, index) => {
      const other = b.circles[index];
      return other !== undefined && circle.id === other.id && circle.layerId === other.layerId &&
        circle.locked === other.locked && circle.name === other.name && circle.storyId === other.storyId && circle.type === other.type &&
        circleGeometriesEqual(circle, other);
    }) &&
    a.groups.length === b.groups.length &&
    a.groups.every((group, index) => {
      const other = b.groups[index];
      return other !== undefined && group.id === other.id && group.name === other.name;
    }) &&
    a.layers.length === b.layers.length &&
    a.layers.every((layer, index) => {
      const other = b.layers[index];
      return other !== undefined &&
        layer.id === other.id &&
        layer.name === other.name &&
        layer.color === other.color &&
        layer.visible === other.visible &&
        layer.locked === other.locked;
    }) &&
    a.lines.length === b.lines.length &&
    a.lines.every((line, index) => {
      const other = b.lines[index];
      return other !== undefined && line.id === other.id && line.layerId === other.layerId &&
        line.architecturalRole === other.architecturalRole && line.locked === other.locked && line.name === other.name && line.storyId === other.storyId && line.type === other.type && line.wallExteriorSide === other.wallExteriorSide && line.wallReferenceLine === other.wallReferenceLine && line.wallTypeId === other.wallTypeId &&
        lineGeometriesEqual(line, other);
    }) &&
    a.polylines.length === b.polylines.length &&
    a.polylines.every((polyline, index) => {
      const other = b.polylines[index];
      return other !== undefined && polyline.id === other.id && polyline.layerId === other.layerId &&
        polyline.architecturalRole === other.architecturalRole && polyline.locked === other.locked && polyline.name === other.name && polyline.shape === other.shape && polyline.storyId === other.storyId &&
        polylineGeometriesEqual(polyline, other);
    }) &&
    a.objects.length === b.objects.length &&
    a.objects.every((object, index) => {
      const other = b.objects[index];
      return (
        other !== undefined &&
        object.id === other.id &&
        object.groupId === other.groupId &&
        object.layerId === other.layerId &&
        object.locked === other.locked &&
        object.name === other.name &&
        object.storyId === other.storyId &&
        object.type === other.type &&
        boxModelsEqual(object, other)
      );
    })
  );
}

export function updateDocumentBuilding(
  document: ModelDocument,
  building: BuildingStructure,
): ModelDocument | null {
  if (!buildingStructureIsValid(building)) return null;
  const next = cloneDocument(document);
  const previousElevations = new Map(calculateStoryElevations(document.building).map((item) => [item.storyId, item.roughFloorElevation]));
  const nextElevations = new Map(calculateStoryElevations(building).map((item) => [item.storyId, item.roughFloorElevation]));
  const storyChange = (storyId: string): { delta: number; storyId: string } => {
    const previousElevation = previousElevations.get(storyId) ?? 0;
    if (nextElevations.has(storyId)) {
      return { delta: (nextElevations.get(storyId) ?? 0) - previousElevation, storyId };
    }
    const nearest = [...nextElevations.entries()].sort((first, second) =>
      Math.abs(first[1] - previousElevation) - Math.abs(second[1] - previousElevation))[0];
    return { delta: 0, storyId: nearest?.[0] ?? building.activeStoryId };
  };
  next.objects = next.objects.map((object) => {
    const change = storyChange(object.storyId);
    return { ...object, position: { ...object.position, z: snapToSixteenth(object.position.z + change.delta) }, storyId: change.storyId };
  });
  next.lines = next.lines.map((line) => {
    const change = storyChange(line.storyId);
    const wallTypeId = line.architecturalRole === "wall" && !building.wallTypes.some((wallType) => wallType.id === line.wallTypeId)
      ? building.activeWallTypeId
      : line.wallTypeId;
    return { ...line, start: { ...line.start, z: snapToSixteenth(line.start.z + change.delta) }, end: { ...line.end, z: snapToSixteenth(line.end.z + change.delta) }, storyId: change.storyId, wallTypeId };
  });
  next.polylines = next.polylines.map((polyline) => {
    const change = storyChange(polyline.storyId);
    return { ...polyline, elevation: snapToSixteenth(polyline.elevation + change.delta), storyId: change.storyId };
  });
  next.circles = next.circles.map((circle) => {
    const change = storyChange(circle.storyId);
    return { ...circle, center: { ...circle.center, z: snapToSixteenth(circle.center.z + change.delta) }, storyId: change.storyId };
  });
  next.arcs = next.arcs.map((arc) => {
    const change = storyChange(arc.storyId);
    return { ...arc, center: { ...arc.center, z: snapToSixteenth(arc.center.z + change.delta) }, storyId: change.storyId };
  });
  next.building = cloneBuildingStructure(building);
  return next;
}

export function assignModelEntityToStory(
  document: ModelDocument,
  ref: ModelEntityRef,
  storyId: string,
): ModelDocument | null {
  if (!document.building.stories.some((story) => story.id === storyId) || !modelEntityIsEditable(document, ref)) return null;
  const current = ref.kind === "box"
    ? findBoxObject(document, ref.id)
    : ref.kind === "line"
      ? findLineObject(document, ref.id)
      : ref.kind === "polyline"
        ? findPolylineObject(document, ref.id)
        : ref.kind === "circle"
          ? findCircleObject(document, ref.id)
          : findArcObject(document, ref.id);
  if (!current || current.storyId === storyId) return cloneDocument(document);
  const elevations = new Map(calculateStoryElevations(document.building).map((item) => [item.storyId, item.roughFloorElevation]));
  const delta = (elevations.get(storyId) ?? 0) - (elevations.get(current.storyId) ?? 0);
  const next = cloneDocument(document);
  if (ref.kind === "box") next.objects = next.objects.map((object) => object.id === ref.id ? { ...object, position: { ...object.position, z: snapToSixteenth(object.position.z + delta) }, storyId } : object);
  if (ref.kind === "line") next.lines = next.lines.map((line) => line.id === ref.id ? { ...line, start: { ...line.start, z: snapToSixteenth(line.start.z + delta) }, end: { ...line.end, z: snapToSixteenth(line.end.z + delta) }, storyId } : line);
  if (ref.kind === "polyline") next.polylines = next.polylines.map((polyline) => polyline.id === ref.id ? { ...polyline, elevation: snapToSixteenth(polyline.elevation + delta), storyId } : polyline);
  if (ref.kind === "circle") next.circles = next.circles.map((circle) => circle.id === ref.id ? { ...circle, center: { ...circle.center, z: snapToSixteenth(circle.center.z + delta) }, storyId } : circle);
  if (ref.kind === "arc") next.arcs = next.arcs.map((arc) => arc.id === ref.id ? { ...arc, center: { ...arc.center, z: snapToSixteenth(arc.center.z + delta) }, storyId } : arc);
  return next;
}

export function findLayer(
  document: ModelDocument,
  layerId: string | null,
): ModelLayer | null {
  if (!layerId) return null;
  return document.layers.find((layer) => layer.id === layerId) ?? null;
}

function withObjects(document: ModelDocument, objects: BoxObject[]): ModelDocument {
  const usedGroupIds = new Set(objects.map((object) => object.groupId).filter(Boolean));
  return {
    activeLayerId: document.activeLayerId,
    arcs: document.arcs.map(cloneArcObject),
    building: cloneBuildingStructure(document.building),
    circles: document.circles.map(cloneCircleObject),
    groups: document.groups.filter((group) => usedGroupIds.has(group.id)).map(cloneGroup),
    layers: document.layers.map(cloneLayer),
    lines: document.lines.map(cloneLineObject),
    objects: objects.map(cloneBoxObject),
    polylines: document.polylines.map(clonePolylineObject),
  };
}

function withLines(document: ModelDocument, lines: LineObject[]): ModelDocument {
  return {
    activeLayerId: document.activeLayerId,
    arcs: document.arcs.map(cloneArcObject),
    building: cloneBuildingStructure(document.building),
    circles: document.circles.map(cloneCircleObject),
    groups: document.groups.map(cloneGroup),
    layers: document.layers.map(cloneLayer),
    lines: lines.map(cloneLineObject),
    objects: document.objects.map(cloneBoxObject),
    polylines: document.polylines.map(clonePolylineObject),
  };
}

function withPolylines(document: ModelDocument, polylines: PolylineObject[]): ModelDocument {
  return {
    activeLayerId: document.activeLayerId,
    arcs: document.arcs.map(cloneArcObject),
    building: cloneBuildingStructure(document.building),
    circles: document.circles.map(cloneCircleObject),
    groups: document.groups.map(cloneGroup),
    layers: document.layers.map(cloneLayer),
    lines: document.lines.map(cloneLineObject),
    objects: document.objects.map(cloneBoxObject),
    polylines: polylines.map(clonePolylineObject),
  };
}

function withCircles(document: ModelDocument, circles: CircleObject[]): ModelDocument {
  return {
    activeLayerId: document.activeLayerId,
    arcs: document.arcs.map(cloneArcObject),
    building: cloneBuildingStructure(document.building),
    circles: circles.map(cloneCircleObject),
    groups: document.groups.map(cloneGroup),
    layers: document.layers.map(cloneLayer),
    lines: document.lines.map(cloneLineObject),
    objects: document.objects.map(cloneBoxObject),
    polylines: document.polylines.map(clonePolylineObject),
  };
}

function withArcs(document: ModelDocument, arcs: ArcObject[]): ModelDocument {
  return {
    activeLayerId: document.activeLayerId,
    arcs: arcs.map(cloneArcObject),
    building: cloneBuildingStructure(document.building),
    circles: document.circles.map(cloneCircleObject),
    groups: document.groups.map(cloneGroup),
    layers: document.layers.map(cloneLayer),
    lines: document.lines.map(cloneLineObject),
    objects: document.objects.map(cloneBoxObject),
    polylines: document.polylines.map(clonePolylineObject),
  };
}

export function findBoxObject(
  document: ModelDocument,
  objectId: string | null,
): BoxObject | null {
  if (!objectId) return null;
  return document.objects.find((object) => object.id === objectId) ?? null;
}

export function findLineObject(document: ModelDocument, lineId: string | null): LineObject | null {
  if (!lineId) return null;
  return document.lines.find((line) => line.id === lineId) ?? null;
}

export function findPolylineObject(document: ModelDocument, polylineId: string | null): PolylineObject | null {
  if (!polylineId) return null;
  return document.polylines.find((polyline) => polyline.id === polylineId) ?? null;
}

export function findCircleObject(document: ModelDocument, circleId: string | null): CircleObject | null {
  if (!circleId) return null;
  return document.circles.find((circle) => circle.id === circleId) ?? null;
}

export function findArcObject(document: ModelDocument, arcId: string | null): ArcObject | null {
  if (!arcId) return null;
  return document.arcs.find((arc) => arc.id === arcId) ?? null;
}

export function findGroup(
  document: ModelDocument,
  groupId: string | null,
): ModelGroup | null {
  if (!groupId) return null;
  return document.groups.find((group) => group.id === groupId) ?? null;
}

export function selectionIdsForObject(document: ModelDocument, objectId: string): string[] {
  const object = findBoxObject(document, objectId);
  if (!object) return [];
  if (!object.groupId) return [object.id];
  return document.objects
    .filter((candidate) => candidate.groupId === object.groupId)
    .map((candidate) => candidate.id);
}

export function objectIsEditable(document: ModelDocument, object: BoxObject): boolean {
  const layer = findLayer(document, object.layerId);
  return Boolean(layer?.visible && !layer.locked && !object.locked);
}

export function lineIsEditable(document: ModelDocument, line: LineObject): boolean {
  const layer = findLayer(document, line.layerId);
  return Boolean(layer?.visible && !layer.locked && !line.locked);
}

export function polylineIsEditable(document: ModelDocument, polyline: PolylineObject): boolean {
  const layer = findLayer(document, polyline.layerId);
  return Boolean(layer?.visible && !layer.locked && !polyline.locked);
}

export function circleIsEditable(document: ModelDocument, circle: CircleObject): boolean {
  const layer = findLayer(document, circle.layerId);
  return Boolean(layer?.visible && !layer.locked && !circle.locked);
}

export function arcIsEditable(document: ModelDocument, arc: ArcObject): boolean {
  const layer = findLayer(document, arc.layerId);
  return Boolean(layer?.visible && !layer.locked && !arc.locked);
}

export function updateBoxObject(
  document: ModelDocument,
  objectId: string,
  model: BoxModel,
): ModelDocument | null {
  const existing = findBoxObject(document, objectId);
  if (!existing || !objectIsEditable(document, existing)) return null;
  return withObjects(
    document,
    document.objects.map((object) =>
      object.id === objectId
        ? { ...cloneBoxModel(model), groupId: object.groupId, id: object.id, layerId: object.layerId, locked: object.locked, name: object.name, storyId: object.storyId, type: "box" }
        : cloneBoxObject(object),
    ),
  );
}

export function setBoxObjectPosition(
  document: ModelDocument,
  objectId: string,
  axis: AxisKey,
  value: number,
): ModelDocument | null {
  const object = findBoxObject(document, objectId);
  if (!object || !objectIsEditable(document, object) || !Number.isFinite(value)) return null;
  const snapped = Math.round(value * 16) / 16;
  if (Math.abs(snapped) > MAXIMUM_COORDINATE) return null;
  const next = cloneBoxModel(object);
  next.position[axis] = snapped;
  return updateBoxObject(document, objectId, next);
}

export function moveBoxObject(
  document: ModelDocument,
  objectId: string,
  axis: AxisKey,
  distance: number,
): ModelDocument | null {
  const object = findBoxObject(document, objectId);
  if (!object || !Number.isFinite(distance)) return null;
  return setBoxObjectPosition(
    document,
    objectId,
    axis,
    object.position[axis] + distance,
  );
}

export function moveBoxObjects(
  document: ModelDocument,
  objectIds: string[],
  axis: AxisKey,
  distance: number,
): ModelDocument | null {
  const ids = new Set(objectIds);
  if (!ids.size || !Number.isFinite(distance)) return null;
  const snappedDistance = Math.round(distance * 16) / 16;
  if (document.objects.filter((object) => ids.has(object.id)).length !== ids.size) return null;
  if (document.objects.some((object) => ids.has(object.id) && !objectIsEditable(document, object))) return null;
  if (
    document.objects.some(
      (object) => ids.has(object.id) &&
        Math.abs(object.position[axis] + snappedDistance) > MAXIMUM_COORDINATE,
    )
  ) {
    return null;
  }
  return withObjects(
    document,
    document.objects.map((object) => {
      if (!ids.has(object.id)) return object;
      const next = cloneBoxObject(object);
      next.position[axis] = Math.round((next.position[axis] + snappedDistance) * 16) / 16;
      return next;
    }),
  );
}

export function alignBoxObjects(
  document: ModelDocument,
  objectIds: string[],
  anchorObjectId: string,
  axis: AxisKey,
  mode: AlignmentMode,
): ModelDocument | null {
  const ids = new Set(objectIds);
  const anchor = findBoxObject(document, anchorObjectId);
  if (ids.size < 2 || !anchor || !ids.has(anchorObjectId)) return null;
  if (document.objects.filter((object) => ids.has(object.id)).length !== ids.size) return null;
  if (document.objects.some((object) => ids.has(object.id) && !objectIsEditable(document, object))) return null;
  const factor = mode === "minimum" ? 0 : mode === "center" ? 0.5 : 1;
  const anchorBounds = boxWorldBounds(anchor);
  const anchorCoordinate = anchorBounds.minimum[axis] +
    (anchorBounds.maximum[axis] - anchorBounds.minimum[axis]) * factor;
  const positions = new Map<string, number>();
  for (const object of document.objects) {
    if (!ids.has(object.id) || object.id === anchorObjectId) continue;
    const bounds = boxWorldBounds(object);
    const objectCoordinate = bounds.minimum[axis] +
      (bounds.maximum[axis] - bounds.minimum[axis]) * factor;
    const position = Math.round((object.position[axis] + anchorCoordinate - objectCoordinate) * 16) / 16;
    if (Math.abs(position) > MAXIMUM_COORDINATE) return null;
    positions.set(object.id, position);
  }
  return withObjects(
    document,
    document.objects.map((object) => {
      const position = positions.get(object.id);
      if (position === undefined) return object;
      const next = cloneBoxObject(object);
      next.position[axis] = position;
      return next;
    }),
  );
}

export function rotateBoxObjects(
  document: ModelDocument,
  objectIds: string[],
  anchorObjectId: string,
  deltaDegrees: number,
  baseKey: RotationBaseKey,
): ModelDocument | null {
  const ids = new Set(objectIds);
  const anchor = findBoxObject(document, anchorObjectId);
  if (!ids.size || !anchor || !ids.has(anchorObjectId) || !Number.isFinite(deltaDegrees)) return null;
  const selected = document.objects.filter((object) => ids.has(object.id));
  if (selected.length !== ids.size || selected.some((object) => !objectIsEditable(document, object))) return null;
  const basePoint = rotationBasePoint(anchor, baseKey);
  const rotated = new Map<string, BoxObject>();
  for (const object of selected) {
    const next = rotateBoxModel(object, deltaDegrees, basePoint);
    if (!next) return null;
    rotated.set(object.id, { ...cloneBoxObject(object), ...next });
  }
  return withObjects(
    document,
    document.objects.map((object) => rotated.get(object.id) ?? object),
  );
}

function intervalsOverlap(
  aMinimum: number,
  aMaximum: number,
  bMinimum: number,
  bMaximum: number,
): boolean {
  return aMinimum <= bMaximum && bMinimum <= aMaximum;
}

export function snapObjectMoveDistance(
  document: ModelDocument,
  objectId: string,
  axis: AxisKey,
  distance: number,
  threshold = 3,
): { distance: number; snapped: boolean } {
  const source = findBoxObject(document, objectId);
  const gridDistance = Math.round(distance * 16) / 16;
  if (!source || !Number.isFinite(gridDistance) || threshold < 0) {
    return { distance: gridDistance, snapped: false };
  }

  const sourceBounds = boxWorldBounds(source);
  const sourceMinimum = sourceBounds.minimum[axis] + gridDistance;
  const sourceMaximum = sourceBounds.maximum[axis] + gridDistance;
  const orthogonalAxes = (["x", "y", "z"] as AxisKey[]).filter(
    (candidate) => candidate !== axis,
  );
  let bestCorrection: number | null = null;

  document.objects.forEach((object) => {
    if (object.id === objectId || !findLayer(document, object.layerId)?.visible) return;
    const overlaps = orthogonalAxes.every((orthogonalAxis) => {
      const objectBounds = boxWorldBounds(object);
      return intervalsOverlap(
        sourceBounds.minimum[orthogonalAxis],
        sourceBounds.maximum[orthogonalAxis],
        objectBounds.minimum[orthogonalAxis],
        objectBounds.maximum[orthogonalAxis],
      );
    });
    if (!overlaps) return;

    const targetBounds = boxWorldBounds(object);
    const targetMinimum = targetBounds.minimum[axis];
    const targetMaximum = targetBounds.maximum[axis];
    const corrections = [
      targetMinimum - sourceMaximum,
      targetMaximum - sourceMinimum,
      targetMinimum - sourceMinimum,
      targetMaximum - sourceMaximum,
    ];
    corrections.forEach((correction) => {
      if (Math.abs(correction) > threshold) return;
      if (bestCorrection === null || Math.abs(correction) < Math.abs(bestCorrection)) {
        bestCorrection = correction;
      }
    });
  });

  if (bestCorrection === null) return { distance: gridDistance, snapped: false };
  return {
    distance: Math.round((gridDistance + bestCorrection) * 16) / 16,
    snapped: true,
  };
}

function nextObjectNumber(document: ModelDocument): number {
  const usedNumbers = document.objects.map((object) => {
    const match = /^box-(\d+)$/i.exec(object.id);
    return match ? Number(match[1]) : 0;
  });
  return Math.max(0, ...usedNumbers) + 1;
}

function uniqueObjectName(document: ModelDocument, desiredName: string): string {
  const existing = new Set([
    ...document.arcs.map((arc) => arc.name.toLowerCase()),
    ...document.circles.map((circle) => circle.name.toLowerCase()),
    ...document.objects.map((object) => object.name.toLowerCase()),
    ...document.lines.map((line) => line.name.toLowerCase()),
    ...document.polylines.map((polyline) => polyline.name.toLowerCase()),
  ]);
  const maximumAttempts = MAXIMUM_OBJECT_COUNT + MAXIMUM_LINE_COUNT + MAXIMUM_POLYLINE_COUNT + MAXIMUM_CIRCLE_COUNT + MAXIMUM_ARC_COUNT + 1;
  for (let copyNumber = 1; copyNumber <= maximumAttempts; copyNumber += 1) {
    const suffix = copyNumber === 1 ? "" : ` ${copyNumber}`;
    const candidate = `${desiredName.slice(0, 120 - suffix.length).trimEnd()}${suffix}`;
    if (!existing.has(candidate.toLowerCase())) return candidate;
  }
  return "Box Copy";
}

export function activeStoryRoughFloorElevation(document: ModelDocument): number {
  return calculateStoryElevations(document.building).find(
    (calculation) => calculation.storyId === document.building.activeStoryId,
  )?.roughFloorElevation ?? 0;
}

export function addBoxObject(document: ModelDocument): {
  document: ModelDocument;
  object: BoxObject;
} | null {
  if (document.objects.length >= MAXIMUM_OBJECT_COUNT) return null;
  const number = nextObjectNumber(document);
  const rightEdge = Math.max(
    0,
    ...document.objects.map((object) => boxWorldBounds(object).maximum.x),
  );
  const object: BoxObject = {
    ...cloneBoxModel(DEFAULT_BOX_MODEL),
    groupId: null,
    id: `box-${String(number).padStart(2, "0")}`,
    layerId: document.activeLayerId,
    locked: false,
    name: `Box ${String(number).padStart(2, "0")}`,
    position: { x: rightEdge + 24, y: 0, z: activeStoryRoughFloorElevation(document) },
    storyId: document.building.activeStoryId,
    type: "box",
  };
  return {
    document: withObjects(document, [...document.objects, object]),
    object: cloneBoxObject(object),
  };
}

function nextLineNumber(document: ModelDocument): number {
  const usedNumbers = document.lines.map((line) => {
    const match = /^line-(\d+)$/i.exec(line.id);
    return match ? Number(match[1]) : 0;
  });
  return Math.max(0, ...usedNumbers) + 1;
}

export function addLineObject(
  document: ModelDocument,
  start: LinePoint,
  end: LinePoint,
): { document: ModelDocument; line: LineObject } | null {
  if (document.lines.length >= MAXIMUM_LINE_COUNT) return null;
  const geometry: LineGeometry = {
    start: { x: Math.round(start.x * 16) / 16, y: Math.round(start.y * 16) / 16, z: Math.round(start.z * 16) / 16 },
    end: { x: Math.round(end.x * 16) / 16, y: Math.round(end.y * 16) / 16, z: Math.round(end.z * 16) / 16 },
  };
  if (!lineGeometryIsValid(geometry)) return null;
  const number = nextLineNumber(document);
  const line: LineObject = {
    ...geometry,
    architecturalRole: null,
    id: `line-${String(number).padStart(2, "0")}`,
    layerId: document.activeLayerId,
    locked: false,
    name: uniqueObjectName(document, `Line ${String(number).padStart(2, "0")}`),
    storyId: document.building.activeStoryId,
    type: "line",
    wallExteriorSide: null,
    wallReferenceLine: null,
    wallTypeId: null,
  };
  return { document: withLines(document, [...document.lines, line]), line: cloneLineObject(line) };
}

export function updateLineObject(
  document: ModelDocument,
  lineId: string,
  geometry: LineGeometry,
): ModelDocument | null {
  const line = findLineObject(document, lineId);
  if (!line || !lineIsEditable(document, line)) return null;
  const normalizedGeometry = cloneLineGeometry(geometry);
  if (line.architecturalRole === "wall") {
    const roughFloor = calculateStoryElevations(document.building).find((story) => story.storyId === line.storyId)?.roughFloorElevation;
    if (roughFloor === undefined) return null;
    normalizedGeometry.start.z = roughFloor;
    normalizedGeometry.end.z = roughFloor;
  }
  if (!lineGeometryIsValid(normalizedGeometry)) return null;
  return withLines(document, document.lines.map((candidate) =>
    candidate.id === lineId ? { ...cloneLineObject(candidate), ...normalizedGeometry } : candidate,
  ));
}

export function createWallFromLine(document: ModelDocument, lineId: string): ModelDocument | null {
  const line = findLineObject(document, lineId);
  const wallType = document.building.wallTypes.find((candidate) => candidate.id === document.building.activeWallTypeId);
  const roughFloor = calculateStoryElevations(document.building).find((story) => story.storyId === line?.storyId)?.roughFloorElevation;
  if (!line || !wallType || roughFloor === undefined || !lineIsEditable(document, line) || Math.hypot(line.end.x - line.start.x, line.end.y - line.start.y) < 1 / 16) return null;
  const lineNumber = /^Line\s+(.+)$/i.exec(line.name)?.[1];
  const wallName = line.name.startsWith("Wall ") ? line.name : lineNumber ? `Wall ${lineNumber}` : `Wall ${line.name}`;
  return withLines(document, document.lines.map((candidate) => candidate.id === lineId ? {
    ...cloneLineObject(candidate),
    architecturalRole: "wall",
    end: { ...candidate.end, z: roughFloor },
    name: candidate.name.startsWith("Wall ") ? candidate.name : uniqueObjectName(document, wallName),
    start: { ...candidate.start, z: roughFloor },
    wallExteriorSide: "left",
    wallReferenceLine: "exterior-main",
    wallTypeId: wallType.id,
  } : candidate));
}

export function removeWallRole(document: ModelDocument, lineId: string): ModelDocument | null {
  const line = findLineObject(document, lineId);
  if (!line || line.architecturalRole !== "wall" || !lineIsEditable(document, line)) return null;
  return withLines(document, document.lines.map((candidate) => candidate.id === lineId ? { ...cloneLineObject(candidate), architecturalRole: null, wallExteriorSide: null, wallReferenceLine: null, wallTypeId: null } : candidate));
}

export function assignWallType(document: ModelDocument, lineId: string, wallTypeId: string): ModelDocument | null {
  const line = findLineObject(document, lineId);
  if (!line || line.architecturalRole !== "wall" || !lineIsEditable(document, line) || !document.building.wallTypes.some((wallType) => wallType.id === wallTypeId)) return null;
  return withLines(document, document.lines.map((candidate) => candidate.id === lineId ? { ...cloneLineObject(candidate), wallTypeId } : candidate));
}

export function updateWallPlacement(
  document: ModelDocument,
  lineId: string,
  change: { exteriorSide?: WallExteriorSide; referenceLine?: WallReferenceLine },
): ModelDocument | null {
  const line = findLineObject(document, lineId);
  if (
    !line ||
    line.architecturalRole !== "wall" ||
    !lineIsEditable(document, line) ||
    (change.exteriorSide !== undefined && !WALL_EXTERIOR_SIDES.includes(change.exteriorSide)) ||
    (change.referenceLine !== undefined && !WALL_REFERENCE_LINES.includes(change.referenceLine))
  ) return null;
  return withLines(document, document.lines.map((candidate) => candidate.id === lineId ? {
    ...cloneLineObject(candidate),
    wallExteriorSide: change.exteriorSide ?? candidate.wallExteriorSide,
    wallReferenceLine: change.referenceLine ?? candidate.wallReferenceLine,
  } : candidate));
}

export function updateLineGrip(
  document: ModelDocument,
  lineId: string,
  grip: "start" | "midpoint" | "end",
  target: LinePoint,
): ModelDocument | null {
  const line = findLineObject(document, lineId);
  if (!line) return null;
  const geometry = moveLineGrip(line, grip, target);
  return geometry ? updateLineObject(document, lineId, geometry) : null;
}

export function renameLineObject(document: ModelDocument, lineId: string, name: string): ModelDocument | null {
  const normalizedName = name.trim();
  const line = findLineObject(document, lineId);
  if (!line || !lineIsEditable(document, line) || !normalizedName || normalizedName.length > 120) return null;
  if (document.lines.some((candidate) => candidate.id !== lineId && candidate.name.toLowerCase() === normalizedName.toLowerCase()) ||
      document.objects.some((object) => object.name.toLowerCase() === normalizedName.toLowerCase()) ||
      document.polylines.some((polyline) => polyline.name.toLowerCase() === normalizedName.toLowerCase()) ||
      document.circles.some((circle) => circle.name.toLowerCase() === normalizedName.toLowerCase()) ||
      document.arcs.some((arc) => arc.name.toLowerCase() === normalizedName.toLowerCase())) return null;
  return withLines(document, document.lines.map((candidate) =>
    candidate.id === lineId ? { ...cloneLineObject(candidate), name: normalizedName } : candidate,
  ));
}

export function assignLineToLayer(document: ModelDocument, lineId: string, layerId: string): ModelDocument | null {
  const line = findLineObject(document, lineId);
  if (!line || !lineIsEditable(document, line) || !findLayer(document, layerId)) return null;
  return withLines(document, document.lines.map((candidate) =>
    candidate.id === lineId ? { ...cloneLineObject(candidate), layerId } : candidate,
  ));
}

export function setLineLocked(document: ModelDocument, lineId: string, locked: boolean): ModelDocument | null {
  if (!findLineObject(document, lineId)) return null;
  return withLines(document, document.lines.map((line) =>
    line.id === lineId ? { ...cloneLineObject(line), locked } : line,
  ));
}

export function deleteLineObject(document: ModelDocument, lineId: string): ModelDocument | null {
  const line = findLineObject(document, lineId);
  if (!line || !lineIsEditable(document, line)) return null;
  return withLines(document, document.lines.filter((candidate) => candidate.id !== lineId));
}

function nextPolylineNumber(document: ModelDocument): number {
  const usedNumbers = document.polylines.map((polyline) => {
    const match = /^polyline-(\d+)$/i.exec(polyline.id);
    return match ? Number(match[1]) : 0;
  });
  return Math.max(0, ...usedNumbers) + 1;
}

export function addPolylineObject(
  document: ModelDocument,
  geometry: PolylineGeometry,
  shape: "polyline" | "rectangle" = "polyline",
): { document: ModelDocument; polyline: PolylineObject } | null {
  if (document.polylines.length >= MAXIMUM_POLYLINE_COUNT || !polylineGeometryIsValid(geometry)) return null;
  const number = nextPolylineNumber(document);
  const baseName = `${shape === "rectangle" ? "Rectangle" : "Polyline"} ${String(number).padStart(2, "0")}`;
  const polyline: PolylineObject = {
    ...clonePolylineGeometry(geometry),
    architecturalRole: null,
    id: `polyline-${String(number).padStart(2, "0")}`,
    layerId: document.activeLayerId,
    locked: false,
    name: uniqueObjectName(document, baseName),
    shape,
    storyId: document.building.activeStoryId,
    type: "polyline",
  };
  return { document: withPolylines(document, [...document.polylines, polyline]), polyline: clonePolylineObject(polyline) };
}

export function addRectangleObject(document: ModelDocument, start: PlanPoint, end: PlanPoint, elevation = 0) {
  const rectangle = rectangleFromCorners(start, end, elevation);
  return rectangle ? addPolylineObject(document, rectangle, "rectangle") : null;
}

function visibleBoundarySources(document: ModelDocument): BoundarySource[] {
  const visibleLayerIds = new Set(document.layers.filter((layer) => layer.visible).map((layer) => layer.id));
  return [
    ...document.lines.filter((line) => visibleLayerIds.has(line.layerId)).map((line) => ({ geometry: cloneLineGeometry(line), kind: "line" as const })),
    ...document.polylines.filter((polyline) => visibleLayerIds.has(polyline.layerId)).map((polyline) => ({ geometry: clonePolylineGeometry(polyline), kind: "polyline" as const })),
    ...document.circles.filter((circle) => visibleLayerIds.has(circle.layerId)).map((circle) => ({ geometry: cloneCircleGeometry(circle), kind: "circle" as const })),
    ...document.arcs.filter((arc) => visibleLayerIds.has(arc.layerId)).map((arc) => ({ geometry: cloneArcGeometry(arc), kind: "arc" as const })),
  ];
}

export function discoverDocumentBoundary(
  document: ModelDocument,
  pick: LinePoint,
  elevation = pick.z,
): BoundaryDiscoveryResult | null {
  return discoverBoundaryAtPoint(visibleBoundarySources(document), pick, elevation);
}

export function createBoundaryPolylineObject(
  document: ModelDocument,
  pick: LinePoint,
  elevation = pick.z,
): { document: ModelDocument; polyline: PolylineObject } | null {
  const activeLayer = findLayer(document, document.activeLayerId);
  if (!activeLayer || !activeLayer.visible || activeLayer.locked) return null;
  const boundary = discoverDocumentBoundary(document, pick, elevation);
  return boundary ? addPolylineObject(document, boundary.geometry, "polyline") : null;
}

export function updatePolylineObject(document: ModelDocument, polylineId: string, geometry: PolylineGeometry): ModelDocument | null {
  const polyline = findPolylineObject(document, polylineId);
  if (!polyline || !polylineIsEditable(document, polyline) || !polylineGeometryIsValid(geometry)) return null;
  return withPolylines(document, document.polylines.map((candidate) =>
    candidate.id === polylineId ? {
      ...clonePolylineObject(candidate),
      ...clonePolylineGeometry(geometry),
      architecturalRole: geometry.closed ? candidate.architecturalRole : null,
      elevation: candidate.architecturalRole === "floor-platform" ? candidate.elevation : geometry.elevation,
    } : candidate,
  ));
}

export function createFloorPlatformFromPolyline(document: ModelDocument, polylineId: string): ModelDocument | null {
  const polyline = findPolylineObject(document, polylineId);
  if (!polyline || !polyline.closed || !polylineIsEditable(document, polyline)) return null;
  const story = document.building.stories.find((candidate) => candidate.id === polyline.storyId);
  if (!story || !story.floorStructure.layers.length) return null;
  const roughFloorElevation = calculateStoryElevations(document.building).find((candidate) => candidate.storyId === polyline.storyId)?.roughFloorElevation;
  if (roughFloorElevation === undefined) return null;
  return withPolylines(document, document.polylines.map((candidate) => candidate.id === polylineId
    ? { ...clonePolylineObject(candidate), architecturalRole: "floor-platform", elevation: roughFloorElevation, name: candidate.name.startsWith("Floor Platform") ? candidate.name : uniqueObjectName(document, `Floor Platform ${candidate.name}`) }
    : candidate));
}

export function removeFloorPlatformRole(document: ModelDocument, polylineId: string): ModelDocument | null {
  const polyline = findPolylineObject(document, polylineId);
  if (!polyline || polyline.architecturalRole !== "floor-platform" || !polylineIsEditable(document, polyline)) return null;
  return withPolylines(document, document.polylines.map((candidate) => candidate.id === polylineId
    ? { ...clonePolylineObject(candidate), architecturalRole: null }
    : candidate));
}

export function updatePolylineObjectVertex(document: ModelDocument, polylineId: string, index: number, point: PlanPoint): ModelDocument | null {
  const polyline = findPolylineObject(document, polylineId);
  if (!polyline) return null;
  const geometry = polyline.shape === "rectangle"
    ? moveRectangleGrip(polyline, { index, kind: "corner" }, point)
    : updatePolylineVertex(polyline, index, point);
  return geometry ? updatePolylineObject(document, polylineId, geometry) : null;
}

export function updatePolylineObjectGrip(document: ModelDocument, polylineId: string, grip: RectangleGrip, point: PlanPoint): ModelDocument | null {
  const polyline = findPolylineObject(document, polylineId);
  if (!polyline || polyline.shape !== "rectangle") return null;
  const geometry = moveRectangleGrip(polyline, grip, point);
  return geometry ? updatePolylineObject(document, polylineId, geometry) : null;
}

export function renamePolylineObject(document: ModelDocument, polylineId: string, name: string): ModelDocument | null {
  const normalizedName = name.trim();
  const polyline = findPolylineObject(document, polylineId);
  if (!polyline || !polylineIsEditable(document, polyline) || !normalizedName || normalizedName.length > 120) return null;
  if (document.polylines.some((candidate) => candidate.id !== polylineId && candidate.name.toLowerCase() === normalizedName.toLowerCase()) ||
      document.lines.some((line) => line.name.toLowerCase() === normalizedName.toLowerCase()) ||
      document.objects.some((object) => object.name.toLowerCase() === normalizedName.toLowerCase()) ||
      document.circles.some((circle) => circle.name.toLowerCase() === normalizedName.toLowerCase()) ||
      document.arcs.some((arc) => arc.name.toLowerCase() === normalizedName.toLowerCase())) return null;
  return withPolylines(document, document.polylines.map((candidate) => candidate.id === polylineId ? { ...clonePolylineObject(candidate), name: normalizedName } : candidate));
}

export function assignPolylineToLayer(document: ModelDocument, polylineId: string, layerId: string): ModelDocument | null {
  const polyline = findPolylineObject(document, polylineId);
  if (!polyline || !polylineIsEditable(document, polyline) || !findLayer(document, layerId)) return null;
  return withPolylines(document, document.polylines.map((candidate) => candidate.id === polylineId ? { ...clonePolylineObject(candidate), layerId } : candidate));
}

export function setPolylineLocked(document: ModelDocument, polylineId: string, locked: boolean): ModelDocument | null {
  if (!findPolylineObject(document, polylineId)) return null;
  return withPolylines(document, document.polylines.map((polyline) => polyline.id === polylineId ? { ...clonePolylineObject(polyline), locked } : polyline));
}

export function deletePolylineObject(document: ModelDocument, polylineId: string): ModelDocument | null {
  const polyline = findPolylineObject(document, polylineId);
  if (!polyline || !polylineIsEditable(document, polyline)) return null;
  return withPolylines(document, document.polylines.filter((candidate) => candidate.id !== polylineId));
}

function nextCircleNumber(document: ModelDocument): number {
  const usedNumbers = document.circles.map((circle) => {
    const match = /^circle-(\d+)$/i.exec(circle.id);
    return match ? Number(match[1]) : 0;
  });
  return Math.max(0, ...usedNumbers) + 1;
}

export function addCircleObject(document: ModelDocument, geometry: CircleGeometry): { document: ModelDocument; circle: CircleObject } | null {
  if (document.circles.length >= MAXIMUM_CIRCLE_COUNT || !circleGeometryIsValid(geometry)) return null;
  const number = nextCircleNumber(document);
  const circle: CircleObject = {
    ...cloneCircleGeometry(geometry),
    id: `circle-${String(number).padStart(2, "0")}`,
    layerId: document.activeLayerId,
    locked: false,
    name: uniqueObjectName(document, `Circle ${String(number).padStart(2, "0")}`),
    storyId: document.building.activeStoryId,
    type: "circle",
  };
  return { document: withCircles(document, [...document.circles, circle]), circle: cloneCircleObject(circle) };
}

export function updateCircleObject(document: ModelDocument, circleId: string, geometry: CircleGeometry): ModelDocument | null {
  const circle = findCircleObject(document, circleId);
  if (!circle || !circleIsEditable(document, circle) || !circleGeometryIsValid(geometry)) return null;
  return withCircles(document, document.circles.map((candidate) =>
    candidate.id === circleId ? { ...cloneCircleObject(candidate), ...cloneCircleGeometry(geometry) } : candidate,
  ));
}

export function updateCircleGrip(document: ModelDocument, circleId: string, grip: CircleGrip, target: LinePoint): ModelDocument | null {
  const circle = findCircleObject(document, circleId);
  if (!circle) return null;
  const geometry = moveCircleGrip(circle, grip, target);
  return geometry ? updateCircleObject(document, circleId, geometry) : null;
}

export function renameCircleObject(document: ModelDocument, circleId: string, name: string): ModelDocument | null {
  const normalizedName = name.trim();
  const circle = findCircleObject(document, circleId);
  if (!circle || !circleIsEditable(document, circle) || !normalizedName || normalizedName.length > 120) return null;
  const existingNames = [...document.objects, ...document.lines, ...document.polylines, ...document.arcs, ...document.circles.filter((candidate) => candidate.id !== circleId)].map((entity) => entity.name.toLowerCase());
  if (existingNames.includes(normalizedName.toLowerCase())) return null;
  return withCircles(document, document.circles.map((candidate) => candidate.id === circleId ? { ...cloneCircleObject(candidate), name: normalizedName } : candidate));
}

export function assignCircleToLayer(document: ModelDocument, circleId: string, layerId: string): ModelDocument | null {
  const circle = findCircleObject(document, circleId);
  if (!circle || !circleIsEditable(document, circle) || !findLayer(document, layerId)) return null;
  return withCircles(document, document.circles.map((candidate) => candidate.id === circleId ? { ...cloneCircleObject(candidate), layerId } : candidate));
}

export function setCircleLocked(document: ModelDocument, circleId: string, locked: boolean): ModelDocument | null {
  if (!findCircleObject(document, circleId)) return null;
  return withCircles(document, document.circles.map((circle) => circle.id === circleId ? { ...cloneCircleObject(circle), locked } : circle));
}

export function deleteCircleObject(document: ModelDocument, circleId: string): ModelDocument | null {
  const circle = findCircleObject(document, circleId);
  if (!circle || !circleIsEditable(document, circle)) return null;
  return withCircles(document, document.circles.filter((candidate) => candidate.id !== circleId));
}

function nextArcNumber(document: ModelDocument): number {
  const usedNumbers = document.arcs.map((arc) => {
    const match = /^arc-(\d+)$/i.exec(arc.id);
    return match ? Number(match[1]) : 0;
  });
  return Math.max(0, ...usedNumbers) + 1;
}

export function addArcObject(document: ModelDocument, geometry: ArcGeometry): { document: ModelDocument; arc: ArcObject } | null {
  if (document.arcs.length >= MAXIMUM_ARC_COUNT || !arcGeometryIsValid(geometry)) return null;
  const number = nextArcNumber(document);
  const arc: ArcObject = {
    ...cloneArcGeometry(geometry),
    id: `arc-${String(number).padStart(2, "0")}`,
    layerId: document.activeLayerId,
    locked: false,
    name: uniqueObjectName(document, `Arc ${String(number).padStart(2, "0")}`),
    storyId: document.building.activeStoryId,
    type: "arc",
  };
  return { document: withArcs(document, [...document.arcs, arc]), arc: cloneArcObject(arc) };
}

export function updateArcObject(document: ModelDocument, arcId: string, geometry: ArcGeometry): ModelDocument | null {
  const arc = findArcObject(document, arcId);
  if (!arc || !arcIsEditable(document, arc) || !arcGeometryIsValid(geometry)) return null;
  return withArcs(document, document.arcs.map((candidate) => candidate.id === arcId ? { ...cloneArcObject(candidate), ...cloneArcGeometry(geometry) } : candidate));
}

export function updateArcGrip(document: ModelDocument, arcId: string, grip: ArcGrip, target: LinePoint): ModelDocument | null {
  const arc = findArcObject(document, arcId);
  if (!arc) return null;
  const geometry = moveArcGrip(arc, grip, target);
  return geometry ? updateArcObject(document, arcId, geometry) : null;
}

export function renameArcObject(document: ModelDocument, arcId: string, name: string): ModelDocument | null {
  const normalizedName = name.trim();
  const arc = findArcObject(document, arcId);
  if (!arc || !arcIsEditable(document, arc) || !normalizedName || normalizedName.length > 120) return null;
  const existingNames = [...document.objects, ...document.lines, ...document.polylines, ...document.circles, ...document.arcs.filter((candidate) => candidate.id !== arcId)].map((entity) => entity.name.toLowerCase());
  if (existingNames.includes(normalizedName.toLowerCase())) return null;
  return withArcs(document, document.arcs.map((candidate) => candidate.id === arcId ? { ...cloneArcObject(candidate), name: normalizedName } : candidate));
}

export function assignArcToLayer(document: ModelDocument, arcId: string, layerId: string): ModelDocument | null {
  const arc = findArcObject(document, arcId);
  if (!arc || !arcIsEditable(document, arc) || !findLayer(document, layerId)) return null;
  return withArcs(document, document.arcs.map((candidate) => candidate.id === arcId ? { ...cloneArcObject(candidate), layerId } : candidate));
}

export function setArcLocked(document: ModelDocument, arcId: string, locked: boolean): ModelDocument | null {
  if (!findArcObject(document, arcId)) return null;
  return withArcs(document, document.arcs.map((arc) => arc.id === arcId ? { ...cloneArcObject(arc), locked } : arc));
}

export function deleteArcObject(document: ModelDocument, arcId: string): ModelDocument | null {
  const arc = findArcObject(document, arcId);
  if (!arc || !arcIsEditable(document, arc)) return null;
  return withArcs(document, document.arcs.filter((candidate) => candidate.id !== arcId));
}

export function renameBoxObject(
  document: ModelDocument,
  objectId: string,
  name: string,
): ModelDocument | null {
  const normalizedName = name.trim();
  if (!normalizedName || normalizedName.length > 120) return null;
  const selected = findBoxObject(document, objectId);
  if (!selected || !objectIsEditable(document, selected)) return null;
  if (
    document.objects.some(
      (object) =>
        object.id !== objectId &&
        object.name.toLowerCase() === normalizedName.toLowerCase(),
    ) || document.lines.some((line) => line.name.toLowerCase() === normalizedName.toLowerCase()) ||
      document.polylines.some((polyline) => polyline.name.toLowerCase() === normalizedName.toLowerCase()) ||
      document.circles.some((circle) => circle.name.toLowerCase() === normalizedName.toLowerCase()) ||
      document.arcs.some((arc) => arc.name.toLowerCase() === normalizedName.toLowerCase())
  ) {
    return null;
  }
  return withObjects(
    document,
    document.objects.map((object) =>
      object.id === objectId
        ? { ...cloneBoxObject(object), name: normalizedName }
        : cloneBoxObject(object),
    ),
  );
}

export function duplicateBoxObject(
  document: ModelDocument,
  objectId: string,
): { document: ModelDocument; object: BoxObject } | null {
  if (document.objects.length >= MAXIMUM_OBJECT_COUNT) return null;
  const source = findBoxObject(document, objectId);
  if (!source || !objectIsEditable(document, source)) return null;
  const number = nextObjectNumber(document);
  const object: BoxObject = {
    ...cloneBoxObject(source),
    groupId: null,
    id: `box-${String(number).padStart(2, "0")}`,
    locked: false,
    name: uniqueObjectName(document, `${source.name.slice(0, 115).trimEnd()} Copy`),
    position: {
      x: source.position.x + 24 <= MAXIMUM_COORDINATE
        ? source.position.x + 24
        : source.position.x - 24,
      y: source.position.y + 24 <= MAXIMUM_COORDINATE
        ? source.position.y + 24
        : source.position.y - 24,
      z: source.position.z,
    },
  };
  return {
    document: withObjects(document, [...document.objects, object]),
    object: cloneBoxObject(object),
  };
}

export function copyBoxObjects(
  document: ModelDocument,
  objectIds: string[],
  axis: AxisKey,
  distance: number,
): { document: ModelDocument; objects: BoxObject[] } | null {
  const uniqueIds = [...new Set(objectIds)];
  const snappedDistance = Math.round(distance * 16) / 16;
  if (
    !uniqueIds.length ||
    !Number.isFinite(snappedDistance) ||
    snappedDistance === 0 ||
    document.objects.length + uniqueIds.length > MAXIMUM_OBJECT_COUNT
  ) {
    return null;
  }
  const sources = uniqueIds.map((objectId) => findBoxObject(document, objectId));
  if (sources.some((source) => source === null)) return null;
  if (sources.some((source) => source && !objectIsEditable(document, source))) return null;
  if (
    sources.some(
      (source) => source && Math.abs(source.position[axis] + snappedDistance) > MAXIMUM_COORDINATE,
    )
  ) {
    return null;
  }

  let workingDocument = cloneDocument(document);
  const copies: BoxObject[] = [];
  for (const source of sources as BoxObject[]) {
    const number = nextObjectNumber(workingDocument);
    const copy = cloneBoxObject(source);
    copy.groupId = null;
    copy.id = `box-${String(number).padStart(2, "0")}`;
    copy.locked = false;
    copy.name = uniqueObjectName(
      workingDocument,
      `${source.name.slice(0, 115).trimEnd()} Copy`,
    );
    copy.position[axis] = Math.round((source.position[axis] + snappedDistance) * 16) / 16;
    workingDocument = withObjects(workingDocument, [...workingDocument.objects, copy]);
    copies.push(cloneBoxObject(copy));
  }
  return { document: workingDocument, objects: copies };
}

export function deleteBoxObject(
  document: ModelDocument,
  objectId: string,
): ModelDocument | null {
  const object = findBoxObject(document, objectId);
  if (document.objects.length <= 1 || !object || !objectIsEditable(document, object)) return null;
  return withObjects(
    document,
    document.objects
      .filter((object) => object.id !== objectId)
      .map(cloneBoxObject),
  );
}

export function deleteBoxObjects(
  document: ModelDocument,
  objectIds: string[],
): ModelDocument | null {
  const ids = new Set(objectIds);
  if (!ids.size) return null;
  const found = document.objects.filter((object) => ids.has(object.id));
  if (found.length !== ids.size || document.objects.length - ids.size < 1) return null;
  if (found.some((object) => !objectIsEditable(document, object))) return null;
  return withObjects(
    document,
    document.objects.filter((object) => !ids.has(object.id)),
  );
}

export function modelEntityIsEditable(document: ModelDocument, ref: ModelEntityRef): boolean {
  if (ref.kind === "box") {
    const entity = findBoxObject(document, ref.id);
    return Boolean(entity && objectIsEditable(document, entity));
  }
  if (ref.kind === "line") {
    const entity = findLineObject(document, ref.id);
    return Boolean(entity && lineIsEditable(document, entity));
  }
  if (ref.kind === "polyline") {
    const entity = findPolylineObject(document, ref.id);
    return Boolean(entity && polylineIsEditable(document, entity));
  }
  if (ref.kind === "circle") {
    const entity = findCircleObject(document, ref.id);
    return Boolean(entity && circleIsEditable(document, entity));
  }
  const entity = findArcObject(document, ref.id);
  return Boolean(entity && arcIsEditable(document, entity));
}

function normalizedEntityRefs(refs: ModelEntityRef[]): ModelEntityRef[] {
  return refs.filter((ref, index, all) => all.findIndex((candidate) => candidate.kind === ref.kind && candidate.id === ref.id) === index);
}

function snappedDelta(delta: LinePoint): LinePoint {
  return {
    x: Math.round(delta.x * 16) / 16,
    y: Math.round(delta.y * 16) / 16,
    z: Math.round(delta.z * 16) / 16,
  };
}

function documentCoordinatesWithinBounds(document: ModelDocument): boolean {
  const coordinates = [
    ...document.objects.flatMap((object) => {
      const bounds = boxWorldBounds(object);
      return [
        object.position.x,
        object.position.y,
        object.position.z,
        bounds.minimum.x,
        bounds.minimum.y,
        bounds.minimum.z,
        bounds.maximum.x,
        bounds.maximum.y,
        bounds.maximum.z,
      ];
    }),
    ...document.lines.flatMap((line) => [
      line.start.x,
      line.start.y,
      line.start.z,
      line.end.x,
      line.end.y,
      line.end.z,
    ]),
    ...document.polylines.flatMap((polyline) => [
      polyline.elevation,
      ...polyline.vertices.flatMap((point) => [point.x, point.y]),
    ]),
    ...document.circles.flatMap((circle) => [
      circle.center.x - circle.radius,
      circle.center.x + circle.radius,
      circle.center.y - circle.radius,
      circle.center.y + circle.radius,
      circle.center.z,
    ]),
    ...document.arcs.flatMap((arc) => [
      arc.center.x - arc.radius,
      arc.center.x + arc.radius,
      arc.center.y - arc.radius,
      arc.center.y + arc.radius,
      arc.center.z,
    ]),
  ];
  return coordinates.every(
    (coordinate) => Number.isFinite(coordinate) && Math.abs(coordinate) <= MAXIMUM_COORDINATE,
  );
}

export function moveModelEntities(document: ModelDocument, refs: ModelEntityRef[], delta: LinePoint): ModelDocument | null {
  const selected = normalizedEntityRefs(refs);
  const offset = snappedDelta(delta);
  if (!selected.length || (!offset.x && !offset.y && !offset.z) || selected.some((ref) => !modelEntityIsEditable(document, ref))) return null;
  const keys = new Set(selected.map((ref) => `${ref.kind}:${ref.id}`));
  const next = cloneDocument(document);
  next.objects = next.objects.map((object) => keys.has(`box:${object.id}`) ? {
    ...object,
    position: { x: object.position.x + offset.x, y: object.position.y + offset.y, z: object.position.z + offset.z },
  } : object);
  next.lines = next.lines.map((line) => keys.has(`line:${line.id}`) ? {
    ...line,
    start: { x: line.start.x + offset.x, y: line.start.y + offset.y, z: line.start.z + (line.architecturalRole === "wall" ? 0 : offset.z) },
    end: { x: line.end.x + offset.x, y: line.end.y + offset.y, z: line.end.z + (line.architecturalRole === "wall" ? 0 : offset.z) },
  } : line);
  next.polylines = next.polylines.map((polyline) => keys.has(`polyline:${polyline.id}`) ? {
    ...polyline,
    elevation: polyline.elevation + offset.z,
    vertices: polyline.vertices.map((point) => ({ x: point.x + offset.x, y: point.y + offset.y })),
  } : polyline);
  next.circles = next.circles.map((circle) => keys.has(`circle:${circle.id}`) ? {
    ...circle,
    center: { x: circle.center.x + offset.x, y: circle.center.y + offset.y, z: circle.center.z + offset.z },
  } : circle);
  next.arcs = next.arcs.map((arc) => keys.has(`arc:${arc.id}`) ? {
    ...arc,
    center: { x: arc.center.x + offset.x, y: arc.center.y + offset.y, z: arc.center.z + offset.z },
  } : arc);
  return documentCoordinatesWithinBounds(next) ? next : null;
}

export type ModelSelectionBounds = {
  maximum: LinePoint;
  minimum: LinePoint;
};

export function modelSelectionBounds(
  document: ModelDocument,
  refs: ModelEntityRef[],
): ModelSelectionBounds | null {
  const selected = normalizedEntityRefs(refs);
  if (!selected.length) return null;
  const points: LinePoint[] = [];
  for (const ref of selected) {
    if (ref.kind === "box") {
      const entity = findBoxObject(document, ref.id);
      if (!entity) return null;
      const bounds = boxWorldBounds(entity);
      points.push(bounds.minimum, bounds.maximum);
    } else if (ref.kind === "line") {
      const entity = findLineObject(document, ref.id);
      if (!entity) return null;
      points.push(entity.start, entity.end);
    } else if (ref.kind === "polyline") {
      const entity = findPolylineObject(document, ref.id);
      if (!entity) return null;
      points.push(...entity.vertices.map((point) => ({ ...point, z: entity.elevation })));
    } else if (ref.kind === "circle") {
      const entity = findCircleObject(document, ref.id);
      if (!entity) return null;
      points.push(
        { x: entity.center.x - entity.radius, y: entity.center.y - entity.radius, z: entity.center.z },
        { x: entity.center.x + entity.radius, y: entity.center.y + entity.radius, z: entity.center.z },
      );
    } else {
      const entity = findArcObject(document, ref.id);
      if (!entity) return null;
      points.push(
        { x: entity.center.x - entity.radius, y: entity.center.y - entity.radius, z: entity.center.z },
        { x: entity.center.x + entity.radius, y: entity.center.y + entity.radius, z: entity.center.z },
      );
    }
  }
  return {
    maximum: {
      x: Math.max(...points.map((point) => point.x)),
      y: Math.max(...points.map((point) => point.y)),
      z: Math.max(...points.map((point) => point.z)),
    },
    minimum: {
      x: Math.min(...points.map((point) => point.x)),
      y: Math.min(...points.map((point) => point.y)),
      z: Math.min(...points.map((point) => point.z)),
    },
  };
}

export function modelSelectionRotationBase(
  document: ModelDocument,
  refs: ModelEntityRef[],
  baseKey: RotationBaseKey,
): LinePoint | null {
  const bounds = modelSelectionBounds(document, refs);
  if (!bounds) return null;
  const definition = ROTATION_BASE_DEFINITIONS.find((candidate) => candidate.key === baseKey) ??
    ROTATION_BASE_DEFINITIONS[0];
  return {
    x: bounds.minimum.x + (bounds.maximum.x - bounds.minimum.x) * definition.xFactor,
    y: bounds.minimum.y + (bounds.maximum.y - bounds.minimum.y) * definition.yFactor,
    z: bounds.minimum.z + (bounds.maximum.z - bounds.minimum.z) / 2,
  };
}

export function modelSelectionScaleBase(
  document: ModelDocument,
  refs: ModelEntityRef[],
  baseKey: RotationBaseKey,
): LinePoint | null {
  return modelSelectionRotationBase(document, refs, baseKey);
}

function rotatePlanPoint(point: LinePoint, base: LinePoint, radians: number): LinePoint {
  const deltaX = point.x - base.x;
  const deltaY = point.y - base.y;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: Math.round((base.x + deltaX * cosine - deltaY * sine) * 16) / 16,
    y: Math.round((base.y + deltaX * sine + deltaY * cosine) * 16) / 16,
    z: point.z,
  };
}

function normalizeArcAngle(radians: number): number {
  const fullTurn = Math.PI * 2;
  return ((radians % fullTurn) + fullTurn) % fullTurn;
}

export function rotateModelEntities(
  document: ModelDocument,
  refs: ModelEntityRef[],
  base: LinePoint,
  deltaDegrees: number,
): ModelDocument | null {
  const selected = normalizedEntityRefs(refs);
  if (
    !selected.length ||
    !Number.isFinite(deltaDegrees) ||
    Math.abs(deltaDegrees) < 0.001 ||
    ![base.x, base.y, base.z].every(Number.isFinite) ||
    selected.some((ref) => !modelEntityIsEditable(document, ref))
  ) return null;
  const keys = new Set(selected.map((ref) => `${ref.kind}:${ref.id}`));
  const radians = deltaDegrees * Math.PI / 180;
  const next = cloneDocument(document);
  let boxRotationFailed = false;
  next.objects = next.objects.map((object) => {
    if (!keys.has(`box:${object.id}`)) return object;
    const rotated = rotateBoxModel(object, deltaDegrees, base);
    if (!rotated) {
      boxRotationFailed = true;
      return object;
    }
    return { ...object, ...rotated };
  });
  next.lines = next.lines.map((line) => keys.has(`line:${line.id}`) ? {
    ...line,
    start: rotatePlanPoint(line.start, base, radians),
    end: rotatePlanPoint(line.end, base, radians),
  } : line);
  next.polylines = next.polylines.map((polyline) => keys.has(`polyline:${polyline.id}`) ? {
    ...polyline,
    vertices: polyline.vertices.map((point) => {
      const rotated = rotatePlanPoint({ ...point, z: polyline.elevation }, base, radians);
      return { x: rotated.x, y: rotated.y };
    }),
  } : polyline);
  next.circles = next.circles.map((circle) => keys.has(`circle:${circle.id}`) ? {
    ...circle,
    center: rotatePlanPoint(circle.center, base, radians),
  } : circle);
  next.arcs = next.arcs.map((arc) => keys.has(`arc:${arc.id}`) ? {
    ...arc,
    center: rotatePlanPoint(arc.center, base, radians),
    endAngle: normalizeArcAngle(arc.endAngle + radians),
    startAngle: normalizeArcAngle(arc.startAngle + radians),
  } : arc);
  const valid = !boxRotationFailed && next.lines.every(lineGeometryIsValid) &&
    next.polylines.every(polylineGeometryIsValid) &&
    next.circles.every(circleGeometryIsValid) &&
    next.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(next) ? next : null;
}

function scalePlanPoint(point: LinePoint, base: LinePoint, factor: number): LinePoint {
  return {
    x: Math.round((base.x + (point.x - base.x) * factor) * 16) / 16,
    y: Math.round((base.y + (point.y - base.y) * factor) * 16) / 16,
    z: point.z,
  };
}

export function scaleModelEntities(
  document: ModelDocument,
  refs: ModelEntityRef[],
  base: LinePoint,
  factor: number,
): ModelDocument | null {
  const selected = normalizedEntityRefs(refs);
  if (
    !selected.length ||
    !Number.isFinite(factor) ||
    factor <= 0 ||
    Math.abs(factor - 1) < 0.0001 ||
    ![base.x, base.y, base.z].every(Number.isFinite) ||
    selected.some((ref) => !modelEntityIsEditable(document, ref))
  ) return null;
  const keys = new Set(selected.map((ref) => `${ref.kind}:${ref.id}`));
  const next = cloneDocument(document);
  let boxScaleFailed = false;
  next.objects = next.objects.map((object) => {
    if (!keys.has(`box:${object.id}`)) return object;
    const position = scalePlanPoint(object.position, base, factor);
    const length = Math.round(object.dimensions.length * factor * 16) / 16;
    const width = Math.round(object.dimensions.width * factor * 16) / 16;
    if (length < MINIMUM_DIMENSION || width < MINIMUM_DIMENSION) {
      boxScaleFailed = true;
      return object;
    }
    return {
      ...object,
      dimensions: { ...object.dimensions, length, width },
      position,
    };
  });
  next.lines = next.lines.map((line) => keys.has(`line:${line.id}`) ? {
    ...line,
    start: scalePlanPoint(line.start, base, factor),
    end: scalePlanPoint(line.end, base, factor),
  } : line);
  next.polylines = next.polylines.map((polyline) => keys.has(`polyline:${polyline.id}`) ? {
    ...polyline,
    vertices: polyline.vertices.map((point) => {
      const scaled = scalePlanPoint({ ...point, z: polyline.elevation }, base, factor);
      return { x: scaled.x, y: scaled.y };
    }),
    width: Math.round((polyline.width ?? 0) * factor * 16) / 16,
  } : polyline);
  next.circles = next.circles.map((circle) => keys.has(`circle:${circle.id}`) ? {
    ...circle,
    center: scalePlanPoint(circle.center, base, factor),
    radius: Math.round(circle.radius * factor * 16) / 16,
  } : circle);
  next.arcs = next.arcs.map((arc) => keys.has(`arc:${arc.id}`) ? {
    ...arc,
    center: scalePlanPoint(arc.center, base, factor),
    radius: Math.round(arc.radius * factor * 16) / 16,
  } : arc);
  const valid = !boxScaleFailed && next.lines.every(lineGeometryIsValid) &&
    next.polylines.every(polylineGeometryIsValid) &&
    next.circles.every(circleGeometryIsValid) &&
    next.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(next) ? next : null;
}

function mirrorPlanPoint(point: LinePoint, axisStart: LinePoint, axisEnd: LinePoint): LinePoint {
  const axisX = axisEnd.x - axisStart.x;
  const axisY = axisEnd.y - axisStart.y;
  const axisLengthSquared = axisX * axisX + axisY * axisY;
  const offsetX = point.x - axisStart.x;
  const offsetY = point.y - axisStart.y;
  const projection = (offsetX * axisX + offsetY * axisY) / axisLengthSquared;
  const projectedX = axisStart.x + projection * axisX;
  const projectedY = axisStart.y + projection * axisY;
  return {
    x: Math.round((projectedX * 2 - point.x) * 16) / 16,
    y: Math.round((projectedY * 2 - point.y) * 16) / 16,
    z: point.z,
  };
}

function mirroredPlanAngle(radians: number, axisRadians: number): number {
  return normalizeArcAngle(axisRadians * 2 - radians);
}

export function mirrorModelEntities(
  document: ModelDocument,
  refs: ModelEntityRef[],
  axisStart: LinePoint,
  axisEnd: LinePoint,
  keepSource: boolean,
): { document: ModelDocument; refs: ModelEntityRef[] } | null {
  const selected = normalizedEntityRefs(refs);
  const axisLength = Math.hypot(axisEnd.x - axisStart.x, axisEnd.y - axisStart.y);
  if (
    !selected.length ||
    axisLength < MINIMUM_DIMENSION ||
    ![axisStart.x, axisStart.y, axisStart.z, axisEnd.x, axisEnd.y, axisEnd.z].every(Number.isFinite) ||
    selected.some((ref) => !modelEntityIsEditable(document, ref))
  ) return null;
  const counts = {
    arc: selected.filter((ref) => ref.kind === "arc").length,
    box: selected.filter((ref) => ref.kind === "box").length,
    circle: selected.filter((ref) => ref.kind === "circle").length,
    line: selected.filter((ref) => ref.kind === "line").length,
    polyline: selected.filter((ref) => ref.kind === "polyline").length,
  };
  if (keepSource && (
    document.arcs.length + counts.arc > MAXIMUM_ARC_COUNT ||
    document.objects.length + counts.box > MAXIMUM_OBJECT_COUNT ||
    document.circles.length + counts.circle > MAXIMUM_CIRCLE_COUNT ||
    document.lines.length + counts.line > MAXIMUM_LINE_COUNT ||
    document.polylines.length + counts.polyline > MAXIMUM_POLYLINE_COUNT
  )) return null;

  const working = cloneDocument(document);
  const mirroredRefs: ModelEntityRef[] = [];
  if (keepSource) {
    for (const ref of selected) {
      if (ref.kind === "box") {
        const source = findBoxObject(working, ref.id)!;
        const copy = cloneBoxObject(source);
        const number = nextObjectNumber(working);
        copy.id = `box-${String(number).padStart(2, "0")}`;
        copy.name = uniqueObjectName(working, `${source.name.slice(0, 113).trimEnd()} Mirror`);
        copy.groupId = null;
        copy.locked = false;
        working.objects.push(copy);
        mirroredRefs.push({ id: copy.id, kind: "box" });
      } else if (ref.kind === "line") {
        const source = findLineObject(working, ref.id)!;
        const copy = cloneLineObject(source);
        const number = nextLineNumber(working);
        copy.id = `line-${String(number).padStart(2, "0")}`;
        copy.name = uniqueObjectName(working, `${source.name.slice(0, 113).trimEnd()} Mirror`);
        copy.locked = false;
        working.lines.push(copy);
        mirroredRefs.push({ id: copy.id, kind: "line" });
      } else if (ref.kind === "polyline") {
        const source = findPolylineObject(working, ref.id)!;
        const copy = clonePolylineObject(source);
        const number = nextPolylineNumber(working);
        copy.id = `polyline-${String(number).padStart(2, "0")}`;
        copy.name = uniqueObjectName(working, `${source.name.slice(0, 113).trimEnd()} Mirror`);
        copy.locked = false;
        working.polylines.push(copy);
        mirroredRefs.push({ id: copy.id, kind: "polyline" });
      } else if (ref.kind === "circle") {
        const source = findCircleObject(working, ref.id)!;
        const copy = cloneCircleObject(source);
        const number = nextCircleNumber(working);
        copy.id = `circle-${String(number).padStart(2, "0")}`;
        copy.name = uniqueObjectName(working, `${source.name.slice(0, 113).trimEnd()} Mirror`);
        copy.locked = false;
        working.circles.push(copy);
        mirroredRefs.push({ id: copy.id, kind: "circle" });
      } else {
        const source = findArcObject(working, ref.id)!;
        const copy = cloneArcObject(source);
        const number = nextArcNumber(working);
        copy.id = `arc-${String(number).padStart(2, "0")}`;
        copy.name = uniqueObjectName(working, `${source.name.slice(0, 113).trimEnd()} Mirror`);
        copy.locked = false;
        working.arcs.push(copy);
        mirroredRefs.push({ id: copy.id, kind: "arc" });
      }
    }
  } else {
    mirroredRefs.push(...selected);
  }

  const keys = new Set(mirroredRefs.map((ref) => `${ref.kind}:${ref.id}`));
  const axisRadians = Math.atan2(axisEnd.y - axisStart.y, axisEnd.x - axisStart.x);
  working.objects = working.objects.map((object) => {
    if (!keys.has(`box:${object.id}`)) return object;
    const mirroredOrigin = mirrorPlanPoint(boxWorldPoint(object, 0, 1, 0), axisStart, axisEnd);
    return {
      ...object,
      position: mirroredOrigin,
      rotationZ: normalizeRotationZ(axisRadians * 360 / Math.PI - object.rotationZ),
    };
  });
  working.lines = working.lines.map((line) => keys.has(`line:${line.id}`) ? {
    ...line,
    start: mirrorPlanPoint(line.start, axisStart, axisEnd),
    end: mirrorPlanPoint(line.end, axisStart, axisEnd),
    wallExteriorSide: line.architecturalRole === "wall" ? line.wallExteriorSide === "left" ? "right" : "left" : line.wallExteriorSide,
  } : line);
  working.polylines = working.polylines.map((polyline) => keys.has(`polyline:${polyline.id}`) ? {
    ...polyline,
    bulges: polyline.bulges?.map((bulge) => -bulge),
    vertices: polyline.vertices.map((point) => {
      const mirrored = mirrorPlanPoint({ ...point, z: polyline.elevation }, axisStart, axisEnd);
      return { x: mirrored.x, y: mirrored.y };
    }),
  } : polyline);
  working.circles = working.circles.map((circle) => keys.has(`circle:${circle.id}`) ? {
    ...circle,
    center: mirrorPlanPoint(circle.center, axisStart, axisEnd),
  } : circle);
  working.arcs = working.arcs.map((arc) => keys.has(`arc:${arc.id}`) ? {
    ...arc,
    center: mirrorPlanPoint(arc.center, axisStart, axisEnd),
    counterclockwise: !arc.counterclockwise,
    endAngle: mirroredPlanAngle(arc.endAngle, axisRadians),
    startAngle: mirroredPlanAngle(arc.startAngle, axisRadians),
  } : arc);
  const valid = working.lines.every(lineGeometryIsValid) &&
    working.polylines.every(polylineGeometryIsValid) &&
    working.circles.every(circleGeometryIsValid) &&
    working.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working)
    ? { document: working, refs: mirroredRefs }
    : null;
}

export function offsetModelEntity(
  document: ModelDocument,
  ref: ModelEntityRef,
  distance: number,
  sidePoint: PlanPoint,
  keepSource: boolean,
): { document: ModelDocument; ref: ModelEntityRef } | null {
  if (
    ref.kind === "box" ||
    !Number.isFinite(distance) ||
    distance < 1 / 16 ||
    !Number.isFinite(sidePoint.x) ||
    !Number.isFinite(sidePoint.y) ||
    !modelEntityIsEditable(document, ref)
  ) return null;
  if (keepSource && (
    ref.kind === "line" && document.lines.length >= MAXIMUM_LINE_COUNT ||
    ref.kind === "polyline" && document.polylines.length >= MAXIMUM_POLYLINE_COUNT ||
    ref.kind === "circle" && document.circles.length >= MAXIMUM_CIRCLE_COUNT ||
    ref.kind === "arc" && document.arcs.length >= MAXIMUM_ARC_COUNT
  )) return null;

  const working = cloneDocument(document);
  let targetRef = ref;
  if (keepSource) {
    if (ref.kind === "line") {
      const source = findLineObject(working, ref.id);
      if (!source) return null;
      const copy = cloneLineObject(source);
      const number = nextLineNumber(working);
      copy.id = `line-${String(number).padStart(2, "0")}`;
      copy.name = uniqueObjectName(working, `${source.name.slice(0, 113).trimEnd()} Offset`);
      copy.locked = false;
      working.lines.push(copy);
      targetRef = { id: copy.id, kind: "line" };
    } else if (ref.kind === "polyline") {
      const source = findPolylineObject(working, ref.id);
      if (!source) return null;
      const copy = clonePolylineObject(source);
      const number = nextPolylineNumber(working);
      copy.id = `polyline-${String(number).padStart(2, "0")}`;
      copy.name = uniqueObjectName(working, `${source.name.slice(0, 113).trimEnd()} Offset`);
      copy.locked = false;
      working.polylines.push(copy);
      targetRef = { id: copy.id, kind: "polyline" };
    } else if (ref.kind === "circle") {
      const source = findCircleObject(working, ref.id);
      if (!source) return null;
      const copy = cloneCircleObject(source);
      const number = nextCircleNumber(working);
      copy.id = `circle-${String(number).padStart(2, "0")}`;
      copy.name = uniqueObjectName(working, `${source.name.slice(0, 113).trimEnd()} Offset`);
      copy.locked = false;
      working.circles.push(copy);
      targetRef = { id: copy.id, kind: "circle" };
    } else {
      const source = findArcObject(working, ref.id);
      if (!source) return null;
      const copy = cloneArcObject(source);
      const number = nextArcNumber(working);
      copy.id = `arc-${String(number).padStart(2, "0")}`;
      copy.name = uniqueObjectName(working, `${source.name.slice(0, 113).trimEnd()} Offset`);
      copy.locked = false;
      working.arcs.push(copy);
      targetRef = { id: copy.id, kind: "arc" };
    }
  }

  let geometrySucceeded = false;
  if (targetRef.kind === "line") {
    working.lines = working.lines.map((line) => {
      if (line.id !== targetRef.id) return line;
      const geometry = offsetLineGeometry(line, distance, sidePoint);
      geometrySucceeded = Boolean(geometry);
      return geometry ? { ...line, ...geometry } : line;
    });
  } else if (targetRef.kind === "polyline") {
    working.polylines = working.polylines.map((polyline) => {
      if (polyline.id !== targetRef.id) return polyline;
      const geometry = offsetPolylineGeometry(polyline, distance, sidePoint);
      geometrySucceeded = Boolean(geometry);
      return geometry ? { ...polyline, ...geometry } : polyline;
    });
  } else if (targetRef.kind === "circle") {
    working.circles = working.circles.map((circle) => {
      if (circle.id !== targetRef.id) return circle;
      const geometry = offsetCircleGeometry(circle, distance, sidePoint);
      geometrySucceeded = Boolean(geometry);
      return geometry ? { ...circle, ...geometry } : circle;
    });
  } else {
    working.arcs = working.arcs.map((arc) => {
      if (arc.id !== targetRef.id) return arc;
      const geometry = offsetArcGeometry(arc, distance, sidePoint);
      geometrySucceeded = Boolean(geometry);
      return geometry ? { ...arc, ...geometry } : arc;
    });
  }
  if (!geometrySucceeded) return null;
  const valid = working.lines.every(lineGeometryIsValid) &&
    working.polylines.every(polylineGeometryIsValid) &&
    working.circles.every(circleGeometryIsValid) &&
    working.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working)
    ? { document: working, ref: targetRef }
    : null;
}

function trimExtendBoundaries(document: ModelDocument, exclude: ModelEntityRef): TrimExtendBoundary[] {
  const visible = (layerId: string) => findLayer(document, layerId)?.visible ?? false;
  const boundaries: TrimExtendBoundary[] = [];
  document.lines.forEach((line) => {
    if (exclude.kind !== "line" || exclude.id !== line.id) {
      if (visible(line.layerId)) boundaries.push({ geometry: cloneLineGeometry(line), kind: "line" });
    }
  });
  document.polylines.forEach((polyline) => {
    if ((exclude.kind === "polyline" && exclude.id === polyline.id) || !visible(polyline.layerId)) return;
    polylineSegments(polyline).forEach((segment) => {
      const circular = polylineSegmentCircularGeometry(segment);
      boundaries.push(circular ? {
        geometry: { ...circular, center: { ...circular.center, z: polyline.elevation } },
        kind: "circular",
      } : {
        geometry: { start: { ...segment.start, z: polyline.elevation }, end: { ...segment.end, z: polyline.elevation } },
        kind: "line",
      });
    });
  });
  document.circles.forEach((circle) => {
    if ((exclude.kind !== "circle" || exclude.id !== circle.id) && visible(circle.layerId)) {
      boundaries.push({ geometry: { center: { ...circle.center }, radius: circle.radius }, kind: "circular" });
    }
  });
  document.arcs.forEach((arc) => {
    if ((exclude.kind !== "arc" || exclude.id !== arc.id) && visible(arc.layerId)) {
      boundaries.push({ geometry: cloneArcGeometry(arc), kind: "circular" });
    }
  });
  return boundaries;
}

export function trimModelEntity(
  document: ModelDocument,
  ref: ModelEntityRef,
  pick: LinePoint,
): { document: ModelDocument; refs: ModelEntityRef[] } | null {
  if (ref.kind === "box" || !modelEntityIsEditable(document, ref)) return null;
  const boundaries = trimExtendBoundaries(document, ref);
  if (!boundaries.length) return null;
  const working = cloneDocument(document);
  const resultRefs: ModelEntityRef[] = [];

  if (ref.kind === "line") {
    const source = findLineObject(working, ref.id);
    if (!source) return null;
    const pieces = trimLineGeometry(source, boundaries, pick);
    if (!pieces || working.lines.length - 1 + pieces.length > MAXIMUM_LINE_COUNT) return null;
    working.lines = working.lines.filter((line) => line.id !== source.id);
    pieces.forEach((geometry, index) => {
      if (index === 0) {
        working.lines.push({ ...source, ...geometry });
        resultRefs.push(ref);
      } else {
        const number = nextLineNumber(working);
        const line = {
          ...source,
          ...geometry,
          id: `line-${String(number).padStart(2, "0")}`,
          locked: false,
          name: uniqueObjectName(working, `${source.name.slice(0, 115).trimEnd()} Trim`),
        };
        working.lines.push(line);
        resultRefs.push({ id: line.id, kind: "line" });
      }
    });
  } else if (ref.kind === "arc") {
    const source = findArcObject(working, ref.id);
    if (!source) return null;
    const pieces = trimArcGeometry(source, boundaries, pick);
    if (!pieces || working.arcs.length - 1 + pieces.length > MAXIMUM_ARC_COUNT) return null;
    working.arcs = working.arcs.filter((arc) => arc.id !== source.id);
    pieces.forEach((geometry, index) => {
      if (index === 0) {
        working.arcs.push({ ...source, ...geometry });
        resultRefs.push(ref);
      } else {
        const number = nextArcNumber(working);
        const arc = {
          ...source,
          ...geometry,
          id: `arc-${String(number).padStart(2, "0")}`,
          locked: false,
          name: uniqueObjectName(working, `${source.name.slice(0, 115).trimEnd()} Trim`),
        };
        working.arcs.push(arc);
        resultRefs.push({ id: arc.id, kind: "arc" });
      }
    });
  } else if (ref.kind === "circle") {
    const source = findCircleObject(working, ref.id);
    if (!source || working.arcs.length >= MAXIMUM_ARC_COUNT) return null;
    const geometry = trimCircleGeometry({ center: source.center, radius: source.radius }, boundaries, pick);
    if (!geometry) return null;
    working.circles = working.circles.filter((circle) => circle.id !== source.id);
    const number = nextArcNumber(working);
    const arc: ArcObject = {
      ...geometry,
      id: `arc-${String(number).padStart(2, "0")}`,
      layerId: source.layerId,
      locked: false,
      name: uniqueObjectName(working, `${source.name.slice(0, 115).trimEnd()} Trim`),
      storyId: source.storyId,
      type: "arc",
    };
    working.arcs.push(arc);
    resultRefs.push({ id: arc.id, kind: "arc" });
  } else {
    const source = findPolylineObject(working, ref.id);
    if (!source) return null;
    const pieces = trimPolylineGeometry(source, boundaries, pick);
    if (!pieces || working.polylines.length - 1 + pieces.length > MAXIMUM_POLYLINE_COUNT) return null;
    working.polylines = working.polylines.filter((polyline) => polyline.id !== source.id);
    pieces.forEach((geometry, index) => {
      if (index === 0) {
        working.polylines.push({ ...source, ...geometry, architecturalRole: geometry.closed ? source.architecturalRole : null, shape: "polyline" });
        resultRefs.push(ref);
      } else {
        const number = nextPolylineNumber(working);
        const polyline: PolylineObject = {
          ...source,
          ...geometry,
          architecturalRole: geometry.closed ? source.architecturalRole : null,
          id: `polyline-${String(number).padStart(2, "0")}`,
          locked: false,
          name: uniqueObjectName(working, `${source.name.slice(0, 115).trimEnd()} Trim`),
          shape: "polyline",
        };
        working.polylines.push(polyline);
        resultRefs.push({ id: polyline.id, kind: "polyline" });
      }
    });
  }

  const valid = working.lines.every(lineGeometryIsValid) && working.polylines.every(polylineGeometryIsValid) &&
    working.circles.every(circleGeometryIsValid) && working.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working) ? { document: working, refs: resultRefs } : null;
}

export function breakModelEntity(
  document: ModelDocument,
  ref: ModelEntityRef,
  firstPick: LinePoint,
  secondPick: LinePoint | null,
): { document: ModelDocument; refs: ModelEntityRef[] } | null {
  if (ref.kind === "box" || !modelEntityIsEditable(document, ref)) return null;
  const atPoint = secondPick === null;
  if (atPoint && ref.kind === "circle") return null;
  const working = cloneDocument(document);
  const resultRefs: ModelEntityRef[] = [];

  if (ref.kind === "line") {
    const source = findLineObject(working, ref.id);
    if (!source) return null;
    const pieces = atPoint
      ? breakLineAtPointGeometry(source, firstPick)
      : breakLineGeometry(source, firstPick, secondPick);
    if (!pieces || working.lines.length - 1 + pieces.length > MAXIMUM_LINE_COUNT) return null;
    working.lines = working.lines.filter((line) => line.id !== source.id);
    pieces.forEach((geometry, index) => {
      if (index === 0) {
        working.lines.push({ ...source, ...geometry });
        resultRefs.push(ref);
      } else {
        const number = nextLineNumber(working);
        const line: LineObject = {
          ...source,
          ...geometry,
          id: `line-${String(number).padStart(2, "0")}`,
          name: uniqueObjectName(working, `${source.name.slice(0, 114).trimEnd()} Break`),
        };
        working.lines.push(line);
        resultRefs.push({ id: line.id, kind: "line" });
      }
    });
  } else if (ref.kind === "arc") {
    const source = findArcObject(working, ref.id);
    if (!source) return null;
    const pieces = atPoint
      ? breakArcAtPointGeometry(source, firstPick)
      : breakArcGeometry(source, firstPick, secondPick);
    if (!pieces || working.arcs.length - 1 + pieces.length > MAXIMUM_ARC_COUNT) return null;
    working.arcs = working.arcs.filter((arc) => arc.id !== source.id);
    pieces.forEach((geometry, index) => {
      if (index === 0) {
        working.arcs.push({ ...source, ...geometry });
        resultRefs.push(ref);
      } else {
        const number = nextArcNumber(working);
        const arc: ArcObject = {
          ...source,
          ...geometry,
          id: `arc-${String(number).padStart(2, "0")}`,
          name: uniqueObjectName(working, `${source.name.slice(0, 114).trimEnd()} Break`),
        };
        working.arcs.push(arc);
        resultRefs.push({ id: arc.id, kind: "arc" });
      }
    });
  } else if (ref.kind === "circle") {
    const source = findCircleObject(working, ref.id);
    if (!source || !secondPick || working.arcs.length >= MAXIMUM_ARC_COUNT) return null;
    const geometry = breakCircleGeometry(source, firstPick, secondPick);
    if (!geometry) return null;
    working.circles = working.circles.filter((circle) => circle.id !== source.id);
    const number = nextArcNumber(working);
    const arc: ArcObject = {
      ...geometry,
      id: `arc-${String(number).padStart(2, "0")}`,
      layerId: source.layerId,
      locked: source.locked,
      name: uniqueObjectName(working, `${source.name.slice(0, 114).trimEnd()} Break`),
      storyId: source.storyId,
      type: "arc",
    };
    working.arcs.push(arc);
    resultRefs.push({ id: arc.id, kind: "arc" });
  } else {
    const source = findPolylineObject(working, ref.id);
    if (!source || (atPoint && source.closed)) return null;
    const pieces = atPoint
      ? breakPolylineAtPointGeometry(source, firstPick)
      : breakPolylineGeometry(source, firstPick, secondPick);
    if (!pieces || working.polylines.length - 1 + pieces.length > MAXIMUM_POLYLINE_COUNT) return null;
    working.polylines = working.polylines.filter((polyline) => polyline.id !== source.id);
    pieces.forEach((geometry, index) => {
      if (index === 0) {
        working.polylines.push({ ...source, ...geometry, architecturalRole: geometry.closed ? source.architecturalRole : null, shape: "polyline" });
        resultRefs.push(ref);
      } else {
        const number = nextPolylineNumber(working);
        const polyline: PolylineObject = {
          ...source,
          ...geometry,
          architecturalRole: geometry.closed ? source.architecturalRole : null,
          id: `polyline-${String(number).padStart(2, "0")}`,
          name: uniqueObjectName(working, `${source.name.slice(0, 114).trimEnd()} Break`),
          shape: "polyline",
        };
        working.polylines.push(polyline);
        resultRefs.push({ id: polyline.id, kind: "polyline" });
      }
    });
  }

  const valid = working.lines.every(lineGeometryIsValid) && working.polylines.every(polylineGeometryIsValid) &&
    working.circles.every(circleGeometryIsValid) && working.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working) ? { document: working, refs: resultRefs } : null;
}

export function joinModelEntities(
  document: ModelDocument,
  refs: ModelEntityRef[],
  primaryRef: ModelEntityRef | null = refs.at(-1) ?? null,
): { document: ModelDocument; ref: ModelEntityRef } | null {
  const uniqueRefs = refs.filter((ref, index) => refs.findIndex((candidate) => candidate.kind === ref.kind && candidate.id === ref.id) === index);
  if (uniqueRefs.length < 2 || uniqueRefs.some((ref) =>
    (ref.kind !== "line" && ref.kind !== "arc" && ref.kind !== "polyline") || !modelEntityIsEditable(document, ref))) return null;
  const primary = primaryRef && uniqueRefs.some((ref) => ref.kind === primaryRef.kind && ref.id === primaryRef.id)
    ? primaryRef
    : uniqueRefs.at(-1)!;
  const orderedRefs = [primary, ...uniqueRefs.filter((ref) => ref.kind !== primary.kind || ref.id !== primary.id)];
  const curves: JoinCurveGeometry[] = [];
  for (const ref of orderedRefs) {
    if (ref.kind === "line") {
      const line = findLineObject(document, ref.id);
      if (!line) return null;
      curves.push({ kind: "line", geometry: cloneLineGeometry(line) });
    } else if (ref.kind === "arc") {
      const arc = findArcObject(document, ref.id);
      if (!arc) return null;
      curves.push({ kind: "arc", geometry: cloneArcGeometry(arc) });
    } else if (ref.kind === "polyline") {
      const polyline = findPolylineObject(document, ref.id);
      if (!polyline || polyline.closed) return null;
      curves.push({ kind: "polyline", geometry: clonePolylineGeometry(polyline) });
    }
  }
  const joined = joinCurveGeometries(curves);
  if (!joined) return null;

  const primaryEntity = primary.kind === "line"
    ? findLineObject(document, primary.id)
    : primary.kind === "arc"
      ? findArcObject(document, primary.id)
      : primary.kind === "polyline"
        ? findPolylineObject(document, primary.id)
        : null;
  if (!primaryEntity) return null;
  const working = cloneDocument(document);
  const selected = new Set(uniqueRefs.map((ref) => `${ref.kind}:${ref.id}`));
  working.lines = working.lines.filter((line) => !selected.has(`line:${line.id}`));
  working.arcs = working.arcs.filter((arc) => !selected.has(`arc:${arc.id}`));
  working.polylines = working.polylines.filter((polyline) => !selected.has(`polyline:${polyline.id}`));
  const sourceName = primaryEntity.name;
  const layerId = primaryEntity.layerId;
  const locked = primaryEntity.locked;
  const storyId = primaryEntity.storyId;
  let resultRef: ModelEntityRef;

  if (joined.kind === "line") {
    const preserve = primary.kind === "line";
    const number = preserve ? 0 : nextLineNumber(working);
    const line: LineObject = {
      ...joined.geometry,
      architecturalRole: preserve && primary.kind === "line" ? (primaryEntity as LineObject).architecturalRole : null,
      id: preserve ? primary.id : `line-${String(number).padStart(2, "0")}`,
      layerId,
      locked,
      name: preserve ? sourceName : uniqueObjectName(working, `${sourceName.slice(0, 115).trimEnd()} Join`),
      storyId,
      type: "line",
      wallExteriorSide: preserve && primary.kind === "line" ? (primaryEntity as LineObject).wallExteriorSide : null,
      wallReferenceLine: preserve && primary.kind === "line" ? (primaryEntity as LineObject).wallReferenceLine : null,
      wallTypeId: preserve && primary.kind === "line" ? (primaryEntity as LineObject).wallTypeId : null,
    };
    working.lines.push(line);
    resultRef = { id: line.id, kind: "line" };
  } else if (joined.kind === "arc") {
    const preserve = primary.kind === "arc";
    const number = preserve ? 0 : nextArcNumber(working);
    const arc: ArcObject = {
      ...joined.geometry,
      id: preserve ? primary.id : `arc-${String(number).padStart(2, "0")}`,
      layerId,
      locked,
      name: preserve ? sourceName : uniqueObjectName(working, `${sourceName.slice(0, 115).trimEnd()} Join`),
      storyId,
      type: "arc",
    };
    working.arcs.push(arc);
    resultRef = { id: arc.id, kind: "arc" };
  } else if (joined.kind === "circle") {
    const number = nextCircleNumber(working);
    const circle: CircleObject = {
      ...joined.geometry,
      id: `circle-${String(number).padStart(2, "0")}`,
      layerId,
      locked,
      name: uniqueObjectName(working, `${sourceName.slice(0, 115).trimEnd()} Join`),
      storyId,
      type: "circle",
    };
    working.circles.push(circle);
    resultRef = { id: circle.id, kind: "circle" };
  } else {
    const preserve = primary.kind === "polyline";
    const number = preserve ? 0 : nextPolylineNumber(working);
    const polyline: PolylineObject = {
      ...joined.geometry,
      architecturalRole: preserve && joined.geometry.closed && primary.kind === "polyline" ? (primaryEntity as PolylineObject).architecturalRole : null,
      id: preserve ? primary.id : `polyline-${String(number).padStart(2, "0")}`,
      layerId,
      locked,
      name: preserve ? sourceName : uniqueObjectName(working, `${sourceName.slice(0, 115).trimEnd()} Join`),
      shape: "polyline",
      storyId,
      type: "polyline",
    };
    working.polylines.push(polyline);
    resultRef = { id: polyline.id, kind: "polyline" };
  }

  const valid = working.lines.length <= MAXIMUM_LINE_COUNT && working.polylines.length <= MAXIMUM_POLYLINE_COUNT &&
    working.circles.length <= MAXIMUM_CIRCLE_COUNT && working.arcs.length <= MAXIMUM_ARC_COUNT &&
    working.lines.every(lineGeometryIsValid) && working.polylines.every(polylineGeometryIsValid) &&
    working.circles.every(circleGeometryIsValid) && working.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working) ? { document: working, ref: resultRef } : null;
}

export function explodeModelEntities(
  document: ModelDocument,
  refs: ModelEntityRef[],
): { document: ModelDocument; refs: ModelEntityRef[] } | null {
  const uniqueRefs = refs.filter((ref, index) =>
    refs.findIndex((candidate) => candidate.kind === ref.kind && candidate.id === ref.id) === index);
  if (!uniqueRefs.length || uniqueRefs.some((ref) => ref.kind !== "polyline" || !modelEntityIsEditable(document, ref))) return null;

  const sources: Array<{ pieces: NonNullable<ReturnType<typeof explodePolylineGeometry>>; polyline: PolylineObject }> = [];
  let addedLines = 0;
  let addedArcs = 0;
  for (const ref of uniqueRefs) {
    const polyline = findPolylineObject(document, ref.id);
    const pieces = polyline ? explodePolylineGeometry(polyline) : null;
    if (!polyline || !pieces) return null;
    addedLines += pieces.filter((piece) => piece.kind === "line").length;
    addedArcs += pieces.filter((piece) => piece.kind === "arc").length;
    sources.push({ pieces, polyline });
  }
  if (document.lines.length + addedLines > MAXIMUM_LINE_COUNT || document.arcs.length + addedArcs > MAXIMUM_ARC_COUNT) return null;

  const working = cloneDocument(document);
  const sourceIds = new Set(sources.map(({ polyline }) => polyline.id));
  working.polylines = working.polylines.filter((polyline) => !sourceIds.has(polyline.id));
  const resultRefs: ModelEntityRef[] = [];

  for (const { pieces, polyline } of sources) {
    pieces.forEach((piece, index) => {
      const suffix = ` Segment ${String(index + 1).padStart(2, "0")}`;
      const baseName = `${polyline.name.slice(0, 120 - suffix.length).trimEnd()}${suffix}`;
      if (piece.kind === "line") {
        const number = nextLineNumber(working);
        const line: LineObject = {
          ...piece.geometry,
          architecturalRole: null,
          id: `line-${String(number).padStart(2, "0")}`,
          layerId: polyline.layerId,
          locked: polyline.locked,
          name: uniqueObjectName(working, baseName),
          storyId: polyline.storyId,
          type: "line",
          wallExteriorSide: null,
          wallReferenceLine: null,
          wallTypeId: null,
        };
        working.lines.push(line);
        resultRefs.push({ id: line.id, kind: "line" });
      } else {
        const number = nextArcNumber(working);
        const arc: ArcObject = {
          ...piece.geometry,
          id: `arc-${String(number).padStart(2, "0")}`,
          layerId: polyline.layerId,
          locked: polyline.locked,
          name: uniqueObjectName(working, baseName),
          storyId: polyline.storyId,
          type: "arc",
        };
        working.arcs.push(arc);
        resultRefs.push({ id: arc.id, kind: "arc" });
      }
    });
  }

  const valid = working.lines.every(lineGeometryIsValid) && working.polylines.every(polylineGeometryIsValid) &&
    working.circles.every(circleGeometryIsValid) && working.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working) ? { document: working, refs: resultRefs } : null;
}

export function modelEntityLengthenEndpoints(
  document: ModelDocument,
  ref: ModelEntityRef,
): { start: LinePoint; end: LinePoint } | null {
  if (ref.kind === "line") {
    const line = findLineObject(document, ref.id);
    return line ? { start: { ...line.start }, end: { ...line.end } } : null;
  }
  if (ref.kind === "arc") {
    const arc = findArcObject(document, ref.id);
    return arc ? { start: arcPointAtFraction(arc, 0), end: arcPointAtFraction(arc, 1) } : null;
  }
  if (ref.kind === "polyline") {
    const polyline = findPolylineObject(document, ref.id);
    if (!polyline || polyline.closed) return null;
    return {
      start: { ...polyline.vertices[0], z: polyline.elevation },
      end: { ...polyline.vertices.at(-1)!, z: polyline.elevation },
    };
  }
  return null;
}

export function lengthenModelEntity(
  document: ModelDocument,
  ref: ModelEntityRef,
  endpoint: LengthenEndpoint,
  request: LengthenRequest,
): { document: ModelDocument; ref: ModelEntityRef } | null {
  if ((ref.kind !== "line" && ref.kind !== "arc" && ref.kind !== "polyline") || !modelEntityIsEditable(document, ref)) return null;
  const working = cloneDocument(document);
  let changed = false;
  if (ref.kind === "line") {
    working.lines = working.lines.map((line) => {
      if (line.id !== ref.id) return line;
      const geometry = lengthenLineGeometry(line, endpoint, request);
      changed = Boolean(geometry);
      return geometry ? { ...line, ...geometry } : line;
    });
  } else if (ref.kind === "arc") {
    working.arcs = working.arcs.map((arc) => {
      if (arc.id !== ref.id) return arc;
      const geometry = lengthenArcGeometry(arc, endpoint, request);
      changed = Boolean(geometry);
      return geometry ? { ...arc, ...geometry } : arc;
    });
  } else {
    working.polylines = working.polylines.map((polyline) => {
      if (polyline.id !== ref.id || polyline.closed) return polyline;
      const geometry = lengthenPolylineGeometry(polyline, endpoint, request);
      changed = Boolean(geometry);
      return geometry ? { ...polyline, ...geometry, shape: "polyline" as const } : polyline;
    });
  }
  if (!changed || documentsEqual(document, working)) return null;
  const valid = working.lines.every(lineGeometryIsValid) && working.polylines.every(polylineGeometryIsValid) &&
    working.circles.every(circleGeometryIsValid) && working.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working) ? { document: working, ref } : null;
}

export function extendModelEntity(
  document: ModelDocument,
  ref: ModelEntityRef,
  pick: LinePoint,
): { document: ModelDocument; ref: ModelEntityRef } | null {
  if ((ref.kind !== "line" && ref.kind !== "arc" && ref.kind !== "polyline") || !modelEntityIsEditable(document, ref)) return null;
  const boundaries = trimExtendBoundaries(document, ref);
  if (!boundaries.length) return null;
  const working = cloneDocument(document);
  let succeeded = false;
  if (ref.kind === "line") {
    working.lines = working.lines.map((line) => {
      if (line.id !== ref.id) return line;
      const geometry = extendLineGeometry(line, boundaries, pick);
      succeeded = Boolean(geometry);
      return geometry ? { ...line, ...geometry } : line;
    });
  } else if (ref.kind === "arc") {
    working.arcs = working.arcs.map((arc) => {
      if (arc.id !== ref.id) return arc;
      const geometry = extendArcGeometry(arc, boundaries, pick);
      succeeded = Boolean(geometry);
      return geometry ? { ...arc, ...geometry } : arc;
    });
  } else {
    working.polylines = working.polylines.map((polyline) => {
      if (polyline.id !== ref.id) return polyline;
      const geometry = extendPolylineGeometry(polyline, boundaries, pick);
      succeeded = Boolean(geometry);
      return geometry ? { ...polyline, ...geometry } : polyline;
    });
  }
  if (!succeeded) return null;
  const valid = working.lines.every(lineGeometryIsValid) && working.polylines.every(polylineGeometryIsValid) &&
    working.circles.every(circleGeometryIsValid) && working.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working) ? { document: working, ref } : null;
}

export type LineFilletPick = { id: string; point: LinePoint };

export type CurveFilletPick = { id: string; kind: "arc" | "line"; point: LinePoint };

export type LineChamferPick = { id: string; point: LinePoint };

function replacePolylineCornerGeometry(
  document: ModelDocument,
  id: string,
  geometry: PolylineGeometry | null,
): { document: ModelDocument; ref: ModelEntityRef } | null {
  const ref = { id, kind: "polyline" } satisfies ModelEntityRef;
  if (!geometry || !modelEntityIsEditable(document, ref)) return null;
  const source = findPolylineObject(document, id);
  if (!source || polylineGeometriesEqual(source, geometry)) return null;
  const working = cloneDocument(document);
  working.polylines = working.polylines.map((polyline) => polyline.id === id
    ? { ...polyline, ...clonePolylineGeometry(geometry), shape: "polyline" }
    : polyline);
  const valid = working.polylines.every(polylineGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working) ? { document: working, ref } : null;
}

export function chamferPolylineObject(
  document: ModelDocument,
  id: string,
  firstDistance: number,
  secondDistance: number,
): { document: ModelDocument; ref: ModelEntityRef } | null {
  const source = findPolylineObject(document, id);
  return replacePolylineCornerGeometry(
    document,
    id,
    source ? chamferPolylineCorners(source, firstDistance, secondDistance) : null,
  );
}

export function filletPolylineObject(
  document: ModelDocument,
  id: string,
  radius: number,
): { document: ModelDocument; ref: ModelEntityRef } | null {
  const source = findPolylineObject(document, id);
  return replacePolylineCornerGeometry(document, id, source ? filletPolylineCorners(source, radius) : null);
}

export function chamferLineObjects(
  document: ModelDocument,
  firstPick: LineChamferPick,
  secondPick: LineChamferPick,
  firstDistance: number,
  secondDistance: number,
): { document: ModelDocument; refs: ModelEntityRef[] } | null {
  if (
    firstPick.id === secondPick.id ||
    !Number.isFinite(firstDistance) ||
    !Number.isFinite(secondDistance) ||
    firstDistance < 0 ||
    secondDistance < 0
  ) return null;
  const firstRef = { id: firstPick.id, kind: "line" } satisfies ModelEntityRef;
  const secondRef = { id: secondPick.id, kind: "line" } satisfies ModelEntityRef;
  if (!modelEntityIsEditable(document, firstRef) || !modelEntityIsEditable(document, secondRef)) return null;
  if ((firstDistance > 0 || secondDistance > 0) && document.lines.length >= MAXIMUM_LINE_COUNT) return null;
  const first = findLineObject(document, firstPick.id);
  const second = findLineObject(document, secondPick.id);
  if (!first || !second || first.architecturalRole === "wall" || second.architecturalRole === "wall") return null;
  const geometry = chamferLineGeometries(
    first,
    second,
    firstPick.point,
    secondPick.point,
    firstDistance,
    secondDistance,
  );
  if (!geometry) return null;

  const working = cloneDocument(document);
  working.lines = working.lines.map((line) => {
    if (line.id === first.id) return { ...line, ...cloneLineGeometry(geometry.first) };
    if (line.id === second.id) return { ...line, ...cloneLineGeometry(geometry.second) };
    return line;
  });
  const refs: ModelEntityRef[] = [firstRef, secondRef];
  if (geometry.chamfer) {
    const number = nextLineNumber(working);
    const chamfer: LineObject = {
      ...cloneLineGeometry(geometry.chamfer),
      architecturalRole: null,
      id: `line-${String(number).padStart(2, "0")}`,
      layerId: document.activeLayerId,
      locked: false,
      name: uniqueObjectName(working, `Chamfer ${String(number).padStart(2, "0")}`),
      storyId: first.storyId,
      type: "line",
      wallExteriorSide: null,
      wallReferenceLine: null,
      wallTypeId: null,
    };
    working.lines.push(chamfer);
    refs.push({ id: chamfer.id, kind: "line" });
  }
  const valid = working.lines.every(lineGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working) ? { document: working, refs } : null;
}

export function filletLineObjects(
  document: ModelDocument,
  firstPick: LineFilletPick,
  secondPick: LineFilletPick,
  radius: number,
): { document: ModelDocument; refs: ModelEntityRef[] } | null {
  if (firstPick.id === secondPick.id || !Number.isFinite(radius) || radius < 0) return null;
  const firstRef = { id: firstPick.id, kind: "line" } satisfies ModelEntityRef;
  const secondRef = { id: secondPick.id, kind: "line" } satisfies ModelEntityRef;
  if (!modelEntityIsEditable(document, firstRef) || !modelEntityIsEditable(document, secondRef)) return null;
  if (radius > 0 && document.arcs.length >= MAXIMUM_ARC_COUNT) return null;
  const first = findLineObject(document, firstPick.id);
  const second = findLineObject(document, secondPick.id);
  if (!first || !second || first.architecturalRole === "wall" || second.architecturalRole === "wall") return null;
  const geometry = filletLineGeometries(first, second, firstPick.point, secondPick.point, radius);
  if (!geometry) return null;

  const working = cloneDocument(document);
  working.lines = working.lines.map((line) => {
    if (line.id === first.id) return { ...line, ...cloneLineGeometry(geometry.first) };
    if (line.id === second.id) return { ...line, ...cloneLineGeometry(geometry.second) };
    return line;
  });
  const refs: ModelEntityRef[] = [firstRef, secondRef];
  if (geometry.arc) {
    const number = nextArcNumber(working);
    const arc: ArcObject = {
      ...cloneArcGeometry(geometry.arc),
      id: `arc-${String(number).padStart(2, "0")}`,
      layerId: document.activeLayerId,
      locked: false,
      name: uniqueObjectName(working, `Fillet ${String(number).padStart(2, "0")}`),
      storyId: first.storyId,
      type: "arc",
    };
    working.arcs.push(arc);
    refs.push({ id: arc.id, kind: "arc" });
  }
  const valid = working.lines.every(lineGeometryIsValid) && working.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working) ? { document: working, refs } : null;
}

export function filletCurveObjects(
  document: ModelDocument,
  firstPick: CurveFilletPick,
  secondPick: CurveFilletPick,
  radius: number,
): { document: ModelDocument; refs: ModelEntityRef[] } | null {
  if (firstPick.kind === "line" && secondPick.kind === "line") {
    return filletLineObjects(document, firstPick, secondPick, radius);
  }
  if ((firstPick.kind === secondPick.kind && firstPick.id === secondPick.id) || !Number.isFinite(radius) || radius <= 0) return null;
  const firstRef = { id: firstPick.id, kind: firstPick.kind } satisfies ModelEntityRef;
  const secondRef = { id: secondPick.id, kind: secondPick.kind } satisfies ModelEntityRef;
  if (!modelEntityIsEditable(document, firstRef) || !modelEntityIsEditable(document, secondRef) || document.arcs.length >= MAXIMUM_ARC_COUNT) return null;

  const curveFor = (pick: CurveFilletPick): FilletCurveGeometry | null => {
    if (pick.kind === "line") {
      const geometry = findLineObject(document, pick.id);
      return geometry ? { geometry, kind: "line" } : null;
    }
    const geometry = findArcObject(document, pick.id);
    return geometry ? { geometry, kind: "arc" } : null;
  };
  const first = curveFor(firstPick);
  const second = curveFor(secondPick);
  if (!first || !second) return null;
  const geometry = filletCurveGeometries(first, second, firstPick.point, secondPick.point, radius);
  if (!geometry) return null;

  const working = cloneDocument(document);
  const applyResult = (ref: ModelEntityRef, result: FilletCurveGeometry) => {
    if (ref.kind === "line" && result.kind === "line") {
      working.lines = working.lines.map((line) => line.id === ref.id ? { ...line, ...cloneLineGeometry(result.geometry) } : line);
      return true;
    }
    if (ref.kind === "arc" && result.kind === "arc") {
      working.arcs = working.arcs.map((arc) => arc.id === ref.id ? { ...arc, ...cloneArcGeometry(result.geometry) } : arc);
      return true;
    }
    return false;
  };
  if (!applyResult(firstRef, geometry.first) || !applyResult(secondRef, geometry.second)) return null;

  const firstObject = firstPick.kind === "line" ? findLineObject(document, firstPick.id) : findArcObject(document, firstPick.id);
  const secondObject = secondPick.kind === "line" ? findLineObject(document, secondPick.id) : findArcObject(document, secondPick.id);
  const number = nextArcNumber(working);
  const fillet: ArcObject = {
    ...cloneArcGeometry(geometry.arc),
    id: `arc-${String(number).padStart(2, "0")}`,
    layerId: firstObject && secondObject && firstObject.layerId === secondObject.layerId ? firstObject.layerId : document.activeLayerId,
    locked: false,
    name: uniqueObjectName(working, `Fillet ${String(number).padStart(2, "0")}`),
    storyId: firstObject?.storyId ?? document.building.activeStoryId,
    type: "arc",
  };
  working.arcs.push(fillet);
  const refs: ModelEntityRef[] = [firstRef, secondRef, { id: fillet.id, kind: "arc" }];
  const valid = working.lines.every(lineGeometryIsValid) && working.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(working) ? { document: working, refs } : null;
}

export function stretchModelEntities(
  document: ModelDocument,
  targets: CadStretchTarget[],
  delta: LinePoint,
): ModelDocument | null {
  const offset = snappedDelta(delta);
  if (!targets.length || (!offset.x && !offset.y && !offset.z)) return null;
  const uniqueTargets = targets.filter((target, index, all) =>
    all.findIndex((candidate) => candidate.kind === target.kind && candidate.id === target.id) === index);
  const refs = uniqueTargets.map(({ id, kind }) => ({ id, kind } satisfies ModelEntityRef));
  if (refs.some((ref) => !modelEntityIsEditable(document, ref))) return null;

  const wholeRefs = uniqueTargets
    .filter((target) => target.whole)
    .map(({ id, kind }) => ({ id, kind } satisfies ModelEntityRef));
  const moved = wholeRefs.length ? moveModelEntities(document, wholeRefs, offset) : cloneDocument(document);
  if (!moved) return null;

  for (const target of uniqueTargets.filter((candidate) => !candidate.whole)) {
    if (target.kind === "line") {
      const source = findLineObject(moved, target.id);
      const geometry = source ? stretchLineGeometry(source, target.components, offset) : null;
      if (!source || !geometry) return null;
      if (source.architecturalRole === "wall") {
        const roughFloor = calculateStoryElevations(moved.building).find((story) => story.storyId === source.storyId)?.roughFloorElevation;
        if (roughFloor === undefined) return null;
        geometry.start.z = roughFloor;
        geometry.end.z = roughFloor;
      }
      const index = moved.lines.findIndex((line) => line.id === source.id);
      moved.lines[index] = { ...source, ...geometry };
      continue;
    }
    if (target.kind === "polyline") {
      const source = findPolylineObject(moved, target.id);
      const geometry = source ? stretchPolylineGeometry(source, target.components, offset) : null;
      if (!source || !geometry) return null;
      const index = moved.polylines.findIndex((polyline) => polyline.id === source.id);
      moved.polylines[index] = { ...source, ...geometry, shape: "polyline" };
      continue;
    }
    return null;
  }
  const valid = moved.lines.every(lineGeometryIsValid) && moved.polylines.every(polylineGeometryIsValid) &&
    moved.circles.every(circleGeometryIsValid) && moved.arcs.every(arcGeometryIsValid);
  return valid && documentCoordinatesWithinBounds(moved) ? moved : null;
}

export function copyModelEntities(document: ModelDocument, refs: ModelEntityRef[], delta: LinePoint): { document: ModelDocument; refs: ModelEntityRef[] } | null {
  const selected = normalizedEntityRefs(refs);
  const offset = snappedDelta(delta);
  if (!selected.length || (!offset.x && !offset.y && !offset.z) || selected.some((ref) => !modelEntityIsEditable(document, ref))) return null;
  const counts = {
    arc: selected.filter((ref) => ref.kind === "arc").length,
    box: selected.filter((ref) => ref.kind === "box").length,
    circle: selected.filter((ref) => ref.kind === "circle").length,
    line: selected.filter((ref) => ref.kind === "line").length,
    polyline: selected.filter((ref) => ref.kind === "polyline").length,
  };
  if (document.arcs.length + counts.arc > MAXIMUM_ARC_COUNT || document.objects.length + counts.box > MAXIMUM_OBJECT_COUNT || document.circles.length + counts.circle > MAXIMUM_CIRCLE_COUNT || document.lines.length + counts.line > MAXIMUM_LINE_COUNT || document.polylines.length + counts.polyline > MAXIMUM_POLYLINE_COUNT) return null;
  const working = cloneDocument(document);
  const copiedRefs: ModelEntityRef[] = [];
  for (const ref of selected) {
    if (ref.kind === "box") {
      const source = findBoxObject(working, ref.id)!;
      const copy = cloneBoxObject(source);
      const number = nextObjectNumber(working);
      copy.id = `box-${String(number).padStart(2, "0")}`;
      copy.name = uniqueObjectName(working, `${source.name.slice(0, 115).trimEnd()} Copy`);
      copy.groupId = null; copy.locked = false;
      copy.position = { x: source.position.x + offset.x, y: source.position.y + offset.y, z: source.position.z + offset.z };
      working.objects.push(copy); copiedRefs.push({ id: copy.id, kind: "box" });
    } else if (ref.kind === "line") {
      const source = findLineObject(working, ref.id)!;
      const copy = cloneLineObject(source); const number = nextLineNumber(working);
      copy.id = `line-${String(number).padStart(2, "0")}`; copy.name = uniqueObjectName(working, `${source.name.slice(0, 115).trimEnd()} Copy`); copy.locked = false;
      copy.start = { x: source.start.x + offset.x, y: source.start.y + offset.y, z: source.start.z + (source.architecturalRole === "wall" ? 0 : offset.z) }; copy.end = { x: source.end.x + offset.x, y: source.end.y + offset.y, z: source.end.z + (source.architecturalRole === "wall" ? 0 : offset.z) };
      working.lines.push(copy); copiedRefs.push({ id: copy.id, kind: "line" });
    } else if (ref.kind === "polyline") {
      const source = findPolylineObject(working, ref.id)!;
      const copy = clonePolylineObject(source); const number = nextPolylineNumber(working);
      copy.id = `polyline-${String(number).padStart(2, "0")}`; copy.name = uniqueObjectName(working, `${source.name.slice(0, 115).trimEnd()} Copy`); copy.locked = false;
      copy.elevation = source.elevation + offset.z; copy.vertices = source.vertices.map((point) => ({ x: point.x + offset.x, y: point.y + offset.y }));
      working.polylines.push(copy); copiedRefs.push({ id: copy.id, kind: "polyline" });
    } else if (ref.kind === "circle") {
      const source = findCircleObject(working, ref.id)!;
      const copy = cloneCircleObject(source); const number = nextCircleNumber(working);
      copy.id = `circle-${String(number).padStart(2, "0")}`; copy.name = uniqueObjectName(working, `${source.name.slice(0, 115).trimEnd()} Copy`); copy.locked = false;
      copy.center = { x: source.center.x + offset.x, y: source.center.y + offset.y, z: source.center.z + offset.z };
      working.circles.push(copy); copiedRefs.push({ id: copy.id, kind: "circle" });
    } else {
      const source = findArcObject(working, ref.id)!;
      const copy = cloneArcObject(source); const number = nextArcNumber(working);
      copy.id = `arc-${String(number).padStart(2, "0")}`; copy.name = uniqueObjectName(working, `${source.name.slice(0, 115).trimEnd()} Copy`); copy.locked = false;
      copy.center = { x: source.center.x + offset.x, y: source.center.y + offset.y, z: source.center.z + offset.z };
      working.arcs.push(copy); copiedRefs.push({ id: copy.id, kind: "arc" });
    }
  }
  return documentCoordinatesWithinBounds(working)
    ? { document: working, refs: copiedRefs }
    : null;
}

export function deleteModelEntities(document: ModelDocument, refs: ModelEntityRef[]): ModelDocument | null {
  const selected = normalizedEntityRefs(refs);
  if (!selected.length || selected.some((ref) => !modelEntityIsEditable(document, ref))) return null;
  const keys = new Set(selected.map((ref) => `${ref.kind}:${ref.id}`));
  if (document.objects.filter((object) => !keys.has(`box:${object.id}`)).length < 1) return null;
  const next = cloneDocument(document);
  next.objects = next.objects.filter((object) => !keys.has(`box:${object.id}`));
  next.lines = next.lines.filter((line) => !keys.has(`line:${line.id}`));
  next.polylines = next.polylines.filter((polyline) => !keys.has(`polyline:${polyline.id}`));
  next.circles = next.circles.filter((circle) => !keys.has(`circle:${circle.id}`));
  next.arcs = next.arcs.filter((arc) => !keys.has(`arc:${arc.id}`));
  const usedGroups = new Set(next.objects.map((object) => object.groupId).filter((id): id is string => Boolean(id)));
  next.groups = next.groups.filter((group) => usedGroups.has(group.id));
  return next;
}

function nextGroupNumber(document: ModelDocument): number {
  const usedNumbers = document.groups.map((group) => {
    const match = /^group-(\d+)$/i.exec(group.id);
    return match ? Number(match[1]) : 0;
  });
  return Math.max(0, ...usedNumbers) + 1;
}

export function groupBoxObjects(
  document: ModelDocument,
  objectIds: string[],
): { document: ModelDocument; group: ModelGroup } | null {
  const ids = new Set(objectIds);
  if (ids.size < 2 || document.groups.length >= MAXIMUM_GROUP_COUNT) return null;
  const objects = document.objects.filter((object) => ids.has(object.id));
  if (
    objects.length !== ids.size ||
    objects.some((object) => object.groupId || !objectIsEditable(document, object))
  ) {
    return null;
  }
  const number = nextGroupNumber(document);
  const group: ModelGroup = {
    id: `group-${String(number).padStart(2, "0")}`,
    name: `Group ${String(number).padStart(2, "0")}`,
  };
  return {
    document: {
      activeLayerId: document.activeLayerId,
      arcs: document.arcs.map(cloneArcObject),
      building: cloneBuildingStructure(document.building),
      circles: document.circles.map(cloneCircleObject),
      groups: [...document.groups.map(cloneGroup), group],
      layers: document.layers.map(cloneLayer),
      lines: document.lines.map(cloneLineObject),
      objects: document.objects.map((object) => ({
        ...cloneBoxObject(object),
        groupId: ids.has(object.id) ? group.id : object.groupId,
      })),
      polylines: document.polylines.map(clonePolylineObject),
    },
    group: cloneGroup(group),
  };
}

export function ungroupBoxObjects(
  document: ModelDocument,
  groupId: string,
): ModelDocument | null {
  const group = findGroup(document, groupId);
  const members = document.objects.filter((object) => object.groupId === groupId);
  if (!group || members.length < 2 || members.some((object) => !objectIsEditable(document, object))) {
    return null;
  }
  return {
    activeLayerId: document.activeLayerId,
    arcs: document.arcs.map(cloneArcObject),
    building: cloneBuildingStructure(document.building),
    circles: document.circles.map(cloneCircleObject),
    groups: document.groups.filter((candidate) => candidate.id !== groupId).map(cloneGroup),
    layers: document.layers.map(cloneLayer),
    lines: document.lines.map(cloneLineObject),
    objects: document.objects.map((object) => ({
      ...cloneBoxObject(object),
      groupId: object.groupId === groupId ? null : object.groupId,
    })),
    polylines: document.polylines.map(clonePolylineObject),
  };
}

export function renameGroup(
  document: ModelDocument,
  groupId: string,
  name: string,
): ModelDocument | null {
  const normalizedName = name.trim();
  const group = findGroup(document, groupId);
  if (!group || !normalizedName || normalizedName.length > 80) return null;
  if (
    document.groups.some(
      (candidate) => candidate.id !== groupId && candidate.name.toLowerCase() === normalizedName.toLowerCase(),
    ) ||
    document.objects.some(
      (object) => object.groupId === groupId && !objectIsEditable(document, object),
    )
  ) {
    return null;
  }
  const next = cloneDocument(document);
  next.groups = next.groups.map((candidate) =>
    candidate.id === groupId ? { ...candidate, name: normalizedName } : candidate,
  );
  return next;
}

export function setBoxObjectsLocked(
  document: ModelDocument,
  objectIds: string[],
  locked: boolean,
): ModelDocument | null {
  const ids = new Set(objectIds);
  if (!ids.size || document.objects.filter((object) => ids.has(object.id)).length !== ids.size) {
    return null;
  }
  return withObjects(
    document,
    document.objects.map((object) =>
      ids.has(object.id) ? { ...cloneBoxObject(object), locked } : object,
    ),
  );
}

function nextLayerNumber(document: ModelDocument): number {
  const usedNumbers = document.layers.map((layer) => {
    const match = /^layer-(\d+)$/i.exec(layer.id);
    return match ? Number(match[1]) : 0;
  });
  return Math.max(0, ...usedNumbers) + 1;
}

export function addLayer(document: ModelDocument): {
  document: ModelDocument;
  layer: ModelLayer;
} | null {
  if (document.layers.length >= MAXIMUM_LAYER_COUNT) return null;
  const number = nextLayerNumber(document);
  const layer: ModelLayer = {
    color: LAYER_COLORS[(number - 1) % LAYER_COLORS.length],
    id: `layer-${String(number).padStart(2, "0")}`,
    locked: false,
    name: `Layer ${number}`,
    visible: true,
  };
  return {
    document: {
      activeLayerId: layer.id,
      arcs: document.arcs.map(cloneArcObject),
      building: cloneBuildingStructure(document.building),
      circles: document.circles.map(cloneCircleObject),
      groups: document.groups.map(cloneGroup),
      layers: [...document.layers.map(cloneLayer), layer],
      lines: document.lines.map(cloneLineObject),
      objects: document.objects.map(cloneBoxObject),
      polylines: document.polylines.map(clonePolylineObject),
    },
    layer: cloneLayer(layer),
  };
}

export function setActiveLayer(
  document: ModelDocument,
  layerId: string,
): ModelDocument | null {
  if (!findLayer(document, layerId)) return null;
  const next = cloneDocument(document);
  next.activeLayerId = layerId;
  next.layers = next.layers.map((layer) =>
    layer.id === layerId ? { ...layer, locked: false, visible: true } : layer,
  );
  return next;
}

export function toggleLayerVisibility(
  document: ModelDocument,
  layerId: string,
): ModelDocument | null {
  const layer = findLayer(document, layerId);
  if (!layer || layerId === document.activeLayerId) return null;
  const next = cloneDocument(document);
  next.layers = next.layers.map((item) =>
    item.id === layerId ? { ...item, visible: !item.visible } : item,
  );
  return next;
}

export function toggleLayerLock(
  document: ModelDocument,
  layerId: string,
): ModelDocument | null {
  const layer = findLayer(document, layerId);
  if (!layer || layerId === document.activeLayerId) return null;
  const next = cloneDocument(document);
  next.layers = next.layers.map((item) =>
    item.id === layerId ? { ...item, locked: !item.locked } : item,
  );
  return next;
}

export function assignObjectToLayer(
  document: ModelDocument,
  objectId: string,
  layerId: string,
): ModelDocument | null {
  const object = findBoxObject(document, objectId);
  if (!object || !objectIsEditable(document, object) || !findLayer(document, layerId)) return null;
  return withObjects(
    document,
    document.objects.map((object) =>
      object.id === objectId ? { ...cloneBoxObject(object), layerId } : object,
    ),
  );
}

export function renameLayer(
  document: ModelDocument,
  layerId: string,
  name: string,
): ModelDocument | null {
  const normalizedName = name.trim();
  if (!findLayer(document, layerId) || !normalizedName || normalizedName.length > 80) return null;
  if (document.layers.some((layer) => layer.id !== layerId && layer.name.toLowerCase() === normalizedName.toLowerCase())) return null;
  const next = cloneDocument(document);
  next.layers = next.layers.map((layer) =>
    layer.id === layerId ? { ...layer, name: normalizedName } : layer,
  );
  return next;
}

export function deleteLayer(
  document: ModelDocument,
  layerId: string,
): ModelDocument | null {
  if (
    layerId === DEFAULT_LAYER_ID ||
    layerId === document.activeLayerId ||
    !findLayer(document, layerId) ||
    document.objects.some((object) => object.layerId === layerId) ||
    document.lines.some((line) => line.layerId === layerId) ||
    document.polylines.some((polyline) => polyline.layerId === layerId) ||
    document.circles.some((circle) => circle.layerId === layerId) ||
    document.arcs.some((arc) => arc.layerId === layerId)
  ) {
    return null;
  }
  const next = cloneDocument(document);
  next.layers = next.layers.filter((layer) => layer.id !== layerId);
  return next;
}
