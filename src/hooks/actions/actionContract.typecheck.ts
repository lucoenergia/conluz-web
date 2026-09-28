/**
 * The Action contract, proved at compile time.
 *
 * Nothing imports this file. It exists so that `tsc -b` re-proves, on every
 * build, the guarantees the runtime specs cannot reach: that a screen cannot
 * call an action, or read its pending flag, without first checking it was given
 * one. A runtime spec can only assert what happens for the values it passes;
 * these are the cases that must not compile at all.
 *
 * Same idiom as src/hooks/permissions/capabilityNames.typecheck.ts.
 */
import type { MembershipCapabilitiesResponse, SupplyCapabilitiesResponse } from "../../api/models";
import { outcomeFromResource } from "../permissions";
import type { MaybeAction } from "./action";

declare const remove: MaybeAction<[], boolean>;
declare const edit: MaybeAction<[{ name: string }], boolean>;

// ── Negative controls: the gate cannot be skipped ───────────────────────────

export function rejectedActionUses() {
  // @ts-expect-error -- an action must be narrowed before it can be run
  void remove.run();

  // @ts-expect-error -- the pending flag lives inside the action, so it cannot
  // be read without the same check that decides whether to render the control
  void remove.isPending;

  // @ts-expect-error -- optional chaining is not a substitute for the check:
  // it type-checks the call away, but there is no action, so this is a silent
  // no-op dressed as a call. The contract has no `mutate` to reach either.
  void remove.mutateAsync;
}

// ── Positive controls: once narrowed, everything is available ───────────────

export function acceptedActionUses() {
  if (remove) {
    void remove.run();
    void remove.isPending;
  }
  if (edit) {
    void edit.run({ name: "TEST-NAME" });
  }
}

// ── Capability names are checked against the resource that carries them ─────

declare const membershipCapabilities: MembershipCapabilitiesResponse | undefined;
declare const supplyCapabilities: SupplyCapabilitiesResponse | undefined;

export function validCapabilityReads() {
  void outcomeFromResource(membershipCapabilities, "canDelete");
  void outcomeFromResource(supplyCapabilities, "canEdit");
}

export function rejectedCapabilityReads() {
  // @ts-expect-error -- misspelt
  void outcomeFromResource(membershipCapabilities, "canDeleet");

  // @ts-expect-error -- a real capability, but it belongs to a supply
  void outcomeFromResource(membershipCapabilities, "canEdit");

  // @ts-expect-error -- a real capability, but it belongs to a membership
  void outcomeFromResource(supplyCapabilities, "canUpdateRole");
}
