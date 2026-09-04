/**
 * Guided new-project setup: project information, Stories, and the active
 * Foundation, Wall, Roof, Door and Window defaults.
 * Extracted from app/model-builder-app.tsx.
 */
import { useEffect, useState } from "react";
import {
  StoryDimensionInput,
} from "@/features/dialogs/assembly-editor";
import {
  FLOOR_STRUCTURE_PRESET_LABELS,
  PROJECT_TYPE_LABELS,
  STORY_PURPOSE_LABELS,
  WALL_USE_LABELS,
} from "@/features/properties/building-labels";
import {
  formatArchitectural,
  formatSignedArchitectural,
} from "@/lib/architectural-units";
import {
  type BuildingStructure,
  type FloorStructurePreset,
  type RoofFramingMethod,
  type RoofSettings,
  type StoryPurpose,
  type WallUse,
  addBuildingStory,
  applyFloorStructurePreset,
  assemblyTotalThickness,
  buildingStructureIsValid,
  calculateRoofReferenceDimensions,
  calculateStoryElevations,
  cloneBuildingStructure,
  defaultWallTypeIdForUse,
  removeBuildingStory,
  roofSettingsAreValid,
  wallTypeMatchesUse,
} from "@/lib/building-stories";
import {
  type ModelDocument,
  NEW_PROJECT_DOCUMENT,
  type ProjectInformation,
  type ProjectType,
  cloneDocument,
} from "@/lib/document-model";

type ProjectSetupStep = "project" | "stories" | "defaults" | "review";

const PROJECT_SETUP_STEPS: { id: ProjectSetupStep; label: string; note: string }[] = [
  { id: "project", label: "Project", note: "Identity and starting point" },
  { id: "stories", label: "Stories", note: "Levels, heights, and floors" },
  { id: "defaults", label: "Defaults", note: "Foundation, walls, and openings" },
  { id: "review", label: "Review", note: "Confirm before drawing" },
];

export function ProjectSetupDialog({
  document,
  initialName,
  mode,
  onCancel,
  onOpenAdvanced,
  onSave,
}: {
  document: ModelDocument;
  initialName: string;
  mode: "edit" | "new";
  onCancel: () => void;
  onOpenAdvanced: (target: "foundation" | "roof" | "stories" | "walls") => void;
  onSave: (name: string, document: ModelDocument) => void;
}) {
  const [draft, setDraft] = useState(() => cloneDocument(document));
  const [name, setName] = useState(initialName);
  const [step, setStep] = useState<ProjectSetupStep>("project");
  const [selectedStoryId, setSelectedStoryId] = useState(document.building.activeStoryId);
  const [error, setError] = useState("");
  const selectedStory = draft.building.stories.find((story) => story.id === selectedStoryId) ?? draft.building.stories[0];
  const selectedCalculation = calculateStoryElevations(draft.building).find((item) => item.storyId === selectedStory.id);
  const activeFoundation = draft.building.foundationWallTypes.find((type) => type.id === draft.building.activeFoundationWallTypeId) ?? draft.building.foundationWallTypes[0];
  const activeWall = draft.building.wallTypes.find((type) => type.id === draft.building.activeWallTypeId) ?? draft.building.wallTypes[0];
  const activeDoor = draft.building.openingTypes.find((type) => type.id === draft.building.activeDoorTypeId);
  const activeWindow = draft.building.openingTypes.find((type) => type.id === draft.building.activeWindowTypeId);
  const activeRoofType = draft.building.roofTypes.find((type) => type.id === draft.building.activeRoofTypeId) ?? draft.building.roofTypes[0];
  const roofBearingStory = draft.building.stories.at(-1)!;
  const roofBearingCalculation = calculateStoryElevations(draft.building).find((item) => item.storyId === roofBearingStory.id);
  const roofReference = calculateRoofReferenceDimensions(draft.building.roofSettings, roofBearingCalculation?.roughCeilingElevation ?? 0, 144);
  const wallTypesForUse = (use: WallUse) => draft.building.wallTypes.filter((type) => wallTypeMatchesUse(type, use));
  const stepIndex = PROJECT_SETUP_STEPS.findIndex((item) => item.id === step);

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

  const changeProjectInformation = (change: Partial<ProjectInformation>) => {
    setDraft((current) => ({
      ...cloneDocument(current),
      projectInformation: { ...current.projectInformation, ...change },
    }));
    setError("");
  };
  const changeBuilding = (building: BuildingStructure) => {
    setDraft((current) => ({ ...cloneDocument(current), building: cloneBuildingStructure(building) }));
    setError("");
  };
  const changeWallDefault = (use: WallUse, wallTypeId: string) => {
    const building = cloneBuildingStructure(draft.building);
    if (!building.wallTypes.some((type) => type.id === wallTypeId && wallTypeMatchesUse(type, use))) return;
    if (use === "exterior") building.defaultExteriorWallTypeId = wallTypeId;
    else if (use === "interior-bearing") building.defaultInteriorBearingWallTypeId = wallTypeId;
    else building.defaultInteriorPartitionWallTypeId = wallTypeId;
    if (building.activeWallUse === use) building.activeWallTypeId = wallTypeId;
    changeBuilding(building);
  };
  const changeStartingWallUse = (use: WallUse) => {
    const building = cloneBuildingStructure(draft.building);
    building.activeWallUse = use;
    building.activeWallTypeId = defaultWallTypeIdForUse(building, use);
    changeBuilding(building);
  };
  const changeRoofDefaults = (change: Partial<RoofSettings>) => {
    const building = cloneBuildingStructure(draft.building);
    building.roofSettings = { ...building.roofSettings, ...change };
    changeBuilding(building);
  };
  const replaceSelectedStory = (change: Partial<typeof selectedStory>) => {
    const building = cloneBuildingStructure(draft.building);
    const index = building.stories.findIndex((story) => story.id === selectedStory.id);
    if (index < 0) return;
    building.stories[index] = { ...building.stories[index], ...change };
    changeBuilding(building);
  };
  const addStory = (placement: "above" | "below") => {
    const building = addBuildingStory(draft.building, selectedStory.id, placement);
    if (!building) return;
    changeBuilding(building);
    setSelectedStoryId(building.activeStoryId);
  };
  const deleteStory = () => {
    const building = removeBuildingStory(draft.building, selectedStory.id);
    if (!building) return;
    changeBuilding(building);
    setSelectedStoryId(building.activeStoryId);
  };
  const applyTemplate = (template: "one-story" | "basement" | "two-story-basement") => {
    const next = cloneDocument(NEW_PROJECT_DOCUMENT);
    next.projectInformation = { ...draft.projectInformation };
    let building = cloneBuildingStructure(next.building);
    if (template === "basement" || template === "two-story-basement") {
      const withBasement = addBuildingStory(building, "story-01", "below");
      if (withBasement) {
        building = withBasement;
        const basementIndex = building.stories.findIndex((story) => story.id === building.activeStoryId);
        if (basementIndex >= 0) building.stories[basementIndex] = {
          ...applyFloorStructurePreset(building.stories[basementIndex], "basement-slab"),
          name: "Basement",
          purpose: "basement",
          roughCeilingHeight: 93,
        };
      }
    }
    if (template === "two-story-basement") {
      const withSecondFloor = addBuildingStory(building, "story-01", "above");
      if (withSecondFloor) {
        building = withSecondFloor;
        const secondIndex = building.stories.findIndex((story) => story.id === building.activeStoryId);
        if (secondIndex >= 0) building.stories[secondIndex] = { ...building.stories[secondIndex], name: "Second Floor" };
      }
    }
    building.activeStoryId = "story-01";
    building.anchorStoryId = "story-01";
    next.building = building;
    setDraft(next);
    setSelectedStoryId("story-01");
    setError("");
  };
  const save = () => {
    const normalizedName = name.trim();
    if (!normalizedName || normalizedName.length > 120) {
      setStep("project");
      setError("Enter a project name between 1 and 120 characters.");
      return;
    }
    if (!roofSettingsAreValid(draft.building.roofSettings)) {
      setStep("defaults");
      setError("Review the Roof pitch, heel, overhang, framing spacing, member sizes, ridge, birdsmouth, fascia, and subfascia values before continuing.");
      return;
    }
    if (!buildingStructureIsValid(draft.building)) {
      setStep("stories");
      setError("Review Story names, heights, and assemblies before continuing.");
      return;
    }
    onSave(normalizedName, cloneDocument(draft));
  };
  const openAdvanced = (target: "foundation" | "roof" | "stories" | "walls") => {
    const normalizedName = name.trim();
    if (!normalizedName || !buildingStructureIsValid(draft.building)) {
      setError("Complete the required Project and Story settings before opening an advanced manager.");
      return;
    }
    onSave(normalizedName, cloneDocument(draft));
    onOpenAdvanced(target);
  };
  const reviewItems = [
    { complete: Boolean(name.trim()), label: "Project name", value: name.trim() || "Required" },
    { complete: draft.building.stories.length > 0, label: "Building Stories", value: `${draft.building.stories.length} configured` },
    { complete: draft.building.stories.every((story) => story.roughCeilingHeight > 0), label: "Ceiling / plate heights", value: "Set for every Story" },
    { complete: draft.building.stories.every((story) => story.floorStructure.layers.length > 0), label: "Floor structure", value: "Assembly assigned to every Story" },
    { complete: Boolean(activeFoundation), label: "Foundation default", value: activeFoundation?.name ?? "Required" },
    { complete: Boolean(activeWall), label: "Starting Wall use", value: `${WALL_USE_LABELS[draft.building.activeWallUse]} · ${activeWall?.name ?? "Required"}` },
    { complete: ["exterior", "interior-bearing", "interior-partition"].every((use) => wallTypesForUse(use as WallUse).length > 0), label: "Wall defaults", value: "Exterior, bearing, and partition assigned" },
    { complete: Boolean(roofReference && activeRoofType), label: "Roof defaults", value: roofReference && activeRoofType ? `${activeRoofType.name} · ${draft.building.roofSettings.pitchRise}:12 · ${formatArchitectural(draft.building.roofSettings.framingSpacing)} O.C.` : "Review required" },
  ];

  return (
    <div className="story-manager-backdrop project-setup-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="project-setup-dialog" role="dialog" aria-modal="true" aria-labelledby="project-setup-title">
        <header className="project-setup-header">
          <div><strong id="project-setup-title">{mode === "new" ? "New Project Quick Setup" : "Project Setup Center"}</strong><span>{mode === "new" ? "Establish the building before drawing. Everything can be refined later." : "Review the project-wide settings that drive Stories, Rooms, Walls, roofs, and openings."}</span></div>
          <button type="button" onClick={onCancel} aria-label="Close Project Setup">×</button>
        </header>
        <div className="project-setup-layout">
          <nav className="project-setup-nav" aria-label="Project setup categories">
            <div className="project-setup-progress"><span>Setup progress</span><strong>{reviewItems.filter((item) => item.complete).length} of {reviewItems.length} ready</strong><i><b style={{ width: `${reviewItems.filter((item) => item.complete).length / reviewItems.length * 100}%` }} /></i></div>
            {PROJECT_SETUP_STEPS.map((item, index) => <button type="button" key={item.id} className={step === item.id ? "is-active" : ""} onClick={() => { setStep(item.id); setError(""); }}><b>{index + 1}</b><span><strong>{item.label}</strong><small>{item.note}</small></span></button>)}
            <div className="project-setup-scope"><strong>Advanced managers</strong><span>Detailed assemblies stay in their dedicated editors so this setup remains readable. Current setup changes are applied first.</span>{mode === "edit" ? <><button type="button" onClick={() => openAdvanced("stories")}>Story &amp; Assemblies</button><button type="button" onClick={() => openAdvanced("foundation")}>Foundation Types</button><button type="button" onClick={() => openAdvanced("walls")}>Wall Types</button><button type="button" onClick={() => openAdvanced("roof")}>Roof Design Defaults</button></> : <small>Create the project first, then use the advanced managers when needed.</small>}</div>
          </nav>
          <main className="project-setup-content">
            {step === "project" ? <>
              <header><span>1 · Project</span><strong>Name the job and choose a sensible starting structure.</strong><p>Only the project name is required. The remaining fields travel with the saved project and can be completed as information becomes available.</p></header>
              {mode === "new" ? <section className="project-template-grid" aria-label="Starting templates"><button type="button" onClick={() => applyTemplate("one-story")}><b>▱</b><strong>One Story</strong><span>First Floor with a wood-framed floor</span></button><button type="button" onClick={() => applyTemplate("basement")}><b>▤</b><strong>Basement + First Floor</strong><span>Separate Basement Story with a concrete slab</span></button><button type="button" onClick={() => applyTemplate("two-story-basement")}><b>▥</b><strong>Two Stories + Basement</strong><span>Basement, First Floor, and Second Floor</span></button></section> : null}
              <section className="project-setup-card"><header><strong>Project Information</strong><span>Saved in the .mbproj file</span></header><div className="project-setup-fields">
                <label className="is-wide"><span>Project name *</span><input value={name} maxLength={120} onChange={(event) => { setName(event.target.value); setError(""); }} /></label>
                <label><span>Project number</span><input value={draft.projectInformation.projectNumber} maxLength={80} onChange={(event) => changeProjectInformation({ projectNumber: event.target.value })} /></label>
                <label><span>Project type</span><select value={draft.projectInformation.projectType} onChange={(event) => changeProjectInformation({ projectType: event.target.value as ProjectType })}>{Object.entries(PROJECT_TYPE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                <label><span>Client</span><input value={draft.projectInformation.clientName} maxLength={120} onChange={(event) => changeProjectInformation({ clientName: event.target.value })} /></label>
                <label><span>Measurement format</span><output>US Architectural · 1/16&quot;</output></label>
                <label className="is-wide"><span>Project address</span><input value={draft.projectInformation.address} maxLength={240} onChange={(event) => changeProjectInformation({ address: event.target.value })} /></label>
              </div><p className="project-setup-note">Metric and additional display precisions are planned. Internal model geometry currently remains inches for dependable architectural input.</p></section>
            </> : null}
            {step === "stories" ? <>
              <header><span>2 · Stories</span><strong>Set the vertical building structure once.</strong><p>Story values establish the defaults. Room settings can override floor and ceiling assemblies or heights only where needed.</p></header>
              <section className="project-story-workspace"><div className="project-story-table"><header><span>Story</span><span>Type</span><span>Rough floor</span><span>Ceiling</span></header>{[...draft.building.stories].reverse().map((story) => { const calculation = calculateStoryElevations(draft.building).find((item) => item.storyId === story.id); return <button type="button" key={story.id} className={story.id === selectedStory.id ? "is-selected" : ""} onClick={() => setSelectedStoryId(story.id)}><strong>{story.name}</strong><span>{STORY_PURPOSE_LABELS[story.purpose]}</span><span>{calculation ? formatSignedArchitectural(calculation.roughFloorElevation) : "—"}</span><span>{formatArchitectural(story.roughCeilingHeight)}</span></button>; })}<footer><button type="button" onClick={() => addStory("above")}>＋ Above</button><button type="button" onClick={() => addStory("below")}>＋ Below</button><button type="button" onClick={deleteStory} disabled={draft.building.stories.length === 1}>Delete</button></footer></div>
                <div className="project-story-editor"><header><strong>{selectedStory.name}</strong><span>Defaults for this Story</span></header><div className="project-setup-fields"><label><span>Story name</span><input value={selectedStory.name} maxLength={80} onChange={(event) => replaceSelectedStory({ name: event.target.value })} /></label><label><span>Story type</span><select value={selectedStory.purpose} onChange={(event) => replaceSelectedStory({ purpose: event.target.value as StoryPurpose })}>{Object.entries(STORY_PURPOSE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><StoryDimensionInput key={`${selectedStory.id}:${selectedStory.roughCeilingHeight}`} label="Rough ceiling / plate height" value={selectedStory.roughCeilingHeight} onChange={(roughCeilingHeight) => replaceSelectedStory({ roughCeilingHeight })} /><label><span>Calculated rough floor</span><output>{selectedCalculation ? formatSignedArchitectural(selectedCalculation.roughFloorElevation) : "—"}</output></label></div><div className="project-floor-presets"><span>Floor structure</span>{Object.entries(FLOOR_STRUCTURE_PRESET_LABELS).map(([preset, label]) => <button type="button" key={preset} onClick={() => replaceSelectedStory(applyFloorStructurePreset(selectedStory, preset as FloorStructurePreset))}>{label}</button>)}</div><dl><div><dt>Floor depth</dt><dd>{selectedCalculation ? formatArchitectural(selectedCalculation.floorStructureThickness) : "—"}</dd></div><div><dt>Finished clear height</dt><dd>{selectedCalculation ? formatArchitectural(selectedCalculation.finishedClearHeight) : "—"}</dd></div><div><dt>Finished ceiling</dt><dd>{selectedCalculation ? formatSignedArchitectural(selectedCalculation.finishedCeilingElevation) : "—"}</dd></div></dl></div>
              </section>
            </> : null}
            {step === "defaults" ? <>
              <header><span>3 · Defaults</span><strong>Choose what the first drafting tools will use.</strong><p>These choices select active reusable Types. Editing the construction layers remains in the detailed managers.</p></header>
              <section className="project-default-grid">
                <article><header><b>▰</b><div><strong>Foundation</strong><span>Support, footing, and sill edge</span></div></header><label><span>Active Foundation Wall type</span><select value={draft.building.activeFoundationWallTypeId} onChange={(event) => changeBuilding({ ...cloneBuildingStructure(draft.building), activeFoundationWallTypeId: event.target.value })}>{draft.building.foundationWallTypes.map((type) => <option value={type.id} key={type.id}>{type.name}</option>)}</select></label><dl><div><dt>Condition</dt><dd>{activeFoundation?.condition.replaceAll("-", " ")}</dd></div><div><dt>Sill plates</dt><dd>{activeFoundation?.sill.foundationPlateCount}</dd></div></dl></article>
                <article><header><b>▥</b><div><strong>Walls</strong><span>Defaults by drawing use</span></div></header><label><span>Exterior Wall</span><select value={draft.building.defaultExteriorWallTypeId} onChange={(event) => changeWallDefault("exterior", event.target.value)}>{wallTypesForUse("exterior").map((type) => <option value={type.id} key={type.id}>{type.name}</option>)}</select></label><label><span>Interior Bearing Wall</span><select value={draft.building.defaultInteriorBearingWallTypeId} onChange={(event) => changeWallDefault("interior-bearing", event.target.value)}>{wallTypesForUse("interior-bearing").map((type) => <option value={type.id} key={type.id}>{type.name}</option>)}</select></label><label><span>Interior Partition</span><select value={draft.building.defaultInteriorPartitionWallTypeId} onChange={(event) => changeWallDefault("interior-partition", event.target.value)}>{wallTypesForUse("interior-partition").map((type) => <option value={type.id} key={type.id}>{type.name}</option>)}</select></label><label><span>Starting Wall use</span><select value={draft.building.activeWallUse} onChange={(event) => changeStartingWallUse(event.target.value as WallUse)}>{Object.entries(WALL_USE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><dl><div><dt>First Wall Type</dt><dd>{activeWall?.name ?? "—"}</dd></div><div><dt>Total thickness</dt><dd>{activeWall ? formatArchitectural(assemblyTotalThickness(activeWall)) : "—"}</dd></div></dl></article>
                <article><header><b>▣</b><div><strong>Doors &amp; Windows</strong><span>Reusable opening Types</span></div></header><label><span>Active Door type</span><select value={draft.building.activeDoorTypeId} onChange={(event) => changeBuilding({ ...cloneBuildingStructure(draft.building), activeDoorTypeId: event.target.value })}>{draft.building.openingTypes.filter((type) => type.kind === "door").map((type) => <option value={type.id} key={type.id}>{type.name}</option>)}</select></label><label><span>Active Window type</span><select value={draft.building.activeWindowTypeId} onChange={(event) => changeBuilding({ ...cloneBuildingStructure(draft.building), activeWindowTypeId: event.target.value })}>{draft.building.openingTypes.filter((type) => type.kind === "window").map((type) => <option value={type.id} key={type.id}>{type.name}</option>)}</select></label><dl><div><dt>Door</dt><dd>{activeDoor?.name}</dd></div><div><dt>Window</dt><dd>{activeWindow?.name}</dd></div></dl></article>
                <article><header><b>⌂</b><div><strong>Roof</strong><span>Assembly, exterior heel, and plane defaults</span></div></header><label><span>Active Roof Type</span><select value={draft.building.activeRoofTypeId} onChange={(event) => changeBuilding({ ...cloneBuildingStructure(draft.building), activeRoofTypeId: event.target.value })}>{draft.building.roofTypes.map((type) => <option value={type.id} key={type.id}>{type.name}</option>)}</select></label><label><span>Framing method</span><select value={draft.building.roofSettings.framingMethod} onChange={(event) => changeRoofDefaults({ framingMethod: event.target.value as RoofFramingMethod })}><option value="rafters">Conventional rafters</option><option value="trusses">Roof trusses</option></select></label><StoryDimensionInput key={`setup-roof-spacing:${draft.building.roofSettings.framingSpacing}`} label="Framing spacing" value={draft.building.roofSettings.framingSpacing} onChange={(framingSpacing) => changeRoofDefaults({ framingSpacing })} /><label><span>Pitch · rise in 12</span><input type="number" min="0.25" max="24" step="0.0625" value={draft.building.roofSettings.pitchRise} onChange={(event) => changeRoofDefaults({ pitchRise: Number(event.target.value) })} /></label><StoryDimensionInput key={`setup-roof-heel:${draft.building.roofSettings.heightAbovePlate}`} label="Height above plate / heel" value={draft.building.roofSettings.heightAbovePlate} onChange={(heightAbovePlate) => changeRoofDefaults({ heightAbovePlate })} /><StoryDimensionInput key={`setup-roof-overhang:${draft.building.roofSettings.overhang}`} label="Horizontal overhang" allowZero value={draft.building.roofSettings.overhang} onChange={(overhang) => changeRoofDefaults({ overhang })} /><dl><div><dt>Assembly depth</dt><dd>{activeRoofType ? formatArchitectural(assemblyTotalThickness(activeRoofType)) : "—"}</dd></div><div><dt>Top of plate</dt><dd>{roofBearingCalculation ? formatSignedArchitectural(roofBearingCalculation.roughCeilingElevation) : "—"}</dd></div><div><dt>Exterior heel</dt><dd>{roofReference ? formatSignedArchitectural(roofReference.heelElevation) : "—"}</dd></div></dl></article>
              </section><p className="project-setup-note">The Wall tool starts with the selected Wall use. While drawing, switch between Exterior, Interior Bearing, and Interior Partition without reopening Project Setup; each use recalls its assigned default Type.</p>
            </> : null}
            {step === "review" ? <>
              <header><span>4 · Review</span><strong>Confirm the model-driving settings.</strong><p>This is a setup check, not a lock. Every value remains editable from Manage after the project opens.</p></header>
              <section className="project-review-list">{reviewItems.map((item) => <div key={item.label} className={item.complete ? "is-complete" : "is-required"}><b>{item.complete ? "✓" : "!"}</b><span><strong>{item.label}</strong><small>{item.value}</small></span></div>)}</section>
              <section className="project-review-summary"><div><span>Project</span><strong>{name.trim() || "Unnamed"}</strong><small>{PROJECT_TYPE_LABELS[draft.projectInformation.projectType]}{draft.projectInformation.projectNumber ? ` · ${draft.projectInformation.projectNumber}` : ""}</small></div><div><span>Building</span><strong>{draft.building.stories.length} Stor{draft.building.stories.length === 1 ? "y" : "ies"}</strong><small>{draft.building.stories.map((story) => story.name).join(" · ")}</small></div><div><span>First tools</span><strong>{activeWall?.name}</strong><small>{activeFoundation?.name}</small></div></section>
            </> : null}
          </main>
        </div>
        {error ? <p className="project-setup-error" role="alert">{error}</p> : null}
        <footer className="project-setup-footer"><span>{mode === "new" ? "Creates a blank model in Top view" : "Changes are added to Undo history"}</span><div><button type="button" onClick={onCancel}>Cancel</button><button type="button" onClick={() => setStep(PROJECT_SETUP_STEPS[Math.max(0, stepIndex - 1)].id)} disabled={stepIndex === 0}>Back</button>{stepIndex < PROJECT_SETUP_STEPS.length - 1 ? <button type="button" className="story-save" onClick={() => setStep(PROJECT_SETUP_STEPS[stepIndex + 1].id)}>Next</button> : <button type="button" className="story-save" onClick={save}>{mode === "new" ? "Create Project" : "Apply Project Setup"}</button>}</div></footer>
      </section>
    </div>
  );
}
