import type { FC } from "react";
import { useLoggedUser } from "../context/logged-user.context";
import { AuthenticatedLayout } from "./authenticated.layout";
import { PublicLayout } from "./public.layout";

export const DynamicLayout: FC = () => {
  const loggedUser = useLoggedUser();
  return loggedUser ? <AuthenticatedLayout /> : <PublicLayout />;
};
