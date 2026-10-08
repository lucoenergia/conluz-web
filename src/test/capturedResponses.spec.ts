import { describe, expect, it } from "vitest";
import { CAPTURED_MEMBERSHIP_MONTHLY_CONSUMPTION, wireShapeOf } from "./capturedResponses";
import { buildMembershipMonthlyConsumptionBucket } from "./fixtures";

const [CAPTURED_BUCKET] = CAPTURED_MEMBERSHIP_MONTHLY_CONSUMPTION;

describe("wireShapeOf (#219)", () => {
  it("matches a value written the same way, whatever its digits", () => {
    expect("2031/12/01").toMatch(wireShapeOf("2022/10/01"));
    expect("23:59").toMatch(wireShapeOf("00:00"));
  });

  it("rejects a value written another way", () => {
    expect("2022-10-01").not.toMatch(wireShapeOf("2022/10/01"));
    expect("2022/10/01T00:00:00Z").not.toMatch(wireShapeOf("2022/10/01"));
    expect("00:00:00").not.toMatch(wireShapeOf("00:00"));
  });
});

describe("buildMembershipMonthlyConsumptionBucket (#219)", () => {
  it("AC2 -- carries the date and time exactly as the API writes them", () => {
    const bucket = buildMembershipMonthlyConsumptionBucket();

    expect(bucket.date).toMatch(wireShapeOf(CAPTURED_BUCKET.date));
    expect(bucket.time).toMatch(wireShapeOf(CAPTURED_BUCKET.time));
  });

  it("AC2 -- carries the fields the API returns, and no other", () => {
    expect(Object.keys(buildMembershipMonthlyConsumptionBucket()).sort()).toEqual(Object.keys(CAPTURED_BUCKET).sort());
  });
});
