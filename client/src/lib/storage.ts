/**
 * Storage helper functions for persistent storage
 */

// Get an item from localStorage with error handling
export function getLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error(`Error accessing localStorage for key "${key}":`, e);
    return null;
  }
}

// Set an item in localStorage with error handling
export function setLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error(`Error setting localStorage for key "${key}":`, e);
  }
}

// Remove an item from localStorage with error handling
export function removeLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`Error removing localStorage for key "${key}":`, e);
  }
}

// Check if an item exists in localStorage
export function hasLocalStorage(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch (e) {
    console.error(`Error checking localStorage for key "${key}":`, e);
    return false;
  }
}

// Clear all items in localStorage with error handling
export function clearLocalStorage(): void {
  try {
    localStorage.clear();
  } catch (e) {
    console.error('Error clearing localStorage:', e);
  }
}

// Get all keys in localStorage with error handling
export function getLocalStorageKeys(): string[] {
  try {
    return Object.keys(localStorage);
  } catch (e) {
    console.error('Error getting localStorage keys:', e);
    return [];
  }
}

// Get object from localStorage with automatic parsing
export function getObjectFromLocalStorage<T>(key: string): T | null {
  const value = getLocalStorage(key);
  if (!value) return null;
  
  try {
    return JSON.parse(value) as T;
  } catch (e) {
    console.error(`Error parsing localStorage value for key "${key}":`, e);
    return null;
  }
}

// Set object in localStorage with automatic stringification
export function setObjectInLocalStorage<T>(key: string, value: T): void {
  try {
    const stringValue = JSON.stringify(value);
    setLocalStorage(key, stringValue);
  } catch (e) {
    console.error(`Error stringifying object for localStorage key "${key}":`, e);
  }
}