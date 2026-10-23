import { useGetOperatorContact } from "../../api/info/info";
import type { OperatorContactResponse } from "../../api/models";

/**
 * The instance operator's contact, or `null` while there is none to show (#295).
 *
 * Not configured, still loading and failed all read as `null`. The operator is a
 * last resort below the instruction to contact whoever manages the community,
 * so a request that fails leaves that section out instead of raising an alert.
 * Pass `enabled: false` where the operator would not be shown, so it is not
 * requested at all.
 */
export function useOperatorContact(enabled: boolean): OperatorContactResponse | null {
  const { data } = useGetOperatorContact({ query: { enabled } });
  return enabled ? (data?.contact ?? null) : null;
}
