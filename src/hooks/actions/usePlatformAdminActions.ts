import { useQueryClient } from "@tanstack/react-query";
import {
  getGetPlatformAdminsQueryKey,
  useInvitePlatformAdmin,
  useResendPlatformAdminInvitation,
  useRevokePlatformAdmin,
  useRevokePlatformAdminInvitation,
} from "../../api/users/users";
import type { InvitePlatformAdminBody, PlatformAdminResponse } from "../../api/models";
import {
  isPlatformInvitationStaleRow,
  isStaleRowRefusal,
  revokePlatformAdminRefusal,
} from "../../errors/platformAdminErrors";
import { outcomeFromResource, PENDING, usePlatformCapabilities, type CapabilityOutcome } from "../permissions";
import { grant, type MaybeAction } from "./action";

/** A revoke either succeeds or carries the error, which the screen words per refusal. */
export type PlatformAdminWriteResult = { ok: true } | { error: unknown };

/**
 * An invitation sent, or sent again, with the confirmation code generated for
 * it (#288). The code exists only in this value: the screen keeps it in the
 * memory of the dialog that shows it, and nothing else holds it.
 */
export type PlatformInvitationSentResult = { ok: true; confirmationCode: string } | { error: unknown };

export interface PlatformAdminRowActions {
  actions: {
    revoke: MaybeAction<[], PlatformAdminWriteResult>;
    resendInvitation: MaybeAction<[], PlatformInvitationSentResult>;
    revokeInvitation: MaybeAction<[], PlatformAdminWriteResult>;
  };
  outcomes: Record<keyof PlatformAdminRowActions["actions"], CapabilityOutcome>;
}

export interface PlatformAdminActions {
  /** Inviting a person to the role, on the caller's `canInvitePlatformAdmins`. */
  invite: MaybeAction<[InvitePlatformAdminBody], PlatformInvitationSentResult>;
  inviteOutcome: CapabilityOutcome;
  /** See useMembershipActions for why this is a plain function and not a hook. */
  forPlatformAdmin: (admin: PlatformAdminResponse | undefined) => PlatformAdminRowActions;
}

/**
 * Kept out of the mutation cache. A mutation's result stays in TanStack's
 * MutationCache after it settles, for `gcTime`, and the result of an invite or
 * a resend carries the confirmation code: with no `gcTime`, and the observer
 * reset once the call settles, the code is gone from the cache as soon as it is
 * handed back.
 */
const FORGET_RESULT = { mutation: { gcTime: 0 } } as const;

/**
 * What the caller may do on the platform-admins page.
 *
 * Inviting is read off the caller's `platformCapabilities.canInvitePlatformAdmins`,
 * and everything on a row off the row's own `capabilities`.
 *
 * `canRevoke` says whether the caller may ever revoke this admin -- false on
 * their own row. Whether the revoke would be accepted right now is the row's
 * `revocable`, which the screen reads: the action is handed over either way,
 * and the screen disables it when the row is not revocable.
 *
 * `canResendInvitation` and `canRevokeInvitation` are authorization only, true
 * on every row (lucoenergia/conluz#452): the screen offers them on rows with an
 * `invitation`, and "Revocar rol" only on rows without one.
 *
 * The current user is not invalidated: nobody can revoke their own role, and
 * an invitation grants nothing until it is accepted, so no write here changes
 * the caller's own platform capabilities.
 */
export function usePlatformAdminActions(): PlatformAdminActions {
  const queryClient = useQueryClient();
  const revokeMutation = useRevokePlatformAdmin();
  const inviteMutation = useInvitePlatformAdmin(FORGET_RESULT);
  const resendMutation = useResendPlatformAdminInvitation(FORGET_RESULT);
  const revokeInvitationMutation = useRevokePlatformAdminInvitation();
  const inviteOutcome = usePlatformCapabilities("canInvitePlatformAdmins");

  // The list is refetched, never written from a response: the rows the list
  // holds come only from GET /platform-admins, which carries no code.
  const refetchList = () => queryClient.invalidateQueries({ queryKey: getGetPlatformAdminsQueryKey() });

  return {
    invite: grant(
      inviteOutcome,
      async (data: InvitePlatformAdminBody): Promise<PlatformInvitationSentResult> => {
        try {
          const { confirmationCode } = await inviteMutation.mutateAsync({ data });
          refetchList();
          return { ok: true, confirmationCode };
        } catch (error) {
          if (isPlatformInvitationStaleRow(error, "invite")) refetchList();
          return { error };
        } finally {
          inviteMutation.reset();
        }
      },
      inviteMutation.isPending,
    ),
    inviteOutcome,
    forPlatformAdmin: (admin) => {
      const userId = admin?.user.id ?? "";
      // No row, nobody to act on: not yet known.
      const revoke = admin ? outcomeFromResource(admin.capabilities, "canRevoke") : PENDING;
      const resendInvitation = admin ? outcomeFromResource(admin.capabilities, "canResendInvitation") : PENDING;
      const revokeInvitation = admin ? outcomeFromResource(admin.capabilities, "canRevokeInvitation") : PENDING;

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
          resendInvitation: grant(
            resendInvitation,
            async (): Promise<PlatformInvitationSentResult> => {
              try {
                const { confirmationCode } = await resendMutation.mutateAsync({ userId });
                refetchList();
                return { ok: true, confirmationCode };
              } catch (error) {
                if (isPlatformInvitationStaleRow(error, "resend")) refetchList();
                return { error };
              } finally {
                resendMutation.reset();
              }
            },
            resendMutation.isPending,
          ),
          revokeInvitation: grant(
            revokeInvitation,
            async (): Promise<PlatformAdminWriteResult> => {
              try {
                await revokeInvitationMutation.mutateAsync({ userId });
                refetchList();
                return { ok: true };
              } catch (error) {
                if (isPlatformInvitationStaleRow(error, "revoke")) refetchList();
                return { error };
              }
            },
            revokeInvitationMutation.isPending,
          ),
        },
        outcomes: { revoke, resendInvitation, revokeInvitation },
      };
    },
  };
}
