import { Box } from "@mui/material";
import type { FC } from "react";
import { Outlet } from "react-router";

export const PublicLayout: FC = () => {
  return (
    <Box sx={{ p: 2 }}>
      <Outlet />
    </Box>
  );
};
