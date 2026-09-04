/** Small string helpers shared across the interface. */

/**
 * "wall-center" -> "Wall Center". Used for enum values shown directly in the UI
 * where no explicit label is defined.
 */
export function titleCase(value: string): string {
  return value.replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
