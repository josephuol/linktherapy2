"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "@/hooks/use-sidebar";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { LockIcon } from "@/components/icons/index";
import {
  CalenderIcon,
  GridIcon,
  HorizontaLDots,
  PageIcon,
  PieChartIcon,
  TableIcon,
  UserCircleIcon,
  DollarLineIcon,
} from "@/components/icons/index";
import SidebarWidget from "@/components/dashboard/SidebarWidget";
import logo from "@/app/images/logo-og.png";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  { icon: <GridIcon />, name: "Dashboard", path: "/admin" },
  { icon: <CalenderIcon />, name: "Calendar", path: "/admin/calendar" },
  { icon: <UserCircleIcon />, name: "Patients", path: "/admin/patients" },
  { icon: <TableIcon />, name: "Therapists", path: "/admin/therapists" },
  { icon: <DollarLineIcon />, name: "Payments", path: "/admin/payments" },
  { icon: <PageIcon />, name: "Create Therapists", path: "/admin/create-therapists" },
  { icon: <PageIcon />, name: "Requests", path: "/admin/requests" },
  { icon: <PieChartIcon />, name: "Content", path: "/admin/content" },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = supabaseBrowser();

  const renderMenuItems = (navItems: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav) => (
        <li key={nav.name}>
          {nav.path && (
            <Link
              href={nav.path}
              className={`menu-item group ${
                isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
              }`}
            >
              <span
                className={`$${
                  isActive(nav.path)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={`menu-item-text`}>{nav.name}</span>
              )}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  const onSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }, [router, supabase]);

  return (
    <aside
      className={`fixed mt-0 flex flex-col top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="py-8 flex justify-center">
        <Link href="/admin">
          {isExpanded || isHovered || isMobileOpen ? (
            <Image src={logo} alt="Logo" width={150} height={40} style={{ height: "auto" }} />
          ) : (
            <Image src={logo} alt="Logo" width={32} height={32} style={{ height: "auto" }} />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(navItems)}
            </div>
          </div>
        </nav>
        {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null}
        <div className="mt-auto py-6">
          <button
            onClick={onSignOut}
            className={`flex items-center gap-3 w-full px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/10 rounded-md transition ${
              isExpanded || isHovered || isMobileOpen ? "justify-start" : "lg:justify-center"
            }`}
          >
            <LockIcon className="w-4 h-4 fill-current" />
            {(isExpanded || isHovered || isMobileOpen) && (
              <span className="text-sm font-medium">Sign out</span>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;


