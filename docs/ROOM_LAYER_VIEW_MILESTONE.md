# Room, Layer, and View Foundation

This document is the implementation control point for the next Slater Woods Omni Design milestone. It records the decisions that must remain stable while walls, floors, rooms, doors, windows, and later framing become more detailed.

## Why this milestone comes now

The building model already supports Story defaults, Room overrides, layered wall assemblies, foundation walls and sill plates, generated floor and ceiling platforms, wall openings, header assemblies, and reusable door and window product definitions. Before adding more object families, the program needs a durable display and annotation foundation so later objects do not require a second layer-system migration.

## Architecture decisions

- Every model or annotation object has an immutable semantic category. A user may move the object to another layer, but changing its layer never changes what the object is.
- Layers are user-editable display containers. They control model/display color, print color, line style, line weight, visibility, and lock state.
- Standard layers provide initial assignments for Walls, Foundation Walls, Doors, Windows, Floor Platforms, Rooms, Room Labels, Room Areas, Room Interior Dimensions, and Room Ceiling Heights.
- A Room and its Room Label are separate linked objects. Each subordinate Room annotation is also separately layered.
- Room detection preserves Room identity and Room settings when its enclosing wall loop is unchanged. Linked annotations preserve their identities through the same update.
- New Rooms default to the `Unassigned` Room type.
- The rough ceiling-height annotation is two-way linked to the Room structure setting. Editing an inherited value creates a Room override; it never changes the Story default.
- Layer Sets save the display state of all layers. Saved Plan Views bind a Story, Layer Set, current layer, annotation scale, reference Story, and camera mode.
- Project files remain versioned and older files are upgraded on open.

## Acceptance criteria

- [x] New plans contain the standard layer catalog and a Working Plan Layer Set.
- [x] New Walls, Foundation Walls, Doors, Windows, Floor Platforms, Rooms, and Room annotations receive their standard layer assignments.
- [x] Layer Properties can edit color, print color, line style, line weight, visibility, and lock state.
- [x] Users can duplicate, rename, and activate Layer Sets.
- [x] Users can save and activate Plan Views without losing project data.
- [x] Detecting Rooms creates linked Room Label, area, interior-dimension, and rough-ceiling annotations.
- [x] A Room Label defaults to `Unassigned`, supports a quick Room-type change, and opens Room Manager on double-click.
- [x] Area, interior dimensions, and rough ceiling height can be independently hidden with layers or per-annotation visibility.
- [x] Editing the displayed rough ceiling height updates the Room override and its generated wall/platform heights.
- [x] Existing `.mbproj` files open through migration and resave in the current format.
- [x] Unit tests, rendered-output checks, and the production build pass.

## Verification record

- Project-file schema advanced to version 43 with migration coverage from version 42 and all earlier supported formats.
- Automated verification: 324 unit tests, production build, two rendered-page checks, and lint all pass.
- Visible workflow verification: blank top-view plan, Layer Set copy/rename, Saved Plan View creation, four connected Walls, Room detection, Room Manager, Room-type quick change, and linked ceiling-height editing.
- The environment does not support native browser prompts, so the new Layer Set and Saved Plan View naming actions use an accessible in-app dialog.

## Scope guard

Do not add more ordinary product-object families until this checklist is complete. Roofs, full framing takeoff, schedules, manufacturer catalog ingestion, and customizable interface colors remain later milestones. Door/window component geometry and header framing may continue only where needed to validate the layer and view architecture.

## Next sequence after this milestone

1. Complete wall design editing against the stable layer and Room system. See `WALL_ASSEMBLY_EDITOR_MILESTONE.md`.
2. Add framing-aware wall intersections, platform edge cases, and garage/mudsill conditions.
3. Expand manufacturer object import and reusable component libraries.
4. Add annotation/dimension style managers and construction-document views.

Last reviewed: 2026-09-02
