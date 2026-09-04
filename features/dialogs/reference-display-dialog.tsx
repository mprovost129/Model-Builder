/**
 * Floor / Reference Display settings for the active Saved Plan View.
 * Extracted from app/model-builder-app.tsx.
 */
import { useState } from "react";
import {
  resolveReferenceStoryId,
} from "@/features/project-presentation";
import {
  type BuildingStructure,
} from "@/lib/building-stories";
import {
  LayerSet,
  ReferenceDisplayMode,
  SavedPlanView,
} from "@/lib/document-model";

export function ReferenceDisplayDialog({
  layerSets,
  onCancel,
  onSave,
  stories,
  view,
}: {
  layerSets: readonly LayerSet[];
  onCancel: () => void;
  onSave: (view: SavedPlanView) => void;
  stories: BuildingStructure["stories"];
  view: SavedPlanView;
}) {
  const [draft, setDraft] = useState(() => ({ ...view }));
  const orderedStoryIds = stories.map((story) => story.id);
  const availableStories = stories.filter((story) => story.id !== draft.storyId);
  const resolvedStoryId = resolveReferenceStoryId({ ...draft, referenceDisplayEnabled: true }, orderedStoryIds);
  const resolvedStory = stories.find((story) => story.id === resolvedStoryId);
  const currentStory = stories.find((story) => story.id === draft.storyId);
  const selectMode = (referenceMode: ReferenceDisplayMode) => {
    const fallbackStoryId = availableStories[0]?.id ?? null;
    setDraft((current) => ({
      ...current,
      referenceMode,
      referenceStoryId: referenceMode === "specific" && (!current.referenceStoryId || current.referenceStoryId === current.storyId)
        ? fallbackStoryId
        : current.referenceStoryId,
    }));
  };

  return <div className="story-manager-backdrop" role="presentation">
    <section className="reference-display-dialog" role="dialog" aria-modal="true" aria-labelledby="reference-display-title">
      <header className="story-manager-header"><div><strong id="reference-display-title">Floor / Reference Display</strong><span>Overlay another Story for coordination without making its objects editable.</span></div><button type="button" onClick={onCancel} aria-label="Close Floor Reference Display">×</button></header>
      <div className="reference-display-body">
        <section className="reference-current-floor"><span>Current editable floor</span><strong>{currentStory?.name ?? "Current Story"}</strong><small>Reference objects remain visible for alignment but cannot be selected or modified.</small></section>
        <label className="reference-enable"><input type="checkbox" aria-label="Show reference floor" checked={draft.referenceDisplayEnabled} disabled={availableStories.length === 0} onChange={(event) => setDraft((current) => ({ ...current, referenceDisplayEnabled: event.target.checked }))} /><span><strong>Show reference floor</strong><small>{availableStories.length ? "Display the selected floor behind the active plan." : "Add another Story before enabling a reference."}</small></span></label>
        <div className="reference-display-grid">
          <label><span>Reference source</span><select value={draft.referenceMode} onChange={(event) => selectMode(event.target.value as ReferenceDisplayMode)}><option value="automatic">Automatic — below, otherwise above</option><option value="below">Floor below</option><option value="above">Floor above</option><option value="specific">Specific floor</option></select></label>
          <label><span>Reference floor</span>{draft.referenceMode === "specific" ? <select value={draft.referenceStoryId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, referenceStoryId: event.target.value || null }))}><option value="">Choose a floor</option>{availableStories.map((story) => <option value={story.id} key={story.id}>{story.name}</option>)}</select> : <output>{resolvedStory?.name ?? "No floor available"}</output>}</label>
          <label><span>Reference Layer Set</span><select value={draft.referenceLayerSetId} onChange={(event) => setDraft((current) => ({ ...current, referenceLayerSetId: event.target.value }))}>{layerSets.map((set) => <option value={set.id} key={set.id}>{set.name}</option>)}</select></label>
          <label className="reference-detail-toggle"><input type="checkbox" aria-label="Show reference fills and details" checked={draft.referenceFillsVisible} onChange={(event) => setDraft((current) => ({ ...current, referenceFillsVisible: event.target.checked }))} /><span><strong>Show fills and details</strong><small>Off keeps the reference as clean linework.</small></span></label>
        </div>
        <aside><strong>Visibility control</strong><span>The Reference Layer Set independently controls which Walls, fixtures, openings, annotations, and other object layers appear. Copy a Layer Set to create purpose-specific references such as “Plumbing Above” or “Wall Alignment.”</span></aside>
      </div>
      <footer className="story-manager-footer"><span>{draft.referenceDisplayEnabled ? resolvedStory ? `${resolvedStory.name} will display as a non-editable reference.` : "The selected direction has no available floor." : "Reference display is off for this Saved Plan View."}</span><div><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="story-save" disabled={draft.referenceDisplayEnabled && !resolvedStory} onClick={() => onSave(draft)}>Apply Reference</button></div></footer>
    </section>
  </div>;
}
