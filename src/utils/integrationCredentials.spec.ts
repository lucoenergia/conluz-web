import { describe, expect, it } from "vitest";
import { apiError } from "../test/apiError";
import {
  buildCredentialsBody,
  isHttpUrl,
  passwordRequiredMessage,
  storedPasswordFrom,
  validateCredentials,
  type CredentialsValues,
} from "./integrationCredentials";

const VALID: CredentialsValues = {
  enabled: true,
  username: "datadis-user",
  password: "",
  baseUrl: "https://datadis.es",
};

describe("buildCredentialsBody", () => {
  it("UI-INT-001 omits the password key when the field is empty", () => {
    expect(buildCredentialsBody(VALID)).not.toHaveProperty("password");
  });

  it("UI-INT-001 sends a typed password as is", () => {
    expect(buildCredentialsBody({ ...VALID, password: " clave " })).toHaveProperty("password", " clave ");
  });
});

describe("validateCredentials", () => {
  it("UI-INT-001 requires the password only when none is stored", () => {
    expect(validateCredentials(VALID, { passwordSet: false })).toEqual({ password: "Introduce la contraseña." });
    expect(validateCredentials(VALID, { passwordSet: true })).toEqual({});
    // Unknown: the read failed, so the backend decides.
    expect(validateCredentials(VALID, { passwordSet: undefined })).toEqual({});
    expect(validateCredentials({ ...VALID, password: "clave" }, { passwordSet: false })).toEqual({});
  });

  it("UI-INT-002 requires a non-blank username", () => {
    expect(validateCredentials({ ...VALID, username: " " }, { passwordSet: true })).toEqual({
      username: "Introduce el usuario.",
    });
  });

  it("UI-INT-002 requires a base URL, and an http(s) one", () => {
    expect(validateCredentials({ ...VALID, baseUrl: "" }, { passwordSet: true })).toEqual({
      baseUrl: "Introduce la URL del servicio.",
    });
    expect(validateCredentials({ ...VALID, baseUrl: "datadis.es" }, { passwordSet: true })).toEqual({
      baseUrl: "Introduce una URL válida que empiece por http:// o https://.",
    });
  });
});

describe("isHttpUrl", () => {
  it.each([
    ["https://datadis.es", true],
    ["http://localhost:8080", true],
    ["datadis.es", false],
    ["ftp://datadis.es", false],
    ["https://", false],
    ["", false],
  ])("UI-INT-002 %s → %s", (value, expected) => {
    expect(isHttpUrl(value)).toBe(expected);
  });
});

describe("storedPasswordFrom", () => {
  it("UI-INT-001 reads passwordSet from a successful read", () => {
    expect(storedPasswordFrom({ passwordSet: true }, null)).toBe(true);
    expect(storedPasswordFrom({ passwordSet: false }, null)).toBe(false);
  });

  it("UI-INT-001 takes a 404 for no password stored", () => {
    expect(storedPasswordFrom(undefined, apiError(404))).toBe(false);
  });

  it("UI-INT-001 leaves it unknown on any other failure, and while nothing has arrived", () => {
    expect(storedPasswordFrom(undefined, apiError(500))).toBeUndefined();
    expect(storedPasswordFrom(undefined, new Error("Network Error"))).toBeUndefined();
    expect(storedPasswordFrom(undefined, null)).toBeUndefined();
  });
});

describe("passwordRequiredMessage", () => {
  it("UI-INT-001 places the provider's own password-required refusal", () => {
    expect(
      passwordRequiredMessage(
        apiError(400, { code: "DATADIS_CONFIG_PASSWORD_REQUIRED" }),
        "DATADIS_CONFIG_PASSWORD_REQUIRED",
      ),
    ).toBe("No hay ninguna contraseña guardada. Introdúcela para guardar la configuración.");
  });

  it("UI-INT-001 leaves every other refusal to the screen's generic handling", () => {
    expect(passwordRequiredMessage(apiError(400), "DATADIS_CONFIG_PASSWORD_REQUIRED")).toBeUndefined();
    expect(
      passwordRequiredMessage(
        apiError(400, { code: "HUAWEI_CONFIG_PASSWORD_REQUIRED" }),
        "DATADIS_CONFIG_PASSWORD_REQUIRED",
      ),
    ).toBeUndefined();
  });
});
