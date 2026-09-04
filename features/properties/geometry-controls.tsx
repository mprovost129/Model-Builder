/**
 * Properties-panel geometry editors, one per entity kind.
 *
 * Each takes the selected entity and an onUpdate callback that returns false
 * when the edit is rejected, letting the field restore its previous text. None
 * of them mutate the document. Extracted from app/model-builder-app.tsx.
 */
import { useState } from "react";
import { titleCase } from "@/lib/text";
import { WALL_REFERENCE_LINE_LABELS } from "@/features/properties/building-labels";
import {
  formatArchitectural,
  formatSignedArchitectural,
  parseArchitectural,
  parseSignedArchitectural,
  snapToSixteenth,
} from "@/lib/architectural-units";
import { MAXIMUM_COORDINATE } from "@/lib/box-model";
import { arcLength, arcPointAtFraction, arcSweepAngle } from "@/lib/cad-arc";
import { circleArea, circleCircumference, circleDiameter } from "@/lib/cad-circle";
import { lineAngle, lineElevationAngle, lineFromLengthAngles, lineLength } from "@/lib/cad-line";
import { polylineArea, polylineLength, rectangleDimensions, rectangleFromCorners } from "@/lib/cad-polyline";
import {
  OPENING_COMPONENT_DEPTH_ANCHORS,
  resolveWallHeaderType,
  wallHeaderTypeRequiredMainThickness,
  wallLayerGroupThickness,
  type OpeningAssemblyComponent,
} from "@/lib/building-stories";
import {
  foundationWallVerticalExtent,
  resolveOpeningComponents,
  wallVerticalExtent,
} from "@/lib/document-model";
import type { ArcGeometry } from "@/lib/cad-arc";
import type { CircleGeometry } from "@/lib/cad-circle";
import type { LineGeometry } from "@/lib/cad-line";
import type { PolylineGeometry } from "@/lib/cad-polyline";
import type { BuildingStructure, WallOpeningKind } from "@/lib/building-stories";
import type {
  ArcObject,
  CircleObject,
  LineObject,
  ModelDocument,
  OpeningComponentOverride,
  PolylineObject,
  WallOpening,
} from "@/lib/document-model";
import {
  LineCoordinateField,
  PropertyGridRow,
  PropertyGridSection,
} from "@/features/properties/property-fields";
import { LayerColorField } from "@/features/properties/naming-fields";

export function ArcGeometryControl({ arc, onUpdate }: { arc: ArcObject; onUpdate: (geometry: ArcGeometry) => boolean }) {
  const updateCenter = (axis: "x" | "y" | "z", draft: string) => {
    const value = parseSignedArchitectural(draft);
    if (value === null || Math.abs(value) > MAXIMUM_COORDINATE) return false;
    return onUpdate({ ...arc, center: { ...arc.center, [axis]: snapToSixteenth(value) } });
  };
  const updateRadius = (draft: string) => {
    const value = parseArchitectural(draft);
    if (value === null || value < 1 / 16) return false;
    return onUpdate({ ...arc, radius: snapToSixteenth(value) });
  };
  const start = arcPointAtFraction(arc, 0);
  const end = arcPointAtFraction(arc, 1);
  return (
    <PropertyGridSection title="Geometry" meta="Three-point Arc">
      <LineCoordinateField label="Center X" value={arc.center.x} onCommit={(draft) => updateCenter("x", draft)} />
      <LineCoordinateField label="Center Y" value={arc.center.y} onCommit={(draft) => updateCenter("y", draft)} />
      <LineCoordinateField label="Elevation" value={arc.center.z} onCommit={(draft) => updateCenter("z", draft)} />
      <LineCoordinateField label="Radius" value={arc.radius} onCommit={updateRadius} />
      <PropertyGridRow label="Sweep"><span className="property-readout">{Math.round(arcSweepAngle(arc) * 1000) / 1000}° · {arc.counterclockwise ? "counterclockwise" : "clockwise"}</span></PropertyGridRow>
      <PropertyGridRow label="Arc length"><span className="property-readout">{formatArchitectural(arcLength(arc))}</span></PropertyGridRow>
      <PropertyGridRow label="Start"><span className="property-readout">{formatSignedArchitectural(start.x)}, {formatSignedArchitectural(start.y)}</span></PropertyGridRow>
      <PropertyGridRow label="End"><span className="property-readout">{formatSignedArchitectural(end.x)}, {formatSignedArchitectural(end.y)}</span></PropertyGridRow>
      <p className="property-grid-note">The green center grip moves the Arc. Blue endpoint and midpoint grips reshape it through three points.</p>
    </PropertyGridSection>
  );
}

export function CircleGeometryControl({ circle, onUpdate }: { circle: CircleObject; onUpdate: (geometry: CircleGeometry) => boolean }) {
  const updateCenter = (axis: "x" | "y" | "z", draft: string) => {
    const value = parseSignedArchitectural(draft);
    if (value === null || Math.abs(value) > MAXIMUM_COORDINATE) return false;
    return onUpdate({ ...circle, center: { ...circle.center, [axis]: snapToSixteenth(value) } });
  };
  const updateRadius = (draft: string) => {
    const value = parseArchitectural(draft);
    if (value === null || value < 1 / 16) return false;
    return onUpdate({ ...circle, radius: snapToSixteenth(value) });
  };
  return (
    <PropertyGridSection title="Geometry" meta="Center · radius">
      <LineCoordinateField label="Center X" value={circle.center.x} onCommit={(draft) => updateCenter("x", draft)} />
      <LineCoordinateField label="Center Y" value={circle.center.y} onCommit={(draft) => updateCenter("y", draft)} />
      <LineCoordinateField label="Elevation" value={circle.center.z} onCommit={(draft) => updateCenter("z", draft)} />
      <LineCoordinateField label="Radius" value={circle.radius} onCommit={updateRadius} />
      <PropertyGridRow label="Diameter"><span className="property-readout">{formatArchitectural(circleDiameter(circle))}</span></PropertyGridRow>
      <PropertyGridRow label="Circumference"><span className="property-readout">{formatArchitectural(circleCircumference(circle))}</span></PropertyGridRow>
      <PropertyGridRow label="Area"><span className="property-readout">{(circleArea(circle) / 144).toLocaleString(undefined, { maximumFractionDigits: 2 })} sq ft</span></PropertyGridRow>
      <p className="property-grid-note">The green center grip moves the Circle. Four blue quadrant grips change its radius while keeping the center fixed.</p>
    </PropertyGridSection>
  );
}

export function PolylineGeometryControl({ elevationLocked = false, polyline, onUpdate }: { elevationLocked?: boolean; polyline: PolylineObject; onUpdate: (geometry: PolylineGeometry) => boolean }) {
  const updateElevation = (draft: string) => {
    const value = parseSignedArchitectural(draft);
    if (value === null || Math.abs(value) > MAXIMUM_COORDINATE) return false;
    return onUpdate({ ...polyline, elevation: snapToSixteenth(value) });
  };
  const updateWidth = (draft: string) => {
    const value = parseSignedArchitectural(draft);
    if (value === null || value < 0 || value > MAXIMUM_COORDINATE) return false;
    return onUpdate({ ...polyline, width: snapToSixteenth(value) });
  };
  const first = polyline.vertices[0];
  const last = polyline.vertices.at(-1)!;
  const arcCount = polyline.bulges?.filter((bulge) => Math.abs(bulge) > 1e-10).length ?? 0;
  return (
    <PropertyGridSection title="Geometry" meta="XY work plane">
      {elevationLocked ? <PropertyGridRow label="Rough floor"><span className="property-readout">{formatSignedArchitectural(polyline.elevation)} · Story controlled</span></PropertyGridRow> : <LineCoordinateField label="Elevation" value={polyline.elevation} onCommit={updateElevation} />}
      <LineCoordinateField label="Constant width" value={polyline.width ?? 0} onCommit={updateWidth} unsigned />
      <PropertyGridRow label="Vertices"><span className="property-readout">{polyline.vertices.length}</span></PropertyGridRow>
      <PropertyGridRow label="Arc segments"><span className="property-readout">{arcCount}</span></PropertyGridRow>
      <PropertyGridRow label="Closed"><span className="property-readout">{polyline.closed ? "Yes" : "No"}</span></PropertyGridRow>
      {polyline.closed ? <PropertyGridRow label="Area"><span className="property-readout">{(polylineArea(polyline) / 144).toLocaleString(undefined, { maximumFractionDigits: 2 })} sq ft</span></PropertyGridRow> : null}
      <PropertyGridRow label="Total length"><span className="property-readout">{formatArchitectural(polylineLength(polyline))}</span></PropertyGridRow>
      <PropertyGridRow label="First vertex"><span className="property-readout">{formatSignedArchitectural(first.x)}, {formatSignedArchitectural(first.y)}</span></PropertyGridRow>
      <PropertyGridRow label="Last vertex"><span className="property-readout">{formatSignedArchitectural(last.x)}, {formatSignedArchitectural(last.y)}</span></PropertyGridRow>
      <p className="property-grid-note">{elevationLocked ? "Drag a blue vertex grip to reshape the footprint. Its elevation follows the assigned Story rough floor." : "Drag a blue vertex grip to reshape the Polyline. Elevation moves the complete entity to another XY work plane."}</p>
    </PropertyGridSection>
  );
}

export function RectangleGeometryControl({ elevationLocked = false, rectangle, onUpdate }: { elevationLocked?: boolean; rectangle: PolylineObject; onUpdate: (geometry: PolylineGeometry) => boolean }) {
  const first = rectangle.vertices[0];
  const opposite = rectangle.vertices[2];
  const dimensions = rectangleDimensions(first, opposite);
  const updateBase = (axis: "x" | "y", draft: string) => {
    const value = parseSignedArchitectural(draft);
    if (value === null || Math.abs(value) > MAXIMUM_COORDINATE) return false;
    const snapped = snapToSixteenth(value);
    const delta = snapped - first[axis];
    return onUpdate({ ...rectangle, vertices: rectangle.vertices.map((point) => ({ ...point, [axis]: snapToSixteenth(point[axis] + delta) })) });
  };
  const updateDimension = (axis: "x" | "y", draft: string) => {
    const value = parseArchitectural(draft);
    if (value === null || value < 1 / 16) return false;
    const nextOpposite = { ...opposite };
    nextOpposite[axis] = first[axis] + Math.sign(opposite[axis] - first[axis]) * snapToSixteenth(value);
    const geometry = rectangleFromCorners(first, nextOpposite, rectangle.elevation, { width: rectangle.width ?? 0 });
    return Boolean(geometry && onUpdate(geometry));
  };
  const updateElevation = (draft: string) => {
    const value = parseSignedArchitectural(draft);
    if (value === null || Math.abs(value) > MAXIMUM_COORDINATE) return false;
    return onUpdate({ ...rectangle, elevation: snapToSixteenth(value) });
  };
  const updateWidth = (draft: string) => {
    const value = parseSignedArchitectural(draft);
    if (value === null || value < 0 || value > MAXIMUM_COORDINATE) return false;
    return onUpdate({ ...rectangle, width: snapToSixteenth(value) });
  };
  return (
    <PropertyGridSection title="Geometry" meta="Rectangular constraint">
      <LineCoordinateField label="Base X" value={first.x} onCommit={(draft) => updateBase("x", draft)} />
      <LineCoordinateField label="Base Y" value={first.y} onCommit={(draft) => updateBase("y", draft)} />
      {elevationLocked ? <PropertyGridRow label="Rough floor"><span className="property-readout">{formatSignedArchitectural(rectangle.elevation)} · Story controlled</span></PropertyGridRow> : <LineCoordinateField label="Elevation" value={rectangle.elevation} onCommit={updateElevation} />}
      <LineCoordinateField label="Constant width" value={rectangle.width ?? 0} onCommit={updateWidth} unsigned />
      <LineCoordinateField label="Width (X)" value={dimensions.width} onCommit={(draft) => updateDimension("x", draft)} />
      <LineCoordinateField label="Height (Y)" value={dimensions.height} onCommit={(draft) => updateDimension("y", draft)} />
      <PropertyGridRow label="Area"><span className="property-readout">{(dimensions.area / 144).toLocaleString(undefined, { maximumFractionDigits: 2 })} sq ft</span></PropertyGridRow>
      <PropertyGridRow label="Perimeter"><span className="property-readout">{formatArchitectural(dimensions.perimeter)}</span></PropertyGridRow>
      <p className="property-grid-note">{elevationLocked ? "Corner and edge grips reshape the footprint; the elevation follows its assigned Story rough floor." : "Corner grips resize in two directions. Edge grips resize one side. The center grip moves the rectangle."}</p>
    </PropertyGridSection>
  );
}

export function LineGeometryControl({ line, onUpdate }: { line: LineObject; onUpdate: (geometry: LineGeometry) => boolean }) {
  const [lengthDraft, setLengthDraft] = useState(formatArchitectural(lineLength(line)));
  const [angleDraft, setAngleDraft] = useState(String(lineAngle(line)));
  const [elevationDraft, setElevationDraft] = useState(String(lineElevationAngle(line)));
  const [error, setError] = useState("");
  const updatePoint = (endpoint: "start" | "end", axis: "x" | "y" | "z", draft: string) => {
    const value = parseSignedArchitectural(draft);
    if (value === null || Math.abs(value) > MAXIMUM_COORDINATE) return false;
    const geometry = { start: { ...line.start }, end: { ...line.end } };
    geometry[endpoint][axis] = snapToSixteenth(value);
    return onUpdate(geometry);
  };
  const applyPolar = () => {
    const length = parseArchitectural(lengthDraft);
    const normalizedAngle = angleDraft.trim().replace(/°$/, "");
    const angle = Number(normalizedAngle);
    const elevation = Number(elevationDraft.trim().replace(/°$/, ""));
    if (length === null || length < 1 / 16 || !Number.isFinite(angle) || !Number.isFinite(elevation) || Math.abs(elevation) > 90) {
      setError("Enter a valid length, plan angle, and elevation from −90° through 90°.");
      return;
    }
    const geometry = lineFromLengthAngles(line.start, snapToSixteenth(length), angle, elevation);
    if (!geometry || !onUpdate(geometry)) {
      setError("That line is outside the supported drawing area.");
      return;
    }
    setError("");
  };
  const coordinateRows: Array<{ endpoint: "start" | "end"; axis: "x" | "y" | "z"; label: string }> = [
    { endpoint: "start", axis: "x", label: "Start X" },
    { endpoint: "start", axis: "y", label: "Start Y" },
    { endpoint: "start", axis: "z", label: "Start Z" },
    { endpoint: "end", axis: "x", label: "End X" },
    { endpoint: "end", axis: "y", label: "End Y" },
    { endpoint: "end", axis: "z", label: "End Z" },
  ];
  return (
    <>
      <PropertyGridSection title="Geometry" meta="3D coordinates">
        {coordinateRows.map(({ endpoint, axis, label }) => (
          <LineCoordinateField key={`${endpoint}-${axis}-${line[endpoint][axis]}`} label={label} value={line[endpoint][axis]} onCommit={(draft) => updatePoint(endpoint, axis, draft)} />
        ))}
      </PropertyGridSection>
      <PropertyGridSection title="Polar" meta="Start point fixed">
        <label className="property-table-row property-input-row"><span className="property-table-label">Length</span><div className="property-table-value field-shell"><input value={lengthDraft} onChange={(event) => { setLengthDraft(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") applyPolar(); }} aria-label="Line length" spellCheck={false} /><span>ft-in</span></div></label>
        <label className="property-table-row property-input-row"><span className="property-table-label">Angle</span><div className="property-table-value field-shell"><input value={angleDraft} onChange={(event) => { setAngleDraft(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") applyPolar(); }} aria-label="Line angle" spellCheck={false} /><span>deg</span></div></label>
        <label className="property-table-row property-input-row"><span className="property-table-label">Elevation</span><div className="property-table-value field-shell"><input value={elevationDraft} onChange={(event) => { setElevationDraft(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") applyPolar(); }} aria-label="Line elevation angle" spellCheck={false} /><span>deg</span></div></label>
        {error ? <p className="property-grid-note property-row-error" role="alert">{error}</p> : null}
        <div className="property-action-row single-action"><button type="button" onClick={applyPolar}>Apply Length + Angles</button></div>
        <p className="property-grid-note">Plan angles measure counterclockwise from +X. Elevation measures above or below the XY plane.</p>
      </PropertyGridSection>
    </>
  );
}

export function WallGeometryControl({
  document,
  line,
  onUpdate,
}: {
  document: ModelDocument;
  line: LineObject;
  onUpdate: (geometry: LineGeometry) => boolean;
}) {
  const vertical = wallVerticalExtent(document, line);
  const referenceLabel = WALL_REFERENCE_LINE_LABELS[line.wallReferenceLine ?? "wall-center"];
  const exteriorSideLabel = line.wallExteriorSide === "right" ? "right" : "left";
  const updatePoint = (endpoint: "start" | "end", axis: "x" | "y", draft: string) => {
    const value = parseSignedArchitectural(draft);
    if (value === null || Math.abs(value) > MAXIMUM_COORDINATE) return false;
    const geometry = { start: { ...line.start }, end: { ...line.end } };
    geometry[endpoint][axis] = snapToSixteenth(value);
    return onUpdate(geometry);
  };
  return (
    <PropertyGridSection title="Geometry" meta="Story controlled">
      <LineCoordinateField label="Start X" value={line.start.x} onCommit={(draft) => updatePoint("start", "x", draft)} />
      <LineCoordinateField label="Start Y" value={line.start.y} onCommit={(draft) => updatePoint("start", "y", draft)} />
      <LineCoordinateField label="End X" value={line.end.x} onCommit={(draft) => updatePoint("end", "x", draft)} />
      <LineCoordinateField label="End Y" value={line.end.y} onCommit={(draft) => updatePoint("end", "y", draft)} />
      <PropertyGridRow label="Length"><span className="property-readout">{formatArchitectural(Math.hypot(line.end.x - line.start.x, line.end.y - line.start.y))}</span></PropertyGridRow>
      <PropertyGridRow label="Plan angle"><span className="property-readout">{lineAngle(line)}°</span></PropertyGridRow>
      <PropertyGridRow label="Automatic base"><span className="property-readout">{vertical ? formatSignedArchitectural(vertical.baseElevation) : "—"}</span></PropertyGridRow>
      <PropertyGridRow label="Automatic top"><span className="property-readout">{vertical ? formatSignedArchitectural(vertical.topElevation) : "—"}</span></PropertyGridRow>
      <PropertyGridRow label="Wall height"><span className="property-readout">{vertical ? formatArchitectural(vertical.height) : "—"}</span></PropertyGridRow>
      <PropertyGridRow label="Vertical source"><span className="property-readout">{vertical?.source === "rooms" ? `${vertical.adjacentRoomIds.length} adjacent Room${vertical.adjacentRoomIds.length === 1 ? "" : "s"}` : "Story defaults"}</span></PropertyGridRow>
      <p className="property-grid-note">X and Y define the {referenceLabel.toLowerCase()}. Looking from Start to End, the exterior is on the {exteriorSideLabel}; base and top automatically follow adjacent Room rough conditions, then fall back to the Story defaults.</p>
      {vertical?.hasDifferentRoomFloors || vertical?.hasDifferentRoomCeilings ? <p className="property-grid-note">Adjacent Rooms have different rough conditions. This Wall spans their full structural envelope; stepped finish profiles will be generated separately.</p> : null}
    </PropertyGridSection>
  );
}

export function FoundationWallGeometryControl({
  document,
  line,
  onUpdate,
}: {
  document: ModelDocument;
  line: LineObject;
  onUpdate: (geometry: LineGeometry) => boolean;
}) {
  const vertical = foundationWallVerticalExtent(document, line);
  const type = document.building.foundationWallTypes.find((candidate) => candidate.id === line.foundationWallTypeId);
  const referenceLabel = WALL_REFERENCE_LINE_LABELS[line.wallReferenceLine ?? "exterior-main"];
  const exteriorSideLabel = line.wallExteriorSide === "right" ? "right" : "left";
  const updatePoint = (endpoint: "start" | "end", axis: "x" | "y", draft: string) => {
    const value = parseSignedArchitectural(draft);
    if (value === null || Math.abs(value) > MAXIMUM_COORDINATE) return false;
    const geometry = { start: { ...line.start }, end: { ...line.end } };
    geometry[endpoint][axis] = snapToSixteenth(value);
    return onUpdate(geometry);
  };
  return (
    <PropertyGridSection title="Geometry" meta="Story-controlled foundation">
      <LineCoordinateField label="Start X" value={line.start.x} onCommit={(draft) => updatePoint("start", "x", draft)} />
      <LineCoordinateField label="Start Y" value={line.start.y} onCommit={(draft) => updatePoint("start", "y", draft)} />
      <LineCoordinateField label="End X" value={line.end.x} onCommit={(draft) => updatePoint("end", "x", draft)} />
      <LineCoordinateField label="End Y" value={line.end.y} onCommit={(draft) => updatePoint("end", "y", draft)} />
      <PropertyGridRow label="Length"><span className="property-readout">{formatArchitectural(Math.hypot(line.end.x - line.start.x, line.end.y - line.start.y))}</span></PropertyGridRow>
      <PropertyGridRow label="Concrete top"><span className="property-readout">{vertical ? formatSignedArchitectural(vertical.topElevation) : "—"}</span></PropertyGridRow>
      <PropertyGridRow label="Concrete bottom"><span className="property-readout">{vertical ? formatSignedArchitectural(vertical.baseElevation) : "—"}</span></PropertyGridRow>
      <PropertyGridRow label="Footing bottom"><span className="property-readout">{vertical ? formatSignedArchitectural(vertical.footingBottomElevation) : "—"}</span></PropertyGridRow>
      <PropertyGridRow label="Sill top"><span className="property-readout">{vertical ? formatSignedArchitectural(vertical.sillTopElevation) : "—"}</span></PropertyGridRow>
      <p className="property-grid-note">X and Y define the {referenceLabel.toLowerCase()}. Looking from Start to End, the exterior is on the {exteriorSideLabel}. Concrete, footing, and foundation-hosted sill geometry comes from {type?.name ?? "the assigned Foundation Wall type"}.</p>
    </PropertyGridSection>
  );
}

export function WallOpeningNameField({ opening, onUpdate }: { opening: WallOpening; onUpdate: (change: Partial<WallOpening>) => boolean }) {
  const [draft, setDraft] = useState(opening.name);
  const [error, setError] = useState(false);
  const commit = () => {
    if (!onUpdate({ name: draft })) {
      setDraft(opening.name);
      setError(true);
      return;
    }
    setError(false);
  };
  return (
    <label className="property-table-row property-input-row"><span className="property-table-label">Name</span><div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}><input value={draft} onChange={(event) => { setDraft(event.target.value); setError(false); }} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setDraft(opening.name); setError(false); event.currentTarget.blur(); } }} aria-label="Opening name" spellCheck={false} /></div></label>
  );
}

export function WallOpeningComponentMaterialField({ material, onUpdate }: { material: string; onUpdate: (material: string) => boolean }) {
  const [draft, setDraft] = useState(material);
  const [error, setError] = useState(false);
  const commit = () => {
    const next = draft.trim();
    if (!next || !onUpdate(next)) {
      setDraft(material);
      setError(true);
      return;
    }
    setError(false);
  };
  return <label className="property-table-row property-input-row"><span className="property-table-label">Part material</span><div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}><input value={draft} onChange={(event) => { setDraft(event.target.value); setError(false); }} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setDraft(material); setError(false); event.currentTarget.blur(); } }} aria-label="Opening component material" spellCheck={false} /></div></label>;
}

export function WallOpeningsControl({
  building,
  layers,
  line,
  onAdd,
  onAssignType,
  onDelete,
  onUpdate,
}: {
  building: BuildingStructure;
  layers: ModelDocument["layers"];
  line: LineObject;
  onAdd: (kind: WallOpeningKind) => string | null;
  onAssignType: (openingId: string, typeId: string) => boolean;
  onDelete: (openingId: string) => void;
  onUpdate: (openingId: string, change: Partial<WallOpening>) => boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(line.wallOpenings[0]?.id ?? null);
  const initialOpeningType = building.openingTypes.find((type) => type.id === line.wallOpenings[0]?.wallOpeningTypeId) ?? null;
  const [selectedComponentId, setSelectedComponentId] = useState(initialOpeningType?.components[0]?.id ?? "");
  const opening = line.wallOpenings.find((candidate) => candidate.id === selectedId) ?? line.wallOpenings.at(-1) ?? null;
  const add = (kind: WallOpeningKind) => {
    const id = onAdd(kind);
    if (id) setSelectedId(id);
  };
  const updateDimension = (field: "centerOffset" | "headerBottomHeight", draft: string) => {
    const value = parseArchitectural(draft);
    if (value === null || (field === "centerOffset" ? value < 0 : value <= 0)) return false;
    return opening ? onUpdate(opening.id, { [field]: snapToSixteenth(value) }) : false;
  };
  const componentType = building.openingTypes.find((type) => type.id === opening?.wallOpeningTypeId) ?? null;
  const resolvedComponents = componentType && opening ? resolveOpeningComponents(componentType, opening.componentOverrides) : null;
  const baseComponent = componentType?.components.find((component) => component.id === selectedComponentId) ?? componentType?.components[0] ?? null;
  const resolvedComponent = baseComponent ? resolvedComponents?.find((component) => component.id === baseComponent.id) ?? null : null;
  const componentOverride = opening && baseComponent ? opening.componentOverrides.find((override) => override.componentId === baseComponent.id) ?? null : null;
  const updateComponentOverride = (change: Partial<Omit<OpeningComponentOverride, "componentId">>) => {
    if (!opening || !baseComponent) return false;
    const nextOverride = { ...(componentOverride ?? { componentId: baseComponent.id }), ...change, componentId: baseComponent.id };
    const componentOverrides = [...opening.componentOverrides.filter((override) => override.componentId !== baseComponent.id), nextOverride].sort((first, second) => first.componentId.localeCompare(second.componentId));
    return onUpdate(opening.id, { componentOverrides });
  };
  const resetComponentOverride = () => opening && baseComponent ? onUpdate(opening.id, { componentOverrides: opening.componentOverrides.filter((override) => override.componentId !== baseComponent.id) }) : false;
  const updateComponentDimension = (field: "depth" | "depthOffset" | "inset" | "profileWidth", draft: string, signed = false, allowZero = false) => {
    const value = (signed ? parseSignedArchitectural : parseArchitectural)(draft);
    if (value === null || (!signed && (allowZero ? value < 0 : value <= 0))) return false;
    return updateComponentOverride({ [field]: snapToSixteenth(value) });
  };
  const wallType = building.wallTypes.find((type) => type.id === line.wallTypeId) ?? null;
  const resolvedHeader = opening ? resolveWallHeaderType(building, line.wallTypeId, opening.wallOpeningTypeId, opening.headerTypeIdOverride) : null;
  const compatibleHeaders = building.headerTypes.filter((headerType) => {
    const required = wallHeaderTypeRequiredMainThickness(headerType);
    return !wallType || required === 0 || required <= wallLayerGroupThickness(wallType, "main") + 1e-8;
  });
  const compatibleTypes = building.openingTypes.filter((type) => type.kind === opening?.kind);
  const openingLayer = layers.find((layer) => layer.id === opening?.layerId) ?? layers[0];
  const updateFillOverride = (change: { color?: string; visible?: boolean } | null) => {
    if (!opening || !openingLayer) return false;
    const current = opening.fillOverride ?? { color: openingLayer.fillColor, visible: openingLayer.fillVisible };
    return onUpdate(opening.id, { fillOverride: change === null ? null : { ...current, ...change } });
  };
  return (
    <PropertyGridSection title="Openings" meta={`${line.wallOpenings.length} hosted`}>
      <div className="property-action-row"><button type="button" onClick={() => add("door")}>+ Door</button><button type="button" onClick={() => add("window")}>+ Window</button></div>
      {line.wallOpenings.length > 0 ? <PropertyGridRow label="Opening"><select className="property-cell-select" value={opening?.id ?? ""} onChange={(event) => { const nextOpening = line.wallOpenings.find((candidate) => candidate.id === event.target.value); const nextType = building.openingTypes.find((type) => type.id === nextOpening?.wallOpeningTypeId); setSelectedId(event.target.value); setSelectedComponentId(nextType?.components[0]?.id ?? ""); }} aria-label="Hosted wall opening">{line.wallOpenings.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.kind === "door" ? "Door" : "Window"}</option>)}</select></PropertyGridRow> : <p className="property-grid-note">Add a Door or Window to cut its rough opening through every Wall layer.</p>}
      {opening ? <>
        <WallOpeningNameField key={`${opening.id}:${opening.name}`} opening={opening} onUpdate={(change) => onUpdate(opening.id, change)} />
        <PropertyGridRow label="Layer"><select className="property-cell-select" value={opening.layerId} onChange={(event) => onUpdate(opening.id, { layerId: event.target.value })} aria-label={`${opening.kind} layer`}>{layers.map((layer) => <option key={layer.id} value={layer.id}>{layer.name}{!layer.visible ? " (hidden)" : ""}</option>)}</select></PropertyGridRow>
        {openingLayer ? <>
          <PropertyGridRow label="By Layer"><button type="button" className={!opening.fillOverride ? "property-cell-button is-locked" : "property-cell-button"} onClick={() => updateFillOverride(opening.fillOverride ? null : {})}>{!opening.fillOverride ? "✓ Inherited" : "○ Use Layer"}</button></PropertyGridRow>
          <PropertyGridRow label="Fill color"><span className="object-fill-field"><LayerColorField key={`${opening.id}:fill:${opening.fillOverride?.color ?? openingLayer.fillColor}`} color={opening.fillOverride?.color ?? openingLayer.fillColor} label={`${opening.name} fill color`} onCommit={(color) => updateFillOverride({ color })} /></span></PropertyGridRow>
          <PropertyGridRow label="Fill"><button type="button" className={(opening.fillOverride?.visible ?? openingLayer.fillVisible) ? "property-cell-button is-locked" : "property-cell-button"} onClick={() => updateFillOverride({ visible: !(opening.fillOverride?.visible ?? openingLayer.fillVisible) })}>{(opening.fillOverride?.visible ?? openingLayer.fillVisible) ? "● On" : "○ Off"}</button></PropertyGridRow>
        </> : null}
        <PropertyGridRow label="Component type"><select className="property-cell-select" value={opening.wallOpeningTypeId ?? ""} onChange={(event) => onAssignType(opening.id, event.target.value)} aria-label="Door or Window component type">{opening.wallOpeningTypeId === null ? <option value="" disabled>Legacy custom opening</option> : null}{compatibleTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></PropertyGridRow>
        {componentType ? <PropertyGridRow label="3D assembly"><span className="property-readout">{componentType.components.length} joined components</span></PropertyGridRow> : null}
        {componentType && baseComponent && resolvedComponent ? <>
          <PropertyGridRow label="Assembly part"><select className="property-cell-select" value={baseComponent.id} onChange={(event) => setSelectedComponentId(event.target.value)} aria-label="Placed opening assembly component">{componentType.components.map((component) => <option key={component.id} value={component.id}>{component.name} · {component.role}</option>)}</select></PropertyGridRow>
          <PropertyGridRow label="Part source"><span className="property-readout">{componentOverride ? "Opening override" : "Type default"}</span></PropertyGridRow>
          <WallOpeningComponentMaterialField key={`${opening.id}:${baseComponent.id}:${resolvedComponent.material}`} material={resolvedComponent.material} onUpdate={(material) => updateComponentOverride({ material })} />
          <PropertyGridRow label="Part display"><label className="property-checkbox"><input type="checkbox" checked={resolvedComponent.visible} onChange={(event) => updateComponentOverride({ visible: event.target.checked })} /><span>Visible</span></label></PropertyGridRow>
          <LineCoordinateField label="Part inset" value={resolvedComponent.inset} onCommit={(draft) => updateComponentDimension("inset", draft, true)} />
          <LineCoordinateField label={resolvedComponent.geometry === "panel-grid" ? "Panel gap" : resolvedComponent.geometry.includes("divider") ? "Divider width" : "Profile width"} unsigned value={resolvedComponent.profileWidth} onCommit={(draft) => updateComponentDimension("profileWidth", draft)} />
          <LineCoordinateField label="Part depth" unsigned value={resolvedComponent.depth} onCommit={(draft) => updateComponentDimension("depth", draft)} />
          <PropertyGridRow label="Depth anchor"><select className="property-cell-select" value={resolvedComponent.depthAnchor} onChange={(event) => updateComponentOverride({ depthAnchor: event.target.value as OpeningAssemblyComponent["depthAnchor"] })} aria-label="Placed opening component depth anchor">{OPENING_COMPONENT_DEPTH_ANCHORS.map((anchor) => <option key={anchor} value={anchor}>{titleCase(anchor)} face</option>)}</select></PropertyGridRow>
          <LineCoordinateField label="Depth offset" unsigned value={resolvedComponent.depthOffset} onCommit={(draft) => updateComponentDimension("depthOffset", draft, false, true)} />
          {resolvedComponent.geometry.includes("divider") || resolvedComponent.geometry === "panel-grid" ? <PropertyGridRow label={resolvedComponent.geometry === "panel-grid" ? "Panel count" : "Divider count"}><select className="property-cell-select" value={resolvedComponent.divisionCount} onChange={(event) => updateComponentOverride({ divisionCount: Number(event.target.value) })} aria-label="Placed opening component division count">{[1, 2, 3, 4, 5, 6, 7, 8].map((count) => <option key={count} value={count}>{count}</option>)}</select></PropertyGridRow> : null}
          {componentOverride ? <div className="property-action-row single-action"><button type="button" onClick={resetComponentOverride}>Reset Part to Type</button></div> : null}
        </> : null}
        <LineCoordinateField label="Center from start" unsigned value={opening.centerOffset} onCommit={(draft) => updateDimension("centerOffset", draft)} />
        <PropertyGridRow label="Unit size"><span className="property-readout">{formatArchitectural(opening.unitWidth)} × {formatArchitectural(opening.unitHeight)}</span></PropertyGridRow>
        <PropertyGridRow label="Rough opening"><span className="property-readout">{formatArchitectural(opening.roughWidth)} × {formatArchitectural(opening.roughHeight)}</span></PropertyGridRow>
        {componentType ? <PropertyGridRow label="Finish returns"><span className="property-readout">Ext {formatArchitectural(componentType.exteriorReturnDepth)} · Int {formatArchitectural(componentType.interiorReturnDepth)}</span></PropertyGridRow> : null}
        <PropertyGridRow label="Header override"><select className="property-cell-select" value={opening.headerTypeIdOverride ?? ""} onChange={(event) => onUpdate(opening.id, { headerTypeIdOverride: event.target.value || null })} aria-label="Placed opening header override"><option value="">Automatic · {resolvedHeader?.scheduleMark ?? "—"} {resolvedHeader?.name ?? "No compatible header"}</option>{compatibleHeaders.map((headerType) => <option key={headerType.id} value={headerType.id}>{headerType.scheduleMark} · {headerType.name}{headerType.engineeringRequired ? " · Engineering" : ""}</option>)}</select></PropertyGridRow>
        {resolvedHeader ? <PropertyGridRow label="Resolved header"><span className="property-readout">{resolvedHeader.scheduleMark} · {opening.headerTypeIdOverride ? "Opening override" : componentType?.headerTypeId ? "Component override" : "Wall default"}{resolvedHeader.engineeringRequired ? " · Engineering required" : ""}</span></PropertyGridRow> : null}
        {opening.kind === "window" ? <>
          <LineCoordinateField label="Bottom of header" unsigned value={opening.headerBottomHeight} onCommit={(draft) => updateDimension("headerBottomHeight", draft)} />
          <PropertyGridRow label="Rough sill"><span className="property-readout">{formatArchitectural(opening.headerBottomHeight - opening.roughHeight)}</span></PropertyGridRow>
        </> : <PropertyGridRow label="Bottom of header"><span className="property-readout">{formatArchitectural(opening.headerBottomHeight)}</span></PropertyGridRow>}
        <div className="property-action-row single-action"><button type="button" onClick={() => onDelete(opening.id)}>Delete Opening</button></div>
        <p className="property-grid-note">The reusable Type controls assembly topology, unit size, rough opening, and generated finish returns. Part controls above override only this placed opening; Reset Part to Type restores inheritance. Header priority is placed-opening override, component override, then host Wall default. Window header height remains measured to the bottom of the structural header above the Story subfloor.</p>
      </> : null}
    </PropertyGridSection>
  );
}
