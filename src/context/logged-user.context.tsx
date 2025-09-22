import { createContext, type ReactNode, useContext, useState } from "react";
import type { UserResponse } from "../api/models";

type Dispatch = (User: UserResponse | null) => void;

type LoggedUserProviderProps = { children: ReactNode };

const LoggedUserContext = createContext<UserResponse | null>(null);
const LoggedUserDispatchContext = createContext<Dispatch | null>(null);

const LoggedUserProvider = ({ children }: LoggedUserProviderProps) => {
  const [user, setUser] = useState<UserResponse | null>(null);

  return (
    <LoggedUserContext.Provider value={user}>
      <LoggedUserDispatchContext.Provider value={setUser}>{children}</LoggedUserDispatchContext.Provider>
    </LoggedUserContext.Provider>
  );
};

const useLoggedUser = (): UserResponse | null => {
  return useContext<UserResponse | null>(LoggedUserContext);
};

const useLoggedUserDispatch = (): Dispatch => {
  const context = useContext<Dispatch | null>(LoggedUserDispatchContext);

  if (context === null) {
    throw new Error("useLoggedUserDispatch must be used within a LoggedUserProvider");
  }
  return context;
};

export { LoggedUserProvider, useLoggedUser, useLoggedUserDispatch };
