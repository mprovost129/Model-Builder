import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import test from "node:test";

const FEATURE_ROOT = new URL("../features/", import.meta.url);

/** Every module under features/, so UI content assertions do not care which file a panel lives in. */
async function readFeatureSources() {
  const sources = [];
  const walk = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
      if (entry.isDirectory()) await walk(child);
      else if (/\.tsx?$/.test(entry.name)) sources.push(await readFile(child, "utf8"));
    }
  };
  await walk(FEATURE_ROOT);
  return sources;
}


const templateRoot = new URL("../", import.meta.url);
const previewRoot = new URL("../app/_sites-preview/", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Slater Woods Omni Design startup dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Slater Woods Omni Design<\/title>/i);
  assert.match(html, /Slater Woods Omni Design/);
  assert.match(html, /aria-label="Program menu"/);
  assert.match(html, /aria-label="Quick access"/);
  assert.match(html, /app-shell theme-light is-dashboard/);
  assert.match(html, /aria-label="Switch to dark mode"/);
  assert.match(html, />Light</);
  assert.match(html, /aria-label="Save project as"/);
  assert.match(html, /aria-label="Application menus"/);
  assert.match(html, />File</);
  assert.match(html, />Edit</);
  assert.match(html, />Window</);
  assert.match(html, />Tools</);
  assert.match(html, />Help</);
  assert.match(html, /aria-label="Open projects"/);
  assert.match(html, /aria-label="Slater Woods Omni Design dashboard"/);
  assert.match(html, />Omni Design</);
  assert.match(html, /Begin a project/);
  assert.match(html, />New Plan</);
  assert.match(html, /Blank model in 2D Top view/);
  assert.match(html, /Pick up where you left off/);
  assert.match(html, /No recent projects yet/);
  assert.match(html, /Local convenience copies/);
  assert.match(html, /Recommended workflow/);
  assert.match(html, /Project settings/);
  assert.match(html, /Foundation and layered wall types/);
  assert.match(html, /Help and reference/);
  assert.match(html, /Local recovery is active/);
  assert.doesNotMatch(html, /aria-label="Tool categories"|aria-label="Model and layouts"|aria-label="Command input"/);
  assert.match(html, /aria-label="Project name"/);
  assert.match(html, /title="New blank plan"/);
  assert.match(html, /accept="\.mbproj,application\/json"/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("keeps product code separate from the removed starter preview", async () => {
  const [page, layout, component, productLibraryDialog, productRepresentationRenderer, productRepresentations, materialLibrary, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/model-builder-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/products/product-library-dialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/products/product-representation-renderer.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/product-representations.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/material-library.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  // The interface is no longer one file. Content assertions below run against
  // the app shell plus every feature module it composes, so moving a panel or a
  // dialog into its own module does not break a test about what the UI offers.
  // Assertions that are specifically about the shell keep using `component`.
  const ui = [component, ...(await readFeatureSources())].join("\n");

  assert.match(page, /import \{ ModelBuilderApp \}/);
  assert.match(page, /<ModelBuilderApp \/>/);
  assert.match(layout, /title:\s*"Slater Woods Omni Design"/);
  assert.match(component, /"use client"/);
  assert.match(component, /from "@\/features\/products\/product-library-dialog"/);
  assert.match(component, /from "@\/features\/products\/product-representation-renderer"/);
  assert.doesNotMatch(component, /function ProductLibraryDialog/);
  assert.match(productLibraryDialog, /export function ProductLibraryDialog/);
  assert.match(productLibraryDialog, /Representation Alignment/);
  assert.match(productLibraryDialog, /New Object Type/);
  assert.match(productLibraryDialog, /Place on Current Layer/);
  assert.match(ui, /addProductObject/);
  assert.match(productRepresentationRenderer, /applyPreferredProductRepresentations/);
  assert.match(productRepresentationRenderer, /native parametric components remain visible/);
  assert.match(productRepresentations, /preferredProductAssetForView/);
  assert.match(ui, /from "three"/);
  assert.match(ui, /OrthographicCamera/);
  assert.match(ui, /changeViewTarget/);
  assert.match(ui, /NavigationCube/);
  assert.match(ui, /CubeOrbitController/);
  assert.match(ui, /is-orbiting/);
  assert.match(ui, /skipNextViewApplyRef/);
  assert.match(ui, /navigationTargetFromDirection/);
  assert.match(ui, /CameraTransition/);
  assert.match(ui, /prefers-reduced-motion/);
  assert.match(ui, /slerpQuaternions/);
  assert.match(ui, /Standard views · orthographic/);
  assert.match(ui, /parseArchitectural/);
  assert.match(ui, /parseSignedArchitectural/);
  assert.match(ui, /moveBoxFace/);
  assert.match(ui, /moveBoxObject/);
  assert.match(ui, /moveBoxObjects/);
  assert.match(ui, /alignBoxObjects/);
  assert.match(ui, /deleteBoxObjects/);
  assert.match(ui, /groupBoxObjects/);
  assert.match(ui, /ungroupBoxObjects/);
  assert.match(ui, /setBoxObjectsLocked/);
  assert.match(ui, /selectionIdsForObject/);
  assert.match(ui, /Selection locked/);
  assert.match(ui, /PropertyGridSection/);
  assert.match(ui, /PropertyGridRow/);
  assert.match(ui, /layer-grid/);
  assert.match(ui, /Search layers/);
  assert.match(ui, /copyBoxObjects/);
  assert.match(ui, /CopyObjectsControl/);
  assert.match(ui, /Copy active/);
  assert.match(ui, /moveModelEntities/);
  assert.match(ui, /copyModelEntities/);
  assert.match(ui, /deleteModelEntities/);
  assert.match(ui, /rotateModelEntities/);
  assert.match(ui, /modelSelectionRotationBase/);
  assert.match(ui, /scaleModelEntities/);
  assert.match(ui, /modelSelectionScaleBase/);
  assert.match(ui, /ScaleControl/);
  assert.match(ui, /mirrorModelEntities/);
  assert.match(ui, /MirrorControl/);
  assert.match(ui, /onMirrorCommit/);
  assert.match(ui, /offsetModelEntity/);
  assert.match(ui, /OffsetControl/);
  assert.match(ui, /onOffsetCommit/);
  assert.match(ui, /trimModelEntity/);
  assert.match(ui, /extendModelEntity/);
  assert.match(ui, /TrimExtendControl/);
  assert.match(ui, /onTrimExtendCommit/);
  assert.match(ui, /breakModelEntity/);
  assert.match(ui, /BreakControl/);
  assert.match(ui, /onBreakCommit/);
  assert.match(ui, /joinModelEntities/);
  assert.match(ui, /JoinControl/);
  assert.match(ui, /explodeModelEntities/);
  assert.match(ui, /ExplodeControl/);
  assert.match(ui, /lengthenModelEntity/);
  assert.match(ui, /LengthenControl/);
  assert.match(ui, /onLengthenCommit/);
  assert.match(ui, /chamferLineObjects/);
  assert.match(ui, /chamferPolylineObject/);
  assert.match(ui, /Chamfer Polyline/);
  assert.match(ui, /ChamferControl/);
  assert.match(ui, /onChamferCommit/);
  assert.match(ui, /filletCurveObjects/);
  assert.match(ui, /filletPolylineObject/);
  assert.match(ui, /Fillet Polyline/);
  assert.match(ui, /FilletControl/);
  assert.match(ui, /onFilletCommit/);
  assert.match(ui, /discoverDocumentBoundary/);
  assert.match(ui, /createBoundaryPolylineObject/);
  assert.match(ui, /onBoundaryCommit/);
  assert.match(ui, /StoryManagerDialog/);
  assert.match(ui, /AssemblyMaterialSelect/);
  assert.match(ui, /Current project material/);
  assert.match(ui, /MATERIAL_CATEGORY_LABELS/);
  assert.doesNotMatch(component, /material: "New Material"/);
  assert.match(materialLibrary, /ARCHITECTURAL_MATERIALS/);
  assert.match(materialLibrary, /textureAssetId: string \| null/);
  assert.match(materialLibrary, /architecturalMaterialsForRole/);
  assert.match(ui, /Rough framing establishes reference elevations/);
  assert.match(ui, /Roof Design Defaults/);
  assert.match(ui, /Height above plate \/ heel/);
  assert.match(ui, /Peak at preview run/);
  assert.match(ui, /Underside bearing/);
  assert.match(ui, /ELEVATION REFERENCE/);
  assert.match(ui, /label="Reference elevation"/);
  assert.doesNotMatch(component, /Datum elevation|Datum anchor|Set as datum anchor/);
  assert.match(ui, /className="story-wall-group-add"/);
  assert.doesNotMatch(component, /story-add-wall-layers/);
  assert.match(ui, /aria-label="Active Wall Type for new walls"/);
  assert.match(ui, /aria-label="Wall Use for new walls"/);
  assert.match(ui, /Interior Bearing Wall/);
  assert.match(ui, /aria-label="Project active Wall Type"/);
  assert.match(ui, /const trackingAnchor = source/);
  assert.match(ui, /drag\.objectId,[\s\S]*trackingAnchor,[\s\S]*true,/);
  assert.match(ui, /updateDocumentBuilding/);
  assert.match(ui, /calculateStoryElevations/);
  assert.match(ui, /RoomManagerDialog/);
  assert.match(ui, /OpeningTypeManagerDialog/);
  assert.match(ui, /Door &amp; Window Type Manager/);
  assert.match(ui, /Header Assembly Definition/);
  assert.match(ui, /Duplicate &amp; Assign/);
  assert.match(ui, /Rigid insulation at interior/);
  assert.match(ui, /Spacers between plies/);
  assert.match(ui, /Main thickness required/);
  assert.match(ui, /assignWallOpeningType/);
  assert.match(ui, /wallOpeningTypeId/);
  assert.match(ui, /WallFramingManagerDialog/);
  assert.match(ui, /Wall Framing Defaults/);
  assert.match(ui, /wallFramingSolids/);
  assert.match(ui, /Show framing in the 3D model/);
  assert.match(ui, /Three-stud conventional/);
  assert.match(ui, /Ladder blocking/);
  assert.match(ui, /Detect \/ Update Rooms/);
  assert.match(ui, /refreshRoomsForStory/);
  assert.match(ui, /wallVerticalExtent/);
  assert.match(ui, /foundationWallVerticalExtent/);
  assert.match(ui, /createFoundationWallFromLine/);
  assert.match(ui, /buildAutomaticFoundationWallJoinPlan/);
  assert.match(ui, /Supporting Foundation Wall/);
  assert.match(ui, /base and top automatically follow adjacent Room rough conditions/);
  assert.match(ui, /roomHorizontalPlatformSolution/);
  assert.match(ui, /Generated Room platforms/);
  assert.match(ui, /Generated finished ceiling/);
  assert.match(ui, /Platform Openings/);
  assert.match(ui, /addPlatformOpening/);
  assert.match(ui, /updatePlatformOpening/);
  assert.match(ui, /continuePlatformOpening/);
  assert.match(ui, /Disconnect Path/);
  assert.match(ui, /Vertical path/);
  assert.match(ui, /room\.platformOpenings/);
  assert.match(ui, /building-browser/);
  assert.match(ui, /Project Setup/);
  assert.match(ui, /Building standards · saved with project/);
  assert.match(ui, /Documentation standards · saved with project/);
  assert.match(ui, /Application preferences · follows user/);
  assert.match(ui, /Floors &amp;/);
  assert.match(ui, /Layer<br \/>Properties/);
  assert.match(ui, /className="is-planned" disabled/);
  assert.match(ui, /Confirm project settings/);
  assert.match(ui, /saveProjectAs/);
  assert.match(ui, /File and application commands/);
  assert.match(ui, /aria-label="Command line"/);
  assert.match(ui, /className="commandbar-shell"/);
  assert.match(ui, /className="model-space-indicator"/);
  assert.match(ui, /aria-label="Drafting status controls"/);
  assert.match(ui, /aria-pressed=\{cadDraftingSettings\.objectSnapEnabled\}/);
  assert.doesNotMatch(component, /Command history|Model and layouts|Layouts are planned|space-menu/);
  assert.match(ui, /3D Perspective/);
  assert.match(ui, /onClick=\{\(\) => onNavigate\(VIEW_PRESETS\.top\)\}/);
  assert.match(ui, /Model Explorer · Building/);
  assert.match(ui, /stretchModelEntities/);
  assert.match(ui, /selectScreenStretchTargets/);
  assert.match(ui, /StretchControl/);
  assert.match(ui, /onStretchCommit/);
  assert.match(ui, /AlignmentControl/);
  assert.match(ui, /Shift-click/);
  assert.match(ui, /snapObjectMoveDistance/);
  assert.match(ui, /createMoveGizmo/);
  assert.match(ui, /createRotationGizmo/);
  assert.match(ui, /snapRotationAngle/);
  assert.match(ui, /RotationControl/);
  assert.match(ui, /rotateMode/);
  assert.match(ui, /addLineObject/);
  assert.match(ui, /addCircleObject/);
  assert.match(ui, /createViewportCircle/);
  assert.match(ui, /createCircleGripSet/);
  assert.match(ui, /CircleGeometryControl/);
  assert.match(ui, /CircleViewportCommand/);
  assert.match(ui, /circleMode/);
  assert.match(ui, /Circle construction method/);
  assert.match(ui, /circleFromCenterDiameter/);
  assert.match(ui, /circleFromDiameterPoints/);
  assert.match(ui, /circleFromThreePoints/);
  assert.match(ui, /addArcObject/);
  assert.match(ui, /createViewportArc/);
  assert.match(ui, /createArcGripSet/);
  assert.match(ui, /ArcGeometryControl/);
  assert.match(ui, /ArcViewportCommand/);
  assert.match(ui, /arcMode/);
  assert.match(ui, /Arc construction method/);
  assert.match(ui, /start-center-angle/);
  assert.match(ui, /start-end-direction/);
  assert.match(ui, /center-start-length/);
  assert.match(ui, /continueSeedFromReference/);
  assert.match(ui, /createViewportLine/);
  assert.match(ui, /createLineGripSet/);
  assert.match(ui, /LineGeometryControl/);
  assert.match(ui, /lineFromLengthAngle/);
  assert.match(ui, /lineFromDirection/);
  assert.match(ui, /parseLineCoordinate/);
  assert.match(ui, /acquireCadPoint/);
  assert.match(ui, /derivedSnapCandidates/);
  assert.match(ui, /selectScreenGeometries/);
  assert.match(ui, /visibleCadEntityRefs/);
  assert.match(ui, /cad-selection-window/);
  assert.match(ui, /onSelectionWindow/);
  assert.match(ui, /advanceSelectionCycle/);
  assert.match(ui, /hoveredEntityKey/);
  assert.match(ui, /cad-selection-cycle/);
  assert.match(ui, /Click again or press Tab to cycle/);
  assert.match(ui, /line-dynamic-input/);
  assert.match(ui, /activePreviewMode/);
  assert.match(ui, /onLineUndoSegment/);
  assert.match(ui, /CAD_DRAFTING_SETTINGS_STORAGE_KEY/);
  assert.match(ui, /gridVisible/);
  assert.match(ui, /event\.key === "F7"/);
  assert.match(ui, /plan-ucs-x/);
  assert.doesNotMatch(component, /new THREE\.AxesHelper/);
  assert.match(ui, /INTERFACE_THEME_STORAGE_KEY/);
  assert.match(ui, /useSyncExternalStore/);
  assert.match(ui, /interfaceTheme={interfaceTheme}/);
  assert.match(ui, /Additional line snap angles/);
  assert.match(ui, /Start Z/);
  assert.match(ui, /lineMode/);
  assert.match(ui, /addPolylineObject/);
  assert.match(ui, /createViewportPolyline/);
  assert.match(ui, /createPolylineGripSet/);
  assert.match(ui, /rectangleFromCorners/);
  assert.match(ui, /parseRectangleDimensionPair/);
  assert.match(ui, /rectangleFromDimensions/);
  assert.match(ui, /RectangleGeometryControl/);
  assert.match(ui, /rectangleGripPoints/);
  assert.match(ui, /updatePolylineObjectGrip/);
  assert.match(ui, /RectangleViewportCommand/);
  assert.match(ui, /PolylineViewportCommand/);
  assert.match(ui, /dynamicPolylineInput/);
  assert.match(ui, /onPolylineAnchorChange/);
  assert.match(ui, /PolylineGeometryControl/);
  assert.match(ui, /polylineCommand/);
  assert.match(ui, /polylineBulgeFromThreePoints/);
  assert.match(ui, /polylinePathPoints/);
  assert.match(ui, /polylineSegmentMode/);
  assert.match(ui, /Polyline constant width/);
  assert.match(ui, /Line canceled\. Press Enter to repeat Line\./);
  assert.match(ui, /Rectangle canceled\./);
  assert.match(ui, /Polyline canceled\./);
  assert.match(ui, /polylineMode/);
  assert.match(ui, /rectangleMode/);
  assert.match(ui, /2D creation · planned/);
  assert.match(ui, /createBoxGripSet/);
  assert.match(ui, /objectMoveGrip/);
  assert.match(ui, /"plan-move"/);
  assert.match(ui, /BOX_GRIP_DEFINITIONS/);
  assert.match(ui, /resizeBoxFromGrip/);
  assert.match(ui, /Exact face grip distance/);
  assert.match(ui, /parseSignedArchitectural\(gripDraft\)/);
  assert.match(ui, /Object face snap/);
  assert.match(ui, /setBoxObjectPosition/);
  assert.match(ui, /renameBoxObject/);
  assert.match(ui, /EditableObjectName/);
  assert.match(ui, /deleteBoxObject/);
  assert.match(ui, /addLayer/);
  assert.match(ui, /assignObjectToLayer/);
  assert.match(ui, /toggleLayerVisibility/);
  assert.match(ui, /toggleLayerLock/);
  assert.match(ui, /LayerNameField/);
  assert.match(ui, /You can restore it with Undo/);
  assert.match(ui, /addBoxObject/);
  assert.match(ui, /updateBoxObject/);
  assert.match(ui, /projectToDocument/);
  assert.match(ui, /commit-preview/);
  assert.match(ui, /createProjectDocument/);
  assert.match(ui, /parseProjectDocument/);
  assert.match(ui, /parseRecoverySnapshot/);
  assert.match(ui, /PROJECT_RECOVERY_STORAGE_KEY/);
  assert.match(ui, /window\.localStorage/);
  assert.match(ui, /pagehide/);
  assert.match(ui, /beforeunload/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("SkeletonPreview.tsx", previewRoot)));
  await assert.rejects(access(new URL("preview.css", previewRoot)));
  await assert.rejects(access(new URL("public/_sites-preview", templateRoot)));
});

test("the interface stays split into feature modules", async () => {
  const component = await readFile(new URL("../app/model-builder-app.tsx", import.meta.url), "utf8");

  // Panels and dialogs live in their own modules and are imported by the shell.
  for (const specifier of [
    "@/features/properties/property-fields",
    "@/features/properties/naming-fields",
    "@/features/properties/modify-tool-controls",
    "@/features/properties/geometry-controls",
    "@/features/properties/building-labels",
    "@/features/dialogs/assembly-editor",
    "@/features/dialogs/story-manager-dialog",
    "@/features/dialogs/wall-type-manager-dialog",
    "@/features/dialogs/foundation-wall-manager-dialog",
    "@/features/dialogs/opening-type-manager-dialog",
    "@/features/dialogs/wall-framing-manager-dialog",
    "@/features/dialogs/roof-defaults-dialog",
    "@/features/dialogs/room-manager-dialog",
    "@/features/dialogs/reference-display-dialog",
    "@/features/dialogs/project-setup-dialog",
    "@/features/tools/tool-types",
  ]) {
    assert.ok(component.includes(`from "${specifier}"`), `the app shell should import ${specifier}`);
  }

  // Those declarations must not have come back into the shell.
  for (const declaration of [
    "function PropertyGridSection",
    "function StoryManagerDialog",
    "function WallTypeManagerDialog",
    "function OpeningTypeManagerDialog",
    "function RoomManagerDialog",
    "function ProjectSetupDialog",
    "function MoveObjectControl",
    "function WallOpeningsControl",
  ]) {
    assert.ok(!component.includes(declaration), `${declaration} should live in a feature module, not the app shell`);
  }
});
