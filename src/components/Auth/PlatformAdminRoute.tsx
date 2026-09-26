import type { FC, ReactNode } from "react";
import { Navigate } from "react-router";
import { useIsPlatformAdmin } from "../../hooks/permissions/useActiveCommunityRole";

interface PlatformAdminRouteProps {
  children: ReactNode;
}

export const PlatformAdminRoute: FC<PlatformAdminRouteProps> = ({ children }) => {
  const isPlatformAdmin = useIsPlatformAdmin();

  if (isPlatformAdmin) {
    return children;
  }
  return <Navigate replace to="/" />;
};
