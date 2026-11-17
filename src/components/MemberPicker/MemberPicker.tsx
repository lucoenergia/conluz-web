import type { FC, Ref } from "react";
import { Autocomplete, Box, CircularProgress, TextField } from "@mui/material";
import type { MembershipResponse } from "../../api/models";
import { memberPickerOptions, type MemberPickerStatus } from "./memberPickerOptions";

export interface MemberPickerProps {
  /** The memberships to offer, in the order they are shown. */
  options: MembershipResponse[];
  status: MemberPickerStatus;
  /** The chosen membership's id, `null` for none. */
  value: string | null;
  onChange: (membership: MembershipResponse | null) => void;
  label: string;
  required?: boolean;
  /** A refusal shown on the input, until the screen clears it. */
  error?: string;
  /** What the input says when there is nobody to offer. */
  emptyText: string;
  /** What the input says when the roster could not be read. */
  errorText: string;
  /** Leaves a membership out of the options, keeping the order of the rest. */
  exclude?: (membership: MembershipResponse) => boolean;
  /** A state shown after an option's name, or null for none. */
  stateLabel?: (membership: MembershipResponse) => string | null;
  /** While a save is in flight, nothing can be changed. */
  readOnly?: boolean;
  inputRef?: Ref<HTMLInputElement>;
}

const optionLabel = (option: MembershipResponse) => `${option.fullName} (${option.personalId})`;

/**
 * Chooses one membership of a community's roster. It fetches nothing: the
 * screen hands it the options and where their read stands, and it says in
 * visible text when there is nobody to choose.
 */
export const MemberPicker: FC<MemberPickerProps> = ({
  options,
  status,
  value,
  onChange,
  label,
  required = false,
  error,
  emptyText,
  errorText,
  exclude,
  stateLabel,
  readOnly = false,
  inputRef,
}) => {
  const offered = memberPickerOptions(options, exclude);
  // Resolved against the options on every render: a list for another
  // community does not hold it, so the selection clears itself.
  const selected = offered.find((membership) => membership.id === value) ?? null;
  const loading = status === "loading";
  const notice = status === "error" ? errorText : status === "ready" && offered.length === 0 ? emptyText : undefined;

  return (
    <Autocomplete
      options={offered}
      getOptionLabel={optionLabel}
      // Two members may share a label; the membership is what identifies them.
      getOptionKey={(option) => option.id}
      isOptionEqualToValue={(option, chosen) => option.id === chosen.id}
      value={selected}
      onChange={(_, membership) => onChange(membership)}
      loading={loading}
      readOnly={readOnly}
      renderOption={
        stateLabel
          ? ({ key, ...props }, option) => {
              const state = stateLabel(option);
              return (
                <li key={key} {...props}>
                  {optionLabel(option)}
                  {state && (
                    <Box component="span" sx={{ ml: 1, color: "text.secondary" }}>
                      · {state}
                    </Box>
                  )}
                </li>
              );
            }
          : undefined
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          variant="outlined"
          inputRef={inputRef}
          error={!!error || status === "error"}
          helperText={error ?? notice}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
};
