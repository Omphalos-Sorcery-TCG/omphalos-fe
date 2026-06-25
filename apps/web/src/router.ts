import { useSyncExternalStore } from "react";

/**
 * Minimal dependency-free router for the two views (home + search results).
 * The current location (`pathname + search`) is the single source of truth;
 * components read it with useLocation() and change it with navigate().
 */

const NAV_EVENT = "omphalos:navigate";

function subscribe(callback: () => void): () => void {
  window.addEventListener("popstate", callback);
  window.addEventListener(NAV_EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(NAV_EVENT, callback);
  };
}

function getSnapshot(): string {
  return window.location.pathname + window.location.search;
}

/** Subscribe to the current location string (re-renders on navigation). */
export function useLocation(): string {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/** Navigate to `to` ("/path?query"). Use `replace` to avoid a history entry. */
export function navigate(to: string, opts: { replace?: boolean } = {}): void {
  if (to === getSnapshot()) return; // already here — don't stack duplicates
  if (opts.replace) window.history.replaceState(null, "", to);
  else window.history.pushState(null, "", to);
  window.dispatchEvent(new Event(NAV_EVENT));
}
