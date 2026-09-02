# Story and Layered Assembly Model

## Decision

Model Builder uses rough framing to establish the building's vertical geometry.
Finish layers produce finished dimensions, materials, sections, schedules, and
interior surfaces, but do not move structural Story datums.

The user-facing workflow follows residential design practice: define a Story's
rough ceiling or plate height and its layered assemblies, then let the program
calculate every absolute elevation. Internally, the results remain explicit
constraints so future walls, rooms, platforms, roofs, and sections can depend on
them safely.

## Definitions

- **Building Datum** is the absolute elevation assigned to one anchored Story's
  rough floor plane. World Z=0 remains the immutable model origin.
- **Story** is an ordered building floor with a rough floor datum, rough ceiling
  or plate height, and layered floor and ceiling assemblies.
- **Rough Floor** is the top of the structural floor assembly, normally the top
  of the subfloor. This is the Story's drawing plane.
- **Finished Floor** is the rough floor plus the complete floor-finish assembly.
- **Rough Ceiling** is the wall-framing or top-plate plane.
- **Ceiling Structure** builds downward from the rough ceiling plane for dropped
  framing, furring, or other structural depth without changing the Story datum.
- **Finished Ceiling** is the rough ceiling minus the ceiling-structure and
  ceiling-finish assemblies.
- **Floor Structure** belongs to the Story above it. It establishes the distance
  between the lower Story's rough ceiling and the upper Story's rough floor.

## Required Calculations

For adjacent Stories ordered from lower to upper:

```text
Upper Rough Floor
= Lower Rough Floor
+ Lower Rough Ceiling Height
+ Upper Floor Structure Thickness
```

Finished values are derived independently:

```text
Finished Floor = Rough Floor + Floor Finish Thickness
Finished Ceiling
= Rough Ceiling - Ceiling Structure Thickness - Ceiling Finish Thickness
Finished Clear Height
= Rough Ceiling Height
- Floor Finish Thickness
- Ceiling Structure Thickness
- Ceiling Finish Thickness
```

The initial default demonstrates the reviewed Chief Architect example:

```text
Rough ceiling / plate height   9'-1 1/8"
Floor structure above          1'-0"
Next rough floor              10'-1 1/8"

Floor finish                     3/4"
Ceiling finish                 1 1/4"
Finished clear height          8'-11 1/8"
```

Changing a finish layer must never move the next Story's rough floor. Changing a
structural layer must recalculate dependent Story datums.

## Layered Assemblies

Every assembly is an ordered list of material layers. Each layer has a stable
identifier, name, material, role, and model-space thickness. Initial roles are
Finish, Sheathing/Subfloor, Framing, Insulation, Substrate, Membrane, and Air Gap.

Layer thicknesses are non-negative and use the project's 1/16-inch architectural
precision. Voids and air spaces are modeled as explicit layers rather than
negative thickness. Layers can be inserted, removed, and reordered; assembly
thickness is always calculated from the layer list.

Wall assemblies add a required semantic group to every layer. Their order is
always **Exterior Layers → Main Layers → Interior Layers**. Exterior and
Interior groups may contain any number of finish, membrane, sheathing, air-gap,
or substrate layers. Every wall type must retain at least one positive-thickness
Main layer. The Main group is the structural core and is the authoritative basis
for upcoming wall reference-line, joining, bearing, platform, foundation, roof,
and dimension behavior. A layer's group and its material role are deliberately
separate: for example, sheathing can belong to the Exterior group while framing
belongs to Main.

Every wall layer also stores whether it participates in automatic junction
cleanup. Participating layers are mitered or trimmed at supported corners and
T-junctions. Non-participating layers remain square at their editable Wall path
endpoint. This gives zero-thickness membranes and other special construction
layers an explicit connection policy without changing the Wall reference line.

A Wall Type can optionally designate one or more positive-thickness Finish
layers as its ordered open-end wrap. At a truly open or manually disconnected
endpoint, every layer body stops behind the complete wrap stack. Each selected
Finish layer contributes one full-width band using its actual material thickness,
in the wall assembly's exterior-to-interior order. The bands meet without
overlapping. Automatic joins, straight continuations, and unresolved shared
nodes remain unwrapped so their junction logic stays authoritative.

## Current Implementation

- Startup and New Plan open a blank model space in Top view. The default First
  Floor, floor/ceiling assemblies, and active Wall Type remain available for
  project-specific editing before any geometry is drawn. Blank projects can be
  saved, reopened, and recovered normally.
- Version-29 project files store the Building Datum, ordered Stories, active and
  anchored Story identities, all floor and wall assembly layers, entity Story
  ownership, floor-platform footprints, Wall type assignments, and the
  Exterior/Main/Interior group of every wall layer. Each Wall also stores its
  exterior side and selected reference line. Wall layers persist their automatic
  junction-participation setting; version-18 and earlier layers receive safe
  role-based defaults during upgrade.
- Door and Window openings are hosted by their Wall and store unit width/height
  separately from rough-opening width/height. The rough dimensions cut every
  Wall layer. Doors begin at the Story rough floor/subfloor; Windows store the
  bottom of the structural header above that same datum and calculate rough sill
  height as `bottom of header - rough-opening height`. This preserves the inputs
  needed for later king studs, trimmers, headers, sills, and cripple framing.
- Room-hosted stairwell, shaft, and open-below openings can be continued above
  or below into an immediately adjacent Story. The program creates or links the
  matching footprint inside the containing Room, enforces the floor/ceiling cuts
  required at each Story transition, and stores one vertical-path identity.
  Footprint and purpose edits propagate through the path; deleting or explicitly
  disconnecting a member safely removes the saved relationship.

## Foundation Wall Types

Foundation Wall Types are separate from ordinary layered Wall Types. Each reusable
type defines its concrete Main height, width, and material, continuous footing geometry,
signed top offset, and a hosted sill stack. The sill's exterior setback is measured
inward from the concrete Main exterior face and establishes the authoritative
floor-perimeter bearing edge when an aligned Foundation Wall supports a Room perimeter.

Standard Bearing and Interior Mudsill conditions begin with two foundation-hosted
sill plates. Dropped Foundation, Garage Foundation, and Complete Slab Walk-out
conditions begin with one foundation-hosted sill plate and one bottom plate owned by
the framed Wall above. Keeping plate ownership explicit prevents duplicate modeled
members and future schedule quantities. These are editable project defaults rather
than hard-coded geometry.
- `FW` or Model > Foundation Wall draws a straight Foundation Wall from the active
  Foundation Wall Type. Its plan reference and exterior side remain editable; its
  concrete stem, footing, and foundation-hosted sill plates render from the saved type.
- Foundation Wall stems, footings, and sill plates derive their own cleanup geometry
  at corners and T-junctions without moving the editable Foundation Wall reference paths.
- A framed Wall stores its supporting Foundation Wall identity. New aligned Walls are
  matched automatically, and the assignment can be changed or cleared in Properties.
  A Room perimeter uses that support's sill exterior edge and falls back to geometric
  matching, then to the framed Wall Main-layer exterior when no support is available.
- Each framed or Foundation Wall stores a junction priority plus independent Start and End cleanup
  modes. Automatic is the default. Square / disconnected explicitly removes an
  endpoint from automatic cleanup without moving its reference path. A uniquely
  higher-priority aligned Wall pair can act as the through host at an otherwise
  ambiguous four-Wall node; equal priorities remain unresolved instead of being
  guessed.
- Legacy version-1 through version-12 projects open with a default First Floor;
  version-13 entities are assigned to the saved anchor Story during upgrade.
- Manage > Stories opens the Story and Assembly Manager.
- Stories can be added above or below, renamed, deleted, and selected as the
  active plan or datum anchor.
- Rough height, datum elevation, floor structure, ceiling structure, and finish
  layers are editable.
- Calculated rough and finished elevations update in a live table and section pole.
- Applying the dialog is one Undo/Redo transaction and moves the active drawing
  plane to the active Story's rough floor.
- New boxes and drawing entities belong to the active Story. A selected entity's
  Story can be changed in Properties; its world elevation moves by the difference
  between the two rough-floor datums.
- Any editable closed Polyline or Rectangle can become a floor platform. Its
  footprint remains grip-editable, its elevation is constrained to the assigned
  Story rough floor, and the viewport builds separate structural and finish layer
  solids directly from that Story's live assemblies.
- `W` or Model > Wall draws straight, layered Walls with the same exact input,
  snaps, and chained-segment workflow as Line. New Walls use the exterior face
  of the Main group as their reference line and place the exterior to the left
  of the Start-to-End direction. The reference line stays grip-editable while
  the base and height follow the assigned Story rough floor and rough ceiling.
- A selected Wall can use Wall centerline, exterior face of Main, center of Main,
  or interior face of Main as its stable reference. Its exterior side can be
  flipped without reversing or moving the drawn path. Changing the Wall type
  rebuilds layers around the selected reference line.
- Straight Walls on the same Story automatically clean up supported corners and
  T-junctions without changing their editable reference paths. Corners between
  different Wall types derive one shared miter plane from the two Main cores, so
  finish layers do not need to correspond. A branch that meets the middle of a
  through-wall, or two aligned host segments, stops at the host's near Main face
  while the host remains continuous. Properties reports automatic and unresolved
  junction counts. Straight continuations remain square and clean; shallow
  angles, Y-junctions, crossing ambiguities, and four-or-more-Wall nodes remain
  square-ended and explicitly unresolved.
- Manage > Wall Types edits reusable exterior-to-interior layered assemblies in
  three explicit groups. Group totals are calculated independently, layer order
  is constrained within each group, and the last Main layer cannot be removed.
  Each layer can opt into automatic junction cleanup or remain square-ended.
  Any positive Finish layers can independently opt into the ordered open-end
  wrap; selecting none leaves every open Wall end square with no wrap.
  Existing Walls retain an assigned type; new Walls use the active type.
- Version-15 and version-16 wall types are upgraded automatically. Framing
  layers become Main; surrounding layers are classified Exterior or Interior.
  If an older wall has no framing role, its thickest layer becomes Main.
- Version-17 Walls upgrade to Wall centerline so their existing geometry does
  not shift. New Walls use the Main-group reference behavior.

## Door and Window Component Types

Door and Window Types are reusable project definitions rather than unrelated
dimensions stored only on each placed opening. Each type owns its unit width and
height, structural rough-opening width and height, and exterior/interior finish-
return depths. Window types also provide a default bottom-of-header elevation
measured from the Story subfloor; the placed Window may override that elevation.
Door header bottoms remain equal to their rough-opening height.

The project maintains one active Door Type and one active Window Type for new
openings. A placed opening retains its type identity and a resolved dimensional
snapshot used by current wall-cut geometry. Changing a type updates its linked
placements only when every resulting opening still fits its Wall and Story;
invalid overlaps or heights reject the update instead of corrupting geometry.
Version-29 and earlier files retain their existing dimensions and link matching
standard openings to the new default component types during upgrade.

Nonzero exterior and interior return depths generate finish solids inside each
linked rough opening. Each side receives left and right jambs plus a head; Window
returns also receive a sill. The outermost Wall layer supplies exterior-return
material and thickness, while the innermost layer supplies interior returns. On
a Wall thinner than the combined requested depths, both sides are proportionally
limited so they meet without overlapping. The structural rough opening remains
the authoritative void for later framing and unit placement.

## Next Steps

1. Add framing members from the reusable Door/Window rough-opening and header
   data, then develop product-unit and casing geometry independently of framing.
2. Add reusable assembly presets for framed floors, slabs, and ceiling finishes.
3. Add manual per-edge platform overrides for exceptional support details.
4. Add split-level, vaulted-ceiling, and manual wall-height exceptions
   only after the default dependency chain is stable.
