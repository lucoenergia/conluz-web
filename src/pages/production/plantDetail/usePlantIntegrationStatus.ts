import { useGetHuaweiConfig } from "../../../api/production/production";
import type { PlantResponse } from "../../../api/models";
import { isNotFound, retryUnlessNotFound } from "../huaweiConfig";

/**
 * Where the plant's Huawei integration stands, as the plant detail summarises it:
 *
 * - `active` / `disabled`: a configuration is stored, and its `enabled` says which.
 * - `not-configured`: the read answered 404, the normal state of a new plant.
 * - `pending`: still reading.
 * - `unknown`: the read failed with anything else, so nothing is claimed; or
 *   the caller may not read it at all.
 */
export type PlantIntegrationStatus = "active" | "disabled" | "not-configured" | "pending" | "unknown";

/**
 * The same read as the integrations section's card (same key, so one request
 * and one cache entry), issued only for a caller the plant says may manage it:
 * reading the configuration needs what writing it needs (UI-INT-006).
 */
export function usePlantIntegrationStatus(plant: PlantResponse | undefined): PlantIntegrationStatus {
  const canManage = plant?.capabilities.canManage === true;
  const { data, error, isLoading } = useGetHuaweiConfig(plant?.id ?? "", {
    query: { enabled: canManage, retry: retryUnlessNotFound },
  });

  if (!canManage) return "unknown";
  if (data) return data.enabled ? "active" : "disabled";
  if (isNotFound(error)) return "not-configured";
  if (error) return "unknown";
  return isLoading ? "pending" : "unknown";
}

/** Whether the integration still needs a step from someone who may manage it. */
export const needsIntegrationStep = (status: PlantIntegrationStatus) =>
  status === "not-configured" || status === "disabled";
