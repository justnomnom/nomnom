// ----------------------------------------------------------------------

/**
 * Safe storage utility with fallback mechanisms for when localStorage is blocked
 * Falls back to: localStorage -> sessionStorage -> cookies -> in-memory
 */

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// In-memory fallback storage
const memoryStorage = new Map();

/**
 * Check if localStorage is available
 */
export function localStorageAvailable() {
  if (!isBrowser) return false;
  try {
    const key = '__some_random_key_you_are_not_going_to_use__';
    window.localStorage.setItem(key, key);
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if sessionStorage is available
 */
export function sessionStorageAvailable() {
  if (!isBrowser) return false;
  try {
    const key = '__some_random_key_you_are_not_going_to_use__';
    window.sessionStorage.setItem(key, key);
    window.sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Cookie helper functions
 */
function setCookie(name, value, days = 7) {
  if (!isBrowser) return false;
  try {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
    return true;
  } catch {
    return false;
  }
}

function getCookie(name) {
  if (!isBrowser) return null;
  try {
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i += 1) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
    return null;
  } catch {
    return null;
  }
}

function removeCookie(name) {
  if (!isBrowser) return false;
  try {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if data size is suitable for cookies (4KB limit, leave buffer)
 */
function isDataSizeOkForCookie(data) {
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);
  // Cookies have 4KB limit, use 3KB as safe limit
  return dataString.length < 3072;
}

/**
 * Store data with fallback mechanism
 * @param {string} key - Storage key
 * @param {any} value - Value to store (will be JSON stringified)
 * @param {Object} options - Storage options
 * @param {number} options.cookieExpiryDays - Cookie expiry days (default: 7)
 * @returns {boolean} - Whether storage was successful
 */
export function safeSetItem(key, value, options = {}) {
  const { cookieExpiryDays = 7 } = options;

  // Handle undefined values (JSON.stringify returns undefined for undefined)
  if (value === undefined) {
    console.warn(
      `[safe-storage] Attempted to store undefined value for key "${key}", storing null instead`
    );

    value = null;
  }

  const valueString = JSON.stringify(value);

  // Try localStorage first
  if (localStorageAvailable()) {
    try {
      localStorage.setItem(key, valueString);
      // Also clear from other storage methods if localStorage works
      if (sessionStorageAvailable()) {
        try {
          sessionStorage.removeItem(key);
        } catch {
          // Ignore
        }
      }
      try {
        removeCookie(key);
      } catch {
        // Ignore
      }
      memoryStorage.delete(key);
      return true;
    } catch {
      // localStorage failed, continue to fallback
    }
  }

  // Fallback to sessionStorage
  if (sessionStorageAvailable()) {
    try {
      sessionStorage.setItem(key, valueString);
      // Clear from cookies and memory
      try {
        removeCookie(key);
      } catch {
        // Ignore
      }
      memoryStorage.delete(key);
      return true;
    } catch {
      // sessionStorage failed, continue to fallback
    }
  }

  // Fallback to cookies (if data is small enough)
  if (isDataSizeOkForCookie(valueString)) {
    if (setCookie(key, valueString, cookieExpiryDays)) {
      memoryStorage.delete(key);
      return true;
    }
  }

  // Last resort: in-memory storage (lost on refresh)
  // Store the original value (not stringified) since memory doesn't need serialization
  try {
    memoryStorage.set(key, value);
    return true;
  } catch (error) {
    console.error('All storage methods failed for key:', key, error);
    return false;
  }
}

/**
 * Retrieve data with fallback mechanism
 * @param {string} key - Storage key
 * @returns {any|null} - Retrieved value or null if not found
 */
export function safeGetItem(key) {
  // Try localStorage first
  if (localStorageAvailable()) {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) {
        try {
          return JSON.parse(value);
        } catch (parseError) {
          // If JSON.parse fails, the data might be corrupted or stored in old format
          // Try to handle legacy string values that weren't JSON stringified
          console.warn(
            `[safe-storage] Failed to parse value for key "${key}", attempting legacy format:`,
            parseError
          );
          // Return the raw string value as fallback (for backward compatibility)
          return value;
        }
      }
    } catch {
      // localStorage access failed, continue to fallback
    }
  }

  // Fallback to sessionStorage
  if (sessionStorageAvailable()) {
    try {
      const value = sessionStorage.getItem(key);
      if (value !== null) {
        try {
          return JSON.parse(value);
        } catch (parseError) {
          console.warn(
            `[safe-storage] Failed to parse value for key "${key}" from sessionStorage:`,
            parseError
          );
          return value;
        }
      }
    } catch {
      // sessionStorage failed, continue to fallback
    }
  }

  // Fallback to cookies
  if (isBrowser) {
    try {
      const value = getCookie(key);
      if (value !== null && value !== '') {
        try {
          return JSON.parse(value);
        } catch (parseError) {
          console.warn(
            `[safe-storage] Failed to parse value for key "${key}" from cookie:`,
            parseError
          );
          return value;
        }
      }
    } catch {
      // Cookie retrieval failed, continue to fallback
    }
  }

  // Last resort: in-memory storage
  // Memory storage contains the original value (not stringified), so return as-is
  if (memoryStorage.has(key)) {
    return memoryStorage.get(key);
  }

  return null;
}

/**
 * Get a string value from storage (for simple string values like language codes)
 * This is a compatibility function that mimics localStorage.getItem behavior
 * @param {string} key - Storage key
 * @param {string} defaultValue - Default value if not found
 * @returns {string} - Retrieved string value or default
 */
export function localStorageGetItem(key, defaultValue = '') {
  // Try localStorage first
  if (localStorageAvailable()) {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) {
        return value;
      }
    } catch {
      // localStorage failed, continue to fallback
    }
  }

  // Fallback to sessionStorage
  if (sessionStorageAvailable()) {
    try {
      const value = sessionStorage.getItem(key);
      if (value !== null) {
        return value;
      }
    } catch {
      // sessionStorage failed, continue to fallback
    }
  }

  // Fallback to cookies
  try {
    const value = getCookie(key);
    if (value !== null && value !== '') {
      return value;
    }
  } catch {
    // Cookie retrieval failed, continue to fallback
  }

  // Last resort: in-memory storage (check if it's a string)
  if (memoryStorage.has(key)) {
    const value = memoryStorage.get(key);
    if (typeof value === 'string') {
      return value;
    }
  }

  return defaultValue;
}

/**
 * Remove data from all storage methods
 * @param {string} key - Storage key
 * @returns {boolean} - Whether removal was attempted (may not succeed for all methods)
 */
export function safeRemoveItem(key) {
  let removed = false;

  // Remove from localStorage
  if (localStorageAvailable()) {
    try {
      localStorage.removeItem(key);
      removed = true;
    } catch {
      // Ignore
    }
  }

  // Remove from sessionStorage
  if (sessionStorageAvailable()) {
    try {
      sessionStorage.removeItem(key);
      removed = true;
    } catch {
      // Ignore
    }
  }

  // Remove from cookies
  try {
    removeCookie(key);
    removed = true;
  } catch {
    // Ignore
  }

  // Remove from memory
  memoryStorage.delete(key);

  return removed;
}

/**
 * Clear all data for a given key pattern (useful for cleanup)
 * @param {string} pattern - Key pattern to match
 */
export function safeClearPattern(pattern) {
  // Clear from localStorage
  if (localStorageAvailable()) {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.includes(pattern)) {
          localStorage.removeItem(key);
        }
      });
    } catch {
      // Ignore
    }
  }

  // Clear from sessionStorage
  if (sessionStorageAvailable()) {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach((key) => {
        if (key.includes(pattern)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch {
      // Ignore
    }
  }

  // Clear from memory
  memoryStorage.forEach((value, key) => {
    if (key.includes(pattern)) {
      memoryStorage.delete(key);
    }
  });
}
