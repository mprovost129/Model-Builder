# Model Builder

Model Builder is an early-stage precision 3D modeling application aimed at
residential design. The current foundation provides multiple parametric boxes,
U.S. architectural dimension entry, CAD-style viewport navigation,
object-and-face selection, true 3D line entities, and first-class 2D CAD
polylines, rectangles, Circles, and Arcs.

## Current Capabilities

- Three-dimensional perspective workspace with an optional ground grid and compact XYZ labels
- Persistent Grid visibility control in Properties and the status bar, with the
  standard F7 shortcut
- View-aware UCS indicator: red X and green Y axes in Top plan view without Z,
  and compact XYZ letters in three-dimensional views
- AutoCAD/Revit-inspired workspace shell with quick access, tabbed ribbon,
  project tabs, left Properties, right Model Explorer, command line, and status bar
- Scope-aware Manage ribbon separating project building standards, documentation
  standards, and user-level application preferences; future disciplines are visibly
  labeled without presenting unfinished settings as available
- Revit-inspired application hierarchy with a dedicated program control, top-level
  New/Open/Save/Save As and history shortcuts, conventional application menus,
  and a separate task-based modeling ribbon
- Warm light-gray and blue interface theme enabled by default, with a persistent
  Light/Dark switch and reusable color tokens prepared for future customization
- Blank-plan setup guide that exposes active Story, floor depth, ceiling height,
  and Wall Type defaults before drawing begins
- Building view in Model Explorer for direct access to Stories, Wall Types, and
  detected Rooms, plus an always-available Project Setup summary in Properties
- Compact spreadsheet-style Properties grid with collapsible categories and inline values
- Column-aligned Layer Manager with inline naming, object counts, state controls, and search
- Parametric Length, Width, and Height fields
- Feet-inch-fraction input and display to the nearest 1/16 inch
- Live box resizing from exact overall dimensions
- Multiple parametric boxes in one model
- Add Box commands in the ribbon and Model Explorer
- Object selection in either the 3D viewport or object browser
- Persistent drawing layers with a current layer for newly created objects
- Object-to-layer assignment from Properties
- Layer naming, visibility, locking, color identification, and guarded deletion
- Layer-aware viewport selection and project-file compatibility with versions 1 through 27
- Selected-object highlighting and box-specific property editing
- Shift-click multi-selection in both the viewport and Model Explorer
- Shared typed selection references across boxes, Lines, Polylines, Rectangles, Circles, and Arcs
- AutoCAD-style left-to-right Window selection and right-to-left Crossing selection in the viewport
- Shift window/crossing add-or-remove behavior, Ctrl+A Select All, and Escape selection clearing
- Cyan preselection highlighting before an entity is clicked
- Overlapping-entity cycling by repeated click or Tab with an on-cursor candidate readout
- Locked-layer geometry remains selectable for inspection while editing stays disabled
- Primary-object highlighting with the last-selected object used as the anchor
- Named object groups that select and move as one unit
- Group creation, renaming, and ungrouping from Properties, Model Explorer, and the ribbon
- Per-object locking that preserves selection access while preventing geometry and property edits
- Group movement from XYZ axis arrows or exact architectural offsets
- CAD-style box grips: 6 face centers, 12 edge midpoints, and 8 corners
- Direct signed architectural-distance entry from face-center grips
- Whole-object center grip for snapped X/Y work-plane movement
- Camera-synchronized 3D navigation cube with click-drag orbiting, smooth transitions, six face views, diagonal edge views, isometric corner views, and a Home action that returns to Top plan view
- Unified Move and Copy commands for boxes, Lines, Polylines, Rectangles, Circles, and Arcs
- CAD-style base-point and target-point placement with live preview, drafting snaps, and exact axis offsets
- Mixed-entity Copy with unique identities, source-layer preservation, and copied-selection handoff
- Minimum, center, and maximum alignment on the X, Y, or Z axis
- Unified Erase from the ribbon or Delete key for mixed selections, with lock enforcement and final-box protection
- Exact signed X, Y, and Z position entry for the selected box
- Axis-based object nudging by an entered architectural distance
- Direct X, Y, and Z movement grips on the selected object
- Freehand grip movement snapped to 1/16 inch with nearby object-face alignment
- Object moves snap to 1/16 inch and participate in Undo and Redo
- Unified exact clockwise and counterclockwise Z-axis rotation for boxes, Lines, Polylines, Rectangles, Circles, and Arcs
- Mixed-entity freehand rotation from a viewport ring with 15-degree snapping and 1-degree Shift precision
- Selectable rotation base points at the aggregate selection center, four corners, and four edge midpoints
- `RO` and `ROTATE` command aliases, lock enforcement, live preview, Escape cancellation, and one-step Undo
- Uniform plan scaling for boxes, Lines, Polylines, Rectangles, Circles, and Arcs
- Exact scale factors and freehand scaling from a shared base point with `SC` and `SCALE` command aliases
- Unified plan mirroring for boxes, Lines, Polylines, Rectangles, Circles, and Arcs
- Two-point snapped mirror axes, live geometry preview, source keep/replace control, and `MI` and `MIRROR` command aliases
- Quick centered horizontal and vertical mirror axes for common symmetric operations
- Native Offset for Lines, Polylines, Rectangles, Circles, and Arcs with exact architectural distance and side selection
- Live Offset preview, source keep/replace control, `O` and `OFFSET` command aliases, and one-step Undo
- Quick-boundary Trim for Lines, Polylines, Rectangles, Circles, and Arcs with a live native-geometry preview
- Boundary Extend for Lines, Arcs, and open Polylines with `TR`/`TRIM` and `EX`/`EXTEND` command aliases
- Closed-loop Boundary discovery for visible Lines, Arcs, Circles, and Polylines
  using `B`, `BO`, `BOUNDARY`, or `BPOLY`, with live preview and exact curved segments
- Native two-point Break for Lines, Polylines, Rectangles, Circles, and Arcs, plus one-point splitting for open Lines, Polylines, and Arcs
- Live Break preview, stable source identities, layer/elevation and curved-segment preservation, `BR`/`BREAK` and `BP`/`BREAKATPOINT`, Escape, and one-step Undo
- Native Join for endpoint-connected Lines, Arcs, and open Polylines using `J`/`JOIN`, multi-selection, primary-layer properties, and one-step Undo
- Join retains collinear chains as Lines, compatible circular chains as Arcs or Circles, and mixed straight/curved chains as bulge-based Polylines
- Native Explode for Rectangles and Polylines using `X`/`EXPLODE`, multi-selection, exact Line/Arc conversion, layer/elevation preservation, and one-step Undo
- Native Lengthen for Lines, Arcs, and open Polylines using `LEN`/`LENGTHEN`, endpoint picking, live preview, and Delta, Total, Percent, or Dynamic methods
- Rough-framing Story model with a Building Datum, ordered Stories, an active
  Story drawing plane, and calculated rough and finished elevations
- Spreadsheet-style Story and Assembly Manager with add-above/add-below, datum
  anchoring, live section preview, and editable structural and finish layers
- Layered floor structure, floor finish, ceiling structure, and ceiling finish assemblies; only
  rough structure controls dependent Story elevations
- Reusable wall types with explicitly ordered Exterior, Main, and Interior layer
  groups, per-group thickness totals, and a required structural Main core; new plans
  include 2x4 and 2x6 exterior walls plus 2x4 and 2x6 interior walls, with the 2x6
  exterior assembly active for initial drawing
- Reusable Foundation Wall Types with concrete height/width/material, continuous footing
  geometry, top offsets, hosted sill dimensions, exterior-edge setback, and explicit
  plate ownership for standard, interior mudsill, dropped, garage, and walk-out conditions
- Foundation Wall stems, footings, and sill plates clean up independently at supported
  corners and T-junctions while their editable reference paths remain unchanged
- Framed Walls save an explicit supporting Foundation Wall relationship; new aligned
  Walls are matched automatically and the assignment remains editable in Properties
- Directed Walls with left/right exterior orientation and selectable Wall center,
  exterior-Main, center-Main, or interior-Main reference lines
- Main-core-aware corner and T-junction cleanup across compatible mixed Wall
  types, with conservative square ends and visible status for unresolved nodes
- Hosted Door and Window records with separate unit and rough-opening dimensions,
  rough-opening cuts through every Wall layer, and a Window bottom-of-header
  elevation measured above the Story subfloor for future framing
- Reusable Door and Window component types with independent active defaults,
  unit and rough-opening sizes, Window header defaults, and exterior/interior
  finish-return depths that generate jamb, head, and Window sill geometry; each type
  also owns a joined 3D component tree for frames, jambs, sashes, panels, glazing,
  mullions, trim, thresholds, and hardware. Components retain stable identities,
  parent relationships, materials, profiles, inset rules, depth, and face anchoring;
  editing a parent rebuilds its nested parts while the rough opening remains separate.
  Product layout generators build editable flush, one-, two-, four-, and six-panel
  Doors plus fixed, hung, casement, awning, and sliding Window sash arrangements.
  Equal, Colonial, and Prairie divided-lite patterns repeat inside each generated sash.
  The Type Manager includes a live exterior-elevation preview generated from the same
  host-aware component solids used by placed openings, with rough-opening, unit-size,
  header-height, component-count, and source summaries.
  A placed Door or Window can override an individual part's material, visibility,
  profile or divider width, inset, depth, face anchor, offset, and divider count while
  continuing to inherit the Type's component topology and all untouched values.
  Each type
  can use its host Wall's classified header default or provide its own assembly,
  king/jack counts per side, and Window
  rough-sill count; built-up headers support on-edge lumber or LVL plies, interior
  rigid-insulation fillers, sheathing spacers, flat member stacks, and a user-defined
  rectangular steel representation, with wall-cavity fit protection; assemblies
  carry schedule marks and explicit engineering-review flags, while placed openings
  retain a type link and can apply a final header override
- Project-level Wall Framing Defaults that generate studs, bottom and top plates,
  king and jack studs, headers, Window rough sills, and cripple studs from the
  Wall Main layer and structural rough openings, with an optional 3D framing reveal;
  resolved Wall joins add selectable two/three-stud corners and none, three-stud,
  or ladder-blocking partition backing
- Enclosed Room detection from Story-owned Wall loops, with stable Room identities,
  calculated areas, and a dedicated Room Manager
- Story-default inheritance for Room floor/ceiling assemblies and rough ceiling
  height, plus explicit Room-level assembly, ceiling-height, and rough-floor offsets
- Derived Room floor and ceiling platforms generated from each Room boundary and
  effective structural/finish assemblies, with calculated finished elevations and
  unobstructed 2D Top drafting while layered platforms remain visible in 3D views
- Wall-aware floor platform edges that prefer an aligned Foundation Wall sill's
  exterior edge, otherwise resolve to the framed Wall Main-layer exterior, retain
  shared Room boundaries, and report the resolved rule in Room Manager
- Room-hosted Platform Openings for stairwells, shafts, and open-below areas, with
  independent floor, ceiling, or combined cuts, 2D plan outlines, and 3D assembly holes
- Platform Openings can continue through adjacent Stories as one validated vertical
  path; matching cuts are created or linked, required floor/ceiling cuts are enforced,
  and editing the footprint or purpose updates every connected Story
- CAD-style Stretch with crossing-window endpoint and Polyline-vertex capture, whole-entity window movement, snapped base/target preview, exact signed X/Y displacement, and the `S`/`STRETCH` command alias
- Exact Line-to-Line, Line-to-Arc, and Arc-to-Arc Fillet with picked-side
  trim/extend behavior and live preview, plus an
  all-corners option for one selected straight-segment open or closed Polyline,
  preserving its identity, layer, elevation, and constant width. Includes live preview,
  persistent architectural radius, radius-zero corner cleanup, stable source
  identities, lock enforcement, `F`/`FILLET`, Escape, and one-step Undo
- Exact Line-to-Line Chamfer with separate first and second architectural
  setbacks, picked-side trim/extend behavior, live preview, zero-distance sharp
  corner cleanup, plus path-order setbacks across every valid corner of one
  selected straight-segment Polyline. Includes stable source identities, lock enforcement, `CHA`/`CHAMFER`,
  sequential `D` distance entry, Escape, and one-step Undo
- Cursor and typed inputs remain on the configured architectural snap while
  calculated tangent geometry retains exact internal precision
- Rotation-aware grips, face resizing, alignment, snapping, and bounds
- Dedicated Draw ribbon workspace with a keyboard-accessible `L` Line command
- Chained line creation from clicked points or exact X/Y/Z architectural coordinates
- X/Y coordinate entry defaults Z to the active drawing elevation; explicit Z creates true 3D lines
- Command-line distance entry draws along the live cursor direction after a point is established
- Permanent 0°, 90°, 180°, and 270° polar tracking with configurable additional snap angles
- Cursor-adjacent live distance, plan-angle, and snap-type feedback
- Visible polar and Ortho tracking guides
- Hover-acquired object-snap projection paths using the active tracking angles
- Tab cycling for overlapping object-snap candidates during every drawing command
- One-point typed snap overrides such as `END`, `MID`, `CEN`, `INT`, `TAN`, and `PER`
- Independently configurable visible grid spacing and freehand cursor-snap increment
- Command-level `U`/Undo for the previous segment and `C`/Close for chained lines
- Single-Escape command cancellation for Line, Polyline, Rectangle, Circle, and Arc
- Enter repeats the previous Line, Polyline, Rectangle, Circle, or Arc command when no command is active
- F3 Object Snap, F8 Ortho, and F10 Polar controls in the status bar
- Exact center, geometric-center, quadrant, intersection, tangent, perpendicular,
  extension, parallel, nearest, endpoint, midpoint, and 3D-corner acquisition
- True line/Circle, line/Arc, Circle/Circle, and Arc-limited intersection calculations
- Configurable endpoint, midpoint, intersection, perpendicular, nearest, and corner snaps
- Active drawing elevation for consistent mouse-created geometry
- Device-local persistence for Line angles, snap modes, drafting toggles, and elevation
- Exact absolute `X,Y,Z` and relative `@X,Y,Z` point entry
- 1/16-inch grid snapping plus line endpoint, line midpoint, and box-corner snaps
- CAD-style line grips: endpoints reshape the line and the midpoint moves it
- Exact Start X/Y/Z and End X/Y/Z architectural coordinate entry
- Exact architectural line length, plan-angle, and elevation-angle entry from a fixed start point
- Line selection, naming, locking, layer assignment, deletion, and Undo/Redo
- Line-aware Fit View, Model Explorer, layer counts, project saving, and recovery
- First-class Polyline entities made from two or more connected vertices
- CAD-style `P`, `PL`, `PLINE`, and `POLYLINE` command aliases
- Exact absolute and `@` relative Polyline vertices, cursor-directed distances, shared elevation, live distance/angle feedback, and common drafting snaps
- Mixed Polyline Line and true 3-point Arc segments with `L`/`A` switching during one continuous command
- Persistent constant Polyline width from the Draw ribbon, `WIDTH` command input, or editable Properties
- Polyline vertex Undo with `U`, open finish with Enter, close with `C`, single-Escape exit, and Enter-to-repeat workflow
- CAD-style `R`, `REC`, and `RECTANG` Rectangle command aliases
- Rectangle creation from clicked or exact `X,Y`/`X,Y,Z` corners, relative `@X,Y`, or typed `width × height`
- Rectangle Corners, exact Dimensions, and target Area construction methods with cursor-directed quadrant placement
- Rectangle rotation, sharp/chamfer/fillet corner styles, and persistent constant width from the Draw ribbon
- Cursor-adjacent live Rectangle width, height, snap type, and elevation feedback
- Rectangles stored on the active elevation plane with grid, object-snap, Ortho, and Polar acquisition
- Constraint-preserving Rectangle grips: corners resize two sides, edge grips resize one side, and the center grip moves the entity
- Exact Rectangle base point, width, height, elevation, area, and perimeter properties
- Single-Escape Rectangle cancellation and Enter-to-repeat workflow
- Polyline and Rectangle selection, architectural snapping,
  naming, locking, layer assignment, deletion, and Undo/Redo
- Polyline-aware Fit View, object snaps, Model Explorer, layer counts, saving, and recovery
- First-class Circle entities with `C` and `CIRCLE` command aliases
- Six Circle construction methods: Center-Radius, Center-Diameter, 2-Point,
  3-Point, Tangent-Tangent-Radius, and Tangent-Tangent-Tangent
- Tangent Circle selection from Lines, straight or curved Polyline segments,
  Circles, Arcs, and box footprint edges, including internal/external solutions
- Circle creation from clicked, absolute, or relative points, plus architectural radius, diameter, and direction-following distance entry
- Circle center and quadrant object snaps, live radius/diameter feedback, and active-elevation support
- Circle center movement grip, four radius grips, and exact center, elevation, radius, diameter, circumference, and area properties
- Circle naming, locking, layer assignment, deletion, Undo/Redo, Fit View, Model Explorer, saving, and recovery
- First-class Arc entities with `A` and `ARC` command aliases and eleven AutoCAD-style construction methods
- 3-Point; Start/Center/End; Start/Center/Angle; Start/Center/Length; Start/End/Angle; Start/End/Direction; Start/End/Radius; Center/Start/End; Center/Start/Angle; Center/Start/Length; and tangent Continue workflows
- Arc creation from clicked or exact points, degree angles, architectural chord lengths and radii, with live true-curve preview
- Arc center, endpoint, and midpoint snaps and grips, plus exact center, elevation, radius, sweep, direction, and length properties
- Arc naming, locking, layer assignment, deletion, Undo/Redo, Fit View, Model Explorer, saving, and recovery
- Unique editable names for every box
- Exact and freehand copying for either one box or a multi-object selection
- Confirmed, undoable deletion while protecting the final remaining box
- Face selection and highlighting
- Freehand face push/pull with the opposite face fixed
- Exact push or pull distance entry
- Undo and Redo for dimensional changes and face movement
- Versioned local project files using the `.mbproj` extension
- Backward-compatible opening and automatic upgrading of version-1 through version-39 files
- New, Open, and Save controls with `Ctrl+O` and `Ctrl+S` shortcuts
- Project-file validation and unsaved-change warnings
- Automatic local draft recovery after refreshes, browser restarts, or an unexpected close
- Recovery validation, last-manual-save tracking, and an explicit discard option
- Middle-mouse pan, Shift + middle-mouse orbit, wheel zoom, and Fit View
- Automated unit parsing, formatting, and rendered-workspace tests

## Requirements

- Windows, macOS, or Linux
- Node.js 22.13 or newer
- npm

Python is not required for the current application.

## Local Development

```bash
npm install
npm run dev
```

Open the local address printed by the development server.

## Verification

```bash
npm run test:units
npm run build
node --test tests/rendered-html.test.mjs
```

`npm test` runs the complete verification sequence.

## Current Architecture

- `app/model-builder-app.tsx`: application shell, viewport, controls, and properties
- `lib/box-model.ts`: fixed-face geometry rules and parametric box state
- `lib/cad-line.ts`: 3D line geometry, coordinate parsing, polar tracking, and grip rules
- `lib/cad-circle.ts`: elevated Circle geometry, measurements, validation, and grip rules
- `lib/cad-arc.ts`: elevated three-point Arc geometry, sweep selection, measurements, validation, and grip rules
- `lib/cad-point-acquisition.ts`: reusable grid, object-snap, Ortho, Polar, and derived-point acquisition
- `lib/cad-offset.ts`: native Line, Polyline, Rectangle, Circle, and Arc offset geometry
- `lib/cad-trim-extend.ts`: shared Line, Polyline, Circle, and Arc intersection, Trim, and Extend geometry
- `lib/cad-boundary.ts`: reusable closed-loop discovery and exact Line/Arc face tracing
- `lib/cad-break.ts`: native Line, Polyline, Circle-to-Arc, and Arc Break geometry
- `lib/cad-join.ts`: endpoint-chain ordering, compatibility checks, and native Line, Arc, Circle, or Polyline Join results
- `lib/cad-explode.ts`: exact Polyline-segment conversion to independent native Line and Arc geometry
- `lib/cad-lengthen.ts`: endpoint-preserving Line, Arc, and open Polyline length changes for all four Lengthen methods
- `lib/cad-chamfer.ts`: exact picked-side Line-to-Line two-distance Chamfer geometry
- `lib/cad-fillet.ts`: exact picked-side Line-to-Line, Line-to-Arc, and Arc-to-Arc tangent Fillet geometry
- `lib/cad-polyline-corners.ts`: exact all-corners Fillet and Chamfer geometry for straight-segment Polylines
- `lib/cad-polyline.ts`: elevated 2D geometry, constrained rectangles, dimension parsing, lengths, and grips
- `lib/document-model.ts`: multi-object document state, identity, and editing rules
- `lib/project-file.ts`: versioned project serialization and validation
- `lib/project-recovery.ts`: device-local recovery snapshots and validation
- `lib/architectural-units.ts`: dimension parsing, formatting, and 1/16-inch snapping
- `lib/building-stories.ts`: rough-framing Stories, layered assemblies, datum rules, and calculated elevations
- `tests/architectural-units.test.ts`: measurement behavior tests
- `tests/rendered-html.test.mjs`: production-render verification

Application state is kept separate from formatted dimension text. The 3D view
is derived from numeric dimensions measured in inches, with interface values
normalized to architectural notation.

## Current Milestone

The 2D Core v1 engineering gate is complete: the compact modification set,
reusable Boundary discovery, regression suite, production build, lint, and
rendered-workspace checks pass. A short manual architectural floor-plan smoke
test is the remaining acceptance check.

**Levels, Stories, Datum, and Vertical Constraints** now includes rough-framing
Stories, layered assemblies, calculated elevations, the Building Datum, Story-owned
drawing geometry, floor-platform inputs, Wall types and junctions, hosted openings,
and enclosed Rooms with inherited defaults and explicit overrides. The first
focused interface pass is complete: blank plans now open with an in-canvas setup
guide, the Home ribbon exposes the building workflow, Properties summarizes the
active project defaults, and Model Explorer has a Building view for Stories,
Wall Types, and Rooms. Walls now derive their automatic rough base and top from
adjacent Room overrides, fall back to Story defaults before Rooms are detected,
and expose mixed adjacent conditions without storing duplicate heights. Enclosed
Rooms now also generate layered floor and ceiling platforms from the same effective
elevations and assembly overrides without storing duplicate Polylines; the Top view
keeps those 3D solids hidden so plan drafting stays clear. Hosted Platform Openings
now cut those derived floor and ceiling assemblies for stairwells, shafts, and
  open-below conditions while retaining a visible plan outline. Floor platforms now
  resolve each perimeter edge to the exterior face of the Wall type's Main structural
  layer while shared Walls retain a common Room boundary; Room Manager reports every
  resolved edge condition. Foundation Wall Types now establish reusable concrete
  height/width, footing, top-offset, and hosted sill definitions with the reviewed
  plate ownership for standard and special residential conditions. Foundation Walls
  can be drawn from the active type in plan, render their concrete stem, footing, and
  foundation-hosted sill plates in 3D, and supply the preferred sill edge to the Room
  floor solver. Their stems, footings, and sill plates now clean up independently at
  corners and T-junctions. Framed Walls save an editable supporting Foundation Wall
  relationship, with automatic matching for newly aligned Walls. Stairwell, shaft,
  and open-below cuts can now continue as aligned, validated paths through adjacent
  Stories. Door and Window component definitions now provide reusable unit sizes,
  rough openings, header defaults, finish-return geometry, and editable joined 3D
  assemblies. Frames, jambs, sashes, panels, glazing, mullions, and interior/exterior
  trim are generated from nested component rules and remain independent of the
  structural rough opening. Each placed opening can override practical component
  parameters without severing its Type relationship; changing Types intentionally
  clears those instance overrides so stale component identities cannot survive. Those
  types now include product layout generators for common residential Door panel
  patterns, operable Window sash arrangements, and divided-lite grids. The generator
  output remains editable component geometry; manufacturer identity and certified
  product profiles are intentionally not inferred from these generic layouts. Those
  generators now update a live exterior-elevation preview inside the Type Manager.
  The Project Product Library now indexes native Door and Window Types, their generated
  plan/elevation/3D representations, and validated manufacturer asset manifests. It can
  set the active Door or Window and place that product directly into a selected Wall.
  Version-2 product packages carry referenced SVG/GLB representation metadata while
  preserving source provenance and editable opening/framing data. Binary asset storage
  and rendering remain a separate import step; proprietary CAD/BIM formats require
  conversion or dedicated adapters.
  structural openings now drive an initial conventional light-frame member layout,
  with project settings for spacing, member size, plate counts, and 3D framing
  visibility. Wall Types now classify exterior/interior and bearing/non-bearing use
  and supply the normal header assembly. Each reusable Door and Window type can inherit
  that host default or override it and controls its king/jack counts; placed openings
  can make the final override. Window types also control stacked rough-sill
  plates beneath the rough opening. Header assemblies now model separate on-edge
  lumber or LVL plies, interior rigid-insulation fillers, sheathing spacers, flat
  member stacks, and a user-defined rectangular steel representation. Incompatible
  built-up headers are blocked from thinner Wall Main layers instead of being clipped.
  Header schedule marks and engineering-review flags are saved with the project.
  These remain explicit drafting rules rather than engineered span calculations.
  Resolved corners and T-intersections drive project-selected corner and
  partition-backing methods. The next framing work is manual per-junction overrides
  and a generated header schedule rather than automatic structural sizing.
  New plans now include editable 2x4 and 2x6 exterior and interior Wall types. The
  2x6 exterior assembly is the active drawing default; older project files keep their
  saved Wall libraries, and pre-Wall-library files retain the original 2x4 exterior
  compatibility default.
Annotation, layouts, plotting, interchange, and specialty drafting commands will
continue later as a Construction Documentation track rather than delaying the
residential 3D foundation. See `docs/2D_TO_3D_HANDOFF_GATE.md` for the boundary.

## Project Files

Model Builder saves a human-readable, versioned `.mbproj` file to the browser's
Downloads folder. Open restores every box, its identity, dimensions, position,
group membership, lock state, Z-axis rotation, 3D lines, polylines, rectangles, Circles, Arcs,
the project name, unit settings, Story, Room, Platform Opening, placed Foundation Wall,
Foundation Wall Type, Door/Window Type, placed Door/Window component overrides, Wall Framing defaults, manufacturer product provenance and asset manifests, assembly definitions, and format metadata. Version-1 through version-39 files open and upgrade
to the current format. Files with invalid geometry, duplicate object or group identities or
names, unsupported units, excessive object counts, or a newer format version
are rejected with a clear message instead of being partially loaded.

## 2D CAD Drawing

Press `L` or choose Line to start the command. The first point can be clicked or
entered as `X,Y` or `X,Y,Z` in architectural units; X/Y input defaults the first
Z coordinate to the active drawing elevation. Continue by clicking points, entering exact absolute points,
or using `@X,Y,Z` for a relative point. After a start point is established, point
the cursor in the intended direction and enter a plain architectural distance to
draw at that length. The cursor always tracks 0°, 90°, 180°, and 270° within a
four-degree capture range, and additional angles can be added in Line Properties.
F8 forces horizontal or vertical Ortho drawing, while F10 controls Polar tracking.
F3 controls object snaps; individual endpoint, midpoint, center, geometric-center,
quadrant, intersection, tangent, perpendicular, extension, parallel, nearest,
node, and 3D-corner modes are configured in drawing Properties. Node is reserved
for the future Point entity; the remaining modes operate on current geometry.
Object snaps take precedence over Ortho, Polar, and grid tracking. Type `U` to
remove the previous segment without leaving Line or `C` to close a chain after
two segments. Escape immediately ends Line while preserving completed segments;
an empty command or Finish Line also ends it. Enter repeats Line afterward.
Pause over an object-snap point for 0.4 seconds to acquire projection paths from
that point. When multiple snap candidates overlap, press Tab to cycle them. A
typed snap name or abbreviation applies only to the next point, even when F3 is off.
Selecting a line exposes
3D endpoint grips, a midpoint movement grip, exact X/Y/Z endpoint coordinates,
and exact length, plan-angle, and elevation-angle entry in Properties.

Press `R`, or enter `REC`, `RECTANG`, or `RECTANGLE`, to start Rectangle. Specify
the first corner by click or exact `X,Y`/`X,Y,Z`, then specify the opposite corner
by click, exact or relative coordinate, or dimensions such as `12' x 8'`. Exact
dimensions extend into the quadrant indicated by the cursor. Rectangle uses the
same grid, object snaps, Ortho, Polar tracking, active elevation, and live cursor
feedback as Line. Escape cancels an active Rectangle and immediately exits;
Enter repeats the completed command. Selecting a Rectangle exposes four corner
grips, four edge grips, a center movement grip, and exact base point, elevation,
width, height, area, and perimeter properties while preserving a rectangular shape.
The Draw ribbon also offers Dimensions and Area construction. Area accepts square
feet plus a fixed Length or Width; the other side is calculated automatically.
Rotation is entered in degrees, constant width is entered architecturally, and
corners may be Sharp, Chamfered with separate X/Y setbacks, or Filleted by radius.
Rotated, chamfered, and filleted results intentionally behave as editable closed
polylines, while axis-aligned sharp Rectangles retain constrained edge and center grips.

Press `P`, or enter `PL`, `PLINE`, or `POLYLINE`, to create one connected entity
rather than a collection of independent lines. Vertices can be clicked or entered
as exact absolute or `@` relative coordinates. Once the first vertex is set, a
plain architectural distance follows the cursor direction. Polyline shares Line's
grid, object snaps, Ortho, Polar tracking, active elevation, and live distance and
angle feedback. Press `A` to add a true Arc segment by specifying a through-point
and endpoint; press `L` to return to straight segments. Set a constant model-space
width in the Draw ribbon, with `WIDTH 6"`, or in Properties. Type `U` to remove the previous vertex, press Enter to finish an
open Polyline, or `C` to close it back to the first point. Escape immediately exits,
preserving an open Polyline when at least two vertices have been placed. Enter repeats the command afterward.
Selecting a Polyline exposes vertex grips and an editable elevation in Properties.
Polylines participate in Fit View, Undo/Redo, local recovery, and current
version-16 `.mbproj` files. Versions 1 through 15 open through the compatibility upgrader.

Press `C`, or enter `CIRCLE`, to start Circle. Choose Center-Radius,
Center-Diameter, 2-Point, 3-Point, Tangent-Tangent-Radius, or
Tangent-Tangent-Tangent from the Draw ribbon. Every point-defined construction point
accepts a click, exact `X,Y`/`X,Y,Z`, or relative `@X,Y` coordinate. Center methods
accept a typed architectural radius or diameter; point-defined methods accept a
distance in the current pointer direction. The Circle stays on the first point's elevation plane and participates in grid and object
snapping. Its green center grip moves the entity; four blue quadrant grips change the
radius while keeping the center fixed. Properties provides exact center coordinates,
elevation, radius, diameter, circumference, and area. Escape exits Circle immediately,
and Enter repeats the command after completion.
For Tangent-Tangent-Radius, select two visible objects near the intended tangent
locations, then type an architectural radius or click to establish it. For
Tangent-Tangent-Tangent, select three objects. Live preview and the pick locations
choose among valid internal, external, incircle, and excircle solutions.

Press `A`, or enter `ARC`, to start Arc. The default workflow matches the familiar
three-point CAD method: specify the start point, a point the curve must pass through,
and the end point. The Draw ribbon and active Arc Properties expose the complete method
list: 3-Point; Start/Center/End; Start/Center/Angle; Start/Center/Length;
Start/End/Angle; Start/End/Direction; Start/End/Radius; Center/Start/End;
Center/Start/Angle; Center/Start/Length; and Continue. Continue starts tangent to the
last drawn or selected line, Arc, or polyline. Each point accepts a click, exact
`X,Y`/`X,Y,Z`, a relative `@X,Y`/`@X,Y,Z` coordinate, or a positive architectural
distance in the current cursor direction. Scalar steps accept degree angles or
architectural chord lengths and radii. All construction points must share an elevation.
The green
center grip moves the Arc; its blue start, midpoint, and end grips reshape it while the
other defining points remain fixed. Properties provides exact center, elevation, radius,
sweep direction, sweep angle, length, and endpoint readouts. Escape exits Arc immediately,
and Enter repeats the command after completion.

The broader product scope and phased roadmap are maintained in Dropbox at
`/Projects/model_builder/PROJECT_SCOPE_AND_ROADMAP.md`.

The reviewed 2D implementation sequence is maintained locally in
`docs/2D_CAD_IMPLEMENTATION_PLAN.md` and is derived from the Google Drive
AutoCAD 2026 feature and command specification.

## Automatic Recovery

Model Builder keeps a validated recovery draft in this browser after a short
pause in editing and flushes the latest state when the page closes or becomes
hidden. On the next visit, it restores both the current work and the last
manually saved baseline, so the unsaved-change indicator remains accurate.
Recovery data stays on this device and is not a substitute for a portable
`.mbproj` file. Untouched new projects do not create recovery data.

## Object Positioning

Each box is located by the X, Y, and Z coordinates of its local minimum corner. Position
fields accept positive, zero, or negative feet-and-inch values, such as
`12'-6"`, `0`, or `-6"`. The Move panel applies an exact positive or negative
offset along one selected axis to any editable selection without changing entity geometry.
The selected box also displays X, Y, and Z movement grips at its upper corner.
Grip dragging moves the complete box on the 1/16-inch grid and snaps matching
faces together when they come within three inches of another visible object.

## Object Rotation

Rotation works across boxes, Lines, Polylines, Rectangles, Circles, and Arcs,
including mixed selections. It preserves each entity's native geometry while
rotating it around one shared base point derived from the complete selection.
The Properties panel accepts an exact positive angle and provides clockwise or
counterclockwise actions. Freehand rotation uses the gold viewport ring, snaps
to 15-degree increments, and switches to 1-degree precision while Shift is held.
The base point can be the selection center, any plan corner, or any plan edge
midpoint. Locked entities are protected, and every completed rotation is one
Undo/Redo transaction.

## Object Scaling

Uniform plan scaling works across boxes, Lines, Polylines, Rectangles, Circles,
and Arcs, including mixed selections. The Properties panel accepts an exact
factor and offers the same nine shared base-point positions used by rotation.
Freehand scaling uses the green viewport handle, snaps to 0.1-factor increments,
and switches to 0.01 precision while Shift is held. Native curves remain native,
polyline width scales with the geometry, and box height and entity elevation stay
unchanged during this 2D operation. Locked entities are protected, and every
completed scale is one Undo/Redo transaction.

## Object Mirroring

Mirror works across boxes, Lines, Polylines, Rectangles, Circles, and Arcs,
including mixed selections. `MI` or `MIRROR` starts a two-point mirror axis in
Top view with grid, object, Ortho, and Polar snapping plus a live reflected
preview. Properties controls whether the original selection is kept or replaced
and provides quick horizontal and vertical axes through the aggregate selection
center. Native Lines, curves, Polylines, Rectangles, and boxes remain editable
native entities after reflection. Locked entities are protected, Escape restores
the original geometry, and every completed mirror is one Undo/Redo transaction.

## Object Offset

Offset works on one selected Line, Polyline, Rectangle, Circle, or Arc at a
time, matching the selection-first behavior used elsewhere in Model Builder.
`O` or `OFFSET` starts the command in Top view. Enter an exact architectural
distance in Properties or the command line, then point to either side of the
source for a live preview and click to commit. Straight and curved Polyline
segments remain one native Polyline, and Circles and Arcs remain native curves.
The source can be kept or replaced. Locked geometry is protected, invalid
inward offsets are rejected, Escape restores the original drawing, and each
completed Offset is one Undo/Redo transaction. Boxes are intentionally excluded:
offsetting a 3D solid is a separate future modeling operation. Automatic cleanup
of complex self-intersecting Polyline offsets remains a later refinement.

## Object Trim and Extend

Select one unlocked 2D entity, then use `TR`/`TRIM` or `EX`/`EXTEND`.
Every other visible 2D entity acts as a quick boundary. Trim removes the portion
under the cursor and can split a Line, Arc, or Polyline into multiple native
pieces. Trimming a Circle converts the remaining curve to a native Arc, and
trimming a Rectangle opens it as a native Polyline. Extend moves the nearest
endpoint of a Line, Arc, or open Polyline to the first intersecting boundary.
Both commands show a live preview, protect locked targets, restore the drawing
on Escape, preserve 1/16-inch precision, and commit as one Undo/Redo transaction.
Boxes, Circles, and closed Polylines are intentionally unavailable for Extend
because they do not have an open endpoint.

## Closed Boundaries

Use Boundary from the Home or Draw ribbon, or enter `B`, `BO`, `BOUNDARY`, or
`BPOLY`. Move the cursor inside an enclosed area to preview the smallest detected
loop, then click to create it as a normal closed Polyline on the active layer.
Visible Lines, Arcs, Circles, and open or closed Polylines at the active elevation
can define the enclosure; hidden geometry is ignored. Circular portions remain
exact bulge-based Polyline segments rather than being flattened into short lines.
Locked source geometry may define the enclosure, but creation is disabled when
the active layer is hidden or locked. Escape cancels without changing the model,
and each completed Boundary is one Undo/Redo transaction. The same loop engine is
the planned foundation for future Room and FloorPlatform objects.

## Object Break

Use `BR` or `BREAK`, select an unlocked native curve, then pick two points on
that curve. The portion between the points is removed. Lines, open Polylines,
and Arcs can produce two native pieces; a Rectangle becomes an open Polyline;
and a Circle becomes a native Arc. Use `BP` or `BREAKATPOINT` to divide an open
Line, Polyline, or Arc at one interior point without removing length. One-point
Break intentionally excludes Circles and closed Polylines because a single
point cannot divide a loop into two independent objects. Both methods provide
live preview, preserve layer, elevation, constant width, Polyline bulges, and
the first retained source identity, restore the original curve on Escape, and
commit as one Undo/Redo transaction.

## Object Join

Select two or more unlocked Lines, Arcs, or open Polylines with touching
endpoints, then use `J` or `JOIN`. The entities may be selected out of order,
but they must form one unbranched chain at a common elevation. Collinear chains
become one Line, compatible circular chains become one Arc or Circle, and mixed
straight and curved chains become one native bulge-based Polyline. The primary
selection supplies the result layer, name, and constant Polyline width where
applicable. Gaps larger than 1/64 inch, branches, closed source Polylines,
elevation changes, and locked entities are rejected without changing the
drawing. A successful Join is one Undo/Redo transaction.

## Object Explode

Select one or more unlocked Rectangles or Polylines, then use `X` or `EXPLODE`.
Every straight segment becomes an independent native Line and every bulge-based
curved segment becomes an exact native Arc. The result preserves the source
layer and elevation, remains selected for immediate editing, and commits as one
Undo/Redo transaction. Constant Polyline width is intentionally removed because
native Line and Arc entities do not store width; Properties identifies that
conversion before it is applied.

## Object Lengthen

Select one unlocked Line, Arc, or open Polyline, then use `LEN` or `LENGTHEN`.
Choose Delta to add or remove a signed distance, Total to set the complete curve
length, Percent to scale the complete length, or Dynamic to place the chosen
endpoint with the cursor. Pick near the start or end to identify which endpoint
changes. Lines retain their direction, Arcs retain their center and radius, and
open Polylines change only their selected terminal segment while retaining
straight or bulge-based curved geometry. The viewport previews valid results;
Escape restores the source and a completed edit is one Undo/Redo transaction.

## Object Stretch

Use `S` or `STRETCH`, then drag a right-to-left crossing window across the Line
endpoints or Polyline vertices that should move. Geometry completely enclosed by
the window moves as a whole; geometry merely crossed changes only at captured
endpoints or vertices. After selection, click a snapped base point and target
point for freehand placement, or enter exact signed X/Y displacement in
Properties. Partial Rectangle edits become ordinary closed Polylines so their
grips and properties remain truthful. Stretch preserves entity IDs, layers,
elevation, native Polyline bulges, locks, Escape cancellation, and one-step
Undo/Redo. Circles, Arcs, and boxes move only when completely enclosed because
they do not expose Stretch-compatible partial vertices in this milestone.

## Object Management

Clicking the selected box name in the left Properties header turns it into an
inline editor. Duplicate and Delete stay beside the object list in the right
Model Explorer without repeating the selected object in a second panel. Names
are trimmed, limited to 120 characters, and kept unique within the project. A
new plan opens as a blank Top view while retaining editable Story, floor,
ceiling, and Wall Type defaults. Projects may contain no model entities, and
every management action participates in Undo and Redo.
