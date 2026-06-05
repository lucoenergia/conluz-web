import type { UserResponse } from "../api/models";

export function resolveLandingRoute(user: UserResponse): string {
  if (Object.keys(user.memberships ?? {}).length > 0) return '/';
  if (user.isPlatformAdmin) return '/platform';
  return '/no-community';
}
