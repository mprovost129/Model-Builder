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
- Version-32 project files store the Building Datum, ordered Stories, active and
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

Each Door or Window Type also owns a parametric 3D component tree. The unit
rectangle is the root coordinate system; a component may instead join inside a
parent component's clear rectangle. Perimeter, panel/glazing, panel-grid, sash-grid,
vertical-divider, horizontal-divider, and Prairie-divider generators currently support frames, jambs, sashes,
panels, glass, mullions, interior/exterior trim, thresholds, and hardware roles.
Every component has a stable ID, material, visibility, inset, profile width,
across-wall depth, face anchor, and depth offset. Changing a parent profile
rebuilds its children. Unit X and bottom offsets position the assembled product
inside the separately controlled rough opening. Version-36 files store the
component graph; version-35 and earlier files upgrade with editable Door and
Window starter assemblies.

A placed Door or Window can override the material, visibility, inset, profile or
divider width, depth, depth anchor, depth offset, and divider count of any component
in its assigned Type. Unchanged fields continue to inherit from the Type, so later
Type edits still propagate. Component role, geometry generator, parent relationship,
and component identity remain Type-level topology: users duplicate or edit the Type
when that structure must change. Assigning another Type clears instance component
overrides rather than applying stale component IDs to a different assembly. Version-37
files store these overrides; version-36 and earlier files upgrade with none.

The Product Layout Generator composes those same editable components into common
residential configurations. Doors support flush, one-, two-, four-, and six-panel
layouts. Windows support fixed, single-hung, double-hung, casement-pair, awning,
and sliding sash arrangements plus none, equal 2x2, Colonial 3x2, and Prairie
divided-lite patterns. Glass and lite components are nested beneath the sash so
they repeat within every generated operable region. These are generic geometric
layouts, not certified manufacturer models; a future profile library will attach
manufacturer identity and validated product-specific dimensions explicitly.
Version-38 files store the expanded component generators; version-37 and earlier
files continue to open with their saved component topology.

Version-39 files attach an optional immutable manufacturer source record to each
Door or Window Type. The first `.mbproduct` importer validates manufacturer,
model, revision, original source, native dimensions, and editable component
topology before presenting a review screen. Confirmed imports always receive a
fresh project Type ID, name conflicts are resolved without overwriting an existing
Type, matching catalog products are called out explicitly, and imported header
references are cleared so they cannot bind to an unrelated project assembly.
Version-38 and earlier project files open with their existing Types marked as
native generic content.

Version-40 files add a validated representation manifest to each Door and Window
Type. A project-scoped Product Library combines those manufacturer SVG, GLB, glTF,
PNG, or JPEG references with the plan, elevation, and parametric 3D representations
generated by Model Builder. Users can search the library, set an active product for
new openings, or place a chosen product directly into a selected Wall. Product
Package version 2 carries the representation manifest; version-1 packages remain
compatible and import with no external asset references. The manifest records file
identity, role, format, source URL, byte count, and optional SHA-256 checksum, but it
does not claim that referenced binary content has been fetched, stored, or rendered.
That boundary keeps project files compact and makes the later asset-storage layer
explicit.

The first storage layer uses the Site's private product-asset bucket rather than
embedding binary content in `.mbproj` files. The Product Library accepts SVG and GLB
files up to 25 MB, records a SHA-256 checksum, and attaches the returned manifest to
the selected Type. SVG validation rejects scripts, event attributes, embedded
documents, entities, and externally loaded resources; GLB validation requires the
binary glTF signature, version 2, and a matching declared byte length. Stored SVGs
can be previewed in the library. Stored GLBs remain catalog representations until
their coordinate system, insertion point, unit scale, host depth, material mapping,
and native-geometry fallback are explicitly reviewed; upload alone never replaces
the construction-aware Door or Window assembly.

Version-41 files add authored alignment to every manufacturer representation:
source units (including fit-to-native-unit for drawings), insertion origin, scale
multiplier, three-axis rotation, and project-inch X/Y/Z offsets. A representation
can remain a reference or be marked preferred for its declared plan, elevation,
3D, or thumbnail purpose. Only one asset can be preferred for each purpose on a
Type. Version-40 projects and version-2 Product Packages upgrade conservatively as
reference-only assets with format-aware defaults. Product Package version 3 carries
the new fields. Native components always remain available and continue to control
the rough opening, Wall cut, header, framing, schedules, and fallback display.

Preferred validated assets stored in the project bucket now participate in the
model views. SVG plan symbols are used in Top/Bottom views, SVG elevation symbols
in orthographic side views, and GLB models in perspective views. They inherit the
placed opening's unit location, host-Wall orientation, Story elevation, source-unit
conversion, insertion origin, scale, rotation, and offsets. The renderer does not
load unvalidated external catalog references. Native components are hidden only
after the matching representation loads successfully; load errors, missing files,
unsupported formats, or view mismatches automatically preserve the native display.
Wall cuts, finish returns, framing, dimensions, schedules, and selection remain
driven by the native parametric opening in every case.

The Door & Window Type Manager renders a live exterior-elevation preview from the
same host-aware component solids used by placed openings. It shows the structural
rough-opening boundary, unit boundary, generated component geometry, rough and unit
dimensions, bottom-of-header elevation, component count, and current source. Because
the preview uses the model geometry rather than a separate illustration, edits to
panels, sashes, glazing, grilles, profiles, insets, and dimensions remain synchronized.

## Manufacturer Catalog and General Object Import Direction

Manufacturer content should enter Model Builder through a versioned product package,
not as an unidentified mesh or drawing. The preferred first package combines:

- an immutable source record with manufacturer, product line, model number, source
  URL or file name, source format, revision, and verification date;
- SVG front/plan/section views for scalable 2D representation;
- a GLB model for compact web-ready 3D representation;
- explicit unit, rough-opening, header, host, material, and scheduling metadata; and
- optional editable Model Builder components when the imported product maps cleanly
  to the native parametric assembly model.

DWG, DXF, RFA, IFC, and SKP require format-specific adapters or a reviewed conversion
step. Importing one of these proprietary files must not silently discard assemblies,
materials, units, nested components, or product metadata. The original manufacturer
source remains attached for provenance even when converted geometry is used in the
model.

The general Object importer should share the same asset registry, unit normalization,
layer assignment, source tracking, validation, and thumbnail pipeline. Hosted Doors
and Windows remain architectural products with rough-opening and framing behavior;
ordinary imported Objects remain placed assets and do not acquire Wall-hosting rules
merely because their source geometry resembles an opening.

Nonzero exterior and interior return depths generate finish solids inside each
linked rough opening. Each side receives left and right jambs plus a head; Window
returns also receive a sill. The outermost Wall layer supplies exterior-return
material and thickness, while the innermost layer supplies interior returns. On
a Wall thinner than the combined requested depths, both sides are proportionally
limited so they meet without overlapping. The structural rough opening remains
the authoritative void for later framing and unit placement.

## Wall Framing Defaults

Wall framing is generated from each Wall's Main layer, so the structural layer
defines member depth and the host Wall continues to own placement and layer
visibility. Project defaults control stud spacing and width, plate height and
counts, framing material, header depth, and whether the framing reveal is shown
in 3D. Junction defaults add a selectable two- or three-stud corner method and
none, three-stud, or ladder-blocking partition backing. These defaults are stored
in version-32 project files; earlier files open with conservative editable defaults.

Common studs and continuous top plates are laid out along the Wall. Door and
Window rough-opening edges generate king and jack studs plus a header whose
bottom is the saved bottom-of-header elevation. Windows also generate a rough
sill, lower cripples, and upper cripples; Door bottom plates stop at the rough
opening while Window bottom plates remain continuous. The generated members are
derived geometry rather than separately editable drawing objects, preventing
them from drifting out of sync with the host Wall or opening.

The header depth is a user-editable project rule, not an engineered beam-size
calculation. Span tables, loads, species, grades, and built-up header
construction must be modeled separately before framing can be treated as a
structural design result.

Each Wall Type now classifies exterior/interior location and bearing/non-bearing
use and owns a compatible default header assembly. Header resolution is explicit:
a placed-opening override wins, followed by a Door/Window Type override, then the
host Wall Type default. New 2x6 exterior Walls use the three-ply lumber assembly
with an interior rigid-insulation filler; new non-bearing interior Walls use two
flat members matching the Main layer depth. Reusable assemblies include schedule
marks and an engineering-review flag. These fields and placed overrides are stored
in version-35 project files; version-34 and earlier files upgrade without changing
their prior fixed header behavior.

Resolved two-Wall corners begin with one end stud from each participating Wall.
The three-stud option adds one deterministic shared-corner member; the two-stud
advanced-framing option leaves the insulated corner open for a separate gypsum
backer or clip system. At a resolved T-intersection, the host Wall can receive
three-stud backing or horizontal ladder blocks at the configured vertical
spacing. Unresolved or manually disconnected joins do not receive inferred
junction framing.

## Next Steps

1. Generalize the Product Library registry for ordinary placed Objects, including unit
   normalization, independent layer assignment, thumbnails, and update tracking.
2. Add asset removal and orphan cleanup without deleting representations still referenced
   by another project or catalog record.
3. Add manual per-junction framing overrides without making unsafe engineering assumptions.
4. Generate a header schedule from saved marks, resolved assemblies, and engineering flags.
5. Add reusable assembly presets for framed floors, slabs, and ceiling finishes.
6. Add manual per-edge platform overrides for exceptional support details.
7. Add split-level, vaulted-ceiling, and manual wall-height exceptions
   only after the default dependency chain is stable.
