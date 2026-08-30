import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

const FONT_LINK_ID = "trydood-fonts";
function useFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap";
    document.head.appendChild(link);
  }, []);
}

export default function Layout({ children }) {
  useFonts();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div
      className="flex h-screen overflow-hidden bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50"
      style={{ fontFamily: "'Inter', ui-sans-serif, sans-serif" }}
    >
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        {/* Sidebar and Header stay put — this is the only region that scrolls. */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}