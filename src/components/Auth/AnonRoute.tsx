import type { FC, ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../../context/auth.context";

interface AnonRouteProps {
  children: ReactNode;
  /** Where a signed-in caller is sent instead. */
  redirectTo?: string;
}

export const AnonRoute: FC<AnonRouteProps> = ({ children, redirectTo = "/" }) => {
  const token = useAuth();
  if (!token) {
    return children;
  }
  return <Navigate replace to={redirectTo} />;
};
