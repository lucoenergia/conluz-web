import { describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import { renderHookWithProviders } from "../test/renderWithProviders";
import { apiError } from "../test/apiError";
import { useIntegrationToggle, type IntegrationToggleOptions, type IntegrationToggleResult } from "./useIntegrationToggle";

const ok = (): Promise<IntegrationToggleResult> => Promise.resolve({ ok: true });
const refused = (error: unknown) => (): Promise<IntegrationToggleResult> => Promise.resolve({ error });

function setup(overrides: Partial<IntegrationToggleOptions> = {}) {
  const options: IntegrationToggleOptions = {
    enabled: false,
    enable: { run: vi.fn(ok), isPending: false },
    disable: { run: vi.fn(ok), isPending: false },
    incompleteCode: "HUAWEI_CONFIG_INCOMPLETE",
    notFoundCode: "HUAWEI_CONFIG_NOT_FOUND",
    onNotFound: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  };
  const rendered = renderHookWithProviders((props: IntegrationToggleOptions) => useIntegrationToggle(props), {
    initialProps: options,
  });
  return { ...rendered, options };
}

describe("useIntegrationToggle", () => {
  it("UI-INT-009 asks to confirm the direction flipped to, and runs only that write", async () => {
    const { result, options } = setup({ enabled: false });

    act(() => result.current.request(true));
    expect(result.current.requested).toBe(true);
    await act(() => result.current.confirm());

    expect(options.enable?.run).toHaveBeenCalledTimes(1);
    expect(options.disable?.run).not.toHaveBeenCalled();
    expect(result.current.requested).toBeNull();
  });

  it("UI-INT-009 turning off runs disable, never enable", async () => {
    const { result, options } = setup({ enabled: true });

    act(() => result.current.request(false));
    await act(() => result.current.confirm());

    expect(options.disable?.run).toHaveBeenCalledTimes(1);
    expect(options.enable?.run).not.toHaveBeenCalled();
  });

  it("UI-INT-009 asks nothing for a direction the caller was not handed", () => {
    const { result } = setup({ enabled: false, enable: undefined });

    act(() => result.current.request(true));

    expect(result.current.requested).toBeNull();
  });

  it("UI-INT-009 ignores a second flip, and a second confirm, while a write is in flight", async () => {
    let settle: (result: IntegrationToggleResult) => void = () => {};
    const run = vi.fn(() => new Promise<IntegrationToggleResult>((resolve) => (settle = resolve)));
    const { result } = setup({ enabled: false, enable: { run, isPending: false } });

    act(() => result.current.request(true));
    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.confirm();
    });
    expect(result.current.isPending).toBe(true);

    act(() => result.current.request(true));
    await act(() => result.current.confirm());
    act(() => result.current.cancel());
    expect(result.current.requested).toBe(true);

    await act(async () => {
      settle({ ok: true });
      await first;
    });
    expect(run).toHaveBeenCalledTimes(1);
    expect(result.current.isPending).toBe(false);
  });

  it("UI-INT-009 reports pending while the actions layer does", () => {
    const { result } = setup({ disable: { run: vi.fn(ok), isPending: true } });

    expect(result.current.isPending).toBe(true);
  });

  it("UI-INT-010 a refused enable lists the missing fields in Spanish, and raises no generic error", async () => {
    const error = apiError(409, { code: "HUAWEI_CONFIG_INCOMPLETE", params: { missingFields: "username,password" } });
    const { result, options } = setup({ enable: { run: vi.fn(refused(error)), isPending: false } });

    act(() => result.current.request(true));
    await act(() => result.current.confirm());

    expect(result.current.missingFields).toEqual(["usuario", "contraseña"]);
    expect(options.onError).not.toHaveBeenCalled();
    expect(options.onNotFound).not.toHaveBeenCalled();
  });

  it("UI-INT-010 forgets the missing fields once asked to, and after a write that succeeds", async () => {
    const error = apiError(409, { code: "HUAWEI_CONFIG_INCOMPLETE", params: { missingFields: "password" } });
    const run = vi.fn(refused(error));
    const { result } = setup({ enable: { run, isPending: false } });

    act(() => result.current.request(true));
    await act(() => result.current.confirm());
    expect(result.current.missingFields).toEqual(["contraseña"]);
    act(() => result.current.clearMissing());
    expect(result.current.missingFields).toBeNull();

    act(() => result.current.request(true));
    await act(() => result.current.confirm());
    expect(result.current.missingFields).toEqual(["contraseña"]);
    run.mockImplementation(ok);
    act(() => result.current.request(true));
    await act(() => result.current.confirm());
    expect(result.current.missingFields).toBeNull();
  });

  it("UI-INT-009 a configuration deleted meanwhile asks to be read again", async () => {
    const error = apiError(404, { code: "HUAWEI_CONFIG_NOT_FOUND" });
    const { result, options } = setup({ enabled: true, disable: { run: vi.fn(refused(error)), isPending: false } });

    act(() => result.current.request(false));
    await act(() => result.current.confirm());

    expect(options.onNotFound).toHaveBeenCalledTimes(1);
    expect(options.onError).not.toHaveBeenCalled();
  });

  it("UI-INT-009 any other refusal raises the generic error", async () => {
    const { result, options } = setup({ enabled: true, disable: { run: vi.fn(refused(apiError(500))), isPending: false } });

    act(() => result.current.request(false));
    await act(() => result.current.confirm());

    expect(options.onError).toHaveBeenCalledTimes(1);
    expect(options.onNotFound).not.toHaveBeenCalled();
    expect(result.current.missingFields).toBeNull();
  });

  it("reads each provider's own codes, not Huawei's", async () => {
    const error = apiError(409, { code: "DATADIS_CONFIG_INCOMPLETE", params: { missingFields: "baseUrl" } });
    const { result, options } = setup({
      incompleteCode: "DATADIS_CONFIG_INCOMPLETE",
      notFoundCode: "DATADIS_CONFIG_NOT_FOUND",
      enable: { run: vi.fn(refused(error)), isPending: false },
    });

    act(() => result.current.request(true));
    await act(() => result.current.confirm());

    expect(result.current.missingFields).toEqual(["URL del servicio"]);
    expect(options.onError).not.toHaveBeenCalled();
  });
});
