import { createTheme } from "@mui/material";
import { colors } from "./tokens";

export const theme = createTheme({
  shape: {
    // Canonical base radius (px). radii.default = "8px" in tokens.ts.
    // MUI sx numeric shorthand (e.g. borderRadius: 2) is NOT used in this
    // project; all call sites use explicit px strings from the radii token.
    borderRadius: 8,
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    // h6 = modal/card titles: 1.25rem matches MUI default; 600 replaces the
    // inline triple (fontFamily + fontSize + fontWeight) that recurs in every modal.
    h6: { fontSize: "1.25rem", fontWeight: 600 },
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
  components: {
    // PR 1 — OutlinedInput hover/focus border colour centralised here so every
    // field in the app gets primary.main without repeating sx on each instance.
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          "&:hover fieldset": {
            borderColor: theme.palette.primary.main,
          },
          "&.Mui-focused fieldset": {
            borderColor: theme.palette.primary.main,
          },
        }),
      },
    },
    // Matching label colour on focus — pairs with the OutlinedInput override above.
    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          "&.Mui-focused": {
            color: theme.palette.primary.main,
          },
        }),
      },
    },
  },
});
