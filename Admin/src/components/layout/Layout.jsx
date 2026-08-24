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
  const [active, setActive] = useState("dashboard");

  return (
    <div
      className="flex min-h-screen bg-neutral-950 text-neutral-50"
      style={{ fontFamily: "'Inter', ui-sans-serif, sans-serif" }}
    >
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        active={active}
        setActive={setActive}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <Header mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        {children}
      </div>
    </div>
  );
}