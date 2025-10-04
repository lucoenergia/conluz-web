import { InputBase, Paper, InputAdornment, IconButton } from "@mui/material";
import { useState, type FC } from "react";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

interface EnhancedSearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const EnhancedSearchBar: FC<EnhancedSearchBarProps> = ({
  value = "",
  onChange,
  placeholder = "Buscar punto de suministro...",
  className,
}) => {
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
        borderRadius: 3,
        background: isFocused
          ? "linear-gradient(135deg, rgba(102,126,234,0.08) 0%, rgba(118,75,162,0.08) 100%)"
          : "white",
        border: "2px solid",
        borderColor: isFocused ? "#667eea" : "#e2e8f0",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: isFocused
          ? "0 10px 40px 0 rgba(102,126,234,0.15)"
          : "0 4px 20px 0 rgba(0,0,0,0.08)",
        "&:hover": {
          borderColor: "#667eea",
          boxShadow: "0 6px 24px 0 rgba(102,126,234,0.12)",
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
                color: isFocused ? "#667eea" : "#94a3b8",
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
                    color: "#667eea",
                    bgcolor: "rgba(102,126,234,0.08)",
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