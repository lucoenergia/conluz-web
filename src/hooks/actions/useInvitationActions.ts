import { useQueryClient } from "@tanstack/react-query";
import {
  useAcceptInvitation,
  useAcceptInvitationAsCurrentUser,
  useInspectInvitation,
} from "../../api/memberships/memberships";
import { getGetCurrentUserQueryKey } from "../../api/users/users";
import type {
  AcceptInvitationAsCurrentUserBody,
  AcceptInvitationBody,
  InvitationInspectionResponse,
  InvitationTokenBody,
} from "../../api/models";
import { type InvitationFailure, classifyInvitationError } from "../../errors/invitationErrors";
import { type Action, ungated } from "./action";

export type InvitationInspectionResult =
  | { ok: true; invitation: InvitationInspectionResponse }
  | { ok: false; failure: InvitationFailure };

export type InvitationAcceptanceResult = { ok: true } | { ok: false; failure: InvitationFailure };

/**
 * Accepting an invitation from the emailed link (#274).
 *
 * No capability can answer any of these. The token in the link is the only
 * credential: inspecting it and accepting it without a session happen before
 * the invited account can sign in, and accepting it signed in acts on an
 * invitation addressed to the caller -- a membership or the platform-admin
 * role (#288) -- named by the token. The reasons below are the ones
 * src/contracts/mutationHooks.spec.ts records for each mutation.
 *
 * The token travels in the request body and nowhere else.
 */
export interface InvitationActions {
  actions: {
    inspect: Action<[InvitationTokenBody], InvitationInspectionResult>;
    accept: Action<[AcceptInvitationBody], InvitationAcceptanceResult>;
    acceptAsCurrentUser: Action<[AcceptInvitationAsCurrentUserBody], InvitationAcceptanceResult>;
  };
}

/**
 * Kept out of the mutation cache. A mutation's variables stay in TanStack's
 * MutationCache after it settles, for `gcTime`, and an acceptance's carry the
 * token, the password and a platform-admin invitation's confirmation code
 * (#288): with no `gcTime`, and the observer reset once the call settles, they
 * are gone from the cache as soon as the request is answered.
 */
const FORGET_VARIABLES = { mutation: { gcTime: 0 } } as const;

export function useInvitationActions(): InvitationActions {
  const queryClient = useQueryClient();
  const inspectMutation = useInspectInvitation();
  const acceptMutation = useAcceptInvitation(FORGET_VARIABLES);
  const acceptAsCurrentUserMutation = useAcceptInvitationAsCurrentUser(FORGET_VARIABLES);

  return {
    actions: {
      inspect: ungated(
        "no session: the holder of an emailed invitation link may not have an account to sign in with yet, and the token is the only credential",
        async (data: InvitationTokenBody): Promise<InvitationInspectionResult> => {
          try {
            return { ok: true, invitation: await inspectMutation.mutateAsync({ data }) };
          } catch (error) {
            return { ok: false, failure: classifyInvitationError(error) };
          }
        },
        inspectMutation.isPending,
      ),
      accept: ungated(
        "no session: it sets the account's first password, so nobody can be signed in as it, and the token is the only credential",
        async (data: AcceptInvitationBody): Promise<InvitationAcceptanceResult> => {
          try {
            // Nothing to invalidate: no session belongs to this account yet.
            await acceptMutation.mutateAsync({ data });
            return { ok: true };
          } catch (error) {
            return { ok: false, failure: classifyInvitationError(error) };
          } finally {
            acceptMutation.reset();
          }
        },
        acceptMutation.isPending,
      ),
      acceptAsCurrentUser: ungated(
        "open to any authenticated caller: it accepts an invitation addressed to the caller, named by the token, and takes no id",
        async (data: AcceptInvitationAsCurrentUserBody): Promise<InvitationAcceptanceResult> => {
          try {
            await acceptAsCurrentUserMutation.mutateAsync({ data });
            // The accepted membership lives on the current user, which the
            // community selector and the landing read. Awaited, so the caller
            // is sent on only once it is there.
            await queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
            return { ok: true };
          } catch (error) {
            return { ok: false, failure: classifyInvitationError(error) };
          } finally {
            acceptAsCurrentUserMutation.reset();
          }
        },
        acceptAsCurrentUserMutation.isPending,
      ),
    },
  };
}
