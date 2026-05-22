import { createTheme } from "@mui/material";
import { colors } from "./tokens";

export const theme = createTheme({
  palette: {
    primary: {
      main: colors.brand.main,
      dark: colors.brand.dark,
      contrastText: colors.brand.contrastText,
    },
    secondary: {
      main: colors.secondary.main,
      dark: colors.secondary.dark,
    },
    success: {
      main: colors.success,
    },
    error: {
      main: colors.error,
    },
    warning: {
      main: colors.warning,
    },
    text: {
      primary: colors.text.primary,
      secondary: colors.text.secondary,
    },
    divider: colors.divider,
    background: {
      default: colors.background.default,
      paper: colors.background.paper,
    },
  },
});
