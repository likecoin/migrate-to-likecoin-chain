export function trySetLocalStorage(key, value) {
  if (window.localStorage) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (err) {
      // no op
    }
  }
  return false;
}

export function tryGetLocalStorage(key) {
  if (window.localStorage) {
    try {
      const value = window.localStorage.getItem(key);
      return value;
    } catch (err) {
      // no op
    }
  }
  return undefined;
}

export function tryClearLocalStorage(key) {
  if (window.localStorage) {
    try {
      window.localStorage.clearItem(key);
      return true;
    } catch (err) {
      // no op
    }
  }
  return false;
}
