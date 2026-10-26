import type { FC } from "react";
import { Alert, type AlertProps } from "@mui/material";

export type NoticeProps = Omit<AlertProps, "role">;

/**
 * An informational note: a guide, an explanation, a consequence, or the result
 * of an action. It looks like an `Alert` of the same severity, but is a note
 * (`role="note"`), read in place and never announced.
 *
 * MUI gives every `Alert` `role="alert"`, which a screen reader announces at
 * once, interrupting whatever is being read (#310). That is right for an error
 * or a warning the user must act on now, which stay a plain `Alert`; it is
 * noise for everything else.
 *
 * A note that reports what just happened is announced through an
 * `ActionStatus` mounted before it appears, not by this element: a live region
 * inserted together with its text is announced unreliably.
 */
export const Notice: FC<NoticeProps> = (props) => <Alert role="note" {...props} />;
