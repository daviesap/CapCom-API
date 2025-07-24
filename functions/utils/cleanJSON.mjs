// utils/cleanJSON.mjs
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