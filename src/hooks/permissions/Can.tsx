import type { FC, ReactNode } from "react";
import type { CapabilityOutcome } from "./capabilityOutcome";

interface CanProps {
  /** An outcome from one of the capability hooks. */
  outcome: CapabilityOutcome;
  children: ReactNode;
  /** Rendered whenever the children are not. Nothing, by default. */
  fallback?: ReactNode;
}

/**
 * Renders its children only on `allowed`.
 *
 * Every other state falls back, `error` included. A control whose authorisation
 * could not be established must not appear -- showing it would offer an action
 * the backend will refuse -- and an inline error beside a button is noise the
 * reader can do nothing with. A whole page failing to load is different, and
 * CapabilityRoute surfaces that one.
 */
export const Can: FC<CanProps> = ({ outcome, children, fallback = null }) => {
  return <>{outcome.state === "allowed" ? children : fallback}</>;
};
