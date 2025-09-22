import { Box } from "@mui/material";
import type { FC } from "react";
import { Outlet } from "react-router";

export const PublicLayout: FC = () => {
  return (
    <Box className="p-4">
      <Outlet />
    </Box>
  );
};
