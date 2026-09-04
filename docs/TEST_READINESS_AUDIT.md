# Alpha Test Readiness Audit

Last reviewed: September 4, 2026

## Decision

Slater Woods Omni Design is ready for a focused residential-modeling alpha test covering project setup, Stories, layered Walls, Rooms, floor platforms, hosted Doors and Windows, manual Roof Planes, Layer Sets, Saved Plan Views, floor references, and save/reopen behavior.

It is **not** ready to replace a complete Revit or Chief Architect construction-document workflow. Automatic roofs, stairs, full dimensions/annotation, schedules, layouts, printing, and automatic material takeoff remain product work rather than hidden or implied capabilities.

## Product comparison used for the audit

- [Autodesk Revit View Properties](https://help.autodesk.com/cloudhelp/2025/ENU/Revit-DocumentPresent/files/GUID-8BEBCEF0-CE2C-4635-8C7C-9D03503C0B79.htm) — associated Levels, underlay range/orientation, view scale, detail level, visibility/graphics, and view templates.
- [Autodesk Revit Room Boundaries](https://help.autodesk.com/cloudhelp/2025/ENU/Revit-ArchDesign/files/GUID-C7338362-6D35-471B-90B0-6A893534FFE2.htm) — room-bounding elements and separation lines.
- [Autodesk Revit Room Properties](https://help.autodesk.com/cloudhelp/2025/ENU/Revit-ArchDesign/files/GUID-21326970-0037-41C6-A996-980C24EE019F.htm) — room levels, upper limits, offsets, computed area, and finishes.
- [Autodesk Revit Roof Boundary Properties](https://help.autodesk.com/cloudhelp/2025/ENU/Revit-ArchDesign/files/GUID-682B3B19-A4F7-4EE7-B994-F3EA3154BB08.htm) — slope-defining edges, overhang, wall-core extension, and plate offsets.
- [Chief Architect: Creating and Using Plan Templates](https://www.chiefarchitect.com/support/article/KB-00463/creating-and-using-plan-templates.html) — critical defaults before drawing: floor/ceiling structure and heights, framing, Wall Types, and dimension defaults.
- [Chief Architect: Understanding Saved Plan Views](https://www.chiefarchitect.com/support/article/KB-03185/understanding-saved-plan-views.html) — view-specific floor, Layer Set, defaults, and Reference Display properties.
- [Chief Architect: Using the Reference Display](https://www.chiefarchitect.com/support/article/KB-00475/using-the-reference-display.html) — non-editable floor overlays, automatic/below/above/specific floor choice, independent Layer Set, and optional details/fills.
- [Chief Architect: Understanding Layer Sets](https://www.chiefarchitect.com/support/article/KB-00765/understanding-layer-sets.html) — reusable display configurations linked to Saved Plan Views.
- [Chief Architect: Automatic Hip and Gable Roofs](https://www.chiefarchitect.com/support/article/KB-00758/generating-automatic-hip-and-gable-roofs.html) — exterior-wall-driven automatic roof behavior and per-Wall gable decisions.

## Audited workflow

| Area | Current alpha capability | Status for the planned test | Important remaining gap |
| --- | --- | --- | --- |
| Startup and files | Dashboard, New Plan, Open, Save, Save As, recent-project convenience copy, local recovery, portable `.mbproj` | Ready | Named reusable project templates and cloud/project-folder persistence |
| Project setup | Project information, Story presets, floor/ceiling assemblies, concrete slab preset, active Foundation/Wall/Roof/Door/Window defaults | Ready | Location/north, jurisdiction/code criteria, project notes, stronger condition warnings |
| Stories and levels | Ordered Stories, calculated elevations, Basement as a true Story, floor arrows, Building browser | Ready | Copy/derive a complete floor, level datum graphics, reflected ceiling plans |
| Floor reference | On/off toggle; automatic, below, above, or specific Story; independent Reference Display Layer Set; optional fills; saved per Plan View; non-editable overlay | Ready | Multiple simultaneous references, X/Y/Z/angle offsets, cross-project references, XOR overlap mode |
| Walls | Layered Exterior/Main/Interior assemblies, Wall use defaults, Main-reference placement, corner/T cleanup, editable temporary dimensions | Ready | Curved Walls, stacked/variable walls, advanced cleanup overrides, wall profiles |
| Foundation | Concrete Wall Types, footing and sill geometry, condition-based plate ownership, Wall support links | Ready for simple test | Automatic foundation generation, piers/posts/beams, stepped footings, detailed garage/walk-out rules |
| Rooms and floors | Closed-Wall detection, Room identity, labels, area/size/ceiling annotations, Room overrides, floor platforms and openings | Ready for enclosed rooms | Room separation lines, more room-bounding object types, manual boundary repair, open-to-below automation |
| Doors and Windows | Reusable 3D component Types, rough openings, header rules, finish returns, selected-Wall Add Door/Add Window actions, Product Library | Ready | Cursor placement along the Wall, handedness/swing controls, schedules, broader manufacturer import adapters |
| Roofs | Heel/height-above-plate defaults, pitch, birdsmouth and fascia references, manual Roof Plane from selected Wall, plane joins, initial framing/takeoff geometry | Ready for a simple manual roof | Automatic roof generation, gable/hip Wall rules, dormers, holes, valleys beyond current join cases, full truss assemblies |
| Layers and views | Object layers, per-object fill override, Layer Sets, fill master, Saved Plan Views, Story switching, reference Layer Set | Ready | View templates/default sets, filters, discipline/detail-level controls, import/export of view standards |
| Drafting | Precision feet-inch input, Lines/Polylines/Rectangles/Circles/Arcs, snaps, core modify tools | Ready for supporting geometry | Text, leaders, permanent associative dimensions, hatches, blocks, constraints, DWG/DXF |
| Documentation | Room annotations only; layout tab is clearly marked planned | Not ready | Sheets, viewports, title blocks, schedules, sections/elevations, plotting/PDF |
| Materials and quantities | Layered assembly material names and roof/wall framing geometry provide a data foundation | Not ready for estimating | Managed material catalog, waste rules, openings deductions, schedules, verified lumber/roofing takeoffs |

## Changes made from this audit

- Floor / Reference Display is stored with each Saved Plan View.
- The active floor remains the only editable floor in Top view; reference entities are display-only.
- Reference source supports Automatic, Floor Below, Floor Above, and Specific Floor.
- A separate default `Reference Display` Layer Set is included in new plans and added when older project files migrate.
- Reference fills/details default off for clear alignment linework and can be enabled per Saved Plan View.
- Reference controls are available in the Plan View toolbar, View menu, Tools menu, and status bar.
- Direct Add Door and Add Window actions are available after a Wall is selected.
- Project format version 52 preserves the settings and upgrades older files without discarding the model.

## Honest test boundary

Use this build to judge whether the core model feels coherent: defaults flow into Rooms, Wall Types generate the expected depth and height, openings stay hosted, Stories align, reference floors are useful, roofs respond to the intended bearing model, and projects reliably reopen.

Do not use the current build to judge final drawing production, automated code compliance, structural sizing, polished manufacturer content, or estimating accuracy. Those systems are intentionally incomplete.

## Recommended sequence after user testing

1. Fix any data-loss, open/save, Story-navigation, Wall-editing, or hosted-opening failures first.
2. Add cursor-based Door/Window placement and handing/swing editing.
3. Add Room separation lines and clearer boundary diagnostics.
4. Implement a controlled automatic-roof prototype driven by exterior Walls and per-Wall hip/gable settings.
5. Begin permanent associative dimensions and annotation styles before sheets and layouts.
6. Add project templates once the tested defaults stabilize; templates created too early would preserve changing assumptions.

