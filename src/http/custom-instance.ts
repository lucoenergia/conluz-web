import Axios, { AxiosError, type AxiosRequestConfig } from 'axios';

/**
 * How long a request may go unanswered before it fails (#310). Without a
 * limit, a request the network never answers stays pending until the browser
 * drops the connection, and a dialog whose write is in flight cannot be
 * dismissed until then. A timed-out request fails with no response, which
 * `isNetworkFailure` (src/errors/networkFailure.ts) reads as a network failure,
 * so it settles as any failed request does.
 */
export const REQUEST_TIMEOUT_MS = 30_000;

/**
 * File uploads (the member and supply CSV imports, a sharing agreement's file)
 * send a body that may be large and that the backend processes row by row
 * before answering, so they get a longer limit.
 */
export const UPLOAD_TIMEOUT_MS = 120_000;

export const AXIOS_INSTANCE = Axios.create({
  baseURL: import.meta.env.CONLUZ_API_URL ? import.meta.env.CONLUZ_API_URL : "http://localhost:8080",
  timeout: REQUEST_TIMEOUT_MS,
});

/** The limit for one request: the upload limit for a multipart body, unless the call sets its own. */
export function timeoutFor(config: AxiosRequestConfig): number {
  if (config.timeout !== undefined) return config.timeout;
  return typeof FormData !== "undefined" && config.data instanceof FormData ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS;
}

export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  const source = Axios.CancelToken.source();
  const promise = AXIOS_INSTANCE({ ...config, timeout: timeoutFor(config), cancelToken: source.token }).then(
    ({ data }) => data,
  );

  // @ts-expect-error — cancel is not part of the Promise type but React Query reads it
  promise.cancel = () => {
    source.cancel('Query was cancelled by React Query');
  };

  return promise;
};

export default customInstance;

export type ErrorType<Error> = AxiosError<Error>;
