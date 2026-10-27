import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, LayoutDashboard, SearchX } from "lucide-react";
import EmptyState from "./EmptyState";

/* -------------------------------------------------------------------------
 * NotFoundPage — the panel's one "not found" screen, built on the common
 * EmptyState (page variant).
 *
 *  - As the router's 404 (no props): "Page not found" for the unknown
 *    link, with Go to Dashboard + Go back. Rendered inside Layout, so a
 *    logged-out user is still sent to login first.
 *  - For a missing record (pass props): e.g.
 *      <NotFoundPage title="Promo code not found" icon="promo"
 *        backLabel="Back to Promo Codes" onBack={onBack} />
 * ---------------------------------------------------------------------- */
export default function NotFoundPage({ title, description, icon, backLabel, onBack }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const canGoBack = (window.history.state?.idx ?? 0) > 0;

  // A missing record: its own copy + the caller's Back.
  if (onBack) {
    return (
      <EmptyState
        variant="page"
        icon={icon || SearchX}
        title={title || "Not found"}
        description={description || "It may have been deleted, or the link is no longer valid."}
        action={{ label: backLabel || "Go back", icon: ArrowLeft, onClick: onBack }}
        secondaryAction={{ label: "Go to Dashboard", onClick: () => navigate("/dashboard") }}
      />
    );
  }

  // The router's 404 for an unknown link.
  return (
    <EmptyState
      variant="page"
      icon={icon || SearchX}
      title={title || "Page not found"}
      description={description || `There's no page at “${pathname}”. The link may be old or mistyped.`}
      action={{ label: "Go to Dashboard", icon: LayoutDashboard, onClick: () => navigate("/dashboard") }}
      secondaryAction={canGoBack ? { label: "Go back", icon: ArrowLeft, onClick: () => navigate(-1) } : undefined}
    />
  );
}
