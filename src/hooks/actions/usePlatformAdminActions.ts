import { useQueryClient } from "@tanstack/react-query";
import { getGetPlatformAdminsQueryKey, useRevokePlatformAdmin } from "../../api/users/users";
import type { PlatformAdminResponse } from "../../api/models";
import { isStaleRowRefusal, revokePlatformAdminRefusal } from "../../errors/platformAdminErrors";
import { outcomeFromResource, PENDING, type CapabilityOutcome } from "../permissions";
import { grant, type MaybeAction } from "./action";

/** A revoke either succeeds or carries the error, which the screen words per refusal. */
export type PlatformAdminWriteResult = { ok: true } | { error: unknown };

export interface PlatformAdminRowActions {
  actions: {
    revoke: MaybeAction<[], PlatformAdminWriteResult>;
  };
  outcomes: Record<keyof PlatformAdminRowActions["actions"], CapabilityOutcome>;
}

export interface PlatformAdminActions {
  /** See useMembershipActions for why this is a plain function and not a hook. */
  forPlatformAdmin: (admin: PlatformAdminResponse | undefined) => PlatformAdminRowActions;
}

/**
 * What the caller may do to one platform admin, read off the row's own
 * `capabilities.canRevoke`.
 *
 * The capability says whether the caller may ever revoke this admin -- false
 * on their own row. Whether the revoke would be accepted right now is the
 * row's `revocable`, which the screen reads: the action is handed over either
 * way, and the screen disables it when the row is not revocable.
 *
 * The current user is not invalidated: nobody can revoke their own role, so a
 * revoke never changes the caller's own platform capabilities.
 */
export function usePlatformAdminActions(): PlatformAdminActions {
  const queryClient = useQueryClient();
  const revokeMutation = useRevokePlatformAdmin();

  const refetchList = () => queryClient.invalidateQueries({ queryKey: getGetPlatformAdminsQueryKey() });

  return {
    forPlatformAdmin: (admin) => {
      const userId = admin?.user.id ?? "";
      // No row, nobody to act on: not yet known.
      const revoke = admin ? outcomeFromResource(admin.capabilities, "canRevoke") : PENDING;

      return {
        actions: {
          revoke: grant(
            revoke,
            async (): Promise<PlatformAdminWriteResult> => {
              try {
                await revokeMutation.mutateAsync({ userId });
                refetchList();
                return { ok: true };
              } catch (error) {
                // A refusal that says the row is stale refetches the list, so
                // the screen shows the state the backend refused from.
                if (isStaleRowRefusal(revokePlatformAdminRefusal(error))) refetchList();
                return { error };
              }
            },
            revokeMutation.isPending,
          ),
        },
        outcomes: { revoke },
      };
    },
  };
}
