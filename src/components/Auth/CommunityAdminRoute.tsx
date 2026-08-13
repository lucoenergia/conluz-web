import type { FC, ReactNode } from "react";
import { Navigate } from "react-router";
import { useActiveCommunityRole } from "../../hooks/useActiveCommunityRole";
import { CommunityRole } from "../../api/models";

interface CommunityAdminRouteProps {
  children: ReactNode;
}

export const CommunityAdminRoute: FC<CommunityAdminRouteProps> = ({ children }) => {
  const role = useActiveCommunityRole();

  if (role === CommunityRole.COMMUNITY_ADMIN) {
    return children;
  }
  return <Navigate replace to="/" />;
};
