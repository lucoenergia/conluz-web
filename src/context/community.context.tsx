import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { AXIOS_INSTANCE } from "../api/custom-instance";
import { useLoggedUser } from "./logged-user.context";
import type { UserResponseMemberships } from "../api/models";

type Dispatch = (communityId: string | null) => void;

type CommunityProviderProps = { children: ReactNode };

const ActiveCommunityContext = createContext<string | null>(null);
const ActiveCommunityDispatchContext = createContext<Dispatch | null>(null);

const STORAGE_KEY_PREFIX = "activeCommunity";

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

function persistActiveCommunity(userId: string, communityId: string | null): void {
  const key = storageKey(userId);
  if (communityId) {
    localStorage.setItem(key, communityId);
  } else {
    localStorage.removeItem(key);
  }
}

function readPersistedCommunity(userId: string): string | null {
  return localStorage.getItem(storageKey(userId));
}

const CommunityProvider = ({ children }: CommunityProviderProps) => {
  const loggedUser = useLoggedUser();
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);

  const memberships: UserResponseMemberships = loggedUser?.memberships ?? {};
  const communityIds = Object.keys(memberships);
  const userId = loggedUser?.id ?? null;

  // Auto-select and restore persisted selection when the user or their communities change.
  useEffect(() => {
    if (!userId) {
      setActiveCommunityId(null);
      return;
    }

    if (communityIds.length === 1) {
      // Single community — auto-select unconditionally (matches backend single-community fallback).
      const only = communityIds[0];
      setActiveCommunityId(only);
      persistActiveCommunity(userId, only);
    } else if (communityIds.length > 1) {
      const persisted = readPersistedCommunity(userId);
      if (persisted && communityIds.includes(persisted)) {
        setActiveCommunityId(persisted);
      } else {
        // Persisted value no longer valid; clear and wait for the user to pick.
        setActiveCommunityId(null);
      }
    } else {
      setActiveCommunityId(null);
    }
  }, [userId, communityIds.join(",")]);

  // Attach X-Community-Id to every request via the shared Axios instance.
  // Mirrors auth.context.tsx interceptor shape exactly.
  useEffect(() => {
    const interceptorId = AXIOS_INSTANCE.interceptors.request.use((config) => {
      if (config.headers && activeCommunityId) {
        Object.entries({
          "X-Community-Id": activeCommunityId,
        }).forEach(([key, value]) => {
          config.headers.set(key, value);
        });
      }
      return config;
    });

    return () => {
      AXIOS_INSTANCE.interceptors.request.eject(interceptorId);
    };
  }, [activeCommunityId]);

  const dispatch: Dispatch = (communityId) => {
    setActiveCommunityId(communityId);
    if (userId) {
      persistActiveCommunity(userId, communityId);
    }
  };

  return (
    <ActiveCommunityContext.Provider value={activeCommunityId}>
      <ActiveCommunityDispatchContext.Provider value={dispatch}>
        {children}
      </ActiveCommunityDispatchContext.Provider>
    </ActiveCommunityContext.Provider>
  );
};

const useActiveCommunity = (): string | null => {
  return useContext<string | null>(ActiveCommunityContext);
};

const useActiveCommunityDispatch = (): Dispatch => {
  const context = useContext<Dispatch | null>(ActiveCommunityDispatchContext);
  if (context === null) {
    throw new Error("useActiveCommunityDispatch must be used within a CommunityProvider");
  }
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export { CommunityProvider, useActiveCommunity, useActiveCommunityDispatch, ActiveCommunityContext };
