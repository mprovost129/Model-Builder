/**
 * Display labels for building model enums.
 *
 * One place for the human-readable names of Story purposes, Wall uses, assembly
 * roles, reference lines and the rest, shared by the Properties panel and the
 * manager dialogs. Extracted from app/model-builder-app.tsx.
 */
import type {
  AssemblyLayerRole,
  FloorStructurePreset,
  FoundationWallCondition,
  OpeningAssemblyComponent,
  RoofLayerSide,
  StoryPurpose,
  WallLayerGroup,
  WallReferenceLine,
  WallUse,
} from "@/lib/building-stories";
import type { ProjectType } from "@/lib/document-model";

export const ASSEMBLY_ROLE_LABELS: Record<AssemblyLayerRole, string> = {
  "air-gap": "Air gap",
  finish: "Finish",
  framing: "Framing",
  insulation: "Insulation",
  membrane: "Membrane",
  sheathing: "Sheathing / subfloor",
  structure: "Structure / slab",
  substrate: "Substrate",
};

export const STORY_PURPOSE_LABELS: Record<StoryPurpose, string> = {
  standard: "Standard / above-grade",
  basement: "Basement",
  crawlspace: "Crawlspace",
  "slab-on-grade": "Slab-on-grade",
};

export const STORY_PURPOSE_HELP: Record<StoryPurpose, string> = {
  standard: "An ordinary framed level. Stories above and below stack from its rough framing reference elevations.",
  basement: "A full lower level with its own walls, rooms, openings, slab, ceiling height, and plan view.",
  crawlspace: "A non-occupiable service or foundation level. Use a separate Story only when it needs its own plan or controlled height.",
  "slab-on-grade": "The occupied level bears on a slab. Do not add a Basement Story below solely to represent the slab.",
};

export const FLOOR_STRUCTURE_PRESET_LABELS: Record<FloorStructurePreset, string> = {
  "wood-framed": "Wood-framed floor",
  "basement-slab": "4 in. basement slab",
  "slab-on-grade": "4 in. insulated slab-on-grade",
};

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  "new-construction": "New construction",
  addition: "Addition",
  remodel: "Remodel",
  "as-built": "Existing / as-built",
};

export const WALL_USE_LABELS: Record<WallUse, string> = {
  exterior: "Exterior Wall",
  "interior-bearing": "Interior Bearing Wall",
  "interior-partition": "Interior Partition",
};

export const WALL_LAYER_GROUP_LABELS: Record<WallLayerGroup, string> = {
  exterior: "Exterior Layers",
  main: "Main Layers",
  interior: "Interior Layers",
};

export const ROOF_LAYER_SIDE_LABELS: Record<RoofLayerSide, string> = {
  exterior: "Above Roof Plane",
  interior: "Below Roof Plane",
};

export const WALL_REFERENCE_LINE_LABELS: Record<WallReferenceLine, string> = {
  "wall-center": "Wall centerline",
  "exterior-main": "Exterior face of Main",
  "center-main": "Center of Main",
  "interior-main": "Interior face of Main",
};

export const WALL_PREVIEW_REFERENCE_CODES: Record<WallReferenceLine, string> = {
  "center-main": "CM",
  "exterior-main": "EM",
  "interior-main": "IM",
  "wall-center": "WC",
};

export const FOUNDATION_CONDITION_LABELS: Record<FoundationWallCondition, string> = {
  "dropped-wall": "Dropped Foundation Wall",
  "garage-wall": "Garage Foundation Wall",
  "interior-mudsill": "Interior Mudsill",
  "slab-walkout": "Complete Slab Walk-out",
  "standard-bearing": "Standard Bearing Wall",
};

export const OPENING_PREVIEW_ROLE_COLORS: Record<OpeningAssemblyComponent["role"], string> = {
  frame: "#7591a5",
  glazing: "#9fc9d8",
  hardware: "#b7a27d",
  jamb: "#806f5e",
  mullion: "#d6e1e7",
  panel: "#a98b67",
  sash: "#607f94",
  threshold: "#8a7b6a",
  trim: "#c4ced4",
};
