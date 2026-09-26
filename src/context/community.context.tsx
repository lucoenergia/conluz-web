import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { useLoggedUser } from "./logged-user.context";
import type { UserResponseMemberships } from "../api/models";

type Dispatch = (communityId: string | null) => void;

type CommunityProviderProps = { children: ReactNode };

const ActiveCommunityContext = createContext<string | null>(null);
const ActiveCommunityDispatchContext = createContext<Dispatch | null>(null);

/**
 * Whether the auto-select effect has run for the current user.
 *
 * `activeCommunityId` alone cannot answer that: null means both "not worked out
 * yet" and "worked out, and there is none". Anything that decides on the active
 * community -- a route guard, a capability lookup -- must be able to tell those
 * apart, or it either bounces a legitimate user off a deep link before the
 * effect runs, or waits forever for a community that is never coming.
 */
const ActiveCommunityResolvedContext = createContext<boolean>(false);

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
  // Which user the selection below was worked out for. Keyed by user rather
  // than a boolean so that logging in as somebody else reads as unresolved
  // again until the effect has run for them.
  const [resolvedForUserId, setResolvedForUserId] = useState<string | null>(null);

  const memberships: UserResponseMemberships = loggedUser?.memberships ?? {};
  const communityIds = Object.keys(memberships);
  const userId = loggedUser?.id ?? null;

  // Auto-select and restore persisted selection when the user or their communities change.
  useEffect(() => {
    if (!userId) {
      setActiveCommunityId(null);
      setResolvedForUserId(null);
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

    // Every branch above has decided, including the ones that decided "none".
    // Marked here rather than per branch so a branch added later cannot forget.
    setResolvedForUserId(userId);
  }, [userId, communityIds.join(",")]);

  const dispatch: Dispatch = (communityId) => {
    setActiveCommunityId(communityId);
    if (userId) {
      persistActiveCommunity(userId, communityId);
    }
  };

  return (
    <ActiveCommunityContext.Provider value={activeCommunityId}>
      <ActiveCommunityResolvedContext.Provider value={!!userId && resolvedForUserId === userId}>
        <ActiveCommunityDispatchContext.Provider value={dispatch}>
          {children}
        </ActiveCommunityDispatchContext.Provider>
      </ActiveCommunityResolvedContext.Provider>
    </ActiveCommunityContext.Provider>
  );
};

const useActiveCommunity = (): string | null => {
  return useContext<string | null>(ActiveCommunityContext);
};

/**
 * True once the active community has been worked out for the logged-in user,
 * including when the answer is "none" -- a platform admin with no memberships,
 * or somebody with several who has not picked one. It must become true in those
 * cases too, or a caller waiting on it would wait forever.
 */
const useIsActiveCommunityResolved = (): boolean => {
  return useContext<boolean>(ActiveCommunityResolvedContext);
};

const useActiveCommunityDispatch = (): Dispatch => {
  const context = useContext<Dispatch | null>(ActiveCommunityDispatchContext);
  if (context === null) {
    throw new Error("useActiveCommunityDispatch must be used within a CommunityProvider");
  }
  return context;
};

/* eslint-disable react-refresh/only-export-components -- the hooks and contexts
   belong beside the provider that owns them; splitting them out to satisfy fast
   refresh would scatter one concept across three files. */
export {
  CommunityProvider,
  useActiveCommunity,
  useIsActiveCommunityResolved,
  useActiveCommunityDispatch,
  ActiveCommunityContext,
  ActiveCommunityResolvedContext,
};
