/*
 * functions/utils/cleanJSON.mjs
 * ------------------------------
 * Utility to sanitise and parse JSON strings that may contain line breaks,
 * escaped newlines, or control characters. Useful when inputs come from
 * environments that escape or mangle JSON (e.g., Glide JSON columns).
 *
 * Usage: pass a string that should contain JSON; function will return parsed object
 * or throw an error if parsing ultimately fails.
 */
export function cleanJson(dirtyString) {
    const cleanedString = dirtyString
      .replace(/\r?\n/g, ' ')     // Replace actual line breaks with space
      .replace(/\\n/g, ' ')       // Replace escaped \n with space
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001F]+/g, ''); // Remove control chars (e.g., tabs, backspace)
  
    try {
      return JSON.parse(cleanedString);
    } catch (err) {
      console.error('❌ JSON parsing failed:', err.message);
      throw err;
    }
  }