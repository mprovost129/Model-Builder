import { PRODUCT_ASSET_ROLES, type ProductAssetFormat, type ProductAssetRole } from "./building-stories.ts";

export const MAXIMUM_PRODUCT_ASSET_BYTES = 25_000_000;
export const PRODUCT_ASSET_CONTENT_TYPES: Record<Extract<ProductAssetFormat, "glb" | "svg">, string> = {
  glb: "model/gltf-binary",
  svg: "image/svg+xml",
};

export type ProductAssetValidationResult =
  | { ok: true; format: "glb" | "svg" }
  | { ok: false; error: string };

export function productAssetRoleIsSupported(value: string | null): value is ProductAssetRole {
  return value !== null && PRODUCT_ASSET_ROLES.includes(value as ProductAssetRole);
}

export function productAssetFormatFromFileName(fileName: string): "glb" | "svg" | null {
  const normalized = fileName.trim().toLocaleLowerCase();
  if (normalized.endsWith(".svg")) return "svg";
  if (normalized.endsWith(".glb")) return "glb";
  return null;
}

export function safeProductAssetFileName(fileName: string): string {
  const leaf = fileName.replaceAll("\\", "/").split("/").pop()?.trim() ?? "";
  const safe = leaf.replace(/[^A-Za-z0-9._ -]/g, "_").replace(/\s+/g, " ").slice(0, 180);
  return safe || "product-asset";
}

export function validateSvgProductAsset(content: string): string | null {
  const trimmed = content.replace(/^\uFEFF/, "").trim();
  if (!/^<svg(?:\s|>)/i.test(trimmed) && !/^<\?xml[\s\S]*?<svg(?:\s|>)/i.test(trimmed)) return "The file does not contain an SVG root element.";
  const unsafeRules: Array<[RegExp, string]> = [
    [/<\s*(?:script|foreignObject|iframe|object|embed|audio|video)\b/i, "Embedded executable or document content is not allowed in product SVG files."],
    [/<!DOCTYPE|<!ENTITY/i, "DOCTYPE and entity declarations are not allowed in product SVG files."],
    [/\son[a-z]+\s*=/i, "Event-handler attributes are not allowed in product SVG files."],
    [/(?:href|xlink:href)\s*=\s*["']\s*(?:https?:|\/\/|data:|javascript:)/i, "External, data, and script links are not allowed in product SVG files."],
    [/url\(\s*["']?\s*(?:https?:|\/\/|data:|javascript:)/i, "External style resources are not allowed in product SVG files."],
  ];
  return unsafeRules.find(([pattern]) => pattern.test(trimmed))?.[1] ?? null;
}

export function validateGlbProductAsset(bytes: Uint8Array): string | null {
  if (bytes.byteLength < 12) return "The GLB file is incomplete.";
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67) return "The file does not contain the GLB binary signature.";
  if (view.getUint32(4, true) !== 2) return "Only GLB version 2 product models are supported.";
  if (view.getUint32(8, true) !== bytes.byteLength) return "The GLB header length does not match the uploaded file.";
  return null;
}

export function validateProductAssetBytes(fileName: string, bytes: Uint8Array): ProductAssetValidationResult {
  if (!bytes.byteLength) return { ok: false, error: "The selected product asset is empty." };
  if (bytes.byteLength > MAXIMUM_PRODUCT_ASSET_BYTES) return { ok: false, error: "Product assets are limited to 25 MB each." };
  const format = productAssetFormatFromFileName(fileName);
  if (!format) return { ok: false, error: "Choose an SVG drawing or GLB 3D model." };
  const error = format === "svg" ? validateSvgProductAsset(new TextDecoder().decode(bytes)) : validateGlbProductAsset(bytes);
  return error ? { ok: false, error } : { ok: true, format };
}
