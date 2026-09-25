import { vi } from "vitest";
import type {
  DataTag,
  QueryKey,
  QueryObserverLoadingErrorResult,
  QueryObserverLoadingResult,
  QueryObserverPendingResult,
  QueryObserverSuccessResult,
  UseMutationResult,
} from "@tanstack/react-query";
import type { ErrorType } from "../api/custom-instance";

/**
 * Settled hook states for tier 1 specs, which replace a generated hook with
 * `vi.fn()` and set its result through `vi.mocked(hook).mockReturnValue(...)`.
 *
 * `mockReturnValue` is typed as the hook's full result, so a hand-written
 * partial literal such as `{ data: undefined, isLoading: false }` does not
 * compile. Each builder returns a complete TanStack Query v5 observer result
 * for one named state, so a spec picks the state by name instead of leaving
 * fields out. `queryState.typecheck.ts` keeps these guarantees under `tsc -b`.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches any generated fetcher signature
type Fetcher = (...args: any[]) => Promise<unknown>;

/** The response type of a generated fetcher, e.g. `FetcherData<typeof getAllUsers>`. */
export type FetcherData<F extends Fetcher> = Awaited<ReturnType<F>>;

type QueryError = ErrorType<unknown>;
type Keyed<TData, TError> = { queryKey: DataTag<QueryKey, TData, TError> };

const TEST_QUERY_KEY = ["test-query"] as const;

function keyed<TData, TError>(queryKey: QueryKey = TEST_QUERY_KEY): DataTag<QueryKey, TData, TError> {
  return queryKey as DataTag<QueryKey, TData, TError>;
}

/** A promise that never settles: the state it stands for has not produced a value. */
function unsettled<T>(): Promise<T> {
  return new Promise<T>(() => {});
}

function baseResult() {
  return {
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetched: false,
    isFetchedAfterMount: false,
    isFetching: false,
    isInitialLoading: false,
    isPaused: false,
    isRefetching: false,
    isStale: false,
    refetch: vi.fn(),
  };
}

export const query = {
  /**
   * A resolved query. The fetcher is named explicitly so `data` is checked
   * against the generated response type: `query.success<typeof getAllUsers>(page)`.
   * Without the type argument `data` is `never`, so the call does not compile.
   */
  success<F extends Fetcher = never>(
    data: FetcherData<F>,
    options: { queryKey?: QueryKey } = {},
  ): QueryObserverSuccessResult<FetcherData<F>, QueryError> & Keyed<FetcherData<F>, QueryError> {
    return {
      ...baseResult(),
      data,
      dataUpdatedAt: 1,
      error: null,
      isError: false,
      isFetched: true,
      isFetchedAfterMount: true,
      isPending: false,
      isLoading: false,
      isLoadingError: false,
      isRefetchError: false,
      isSuccess: true,
      isPlaceholderData: false,
      status: "success",
      fetchStatus: "idle",
      promise: Promise.resolve(data),
      queryKey: keyed(options.queryKey),
    };
  },

  /** First fetch in flight: pending and fetching. */
  loading<TData = unknown>(
    options: { queryKey?: QueryKey } = {},
  ): QueryObserverLoadingResult<TData, QueryError> & Keyed<TData, QueryError> {
    return {
      ...baseResult(),
      data: undefined,
      error: null,
      isError: false,
      isFetching: true,
      isInitialLoading: true,
      isPending: true,
      isLoading: true,
      isLoadingError: false,
      isRefetchError: false,
      isSuccess: false,
      isPlaceholderData: false,
      status: "pending",
      fetchStatus: "fetching",
      promise: unsettled<TData>(),
      queryKey: keyed(options.queryKey),
    };
  },

  /** A query with `enabled: false`: pending but not fetching, so no data will arrive. */
  disabled<TData = unknown>(
    options: { queryKey?: QueryKey } = {},
  ): QueryObserverPendingResult<TData, QueryError> & Keyed<TData, QueryError> {
    return {
      ...baseResult(),
      data: undefined,
      error: null,
      isError: false,
      isPending: true,
      isLoading: false,
      isLoadingError: false,
      isRefetchError: false,
      isSuccess: false,
      isPlaceholderData: false,
      status: "pending",
      fetchStatus: "idle",
      promise: unsettled<TData>(),
      queryKey: keyed(options.queryKey),
    };
  },

  /** The first fetch failed, so there is no data. */
  error<TData = unknown, TError = QueryError>(
    error: TError,
    options: { queryKey?: QueryKey } = {},
  ): QueryObserverLoadingErrorResult<TData, TError> & Keyed<TData, TError> {
    return {
      ...baseResult(),
      data: undefined,
      error,
      errorUpdatedAt: 1,
      errorUpdateCount: 1,
      failureCount: 1,
      failureReason: error,
      isError: true,
      isFetched: true,
      isFetchedAfterMount: true,
      isPending: false,
      isLoading: false,
      isLoadingError: true,
      isRefetchError: false,
      isSuccess: false,
      isPlaceholderData: false,
      status: "error",
      fetchStatus: "idle",
      promise: unsettled<TData>(),
      queryKey: keyed(options.queryKey),
    };
  },
};

type MutationFns<TData, TError, TVariables, TContext> = Partial<
  Pick<UseMutationResult<TData, TError, TVariables, TContext>, "mutate" | "mutateAsync" | "reset">
>;

function mutationBase() {
  return {
    context: undefined,
    failureCount: 0,
    failureReason: null,
    isPaused: false,
    submittedAt: 0,
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  };
}

export const mutation = {
  /**
   * A mutation that has not run. Its type parameters are inferred from the
   * hook being mocked: `vi.mocked(useCreateMembership).mockReturnValue(mutation.idle({ mutateAsync }))`.
   */
  idle<TData = unknown, TError = unknown, TVariables = unknown, TContext = unknown>(
    fns: MutationFns<TData, TError, TVariables, TContext> = {},
  ): UseMutationResult<TData, TError, TVariables, TContext> {
    return {
      ...mutationBase(),
      ...fns,
      data: undefined,
      variables: undefined,
      error: null,
      isError: false,
      isIdle: true,
      isPending: false,
      isSuccess: false,
      status: "idle",
    };
  },

  /**
   * A mutation in flight with the given variables. The variables are checked
   * against the mocked hook's signature rather than widening it.
   */
  pending<TData = unknown, TError = unknown, TVariables = unknown, TContext = unknown>(
    variables: NoInfer<TVariables>,
    fns: MutationFns<TData, TError, TVariables, TContext> = {},
  ): UseMutationResult<TData, TError, TVariables, TContext> {
    return {
      ...mutationBase(),
      ...fns,
      data: undefined,
      variables,
      error: null,
      isError: false,
      isIdle: false,
      isPending: true,
      isSuccess: false,
      status: "pending",
      submittedAt: 1,
    };
  },
};
