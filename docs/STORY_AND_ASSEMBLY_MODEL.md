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
Finish, Sheathing/Subfloor, Framing, Substrate, Membrane, and Air Gap.

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

## Current Implementation

- Version-17 project files store the Building Datum, ordered Stories, active and
  anchored Story identities, all floor and wall assembly layers, entity Story
  ownership, floor-platform footprints, Wall type assignments, and the
  Exterior/Main/Interior group of every wall layer.
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
  snaps, and chained-segment workflow as Line. A Wall's centerline stays
  grip-editable while its base and height follow its assigned Story rough floor
  and rough ceiling.
- Manage > Wall Types edits reusable exterior-to-interior layered assemblies in
  three explicit groups. Group totals are calculated independently, layer order
  is constrained within each group, and the last Main layer cannot be removed.
  Existing Walls retain an assigned type; new Walls use the active type.
- Version-15 and version-16 wall types are upgraded automatically. Framing
  layers become Main; surrounding layers are classified Exterior or Interior.
  If an older wall has no framing role, its thickest layer becomes Main.

## Next Steps

1. Add reusable assembly presets for framed floors, slabs, and ceiling finishes.
2. Add openings/holes and per-room platform overrides to floor footprints.
3. Add wall direction and selectable reference-line control against the Main
   group, followed by automatic corner cleanup, joins, and openings.
4. Detect Rooms from wall boundaries and let Rooms inherit or override Story
   floor, ceiling, and assembly defaults.
5. Add split-level, open-below, vaulted-ceiling, and manual wall-height exceptions
   only after the default dependency chain is stable.
