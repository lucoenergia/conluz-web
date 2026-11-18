import type { FC, ReactNode } from "react";
import { TextField } from "@mui/material";
import { colors, radii } from "../../theme/tokens";

export interface ReadOnlyFieldProps {
  label: string;
  value: string;
  /** Why the value cannot be changed here, when the screen says so. */
  helperText?: ReactNode;
  id?: string;
}

/**
 * A value shown in a form that can never be edited from its screen
 * (UI-FRM-003): a filled field with its label inside, no outline or underline,
 * a grey fill that holds on hover and focus, the value at full contrast and no
 * caret. It differs from the outlined editable inputs by its shape, not only by
 * its colour. It stays focusable, so Tab and a screen reader reach its label
 * and value, and the value can be selected.
 *
 * The label is `secondary.main`: it reads at 4.5:1 or more on the fill, where
 * MUI's default label colour does not, and stays distinct from the value. It
 * never turns to the editable inputs' focus colour.
 *
 * Only for a value that is never editable. An input read-only while its save
 * is in flight keeps the editable look (UI-OVL-002), so a save does not repaint
 * the form.
 */
export const ReadOnlyField: FC<ReadOnlyFieldProps> = ({ label, value, helperText, id }) => (
  <TextField
    id={id}
    label={label}
    value={value}
    helperText={helperText}
    fullWidth
    variant="filled"
    slotProps={{ input: { readOnly: true, disableUnderline: true } }}
    sx={{
      "& .MuiFilledInput-root": {
        borderRadius: radii.default,
        backgroundColor: colors.background.readOnly,
        // Opts out of MUI's filled hover and focus fill, which marks an input
        // that can be typed into.
        "&:hover": {
          backgroundColor: colors.background.readOnly,
        },
        // Focus is drawn inside the field's own box, so no overlay container
        // can clip it, and it never crosses the label, which sits inside too.
        "&.Mui-focused": {
          backgroundColor: colors.background.readOnly,
          boxShadow: `inset 0 0 0 2px ${colors.secondary.main}`,
        },
      },
      "& .MuiInputBase-input": {
        color: colors.text.primary,
        cursor: "default",
        caretColor: "transparent",
      },
      // Beats the theme's focused label colour, kept for editable inputs.
      "& .MuiInputLabel-root": {
        color: colors.secondary.main,
        "&.Mui-focused": {
          color: colors.secondary.main,
        },
      },
    }}
  />
);
