import { useEffect, useRef } from "react";

/**
 * The browser history behind every open overlay (#368): back closes the top
 * one instead of leaving the page.
 *
 * Each open layer pushes one entry with the URL it was opened on and the
 * history state it found, plus a marker naming the layer and its depth. Copying
 * the state keeps React Router's own `idx` and `key`, so when back pops the
 * marker entry `BrowserRouter` sees the same location: nothing remounts and
 * nothing refetches, and the router is not touched.
 *
 * - A back press lands on a shallower entry. Every layer deeper than the entry
 *   it landed on receives it, top first, which is one layer per press.
 * - A layer closed any other way gives its entry back with `history.back()`,
 *   so no extra step is left behind. That never happens inside the handler
 *   that closes it: it runs after React commits the close, and only while the
 *   current entry is still the layer's own.
 * - Until such a back has landed, anything that would push an entry (a new
 *   layer, a navigation through `useOverlayNavigate`) waits for its
 *   `popstate`. It waits on the event, never on a timer.
 *
 * A reload while a layer is open leaves its entry behind, inert: it costs one
 * extra back press. History entries cannot be removed, so that is accepted.
 */

const MARKER = "__overlay";

interface Marker {
  id: string;
  depth: number;
}

interface Layer {
  id: string;
  depth: number;
  /** Called on a back press. `true` keeps the layer open, guarded by a fresh entry. */
  onBack: () => boolean;
}

const layers: Layer[] = [];
/** Backs issued by this module whose `popstate` has not arrived yet. */
let pendingBacks = 0;
/** Work that must not run while a back of ours is still in flight. */
const waiting: Array<() => void> = [];
/** Releases deferred to a microtask, keyed by owner, so a StrictMode re-mount can cancel them. */
const pendingReleases = new Map<object, Layer>();
let nextId = 0;
let listening = false;

function markerOf(state: unknown): Marker | null {
  if (!state || typeof state !== "object" || !(MARKER in state)) return null;
  return (state as Record<typeof MARKER, Marker>)[MARKER];
}

function currentMarker(): Marker | null {
  return markerOf(window.history.state);
}

function currentDepth(): number {
  return currentMarker()?.depth ?? 0;
}

function pushEntry(layer: Layer) {
  const state = window.history.state && typeof window.history.state === "object" ? window.history.state : {};
  window.history.pushState({ ...state, [MARKER]: { id: layer.id, depth: layer.depth } }, "", window.location.href);
}

function goBack() {
  pendingBacks += 1;
  window.history.back();
}

/** Runs `task` now, or once every back this module issued has landed. */
function whenSettled(task: () => void) {
  if (pendingBacks === 0) task();
  else waiting.push(task);
}

function flushWaiting() {
  while (pendingBacks === 0 && waiting.length > 0) waiting.shift()!();
}

function remove(layer: Layer) {
  const index = layers.indexOf(layer);
  if (index !== -1) layers.splice(index, 1);
}

function onPopState() {
  if (pendingBacks > 0) {
    pendingBacks -= 1;
    flushWaiting();
    return;
  }
  const landed = currentDepth();
  const backed = layers.filter((layer) => layer.depth > landed).sort((a, b) => b.depth - a.depth);
  const kept: Layer[] = [];
  for (const layer of backed) {
    if (layer.onBack()) kept.push(layer);
    else remove(layer);
  }
  for (const layer of kept.sort((a, b) => a.depth - b.depth)) pushEntry(layer);
}

function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener("popstate", onPopState);
}

function acquire(owner: object, onBack: () => boolean): Layer {
  const deferred = pendingReleases.get(owner);
  if (deferred) {
    // StrictMode ran the cleanup and the effect again: the layer never left.
    pendingReleases.delete(owner);
    return deferred;
  }
  listen();
  nextId += 1;
  const layer: Layer = { id: `overlay-${nextId}`, depth: 0, onBack };
  layers.push(layer);
  whenSettled(() => {
    if (!layers.includes(layer)) return;
    layer.depth = Math.max(currentDepth(), ...layers.filter((other) => other !== layer).map((other) => other.depth)) + 1;
    pushEntry(layer);
  });
  return layer;
}

function release(owner: object, layer: Layer) {
  pendingReleases.set(owner, layer);
  queueMicrotask(() => {
    if (pendingReleases.get(owner) !== layer) return;
    pendingReleases.delete(owner);
    if (!layers.includes(layer)) return; // Closed by back, or handed to a navigation.
    remove(layer);
    whenSettled(() => {
      if (currentMarker()?.id === layer.id) goBack();
    });
  });
}

/**
 * Takes every layer whose entry is the current one, or that is about to give
 * its entry back, out of the registry without a back. Returns whether the
 * current entry belonged to one of them, in which case a navigation should
 * replace it.
 */
export function claimCurrentEntryForNavigation(): boolean {
  const marker = currentMarker();
  if (!marker) return false;
  for (const layer of [...layers]) remove(layer);
  for (const [owner, layer] of pendingReleases) {
    if (layer.id === marker.id) pendingReleases.delete(owner);
  }
  return true;
}

/** Runs a navigation once no back of this module is in flight, so the back cannot undo it. */
export function afterPendingBacks(task: () => void): void {
  whenSettled(task);
}

/**
 * Puts a layer on the back stack while `open`: one back press calls `onBack`.
 * Returning `true` keeps the layer open and guarded; anything else means the
 * caller closed it.
 *
 * `ResponsiveOverlay` uses it for itself. Exported only as a transitional
 * hook, for a stacked layer that is not a `ResponsiveOverlay` yet, so back
 * still closes the top layer first. Every use outside this folder carries a
 * `// temporary: #<issue>` comment naming the issue that migrates the layer.
 */
export function useBackDismiss(open: boolean, onBack: () => boolean | void): void {
  const owner = useRef({});
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  });

  useEffect(() => {
    if (!open) return;
    const ownerKey = owner.current;
    const layer = acquire(ownerKey, () => onBackRef.current() === true);
    return () => release(ownerKey, layer);
  }, [open]);
}

/**
 * Test-only: not exported from the index, and imported by specs from this
 * file. Resolves once every back this module issued has landed, releases
 * deferred by an unmount included, so a test starts from a quiet history:
 * jsdom drops a pending back when anything pushes an entry, and its
 * `popstate` would then never come.
 */
export async function overlayHistorySettled(): Promise<void> {
  // Let the releases queued by an unmount that just happened issue their backs.
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  await new Promise<void>((resolve) => whenSettled(resolve));
}
