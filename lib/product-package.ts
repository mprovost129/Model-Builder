import {
  PRODUCT_SOURCE_FORMATS,
  cloneWallOpeningType,
  manufacturerProductSourceIsValid,
  wallOpeningTypeIsValid,
  type ManufacturerProductSource,
  type ProductSourceFormat,
  type WallOpeningType,
} from "./building-stories.ts";

export const PRODUCT_PACKAGE_FORMAT = "model-builder-product";
export const PRODUCT_PACKAGE_VERSION = 1;
export const PRODUCT_PACKAGE_EXTENSION = ".mbproduct";
export const MAXIMUM_PRODUCT_PACKAGE_BYTES = 2_000_000;

export type ModelBuilderProductPackage = {
  format: typeof PRODUCT_PACKAGE_FORMAT;
  openingType: WallOpeningType;
  product: ManufacturerProductSource;
  version: typeof PRODUCT_PACKAGE_VERSION;
};

export type ProductPackageParseResult =
  | { ok: true; openingType: WallOpeningType; product: ManufacturerProductSource }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readProductSource(value: unknown): ManufacturerProductSource | null {
  if (!isRecord(value) ||
    typeof value.manufacturer !== "string" || typeof value.modelNumber !== "string" ||
    typeof value.productLine !== "string" || typeof value.revision !== "string" ||
    typeof value.sourceFileName !== "string" || typeof value.sourceFormat !== "string" ||
    typeof value.sourceUrl !== "string" || typeof value.verifiedAt !== "string" ||
    !PRODUCT_SOURCE_FORMATS.includes(value.sourceFormat as ProductSourceFormat)) return null;
  const source: ManufacturerProductSource = {
    manufacturer: value.manufacturer.trim(),
    modelNumber: value.modelNumber.trim(),
    productLine: value.productLine.trim(),
    revision: value.revision.trim(),
    sourceFileName: value.sourceFileName.trim(),
    sourceFormat: value.sourceFormat as ProductSourceFormat,
    sourceUrl: value.sourceUrl.trim(),
    verifiedAt: value.verifiedAt,
  };
  return manufacturerProductSourceIsValid(source) ? source : null;
}

function openingTypeIsValidSafely(value: WallOpeningType): boolean {
  try {
    return wallOpeningTypeIsValid(value);
  } catch {
    return false;
  }
}

export function parseProductPackage(content: string): ProductPackageParseResult {
  if (new TextEncoder().encode(content).byteLength > MAXIMUM_PRODUCT_PACKAGE_BYTES) {
    return { ok: false, error: "This product package is larger than the supported 2 MB native-package limit." };
  }
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    return { ok: false, error: "This file does not contain valid Model Builder product data." };
  }
  if (!isRecord(value) || value.format !== PRODUCT_PACKAGE_FORMAT) {
    return { ok: false, error: "This is not a Model Builder Product Package." };
  }
  if (value.version !== PRODUCT_PACKAGE_VERSION) {
    return { ok: false, error: typeof value.version === "number" && value.version > PRODUCT_PACKAGE_VERSION
      ? "This product package was created by a newer version of Model Builder."
      : "This product package version is not supported." };
  }
  const product = readProductSource(value.product);
  if (!product) return { ok: false, error: "The manufacturer identity or source record is missing or invalid." };
  if (!isRecord(value.openingType) || !Array.isArray(value.openingType.components)) {
    return { ok: false, error: "The Door or Window Type definition is missing." };
  }
  const candidate = {
    ...value.openingType,
    headerTypeId: null,
    id: "imported-product",
    productSource: product,
  } as WallOpeningType;
  if (!openingTypeIsValidSafely(candidate)) {
    return { ok: false, error: "The imported dimensions or assembly components are invalid." };
  }
  return { ok: true, openingType: cloneWallOpeningType(candidate), product: { ...product } };
}

export function serializeProductPackage(openingType: WallOpeningType, product: ManufacturerProductSource): string {
  if (!manufacturerProductSourceIsValid(product)) throw new Error("Cannot serialize an invalid product source.");
  const normalized = { ...cloneWallOpeningType(openingType), headerTypeId: null, productSource: null };
  if (!openingTypeIsValidSafely(normalized)) throw new Error("Cannot serialize an invalid Door or Window Type.");
  const productPackage: ModelBuilderProductPackage = {
    format: PRODUCT_PACKAGE_FORMAT,
    openingType: normalized,
    product: { ...product },
    version: PRODUCT_PACKAGE_VERSION,
  };
  return `${JSON.stringify(productPackage, null, 2)}\n`;
}
