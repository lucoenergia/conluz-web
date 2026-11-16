import type { FC, ReactNode } from "react";
import { TextField } from "@mui/material";
import { colors } from "../../theme/tokens";

export interface ReadOnlyFieldProps {
  label: string;
  value: string;
  /** Why the value cannot be changed here, when the screen says so. */
  helperText?: ReactNode;
  id?: string;
}

/**
 * A value shown in a form that can never be edited from its screen
 * (UI-FRM-003): a grey fill, the value at full contrast, no caret and none of
 * the editable inputs' hover or focus border. It stays focusable, so Tab and a
 * screen reader reach its label and value, and the value can be selected.
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
    variant="outlined"
    slotProps={{ input: { readOnly: true } }}
    sx={{
      "& .MuiOutlinedInput-root": {
        bgcolor: colors.background.readOnly,
        // Opts out of the theme's hover and focus border, which marks an
        // input that can be typed into.
        "& fieldset, &:hover fieldset, &.Mui-focused fieldset": {
          borderColor: colors.border.inactive,
          borderWidth: 1,
        },
        // Focus is drawn inside the field's own box, so no overlay container
        // can clip it; the 1px border covers the outer pixel of the 3px ring.
        "&.Mui-focused": {
          boxShadow: `inset 0 0 0 3px ${colors.secondary.main}`,
        },
      },
      "& .MuiInputBase-input": {
        color: colors.text.primary,
        cursor: "default",
        caretColor: "transparent",
      },
      "& .MuiInputLabel-root.Mui-focused": {
        color: "text.secondary",
      },
    }}
  />
);
