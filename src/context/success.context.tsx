import { createContext, useContext, useState, type FC, type ReactNode } from "react";

type Dispatch = (message: string) => void;

interface SuccessProviderProps {
  children: ReactNode;
}

const SuccessContext = createContext<string[] | null>(null);
const SuccessDispatchContext = createContext<Dispatch | null>(null);

const SuccessProvider: FC<SuccessProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<string[]>([]);

  const addMessage: Dispatch = (message: string) => {
    setMessages((prev) => [...prev, message]);

    // AUTO REMOVE MESSAGE AFTER 5 SECONDS
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m !== message));
    }, 5000);
  };

  return (
    <SuccessContext.Provider value={messages}>
      <SuccessDispatchContext.Provider value={addMessage}>{children}</SuccessDispatchContext.Provider>
    </SuccessContext.Provider>
  );
};

const useSuccess = (): string[] | null => {
  return useContext<string[] | null>(SuccessContext);
};

const useSuccessDispatch = (): Dispatch => {
  const context = useContext<Dispatch | null>(SuccessDispatchContext);

  if (context === null) {
    throw new Error("useSuccessDispatch must be used within a SuccessProvider");
  }
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export { SuccessProvider, useSuccess, useSuccessDispatch };
