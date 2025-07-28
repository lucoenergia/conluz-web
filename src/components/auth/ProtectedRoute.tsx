import type { FC, ReactNode } from "react"
import { Navigate } from "react-router";

interface ProtectedRouteProps {
  children: ReactNode
}

export const ProtectedRoute: FC<ProtectedRouteProps> = ({ children }) => {
  const token = window.localStorage.getItem('token');
  if(token) {
    return children
  }
  return <Navigate replace to="login"/>
}
