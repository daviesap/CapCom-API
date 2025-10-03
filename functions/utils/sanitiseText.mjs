/*
 * functions/utils/sanitiseText.mjs
 * --------------------------------
 * Prepare text for rendering into PDFs by removing line breaks and control characters
 * that some PDF encoders (WinAnsi) cannot handle.
 */
/**
 * Removes characters that WinAnsi encoding cannot handle, including:
 * - Line breaks (\n, \r)
 * - Control characters (ASCII < 32)
 * 
 * Replaces line breaks with spaces and strips other control characters.
 *
 * @param {string} str
 * @returns {string}
 */
export function sanitiseText(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/\r?\n/g, ' ')      // Replace line breaks with space
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001F]/g, ''); // Remove control characters
  }


  