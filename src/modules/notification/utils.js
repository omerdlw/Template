function canUseBrowserStorage() {
  return typeof window !== "undefined";
}

export function getStorageItem(key, defaultValue = null) {
  if (!canUseBrowserStorage()) return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
}

export function setStorageItem(key, value) {
  if (!canUseBrowserStorage()) return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage (${key}):`, error);
    return false;
  }
}

export function removeStorageItem(key) {
  if (!canUseBrowserStorage()) return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
    return false;
  }
}
