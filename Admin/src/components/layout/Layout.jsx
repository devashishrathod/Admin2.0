import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAF7] text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
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
