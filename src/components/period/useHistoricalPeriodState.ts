import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import {
  anchorEnd,
  formatDayParam,
  parseSelection,
  resolvePeriod,
  settleSelection,
  writeSelection,
  type Anchor,
  type PeriodResolution,
  type PeriodSelection,
  type PresetDefinition,
} from "./historicalPeriod";
import type { HistoricalAnchor } from "./useHistoricalAnchor";

export interface HistoricalPeriodState {
  /** What the page shows: the query string's selection, settled against the anchor. */
  selection: PeriodSelection;
  /** The period it stands for; null until the anchor has resolved. */
  resolution: PeriodResolution | null;
  select: (selection: PeriodSelection) => void;
  /** Why the period was adjusted to the anchor, or empty. */
  clampNotice: string;
}

/** What the page's period is made of. */
export interface HistoricalPeriodConfig {
  /** The presets the page offers, in order. */
  presets: readonly PresetDefinition[];
  /** No ?period=, and where a selection that cannot be shown falls back to. */
  defaultPreset: PresetDefinition;
  /** The selected scope: a clamp notice is about one scope's anchor, and another scope's says nothing of it. */
  scopeKey: string;
  /** Why the period was adjusted to the anchor, in the page's words. */
  clampNotice: (anchor: Anchor) => string;
}

const selectionKey = (selection: PeriodSelection) =>
  selection.kind === "custom" ? `custom:${formatDayParam(selection.from)}:${formatDayParam(selection.to)}` : selection.kind;

/**
 * The period selection held in the query string, next to the page's other
 * parameters (UI-HIS-009): ?period= one of the page's presets or custom, with
 * ?from= and ?to= as calendar days for a custom range. No ?period= is the
 * page's default preset.
 *
 * The selection is settled against the anchor every time one resolves
 * (UI-HIS-008, `settleSelection`), and the query string is rewritten to match,
 * with `replace`. Only then: while the anchor is pending, after it failed or
 * when nothing is published, nothing is known about what can be shown, so the
 * address is left alone.
 */
export function useHistoricalPeriodState(
  anchor: HistoricalAnchor,
  { presets, defaultPreset, scopeKey: scope, clampNotice }: HistoricalPeriodConfig,
): HistoricalPeriodState {
  const [searchParams, setSearchParams] = useSearchParams();
  const [notice, setNotice] = useState<{ message: string; key: string } | null>(null);

  const parsed = parseSelection(searchParams, presets, defaultPreset);
  const ready = anchor.status === "ready" ? anchor.anchor : null;
  const settled = ready ? settleSelection(parsed, ready, presets, defaultPreset) : null;
  const selection = settled?.selection ?? parsed ?? { kind: defaultPreset.value };
  // The notice is about one scope's anchor; another scope's says nothing of it.
  const scopeKey = ready ? `${scope}:${ready.kind}:${formatDayParam(anchorEnd(ready))}` : "";

  const rewrite = settled?.rewrite ?? false;
  const adjusted = settled?.adjusted ?? false;
  const settledKey = selectionKey(selection);
  const message = ready && adjusted ? clampNotice(ready) : "";

  useEffect(() => {
    if (!rewrite) return;
    setSearchParams((params) => writeSelection(params, selection), { replace: true });
    if (message) setNotice({ message, key: scopeKey });
    // `selection` is keyed by settledKey: the object is rebuilt on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rewrite, settledKey, message, scopeKey, setSearchParams]);

  const select = (next: PeriodSelection) => {
    setNotice(null);
    setSearchParams((params) => writeSelection(params, next), { replace: true });
  };

  return {
    selection,
    resolution: ready ? resolvePeriod(ready, selection, presets) : null,
    select,
    clampNotice: notice && notice.key === scopeKey ? notice.message : "",
  };
}
