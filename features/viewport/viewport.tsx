"use client";

/**
 * The 3D/2D viewport: scene setup, entity views, grips, gizmos, snapping,
 * pointer handling and the drawing and modify tools' pointer behaviour.
 *
 * Extracted whole from app/model-builder-app.tsx. Splitting it out is what lets
 * both this module and the app shell be linted: neither function is pathological
 * on its own, but analysing both in one file exhausted the type-aware linter.
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { deepEqual } from "@/lib/deep-equal";
import { wallViewInputs } from "@/lib/wall-view-inputs";
import {
  type InterfaceTheme,
} from "@/features/interface-theme";
import {
  applyPreferredProductRepresentations,
  clearPreferredProductRepresentations,
} from "@/features/products/product-representation-renderer";
import {
  ROOM_TYPES,
  resolveReferenceStoryId,
} from "@/features/project-presentation";
import {
  type BreakMode,
} from "@/features/tools/tool-types";
import {
  type ArcContinueSeed,
  type ArcViewportCommand,
  CAD_SNAP_LABELS,
  type CircleViewportCommand,
  type DragStatus,
  type LineViewportCommand,
  type PolylineSegmentMode,
  type PolylineViewportCommand,
  type RectangleDraftSettings,
  type RectangleViewportCommand,
  arcCursorAnchor,
  arcMethodDefinition,
  arcPointStage,
  circleMethodDefinition,
  circlePointStage,
  planarDistance,
} from "@/features/viewport/viewport-types";
import {
  formatArchitectural,
  formatSignedArchitectural,
  parseArchitectural,
  parseSignedArchitectural,
  snapToSixteenth,
} from "@/lib/architectural-units";
import {
  BOX_GRIP_DEFINITIONS,
  type BoxGripDefinition,
  type BoxGripKind,
  boxGripPosition,
  faceIndexForBoxGrip,
  resizeBoxFromGrip,
} from "@/lib/box-grips";
import {
  type AxisKey,
  FACE_DEFINITIONS,
  type RotationBaseKey,
  boxLocalAxis,
  boxWorldBounds,
  boxWorldPoint,
  moveBoxFace,
  snapRotationAngle,
} from "@/lib/box-model";
import {
  type AssemblyLayerRole,
  type BuildingStructure,
  type FoundationWallType,
  type LayeredAssembly,
  type OpeningAssemblyComponent,
  type WallFramingSettings,
  type WallHeaderType,
  type WallOpeningType,
  assemblyTotalThickness,
  calculateStoryElevations,
} from "@/lib/building-stories";
import {
  type ArcGeometry,
  type ArcGrip,
  type ArcMethod,
  arcFromCenterStartAngle,
  arcFromCenterStartEnd,
  arcFromCenterStartLength,
  arcFromStartCenterAngle,
  arcFromStartCenterEnd,
  arcFromStartCenterLength,
  arcFromStartEndAngle,
  arcFromStartEndDirection,
  arcFromStartEndDirectionAngle,
  arcFromStartEndRadius,
  arcFromThreePoints,
  arcGripPoints,
  arcLength,
  arcPointAtFraction,
  arcSweepAngle,
} from "@/lib/cad-arc";
import {
  type CircleGeometry,
  type CircleGrip,
  type CircleMethod,
  type CircleTangentConstraint,
  circleFromCenterDiameter,
  circleFromCenterPoint,
  circleFromCenterRadius,
  circleFromDiameterPoints,
  circleFromThreePoints,
  circleFromThreeTangencies,
  circleFromTwoTangenciesRadius,
  circleGripPoints,
} from "@/lib/cad-circle";
import {
  type LengthenEndpoint,
  type LengthenMethod,
  type LengthenRequest,
  closestLengthenEndpoint,
} from "@/lib/cad-lengthen";
import {
  type LineFixedEndpoint,
  type LineGeometry,
  type LinePoint,
  type PlanPoint,
  lineAngle,
  lineFromDirection,
  lineLength,
  lineMidpoint,
  snapLinePoint,
} from "@/lib/cad-line";
import {
  type CadSnapCandidate,
  type CadSnapKind,
  type CircularSnapGeometry,
  type ObjectSnapMode,
  acquireCadPoint,
  circularQuadrantPoints,
  derivedSnapCandidates,
  nearestPointOnCircularCurve,
  nearestPointOnSegment,
  trackingCandidatesFromAcquiredPoints,
} from "@/lib/cad-point-acquisition";
import {
  type PolylineGeometry,
  type RectangleConstructionOptions,
  type RectangleGrip,
  polylineArea,
  polylineBulgeFromThreePoints,
  polylineCentroid,
  polylineLength,
  polylinePathPoints,
  polylineSegmentCircularGeometry,
  polylineSegmentPoints,
  polylineSegments,
  rectangleFromArea,
  rectangleFromCorners,
  rectangleFromDimensions,
  rectangleGripPoints,
  rectangleSupportsConstrainedGrips,
} from "@/lib/cad-polyline";
import {
  type CadEntityRef,
  type ScreenPoint,
  type ScreenSelectionGeometry,
  type ScreenStretchGeometry,
  type SelectionCycleState,
  type SelectionWindowMode,
  advanceSelectionCycle,
  cadEntityKey,
  cadEntityRefFromKey,
  selectScreenGeometries,
  selectScreenStretchTargets,
} from "@/lib/cad-selection";
import {
  type CadStretchTarget,
} from "@/lib/cad-stretch";
import {
  type ArcObject,
  type BoxObject,
  type CircleObject,
  type CurveFilletPick,
  type FoundationWallVerticalExtent,
  type LineObject,
  type ModelDocument,
  type PlatformOpening,
  type PolylineObject,
  RoomAnnotationObject,
  type RoomHorizontalPlatformSolution,
  type WallVerticalExtent,
  arcIsEditable,
  breakModelEntity,
  chamferLineObjects,
  circleIsEditable,
  cloneDocument,
  copyBoxObjects,
  copyModelEntities,
  createBoundaryPolylineObject,
  discoverDocumentBoundary,
  effectiveRoomSettings,
  extendModelEntity,
  filletCurveObjects,
  findArcObject,
  findBoxObject,
  findCircleObject,
  findLayer,
  findLineObject,
  findPolylineObject,
  foundationWallVerticalExtent,
  lengthenModelEntity,
  lineIsEditable,
  mirrorModelEntities,
  modelEntityIsEditable,
  modelEntityLengthenEndpoints,
  modelSelectionBounds,
  modelSelectionRotationBase,
  modelSelectionScaleBase,
  moveBoxObject,
  moveBoxObjects,
  moveModelEntities,
  objectIsEditable,
  offsetModelEntity,
  polylineIsEditable,
  roofPlaneGeometry,
  roofPlaneLayerTakeoffGeometry,
  roofPlaneReferenceDimensions,
  roofPlaneSurfaceElevation,
  roofPlaneTakeoffGeometry,
  roomHorizontalPlatformSolution,
  rotateModelEntities,
  scaleModelEntities,
  snapObjectMoveDistance,
  stretchModelEntities,
  trimModelEntity,
  updateArcGrip,
  updateBoxObject,
  updateCircleGrip,
  updateLineGrip,
  updatePolylineObjectGrip,
  updatePolylineObjectVertex,
  wallVerticalExtent,
} from "@/lib/document-model";
import {
  type AutomaticFoundationWallJoinPlan,
  buildAutomaticFoundationWallJoinPlan,
  foundationBandFootprint,
} from "@/lib/foundation-wall-joins";
import {
  architecturalMaterialByName,
} from "@/lib/material-library";
import {
  roofFramingLayout,
} from "@/lib/roof-framing";
import {
  VIEW_PRESETS,
  type ViewDirection,
  type ViewTarget,
  navigationTargetFromDirection,
} from "@/lib/view-navigation";
import {
  nearestParallelWallClearDimensions,
} from "@/lib/wall-clear-dimensions";
import {
  wallFramingSolids,
} from "@/lib/wall-framing";
import {
  type AutomaticWallJoinPlan,
  buildAutomaticWallJoinPlan,
  wallEndCapFootprints,
  wallLayerSolidSegments,
  wallOpeningComponentSolids,
  wallOpeningReturnSolids,
} from "@/lib/wall-joins";

type StoryDisplayRole = "active" | "reference" | "hidden";

function activeReferenceStoryId(document: ModelDocument) {
  const view = document.savedPlanViews.find((candidate) => candidate.id === document.activeSavedPlanViewId);
  return view ? resolveReferenceStoryId(view, document.building.stories.map((story) => story.id)) : null;
}

function storyDisplayRole(document: ModelDocument, viewTarget: ViewTarget, storyId: string): StoryDisplayRole {
  if (viewTarget.id !== "top") return "active";
  if (storyId === document.building.activeStoryId) return "active";
  return storyId === activeReferenceStoryId(document) ? "reference" : "hidden";
}

function displayLayerForStory(document: ModelDocument, viewTarget: ViewTarget, storyId: string, layerId: string | null | undefined) {
  const base = findLayer(document, layerId ?? null);
  if (!base || storyDisplayRole(document, viewTarget, storyId) !== "reference") return base;
  const savedView = document.savedPlanViews.find((candidate) => candidate.id === document.activeSavedPlanViewId);
  const referenceSet = document.layerSets.find((set) => set.id === savedView?.referenceLayerSetId);
  const state = referenceSet?.layers.find((candidate) => candidate.id === base.id);
  return state ? { ...base, ...state } : base;
}

function resolvedStoryFill(document: ModelDocument, viewTarget: ViewTarget, storyId: string, layerId: string | null | undefined, object?: FillStyledObject | null) {
  if (storyDisplayRole(document, viewTarget, storyId) !== "reference") return resolvedObjectFill(document, layerId, object);
  const savedView = document.savedPlanViews.find((candidate) => candidate.id === document.activeSavedPlanViewId);
  const layer = displayLayerForStory(document, viewTarget, storyId, layerId);
  const referenceSet = document.layerSets.find((set) => set.id === savedView?.referenceLayerSetId);
  const override = object?.fillOverride ?? null;
  return {
    color: override?.color ?? layer?.fillColor ?? layer?.color ?? "#7f95aa",
    visible: Boolean(savedView?.referenceFillsVisible && (referenceSet?.fillsVisible ?? true) && (override?.visible ?? layer?.fillVisible ?? true)),
  };
}

function rectangleConstructionOptions(settings: RectangleDraftSettings): RectangleConstructionOptions {
  return {
    chamferX: settings.chamferX,
    chamferY: settings.chamferY,
    filletRadius: settings.filletRadius,
    rotation: settings.rotation,
    width: settings.width,
  };
}

function rectangleFromDraftSettings(start: LinePoint, cursor: LinePoint | null, settings: RectangleDraftSettings): PolylineGeometry | null {
  const options = rectangleConstructionOptions(settings);
  if (settings.method === "dimensions") {
    return rectangleFromDimensions(start, cursor, settings.widthDimension, settings.height, start.z, options);
  }
  if (settings.method === "area") {
    return rectangleFromArea(start, cursor, settings.area, settings.fixedDimension, settings.areaBasis, start.z, options);
  }
  return cursor ? rectangleFromCorners(start, cursor, start.z, options) : null;
}

function rectangleDraftDimensions(start: LinePoint, cursor: LinePoint, settings: RectangleDraftSettings) {
  if (settings.method === "dimensions") return { height: settings.height, width: settings.widthDimension };
  if (settings.method === "area") {
    const other = snapToSixteenth(settings.area / settings.fixedDimension);
    return settings.areaBasis === "length" ? { height: other, width: settings.fixedDimension } : { height: settings.fixedDimension, width: other };
  }
  const angle = (settings.rotation ?? 0) * Math.PI / 180;
  const dx = cursor.x - start.x;
  const dy = cursor.y - start.y;
  return {
    height: Math.abs(dx * -Math.sin(angle) + dy * Math.cos(angle)),
    width: Math.abs(dx * Math.cos(angle) + dy * Math.sin(angle)),
  };
}

type PickedCircleTangentConstraint = { constraint: CircleTangentConstraint; key: string };

type LineCommandFeedback = { message: string; tone: "error" | "info" | "success" };

function circleGeometryFromPointer(method: CircleMethod, points: LinePoint[], cursor: LinePoint): CircleGeometry | null {
  const first = points[0];
  if (!first) return null;
  if (method === "center-radius") return circleFromCenterPoint(first, cursor);
  if (method === "center-diameter") return circleFromCenterDiameter(first, planarDistance(first, cursor));
  if (method === "two-point") return circleFromDiameterPoints(first, cursor);
  return method === "three-point" && points[1] ? circleFromThreePoints(first, points[1], cursor) : null;
}

function circlePointCompletes(method: CircleMethod, pointCount: number): boolean {
  return method === "three-point" ? pointCount >= 2 : pointCount >= 1;
}

function includedAngleFromCursor(center: LinePoint, start: LinePoint, cursor: LinePoint): number {
  const startAngle = Math.atan2(start.y - center.y, start.x - center.x) * 180 / Math.PI;
  const cursorAngle = Math.atan2(cursor.y - center.y, cursor.x - center.x) * 180 / Math.PI;
  return ((cursorAngle - startAngle) % 360 + 360) % 360;
}

function arcGeometryFromMethodPointer(method: ArcMethod, points: LinePoint[], cursor: LinePoint, seed: ArcContinueSeed | null): ArcGeometry | null {
  if (method === "continue") return seed ? arcFromStartEndDirection(seed.start, cursor, seed.direction) : null;
  if (points.length < 2) return null;
  const [first, second] = points;
  if (method === "three-point") return arcFromThreePoints(first, second, cursor);
  if (method === "start-center-end") return arcFromStartCenterEnd(first, second, cursor);
  if (method === "center-start-end") return arcFromCenterStartEnd(first, second, cursor);
  if (method === "start-center-angle") return arcFromStartCenterAngle(first, second, includedAngleFromCursor(second, first, cursor));
  if (method === "center-start-angle") return arcFromCenterStartAngle(first, second, includedAngleFromCursor(first, second, cursor));
  if (method === "start-center-length") return arcFromStartCenterLength(first, second, planarDistance(first, cursor));
  if (method === "center-start-length") return arcFromCenterStartLength(first, second, planarDistance(second, cursor));
  if (method === "start-end-angle") return arcFromThreePoints(first, cursor, second);
  if (method === "start-end-direction") return arcFromStartEndDirection(first, second, cursor);
  return arcFromStartEndRadius(first, second, planarDistance(first, cursor));
}

function arcGeometryFromMethodScalar(method: ArcMethod, points: LinePoint[], scalar: "angle" | "direction-angle" | "length" | "radius", value: number): ArcGeometry | null {
  if (points.length < 2) return null;
  const [first, second] = points;
  if (method === "start-center-angle" && scalar === "angle") return arcFromStartCenterAngle(first, second, value);
  if (method === "center-start-angle" && scalar === "angle") return arcFromCenterStartAngle(first, second, value);
  if (method === "start-center-length" && scalar === "length") return arcFromStartCenterLength(first, second, value);
  if (method === "center-start-length" && scalar === "length") return arcFromCenterStartLength(first, second, value);
  if (method === "start-end-angle" && scalar === "angle") return arcFromStartEndAngle(first, second, value);
  if (method === "start-end-direction" && scalar === "direction-angle") return arcFromStartEndDirectionAngle(first, second, value);
  if (method === "start-end-radius" && scalar === "radius") return arcFromStartEndRadius(first, second, value);
  return null;
}

type CubeOrbitController = {
  end: () => void;
  move: (deltaX: number, deltaY: number) => void;
  start: () => void;
};

function NavigationCube({
  onNavigate,
  orbitRef,
  orientationRef,
}: {
  onNavigate: (target: ViewTarget) => void;
  orbitRef: { current: CubeOrbitController | null };
  orientationRef: { current: THREE.Quaternion };
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const size = 112;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
    camera.position.set(0, 0, 5.4);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);
    const raycaster = new THREE.Raycaster();
    raycaster.params.Line = { threshold: 3 };
    const pointer = new THREE.Vector2();
    const interactive: THREE.Mesh[] = [];
    const textures: THREE.Texture[] = [];

    const baseCube = new THREE.Mesh(
      new THREE.BoxGeometry(1.34, 1.34, 1.34),
      new THREE.MeshBasicMaterial({ color: 0x344250 }),
    );
    group.add(baseCube);

    const labelMaterial = (label: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = 192;
      canvas.height = 192;
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#3a4856";
        context.fillRect(0, 0, 192, 192);
        context.strokeStyle = "#8493a1";
        context.lineWidth = 6;
        context.strokeRect(4, 4, 184, 184);
        context.fillStyle = "#d9e1e8";
        context.font = "600 31px Arial, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(label, 96, 99);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      textures.push(texture);
      return new THREE.MeshBasicMaterial({ color: 0xffffff, map: texture, side: THREE.DoubleSide });
    };

    const addInteractive = (mesh: THREE.Mesh, direction: ViewDirection, priority: number) => {
      mesh.userData.direction = direction;
      mesh.userData.priority = priority;
      mesh.userData.baseColor = (mesh.material as THREE.MeshBasicMaterial).color.getHex();
      interactive.push(mesh);
      group.add(mesh);
    };

    const faceDefinitions: Array<{ direction: ViewDirection; label: string }> = [
      { direction: [1, 0, 0], label: "RIGHT" },
      { direction: [-1, 0, 0], label: "LEFT" },
      { direction: [0, 1, 0], label: "BACK" },
      { direction: [0, -1, 0], label: "FRONT" },
      { direction: [0, 0, 1], label: "TOP" },
      { direction: [0, 0, -1], label: "BOTTOM" },
    ];
    const faceGeometry = new THREE.PlaneGeometry(1.18, 1.18);
    faceDefinitions.forEach(({ direction, label }) => {
      const normal = new THREE.Vector3(...direction);
      const face = new THREE.Mesh(faceGeometry, labelMaterial(label));
      face.position.copy(normal).multiplyScalar(0.681);
      face.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      addInteractive(face, direction, 1);
    });

    const edgeGeometryX = new THREE.BoxGeometry(1.2, 0.17, 0.17);
    const edgeGeometryY = new THREE.BoxGeometry(0.17, 1.2, 0.17);
    const edgeGeometryZ = new THREE.BoxGeometry(0.17, 0.17, 1.2);
    const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0x607181 });
    ([-1, 1] as const).forEach((first) => {
      ([-1, 1] as const).forEach((second) => {
        const xEdge = new THREE.Mesh(edgeGeometryX, edgeMaterial.clone());
        xEdge.position.set(0, first * 0.68, second * 0.68);
        addInteractive(xEdge, [0, first, second], 2);
        const yEdge = new THREE.Mesh(edgeGeometryY, edgeMaterial.clone());
        yEdge.position.set(first * 0.68, 0, second * 0.68);
        addInteractive(yEdge, [first, 0, second], 2);
        const zEdge = new THREE.Mesh(edgeGeometryZ, edgeMaterial.clone());
        zEdge.position.set(first * 0.68, second * 0.68, 0);
        addInteractive(zEdge, [first, second, 0], 2);
      });
    });

    const cornerGeometry = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    ([-1, 1] as const).forEach((x) => {
      ([-1, 1] as const).forEach((y) => {
        ([-1, 1] as const).forEach((z) => {
          const corner = new THREE.Mesh(
            cornerGeometry,
            new THREE.MeshBasicMaterial({ color: 0x738392 }),
          );
          corner.position.set(x * 0.68, y * 0.68, z * 0.68);
          addInteractive(corner, [x, y, z], 3);
        });
      });
    });

    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.58, 1.58, 1.58)),
      new THREE.LineBasicMaterial({ color: 0x9eabb6, transparent: true, opacity: 0.72 }),
    );
    group.add(outline);

    let hovered: THREE.Mesh | null = null;
    const setHovered = (next: THREE.Mesh | null) => {
      if (hovered === next) return;
      if (hovered) {
        (hovered.material as THREE.MeshBasicMaterial).color.setHex(hovered.userData.baseColor);
      }
      hovered = next;
      if (hovered) (hovered.material as THREE.MeshBasicMaterial).color.setHex(0xe1ad43);
      renderer.domElement.style.cursor = hovered ? "pointer" : "default";
    };
    const hitTest = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      return (raycaster.intersectObjects(interactive, false)[0]?.object as THREE.Mesh | undefined) ?? null;
    };
    type CubePointerDrag = {
      lastX: number;
      lastY: number;
      orbiting: boolean;
      pointerId: number;
      startX: number;
      startY: number;
    };
    let pointerDrag: CubePointerDrag | null = null;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      pointerDrag = {
        lastX: event.clientX,
        lastY: event.clientY,
        orbiting: false,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) {
        setHovered(hitTest(event));
        return;
      }
      const totalDistance = Math.hypot(
        event.clientX - pointerDrag.startX,
        event.clientY - pointerDrag.startY,
      );
      if (!pointerDrag.orbiting && totalDistance >= 4) {
        pointerDrag.orbiting = true;
        setHovered(null);
        renderer.domElement.classList.add("is-orbiting");
        orbitRef.current?.start();
      }
      if (pointerDrag.orbiting) {
        orbitRef.current?.move(
          event.clientX - pointerDrag.lastX,
          event.clientY - pointerDrag.lastY,
        );
      }
      pointerDrag.lastX = event.clientX;
      pointerDrag.lastY = event.clientY;
    };
    const finishPointer = (event: PointerEvent, canceled = false) => {
      if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
      const completed = pointerDrag;
      pointerDrag = null;
      renderer.domElement.classList.remove("is-orbiting");
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      if (completed.orbiting) {
        orbitRef.current?.end();
        return;
      }
      if (canceled) return;
      const target = hitTest(event);
      const direction = target?.userData.direction as ViewDirection | undefined;
      if (direction) onNavigate(navigationTargetFromDirection(direction));
    };
    const handlePointerLeave = () => {
      if (!pointerDrag) setHovered(null);
    };
    const handlePointerUp = (event: PointerEvent) => finishPointer(event);
    const handlePointerCancel = (event: PointerEvent) => finishPointer(event, true);
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerleave", handlePointerLeave);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointercancel", handlePointerCancel);

    let animationFrame = 0;
    const render = () => {
      animationFrame = requestAnimationFrame(render);
      group.quaternion.copy(orientationRef.current).invert();
      renderer.render(scene, camera);
    };
    render();

    return () => {
      cancelAnimationFrame(animationFrame);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointercancel", handlePointerCancel);
      interactive.forEach((mesh) => (mesh.material as THREE.Material).dispose());
      faceGeometry.dispose();
      edgeGeometryX.dispose();
      edgeGeometryY.dispose();
      edgeGeometryZ.dispose();
      cornerGeometry.dispose();
      baseCube.geometry.dispose();
      (baseCube.material as THREE.Material).dispose();
      outline.geometry.dispose();
      (outline.material as THREE.Material).dispose();
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [onNavigate, orbitRef, orientationRef]);

  return (
    <div className="navigation-cube" aria-label="3D navigation cube">
      <div className="navigation-cube-canvas" ref={mountRef} />
      <button
        type="button"
        className="navigation-home"
        aria-label="Home — Top plan view"
        title="Home — Top plan view"
        onClick={() => onNavigate(VIEW_PRESETS.top)}
      >
        ⌂
      </button>
    </div>
  );
}

function axisVector(axis: AxisKey): THREE.Vector3 {
  if (axis === "x") return new THREE.Vector3(1, 0, 0);
  if (axis === "y") return new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3(0, 0, 1);
}

export type ViewportProps = {
  activeElevation: number;
  gridSpacing: number;
  gridVisible: boolean;
  interfaceTheme: InterfaceTheme;
  arcCommand: ArcViewportCommand | null;
  arcContinueSeed: ArcContinueSeed | null;
  arcMethod: ArcMethod;
  arcMode: boolean;
  circleCommand: CircleViewportCommand | null;
  circleMethod: CircleMethod;
  circleMode: boolean;
  copyMode: boolean;
  document: ModelDocument;
  dragStatus: DragStatus | null;
  fitViewSignal: number;
  lineCommand: LineViewportCommand | null;
  lineMode: boolean;
  lineSnapAngles: number[];
  polylineCommand: PolylineViewportCommand | null;
  polylineMode: boolean;
  polylineSegmentMode: PolylineSegmentMode;
  polylineWidth: number;
  rectangleCommand: RectangleViewportCommand | null;
  rectangleDraftSettings: RectangleDraftSettings;
  rectangleMode: boolean;
  moveMode: boolean;
  mirrorMode: boolean;
  mirrorKeepSource: boolean;
  offsetDistance: number;
  offsetKeepSource: boolean;
  offsetMode: boolean;
  chamferFirstDistance: number;
  chamferMode: boolean;
  chamferSecondDistance: number;
  breakMode: BreakMode | null;
  boundaryMode: boolean;
  filletMode: boolean;
  filletRadius: number;
  lengthenMethod: LengthenMethod;
  lengthenMode: boolean;
  lengthenValue: number;
  extendMode: boolean;
  trimMode: boolean;
  objectSnapEnabled: boolean;
  objectSnapModes: ObjectSnapMode[];
  objectSnapOverride: ObjectSnapMode | null;
  orthoEnabled: boolean;
  polarEnabled: boolean;
  rotateMode: boolean;
  rotationBaseKey: RotationBaseKey;
  scaleMode: boolean;
  scaleBaseKey: RotationBaseKey;
  stretchMode: boolean;
  stretchTargets: CadStretchTarget[];
  onDragCancel: (before: ModelDocument) => void;
  onDragCommit: (before: ModelDocument, next: ModelDocument) => void;
  onDragPreview: (next: ModelDocument) => void;
  onDragStatus: (status: DragStatus | null) => void;
  onExactFaceMove: (objectId: string, faceIndex: number, distance: number) => boolean;
  onFaceSelect: (objectId: string | null, faceIndex: number | null, additive: boolean) => void;
  onArcCreate: (geometry: ArcGeometry) => boolean;
  onArcFinishRequested: () => void;
  onArcPointsChange: (points: LinePoint[]) => void;
  onArcSelect: (arcId: string | null, additive?: boolean) => void;
  onCirclePointsChange: (points: LinePoint[]) => void;
  onCircleCreate: (geometry: CircleGeometry) => boolean;
  onCircleFinishRequested: () => void;
  onCircleSelect: (circleId: string | null, additive?: boolean) => void;
  onLineAnchorChange: (point: LinePoint | null) => void;
  onLineCommandFeedback: (feedback: LineCommandFeedback) => void;
  onLineCreate: (start: LinePoint, end: LinePoint) => boolean;
  onLineFinishRequested: () => void;
  onLineSelect: (lineId: string | null, additive?: boolean) => void;
  onLineUndoSegment: () => boolean;
  onModifyCommit: (before: ModelDocument, next: ModelDocument, copiedRefs: CadEntityRef[] | null) => void;
  onModifyFinishRequested: (canceled: boolean) => void;
  onMirrorCommit: (before: ModelDocument, next: ModelDocument, refs: CadEntityRef[], keepSource: boolean) => void;
  onMirrorFinishRequested: () => void;
  onOffsetCommit: (before: ModelDocument, next: ModelDocument, ref: CadEntityRef, keepSource: boolean) => void;
  onOffsetFinishRequested: () => void;
  onChamferCommit: (before: ModelDocument, next: ModelDocument, refs: CadEntityRef[]) => void;
  onChamferFinishRequested: (canceled: boolean) => void;
  onChamferStageChange: (stage: 0 | 1) => void;
  onBreakCommit: (before: ModelDocument, next: ModelDocument, refs: CadEntityRef[], mode: BreakMode) => void;
  onBreakFinishRequested: (canceled: boolean) => void;
  onBreakStageChange: (stage: 0 | 1 | 2) => void;
  onBoundaryCommit: (before: ModelDocument, next: ModelDocument, polylineId: string) => void;
  onBoundaryFinishRequested: (canceled: boolean) => void;
  onFilletCommit: (before: ModelDocument, next: ModelDocument, refs: CadEntityRef[]) => void;
  onFilletFinishRequested: (canceled: boolean) => void;
  onFilletStageChange: (stage: 0 | 1) => void;
  onLengthenCommit: (before: ModelDocument, next: ModelDocument, ref: CadEntityRef, endpoint: LengthenEndpoint) => void;
  onLengthenFinishRequested: (canceled: boolean) => void;
  onTrimExtendCommit: (before: ModelDocument, next: ModelDocument, refs: CadEntityRef[], operation: "extend" | "trim") => void;
  onTrimExtendFinishRequested: () => void;
  onObjectSnapOverrideConsumed: () => void;
  onPolylineCreate: (geometry: PolylineGeometry, shape: "polyline" | "rectangle") => boolean;
  onPolylineAnchorChange: (point: LinePoint | null) => void;
  onPolylineFinishRequested: () => void;
  onPolylineSelect: (polylineId: string | null, additive?: boolean) => void;
  onSelectionWindow: (refs: CadEntityRef[], additive: boolean, mode: SelectionWindowMode) => void;
  onRectangleAnchorChange: (point: LinePoint | null) => void;
  onRectangleFinishRequested: () => void;
  onRotateFinishRequested: () => void;
  onScaleFinishRequested: () => void;
  onStretchCommit: (before: ModelDocument, next: ModelDocument, targets: CadStretchTarget[]) => void;
  onStretchFinishRequested: (canceled: boolean) => void;
  onStretchTargetsChange: (targets: CadStretchTarget[], mode: SelectionWindowMode) => void;
  onRoomLabelOpen: (roomId: string) => void;
  onRoomLabelTypeChange: (roomId: string, roomType: string) => void;
  onRoomCeilingHeightChange: (roomId: string, height: number) => boolean;
  onWallClearanceChange: (selectedWallId: string, referenceWallId: string, distance: number) => boolean;
  onWallLengthChange: (lineId: string, fixedEndpoint: LineFixedEndpoint, length: number) => boolean;
  onViewChange: (view: ViewTarget) => void;
  selectedArcId: string | null;
  selectedFaceIndex: number | null;
  selectedCircleId: string | null;
  selectedLineId: string | null;
  selectedPolylineId: string | null;
  selectedObjectId: string | null;
  selectedObjectIds: string[];
  selectedEntityKeys: string[];
  snapIncrement: number;
  viewTarget: ViewTarget;
};

type ActiveGripInput = {
  axis: AxisKey;
  faceIndex: number;
  objectId: string;
  x: number;
  y: number;
};

type TemporaryWallClearDimensionScreen = {
  distance: number;
  from: ScreenPoint;
  referenceWallId: string;
  side: "left" | "right";
  to: ScreenPoint;
};

type TemporaryWallDimensionScreen = {
  clearDimensions: TemporaryWallClearDimensionScreen[];
  dimensionEnd: ScreenPoint;
  dimensionStart: ScreenPoint;
  label: ScreenPoint;
  lineId: string;
  wallEnd: ScreenPoint;
  wallStart: ScreenPoint;
};

function readableScreenDimensionAngle(from: ScreenPoint, to: ScreenPoint): number {
  let angle = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
  if (angle >= 90) angle -= 180;
  if (angle < -90) angle += 180;
  return angle;
}

function TemporaryWallDimension({
  length,
  onClearanceCommit,
  onCommit,
  screen,
}: {
  length: number;
  onClearanceCommit: (referenceWallId: string, distance: number) => boolean;
  onCommit: (fixedEndpoint: LineFixedEndpoint, length: number) => boolean;
  screen: TemporaryWallDimensionScreen;
}) {
  const [draft, setDraft] = useState(formatArchitectural(length));
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [fixedEndpoint, setFixedEndpoint] = useState<LineFixedEndpoint>("start");

  const commit = () => {
    const parsed = parseArchitectural(draft);
    if (parsed === null || parsed < 1 / 16) {
      setError("Enter a Wall length of at least 1/16 inch.");
      return;
    }
    if (!onCommit(fixedEndpoint, snapToSixteenth(parsed))) {
      setError("That length conflicts with the Wall, its openings, or a lock.");
      return;
    }
    setError("");
    setEditing(false);
  };

  const selectFixedEndpoint = (endpoint: LineFixedEndpoint) => {
    setFixedEndpoint(endpoint);
    setError("");
  };

  return (
    <div className="temporary-wall-dimension" aria-label="Selected Wall temporary dimension">
      <svg aria-hidden="true">
        <line className="temporary-wall-extension" x1={screen.wallStart.x} y1={screen.wallStart.y} x2={screen.dimensionStart.x} y2={screen.dimensionStart.y} />
        <line className="temporary-wall-extension" x1={screen.wallEnd.x} y1={screen.wallEnd.y} x2={screen.dimensionEnd.x} y2={screen.dimensionEnd.y} />
        <line className="temporary-wall-dimension-line" x1={screen.dimensionStart.x} y1={screen.dimensionStart.y} x2={screen.dimensionEnd.x} y2={screen.dimensionEnd.y} />
        {screen.clearDimensions.map((dimension) => <g key={`${dimension.side}:${dimension.referenceWallId}`}>
          <line className="temporary-wall-clear-line" x1={dimension.from.x} y1={dimension.from.y} x2={dimension.to.x} y2={dimension.to.y} />
          <circle className="temporary-wall-clear-witness" cx={dimension.from.x} cy={dimension.from.y} r="2.5" />
          <circle className="temporary-wall-clear-witness" cx={dimension.to.x} cy={dimension.to.y} r="2.5" />
        </g>)}
      </svg>
      {screen.clearDimensions.map((dimension) => <TemporaryWallClearDimensionInput
        key={`${dimension.side}:${dimension.referenceWallId}`}
        dimension={dimension}
        onCommit={(distance) => onClearanceCommit(dimension.referenceWallId, distance)}
      />)}
      <button
        type="button"
        className={fixedEndpoint === "start" ? "temporary-wall-anchor is-fixed" : "temporary-wall-anchor"}
        style={{ left: screen.dimensionStart.x, top: screen.dimensionStart.y }}
        onClick={() => selectFixedEndpoint("start")}
        aria-label="Keep Wall start fixed"
        aria-pressed={fixedEndpoint === "start"}
        title="Keep Wall start fixed"
      >S</button>
      <button
        type="button"
        className={fixedEndpoint === "end" ? "temporary-wall-anchor is-fixed" : "temporary-wall-anchor"}
        style={{ left: screen.dimensionEnd.x, top: screen.dimensionEnd.y }}
        onClick={() => selectFixedEndpoint("end")}
        aria-label="Keep Wall end fixed"
        aria-pressed={fixedEndpoint === "end"}
        title="Keep Wall end fixed"
      >E</button>
      <form
        className={error ? "temporary-wall-dimension-input has-error" : "temporary-wall-dimension-input"}
        style={{
          left: screen.label.x,
          top: screen.label.y,
          transform: `translate(-50%, -50%) rotate(${readableScreenDimensionAngle(screen.dimensionStart, screen.dimensionEnd)}deg)`,
        }}
        onSubmit={(event) => { event.preventDefault(); commit(); }}
        title={`${fixedEndpoint === "start" ? "Start" : "End"} endpoint stays fixed`}
      >
        <span>{fixedEndpoint === "start" ? "S" : "E"} FIXED</span>
        <input
          value={editing ? draft : formatArchitectural(length)}
          onChange={(event) => { setDraft(event.target.value); setError(""); }}
          onFocus={(event) => { setDraft(formatArchitectural(length)); setEditing(true); event.currentTarget.select(); }}
          onBlur={() => { setEditing(false); setError(""); }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setError("");
              setEditing(false);
              event.currentTarget.blur();
            }
          }}
          aria-label="Selected Wall length"
          spellCheck={false}
        />
        <b>↵</b>
        {error ? <small role="alert">{error}</small> : null}
      </form>
    </div>
  );
}

function TemporaryWallClearDimensionInput({
  dimension,
  onCommit,
}: {
  dimension: TemporaryWallClearDimensionScreen;
  onCommit: (distance: number) => boolean;
}) {
  const [draft, setDraft] = useState(formatArchitectural(dimension.distance));
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  const commit = () => {
    const parsed = parseArchitectural(draft);
    if (parsed === null || parsed < 1 / 16) {
      setError("Enter a distance of at least 1/16 inch.");
      return;
    }
    if (!onCommit(snapToSixteenth(parsed))) {
      setError("That distance conflicts with a connected Wall, opening, or lock.");
      return;
    }
    setError("");
    setEditing(false);
  };

  return (
    <form
      className={error ? "temporary-wall-clear-input has-error" : "temporary-wall-clear-input"}
      style={{
        left: (dimension.from.x + dimension.to.x) / 2,
        top: (dimension.from.y + dimension.to.y) / 2,
        transform: `translate(-50%, -50%) rotate(${readableScreenDimensionAngle(dimension.from, dimension.to)}deg)`,
      }}
      onSubmit={(event) => { event.preventDefault(); commit(); }}
      title="Dimensions use the exterior face of each Wall Main layer; the reference Wall stays fixed"
    >
      <span>DIM</span>
      <input
        value={editing ? draft : formatArchitectural(dimension.distance)}
        onChange={(event) => { setDraft(event.target.value); setError(""); }}
        onFocus={(event) => { setDraft(formatArchitectural(dimension.distance)); setEditing(true); event.currentTarget.select(); }}
        onBlur={() => { setEditing(false); setError(""); }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setError("");
            setEditing(false);
            event.currentTarget.blur();
          }
        }}
        aria-label="Temporary Wall-to-Wall dimension"
        spellCheck={false}
      />
      <b>↵</b>
      {error ? <small role="alert">{error}</small> : null}
    </form>
  );
}

type ViewportObject = {
  edges: THREE.LineSegments;
  materials: THREE.MeshStandardMaterial[];
  mesh: THREE.Mesh;
};

/**
 * The geometry half of a viewport line view. The update* helpers below only
 * rewrite buffers, so they accept this narrower shape. That lets transient
 * preview views be passed without inventing a material to satisfy the type.
 */

type ViewportLineGeometry = {
  fill?: THREE.Mesh;
  fillGeometry?: THREE.BufferGeometry;
  geometry: THREE.BufferGeometry;
  line: THREE.Line;
};

/** A fully owned line view, including the materials this module disposes. */

type ViewportLine = ViewportLineGeometry & {
  fillMaterial?: THREE.MeshBasicMaterial;
  material: THREE.LineDashedMaterial;
};

type FloorPlatformView = {
  edgeMaterials: THREE.LineBasicMaterial[];
  edges: THREE.LineSegments[];
  group: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
  meshes: THREE.Mesh[];
  outlineMaterials: THREE.LineBasicMaterial[];
  outlines: THREE.Line[];
};

type WallView = {
  edgeMaterials: THREE.LineBasicMaterial[];
  edges: THREE.LineSegments[];
  group: THREE.Group;
  /**
   * An opaque snapshot of everything the current geometry was built from. Only
   * ever compared with deepEqual, never read field-wise, so framed Walls and
   * Foundation Walls can each store their own shape here.
   */
  builtFrom: unknown;
  materials: THREE.MeshStandardMaterial[];
  meshes: THREE.Mesh[];
  productMeshes: THREE.Mesh[];
};

const FLOOR_LAYER_COLORS: Record<AssemblyLayerRole, number> = {
  "air-gap": 0x8fa4b2,
  finish: 0xc99762,
  framing: 0xb58a5c,
  insulation: 0xd6b76f,
  membrane: 0x506b7c,
  sheathing: 0xc3a176,
  structure: 0xa9afb2,
  substrate: 0x9b9385,
};

type FillStyledObject = { fillOverride?: { color: string; visible: boolean } | null };

function resolvedObjectFill(document: ModelDocument, layerId: string | null | undefined, object?: FillStyledObject | null) {
  const layer = findLayer(document, layerId ?? null);
  const layerSet = document.layerSets.find((set) => set.id === document.activeLayerSetId);
  const override = object?.fillOverride ?? null;
  return {
    color: override?.color ?? layer?.fillColor ?? layer?.color ?? "#7f95aa",
    visible: (layerSet?.fillsVisible ?? true) && (override?.visible ?? layer?.fillVisible ?? true),
  };
}

function setMeshOpacity(mesh: THREE.Mesh, visible: boolean, selected = false, hovered = false, reference = false) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.forEach((material) => {
    if (!(material instanceof THREE.MeshStandardMaterial) && !(material instanceof THREE.MeshBasicMaterial)) return;
    const baseOpacity = typeof material.userData.baseOpacity === "number" ? material.userData.baseOpacity : 0.92;
    material.transparent = true;
    const resolvedOpacity = reference ? Math.min(0.28, baseOpacity * 0.32) : selected || hovered ? Math.min(1, baseOpacity + 0.18) : baseOpacity;
    material.opacity = visible ? resolvedOpacity : 0;
    material.depthWrite = visible && !reference && baseOpacity >= 0.8;
  });
}

function createFloorPlatformView(scene: THREE.Scene): FloorPlatformView {
  const group = new THREE.Group();
  group.renderOrder = 5;
  scene.add(group);
  return { edgeMaterials: [], edges: [], group, materials: [], meshes: [], outlineMaterials: [], outlines: [] };
}

function clearFloorPlatformView(view: FloorPlatformView) {
  view.meshes.forEach((mesh) => {
    view.group.remove(mesh);
    mesh.geometry.dispose();
  });
  view.materials.forEach((material) => material.dispose());
  view.edges.forEach((edge) => {
    view.group.remove(edge);
    edge.geometry.dispose();
  });
  view.edgeMaterials.forEach((material) => material.dispose());
  view.outlines.forEach((outline) => {
    view.group.remove(outline);
    outline.geometry.dispose();
  });
  view.outlineMaterials.forEach((material) => material.dispose());
  view.meshes = [];
  view.materials = [];
  view.edges = [];
  view.edgeMaterials = [];
  view.outlines = [];
  view.outlineMaterials = [];
}

function platformPath(boundary: PolylineGeometry) {
  const path = polylinePathPoints(boundary);
  if (path.length < 4) return null;
  const outline = path.slice(0, -1);
  const shape = new THREE.Path();
  shape.moveTo(outline[0].x, outline[0].y);
  outline.slice(1).forEach((point) => shape.lineTo(point.x, point.y));
  shape.closePath();
  return shape;
}

function platformShape(boundary: PolylineGeometry, holes: PolylineGeometry[] = []) {
  const path = platformPath(boundary);
  if (!path) return null;
  const shape = new THREE.Shape();
  shape.curves = path.curves;
  shape.currentPoint.copy(path.currentPoint);
  holes.forEach((hole) => {
    const holePath = platformPath(hole);
    if (holePath) shape.holes.push(holePath);
  });
  return shape;
}

function addPlatformOpeningOutline(view: FloorPlatformView, boundary: PolylineGeometry, elevation: number, opening: PlatformOpening) {
  const path = polylinePathPoints(boundary);
  if (path.length < 4) return;
  const points = path[0].x === path.at(-1)?.x && path[0].y === path.at(-1)?.y ? path : [...path, path[0]];
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map((point) => new THREE.Vector3(point.x, point.y, elevation)));
  const material = new THREE.LineDashedMaterial({ color: 0xd69b3f, dashSize: 5, depthTest: false, gapSize: 3, opacity: 0.95, transparent: true });
  const outline = new THREE.Line(geometry, material);
  outline.computeLineDistances();
  outline.renderOrder = 18;
  outline.userData.platformOpeningId = opening.id;
  outline.userData.roomOpeningKind = opening.kind;
  view.group.add(outline);
  view.outlines.push(outline);
  view.outlineMaterials.push(material);
}

function addHorizontalPlatformLayer(
  view: FloorPlatformView,
  shape: THREE.Shape,
  thickness: number,
  baseZ: number,
  role: AssemblyLayerRole,
  userData: Record<string, string>,
) {
  if (thickness < 1 / 16) return;
  const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: false, depth: thickness, steps: 1 });
  const material = new THREE.MeshStandardMaterial({ color: FLOOR_LAYER_COLORS[role], metalness: 0, opacity: 0.86, roughness: 0.86, side: THREE.DoubleSide, transparent: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = baseZ;
  Object.assign(mesh.userData, userData);
  view.group.add(mesh);
  view.meshes.push(mesh);
  view.materials.push(material);
}

function rebuildPlatformEdges(view: FloorPlatformView) {
  view.edges.forEach((edge) => { view.group.remove(edge); edge.geometry.dispose(); });
  view.edgeMaterials.forEach((material) => material.dispose());
  view.edges = [];
  view.edgeMaterials = [];
  view.meshes.forEach((mesh) => {
    const material = new THREE.LineBasicMaterial({ color: 0x263746, depthTest: false, toneMapped: false, transparent: true, opacity: 0.92 });
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 20), material);
    edge.position.copy(mesh.position);
    edge.rotation.copy(mesh.rotation);
    edge.scale.copy(mesh.scale);
    edge.renderOrder = 14;
    edge.userData.sourceMesh = mesh;
    view.group.add(edge);
    view.edges.push(edge);
    view.edgeMaterials.push(material);
  });
}

function updateFloorPlatformView(view: FloorPlatformView, polyline: PolylineObject, story: BuildingStructure["stories"][number]) {
  clearFloorPlatformView(view);
  const shape = platformShape(polyline);
  if (!shape) return;
  let structureTop = polyline.elevation;
  story.floorStructure.layers.forEach((layer) => {
    const base = structureTop - layer.thickness;
    addHorizontalPlatformLayer(view, shape, layer.thickness, base, layer.role, { floorLayer: layer.name, polylineId: polyline.id });
    structureTop = base;
  });
  let finishBase = polyline.elevation;
  [...story.floorFinish.layers].reverse().forEach((layer) => {
    addHorizontalPlatformLayer(view, shape, layer.thickness, finishBase, layer.role, { floorLayer: layer.name, polylineId: polyline.id });
    finishBase += layer.thickness;
  });
  rebuildPlatformEdges(view);
}

function updateRoofPlaneView(view: FloorPlatformView, document: ModelDocument, polyline: PolylineObject, viewTarget: ViewTarget) {
  clearFloorPlatformView(view);
  const geometry = roofPlaneGeometry(polyline);
  const reference = roofPlaneReferenceDimensions(document, polyline);
  if (!geometry || !reference) return;
  const eaveZ = reference.fasciaTopElevation;
  const risePerInch = polyline.roofSettings!.pitchRise / 12;
  const triangles = THREE.ShapeUtils.triangulateShape(polyline.vertices.map((point) => new THREE.Vector2(point.x, point.y)), []);
  if (!triangles.length) return;
  const basePositions = polyline.vertices.map((point, index) => new THREE.Vector3(point.x, point.y, eaveZ + geometry.boundaryDepths[index] * risePerInch));
  const normal = new THREE.Vector3(-geometry.inwardNormal.x * risePerInch, -geometry.inwardNormal.y * risePerInch, 1).normalize();
  const framingReveal = polyline.roofSettings!.showFramingInModel;
  const addRoofLayer = (innerOffset: number, outerOffset: number, color: string | number, materialName: string, layerName: string) => {
    if (Math.abs(outerOffset - innerOffset) < 1 / 16) return;
    const vertexCount = basePositions.length;
    const positions = [innerOffset, outerOffset].flatMap((offset) => basePositions.flatMap((point) => {
      const shifted = point.clone().addScaledVector(normal, offset);
      return [shifted.x, shifted.y, shifted.z];
    }));
    const indices: number[] = [];
    triangles.forEach((triangle) => {
      indices.push(triangle[2], triangle[1], triangle[0]);
      indices.push(triangle[0] + vertexCount, triangle[1] + vertexCount, triangle[2] + vertexCount);
    });
    for (let index = 0; index < vertexCount; index += 1) {
      const next = (index + 1) % vertexCount;
      indices.push(index, next, next + vertexCount, index, next + vertexCount, index + vertexCount);
    }
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    buffer.setIndex(indices);
    buffer.computeVertexNormals();
    const definition = architecturalMaterialByName(materialName);
    const material = new THREE.MeshStandardMaterial({ color: definition?.model.color ?? color, depthWrite: !framingReveal, metalness: definition?.model.metalness ?? 0, opacity: framingReveal ? 0.18 : 0.88, roughness: definition?.model.roughness ?? 0.84, side: THREE.DoubleSide, transparent: true });
    material.userData.baseOpacity = material.opacity;
    const mesh = new THREE.Mesh(buffer, material);
    mesh.userData.polylineId = polyline.id;
    mesh.userData.roofLayer = layerName;
    mesh.userData.roofPlane = true;
    view.group.add(mesh);
    view.meshes.push(mesh);
    view.materials.push(material);
  };
  const layerTakeoffs = roofPlaneLayerTakeoffGeometry(document, polyline);
  if (layerTakeoffs?.some((layer) => layer.thickness > 0)) {
    layerTakeoffs.forEach((layer) => {
      if (framingReveal && layer.role === "framing") return;
      const nearOffset = layer.roofSide === "exterior" ? layer.outerOffset - layer.thickness : layer.outerOffset + layer.thickness;
      addRoofLayer(Math.min(nearOffset, layer.outerOffset), Math.max(nearOffset, layer.outerOffset), FLOOR_LAYER_COLORS[layer.role], layer.material, layer.name);
    });
  } else {
    addRoofLayer(-1 / 32, 1 / 32, 0xd7b99a, "", "Structural Roof Plane");
  }
  if (framingReveal) roofFramingLayout(document, polyline)?.members.forEach((member) => {
    const start = new THREE.Vector3(member.start.x, member.start.y, member.start.z);
    const end = new THREE.Vector3(member.end.x, member.end.y, member.end.z);
    const xAxis = end.clone().sub(start).normalize();
    const zAxis = member.orientation === "roof-normal" ? normal.clone() : new THREE.Vector3(0, 0, 1);
    const yAxis = zAxis.clone().cross(xAxis).normalize();
    if (xAxis.lengthSq() < 1e-8 || yAxis.lengthSq() < 1e-8) return;
    const correctedZ = xAxis.clone().cross(yAxis).normalize();
    const center = start.clone().add(end).multiplyScalar(0.5).addScaledVector(correctedZ, -member.depth / 2);
    const memberGeometry = new THREE.BoxGeometry(member.grossLength, member.width, member.depth);
    const materialName = member.material.toLocaleLowerCase();
    const color = member.kind === "ridge-board" ? 0xa86837 : member.kind === "fascia" ? 0xc58b52 : member.kind === "subfascia" ? 0xb77a45 : member.kind === "truss-top-chord" ? 0xbf8750 : 0xd1a06a;
    const memberMaterial = new THREE.MeshStandardMaterial({ color, metalness: materialName.includes("steel") ? 0.42 : 0, opacity: 1, roughness: 0.76 });
    memberMaterial.userData.baseOpacity = 1;
    const mesh = new THREE.Mesh(memberGeometry, memberMaterial);
    mesh.position.copy(center);
    mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, correctedZ));
    mesh.userData.polylineId = polyline.id;
    mesh.userData.roofFramingMember = member.kind;
    mesh.userData.roofFramingMemberId = member.id;
    mesh.userData.roofFramingMaterial = member.material;
    view.group.add(mesh);
    view.meshes.push(mesh);
    view.materials.push(memberMaterial);
  });
  rebuildPlatformEdges(view);

  const takeoff = roofPlaneTakeoffGeometry(document, polyline);
  const joinedEdgeColors: Record<string, number> = { hip: 0xb66e35, ridge: 0x397ca2, transition: 0x8261a8, valley: 0x2f8f83 };
  takeoff?.edges.filter((edge) => edge.joinedRoofPlaneId).forEach((edge) => {
    const startZ = roofPlaneSurfaceElevation(document, polyline, edge.start);
    const endZ = roofPlaneSurfaceElevation(document, polyline, edge.end);
    if (startZ === null || endZ === null) return;
    const edgeMaterial = new THREE.LineBasicMaterial({ color: joinedEdgeColors[edge.role] ?? 0x397ca2, depthTest: false, toneMapped: false });
    const joinedEdge = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(edge.start.x, edge.start.y, startZ + 1 / 8),
      new THREE.Vector3(edge.end.x, edge.end.y, endZ + 1 / 8),
    ]), edgeMaterial);
    joinedEdge.renderOrder = 20;
    joinedEdge.userData.roofEdgeRole = edge.role;
    joinedEdge.userData.joinedRoofPlaneId = edge.joinedRoofPlaneId;
    view.group.add(joinedEdge);
    view.outlines.push(joinedEdge);
    view.outlineMaterials.push(edgeMaterial);
  });

  const bearingMaterial = new THREE.LineDashedMaterial({ color: 0x3f7592, dashSize: 6, depthTest: false, gapSize: 3, opacity: 0.95, transparent: true });
  const bearingLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(geometry.bearingStart.x, geometry.bearingStart.y, reference.heelElevation + 1 / 16),
    new THREE.Vector3(geometry.bearingEnd.x, geometry.bearingEnd.y, reference.heelElevation + 1 / 16),
  ]), bearingMaterial);
  bearingLine.computeLineDistances();
  bearingLine.renderOrder = 18;
  bearingLine.visible = viewTarget.id === "top";
  view.group.add(bearingLine);
  view.outlines.push(bearingLine);
  view.outlineMaterials.push(bearingMaterial);

  const midpoint = { x: (geometry.bearingStart.x + geometry.bearingEnd.x) / 2, y: (geometry.bearingStart.y + geometry.bearingEnd.y) / 2 };
  const arrowLength = Math.min(60, geometry.horizontalRun * 0.55);
  const tip = { x: midpoint.x + geometry.inwardNormal.x * arrowLength, y: midpoint.y + geometry.inwardNormal.y * arrowLength };
  const tangent = { x: -geometry.inwardNormal.y, y: geometry.inwardNormal.x };
  const arrowZ = reference.heelElevation + 1 / 8;
  const roofArrowMaterial = new THREE.LineDashedMaterial({ color: 0x3f7592, dashSize: 1000, depthTest: false, gapSize: 0, opacity: 0.95, transparent: true });
  const roofArrow = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(midpoint.x, midpoint.y, arrowZ),
    new THREE.Vector3(tip.x, tip.y, arrowZ),
    new THREE.Vector3(tip.x - geometry.inwardNormal.x * 8 + tangent.x * 4, tip.y - geometry.inwardNormal.y * 8 + tangent.y * 4, arrowZ),
    new THREE.Vector3(tip.x, tip.y, arrowZ),
    new THREE.Vector3(tip.x - geometry.inwardNormal.x * 8 - tangent.x * 4, tip.y - geometry.inwardNormal.y * 8 - tangent.y * 4, arrowZ),
  ]), roofArrowMaterial);
  roofArrow.computeLineDistances();
  roofArrow.renderOrder = 19;
  roofArrow.visible = viewTarget.id === "top";
  view.group.add(roofArrow);
  view.outlines.push(roofArrow);
  view.outlineMaterials.push(roofArrowMaterial);
}

function updateRoomPlatformView(view: FloorPlatformView, solution: RoomHorizontalPlatformSolution) {
  clearFloorPlatformView(view);
  const floorShape = platformShape(solution.floorBoundary, solution.floorOpeningBoundaries);
  const ceilingShape = platformShape(solution.boundary, solution.ceilingOpeningBoundaries);
  if (!floorShape || !ceilingShape) return;
  const addRoomLayer = (thickness: number, baseZ: number, role: AssemblyLayerRole, layerName: string, platformKind: string) => {
    const shape = platformKind.startsWith("floor") ? floorShape : ceilingShape;
    addHorizontalPlatformLayer(view, shape, thickness, baseZ, role, {
      platformKind,
      roomId: solution.roomId,
      roomLayer: layerName,
    });
  };
  let floorStructureTop = solution.roughFloorElevation;
  solution.floorStructure.layers.forEach((layer) => {
    const base = floorStructureTop - layer.thickness;
    addRoomLayer(layer.thickness, base, layer.role, layer.name, "floor-structure");
    floorStructureTop = base;
  });
  let floorFinishBase = solution.roughFloorElevation;
  [...solution.floorFinish.layers].reverse().forEach((layer) => {
    addRoomLayer(layer.thickness, floorFinishBase, layer.role, layer.name, "floor-finish");
    floorFinishBase += layer.thickness;
  });
  let ceilingStructureTop = solution.roughCeilingElevation;
  solution.ceilingStructure.layers.forEach((layer) => {
    const base = ceilingStructureTop - layer.thickness;
    addRoomLayer(layer.thickness, base, layer.role, layer.name, "ceiling-structure");
    ceilingStructureTop = base;
  });
  let ceilingFinishTop = solution.ceilingStructureBottomElevation;
  solution.ceilingFinish.layers.forEach((layer) => {
    const base = ceilingFinishTop - layer.thickness;
    addRoomLayer(layer.thickness, base, layer.role, layer.name, "ceiling-finish");
    ceilingFinishTop = base;
  });
  solution.platformOpenings.forEach((opening) => {
    if (opening.cuts === "floor" || opening.cuts === "both") {
      addPlatformOpeningOutline(view, opening.boundary, solution.finishedFloorElevation + 1 / 16, opening);
    }
    if (opening.cuts === "ceiling" || opening.cuts === "both") {
      addPlatformOpeningOutline(view, opening.boundary, solution.finishedCeilingElevation - 1 / 16, opening);
    }
  });
  rebuildPlatformEdges(view);
}

function disposeFloorPlatformView(scene: THREE.Scene, view: FloorPlatformView) {
  clearFloorPlatformView(view);
  scene.remove(view.group);
}

function createWallView(scene: THREE.Scene): WallView {
  const group = new THREE.Group();
  group.renderOrder = 6;
  scene.add(group);
  return { builtFrom: null, edgeMaterials: [], edges: [], group, materials: [], meshes: [], productMeshes: [] };
}

function clearWallView(view: WallView) {
  clearPreferredProductRepresentations(view.group, view.productMeshes);
  view.meshes.forEach((mesh) => {
    view.group.remove(mesh);
    mesh.geometry.dispose();
  });
  view.materials.forEach((material) => material.dispose());
  view.edges.forEach((edge) => {
    view.group.remove(edge);
    edge.geometry.dispose();
  });
  view.edgeMaterials.forEach((material) => material.dispose());
  view.meshes = [];
  view.materials = [];
  view.edges = [];
  view.edgeMaterials = [];
  view.builtFrom = null;
}

function rebuildWallEdges(view: WallView, target?: ViewTarget) {
  view.edges.forEach((edge) => { view.group.remove(edge); edge.geometry.dispose(); });
  view.edgeMaterials.forEach((material) => material.dispose());
  view.edges = [];
  view.edgeMaterials = [];
  [...view.meshes, ...view.productMeshes].forEach((mesh) => {
    const material = new THREE.LineBasicMaterial({ color: 0x263746, depthTest: false, toneMapped: false, transparent: true, opacity: 0.94 });
    const baseGeometry = new THREE.EdgesGeometry(mesh.geometry, 20);
    const hiddenPlanSeams = target?.id === "top"
      ? mesh.userData.hiddenPlanSeams as [PlanPoint, PlanPoint][] | undefined
      : undefined;
    let edgeGeometry: THREE.BufferGeometry = baseGeometry;
    if (hiddenPlanSeams?.length) {
      const position = baseGeometry.getAttribute("position");
      const keptPositions: number[] = [];
      const near = (first: PlanPoint, second: PlanPoint) => Math.hypot(first.x - second.x, first.y - second.y) <= 1 / 64;
      for (let index = 0; index < position.count; index += 2) {
        const first = { x: position.getX(index), y: position.getY(index) };
        const second = { x: position.getX(index + 1), y: position.getY(index + 1) };
        const hidden = hiddenPlanSeams.some(([seamFirst, seamSecond]) =>
          (near(first, seamFirst) && near(second, seamSecond))
          || (near(first, seamSecond) && near(second, seamFirst))
        );
        if (hidden) continue;
        keptPositions.push(
          position.getX(index), position.getY(index), position.getZ(index),
          position.getX(index + 1), position.getY(index + 1), position.getZ(index + 1),
        );
      }
      baseGeometry.dispose();
      edgeGeometry = new THREE.BufferGeometry();
      edgeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(keptPositions, 3));
    }
    const edge = new THREE.LineSegments(edgeGeometry, material);
    edge.position.copy(mesh.position);
    edge.rotation.copy(mesh.rotation);
    edge.scale.copy(mesh.scale);
    edge.renderOrder = 15;
    edge.userData.sourceMesh = mesh;
    Object.assign(edge.userData, mesh.userData);
    view.group.add(edge);
    view.edges.push(edge);
    view.edgeMaterials.push(material);
  });
}

function updateWallView(
  view: WallView,
  line: LineObject,
  vertical: WallVerticalExtent,
  wallType: LayeredAssembly,
  joinPlan: AutomaticWallJoinPlan,
  linesById: ReadonlyMap<string, LineObject>,
  wallTypesById: ReadonlyMap<string, LayeredAssembly>,
  openingTypesById: ReadonlyMap<string, WallOpeningType>,
  headerTypesById: ReadonlyMap<string, WallHeaderType>,
  framing: WallFramingSettings,
  target: ViewTarget,
) {
  clearWallView(view);
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const length = Math.hypot(dx, dy);
  if (length < 1 / 16) return;
  const framingReveal = framing.enabled && framing.showInModel && target.id !== "top";
  const nativeComponentMeshes = new Map<string, THREE.Mesh[]>();
  wallType.layers.forEach((layer, index) => {
    if (layer.thickness < 1 / 16) return;
    wallLayerSolidSegments(line, wallType, index, joinPlan, linesById, wallTypesById, vertical.height).forEach((segment) => {
      const shape = new THREE.Shape();
      shape.moveTo(segment.startExterior.x, segment.startExterior.y);
      shape.lineTo(segment.startInterior.x, segment.startInterior.y);
      shape.lineTo(segment.endInterior.x, segment.endInterior.y);
      shape.lineTo(segment.endExterior.x, segment.endExterior.y);
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: false, depth: segment.height, steps: 1 });
      const material = new THREE.MeshStandardMaterial({ color: FLOOR_LAYER_COLORS[layer.role], depthWrite: !framingReveal, metalness: 0, opacity: framingReveal ? (layer.wallGroup === "main" ? 0.1 : 0.18) : 0.92, roughness: 0.84, transparent: true });
      material.userData.baseOpacity = material.opacity;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = vertical.baseElevation + segment.baseHeight;
      mesh.userData.lineId = line.id;
      mesh.userData.wallLayer = layer.name;
      mesh.userData.hiddenPlanSeams = [
        ...(segment.hidePlanStartSeam ? [[segment.startExterior, segment.startInterior] as [PlanPoint, PlanPoint]] : []),
        ...(segment.hidePlanEndSeam ? [[segment.endExterior, segment.endInterior] as [PlanPoint, PlanPoint]] : []),
      ];
      view.group.add(mesh);
      view.meshes.push(mesh);
      view.materials.push(material);
    });
  });
  wallEndCapFootprints(line, wallType, joinPlan).forEach((footprint) => {
    const layer = wallType.layers[footprint.layerIndex];
    const shape = new THREE.Shape();
    shape.moveTo(footprint.startExterior.x, footprint.startExterior.y);
    shape.lineTo(footprint.startInterior.x, footprint.startInterior.y);
    shape.lineTo(footprint.endInterior.x, footprint.endInterior.y);
    shape.lineTo(footprint.endExterior.x, footprint.endExterior.y);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: false, depth: vertical.height, steps: 1 });
    const material = new THREE.MeshStandardMaterial({ color: FLOOR_LAYER_COLORS[layer.role], depthWrite: !framingReveal, metalness: 0, opacity: framingReveal ? 0.18 : 0.92, roughness: 0.84, transparent: true });
    material.userData.baseOpacity = material.opacity;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = vertical.baseElevation;
    mesh.userData.lineId = line.id;
    mesh.userData.wallLayer = `${layer.name} end cap`;
    view.group.add(mesh);
    view.meshes.push(mesh);
    view.materials.push(material);
  });
  wallOpeningReturnSolids(line, wallType, openingTypesById).forEach((returnSolid) => {
    const layer = wallType.layers[returnSolid.layerIndex];
    const shape = new THREE.Shape();
    shape.moveTo(returnSolid.startExterior.x, returnSolid.startExterior.y);
    shape.lineTo(returnSolid.startInterior.x, returnSolid.startInterior.y);
    shape.lineTo(returnSolid.endInterior.x, returnSolid.endInterior.y);
    shape.lineTo(returnSolid.endExterior.x, returnSolid.endExterior.y);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: false, depth: returnSolid.height, steps: 1 });
    const material = new THREE.MeshStandardMaterial({ color: FLOOR_LAYER_COLORS[layer.role], depthWrite: !framingReveal, metalness: 0, opacity: framingReveal ? 0.28 : 0.96, roughness: 0.82, transparent: true });
    material.userData.baseOpacity = material.opacity;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = vertical.baseElevation + returnSolid.baseHeight;
    mesh.userData.lineId = line.id;
    mesh.userData.wallLayer = `${layer.name} ${returnSolid.side} ${returnSolid.component}`;
    mesh.userData.wallOpeningId = returnSolid.openingId;
    mesh.userData.wallOpeningReturn = returnSolid.component;
    view.group.add(mesh);
    view.meshes.push(mesh);
    view.materials.push(material);
  });
  wallOpeningComponentSolids(line, wallType, openingTypesById).forEach((componentSolid) => {
    const shape = new THREE.Shape();
    shape.moveTo(componentSolid.startExterior.x, componentSolid.startExterior.y);
    shape.lineTo(componentSolid.startInterior.x, componentSolid.startInterior.y);
    shape.lineTo(componentSolid.endInterior.x, componentSolid.endInterior.y);
    shape.lineTo(componentSolid.endExterior.x, componentSolid.endExterior.y);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: false, depth: componentSolid.height, steps: 1 });
    const roleColors: Record<OpeningAssemblyComponent["role"], number> = {
      frame: 0xd9d4c7,
      glazing: 0x8fc4d7,
      hardware: 0x59646d,
      jamb: 0xd2c8b5,
      mullion: 0xe3ded2,
      panel: 0xb99a78,
      sash: 0xe0dbcf,
      threshold: 0x8b8073,
      trim: 0xeee9dd,
    };
    const isGlass = componentSolid.role === "glazing" || componentSolid.material.toLocaleLowerCase().includes("glass");
    const material = new THREE.MeshStandardMaterial({ color: roleColors[componentSolid.role], depthWrite: !isGlass, metalness: componentSolid.material.toLocaleLowerCase().includes("steel") ? 0.45 : 0, opacity: isGlass ? 0.42 : 0.98, roughness: isGlass ? 0.22 : 0.72, transparent: true });
    material.userData.baseOpacity = material.opacity;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = vertical.baseElevation + componentSolid.baseHeight;
    mesh.userData.lineId = line.id;
    mesh.userData.wallOpeningId = componentSolid.openingId;
    mesh.userData.openingComponentId = componentSolid.componentId;
    mesh.userData.openingComponentRole = componentSolid.role;
    view.group.add(mesh);
    view.meshes.push(mesh);
    view.materials.push(material);
    const openingMeshes = nativeComponentMeshes.get(componentSolid.openingId) ?? [];
    openingMeshes.push(mesh);
    nativeComponentMeshes.set(componentSolid.openingId, openingMeshes);
  });
  if (framingReveal) wallFramingSolids(line, wallType, framing, vertical.height, joinPlan, [...linesById.values()], openingTypesById, headerTypesById).forEach((framingMember) => {
    const shape = new THREE.Shape();
    shape.moveTo(framingMember.startExterior.x, framingMember.startExterior.y);
    shape.lineTo(framingMember.startInterior.x, framingMember.startInterior.y);
    shape.lineTo(framingMember.endInterior.x, framingMember.endInterior.y);
    shape.lineTo(framingMember.endExterior.x, framingMember.endExterior.y);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: false, depth: framingMember.height, steps: 1 });
    const materialName = framingMember.material.toLocaleLowerCase();
    const framingColor = materialName.includes("steel")
      ? 0x7b8790
      : framingMember.kind === "header-filler"
        ? materialName.includes("insulation") ? 0x7fa9b9 : 0xc59b62
        : framingMember.kind === "header"
          ? 0xad7545
          : framingMember.kind === "backing-block" || framingMember.kind === "backing-stud"
            ? 0xb98751
            : framingMember.kind === "corner-stud" ? 0xc8945c : 0xd2a36c;
    const material = new THREE.MeshStandardMaterial({ color: framingColor, metalness: 0, opacity: 1, roughness: 0.78 });
    material.userData.baseOpacity = material.opacity;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = vertical.baseElevation + framingMember.baseHeight;
    mesh.userData.lineId = line.id;
    mesh.userData.wallFramingMember = framingMember.kind;
    mesh.userData.wallFramingMaterial = framingMember.material;
    if (framingMember.openingId) mesh.userData.wallOpeningId = framingMember.openingId;
    view.group.add(mesh);
    view.meshes.push(mesh);
    view.materials.push(material);
  });
  applyPreferredProductRepresentations({
    host: view.group,
    interactiveMeshes: view.productMeshes,
    line,
    nativeComponentMeshes,
    openingTypesById,
    target,
    vertical,
    wallType,
  });
  rebuildWallEdges(view, target);
}

function addFoundationSolid(
  view: WallView,
  footprint: [PlanPoint, PlanPoint, PlanPoint, PlanPoint] | null,
  height: number,
  baseElevation: number,
  color: number,
  lineId: string,
  component: string,
) {
  if (!footprint || height < 1 / 16) return;
  const shape = new THREE.Shape();
  shape.moveTo(footprint[0].x, footprint[0].y);
  footprint.slice(1).forEach((point) => shape.lineTo(point.x, point.y));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: false, depth: height, steps: 1 });
  const material = new THREE.MeshStandardMaterial({ color, metalness: 0, opacity: 0.94, roughness: 0.9, transparent: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = baseElevation;
  mesh.userData.lineId = lineId;
  mesh.userData.foundationComponent = component;
  view.group.add(mesh);
  view.meshes.push(mesh);
  view.materials.push(material);
}

function updateFoundationWallView(
  view: WallView,
  line: LineObject,
  vertical: FoundationWallVerticalExtent,
  type: FoundationWallType,
  joinPlan: AutomaticFoundationWallJoinPlan,
  linesById: ReadonlyMap<string, LineObject>,
  typesById: ReadonlyMap<string, FoundationWallType>,
) {
  clearWallView(view);
  const footprintPoints = (component: "footing" | "sill" | "stem") => {
    const footprint = foundationBandFootprint(line, type, component, joinPlan, linesById, typesById);
    return footprint ? [footprint.startExterior, footprint.startInterior, footprint.endInterior, footprint.endExterior] as [PlanPoint, PlanPoint, PlanPoint, PlanPoint] : null;
  };
  addFoundationSolid(view, footprintPoints("stem"), type.wallHeight, vertical.baseElevation, 0x9ca5a8, line.id, "Concrete stem");
  if (type.footing.enabled) {
    addFoundationSolid(view, footprintPoints("footing"), type.footing.height, vertical.footingBottomElevation, 0x879194, line.id, "Continuous footing");
  }
  for (let index = 0; index < type.sill.foundationPlateCount; index += 1) {
    addFoundationSolid(
      view,
      footprintPoints("sill"),
      type.sill.plateHeight,
      vertical.topElevation + index * type.sill.plateHeight,
      0xb8905f,
      line.id,
      `Foundation sill plate ${index + 1}`,
    );
  }
  rebuildWallEdges(view);
}

function disposeWallView(scene: THREE.Scene, view: WallView) {
  clearWallView(view);
  scene.remove(view.group);
}

function createViewportLine(scene: THREE.Scene, lineId: string): ViewportLine {
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.LineDashedMaterial({ color: 0x88bff0, dashSize: 1e9, depthTest: false, gapSize: 0, toneMapped: false });
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 12;
  line.userData.lineId = lineId;
  scene.add(line);
  return { geometry, material, line };
}

function updateViewportLine(view: ViewportLineGeometry, geometry: LineGeometry, zOffset = 0.35) {
  view.geometry.setFromPoints([
    new THREE.Vector3(geometry.start.x, geometry.start.y, geometry.start.z + zOffset),
    new THREE.Vector3(geometry.end.x, geometry.end.y, geometry.end.z + zOffset),
  ]);
  view.geometry.computeBoundingSphere();
  view.line.computeLineDistances();
}

function applyLayerAppearanceToViewportLine(view: ViewportLine, layer: ReturnType<typeof findLayer>) {
  if (!layer) return;
  view.material.color.set(layer.color);
  view.material.dashSize = layer.lineStyle === "solid" ? 1e9 : layer.lineStyle === "dotted" ? 1.25 : layer.lineStyle === "center" ? 12 : 6;
  view.material.gapSize = layer.lineStyle === "solid" ? 0 : layer.lineStyle === "dotted" ? 2.5 : layer.lineStyle === "center" ? 3 : 4;
  view.material.needsUpdate = true;
}

function disposeViewportLine(scene: THREE.Scene, view: ViewportLine) {
  scene.remove(view.line);
  if (view.fill) scene.remove(view.fill);
  view.geometry.dispose();
  view.material.dispose();
  view.fillGeometry?.dispose();
  view.fillMaterial?.dispose();
}

function createViewportPolyline(scene: THREE.Scene, polylineId: string): ViewportLine {
  const view = createViewportLine(scene, polylineId);
  delete view.line.userData.lineId;
  view.line.userData.polylineId = polylineId;
  const fillGeometry = new THREE.BufferGeometry();
  const fillMaterial = new THREE.MeshBasicMaterial({ color: 0x88bff0, depthTest: false, opacity: 0.42, side: THREE.DoubleSide, transparent: true, toneMapped: false });
  const fill = new THREE.Mesh(fillGeometry, fillMaterial);
  fill.renderOrder = 11;
  fill.userData.polylineId = polylineId;
  scene.add(fill);
  view.fill = fill;
  view.fillGeometry = fillGeometry;
  view.fillMaterial = fillMaterial;
  return view;
}

function updateViewportPolyline(view: ViewportLineGeometry, polyline: PolylineGeometry, zOffset = 0.45) {
  const points = polylinePathPoints(polyline).map((point) => new THREE.Vector3(point.x, point.y, polyline.elevation + zOffset));
  view.geometry.setFromPoints(points);
  view.geometry.computeBoundingSphere();
  view.line.computeLineDistances();
  if (view.fill && view.fillGeometry) {
    const width = polyline.width ?? 0;
    const positions: number[] = [];
    if (width >= 1 / 16) {
      points.slice(1).forEach((end, index) => {
        const start = points[index];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.hypot(dx, dy);
        if (length < 1e-8) return;
        const nx = -dy / length * width / 2;
        const ny = dx / length * width / 2;
        positions.push(
          start.x + nx, start.y + ny, start.z - 0.05,
          start.x - nx, start.y - ny, start.z - 0.05,
          end.x + nx, end.y + ny, end.z - 0.05,
          start.x - nx, start.y - ny, start.z - 0.05,
          end.x - nx, end.y - ny, end.z - 0.05,
          end.x + nx, end.y + ny, end.z - 0.05,
        );
      });
    }
    view.fillGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    view.fillGeometry.computeBoundingSphere();
    view.fill.visible = width >= 1 / 16;
  }
}

function createViewportCircle(scene: THREE.Scene, circleId: string): ViewportLine {
  const view = createViewportLine(scene, circleId);
  delete view.line.userData.lineId;
  view.line.userData.circleId = circleId;
  return view;
}

function updateViewportCircle(view: ViewportLineGeometry, circle: CircleGeometry, zOffset = 0.5) {
  const points = Array.from({ length: 97 }, (_, index) => {
    const angle = index / 96 * Math.PI * 2;
    return new THREE.Vector3(
      circle.center.x + Math.cos(angle) * circle.radius,
      circle.center.y + Math.sin(angle) * circle.radius,
      circle.center.z + zOffset,
    );
  });
  view.geometry.setFromPoints(points);
  view.geometry.computeBoundingSphere();
  view.line.computeLineDistances();
}

function createViewportArc(scene: THREE.Scene, arcId: string): ViewportLine {
  const view = createViewportLine(scene, arcId);
  delete view.line.userData.lineId;
  view.line.userData.arcId = arcId;
  return view;
}

function updateViewportArc(view: ViewportLineGeometry, arc: ArcGeometry, zOffset = 0.55) {
  const segmentCount = Math.max(16, Math.ceil(arcSweepAngle(arc) / 4));
  const points = Array.from({ length: segmentCount + 1 }, (_, index) => {
    const point = arcPointAtFraction(arc, index / segmentCount);
    return new THREE.Vector3(point.x, point.y, point.z + zOffset);
  });
  view.geometry.setFromPoints(points);
  view.geometry.computeBoundingSphere();
  view.line.computeLineDistances();
}

type LineGripSet = {
  group: THREE.Group;
  handles: THREE.Mesh[];
};

function createLineGripSet(scene: THREE.Scene): LineGripSet {
  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 32;
  const handles = (["start", "midpoint", "end"] as const).map((grip) => {
    const handle = new THREE.Mesh(
      grip === "midpoint" ? new THREE.OctahedronGeometry(1, 0) : new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: grip === "midpoint" ? 0x71d49a : 0x39a9ff, depthTest: false, toneMapped: false }),
    );
    handle.renderOrder = 32;
    handle.userData.lineGrip = grip;
    handle.userData.screenPixels = grip === "midpoint" ? 12 : 10;
    group.add(handle);
    return handle;
  });
  scene.add(group);
  return { group, handles };
}

function updateLineGripPositions(grips: LineGripSet, line: LineObject) {
  const midpoint = lineMidpoint(line);
  const points = [line.start, midpoint, line.end];
  grips.handles.forEach((handle, index) => handle.position.set(points[index].x, points[index].y, points[index].z + 0.7));
}

function disposeLineGripSet(scene: THREE.Scene, grips: LineGripSet) {
  scene.remove(grips.group);
  grips.handles.forEach((handle) => {
    handle.geometry.dispose();
    (handle.material as THREE.Material).dispose();
  });
}

type PolylineGripSet = { group: THREE.Group; handles: THREE.Mesh[] };

function createPolylineGripSet(scene: THREE.Scene): PolylineGripSet {
  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 33;
  scene.add(group);
  return { group, handles: [] };
}

function updatePolylineGripPositions(grips: PolylineGripSet, polyline: PolylineObject) {
  const definitions = polyline.shape === "rectangle" && rectangleSupportsConstrainedGrips(polyline)
    ? rectangleGripPoints(polyline).map(({ grip, point }) => ({ grip, point, vertex: null }))
    : polyline.vertices.map((point, vertex) => ({ grip: null, point, vertex }));
  while (grips.handles.length < definitions.length) {
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0x39a9ff, depthTest: false, toneMapped: false }),
    );
    handle.renderOrder = 33;
    handle.userData.screenPixels = 10;
    grips.group.add(handle);
    grips.handles.push(handle);
  }
  grips.handles.forEach((handle, index) => {
    const definition = definitions[index];
    handle.visible = Boolean(definition);
    delete handle.userData.polylineVertex;
    delete handle.userData.rectangleGrip;
    delete handle.userData.roofPlaneGrip;
    if (!definition) return;
    if (definition.grip) handle.userData.rectangleGrip = definition.grip;
    else handle.userData.polylineVertex = definition.vertex;
    if (polyline.architecturalRole === "roof-plane" && definition.vertex !== null) handle.userData.roofPlaneGrip = definition.vertex < 2 ? "eave-span" : "boundary";
    handle.userData.screenPixels = definition.grip?.kind === "center" ? 12 : 10;
    (handle.material as THREE.MeshBasicMaterial).color.setHex(polyline.architecturalRole === "roof-plane" && definition.vertex !== null && definition.vertex < 2 ? 0xf2ad32 : definition.grip?.kind === "center" ? 0x55d68a : definition.grip?.kind === "edge" ? 0x62c3ff : 0x39a9ff);
    handle.position.set(definition.point.x, definition.point.y, polyline.elevation + 0.8);
  });
}

function disposePolylineGripSet(scene: THREE.Scene, grips: PolylineGripSet) {
  scene.remove(grips.group);
  grips.handles.forEach((handle) => {
    handle.geometry.dispose();
    (handle.material as THREE.Material).dispose();
  });
}

type CircleGripSet = { group: THREE.Group; handles: THREE.Mesh[] };

function createCircleGripSet(scene: THREE.Scene): CircleGripSet {
  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 34;
  const handles = (["center", "east", "north", "west", "south"] as CircleGrip[]).map((grip) => {
    const handle = new THREE.Mesh(
      grip === "center" ? new THREE.OctahedronGeometry(1, 0) : new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: grip === "center" ? 0x71d49a : 0x39a9ff, depthTest: false, toneMapped: false }),
    );
    handle.renderOrder = 34;
    handle.userData.circleGrip = grip;
    handle.userData.screenPixels = grip === "center" ? 12 : 10;
    group.add(handle);
    return handle;
  });
  scene.add(group);
  return { group, handles };
}

function updateCircleGripPositions(grips: CircleGripSet, circle: CircleObject) {
  circleGripPoints(circle).forEach(({ point }, index) => {
    grips.handles[index].position.set(point.x, point.y, point.z + 0.85);
  });
}

function disposeCircleGripSet(scene: THREE.Scene, grips: CircleGripSet) {
  scene.remove(grips.group);
  grips.handles.forEach((handle) => {
    handle.geometry.dispose();
    (handle.material as THREE.Material).dispose();
  });
}

type ArcGripSet = { group: THREE.Group; handles: THREE.Mesh[] };

function createArcGripSet(scene: THREE.Scene): ArcGripSet {
  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 35;
  const handles = (["center", "start", "midpoint", "end"] as ArcGrip[]).map((grip) => {
    const handle = new THREE.Mesh(
      grip === "center" ? new THREE.OctahedronGeometry(1, 0) : new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: grip === "center" ? 0x71d49a : 0x39a9ff, depthTest: false, toneMapped: false }),
    );
    handle.renderOrder = 35;
    handle.userData.arcGrip = grip;
    handle.userData.screenPixels = grip === "center" ? 12 : 10;
    group.add(handle);
    return handle;
  });
  scene.add(group);
  return { group, handles };
}

function updateArcGripPositions(grips: ArcGripSet, arc: ArcObject) {
  arcGripPoints(arc).forEach(({ point }, index) => grips.handles[index].position.set(point.x, point.y, point.z + 0.9));
}

function disposeArcGripSet(scene: THREE.Scene, grips: ArcGripSet) {
  scene.remove(grips.group);
  grips.handles.forEach((handle) => {
    handle.geometry.dispose();
    (handle.material as THREE.Material).dispose();
  });
}

function createViewportObject(scene: THREE.Scene, objectId: string): ViewportObject {
  const materials = FACE_DEFINITIONS.map(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x66788a,
        emissive: 0x000000,
        roughness: 0.58,
        metalness: 0.06,
        transparent: true,
        opacity: 0.84,
      }),
  );
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materials);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.objectId = objectId;
  scene.add(mesh);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    new THREE.LineBasicMaterial({ color: 0x8da0b2 }),
  );
  scene.add(edges);
  return { edges, materials, mesh };
}

function disposeViewportObject(scene: THREE.Scene, view: ViewportObject) {
  scene.remove(view.mesh, view.edges);
  view.mesh.geometry.dispose();
  view.materials.forEach((material) => material.dispose());
  view.edges.geometry.dispose();
  (view.edges.material as THREE.Material).dispose();
}

type MoveGizmo = {
  group: THREE.Group;
  handles: THREE.Mesh[];
};

function createMoveGizmo(scene: THREE.Scene): MoveGizmo {
  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 20;
  const handles: THREE.Mesh[] = [];
  const origin = new THREE.Mesh(
    new THREE.SphereGeometry(3.2, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xf0d49d, depthTest: false }),
  );
  origin.renderOrder = 20;
  group.add(origin);

  const axes: Array<{ axis: AxisKey; color: number; direction: THREE.Vector3 }> = [
    { axis: "x", color: 0xe36b63, direction: new THREE.Vector3(1, 0, 0) },
    { axis: "y", color: 0x65c38b, direction: new THREE.Vector3(0, 1, 0) },
    { axis: "z", color: 0x61a9e7, direction: new THREE.Vector3(0, 0, 1) },
  ];
  const cylinderUp = new THREE.Vector3(0, 1, 0);

  axes.forEach(({ axis, color, direction }) => {
    const material = new THREE.MeshBasicMaterial({
      color,
      depthTest: false,
      transparent: true,
      opacity: 0.96,
    });
    const orientation = new THREE.Quaternion().setFromUnitVectors(cylinderUp, direction);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 34, 8), material);
    shaft.position.copy(direction).multiplyScalar(17);
    shaft.quaternion.copy(orientation);
    shaft.renderOrder = 20;
    shaft.userData.moveAxis = axis;
    group.add(shaft);
    handles.push(shaft);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(5, 12, 10), material);
    tip.position.copy(direction).multiplyScalar(40);
    tip.quaternion.copy(orientation);
    tip.renderOrder = 20;
    tip.userData.moveAxis = axis;
    group.add(tip);
    handles.push(tip);
  });

  scene.add(group);
  return { group, handles };
}

type RotationGizmo = {
  baseHandle: THREE.Mesh;
  group: THREE.Group;
  ring: THREE.Mesh;
};

function createRotationGizmo(scene: THREE.Scene): RotationGizmo {
  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 35;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.035, 10, 72),
    new THREE.MeshBasicMaterial({
      color: 0xe3ad4d,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.96,
      toneMapped: false,
    }),
  );
  ring.renderOrder = 35;
  ring.userData.rotationHandle = true;
  group.add(ring);
  const baseHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 2.8, 1.2, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd47d, depthTest: false, toneMapped: false }),
  );
  baseHandle.rotation.x = Math.PI / 2;
  baseHandle.renderOrder = 36;
  group.add(baseHandle);
  scene.add(group);
  return { baseHandle, group, ring };
}

function disposeRotationGizmo(scene: THREE.Scene, gizmo: RotationGizmo) {
  scene.remove(gizmo.group);
  gizmo.ring.geometry.dispose();
  (gizmo.ring.material as THREE.Material).dispose();
  gizmo.baseHandle.geometry.dispose();
  (gizmo.baseHandle.material as THREE.Material).dispose();
}

type ScaleGizmo = {
  baseHandle: THREE.Mesh;
  group: THREE.Group;
  guide: THREE.Line;
  handle: THREE.Mesh;
};

function createScaleGizmo(scene: THREE.Scene): ScaleGizmo {
  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 35;
  const guide = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
    ]),
    new THREE.LineDashedMaterial({ color: 0x65d8a6, dashSize: 6, depthTest: false, gapSize: 3, toneMapped: false }),
  );
  guide.computeLineDistances();
  guide.renderOrder = 35;
  group.add(guide);
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(9, 9, 2),
    new THREE.MeshBasicMaterial({ color: 0x65d8a6, depthTest: false, toneMapped: false }),
  );
  handle.renderOrder = 36;
  handle.userData.scaleHandle = true;
  group.add(handle);
  const baseHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 2.8, 1.2, 16),
    new THREE.MeshBasicMaterial({ color: 0xb8f5dc, depthTest: false, toneMapped: false }),
  );
  baseHandle.rotation.x = Math.PI / 2;
  baseHandle.renderOrder = 36;
  group.add(baseHandle);
  scene.add(group);
  return { baseHandle, group, guide, handle };
}

function disposeScaleGizmo(scene: THREE.Scene, gizmo: ScaleGizmo) {
  scene.remove(gizmo.group);
  gizmo.guide.geometry.dispose();
  (gizmo.guide.material as THREE.Material).dispose();
  gizmo.handle.geometry.dispose();
  (gizmo.handle.material as THREE.Material).dispose();
  gizmo.baseHandle.geometry.dispose();
  (gizmo.baseHandle.material as THREE.Material).dispose();
}

function disposeMoveGizmo(scene: THREE.Scene, gizmo: MoveGizmo) {
  scene.remove(gizmo.group);
  const materials = new Set<THREE.Material>();
  gizmo.group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    if (Array.isArray(child.material)) child.material.forEach((material) => materials.add(material));
    else materials.add(child.material);
  });
  materials.forEach((material) => material.dispose());
}

type BoxGripSet = {
  centerHandle: THREE.Mesh;
  group: THREE.Group;
  handles: THREE.Mesh[];
};

const GRIP_COLORS: Record<BoxGripKind, number> = {
  corner: 0x39a9ff,
  edge: 0x58b8ff,
  face: 0x78c7ff,
};

function createBoxGripSet(scene: THREE.Scene): BoxGripSet {
  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 30;
  const centerHandle = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.35, 0),
    new THREE.MeshBasicMaterial({
      color: 0x71d49a,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  centerHandle.frustumCulled = false;
  centerHandle.renderOrder = 31;
  centerHandle.userData.objectMoveGrip = true;
  centerHandle.userData.screenPixels = 14;
  group.add(centerHandle);

  const resizeHandles = BOX_GRIP_DEFINITIONS.map((grip) => {
    const size = grip.kind === "face" ? 1.18 : grip.kind === "edge" ? 1.02 : 0.92;
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      new THREE.MeshBasicMaterial({
        color: GRIP_COLORS[grip.kind],
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    handle.frustumCulled = false;
    handle.renderOrder = 30;
    handle.userData.boxGrip = grip;
    handle.userData.screenPixels = 10;
    group.add(handle);
    return handle;
  });
  const handles = [centerHandle, ...resizeHandles];
  scene.add(group);
  return { centerHandle, group, handles };
}

function updateBoxGripPositions(gripSet: BoxGripSet, object: BoxObject) {
  const center = boxWorldPoint(object, 0.5, 0.5, 0.5);
  gripSet.centerHandle.position.set(center.x, center.y, center.z);
  gripSet.handles.slice(1).forEach((handle) => {
    const grip = handle.userData.boxGrip as BoxGripDefinition;
    const position = boxGripPosition(object, grip);
    handle.position.set(position.x, position.y, position.z);
  });
}

function disposeBoxGripSet(scene: THREE.Scene, gripSet: BoxGripSet) {
  scene.remove(gripSet.group);
  gripSet.handles.forEach((handle) => {
    handle.geometry.dispose();
    (handle.material as THREE.Material).dispose();
  });
}

export function Viewport({
  activeElevation,
  gridSpacing,
  gridVisible,
  interfaceTheme,
  arcCommand,
  arcContinueSeed,
  arcMethod,
  arcMode,
  circleCommand,
  circleMethod,
  circleMode,
  copyMode,
  document,
  dragStatus,
  fitViewSignal,
  lineCommand,
  lineMode,
  lineSnapAngles,
  polylineCommand,
  polylineMode,
  polylineSegmentMode,
  polylineWidth,
  rectangleCommand,
  rectangleDraftSettings,
  rectangleMode,
  moveMode,
  mirrorMode,
  mirrorKeepSource,
  offsetDistance,
  offsetKeepSource,
  offsetMode,
  chamferFirstDistance,
  chamferMode,
  chamferSecondDistance,
  breakMode,
  boundaryMode,
  filletMode,
  filletRadius,
  lengthenMethod,
  lengthenMode,
  lengthenValue,
  extendMode,
  trimMode,
  objectSnapEnabled,
  objectSnapModes,
  objectSnapOverride,
  orthoEnabled,
  polarEnabled,
  rotateMode,
  rotationBaseKey,
  scaleMode,
  scaleBaseKey,
  stretchMode,
  stretchTargets,
  onDragCancel,
  onDragCommit,
  onDragPreview,
  onDragStatus,
  onExactFaceMove,
  onFaceSelect,
  onArcCreate,
  onArcFinishRequested,
  onArcPointsChange,
  onArcSelect,
  onCirclePointsChange,
  onCircleCreate,
  onCircleFinishRequested,
  onCircleSelect,
  onLineAnchorChange,
  onLineCommandFeedback,
  onLineCreate,
  onLineFinishRequested,
  onLineSelect,
  onLineUndoSegment,
  onModifyCommit,
  onModifyFinishRequested,
  onMirrorCommit,
  onMirrorFinishRequested,
  onOffsetCommit,
  onOffsetFinishRequested,
  onChamferCommit,
  onChamferFinishRequested,
  onChamferStageChange,
  onBreakCommit,
  onBreakFinishRequested,
  onBreakStageChange,
  onBoundaryCommit,
  onBoundaryFinishRequested,
  onFilletCommit,
  onFilletFinishRequested,
  onFilletStageChange,
  onLengthenCommit,
  onLengthenFinishRequested,
  onTrimExtendCommit,
  onTrimExtendFinishRequested,
  onObjectSnapOverrideConsumed,
  onPolylineCreate,
  onPolylineAnchorChange,
  onPolylineFinishRequested,
  onPolylineSelect,
  onSelectionWindow,
  onRectangleAnchorChange,
  onRectangleFinishRequested,
  onRotateFinishRequested,
  onScaleFinishRequested,
  onStretchCommit,
  onStretchFinishRequested,
  onStretchTargetsChange,
  onRoomLabelOpen,
  onRoomLabelTypeChange,
  onRoomCeilingHeightChange,
  onWallClearanceChange,
  onWallLengthChange,
  onViewChange,
  selectedArcId,
  selectedFaceIndex,
  selectedCircleId,
  selectedLineId,
  selectedPolylineId,
  selectedObjectId,
  selectedObjectIds,
  selectedEntityKeys,
  snapIncrement,
  viewTarget,
}: ViewportProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeGripInput, setActiveGripInput] = useState<ActiveGripInput | null>(null);
  const [gripDraft, setGripDraft] = useState("");
  const [gripInputError, setGripInputError] = useState("");
  const [dynamicLineInput, setDynamicLineInput] = useState<{ angle: number; distance: number; elevation: number; label: string; x: number; y: number } | null>(null);
  const [dynamicArcInput, setDynamicArcInput] = useState<{ elevation: number; label: string; stage: string; x: number; y: number } | null>(null);
  const [dynamicCircleInput, setDynamicCircleInput] = useState<{ elevation: number; label: string; radius: number; stage: string; x: number; y: number } | null>(null);
  const [dynamicPolylineInput, setDynamicPolylineInput] = useState<{ angle: number; distance: number; elevation: number; label: string; x: number; y: number } | null>(null);
  const [dynamicRectangleInput, setDynamicRectangleInput] = useState<{ elevation: number; height: number; label: string; width: number; x: number; y: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ end: ScreenPoint; mode: SelectionWindowMode; start: ScreenPoint } | null>(null);
  const [hoveredEntityKey, setHoveredEntityKey] = useState<string | null>(null);
  const [selectionCycle, setSelectionCycle] = useState<{ count: number; index: number; label: string; x: number; y: number } | null>(null);
  const [activeRoomLabelId, setActiveRoomLabelId] = useState<string | null>(null);
  const [activeRoomCeilingId, setActiveRoomCeilingId] = useState<string | null>(null);
  const [roomCeilingDraft, setRoomCeilingDraft] = useState("");
  const [roomLabelScreens, setRoomLabelScreens] = useState<Array<{ roomId: string; x: number; y: number }>>([]);
  const roomLabelScreenSignatureRef = useRef("");
  const [temporaryWallDimensionScreen, setTemporaryWallDimensionScreen] = useState<TemporaryWallDimensionScreen | null>(null);
  const temporaryWallDimensionScreenSignatureRef = useRef("");
  const objectViewsRef = useRef(new Map<string, ViewportObject>());
  const lineViewsRef = useRef(new Map<string, ViewportLine>());
  const wallViewsRef = useRef(new Map<string, WallView>());
  const arcViewsRef = useRef(new Map<string, ViewportLine>());
  const circleViewsRef = useRef(new Map<string, ViewportLine>());
  const polylineViewsRef = useRef(new Map<string, ViewportLine>());
  const floorPlatformViewsRef = useRef(new Map<string, FloorPlatformView>());
  const roofPlaneViewsRef = useRef(new Map<string, FloorPlatformView>());
  const roomPlatformViewsRef = useRef(new Map<string, FloorPlatformView>());
  const moveGizmoRef = useRef<MoveGizmo | null>(null);
  const rotationGizmoRef = useRef<RotationGizmo | null>(null);
  const scaleGizmoRef = useRef<ScaleGizmo | null>(null);
  const boxGripSetRef = useRef<BoxGripSet | null>(null);
  const lineGripSetRef = useRef<LineGripSet | null>(null);
  const arcGripSetRef = useRef<ArcGripSet | null>(null);
  const polylineGripSetRef = useRef<PolylineGripSet | null>(null);
  const circleGripSetRef = useRef<CircleGripSet | null>(null);
  const selectedObjectIdRef = useRef(selectedObjectId);
  const selectedObjectIdsRef = useRef(selectedObjectIds);
  const selectedEntityKeysRef = useRef(selectedEntityKeys);
  const copyModeRef = useRef(copyMode);
  const moveModeRef = useRef(moveMode);
  const mirrorModeRef = useRef(mirrorMode);
  const mirrorKeepSourceRef = useRef(mirrorKeepSource);
  const offsetDistanceRef = useRef(offsetDistance);
  const offsetKeepSourceRef = useRef(offsetKeepSource);
  const offsetModeRef = useRef(offsetMode);
  const chamferFirstDistanceRef = useRef(chamferFirstDistance);
  const chamferModeRef = useRef(chamferMode);
  const chamferSecondDistanceRef = useRef(chamferSecondDistance);
  const breakModeRef = useRef(breakMode);
  const boundaryModeRef = useRef(boundaryMode);
  const filletModeRef = useRef(filletMode);
  const filletRadiusRef = useRef(filletRadius);
  const lengthenMethodRef = useRef(lengthenMethod);
  const lengthenModeRef = useRef(lengthenMode);
  const lengthenValueRef = useRef(lengthenValue);
  const extendModeRef = useRef(extendMode);
  const trimModeRef = useRef(trimMode);
  const rotateModeRef = useRef(rotateMode);
  const scaleModeRef = useRef(scaleMode);
  const stretchModeRef = useRef(stretchMode);
  const stretchTargetsRef = useRef(stretchTargets);
  const lineModeRef = useRef(lineMode);
  const arcModeRef = useRef(arcMode);
  const arcMethodRef = useRef(arcMethod);
  const arcContinueSeedRef = useRef(arcContinueSeed);
  const circleModeRef = useRef(circleMode);
  const circleMethodRef = useRef(circleMethod);
  const activeElevationRef = useRef(activeElevation);
  const objectSnapEnabledRef = useRef(objectSnapEnabled);
  const objectSnapModesRef = useRef(objectSnapModes);
  const objectSnapOverrideRef = useRef(objectSnapOverride);
  const orthoEnabledRef = useRef(orthoEnabled);
  const polarEnabledRef = useRef(polarEnabled);
  const lineCommandRef = useRef(lineCommand);
  const arcCommandRef = useRef(arcCommand);
  const circleCommandRef = useRef(circleCommand);
  const rectangleCommandRef = useRef(rectangleCommand);
  const rectangleDraftSettingsRef = useRef(rectangleDraftSettings);
  const polylineCommandRef = useRef(polylineCommand);
  const lineSnapAnglesRef = useRef(lineSnapAngles);
  const snapIncrementRef = useRef(snapIncrement);
  const processedLineCommandIdRef = useRef(0);
  const processedArcCommandIdRef = useRef(0);
  const processedCircleCommandIdRef = useRef(0);
  const processedRectangleCommandIdRef = useRef(0);
  const processedPolylineCommandIdRef = useRef(0);
  const selectedLineIdRef = useRef(selectedLineId);
  const selectedArcIdRef = useRef(selectedArcId);
  const selectedCircleIdRef = useRef(selectedCircleId);
  const selectedPolylineIdRef = useRef(selectedPolylineId);
  const polylineModeRef = useRef(polylineMode);
  const polylineSegmentModeRef = useRef(polylineSegmentMode);
  const polylineWidthRef = useRef(polylineWidth);
  const rectangleModeRef = useRef(rectangleMode);
  const lineStartRef = useRef<LinePoint | null>(null);
  const arcPointsRef = useRef<LinePoint[]>([]);
  const arcCursorRef = useRef<LinePoint | null>(null);
  const circlePointsRef = useRef<LinePoint[]>([]);
  const circleTangentConstraintsRef = useRef<PickedCircleTangentConstraint[]>([]);
  const circleCursorRef = useRef<LinePoint | null>(null);
  const lineCursorRef = useRef<LinePoint | null>(null);
  const linePointHistoryRef = useRef<LinePoint[]>([]);
  const lineEscapeArmedRef = useRef(false);
  const polylinePointsRef = useRef<PlanPoint[]>([]);
  const polylineBulgesRef = useRef<number[]>([]);
  const polylineArcThroughRef = useRef<LinePoint | null>(null);
  const polylineElevationRef = useRef(activeElevation);
  const polylineCursorRef = useRef<LinePoint | null>(null);
  const polylineEscapeArmedRef = useRef(false);
  const rectangleStartRef = useRef<LinePoint | null>(null);
  const rectangleCursorRef = useRef<LinePoint | null>(null);
  const rectangleEscapeArmedRef = useRef(false);
  const modifyBaseRef = useRef<LinePoint | null>(null);
  const modifyBeforeRef = useRef<ModelDocument | null>(null);
  const mirrorAxisStartRef = useRef<LinePoint | null>(null);
  const mirrorBeforeRef = useRef<ModelDocument | null>(null);
  const offsetBeforeRef = useRef<ModelDocument | null>(null);
  const chamferBeforeRef = useRef<ModelDocument | null>(null);
  const chamferFirstPickRef = useRef<{ id: string; point: LinePoint } | null>(null);
  const breakBeforeRef = useRef<ModelDocument | null>(null);
  const breakTargetRef = useRef<CadEntityRef | null>(null);
  const breakFirstPointRef = useRef<LinePoint | null>(null);
  const filletBeforeRef = useRef<ModelDocument | null>(null);
  const filletFirstPickRef = useRef<CurveFilletPick | null>(null);
  const lengthenBeforeRef = useRef<ModelDocument | null>(null);
  const lengthenEndpointRef = useRef<LengthenEndpoint | null>(null);
  const trimExtendBeforeRef = useRef<ModelDocument | null>(null);
  const acquiredTrackingPointsRef = useRef<LinePoint[]>([]);
  const objectSnapHoverRef = useRef<{ key: string; since: number } | null>(null);
  const objectSnapAcquisitionTimerRef = useRef<number | null>(null);
  const objectSnapCycleIndexRef = useRef(0);
  const objectSnapCycleCountRef = useRef(0);
  const objectSnapCyclePointerRef = useRef<LinePoint | null>(null);
  const rotationBaseKeyRef = useRef(rotationBaseKey);
  const scaleBaseKeyRef = useRef(scaleBaseKey);
  const viewTargetRef = useRef(viewTarget);
  const cameraOrientationRef = useRef(new THREE.Quaternion());
  const cubeOrbitRef = useRef<CubeOrbitController | null>(null);
  const skipNextViewApplyRef = useRef(false);
  const onViewChangeRef = useRef(onViewChange);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const gridPlacementRef = useRef<{ position: [number, number, number]; rotation: [number, number, number] }>({
    position: [0, 0, -0.15],
    rotation: [Math.PI / 2, 0, 0],
  });
  const objectCountRef = useRef(document.objects.length);
  const lineCountRef = useRef(document.lines.length);
  const arcCountRef = useRef(document.arcs.length);
  const circleCountRef = useRef(document.circles.length);
  const polylineCountRef = useRef(document.polylines.length);
  const fitViewRef = useRef<(() => void) | null>(null);
  const applyViewRef = useRef<((view: ViewTarget) => void) | null>(null);
  const documentRef = useRef(document);
  const callbacksRef = useRef({
    onDragCancel,
    onDragCommit,
    onDragPreview,
    onDragStatus,
    onFaceSelect,
    onArcCreate,
    onArcFinishRequested,
    onArcPointsChange,
    onArcSelect,
    onCirclePointsChange,
    onCircleCreate,
    onCircleFinishRequested,
    onCircleSelect,
    onLineAnchorChange,
    onLineCommandFeedback,
    onLineCreate,
    onLineFinishRequested,
    onLineSelect,
    onLineUndoSegment,
    onModifyCommit,
    onModifyFinishRequested,
    onMirrorCommit,
    onMirrorFinishRequested,
    onOffsetCommit,
    onOffsetFinishRequested,
    onChamferCommit,
    onChamferFinishRequested,
    onChamferStageChange,
    onBreakCommit,
    onBreakFinishRequested,
    onBreakStageChange,
    onBoundaryCommit,
    onBoundaryFinishRequested,
    onFilletCommit,
    onFilletFinishRequested,
    onFilletStageChange,
    onLengthenCommit,
    onLengthenFinishRequested,
    onTrimExtendCommit,
    onTrimExtendFinishRequested,
    onObjectSnapOverrideConsumed,
    onPolylineAnchorChange,
    onPolylineCreate,
    onPolylineFinishRequested,
    onPolylineSelect,
    onSelectionWindow,
    onRectangleAnchorChange,
    onRectangleFinishRequested,
    onRotateFinishRequested,
    onScaleFinishRequested,
    onStretchCommit,
    onStretchFinishRequested,
    onStretchTargetsChange,
  });

  const closeGripInput = useCallback(() => {
    setActiveGripInput(null);
    setGripDraft("");
    setGripInputError("");
    onDragStatus(null);
  }, [onDragStatus]);

  useEffect(() => {
    if (!selectionCycle) return;
    const timeout = window.setTimeout(() => setSelectionCycle(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [selectionCycle]);

  useEffect(() => {
    if (moveMode || copyMode || stretchMode || !modifyBeforeRef.current) return;
    onDragCancel(modifyBeforeRef.current);
    modifyBaseRef.current = null;
    modifyBeforeRef.current = null;
    setDynamicLineInput(null);
    onDragStatus(null);
  }, [copyMode, moveMode, onDragCancel, onDragStatus, stretchMode]);

  useEffect(() => {
    if (mirrorMode || !mirrorBeforeRef.current) return;
    onDragCancel(mirrorBeforeRef.current);
    mirrorAxisStartRef.current = null;
    mirrorBeforeRef.current = null;
    setDynamicLineInput(null);
    onDragStatus(null);
  }, [mirrorMode, onDragCancel, onDragStatus]);

  useEffect(() => {
    if (offsetMode || !offsetBeforeRef.current) return;
    onDragCancel(offsetBeforeRef.current);
    offsetBeforeRef.current = null;
    setDynamicLineInput(null);
    onDragStatus(null);
  }, [offsetMode, onDragCancel, onDragStatus]);

  useEffect(() => {
    if (breakMode) return;
    if (breakBeforeRef.current) onDragCancel(breakBeforeRef.current);
    breakBeforeRef.current = null;
    breakTargetRef.current = null;
    breakFirstPointRef.current = null;
  }, [breakMode, onDragCancel]);

  useEffect(() => {
    if (chamferMode) return;
    if (chamferBeforeRef.current) onDragCancel(chamferBeforeRef.current);
    chamferBeforeRef.current = null;
    chamferFirstPickRef.current = null;
  }, [chamferMode, onDragCancel]);

  useEffect(() => {
    if (filletMode) return;
    if (filletBeforeRef.current) onDragCancel(filletBeforeRef.current);
    filletBeforeRef.current = null;
    filletFirstPickRef.current = null;
  }, [filletMode, onDragCancel]);

  useEffect(() => {
    if (lengthenMode) return;
    if (lengthenBeforeRef.current) onDragCancel(lengthenBeforeRef.current);
    lengthenBeforeRef.current = null;
    lengthenEndpointRef.current = null;
  }, [lengthenMode, onDragCancel]);

  useEffect(() => {
    if (trimMode || extendMode || !trimExtendBeforeRef.current) return;
    onDragCancel(trimExtendBeforeRef.current);
    trimExtendBeforeRef.current = null;
    setDynamicLineInput(null);
    onDragStatus(null);
  }, [extendMode, onDragCancel, onDragStatus, trimMode]);

  const updateGripDraft = useCallback((draft: string) => {
    setGripDraft(draft);
    setGripInputError("");
    if (!activeGripInput) return;
    const parsed = parseSignedArchitectural(draft);
    onDragStatus({
      axis: activeGripInput.axis,
      distance: parsed === null ? 0 : snapToSixteenth(parsed),
      gripKind: "face",
      kind: "entry",
      valid: parsed !== null,
    });
  }, [activeGripInput, onDragStatus]);

  const commitGripInput = useCallback(() => {
    if (!activeGripInput) return;
    const parsed = parseSignedArchitectural(gripDraft);
    if (parsed === null) {
      setGripInputError("Enter a signed architectural distance.");
      onDragStatus({
        axis: activeGripInput.axis,
        distance: 0,
        gripKind: "face",
        kind: "entry",
        valid: false,
      });
      return;
    }
    const distance = snapToSixteenth(parsed);
    if (!onExactFaceMove(activeGripInput.objectId, activeGripInput.faceIndex, distance)) {
      setGripInputError("That distance would make the box too small.");
      onDragStatus({
        axis: activeGripInput.axis,
        distance,
        gripKind: "face",
        kind: "entry",
        valid: false,
      });
      return;
    }
    closeGripInput();
  }, [activeGripInput, closeGripInput, gripDraft, onDragStatus, onExactFaceMove]);

  const focusGripInput = useCallback((input: HTMLInputElement | null) => {
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  useEffect(() => {
    documentRef.current = document;
    selectedObjectIdRef.current = selectedObjectId;
    selectedObjectIdsRef.current = selectedObjectIds;
    selectedEntityKeysRef.current = selectedEntityKeys;
    copyModeRef.current = copyMode;
    moveModeRef.current = moveMode;
    mirrorModeRef.current = mirrorMode;
    mirrorKeepSourceRef.current = mirrorKeepSource;
    offsetDistanceRef.current = offsetDistance;
    offsetKeepSourceRef.current = offsetKeepSource;
    offsetModeRef.current = offsetMode;
    chamferFirstDistanceRef.current = chamferFirstDistance;
    chamferModeRef.current = chamferMode;
    chamferSecondDistanceRef.current = chamferSecondDistance;
    breakModeRef.current = breakMode;
    boundaryModeRef.current = boundaryMode;
    filletModeRef.current = filletMode;
    filletRadiusRef.current = filletRadius;
    lengthenMethodRef.current = lengthenMethod;
    lengthenModeRef.current = lengthenMode;
    lengthenValueRef.current = lengthenValue;
    extendModeRef.current = extendMode;
    trimModeRef.current = trimMode;
    rotateModeRef.current = rotateMode;
    scaleModeRef.current = scaleMode;
    stretchModeRef.current = stretchMode;
    stretchTargetsRef.current = stretchTargets;
    lineModeRef.current = lineMode;
    arcModeRef.current = arcMode;
    arcMethodRef.current = arcMethod;
    arcContinueSeedRef.current = arcContinueSeed;
    circleModeRef.current = circleMode;
    circleMethodRef.current = circleMethod;
    activeElevationRef.current = activeElevation;
    objectSnapEnabledRef.current = objectSnapEnabled;
    objectSnapModesRef.current = objectSnapModes;
    objectSnapOverrideRef.current = objectSnapOverride;
    orthoEnabledRef.current = orthoEnabled;
    polarEnabledRef.current = polarEnabled;
    lineCommandRef.current = lineCommand;
    arcCommandRef.current = arcCommand;
    circleCommandRef.current = circleCommand;
    rectangleCommandRef.current = rectangleCommand;
    rectangleDraftSettingsRef.current = rectangleDraftSettings;
    polylineCommandRef.current = polylineCommand;
    lineSnapAnglesRef.current = lineSnapAngles;
    snapIncrementRef.current = snapIncrement;
    selectedLineIdRef.current = selectedLineId;
    selectedArcIdRef.current = selectedArcId;
    selectedCircleIdRef.current = selectedCircleId;
    selectedPolylineIdRef.current = selectedPolylineId;
    polylineModeRef.current = polylineMode;
    polylineSegmentModeRef.current = polylineSegmentMode;
    polylineWidthRef.current = polylineWidth;
    rectangleModeRef.current = rectangleMode;
    rotationBaseKeyRef.current = rotationBaseKey;
    scaleBaseKeyRef.current = scaleBaseKey;
    viewTargetRef.current = viewTarget;
    onViewChangeRef.current = onViewChange;
    callbacksRef.current = {
      onDragCancel,
      onDragCommit,
      onDragPreview,
      onDragStatus,
      onFaceSelect,
      onArcCreate,
      onArcFinishRequested,
      onArcPointsChange,
      onArcSelect,
      onCirclePointsChange,
      onCircleCreate,
      onCircleFinishRequested,
      onCircleSelect,
      onLineAnchorChange,
      onLineCommandFeedback,
      onLineCreate,
      onLineFinishRequested,
      onLineSelect,
      onLineUndoSegment,
      onModifyCommit,
      onModifyFinishRequested,
      onMirrorCommit,
      onMirrorFinishRequested,
      onOffsetCommit,
      onOffsetFinishRequested,
      onChamferCommit,
      onChamferFinishRequested,
      onChamferStageChange,
      onBreakCommit,
      onBreakFinishRequested,
      onBreakStageChange,
      onBoundaryCommit,
      onBoundaryFinishRequested,
      onFilletCommit,
      onFilletFinishRequested,
      onFilletStageChange,
      onLengthenCommit,
      onLengthenFinishRequested,
      onTrimExtendCommit,
      onTrimExtendFinishRequested,
      onObjectSnapOverrideConsumed,
      onPolylineAnchorChange,
      onPolylineCreate,
      onPolylineFinishRequested,
      onPolylineSelect,
      onSelectionWindow,
      onRectangleAnchorChange,
      onRectangleFinishRequested,
      onRotateFinishRequested,
      onScaleFinishRequested,
      onStretchCommit,
      onStretchFinishRequested,
      onStretchTargetsChange,
    };
  }, [
    document,
    activeElevation,
    copyMode,
    moveMode,
    mirrorMode,
    mirrorKeepSource,
    offsetDistance,
    offsetKeepSource,
    offsetMode,
    chamferFirstDistance,
    chamferMode,
    chamferSecondDistance,
    breakMode,
    boundaryMode,
    filletMode,
    filletRadius,
    lengthenMethod,
    lengthenMode,
    lengthenValue,
    extendMode,
    trimMode,
    rotateMode,
    scaleMode,
    stretchMode,
    stretchTargets,
    lineMode,
    arcMode,
    arcMethod,
    arcContinueSeed,
    circleMode,
    circleMethod,
    lineCommand,
    arcCommand,
    circleCommand,
    rectangleCommand,
    rectangleDraftSettings,
    polylineCommand,
    lineSnapAngles,
    snapIncrement,
    objectSnapEnabled,
    objectSnapModes,
    objectSnapOverride,
    orthoEnabled,
    polarEnabled,
    polylineMode,
    polylineSegmentMode,
    polylineWidth,
    rectangleMode,
    rotationBaseKey,
    scaleBaseKey,
    onDragCancel,
    onDragCommit,
    onDragPreview,
    onChamferCommit,
    onChamferFinishRequested,
    onChamferStageChange,
    onBreakCommit,
    onBreakFinishRequested,
    onBreakStageChange,
    onBoundaryCommit,
    onBoundaryFinishRequested,
    onFilletCommit,
    onFilletFinishRequested,
    onFilletStageChange,
    onLengthenCommit,
    onLengthenFinishRequested,
    onDragStatus,
    onFaceSelect,
    onArcCreate,
    onArcFinishRequested,
    onArcPointsChange,
    onArcSelect,
    onCirclePointsChange,
    onCircleCreate,
    onCircleFinishRequested,
    onCircleSelect,
    onLineAnchorChange,
    onLineCommandFeedback,
    onLineCreate,
    onLineFinishRequested,
    onLineSelect,
    onLineUndoSegment,
    onModifyCommit,
    onModifyFinishRequested,
    onMirrorCommit,
    onMirrorFinishRequested,
    onOffsetCommit,
    onOffsetFinishRequested,
    onTrimExtendCommit,
    onTrimExtendFinishRequested,
    onObjectSnapOverrideConsumed,
    onPolylineAnchorChange,
    onPolylineCreate,
    onPolylineFinishRequested,
    onPolylineSelect,
    onSelectionWindow,
    onRectangleAnchorChange,
    onRectangleFinishRequested,
    onRotateFinishRequested,
    onScaleFinishRequested,
    onStretchCommit,
    onStretchFinishRequested,
    onStretchTargetsChange,
    onViewChange,
    selectedObjectId,
    selectedObjectIds,
    selectedEntityKeys,
    selectedLineId,
    selectedArcId,
    selectedCircleId,
    selectedPolylineId,
    viewTarget,
  ]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const objectViews = objectViewsRef.current;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x151b22);
    const perspectiveCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 10000);
    perspectiveCamera.up.set(0, 0, 1);
    const orthographicCamera = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 10000);
    orthographicCamera.up.set(0, 0, 1);
    let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera = perspectiveCamera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    mount.appendChild(renderer.domElement);

    // The viewport swaps between perspective and orthographic cameras, so the
    // controls must be parameterized over both rather than inferring the first one.
    const controls = new OrbitControls<THREE.PerspectiveCamera | THREE.OrthographicCamera>(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.mouseButtons.LEFT = null;
    controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
    controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;

    const setMiddleMode = (event: PointerEvent) => {
      if (event.button === 1) {
        controls.mouseButtons.MIDDLE = event.shiftKey
          ? THREE.MOUSE.ROTATE
          : THREE.MOUSE.PAN;
      }
    };
    renderer.domElement.addEventListener("pointerdown", setMiddleMode, true);

    scene.add(new THREE.HemisphereLight(0xd7e8ff, 0x34404d, 2.3));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
    keyLight.position.set(-180, -220, 340);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x76b8ff, 0.65);
    fillLight.position.set(220, 120, 160);
    scene.add(fillLight);

    const moveGizmo = createMoveGizmo(scene);
    moveGizmoRef.current = moveGizmo;
    const rotationGizmo = createRotationGizmo(scene);
    rotationGizmoRef.current = rotationGizmo;
    const scaleGizmo = createScaleGizmo(scene);
    scaleGizmoRef.current = scaleGizmo;
    const boxGripSet = createBoxGripSet(scene);
    boxGripSetRef.current = boxGripSet;
    const lineGripSet = createLineGripSet(scene);
    lineGripSetRef.current = lineGripSet;
    const polylineGripSet = createPolylineGripSet(scene);
    polylineGripSetRef.current = polylineGripSet;
    const circleGripSet = createCircleGripSet(scene);
    circleGripSetRef.current = circleGripSet;
    const arcGripSet = createArcGripSet(scene);
    arcGripSetRef.current = arcGripSet;

    documentRef.current.objects.forEach((object) => {
      objectViews.set(object.id, createViewportObject(scene, object.id));
    });
    const lineViews = lineViewsRef.current;
    documentRef.current.lines.forEach((line) => {
      const view = createViewportLine(scene, line.id);
      updateViewportLine(view, line);
      lineViews.set(line.id, view);
    });
    const wallViews = wallViewsRef.current;
    const polylineViews = polylineViewsRef.current;
    documentRef.current.polylines.forEach((polyline) => {
      const view = createViewportPolyline(scene, polyline.id);
      updateViewportPolyline(view, polyline);
      polylineViews.set(polyline.id, view);
    });
    const floorPlatformViews = floorPlatformViewsRef.current;
    const roofPlaneViews = roofPlaneViewsRef.current;
    const roomPlatformViews = roomPlatformViewsRef.current;
    const circleViews = circleViewsRef.current;
    documentRef.current.circles.forEach((circle) => {
      const view = createViewportCircle(scene, circle.id);
      updateViewportCircle(view, circle);
      circleViews.set(circle.id, view);
    });
    const arcViews = arcViewsRef.current;
    documentRef.current.arcs.forEach((arc) => {
      const view = createViewportArc(scene, arc.id);
      updateViewportArc(view, arc);
      arcViews.set(arc.id, view);
    });

    const linePreviewGeometry = new THREE.BufferGeometry();
    const linePreview = new THREE.Line(
      linePreviewGeometry,
      new THREE.LineDashedMaterial({ color: 0xf1bb55, dashSize: 8, gapSize: 4, depthTest: false, toneMapped: false }),
    );
    linePreview.visible = false;
    linePreview.renderOrder = 40;
    scene.add(linePreview);
    const trackingGuideGeometry = new THREE.BufferGeometry();
    const trackingGuide = new THREE.Line(
      trackingGuideGeometry,
      new THREE.LineDashedMaterial({ color: 0x69d89a, dashSize: 5, gapSize: 4, depthTest: false, transparent: true, opacity: 0.72, toneMapped: false }),
    );
    trackingGuide.visible = false;
    trackingGuide.renderOrder = 39;
    scene.add(trackingGuide);
    const snapMarker = new THREE.Mesh(
      new THREE.RingGeometry(2.5, 3.6, 16),
      new THREE.MeshBasicMaterial({ color: 0x69d89a, depthTest: false, side: THREE.DoubleSide, toneMapped: false }),
    );
    snapMarker.visible = false;
    snapMarker.position.z = 0.9;
    snapMarker.renderOrder = 41;
    scene.add(snapMarker);

    type CameraTransition = {
      duration: number;
      fromPosition: THREE.Vector3;
      fromQuaternion: THREE.Quaternion;
      fromTarget: THREE.Vector3;
      startedAt: number;
      toPosition: THREE.Vector3;
      toQuaternion: THREE.Quaternion;
      toTarget: THREE.Vector3;
    };
    let cameraTransition: CameraTransition | null = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const fitView = (requestedTarget = viewTargetRef.current, animate = false) => {
      const activeStoryId = documentRef.current.building.activeStoryId;
      const storyIsIncluded = (storyId: string) => requestedTarget.id !== "top" || storyId === activeStoryId;
      const objects = documentRef.current.objects.filter((object) =>
        findLayer(documentRef.current, object.layerId)?.visible && storyIsIncluded(object.storyId),
      );
      const lines = documentRef.current.lines.filter((line) =>
        findLayer(documentRef.current, line.layerId)?.visible && storyIsIncluded(line.storyId),
      );
      const polylines = documentRef.current.polylines.filter((polyline) =>
        findLayer(documentRef.current, polyline.layerId)?.visible && storyIsIncluded(polyline.storyId),
      );
      const circles = documentRef.current.circles.filter((circle) =>
        findLayer(documentRef.current, circle.layerId)?.visible && storyIsIncluded(circle.storyId),
      );
      const arcs = documentRef.current.arcs.filter((arc) => findLayer(documentRef.current, arc.layerId)?.visible && storyIsIncluded(arc.storyId));
      const roomPlatforms = documentRef.current.rooms
        .map((room) => roomHorizontalPlatformSolution(documentRef.current, room))
        .filter((solution): solution is RoomHorizontalPlatformSolution => solution !== null && storyIsIncluded(solution.storyId));
      const bounds = objects.map(boxWorldBounds);
      const lineXs = lines.flatMap((line) => [line.start.x, line.end.x]);
      const lineYs = lines.flatMap((line) => [line.start.y, line.end.y]);
      const lineZs = lines.flatMap((line) => {
        const vertical = wallVerticalExtent(documentRef.current, line);
        const foundationVertical = foundationWallVerticalExtent(documentRef.current, line);
        return vertical
          ? [vertical.baseElevation, vertical.baseElevation, vertical.topElevation, vertical.topElevation]
          : foundationVertical
            ? [foundationVertical.footingBottomElevation, foundationVertical.sillTopElevation]
          : [line.start.z, line.end.z];
      });
      const polylineXs = polylines.flatMap((polyline) => polyline.vertices.map((point) => point.x));
      const polylineYs = polylines.flatMap((polyline) => polyline.vertices.map((point) => point.y));
      const circleXs = circles.flatMap((circle) => [circle.center.x - circle.radius, circle.center.x + circle.radius]);
      const circleYs = circles.flatMap((circle) => [circle.center.y - circle.radius, circle.center.y + circle.radius]);
      const arcXs = arcs.flatMap((arc) => [arc.center.x - arc.radius, arc.center.x + arc.radius]);
      const arcYs = arcs.flatMap((arc) => [arc.center.y - arc.radius, arc.center.y + arc.radius]);
      const roomXs = roomPlatforms.flatMap((solution) => [solution.boundary, solution.floorBoundary].flatMap((boundary) => boundary.vertices.map((point) => point.x)));
      const roomYs = roomPlatforms.flatMap((solution) => [solution.boundary, solution.floorBoundary].flatMap((boundary) => boundary.vertices.map((point) => point.y)));
      const roomZs = roomPlatforms.flatMap((solution) => [
        solution.roughFloorElevation - assemblyTotalThickness(solution.floorStructure),
        solution.finishedFloorElevation,
        solution.finishedCeilingElevation,
        solution.roughCeilingElevation,
      ]);
      const hasGeometry = Boolean(objects.length || lines.length || polylines.length || circles.length || arcs.length || roomPlatforms.length);
      const min = new THREE.Vector3(
        hasGeometry ? Math.min(...bounds.map((bound) => bound.minimum.x), ...lineXs, ...polylineXs, ...circleXs, ...arcXs, ...roomXs) : -48,
        hasGeometry ? Math.min(...bounds.map((bound) => bound.minimum.y), ...lineYs, ...polylineYs, ...circleYs, ...arcYs, ...roomYs) : -48,
        hasGeometry ? Math.min(...bounds.map((bound) => bound.minimum.z), ...lineZs, ...polylines.map((polyline) => polyline.elevation), ...circles.map((circle) => circle.center.z), ...arcs.map((arc) => arc.center.z), ...roomZs) : 0,
      );
      const max = new THREE.Vector3(
        hasGeometry ? Math.max(...bounds.map((bound) => bound.maximum.x), ...lineXs, ...polylineXs, ...circleXs, ...arcXs, ...roomXs) : 48,
        hasGeometry ? Math.max(...bounds.map((bound) => bound.maximum.y), ...lineYs, ...polylineYs, ...circleYs, ...arcYs, ...roomYs) : 48,
        hasGeometry ? Math.max(...bounds.map((bound) => bound.maximum.z), ...lineZs, ...polylines.map((polyline) => polyline.elevation), ...circles.map((circle) => circle.center.z), ...arcs.map((arc) => arc.center.z), ...roomZs) : 96,
      );
      const size = max.clone().sub(min);
      const maximum = Math.max(size.x, size.y, size.z, 1);
      const center = min.clone().add(max).multiplyScalar(0.5);
      const aspect = Math.max(mount.clientWidth / Math.max(mount.clientHeight, 1), 0.1);
      const viewDirection = new THREE.Vector3(...requestedTarget.direction).normalize();
      const previousCamera = camera;
      const previousPosition = camera.position.clone();
      const previousQuaternion = camera.quaternion.clone();
      const previousTarget = controls.target.clone();
      let targetPosition: THREE.Vector3;
      let targetControlsTarget: THREE.Vector3;
      const placeGrid = (rotation: [number, number, number], position: [number, number, number]) => {
        gridPlacementRef.current = { position, rotation };
        const grid = gridRef.current;
        if (!grid) return;
        grid.rotation.set(...rotation);
        grid.position.set(...position);
      };

      if (requestedTarget.projection === "perspective") {
        camera = perspectiveCamera;
        camera.aspect = aspect;
        camera.up.set(0, 0, 1);
        targetControlsTarget = new THREE.Vector3(center.x, center.y, min.z + size.z * 0.4);
        targetPosition = targetControlsTarget.clone().addScaledVector(viewDirection, maximum * 2.55);
        controls.enableRotate = true;
        controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
        placeGrid([Math.PI / 2, 0, 0], [center.x, center.y, min.z - 0.15]);
      } else {
        camera = orthographicCamera;
        const boundingRadius = Math.max(size.length() / 2, 12);
        const halfHeight = boundingRadius * 1.28 * Math.max(1, 1 / aspect);
        camera.left = -halfHeight * aspect;
        camera.right = halfHeight * aspect;
        camera.top = halfHeight;
        camera.bottom = -halfHeight;
        const distance = maximum * 3 + 240;
        targetControlsTarget = center.clone();
        targetPosition = center.clone().addScaledVector(viewDirection, distance);
        if (Math.abs(viewDirection.z) > 0.95) {
          camera.up.set(0, 1, 0);
        } else {
          camera.up.set(0, 0, 1);
        }
        if (requestedTarget.id === "top" || requestedTarget.id === "bottom") {
          placeGrid([Math.PI / 2, 0, 0], [center.x, center.y, min.z - 0.15]);
        } else if (requestedTarget.id === "front" || requestedTarget.id === "back") {
          placeGrid([0, 0, 0], [center.x, requestedTarget.id === "front" ? min.y - 0.15 : max.y + 0.15, center.z]);
        } else if (requestedTarget.id === "right" || requestedTarget.id === "left") {
          placeGrid([0, 0, -Math.PI / 2], [requestedTarget.id === "right" ? max.x + 0.15 : min.x - 0.15, center.y, center.z]);
        } else {
          placeGrid([Math.PI / 2, 0, 0], [center.x, center.y, min.z - 0.15]);
        }
        controls.enableRotate = false;
        controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
      }
      controls.object = camera;
      camera.position.copy(targetPosition);
      controls.target.copy(targetControlsTarget);
      camera.lookAt(targetControlsTarget);
      const targetQuaternion = camera.quaternion.clone();
      camera.updateProjectionMatrix();
      cameraTransition = null;

      if (animate && !reducedMotion.matches) {
        let fromPosition = previousPosition;
        if (previousCamera !== camera) {
          const previousDirection = previousPosition.clone().sub(previousTarget);
          if (previousDirection.lengthSq() < 0.000001) previousDirection.copy(viewDirection);
          fromPosition = previousTarget.clone().addScaledVector(
            previousDirection.normalize(),
            targetPosition.distanceTo(targetControlsTarget),
          );
        }
        camera.position.copy(fromPosition);
        camera.quaternion.copy(previousQuaternion);
        controls.target.copy(previousTarget);
        controls.enabled = false;
        cameraTransition = {
          duration: 440,
          fromPosition,
          fromQuaternion: previousQuaternion,
          fromTarget: previousTarget,
          startedAt: performance.now(),
          toPosition: targetPosition,
          toQuaternion: targetQuaternion,
          toTarget: targetControlsTarget,
        };
      } else {
        controls.enabled = true;
        controls.update();
      }
    };
    fitViewRef.current = () => fitView();
    applyViewRef.current = (target) => fitView(target, true);
    fitView(viewTargetRef.current);
    const worldUp = new THREE.Vector3(0, 0, 1);
    cubeOrbitRef.current = {
      start: () => {
        cameraTransition = null;
        if (!(camera instanceof THREE.PerspectiveCamera)) {
          const currentDirection = camera.position.clone().sub(controls.target).normalize();
          if (Math.abs(currentDirection.dot(worldUp)) > 0.995) {
            currentDirection.y = currentDirection.z > 0 ? -0.06 : 0.06;
            currentDirection.normalize();
          }
          fitView({
            direction: [currentDirection.x, currentDirection.y, currentDirection.z],
            id: "orbit",
            label: "Perspective",
            projection: "perspective",
          });
        }
        controls.enabled = false;
      },
      move: (deltaX, deltaY) => {
        const offset = camera.position.clone().sub(controls.target);
        offset.applyAxisAngle(worldUp, -deltaX * 0.009);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
        const pitchedOffset = offset.clone().applyAxisAngle(right, -deltaY * 0.009);
        if (Math.abs(pitchedOffset.clone().normalize().dot(worldUp)) < 0.992) {
          offset.copy(pitchedOffset);
        }
        camera.position.copy(controls.target).add(offset);
        camera.up.copy(worldUp);
        camera.lookAt(controls.target);
        camera.updateMatrixWorld();
      },
      end: () => {
        controls.enabled = true;
        controls.update();
        const direction = camera.position.clone().sub(controls.target).normalize();
        skipNextViewApplyRef.current = true;
        onViewChangeRef.current({
          direction: [direction.x, direction.y, direction.z],
          id: "orbit",
          label: "Perspective",
          projection: "perspective",
        });
      },
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const setPointer = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
    };

    type ActiveDrag = {
      active: boolean;
      axis: THREE.Vector3;
      axisKey: AxisKey;
      before: ModelDocument;
      faceIndex: number | null;
      grip: BoxGripDefinition | null;
      kind: "arc-grip" | "circle-grip" | "copy" | "face" | "grip" | "line-grip" | "object" | "plan-move" | "polyline-grip" | "rotate" | "scale";
      lastValid: ModelDocument;
      lineGrip?: "start" | "midpoint" | "end";
      circleGrip?: CircleGrip;
      arcGrip?: ArcGrip;
      polylineGrip?: RectangleGrip;
      polylineVertex?: number;
      objectId: string;
      plane: THREE.Plane;
      pointerId: number;
      rotationBase?: THREE.Vector3;
      scaleBase?: THREE.Vector3;
      scaleStartDistance?: number;
      sign: 1 | -1;
      startAngle?: number;
      startClientX: number;
      startClientY: number;
      startPoint: THREE.Vector3;
    };
    type ActiveSelectionDrag = {
      active: boolean;
      additive: boolean;
      current: ScreenPoint;
      pointerId: number;
      purpose: "selection" | "stretch";
      start: ScreenPoint;
    };
    let drag: ActiveDrag | null = null;
    let selectionDrag: ActiveSelectionDrag | null = null;
    let hoveredGripHandle: THREE.Mesh | null = null;

    const projectPoint = (point: LinePoint): ScreenPoint => {
      const bounds = renderer.domElement.getBoundingClientRect();
      const projected = new THREE.Vector3(point.x, point.y, point.z).project(camera);
      return {
        x: (projected.x + 1) * bounds.width / 2,
        y: (1 - projected.y) * bounds.height / 2,
      };
    };

    const pathSelectionGeometry = (
      ref: CadEntityRef,
      worldPoints: LinePoint[],
      closed = false,
      explicitSegments?: Array<[LinePoint, LinePoint]>,
    ): ScreenSelectionGeometry => {
      const points = worldPoints.map(projectPoint);
      const segments = explicitSegments
        ? explicitSegments.map(([start, end]) => ({ start: projectPoint(start), end: projectPoint(end) }))
        : points.slice(1).map((end, index) => ({ start: points[index], end }));
      if (closed && points.length > 2) segments.push({ start: points.at(-1)!, end: points[0] });
      return { points, ref, segments };
    };

    const screenSelectionGeometries = (): ScreenSelectionGeometry[] => {
      const current = documentRef.current;
      const visible = (layerId: string, storyId: string) => Boolean(findLayer(current, layerId)?.visible) && (viewTargetRef.current.id !== "top" || storyId === current.building.activeStoryId);
      const geometries: ScreenSelectionGeometry[] = [];
      current.lines.filter((line) => visible(line.layerId, line.storyId)).forEach((line) => {
        geometries.push(pathSelectionGeometry({ id: line.id, kind: "line" }, [line.start, line.end]));
      });
      current.polylines.filter((polyline) => visible(polyline.layerId, polyline.storyId)).forEach((polyline) => {
        geometries.push(pathSelectionGeometry(
          { id: polyline.id, kind: "polyline" },
          polylinePathPoints(polyline).map((point) => ({ ...point, z: polyline.elevation })),
          false,
        ));
      });
      current.circles.filter((circle) => visible(circle.layerId, circle.storyId)).forEach((circle) => {
        const points = Array.from({ length: 49 }, (_, index) => {
          const angle = index / 48 * Math.PI * 2;
          return {
            x: circle.center.x + Math.cos(angle) * circle.radius,
            y: circle.center.y + Math.sin(angle) * circle.radius,
            z: circle.center.z,
          };
        });
        geometries.push(pathSelectionGeometry({ id: circle.id, kind: "circle" }, points));
      });
      current.arcs.filter((arc) => visible(arc.layerId, arc.storyId)).forEach((arc) => {
        const points = Array.from({ length: 49 }, (_, index) => arcPointAtFraction(arc, index / 48));
        geometries.push(pathSelectionGeometry({ id: arc.id, kind: "arc" }, points));
      });
      current.objects.filter((object) => visible(object.layerId, object.storyId)).forEach((object) => {
        const corners = [
          boxWorldPoint(object, 0, 0, 0), boxWorldPoint(object, 1, 0, 0),
          boxWorldPoint(object, 1, 1, 0), boxWorldPoint(object, 0, 1, 0),
          boxWorldPoint(object, 0, 0, 1), boxWorldPoint(object, 1, 0, 1),
          boxWorldPoint(object, 1, 1, 1), boxWorldPoint(object, 0, 1, 1),
        ];
        const edgeIndexes = [
          [0, 1], [1, 2], [2, 3], [3, 0],
          [4, 5], [5, 6], [6, 7], [7, 4],
          [0, 4], [1, 5], [2, 6], [3, 7],
        ] as const;
        geometries.push(pathSelectionGeometry(
          { id: object.id, kind: "box" },
          corners,
          false,
          edgeIndexes.map(([start, end]) => [corners[start], corners[end]]),
        ));
      });
      return geometries;
    };

    const screenStretchGeometries = (): ScreenStretchGeometry[] => {
      const current = documentRef.current;
      return screenSelectionGeometries().map((geometry) => {
        if (geometry.ref.kind === "line") {
          const line = findLineObject(current, geometry.ref.id);
          return {
            ...geometry,
            handles: line ? [
              { component: 0, point: projectPoint(line.start) },
              { component: 1, point: projectPoint(line.end) },
            ] : [],
          };
        }
        if (geometry.ref.kind === "polyline") {
          const polyline = findPolylineObject(current, geometry.ref.id);
          return {
            ...geometry,
            handles: polyline ? polyline.vertices.map((point, component) => ({
              component,
              point: projectPoint({ ...point, z: polyline.elevation }),
            })) : [],
          };
        }
        return { ...geometry, handles: [] };
      });
    };

    type EntityHitCandidate = {
      distance: number;
      faceIndex: number | null;
      point: THREE.Vector3 | null;
      ref: CadEntityRef;
    };

    const entityDisplayName = (ref: CadEntityRef): string => {
      const current = documentRef.current;
      if (ref.kind === "box") return findBoxObject(current, ref.id)?.name ?? "Box";
      if (ref.kind === "line") return findLineObject(current, ref.id)?.name ?? "Line";
      if (ref.kind === "polyline") return findPolylineObject(current, ref.id)?.name ?? "Polyline";
      if (ref.kind === "circle") return findCircleObject(current, ref.id)?.name ?? "Circle";
      return findArcObject(current, ref.id)?.name ?? "Arc";
    };

    const entityHitCandidates = (): EntityHitCandidate[] => {
      const current = documentRef.current;
      const candidates = new Map<string, EntityHitCandidate>();
      const visible = (ref: CadEntityRef) => {
        const entity = ref.kind === "box" ? findBoxObject(current, ref.id)
          : ref.kind === "line" ? findLineObject(current, ref.id)
          : ref.kind === "polyline" ? findPolylineObject(current, ref.id)
          : ref.kind === "circle" ? findCircleObject(current, ref.id)
          : findArcObject(current, ref.id);
        return Boolean(entity && findLayer(current, entity.layerId)?.visible && (viewTargetRef.current.id !== "top" || entity.storyId === current.building.activeStoryId));
      };
      const register = (candidate: EntityHitCandidate) => {
        if (!visible(candidate.ref)) return;
        const key = cadEntityKey(candidate.ref);
        const existing = candidates.get(key);
        if (!existing || candidate.distance < existing.distance) candidates.set(key, candidate);
      };
      raycaster.intersectObjects([...lineViews.values()].map((view) => view.line), false).forEach((hit) => {
        const id = hit.object.userData.lineId;
        if (typeof id === "string") register({ distance: hit.distance, faceIndex: null, point: hit.point, ref: { id, kind: "line" } });
      });
      raycaster.intersectObjects([...wallViewsRef.current.values()].flatMap((view) => [...view.meshes, ...view.productMeshes]), false).forEach((hit) => {
        const id = hit.object.userData.lineId;
        if (typeof id === "string") register({ distance: hit.distance, faceIndex: null, point: hit.point, ref: { id, kind: "line" } });
      });
      raycaster.intersectObjects([...polylineViews.values()].flatMap((view) => view.fill ? [view.line, view.fill] : [view.line]), false).forEach((hit) => {
        const id = hit.object.userData.polylineId;
        if (typeof id === "string") register({ distance: hit.distance, faceIndex: null, point: hit.point, ref: { id, kind: "polyline" } });
      });
      raycaster.intersectObjects([...floorPlatformViewsRef.current.values()].flatMap((view) => view.meshes), false).forEach((hit) => {
        const id = hit.object.userData.polylineId;
        if (typeof id === "string") register({ distance: hit.distance, faceIndex: null, point: hit.point, ref: { id, kind: "polyline" } });
      });
      raycaster.intersectObjects([...roofPlaneViewsRef.current.values()].flatMap((view) => view.meshes), false).forEach((hit) => {
        const id = hit.object.userData.polylineId;
        if (typeof id === "string") register({ distance: hit.distance, faceIndex: null, point: hit.point, ref: { id, kind: "polyline" } });
      });
      raycaster.intersectObjects([...circleViews.values()].map((view) => view.line), false).forEach((hit) => {
        const id = hit.object.userData.circleId;
        if (typeof id === "string") register({ distance: hit.distance, faceIndex: null, point: hit.point, ref: { id, kind: "circle" } });
      });
      raycaster.intersectObjects([...arcViews.values()].map((view) => view.line), false).forEach((hit) => {
        const id = hit.object.userData.arcId;
        if (typeof id === "string") register({ distance: hit.distance, faceIndex: null, point: hit.point, ref: { id, kind: "arc" } });
      });
      raycaster.intersectObjects([...objectViews.values()].map((view) => view.mesh), false).forEach((hit) => {
        const id = hit.object.userData.objectId;
        if (typeof id === "string") register({ distance: hit.distance, faceIndex: hit.face?.materialIndex ?? null, point: hit.point, ref: { id, kind: "box" } });
      });
      const priority: Record<CadEntityRef["kind"], number> = { arc: 0, circle: 0, line: 0, polyline: 0, box: 1 };
      return [...candidates.values()].sort((a, b) => priority[a.ref.kind] - priority[b.ref.kind] || a.distance - b.distance || cadEntityKey(a.ref).localeCompare(cadEntityKey(b.ref)));
    };

    let selectionCycleState: SelectionCycleState | null = null;
    let selectionCycleCandidates: EntityHitCandidate[] = [];
    let lastDrawingPointerEvent: PointerEvent | null = null;

    const selectHitCandidate = (candidate: EntityHitCandidate, additive: boolean, includeFace = true) => {
      const { ref } = candidate;
      if (ref.kind === "line") callbacksRef.current.onLineSelect(ref.id, additive);
      else if (ref.kind === "polyline") callbacksRef.current.onPolylineSelect(ref.id, additive);
      else if (ref.kind === "circle") callbacksRef.current.onCircleSelect(ref.id, additive);
      else if (ref.kind === "arc") callbacksRef.current.onArcSelect(ref.id, additive);
      else {
        const object = findBoxObject(documentRef.current, ref.id);
        const layer = findLayer(documentRef.current, object?.layerId ?? null);
        callbacksRef.current.onFaceSelect(
          ref.id,
          includeFace && !layer?.locked && !object?.locked && !breakModeRef.current && !chamferModeRef.current && !copyModeRef.current && !extendModeRef.current && !filletModeRef.current && !mirrorModeRef.current && !offsetModeRef.current && !rotateModeRef.current && !scaleModeRef.current && !stretchModeRef.current && !trimModeRef.current
            ? candidate.faceIndex
            : null,
          additive,
        );
      }
    };

    const showSelectionCycle = (candidates: EntityHitCandidate[], index: number, point: ScreenPoint) => {
      const candidate = candidates[index];
      if (!candidate || candidates.length < 2) {
        setSelectionCycle(null);
        return;
      }
      const bounds = renderer.domElement.getBoundingClientRect();
      setSelectionCycle({
        count: candidates.length,
        index,
        label: entityDisplayName(candidate.ref),
        x: Math.min(point.x + 14, Math.max(bounds.width - 180, 8)),
        y: Math.min(point.y + 14, Math.max(bounds.height - 62, 8)),
      });
    };

    const setHoveredGrip = (nextHandle: THREE.Mesh | null) => {
      if (hoveredGripHandle === nextHandle) return;
      if (hoveredGripHandle) {
        const previousGrip = hoveredGripHandle.userData.boxGrip as BoxGripDefinition | undefined;
        (hoveredGripHandle.material as THREE.MeshBasicMaterial).color.setHex(
          previousGrip ? GRIP_COLORS[previousGrip.kind] : 0x71d49a,
        );
      }
      hoveredGripHandle = nextHandle;
      if (hoveredGripHandle) {
        (hoveredGripHandle.material as THREE.MeshBasicMaterial).color.setHex(0xffc65c);
      }
      renderer.domElement.style.cursor = hoveredGripHandle ? "crosshair" : "default";
    };

    const createDragPlane = (axis: THREE.Vector3, point: THREE.Vector3) => {
      const viewDirection = camera.getWorldDirection(new THREE.Vector3());
      const planeNormal = viewDirection
        .clone()
        .sub(axis.clone().multiplyScalar(viewDirection.dot(axis)));
      if (planeNormal.lengthSq() < 0.000001) {
        planeNormal.copy(axis.z ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1));
      }
      planeNormal.normalize();
      return new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, point);
    };

    const planPointFromPointer = (elevation = 0): LinePoint | null => {
      const hit = raycaster.ray.intersectPlane(
        new THREE.Plane(new THREE.Vector3(0, 0, 1), -elevation),
        new THREE.Vector3(),
      );
      return hit ? { x: hit.x, y: hit.y, z: elevation } : null;
    };

    const snapCadPoint = (
      point: LinePoint,
      excludedLineId: string | null = null,
      anchor: LinePoint | null = null,
      useTracking = false,
      consumeOverride = false,
    ) => {
      const effectiveObjectSnapModes = objectSnapOverrideRef.current
        ? [objectSnapOverrideRef.current]
        : objectSnapModesRef.current;
      const candidates: CadSnapCandidate[] = [];
      const segments: LineGeometry[] = [];
      const circulars: CircularSnapGeometry[] = [];
      documentRef.current.lines.forEach((line) => {
        if (line.id === excludedLineId || !findLayer(documentRef.current, line.layerId)?.visible) return;
        candidates.push(
          { kind: "endpoint", point: line.start },
          { kind: "midpoint", point: lineMidpoint(line) },
          { kind: "endpoint", point: line.end },
        );
        segments.push({ start: line.start, end: line.end });
      });
      documentRef.current.polylines.forEach((polyline) => {
        if (polyline.id === excludedLineId || !findLayer(documentRef.current, polyline.layerId)?.visible) return;
        candidates.push(...polyline.vertices.map((vertex) => ({ kind: "endpoint" as const, point: { ...vertex, z: polyline.elevation } })));
        const centroid = polylineCentroid(polyline);
        if (centroid) candidates.push({ kind: "geometric-center", point: { ...centroid, z: polyline.elevation } });
        polylineSegments(polyline).forEach((segment) => {
          const sampled = polylineSegmentPoints(segment);
          const midpoint = sampled[Math.floor(sampled.length / 2)];
          candidates.push({ kind: "midpoint", point: { ...midpoint, z: polyline.elevation } });
          sampled.slice(1).forEach((end, index) => segments.push({
            start: { ...sampled[index], z: polyline.elevation },
            end: { ...end, z: polyline.elevation },
          }));
        });
      });
      documentRef.current.circles.forEach((circle) => {
        if (circle.id === excludedLineId || !findLayer(documentRef.current, circle.layerId)?.visible) return;
        const curve: CircularSnapGeometry = { center: circle.center, radius: circle.radius };
        circulars.push(curve);
        candidates.push(
          { kind: "center", point: circle.center },
          ...circularQuadrantPoints(curve).map((point) => ({ kind: "quadrant" as const, point })),
        );
      });
      documentRef.current.arcs.forEach((arc) => {
        if (arc.id === excludedLineId || !findLayer(documentRef.current, arc.layerId)?.visible) return;
        const grips = arcGripPoints(arc);
        const curve: CircularSnapGeometry = { center: arc.center, counterclockwise: arc.counterclockwise, endAngle: arc.endAngle, radius: arc.radius, startAngle: arc.startAngle };
        circulars.push(curve);
        candidates.push(
          { kind: "center", point: arc.center },
          { kind: "endpoint", point: grips.find(({ grip }) => grip === "start")!.point },
          { kind: "midpoint", point: grips.find(({ grip }) => grip === "midpoint")!.point },
          { kind: "endpoint", point: grips.find(({ grip }) => grip === "end")!.point },
          ...circularQuadrantPoints(curve).map((point) => ({ kind: "quadrant" as const, point })),
        );
      });
      documentRef.current.objects.forEach((object) => {
        if (!findLayer(documentRef.current, object.layerId)?.visible) return;
        const corners = [
          boxWorldPoint(object, 0, 0, 0),
          boxWorldPoint(object, 1, 0, 0),
          boxWorldPoint(object, 1, 1, 0),
          boxWorldPoint(object, 0, 1, 0),
        ];
        candidates.push(...corners.map((corner) => ({ kind: "corner" as const, point: corner })));
        candidates.push({ kind: "geometric-center", point: boxWorldPoint(object, 0.5, 0.5, 0) });
        corners.forEach((corner, index) => {
          const end = corners[(index + 1) % corners.length];
          candidates.push({ kind: "midpoint", point: lineMidpoint({ start: corner, end }) });
          segments.push({ start: corner, end });
        });
      });
      const nearbySegments = segments.filter((segment) => {
        const minimumX = Math.min(segment.start.x, segment.end.x) - 6;
        const maximumX = Math.max(segment.start.x, segment.end.x) + 6;
        const minimumY = Math.min(segment.start.y, segment.end.y) - 6;
        const maximumY = Math.max(segment.start.y, segment.end.y) + 6;
        if (point.x >= minimumX && point.x <= maximumX && point.y >= minimumY && point.y <= maximumY) return true;
        if (anchor && effectiveObjectSnapModes.includes("parallel")) return true;
        if (!effectiveObjectSnapModes.includes("extension")) return false;
        const dx = segment.end.x - segment.start.x;
        const dy = segment.end.y - segment.start.y;
        const length = Math.hypot(dx, dy);
        return length >= 1 / 16 && Math.abs((point.x - segment.start.x) * dy - (point.y - segment.start.y) * dx) / length <= 6;
      });
      candidates.push(...derivedSnapCandidates({ anchor, circulars, modes: effectiveObjectSnapModes, pointer: point, segments: nearbySegments }));
      const previousCyclePointer = objectSnapCyclePointerRef.current;
      if (!previousCyclePointer || planarDistance(previousCyclePointer, point) > 2) objectSnapCycleIndexRef.current = 0;
      objectSnapCyclePointerRef.current = point;
      const acquired = acquireCadPoint({
        anchor,
        candidates,
        gridIncrement: snapIncrementRef.current,
        objectSnapCycleIndex: objectSnapCycleIndexRef.current,
        objectSnapEnabled: objectSnapEnabledRef.current || Boolean(objectSnapOverrideRef.current),
        objectSnapModes: effectiveObjectSnapModes,
        orthoEnabled: useTracking && orthoEnabledRef.current,
        pointer: point,
        polarAngles: lineSnapAnglesRef.current,
        polarEnabled: useTracking && polarEnabledRef.current,
        trackingCandidates: trackingCandidatesFromAcquiredPoints({
          acquiredPoints: acquiredTrackingPointsRef.current,
          angles: lineSnapAnglesRef.current,
          gridIncrement: snapIncrementRef.current,
          pointer: point,
        }),
      });
      objectSnapCycleCountRef.current = acquired.candidateCount;
      const objectSnapped = !["grid", "ortho", "polar", "tracking"].includes(acquired.snapKind);
      if (objectSnapped) {
        const hoverKey = `${acquired.snapKind}:${acquired.point.x}:${acquired.point.y}:${acquired.point.z}`;
        const now = performance.now();
        if (objectSnapHoverRef.current?.key === hoverKey) {
          if (now - objectSnapHoverRef.current.since >= 400 && !acquiredTrackingPointsRef.current.some((candidate) => planarDistance(candidate, acquired.point) < 1 / 16)) {
            acquiredTrackingPointsRef.current = [...acquiredTrackingPointsRef.current.slice(-3), acquired.point];
          }
        } else {
          objectSnapHoverRef.current = { key: hoverKey, since: now };
          if (objectSnapAcquisitionTimerRef.current !== null) window.clearTimeout(objectSnapAcquisitionTimerRef.current);
          objectSnapAcquisitionTimerRef.current = window.setTimeout(() => {
            if (objectSnapHoverRef.current?.key !== hoverKey) return;
            if (!acquiredTrackingPointsRef.current.some((candidate) => planarDistance(candidate, acquired.point) < 1 / 16)) {
              acquiredTrackingPointsRef.current = [...acquiredTrackingPointsRef.current.slice(-3), acquired.point];
            }
          }, 400);
        }
      } else {
        objectSnapHoverRef.current = null;
        if (objectSnapAcquisitionTimerRef.current !== null) window.clearTimeout(objectSnapAcquisitionTimerRef.current);
        objectSnapAcquisitionTimerRef.current = null;
      }
      if (consumeOverride) {
        acquiredTrackingPointsRef.current = [];
        objectSnapHoverRef.current = null;
        objectSnapCycleIndexRef.current = 0;
        objectSnapCycleCountRef.current = 0;
        if (objectSnapAcquisitionTimerRef.current !== null) window.clearTimeout(objectSnapAcquisitionTimerRef.current);
        objectSnapAcquisitionTimerRef.current = null;
        if (objectSnapOverrideRef.current) callbacksRef.current.onObjectSnapOverrideConsumed();
      }
      return {
        candidateCount: acquired.candidateCount,
        guideOrigin: acquired.guideOrigin,
        point: acquired.point,
        polarAngle: acquired.guideAngle,
        snapKind: acquired.snapKind,
        snapped: objectSnapped,
      };
    };

    const pickCircleTangentConstraint = (point: LinePoint): PickedCircleTangentConstraint | null => {
      const choices: Array<PickedCircleTangentConstraint & { distance: number }> = [];
      const addLineChoice = (key: string, start: LinePoint, end: LinePoint) => {
        if (Math.abs(start.z - end.z) >= 1 / 16 || Math.abs(start.z - point.z) >= 1 / 16) return;
        const pick = nearestPointOnSegment(point, { start, end });
        choices.push({ key, constraint: { end, kind: "line", pick, start }, distance: planarDistance(point, pick) });
      };
      const addCircleChoice = (key: string, curve: CircularSnapGeometry) => {
        if (Math.abs(curve.center.z - point.z) >= 1 / 16) return;
        const pick = nearestPointOnCircularCurve(point, curve);
        choices.push({
          key,
          constraint: { center: curve.center, counterclockwise: curve.counterclockwise, endAngle: curve.endAngle, kind: "circle", pick, radius: curve.radius, startAngle: curve.startAngle },
          distance: planarDistance(point, pick),
        });
      };
      documentRef.current.lines.forEach((line) => {
        if (findLayer(documentRef.current, line.layerId)?.visible) addLineChoice(`line:${line.id}`, line.start, line.end);
      });
      documentRef.current.polylines.forEach((polyline) => {
        if (!findLayer(documentRef.current, polyline.layerId)?.visible) return;
        polylineSegments(polyline).forEach((segment, index) => {
          const circular = polylineSegmentCircularGeometry(segment);
          if (circular) addCircleChoice(`polyline:${polyline.id}:${index}`, { ...circular, center: { ...circular.center, z: polyline.elevation } });
          else addLineChoice(`polyline:${polyline.id}:${index}`, { ...segment.start, z: polyline.elevation }, { ...segment.end, z: polyline.elevation });
        });
      });
      documentRef.current.circles.forEach((circle) => {
        if (findLayer(documentRef.current, circle.layerId)?.visible) addCircleChoice(`circle:${circle.id}`, { center: circle.center, radius: circle.radius });
      });
      documentRef.current.arcs.forEach((arc) => {
        if (findLayer(documentRef.current, arc.layerId)?.visible) addCircleChoice(`arc:${arc.id}`, { center: arc.center, counterclockwise: arc.counterclockwise, endAngle: arc.endAngle, radius: arc.radius, startAngle: arc.startAngle });
      });
      documentRef.current.objects.forEach((object) => {
        if (!findLayer(documentRef.current, object.layerId)?.visible) return;
        const corners = [boxWorldPoint(object, 0, 0, 0), boxWorldPoint(object, 1, 0, 0), boxWorldPoint(object, 1, 1, 0), boxWorldPoint(object, 0, 1, 0)];
        corners.forEach((corner, index) => addLineChoice(`box:${object.id}:${index}`, corner, corners[(index + 1) % 4]));
      });
      return choices.filter((choice) => choice.distance <= 4).sort((a, b) => a.distance - b.distance)[0] ?? null;
    };

    const snapLineCandidate = (point: LinePoint, consumeOverride = false) => {
      return snapCadPoint(point, null, lineStartRef.current, true, consumeOverride);
    };

    const selectedModifyRefs = () => selectedEntityKeysRef.current
      .map(cadEntityRefFromKey)
      .filter((ref): ref is CadEntityRef => ref !== null);

    const selectedOffsetRef = () => {
      const refs = selectedModifyRefs();
      return refs.length === 1 && refs[0].kind !== "box" ? refs[0] : null;
    };

    const selectedLengthenRef = () => {
      const ref = selectedOffsetRef();
      if (!ref || (ref.kind !== "line" && ref.kind !== "arc" && ref.kind !== "polyline")) return null;
      if (ref.kind === "polyline" && findPolylineObject(documentRef.current, ref.id)?.closed) return null;
      return modelEntityIsEditable(documentRef.current, ref) ? ref : null;
    };

    const lengthenRequest = (point: LinePoint | null = null): LengthenRequest | null => {
      const method = lengthenMethodRef.current;
      if (method === "dynamic") return point ? { method, point } : null;
      return { method, value: lengthenValueRef.current };
    };

    const selectedOffsetElevation = (ref: CadEntityRef, sourceDocument = documentRef.current) => {
      if (ref.kind === "line") return findLineObject(sourceDocument, ref.id)?.start.z ?? activeElevationRef.current;
      if (ref.kind === "polyline") return findPolylineObject(sourceDocument, ref.id)?.elevation ?? activeElevationRef.current;
      if (ref.kind === "circle") return findCircleObject(sourceDocument, ref.id)?.center.z ?? activeElevationRef.current;
      if (ref.kind === "arc") return findArcObject(sourceDocument, ref.id)?.center.z ?? activeElevationRef.current;
      return activeElevationRef.current;
    };

    const previewTrimExtend = (before: ModelDocument, ref: CadEntityRef, point: LinePoint) => {
      if (trimModeRef.current) return trimModelEntity(before, ref, point);
      const result = extendModelEntity(before, ref, point);
      return result ? { document: result.document, refs: [result.ref] } : null;
    };

    const clearModifyPreview = () => {
      modifyBaseRef.current = null;
      modifyBeforeRef.current = null;
      linePreview.visible = false;
      trackingGuide.visible = false;
      snapMarker.visible = false;
      setDynamicLineInput(null);
      callbacksRef.current.onDragStatus(null);
    };

    const updateTrackingGuide = (start: LinePoint, point: LinePoint, snapKind: CadSnapKind, guideOrigin: LinePoint | null = null) => {
      if (snapKind !== "polar" && snapKind !== "ortho" && snapKind !== "tracking") {
        trackingGuide.visible = false;
        return;
      }
      const origin = snapKind === "tracking" && guideOrigin ? guideOrigin : start;
      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      const horizontalLength = Math.hypot(dx, dy);
      if (horizontalLength < 1 / 16) {
        trackingGuide.visible = false;
        return;
      }
      const extension = Math.max(horizontalLength + 96, 192);
      const end = {
        x: origin.x + dx / horizontalLength * extension,
        y: origin.y + dy / horizontalLength * extension,
        z: point.z,
      };
      trackingGuideGeometry.setFromPoints([
        new THREE.Vector3(origin.x, origin.y, origin.z + 0.55),
        new THREE.Vector3(end.x, end.y, end.z + 0.55),
      ]);
      trackingGuideGeometry.computeBoundingSphere();
      trackingGuide.computeLineDistances();
      trackingGuide.visible = true;
    };

    const selectAndPrepareDrag = (event: PointerEvent) => {
      if (event.button !== 0) return;
      setActiveGripInput(null);
      setGripDraft("");
      setGripInputError("");
      callbacksRef.current.onDragStatus(null);
      setPointer(event);
      if (boundaryModeRef.current) {
        const before = cloneDocument(documentRef.current);
        const point = planPointFromPointer(activeElevationRef.current);
        const result = point ? createBoundaryPolylineObject(before, point, activeElevationRef.current) : null;
        if (!result) {
          callbacksRef.current.onLineCommandFeedback({ message: "No closed visible area was found here at the active elevation. Check for gaps or a locked current layer.", tone: "error" });
          return;
        }
        linePreview.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onBoundaryCommit(before, result.document, result.polyline.id);
        callbacksRef.current.onBoundaryFinishRequested(false);
        callbacksRef.current.onLineCommandFeedback({ message: "Boundary created as one closed Polyline.", tone: "success" });
        return;
      }
      if (lengthenModeRef.current) {
        const ref = selectedLengthenRef();
        if (!ref) {
          callbacksRef.current.onLineCommandFeedback({ message: "Lengthen needs one editable Line, Arc, or open Polyline.", tone: "error" });
          return;
        }
        const before = lengthenBeforeRef.current ?? cloneDocument(documentRef.current);
        const activeEndpoint = lengthenEndpointRef.current;
        if (lengthenMethodRef.current === "dynamic" && activeEndpoint) {
          const rawPoint = planPointFromPointer(selectedOffsetElevation(ref, before));
          if (!rawPoint) return;
          const snapped = snapCadPoint(rawPoint, null, null, false);
          const request = lengthenRequest(snapped.point);
          const result = request ? lengthenModelEntity(before, ref, activeEndpoint, request) : null;
          if (!result) {
            callbacksRef.current.onLineCommandFeedback({ message: "That cursor position does not leave a valid curve. Choose another point.", tone: "error" });
            return;
          }
          lengthenBeforeRef.current = null;
          lengthenEndpointRef.current = null;
          snapMarker.visible = false;
          setDynamicLineInput(null);
          callbacksRef.current.onDragStatus(null);
          callbacksRef.current.onLengthenCommit(before, result.document, result.ref, activeEndpoint);
          callbacksRef.current.onLengthenFinishRequested(false);
          callbacksRef.current.onLineCommandFeedback({ message: "Dynamic Lengthen complete.", tone: "success" });
          return;
        }

        const candidate = entityHitCandidates().find(({ ref: candidateRef }) => candidateRef.kind === ref.kind && candidateRef.id === ref.id);
        const endpoints = modelEntityLengthenEndpoints(before, ref);
        if (!candidate?.point || !endpoints) {
          callbacksRef.current.onLineCommandFeedback({ message: "Pick near the endpoint of the selected curve.", tone: "error" });
          return;
        }
        const pick = { ...candidate.point, z: selectedOffsetElevation(ref, before) };
        const endpoint = closestLengthenEndpoint(endpoints.start, endpoints.end, pick);
        if (lengthenMethodRef.current === "dynamic") {
          lengthenBeforeRef.current = before;
          lengthenEndpointRef.current = endpoint;
          callbacksRef.current.onLineCommandFeedback({ message: `${endpoint === "start" ? "Start" : "End"} endpoint accepted. Move the cursor and click its new position.`, tone: "success" });
          return;
        }
        const request = lengthenRequest();
        const result = request ? lengthenModelEntity(before, ref, endpoint, request) : null;
        if (!result) {
          callbacksRef.current.onDragPreview(before);
          callbacksRef.current.onLineCommandFeedback({ message: "That Lengthen value would collapse or invalidate the curve. Change the method value and try again.", tone: "error" });
          return;
        }
        lengthenBeforeRef.current = null;
        lengthenEndpointRef.current = null;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onLengthenCommit(before, result.document, result.ref, endpoint);
        callbacksRef.current.onLengthenFinishRequested(false);
        callbacksRef.current.onLineCommandFeedback({ message: "Lengthen complete.", tone: "success" });
        return;
      }
      if (breakModeRef.current) {
        const mode = breakModeRef.current;
        const target = breakTargetRef.current;
        if (!target) {
          const candidate = entityHitCandidates().find(({ ref }) => {
            if (ref.kind === "box" || !modelEntityIsEditable(documentRef.current, ref)) return false;
            if (mode === "break-at-point" && ref.kind === "circle") return false;
            if (mode === "break-at-point" && ref.kind === "polyline") return !findPolylineObject(documentRef.current, ref.id)?.closed;
            return true;
          });
          if (!candidate || candidate.ref.kind === "box") {
            callbacksRef.current.onLineCommandFeedback({ message: mode === "break" ? "Select an editable Line, Polyline, Circle, or Arc." : "Break at Point needs an open Line, Polyline, or Arc.", tone: "error" });
            return;
          }
          breakBeforeRef.current = cloneDocument(documentRef.current);
          breakTargetRef.current = candidate.ref;
          breakFirstPointRef.current = null;
          if (candidate.ref.kind === "line") callbacksRef.current.onLineSelect(candidate.ref.id, false);
          else if (candidate.ref.kind === "polyline") callbacksRef.current.onPolylineSelect(candidate.ref.id, false);
          else if (candidate.ref.kind === "circle") callbacksRef.current.onCircleSelect(candidate.ref.id, false);
          else callbacksRef.current.onArcSelect(candidate.ref.id, false);
          callbacksRef.current.onBreakStageChange(1);
          callbacksRef.current.onLineCommandFeedback({ message: `${mode === "break" ? "Curve" : "Open curve"} accepted. Select the ${mode === "break" ? "first break point" : "break point"}.`, tone: "success" });
          return;
        }
        const candidate = entityHitCandidates().find(({ ref }) => ref.kind === target.kind && ref.id === target.id);
        if (!candidate?.point) {
          callbacksRef.current.onLineCommandFeedback({ message: "Pick a point directly on the selected curve.", tone: "error" });
          return;
        }
        const point = { ...candidate.point, z: selectedOffsetElevation(target, breakBeforeRef.current ?? documentRef.current) };
        if (mode === "break" && !breakFirstPointRef.current) {
          breakFirstPointRef.current = point;
          callbacksRef.current.onBreakStageChange(2);
          callbacksRef.current.onLineCommandFeedback({ message: "First break point accepted. Select the second break point; the portion between the points will be removed.", tone: "success" });
          return;
        }
        const before = breakBeforeRef.current ?? cloneDocument(documentRef.current);
        const result = breakModelEntity(before, target, breakFirstPointRef.current ?? point, mode === "break" ? point : null);
        if (!result) {
          callbacksRef.current.onDragPreview(before);
          callbacksRef.current.onLineCommandFeedback({ message: mode === "break" ? "Those points do not leave valid curve geometry. Choose different points." : "That point cannot split this curve. Pick an interior point.", tone: "error" });
          return;
        }
        breakBeforeRef.current = null;
        breakTargetRef.current = null;
        breakFirstPointRef.current = null;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onBreakCommit(before, result.document, result.refs, mode);
        callbacksRef.current.onBreakStageChange(0);
        callbacksRef.current.onBreakFinishRequested(false);
        callbacksRef.current.onLineCommandFeedback({ message: `${mode === "break" ? "Break" : "Break at Point"} complete.`, tone: "success" });
        return;
      }
      if (chamferModeRef.current) {
        const firstPick = chamferFirstPickRef.current;
        const candidate = entityHitCandidates().find(({ ref }) =>
          ref.kind === "line" && (!firstPick || ref.id !== firstPick.id) && modelEntityIsEditable(documentRef.current, ref));
        if (!candidate || candidate.ref.kind !== "line" || !candidate.point) {
          callbacksRef.current.onLineCommandFeedback({ message: `Chamfer needs ${firstPick ? "a different editable second Line" : "an editable first Line"}.`, tone: "error" });
          return;
        }
        const line = findLineObject(documentRef.current, candidate.ref.id);
        if (!line) return;
        const pick = { id: line.id, point: { x: candidate.point.x, y: candidate.point.y, z: line.start.z } };
        if (!firstPick) {
          chamferBeforeRef.current = cloneDocument(documentRef.current);
          chamferFirstPickRef.current = pick;
          callbacksRef.current.onLineSelect(line.id, false);
          callbacksRef.current.onChamferStageChange(1);
          callbacksRef.current.onLineCommandFeedback({ message: `First Line accepted. Select the second Line for a ${formatArchitectural(chamferFirstDistanceRef.current)} × ${formatArchitectural(chamferSecondDistanceRef.current)} Chamfer.`, tone: "success" });
          return;
        }
        const before = chamferBeforeRef.current ?? cloneDocument(documentRef.current);
        const result = chamferLineObjects(before, firstPick, pick, chamferFirstDistanceRef.current, chamferSecondDistanceRef.current);
        if (!result) {
          callbacksRef.current.onDragPreview(before);
          callbacksRef.current.onLineCommandFeedback({ message: "Those picks cannot produce this Chamfer. Try smaller distances or different retained sides.", tone: "error" });
          return;
        }
        chamferBeforeRef.current = null;
        chamferFirstPickRef.current = null;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onChamferCommit(before, result.document, result.refs);
        callbacksRef.current.onChamferStageChange(0);
        callbacksRef.current.onChamferFinishRequested(false);
        callbacksRef.current.onLineCommandFeedback({ message: `Chamfer complete at ${formatArchitectural(chamferFirstDistanceRef.current)} × ${formatArchitectural(chamferSecondDistanceRef.current)}.`, tone: "success" });
        return;
      }
      if (filletModeRef.current) {
        const firstPick = filletFirstPickRef.current;
        const candidate = entityHitCandidates().find(({ ref }) =>
          (ref.kind === "line" || ref.kind === "arc") && (!firstPick || ref.id !== firstPick.id || ref.kind !== firstPick.kind) && modelEntityIsEditable(documentRef.current, ref));
        if (!candidate || (candidate.ref.kind !== "line" && candidate.ref.kind !== "arc") || !candidate.point) {
          callbacksRef.current.onLineCommandFeedback({ message: `Fillet needs ${firstPick ? "a different editable second Line or Arc" : "an editable first Line or Arc"}.`, tone: "error" });
          return;
        }
        let pick: CurveFilletPick | null = null;
        if (candidate.ref.kind === "line") {
          const source = findLineObject(documentRef.current, candidate.ref.id);
          if (source) pick = { id: source.id, kind: "line", point: { x: candidate.point.x, y: candidate.point.y, z: source.start.z } };
        } else {
          const source = findArcObject(documentRef.current, candidate.ref.id);
          if (source) pick = { id: source.id, kind: "arc", point: { x: candidate.point.x, y: candidate.point.y, z: source.center.z } };
        }
        if (!pick) return;
        if (!firstPick) {
          filletBeforeRef.current = cloneDocument(documentRef.current);
          filletFirstPickRef.current = pick;
          if (pick.kind === "line") callbacksRef.current.onLineSelect(pick.id, false);
          else callbacksRef.current.onArcSelect(pick.id, false);
          callbacksRef.current.onFilletStageChange(1);
          callbacksRef.current.onLineCommandFeedback({ message: `First ${pick.kind === "line" ? "Line" : "Arc"} accepted. Select the second Line or Arc for a ${formatArchitectural(filletRadiusRef.current)} Fillet.`, tone: "success" });
          return;
        }
        const before = filletBeforeRef.current ?? cloneDocument(documentRef.current);
        const result = filletCurveObjects(before, firstPick, pick, filletRadiusRef.current);
        if (!result) {
          callbacksRef.current.onDragPreview(before);
          callbacksRef.current.onLineCommandFeedback({ message: "Those curve picks cannot produce this Fillet. Try a different radius or retained side.", tone: "error" });
          return;
        }
        filletBeforeRef.current = null;
        filletFirstPickRef.current = null;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onFilletCommit(before, result.document, result.refs);
        callbacksRef.current.onFilletStageChange(0);
        callbacksRef.current.onFilletFinishRequested(false);
        callbacksRef.current.onLineCommandFeedback({ message: `Fillet complete at ${formatArchitectural(filletRadiusRef.current)}.`, tone: "success" });
        return;
      }
      if (trimModeRef.current || extendModeRef.current) {
        const ref = selectedOffsetRef();
        const operation = trimModeRef.current ? "trim" : "extend";
        if (!ref) {
          callbacksRef.current.onLineCommandFeedback({ message: `${operation === "trim" ? "Trim" : "Extend"} needs one editable 2D entity.`, tone: "error" });
          return;
        }
        const before = trimExtendBeforeRef.current ?? cloneDocument(documentRef.current);
        trimExtendBeforeRef.current = before;
        const point = planPointFromPointer(selectedOffsetElevation(ref, before));
        if (!point) return;
        const result = previewTrimExtend(before, ref, point);
        if (!result) {
          callbacksRef.current.onLineCommandFeedback({ message: `No valid visible boundary was found for this ${operation}.`, tone: "error" });
          return;
        }
        trimExtendBeforeRef.current = null;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onTrimExtendCommit(before, result.document, result.refs, operation);
        callbacksRef.current.onTrimExtendFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: `${operation === "trim" ? "Trim" : "Extend"} complete.`, tone: "success" });
        return;
      }
      if (offsetModeRef.current) {
        const ref = selectedOffsetRef();
        if (!ref) {
          callbacksRef.current.onLineCommandFeedback({ message: "Offset needs one editable 2D entity.", tone: "error" });
          return;
        }
        const before = offsetBeforeRef.current ?? cloneDocument(documentRef.current);
        offsetBeforeRef.current = before;
        const rawPoint = planPointFromPointer(selectedOffsetElevation(ref));
        if (!rawPoint) return;
        const snapped = snapCadPoint(rawPoint, null, null, false, true);
        const result = offsetModelEntity(before, ref, offsetDistanceRef.current, snapped.point, offsetKeepSourceRef.current);
        if (!result) {
          callbacksRef.current.onLineCommandFeedback({ message: "That side cannot produce a valid offset at this distance.", tone: "error" });
          return;
        }
        offsetBeforeRef.current = null;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onOffsetCommit(before, result.document, result.ref, offsetKeepSourceRef.current);
        callbacksRef.current.onOffsetFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: `Offset complete at ${formatArchitectural(offsetDistanceRef.current)}.`, tone: "success" });
        return;
      }
      if (mirrorModeRef.current) {
        const axisStart = mirrorAxisStartRef.current;
        const rawPoint = planPointFromPointer(axisStart?.z ?? activeElevationRef.current);
        if (!rawPoint) return;
        const snapped = snapCadPoint(rawPoint, null, axisStart, Boolean(axisStart), true);
        snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
        snapMarker.visible = true;
        if (!axisStart) {
          mirrorAxisStartRef.current = snapped.point;
          mirrorBeforeRef.current = cloneDocument(documentRef.current);
          callbacksRef.current.onDragStatus({ distance: 0, kind: "mirror", snapped: snapped.snapped, valid: true });
          callbacksRef.current.onLineCommandFeedback({ message: "Mirror: specify the second point of the mirror axis.", tone: "success" });
          return;
        }
        const before = mirrorBeforeRef.current;
        const distance = planarDistance(axisStart, snapped.point);
        const result = before && distance >= 1 / 16
          ? mirrorModelEntities(before, selectedModifyRefs(), axisStart, snapped.point, mirrorKeepSourceRef.current)
          : null;
        if (!before || !result) {
          callbacksRef.current.onLineCommandFeedback({ message: distance < 1 / 16 ? "Choose a different second point for the mirror axis." : "That mirror would create unsupported geometry.", tone: "error" });
          return;
        }
        mirrorAxisStartRef.current = null;
        mirrorBeforeRef.current = null;
        linePreview.visible = false;
        trackingGuide.visible = false;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onMirrorCommit(before, result.document, result.refs, mirrorKeepSourceRef.current);
        callbacksRef.current.onMirrorFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: `Mirror complete — source entities ${mirrorKeepSourceRef.current ? "kept" : "replaced"}.`, tone: "success" });
        return;
      }
      if (arcModeRef.current) {
        const method = arcMethodRef.current;
        const continueSeed = arcContinueSeedRef.current;
        const existingPoints = arcPointsRef.current;
        const anchor = arcCursorAnchor(method, existingPoints, continueSeed);
        const rawPoint = planPointFromPointer(existingPoints[0]?.z ?? continueSeed?.start.z ?? activeElevationRef.current);
        if (!rawPoint) return;
        const snapped = snapCadPoint(rawPoint, null, anchor, Boolean(anchor), true);
        arcCursorRef.current = snapped.point;
        if (method !== "continue" && existingPoints.length < 2) {
          if (!anchor || Math.hypot(snapped.point.x - anchor.x, snapped.point.y - anchor.y) >= 1 / 16) {
            arcPointsRef.current = [...existingPoints, snapped.point];
            callbacksRef.current.onArcPointsChange(arcPointsRef.current);
          }
          callbacksRef.current.onDragStatus({ distance: anchor ? lineLength({ start: anchor, end: snapped.point }) : 0, kind: "arc", snapped: snapped.snapped, valid: true });
          callbacksRef.current.onLineCommandFeedback({ message: `Arc ${arcMethodDefinition(method).label}: specify the ${arcPointStage(method, arcPointsRef.current.length)}.`, tone: "success" });
          return;
        }
        const arc = arcGeometryFromMethodPointer(method, existingPoints, snapped.point, continueSeed);
        if (arc && callbacksRef.current.onArcCreate(arc)) {
          arcPointsRef.current = [];
          arcCursorRef.current = null;
          callbacksRef.current.onArcPointsChange([]);
          linePreview.visible = false;
          trackingGuide.visible = false;
          snapMarker.visible = false;
          setDynamicArcInput(null);
          callbacksRef.current.onDragStatus(null);
          callbacksRef.current.onArcFinishRequested();
          callbacksRef.current.onLineCommandFeedback({ message: `${arcMethodDefinition(method).label} Arc placed. Press Enter to repeat Arc.`, tone: "success" });
        } else {
          callbacksRef.current.onLineCommandFeedback({ message: `Those inputs cannot form a valid ${arcMethodDefinition(method).label} Arc.`, tone: "error" });
        }
        return;
      }
      if (circleModeRef.current) {
        const points = circlePointsRef.current;
        const method = circleMethodRef.current;
        const anchor = points.at(-1) ?? null;
        const rawPoint = planPointFromPointer(points[0]?.z ?? activeElevationRef.current);
        if (!rawPoint) return;
        if (method === "tangent-tangent-radius" || method === "tangent-tangent-tangent") {
          const pickedConstraints = circleTangentConstraintsRef.current;
          if (method === "tangent-tangent-radius" && pickedConstraints.length >= 2) {
            const radius = snapToSixteenth(planarDistance(pickedConstraints[1].constraint.pick, rawPoint));
            const circle = circleFromTwoTangenciesRadius(pickedConstraints[0].constraint, pickedConstraints[1].constraint, radius);
            if (circle && callbacksRef.current.onCircleCreate(circle)) {
              circleTangentConstraintsRef.current = [];
              circlePointsRef.current = [];
              callbacksRef.current.onCirclePointsChange([]);
              linePreview.visible = false;
              snapMarker.visible = false;
              setDynamicCircleInput(null);
              callbacksRef.current.onDragStatus(null);
              callbacksRef.current.onCircleFinishRequested();
              callbacksRef.current.onLineCommandFeedback({ message: `Tangent, Tangent, Radius Circle placed at ${formatArchitectural(circle.radius)} radius.`, tone: "success" });
            } else {
              callbacksRef.current.onLineCommandFeedback({ message: "That radius cannot create a Circle tangent to both selected objects.", tone: "error" });
            }
            return;
          }
          const picked = pickCircleTangentConstraint(rawPoint);
          if (!picked) {
            callbacksRef.current.onLineCommandFeedback({ message: "Select a visible Line, Polyline segment, Circle, Arc, or box edge near the cursor.", tone: "error" });
            return;
          }
          if (pickedConstraints.some((candidate) => candidate.key === picked.key)) {
            callbacksRef.current.onLineCommandFeedback({ message: "Select a different tangent object or segment.", tone: "error" });
            return;
          }
          const nextConstraints = [...pickedConstraints, picked];
          circleTangentConstraintsRef.current = nextConstraints;
          circlePointsRef.current = nextConstraints.map(({ constraint }) => constraint.pick);
          callbacksRef.current.onCirclePointsChange(circlePointsRef.current);
          snapMarker.position.set(picked.constraint.pick.x, picked.constraint.pick.y, picked.constraint.pick.z + 0.9);
          snapMarker.visible = true;
          if (method === "tangent-tangent-tangent" && nextConstraints.length === 3) {
            const circle = circleFromThreeTangencies(nextConstraints[0].constraint, nextConstraints[1].constraint, nextConstraints[2].constraint);
            if (circle && callbacksRef.current.onCircleCreate(circle)) {
              circleTangentConstraintsRef.current = [];
              circlePointsRef.current = [];
              callbacksRef.current.onCirclePointsChange([]);
              snapMarker.visible = false;
              callbacksRef.current.onDragStatus(null);
              callbacksRef.current.onCircleFinishRequested();
              callbacksRef.current.onLineCommandFeedback({ message: "Tangent, Tangent, Tangent Circle placed. Press Enter to repeat Circle.", tone: "success" });
            } else {
              circleTangentConstraintsRef.current = nextConstraints.slice(0, 2);
              circlePointsRef.current = circleTangentConstraintsRef.current.map(({ constraint }) => constraint.pick);
              callbacksRef.current.onCirclePointsChange(circlePointsRef.current);
              callbacksRef.current.onLineCommandFeedback({ message: "Those three selections cannot form a valid tangent Circle. Select a different third object.", tone: "error" });
            }
          } else {
            callbacksRef.current.onLineCommandFeedback({ message: `${circleMethodDefinition(method).label}: ${nextConstraints.length} tangent object${nextConstraints.length === 1 ? "" : "s"} selected. Specify the ${circlePointStage(method, nextConstraints.length)}.`, tone: "success" });
          }
          return;
        }
        const snapped = snapCadPoint(rawPoint, null, anchor, Boolean(anchor), true);
        circleCursorRef.current = snapped.point;
        if (!circlePointCompletes(method, points.length)) {
          if (!anchor || planarDistance(anchor, snapped.point) >= 1 / 16) {
            circlePointsRef.current = [...points, snapped.point];
            callbacksRef.current.onCirclePointsChange(circlePointsRef.current);
          }
          snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
          snapMarker.visible = true;
          callbacksRef.current.onDragStatus({ distance: anchor ? planarDistance(anchor, snapped.point) : 0, kind: "circle", snapped: snapped.snapped, valid: true });
          callbacksRef.current.onLineCommandFeedback({ message: `${circleMethodDefinition(method).label} Circle: specify the ${circlePointStage(method, circlePointsRef.current.length)}.`, tone: "success" });
          return;
        }
        const circle = circleGeometryFromPointer(method, points, snapped.point);
        if (circle && callbacksRef.current.onCircleCreate(circle)) {
          circlePointsRef.current = [];
          circleCursorRef.current = null;
          callbacksRef.current.onCirclePointsChange([]);
          linePreview.visible = false;
          trackingGuide.visible = false;
          snapMarker.visible = false;
          setDynamicCircleInput(null);
          callbacksRef.current.onDragStatus(null);
          callbacksRef.current.onCircleFinishRequested();
          callbacksRef.current.onLineCommandFeedback({ message: `${circleMethodDefinition(method).label} Circle placed. Press Enter to repeat Circle.`, tone: "success" });
        } else {
          callbacksRef.current.onLineCommandFeedback({ message: `Those points cannot form a valid ${circleMethodDefinition(method).label} Circle.`, tone: "error" });
        }
        return;
      }
      if (rectangleModeRef.current) {
        const rawPoint = planPointFromPointer(rectangleStartRef.current?.z ?? activeElevationRef.current);
        if (!rawPoint) return;
        const snapped = snapCadPoint(rawPoint, null, rectangleStartRef.current, Boolean(rectangleStartRef.current), true);
        rectangleCursorRef.current = snapped.point;
        rectangleEscapeArmedRef.current = false;
        if (!rectangleStartRef.current) {
          rectangleStartRef.current = snapped.point;
          callbacksRef.current.onRectangleAnchorChange(snapped.point);
          snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
          snapMarker.visible = true;
          callbacksRef.current.onDragStatus({ distance: 0, kind: "rectangle", snapped: snapped.snapped, valid: true });
          return;
        }
        const rectangle = rectangleFromDraftSettings(rectangleStartRef.current, snapped.point, rectangleDraftSettingsRef.current);
        if (rectangle && callbacksRef.current.onPolylineCreate(rectangle, "rectangle")) {
          rectangleStartRef.current = null;
          rectangleCursorRef.current = null;
          callbacksRef.current.onRectangleAnchorChange(null);
          linePreview.visible = false;
          trackingGuide.visible = false;
          setDynamicRectangleInput(null);
          callbacksRef.current.onDragStatus(null);
          callbacksRef.current.onRectangleFinishRequested();
          callbacksRef.current.onLineCommandFeedback({ message: "Rectangle placed. Press Enter to repeat Rectangle.", tone: "success" });
        }
        return;
      }
      if (polylineModeRef.current) {
        const rawPoint = planPointFromPointer(polylinePointsRef.current.length ? polylineElevationRef.current : activeElevationRef.current);
        if (!rawPoint) return;
        const points = polylinePointsRef.current;
        const previous = points.at(-1);
        const anchor = previous ? { ...previous, z: polylineElevationRef.current } : null;
        const snapped = snapCadPoint(rawPoint, null, anchor, Boolean(anchor), true);
        polylineCursorRef.current = snapped.point;
        polylineEscapeArmedRef.current = false;
        if (!previous) {
          polylineElevationRef.current = snapped.point.z;
          polylinePointsRef.current = [snapped.point];
          polylineBulgesRef.current = [];
          callbacksRef.current.onPolylineAnchorChange(snapped.point);
        } else if (polylineSegmentModeRef.current === "arc" && !polylineArcThroughRef.current) {
          polylineArcThroughRef.current = snapped.point;
          callbacksRef.current.onLineCommandFeedback({ message: "Arc through-point accepted. Specify the Arc endpoint.", tone: "success" });
        } else if (Math.hypot(previous.x - snapped.point.x, previous.y - snapped.point.y) >= 1 / 16) {
          const bulge = polylineSegmentModeRef.current === "arc" && polylineArcThroughRef.current
            ? polylineBulgeFromThreePoints(previous, polylineArcThroughRef.current, snapped.point)
            : 0;
          if (bulge === null) {
            callbacksRef.current.onLineCommandFeedback({ message: "Those three points cannot form a valid Polyline Arc segment.", tone: "error" });
            return;
          }
          polylinePointsRef.current = [...points, snapped.point];
          polylineBulgesRef.current = [...polylineBulgesRef.current, bulge];
          polylineArcThroughRef.current = null;
          callbacksRef.current.onPolylineAnchorChange(snapped.point);
        }
        linePreview.visible = false;
        trackingGuide.visible = false;
        setDynamicPolylineInput(null);
        callbacksRef.current.onDragStatus({ angle: previous ? lineAngle({ start: anchor!, end: snapped.point }) : 0, distance: previous ? lineLength({ start: anchor!, end: snapped.point }) : 0, kind: "polyline", polarAngle: snapped.polarAngle, snapped: snapped.snapped, valid: true });
        return;
      }
      if (lineModeRef.current) {
        const rawPoint = planPointFromPointer(lineStartRef.current?.z ?? activeElevationRef.current);
        if (!rawPoint) return;
        const snapped = snapLineCandidate(rawPoint, true);
        if (!lineStartRef.current) {
          lineStartRef.current = snapped.point;
          lineCursorRef.current = snapped.point;
          linePointHistoryRef.current = [snapped.point];
          lineEscapeArmedRef.current = false;
          callbacksRef.current.onLineAnchorChange(snapped.point);
          snapMarker.position.set(lineStartRef.current.x, lineStartRef.current.y, lineStartRef.current.z + 0.9);
          snapMarker.visible = true;
          callbacksRef.current.onDragStatus({ distance: 0, kind: "line", snapped: snapped.snapped, valid: true });
          return;
        }
        const completedStart = lineStartRef.current;
        if (callbacksRef.current.onLineCreate(completedStart, snapped.point)) {
          lineStartRef.current = snapped.point;
          lineCursorRef.current = snapped.point;
          linePointHistoryRef.current = [...linePointHistoryRef.current, snapped.point];
          lineEscapeArmedRef.current = false;
          callbacksRef.current.onLineAnchorChange(snapped.point);
          linePreview.visible = false;
          trackingGuide.visible = false;
          setDynamicLineInput(null);
          callbacksRef.current.onDragStatus({
            angle: lineAngle({ start: completedStart, end: snapped.point }),
            distance: lineLength({ start: completedStart, end: snapped.point }),
            kind: "line",
            polarAngle: snapped.polarAngle,
            snapped: snapped.snapped,
            valid: true,
          });
        }
        return;
      }
      if (moveModeRef.current || copyModeRef.current || (stretchModeRef.current && stretchTargetsRef.current.length > 0)) {
        const refs = selectedModifyRefs();
        const source = modifyBeforeRef.current ?? documentRef.current;
        const stretchTargets = stretchTargetsRef.current;
        if (!refs.length || refs.some((ref) => !modelEntityIsEditable(source, ref))) {
          callbacksRef.current.onLineCommandFeedback({
            message: stretchModeRef.current
              ? "Stretch needs editable geometry selected by a crossing window."
              : "Select unlocked entities on unlocked layers before using Move or Copy.",
            tone: "error",
          });
          if (stretchModeRef.current) callbacksRef.current.onStretchFinishRequested(true);
          else callbacksRef.current.onModifyFinishRequested(true);
          clearModifyPreview();
          return;
        }
        const rawPoint = planPointFromPointer(modifyBaseRef.current?.z ?? activeElevationRef.current);
        if (!rawPoint) return;
        const snapped = snapCadPoint(rawPoint, null, modifyBaseRef.current, Boolean(modifyBaseRef.current), true);
        if (!modifyBaseRef.current) {
          modifyBaseRef.current = snapped.point;
          modifyBeforeRef.current = cloneDocument(documentRef.current);
          snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
          snapMarker.visible = true;
          callbacksRef.current.onLineCommandFeedback({
            message: `${stretchModeRef.current ? "Stretch" : copyModeRef.current ? "Copy" : "Move"}: base point accepted. Specify the target point.`,
            tone: "success",
          });
          return;
        }
        const before = modifyBeforeRef.current;
        const base = modifyBaseRef.current;
        if (!before) return;
        const delta = {
          x: snapped.point.x - base.x,
          y: snapped.point.y - base.y,
          z: snapped.point.z - base.z,
        };
        const copied = copyModeRef.current ? copyModelEntities(before, refs, delta) : null;
        const next = stretchModeRef.current
          ? stretchModelEntities(before, stretchTargets, delta)
          : copyModeRef.current ? copied?.document ?? null : moveModelEntities(before, refs, delta);
        if (!next) {
          callbacksRef.current.onLineCommandFeedback({
            message: "Choose a different target point; the offset must be nonzero and stay inside the drawing range.",
            tone: "error",
          });
          return;
        }
        if (stretchModeRef.current) {
          callbacksRef.current.onStretchCommit(before, next, stretchTargets);
          callbacksRef.current.onStretchFinishRequested(false);
        } else {
          callbacksRef.current.onModifyCommit(before, next, copied?.refs ?? null);
          callbacksRef.current.onModifyFinishRequested(false);
        }
        clearModifyPreview();
        return;
      }
      if (stretchModeRef.current) {
        const bounds = renderer.domElement.getBoundingClientRect();
        const start = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
        selectionDrag = {
          active: false,
          additive: false,
          current: start,
          pointerId: event.pointerId,
          purpose: "stretch",
          start,
        };
        controls.enabled = false;
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      const activeObjectId = selectedObjectIdRef.current;
      const activeArcId = selectedArcIdRef.current;
      const activeLineId = selectedLineIdRef.current;
      const activeCircleId = selectedCircleIdRef.current;
      const activePolylineId = selectedPolylineIdRef.current;
      const arcGripHit = arcGripSet.group.visible ? raycaster.intersectObjects(arcGripSet.handles, false)[0] : undefined;
      const arcGrip = arcGripHit?.object.userData.arcGrip as ArcGrip | undefined;
      if (arcGripHit && arcGrip && activeArcId) {
        const source = findArcObject(documentRef.current, activeArcId);
        if (!source || !arcIsEditable(documentRef.current, source)) return;
        const startPoint = planPointFromPointer(source.center.z);
        if (!startPoint) return;
        const before = cloneDocument(documentRef.current);
        drag = { active: false, arcGrip, axis: axisVector("x"), axisKey: "x", before, faceIndex: null, grip: null, kind: "arc-grip", lastValid: before, objectId: activeArcId, plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), -source.center.z), pointerId: event.pointerId, sign: 1, startClientX: event.clientX, startClientY: event.clientY, startPoint: new THREE.Vector3(startPoint.x, startPoint.y, source.center.z) };
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      const circleGripHit = circleGripSet.group.visible
        ? raycaster.intersectObjects(circleGripSet.handles, false)[0]
        : undefined;
      const circleGrip = circleGripHit?.object.userData.circleGrip as CircleGrip | undefined;
      if (circleGripHit && circleGrip && activeCircleId) {
        const source = findCircleObject(documentRef.current, activeCircleId);
        if (!source || !circleIsEditable(documentRef.current, source)) return;
        const startPoint = planPointFromPointer(source.center.z);
        if (!startPoint) return;
        const before = cloneDocument(documentRef.current);
        drag = { active: false, axis: axisVector("x"), axisKey: "x", before, circleGrip, faceIndex: null, grip: null, kind: "circle-grip", lastValid: before, objectId: activeCircleId, plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), -source.center.z), pointerId: event.pointerId, sign: 1, startClientX: event.clientX, startClientY: event.clientY, startPoint: new THREE.Vector3(startPoint.x, startPoint.y, source.center.z) };
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      const polylineGripHit = polylineGripSet.group.visible
        ? raycaster.intersectObjects(polylineGripSet.handles, false)[0]
        : undefined;
      const polylineVertex = polylineGripHit?.object.userData.polylineVertex as number | undefined;
      const rectangleGrip = polylineGripHit?.object.userData.rectangleGrip as RectangleGrip | undefined;
      if (polylineGripHit && (polylineVertex !== undefined || rectangleGrip) && activePolylineId) {
        const source = findPolylineObject(documentRef.current, activePolylineId);
        if (!source || !polylineIsEditable(documentRef.current, source)) return;
        const startPoint = planPointFromPointer(source.elevation);
        if (!startPoint) return;
        const before = cloneDocument(documentRef.current);
        drag = { active: false, axis: axisVector("x"), axisKey: "x", before, faceIndex: null, grip: null, kind: "polyline-grip", lastValid: before, objectId: activePolylineId, plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), -source.elevation), pointerId: event.pointerId, polylineGrip: rectangleGrip, polylineVertex, sign: 1, startClientX: event.clientX, startClientY: event.clientY, startPoint: new THREE.Vector3(startPoint.x, startPoint.y, source.elevation) };
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      const lineGripHit = lineGripSet.group.visible
        ? raycaster.intersectObjects(lineGripSet.handles, false)[0]
        : undefined;
      const lineGrip = lineGripHit?.object.userData.lineGrip as "start" | "midpoint" | "end" | undefined;
      if (lineGripHit && lineGrip && activeLineId) {
        const source = findLineObject(documentRef.current, activeLineId);
        if (!source || !lineIsEditable(documentRef.current, source)) return;
        const gripElevation = lineGrip === "start" ? source.start.z : lineGrip === "end" ? source.end.z : lineMidpoint(source).z;
        const startPoint = planPointFromPointer(gripElevation);
        if (!startPoint) return;
        const before = cloneDocument(documentRef.current);
        drag = {
          active: false,
          axis: axisVector("x"),
          axisKey: "x",
          before,
          faceIndex: null,
          grip: null,
          kind: "line-grip",
          lastValid: before,
          lineGrip,
          objectId: activeLineId,
          plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), -gripElevation),
          pointerId: event.pointerId,
          sign: 1,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startPoint: new THREE.Vector3(startPoint.x, startPoint.y, gripElevation),
        };
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      const rotationHit = rotationGizmo.group.visible
        ? raycaster.intersectObject(rotationGizmo.ring, false)[0]
        : undefined;
      if (rotationHit) {
        const refs = selectedModifyRefs();
        if (!refs.length || refs.some((ref) => !modelEntityIsEditable(documentRef.current, ref))) return;
        const baseRecord = modelSelectionRotationBase(documentRef.current, refs, rotationBaseKeyRef.current);
        if (!baseRecord) return;
        const rotationBase = new THREE.Vector3(baseRecord.x, baseRecord.y, baseRecord.z);
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), rotationBase);
        const startPoint = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
        if (!startPoint || startPoint.distanceToSquared(rotationBase) < 0.001) return;
        const before = cloneDocument(documentRef.current);
        drag = {
          active: false,
          axis: axisVector("z"),
          axisKey: "z",
          before,
          faceIndex: null,
          grip: null,
          kind: "rotate",
          lastValid: before,
          objectId: refs.at(-1)!.id,
          plane,
          pointerId: event.pointerId,
          rotationBase,
          sign: 1,
          startAngle: Math.atan2(startPoint.y - rotationBase.y, startPoint.x - rotationBase.x),
          startClientX: event.clientX,
          startClientY: event.clientY,
          startPoint,
        };
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      const scaleHit = scaleGizmo.group.visible
        ? raycaster.intersectObject(scaleGizmo.handle, false)[0]
        : undefined;
      if (scaleHit) {
        const refs = selectedModifyRefs();
        if (!refs.length || refs.some((ref) => !modelEntityIsEditable(documentRef.current, ref))) return;
        const baseRecord = modelSelectionScaleBase(documentRef.current, refs, scaleBaseKeyRef.current);
        if (!baseRecord) return;
        const scaleBase = new THREE.Vector3(baseRecord.x, baseRecord.y, baseRecord.z);
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), scaleBase);
        const startPoint = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
        const scaleStartDistance = startPoint?.distanceTo(scaleBase) ?? 0;
        if (!startPoint || scaleStartDistance < 0.001) return;
        const before = cloneDocument(documentRef.current);
        drag = {
          active: false,
          axis: axisVector("x"),
          axisKey: "x",
          before,
          faceIndex: null,
          grip: null,
          kind: "scale",
          lastValid: before,
          objectId: refs.at(-1)!.id,
          plane,
          pointerId: event.pointerId,
          scaleBase,
          scaleStartDistance,
          sign: 1,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startPoint,
        };
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      const gripHit = boxGripSet.group.visible
        ? raycaster.intersectObjects(boxGripSet.handles, false)[0]
        : undefined;
      const boxGrip = gripHit?.object.userData.boxGrip as BoxGripDefinition | undefined;
      const objectMoveGrip = Boolean(gripHit?.object.userData.objectMoveGrip);
      if (gripHit && objectMoveGrip && activeObjectId) {
        const source = findBoxObject(documentRef.current, activeObjectId);
        if (!source || !objectIsEditable(documentRef.current, source)) return;
        const centerRecord = boxWorldPoint(source, 0.5, 0.5, 0.5);
        const center = new THREE.Vector3(centerRecord.x, centerRecord.y, centerRecord.z);
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 0, 1),
          center,
        );
        const startPoint = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
        if (!startPoint) return;
        const before = cloneDocument(documentRef.current);
        drag = {
          active: false,
          axis: axisVector("x"),
          axisKey: "x",
          before,
          faceIndex: null,
          grip: null,
          kind: "plan-move",
          lastValid: before,
          objectId: activeObjectId,
          plane,
          pointerId: event.pointerId,
          sign: 1,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startPoint,
        };
        callbacksRef.current.onFaceSelect(activeObjectId, null, false);
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      if (gripHit && boxGrip && activeObjectId) {
        const source = findBoxObject(documentRef.current, activeObjectId);
        if (!source || !objectIsEditable(documentRef.current, source)) return;
        const primaryAxis = boxGrip.axes[0];
        const localAxis = boxLocalAxis(source, primaryAxis);
        const axis = new THREE.Vector3(localAxis.x, localAxis.y, localAxis.z);
        const plane = boxGrip.axes.length === 1
          ? createDragPlane(axis, gripHit.point)
          : new THREE.Plane().setFromNormalAndCoplanarPoint(
              camera.getWorldDirection(new THREE.Vector3()),
              gripHit.point,
            );
        const startPoint = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
        if (!startPoint) return;
        const before = cloneDocument(documentRef.current);
        drag = {
          active: false,
          axis,
          axisKey: primaryAxis,
          before,
          faceIndex: faceIndexForBoxGrip(boxGrip),
          grip: boxGrip,
          kind: "grip",
          lastValid: before,
          objectId: activeObjectId,
          plane,
          pointerId: event.pointerId,
          sign: boxGrip.signs[primaryAxis] || 1,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startPoint,
        };
        callbacksRef.current.onFaceSelect(activeObjectId, faceIndexForBoxGrip(boxGrip), false);
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      const gizmoHit = moveGizmo.group.visible
        ? raycaster.intersectObjects(moveGizmo.handles, false)[0]
        : undefined;
      const moveAxis = gizmoHit?.object.userData.moveAxis as AxisKey | undefined;
      if (gizmoHit && moveAxis && activeObjectId) {
        const source = findBoxObject(documentRef.current, activeObjectId);
        if (!source || !objectIsEditable(documentRef.current, source)) return;
        const axis = axisVector(moveAxis);
        const plane = createDragPlane(axis, gizmoHit.point);
        const startPoint = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
        if (!startPoint) return;
        const before = cloneDocument(documentRef.current);
        drag = {
          active: false,
          axis,
          axisKey: moveAxis,
          before,
          faceIndex: null,
          grip: null,
          kind: copyModeRef.current ? "copy" : "object",
          lastValid: before,
          objectId: activeObjectId,
          plane,
          pointerId: event.pointerId,
          sign: 1,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startPoint,
        };
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      const candidates = entityHitCandidates();
      const bounds = renderer.domElement.getBoundingClientRect();
      const clickPoint = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      const candidateKeys = candidates.map((candidate) => cadEntityKey(candidate.ref));
      selectionCycleState = advanceSelectionCycle(selectionCycleState, candidateKeys, clickPoint, performance.now());
      selectionCycleCandidates = candidates;
      const chosenCandidate = candidates[selectionCycleState.index];
      setHoveredEntityKey(null);
      showSelectionCycle(candidates, selectionCycleState.index, clickPoint);
      if (!chosenCandidate) {
        setSelectionCycle(null);
        selectionCycleState = null;
        selectionCycleCandidates = [];
        const start = clickPoint;
        selectionDrag = {
          active: false,
          additive: event.shiftKey,
          current: start,
          pointerId: event.pointerId,
          purpose: "selection",
          start,
        };
        controls.enabled = false;
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
      selectHitCandidate(chosenCandidate, event.shiftKey);
      if (chosenCandidate.ref.kind !== "box") return;
      const objectId = chosenCandidate.ref.id;
      const faceIndex = chosenCandidate.faceIndex ?? undefined;
      const hitPoint = chosenCandidate.point;
      const hitObject = findBoxObject(documentRef.current, objectId);
      const hitLayer = findLayer(documentRef.current, hitObject?.layerId ?? null);
      const layerLocked = Boolean(hitLayer?.locked);
      const objectLocked = Boolean(hitObject?.locked);
      if (layerLocked || objectLocked) return;
      if (event.shiftKey) return;
      if (copyModeRef.current) return;
      if (moveModeRef.current) return;
      if (mirrorModeRef.current) return;
      if (breakModeRef.current || chamferModeRef.current || filletModeRef.current || lengthenModeRef.current || offsetModeRef.current || stretchModeRef.current || trimModeRef.current || extendModeRef.current) return;
      if (rotateModeRef.current) return;
      if (scaleModeRef.current) return;
      if (faceIndex === undefined || !hitPoint) return;

      const face = FACE_DEFINITIONS[faceIndex];
      const localAxis = hitObject ? boxLocalAxis(hitObject, face.axis) : { x: 0, y: 0, z: 0 };
      const axis = new THREE.Vector3(localAxis.x, localAxis.y, localAxis.z);
      const plane = createDragPlane(axis, hitPoint);
      const startPoint = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
      if (!startPoint) return;

      const before = cloneDocument(documentRef.current);
      if (!findBoxObject(before, objectId)) return;
      drag = {
        active: false,
        axis,
        axisKey: face.axis,
        before,
        faceIndex,
        grip: null,
        kind: "face",
        lastValid: before,
        objectId,
        plane,
        pointerId: event.pointerId,
        sign: face.sign,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPoint,
      };
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const moveDrag = (event: PointerEvent) => {
      lastDrawingPointerEvent = event;
      if (selectionDrag && event.pointerId === selectionDrag.pointerId) {
        const bounds = renderer.domElement.getBoundingClientRect();
        selectionDrag.current = {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        };
        selectionDrag.active = selectionDrag.active || Math.hypot(
          selectionDrag.current.x - selectionDrag.start.x,
          selectionDrag.current.y - selectionDrag.start.y,
        ) >= 4;
        if (selectionDrag.active) {
          setSelectionBox({
            end: selectionDrag.current,
            mode: selectionDrag.current.x >= selectionDrag.start.x ? "window" : "crossing",
            start: selectionDrag.start,
          });
        }
        return;
      }
      if (!drag) {
        setPointer(event);
        if (arcModeRef.current || boundaryModeRef.current || breakModeRef.current || chamferModeRef.current || circleModeRef.current || extendModeRef.current || filletModeRef.current || lengthenModeRef.current || lineModeRef.current || mirrorModeRef.current || offsetModeRef.current || polylineModeRef.current || rectangleModeRef.current || trimModeRef.current) {
          setHoveredEntityKey(null);
        }
        if (boundaryModeRef.current) {
          const point = planPointFromPointer(activeElevationRef.current);
          if (!point) return;
          const boundary = discoverDocumentBoundary(documentRef.current, point, activeElevationRef.current);
          const bounds = mount.getBoundingClientRect();
          renderer.domElement.style.cursor = "crosshair";
          snapMarker.visible = false;
          trackingGuide.visible = false;
          if (boundary) {
            updateViewportPolyline(
              { geometry: linePreviewGeometry, line: linePreview },
              boundary.geometry,
              0.8,
            );
            linePreview.computeLineDistances();
            linePreview.visible = true;
          } else {
            linePreview.visible = false;
          }
          setDynamicLineInput({ angle: 0, distance: boundary?.area ?? 0, elevation: point.z, label: boundary ? "BOUNDARY · CLICK INSIDE" : "BOUNDARY · NO CLOSED AREA", x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          callbacksRef.current.onDragStatus({ distance: boundary?.area ?? 0, kind: "boundary", valid: Boolean(boundary) });
          return;
        }
        if (lengthenModeRef.current) {
          const ref = selectedLengthenRef();
          if (!ref) return;
          const before = lengthenBeforeRef.current ?? cloneDocument(documentRef.current);
          lengthenBeforeRef.current = before;
          const bounds = mount.getBoundingClientRect();
          renderer.domElement.style.cursor = "crosshair";
          snapMarker.visible = false;
          const activeEndpoint = lengthenEndpointRef.current;
          let endpoint: LengthenEndpoint | null = activeEndpoint;
          let result: ReturnType<typeof lengthenModelEntity> = null;
          if (lengthenMethodRef.current === "dynamic" && activeEndpoint) {
            const rawPoint = planPointFromPointer(selectedOffsetElevation(ref, before));
            if (rawPoint) {
              const snapped = snapCadPoint(rawPoint, null, null, false);
              snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
              snapMarker.visible = snapped.snapped;
              const request = lengthenRequest(snapped.point);
              result = request ? lengthenModelEntity(before, ref, activeEndpoint, request) : null;
            }
          } else {
            const candidate = entityHitCandidates().find(({ ref: candidateRef }) => candidateRef.kind === ref.kind && candidateRef.id === ref.id);
            const endpoints = modelEntityLengthenEndpoints(before, ref);
            if (candidate?.point && endpoints) {
              endpoint = closestLengthenEndpoint(endpoints.start, endpoints.end, { ...candidate.point, z: selectedOffsetElevation(ref, before) });
              const request = lengthenRequest();
              result = request ? lengthenModelEntity(before, ref, endpoint, request) : null;
            }
          }
          callbacksRef.current.onDragPreview(result?.document ?? before);
          const methodLabel = lengthenMethodRef.current.toUpperCase();
          const label = lengthenMethodRef.current === "dynamic" && !activeEndpoint
            ? "LENGTHEN · PICK ENDPOINT"
            : result
              ? `${methodLabel} · ${endpoint === "start" ? "START" : "END"} · CLICK TO ACCEPT`
              : `${methodLabel} · INVALID RESULT`;
          setDynamicLineInput({ angle: 0, distance: lengthenValueRef.current, elevation: selectedOffsetElevation(ref, before), label, x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          callbacksRef.current.onDragStatus({ distance: lengthenValueRef.current, kind: "lengthen", valid: lengthenMethodRef.current === "dynamic" && !activeEndpoint ? true : Boolean(result) });
          return;
        }
        if (breakModeRef.current) {
          const mode = breakModeRef.current;
          const target = breakTargetRef.current;
          const firstPoint = breakFirstPointRef.current;
          const before = breakBeforeRef.current;
          const bounds = mount.getBoundingClientRect();
          renderer.domElement.style.cursor = "crosshair";
          snapMarker.visible = false;
          if (!target || !before) {
            setDynamicLineInput({ angle: 0, distance: 0, elevation: activeElevationRef.current, label: `${mode === "break" ? "BREAK" : "BREAK AT POINT"} · SELECT CURVE`, x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
            callbacksRef.current.onDragStatus({ distance: 0, kind: "break", valid: true });
            return;
          }
          const candidate = entityHitCandidates().find(({ ref }) => ref.kind === target.kind && ref.id === target.id);
          const point = candidate?.point ? { ...candidate.point, z: selectedOffsetElevation(target, before) } : null;
          const result = point && (mode === "break-at-point" || firstPoint)
            ? breakModelEntity(before, target, firstPoint ?? point, mode === "break" ? point : null)
            : null;
          callbacksRef.current.onDragPreview(result?.document ?? before);
          const label = !point
            ? `${mode === "break" ? "BREAK" : "BREAK AT POINT"} · PICK ON CURVE`
            : mode === "break" && !firstPoint
              ? "BREAK · CLICK FIRST POINT"
              : result
                ? `${mode === "break" ? "BREAK" : "BREAK AT POINT"} · CLICK TO COMPLETE`
                : `${mode === "break" ? "BREAK" : "BREAK AT POINT"} · INVALID POINT`;
          setDynamicLineInput({ angle: 0, distance: 0, elevation: point?.z ?? selectedOffsetElevation(target, before), label, x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          callbacksRef.current.onDragStatus({ distance: 0, kind: "break", valid: Boolean(point && (mode === "break" && !firstPoint ? true : result)) });
          return;
        }
        if (chamferModeRef.current) {
          const firstPick = chamferFirstPickRef.current;
          const before = chamferBeforeRef.current;
          const bounds = mount.getBoundingClientRect();
          renderer.domElement.style.cursor = "crosshair";
          snapMarker.visible = false;
          if (!firstPick || !before) {
            setDynamicLineInput({ angle: chamferSecondDistanceRef.current, distance: chamferFirstDistanceRef.current, elevation: activeElevationRef.current, label: "CHAMFER · SELECT FIRST LINE", x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
            callbacksRef.current.onDragStatus({ distance: chamferFirstDistanceRef.current, kind: "chamfer", valid: true });
            return;
          }
          const candidate = entityHitCandidates().find(({ ref }) =>
            ref.kind === "line" && ref.id !== firstPick.id && modelEntityIsEditable(before, ref));
          const line = candidate?.ref.kind === "line" ? findLineObject(before, candidate.ref.id) : null;
          const secondPick = candidate?.point && line
            ? { id: line.id, point: { x: candidate.point.x, y: candidate.point.y, z: line.start.z } }
            : null;
          const result = secondPick ? chamferLineObjects(before, firstPick, secondPick, chamferFirstDistanceRef.current, chamferSecondDistanceRef.current) : null;
          callbacksRef.current.onDragPreview(result?.document ?? before);
          setDynamicLineInput({ angle: chamferSecondDistanceRef.current, distance: chamferFirstDistanceRef.current, elevation: firstPick.point.z, label: result ? "CHAMFER · CLICK SECOND LINE" : "CHAMFER · SELECT VALID SECOND LINE", x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          callbacksRef.current.onDragStatus({ distance: chamferFirstDistanceRef.current, kind: "chamfer", valid: Boolean(result) });
          return;
        }
        if (filletModeRef.current) {
          const firstPick = filletFirstPickRef.current;
          const before = filletBeforeRef.current;
          const bounds = mount.getBoundingClientRect();
          renderer.domElement.style.cursor = "crosshair";
          snapMarker.visible = false;
          if (!firstPick || !before) {
            setDynamicLineInput({ angle: 0, distance: filletRadiusRef.current, elevation: activeElevationRef.current, label: "FILLET · SELECT FIRST CURVE", x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
            callbacksRef.current.onDragStatus({ distance: filletRadiusRef.current, kind: "fillet", valid: true });
            return;
          }
          const candidate = entityHitCandidates().find(({ ref }) =>
            (ref.kind === "line" || ref.kind === "arc") && (ref.id !== firstPick.id || ref.kind !== firstPick.kind) && modelEntityIsEditable(before, ref));
          let secondPick: CurveFilletPick | null = null;
          if (candidate?.point && candidate.ref.kind === "line") {
            const source = findLineObject(before, candidate.ref.id);
            if (source) secondPick = { id: source.id, kind: "line", point: { x: candidate.point.x, y: candidate.point.y, z: source.start.z } };
          } else if (candidate?.point && candidate.ref.kind === "arc") {
            const source = findArcObject(before, candidate.ref.id);
            if (source) secondPick = { id: source.id, kind: "arc", point: { x: candidate.point.x, y: candidate.point.y, z: source.center.z } };
          }
          const result = secondPick ? filletCurveObjects(before, firstPick, secondPick, filletRadiusRef.current) : null;
          callbacksRef.current.onDragPreview(result?.document ?? before);
          setDynamicLineInput({ angle: 0, distance: filletRadiusRef.current, elevation: firstPick.point.z, label: result ? "FILLET · CLICK SECOND CURVE" : "FILLET · SELECT VALID SECOND CURVE", x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          callbacksRef.current.onDragStatus({ distance: filletRadiusRef.current, kind: "fillet", valid: Boolean(result) });
          return;
        }
        if (trimModeRef.current || extendModeRef.current) {
          const ref = selectedOffsetRef();
          if (!ref) return;
          const operation = trimModeRef.current ? "trim" : "extend";
          const before = trimExtendBeforeRef.current ?? cloneDocument(documentRef.current);
          trimExtendBeforeRef.current = before;
          const point = planPointFromPointer(selectedOffsetElevation(ref, before));
          if (!point) return;
          const result = previewTrimExtend(before, ref, point);
          const bounds = mount.getBoundingClientRect();
          renderer.domElement.style.cursor = "crosshair";
          snapMarker.visible = false;
          setDynamicLineInput({ angle: 0, distance: 0, elevation: point.z, label: result ? `${operation.toUpperCase()} · CLICK TARGET` : `${operation.toUpperCase()} · NO BOUNDARY`, x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          callbacksRef.current.onDragStatus({ distance: 0, kind: operation, valid: Boolean(result) });
          callbacksRef.current.onDragPreview(result?.document ?? before);
          return;
        }
        if (offsetModeRef.current) {
          const ref = selectedOffsetRef();
          if (!ref) return;
          const before = offsetBeforeRef.current ?? cloneDocument(documentRef.current);
          offsetBeforeRef.current = before;
          const rawPoint = planPointFromPointer(selectedOffsetElevation(ref));
          if (!rawPoint) return;
          const snapped = snapCadPoint(rawPoint, null, null, false);
          const result = offsetModelEntity(before, ref, offsetDistanceRef.current, snapped.point, offsetKeepSourceRef.current);
          const bounds = mount.getBoundingClientRect();
          renderer.domElement.style.cursor = "crosshair";
          snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
          snapMarker.visible = snapped.snapped;
          setDynamicLineInput({ angle: 0, distance: offsetDistanceRef.current, elevation: snapped.point.z, label: result ? "OFFSET · CLICK SIDE" : "OFFSET · INVALID SIDE", x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          callbacksRef.current.onDragStatus({ distance: offsetDistanceRef.current, kind: "offset", snapped: snapped.snapped, valid: Boolean(result) });
          callbacksRef.current.onDragPreview(result?.document ?? before);
          return;
        }
        if (mirrorModeRef.current) {
          const axisStart = mirrorAxisStartRef.current;
          const before = mirrorBeforeRef.current;
          const rawPoint = planPointFromPointer(axisStart?.z ?? activeElevationRef.current);
          if (!rawPoint) return;
          const snapped = snapCadPoint(rawPoint, null, axisStart, Boolean(axisStart));
          const bounds = mount.getBoundingClientRect();
          snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
          snapMarker.visible = snapped.snapped || Boolean(axisStart);
          renderer.domElement.style.cursor = "crosshair";
          if (axisStart && before) {
            const distance = planarDistance(axisStart, snapped.point);
            const angle = lineAngle({ start: axisStart, end: snapped.point });
            const result = distance >= 1 / 16
              ? mirrorModelEntities(before, selectedModifyRefs(), axisStart, snapped.point, mirrorKeepSourceRef.current)
              : null;
            updateViewportLine(
              { geometry: linePreviewGeometry, line: linePreview },
              { start: axisStart, end: snapped.point },
              0.8,
            );
            linePreview.computeLineDistances();
            linePreview.visible = true;
            updateTrackingGuide(axisStart, snapped.point, snapped.snapKind, snapped.guideOrigin);
            setDynamicLineInput({ angle, distance, elevation: axisStart.z, label: "MIRROR", x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
            callbacksRef.current.onDragStatus({ angle, distance, kind: "mirror", polarAngle: snapped.polarAngle, snapped: snapped.snapped, valid: Boolean(result) });
            callbacksRef.current.onDragPreview(result?.document ?? before);
          } else {
            linePreview.visible = false;
            trackingGuide.visible = false;
            setDynamicLineInput({ angle: 0, distance: 0, elevation: snapped.point.z, label: "MIRROR AXIS", x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          }
          return;
        }
        if (moveModeRef.current || copyModeRef.current || (stretchModeRef.current && stretchTargetsRef.current.length > 0)) {
          const rawPoint = planPointFromPointer(modifyBaseRef.current?.z ?? activeElevationRef.current);
          if (!rawPoint) return;
          const snapped = snapCadPoint(rawPoint, null, modifyBaseRef.current, Boolean(modifyBaseRef.current));
          const bounds = mount.getBoundingClientRect();
          snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
          snapMarker.visible = snapped.snapped || Boolean(modifyBaseRef.current);
          renderer.domElement.style.cursor = "crosshair";
          if (modifyBaseRef.current && modifyBeforeRef.current) {
            const base = modifyBaseRef.current;
            const refs = selectedModifyRefs();
            const delta = {
              x: snapped.point.x - base.x,
              y: snapped.point.y - base.y,
              z: snapped.point.z - base.z,
            };
            const copied = copyModeRef.current
              ? copyModelEntities(modifyBeforeRef.current, refs, delta)
              : null;
            const next = stretchModeRef.current
              ? stretchModelEntities(modifyBeforeRef.current, stretchTargetsRef.current, delta)
              : copyModeRef.current
                ? copied?.document ?? null
                : moveModelEntities(modifyBeforeRef.current, refs, delta);
            updateViewportLine(
              {
                geometry: linePreviewGeometry,
                line: linePreview,
              },
              { start: base, end: snapped.point },
              0.8,
            );
            linePreview.computeLineDistances();
            linePreview.visible = true;
            updateTrackingGuide(base, snapped.point, snapped.snapKind, snapped.guideOrigin);
            const geometry = { start: base, end: snapped.point };
            const distance = lineLength(geometry);
            const angle = lineAngle(geometry);
            setDynamicLineInput({
              angle,
              distance,
              elevation: base.z,
              label: stretchModeRef.current ? "STRETCH" : copyModeRef.current ? "COPY" : "MOVE",
              x: event.clientX - bounds.left + 16,
              y: event.clientY - bounds.top + 16,
            });
            callbacksRef.current.onDragStatus({
              angle,
              distance,
              kind: stretchModeRef.current ? "stretch" : "line",
              polarAngle: snapped.polarAngle,
              snapped: snapped.snapped,
              valid: Boolean(next),
            });
            if (next) callbacksRef.current.onDragPreview(next);
          } else {
            linePreview.visible = false;
            trackingGuide.visible = false;
            setDynamicLineInput({
              angle: 0,
              distance: 0,
              elevation: snapped.point.z,
              label: "BASE POINT",
              x: event.clientX - bounds.left + 16,
              y: event.clientY - bounds.top + 16,
            });
          }
          return;
        }
        if (arcModeRef.current) {
          const method = arcMethodRef.current;
          const continueSeed = arcContinueSeedRef.current;
          const points = arcPointsRef.current;
          const anchor = arcCursorAnchor(method, points, continueSeed);
          const rawPoint = planPointFromPointer(points[0]?.z ?? continueSeed?.start.z ?? activeElevationRef.current);
          if (!rawPoint) return;
          const snapped = snapCadPoint(rawPoint, null, anchor, Boolean(anchor));
          arcCursorRef.current = snapped.point;
          snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
          snapMarker.visible = snapped.snapped || points.length > 0;
          renderer.domElement.style.cursor = "crosshair";
          const bounds = mount.getBoundingClientRect();
          let valid = true;
          let previewArc: ArcGeometry | null = null;
          if (method === "continue") {
            previewArc = arcGeometryFromMethodPointer(method, points, snapped.point, continueSeed);
            valid = Boolean(previewArc);
          } else if (points.length === 1) {
            updateViewportLine({ geometry: linePreviewGeometry, line: linePreview }, { start: points[0], end: snapped.point }, 0.8);
            linePreview.computeLineDistances();
            linePreview.visible = true;
            updateTrackingGuide(points[0], snapped.point, snapped.snapKind, snapped.guideOrigin);
          } else if (points.length === 2) {
            previewArc = arcGeometryFromMethodPointer(method, points, snapped.point, continueSeed);
            valid = Boolean(previewArc);
          } else {
            linePreview.visible = false;
            trackingGuide.visible = false;
          }
          if (previewArc) {
            updateViewportArc({ geometry: linePreviewGeometry, line: linePreview }, previewArc, 0.8);
            linePreview.computeLineDistances();
            linePreview.visible = true;
            if (anchor) updateTrackingGuide(anchor, snapped.point, snapped.snapKind, snapped.guideOrigin);
          } else if ((method === "continue" || points.length === 2) && !valid) {
            linePreview.visible = false;
          }
          setDynamicArcInput({ elevation: points[0]?.z ?? continueSeed?.start.z ?? snapped.point.z, label: valid ? CAD_SNAP_LABELS[snapped.snapKind] : "INVALID", stage: arcPointStage(method, points.length).toUpperCase(), x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          callbacksRef.current.onDragStatus({ distance: previewArc ? arcLength(previewArc) : anchor ? lineLength({ start: anchor, end: snapped.point }) : 0, kind: "arc", snapped: snapped.snapped, valid });
          return;
        }
        if (circleModeRef.current) {
          const points = circlePointsRef.current;
          const method = circleMethodRef.current;
          const anchor = points.at(-1) ?? null;
          const rawPoint = planPointFromPointer(points[0]?.z ?? activeElevationRef.current);
          if (!rawPoint) return;
          if (method === "tangent-tangent-radius" || method === "tangent-tangent-tangent") {
            const bounds = mount.getBoundingClientRect();
            const pickedConstraints = circleTangentConstraintsRef.current;
            const hovered = pickCircleTangentConstraint(rawPoint);
            const selectingRadius = method === "tangent-tangent-radius" && pickedConstraints.length === 2;
            renderer.domElement.style.cursor = hovered || selectingRadius ? "crosshair" : "not-allowed";
            snapMarker.visible = Boolean(hovered) && !selectingRadius;
            if (hovered) snapMarker.position.set(hovered.constraint.pick.x, hovered.constraint.pick.y, hovered.constraint.pick.z + 0.9);
            let circle: CircleGeometry | null = null;
            let radius = 0;
            if (method === "tangent-tangent-radius" && pickedConstraints.length === 2) {
              radius = snapToSixteenth(planarDistance(pickedConstraints[1].constraint.pick, rawPoint));
              circle = circleFromTwoTangenciesRadius(pickedConstraints[0].constraint, pickedConstraints[1].constraint, radius);
            } else if (method === "tangent-tangent-tangent" && pickedConstraints.length === 2 && hovered && !pickedConstraints.some((candidate) => candidate.key === hovered.key)) {
              circle = circleFromThreeTangencies(pickedConstraints[0].constraint, pickedConstraints[1].constraint, hovered.constraint);
              radius = circle?.radius ?? 0;
            }
            if (circle) {
              updateViewportCircle({ geometry: linePreviewGeometry, line: linePreview }, circle, 0.8);
              linePreview.computeLineDistances();
              linePreview.visible = true;
            } else {
              linePreview.visible = false;
            }
            setDynamicCircleInput({ elevation: points[0]?.z ?? rawPoint.z, label: selectingRadius ? "RADIUS" : hovered ? "TANGENT" : "SELECT OBJECT", radius, stage: circlePointStage(method, pickedConstraints.length).toUpperCase(), x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
            callbacksRef.current.onDragStatus({ distance: radius, kind: "circle", snapped: Boolean(hovered), valid: method === "tangent-tangent-radius" && pickedConstraints.length === 2 ? Boolean(circle) : Boolean(hovered) });
            return;
          }
          const snapped = snapCadPoint(rawPoint, null, anchor, Boolean(anchor));
          circleCursorRef.current = snapped.point;
          snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
          snapMarker.visible = snapped.snapped || points.length > 0;
          renderer.domElement.style.cursor = "crosshair";
          const bounds = mount.getBoundingClientRect();
          if (circlePointCompletes(method, points.length)) {
            const circle = circleGeometryFromPointer(method, points, snapped.point);
            if (circle) {
              updateViewportCircle({ geometry: linePreviewGeometry, line: linePreview }, circle, 0.8);
              linePreview.computeLineDistances();
              linePreview.visible = true;
              if (anchor) updateTrackingGuide(anchor, snapped.point, snapped.snapKind, snapped.guideOrigin);
              setDynamicCircleInput({ elevation: circle.center.z, label: CAD_SNAP_LABELS[snapped.snapKind], radius: circle.radius, stage: circlePointStage(method, points.length).toUpperCase(), x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
              callbacksRef.current.onDragStatus({ distance: circle.radius, kind: "circle", polarAngle: snapped.polarAngle, snapped: snapped.snapped, valid: true });
            } else {
              linePreview.visible = false;
              setDynamicCircleInput({ elevation: points[0]?.z ?? snapped.point.z, label: "INVALID", radius: 0, stage: circlePointStage(method, points.length).toUpperCase(), x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
              callbacksRef.current.onDragStatus({ distance: 0, kind: "circle", snapped: snapped.snapped, valid: false });
            }
          } else if (anchor) {
            updateViewportLine({ geometry: linePreviewGeometry, line: linePreview }, { start: anchor, end: snapped.point }, 0.8);
            linePreview.computeLineDistances();
            linePreview.visible = true;
            updateTrackingGuide(anchor, snapped.point, snapped.snapKind, snapped.guideOrigin);
            setDynamicCircleInput({ elevation: points[0].z, label: CAD_SNAP_LABELS[snapped.snapKind], radius: 0, stage: circlePointStage(method, points.length).toUpperCase(), x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
            callbacksRef.current.onDragStatus({ distance: planarDistance(anchor, snapped.point), kind: "circle", snapped: snapped.snapped, valid: true });
          } else {
            linePreview.visible = false;
            trackingGuide.visible = false;
            setDynamicCircleInput({ elevation: snapped.point.z, label: CAD_SNAP_LABELS[snapped.snapKind], radius: 0, stage: circlePointStage(method, points.length).toUpperCase(), x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
            callbacksRef.current.onDragStatus({ distance: 0, kind: "circle", snapped: snapped.snapped, valid: true });
          }
          return;
        }
        if (rectangleModeRef.current) {
          const rawPoint = planPointFromPointer(rectangleStartRef.current?.z ?? activeElevationRef.current);
          if (!rawPoint) return;
          const snapped = snapCadPoint(rawPoint, null, rectangleStartRef.current, Boolean(rectangleStartRef.current));
          rectangleCursorRef.current = snapped.point;
          rectangleEscapeArmedRef.current = false;
          snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
          snapMarker.visible = snapped.snapped || Boolean(rectangleStartRef.current);
          renderer.domElement.style.cursor = "crosshair";
          const bounds = mount.getBoundingClientRect();
          if (rectangleStartRef.current) {
            const dimensions = rectangleDraftDimensions(rectangleStartRef.current, snapped.point, rectangleDraftSettingsRef.current);
            const rectangle = rectangleFromDraftSettings(rectangleStartRef.current, snapped.point, rectangleDraftSettingsRef.current);
            if (rectangle) {
              updateViewportPolyline({ geometry: linePreviewGeometry, line: linePreview }, rectangle, 0.8);
              linePreview.computeLineDistances();
              linePreview.visible = true;
              updateTrackingGuide(rectangleStartRef.current, snapped.point, snapped.snapKind, snapped.guideOrigin);
              setDynamicRectangleInput({ elevation: rectangleStartRef.current.z, height: dimensions.height, label: CAD_SNAP_LABELS[snapped.snapKind], width: dimensions.width, x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
              callbacksRef.current.onDragStatus({ distance: Math.hypot(snapped.point.x - rectangleStartRef.current.x, snapped.point.y - rectangleStartRef.current.y), kind: "rectangle", snapped: snapped.snapped, valid: true });
            }
          } else {
            trackingGuide.visible = false;
            setDynamicRectangleInput({ elevation: snapped.point.z, height: 0, label: CAD_SNAP_LABELS[snapped.snapKind], width: 0, x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          }
          return;
        }
        if (polylineModeRef.current) {
          const rawPoint = planPointFromPointer(polylinePointsRef.current.length ? polylineElevationRef.current : activeElevationRef.current);
          if (!rawPoint) return;
          const previous = polylinePointsRef.current.at(-1);
          const anchor = previous ? { ...previous, z: polylineElevationRef.current } : null;
          const snapped = snapCadPoint(rawPoint, null, anchor, Boolean(anchor));
          polylineCursorRef.current = snapped.point;
          polylineEscapeArmedRef.current = false;
          snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
          snapMarker.visible = snapped.snapped || polylinePointsRef.current.length > 0;
          renderer.domElement.style.cursor = "crosshair";
          const bounds = mount.getBoundingClientRect();
          if (polylinePointsRef.current.length) {
            const previous = polylinePointsRef.current.at(-1)!;
            const through = polylineArcThroughRef.current;
            const previewBulge = polylineSegmentModeRef.current === "arc" && through
              ? polylineBulgeFromThreePoints(previous, through, snapped.point)
              : 0;
            const vertices = through && polylineSegmentModeRef.current === "arc" && previewBulge === null
              ? [...polylinePointsRef.current, through]
              : [...polylinePointsRef.current, snapped.point];
            const bulges = [...polylineBulgesRef.current, previewBulge ?? 0];
            updateViewportPolyline({ geometry: linePreviewGeometry, line: linePreview }, { bulges, closed: false, elevation: polylineElevationRef.current, vertices, width: polylineWidthRef.current }, 0.8);
            linePreview.computeLineDistances();
            linePreview.visible = true;
            const geometry = { start: anchor!, end: snapped.point };
            const angle = lineAngle(geometry);
            const distance = lineLength(geometry);
            updateTrackingGuide(anchor!, snapped.point, snapped.snapKind, snapped.guideOrigin);
            setDynamicPolylineInput({ angle, distance, elevation: polylineElevationRef.current, label: polylineSegmentModeRef.current === "arc" ? through ? "ARC END" : "ARC THROUGH" : CAD_SNAP_LABELS[snapped.snapKind], x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
            callbacksRef.current.onDragStatus({ angle, distance, kind: "polyline", polarAngle: snapped.polarAngle, snapped: snapped.snapped, valid: true });
          } else {
            trackingGuide.visible = false;
            setDynamicPolylineInput({ angle: 0, distance: 0, elevation: snapped.point.z, label: CAD_SNAP_LABELS[snapped.snapKind], x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          }
          return;
        }
        if (lineModeRef.current) {
          const rawPoint = planPointFromPointer(lineStartRef.current?.z ?? activeElevationRef.current);
          if (!rawPoint) return;
          const snapped = snapLineCandidate(rawPoint);
          lineEscapeArmedRef.current = false;
          lineCursorRef.current = snapped.point;
          snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
          snapMarker.visible = snapped.snapped || Boolean(lineStartRef.current);
          renderer.domElement.style.cursor = "crosshair";
          const bounds = mount.getBoundingClientRect();
          if (lineStartRef.current) {
            const currentGeometry = { start: lineStartRef.current, end: snapped.point };
            const currentAngle = lineAngle(currentGeometry);
            const currentDistance = lineLength(currentGeometry);
            updateViewportLine({ geometry: linePreviewGeometry, line: linePreview }, { start: lineStartRef.current, end: snapped.point }, 0.8);
            linePreview.computeLineDistances();
            linePreview.visible = true;
            updateTrackingGuide(lineStartRef.current, snapped.point, snapped.snapKind, snapped.guideOrigin);
            setDynamicLineInput({
              angle: currentAngle,
              distance: currentDistance,
              elevation: lineStartRef.current.z,
              label: CAD_SNAP_LABELS[snapped.snapKind],
              x: event.clientX - bounds.left + 16,
              y: event.clientY - bounds.top + 16,
            });
            callbacksRef.current.onDragStatus({
              angle: currentAngle,
              distance: currentDistance,
              kind: "line",
              polarAngle: snapped.polarAngle,
              snapped: snapped.snapped,
              valid: true,
            });
          } else {
            trackingGuide.visible = false;
            setDynamicLineInput({ angle: 0, distance: 0, elevation: snapped.point.z, label: CAD_SNAP_LABELS[snapped.snapKind], x: event.clientX - bounds.left + 16, y: event.clientY - bounds.top + 16 });
          }
          return;
        }
        linePreview.visible = false;
        trackingGuide.visible = false;
        setDynamicArcInput(null);
        setDynamicCircleInput(null);
        setDynamicLineInput(null);
        setDynamicPolylineInput(null);
        setDynamicRectangleInput(null);
        snapMarker.visible = false;
        const rotationHover = rotationGizmo.group.visible
          ? raycaster.intersectObject(rotationGizmo.ring, false)[0]
          : undefined;
        if (rotationHover) {
          setHoveredGrip(null);
          setHoveredEntityKey(null);
          renderer.domElement.style.cursor = "alias";
          return;
        }
        const hoverHit = boxGripSet.group.visible
          ? raycaster.intersectObjects(boxGripSet.handles, false)[0]
          : undefined;
        if (hoverHit?.object instanceof THREE.Mesh) {
          setHoveredGrip(hoverHit.object);
          setHoveredEntityKey(null);
          return;
        }
        setHoveredGrip(null);
        const hoverCandidate = entityHitCandidates()[0];
        setHoveredEntityKey(hoverCandidate ? cadEntityKey(hoverCandidate.ref) : null);
        renderer.domElement.style.cursor = hoverCandidate ? "pointer" : "default";
        return;
      }
      if (event.pointerId !== drag.pointerId) return;
      const pixelDistance = Math.hypot(
        event.clientX - drag.startClientX,
        event.clientY - drag.startClientY,
      );
      if (!drag.active && pixelDistance < 3) return;
      drag.active = true;
      controls.enabled = false;
      mount.classList.add(drag.kind === "face" || drag.kind === "grip" ? "is-dragging-face" : drag.kind === "rotate" || drag.kind === "scale" ? "is-dragging-rotation" : "is-dragging-object");

      setPointer(event);
      const currentPoint = raycaster.ray.intersectPlane(
        drag.plane,
        new THREE.Vector3(),
      );
      if (!currentPoint) return;

      if (drag.kind === "line-grip" && drag.lineGrip) {
        const source = findLineObject(drag.before, drag.objectId);
        const trackingAnchor = source
          ? drag.lineGrip === "start"
            ? source.end
            : drag.lineGrip === "end"
              ? source.start
              : lineMidpoint(source)
          : null;
        const snapped = snapCadPoint(
          { x: currentPoint.x, y: currentPoint.y, z: currentPoint.z },
          drag.objectId,
          trackingAnchor,
          true,
        );
        const next = updateLineGrip(drag.before, drag.objectId, drag.lineGrip, snapped.point);
        const nextLine = next ? findLineObject(next, drag.objectId) : null;
        callbacksRef.current.onDragStatus({
          angle: nextLine ? lineAngle(nextLine) : source ? lineAngle(source) : 0,
          distance: nextLine ? lineLength(nextLine) : source ? lineLength(source) : 0,
          kind: "line-grip",
          snapped: snapped.snapped,
          valid: Boolean(next),
        });
        snapMarker.position.set(snapped.point.x, snapped.point.y, snapped.point.z + 0.9);
        snapMarker.visible = snapped.snapped;
        if (!next) return;
        drag.lastValid = next;
        callbacksRef.current.onDragPreview(next);
        return;
      }

      if (drag.kind === "circle-grip" && drag.circleGrip) {
        const source = findCircleObject(drag.before, drag.objectId);
        const elevation = source?.center.z ?? 0;
        const snapped = snapCadPoint({ x: currentPoint.x, y: currentPoint.y, z: elevation }, drag.objectId);
        const next = updateCircleGrip(drag.before, drag.objectId, drag.circleGrip, snapped.point);
        const nextCircle = next ? findCircleObject(next, drag.objectId) : null;
        callbacksRef.current.onDragStatus({ distance: nextCircle?.radius ?? source?.radius ?? 0, kind: "circle-grip", snapped: snapped.snapped, valid: Boolean(next) });
        snapMarker.position.set(snapped.point.x, snapped.point.y, elevation + 0.9);
        snapMarker.visible = snapped.snapped;
        if (!next) return;
        drag.lastValid = next;
        callbacksRef.current.onDragPreview(next);
        return;
      }

      if (drag.kind === "arc-grip" && drag.arcGrip) {
        const source = findArcObject(drag.before, drag.objectId);
        const elevation = source?.center.z ?? 0;
        const snapped = snapCadPoint({ x: currentPoint.x, y: currentPoint.y, z: elevation }, drag.objectId);
        const next = updateArcGrip(drag.before, drag.objectId, drag.arcGrip, snapped.point);
        const nextArc = next ? findArcObject(next, drag.objectId) : null;
        callbacksRef.current.onDragStatus({ distance: nextArc ? arcLength(nextArc) : source ? arcLength(source) : 0, kind: "arc-grip", snapped: snapped.snapped, valid: Boolean(next) });
        snapMarker.position.set(snapped.point.x, snapped.point.y, elevation + 0.9);
        snapMarker.visible = snapped.snapped;
        if (!next) return;
        drag.lastValid = next;
        callbacksRef.current.onDragPreview(next);
        return;
      }

      if (drag.kind === "polyline-grip" && (drag.polylineVertex !== undefined || drag.polylineGrip)) {
        const source = findPolylineObject(drag.before, drag.objectId);
        const elevation = source?.elevation ?? 0;
        const snapped = snapCadPoint({ x: currentPoint.x, y: currentPoint.y, z: elevation }, drag.objectId);
        const next = drag.polylineGrip
          ? updatePolylineObjectGrip(drag.before, drag.objectId, drag.polylineGrip, snapped.point)
          : updatePolylineObjectVertex(drag.before, drag.objectId, drag.polylineVertex!, snapped.point);
        const nextPolyline = next ? findPolylineObject(next, drag.objectId) : null;
        callbacksRef.current.onDragStatus({ distance: nextPolyline ? polylineLength(nextPolyline) : 0, kind: "polyline-grip", snapped: snapped.snapped, valid: Boolean(next) });
        snapMarker.position.set(snapped.point.x, snapped.point.y, elevation + 0.9);
        snapMarker.visible = snapped.snapped;
        if (!next) return;
        drag.lastValid = next;
        callbacksRef.current.onDragPreview(next);
        return;
      }

      if (drag.kind === "rotate" && drag.rotationBase && drag.startAngle !== undefined) {
        const currentAngle = Math.atan2(
          currentPoint.y - drag.rotationBase.y,
          currentPoint.x - drag.rotationBase.x,
        );
        const rawDegrees = (currentAngle - drag.startAngle) * 180 / Math.PI;
        const angle = snapRotationAngle(rawDegrees, event.shiftKey ? 1 : 15);
        const next = rotateModelEntities(
          drag.before,
          selectedModifyRefs(),
          { x: drag.rotationBase.x, y: drag.rotationBase.y, z: drag.rotationBase.z },
          angle,
        );
        callbacksRef.current.onDragStatus({
          angle,
          distance: 0,
          kind: "rotate",
          snapped: true,
          valid: Boolean(next),
        });
        if (!next) return;
        drag.lastValid = next;
        callbacksRef.current.onDragPreview(next);
        return;
      }

      if (drag.kind === "scale" && drag.scaleBase && drag.scaleStartDistance) {
        const currentDistance = currentPoint.distanceTo(drag.scaleBase);
        const increment = event.shiftKey ? 0.01 : 0.1;
        const factor = Math.max(0.01, Math.round((currentDistance / drag.scaleStartDistance) / increment) * increment);
        const next = scaleModelEntities(
          drag.before,
          selectedModifyRefs(),
          { x: drag.scaleBase.x, y: drag.scaleBase.y, z: drag.scaleBase.z },
          factor,
        );
        callbacksRef.current.onDragStatus({
          distance: currentDistance,
          factor: Math.round(factor * 100) / 100,
          kind: "scale",
          snapped: true,
          valid: Math.abs(factor - 1) < 0.0001 || Boolean(next),
        });
        if (!next) return;
        drag.lastValid = next;
        callbacksRef.current.onDragPreview(next);
        return;
      }

      const worldMovement = currentPoint.clone().sub(drag.startPoint);
      if (drag.kind === "plan-move") {
        const xMovement = snapObjectMoveDistance(
          drag.before,
          drag.objectId,
          "x",
          snapToSixteenth(worldMovement.x),
        );
        const movedX = moveBoxObject(drag.before, drag.objectId, "x", xMovement.distance);
        const yMovement = snapObjectMoveDistance(
          movedX ?? drag.before,
          drag.objectId,
          "y",
          snapToSixteenth(worldMovement.y),
        );
        const next = movedX
          ? moveBoxObject(movedX, drag.objectId, "y", yMovement.distance)
          : null;
        callbacksRef.current.onDragStatus({
          axisDistances: { x: xMovement.distance, y: yMovement.distance },
          distance: Math.hypot(xMovement.distance, yMovement.distance),
          kind: "plan-move",
          snapped: xMovement.snapped || yMovement.snapped,
          valid: Boolean(next),
        });
        if (!next) return;
        drag.lastValid = next;
        callbacksRef.current.onDragPreview(next);
        return;
      }
      if (drag.kind === "grip" && drag.grip) {
        // Capture the narrowed grip: `drag` is a mutable closure variable, so the
        // narrowing above does not survive into these callbacks.
        const grip = drag.grip;
        const sourceBox = findBoxObject(drag.before, drag.objectId);
        const coordinateDeltas = Object.fromEntries(
          grip.axes.map((axis) => {
            const localAxis = sourceBox ? boxLocalAxis(sourceBox, axis) : { x: 0, y: 0, z: 0 };
            const projected = worldMovement.x * localAxis.x + worldMovement.y * localAxis.y + worldMovement.z * localAxis.z;
            return [axis, snapToSixteenth(projected)];
          }),
        ) as Partial<Record<AxisKey, number>>;
        const outwardDistances = Object.fromEntries(
          grip.axes.map((axis) => [
            axis,
            snapToSixteenth((coordinateDeltas[axis] ?? 0) * grip.signs[axis]),
          ]),
        ) as Partial<Record<AxisKey, number>>;
        const nextBox = sourceBox
          ? resizeBoxFromGrip(sourceBox, grip, coordinateDeltas)
          : null;
        const dominantDistance = grip.axes.reduce((largest, axis) => {
          const distance = outwardDistances[axis] ?? 0;
          return Math.abs(distance) > Math.abs(largest) ? distance : largest;
        }, 0);
        callbacksRef.current.onDragStatus({
          axisDistances: outwardDistances,
          distance: dominantDistance,
          gripKind: grip.kind,
          kind: "grip",
          valid: Boolean(nextBox),
        });
        if (!nextBox) return;
        const next = updateBoxObject(drag.before, drag.objectId, nextBox);
        if (!next) return;
        drag.lastValid = next;
        callbacksRef.current.onDragPreview(next);
        return;
      }

      const axisMovement = worldMovement.dot(drag.axis);
      if (drag.kind === "object" || drag.kind === "copy") {
        const selectedIds = selectedObjectIdsRef.current;
        const gridMovement = snapToSixteenth(axisMovement);
        const movement = selectedIds.length > 1
          ? { distance: gridMovement, snapped: false }
          : snapObjectMoveDistance(drag.before, drag.objectId, drag.axisKey, gridMovement);
        const copyResult = drag.kind === "copy"
          ? copyBoxObjects(drag.before, selectedIds, drag.axisKey, movement.distance)
          : null;
        const next = drag.kind === "copy"
          ? copyResult?.document ?? null
          : selectedIds.length > 1
            ? moveBoxObjects(drag.before, selectedIds, drag.axisKey, movement.distance)
            : moveBoxObject(drag.before, drag.objectId, drag.axisKey, movement.distance);
        callbacksRef.current.onDragStatus({
          axis: drag.axisKey,
          distance: movement.distance,
          kind: drag.kind,
          snapped: movement.snapped,
          valid: Boolean(next),
        });
        if (!next) return;
        drag.lastValid = next;
        callbacksRef.current.onDragPreview(next);
        return;
      }

      const outwardDistance = snapToSixteenth(axisMovement * drag.sign);
      const sourceBox = findBoxObject(drag.before, drag.objectId);
      const nextBox = sourceBox && drag.faceIndex !== null
        ? moveBoxFace(sourceBox, drag.faceIndex, outwardDistance)
        : null;
      callbacksRef.current.onDragStatus({
        distance: outwardDistance,
        kind: "face",
        valid: Boolean(nextBox),
      });
      if (!nextBox) return;
      const next = updateBoxObject(drag.before, drag.objectId, nextBox);
      if (!next) return;
      drag.lastValid = next;
      callbacksRef.current.onDragPreview(next);
    };

    const finishDrag = (event: PointerEvent, commit: boolean) => {
      if (selectionDrag && event.pointerId === selectionDrag.pointerId) {
        const completed = selectionDrag;
        selectionDrag = null;
        controls.enabled = true;
        setSelectionBox(null);
        if (renderer.domElement.hasPointerCapture(event.pointerId)) {
          renderer.domElement.releasePointerCapture(event.pointerId);
        }
        if (!commit) return;
        if (!completed.active) {
          if (completed.purpose === "stretch") {
            callbacksRef.current.onStretchTargetsChange([], "crossing");
          } else {
            callbacksRef.current.onSelectionWindow([], completed.additive, "window");
          }
          return;
        }
        if (completed.purpose === "stretch") {
          const result = selectScreenStretchTargets(
            screenStretchGeometries(),
            completed.start,
            completed.current,
          );
          callbacksRef.current.onStretchTargetsChange(result.targets, result.mode);
          return;
        }
        const result = selectScreenGeometries(
          screenSelectionGeometries(),
          completed.start,
          completed.current,
        );
        callbacksRef.current.onSelectionWindow(result.refs, completed.additive, result.mode);
        return;
      }
      if (!drag || event.pointerId !== drag.pointerId) return;
      const completed = drag;
      drag = null;
      controls.enabled = true;
      mount.classList.remove("is-dragging-face", "is-dragging-object", "is-dragging-rotation");
      callbacksRef.current.onDragStatus(null);
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }

      if (completed.active && commit) {
        callbacksRef.current.onDragCommit(completed.before, completed.lastValid);
      } else if (completed.active) {
        callbacksRef.current.onDragCancel(completed.before);
      } else if (
        commit &&
        completed.kind === "grip" &&
        completed.grip?.kind === "face" &&
        completed.faceIndex !== null
      ) {
        const bounds = renderer.domElement.getBoundingClientRect();
        setActiveGripInput({
          axis: completed.axisKey,
          faceIndex: completed.faceIndex,
          objectId: completed.objectId,
          x: Math.min(Math.max(completed.startClientX - bounds.left + 14, 12), Math.max(bounds.width - 172, 12)),
          y: Math.min(Math.max(completed.startClientY - bounds.top - 18, 64), Math.max(bounds.height - 70, 64)),
        });
        setGripDraft("");
        setGripInputError("");
        callbacksRef.current.onDragStatus({
          axis: completed.axisKey,
          distance: 0,
          gripKind: "face",
          kind: "entry",
          valid: true,
        });
      }
    };

    const cancelWithEscape = (event: KeyboardEvent) => {
      if (
        event.key === "Tab" &&
        (arcModeRef.current || circleModeRef.current || lineModeRef.current || polylineModeRef.current || rectangleModeRef.current) &&
        objectSnapCycleCountRef.current > 1
      ) {
        event.preventDefault();
        objectSnapCycleIndexRef.current = (objectSnapCycleIndexRef.current + 1) % objectSnapCycleCountRef.current;
        if (lastDrawingPointerEvent) moveDrag(lastDrawingPointerEvent);
        callbacksRef.current.onLineCommandFeedback({
          message: `Snap choice ${objectSnapCycleIndexRef.current + 1} of ${objectSnapCycleCountRef.current}.`,
          tone: "success",
        });
        return;
      }
      if (
        event.key === "Tab" &&
        selectionCycleState &&
        selectionCycleCandidates.length > 1 &&
        performance.now() - selectionCycleState.updatedAt <= 2400
      ) {
        event.preventDefault();
        const nextIndex = (selectionCycleState.index + 1) % selectionCycleCandidates.length;
        selectionCycleState = { ...selectionCycleState, index: nextIndex, updatedAt: performance.now() };
        const candidate = selectionCycleCandidates[nextIndex];
        selectHitCandidate(candidate, false, false);
        showSelectionCycle(selectionCycleCandidates, nextIndex, selectionCycleState.point);
        callbacksRef.current.onLineCommandFeedback({ message: `Selection cycling: ${entityDisplayName(candidate.ref)} (${nextIndex + 1} of ${selectionCycleCandidates.length}).`, tone: "info" });
        return;
      }
      if (event.key !== "Escape") return;
      acquiredTrackingPointsRef.current = [];
      objectSnapHoverRef.current = null;
      objectSnapCycleIndexRef.current = 0;
      objectSnapCycleCountRef.current = 0;
      if (objectSnapAcquisitionTimerRef.current !== null) window.clearTimeout(objectSnapAcquisitionTimerRef.current);
      objectSnapAcquisitionTimerRef.current = null;
      setSelectionCycle(null);
      selectionCycleState = null;
      selectionCycleCandidates = [];
      if (selectionDrag) {
        event.preventDefault();
        const canceled = selectionDrag;
        selectionDrag = null;
        controls.enabled = true;
        setSelectionBox(null);
        if (renderer.domElement.hasPointerCapture(canceled.pointerId)) {
          renderer.domElement.releasePointerCapture(canceled.pointerId);
        }
        return;
      }
      if (boundaryModeRef.current && !drag) {
        event.preventDefault();
        linePreview.visible = false;
        trackingGuide.visible = false;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onBoundaryFinishRequested(true);
        callbacksRef.current.onLineCommandFeedback({ message: "Boundary canceled.", tone: "success" });
        return;
      }
      if ((moveModeRef.current || copyModeRef.current || stretchModeRef.current) && !drag) {
        event.preventDefault();
        const before = modifyBeforeRef.current;
        if (before) callbacksRef.current.onDragCancel(before);
        clearModifyPreview();
        if (stretchModeRef.current) callbacksRef.current.onStretchFinishRequested(true);
        else callbacksRef.current.onModifyFinishRequested(true);
        callbacksRef.current.onLineCommandFeedback({
          message: `${stretchModeRef.current ? "Stretch" : copyModeRef.current ? "Copy" : "Move"} canceled.`,
          tone: "success",
        });
        return;
      }
      if (mirrorModeRef.current && !drag) {
        event.preventDefault();
        const before = mirrorBeforeRef.current;
        if (before) callbacksRef.current.onDragCancel(before);
        mirrorAxisStartRef.current = null;
        mirrorBeforeRef.current = null;
        linePreview.visible = false;
        trackingGuide.visible = false;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onMirrorFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: "Mirror canceled.", tone: "success" });
        return;
      }
      if (lengthenModeRef.current && !drag) {
        event.preventDefault();
        const before = lengthenBeforeRef.current;
        if (before) callbacksRef.current.onDragCancel(before);
        lengthenBeforeRef.current = null;
        lengthenEndpointRef.current = null;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onLengthenFinishRequested(true);
        callbacksRef.current.onLineCommandFeedback({ message: "Lengthen canceled.", tone: "success" });
        return;
      }
      if (breakModeRef.current && !drag) {
        event.preventDefault();
        const before = breakBeforeRef.current;
        if (before) callbacksRef.current.onDragCancel(before);
        breakBeforeRef.current = null;
        breakTargetRef.current = null;
        breakFirstPointRef.current = null;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onBreakStageChange(0);
        callbacksRef.current.onBreakFinishRequested(true);
        callbacksRef.current.onLineCommandFeedback({ message: `${breakModeRef.current === "break" ? "Break" : "Break at Point"} canceled.`, tone: "success" });
        return;
      }
      if (offsetModeRef.current && !drag) {
        event.preventDefault();
        const before = offsetBeforeRef.current;
        if (before) callbacksRef.current.onDragCancel(before);
        offsetBeforeRef.current = null;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onOffsetFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: "Offset canceled.", tone: "success" });
        return;
      }
      if (chamferModeRef.current && !drag) {
        event.preventDefault();
        const before = chamferBeforeRef.current;
        if (before) callbacksRef.current.onDragCancel(before);
        chamferBeforeRef.current = null;
        chamferFirstPickRef.current = null;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onChamferStageChange(0);
        callbacksRef.current.onChamferFinishRequested(true);
        callbacksRef.current.onLineCommandFeedback({ message: "Chamfer canceled.", tone: "success" });
        return;
      }
      if (filletModeRef.current && !drag) {
        event.preventDefault();
        const before = filletBeforeRef.current;
        if (before) callbacksRef.current.onDragCancel(before);
        filletBeforeRef.current = null;
        filletFirstPickRef.current = null;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onFilletStageChange(0);
        callbacksRef.current.onFilletFinishRequested(true);
        callbacksRef.current.onLineCommandFeedback({ message: "Fillet canceled.", tone: "success" });
        return;
      }
      if ((trimModeRef.current || extendModeRef.current) && !drag) {
        event.preventDefault();
        const before = trimExtendBeforeRef.current;
        if (before) callbacksRef.current.onDragCancel(before);
        const operation = trimModeRef.current ? "Trim" : "Extend";
        trimExtendBeforeRef.current = null;
        snapMarker.visible = false;
        setDynamicLineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onTrimExtendFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: `${operation} canceled.`, tone: "success" });
        return;
      }
      if (rotateModeRef.current && !drag) {
        event.preventDefault();
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onRotateFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: "Rotate canceled.", tone: "success" });
        return;
      }
      if (scaleModeRef.current && !drag) {
        event.preventDefault();
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onScaleFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: "Scale canceled.", tone: "success" });
        return;
      }
      if (arcModeRef.current && !drag) {
        event.preventDefault();
        arcPointsRef.current = [];
        arcCursorRef.current = null;
        callbacksRef.current.onArcPointsChange([]);
        linePreview.visible = false;
        trackingGuide.visible = false;
        snapMarker.visible = false;
        setDynamicArcInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onArcFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: "Arc canceled. Press Enter to repeat Arc.", tone: "success" });
        return;
      }
      if (circleModeRef.current && !drag) {
        event.preventDefault();
        circlePointsRef.current = [];
        circleTangentConstraintsRef.current = [];
        circleCursorRef.current = null;
        callbacksRef.current.onCirclePointsChange([]);
        linePreview.visible = false;
        trackingGuide.visible = false;
        snapMarker.visible = false;
        setDynamicCircleInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onCircleFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: "Circle canceled. Press Enter to repeat Circle.", tone: "success" });
        return;
      }
      if (polylineModeRef.current && !drag) {
        event.preventDefault();
        const vertices = polylinePointsRef.current;
        const created = vertices.length >= 2 && callbacksRef.current.onPolylineCreate({ bulges: polylineBulgesRef.current, closed: false, elevation: polylineElevationRef.current, vertices, width: polylineWidthRef.current }, "polyline");
        polylinePointsRef.current = [];
        polylineBulgesRef.current = [];
        polylineArcThroughRef.current = null;
        polylineCursorRef.current = null;
        polylineEscapeArmedRef.current = false;
        callbacksRef.current.onPolylineAnchorChange(null);
        linePreview.visible = false;
        trackingGuide.visible = false;
        snapMarker.visible = false;
        setDynamicPolylineInput(null);
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onPolylineFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: created ? "Finished the open Polyline. Press Enter to repeat Polyline." : "Polyline canceled.", tone: "success" });
        return;
      }
      if (rectangleModeRef.current && !drag) {
        event.preventDefault();
        rectangleStartRef.current = null;
        rectangleCursorRef.current = null;
        rectangleEscapeArmedRef.current = false;
        callbacksRef.current.onRectangleAnchorChange(null);
        linePreview.visible = false;
        trackingGuide.visible = false;
        setDynamicRectangleInput(null);
        snapMarker.visible = false;
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onRectangleFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: "Rectangle canceled.", tone: "success" });
        return;
      }
      if (lineModeRef.current && !drag) {
        event.preventDefault();
        lineStartRef.current = null;
        lineCursorRef.current = null;
        linePointHistoryRef.current = [];
        lineEscapeArmedRef.current = false;
        callbacksRef.current.onLineAnchorChange(null);
        linePreview.visible = false;
        trackingGuide.visible = false;
        setDynamicLineInput(null);
        snapMarker.visible = false;
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onLineFinishRequested();
        callbacksRef.current.onLineCommandFeedback({ message: "Line canceled. Press Enter to repeat Line.", tone: "success" });
        return;
      }
      if (!drag) {
        arcPointsRef.current = [];
        arcCursorRef.current = null;
        callbacksRef.current.onArcPointsChange([]);
        lineStartRef.current = null;
        lineCursorRef.current = null;
        linePointHistoryRef.current = [];
        lineEscapeArmedRef.current = false;
        callbacksRef.current.onLineAnchorChange(null);
        polylinePointsRef.current = [];
        polylineCursorRef.current = null;
        polylineEscapeArmedRef.current = false;
        callbacksRef.current.onPolylineAnchorChange(null);
        rectangleStartRef.current = null;
        rectangleCursorRef.current = null;
        rectangleEscapeArmedRef.current = false;
        callbacksRef.current.onRectangleAnchorChange(null);
        linePreview.visible = false;
        trackingGuide.visible = false;
        setDynamicRectangleInput(null);
        snapMarker.visible = false;
        callbacksRef.current.onDragStatus(null);
        callbacksRef.current.onSelectionWindow([], false, "window");
        return;
      }
      const canceled = drag;
      drag = null;
      controls.enabled = true;
      mount.classList.remove("is-dragging-face", "is-dragging-object", "is-dragging-rotation");
      callbacksRef.current.onDragStatus(null);
      callbacksRef.current.onDragCancel(canceled.before);
      if (canceled.kind === "rotate") callbacksRef.current.onRotateFinishRequested();
      if (canceled.kind === "scale") callbacksRef.current.onScaleFinishRequested();
      if (renderer.domElement.hasPointerCapture(canceled.pointerId)) {
        renderer.domElement.releasePointerCapture(canceled.pointerId);
      }
    };
    const clearGripHover = () => {
      setHoveredGrip(null);
      setHoveredEntityKey(null);
      renderer.domElement.style.cursor = "default";
    };
    const commitPointerDrag = (event: PointerEvent) => finishDrag(event, true);
    const cancelPointerDrag = (event: PointerEvent) => finishDrag(event, false);

    renderer.domElement.addEventListener("pointerdown", selectAndPrepareDrag);
    renderer.domElement.addEventListener("pointermove", moveDrag);
    renderer.domElement.addEventListener("pointerleave", clearGripHover);
    renderer.domElement.addEventListener("pointerup", commitPointerDrag);
    renderer.domElement.addEventListener("pointercancel", cancelPointerDrag);
    window.addEventListener("keydown", cancelWithEscape);

    const resize = () => {
      const { clientWidth, clientHeight } = mount;
      if (!clientWidth || !clientHeight) return;
      renderer.setSize(clientWidth, clientHeight, false);
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
      } else {
        fitView(viewTargetRef.current);
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    let animationFrame = 0;
    let activePreviewMode: "arc" | "boundary" | "break" | "chamfer" | "circle" | "extend" | "fillet" | "line" | "mirror" | "offset" | "polyline" | "rectangle" | "trim" | null = null;
    const render = () => {
      animationFrame = requestAnimationFrame(render);
      const nextPreviewMode = arcModeRef.current
        ? "arc"
        : boundaryModeRef.current
        ? "boundary"
        : breakModeRef.current
        ? "break"
        : chamferModeRef.current
        ? "chamfer"
        : circleModeRef.current
        ? "circle"
        : lineModeRef.current
        ? "line"
        : mirrorModeRef.current
          ? "mirror"
        : offsetModeRef.current
          ? "offset"
        : filletModeRef.current
          ? "fillet"
        : trimModeRef.current
          ? "trim"
        : extendModeRef.current
          ? "extend"
        : polylineModeRef.current
          ? "polyline"
          : rectangleModeRef.current
            ? "rectangle"
            : null;
      if (nextPreviewMode !== activePreviewMode) {
        activePreviewMode = nextPreviewMode;
        linePreview.visible = false;
        trackingGuide.visible = false;
        snapMarker.visible = false;
        setDynamicArcInput(null);
        setDynamicCircleInput(null);
        setDynamicLineInput(null);
        setDynamicPolylineInput(null);
        setDynamicRectangleInput(null);
      }
      if (!arcModeRef.current && !boundaryModeRef.current && !breakModeRef.current && !chamferModeRef.current && !circleModeRef.current && !extendModeRef.current && !filletModeRef.current && !lengthenModeRef.current && !lineModeRef.current && !mirrorModeRef.current && !offsetModeRef.current && !polylineModeRef.current && !rectangleModeRef.current && !trimModeRef.current) {
        linePreview.visible = false;
        trackingGuide.visible = false;
        snapMarker.visible = false;
      }
      const pendingArcCommand = arcCommandRef.current;
      if (arcModeRef.current && pendingArcCommand && pendingArcCommand.id > processedArcCommandIdRef.current) {
        processedArcCommandIdRef.current = pendingArcCommand.id;
        const method = arcMethodRef.current;
        const continueSeed = arcContinueSeedRef.current;
        const points = arcPointsRef.current;
        const finishExactArc = (geometry: ArcGeometry | null) => {
          if (geometry && callbacksRef.current.onArcCreate(geometry)) {
            arcPointsRef.current = [];
            arcCursorRef.current = null;
            callbacksRef.current.onArcPointsChange([]);
            linePreview.visible = false;
            trackingGuide.visible = false;
            snapMarker.visible = false;
            setDynamicArcInput(null);
            callbacksRef.current.onDragStatus(null);
            callbacksRef.current.onArcFinishRequested();
            callbacksRef.current.onLineCommandFeedback({ message: `${arcMethodDefinition(method).label} Arc placed with a ${formatArchitectural(geometry.radius)} radius and ${Math.round(arcSweepAngle(geometry) * 100) / 100}° sweep. Press Enter to repeat Arc.`, tone: "success" });
          } else {
            callbacksRef.current.onLineCommandFeedback({ message: `Those inputs cannot form a valid ${arcMethodDefinition(method).label} Arc.`, tone: "error" });
          }
        };
        if (pendingArcCommand.kind === "scalar") {
          finishExactArc(arcGeometryFromMethodScalar(method, points, pendingArcCommand.scalar, pendingArcCommand.value));
        } else {
          const previous = method === "continue" ? continueSeed?.start ?? null : points.at(-1) ?? null;
          const coordinate = pendingArcCommand.kind === "coordinate"
            ? snapLinePoint(pendingArcCommand.point)
            : previous && arcCursorRef.current
              ? lineFromDirection(previous, { ...arcCursorRef.current, z: previous.z }, pendingArcCommand.distance)?.end ?? null
              : null;
          if (!coordinate) {
            callbacksRef.current.onLineCommandFeedback({ message: previous ? "Move the pointer to establish a direction before entering a distance." : `Specify the Arc ${arcPointStage(method, points.length)} first.`, tone: "error" });
          } else if ((points[0] || continueSeed?.start) && Math.abs(coordinate.z - (points[0] ?? continueSeed?.start ?? coordinate).z) >= 1 / 16) {
            callbacksRef.current.onLineCommandFeedback({ message: "Arc construction points must remain on one elevation plane.", tone: "error" });
          } else if (previous && lineLength({ start: previous, end: coordinate }) < 1 / 16) {
            callbacksRef.current.onLineCommandFeedback({ message: "Choose a different Arc input point.", tone: "error" });
          } else if (method !== "continue" && points.length < 2) {
            arcPointsRef.current = [...points, coordinate];
            arcCursorRef.current = coordinate;
            callbacksRef.current.onArcPointsChange(arcPointsRef.current);
            callbacksRef.current.onDragStatus({ distance: previous ? lineLength({ start: previous, end: coordinate }) : 0, kind: "arc", snapped: false, valid: true });
            callbacksRef.current.onLineCommandFeedback({ message: `Arc input accepted. Specify the ${arcPointStage(method, arcPointsRef.current.length)}.`, tone: "success" });
          } else {
            finishExactArc(arcGeometryFromMethodPointer(method, points, coordinate, continueSeed));
          }
        }
      }
      const pendingCircleCommand = circleCommandRef.current;
      if (circleModeRef.current && pendingCircleCommand && pendingCircleCommand.id > processedCircleCommandIdRef.current) {
        processedCircleCommandIdRef.current = pendingCircleCommand.id;
        const method = circleMethodRef.current;
        const points = circlePointsRef.current;
        const previous = points.at(-1) ?? null;
        const coordinate = pendingCircleCommand.kind === "coordinate"
          ? snapLinePoint(pendingCircleCommand.point)
          : pendingCircleCommand.kind === "distance" && previous && circleCursorRef.current
            ? lineFromDirection(previous, { ...circleCursorRef.current, z: previous.z }, pendingCircleCommand.distance)?.end ?? null
            : null;
        if (pendingCircleCommand.kind === "scalar") {
          const tangentConstraints = circleTangentConstraintsRef.current;
          const geometry = method === "tangent-tangent-radius" && tangentConstraints.length === 2
            ? circleFromTwoTangenciesRadius(tangentConstraints[0].constraint, tangentConstraints[1].constraint, pendingCircleCommand.value)
            : points[0] && method === "center-diameter"
            ? circleFromCenterDiameter(points[0], pendingCircleCommand.value)
            : points[0] && method === "center-radius"
              ? circleFromCenterRadius(points[0], pendingCircleCommand.value)
              : null;
          if (geometry && callbacksRef.current.onCircleCreate(geometry)) {
            circleTangentConstraintsRef.current = [];
            circlePointsRef.current = [];
            circleCursorRef.current = null;
            callbacksRef.current.onCirclePointsChange([]);
            linePreview.visible = false;
            trackingGuide.visible = false;
            snapMarker.visible = false;
            setDynamicCircleInput(null);
            callbacksRef.current.onDragStatus(null);
            callbacksRef.current.onCircleFinishRequested();
            callbacksRef.current.onLineCommandFeedback({ message: `${circleMethodDefinition(method).label} Circle placed. Press Enter to repeat Circle.`, tone: "success" });
          } else {
            callbacksRef.current.onLineCommandFeedback({ message: method === "tangent-tangent-radius" ? "Select two valid tangent objects before entering the radius." : `Specify the Circle center before entering a ${method === "center-diameter" ? "diameter" : "radius"}.`, tone: "error" });
          }
        } else if (!coordinate) {
          callbacksRef.current.onLineCommandFeedback({ message: previous ? "Move the pointer to establish a direction before entering a distance." : `Specify the Circle ${circlePointStage(method, points.length)} as an exact point.`, tone: "error" });
        } else if (points[0] && Math.abs(coordinate.z - points[0].z) >= 1 / 16) {
          callbacksRef.current.onLineCommandFeedback({ message: "Circle construction points must remain on one elevation plane.", tone: "error" });
        } else if (!circlePointCompletes(method, points.length)) {
          circlePointsRef.current = [...points, coordinate];
          circleCursorRef.current = coordinate;
          callbacksRef.current.onCirclePointsChange(circlePointsRef.current);
          snapMarker.position.set(coordinate.x, coordinate.y, coordinate.z + 0.9);
          snapMarker.visible = true;
          callbacksRef.current.onDragStatus({ distance: previous ? planarDistance(previous, coordinate) : 0, kind: "circle", snapped: false, valid: true });
          callbacksRef.current.onLineCommandFeedback({ message: `Circle input accepted. Specify the ${circlePointStage(method, circlePointsRef.current.length)}.`, tone: "success" });
        } else {
          const geometry = circleGeometryFromPointer(method, points, coordinate);
          if (geometry && callbacksRef.current.onCircleCreate(geometry)) {
            circlePointsRef.current = [];
            circleCursorRef.current = null;
            callbacksRef.current.onCirclePointsChange([]);
            linePreview.visible = false;
            trackingGuide.visible = false;
            snapMarker.visible = false;
            setDynamicCircleInput(null);
            callbacksRef.current.onDragStatus(null);
            callbacksRef.current.onCircleFinishRequested();
            callbacksRef.current.onLineCommandFeedback({ message: `${circleMethodDefinition(method).label} Circle placed with a ${formatArchitectural(geometry.radius)} radius. Press Enter to repeat Circle.`, tone: "success" });
          } else {
            callbacksRef.current.onLineCommandFeedback({ message: `Those inputs cannot form a valid ${circleMethodDefinition(method).label} Circle.`, tone: "error" });
          }
        }
      }
      const pendingPolylineCommand = polylineCommandRef.current;
      if (
        polylineModeRef.current &&
        pendingPolylineCommand &&
        pendingPolylineCommand.id > processedPolylineCommandIdRef.current
      ) {
        processedPolylineCommandIdRef.current = pendingPolylineCommand.id;
        const vertices = polylinePointsRef.current;
        const acceptPolylinePoint = (point: LinePoint) => {
          const currentVertices = polylinePointsRef.current;
          const previous = currentVertices.at(-1);
          if (!previous) {
            polylineElevationRef.current = point.z;
            polylinePointsRef.current = [point];
            polylineBulgesRef.current = [];
            polylineCursorRef.current = point;
            polylineArcThroughRef.current = null;
            callbacksRef.current.onPolylineAnchorChange(point);
            snapMarker.position.set(point.x, point.y, point.z + 0.9);
            snapMarker.visible = true;
            callbacksRef.current.onDragStatus({ distance: 0, kind: "polyline", snapped: false, valid: true });
            callbacksRef.current.onLineCommandFeedback({ message: `Polyline starts at ${formatSignedArchitectural(point.x)}, ${formatSignedArchitectural(point.y)}, ${formatSignedArchitectural(point.z)}.`, tone: "success" });
            return;
          }
          if (Math.abs(point.z - polylineElevationRef.current) >= 1 / 16) {
            callbacksRef.current.onLineCommandFeedback({ message: "Every Polyline point must stay on the first point's elevation plane.", tone: "error" });
            return;
          }
          if (polylineSegmentModeRef.current === "arc" && !polylineArcThroughRef.current) {
            polylineArcThroughRef.current = point;
            polylineCursorRef.current = point;
            callbacksRef.current.onLineCommandFeedback({ message: "Arc through-point accepted. Specify the Arc endpoint.", tone: "success" });
            return;
          }
          const geometry = { start: { ...previous, z: polylineElevationRef.current }, end: point };
          if (lineLength(geometry) < 1 / 16) {
            callbacksRef.current.onLineCommandFeedback({ message: "That point would create a zero-length Polyline segment.", tone: "error" });
            return;
          }
          const bulge = polylineSegmentModeRef.current === "arc" && polylineArcThroughRef.current
            ? polylineBulgeFromThreePoints(previous, polylineArcThroughRef.current, point)
            : 0;
          if (bulge === null) {
            callbacksRef.current.onLineCommandFeedback({ message: "Those three points cannot form a valid Polyline Arc segment.", tone: "error" });
            return;
          }
          polylinePointsRef.current = [...currentVertices, point];
          polylineBulgesRef.current = [...polylineBulgesRef.current, bulge];
          polylineCursorRef.current = point;
          polylineArcThroughRef.current = null;
          polylineEscapeArmedRef.current = false;
          callbacksRef.current.onPolylineAnchorChange(point);
          linePreview.visible = false;
          trackingGuide.visible = false;
          setDynamicPolylineInput(null);
          callbacksRef.current.onDragStatus({ angle: lineAngle(geometry), distance: lineLength(geometry), kind: "polyline", snapped: false, valid: true });
          callbacksRef.current.onLineCommandFeedback({ message: `${polylineSegmentModeRef.current === "arc" ? "Arc" : "Line"} segment accepted. Continue, Undo, Close, or press Enter to finish.`, tone: "success" });
        };
        if (pendingPolylineCommand.kind === "coordinate") {
          const point = snapLinePoint(pendingPolylineCommand.point);
          acceptPolylinePoint(point);
        } else if (pendingPolylineCommand.kind === "distance") {
          const previous = vertices.at(-1);
          const start = previous ? { ...previous, z: polylineElevationRef.current } : null;
          const geometry = start && polylineCursorRef.current
            ? lineFromDirection(start, { ...polylineCursorRef.current, z: polylineElevationRef.current }, pendingPolylineCommand.distance)
            : null;
          if (geometry) {
            acceptPolylinePoint(geometry.end);
          } else {
            callbacksRef.current.onLineCommandFeedback({ message: start ? "Move the pointer away from the last vertex to establish a direction." : "Specify the first Polyline point before entering a distance.", tone: "error" });
          }
        } else if (pendingPolylineCommand.kind === "undo") {
          if (polylineArcThroughRef.current) {
            polylineArcThroughRef.current = null;
            callbacksRef.current.onLineCommandFeedback({ message: "Removed the pending Polyline Arc through-point.", tone: "success" });
          } else if (!vertices.length) {
            callbacksRef.current.onLineCommandFeedback({ message: "There is no Polyline vertex to undo.", tone: "error" });
          } else {
            polylinePointsRef.current = vertices.slice(0, -1);
            polylineBulgesRef.current = polylineBulgesRef.current.slice(0, Math.max(0, polylinePointsRef.current.length - 1));
            const point = polylinePointsRef.current.at(-1);
            const linePoint = point ? { ...point, z: polylineElevationRef.current } : null;
            polylineCursorRef.current = linePoint;
            polylineEscapeArmedRef.current = false;
            callbacksRef.current.onPolylineAnchorChange(linePoint);
            linePreview.visible = false;
            trackingGuide.visible = false;
            setDynamicPolylineInput(null);
            callbacksRef.current.onDragStatus({ distance: 0, kind: "polyline", snapped: false, valid: true });
            callbacksRef.current.onLineCommandFeedback({ message: point ? "Removed the previous Polyline vertex." : "Removed the first Polyline point. Specify a new first point.", tone: "success" });
          }
        } else {
          const closed = pendingPolylineCommand.kind === "close";
          const minimum = closed ? 3 : 2;
          if (vertices.length < minimum) {
            callbacksRef.current.onLineCommandFeedback({ message: closed ? "Add at least three vertices before closing the Polyline." : "Add at least two vertices before finishing the Polyline.", tone: "error" });
          } else if (callbacksRef.current.onPolylineCreate({ bulges: closed ? [...polylineBulgesRef.current, 0] : polylineBulgesRef.current, closed, elevation: polylineElevationRef.current, vertices, width: polylineWidthRef.current }, "polyline")) {
            polylinePointsRef.current = [];
            polylineBulgesRef.current = [];
            polylineArcThroughRef.current = null;
            polylineCursorRef.current = null;
            polylineEscapeArmedRef.current = false;
            callbacksRef.current.onPolylineAnchorChange(null);
            callbacksRef.current.onPolylineFinishRequested();
            callbacksRef.current.onLineCommandFeedback({ message: `${closed ? "Closed" : "Finished"} the Polyline. Press Enter to repeat Polyline.`, tone: "success" });
          } else {
            callbacksRef.current.onLineCommandFeedback({ message: "The Polyline could not be created inside the supported drawing area.", tone: "error" });
          }
        }
      }
      const pendingRectangleCommand = rectangleCommandRef.current;
      if (
        rectangleModeRef.current &&
        pendingRectangleCommand &&
        pendingRectangleCommand.id > processedRectangleCommandIdRef.current
      ) {
        processedRectangleCommandIdRef.current = pendingRectangleCommand.id;
        if (pendingRectangleCommand.kind === "coordinate") {
          const point = snapLinePoint(pendingRectangleCommand.point);
          if (!rectangleStartRef.current) {
            rectangleStartRef.current = point;
            rectangleCursorRef.current = point;
            rectangleEscapeArmedRef.current = false;
            callbacksRef.current.onRectangleAnchorChange(point);
            snapMarker.position.set(point.x, point.y, point.z + 0.9);
            snapMarker.visible = true;
            callbacksRef.current.onDragStatus({ distance: 0, kind: "rectangle", snapped: false, valid: true });
            callbacksRef.current.onLineCommandFeedback({ message: `Rectangle starts at ${formatSignedArchitectural(point.x)}, ${formatSignedArchitectural(point.y)}, ${formatSignedArchitectural(point.z)}.`, tone: "success" });
          } else if (Math.abs(point.z - rectangleStartRef.current.z) >= 1 / 16) {
            callbacksRef.current.onLineCommandFeedback({ message: "The opposite Rectangle corner must stay on the first corner's elevation plane.", tone: "error" });
          } else {
            const rectangle = rectangleFromDraftSettings(rectangleStartRef.current, point, rectangleDraftSettingsRef.current);
            if (rectangle && callbacksRef.current.onPolylineCreate(rectangle, "rectangle")) {
              callbacksRef.current.onRectangleAnchorChange(null);
              callbacksRef.current.onRectangleFinishRequested();
              callbacksRef.current.onLineCommandFeedback({ message: `Rectangle placed with the ${rectangleDraftSettingsRef.current.method} method. Press Enter to repeat Rectangle.`, tone: "success" });
            } else {
              callbacksRef.current.onLineCommandFeedback({ message: "The Rectangle needs non-zero width and height inside the drawing area.", tone: "error" });
            }
          }
        } else {
          const start = rectangleStartRef.current;
          const rectangle = start ? rectangleFromDimensions(start, rectangleCursorRef.current, pendingRectangleCommand.width, pendingRectangleCommand.height, start.z, rectangleConstructionOptions(rectangleDraftSettingsRef.current)) : null;
          if (rectangle && callbacksRef.current.onPolylineCreate(rectangle, "rectangle")) {
            callbacksRef.current.onRectangleAnchorChange(null);
            callbacksRef.current.onRectangleFinishRequested();
            callbacksRef.current.onLineCommandFeedback({ message: "Rectangle placed at the entered dimensions. Press Enter to repeat Rectangle.", tone: "success" });
          } else {
            callbacksRef.current.onLineCommandFeedback({ message: start ? "Those Rectangle dimensions extend outside the supported drawing area." : "Specify the first corner before entering Rectangle dimensions.", tone: "error" });
          }
        }
      }
      const pendingLineCommand = lineCommandRef.current;
      if (
        lineModeRef.current &&
        pendingLineCommand &&
        pendingLineCommand.id > processedLineCommandIdRef.current
      ) {
        processedLineCommandIdRef.current = pendingLineCommand.id;
        if (pendingLineCommand.kind === "coordinate") {
          const point = snapLinePoint(pendingLineCommand.point);
          if (!lineStartRef.current) {
            lineStartRef.current = point;
            lineCursorRef.current = point;
            linePointHistoryRef.current = [point];
            lineEscapeArmedRef.current = false;
            callbacksRef.current.onLineAnchorChange(point);
            snapMarker.position.set(point.x, point.y, point.z + 0.9);
            snapMarker.visible = true;
            callbacksRef.current.onDragStatus({ distance: 0, kind: "line", snapped: false, valid: true });
            callbacksRef.current.onLineCommandFeedback({ message: `Line starts at ${formatSignedArchitectural(point.x)}, ${formatSignedArchitectural(point.y)}, ${formatSignedArchitectural(point.z)}.`, tone: "success" });
          } else {
            const start = lineStartRef.current;
            if (callbacksRef.current.onLineCreate(start, point)) {
              lineStartRef.current = point;
              lineCursorRef.current = point;
              linePointHistoryRef.current = [...linePointHistoryRef.current, point];
              lineEscapeArmedRef.current = false;
              callbacksRef.current.onLineAnchorChange(point);
              linePreview.visible = false;
              trackingGuide.visible = false;
              setDynamicLineInput(null);
              callbacksRef.current.onDragStatus({ angle: lineAngle({ start, end: point }), distance: lineLength({ start, end: point }), kind: "line", snapped: false, valid: true });
              callbacksRef.current.onLineCommandFeedback({ message: "Exact endpoint accepted. Continue the line or press Escape to finish.", tone: "success" });
            } else {
              callbacksRef.current.onLineCommandFeedback({ message: "That endpoint would create an invalid or zero-length line.", tone: "error" });
            }
          }
        } else if (pendingLineCommand.kind === "distance") {
          const start = lineStartRef.current;
          const directionPoint = lineCursorRef.current;
          const geometry = start && directionPoint
            ? lineFromDirection(start, directionPoint, pendingLineCommand.distance)
            : null;
          if (geometry && callbacksRef.current.onLineCreate(geometry.start, geometry.end)) {
            lineStartRef.current = geometry.end;
            lineCursorRef.current = geometry.end;
            linePointHistoryRef.current = [...linePointHistoryRef.current, geometry.end];
            lineEscapeArmedRef.current = false;
            callbacksRef.current.onLineAnchorChange(geometry.end);
            linePreview.visible = false;
            trackingGuide.visible = false;
            setDynamicLineInput(null);
            snapMarker.position.set(geometry.end.x, geometry.end.y, geometry.end.z + 0.9);
            snapMarker.visible = true;
            callbacksRef.current.onDragStatus({ angle: lineAngle(geometry), distance: lineLength(geometry), kind: "line", snapped: false, valid: true });
            callbacksRef.current.onLineCommandFeedback({ message: `Drew ${formatArchitectural(lineLength(geometry))} at ${lineAngle(geometry)}°.`, tone: "success" });
          } else {
            callbacksRef.current.onLineCommandFeedback({ message: start ? "Move the pointer away from the start point to establish a direction." : "Specify the first point before entering a distance.", tone: "error" });
          }
        } else if (pendingLineCommand.kind === "undo") {
          if (linePointHistoryRef.current.length < 2 || !callbacksRef.current.onLineUndoSegment()) {
            callbacksRef.current.onLineCommandFeedback({ message: "There is no completed Line segment to undo.", tone: "error" });
          } else {
            linePointHistoryRef.current = linePointHistoryRef.current.slice(0, -1);
            const point = linePointHistoryRef.current.at(-1)!;
            lineStartRef.current = point;
            lineCursorRef.current = point;
            lineEscapeArmedRef.current = false;
            callbacksRef.current.onLineAnchorChange(point);
            linePreview.visible = false;
            trackingGuide.visible = false;
            setDynamicLineInput(null);
            snapMarker.position.set(point.x, point.y, point.z + 0.9);
            snapMarker.visible = true;
            callbacksRef.current.onDragStatus({ distance: 0, kind: "line", snapped: false, valid: true });
            callbacksRef.current.onLineCommandFeedback({ message: "Removed the previous Line segment. Continue from the restored endpoint.", tone: "success" });
          }
        } else {
          const first = linePointHistoryRef.current[0];
          const start = lineStartRef.current;
          if (!first || !start || linePointHistoryRef.current.length < 3) {
            callbacksRef.current.onLineCommandFeedback({ message: "Draw at least two segments before using Close.", tone: "error" });
          } else if (callbacksRef.current.onLineCreate(start, first)) {
            callbacksRef.current.onLineFinishRequested();
            callbacksRef.current.onLineCommandFeedback({ message: "Closed the chained Line segments.", tone: "success" });
          } else {
            callbacksRef.current.onLineCommandFeedback({ message: "The Line chain could not be closed.", tone: "error" });
          }
        }
      }
      if (cameraTransition) {
        const elapsed = performance.now() - cameraTransition.startedAt;
        const progress = Math.min(elapsed / cameraTransition.duration, 1);
        const eased = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
        camera.position.lerpVectors(
          cameraTransition.fromPosition,
          cameraTransition.toPosition,
          eased,
        );
        camera.quaternion.slerpQuaternions(
          cameraTransition.fromQuaternion,
          cameraTransition.toQuaternion,
          eased,
        );
        controls.target.lerpVectors(
          cameraTransition.fromTarget,
          cameraTransition.toTarget,
          eased,
        );
        camera.updateMatrixWorld();
        if (progress >= 1) {
          camera.position.copy(cameraTransition.toPosition);
          camera.quaternion.copy(cameraTransition.toQuaternion);
          controls.target.copy(cameraTransition.toTarget);
          cameraTransition = null;
          controls.enabled = true;
          controls.update();
        }
      } else {
        controls.update();
      }
      cameraOrientationRef.current.copy(camera.quaternion);
      if (boxGripSet.group.visible) {
        const viewportHeight = Math.max(renderer.domElement.clientHeight, 1);
        boxGripSet.handles.forEach((handle) => {
          const worldUnitsPerPixel = camera instanceof THREE.PerspectiveCamera
            ? (2 * camera.position.distanceTo(handle.position) * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / viewportHeight
            : (camera.top - camera.bottom) / (camera.zoom * viewportHeight);
          handle.scale.setScalar(worldUnitsPerPixel * (handle.userData.screenPixels ?? 10));
        });
      }
      if (lineGripSet.group.visible) {
        const viewportHeight = Math.max(renderer.domElement.clientHeight, 1);
        lineGripSet.handles.forEach((handle) => {
          const worldUnitsPerPixel = camera instanceof THREE.PerspectiveCamera
            ? (2 * camera.position.distanceTo(handle.position) * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / viewportHeight
            : (camera.top - camera.bottom) / (camera.zoom * viewportHeight);
          handle.scale.setScalar(worldUnitsPerPixel * (handle.userData.screenPixels ?? 10));
        });
      }
      if (polylineGripSet.group.visible) {
        const viewportHeight = Math.max(renderer.domElement.clientHeight, 1);
        polylineGripSet.handles.forEach((handle) => {
          if (!handle.visible) return;
          const worldUnitsPerPixel = camera instanceof THREE.PerspectiveCamera
            ? (2 * camera.position.distanceTo(handle.position) * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / viewportHeight
            : (camera.top - camera.bottom) / (camera.zoom * viewportHeight);
          handle.scale.setScalar(worldUnitsPerPixel * (handle.userData.screenPixels ?? 10));
        });
      }
      if (circleGripSet.group.visible) {
        const viewportHeight = Math.max(renderer.domElement.clientHeight, 1);
        circleGripSet.handles.forEach((handle) => {
          const worldUnitsPerPixel = camera instanceof THREE.PerspectiveCamera
            ? (2 * camera.position.distanceTo(handle.position) * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / viewportHeight
            : (camera.top - camera.bottom) / (camera.zoom * viewportHeight);
          handle.scale.setScalar(worldUnitsPerPixel * (handle.userData.screenPixels ?? 10));
        });
      }
      if (arcGripSet.group.visible) {
        const viewportHeight = Math.max(renderer.domElement.clientHeight, 1);
        arcGripSet.handles.forEach((handle) => {
          const worldUnitsPerPixel = camera instanceof THREE.PerspectiveCamera
            ? (2 * camera.position.distanceTo(handle.position) * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / viewportHeight
            : (camera.top - camera.bottom) / (camera.zoom * viewportHeight);
          handle.scale.setScalar(worldUnitsPerPixel * (handle.userData.screenPixels ?? 10));
        });
      }
      if (viewTargetRef.current.id === "top") {
        const activeStoryId = documentRef.current.building.activeStoryId;
        const screens = documentRef.current.roomAnnotations.filter((annotation) => annotation.kind === "label" && annotation.storyId === activeStoryId && annotation.visible && findLayer(documentRef.current, annotation.layerId)?.visible).map((annotation) => {
          const projected = new THREE.Vector3(annotation.position.x, annotation.position.y, activeElevationRef.current + 1).project(camera);
          return { roomId: annotation.roomId, x: Math.round((projected.x * 0.5 + 0.5) * renderer.domElement.clientWidth), y: Math.round((-projected.y * 0.5 + 0.5) * renderer.domElement.clientHeight) };
        });
        const signature = screens.map((item) => `${item.roomId}:${item.x}:${item.y}`).join("|");
        if (signature !== roomLabelScreenSignatureRef.current) {
          roomLabelScreenSignatureRef.current = signature;
          setRoomLabelScreens(screens);
        }
      } else if (roomLabelScreenSignatureRef.current) {
        roomLabelScreenSignatureRef.current = "";
        setRoomLabelScreens([]);
      }
      const selectedWall = findLineObject(documentRef.current, selectedLineIdRef.current);
      if (
        viewTargetRef.current.id === "top" &&
        selectedWall?.architecturalRole === "wall" &&
        lineIsEditable(documentRef.current, selectedWall) &&
        findLayer(documentRef.current, selectedWall.layerId)?.visible
      ) {
        const projectDimensionPoint = (point: LinePoint) => {
          const projected = new THREE.Vector3(point.x, point.y, point.z + 1).project(camera);
          return {
            x: (projected.x * 0.5 + 0.5) * renderer.domElement.clientWidth,
            y: (-projected.y * 0.5 + 0.5) * renderer.domElement.clientHeight,
          };
        };
        const wallStart = projectDimensionPoint(selectedWall.start);
        const wallEnd = projectDimensionPoint(selectedWall.end);
        const dx = wallEnd.x - wallStart.x;
        const dy = wallEnd.y - wallStart.y;
        const projectedLength = Math.hypot(dx, dy);
        if (projectedLength >= 36) {
          let normalX = -dy / projectedLength;
          let normalY = dx / projectedLength;
          if (normalY > 0 || Math.abs(normalY) < 0.08 && normalX < 0) {
            normalX *= -1;
            normalY *= -1;
          }
          const dimensionOffset = 38;
          const dimensionStart = { x: wallStart.x + normalX * dimensionOffset, y: wallStart.y + normalY * dimensionOffset };
          const dimensionEnd = { x: wallEnd.x + normalX * dimensionOffset, y: wallEnd.y + normalY * dimensionOffset };
          const clearDimensions = nearestParallelWallClearDimensions(
            selectedWall,
            documentRef.current.lines.filter((line) => findLayer(documentRef.current, line.layerId)?.visible),
            documentRef.current.building.wallTypes,
          ).map((dimension) => ({
            distance: dimension.distance,
            from: projectDimensionPoint(dimension.from),
            referenceWallId: dimension.referenceWallId,
            side: dimension.side,
            to: projectDimensionPoint(dimension.to),
          })).filter((dimension) => Math.hypot(dimension.to.x - dimension.from.x, dimension.to.y - dimension.from.y) >= 30);
          const screen: TemporaryWallDimensionScreen = {
            clearDimensions,
            dimensionEnd,
            dimensionStart,
            label: { x: (dimensionStart.x + dimensionEnd.x) / 2, y: (dimensionStart.y + dimensionEnd.y) / 2 },
            lineId: selectedWall.id,
            wallEnd,
            wallStart,
          };
          const signature = [
            screen.lineId,
            screen.wallStart.x,
            screen.wallStart.y,
            screen.wallEnd.x,
            screen.wallEnd.y,
            screen.dimensionStart.x,
            screen.dimensionStart.y,
            ...screen.clearDimensions.flatMap((dimension) => [dimension.referenceWallId, dimension.distance, dimension.from.x, dimension.from.y, dimension.to.x, dimension.to.y]),
          ].map((value) => typeof value === "number" ? Math.round(value) : value).join(":");
          if (signature !== temporaryWallDimensionScreenSignatureRef.current) {
            temporaryWallDimensionScreenSignatureRef.current = signature;
            setTemporaryWallDimensionScreen(screen);
          }
        } else if (temporaryWallDimensionScreenSignatureRef.current) {
          temporaryWallDimensionScreenSignatureRef.current = "";
          setTemporaryWallDimensionScreen(null);
        }
      } else if (temporaryWallDimensionScreenSignatureRef.current) {
        temporaryWallDimensionScreenSignatureRef.current = "";
        setTemporaryWallDimensionScreen(null);
      }
      renderer.render(scene, camera);
    };
    render();

    return () => {
      if (objectSnapAcquisitionTimerRef.current !== null) window.clearTimeout(objectSnapAcquisitionTimerRef.current);
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      window.removeEventListener("keydown", cancelWithEscape);
      renderer.domElement.removeEventListener("pointerdown", setMiddleMode, true);
      renderer.domElement.removeEventListener("pointerdown", selectAndPrepareDrag);
      renderer.domElement.removeEventListener("pointermove", moveDrag);
      renderer.domElement.removeEventListener("pointerup", commitPointerDrag);
      renderer.domElement.removeEventListener("pointercancel", cancelPointerDrag);
      renderer.domElement.removeEventListener("pointerleave", clearGripHover);
      renderer.domElement.removeEventListener("pointerleave", clearGripHover);
      controls.dispose();
      objectViews.forEach((view) => disposeViewportObject(scene, view));
      objectViews.clear();
      lineViews.forEach((view) => disposeViewportLine(scene, view));
      lineViews.clear();
      wallViews.forEach((view) => disposeWallView(scene, view));
      wallViews.clear();
      polylineViews.forEach((view) => disposeViewportLine(scene, view));
      polylineViews.clear();
      floorPlatformViews.forEach((view) => disposeFloorPlatformView(scene, view));
      floorPlatformViews.clear();
      roofPlaneViews.forEach((view) => disposeFloorPlatformView(scene, view));
      roofPlaneViews.clear();
      roomPlatformViews.forEach((view) => disposeFloorPlatformView(scene, view));
      roomPlatformViews.clear();
      circleViews.forEach((view) => disposeViewportLine(scene, view));
      circleViews.clear();
      arcViews.forEach((view) => disposeViewportLine(scene, view));
      arcViews.clear();
      scene.remove(linePreview, trackingGuide, snapMarker);
      linePreviewGeometry.dispose();
      (linePreview.material as THREE.Material).dispose();
      trackingGuideGeometry.dispose();
      (trackingGuide.material as THREE.Material).dispose();
      snapMarker.geometry.dispose();
      (snapMarker.material as THREE.Material).dispose();
      disposeMoveGizmo(scene, moveGizmo);
      moveGizmoRef.current = null;
      disposeRotationGizmo(scene, rotationGizmo);
      rotationGizmoRef.current = null;
      disposeScaleGizmo(scene, scaleGizmo);
      scaleGizmoRef.current = null;
      disposeBoxGripSet(scene, boxGripSet);
      boxGripSetRef.current = null;
      disposeLineGripSet(scene, lineGripSet);
      lineGripSetRef.current = null;
      disposePolylineGripSet(scene, polylineGripSet);
      polylineGripSetRef.current = null;
      disposeCircleGripSet(scene, circleGripSet);
      circleGripSetRef.current = null;
      disposeArcGripSet(scene, arcGripSet);
      arcGripSetRef.current = null;
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      fitViewRef.current = null;
      applyViewRef.current = null;
      cubeOrbitRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const divisions = Math.max(2, Math.round(960 / gridSpacing));
    const colors = interfaceTheme === "light" ? [0x7f9bb0, 0xc7d1d7] : [0x5d7188, 0x2a3541];
    const grid = new THREE.GridHelper(divisions * gridSpacing, divisions, colors[0], colors[1]);
    grid.rotation.set(...gridPlacementRef.current.rotation);
    grid.position.set(...gridPlacementRef.current.position);
    grid.visible = gridVisible;
    const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
    materials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.62;
    });
    scene.add(grid);
    gridRef.current = grid;
    return () => {
      scene.remove(grid);
      grid.geometry.dispose();
      materials.forEach((material) => material.dispose());
      if (gridRef.current === grid) gridRef.current = null;
    };
  }, [gridSpacing, gridVisible, interfaceTheme]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.background = new THREE.Color(interfaceTheme === "light" ? 0xf1f3f3 : 0x151b22);
  }, [interfaceTheme]);

  useEffect(() => {
    if (skipNextViewApplyRef.current) {
      skipNextViewApplyRef.current = false;
      return;
    }
    applyViewRef.current?.(viewTarget);
  }, [viewTarget]);

  useEffect(() => {
    const initialArcPoints = arcMode && arcMethod === "continue" && arcContinueSeed ? [{ ...arcContinueSeed.start }] : [];
    arcPointsRef.current = initialArcPoints;
    arcCursorRef.current = null;
    onArcPointsChange(initialArcPoints);
    circlePointsRef.current = [];
    circleTangentConstraintsRef.current = [];
    circleCursorRef.current = null;
    onCirclePointsChange([]);
    if (!lineMode) {
      lineStartRef.current = null;
      lineCursorRef.current = null;
      linePointHistoryRef.current = [];
      lineEscapeArmedRef.current = false;
      onLineAnchorChange(null);
    }
    if (polylineSegmentMode === "line") polylineArcThroughRef.current = null;
    if (!polylineMode) {
      polylinePointsRef.current = [];
      polylineBulgesRef.current = [];
      polylineArcThroughRef.current = null;
      polylineCursorRef.current = null;
      polylineEscapeArmedRef.current = false;
      onPolylineAnchorChange(null);
    }
    if (!rectangleMode) {
      rectangleStartRef.current = null;
      rectangleCursorRef.current = null;
      rectangleEscapeArmedRef.current = false;
      onRectangleAnchorChange(null);
    }
  }, [arcContinueSeed, arcMethod, arcMode, circleMethod, circleMode, lineMode, onArcPointsChange, onCirclePointsChange, onLineAnchorChange, onPolylineAnchorChange, onRectangleAnchorChange, polylineMode, polylineSegmentMode, rectangleMode]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const currentIds = new Set(document.objects.map((object) => object.id));
    objectViewsRef.current.forEach((view, objectId) => {
      if (!currentIds.has(objectId)) {
        disposeViewportObject(scene, view);
        objectViewsRef.current.delete(objectId);
      }
    });
    document.objects.forEach((object) => {
      let view = objectViewsRef.current.get(object.id);
      if (!view) {
        view = createViewportObject(scene, object.id);
        objectViewsRef.current.set(object.id, view);
      }
      const { dimensions } = object;
      const layer = displayLayerForStory(document, viewTarget, object.storyId, object.layerId);
      const visible = (layer?.visible ?? true) && storyDisplayRole(document, viewTarget, object.storyId) !== "hidden";
      view.mesh.visible = visible;
      view.edges.visible = visible;
      view.mesh.scale.set(dimensions.length, dimensions.width, dimensions.height);
      const center = boxWorldPoint(object, 0.5, 0.5, 0.5);
      view.mesh.position.set(center.x, center.y, center.z);
      view.mesh.rotation.set(0, 0, THREE.MathUtils.degToRad(object.rotationZ));
      view.edges.scale.copy(view.mesh.scale);
      view.edges.position.copy(view.mesh.position);
      view.edges.rotation.copy(view.mesh.rotation);
    });
    const currentLineIds = new Set(document.lines.map((line) => line.id));
    lineViewsRef.current.forEach((view, lineId) => {
      if (!currentLineIds.has(lineId)) {
        disposeViewportLine(scene, view);
        lineViewsRef.current.delete(lineId);
      }
    });
    document.lines.forEach((line) => {
      let view = lineViewsRef.current.get(line.id);
      if (!view) {
        view = createViewportLine(scene, line.id);
        lineViewsRef.current.set(line.id, view);
      }
      updateViewportLine(view, line);
      const layer = displayLayerForStory(document, viewTarget, line.storyId, line.layerId);
      applyLayerAppearanceToViewportLine(view, layer);
      view.line.visible = (layer?.visible ?? true) && storyDisplayRole(document, viewTarget, line.storyId) !== "hidden";
    });
    const currentWallIds = new Set(document.lines.filter((line) => line.architecturalRole !== null).map((line) => line.id));
    wallViewsRef.current.forEach((view, lineId) => {
      if (!currentWallIds.has(lineId)) {
        disposeWallView(scene, view);
        wallViewsRef.current.delete(lineId);
      }
    });
    const wallLines = document.lines.filter((line) => line.architecturalRole === "wall");
    const wallJoinPlan = buildAutomaticWallJoinPlan(wallLines, document.building.wallTypes);
    const wallLinesById = new Map(wallLines.map((line) => [line.id, line]));
    const wallTypesById = new Map(document.building.wallTypes.map((wallType) => [wallType.id, wallType]));
    const openingTypesById = new Map(document.building.openingTypes.map((openingType) => [openingType.id, openingType]));
    const headerTypesById = new Map(document.building.headerTypes.map((headerType) => [headerType.id, headerType]));
    wallLines.forEach((line) => {
      let view = wallViewsRef.current.get(line.id);
      if (!view) {
        view = createWallView(scene);
        wallViewsRef.current.set(line.id, view);
      }
      const vertical = wallVerticalExtent(document, line);
      const wallType = document.building.wallTypes.find((candidate) => candidate.id === line.wallTypeId);
      if (vertical && wallType) {
        // Rebuild only when something this wall's geometry depends on changed.
        // Re-extruding every wall on every document change is the single most
        // expensive thing the viewport does.
        const inputs = wallViewInputs(line, vertical, wallType, wallJoinPlan, wallLinesById, wallTypesById, openingTypesById, headerTypesById, document.building.wallFraming, viewTarget);
        if (!view.builtFrom || !deepEqual(view.builtFrom, inputs)) {
          updateWallView(view, line, vertical, wallType, wallJoinPlan, wallLinesById, wallTypesById, openingTypesById, headerTypesById, document.building.wallFraming, viewTarget);
          view.builtFrom = inputs;
        }
      }
      const openingById = new Map(line.wallOpenings.map((opening) => [opening.id, opening]));
      [...view.meshes.filter((mesh) => Boolean(mesh.userData.openingComponentRole)), ...view.productMeshes].forEach((mesh) => {
        const opening = openingById.get(String(mesh.userData.wallOpeningId ?? ""));
        if (opening) mesh.visible = displayLayerForStory(document, viewTarget, line.storyId, opening.layerId)?.visible ?? true;
      });
      const wallLayer = displayLayerForStory(document, viewTarget, line.storyId, line.layerId);
      view.group.visible = Boolean(vertical && wallType && (wallLayer?.visible ?? true) && storyDisplayRole(document, viewTarget, line.storyId) !== "hidden");
    });
    const foundationWallLines = document.lines.filter((line) => line.architecturalRole === "foundation-wall");
    const foundationWallJoinPlan = buildAutomaticFoundationWallJoinPlan(foundationWallLines, document.building.foundationWallTypes);
    const foundationWallLinesById = new Map(foundationWallLines.map((line) => [line.id, line]));
    const foundationWallTypesById = new Map(document.building.foundationWallTypes.map((type) => [type.id, type]));
    foundationWallLines.forEach((line) => {
      let view = wallViewsRef.current.get(line.id);
      if (!view) {
        view = createWallView(scene);
        wallViewsRef.current.set(line.id, view);
      }
      const vertical = foundationWallVerticalExtent(document, line);
      const foundationType = document.building.foundationWallTypes.find((candidate) => candidate.id === line.foundationWallTypeId);
      if (vertical && foundationType) {
        // Same dirty check as framed Walls: neighbours come from the join plan,
        // so a Foundation Wall rebuilds when the wall it joins to changes.
        const neighbourIds = new Set<string>();
        Object.values(foundationWallJoinPlan.endpointJoins.get(line.id) ?? {}).forEach((entry) => {
          const record = entry as { hostWallId?: string; otherWallId?: string } | undefined;
          if (record?.otherWallId) neighbourIds.add(record.otherWallId);
          if (record?.hostWallId) neighbourIds.add(record.hostWallId);
        });
        const inputs = {
          join: foundationWallJoinPlan.endpointJoins.get(line.id) ?? null,
          line,
          neighbours: [...neighbourIds].sort().map((id) => {
            const neighbour = foundationWallLinesById.get(id);
            return { line: neighbour, type: neighbour?.foundationWallTypeId ? foundationWallTypesById.get(neighbour.foundationWallTypeId) : undefined };
          }),
          occupied: [...(foundationWallJoinPlan.occupiedEndpoints.get(line.id) ?? [])].sort(),
          type: foundationType,
          vertical,
        };
        if (!view.builtFrom || !deepEqual(view.builtFrom, inputs)) {
          updateFoundationWallView(view, line, vertical, foundationType, foundationWallJoinPlan, foundationWallLinesById, foundationWallTypesById);
          view.builtFrom = inputs;
        }
      }
      const foundationLayer = displayLayerForStory(document, viewTarget, line.storyId, line.layerId);
      view.group.visible = Boolean(vertical && foundationType && (foundationLayer?.visible ?? true) && storyDisplayRole(document, viewTarget, line.storyId) !== "hidden");
    });
    const currentPolylineIds = new Set(document.polylines.map((polyline) => polyline.id));
    polylineViewsRef.current.forEach((view, polylineId) => {
      if (!currentPolylineIds.has(polylineId)) {
        disposeViewportLine(scene, view);
        polylineViewsRef.current.delete(polylineId);
      }
    });
    document.polylines.forEach((polyline) => {
      let view = polylineViewsRef.current.get(polyline.id);
      if (!view) {
        view = createViewportPolyline(scene, polyline.id);
        polylineViewsRef.current.set(polyline.id, view);
      }
      updateViewportPolyline(view, polyline);
      const layer = displayLayerForStory(document, viewTarget, polyline.storyId, polyline.layerId);
      applyLayerAppearanceToViewportLine(view, layer);
      const visible = (layer?.visible ?? true) && storyDisplayRole(document, viewTarget, polyline.storyId) !== "hidden";
      view.line.visible = visible && (polyline.architecturalRole !== "roof-plane" || viewTarget.id === "top");
      if (view.fill) view.fill.visible = visible && resolvedStoryFill(document, viewTarget, polyline.storyId, polyline.layerId, polyline).visible && (polyline.width ?? 0) >= 1 / 16;
    });
    const currentFloorIds = new Set(document.polylines.filter((polyline) => polyline.architecturalRole === "floor-platform").map((polyline) => polyline.id));
    floorPlatformViewsRef.current.forEach((view, polylineId) => {
      if (!currentFloorIds.has(polylineId)) {
        disposeFloorPlatformView(scene, view);
        floorPlatformViewsRef.current.delete(polylineId);
      }
    });
    document.polylines.filter((polyline) => polyline.architecturalRole === "floor-platform").forEach((polyline) => {
      let view = floorPlatformViewsRef.current.get(polyline.id);
      if (!view) {
        view = createFloorPlatformView(scene);
        floorPlatformViewsRef.current.set(polyline.id, view);
      }
      const story = document.building.stories.find((candidate) => candidate.id === polyline.storyId);
      if (story) updateFloorPlatformView(view, polyline, story);
      const layer = displayLayerForStory(document, viewTarget, polyline.storyId, polyline.layerId);
      view.group.visible = Boolean(story && (layer?.visible ?? true) && storyDisplayRole(document, viewTarget, polyline.storyId) !== "hidden");
    });
    const currentRoofPlaneIds = new Set(document.polylines.filter((polyline) => polyline.architecturalRole === "roof-plane").map((polyline) => polyline.id));
    roofPlaneViewsRef.current.forEach((view, polylineId) => {
      if (!currentRoofPlaneIds.has(polylineId)) {
        disposeFloorPlatformView(scene, view);
        roofPlaneViewsRef.current.delete(polylineId);
      }
    });
    document.polylines.filter((polyline) => polyline.architecturalRole === "roof-plane").forEach((polyline) => {
      let view = roofPlaneViewsRef.current.get(polyline.id);
      if (!view) {
        view = createFloorPlatformView(scene);
        roofPlaneViewsRef.current.set(polyline.id, view);
      }
      updateRoofPlaneView(view, document, polyline, viewTarget);
      const layer = displayLayerForStory(document, viewTarget, polyline.storyId, polyline.layerId);
      view.group.visible = Boolean((layer?.visible ?? true) && storyDisplayRole(document, viewTarget, polyline.storyId) !== "hidden");
    });
    const currentRoomIds = new Set(document.rooms.map((room) => room.id));
    roomPlatformViewsRef.current.forEach((view, roomId) => {
      if (!currentRoomIds.has(roomId)) {
        disposeFloorPlatformView(scene, view);
        roomPlatformViewsRef.current.delete(roomId);
      }
    });
    document.rooms.forEach((room) => {
      let view = roomPlatformViewsRef.current.get(room.id);
      if (!view) {
        view = createFloorPlatformView(scene);
        roomPlatformViewsRef.current.set(room.id, view);
      }
      const solution = roomHorizontalPlatformSolution(document, room);
      if (solution) updateRoomPlatformView(view, solution);
      const boundaryWallsVisible = room.boundaryWallIds.some((wallId) => {
        const wall = document.lines.find((line) => line.id === wallId);
        return Boolean(wall && (findLayer(document, wall.layerId)?.visible ?? true));
      });
      view.group.visible = Boolean(solution && boundaryWallsVisible && storyDisplayRole(document, viewTarget, room.storyId) !== "hidden");
    });
    const currentCircleIds = new Set(document.circles.map((circle) => circle.id));
    circleViewsRef.current.forEach((view, circleId) => {
      if (!currentCircleIds.has(circleId)) {
        disposeViewportLine(scene, view);
        circleViewsRef.current.delete(circleId);
      }
    });
    document.circles.forEach((circle) => {
      let view = circleViewsRef.current.get(circle.id);
      if (!view) {
        view = createViewportCircle(scene, circle.id);
        circleViewsRef.current.set(circle.id, view);
      }
      updateViewportCircle(view, circle);
      const layer = displayLayerForStory(document, viewTarget, circle.storyId, circle.layerId);
      applyLayerAppearanceToViewportLine(view, layer);
      view.line.visible = (layer?.visible ?? true) && storyDisplayRole(document, viewTarget, circle.storyId) !== "hidden";
    });
    const currentArcIds = new Set(document.arcs.map((arc) => arc.id));
    arcViewsRef.current.forEach((view, arcId) => {
      if (!currentArcIds.has(arcId)) {
        disposeViewportLine(scene, view);
        arcViewsRef.current.delete(arcId);
      }
    });
    document.arcs.forEach((arc) => {
      let view = arcViewsRef.current.get(arc.id);
      if (!view) {
        view = createViewportArc(scene, arc.id);
        arcViewsRef.current.set(arc.id, view);
      }
      updateViewportArc(view, arc);
      const layer = displayLayerForStory(document, viewTarget, arc.storyId, arc.layerId);
      applyLayerAppearanceToViewportLine(view, layer);
      view.line.visible = (layer?.visible ?? true) && storyDisplayRole(document, viewTarget, arc.storyId) !== "hidden";
    });
    const selectedObject = findBoxObject(document, selectedObjectId);
    const selectedRefs = selectedEntityKeys
      .map(cadEntityRefFromKey)
      .filter((ref): ref is CadEntityRef => ref !== null);
    const selectionCanRotate = selectedRefs.length > 0 &&
      selectedRefs.every((ref) => modelEntityIsEditable(document, ref));
    const gizmo = moveGizmoRef.current;
    const canShowSelectionTools = Boolean(
      selectedObject &&
      selectedObjectIds.every((objectId) => {
        const object = findBoxObject(document, objectId);
        return object && objectIsEditable(document, object);
      }),
    );
    if (gizmo) {
      const canShowMoveGizmo = canShowSelectionTools && !breakMode && !chamferMode && !extendMode && !filletMode && !lengthenMode && !mirrorMode && !offsetMode && !rotateMode && !scaleMode && !stretchMode && !trimMode && (
        copyMode || moveMode || selectedObjectIds.length > 1
      );
      gizmo.group.visible = canShowMoveGizmo;
      if (canShowMoveGizmo && selectedObject) {
        const corner = boxWorldPoint(selectedObject, 1, 1, 1);
        gizmo.group.position.set(corner.x, corner.y, corner.z);
      }
    }
    const rotationGizmo = rotationGizmoRef.current;
    if (rotationGizmo) {
      const rotationBase = modelSelectionRotationBase(document, selectedRefs, rotationBaseKey);
      const selectionBounds = modelSelectionBounds(document, selectedRefs);
      const canShowRotation = selectionCanRotate && rotateMode && Boolean(rotationBase && selectionBounds);
      rotationGizmo.group.visible = canShowRotation;
      if (canShowRotation && rotationBase && selectionBounds) {
        const radius = Math.max(
          selectionBounds.maximum.x - selectionBounds.minimum.x,
          selectionBounds.maximum.y - selectionBounds.minimum.y,
          24,
        ) * 0.62 + 14;
        rotationGizmo.group.position.set(rotationBase.x, rotationBase.y, rotationBase.z);
        rotationGizmo.ring.scale.setScalar(radius);
      }
    }
    const scaleGizmo = scaleGizmoRef.current;
    if (scaleGizmo) {
      const scaleBase = modelSelectionScaleBase(document, selectedRefs, scaleBaseKey);
      const selectionBounds = modelSelectionBounds(document, selectedRefs);
      const canShowScale = selectionCanRotate && scaleMode && Boolean(scaleBase && selectionBounds);
      const wasVisible = scaleGizmo.group.visible;
      scaleGizmo.group.visible = canShowScale;
      if (canShowScale && scaleBase && selectionBounds) {
        const signature = `${selectedEntityKeys.join("|")}:${scaleBaseKey}`;
        if (!wasVisible || scaleGizmo.group.userData.selectionSignature !== signature) {
          scaleGizmo.group.userData.referenceRadius = Math.max(
            selectionBounds.maximum.x - selectionBounds.minimum.x,
            selectionBounds.maximum.y - selectionBounds.minimum.y,
            24,
          ) * 0.62 + 14;
          scaleGizmo.group.userData.selectionSignature = signature;
        }
        const radius = scaleGizmo.group.userData.referenceRadius as number;
        scaleGizmo.group.position.set(scaleBase.x, scaleBase.y, scaleBase.z);
        scaleGizmo.guide.scale.x = radius;
        scaleGizmo.handle.position.set(radius, 0, 0);
      }
    }
    const gripSet = boxGripSetRef.current;
    if (gripSet) {
      const canShowGrips = canShowSelectionTools && !breakMode && !chamferMode && !copyMode && !extendMode && !filletMode && !lengthenMode && !mirrorMode && !offsetMode && !moveMode && !rotateMode && !scaleMode && !stretchMode && !trimMode && selectedObjectIds.length === 1;
      gripSet.group.visible = canShowGrips;
      if (canShowGrips && selectedObject) updateBoxGripPositions(gripSet, selectedObject);
    }
    const lineGripSet = lineGripSetRef.current;
    const selectedLine = findLineObject(document, selectedLineId);
    if (lineGripSet) {
      const canShowLineGrips = Boolean(selectedLine && lineIsEditable(document, selectedLine) && !lineMode && !breakMode && !chamferMode && !copyMode && !extendMode && !filletMode && !lengthenMode && !mirrorMode && !offsetMode && !moveMode && !rotateMode && !scaleMode && !stretchMode && !trimMode);
      lineGripSet.group.visible = canShowLineGrips;
      if (canShowLineGrips && selectedLine) updateLineGripPositions(lineGripSet, selectedLine);
    }
    const polylineGripSet = polylineGripSetRef.current;
    const selectedPolyline = findPolylineObject(document, selectedPolylineId);
    if (polylineGripSet) {
      const canShowPolylineGrips = Boolean(selectedPolyline && polylineIsEditable(document, selectedPolyline) && !polylineMode && !rectangleMode && !breakMode && !chamferMode && !copyMode && !extendMode && !filletMode && !lengthenMode && !mirrorMode && !offsetMode && !moveMode && !rotateMode && !scaleMode && !stretchMode && !trimMode);
      polylineGripSet.group.visible = canShowPolylineGrips;
      if (canShowPolylineGrips && selectedPolyline) updatePolylineGripPositions(polylineGripSet, selectedPolyline);
    }
    const circleGripSet = circleGripSetRef.current;
    const selectedCircle = findCircleObject(document, selectedCircleId);
    if (circleGripSet) {
      const canShowCircleGrips = Boolean(selectedCircle && circleIsEditable(document, selectedCircle) && !circleMode && !breakMode && !chamferMode && !copyMode && !extendMode && !filletMode && !lengthenMode && !mirrorMode && !offsetMode && !moveMode && !rotateMode && !scaleMode && !stretchMode && !trimMode);
      circleGripSet.group.visible = canShowCircleGrips;
      if (canShowCircleGrips && selectedCircle) updateCircleGripPositions(circleGripSet, selectedCircle);
    }
    const arcGripSet = arcGripSetRef.current;
    const selectedArc = findArcObject(document, selectedArcId);
    if (arcGripSet) {
      const canShowArcGrips = Boolean(selectedArc && arcIsEditable(document, selectedArc) && !arcMode && !breakMode && !chamferMode && !copyMode && !extendMode && !filletMode && !lengthenMode && !mirrorMode && !offsetMode && !moveMode && !rotateMode && !scaleMode && !stretchMode && !trimMode);
      arcGripSet.group.visible = canShowArcGrips;
      if (canShowArcGrips && selectedArc) updateArcGripPositions(arcGripSet, selectedArc);
    }
    if (objectCountRef.current !== document.objects.length) {
      objectCountRef.current = document.objects.length;
      if (!copyMode) fitViewRef.current?.();
    }
    if (lineCountRef.current !== document.lines.length) {
      lineCountRef.current = document.lines.length;
      if (!lineMode) fitViewRef.current?.();
    }
    if (polylineCountRef.current !== document.polylines.length) {
      polylineCountRef.current = document.polylines.length;
      if (!polylineMode && !rectangleMode) fitViewRef.current?.();
    }
    if (circleCountRef.current !== document.circles.length) {
      circleCountRef.current = document.circles.length;
      if (!circleMode) fitViewRef.current?.();
    }
    if (arcCountRef.current !== document.arcs.length) {
      arcCountRef.current = document.arcs.length;
      if (!arcMode) fitViewRef.current?.();
    }
  }, [arcMode, breakMode, chamferMode, circleMode, copyMode, document, extendMode, filletMode, lengthenMode, lineMode, mirrorMode, moveMode, offsetMode, polylineMode, rectangleMode, rotateMode, rotationBaseKey, scaleBaseKey, scaleMode, selectedArcId, selectedCircleId, selectedEntityKeys, selectedLineId, selectedObjectId, selectedObjectIds, selectedPolylineId, stretchMode, trimMode, viewTarget]);

  useEffect(() => {
    const selectedIds = new Set(selectedEntityKeys
      .map(cadEntityRefFromKey)
      .filter((ref): ref is CadEntityRef => ref?.kind === "box")
      .map((ref) => ref.id));
    objectViewsRef.current.forEach((view, objectId) => {
      const selectedObject = selectedIds.has(objectId);
      const primaryObject = objectId === selectedObjectId;
      const hoveredObject = hoveredEntityKey === cadEntityKey({ id: objectId, kind: "box" });
      const object = findBoxObject(document, objectId);
      if (!object) return;
      const role = storyDisplayRole(document, viewTarget, object.storyId);
      const layer = displayLayerForStory(document, viewTarget, object.storyId, object.layerId);
      const fill = resolvedStoryFill(document, viewTarget, object.storyId, object.layerId, object);
      const fillColor = Number.parseInt(fill.color.slice(1), 16);
      view.materials.forEach((material, index) => {
        const selectedFace = objectId === selectedObjectId && index === selectedFaceIndex;
        material.color.setHex(
          selectedFace ? 0xf2bd5b : selectedObject ? primaryObject ? 0xd7a64b : 0xa98345 : hoveredObject ? 0x4ba6c8 : fillColor,
        );
        material.emissive.setHex(selectedFace ? 0x4a2b06 : hoveredObject ? 0x082a38 : 0x000000);
        material.opacity = fill.visible ? role === "reference" ? 0.28 : selectedObject || hoveredObject ? 0.95 : 0.84 : 0;
        material.depthWrite = fill.visible && role !== "reference";
        material.depthTest = viewTarget.id !== "top";
      });
      (view.edges.material as THREE.LineBasicMaterial).color.setHex(
        primaryObject ? 0xffe3a3 : selectedObject ? 0xd5b16d : hoveredObject ? 0x87d8f3 : layer ? Number.parseInt(layer.color.slice(1), 16) : 0x8da0b2,
      );
      const edgeMaterial = view.edges.material as THREE.LineBasicMaterial;
      edgeMaterial.transparent = role === "reference";
      edgeMaterial.opacity = role === "reference" ? 0.62 : 1;
      view.mesh.renderOrder = role === "reference" ? 2 : 4;
      view.edges.renderOrder = role === "reference" ? 8 : 13;
    });
  }, [arcMode, circleMode, copyMode, document, hoveredEntityKey, lineMode, moveMode, polylineMode, rectangleMode, rotateMode, rotationBaseKey, selectedEntityKeys, selectedFaceIndex, selectedObjectId, selectedObjectIds, viewTarget]);

  useEffect(() => {
    lineViewsRef.current.forEach((view, lineId) => {
      const selected = selectedEntityKeys.includes(cadEntityKey({ id: lineId, kind: "line" }));
      const hovered = hoveredEntityKey === cadEntityKey({ id: lineId, kind: "line" });
      const line = findLineObject(document, lineId);
      if (!line) return;
      const role = storyDisplayRole(document, viewTarget, line.storyId);
      const layer = displayLayerForStory(document, viewTarget, line.storyId, line.layerId);
      const fill = resolvedStoryFill(document, viewTarget, line.storyId, line.layerId, line);
      view.material.color.setHex(selected ? 0xf2bd5b : hovered ? 0x6fd8f5 : layer ? Number.parseInt(layer.color.slice(1), 16) : 0x88bff0);
      view.material.transparent = role === "reference";
      view.material.opacity = role === "reference" ? 0.62 : 1;
      view.line.renderOrder = role === "reference" ? 7 : 12;
      view.fillMaterial?.color.setHex(selected ? 0xd9a53f : hovered ? 0x4fb7d6 : Number.parseInt(fill.color.slice(1), 16));
      if (view.fill && view.fillMaterial) {
        view.fill.visible = Boolean(role !== "hidden" && (layer?.visible ?? true) && fill.visible);
        view.fillMaterial.opacity = selected || hovered ? 0.58 : 0.38;
      }
      view.material.linewidth = selected || hovered ? 2 : 1;
    });
    wallViewsRef.current.forEach((view, lineId) => {
      const selected = selectedEntityKeys.includes(cadEntityKey({ id: lineId, kind: "line" }));
      const hovered = hoveredEntityKey === cadEntityKey({ id: lineId, kind: "line" });
      const line = findLineObject(document, lineId);
      if (!line) return;
      const role = storyDisplayRole(document, viewTarget, line.storyId);
      const hostLayer = displayLayerForStory(document, viewTarget, line.storyId, line.layerId);
      const openingById = new Map(line?.wallOpenings.map((opening) => [opening.id, opening]) ?? []);
      [...view.meshes, ...view.productMeshes].forEach((mesh) => {
        const opening = openingById.get(String(mesh.userData.wallOpeningId ?? ""));
        const owner = opening ?? line;
        const ownerLayerId = opening?.layerId ?? line?.layerId;
        const fill = resolvedStoryFill(document, viewTarget, line.storyId, ownerLayerId, owner);
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => {
          if (!(material instanceof THREE.MeshStandardMaterial)) return;
          if (viewTarget.id === "top") material.color.set(fill.color);
          material.emissive.setHex(selected ? 0x422906 : hovered ? 0x063345 : 0x000000);
        });
        setMeshOpacity(mesh, fill.visible, selected, hovered, role === "reference");
        mesh.renderOrder = role === "reference" ? 2 : 4;
      });
      view.edges.forEach((edge) => {
        const opening = openingById.get(String(edge.userData.wallOpeningId ?? ""));
        const edgeLayer = displayLayerForStory(document, viewTarget, line.storyId, opening?.layerId ?? line.layerId) ?? hostLayer;
        const edgeMaterial = edge.material as THREE.LineBasicMaterial;
        edgeMaterial.color.setHex(selected ? 0xf2bd5b : hovered ? 0x6fd8f5 : edgeLayer ? Number.parseInt(edgeLayer.color.slice(1), 16) : 0x263746);
        edgeMaterial.transparent = role === "reference";
        edgeMaterial.opacity = role === "reference" ? 0.62 : 0.94;
        edge.renderOrder = role === "reference" ? 8 : 20;
        const sourceMesh = edge.userData.sourceMesh as THREE.Mesh | undefined;
        edge.visible = sourceMesh?.visible ?? true;
      });
      view.materials.forEach((material) => {
        material.emissive.setHex(selected ? 0x422906 : hovered ? 0x063345 : 0x000000);
      });
    });
    roofPlaneViewsRef.current.forEach((view, polylineId) => {
      const selected = selectedEntityKeys.includes(cadEntityKey({ id: polylineId, kind: "polyline" }));
      const hovered = hoveredEntityKey === cadEntityKey({ id: polylineId, kind: "polyline" });
      const polyline = findPolylineObject(document, polylineId);
      if (!polyline) return;
      const role = storyDisplayRole(document, viewTarget, polyline.storyId);
      const layer = displayLayerForStory(document, viewTarget, polyline.storyId, polyline.layerId);
      const fill = resolvedStoryFill(document, viewTarget, polyline.storyId, polyline.layerId, polyline);
      view.meshes.forEach((mesh) => {
        setMeshOpacity(mesh, fill.visible, selected, hovered, role === "reference");
        mesh.renderOrder = role === "reference" ? 2 : 4;
      });
      view.edges.forEach((edge) => {
        const material = edge.material as THREE.LineBasicMaterial;
        material.color.setHex(selected ? 0xf2bd5b : hovered ? 0x6fd8f5 : layer ? Number.parseInt(layer.color.slice(1), 16) : 0x6d4f39);
        material.transparent = role === "reference";
        material.opacity = role === "reference" ? 0.62 : 0.92;
        edge.renderOrder = role === "reference" ? 8 : 14;
      });
      view.materials.forEach((material) => {
        material.color.set(fill.color);
        material.emissive.setHex(selected ? 0x422906 : hovered ? 0x063345 : 0x000000);
      });
    });
  }, [document, hoveredEntityKey, selectedEntityKeys, viewTarget]);

  useEffect(() => {
    polylineViewsRef.current.forEach((view, polylineId) => {
      const selected = selectedEntityKeys.includes(cadEntityKey({ id: polylineId, kind: "polyline" }));
      const hovered = hoveredEntityKey === cadEntityKey({ id: polylineId, kind: "polyline" });
      const polyline = findPolylineObject(document, polylineId);
      if (!polyline) return;
      const role = storyDisplayRole(document, viewTarget, polyline.storyId);
      const layer = displayLayerForStory(document, viewTarget, polyline.storyId, polyline.layerId);
      const fill = resolvedStoryFill(document, viewTarget, polyline.storyId, polyline.layerId, polyline);
      view.material.color.setHex(selected ? 0xf2bd5b : hovered ? 0x6fd8f5 : layer ? Number.parseInt(layer.color.slice(1), 16) : 0x88bff0);
      view.material.transparent = role === "reference";
      view.material.opacity = role === "reference" ? 0.62 : 1;
      view.line.renderOrder = role === "reference" ? 7 : 12;
      if (view.fillMaterial) view.fillMaterial.color.setHex(Number.parseInt(fill.color.slice(1), 16));
      if (view.fill) {
        view.fill.visible = Boolean(role !== "hidden" && (layer?.visible ?? true) && fill.visible && (polyline.width ?? 0) >= 1 / 16);
        view.fill.renderOrder = role === "reference" ? 6 : 11;
      }
    });
    floorPlatformViewsRef.current.forEach((view, polylineId) => {
      const selected = selectedEntityKeys.includes(cadEntityKey({ id: polylineId, kind: "polyline" }));
      const hovered = hoveredEntityKey === cadEntityKey({ id: polylineId, kind: "polyline" });
      const polyline = findPolylineObject(document, polylineId);
      if (!polyline) return;
      const role = storyDisplayRole(document, viewTarget, polyline.storyId);
      const layer = displayLayerForStory(document, viewTarget, polyline.storyId, polyline.layerId);
      const fill = resolvedStoryFill(document, viewTarget, polyline.storyId, polyline.layerId, polyline);
      view.meshes.forEach((mesh) => {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => {
          if (material instanceof THREE.MeshStandardMaterial && viewTarget.id === "top") material.color.set(fill.color);
        });
        setMeshOpacity(mesh, fill.visible, selected, hovered, role === "reference");
        mesh.renderOrder = role === "reference" ? 2 : 4;
      });
      view.edges.forEach((edge) => {
        const material = edge.material as THREE.LineBasicMaterial;
        material.color.setHex(selected ? 0xf2bd5b : hovered ? 0x6fd8f5 : layer ? Number.parseInt(layer.color.slice(1), 16) : 0x263746);
        material.transparent = role === "reference";
        material.opacity = role === "reference" ? 0.62 : 0.92;
        edge.renderOrder = role === "reference" ? 8 : 14;
      });
      view.materials.forEach((material) => {
        material.emissive.setHex(selected ? 0x422906 : hovered ? 0x063345 : 0x000000);
      });
    });
  }, [document, hoveredEntityKey, selectedEntityKeys, viewTarget]);

  useEffect(() => {
    const showGeneratedRoomPlatforms = viewTarget.id !== "top";
    roomPlatformViewsRef.current.forEach((view, roomId) => {
      const room = document.rooms.find((candidate) => candidate.id === roomId);
      const fill = resolvedObjectFill(document, room?.layerId, room);
      view.meshes.forEach((mesh) => {
        mesh.visible = showGeneratedRoomPlatforms;
        setMeshOpacity(mesh, fill.visible);
      });
      view.edges.forEach((edge) => { edge.visible = showGeneratedRoomPlatforms; });
    });
  }, [document, viewTarget]);

  useEffect(() => {
    circleViewsRef.current.forEach((view, circleId) => {
      const selected = selectedEntityKeys.includes(cadEntityKey({ id: circleId, kind: "circle" }));
      const hovered = hoveredEntityKey === cadEntityKey({ id: circleId, kind: "circle" });
      const circle = findCircleObject(document, circleId);
      if (!circle) return;
      const role = storyDisplayRole(document, viewTarget, circle.storyId);
      const layer = displayLayerForStory(document, viewTarget, circle.storyId, circle.layerId);
      view.material.color.setHex(selected ? 0xf2bd5b : hovered ? 0x6fd8f5 : layer ? Number.parseInt(layer.color.slice(1), 16) : 0x88bff0);
      view.material.transparent = role === "reference";
      view.material.opacity = role === "reference" ? 0.62 : 1;
      view.line.renderOrder = role === "reference" ? 7 : 12;
    });
  }, [document, hoveredEntityKey, selectedEntityKeys, viewTarget]);

  useEffect(() => {
    arcViewsRef.current.forEach((view, arcId) => {
      const selected = selectedEntityKeys.includes(cadEntityKey({ id: arcId, kind: "arc" }));
      const hovered = hoveredEntityKey === cadEntityKey({ id: arcId, kind: "arc" });
      const arc = findArcObject(document, arcId);
      if (!arc) return;
      const role = storyDisplayRole(document, viewTarget, arc.storyId);
      const layer = displayLayerForStory(document, viewTarget, arc.storyId, arc.layerId);
      view.material.color.setHex(selected ? 0xf2bd5b : hovered ? 0x6fd8f5 : layer ? Number.parseInt(layer.color.slice(1), 16) : 0x88bff0);
      view.material.transparent = role === "reference";
      view.material.opacity = role === "reference" ? 0.62 : 1;
      view.line.renderOrder = role === "reference" ? 7 : 12;
    });
  }, [document, hoveredEntityKey, selectedEntityKeys, viewTarget]);

  useEffect(() => {
    if (fitViewSignal > 0) fitViewRef.current?.();
  }, [fitViewSignal]);

  const dragVerb = dragStatus?.kind === "object" || dragStatus?.kind === "copy"
    ? `${dragStatus.kind === "copy" ? "COPY" : "MOVE"} ${dragStatus.axis?.toUpperCase() ?? ""}`
    : dragStatus?.kind === "plan-move"
      ? "MOVE CENTER · X/Y"
    : dragStatus?.kind === "entry"
      ? `EXACT FACE · ${dragStatus.axis?.toUpperCase() ?? ""}`
    : dragStatus?.kind === "grip"
      ? `RESIZE ${dragStatus.gripKind?.toUpperCase() ?? "GRIP"}`
    : dragStatus?.kind === "rotate"
      ? "ROTATE Z"
    : dragStatus?.kind === "scale"
      ? "SCALE"
    : dragStatus?.kind === "mirror"
      ? "MIRROR AXIS"
    : dragStatus?.kind === "offset"
      ? "OFFSET"
    : dragStatus?.kind === "chamfer"
      ? "CHAMFER"
    : dragStatus?.kind === "fillet"
      ? "FILLET"
    : dragStatus?.kind === "lengthen"
      ? "LENGTHEN"
    : dragStatus?.kind === "line"
      ? "LINE"
    : dragStatus?.kind === "line-grip"
      ? "EDIT LINE"
    : dragStatus?.kind === "arc"
      ? "ARC"
    : dragStatus?.kind === "arc-grip"
      ? "EDIT ARC"
    : dragStatus?.kind === "circle"
      ? "CIRCLE"
    : dragStatus?.kind === "circle-grip"
      ? "EDIT CIRCLE"
    : dragStatus?.kind === "polyline"
      ? "POLYLINE"
    : dragStatus?.kind === "rectangle"
      ? "RECTANGLE"
    : dragStatus?.kind === "polyline-grip"
      ? "EDIT VERTEX"
    : dragStatus && dragStatus.distance < 0 ? "PUSH" : "PULL";
  const multiAxisDistanceText = dragStatus?.kind === "grip" || dragStatus?.kind === "plan-move"
    ? (["x", "y", "z"] as AxisKey[])
        .filter((axis) => dragStatus.axisDistances?.[axis] !== undefined)
        .map((axis) => `${axis.toUpperCase()} ${formatSignedArchitectural(dragStatus.axisDistances?.[axis] ?? 0)}`)
        .join(" · ")
    : "";
  const viewportSelectionIsEditable = selectedObjectIds.every((objectId) => {
    const object = findBoxObject(document, objectId);
    return object && objectIsEditable(document, object);
  });
  const temporarilyDimensionedWall = findLineObject(document, temporaryWallDimensionScreen?.lineId ?? null);

  return (
    <div className="viewport" ref={mountRef} aria-label="3D model viewport">
      {selectionBox ? (
        <div
          className={`cad-selection-window is-${selectionBox.mode}`}
          style={{
            height: Math.abs(selectionBox.end.y - selectionBox.start.y),
            left: Math.min(selectionBox.start.x, selectionBox.end.x),
            top: Math.min(selectionBox.start.y, selectionBox.end.y),
            width: Math.abs(selectionBox.end.x - selectionBox.start.x),
          }}
          aria-hidden="true"
        >
          <span>{selectionBox.mode === "window" ? "WINDOW" : "CROSSING"}</span>
        </div>
      ) : null}
      {selectionCycle ? (
        <div
          className="cad-selection-cycle"
          style={{ left: selectionCycle.x, top: selectionCycle.y }}
          role="status"
          aria-live="polite"
        >
          <strong>{selectionCycle.label}</strong>
          <span>{selectionCycle.index + 1} of {selectionCycle.count}</span>
          <small>Click again or press Tab to cycle</small>
        </div>
      ) : null}
      <div className="viewport-badge">{viewTarget.label}</div>
      {roomLabelScreens.map((screen) => {
        const room = document.rooms.find((candidate) => candidate.id === screen.roomId);
        if (!room) return null;
        const story = document.building.stories.find((candidate) => candidate.id === room.storyId);
        const storyElevation = calculateStoryElevations(document.building).find((item) => item.storyId === room.storyId)?.roughFloorElevation ?? 0;
        const effective = story ? effectiveRoomSettings(room, story, storyElevation) : null;
        const annotationVisible = (kind: RoomAnnotationObject["kind"]) => {
          const annotation = document.roomAnnotations.find((candidate) => candidate.roomId === room.id && candidate.kind === kind);
          return Boolean(annotation?.visible && findLayer(document, annotation.layerId)?.visible);
        };
        const xs = room.boundary.vertices.map((point) => point.x);
        const ys = room.boundary.vertices.map((point) => point.y);
        const width = Math.max(...xs) - Math.min(...xs);
        const depth = Math.max(...ys) - Math.min(...ys);
        const annotationScale = document.savedPlanViews.find((candidate) => candidate.id === document.activeSavedPlanViewId)?.annotationScale ?? 48;
        const labelScale = Math.max(0.7, Math.min(1.45, 48 / annotationScale));
        return <div className="room-label-object" key={room.id} style={{ left: screen.x, top: screen.y, "--room-label-scale": labelScale } as CSSProperties} onDoubleClick={() => onRoomLabelOpen(room.id)}>
          {activeRoomLabelId === room.id ? <select value={room.roomType} onBlur={() => setActiveRoomLabelId(null)} onChange={(event) => { onRoomLabelTypeChange(room.id, event.target.value); setActiveRoomLabelId(null); }} aria-label={`Room type for ${room.name}`}>{ROOM_TYPES.map((type) => <option value={type} key={type}>{type}</option>)}</select> : <button type="button" onClick={() => setActiveRoomLabelId(room.id)}>{room.name}</button>}
          {annotationVisible("area") ? <span>{(polylineArea(room.boundary) / 144).toLocaleString(undefined, { maximumFractionDigits: 1 })} SQ FT</span> : null}
          {annotationVisible("interior-dimensions") ? <span>{formatArchitectural(width)} × {formatArchitectural(depth)}</span> : null}
          {annotationVisible("rough-ceiling-height") && effective ? activeRoomCeilingId === room.id ? <input className="room-label-ceiling-input" value={roomCeilingDraft} onChange={(event) => setRoomCeilingDraft(event.target.value)} onBlur={() => setActiveRoomCeilingId(null)} onKeyDown={(event) => {
            if (event.key === "Escape") setActiveRoomCeilingId(null);
            if (event.key === "Enter") {
              const height = parseArchitectural(roomCeilingDraft);
              if (height !== null && onRoomCeilingHeightChange(room.id, height)) setActiveRoomCeilingId(null);
            }
          }} aria-label={`Rough ceiling height for ${room.name}`} /> : <span className="room-label-ceiling" title="Double-click to edit the Room rough ceiling height" onDoubleClick={(event) => { event.stopPropagation(); setRoomCeilingDraft(formatArchitectural(effective.roughCeilingHeight)); setActiveRoomCeilingId(room.id); }}>CLG {formatArchitectural(effective.roughCeilingHeight)}</span> : null}
        </div>;
      })}
      {temporaryWallDimensionScreen && temporarilyDimensionedWall?.architecturalRole === "wall" && !dragStatus && !lineMode ? (
        <TemporaryWallDimension
          key={temporarilyDimensionedWall.id}
          length={lineLength(temporarilyDimensionedWall)}
          screen={temporaryWallDimensionScreen}
          onClearanceCommit={(referenceWallId, distance) => onWallClearanceChange(temporarilyDimensionedWall.id, referenceWallId, distance)}
          onCommit={(fixedEndpoint, length) => onWallLengthChange(temporarilyDimensionedWall.id, fixedEndpoint, length)}
        />
      ) : null}
      <NavigationCube
        orbitRef={cubeOrbitRef}
        orientationRef={cameraOrientationRef}
        onNavigate={onViewChange}
      />
      <button className="fit-view" type="button" onClick={() => fitViewRef.current?.()}>
        Fit view
      </button>
      {arcMode && dynamicArcInput ? (
        <div className="line-dynamic-input arc-dynamic-input" style={{ left: dynamicArcInput.x, top: dynamicArcInput.y }} aria-live="polite">
          <strong>Z {formatSignedArchitectural(dynamicArcInput.elevation)}</strong>
          <span>{dynamicArcInput.stage}</span>
          <small>{dynamicArcInput.label}</small>
        </div>
      ) : null}
      {lineMode && dynamicLineInput ? (
        <div className="line-dynamic-input" style={{ left: dynamicLineInput.x, top: dynamicLineInput.y }} aria-live="polite">
          <strong>{dynamicLineInput.distance > 0 ? formatArchitectural(dynamicLineInput.distance) : `Z ${formatSignedArchitectural(dynamicLineInput.elevation)}`}</strong>
          <span>{dynamicLineInput.distance > 0 ? `${dynamicLineInput.angle}°` : "FIRST POINT"}</span>
          <small>{dynamicLineInput.label}</small>
        </div>
      ) : null}
      {(moveMode || copyMode || stretchMode) && dynamicLineInput ? (
        <div className="line-dynamic-input" style={{ left: dynamicLineInput.x, top: dynamicLineInput.y }} aria-live="polite">
          <strong>{dynamicLineInput.distance > 0 ? formatArchitectural(dynamicLineInput.distance) : `Z ${formatSignedArchitectural(dynamicLineInput.elevation)}`}</strong>
          <span>{dynamicLineInput.distance > 0 ? `${dynamicLineInput.angle}°` : "BASE POINT"}</span>
          <small>{dynamicLineInput.label}</small>
        </div>
      ) : null}
      {(offsetMode || breakMode || chamferMode || filletMode || lengthenMode || trimMode || extendMode) && dynamicLineInput ? (
        <div className="line-dynamic-input offset-dynamic-input" style={{ left: dynamicLineInput.x, top: dynamicLineInput.y }} aria-live="polite">
          <strong>{chamferMode ? `${formatArchitectural(dynamicLineInput.distance)} × ${formatArchitectural(dynamicLineInput.angle)}` : formatArchitectural(dynamicLineInput.distance)}</strong>
          <span>{breakMode || filletMode || lengthenMode ? "PICK CURVE" : chamferMode ? "PICK LINE" : "PICK SIDE"}</span>
          <small>{dynamicLineInput.label}</small>
        </div>
      ) : null}
      {circleMode && dynamicCircleInput ? (
        <div className="line-dynamic-input circle-dynamic-input" style={{ left: dynamicCircleInput.x, top: dynamicCircleInput.y }} aria-live="polite">
          <strong>{dynamicCircleInput.radius > 0 ? `R ${formatArchitectural(dynamicCircleInput.radius)}` : `Z ${formatSignedArchitectural(dynamicCircleInput.elevation)}`}</strong>
          <span>{dynamicCircleInput.radius > 0 ? `D ${formatArchitectural(dynamicCircleInput.radius * 2)}` : dynamicCircleInput.stage}</span>
          <small>{dynamicCircleInput.label}</small>
        </div>
      ) : null}
      {polylineMode && dynamicPolylineInput ? (
        <div className="line-dynamic-input polyline-dynamic-input" style={{ left: dynamicPolylineInput.x, top: dynamicPolylineInput.y }} aria-live="polite">
          <strong>{dynamicPolylineInput.distance > 0 ? formatArchitectural(dynamicPolylineInput.distance) : `Z ${formatSignedArchitectural(dynamicPolylineInput.elevation)}`}</strong>
          <span>{dynamicPolylineInput.distance > 0 ? `${dynamicPolylineInput.angle}°` : "FIRST POINT"}</span>
          <small>{dynamicPolylineInput.label}</small>
        </div>
      ) : null}
      {rectangleMode && dynamicRectangleInput ? (
        <div className="line-dynamic-input rectangle-dynamic-input" style={{ left: dynamicRectangleInput.x, top: dynamicRectangleInput.y }} aria-live="polite">
          <strong>{dynamicRectangleInput.width > 0 ? `${formatArchitectural(dynamicRectangleInput.width)} × ${formatArchitectural(dynamicRectangleInput.height)}` : `Z ${formatSignedArchitectural(dynamicRectangleInput.elevation)}`}</strong>
          <span>{dynamicRectangleInput.width > 0 ? "WIDTH × HEIGHT" : "FIRST CORNER"}</span>
          <small>{dynamicRectangleInput.label}</small>
        </div>
      ) : null}
      {dragStatus ? (
        <div className={`${dragStatus.valid ? "drag-readout" : "drag-readout is-invalid"}${dragStatus.snapped || dragStatus.polarAngle !== null && dragStatus.polarAngle !== undefined ? " is-snapped" : ""}`}>
          <span>{dragVerb}</span>
          <strong>{dragStatus.kind === "rotate" ? `${dragStatus.angle ?? 0}°` : dragStatus.kind === "scale" ? `${dragStatus.factor ?? 1}×` : dragStatus.kind === "mirror" ? `${formatArchitectural(dragStatus.distance)} · ${dragStatus.angle ?? 0}°` : dragStatus.kind === "offset" ? formatArchitectural(dragStatus.distance) : dragStatus.kind === "line" || dragStatus.kind === "line-grip" || dragStatus.kind === "polyline" ? `${formatArchitectural(dragStatus.distance)} · ${dragStatus.angle ?? 0}°` : dragStatus.kind === "circle" || dragStatus.kind === "circle-grip" ? `R ${formatArchitectural(dragStatus.distance)}` : dragStatus.kind === "arc" || dragStatus.kind === "arc-grip" || dragStatus.kind === "rectangle" || dragStatus.kind === "polyline-grip" ? formatArchitectural(dragStatus.distance) : dragStatus.kind === "grip" || dragStatus.kind === "plan-move" ? multiAxisDistanceText : dragStatus.kind !== "face" ? formatSignedArchitectural(dragStatus.distance) : formatArchitectural(Math.abs(dragStatus.distance))}</strong>
          <small>{dragStatus.kind === "entry"
            ? dragStatus.valid ? "Enter to apply · Escape to cancel" : "Enter a valid architectural distance"
            : dragStatus.kind === "rotate"
            ? dragStatus.valid ? "15° snap · hold Shift for 1°" : "Rotation is outside the supported range"
            : dragStatus.kind === "scale"
            ? dragStatus.valid ? "0.1 factor snap · hold Shift for 0.01" : "Scale is outside the supported range"
            : dragStatus.kind === "mirror"
            ? dragStatus.valid ? `${dragStatus.snapped ? "Object snap" : "1/16 inch grid"} · click to set the second axis point` : "Mirror axis points must be different"
            : dragStatus.kind === "offset"
            ? dragStatus.valid ? "Click to create the offset on this side" : "This side cannot produce a valid offset"
            : dragStatus.kind === "line"
            ? dragStatus.distance > 0 ? `${dragStatus.snapped ? "Object snap" : dragStatus.polarAngle !== null && dragStatus.polarAngle !== undefined ? `Polar ${dragStatus.polarAngle}°` : "1/16 inch grid"} · click or type distance` : "Choose a start point"
            : dragStatus.kind === "line-grip"
            ? dragStatus.snapped ? "Endpoint or midpoint snap" : "1/16 inch grid"
            : dragStatus.kind === "arc"
            ? dragStatus.valid ? "Three-point Arc · click or enter the next point" : "Choose a non-collinear endpoint"
            : dragStatus.kind === "arc-grip"
            ? dragStatus.valid ? "Arc grip · release to apply" : "That grip position cannot form a valid Arc"
            : dragStatus.kind === "circle"
            ? dragStatus.distance > 0 ? `${dragStatus.snapped ? "Object snap" : "1/16 inch grid"} · click or type radius` : "Choose the center point"
            : dragStatus.kind === "circle-grip"
            ? dragStatus.snapped ? "Circle grip · object snap" : "Circle grip · 1/16 inch grid"
            : dragStatus.kind === "polyline"
            ? dragStatus.distance > 0 ? `${dragStatus.snapped ? "Object snap" : dragStatus.polarAngle !== null && dragStatus.polarAngle !== undefined ? `Polar ${dragStatus.polarAngle}°` : "1/16 inch grid"} · click or type distance` : "Choose the first vertex"
            : dragStatus.kind === "rectangle"
            ? dragStatus.distance > 0 ? "Click opposite corner to place" : "Choose first corner"
            : dragStatus.kind === "polyline-grip"
            ? dragStatus.snapped ? "Vertex object snap" : "Vertex · 1/16 inch grid"
            : dragStatus.kind === "plan-move"
            ? dragStatus.valid ? dragStatus.snapped ? "Work plane · object face snap" : "Work plane X/Y · 1/16 inch" : "Coordinate limit reached"
            : dragStatus.kind === "grip"
            ? dragStatus.valid ? "Opposite faces fixed · 1/16 inch" : "Minimum size reached"
            : dragStatus.kind !== "face"
            ? dragStatus.snapped ? "Object face snap" : dragStatus.valid ? dragStatus.kind === "copy" ? "Release to place copy" : "Grid snap · 1/16 inch" : dragStatus.kind === "copy" ? "Copy cannot be placed" : "Coordinate limit reached"
            : dragStatus.valid ? "Opposite face fixed" : "Minimum size reached"}</small>
        </div>
      ) : null}
      {activeGripInput && !copyMode && !moveMode && activeGripInput.objectId === selectedObjectId && activeGripInput.faceIndex === selectedFaceIndex ? (
        <form
          className={gripInputError ? "grip-dynamic-input has-error" : "grip-dynamic-input"}
          style={{ left: activeGripInput.x, top: activeGripInput.y }}
          onSubmit={(event) => {
            event.preventDefault();
            commitGripInput();
          }}
        >
          <span>{activeGripInput.axis.toUpperCase()}</span>
          <input
            ref={focusGripInput}
            value={gripDraft}
            onChange={(event) => updateGripDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitGripInput();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                closeGripInput();
              }
            }}
            aria-label="Exact face grip distance"
            placeholder={'6" or -6"'}
            spellCheck={false}
          />
          <b>ft-in</b>
          {gripInputError ? <small role="alert">{gripInputError}</small> : null}
        </form>
      ) : null}
      {selectedObjectId && !dragStatus ? <div className={`${copyMode ? "move-grip-hint is-copying" : rotateMode || scaleMode ? "move-grip-hint is-rotating" : "move-grip-hint"}${viewportSelectionIsEditable ? "" : " is-locked"}`}>{!viewportSelectionIsEditable ? "Selection locked · unlock to edit" : copyMode ? "COPY MODE · drag an axis arrow to place" : mirrorMode ? "MIRROR · pick two points for the mirror axis" : rotateMode ? "ROTATE Z · drag the gold ring · Shift for 1°" : scaleMode ? "SCALE · drag the green square · Shift for 0.01 precision" : selectedObjectIds.length > 1 ? `Drag axis arrows to move ${selectedObjectIds.length} selected objects` : moveMode ? "MOVE MODE · drag an X · Y · Z arrow" : "Center grip moves · face, edge, and corner grips resize"}</div> : null}
      {arcMode && !dragStatus ? <div className="move-grip-hint is-drawing">ARC · start point · second point · endpoint · exact coordinates accepted</div> : null}
      {lineMode && !dragStatus ? <div className="move-grip-hint is-drawing">LINE · click or type X,Y,Z · type a distance · U undoes · C closes</div> : null}
      {circleMode && !dragStatus ? <div className="move-grip-hint is-drawing">CIRCLE · click or type center · click edge or type radius · Escape exits</div> : null}
      {selectedLineId && !lineMode && !dragStatus ? <div className="move-grip-hint">{temporarilyDimensionedWall?.architecturalRole === "wall" ? "Wall selected · edit blue length · S/E holds an endpoint · edit green Wall-to-Wall dimensions" : "Line selected · blue endpoints reshape · green midpoint moves"}</div> : null}
      {selectedCircleId && !circleMode && !dragStatus ? <div className="move-grip-hint">Circle selected · green center moves · blue quadrant grips resize</div> : null}
      {selectedArcId && !arcMode && !dragStatus ? <div className="move-grip-hint">Arc selected · blue endpoints and midpoint reshape · green center moves</div> : null}
      {polylineMode && !dragStatus ? <div className="move-grip-hint is-drawing">POLYLINE · click or type points · distance follows cursor · U undoes · C closes</div> : null}
      {rectangleMode && !dragStatus ? <div className="move-grip-hint is-drawing">RECTANGLE · click or type first corner · opposite corner or width × height</div> : null}
      {selectedPolylineId && !polylineMode && !rectangleMode && !dragStatus ? <div className="move-grip-hint">{(() => { const selected = document.polylines.find((polyline) => polyline.id === selectedPolylineId); return selected?.architecturalRole === "roof-plane" ? "Roof Plane selected · gold eave grips adjust bearing span · blue grips shape the roof boundary" : selected?.shape === "rectangle" && rectangleSupportsConstrainedGrips(selected) ? "Rectangle selected · corner and edge grips resize · center grip moves" : "Closed polyline selected · drag blue vertex grips to reshape"; })()}</div> : null}
      {viewTarget.id === "top" ? (
        <div className="axis-labels plan-ucs" aria-hidden="true">
          <i className="plan-ucs-origin" />
          <span className="plan-ucs-axis plan-ucs-x"><b>X</b></span>
          <span className="plan-ucs-axis plan-ucs-y"><b>Y</b></span>
        </div>
      ) : (
        <div className="axis-labels perspective-ucs" aria-hidden="true">
          <span className="axis-x">X</span><span className="axis-y">Y</span><span className="axis-z">Z</span>
        </div>
      )}
    </div>
  );
}
