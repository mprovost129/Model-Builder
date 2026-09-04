/**
 * Properties-panel controls for the CAD modify tools.
 *
 * Each control renders the options and exact-entry fields for one tool and
 * reports through callbacks; none of them touch the document directly. They are
 * the panel half of what will become the tool state machine.
 * Extracted from app/model-builder-app.tsx.
 */
import { useState } from "react";
import {
  formatArchitectural,
  formatSignedArchitectural,
  parseArchitectural,
  parseSignedArchitectural,
  snapToSixteenth,
} from "@/lib/architectural-units";
import {
  MAXIMUM_COORDINATE,
  moveBoxFace,
  ROTATION_BASE_DEFINITIONS,
  type AxisKey,
  type BoxModel,
  type RotationBaseKey,
} from "@/lib/box-model";
import type { AlignmentMode } from "@/lib/document-model";
import type { LengthenMethod } from "@/lib/cad-lengthen";
import type { LinePoint } from "@/lib/cad-line";
import type { BreakMode } from "@/features/tools/tool-types";
import { PropertyGridRow, PropertyGridSection } from "@/features/properties/property-fields";

export function MoveObjectControl({
  onMove,
}: {
  onMove: (axis: AxisKey, distance: number) => boolean;
}) {
  const [axis, setAxis] = useState<AxisKey>("x");
  const [draft, setDraft] = useState('6"');
  const [error, setError] = useState("");

  const move = (sign: 1 | -1) => {
    const parsed = parseArchitectural(draft);
    if (parsed === null || parsed <= 0) {
      setError("Enter a positive movement distance.");
      return;
    }
    if (!onMove(axis, snapToSixteenth(parsed) * sign)) {
      setError("That move is outside the supported coordinate range.");
      return;
    }
    setError("");
  };

  return (
    <PropertyGridSection className="move-object-panel" title="Move" meta="Exact offset">
      <PropertyGridRow label="Axis">
        <div className="axis-switch" aria-label="Movement axis">
          {(["x", "y", "z"] as AxisKey[]).map((axisOption) => (
            <button
              key={axisOption}
              type="button"
              className={axis === axisOption ? "is-active" : ""}
              onClick={() => setAxis(axisOption)}
            >
              {axisOption.toUpperCase()}
            </button>
          ))}
        </div>
      </PropertyGridRow>
      <label className="property-table-row property-input-row">
        <span className="property-table-label">Distance</span>
        <div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") move(1);
              if (event.key === "Escape") { setDraft('6"'); setError(""); }
            }}
            aria-invalid={Boolean(error)}
            aria-label="Object movement distance"
            spellCheck={false}
          />
          <span>ft-in</span>
        </div>
        {error ? <small className="property-row-error" role="alert">{error}</small> : null}
      </label>
      <div className="property-action-row move-object-actions">
        <button type="button" onClick={() => move(-1)}>− {axis.toUpperCase()}</button>
        <button type="button" onClick={() => move(1)}>+ {axis.toUpperCase()}</button>
      </div>
      <p className="property-grid-note">Click a base point and target point in the drawing, or apply an exact X, Y, or Z offset here.</p>
    </PropertyGridSection>
  );
}

export function CopyObjectsControl({
  onCopy,
  onFinish,
  selectionCount,
}: {
  onCopy: (axis: AxisKey, distance: number) => boolean;
  onFinish: () => void;
  selectionCount: number;
}) {
  const [axis, setAxis] = useState<AxisKey>("x");
  const [draft, setDraft] = useState('2\'');
  const [error, setError] = useState("");
  const place = (sign: 1 | -1) => {
    const parsed = parseArchitectural(draft);
    if (parsed === null || parsed <= 0) {
      setError("Enter a positive copy distance.");
      return;
    }
    if (!onCopy(axis, snapToSixteenth(parsed) * sign)) {
      setError("That copy cannot be placed there.");
      return;
    }
    setError("");
  };
  return (
    <PropertyGridSection className="copy-object-panel" title="Copy Mode" meta={`${selectionCount} entit${selectionCount === 1 ? "y" : "ies"}`}>
      <PropertyGridRow label="Axis"><div className="axis-switch" aria-label="Copy axis">{(["x", "y", "z"] as AxisKey[]).map((axisOption) => <button key={axisOption} type="button" className={axis === axisOption ? "is-active" : ""} onClick={() => setAxis(axisOption)}>{axisOption.toUpperCase()}</button>)}</div></PropertyGridRow>
      <label className="property-table-row property-input-row"><span className="property-table-label">Offset</span><div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") place(1); if (event.key === "Escape") onFinish(); }} aria-label="Copy offset distance" spellCheck={false} /><span>ft-in</span></div>{error ? <small className="property-row-error" role="alert">{error}</small> : null}</label>
      <div className="property-action-row copy-offset-actions"><button type="button" onClick={() => place(-1)}>Copy −{axis.toUpperCase()}</button><button type="button" onClick={() => place(1)}>Copy +{axis.toUpperCase()}</button></div>
      <div className="property-action-row single-action"><button type="button" onClick={onFinish}>Finish Copy</button></div>
      <p className="property-grid-note">Click a base point and target point in the drawing, or apply an exact X, Y, or Z offset here.</p>
    </PropertyGridSection>
  );
}

export function AlignmentControl({
  anchorName,
  onAlign,
}: {
  anchorName: string;
  onAlign: (axis: AxisKey, mode: AlignmentMode) => void;
}) {
  const [axis, setAxis] = useState<AxisKey>("x");
  const modes: Array<{ label: string; mode: AlignmentMode }> = [
    { label: "Minimum", mode: "minimum" },
    { label: "Center", mode: "center" },
    { label: "Maximum", mode: "maximum" },
  ];
  return (
    <PropertyGridSection className="alignment-panel" title="Align Objects" meta={`Anchor: ${anchorName}`}>
      <PropertyGridRow label="Axis"><div className="axis-switch" aria-label="Alignment axis">{(["x", "y", "z"] as AxisKey[]).map((axisOption) => (
        <button key={axisOption} type="button" className={axis === axisOption ? "is-active" : ""} onClick={() => setAxis(axisOption)}>{axisOption.toUpperCase()}</button>
      ))}</div></PropertyGridRow>
      <div className="property-action-row alignment-actions">
        {modes.map(({ label, mode }) => <button key={mode} type="button" onClick={() => onAlign(axis, mode)}><b>{mode === "minimum" ? "⊣" : mode === "center" ? "↔" : "⊢"}</b><span>{label}</span></button>)}
      </div>
      <p className="property-grid-note">The last-selected object stays fixed and anchors the alignment.</p>
    </PropertyGridSection>
  );
}

export function RotationControl({
  baseKey,
  currentRotation,
  onBaseChange,
  onFinish,
  onRotate,
  onStart,
  rotateMode,
  selectionCount,
}: {
  baseKey: RotationBaseKey;
  currentRotation: string;
  onBaseChange: (baseKey: RotationBaseKey) => void;
  onFinish: () => void;
  onRotate: (degrees: number) => boolean;
  onStart: () => void;
  rotateMode: boolean;
  selectionCount: number;
}) {
  const [draft, setDraft] = useState("90");
  const [error, setError] = useState("");
  const apply = (sign: 1 | -1) => {
    const normalized = draft.trim().replace(/°$/, "");
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
      setError("Enter a positive angle in degrees.");
      return;
    }
    const degrees = Number(normalized);
    if (!Number.isFinite(degrees) || degrees <= 0 || degrees > 3600) {
      setError("Enter an angle from 0° through 3600°.");
      return;
    }
    if (!onRotate(degrees * sign)) {
      setError("That rotation is outside the supported coordinate range.");
      return;
    }
    setError("");
  };
  return (
    <PropertyGridSection className="rotation-panel" title="Rotation" meta="Z axis">
      <PropertyGridRow label="Current"><span className="property-readout">{currentRotation}</span></PropertyGridRow>
      <PropertyGridRow label="Base point">
        <select className="property-cell-select" value={baseKey} onChange={(event) => onBaseChange(event.target.value as RotationBaseKey)} aria-label="Rotation base point">
          {ROTATION_BASE_DEFINITIONS.map((base) => <option key={base.key} value={base.key}>{base.label}</option>)}
        </select>
      </PropertyGridRow>
      <label className="property-table-row property-input-row">
        <span className="property-table-label">Angle</span>
        <div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}>
          <input value={draft} onChange={(event) => { setDraft(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") apply(1); if (event.key === "Escape") { setDraft("90"); setError(""); } }} aria-label="Rotation angle" aria-invalid={Boolean(error)} spellCheck={false} />
          <span>deg</span>
        </div>
        {error ? <small className="property-row-error" role="alert">{error}</small> : null}
      </label>
      <div className="property-action-row rotation-actions"><button type="button" onClick={() => apply(-1)}>↻ Clockwise</button><button type="button" onClick={() => apply(1)}>↺ Counterclockwise</button></div>
      <div className="property-action-row single-action"><button className={rotateMode ? "is-active" : ""} type="button" onClick={rotateMode ? onFinish : onStart}>{rotateMode ? "Finish Freehand Rotation" : "Start Freehand Rotation"}</button></div>
      <p className="property-grid-note">Rotates {selectionCount === 1 ? "the selected entity" : `${selectionCount} selected entities`} around the selected base point. Freehand drag snaps to 15°; hold Shift for 1°.</p>
    </PropertyGridSection>
  );
}

export function ScaleControl({
  baseKey,
  onBaseChange,
  onFinish,
  onScale,
  onStart,
  scaleMode,
  selectionCount,
}: {
  baseKey: RotationBaseKey;
  onBaseChange: (baseKey: RotationBaseKey) => void;
  onFinish: () => void;
  onScale: (factor: number) => boolean;
  onStart: () => void;
  scaleMode: boolean;
  selectionCount: number;
}) {
  const [draft, setDraft] = useState("2");
  const [error, setError] = useState("");
  const apply = () => {
    const factor = Number(draft.trim().replace(/[x×]$/i, ""));
    if (!Number.isFinite(factor) || factor <= 0 || factor > 1000 || Math.abs(factor - 1) < 0.0001) {
      setError("Enter a scale factor above 0 and other than 1.");
      return;
    }
    if (!onScale(factor)) {
      setError("That factor would make the selection too small or place it outside the drawing range.");
      return;
    }
    setError("");
  };
  return (
    <PropertyGridSection className="scale-panel" title="Scale" meta="Uniform plan">
      <PropertyGridRow label="Base point">
        <select className="property-cell-select" value={baseKey} onChange={(event) => onBaseChange(event.target.value as RotationBaseKey)} aria-label="Scale base point">
          {ROTATION_BASE_DEFINITIONS.map((base) => <option key={base.key} value={base.key}>{base.label}</option>)}
        </select>
      </PropertyGridRow>
      <label className="property-table-row property-input-row">
        <span className="property-table-label">Factor</span>
        <div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}>
          <input value={draft} onChange={(event) => { setDraft(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") apply(); if (event.key === "Escape") { setDraft("2"); setError(""); } }} aria-label="Scale factor" aria-invalid={Boolean(error)} spellCheck={false} />
          <span>×</span>
        </div>
        {error ? <small className="property-row-error" role="alert">{error}</small> : null}
      </label>
      <div className="property-action-row single-action"><button type="button" onClick={apply}>Apply Exact Scale</button></div>
      <div className="property-action-row single-action"><button className={scaleMode ? "is-active" : ""} type="button" onClick={scaleMode ? onFinish : onStart}>{scaleMode ? "Finish Freehand Scale" : "Start Freehand Scale"}</button></div>
      <p className="property-grid-note">Scales {selectionCount === 1 ? "the selected entity" : `${selectionCount} selected entities`} uniformly in plan around the selected base point. Box height and drawing elevation stay unchanged.</p>
    </PropertyGridSection>
  );
}

export function MirrorControl({
  keepSource,
  mirrorMode,
  onFinish,
  onKeepSourceChange,
  onQuickMirror,
  onStart,
  selectionCount,
}: {
  keepSource: boolean;
  mirrorMode: boolean;
  onFinish: () => void;
  onKeepSourceChange: (keepSource: boolean) => void;
  onQuickMirror: (orientation: "horizontal" | "vertical") => boolean;
  onStart: () => void;
  selectionCount: number;
}) {
  return (
    <PropertyGridSection className="mirror-panel" title="Mirror" meta="Two-point axis">
      <PropertyGridRow label="Keep source">
        <label className="property-checkbox"><input type="checkbox" checked={keepSource} onChange={(event) => onKeepSourceChange(event.target.checked)} /><span>{keepSource ? "Yes — create mirrored copies" : "No — replace selection"}</span></label>
      </PropertyGridRow>
      <div className="property-action-row rotation-actions"><button type="button" onClick={() => onQuickMirror("vertical")}>↔ Vertical Axis</button><button type="button" onClick={() => onQuickMirror("horizontal")}>↕ Horizontal Axis</button></div>
      <div className="property-action-row single-action"><button className={mirrorMode ? "is-active" : ""} type="button" onClick={mirrorMode ? onFinish : onStart}>{mirrorMode ? "Cancel Mirror" : "Pick Mirror Axis"}</button></div>
      <p className="property-grid-note">Mirrors {selectionCount === 1 ? "the selected entity" : `${selectionCount} selected entities`}. Pick two snapped points for any axis, or use a centered horizontal or vertical axis.</p>
    </PropertyGridSection>
  );
}

export function OffsetControl({
  distance,
  keepSource,
  offsetMode,
  onDistanceChange,
  onFinish,
  onKeepSourceChange,
  onStart,
}: {
  distance: number;
  keepSource: boolean;
  offsetMode: boolean;
  onDistanceChange: (distance: number) => void;
  onFinish: () => void;
  onKeepSourceChange: (keepSource: boolean) => void;
  onStart: () => void;
}) {
  const [draft, setDraft] = useState(() => formatArchitectural(distance));
  const [error, setError] = useState("");
  const applyDistance = () => {
    const parsed = parseArchitectural(draft);
    if (parsed === null || parsed < 1 / 16) {
      setError("Enter a positive offset distance of at least 1/16 inch.");
      return;
    }
    onDistanceChange(snapToSixteenth(parsed));
    setDraft(formatArchitectural(snapToSixteenth(parsed)));
    setError("");
  };
  return (
    <PropertyGridSection className="offset-panel" title="Offset" meta="Selected 2D entity">
      <label className="property-table-row property-input-row">
        <span className="property-table-label">Distance</span>
        <div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}>
          <input value={draft} onChange={(event) => { setDraft(event.target.value); setError(""); }} onBlur={applyDistance} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setDraft(formatArchitectural(distance)); setError(""); event.currentTarget.blur(); } }} aria-label="Offset distance" aria-invalid={Boolean(error)} spellCheck={false} />
          <span>ft-in</span>
        </div>
        {error ? <small className="property-row-error" role="alert">{error}</small> : null}
      </label>
      <PropertyGridRow label="Keep source">
        <label className="property-checkbox"><input type="checkbox" checked={keepSource} onChange={(event) => onKeepSourceChange(event.target.checked)} /><span>{keepSource ? "Yes — create offset copy" : "No — replace source"}</span></label>
      </PropertyGridRow>
      <div className="property-action-row single-action"><button className={offsetMode ? "is-active" : ""} type="button" onClick={offsetMode ? onFinish : onStart}>{offsetMode ? "Cancel Offset" : "Pick Offset Side"}</button></div>
      <p className="property-grid-note">Click the side where the new Line, Polyline, Rectangle, Circle, or Arc should be created. Curves remain native editable curves.</p>
    </PropertyGridSection>
  );
}

export function TrimExtendControl({
  canExtend,
  extendMode,
  onExtend,
  onFinish,
  onTrim,
  trimMode,
}: {
  canExtend: boolean;
  extendMode: boolean;
  onExtend: () => void;
  onFinish: () => void;
  onTrim: () => void;
  trimMode: boolean;
}) {
  return (
    <PropertyGridSection className="trim-extend-panel" title="Trim & Extend" meta="Quick boundaries">
      <div className="property-action-row rotation-actions">
        <button className={trimMode ? "is-active" : ""} type="button" onClick={trimMode ? onFinish : onTrim}>{trimMode ? "Cancel Trim" : "Start Trim"}</button>
        <button className={extendMode ? "is-active" : ""} type="button" onClick={extendMode ? onFinish : onExtend} disabled={!canExtend}>{extendMode ? "Cancel Extend" : "Start Extend"}</button>
      </div>
      <p className="property-grid-note">Every other visible 2D entity acts as a boundary. Trim removes the portion you click; Extend moves the nearest open endpoint to the first boundary.</p>
    </PropertyGridSection>
  );
}

export function BreakControl({ mode, onCancel, stage }: { mode: BreakMode; onCancel: () => void; stage: 0 | 1 | 2 }) {
  const next = stage === 0 ? "Select curve" : stage === 1 ? "Select break point" : "Select second point";
  return (
    <PropertyGridSection className="break-panel" title={mode === "break" ? "Break" : "Break at Point"} meta="Native curve edit">
      <PropertyGridRow label="Method"><span className="property-readout">{mode === "break" ? "Remove between two points" : "Split at one point"}</span></PropertyGridRow>
      <PropertyGridRow label="Next"><span className="property-readout is-active">{next}</span></PropertyGridRow>
      <div className="property-action-row single-action"><button className="is-active" type="button" onClick={onCancel}>Cancel {mode === "break" ? "Break" : "Break at Point"}</button></div>
      <p className="property-grid-note">The resulting pieces remain editable Lines, Polylines, or Arcs. Escape cancels and restores the source.</p>
    </PropertyGridSection>
  );
}

export function JoinControl({ onJoin, roofPlanes = false, selectionCount }: { onJoin: () => boolean; roofPlanes?: boolean; selectionCount: number }) {
  return (
    <PropertyGridSection className="join-panel" title="Join" meta={roofPlanes ? "Roof surfaces" : "Endpoint chain"}>
      <PropertyGridRow label="Selected"><span className="property-readout">{selectionCount} {roofPlanes ? "Roof Planes" : "open curves"}</span></PropertyGridRow>
      <div className="property-action-row single-action"><button type="button" onClick={onJoin}>Join Selected {roofPlanes ? "Roofs" : "Curves"}</button></div>
      <p className="property-grid-note">{roofPlanes ? "Trims both planes to their exact 3D surface intersection and derives the shared ridge, hip, valley, or transition edge for future takeoff." : "Creates one native Line, Arc, Circle, or Polyline when the selected endpoints form one unbranched chain at a common elevation."}</p>
    </PropertyGridSection>
  );
}

export function ExplodeControl({
  hasWidth,
  onExplode,
  segmentCount,
  selectionCount,
}: {
  hasWidth: boolean;
  onExplode: () => boolean;
  segmentCount: number;
  selectionCount: number;
}) {
  return (
    <PropertyGridSection className="explode-panel" title="Explode" meta="Native segments">
      <PropertyGridRow label="Selected"><span className="property-readout">{selectionCount} {selectionCount === 1 ? "Polyline" : "Polylines"}</span></PropertyGridRow>
      <PropertyGridRow label="Result"><span className="property-readout">{segmentCount} editable Lines / Arcs</span></PropertyGridRow>
      <div className="property-action-row single-action"><button type="button" onClick={onExplode}>Explode Selected Geometry</button></div>
      <p className="property-grid-note">Each straight or curved segment becomes an independent native entity on the source layer.{hasWidth ? " Constant Polyline width will be removed because Lines and Arcs do not store width." : ""}</p>
    </PropertyGridSection>
  );
}

export function LengthenControl({
  method,
  mode,
  onFinish,
  onMethodChange,
  onStart,
  onValueChange,
  value,
}: {
  method: LengthenMethod;
  mode: boolean;
  onFinish: () => void;
  onMethodChange: (method: LengthenMethod) => void;
  onStart: () => void;
  onValueChange: (value: number) => void;
  value: number;
}) {
  const formatValue = () => method === "percent" ? String(value) : formatSignedArchitectural(value);
  const [draft, setDraft] = useState(formatValue);
  const [error, setError] = useState("");
  const applyValue = () => {
    const parsed = method === "percent" ? Number(draft.trim()) : method === "delta" ? parseSignedArchitectural(draft) : parseArchitectural(draft);
    if (parsed === null || !Number.isFinite(parsed) || (method === "delta" ? parsed === 0 : parsed <= 0)) {
      setError(method === "percent" ? "Enter a positive percentage." : method === "delta" ? "Enter a nonzero signed distance." : "Enter a positive total length.");
      return;
    }
    const normalized = method === "percent" ? Math.round(parsed * 1000) / 1000 : snapToSixteenth(parsed);
    onValueChange(normalized);
    setDraft(method === "percent" ? String(normalized) : formatSignedArchitectural(normalized));
    setError("");
  };
  return (
    <PropertyGridSection className="lengthen-panel" title="Lengthen" meta="Open curve endpoint">
      <label className="property-table-row"><span className="property-table-label">Method</span><select className="property-table-value property-select" value={method} onChange={(event) => { const next = event.target.value as LengthenMethod; onMethodChange(next); setError(""); }} aria-label="Lengthen method"><option value="delta">Delta</option><option value="total">Total</option><option value="percent">Percent</option><option value="dynamic">Dynamic</option></select></label>
      {method !== "dynamic" ? <label className="property-table-row property-input-row"><span className="property-table-label">{method === "percent" ? "Percent" : method === "delta" ? "Length change" : "Total length"}</span><div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}><input value={draft} onChange={(event) => { setDraft(event.target.value); setError(""); }} onBlur={applyValue} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} aria-label="Lengthen value" spellCheck={false} /><span>{method === "percent" ? "%" : "ft-in"}</span></div>{error ? <small className="property-row-error" role="alert">{error}</small> : null}</label> : null}
      <div className="property-action-row single-action"><button className={mode ? "is-active" : ""} type="button" onClick={mode ? onFinish : onStart}>{mode ? "Cancel Lengthen" : "Start Lengthen"}</button></div>
      <p className="property-grid-note">Pick the curve near the endpoint to change. Delta adds or removes length, Total sets the full curve length, Percent scales the full length, and Dynamic follows the cursor while preserving the terminal direction or arc radius.</p>
    </PropertyGridSection>
  );
}

export function FilletControl({
  canApplyPolyline,
  mode,
  onApplyPolyline,
  onCancel,
  onRadiusChange,
  radius,
  stage,
}: {
  canApplyPolyline: boolean;
  mode: boolean;
  onApplyPolyline: (radius: number) => void;
  onCancel: () => void;
  onRadiusChange: (radius: number) => void;
  radius: number;
  stage: 0 | 1;
}) {
  const [draft, setDraft] = useState(() => formatArchitectural(radius));
  const [error, setError] = useState("");
  const apply = (): number | null => {
    const parsed = parseSignedArchitectural(draft);
    if (parsed === null || parsed < 0 || parsed > MAXIMUM_COORDINATE) {
      setError("Enter zero or a positive architectural radius.");
      return null;
    }
    const snapped = snapToSixteenth(parsed);
    onRadiusChange(snapped);
    setDraft(formatArchitectural(snapped));
    setError("");
    return snapped;
  };
  return (
    <PropertyGridSection className="fillet-panel" title="Fillet" meta="Curves or Polyline">
      <label className="property-table-row property-input-row">
        <span className="property-table-label">Radius</span>
        <div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}>
          <input value={draft} onChange={(event) => { setDraft(event.target.value); setError(""); }} onBlur={apply} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setDraft(formatArchitectural(radius)); setError(""); } }} aria-label="Fillet radius" aria-invalid={Boolean(error)} spellCheck={false} />
          <span>ft-in</span>
        </div>
        {error ? <small className="property-row-error" role="alert">{error}</small> : null}
      </label>
      <PropertyGridRow label="Next pick"><span className="property-readout">{stage === 0 ? "First curve" : "Second curve"}</span></PropertyGridRow>
      <div className="property-action-row"><button type="button" onClick={() => { const next = apply(); if (next !== null) onApplyPolyline(next); }} disabled={!canApplyPolyline}>Fillet Polyline</button><button className={mode ? "is-active" : ""} type="button" onClick={onCancel}>Cancel Fillet</button></div>
      <p className="property-grid-note">Pick the retained sides of two Lines or Arcs, or apply the radius to every valid corner of one selected straight-segment Polyline. Open endpoints stay fixed. The complete edit is one Undo step.</p>
    </PropertyGridSection>
  );
}

export function ChamferControl({
  canApplyPolyline,
  firstDistance,
  mode,
  onApplyPolyline,
  onCancel,
  onDistanceChange,
  secondDistance,
  stage,
}: {
  canApplyPolyline: boolean;
  firstDistance: number;
  mode: boolean;
  onApplyPolyline: (first: number, second: number) => void;
  onCancel: () => void;
  onDistanceChange: (first: number, second: number) => void;
  secondDistance: number;
  stage: 0 | 1;
}) {
  const [firstDraft, setFirstDraft] = useState(() => formatArchitectural(firstDistance));
  const [secondDraft, setSecondDraft] = useState(() => formatArchitectural(secondDistance));
  const [error, setError] = useState("");
  const apply = (): { first: number; second: number } | null => {
    const first = parseSignedArchitectural(firstDraft);
    const second = parseSignedArchitectural(secondDraft);
    if (first === null || second === null || first < 0 || second < 0 || first > MAXIMUM_COORDINATE || second > MAXIMUM_COORDINATE) {
      setError("Enter zero or positive architectural distances.");
      return null;
    }
    const nextFirst = snapToSixteenth(first);
    const nextSecond = snapToSixteenth(second);
    onDistanceChange(nextFirst, nextSecond);
    setFirstDraft(formatArchitectural(nextFirst));
    setSecondDraft(formatArchitectural(nextSecond));
    setError("");
    return { first: nextFirst, second: nextSecond };
  };
  const restore = () => {
    setFirstDraft(formatArchitectural(firstDistance));
    setSecondDraft(formatArchitectural(secondDistance));
    setError("");
  };
  const distanceField = (label: string, value: string, setValue: (value: string) => void, ariaLabel: string) => (
    <label className="property-table-row property-input-row">
      <span className="property-table-label">{label}</span>
      <div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}>
        <input value={value} onChange={(event) => { setValue(event.target.value); setError(""); }} onBlur={apply} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") restore(); }} aria-label={ariaLabel} aria-invalid={Boolean(error)} spellCheck={false} />
        <span>ft-in</span>
      </div>
    </label>
  );
  return (
    <PropertyGridSection className="chamfer-panel" title="Chamfer" meta="Lines or Polyline">
      {distanceField("First distance", firstDraft, setFirstDraft, "Chamfer first distance")}
      {distanceField("Second distance", secondDraft, setSecondDraft, "Chamfer second distance")}
      {error ? <small className="property-row-error" role="alert">{error}</small> : null}
      <PropertyGridRow label="Next pick"><span className="property-readout">{stage === 0 ? "First Line" : "Second Line"}</span></PropertyGridRow>
      <div className="property-action-row"><button type="button" onClick={() => { const next = apply(); if (next) onApplyPolyline(next.first, next.second); }} disabled={!canApplyPolyline}>Chamfer Polyline</button><button className={mode ? "is-active" : ""} type="button" onClick={onCancel}>Cancel Chamfer</button></div>
      <p className="property-grid-note">The distances follow the selected path order. Pick two Lines, or apply both setbacks to every valid corner of one selected straight-segment Polyline. Open endpoints stay fixed. The complete edit is one Undo step.</p>
    </PropertyGridSection>
  );
}

export function StretchControl({
  onApply,
  onCancel,
  targetCount,
}: {
  onApply: (delta: LinePoint) => boolean;
  onCancel: () => void;
  targetCount: number;
}) {
  const [xDraft, setXDraft] = useState("0");
  const [yDraft, setYDraft] = useState("0");
  const [error, setError] = useState("");
  const apply = () => {
    const x = parseSignedArchitectural(xDraft);
    const y = parseSignedArchitectural(yDraft);
    if (x === null || y === null || (Math.abs(x) < 1 / 16 && Math.abs(y) < 1 / 16)) {
      setError("Enter a nonzero signed X or Y displacement.");
      return;
    }
    if (!onApply({ x: snapToSixteenth(x), y: snapToSixteenth(y), z: 0 })) {
      setError("That displacement would create invalid geometry.");
      return;
    }
    setError("");
  };
  return (
    <PropertyGridSection className="stretch-panel" title="Stretch" meta={`${targetCount} target${targetCount === 1 ? "" : "s"}`}>
      <PropertyGridRow label="X displacement"><input value={xDraft} onChange={(event) => { setXDraft(event.target.value); setError(""); }} aria-label="Stretch X displacement" spellCheck={false} /></PropertyGridRow>
      <PropertyGridRow label="Y displacement"><input value={yDraft} onChange={(event) => { setYDraft(event.target.value); setError(""); }} aria-label="Stretch Y displacement" spellCheck={false} /></PropertyGridRow>
      <div className="property-action-row rotation-actions">
        <button type="button" onClick={apply}>Apply exact</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
      {error ? <p className="property-grid-note field-error-text">{error}</p> : null}
      <p className="property-grid-note">Click a base point and target point in the drawing, or enter signed X/Y displacements here.</p>
    </PropertyGridSection>
  );
}

export function ExactMoveControl({
  model,
  onCommit,
  selectedFaceIndex,
}: {
  model: BoxModel;
  onCommit: (next: BoxModel) => void;
  selectedFaceIndex: number | null;
}) {
  const [direction, setDirection] = useState<"pull" | "push">("pull");
  const [draft, setDraft] = useState('6"');
  const [error, setError] = useState("");

  const apply = () => {
    if (selectedFaceIndex === null) return;
    const parsed = parseArchitectural(draft);
    if (parsed === null || parsed <= 0) {
      setError("Enter a positive movement distance.");
      return;
    }
    const signedDistance = direction === "pull" ? parsed : -parsed;
    const next = moveBoxFace(model, selectedFaceIndex, signedDistance);
    if (!next) {
      setError("That push would make the box too small.");
      return;
    }
    setError("");
    onCommit(next);
  };

  return (
    <PropertyGridSection className="push-pull-panel" title="Push / Pull" meta="Opposite face fixed">
      <PropertyGridRow label="Direction">
        <div className="direction-switch" aria-label="Movement direction">
          <button
            type="button"
            className={direction === "pull" ? "is-active" : ""}
            onClick={() => setDirection("pull")}
          >
            Pull
          </button>
          <button
            type="button"
            className={direction === "push" ? "is-active" : ""}
            onClick={() => setDirection("push")}
          >
            Push
          </button>
        </div>
      </PropertyGridRow>
      <label className="property-table-row property-input-row">
        <span className="property-table-label">Distance</span>
        <div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") apply();
              if (event.key === "Escape") { setDraft('6"'); setError(""); }
            }}
            disabled={selectedFaceIndex === null}
            aria-invalid={Boolean(error)}
            aria-label="Exact push or pull distance"
            spellCheck={false}
          />
          <span>ft-in</span>
        </div>
        {error ? <small className="property-row-error" role="alert">{error}</small> : null}
      </label>
      <div className="property-action-row single-action"><button className="apply-move" type="button" onClick={apply} disabled={selectedFaceIndex === null}>Apply {direction}</button></div>
      <p className="property-grid-note">{selectedFaceIndex === null ? "Select a face to enable movement." : "Drag the highlighted face or apply an exact distance."}</p>
    </PropertyGridSection>
  );
}
