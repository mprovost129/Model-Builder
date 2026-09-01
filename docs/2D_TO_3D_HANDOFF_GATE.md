# 2D Core v1 to Residential 3D Handoff Gate

## Decision

Model Builder will not wait for complete AutoCAD 2D parity before beginning the
residential 3D system. AutoCAD parity is a long-term behavioral reference, not a
single prerequisite milestone.

**Current status:** the 2D Core v1 engineering scope is complete. The compact
modification set, reusable Boundary engine, automated geometry regression suite,
production build, lint, and rendered-workspace checks pass. A short manual
architectural floor-plan smoke test is the remaining acceptance check before the
residential 3D milestone begins.

The 2D phase is ready to hand off to 3D when it supplies a dependable path and
topology foundation for walls, platforms, openings, rooms, roofs, framing, and
construction-document views. Features that primarily serve annotation, sheet
production, interchange, or specialized drafting can continue later alongside
the architectural model.

## Reviewed Product Sources

- **2D CAD Feature & Command Specification — AutoCAD 2026 Reference** defines
  the long-term drafting behavior and command catalog.
- **Residential 3D Modeling Software Roadmap** is the more complete 3D product
  architecture and should be treated as the canonical 3D roadmap.
- **3D Residential Design Software Roadmap** substantially overlaps the first
  3D roadmap. It is useful corroborating material, but its unique requirements
  should be merged into the canonical roadmap rather than maintained as a
  competing source of truth.

Both 3D roadmaps agree that the first post-2D milestone is **Levels, Stories,
Datum, and Vertical Constraints**. They also establish that Walls and platform
boundaries are intelligent 2D paths from which 3D geometry is derived.

## What Is Already Ready

- Native Lines, Polylines, Rectangles, Circles, and Arcs with stable IDs and
  real model coordinates, including elevation.
- Architectural feet-and-inch input at 1/16-inch precision.
- Object snaps, Ortho, Polar, snap tracking, exact coordinate and distance
  input, transient previews, and grips.
- Click, Window, Crossing, hover, overlap cycling, and mixed-entity selection.
- Layers, visibility, locking, groups, properties, persistence, recovery,
  undo, and redo.
- Erase, Move, Copy, Rotate, Scale, Mirror, Offset, Trim, Extend, Break,
  Break at Point, Join, Explode, Stretch, Line-to-Line Fillet/Chamfer, and
  all-corners Polyline Fillet/Chamfer across the
  supported native geometry where geometrically valid.

## Required 2D Core v1 Exit Scope

### 1. Complete the compact modification set

- **Stretch — implemented**: crossing-window-driven vertex and endpoint movement
  without moving geometry wholly outside the crossing area.
- **Fillet — Lines, Arcs, and Polyline option implemented**: picked-side
  Line-to-Line, Line-to-Arc, and Arc-to-Arc trim/extend to an exact tangent Arc,
  including radius zero for a Line-to-Line clean corner, plus exact
  tangent rounding of every valid corner in one selected straight-segment open
  or closed Polyline. Source IDs, layers, elevation, locks, live preview, Escape,
  and one-step Undo are preserved.
- **Chamfer — Lines and Polyline option implemented**: separate first/second setbacks,
  picked-side trim/extend behavior, exact beveled connector, and zero-distance
  sharp-corner cleanup, plus path-order setbacks at every valid corner in one
  selected straight-segment open or closed Polyline. AutoCAD Chamfer is limited
  to straight 2D objects and Polyline line segments, so Arc Chamfer is intentionally excluded.
- **Break / Break at Point — implemented**: two-point interval removal for
  Lines, Polylines, Rectangles, Circles, and Arcs; one-point splitting for open
  Lines, Polylines, and Arcs; native curves, layer/elevation, locks, preview,
  Escape restoration, and one-step Undo are preserved.
- **Join — implemented**: combine endpoint-connected Lines, Arcs, and open
  Polylines at one elevation into the most specific native Line, Arc, Circle,
  or bulge-based Polyline result; reject gaps, branches, locks, and closed
  source Polylines without changing the drawing.
- **Explode — implemented**: convert one or more composite Rectangles and
  Polylines into exact editable native Lines and Arcs while preserving layer,
  elevation, selection, and one-step Undo. Constant Polyline width is removed
  because native Lines and Arcs do not store it.
- **Lengthen — implemented**: change a Line, Arc, or open Polyline from the
  picked endpoint by signed Delta, Total length, Percent, or Dynamic cursor
  position. Terminal direction or circular geometry, layer/elevation, stable
  identity, live preview, Escape restoration, and one-step Undo are preserved.

### 2. Add the architectural topology bridge

- **Boundary — implemented**: `B`, `BO`, `BOUNDARY`, or `BPOLY` discovers the
  smallest closed loop containing an interior pick from visible Lines, Arcs,
  Circles, and Polylines at the active elevation. It previews and creates an
  editable closed Polyline on the active layer while preserving exact Arc bulges.
- Closed-loop discovery is implemented as a reusable engine service, not only
  as toolbar behavior. The same service will later feed Room and FloorPlatform
  creation.
- Loop results use named geometric tolerances, are independent of zoom and
  screen pixels, ignore hidden source geometry, enforce the active-layer lock,
  support Escape cancellation, and commit as one Undo transaction.

### 3. Harden shared edit behavior

- Preserve stable entity IDs whenever an operation changes one entity in place;
  create predictable new IDs only for splits and generated pieces.
- Keep elevation and layer assignment through every modification command.
- Respect object and layer locks consistently.
- Make every completed command one undoable transaction; Escape restores the
  pre-command document.
- Verify arbitrary-angle geometry, mixed selections, snap targets, and native
  Arc preservation.

### 4. Pass the handoff quality gate

- **Automated gate passed:** 210 unit tests cover geometry rules, tolerance edge
  cases, locks, persistence, and undo behavior across the exit-scope commands.
- **Automated gate passed:** production build, lint, and two rendered-workspace
  checks pass.
- **Manual acceptance remaining:** draw, edit, close, reopen, and reshape
  a small angled floor-plan outline at two elevations without corrupt geometry.
- **Passed:** the app identifies enclosed loops suitable as inputs for future
  Room and FloorPlatform objects.

## Explicitly Deferred Until After the 3D Foundation

These remain valid parts of the long-term 2D specification, but they do not
block residential 3D work:

- Ellipse, Spline, XLine, Ray, Donut, Revision Cloud, Point, and advanced
  construction geometry.
- Full color, linetype, lineweight, transparency, Match Properties, and
  advanced layer-state tooling.
- Arrays and advanced selection filters.
- Text, MText, dimensions, leaders, tables, hatches, blocks, and attributes.
- Layouts, viewports, page setup, plotting, PDF publishing, and underlays.
- Constraints, xrefs, advanced measurement/reporting, DXF, and DWG exchange.

These features should return as a dedicated **Construction Documentation**
track once Levels, assemblies, Walls, openings, rooms, and platforms exist.
That order allows drawings and annotations to become associative with the
building model instead of creating a second disconnected drafting system.

## First 3D Milestone After the Gate

Implement **Levels, Stories, Datum, and Vertical Constraints** before layered
Walls:

**In progress:** the version-13 model now stores a Building Datum, ordered rough-
framing Stories, layered structural and finish assemblies, calculated rough and
finished elevations, and an active Story drawing plane. Manage > Stories provides
the first editor and live section-pole preview. The governing calculation and
next implementation steps are recorded in `docs/STORY_AND_ASSEMBLY_MODEL.md`.

1. Add immutable World Z=0 plus a user-controlled Building Datum.
2. Add Story records with derived named elevations.
3. Store vertical relationships as constraints rather than copied coordinates.
4. Prove that changing a floor-platform depth updates dependent story and
   ceiling elevations without manual edits.
5. Keep the existing 2D entity elevation compatible with story assignment and
   future hosted architectural objects.

The next 3D milestone after this is the shared layered Assembly engine, followed
by straight layered Walls and the wall-junction solver.
