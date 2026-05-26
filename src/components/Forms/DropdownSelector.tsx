import { Autocomplete, TextField, Box, Paper, Chip, InputAdornment, CircularProgress } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { radii, shadows, colors, alphas } from "../../theme/tokens";
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
  const theme = useTheme();
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
        borderRadius: radii.default,
        boxShadow: shadows.soft,
        p: { xs: 1.5, sm: 2 },
        transition: "all 0.3s ease",
        "&:hover": {
          boxShadow: shadows.dataCard,
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
              borderRadius: radii.default,
              overflow: "hidden",
              "& .MuiAutocomplete-listbox": {
                "& .MuiAutocomplete-option": {
                  transition: "all 0.2s ease",
                  "&:hover": {
                    background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, rgba(118,75,162,0.1) 100%)`,
                  },
                  "&[aria-selected='true']": {
                    background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, rgba(118,75,162,0.15) 100%)`,
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
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { sx: _sx, ...otherProps } = props as React.HTMLAttributes<HTMLLIElement> & { sx?: unknown };
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
              <ElectricMeterIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
              <span>{option.label}</span>
            </Box>
            {selectedValue?.value === option.value && (
              <CheckCircleIcon sx={{ color: theme.palette.primary.main, fontSize: 18 }} />
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
                background: theme.palette.primary.main,
                color: "white",
                "& .MuiChip-deleteIcon": {
                  color: alphas.white.heavy,
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
                    <CircularProgress size={20} sx={{ color: theme.palette.primary.main }} />
                  ) : (
                    icon
                  )}
                </InputAdornment>
              ),
              sx: {
                borderRadius: radii.default,
                "& fieldset": {
                  borderColor: colors.border.light,
                  borderWidth: 2,
                  transition: "all 0.3s ease",
                },
                "&:hover fieldset": {
                  borderColor: theme.palette.primary.main,
                },
                "&.Mui-focused fieldset": {
                  borderColor: theme.palette.primary.main,
                  borderWidth: 2,
                  background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, rgba(118,75,162,0.05) 100%)`,
                },
              },
            }}
            InputLabelProps={{
              sx: {
                color: "text.secondary",
                "&.Mui-focused": {
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                },
              },
            }}
            sx={{
              "& .MuiInputBase-root": {
                backgroundColor: alphas.white.strong,
                backdropFilter: "blur(10px)",
              },
            }}
          />
        )}
      />
    </Box>
  );
};