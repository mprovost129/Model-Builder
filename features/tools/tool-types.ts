/**
 * The active tool, as one value.
 *
 * This replaces twenty independent `xMode` booleans in the app shell. Those
 * booleans were required to be mutually exclusive, but nothing enforced it:
 * each of the twenty-one activators cleared the other modes by hand, every one
 * of them missed at least one, and two compensating effects existed purely to
 * clear a mode that some other path had failed to clear. Modelling the tool as
 * a single discriminated union makes an illegal combination unrepresentable
 * rather than merely unlikely.
 */

/** Break splits at two picked points; break-at-point splits at one. */
export type BreakMode = "break" | "break-at-point";

/** Which architectural role a line being drawn will take. */
export type LineRole = "foundation-wall" | "wall" | null;

export type ActiveTool =
  | { kind: "select" }
  // Drawing tools. Each consumes clicks to place geometry.
  | { kind: "line"; role: LineRole }
  | { kind: "arc" }
  | { kind: "circle" }
  | { kind: "polyline" }
  | { kind: "rectangle" }
  | { kind: "boundary" }
  // Transform tools. Each acts on the existing selection.
  | { kind: "move" }
  | { kind: "copy" }
  | { kind: "rotate" }
  | { kind: "scale" }
  | { kind: "mirror" }
  | { kind: "offset" }
  | { kind: "stretch" }
  // Pick tools. Each consumes clicks on entities rather than on empty space.
  | { kind: "trim" }
  | { kind: "extend" }
  | { kind: "fillet" }
  | { kind: "chamfer" }
  | { kind: "lengthen" }
  | { kind: "break"; mode: BreakMode };

export type ToolKind = ActiveTool["kind"];

export const SELECT_TOOL: ActiveTool = { kind: "select" };

/**
 * Tools that interpret a click on an entity as their own input, so clicking to
 * select must not cancel them. Every other tool ends when the user selects
 * something. Previously this rule was spelled out as a different, inconsistent
 * list of setter calls in each of the five selection handlers.
 */
const PICK_TOOL_KINDS = new Set<ToolKind>(["boundary", "break", "chamfer", "extend", "fillet", "lengthen", "trim"]);

export function isPickTool(tool: ActiveTool): boolean {
  return PICK_TOOL_KINDS.has(tool.kind);
}

/** The tool that remains after the user selects an entity in the viewport or Model Explorer. */
export function toolAfterSelection(tool: ActiveTool): ActiveTool {
  return isPickTool(tool) ? tool : SELECT_TOOL;
}

/**
 * The boolean view of the active tool.
 *
 * The Viewport and the panels still read individual flags. Deriving them from
 * one value keeps every consumer working unchanged while making the source of
 * truth a single state variable, so the Viewport does not have to be rewritten
 * in the same change.
 */
export type ToolFlags = {
  arcMode: boolean;
  boundaryMode: boolean;
  breakMode: BreakMode | null;
  chamferMode: boolean;
  circleMode: boolean;
  copyMode: boolean;
  extendMode: boolean;
  filletMode: boolean;
  foundationWallMode: boolean;
  lengthenMode: boolean;
  lineMode: boolean;
  mirrorMode: boolean;
  moveMode: boolean;
  offsetMode: boolean;
  polylineMode: boolean;
  rectangleMode: boolean;
  rotateMode: boolean;
  scaleMode: boolean;
  stretchMode: boolean;
  trimMode: boolean;
  wallMode: boolean;
};

export function toolFlags(tool: ActiveTool): ToolFlags {
  return {
    arcMode: tool.kind === "arc",
    boundaryMode: tool.kind === "boundary",
    breakMode: tool.kind === "break" ? tool.mode : null,
    chamferMode: tool.kind === "chamfer",
    circleMode: tool.kind === "circle",
    copyMode: tool.kind === "copy",
    extendMode: tool.kind === "extend",
    filletMode: tool.kind === "fillet",
    foundationWallMode: tool.kind === "line" && tool.role === "foundation-wall",
    lengthenMode: tool.kind === "lengthen",
    lineMode: tool.kind === "line",
    mirrorMode: tool.kind === "mirror",
    moveMode: tool.kind === "move",
    offsetMode: tool.kind === "offset",
    polylineMode: tool.kind === "polyline",
    rectangleMode: tool.kind === "rectangle",
    rotateMode: tool.kind === "rotate",
    scaleMode: tool.kind === "scale",
    stretchMode: tool.kind === "stretch",
    trimMode: tool.kind === "trim",
    wallMode: tool.kind === "line" && tool.role === "wall",
  };
}

/** True when any tool other than plain selection is running. */
export function toolIsActive(tool: ActiveTool): boolean {
  return tool.kind !== "select";
}

/**
 * The notice shown when Escape cancels a running transform tool, keyed by tool.
 * A tool absent from this table is one that Escape does not cancel through the
 * global handler, because it manages its own cancellation.
 */
export const ESCAPE_CANCEL_NOTICES: Partial<Record<ToolKind, string>> = {
  copy: "Copy mode finished.",
  extend: "Extend canceled.",
  mirror: "Mirror canceled.",
  move: "Move mode finished.",
  offset: "Offset canceled.",
  rotate: "Rotate mode finished.",
  scale: "Scale mode finished.",
  stretch: "Stretch canceled.",
  trim: "Trim canceled.",
};
