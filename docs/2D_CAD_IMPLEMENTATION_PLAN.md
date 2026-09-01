# 2D CAD Implementation Plan

This plan is derived from the Google Drive specification **2D CAD Feature &
Command Specification — AutoCAD 2026 Reference**. That specification is the
authoritative feature baseline for the 2D phase of Model Builder.

## Product Direction

Model Builder will use AutoCAD as the behavioral reference for professional
drafting: exact input, command efficiency, predictable selection, snapping,
model-space scale, and reversible edits. The interface may be clearer and more
modern, but toolbar, keyboard, command-line, grip, and property-panel actions
must all invoke the same underlying geometry and command systems.

The 2D geometry must remain model-coordinate geometry with an elevation, not
screen-space artwork. That preserves the path to future 2D/3D associative
architectural objects.

## 2D Completion Boundary

The reviewed 2D and residential 3D roadmaps now define a formal **2D Core v1
handoff gate** in `docs/2D_TO_3D_HANDOFF_GATE.md`. Model Builder will complete
the compact modification set, reusable closed-boundary discovery, and its
quality gate before starting Levels and Stories. Annotation, sheet production,
interchange, and specialty AutoCAD commands remain part of the long-term 2D
roadmap but do not block residential 3D architecture.

## Current Baseline

Implemented or substantially implemented:

- Stable-ID document model with Lines, Polylines, Rectangles, Circles, Arcs,
  boxes, layers, locking, save/open, recovery, and undo/redo.
- Line workflows with exact/relative coordinate input, direct distance entry,
  Ortho, Polar, object snaps, chained segments, Undo, Close, grips, and Z values.
- Open/closed Polylines with exact vertices, Undo, Close, vertex grips, mixed
  Line/true-Arc segments, and persistent constant width.
- Rectangles using Corners, Dimensions, or target Area, with rotation, chamfer,
  fillet, constant width, live preview, and constrained grips where geometry remains axis-aligned.
- Six Circle methods including Tangent-Tangent-Radius and Tangent-Tangent-Tangent,
  with center/quadrant snaps and grips.
- Eleven AutoCAD-style Arc construction methods with exact input and grips.
- Architectural feet/inches at 1/16-inch precision, active elevation, pan/zoom,
  layers, properties, command line, and project persistence.

Important P0 gaps found during review:

- Crossing polygon, fence, lasso, and advanced selection filters remain incomplete.
- Fillet supports exact Line-to-Line, Line-to-Arc, and Arc-to-Arc edits plus an
  all-corners option for straight-segment open and closed Polylines. Chamfer
  supports AutoCAD's straight Line and Polyline-line-segment scope; Arc Chamfer
  is intentionally excluded because it is not an AutoCAD 2D Chamfer operation.
  Break / Break at Point is implemented across
  the geometrically valid native 2D entities. Join is implemented for compatible
  open native curves. Explode is implemented for Rectangles and Polylines, and
  Lengthen is implemented for Lines, Arcs, and open Polylines.
- The current document model has no spatial index; use a simple exact scan now,
  then introduce indexing behind the same query boundary as drawings grow.

## Corrected Build Sequence

### Milestone 1 — Shared Selection Foundation (implemented)

- One typed reference format for every selectable entity.
- AutoCAD-style left-to-right Window selection.
- Right-to-left Crossing selection.
- Shift add/remove, Select All, and Escape clear.
- Mixed-entity selection highlighting and a primary object for Properties.
- Preselection hover highlighting.
- Repeated-click and Tab cycling for overlapping entities.
- Crossing polygon, fence, lasso, and advanced filters remain later selection enhancements.

### Milestone 2 — Complete P0 Draw Workflows

- Polyline Line/Arc switching and constant width are implemented.
- Rectangle Dimensions, Area, Rotation, Chamfer, Fillet, and Width methods are implemented.
- Circle Center-Diameter, 2-Point, and 3-Point are implemented.
- Circle Tangent-Tangent-Radius and Tangent-Tangent-Tangent are implemented for
  Lines, Polyline segments, Circles, Arcs, and box footprint edges.
- Close remaining grip and exact-property gaps.

### Milestone 3 — Precision Engine Completion (implemented)

- Center, geometric-center, quadrant, tangent, perpendicular, extension, parallel,
  nearest, and exact line/curve and curve/curve intersection snaps are implemented.
- Node mode is wired for the future Point entity.
- Object-snap tracking with hover-acquired point projections is implemented.
- Independent grid display and cursor-snap increments are implemented and persisted.
- Snap ambiguity cycling and one-shot typed snap overrides are implemented.

### Milestone 4 — General 2D Modification Commands

- Erase, Move, and Copy are implemented across boxes, Lines, Polylines,
  Rectangles, Circles, and Arcs, including mixed selections, locks, exact axis
  offsets, base-point/target-point snapping, transient previews, and one-step Undo.
- Rotate is implemented across boxes, Lines, Polylines, Rectangles, Circles, and
  Arcs, including mixed selections, shared selection base points, exact and
  freehand input, transient preview, lock enforcement, and one-step Undo.
- Scale is implemented across boxes, Lines, Polylines, Rectangles, Circles, and
  Arcs as a uniform plan transform, including mixed selections, shared base
  points, exact and freehand input, transient preview, lock enforcement, and
  one-step Undo.
- Mirror is implemented across boxes, Lines, Polylines, Rectangles, Circles, and
  Arcs, including mixed selections, two-point snapped axes, live preview,
  keep-or-replace source behavior, quick centered axes, lock enforcement, and
  one-step Undo.
- Offset is implemented for Lines, Polylines, Rectangles, Circles, and Arcs
  with exact architectural distance, cursor side selection, live native-geometry
  preview, keep-or-replace source behavior, lock enforcement, and one-step Undo.
- Trim is implemented for Lines, Polylines, Rectangles, Circles, and Arcs using
  every other visible 2D entity as a quick boundary, with native split results,
  live preview, lock enforcement, Escape cancellation, and one-step Undo.
- Extend is implemented for Lines, Arcs, and open Polylines using the same visible
  quick boundaries and endpoint selection behavior.
- Stretch is implemented with AutoCAD-style crossing-window endpoint and
  Polyline-vertex capture, whole-entity window movement, snapped base/target
  preview, exact signed X/Y displacement, lock enforcement, Escape cancellation,
  stable IDs, and one-step Undo.
- Fillet is implemented for planar Line-to-Line, Line-to-Arc, and Arc-to-Arc
  pairs with picked-side retention, trimming or extension, a live exact-radius preview, radius-zero Line corner
  cleanup, lock enforcement, stable source IDs, Escape cancellation, and one
  undo transaction. Derived tangent coordinates retain calculation precision
  instead of being distorted onto the cursor grid. The Polyline option applies
  exact tangent arcs to every valid corner of one selected straight-segment open
  or closed Polyline, keeps open endpoints fixed, prevents overlapping trims,
  and preserves identity, layer, elevation, width, locks, and one Undo transaction.
  The same transaction preserves stable source IDs and exact circular geometry
  for mixed Line/Arc and Arc/Arc results.
- Chamfer is implemented for two planar Lines with separate first/second
  architectural setbacks, picked-side retention, trimming or extension, live
  preview, zero-distance sharp-corner cleanup, lock enforcement, stable source
  IDs, `CHA`/`CHAMFER`, sequential Distance input, Escape cancellation, and one
  undo transaction. Derived angled points retain calculation precision.
  The Polyline option applies first/second setbacks in path order at every valid
  corner of one selected straight-segment open or closed Polyline, keeps open
  endpoints fixed, prevents overlap, and preserves the source properties and
  one Undo transaction.
  Arc Chamfer is intentionally excluded: AutoCAD's 2D Chamfer accepts straight
  Lines, Polyline line segments, rays, and construction lines rather than Arcs.
- Break / Break at Point is implemented with two-point interval removal for
  Lines, Polylines, Rectangles, Circles, and Arcs, and one-point splitting for
  open Lines, Polylines, and Arcs. Native curve types, Polyline bulges and width,
  layer/elevation, locks, stable first-piece identity, live preview, Escape, and
  one Undo transaction are preserved.
- Join is implemented for endpoint-connected Lines, Arcs, and open Polylines at
  a common elevation. It orders selections into an unbranched chain and returns
  the most specific native result: Line, Arc, Circle, or bulge-based Polyline.
  The primary layer, name, width where applicable, locks, and one Undo transaction
  are preserved.
- Explode is implemented for one or more Rectangles and Polylines. Straight and
  bulge-based curved segments become independent native Lines and Arcs while
  preserving layer, elevation, selection, and one Undo transaction. Constant
  Polyline width is removed because native Lines and Arcs do not store width.
- Lengthen is implemented with picked start/end control, live preview, and
  Delta, Total, Percent, and Dynamic methods for Lines, Arcs, and open
  Polylines. Terminal direction or radius, stable identity, layer/elevation,
  Escape restoration, and one Undo transaction are preserved. This completes
  the compact modification set required by the 2D Core v1 handoff gate.
- Each command uses transient preview geometry and one logical undo transaction.

### Milestone 5 — Architectural Topology Bridge (implemented)

- Boundary discovers the smallest closed loop containing an interior pick from
  visible Lines, Arcs, Circles, and Polylines at the active elevation.
- The command previews the discovered loop and creates a normal closed Polyline
  on the active layer. Straight segments and exact circular bulges remain native.
- The underlying loop-discovery service is reusable by future Room and
  FloorPlatform objects and uses named model-space tolerances independent of
  screen pixels and zoom.
- Hidden geometry is excluded, locked source geometry may define an enclosure,
  and a hidden or locked active layer prevents creation. Escape cancels safely;
  a completed Boundary is one undoable transaction and participates in existing
  persistence and recovery through the normal Polyline model.
- Native-geometry, layer/elevation, locking, persistence, cancellation, and undo
  regression coverage is in place for the exit-scope commands.

This milestone is the engineering stopping point for the initial 2D phase. The
automated quality gate passes; a final manual architectural smoke test remains
the human acceptance check before work starts on Levels, Stories, Datum, and
Vertical Constraints.

### Later 2D Track — Drawing Organization and Documentation

- Complete layer/object visual properties, linetypes, lineweights, Match
  Properties, Hide/Isolate, and Groups.
- Text/MText, dimension styles and associative dimensions, leaders, hatches,
  blocks, measurements, and object information.

### Later 2D Track — Production Drawings

- Layouts, viewports, scales, page setup, plotting, and vector PDF.
- Images and PDF underlays.
- DXF first; DWG only through a legally and technically appropriate SDK.

### Residential 3D Track — Architectural Intelligence

- Begin with Levels, Stories, Datum, and Vertical Constraints.
- Continue with the shared layered Assembly engine, straight layered Walls,
  wall junctions, Rooms, platforms, openings, and the remaining roadmap stages.
- Walls, doors, windows, rooms, levels, stairs, roofs, and symbols are semantic
  objects shared by plan and 3D views.

## Engineering Rules

- Geometry data, display properties, and rendered paths remain separate.
- Geometric comparisons use named tolerances, never direct floating-point
  equality.
- Snapping, selection, and hit testing are shared services rather than custom
  logic embedded separately in every command.
- Cursor previews are transient and never repeatedly mutate permanent geometry.
- Every committed command is one reversible transaction; cancellation restores
  the safe pre-command state.
- New commands require geometry-unit tests, command-state tests, persistence
  coverage when the document format changes, and a rendered-workspace check.
