import {
  parseProjectDocument,
  serializeProjectDocument,
  type ModelBuilderProject,
} from "./project-file.ts";

export const RECENT_PROJECTS_STORAGE_KEY = "slater-woods-omni-design:recent-projects:v1";
export const MAXIMUM_RECENT_PROJECT_COUNT = 6;
/**
 * Recent Projects is a convenience copy kept in browser localStorage, which
 * holds roughly 5 MB per origin for the whole application, shared with the
 * recovery draft. A large residential project serializes past this on its own:
 * a 120' x 100' four-level plan is over 1 MB with walls alone. Projects beyond
 * the limit are reported rather than dropped in silence, and the portable
 * .mbproj file remains the durable copy. Moving this store to IndexedDB would
 * remove the ceiling entirely.
 */
export const MAXIMUM_RECENT_PROJECT_BYTES = 2_000_000;
export const MAXIMUM_RECENT_PROJECT_STORAGE_BYTES = 3_500_000;

export type RecentProjectRecord = {
  id: string;
  name: string;
  openedAt: string;
  project: string;
  updatedAt: string;
};

/** Why a project could not be kept as a Recent Projects convenience copy. */
export type RecentProjectSkip = {
  bytes: number;
  limit: number;
  reason: "project-too-large" | "storage-full";
};

export type RecentProjectsUpdate = {
  records: RecentProjectRecord[];
  /** Null when the project was stored. Set when it was left out, so the caller can say so. */
  skipped: RecentProjectSkip | null;
};

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function validatedRecord(value: unknown): RecentProjectRecord | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<RecentProjectRecord>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.name !== "string" ||
    typeof candidate.project !== "string" ||
    !isIsoDate(candidate.openedAt) ||
    !isIsoDate(candidate.updatedAt) ||
    candidate.name.trim().length === 0 ||
    candidate.name.length > 120 ||
    candidate.project.length > MAXIMUM_RECENT_PROJECT_BYTES
  ) return null;

  const parsed = parseProjectDocument(candidate.project);
  if (!parsed.ok || parsed.project.createdAt !== candidate.id) return null;
  return {
    id: candidate.id,
    name: parsed.project.name,
    openedAt: candidate.openedAt,
    project: serializeProjectDocument(parsed.project),
    updatedAt: parsed.project.updatedAt,
  };
}

export function parseRecentProjects(value: string | null): RecentProjectRecord[] {
  if (!value || value.length > MAXIMUM_RECENT_PROJECT_STORAGE_BYTES * 1.25) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    const unique = new Map<string, RecentProjectRecord>();
    parsed.slice(0, MAXIMUM_RECENT_PROJECT_COUNT * 2).forEach((entry) => {
      const record = validatedRecord(entry);
      if (!record || unique.has(record.id)) return;
      unique.set(record.id, record);
    });
    return [...unique.values()]
      .sort((a, b) => Date.parse(b.openedAt) - Date.parse(a.openedAt))
      .slice(0, MAXIMUM_RECENT_PROJECT_COUNT);
  } catch {
    return [];
  }
}

export function rememberRecentProject(
  current: RecentProjectRecord[],
  project: ModelBuilderProject,
  openedAt = new Date().toISOString(),
): RecentProjectsUpdate {
  const serialized = serializeProjectDocument(project);
  const record: RecentProjectRecord = {
    id: project.createdAt,
    name: project.name,
    openedAt,
    project: serialized,
    updatedAt: project.updatedAt,
  };
  const others = current.filter((candidate) => candidate.id !== record.id);

  // A project past the per-record limit would be rejected on the way back in by
  // validatedRecord, so refuse it here where the caller can still report it.
  if (serialized.length > MAXIMUM_RECENT_PROJECT_BYTES) {
    return {
      records: others.slice(0, MAXIMUM_RECENT_PROJECT_COUNT),
      skipped: { bytes: serialized.length, limit: MAXIMUM_RECENT_PROJECT_BYTES, reason: "project-too-large" },
    };
  }

  const next = [record, ...others].slice(0, MAXIMUM_RECENT_PROJECT_COUNT);
  const records: RecentProjectRecord[] = [];
  let storedBytes = 2;
  let currentProjectKept = false;
  next.forEach((candidate) => {
    const candidateBytes = JSON.stringify(candidate).length + 1;
    if (storedBytes + candidateBytes > MAXIMUM_RECENT_PROJECT_STORAGE_BYTES) return;
    storedBytes += candidateBytes;
    if (candidate.id === record.id) currentProjectKept = true;
    records.push(candidate);
  });

  return {
    records,
    skipped: currentProjectKept
      ? null
      : { bytes: serialized.length, limit: MAXIMUM_RECENT_PROJECT_STORAGE_BYTES, reason: "storage-full" },
  };
}

/** A short, user-facing explanation of why a project is not in Recent Projects. */
export function describeRecentProjectSkip(skip: RecentProjectSkip): string {
  const megabytes = (skip.bytes / 1_000_000).toFixed(1);
  return skip.reason === "project-too-large"
    ? `This project is ${megabytes} MB, past the ${(skip.limit / 1_000_000).toFixed(0)} MB limit for a quick-open copy. Your saved .mbproj file is unaffected; reopen it with Open Project.`
    : `Recent Projects is full, so this ${megabytes} MB project was not kept as a quick-open copy. Your saved .mbproj file is unaffected; reopen it with Open Project.`;
}

export function removeRecentProject(
  current: RecentProjectRecord[],
  projectId: string,
): RecentProjectRecord[] {
  return current.filter((record) => record.id !== projectId);
}

export function serializeRecentProjects(records: RecentProjectRecord[]): string {
  return JSON.stringify(records.slice(0, MAXIMUM_RECENT_PROJECT_COUNT));
}
