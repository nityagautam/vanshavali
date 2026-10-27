import { useSyncExternalStore } from 'react';

// "Install app" support. Chrome/Edge/Android fire `beforeinstallprompt`, which
// must be captured early and replayed on a user gesture; iOS Safari has no
// prompt, so we show Add-to-Home-Screen instructions instead. This module is
// imported from main.jsx so the event is never missed.
let deferred = null;
let installed = false;
const listeners = new Set();
const emit = () => { snapshot = compute(); listeners.forEach(fn => fn()); };

const standalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS

function compute() {
  const ios = isIOS();
  const done = installed || standalone();
  return {
    installed: done,
    ios,
    canPrompt: !!deferred,
    // Offer the entry when it can actually do something useful.
    available: !done && (!!deferred || ios),
  };
}
let snapshot = compute();

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; emit(); });
window.addEventListener('appinstalled', () => { deferred = null; installed = true; emit(); });

export function useInstall() {
  return useSyncExternalStore(
    fn => { listeners.add(fn); return () => listeners.delete(fn); },
    () => snapshot,
  );
}

/** Show the browser's install prompt (Chrome/Edge/Android). Resolves to the outcome. */
export async function promptInstall() {
  if (!deferred) return 'unavailable';
  try {
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    emit();
    return outcome;
  } catch {
    // The browser refused (e.g. no user gesture) — let the caller show instructions.
    return 'unavailable';
  }
}
