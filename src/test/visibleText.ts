/**
 * Text-query options that skip the `ActionStatus` live region (#310). A message
 * that region announces is also shown on screen, so a plain text query finds
 * it twice; this one finds the copy the user sees.
 */
export const VISIBLE = { ignore: 'script, style, [role="status"]' } as const;
