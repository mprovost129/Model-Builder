/**
 * Primitive Properties-panel fields.
 *
 * Presentational input components with no dependency on the editor's state:
 * each takes a value and an onCommit callback and owns only its own draft text
 * and error flag. Extracted from app/model-builder-app.tsx.
 */
import { useState, type ReactNode } from "react";
import {
  formatArchitectural,
  formatSignedArchitectural,
  parseArchitectural,
  parseSignedArchitectural,
  snapToSixteenth,
} from "@/lib/architectural-units";
import { MAXIMUM_COORDINATE, type AxisKey, type DimensionKey } from "@/lib/box-model";

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  length: "Length (X)",
  width: "Width (Y)",
  height: "Height (Z)",
};

export function PropertyGridSection({
  ariaLabel,
  children,
  className = "",
  meta,
  title,
}: {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  meta?: string;
  title: string;
}) {
  return (
    <details className={`property-grid-section ${className}`.trim()} open aria-label={ariaLabel}>
      <summary>
        <span className="property-disclosure" aria-hidden="true">▾</span>
        <strong>{title}</strong>
        {meta ? <small>{meta}</small> : null}
      </summary>
      <div className="property-grid-body">{children}</div>
    </details>
  );
}

export function PropertyGridRow({
  children,
  className = "",
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div className={`property-table-row ${className}`.trim()}>
      <span className="property-table-label">{label}</span>
      <div className="property-table-value">{children}</div>
    </div>
  );
}

export function DimensionField({
  dimensionKey,
  value,
  onCommit,
}: {
  dimensionKey: DimensionKey;
  value: number;
  onCommit: (key: DimensionKey, value: number) => void;
}) {
  const [draft, setDraft] = useState(formatArchitectural(value));
  const [error, setError] = useState("");

  const commit = () => {
    const parsed = parseArchitectural(draft);
    if (parsed === null || parsed <= 0) {
      setError("Enter a dimension greater than 0\".");
      return;
    }
    setError("");
    onCommit(dimensionKey, snapToSixteenth(parsed));
  };

  return (
    <label className="property-table-row property-input-row">
      <span className="property-table-label">{DIMENSION_LABELS[dimensionKey]}</span>
      <div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") { commit(); event.currentTarget.blur(); }
            if (event.key === "Escape") {
              setDraft(formatArchitectural(value));
              setError("");
              event.currentTarget.blur();
            }
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${dimensionKey}-error` : undefined}
          spellCheck={false}
        />
        <span>ft-in</span>
      </div>
      {error ? <small className="property-row-error" id={`${dimensionKey}-error`} role="alert">{error}</small> : null}
    </label>
  );
}

export function ArchitecturalPropertyField({
  allowNegative = false,
  allowZero = false,
  label,
  onCommit,
  value,
}: {
  allowNegative?: boolean;
  allowZero?: boolean;
  label: string;
  onCommit: (value: number) => void;
  value: number;
}) {
  const formatValue = allowNegative ? formatSignedArchitectural : formatArchitectural;
  const [draft, setDraft] = useState(formatValue(value));
  const [error, setError] = useState(false);
  const commit = () => {
    const parsed = allowNegative ? parseSignedArchitectural(draft) : parseArchitectural(draft);
    if (parsed === null || Math.abs(parsed) > MAXIMUM_COORDINATE || (!allowNegative && (allowZero ? parsed < 0 : parsed <= 0))) {
      setError(true);
      return;
    }
    setError(false);
    onCommit(snapToSixteenth(parsed));
  };
  return (
    <label className="property-table-row property-input-row">
      <span className="property-table-label">{label}</span>
      <div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}>
        <input value={draft} onChange={(event) => { setDraft(event.target.value); setError(false); }} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setDraft(formatValue(value)); setError(false); event.currentTarget.blur(); } }} aria-label={label} spellCheck={false} />
        <span>ft-in</span>
      </div>
    </label>
  );
}

export function NumberPropertyField({ label, max, min, onCommit, step = 0.0625, value }: { label: string; max: number; min: number; onCommit: (value: number) => void; step?: number; value: number }) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState(false);
  const commit = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) { setError(true); return; }
    setError(false);
    onCommit(snapToSixteenth(parsed));
  };
  return <label className="property-table-row property-input-row"><span className="property-table-label">{label}</span><div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}><input type="number" min={min} max={max} step={step} value={draft} onChange={(event) => { setDraft(event.target.value); setError(false); }} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setDraft(String(value)); setError(false); event.currentTarget.blur(); } }} aria-label={label} /><span>:12</span></div></label>;
}

export function RoofPlaneFasciaMatchControl({
  onMatch,
  options,
}: {
  onMatch: (roofPlaneId: string) => void;
  options: { fasciaTopElevation: number; id: string; name: string }[];
}) {
  const [sourceId, setSourceId] = useState(options[0]?.id ?? "");
  if (!options.length) return <PropertyGridRow label="Match fascia"><span className="property-readout">Create another Roof Plane first</span></PropertyGridRow>;
  return (
    <PropertyGridRow label="Match fascia">
      <span className="roof-fascia-match-field">
        <select className="property-cell-select" value={sourceId} onChange={(event) => setSourceId(event.target.value)} aria-label="Roof Plane to match">
          {options.map((option) => <option key={option.id} value={option.id}>{option.name} · {formatSignedArchitectural(option.fasciaTopElevation)}</option>)}
        </select>
        <button type="button" onClick={() => onMatch(sourceId)}>Match</button>
      </span>
    </PropertyGridRow>
  );
}

export function PositionField({
  axis,
  onCommit,
  value,
}: {
  axis: AxisKey;
  onCommit: (axis: AxisKey, value: number) => void;
  value: number;
}) {
  const [draft, setDraft] = useState(formatSignedArchitectural(value));
  const [error, setError] = useState("");

  const commit = () => {
    const parsed = parseSignedArchitectural(draft);
    if (parsed === null || Math.abs(parsed) > MAXIMUM_COORDINATE) {
      setError("Enter a valid signed architectural coordinate.");
      return;
    }
    setError("");
    onCommit(axis, snapToSixteenth(parsed));
  };

  return (
    <label className="property-table-row property-input-row">
      <span className="property-table-label">{axis.toUpperCase()}</span>
      <div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") { commit(); event.currentTarget.blur(); }
            if (event.key === "Escape") {
              setDraft(formatSignedArchitectural(value));
              setError("");
              event.currentTarget.blur();
            }
          }}
          aria-label={`${axis.toUpperCase()} position`}
          aria-invalid={Boolean(error)}
          spellCheck={false}
        />
        <span>ft-in</span>
      </div>
      {error ? <small className="property-row-error" role="alert">{error}</small> : null}
    </label>
  );
}

export function LineCoordinateField({ label, onCommit, unsigned = false, value }: { label: string; onCommit: (draft: string) => boolean; unsigned?: boolean; value: number }) {
  const formatValue = unsigned ? formatArchitectural : formatSignedArchitectural;
  const [draft, setDraft] = useState(formatValue(value));
  const [error, setError] = useState(false);
  const commit = () => {
    if (!onCommit(draft)) {
      setDraft(formatValue(value));
      setError(true);
      return;
    }
    setError(false);
  };
  return (
    <label className="property-table-row property-input-row"><span className="property-table-label">{label}</span><div className={error ? "property-table-value field-shell field-error" : "property-table-value field-shell"}><input value={draft} onChange={(event) => { setDraft(event.target.value); setError(false); }} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setDraft(formatValue(value)); setError(false); event.currentTarget.blur(); } }} aria-label={`${label} coordinate`} spellCheck={false} /><span>ft-in</span></div></label>
  );
}
