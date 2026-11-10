import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import type { SupplyResponse } from "../../api/models";
import {
  formatDayParam,
  monthYearName,
  parseSelection,
  resolvePeriod,
  settleSelection,
  writeSelection,
  type CalendarMonth,
  type PeriodResolution,
  type PeriodSelection,
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

function clampNoticeFor(selected: SupplyResponse | null, anchor: CalendarMonth): string {
  const subject = selected ? "Este punto tiene" : "Tus puntos tienen";
  return `${subject} datos publicados hasta ${monthYearName(anchor)}, así que hemos ajustado el periodo.`;
}

const selectionKey = (selection: PeriodSelection) =>
  selection.kind === "custom" ? `custom:${formatDayParam(selection.from)}:${formatDayParam(selection.to)}` : selection.kind;

/**
 * The period selection held in the query string, next to ?supplyId=
 * (UI-HIS-009): ?period=latest|year|last12|custom, with ?from= and ?to= as
 * calendar days for a custom range. No ?period= is "Último mes publicado".
 *
 * The selection is settled against the anchor every time one resolves
 * (UI-HIS-008, `settleSelection`), and the query string is rewritten to match,
 * with `replace`. Only then: while the anchor is pending, after it failed or
 * when nothing is published, nothing is known about what can be shown, so the
 * address is left alone.
 */
export function useHistoricalPeriodState(anchor: HistoricalAnchor, selected: SupplyResponse | null): HistoricalPeriodState {
  const [searchParams, setSearchParams] = useSearchParams();
  const [notice, setNotice] = useState<{ message: string; key: string } | null>(null);

  const parsed = parseSelection(searchParams);
  const ready = anchor.status === "ready" ? anchor.anchor : null;
  const settled = ready ? settleSelection(parsed, ready) : null;
  const selection = settled?.selection ?? parsed ?? { kind: "latest" };
  // The notice is about one scope's anchor; another scope's says nothing of it.
  const scopeKey = ready ? `${selected?.id ?? "all"}:${ready.year}-${ready.month}` : "";

  const rewrite = settled?.rewrite ?? false;
  const adjusted = settled?.adjusted ?? false;
  const settledKey = selectionKey(selection);
  const message = ready && adjusted ? clampNoticeFor(selected, ready) : "";

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
    resolution: ready ? resolvePeriod(ready, selection) : null,
    select,
    clampNotice: notice && notice.key === scopeKey ? notice.message : "",
  };
}
