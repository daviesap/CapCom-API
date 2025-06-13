/**
 * Sanitises strings for safe use in URLs, filenames, storage paths.
 * - Removes spaces, brackets, and unsafe characters.
 * - Allows only a-z, A-Z, 0-9, dot, dash, underscore.
 * 
 * Use for: Filenames, GCS object names, URLs, storage paths.
 *
 * @param {string} input
 * @returns {string}
 */
export function sanitise(input) {
  if (!input) return '';

  let result = input.trim();

  // Remove spaces
  result = result.replace(/\s+/g, '');

  // Remove brackets
  result = result.replace(/[()]/g, '');

  // Remove any unsafe characters (allow only a-z, A-Z, 0-9, dot, dash, underscore)
  result = result.replace(/[^a-zA-Z0-9._-]/g, '');

  return result;
}