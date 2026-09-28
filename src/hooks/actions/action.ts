import type { CapabilityOutcome } from "../permissions";

/**
 * One thing the caller may do, and whether it is in flight.
 *
 * The function and its pending flag are one value on purpose. When the answer
 * is no there is no value at all, so there is no flag left over to drive a
 * spinner for a button that is not there, and no `actions.edit?.(…)` that looks
 * like a call and quietly does nothing. `disabled={edit.isPending}` does not
 * compile until `edit` has been narrowed, and once it is narrowed the control is
 * already inside the check: the gate and the control become one expression.
 *
 * Nothing here exposes `mutate`, `mutateAsync` or the mutation object. A screen
 * that received `undefined` must have no way to reach past it.
 */
export type Action<Args extends unknown[], Result = void> = {
  run: (...args: Args) => Promise<Result>;
  isPending: boolean;
};

/** An action the caller may not have. Absent covers denied, pending and error alike. */
export type MaybeAction<Args extends unknown[], Result = void> = Action<Args, Result> | undefined;

/**
 * What every action hook returns.
 *
 * `outcomes` carries the same four states the permissions module reports, one
 * per action, keyed identically so the two cannot drift. The action alone is the
 * safe default -- absent on pending, denied and error, exactly like `Can` -- but
 * a screen that only ever saw "absent" would reintroduce, one level down, the
 * bug capabilityOutcome.ts exists to prevent: a menu missing an item and then
 * growing one is "not yet known" rendered as "no", and a capability request that
 * 500s is a retry the reader is never offered. The honest answer is available;
 * taking it is opt-in.
 */
export interface ActionBundle<TActions extends Record<string, Action<never[], never> | undefined>> {
  actions: TActions;
  outcomes: { [K in keyof TActions]: CapabilityOutcome };
}

/**
 * Hands the action out only on `allowed`.
 *
 * The generated mutation hook is always called, by the action hook, on every
 * render -- the rules of hooks leave no choice. What the gate decides is whether
 * the result is handed out, never whether it exists.
 */
export function grant<Args extends unknown[], Result>(
  outcome: CapabilityOutcome,
  run: (...args: Args) => Promise<Result>,
  isPending: boolean,
): MaybeAction<Args, Result> {
  return outcome.state === "allowed" ? { run, isPending } : undefined;
}

/**
 * An action with no capability behind it.
 *
 * `reason` is the whole point: one line saying why the backend has no answer to
 * give. Two kinds are legitimate and permanent -- an operation that exists
 * before a session does ("no session: …"), and one the API documents as open to
 * any authenticated caller ("open to any authenticated caller: …"). Every other
 * reason is a gate that has not been written yet and must name the issue that
 * writes it. src/contracts/mutationHooks.spec.ts enforces that shape and counts
 * these: the count only ever goes down.
 */
export function ungated<Args extends unknown[], Result>(
  reason: string,
  run: (...args: Args) => Promise<Result>,
  isPending: boolean,
): Action<Args, Result> {
  void reason;
  return { run, isPending };
}
