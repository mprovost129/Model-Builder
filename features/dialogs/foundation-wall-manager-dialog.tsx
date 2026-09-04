/**
 * Foundation Wall Type manager and the dimensioned section diagram it draws.
 * Extracted from app/model-builder-app.tsx.
 */
import { useEffect, useState } from "react";
import { StoryDimensionInput } from "@/features/dialogs/assembly-editor";
import { FOUNDATION_CONDITION_LABELS } from "@/features/properties/building-labels";
import { formatArchitectural, formatSignedArchitectural, parseArchitectural, snapToSixteenth } from "@/lib/architectural-units";
import {
  buildingStructureIsValid, cloneBuildingStructure, cloneFoundationWallType,
  FOUNDATION_WALL_CONDITIONS, foundationConditionPlateDefaults, foundationSillStackHeight,
  type BuildingStructure, type FoundationWallCondition, type FoundationWallType,
} from "@/lib/building-stories";

function nextFoundationWallTypeId(building: BuildingStructure): string {
  let number = 1;
  const ids = new Set(building.foundationWallTypes.map((type) => type.id));
  while (ids.has(`foundation-wall-type-${String(number).padStart(2, "0")}`)) number += 1;
  return `foundation-wall-type-${String(number).padStart(2, "0")}`;
}

function FoundationDiagramDimension({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  const [draft, setDraft] = useState(() => formatArchitectural(value));
  const [error, setError] = useState(false);
  const commit = () => {
    const parsed = parseArchitectural(draft);
    if (parsed === null || parsed <= 0) {
      setError(true);
      return;
    }
    setError(false);
    onChange(snapToSixteenth(parsed));
  };
  return (
    <div className={error ? "foundation-diagram-input is-error" : "foundation-diagram-input"}>
      <span>{label}</span>
      <input
        aria-label={`${label} in section diagram`}
        value={draft}
        onChange={(event) => { setDraft(event.target.value); setError(false); }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") { setDraft(formatArchitectural(value)); setError(false); event.currentTarget.blur(); }
        }}
        spellCheck={false}
      />
    </div>
  );
}

function FoundationSectionDiagram({
  onFootingChange,
  onSillChange,
  onWallHeightChange,
  onWallWidthChange,
  type,
}: {
  onFootingChange: (change: Partial<FoundationWallType["footing"]>) => void;
  onSillChange: (change: Partial<FoundationWallType["sill"]>) => void;
  onWallHeightChange: (wallHeight: number) => void;
  onWallWidthChange: (wallWidth: number) => void;
  type: FoundationWallType;
}) {
  const maximumWidth = Math.max(type.wallWidth, type.sill.plateWidth, type.footing.enabled ? type.footing.width : 0, 18);
  const horizontalScale = 205 / maximumWidth;
  const verticalScale = Math.min(2.4, 240 / type.wallHeight);
  const centerX = 185;
  const wallWidth = Math.max(8, type.wallWidth * horizontalScale);
  const wallTop = 152 - Math.max(-34, Math.min(34, type.topOffset * 1.5));
  const wallBottom = wallTop + Math.max(24, type.wallHeight * verticalScale);
  const footingHeight = type.footing.enabled ? Math.max(10, Math.min(60, type.footing.height * verticalScale)) : 0;
  const footingTop = wallBottom;
  const footingBottom = footingTop + footingHeight;
  const wallX = centerX - wallWidth / 2;
  const plateHeight = Math.max(6, Math.min(22, type.sill.plateHeight * verticalScale));
  const plateStackHeight = plateHeight * type.sill.foundationPlateCount;
  const plateTop = wallTop - plateStackHeight;
  const plateWidth = Math.max(8, type.sill.plateWidth * horizontalScale);
  const plateX = Math.max(18, Math.min(374 - plateWidth, wallX + type.sill.exteriorSetback * horizontalScale));
  const rawFootingWidth = type.footing.width * horizontalScale;
  const footingWidth = Math.max(wallWidth, Math.min(300, rawFootingWidth));
  const rawFootingX = centerX + type.footing.centerOffset * horizontalScale - footingWidth / 2;
  const footingX = Math.max(18, Math.min(392 - footingWidth, rawFootingX));
  const floorHeight = 48;
  const floorY = plateTop - floorHeight;
  const floorX = plateX;
  const floorWidth = Math.max(30, 397 - floorX);
  const wallDimensionY = Math.min(wallBottom - 52, wallTop + 105);

  return (
    <svg className="foundation-section-svg" viewBox="0 0 420 490" role="img" aria-labelledby="foundation-section-title foundation-section-description">
      <title id="foundation-section-title">Editable Foundation Wall support section</title>
      <desc id="foundation-section-description">A proportional section through the concrete wall, sill plates, floor platform, and continuous footing. Dimension fields in the drawing edit the same values as the form.</desc>
      <defs>
        <pattern id="foundation-concrete-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" className="foundation-svg-concrete-fill" />
          <circle cx="4" cy="5" r="1.3" className="foundation-svg-concrete-stone" />
          <circle cx="15" cy="13" r="1" className="foundation-svg-concrete-stone" />
          <path d="M0 18L7 14M13 3L20 0" className="foundation-svg-concrete-mark" />
        </pattern>
        <pattern id="foundation-floor-pattern" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="12" height="12" className="foundation-svg-floor-fill" />
          <line x1="0" y1="0" x2="0" y2="12" className="foundation-svg-floor-line" />
        </pattern>
        <marker id="foundation-dimension-arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
          <path d="M0,3 L6,0 L6,6 Z" className="foundation-svg-dimension-arrow" />
        </marker>
      </defs>

      <path d={`M18 ${Math.min(285, wallTop + 65)} H${Math.max(18, wallX - 5)} M18 ${Math.min(285, wallTop + 65)} L18 430`} className="foundation-svg-grade" />
      <text x="22" y={Math.min(279, wallTop + 59)} className="foundation-svg-note">EXTERIOR GRADE</text>
      <line x1="18" y1="102" x2="397" y2="102" className="foundation-svg-datum" />
      <text x="22" y="96" className="foundation-svg-note">PROJECT FOUNDATION TOP DATUM · OFFSET {formatSignedArchitectural(type.topOffset)}</text>

      <rect x={floorX} y={floorY} width={floorWidth} height={floorHeight} rx="1" fill="url(#foundation-floor-pattern)" className="foundation-svg-floor" />
      <rect x={floorX} y={floorY} width={floorWidth} height="7" className="foundation-svg-subfloor" />
      <text x={floorX + floorWidth / 2} y={floorY + 29} textAnchor="middle" className="foundation-svg-component-label">FLOOR PLATFORM</text>
      <line x1={floorX} y1={floorY - 7} x2={floorX} y2={floorY + floorHeight + 6} className="foundation-svg-stop-edge" />
      <text x={Math.min(392, floorX + 7)} y={floorY - 11} className="foundation-svg-stop-label">FLOOR STOP EDGE</text>

      {Array.from({ length: type.sill.foundationPlateCount }, (_, index) => (
        <rect key={index} x={plateX} y={wallTop - plateHeight * (index + 1)} width={plateWidth} height={plateHeight} className="foundation-svg-lumber" />
      ))}
      {Array.from({ length: type.sill.upperWallBottomPlateCount }, (_, index) => (
        <rect key={index} x={plateX} y={floorY - plateHeight * (index + 1)} width={plateWidth} height={plateHeight} className="foundation-svg-lumber foundation-svg-upper-wall-plate" />
      ))}
      {type.sill.upperWallBottomPlateCount ? <text x={plateX + plateWidth / 2} y={Math.max(10, floorY - plateHeight * type.sill.upperWallBottomPlateCount - 5)} textAnchor="middle" className="foundation-svg-upper-wall-label">FRAMED-WALL PLATE</text> : null}
      <rect x={wallX} y={wallTop} width={wallWidth} height={Math.max(24, wallBottom - wallTop)} fill="url(#foundation-concrete-pattern)" className="foundation-svg-concrete" />
      {type.footing.enabled ? <rect x={footingX} y={footingTop} width={footingWidth} height={footingHeight} fill="url(#foundation-concrete-pattern)" className="foundation-svg-concrete foundation-svg-footing" /> : null}
      <line x1={centerX} y1={wallTop - 8} x2={centerX} y2={footingBottom + 10} className="foundation-svg-centerline" />
      <text x={centerX} y={(wallTop + wallBottom) / 2} textAnchor="middle" className="foundation-svg-material-label">{type.material}</text>

      <line x1={plateX} y1={plateTop - 11} x2={plateX + plateWidth} y2={plateTop - 11} className="foundation-svg-dimension" markerStart="url(#foundation-dimension-arrow)" markerEnd="url(#foundation-dimension-arrow)" />
      <line x1={plateX} y1={plateTop - 17} x2={plateX} y2={plateTop - 3} className="foundation-svg-extension" />
      <line x1={plateX + plateWidth} y1={plateTop - 17} x2={plateX + plateWidth} y2={plateTop - 3} className="foundation-svg-extension" />
      <foreignObject x="294" y="24" width="116" height="47"><FoundationDiagramDimension key={`${type.id}:diagram-pw:${type.sill.plateWidth}`} label="Sill plate width" value={type.sill.plateWidth} onChange={(plateWidth) => onSillChange({ plateWidth })} /></foreignObject>

      <line x1={Math.max(8, plateX - 12)} y1={plateTop} x2={Math.max(8, plateX - 12)} y2={wallTop} className="foundation-svg-dimension" markerStart="url(#foundation-dimension-arrow)" markerEnd="url(#foundation-dimension-arrow)" />
      <foreignObject x="7" y="112" width="116" height="47"><FoundationDiagramDimension key={`${type.id}:diagram-ph:${type.sill.plateHeight}`} label="Plate height each" value={type.sill.plateHeight} onChange={(plateHeight) => onSillChange({ plateHeight })} /></foreignObject>

      <line x1={wallX} y1={wallDimensionY} x2={wallX + wallWidth} y2={wallDimensionY} className="foundation-svg-dimension foundation-svg-dimension-contrast" markerStart="url(#foundation-dimension-arrow)" markerEnd="url(#foundation-dimension-arrow)" />
      <foreignObject x="294" y="207" width="116" height="47"><FoundationDiagramDimension key={`${type.id}:diagram-ww:${type.wallWidth}`} label="Concrete width" value={type.wallWidth} onChange={onWallWidthChange} /></foreignObject>

      <line x1={Math.max(8, wallX - 17)} y1={wallTop} x2={Math.max(8, wallX - 17)} y2={wallBottom} className="foundation-svg-dimension" markerStart="url(#foundation-dimension-arrow)" markerEnd="url(#foundation-dimension-arrow)" />
      <foreignObject x="7" y="270" width="116" height="47"><FoundationDiagramDimension key={`${type.id}:diagram-wh:${type.wallHeight}`} label="Concrete height" value={type.wallHeight} onChange={onWallHeightChange} /></foreignObject>

      {type.footing.enabled ? <>
        <line x1={footingX} y1={footingBottom + 18} x2={footingX + footingWidth} y2={footingBottom + 18} className="foundation-svg-dimension" markerStart="url(#foundation-dimension-arrow)" markerEnd="url(#foundation-dimension-arrow)" />
        <line x1={footingX} y1={footingBottom + 4} x2={footingX} y2={footingBottom + 24} className="foundation-svg-extension" />
        <line x1={footingX + footingWidth} y1={footingBottom + 4} x2={footingX + footingWidth} y2={footingBottom + 24} className="foundation-svg-extension" />
        <foreignObject x="151" y="443" width="118" height="47"><FoundationDiagramDimension key={`${type.id}:diagram-fw:${type.footing.width}`} label="Footing width" value={type.footing.width} onChange={(width) => onFootingChange({ width })} /></foreignObject>
        <line x1={Math.min(402, footingX + footingWidth + 12)} y1={footingTop} x2={Math.min(402, footingX + footingWidth + 12)} y2={footingBottom} className="foundation-svg-dimension" markerStart="url(#foundation-dimension-arrow)" markerEnd="url(#foundation-dimension-arrow)" />
        <foreignObject x="294" y="350" width="116" height="47"><FoundationDiagramDimension key={`${type.id}:diagram-fh:${type.footing.height}`} label="Footing height" value={type.footing.height} onChange={(height) => onFootingChange({ height })} /></foreignObject>
      </> : <text x="210" y="433" textAnchor="middle" className="foundation-svg-disabled-note">CONTINUOUS FOOTING OFF</text>}
    </svg>
  );
}

export function FoundationWallManagerDialog({
  building,
  onCancel,
  onSave,
}: {
  building: BuildingStructure;
  onCancel: () => void;
  onSave: (building: BuildingStructure) => void;
}) {
  const [draft, setDraft] = useState(() => cloneBuildingStructure(building));
  const [selectedId, setSelectedId] = useState(building.activeFoundationWallTypeId);
  const [error, setError] = useState("");
  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onCancel();
    };
    window.addEventListener("keydown", closeWithEscape, true);
    return () => window.removeEventListener("keydown", closeWithEscape, true);
  }, [onCancel]);
  const selected = draft.foundationWallTypes.find((type) => type.id === selectedId) ?? draft.foundationWallTypes[0];
  const replaceSelected = (change: Partial<FoundationWallType>) => {
    setDraft((current) => ({
      ...cloneBuildingStructure(current),
      foundationWallTypes: current.foundationWallTypes.map((type) => type.id === selected.id ? { ...cloneFoundationWallType(type), ...change } : cloneFoundationWallType(type)),
    }));
    setError("");
  };
  const replaceFooting = (change: Partial<FoundationWallType["footing"]>) => replaceSelected({ footing: { ...selected.footing, ...change } });
  const replaceSill = (change: Partial<FoundationWallType["sill"]>) => replaceSelected({ sill: { ...selected.sill, ...change } });
  const changeCondition = (condition: FoundationWallCondition) => replaceSelected({
    condition,
    sill: { ...selected.sill, ...foundationConditionPlateDefaults(condition) },
  });
  const duplicateType = () => {
    if (draft.foundationWallTypes.length >= 32) return;
    const id = nextFoundationWallTypeId(draft);
    const copy = { ...cloneFoundationWallType(selected), id, name: `${selected.name} Copy` };
    setDraft((current) => ({ ...cloneBuildingStructure(current), activeFoundationWallTypeId: id, foundationWallTypes: [...current.foundationWallTypes.map(cloneFoundationWallType), copy] }));
    setSelectedId(id);
  };
  const deleteType = () => {
    if (draft.foundationWallTypes.length <= 1) return;
    const remaining = draft.foundationWallTypes.filter((type) => type.id !== selected.id).map(cloneFoundationWallType);
    const nextActive = draft.activeFoundationWallTypeId === selected.id ? remaining[0].id : draft.activeFoundationWallTypeId;
    setDraft((current) => ({ ...cloneBuildingStructure(current), activeFoundationWallTypeId: nextActive, foundationWallTypes: remaining }));
    setSelectedId(nextActive);
  };
  const save = () => {
    const next = cloneBuildingStructure(draft);
    if (!buildingStructureIsValid(next)) {
      setError("Check the type names and dimensions. Footings cannot be narrower than their concrete Wall, and plate counts must remain within the supported range.");
      return;
    }
    onSave(next);
  };
  const plateStackHeight = foundationSillStackHeight(selected);
  const ownershipLabel = selected.sill.upperWallBottomPlateCount
    ? `${selected.sill.foundationPlateCount} foundation sill + ${selected.sill.upperWallBottomPlateCount} framed-Wall bottom plate`
    : `${selected.sill.foundationPlateCount} foundation-hosted sill plates`;
  return (
    <div className="story-manager-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="story-manager foundation-manager" role="dialog" aria-modal="true" aria-labelledby="foundation-manager-title">
        <header className="story-manager-header"><div><strong id="foundation-manager-title">Foundation Wall Type Manager</strong><span>Define concrete support, footing geometry, and the sill edge that controls the floor perimeter.</span></div><button type="button" onClick={onCancel} aria-label="Close Foundation Wall Type Manager">×</button></header>
        <div className="story-manager-body">
          <aside className="story-list">
            <header><strong>Foundation Wall Types</strong><span>{draft.foundationWallTypes.length} defined</span></header>
            {draft.foundationWallTypes.map((type) => <button type="button" key={type.id} className={type.id === selected.id ? "is-selected" : ""} onClick={() => setSelectedId(type.id)}><strong>{type.name}</strong><span>{formatArchitectural(type.wallWidth)} concrete · {type.sill.foundationPlateCount} sill plate{type.sill.foundationPlateCount === 1 ? "" : "s"}</span>{type.id === draft.activeFoundationWallTypeId ? <small>ACTIVE TYPE</small> : null}</button>)}
            <div className="story-list-actions"><button type="button" onClick={duplicateType} disabled={draft.foundationWallTypes.length >= 32}>＋ Duplicate</button><button type="button" onClick={deleteType} disabled={draft.foundationWallTypes.length <= 1}>Delete</button></div>
          </aside>
          <main className="story-editor foundation-editor">
            <section className="story-editor-summary foundation-editor-summary">
              <label><span>Type name</span><input value={selected.name} maxLength={100} onChange={(event) => replaceSelected({ name: event.target.value })} /></label>
              <label><span>Foundation condition</span><select value={selected.condition} onChange={(event) => changeCondition(event.target.value as FoundationWallCondition)}>{FOUNDATION_WALL_CONDITIONS.map((condition) => <option value={condition} key={condition}>{FOUNDATION_CONDITION_LABELS[condition]}</option>)}</select></label>
              <button type="button" className={selected.id === draft.activeFoundationWallTypeId ? "is-anchor" : ""} onClick={() => setDraft((current) => ({ ...cloneBuildingStructure(current), activeFoundationWallTypeId: selected.id }))}>{selected.id === draft.activeFoundationWallTypeId ? "Active foundation type" : "Make active"}</button>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Concrete Wall</strong><span>Structural stem and project top condition</span></div></header>
              <div className="foundation-field-grid">
                <label className="story-field"><span>Material</span><input value={selected.material} maxLength={120} onChange={(event) => replaceSelected({ material: event.target.value })} /></label>
                <StoryDimensionInput key={`${selected.id}:wall-height:${selected.wallHeight}`} label="Wall height" value={selected.wallHeight} onChange={(wallHeight) => replaceSelected({ wallHeight })} />
                <StoryDimensionInput key={`${selected.id}:wall:${selected.wallWidth}`} label="Wall width" value={selected.wallWidth} onChange={(wallWidth) => replaceSelected({ wallWidth })} />
                <StoryDimensionInput signed key={`${selected.id}:top:${selected.topOffset}`} label="Top offset" value={selected.topOffset} onChange={(topOffset) => replaceSelected({ topOffset })} />
              </div>
            </section>
            <section className="foundation-setting-section">
              <header><label><input type="checkbox" checked={selected.footing.enabled} onChange={(event) => replaceFooting({ enabled: event.target.checked })} /><strong>Continuous Footing</strong></label><span>Centered under the concrete Main layer unless offset</span></header>
              <div className="foundation-field-grid">
                <StoryDimensionInput key={`${selected.id}:fw:${selected.footing.width}`} label="Footing width" value={selected.footing.width} onChange={(width) => replaceFooting({ width })} />
                <StoryDimensionInput key={`${selected.id}:fh:${selected.footing.height}`} label="Footing height" value={selected.footing.height} onChange={(height) => replaceFooting({ height })} />
                <StoryDimensionInput signed key={`${selected.id}:fo:${selected.footing.centerOffset}`} label="Center offset" value={selected.footing.centerOffset} onChange={(centerOffset) => replaceFooting({ centerOffset })} />
              </div>
            </section>
            <section className="foundation-setting-section foundation-sill-settings">
              <header><div><strong>Sill Support</strong><span>The exterior sill edge becomes the authoritative floor-perimeter stop.</span></div><output>{ownershipLabel}</output></header>
              <div className="foundation-field-grid">
                <StoryDimensionInput key={`${selected.id}:sw:${selected.sill.plateWidth}`} label="Plate width" value={selected.sill.plateWidth} onChange={(plateWidth) => replaceSill({ plateWidth })} />
                <StoryDimensionInput key={`${selected.id}:sh:${selected.sill.plateHeight}`} label="Plate height" value={selected.sill.plateHeight} onChange={(plateHeight) => replaceSill({ plateHeight })} />
                <StoryDimensionInput signed key={`${selected.id}:ss:${selected.sill.exteriorSetback}`} label="Exterior setback" value={selected.sill.exteriorSetback} onChange={(exteriorSetback) => replaceSill({ exteriorSetback })} />
                <label className="story-field"><span>Foundation sill plates</span><input type="number" min={1} max={4} step={1} value={selected.sill.foundationPlateCount} onChange={(event) => replaceSill({ foundationPlateCount: Number(event.target.value) })} /></label>
                <label className="story-field"><span>Framed-Wall bottom plates</span><input type="number" min={0} max={2} step={1} value={selected.sill.upperWallBottomPlateCount} onChange={(event) => replaceSill({ upperWallBottomPlateCount: Number(event.target.value) })} /></label>
                <label className="story-field"><span>Foundation plate stack</span><output className="room-output">{formatArchitectural(plateStackHeight)}</output></label>
              </div>
              <p>Changing the condition applies the reviewed residential plate ownership: Standard and Interior Mudsill use two foundation-hosted plates; Dropped, Garage, and Slab Walk-out use one foundation sill plus the framed Wall bottom plate.</p>
            </section>
          </main>
          <aside className="foundation-section-preview" aria-label="Foundation Wall section preview">
            <header><strong>Editable Support Section</strong><span>Proportional component preview · exterior at left</span></header>
            <div className="foundation-preview-canvas"><FoundationSectionDiagram type={selected} onWallHeightChange={(wallHeight) => replaceSelected({ wallHeight })} onWallWidthChange={(wallWidth) => replaceSelected({ wallWidth })} onFootingChange={replaceFooting} onSillChange={replaceSill} /></div>
            <dl><div><dt>Condition</dt><dd>{FOUNDATION_CONDITION_LABELS[selected.condition]}</dd></div><div><dt>Concrete top</dt><dd>{formatSignedArchitectural(selected.topOffset)}</dd></div><div><dt>Sill edge</dt><dd>{selected.sill.exteriorSetback === 0 ? "Flush to Main exterior" : `${formatSignedArchitectural(selected.sill.exteriorSetback)} setback`}</dd></div><div><dt>Plate ownership</dt><dd>{ownershipLabel}</dd></div></dl>
          </aside>
        </div>
        {error ? <p className="story-manager-error" role="alert">{error}</p> : null}
        <footer className="story-manager-footer"><span>{draft.foundationWallTypes.length} reusable Foundation Wall type{draft.foundationWallTypes.length === 1 ? "" : "s"} · saved with this project</span><div><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="story-save" onClick={save}>Apply Foundation Types</button></div></footer>
      </section>
    </div>
  );
}
