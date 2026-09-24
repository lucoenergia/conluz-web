/**
 * Version of the running app. Release images set it at build time from the
 * git tag (see docker/Dockerfile); local and dev builds report "dev".
 */
export const APP_VERSION: string = import.meta.env.CONLUZ_APP_VERSION || "dev";
