/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import {
  MAXIMUM_PRODUCT_ASSET_BYTES,
  PRODUCT_ASSET_CONTENT_TYPES,
  productAssetRoleIsSupported,
  safeProductAssetFileName,
  validateProductAssetBytes,
} from "../lib/product-assets";
import { createDefaultProductAssetAlignment } from "../lib/building-stories";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
  PRODUCT_ASSETS: R2Bucket;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const PRODUCT_ASSET_PATH = "/api/product-assets/";
const PRODUCT_ASSET_ID_PATTERN = /^asset-[a-f0-9-]{36}$/;

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function decodedHeader(request: Request, name: string): string {
  const value = request.headers.get(name) ?? "";
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

function productAssetIdFromPath(pathname: string): string | null {
  const id = pathname.startsWith(PRODUCT_ASSET_PATH) ? pathname.slice(PRODUCT_ASSET_PATH.length) : "";
  return PRODUCT_ASSET_ID_PATTERN.test(id) ? id : null;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

async function handleProductAssetRequest(request: Request, env: Env): Promise<Response> {
  if (!env.PRODUCT_ASSETS) return jsonResponse({ error: "Product asset storage is not available." }, 503);
  const url = new URL(request.url);
  if (request.method === "POST" && url.pathname === "/api/product-assets") {
    const fileName = safeProductAssetFileName(decodedHeader(request, "X-Product-Asset-File-Name"));
    const name = decodedHeader(request, "X-Product-Asset-Name").trim().slice(0, 100);
    const role = request.headers.get("X-Product-Asset-Role");
    const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
    if (!name) return jsonResponse({ error: "Give the product representation a name." }, 400);
    if (!productAssetRoleIsSupported(role)) return jsonResponse({ error: "Choose a valid plan, elevation, 3D model, or thumbnail role." }, 400);
    if (declaredLength > MAXIMUM_PRODUCT_ASSET_BYTES) return jsonResponse({ error: "Product assets are limited to 25 MB each." }, 413);
    const bytes = new Uint8Array(await request.arrayBuffer());
    const validation = validateProductAssetBytes(fileName, bytes);
    if (!validation.ok) return jsonResponse({ error: validation.error }, 400);
    const id = `asset-${crypto.randomUUID()}`;
    const checksumSha256 = await sha256Hex(bytes);
    await env.PRODUCT_ASSETS.put(`product-assets/${id}`, bytes, {
      customMetadata: { checksumSha256, fileName, format: validation.format, name, role },
      httpMetadata: { contentType: PRODUCT_ASSET_CONTENT_TYPES[validation.format] },
    });
    return jsonResponse({
      asset: {
        alignment: createDefaultProductAssetAlignment(validation.format),
        byteLength: bytes.byteLength,
        checksumSha256,
        fileName,
        format: validation.format,
        id,
        name,
        role,
        sourceUrl: `${PRODUCT_ASSET_PATH}${id}`,
        usage: "reference",
      },
    }, 201);
  }
  const id = productAssetIdFromPath(url.pathname);
  if (!id) return jsonResponse({ error: "Product asset not found." }, 404);
  if (request.method === "DELETE") {
    await env.PRODUCT_ASSETS.delete(`product-assets/${id}`);
    return new Response(null, { status: 204 });
  }
  if (request.method !== "GET" && request.method !== "HEAD") return jsonResponse({ error: "Method not allowed." }, 405);
  const object = await env.PRODUCT_ASSETS.get(`product-assets/${id}`);
  if (!object) return jsonResponse({ error: "Product asset not found." }, 404);
  const fileName = safeProductAssetFileName(object.customMetadata?.fileName ?? "product-asset");
  const headers = new Headers({
    "Cache-Control": "private, max-age=3600",
    "Content-Disposition": `inline; filename="${fileName.replaceAll('"', "_")}"`,
    "Content-Length": String(object.size),
    "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:",
    "X-Content-Type-Options": "nosniff",
  });
  object.writeHttpMetadata(headers);
  return new Response(request.method === "HEAD" ? null : object.body, { headers });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/product-assets" || url.pathname.startsWith(PRODUCT_ASSET_PATH)) {
      try {
        return await handleProductAssetRequest(request, env);
      } catch {
        return jsonResponse({ error: "The product asset request could not be completed." }, 500);
      }
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
