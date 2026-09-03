# Roof System Milestone

Status updated: September 3, 2026

This file is the implementation record for Roof design in Slater Woods Omni Design. It separates the working height-reference foundation, the first manual Roof Plane workflow, and future automatic roof generation.

## Governing geometry

- The bearing Story supplies **Top of Plate / Top of Wall**.
- **Height Above Plate / Heel Height** is measured vertically at the exterior face of the bearing wall or plate.
- A conventionally framed rafter's underside bearing reference begins at the wall or plate. It is not silently merged with the exterior heel reference.
- Roof pitch is stored as rise per 12 inches of horizontal run.
- Peak elevation is calculated from the exterior heel, pitch, and the Roof Plane's horizontal run. It is a result, not an independent project default.
- Fascia and subfascia elevations are calculated from the heel, pitch, overhang, and their separate board depths.
- Roof sheathing and roofing will be modeled above the structural Roof Plane when layered Roof Types are implemented.
- Trussed roofs use the same plate, heel, pitch, peak, and fascia reference system.

## Completed foundation

- [x] Project-level roof settings saved in `.mbproj` files.
- [x] Version-47 and older projects migrate to safe default roof settings.
- [x] Editable framing method, pitch, Height Above Plate, horizontal overhang, rafter/truss member size, birdsmouth seat and limit, fascia size, and subfascia size.
- [x] Top of Plate is derived from the highest configured Story rather than duplicated as a roof input.
- [x] Live calculations for exterior heel, peak at a preview run, fascia top/bottom, subfascia top/bottom, roof angle, and maximum birdsmouth notch depth.
- [x] Roof defaults available in Project Setup, the Manage ribbon, and the Tools menu.
- [x] Diagram labels distinguish Top of Plate, underside bearing, and exterior heel.
- [x] Calculation and project-file migration tests.

## Next: manual Roof Planes

- [x] Native saved Roof Plane object created from a selected framed Wall and assigned to a standard `Roofs, Planes` layer.
- [x] Initial four-corner plane footprint generated from the exterior face of the Wall Main layer, horizontal overhang, and inward horizontal run.
- [x] Bearing Wall identity and Story retained; removing or changing the source Wall safely detaches the manual plane instead of deleting it.
- [x] Plan graphics show the footprint, bearing line, and uphill pitch direction; perspective/elevation views show the calculated sloped surface.
- [x] Per-plane pitch, Height Above Plate, horizontal run, and overhang are editable in Properties.
- [x] Eave/bearing span is editable numerically or with constrained eave grips; paired high-edge grips edit horizontal run without skewing the plane.
- [x] Live Top of Plate, heel, high-edge/peak, and fascia-top elevations use the actual plane run.
- [x] Version-49 project files preserve manual Roof Planes and their per-plane defaults.
- [ ] Arbitrary polygon-boundary editing for hips, valleys, rakes, and clipped Roof Planes while preserving a valid bearing reference.
- [ ] Roof Plane input methods based on Height Above Plate, fascia height, or an existing plane's matched fascia.
- [ ] Complete per-plane overrides for rafter/truss size, fascia, subfascia, and birdsmouth inputs; pitch, heel, run, and overhang are complete.
- [ ] Live editable dimensions in plan and section/elevation views.
- [ ] Complete exact ridge/eave/fascia/subfascia component solids; the current structural surface and reference elevations are calculated.
- [ ] Birdsmouth solid generated from the hosted Wall plate, member geometry, seat length, and maximum-notch validation rule.
- [ ] Layered Roof Types for sheathing, underlayment, roofing, insulation, and finish components above/below the structural plane.
- [ ] Hip, valley, ridge, rake, and roof-opening joins with explicit cleanup rules.

## Later: automatic roof generation

- [ ] Generate candidate roof planes from a closed exterior Wall footprint and Wall-level roof directives.
- [ ] Per-Wall directives for hip, gable, shed, pitch, overhang, baseline offset, and bearing condition.
- [ ] Resolve ridges, hips, valleys, and fascia alignment without changing the editable Wall footprint.
- [ ] Preview generation as a reversible proposal before committing model geometry.
- [ ] Rebuild generated roofs when driving Walls or defaults change, while preserving explicitly detached manual planes.
- [ ] Report unresolved or structurally ambiguous conditions instead of guessing.

## Guardrails

- Birdsmouth limits and member sizes are project modeling inputs, not structural engineering approval.
- Automatic generation must never silently alter manually detached Roof Planes.
- Calculated elevations remain derived values; editing one must change an identified driver such as pitch, heel, overhang, or run.
- A Wall-created Roof Plane starts with a 12-foot inward run as an explicit editable starting value; it is not an automatic roof proposal.
