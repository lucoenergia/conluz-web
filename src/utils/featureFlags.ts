/**
 * Build-time switches, read from the environment Vite inlines into the bundle.
 *
 * Read on every call rather than once at import, so a spec can stub the
 * variable (`vi.stubEnv`) for the case it exercises.
 */

/**
 * Whether the app shows Shelly anywhere: its configuration, its card, and any
 * field, link or text about it (#406). Off unless the build sets
 * CONLUZ_SHELLY_ENABLED to exactly "true": no Shelly data is used yet, and it
 * returns with real-time data, which needs a deployment anyway.
 */
export const isShellyEnabled = (): boolean => import.meta.env.CONLUZ_SHELLY_ENABLED === "true";
