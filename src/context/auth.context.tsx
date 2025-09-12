import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { AXIOS_INSTANCE } from '../api/custom-instance';
type Dispatch = (Auth: string | null) => void;

type AuthProviderProps = { children: ReactNode; initialState?: string | null };

const AuthContext = createContext<string | null>(null);
const AuthDispatchContext = createContext<Dispatch | null>(null);

const AuthProvider = ({ children, initialState = null }: AuthProviderProps) => {
  const [token, setToken] = useState(initialState);

  const updateToken: Dispatch = (token: string | null) => {
    if(token) {
      window.localStorage.setItem('token', token)
    } else {
      window.localStorage.removeItem('token')
    }
    setToken(token)
  }
  
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
      <AuthDispatchContext.Provider value={updateToken}>
        {children}
      </AuthDispatchContext.Provider>
    </AuthContext.Provider>
  );
};

const useAuth = (): string | null => {
  return useContext<string | null>(AuthContext);
};

const useAuthDispatch = (): Dispatch => {
  const context = useContext<Dispatch | null>(AuthDispatchContext);

  if (context === null) {
    throw new Error('useAuthDispatch must be used within a AuthProvider');
  }
  return context;
};

export { AuthProvider, useAuth, useAuthDispatch };
