# Wall Assembly Editor Milestone

This is the implementation control point for wall design in Slater Woods Omni Design. It follows the completed Room, Layer, and View foundation and keeps wall construction data separate from placed-wall geometry.

## Stable decisions

- A Wall Type is a reusable ordered assembly: **Exterior Layers → Main Layers → Interior Layers**.
- Each layer owns a stable identifier, name, material, role, thickness, automatic-join participation, and optional open-end wrap participation.
- The Main group is the structural core used by wall reference lines, opening-header fit, joining, bearing behavior, future framing, and platform support.
- Wall center, Exterior of Main, Center of Main, and Interior of Main are geometric reference lines. Their distances are calculated from the exterior face and update whenever layer thickness changes.
- A placed Wall retains its own Wall Type assignment, exterior side, reference line, join priority, and endpoint cleanup modes. Editing a Type does not silently reassign other Walls to that Type.
- The Wall Type Manager preview is a plan section of the saved assembly, not decorative artwork. It uses the same exterior-face distances as model geometry.
- Selecting a layer in either the table or preview selects the same stable layer. Thickness can be edited from the preview and immediately updates totals, groups, and reference-line positions.
- Layer thickness remains dimensionally exact even when a very thin or zero-thickness layer receives a minimum visible selection target in the editor.

## Acceptance criteria

- [x] The Wall Type Manager shows the complete assembly from exterior to interior.
- [x] Layer bands update live when layer order, group, role, or thickness changes.
- [x] Exterior, Main, and Interior group totals are visible.
- [x] Wall center and all three Main reference lines are visible with exact exterior-face offsets.
- [x] Clicking or keyboard-selecting a preview layer selects its spreadsheet row.
- [x] Focusing a spreadsheet row selects the corresponding preview layer.
- [x] The selected layer thickness is editable directly beside the plan-section diagram.
- [x] The preview works in both the light and dark interface themes.
- [ ] Add material pattern/texture choices and a material manager.
- [ ] Add wall-cap and layer-return rules around hosted openings.
- [ ] Add framing-aware intersections and the remaining garage/mudsill platform edge conditions.

## Next sequence

1. Validate wall Types against real small-plan drawing workflows.
2. Add wall-cap and opening-return editing without coupling finish geometry to rough framing.
3. Add framing-aware intersections and platform edge exceptions.
4. Continue manufacturer-component import after wall-host behavior is stable.

Last reviewed: 2026-09-03
