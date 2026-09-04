# Project Setup Milestone

Status updated: September 4, 2026

This file is the implementation record for project setup in Slater Woods Omni Design. It separates working features from planned work so the interface and roadmap do not imply capabilities that are not yet present.

## Product direction

Project setup uses two levels:

1. **New Project Quick Setup / Project Setup Center** handles the decisions needed before drawing.
2. **Advanced managers** handle detailed Story assemblies, Foundation Wall types, Wall types, openings, Rooms, framing, and layers.

Stories remain the source of project floor, ceiling, and height defaults. Rooms inherit those settings and may override them locally. This avoids duplicate or conflicting height systems.

## Completed

- [x] Dashboard-first startup with New Plan, Open Project, and Recent Projects.
- [x] Blank model space and Top plan view for new projects.
- [x] New Project Quick Setup opens before a new project is created.
- [x] Project Setup Center is available from Manage and the Properties panel.
- [x] Project name, project number, client, address, and project type are saved in `.mbproj` files and local recovery data.
- [x] Existing version-45 and earlier project files migrate with blank project information.
- [x] US Architectural input is identified honestly as the currently supported measurement format.
- [x] Starting configurations for One Story, Basement + First Floor, and Two Stories + Basement.
- [x] Basement configuration creates a separate Basement Story with a concrete slab assembly.
- [x] Story table shows type, calculated rough-floor elevation, and ceiling / plate height.
- [x] Quick editing for Story name, type, ceiling / plate height, and floor-structure preset.
- [x] Active Foundation Wall, Wall, Door, and Window types can be selected before drawing.
- [x] Active layered Roof Type, framing method and spacing, pitch, Height Above Plate / heel, and overhang can be established before drawing.
- [x] Project Setup derives Top of Plate from the highest Story and previews the calculated exterior heel.
- [x] Separate project defaults for Exterior Wall, Interior Bearing Wall, and Interior Partition types.
- [x] Wall drawing Properties includes a Wall Use selector that recalls the assigned default Type for each use.
- [x] New and version-46-or-earlier projects receive a valid Interior Bearing Wall type when one is missing.
- [x] Wall Types assigned as project defaults are protected from accidental deletion or reclassification until another default is chosen.
- [x] Review checklist summarizes the model-driving setup before project creation.
- [x] Detailed Story assembly cards are collapsible and calculated values are visually separated from editable inputs.
- [x] Dedicated advanced Story, Foundation, Wall, Roof, Door/Window, Framing, Room, and Layer tools remain available.
- [x] Story floor/ceiling defaults and Room-level overrides use the same underlying model.
- [x] Plan View selection restores its assigned Story and Layer Set; floor up/down controls navigate the ordered Story stack.

## Next setup work

- [ ] Project template files that users can save, name, duplicate, and choose from the dashboard.
- [ ] Metric and additional display precision support. Internal geometry should remain unit-neutral during this work.
- [ ] Geographic/location data, orientation, project north / true north, and climate information.
- [ ] Code edition, design criteria, jurisdiction, and project notes.
- [ ] Default layer set, saved plan view, and annotation scale choices in Quick Setup.
- [ ] Validation warnings for incompatible Story/Foundation conditions rather than only structural validity.
- [ ] Foundation presets for crawlspace, slab-on-grade, dropped garage walls, and walk-out conditions in the starting-configuration gallery.
- [ ] Setup summary printable/exportable as project standards documentation.
- [ ] User-defined named assembly roles and controlled role libraries. Concrete slab already exists as a floor-structure preset; role creation needs a deliberate schema rather than a free-text field.

## Related completed systems

- `STORY_AND_ASSEMBLY_MODEL.md` — Story stacking, floor/ceiling assemblies, and Room overrides.
- `WALL_ASSEMBLY_EDITOR_MILESTONE.md` — Exterior, Main, and Interior Wall layers.
- `ROOM_LAYER_VIEW_MILESTONE.md` — Room labels, layer controls, and saved plan views.
- `FILL_AND_OBJECT_APPEARANCE_MILESTONE.md` — Layer-controlled fills and object overrides.
- `TEMPORARY_WALL_DIMENSIONS_MILESTONE.md` — editable Wall-to-Wall temporary dimensions.
- `ROOF_SYSTEM_MILESTONE.md` — heel-driven roof references, completed defaults, and the manual/automatic Roof Plane sequence.

## Acceptance checks

- [x] A user can start a project without first navigating multiple advanced dialogs.
- [x] A user can model a basement as a true Story and assign its concrete slab during setup.
- [x] A saved and reopened project retains project information and building setup.
- [x] Older project files continue to open.
- [x] Quick Setup does not hide or replace the detailed assembly editors.
- [x] Wall-default behavior shown in Quick Setup and Drawing Properties is backed by saved project data.
- [x] Unsupported measurement formats remain labeled as planned rather than presented as working.
