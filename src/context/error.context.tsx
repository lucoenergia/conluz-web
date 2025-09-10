import { createContext, useContext, useState, type FC, type ReactNode } from "react";

type Dispatch = (error: string) => void;

interface ErrorProviderProps { children: ReactNode; }

const ErrorContext = createContext<string[]|null>(null);
const ErrorDispatchContext = createContext<Dispatch | null>(null)

const ErrorProvider: FC<ErrorProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<string[]>([]);

  const addError: Dispatch = (error: string) => {
    setErrors([...errors, error])

    // AUTO REMOVE ERROR AFTER 5 SECONDS
    setTimeout(() => {
      setErrors(errors.filter(e => e === error))
    }, 5000);
  }

  return (
    <ErrorContext.Provider value={errors}>
      <ErrorDispatchContext.Provider value={addError}>
        { children }
      </ErrorDispatchContext.Provider>
    </ErrorContext.Provider>
  )
}

const useError = (): string[] | null => {
  return useContext<string[] | null>(ErrorContext);
}

const useErrorDispatch = (): Dispatch => {
  const context = useContext<Dispatch | null>(ErrorDispatchContext);

  if (context === null) {
    throw new Error('useErrorDispatch must be used within a AuthErrorProvider');
  }
  return context;
}

export { ErrorProvider, useError, useErrorDispatch };
