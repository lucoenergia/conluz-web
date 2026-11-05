import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DOCUMENTED_MEMBERSHIP_DAILY_CONSUMPTION_BUCKET,
  DOCUMENTED_MEMBERSHIP_ENERGY_METRICS,
  DOCUMENTED_MEMBERSHIP_HOURLY_CONSUMPTION_BUCKET,
  DOCUMENTED_MEMBERSHIP_MONTHLY_CONSUMPTION_BUCKET,
  DOCUMENTED_SUPPLY_CONSUMPTION_BUCKET,
  DOCUMENTED_SUPPLY_ENERGY_METRICS,
  DOCUMENTED_SUPPLY_HOURLY_CONSUMPTION_BUCKET,
} from "./documentedResponses";

/**
 * The documented responses are the schema examples of api-docs.json and
 * nothing else (#249): each is rebuilt here from the spec, so a value edited
 * to suit a test, or one the backend has since changed, fails.
 */

type Schema = { $ref?: string; properties?: Record<string, Schema>; example?: unknown };

const SCHEMAS: Record<string, Schema> = JSON.parse(readFileSync("api-docs.json", "utf8")).components.schemas;

/** The object a schema's examples describe: every property, down to the leaves, each from its own example. */
function fromExamples(schema: Schema, path: string): unknown {
  if (schema.$ref) return fromExamples(SCHEMAS[schema.$ref.split("/").pop()!], path);
  if (schema.properties) {
    return Object.fromEntries(Object.entries(schema.properties).map(([name, property]) => [name, fromExamples(property, `${path}.${name}`)]));
  }
  if (schema.example === undefined) throw new Error(`api-docs.json documents no example for ${path}`);
  return schema.example;
}

describe("documented energy metrics responses (#249)", () => {
  it("the membership response is its schema's examples, unedited", () => {
    expect(DOCUMENTED_MEMBERSHIP_ENERGY_METRICS).toEqual(
      fromExamples(SCHEMAS.MembershipEnergyMetricsResponse, "MembershipEnergyMetricsResponse"),
    );
  });

  it("the supply response is its schema's examples, unedited", () => {
    expect(DOCUMENTED_SUPPLY_ENERGY_METRICS).toEqual(fromExamples(SCHEMAS.SupplyEnergyMetricsResponse, "SupplyEnergyMetricsResponse"));
  });
});

describe("documented consumption series buckets (#250)", () => {
  it("the membership daily bucket is its schema's examples, unedited", () => {
    expect(DOCUMENTED_MEMBERSHIP_DAILY_CONSUMPTION_BUCKET).toEqual(
      fromExamples(SCHEMAS.MembershipDailyConsumptionBucketResponse, "MembershipDailyConsumptionBucketResponse"),
    );
  });

  it("the membership monthly bucket is its schema's examples, unedited", () => {
    expect(DOCUMENTED_MEMBERSHIP_MONTHLY_CONSUMPTION_BUCKET).toEqual(
      fromExamples(SCHEMAS.MembershipMonthlyConsumptionBucketResponse, "MembershipMonthlyConsumptionBucketResponse"),
    );
  });

  it("the supply bucket is its schema's examples, unedited", () => {
    expect(DOCUMENTED_SUPPLY_CONSUMPTION_BUCKET).toEqual(
      fromExamples(SCHEMAS.SupplyConsumptionBucketResponse, "SupplyConsumptionBucketResponse"),
    );
  });
});

describe("documented hourly consumption series buckets (#378)", () => {
  it("the membership hourly bucket is its schema's examples, unedited", () => {
    expect(DOCUMENTED_MEMBERSHIP_HOURLY_CONSUMPTION_BUCKET).toEqual(
      fromExamples(SCHEMAS.MembershipHourlyConsumptionBucketResponse, "MembershipHourlyConsumptionBucketResponse"),
    );
  });

  it("the supply hourly bucket is its schema's examples, unedited", () => {
    expect(DOCUMENTED_SUPPLY_HOURLY_CONSUMPTION_BUCKET).toEqual(
      fromExamples(SCHEMAS.SupplyHourlyConsumptionBucketResponse, "SupplyHourlyConsumptionBucketResponse"),
    );
  });
});
