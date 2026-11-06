import { createContext, type ReactNode, useContext, useLayoutEffect, useRef, useState } from "react";
import { AXIOS_INSTANCE } from "../http/custom-instance";
type Dispatch = (Auth: {token: string, remember: boolean } | null) => void;

type AuthProviderProps = { children: ReactNode; initialState?: string | null };

const AuthContext = createContext<string | null>(null);
const AuthDispatchContext = createContext<Dispatch | null>(null);

const AuthProvider = ({ children, initialState = null }: AuthProviderProps) => {
  const [token, setToken] = useState(initialState);
  // What the interceptor attaches (#389). It changes in `updateToken` itself, so
  // a request sent in the commit that makes the new token visible -- the
  // current-user query, which runs in a child's effect, before any effect of
  // this provider -- already carries it.
  const tokenRef = useRef(initialState);

  const updateToken: Dispatch = (token: null | { token: string, remember: boolean }) => {
    if (token && token.remember) {
      window.localStorage.setItem("token", token.token);
    } else if (token) {
      window.sessionStorage.setItem('token', token.token )
    } else {
      window.localStorage.removeItem("token");
      window.sessionStorage.removeItem('token');
    }
    tokenRef.current = token ? token.token : null;
    setToken(tokenRef.current);
  };

  // Registered once, and in a layout effect, so it is in place before any
  // child's passive effect sends the first request with a stored token (#389).
  // Re-registering it on every token change left a window, between ejecting
  // the old interceptor and adding the new one, in which a request went out
  // with no token at all.
  useLayoutEffect(() => {
    const interceptorId = AXIOS_INSTANCE.interceptors.request.use((config) => {
      if (config.headers && tokenRef.current) {
        config.headers.set("Authorization", `Bearer ${tokenRef.current}`);
      }
      return config;
    });

    return () => {
      AXIOS_INSTANCE.interceptors.request.eject(interceptorId);
    };
  }, []);

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

// eslint-disable-next-line react-refresh/only-export-components
export { AuthProvider, useAuth, useAuthDispatch };
