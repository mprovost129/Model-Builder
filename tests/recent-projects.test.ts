import assert from "node:assert/strict";
import test from "node:test";

import { NEW_PROJECT_DOCUMENT } from "../lib/document-model.ts";
import { createProjectDocument } from "../lib/project-file.ts";
import {
  describeRecentProjectSkip,
  MAXIMUM_RECENT_PROJECT_BYTES,
  MAXIMUM_RECENT_PROJECT_COUNT,
  parseRecentProjects,
  rememberRecentProject,
  removeRecentProject,
  serializeRecentProjects,
  type RecentProjectRecord,
} from "../lib/recent-projects.ts";

function project(name: string, createdAt: string) {
  return createProjectDocument({
    createdAt,
    document: NEW_PROJECT_DOCUMENT,
    name,
    updatedAt: "2026-09-03T14:00:00.000Z",
  });
}

test("recent projects are validated, ordered, and reopenable", () => {
  const first = project("First House", "2026-09-01T12:00:00.000Z");
  const second = project("Second House", "2026-09-02T12:00:00.000Z");
  let recent = rememberRecentProject([], first, "2026-09-03T12:00:00.000Z").records;
  recent = rememberRecentProject(recent, second, "2026-09-03T13:00:00.000Z").records;
  const restored = parseRecentProjects(serializeRecentProjects(recent));

  assert.deepEqual(restored.map((entry) => entry.name), ["Second House", "First House"]);
  assert.match(restored[0].project, /model-builder-project/);
});

test("saving the same project updates one recent entry", () => {
  const original = project("Original Name", "2026-09-01T12:00:00.000Z");
  const renamed = { ...original, name: "Renamed House", updatedAt: "2026-09-03T15:00:00.000Z" };
  let recent = rememberRecentProject([], original, "2026-09-03T12:00:00.000Z").records;
  recent = rememberRecentProject(recent, renamed, "2026-09-03T15:00:00.000Z").records;

  assert.equal(recent.length, 1);
  assert.equal(recent[0].name, "Renamed House");
});

test("recent projects are bounded, removable, and reject invalid storage", () => {
  let recent: RecentProjectRecord[] = [];
  for (let index = 0; index < MAXIMUM_RECENT_PROJECT_COUNT + 2; index += 1) {
    recent = rememberRecentProject(
      recent,
      project(`House ${index}`, `2026-09-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`),
      `2026-09-${String(index + 1).padStart(2, "0")}T13:00:00.000Z`,
    ).records;
  }
  assert.equal(recent.length, MAXIMUM_RECENT_PROJECT_COUNT);
  assert.equal(removeRecentProject(recent, recent[0].id).length, MAXIMUM_RECENT_PROJECT_COUNT - 1);
  assert.deepEqual(parseRecentProjects("not json"), []);
  assert.deepEqual(parseRecentProjects(JSON.stringify([{ name: "Untrusted" }])), []);
});

test("an oversize project is reported instead of dropped in silence", () => {
  const small = project("Small House", "2026-09-01T12:00:00.000Z");
  const kept = rememberRecentProject([], small, "2026-09-03T12:00:00.000Z");
  assert.equal(kept.skipped, null);
  assert.equal(kept.records.length, 1);

  // Stand in for a large residential plan without building one: pad the name to
  // push the serialized record past the per-project limit.
  const huge = { ...small, name: "H".repeat(MAXIMUM_RECENT_PROJECT_BYTES + 1_000) };
  const skipped = rememberRecentProject(kept.records, huge, "2026-09-03T13:00:00.000Z");
  assert.ok(skipped.skipped, "an oversize project should report why it was not kept");
  assert.equal(skipped.skipped.reason, "project-too-large");
  assert.ok(skipped.skipped.bytes > MAXIMUM_RECENT_PROJECT_BYTES);
  assert.ok(!skipped.records.some((entry) => entry.id === huge.createdAt), "the oversize project should not be stored");
  assert.match(describeRecentProjectSkip(skipped.skipped), /Open Project/);
});

test("a skipped project leaves the existing recent entries intact", () => {
  const first = project("First House", "2026-09-01T12:00:00.000Z");
  const kept = rememberRecentProject([], first, "2026-09-03T12:00:00.000Z");
  const huge = { ...project("Huge House", "2026-09-02T12:00:00.000Z"), name: "H".repeat(MAXIMUM_RECENT_PROJECT_BYTES + 1_000) };
  const after = rememberRecentProject(kept.records, huge, "2026-09-03T13:00:00.000Z");
  assert.deepEqual(after.records.map((entry) => entry.name), ["First House"]);
});
