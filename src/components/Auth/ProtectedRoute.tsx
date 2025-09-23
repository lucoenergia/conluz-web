import type { FC, ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../../context/auth.context";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: FC<ProtectedRouteProps> = ({ children }) => {
  const token = useAuth();
  if (token) {
    return children;
  }
  return <Navigate replace to="login" />;
};
