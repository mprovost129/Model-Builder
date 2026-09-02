import assert from "node:assert/strict";
import test from "node:test";
import {
  productAssetFormatFromFileName,
  safeProductAssetFileName,
  validateGlbProductAsset,
  validateProductAssetBytes,
  validateSvgProductAsset,
} from "../lib/product-assets.ts";

test("accepts inert SVG product drawings and rejects active or externally loaded content", () => {
  assert.equal(validateSvgProductAsset('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h10v10z"/></svg>'), null);
  assert.match(validateSvgProductAsset('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>') ?? "", /executable/i);
  assert.match(validateSvgProductAsset('<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.test/image.png"/></svg>') ?? "", /external/i);
  assert.match(validateSvgProductAsset('<svg xmlns="http://www.w3.org/2000/svg"><path onclick="alert(1)"/></svg>') ?? "", /event-handler/i);
});

test("validates GLB version and declared byte length", () => {
  const bytes = new Uint8Array(12);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.byteLength, true);
  assert.equal(validateGlbProductAsset(bytes), null);
  view.setUint32(4, 1, true);
  assert.match(validateGlbProductAsset(bytes) ?? "", /version 2/i);
});

test("detects supported files, normalizes names, and rejects disguised content", () => {
  assert.equal(productAssetFormatFromFileName("window-plan.SVG"), "svg");
  assert.equal(productAssetFormatFromFileName("window.glb"), "glb");
  assert.equal(productAssetFormatFromFileName("window.dwg"), null);
  assert.equal(safeProductAssetFileName("../Window:Plan?.svg"), "Window_Plan_.svg");
  const result = validateProductAssetBytes("window.glb", new TextEncoder().encode("not a glb"));
  assert.equal(result.ok, false);
});
