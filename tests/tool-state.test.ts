import assert from "node:assert/strict";
import test from "node:test";
import {
  isPickTool,
  SELECT_TOOL,
  toolAfterSelection,
  toolFlags,
  toolIsActive,
  type ActiveTool,
} from "../features/tools/tool-types.ts";

const ALL_TOOLS: ActiveTool[] = [
  { kind: "select" },
  { kind: "line", role: null },
  { kind: "line", role: "wall" },
  { kind: "line", role: "foundation-wall" },
  { kind: "arc" }, { kind: "circle" }, { kind: "polyline" }, { kind: "rectangle" },
  { kind: "boundary" },
  { kind: "move" }, { kind: "copy" }, { kind: "rotate" }, { kind: "scale" },
  { kind: "mirror" }, { kind: "offset" }, { kind: "stretch" },
  { kind: "trim" }, { kind: "extend" }, { kind: "fillet" }, { kind: "chamfer" },
  { kind: "lengthen" },
  { kind: "break", mode: "break" },
  { kind: "break", mode: "break-at-point" },
];

test("no two tools can be active at once, which twenty booleans could not guarantee", () => {
  for (const tool of ALL_TOOLS) {
    const flags = toolFlags(tool);
    const active = Object.entries(flags).filter(([, on]) => Boolean(on)).map(([name]) => name);
    // lineMode pairs with wallMode or foundationWallMode by design: a Wall is a
    // Line with an architectural role, and the viewport reads both.
    const expected = tool.kind === "line" && tool.role !== null ? 2 : tool.kind === "select" ? 0 : 1;
    assert.equal(active.length, expected, `${JSON.stringify(tool)} produced ${active.join(", ") || "no flags"}`);
  }
});

test("select clears every flag", () => {
  assert.deepEqual(Object.values(toolFlags(SELECT_TOOL)).filter(Boolean), []);
  assert.ok(!toolIsActive(SELECT_TOOL));
  assert.ok(ALL_TOOLS.filter((tool) => tool.kind !== "select").every(toolIsActive));
});

test("wall and foundation wall are Line with a role, not separate tools", () => {
  const wall = toolFlags({ kind: "line", role: "wall" });
  assert.ok(wall.lineMode && wall.wallMode && !wall.foundationWallMode);
  const foundation = toolFlags({ kind: "line", role: "foundation-wall" });
  assert.ok(foundation.lineMode && foundation.foundationWallMode && !foundation.wallMode);
  const plain = toolFlags({ kind: "line", role: null });
  assert.ok(plain.lineMode && !plain.wallMode && !plain.foundationWallMode);
});

test("break carries its mode instead of doubling as the flag", () => {
  assert.equal(toolFlags({ kind: "break", mode: "break" }).breakMode, "break");
  assert.equal(toolFlags({ kind: "break", mode: "break-at-point" }).breakMode, "break-at-point");
  assert.equal(toolFlags(SELECT_TOOL).breakMode, null);
});

test("selecting an entity cancels drawing and transform tools but feeds pick tools", () => {
  for (const tool of ALL_TOOLS) {
    const after = toolAfterSelection(tool);
    if (isPickTool(tool)) assert.deepEqual(after, tool, `${tool.kind} should survive a selection click`);
    else assert.deepEqual(after, SELECT_TOOL, `${tool.kind} should end when the user selects something`);
  }
});

test("the pick tools are exactly the ones that consume a click on an entity", () => {
  const pick = ALL_TOOLS.filter(isPickTool).map((tool) => tool.kind);
  assert.deepEqual([...new Set(pick)].sort(), ["boundary", "break", "chamfer", "extend", "fillet", "lengthen", "trim"]);
});
