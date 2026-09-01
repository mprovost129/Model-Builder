import assert from "node:assert/strict";
import test from "node:test";
import {
  navigationTargetFromDirection,
  VIEW_PRESETS,
} from "../lib/view-navigation.ts";

test("face targets use named orthographic views", () => {
  assert.deepEqual(navigationTargetFromDirection([0, 0, 1]), VIEW_PRESETS.top);
  assert.equal(navigationTargetFromDirection([0, 1, 0]).id, "back");
  assert.equal(navigationTargetFromDirection([-1, 0, 0]).label, "Left · Orthographic");
});

test("edge targets create diagonal orthographic views", () => {
  assert.deepEqual(navigationTargetFromDirection([1, -1, 0]), {
    direction: [1, -1, 0],
    id: "front-right",
    label: "Front · Right · Orthographic",
    projection: "orthographic",
  });
});

test("corner targets create isometric perspective views", () => {
  assert.deepEqual(navigationTargetFromDirection([1, -1, 1]), {
    direction: [1, -1, 1],
    id: "top-front-right",
    label: "Top · Front · Right · Perspective",
    projection: "perspective",
  });
});
