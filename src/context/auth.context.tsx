import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { AXIOS_INSTANCE } from "../api/custom-instance";
type Dispatch = (Auth: {token: string, remember: boolean } | null) => void;

type AuthProviderProps = { children: ReactNode; initialState?: string | null };

const AuthContext = createContext<string | null>(null);
const AuthDispatchContext = createContext<Dispatch | null>(null);

const AuthProvider = ({ children, initialState = null }: AuthProviderProps) => {
  const [token, setToken] = useState(initialState);

  const updateToken: Dispatch = (token: null | { token: string, remember: boolean }) => {
    if (token && token.remember) {
      window.localStorage.setItem("token", token.token);
    } else if (token) {
      window.sessionStorage.setItem('token', token.token )
    } else {
      window.localStorage.removeItem("token");
      window.sessionStorage.removeItem('token');
    }
    setToken(token ? token.token : token);
  };

  useEffect(() => {
    const interceptorId = AXIOS_INSTANCE.interceptors.request.use((config) => {
      if (config.headers && token) {
        Object.entries({
          Authorization: `Bearer ${token}`,
        }).forEach(([key, value]) => {
          config.headers.set(key, value);
        });
      }
      return config;
    });

    return () => {
      AXIOS_INSTANCE.interceptors.request.eject(interceptorId);
    };
  }, [token]);

  return (
    <AuthContext.Provider value={token}>
      <AuthDispatchContext.Provider value={updateToken}>{children}</AuthDispatchContext.Provider>
    </AuthContext.Provider>
  );
};

const useAuth = (): string | null => {
  return useContext<string | null>(AuthContext);
};

const useAuthDispatch = (): Dispatch => {
  const context = useContext<Dispatch | null>(AuthDispatchContext);

  if (context === null) {
    throw new Error("useAuthDispatch must be used within a AuthProvider");
  }
  return context;
};

export { AuthProvider, useAuth, useAuthDispatch };
