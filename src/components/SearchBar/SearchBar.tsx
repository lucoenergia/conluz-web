import { InputBase, Paper, InputAdornment, IconButton } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { radii, shadows } from "../../theme/tokens";
import { useState, type FC } from "react";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

export interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: FC<SearchBarProps> = ({
  value = "",
  onChange,
  placeholder = "Buscar punto de suministro...",
  className,
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(event.target.value);
  };

  const handleClear = () => {
    onChange?.("");
  };

  return (
    <Paper
      className={className}
      elevation={0}
      sx={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        maxWidth: { xs: "100%", sm: 400 },
        borderRadius: radii.large,
        background: isFocused
          ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, rgba(118,75,162,0.08) 100%)`
          : "white",
        border: "2px solid",
        borderColor: isFocused ? theme.palette.primary.main : "#e2e8f0",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: isFocused
          ? `0 10px 40px 0 ${alpha(theme.palette.primary.main, 0.15)}`
          : shadows.soft,
        "&:hover": {
          borderColor: theme.palette.primary.main,
          boxShadow: `0 6px 24px 0 ${alpha(theme.palette.primary.main, 0.12)}`,
        },
      }}
    >
      <InputBase
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        sx={{
          flex: 1,
          px: 2,
          py: 1.5,
          "& .MuiInputBase-input": {
            fontSize: "0.95rem",
            "&::placeholder": {
              color: "#94a3b8",
              opacity: 1,
            },
          },
        }}
        startAdornment={
          <InputAdornment position="start">
            <SearchIcon
              sx={{
                color: isFocused ? theme.palette.primary.main : "#94a3b8",
                transition: "color 0.3s ease",
                ml: 1,
              }}
            />
          </InputAdornment>
        }
        endAdornment={
          value && (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={handleClear}
                sx={{
                  mr: 0.5,
                  color: "#94a3b8",
                  "&:hover": {
                    color: theme.palette.primary.main,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          )
        }
      />
    </Paper>
  );
};