# Residential Alpha Test Checklist

Last updated: September 4, 2026

Use one project for the complete test. Save after each numbered section so a failure is easier to isolate.

## 1. Start and save the project

1. Open the Dashboard and choose **New Plan**.
2. Choose **Basement + First Floor** if the test house has a basement; the Basement should be a separate Story with a concrete slab preset.
3. Enter the project name and basic project information.
4. Review the active Foundation Wall, exterior/interior Wall, Roof, Door, and Window defaults.
5. Create the project. The model should open blank in **Top** view.
6. Choose **Save As** and download the portable `.mbproj` file. Continue using **Save** during testing.

Expected: the Dashboard lists a recent convenience copy, while the downloaded `.mbproj` remains the durable project file.

## 2. Draw and edit the first floor

1. Confirm **First Floor** is active in the Plan View toolbar.
2. Choose **Walls** and draw four connected exterior Walls.
3. Select each Wall and confirm its Wall Type, Wall Use, total thickness, Main reference, Story, and exterior side.
4. Edit a temporary Wall dimension. Horizontal and vertical values should measure between exterior faces of the Main layers; vertical input should read parallel to the dimension line.
5. Use **Rooms** to detect the enclosed room.
6. Change the Room Type from its label or Room Manager, then change the Room ceiling height to create a Room override.

Expected: Wall geometry remains connected, the Room remains detected, and changing a Room height does not rewrite the Story default.

## 3. Add openings

1. Select a Wall.
2. Use **Add Door** and verify the rough opening cuts every Wall layer.
3. Select a different Wall and use **Add Window**.
4. In the selected Wall properties, change the opening position, Type, unit/rough size, and Window header-bottom height where useful.
5. Switch to Perspective to inspect the component-based 3D Door and Window geometry and framing.

Expected: openings remain hosted to their Walls, respect clear Wall length and Story height, and keep their Type-driven components after save/reopen.

## 4. Test floors and references

1. Return to **Top** view.
2. Use the down/up arrows to switch between Basement and First Floor.
3. Open **Floor / Reference Display** from the Plan View toolbar, View menu, or Tools menu.
4. Turn the reference on and test **Automatic**, **Floor Below**, **Floor Above**, and **Specific Floor** where available.
5. Leave fills off, then turn fills/details on to compare.
6. Choose the **Reference Display** Layer Set. Copy it, rename it `Wall Alignment`, hide unwanted layers, and select it as the reference Layer Set.
7. Try to select reference geometry.
8. Save the current Plan View, switch to another view, then return to it.

Expected: reference objects align visually but cannot be selected or changed. Reference-layer visibility does not alter the current floor. The chosen reference settings return with the Saved Plan View.

## 5. Foundation, floor, and roof checks

1. On the Basement Story, draw Foundation Walls or assign Foundation support to framed Walls as appropriate for the test.
2. Confirm foundation sill ownership and plate count for the selected condition.
3. Verify the generated Room floor platform stops at the intended supporting edge.
4. On the top occupied Story, select an exterior Wall and create a manual **Roof Plane**.
5. Review pitch, Top of Plate, Height Above Plate/heel, peak, fascia, subfascia, bearing, and birdsmouth values.
6. Create and join a second compatible Roof Plane if the simple test form allows it.

Expected: calculated roof elevations remain internally consistent and the 3D roof assembly follows the structural Roof Plane. Automatic roof generation is not included yet.

## 6. Layers, appearance, and views

1. Copy the Working Plan Layer Set and rename it.
2. Turn **Fills** off and confirm linework remains.
3. Hide and show several object layers.
4. Give one object a fill override, then restore **By Layer**.
5. Save a Plan View with the chosen Story, Layer Set, scale, view direction, and reference settings.

Expected: Layer Set changes are reusable; object overrides affect only that object; Saved Plan Views restore their complete display context.

## 7. Close and reopen

1. Save and close or refresh the browser.
2. Reopen the project from Recent Projects.
3. Also test **Open Project** with the downloaded `.mbproj` file.
4. Confirm Stories, Walls, Rooms, openings, roof geometry, Layer Sets, Saved Plan Views, and Floor Reference settings.
5. Make one edit, refresh without saving, and confirm local recovery offers the latest recoverable work.

Expected: both the recent convenience copy and portable file open without model loss; recovery is a safety net, not a replacement for Save.

## Record problems

For each issue, record:

- the section and step above;
- what you expected and what happened;
- whether the project still opens after refresh;
- the active Story, Plan View, and Layer Set;
- a screenshot if the problem is visual;
- the `.mbproj` file if the problem survives save/reopen.

Stop using a test file if it cannot reopen. Keep the downloaded file and screenshot so the failure can be reproduced without rebuilding the project from memory.

