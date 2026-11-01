import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DOCUMENTED_MEMBERSHIP_ENERGY_METRICS, DOCUMENTED_SUPPLY_ENERGY_METRICS } from "./documentedResponses";

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
