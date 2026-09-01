export type ViewMode = "front" | "perspective" | "right" | "top";
export type ViewDirection = readonly [number, number, number];
export type ViewTarget = {
  direction: ViewDirection;
  id: string;
  label: string;
  projection: "orthographic" | "perspective";
};

export const VIEW_PRESETS: Record<ViewMode, ViewTarget> = {
  front: { direction: [0, -1, 0], id: "front", label: "Front · Orthographic", projection: "orthographic" },
  perspective: { direction: [1, -1.15, 0.85], id: "perspective", label: "Perspective", projection: "perspective" },
  right: { direction: [1, 0, 0], id: "right", label: "Right · Orthographic", projection: "orthographic" },
  top: { direction: [0, 0, 1], id: "top", label: "Top · Orthographic", projection: "orthographic" },
};

export function navigationTargetFromDirection(direction: ViewDirection): ViewTarget {
  const [x, y, z] = direction;
  const names = [
    z > 0 ? "Top" : z < 0 ? "Bottom" : "",
    y < 0 ? "Front" : y > 0 ? "Back" : "",
    x > 0 ? "Right" : x < 0 ? "Left" : "",
  ].filter(Boolean);
  const activeAxes = [x, y, z].filter((value) => value !== 0).length;
  const projection = activeAxes === 3 ? "perspective" : "orthographic";
  return {
    direction,
    id: names.join("-").toLowerCase(),
    label: `${names.join(" · ")} · ${projection === "perspective" ? "Perspective" : "Orthographic"}`,
    projection,
  };
}
