import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Dayjs } from "dayjs";
import {
  getGetPlantActivePartitionCoefficientsQueryKey,
  getGetSharingAgreementPartitionCoefficientsQueryKey,
  useActivatePartitionCoefficients,
  useClosePartitionCoefficients,
  useDeactivatePartitionCoefficients,
  useReopenPartitionCoefficients,
  useReplacePartitionCoefficients,
} from "../../api/sharing-agreements/sharing-agreements";
import { useErrorDispatch } from "../../context/error.context";
import { useSuccessDispatch } from "../../context/success.context";
import { getFirstApiErrorMessage, getGroupedApiErrorDetails } from "../../errors/apiErrorCatalogue";
import type { EditableCoefficientRow } from "../../pages/production/sharingAgreementCoefficientEditing";
import type { SharingAgreementResponse } from "../../api/models";
import { outcomeFromResource, type CapabilityOutcome } from "../permissions";
import { grant, type MaybeAction } from "./action";

export interface ReplaceCoefficientsResult {
  success: boolean;
}

export type CoefficientActivationResult = { success: true } | { success: false; errorMessages: string[] };

/**
 * What the caller may do to one agreement's partition coefficients.
 *
 * All five gate on the agreement's `canManage`, the only write flag it carries.
 * Which of them is legal *right now* is still the coefficient's own business --
 * `getAvailableCoefficientActions(applicationState, endState)` and the DRAFT
 * rule each consumer applies. Capability first, then state.
 *
 * Each action's `isPending` is the flag that spans the awaited invalidation,
 * not the raw mutation's: see the block comment on the …AfterInvalidate state
 * below for why acting inside that window would target stale rows.
 */
export interface SharingAgreementCoefficientRowActions {
  actions: {
    replace: MaybeAction<[EditableCoefficientRow[]], ReplaceCoefficientsResult>;
    activate: MaybeAction<[string[], Dayjs], CoefficientActivationResult>;
    deactivate: MaybeAction<[string[]], CoefficientActivationResult>;
    close: MaybeAction<[string[], Dayjs], CoefficientActivationResult>;
    reopen: MaybeAction<[string[]], CoefficientActivationResult>;
  };
  outcomes: Record<keyof SharingAgreementCoefficientRowActions["actions"], CapabilityOutcome>;
}

export interface SharingAgreementCoefficientActions {
  /** See useMembershipActions for why this is a plain function and not a hook. */
  forAgreement: (agreement: SharingAgreementResponse | undefined) => SharingAgreementCoefficientRowActions;
}

/**
 * Every cached read of a supply's coefficient timeline, for any supply.
 *
 * Matches on the URL element alone because the two callers key differently:
 * the history drawer passes `{ plantId }` and the supply detail section passes
 * nothing, and Orval appends the params object to the key only when it is
 * present. The URL is identical in both shapes, so matching it covers both —
 * a predicate that keyed off the params object would silently refresh one
 * surface and leave the other stale.
 *
 * Deliberately not narrowed to a single supplyId: one lifecycle call can move
 * coefficients belonging to several supplies at once (activation cascades onto
 * a predecessor), so the affected set is not knowable from the request.
 */
const SUPPLY_COEFFICIENT_QUERY_URL = /^\/api\/v1\/supplies\/[^/]+\/partition-coefficients/;

export function useSharingAgreementCoefficientActions(plantId: string): SharingAgreementCoefficientActions {
  const queryClient = useQueryClient();
  const errorDispatch = useErrorDispatch();
  const successDispatch = useSuccessDispatch();
  const replaceMutation = useReplacePartitionCoefficients();
  const activateMutation = useActivatePartitionCoefficients();
  const deactivateMutation = useDeactivatePartitionCoefficients();
  const closeMutation = useClosePartitionCoefficients();
  const reopenMutation = useReopenPartitionCoefficients();

  // Each underlying mutation's own isPending flips false the instant its HTTP
  // response arrives — well before the invalidation-triggered refetch below
  // has delivered fresh data. Acting again in that window (e.g. reopening a
  // row's menu and firing another lifecycle action) would target stale
  // applicationState/endState: the endpoints can't reject it, since e.g.
  // activating an already-applied coefficient is a legal *correction*, not
  // an error — so the request would silently mean something the user didn't
  // intend. These flags span the whole call, success or failure, through the
  // awaited invalidation, and are OR-combined with the raw mutation flag
  // (never replacing it) so anything driving that flag directly keeps working.
  //
  // `replace` needs the same treatment for a different reason: it does not
  // race another mutation, it races the editor reopening. The editor closes on
  // save and seeds its rows AND its session-start snapshot from the
  // coefficients prop, so re-entering it before the refetch lands would
  // baseline the next session on data the save had already superseded.
  const [isReplacingAfterInvalidate, setIsReplacingAfterInvalidate] = useState(false);
  const [isActivatingAfterInvalidate, setIsActivatingAfterInvalidate] = useState(false);
  const [isDeactivatingAfterInvalidate, setIsDeactivatingAfterInvalidate] = useState(false);
  const [isClosingAfterInvalidate, setIsClosingAfterInvalidate] = useState(false);
  const [isReopeningAfterInvalidate, setIsReopeningAfterInvalidate] = useState(false);

  /**
   * The supply-level timelines alone. `replaceCoefficients` keeps its exact,
   * narrow agreement key — rewriting a draft touches one agreement and there
   * is no cascade to chase — but the supply histories are keyed by supplyId,
   * so they still have to be reached separately.
   */
  const invalidateSupplyCoefficientHistories = () => {
    return queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === "string" && SUPPLY_COEFFICIENT_QUERY_URL.test(key);
      },
    });
  };

  return {
    forAgreement: (agreement) => {
      const sharingAgreementId = agreement?.id ?? "";
      const manage = outcomeFromResource(agreement?.capabilities, "canManage");

      const replace = async (rows: EditableCoefficientRow[]): Promise<ReplaceCoefficientsResult> => {
        setIsReplacingAfterInvalidate(true);
        try {
          // Exactly one PUT per save — the endpoint replaces the whole set, so
          // this is called once with every row, never per keystroke or per row.
          // Reads each row's already-resolved canonical `value` directly — never
          // re-parses text, so this is unit-independent: the admin could have
          // typed in kW, percentage, or a mix across a toggle, and the payload is
          // identical either way.
          // coefficientSumWarning on the response is intentionally not surfaced: it's
          // useful to an API consumer with no UI, but on this screen the resulting
          // sum is already visible as persistent state in the coefficient-set KPI —
          // the backend sending a string doesn't oblige the UI to render it as a
          // one-off event too.
          await replaceMutation.mutateAsync({
            plantId,
            sharingAgreementId,
            data: {
              coefficients: rows.map((row) => ({
                supplyId: row.supplyId,
                coefficient: row.value!,
              })),
            },
          });
          // Awaited, like the four lifecycle calls below — invalidateQueries
          // resolves only once every matching *active* query has refetched, not
          // merely once they are marked stale. Without the await, success was
          // reported while the coefficient set on screen was still the pre-save
          // one: the editor closed, and re-opening it inside that window seeded
          // both the editable rows and the session-start snapshot from data the
          // save had already superseded.
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: getGetSharingAgreementPartitionCoefficientsQueryKey(plantId, sharingAgreementId),
            }),
            invalidateSupplyCoefficientHistories(),
          ]);
          return { success: true };
        } catch (error) {
          errorDispatch(
            getFirstApiErrorMessage(error, "Ha habido un problema al guardar los coeficientes. Por favor, inténtalo más tarde"),
          );
          return { success: false };
        } finally {
          setIsReplacingAfterInvalidate(false);
        }
      };

      /**
       * Invalidates every sharing-agreement query for this plant (list, every
       * cached agreement-by-id, every cached coefficient set) **and every cached
       * supply coefficient timeline**, via a predicate on the URL prefix rather
       * than a specific query key. Necessary because `activate` cascades onto a
       * predecessor coefficient that may belong to a *different* agreement, so the
       * set of agreements a single call touches isn't known from the request.
       * Agreements per plant are few and only mounted queries actually refetch, so
       * invalidating the whole plant subtree is cheap.
       *
       * The plant's active coefficients (`/api/v1/plants/{plantId}/partition-coefficients/active`,
       * what a DRAFT is compared against) sit outside that prefix too, and every
       * one of these actions changes what is in force.
       *
       * The supply timelines live under a different root (`/api/v1/supplies/...`)
       * and are keyed by supplyId, so the plant prefix can never reach them — the
       * history drawer and the supply detail section would both have gone stale
       * after every activation, close and reopen.
       *
       * `PartitionCoefficientResponse` now carries `sharingAgreement { id, name,
       * status }`, and the activation mutations return a `CoefficientActivationResponse`
       * whose `coefficients` would name exactly which agreements were touched —
       * so this could be narrowed to those ids. Left as-is deliberately: the
       * mutations currently discard that return value, and rewiring them is a
       * behaviour change, not a comment fix.
       *
       * Returns the promise `invalidateQueries` returns — which resolves only
       * once every matching *active* query has actually refetched, not merely
       * once they're marked stale. Callers must await it before treating the
       * mutation as fully settled; skipping the await was the whole bug this
       * flag exists to fix (see isActivatingAfterInvalidate above).
       */
      const invalidateCoefficientScopedQueries = () => {
        return queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            if (typeof key !== "string") return false;
            return (
              key.startsWith(`/api/v1/plants/${plantId}/sharing-agreements`) ||
              key === getGetPlantActivePartitionCoefficientsQueryKey(plantId)[0] ||
              SUPPLY_COEFFICIENT_QUERY_URL.test(key)
            );
          },
        });
      };

      const activate = async (coefficientIds: string[], appliedOn: Dayjs): Promise<CoefficientActivationResult> => {
        setIsActivatingAfterInvalidate(true);
        try {
          await activateMutation.mutateAsync({
            plantId,
            sharingAgreementId,
            data: {
              coefficientIds,
              // Never .toISOString()/.toJSON(): those convert to UTC first, and
              // local midnight in Madrid becomes 22:00/23:00 the *previous* day,
              // silently shifting appliedOn back one calendar day. This is the
              // date production gets attributed from, on data that reaches
              // billing — mirrors the hazard formatCalendarDate documents on the
              // read path (src/utils/formatCalendarDate.ts).
              appliedOn: appliedOn.format("YYYY-MM-DD"),
            },
          });
          await invalidateCoefficientScopedQueries();
          // A no-op batch (200, empty `coefficients` array in the response) is
          // still success: it's not an error, and the state the caller asked for
          // is the state that now holds. Not distinguished from a real batch —
          // the case is close to unreachable from this UI (checkboxes only ever
          // exist on already-PENDING rows), so the same confirmation applies.
          successDispatch("Fechas de aplicación registradas.");
          return { success: true };
        } catch (error) {
          // No errorDispatch/toast here: a batch rejection can carry several
          // details at once (one per failing coefficientId), and the caller
          // renders them as a persistent, readable work list instead of stacked
          // toasts that auto-dismiss before nine rows' worth of problems can be
          // read.
          // fileLevel is a general "ungrouped" bucket, not file-upload-specific
          // despite the name — it's just every detail whose params carry no
          // `line` key. Coefficient-lifecycle errors carry params.cups/
          // coefficientId, never params.line, so every one of them lands here;
          // lineLevel is always empty for this call.
          return { success: false, errorMessages: getGroupedApiErrorDetails(error).fileLevel };
        } finally {
          setIsActivatingAfterInvalidate(false);
        }
      };

      const deactivate = async (coefficientIds: string[]): Promise<CoefficientActivationResult> => {
        setIsDeactivatingAfterInvalidate(true);
        try {
          await deactivateMutation.mutateAsync({ plantId, sharingAgreementId, data: { coefficientIds } });
          await invalidateCoefficientScopedQueries();
          successDispatch("Activación revertida.");
          return { success: true };
        } catch (error) {
          return { success: false, errorMessages: getGroupedApiErrorDetails(error).fileLevel };
        } finally {
          setIsDeactivatingAfterInvalidate(false);
        }
      };

      const close = async (coefficientIds: string[], closedOn: Dayjs): Promise<CoefficientActivationResult> => {
        setIsClosingAfterInvalidate(true);
        try {
          await closeMutation.mutateAsync({
            plantId,
            sharingAgreementId,
            data: {
              coefficientIds,
              // Never .toISOString()/.toJSON(): same UTC-conversion hazard as
              // appliedOn above — this is the date production stops being
              // attributed from, on data that reaches billing.
              closedOn: closedOn.format("YYYY-MM-DD"),
            },
          });
          await invalidateCoefficientScopedQueries();
          successDispatch("Cierre registrado.");
          return { success: true };
        } catch (error) {
          return { success: false, errorMessages: getGroupedApiErrorDetails(error).fileLevel };
        } finally {
          setIsClosingAfterInvalidate(false);
        }
      };

      const reopen = async (coefficientIds: string[]): Promise<CoefficientActivationResult> => {
        setIsReopeningAfterInvalidate(true);
        try {
          await reopenMutation.mutateAsync({ plantId, sharingAgreementId, data: { coefficientIds } });
          await invalidateCoefficientScopedQueries();
          successDispatch("Coeficiente reabierto.");
          return { success: true };
        } catch (error) {
          return { success: false, errorMessages: getGroupedApiErrorDetails(error).fileLevel };
        } finally {
          setIsReopeningAfterInvalidate(false);
        }
      };

      return {
        actions: {
          replace: grant(manage, replace, replaceMutation.isPending || isReplacingAfterInvalidate),
          activate: grant(manage, activate, activateMutation.isPending || isActivatingAfterInvalidate),
          deactivate: grant(manage, deactivate, deactivateMutation.isPending || isDeactivatingAfterInvalidate),
          close: grant(manage, close, closeMutation.isPending || isClosingAfterInvalidate),
          reopen: grant(manage, reopen, reopenMutation.isPending || isReopeningAfterInvalidate),
        },
        outcomes: { replace: manage, activate: manage, deactivate: manage, close: manage, reopen: manage },
      };
    },
  };
}
