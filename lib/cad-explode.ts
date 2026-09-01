import { arcGeometryIsValid, type ArcGeometry } from "./cad-arc.ts";
import { lineGeometryIsValid, type LineGeometry } from "./cad-line.ts";
import {
  polylineGeometryIsValid,
  polylineSegmentCircularGeometry,
  polylineSegments,
  type PolylineGeometry,
} from "./cad-polyline.ts";

export type ExplodedPolylineSegment =
  | { geometry: LineGeometry; kind: "line" }
  | { geometry: ArcGeometry; kind: "arc" };

/** Converts each Polyline segment to the equivalent native Line or Arc geometry. */
export function explodePolylineGeometry(polyline: PolylineGeometry): ExplodedPolylineSegment[] | null {
  if (!polylineGeometryIsValid(polyline)) return null;
  const pieces: ExplodedPolylineSegment[] = [];

  for (const segment of polylineSegments(polyline)) {
    if (Math.abs(segment.bulge) < 1e-10) {
      const geometry: LineGeometry = {
        start: { ...segment.start, z: polyline.elevation },
        end: { ...segment.end, z: polyline.elevation },
      };
      if (!lineGeometryIsValid(geometry)) return null;
      pieces.push({ geometry, kind: "line" });
      continue;
    }

    const circular = polylineSegmentCircularGeometry(segment);
    if (!circular) return null;
    const geometry: ArcGeometry = {
      center: { ...circular.center, z: polyline.elevation },
      counterclockwise: circular.counterclockwise,
      endAngle: circular.endAngle,
      radius: circular.radius,
      startAngle: circular.startAngle,
    };
    if (!arcGeometryIsValid(geometry)) return null;
    pieces.push({ geometry, kind: "arc" });
  }

  return pieces.length ? pieces : null;
}
