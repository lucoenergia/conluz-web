import { Box } from "@mui/material";
import { Suspense, type FC } from "react";
import { Outlet } from "react-router";
import { RouteFallback } from "../components/RouteFallback";

export const PublicLayout: FC = () => {
  return (
    <Box sx={{ p: 2 }}>
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </Box>
  );
};
