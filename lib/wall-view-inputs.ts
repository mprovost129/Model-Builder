/**
 * Deciding when a wall's 3D geometry has to be rebuilt.
 *
 * Pure data logic, deliberately kept out of the viewport module so it can be
 * tested without a WebGL context.
 */
import type {
  LayeredAssembly,
  WallFramingSettings,
  WallHeaderType,
  WallOpeningType,
} from "./building-stories.ts";
import type { LineObject, WallVerticalExtent } from "./document-model.ts";
import type { AutomaticWallJoinPlan, WallEndpoint } from "./wall-joins.ts";
import type { ViewTarget } from "./view-navigation.ts";

/**
 * The complete input set for one wall's geometry.
 *
 * Rebuilding a wall means re-triangulating every layer segment, every opening
 * component and, with framing revealed, every stud, plate and header. That is
 * the most expensive thing the viewport does, and it used to run for every wall
 * on every document change: moving one wall re-extruded every stud in the
 * building. Capturing the inputs lets a wall be skipped when nothing it depends
 * on moved.
 *
 * Neighbours are part of the input set because a join changes this wall's end
 * caps. They are read from the join plan rather than guessed, so a wall rebuilds
 * when the wall it joins to changes.
 */
export type WallViewInputs = {
  framing: WallFramingSettings;
  framingReveal: boolean;
  headerTypes: (WallHeaderType | undefined)[];
  join: Partial<Record<WallEndpoint, unknown>> | null;
  line: LineObject;
  neighbours: { line: LineObject | undefined; wallType: LayeredAssembly | undefined }[];
  occupied: WallEndpoint[];
  openingTypes: (WallOpeningType | undefined)[];
  passThroughCount: number;
  /**
   * The view the geometry was built for. Product representations resolve a
   * different asset per view (plan, elevation, 3D model), and framing is hidden
   * in Top, so a wall built for one view is not valid in another.
   */
  targetId: string;
  unresolvedCount: number;
  vertical: WallVerticalExtent;
  wallType: LayeredAssembly;
};

/** Collects the inputs for one wall so two builds can be compared. */
export function wallViewInputs(
  line: LineObject,
  vertical: WallVerticalExtent,
  wallType: LayeredAssembly,
  joinPlan: AutomaticWallJoinPlan,
  linesById: ReadonlyMap<string, LineObject>,
  wallTypesById: ReadonlyMap<string, LayeredAssembly>,
  openingTypesById: ReadonlyMap<string, WallOpeningType>,
  headerTypesById: ReadonlyMap<string, WallHeaderType>,
  framing: WallFramingSettings,
  target: ViewTarget,
): WallViewInputs {
  const join = joinPlan.endpointJoins.get(line.id) ?? null;
  const neighbourIds = new Set<string>();
  Object.values(join ?? {}).forEach((entry) => {
    const record = entry as { hostWallId?: string; otherWallId?: string } | undefined;
    if (record?.otherWallId) neighbourIds.add(record.otherWallId);
    if (record?.hostWallId) neighbourIds.add(record.hostWallId);
  });
  return {
    framing,
    framingReveal: framing.enabled && framing.showInModel && target.id !== "top",
    headerTypes: [
      ...new Set(line.wallOpenings.map((opening) => opening.headerTypeIdOverride).filter((id): id is string => Boolean(id))),
    ].map((id) => headerTypesById.get(id)),
    join,
    line,
    neighbours: [...neighbourIds].sort().map((id) => {
      const neighbour = linesById.get(id);
      return { line: neighbour, wallType: neighbour?.wallTypeId ? wallTypesById.get(neighbour.wallTypeId) : undefined };
    }),
    occupied: [...(joinPlan.occupiedEndpoints.get(line.id) ?? [])].sort(),
    openingTypes: [
      ...new Set(line.wallOpenings.map((opening) => opening.wallOpeningTypeId).filter((id): id is string => Boolean(id))),
    ].map((id) => openingTypesById.get(id)),
    passThroughCount: joinPlan.passThroughCounts.get(line.id) ?? 0,
    targetId: target.id,
    unresolvedCount: joinPlan.unresolvedCounts.get(line.id) ?? 0,
    vertical,
    wallType,
  };
}
