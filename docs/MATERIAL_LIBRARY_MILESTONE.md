# Material Library Milestone

This control point starts the shared material system for Slater Woods Omni Design without changing the current project-file format or invalidating existing work.

## Stable decisions

- Floor, ceiling, and Wall assembly rows choose materials from a controlled architectural catalog instead of accepting unrestricted new text.
- Choices are filtered by the layer role so, for example, concrete is available for structural layers and insulation products are available for insulation layers.
- Existing project materials that are not yet in the program catalog remain visible and unchanged until the user deliberately replaces them.
- Each catalog material has one display name plus initial plan color, plan pattern, 3D color, roughness, metalness, and a reserved texture-asset reference.
- Assembly layers continue storing material names during this compatibility milestone. Stable material identifiers and user-created project libraries will be introduced with a deliberate project-file migration, not as an incidental interface edit.
- Materials describe construction and appearance. Assembly roles continue to describe what the layer does.

## Acceptance criteria

- [x] Floor and ceiling assembly material fields are grouped library selectors.
- [x] Wall assembly material fields use the same catalog and preserve the Exterior/Main/Interior workflow.
- [x] Material choices are filtered by assembly role.
- [x] Legacy or user-entered material names remain selectable as the current project material.
- [x] New Wall layers receive useful group-aware defaults instead of a `New Material` placeholder.
- [x] The catalog carries plan-display properties and a safe future 3D texture slot.
- [ ] Add the Material Manager for user-created, duplicated, renamed, and imported project materials.
- [ ] Migrate assembly references from display names to stable material identifiers.
- [ ] Connect plan patterns to the fill renderer and validated texture assets to the 3D renderer.
- [ ] Extend the shared selector to foundations, framing, headers, and Door/Window components.

## Next sequence

1. Test the initial catalog against a real project and record missing material families.
2. Add temporary editable Wall dimensions for placement and selected-wall adjustment.
3. Build the project Material Manager and stable-ID file migration after the editing workflow is proven.

Last reviewed: 2026-09-03
