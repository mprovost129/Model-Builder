# Wall Assembly Editor Milestone

This is the implementation control point for wall design in Slater Woods Omni Design. It follows the completed Room, Layer, and View foundation and keeps wall construction data separate from placed-wall geometry.

## Stable decisions

- A Wall Type is a reusable ordered assembly: **Exterior Layers → Main Layers → Interior Layers**.
- Each layer owns a stable identifier, name, material, role, thickness, automatic-join participation, and optional open-end wrap participation.
- The three assembly sections own layer grouping. Each section has its own add control, and rows can only be reordered within their section.
- The Main group is the structural core used by wall reference lines, opening-header fit, joining, bearing behavior, future framing, and platform support.
- Wall center, Exterior of Main, Center of Main, and Interior of Main are geometric reference lines. Their distances are calculated from the exterior face and update whenever layer thickness changes.
- A placed Wall retains its own Wall Type assignment, exterior side, reference line, join priority, and endpoint cleanup modes. Editing a Type does not silently reassign other Walls to that Type.
- The Wall Type Manager preview is a plan section of the saved assembly, not decorative artwork. It uses the same exterior-face distances as model geometry.
- Selecting a layer in either the table or preview selects the same stable layer. Thickness can be edited from the preview and immediately updates totals, groups, and reference-line positions.
- Layer thickness remains dimensionally exact even when a very thin or zero-thickness layer receives a minimum visible selection target in the editor.
- Joined layer footprints retain exact construction geometry while plan-only seam edges are suppressed at resolved automatic corners and T-junctions.

## Acceptance criteria

- [x] The Wall Type Manager shows the complete assembly from exterior to interior.
- [x] Layer bands update live when layer order, group, role, or thickness changes.
- [x] Exterior, Main, and Interior group totals are visible.
- [x] Each group has one local add control; redundant group selectors and bottom add buttons are removed.
- [x] Wall center and all three Main reference lines are visible with exact exterior-face offsets.
- [x] Clicking or keyboard-selecting a preview layer selects its spreadsheet row.
- [x] Focusing a spreadsheet row selects the corresponding preview layer.
- [x] The selected layer thickness is editable directly beside the plan-section diagram.
- [x] The preview works in both the light and dark interface themes.
- [x] The active Wall Type can be changed from Project Setup and while the Wall tool is active.
- [x] Ortho and polar tracking remain active while resizing a Wall by an endpoint grip.
- [x] A 2x4 interior Wall automatically trims to a 2x6 exterior Wall Main face without a plan seam across the joined end.
- [x] Replace free-text assembly materials with the initial role-filtered catalog.
- [x] Add an editable temporary Wall length dimension with explicit fixed-Start and fixed-End behavior.
- [x] Show and edit the nearest dimension to an overlapping parallel Wall, using each Wall's Main-layer exterior face and keeping automatic corners connected.
- [ ] Add user-defined materials, rendered material patterns/textures, and the full Material Manager.
- [ ] Add wall-cap and layer-return rules around hosted openings.
- [ ] Add framing-aware intersections and the remaining garage/mudsill platform edge conditions.

## Next sequence

1. Validate wall Types and the initial material catalog against real small-plan drawing workflows.
2. Validate selected-Wall length and editable Main-layer exterior temporary dimensions around joins and hosted openings.
3. Extend clear dimensions to selected Door and Window edges, then define safe editable-clearance behavior.
4. Add wall-cap and opening-return editing without coupling finish geometry to rough framing.
5. Add framing-aware intersections and platform edge exceptions.
6. Continue manufacturer-component import after wall-host behavior is stable.

Last reviewed: 2026-09-03
