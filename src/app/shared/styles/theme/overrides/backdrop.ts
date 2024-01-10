"use client";

// ** MUI Imports
import { Theme } from "@mui/material/styles";

// ** Util Import
import { hexToRGBA } from "@/app/shared/utils/utils";

const Backdrop = (theme: Theme) => {
  return {
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor:
            theme.palette.mode === "light"
              ? `rgba(${theme.palette.customColors.main}, 0.7)`
              : hexToRGBA(theme.palette.background.default, 0.7),
        },
        invisible: {
          backgroundColor: "transparent",
        },
      },
    },
  };
};

export default Backdrop;
