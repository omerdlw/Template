export class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  subscribe(event, callback) {
    if (typeof event !== "string" || !event || typeof callback !== "function")
      return () => {};
    const listeners = this.events.get(event) || new Set();
    listeners.add(callback);
    this.events.set(event, listeners);

    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) this.events.delete(event);
    };
  }

  emit(event, payload) {
    for (const callback of this.events.get(event) || []) {
      try {
        callback(payload);
      } catch (error) {
        console.error(`[Events] Listener failed for ${event}`, error);
      }
    }
  }

  unsubscribeAll(event) {
    if (event) this.events.delete(event);
    else this.events.clear();
  }

  hasListeners(event) {
    return Boolean(this.events.get(event)?.size);
  }

  getListenerCount(event) {
    return this.events.get(event)?.size || 0;
  }

  getAllEvents() {
    return [...this.events.keys()];
  }
}

export const globalEvents = new EventEmitter();

export const EVENT_TYPES = Object.freeze({
  API_UNAUTHORIZED: "API_UNAUTHORIZED",
  API_FORBIDDEN: "API_FORBIDDEN",
  API_ERROR: "API_ERROR",
  API_RETRY: "API_RETRY",
  APP_ERROR: "APP_ERROR",
  AUTH_ERROR: "AUTH_ERROR",
  AUTH_READY: "AUTH_READY",
  AUTH_REFRESH: "AUTH_REFRESH",
  AUTH_SIGN_IN: "AUTH_SIGN_IN",
  AUTH_SIGN_OUT: "AUTH_SIGN_OUT",
  AUTH_SIGN_UP: "AUTH_SIGN_UP",
  AUTH_FEEDBACK: "AUTH_FEEDBACK",
  AUTH_UPDATE: "AUTH_UPDATE",
  AUTH_ACCOUNT_DELETE_START: "AUTH_ACCOUNT_DELETE_START",
  AUTH_ACCOUNT_DELETE_END: "AUTH_ACCOUNT_DELETE_END",
  MODULE_INIT: "MODULE_INIT",
  MODULE_READY: "MODULE_READY",
  MODULE_ERROR: "MODULE_ERROR",
  MODULE_CLEANUP: "MODULE_CLEANUP",
  STATE_CHANGE: "STATE_CHANGE",
  REGISTRY_UPDATE: "REGISTRY_UPDATE",
  NAV_EXPAND: "NAV_EXPAND",
  NAV_COLLAPSE: "NAV_COLLAPSE",
  NAV_NAVIGATE: "NAV_NAVIGATE",
  NAV_NOT_FOUND: "NAV_NOT_FOUND",
  NAV_GUARD: "NAV_GUARD",
  MODAL_OPEN: "MODAL_OPEN",
  MODAL_CLOSE: "MODAL_CLOSE",
  LOADING_START: "LOADING_START",
  LOADING_END: "LOADING_END",
  TRANSITION_START: "TRANSITION_START",
  TRANSITION_END: "TRANSITION_END",
});
