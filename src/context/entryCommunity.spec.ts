import { describe, expect, test } from "vitest";
import { buildCommunity, buildSupply } from "../test/fixtures";
import { pickFirstTimeCommunity, rememberedCommunity } from "./entryCommunity";

const ALFA = buildCommunity({ id: "id-3", name: "Alfa" });
const BETA = buildCommunity({ id: "id-1", name: "Beta" });
const GAMMA = buildCommunity({ id: "id-2", name: "Gamma" });
const COMMUNITIES = [GAMMA, BETA, ALFA];
const MEMBERSHIPS = [GAMMA.id, BETA.id, ALFA.id];

function supplyIn(community: { id: string; name: string }) {
  return buildSupply({ id: `supply-in-${community.id}`, community: { id: community.id, name: community.name } });
}

describe("rememberedCommunity", () => {
  test("UI-ENT-002 keeps the remembered community while it is still a membership", () => {
    expect(rememberedCommunity(MEMBERSHIPS, BETA.id)).toBe(BETA.id);
  });

  test("UI-ENT-002 a remembered community that is no longer a membership counts as nothing remembered", () => {
    expect(rememberedCommunity(MEMBERSHIPS, "id-revoked")).toBeNull();
  });

  test("UI-ENT-002 nothing remembered is nothing remembered", () => {
    expect(rememberedCommunity(MEMBERSHIPS, null)).toBeNull();
  });
});

describe("pickFirstTimeCommunity", () => {
  test("UI-ENT-003 picks the community where the caller owns supply points over an alphabetically earlier one", () => {
    expect(pickFirstTimeCommunity(MEMBERSHIPS, COMMUNITIES, [supplyIn(GAMMA)])).toBe(GAMMA.id);
  });

  test("UI-ENT-003 owning supply points nowhere, picks the alphabetically first of all memberships", () => {
    expect(pickFirstTimeCommunity(MEMBERSHIPS, COMMUNITIES, [])).toBe(ALFA.id);
  });

  test("UI-ENT-003 owning supply points in several, picks the alphabetically first among those", () => {
    expect(pickFirstTimeCommunity(MEMBERSHIPS, COMMUNITIES, [supplyIn(GAMMA), supplyIn(BETA)])).toBe(BETA.id);
  });

  test("UI-ENT-003 a supply outside the caller's memberships does not count", () => {
    const elsewhere = { id: "id-not-mine", name: "Aaa" };
    expect(pickFirstTimeCommunity(MEMBERSHIPS, COMMUNITIES, [supplyIn(elsewhere)])).toBe(ALFA.id);
  });

  test("UI-ENT-003 a failed supplies read counts as owning none", () => {
    expect(pickFirstTimeCommunity(MEMBERSHIPS, COMMUNITIES, undefined)).toBe(ALFA.id);
  });

  test("UI-ENT-003 orders by name regardless of case and accents", () => {
    const avila = buildCommunity({ id: "id-9", name: "Ávila" });
    const burgos = buildCommunity({ id: "id-0", name: "burgos" });
    expect(pickFirstTimeCommunity([burgos.id, avila.id], [burgos, avila], [])).toBe(avila.id);
  });

  test("UI-ENT-003 without community names, orders by community id", () => {
    expect(pickFirstTimeCommunity(MEMBERSHIPS, undefined, [])).toBe(BETA.id);
  });

  test("UI-ENT-003 without community names, still prefers where the caller owns supply points", () => {
    expect(pickFirstTimeCommunity(MEMBERSHIPS, undefined, [supplyIn(ALFA), supplyIn(GAMMA)])).toBe(GAMMA.id);
  });
});
