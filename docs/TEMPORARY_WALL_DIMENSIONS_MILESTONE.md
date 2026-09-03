# Temporary Wall Dimensions Milestone

This control point introduces the first editable on-canvas dimension in Slater Woods Omni Design. It is intentionally limited to one selected Wall so the resize rules can be proven before room-clear and chained exterior dimensions are added.

## Stable decisions

- Selecting an editable Wall in Top plan view displays a temporary dimension parallel to the Wall.
- The dimension value is an architectural input and resolves to the program's 1/16-inch modeling precision.
- Start and End are explicit fixed-end choices. The selected fixed endpoint does not move; the opposite endpoint moves along the Wall's existing direction.
- The Wall remains on its current Story and retains its Wall Type, reference line, exterior side, join rules, foundation support, layer, and hosted openings.
- The existing Wall validation path remains authoritative. A resize is rejected when the Wall is locked, its layer is locked, or the new length would invalidate a hosted Door or Window opening.
- Automatic Wall joins and Room detection continue to derive from the updated Wall endpoints.
- Temporary dimensions are editing aids. They are separate from future persistent dimension objects, annotation layers, and printed dimension chains.

## Acceptance criteria

- [x] A selected editable Wall shows a temporary plan dimension.
- [x] The live value uses architectural formatting and accepts architectural input.
- [x] Start or End can be selected as the endpoint that remains fixed.
- [x] Enter applies the new length; Escape restores the current value.
- [x] Invalid, locked, and opening-conflicting lengths are rejected without changing the project.
- [x] The temporary control follows pan, zoom, fit, and Wall geometry changes.
- [x] The control is available in both light and dark interface themes.
- [ ] Add temporary clear dimensions from a selected Wall or opening to nearby references.
- [ ] Add persistent dimension objects with styles, layers, witnesses, text placement, and print-scale behavior.
- [ ] Add chained exterior dimensions after object references and witness associations are stable.

## Next sequence

1. Test fixed-Start and fixed-End resizing on a small mixed 2x4/2x6 plan with Doors and Windows.
2. Define the reference-selection rules for temporary clear dimensions.
3. Design persistent dimension objects independently of the temporary editing control.

Last reviewed: 2026-09-03
