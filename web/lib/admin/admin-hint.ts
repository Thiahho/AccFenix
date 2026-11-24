/**
 * Readable companion of the httpOnly session cookie. It only tells the public site to show a shortcut to the
 * admin panel; it grants nothing, since the proxy and the API still check the real session.
 */
export const ADMIN_HINT_COOKIE = "accfenix_admin_hint";

/** True when the browser cookie string carries the admin hint. */
export function hasAdminHint(cookieString: string): boolean {
  return cookieString.split(";").some((part) => part.trim().startsWith(`${ADMIN_HINT_COOKIE}=`));
}
