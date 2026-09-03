"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import {
  PRODUCT_ASSET_ORIGINS,
  PRODUCT_ASSET_SOURCE_UNITS,
  type BuildingStructure,
  type ProductAssetReference,
  type WallOpeningKind,
} from "@/lib/building-stories";
import {
  formatArchitectural,
  formatSignedArchitectural,
  parseArchitectural,
  parseSignedArchitectural,
  snapToSixteenth,
} from "@/lib/architectural-units";
import { MAXIMUM_PRODUCT_ASSET_BYTES, productAssetFormatFromFileName } from "@/lib/product-assets";
import { createProjectProductLibrary, filterProjectProductLibrary } from "@/lib/product-library";

export type ProductLibraryDialogProps = {
  building: BuildingStructure;
  selectedWallName: string | null;
  onActivate: (typeId: string) => void;
  onAssetAttached: (typeId: string, asset: ProductAssetReference) => boolean;
  onAssetUpdated: (typeId: string, asset: ProductAssetReference) => boolean;
  onCancel: () => void;
  onManageTypes: () => void;
  onPlace: (typeId: string) => void;
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
  onManageTypes,
  onPlace,
}: ProductLibraryDialogProps) {
  const [category, setCategory] = useState<"all" | WallOpeningKind>("all");
  const [query, setQuery] = useState("");
  const [assetTargetId, setAssetTargetId] = useState<string | null>(null);
  const [assetImport, setAssetImport] = useState<{ file: File; format: "glb" | "svg"; name: string; role: ProductAssetReference["role"] } | null>(null);
  const [assetImportError, setAssetImportError] = useState("");
  const [assetUploading, setAssetUploading] = useState(false);
  const [assetEdit, setAssetEdit] = useState<{ asset: ProductAssetReference; typeId: string } | null>(null);
  const [assetEditError, setAssetEditError] = useState("");
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
      } else onCancel();
    };
    window.addEventListener("keydown", closeWithEscape, true);
    return () => window.removeEventListener("keydown", closeWithEscape, true);
  }, [assetEdit, assetImport, onCancel]);

  const requestAssetImport = (typeId: string) => {
    setAssetTargetId(typeId);
    setAssetImportError("");
    assetInputRef.current?.click();
  };
  const selectAssetFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !assetTargetId) return;
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
    if (!assetImport || !assetTargetId || assetUploading) return;
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
      if (!onAssetAttached(assetTargetId, result.asset)) {
        await fetch(result.asset.sourceUrl, { method: "DELETE" });
        throw new Error("The uploaded representation did not produce a valid product Type.");
      }
      setAssetImport(null);
      setAssetTargetId(null);
    } catch (error) {
      setAssetImportError(error instanceof Error ? error.message : "The product asset could not be stored.");
    } finally {
      setAssetUploading(false);
    }
  };
  const editAsset = (typeId: string, asset: ProductAssetReference) => {
    setAssetEdit({ asset: { ...asset, alignment: { ...asset.alignment } }, typeId });
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
    if (!onAssetUpdated(assetEdit.typeId, assetEdit.asset)) {
      setAssetEditError("Check the scale, rotation, offsets, purpose, and representation name.");
      return;
    }
    setAssetEdit(null);
    setAssetEditError("");
  };
  const entries = filterProjectProductLibrary(createProjectProductLibrary(building), query, category);

  return (
    <div className="story-manager-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="story-manager product-library-manager" role="dialog" aria-modal="true" aria-labelledby="product-library-title">
        <input ref={assetInputRef} className="product-library-file-input" type="file" accept=".svg,.glb,image/svg+xml,model/gltf-binary" onChange={selectAssetFile} />
        <header className="story-manager-header"><div><strong id="product-library-title">Project Product Library</strong><span>Search reusable Doors and Windows, set active defaults, or place a product in the selected Wall.</span></div><button type="button" onClick={onCancel} aria-label="Close Product Library">×</button></header>
        <div className="product-library-body">
          <div className="product-library-toolbar"><label><span>Search products</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, manufacturer, model, or revision" /></label><div className="product-library-filters" role="group" aria-label="Product category">{(["all", "door", "window"] as const).map((value) => <button type="button" key={value} className={category === value ? "is-active" : ""} onClick={() => setCategory(value)}>{value === "all" ? "All Products" : value === "door" ? "Doors" : "Windows"}</button>)}</div></div>
          {assetImportError && !assetImport ? <p className="product-library-error">{assetImportError}</p> : null}
          {entries.length ? <div className="product-library-grid">{entries.map((entry) => {
            const openingType = building.openingTypes.find((type) => type.id === entry.openingTypeId)!;
            const referencedCount = entry.representations.filter((representation) => representation.source === "manufacturer-reference").length;
            const storedSvg = openingType.productAssets.find((asset) => asset.format === "svg" && asset.sourceUrl.startsWith("/api/product-assets/"));
            return <article className={entry.isActive ? "product-library-card is-active" : "product-library-card"} key={entry.id}>
              <header><span className="product-library-icon">▣</span><div><small>{entry.category === "door" ? "Door" : "Window"}</small><strong>{entry.name}</strong></div>{entry.isActive ? <b>ACTIVE</b> : null}</header>
              <dl><div><dt>Manufacturer</dt><dd>{entry.manufacturer}</dd></div><div><dt>Product</dt><dd>{entry.productLine} · {entry.modelNumber}</dd></div><div><dt>Unit size</dt><dd>{formatArchitectural(openingType.unitWidth)} × {formatArchitectural(openingType.unitHeight)}</dd></div><div><dt>Rough opening</dt><dd>{formatArchitectural(openingType.roughWidth)} × {formatArchitectural(openingType.roughHeight)}</dd></div><div><dt>Revision</dt><dd>{entry.revision}</dd></div></dl>
              {storedSvg ? <div className="product-library-asset-preview">
                {/* eslint-disable-next-line @next/next/no-img-element -- Private uploaded SVGs use the guarded asset endpoint. */}
                <img src={storedSvg.sourceUrl} alt={`${entry.name} ${storedSvg.name}`} />
              </div> : null}
              <section className="product-library-representations"><strong>Representations</strong><div>{entry.representations.map((representation) => {
                const asset = representation.source === "manufacturer-reference" ? openingType.productAssets.find((candidate) => candidate.id === representation.id) : null;
                const stored = Boolean(asset?.sourceUrl.startsWith("/api/product-assets/"));
                const contents = <>{representation.label}<small>{asset?.usage === "preferred" ? `PREFERRED ${representation.format.toUpperCase()}` : stored ? `STORED ${representation.format.toUpperCase()}` : representation.format.toUpperCase()}</small></>;
                return asset ? <button type="button" key={representation.id} className="is-reference" onClick={() => editAsset(entry.openingTypeId, asset)} title="Edit alignment and representation use">{contents}</button> : <span key={representation.id} title="Generated from the editable native Type">{contents}</span>;
              })}</div>{referencedCount ? <p>{referencedCount} manufacturer representation{referencedCount === 1 ? "" : "s"} recorded. Stored assets are private; external references remain manifests only.</p> : <p>Native plan, elevation, and 3D geometry are generated from editable components.</p>}</section>
              <footer><button type="button" onClick={() => requestAssetImport(entry.openingTypeId)}>Add SVG / GLB</button><button type="button" disabled={entry.isActive} onClick={() => onActivate(entry.openingTypeId)}>{entry.isActive ? "Active for New" : "Use for New"}</button><button type="button" className="story-save" disabled={!selectedWallName} title={selectedWallName ? `Place in ${selectedWallName}` : "Select a Wall before placing a product"} onClick={() => onPlace(entry.openingTypeId)}>Place in Selected Wall</button></footer>
            </article>;
          })}</div> : <div className="product-library-empty"><strong>No matching products</strong><span>Change the search or category filter. New products are imported through Door &amp; Window Types.</span></div>}
        </div>
        <footer className="story-manager-footer"><span>{entries.length} shown · {building.openingTypes.length} project products · {selectedWallName ? `Placement target: ${selectedWallName}` : "Select a Wall to enable placement"}</span><div><button type="button" onClick={onCancel}>Close</button><button type="button" className="story-save" onClick={onManageTypes}>Manage Types &amp; Import</button></div></footer>
        {assetImport ? <div className="product-asset-import-backdrop" role="presentation"><section className="product-asset-import" role="dialog" aria-modal="true" aria-labelledby="product-asset-import-title"><header><div><strong id="product-asset-import-title">Add Product Representation</strong><span>{building.openingTypes.find((type) => type.id === assetTargetId)?.name} · {assetImport.file.name}</span></div><button type="button" onClick={() => { setAssetImport(null); setAssetImportError(""); }} aria-label="Close representation import">×</button></header><div className="product-asset-import-body"><dl><div><dt>Format</dt><dd>{assetImport.format.toUpperCase()}</dd></div><div><dt>File size</dt><dd>{(assetImport.file.size / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB</dd></div></dl><label><span>Representation name</span><input value={assetImport.name} maxLength={100} onChange={(event) => setAssetImport((current) => current ? { ...current, name: event.target.value } : current)} /></label><label><span>Purpose</span><select value={assetImport.role} onChange={(event) => setAssetImport((current) => current ? { ...current, role: event.target.value as ProductAssetReference["role"] } : current)}><option value="plan-symbol">Plan symbol</option><option value="elevation-symbol">Elevation symbol</option><option value="model-3d">3D model</option><option value="thumbnail">Thumbnail</option></select></label><p>SVG files are checked for executable and externally loaded content. GLB files must use the version-2 binary format. Accepted bytes are stored privately; the project saves only the asset manifest and checksum.</p>{assetImportError ? <p className="product-asset-import-error">{assetImportError}</p> : null}</div><footer><button type="button" disabled={assetUploading} onClick={() => { setAssetImport(null); setAssetImportError(""); }}>Cancel</button><button type="button" className="story-save" disabled={assetUploading || !assetImport.name.trim()} onClick={uploadAsset}>{assetUploading ? "Storing…" : "Validate & Store"}</button></footer></section></div> : null}
        {assetEdit ? <div className="product-asset-import-backdrop" role="presentation"><section className="product-asset-import product-asset-alignment" role="dialog" aria-modal="true" aria-labelledby="product-asset-alignment-title"><header><div><strong id="product-asset-alignment-title">Representation Alignment</strong><span>{building.openingTypes.find((type) => type.id === assetEdit.typeId)?.name} · native Type remains the fallback</span></div><button type="button" onClick={() => { setAssetEdit(null); setAssetEditError(""); }} aria-label="Close representation alignment">×</button></header><div className="product-asset-import-body product-asset-alignment-body"><label><span>Representation name</span><input value={assetEdit.asset.name} maxLength={100} onChange={(event) => updateEditedAsset({ name: event.target.value })} /></label><label><span>Purpose</span><select value={assetEdit.asset.role} onChange={(event) => updateEditedAsset({ role: event.target.value as ProductAssetReference["role"] })}><option value="plan-symbol">Plan symbol</option><option value="elevation-symbol">Elevation symbol</option><option value="model-3d">3D model</option><option value="thumbnail">Thumbnail</option></select></label><label><span>Use</span><select value={assetEdit.asset.usage} onChange={(event) => updateEditedAsset({ usage: event.target.value as ProductAssetReference["usage"] })}><option value="reference">Reference only</option><option value="preferred">Preferred for this purpose</option></select></label><label><span>Source units</span><select value={assetEdit.asset.alignment.sourceUnits} onChange={(event) => updateEditedAlignment({ sourceUnits: event.target.value as ProductAssetReference["alignment"]["sourceUnits"] })}>{PRODUCT_ASSET_SOURCE_UNITS.map((unit) => <option key={unit} value={unit}>{unit === "fit-to-unit" ? "Fit to native unit" : titleCase(unit)}</option>)}</select></label><label><span>Insertion point</span><select value={assetEdit.asset.alignment.origin} onChange={(event) => updateEditedAlignment({ origin: event.target.value as ProductAssetReference["alignment"]["origin"] })}>{PRODUCT_ASSET_ORIGINS.map((origin) => <option key={origin} value={origin}>{titleCase(origin)}</option>)}</select></label><label><span>Scale multiplier</span><input type="number" min="0.0001" max="10000" step="0.01" value={assetEdit.asset.alignment.scaleMultiplier} onChange={(event) => updateEditedAlignment({ scaleMultiplier: Number(event.target.value) })} /></label><label><span>Rotate X (degrees)</span><input type="number" min="-360" max="360" step="1" value={assetEdit.asset.alignment.rotationX} onChange={(event) => updateEditedAlignment({ rotationX: Number(event.target.value) })} /></label><label><span>Rotate Y (degrees)</span><input type="number" min="-360" max="360" step="1" value={assetEdit.asset.alignment.rotationY} onChange={(event) => updateEditedAlignment({ rotationY: Number(event.target.value) })} /></label><label><span>Rotate Z (degrees)</span><input type="number" min="-360" max="360" step="1" value={assetEdit.asset.alignment.rotationZ} onChange={(event) => updateEditedAlignment({ rotationZ: Number(event.target.value) })} /></label><ArchitecturalDimensionInput signed allowZero key={`${assetEdit.asset.id}:ox:${assetEdit.asset.alignment.offsetX}`} label="Offset X" value={assetEdit.asset.alignment.offsetX} onChange={(offsetX) => updateEditedAlignment({ offsetX })} /><ArchitecturalDimensionInput signed allowZero key={`${assetEdit.asset.id}:oy:${assetEdit.asset.alignment.offsetY}`} label="Offset Y" value={assetEdit.asset.alignment.offsetY} onChange={(offsetY) => updateEditedAlignment({ offsetY })} /><ArchitecturalDimensionInput signed allowZero key={`${assetEdit.asset.id}:oz:${assetEdit.asset.alignment.offsetZ}`} label="Offset Z" value={assetEdit.asset.alignment.offsetZ} onChange={(offsetZ) => updateEditedAlignment({ offsetZ })} /><p>“Preferred” uses a validated file stored with this project when its view is supported. External catalog references remain reference-only in model space. The editable native Door or Window still controls unit size, rough opening, wall cut, headers, framing, schedules, and fallback display.</p>{assetEditError ? <p className="product-asset-import-error">{assetEditError}</p> : null}</div><footer><button type="button" onClick={() => { setAssetEdit(null); setAssetEditError(""); }}>Cancel</button><button type="button" className="story-save" disabled={!assetEdit.asset.name.trim()} onClick={saveEditedAsset}>Save Alignment</button></footer></section></div> : null}
      </section>
    </div>
  );
}
