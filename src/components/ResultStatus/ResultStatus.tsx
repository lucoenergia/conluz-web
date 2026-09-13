import type { FC } from "react";
import { Box } from "@mui/material";
import { visuallyHidden } from "@mui/utils";

/** Both forms, because Spanish plurals are not suffix-derivable:
 *  `comunidad` → `comunidades`, but `socio` → `socios`. */
export interface ResultNoun {
  one: string;
  other: string;
}

export interface ResultStatusProps {
  isLoading?: boolean;
  /** Number of records currently rendered. */
  count: number;
  noun: ResultNoun;
  /** What to announce when the result set is empty. */
  emptyMessage: string;
  /** BCP-47 tag used to pick the plural form. */
  locale?: string;
}

/**
 * Announces the outcome of loading a list.
 *
 * A spinner with an accessible name says "busy"; nothing said when it finished.
 * A sighted user sees rows appear, a screen-reader user heard "Cargando" and
 * then silence. This is a PERSISTENT region — it stays mounted and only its
 * text changes, because a live region inserted at the same moment as its
 * content is unreliably announced.
 *
 * `polite` rather than `assertive`: finishing a load should not interrupt
 * whatever the user is reading. Render once per page so it covers the table and
 * the stacked list alike.
 *
 * Plural selection goes through `Intl.PluralRules` rather than a `count === 1`
 * check, so the announcement stays correct when the interface gains languages
 * with more than two plural categories.
 */
export const ResultStatus: FC<ResultStatusProps> = ({
  isLoading,
  count,
  noun,
  emptyMessage,
  locale = "es-ES",
}) => {
  const form = new Intl.PluralRules(locale).select(count) === "one" ? noun.one : noun.other;
  return (
    <Box role="status" aria-live="polite" sx={visuallyHidden}>
      {isLoading ? "Cargando…" : count === 0 ? emptyMessage : `${count} ${form}`}
    </Box>
  );
};
