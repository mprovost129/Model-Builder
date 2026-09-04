/**
 * Order-insensitive structural equality for plain project data.
 *
 * The document comparison paths used to spell this as
 * `JSON.stringify(a) === JSON.stringify(b)`, which is sensitive to key
 * insertion order. Because the project-file readers rebuild objects with their
 * own key order, a document that had just been saved and reopened compared as
 * different from the identical in-memory document. That made the unsaved-changes
 * indicator stick on and defeated the no-op check in the history reducer.
 *
 * Values here are plain JSON-shaped project data: objects, arrays, strings,
 * numbers, booleans, and null. Array order IS significant; object key order is
 * not. `undefined` and a missing key are treated as the same thing, matching
 * what a JSON round trip does to optional fields.
 */
export function deepEqual(first: unknown, second: unknown): boolean {
  if (Object.is(first, second)) return true;

  if (Array.isArray(first) || Array.isArray(second)) {
    if (!Array.isArray(first) || !Array.isArray(second)) return false;
    if (first.length !== second.length) return false;
    return first.every((entry, index) => deepEqual(entry, second[index]));
  }

  if (first === null || second === null) return first === second;
  if (typeof first !== "object" || typeof second !== "object") return false;

  const a = first as Record<string, unknown>;
  const b = second as Record<string, unknown>;
  // Ignore keys explicitly set to undefined so an optional field survives a JSON
  // round trip as "absent" rather than comparing unequal to "present, undefined".
  const keysA = Object.keys(a).filter((key) => a[key] !== undefined);
  const keysB = Object.keys(b).filter((key) => b[key] !== undefined);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key]));
}
