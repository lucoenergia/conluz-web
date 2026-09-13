import type { FC } from "react";
import { Box, CircularProgress } from "@mui/material";

/**
 * Placeholder shown while a lazily-loaded route chunk arrives.
 *
 * Rendered inside each layout rather than around the whole router, so the app
 * shell — header, sidebar, logo — stays painted and only the content area
 * waits. The spinner inherits its accessible name from the theme's
 * MuiCircularProgress default, so the wait is announced rather than silent.
 */
export const RouteFallback: FC = () => (
  <Box role="status" sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
    <CircularProgress />
  </Box>
);
