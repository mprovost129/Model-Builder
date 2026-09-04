/**
 * Shared building-editor primitives: the architectural dimension input, the
 * material picker, and the layered-assembly editor. Used by the Story, Wall
 * Type, Foundation, and Roof dialogs. Extracted from app/model-builder-app.tsx.
 */
import { useState } from "react";
import { ASSEMBLY_ROLE_LABELS, ROOF_LAYER_SIDE_LABELS, WALL_LAYER_GROUP_LABELS } from "@/features/properties/building-labels";
import {
  formatArchitectural,
  formatSignedArchitectural,
  parseArchitectural,
  parseSignedArchitectural,
  snapToSixteenth,
} from "@/lib/architectural-units";
import {
  assemblyTotalThickness,
  ROOF_LAYER_SIDES,
  WALL_LAYER_GROUPS,
  wallLayerGroupThickness,
  type AssemblyLayer,
  type AssemblyLayerRole,
  type LayeredAssembly,
  type RoofLayerSide,
  type WallLayerGroup,
} from "@/lib/building-stories";
import {
  architecturalMaterialByName,
  architecturalMaterialsForRole,
  MATERIAL_CATEGORIES,
  MATERIAL_CATEGORY_LABELS,
} from "@/lib/material-library";

function nextAssemblyLayerId(assembly: LayeredAssembly): string {
  let number = 1;
  const ids = new Set(assembly.layers.map((layer) => layer.id));
  while (ids.has(`${assembly.id}-${String(number).padStart(2, "0")}`)) number += 1;
  return `${assembly.id}-${String(number).padStart(2, "0")}`;
}

export function StoryDimensionInput({
  allowZero = false,
  label,
  onChange,
  signed = false,
  value,
}: {
  allowZero?: boolean;
  label: string;
  onChange: (value: number) => void;
  signed?: boolean;
  value: number;
}) {
  const formatter = signed ? formatSignedArchitectural : formatArchitectural;
  const parser = signed ? parseSignedArchitectural : parseArchitectural;
  const [draft, setDraft] = useState(() => formatter(value));
  const [error, setError] = useState(false);

  const commit = () => {
    const parsed = parser(draft);
    if (parsed === null || (!signed && (allowZero ? parsed < 0 : parsed <= 0))) {
      setError(true);
      return;
    }
    setError(false);
    onChange(snapToSixteenth(parsed));
  };

  return (
    <label className="story-field">
      <span>{label}</span>
      <div className={error ? "story-field-shell is-error" : "story-field-shell"}>
        <input
          value={draft}
          onChange={(event) => { setDraft(event.target.value); setError(false); }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") { setDraft(formatter(value)); setError(false); event.currentTarget.blur(); }
          }}
          aria-label={label}
          spellCheck={false}
        />
        <small>ft-in</small>
      </div>
    </label>
  );
}

export function AssemblyMaterialSelect({
  layer,
  onChange,
}: {
  layer: AssemblyLayer;
  onChange: (material: string) => void;
}) {
  const definition = architecturalMaterialByName(layer.material);
  const compatibleMaterials = architecturalMaterialsForRole(layer.role);
  const compatibleNames = new Set(compatibleMaterials.map((material) => material.name));
  const currentNeedsFallback = !compatibleNames.has(layer.material);
  const summary = definition
    ? `Plan: ${definition.plan.pattern} · 3D surface properties ready · texture ${definition.model.textureAssetId ? "assigned" : "not assigned"}`
    : "Existing project material · preserved until a library material is selected";

  return (
    <div className="story-material-choice" title={summary}>
      <i style={{ backgroundColor: definition?.plan.color ?? "#a8b1b6" }} aria-hidden="true" />
      <select value={layer.material} onChange={(event) => onChange(event.target.value)} aria-label={`${layer.name} material`}>
        {currentNeedsFallback ? <optgroup label="Current project material"><option value={layer.material}>{layer.material}</option></optgroup> : null}
        {MATERIAL_CATEGORIES.map((category) => {
          const options = compatibleMaterials.filter((material) => material.category === category);
          return options.length ? <optgroup label={MATERIAL_CATEGORY_LABELS[category]} key={category}>{options.map((material) => <option value={material.name} key={material.name}>{material.name}</option>)}</optgroup> : null;
        })}
      </select>
    </div>
  );
}

export function StoryAssemblyEditor({
  assembly,
  defaultOpen = true,
  onChange,
  onSelectLayer,
  selectedLayerId,
}: {
  assembly: LayeredAssembly;
  defaultOpen?: boolean;
  onChange: (assembly: LayeredAssembly) => void;
  onSelectLayer?: (layerId: string) => void;
  selectedLayerId?: string;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const isWallAssembly = assembly.kind === "wall-structure";
  const isRoofAssembly = assembly.kind === "roof-assembly";
  const addLayer = (wallGroup?: WallLayerGroup, roofSide?: RoofLayerSide) => {
    const next = { ...assembly, layers: assembly.layers.map((layer) => ({ ...layer })) };
    const role: AssemblyLayerRole = isWallAssembly
      ? wallGroup === "main" ? "framing" : "finish"
      : isRoofAssembly ? roofSide === "exterior" ? "sheathing" : "insulation"
        : assembly.kind === "floor-structure" || assembly.kind === "ceiling-structure" ? "framing" : "finish";
    const layer: AssemblyLayer = {
      id: nextAssemblyLayerId(next),
      material: isWallAssembly && wallGroup === "exterior"
        ? "Exterior Cladding"
        : role === "framing" ? "Lumber" : role === "sheathing" ? "OSB" : role === "insulation" ? "Fiberglass Batt" : "Gypsum Board",
      name: "New Layer",
      role,
      thickness: 0.5,
    };
    if (isWallAssembly) {
      layer.participatesInJoin = true;
      layer.wallGroup = wallGroup ?? "main";
    }
    if (isRoofAssembly) layer.roofSide = roofSide ?? "exterior";
    next.layers.push(layer);
    if (isWallAssembly) {
      next.layers.sort((first, second) => WALL_LAYER_GROUPS.indexOf(first.wallGroup ?? "main") - WALL_LAYER_GROUPS.indexOf(second.wallGroup ?? "main"));
    }
    if (isRoofAssembly) next.layers.sort((first, second) => ROOF_LAYER_SIDES.indexOf(first.roofSide ?? "exterior") - ROOF_LAYER_SIDES.indexOf(second.roofSide ?? "exterior"));
    onChange(next);
    onSelectLayer?.(layer.id);
  };
  const updateLayer = (index: number, change: Partial<LayeredAssembly["layers"][number]>) => {
    const next = { ...assembly, layers: assembly.layers.map((layer) => ({ ...layer })) };
    next.layers[index] = { ...next.layers[index], ...change };
    if (isWallAssembly && (next.layers[index].role !== "finish" || next.layers[index].thickness <= 0)) {
      next.wallEndCapLayerIds = (next.wallEndCapLayerIds ?? []).filter((layerId) => layerId !== next.layers[index].id);
    }
    if (isWallAssembly && change.wallGroup !== undefined) {
      next.layers.sort((first, second) => WALL_LAYER_GROUPS.indexOf(first.wallGroup ?? "main") - WALL_LAYER_GROUPS.indexOf(second.wallGroup ?? "main"));
    }
    if (isRoofAssembly && change.roofSide !== undefined) next.layers.sort((first, second) => ROOF_LAYER_SIDES.indexOf(first.roofSide ?? "exterior") - ROOF_LAYER_SIDES.indexOf(second.roofSide ?? "exterior"));
    onChange(next);
  };
  const moveLayer = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= assembly.layers.length) return;
    if (isWallAssembly && assembly.layers[index].wallGroup !== assembly.layers[target].wallGroup || isRoofAssembly && assembly.layers[index].roofSide !== assembly.layers[target].roofSide) return;
    const next = { ...assembly, layers: assembly.layers.map((layer) => ({ ...layer })) };
    [next.layers[index], next.layers[target]] = [next.layers[target], next.layers[index]];
    onChange(next);
  };
  const removeLayer = (index: number) => {
    const removedLayerId = assembly.layers[index]?.id;
    const next = { ...assembly, layers: assembly.layers.filter((_, candidate) => candidate !== index).map((layer) => ({ ...layer })) };
    if (isWallAssembly) next.wallEndCapLayerIds = (next.wallEndCapLayerIds ?? []).filter((layerId) => layerId !== assembly.layers[index]?.id);
    onChange(next);
    if (removedLayerId === selectedLayerId && next.layers.length > 0) {
      onSelectLayer?.(next.layers[Math.min(index, next.layers.length - 1)].id);
    }
  };
  const toggleEndCapLayer = (layerId: string, enabled: boolean) => {
    const selectedIds = new Set(assembly.wallEndCapLayerIds ?? []);
    if (enabled) selectedIds.add(layerId);
    else selectedIds.delete(layerId);
    onChange({ ...assembly, wallEndCapLayerIds: assembly.layers.flatMap((layer) => selectedIds.has(layer.id) ? [layer.id] : []) });
  };
  const mainLayerCount = assembly.layers.filter((layer) => layer.wallGroup === "main").length;
  const renderLayer = (layer: AssemblyLayer, index: number) => {
    const isOnlyMainLayer = isWallAssembly && layer.wallGroup === "main" && mainLayerCount === 1;
    const previousLayer = assembly.layers[index - 1];
    const nextLayer = assembly.layers[index + 1];
    return (
      <div
        className={`${isWallAssembly ? "story-layer-grid is-wall-assembly" : isRoofAssembly ? "story-layer-grid is-roof-assembly" : "story-layer-grid"}${layer.id === selectedLayerId ? " is-selected" : ""}`}
        key={layer.id}
        onFocusCapture={() => onSelectLayer?.(layer.id)}
      >
        <span>{index + 1}</span>
        <div className="story-layer-names">
          <input value={layer.name} onChange={(event) => updateLayer(index, { name: event.target.value })} aria-label={`${assembly.name} layer ${index + 1} name`} />
          <AssemblyMaterialSelect layer={layer} onChange={(material) => updateLayer(index, { material })} />
        </div>
        {isRoofAssembly ? <select value={layer.roofSide ?? "exterior"} onChange={(event) => updateLayer(index, { roofSide: event.target.value as RoofLayerSide })} aria-label={`${layer.name} side of structural Roof Plane`}>{ROOF_LAYER_SIDES.map((side) => <option key={side} value={side}>{side === "exterior" ? "Above" : "Below"}</option>)}</select> : null}
        <select value={layer.role} onChange={(event) => updateLayer(index, { role: event.target.value as AssemblyLayerRole })} aria-label={`${layer.name} role`}>
          {Object.entries(ASSEMBLY_ROLE_LABELS).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
        </select>
        <StoryDimensionInput allowZero={isWallAssembly || layer.role === "membrane"} key={`${layer.id}:${layer.thickness}`} label={`${layer.name} thickness`} value={layer.thickness} onChange={(thickness) => updateLayer(index, { thickness })} />
        {isWallAssembly ? <label className="story-layer-join" title="When enabled, this layer is trimmed or mitered by automatic wall junctions."><input type="checkbox" checked={layer.participatesInJoin ?? true} onChange={(event) => updateLayer(index, { participatesInJoin: event.target.checked })} aria-label={`${layer.name} participates in automatic wall joins`} /><span>{layer.participatesInJoin === false ? "Square" : "Auto"}</span></label> : null}
        {isWallAssembly ? <label className="story-layer-join" title={layer.role === "finish" && layer.thickness > 0 ? "Wrap this finish across truly open wall ends." : "Only positive-thickness Finish layers can wrap open wall ends."}><input type="checkbox" checked={(assembly.wallEndCapLayerIds ?? []).includes(layer.id)} disabled={layer.role !== "finish" || layer.thickness <= 0} onChange={(event) => toggleEndCapLayer(layer.id, event.target.checked)} aria-label={`${layer.name} wraps open wall ends`} /><span>{(assembly.wallEndCapLayerIds ?? []).includes(layer.id) ? "Wrap" : "Off"}</span></label> : null}
        <div className="story-layer-actions"><button type="button" onClick={() => moveLayer(index, -1)} disabled={!previousLayer || (isWallAssembly && previousLayer.wallGroup !== layer.wallGroup) || (isRoofAssembly && previousLayer.roofSide !== layer.roofSide)} aria-label={`Move ${layer.name} up`}>↑</button><button type="button" onClick={() => moveLayer(index, 1)} disabled={!nextLayer || (isWallAssembly && nextLayer.wallGroup !== layer.wallGroup) || (isRoofAssembly && nextLayer.roofSide !== layer.roofSide)} aria-label={`Move ${layer.name} down`}>↓</button><button type="button" onClick={() => removeLayer(index)} disabled={isOnlyMainLayer || isRoofAssembly && assembly.layers.length === 1} aria-label={`Remove ${layer.name}`}>×</button></div>
      </div>
    );
  };
  return (
    <details className="story-assembly" open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary>
        <div><strong>{assembly.name}</strong><span>{assembly.kind === "floor-structure" ? "Controls floor-to-floor stacking" : assembly.kind === "ceiling-structure" ? "Builds down from the rough ceiling" : assembly.kind === "wall-structure" ? "Exterior-to-interior wall layers" : assembly.kind === "roof-assembly" ? "Layers above and below the structural Roof Plane" : "Finish only · does not move Story reference elevations"}</span></div>
        <b>{formatArchitectural(assemblyTotalThickness(assembly))}</b>
      </summary>
      <div className="story-assembly-body">
      <div className={isWallAssembly ? "story-layer-grid story-layer-head is-wall-assembly" : isRoofAssembly ? "story-layer-grid story-layer-head is-roof-assembly" : "story-layer-grid story-layer-head"}><span>#</span><span>Layer / material</span>{isRoofAssembly ? <span>Side</span> : null}<span>Role</span><span>Thickness</span>{isWallAssembly ? <><span>Join</span><span>End</span></> : null}<span>Order</span></div>
      {isWallAssembly ? WALL_LAYER_GROUPS.map((group) => (
        <div className="story-wall-layer-group" key={group}>
          <div className={`story-wall-group-heading is-${group}`}><strong>{WALL_LAYER_GROUP_LABELS[group]}</strong><span>{group === "main" ? "Structural core and future reference layer" : group === "exterior" ? "Outside of the Main layer" : "Room side of the Main layer"}</span><b>{formatArchitectural(wallLayerGroupThickness(assembly, group))}</b><button type="button" className="story-wall-group-add" onClick={() => addLayer(group)} aria-label={`Add ${WALL_LAYER_GROUP_LABELS[group].toLowerCase()} layer`}>＋</button></div>
          {assembly.layers.map((layer, index) => layer.wallGroup === group ? renderLayer(layer, index) : null)}
        </div>
      )) : isRoofAssembly ? ROOF_LAYER_SIDES.map((side) => (
        <div className="story-wall-layer-group" key={side}>
          <div className={`story-wall-group-heading is-${side}`}><strong>{ROOF_LAYER_SIDE_LABELS[side]}</strong><span>{side === "exterior" ? "Roofing, membranes, insulation, and sheathing" : "Framing or truss zone, insulation, and interior finish"}</span><b>{formatArchitectural(assembly.layers.filter((layer) => layer.roofSide === side).reduce((total, layer) => total + layer.thickness, 0))}</b><button type="button" className="story-wall-group-add" onClick={() => addLayer(undefined, side)} aria-label={`Add layer ${side === "exterior" ? "above" : "below"} Roof Plane`}>＋</button></div>
          {assembly.layers.map((layer, index) => layer.roofSide === side ? renderLayer(layer, index) : null)}
        </div>
      )) : assembly.layers.map(renderLayer)}
      {!isWallAssembly && !isRoofAssembly ? <button type="button" className="story-add-layer" onClick={() => addLayer()}>＋ Add layer</button> : null}
      </div>
    </details>
  );
}
