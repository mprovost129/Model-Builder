import assert from "node:assert/strict";
import test from "node:test";

import { NEW_PROJECT_DOCUMENT } from "../lib/document-model.ts";
import { createProjectDocument } from "../lib/project-file.ts";
import {
  MAXIMUM_RECENT_PROJECT_COUNT,
  parseRecentProjects,
  rememberRecentProject,
  removeRecentProject,
  serializeRecentProjects,
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
  let recent = rememberRecentProject([], first, "2026-09-03T12:00:00.000Z");
  recent = rememberRecentProject(recent, second, "2026-09-03T13:00:00.000Z");
  const restored = parseRecentProjects(serializeRecentProjects(recent));

  assert.deepEqual(restored.map((entry) => entry.name), ["Second House", "First House"]);
  assert.match(restored[0].project, /model-builder-project/);
});

test("saving the same project updates one recent entry", () => {
  const original = project("Original Name", "2026-09-01T12:00:00.000Z");
  const renamed = { ...original, name: "Renamed House", updatedAt: "2026-09-03T15:00:00.000Z" };
  let recent = rememberRecentProject([], original, "2026-09-03T12:00:00.000Z");
  recent = rememberRecentProject(recent, renamed, "2026-09-03T15:00:00.000Z");

  assert.equal(recent.length, 1);
  assert.equal(recent[0].name, "Renamed House");
});

test("recent projects are bounded, removable, and reject invalid storage", () => {
  let recent = [];
  for (let index = 0; index < MAXIMUM_RECENT_PROJECT_COUNT + 2; index += 1) {
    recent = rememberRecentProject(
      recent,
      project(`House ${index}`, `2026-09-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`),
      `2026-09-${String(index + 1).padStart(2, "0")}T13:00:00.000Z`,
    );
  }
  assert.equal(recent.length, MAXIMUM_RECENT_PROJECT_COUNT);
  assert.equal(removeRecentProject(recent, recent[0].id).length, MAXIMUM_RECENT_PROJECT_COUNT - 1);
  assert.deepEqual(parseRecentProjects("not json"), []);
  assert.deepEqual(parseRecentProjects(JSON.stringify([{ name: "Untrusted" }])), []);
});
