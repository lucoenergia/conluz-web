import { createContext, useCallback, useContext, useEffect, useRef, useState, type FC, type ReactNode } from "react";

type Dispatch = (message: string) => void;

interface SuccessProviderProps {
  children: ReactNode;
}

const SuccessContext = createContext<string[] | null>(null);
const SuccessDispatchContext = createContext<Dispatch | null>(null);

const SuccessProvider: FC<SuccessProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<string[]>([]);

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

  // Stable across renders, as the error dispatch is: a screen that reports from
  // an effect depends on this dispatch, so a new function on every render
  // re-ran that effect after each message. It reads the messages through the
  // updater, never from this render.
  const addMessage: Dispatch = useCallback((message: string) => {
    setMessages((prev) => [...prev, message]);

    // AUTO REMOVE MESSAGE AFTER 5 SECONDS
    const removal = setTimeout(() => {
      removals.current.delete(removal);
      setMessages((prev) => prev.filter((m) => m !== message));
    }, 5000);
    removals.current.add(removal);
  }, []);

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
