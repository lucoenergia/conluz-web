"use client";

// ** MUI Theme Provider
import { deepmerge } from "@mui/utils";
import { ThemeOptions } from "@mui/material";

// ** Type Import
import { Settings } from "@/app/shared/context/settingsContext";

// ** Theme Override Imports
import palette from "./palette/DefaultPalette";
import spacing from "./spacing/spacing";
import shadows from "./shadows/Shadows";
import breakpoints from "./breakpoints/breakpoints";

const themeOptions = (settings: Settings): ThemeOptions => {
  // ** Vars
  const { mode, themeColor } = settings;

  const themeConfig = {
    palette: palette(mode, themeColor),
    typography: {
      fontFamily: [
        `var(--font-inter)`,
        `var(--font-lobster)`,
        "sans-serif",
        "-apple-system",
        "BlinkMacSystemFont",
        '"Segoe UI"',
        "Roboto",
        '"Helvetica Neue"',
        "Arial",
        "sans-serif",
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(","),
    },
    shadows: shadows(mode),
    ...spacing,
    breakpoints: breakpoints(),
    shape: {
      borderRadius: 6,
    },
    mixins: {
      toolbar: {
        minHeight: 64,
      },
    },
  };

  return deepmerge(themeConfig, {
    palette: {
      primary: {
        ...themeConfig.palette[themeColor],
      },
    },
  });
};

export default themeOptions;
