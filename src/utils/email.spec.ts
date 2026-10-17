import { describe, expect, it } from "vitest";
import { isValidEmail } from "./email";

describe("isValidEmail", () => {
  it.each(["ana@example.com", "ana.garcia+conluz@sub.example.es"])("accepts %s", (value) => {
    expect(isValidEmail(value)).toBe(true);
  });

  it.each(["", "ana", "ana@", "@example.com", "ana@example", "ana @example.com", "ana@@example.com"])(
    "rejects %j",
    (value) => {
      expect(isValidEmail(value)).toBe(false);
    },
  );
});
