/**
 * Room manager: identity, ceiling height overrides, and per-Room assembly
 * overrides. Extracted from app/model-builder-app.tsx.
 */
import { useEffect, useState } from "react";
import {
  StoryAssemblyEditor,
  StoryDimensionInput,
} from "@/features/dialogs/assembly-editor";
import {
  ROOM_TYPES,
} from "@/features/project-presentation";
import {
  formatArchitectural,
  formatSignedArchitectural,
} from "@/lib/architectural-units";
import {
  assemblyTotalThickness,
  calculateStoryElevations,
  cloneLayeredAssembly,
} from "@/lib/building-stories";
import {
  polylineArea,
  rectangleFromCorners,
} from "@/lib/cad-polyline";
import {
  type ModelDocument,
  PLATFORM_OPENING_CUTS,
  PLATFORM_OPENING_KINDS,
  type PlatformOpening,
  RoomAnnotationObject,
  type RoomObject,
  addPlatformOpening,
  cloneDocument,
  continuePlatformOpening,
  deletePlatformOpening,
  disconnectPlatformOpeningContinuity,
  effectiveRoomSettings,
  findLayer,
  platformOpeningContinuity,
  platformOpeningContinuityIsValid,
  refreshRoomsForStory,
  roomAnnotationIsValid,
  roomHorizontalPlatformSolution,
  roomObjectIsValid,
  updatePlatformOpening,
  updateRoomAnnotation,
} from "@/lib/document-model";

type RoomAssemblyOverrideKey = "floorStructureOverride" | "floorFinishOverride" | "ceilingStructureOverride" | "ceilingFinishOverride";

export function RoomManagerDialog({
  document,
  initialRoomId,
  onCancel,
  onSave,
}: {
  document: ModelDocument;
  initialRoomId?: string | null;
  onCancel: () => void;
  onSave: (document: ModelDocument) => void;
}) {
  const [draft, setDraft] = useState(() => cloneDocument(document));
  const initialRoom = document.rooms.find((room) => room.id === initialRoomId);
  const [selectedStoryId, setSelectedStoryId] = useState(initialRoom?.storyId ?? document.building.activeStoryId);
  const [selectedRoomId, setSelectedRoomId] = useState(initialRoom?.id ?? document.rooms.find((room) => room.storyId === document.building.activeStoryId)?.id ?? null);
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
  const story = draft.building.stories.find((candidate) => candidate.id === selectedStoryId) ?? draft.building.stories[0];
  const rooms = draft.rooms.filter((room) => room.storyId === story.id);
  const selected = rooms.find((room) => room.id === selectedRoomId) ?? rooms[0] ?? null;
  const storyElevation = calculateStoryElevations(draft.building).find((item) => item.storyId === story.id)?.roughFloorElevation ?? 0;
  const effective = selected ? effectiveRoomSettings(selected, story, storyElevation) : null;
  const generatedPlatforms = selected ? roomHorizontalPlatformSolution(draft, selected) : null;
  const annotations = selected ? draft.roomAnnotations.filter((annotation) => annotation.roomId === selected.id) : [];
  const perimeterFloorEdgeCount = generatedPlatforms?.floorEdgeConditions.filter((edge) => edge.rule === "perimeter-main-exterior").length ?? 0;
  const foundationFloorEdgeCount = generatedPlatforms?.floorEdgeConditions.filter((edge) => edge.rule === "foundation-sill-exterior").length ?? 0;
  const sharedFloorEdgeCount = generatedPlatforms?.floorEdgeConditions.filter((edge) => edge.rule === "shared-wall-reference").length ?? 0;
  const formatRoomArea = (room: RoomObject) => `${(polylineArea(room.boundary) / 144).toLocaleString(undefined, { maximumFractionDigits: 2 })} sq ft`;
  const roomDimensions = (room: RoomObject) => {
    const xs = room.boundary.vertices.map((point) => point.x);
    const ys = room.boundary.vertices.map((point) => point.y);
    return { width: Math.max(...xs) - Math.min(...xs), depth: Math.max(...ys) - Math.min(...ys) };
  };
  const selectStory = (storyId: string) => {
    setSelectedStoryId(storyId);
    setSelectedRoomId(draft.rooms.find((room) => room.storyId === storyId)?.id ?? null);
    setError("");
  };
  const replaceSelected = (change: Partial<RoomObject>) => {
    if (!selected) return;
    setDraft((current) => ({ ...cloneDocument(current), rooms: current.rooms.map((room) => room.id === selected.id ? { ...room, ...change } : room) }));
    setError("");
  };
  const replaceAnnotation = (kind: RoomAnnotationObject["kind"], change: Partial<Pick<RoomAnnotationObject, "visible">>) => {
    const annotation = annotations.find((candidate) => candidate.kind === kind);
    if (!annotation) return;
    const next = updateRoomAnnotation(draft, annotation.id, change);
    if (next) setDraft(next);
  };
  const detect = () => {
    const next = refreshRoomsForStory(draft, story.id);
    if (!next) {
      setError("Rooms could not be updated. Check that the Story walls form valid closed areas.");
      return;
    }
    const firstRoom = next.rooms.find((room) => room.storyId === story.id) ?? null;
    setDraft(next);
    setSelectedRoomId((current) => next.rooms.some((room) => room.id === current) ? current : firstRoom?.id ?? null);
    setError("");
  };
  const setAssemblyOverride = (key: RoomAssemblyOverrideKey, enabled: boolean) => {
    if (!selected) return;
    const storyKey = key.replace("Override", "") as "floorStructure" | "floorFinish" | "ceilingStructure" | "ceilingFinish";
    replaceSelected({ [key]: enabled ? cloneLayeredAssembly(story[storyKey]) : null });
  };
  const openingBounds = (opening: PlatformOpening) => {
    const xs = opening.boundary.vertices.map((point) => point.x);
    const ys = opening.boundary.vertices.map((point) => point.y);
    const minimumX = Math.min(...xs);
    const maximumX = Math.max(...xs);
    const minimumY = Math.min(...ys);
    const maximumY = Math.max(...ys);
    return {
      centerX: (minimumX + maximumX) / 2,
      centerY: (minimumY + maximumY) / 2,
      depth: maximumY - minimumY,
      width: maximumX - minimumX,
    };
  };
  const replaceOpening = (openingId: string, change: Partial<Omit<PlatformOpening, "id">>) => {
    if (!selected) return;
    const next = updatePlatformOpening(draft, selected.id, openingId, change);
    if (!next) {
      setError("Platform Openings must remain inside the Room, avoid overlaps, and preserve any connected vertical path.");
      return;
    }
    setDraft(next);
    setError("");
  };
  const replaceOpeningRectangle = (opening: PlatformOpening, change: Partial<{ centerX: number; centerY: number; depth: number; width: number }>) => {
    const bounds = { ...openingBounds(opening), ...change };
    const boundary = rectangleFromCorners(
      { x: bounds.centerX - bounds.width / 2, y: bounds.centerY - bounds.depth / 2 },
      { x: bounds.centerX + bounds.width / 2, y: bounds.centerY + bounds.depth / 2 },
      opening.boundary.elevation,
    );
    if (boundary) replaceOpening(opening.id, { boundary });
  };
  const addOpening = () => {
    if (!selected) return;
    const result = addPlatformOpening(draft, selected.id, "stairwell", "both");
    if (!result) {
      setError("A centered opening could not fit inside this Room. Adjust the Room shape before adding an opening.");
      return;
    }
    setDraft(result.document);
    setError("");
  };
  const removeOpening = (openingId: string) => {
    if (!selected) return;
    const next = deletePlatformOpening(draft, selected.id, openingId);
    if (next) setDraft(next);
    setError("");
  };
  const continueOpening = (openingId: string, direction: "above" | "below") => {
    if (!selected) return;
    const next = continuePlatformOpening(draft, selected.id, openingId, direction);
    if (!next) {
      setError(`The opening cannot continue ${direction}. Detect Rooms on the adjacent Story and make sure the same footprint fits fully inside one Room.`);
      return;
    }
    setDraft(next);
    setError("");
  };
  const disconnectOpening = (openingId: string) => {
    if (!selected) return;
    const next = disconnectPlatformOpeningContinuity(draft, selected.id, openingId);
    if (next) setDraft(next);
    setError("");
  };
  const save = () => {
    const next = cloneDocument(draft);
    if (next.rooms.some((room) => !roomObjectIsValid(room, next)) || next.roomAnnotations.some((annotation) => !roomAnnotationIsValid(annotation, next)) || !platformOpeningContinuityIsValid(next)) {
      setError("Check the Room settings and make sure every connected platform opening stays aligned through adjacent Stories.");
      return;
    }
    onSave(next);
  };
  const overrideEditor = (key: RoomAssemblyOverrideKey, label: string) => {
    if (!selected) return null;
    const assembly = selected[key];
    return (
      <section className="room-override-section" key={key}>
        <label><input type="checkbox" checked={assembly !== null} onChange={(event) => setAssemblyOverride(key, event.target.checked)} /><span>{assembly ? `${label} override` : `Use Story ${label.toLowerCase()}`}</span></label>
        {assembly ? <StoryAssemblyEditor assembly={assembly} onChange={(next) => replaceSelected({ [key]: next })} /> : null}
      </section>
    );
  };
  return (
    <div className="story-manager-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="story-manager room-manager" role="dialog" aria-modal="true" aria-labelledby="room-manager-title">
        <header className="story-manager-header"><div><strong id="room-manager-title">Room Manager</strong><span>Closed Wall loops create Rooms. Each Room inherits its Story settings until an override is enabled.</span></div><button type="button" onClick={onCancel} aria-label="Close Room Manager">×</button></header>
        <div className="story-manager-body">
          <aside className="story-list">
            <header><strong>{story.name}</strong><span>{rooms.length} detected Room{rooms.length === 1 ? "" : "s"}</span></header>
            <label className="room-story-picker"><span>Story</span><select value={story.id} onChange={(event) => selectStory(event.target.value)}>{draft.building.stories.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.name}</option>)}</select></label>
            {rooms.map((room) => <button type="button" key={room.id} className={room.id === selected?.id ? "is-selected" : ""} onClick={() => setSelectedRoomId(room.id)}><strong>{room.name}</strong><span>{formatRoomArea(room)} · {room.boundaryWallIds.length} walls · {room.platformOpenings.length} opening{room.platformOpenings.length === 1 ? "" : "s"}</span>{room.roughCeilingHeightOverride !== null || room.roughFloorOffset !== 0 || room.floorStructureOverride || room.floorFinishOverride || room.ceilingStructureOverride || room.ceilingFinishOverride ? <small>OVERRIDES</small> : <small>STORY DEFAULTS</small>}</button>)}
            <div className="story-list-actions"><button type="button" onClick={detect}>↻ Detect / Update Rooms</button></div>
          </aside>
          <main className="story-editor">
            {selected && effective ? <>
              <section className="story-editor-summary room-editor-summary">
                <label><span>Room type</span><select value={selected.roomType} onChange={(event) => replaceSelected({ roomType: event.target.value, name: selected.name === "Unassigned" || ROOM_TYPES.includes(selected.name as (typeof ROOM_TYPES)[number]) ? event.target.value : selected.name })}>{ROOM_TYPES.map((type) => <option value={type} key={type}>{type}</option>)}</select></label>
                <label><span>Room name</span><input value={selected.name} maxLength={120} onChange={(event) => replaceSelected({ name: event.target.value })} /></label>
                <label><span>Enclosed area</span><output>{formatRoomArea(selected)}</output></label>
                <label><span>Boundary</span><output>{selected.boundaryWallIds.length} Walls</output></label>
              </section>
              <section className="room-annotation-settings" aria-label="Room label and annotation settings">
                <header><div><strong>Room Label</strong><span>Linked annotations with independent layer controls</span></div></header>
                <div className="room-annotation-grid">
                  {(["label", "area", "interior-dimensions", "rough-ceiling-height"] as const).map((kind) => {
                    const annotation = annotations.find((candidate) => candidate.kind === kind);
                    const label = kind === "label" ? "Room name" : kind === "area" ? "Standard area" : kind === "interior-dimensions" ? "Interior dimensions" : "Rough ceiling height";
                    const layer = annotation ? findLayer(draft, annotation.layerId) : null;
                    return <label key={kind}><input type="checkbox" aria-label={`Show ${label}`} checked={Boolean(annotation?.visible)} onChange={(event) => replaceAnnotation(kind, { visible: event.target.checked })} /><span><strong>{label}</strong><small>{layer?.name ?? "Missing layer"}</small></span></label>;
                  })}
                </div>
                <div className="room-annotation-preview">
                  <strong>{selected.name}</strong>
                  <span>{formatRoomArea(selected)}</span>
                  <span>{formatArchitectural(roomDimensions(selected).width)} × {formatArchitectural(roomDimensions(selected).depth)}</span>
                  <span>CLG {formatArchitectural(effective.roughCeilingHeight)}</span>
                </div>
                <StoryDimensionInput key={`${selected.id}:label-ceiling:${effective.roughCeilingHeight}`} label="Ceiling label value" value={effective.roughCeilingHeight} onChange={(roughCeilingHeightOverride) => replaceSelected({ roughCeilingHeightOverride })} />
                <p>Editing the ceiling label creates a Room override. Story defaults remain unchanged.</p>
              </section>
              <section className="room-height-settings">
                <StoryDimensionInput signed key={`${selected.id}:floor:${selected.roughFloorOffset}`} label="Rough floor offset" value={selected.roughFloorOffset} onChange={(roughFloorOffset) => replaceSelected({ roughFloorOffset })} />
                <label className="room-inherit-toggle"><input type="checkbox" checked={selected.roughCeilingHeightOverride !== null} onChange={(event) => replaceSelected({ roughCeilingHeightOverride: event.target.checked ? story.roughCeilingHeight : null })} /><span>{selected.roughCeilingHeightOverride === null ? "Use Story ceiling height" : "Override ceiling height"}</span></label>
                {selected.roughCeilingHeightOverride !== null ? <StoryDimensionInput key={`${selected.id}:ceiling:${selected.roughCeilingHeightOverride}`} label="Rough ceiling / plate height" value={selected.roughCeilingHeightOverride} onChange={(roughCeilingHeightOverride) => replaceSelected({ roughCeilingHeightOverride })} /> : <label className="story-field"><span>Effective rough ceiling</span><output className="room-output">{formatArchitectural(effective.roughCeilingHeight)}</output></label>}
              </section>
              <section className="story-calculated-grid room-calculated-grid" aria-label="Effective Room settings">
                <div><span>Effective rough floor</span><strong>{formatSignedArchitectural(effective.roughFloorElevation)}</strong></div>
                <div><span>Effective ceiling height</span><strong>{formatArchitectural(effective.roughCeilingHeight)}</strong></div>
                <div><span>Floor structure</span><strong>{formatArchitectural(assemblyTotalThickness(effective.floorStructure))}</strong></div>
                <div><span>Floor finish</span><strong>{formatArchitectural(assemblyTotalThickness(effective.floorFinish))}</strong></div>
                <div><span>Ceiling structure</span><strong>{formatArchitectural(assemblyTotalThickness(effective.ceilingStructure))}</strong></div>
                <div><span>Ceiling finish</span><strong>{formatArchitectural(assemblyTotalThickness(effective.ceilingFinish))}</strong></div>
              </section>
              <section className="story-calculated-grid room-calculated-grid" aria-label="Generated Room platforms">
                <div><span>Generated floor structure top</span><strong>{generatedPlatforms ? formatSignedArchitectural(generatedPlatforms.roughFloorElevation) : "—"}</strong></div>
                <div><span>Generated finished floor</span><strong>{generatedPlatforms ? formatSignedArchitectural(generatedPlatforms.finishedFloorElevation) : "—"}</strong></div>
                <div><span>Generated rough ceiling</span><strong>{generatedPlatforms ? formatSignedArchitectural(generatedPlatforms.roughCeilingElevation) : "—"}</strong></div>
                <div><span>Generated finished ceiling</span><strong>{generatedPlatforms ? formatSignedArchitectural(generatedPlatforms.finishedCeilingElevation) : "—"}</strong></div>
              </section>
              <section className="room-platform-edges" aria-label="Resolved floor platform edges">
                <header><div><strong>Floor Platform Edges</strong><span>Automatic Wall-aware edge rules</span></div><output>{foundationFloorEdgeCount} foundation · {perimeterFloorEdgeCount} framed · {sharedFloorEdgeCount} shared</output></header>
                {generatedPlatforms?.floorEdgeConditions.map((edge, index) => {
                  const wall = edge.wallId ? draft.lines.find((line) => line.id === edge.wallId) : null;
                  const ruleLabel = edge.rule === "foundation-sill-exterior"
                    ? "Foundation sill exterior"
                    : edge.rule === "perimeter-main-exterior"
                    ? "Exterior face of Main layer"
                    : edge.rule === "shared-wall-reference"
                      ? "Shared Room boundary"
                      : "Room boundary fallback";
                  return <div className="room-platform-edge" key={`${edge.wallId ?? "fallback"}-${index}`}><span>{wall?.name ?? `Boundary edge ${index + 1}`}</span><strong>{ruleLabel}</strong><small>{Math.abs(edge.offsetFromReference) < 1 / 32 ? "On Wall reference" : `${formatArchitectural(Math.abs(edge.offsetFromReference))} from Wall reference`}</small></div>;
                })}
                <p>Where a Foundation Wall aligns with a perimeter edge, its sill exterior edge takes priority. Otherwise the framed Wall Main-layer exterior remains the default. Manual edge offsets remain reserved for exceptional details.</p>
              </section>
              <section className="room-platform-openings" aria-label="Platform Openings">
                <header><div><strong>Platform Openings</strong><span>Hosted cuts for stairs, shafts, and open-below areas</span></div><button type="button" onClick={addOpening}>+ Add Opening</button></header>
                {selected.platformOpenings.length ? selected.platformOpenings.map((opening) => {
                  const bounds = openingBounds(opening);
                  const continuity = platformOpeningContinuity(draft, selected.id, opening.id);
                  const storyIndex = draft.building.stories.findIndex((candidate) => candidate.id === selected.storyId);
                  const canContinueBelow = storyIndex > 0 && !continuity?.below;
                  const canContinueAbove = storyIndex >= 0 && storyIndex < draft.building.stories.length - 1 && !continuity?.above;
                  const continuityLabel = continuity?.above && continuity.below
                    ? `Continues below to ${continuity.below.storyName} and above to ${continuity.above.storyName}`
                    : continuity?.above
                      ? `Continues above to ${continuity.above.storyName}`
                      : continuity?.below
                        ? `Continues below to ${continuity.below.storyName}`
                        : "Single-Story opening";
                  return <article className="room-platform-opening" key={opening.id}>
                    <div className="room-platform-opening-heading">
                      <label><span>Name</span><input value={opening.name} maxLength={120} onChange={(event) => replaceOpening(opening.id, { name: event.target.value })} /></label>
                      <label><span>Purpose</span><select value={opening.kind} onChange={(event) => replaceOpening(opening.id, { kind: event.target.value as PlatformOpening["kind"] })}>{PLATFORM_OPENING_KINDS.map((kind) => <option key={kind} value={kind}>{kind === "open-below" ? "Open Below" : kind === "stairwell" ? "Stairwell" : "Shaft"}</option>)}</select></label>
                      <label><span>Cuts</span><select value={opening.cuts} onChange={(event) => replaceOpening(opening.id, { cuts: event.target.value as PlatformOpening["cuts"] })}>{PLATFORM_OPENING_CUTS.map((cuts) => <option key={cuts} value={cuts}>{cuts === "both" ? "Floor + Ceiling" : cuts === "floor" ? "Floor only" : "Ceiling only"}</option>)}</select></label>
                      <button type="button" className="room-platform-opening-delete" onClick={() => removeOpening(opening.id)}>Delete</button>
                    </div>
                    <div className="room-platform-opening-geometry">
                      <StoryDimensionInput key={`${opening.id}:w:${bounds.width}`} label="Width" value={bounds.width} onChange={(width) => replaceOpeningRectangle(opening, { width })} />
                      <StoryDimensionInput key={`${opening.id}:d:${bounds.depth}`} label="Depth" value={bounds.depth} onChange={(depth) => replaceOpeningRectangle(opening, { depth })} />
                      <StoryDimensionInput signed key={`${opening.id}:x:${bounds.centerX}`} label="Center X" value={bounds.centerX} onChange={(centerX) => replaceOpeningRectangle(opening, { centerX })} />
                      <StoryDimensionInput signed key={`${opening.id}:y:${bounds.centerY}`} label="Center Y" value={bounds.centerY} onChange={(centerY) => replaceOpeningRectangle(opening, { centerY })} />
                    </div>
                    <div className="room-platform-opening-continuity">
                      <span><strong>Vertical path</strong>{continuityLabel}</span>
                      <div>
                        {canContinueBelow ? <button type="button" onClick={() => continueOpening(opening.id, "below")}>Continue Below</button> : null}
                        {canContinueAbove ? <button type="button" onClick={() => continueOpening(opening.id, "above")}>Continue Above</button> : null}
                        {continuity?.verticalOpeningId ? <button type="button" onClick={() => disconnectOpening(opening.id)}>Disconnect Path</button> : null}
                      </div>
                    </div>
                  </article>;
                }) : <p>No platform openings in this Room. Add one when the design needs a stairwell, shaft, or open-below cut.</p>}
              </section>
              {overrideEditor("floorStructureOverride", "Floor structure")}
              {overrideEditor("floorFinishOverride", "Floor finish")}
              {overrideEditor("ceilingStructureOverride", "Ceiling structure")}
              {overrideEditor("ceilingFinishOverride", "Ceiling finish")}
            </> : <section className="room-empty-state"><strong>No enclosed Rooms found on {story.name}</strong><span>Draw connected Walls around each space, then choose Detect / Update Rooms. Open wall networks do not create Rooms.</span><button type="button" onClick={detect}>Detect Rooms</button></section>}
          </main>
        </div>
        {error ? <p className="story-manager-error" role="alert">{error}</p> : null}
        <footer className="story-manager-footer"><span>{rooms.length} Room{rooms.length === 1 ? "" : "s"} on {story.name} · inherited values remain linked to Story defaults</span><div><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="story-save" onClick={save}>Apply Room Settings</button></div></footer>
      </section>
    </div>
  );
}
