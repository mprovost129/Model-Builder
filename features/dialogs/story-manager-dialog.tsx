/**
 * Story manager dialog and the layered-assembly editor it hosts.
 *
 * Edits a draft copy of the BuildingStructure and reports the result on save,
 * so cancelling leaves the document untouched.
 * Extracted from app/model-builder-app.tsx.
 */
import { useEffect, useState } from "react";
import { StoryAssemblyEditor, StoryDimensionInput } from "@/features/dialogs/assembly-editor";
import {
  FLOOR_STRUCTURE_PRESET_LABELS,
  STORY_PURPOSE_HELP,
  STORY_PURPOSE_LABELS,
} from "@/features/properties/building-labels";
import {
  formatArchitectural,
  formatSignedArchitectural,
} from "@/lib/architectural-units";
import {
  addBuildingStory,
  applyFloorStructurePreset,
  buildingStructureIsValid,
  calculateStoryElevations,
  cloneBuildingStructure,
  removeBuildingStory,
  type AssemblyKind,
  type BuildingStructure,
  type FloorStructurePreset,
  type LayeredAssembly,
  type StoryPurpose,
} from "@/lib/building-stories";
import {
} from "@/lib/material-library";

export function StoryManagerDialog({
  building,
  onCancel,
  onSave,
}: {
  building: BuildingStructure;
  onCancel: () => void;
  onSave: (building: BuildingStructure) => void;
}) {
  const [draft, setDraft] = useState(() => cloneBuildingStructure(building));
  const [selectedStoryId, setSelectedStoryId] = useState(building.activeStoryId);
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
  const calculations = calculateStoryElevations(draft);
  const selectedIndex = draft.stories.findIndex((story) => story.id === selectedStoryId);
  const selectedStory = draft.stories[selectedIndex] ?? draft.stories[0];
  const selectedCalculation = calculations.find((item) => item.storyId === selectedStory.id);

  const replaceSelectedStory = (change: Partial<typeof selectedStory>) => {
    setDraft((current) => {
      const next = cloneBuildingStructure(current);
      const index = next.stories.findIndex((story) => story.id === selectedStory.id);
      if (index >= 0) next.stories[index] = { ...next.stories[index], ...change };
      return next;
    });
    setError("");
  };
  const replaceAssembly = (kind: AssemblyKind, assembly: LayeredAssembly) => {
    replaceSelectedStory(kind === "floor-structure" ? { floorStructure: assembly } : kind === "floor-finish" ? { floorFinish: assembly } : kind === "ceiling-structure" ? { ceilingStructure: assembly } : { ceilingFinish: assembly });
  };
  const addStory = (placement: "above" | "below") => {
    const next = addBuildingStory(draft, selectedStory.id, placement);
    if (!next) return;
    setDraft(next);
    setSelectedStoryId(next.activeStoryId);
    setError("");
  };
  const removeStory = () => {
    const next = removeBuildingStory(draft, selectedStory.id);
    if (!next) return;
    setDraft(next);
    setSelectedStoryId(next.activeStoryId);
    setError("");
  };
  const setDatumAnchor = () => {
    const elevation = calculations.find((item) => item.storyId === selectedStory.id)?.roughFloorElevation;
    if (elevation === undefined) return;
    setDraft((current) => ({ ...cloneBuildingStructure(current), anchorStoryId: selectedStory.id, datumElevation: elevation }));
  };
  const applyFloorPreset = (preset: FloorStructurePreset) => {
    replaceSelectedStory(applyFloorStructurePreset(selectedStory, preset));
  };
  const save = () => {
    const next = cloneBuildingStructure(draft);
    next.activeStoryId = selectedStory.id;
    if (!buildingStructureIsValid(next)) {
      setError("Check Story names, rough heights, and assembly layers. Names must be unique and every thickness must be a valid architectural dimension.");
      return;
    }
    onSave(next);
  };

  return (
    <div className="story-manager-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="story-manager" role="dialog" aria-modal="true" aria-labelledby="story-manager-title">
        <header className="story-manager-header"><div><strong id="story-manager-title">Story &amp; Assembly Manager</strong><span>Rough framing establishes reference elevations. Finish layers calculate finished dimensions.</span></div><button type="button" onClick={onCancel} aria-label="Close Story Manager">×</button></header>
        <div className="story-manager-body">
          <aside className="story-list">
            <header><strong>Stories</strong><span>Bottom to top</span></header>
            {[...draft.stories].reverse().map((story) => {
              const calculation = calculations.find((item) => item.storyId === story.id);
              return <button type="button" key={story.id} className={story.id === selectedStory.id ? "is-selected" : ""} onClick={() => setSelectedStoryId(story.id)}><strong>{story.name}</strong><span>{STORY_PURPOSE_LABELS[story.purpose]} · Rough floor {calculation ? formatSignedArchitectural(calculation.roughFloorElevation) : "—"}</span>{story.id === draft.anchorStoryId ? <small>ELEVATION REFERENCE</small> : null}</button>;
            })}
            <div className="story-list-actions"><button type="button" onClick={() => addStory("above")}>＋ Above</button><button type="button" onClick={() => addStory("below")}>＋ Below</button><button type="button" onClick={removeStory} disabled={draft.stories.length === 1}>Delete</button></div>
          </aside>
          <main className="story-editor">
            <section className="story-editor-summary">
              <label><span>Story name</span><input value={selectedStory.name} maxLength={80} onChange={(event) => replaceSelectedStory({ name: event.target.value })} /></label>
              <StoryDimensionInput key={`${selectedStory.id}:${selectedStory.roughCeilingHeight}`} label="Rough ceiling / plate height" value={selectedStory.roughCeilingHeight} onChange={(roughCeilingHeight) => replaceSelectedStory({ roughCeilingHeight })} />
              <StoryDimensionInput key={`${draft.anchorStoryId}:${draft.datumElevation}`} label="Reference elevation" signed value={draft.datumElevation} onChange={(datumElevation) => setDraft((current) => ({ ...cloneBuildingStructure(current), datumElevation }))} />
              <button type="button" className={selectedStory.id === draft.anchorStoryId ? "is-anchor" : ""} onClick={setDatumAnchor}>{selectedStory.id === draft.anchorStoryId ? "Elevation reference" : "Set as elevation reference"}</button>
            </section>
            <section className="story-classification-panel">
              <label className="story-field">
                <span>Story type</span>
                <select value={selectedStory.purpose} onChange={(event) => replaceSelectedStory({ purpose: event.target.value as StoryPurpose })} aria-label="Story type">
                  {Object.entries(STORY_PURPOSE_LABELS).map(([purpose, label]) => <option key={purpose} value={purpose}>{label}</option>)}
                </select>
              </label>
              <div className="story-floor-presets">
                <span>Floor structure presets</span>
                <div>{Object.entries(FLOOR_STRUCTURE_PRESET_LABELS).map(([preset, label]) => <button type="button" key={preset} onClick={() => applyFloorPreset(preset as FloorStructurePreset)}>{label}</button>)}</div>
              </div>
              <p><strong>{STORY_PURPOSE_LABELS[selectedStory.purpose]}:</strong> {STORY_PURPOSE_HELP[selectedStory.purpose]} Applying a preset replaces this Story&apos;s floor-structure layers; floor finishes remain separate and editable.</p>
            </section>
            <div className="story-section-label"><strong>Calculated Results</strong><span>Read-only values derived from Story height and assembly thicknesses</span></div>
            <section className="story-calculated-grid" aria-label="Calculated Story elevations">
              <div><span>Rough floor</span><strong>{selectedCalculation ? formatSignedArchitectural(selectedCalculation.roughFloorElevation) : "—"}</strong></div>
              <div><span>Finished floor</span><strong>{selectedCalculation ? formatSignedArchitectural(selectedCalculation.finishedFloorElevation) : "—"}</strong></div>
              <div><span>Rough ceiling</span><strong>{selectedCalculation ? formatSignedArchitectural(selectedCalculation.roughCeilingElevation) : "—"}</strong></div>
              <div><span>Floor structure depth</span><strong>{selectedCalculation ? formatArchitectural(selectedCalculation.floorStructureThickness) : "—"}</strong></div>
              <div><span>Ceiling structure depth</span><strong>{selectedCalculation ? formatArchitectural(selectedCalculation.ceilingStructureThickness) : "—"}</strong></div>
              <div><span>Finished ceiling</span><strong>{selectedCalculation ? formatSignedArchitectural(selectedCalculation.finishedCeilingElevation) : "—"}</strong></div>
              <div><span>Finished clear height</span><strong>{selectedCalculation ? formatArchitectural(selectedCalculation.finishedClearHeight) : "—"}</strong></div>
              <div><span>Floor above</span><strong>{selectedCalculation?.floorAboveElevation !== null && selectedCalculation?.floorAboveElevation !== undefined ? formatSignedArchitectural(selectedCalculation.floorAboveElevation) : "No Story above"}</strong></div>
            </section>
            <StoryAssemblyEditor assembly={selectedStory.floorStructure} defaultOpen onChange={(assembly) => replaceAssembly("floor-structure", assembly)} />
            <StoryAssemblyEditor assembly={selectedStory.floorFinish} defaultOpen={false} onChange={(assembly) => replaceAssembly("floor-finish", assembly)} />
            <StoryAssemblyEditor assembly={selectedStory.ceilingStructure} defaultOpen={false} onChange={(assembly) => replaceAssembly("ceiling-structure", assembly)} />
            <StoryAssemblyEditor assembly={selectedStory.ceilingFinish} defaultOpen={false} onChange={(assembly) => replaceAssembly("ceiling-finish", assembly)} />
          </main>
          <aside className="story-section-preview" aria-label="Story section preview">
            <header><strong>Section Preview</strong><span>Calculated rough and finish planes</span></header>
            <div className="story-pole">
              {[...draft.stories].reverse().map((story) => {
                const calculation = calculations.find((item) => item.storyId === story.id);
                if (!calculation) return null;
                return <button type="button" key={story.id} className={story.id === selectedStory.id ? "story-pole-level is-selected" : "story-pole-level"} onClick={() => setSelectedStoryId(story.id)}><span className="story-pole-ceiling"><b>ROUGH CEILING</b>{formatSignedArchitectural(calculation.roughCeilingElevation)}</span><strong>{story.name}</strong><span className="story-pole-floor"><b>ROUGH FLOOR</b>{formatSignedArchitectural(calculation.roughFloorElevation)}</span><i style={{ height: `${Math.max(5, Math.min(24, calculation.floorStructureThickness))}px` }} title={`Rough floor structure ${formatArchitectural(calculation.floorStructureThickness)}`} /></button>;
              })}
            </div>
            <p>Gold lines are rough framing reference elevations. Thin interior lines represent finish surfaces.</p>
          </aside>
        </div>
        {error ? <p className="story-manager-error" role="alert">{error}</p> : null}
        <footer className="story-manager-footer"><span>{draft.stories.length} Stor{draft.stories.length === 1 ? "y" : "ies"} · active plan: {selectedStory.name}</span><div><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="story-save" onClick={save}>Apply Story Settings</button></div></footer>
      </section>
    </div>
  );
}
