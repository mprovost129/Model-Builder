import {
  parseProjectDocument,
  serializeProjectDocument,
  type ModelBuilderProject,
} from "./project-file.ts";

export const RECENT_PROJECTS_STORAGE_KEY = "slater-woods-omni-design:recent-projects:v1";
export const MAXIMUM_RECENT_PROJECT_COUNT = 6;
export const MAXIMUM_RECENT_PROJECT_BYTES = 1_000_000;
export const MAXIMUM_RECENT_PROJECT_STORAGE_BYTES = 3_500_000;

export type RecentProjectRecord = {
  id: string;
  name: string;
  openedAt: string;
  project: string;
  updatedAt: string;
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
): RecentProjectRecord[] {
  const record: RecentProjectRecord = {
    id: project.createdAt,
    name: project.name,
    openedAt,
    project: serializeProjectDocument(project),
    updatedAt: project.updatedAt,
  };
  const next = [record, ...current.filter((candidate) => candidate.id !== record.id)]
    .slice(0, MAXIMUM_RECENT_PROJECT_COUNT);
  let storedBytes = 2;
  return next.filter((candidate) => {
    const candidateBytes = JSON.stringify(candidate).length + 1;
    if (storedBytes + candidateBytes > MAXIMUM_RECENT_PROJECT_STORAGE_BYTES) return false;
    storedBytes += candidateBytes;
    return true;
  });
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
