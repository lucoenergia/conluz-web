import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { useLoggedUser } from "./logged-user.context";
import type { UserResponseMemberships } from "../api/models";
import { useGetAllCommunities } from "../api/communities/communities";
import { useGetSuppliesByUserId } from "../api/users/users";
import { pickFirstTimeCommunity, rememberedCommunity } from "./entryCommunity";

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
  // Set while the first-time rule waits for what it decides on. Separate from
  // resolvedForUserId so that, mid-session, the community being replaced is
  // still known to belong to this user while the wait lasts.
  const [awaitingFirstTimeRule, setAwaitingFirstTimeRule] = useState(false);

  const memberships: UserResponseMemberships = loggedUser?.memberships ?? {};
  const communityIds = Object.keys(memberships);
  const userId = loggedUser?.id ?? null;
  // Sorted, because this string is the effect's dependency and the user is a
  // live query now (#203): `Object.keys` follows the JSON's order, so the same
  // memberships serialised differently would re-run the auto-select below and
  // could move the active community for no reason.
  const membershipKey = communityIds.slice().sort().join(",");

  // With several memberships and nothing valid remembered, the first-time rule
  // decides (#237), on the community names and on where the caller owns supply
  // points. Both reads are made only then: a remembered community needs neither.
  const needsFirstTimeRule =
    !!userId && communityIds.length > 1 && rememberedCommunity(communityIds, readPersistedCommunity(userId)) === null;
  // GET /communities is the list the community switch already reads, so this
  // shares its cache rather than adding a request.
  const communities = useGetAllCommunities({ query: { enabled: needsFirstTimeRule } });
  const ownSupplies = useGetSuppliesByUserId(userId ?? "", { query: { enabled: needsFirstTimeRule } });
  // A failed read is settled too: the rule has a fallback for each.
  const firstTimeRuleReady =
    needsFirstTimeRule &&
    (communities.data !== undefined || communities.isError) &&
    (ownSupplies.data !== undefined || ownSupplies.isError);

  // Auto-select and restore persisted selection when the user or their
  // communities change. Both can now change mid-session: an admin may add the
  // caller to a community, or the caller may remove their own membership.
  useEffect(() => {
    if (!userId) {
      setActiveCommunityId(null);
      setResolvedForUserId(null);
      setAwaitingFirstTimeRule(false);
      return;
    }

    if (communityIds.length === 1) {
      // Single community — auto-select unconditionally (matches backend single-community fallback).
      const only = communityIds[0];
      setActiveCommunityId(only);
      persistActiveCommunity(userId, only);
    } else if (communityIds.length > 1) {
      const remembered = rememberedCommunity(communityIds, readPersistedCommunity(userId));
      if (remembered) {
        setActiveCommunityId(remembered);
      } else if (!firstTimeRuleReady) {
        // Unresolved until the rule can decide, so nothing is routed on the
        // basis of having no community. A community this user was already in --
        // the one just taken away mid-session -- is left in place rather than
        // cleared: the move to the rule's choice is then one step, from the
        // lost community, which the layout answers by sending a community page
        // to the landing. Going through null would read as a first load instead
        // and leave them on the page, unaware the community changed.
        if (resolvedForUserId !== userId) setActiveCommunityId(null);
        setAwaitingFirstTimeRule(true);
        return;
      } else {
        const chosen = pickFirstTimeCommunity(communityIds, communities.data, ownSupplies.data);
        setActiveCommunityId(chosen);
        persistActiveCommunity(userId, chosen);
      }
    } else {
      setActiveCommunityId(null);
    }

    // Every branch above has decided, including the ones that decided "none".
    // Marked here rather than per branch so a branch added later cannot forget.
    setResolvedForUserId(userId);
    setAwaitingFirstTimeRule(false);
    // membershipKey stands in for communityIds. The rule's answers are read
    // only when firstTimeRuleReady turns true, and resolvedForUserId only
    // tells a first entry from a mid-session one: a change to either alone
    // must not re-decide.
  }, [userId, membershipKey, firstTimeRuleReady]);

  const dispatch: Dispatch = (communityId) => {
    setActiveCommunityId(communityId);
    if (userId) {
      persistActiveCommunity(userId, communityId);
    }
  };

  return (
    <ActiveCommunityContext.Provider value={activeCommunityId}>
      <ActiveCommunityResolvedContext.Provider
        value={!!userId && resolvedForUserId === userId && !awaitingFirstTimeRule}
      >
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
 * including when the answer is "none" -- a caller with no memberships. It must
 * become true in that case too, or a caller waiting on it would wait forever.
 * A caller with memberships always has one active once this is true.
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
