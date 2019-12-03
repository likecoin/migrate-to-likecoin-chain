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

export function checkIsMobileClient() {
  if (!global.window) return false;
  const ua = global.window.navigator.userAgent;
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(ua)) {
    return true;
  }
  return false;
}

export function checkIsSafari() {
  if (!global.window) return false;
  const ua = global.window.navigator.userAgent;
  return (/ Safari\/\d/.test(ua) && !/ Chrome\/\d/.test(ua));
}
