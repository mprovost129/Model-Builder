import {
  roofPlaneGeometry,
  roofPlaneSurfaceElevation,
  roofPlaneTakeoffGeometry,
  type ModelDocument,
  type PlanPoint,
  type PolylineObject,
} from "./document-model.ts";

export type RoofFramingMemberKind =
  | "common-rafter"
  | "fascia"
  | "ridge-board"
  | "subfascia"
  | "truss-top-chord";

export type RoofFramingMember = {
  depth: number;
  end: { x: number; y: number; z: number };
  grossLength: number;
  id: string;
  kind: RoofFramingMemberKind;
  material: string;
  orientation: "roof-normal" | "vertical";
  roofPlaneId: string;
  start: { x: number; y: number; z: number };
  stationOffset: number | null;
  width: number;
};

export type RoofFramingLayout = {
  members: RoofFramingMember[];
  scheduledStationCount: number;
  unsupportedStationCount: number;
};

const TOLERANCE = 1 / 16;
const MAXIMUM_ROOF_FRAMING_STATION_COUNT = 2048;

function uniqueSorted(values: number[]) {
  return values
    .sort((first, second) => first - second)
    .filter((value, index, all) => index === 0 || Math.abs(value - all[index - 1]) > TOLERANCE / 4);
}

function stationsAcrossSpan(span: number, spacing: number, memberWidth: number) {
  if (span < TOLERANCE) return [];
  if (span <= memberWidth + TOLERANCE) return [span / 2];
  const first = memberWidth / 2;
  const last = span - memberWidth / 2;
  if (Math.ceil((last - first) / spacing) + 2 > MAXIMUM_ROOF_FRAMING_STATION_COUNT) return null;
  const stations = [first];
  for (let station = first + spacing; station < last - TOLERANCE; station += spacing) stations.push(station);
  if (last - stations.at(-1)! > TOLERANCE) stations.push(last);
  return stations;
}

function lineDepthIntersections(vertices: Array<{ u: number; v: number }>, station: number) {
  const depths: number[] = [];
  vertices.forEach((start, index) => {
    const end = vertices[(index + 1) % vertices.length];
    const delta = end.u - start.u;
    if (Math.abs(delta) <= TOLERANCE / 16) {
      if (Math.abs(station - start.u) <= TOLERANCE / 16) depths.push(start.v, end.v);
      return;
    }
    const fraction = (station - start.u) / delta;
    if (fraction < -TOLERANCE / 16 || fraction > 1 + TOLERANCE / 16) return;
    depths.push(start.v + (end.v - start.v) * Math.max(0, Math.min(1, fraction)));
  });
  return uniqueSorted(depths);
}

function offsetPoint(point: PlanPoint, normal: PlanPoint, distance: number) {
  return { x: point.x + normal.x * distance, y: point.y + normal.y * distance };
}

function memberLength(start: RoofFramingMember["start"], end: RoofFramingMember["end"]) {
  return Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z);
}

/**
 * Creates schedule-ready gross framing members only where a Roof Plane has one
 * unambiguous eave-to-high-edge run. Stations that terminate on hip, valley,
 * clipped, or concave boundaries are counted as unsupported instead of being
 * mislabeled as common rafters or complete trusses.
 */
export function roofFramingLayout(document: ModelDocument, polyline: PolylineObject): RoofFramingLayout | null {
  const geometry = roofPlaneGeometry(polyline);
  const settings = polyline.roofSettings;
  const takeoff = roofPlaneTakeoffGeometry(document, polyline);
  if (!geometry || !settings || !takeoff) return null;
  const eaveDx = geometry.eaveEnd.x - geometry.eaveStart.x;
  const eaveDy = geometry.eaveEnd.y - geometry.eaveStart.y;
  const eaveLength = Math.hypot(eaveDx, eaveDy);
  if (eaveLength < TOLERANCE) return null;
  const tangent = { x: eaveDx / eaveLength, y: eaveDy / eaveLength };
  const localVertices = polyline.vertices.map((point) => ({
    u: (point.x - geometry.eaveStart.x) * tangent.x + (point.y - geometry.eaveStart.y) * tangent.y,
    v: (point.x - geometry.eaveStart.x) * geometry.inwardNormal.x + (point.y - geometry.eaveStart.y) * geometry.inwardNormal.y,
  }));
  const roofType = document.building.roofTypes.find((candidate) => candidate.id === polyline.roofTypeId);
  const material = roofType?.layers.find((layer) => layer.role === "framing")?.material ?? "Lumber";
  const members: RoofFramingMember[] = [];
  let unsupportedStationCount = 0;
  const stations = stationsAcrossSpan(eaveLength, settings.framingSpacing, settings.rafterWidth);
  if (stations === null) unsupportedStationCount = Math.ceil(eaveLength / settings.framingSpacing) + 1;
  stations?.forEach((station, index) => {
    const depths = lineDepthIntersections(localVertices, station);
    if (depths.length !== 2 || Math.abs(depths[0]) > TOLERANCE || depths[1] < geometry.totalDepth - TOLERANCE) {
      unsupportedStationCount += 1;
      return;
    }
    const startPlan = offsetPoint({ x: geometry.eaveStart.x + tangent.x * station, y: geometry.eaveStart.y + tangent.y * station }, geometry.inwardNormal, Math.max(0, depths[0]));
    const endPlan = offsetPoint({ x: geometry.eaveStart.x + tangent.x * station, y: geometry.eaveStart.y + tangent.y * station }, geometry.inwardNormal, depths[1]);
    const startZ = roofPlaneSurfaceElevation(document, polyline, startPlan);
    const endZ = roofPlaneSurfaceElevation(document, polyline, endPlan);
    if (startZ === null || endZ === null) {
      unsupportedStationCount += 1;
      return;
    }
    const start = { ...startPlan, z: startZ };
    const end = { ...endPlan, z: endZ };
    members.push({
      depth: settings.rafterDepth,
      end,
      grossLength: memberLength(start, end),
      id: `${polyline.id}-${settings.framingMethod === "rafters" ? "rafter" : "top-chord"}-${String(index + 1).padStart(3, "0")}`,
      kind: settings.framingMethod === "rafters" ? "common-rafter" : "truss-top-chord",
      material,
      orientation: "roof-normal",
      roofPlaneId: polyline.id,
      start,
      stationOffset: station,
      width: settings.rafterWidth,
    });
  });

  const addVerticalBoard = (kind: "fascia" | "subfascia", outwardOffset: number, width: number, depth: number) => {
    const normal = geometry.inwardNormal;
    const startPlan = offsetPoint(geometry.eaveStart, normal, outwardOffset);
    const endPlan = offsetPoint(geometry.eaveEnd, normal, outwardOffset);
    const top = roofPlaneSurfaceElevation(document, polyline, geometry.eaveStart);
    if (top === null) return;
    const start = { ...startPlan, z: top };
    const end = { ...endPlan, z: top };
    members.push({ depth, end, grossLength: eaveLength, id: `${polyline.id}-${kind}`, kind, material: "Lumber", orientation: "vertical", roofPlaneId: polyline.id, start, stationOffset: null, width });
  };
  addVerticalBoard("fascia", -settings.fasciaThickness / 2, settings.fasciaThickness, settings.fasciaDepth);
  addVerticalBoard("subfascia", settings.subfasciaThickness / 2, settings.subfasciaThickness, settings.subfasciaDepth);

  takeoff.edges.filter((edge) => edge.role === "ridge" && edge.joinedRoofPlaneId && polyline.id.localeCompare(edge.joinedRoofPlaneId) < 0).forEach((edge, index) => {
    const startZ = roofPlaneSurfaceElevation(document, polyline, edge.start);
    const endZ = roofPlaneSurfaceElevation(document, polyline, edge.end);
    if (startZ === null || endZ === null) return;
    members.push({
      depth: settings.ridgeBoardDepth,
      end: { ...edge.end, z: endZ },
      grossLength: edge.slopedLength,
      id: `${polyline.id}-ridge-${String(index + 1).padStart(2, "0")}`,
      kind: "ridge-board",
      material,
      orientation: "vertical",
      roofPlaneId: polyline.id,
      start: { ...edge.start, z: startZ },
      stationOffset: null,
      width: settings.ridgeBoardThickness,
    });
  });

  return { members, scheduledStationCount: members.filter((member) => member.kind === "common-rafter" || member.kind === "truss-top-chord").length, unsupportedStationCount };
}
