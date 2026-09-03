"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import {
  PRODUCT_ASSET_ORIGINS,
  PRODUCT_ASSET_SOURCE_UNITS,
  PRODUCT_OBJECT_CATEGORIES,
  type BuildingStructure,
  type ProductAssetReference,
  type ProductObjectCategory,
} from "@/lib/building-stories";
import {
  formatArchitectural,
  formatSignedArchitectural,
  parseArchitectural,
  parseSignedArchitectural,
  snapToSixteenth,
} from "@/lib/architectural-units";
import { MAXIMUM_PRODUCT_ASSET_BYTES, productAssetFormatFromFileName } from "@/lib/product-assets";
import { createProjectProductLibrary, filterProjectProductLibrary, type ProductLibraryCategory, type ProductLibraryTarget } from "@/lib/product-library";

export type ProductLibraryDialogProps = {
  building: BuildingStructure;
  selectedWallName: string | null;
  onActivate: (target: ProductLibraryTarget) => void;
  onAssetAttached: (target: ProductLibraryTarget, asset: ProductAssetReference) => boolean;
  onAssetUpdated: (target: ProductLibraryTarget, asset: ProductAssetReference) => boolean;
  onCancel: () => void;
  onCreateObjectType: (definition: { category: ProductObjectCategory; dimensions: { height: number; length: number; width: number }; name: string }) => boolean;
  onManageOpeningTypes: () => void;
  onPlace: (target: ProductLibraryTarget) => void;
};

function titleCase(value: string): string {
  return value.replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function ArchitecturalDimensionInput({
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
  return <label className="story-field"><span>{label}</span><div className={error ? "story-field-shell is-error" : "story-field-shell"}><input value={draft} onChange={(event) => { setDraft(event.target.value); setError(false); }} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setDraft(formatter(value)); setError(false); event.currentTarget.blur(); } }} aria-label={label} spellCheck={false} /><small>ft-in</small></div></label>;
}

export function ProductLibraryDialog({
  building,
  selectedWallName,
  onActivate,
  onAssetAttached,
  onAssetUpdated,
  onCancel,
  onCreateObjectType,
  onManageOpeningTypes,
  onPlace,
}: ProductLibraryDialogProps) {
  const [category, setCategory] = useState<"all" | ProductLibraryCategory>("all");
  const [query, setQuery] = useState("");
  const [assetTarget, setAssetTarget] = useState<ProductLibraryTarget | null>(null);
  const [assetImport, setAssetImport] = useState<{ file: File; format: "glb" | "svg"; name: string; role: ProductAssetReference["role"] } | null>(null);
  const [assetImportError, setAssetImportError] = useState("");
  const [assetUploading, setAssetUploading] = useState(false);
  const [assetEdit, setAssetEdit] = useState<{ asset: ProductAssetReference; target: ProductLibraryTarget; typeId: string } | null>(null);
  const [assetEditError, setAssetEditError] = useState("");
  const [newObject, setNewObject] = useState<{ category: ProductObjectCategory; dimensions: { height: number; length: number; width: number }; name: string } | null>(null);
  const assetInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (assetEdit) {
        setAssetEdit(null);
        setAssetEditError("");
      } else if (assetImport) {
        setAssetImport(null);
        setAssetImportError("");
      } else if (newObject) {
        setNewObject(null);
      } else onCancel();
    };
    window.addEventListener("keydown", closeWithEscape, true);
    return () => window.removeEventListener("keydown", closeWithEscape, true);
  }, [assetEdit, assetImport, newObject, onCancel]);

  const requestAssetImport = (target: ProductLibraryTarget) => {
    setAssetTarget(target);
    setAssetImportError("");
    assetInputRef.current?.click();
  };
  const selectAssetFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !assetTarget) return;
    const format = productAssetFormatFromFileName(file.name);
    if (!format) {
      setAssetImportError("Choose an SVG drawing or GLB 3D model.");
      return;
    }
    if (!file.size || file.size > MAXIMUM_PRODUCT_ASSET_BYTES) {
      setAssetImportError("Product assets must contain data and cannot exceed 25 MB.");
      return;
    }
    const baseName = file.name.replace(/\.(?:glb|svg)$/i, "").replace(/[-_]+/g, " ").trim();
    setAssetImport({ file, format, name: baseName || (format === "glb" ? "Manufacturer 3D Model" : "Manufacturer Drawing"), role: format === "glb" ? "model-3d" : "elevation-symbol" });
    setAssetImportError("");
  };
  const uploadAsset = async () => {
    if (!assetImport || !assetTarget || assetUploading) return;
    setAssetUploading(true);
    setAssetImportError("");
    try {
      const response = await fetch("/api/product-assets", {
        body: assetImport.file,
        headers: {
          "Content-Type": assetImport.format === "glb" ? "model/gltf-binary" : "image/svg+xml",
          "X-Product-Asset-File-Name": encodeURIComponent(assetImport.file.name),
          "X-Product-Asset-Name": encodeURIComponent(assetImport.name),
          "X-Product-Asset-Role": assetImport.role,
        },
        method: "POST",
      });
      const result = await response.json() as { asset?: ProductAssetReference; error?: string };
      if (!response.ok || !result.asset) throw new Error(result.error || "The product asset could not be stored.");
      if (!onAssetAttached(assetTarget, result.asset)) {
        await fetch(result.asset.sourceUrl, { method: "DELETE" });
        throw new Error("The uploaded representation did not produce a valid product Type.");
      }
      setAssetImport(null);
      setAssetTarget(null);
    } catch (error) {
      setAssetImportError(error instanceof Error ? error.message : "The product asset could not be stored.");
    } finally {
      setAssetUploading(false);
    }
  };
  const editAsset = (target: ProductLibraryTarget, asset: ProductAssetReference) => {
    setAssetEdit({ asset: { ...asset, alignment: { ...asset.alignment } }, target, typeId: target.typeId });
    setAssetEditError("");
  };
  const updateEditedAsset = (change: Partial<ProductAssetReference>) => {
    setAssetEdit((current) => current ? { ...current, asset: { ...current.asset, ...change } } : current);
    setAssetEditError("");
  };
  const updateEditedAlignment = (change: Partial<ProductAssetReference["alignment"]>) => {
    setAssetEdit((current) => current ? { ...current, asset: { ...current.asset, alignment: { ...current.asset.alignment, ...change } } } : current);
    setAssetEditError("");
  };
  const saveEditedAsset = () => {
    if (!assetEdit) return;
    if (!onAssetUpdated(assetEdit.target, assetEdit.asset)) {
      setAssetEditError("Check the scale, rotation, offsets, purpose, and representation name.");
      return;
    }
    setAssetEdit(null);
    setAssetEditError("");
  };
  const entries = filterProjectProductLibrary(createProjectProductLibrary(building), query, category);
  const assetTargetName = assetTarget ? entries.find((entry) => entry.target.kind === assetTarget.kind && entry.target.typeId === assetTarget.typeId)?.name : undefined;
  const assetEditTargetName = assetEdit ? entries.find((entry) => entry.target.kind === assetEdit.target.kind && entry.target.typeId === assetEdit.target.typeId)?.name : undefined;

  return (
    <div className="story-manager-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="story-manager product-library-manager" role="dialog" aria-modal="true" aria-labelledby="product-library-title">
        <input ref={assetInputRef} className="product-library-file-input" type="file" accept=".svg,.glb,image/svg+xml,model/gltf-binary" onChange={selectAssetFile} />
        <header className="story-manager-header"><div><strong id="product-library-title">Project Product Library</strong><span>Reusable Doors, Windows, and ordinary objects. Hosted openings retain their Wall behavior; objects place on the current Layer.</span></div><button type="button" onClick={onCancel} aria-label="Close Product Library">×</button></header>
        {newObject ? <div className="product-asset-import-backdrop" role="presentation">
          <section className="product-asset-import product-object-type-dialog" role="dialog" aria-modal="true" aria-labelledby="product-object-type-title">
            <header><div><strong id="product-object-type-title">New Object Type</strong><span>Create a reusable, non-hosted product with an editable native fallback.</span></div><button type="button" onClick={() => setNewObject(null)} aria-label="Close new object Type">×</button></header>
            <div className="product-asset-import-body product-object-type-body">
              <label><span>Type name</span><input maxLength={100} value={newObject.name} onChange={(event) => setNewObject((current) => current ? { ...current, name: event.target.value } : current)} /></label>
              <label><span>Category</span><select value={newObject.category} onChange={(event) => setNewObject((current) => current ? { ...current, category: event.target.value as ProductObjectCategory } : current)}>{PRODUCT_OBJECT_CATEGORIES.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
              <ArchitecturalDimensionInput label="Length (X)" value={newObject.dimensions.length} onChange={(length) => setNewObject((current) => current ? { ...current, dimensions: { ...current.dimensions, length } } : current)} />
              <ArchitecturalDimensionInput label="Width (Y)" value={newObject.dimensions.width} onChange={(width) => setNewObject((current) => current ? { ...current, dimensions: { ...current.dimensions, width } } : current)} />
              <ArchitecturalDimensionInput label="Height (Z)" value={newObject.dimensions.height} onChange={(height) => setNewObject((current) => current ? { ...current, dimensions: { ...current.dimensions, height } } : current)} />
              <p>The Type stores product identity, native size, and optional manufacturer representations. Each placed instance keeps its own Story, Layer, location, rotation, and editable size.</p>
            </div>
            <footer><button type="button" onClick={() => setNewObject(null)}>Cancel</button><button type="button" className="story-save" disabled={!newObject.name.trim()} onClick={() => { if (onCreateObjectType(newObject)) { setNewObject(null); setCategory("object"); setQuery(""); } }}>Create Object Type</button></footer>
          </section>
        </div> : null}
        <div className="product-library-body">
          <div className="product-library-toolbar"><label><span>Search products</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, category, manufacturer, model, or revision" /></label><div className="product-library-filters" role="group" aria-label="Product category">{(["all", "door", "window", "object"] as const).map((value) => <button type="button" key={value} className={category === value ? "is-active" : ""} onClick={() => setCategory(value)}>{value === "all" ? "All Products" : value === "door" ? "Doors" : value === "window" ? "Windows" : "Objects"}</button>)}</div></div>
          {assetImportError && !assetImport ? <p className="product-library-error">{assetImportError}</p> : null}
          {entries.length ? <div className="product-library-grid">{entries.map((entry) => {
            const openingType = entry.target.kind === "opening" ? building.openingTypes.find((type) => type.id === entry.target.typeId) : null;
            const referencedCount = entry.representations.filter((representation) => representation.source === "manufacturer-reference").length;
            const storedSvg = entry.assets.find((asset) => asset.format === "svg" && asset.sourceUrl.startsWith("/api/product-assets/"));
            return <article className={entry.isActive ? "product-library-card is-active" : "product-library-card"} key={entry.id}>
              <header><span className="product-library-icon">▣</span><div><small>{entry.category === "object" ? titleCase(entry.objectCategory ?? "object") : titleCase(entry.category)}</small><strong>{entry.name}</strong></div>{entry.isActive ? <b>ACTIVE</b> : null}</header>
              <dl><div><dt>Manufacturer</dt><dd>{entry.manufacturer}</dd></div><div><dt>Product</dt><dd>{entry.productLine} · {entry.modelNumber}</dd></div>{openingType ? <><div><dt>Unit size</dt><dd>{formatArchitectural(openingType.unitWidth)} × {formatArchitectural(openingType.unitHeight)}</dd></div><div><dt>Rough opening</dt><dd>{formatArchitectural(openingType.roughWidth)} × {formatArchitectural(openingType.roughHeight)}</dd></div></> : <><div><dt>Footprint</dt><dd>{formatArchitectural(entry.dimensions.length)} × {formatArchitectural(entry.dimensions.width)}</dd></div><div><dt>Height</dt><dd>{formatArchitectural(entry.dimensions.height)}</dd></div></>}<div><dt>Revision</dt><dd>{entry.revision}</dd></div></dl>
              {storedSvg ? <div className="product-library-asset-preview">
                {/* eslint-disable-next-line @next/next/no-img-element -- Private uploaded SVGs use the guarded asset endpoint. */}
                <img src={storedSvg.sourceUrl} alt={`${entry.name} ${storedSvg.name}`} />
              </div> : null}
              <section className="product-library-representations"><strong>Representations</strong><div>{entry.representations.map((representation) => {
                const asset = representation.source === "manufacturer-reference" ? entry.assets.find((candidate) => candidate.id === representation.id) : null;
                const stored = Boolean(asset?.sourceUrl.startsWith("/api/product-assets/"));
                const contents = <>{representation.label}<small>{asset?.usage === "preferred" ? `PREFERRED ${representation.format.toUpperCase()}` : stored ? `STORED ${representation.format.toUpperCase()}` : representation.format.toUpperCase()}</small></>;
                return asset ? <button type="button" key={representation.id} className="is-reference" onClick={() => editAsset(entry.target, asset)} title="Edit alignment and representation use">{contents}</button> : <span key={representation.id} title="Generated from the editable native Type">{contents}</span>;
              })}</div>{referencedCount ? <p>{referencedCount} manufacturer representation{referencedCount === 1 ? "" : "s"} recorded. Stored assets are private; external references remain manifests only.</p> : <p>Native plan, elevation, and 3D geometry are generated from editable components.</p>}</section>
              <footer><button type="button" onClick={() => requestAssetImport(entry.target)}>Add SVG / GLB</button>{entry.target.kind === "opening" ? <button type="button" disabled={entry.isActive} onClick={() => onActivate(entry.target)}>{entry.isActive ? "Active for New" : "Use for New"}</button> : null}<button type="button" className="story-save" disabled={entry.target.kind === "opening" && !selectedWallName} title={entry.target.kind === "object" ? "Place on the current Story and Layer" : selectedWallName ? `Place in ${selectedWallName}` : "Select a Wall before placing a product"} onClick={() => onPlace(entry.target)}>{entry.target.kind === "object" ? "Place on Current Layer" : "Place in Selected Wall"}</button></footer>
            </article>;
          })}</div> : <div className="product-library-empty"><strong>No matching products</strong><span>Change the search or category filter, or create a reusable ordinary object.</span></div>}
        </div>
        <footer className="story-manager-footer"><span>{entries.length} shown · {building.openingTypes.length + building.productObjectTypes.length} project products · objects place on the current Layer</span><div><button type="button" onClick={onCancel}>Close</button><button type="button" onClick={() => setNewObject({ category: "furniture", dimensions: { height: 30, length: 24, width: 24 }, name: "" })}>New Object Type</button><button type="button" className="story-save" onClick={onManageOpeningTypes}>Manage Door &amp; Window Types</button></div></footer>
        {assetImport ? <div className="product-asset-import-backdrop" role="presentation"><section className="product-asset-import" role="dialog" aria-modal="true" aria-labelledby="product-asset-import-title"><header><div><strong id="product-asset-import-title">Add Product Representation</strong><span>{assetTargetName} · {assetImport.file.name}</span></div><button type="button" onClick={() => { setAssetImport(null); setAssetImportError(""); }} aria-label="Close representation import">×</button></header><div className="product-asset-import-body"><dl><div><dt>Format</dt><dd>{assetImport.format.toUpperCase()}</dd></div><div><dt>File size</dt><dd>{(assetImport.file.size / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB</dd></div></dl><label><span>Representation name</span><input value={assetImport.name} maxLength={100} onChange={(event) => setAssetImport((current) => current ? { ...current, name: event.target.value } : current)} /></label><label><span>Purpose</span><select value={assetImport.role} onChange={(event) => setAssetImport((current) => current ? { ...current, role: event.target.value as ProductAssetReference["role"] } : current)}><option value="plan-symbol">Plan symbol</option><option value="elevation-symbol">Elevation symbol</option><option value="model-3d">3D model</option><option value="thumbnail">Thumbnail</option></select></label><p>SVG files are checked for executable and externally loaded content. GLB files must use the version-2 binary format. Accepted bytes are stored privately; the project saves only the asset manifest and checksum.</p>{assetImportError ? <p className="product-asset-import-error">{assetImportError}</p> : null}</div><footer><button type="button" disabled={assetUploading} onClick={() => { setAssetImport(null); setAssetImportError(""); }}>Cancel</button><button type="button" className="story-save" disabled={assetUploading || !assetImport.name.trim()} onClick={uploadAsset}>{assetUploading ? "Storing…" : "Validate & Store"}</button></footer></section></div> : null}
        {assetEdit ? <div className="product-asset-import-backdrop" role="presentation"><section className="product-asset-import product-asset-alignment" role="dialog" aria-modal="true" aria-labelledby="product-asset-alignment-title"><header><div><strong id="product-asset-alignment-title">Representation Alignment</strong><span>{assetEditTargetName} · native Type remains the fallback</span></div><button type="button" onClick={() => { setAssetEdit(null); setAssetEditError(""); }} aria-label="Close representation alignment">×</button></header><div className="product-asset-import-body product-asset-alignment-body"><label><span>Representation name</span><input value={assetEdit.asset.name} maxLength={100} onChange={(event) => updateEditedAsset({ name: event.target.value })} /></label><label><span>Purpose</span><select value={assetEdit.asset.role} onChange={(event) => updateEditedAsset({ role: event.target.value as ProductAssetReference["role"] })}><option value="plan-symbol">Plan symbol</option><option value="elevation-symbol">Elevation symbol</option><option value="model-3d">3D model</option><option value="thumbnail">Thumbnail</option></select></label><label><span>Use</span><select value={assetEdit.asset.usage} onChange={(event) => updateEditedAsset({ usage: event.target.value as ProductAssetReference["usage"] })}><option value="reference">Reference only</option><option value="preferred">Preferred for this purpose</option></select></label><label><span>Source units</span><select value={assetEdit.asset.alignment.sourceUnits} onChange={(event) => updateEditedAlignment({ sourceUnits: event.target.value as ProductAssetReference["alignment"]["sourceUnits"] })}>{PRODUCT_ASSET_SOURCE_UNITS.map((unit) => <option key={unit} value={unit}>{unit === "fit-to-unit" ? "Fit to native unit" : titleCase(unit)}</option>)}</select></label><label><span>Insertion point</span><select value={assetEdit.asset.alignment.origin} onChange={(event) => updateEditedAlignment({ origin: event.target.value as ProductAssetReference["alignment"]["origin"] })}>{PRODUCT_ASSET_ORIGINS.map((origin) => <option key={origin} value={origin}>{titleCase(origin)}</option>)}</select></label><label><span>Scale multiplier</span><input type="number" min="0.0001" max="10000" step="0.01" value={assetEdit.asset.alignment.scaleMultiplier} onChange={(event) => updateEditedAlignment({ scaleMultiplier: Number(event.target.value) })} /></label><label><span>Rotate X (degrees)</span><input type="number" min="-360" max="360" step="1" value={assetEdit.asset.alignment.rotationX} onChange={(event) => updateEditedAlignment({ rotationX: Number(event.target.value) })} /></label><label><span>Rotate Y (degrees)</span><input type="number" min="-360" max="360" step="1" value={assetEdit.asset.alignment.rotationY} onChange={(event) => updateEditedAlignment({ rotationY: Number(event.target.value) })} /></label><label><span>Rotate Z (degrees)</span><input type="number" min="-360" max="360" step="1" value={assetEdit.asset.alignment.rotationZ} onChange={(event) => updateEditedAlignment({ rotationZ: Number(event.target.value) })} /></label><ArchitecturalDimensionInput signed allowZero key={`${assetEdit.asset.id}:ox:${assetEdit.asset.alignment.offsetX}`} label="Offset X" value={assetEdit.asset.alignment.offsetX} onChange={(offsetX) => updateEditedAlignment({ offsetX })} /><ArchitecturalDimensionInput signed allowZero key={`${assetEdit.asset.id}:oy:${assetEdit.asset.alignment.offsetY}`} label="Offset Y" value={assetEdit.asset.alignment.offsetY} onChange={(offsetY) => updateEditedAlignment({ offsetY })} /><ArchitecturalDimensionInput signed allowZero key={`${assetEdit.asset.id}:oz:${assetEdit.asset.alignment.offsetZ}`} label="Offset Z" value={assetEdit.asset.alignment.offsetZ} onChange={(offsetZ) => updateEditedAlignment({ offsetZ })} /><p>“Preferred” uses a validated file stored with this project when its view is supported. External catalog references remain reference-only in model space. For hosted Doors and Windows, the native Type still controls wall cuts and framing. Ordinary objects retain their native editable box as the fallback.</p>{assetEditError ? <p className="product-asset-import-error">{assetEditError}</p> : null}</div><footer><button type="button" onClick={() => { setAssetEdit(null); setAssetEditError(""); }}>Cancel</button><button type="button" className="story-save" disabled={!assetEdit.asset.name.trim()} onClick={saveEditedAsset}>Save Alignment</button></footer></section></div> : null}
      </section>
    </div>
  );
}
