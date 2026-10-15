import { useRef, useState } from "react";
import type { RestErrorDetailCode } from "../api/models";
import type { Action } from "./actions";
import { getFirstApiErrorCode } from "../errors/apiErrorCatalogue";
import { missingFieldLabels } from "../utils/integrationCredentials";

/** An enable or disable write: success, or the refusal itself. */
export type IntegrationToggleResult = { ok: true } | { error: unknown };

type ToggleAction = Action<[], IntegrationToggleResult>;
type ErrorCode = Exclude<RestErrorDetailCode, null>;

export interface IntegrationToggleOptions {
  /** The stored `enabled`: what the switch shows until a write changes it. */
  enabled: boolean;
  /** Handed over by the actions layer; `undefined` when the caller may not. */
  enable: ToggleAction | undefined;
  disable: ToggleAction | undefined;
  /** The provider's "cannot enable, data missing" code, such as HUAWEI_CONFIG_INCOMPLETE. */
  incompleteCode: ErrorCode;
  /** The provider's "no configuration" code, such as HUAWEI_CONFIG_NOT_FOUND. */
  notFoundCode: ErrorCode;
  /** The configuration was deleted meanwhile: read it again, to show the empty state. */
  onNotFound: () => void;
  /** Any other refusal: the screen's generic error feedback. */
  onError: () => void;
}

export interface IntegrationToggle {
  /** The direction waiting for confirmation (`true` = enable), or `null`. */
  requested: boolean | null;
  /** The switch was flipped. Ignored while a write is in flight, or when the caller may not. */
  request: (next: boolean) => void;
  /** Runs the requested write; the confirmation stays open until it settles. */
  confirm: () => Promise<void>;
  /** Drops the request. Ignored while a write is in flight. */
  cancel: () => void;
  isPending: boolean;
  /**
   * The fields a refused enable named as missing, in Spanish, or `null`. The
   * switch stays at the stored `enabled`, which a refused enable did not change.
   */
  missingFields: string[] | null;
  /** Forget a refused enable, once the configuration has been completed. */
  clearMissing: () => void;
}

/**
 * The enable/disable switch of an integration, for any provider: which write
 * a flip asks for, its confirmation, and what each refusal means.
 *
 * Provider-agnostic on purpose. The Huawei card of plant detail uses it
 * (#192), and the Datadis switch will, with its own codes. The switch never
 * reaches the configuration write: turning an integration on or off goes
 * through its own endpoints only.
 */
export function useIntegrationToggle({
  enabled,
  enable,
  disable,
  incompleteCode,
  notFoundCode,
  onNotFound,
  onError,
}: IntegrationToggleOptions): IntegrationToggle {
  const [requested, setRequested] = useState<boolean | null>(null);
  const [running, setRunning] = useState(false);
  const [missingFields, setMissingFields] = useState<string[] | null>(null);
  // State lags a render behind: a second flip in the same tick would still
  // read `running` as false. The ref is what refuses it.
  const inFlight = useRef(false);

  const isPending = running || !!enable?.isPending || !!disable?.isPending;

  const request = (next: boolean) => {
    if (inFlight.current || isPending || next === enabled) return;
    if (!(next ? enable : disable)) return;
    setRequested(next);
  };

  const confirm = async () => {
    const action = requested === null ? undefined : requested ? enable : disable;
    if (!action || inFlight.current) return;

    inFlight.current = true;
    setRunning(true);
    try {
      const result = await action.run();
      if ("ok" in result) {
        setMissingFields(null);
        return;
      }
      const code = getFirstApiErrorCode(result.error);
      if (code === incompleteCode) setMissingFields(missingFieldLabels(result.error));
      else if (code === notFoundCode) onNotFound();
      else onError();
    } finally {
      inFlight.current = false;
      setRunning(false);
      setRequested(null);
    }
  };

  const cancel = () => {
    if (!inFlight.current) setRequested(null);
  };

  return {
    requested,
    request,
    confirm,
    cancel,
    isPending,
    missingFields,
    clearMissing: () => setMissingFields(null),
  };
}
