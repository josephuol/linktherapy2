"use client";

import React, { useCallback } from "react";
import { useSidebar } from "@/hooks/use-sidebar";
import { GridIcon } from "@/components/icons/index";

const MobileSidebarControls: React.FC = () => {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();

  const onToggle = useCallback(() => {
    toggleMobileSidebar();
  }, [toggleMobileSidebar]);

  return (
    <>
      {/* Top bar with menu button (mobile only) */}
      <div className="lg:hidden sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            aria-label="Toggle menu"
            onClick={onToggle}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-800 px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            <GridIcon />
            <span className="text-sm font-medium">Menu</span>
          </button>
        </div>
      </div>

      {/* Backdrop when sidebar is open on mobile */}
      {isMobileOpen && (
        <div
          onClick={onToggle}
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        />
      )}
    </>
  );
};

export default MobileSidebarControls;


