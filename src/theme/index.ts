import { createTheme } from "@mui/material";
import { colors, shadows, radii } from "./tokens";

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
    // MenuItem defaults: standard nav-item layout and hover colour
    // encoded once instead of repeated in ProfileMenu, DisplayMenu, PlantCard.
    // Danger/success hover colours remain in local sx (they win over this default).
    MuiMenuItem: {
      styleOverrides: {
        root: {
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 12,
          paddingBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          width: "100%",
          "&:hover": {
            backgroundColor: "#f8fafc",
          },
        },
      },
    },
    // DialogTitle resolves to the Phase-3 h6 variant (1.25rem/600)
    // so future dialogs don't re-specify fontSize/fontWeight individually.
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          typography: "h6",
        },
      },
    },
    // Button: textTransform:none + brand shadow as defaults.
    // Instances that already set a unique boxShadow (e.g. brand-tinted alpha)
    // keep their local sx — sx wins over styleOverrides.
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: radii.default,
        },
        contained: {
          boxShadow: shadows.medium,
          "&:hover": {
            boxShadow: shadows.strong,
          },
        },
      },
    },
    // Card baseline: soft shadow + hover lift as defaults.
    // Existing cards with explicit sx boxShadow (state-based hover) are unaffected
    // because sx wins over styleOverrides.
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          boxShadow: shadows.soft,
          transition: "box-shadow 0.2s ease",
          "&:hover": {
            boxShadow: shadows.medium,
          },
        },
      },
    },
    // OutlinedInput hover/focus border colour centralised here so every
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
