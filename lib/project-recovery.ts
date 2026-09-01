import type { ModelDocument } from "./document-model.ts";
import {
  createProjectDocument,
  parseProjectDocument,
  type ModelBuilderProject,
} from "./project-file.ts";

export const PROJECT_RECOVERY_FORMAT = "model-builder-recovery";
export const PROJECT_RECOVERY_VERSION = 1;
export const PROJECT_RECOVERY_STORAGE_KEY = "model-builder:recovery:v1";

export type ProjectRecoverySnapshot = {
  autosavedAt: string;
  currentProject: ModelBuilderProject;
  format: typeof PROJECT_RECOVERY_FORMAT;
  savedProject: ModelBuilderProject;
  version: typeof PROJECT_RECOVERY_VERSION;
};

export type RecoveryParseResult =
  | { ok: true; snapshot: ProjectRecoverySnapshot }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    Number.isFinite(Date.parse(value))
  );
}

export function createRecoverySnapshot({
  autosavedAt,
  createdAt,
  currentDocument,
  projectName,
  savedDocument,
  savedProjectName,
}: {
  autosavedAt: string;
  createdAt: string;
  currentDocument: ModelDocument;
  projectName: string;
  savedDocument: ModelDocument;
  savedProjectName: string;
}): ProjectRecoverySnapshot {
  return {
    autosavedAt,
    currentProject: createProjectDocument({
      createdAt,
      document: currentDocument,
      name: projectName,
      updatedAt: autosavedAt,
    }),
    format: PROJECT_RECOVERY_FORMAT,
    savedProject: createProjectDocument({
      createdAt,
      document: savedDocument,
      name: savedProjectName,
      updatedAt: autosavedAt,
    }),
    version: PROJECT_RECOVERY_VERSION,
  };
}

export function serializeRecoverySnapshot(
  snapshot: ProjectRecoverySnapshot,
): string {
  return JSON.stringify(snapshot);
}

export function parseRecoverySnapshot(content: string): RecoveryParseResult {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    return { ok: false, error: "The local recovery data is not valid JSON." };
  }

  if (!isRecord(value) || value.format !== PROJECT_RECOVERY_FORMAT) {
    return { ok: false, error: "This is not Model Builder recovery data." };
  }
  if (value.version !== PROJECT_RECOVERY_VERSION) {
    return { ok: false, error: "This recovery-data version is not supported." };
  }
  if (!isIsoDate(value.autosavedAt)) {
    return { ok: false, error: "The recovery timestamp is invalid." };
  }

  const currentProject = parseProjectDocument(JSON.stringify(value.currentProject));
  const savedProject = parseProjectDocument(JSON.stringify(value.savedProject));
  if (!currentProject.ok || !savedProject.ok) {
    return { ok: false, error: "The recovered project geometry is invalid." };
  }

  return {
    ok: true,
    snapshot: {
      autosavedAt: value.autosavedAt,
      currentProject: currentProject.project,
      format: PROJECT_RECOVERY_FORMAT,
      savedProject: savedProject.project,
      version: PROJECT_RECOVERY_VERSION,
    },
  };
}
