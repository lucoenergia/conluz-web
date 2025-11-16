import { Autocomplete, TextField, Box, Paper, Chip, InputAdornment, CircularProgress } from "@mui/material";
import React, { useMemo, type FC } from "react";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

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
  icon?: React.ReactNode;
}

export const DropdownSelector: FC<DropdownSelectorProps> = ({
  options,
  value,
  label,
  isLoading,
  onChange,
  icon = <ElectricMeterIcon />
}) => {
  const selectedValue = useMemo(() => {
    if (value === undefined) {
      return undefined;
    }
    const sv = options.find((option) => option.value === value);
    return sv ? sv : null;
  }, [options, value]);

  return (
    <Box
      sx={{
        background: "white",
        borderRadius: 2,
        boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
        p: { xs: 1.5, sm: 2 },
        transition: "all 0.3s ease",
        "&:hover": {
          boxShadow: "0 6px 24px 0 rgba(0,0,0,0.12)",
        },
      }}
    >
      <Autocomplete
        value={selectedValue}
        onChange={(_, newValue) => {
          if (onChange) {
            onChange(newValue ? newValue.value : null);
          }
        }}
        loading={isLoading}
        options={options}
        PaperComponent={({ children }) => (
          <Paper
            elevation={8}
            sx={{
              mt: 1,
              borderRadius: 2,
              overflow: "hidden",
              "& .MuiAutocomplete-listbox": {
                "& .MuiAutocomplete-option": {
                  transition: "all 0.2s ease",
                  "&:hover": {
                    background: "linear-gradient(90deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.1) 100%)",
                  },
                  "&[aria-selected='true']": {
                    background: "linear-gradient(90deg, rgba(102,126,234,0.15) 0%, rgba(118,75,162,0.15) 100%)",
                    fontWeight: 600,
                  },
                },
              },
            }}
          >
            {children}
          </Paper>
        )}
        renderOption={(props, option) => {
          const { sx: _, ...otherProps } = props as any;
          return (
            <Box
              component="li"
              {...otherProps}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                py: 1.5,
              }}
            >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ElectricMeterIcon sx={{ color: "#667eea", fontSize: 20 }} />
              <span>{option.label}</span>
            </Box>
            {selectedValue?.value === option.value && (
              <CheckCircleIcon sx={{ color: "#667eea", fontSize: 18 }} />
            )}
          </Box>
          );
        }}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              label={option.label}
              {...getTagProps({ index })}
              sx={{
                background: "#667eea",
                color: "white",
                "& .MuiChip-deleteIcon": {
                  color: "rgba(255, 255, 255, 0.7)",
                  "&:hover": {
                    color: "white",
                  },
                },
              }}
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            variant="outlined"
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  {isLoading ? (
                    <CircularProgress size={20} sx={{ color: "#667eea" }} />
                  ) : (
                    icon
                  )}
                </InputAdornment>
              ),
              sx: {
                borderRadius: 2,
                "& fieldset": {
                  borderColor: "#e2e8f0",
                  borderWidth: 2,
                  transition: "all 0.3s ease",
                },
                "&:hover fieldset": {
                  borderColor: "#667eea",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#667eea",
                  borderWidth: 2,
                  background: "linear-gradient(90deg, rgba(102,126,234,0.05) 0%, rgba(118,75,162,0.05) 100%)",
                },
              },
            }}
            InputLabelProps={{
              sx: {
                color: "#64748b",
                "&.Mui-focused": {
                  color: "#667eea",
                  fontWeight: 600,
                },
              },
            }}
            sx={{
              "& .MuiInputBase-root": {
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(10px)",
              },
            }}
          />
        )}
      />
    </Box>
  );
};