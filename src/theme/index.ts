import { createTheme } from "@mui/material";
import { esES } from "@mui/material/locale";
import { esES as pickersEsES } from "@mui/x-date-pickers/locales";
import { colors, shadows, radii } from "./tokens";

const themeOptions: Parameters<typeof createTheme>[0] = {
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
    // `.main` is the tone that is safe in every direction — as type on white, as
    // an icon, and as a fill behind white text — so MUI's own components (Button,
    // Chip, Alert) are accessible by default without any call site opting in.
    // `.light` carries the vivid decorative tone for chart marks and large fills;
    // it is ~3:1 and must never sit behind small text.
    primary: {
      main: colors.brand.main,
      dark: colors.brand.dark,
      light: colors.brand.light,
      contrastText: colors.brand.contrastText,
    },
    secondary: {
      main: colors.secondary.main,
      dark: colors.secondary.dark,
    },
    success: {
      main: colors.success.main,
      dark: colors.success.dark,
      light: colors.success.vivid,
      contrastText: colors.brand.contrastText,
    },
    error: {
      main: colors.error.main,
      dark: colors.error.dark,
      light: colors.error.vivid,
      contrastText: colors.brand.contrastText,
    },
    warning: {
      main: colors.warning.main,
      dark: colors.warning.dark,
      light: colors.warning.vivid,
      contrastText: colors.brand.contrastText,
    },
    info: {
      main: colors.info.main,
      dark: colors.info.dark,
      light: colors.info.vivid,
      contrastText: colors.brand.contrastText,
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
    // background.surface (#f8fafc) is available via colors.background.surface for
    // call sites that need it outside of the theme palette shorthand.
  },
  components: {
    // Controls whose drawn size is smaller than a fingertip. Each grows its HIT
    // AREA under a coarse pointer without changing what is drawn, so the visual
    // density survives while the target clears 44px. Keyed off the pointer, not
    // the viewport, so a touchscreen laptop is covered too.
    MuiChip: {
      styleOverrides: {
        // Only clickable chips: a status chip in a table is not a target.
        clickable: {
          "@media (pointer: coarse)": {
            position: "relative",
            "&::after": {
              content: '""',
              position: "absolute",
              left: 0,
              right: 0,
              top: "50%",
              transform: "translateY(-50%)",
              height: 44,
            },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        // `size="small"` resolves to 5px padding around an 18px glyph — a 28px
        // target. That clears WCAG 2.5.8 (24px) but misses 2.5.5 (44px) and the
        // platform guidelines (Apple 44pt, Material 48dp).
        //
        // Keyed off the POINTER rather than the viewport: a mouse can hit 28px
        // precisely and dense tables benefit from staying dense, while a finger
        // cannot. Touch and stylus get the full target; nothing moves for mouse
        // users. This also covers touchscreen laptops, which a width-based
        // breakpoint would miss entirely.
        root: {
          "@media (pointer: coarse)": {
            minWidth: 44,
            minHeight: 44,
          },
        },
      },
    },
    MuiTypography: {
      defaultProps: {
        // MUI maps subtitle1/subtitle2 onto <h6> elements by default, so every
        // subtitle in the app emitted a heading — including the user's name in
        // the profile menu, which landed in the document outline above the
        // page's own <h1>. Subtitles are styling, not document structure.
        variantMapping: {
          subtitle1: "p",
          subtitle2: "p",
        },
      },
    },
    // Every CircularProgress already ships role="progressbar", but without an
    // accessible name a screen reader announces an anonymous progress bar.
    // Naming it here covers every spinner in the app at once.
    MuiCircularProgress: {
      defaultProps: {
        "aria-label": "Cargando",
      },
    },
    // MenuItem defaults: standard nav-item layout and hover colour
    // encoded once instead of repeated in ProfileMenu, DisplayMenu, PlantCard.
    // Danger/success hover colours remain in local sx (they win over this default).
    MuiMenuItem: {
      styleOverrides: {
        root: {
          // Finger-sized under a coarse pointer; 27px drawn is not.
          "@media (pointer: coarse)": { minHeight: 44 },
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
          // 41px drawn is close, but a finger target should clear 44.
          "@media (pointer: coarse)": { minHeight: 44 },
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
};

/**
 * Locale bundles are passed as trailing arguments so every MUI component picks
 * up Spanish strings at once.
 *
 * Without them the interface leaked English into assistive technology on a
 * Spanish UI — the pagination arrows announced "Go to previous page". Those
 * strings live inside MUI's defaults, so no amount of application copy reaches
 * them; only the locale bundle does. The pickers bundle is included because
 * @mui/x-date-pickers is already a dependency and would leak the same way.
 */
export const theme = createTheme(themeOptions, esES, pickersEsES);
