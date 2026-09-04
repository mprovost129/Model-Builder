/**
 * Wall framing defaults: stud spacing, plate counts, and member sizes.
 * Extracted from app/model-builder-app.tsx.
 */
import { useEffect, useState } from "react";
import {
  StoryDimensionInput,
} from "@/features/dialogs/assembly-editor";
import {
  formatArchitectural,
} from "@/lib/architectural-units";
import {
  type BuildingStructure,
  type WallCornerFramingStyle,
  type WallFramingSettings,
  type WallPartitionBackingStyle,
  cloneBuildingStructure,
  wallFramingSettingsAreValid,
} from "@/lib/building-stories";

export function WallFramingManagerDialog({
  building,
  onCancel,
  onSave,
}: {
  building: BuildingStructure;
  onCancel: () => void;
  onSave: (building: BuildingStructure) => void;
}) {
  const [draft, setDraft] = useState<WallFramingSettings>(() => ({ ...building.wallFraming }));
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
  const replace = (change: Partial<WallFramingSettings>) => {
    setDraft((current) => ({ ...current, ...change }));
    setError("");
  };
  const save = () => {
    if (!wallFramingSettingsAreValid(draft)) {
      setError("Check the member dimensions, spacing, plate counts, and material name.");
      return;
    }
    const next = cloneBuildingStructure(building);
    next.wallFraming = { ...draft };
    onSave(next);
  };
  return (
    <div className="story-manager-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="story-manager framing-manager" role="dialog" aria-modal="true" aria-labelledby="framing-manager-title">
        <header className="story-manager-header"><div><strong id="framing-manager-title">Wall Framing Defaults</strong><span>Generate conventional light-frame members from each Wall Main layer and its structural rough openings.</span></div><button type="button" onClick={onCancel} aria-label="Close Wall Framing Defaults">×</button></header>
        <div className="framing-manager-body">
          <section className="framing-status-card">
            <strong>Framing Generation</strong>
            <label><input type="checkbox" checked={draft.enabled} onChange={(event) => replace({ enabled: event.target.checked, ...(!event.target.checked ? { showInModel: false } : {}) })} /><span>Generate framing from Walls</span></label>
            <label><input type="checkbox" checked={draft.showInModel} disabled={!draft.enabled} onChange={(event) => replace({ showInModel: event.target.checked })} /><span>Show framing in the 3D model</span></label>
            <p>Framing remains derived from the host Wall and stays on that Wall&apos;s layer. The 3D framing view fades finish layers so structural members remain readable.</p>
          </section>
          <main className="story-editor framing-editor">
            <section className="story-editor-summary foundation-editor-summary">
              <label><span>Framing material</span><input value={draft.material} maxLength={120} onChange={(event) => replace({ material: event.target.value })} /></label>
              <label><span>Layout</span><output className="room-output">{formatArchitectural(draft.studSpacing)} on center</output></label>
              <label><span>Status</span><output className="room-output">{draft.enabled ? "Generated" : "Disabled"}</output></label>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Stud &amp; Plate Layout</strong><span>The Main-layer thickness supplies member depth.</span></div></header>
              <div className="foundation-field-grid">
                <StoryDimensionInput key={`spacing:${draft.studSpacing}`} label="Stud spacing" value={draft.studSpacing} onChange={(studSpacing) => replace({ studSpacing })} />
                <StoryDimensionInput key={`stud:${draft.studWidth}`} label="Stud width" value={draft.studWidth} onChange={(studWidth) => replace({ studWidth })} />
                <StoryDimensionInput key={`plate:${draft.plateHeight}`} label="Plate height" value={draft.plateHeight} onChange={(plateHeight) => replace({ plateHeight })} />
                <label className="story-field"><span>Bottom plates</span><select value={draft.bottomPlateCount} onChange={(event) => replace({ bottomPlateCount: Number(event.target.value) })}>{[0, 1, 2, 3].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
                <label className="story-field"><span>Top plates</span><select value={draft.topPlateCount} onChange={(event) => replace({ topPlateCount: Number(event.target.value) })}>{[0, 1, 2, 3, 4].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
              </div>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Junction Framing</strong><span>Automatic Wall joins determine corners and partition intersections.</span></div></header>
              <div className="foundation-field-grid">
                <label className="story-field"><span>Corner method</span><select value={draft.cornerStyle} onChange={(event) => replace({ cornerStyle: event.target.value as WallCornerFramingStyle })}><option value="three-stud">Three-stud conventional</option><option value="two-stud">Two-stud advanced</option></select></label>
                <label className="story-field"><span>Partition backing</span><select value={draft.partitionBackingStyle} onChange={(event) => replace({ partitionBackingStyle: event.target.value as WallPartitionBackingStyle })}><option value="three-stud">Three-stud backing</option><option value="ladder">Ladder blocking</option><option value="none">None</option></select></label>
                {draft.partitionBackingStyle === "ladder" ? <StoryDimensionInput key={`ladder:${draft.ladderBlockSpacing}`} label="Ladder block spacing" value={draft.ladderBlockSpacing} onChange={(ladderBlockSpacing) => replace({ ladderBlockSpacing })} /> : null}
              </div>
              <p className="opening-type-note">Three-stud corners add one deterministic shared-corner member; the two-stud option leaves one end stud from each participating Wall. Partition backing is generated in the host Wall at resolved T-intersections.</p>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Opening Framing</strong><span>Rough dimensions and bottom-of-header elevations remain authoritative.</span></div></header>
              <div className="foundation-field-grid">
                <StoryDimensionInput key={`header:${draft.headerHeight}`} label="Legacy/custom header depth" value={draft.headerHeight} onChange={(headerHeight) => replace({ headerHeight })} />
                <label className="story-field"><span>Reusable types</span><output className="room-output">Use type-specific framing</output></label>
                <label className="story-field"><span>Window support</span><output className="room-output">Type sill + cripples</output></label>
              </div>
              <p className="opening-type-note">The fallback applies only to older custom openings without a reusable type. Door and Window types control their own header depth, king studs, jack studs, and Window rough-sill count. Door bottom plates are cut at the rough opening; Window bottom plates remain continuous.</p>
            </section>
          </main>
        </div>
        {error ? <p className="story-manager-error" role="alert">{error}</p> : null}
        <footer className="story-manager-footer"><span>Wall framing defaults · saved with this project</span><div><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="story-save" onClick={save}>Apply Framing Defaults</button></div></footer>
      </section>
    </div>
  );
}
