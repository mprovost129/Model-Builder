/**
 * Door and Window Type manager, its component preview, and the naming helpers
 * that keep Type and header names unique.
 * Extracted from app/model-builder-app.tsx.
 */
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { StoryDimensionInput } from "@/features/dialogs/assembly-editor";
import { OPENING_PREVIEW_ROLE_COLORS } from "@/features/properties/building-labels";
import { formatArchitectural } from "@/lib/architectural-units";
import {
  buildingStructureIsValid, cloneBuildingStructure, cloneWallHeaderType, cloneWallOpeningType,
  configureDoorPanelLayout, configureWindowLitePattern, configureWindowSashArrangement,
  doorPanelLayoutForType, DOOR_PANEL_LAYOUTS, MAXIMUM_OPENING_COMPONENT_COUNT,
  MAXIMUM_WALL_HEADER_TYPE_COUNT, MAXIMUM_WALL_OPENING_TYPE_COUNT,
  OPENING_COMPONENT_DEPTH_ANCHORS, OPENING_COMPONENT_GEOMETRIES, OPENING_COMPONENT_ROLES,
  wallDefaultHeaderTypeId, wallHeaderTypeRequiredMainThickness, WINDOW_LITE_PATTERNS,
  WINDOW_SASH_ARRANGEMENTS, windowLitePatternForType, windowSashArrangementForType,
  type BuildingStructure, type DoorPanelLayout, type LayeredAssembly,
  type ManufacturerProductSource, type OpeningAssemblyComponent, type WallHeaderType,
  type WallOpeningKind, type WallOpeningType, type WindowLitePattern, type WindowSashArrangement,
} from "@/lib/building-stories";
import type { LineObject, ModelDocument, WallOpening } from "@/lib/document-model";
import { MAXIMUM_PRODUCT_PACKAGE_BYTES, PRODUCT_PACKAGE_EXTENSION, parseProductPackage } from "@/lib/product-package";
import { titleCase } from "@/lib/text";
import { wallOpeningComponentSolids } from "@/lib/wall-joins";

function nextWallOpeningTypeId(building: BuildingStructure, kind: WallOpeningKind): string {
  const prefix = kind === "door" ? "door-type" : "window-type";
  const ids = new Set(building.openingTypes.map((type) => type.id));
  let number = 1;
  while (ids.has(`${prefix}-${String(number).padStart(2, "0")}`)) number += 1;
  return `${prefix}-${String(number).padStart(2, "0")}`;
}

function nextWallOpeningTypeName(building: BuildingStructure, sourceName: string): string {
  const names = new Set(building.openingTypes.map((type) => type.name.trim().toLocaleLowerCase()));
  const baseName = `${sourceName.trim()} Copy`;
  if (!names.has(baseName.toLocaleLowerCase())) return baseName;
  let number = 2;
  while (names.has(`${baseName} ${number}`.toLocaleLowerCase())) number += 1;
  return `${baseName} ${number}`;
}

function availableWallOpeningTypeName(building: BuildingStructure, sourceName: string): string {
  const names = new Set(building.openingTypes.map((type) => type.name.trim().toLocaleLowerCase()));
  const baseName = sourceName.trim();
  if (!names.has(baseName.toLocaleLowerCase())) return baseName;
  let number = 2;
  while (names.has(`${baseName} ${number}`.toLocaleLowerCase())) number += 1;
  return `${baseName} ${number}`;
}

function nextOpeningComponentId(type: WallOpeningType): string {
  const ids = new Set(type.components.map((component) => component.id));
  let number = 1;
  while (ids.has(`component-${String(number).padStart(2, "0")}`)) number += 1;
  return `component-${String(number).padStart(2, "0")}`;
}

function nextOpeningComponentName(type: WallOpeningType, sourceName = "Component"): string {
  const names = new Set(type.components.map((component) => component.name.trim().toLocaleLowerCase()));
  if (!names.has(sourceName.toLocaleLowerCase())) return sourceName;
  let number = 2;
  while (names.has(`${sourceName} ${number}`.toLocaleLowerCase())) number += 1;
  return `${sourceName} ${number}`;
}

function nextWallHeaderTypeId(building: BuildingStructure): string {
  const ids = new Set(building.headerTypes.map((type) => type.id));
  let number = 1;
  while (ids.has(`header-type-${String(number).padStart(2, "0")}`)) number += 1;
  return `header-type-${String(number).padStart(2, "0")}`;
}

function nextWallHeaderTypeName(building: BuildingStructure, sourceName: string): string {
  const names = new Set(building.headerTypes.map((type) => type.name.trim().toLocaleLowerCase()));
  const baseName = `${sourceName.trim()} Copy`;
  if (!names.has(baseName.toLocaleLowerCase())) return baseName;
  let number = 2;
  while (names.has(`${baseName} ${number}`.toLocaleLowerCase())) number += 1;
  return `${baseName} ${number}`;
}

function nextWallHeaderScheduleMark(building: BuildingStructure): string {
  const marks = new Set(building.headerTypes.map((type) => type.scheduleMark.toUpperCase()));
  let number = 1;
  while (marks.has(`H${number}`)) number += 1;
  return `H${number}`;
}

function OpeningTypePreview({ openingType, wallType }: { openingType: WallOpeningType; wallType: LayeredAssembly }) {
  const margin = Math.max(8, openingType.roughWidth * 0.18);
  const headerBottomHeight = openingType.kind === "door" ? openingType.roughHeight : openingType.defaultHeaderBottomHeight;
  const roughBottom = openingType.kind === "door" ? 0 : headerBottomHeight - openingType.roughHeight;
  const lineLength = openingType.roughWidth + margin * 2;
  const opening: WallOpening = {
    centerOffset: lineLength / 2,
    componentOverrides: [],
    headerBottomHeight,
    headerTypeIdOverride: null,
    id: "opening-type-preview",
    kind: openingType.kind,
    layerId: openingType.kind === "door" ? "layer-doors" : "layer-windows",
    name: `${openingType.name} Preview`,
    roughHeight: openingType.roughHeight,
    roughWidth: openingType.roughWidth,
    unitHeight: openingType.unitHeight,
    unitWidth: openingType.unitWidth,
    wallOpeningTypeId: openingType.id,
  };
  const line: LineObject = {
    architecturalRole: "wall",
    end: { x: lineLength, y: 0, z: 0 },
    foundationSupportWallId: null,
    foundationWallTypeId: null,
    id: "opening-type-preview-wall",
    layerId: "layer-default",
    locked: false,
    name: "Opening Type Preview Wall",
    start: { x: 0, y: 0, z: 0 },
    storyId: "story-preview",
    type: "line",
    wallEndJoinMode: "square",
    wallExteriorSide: "left",
    wallJoinPriority: 0,
    wallOpenings: [opening],
    wallReferenceLine: "center-main",
    wallStartJoinMode: "square",
    wallTypeId: wallType.id,
  };
  const solids = wallOpeningComponentSolids(line, wallType, new Map([[openingType.id, openingType]]));
  const maximumHeight = Math.max(headerBottomHeight, roughBottom + openingType.unitOffsetZ + openingType.unitHeight);
  const verticalMargin = Math.max(10, maximumHeight * 0.16);
  const canvasHeight = maximumHeight + verticalMargin * 2;
  const roughLeft = opening.centerOffset - openingType.roughWidth / 2;
  const unitLeft = opening.centerOffset + openingType.unitOffsetX - openingType.unitWidth / 2;
  const unitBottom = roughBottom + openingType.unitOffsetZ;
  return (
    <aside className="opening-type-preview" aria-label="Door or Window product preview">
      <header><strong>Live Product Preview</strong><span>Exterior elevation · updates with the Type</span></header>
      <div className="opening-preview-canvas">
        <svg viewBox={`0 0 ${lineLength} ${canvasHeight}`} role="img" aria-label={`${openingType.name} exterior elevation preview`}>
          <rect className="opening-preview-rough" x={roughLeft} y={canvasHeight - headerBottomHeight} width={openingType.roughWidth} height={openingType.roughHeight} />
          <rect className="opening-preview-unit" x={unitLeft} y={canvasHeight - unitBottom - openingType.unitHeight} width={openingType.unitWidth} height={openingType.unitHeight} />
          {solids.map((solid, index) => {
            const xValues = [solid.startExterior.x, solid.startInterior.x, solid.endExterior.x, solid.endInterior.x];
            const left = Math.min(...xValues);
            const right = Math.max(...xValues);
            return <rect key={`${solid.componentId}:${index}`} x={left} y={canvasHeight - solid.baseHeight - solid.height} width={right - left} height={solid.height} fill={OPENING_PREVIEW_ROLE_COLORS[solid.role]} className={`opening-preview-component opening-preview-${solid.role}`}><title>{solid.componentName} · {solid.material}</title></rect>;
          })}
          <text className="opening-preview-dimension" x={opening.centerOffset} y={verticalMargin * 0.62} textAnchor="middle">ROUGH {formatArchitectural(openingType.roughWidth)} × {formatArchitectural(openingType.roughHeight)}</text>
          <text className="opening-preview-dimension" x={opening.centerOffset} y={canvasHeight - verticalMargin * 0.45} textAnchor="middle">UNIT {formatArchitectural(openingType.unitWidth)} × {formatArchitectural(openingType.unitHeight)}</text>
        </svg>
      </div>
      <dl className="opening-preview-facts">
        <div><dt>Family</dt><dd>{openingType.kind === "door" ? "Door" : "Window"}</dd></div>
        <div><dt>Header bottom</dt><dd>{formatArchitectural(headerBottomHeight)}</dd></div>
        <div><dt>Assembly</dt><dd>{openingType.components.length} editable parts</dd></div>
        <div><dt>Source</dt><dd>{openingType.productSource ? `${openingType.productSource.manufacturer} · ${openingType.productSource.modelNumber}` : "Model Builder parametric"}</dd></div>
      </dl>
      <section className="opening-import-readiness">
        <strong>Manufacturer Product Package</strong>
        <p>Native catalog packages preserve the original source record and editable Model Builder opening and framing data. Reviewed SVG and GLB assets are the next package extension.</p>
        <span>Current: validated metadata + native parametric components</span>
      </section>
    </aside>
  );
}

export function OpeningTypeManagerDialog({
  document,
  onCancel,
  onSave,
}: {
  document: ModelDocument;
  onCancel: () => void;
  onSave: (building: BuildingStructure) => boolean;
}) {
  const [draft, setDraft] = useState(() => cloneBuildingStructure(document.building));
  const [selectedId, setSelectedId] = useState(document.building.activeDoorTypeId);
  const [selectedComponentId, setSelectedComponentId] = useState(document.building.openingTypes.find((type) => type.id === document.building.activeDoorTypeId)?.components[0]?.id ?? "");
  const [error, setError] = useState("");
  const [productImport, setProductImport] = useState<{ fileName: string; openingType: WallOpeningType; product: ManufacturerProductSource } | null>(null);
  const productFileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (productImport) {
        setProductImport(null);
        return;
      }
      onCancel();
    };
    window.addEventListener("keydown", closeWithEscape, true);
    return () => window.removeEventListener("keydown", closeWithEscape, true);
  }, [onCancel, productImport]);
  const selected = draft.openingTypes.find((type) => type.id === selectedId) ?? draft.openingTypes[0];
  const selectedComponent = selected.components.find((component) => component.id === selectedComponentId) ?? selected.components[0];
  const activeWallType = draft.wallTypes.find((type) => type.id === draft.activeWallTypeId) ?? draft.wallTypes[0];
  const selectedHeader = draft.headerTypes.find((type) => type.id === (selected.headerTypeId ?? wallDefaultHeaderTypeId(activeWallType))) ?? draft.headerTypes[0];
  const usageCount = document.lines.reduce((count, line) => count + line.wallOpenings.filter((opening) => opening.wallOpeningTypeId === selected.id).length, 0);
  const headerUsageCount = draft.openingTypes.filter((type) => type.headerTypeId === selectedHeader.id).length +
    draft.wallTypes.filter((type) => wallDefaultHeaderTypeId(type) === selectedHeader.id).length +
    document.lines.reduce((count, line) => count + line.wallOpenings.filter((opening) => opening.headerTypeIdOverride === selectedHeader.id).length, 0);
  const kindCount = draft.openingTypes.filter((type) => type.kind === selected.kind).length;
  const replaceSelected = (change: Partial<WallOpeningType>) => {
    setDraft((current) => ({ ...cloneBuildingStructure(current), openingTypes: current.openingTypes.map((type) => type.id === selected.id ? { ...cloneWallOpeningType(type), ...change } : cloneWallOpeningType(type)) }));
    setError("");
  };
  const replaceSelectedComponent = (change: Partial<OpeningAssemblyComponent>) => {
    setDraft((current) => ({
      ...cloneBuildingStructure(current),
      openingTypes: current.openingTypes.map((type) => type.id === selected.id ? {
        ...cloneWallOpeningType(type),
        components: type.components.map((component) => component.id === selectedComponent.id ? { ...component, ...change } : { ...component }),
      } : cloneWallOpeningType(type)),
    }));
    setError("");
  };
  const addComponent = () => {
    if (selected.components.length >= MAXIMUM_OPENING_COMPONENT_COUNT) return;
    const id = nextOpeningComponentId(selected);
    const component: OpeningAssemblyComponent = {
      depth: 1.5,
      depthAnchor: "center",
      depthOffset: 0,
      divisionCount: 1,
      geometry: "perimeter",
      id,
      inset: 0,
      material: "Wood",
      name: nextOpeningComponentName(selected),
      parentComponentId: null,
      profileWidth: 1.5,
      role: "frame",
      visible: true,
    };
    replaceSelected({ components: [...selected.components.map((candidate) => ({ ...candidate })), component] });
    setSelectedComponentId(id);
  };
  const duplicateComponent = () => {
    if (selected.components.length >= MAXIMUM_OPENING_COMPONENT_COUNT) return;
    const id = nextOpeningComponentId(selected);
    const copy = { ...selectedComponent, id, name: nextOpeningComponentName(selected, `${selectedComponent.name} Copy`), parentComponentId: selectedComponent.parentComponentId };
    replaceSelected({ components: [...selected.components.map((candidate) => ({ ...candidate })), copy] });
    setSelectedComponentId(id);
  };
  const deleteComponent = () => {
    if (selected.components.length <= 1 || selected.components.some((candidate) => candidate.parentComponentId === selectedComponent.id)) return;
    const remaining = selected.components.filter((candidate) => candidate.id !== selectedComponent.id).map((candidate) => ({ ...candidate }));
    replaceSelected({ components: remaining });
    setSelectedComponentId(selectedComponent.parentComponentId ?? remaining[0].id);
  };
  const componentParentOptions = selected.components.filter((candidate) => {
    if (candidate.id === selectedComponent.id) return false;
    let parentId = candidate.parentComponentId;
    while (parentId !== null) {
      if (parentId === selectedComponent.id) return false;
      parentId = selected.components.find((item) => item.id === parentId)?.parentComponentId ?? null;
    }
    return true;
  });
  const replaceSelectedHeader = (change: Partial<WallHeaderType>) => {
    setDraft((current) => ({ ...cloneBuildingStructure(current), headerTypes: current.headerTypes.map((type) => type.id === selectedHeader.id ? { ...cloneWallHeaderType(type), ...change } : cloneWallHeaderType(type)) }));
    setError("");
  };
  const duplicateHeaderType = () => {
    if (draft.headerTypes.length >= MAXIMUM_WALL_HEADER_TYPE_COUNT) return;
    const id = nextWallHeaderTypeId(draft);
    const copy = { ...cloneWallHeaderType(selectedHeader), id, name: nextWallHeaderTypeName(draft, selectedHeader.name), scheduleMark: nextWallHeaderScheduleMark(draft) };
    setDraft((current) => ({
      ...cloneBuildingStructure(current),
      headerTypes: [...current.headerTypes.map(cloneWallHeaderType), copy],
      openingTypes: current.openingTypes.map((type) => type.id === selected.id ? { ...cloneWallOpeningType(type), headerTypeId: id } : cloneWallOpeningType(type)),
    }));
    setError("");
  };
  const duplicateType = () => {
    if (draft.openingTypes.length >= MAXIMUM_WALL_OPENING_TYPE_COUNT) return;
    const id = nextWallOpeningTypeId(draft, selected.kind);
    const copy = { ...cloneWallOpeningType(selected), id, name: nextWallOpeningTypeName(draft, selected.name) };
    setDraft((current) => ({
      ...cloneBuildingStructure(current),
      [selected.kind === "door" ? "activeDoorTypeId" : "activeWindowTypeId"]: id,
      openingTypes: [...current.openingTypes.map(cloneWallOpeningType), copy],
    }));
    setSelectedId(id);
  };
  const deleteType = () => {
    if (kindCount <= 1 || usageCount > 0) return;
    const remaining = draft.openingTypes.filter((type) => type.id !== selected.id).map(cloneWallOpeningType);
    const activeKey = selected.kind === "door" ? "activeDoorTypeId" : "activeWindowTypeId";
    const nextActive = draft[activeKey] === selected.id ? remaining.find((type) => type.kind === selected.kind)!.id : draft[activeKey];
    setDraft((current) => ({ ...cloneBuildingStructure(current), [activeKey]: nextActive, openingTypes: remaining }));
    setSelectedId(nextActive);
  };
  const importProductFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAXIMUM_PRODUCT_PACKAGE_BYTES) {
      setError("This product package is larger than the supported 2 MB native-package limit.");
      return;
    }
    try {
      const result = parseProductPackage(await file.text());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setProductImport({ fileName: file.name, openingType: result.openingType, product: result.product });
      setError("");
    } catch {
      setError("Model Builder could not read this product package.");
    }
  };
  const confirmProductImport = () => {
    if (!productImport || draft.openingTypes.length >= MAXIMUM_WALL_OPENING_TYPE_COUNT) return;
    const id = nextWallOpeningTypeId(draft, productImport.openingType.kind);
    const imported = {
      ...cloneWallOpeningType(productImport.openingType),
      headerTypeId: null,
      id,
      name: availableWallOpeningTypeName(draft, productImport.openingType.name),
      productSource: { ...productImport.product },
    };
    const activeKey = imported.kind === "door" ? "activeDoorTypeId" : "activeWindowTypeId";
    setDraft((current) => ({
      ...cloneBuildingStructure(current),
      [activeKey]: id,
      openingTypes: [...current.openingTypes.map(cloneWallOpeningType), imported],
    }));
    setSelectedId(id);
    setSelectedComponentId(imported.components[0]?.id ?? "");
    setProductImport(null);
    setError("");
  };
  const makeActive = () => setDraft((current) => ({ ...cloneBuildingStructure(current), [selected.kind === "door" ? "activeDoorTypeId" : "activeWindowTypeId"]: selected.id }));
  const activeId = selected.kind === "door" ? draft.activeDoorTypeId : draft.activeWindowTypeId;
  const doorPanelLayout = doorPanelLayoutForType(selected);
  const windowSashArrangement = windowSashArrangementForType(selected);
  const windowLitePattern = windowLitePatternForType(selected);
  const save = () => {
    const next = cloneBuildingStructure(draft);
    if (!buildingStructureIsValid(next)) {
      setError("Check names, dimensions, framing counts, unique header schedule marks, and Wall compatibility. Unit size must fit inside the rough opening, and every project needs at least one Door and one Window type.");
      return;
    }
    if (!onSave(next)) {
      setError("This header assembly is wider than the Main layer of at least one Wall where the Door or Window type is already placed. Choose a thinner assembly, duplicate the opening type, or use a thicker host Wall.");
    }
  };
  return (
    <div className="story-manager-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="story-manager wall-type-manager opening-type-manager" role="dialog" aria-modal="true" aria-labelledby="opening-type-manager-title">
        <header className="story-manager-header"><div><strong id="opening-type-manager-title">Door &amp; Window Type Manager</strong><span>Reusable units, rough openings, finish returns, and shared structural header assemblies.</span></div><button type="button" onClick={onCancel} aria-label="Close Door and Window Type Manager">×</button></header>
        <div className="story-manager-body">
          <aside className="story-list">
            <header><strong>Component Types</strong><span>{draft.openingTypes.length} defined</span></header>
            {draft.openingTypes.map((type) => {
              const isActive = type.id === (type.kind === "door" ? draft.activeDoorTypeId : draft.activeWindowTypeId);
              return <button type="button" key={type.id} className={type.id === selected.id ? "is-selected" : ""} onClick={() => { setSelectedId(type.id); setSelectedComponentId(type.components[0]?.id ?? ""); }}><strong>{type.name}</strong><span>{type.kind === "door" ? "Door" : "Window"} · {formatArchitectural(type.unitWidth)} × {formatArchitectural(type.unitHeight)} · {type.components.length} parts</span>{isActive ? <small>ACTIVE {type.kind.toUpperCase()}</small> : null}</button>;
            })}
            <div className="story-list-actions opening-type-list-actions"><button type="button" onClick={() => productFileInputRef.current?.click()} disabled={draft.openingTypes.length >= MAXIMUM_WALL_OPENING_TYPE_COUNT}>Import Product…</button><button type="button" onClick={duplicateType} disabled={draft.openingTypes.length >= MAXIMUM_WALL_OPENING_TYPE_COUNT}>＋ Duplicate</button><button type="button" onClick={deleteType} disabled={kindCount <= 1 || usageCount > 0}>Delete</button></div>
            <input ref={productFileInputRef} className="project-file-input" type="file" accept={`${PRODUCT_PACKAGE_EXTENSION},application/json`} onChange={importProductFile} />
          </aside>
          <main className="story-editor opening-type-editor">
            <section className="story-editor-summary foundation-editor-summary">
              <label><span>Type name</span><input value={selected.name} maxLength={100} onChange={(event) => replaceSelected({ name: event.target.value })} /></label>
              <label><span>Component family</span><output className="room-output">{selected.kind === "door" ? "Door" : "Window"}</output></label>
              <button type="button" className={selected.id === activeId ? "is-anchor" : ""} onClick={makeActive}>{selected.id === activeId ? `Active ${selected.kind} type` : `Make active ${selected.kind}`}</button>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Unit &amp; Rough Opening</strong><span>The product size and the structural cut remain separate.</span></div><output>{usageCount} placed</output></header>
              <div className="foundation-field-grid">
                <StoryDimensionInput key={`${selected.id}:uw:${selected.unitWidth}`} label="Unit width" value={selected.unitWidth} onChange={(unitWidth) => replaceSelected({ unitWidth })} />
                <StoryDimensionInput key={`${selected.id}:uh:${selected.unitHeight}`} label="Unit height" value={selected.unitHeight} onChange={(unitHeight) => replaceSelected({ unitHeight })} />
                <StoryDimensionInput key={`${selected.id}:rw:${selected.roughWidth}`} label="Rough width" value={selected.roughWidth} onChange={(roughWidth) => replaceSelected({ roughWidth })} />
                <StoryDimensionInput key={`${selected.id}:rh:${selected.roughHeight}`} label="Rough height" value={selected.roughHeight} onChange={(roughHeight) => replaceSelected({ roughHeight, ...(selected.kind === "door" ? { defaultHeaderBottomHeight: roughHeight } : {}) })} />
                <StoryDimensionInput signed key={`${selected.id}:uox:${selected.unitOffsetX}`} label="Unit horizontal offset" value={selected.unitOffsetX} onChange={(unitOffsetX) => replaceSelected({ unitOffsetX })} />
                <StoryDimensionInput allowZero key={`${selected.id}:uoz:${selected.unitOffsetZ}`} label="Unit bottom above rough" value={selected.unitOffsetZ} onChange={(unitOffsetZ) => replaceSelected({ unitOffsetZ })} />
                {selected.kind === "window" ? <StoryDimensionInput key={`${selected.id}:hh:${selected.defaultHeaderBottomHeight}`} label="Default header bottom" value={selected.defaultHeaderBottomHeight} onChange={(defaultHeaderBottomHeight) => replaceSelected({ defaultHeaderBottomHeight })} /> : <label className="story-field"><span>Header bottom</span><output className="room-output">Matches rough height</output></label>}
              </div>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Manufacturer Product</strong><span>Identity and source provenance stay attached to this reusable Type.</span></div><output>{selected.productSource ? "Catalog product" : "Native generic"}</output></header>
              {selected.productSource ? <div className="manufacturer-product-record">
                <dl>
                  <div><dt>Manufacturer</dt><dd>{selected.productSource.manufacturer}</dd></div>
                  <div><dt>Product line</dt><dd>{selected.productSource.productLine || "Not supplied"}</dd></div>
                  <div><dt>Model number</dt><dd>{selected.productSource.modelNumber}</dd></div>
                  <div><dt>Revision</dt><dd>{selected.productSource.revision || "Not supplied"}</dd></div>
                  <div><dt>Original source</dt><dd>{selected.productSource.sourceFileName}</dd></div>
                  <div><dt>Source format</dt><dd>{selected.productSource.sourceFormat.toUpperCase()}</dd></div>
                  <div><dt>Source URL</dt><dd>{selected.productSource.sourceUrl || "Not supplied"}</dd></div>
                  <div><dt>Verified</dt><dd>{selected.productSource.verifiedAt ? new Date(selected.productSource.verifiedAt).toLocaleDateString() : "Not supplied"}</dd></div>
                </dl>
                <p>The imported source record is preserved while unit, rough-opening, and native component settings remain editable.</p>
              </div> : <p className="opening-type-note manufacturer-product-empty">This Type was created in Model Builder and does not claim a manufacturer identity. Use Import Product to add a validated catalog package.</p>}
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Product Layout Generator</strong><span>Build familiar residential product geometry from editable components.</span></div><output>Parametric</output></header>
              <div className="foundation-field-grid">
                {selected.kind === "door" ? <label className="story-field"><span>Door panel layout</span><select value={doorPanelLayout ?? "custom"} onChange={(event) => { const configured = configureDoorPanelLayout(selected, event.target.value as DoorPanelLayout); if (configured) replaceSelected(configured); }}><option value="custom" disabled>Custom component layout</option>{DOOR_PANEL_LAYOUTS.map((layout) => <option key={layout} value={layout}>{layout === "flush" ? "Flush slab" : titleCase(layout)}</option>)}</select></label> : <>
                  <label className="story-field"><span>Sash arrangement</span><select value={windowSashArrangement ?? "custom"} onChange={(event) => { const configured = configureWindowSashArrangement(selected, event.target.value as WindowSashArrangement); if (configured) replaceSelected(configured); }}><option value="custom" disabled>Custom component layout</option>{WINDOW_SASH_ARRANGEMENTS.map((arrangement) => <option key={arrangement} value={arrangement}>{titleCase(arrangement)}</option>)}</select></label>
                  <label className="story-field"><span>Divided-lite pattern</span><select value={windowLitePattern ?? "custom"} onChange={(event) => { const configured = configureWindowLitePattern(selected, event.target.value as WindowLitePattern); if (configured) replaceSelected(configured); }}><option value="custom" disabled>Custom component layout</option>{WINDOW_LITE_PATTERNS.map((pattern) => <option key={pattern} value={pattern}>{pattern === "none" ? "None" : titleCase(pattern)}</option>)}</select></label>
                </>}
              </div>
              <p className="opening-type-note">Generators create ordinary, editable assembly components: raised Door panel fields, fixed or operable Window sash sets, and equal, colonial, or prairie grille patterns. Product identity and manufacturer-specific profile libraries remain separate so generic geometry is never presented as a certified manufacturer model.</p>
            </section>
            <section className="foundation-setting-section opening-component-section">
              <header><div><strong>3D Assembly Components</strong><span>Joined parametric parts generated inside the independent rough opening.</span></div><output>{selected.components.length} parts</output></header>
              <div className="opening-component-toolbar">
                <label className="story-field"><span>Selected component</span><select value={selectedComponent.id} onChange={(event) => setSelectedComponentId(event.target.value)}>{selected.components.map((component) => <option key={component.id} value={component.id}>{component.name} · {component.role}</option>)}</select></label>
                <button type="button" onClick={addComponent} disabled={selected.components.length >= MAXIMUM_OPENING_COMPONENT_COUNT}>＋ Add</button>
                <button type="button" onClick={duplicateComponent} disabled={selected.components.length >= MAXIMUM_OPENING_COMPONENT_COUNT}>Duplicate</button>
                <button type="button" onClick={deleteComponent} disabled={selected.components.length <= 1 || selected.components.some((candidate) => candidate.parentComponentId === selectedComponent.id)}>Delete</button>
              </div>
              <div className="foundation-field-grid">
                <label className="story-field"><span>Component name</span><input value={selectedComponent.name} maxLength={100} onChange={(event) => replaceSelectedComponent({ name: event.target.value })} /></label>
                <label className="story-field"><span>Role</span><select value={selectedComponent.role} onChange={(event) => replaceSelectedComponent({ role: event.target.value as OpeningAssemblyComponent["role"] })}>{OPENING_COMPONENT_ROLES.map((role) => <option key={role} value={role}>{titleCase(role)}</option>)}</select></label>
                <label className="story-field"><span>Geometry</span><select value={selectedComponent.geometry} onChange={(event) => replaceSelectedComponent({ geometry: event.target.value as OpeningAssemblyComponent["geometry"] })}>{OPENING_COMPONENT_GEOMETRIES.map((geometry) => <option key={geometry} value={geometry}>{titleCase(geometry)}</option>)}</select></label>
                <label className="story-field"><span>Joined inside</span><select value={selectedComponent.parentComponentId ?? ""} onChange={(event) => replaceSelectedComponent({ parentComponentId: event.target.value || null })}><option value="">Unit rectangle</option>{componentParentOptions.map((component) => <option key={component.id} value={component.id}>{component.name}</option>)}</select></label>
                <label className="story-field"><span>Material</span><input value={selectedComponent.material} maxLength={120} onChange={(event) => replaceSelectedComponent({ material: event.target.value })} /></label>
                <label className="story-field"><span>Display</span><span className="room-checkbox-field"><input type="checkbox" checked={selectedComponent.visible} onChange={(event) => replaceSelectedComponent({ visible: event.target.checked })} /> Visible in model</span></label>
                <StoryDimensionInput signed key={`${selected.id}:${selectedComponent.id}:inset:${selectedComponent.inset}`} label="Inset from parent" value={selectedComponent.inset} onChange={(inset) => replaceSelectedComponent({ inset })} />
                <StoryDimensionInput key={`${selected.id}:${selectedComponent.id}:profile:${selectedComponent.profileWidth}`} label={selectedComponent.geometry === "panel-grid" ? "Panel gap" : selectedComponent.geometry.includes("divider") ? "Divider width" : "Profile width"} value={selectedComponent.profileWidth} onChange={(profileWidth) => replaceSelectedComponent({ profileWidth })} />
                <StoryDimensionInput key={`${selected.id}:${selectedComponent.id}:depth:${selectedComponent.depth}`} label="Component depth" value={selectedComponent.depth} onChange={(depth) => replaceSelectedComponent({ depth })} />
                <label className="story-field"><span>Depth anchor</span><select value={selectedComponent.depthAnchor} onChange={(event) => replaceSelectedComponent({ depthAnchor: event.target.value as OpeningAssemblyComponent["depthAnchor"] })}>{OPENING_COMPONENT_DEPTH_ANCHORS.map((anchor) => <option key={anchor} value={anchor}>{titleCase(anchor)} face</option>)}</select></label>
                <StoryDimensionInput allowZero key={`${selected.id}:${selectedComponent.id}:do:${selectedComponent.depthOffset}`} label="Depth offset" value={selectedComponent.depthOffset} onChange={(depthOffset) => replaceSelectedComponent({ depthOffset })} />
                {selectedComponent.geometry.includes("divider") || selectedComponent.geometry === "panel-grid" ? <label className="story-field"><span>{selectedComponent.geometry === "panel-grid" ? "Panel count" : "Divider count"}</span><select value={selectedComponent.divisionCount} onChange={(event) => replaceSelectedComponent({ divisionCount: Number(event.target.value) })}>{[1, 2, 3, 4, 5, 6, 7, 8].map((count) => <option key={count} value={count}>{count}</option>)}</select></label> : null}
              </div>
              <p className="opening-type-note">Each part keeps a stable identity for future schedules and placed-object overrides. A child uses its parent&apos;s clear opening, so changing the frame, sash, glass, panel, mullion, jamb, or trim dimensions rebuilds the joined 3D object without changing the structural rough opening.</p>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Finish Returns</strong><span>Generate jamb, head, and Window sill finish geometry inside the rough opening.</span></div></header>
              <div className="foundation-field-grid">
                <StoryDimensionInput allowZero key={`${selected.id}:er:${selected.exteriorReturnDepth}`} label="Exterior return depth" value={selected.exteriorReturnDepth} onChange={(exteriorReturnDepth) => replaceSelected({ exteriorReturnDepth })} />
                <StoryDimensionInput allowZero key={`${selected.id}:ir:${selected.interiorReturnDepth}`} label="Interior return depth" value={selected.interiorReturnDepth} onChange={(interiorReturnDepth) => replaceSelected({ interiorReturnDepth })} />
              </div>
              <p className="opening-type-note">Each nonzero depth generates returns from that Wall face. If their combined depth exceeds a thinner Wall, the two sides meet without overlapping. Structural framing will use the rough opening, not the unit size.</p>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Opening Framing</strong><span>Define the repeatable framing package generated with this component type.</span></div></header>
              <div className="foundation-field-grid">
                <label className="story-field"><span>Header source</span><select value={selected.headerTypeId ?? ""} onChange={(event) => replaceSelected({ headerTypeId: event.target.value || null })}><option value="">Automatic from host Wall Type</option>{draft.headerTypes.map((type) => <option key={type.id} value={type.id}>{type.scheduleMark} · {type.name}</option>)}</select></label>
                {selectedHeader.layout === "flat-stack" ? <label className="story-field"><span>Generated header depth</span><output className="room-output">{formatArchitectural(selectedHeader.plyCount * selectedHeader.plyThickness)}</output></label> : <StoryDimensionInput key={`${selected.id}:hd:${selected.headerDepth}`} label="Header depth" value={selected.headerDepth} onChange={(headerDepth) => replaceSelected({ headerDepth })} />}
                <label className="story-field"><span>King studs per side</span><select value={selected.kingStudCountPerSide} onChange={(event) => replaceSelected({ kingStudCountPerSide: Number(event.target.value) })}>{[0, 1, 2, 3].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
                <label className="story-field"><span>Jack studs per side</span><select value={selected.jackStudCountPerSide} onChange={(event) => replaceSelected({ jackStudCountPerSide: Number(event.target.value) })}>{[0, 1, 2, 3, 4].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
                {selected.kind === "window" ? <label className="story-field"><span>Rough-sill plates</span><select value={selected.windowSillPlateCount} onChange={(event) => replaceSelected({ windowSillPlateCount: Number(event.target.value) })}>{[0, 1, 2].map((count) => <option key={count} value={count}>{count}</option>)}</select></label> : <label className="story-field"><span>Rough sill</span><output className="room-output">Not used for Doors</output></label>}
              </div>
              <p className="opening-type-note">These are explicit drafting and modeling rules, not an engineered span calculation. Header depth is limited by the available space below the top plates; sizing and support counts must be selected for the project&apos;s loads, span, material, and code requirements.</p>
            </section>
            <section className="foundation-setting-section">
              <header><div><strong>Header Assembly Definition</strong><span>{selected.headerTypeId === null ? `Previewing the ${activeWallType.name} default; ` : ""}shared by {headerUsageCount} Wall or opening type{headerUsageCount === 1 ? "" : "s"}.</span></div><button type="button" onClick={duplicateHeaderType} disabled={draft.headerTypes.length >= MAXIMUM_WALL_HEADER_TYPE_COUNT}>Duplicate &amp; Assign</button></header>
              <div className="foundation-field-grid">
                <label className="story-field"><span>Assembly name</span><input value={selectedHeader.name} maxLength={100} onChange={(event) => replaceSelectedHeader({ name: event.target.value })} /></label>
                <label className="story-field"><span>Schedule mark</span><input value={selectedHeader.scheduleMark} maxLength={16} onChange={(event) => replaceSelectedHeader({ scheduleMark: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} /></label>
                <label className="story-field"><span>Layout</span><select value={selectedHeader.layout} onChange={(event) => { const layout = event.target.value as WallHeaderType["layout"]; replaceSelectedHeader({ layout, ...(layout === "on-edge" ? {} : { alignment: "center", fillMethod: "none" }) }); }}><option value="on-edge">Built-up on edge</option><option value="flat-stack">Members on flat</option><option value="solid">Full Main depth</option></select></label>
                <label className="story-field"><span>Structural material</span><input value={selectedHeader.plyMaterial} maxLength={120} onChange={(event) => replaceSelectedHeader({ plyMaterial: event.target.value })} /></label>
                {selectedHeader.layout !== "solid" ? <label className="story-field"><span>{selectedHeader.layout === "flat-stack" ? "Flat courses" : "Structural plies"}</span><select value={selectedHeader.plyCount} onChange={(event) => replaceSelectedHeader({ plyCount: Number(event.target.value) })}>{[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count}</option>)}</select></label> : null}
                {selectedHeader.layout !== "solid" ? <StoryDimensionInput key={`${selectedHeader.id}:pt:${selectedHeader.plyThickness}`} label={selectedHeader.layout === "flat-stack" ? "Course thickness" : "Ply thickness"} value={selectedHeader.plyThickness} onChange={(plyThickness) => replaceSelectedHeader({ plyThickness })} /> : null}
                {selectedHeader.layout === "on-edge" ? <label className="story-field"><span>Fill method</span><select value={selectedHeader.fillMethod} onChange={(event) => { const fillMethod = event.target.value as WallHeaderType["fillMethod"]; replaceSelectedHeader({ fillMethod, ...(fillMethod === "interior-insulation" ? { alignment: "exterior" } : {}) }); }}><option value="none">None</option><option value="interior-insulation">Rigid insulation at interior</option><option value="between-plies">Spacers between plies</option></select></label> : null}
                {selectedHeader.layout === "on-edge" && selectedHeader.fillMethod !== "none" ? <label className="story-field"><span>{selectedHeader.fillMethod === "interior-insulation" ? "Insulation material" : "Spacer material"}</span><input value={selectedHeader.fillMaterial} maxLength={120} onChange={(event) => replaceSelectedHeader({ fillMaterial: event.target.value })} /></label> : null}
                {selectedHeader.layout === "on-edge" && selectedHeader.fillMethod === "between-plies" ? <StoryDimensionInput key={`${selectedHeader.id}:st:${selectedHeader.spacerThickness}`} label="Spacer thickness" value={selectedHeader.spacerThickness} onChange={(spacerThickness) => replaceSelectedHeader({ spacerThickness })} /> : null}
                {selectedHeader.layout === "on-edge" && selectedHeader.fillMethod !== "interior-insulation" ? <label className="story-field"><span>Across-wall alignment</span><select value={selectedHeader.alignment} onChange={(event) => replaceSelectedHeader({ alignment: event.target.value as WallHeaderType["alignment"] })}><option value="exterior">Exterior</option><option value="center">Centered</option><option value="interior">Interior</option></select></label> : null}
                <label className="story-field"><span>Main thickness required</span><output className="room-output">{wallHeaderTypeRequiredMainThickness(selectedHeader) === 0 ? "Adapts to Wall" : formatArchitectural(wallHeaderTypeRequiredMainThickness(selectedHeader))}</output></label>
                <label className="story-field"><span>Engineering review</span><span className="room-checkbox-field"><input type="checkbox" checked={selectedHeader.engineeringRequired} onChange={(event) => replaceSelectedHeader({ engineeringRequired: event.target.checked })} /> Required</span></label>
              </div>
              <p className="opening-type-note">On-edge plies and spacers are modeled across the Wall Main layer. Interior-rigid assemblies place the structural plies at the exterior and fill the remaining interior cavity. Flat members span the Main layer and stack vertically. Steel is supported as a user-defined rectangular material representation; detailed steel profiles can be added later.</p>
            </section>
          </main>
          <OpeningTypePreview openingType={selected} wallType={activeWallType} />
        </div>
        {error ? <p className="story-manager-error" role="alert">{error}</p> : null}
        <footer className="story-manager-footer"><span>{draft.openingTypes.length} opening types · {draft.headerTypes.length} reusable header assemblies · saved with this project</span><div><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="story-save" onClick={save}>Apply Opening Types</button></div></footer>
      </section>
      {productImport ? <div className="product-import-backdrop" role="presentation" onMouseDown={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) setProductImport(null); }}>
        <section className="product-import-review" role="dialog" aria-modal="true" aria-labelledby="product-import-review-title">
          <header><div><strong id="product-import-review-title">Review Manufacturer Product</strong><span>Nothing is added until you confirm this package.</span></div><button type="button" onClick={() => setProductImport(null)} aria-label="Close product import review">×</button></header>
          <div className="product-import-review-body">
            <dl>
              <div><dt>Package</dt><dd>{productImport.fileName}</dd></div>
              <div><dt>Manufacturer</dt><dd>{productImport.product.manufacturer}</dd></div>
              <div><dt>Product</dt><dd>{[productImport.product.productLine, productImport.product.modelNumber].filter(Boolean).join(" · ")}</dd></div>
              <div><dt>Revision</dt><dd>{productImport.product.revision || "Not supplied"}</dd></div>
              <div><dt>Original source</dt><dd>{productImport.product.sourceFileName} · {productImport.product.sourceFormat.toUpperCase()}</dd></div>
              <div><dt>Family</dt><dd>{productImport.openingType.kind === "door" ? "Door" : "Window"}</dd></div>
              <div><dt>Unit size</dt><dd>{formatArchitectural(productImport.openingType.unitWidth)} × {formatArchitectural(productImport.openingType.unitHeight)}</dd></div>
              <div><dt>Rough opening</dt><dd>{formatArchitectural(productImport.openingType.roughWidth)} × {formatArchitectural(productImport.openingType.roughHeight)}</dd></div>
              <div><dt>Native components</dt><dd>{productImport.openingType.components.length}</dd></div>
            </dl>
            {draft.openingTypes.some((type) => type.productSource?.manufacturer.toLocaleLowerCase() === productImport.product.manufacturer.toLocaleLowerCase() && type.productSource.modelNumber.toLocaleLowerCase() === productImport.product.modelNumber.toLocaleLowerCase() && type.productSource.revision.toLocaleLowerCase() === productImport.product.revision.toLocaleLowerCase()) ? <p className="product-import-warning"><strong>Matching catalog product found.</strong> Confirming will add a separate Type with a unique name; the existing Type and all placed openings remain unchanged.</p> : <p className="product-import-note">Model Builder will create a new Type with a fresh project ID. The package cannot bind itself to a local header assembly; the imported Type will use the host Wall&apos;s header default until you choose an override.</p>}
            <p className="product-import-boundary"><strong>Native package only.</strong> DWG, RFA, SKP, IFC, and other manufacturer source files still require a reviewed conversion adapter before they can be imported safely.</p>
          </div>
          <footer><button type="button" onClick={() => setProductImport(null)}>Cancel</button><button type="button" className="story-save" onClick={confirmProductImport}>Import as New Type</button></footer>
        </section>
      </div> : null}
    </div>
  );
}
