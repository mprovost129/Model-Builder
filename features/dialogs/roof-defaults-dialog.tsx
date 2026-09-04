/**
 * Project Roof defaults: pitch, heel, height above plate, fascia and bearing
 * references. Extracted from app/model-builder-app.tsx.
 */
import { useEffect, useState } from "react";
import {
  StoryAssemblyEditor,
  StoryDimensionInput,
} from "@/features/dialogs/assembly-editor";
import {
  formatArchitectural,
  formatSignedArchitectural,
} from "@/lib/architectural-units";
import {
  type BuildingStructure,
  type LayeredAssembly,
  MAXIMUM_ROOF_TYPE_COUNT,
  type RoofFramingMethod,
  type RoofSettings,
  buildingStructureIsValid,
  calculateRoofReferenceDimensions,
  calculateStoryElevations,
  cloneBuildingStructure,
  cloneLayeredAssembly,
  roofSettingsAreValid,
} from "@/lib/building-stories";

export function RoofDefaultsDialog({
  building,
  onCancel,
  onSave,
}: {
  building: BuildingStructure;
  onCancel: () => void;
  onSave: (building: BuildingStructure) => void;
}) {
  const [draft, setDraft] = useState<RoofSettings>(() => ({ ...building.roofSettings }));
  const [roofTypes, setRoofTypes] = useState(() => building.roofTypes.map(cloneLayeredAssembly));
  const [activeRoofTypeId, setActiveRoofTypeId] = useState(building.activeRoofTypeId);
  const [referenceRun, setReferenceRun] = useState(144);
  const [error, setError] = useState("");
  const activeRoofType = roofTypes.find((roofType) => roofType.id === activeRoofTypeId) ?? roofTypes[0];
  const activeStory = building.stories.at(-1)!;
  const topOfPlate = calculateStoryElevations(building).find((item) => item.storyId === activeStory.id)?.roughCeilingElevation ?? 0;
  const calculation = calculateRoofReferenceDimensions(draft, topOfPlate, referenceRun);
  const replace = (change: Partial<RoofSettings>) => { setDraft((current) => ({ ...current, ...change })); setError(""); };
  const replaceRoofType = (roofType: LayeredAssembly) => {
    setRoofTypes((current) => current.map((candidate) => candidate.id === roofType.id ? cloneLayeredAssembly(roofType) : cloneLayeredAssembly(candidate)));
    setError("");
  };
  const renameRoofType = (name: string) => {
    if (!activeRoofType) return;
    replaceRoofType({ ...cloneLayeredAssembly(activeRoofType), name });
  };
  const duplicateRoofType = () => {
    if (!activeRoofType || roofTypes.length >= MAXIMUM_ROOF_TYPE_COUNT) return;
    const ids = new Set(roofTypes.map((roofType) => roofType.id));
    let number = 1;
    while (ids.has(`roof-type-${String(number).padStart(2, "0")}`)) number += 1;
    const id = `roof-type-${String(number).padStart(2, "0")}`;
    const names = new Set(roofTypes.map((roofType) => roofType.name.trim().toLowerCase()));
    let name = `${activeRoofType.name} Copy`;
    let suffix = 2;
    while (names.has(name.toLowerCase())) name = `${activeRoofType.name} Copy ${suffix++}`;
    const copy = { ...cloneLayeredAssembly(activeRoofType), id, name, layers: activeRoofType.layers.map((layer, index) => ({ ...layer, id: `${id}-${String(index + 1).padStart(2, "0")}` })) };
    setRoofTypes((current) => [...current.map(cloneLayeredAssembly), copy]);
    setActiveRoofTypeId(id);
  };
  const deleteRoofType = () => {
    if (!activeRoofType || roofTypes.length <= 1) return;
    const remaining = roofTypes.filter((roofType) => roofType.id !== activeRoofType.id).map(cloneLayeredAssembly);
    setRoofTypes(remaining);
    setActiveRoofTypeId(remaining[0].id);
  };

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

  const save = () => {
    if (!roofSettingsAreValid(draft)) {
      setError("Check the pitch, heel, overhang, framing spacing, member sizes, ridge, birdsmouth, fascia, and subfascia values.");
      return;
    }
    const next = cloneBuildingStructure(building);
    next.roofSettings = { ...draft };
    next.roofTypes = roofTypes.map(cloneLayeredAssembly);
    next.activeRoofTypeId = activeRoofTypeId;
    if (!buildingStructureIsValid(next)) {
      setError("Check the Roof Type name, unique layers, layer order, materials, sides, and thicknesses.");
      return;
    }
    onSave(next);
  };

  return (
    <div className="story-manager-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="story-manager roof-defaults-manager" role="dialog" aria-modal="true" aria-labelledby="roof-defaults-title">
        <header className="story-manager-header"><div><strong id="roof-defaults-title">Roof Design Defaults</strong><span>Establish the exterior heel reference and calculated roof elevations before drawing Roof Planes.</span></div><button type="button" onClick={onCancel} aria-label="Close Roof Design Defaults">×</button></header>
        <div className="roof-defaults-body">
          <main className="story-editor roof-defaults-editor">
            <section className="story-editor-summary foundation-editor-summary">
              <label><span>Roof-bearing Story</span><output className="room-output">{activeStory.name}</output></label>
              <label><span>Framing method</span><select value={draft.framingMethod} onChange={(event) => replace({ framingMethod: event.target.value as RoofFramingMethod })}><option value="rafters">Conventional rafters</option><option value="trusses">Roof trusses</option></select></label>
              <label><span>Pitch</span><output className="room-output">{draft.pitchRise}:12</output></label>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Bearing &amp; Roof Plane</strong><span>The heel is located at the exterior face of the bearing wall or plate.</span></div></header>
              <div className="foundation-field-grid">
                <label className="story-field"><span>Top of plate / wall</span><output className="room-output">{formatSignedArchitectural(topOfPlate)}</output></label>
                <label className="story-field"><span>Roof pitch · rise in 12</span><input type="number" min="0.25" max="24" step="0.0625" value={draft.pitchRise} onChange={(event) => replace({ pitchRise: Number(event.target.value) })} /></label>
                <StoryDimensionInput key={`heel:${draft.heightAbovePlate}`} label="Height above plate / heel" value={draft.heightAbovePlate} onChange={(heightAbovePlate) => replace({ heightAbovePlate })} />
                <StoryDimensionInput key={`overhang:${draft.overhang}`} label="Horizontal overhang" allowZero value={draft.overhang} onChange={(overhang) => replace({ overhang })} />
              </div>
              <p className="opening-type-note">The underside-of-rafter bearing reference begins at top of plate. Height Above Plate is a separate vertical dimension to the roof-plane heel at the exterior wall face.</p>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Rafter / Truss &amp; Birdsmouth</strong><span>Member defaults support both conventional rafters and trussed roofs.</span></div></header>
              <div className="foundation-field-grid">
                <StoryDimensionInput key={`framing-spacing:${draft.framingSpacing}`} label="On-center spacing" value={draft.framingSpacing} onChange={(framingSpacing) => replace({ framingSpacing })} />
                <StoryDimensionInput key={`rafter-width:${draft.rafterWidth}`} label="Rafter / top-chord width" value={draft.rafterWidth} onChange={(rafterWidth) => replace({ rafterWidth })} />
                <StoryDimensionInput key={`rafter-depth:${draft.rafterDepth}`} label="Rafter / top-chord depth" value={draft.rafterDepth} onChange={(rafterDepth) => replace({ rafterDepth })} />
                <StoryDimensionInput key={`seat:${draft.birdsmouthSeatLength}`} label="Birdsmouth seat" value={draft.birdsmouthSeatLength} onChange={(birdsmouthSeatLength) => replace({ birdsmouthSeatLength })} />
                <label className="story-field"><span>Maximum notch</span><select value={draft.birdsmouthMaxNotchRatio} onChange={(event) => replace({ birdsmouthMaxNotchRatio: Number(event.target.value) })}><option value={0.2}>20% of member depth</option><option value={0.25}>25% of member depth</option><option value={0.333333}>33⅓% of member depth</option></select></label>
                <label className="foundation-check" aria-label="Show discrete roof framing in 3D"><input type="checkbox" checked={draft.showFramingInModel} onChange={(event) => replace({ showFramingInModel: event.target.checked })} /><span><strong>Show discrete framing in 3D</strong><small>Fade continuous layers and reveal generated members.</small></span></label>
              </div>
              <p className="opening-type-note">Rectangular and ridge-bounded planes generate common rafters or truss top-chord stations. Full truss webs, birdsmouth cuts, and stations ending at hips, valleys, openings, or clipped edges remain explicitly unresolved rather than estimated.</p>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Ridge &amp; Fascia Assembly</strong><span>Board sizes are separate from their calculated elevations and gross lengths.</span></div></header>
              <div className="foundation-field-grid">
                <StoryDimensionInput key={`ridge-thickness:${draft.ridgeBoardThickness}`} label="Ridge board thickness" value={draft.ridgeBoardThickness} onChange={(ridgeBoardThickness) => replace({ ridgeBoardThickness })} />
                <StoryDimensionInput key={`ridge-depth:${draft.ridgeBoardDepth}`} label="Ridge board depth" value={draft.ridgeBoardDepth} onChange={(ridgeBoardDepth) => replace({ ridgeBoardDepth })} />
                <StoryDimensionInput key={`fascia-thickness:${draft.fasciaThickness}`} label="Fascia thickness" value={draft.fasciaThickness} onChange={(fasciaThickness) => replace({ fasciaThickness })} />
                <StoryDimensionInput key={`fascia-depth:${draft.fasciaDepth}`} label="Fascia board depth" value={draft.fasciaDepth} onChange={(fasciaDepth) => replace({ fasciaDepth })} />
                <StoryDimensionInput key={`subfascia-thickness:${draft.subfasciaThickness}`} label="Subfascia thickness" value={draft.subfasciaThickness} onChange={(subfasciaThickness) => replace({ subfasciaThickness })} />
                <StoryDimensionInput key={`subfascia-depth:${draft.subfasciaDepth}`} label="Subfascia board depth" value={draft.subfasciaDepth} onChange={(subfasciaDepth) => replace({ subfasciaDepth })} />
              </div>
            </section>
            {activeRoofType ? <section className="foundation-setting-section roof-type-section">
              <header><div><strong>Layered Roof Type</strong><span>Build the assembly outward and inward from the structural Roof Plane.</span></div></header>
              <section className="story-editor-summary foundation-editor-summary">
                <label><span>Active Roof Type</span><select value={activeRoofType.id} onChange={(event) => setActiveRoofTypeId(event.target.value)}>{roofTypes.map((roofType) => <option key={roofType.id} value={roofType.id}>{roofType.name}</option>)}</select></label>
                <label><span>Type name</span><input value={activeRoofType.name} onChange={(event) => renameRoofType(event.target.value)} /></label>
                <button type="button" onClick={duplicateRoofType} disabled={roofTypes.length >= MAXIMUM_ROOF_TYPE_COUNT}>Duplicate Type</button>
                <button type="button" onClick={deleteRoofType} disabled={roofTypes.length <= 1}>Delete Type</button>
              </section>
              <StoryAssemblyEditor key={activeRoofType.id} assembly={activeRoofType} onChange={replaceRoofType} />
              <p className="opening-type-note">Exterior layers are listed from weather surface toward the structural plane. Interior layers begin at the structural plane and build toward the room. Zero-thickness membranes retain coverage area without creating a false solid thickness.</p>
            </section> : null}
          </main>
          <aside className="roof-reference-panel">
            <header><strong>Live Roof Reference</strong><span>Exterior is left · schematic section</span></header>
            <svg viewBox="0 0 420 250" role="img" aria-label="Roof heel, wall bearing, rafter pitch, and fascia reference diagram">
              <rect x="195" y="134" width="80" height="100" className="roof-diagram-wall" />
              <rect x="191" y="121" width="88" height="13" className="roof-diagram-plate" />
              <path d="M 28 166 L 380 46 L 388 64 L 34 184 Z" className="roof-diagram-rafter" />
              <path d="M 28 166 L 380 46" className="roof-diagram-plane" />
              <path d="M 32 164 L 32 218" className="roof-diagram-fascia" />
              <path d="M 48 160 L 48 207" className="roof-diagram-subfascia" />
              <path d="M 191 121 L 191 134 M 179 121 L 179 84 M 175 84 L 183 84" className="roof-diagram-dimension" />
              <circle cx="191" cy="121" r="4" className="roof-diagram-point" />
              <text x="145" y="76">HEIGHT ABOVE PLATE</text>
              <text x="202" y="116">EXTERIOR HEEL</text>
              <text x="203" y="151">TOP OF PLATE</text>
              <text x="287" y="58">{draft.pitchRise}:12 PITCH</text>
              <text x="12" y="231">FASCIA</text>
            </svg>
            <StoryDimensionInput key={`reference-run:${referenceRun}`} label="Calculation preview run" value={referenceRun} onChange={setReferenceRun} />
            {calculation ? <dl>
              <div><dt>Top of plate / wall</dt><dd>{formatSignedArchitectural(calculation.topOfPlateElevation)}</dd></div>
              <div><dt>Underside bearing</dt><dd>{formatSignedArchitectural(calculation.rafterUndersideBearingElevation)}</dd></div>
              <div><dt>Exterior heel</dt><dd>{formatSignedArchitectural(calculation.heelElevation)}</dd></div>
              <div><dt>Peak at preview run</dt><dd>{formatSignedArchitectural(calculation.peakElevation)}</dd></div>
              <div><dt>Fascia top / bottom</dt><dd>{formatSignedArchitectural(calculation.fasciaTopElevation)} / {formatSignedArchitectural(calculation.fasciaBottomElevation)}</dd></div>
              <div><dt>Subfascia top / bottom</dt><dd>{formatSignedArchitectural(calculation.subfasciaTopElevation)} / {formatSignedArchitectural(calculation.subfasciaBottomElevation)}</dd></div>
              <div><dt>Maximum notch depth</dt><dd>{formatArchitectural(calculation.birdsmouthMaximumNotchDepth)}</dd></div>
              <div><dt>Roof angle</dt><dd>{calculation.pitchAngleDegrees.toFixed(2)}°</dd></div>
            </dl> : <p className="story-manager-error">Enter valid roof values to calculate the section.</p>}
            <p>Peak height is a result, not a separate default. Each future Roof Plane will calculate it from its actual horizontal run.</p>
          </aside>
        </div>
        {error ? <p className="story-manager-error" role="alert">{error}</p> : null}
        <footer className="story-manager-footer"><span>Roof design defaults · saved with this project</span><div><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="story-save" onClick={save}>Apply Roof Defaults</button></div></footer>
      </section>
    </div>
  );
}
