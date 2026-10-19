import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuthStore } from "../../features/auth/store/authStore";
import { isTokenValid, getTokenExpiry, expireSession } from "../../features/auth/session";

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const token = useAuthStore((s) => s.accessToken);
  const location = useLocation();

  // Log out exactly when the token expires, instead of waiting for the next
  // API call to fail. (setTimeout caps at ~24.8 days; a longer token is
  // re-checked on the next page load / route change anyway.)
  useEffect(() => {
    const expiresAt = getTokenExpiry(token);
    if (!expiresAt) return;
    const ms = expiresAt - Date.now();
    if (ms <= 0) return;
    const id = setTimeout(expireSession, Math.min(ms, 2 ** 31 - 1));
    return () => clearTimeout(id);
  }, [token]);

  // Every admin page renders inside Layout, so this is the route guard: no
  // token (or an expired one) → login screen, remembering where to come back to.
  if (!isTokenValid(token)) {
    const params = new URLSearchParams();
    if (token) params.set("session", "expired");
    params.set("from", location.pathname + location.search);
    return <Navigate to={`/?${params.toString()}`} replace />;
  }

  return (
    // App-wide soft green gradient with big blurred "glow" blobs (the bento
    // look) — sits behind the glass sidebar, header and every page.
    // app-shell-bg / app-glow-* let Settings → Appearance (Theme Color,
    // Plain Background) recolour this background — theme block in index.css.
    <div className="app-shell-bg relative flex h-dvh overflow-hidden bg-gradient-to-br from-[#E9F8EF] via-[#F5FBF7] to-[#E3F5F1] text-neutral-900 dark:from-neutral-950 dark:via-neutral-950 dark:to-[#06231b] dark:text-neutral-50">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="app-glow-1 absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-300/40 blur-3xl dark:bg-emerald-500/10" />
        <div className="app-glow-2 absolute right-[-6rem] top-24 h-[28rem] w-[28rem] rounded-full bg-teal-200/50 blur-3xl dark:bg-teal-500/10" />
        <div className="app-glow-3 absolute bottom-[-8rem] left-1/3 h-96 w-[32rem] rounded-full bg-lime-200/40 blur-3xl dark:bg-emerald-400/5" />
      </div>

      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        {/* Sidebar and Header stay put — this is the only region that scrolls. */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
