import { Navigate } from "react-router-dom";

/** Used when a route is hidden but we still want old URLs to land somewhere sensible. */
export function HiddenRouteRedirect() {
  return <Navigate to="/" replace />;
}
