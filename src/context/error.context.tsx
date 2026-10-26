import { createContext, useCallback, useContext, useEffect, useRef, useState, type FC, type ReactNode } from "react";

type Dispatch = (error: string) => void;

interface ErrorProviderProps {
  children: ReactNode;
}

const ErrorContext = createContext<string[] | null>(null);
const ErrorDispatchContext = createContext<Dispatch | null>(null);

const ErrorProvider: FC<ErrorProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<string[]>([]);

  // The pending removals, cleared on unmount so none fires on a provider that
  // is gone.
  const removals = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = removals.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  // Stable across renders: screens report a failed read from an effect that
  // depends on this dispatch, so a new function on every render made each
  // report trigger the next one. It reads the errors through the updater, never
  // from this render.
  const addError: Dispatch = useCallback((error: string) => {
    setErrors((current) => [...current, error]);

    // AUTO REMOVE ERROR AFTER 5 SECONDS
    const removal = setTimeout(() => {
      removals.current.delete(removal);
      setErrors((current) => current.filter((e) => e !== error));
    }, 5000);
    removals.current.add(removal);
  }, []);

  return (
    <ErrorContext.Provider value={errors}>
      <ErrorDispatchContext.Provider value={addError}>{children}</ErrorDispatchContext.Provider>
    </ErrorContext.Provider>
  );
};

const useError = (): string[] | null => {
  return useContext<string[] | null>(ErrorContext);
};

const useErrorDispatch = (): Dispatch => {
  const context = useContext<Dispatch | null>(ErrorDispatchContext);

  if (context === null) {
    throw new Error("useErrorDispatch must be used within a AuthErrorProvider");
  }
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export { ErrorProvider, useError, useErrorDispatch };
