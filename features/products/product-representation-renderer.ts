import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  assemblyTotalThickness,
  productAssetSourceUnitScale,
  wallReferenceDistanceFromExterior,
  type LayeredAssembly,
  type ProductAssetReference,
  type WallOpeningType,
} from "@/lib/building-stories";
import { wallOpeningRoughBottom, type LineObject, type WallVerticalExtent } from "@/lib/document-model";
import {
  preferredProductAssetForView,
  productRepresentationViewForTarget,
  type ProductRepresentationTarget,
  type ProductRepresentationView,
} from "@/lib/product-representations";

type ProductRepresentationRequest = {
  host: THREE.Group;
  interactiveMeshes: THREE.Mesh[];
  line: LineObject;
  nativeComponentMeshes: ReadonlyMap<string, THREE.Mesh[]>;
  openingTypesById: ReadonlyMap<string, WallOpeningType>;
  target: ProductRepresentationTarget;
  vertical: WallVerticalExtent;
  wallType: LayeredAssembly;
};

type SvgAsset = {
  aspectRatio: number;
  texture: THREE.Texture;
};

const gltfLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
const glbCache = new Map<string, Promise<THREE.Group>>();
const svgCache = new Map<string, Promise<SvgAsset>>();

function cachedGlb(url: string) {
  let pending = glbCache.get(url);
  if (!pending) {
    pending = gltfLoader.loadAsync(url).then((result) => result.scene);
    glbCache.set(url, pending);
    pending.catch(() => glbCache.delete(url));
  }
  return pending;
}

function cachedSvg(url: string) {
  let pending = svgCache.get(url);
  if (!pending) {
    pending = textureLoader.loadAsync(url).then((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
      const image = texture.image as HTMLImageElement | undefined;
      const width = image?.naturalWidth || image?.width || 1;
      const height = image?.naturalHeight || image?.height || 1;
      return { aspectRatio: Math.max(width / Math.max(height, 1), 1 / 1000), texture };
    });
    svgCache.set(url, pending);
    pending.catch(() => svgCache.delete(url));
  }
  return pending;
}

function openingPlacement(
  line: LineObject,
  wallType: LayeredAssembly,
  opening: LineObject["wallOpenings"][number],
  openingType: WallOpeningType,
  vertical: WallVerticalExtent,
  origin: ProductAssetReference["alignment"]["origin"],
) {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const length = Math.hypot(dx, dy);
  const direction = { x: dx / length, y: dy / length };
  const referenceDistance = wallReferenceDistanceFromExterior(wallType, line.wallReferenceLine ?? "wall-center");
  const inwardDistance = assemblyTotalThickness(wallType) / 2 - referenceDistance;
  const wallCenterOffset = (line.wallExteriorSide ?? "left") === "left" ? -inwardDistance : inwardDistance;
  const centerDistance = opening.centerOffset + openingType.unitOffsetX;
  const unitBottom = vertical.baseElevation + wallOpeningRoughBottom(opening) + openingType.unitOffsetZ;
  return {
    angle: Math.atan2(direction.y, direction.x),
    interiorScale: (line.wallExteriorSide ?? "left") === "left" ? -1 : 1,
    position: new THREE.Vector3(
      line.start.x + direction.x * centerDistance - direction.y * wallCenterOffset,
      line.start.y + direction.y * centerDistance + direction.x * wallCenterOffset,
      origin === "bounds-center" ? unitBottom + opening.unitHeight / 2 : unitBottom,
    ),
    unitBottom,
  };
}

function originFromBounds(bounds: THREE.Box3, origin: ProductAssetReference["alignment"]["origin"]) {
  if (origin === "source-origin") return new THREE.Vector3();
  const center = bounds.getCenter(new THREE.Vector3());
  if (origin === "bottom-center") center.z = bounds.min.z;
  return center;
}

function applyAuthoredAlignment(group: THREE.Group, asset: ProductAssetReference) {
  group.position.set(asset.alignment.offsetX, asset.alignment.offsetY, asset.alignment.offsetZ);
  group.rotation.set(
    THREE.MathUtils.degToRad(asset.alignment.rotationX),
    THREE.MathUtils.degToRad(asset.alignment.rotationY),
    THREE.MathUtils.degToRad(asset.alignment.rotationZ),
  );
}

async function createGlbRepresentation(
  asset: ProductAssetReference,
  openingWidth: number,
  openingHeight: number,
  wallDepth: number,
) {
  const source = cloneSkeleton(await cachedGlb(asset.sourceUrl));
  const sourceCoordinateSystem = new THREE.Group();
  sourceCoordinateSystem.add(source);
  // glTF is Y-up. Model Builder is Z-up, with local X across the unit and local Y through the host Wall.
  sourceCoordinateSystem.rotation.x = Math.PI / 2;
  sourceCoordinateSystem.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(sourceCoordinateSystem);
  if (bounds.isEmpty()) throw new Error("The product model has no renderable bounds.");
  const origin = originFromBounds(bounds, asset.alignment.origin);
  sourceCoordinateSystem.position.sub(origin);

  const normalized = new THREE.Group();
  normalized.add(sourceCoordinateSystem);
  const sourceScale = productAssetSourceUnitScale(asset.alignment.sourceUnits);
  if (sourceScale === null) {
    const size = bounds.getSize(new THREE.Vector3());
    normalized.scale.set(
      openingWidth / Math.max(size.x, 1 / 1000),
      wallDepth / Math.max(size.y, 1 / 1000),
      openingHeight / Math.max(size.z, 1 / 1000),
    ).multiplyScalar(asset.alignment.scaleMultiplier);
  } else {
    normalized.scale.setScalar(sourceScale * asset.alignment.scaleMultiplier);
  }

  const aligned = new THREE.Group();
  aligned.add(normalized);
  applyAuthoredAlignment(aligned, asset);
  return aligned;
}

async function createSvgRepresentation(
  asset: ProductAssetReference,
  view: Exclude<ProductRepresentationView, "model-3d">,
  openingWidth: number,
  openingHeight: number,
) {
  const loaded = await cachedSvg(asset.sourceUrl);
  const sourceScale = productAssetSourceUnitScale(asset.alignment.sourceUnits);
  let width = openingWidth;
  let height = view === "elevation" ? openingHeight : openingWidth / loaded.aspectRatio;
  if (sourceScale !== null) {
    const image = loaded.texture.image as HTMLImageElement | undefined;
    width = (image?.naturalWidth || image?.width || 1) * sourceScale;
    height = (image?.naturalHeight || image?.height || 1) * sourceScale;
  }
  width *= asset.alignment.scaleMultiplier;
  height *= asset.alignment.scaleMultiplier;

  const geometry = new THREE.PlaneGeometry(Math.max(width, 1 / 16), Math.max(height, 1 / 16));
  const material = new THREE.MeshBasicMaterial({
    alphaTest: 0.01,
    depthWrite: false,
    map: loaded.texture,
    side: THREE.DoubleSide,
    toneMapped: false,
    transparent: true,
  });
  const plane = new THREE.Mesh(geometry, material);
  plane.userData.productRepresentationOwnedGeometry = true;
  if (view === "elevation") plane.rotation.x = Math.PI / 2;
  if (asset.alignment.origin === "bottom-center") {
    if (view === "elevation") plane.position.z = height / 2;
    else plane.position.y = height / 2;
  } else if (asset.alignment.origin === "source-origin") {
    plane.position.x = width / 2;
    if (view === "elevation") plane.position.z = -height / 2;
    else plane.position.y = -height / 2;
  }

  const aligned = new THREE.Group();
  aligned.add(plane);
  applyAuthoredAlignment(aligned, asset);
  return aligned;
}

function markRepresentation(root: THREE.Group, lineId: string, openingId: string, assetId: string, interactiveMeshes: THREE.Mesh[]) {
  root.userData.productRepresentationRoot = true;
  root.userData.productAssetId = assetId;
  root.userData.wallOpeningId = openingId;
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.userData.lineId = lineId;
    child.userData.productAssetId = assetId;
    child.userData.wallOpeningId = openingId;
    interactiveMeshes.push(child);
  });
}

export function clearPreferredProductRepresentations(host: THREE.Group, interactiveMeshes: THREE.Mesh[]) {
  host.userData.productRepresentationRevision = Number(host.userData.productRepresentationRevision ?? 0) + 1;
  [...host.children].forEach((child) => {
    if (!child.userData.productRepresentationRoot) return;
    host.remove(child);
    disposeOwnedRepresentationGeometry(child);
  });
  interactiveMeshes.splice(0, interactiveMeshes.length);
}

export function applyPreferredProductRepresentations(request: ProductRepresentationRequest) {
  const { host, interactiveMeshes, line, nativeComponentMeshes, openingTypesById, target, vertical, wallType } = request;
  const revision = Number(host.userData.productRepresentationRevision ?? 0);
  const view = productRepresentationViewForTarget(target);
  const wallDepth = assemblyTotalThickness(wallType);
  line.wallOpenings.forEach((opening) => {
    const openingType = opening.wallOpeningTypeId ? openingTypesById.get(opening.wallOpeningTypeId) : null;
    if (!openingType || openingType.kind !== opening.kind) return;
    const asset = preferredProductAssetForView(openingType, target);
    if (!asset) return;
    const pending = view === "model-3d"
      ? createGlbRepresentation(asset, opening.unitWidth, opening.unitHeight, wallDepth)
      : createSvgRepresentation(asset, view, opening.unitWidth, opening.unitHeight);
    pending.then((aligned) => {
      if (Number(host.userData.productRepresentationRevision ?? 0) !== revision) {
        disposeOwnedRepresentationGeometry(aligned);
        return;
      }
      const placement = openingPlacement(line, wallType, opening, openingType, vertical, asset.alignment.origin);
      const root = new THREE.Group();
      root.position.copy(placement.position);
      root.rotation.z = placement.angle;
      root.scale.y = placement.interiorScale;
      if (view === "plan") root.position.z = placement.unitBottom + 1 / 8;
      root.add(aligned);
      markRepresentation(root, line.id, opening.id, asset.id, interactiveMeshes);
      nativeComponentMeshes.get(opening.id)?.forEach((mesh) => { mesh.visible = false; });
      host.add(root);
    }).catch(() => {
      // The native parametric components remain visible when a stored asset is unavailable or invalid.
    });
  });
}

function disposeOwnedRepresentationGeometry(root: THREE.Object3D) {
  root.traverse((descendant) => {
    if (!(descendant instanceof THREE.Mesh) || !descendant.userData.productRepresentationOwnedGeometry) return;
    descendant.geometry.dispose();
    const materials = Array.isArray(descendant.material) ? descendant.material : [descendant.material];
    materials.forEach((material) => material.dispose());
  });
}
