// Safe localStorage wrapper.
//
// iOS Safari Private Browsing (and locked-down/embedded browsers) throw when
// you touch localStorage — a synchronous exception there can white-screen the
// whole app. These helpers degrade gracefully (treat storage as empty) instead
// of crashing, so the marketplace still loads for every visitor.

export function getItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    // Private mode / quota exceeded / storage disabled — ignore.
    return false;
  }
}

export function removeItem(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to do if storage is unavailable.
  }
}
