/**
 * Wall Type manager and its section preview. Edits a draft BuildingStructure and
 * reports the result on save. Extracted from app/model-builder-app.tsx.
 */
import { useEffect, useState } from "react";
import { StoryAssemblyEditor, StoryDimensionInput } from "@/features/dialogs/assembly-editor";
import { ASSEMBLY_ROLE_LABELS, WALL_LAYER_GROUP_LABELS, WALL_PREVIEW_REFERENCE_CODES, WALL_REFERENCE_LINE_LABELS } from "@/features/properties/building-labels";
import { formatArchitectural } from "@/lib/architectural-units";
import {
  assemblyTotalThickness, buildingStructureIsValid, cloneBuildingStructure,
  recommendedWallHeaderTypeId, WALL_LAYER_GROUPS, wallDefaultHeaderTypeId,
  wallHeaderTypeRequiredMainThickness, wallLayerDistanceRanges, wallLayerGroupThickness,
  wallReferenceDistanceFromExterior, wallUseForType,
  type AssemblyLayer, type BuildingStructure, type LayeredAssembly, type WallLocation,
  type WallReferenceLine, type WallStructuralRole,
} from "@/lib/building-stories";

function nextWallTypeId(building: BuildingStructure): string {
  let number = 1;
  const ids = new Set(building.wallTypes.map((wallType) => wallType.id));
  while (ids.has(`wall-type-${String(number).padStart(2, "0")}`)) number += 1;
  return `wall-type-${String(number).padStart(2, "0")}`;
}

function WallAssemblyPreview({
  assembly,
  onChangeLayer,
  onSelectLayer,
  selectedLayerId,
}: {
  assembly: LayeredAssembly;
  onChangeLayer: (layerId: string, change: Partial<AssemblyLayer>) => void;
  onSelectLayer: (layerId: string) => void;
  selectedLayerId: string;
}) {
  const totalThickness = assemblyTotalThickness(assembly);
  const scaleThickness = Math.max(totalThickness, 1 / 16);
  const ranges = wallLayerDistanceRanges(assembly);
  const selectedLayer = assembly.layers.find((layer) => layer.id === selectedLayerId) ?? assembly.layers[0];
  const selectedRange = ranges.find((range) => range.layerId === selectedLayer?.id);
  const drawingLeft = 35;
  const drawingWidth = 270;
  const referenceLines: WallReferenceLine[] = ["exterior-main", "wall-center", "center-main", "interior-main"];
  const referenceLabelRows: Record<WallReferenceLine, number> = {
    "exterior-main": 22,
    "wall-center": 34,
    "center-main": 46,
    "interior-main": 58,
  };
  const pointFromExterior = (distance: number) => drawingLeft + drawingWidth * distance / scaleThickness;

  return (
    <aside className="wall-assembly-preview" aria-label="Wall assembly plan section preview">
      <header><strong>Assembly Preview</strong><span>Plan section · exterior at left</span></header>
      <div className="wall-preview-canvas">
        <svg viewBox="0 0 340 225" aria-label={`${assembly.name} wall layer diagram`}>
          <text className="wall-preview-side-label" x="35" y="68">EXTERIOR</text>
          <text className="wall-preview-side-label" x="305" y="68" textAnchor="end">INTERIOR</text>
          {referenceLines.map((referenceLine) => {
            const x = pointFromExterior(wallReferenceDistanceFromExterior(assembly, referenceLine));
            return (
              <g className={`wall-preview-reference is-${referenceLine}`} key={referenceLine}>
                <line x1={x} y1={referenceLabelRows[referenceLine] + 3} x2={x} y2="155" />
                <text x={x} y={referenceLabelRows[referenceLine]} textAnchor="middle">{WALL_PREVIEW_REFERENCE_CODES[referenceLine]}</text>
              </g>
            );
          })}
          <rect className="wall-preview-outline" x={drawingLeft} y="72" width={drawingWidth} height="76" />
          {assembly.layers.map((layer, index) => {
            const range = ranges[index];
            const x = pointFromExterior(range.start);
            const width = Math.max(layer.thickness === 0 ? 1 : drawingWidth * layer.thickness / scaleThickness, 1);
            const selected = layer.id === selectedLayer?.id;
            return (
              <g
                aria-label={`${layer.name}, ${formatArchitectural(layer.thickness)}`}
                className={`wall-preview-layer is-${layer.role}${selected ? " is-selected" : ""}${layer.thickness === 0 ? " is-zero" : ""}`}
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelectLayer(layer.id); }}
                role="button"
                tabIndex={0}
              >
                <title>{`${index + 1}. ${layer.name} · ${layer.material} · ${formatArchitectural(layer.thickness)}`}</title>
                <rect x={x} y="72" width={width} height="76" />
                {width >= 17 ? <text x={x + width / 2} y="113" textAnchor="middle">{index + 1}</text> : null}
              </g>
            );
          })}
          <g className="wall-preview-total-dimension">
            <line x1={drawingLeft} y1="172" x2={drawingLeft + drawingWidth} y2="172" />
            <line x1={drawingLeft} y1="164" x2={drawingLeft} y2="180" />
            <line x1={drawingLeft + drawingWidth} y1="164" x2={drawingLeft + drawingWidth} y2="180" />
            <text x={drawingLeft + drawingWidth / 2} y="168" textAnchor="middle">TOTAL {formatArchitectural(totalThickness)}</text>
          </g>
          {WALL_LAYER_GROUPS.map((group, groupIndex) => {
            const thickness = wallLayerGroupThickness(assembly, group);
            const groupDistance = WALL_LAYER_GROUPS.slice(0, groupIndex).reduce((total, candidate) => total + wallLayerGroupThickness(assembly, candidate), 0);
            const x = pointFromExterior(groupDistance);
            const width = drawingWidth * thickness / scaleThickness;
            return (
              <g className={`wall-preview-group is-${group}`} key={group}>
                <line x1={x} y1="196" x2={x + width} y2="196" />
                <text x={x + width / 2} y="210" textAnchor="middle">{group.toUpperCase()} · {formatArchitectural(thickness)}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="wall-preview-reference-key" aria-label="Wall reference line key">
        {referenceLines.map((referenceLine) => <div key={referenceLine}><b>{WALL_PREVIEW_REFERENCE_CODES[referenceLine]}</b><span>{WALL_REFERENCE_LINE_LABELS[referenceLine]}</span><output>{formatArchitectural(wallReferenceDistanceFromExterior(assembly, referenceLine))} from exterior</output></div>)}
      </div>
      {selectedLayer ? (
        <section className="wall-preview-selected-layer">
          <header><div><strong>Layer {assembly.layers.indexOf(selectedLayer) + 1} · {selectedLayer.name}</strong><span>{WALL_LAYER_GROUP_LABELS[selectedLayer.wallGroup ?? "main"]} · {ASSEMBLY_ROLE_LABELS[selectedLayer.role]}</span></div><i className={`is-${selectedLayer.role}`} /></header>
          <p>{selectedLayer.material}</p>
          <StoryDimensionInput allowZero key={`${selectedLayer.id}:${selectedLayer.thickness}`} label="Layer thickness" value={selectedLayer.thickness} onChange={(thickness) => onChangeLayer(selectedLayer.id, { thickness })} />
          <small>{selectedRange ? `${formatArchitectural(selectedRange.start)} to ${formatArchitectural(selectedRange.end)} from the exterior face` : ""}</small>
        </section>
      ) : null}
      <dl className="wall-preview-facts">
        <div><dt>Main core</dt><dd>{formatArchitectural(wallLayerGroupThickness(assembly, "main"))}</dd></div>
        <div><dt>Open-end wrap</dt><dd>{assembly.wallEndCapLayerIds?.length ?? 0} layer{assembly.wallEndCapLayerIds?.length === 1 ? "" : "s"}</dd></div>
      </dl>
    </aside>
  );
}

export function WallTypeManagerDialog({
  building,
  onCancel,
  onSave,
}: {
  building: BuildingStructure;
  onCancel: () => void;
  onSave: (building: BuildingStructure) => void;
}) {
  const [draft, setDraft] = useState(() => cloneBuildingStructure(building));
  const [selectedId, setSelectedId] = useState(building.activeWallTypeId);
  const [selectedLayerId, setSelectedLayerId] = useState(() => building.wallTypes.find((wallType) => wallType.id === building.activeWallTypeId)?.layers[0]?.id ?? building.wallTypes[0]?.layers[0]?.id ?? "");
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
  const selected = draft.wallTypes.find((wallType) => wallType.id === selectedId) ?? draft.wallTypes[0];
  const defaultWallTypeIds = new Set([
    draft.defaultExteriorWallTypeId,
    draft.defaultInteriorBearingWallTypeId,
    draft.defaultInteriorPartitionWallTypeId,
  ]);
  const selectedIsProjectDefault = defaultWallTypeIds.has(selected.id);
  const effectiveSelectedLayerId = selected.layers.some((layer) => layer.id === selectedLayerId) ? selectedLayerId : selected.layers[0]?.id ?? "";
  const selectedMainThickness = wallLayerGroupThickness(selected, "main");
  const compatibleHeaders = draft.headerTypes.filter((headerType) => {
    const required = wallHeaderTypeRequiredMainThickness(headerType);
    return required === 0 || required <= selectedMainThickness + 1e-8;
  });
  const replaceSelected = (assembly: LayeredAssembly) => {
    setDraft((current) => ({
      ...cloneBuildingStructure(current),
      wallTypes: current.wallTypes.map((wallType) => wallType.id === selected.id ? { ...assembly, kind: "wall-structure" } : { ...wallType, layers: wallType.layers.map((layer) => ({ ...layer })) }),
    }));
    setError("");
  };
  const replaceSelectedLayer = (layerId: string, change: Partial<AssemblyLayer>) => {
    replaceSelected({
      ...selected,
      layers: selected.layers.map((layer) => layer.id === layerId ? { ...layer, ...change } : { ...layer }),
    });
  };
  const addType = () => {
    if (draft.wallTypes.length >= 32) return;
    const id = nextWallTypeId(draft);
    const layerIdMap = new Map(selected.layers.map((layer, index) => [layer.id, `${id}-${String(index + 1).padStart(2, "0")}`]));
    const copy: LayeredAssembly = {
      ...selected,
      id,
      name: `${selected.name} Copy`,
      layers: selected.layers.map((layer) => ({ ...layer, id: layerIdMap.get(layer.id) ?? layer.id })),
      wallEndCapLayerIds: (selected.wallEndCapLayerIds ?? []).flatMap((layerId) => layerIdMap.get(layerId) ?? []),
    };
    setDraft((current) => ({ ...cloneBuildingStructure(current), activeWallUse: wallUseForType(copy), activeWallTypeId: id, wallTypes: [...current.wallTypes.map((wallType) => ({ ...wallType, layers: wallType.layers.map((layer) => ({ ...layer })) })), copy] }));
    setSelectedId(id);
    setSelectedLayerId(copy.layers[0]?.id ?? "");
  };
  const deleteType = () => {
    if (draft.wallTypes.length <= 1 || selectedIsProjectDefault) return;
    const remaining = draft.wallTypes.filter((wallType) => wallType.id !== selected.id);
    const nextActive = draft.activeWallTypeId === selected.id ? remaining[0].id : draft.activeWallTypeId;
    const nextActiveType = remaining.find((wallType) => wallType.id === nextActive) ?? remaining[0];
    setDraft((current) => ({ ...cloneBuildingStructure(current), activeWallUse: wallUseForType(nextActiveType), activeWallTypeId: nextActive, wallTypes: remaining }));
    setSelectedId(nextActive);
  };
  const save = () => {
    const next = cloneBuildingStructure(draft);
    if (!buildingStructureIsValid(next)) {
      setError("Wall types need unique names, ordered Exterior/Main/Interior groups, a positive-thickness Main layer, and a compatible default header assembly.");
      return;
    }
    onSave(next);
  };
  return (
    <div className="story-manager-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="story-manager wall-type-manager" role="dialog" aria-modal="true" aria-labelledby="wall-type-manager-title">
        <header className="story-manager-header"><div><strong id="wall-type-manager-title">Wall Type Manager</strong><span>Reusable assemblies define wall thickness from exterior to interior.</span></div><button type="button" onClick={onCancel} aria-label="Close Wall Type Manager">×</button></header>
        <div className="story-manager-body">
          <aside className="story-list">
            <header><strong>Wall Types</strong><span>{draft.wallTypes.length} defined</span></header>
            {draft.wallTypes.map((wallType) => <button type="button" key={wallType.id} className={wallType.id === selected.id ? "is-selected" : ""} onClick={() => { setSelectedId(wallType.id); setSelectedLayerId(wallType.layers[0]?.id ?? ""); }}><strong>{wallType.name}</strong><span>{formatArchitectural(assemblyTotalThickness(wallType))} total</span>{wallType.id === draft.activeWallTypeId ? <small>ACTIVE TYPE</small> : null}</button>)}
            <div className="story-list-actions"><button type="button" onClick={addType} disabled={draft.wallTypes.length >= 32}>＋ Duplicate</button><button type="button" onClick={deleteType} disabled={draft.wallTypes.length <= 1 || selectedIsProjectDefault} title={selectedIsProjectDefault ? "Choose another project default before deleting this Type" : undefined}>Delete</button></div>
          </aside>
          <main className="story-editor">
            <section className="story-editor-summary">
              <label><span>Type name</span><input value={selected.name} maxLength={80} onChange={(event) => replaceSelected({ ...selected, name: event.target.value })} /></label>
              <label><span>Open-end wrap</span><output>{selected.wallEndCapLayerIds?.length ? `${selected.wallEndCapLayerIds.length} finish layer${selected.wallEndCapLayerIds.length === 1 ? "" : "s"}` : "None"}</output></label>
              <button type="button" className={selected.id === draft.activeWallTypeId ? "is-anchor" : ""} onClick={() => setDraft((current) => ({ ...cloneBuildingStructure(current), activeWallUse: wallUseForType(selected), activeWallTypeId: selected.id }))}>{selected.id === draft.activeWallTypeId ? "Active wall type" : "Make active"}</button>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Wall Use &amp; Opening Framing</strong><span>The host Wall supplies the normal header assembly; a Door/Window Type or placed opening can override it.</span></div></header>
              <div className="foundation-field-grid">
                <label className="story-field"><span>Wall location</span><select value={selected.wallLocation ?? "exterior"} disabled={selectedIsProjectDefault} title={selectedIsProjectDefault ? "Change the project default assignment before reclassifying this Type" : undefined} onChange={(event) => { const wallLocation = event.target.value as WallLocation; const next = { ...selected, wallLocation }; replaceSelected({ ...next, defaultHeaderTypeId: recommendedWallHeaderTypeId(next) }); }}><option value="exterior">Exterior</option><option value="interior">Interior</option></select></label>
                <label className="story-field"><span>Structural role</span><select value={selected.wallStructuralRole ?? "bearing"} disabled={selectedIsProjectDefault} title={selectedIsProjectDefault ? "Change the project default assignment before reclassifying this Type" : undefined} onChange={(event) => { const wallStructuralRole = event.target.value as WallStructuralRole; const next = { ...selected, wallStructuralRole }; replaceSelected({ ...next, defaultHeaderTypeId: recommendedWallHeaderTypeId(next) }); }}><option value="bearing">Bearing</option><option value="non-bearing">Non-bearing</option></select></label>
                <label className="story-field"><span>Default header assembly</span><select value={wallDefaultHeaderTypeId(selected)} onChange={(event) => replaceSelected({ ...selected, defaultHeaderTypeId: event.target.value })}>{compatibleHeaders.map((headerType) => <option key={headerType.id} value={headerType.id}>{headerType.scheduleMark} · {headerType.name}{headerType.engineeringRequired ? " · Engineering" : ""}</option>)}</select></label>
              </div>
              {selectedIsProjectDefault ? <p className="story-help-text">This Type is assigned as a project Wall default. Choose a different default in Project Setup before deleting or reclassifying it.</p> : null}
              <p className="opening-type-note">Changing the location or structural role applies the recommended residential default. The selected assembly remains an explicit project rule; loads, spans, species, grades, and code compliance are not calculated here.</p>
            </section>
            <StoryAssemblyEditor assembly={selected} onChange={replaceSelected} onSelectLayer={setSelectedLayerId} selectedLayerId={effectiveSelectedLayerId} />
            <p className="property-grid-note">Layers are stored from exterior to interior. The Main group is the structural core. Use End to stack one or more positive Finish layers across truly open or manually disconnected ends. Each wrap uses its material thickness, and body layers stop behind the complete stack so solids do not overlap. New walls use the active type; existing walls retain their assigned type until changed.</p>
          </main>
          <WallAssemblyPreview assembly={selected} onChangeLayer={replaceSelectedLayer} onSelectLayer={setSelectedLayerId} selectedLayerId={effectiveSelectedLayerId} />
        </div>
        {error ? <p className="story-manager-error" role="alert">{error}</p> : null}
        <footer className="story-manager-footer"><span>{selected.name} · {formatArchitectural(assemblyTotalThickness(selected))}</span><div><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="story-save" onClick={save}>Apply Wall Types</button></div></footer>
      </section>
    </div>
  );
}
