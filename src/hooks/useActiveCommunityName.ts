import { useActiveCommunityDetails } from "./useActiveCommunityDetails";

/**
 * The active community's name, for surfaces that confirm a write into it
 * (#186). Undefined until the community list has loaded.
 */
export function useActiveCommunityName(): string | undefined {
  return useActiveCommunityDetails().activeCommunity?.name;
}

/** How a confirming title names the target community, whether or not its name has loaded. */
export function communityLabel(name: string | undefined): string {
  return name ?? "la comunidad activa";
}
