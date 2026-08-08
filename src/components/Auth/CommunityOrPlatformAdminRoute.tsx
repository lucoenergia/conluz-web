import type { FC, ReactNode } from "react";
import { Navigate } from "react-router";
import { useActiveCommunityRole, useIsPlatformAdmin } from "../../hooks/useActiveCommunityRole";
import { CommunityRole } from "../../api/models";

interface CommunityOrPlatformAdminRouteProps {
  children: ReactNode;
}

export const CommunityOrPlatformAdminRoute: FC<CommunityOrPlatformAdminRouteProps> = ({ children }) => {
  const role = useActiveCommunityRole();
  const isPlatformAdmin = useIsPlatformAdmin();

  if (isPlatformAdmin || role === CommunityRole.COMMUNITY_ADMIN) {
    return children;
  }
  return <Navigate replace to="/" />;
};
