import { createContext, type ReactNode, useContext, useState } from "react";
import type { CurrentUserResponse } from "../api/models";

type Dispatch = (User: CurrentUserResponse | null) => void;

type LoggedUserProviderProps = { children: ReactNode };

const LoggedUserContext = createContext<CurrentUserResponse | null>(null);
const LoggedUserDispatchContext = createContext<Dispatch | null>(null);

const LoggedUserProvider = ({ children }: LoggedUserProviderProps) => {
  const [user, setUser] = useState<CurrentUserResponse | null>(null);

  return (
    <LoggedUserContext.Provider value={user}>
      <LoggedUserDispatchContext.Provider value={setUser}>{children}</LoggedUserDispatchContext.Provider>
    </LoggedUserContext.Provider>
  );
};

const useLoggedUser = (): CurrentUserResponse | null => {
  return useContext<CurrentUserResponse | null>(LoggedUserContext);
};

const useLoggedUserDispatch = (): Dispatch => {
  const context = useContext<Dispatch | null>(LoggedUserDispatchContext);

  if (context === null) {
    throw new Error("useLoggedUserDispatch must be used within a LoggedUserProvider");
  }
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export { LoggedUserProvider, useLoggedUser, useLoggedUserDispatch };
