import { describe, expect, it } from "vitest";
import { LAST_12, LATEST, YEAR, monthAnchor } from "../../components/period/historicalPeriod";
import { COMMUNITY_DEFAULT_PRESET, COMMUNITY_PRESETS, communityClampNotice } from "./communityPeriod";

describe("UI-CAN-002 the community period (#403)", () => {
  it("UI-CAN-002 offers the presets of 'Mi consumo y ahorro', defaulting to the latest published month", () => {
    expect(COMMUNITY_PRESETS).toEqual([LATEST, YEAR, LAST_12]);
    expect(COMMUNITY_DEFAULT_PRESET).toBe(LATEST);
  });

  it("UI-CAN-002 names the community's latest published month in the clamp notice", () => {
    expect(communityClampNotice(monthAnchor({ year: 2026, month: 7 }))).toBe(
      "La comunidad tiene datos publicados hasta julio de 2026, así que hemos ajustado el periodo.",
    );
  });
});
