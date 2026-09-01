import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceSelectionCycle,
  cadEntityKey,
  cadEntityRefFromKey,
  selectScreenGeometries,
  selectScreenStretchTargets,
  selectionWindowMode,
  visibleCadEntityRefs,
  type ScreenSelectionGeometry,
  type ScreenStretchGeometry,
} from "../lib/cad-selection.ts";
import { addLineObject, cloneDocument, DEFAULT_DOCUMENT } from "../lib/document-model.ts";

const lineGeometry: ScreenSelectionGeometry = {
  points: [{ x: 20, y: 20 }, { x: 80, y: 20 }],
  ref: { id: "line-01", kind: "line" },
  segments: [{ start: { x: 20, y: 20 }, end: { x: 80, y: 20 } }],
};

test("round-trips typed CAD selection keys", () => {
  const ref = { id: "arc-12", kind: "arc" as const };
  assert.equal(cadEntityKey(ref), "arc:arc-12");
  assert.deepEqual(cadEntityRefFromKey("arc:arc-12"), ref);
  assert.equal(cadEntityRefFromKey("unknown:item"), null);
});

test("uses AutoCAD selection direction semantics", () => {
  assert.equal(selectionWindowMode({ x: 10, y: 10 }, { x: 90, y: 80 }), "window");
  assert.equal(selectionWindowMode({ x: 90, y: 10 }, { x: 10, y: 80 }), "crossing");
});

test("cycles repeated picks only at the same recent overlap", () => {
  const candidates = ["line:line-01", "circle:circle-01"];
  const first = advanceSelectionCycle(null, candidates, { x: 100, y: 80 }, 1000);
  assert.equal(first.index, 0);
  const second = advanceSelectionCycle(first, candidates, { x: 103, y: 82 }, 1800);
  assert.equal(second.index, 1);
  const wrapped = advanceSelectionCycle(second, candidates, { x: 101, y: 79 }, 2200);
  assert.equal(wrapped.index, 0);
  const moved = advanceSelectionCycle(wrapped, candidates, { x: 140, y: 80 }, 2300);
  assert.equal(moved.index, 0);
  const expired = advanceSelectionCycle(wrapped, candidates, { x: 100, y: 80 }, 4000);
  assert.equal(expired.index, 0);
});

test("window selection requires the complete entity to be inside", () => {
  assert.deepEqual(
    selectScreenGeometries([lineGeometry], { x: 10, y: 10 }, { x: 90, y: 30 }),
    { mode: "window", refs: [{ id: "line-01", kind: "line" }] },
  );
  assert.deepEqual(
    selectScreenGeometries([lineGeometry], { x: 40, y: 10 }, { x: 90, y: 30 }),
    { mode: "window", refs: [] },
  );
});

test("crossing selection includes geometry intersecting the window", () => {
  assert.deepEqual(
    selectScreenGeometries([lineGeometry], { x: 60, y: 30 }, { x: 40, y: 10 }),
    { mode: "crossing", refs: [{ id: "line-01", kind: "line" }] },
  );
});

test("Stretch crossing captures enclosed endpoints instead of the whole Line", () => {
  const geometry: ScreenStretchGeometry = {
    ...lineGeometry,
    handles: [
      { component: 0, point: { x: 20, y: 20 } },
      { component: 1, point: { x: 80, y: 20 } },
    ],
  };
  assert.deepEqual(
    selectScreenStretchTargets([geometry], { x: 90, y: 30 }, { x: 70, y: 10 }),
    { mode: "crossing", targets: [{ components: [1], id: "line-01", kind: "line", whole: false }] },
  );
});

test("Stretch window moves only geometry completely enclosed", () => {
  const geometry: ScreenStretchGeometry = {
    ...lineGeometry,
    handles: [
      { component: 0, point: { x: 20, y: 20 } },
      { component: 1, point: { x: 80, y: 20 } },
    ],
  };
  assert.deepEqual(
    selectScreenStretchTargets([geometry], { x: 10, y: 10 }, { x: 90, y: 30 }),
    { mode: "window", targets: [{ components: [], id: "line-01", kind: "line", whole: true }] },
  );
  assert.deepEqual(
    selectScreenStretchTargets([geometry], { x: 40, y: 10 }, { x: 90, y: 30 }),
    { mode: "window", targets: [] },
  );
});

test("visible entity enumeration respects layer visibility", () => {
  const added = addLineObject(
    cloneDocument(DEFAULT_DOCUMENT),
    { x: 0, y: 0, z: 0 },
    { x: 12, y: 0, z: 0 },
  );
  assert.ok(added);
  assert.deepEqual(visibleCadEntityRefs(added.document).map(cadEntityKey), ["box:box-01", `line:${added.line.id}`]);
  added.document.layers[0].visible = false;
  assert.deepEqual(visibleCadEntityRefs(added.document), []);
});
