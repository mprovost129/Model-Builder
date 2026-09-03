# Fill and Object Appearance Milestone

## Purpose

Slater Woods Omni Design separates linework from infill so the same model can support both working plans and clean marketing plans. The attached Sharland Residence sheets and linework-only floor plans establish the initial visual direction: dark wall edges, blue-gray room text, magenta opening graphics, teal fixtures, pale tan casework and stairs, and red dimensions.

## Display hierarchy

1. The active Layer Set owns the master **Show Fills** setting. When it is off, every model fill is suppressed and linework remains visible.
2. Each Layer owns its normal line color, line style, line weight, print color, fill color, and fill visibility.
3. Each object normally uses **By Layer**. Editing that object's fill color or fill visibility creates an object override and clears By Layer.
4. The Layer Set master remains authoritative: an object override cannot force a fill to appear while the active Layer Set is in linework-only mode.

This order prevents marketing-plan views from requiring destructive color changes and keeps saved Layer Sets predictable.

## Implemented workflow

- Use **Fills On / Linework Only** beside the Layer Set selector, or **FILLS** in the status bar.
- Open Model Explorer → Layers to edit independent line and fill properties.
- Select a Wall, Foundation Wall, floor platform, closed Polyline, or object to review **Appearance** in Properties.
- Change an object fill to create an override; choose **Use Layer** to remove it.
- Copy a Layer Set before building a dedicated Marketing Plan configuration. Fill state is saved with the Layer Set and therefore follows Saved Plan Views that reference it.

## Forward contract

Rooms, room labels, Doors, Windows, imported manufacturer components, fixtures, cabinets, stairs, roofs, dimensions, and future object families all retain a parent Layer assignment. Objects that render a fill use the same By Layer override record. Line-only annotations keep their parent line controls; future masks or solid backgrounds will use the same fill hierarchy without adding a second exception system.

