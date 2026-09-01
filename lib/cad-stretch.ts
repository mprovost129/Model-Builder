import {
  lineGeometryIsValid,
  type LineGeometry,
  type LinePoint,
} from "./cad-line.ts";
import {
  polylineGeometryIsValid,
  type PolylineGeometry,
} from "./cad-polyline.ts";

export type CadStretchTarget = {
  components: number[];
  id: string;
  kind: "arc" | "box" | "circle" | "line" | "polyline";
  whole: boolean;
};

function movedPoint(point: LinePoint, delta: LinePoint): LinePoint {
  return {
    x: point.x + delta.x,
    y: point.y + delta.y,
    z: point.z + delta.z,
  };
}

export function stretchLineGeometry(
  line: LineGeometry,
  components: number[],
  delta: LinePoint,
): LineGeometry | null {
  const selected = new Set(components);
  if (!selected.has(0) && !selected.has(1)) return null;
  const next = {
    start: selected.has(0) ? movedPoint(line.start, delta) : { ...line.start },
    end: selected.has(1) ? movedPoint(line.end, delta) : { ...line.end },
  };
  return lineGeometryIsValid(next) ? next : null;
}

export function stretchPolylineGeometry(
  polyline: PolylineGeometry,
  components: number[],
  delta: LinePoint,
): PolylineGeometry | null {
  const selected = new Set(components.filter((index) => Number.isInteger(index) && index >= 0 && index < polyline.vertices.length));
  if (!selected.size || Math.abs(delta.z) > 1e-9) return null;
  const next: PolylineGeometry = {
    ...polyline,
    bulges: polyline.bulges ? [...polyline.bulges] : undefined,
    vertices: polyline.vertices.map((point, index) => selected.has(index)
      ? { x: point.x + delta.x, y: point.y + delta.y }
      : { ...point }),
  };
  return polylineGeometryIsValid(next) ? next : null;
}
