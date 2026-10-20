import { vi, type MockInstance } from "vitest";
import type { QueryClient } from "@tanstack/react-query";

const CONSOLE_METHODS = ["log", "info", "warn", "error", "debug"] as const;

function storageContents(): string[] {
  const values: string[] = [];
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index) ?? "";
      values.push(key, storage.getItem(key) ?? "");
    }
  }
  return values;
}

/**
 * Watches every place a secret must never reach (#288): what was written to
 * either storage, what is in them now, cookies, the address bar, and the
 * console. Call it in a `beforeEach`; the spies are restored by
 * `vi.restoreAllMocks()`.
 *
 * Mock-free, so any spec may import it.
 */
export function watchForSecrets() {
  const setItemSpy: MockInstance<Storage["setItem"]> = vi.spyOn(Storage.prototype, "setItem");
  const consoleSpies: MockInstance[] = CONSOLE_METHODS.map((method) => vi.spyOn(console, method));

  return {
    /** Every place the secret was found, by name; empty when it reached none. */
    leaksOf(secret: string): string[] {
      const found = (values: unknown[]) => values.map(String).some((value) => value.includes(secret));
      const places: [string, boolean][] = [
        ["storage writes", found(setItemSpy.mock.calls.flat())],
        ["storage contents", found(storageContents())],
        ["cookies", document.cookie.includes(secret)],
        ["address bar", window.location.href.includes(secret)],
        ["console", found(consoleSpies.flatMap((spy) => spy.mock.calls.flat()))],
      ];
      return places.filter(([, leaked]) => leaked).map(([place]) => place);
    },
    /** Whatever the console received, joined, for assertions on what was logged. */
    consoleOutput(): string {
      return consoleSpies.flatMap((spy) => spy.mock.calls.flat().map(String)).join("\n");
    },
  };
}

/**
 * Whether the secret is anywhere in the query or the mutation cache: the data
 * and variables of every query and mutation, serialised.
 */
export function cachesHold(queryClient: QueryClient, secret: string): boolean {
  const queries = queryClient.getQueryCache().getAll().map((query) => query.state.data);
  const mutations = queryClient
    .getMutationCache()
    .getAll()
    .map((mutation) => [mutation.state.data, mutation.state.variables]);
  return JSON.stringify([queries, mutations]).includes(secret);
}
