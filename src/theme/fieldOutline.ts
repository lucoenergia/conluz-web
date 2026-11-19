import type { CSSObject } from "@mui/material/styles";
import { colors } from "./tokens";

/**
 * One set of values for every input field's outline and fill: text, select,
 * autocomplete and date fields alike (UI-FRM-004, #432). MUI's default outline
 * (black at 23 %) is about 1.7:1 on white, below the 3:1 WCAG 1.4.11 asks of a
 * control's boundary; `text.placeholder` is 4.5:1 on white and 4.2:1 on the
 * page background. A disabled field keeps MUI's own look: it is exempt.
 */
export const fieldOutline = {
  color: colors.text.placeholder,
  hoverColor: colors.text.primary,
  focusedColor: colors.brand.main,
  focusedWidth: 2,
  errorColor: colors.error.main,
  fill: colors.background.paper,
} as const;

/** The class names an outlined input exposes for its outline and its states. */
export interface OutlinedFieldClasses {
  notchedOutline: string;
  focused: string;
  error: string;
  disabled: string;
}

/**
 * The outline and fill of an outlined input, for its root's style override.
 * MuiOutlinedInput and MuiPickersOutlinedInput both read it, so a date field
 * cannot drift from a text field. Every state but disabled is scoped to an
 * enabled field, so MUI's disabled look stays as it is.
 */
export function outlinedFieldStyles(classes: OutlinedFieldClasses): CSSObject {
  const outline = `.${classes.notchedOutline}`;
  return {
    [`&:not(.${classes.disabled})`]: {
      backgroundColor: fieldOutline.fill,
      [`& ${outline}`]: { borderColor: fieldOutline.color },
      [`&:hover:not(.${classes.focused}):not(.${classes.error}) ${outline}`]: { borderColor: fieldOutline.hoverColor },
      [`&.${classes.focused} ${outline}`]: { borderColor: fieldOutline.focusedColor, borderWidth: fieldOutline.focusedWidth },
      [`&.${classes.error} ${outline}`]: { borderColor: fieldOutline.errorColor },
    },
  };
}
