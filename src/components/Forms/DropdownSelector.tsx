import { Autocomplete, TextField } from "@mui/material";
import { useMemo, type FC } from "react";

interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownSelectorProps {
  options: DropdownOption[];
  value?: string | null;
  label: string;
  isLoading?: boolean;
  onChange?: (value: string | null) => void;
}

export const DropdownSelector: FC<DropdownSelectorProps> = ({ options, value, label, isLoading, onChange }) => {
  const selectedValue = useMemo(() => {
    if (value === undefined) {
      // Input is uncontrolled
      return undefined;
    }
    const sv = options.find((option) => option.value === value);
    return sv ? sv : null;
  }, [options, value]);
  return (
    <Autocomplete
      className="md:col-span-2 justify-self-start min-w-100"
      value={selectedValue}
      onChange={(_: any, newValue) => {
        if (onChange) {
          onChange(newValue ? newValue.value : null);
        }
      }}
      loading={isLoading}
      options={options}
      renderInput={(params) => <TextField key={params.id} {...params} label={label} />}
    />
  );
};
