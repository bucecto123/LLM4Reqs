/**
 * Typing Animation Utilities
 * Different approaches for client-side typing effects
 */

/**
 * Character-by-character typing animation
 * @param {string} text - Full text to type
 * @param {number} speed - Milliseconds per character
 * @param {function} callback - Called with each update
 * @returns {function} cleanup function
 */
export const typeCharByChar = (text, speed = 20, callback) => {
  let index = 0;
  let timeoutId;

  const type = () => {
    if (index < text.length) {
      callback(text.substring(0, index + 1));
      index++;
      timeoutId = setTimeout(type, speed);
    } else {
      callback(text, true); // true = completed
    }
  };

  type();

  // Return cleanup function
  return () => clearTimeout(timeoutId);
};

/**
 * Word-by-word typing animation (more natural looking)
 * @param {string} text - Full text to type
 * @param {number} speed - Milliseconds per word
 * @param {function} callback - Called with each update
 * @returns {function} cleanup function
 */
export const typeWordByWord = (text, speed = 50, callback) => {
  const words = text.split(" ");
  let index = 0;
  let timeoutId;

  const type = () => {
    if (index < words.length) {
      const partial = words.slice(0, index + 1).join(" ");
      callback(partial);
      index++;
      timeoutId = setTimeout(type, speed);
    } else {
      callback(text, true); // true = completed
    }
  };

  type();

  // Return cleanup function
  return () => clearTimeout(timeoutId);
};

/**
 * Variable speed typing (faster for spaces, slower for punctuation)
 * More realistic human-like typing
 */
export const typeWithVariableSpeed = (text, baseSpeed = 30, callback) => {
  let index = 0;
  let timeoutId;

  const getCharSpeed = (char, nextChar) => {
    // Faster for spaces
    if (char === " ") return baseSpeed * 0.5;

    // Pause at punctuation
    if ([".", "!", "?"].includes(char)) return baseSpeed * 3;
    if ([",", ";", ":"].includes(char)) return baseSpeed * 1.5;

    // Normal speed for letters
    return baseSpeed;
  };

  const type = () => {
    if (index < text.length) {
      callback(text.substring(0, index + 1));
      const currentChar = text[index];
      const nextChar = text[index + 1];
      const speed = getCharSpeed(currentChar, nextChar);
      index++;
      timeoutId = setTimeout(type, speed);
    } else {
      callback(text, true);
    }
  };

  type();

  return () => clearTimeout(timeoutId);
};

/**
 * Chunk-based typing (types in chunks for longer text)
 * Good for large responses
 */
export const typeInChunks = (text, chunkSize = 5, speed = 50, callback) => {
  let index = 0;
  let timeoutId;

  const type = () => {
    if (index < text.length) {
      const nextIndex = Math.min(index + chunkSize, text.length);
      callback(text.substring(0, nextIndex));
      index = nextIndex;
      timeoutId = setTimeout(type, speed);
    } else {
      callback(text, true);
    }
  };

  type();

  return () => clearTimeout(timeoutId);
};

/**
 * Instant reveal with cursor animation
 * Shows text instantly but with a blinking cursor for effect
 */
export const instantRevealWithCursor = (
  text,
  cursorDuration = 1000,
  callback
) => {
  callback(text, false); // Show text immediately with cursor

  const timeoutId = setTimeout(() => {
    callback(text, true); // Remove cursor after duration
  }, cursorDuration);

  return () => clearTimeout(timeoutId);
};

export default {
  typeCharByChar,
  typeWordByWord,
  typeWithVariableSpeed,
  typeInChunks,
  instantRevealWithCursor,
};
