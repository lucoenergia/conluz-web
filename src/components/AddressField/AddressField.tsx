import type { ChangeEvent, FC, KeyboardEvent } from "react";
import { TextField, type TextFieldProps } from "@mui/material";

/** The most characters an address may have, as the API declares it (lucoenergia/conluz#574). */
export const ADDRESS_MAX_LENGTH = 250;

const LINE_BREAK = /\r\n|\r|\n/g;

export type AddressFieldProps = Omit<
  TextFieldProps,
  "multiline" | "rows" | "minRows" | "maxRows" | "type" | "onChange" | "onKeyDown"
> & {
  /** The value as typed, every line break already replaced by a space. */
  onValueChange: (value: string) => void;
  /** While the form's write is in flight. */
  readOnly?: boolean;
};

/**
 * The address input of every record form (#411): up to ADDRESS_MAX_LENGTH
 * characters, shown on as many lines as it needs, from one to four. The value
 * stays one line: Enter submits the form, as in a single-line input, and a line
 * break that arrives any other way (paste, drop, autofill) becomes a space.
 */
export const AddressField: FC<AddressFieldProps> = ({ onValueChange, readOnly, slotProps, ...props }) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onValueChange(event.target.value.replace(LINE_BREAK, " "));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Enter confirms a composition (an IME) rather than the form.
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    (event.target as HTMLTextAreaElement).form?.requestSubmit();
  };

  const htmlInput = slotProps?.htmlInput;
  return (
    <TextField
      fullWidth
      variant="outlined"
      {...props}
      multiline
      minRows={1}
      maxRows={4}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      slotProps={{
        ...slotProps,
        htmlInput: {
          ...(typeof htmlInput === "object" ? htmlInput : {}),
          maxLength: ADDRESS_MAX_LENGTH,
          ...(readOnly === undefined ? {} : { readOnly }),
        },
      }}
    />
  );
};
