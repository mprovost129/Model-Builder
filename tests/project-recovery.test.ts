import assert from "node:assert/strict";
import test from "node:test";
import { addBoxObject, DEFAULT_DOCUMENT } from "../lib/document-model.ts";
import {
  createRecoverySnapshot,
  parseRecoverySnapshot,
  PROJECT_RECOVERY_STORAGE_KEY,
  serializeRecoverySnapshot,
} from "../lib/project-recovery.ts";
import { projectToDocument } from "../lib/project-file.ts";

const createdAt = "2026-08-27T12:00:00.000Z";
const autosavedAt = "2026-08-27T12:30:00.000Z";

test("round-trips current and last-saved project states", () => {
  const currentDocument = addBoxObject(DEFAULT_DOCUMENT);
  assert.ok(currentDocument);
  const snapshot = createRecoverySnapshot({
    autosavedAt,
    createdAt,
    currentDocument: currentDocument.document,
    projectName: "House Study - changed",
    savedDocument: DEFAULT_DOCUMENT,
    savedProjectName: "House Study",
  });

  const parsed = parseRecoverySnapshot(serializeRecoverySnapshot(snapshot));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(projectToDocument(parsed.snapshot.currentProject), currentDocument.document);
  assert.deepEqual(projectToDocument(parsed.snapshot.savedProject), DEFAULT_DOCUMENT);
  assert.equal(parsed.snapshot.currentProject.name, "House Study - changed");
  assert.equal(parsed.snapshot.savedProject.name, "House Study");
  assert.equal(parsed.snapshot.autosavedAt, autosavedAt);
});

test("uses a versioned, application-specific browser-storage key", () => {
  assert.equal(PROJECT_RECOVERY_STORAGE_KEY, "model-builder:recovery:v1");
});

test("rejects malformed, unrelated, and future recovery data", () => {
  assert.equal(parseRecoverySnapshot("not json").ok, false);
  assert.equal(parseRecoverySnapshot('{"format":"something-else"}').ok, false);

  const snapshot = createRecoverySnapshot({
    autosavedAt,
    createdAt,
    currentDocument: DEFAULT_DOCUMENT,
    projectName: "Test",
    savedDocument: DEFAULT_DOCUMENT,
    savedProjectName: "Test",
  });
  assert.equal(
    parseRecoverySnapshot(JSON.stringify({ ...snapshot, version: 2 })).ok,
    false,
  );
});

test("rejects recovery data containing invalid box geometry", () => {
  const snapshot = createRecoverySnapshot({
    autosavedAt,
    createdAt,
    currentDocument: DEFAULT_DOCUMENT,
    projectName: "Test",
    savedDocument: DEFAULT_DOCUMENT,
    savedProjectName: "Test",
  });
  const invalid = structuredClone(snapshot);
  invalid.currentProject.objects[0].dimensions.width = 0;
  assert.equal(parseRecoverySnapshot(JSON.stringify(invalid)).ok, false);
});
