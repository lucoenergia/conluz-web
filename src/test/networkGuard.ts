/**
 * Refuses every real network request a unit test makes, below both mocking
 * tiers. Installed for every spec file by `networkGuard.setup.ts`.
 *
 * Specs mock the generated hooks (tier 1) or `customInstance` with
 * `routeRequests` (tier 2), so a request that reaches the transport is one
 * nothing mocked: a hook a spec forgot, or a direct `AXIOS_INSTANCE` call. The
 * guard sits on the transport rather than on `customInstance` because tier 2
 * replaces `customInstance` itself, and the harness's `AuthProvider` needs the
 * real `AXIOS_INSTANCE`.
 *
 * Covered: `XMLHttpRequest` (axios picks its xhr adapter under jsdom) and
 * `fetch`. `src/` uses no other network API today; a new one (WebSocket,
 * EventSource, sendBeacon...) must be added here.
 *
 * A refused request is rejected AND fails the test it happened in, whether or
 * not anything awaits the rejection: TanStack Query turns a failed fetch into
 * query error state, so a rejection alone would leave the test green. A test
 * whose subject is a refused request takes it with `takeBlockedRequests()`.
 */

type GuardState = { blocked: string[]; installed: boolean };

// On globalThis, so the setup file and a spec that imports this module share
// one list even if each gets its own module instance.
const STATE_KEY = "__conluzNetworkGuard";
const globalWithState = globalThis as typeof globalThis & { [STATE_KEY]?: GuardState };
const state: GuardState = (globalWithState[STATE_KEY] ??= { blocked: [], installed: false });

const refusal = (request: string) => `Real network request blocked in a unit test: ${request}`;

function block(request: string): Error {
  state.blocked.push(request);
  return new Error(refusal(request));
}

function guardXhr(): void {
  if (typeof XMLHttpRequest === "undefined") return;
  const proto = XMLHttpRequest.prototype;
  const targets = new WeakMap<XMLHttpRequest, string>();
  const originalOpen = proto.open as (this: XMLHttpRequest, ...args: unknown[]) => void;

  proto.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
    targets.set(this, `${method.toUpperCase()} ${String(url)}`);
    originalOpen.call(this, method, url, ...rest);
  } as typeof proto.open;

  // Thrown synchronously: axios calls send() inside its promise executor, so
  // the request rejects without a socket ever being opened.
  proto.send = function (this: XMLHttpRequest) {
    throw block(targets.get(this) ?? "XMLHttpRequest to an unknown URL");
  };
}

function guardFetch(): void {
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const isRequest = typeof Request !== "undefined" && input instanceof Request;
    const method = (init?.method ?? (isRequest ? input.method : "GET")).toUpperCase();
    const url = isRequest ? input.url : String(input);
    return Promise.reject(block(`${method} ${url}`));
  };
}

export function installNetworkGuard(): void {
  if (state.installed) return;
  state.installed = true;
  guardXhr();
  guardFetch();
}

/**
 * Returns the refused requests not yet reported, as "METHOD url", and marks
 * them expected so they do not fail the test. Only for tests whose subject is
 * a refused request.
 */
export function takeBlockedRequests(): string[] {
  return state.blocked.splice(0);
}

/** Throws if a request was refused since the last check. */
export function failOnBlockedRequests(): void {
  const blocked = takeBlockedRequests();
  if (blocked.length === 0) return;
  throw new Error(
    `networkGuard: ${blocked.length} real network request(s) in this test:\n` +
      blocked.map((request) => `  - ${request}`).join("\n") +
      "\nMock the generated hook (tier 1) or customInstance with routeRequests (tier 2): see the conluz-web-testing skill.",
  );
}
