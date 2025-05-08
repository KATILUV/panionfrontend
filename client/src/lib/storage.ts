/**
 * Storage utility functions
 * 
 * Provides functions for storing and retrieving data from localStorage
 * with proper type safety and error handling.
 */

/**
 * Get an item from localStorage with type safety
 */
export function getLocalStorage<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    console.error(`Error retrieving ${key} from localStorage:`, e);
    return null;
  }
}

/**
 * Set an item in localStorage with type safety
 */
export function setLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error setting ${key} in localStorage:`, e);
  }
}

/**
 * Remove an item from localStorage
 */
export function removeLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`Error removing ${key} from localStorage:`, e);
  }
}

/**
 * Clear all data from localStorage
 */
export function clearLocalStorage(): void {
  try {
    localStorage.clear();
  } catch (e) {
    console.error('Error clearing localStorage:', e);
  }
}

/**
 * Check if an item exists in localStorage
 */
export function existsInLocalStorage(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch (e) {
    console.error(`Error checking if ${key} exists in localStorage:`, e);
    return false;
  }
}