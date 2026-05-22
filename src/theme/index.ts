import { createTheme } from "@mui/material";
import { colors } from "./tokens";

export const theme = createTheme({
  shape: {
    // Canonical base radius (px). radii.default = "8px" in tokens.ts.
    // MUI sx numeric shorthand (e.g. borderRadius: 2) is NOT used in this
    // project; all call sites use explicit px strings from the radii token.
    borderRadius: 8,
  },
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
